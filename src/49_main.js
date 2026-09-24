/* ── SCREENS AND THE GAME LOOP ──
   First launch: language → sound volume → put the phone down → microphone → take your hand away → wave → game.
   Later launches: title → take your hand away → wave → game. After each command a pause ring fills (1.5 s),
   and only then the game starts listening. Buttons sit on the free hand's side. */
var store={get:function(k,d){ try{ var v=localStorage.getItem(k); return v===null?d:v; }catch(e){ return d; } },
           set:function(k,v){ try{ localStorage.setItem(k,String(v)); }catch(e){} }};
var lang=store.get('sonaroids_lang',((navigator.language||'').toLowerCase().indexOf('ru')===0?'ru':'en')); if(!STR[lang]) lang='en';
function L(k){ return STR[lang][k]||k; }
var PAUSE=3.5, AWAY_T0=0.6, AWAY_T1=2.8, WAVE_PAUSE=2.5,           // v0.16: more time to take the hand away, and the drawn hand leaves slower (0.6–2.8 s)
 STEPS=['lang','sound','phone','mic','away','wave'];
var scr=null, scrT=0, clock=0, onboarding=false, direct=false, booted=false, errKind=null;
var handSaved=store.get('sonaroids_hand',''), acoustic=false;
var prep=null, T=null, caught=false, g=null, acc=0, countT=0, overT=0, shake=0, flash=0, rockSpr={}, best=+store.get('sonaroids_best','0')||0;
var lastHand=null, shipY=null, sayLast='', pausedFrom=null, livesT=0, duckT=0;
function go(s){ scr=s; scrT=0; BTN=[]; }

/* ── which side the playing hand is on ──
   The rotation tells where the charging port is; the phone's end the hand should be at is learned (v0.17, 24 Sep, night):
   on iPhone it is the port end, on a Redmi the front-camera end — there the palm is not heard by the port at all.
   handRel: 'port' | 'camera' | '' — kept per device once a wave has been caught. Before that: the louder probe channel says
   (it pointed at the camera end on the Redmi 9 times of 10), and if the palm is not heard at all while waving, the side flips */
var handRel=store.get('sonaroids_rel',''), accSide=null, NOHAND_T=6, flipT=-9, seenT=0;
function portOr(){ var a=null;
  try{ if(screen.orientation&&typeof screen.orientation.angle==='number') a=screen.orientation.angle; }catch(e){}
  if(a===null&&typeof window.orientation==='number') a=window.orientation;
  return a===90?'right':(a===270||a===-90)?'left':null; }
function other(s){ return s==='left'?'right':'left'; }
function portSide(){ var o=portOr(); return o||(handSaved==='left'?'left':'right'); }
function handSide(){ var o=portOr();
  if(o&&handRel) return handRel==='port'?o:other(o);
  if(acoustic&&accSide) return accSide;
  return o||(handSaved==='left'?'left':'right'); }
function camEnd(){ var o=portOr(); return !!o&&handSide()!==o; }          // the hand is at the front-camera end of the phone
/* the palm has not been heard for NOHAND_T s while waving: offer the other end of the phone */
function flipSide(){ var o=portOr(), was=handSide();
  if(o) handRel=(handSide()===o)?'camera':'port'; else accSide=other(handSide());
  flipT=scrT; seenT=scrT; T=Tune.create(+store.get('sonaroids_field','100')||100,true); Logs.ev('сторона',{from:was,to:handSide(),rel:handRel}); Sfx.play('tap'); }
function freeSide(){ return handSide()==='right'?'left':'right'; }
function say(s){ if(s!==sayLast){ sayLast=s; var el=document.getElementById('say'); if(el) el.textContent=s; } }

/* ── layout helpers (game pixels) ── */
function topY(){ return SAFE.t+Math.max(8,Math.round(LH*0.05)); }
function titles(t,s,col){ var y=topY(), mw=LW-SAFE.l-SAFE.r-24, cx0=Math.round((SAFE.l+LW-SAFE.r)/2);
  PF.wrap(t,mw,1).forEach(function(l){ text(l,cx0,y,col||P.text,'center'); y+=10; });
  if(s){ y+=3; y=para(s,cx0,y,mw,P.soft); } say(t+(s?'. '+s:'')); return y; }
function btnW(labels){ var w=0; labels.forEach(function(s){ w=Math.max(w,PF.width(s)); }); return Math.max(Math.round(LW*0.2),Math.round((w+14)*1.16)); }
function sideX(w){ return freeSide()==='left'?SAFE.l+Math.max(8,Math.round(LW*0.04)):LW-SAFE.r-Math.max(8,Math.round(LW*0.04))-w; }
/* a column of buttons on the free side, vertically centred on y0 */
function column(items,y0,x0){ var w=btnW(items.map(function(b){ return b[1]; })), h=BH, gap=10, y=Math.round(y0-(items.length*(h+gap)-gap)/2), x=x0===undefined?sideX(w):x0;
  items.forEach(function(b){ button(b[0],b[1],x,y,w,h,b[2]||'',Math.floor(clock*2)%2===0); y+=h+gap; }); }
function nextBtn(id,label){ var w=btnW([label]); button(id,label,sideX(w),Math.round(LH*0.64),w,BH,'primary',Math.floor(scrT*2)%2===0); }
function ringAt(){ return freeSide()==='left'?[Math.round(LW*0.13),Math.round(LH*0.42)]:[Math.round(LW*0.87),Math.round(LH*0.42)]; }
function ringUI(p,st){ var r=ringAt(), col=st==='wait'?P.soft:st==='ok'?P.band:P.bullet;
  ring(r[0],r[1],11,p,col); if(st==='ok') tick(r[0],r[1],P.band);
  text(L(st==='wait'?'ring_wait':st==='listen'?'ring_listen':st==='catch'?'ring_catch':'ring_ok'),r[0],r[1]+17,col,'center'); }
function stepSquares(id){ if(!onboarding) return; var n=STEPS.length, q=6, gap=6, x=Math.round(LW/2-(n*q+(n-1)*gap)/2), y=LH-SAFE.b-q*3;
  for(var i=0;i<n;i++) R(STEPS[i]===id?P.band:P.line,x+i*(q+gap),y,q,q); }
function handFrac(){ var st=Sonar.state(); return (st&&st.present&&T)?Tune.fracOf(T,st.height):null; }

/* ── screens ── */
function sLang(){ sky(DT,0.3); var y=Math.round(LH*0.3); text('SONAROIDS',LW/2,y,P.band,'center',2);
  var bw=btnW(['ENGLISH','РУССКИЙ']), gap=12, by=Math.round(LH*0.5);
  button('en','ENGLISH',Math.round(LW/2-gap/2-bw),by,bw,BH,lang==='en'?'primary':''); button('ru','РУССКИЙ',Math.round(LW/2+gap/2),by,bw,BH,lang==='ru'?'primary':'');
  say('Sonaroids. English / Русский'); stepSquares('lang'); }
function sTitle(){ sky(DT,0.4); var y=Math.round(LH*0.3), cx0=freeSide()==='left'?Math.round(LW*0.6):Math.round(LW*0.4);
  text('SONAROIDS',cx0,y,P.band,'center',2); text(L('early'),cx0,y+22,P.soft,'center');
  text(L('version')+' '+VERSION,freeSide()==='left'?LW-SAFE.r-8:SAFE.l+8,LH-SAFE.b-12,P.soft,freeSide()==='left'?'right':'left');   // for telling uploads apart
  var sy=Math.round(LH*0.62+Math.sin(clock*1.3)*LH*0.08); drawShip(cx0-40,sy,clock,false);
  for(var i=0;i<3;i++){ var bx=cx0-20+((clock*90+i*40)%120); R(P.bullet,bx,sy,4,1); light(bx,sy,6*K,P.glowB,0.45); }
  column([['play',L('play'),'primary'],['howto',L('howto')],['lang',L('lang')],['sfx',L(Sfx.on()?'sfx_on':'sfx_off')]],Math.round(LH*0.47));
  say('Sonaroids. '+L('play')); }
function sSound(){ sky(DT,0.3); titles(L(direct?'volume_direct':'volume'),L('volume_s')); soundVolume(scrT); nextBtn('next',L('next')); stepSquares('sound'); }
function sPhone(){ sky(DT,0.3); var m=handSide()==='left';
  picture(function(){ return scene('phone',scrT,0.5,0,false,clock); },m); titles(L('phone_t'),L(camEnd()?'phone_s_cam':'phone_s'));
  if(scrT>1.2) nextBtn('next',L('next')); stepSquares('phone'); }
function sMic(){ sky(DT,0.3); var m=handSide()==='left';
  picture(function(){ return scene('away',scrT,0.5,0,true,clock); },m); titles(L('mic_t'),L('mic_s'));
  var w=btnW([L('allow')]); button('allow',L('allow'),sideX(w),Math.round(LH*0.64),w,BH,'primary',Math.floor(scrT*2)%2===0); stepSquares('mic'); }
function sAway(){ sky(DT,0.3); var m=handSide()==='left', aw=Math.min(1,Math.max(0,(scrT-AWAY_T0)/(AWAY_T1-AWAY_T0)));
  picture(function(){ return scene('away',scrT,0.5,aw,scrT>PAUSE,clock); },m);
  var st=scrT<PAUSE?'wait':(prep&&prep.res&&prep.res.ok)?'ok':'listen';
  titles(L('away_t'),st==='ok'?L('away_ok'):L('away_s'));
  ringUI(st==='wait'?scrT/PAUSE:st==='ok'?1:Math.min(0.95,(scrT-PAUSE)/3.2),st);
  if(scrT>=PAUSE&&!prep) startPrepare();
  if(prep&&prep.res){ if(prep.res.ok){ if(scrT-prep.doneT>1.5) toWave(); }       // «the room is quiet» stays for 1.5 s
    else { direct=true; onboarding=false; go('sound'); } }
  stepSquares('away'); }
function sWave(){ sky(DT,0.3); poolFill(1); var m=handSide()==='left', f=handFrac(), live=f!==null;
  if(scrT>=WAVE_PAUSE){ var e=Tune.step(T,DT,Sonar.state(),true,Sonar.shift); if(e) Logs.ev('подстройка',e); }
  if(T.ok&&!caught){ caught=true; caughtT=scrT; Sfx.play('ok'); store.set('sonaroids_seen','1');
    if(portOr()&&handRel) store.set('sonaroids_rel',handRel); handSaved=handSide(); store.set('sonaroids_hand',handSaved); }   // this end of the phone works: remember it
  var stt=Sonar.state(); if((stt&&stt.present)||scrT<WAVE_PAUSE) seenT=Math.max(seenT,scrT);
  if(!caught&&scrT-seenT>NOHAND_T) flipSide();
  if(caught&&scrT-caughtT>=CAUGHT_SHOW){ sTry(); return; }
  picture(function(){ return scene('wave',scrT,live?f:waveH(scrT),0,scrT>WAVE_PAUSE,clock); },m);
  var st=scrT<WAVE_PAUSE?'wait':caught?'ok':'catch', dur=T.buf.length?T.buf[T.buf.length-1].t-T.buf[0].t:0;
  if(scrT-flipT<4&&!caught) titles(L('other_t'),L('other_s'),P.pick); else titles(L('wave_t'),caught?L('wave_ok'):L('wave_s'));
  ringUI(st==='wait'?scrT/WAVE_PAUSE:st==='ok'?1:Math.min(0.95,dur/5.2),st);
  stepSquares('wave'); }
/* v0.17: once the range is caught the table picture goes and the real ship at game size follows the palm —
   the player sees at once whether the calibration came out right. "Play", and under it "recalibrate" (the empty room anew, then wave) */
var CAUGHT_SHOW=1.0, caughtT=0;
function followShip(){ var f=handFrac(); if(f!==null) lastHand=f;
  var ty=(Core.FH-Core.MARGIN-(lastHand===null?0.5:lastHand)*(Core.FH-2*Core.MARGIN))*K; shipY=shipY===null?ty:shipY+(ty-shipY)*0.3; return f!==null; }
function sTry(){ followShip(); /* the sky is already drawn by sWave */ drawShip(fx(Core.SHIP_X),shipY,clock,false);
  titles(L('wave_ok'),L('try_s'));
  // buttons on the free side, but never over the ship's lane (it flies at the left edge of the field)
  var items=[['start',L('play'),'primary'],['again',L('recal')]], bw=btnW(items.map(function(q){ return q[1]; })), lane=Math.round(fx(Core.SHIP_X))+34;
  column(items,Math.round(LH*0.62),freeSide()==='left'?Math.max(sideX(bw),lane):undefined);
  stepSquares('wave'); }
/* the flight field: rocks, bullets, ship. The core counts in field units (180 high); K turns them into game pixels */
/* the flight field: rocks, bullets, ship. The core counts in field units (180 high); fx() and K turn them into game pixels.
   The field starts right of the safe area, so the ship is never under the camera island (24 Sep) */
function fx(x){ return x*K+SAFE.l; }
/* rock pictures: 6 per size, drawn ahead of time (a few per frame on the calm screens) — drawing one mid-flight took a frame (v0.16) */
var POOL_N=6, pool={K:0,list:[[],[],[]]};
function poolFill(budget){ if(pool.K!==K){ pool={K:K,list:[[],[],[]]}; } for(var n=0;n<budget;n++){ var sz=[0,1,2].filter(function(i){ return pool.list[i].length<POOL_N; })[0]; if(sz===undefined) return;
  pool.list[sz].push(makeRock(Math.max(3,Math.round(Core.R_SIZE[sz]*K)))); } }
function rockFromPool(r){ poolFill(0); var l=pool.list[r.sz]; if(!l||!l.length) return makeRock(Math.max(3,Math.round(r.r*K)));
  var b=l[r.id%l.length]; return {frames:b.frames,size:b.size,rot:(r.id*5)%16,vr:((r.id*7)%11-5)}; }
function field(dt,speed){ sky(dt,speed);
  if(!g) return;
  if(g.state!=='play'){ g.bullets=[]; g.ebullets=[]; g.rocks.forEach(function(r){ r.x+=r.vx*dt; r.y+=r.vy*dt; }); if(g.ufo) g.ufo.x-=6*dt; }   // after the game: things drift on, for the look only
  g.rocks.forEach(function(r){ var sp=rockSpr[r.id]; if(!sp){ sp=rockSpr[r.id]=rockFromPool(r); }
    sp.rot=(sp.rot+sp.vr*dt+16)%16; var fr=sp.frames[Math.floor(sp.rot)%16]; lx.drawImage(fr,Math.round(fx(r.x)-sp.size/2),Math.round(r.y*K-sp.size/2)); });
  g.picks.forEach(function(p){ var x=Math.round(fx(p.x)), y=Math.round(p.y*K+Math.sin(clock*3)*2);
    R(P.pick,x-5,y-5,11,11); R(P.bg,x-4,y-4,9,9); blit(ICON[p.type],[P.pick],x-3,y-3); light(x,y,14*K,P.glowP,0.35); });
  if(g.ufo){ var u=g.ufo, big=u.kind==='big', ux=Math.round(fx(u.x)), uy=Math.round(u.y*K);
    var hurtNow=u.hitT>0&&Math.floor(clock*20)%2===0;                                                  // just hit: it flashes white
    blit(big?UFO_BIG:UFO_SMALL,hurtNow?[P.text,P.text,P.text,P.text]:P.ufo,ux-(big?9:6),uy-(big?4:2));
    if(Math.floor(clock*6)%2){ R(P.ufo[3],ux-(big?5:3),uy+1,1,1); R(P.ufo[3],ux+(big?4:2),uy+1,1,1); }
    light(ux,uy,(big?22:16)*K,hex(P.ufo[2]).join(','),0.35); }
  g.ebullets.forEach(function(b){ R(P.ebullet,fx(b.x)-1,b.y*K-1,2,2); light(fx(b.x),b.y*K,7*K,hex(P.ebullet).join(','),0.5); });
  g.bullets.forEach(function(b){ R(P.bullet,fx(b.x)-2,b.y*K,4,1); light(fx(b.x),b.y*K,6*K,P.glowB,0.45); });
  if(g.state==='play'){ var sx=fx(g.ship.x), sy=g.ship.y*K;
    drawShip(sx,sy,clock,g.ship.inv>0&&Math.floor(clock*14)%2===0);
    if(g.ship.shield>0&&(g.ship.shield>3||Math.floor(clock*8)%2)){                 // the shield: a ring of dots, blinking in its last 3 s
      for(var a=0;a<28;a+=2){ var an=a/28*6.283+clock*2; R(P.pick,sx+7+Math.cos(an)*11,sy+Math.sin(an)*9,1,1); } light(sx+7,sy,16*K,P.glowP,0.25); }
    if(livesT>0){ for(var i=0;i<g.lives;i++) blit(MINI,[P.ship[1],P.ship[2]],sx-2+i*7,sy-14); } }   // lives: shown only for a moment after a hit
  drawParts(dt);
}
function sCount(){ countT-=DT; poolFill(2); followShip();
  sky(DT,0.6); drawShip(fx(Core.SHIP_X),shipY,clock,false);
  var n=Math.max(1,Math.ceil(countT)), cx0=Math.round(LW/2), cy0=Math.round(LH/2);
  ring(cx0,cy0,13,1-(countT-Math.floor(countT)),P.band); text(String(n),cx0,cy0-3,P.text,'center'); say(String(n));
  if(Math.ceil(countT)<Math.ceil(countT+DT)&&countT>0) Sfx.play('tick');
  if(countT<=0) startGame(); }
function sPlay(){
  acc+=DT; var n=0;
  while(acc>=Core.DT&&n<5){ acc-=Core.DT; n++; var h=handFrac(); Core.step(g,h); Logs.step(g,h); react(); if(g.state!=='play') break; }
  if(n===5) acc=0;
  shake=Math.max(0,shake-DT); flash=Math.max(0,flash-DT); livesT=Math.max(0,livesT-DT);
  duckT-=DT; if(duckT<=0&&Sonar.peak()>0.3){ duckT=0.5; if(Sfx.duck()) Logs.gameEv('sounds down',+Sfx.level().toFixed(2)); }   // own sounds too loud in the microphone
  field(DT,g.slow>0?0.5:1);
  text(String(g.score).padStart(6,'0'),LW/2,topY(),P.text,'center');                // at the top only the score (agreed 24 Sep)
  // the menu button: in the top corner on the free hand's side
  // v0.11: further into the corner — the camera island sits in the middle of the side, so the top of the safe margin is free
  iconButton('pause',freeSide()==='left'?Math.round(SAFE.l*0.5)+10:LW-Math.round(SAFE.r*0.5)-10-(BH-3),SAFE.t+7); say(L('menu_a'));
  if(flash>0){ lx.globalAlpha=Math.min(0.35,flash); R(P.hit,0,0,LW,LH); lx.globalAlpha=1; }
  if(g.state==='over') endGame();
}
function endGame(){ g.state='over'; overT=0; Logs.gameStop(); if(g.score>best){ best=g.score; store.set('sonaroids_best',best); } go('over'); }
function react(){ g.events.forEach(function(k){
  if(k==='fire'){ if(Math.random()<0.5) Sfx.play('fire'); } else if(k!=='crash') Sfx.play(k); });
  (g.gone||[]).forEach(function(r){ burst(fx(r.x),r.y*K,8+Math.round(r.r*K),P.rock.slice(2).concat([P.flame[1]]),50*K); delete rockSpr[r.id]; shake=Math.max(shake,0.08+r.r*0.004); });
  (g.fx||[]).forEach(function(f){ if(f.ufo){ burst(fx(f.x),f.y*K,40,P.ufo,90*K); shake=0.35; } else if(f.pick) burst(fx(f.x),f.y*K,14,[P.pick,P.text],50*K); });
  if(g.events.indexOf('ufo_hit')>=0&&g.ufo){ burst(fx(g.ufo.x),g.ufo.y*K,14,[P.text].concat(P.ufo.slice(1)),60*K); shake=Math.max(shake,0.12); }
  if(g.events.indexOf('shield')>=0) burst(fx(g.ship.x)+6,g.ship.y*K,20,[P.pick,P.text],60*K);
  if(g.events.indexOf('hit')>=0||g.events.indexOf('over')>=0){ flash=0.25; shake=0.4; livesT=1.8; burst(fx(g.ship.x)+6,g.ship.y*K,26,P.ship.concat(P.flame),70*K); }
}
function sOver(){ overT+=DT;                       // no tuning here: it is done on the wave screen before every game (24 Sep)
  field(DT,0.3); var cx0=freeSide()==='left'?Math.round(LW*0.6):Math.round(LW*0.4), y=Math.round(LH*0.3);
  text(L('over'),cx0,y,P.text,'center'); text('V'+VERSION,freeSide()==='left'?LW-SAFE.r-8:SAFE.l+8,LH-SAFE.b-12,P.soft,freeSide()==='left'?'right':'left'); text(String(g.score).padStart(6,'0'),cx0,y+14,P.band,'center'); text(L('best')+' '+String(best).padStart(6,'0'),cx0,y+26,P.soft,'center');
  say(L('over')+' '+g.score);
  if(overT>0.8) column([['again',L('again'),'primary'],['menu',L('menu')]].concat(Logs.has()?[['logs',L('logs')]]:[]),Math.round(LH*0.5)); }
function sPaused(){ field(DT,0); lx.globalAlpha=0.5; R(P.bg,0,0,LW,LH); lx.globalAlpha=1; titles(L('paused')); column([['resume',L('resume'),'primary']].concat(pausedFrom==='play'?[['quit',L('quit')]]:[]).concat([['exit',L('exit')]]),Math.round(LH*0.5)); }
function sLost(){ sky(DT,0.2); titles(L('lost_t'),L('lost_s'),P.hit); nextBtn('retry',L('retry')); }
function sNomic(){ sky(DT,0.2); titles(L('nomic_t'),L(errKind==='mic'?'nomic_s':'noaudio_s'),P.hit); nextBtn('retry',L('retry')); }
function sRotate(){ lx.fillStyle=P.bg; lx.fillRect(0,0,LW,LH); var y=Math.round(LH/2-10); para(L('rotate'),LW/2,y,LW-16,P.text); say(L('rotate')); }

/* ── actions ── */
function startPrepare(){
  prep={res:null,doneT:0}; acoustic=false;
  Sonar.prepare(function(stage){ if(stage==='room'){ var I=Sonar.info();
      Logs.setupStart({kind:'подготовка',cal:I.cal,autocenter:true,tune:'waves',asym:Tune.ASYM,field_auto:true,field_mm:+store.get('sonaroids_field','100')||100,
        chan:I.chan,hand:handSide(),probe_gain:I.probe_gain,probe_snr:I.probe_snr,f_lo:I.f_lo,prom:null,started:new Date().toISOString(),app:'sonaroids'}); } })
  .then(function(r){ prep.res=r; prep.doneT=scrT; if(r.ok){ acoustic=true; accSide=Sonar.chan(); var o=portOr(); if(o&&!handRel) handRel=accSide===o?'port':'camera'; handSaved=handSide(); store.set('sonaroids_hand',handSaved); } })
  .catch(function(){ prep.res={ok:false,why:'error'}; });
}
/* make sure the microphone works before going on; if the phone took it away (the app was in the background), open it again —
   this runs from a tap, which browsers require — and get ready again (take your hand away → wave) */
var resumeAfterPrep=false;
function ensure(then){ if(booted&&Sonar.healthy()) then(); else { Sonar.restart(); booted=false; boot(toAway); } }
function boot(then){ Sonar.boot().then(function(){ booted=true; Sfx.play('tap'); then(); })
  .catch(function(e){ errKind=(e&&e.message&&/webaudio|worklet/.test(e.message))?'audio':'mic'; go('nomic'); }); }
function toAway(){ prep=null; go('away'); }
function toWave(){ T=Tune.create(+store.get('sonaroids_field','100')||100,true); caught=false; flipT=-9; seenT=0; go('wave'); }
function pauseGame(){ if(scr==='play'||scr==='count'||scr==='count-resume'){ pausedFrom=scr==='count-resume'?'play':scr; go('paused'); } }
function startCount(){ if(resumeAfterPrep&&g&&g.state==='play'){ resumeAfterPrep=false; countT=3; go('count-resume'); return; }
  resumeAfterPrep=false; countT=3; if(scr!=='wave') shipY=null; lastHand=handFrac()===null?lastHand:handFrac(); /* from the try-out the ship goes on where it is */ Logs.ev('отсчёт',{field:+T.field.toFixed(1),auto:T.auto}); store.set('sonaroids_field',Math.round(T.field)); go('count'); }
function startGame(){
  var seed=0; try{ var a=new Uint32Array(1); crypto.getRandomValues(a); seed=a[0]; }catch(e){ seed=Math.floor(Math.random()*4294967296); }
  var y0=shipY===null?null:+(shipY/K).toFixed(3);
  g=Core.create(seed,Core.FH*(LW-SAFE.l)/LH,y0); acc=0; rockSpr={}; parts=[]; livesT=0; var I=Sonar.info();
  Logs.gameStart({core:'rules-1',seed:seed,y0:y0,FW:+g.FW.toFixed(3),cal:DSP2.info().cal,autocenter:false,tune:'frozen',asym:Tune.ASYM,field_mm:+T.field.toFixed(1),
    chan:I.chan,hand:handSide(),probe_gain:I.probe_gain,probe_snr:I.probe_snr,f_lo:I.f_lo,W:LW,H:LH,started:new Date().toISOString(),app:'sonaroids'});
  Sfx.play('start'); go('play');
}
var ACT={
  en:function(){ lang='en'; store.set('sonaroids_lang','en'); go('sound'); },
  ru:function(){ lang='ru'; store.set('sonaroids_lang','ru'); go('sound'); },
  next:function(){ if(scr==='sound'){ if(direct) (booted?toAway():go('mic')); else go('phone'); } else if(scr==='phone') go(booted?'away':'mic'); },
  allow:function(){ boot(toAway); },
  play:function(){ onboarding=false; direct=false; ensure(toAway); },
  howto:function(){ onboarding=true; direct=false; go('sound'); },
  /* a deep recalibration: forget the saved palm range, close the microphone and start from "put the phone down" */
  recal:function(){ onboarding=false; direct=false; store.set('sonaroids_field','100'); Sonar.restart(); booted=false; acoustic=false; go('phone'); },
  lang:function(){ lang=lang==='en'?'ru':'en'; store.set('sonaroids_lang',lang); },
  sfx:function(){ Sfx.toggle(); },
  start:function(){ ensure(startCount); },
  again:function(){ ensure(toAway); },                 // before every game: the empty room anew, then wave (v0.16: things drift over a game)
  menu:function(){ go('title'); },
  logs:function(){ Logs.share(); },
  retry:function(){ Sonar.clearLost(); ensure(toAway); },
  pause:function(){ pauseGame(); },
  quit:function(){ Logs.gameEv('ended by the player'); endGame(); },
  exit:function(){ if(g&&g.state==='play'){ Logs.gameEv('ended by the player'); endGame(); } go('title'); },
  resume:function(){ if(pausedFrom==='play'){ if(booted&&Sonar.healthy()){ countT=3; go('count-resume'); } else { resumeAfterPrep=true; ensure(null); } } else ensure(startCount); }
};
/* buttons act when the finger lifts (on the same button it went down on): iPhone lets a page share files or open the microphone
   only from a finished tap — acting on touch-down made "logs" work only on the second tap (v0.12) */
var downOn=null;
function btnAt(e){ var x=e.clientX*DPR/S, y=e.clientY*DPR/S;
  for(var i=BTN.length-1;i>=0;i--){ var b=BTN[i]; if(x>=b.x-4&&x<b.x+b.w+4&&y>=b.y-4&&y<b.y+b.h+4) return b.id; } return null; }
cv.addEventListener('pointerdown',function(e){ downOn=btnAt(e); e.preventDefault(); },{passive:false});
cv.addEventListener('pointerup',function(e){ var id=btnAt(e); if(id&&id===downOn&&ACT[id]){ if(id!=='allow'&&id!=='play'&&id!=='retry') Sfx.play('tap'); ACT[id](); } downOn=null; e.preventDefault(); },{passive:false});
cv.addEventListener('pointercancel',function(){ downOn=null; });
['gesturestart','gesturechange','gestureend','dblclick'].forEach(function(n){ document.addEventListener(n,function(e){ e.preventDefault(); },{passive:false}); });
document.addEventListener('touchmove',function(e){ e.preventDefault(); },{passive:false});
document.addEventListener('visibilitychange',function(){
  if(document.hidden){ Sonar.pause(); pauseGame(); if(scr==='away'||scr==='wave') go('title'); }   // getting ready starts over after a break
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
/* at most 60 frames a second in flight and 30 on the other screens: phones with 120 Hz screens would otherwise draw twice as often
   for nothing and warm up (v0.12) */
function loop(now){
  requestAnimationFrame(loop);
  var fast=scr==='play'||scr==='count'||scr==='count-resume'; if(now-lastNow<(fast?15:31)) return;
  DT=Math.min(0.05,Math.max(0,(now-lastNow)/1000)); lastNow=now; clock+=DT; scrT+=DT; BTN=[];
  if(LH>LW){ pauseGame(); sRotate(); present(0); return; }
  if(booted&&Sonar.lost()&&(scr==='wave'||scr==='count'||scr==='play'||scr==='over')){ if(g&&g.state==='play') Logs.gameStop(); go('lost'); }
  switch(scr){
    case 'lang': sLang(); break; case 'title': sTitle(); break;
    case 'sound': sSound(); break;
    case 'phone': sPhone(); break; case 'mic': sMic(); break; case 'away': sAway(); break; case 'wave': sWave(); break;
    case 'count': sCount(); break; case 'count-resume': sCountResume(); break; case 'play': sPlay(); break; case 'over': sOver(); break;
    case 'paused': sPaused(); break; case 'lost': sLost(); break; case 'nomic': sNomic(); break;
  }
  present(scr==='play'?shake:0);
}
resize();
if('serviceWorker' in navigator&&location.protocol==='https:') navigator.serviceWorker.register('sw.js').then(function(r){ r.update(); }).catch(function(){});   // works offline; checks for a new version on every launch
if(store.get('sonaroids_seen','')!=='1'){ onboarding=true; go('lang'); } else go('title');
requestAnimationFrame(loop);
/* test hooks: headless tests drive the screens through these (harmless in the game) */
window.__sonaroids={go:go,act:ACT,scr:function(){ return scr; },btn:function(){ return BTN.slice(); },S:function(){ return {S:S,LW:LW,LH:LH,DPR:DPR,shipLane:Math.round(fx(Core.SHIP_X))+16}; },
  setBooted:function(v){ booted=v; },
  side:function(){ return {hand:handSide(),rel:handRel,cam:camEnd(),stored:store.get('sonaroids_rel',''),say:sayLast}; }, wave:function(){ toWave(); },
  fake:function(){ booted=true; prep={res:{ok:true},doneT:-9}; T=Tune.create(100,true); T.ok=true; caught=true;          // a stand-in state for layout checks
    g=Core.create(1,Core.FH*(LW-SAFE.l)/LH); for(var i=0;i<300;i++) Core.step(g,0.5); g.state='over'; },state:function(){ return {scr:scr,g:g,T:T,caught:caught,prep:prep,lang:lang}; }};
})();
