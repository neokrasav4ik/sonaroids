/* ── SCREENS AND THE GAME LOOP ──
   First launch: language → sound (silent mode, ringer volume) → put the phone down → microphone → take your hand away → wave → game.
   Later launches: title → take your hand away → wave → game. After each command a pause ring fills (1.5 s),
   and only then the game starts listening. Buttons sit on the free hand's side. */
var store={get:function(k,d){ try{ var v=localStorage.getItem(k); return v===null?d:v; }catch(e){ return d; } },
           set:function(k,v){ try{ localStorage.setItem(k,String(v)); }catch(e){} }};
var lang=store.get('sonaroids_lang',((navigator.language||'').toLowerCase().indexOf('ru')===0?'ru':'en')); if(!STR[lang]) lang='en';
function L(k){ return STR[lang][k]||k; }
var PAUSE=1.5, STEPS=['lang','sound','phone','mic','away','wave'];
var scr=null, scrT=0, clock=0, onboarding=false, direct=false, booted=false, errKind=null;
var handSaved=store.get('sonaroids_hand',''), acoustic=false;
var prep=null, T=null, caught=false, g=null, acc=0, countT=0, overT=0, shake=0, flash=0, rockSpr={}, best=+store.get('sonaroids_best','0')||0;
var lastHand=null, shipY=null, sayLast='', pausedFrom=null;
function go(s){ scr=s; scrT=0; BTN=[]; }

/* which side the charging port (and so the playing hand) is on: the phone's rotation until the sonar has checked it by sound */
function portSide(){ var a=null;
  try{ if(screen.orientation&&typeof screen.orientation.angle==='number') a=screen.orientation.angle; }catch(e){}
  if(a===null&&typeof window.orientation==='number') a=window.orientation;
  if(a===90) return 'right'; if(a===270||a===-90) return 'left'; return handSaved==='left'?'left':'right'; }
function handSide(){ return acoustic?Sonar.chan():portSide(); }
function freeSide(){ return handSide()==='right'?'left':'right'; }
function say(s){ if(s!==sayLast){ sayLast=s; var el=document.getElementById('say'); if(el) el.textContent=s; } }

/* ── layout helpers (game pixels) ── */
function topY(){ return SAFE.t+Math.max(8,Math.round(LH*0.05)); }
function titles(t,s,col){ var y=topY(), mw=LW-SAFE.l-SAFE.r-24, cx0=Math.round((SAFE.l+LW-SAFE.r)/2);
  PF.wrap(t,mw,1).forEach(function(l){ text(l,cx0,y,col||P.text,'center'); y+=10; });
  if(s){ y+=3; y=para(s,cx0,y,mw,P.soft); } say(t+(s?'. '+s:'')); return y; }
function btnW(labels){ var w=0; labels.forEach(function(s){ w=Math.max(w,PF.width(s)); }); return Math.max(Math.round(LW*0.17),w+14); }
function sideX(w){ return freeSide()==='left'?SAFE.l+Math.max(8,Math.round(LW*0.04)):LW-SAFE.r-Math.max(8,Math.round(LW*0.04))-w; }
/* a column of buttons on the free side, vertically centred on y0 */
function column(items,y0){ var w=btnW(items.map(function(b){ return b[1]; })), h=17, gap=5, y=Math.round(y0-(items.length*(h+gap)-gap)/2), x=sideX(w);
  items.forEach(function(b){ button(b[0],b[1],x,y,w,h,b[2]||'',Math.floor(clock*2)%2===0); y+=h+gap; }); }
function nextBtn(id,label){ var w=btnW([label]); button(id,label,sideX(w),Math.round(LH*0.72),w,17,'primary',Math.floor(scrT*2)%2===0); }
function ringAt(){ return freeSide()==='left'?[Math.round(LW*0.13),Math.round(LH*0.42)]:[Math.round(LW*0.87),Math.round(LH*0.42)]; }
function ringUI(p,st){ var r=ringAt(), col=st==='wait'?P.soft:st==='ok'?P.band:P.bullet;
  ring(r[0],r[1],11,p,col); if(st==='ok') tick(r[0],r[1],P.band);
  text(L(st==='wait'?'ring_wait':st==='listen'?'ring_listen':st==='catch'?'ring_catch':'ring_ok'),r[0],r[1]+17,col,'center'); }
function stepSquares(id){ if(!onboarding) return; var n=STEPS.length, q=6, gap=6, x=Math.round(LW/2-(n*q+(n-1)*gap)/2), y=LH-SAFE.b-q*3;
  for(var i=0;i<n;i++) R(STEPS[i]===id?P.band:P.line,x+i*(q+gap),y,q,q); }
function handFrac(){ var st=Sonar.state(); return (st&&st.present&&T)?Tune.fracOf(T,st.height):null; }

/* ── screens ── */
function sLang(){ sky(DT,0.3); var y=Math.round(LH*0.3); text('SONAROIDS',LW/2,y,P.band,'center',2);
  var bw=btnW(['ENGLISH','РУССКИЙ']), gap=12, by=Math.round(LH*0.55);
  button('en','ENGLISH',Math.round(LW/2-gap/2-bw),by,bw,17,lang==='en'?'primary':''); button('ru','РУССКИЙ',Math.round(LW/2+gap/2),by,bw,17,lang==='ru'?'primary':'');
  say('Sonaroids. English / Русский'); stepSquares('lang'); }
function sTitle(){ sky(DT,0.4); var y=Math.round(LH*0.3), cx0=freeSide()==='left'?Math.round(LW*0.6):Math.round(LW*0.4);
  text('SONAROIDS',cx0,y,P.band,'center',2); text(L('early'),cx0,y+22,P.soft,'center');
  var sy=Math.round(LH*0.62+Math.sin(clock*1.3)*LH*0.08); drawShip(cx0-40,sy,clock,false);
  for(var i=0;i<3;i++){ var bx=cx0-20+((clock*90+i*40)%120); R(P.bullet,bx,sy,4,1); light(bx,sy,6*K,P.glowB,0.45); }
  column([['play',L('play'),'primary'],['howto',L('howto')],['lang',L('lang')],['sfx',L(Sfx.on()?'sfx_on':'sfx_off')]],Math.round(LH*0.5));
  say('Sonaroids. '+L('play')); }
function sSound(part){ sky(DT,0.3); titles(part===1?L(direct?'silent_direct':'silent'):L('ringer'));
  if(part===1) soundSilent(scrT); else soundRinger(scrT); nextBtn('next',L('next')); stepSquares('sound'); }
function sPhone(){ sky(DT,0.3); var m=handSide()==='left';
  picture(function(){ return scene('phone',scrT,0.5,0,false,clock); },m); titles(L('phone_t'),L('phone_s'));
  if(scrT>1.2) nextBtn('next',L('next')); stepSquares('phone'); }
function sMic(){ sky(DT,0.3); var m=handSide()==='left';
  picture(function(){ return scene('away',scrT,0.5,0,true,clock); },m); titles(L('mic_t'),L('mic_s'));
  var w=btnW([L('allow')]); button('allow',L('allow'),sideX(w),Math.round(LH*0.72),w,17,'primary',Math.floor(scrT*2)%2===0); stepSquares('mic'); }
function sAway(){ sky(DT,0.3); var m=handSide()==='left', aw=Math.min(1,Math.max(0,(scrT-0.3)/0.8));
  picture(function(){ return scene('away',scrT,0.5,aw,scrT>PAUSE,clock); },m);
  var st=scrT<PAUSE?'wait':(prep&&prep.res&&prep.res.ok)?'ok':'listen';
  titles(L('away_t'),st==='ok'?L('away_ok'):L('away_s'));
  ringUI(st==='wait'?scrT/PAUSE:st==='ok'?1:Math.min(0.95,(scrT-PAUSE)/3.2),st);
  if(scrT>=PAUSE&&!prep) startPrepare();
  if(prep&&prep.res){ if(prep.res.ok){ if(scrT-prep.doneT>0.8){ T=Tune.create(+store.get('sonaroids_field','100')||100,true); caught=false; go('wave'); } }
    else { direct=true; onboarding=false; go('sound1'); } }
  stepSquares('away'); }
function sWave(){ sky(DT,0.3); var m=handSide()==='left', f=handFrac(), live=f!==null;
  if(scrT>=PAUSE){ var e=Tune.step(T,DT,Sonar.state(),true,Sonar.shift); if(e) Logs.ev('подстройка',e); }
  if(T.ok&&!caught){ caught=true; Sfx.play('ok'); store.set('sonaroids_seen','1'); }
  picture(function(){ return scene('wave',scrT,live?f:waveH(scrT),0,scrT>PAUSE,clock); },m);
  var st=scrT<PAUSE?'wait':caught?'ok':'catch', dur=T.buf.length?T.buf[T.buf.length-1].t-T.buf[0].t:0;
  titles(L('wave_t'),caught?L('wave_ok'):L('wave_s'));
  ringUI(st==='wait'?scrT/PAUSE:st==='ok'?1:Math.min(0.95,dur/2.5),st);
  if(caught){ var w=btnW([L('start')]); button('start',L('start'),sideX(w),Math.round(LH*0.72),w,17,'primary',Math.floor(scrT*2)%2===0); }
  stepSquares('wave'); }
/* the flight field: rocks, bullets, ship. The core counts in field units (180 high); K turns them into game pixels */
function field(dt,speed){ sky(dt,speed);
  if(!g) return;
  if(g.state!=='play'){ g.bullets=[]; g.rocks.forEach(function(r){ r.x+=r.vx*dt; r.y+=r.vy*dt; }); }   // after the game: rocks drift on, for the look only
  g.rocks.forEach(function(r){ var sp=rockSpr[r.id]; if(!sp){ sp=rockSpr[r.id]=makeRock(Math.max(3,Math.round(r.r*K))); }
    sp.rot=(sp.rot+sp.vr*dt+16)%16; var fr=sp.frames[Math.floor(sp.rot)%16]; lx.drawImage(fr,Math.round(r.x*K-sp.size/2),Math.round(r.y*K-sp.size/2)); });
  g.bullets.forEach(function(b){ R(P.bullet,b.x*K-2,b.y*K,4,1); light(b.x*K,b.y*K,6*K,P.glowB,0.45); });
  if(g.state==='play') drawShip(g.ship.x*K,g.ship.y*K,clock,g.ship.inv>0&&Math.floor(clock*14)%2===0);
  drawParts(dt);
}
function sCount(){ countT-=DT; var f=handFrac(); if(f!==null) lastHand=f;
  var ty=(Core.FH-Core.MARGIN-(lastHand===null?0.5:lastHand)*(Core.FH-2*Core.MARGIN))*K; shipY=shipY===null?ty:shipY+(ty-shipY)*0.3;
  sky(DT,0.6); drawShip(30*K,shipY,clock,false);
  var n=Math.max(1,Math.ceil(countT)), cx0=Math.round(LW/2), cy0=Math.round(LH/2);
  ring(cx0,cy0,13,1-(countT-Math.floor(countT)),P.band); text(String(n),cx0,cy0-3,P.text,'center'); say(String(n));
  if(Math.ceil(countT)<Math.ceil(countT+DT)&&countT>0) Sfx.play('tick');
  if(countT<=0) startGame(); }
function sPlay(){
  acc+=DT; var n=0;
  while(acc>=Core.DT&&n<5){ acc-=Core.DT; n++; var h=handFrac(); Core.step(g,h); Logs.step(g,h); react(); if(g.state!=='play') break; }
  if(n===5) acc=0;
  shake=Math.max(0,shake-DT); flash=Math.max(0,flash-DT);
  field(DT,1);
  text(String(g.score).padStart(6,'0'),LW/2,topY(),P.text,'center');                // at the top only the score (agreed 24 Sep)
  if(flash>0){ lx.globalAlpha=Math.min(0.35,flash); R(P.hit,0,0,LW,LH); lx.globalAlpha=1; }
  if(g.state==='over'){ overT=0; Logs.gameStop(); if(g.score>best){ best=g.score; store.set('sonaroids_best',best); } T=Tune.create(T.field,true); go('over'); }
}
function react(){ g.events.forEach(function(k){
  if(k==='break'||k==='hit'||k==='over') Sfx.play(k); else if(k==='fire'&&Math.random()<0.5) Sfx.play('fire'); });
  (g.gone||[]).forEach(function(r){ burst(r.x*K,r.y*K,8+Math.round(r.r*K),P.rock.slice(2).concat([P.flame[1]]),50*K); delete rockSpr[r.id]; shake=Math.max(shake,0.08+r.r*0.004); });
  if(g.events.indexOf('hit')>=0||g.events.indexOf('over')>=0){ flash=0.25; shake=0.4; burst(g.ship.x*K+6,g.ship.y*K,26,P.ship.concat(P.flame),70*K); }
}
function sOver(){ overT+=DT; var e=Tune.step(T,DT,Sonar.state(),true,Sonar.shift); if(e) Logs.ev('подстройка',e);
  if(T.ok) caught=true;
  field(DT,0.3); var cx0=freeSide()==='left'?Math.round(LW*0.6):Math.round(LW*0.4), y=Math.round(LH*0.3);
  text(L('over'),cx0,y,P.text,'center'); text(String(g.score).padStart(6,'0'),cx0,y+14,P.band,'center'); text(L('best')+' '+String(best).padStart(6,'0'),cx0,y+26,P.soft,'center');
  text(T.ok?L('wave_ok'):L('wave_s'),cx0,y+48,P.soft,'center');
  say(L('over')+' '+g.score);
  if(overT>0.8) column([['again',L('again'),'primary'],['menu',L('menu')]].concat(Logs.has()?[['logs',L('logs')]]:[]),Math.round(LH*0.55)); }
function sPaused(){ field(DT,0); titles(L('paused')); nextBtn('resume',L('resume')); }
function sLost(){ sky(DT,0.2); titles(L('lost_t'),L('lost_s'),P.hit); nextBtn('retry',L('retry')); }
function sNomic(){ sky(DT,0.2); titles(L('nomic_t'),L(errKind==='mic'?'nomic_s':'noaudio_s'),P.hit); nextBtn('retry',L('retry')); }
function sRotate(){ lx.fillStyle=P.bg; lx.fillRect(0,0,LW,LH); var y=Math.round(LH/2-10); para(L('rotate'),LW/2,y,LW-16,P.text); say(L('rotate')); }

/* ── actions ── */
function startPrepare(){
  prep={res:null,doneT:0}; acoustic=false;
  Sonar.prepare(function(stage){ if(stage==='room'){ var I=Sonar.info();
      Logs.setupStart({kind:'подготовка',cal:I.cal,autocenter:true,tune:'waves',asym:Tune.ASYM,field_auto:true,field_mm:+store.get('sonaroids_field','100')||100,
        chan:I.chan,probe_gain:I.probe_gain,probe_snr:I.probe_snr,f_lo:I.f_lo,prom:null,started:new Date().toISOString(),app:'sonaroids'}); } })
  .then(function(r){ prep.res=r; prep.doneT=scrT; if(r.ok){ acoustic=true; handSaved=Sonar.chan(); store.set('sonaroids_hand',handSaved); } })
  .catch(function(){ prep.res={ok:false,why:'error'}; });
}
function boot(then){ Sonar.boot().then(function(){ booted=true; Sfx.play('tap'); then(); })
  .catch(function(e){ errKind=(e&&e.message&&/webaudio|worklet/.test(e.message))?'audio':'mic'; go('nomic'); }); }
function toAway(){ prep=null; go('away'); }
function pauseGame(){ if(scr==='play'||scr==='count'||scr==='count-resume'){ pausedFrom=scr==='count-resume'?'play':scr; go('paused'); } }
function startCount(){ countT=3; shipY=null; lastHand=handFrac(); Logs.ev('отсчёт',{field:+T.field.toFixed(1),auto:T.auto}); store.set('sonaroids_field',Math.round(T.field)); go('count'); }
function startGame(){
  var seed=0; try{ var a=new Uint32Array(1); crypto.getRandomValues(a); seed=a[0]; }catch(e){ seed=Math.floor(Math.random()*4294967296); }
  g=Core.create(seed,Core.FH*LW/LH); acc=0; rockSpr={}; parts=[]; var I=Sonar.info();
  Logs.gameStart({core:'skeleton-1',seed:seed,FW:+g.FW.toFixed(3),cal:DSP2.info().cal,autocenter:false,tune:'frozen',asym:Tune.ASYM,field_mm:+T.field.toFixed(1),
    chan:I.chan,probe_gain:I.probe_gain,probe_snr:I.probe_snr,f_lo:I.f_lo,W:LW,H:LH,started:new Date().toISOString(),app:'sonaroids'});
  Sfx.play('start'); go('play');
}
var ACT={
  en:function(){ lang='en'; store.set('sonaroids_lang','en'); go('sound1'); },
  ru:function(){ lang='ru'; store.set('sonaroids_lang','ru'); go('sound1'); },
  next:function(){ if(scr==='sound1') go('sound2'); else if(scr==='sound2'){ if(direct) (booted?toAway():go('mic')); else go('phone'); } else if(scr==='phone') go(booted?'away':'mic'); },
  allow:function(){ boot(toAway); },
  play:function(){ onboarding=false; direct=false; if(booted) toAway(); else boot(toAway); },
  howto:function(){ onboarding=true; direct=false; go('sound1'); },
  lang:function(){ lang=lang==='en'?'ru':'en'; store.set('sonaroids_lang',lang); },
  sfx:function(){ Sfx.toggle(); },
  start:startCount, again:startCount,
  menu:function(){ go('title'); },
  logs:function(){ Logs.share(); },
  retry:function(){ Sonar.clearLost(); if(!booted) boot(toAway); else toAway(); },
  resume:function(){ if(pausedFrom==='play'){ countT=3; go('count-resume'); } else startCount(); }
};
cv.addEventListener('pointerdown',function(e){
  var x=e.clientX*DPR/S, y=e.clientY*DPR/S;
  for(var i=BTN.length-1;i>=0;i--){ var b=BTN[i]; if(x>=b.x-4&&x<b.x+b.w+4&&y>=b.y-4&&y<b.y+b.h+4){ if(b.id!=='allow'&&b.id!=='play'&&b.id!=='retry') Sfx.play('tap'); ACT[b.id](); e.preventDefault(); return; } }
},{passive:false});
['gesturestart','gesturechange','gestureend','dblclick'].forEach(function(n){ document.addEventListener(n,function(e){ e.preventDefault(); },{passive:false}); });
document.addEventListener('touchmove',function(e){ e.preventDefault(); },{passive:false});
document.addEventListener('visibilitychange',function(){
  if(document.hidden){ Sonar.pause(); pauseGame(); }
  else Sonar.resume(); });
window.addEventListener('resize',function(){ setTimeout(resize,60); });
window.addEventListener('orientationchange',function(){ setTimeout(resize,250); });
Sonar.listen(Logs.frame);

/* countdown after a pause: the game itself continues from where it stopped */
function sCountResume(){ countT-=DT; field(DT,0); var n=Math.max(1,Math.ceil(countT)), cx0=Math.round(LW/2), cy0=Math.round(LH/2);
  ring(cx0,cy0,13,1-(countT-Math.floor(countT)),P.band); text(String(n),cx0,cy0-3,P.text,'center');
  if(countT<=0){ acc=0; go('play'); } }

/* ── the loop ── */
var DT=1/60, lastNow=performance.now();
function loop(now){
  requestAnimationFrame(loop);
  DT=Math.min(0.05,Math.max(0,(now-lastNow)/1000)); lastNow=now; clock+=DT; scrT+=DT; BTN=[];
  if(LH>LW){ pauseGame(); sRotate(); present(0); return; }
  if(booted&&Sonar.lost()&&(scr==='wave'||scr==='count'||scr==='play'||scr==='over')){ if(g&&g.state==='play') Logs.gameStop(); go('lost'); }
  switch(scr){
    case 'lang': sLang(); break; case 'title': sTitle(); break;
    case 'sound1': sSound(1); break; case 'sound2': sSound(2); break;
    case 'phone': sPhone(); break; case 'mic': sMic(); break; case 'away': sAway(); break; case 'wave': sWave(); break;
    case 'count': sCount(); break; case 'count-resume': sCountResume(); break; case 'play': sPlay(); break; case 'over': sOver(); break;
    case 'paused': sPaused(); break; case 'lost': sLost(); break; case 'nomic': sNomic(); break;
  }
  present(scr==='play'?shake:0);
}
resize();
if('serviceWorker' in navigator&&location.protocol==='https:') navigator.serviceWorker.register('sw.js').catch(function(){});   // works offline, updates on the next launch
if(store.get('sonaroids_seen','')!=='1'){ onboarding=true; go('lang'); } else go('title');
requestAnimationFrame(loop);
/* test hooks: headless tests drive the screens through these (harmless in the game) */
window.__sonaroids={go:go,act:ACT,scr:function(){ return scr; },btn:function(){ return BTN.slice(); },S:function(){ return {S:S,LW:LW,LH:LH,DPR:DPR}; },
  setBooted:function(v){ booted=v; },
  fake:function(){ booted=true; prep={res:{ok:true},doneT:-9}; T=Tune.create(100,true); T.ok=true; caught=true;          // a stand-in state for layout checks
    g=Core.create(1,Core.FH*LW/LH); for(var i=0;i<300;i++) Core.step(g,0.5); g.state='over'; },state:function(){ return {scr:scr,g:g,T:T,caught:caught,prep:prep,lang:lang}; }};
})();
