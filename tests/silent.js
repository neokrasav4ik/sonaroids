/* A phone that does not hear its own probe at all (v0.86; the maintainer's iPhone, 29 Sep 19:21: the probe 40 dB under the bar, its band
   empty — the sound had not started; the next two starts at the same volume went fine). Getting ready tries once more at once; if the probe
   is still not heard, the sound screen says so and names silent mode (not «turn it up to 20–30%»), and its «next» starts the sound anew.
   1) silent, then heard on the retry → on to the wave step, no sound screen;  2) silent both times → «doesn't hear its sound», silent mode;
   3) a phone heard but too quiet is still told to turn the volume up;  4) an iPhone is asked for 40–60%.
   Needs Playwright with Chromium. Run: node tests/silent.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('no playwright — skipped'); console.log('RESULT: ok'); process.exit(0); }
const fs=require('fs'), path=require('path'), ROOT=path.join(__dirname,'..'), SRC=fs.readFileSync(path.join(__dirname,'sim_source.js'),'utf8');
async function run(b,loudFn,ua){ const ctx=await b.newContext(Object.assign({viewport:{width:844,height:390}},ua?{userAgent:ua}:{}));
  await ctx.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_lang','en'); ${SRC}; window.makeSimSource=makeSimSource; window.SONAROIDS_API='https://api.test'; window.__loud=${loudFn};`);
  const p=await ctx.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
  await p.route('https://api.test/**',r=>r.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:'{"ok":true}'}));
  await p.goto('file://'+path.join(ROOT,'game','play','index.html'));
  await p.evaluate(()=>{ window.__t0=performance.now(); Sonar.simulate({fs:48000,chan:'right',source:makeSimSource(()=>null,{loud:()=>window.__loud((performance.now()-window.__t0)/1000)})}); });
  await p.evaluate(()=>__sonaroids.act.play()); await p.waitForTimeout(400); await p.evaluate(()=>__sonaroids.act.probe_norm());
  const seen=[]; let scr='', say='';
  for(let i=0;i<140;i++){ await p.waitForTimeout(150); scr=await p.evaluate(()=>__sonaroids.scr()); if(!seen.length||seen[seen.length-1]!==scr) seen.push(scr); if(scr==='sound'||scr==='wave') break; }
  for(let i=0;i<10;i++){ say=await p.evaluate(()=>__sonaroids.side().say); if(scr!=='sound'||/VOLUME|HEAR/.test(say)) break; await p.waitForTimeout(100); }
  let after=null; if(scr==='sound'&&/HEAR ITS SOUND/.test(say)){ await p.evaluate(()=>__sonaroids.act.next()); await p.waitForTimeout(1500); after=await p.evaluate(()=>__sonaroids.scr()); }
  await ctx.close(); return {seen,scr,say,after,errors}; }
(async()=>{
  const b=await chromium.launch(); let ok=true; const out=[];
  const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
  const cases=[
    ['silent, then heard on the retry','t=>t<7?0.003:1',null,r=>r.scr==='wave'&&!r.seen.includes('sound')],
    ['silent both times','t=>0.003',null,r=>r.scr==='sound'&&/HEAR ITS SOUND/.test(r.say)&&/SILENT MODE/.test(r.say)&&r.after==='probe'],
    ['heard but too quiet','t=>0.1',null,r=>r.scr==='sound'&&/TOO LOW — TURN IT UP TO 20–30%/.test(r.say)],
    ['an iPhone, heard but too quiet','t=>0.1',IOS,r=>r.scr==='sound'&&/TURN IT UP TO 40–60%/.test(r.say)]];
  for(const [name,fn,ua,want] of cases){ const r=await run(b,fn,ua), good=want(r)&&!r.errors.length; ok=ok&&good;
    out.push(`${name}: ${r.seen.join(' → ')}${r.after?' → next → '+r.after:''} | "${r.say}" ${good?'ok':'FAIL'}`+(r.errors.length?' | '+r.errors.join('; '):'')); }
  await b.close(); out.forEach(s=>console.log(s)); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
})();
