/* ── SCREENS AND THE GAME LOOP ──
   First launch: language → sound volume → put the phone down → microphone → take your hand away → wave → game.
   Later launches: title → take your hand away → wave → game. After each command a pause ring fills (1.5 s),
   and only then the game starts listening. Buttons sit on the free hand's side. */
var store={get:function(k,d){ try{ var v=localStorage.getItem(k); return v===null?d:v; }catch(e){ return d; } },
           set:function(k,v){ try{ localStorage.setItem(k,String(v)); }catch(e){} }};
var lang=store.get('sonaroids_lang',((navigator.language||'').toLowerCase().indexOf('ru')===0?'ru':'en')); if(!STR[lang]) lang='en';
function L(k){ return STR[lang][k]||k; }
var PAUSE=3.5, AWAY_T0=0.6, AWAY_T1=2.8, WAVE_PAUSE=2.5,           // v0.16: more time to take the hand away, and the drawn hand leaves slower (0.6–2.8 s)
 STEPS=['sound','phone','mic','probe','away','wave'];
var scr=null, scrT=0, clock=0, onboarding=false, direct=false, dirLoud=false, booted=false, errKind=null;
var handSaved=store.get('sonaroids_hand',''), acoustic=false;
var prep=null, T=null, caught=false, g=null, acc=0, countT=0, overT=0, shake=0, flash=0, rockSpr={}, best=+store.get('sonaroids_best','0')||0;
/* own sounds louder than this in the microphone are turned down (v0.19: 0.05, was 0.3). iPhone: peaks 0.007–0.013 with sounds on — never ducks */
var DUCK_PEAK=0.05;
var lastHand=null, shipY=null, sayLast='', pausedFrom=null, livesT=0, duckT=0;
function go(s){ if(scr==='wave'&&s!=='wave'&&!caught&&T&&typeof Board!=='undefined') Board.setup('nocatch',{t:scrT,flips:flips});   // left the wave step without a caught range
  if(s!==scr) scrPrev=scr; scr=s; scrT=0; BTN=[]; if(s!=='nick'&&s!=='linkin'&&typeof nickField==='function'&&nickEl) nickField(false); }
var scrPrev=null, diag=false, flips=0;                        // diag: the "logs" button is shown (a tap on the version on the game-over screen)

/* ── which side the playing hand is on ──
   The rotation tells where the charging port is; the phone's end the hand should be at is learned (v0.17, 24 Sep, night):
   on iPhone it is the port end, on a Redmi the front-camera end — there the palm is not heard by the port at all.
   handRel: 'port' | 'camera' | '' — kept per device once a wave has been caught. Before that: the louder probe channel says
   (it pointed at the camera end on the Redmi 9 times of 10), and if the palm is not heard at all while waving, the side flips */
/* v0.44: which end hears the hand is not remembered between launches any more — the browser picks the microphone (the port's or the front
   camera's) anew each time, seemingly at random (Redmi, 27 Sep); the probe finds the end every time (startPrepare) */
var handRel='', accSide=null, NOHAND_T=6, flipT=-9, seenT=0;
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
  flips++; flipT=scrT; seenT=scrT; T=Tune.create(+store.get('sonaroids_field','100')||100,true); Logs.ev('сторона',{from:was,to:handSide(),rel:handRel}); Sfx.play('tap'); }
function freeSide(){ return handSide()==='right'?'left':'right'; }
function say(s){ if(s!==sayLast){ sayLast=s; var el=document.getElementById('say'); if(el) el.textContent=s; } }

/* ── layout helpers (game pixels) ── */
function topY(){ return SAFE.t+Math.max(8,Math.round(LH*0.05)); }
/* v0.47: the version as a switch for the "logs" link on the title and the getting-ready screens too (it was only on the game-over screen) —
   a setup that stopped ("too quiet", "too loud") or went badly can be sent right away. A tap on the version shows the link, another hides it.
   top — at the top corner (the getting-ready screens: the bottom has the buttons, the ring and the "wave here" beacon), else at the bottom */
function diagCorner(label,top,ty,flip,ax){ var vr=ty?(freeSide()!=='left')!==!!flip:freeSide()==='left',   /* under the menu button (ty) — its side; flip — the other side */ vx=ax!==undefined?ax:vr?LW-SAFE.r-8:SAFE.l+8, vy=top?(ty||SAFE.t+8):LH-SAFE.b-12, vw=PF.width(label), al=vr?'right':'left';
  text(label,vx,vy,diag?P.band:P.soft,al); var bx0=Math.max(0,(vr?vx-vw:vx)-8), bx1=Math.min(LW,(vr?vx:vx+vw)+8);
  var by0=top?Math.max(0,vy-8):vy-4; BTN.push({id:'ver',x:bx0,y:by0,w:bx1-bx0,h:Math.min(top?PF.CAP+16:PF.CAP+10,LH-by0)});
  if(top&&diag&&Logs.has()){ var ls=L('logs'), lw=PF.width(ls), ly=vy+PF.CAP+12, lx0=vr?vx-lw:vx;
    text(ls,lx0,ly,P.band,'left'); R(P.band,lx0,ly+PF.CAP+2,lw,1); BTN.push({id:'logs',x:lx0-8,y:ly-6,w:lw+16,h:PF.CAP+12}); }
  // v0.58: at the bottom (the title screen) — a row of service links on the line above the version, the same on every phone:
  // «logs» (when there are any), «sound» (the Android app), «lab» (always — the lab opens in the same tab / app)
  if(!top&&diag){ var its=[]; if(Logs.has()) its.push(['logs',L('logs')]); if(Sonar.nativeAvail()) its.push(['audio',L('aud_link')]); its.push(['lab',L('aud_lab')]);
    var ly2=vy-16, xx=vx; (vr?its:its).forEach(function(it){ var w=PF.width(it[1]), x0=vr?xx-w:xx;
      text(it[1],x0,ly2,P.band,'left'); R(P.band,x0,ly2+PF.CAP+2,w,1); BTN.push({id:it[0],x:x0-8,y:ly2-4,w:w+16,h:PF.CAP+8}); xx=vr?x0-24:x0+w+24; }); }
  // v0.50: in the app, on the title screen — «sound»: the app's own sound, the microphone and the speaker (a service screen for trying phones)
 }
function titles(t,s,col){ var y=topY(), mw=LW-SAFE.l-SAFE.r-24, cx0=Math.round((SAFE.l+LW-SAFE.r)/2);
  PF.wrap(t,mw,1).forEach(function(l){ text(l,cx0,y,col||P.text,'center'); y+=10; });
  if(s){ y+=3; y=para(s,cx0,y,mw,P.soft); } say(t+(s?'. '+s:'')); return y; }
function btnW(labels){ var w=0; labels.forEach(function(s){ w=Math.max(w,PF.width(s)); }); return Math.max(Math.round(LW*0.2),Math.round((w+14)*1.16)); }
function sideX(w){ return freeSide()==='left'?SAFE.l+Math.max(8,Math.round(LW*0.04)):LW-SAFE.r-Math.max(8,Math.round(LW*0.04))-w; }
/* a column of buttons on the free side, vertically centred on y0 */
function colW(items){ var w=btnW(items.filter(function(b){ return b[2]!=='sound'; }).map(function(b){ return b[1]; }));
  return items.some(function(b){ return b[2]==='sound'; })?Math.max(w,soundW()):w; }
function column(items,y0,x0){ var w=colW(items), h=BH, gap=10, y=Math.round(y0-(items.length*(h+gap)-gap)/2), x=x0===undefined?sideX(w):x0;
  items.forEach(function(b){ if(b[2]==='sound') soundRow(x,y,w,h); else button(b[0],b[1],x,y,w,h,b[2]||'',Math.floor(clock*2)%2===0); y+=h+gap; }); }
/* v0.36: the sound row in the menu and the pause — [ - | SOUNDS ▮▮▮▮▮▯▯▯ | + ]; the middle switches the sounds on and off */
function soundW(){ return PF.width(L('sfx_off'))+6+Sfx.steps*4+2*Math.round(BH*0.9)+12; }
function soundRow(x,y,w,h){ var on=Sfx.on(), n=Sfx.steps, lv=Sfx.lvl(), s=Math.round(h*0.9), ty=y+Math.round((h-7)/2);
  R(P.bg,x,y,w,h); frame(x,y,w,h,P.line);
  text('-',x+s/2,ty,P.text,'center',1,true); text('+',x+w-s/2,ty,P.text,'center',1,true); R(P.line,x+s,y+3,1,h-6); R(P.line,x+w-s,y+3,1,h-6);
  BTN.push({id:'vol_dn',x:x,y:y,w:s,h:h}); BTN.push({id:'vol_up',x:x+w-s,y:y,w:s,h:h});
  var lab=L(on?'sfx_row':'sfx_off'), tw=PF.width(lab), cw=tw+6+n*4, cx=x+s+Math.round((w-2*s-cw)/2);
  text(lab,cx,ty,on?P.text:P.soft,'left',1,true);
  for(var j=0;j<n;j++) R(on&&j<lv?P.band:P.line,cx+tw+6+j*4,ty,3,7);
  BTN.push({id:'sfx',x:x+s,y:y,w:w-2*s,h:h}); }
function nextBtn(id,label){ var w=btnW([label]); button(id,label,sideX(w),Math.round(LH*0.76),w,BH,'primary',Math.floor(scrT*2)%2===0); }   /* v0.35: lower, off the pictures */
function ringAt(){ return freeSide()==='left'?[Math.round(LW*0.13),Math.round(LH*0.74)]:[Math.round(LW*0.87),Math.round(LH*0.74)]; }   /* v0.35: lower, under the two pictures */
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
  // v0.31: in a phone's browser (not launched from the home screen) — full screen needs the home screen; both languages, none is chosen yet
  if(inBrowser()){ text(STR.ru.fullscr,LW/2,Math.round(LH*0.68),P.soft,'center'); text(STR.en.fullscr,LW/2,Math.round(LH*0.68)+12,P.soft,'center'); }
  say('Sonaroids. English / Русский'); stepSquares('lang'); }
function sTitle(){ sky(DT,0.4); var y=Math.round(LH*0.3);
  // v0.38: the title and the Android note are centred in the space beside the buttons (the note used to run in between them)
  var items=[['play',L('play'),'primary'],['scores',L('scores')],['howto',L('howto')],['lang',L('lang')],['sfx','','sound']];
  var cw=colW(items), bx0=sideX(cw), a0=freeSide()==='left'?bx0+cw:SAFE.l, a1=freeSide()==='left'?LW-SAFE.r:bx0, cx0=Math.round((a0+a1)/2);
  text('SONAROIDS',cx0,y,P.band,'center',2);
  if(/Android/i.test(navigator.userAgent)&&!APP){ var ay=y+22;          // v0.44: the note «on Android it does not work on every phone» is gone — the app
    // v0.42: in an Android browser — a link to the app (the APK of the latest GitHub release); tapping downloads it
    var as=L('get_apk'), aw=PF.width(as); ay+=6; text(as,cx0,ay,P.band,'center'); R(P.band,cx0-aw/2,ay+PF.CAP+2,aw,1); BTN.push({id:'apk',x:cx0-aw/2-6,y:ay-6,w:aw+12,h:PF.CAP+12}); }
  var vr=freeSide()==='left', vx=vr?LW-SAFE.r-8:SAFE.l+8, vy=LH-SAFE.b-12;
  diagCorner(L('version')+' '+VERSION,false);   // for telling uploads apart; a tap shows the "logs" link (v0.47)
  // v0.41, the app: «check for updates» above the source link — the app's own update (a dialog from the shell) and a fresh page
  if(APP){ var us=L('app_upd'), uw=PF.width(us), uy=vy-32; text(us,vx,uy,P.band,vr?'right':'left'); BTN.push({id:'appupd',x:Math.max(0,(vr?vx-uw:vx)-6),y:uy-6,w:uw+12,h:PF.CAP+10}); }
  // v0.28: the site opens straight into the game; the source code link moved here from the landing page
  // v0.51 (the maintainer: the finger missed): the source link and the version in one line, 32 px apart
  var gs=L('source'), gw=PF.width(gs), vw0=PF.width(L('version')+' '+VERSION), gx=vr?vx-vw0-32:vx+vw0+32;
  text(gs,gx,vy,P.soft,vr?'right':'left'); BTN.push({id:'source',x:Math.max(0,(vr?gx-gw:gx)-6),y:vy-4,w:gw+12,h:Math.min(PF.CAP+10,LH-vy+4)});
  var sy=Math.round(LH*0.62+Math.sin(clock*1.3)*LH*0.08); drawShip(cx0-40,sy,clock,false);
  for(var i=0;i<3;i++){ var bx=cx0-20+((clock*90+i*40)%120); R(P.bullet,bx,sy,4,1); light(bx,sy,6*K,P.glowB,0.45); }
  column(items,Math.round(LH*0.5));
  say('Sonaroids. '+L('play')); }
function sSound(){ sky(DT,0.3); titles(L(direct?(dirLoud?'volume_loud':'volume_direct'):'volume'),L('volume_s')); soundVolume(scrT); nextBtn('next',L('next')); stepSquares('sound'); }
/* v0.41: the Android app (android/, a WebView over this very page) gives a small native helper: media volume, audio route.
   In the browser it does not exist, and nothing changes there */
var APP=(typeof window!=='undefined'&&window.SonaroidsApp)||null;
function inBrowser(){ if(APP) return false; var ua=navigator.userAgent||'', mob=/iPhone|iPad|iPod|Android/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1), pwa=false;
  try{ pwa=!!(navigator.standalone||matchMedia('(display-mode: standalone)').matches); }catch(e){} return mob&&!pwa; }
function sPhone(){ sky(DT,0.3); var m=handSide()==='left';
  picture(function(){ return sceneBoth('phone',scrT,0.5,0,false,clock); },m); titles(L('phone_t'),L(camEnd()?'phone_s_cam':'phone_s'));
  if(scrT>1.2) nextBtn('next',L('next')); stepSquares('phone'); }
function sMic(){ sky(DT,0.3); var m=handSide()==='left';
  picture(function(){ return sceneBoth('away',scrT,0.5,0,true,clock); },m); titles(L('mic_t'),L('mic_s'));
  var w=btnW([L('allow')]); button('allow',L('allow'),sideX(w),Math.round(LH*0.76),w,BH,'primary',Math.floor(scrT*2)%2===0); stepSquares('mic'); }
/* v0.40: two equal cards side by side (the maintainer's pick «A»): a wave sign, the name, what it gives, what it costs */
var WARN='#FFB27A';
function sProbe(){ sky(DT,0.3); titles(L('probe_t'),L('probe_s'));
  var cw=Math.min(Math.round(LW*0.36),Math.round((LW-SAFE.l-SAFE.r-40)/2)), gap=Math.round(LW*0.05), ch=Math.round(LH*0.46), y=Math.round(LH*0.34);
  var x0=Math.round((SAFE.l+LW-SAFE.r)/2-cw-gap/2);
  [['probe_wide',x0,4,[['probe_wide1',P.soft],['probe_wide2',WARN]]],['probe_norm',x0+cw+gap,2.2,[['probe_norm1',P.soft],['probe_norm2',P.soft]]]].forEach(function(c){
    var x=c[1]; R(P.bg,x,y,cw,ch); frame(x,y,cw,ch,P.line);
    var wx=x+Math.round(cw*0.28), ww=Math.round(cw*0.44), wy=y+Math.round(ch*0.2);             // the wave sign: wide — taller, fewer bends
    for(var i=0;i<ww;i++) R(P.band,wx+i,wy+Math.round(Math.sin(i/c[2])*(c[2]>3?4:2.5)),1,2);
    var ty=y+Math.round(ch*0.36); text(L(c[0]),x+cw/2,ty,P.text,'center'); ty+=14;
    c[3].forEach(function(q){ ty=para(L(q[0]),x+cw/2,ty,cw-10,q[1])+2; });
    BTN.push({id:c[0],x:x,y:y,w:cw,h:ch}); });
  stepSquares('probe'); }
function sAway(){ sky(DT,0.3); var m=handSide()==='left', aw=Math.min(1,Math.max(0,(scrT-AWAY_T0)/(AWAY_T1-AWAY_T0)));
  picture(function(){ return sceneBoth('away',scrT,0.5,aw,scrT>PAUSE,clock); },m);
  var st=scrT<PAUSE?'wait':(prep&&prep.res&&prep.res.ok)?'ok':'listen';
  titles(L('away_t'),st==='ok'?L('away_ok'):L('away_s'));
  ringUI(st==='wait'?scrT/PAUSE:st==='ok'?1:Math.min(0.95,(scrT-PAUSE)/3.2),st);
  if(scrT>=PAUSE&&!prep) startPrepare();
  if(prep&&prep.res){ if(prep.res.ok){ if(scrT-prep.doneT>1.5) toWave(); }       // «the room is quiet» stays for 1.5 s
    else { direct=true; dirLoud=prep.res.why==='loud'; onboarding=false; go('sound'); } }
  stepSquares('away');  }
function sWave(){ sky(DT,0.3); poolFill(1); var m=handSide()==='left', f=handFrac(), live=f!==null;
  // v0.21: tuning stops once the range is caught — the try-out screen shows exactly what the game will use (exploring the edges there widened the field)
  if(scrT>=WAVE_PAUSE&&!caught){ var e=Tune.step(T,DT,Sonar.state(),true,Sonar.shift); if(e) Logs.ev('подстройка',e); }
  if(T.ok&&!caught){ caught=true; caughtT=scrT; Sfx.play('ok'); store.set('sonaroids_seen','1'); Board.setup('caught',{t:scrT,flips:flips});
    handSaved=handSide(); store.set('sonaroids_hand',handSaved); }   // this end of the phone works: remember it
  var stt=Sonar.state(); if((stt&&stt.present)||scrT<WAVE_PAUSE) seenT=Math.max(seenT,scrT);
  if(!caught&&scrT-seenT>NOHAND_T) flipSide();
  if(caught&&scrT-caughtT>=CAUGHT_SHOW){ sTry(); return; }
  picture(function(){ return sceneBoth('wave',scrT,live?f:waveH(scrT),0,scrT>WAVE_PAUSE,clock); },m);
  var st=scrT<WAVE_PAUSE?'wait':caught?'ok':'catch', dur=T.buf.length?T.buf[T.buf.length-1].t-T.buf[0].t:0;
  var wty=(scrT-flipT<4&&!caught)?titles(L('other_t'),L('other_s'),P.pick):titles(L('wave_t'),caught?L('wave_ok'):L('wave_s')); coveredLine(wty+2);
  ringUI(st==='wait'?scrT/WAVE_PAUSE:st==='ok'?1:Math.min(0.95,dur/5.2),st);
  handBeacon();
  stepSquares('wave');  }
/* v0.44: where to wave — the edge of the screen at the hand's end glows, with «wave here · at the camera / at the port» and, under it,
   «other hand? turn the phone around»: the browser may pick the front camera's microphone, and then a right-handed player has the hand's end
   on the left — turning the phone by 180° swaps everything round (the screen turns, the game follows) */
function handBeacon(){ var m=handSide()==='left', a=0.55+0.35*Math.sin(clock*5), ex=m?0:LW-4;
  lx.globalAlpha=a; R(P.band,ex,0,4,LH); lx.globalAlpha=a*0.45; R(P.band,m?4:LW-8,0,4,LH); lx.globalAlpha=a*0.2; R(P.band,m?8:LW-12,0,4,LH); lx.globalAlpha=1;
  var o=portOr(), lab=L(!o?'here':camEnd()?'here_cam':'here_port'), x=m?SAFE.l+10:LW-SAFE.r-10, al=m?'left':'right', y=LH-SAFE.b-30;
  text(lab,x,y,P.band,al); if(o) text(L('flip_hint'),x,y+12,P.soft,al); }
/* v0.17: once the range is caught the table picture goes and the real ship at game size follows the palm —
   the player sees at once whether the calibration came out right. "Play", and under it "recalibrate" (the empty room anew, then wave) */
var CAUGHT_SHOW=1.0, caughtT=0;
function followShip(){ var f=handFrac(); if(f!==null) lastHand=f;
  var ty=(Core.FH-Core.MARGIN-(lastHand===null?0.5:lastHand)*(Core.FH-2*Core.MARGIN))*K; shipY=shipY===null?ty:shipY+(ty-shipY)*0.49; return f!==null; }
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
var SITE='sonaroids.app';
/* v0.34: the speaker or the microphone covered (the palm right at the port end, fingers): the direct sound sinks by 20–35 dB while the probe
   is still loud in the microphone. The sonar no longer takes it for a shifted input; the player gets a line under the score after 0.7 s */
var covT=0;
function coveredLine(y){ covT=(typeof DSP2!=='undefined'&&DSP2.info().covered)?covT+DT:0; if(covT>0.7) text(L('covered'),Math.round(LW/2),y,P.hit,'center'); }
function sPlay(){
  acc+=DT; var n=0;
  while(acc>=Core.DT&&n<5){ acc-=Core.DT; n++; var h=Board.q(handFrac()); Core.step(g,h); Board.step(h); Logs.step(g,h); react(); if(g.state!=='play') break; }   // v0.25: the palm rounded to 1/4000 — the server replays these exact numbers
  if(n===5) acc=0;
  shake=Math.max(0,shake-DT); flash=Math.max(0,flash-DT); livesT=Math.max(0,livesT-DT);
  duckT-=DT; if(duckT<=0&&Sonar.peak()>DUCK_PEAK){ duckT=0.4; if(Sfx.duck()) Logs.gameEv('sounds down',+Sfx.level().toFixed(2)); }   // own sounds too loud in the microphone
  field(DT,g.slow>0?0.5:1);
  text(String(g.score).padStart(6,'0'),LW/2,topY(),P.text,'center');                // at the top only the score (agreed 24 Sep)
  // v0.30: the site's name in the top corner away from the menu button (on the hand's side), level with the score; not a link
  if(freeSide()==='left') text(SITE,LW-SAFE.r-14,topY(),P.soft,'right'); else text(SITE,SAFE.l+14,topY(),P.soft,'left');
  coveredLine(topY()+12);
  // the menu button: in the top corner on the free hand's side
  // v0.11: further into the corner — the camera island sits in the middle of the side, so the top of the safe margin is free
  iconButton('pause',freeSide()==='left'?Math.round(SAFE.l*0.5)+10:LW-Math.round(SAFE.r*0.5)-10-(BH-3),SAFE.t+7); say(L('menu_a'));
  if(flash>0){ lx.globalAlpha=Math.min(0.35,flash); R(P.hit,0,0,LW,LH); lx.globalAlpha=1; }
  if(g.state==='over') endGame();
}
/* v0.29: what goes with a game about the phone — kinds, not the user agent string: which phones play and how well the sonar works on them
   (server/stats.js). The model name, on Android only, is added by Board. */
function devInfo(){ var ua=navigator.userAgent||'', ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1), and=/Android/.test(ua);
  var br=/SamsungBrowser/.test(ua)?'samsung':/YaBrowser|YaApp/.test(ua)?'yandex':/Edg|OPR|OPiOS|EdgiOS/.test(ua)?'other':/FxiOS|Firefox/.test(ua)?'firefox':/CriOS|Chrome/.test(ua)?'chrome':/Safari/.test(ua)?'safari':'other';
  var I=Sonar.info(), D=DSP2.info(), m=Sonar.micSettings()||{}, r=function(v,k){ return typeof v==='number'&&isFinite(v)?Math.round(v*k)/k:undefined; };
  var pwa=!!APP; try{ pwa=pwa||!!(navigator.standalone||matchMedia('(display-mode: standalone)').matches); }catch(e){}
  return {os:ios?'ios':and?'android':'other',br:br,pwa:pwa,lang:lang,fs:I.fs,snr:r(I.probe_snr,10),lvl:r(I.probe_level,10),gain:r(I.probe_gain,1000),
    eq:!!D.eq,eq_db:r(D.eq_db,10),relocks:D.relocks,drops:D.drops,side:handRel||undefined,ec:m.echoCancellation,ns:m.noiseSuppression,agc:m.autoGainControl,
    app:!!APP,audio:I.audio,src:m.src,vol:APP?(function(){ try{ return r(APP.getVolume(),100); }catch(e){ return undefined; } })():undefined,band:I.band}; }   // v0.55
Board.devInfo(devInfo);
function endGame(){ g.state='over'; overT=0; Logs.gameStop(); Board.finish(g.score); Board.flush(); if(g.score>best){ best=g.score; store.set('sonaroids_best',best); } go('over'); }
function react(){ g.events.forEach(function(k){
  if(k==='fire'){ if(Math.random()<0.5) Sfx.play('fire'); } else if(k!=='crash') Sfx.play(k); });
  (g.gone||[]).forEach(function(r){ burst(fx(r.x),r.y*K,8+Math.round(r.r*K),P.rock.slice(2).concat([P.flame[1]]),50*K); delete rockSpr[r.id]; shake=Math.max(shake,0.08+r.r*0.004); });
  (g.fx||[]).forEach(function(f){ if(f.ufo){ burst(fx(f.x),f.y*K,40,P.ufo,90*K); shake=0.35; } else if(f.pick) burst(fx(f.x),f.y*K,14,[P.pick,P.text],50*K); });
  if(g.events.indexOf('ufo_hit')>=0&&g.ufo){ burst(fx(g.ufo.x),g.ufo.y*K,14,[P.text].concat(P.ufo.slice(1)),60*K); shake=Math.max(shake,0.12); }
  if(g.events.indexOf('shield')>=0) burst(fx(g.ship.x)+6,g.ship.y*K,20,[P.pick,P.text],60*K);
  if((g.fx||[]).some(function(f){ return f.pick==='life'; })) livesT=1.8;                  // a life taken: the lives show for a moment
  if(g.events.indexOf('hit')>=0||g.events.indexOf('over')>=0){ flash=0.25; shake=0.4; livesT=1.8; burst(fx(g.ship.x)+6,g.ship.y*K,26,P.ship.concat(P.flame),70*K); }
}
function sOver(){ overT+=DT;                       // no tuning here: it is done on the wave screen before every game (24 Sep)
  field(DT,0.3); var cx0=freeSide()==='left'?Math.round(LW*0.6):Math.round(LW*0.4), y=Math.round(LH*0.3);
  text(L('over'),cx0,y,P.text,'center'); text(String(g.score),cx0,y+13,P.band,'center',2);   // the score, big (25 Sep)
  // v0.27: the version is also a switch — a tap shows the "logs" button (for this launch); the logs are always being written
  var vs='V'+VERSION, vr=freeSide()==='left', vx=vr?LW-SAFE.r-8:SAFE.l+8, vy=LH-SAFE.b-12, vw=PF.width(vs);
  text(vs,vx,vy,diag?P.band:P.soft,vr?'right':'left'); var bx0=Math.max(0,(vr?vx-vw:vx)-8), bx1=Math.min(LW,(vr?vx:vx+vw)+8), by0=vy-8; BTN.push({id:'ver',x:bx0,y:by0,w:bx1-bx0,h:Math.min(PF.CAP+16,LH-by0)});   // a generous tap area, inside the screen text(String(g.score).padStart(6,'0'),cx0,y+14,P.band,'center'); text(L('best')+' '+String(best).padStart(6,'0'),cx0,y+26,P.soft,'center');
  var bl=boardLine(); if(bl){ text(bl[0],cx0,y+43,bl[1],'center'); if(bl[2]) text(bl[2],cx0,y+55,P.soft,'center'); }
  say(L('over')+' '+g.score+(bl?'. '+bl[0]:''));
  var lb=Board.last(); if(lb&&lb.state==='done'&&lb.listed&&!lb.named&&!nickAsked&&overT>1.5){ nickAsked=true; nickFrom='over'; go('nick'); return; }   // the first place in a table: ask the name once
  if(overT>0.8) column([['again',L('again'),'primary'],['menu',L('menu')],['scores',L('scores')]].concat(diag&&Logs.has()?[['logs',L('logs')]]:[]),Math.round(LH*0.52)); }
/* the game-over screen's line about the table: [text, colour] or null */
function boardLine(){ var b=Board.last(); if(!b) return null;
  if(b.state==='sending') return [L('sending'),P.soft]; if(b.state==='offline') return [L('sent_off'),P.soft]; if(b.state==='old') return [L('old'),P.soft];
  if(b.state!=='done'||!b.ranks) return null; var r=b.ranks, h=b.here, k;
  if(!h){ k=r.all<=100?'all':r.week<=100?'week':'day'; return [L('place_'+k).replace('{n}',r[k]),b.listed?P.pick:P.soft]; }   // a server before v0.32
  // v0.32: the place of this very game; when the player's record is better, a second line with the record's place (the table shows the record)
  k=h.all<=100?'all':h.week<=100?'week':'day';
  if(h[k]===r[k]) return [L('place_'+k).replace('{n}',r[k]),b.listed?P.pick:P.soft];
  return [L('here_'+k).replace('{n}',h[k]),P.soft,L('pb_'+k).replace('{n}',r[k])]; }
/* ── high scores (v0.25): today, this week, all time; the list on one side, the buttons on the free side ── */
var tblBox=null, period='day', scoresFrom='title', nickFrom='title', nickAsked=false, nickMsg='', nickBusy=false, nickEl=null;
function sScores(){ sky(DT,0.3); var c=Board.top(period);
  var nm=Board.nick(), items=[['p_day',L('p_day'),period==='day'?'primary':''],['p_week',L('p_week'),period==='week'?'primary':''],['p_all',L('p_all'),period==='all'?'primary':''],
    ['name',nm?L('name')+': '+nm:L('name_set')],['link',L('link')]], /* v0.48: «back» is the menu button in the corner (it goes back, as «back» did) */ bw=btnW(items.map(function(q){ return q[1]; })), bx=sideX(bw), m=Math.max(10,Math.round(LW*0.03));
  var x0=freeSide()==='left'?bx+bw+m:SAFE.l+m, x1=freeSide()==='left'?LW-SAFE.r-m:bx-m;          // the list takes the rest of the width
  tblBox=[x0,x1]; var y=topY(); text(L('scores')+' — '+L('p_'+period),x0,y,P.text); y+=16; say(L('scores')+', '+L('p_'+period));
  if(c.state==='loading') text(L('loading'),x0,y,P.soft); else if(c.state==='offline') text(L('offline'),x0,y,P.soft);
  else if(!c.entries.length) text(L('empty'),x0,y,P.soft);
  else { var row=function(rank,nick,score,col){ var sw=PF.width(String(score)), room=x1-sw-6-(x0+20), n=nick; while(n.length>1&&PF.width(n)>room) n=n.slice(0,-2)+'…';   // a long name is cut to fit
      text(String(rank),x0+14,y,P.soft,'right'); text(n,x0+20,y,col); text(String(score),x1,y,col,'right'); y+=11; };
    c.entries.forEach(function(e){ row(e.rank,e.nick,e.score,e.me?P.band:P.text); });
    if(c.me&&!c.entries.some(function(e){ return e.me; })){ text('…',x0+20,y-3,P.soft); y+=8; row(c.me.rank,c.me.nick||L('you'),c.me.score,P.band); } }
  column(items,Math.round(LH*0.52)); }
/* the name: a real text field over the canvas (the phone's keyboard needs one); checked by the server too */
var NICK_RE=/^[A-Za-z0-9_]{1,16}$/;                     // Latin letters, digits and _ only (25 Sep); the server checks the same
function nickField(show){ if(!nickEl){ nickEl=document.createElement('input'); nickEl.type='text'; nickEl.maxLength=16; nickEl.autocomplete='off'; nickEl.spellcheck=false; nickEl.setAttribute('autocapitalize','off'); nickEl.setAttribute('aria-label','nickname');
    nickEl.style.cssText='position:fixed;z-index:5;display:none;font:18px/1.2 ui-monospace,Menlo,monospace;text-align:center;padding:6px 8px;border:2px solid '+P.band+';background:'+P.bg+';color:'+P.text+';border-radius:0;outline:none;-webkit-appearance:none';
    nickEl.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); if(scr==='linkin') ACT.code_ok(); else ACT.nick_ok(); } }); document.body.appendChild(nickEl); }
  if(!show){ if(nickEl.style.display!=='none'){ nickEl.style.display='none'; nickEl.blur(); } return; }
  var m=S/DPR, w=Math.round(LW*0.42), x=Math.round((LW-w)/2), y=Math.round(LH*0.34);
  nickEl.style.left=Math.round(x*m)+'px'; nickEl.style.top=Math.round(y*m)+'px'; nickEl.style.width=Math.round(w*m)+'px';
  var mode=scr==='linkin'?'code':'nick';
  if(nickEl.style.display==='none'||nickEl.getAttribute('data-mode')!==mode){ nickEl.setAttribute('data-mode',mode); nickEl.maxLength=mode==='code'?8:16;
    nickEl.setAttribute('autocapitalize',mode==='code'?'characters':'off'); nickEl.setAttribute('aria-label',mode==='code'?'code':'nickname');
    nickEl.value=mode==='code'?'':(Board.nick()||''); nickEl.style.display='block'; } }
function sNick(){ sky(DT,0.3); titles(L(nickFrom==='over'?'nick_t':'nick_t2'),L('nick_s')); nickField(true);
  if(nickMsg) text(nickMsg,Math.round(LW/2),Math.round(LH*0.34)-10,P.hit,'center');
  var items=[['nick_ok',nickBusy?L('loading'):L('done'),'primary'],['nick_later',L(nickFrom==='over'?'later':'back')]], w=btnW(items.map(function(q){ return q[1]; })), gap=10, y0=Math.round(LH*0.66), x=Math.round(LW/2-w-gap/2);
  button(items[0][0],items[0][1],x,y0,w,BH,'primary',true); button(items[1][0],items[1][1],x+w+gap,y0,w,BH,'',false); }
/* v0.32: the transfer code (see Board.link / Board.claim) */
var linkCode=null, linkMsg='', linkBusy=false, linkNick=null;
function sLink(){ sky(DT,0.3); titles(L('link_t'),L('link_s')); column([['link_show',L('link_show'),'primary'],['link_in',L('link_in')],['link_back',L('back')]],Math.round(LH*0.64)); }
function sLinkShow(){ sky(DT,0.3); titles(L('link_code_t'));
  var cx0=Math.round((SAFE.l+LW-SAFE.r)/2);
  if(linkCode) text(linkCode.slice(0,3)+' '+linkCode.slice(3),cx0,Math.round(LH*0.3),P.band,'center',3);
  else text(linkMsg||L('loading'),cx0,Math.round(LH*0.34),linkMsg?P.hit:P.soft,'center');
  para(L('link_code_s'),cx0,Math.round(LH*0.52),LW-SAFE.l-SAFE.r-40,P.soft);
  if(linkCode) say(L('link_code_t')+' '+linkCode.split('').join(' '));
  var w=btnW([L('back')]); button('link_back2',L('back'),Math.round(cx0-w/2),Math.round(LH*0.76),w,BH,''); }
function sLinkIn(){ sky(DT,0.3); titles(L('link_in_t'),L('link_in_s')); nickField(true);
  if(linkMsg) text(linkMsg,Math.round(LW/2),Math.round(LH*0.34)-10,P.hit,'center');
  var items=[['code_ok',linkBusy?L('loading'):L('done'),'primary'],['link_back2',L('back')]], w=btnW(items.map(function(q){ return q[1]; })), gap=10, y0=Math.round(LH*0.66), x=Math.round(LW/2-w-gap/2);
  button(items[0][0],items[0][1],x,y0,w,BH,'primary',true); button(items[1][0],items[1][1],x+w+gap,y0,w,BH,'',false); }
function sLinkDone(){ sky(DT,0.3); titles(L('link_ok_t'),L('link_ok_s').replace('{nick}',linkNick?' — '+linkNick:''));
  var w=btnW([L('next')]); button('link_done',L('next'),Math.round(LW/2-w/2),Math.round(LH*0.6),w,BH,'primary',true); }
function sPaused(){ field(DT,0); lx.globalAlpha=0.5; R(P.bg,0,0,LW,LH); lx.globalAlpha=1; titles(L('paused')); column([['resume',L('resume'),'primary']].concat(pausedFrom==='play'?[['restart',L('restart')],['quit',L('quit')]]:[]).concat([['exit',L('exit')],['sfx','','sound']]),Math.round(LH*0.55)); }
/* v0.24 "start over" from the pause menu: straight into a countdown with the same calibration, or through calibration again */
function sRestart(){ field(DT,0); lx.globalAlpha=0.5; R(P.bg,0,0,LW,LH); lx.globalAlpha=1; titles(L('restart'),L('restart_s'));
  column([['rs_go',L('rs_go'),'primary'],['rs_cal',L('recal')],['rs_back',L('back')]],Math.round(LH*0.58)); }
/* the running game is dropped without the game-over screen; its score still counts for the best */
function dropGame(){ if(g&&g.state==='play'){ Logs.gameEv('restarted by the player'); g.state='over'; Logs.gameStop(); Board.finish(g.score); if(g.score>best){ best=g.score; store.set('sonaroids_best',best); } } }
function sLost(){ sky(DT,0.2); titles(L('lost_t'),L('lost_s'),P.hit); nextBtn('retry',L('retry')); }
function sNomic(){ sky(DT,0.2); titles(L('nomic_t'),L(errKind==='mic'?'nomic_s':'noaudio_s'),P.hit); nextBtn('retry',L('retry')); }
function sRotate(){ lx.fillStyle=P.bg; lx.fillRect(0,0,LW,LH); var y=Math.round(LH/2-24); y=para(L('rotate'),LW/2,y,LW-16,P.text);
  para(L('rotate_s'),LW/2,y+12,LW-24,P.soft); say(L('rotate')+'. '+L('rotate_s')); }   // 25 Sep: some players don't think of the rotation lock

/* ── actions ── */
function startPrepare(){
  prep={res:null,doneT:0}; acoustic=false;
  // v0.45, the app: the media volume starts at 25% (the maintainer: 20–30% plays fine, higher «swings») and Sonar.prepare moves it until the probe is
  // as loud as on the phones that steer well; in a browser too loud a phone gets «turn it down» (why 'loud'), as too quiet gets «turn it up»
  var vol=null; if(APP){ try{ var v0=APP.getVolume(); if(v0<0.2||v0>0.3) APP.setVolume(0.25); vol={get:function(){ return APP.getVolume(); },set:function(v){ APP.setVolume(v); }}; }catch(e){ vol=null; } }
  var logged=false; function slog(){ var I=Sonar.info(); logged=true;
      Logs.setupStart({kind:'подготовка',cal:I.cal,autocenter:true,tune:'waves',asym:Tune.ASYM,field_auto:true,field_mm:+store.get('sonaroids_field','100')||100,
        chan:I.chan,hand:handSide(),probe_gain:I.probe_gain,probe_snr:I.probe_snr,f_lo:I.f_lo,prom:null,sfx:Sfx.state(),vol_fit:I.vol_fit,auto_audio:I.auto_audio,started:new Date().toISOString(),app:APP?'sonaroids-android':'sonaroids',native:APP?(function(){ try{ return JSON.parse(APP.info()); }catch(e){ return null; } })():undefined}); }
  Sonar.prepare(function(stage){ if(stage==='room') slog(); },vol)
  // v0.46: a setup stopped before the room step (too quiet, too loud) still leaves a setup log — the probe, its level and the volume steps —
  // before, "send logs" after such a stop had nothing about it (Mi 9 Lite, 27 Sep: "too quiet" on the wide probe, no log to see why)
  .then(function(r){ prep.res=r; prep.doneT=scrT; if(!r.ok){ Board.setup(r.why||'error'); if(!logged){ slog(); } var I=Sonar.info(); Logs.ev('не готово',{why:r.why||'error',level:I.probe_level===null?null:+(+I.probe_level).toFixed(1),snr:r.snr===undefined?null:+(+r.snr).toFixed(1)}); } if(r.ok){ acoustic=true; accSide=Sonar.chan(); var o=portOr(); if(o&&!handRel) handRel=accSide===o?'port':'camera'; handSaved=handSide(); store.set('sonaroids_hand',handSaved); } })
  .catch(function(){ prep.res={ok:false,why:'error'}; Board.setup('error'); });
}
/* make sure the microphone works before going on; if the phone took it away (the app was in the background), open it again —
   this runs from a tap, which browsers require — and get ready again (take your hand away → wave) */
var resumeAfterPrep=false;
function ensure(then){ if(booted&&Sonar.healthy()) then(); else { Sonar.restart(); booted=false; boot(toAway); } }
function boot(then){ Sonar.boot().then(function(){ booted=true; Sfx.play('tap'); then(); })
  .catch(function(e){ errKind=(e&&e.message&&/webaudio|worklet/.test(e.message))?'audio':'mic'; Board.setup(errKind==='mic'?'nomic':'noaudio'); go('nomic'); }); }
/* v0.40 (27 Sep): before every game — the probe choice, no default: «wide» (cleaner control, children and animals may hear it) or «normal» (silent) */
function toAway(){ prep=null; go('probe'); }
function toRoom(b){ Sonar.setBand(b); prep=null; go('away'); }
function toWave(){ T=Tune.create(+store.get('sonaroids_field','100')||100,true); caught=false; flips=0; flipT=-9; seenT=0; go('wave'); }
function pauseGame(){ if(scr==='play'||scr==='count'||scr==='count-resume'){ pausedFrom=scr==='count-resume'?'play':scr; go('paused'); } }
function startCount(){ if(resumeAfterPrep&&g&&g.state==='play'){ resumeAfterPrep=false; countT=3; go('count-resume'); return; }
  resumeAfterPrep=false; countT=3; if(scr!=='wave') shipY=null; lastHand=handFrac()===null?lastHand:handFrac(); /* from the try-out the ship goes on where it is */ Logs.ev('отсчёт',{field:+T.field.toFixed(1),auto:T.auto}); store.set('sonaroids_field',Math.round(T.field)); go('count'); }
function startGame(){
  var seed=0; try{ var a=new Uint32Array(1); crypto.getRandomValues(a); seed=a[0]; }catch(e){ seed=Math.floor(Math.random()*4294967296); }
  var y0=shipY===null?null:+(shipY/K).toFixed(3);
  g=Core.create(seed,Core.FH*(LW-SAFE.l)/LH,y0); Board.start(seed,g.FW,y0); nickAsked=false; acc=0; rockSpr={}; parts=[]; livesT=0; var I=Sonar.info();
  Logs.gameStart({core:Core.TAG,seed:seed,y0:y0,FW:+g.FW.toFixed(3),cal:DSP2.info().cal,autocenter:false,tune:'frozen',asym:Tune.ASYM,field_mm:+T.field.toFixed(1),
    chan:I.chan,hand:handSide(),probe_gain:I.probe_gain,probe_snr:I.probe_snr,f_lo:I.f_lo,W:LW,H:LH,sfx:Sfx.state(),started:new Date().toISOString(),app:'sonaroids'});
  Sfx.play('start'); go('play');
}
var ACT={
  en:function(){ lang='en'; store.set('sonaroids_lang','en'); go('sound'); },
  ru:function(){ lang='ru'; store.set('sonaroids_lang','ru'); go('sound'); },
  next:function(){ if(scr==='sound'){ if(direct) (booted?toAway():go('mic')); else go('phone'); } else if(scr==='phone'){ if(booted) toAway(); else go('mic'); } },
  allow:function(){ boot(toAway); },
  appupd:function(){ try{ APP.checkUpdate(); }catch(e){} setTimeout(function(){ location.reload(); },600); },
  probe_wide:function(){ toRoom('wide'); }, probe_norm:function(){ toRoom('normal'); },
  play:function(){ if(store.get('sonaroids_seen','')!=='1'){ ACT.howto(); return; } onboarding=false; direct=false; ensure(toAway); },
  howto:function(){ onboarding=true; direct=false; go('sound'); },
  /* a deep recalibration: forget the saved palm range, close the microphone and start from "put the phone down" */
  recal:function(){ onboarding=false; direct=false; store.set('sonaroids_field','100'); Sonar.restart(); booted=false; acoustic=false; go('phone'); },
  lang:function(){ lang=lang==='en'?'ru':'en'; store.set('sonaroids_lang',lang); },
  sfx:function(){ Sfx.toggle(); }, vol_dn:function(){ Sfx.down(); }, vol_up:function(){ Sfx.up(); },
  start:function(){ ensure(startCount); },
  again:function(){ ensure(toAway); },                 // before every game: the empty room anew, then wave (v0.16: things drift over a game)
  menu:function(){ go('title'); },
  scores:function(){ period='day'; scoresFrom=scr; go('scores'); },
  p_day:function(){ period='day'; }, p_week:function(){ period='week'; }, p_all:function(){ period='all'; },
  name:function(){ nickFrom='scores'; nickMsg=''; go('nick'); },
  sc_back:function(){ go(scoresFrom==='over'&&g&&g.state==='over'?'over':'title'); },
  nick_ok:function(){ if(nickBusy||!nickEl) return; var v=nickEl.value.trim(); if(!NICK_RE.test(v)){ nickMsg=L('nick_bad'); return; }
    nickBusy=true; nickMsg=''; Board.setNick(v).then(function(j){ nickBusy=false; if(j.ok){ nickField(false); go(nickFrom==='over'?'over':'scores'); } else nickMsg=L('nick_bad'); },function(){ nickBusy=false; nickMsg=L('nick_net'); }); },
  link:function(){ go('link'); }, link_back:function(){ go('scores'); }, link_back2:function(){ nickField(false); linkMsg=''; go('link'); },
  link_show:function(){ linkCode=null; linkMsg=''; go('linkshow'); Board.link().then(function(j){ if(j.ok&&typeof j.code==='string'&&/^[A-Z0-9]{6}$/.test(j.code)) linkCode=j.code; else linkMsg=L('nick_net'); },function(){ linkMsg=L('nick_net'); }); },
  link_in:function(){ linkMsg=''; go('linkin'); },
  code_ok:function(){ if(linkBusy||!nickEl) return; var v=nickEl.value.toUpperCase().replace(/[^A-Z0-9]/g,''); if(v.length!==6){ linkMsg=L('link_bad'); return; }
    linkBusy=true; linkMsg=''; Board.claim(v).then(function(j){ linkBusy=false; if(j.ok){ nickField(false); linkNick=j.nick; go('linkdone'); } else linkMsg=L('link_bad'); },function(){ linkBusy=false; linkMsg=L('nick_net'); }); },
  link_done:function(){ period='all'; go('scores'); },
  nick_later:function(){ nickField(false); nickMsg=''; go(nickFrom==='over'?'over':'scores'); },
  logs:function(){ Logs.share(); },
  audio:function(){ audDev=null; go('audio'); },
  lab:function(){ location.href='../lab/sonar_lab3.html'; },
  ver:function(){ diag=!diag; },
  apk:function(){ try{ window.open('https://github.com/neokrasav4ik/sonaroids/releases/latest/download/sonaroids.apk','_blank','noopener'); }catch(e){} },
  source:function(){ try{ window.open('https://github.com/neokrasav4ik/sonaroids','_blank','noopener'); }catch(e){} },
  retry:function(){ Sonar.clearLost(); ensure(toAway); },
  pause:function(){ pauseGame(); },
  quit:function(){ Logs.gameEv('ended by the player'); endGame(); },
  restart:function(){ go('restart'); },
  rs_go:function(){ dropGame(); resumeAfterPrep=false; ensure(startCount); },
  rs_cal:function(){ dropGame(); resumeAfterPrep=false; ensure(toAway); },
  rs_back:function(){ go('paused'); },
  exit:function(){ if(g&&g.state==='play'){ Logs.gameEv('ended by the player'); endGame(); } go('title'); },
  resume:function(){ if(pausedFrom==='play'){ if(booted&&Sonar.healthy()){ countT=3; go('count-resume'); } else { resumeAfterPrep=true; ensure(null); } } else ensure(startCount); }
};
/* buttons act when the finger lifts (on the same button it went down on): iPhone lets a page share files or open the microphone
   only from a finished tap — acting on touch-down made "logs" work only on the second tap (v0.12) */
var downOn=null;
function btnAt(e){ var x=e.clientX*DPR/S, y=e.clientY*DPR/S;
  for(var i=BTN.length-1;i>=0;i--){ var b=BTN[i]; if(x>=b.x-4&&x<b.x+b.w+4&&y>=b.y-4&&y<b.y+b.h+4) return b.id; } return null; }
/* v0.56 (the maintainer): the service links show after a long press on the version (0.7 s), not a tap — a player won't open them by chance */
var verHold=null, verDown=false;   // verDown: the finger is still on the version (a pointercancel from iOS does not end the hold, only lifting the finger does)
cv.addEventListener('pointerdown',function(e){ downOn=btnAt(e); if(verHold){ clearTimeout(verHold); verHold=null; }
  if(downOn==='ver'){ verDown=true; verHold=setTimeout(function(){ verHold=null; if(verDown){ verDown=false; ACT.ver(); Sfx.play('tap'); downOn=null; } },700); }
  e.preventDefault(); },{passive:false});
cv.addEventListener('pointerup',function(e){ verDown=false; if(verHold){ clearTimeout(verHold); verHold=null; } var id=btnAt(e); if(id==='ver'){ downOn=null; e.preventDefault(); return; } if(id&&id===downOn&&!ACT[id]&&id.indexOf('aud:')===0){ Sfx.play('tap'); audAct(id); } else if(id&&id===downOn&&ACT[id]){ if(id!=='allow'&&id!=='play'&&id!=='retry'&&id!=='sfx'&&id!=='vol_dn'&&id!=='vol_up') Sfx.play('tap'); ACT[id](); } downOn=null; e.preventDefault(); },{passive:false});
cv.addEventListener('pointercancel',function(){ downOn=null; });
cv.addEventListener('touchend',function(){ verDown=false; });   // the hold ends when the finger lifts, even after a pointercancel
['gesturestart','gesturechange','gestureend','dblclick'].forEach(function(n){ document.addEventListener(n,function(e){ e.preventDefault(); },{passive:false}); });
document.addEventListener('touchmove',function(e){ e.preventDefault(); },{passive:false});
document.addEventListener('visibilitychange',function(){
  if(document.hidden){ Sonar.pause(); pauseGame(); if(scr==='away'||scr==='wave'||scr==='probe') go('title'); }   // getting ready starts over after a break
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
  if(booted&&Sonar.lost()&&(scr==='wave'||scr==='count'||scr==='play'||scr==='over')){ if(g&&g.state==='play') Logs.gameStop(); Board.setup('lost'); go('lost'); }
  switch(scr){
    case 'lang': sLang(); break; case 'title': sTitle(); break;
    case 'sound': sSound(); break;
    case 'phone': sPhone(); break; case 'mic': sMic(); break; case 'probe': sProbe(); break; case 'away': sAway(); break; case 'wave': sWave(); break;
    case 'count': sCount(); break; case 'count-resume': sCountResume(); break; case 'play': sPlay(); break; case 'over': sOver(); break;
    case 'audio': sAudio(); break; case 'paused': sPaused(); break; case 'restart': sRestart(); break; case 'scores': sScores(); break; case 'nick': sNick(); break; case 'lost': sLost(); break; case 'nomic': sNomic(); break; case 'link': sLink(); break; case 'linkshow': sLinkShow(); break; case 'linkin': sLinkIn(); break; case 'linkdone': sLinkDone(); break;
  }
  chrome();
  present(scr==='play'?shake:0);
}
/* v0.48 (the maintainer): the menu button in the top corner on every screen but the menus themselves, and the version on every screen but
   the flight — so "logs" (a tap on the version) is there during getting ready too. The corner is the free side's, as in flight (away from
   the hand). In flight and its countdowns the button pauses; elsewhere it goes to the title screen. The version sits under the button;
   the title and game-over screens keep their own version line at the bottom. */
/* v0.50: the app's sound — a service screen (in the app; the title screen, a tap on the version, then «sound»). Where the game's sound comes
   from (the browser or the app itself), and in the app's mode which microphone and which speaker; the phone's microphones with where they
   are (Android 9+ tells the position), what is really in use now. A change closes the microphone: the next «Play» opens it anew. */
var audDev=null, audSt=null, audT=0;
function audGet(k){ return store.get(k,''); }
var AUD_ADDR={bottom:'aud_bottom',back:'aud_back',top:'aud_top',front:'aud_top'};
function audLabel(m){ var p=m.pos_mm, where='', ad=String(m.address||'').toLowerCase(); if(AUD_ADDR[ad]) return L(AUD_ADDR[ad]);
  if(p&&audDev&&audDev.mics&&audDev.mics.length>1){ var ys=audDev.mics.filter(function(q){ return q.pos_mm; }).map(function(q){ return q.pos_mm[1]; }),
    lo=Math.min.apply(null,ys), hi=Math.max.apply(null,ys); where=p[2]<0?L('aud_back'):(hi-lo>20?(p[1]<=lo+(hi-lo)/2?L('aud_bottom'):L('aud_top')):''); }
  return (where?where+' ':'')+(m.desc?String(m.desc).toUpperCase().slice(0,14):''); }
function chip(id,label,x,y,on){ var w=PF.width(label)+12, h=PF.CAP+10; R(on?P.band:P.bg,x,y,w,h); frame(x,y,w,h,on?P.band:P.line); text(label,x+6,y+5,on?P.bg:P.text,'left',1,on); BTN.push({id:id,x:x,y:y,w:w,h:h}); return x+w+6; }
function sAudio(){ sky(DT,0.3); var A=window.SonaroidsApp;
  if(!audDev||scrT-audT>2){ audT=scrT; try{ audDev=JSON.parse(A.audioDevices()); }catch(e){ audDev={}; } try{ audSt=Sonar.native()?JSON.parse(A.audioStatus()):null; }catch(e){ audSt=null; } }
  titles(L('aud_t'),L('aud_s'));
  var x0=Math.round(LW*0.1), y=Math.round(LH*0.22), mode=store.get('sonaroids_audio','browser'), lw=Math.max(PF.width(L('aud_autotest')),PF.width(L('aud_mode')),PF.width(L('aud_mic')),PF.width(L('aud_out')),PF.width(L('aud_src')),PF.width(L('aud_usage')))+10, x;
  text(L('aud_mode'),x0,y+5,P.soft,'left'); x=x0+lw;
  x=chip('aud:mode:browser',L('aud_browser'),x,y,mode!=='app'); chip('aud:mode:app',L('aud_app'),x,y,mode==='app'); y+=PF.CAP+13;
  var ap=null; try{ ap=JSON.parse(store.get('sonaroids_autoaudio','')||'null'); }catch(e){}
  // v0.55: «test again» only when there is a pick; it forgets it — the test runs with the next getting ready (the text says so)
  var apt=ap?L('aud_mic')+' '+ap.mic+' '+String(ap.src).toUpperCase():L(store.get('sonaroids_audio','browser')==='app'?'aud_nextgame':'aud_notyet');
  text(L('aud_autotest'),x0,y+5,P.soft,'left'); x=x0+lw; text(apt,x,y+5,P.text,'left');
  if(ap) chip('aud:retest:1',L('aud_retest'),x+PF.width(apt)+12,y,false); y+=PF.CAP+13;
  var src=store.get('sonaroids_src','auto'); text(L('aud_src'),x0,y+5,P.soft,'left'); x=x0+lw;
  ['auto','unprocessed','voice','mic','camcorder'].forEach(function(k){ x=chip('aud:src:'+k,k==='auto'?L('aud_auto'):k.toUpperCase(),x,y,src===k); }); y+=PF.CAP+13;
  var mic=audGet('sonaroids_mic'), ins=(audDev.inputs||[]).filter(function(d){ return d.type==='builtin_mic'; });
  text(L('aud_mic'),x0,y+5,P.soft,'left'); x=x0+lw; x=chip('aud:mic:',L('aud_auto'),x,y,mic==='');
  ins.forEach(function(d){ var mm=(audDev.mics||[]).filter(function(m){ return m.address&&m.address===d.address; })[0], lb=d.id+(mm?' '+audLabel(mm):(d.address?' '+String(d.address).toUpperCase().slice(0,10):''));
    if(x+PF.width(lb)+12>LW-SAFE.r-8){ x=x0+lw; y+=PF.CAP+12; } x=chip('aud:mic:'+d.id,lb,x,y,mic===String(d.id)); }); y+=PF.CAP+13;
  var out=audGet('sonaroids_out'), outs=(audDev.outputs||[]).filter(function(d){ return d.type==='speaker'||d.type==='earpiece'; });
  text(L('aud_out'),x0,y+5,P.soft,'left'); x=x0+lw; x=chip('aud:out:',L('aud_auto'),x,y,out==='');
  outs.forEach(function(d){ x=chip('aud:out:'+d.id,d.id+' '+(d.type==='speaker'?L('aud_speaker'):L('aud_earpiece')),x,y,out===String(d.id)); }); y+=PF.CAP+13;
  var us=store.get('sonaroids_usage','media'); text(L('aud_usage'),x0,y+5,P.soft,'left'); x=x0+lw;
  x=chip('aud:usage:media',L('aud_media'),x,y,us==='media'); chip('aud:usage:game',L('aud_game'),x,y,us==='game'); y+=PF.CAP+14;
  var lines=[]; if(audSt){ lines.push(L('aud_now')+' '+String(audSt.src||'').toUpperCase()+(audSt.usage?' '+String(audSt.usage).toUpperCase():'')+(audSt.in?', '+L('aud_mic')+' '+audSt.in.id+' '+String(audSt.in.address||'').toUpperCase():'')+(audSt.out?', '+L('aud_out')+' '+audSt.out.id+' '+(audSt.out.type==='speaker'?L('aud_speaker'):String(audSt.out.type).toUpperCase()):''));
      if(audSt.active&&audSt.active.length) lines.push(L('aud_active')+' '+audSt.active.map(function(m){ return audLabel(m)||m.id; }).join(', '));
      if(audSt.fx) lines.push(L('aud_fx')+' '+String(audSt.fx).toUpperCase());
      if(audSt.error) lines.push(String(audSt.error).toUpperCase().slice(0,40)); }
    else lines.push(mode==='app'?L('aud_idle'):L('aud_browser_now'));
  if(audDev.mics&&!audDev.mics.length) lines.push(L('aud_nopos'));
  lines.forEach(function(l){ PF.wrap(l,LW-x0-SAFE.r-12,1).forEach(function(q){ text(q,x0,y,P.soft,'left'); y+=10; }); y+=2; });
  // v0.55: the lab inside the app (its stereo probe records through the app); Android's «back» returns to the game
  var ls=L('aud_lab'), lw2=PF.width(ls), lx=LW-SAFE.r-12-lw2, ly=LH-SAFE.b-14; text(ls,lx,ly,P.band,'left'); R(P.band,lx,ly+PF.CAP+2,lw2,1); BTN.push({id:'aud:lab:1',x:lx-8,y:ly-5,w:lw2+16,h:PF.CAP+10});
  say(L('aud_t')); }
function audAct(id){ var p=id.split(':'), k=p[1], v=p.slice(2).join(':');
  if(k==='mode') store.set('sonaroids_audio',v); else if(k==='mic') store.set('sonaroids_mic',v); else if(k==='out') store.set('sonaroids_out',v);
  else if(k==='src') store.set('sonaroids_src',v); else if(k==='usage') store.set('sonaroids_usage',v);
  else if(k==='retest') Sonar.audioRetest();
  else if(k==='lab'){ location.href='../lab/sonar_lab3.html'; return; }
  Sonar.restart(); booted=false; acoustic=false; audDev=null; }
var NO_MENU={title:1,lang:1,paused:1,restart:1,play:1}, NO_VER={title:1,over:1,play:1,count:1,'count-resume':1,paused:1,restart:1};
function chrome(){ if(LH>LW) return;
  var s=BH-3, vr=freeSide()!=='left', x=vr?LW-Math.round(SAFE.r*0.5)-10-s:Math.round(SAFE.l*0.5)+10, y=SAFE.t+7;
  if(!NO_MENU[scr]) iconButton(scr==='count'||scr==='count-resume'?'pause':scr==='scores'?'sc_back':'menu',x,y);
  // the wave screen: the try-out ship flies up the free side's edge — the version goes to the other top corner (by the "wave here" beacon)
  // the try-out ship flies up the left edge: there the version goes to the top right corner; on the scores screen the buttons' column
  // starts right under the menu button — the version stands beside it
  if(NO_VER[scr]) return;
  if(scr==='wave'&&!vr) diagCorner('V'+VERSION,true,SAFE.t+8,true);
  else if(scr==='scores') diagCorner('V'+VERSION,true,y+Math.round((s-PF.CAP)/2),false,vr?x-16:x+s+16);
  else diagCorner('V'+VERSION,true,y+s+14); }
resize(); Board.flush();
if('serviceWorker' in navigator&&location.protocol==='https:') navigator.serviceWorker.register('sw.js').then(function(r){ r.update(); }).catch(function(){});   // works offline; checks for a new version on every launch
go('title');   // always the menu first (0.44); a new player's first "Play" walks through the instruction
requestAnimationFrame(loop);
/* test hooks: headless tests drive the screens through these (harmless in the game) */
window.__sonaroids={go:go,act:ACT,scr:function(){ return scr; },btn:function(){ return BTN.slice(); },S:function(){ return {S:S,LW:LW,LH:LH,DPR:DPR,shipLane:Math.round(fx(Core.SHIP_X))+16}; },
  setBooted:function(v){ booted=v; },
  board:function(){ return {tbl:tblBox,nick:nickEl?{shown:nickEl.style.display!=='none',rect:nickEl.getBoundingClientRect().toJSON()}:null}; },
  side:function(){ return {hand:handSide(),rel:handRel,cam:camEnd(),stored:store.get('sonaroids_rel',''),say:sayLast}; }, wave:function(){ toWave(); },
  fake:function(){ booted=true; prep={res:{ok:true},doneT:-9}; T=Tune.create(100,true); T.ok=true; caught=true;          // a stand-in state for layout checks
    g=Core.create(1,Core.FH*(LW-SAFE.l)/LH); for(var i=0;i<300;i++) Core.step(g,0.5); g.state='over'; },state:function(){ return {scr:scr,g:g,T:T,caught:caught,prep:prep,lang:lang,linkCode:linkCode}; }};
})();
