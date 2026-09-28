/* A first open (empty storage, like a fresh APK or a new browser) shows the menu, not the instruction (v0.44);
   the first "Play" of a new player walks through the instruction. Needs Playwright with Chromium. Run: node tests/first_open.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('no playwright — skipped'); console.log('RESULT: ok'); process.exit(0); }
const path=require('path'), ROOT=path.join(__dirname,'..');
(async()=>{
  const b=await chromium.launch(), p=await b.newPage({viewport:{width:844,height:390}}); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(400);
  const s0=await p.evaluate(()=>__sonaroids.state().scr);
  const hasPlay=await p.evaluate(()=>__sonaroids.btn().some(x=>x.id==='play'));
  const verTitle=await p.evaluate(()=>__sonaroids.btn().some(x=>x.id==='ver'));
  // v0.56: a tap on the version does nothing, a long press (0.7 s) shows the service links
  const vb=await p.evaluate(()=>{ const q=__sonaroids.btn().find(x=>x.id==='ver'), s=__sonaroids.S(); return {x:(q.x+q.w/2)*s.S/s.DPR,y:(q.y+q.h/2)*s.S/s.DPR}; });
  await p.evaluate(()=>{ Logs.has=()=>true; });
  await p.mouse.click(vb.x,vb.y); await p.waitForTimeout(250); const afterTap=await p.evaluate(()=>__sonaroids.btn().some(x=>x.id==='logs'));
  await p.mouse.move(vb.x,vb.y); await p.mouse.down(); await p.waitForTimeout(900); await p.mouse.up(); await p.waitForTimeout(250);
  const afterHold=await p.evaluate(()=>__sonaroids.btn().some(x=>x.id==='logs')&&__sonaroids.btn().some(x=>x.id==='lab'));
  await p.evaluate(()=>__sonaroids.act.ver());
  await p.evaluate(()=>__sonaroids.act.play()); await p.waitForTimeout(300);
  const s1=await p.evaluate(()=>__sonaroids.state().scr);
  // v0.47: the version is a switch for the "logs" link on the getting-ready screens too
  const verSetup=await p.evaluate(()=>__sonaroids.btn().some(x=>x.id==='ver'));
  const logsShown=await p.evaluate(async()=>{ Logs.has=()=>true; __sonaroids.act.ver(); await new Promise(r=>setTimeout(r,200)); const on=__sonaroids.btn().some(x=>x.id==='logs'); __sonaroids.act.ver(); return on; });
  await b.close();
  const ok=s0==='title'&&hasPlay&&s1==='sound'&&verTitle&&verSetup&&logsShown&&!afterTap&&afterHold&&!errors.length;
  console.log(`first open: ${s0} (want title) → "play": ${s1} (want sound, the instruction); version switch on the title ${verTitle}, on the sound screen ${verSetup}, "logs" after a tap ${logsShown}; on the title a tap on the version shows logs ${afterTap} (want false), a long press shows logs and lab ${afterHold} (want true)`+(errors.length?' | errors: '+errors.join('; '):''));
  console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
})();
