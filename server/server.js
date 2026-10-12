/* Sonaroids leaderboard server: plain Node (22.13+), no npm packages — node:http, node:sqlite, node:zlib, node:crypto.
   Every submitted game is replayed with the game's own core (src/13_core.js); only a score the replay reproduces is stored.

   API (JSON, CORS for the game's site):
     POST /v1/game   {pid, core, seed, FW, y0, enc, hands, score[, game:'race', steer]}  → {ok, score, ranks:{day,week,all}, here:{day,week,all}, listed, named}
                     v1.01: game 'race' — SonaRace, replayed with src/14_race.js by its own rules (Race.OPT0) and the steering sent (height | road);
                     its own tables. No game — SonaFly, as before
                     ranks — the place of the player's best game; here — the place of this very game (v0.32)
     POST /v1/nick   {pid, nick}                                    → {ok, nick}
     POST /v1/link   {pid}                                          → {ok, code, ttl}   a transfer code, 10 minutes (v0.32)
     POST /v1/claim  {pid, code}                                    → {ok, pid, nick}   take over the code's player, joining this one into it
     GET  /v1/top?period=day|week|all&limit=N[&game=race][&bots=0]   (header X-Player: pid, optional) → {period, game, people, entries:[{rank,nick,score,level,t,me}], me}
                     v1.31: bots=0 — people only (without the server's bots, server/bots.js)
     POST /v1/game   {pid, core, game:'pong', seed, ar, sens, span, marks, enc, hands, score[, dev]}   v1.62a: SonaLob — replayed with
                     src/15_pong.js (Pong.replay) from the palm on every rules step (the game's own 4 digits, as the game's log keeps them), the
                     field's shape ar, the starting sensitivity, the swing span and the marks (a pause's first step, a sensitivity change); its own
                     tables, «level» there — the clean passes
     GET  /v1/health                                                → {ok, core, race, pong}
     /v1/pair/*  v1.56c, СонарЛинк: a room for two phones that relays their messages (server/pair.js; nothing stored)
   pid — a random secret the game keeps on the device; the database stores only its hash.
   Periods are UTC: "day" since midnight, "week" since Monday midnight.

   Settings (environment): PORT (8787), DB (./sonaroids.db), ORIGINS (comma-separated; default the game's site). */
'use strict';
const http=require('node:http'), zlib=require('node:zlib'), crypto=require('node:crypto'), path=require('node:path');
let DatabaseSync; try{ ({DatabaseSync}=require('node:sqlite')); }catch(e){ console.error('Node 22.13 or newer is needed (node:sqlite). This is '+process.version); process.exit(1); }
const Core=require(path.join(__dirname,'..','src','13_core.js'));
const Race=require(path.join(__dirname,'..','src','14_race.js'));
const Pong=require(path.join(__dirname,'..','src','15_pong.js'));   // v1.62a: SonaLob's rules, the file the page runs
const Pair=require('./pair.js');   // v1.56c: СонарЛинк   // v1.01: SonaRace's core, the same file the page runs

const PORT=+(process.env.PORT||8787);
const DB_PATH=process.env.DB||path.join(__dirname,'sonaroids.db');
const ORIGINS=(process.env.ORIGINS||'https://sonaroids.app,https://www.sonaroids.app').split(',').map(s=>s.trim()).filter(Boolean);
const LISTED=100;                     // "in the table": among the best 100 players of a period
const MAX_BODY=256*1024, MAX_STEPS=60*60*45;   // a game of at most 45 minutes
const Q=4000, NONE=65535;             // palm heights travel as integers 0…4000 (the game steps with exactly q/4000), 65535 — no palm

/* ── database ── */
const db=new DatabaseSync(DB_PATH);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS games(id INTEGER PRIMARY KEY, player TEXT NOT NULL, seed INTEGER NOT NULL, core TEXT NOT NULL,
  score INTEGER NOT NULL, level INTEGER NOT NULL, t REAL NOT NULL, created INTEGER NOT NULL, fw REAL, y0 REAL, replay BLOB,
  UNIQUE(player,seed));
CREATE INDEX IF NOT EXISTS games_created ON games(created);
CREATE INDEX IF NOT EXISTS games_score ON games(score);
CREATE TABLE IF NOT EXISTS players(player TEXT PRIMARY KEY, nick TEXT, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS setups(id INTEGER PRIMARY KEY, player TEXT NOT NULL, created INTEGER NOT NULL, result TEXT NOT NULL, t REAL, flips INTEGER, dev TEXT);
CREATE INDEX IF NOT EXISTS setups_created ON setups(created);
CREATE TABLE IF NOT EXISTS bots(player TEXT PRIMARY KEY, born INTEGER NOT NULL, until INTEGER NOT NULL, prof TEXT NOT NULL);`);
/* v1.31: the bots (server/bots.js) — players the server plays itself, real games by the same rules; the tables show them by default,
   «people only» (/v1/top?…&bots=0) leaves them out; stats.js never counts them */
/* v0.29: what kind of phone played and how well it heard the probe (dev, JSON), and the share of steps the palm was seen (seen, 0…1).
   Added to an existing database in place; older games keep NULL there. */
{ const cols=db.prepare('PRAGMA table_info(games)').all().map(c=>c.name);
  if(!cols.includes('dev')) db.exec('ALTER TABLE games ADD COLUMN dev TEXT'); if(!cols.includes('seen')) db.exec('ALTER TABLE games ADD COLUMN seen REAL');
  /* v1.01: which game — 'fly' (SonaFly; the games from before are that) or 'race' (SonaRace), and the race's steering (height | road) */
  if(!cols.includes('game')){ db.exec("ALTER TABLE games ADD COLUMN game TEXT NOT NULL DEFAULT 'fly'"); } if(!cols.includes('steer')) db.exec('ALTER TABLE games ADD COLUMN steer TEXT');
  db.exec('CREATE INDEX IF NOT EXISTS games_game ON games(game,created)');
  /* v1.62a: what else a game needs to replay — SonaLob's {ar, sens, span, marks} (JSON); NULL for the others */
  if(!cols.includes('extra')) db.exec('ALTER TABLE games ADD COLUMN extra TEXT'); }
const GAMES=['fly','race','pong'];
const q={
  insGame: db.prepare('INSERT INTO games(player,seed,core,score,level,t,created,fw,y0,replay,dev,seen,game,steer,extra) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'),
  insSetup: db.prepare('INSERT INTO setups(player,created,result,t,flips,dev) VALUES(?,?,?,?,?,?)'),
  insPlayer: db.prepare('INSERT OR IGNORE INTO players(player,nick,created) VALUES(?,NULL,?)'),
  getPlayer: db.prepare('SELECT nick FROM players WHERE player=?'),
  setNick: db.prepare('UPDATE players SET nick=? WHERE player=?'),
  // best game per named player since a moment; ties: the earlier game first
  top: db.prepare(`SELECT p.player AS player, p.nick AS nick, g.score AS score, g.level AS level, g.t AS t, g.created AS created
    FROM games g JOIN players p ON p.player=g.player
    WHERE g.game=? AND g.created>=? AND p.nick IS NOT NULL AND g.id=(SELECT g2.id FROM games g2 WHERE g2.player=g.player AND g2.game=g.game AND g2.created>=? ORDER BY g2.score DESC, g2.created ASC LIMIT 1)
    ORDER BY g.score DESC, g.created ASC LIMIT ?`),
  best: db.prepare('SELECT MAX(score) AS s FROM games WHERE game=? AND player=? AND created>=?'),
  // v0.32: joining two players into one (the transfer code): games, getting-ready reports, the name
  mvGames: db.prepare('UPDATE OR IGNORE games SET player=? WHERE player=?'), delGames: db.prepare('DELETE FROM games WHERE player=?'),
  mvSetups: db.prepare('UPDATE setups SET player=? WHERE player=?'), delPlayer: db.prepare('DELETE FROM players WHERE player=?'),
  // how many named players did better than a score since a moment
  above: db.prepare(`SELECT COUNT(*) AS n FROM (SELECT g.player, MAX(g.score) AS s FROM games g JOIN players p ON p.player=g.player
    WHERE g.game=? AND g.created>=? AND p.nick IS NOT NULL AND g.player<>? GROUP BY g.player) WHERE s>?`),
};
/* v1.31: the same two without the bots — «people only» */
q.topH=db.prepare(`SELECT p.player AS player, p.nick AS nick, g.score AS score, g.level AS level, g.t AS t, g.created AS created
    FROM games g JOIN players p ON p.player=g.player
    WHERE g.game=? AND g.created>=? AND p.nick IS NOT NULL AND p.player NOT IN (SELECT player FROM bots) AND g.id=(SELECT g2.id FROM games g2 WHERE g2.player=g.player AND g2.game=g.game AND g2.created>=? ORDER BY g2.score DESC, g2.created ASC LIMIT 1)
    ORDER BY g.score DESC, g.created ASC LIMIT ?`);
q.aboveH=db.prepare(`SELECT COUNT(*) AS n FROM (SELECT g.player, MAX(g.score) AS s FROM games g JOIN players p ON p.player=g.player
    WHERE g.game=? AND g.created>=? AND p.nick IS NOT NULL AND p.player NOT IN (SELECT player FROM bots) AND g.player<>? GROUP BY g.player) WHERE s>?`);

/* ── helpers ── */
const hash=pid=>crypto.createHash('sha256').update('sonaroids:'+pid).digest('hex').slice(0,32);
function since(period,now){ const d=new Date(now);
  if(period==='all') return 0;
  const day=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());
  if(period==='day') return day;
  const dow=(d.getUTCDay()+6)%7; return day-dow*86400000; }                 // week: since Monday
const PERIODS=['day','week','all'];
function rankOf(game,player,score,period,now,people){ const n=(people?q.aboveH:q.above).get(game,since(period,now),player,score).n; return n+1; }

/* nicknames: 1–16 Latin letters, digits and _ only (the maintainer's call, 25 Sep: nothing odd gets in); a short word filter.
   Queries are prepared statements anyway, and names are drawn by the game's own pixel font, never as HTML */
const NICK_RE=/^[A-Za-z0-9_]{1,16}$/;
const BAD=['хуй','хуе','хуё','пизд','ебат','ебан','ебал','бляд','блят','сука','муда','пидор','пидар','залуп','fuck','shit','cunt','bitch','nigg','fag','dick','cock','pussy','whore','slut','nazi','hitler'];
const LOOK={a:'а',e:'е',o:'о',p:'р',c:'с',x:'х',y:'у',k:'к',m:'м',t:'т',b:'в',h:'н','0':'о','3':'з','6':'б'};
function cleanNick(s){ if(typeof s!=='string') return null; s=s.trim(); if(!NICK_RE.test(s)) return null;
  const low=s.toLowerCase().replace(/ё/g,'е'), cyr=low.replace(/[aeopcxykmtbh036]/g,ch=>LOOK[ch]||ch), flat=low.replace(/[^a-zа-я]/g,'');
  if(BAD.some(w=>low.includes(w)||cyr.includes(w)||flat.includes(w))) return null; return s; }

/* rate limits per address, in memory: a few buckets are enough for one small server */
const buckets=new Map();
function allow(key,perMin){ const now=Date.now(); let b=buckets.get(key); if(!b){ b={t:now,n:perMin}; buckets.set(key,b); }
  b.n=Math.min(perMin,b.n+(now-b.t)/60000*perMin); b.t=now; if(b.n<1) return false; b.n-=1; return true; }
setInterval(()=>{ const old=Date.now()-600000; for(const [k,b] of buckets) if(b.t<old) buckets.delete(k); for(const [c,l] of links) if(l.exp<Date.now()) links.delete(c); },300000).unref();

/* palm heights: Uint16 little-endian, raw deflate (enc 'deflate') or not (enc 'raw'), base64 */
function decodeHands(enc,b64){ let buf=Buffer.from(String(b64||''),'base64');
  if(enc==='deflate') buf=zlib.inflateRawSync(buf,{maxOutputLength:MAX_STEPS*2}); else if(enc!=='raw') throw new Error('enc');
  if(buf.length%2) throw new Error('odd'); const n=buf.length/2; if(n<1||n>MAX_STEPS) throw new Error('length');
  const hands=new Array(n); for(let i=0;i<n;i++){ const v=buf.readUInt16LE(i*2); if(v===NONE) hands[i]=-1; else if(v<=Q) hands[i]=v/Q; else throw new Error('value'); }
  return {hands,raw:buf}; }
/* v1.62a, SonaLob's palm: the share of the calibrated travel the rules take, which the game rounds to 4 digits (k/10000) and which can be
   below 0 or above 1. It travels as k + PK0 in a Uint16 (65535 — no palm); k is kept within −2000…22000 by the page — past that the
   racket is at its stop at every sensitivity (Pong.padOf clamps), so the game is the same. Decoded as k/10000 — the very number the game stepped with */
const PK0=2000, PK1=22000;
function decodePong(enc,b64){ let buf=Buffer.from(String(b64||''),'base64');
  if(enc==='deflate') buf=zlib.inflateRawSync(buf,{maxOutputLength:MAX_STEPS*2}); else if(enc!=='raw') throw new Error('enc');
  if(buf.length%2) throw new Error('odd'); const n=buf.length/2; if(n<1||n>MAX_STEPS) throw new Error('length');
  const hands=new Array(n); for(let i=0;i<n;i++){ const v=buf.readUInt16LE(i*2); if(v===NONE) hands[i]=null; else if(v<=PK0+PK1) hands[i]=(v-PK0)/10000; else throw new Error('value'); }
  return {hands,raw:buf}; }
/* SonaLob's marks: [step, 'resume'] — the first step after a pause; [step, 'sens', 0…3] — the sensitivity changed. Steps ascending, at most 2000 */
function cleanMarks(m,n){ if(m===undefined||m===null) return []; if(!Array.isArray(m)||m.length>2000) return null; let last=0; const o=[];
  for(const x of m){ if(!Array.isArray(x)||!Number.isInteger(x[0])||x[0]<last||x[0]>n) return null; last=x[0];
    if(x[1]==='resume'&&x.length===2) o.push([x[0],'resume']); else if(x[1]==='sens'&&x.length===3&&Number.isInteger(x[2])&&x[2]>=0&&x[2]<=3) o.push([x[0],'sens',x[2]]); else return null; }
  return o; }

/* the phone, as the page describes it (v0.29): only these keys, only these shapes — anything else is dropped. No user agent string, no IP.
   os, br — coarse kinds; model — Android's own model name when Chrome gives it (e.g. SM-S938B), never on iPhone; pwa — started from the home screen;
   fs, snr, lvl, gain — sample rate, probe signal-to-noise and level (dB), probe gain; eq, eq_db — band equalizer; relocks, drops — input trouble;
   side — the hand's end of the phone; ec, ns, agc — echo cancelling, noise suppression, auto gain as the browser really set them. */
const DEV_STR={os:/^(ios|android|other)$/,br:/^(safari|chrome|firefox|samsung|yandex|other)$/,model:/^[A-Za-z0-9 _.()+-]{1,32}$/,side:/^(port|camera)$/,lang:/^(en|ru)$/,
  audio:/^(app|browser)$/,src:/^(voice|unprocessed|mic|camcorder)$/,band:/^(normal|wide)$/};   // v0.55: the Android app — whose sound, which recording source, which probe
const DEV_NUM={fs:[8000,192000],snr:[-50,150],lvl:[-150,50],gain:[0,1],eq_db:[-10,100],relocks:[0,1e6],drops:[0,1e6],vol:[0,1]}, DEV_BOOL=['pwa','eq','ec','ns','agc','app'];
function cleanDev(d){ if(!d||typeof d!=='object'||Array.isArray(d)) return null; const o={};
  for(const k in DEV_STR) if(typeof d[k]==='string'&&DEV_STR[k].test(d[k])) o[k]=d[k];
  for(const k in DEV_NUM){ const v=d[k]; if(typeof v==='number'&&isFinite(v)&&v>=DEV_NUM[k][0]&&v<=DEV_NUM[k][1]) o[k]=Math.round(v*1000)/1000; }
  for(const k of DEV_BOOL) if(typeof d[k]==='boolean') o[k]=d[k];
  return Object.keys(o).length?JSON.stringify(o):null; }

/* ── requests ── */
function send(res,code,obj,origin){ const body=JSON.stringify(obj);
  const h={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Content-Length':Buffer.byteLength(body)};
  if(origin){ h['Access-Control-Allow-Origin']=origin; h['Vary']='Origin'; }
  res.writeHead(code,h); res.end(body); }
function readBody(req){ return new Promise((ok,fail)=>{ let n=0; const parts=[];
  req.on('data',c=>{ n+=c.length; if(n>MAX_BODY){ fail(new Error('big')); req.destroy(); } else parts.push(c); });
  req.on('end',()=>{ try{ ok(JSON.parse(Buffer.concat(parts).toString('utf8')||'{}')); }catch(e){ fail(new Error('json')); } }); req.on('error',fail); }); }
/* the address for rate limits: behind Caddy the last X-Forwarded-For entry is the one Caddy saw (earlier ones could be made up) */
const ip=req=>{ const f=String(req.headers['x-forwarded-for']||'').split(',').map(s=>s.trim()).filter(Boolean); return f.length?f[f.length-1]:String(req.socket.remoteAddress||''); };

function postGame(b,now){
  if(typeof b.pid!=='string'||!/^[0-9a-f]{32}$/.test(b.pid)) return [400,{ok:false,error:'pid'}];
  const game=b.game===undefined||b.game===null?'fly':b.game; if(!GAMES.includes(game)) return [400,{ok:false,error:'game'}];
  const race=game==='race', duo=game==='pong'&&b.duo===1, TAG=race?Race.TAG:game==='pong'?(duo?Pong.TAG2:Pong.TAG):Core.TAG, FH=race?Race.FH:Core.FH;
  if(b.core!==TAG) return [409,{ok:false,error:'core',core:TAG}];            // an old game version: the rules differ
  if(duo) return postPongDuo(b,now);
  if(game==='pong') return postPong(b,now);
  const seed=b.seed>>>0, FW=+b.FW, y0=(b.y0===null||b.y0===undefined)?null:+b.y0;
  if(seed!==b.seed||!(FW>=100&&FW<=700)||(y0!==null&&!(y0>=0&&y0<=FH))) return [400,{ok:false,error:'args'}];
  /* v1.01, SonaRace: only the game's own rules (the test switches' games are not for the tables) and one of the two ways to steer */
  const steer=race?b.steer:null; if(race&&steer!=='height'&&steer!=='road') return [400,{ok:false,error:'steer'}];
  if(race&&b.opt!==undefined&&b.opt!==null) return [400,{ok:false,error:'opt'}];
  let d; try{ d=decodeHands(b.enc,b.hands); }catch(e){ return [400,{ok:false,error:'hands'}]; }
  const g=race?Race.replay(seed,FW,d.hands,y0,steer,null):Core.replay(seed,FW,d.hands,y0);
  if(g.score!==b.score) return [422,{ok:false,error:'mismatch',score:g.score}];
  const level=race?Math.floor(g.d/10):g.level;   // a race has no levels: its metres there
  const player=hash(b.pid); q.insPlayer.run(player,now);
  let seen=0; for(const h of d.hands) if(h>=0) seen++; seen=+(seen/d.hands.length).toFixed(4);
  try{ q.insGame.run(player,seed,TAG,g.score,level,+g.t.toFixed(2),now,FW,y0,zlib.deflateRawSync(d.raw),cleanDev(b.dev),seen,game,steer,null); }
  catch(e){ if(/UNIQUE/.test(String(e.message))) return [409,{ok:false,error:'dup'}]; throw e; }
  const ranks={}; let listed=false;
  for(const p of PERIODS){ const best=q.best.get(game,player,since(p,now)).s; ranks[p]=rankOf(game,player,best,p,now); if(ranks[p]<=LISTED&&best===g.score) listed=true; }
  // v0.32: where this very game stands — the players above it, counting the player's own better game (the table shows one game per player)
  const here={}; for(const p of PERIODS){ const t0=since(p,now), own=q.best.get(game,player,t0).s; here[p]=q.above.get(game,t0,player,g.score).n+(own>g.score?1:0)+1; }
  const named=!!q.getPlayer.get(player).nick;
  return [200,{ok:true,score:g.score,level,ranks,here,listed,named}];
}
/* v1.62a: a SonaLob game — the same steps as the others': replayed, stored only if the score is the same, then its places */
function postPong(b,now){
  const seed=b.seed>>>0, ar=+b.ar, sens=b.sens, span=+b.span;
  if(seed!==b.seed||!(ar>=1.2&&ar<=3.5)||!Number.isInteger(sens)||sens<0||sens>3||!(span>=30&&span<=200)) return [400,{ok:false,error:'args'}];
  let d; try{ d=decodePong(b.enc,b.hands); }catch(e){ return [400,{ok:false,error:'hands'}]; }
  const marks=cleanMarks(b.marks,d.hands.length); if(!marks) return [400,{ok:false,error:'marks'}];
  const g=Pong.replay(seed,ar,sens,d.hands,span,marks);
  if(g.score!==b.score) return [422,{ok:false,error:'mismatch',score:g.score}];
  const game='pong', level=g.passes, player=hash(b.pid); q.insPlayer.run(player,now);
  let seen=0; for(const h of d.hands) if(h!==null) seen++; seen=+(seen/d.hands.length).toFixed(4);
  try{ q.insGame.run(player,seed,Pong.TAG,g.score,level,+g.t.toFixed(2),now,ar,null,zlib.deflateRawSync(d.raw),cleanDev(b.dev),seen,game,null,JSON.stringify({ar,sens,span,marks})); }
  catch(e){ if(/UNIQUE/.test(String(e.message))) return [409,{ok:false,error:'dup'}]; throw e; }
  return [200,pongPlaces(player,g.score,level,now)];
}
/* v1.64h — SonaLob «Вдвоём»: a pair's game. Each phone sends it (with its own key): both palms, both players' sensitivity and range, the
   marks (a pause's resume, a racket's sensitivity), which racket is this phone's, the partner's name. Replayed by Pong.replay2 — stored
   only if the score is the same — as game 'pong2' (not a table of its own: the pairs go into SonaLob's table, see pongBoard) */
function cleanMarks2(m,n){ if(m===undefined||m===null) return []; if(!Array.isArray(m)||m.length>2000) return null; let last=0; const o=[];
  for(const x of m){ if(!Array.isArray(x)||!Number.isInteger(x[0])||x[0]<last||x[0]>n) return null; last=x[0];
    if(x[1]==='resume'&&x.length===2) o.push([x[0],'resume']); else if(x[1]==='sens'&&x.length===4&&(x[2]===0||x[2]===1)&&Number.isInteger(x[3])&&x[3]>=0&&x[3]<=3) o.push([x[0],'sens',x[2],x[3]]); else return null; }
  return o; }
function postPongDuo(b,now){
  const seed=b.seed>>>0, ar=+b.ar, sens=b.sens, span=b.span, me=b.me;
  const okSens=Array.isArray(sens)&&sens.length===2&&sens.every(v=>Number.isInteger(v)&&v>=0&&v<=3), okSpan=Array.isArray(span)&&span.length===2&&span.every(v=>v===0||(v>=30&&v<=200));
  if(seed!==b.seed||!(ar>=1.2&&ar<=3.5)||!okSens||!okSpan||(me!==0&&me!==1)) return [400,{ok:false,error:'args'}];
  let d, d2; try{ d=decodePong(b.enc,b.hands); d2=decodePong(b.enc,b.hands2); }catch(e){ return [400,{ok:false,error:'hands'}]; }
  if(d.hands.length!==d2.hands.length) return [400,{ok:false,error:'hands'}];
  const marks=cleanMarks2(b.marks,d.hands.length); if(!marks) return [400,{ok:false,error:'marks'}];
  const g=Pong.replay2(seed,ar,sens,span.map(Number),d.hands,d2.hands,marks);
  if(g.score!==b.score) return [422,{ok:false,error:'mismatch',score:g.score}];
  const level=g.passes, player=hash(b.pid), mate=b.mate===undefined||b.mate===null||b.mate===''?null:cleanNick(b.mate); q.insPlayer.run(player,now);
  const own=me===0?d.hands:d2.hands; let seen=0; for(const h of own) if(h!==null) seen++; seen=+(seen/own.length).toFixed(4);
  try{ q.insGame.run(player,seed,Pong.TAG2,g.score,level,+g.t.toFixed(2),now,ar,null,zlib.deflateRawSync(Buffer.concat([d.raw,d2.raw])),cleanDev(b.dev),seen,'pong2',null,JSON.stringify({ar,sens,span,marks,me,mate})); }
  catch(e){ if(/UNIQUE/.test(String(e.message))) return [409,{ok:false,error:'dup'}]; throw e; }
  return [200,pongPlaces(player,g.score,level,now)];
}
/* v1.64h: SonaLob's table — each named player's best game alone, and each pair's best game together, in one list («DEN + ANN»). A pair is
   the two who sent the same game (its seed); if only one of them sent it, the other is the name he gave (or «?»). A pair is listed when at
   least one of the two has a name. Small enough to put together in memory */
q.pairRows=db.prepare(`SELECT g.player AS player, p.nick AS nick, g.seed AS seed, g.score AS score, g.level AS level, g.t AS t, g.created AS created, g.extra AS extra
    FROM games g JOIN players p ON p.player=g.player WHERE g.game='pong2' AND g.created>=?`);
function pongBoard(t0,people){ const out=[];
  for(const r of (people?q.topH:q.top).all('pong',t0,t0,100000)) out.push({key:r.player,players:[r.player],nick:r.nick,score:r.score,level:r.level,t:r.t,created:r.created,duo:false});
  const bySeed=new Map(); for(const r of q.pairRows.all(t0)){ let x={}; try{ x=JSON.parse(r.extra)||{}; }catch(e){} r.me=x.me; r.mate=x.mate||null; const k=r.seed+':'+r.score; if(!bySeed.has(k)) bySeed.set(k,[]); bySeed.get(k).push(r); }
  const best=new Map();
  for(const rows of bySeed.values()){ const side=[null,null], name=[null,null];
    for(const r of rows){ if(r.me===0||r.me===1){ side[r.me]=r.player; name[r.me]=r.nick||name[r.me]; if(!name[1-r.me]&&r.mate) name[1-r.me]=r.mate; } }
    if(!name[0]&&!name[1]) continue; const pl=side.filter(Boolean), key=side.map((p,i)=>p||('?'+(name[i]||''))).sort().join('|'), r0=rows[0];
    const e={key,players:pl,nick:(name[0]||'?')+' + '+(name[1]||'?'),score:r0.score,level:r0.level,t:r0.t,created:Math.min(...rows.map(r=>r.created)),duo:true};
    const o=best.get(key); if(!o||e.score>o.score||(e.score===o.score&&e.created<o.created)) best.set(key,e); }
  for(const e of best.values()) out.push(e);
  out.sort((a,b)=>b.score-a.score||a.created-b.created); return out; }
/* a player's place in SonaLob's table: his best line there — alone or in a pair */
function pongMine(list,player){ for(let i=0;i<list.length;i++) if(list[i].players.includes(player)) return {rank:i+1,e:list[i]}; return null; }
function pongPlaces(player,score,level,now){ const ranks={}, here={}; let listed=false;
  for(const p of PERIODS){ const list=pongBoard(since(p,now),false), m=pongMine(list,player);
    ranks[p]=m?m.rank:null; if(m&&m.rank<=LISTED&&m.e.score===score) listed=true;
    here[p]=list.filter(e=>e.score>score).length+1; }
  const named=!!q.getPlayer.get(player).nick; return {ok:true,score,level,ranks,here,listed,named}; }
/* v0.29: how getting ready went — from every player, also those who never get to play; for server/stats.js only */
const SETUP_RE=/^(caught|nocatch|quiet|loud|noprobe|error|nomic|noaudio|lost)$/;
function postSetup(b,now){
  if(typeof b.pid!=='string'||!/^[0-9a-f]{32}$/.test(b.pid)) return [400,{ok:false,error:'pid'}];
  if(typeof b.result!=='string'||!SETUP_RE.test(b.result)) return [400,{ok:false,error:'result'}];
  const t=typeof b.t==='number'&&isFinite(b.t)&&b.t>=0&&b.t<=3600?+b.t.toFixed(1):null, flips=Number.isInteger(b.flips)&&b.flips>=0&&b.flips<=1000?b.flips:null;
  q.insSetup.run(hash(b.pid),now,b.result,t,flips,cleanDev(b.dev)); return [200,{ok:true}];
}
/* v0.32: the transfer code. Safari, the home-screen app and another phone keep separate players (the key lives in the browser's storage).
   One device asks for a code (6 characters, 10 minutes, kept in memory only); the other enters it: it takes over the first device's key,
   and its own games, reports and name are joined into that player. */
const LINK_TTL=600000, LINK_ABC='ABCDEFGHJKMNPQRSTUVWXYZ23456789', links=new Map();
function postLink(b,now){
  if(typeof b.pid!=='string'||!/^[0-9a-f]{32}$/.test(b.pid)) return [400,{ok:false,error:'pid'}];
  for(const [c,l] of links) if(l.pid===b.pid||l.exp<now) links.delete(c);
  let code; do{ code=''; for(const x of crypto.randomBytes(6)) code+=LINK_ABC[x%LINK_ABC.length]; }while(links.has(code));
  links.set(code,{pid:b.pid,exp:now+LINK_TTL}); q.insPlayer.run(hash(b.pid),now); return [200,{ok:true,code,ttl:LINK_TTL/1000}];
}
function postClaim(b,now){
  if(typeof b.pid!=='string'||!/^[0-9a-f]{32}$/.test(b.pid)) return [400,{ok:false,error:'pid'}];
  const code=String(b.code||'').toUpperCase().replace(/[^A-Z0-9]/g,''), l=links.get(code);
  if(!l||l.exp<now) return [404,{ok:false,error:'code'}];
  links.delete(code); const pa=hash(l.pid), pb=hash(b.pid);
  if(pa!==pb){ db.exec('BEGIN'); try{ q.insPlayer.run(pa,now); q.mvGames.run(pa,pb); q.delGames.run(pb); q.mvSetups.run(pa,pb);
      const na=q.getPlayer.get(pa), nb=q.getPlayer.get(pb); if(!na.nick&&nb&&nb.nick) q.setNick.run(nb.nick,pa); q.delPlayer.run(pb); db.exec('COMMIT'); }
    catch(e){ db.exec('ROLLBACK'); throw e; } }
  const p=q.getPlayer.get(pa); return [200,{ok:true,pid:l.pid,nick:p?p.nick:null}];
}
function postNick(b){
  if(typeof b.pid!=='string'||!/^[0-9a-f]{32}$/.test(b.pid)) return [400,{ok:false,error:'pid'}];
  const nick=cleanNick(b.nick); if(!nick) return [400,{ok:false,error:'nick'}];
  const player=hash(b.pid); q.insPlayer.run(player,Date.now()); q.setNick.run(nick,player); return [200,{ok:true,nick}];
}
function getTop(url,req,now){
  const period=PERIODS.includes(url.searchParams.get('period'))?url.searchParams.get('period'):'all';
  const game=GAMES.includes(url.searchParams.get('game'))?url.searchParams.get('game'):'fly';
  const limit=Math.max(1,Math.min(LISTED,+url.searchParams.get('limit')||20)), t0=since(period,now);
  const pid=String(req.headers['x-player']||''), me=/^[0-9a-f]{32}$/.test(pid)?hash(pid):null, people=url.searchParams.get('bots')==='0';
  if(game==='pong'){ const list=pongBoard(t0,people), m=me?pongMine(list,me):null;   /* v1.64h: alone and in pairs, one list */
    const entries=list.slice(0,limit).map((e,i)=>({rank:i+1,nick:e.nick,score:e.score,level:e.level,t:e.t,me:!!me&&e.players.includes(me),duo:e.duo}));
    let mine=null; if(m){ const p=q.getPlayer.get(me); mine={rank:m.rank,score:m.e.score,nick:m.e.duo?m.e.nick:(p?p.nick:null),duo:m.e.duo}; }
    else if(me){ const best=q.best.get('pong',me,t0).s; if(best!==null&&best!==undefined) mine={rank:list.filter(e=>e.score>best).length+1,score:best,nick:null}; }
    return [200,{period,game,people,entries,me:mine}]; }
  const rows=(people?q.topH:q.top).all(game,t0,t0,limit);
  const entries=rows.map((r,i)=>({rank:i+1,nick:r.nick,score:r.score,level:r.level,t:r.t,me:r.player===me}));
  let mine=null; if(me){ const best=q.best.get(game,me,t0).s; if(best!==null&&best!==undefined){ const p=q.getPlayer.get(me); mine={rank:rankOf(game,me,best,period,now,people),score:best,nick:p?p.nick:null}; } }
  return [200,{period,game,people,entries,me:mine}];
}

const server=http.createServer(async(req,res)=>{
  const origin=ORIGINS.includes(req.headers.origin)?req.headers.origin:null;
  if(req.method==='OPTIONS'){ res.writeHead(204,origin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST','Access-Control-Allow-Headers':'Content-Type, X-Player','Access-Control-Max-Age':'86400','Vary':'Origin'}:{}); return res.end(); }
  const url=new URL(req.url,'http://x'), now=Date.now(), who=ip(req);
  try{
    if(req.method==='GET'&&url.pathname==='/v1/health') return send(res,200,{ok:true,core:Core.TAG,race:Race.TAG,pong:Pong.TAG,pong2:Pong.TAG2},origin);
    /* v1.56c, СонарЛинк: rooms for two phones (server/pair.js). Opening and joining are limited like the transfer code; messages per room */
    if(url.pathname.startsWith('/v1/pair/')){ const pth=url.pathname.slice(9);
      if(req.method==='GET'&&pth==='sse'){ if(!allow('p:'+who,60)) return send(res,429,{ok:false,error:'slow down'},origin); if(!Pair.getSse(url,req,res,origin,now)) send(res,404,{ok:false,error:'code'},origin); return; }
      if(req.method==='POST'&&(pth==='new'||pth==='join'||pth==='send'||pth==='near')){
        if(pth!=='send'&&!allow((pth==='join'?'j:':'n:')+who,pth==='join'?20:10)) return send(res,429,{ok:false,error:'slow down'},origin);
        const b=await readBody(req), [c,o]=pth==='new'?Pair.postNew(b,now):pth==='join'?Pair.postJoin(b,now):pth==='near'?Pair.postNear(b,now,who):Pair.postSend(b,now); return send(res,c,o,origin); } }
    if(req.method==='GET'&&url.pathname==='/v1/top'){ if(!allow('r:'+who,120)) return send(res,429,{ok:false,error:'slow down'},origin); const [c,o]=getTop(url,req,now); return send(res,c,o,origin); }
    if(req.method==='POST'&&(url.pathname==='/v1/game'||url.pathname==='/v1/nick'||url.pathname==='/v1/setup'||url.pathname==='/v1/link'||url.pathname==='/v1/claim')){
      const lim=url.pathname==='/v1/setup'?['s:',30]:url.pathname==='/v1/claim'?['c:',10]:['w:',20];   // a code is guessed at most 10 times a minute
      if(!allow(lim[0]+who,lim[1])) return send(res,429,{ok:false,error:'slow down'},origin);
      const b=await readBody(req), pth=url.pathname;
      const [c,o]=pth==='/v1/game'?postGame(b,now):pth==='/v1/setup'?postSetup(b,now):pth==='/v1/link'?postLink(b,now):pth==='/v1/claim'?postClaim(b,now):postNick(b); return send(res,c,o,origin); }
    send(res,404,{ok:false,error:'not found'},origin);
  }catch(e){ send(res,e.message==='big'||e.message==='json'?400:500,{ok:false,error:e.message==='big'||e.message==='json'?e.message:'server'},origin); if(!/big|json/.test(e.message)) console.error(new Date().toISOString(),e); }
});
if(require.main===module) server.listen(PORT,'127.0.0.1',()=>console.log(`sonaroids leaderboard on 127.0.0.1:${PORT}, rules ${Core.TAG} and ${Race.TAG}, db ${DB_PATH}`));
module.exports={server,cleanNick,cleanDev,since,decodeHands,db,hash,q,GAMES};
