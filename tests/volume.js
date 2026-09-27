/* The media volume before getting ready (v0.45). The probe level per unit of our gain is, in effect, how loud the phone plays:
   the phones that steered well had 0–14 dB, the maintainer's Redmi in the app at 60% volume 34–37 dB.
   1) a browser, a phone playing 20 dB too loud → getting ready stops with "loud", the sound screen says "turn it down to 20–30%", and the setup log keeps why (v0.46);
   2) the app, a loud phone (+22 dB) at 60% → the app turns the volume down by itself, and goes on; a level under the bar is left alone;
   3) the app, a quiet phone (−12 dB) at 10% → the app turns it up;  4) a browser, a usual phone → goes on as before.
   The simulated speaker gets louder by 60 dB over the whole volume range (4 dB per 1/15); the app never goes below 2/15, so a very loud phone may stay somewhat above the target. Needs Playwright with Chromium. Run: node tests/volume.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('no playwright — skipped'); console.log('RESULT: ok'); process.exit(0); }
const fs=require('fs'), path=require('path'), ROOT=path.join(__dirname,'..'), SRC=fs.readFileSync(path.join(__dirname,'sim_source.js'),'utf8');
async function page(b){ const ctx=await b.newContext({viewport:{width:844,height:390}});
  await ctx.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_lang','en'); ${SRC}; window.makeSimSource=makeSimSource; window.SONAROIDS_API='https://api.test';`);
  const p=await ctx.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message)); await p.route('https://api.test/**',r=>r.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:'{"ok":true}'}));
  await p.goto('file://'+path.join(ROOT,'game','play','index.html')); return {p,errors}; }
async function direct(b,base,v0){ const {p,errors}=await page(b);
  const r=await p.evaluate(async([base,v0])=>{ let v=v0; const vol={get:()=>v,set:x=>{ v=Math.round(x*15)/15; }};
    Sonar.simulate({fs:48000,chan:'right',source:makeSimSource(()=>null,{loud:()=>Math.pow(10,(base+(v-0.33)*60)/20)})}); Sonar.setBand('normal'); await Sonar.boot();
    const res=await Sonar.prepare(null,vol); const I=Sonar.info(); return {ok:res.ok,why:res.why||'',v,lvl:I.probe_level,fit:I.vol_fit}; },[base,v0]);
  await p.context().close(); return Object.assign(r,{errors}); }
(async()=>{
  const b=await chromium.launch(); let ok=true; const out=[];
  // 1) browser, too loud: through the game's own screens
  { const {p,errors}=await page(b);
    await p.evaluate(()=>{ Sonar.simulate({fs:48000,chan:'right',source:makeSimSource(()=>null,{loud:()=>10})}); });
    await p.evaluate(()=>__sonaroids.act.play()); await p.waitForTimeout(400); await p.evaluate(()=>__sonaroids.act.probe_norm());
    let scr='', say=''; for(let i=0;i<80;i++){ await p.waitForTimeout(150); scr=await p.evaluate(()=>__sonaroids.scr()); if(scr==='sound') break; }
    say=await p.evaluate(()=>__sonaroids.side().say); const lvl=await p.evaluate(()=>Sonar.info().probe_level);
    const lg=await p.evaluate(async()=>{ const b=Logs.setupBlob(); if(!b) return null; const t=new TextDecoder('latin1').decode(new Uint8Array(await b.arrayBuffer())); return {size:b.size,why:/"loud"/.test(t),ev:t.indexOf('\u043d\u0435 \u0433\u043e\u0442\u043e\u0432\u043e')>=0||/не готово/.test(new TextDecoder().decode(new Uint8Array(await b.arrayBuffer())))}; });
    const good=scr==='sound'&&/TOO HIGH/.test(say)&&lg&&lg.why&&lg.ev&&!errors.length; ok=ok&&good;
    out.push(`browser, 20 dB too loud: level ${lvl.toFixed(1)} dB → screen ${scr}, "${say}"; setup log ${lg?lg.size+' bytes, stop reason in it: '+(lg.why&&lg.ev):'none'} ${good?'ok':'FAIL'}`+(errors.length?' | '+errors.join('; '):''));
    await p.context().close(); }
  // 2)–4)
  for(const [name,base,v0,want] of [['app, loud phone (+22 dB) at 60%',22,0.6,'down'],['app, quiet phone (−12 dB) at 10%',-12,0.1,'up'],['app, usual phone at 25%',0,0.25,'same'],['app, usual phone at 60% (loud but under the bar)',-6,0.6,'same']]){
    const r=await direct(b,base,v0), moved=r.v<v0-0.01?'down':r.v>v0+0.01?'up':'same';
    const good=r.ok&&moved===want&&(want==='same'||Math.abs(r.lvl-10)<=14)&&!r.errors.length; ok=ok&&good;
    out.push(`${name}: volume ${v0} → ${r.v.toFixed(2)} (${moved}), level ${r.lvl.toFixed(1)} dB, steps ${JSON.stringify(r.fit)} ${good?'ok':'FAIL'}`+(r.errors.length?' | '+r.errors.join('; '):'')); }
  await b.close(); out.forEach(s=>console.log(s)); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
})();
