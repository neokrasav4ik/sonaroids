/* Buttons answer the finger (v0.89; the maintainer: «все кнопки визуально не реагируют на нажатия — непонятно, прошёл тап или нет»,
   his pick «А»): while a finger is down on a button it lights up, and it goes back to how it was a moment after the finger lifts.
   Checked on the games' screen (a big button), a game's menu (a row of the column) and in flight (the menu icon), with a real mouse.
   Needs Playwright with Chromium. Run: node tests/press.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('no playwright — skipped'); console.log('RESULT: ok'); process.exit(0); }
const path=require('path'), ROOT=path.join(__dirname,'..');
(async()=>{
  const b=await chromium.launch(), ctx=await b.newContext({viewport:{width:844,height:390}});
  await ctx.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_live','0'); localStorage.setItem('sonaroids_lang','en');`);
  const p=await ctx.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(700);
  // the mean lightness of a button's middle, from a screenshot
  const light=async r=>{ const png=await p.screenshot({clip:{x:r.x+r.w*0.3,y:r.y+r.h*0.3,width:Math.max(2,r.w*0.4),height:Math.max(2,r.h*0.4)}});
    return await p.evaluate(async b64=>{ const im=new Image(); im.src='data:image/png;base64,'+b64; await im.decode(); const c=document.createElement('canvas'); c.width=im.width; c.height=im.height;
      const x=c.getContext('2d'); x.drawImage(im,0,0); const d=x.getImageData(0,0,c.width,c.height).data; let s=0; for(let i=0;i<d.length;i+=4) s+=d[i]+d[i+1]+d[i+2]; return s/(d.length/4)/3; },png.toString('base64')); };
  const rect=id=>p.evaluate(id=>{ const q=__sonaroids.btn().find(b=>b.id===id), m=__sonaroids.S(); return q?{x:q.x*m.S/m.DPR,y:q.y*m.S/m.DPR,w:q.w*m.S/m.DPR,h:q.h*m.S/m.DPR}:null; },id);
  let ok=true; const out=[];
  for(const [where,setup,id] of [["the games' screen",()=>__sonaroids.go('hub'),'howto'],["SonaFly's menu",()=>{ __sonaroids.act.hub_rocks(); },'scores'],
      ['in flight',()=>{ __sonaroids.fake(); const g=__sonaroids.state().g; g.state='play'; g.ship.inv=99; g.rocks=[]; __sonaroids.go('play'); },'pause']]){
    await p.evaluate(setup); await p.waitForTimeout(400); const r=await rect(id); if(!r){ ok=false; out.push(`${where}: no ${id} FAIL`); continue; }
    const l0=await light(r); await p.mouse.move(r.x+r.w/2,r.y+r.h/2); await p.mouse.down(); await p.waitForTimeout(150); const l1=await light(r);
    await p.evaluate(()=>{ window.__noAct=1; }); await p.mouse.move(5,5); await p.mouse.up(); await p.waitForTimeout(400); const l2=await light(r);   // lifted off the button: no action, the light goes
    const good=l1>l0+12&&l1>l2+12; ok=ok&&good;   /* lighter while pressed than before and after */ out.push(`${where}, ${id}: lightness ${l0.toFixed(0)} → pressed ${l1.toFixed(0)} → after ${l2.toFixed(0)} ${good?'ok':'FAIL'}`); }
  await b.close(); out.forEach(s=>console.log(s)); if(errors.length) console.log('page errors:',errors.join(' | '));
  ok=ok&&!errors.length; console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
})();
