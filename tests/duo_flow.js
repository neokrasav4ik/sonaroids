/* SonaLob «ВДВОЁМ» on the screens (v1.64c): two games in one headless Chromium, each with its own synthetic palm, the records server
   (with its pair rooms) on a temporary database. The menu has «ИГРАТЬ ВДВОЁМ»; A makes a code, B enters it; both see «ВЫ ВМЕСТЕ» (A the
   left racket, B the right; «ПОМЕНЯТЬСЯ» swaps them on both, and back); each calibrates (the waving), presses «ГОТОВ» on the try-out;
   both count down to the same moment and play one game. Checks: the screens are reached; the game starts on both within a few frames of
   each other; the own racket follows the own palm; both phones end with the very same game (the score, the passes, the steps); «ЕЩЁ РАЗ»
   on both starts the next one; no page errors. Screenshots: tests/out/duo_*.png. Run: node tests/duo_flow.js (DUO_SERVER=1 — no direct channel, everything through the server) */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('no playwright — skipped'); console.log('RESULT: ok'); process.exit(0); }
try{ require('node:sqlite'); }catch(e){ console.log('no node:sqlite — skipped'); console.log('RESULT: ok'); process.exit(0); }
const os=require('os'), fs=require('fs'), path=require('path'); process.env.DB=path.join(os.tmpdir(),'sonaroids_duof_'+process.pid+'.db'); process.env.ORIGINS='null';
const {server}=require('../server/server.js'), ROOT=path.join(__dirname,'..'), OUT=path.join(__dirname,'out'); fs.mkdirSync(OUT,{recursive:true});
const SRC=fs.readFileSync(path.join(__dirname,'sim_source.js'),'utf8');
let ok=true; const check=(name,c,info)=>{ console.log((c?'ok   ':'FAIL ')+name+(info?' — '+info:'')); if(!c) ok=false; };
const SCEN=[`function(t){ if(t<8) return null; return 110-40*Math.cos(2*Math.PI*(t-8)/1.6); }`,`function(t){ if(t<8) return null; return 105-38*Math.cos(2*Math.PI*(t-8)/1.3+1); }`];
(async()=>{ await new Promise(r=>server.listen(0,'127.0.0.1',r)); const base='http://127.0.0.1:'+server.address().port;
  const b=await chromium.launch(), P=[];
  for(let i=0;i<2;i++){ const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,hasTouch:true});
    await ctx.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_live','0'); localStorage.setItem('sonaroids_lang','ru'); localStorage.setItem('sonaroids_hand','right'); ${i?"localStorage.setItem('sonaroids_nick','ANN');":"localStorage.setItem('sonaroids_nick','DEN');"} ${SRC}; window.makeSimSource=makeSimSource; window.__scen=${SCEN[i]}; window.SONAROIDS_API='${base}'; ${process.env.DUO_SERVER?'window.RTCPeerConnection=undefined;':''}`);
    const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message+' '+String(e.stack).split('\n').slice(1,3).join(' < '))); p.errs=errs;
    await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(500);
    await p.evaluate(()=>{ Sonar.simulate({fs:48000,chan:'right',source:makeSimSource(window.__scen)}); }); P.push(p); }
  const [A,B]=P, act=(p,a)=>p.evaluate(a=>__sonaroids.act[a](),a), D=p=>p.evaluate(()=>__sonaroids.duo()), scr=p=>p.evaluate(()=>__sonaroids.scr());
  const wait=async(p,f,ms,arg)=>{ const t0=Date.now(); while(Date.now()-t0<ms){ if(await p.evaluate(f,arg)) return true; await p.waitForTimeout(80); } return false; };
  const shot=(p,n)=>p.screenshot({path:path.join(OUT,'duo_'+n+'.png')});
  for(const p of P){ await act(p,'hub_pong'); await p.waitForTimeout(400); }
  const menu=await A.evaluate(()=>__sonaroids.btn().map(b=>b.id)); await shot(A,'01_menu');
  check('the menu: «ИГРАТЬ ОДНОМУ» and «ИГРАТЬ ВДВОЁМ»',menu[0]==='play'&&menu[1]==='pg_duo',menu.slice(0,3).join(','));
  await act(A,'pg_duo'); await act(B,'pg_duo'); await A.waitForTimeout(300); await shot(A,'02_choose');
  const ch=await A.evaluate(()=>__sonaroids.btn().map(b=>b.id).join(','));
  check('«ВДВОЁМ»: nearby, make a code, enter a code, back',/pd_near,pd_new,pd_in,pd_back/.test(ch),ch);
  await act(A,'pd_new'); const gotCode=await wait(A,()=>{ const d=__sonaroids.duo(); return d.on&&d.code&&__sonaroids.scr()==='pduowait'; },5000); const code=(await D(A)).code; await A.waitForTimeout(200); await shot(A,'03_code');
  check('«СОЗДАТЬ КОД»: the 4 digits shown, waiting',gotCode&&/^\d{4}$/.test(code||''),code);
  await act(B,'pd_in'); await B.waitForTimeout(200); await B.evaluate(c=>{ const el=document.querySelector('input'); el.value=c; },code); await shot(B,'04_enter'); await act(B,'pd_ok');
  const tog=await wait(A,()=>__sonaroids.scr()==='pduo2'&&__sonaroids.duo().pst==='menu',6000)&&await wait(B,()=>__sonaroids.scr()==='pduo2'&&__sonaroids.duo().pst==='menu',6000);
  const da=await D(A), db=await D(B); await shot(A,'05_together_A'); await shot(B,'05_together_B');
  check('«ВЫ ВМЕСТЕ» on both: A the left racket, B the right, each sees the other',tog&&da.me===0&&db.me===1,`A me ${da.me} sees «${da.pst}», B me ${db.me} sees «${db.pst}»`);
  const par=[await A.evaluate(()=>Sonar.parity()),await B.evaluate(()=>Sonar.parity())];
  check('each phone plays its own half of the probe\'s tones (A the even, B the odd)',par[0]===0&&par[1]===1,par.join(' / '));
  await act(B,'pd_swap'); const sw=await wait(A,()=>__sonaroids.duo().me===1,3000)&&await wait(B,()=>__sonaroids.duo().me===0,3000);
  await act(A,'pd_swap'); const sw2=await wait(A,()=>__sonaroids.duo().me===0,3000)&&await wait(B,()=>__sonaroids.duo().me===1,3000);
  check('«ПОМЕНЯТЬСЯ» swaps the rackets on both (from either phone)',sw&&sw2);
  /* each calibrates: the probe, the empty room, the waving, the try-out */
  for(const p of P) await act(p,'pd_next');
  const t0=Date.now(), done=[false,false], seenSt=[];
  while(Date.now()-t0<60000&&!(done[0]&&done[1])){ await A.waitForTimeout(150);
    for(let i=0;i<2;i++){ const p=P[i], s=await p.evaluate(()=>({scr:__sonaroids.scr(),c:__sonaroids.pongCtl(),d:__sonaroids.duo()}));
      if(s.scr==='probe') await act(p,'probe_norm');
      if(i===0) seenSt.push(s.d.pst);
      if(s.scr==='phold'&&s.c&&s.c.done&&!done[i]&&s.d.state==='try'){ done[i]=true; } } }
  check('each calibrates on its own and gets to the try-out',done[0]&&done[1]);
  await A.waitForTimeout(400); await shot(A,'06_try_A');
  check('the partner\'s state is seen (calibrating, then trying)',seenSt.includes('cal')&&(await D(A)).pst==='try',[...new Set(seenSt)].join(' → '));
  await act(A,'pd_ready'); await A.waitForTimeout(600); const notYet=await scr(A); await shot(A,'07_ready_wait');
  check('one ready — no start yet, «ЖДЁМ НАПАРНИКА»',notYet==='phold'&&(await D(B)).pst==='ready');
  await act(B,'pd_ready');
  const cnt=await wait(A,()=>__sonaroids.scr()==='count',3000)&&await wait(B,()=>__sonaroids.scr()==='count',3000); await shot(B,'08_count');
  const pl=await wait(A,()=>__sonaroids.scr()==='play',6000)&&await wait(B,()=>__sonaroids.scr()==='play',3000);
  const n0=[(await D(A)).game,(await D(B)).game];
  check('both ready → both count down and play one game',cnt&&pl&&n0[0]&&n0[1]&&n0[0].seed===n0[1].seed,n0[0]&&`seed ${n0[0].seed}, steps ${n0[0].n} / ${n0[1].n}`);
  await A.waitForTimeout(1500); await shot(A,'09_play_A'); await shot(B,'09_play_B');
  /* the own racket follows the own palm: in a second of the game the own racket moves, the step counts stay together */
  const fol=[]; for(let k=0;k<12;k++){ fol.push([(await D(A)).game,(await D(B)).game]); await A.waitForTimeout(120); }
  const spreadA=Math.max(...fol.map(q=>q[0].pys[0]))-Math.min(...fol.map(q=>q[0].pys[0])), spreadB=Math.max(...fol.map(q=>q[1].pys[1]))-Math.min(...fol.map(q=>q[1].pys[1]));
  /* each phone's step against the server's clock (read inside the page — reading two pages one after the other is the test's own delay; under the full suite a busy page reads a few steps late, up to a frame of 50–80 ms) */
  const lagA=fol.map(q=>q[0].behind).sort((x,y)=>x-y)[6], lagB=fol.map(q=>q[1].behind).sort((x,y)=>x-y)[6], dn=Math.max(Math.abs(lagA),Math.abs(lagB));
  check('each phone\'s own racket follows its palm',spreadA>0.05&&spreadB>0.05,`A left ${spreadA.toFixed(2)}, B right ${spreadB.toFixed(2)}`);
  check('the two phones step together (each by the server\'s clock)',dn<=8,`behind the clock: A ${lagA.toFixed(1)}, B ${lagB.toFixed(1)} steps (the middle of 12 readings)`);
  /* v1.64f: the pause for both — A pauses, both stop at the same step; B turns the sensitivity; A goes on — both count down and play */
  await act(A,'pause'); const pz=await wait(A,()=>__sonaroids.scr()==='pdpause',2000)&&await wait(B,()=>__sonaroids.scr()==='pdpause',3000);
  await A.waitForTimeout(800); const za=await D(A), zb=await D(B); await shot(B,'09b_pause_B');
  check('the pause for both: both stop at the same step',pz&&za.pz&&zb.pz&&za.pz.n===zb.pz.n&&za.game.n===za.pz.n&&zb.game.n===zb.pz.n,za.pz&&`A at ${za.game.n} (pause ${za.pz.n}, ${za.pz.by}), B at ${zb.game.n} (pause ${zb.pz&&zb.pz.n}, ${zb.pz&&zb.pz.by})`);
  await act(B,'pg_sens'); await A.waitForTimeout(500); const mk=[(await D(A)).mk,(await D(B)).mk];
  await wait(A,()=>__sonaroids.duo().pst==='pause',3000); await act(A,'pd_resume');
  const rs=await wait(A,()=>__sonaroids.scr()==='count-resume',2000)&&await wait(B,()=>__sonaroids.scr()==='count-resume',3000)&&await wait(A,()=>__sonaroids.scr()==='play',5000)&&await wait(B,()=>__sonaroids.scr()==='play',2000);
  check('the sensitivity turned in the pause reaches both; «ДАЛЬШЕ» — both count down and play on',mk[0]===1&&mk[1]===1&&rs,`marks ${mk.join('/')}`);
  /* the partner goes silent (B's messages are lost for 4 s): A pauses and waits; B comes back — both go on */
  await A.waitForTimeout(1500); await B.evaluate(()=>{ const L=__sonaroids.link, o=L.send; window.__mute=true; L.send=function(m){ if(!window.__mute) return o.call(L,m); }; window.__unmute=function(){ window.__mute=false; L.send=o; }; });
  const lost=await wait(A,()=>{ const d=__sonaroids.duo(); return __sonaroids.scr()==='pdpause'&&d.pz&&d.pz.by==='lost'; },5000); await shot(A,'09c_lost_A');
  const bp=await wait(B,()=>__sonaroids.scr()==='pdpause',4000);
  await B.evaluate(()=>window.__unmute()); const back=await wait(A,()=>{ const d=__sonaroids.duo(); return d.pz&&d.pz.by!=='lost'&&d.pst==='pause'; },5000);
  const la=await D(A), lb=await D(B);
  check('the partner silent — the pause with «НАПАРНИК ПРОПАЛ — ЖДЁМ»; back — the same step on both',lost&&bp&&back&&la.pz&&lb.pz&&la.pz.n===lb.pz.n&&la.game.n===lb.game.n,la.pz&&`A at ${la.game.n}, B at ${lb.game.n}`);
  await act(B,'pd_resume'); const rs2=await wait(A,()=>__sonaroids.scr()==='play',6000)&&await wait(B,()=>__sonaroids.scr()==='play',3000);
  check('and on — from the other phone',rs2);
  const over=await wait(A,()=>__sonaroids.scr()==='over',150000)&&await wait(B,()=>__sonaroids.scr()==='over',8000);
  const ea=await A.evaluate(()=>{ const g=__sonaroids.duoGame(); return g&&{n:g.n,score:g.score,passes:g.passes,ceils:g.ceils,falls:g.falls,tosses:g.tosses}; }), eb=await B.evaluate(()=>{ const g=__sonaroids.duoGame(); return g&&{n:g.n,score:g.score,passes:g.passes,ceils:g.ceils,falls:g.falls,tosses:g.tosses}; });
  const ga=(await D(A)).game, gb=(await D(B)).game; await A.waitForTimeout(1000); await shot(A,'10_over_A');
  const lk=await A.evaluate(()=>__sonaroids.link.state()); console.log('note the link:',lk.direct?'the direct channel':'through the server',lk.rttD?'direct '+Math.round(lk.rttD)+' ms':'',lk.rttS?'server '+Math.round(lk.rttS)+' ms':'');
  check('the game ends on both — the very same game',over&&JSON.stringify(ea)===JSON.stringify(eb),`A ${JSON.stringify(ea)} | B ${JSON.stringify(eb)}; rollbacks ${ga.rb}/${gb.rb}, the longest ${ga.rbMax}/${gb.rbMax} steps`);
  const ca=await A.evaluate(()=>__sonaroids.pgClips()), cb=await B.evaluate(()=>__sonaroids.pgClips()); await A.waitForTimeout(1500); await shot(A,'10b_over_clips_A');
  const cs=c=>c?JSON.stringify(c.clips.map(x=>[x.who,x.pts,x.h])):'none';
  check('the best arcs together: each racket\'s best pass, the same on both phones, from the game stepped again',!!ca&&ca.check===ea.score&&cs(ca)===cs(cb),`A ${cs(ca)} | B ${cs(cb)}; stepped again to ${ca&&ca.check}`);
  /* v1.64h: both phones sent the game; the server replayed it — the pair is one line of SonaLob's table */
  let tb=null; for(let k=0;k<30;k++){ await A.waitForTimeout(200); tb=await (await fetch(base+'/v1/top?period=all&game=pong')).json(); if(tb.entries&&tb.entries.some(e=>e.duo)) break; }
  const pe=tb&&tb.entries.find(e=>e.duo), sent=server&&require('../server/server.js').db.prepare("SELECT COUNT(*) AS n FROM games WHERE game='pong2'").get().n;
  check('the pair\'s game reaches the records: sent by both, replayed by the server, one line «DEN + ANN»',!!pe&&pe.nick==='DEN + ANN'&&pe.score===ea.score&&sent===2,pe?`${pe.nick} ${pe.score}, ${sent} sent`:JSON.stringify(tb));
  const rp=await A.evaluate(()=>__sonaroids.duoReplay()), rpb=await B.evaluate(()=>__sonaroids.duoReplay());
  check('the game replays from the two palms kept (as the server will — Pong.replay2), on either phone',rp.n===ea.n&&rp.score===ea.score&&rp.passes===ea.passes&&JSON.stringify(rp)===JSON.stringify(rpb),`${JSON.stringify(rp)}`);
  await act(A,'pd_again'); await A.waitForTimeout(500); const one=await scr(A); await act(B,'pd_again');
  const again=await wait(A,()=>__sonaroids.scr()==='count'||__sonaroids.scr()==='play',4000)&&await wait(B,()=>__sonaroids.scr()==='count'||__sonaroids.scr()==='play',4000);
  check('«ЕЩЁ РАЗ» — when both press it',one==='over'&&again);
  /* «ЗАКОНЧИТЬ ПАРТИЮ» from the pause — over for both, at the same step */
  await wait(A,()=>__sonaroids.scr()==='play',6000); await A.waitForTimeout(1500); await act(B,'pause'); await wait(A,()=>__sonaroids.scr()==='pdpause',3000); await act(A,'pd_end');
  const ended=await wait(A,()=>__sonaroids.scr()==='over',8000)&&await wait(B,()=>__sonaroids.scr()==='over',8000);
  const fa=await A.evaluate(()=>{ const g=__sonaroids.duoGame(); return g&&[g.n,g.score,g.passes]; }), fb=await B.evaluate(()=>{ const g=__sonaroids.duoGame(); return g&&[g.n,g.score,g.passes]; });
  check('«ЗАКОНЧИТЬ ПАРТИЮ» in the pause — over on both, the same game',ended&&JSON.stringify(fa)===JSON.stringify(fb),JSON.stringify(fa)+' | '+JSON.stringify(fb));
  await act(B,'pd_exit') .catch(()=>{}); const gone=await wait(A,()=>__sonaroids.duo().pst==='gone',4000);
  check('a phone that leaves — the other sees «УШЁЛ»',gone);
  check('out of the room — all the tones again',await B.evaluate(()=>Sonar.parity())==='all');
  check('no page errors',!A.errs.length&&!B.errs.length,A.errs.concat(B.errs).slice(0,3).join(' | '));
  await b.close(); server.close(); try{ fs.unlinkSync(process.env.DB); }catch(e){} console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exit(ok?0:1); })();
