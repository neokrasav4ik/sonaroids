/* Sonaroids leaderboard server: plain Node (22.13+), no npm packages — node:http, node:sqlite, node:zlib, node:crypto.
   Every submitted game is replayed with the game's own core (src/13_core.js); only a score the replay reproduces is stored.

   API (JSON, CORS for the game's site):
     POST /v1/game   {pid, core, seed, FW, y0, enc, hands, score}  → {ok, id, score, ranks:{day,week,all}, listed, named}
     POST /v1/nick   {pid, nick}                                    → {ok, nick}
     GET  /v1/top?period=day|week|all&limit=N   (header X-Player: pid, optional) → {period, entries:[{rank,nick,score,level,t,me}], me}
     GET  /v1/health                                                → {ok, core}
   pid — a random secret the game keeps on the device; the database stores only its hash.
   Periods are UTC: "day" since midnight, "week" since Monday midnight.

   Settings (environment): PORT (8787), DB (./sonaroids.db), ORIGINS (comma-separated; default the game's site). */
'use strict';
const http=require('node:http'), zlib=require('node:zlib'), crypto=require('node:crypto'), path=require('node:path');
let DatabaseSync; try{ ({DatabaseSync}=require('node:sqlite')); }catch(e){ console.error('Node 22.13 or newer is needed (node:sqlite). This is '+process.version); process.exit(1); }
const Core=require(path.join(__dirname,'..','src','13_core.js'));

const PORT=+(process.env.PORT||8787);
const DB_PATH=process.env.DB||path.join(__dirname,'sonaroids.db');
const ORIGINS=(process.env.ORIGINS||'https://sonaroids.app,https://www.sonaroids.app').split(',').map(s=>s.trim()).filter(Boolean);
const LISTED=100;                     // "in the table": among the best 100 players of a period
const MAX_BODY=256*1024, MAX_STEPS=60*60*45;   // a game of at most 45 minutes
const Q=4000, NONE=65535;             // palm heights travel as integers 0…4000 (the game steps with exactly q/4000), 65535 — no palm

/* ── database ── */
const db=new DatabaseSync(DB_PATH);
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS games(id INTEGER PRIMARY KEY, player TEXT NOT NULL, seed INTEGER NOT NULL, core TEXT NOT NULL,
  score INTEGER NOT NULL, level INTEGER NOT NULL, t REAL NOT NULL, created INTEGER NOT NULL, fw REAL, y0 REAL, replay BLOB,
  UNIQUE(player,seed));
CREATE INDEX IF NOT EXISTS games_created ON games(created);
CREATE INDEX IF NOT EXISTS games_score ON games(score);
CREATE TABLE IF NOT EXISTS players(player TEXT PRIMARY KEY, nick TEXT, created INTEGER NOT NULL);`);
const q={
  insGame: db.prepare('INSERT INTO games(player,seed,core,score,level,t,created,fw,y0,replay) VALUES(?,?,?,?,?,?,?,?,?,?)'),
  insPlayer: db.prepare('INSERT OR IGNORE INTO players(player,nick,created) VALUES(?,NULL,?)'),
  getPlayer: db.prepare('SELECT nick FROM players WHERE player=?'),
  setNick: db.prepare('UPDATE players SET nick=? WHERE player=?'),
  // best game per named player since a moment; ties: the earlier game first
  top: db.prepare(`SELECT p.player AS player, p.nick AS nick, g.score AS score, g.level AS level, g.t AS t, g.created AS created
    FROM games g JOIN players p ON p.player=g.player
    WHERE g.created>=? AND p.nick IS NOT NULL AND g.id=(SELECT g2.id FROM games g2 WHERE g2.player=g.player AND g2.created>=? ORDER BY g2.score DESC, g2.created ASC LIMIT 1)
    ORDER BY g.score DESC, g.created ASC LIMIT ?`),
  best: db.prepare('SELECT MAX(score) AS s FROM games WHERE player=? AND created>=?'),
  // how many named players did better than a score since a moment
  above: db.prepare(`SELECT COUNT(*) AS n FROM (SELECT g.player, MAX(g.score) AS s FROM games g JOIN players p ON p.player=g.player
    WHERE g.created>=? AND p.nick IS NOT NULL AND g.player<>? GROUP BY g.player) WHERE s>?`),
};

/* ── helpers ── */
const hash=pid=>crypto.createHash('sha256').update('sonaroids:'+pid).digest('hex').slice(0,32);
function since(period,now){ const d=new Date(now);
  if(period==='all') return 0;
  const day=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());
  if(period==='day') return day;
  const dow=(d.getUTCDay()+6)%7; return day-dow*86400000; }                 // week: since Monday
const PERIODS=['day','week','all'];
function rankOf(player,score,period,now){ const n=q.above.get(since(period,now),player,score).n; return n+1; }

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
setInterval(()=>{ const old=Date.now()-600000; for(const [k,b] of buckets) if(b.t<old) buckets.delete(k); },300000).unref();

/* palm heights: Uint16 little-endian, raw deflate (enc 'deflate') or not (enc 'raw'), base64 */
function decodeHands(enc,b64){ let buf=Buffer.from(String(b64||''),'base64');
  if(enc==='deflate') buf=zlib.inflateRawSync(buf,{maxOutputLength:MAX_STEPS*2}); else if(enc!=='raw') throw new Error('enc');
  if(buf.length%2) throw new Error('odd'); const n=buf.length/2; if(n<1||n>MAX_STEPS) throw new Error('length');
  const hands=new Array(n); for(let i=0;i<n;i++){ const v=buf.readUInt16LE(i*2); if(v===NONE) hands[i]=-1; else if(v<=Q) hands[i]=v/Q; else throw new Error('value'); }
  return {hands,raw:buf}; }

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
  if(b.core!==Core.TAG) return [409,{ok:false,error:'core',core:Core.TAG}];            // an old game version: the rules differ
  const seed=b.seed>>>0, FW=+b.FW, y0=(b.y0===null||b.y0===undefined)?null:+b.y0;
  if(seed!==b.seed||!(FW>=100&&FW<=700)||(y0!==null&&!(y0>=0&&y0<=Core.FH))) return [400,{ok:false,error:'args'}];
  let d; try{ d=decodeHands(b.enc,b.hands); }catch(e){ return [400,{ok:false,error:'hands'}]; }
  const g=Core.replay(seed,FW,d.hands,y0);
  if(g.score!==b.score) return [422,{ok:false,error:'mismatch',score:g.score}];
  const player=hash(b.pid); q.insPlayer.run(player,now);
  try{ q.insGame.run(player,seed,Core.TAG,g.score,g.level,+g.t.toFixed(2),now,FW,y0,zlib.deflateRawSync(d.raw)); }
  catch(e){ if(/UNIQUE/.test(String(e.message))) return [409,{ok:false,error:'dup'}]; throw e; }
  const ranks={}; let listed=false;
  for(const p of PERIODS){ const best=q.best.get(player,since(p,now)).s; ranks[p]=rankOf(player,best,p,now); if(ranks[p]<=LISTED&&best===g.score) listed=true; }
  const named=!!q.getPlayer.get(player).nick;
  return [200,{ok:true,score:g.score,level:g.level,ranks,listed,named}];
}
function postNick(b){
  if(typeof b.pid!=='string'||!/^[0-9a-f]{32}$/.test(b.pid)) return [400,{ok:false,error:'pid'}];
  const nick=cleanNick(b.nick); if(!nick) return [400,{ok:false,error:'nick'}];
  const player=hash(b.pid); q.insPlayer.run(player,Date.now()); q.setNick.run(nick,player); return [200,{ok:true,nick}];
}
function getTop(url,req,now){
  const period=PERIODS.includes(url.searchParams.get('period'))?url.searchParams.get('period'):'all';
  const limit=Math.max(1,Math.min(LISTED,+url.searchParams.get('limit')||20)), t0=since(period,now);
  const pid=String(req.headers['x-player']||''), me=/^[0-9a-f]{32}$/.test(pid)?hash(pid):null;
  const rows=q.top.all(t0,t0,limit);
  const entries=rows.map((r,i)=>({rank:i+1,nick:r.nick,score:r.score,level:r.level,t:r.t,me:r.player===me}));
  let mine=null; if(me){ const best=q.best.get(me,t0).s; if(best!==null&&best!==undefined){ const p=q.getPlayer.get(me); mine={rank:rankOf(me,best,period,now),score:best,nick:p?p.nick:null}; } }
  return [200,{period,entries,me:mine}];
}

const server=http.createServer(async(req,res)=>{
  const origin=ORIGINS.includes(req.headers.origin)?req.headers.origin:null;
  if(req.method==='OPTIONS'){ res.writeHead(204,origin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST','Access-Control-Allow-Headers':'Content-Type, X-Player','Access-Control-Max-Age':'86400','Vary':'Origin'}:{}); return res.end(); }
  const url=new URL(req.url,'http://x'), now=Date.now(), who=ip(req);
  try{
    if(req.method==='GET'&&url.pathname==='/v1/health') return send(res,200,{ok:true,core:Core.TAG},origin);
    if(req.method==='GET'&&url.pathname==='/v1/top'){ if(!allow('r:'+who,120)) return send(res,429,{ok:false,error:'slow down'},origin); const [c,o]=getTop(url,req,now); return send(res,c,o,origin); }
    if(req.method==='POST'&&(url.pathname==='/v1/game'||url.pathname==='/v1/nick')){
      if(!allow('w:'+who,20)) return send(res,429,{ok:false,error:'slow down'},origin);
      const b=await readBody(req); const [c,o]=url.pathname==='/v1/game'?postGame(b,now):postNick(b); return send(res,c,o,origin); }
    send(res,404,{ok:false,error:'not found'},origin);
  }catch(e){ send(res,e.message==='big'||e.message==='json'?400:500,{ok:false,error:e.message==='big'||e.message==='json'?e.message:'server'},origin); if(!/big|json/.test(e.message)) console.error(new Date().toISOString(),e); }
});
if(require.main===module) server.listen(PORT,'127.0.0.1',()=>console.log(`sonaroids leaderboard on 127.0.0.1:${PORT}, rules ${Core.TAG}, db ${DB_PATH}`));
module.exports={server,cleanNick,since,decodeHands,db};
