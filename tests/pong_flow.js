/* SonaPong in headless Chromium with a synthetic microphone (Sonar.simulate): the games' screen → the SonaPong card → its menu → «play»
   → the probe → take your hand away → the two holds (low, then top) → the try-out → start → countdown → the game → pause → go on →
   end the game → the game over with the best kept on the phone.
   Checks: every screen is reached; the holds catch the palm where it was held and learn the mix's offset; in the game the rackets follow
   the palm in proportion (the palm's share of the calibrated travel ↔ the rackets' place); the game over keeps the best; no page errors.
   Screenshots go to tests/out/pong_*.png. Needs Playwright with Chromium (skipped without it). Run: node tests/pong_flow.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('playwright not installed — skipped'); console.log('RESULT: ok'); process.exit(0); }
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..'), OUT=path.join(__dirname,'out'); fs.mkdirSync(OUT,{recursive:true});
const SRC=fs.readFileSync(path.join(__dirname,'sim_source.js'),'utf8');
// the palm: away 0–8 s, then the holds — 70 mm, up to 150 mm, held — then swings 70↔150 mm (a 1.6 s period) in the game
const SCEN=`function(t){ if(t<8) return null; if(t<12) return 70; if(t<13) return 70+80*(t-12); if(t<17) return 150; return 110-40*Math.cos(2*Math.PI*(t-17)/1.6); }`;
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:2});
  await ctx.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_live','0'); localStorage.setItem('sonaroids_lang','${process.env.LANG2||'ru'}'); ${SRC}; window.makeSimSource=makeSimSource; window.__scen=${SCEN};`);
  const p=await ctx.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message+(errors.length?'':' '+String(e.stack).split('\n').slice(0,4).join(' < '))));
  await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(600);
  await p.evaluate(()=>{ Sonar.simulate({fs:48000,chan:'right',source:makeSimSource(window.__scen)}); });
  const shot=n=>p.screenshot({path:path.join(OUT,'pong_'+n+'.png')});
  await p.evaluate(()=>__sonaroids.act.hub_pong()); await p.waitForTimeout(1200);
  const menu=await p.evaluate(()=>({scr:__sonaroids.scr(),mode:__sonaroids.state().mode,btn:__sonaroids.btn().map(b=>b.id)})); await shot('01_menu');
  await p.evaluate(()=>__sonaroids.act.play()); const t0=Date.now(), T=()=>(Date.now()-t0)/1000;
  const seen=[]; let last=null, hold=null, hLow=[], hTop=[], startAt=null, follow=[], paused=null, over=null, shots={};
  while(T()<75){
    await p.waitForTimeout(100);
    const s=await p.evaluate(()=>{ const s=__sonaroids.state(), c=__sonaroids.pongCtl(); return {scr:s.scr,c:c,py:s.g&&s.g.ball!==undefined?s.g.py:null,H:s.g&&s.g.H,gs:s.g&&s.g.state,score:s.g&&s.g.score}; });
    if(s.scr!==last){ seen.push(s.scr+'@'+T().toFixed(1)); last=s.scr; }
    if(s.scr==='probe') await p.evaluate(()=>__sonaroids.act.probe_norm());
    if(s.scr==='phold'&&s.c&&s.c.present&&s.c.height!==null&&s.c.holding){ (s.c.low?hLow:hTop).push(s.c.height); }   // the sonar's own reading of the held palm, at each hold
    if(s.scr==='phold'&&s.c&&s.c.low&&!shots.hold){ shots.hold=1; await p.waitForTimeout(400); await shot('02_hold'); }
    if(s.scr==='phold'&&s.c&&s.c.done&&!startAt){ hold=s.c; await shot('03_try'); startAt=T(); await p.evaluate(()=>__sonaroids.act.start()); }
    if(s.scr==='play'&&s.py!==null&&s.c&&s.c.frac!==null) follow.push([s.c.frac,s.py,s.H]);
    if(s.scr==='play'&&T()-startAt>14&&!shots.play){ shots.play=1; await shot('04_play'); }
    if(s.scr==='play'&&!shots.field){ shots.field=await p.evaluate(()=>Object.assign(__sonaroids.pongField(),{gar:__sonaroids.state().g.ar})); }
    if(s.scr==='play'&&T()-startAt>8&&!shots.steps){ shots.steps=await p.evaluate(()=>new Promise(r=>{ const d=[]; let last=null, k=0; (function f(){ const n=__sonaroids.state().g.n; if(last!==null) d.push(n-last); last=n; if(++k<120) requestAnimationFrame(f); else r(d); })(); })); }
    if(s.scr==='play'&&T()-startAt>20&&!paused){ const bp=await p.evaluate(()=>{ const b=__sonaroids.btn().find(q=>q.id==='pause'), m=__sonaroids.S(); return b?{x:(b.x+b.w/2)*m.S/m.DPR,y:(b.y+b.h/2)*m.S/m.DPR}:null; });
      if(bp) await p.mouse.click(bp.x,bp.y); await p.waitForTimeout(300); await shot('05_paused');
      paused=await p.evaluate(()=>({scr:__sonaroids.scr(),btn:__sonaroids.btn().map(b=>b.id)}));
      await p.evaluate(()=>__sonaroids.act.resume()); await p.waitForTimeout(300); paused.cr=await p.evaluate(()=>__sonaroids.scr()); await p.waitForTimeout(3300); paused.back=await p.evaluate(()=>__sonaroids.scr()); }
    if(paused&&T()-startAt>30&&!over){ if(s.scr==='play') await p.evaluate(()=>__sonaroids.act.quit()); await p.waitForTimeout(1500); await shot('06_over');
      seen.push('over@'+T().toFixed(1)); over=await p.evaluate(()=>({scr:__sonaroids.scr(),score:__sonaroids.state().g.score,best:+localStorage.getItem('sonaroids_pong_best'),btn:__sonaroids.btn().map(b=>b.id)})); break; }
  }
  await b.close();
  let ok=true; const out=[], check=(n,g,i)=>{ ok=ok&&g; out.push(`${n}: ${i||''} ${g?'ok':'FAIL'}`); };
  check('the SonaPong card opens its menu',menu.scr==='ptitle'&&menu.mode==='pong'&&['play','howto','pg_sens','hub'].every(id=>menu.btn.includes(id)),menu.scr);
  const order=['probe','away','phold','count','play','over'], sq=seen.map(x=>x.split('@')[0]);
  check('the screens in order',order.every((s,i)=>sq.indexOf(s)>=0&&(i===0||sq.indexOf(s)>sq.indexOf(order[i-1]))),seen.join(' → '));
  const md=a=>{ const q=a.slice(-8).sort((x,y)=>x-y); return q.length?q[q.length>>1]:null; }, rl=md(hLow), rt=md(hTop);   // the last readings before each was caught
  check('the holds catch the palm where it was held',!!hold&&!!hold.lin&&rl!==null&&rt!==null&&Math.abs(hold.lin.b-rl)<8&&Math.abs(hold.lin.t-rt)<8&&hold.lin.t-hold.lin.b>35,hold&&hold.lin?`low ${hold.lin.b.toFixed(0)} mm, top ${hold.lin.t.toFixed(0)} mm; the sonar read the held palm at ${rl&&rl.toFixed(0)} and ${rt&&rt.toFixed(0)} mm`:'not caught');
  check('the mix\'s offset learnt on the holds',!!hold&&hold.mxCal!==null&&Math.abs(hold.mxCal)<40,hold?`${hold.mxCal===null?'—':hold.mxCal.toFixed(1)} mm`:'');
  const fit=follow.length>50?(()=>{ let e=0; follow.forEach(([f,py,H])=>{ const want=Math.max(0.3,Math.min(0.97,0.94-Math.round(f*4000)/4000*H)); e=Math.max(e,Math.abs(want-py)); }); const lo=Math.min(...follow.map(q=>q[1])), hi=Math.max(...follow.map(q=>q[1])); return {e,lo,hi}; })():null;
  check('the rackets follow the palm in proportion',!!fit&&fit.e<0.05&&fit.hi-fit.lo>0.15,fit?`the largest difference ${fit.e.toFixed(3)} of the screen (the palm read a frame apart); the rackets went ${fit.lo.toFixed(2)}…${fit.hi.toFixed(2)}`:'no game');
  { const d=shots.steps||[], one=d.filter(x=>x===1).length;
    check('one rules step a frame (the ball moves evenly)',d.length>100&&one>=d.length*0.95,`${one} of ${d.length} frames; others: ${d.filter(x=>x!==1).join(' ')||'—'}`); }
  { const f=shots.field; check('the field is the lab\'s shape (2.16 screen heights) across the whole screen, not the safe area',!!f&&f.gar===2.16&&f.ar===2.16&&Math.abs(f.x0)<=2&&Math.abs(f.x1-f.LW)<=2&&Math.abs(f.y1-f.y0-f.LH)<=1,f?`ar ${f.gar}; the field ${f.x0.toFixed(1)}…${f.x1.toFixed(1)} of ${f.LW} px`:'no game'); }
  check('pause: resume, hold again, start over, end, menu; then the countdown and the game',!!paused&&paused.scr==='paused'&&['resume','pg_recal','restart','quit','exit'].every(id=>paused.btn.includes(id))&&paused.cr==='count-resume'&&paused.back==='play',paused?`${paused.scr} → ${paused.cr} → ${paused.back}`:'');
  check('the game over keeps the best',!!over&&over.scr==='over'&&over.best===over.score&&['again','over_cal','menu'].every(id=>over.btn.includes(id)),over?`score ${over.score}, best kept ${over.best}`:'');
  check('no page errors',errors.length===0,errors.slice(0,2).join(' | '));
  out.forEach(x=>console.log(x)); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
})();
