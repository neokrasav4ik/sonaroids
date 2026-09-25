/* The leaderboard server (server/server.js) on a temporary database: a game the replay reproduces is stored, a forged score is not,
   the same game twice is refused, nicknames are checked, the tables and ranks come out right, old rules are refused. Run: node tests/test_server.js */
try{ require('node:sqlite'); }catch(e){ console.log('Node '+process.version+' has no node:sqlite (needs 22.13+) — skipped'); console.log('RESULT: ok'); process.exit(0); }
const os=require('os'), fs=require('fs'), path=require('path'), zlib=require('zlib'), crypto=require('crypto');
const tmp=path.join(os.tmpdir(),'sonaroids_test_'+process.pid+'.db'); process.env.DB=tmp; process.env.ORIGINS='https://sonaroids.app';
const {server,cleanNick,since}=require('../server/server.js'), Core=require('../src/13_core.js');
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
  await post('/v1/game',Object.assign({pid:A},a2.body)); await post('/v1/game',Object.assign({pid:B},b1.body)); await post('/v1/nick',{pid:B,nick:'Beta'});
  r=await post('/v1/game',Object.assign({pid:C},play(14,0.2,60*20).body));
  t=await get('/v1/top?period=week&limit=10',{'X-Player':A});
  const order=t.j.entries.map(e=>e.nick+':'+e.score).join(', '), best=Math.max(a1.g.score,a2.g.score);
  check('the table: one line per player, best game, highest first, "me" marked', t.j.entries.length===2&&t.j.entries[0].score>=t.j.entries[1].score&&t.j.entries.find(e=>e.nick==='Den_Sonar').score===best&&t.j.entries.some(e=>e.me&&e.nick==='Den_Sonar')&&t.j.me&&t.j.me.score===best, order);
  t=await get('/v1/top?period=day',{'X-Player':C}); check('an unnamed player still sees their own rank', t.j.me&&t.j.me.rank===3&&t.j.me.nick===null, JSON.stringify(t.j.me));
  const mon=new Date(since('week',Date.UTC(2026,8,25,12))); check('periods in UTC: the week starts on Monday', mon.toISOString()==='2026-09-21T00:00:00.000Z'&&new Date(since('day',Date.UTC(2026,8,25,12))).toISOString()==='2026-09-25T00:00:00.000Z');
  const h=await get('/v1/health'); check('health', h.j.ok&&h.j.core===Core.TAG);
  server.close(); try{ fs.unlinkSync(tmp); fs.unlinkSync(tmp+'-wal'); fs.unlinkSync(tmp+'-shm'); }catch(e){}
  const ok=res.every(Boolean); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1; setTimeout(()=>process.exit(process.exitCode),100);
})();
