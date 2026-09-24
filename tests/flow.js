/* The whole game in headless Chromium with a synthetic microphone (Sonar.simulate): title → take your hand away → wave →
   start → countdown → flight → game over, then both logs are read back with the lab's tools.
   Checks: every screen is reached; the waved range lands on ~10–90% of the screen; the ship follows the palm in flight;
   the setup log replays through the lab's replay_game.js with the same echo range; no page errors.
   Needs Playwright with Chromium (skipped without it). Screenshots go to tests/out/. Run: node tests/flow.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('playwright not installed — skipped'); process.exit(0); }
const fs=require('fs'), path=require('path'), {execFileSync}=require('child_process');
const ROOT=path.join(__dirname,'..'), OUT=path.join(__dirname,'out'); fs.mkdirSync(OUT,{recursive:true});
const SRC=fs.readFileSync(path.join(__dirname,'sim_source.js'),'utf8');
// the palm: away 0–7 s (empty room), 100 mm 7–8, waving 100±50 mm with a 2 s period 8–16, then slow 100±40 mm (5 s period) in flight
const SCEN=`function(t){ if(t<7) return null; if(t<8) return 100; if(t<16) return 100+50*Math.sin(2*Math.PI*(t-8)/2); return 100+40*Math.sin(2*Math.PI*(t-16)/5); }`;
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:2});
  await ctx.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_lang','en'); ${SRC}; window.makeSimSource=makeSimSource; window.__scen=${SCEN};`);
  const p=await ctx.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+path.join(ROOT,'game','play','index.html'));
  await p.evaluate(()=>{ Sonar.simulate({fs:48000,chan:'right',source:makeSimSource(window.__scen)}); });
  const seen=['title@0']; let last=null, t0=Date.now(); const T=()=>(Date.now()-t0)/1000;
  const shot=async n=>p.screenshot({path:path.join(OUT,n+'.png')});
  await shot('01_title');
  await p.evaluate(()=>__sonaroids.act.play()); t0=Date.now();
  let caughtAt=null, startAt=null, range=null, follow=[], shots={};
  while(T()<40){
    await p.waitForTimeout(100);
    const s=await p.evaluate(()=>{ const s=__sonaroids.state(), st=Sonar.state(); return {scr:s.scr,caught:s.caught,
      ok:s.prep&&s.prep.res&&s.prep.res.ok, T:s.T?{field:s.T.field,last:s.T.last}:null,
      hand:(st&&st.present&&s.T)?Tune.fracOf(s.T,st.height):null, ship:s.g?s.g.ship.y/s.g.FH:null, score:s.g?s.g.score:null, gstate:s.g?s.g.state:null}; });
    if(s.scr!==last){ seen.push(s.scr+'@'+T().toFixed(1)); last=s.scr; }
    if(s.scr==='away'&&T()>3&&!shots.away){ shots.away=1; await shot('02_away'); }
    if(s.scr==='wave'&&s.caught&&!caughtAt){ caughtAt=T(); }
    if(s.scr==='wave'&&T()>=13.5&&!startAt){ await shot('03_wave'); const r=s.T.last;
      range=await p.evaluate(r=>{ const S=__sonaroids.state(); return [Tune.fracOf(S.T,r.lo),Tune.fracOf(S.T,r.hi),S.T.field]; },r);
      startAt=T(); await p.evaluate(()=>__sonaroids.act.start()); }
    if(s.scr==='count'&&!shots.count&&T()-startAt>1){ shots.count=1; await shot('04_count'); }
    if(s.scr==='play'){ if(s.hand!==null&&s.ship!==null) follow.push([s.hand,s.ship]);
      if(T()>22&&!shots.stage){ shots.stage=1; await p.evaluate(()=>{ const g=__sonaroids.state().g; g.level=5; g.ufoT=0.01; g.ship.shield=10;   // show everything at once
        g.picks.push({type:'triple',x:g.FW*0.6,y:60},{type:'slow',x:g.FW*0.8,y:120}); }); }
      if(T()>26&&!shots.play){ shots.play=1; await shot('05_play'); } }
    if(s.scr==='play'&&T()>30){ await p.evaluate(()=>{ const g=__sonaroids.state().g; g.lives=1; g.ship.inv=0; g.state='play';
      g.rocks.push({id:9999,sz:0,r:13.5,x:g.ship.x+3,y:g.ship.y,vx:0,vy:0}); }); }
    if(s.scr==='over'&&!shots.over){ shots.over=1; await p.waitForTimeout(1200); await shot('06_over'); break; }
  }
  // logs back through the lab tools
  const logs=await p.evaluate(async()=>{ const f=async b=>b?Array.from(new Uint8Array(await b.arrayBuffer())):null; return {setup:await f(Logs.setupBlob()),game:await f(Logs.gameBlob())}; });
  const sp=path.join(OUT,'flow_setup.wav'), gp=path.join(OUT,'flow_game.wav');
  if(logs.setup) fs.writeFileSync(sp,Buffer.from(logs.setup)); if(logs.game) fs.writeFileSync(gp,Buffer.from(logs.game));
  await b.close();
  // how well the ship follows the palm in flight: ship y (0 top … 1 bottom) against palm fraction (0 bottom … 1 top)
  let corr=NaN; if(follow.length>20){ const a=follow.map(q=>q[0]), c=follow.map(q=>1-q[1]); const m=v=>v.reduce((x,y)=>x+y,0)/v.length, ma=m(a), mc=m(c);
    let sab=0,saa=0,scc=0; for(let i=0;i<a.length;i++){ sab+=(a[i]-ma)*(c[i]-mc); saa+=(a[i]-ma)**2; scc+=(c[i]-mc)**2; } corr=sab/Math.sqrt(saa*scc); }
  let rep=''; try{ rep=execFileSync('node',[path.join(ROOT,'lab','tools','replay_game.js'),sp]).toString(); }catch(e){ rep='ERROR '+e.message; }
  const m=rep.match(/дальность \|Δ\| медиана ([\d.]+) мм/);   // the echo range as the page saw it vs the replay: the log carries everything needed
  console.log('screens:',seen.join(' → '));
  console.log(`range caught at ${caughtAt===null?'never':caughtAt.toFixed(1)+' s'}; at START the waved range sits at ${range?(range[0]*100).toFixed(0)+'–'+(range[1]*100).toFixed(0)+'% of the screen, field '+range[2].toFixed(0)+' mm':'?'} (want ~10–90%)`);
  console.log(`flight: ship follows the palm, correlation ${corr.toFixed(3)} over ${follow.length} samples`);
  console.log(`logs: setup ${logs.setup?(logs.setup.length/1024).toFixed(0)+' KB':'none'}, game ${logs.game?(logs.game.length/1024).toFixed(0)+' KB':'none'}; lab replay of the setup log: echo range differs from the page by ${m?m[1]:'?'} mm (median)`);
  if(errors.length) console.log('page errors:',errors.join(' | '));
  const need=['title','away','wave','count','play','over'], got=need.every(n=>seen.some(s=>s.startsWith(n+'@')));
  const ok=got&&caughtAt!==null&&range&&range[0]>0.05&&range[0]<0.16&&range[1]>0.84&&range[1]<0.95&&corr>0.95&&logs.setup&&logs.game&&m&&+m[1]<0.5&&!errors.length;
  console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
})();
