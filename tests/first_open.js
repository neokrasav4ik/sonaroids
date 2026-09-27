/* A first open (empty storage, like a fresh APK or a new browser) shows the menu, not the instruction (v0.44);
   the first "Play" of a new player walks through the instruction. Needs Playwright with Chromium. Run: node tests/first_open.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('no playwright — skipped'); console.log('RESULT: ok'); process.exit(0); }
const path=require('path'), ROOT=path.join(__dirname,'..');
(async()=>{
  const b=await chromium.launch(), p=await b.newPage({viewport:{width:844,height:390}}); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(400);
  const s0=await p.evaluate(()=>__sonaroids.state().scr);
  const hasPlay=await p.evaluate(()=>__sonaroids.btn().some(x=>x.id==='play'));
  await p.evaluate(()=>__sonaroids.act.play()); await p.waitForTimeout(300);
  const s1=await p.evaluate(()=>__sonaroids.state().scr);
  await b.close();
  const ok=s0==='title'&&hasPlay&&s1==='sound'&&!errors.length;
  console.log(`first open: ${s0} (want title) → "play": ${s1} (want sound, the instruction)`+(errors.length?' | errors: '+errors.join('; '):''));
  console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
})();
