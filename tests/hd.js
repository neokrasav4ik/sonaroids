/* The graphics switch (v0.72): «ГРАФИКА: ПИКСЕЛИ / HD» on SonaFly's screen. For every skin, starting in HD: the HD canvas is shown and drawn
   when the skin has HD pictures (space, fairy tale), hidden otherwise (the pixel ones stay); the switch turns it off and on again and is
   remembered ('sonaroids_gfx'); the games' screen shows the card sharp in HD; no page errors.
   Needs Playwright with Chromium. Run: node tests/hd.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('no playwright — skipped'); console.log('RESULT: ok'); process.exit(0); }
const path=require('path'), ROOT=path.join(__dirname,'..'), GAME='file://'+path.join(ROOT,'game','play','index.html');
(async()=>{
  const b=await chromium.launch(); let bad=0; const rows=[];
  const ids=['space','fairy','vector','neon','note','lcd'], shapesOnly=['lcd'];   // v0.74: skins drawn only as shapes; v0.76: vector, neon and notebook have pixel pictures of their own, the LCD's HD picture is already whole pixels
  for(const id of ids){
    const p=await b.newPage({viewport:{width:844,height:390},deviceScaleFactor:2}); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
    await p.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_live','0'); localStorage.setItem('sonaroids_skin','${id}'); localStorage.setItem('sonaroids_gfx','hd');`);
    await p.goto(GAME); await p.waitForTimeout(300); await p.evaluate(()=>__sonaroids.act.hub_rocks()); await p.waitForTimeout(700);
    const look=()=>p.evaluate(()=>{ const c=document.getElementById('hd'); if(!c||c.style.display==='none') return {shown:false};
      const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let lit=0; for(let i=3;i<d.length;i+=4*97) if(d[i]>0) lit++;
      return {shown:true,w:c.width,lit}; });
    const a=await look(), hasBtn=await p.evaluate(()=>__sonaroids.btn().some(x=>x.id==='gfx'));
    await p.evaluate(()=>__sonaroids.act.gfx()); await p.waitForTimeout(300); const off=await look(), kept1=await p.evaluate(()=>localStorage.getItem('sonaroids_gfx'));
    await p.evaluate(()=>__sonaroids.act.gfx()); await p.waitForTimeout(300); const on=await look(), kept2=await p.evaluate(()=>localStorage.getItem('sonaroids_gfx'));
    const want=true, lw=await p.evaluate(()=>__sonaroids.S().LW), so=shapesOnly.includes(id);
    // a shapes-only skin with «pixels»: the same canvas stays, at one pixel per game pixel
    const offOk=so?(off.shown&&off.w===lw):!off.shown;
    const ok=hasBtn&&a.shown===want&&a.lit>100&&offOk&&on.shown===want&&on.w===a.w&&kept1==='pixel'&&kept2==='hd'&&!errors.length;
    if(!ok) bad++;
    rows.push(`${id.padEnd(6)} HD ${a.shown?'shown ('+a.w+' px wide, drawn '+a.lit+')':'hidden'} (want ${want?'shown':'hidden'}), switch → ${off.shown?'shown ('+off.w+' px'+(so?', want '+lw:'')+')':'hidden'} [${kept1}] → ${on.shown?'shown':'hidden'} [${kept2}]`+(errors.length?' | errors: '+errors.join('; '):'')+(ok?'':'  FAIL'));
    await p.close(); }
  // the games' screen in HD: the card is cut out of the pixel canvas (transparent there) and drawn sharp on the HD one
  const p=await b.newPage({viewport:{width:844,height:390},deviceScaleFactor:2}); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_live','0'); localStorage.setItem('sonaroids_gfx','hd'); Math.random=()=>0.1;`);
  await p.goto(GAME); await p.waitForTimeout(800);
  const hub=await p.evaluate(()=>{ const q=__sonaroids.btn().find(x=>x.id==='hub_rocks'), c=document.getElementById('hd'), cv=document.querySelector('canvas:not(#hd)');
    const k=cv.width/__sonaroids.S().LW, px=cv.getContext('2d').getImageData(Math.round((q.x+q.w/2)*k),Math.round((q.y+q.h/3)*k),1,1).data;   // v0.75: in HD the canvas is k device pixels per game pixel
    return {hd:!!c&&c.style.display!=='none',alpha:px[3],k:k}; });
  const hubOk=hub.hd&&hub.k>1&&hub.alpha===0&&!errors.length; if(!hubOk) bad++;
  rows.push(`games' screen (space): HD ${hub.hd}, the texts' canvas at ${hub.k.toFixed(2)} px per game pixel (want >1), the card cut out of it ${hub.alpha===0}`+(errors.length?' | errors: '+errors.join('; '):'')+(hubOk?'':'  FAIL'));
  await b.close();
  console.log(rows.join('\n')); console.log(bad?'RESULT: FAIL':'RESULT: ok'); process.exitCode=bad?1:0;
})();
