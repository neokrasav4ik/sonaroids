/* Which end of the phone the hand plays at (v0.17): the rotation gives the port's side; with the phone at 90° (port on the right)
   the hand starts at the port; if the palm is not heard for 6 s while waving, the game flips to the front-camera end
   (the Redmi case), says so, shows "front camera towards your hand" on the phone screen, and nothing is remembered before a catch.
   Needs Playwright with Chromium. Run: node tests/side.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('no playwright — skipped'); console.log('RESULT: ok'); process.exit(0); }
const path=require('path'), ROOT=path.join(__dirname,'..');
(async()=>{
  const b=await chromium.launch(), ctx=await b.newContext({viewport:{width:844,height:390}});
  await ctx.addInitScript(`try{ Object.defineProperty(screen,'orientation',{configurable:true,get(){ return {angle:90,type:'landscape-primary',addEventListener(){}}; }}); }catch(e){}
    localStorage.setItem('sonaroids_lang','ru'); localStorage.setItem('sonaroids_seen','1');`);
  const p=await ctx.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(300);
  const s0=await p.evaluate(()=>__sonaroids.side());
  await p.evaluate(()=>__sonaroids.wave()); await p.waitForTimeout(9300);                // WAVE_PAUSE 2.5 + 6 s without a palm
  const s1=await p.evaluate(()=>__sonaroids.side());
  await p.evaluate(()=>__sonaroids.go('phone')); await p.waitForTimeout(300);
  const s2=await p.evaluate(()=>__sonaroids.side());
  await b.close();
  const ok=s0.hand==='right'&&!s0.cam&&s1.hand==='left'&&s1.cam&&s1.rel==='camera'&&/ДРУГОЙ СТОРОНЫ/.test(s1.say)&&s1.stored===''&&/КАМЕРОЙ/.test(s2.say)&&!errors.length;
  console.log(`port on the right: hand ${s0.hand} → no palm for 6 s → hand ${s1.hand} (${s1.rel}), said "${s1.say.slice(0,40)}…", remembered "${s1.stored}" (want nothing yet)`);
  console.log(`phone screen then: "${s2.say.slice(0,70)}"`+(errors.length?' | errors: '+errors.join('; '):''));
  console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
})();
