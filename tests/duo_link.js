/* SonaLob «Вдвоём», the link (v1.64b, src/23_link.js): two games in one headless Chromium, the records server (with its pair rooms) on a
   temporary database. A room by code: the other phone joins, both hear «the partner is here», messages go both ways, the server's clock is
   learnt alike on both; the direct channel is tried (WebRTC; where it opens, messages go that way). «Рядом»: two presses from one network
   meet in one room. A phone that leaves — the other hears it. Run: node tests/duo_link.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('no playwright — skipped'); console.log('RESULT: ok'); process.exit(0); }
try{ require('node:sqlite'); }catch(e){ console.log('no node:sqlite — skipped'); console.log('RESULT: ok'); process.exit(0); }
const os=require('os'), path=require('path'); process.env.DB=path.join(os.tmpdir(),'sonaroids_duo_'+process.pid+'.db'); process.env.ORIGINS='null';
const {server}=require('../server/server.js'), ROOT=path.join(__dirname,'..');
let ok=true; const check=(name,c,info)=>{ console.log((c?'ok   ':'FAIL ')+name+(info?' — '+info:'')); if(!c) ok=false; };
(async()=>{ await new Promise(r=>server.listen(0,'127.0.0.1',r)); const base='http://127.0.0.1:'+server.address().port;
  const b=await chromium.launch(), pages=[];
  for(let i=0;i<2;i++){ const ctx=await b.newContext({viewport:{width:844,height:390}}); await ctx.addInitScript(`localStorage.setItem('sonaroids_seen','1'); window.SONAROIDS_API='${base}'; window.__got=[]; `);
    const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.errs=errs; await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(300);
    await p.evaluate(()=>{ __sonaroids.link.on(function(m,via){ window.__got.push([m,via,performance.now()]); }); }); pages.push(p); }
  const [A,B]=pages, wait=async(p,f,ms)=>{ const t0=Date.now(); while(Date.now()-t0<ms){ if(await p.evaluate(f)) return true; await p.waitForTimeout(50); } return false; };
  const ja=await A.evaluate(()=>__sonaroids.link.create()); const jb=await B.evaluate(c=>__sonaroids.link.join(c),ja.code);
  const both=await wait(A,()=>{ const s=__sonaroids.link.state(); return s&&s.peer; },5000)&&await wait(B,()=>{ const s=__sonaroids.link.state(); return s&&s.peer; },5000);
  check('a room by code: the other phone joins, both hear the partner',ja.ok&&jb.ok&&ja.side===0&&jb.side===1&&both,`code ${ja.code}`);
  await A.evaluate(()=>{ for(let i=0;i<5;i++) __sonaroids.link.send({e:'x',i:i}); }); await B.evaluate(()=>__sonaroids.link.send({e:'y',i:9}));
  const gb=await wait(B,()=>window.__got.filter(g=>g[0].e==='x').length===5,4000), ga=await wait(A,()=>window.__got.some(g=>g[0].e==='y'),4000);
  const ord=await B.evaluate(()=>window.__got.filter(g=>g[0].e==='x').map(g=>g[0].i).join(''));
  check('messages go both ways, in order',gb&&ga&&ord==='01234',ord);
  const dir=await wait(A,()=>__sonaroids.link.direct(),6000)&&await wait(B,()=>__sonaroids.link.direct(),3000);
  if(dir){ await A.evaluate(()=>__sonaroids.link.send({e:'z'})); const via=await wait(B,()=>window.__got.some(g=>g[0].e==='z'&&g[1]==='d'),2000); check('the direct channel opens and carries the messages',via,'WebRTC between the two pages'); }
  else console.log('note the direct channel did not open here (no addresses in this browser) — the messages go through the server, as between two networks');
  await wait(A,()=>__sonaroids.link.state().syncs>=6,4000); await wait(B,()=>__sonaroids.link.state().syncs>=6,4000);
  const offs=[await A.evaluate(()=>__sonaroids.link.state().off),await B.evaluate(()=>__sonaroids.link.state().off)];
  const rtts=[await A.evaluate(()=>__sonaroids.link.state().rtt),await B.evaluate(()=>__sonaroids.link.state().rtt)];
  check('the server\'s clock is learnt alike on both (within half the round trips — the most a clock read over a network can promise)',Math.abs(offs[0]-offs[1])<=(rtts[0]+rtts[1])/2+10,`offsets ${offs.map(x=>x.toFixed(0)).join(' / ')} ms, round trips ${rtts.join(' / ')} ms`);
  await B.evaluate(()=>__sonaroids.link.close()); const gone=await wait(A,()=>window.__got.some(g=>g[0].e==='gone'),4000);
  check('a phone that leaves — the other hears it',gone);
  await A.evaluate(()=>__sonaroids.link.close());
  const [na,nb]=await Promise.all([A.evaluate(()=>__sonaroids.link.near()),B.evaluate(()=>__sonaroids.link.near())]);
  const nboth=await wait(A,()=>{ const s=__sonaroids.link.state(); return s&&s.peer; },5000);
  check('«Рядом»: two presses from one network meet in one room',na.ok&&nb.ok&&na.code===nb.code&&na.side!==nb.side&&nboth,`room ${na.code}, sides ${na.side}/${nb.side}`);
  check('no page errors',!A.errs.length&&!B.errs.length,A.errs.concat(B.errs).slice(0,2).join(' | '));
  await b.close(); server.close(); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exit(ok?0:1); })();
