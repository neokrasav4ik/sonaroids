/* SonaPong with the auto-calibration on (v1.61g; the maintainer 11 Oct 17:26: «если на ручной один раз удачно откалибровался.. включает
   авто, и в следующие разы играет на этих настройках, просто перед игрой телефон слушает пустую комнату»). A kept low (as the echo's
   range) on the phone and «АВТОКАЛИБРОВКА» on: «play» → the probe → the empty room → straight to the try-out «КАЛИБРОВКА ИЗ ПРОШЛОЙ ИГРЫ»
   (no waving), the rackets on the kept low + 6 mm, travel 75 mm; «play» → the countdown → the game, the rackets follow the palm.
   Nothing kept — the waving, as with it off. Needs Playwright with Chromium (skipped without it). Run: node tests/pong_live.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('playwright not installed — skipped'); console.log('RESULT: ok'); process.exit(0); }
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..'), OUT=path.join(__dirname,'out'); fs.mkdirSync(OUT,{recursive:true});
const SRC=fs.readFileSync(path.join(__dirname,'sim_source.js'),'utf8');
const SCEN=`function(t){ if(t<8) return null; return 110-40*Math.cos(2*Math.PI*(t-8)/1.6); }`;
async function run(b,kept){
  const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:2});
  await ctx.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_live','1'); localStorage.setItem('sonaroids_lang','ru'); localStorage.setItem('sonaroids_band_lock','normal');
    ${kept?`localStorage.setItem('sonaroids_pong_cal_normal',JSON.stringify({r:${kept},t:1760000000000}));`:''} ${SRC}; window.makeSimSource=makeSimSource; window.__scen=${SCEN};`);
  const p=await ctx.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(600);
  await p.evaluate(()=>{ Sonar.simulate({fs:48000,chan:'right',source:makeSimSource(window.__scen)}); });
  await p.evaluate(()=>__sonaroids.act.hub_pong()); await p.waitForTimeout(500); await p.evaluate(()=>__sonaroids.act.play());
  const t0=Date.now(), T=()=>(Date.now()-t0)/1000, seen=[]; let last=null, at=null, play=null;
  while(T()<40){ await p.waitForTimeout(100);
    const s=await p.evaluate(()=>({scr:__sonaroids.scr(),c:__sonaroids.pongCtl()}));
    if(s.scr!==last){ seen.push(s.scr+'@'+T().toFixed(1)); last=s.scr; }
    if(s.scr==='probe') await p.evaluate(()=>__sonaroids.act.probe_norm());
    if(s.scr==='phold'&&!at&&(s.c&&s.c.done||!kept)){ await p.waitForTimeout(kept?300:100); at=await p.evaluate(()=>{ const c=__sonaroids.pongCtl(); return {c:c,btn:__sonaroids.btn().map(b=>b.id),cal:DSP2.info().cal,auto:c.auto,t:c.t}; });
      await p.screenshot({path:path.join(OUT,'pong_live_'+(kept?'kept':'none')+'.png')}); if(!kept) break; await p.evaluate(()=>__sonaroids.act.start()); }
    if(s.scr==='play'&&!play){ await p.waitForTimeout(1500); play=await p.evaluate(()=>({c:__sonaroids.pongCtl(),g:{py:__sonaroids.state().g.py}})); break; } }
  await ctx.close(); return {seen,at,play,errors}; }
(async()=>{
  const b=await chromium.launch(); const A=await run(b,90), B=await run(b,null); await b.close();
  let ok=true; const out=[], check=(n,g,i)=>{ ok=ok&&g; out.push(`${n}: ${i||''} ${g?'ok':'FAIL'}`); };
  const a=A.at, want=a?a.cal.k*(90+6)+a.cal.o:null;
  check('a kept low and the auto-calibration on: the empty room, then straight to the try-out (no waving)',!!a&&a.auto===true&&a.c.done&&!a.c.waving&&['start','pg_rehold','pg_sens'].every(id=>a.btn.includes(id))&&a.t<1,A.seen.join(' → '));
  check('…the rackets on the kept low + 6 mm of range, travel 75 mm',!!a&&Math.abs(a.c.lin.b-want)<1e-6&&Math.abs(a.c.lin.t-a.c.lin.b-75)<1e-9,a?`low ${a.c.lin.b.toFixed(1)} (range 90+6 mm), top ${a.c.lin.t.toFixed(1)}`:'');
  check('…«play» → the countdown → the game, the rackets follow the palm',!!A.play&&A.play.c.frac!==null&&A.seen.some(x=>x.startsWith('count'))&&A.seen.some(x=>x.startsWith('play')),A.play?`palm at ${A.play.c.frac.toFixed(2)} of the travel`:'no game');
  check('nothing kept yet: the waving, as with it off',!!B.at&&B.at.auto===false&&B.at.c.waving,B.seen.join(' → '));
  check('no page errors',A.errors.length+B.errors.length===0,A.errors.concat(B.errors).slice(0,2).join(' | '));
  out.forEach(x=>console.log(x)); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1; })();
