/* v1.31: the bots — so that the tables are never empty and something happens in them every day (the maintainer: «чтобы в игру постоянно
   играли новые и старые боты.. типа живых игроков.. как слабые так и сильные»). They are open about it: the game's records screen has
   «EVERYONE | PEOPLE ONLY» (/v1/top?…&bots=0), and server/stats.js never counts them.

   Each bot is a player with a name, its own skill and habits. Every 10 minutes (cron) the server decides which of them have dropped in now —
   more in the afternoon and evening by Moscow time, hardly any at night — and plays their games with the game's own rules (server/botplay.js),
   stored like anyone's, with the palm heights, so the same replay check holds. Some bots play daily, some once in a few days; beginners
   often end a game early from the pause; the weak ones slowly get better; new ones come now and then, old ones stop (their records stay).
   The strongest stay a little below the best person's record (CAP of it) — the top of «all time» is for people.

   Run on the server (as the service's user, with its database):
     node --no-warnings server/bots.js init [n=40] [days=7]   — make n bots and play their last few days (once)
     node --no-warnings server/bots.js tick                    — the 10-minute step (cron, every 10 minutes)
     node --no-warnings server/bots.js list                    — who they are, their games and best scores
     node --no-warnings server/bots.js remove [--yes]          — all bots and their games out (a copy of the database first) */
'use strict';
const path=require('node:path'), fs=require('node:fs'), zlib=require('node:zlib'), crypto=require('node:crypto');
const {db,hash,q,cleanNick}=require('./server.js');
const Core=require(path.join(__dirname,'..','src','13_core.js')), Race=require(path.join(__dirname,'..','src','14_race.js'));
const play=require('./botplay.js');
const TARGET=+(process.env.BOTS||40), CAP=0.88, SLOT=600000, DAY=86400000, MSK=3;   // Moscow is UTC+3
/* a bot's dice: Math.random is enough here — nothing about a bot needs to be repeatable but its games, and those are kept */
const R=()=>Math.random(), pick=a=>a[Math.floor(R()*a.length)], between=(a,b)=>a+(b-a)*R();

/* ── names: Latin letters, digits and _ only, as people's (the server's own check), never one a person already has ── */
const NAMES=['dimon','lesha','nastya','katya','misha','sasha','vovan','artem','kirill','liza','masha','olya','pasha','timur','egor','ilya','vika','yulia','max','anya',
  'roma','danya','nikita','sonya','gleb','vlad','alina','den4ik','kostya','sveta','marat','oleg','zhenya','stas','vera','lyoha','tanya','fedya','arina','rustam',
  'alex','mike','kate','tom','nick','emma','leo','mia','sam','lucas','nina','paul','ana','marco','jan','eva','ivan','olga','tim','lena'];
const WORDS=['sky','orbit','nova','comet','rocket','pixel','ghost','wolf','fox','lynx','raven','drift','turbo','neon','echo','zen','frost','storm','blaze','pilot',
  'star','moon','void','astro','luna','vortex','falcon','hawk','spark','flash','ninja','tiger','bear','shadow','cosmo','retro','laser','meteor','quasar','glider',
  'kot','lis','volk','sova','yozh','ryzhik','bublik','pryanik','kosmos','zvezda','tucha','veter','grom','molniya','raketa','sputnik','kometa','zayac','barsik','pirozhok'];
function makeNick(taken){ for(let i=0;i<200;i++){ const n=pick(NAMES), w=pick(WORDS), d=String(Math.floor(R()*100)).padStart(R()<0.5?2:1,'0'), y=String(1985+Math.floor(R()*25));
    const forms=[n+d, n+'_'+w, w+'_'+n, w+d, n+y.slice(2), w.charAt(0).toUpperCase()+w.slice(1)+n.charAt(0).toUpperCase()+n.slice(1), n+'_'+d, w+'_'+w.slice(0,2)+d, n.toUpperCase().slice(0,3)+'_'+w, n+y];
    let s=pick(forms); if(R()<0.15) s=s.toLowerCase(); s=s.slice(0,16); const c=cleanNick(s);
    if(c&&!taken.has(c.toLowerCase())){ taken.add(c.toLowerCase()); return c; } }
  return 'pilot'+Math.floor(R()*1e6); }
const takenNicks=()=>new Set(db.prepare('SELECT nick FROM players WHERE nick IS NOT NULL').all().map(r=>r.nick.toLowerCase()));

/* ── a new bot: how good it is, how good it can get, when and how much it plays ── */
function newBot(now,taken,born){
  const r=R(), skill=r<0.35?between(0,0.3):r<0.75?between(0.3,0.65):r<0.93?between(0.65,0.85):between(0.85,1);   // most are middling, a few strong
  const prof={ nick:makeNick(taken), skill:+skill.toFixed(3), pot:+Math.min(1,skill+between(0.05,0.35)).toFixed(3), learn:+between(0.002,0.012).toFixed(4),
    perDay:+between(0.3,3).toFixed(2), days:+between(0.2,0.95).toFixed(2), shift:Math.round(between(-2,4)), quit:+(0.05+0.45*(1-skill)*R()).toFixed(2),
    fly:R()<0.85, race:R()<0.55, FW:pick([333,360,380,389,389,400,405]), games:0 };
  if(!prof.fly&&!prof.race) prof.fly=true;
  const pid=crypto.randomBytes(16).toString('hex'), player=hash(pid), b=born||now, until=R()<0.3?b+3650*DAY:b+Math.round(between(20,120))*DAY;   // a third stay for good
  db.prepare('INSERT OR IGNORE INTO players(player,nick,created) VALUES(?,?,?)').run(player,prof.nick,b); q.setNick.run(prof.nick,player);
  db.prepare('INSERT INTO bots(player,born,until,prof) VALUES(?,?,?,?)').run(player,b,until,JSON.stringify(prof));
  return {player,born:b,until,prof}; }

/* ── when people play: how likely a bot drops in at an hour of its day (afternoon and evening, hardly at night) ── */
const HOURS=[0.25,0.1,0.05,0.03,0.03,0.05,0.15,0.35,0.5,0.6,0.65,0.7,0.8,0.8,0.75,0.75,0.8,0.9,1,1.1,1.15,1.05,0.8,0.5], HSUM=HOURS.reduce((a,b)=>a+b,0);
const dayOn=(player,t)=>{ const d=Math.floor((t+MSK*3600000)/DAY), h=crypto.createHash('md5').update(player+':'+d).digest(); return h[0]/256; };   // the same answer all day

/* the best person's score in a game: the bots stay below it */
function capOf(game){ const r=db.prepare('SELECT MAX(g.score) AS s FROM games g WHERE g.game=? AND g.player NOT IN (SELECT player FROM bots)').get(game);
  const best=r&&r.s?r.s:(game==='race'?15000:1500000); return Math.round(best*CAP); }

/* ── one game: played, checked by the same replay the server runs, stored ── */
const insGame=db.prepare('INSERT OR IGNORE INTO games(player,seed,core,score,level,t,created,fw,y0,replay,dev,seen,game,steer) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
function oneGame(bot,game,created,caps){
  const p=bot.prof, seed=crypto.randomBytes(4).readUInt32LE(0), race=game==='race';
  const typical=race?2000+16000*p.skill*p.skill:60000+1100000*p.skill*p.skill;            // roughly what it makes when it plays a game out
  const hard=Math.round(caps[game]/CAP*0.97);                                            // never above the best person: it stops there at the latest
  let quit=R()<p.quit?Math.round(typical*between(0.05,0.6)):0; if(!quit||quit>hard) quit=hard; const cap=Math.round(caps[game]*between(0.75,1));
  const r=(race?play.race:play.fly)(seed,p.FW,p.skill,cap,quit);
  if(r.score<=0||r.q.length<30) return null;
  const hands=r.q.map(v=>v/play.Q), g=race?Race.replay(seed,p.FW,hands,null,'road',null):Core.replay(seed,p.FW,hands,null);
  if(g.score!==r.score) return null;                                                   // never: the same rules, the same numbers
  const buf=Buffer.alloc(r.q.length*2); r.q.forEach((v,i)=>buf.writeUInt16LE(v,i*2));
  const level=race?Math.floor(g.d/10):g.level;
  insGame.run(bot.player,seed,race?Race.TAG:Core.TAG,g.score,level,+g.t.toFixed(2),created,p.FW,null,zlib.deflateRawSync(buf),null,1,game,race?'road':null);
  p.games++; if(p.skill<p.pot) p.skill=+Math.min(p.pot,p.skill+p.learn).toFixed(4);           // it gets a little better with every game
  return {game,score:g.score,t:g.t}; }

/* ── the 10-minute step: who drops in now, and their games, placed back in time within the slot as if just played ── */
function tick(now,quiet){
  const bots=db.prepare('SELECT player,born,until,prof FROM bots').all().map(b=>({player:b.player,born:b.born,until:b.until,prof:JSON.parse(b.prof)}));
  const alive=bots.filter(b=>b.born<=now&&b.until>now), taken=takenNicks(), caps={fly:capOf('fly'),race:capOf('race')}, out=[];
  // newcomers: up to the target, and now and then one more (about one in three days)
  if(alive.length<TARGET&&R()<0.02) alive.push(newBot(now,taken));
  else if(R()<1/(6*24*3)) alive.push(newBot(now,taken));
  const hour=(new Date(now).getUTCHours()+MSK+24)%24;
  for(const b of alive){ const p=b.prof, h=(hour+p.shift+24)%24;
    if(dayOn(b.player,now)>p.days) continue;                                           // not its day
    if(R()>p.perDay/p.days*HOURS[h]/HSUM/6) continue;                                  // not now
    const n=R()<0.5?1:R()<0.6?2:R()<0.7?3:Math.ceil(between(3,6));                     // one game, or a few in a row
    const games=[]; for(let i=0;i<n;i++) games.push(p.fly&&(!p.race||R()<0.6)?'fly':'race');
    let end=now-Math.round(between(0,0.5)*SLOT);                                       // the last game ended within this slot
    const done=[]; for(const gm of games.reverse()){ const r=oneGame(b,gm,end,caps); if(r){ done.push(r); end-=Math.round(r.t*1000+between(15,90)*1000); } }
    db.prepare('UPDATE bots SET prof=? WHERE player=?').run(JSON.stringify(p),b.player);
    if(done.length) out.push(p.nick+': '+done.map(r=>r.game+' '+r.score).join(', ')); }
  if(!quiet&&out.length) console.log(new Date(now).toISOString()+' '+out.join(' | '));
  return out.length; }

function init(n,days){ const now=Date.now(), taken=takenNicks(), have=db.prepare('SELECT COUNT(*) AS c FROM bots').get().c;
  for(let i=have;i<n;i++) newBot(now,taken,now-Math.round(between(days,days+30))*DAY);   // they came some time ago
  let k=0; for(let t=now-days*DAY;t<now;t+=SLOT) k+=tick(t,true);
  console.log(`bots: ${db.prepare('SELECT COUNT(*) AS c FROM bots').get().c}, played ${days} days back: ${db.prepare('SELECT COUNT(*) AS c FROM games WHERE player IN (SELECT player FROM bots)').get().c} games`); }
function list(){ const rows=db.prepare(`SELECT b.player, b.until, b.prof, (SELECT COUNT(*) FROM games g WHERE g.player=b.player) AS n,
    (SELECT MAX(score) FROM games g WHERE g.player=b.player AND g.game='fly') AS fly, (SELECT MAX(score) FROM games g WHERE g.player=b.player AND g.game='race') AS race FROM bots b`).all();
  rows.map(r=>Object.assign(r,{p:JSON.parse(r.prof)})).sort((a,b)=>(b.fly||0)-(a.fly||0)).forEach(r=>console.log(`${r.p.nick.padEnd(16)} skill ${r.p.skill.toFixed(2)}→${r.p.pot.toFixed(2)}  games ${String(r.n).padStart(4)}  best fly ${String(r.fly||'–').padStart(8)}  race ${String(r.race||'–').padStart(6)}${r.until<Date.now()?'  (stopped)':''}`));
  console.log(`${rows.length} bots; caps now: fly ${capOf('fly')}, race ${capOf('race')}`); }
function remove(yes){ const n=db.prepare('SELECT COUNT(*) AS c FROM bots').get().c, g=db.prepare('SELECT COUNT(*) AS c FROM games WHERE player IN (SELECT player FROM bots)').get().c;
  if(!yes){ console.log(`would remove ${n} bots and their ${g} games; add --yes`); return; }
  const dir=path.join(path.dirname(process.env.DB||path.join(__dirname,'sonaroids.db')),'backup'); fs.mkdirSync(dir,{recursive:true});
  const f=path.join(dir,'before-bots-remove-'+new Date().toISOString().replace(/[:.]/g,'-')+'.db'); db.exec(`VACUUM INTO '${f.replace(/'/g,"''")}'`);
  db.exec('BEGIN'); db.exec('DELETE FROM games WHERE player IN (SELECT player FROM bots)'); db.exec('DELETE FROM players WHERE player IN (SELECT player FROM bots)'); db.exec('DELETE FROM bots'); db.exec('COMMIT');
  console.log(`removed ${n} bots and ${g} games; a copy first: ${f}`); }

if(require.main===module){ const [cmd,a,b]=process.argv.slice(2);
  if(cmd==='init') init(+(a||TARGET),+(b||7)); else if(cmd==='tick') tick(Date.now()); else if(cmd==='list') list(); else if(cmd==='remove') remove(a==='--yes');
  else console.log('usage: node server/bots.js init [n] [days] | tick | list | remove [--yes]'); }
module.exports={tick,init,newBot,makeNick,capOf};
