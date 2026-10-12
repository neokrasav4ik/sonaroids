/* SonaLob's pictures for the readme (v1.63a): the game itself in headless Chromium with a synthetic palm (tests/sim_source.js) — the
   waving, the try-out, then a rally; a moment high in the arc in the light and the dark skin, and the game over with the best arcs again.
   Also the games' screen with its three cards (promo/games.png). Run from the repository:
   NODE_PATH=$(npm root -g) node promo/make_lob.js   (needs Playwright) → promo/games.png, sonalob_light.png, sonalob_dark.png, sonalob_over.png */
const {chromium}=require('playwright'), path=require('path'), fs=require('fs'), ROOT=path.join(__dirname,'..');
const SRC=fs.readFileSync(path.join(ROOT,'tests','sim_source.js'),'utf8');
/* the palm: waves for the calibration; in the game the menu's rally bot says where the rackets should be (the share of the travel),
   and the palm goes there — through the sonar, as a hand would */
const WAVE=`function(t){ if(t<8) return null; if(!window.__bot) return 110-40*Math.cos(2*Math.PI*(t-8)/1.6);
  var S=window.__sonaroids, f=S&&S.pongBot(), c=S&&S.pongCtl(); if(f===null||f===undefined||!c||!c.lin) return window.__lastH||110;
  var h=c.lin.b+(f-0.08)/0.67*(c.lin.t-c.lin.b); window.__lastH=h; return h; }`;
async function play(b,skin,lang){ const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:1.5,hasTouch:true});
  await ctx.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_live','0'); localStorage.setItem('sonaroids_lang','${lang}'); localStorage.setItem('sonaroids_hand','right'); localStorage.setItem('sonaroids_pong_skin','${skin}'); localStorage.setItem('sonaroids_pong_sens','2'); ${SRC}; window.makeSimSource=makeSimSource; window.__scen=${WAVE};`);
  const p=await ctx.newPage(); p.on('pageerror',e=>console.log('ERR',e.message));
  await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(600);
  await p.evaluate(()=>{ Sonar.simulate({fs:48000,chan:'right',source:makeSimSource(window.__scen)}); });
  const act=a=>p.evaluate(a=>__sonaroids.act[a](),a), S=()=>p.evaluate(()=>({scr:__sonaroids.scr(),c:__sonaroids.pongCtl()}));
  await act('hub_pong'); await p.waitForTimeout(800); await act('play'); const t0=Date.now();
  while(Date.now()-t0<40000){ await p.waitForTimeout(100); const s=await S(); if(s.scr==='probe') await act('probe_norm'); if(s.scr==='phold'&&s.c&&s.c.done){ await p.waitForTimeout(1500); break; } }
  await act('start'); await p.evaluate(()=>{ window.__bot=1; }); await p.waitForTimeout(4500);
  return {p,ctx}; }
/* wait for the shuttle high in its arc, a couple of cracks in the ceiling, a series going — then the picture */
async function highShot(p,file){ await p.evaluate(()=>{ const g=__sonaroids.state().g; g.crk=[0.55,1.62]; });
  const t0=Date.now(); while(Date.now()-t0<20000){ const ok=await p.evaluate(()=>{ const g=__sonaroids.state().g, b=g.ball; return !!b&&!(b.wait>0)&&b.vy<0&&b.vy>-0.35&&b.y<0.4; }); if(ok) break; await p.waitForTimeout(16); }
  await p.waitForTimeout(60); await p.screenshot({path:file}); }
(async()=>{ const b=await chromium.launch();
  { const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:1.5}); const p=await ctx.newPage();
    await p.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_lang','en');`);
    await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(1500); await p.screenshot({path:path.join(__dirname,'games.png')}); await ctx.close(); }
  { const {p,ctx}=await play(b,'0','en'); await p.waitForTimeout(8000); await highShot(p,path.join(__dirname,'sonalob_light.png'));
    await p.waitForTimeout(14000); await p.evaluate(()=>__sonaroids.act.pause()); await p.waitForTimeout(300); await p.evaluate(()=>__sonaroids.act.quit()); await p.waitForTimeout(2600);
    const c=await p.evaluate(()=>__sonaroids.pgClips()); console.log('the best arcs:',JSON.stringify(c&&c.clips)); await p.screenshot({path:path.join(__dirname,'sonalob_over.png')}); await ctx.close(); }
  { const {p,ctx}=await play(b,'1','en'); await p.waitForTimeout(8000); await highShot(p,path.join(__dirname,'sonalob_dark.png')); await ctx.close(); }
  await b.close(); })();
