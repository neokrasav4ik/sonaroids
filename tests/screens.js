/* Every screen at common landscape sizes (small iPhone … iPad), both languages, both hands:
   buttons lie inside the screen and its safe area and do not overlap; plus a portrait check. Screenshots of 844×390 go to tests/out/screens/.
   Needs Playwright with Chromium (skipped without it). Run: node tests/screens.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('playwright not installed — skipped'); process.exit(0); }
const fs=require('fs'), path=require('path'); const ROOT=path.join(__dirname,'..'), OUT=path.join(__dirname,'out','screens'); fs.mkdirSync(OUT,{recursive:true});
const SIZES=process.env.SCREENS_QUICK?[[568,320],[1024,768]]:[[568,320],[667,375],[740,360],[844,390],[932,430],[1024,768],[1366,1024]];   // v1.51: SCREENS_QUICK=1 (run_par.py --changed) — the smallest phone and the iPad only
const SCREENS=['lang','hub','settings','title','skins','sound','phone','mic','probe','wave','wave-try','count','play','pause-play','restart','over','over-here','scores','nick','link','linkshow','linkin','linkdone','lost','nomic',
  'race-menu','race-skins','race-set','race-try','race-count','race-play','race-pause','race-over',
  'pong-menu','pong-hold','pong-try','pong-count','pong-play','pong-pause','pong-over'];   // v1.59: SonaPong's own screens (its menu, the two holds, the try-out, the game, its pause and game over)   // v0.84: SonaRace's own screens (its menu, the try-out with the car, the race, its pause and finish)
// v1.07: the buttons each screen must show (checked below) — waited for before the checks, so a slow frame is not a failure
const WANT={'pong-menu':['play','howto','pg_sens','hub'],'pong-try':['start','pg_rehold'],'pong-play':['pause'],'pong-pause':['resume','pg_recal','restart','quit','exit'],'pong-over':['again','menu','ver'],'scores':['ver','p_day'],'skins':['skins_prev','skins_next','sk_in','sk_time_next','sk_order','sk_all','sk_back'],'race-skins':['skins_prev','skins_next','sk_in','sk_all','sk_back'],'wave-try':['start','again'],'race-try':['start','again'],'race-menu':['play','howto','hub'],'race-set':['rs_*'],'race-play':['pause'],'race-pause':['resume','restart','quit','exit'],
  'race-over':['again','menu','ver'],'play':['pause'],'restart':['rs_go','rs_cal','rs_back'],'pause-play':['resume','restart','quit','exit'],'over':['ver'],'settings':['vol_dn','set_gfx_prev','set_band_next','set_live_next','set_expert','set_back']};   // v1.12: the settings
(async()=>{
  const b=await chromium.launch(); const bad=[]; const errors=[]; let n=0;
  // v1.07: the 28 sizes × languages × hands are independent — several at once (each its own browser context), the waits overlap (SCREENS_JOBS, default 4)
  const combos=[]; for(const [w,h] of SIZES) for(const lang of ['en','ru']) for(const hand of ['right','left']) combos.push([w,h,lang,hand]);
  async function one([w,h,lang,hand]){
    const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:w<700?2:3});
    await ctx.addInitScript(`localStorage.setItem('sonaroids_lang','${lang}'); localStorage.setItem('sonaroids_hand','${hand}'); localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_live','0');`);
    const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
    // the leaderboard server, faked at the HTTP level: the transfer code and its claim (tables are not needed here)
    await p.route('https://api.sonaroids.app/**',async route=>{ const r=route.request(), u=new URL(r.url()), cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, X-Player'};
      if(r.method()==='OPTIONS') return route.fulfill({status:204,headers:cors});
      const j=o=>route.fulfill({status:200,headers:cors,contentType:'application/json',body:JSON.stringify(o)});
      if(u.pathname==='/v1/link') return j({ok:true,code:'K7M4QX',ttl:600});
      if(u.pathname==='/v1/claim'){ const b=JSON.parse(r.postData()); return j(b.code==='K7M4QX'?{ok:true,pid:'0'.repeat(32),nick:'neokrasav4ik'}:{ok:false,error:'code'}); }
      return route.abort(); });
    await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(300);
    await p.evaluate(()=>__sonaroids.fake());
    for(const s of SCREENS){
      await p.evaluate(s=>{ const g=__sonaroids.state().g;
        if(s==='play'){ g.state='play'; g.lives=3; g.rocks=[]; g.ship.inv=99; __sonaroids.go('play'); }
        else if(s==='pause-play'){ __sonaroids.act.pause(); }
        else if(s==='wave-try'){ __sonaroids.go('wave'); }
        else if(s==='scores'){ const E=[]; for(let i=1;i<=10;i++) E.push({rank:i,nick:i===3?'WWWWWWWWWWWWWWWW':'Player_'+i,score:9876543-i*1000,me:i===5}); Board._set('day',{state:'ok',at:Date.now()+1e9,entries:E,me:{rank:5,score:9871543,nick:'Player_5'}}); __sonaroids.act.scores(); }
        else if(s==='nick'){ __sonaroids.act.name(); }
        else if(s==='over-here'){ g.state='over'; g.score=798000; Board._last({state:'done',score:798000,ranks:{day:1,week:1,all:1},here:{day:2,week:2,all:2},listed:false,named:true}); __sonaroids.go('over'); }
        else if(s==='link'){ __sonaroids.act.link(); }
        else if(s==='linkshow'){ __sonaroids.act.link_show(); }   // the code comes through Board.link → fetch → the faked server below (v0.33: a mocked Board.link hid a bug)
        else if(s==='linkin'){ __sonaroids.act.link_back2(); __sonaroids.act.link_in(); }
        else if(s==='race-menu'){ __sonaroids.act.hub_race(); __sonaroids.race(); }
        else if(s==='skins'||s==='race-skins'){ __sonaroids.act.skins_open(); }   // v1.29: the skins' screen
        else if(s==='race-set'){ __sonaroids.act.rset(); }
        else if(s==='race-try'){ __sonaroids.go('wave'); }
        else if(s==='race-count'){ __sonaroids.go('count'); }
        else if(s==='race-play'){ const r=__sonaroids.state().g; r.state='play'; r.car.inv=99; __sonaroids.go('play'); }
        else if(s==='race-pause'){ __sonaroids.act.pause(); }
        else if(s==='race-over'){ const r=__sonaroids.state().g; r.state='over'; __sonaroids.go('over'); }
        else if(s==='pong-menu'){ __sonaroids.act.hub_pong(); __sonaroids.pong(); }
        else if(s==='pong-hold'){ __sonaroids.go('phold'); __sonaroids.act.pg_rehold(); }
        else if(s==='pong-try'){ __sonaroids.pongDone(); }
        else if(s==='pong-count'){ __sonaroids.go('count'); }
        else if(s==='pong-play'){ const q=__sonaroids.state().g; q.state='play'; __sonaroids.go('play'); }
        else if(s==='pong-pause'){ __sonaroids.act.pause(); }
        else if(s==='pong-over'){ const q=__sonaroids.state().g; q.state='over'; __sonaroids.go('over'); }
        else if(s==='linkdone'){ document.querySelector('input').value='k7m 4qx'; __sonaroids.act.code_ok(); }
        else { if(s==='over'){ g.state='over'; g.score=12480; } __sonaroids.go(s); } },s);
      await p.waitForTimeout(s==='over'||s==='over-here'||s==='race-over'?1000:s==='phone'||s==='wave-try'||s==='race-try'?1300:s==='pong-over'?1000:150); n++;
      // v0.78: the game starts in HD — a big screen draws slowly here without a GPU (1366×1024: ~12 frames/s), so wait for the calibrated screen's buttons
      // v1.07: and so for every screen whose buttons are checked below: a few frames drawn, then until they are there (up to 8 s) — with other checks
      // running beside this one (tests/run_par.py) a fixed wait was sometimes too short; what is checked is the same
      await p.evaluate(()=>new Promise(r=>{ let k=0; (function f(){ if(++k>=3) r(); else requestAnimationFrame(f); })(); }));
      const want=WANT[s]; if(want) for(let i=0;i<80&&!(await p.evaluate(ids=>{ const b=__sonaroids.btn().map(q=>q.id); return ids.every(id=>id==='rs_*'?b.filter(x=>x.indexOf('rs_')===0).length===14:b.includes(id)); },want));i++) await p.waitForTimeout(100);
      if(s==='linkin') for(let i=0;i<40&&!(await p.evaluate(()=>{ const el=document.querySelector('input'); return el&&el.style.display!=='none'&&el.getAttribute('data-mode')==='code'; }));i++) await p.waitForTimeout(100);
      const r=await p.evaluate(()=>({btn:__sonaroids.btn(),S:__sonaroids.S()}));
      const {LW,LH}=r.S;
      if(s==='race-try'&&!(r.btn.some(q=>q.id==='start')&&r.btn.some(q=>q.id==='again'))) bad.push(`${w}x${h} ${lang} ${hand}: the race's try-out lacks play/recalibrate`);
      if(s==='race-menu'&&!['play','howto','hub'].every(id=>r.btn.some(q=>q.id===id))) bad.push(`${w}x${h} ${lang} ${hand}: the race menu lacks its buttons`);
      if(s==='race-set'&&r.btn.filter(q=>q.id.indexOf('rs_')===0).length!==14) bad.push(`${w}x${h} ${lang} ${hand}: the test settings lack switches`);
      if(s==='race-play'&&!r.btn.some(q=>q.id==='pause')) bad.push(`${w}x${h} ${lang} ${hand}: no menu button in the race`);
      if(s==='race-pause'&&!(['resume','restart','quit','exit'].every(id=>r.btn.some(q=>q.id===id)))) bad.push(`${w}x${h} ${lang} ${hand}: the race's pause lacks resume/end`);
      if(s==='race-over'&&!(['again','menu','ver'].every(id=>r.btn.some(q=>q.id===id)))) bad.push(`${w}x${h} ${lang} ${hand}: the race's finish lacks again/menu`);
      if(s==='wave-try'&&!(r.btn.some(q=>q.id==='start')&&r.btn.some(q=>q.id==='again'))) bad.push(`${w}x${h} ${lang} ${hand}: calibrated screen lacks play/recalibrate`);
      // v0.48: the menu button may sit over the lane's top — in flight the pause button stands in the very same place
      if(s==='wave-try'||s==='race-try'){ const lane=r.S.shipLane; if(lane!==undefined&&r.btn.some(q=>q.id!=='menu'&&q.x<lane&&q.x+q.w>lane-24)) bad.push(`${w}x${h} ${lang} ${hand}: button over the ship lane (${r.btn.filter(q=>q.id!=='menu'&&q.x<lane&&q.x+q.w>lane-24).map(q=>q.id+'@'+q.x+','+q.y).join(' ')}; lane ${lane})`); }
      if(s==='play'&&!r.btn.some(q=>q.id==='pause')) bad.push(`${w}x${h} ${lang} ${hand}: no menu button in flight`);
      if(s==='scores'){ const b=await p.evaluate(()=>__sonaroids.board()); if(!b.tbl||r.btn.some(q=>!/^sc_/.test(q.id)&&q.x<b.tbl[1]&&q.x+q.w>b.tbl[0]-4)) bad.push(`${w}x${h} ${lang} ${hand}: the table runs under the buttons`); if(b.tbl&&b.tbl[1]-b.tbl[0]<130) bad.push(`${w}x${h} ${lang} ${hand}: the table is too narrow (${b.tbl[1]-b.tbl[0]} px)`); }
      if(s==='linkshow'){ await p.waitForTimeout(300); const lc=await p.evaluate(()=>__sonaroids.state().linkCode); if(lc!=='K7M4QX') bad.push(`${w}x${h} ${lang} ${hand}: the transfer code is ${JSON.stringify(lc)}`); }
      if(s==='linkdone'){ await p.waitForTimeout(300); if(await p.evaluate(()=>__sonaroids.scr())!=='linkdone') bad.push(`${w}x${h} ${lang} ${hand}: the code was not taken`); }
      if(s==='linkin'||s==='linkdone'){ const vis=await p.evaluate(()=>{ const el=document.querySelector('input'); return el&&el.style.display!=='none'?el.getAttribute('data-mode'):'hidden'; }); if(s==='linkin'?vis!=='code':vis!=='hidden') bad.push(`${w}x${h} ${lang} ${hand}: ${s}: the code field is ${vis}`); }
      if(s==='nick'){ const b=await p.evaluate(()=>__sonaroids.board()); const m=r.S; if(!b.nick||!b.nick.shown||b.nick.rect.left<0||b.nick.rect.right>w||b.nick.rect.bottom>h) bad.push(`${w}x${h} ${lang} ${hand}: the name field is missing or off screen`); }
      if(s==='over'&&!(r.btn.some(q=>q.id==='ver')&&!r.btn.some(q=>q.id==='logs'))) bad.push(`${w}x${h} ${lang} ${hand}: game over — the version should be tappable and the logs button hidden`);
      if(s==='restart'&&!(['rs_go','rs_cal','rs_back'].every(id=>r.btn.some(q=>q.id===id)))) bad.push(`${w}x${h} ${lang} ${hand}: start-over screen lacks its buttons`);
      if(s==='pause-play'&&!(['resume','restart','quit','exit'].every(id=>r.btn.some(q=>q.id===id)))) bad.push(`${w}x${h} ${lang} ${hand}: pause lacks resume/end`);
      r.btn.forEach((q,i)=>{ if(q.x<0||q.y<0||q.x+q.w>LW||q.y+q.h>LH) bad.push(`${w}x${h} ${lang} ${hand} ${s}: button ${q.id} off screen`);
        r.btn.forEach((o,j)=>{ if(j>i&&q.x<o.x+o.w&&o.x<q.x+q.w&&q.y<o.y+o.h&&o.y<q.y+q.h) bad.push(`${w}x${h} ${lang} ${hand} ${s}: ${q.id} overlaps ${o.id}`); }); });
      if(w===844&&hand==='right'||w===844&&s==='phone') await p.screenshot({path:path.join(OUT,`${lang}_${hand}_${s}.png`)});
    }
    await ctx.close();
  }
  const JOBS=Math.max(1,+(process.env.SCREENS_JOBS||4)); let next=0;
  await Promise.all(Array.from({length:JOBS},async()=>{ while(next<combos.length) await one(combos[next++]); }));
  const pc=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3}); const pp=await pc.newPage();
  await pp.goto('file://'+path.join(ROOT,'game','play','index.html')); await pp.waitForTimeout(300); await pp.screenshot({path:path.join(OUT,'portrait.png')});
  const rot=await pp.evaluate(()=>document.getElementById('say').textContent); await b.close();
  console.log(`${n} screen checks at ${SIZES.length} sizes × 2 languages × 2 hands | problems: ${bad.length?'\n  '+bad.slice(0,20).join('\n  '):'none'}`);
  console.log(`portrait: "${rot}"`); if(errors.length) console.log('page errors:',[...new Set(errors)].join(' | '));
  const ok=!bad.length&&!errors.length&&/SIDEWAYS|ГОРИЗОНТАЛЬНО/.test(rot); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
})();
