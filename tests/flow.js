/* The whole game in headless Chromium with a synthetic microphone (Sonar.simulate): title → take your hand away → wave →
   start → countdown → flight → game over, then both logs are read back with the lab's tools.
   Checks: every screen is reached; the waved range lands on ~10–90% of the screen; the ship follows the palm in flight;
   the setup log replays through the lab's replay_game.js with the same echo range; no page errors.
   Needs Playwright with Chromium (skipped without it). Screenshots go to tests/out/. Run: node tests/flow.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('playwright not installed — skipped'); process.exit(0); }
const fs=require('fs'), path=require('path'), {execFileSync}=require('child_process');
const ROOT=path.join(__dirname,'..'), OUT=path.join(__dirname,'out'); fs.mkdirSync(OUT,{recursive:true});
const SRC=fs.readFileSync(path.join(__dirname,'sim_source.js'),'utf8');
// the palm: away 0–8 s (empty room), 100 mm 8–9, waving 100±50 mm with a 2 s period 9–20, then slow 100±40 mm (5 s period) in flight
const SCEN=`function(t){ if(t<8) return null; if(t<9) return 100; if(t<20) return 100+50*Math.sin(2*Math.PI*(t-9)/2); return 100+40*Math.sin(2*Math.PI*(t-20)/5); }`;
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:2});
  await ctx.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_lang','en'); ${SRC}; window.makeSimSource=makeSimSource; window.__scen=${SCEN}; window.SONAROIDS_API='https://api.test';`);
  const p=await ctx.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
  // the leaderboard server, faked: games and names are caught here and checked below; every game "makes the table", no name yet
  const posted=[], nicks=[], setups=[];
  await p.route('https://api.test/**',async route=>{ const r=route.request(), u=new URL(r.url()), cors={'Access-Control-Allow-Origin':'*'};
    if(r.method()==='OPTIONS') return route.fulfill({status:204,headers:Object.assign({'Access-Control-Allow-Methods':'GET, POST','Access-Control-Allow-Headers':'Content-Type, X-Player'},cors)});
    if(u.pathname==='/v1/game'){ const bd=JSON.parse(r.postData()); posted.push(bd); return route.fulfill({status:200,headers:cors,contentType:'application/json',body:JSON.stringify({ok:true,score:bd.score,level:1,ranks:{day:1,week:2,all:30},listed:true,named:false})}); }
    if(u.pathname==='/v1/setup'){ setups.push(JSON.parse(r.postData()).result); return route.fulfill({status:200,headers:cors,contentType:'application/json',body:'{"ok":true}'}); }
    if(u.pathname==='/v1/nick'){ const bd=JSON.parse(r.postData()); nicks.push(bd.nick); return route.fulfill({status:200,headers:cors,contentType:'application/json',body:JSON.stringify({ok:true,nick:bd.nick})}); }
    return route.fulfill({status:200,headers:cors,contentType:'application/json',body:JSON.stringify({period:'day',entries:[],me:null})}); });
  await p.goto('file://'+path.join(ROOT,'game','play','index.html'));
  await p.evaluate(()=>{ Sonar.simulate({fs:48000,chan:'right',source:makeSimSource(window.__scen)}); });
  const seen=['title@0']; let last=null, t0=Date.now(); const T=()=>(Date.now()-t0)/1000;
  const shot=async n=>p.screenshot({path:path.join(OUT,n+'.png')});
  await shot('01_title');
  await p.evaluate(()=>__sonaroids.act.play()); t0=Date.now();
  let logs={setup:null,game:null}, pausedOk=false, nickScreen=null, afterNick=null, restartOk=false, restartInfo='', healthyAfter=null, again=null, seen2=[], last2=null, caughtAt=null, startAt=null, range=null, follow=[], shots={};
  while(T()<95){
    await p.waitForTimeout(100);
    const s=await p.evaluate(()=>{ const s=__sonaroids.state(), st=Sonar.state(); return {scr:s.scr,caught:s.caught,
      ok:s.prep&&s.prep.res&&s.prep.res.ok, T:s.T?{field:s.T.field,last:s.T.last}:null,
      hand:(st&&st.present&&s.T)?Tune.fracOf(s.T,st.height):null, ship:s.g?s.g.ship.y/s.g.FH:null, score:s.g?s.g.score:null, gstate:s.g?s.g.state:null}; });
    if(s.scr!==last){ seen.push(s.scr+'@'+T().toFixed(1)); last=s.scr; }
    if(s.scr==='away'&&T()>3&&!shots.away){ shots.away=1; await shot('02_away'); }
    if(s.scr==='wave'&&s.caught&&!caughtAt){ caughtAt=T(); }
    if(s.scr==='wave'&&s.caught&&T()>=16.5&&!startAt){ await shot('03_wave'); const r=s.T.last;
      range=await p.evaluate(r=>{ const S=__sonaroids.state(); return [Tune.fracOf(S.T,r.lo),Tune.fracOf(S.T,r.hi),S.T.field]; },r);
      startAt=T(); await p.evaluate(()=>__sonaroids.act.start()); }
    if(s.scr==='count'&&!shots.count&&T()-startAt>1){ shots.count=1; await shot('04_count'); }
    if(s.scr==='play'){ if(s.hand!==null&&s.ship!==null) follow.push([s.hand,s.ship]);
      if(T()>25&&!shots.stage){ shots.stage=1; await p.evaluate(()=>{ const g=__sonaroids.state().g; g.level=5; g.ufoT=0.01; g.ship.shield=10;   // show everything at once
        g.picks.push({type:'triple',x:g.FW*0.6,y:60},{type:'slow',x:g.FW*0.8,y:120}); }); }
      if(T()>29&&!shots.play){ shots.play=1; await shot('05_play'); } }
    if(s.scr==='play'&&T()>33&&!shots.paused){ shots.paused=1;   // the menu button in flight, pressed with a real tap (buttons act on release)
      const bp=await p.evaluate(()=>{ const b=__sonaroids.btn().find(q=>q.id==='pause'), m=__sonaroids.S(); return b?{x:(b.x+b.w/2)*m.S/m.DPR,y:(b.y+b.h/2)*m.S/m.DPR}:null; });
      if(bp) await p.mouse.click(bp.x,bp.y); await p.waitForTimeout(300);
      await shot('06a_paused'); pausedOk=await p.evaluate(()=>__sonaroids.scr()==='paused'&&__sonaroids.btn().some(b=>b.id==='quit'));
      // "start over" → "play now": a countdown with the same calibration, then a fresh game (v0.24)
      await p.evaluate(()=>__sonaroids.act.restart()); await p.waitForTimeout(200); const rs=await p.evaluate(()=>__sonaroids.scr());
      await p.evaluate(()=>__sonaroids.act.rs_go()); await p.waitForTimeout(3600);
      const st=await p.evaluate(()=>({scr:__sonaroids.scr(),t:__sonaroids.state().g.t}));
      restartOk=rs==='restart'&&st.scr==='play'&&st.t<1.5; restartInfo=`${rs} → ${st.scr}, new game at ${st.t.toFixed(1)} s`;
      await p.waitForTimeout(8000);                          // let the fresh game score something, so it is sent too
      await p.evaluate(()=>__sonaroids.act.pause()); await p.waitForTimeout(100);
      await p.evaluate(()=>__sonaroids.act.quit()); }
    if(s.scr==='over'&&!shots.over){ shots.over=1; await p.waitForTimeout(1200); await shot('06_over');
      // the first place in a table: the name is asked once (v0.25)
      for(let k=0;k<30&&await p.evaluate(()=>__sonaroids.scr())!=='nick';k++) await p.waitForTimeout(100);
      nickScreen=await p.evaluate(()=>__sonaroids.scr()); await shot('06b_nick');
      await p.evaluate(()=>{ const el=document.querySelector('input'); el.value=' Tester_1 '; __sonaroids.act.nick_ok(); }); await p.waitForTimeout(400);
      afterNick=await p.evaluate(()=>__sonaroids.scr()+'|'+localStorage.getItem('sonaroids_nick'));
      logs=await p.evaluate(async()=>{ const f=async b=>b?Array.from(new Uint8Array(await b.arrayBuffer())):null; return {setup:await f(Logs.setupBlob()),game:await f(Logs.gameBlob())}; });
      // a second game after the app was in the background (iOS takes the microphone away: no frames), with the palm still moving
      // next to the phone (24 Sep: this start said "too quiet"): "again" must re-open the microphone and get ready again
      await p.evaluate(()=>Sonar.simStall(true)); await p.waitForTimeout(1000); healthyAfter=await p.evaluate(()=>Sonar.healthy());
      await p.evaluate(()=>__sonaroids.act.again()); again=T(); }
    if(again!==null&&s.scr!==last2){ seen2.push(s.scr); last2=s.scr; }
    if(again!==null&&(s.scr==='wave'||s.scr==='sound'||T()-again>12)) break;
  }
  // logs back through the lab tools (taken at game over, before the second game)
  const sp=path.join(OUT,'flow_setup.wav'), gp=path.join(OUT,'flow_game.wav');
  if(logs.setup) fs.writeFileSync(sp,Buffer.from(logs.setup)); if(logs.game) fs.writeFileSync(gp,Buffer.from(logs.game));
  await b.close();
  // how well the ship follows the palm in flight: ship y (0 top … 1 bottom) against palm fraction (0 bottom … 1 top)
  let corr=NaN; if(follow.length>20){ const a=follow.map(q=>q[0]), c=follow.map(q=>1-q[1]); const m=v=>v.reduce((x,y)=>x+y,0)/v.length, ma=m(a), mc=m(c);
    let sab=0,saa=0,scc=0; for(let i=0;i<a.length;i++){ sab+=(a[i]-ma)*(c[i]-mc); saa+=(a[i]-ma)**2; scc+=(c[i]-mc)**2; } corr=sab/Math.sqrt(saa*scc); }
  let rep=''; try{ rep=execFileSync('node',[path.join(ROOT,'lab','tools','replay_game.js'),sp]).toString(); }catch(e){ rep='ERROR '+e.message; }
  const m=rep.match(/дальность \|Δ\| медиана ([\d.]+) мм/);   // the echo range as the page saw it vs the replay: the log carries everything needed
  console.log('screens:',seen.join(' → '));
  console.log(`range caught at ${caughtAt===null?'never':caughtAt.toFixed(1)+' s'}; at START the waved range sits at ${range?(range[0]*100).toFixed(0)+'–'+(range[1]*100).toFixed(0)+'% of the screen, field '+range[2].toFixed(0)+' mm':'?'} (want ~6–90%)`);
  console.log(`microphone gone while in the background noticed: ${healthyAfter===false?'yes':'NO'}; “again” then: ${seen2.join(' → ')} (want → away → wave)`);
  console.log(`flight: ship follows the palm, correlation ${corr.toFixed(3)} over ${follow.length} samples`);
  console.log(`logs: setup ${logs.setup?(logs.setup.length/1024).toFixed(0)+' KB':'none'}, game ${logs.game?(logs.game.length/1024).toFixed(0)+' KB':'none'}; lab replay of the setup log: echo range differs from the page by ${m?m[1]:'?'} mm (median)`);
  if(errors.length) console.log('page errors:',errors.join(' | '));
  const need=['title','away','wave','count','play','over'], got=need.every(n=>seen.some(s=>s.startsWith(n+'@')));
  // every game the page sent must replay on the server's code to the same score
  const Core=require('../src/13_core.js'), zlib=require('zlib');
  const replays=posted.map(bd=>{ const buf=bd.enc==='deflate'?zlib.inflateRawSync(Buffer.from(bd.hands,'base64')):Buffer.from(bd.hands,'base64'); const hands=[]; for(let i=0;i<buf.length;i+=2){ const v=buf.readUInt16LE(i); hands.push(v===65535?-1:v/4000); }
    const g=Core.replay(bd.seed,bd.FW,hands,bd.y0); return {sent:bd.score,replay:g.score,steps:hands.length,bytes:bd.hands.length,core:bd.core}; });
  // the first game is doctored for the screenshots (level 5, a saucer, a shield — see 'stage' above), so it cannot replay; the next one is a clean game
  const boardOk=replays.length>=2&&replays.slice(1).every(r=>r.sent===r.replay&&r.sent>0&&r.core===Core.TAG)&&nickScreen==='nick'&&afterNick==='over|Tester_1'&&nicks[0]==='Tester_1';
  console.log(`leaderboard: ${replays.length} games sent, replayed on the server's code: ${replays.map(r=>r.sent+(r.sent===r.replay?' = ':' ≠ ')+r.replay+' ('+r.steps+' steps, '+r.bytes+' B)').join('; ')} | name asked: ${nickScreen}, then ${afterNick}`);
  const dv=posted.length?posted[posted.length-1].dev:null, devOk=!!(dv&&dv.os&&dv.br&&dv.fs===48000&&typeof dv.snr==='number'&&typeof dv.eq==='boolean'&&!('ua' in dv));
  console.log(`getting-ready reports: ${setups.join(', ')||'NONE'}`);
  console.log(`phone note with the game: ${dv?JSON.stringify(dv):'NONE'}`);
  console.log(`menu in flight → pause with “end the game”: ${pausedOk?'yes':'NO'}; start over → play now: ${restartOk?'yes':'NO'} (${restartInfo})`);
  const ok=boardOk&&devOk&&setups.includes('caught')&&pausedOk&&restartOk&&healthyAfter===false&&seen2.includes('away')&&seen2[seen2.length-1]==='wave'&&got&&caughtAt!==null&&range&&range[0]<0.12&&range[1]>0.8&&range[1]<0.95&&corr>0.95&&logs.setup&&logs.game&&m&&+m[1]<0.5&&!errors.length;
  console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
})();
