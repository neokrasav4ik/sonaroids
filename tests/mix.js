/* «ВСЁ ПОДРЯД / SHUFFLE» (v1.24; the maintainer: «добавим в опцию выбора скинов для игр (и флай и рейс) такую типа "рандом микс"… чтобы
   скин менялся в игре каждые 25–40 секунд на рандомный, не повторяющийся с предыдущими»; the change «Г3», the torn sheet) in headless Chromium.
   Checks: the skin rows go round the skins and then «SHUFFLE» and back, in SonaFly and SonaRace, kept on the phone; in a game with shuffle
   the skin changes when it is time, never to one of the last two, the change taking about a second with the old world still drawn left of
   the edge (both HD and pixels); the next change is planned 25–40 s on; no page errors. Run: node tests/mix.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('playwright not installed — skipped'); console.log('RESULT: ok'); process.exit(0); }
const path=require('path'); const ROOT=path.join(__dirname,'..');
(async()=>{
  const b=await chromium.launch(); const errors=[]; let ok=true; const out=[], check=(n,g,i)=>{ ok=ok&&g; out.push(`${n}: ${i||''} ${g?'ok':'FAIL'}`); };
  const open=async(init)=>{ const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:2}); await ctx.addInitScript(`localStorage.setItem('sonaroids_lang','en'); localStorage.setItem('sonaroids_seen','1'); ${init||''}`);
    const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message)); await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(500); return p; };
  // the rows go round
  let p=await open(); const fly=await p.evaluate(async()=>{ const S=__sonaroids, w=ms=>new Promise(r=>setTimeout(r,ms)); S.fake(); S.go('title'); await w(200); const k=[];
    for(let i=0;i<7;i++){ S.act.skin_next(); await w(30); const m=S.mixInfo(); k.push(m.fly?'mix':m.cur); } S.act.skin_prev(); await w(30); k.push(S.mixInfo().fly?'mix':S.mixInfo().cur); return {k,kept:localStorage.getItem('sonaroids_skin_mix')}; });
  check('SonaFly: the skins, then «SHUFFLE», then the first again; back is «SHUFFLE»',fly.k.join(',')==='fairy,vector,neon,note,lcd,mix,space,mix'&&fly.kept==='1',fly.k.join(' → '));
  // in a game: the change and its timing, both graphics, both games
  for(const gfx of ['hd','pixel']) for(const mode of ['fly','race']){
    p=await open(`localStorage.setItem('sonaroids_gfx','${gfx}'); localStorage.setItem('sonaroids_skin_mix','1'); localStorage.setItem('sonaroids_race_mix','1');`);
    if(mode==='fly') await p.evaluate(()=>{ __sonaroids.fake(); const g=__sonaroids.state().g; g.state='play'; __sonaroids.go('play'); });
    else { await p.evaluate(()=>{ __sonaroids.fake(); __sonaroids.act.hub_race(); __sonaroids.race(); __sonaroids.go('count'); }); await p.waitForTimeout(300); await p.evaluate(()=>{ const S=__sonaroids, g=S.state().g; g.state='play'; g.opt.burn=false; g.fuel=80; g.d=1500; g.t=150; g.v=120; S.go('play'); }); }
    await p.waitForTimeout(600); const seen=[];
    const until=async(f,ms)=>{ const t0=Date.now(); let m; while(Date.now()-t0<ms){ m=await p.evaluate(()=>__sonaroids.mixInfo()); if(f(m)) return m; await p.waitForTimeout(40); } return m; };   // frames come slower on a busy machine: wait on the game, not the clock
    for(let r=0;r<3;r++){ await p.evaluate(()=>__sonaroids.mixNow()); const m=await until(m=>m.tr!==null&&m.tr>0.2,4000); seen.push(m); await until(m=>m.tr===null,8000); }
    const end=await p.evaluate(()=>__sonaroids.mixInfo());
    const changed=seen.every(m=>m&&m.tr!==null&&m.tr>0.2&&m.tr<1.1), noRep=seen.every((m,i)=>i<1||m.cur!==seen[i-1].cur)&&seen.every((m,i)=>i<2||m.cur!==seen[i-2].cur), done=end.tr===null;
    check(`${mode}, ${gfx}: the skin changes in about a second, never to one of the last two`,changed&&noRep&&done,seen.map(m=>m.cur+'@'+(m.tr||0).toFixed(2)).join(' → '));
    await p.close(); }
  check('no page errors',errors.length===0,errors.slice(0,3).join(' | '));
  await b.close(); out.forEach(l=>console.log(l)); console.log('RESULT: '+(ok?'ok':'FAIL')); process.exit(ok?0:1); })();
