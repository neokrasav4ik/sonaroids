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
  await ctx.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_live','0'); localStorage.setItem('sonaroids_lang','${process.env.LANG2||'en'}'); ${SRC}; window.makeSimSource=makeSimSource; window.__scen=${SCEN}; window.SONAROIDS_API='https://api.test';`);
  const p=await ctx.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message+(errors.length?'':' '+String(e.stack).split('\n').slice(0,4).join(' < '))));
  const sent=[]; await p.route('https://api.test/**',r=>{ if(/\/v1\/game$/.test(r.request().url())) try{ sent.push(JSON.parse(r.request().postData())); }catch(e){}   // v1.01: the race as the server would get it
    r.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:'{"ok":true}'}); });
  await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(600);
  await p.evaluate(()=>{ Sonar.simulate({fs:48000,chan:'right',source:makeSimSource(window.__scen)}); });
  const shot=n=>p.screenshot({path:path.join(OUT,'race_'+n+'.png')});
  await p.evaluate(()=>__sonaroids.act.hub_race()); await p.waitForTimeout(1500);
  const menu=await p.evaluate(()=>({scr:__sonaroids.scr(),mode:__sonaroids.state().mode,btn:__sonaroids.btn().map(b=>b.id)})); await shot('01_menu');
  // v0.94: the rule sets — a tap puts all the switches, the set in use is lit; back to set А for the race below
  const sets=await p.evaluate(async()=>{ __sonaroids.act.rset(); __sonaroids.act.rp_e(); await new Promise(r=>setTimeout(r,200)); const e=JSON.parse(localStorage.getItem('sonaroids_race_opt'));
    __sonaroids.act.rp_d(); await new Promise(r=>setTimeout(r,200)); const d=JSON.parse(localStorage.getItem('sonaroids_race_opt')); __sonaroids.act.rs_cars(); await new Promise(r=>setTimeout(r,200)); const mixed=JSON.parse(localStorage.getItem('sonaroids_race_opt'));
    __sonaroids.act.rp_a(); await new Promise(r=>setTimeout(r,200)); const a=JSON.parse(localStorage.getItem('sonaroids_race_opt')); __sonaroids.go('rtitle'); return {e,d,mixed,a}; });
  const setsOk=sets.e.crashSlow&&sets.e.traffic===1.5&&sets.e.puddles===1.5&&sets.d.speed===1.15&&sets.d.gifts.tbubble&&!sets.d.crashSlow&&sets.mixed.traffic!==1&&sets.a.traffic===1&&!sets.a.gifts.tbubble&&sets.a.speed===1.15&&sets.a.superN===8&&sets.a.puddles===0.6;
  await p.evaluate(()=>__sonaroids.act.play()); let t0=Date.now(); const T=()=>(Date.now()-t0)/1000;
  const seen=[]; let last=null, startAt=null, follow=[], shots={}, drawn=null, paused=null, over=null;
  while(T()<70){
    await p.waitForTimeout(100);
    const s=await p.evaluate(()=>{ const s=__sonaroids.state(), st=Sonar.state(); return {scr:s.scr,caught:s.caught,hand:(st&&st.present&&s.T)?Tune.fracOf(s.T,st.height):null,
      car:s.g&&s.g.car?(s.g.steer==='road'?(s.g.car.y-Race.centre(s.g,s.g.d+s.g.car.x))/s.g.FH:s.g.car.y/s.g.FH):null,   /* v1.01: steering along the road — the car's place across the road (its height follows the bends too) */ gstate:s.g?s.g.state:null, score:s.g?s.g.score:null}; });
    if(s.scr!==last){ seen.push(s.scr+'@'+T().toFixed(1)); last=s.scr; }
    if(s.scr==='probe') await p.evaluate(()=>__sonaroids.act.probe_norm());
    if(s.scr==='wave'&&s.caught&&T()>=17&&!startAt){ await shot('02_try'); startAt=T(); await p.evaluate(()=>__sonaroids.act.start()); }
    if(s.scr==='count'&&!shots.count&&T()-startAt>1){ shots.count=1; await shot('03_count'); }
    if(s.scr==='play'){ if(s.hand!==null&&s.car!==null) follow.push([s.hand,s.car]);
      if(T()>30&&!shots.play){ shots.play=1; await shot('04_play');
        drawn=await p.evaluate(()=>{ const c=document.getElementById('hd'); if(!c||c.style.display==='none') return {shown:false};
          const x=c.getContext('2d'), d=x.getImageData(0,0,c.width,c.height).data; let choc=0, pink=0, n=0;
          for(let i=0;i<d.length;i+=4*97){ n++; const r=d[i],g=d[i+1],b=d[i+2]; const cream=r>235&&g>220&&b>185&&r-b<70; if(cream||(r>100&&r>g+25&&g>b+15&&b<120)) choc++; if(cream||(r>150&&g<150&&b>80&&r>g+60)||(g>200&&b>185&&g>r+8)) pink++; }   // v1.21: any zone — the road white chocolate, waffle or caramel; the ground raspberry, mint or vanilla
          return {shown:true,choc:choc/n,pink:pink/n}; }); }
      if(T()>40&&!paused){ const bp=await p.evaluate(()=>{ const b=__sonaroids.btn().find(q=>q.id==='pause'), m=__sonaroids.S(); return b?{x:(b.x+b.w/2)*m.S/m.DPR,y:(b.y+b.h/2)*m.S/m.DPR}:null; });
        if(bp) await p.mouse.click(bp.x,bp.y); await p.waitForTimeout(300); await shot('05_paused');
        paused=await p.evaluate(()=>({scr:__sonaroids.scr(),btn:__sonaroids.btn().map(b=>b.id)}));
        await p.evaluate(()=>__sonaroids.act.resume()); await p.waitForTimeout(300); paused.cr=await p.evaluate(()=>__sonaroids.scr()); await p.waitForTimeout(3300);
        paused.back=await p.evaluate(()=>__sonaroids.scr()); }
      if(T()>50&&paused&&!over){ await p.evaluate(()=>__sonaroids.act.quit()); await p.waitForTimeout(1500); await shot('06_finish');
        over=await p.evaluate(()=>({scr:__sonaroids.scr(),score:__sonaroids.state().g.score,best:+localStorage.getItem('sonaroids_race_best'),btn:__sonaroids.btn().map(b=>b.id),say:__sonaroids.side().say})); break; } }
  }
  // v1.06: the skins go round in the menu — candy, the notebook, the pirates, candy again; the pirates' lagoon is drawn (turquoise water, sand)
  let pir=null; if(over){ pir=await p.evaluate(async()=>{ const S=__sonaroids, w=ms=>new Promise(r=>setTimeout(r,ms)); S.go('rtitle'); await w(300); const k=[localStorage.getItem('sonaroids_race_skin')||'candy'];   // nothing kept yet: candy
      S.act.rskin(); await w(200); k.push(localStorage.getItem('sonaroids_race_skin')); S.act.rskin(); await w(1200); k.push(localStorage.getItem('sonaroids_race_skin'));
      const c=document.getElementById('hd'), x=c.getContext('2d'), d=x.getImageData(0,0,c.width,c.height).data; let sea=0, sand=0, n=0;
      for(let i=0;i<d.length;i+=4*97){ n++; const r=d[i],g=d[i+1],b=d[i+2]; if(b>150&&g>120&&r<150&&b>r+40) sea++; if(r>215&&g>190&&b>120&&b<200&&r>b+30) sand++; }
      S.act.rskin(); await w(200); k.push(localStorage.getItem('sonaroids_race_skin')); return {k,sea:sea/n,sand:sand/n,shown:c.style.display!=='none'}; }); await shot('07_pirates'); }
  await b.close();
  let ok=true; const out=[], check=(n,g,i)=>{ ok=ok&&g; out.push(`${n}: ${i||''} ${g?'ok':'FAIL'}`); };
  check('the card opens the race menu (v0.98: without the test settings)',menu.scr==='rtitle'&&menu.mode==='race'&&menu.btn.includes('play')&&menu.btn.includes('hub')&&!menu.btn.includes('rset'),menu.btn.join(','));
  check('the rule sets put all the switches (Е, Д, a switch changed, А)',setsOk,`Е cars ${sets.e.traffic} knock slows ${sets.e.crashSlow}; Д speed ${sets.d.speed}; changed cars ${sets.mixed.traffic}; А cars ${sets.a.traffic}`);
  check('screens',['probe','away','wave','count','play'].every(k=>seen.some(q=>q.startsWith(k+'@'))),seen.join(' '));
  // the car follows the palm: correlation of palm and car heights (the car is higher on screen for a higher palm: y falls)
  const n=follow.length, mh=follow.reduce((a,q)=>a+q[0],0)/n, mc=follow.reduce((a,q)=>a+q[1],0)/n; let sxy=0,sxx=0,syy=0; follow.forEach(q=>{ sxy+=(q[0]-mh)*(q[1]-mc); sxx+=(q[0]-mh)**2; syy+=(q[1]-mc)**2; });
  const corr=n>20?sxy/Math.sqrt(sxx*syy):0; check('the car follows the palm',corr<-0.8,`correlation ${corr.toFixed(2)} over ${n} samples`);
  check('the candy land is drawn (a candy road, a candy ground)',drawn&&drawn.shown&&drawn.choc>0.15&&drawn.pink>0.1,drawn?`road ${(100*drawn.choc).toFixed(0)}%, ground ${(100*drawn.pink).toFixed(0)}%`:'none');
  check('the pause: go on, start over, end, exit, the skin, the graphics, sounds; back to the race',!!paused&&paused.scr==='paused'&&['resume','restart','quit','exit','rskin_prev','rskin_next','gfx','sfx'].every(k=>paused.btn.includes(k))&&paused.cr==='count-resume'&&paused.back==='play',paused?paused.btn.join(',')+' → '+paused.cr+' → '+paused.back:'none');
  check('the finish: the score, the best kept',!!over&&over.scr==='over'&&over.score>0&&over.best===over.score&&over.btn.includes('again')&&over.btn.includes('menu'),over?`score ${over.score}, best ${over.best}, "${over.say}"`:'none');
  { const Race=require('../src/14_race.js'), zlib=require('zlib'), rb=sent.find(x=>x.game==='race'); let rs=null;   // v1.01: the server's replay of the race the page sent lands on the same score
    if(rb){ const buf=rb.enc==='deflate'?zlib.inflateRawSync(Buffer.from(rb.hands,'base64')):Buffer.from(rb.hands,'base64'), hs=[]; for(let i=0;i<buf.length;i+=2){ const v=buf.readUInt16LE(i); hs.push(v===65535?-1:v/4000); } rs=Race.replay(rb.seed,rb.FW,hs,rb.y0,rb.steer,null).score; }
    check('the race is sent to the tables and the server\'s replay gives its score',rb&&rb.core===Race.TAG&&(rb.steer==='road'||rb.steer==='height')&&rs===rb.score&&rb.score>0,rb?`sent ${rb.score}, replayed ${rs}, steering ${rb.steer}, ${Math.round(rb.hands.length*0.75)} B`:'nothing sent'); }
  check('the skins go round: candy, notebook, pirates, candy; the pirates\' lagoon is drawn',!!pir&&pir.k.join(',')==='candy,note,pirate,candy'&&pir.shown&&pir.sea>0.1&&pir.sand>0.03,pir?`${pir.k.join(' → ')}; sea ${(100*pir.sea).toFixed(0)}%, sand ${(100*pir.sand).toFixed(0)}%`:'none');
  check('no page errors',!errors.length,errors.join(' | '));
  out.forEach(s=>console.log(s)); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
})();
