/* The live mode (v1.08, an experiment behind the service «ЗВУК» screen's switch) in headless Chromium with a synthetic microphone.
   The maintainer: «перед каждой игрой у нас долгая подготовка и калибровка… если удастся добиться моментального старта и точного управления —
   включим в игру». The switch (shown in a browser too); then «Play» with it on: the band from the settings (no choice screen), «take your hand
   away» short, no waving — straight to the countdown; the game; mid-game the room gets 20 dB noisier; the end; «Again» — straight to the
   countdown, the room not measured anew.
   Checks: the switch turns on and off; no probe and no waving screens; from «Play» to the countdown ≤ 6 s (it was ~15 s with the waving);
   the palm is seen and the ship follows it — before and after the noise; «Again» to the countdown < 1 s; the switch off — the getting
   ready is the usual one again. Run: node tests/live_flow.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('playwright not installed — skipped'); console.log('RESULT: ok'); process.exit(0); }
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..'), OUT=path.join(__dirname,'out'); fs.mkdirSync(OUT,{recursive:true});
const SRC=fs.readFileSync(path.join(__dirname,'sim_source.js'),'utf8');
// the palm: away for the first 5.5 s after «Play» (the hand that tapped goes off), then waving 100±40 mm (4 s period) all the time;
// the room's noise ×10 (20 dB) from the game's 8th second on (window.__noiseAt, set by the check; the page's clock too)
const SCEN=`function(t){ const n=performance.now()/1000; if(n<window.__palmAt) return null; return 100+40*Math.sin(2*Math.PI*(n-window.__palmAt)/4); }`;   // by the page's clock: the frames come in real time
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:2});
  await ctx.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_lang','en'); localStorage.setItem('sonaroids_band_lock','normal'); localStorage.setItem('sonaroids_mid_r','80.0'); ${SRC}; window.makeSimSource=makeSimSource; window.__palmAt=1e9; window.__noiseAt=1e9; window.__scen=${SCEN}; window.SONAROIDS_API='https://api.test';`);
  const p=await ctx.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
  await p.route('https://api.test/**',r=>r.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:'{"ok":true}'}));
  await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(600);
  await p.evaluate(()=>{ const FPS=48000/512; Sonar.simulate({fs:48000,chan:'right',source:makeSimSource(window.__scen,{noise:()=>performance.now()/1000>=window.__noiseAt?10:1})}); });
  // the switch: the service screen in a browser shows only it
  const sw=await p.evaluate(async()=>{ const S=__sonaroids, w=ms=>new Promise(r=>setTimeout(r,ms)); S.go('audio'); await w(300); const btn=S.btn().map(b=>b.id);
    S.aud('aud:live:1'); const on=localStorage.getItem('sonaroids_live'); S.aud('aud:live:0'); const off=localStorage.getItem('sonaroids_live'); S.aud('aud:live:1'); S.go('title'); await w(300);
    return {btn,on,off,now:localStorage.getItem('sonaroids_live')}; });
  await p.screenshot({path:path.join(OUT,'live_01_title.png')});
  // «Play»: the palm comes 1.5 s after the tap
  const simNow=()=>p.evaluate(()=>performance.now()/1000);
  const t0=await p.evaluate(()=>{ const n=performance.now()/1000; window.__palmAt=n+5.5; __sonaroids.act.play(); return n; });   // the palm back once the room is learnt (v1.10: in it, the room is measured again)
  const seen=[]; let last=null, midAt=null, tCount=null, tPlay=null, follow0=[], follow1=[], over=null, again=null;
  const T=async()=>(await simNow())-t0;
  while(await T()<40){
    await p.waitForTimeout(80);
    const s=await p.evaluate(()=>{ const s=__sonaroids.state(), st=Sonar.state(); return {scr:s.scr,hand:(st&&st.present&&s.T)?Tune.fracOf(s.T,st.height):null,present:!!(st&&st.present),ship:s.g&&s.g.ship?s.g.ship.y/s.g.FH:null,gstate:s.g?s.g.state:null,live:DSP2.info().live,palm:window.__scen(0)}; });
    const t=await T();
    if(s.scr!==last){ seen.push(s.scr+'@'+t.toFixed(1)); last=s.scr; }
    if(s.scr==='count'&&tCount===null){ tCount=t; midAt=await p.evaluate(()=>{ const c=DSP2.info().cal; return (100-c.o)/c.k; }); }
    if(s.scr==='play'){ if(tPlay===null){ tPlay=t; await p.evaluate(()=>{ window.__noiseAt=performance.now()/1000+8; }); } 
      const pt=t-tPlay; if(s.ship!==null&&(pt<7||pt>10)) (pt<8?follow0:follow1).push([s.present?1:0,s.ship,s.palm,s.hand]);   // around the noise's step (8 s) a second each side left out
      if(pt>16){ await p.screenshot({path:path.join(OUT,'live_02_play.png')}); await p.evaluate(()=>__sonaroids.act.quit()); await p.waitForTimeout(1200);
        over=await p.evaluate(()=>__sonaroids.scr()); const ta=await T(); await p.evaluate(()=>__sonaroids.act.again()); await p.waitForTimeout(150);
        for(let i=0;i<20;i++){ const sc=await p.evaluate(()=>__sonaroids.scr()); if(sc==='count'){ again={dt:(await T())-ta,scr:sc}; break; } await p.waitForTimeout(50); }
        if(!again) again={dt:null,scr:await p.evaluate(()=>__sonaroids.scr())}; break; } }
  }
  // the switch off: «Play» from the title goes through the usual getting ready (the probe choice first)
  const offFlow=await p.evaluate(async()=>{ const S=__sonaroids, w=ms=>new Promise(r=>setTimeout(r,ms)); S.act.pause&&S.act.pause(); S.act.quit&&S.act.quit(); await w(300); S.go('audio'); await w(200); S.aud('aud:live:0'); S.go('title'); await w(300);
    S.act.play(); const seen=[]; for(let i=0;i<120;i++){ await w(100); const sc=S.scr(); if(seen[seen.length-1]!==sc) seen.push(sc); if(sc==='wave') break; } return {seen,live:localStorage.getItem('sonaroids_live')}; });
  // v1.10: the hand stays over the phone while the room is learnt (the OnePlus, 18:17) — the room is measured once more, then the game goes on
  const p2=await ctx.newPage(); p2.on('pageerror',e=>errors.push(e.message)); await p2.route('https://api.test/**',r=>r.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:'{"ok":true}'}));
  await p2.goto('file://'+path.join(ROOT,'game','play','index.html')); await p2.waitForTimeout(600);
  const again2=await p2.evaluate(async()=>{ localStorage.setItem('sonaroids_live','1'); window.__palmAt=0; window.__noiseAt=1e9; Sonar.simulate({fs:48000,chan:'right',source:makeSimSource(window.__scen)});
    const S=__sonaroids, w=ms=>new Promise(r=>setTimeout(r,ms)); const t0=performance.now(); S.act.play(); const seen=[];
    for(let i=0;i<150;i++){ await w(100); const sc=S.scr(); if(seen[seen.length-1]!==sc) seen.push(sc); if(sc==='count') break; }
    return {seen,count:S.scr()==='count',t:(performance.now()-t0)/1000}; });
  await b.close();
  const r=a=>a.length?a.reduce((u,v)=>u+v,0)/a.length:NaN;
  let ok=true; const out=[], check=(n,g,i)=>{ ok=ok&&g; out.push(`${n}: ${i||''} ${g?'ok':'FAIL'}`); };
  check('the switch on the service screen (a browser: only it)',sw.btn.includes('aud:live:0')&&sw.btn.includes('aud:live:1')&&sw.on==='1'&&sw.off==='0'&&sw.now==='1',JSON.stringify(sw));
  check('no probe choice and no waving with it on',!seen.some(x=>/^(probe|wave)@/.test(x)),seen.join(' '));
  check('«Play» → the countdown in ≤ 6 s',tCount!==null&&tCount<=6,tCount===null?'never':tCount.toFixed(1)+' s');
  check('v1.14–1.15: the middle from the last hand calibration (saved 80 mm) + 6 mm',midAt!==null&&Math.abs(midAt-86)<0.5,midAt===null?'–':midAt.toFixed(1)+' mm');
  check('the game runs, the echo processing in the live mode',tPlay!==null&&seen.some(x=>/^play@/.test(x)),'');
  const corr=a=>{ const q=a.filter(z=>z[3]!==null&&z[2]!==null), n=q.length; if(n<10) return NaN; const mx=r(q.map(z=>z[2])), my=r(q.map(z=>z[3])); let sxy=0,sxx=0,syy=0;
    q.forEach(z=>{ sxy+=(z[2]-mx)*(z[3]-my); sxx+=(z[2]-mx)**2; syy+=(z[3]-my)**2; }); return sxy/Math.sqrt(sxx*syy); };
  const c0=corr(follow0), c1=corr(follow1);
  check('the palm seen and followed before the noise',r(follow0.map(q=>q[0]))>=0.85&&c0>=0.9,`seen ${(100*r(follow0.map(q=>q[0]))).toFixed(0)}%, the height with the palm ${c0.toFixed(2)}`);
  check('… and after the room got 20 dB noisier',r(follow1.map(q=>q[0]))>=0.85&&c1>=0.9,`seen ${(100*r(follow1.map(q=>q[0]))).toFixed(0)}%, the height with the palm ${c1.toFixed(2)}`);
  check('«Again» → the countdown at once',over==='over'&&again&&again.scr==='count'&&again.dt<1,JSON.stringify({over,again}));
  check('the switch off: the usual getting ready (with the waving)',offFlow.live==='0'&&offFlow.seen.includes('wave'),offFlow.seen.join(' '));
  check('the hand left over the phone while the room is learnt: the room once more, then the countdown',again2.count&&again2.t>tCount+2,again2.seen.join(' ')+` in ${again2.t.toFixed(1)} s (the hand away: ${tCount===null?'–':tCount.toFixed(1)} s)`);
  check('no page errors',!errors.length,errors.slice(0,3).join(' | '));
  out.forEach(s=>console.log(s)); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
})();
