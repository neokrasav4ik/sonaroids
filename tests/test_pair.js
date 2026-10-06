/* v1.56c — СонарЛинк: the server's room for two phones (server/pair.js). One opens a room, the other joins it by the code;
   each listens to its stream; a message from one reaches the other (and only the other), fast; a wrong key, an unknown code,
   a third phone are refused; the other side hears when its partner comes and goes; a side cannot flood the room. Run: node tests/test_pair.js */
try{ require('node:sqlite'); }catch(e){ console.log('Node '+process.version+' has no node:sqlite (needs 22.13+) — skipped'); console.log('RESULT: ok'); process.exit(0); }
const os=require('os'), path=require('path'), http=require('http'), fs=require('fs');
const tmp=path.join(os.tmpdir(),'sonaroids_pair_'+process.pid+'.db'); process.env.DB=tmp; process.env.ORIGINS='https://sonaroids.app';
const {server}=require('../server/server.js');
const res=[]; const check=(name,ok,info)=>{ res.push(!!ok); console.log((ok?'ok   ':'FAIL ')+name+(info?' — '+info:'')); };
/* a stream reader: events as they come, with the time they came */
function sse(base,q){ const ev=[]; let buf=''; const req=http.get(base+'/v1/pair/sse?'+q,{headers:{Origin:'https://sonaroids.app'}},r=>{ ev.status=r.statusCode; ev.headers=r.headers;
    r.setEncoding('utf8'); r.on('data',d=>{ buf+=d; let i; while((i=buf.indexOf('\n\n'))>=0){ const blk=buf.slice(0,i); buf=buf.slice(i+2);
      const nm=(blk.match(/^event: (.*)$/m)||[])[1], dt=(blk.match(/^data: (.*)$/m)||[])[1]; if(nm) ev.push({name:nm,data:JSON.parse(dt),at:Date.now()}); } }); });
  ev.close=()=>req.destroy(); return ev; }
const wait=(f,ms)=>new Promise(r=>{ const t0=Date.now(); (function k(){ if(f()||Date.now()-t0>ms) r(f()); else setTimeout(k,5); })(); });
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r)); const base='http://127.0.0.1:'+server.address().port;
  const post=(u,b)=>fetch(base+u,{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://sonaroids.app'},body:JSON.stringify(b)}).then(async r=>({code:r.status,j:await r.json(),cors:r.headers.get('access-control-allow-origin')}));
  let r=await post('/v1/pair/new',{}); const A=r.j;
  check('a room opens with a 4-digit code', r.code===200&&/^\d{4}$/.test(A.code)&&A.side===0&&A.key.length===24&&r.cors==='https://sonaroids.app', 'code '+A.code);
  const ea=sse(base,'code='+A.code+'&key='+A.key); await wait(()=>ea.length>=1,2000);
  check('the first phone listens: «hello», no partner yet, not buffered by nginx', ea.status===200&&ea[0].name==='hello'&&ea[0].data.side===0&&ea[0].data.peer===false&&ea.headers['x-accel-buffering']==='no');
  r=await post('/v1/pair/join',{code:'99999'}); check('an unknown code is refused', r.code===404);
  r=await post('/v1/pair/join',{code:A.code}); const B=r.j; check('the second phone joins by the code', r.code===200&&B.side===1&&B.key!==A.key);
  r=await post('/v1/pair/join',{code:A.code}); check('a third phone is refused', r.code===409&&r.j.error==='full');
  const eb=sse(base,'code='+A.code+'&key='+B.key); await wait(()=>eb.length>=1&&ea.some(e=>e.name==='peer'),2000);
  check('the second listens and the first hears its partner come', eb[0]&&eb[0].data.side===1&&eb[0].data.peer===true&&ea.some(e=>e.name==='peer'&&e.data.here));
  r=await post('/v1/pair/send',{code:A.code,key:'x'.repeat(24),m:1}); check('a wrong key cannot speak', r.code===403);
  /* 30 palm heights a second from each side for a second: every one reaches the other side only, in order, fast */
  const lat=[]; for(let i=0;i<30;i++){ const t0=Date.now(); await Promise.all([post('/v1/pair/send',{code:A.code,key:A.key,m:{h:i/30,i}}),post('/v1/pair/send',{code:A.code,key:B.key,m:{h:1-i/30,i}})]);
    await wait(()=>eb.filter(e=>e.name==='m').length>i&&ea.filter(e=>e.name==='m').length>i,1000); lat.push(Date.now()-t0); await new Promise(z=>setTimeout(z,25)); }
  const ma=ea.filter(e=>e.name==='m').map(e=>e.data.m), mb=eb.filter(e=>e.name==='m').map(e=>e.data.m); lat.sort((a,b)=>a-b);
  check('messages reach the other side only, all, in order', mb.length===30&&ma.length===30&&mb.every((m,i)=>m.i===i&&m.h===i/30)&&ma.every((m,i)=>m.i===i&&m.h===1-i/30), `${mb.length}+${ma.length}, median ${lat[15]} ms here`);
  check('each carries the server clock', eb.filter(e=>e.name==='m').every(e=>typeof e.data.t==='number'));
  r=await post('/v1/pair/send',{code:A.code,key:A.key,m:'x'.repeat(3000)}); check('a message over 2 KB is refused', r.code===400);
  let lim=0; for(let i=0;i<70;i++){ r=await post('/v1/pair/send',{code:A.code,key:A.key,m:i}); if(r.code===429) lim++; } check('a side cannot flood the room (60 a second)', lim>0, lim+' of 70 refused');
  eb.close(); await wait(()=>ea.some(e=>e.name==='peer'&&e.data.here===false),2000);
  check('the first phone hears its partner go', ea.some(e=>e.name==='peer'&&e.data.here===false));
  ea.close(); server.closeAllConnections&&server.closeAllConnections(); server.close(); try{ fs.unlinkSync(tmp); }catch(e){}
  const ok=res.every(Boolean); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exit(ok?0:1);
})();
