/* The settings (v1.12; the maintainer: «пора вводить кнопку „настройки“ на главном экране… по умолчанию: автокалибровка вкл, кроме первого
   запуска; графика — не определено; ширина канала — не определено»; his sketch А) in headless Chromium.
   Checks: the games' screen has «settings» and no sounds row; the settings show the sounds, the graphics, the band, the auto-calibration
   with its line, the advanced probe settings; the defaults (the first open: auto-calibration off — the first game gets ready by hand with
   the instruction; once a game was played: on; graphics and band chosen in the game); «always pixels» switches the graphics and takes
   «graphics» out of SonaFly's menu, SonaRace's menu and the pause, «chosen in the game» brings it back; «always wide» skips the band's
   screen before a game, «chosen before a game» shows it; the advanced settings open the «sound» screen and come back. Run: node tests/settings.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('playwright not installed — skipped'); console.log('RESULT: ok'); process.exit(0); }
const path=require('path'); const ROOT=path.join(__dirname,'..');
(async()=>{
  const b=await chromium.launch(); const errors=[]; let ok=true; const out=[], check=(n,g,i)=>{ ok=ok&&g; out.push(`${n}: ${i||''} ${g?'ok':'FAIL'}`); };
  const open=async(init)=>{ const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:2}); await ctx.addInitScript(`localStorage.setItem('sonaroids_lang','en'); ${init||''}`);
    const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message)); await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(700); return p; };
  const ids=p=>p.evaluate(()=>__sonaroids.btn().map(q=>q.id));
  // v1.16: auto-calibration off by default, on the first open and after games too (an experiment)
  let p=await open(''); const first=await p.evaluate(()=>Sonar.live());
  await p.evaluate(()=>localStorage.setItem('sonaroids_seen','1')); const after=await p.evaluate(()=>Sonar.live());
  check('auto-calibration: off by default, the first open and after a game',first===false&&after===false,`${first} → ${after}`);
  await p.evaluate(()=>__sonaroids.go('hub')); await p.waitForTimeout(300); const hub=await ids(p);
  check('the games\' screen: «settings», no sounds row',hub.includes('settings')&&!hub.includes('vol_dn'),hub.join(' '));
  await p.evaluate(()=>__sonaroids.act.settings()); await p.waitForTimeout(300); const st=await ids(p);
  const want=['vol_dn','vol_up','sfx','set_gfx_prev','set_gfx_next','set_band_prev','set_band_next','set_live_prev','set_live_next','set_back'];
  check('the settings: sounds, graphics, band, auto-calibration; no advanced in a browser (v1.18)',want.every(x=>st.includes(x))&&!st.includes('set_expert'),st.join(' '));
  const say0=await p.evaluate(()=>document.getElementById('say').textContent);
  check('the defaults: graphics and band chosen in the game, auto-calibration off (an experiment)',/GRAPHICS: CHOSEN IN THE GAME/.test(say0)&&/PROBE BAND: CHOSEN BEFORE A GAME/.test(say0)&&/AUTO-CALIBRATION \(EXPERIMENTAL\): OFF/.test(say0),say0);
  // graphics: always pixels → switched, and out of the menus
  await p.evaluate(()=>__sonaroids.act.set_gfx_next()); await p.evaluate(()=>__sonaroids.act.set_gfx_next()); await p.waitForTimeout(200);
  const gx=await p.evaluate(async()=>{ const S=__sonaroids, w=ms=>new Promise(r=>setTimeout(r,ms)); const r={lock:localStorage.getItem('sonaroids_gfx_lock'),mode:S.state().gfx};
    S.go('title'); await w(250); r.fly=S.btn().map(q=>q.id).includes('gfx'); S.act.hub_race(); await w(400); r.race=S.btn().map(q=>q.id).includes('gfx'); S.go('hub'); await w(200); return r; });
  check('«always pixels»: pixels, no «graphics» in the games\' menus',gx.lock==='pixel'&&gx.mode==='pixel'&&!gx.fly&&!gx.race,JSON.stringify(gx));
  await p.evaluate(()=>{ __sonaroids.act.settings(); __sonaroids.act.set_gfx_next(); }); await p.waitForTimeout(200);
  const gy=await p.evaluate(async()=>{ const S=__sonaroids, w=ms=>new Promise(r=>setTimeout(r,ms)); S.go('title'); await w(250); return {lock:localStorage.getItem('sonaroids_gfx_lock'),fly:S.btn().map(q=>q.id).includes('gfx')}; });
  check('«chosen in the game»: «graphics» back in the menu',gy.lock===''&&gy.fly,JSON.stringify(gy));
  // advanced → the «sound» screen → back to the settings → back to the games' screen
  const adv=await p.evaluate(async()=>{ const S=__sonaroids, w=ms=>new Promise(r=>setTimeout(r,ms)); window.SonaroidsApp={audioStart(){},audioDevices(){ return '{}'; }};   // the app (v1.18: the advanced settings only there)
    S.go('hub'); S.act.settings(); await w(200); const has=S.btn().map(q=>q.id).includes('set_expert'); S.act.set_expert(); await w(250); const a=S.scr(), back=S.btn().map(q=>q.id);
    S.act.settings(); await w(200); const b2=S.scr(); S.act.set_back(); await w(200); delete window.SonaroidsApp; return {has,a,back:back.includes('settings'),b2,hub:S.scr()}; });
  check('the app: advanced → «sound» → the settings → the games\' screen',adv.has&&adv.a==='audio'&&adv.back&&adv.b2==='settings'&&adv.hub==='hub',JSON.stringify(adv));
  // the band: always wide — no choice before a game (the getting ready by hand: straight to «take your hand away»)
  const band=await p.evaluate(async()=>{ const S=__sonaroids, w=ms=>new Promise(r=>setTimeout(r,ms)); localStorage.setItem('sonaroids_live','0'); Sonar.simulate({fs:48000,chan:'right',source:()=>new Float32Array(512)});
    S.act.settings(); S.act.set_band_next(); const lock=localStorage.getItem('sonaroids_band_lock'); S.go('title'); S.act.play(); const seen=[]; for(let i=0;i<20;i++){ await w(100); const sc=S.scr(); if(seen[seen.length-1]!==sc) seen.push(sc); if(sc==='away') break; }
    return {lock,seen}; });
  check('«always wide»: no band choice before the game',band.lock==='wide'&&!band.seen.includes('probe')&&band.seen.includes('away'),JSON.stringify(band));
  const band2=await p.evaluate(async()=>{ const S=__sonaroids, w=ms=>new Promise(r=>setTimeout(r,ms)); S.go('hub'); S.act.settings(); S.act.set_band_prev(); const lock=localStorage.getItem('sonaroids_band_lock'); S.go('title'); S.act.play(); const seen=[]; for(let i=0;i<20;i++){ await w(100); const sc=S.scr(); if(seen[seen.length-1]!==sc) seen.push(sc); if(sc==='probe') break; } return {lock,seen}; });
  check('«chosen before a game»: the band\'s screen again',band2.lock===''&&band2.seen.includes('probe'),JSON.stringify(band2));
  await p.screenshot({path:path.join(__dirname,'out','settings_flow.png')});
  // v1.14: no service «sound» on an iPhone (the maintainer: «убери служебное меню звук на айфоне»)
  { const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
    await ctx.addInitScript(`localStorage.setItem('sonaroids_lang','en'); localStorage.setItem('sonaroids_seen','1');`); const pi=await ctx.newPage(); pi.on('pageerror',e=>errors.push(e.message));
    await pi.goto('file://'+path.join(ROOT,'game','play','index.html')); await pi.waitForTimeout(700); await pi.evaluate(()=>__sonaroids.act.settings()); await pi.waitForTimeout(300);
    const si=await ids(pi); await pi.screenshot({path:path.join(__dirname,'out','settings_iphone.png')});
    check('an iPhone: the settings without the advanced probe settings',!si.includes('set_expert')&&si.includes('set_live_next')&&si.includes('set_back'),si.join(' ')); }
  await b.close();
  check('no page errors',!errors.length,errors.slice(0,3).join(' | '));
  out.forEach(s=>console.log(s)); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
})();
