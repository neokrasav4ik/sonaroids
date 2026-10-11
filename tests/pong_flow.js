/* SonaPong in headless Chromium with a synthetic microphone (Sonar.simulate): the games' screen → the SonaPong card → its menu → «play»
   → the probe → take your hand away → the waving (v1.61f; the two holds before) → the try-out → start → countdown → the game → pause → go on →
   end the game → the game over with the best kept on the phone.
   Checks: every screen is reached; the waving catches the swing (the travel 75 mm, the mix's offset 0); in the game the rackets follow
   the palm in proportion (the palm's share of the calibrated travel ↔ the rackets' place); the game over keeps the best; no page errors.
   Screenshots go to tests/out/pong_*.png. Needs Playwright with Chromium (skipped without it). Run: node tests/pong_flow.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('playwright not installed — skipped'); console.log('RESULT: ok'); process.exit(0); }
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..'), OUT=path.join(__dirname,'out'); fs.mkdirSync(OUT,{recursive:true});
const SRC=fs.readFileSync(path.join(__dirname,'sim_source.js'),'utf8');
// the palm: away 0–8 s, then swings 70↔150 mm (a 1.6 s period) — the waving, then the game
const SCEN=`function(t){ if(t<8) return null; return 110-40*Math.cos(2*Math.PI*(t-8)/1.6); }`;
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,hasTouch:true});   // 1.61n: a phone (touch) — SonaLob at most twice the game's pixels, as on a phone; a computer draws it at full resolution
  await ctx.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_live','0'); localStorage.setItem('sonaroids_lang','${process.env.LANG2||'ru'}'); ${SRC}; window.makeSimSource=makeSimSource; window.__scen=${SCEN};`);
  const p=await ctx.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message+(errors.length?'':' '+String(e.stack).split('\n').slice(0,4).join(' < '))));
  await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(600);
  await p.evaluate(()=>{ Sonar.simulate({fs:48000,chan:'right',source:makeSimSource(window.__scen)}); });
  const shot=n=>p.screenshot({path:path.join(OUT,'pong_'+n+'.png')});
  await p.evaluate(()=>__sonaroids.act.hub_pong()); await p.waitForTimeout(1200);
  const menu=await p.evaluate(()=>({scr:__sonaroids.scr(),mode:__sonaroids.state().mode,btn:__sonaroids.btn().map(b=>b.id)})); await shot('01_menu');
  /* 1.61v: «ИНСТРУКЦИЯ» in SonaLob — the four rules screens, «next»/«back», then the getting ready (the volume screen) */
  const how=await p.evaluate(async()=>{ const S=__sonaroids, out=[]; S.act.howto(); await new Promise(r=>setTimeout(r,300)); out.push(S.scr()+':'+S.btn().map(b=>b.id).filter(i=>i.startsWith('ph_')).join('+'));
    S.act.ph_next(); S.act.ph_next(); S.act.ph_back(); await new Promise(r=>setTimeout(r,200)); out.push(S.scr()+':'+S.btn().map(b=>b.id).filter(i=>i.startsWith('ph_')).join('+'));
    S.act.ph_next(); S.act.ph_next(); S.act.ph_next(); await new Promise(r=>setTimeout(r,200)); out.push(S.scr()); S.act.hub_pong(); await new Promise(r=>setTimeout(r,300)); out.push(S.scr()); return out; });
  await p.evaluate(()=>__sonaroids.act.play()); const t0=Date.now(), T=()=>(Date.now()-t0)/1000;
  const seen=[]; let last=null, hold=null, hLow=[], hTop=[], startAt=null, follow=[], paused=null, over=null, shots={};
  while(T()<75){
    await p.waitForTimeout(100);
    const s=await p.evaluate(()=>{ const s=__sonaroids.state(), c=__sonaroids.pongCtl(); return {scr:s.scr,c:c,py:s.g&&s.g.ball!==undefined?s.g.py:null,H:s.g&&s.g.H,gs:s.g&&s.g.state,score:s.g&&s.g.score}; });
    if(s.scr!==last){ seen.push(s.scr+'@'+T().toFixed(1)); last=s.scr; }
    if(s.scr==='probe') await p.evaluate(()=>__sonaroids.act.probe_norm());
    if(s.scr==='phold'&&s.c&&s.c.wk>=2&&!s.c.done&&!shots.hold){ shots.hold=1; await shot('02_wave'); }
    if(s.scr==='phold'&&s.c&&s.c.done&&!startAt){ hold=s.c; await p.waitForTimeout(1300); await shot('03_try'); hold.btn=await p.evaluate(()=>__sonaroids.btn().map(b=>b.id)); startAt=T(); await p.evaluate(()=>{ window.__lob={}; const o=Sfx.lob; Sfx.lob=function(k){ window.__lob[k]=(window.__lob[k]||0)+1; return o.apply(this,arguments); }; __sonaroids.act.start(); }); await p.waitForTimeout(200); hold.kept=await p.evaluate(()=>({q:JSON.parse(localStorage.getItem('sonaroids_pong_cal_normal')||'null'),cal:DSP2.info().cal})); }
    if(s.scr==='play'&&s.py!==null&&s.c&&s.c.frac!==null) follow.push([s.c.frac,s.py,s.H]);
    if(s.scr==='play'&&!shots.serve){ shots.serve=1; await p.waitForTimeout(500); await shot('04a_serve'); }
    if(s.scr==='play'&&T()-startAt>14&&!shots.play){ shots.play=1; await shot('04_play'); }
    if(s.scr==='play'&&!shots.field){ shots.field=await p.evaluate(()=>Object.assign(__sonaroids.pongField(),{gar:__sonaroids.state().g.ar})); }
    if(s.scr==='play'&&T()-startAt>8&&!shots.steps){ shots.steps=await p.evaluate(()=>new Promise(r=>{ const d=[]; let last=null, k=0; (function f(){ const n=__sonaroids.state().g.n; if(last!==null) d.push(n-last); last=n; if(++k<120) requestAnimationFrame(f); else r(d); })(); })); }
    if(s.scr==='play'&&T()-startAt>20&&!paused){ const bp=await p.evaluate(()=>{ const b=__sonaroids.btn().find(q=>q.id==='pause'), m=__sonaroids.S(); return b?{x:(b.x+b.w/2)*m.S/m.DPR,y:(b.y+b.h/2)*m.S/m.DPR}:null; });
      if(bp) await p.mouse.click(bp.x,bp.y); await p.waitForTimeout(300); await shot('05_paused');
      paused=await p.evaluate(()=>({scr:__sonaroids.scr(),btn:__sonaroids.btn().map(b=>b.id)}));
      /* 1.61l: «Подстроить ладонь» can be left — the corner's «back» returns to the pause with the calibration as it was */
      const lin0=await p.evaluate(()=>JSON.stringify(__sonaroids.pongCtl().lin)); await p.evaluate(()=>__sonaroids.act.pg_recal()); await p.waitForTimeout(400);
      paused.recal=await p.evaluate(()=>({scr:__sonaroids.scr(),btn:__sonaroids.btn().map(b=>b.id),lin:__sonaroids.pongCtl().lin})); await p.evaluate(()=>__sonaroids.act.pg_back()); await p.waitForTimeout(200);
      paused.back0=await p.evaluate(lin0=>({scr:__sonaroids.scr(),same:JSON.stringify(__sonaroids.pongCtl().lin)===lin0}),lin0);
      await p.evaluate(()=>__sonaroids.act.resume()); await p.waitForTimeout(300); paused.cr=await p.evaluate(()=>__sonaroids.scr()); await p.waitForTimeout(3300); paused.back=await p.evaluate(()=>__sonaroids.scr()); }
    if(paused&&T()-startAt>30&&!over){ if(s.scr==='play') await p.evaluate(()=>__sonaroids.act.quit()); await p.waitForTimeout(1500); await shot('06_over');
      seen.push('over@'+T().toFixed(1)); over=await p.evaluate(()=>({scr:__sonaroids.scr(),score:__sonaroids.state().g.score,best:+localStorage.getItem('sonaroids_pong_best'),btn:__sonaroids.btn().map(b=>b.id)}));
      /* 1.61p: the game's log replays to the same game — the palm as logged (4 digits, −9 for none) through the rules alone */
      over.lob=await p.evaluate(()=>window.__lob);
      over.rep=await p.evaluate(async()=>{ const g=__sonaroids.state().g, bl=Logs.gameBlob(), u8=new Uint8Array(await bl.arrayBuffer()); let i=12; const rd=(o)=>u8[o]|(u8[o+1]<<8)|(u8[o+2]<<16)|(u8[o+3]<<24); let glog=null, meta=null;
        while(i+8<=u8.length){ const id=String.fromCharCode(u8[i],u8[i+1],u8[i+2],u8[i+3]), n=rd(i+4); if(id==='glog') glog=JSON.parse(new TextDecoder().decode(u8.slice(i+8,i+8+n))); if(id==='LIST') meta=JSON.parse(new TextDecoder().decode(u8.slice(i+8+12,i+8+n)).trim()); i+=8+n+(n%2); }
        const G0=meta.game, hands=glog.render.map(r=>r[2]), marks=glog.events.filter(e=>e[1]==='resume'||e[1]==='sens').map(e=>e[1]==='resume'?[e[2],'resume']:[e[2][0],'sens',e[2][1]]);
        const r=Pong.replay(G0.seed,G0.ar,G0.sens,hands,G0.span,marks), r0=Pong.replay(G0.seed,G0.ar,G0.sens,hands,G0.span);
        return {rows:hands.length,steps:g.n,score:r.score,want:g.score,none:hands.filter(h=>h===-9).length,marks:marks.length,noMarks:r0.score,core:meta.game.core}; });
      break; }
  }
  await b.close();
  let ok=true; const out=[], check=(n,g,i)=>{ ok=ok&&g; out.push(`${n}: ${i||''} ${g?'ok':'FAIL'}`); };
  check('SonaLob\'s «ИНСТРУКЦИЯ»: the four rules screens, then the getting ready (1.61v)',how[0]==='phowto:ph_next'&&how[1]==='phowto:ph_back+ph_next'&&how[2]==='sound'&&how[3]==='ptitle',how.join(' → '));
  check('the SonaPong card opens its menu',menu.scr==='ptitle'&&menu.mode==='pong'&&['play','howto','pg_sens','hub'].every(id=>menu.btn.includes(id)),menu.scr);
  const order=['probe','away','phold','count','play','over'], sq=seen.map(x=>x.split('@')[0]);
  check('the screens in order',order.every((s,i)=>sq.indexOf(s)>=0&&(i===0||sq.indexOf(s)>sq.indexOf(order[i-1]))),seen.join(' → '));
  check('the waving catches the swing: the travel 75 mm, the mix\'s offset 0; then the try-out: play, recalibrate, the sensitivity',!!hold&&!!hold.lin&&Math.abs(hold.lin.t-hold.lin.b-75)<1e-9&&hold.mxCal===0&&['start','pg_rehold','pg_sens'].every(id=>(hold.btn||[]).includes(id)),hold&&hold.lin?`low ${hold.lin.b.toFixed(0)} mm, top ${hold.lin.t.toFixed(0)} mm; ${(hold.btn||[]).join(' ')}`:'not caught');
  check('the waving the game started with is kept for the auto-calibration (1.61g): the low as the echo\'s range',!!hold&&!!hold.kept&&!!hold.kept.q&&Math.abs(hold.kept.q.r-(hold.lin.b-hold.kept.cal.o)/hold.kept.cal.k)<0.06,hold&&hold.kept&&hold.kept.q?`${hold.kept.q.r} mm`:'nothing kept');
  const fit=follow.length>50?(()=>{ const es=follow.map(([f,py,H])=>Math.abs(Math.max(0.3,Math.min(0.97,0.94-Math.round(f*4000)/4000*H))-py)).sort((a,b)=>a-b), e=es[Math.floor(es.length*0.98)];   /* 1.61i: the 98th of the differences — the palm and the rackets are read a frame apart, and one stalled frame of the headless browser (seen once in 1.61i's run: 0.119, the next runs 0.010–0.012) is not the control */ const lo=Math.min(...follow.map(q=>q[1])), hi=Math.max(...follow.map(q=>q[1])); return {e,lo,hi}; })():null;
  check('the rackets follow the palm in proportion',!!fit&&fit.e<0.05&&fit.hi-fit.lo>0.15,fit?`the difference (98% of the frames within) ${fit.e.toFixed(3)} of the screen (the palm read a frame apart); the rackets went ${fit.lo.toFixed(2)}…${fit.hi.toFixed(2)}`:'no game');
  { const d=shots.steps||[], one=d.filter(x=>x===1).length;
    check('one rules step a frame (the ball moves evenly)',d.length>100&&one>=d.length*0.95,`${one} of ${d.length} frames; others: ${d.filter(x=>x!==1).join(' ')||'—'}`); }
  { const f=shots.field; check('the field is the lab\'s shape (2.16 screen heights) across the whole screen, not the safe area',!!f&&f.gar===2.16&&f.ar===2.16&&Math.abs(f.x0)<=2&&Math.abs(f.x1-f.LW)<=2&&Math.abs(f.y1-f.y0-f.LH)<=1,f?`ar ${f.gar}; the field ${f.x0.toFixed(1)}…${f.x1.toFixed(1)} of ${f.LW} px`:'no game'); }
  check('pause: resume, hold again, start over, end, menu; then the countdown and the game',!!paused&&paused.scr==='paused'&&['resume','pg_recal','restart','quit','exit'].every(id=>paused.btn.includes(id))&&paused.cr==='count-resume'&&paused.back==='play',paused?`${paused.scr} → ${paused.cr} → ${paused.back}`:'');
  check('pause → «Подстроить ладонь» → «back»: the pause again, the calibration as it was (1.61l)',!!paused&&!!paused.recal&&paused.recal.scr==='phold'&&paused.recal.btn.includes('pg_back')&&paused.recal.lin===null&&paused.back0.scr==='paused'&&paused.back0.same,paused&&paused.recal?`${paused.recal.scr} [${paused.recal.btn.join(' ')}] → ${paused.back0.scr}, calibration kept: ${paused.back0.same}`:'');
  check('the game\'s log replays to the same game, the pauses too (1.61p, 1.61r)',!!over&&!!over.rep&&over.rep.rows===over.rep.steps&&over.rep.score===over.rep.want&&over.rep.marks>=1,over&&over.rep?`${over.rep.core}: ${over.rep.rows} steps (${over.rep.none} without the palm, ${over.rep.marks} goes-on after a pause), replayed ${over.rep.score}, played ${over.rep.want} (without the marks ${over.rep.noMarks})`:'');
  check('SonaLob\'s own sounds play: the countdown, the serve, the hits, the landings (1.61t)',!!over&&!!over.lob&&['tick','start','serve','pass','land'].every(k=>over.lob[k]>0),over&&over.lob?Object.keys(over.lob).map(k=>k+' '+over.lob[k]).join(', '):'');
  check('the game over keeps the best',!!over&&over.scr==='over'&&over.best===over.score&&['again','over_cal','menu'].every(id=>over.btn.includes(id)),over?`score ${over.score}, best kept ${over.best}`:'');
  check('no page errors',errors.length===0,errors.slice(0,2).join(' | '));
  out.forEach(x=>console.log(x)); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
})();
