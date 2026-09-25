/* The leaderboard server (server/server.js) on a temporary database: a game the replay reproduces is stored, a forged score is not,
   the same game twice is refused, nicknames are checked, the tables and ranks come out right, old rules are refused. Run: node tests/test_server.js */
try{ require('node:sqlite'); }catch(e){ console.log('Node '+process.version+' has no node:sqlite (needs 22.13+) — skipped'); console.log('RESULT: ok'); process.exit(0); }
const os=require('os'), fs=require('fs'), path=require('path'), zlib=require('zlib'), crypto=require('crypto');
const tmp=path.join(os.tmpdir(),'sonaroids_test_'+process.pid+'.db'); process.env.DB=tmp; process.env.ORIGINS='https://sonaroids.app';
/* a database from before v0.29 (no dev / seen columns, one old game): the server must add the columns in place */
{ const {DatabaseSync}=require('node:sqlite'), o=new DatabaseSync(tmp);
  o.exec(`CREATE TABLE games(id INTEGER PRIMARY KEY, player TEXT NOT NULL, seed INTEGER NOT NULL, core TEXT NOT NULL, score INTEGER NOT NULL, level INTEGER NOT NULL,
    t REAL NOT NULL, created INTEGER NOT NULL, fw REAL, y0 REAL, replay BLOB, UNIQUE(player,seed)); CREATE TABLE players(player TEXT PRIMARY KEY, nick TEXT, created INTEGER NOT NULL);`);
  o.prepare('INSERT INTO games(player,seed,core,score,level,t,created) VALUES(?,?,?,?,?,?,?)').run('old',1,'rules-2',5,1,3,Date.now()); o.close(); }
const {server,cleanNick,cleanDev,since,db}=require('../server/server.js'), Core=require('../src/13_core.js');
const res=[]; const check=(name,ok,info)=>{ res.push(!!ok); console.log((ok?'ok   ':'FAIL ')+name+(info?' — '+info:'')); };
const pid=()=>crypto.randomBytes(16).toString('hex');
/* a game as the page plays it: palm heights rounded to 1/4000, the same numbers go to the server */
function play(seed,amp,steps){ const hands=[], g=Core.create(seed,380,90); for(let i=0;i<steps&&g.state==='play';i++){ let h=0.5+amp*Math.sin(i/37)+0.1*Math.sin(i/11); h=Math.max(0,Math.min(1,h)); h=Math.round(h*4000)/4000; if(i%500===250) h=null; hands.push(h); Core.step(g,h); }
  const buf=Buffer.alloc(hands.length*2); hands.forEach((h,i)=>buf.writeUInt16LE(h===null?65535:Math.round(h*4000),i*2));
  return {g,body:{core:Core.TAG,seed,FW:380,y0:90,enc:'deflate',hands:zlib.deflateRawSync(buf).toString('base64'),score:g.score},bytes:buf.length,zbytes:zlib.deflateRawSync(buf).length}; }
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r)); const base='http://127.0.0.1:'+server.address().port;
  const post=(u,b,h)=>fetch(base+u,{method:'POST',headers:Object.assign({'Content-Type':'application/json','Origin':'https://sonaroids.app'},h||{}),body:JSON.stringify(b)}).then(async r=>({code:r.status,cors:r.headers.get('access-control-allow-origin'),j:await r.json()}));
  const get=(u,h)=>fetch(base+u,{headers:h||{}}).then(async r=>({code:r.status,j:await r.json()}));
  const A=pid(), B=pid(), C=pid();
  const a1=play(11,0.35,60*120), a2=play(12,0.3,60*60), b1=play(13,0.4,60*150);
  let r=await post('/v1/game',Object.assign({pid:A},a1.body));
  check('a real game is replayed and stored', r.code===200&&r.j.ok&&r.j.score===a1.g.score&&r.j.listed&&!r.j.named, `score ${a1.g.score}, ${a1.bytes} B of palm heights → ${a1.zbytes} B sent, ranks ${JSON.stringify(r.j.ranks)}, CORS ${r.cors}`);
  r=await post('/v1/game',Object.assign({pid:A},a1.body,{score:a1.g.score+1000}));
  check('a forged score is refused', r.code===422&&r.j.error==='mismatch');
  r=await post('/v1/game',Object.assign({pid:A},a1.body)); check('the same game twice is refused', r.code===409&&r.j.error==='dup');
  r=await post('/v1/game',Object.assign({pid:A},a1.body,{core:'rules-0',seed:99})); check('a game by other rules is refused', r.code===409&&r.j.error==='core');
  r=await post('/v1/game',{pid:A,core:Core.TAG,seed:5,FW:380,y0:90,enc:'raw',hands:'AAAB',score:0}); check('broken palm data is refused', r.code===400);
  let t=await get('/v1/top?period=all'); check('a player without a nickname is not listed', t.j.entries.length===0);
  r=await post('/v1/nick',{pid:A,nick:' Den_Sonar '}); check('a nickname is trimmed and set', r.code===200&&r.j.nick==='Den_Sonar');
  const badNicks=['Fuck_you','Иван','Den Sonar','a-b','Z!',"x';DROP",'<script>','a'.repeat(17),''];
  check('only Latin letters, digits and _; bad words refused', badNicks.every(n=>cleanNick(n)===null)&&['neo_42','Den','A_1','x'.repeat(16)].every(n=>cleanNick(n)!==null));
  const DEV={os:'android',br:'samsung',model:'SM-S938B',pwa:false,lang:'ru',fs:48000,snr:41.3,lvl:-12.5,gain:0.25,eq:true,eq_db:21.4,relocks:2,drops:7,side:'camera',ec:false,ns:true,agc:false,
    ua:'Mozilla/5.0 (Linux; Android 16)',ip:'1.2.3.4',nick:'x',extra:{a:1}};
  await post('/v1/game',Object.assign({pid:A},a2.body,{dev:DEV}));
  const row=db.prepare('SELECT dev, seen FROM games WHERE seed=12').get(), sd=JSON.parse(row.dev||'{}');
  check('the phone note is kept, only its known keys; the share of palm seen', sd.model==='SM-S938B'&&sd.ns===true&&sd.snr===41.3&&!('ua' in sd)&&!('ip' in sd)&&!('extra' in sd)&&row.seen>0.99&&row.seen<1,
    row.dev+', seen '+row.seen);
  check('a bad phone note is dropped, not refused', cleanDev({os:'windows',model:"x';DROP TABLE",snr:'40',fs:1e9})===null&&cleanDev('x')===null&&cleanDev(null)===null); await post('/v1/game',Object.assign({pid:B},b1.body)); await post('/v1/nick',{pid:B,nick:'Beta'});
  r=await post('/v1/game',Object.assign({pid:C},play(14,0.2,60*20).body));
  t=await get('/v1/top?period=week&limit=10',{'X-Player':A});
  const order=t.j.entries.map(e=>e.nick+':'+e.score).join(', '), best=Math.max(a1.g.score,a2.g.score);
  check('the table: one line per player, best game, highest first, "me" marked', t.j.entries.length===2&&t.j.entries[0].score>=t.j.entries[1].score&&t.j.entries.find(e=>e.nick==='Den_Sonar').score===best&&t.j.entries.some(e=>e.me&&e.nick==='Den_Sonar')&&t.j.me&&t.j.me.score===best, order);
  t=await get('/v1/top?period=day',{'X-Player':C}); check('an unnamed player still sees their own rank', t.j.me&&t.j.me.rank===3&&t.j.me.nick===null, JSON.stringify(t.j.me));
  const mon=new Date(since('week',Date.UTC(2026,8,25,12))); check('periods in UTC: the week starts on Monday', mon.toISOString()==='2026-09-21T00:00:00.000Z'&&new Date(since('day',Date.UTC(2026,8,25,12))).toISOString()==='2026-09-25T00:00:00.000Z');
  const S=pid(); await post('/v1/setup',{pid:S,result:'noprobe',dev:DEV}); await post('/v1/setup',{pid:S,result:'caught',t:7.3,flips:1,dev:DEV});
  r=await post('/v1/setup',{pid:S,result:"x';DROP"}); const r2=await post('/v1/setup',{pid:'zz',result:'caught'});
  const srows=db.prepare('SELECT result,t,flips,dev FROM setups').all();
  check('getting-ready reports from every player; bad ones refused', srows.length===2&&srows[1].t===7.3&&srows[1].flips===1&&JSON.parse(srows[0].dev).model==='SM-S938B'&&r.code===400&&r2.code===400, JSON.stringify(srows.map(x=>x.result)));
  const h=await get('/v1/health'); check('health', h.j.ok&&h.j.core===Core.TAG);
  const st=require('child_process').execFileSync(process.execPath,['--no-warnings',path.join(__dirname,'..','server','stats.js'),'7'],{env:Object.assign({},process.env,{DB:tmp})}).toString();
  check('server/stats.js: phones by kind, old games apart', /android \/ samsung \/ SM-S938B\s+1\s+1/.test(st)&&/before v0\.29/.test(st)&&/getting ready.*2 reports/.test(st)&&/SM-S938B\s+2\s+1\s+50%/.test(st), '\n'+st.trim().split('\n').map(l=>'       '+l).join('\n'));
  // v0.32: the place of this very game, counting the player's own better game (the table shows only the best game per player)
  const bestA=Math.max(a1.g.score,a2.g.score), a3=play(15,0.25,60*30); r=await post('/v1/game',Object.assign({pid:A},a3.body));
  const wantHere=1+(b1.g.score>a3.g.score?1:0)+(bestA>a3.g.score?1:0), wantRank=1+(b1.g.score>Math.max(bestA,a3.g.score)?1:0);
  check('game over: the place of this game and of the player\'s record', r.j.ok&&r.j.here&&r.j.here.week===wantHere&&r.j.ranks.week===wantRank&&(a3.g.score<bestA?r.j.here.week>r.j.ranks.week:r.j.here.week===r.j.ranks.week),
    `this game ${a3.g.score} → place ${r.j.here.week}, the record ${Math.max(bestA,a3.g.score)} → place ${r.j.ranks.week}`);
  // v0.32: the transfer code — another device (E, its own game, no name) takes over A's player; E's games join A's
  const hashP=x=>crypto.createHash('sha256').update('sonaroids:'+x).digest('hex').slice(0,32), E=pid(), e1=play(16,0.3,60*40);
  await post('/v1/game',Object.assign({pid:E},e1.body)); await post('/v1/setup',{pid:E,result:'caught',t:5});
  const lk=await post('/v1/link',{pid:A}); const wrong=await post('/v1/claim',{pid:E,code:'AAAAAA'}), cl=await post('/v1/claim',{pid:E,code:' '+lk.j.code.toLowerCase().slice(0,3)+'-'+lk.j.code.slice(3)+' '});
  const again=await post('/v1/claim',{pid:pid(),code:lk.j.code});
  const nE=db.prepare('SELECT count(*) AS n FROM games WHERE player=?').get(hashP(E)).n, mine=db.prepare('SELECT count(*) AS n FROM games WHERE player=? AND seed=16').get(hashP(A)).n,
    pE=db.prepare('SELECT count(*) AS n FROM players WHERE player=?').get(hashP(E)).n, sE=db.prepare('SELECT count(*) AS n FROM setups WHERE player=?').get(hashP(A)).n;
  t=await get('/v1/top?period=all&limit=10',{'X-Player':A});
  check('the transfer code: a 6-character code; the other device takes over the player and its games join in; one use only',
    lk.j.ok&&/^[A-Z2-9]{6}$/.test(lk.j.code)&&wrong.code===404&&cl.j.ok&&cl.j.pid===A&&cl.j.nick==='Den_Sonar'&&nE===0&&pE===0&&mine===1&&sE===1&&again.code===404&&t.j.entries.filter(e=>e.nick==='Den_Sonar').length===1,
    `code ${lk.j.code}, claim → ${JSON.stringify({ok:cl.j.ok,nick:cl.j.nick})}, the same code again → ${again.code}`);
  // v0.34: server/drop_player.js — a stray player (a key no device holds) is removed by the start of its key; a dry run first, a copy of the database before
  const whoB=hashP(B).slice(0,8), dp=(...x)=>require('child_process').spawnSync(process.execPath,['--no-warnings',path.join(__dirname,'..','server','drop_player.js'),...x],{env:Object.assign({},process.env,{DB:tmp})});
  const dry=dp(whoB), nB0=db.prepare('SELECT count(*) AS n FROM games WHERE player=?').get(hashP(B)).n, bad1=dp('zz'), bad2=dp('');
  const real=dp(whoB,'--yes'), nB1=db.prepare('SELECT count(*) AS n FROM games WHERE player=? OR player IN (SELECT player FROM players WHERE nick=?)').get(hashP(B),'Beta').n;
  const cp=(String(real.stdout).match(/copy of the database: (\S+)/)||[])[1]; t=await get('/v1/top?period=all&limit=10');
  check('server/drop_player.js: shows first, removes with --yes, keeps a copy', dry.status===0&&/Beta/.test(String(dry.stdout))&&nB0>0&&bad1.status!==0&&bad2.status!==0&&real.status===0&&nB1===0&&cp&&fs.existsSync(cp)&&!t.j.entries.some(e=>e.nick==='Beta'),
    String(real.stdout).trim().split('\n').slice(-1)[0]);
  try{ fs.unlinkSync(cp); }catch(e){}
  server.close(); try{ fs.unlinkSync(tmp); fs.unlinkSync(tmp+'-wal'); fs.unlinkSync(tmp+'-shm'); }catch(e){}
  const ok=res.every(Boolean); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1; setTimeout(()=>process.exit(process.exitCode),100);
})();
