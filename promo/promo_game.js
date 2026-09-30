/* The promo GIF's phone screen (v1.03): the real game in headless Chromium, stepped frame by frame, the palm height given from outside.
   Used by make_promo.js; alone: NODE_PATH=$(npm root -g) node promo/promo_game.js  → promo/frames_game/<game>_NNNN.png (a quick look) */
const {chromium}=require('playwright'), fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
/* the game, patched in memory: the loop stepped by us, the palm set by us, the HD canvas kept at full size */
function patched(){ let html=fs.readFileSync(path.join(ROOT,'game','play','index.html'),'utf8');
  const patch=(a,b)=>{ if(!html.includes(a)) throw new Error('anchor not found: '+a.slice(0,50)); html=html.replace(a,b); };
  patch('function handFrac(){','function handFrac(){ if(window.__palm!==undefined) return window.__palm; ');
  patch('function loop(now){\n  requestAnimationFrame(loop);','function loop(now){\n  requestAnimationFrame(loop); if(window.__gifMode&&!window.__gifCall) return;');
  patch('function safeInsets(){','function safeInsets(){ if(window.__safe) return window.__safe; ');   // an iPhone in landscape: the island's side and the other kept clear
  patch('function hdPace(){','function hdPace(){ if(window.__gifMode) return; ');
  patch('window.__sonaroids={','window.__gifTick=function(now){ window.__gifCall=true; try{ loop(now); } finally { window.__gifCall=false; } };\nwindow.__sonaroids={');
  const tmp=path.join(ROOT,'game','play','__promo.html'); fs.writeFileSync(tmp,html); return tmp; }
/* one game on the phone's screen. spec: {fly:'space'|'neon'|… , race:'candy'|'note', gfx:'hd'|'pixel'}; palm(t) → 0…1 (0 — the palm close, the ship low);
   warm — seconds played before the first frame; n frames at fps; shot(i,buf) gets each frame */
async function play(ctx,file,spec,palm,warm,n,fps,shot){
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_lang','en'); localStorage.setItem('sonaroids_gfx','${spec.gfx||'hd'}');`+
    (spec.fly?`localStorage.setItem('sonaroids_skin','${spec.fly}');`:`localStorage.setItem('sonaroids_race_skin','${spec.race}');`)+`window.__gifMode=true; window.__safe={t:0,r:47,b:21,l:47};`);
  await p.goto('file://'+file); await p.waitForTimeout(300);
  let now=1000; const step=async(dt,h)=>{ now+=dt*1000; await p.evaluate(([t,h])=>{ window.__palm=h; window.__gifTick(t); },[now,h]); };
  await step(0.05,0.5);
  await p.evaluate(race=>{ const S=__sonaroids; S.fake(); if(race){ S.act.hub_race(); S.race(); } else S.act.hub_rocks(); S.go('count'); },!spec.fly);
  const sub=3, dt=1/fps/sub;                                    // the game stepped a few times per frame (its DT stays small)
  for(let t=-warm-3.2;t<0;t+=dt) await step(dt,palm(t));       // the countdown and the warm-up, not recorded
  await p.evaluate(()=>{ const g=__sonaroids.state().g; if(g&&g.lives!==undefined) g.lives=9; if(g&&g.fuel!==undefined) g.fuel=Race.TUNE.FUEL; });   // a hit or an empty tank costs nothing in the picture
  for(let i=0;i<n;i++){ for(let k=0;k<sub;k++) await step(dt,palm(i/fps+k*dt)); await shot(i,await p.screenshot()); }
  const st=await p.evaluate(()=>__sonaroids.scr()); await p.close(); if(errs.length) console.log('page errors:',errs.join('; ')); return st; }
module.exports={patched,play};
if(require.main===module)(async()=>{ const b=await chromium.launch(), ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:2});
  const file=patched(), OUT=path.join(__dirname,'frames_game'); fs.mkdirSync(OUT,{recursive:true});
  const palm=t=>0.5+0.4*Math.sin(2*Math.PI*t/3);
  for(const [name,spec] of [['space',{fly:'space'}],['note',{race:'note'}],['neon',{fly:'neon'}],['candy',{race:'candy'}]]){
    const st=await play(ctx,file,spec,palm,2,+(process.env.N||1),20,(i,buf)=>fs.writeFileSync(path.join(OUT,name+'_'+String(i).padStart(4,'0')+'.png'),buf)); console.log(name,st); }
  await b.close(); fs.unlinkSync(file); })();
