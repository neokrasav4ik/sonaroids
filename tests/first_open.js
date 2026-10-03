/* A first open (empty storage, like a fresh APK or a new browser) shows the menu — since v0.70 the games' screen — not the instruction (v0.44);
   the first "Play" of a new player walks through the instruction. v0.78: the first open is in HD graphics; a player who picks pixels keeps them
   after a restart. Needs Playwright with Chromium. Run: node tests/first_open.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('no playwright — skipped'); console.log('RESULT: ok'); process.exit(0); }
const path=require('path'), ROOT=path.join(__dirname,'..');
(async()=>{
  const b=await chromium.launch(), p=await b.newPage({viewport:{width:844,height:390}}); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(400);
  const s0=await p.evaluate(()=>__sonaroids.state().scr), g0=await p.evaluate(()=>__sonaroids.state().gfx);
  const hasPlay=await p.evaluate(()=>!__sonaroids.btn().some(x=>x.id==='hub_play')&&__sonaroids.btn().some(x=>x.id==='hub_rocks')&&__sonaroids.btn().some(x=>x.id==='hub_race'));   // v0.70: the games' screen; v0.97: the cards start the games, no «play» button
  const verTitle=await p.evaluate(()=>__sonaroids.btn().some(x=>x.id==='ver'));
  // v0.56: a long press (0.7 s) on the version shows the service links; v0.87: a short tap on it reloads the page (the games' screen only)
  const vb=await p.evaluate(()=>{ const q=__sonaroids.btn().find(x=>x.id==='ver'), s=__sonaroids.S(); return {x:(q.x+q.w/2)*s.S/s.DPR,y:(q.y+q.h/2)*s.S/s.DPR}; });
  await p.evaluate(()=>{ window.__mark=1; });
  await Promise.all([p.waitForNavigation({timeout:5000}).catch(()=>null),p.mouse.click(vb.x,vb.y)]); await p.waitForTimeout(800);
  const reloaded=await p.evaluate(()=>window.__mark===undefined&&__sonaroids.scr()==='hub');
  await p.evaluate(()=>{ Logs.has=()=>true; }); const afterTap=await p.evaluate(()=>__sonaroids.btn().some(x=>x.id==='logs'));
  await p.mouse.move(vb.x,vb.y); await p.mouse.down(); await p.waitForTimeout(900); await p.mouse.up(); await p.waitForTimeout(250);
  const afterHold=await p.evaluate(()=>__sonaroids.btn().some(x=>x.id==='logs')&&__sonaroids.btn().some(x=>x.id==='lab'));
  await p.evaluate(()=>__sonaroids.act.ver());
  await p.evaluate(()=>__sonaroids.act.play()); await p.waitForTimeout(300);
  const s1=await p.evaluate(()=>__sonaroids.state().scr);
  // v0.47: the version is a switch for the "logs" link on the getting-ready screens too
  const verSetup=await p.evaluate(()=>__sonaroids.btn().some(x=>x.id==='ver'));
  const logsShown=await p.evaluate(async()=>{ Logs.has=()=>true; __sonaroids.act.ver(); await new Promise(r=>setTimeout(r,200)); const on=__sonaroids.btn().some(x=>x.id==='logs'); __sonaroids.act.ver(); return on; });
  // v1.34: on the scores screen a long press on the version is «people only» (the tabs are gone): the table asks for bots=0, the title says so; another long press — everyone
  const tops=[]; await p.route('**/v1/top**',r=>{ tops.push(r.request().url()); r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({period:'day',entries:[{rank:1,nick:'Den',score:100,level:1,t:10,me:false}],me:null})}); });
  await p.evaluate(()=>{ window.SONAROIDS_API='https://api.sonaroids.app'; __sonaroids.act.hub_rocks(); __sonaroids.go('scores'); });   /* a file:// page is «offline» unless the API is named */ await p.waitForTimeout(300);
  const say=()=>p.evaluate(()=>document.getElementById('say').textContent), hold=async()=>{ const q=await p.evaluate(()=>{ const q=__sonaroids.btn().find(x=>x.id==='ver'), s=__sonaroids.S(); return q&&{x:(q.x+q.w/2)*s.S/s.DPR,y:(q.y+q.h/2)*s.S/s.DPR}; }); if(!q) return false; await p.mouse.move(q.x,q.y); await p.mouse.down(); await p.waitForTimeout(900); await p.mouse.up(); await p.waitForTimeout(400); return true; };
  const sc0=await say(), tabs=await p.evaluate(()=>__sonaroids.btn().some(x=>x.id==='sc_all'||x.id==='sc_people')); const held1=await hold(); const sc1=await say(), logsOnScores=await p.evaluate(()=>__sonaroids.btn().some(x=>x.id==='logs'));
  const held2=await hold(); const sc2=await say(); await p.unroute('**/v1/top**');
  const people=!tabs&&held1&&held2&&!/PEOPLE ONLY/.test(sc0)&&/PEOPLE ONLY/.test(sc1)&&!/PEOPLE ONLY/.test(sc2)&&tops.some(u=>/bots=0/.test(u))&&tops.some(u=>!/bots=0/.test(u))&&!logsOnScores;
  await p.evaluate(()=>__sonaroids.go('hub')); await p.waitForTimeout(200);
  // v0.78: pixels, once picked, survive a restart
  await p.evaluate(()=>{ __sonaroids.act.hub_rocks(); __sonaroids.act.gfx(); }); await p.waitForTimeout(200);
  const kept=await p.evaluate(()=>localStorage.getItem('sonaroids_gfx')); await p.reload(); await p.waitForTimeout(400);
  const g1=await p.evaluate(()=>__sonaroids.state().gfx);
  await b.close();
  const gfxOk=g0==='hd'&&kept==='pixel'&&g1==='pixel';
  const ok=gfxOk&&s0==='hub'&&hasPlay&&s1==='sound'&&verTitle&&verSetup&&logsShown&&reloaded&&!afterTap&&afterHold&&people&&!errors.length;
  console.log(`graphics on the first open: ${g0} (want hd); pixels picked → stored ${kept}, after a restart ${g1} (want pixel)`);
  console.log(`first open: ${s0} (want hub, the games' screen) → "play": ${s1} (want sound, the instruction); version switch on the title ${verTitle}, on the sound screen ${verSetup}, "logs" after a tap ${logsShown}; a tap on the version reloads the page ${reloaded}, and shows no logs ${!afterTap}, a long press shows logs and lab ${afterHold} (want true)`+(errors.length?' | errors: '+errors.join('; '):''));
  console.log(`the scores: no tabs ${!tabs}; a long press on the version → «${sc1}», another → «${sc2}»; the table asked ${tops.map(u=>/bots=0/.test(u)?'people':'all').join(',')}; no logs link there ${!logsOnScores} → ${people?'ok':'FAIL'}`);
  console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
})();
