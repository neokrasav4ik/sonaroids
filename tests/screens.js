/* Every screen at common landscape sizes (small iPhone … iPad), both languages, both hands:
   buttons lie inside the screen and its safe area and do not overlap; plus a portrait check. Screenshots of 844×390 go to tests/out/screens/.
   Needs Playwright with Chromium (skipped without it). Run: node tests/screens.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('playwright not installed — skipped'); process.exit(0); }
const fs=require('fs'), path=require('path'); const ROOT=path.join(__dirname,'..'), OUT=path.join(__dirname,'out','screens'); fs.mkdirSync(OUT,{recursive:true});
const SIZES=[[568,320],[667,375],[740,360],[844,390],[932,430],[1024,768],[1366,1024]];
const SCREENS=['lang','title','sound','phone','mic','wave','wave-try','count','play','pause-play','restart','over','lost','nomic'];
(async()=>{
  const b=await chromium.launch(); const bad=[]; const errors=[]; let n=0;
  for(const [w,h] of SIZES) for(const lang of ['en','ru']) for(const hand of ['right','left']){
    const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:w<700?2:3});
    await ctx.addInitScript(`localStorage.setItem('sonaroids_lang','${lang}'); localStorage.setItem('sonaroids_hand','${hand}'); localStorage.setItem('sonaroids_seen','1');`);
    const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
    await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(300);
    await p.evaluate(()=>__sonaroids.fake());
    for(const s of SCREENS){
      await p.evaluate(s=>{ const g=__sonaroids.state().g;
        if(s==='play'){ g.state='play'; g.lives=3; g.rocks=[]; g.ship.inv=99; __sonaroids.go('play'); }
        else if(s==='pause-play'){ __sonaroids.act.pause(); }
        else if(s==='wave-try'){ __sonaroids.go('wave'); }
        else { if(s==='over') g.state='over'; __sonaroids.go(s); } },s);
      await p.waitForTimeout(s==='over'?1000:s==='phone'||s==='wave-try'?1300:150); n++;
      const r=await p.evaluate(()=>({btn:__sonaroids.btn(),S:__sonaroids.S()}));
      const {LW,LH}=r.S;
      if(s==='wave-try'&&!(r.btn.some(q=>q.id==='start')&&r.btn.some(q=>q.id==='again'))) bad.push(`${w}x${h} ${lang} ${hand}: calibrated screen lacks play/recalibrate`);
      if(s==='wave-try'){ const lane=r.S.shipLane; if(lane!==undefined&&r.btn.some(q=>q.x<lane&&q.x+q.w>lane-24)) bad.push(`${w}x${h} ${lang} ${hand}: button over the ship lane`); }
      if(s==='play'&&!r.btn.some(q=>q.id==='pause')) bad.push(`${w}x${h} ${lang} ${hand}: no menu button in flight`);
      if(s==='restart'&&!(['rs_go','rs_cal','rs_back'].every(id=>r.btn.some(q=>q.id===id)))) bad.push(`${w}x${h} ${lang} ${hand}: start-over screen lacks its buttons`);
      if(s==='pause-play'&&!(['resume','restart','quit','exit'].every(id=>r.btn.some(q=>q.id===id)))) bad.push(`${w}x${h} ${lang} ${hand}: pause lacks resume/end`);
      r.btn.forEach((q,i)=>{ if(q.x<0||q.y<0||q.x+q.w>LW||q.y+q.h>LH) bad.push(`${w}x${h} ${lang} ${hand} ${s}: button ${q.id} off screen`);
        r.btn.forEach((o,j)=>{ if(j>i&&q.x<o.x+o.w&&o.x<q.x+q.w&&q.y<o.y+o.h&&o.y<q.y+q.h) bad.push(`${w}x${h} ${lang} ${hand} ${s}: ${q.id} overlaps ${o.id}`); }); });
      if(w===844&&hand==='right'||w===844&&s==='phone') await p.screenshot({path:path.join(OUT,`${lang}_${hand}_${s}.png`)});
    }
    await ctx.close();
  }
  const pc=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3}); const pp=await pc.newPage();
  await pp.goto('file://'+path.join(ROOT,'game','play','index.html')); await pp.waitForTimeout(300); await pp.screenshot({path:path.join(OUT,'portrait.png')});
  const rot=await pp.evaluate(()=>document.getElementById('say').textContent); await b.close();
  console.log(`${n} screen checks at ${SIZES.length} sizes × 2 languages × 2 hands | problems: ${bad.length?'\n  '+bad.slice(0,20).join('\n  '):'none'}`);
  console.log(`portrait: "${rot}"`); if(errors.length) console.log('page errors:',[...new Set(errors)].join(' | '));
  const ok=!bad.length&&!errors.length&&/SIDEWAYS|ГОРИЗОНТАЛЬНО/.test(rot); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
})();
