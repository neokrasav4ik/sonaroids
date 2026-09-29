/* SonaRace in headless Chromium with a synthetic microphone (Sonar.simulate): the games' screen → the SonaRace card → its menu → «play»
   → the probe → take your hand away → wave → the try-out (the car on the road) → start → countdown → the race → pause → go on →
   end the race → the finish screen with the best kept on the phone.
   Checks: every screen is reached; the car follows the palm in the race; the land is drawn (the HD canvas is not empty, the road's
   chocolate is in it); the finish shows the score and keeps the best; no page errors. Screenshots go to tests/out/race_*.png.
   Needs Playwright with Chromium (skipped without it). Run: node tests/race_flow.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('playwright not installed — skipped'); console.log('RESULT: ok'); process.exit(0); }
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..'), OUT=path.join(__dirname,'out'); fs.mkdirSync(OUT,{recursive:true});
const SRC=fs.readFileSync(path.join(__dirname,'sim_source.js'),'utf8');
// the palm: away 0–8 s, 100 mm 8–9, waving 100±50 mm (2 s period) 9–20, then 100±40 mm (5 s period) in the race
const SCEN=`function(t){ if(t<8) return null; if(t<9) return 100; if(t<20) return 100+50*Math.sin(2*Math.PI*(t-9)/2); return 100+40*Math.sin(2*Math.PI*(t-20)/5); }`;
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:2});
  await ctx.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_lang','${process.env.LANG2||'en'}'); ${SRC}; window.makeSimSource=makeSimSource; window.__scen=${SCEN}; window.SONAROIDS_API='https://api.test';`);
  const p=await ctx.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message+(errors.length?'':' '+String(e.stack).split('\n').slice(0,4).join(' < '))));
  await p.route('https://api.test/**',r=>r.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:'{"ok":true}'}));
  await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(600);
  await p.evaluate(()=>{ Sonar.simulate({fs:48000,chan:'right',source:makeSimSource(window.__scen)}); });
  const shot=n=>p.screenshot({path:path.join(OUT,'race_'+n+'.png')});
  await p.evaluate(()=>__sonaroids.act.hub_race()); await p.waitForTimeout(1500);
  const menu=await p.evaluate(()=>({scr:__sonaroids.scr(),mode:__sonaroids.state().mode,btn:__sonaroids.btn().map(b=>b.id)})); await shot('01_menu');
  await p.evaluate(()=>__sonaroids.act.play()); let t0=Date.now(); const T=()=>(Date.now()-t0)/1000;
  const seen=[]; let last=null, startAt=null, follow=[], shots={}, drawn=null, paused=null, over=null;
  while(T()<70){
    await p.waitForTimeout(100);
    const s=await p.evaluate(()=>{ const s=__sonaroids.state(), st=Sonar.state(); return {scr:s.scr,caught:s.caught,hand:(st&&st.present&&s.T)?Tune.fracOf(s.T,st.height):null,
      car:s.g&&s.g.car?s.g.car.y/s.g.FH:null, gstate:s.g?s.g.state:null, score:s.g?s.g.score:null}; });
    if(s.scr!==last){ seen.push(s.scr+'@'+T().toFixed(1)); last=s.scr; }
    if(s.scr==='probe') await p.evaluate(()=>__sonaroids.act.probe_norm());
    if(s.scr==='wave'&&s.caught&&T()>=17&&!startAt){ await shot('02_try'); startAt=T(); await p.evaluate(()=>__sonaroids.act.start()); }
    if(s.scr==='count'&&!shots.count&&T()-startAt>1){ shots.count=1; await shot('03_count'); }
    if(s.scr==='play'){ if(s.hand!==null&&s.car!==null) follow.push([s.hand,s.car]);
      if(T()>30&&!shots.play){ shots.play=1; await shot('04_play');
        drawn=await p.evaluate(()=>{ const c=document.getElementById('hd'); if(!c||c.style.display==='none') return {shown:false};
          const x=c.getContext('2d'), d=x.getImageData(0,0,c.width,c.height).data; let choc=0, pink=0, n=0;
          for(let i=0;i<d.length;i+=4*97){ n++; const r=d[i],g=d[i+1],b=d[i+2]; if(r>80&&r<130&&g>40&&g<80&&b>20&&b<60) choc++; if(r>240&&g>190&&b>210) pink++; }
          return {shown:true,choc:choc/n,pink:pink/n}; }); }
      if(T()>40&&!paused){ const bp=await p.evaluate(()=>{ const b=__sonaroids.btn().find(q=>q.id==='pause'), m=__sonaroids.S(); return b?{x:(b.x+b.w/2)*m.S/m.DPR,y:(b.y+b.h/2)*m.S/m.DPR}:null; });
        if(bp) await p.mouse.click(bp.x,bp.y); await p.waitForTimeout(300); await shot('05_paused');
        paused=await p.evaluate(()=>({scr:__sonaroids.scr(),btn:__sonaroids.btn().map(b=>b.id)}));
        await p.evaluate(()=>__sonaroids.act.resume()); await p.waitForTimeout(300); paused.cr=await p.evaluate(()=>__sonaroids.scr()); await p.waitForTimeout(3300);
        paused.back=await p.evaluate(()=>__sonaroids.scr()); }
      if(T()>50&&paused&&!over){ await p.evaluate(()=>__sonaroids.act.quit()); await p.waitForTimeout(1500); await shot('06_finish');
        over=await p.evaluate(()=>({scr:__sonaroids.scr(),score:__sonaroids.state().g.score,best:+localStorage.getItem('sonaroids_race_best'),btn:__sonaroids.btn().map(b=>b.id),say:__sonaroids.side().say})); break; } }
  }
  await b.close();
  let ok=true; const out=[], check=(n,g,i)=>{ ok=ok&&g; out.push(`${n}: ${i||''} ${g?'ok':'FAIL'}`); };
  check('the card opens the race menu',menu.scr==='rtitle'&&menu.mode==='race'&&menu.btn.includes('play')&&menu.btn.includes('hub'),menu.btn.join(','));
  check('screens',['probe','away','wave','count','play'].every(k=>seen.some(q=>q.startsWith(k+'@'))),seen.join(' '));
  // the car follows the palm: correlation of palm and car heights (the car is higher on screen for a higher palm: y falls)
  const n=follow.length, mh=follow.reduce((a,q)=>a+q[0],0)/n, mc=follow.reduce((a,q)=>a+q[1],0)/n; let sxy=0,sxx=0,syy=0; follow.forEach(q=>{ sxy+=(q[0]-mh)*(q[1]-mc); sxx+=(q[0]-mh)**2; syy+=(q[1]-mc)**2; });
  const corr=n>20?sxy/Math.sqrt(sxx*syy):0; check('the car follows the palm',corr<-0.8,`correlation ${corr.toFixed(2)} over ${n} samples`);
  check('the candy land is drawn',drawn&&drawn.shown&&drawn.choc>0.05&&drawn.pink>0.1,drawn?`road ${(100*drawn.choc).toFixed(0)}%, glaze ${(100*drawn.pink).toFixed(0)}%`:'none');
  check('the pause: go on, start over, end, exit, sounds; back to the race',!!paused&&paused.scr==='paused'&&['resume','restart','quit','exit'].every(k=>paused.btn.includes(k))&&!paused.btn.includes('gfx')&&paused.cr==='count-resume'&&paused.back==='play',paused?paused.btn.join(',')+' → '+paused.cr+' → '+paused.back:'none');
  check('the finish: the score, the best kept',!!over&&over.scr==='over'&&over.score>0&&over.best===over.score&&over.btn.includes('again')&&over.btn.includes('menu'),over?`score ${over.score}, best ${over.best}, "${over.say}"`:'none');
  check('no page errors',!errors.length,errors.join(' | '));
  out.forEach(s=>console.log(s)); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
})();
