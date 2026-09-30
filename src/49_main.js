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
var scr=null, scrT=0, clock=0, onboarding=false, direct=false, dirLoud=false, dirSilent=false, silentRetry=false, booted=false, errKind=null;
var handSaved=store.get('sonaroids_hand',''), acoustic=false;
var prep=null, T=null, caught=false, g=null, acc=0, countT=0, overT=0, shake=0, flash=0, rockSpr={}, best=+store.get('sonaroids_best','0')||0;
/* own sounds louder than this in the microphone are turned down (v0.19: 0.05, was 0.3). iPhone: peaks 0.007–0.013 with sounds on — never ducks */
var DUCK_PEAK=0.05;
var lastHand=null, shipY=null, sayLast='', pausedFrom=null, livesT=0, duckT=0;
var mode='fly';   // v0.84: which game — 'fly' (SonaFly) or 'race' (SonaRace); the getting ready is the same, «menu» is the game's own
function go(s){ if(mode==='race'&&s==='title') s='rtitle';
  if(scr==='wave'&&s!=='wave'&&!caught&&T&&typeof Board!=='undefined') Board.setup('nocatch',{t:scrT,flips:flips});   // left the wave step without a caught range
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
function diagCorner(label,top,ty,flip,ax){ var vr=ty?(freeSide()!=='left')!==!!flip:(flip!==undefined?!!flip:freeSide()==='left'),   /* at the bottom: flip true — always the right corner (the games' screen, v0.71) */   /* under the menu button (ty) — its side; flip — the other side */ vx=ax!==undefined?ax:vr?LW-SAFE.r-8:SAFE.l+8, vy=top?(ty||SAFE.t+8):LH-SAFE.b-12, vw=PF.width(label), al=vr?'right':'left';
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
function colW(items){ var w=btnW(items.filter(function(b){ return b[2]!=='sound'&&b[2]!=='skin'; }).map(function(b){ return b[1]; }));
  if(items.some(function(b){ return b[2]==='skin'; })) w=Math.max(w,skinW());
  return items.some(function(b){ return b[2]==='sound'; })?Math.max(w,soundW()):w; }
/* the «◀ skin: … ▶» row's width: the longest skin name between the arrows */
function skinW(){ return PF.width(L('skin')+': '+L('skin_'+SKIN_IDS.reduce(function(a,k){ return PF.width(L('skin_'+k))>PF.width(L('skin_'+a))?k:a; })))+2*Math.round(BH*0.9)+24; }
function column(items,y0,x0,gap){ var w=colW(items), h=BH; gap=gap===undefined?10:gap; var y=Math.round(y0-(items.length*(h+gap)-gap)/2), x=x0===undefined?sideX(w):x0;
  items.forEach(function(b){ if(b[2]==='sound') soundRow(x,y,w,h); else if(b[2]==='skin') skinRow(x,y,w,h); else button(b[0],b[1],x,y,w,h,b[2]||'',Math.floor(clock*2)%2===0); y+=h+gap; }); }
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
/* ── v0.70: the games' screen (the maintainer's sketch «A», background «4», 28 Sep): SONAROIDS, the games as cards side by side —
   SonaFly and SonaRace («soon»); a card's picture changes its skin every ~4 s with a pixel dissolve, and the whole screen behind is
   the chosen card's current skin, dimmed. Under the cards «Play», then «how to play», the language and the sounds; the version, the source
   and the app's update at the bottom. No high scores here (the maintainer) ── */
var hubSkin=Math.max(0,SKIN_IDS.indexOf(skinId)), hubPrev=-1, hubT=0, hubFade=1, raceImgs=null, raceI=0, soonT=-9, fadeMasks={};
function fadeMask(l){ if(fadeMasks[l]) return fadeMasks[l]; var c=document.createElement('canvas'); c.width=4; c.height=4; var x=c.getContext('2d');
  for(var y=0;y<4;y++) for(var i=0;i<4;i++) if(bay(i,y)<l/16){ x.fillStyle='#fff'; x.fillRect(i,y,1,1); } return fadeMasks[l]=x.createPattern(c,'repeat'); }
var mixC=null;
function dissolve(a,b,t){ if(!mixC||mixC.width!==LW||mixC.height!==LH){ mixC=document.createElement('canvas'); mixC.width=LW; mixC.height=LH; }
  var m=mixC.getContext('2d'); m.globalCompositeOperation='source-over'; m.clearRect(0,0,LW,LH); m.drawImage(b,0,0);
  m.globalCompositeOperation='destination-in'; m.fillStyle=fadeMask(Math.round(Math.max(0,Math.min(1,t))*16)); m.fillRect(0,0,LW,LH); m.globalCompositeOperation='source-over';
  var o=demoC2(); var ox=o.getContext('2d'); ox.drawImage(a,0,0); ox.drawImage(mixC,0,0); return o; }
var dC2=null; function demoC2(){ if(!dC2||dC2.width!==LW||dC2.height!==LH){ dC2=document.createElement('canvas'); dC2.width=LW; dC2.height=LH; } return dC2; }
var prevC=null;
/* v1.03 (the maintainer: «на главном сейчас меняется карточка только флая, на гонке тоже должны меняться скины, и на фоне все скины всех игр»):
   every HUB_T seconds the other game's card takes its next skin, and the background follows that card — SonaFly's six and SonaRace's two in turn */
var HUB_T=3, hubBg='fly', hubRace=0;
function hubTick(){ hubT+=DT; if(hubT<=HUB_T) return; hubT=0;
  if(hubBg==='fly'){ hubBg='race'; hubRace=(hubRace+1)%RACE_SKINS.length; return; }
  hubBg='fly'; hubPrev=hubSkin; var n; do{ n=Math.floor(Math.random()*SKIN_IDS.length); }while(n===hubSkin&&SKIN_IDS.length>1); hubSkin=n; hubFade=0; }
function hubFrame(){
  hubFade=Math.min(1,hubFade+DT/0.6);
  if(hubFade<1&&hubPrev>=0&&SKINS[SKIN_IDS[hubPrev]]){ var a=demoInto(SKINS[SKIN_IDS[hubPrev]],0);                     // the old skin, still…
    if(!prevC||prevC.width!==LW||prevC.height!==LH){ prevC=document.createElement('canvas'); prevC.width=LW; prevC.height=LH; }
    var pc2=prevC.getContext('2d'); pc2.clearRect(0,0,LW,LH); pc2.drawImage(a,0,0);
    var b=demoInto(SKINS[SKIN_IDS[hubSkin]],DT); return dissolve(prevC,b,hubFade); }           // …and the new one showing through, pixel by pixel
  return demoInto(SKINS[SKIN_IDS[hubSkin]],DT); }
var hubTmp=null; function hubHdTmp(){ if(!hubTmp||hubTmp.width!==hdCv.width||hubTmp.height!==hdCv.height){ hubTmp=document.createElement('canvas'); hubTmp.width=hdCv.width; hubTmp.height=hdCv.height; } return hubTmp; }
function hubCard(id,x,y,w,ih,img,name,sub,on){
  R(P.bg,x,y,w,ih+26);
  if(img&&(img===hdCv||img===flyHC||img===hubTmp)){ var tc=img; if(img===hdCv){ tc=hubHdTmp(); tc.getContext('2d').drawImage(hdCv,0,0); } lx.clearRect(x+2,y+2,w-4,ih);   // v0.72, HD: the card cut into the pixel canvas, the
    hx.save(); hx.setTransform(1,0,0,1,0,0); hx.drawImage(tc,Math.round((x+2)*hs),Math.round((y+2)*hs),Math.round((w-4)*hs),Math.round(ih*hs)); hx.restore(); }   // world drawn sharp under it
  else if(img) lx.drawImage(img,x+2,y+2,w-4,ih);
  if(!on){ lx.globalAlpha=0.55; R(P.bg,x+2,y+2,w-4,ih); lx.globalAlpha=1; }
  frame(x,y,w,ih+26,on?P.band:P.line); if(on) frame(x-1,y-1,w+2,ih+28,P.band);
  text(name,x+w/2,y+ih+(sub?4:7),on?P.text:P.soft,'center'); if(sub) text(sub,x+w/2,y+ih+15,P.soft,'center');
  BTN.push({id:id,x:x,y:y,w:w,h:ih+26}); }
/* v0.84: the SonaRace card shows the candy land itself — the menu's own demo race, drawn smaller into the card */
var raceHC=null;
/* v1.03: SonaFly's card in HD while the race is the background: the demo drawn full size off screen (its pictures are made for this scale) */
var flyHC=null;
function flyCardHD(id){ if(!flyHC||flyHC.width!==hdCv.width||flyHC.height!==hdCv.height){ flyHC=document.createElement('canvas'); flyHC.width=hdCv.width; flyHC.height=hdCv.height; }
  var keepH=hx, c=flyHC.getContext('2d'); c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,flyHC.width,flyHC.height);
  try{ hx=c; hx.setTransform(hs,0,0,hs,0,0); hx.imageSmoothingEnabled=true; noLight=true; drawDemo(skinView(id),DT); }
  finally { hx=keepH; noLight=false; }
  return flyHC; }
/* v1.03: the race drawn in one of its skins (the card's, not the player's choice), the player's skin put back after */
function withRaceSkin(sk,fn){ var keep=RSKIN; RSKIN=sk; try{ return fn(); } finally { RSKIN=keep; } }
function raceCardHD(w,h){ var k=uiS>1?hs:Math.max(1,hs), W2=Math.round(w*k), H2=Math.round(h*k);
  if(!raceHC||raceHC.width!==W2||raceHC.height!==H2){ raceHC=document.createElement('canvas'); raceHC.width=W2; raceHC.height=H2; }
  var keepH=hx, keepS=hs; raceDemoTick();
  try{ hx=raceHC.getContext('2d'); hs=W2/LW; rX0=0; noLight=true; raceScene(rDemo,rDemo.d,rDemo.car.y,DT); }
  finally { hx=keepH; hs=keepS; rX0=null; noLight=false; }
  return raceHC; }
function sHub(){ var fr, rimg, fid=SKIN_IDS[hubSkin], rsk=RACE_SKINS[hubRace]; hubTick(); fid=SKIN_IDS[hubSkin]; rsk=RACE_SKINS[hubRace];
  if(hubBg==='race'){ if(!hdShown) hdFrame(true,false);   // the turn came this frame: the HD canvas on now
    withRaceSkin(rsk,function(){ raceDemoTick(); noLight=true; raceScene(rDemo,rDemo.d,rDemo.car.y,DT); noLight=false; }); rimg=hubHdTmp(); rimg.getContext('2d').drawImage(hdCv,0,0);   // taken before SonaFly's card is drawn over it   // v1.03: the race behind, its card the same picture scaled down
    fr=hdWanted(fid)?flyCardHD(fid):demoInto(SKINS[fid],DT); }
  else { if(hdWanted(fid)){ noLight=true; drawDemo(skinView(fid),DT); noLight=false; fr=hdCv; }   // v0.75: no soft light (it would sit outside the card)   // v0.72, HD: the demo on the HD canvas; the card shows it scaled down
    else { fr=hubFrame(); lx.drawImage(fr,0,0); } }
  lx.globalAlpha=hubBg==='race'?0.8:0.72; R(P.bg,0,0,LW,LH); lx.globalAlpha=1;   // the race's lands are light: dimmed a little more
  var cx0=Math.round((SAFE.l+LW-SAFE.r)/2), y=SAFE.t+8, sub=LH>=150;   // v0.80: the line under the name on every phone (the cards ~11 px lower; it was only on screens ≥200 px high)
  text('SONAROIDS',cx0,y,P.band,'center',2); if(sub) text(L('hub_s'),cx0,y+19,P.soft,'center');
  // two rows under the cards: «play» (and, on a narrow screen, the sounds beside it), then «how to play», the language (and the sounds);
  // with the service links shown (a long press on the version) everything moves up a line to make room for them
  // v0.97: no «play» button — a tap on a card starts its game (the maintainer: «убери кнопку „играть“ с первого экрана, у нас тап по карточке же»);
  // one row under the cards, or two on a narrow screen (the sounds above «how to play» and the language)
  var bw=btnW([L('howto'),L('lang')]), sw=soundW(), narrow=bw*2+sw+16>LW-SAFE.l-SAFE.r-16;
  var vy=LH-SAFE.b-12, rowY=vy-8-BH-(diag?16:0), playY=narrow?rowY-8-BH:rowY, top=y+(sub?31:20), lab=24;
  var ih=Math.max(24,playY-8-lab-top), cw=Math.min(Math.round(ih*LW/LH),Math.round((LW-SAFE.l-SAFE.r-40)/2)), gap=16;
  ih=Math.round(cw*LH/LW); var cx=Math.round(cx0-cw-gap/2), ty=Math.round(top+(playY-8-lab-top-ih)/2);
  hubCard('hub_rocks',cx,ty,cw,ih,fr,'SonaFly','',true);
  hubCard('hub_race',cx+cw+gap,ty,cw,ih,rimg||withRaceSkin(rsk,function(){ return raceCardHD(cw-4,ih); }),'SonaRace','',true);   // v0.84: the race is open; v0.92: «тестовая пока версия»; v1.00: no longer («после добавления тетрадки надпись можно убирать»)
  if(narrow){ soundRow(Math.round(cx0-sw/2),playY,sw,BH);
    var x2=Math.round(cx0-bw-4); button('howto',L('howto'),x2,rowY,bw,BH,''); button('lang',L('lang'),x2+bw+8,rowY,bw,BH,''); }
  else { var tw=bw*2+sw+16, bx=Math.round(cx0-tw/2); button('howto',L('howto'),bx,rowY,bw,BH,''); button('lang',L('lang'),bx+bw+8,rowY,bw,BH,''); soundRow(bx+2*bw+16,rowY,sw,BH); }
  // v0.71 (the maintainer): the source bottom left, the app's update bottom centre, the version bottom right (a long press on it shows the
  // service links: logs, sound, lab)
  var vr=freeSide()==='left';
  diagCorner(L('version')+' '+VERSION,false,undefined,true);
  var gs=L('source'), gw=PF.width(gs), gx=SAFE.l+8;
  text(gs,gx,vy,P.soft,'left'); BTN.push({id:'source',x:Math.max(0,gx-6),y:vy-4,w:gw+12,h:Math.min(PF.CAP+10,LH-vy+4)});
  if(APP){ var us=L('app_upd'), uw=PF.width(us), ux=Math.round(cx0-uw/2); text(us,ux,vy,P.band,'left'); BTN.push({id:'appupd',x:ux-6,y:vy-4,w:uw+12,h:Math.min(PF.CAP+10,LH-vy+4)}); }
  if(/Android/i.test(navigator.userAgent)&&!APP){ var as=L('get_apk'), aw=PF.width(as), ax=vr?LW-SAFE.r-8-aw:SAFE.l+8, ay=SAFE.t+8;
    text(as,ax,ay,P.band,'left'); R(P.band,ax,ay+PF.CAP+2,aw,1); BTN.push({id:'apk',x:ax-6,y:ay-6,w:aw+12,h:PF.CAP+12}); }
  say('Sonaroids. SonaFly. '+L('play')); }
/* ── the game's own screen (SonaFly): the chosen skin flies behind, the buttons on the free side over a dim band:
   play, high scores, how to play, «◀ skin: … ▶» (the picture changes at once), «← all games» ── */
function skinRow(x,y,w,h){ var s=Math.round(h*0.9), ty=y+Math.round((h-7)/2);
  R(P.bg,x,y,w,h); frame(x,y,w,h,P.band);
  polyFill([[x+s/2+2,y+h/2-4],[x+s/2+2,y+h/2+4],[x+s/2-3,y+h/2]],P.band); polyFill([[x+w-s/2-2,y+h/2-4],[x+w-s/2-2,y+h/2+4],[x+w-s/2+3,y+h/2]],P.band);
  text(L('skin')+': '+L('skin_'+skinId),x+w/2,ty,P.text,'center',1,true);
  BTN.push({id:'skin_prev',x:x,y:y,w:s+6,h:h}); BTN.push({id:'skin_next',x:x+w-s-6,y:y,w:s+6,h:h}); BTN.push({id:'skin_next',x:x+s+6,y:y,w:w-2*s-12,h:h});
  var n=SKIN_IDS.length, i0=SKIN_IDS.indexOf(skinId), dx=Math.round(x+w/2-(n*6-2)/2); for(var i=0;i<n;i++) R(i===i0?P.band:P.line,dx+i*6,y+h+3,3,3); }
function sTitle(){
  // v0.72: «graphics: pixels / HD» under the skin (a skin without HD pictures yet says «soon»)
  var gl2=gfxLabel();
  var items=[['play',L('play'),'primary'],['scores',L('scores')],['howto',L('howto')],['skin','','skin'],['gfx',gl2],['hub',L('all_games')]];
  var w=Math.max(btnW(items.filter(function(b){ return b[1]; }).map(function(b){ return b[1]; })),PF.width(L('skin')+': '+L('skin_'+SKIN_IDS.reduce(function(a,k){ return PF.width(L('skin_'+k))>PF.width(L('skin_'+a))?k:a; })))+2*Math.round(BH*0.9)+24);
  var bx0=sideX(w), band0=freeSide()==='left'?0:bx0-Math.max(8,Math.round(LW*0.04)), band1=freeSide()==='left'?bx0+w+Math.max(8,Math.round(LW*0.04)):LW;
  noLight=true; drawDemo(SK,DT,freeSide()==='left'?band1+16:SAFE.l+16); noLight=false;           // the ship flies beside the buttons' band; no soft light over the buttons
  lx.globalAlpha=0.55; R(P.bg,band0,0,band1-band0,LH); lx.globalAlpha=1;
  var h=BH, gap=items.length>5?7:10, y=Math.round(LH*0.52-(items.length*(h+gap)-gap)/2);
  items.forEach(function(b){ if(b[2]==='skin') skinRow(bx0,y,w,h); else button(b[0],b[1],bx0,y,w,h,b[2]||'',Math.floor(clock*2)%2===0); y+=h+gap; });
  var a0=freeSide()==='left'?band1:SAFE.l, a1=freeSide()==='left'?LW-SAFE.r:band0, lsc=PF.width('SonaFly',2)<=a1-a0-12?2:1; text('SonaFly',Math.round((a0+a1)/2),Math.round(LH*0.16),P.band,'center',lsc);
  say('SonaFly. '+L('play')+'. '+L('skin')+': '+L('skin_'+skinId)); }
/* v0.86: an iPhone asks for 40–60% (the maintainer's iPhone, 29 Sep: at 30–40% its probe came 3 dB over the bar — once it steered, once
   not; the iPhone gives the game its call volume while the microphone is on, lower than the media one); the phone that does not hear its
   own probe at all (a level 40 dB under the bar, the probe band empty) is told about silent mode — it can mute the game after all */
function isIOS(){ var ua=navigator.userAgent||''; return /iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1); }
function volKey(k){ return isIOS()&&STR[lang][k+'_ios']?k+'_ios':k; }
function sSound(){ sky(DT,0.3); titles(L(direct?(dirSilent?'volume_silent':volKey(dirLoud?'volume_loud':'volume_direct')):volKey('volume')),L(direct&&dirSilent?'volume_silent_s':'volume_s')); soundVolume(scrT); nextBtn('next',L('next')); stepSquares('sound'); }
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
    else { var silent=prep.res.why==='noprobe'||(prep.res.why==='quiet'&&typeof prep.res.snr==='number'&&prep.res.snr<10);   // not heard at all: every heard probe on record had 24–48 dB
      if(silent&&!silentRetry){ silentRetry=true; Logs.ev('зонд не слышно — ещё раз'); prep=null; scrT=PAUSE; return; }            // once more at once: a sound that did not start
      silentRetry=false; direct=true; dirLoud=prep.res.why==='loud'; dirSilent=silent; onboarding=false; go('sound'); } }
  stepSquares('away');  }
/* v0.69: the probe plays from the front camera's end and that end is on the left — a right-handed player has to turn the phone round.
   The screen goes dark: «turn the phone round, by 180° if you play with your right hand», the phone with two arrows round it, «round like a
   wheel — don't flip it face down», and «I play left-handed» (remembered). Once the phone is turned, getting ready starts again from «take
   your hand away»: the empty room and the probe's end are measured anew in the new position (the maintainer's sketch Б2, 28 Sep) */
var lefty=store.get('sonaroids_lefty','')==='1', turnShown=false;
function needTurn(){ return !lefty&&!!portOr()&&camEnd()&&handSide()==='left'; }
function arcArrow(cx,cy,r,a0,a1,c){ var n=Math.ceil(Math.abs(a1-a0)*r*2)+2, i, a;
  for(i=0;i<=n;i++){ a=a0+(a1-a0)*i/n; R(c,cx+Math.cos(a)*r,cy+Math.sin(a)*r,1,1); R(c,cx+Math.cos(a)*(r+1),cy+Math.sin(a)*(r+1),1,1); }
  var sg=a1>a0?1:-1, tx=cx+Math.cos(a1)*r, ty=cy+Math.sin(a1)*r, dx=-Math.sin(a1)*sg, dy=Math.cos(a1)*sg, nx=Math.cos(a1), ny=Math.sin(a1), h=Math.max(6,r*0.2);
  polyFill([[tx+dx*h,ty+dy*h],[tx+nx*h*0.62,ty+ny*h*0.62],[tx-nx*h*0.62,ty-ny*h*0.62]],c); }
function turnOverlay(){ lx.globalAlpha=0.92; R(P.bg,0,0,LW,LH); lx.globalAlpha=1;
  var cx=Math.round((SAFE.l+LW-SAFE.r)/2), mw=LW-SAFE.l-SAFE.r-2*56, y=topY(), sc=2;   // clear of the menu button and the version in the top corners
  var lines=[L('turn_t'),L('turn_s'),L('turn_s2')]; if(lines.some(function(l){ return PF.width(l,sc)>mw; })) sc=1;                              // both lines the same size (the maintainer)
  lines.forEach(function(l){ text(l,cx,y,P.text,'center',sc); y+=PF.CAP*sc+6; });
  var bY=LH-SAFE.b-BH-6, hY=bY-16, r=Math.max(18,Math.min(Math.round((hY-y-8)/2)-2,Math.round(LH*0.2))), cy=Math.round(y+4+r+2);
  var pw=Math.round(r*1.45), ph=Math.round(r*0.7), px=cx-Math.round(pw/2), py=cy-Math.round(ph/2);
  R('#8a7aa8',px,py,pw,ph); R('#141226',px+3,py+2,pw-6,ph-4);                                // the phone from above, the camera end on the left (where it is now)
  R(P.band,px+1,cy-1,1,2); for(var k=-2;k<=2;k++) R(P.bullet,px+pw-1,cy+k,1,1); R(P.ship[1],cx+Math.round(pw*0.15),cy-1,3,3);
  arcArrow(cx,cy,r,Math.PI*1.12,Math.PI*1.86,P.band); arcArrow(cx,cy,r,Math.PI*0.12,Math.PI*0.86,P.band);
  text(L('turn_h'),cx,hY,P.band,'center');
  var w=btnW([L('lefty')]); button('lefty',L('lefty'),cx-Math.round(w/2),bY,w,BH,'');
  say(L('turn_t')+'. '+L('turn_s')+' '+L('turn_s2')); }
window.addEventListener('orientationchange',function(){ if(!turnShown) return; turnShown=false;
  Logs.ev('разворот телефона'); prep=null; acoustic=false; handRel=''; accSide=null; go('away'); });
function sWave(){ sky(DT,0.3); poolFill(1); var m=handSide()==='left', f=handFrac(), live=f!==null;
  if(needTurn()&&!caught){ if(!turnShown) Logs.ev('просим развернуть',{hand:handSide(),rel:handRel}); turnShown=true; seenT=scrT; flipT=-9;
    picture(function(){ return sceneBoth('wave',scrT,0.5,0,true,clock); },m); turnOverlay(); return; }
  turnShown=false;
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
function sTry(){ if(mode==='race'){ raceTry(); return; } followShip(); /* the sky is already drawn by sWave */ SK.ship(fx(Core.SHIP_X),shipY,clock,false);
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
function poolFill(budget){ if(pool.K!==K||pool.skin!==SK||(SK.hd&&pool.hs!==hs)){ pool={K:K,skin:SK,hs:hs,list:[[],[],[]]}; rockSpr={}; } for(var n=0;n<budget;n++){ var sz=[0,1,2].filter(function(i){ return pool.list[i].length<POOL_N; })[0]; if(sz===undefined) return;
  pool.list[sz].push(makeSkinRock(SK,sz,Core.R_SIZE[sz],pool.list[sz].length*17+sz)); } }   // v0.70: the skin's rocks
function rockFromPool(r){ poolFill(0); var l=pool.list[r.sz]; if(!l||!l.length) return makeSkinRock(SK,r.sz,r.r,r.id);
  var b=l[r.id%l.length], o={}; for(var k in b) o[k]=b[k]; o.ox=b.ox||0; o.rot=(r.id*5)%16; o.vr=b.vr===0?0:((r.id*7)%11-5); return o; }
function field(dt,speed){ if(mode==='race'&&g&&g.car){ raceScene(g,g.d,g.car.y,dt); raceParts(dt); return; }
  poolFill(0); SK.sky(dt,speed);
  if(!g) return;
  if(g.state!=='play'){ g.bullets=[]; g.ebullets=[]; g.rocks.forEach(function(r){ r.x+=r.vx*dt; r.y+=r.vy*dt; }); if(g.ufo) g.ufo.x-=6*dt; }   // after the game: things drift on, for the look only
  g.rocks.forEach(function(r){ var sp=rockSpr[r.id]; if(!sp){ sp=rockSpr[r.id]=rockFromPool(r); }
    sp.rot=(sp.rot+sp.vr*dt+16)%16; if(SK.drawRock){ SK.drawRock(sp,fx(r.x),r.y*K); return; }
    var fr=sp.frames[Math.floor(sp.rot)%16]; lx.drawImage(fr,Math.round(fx(r.x)-sp.size/2+(sp.ox||0)),Math.round(r.y*K-sp.size/2+(sp.oy||0))); });
  g.picks.forEach(function(p){ var x=fx(p.x), y=p.y*K+Math.sin(clock*3)*2; if(!SK.hd){ x=Math.round(x); y=Math.round(y); }
    SK.pick(x,y,p.type); });
  if(g.ufo){ var u=g.ufo, big=u.kind==='big', ux=SK.hd?fx(u.x):Math.round(fx(u.x)), uy=SK.hd?u.y*K:Math.round(u.y*K);
    var hurtNow=u.hitT>0&&Math.floor(clock*20)%2===0;                                                  // just hit: it flashes white
    SK.ufo(ux,uy,big,hurtNow); }
  g.ebullets.forEach(function(b){ SK.ebullet(fx(b.x),b.y*K); });
  g.bullets.forEach(function(b){ SK.bullet(fx(b.x),b.y*K); });
  if(g.state==='play'){ var sx=fx(g.ship.x), sy=g.ship.y*K;
    SK.ship(sx,sy,clock,g.ship.inv>0&&Math.floor(clock*14)%2===0);
    if(g.ship.shield>0&&(g.ship.shield>3||Math.floor(clock*8)%2)){                 // the shield: a ring of dots, blinking in its last 3 s
      if(SK.shieldRing) SK.shieldRing(sx,sy,clock); else { for(var a=0;a<28;a+=2){ var an=a/28*6.283+clock*2; R(SK.shield(),sx+7+Math.cos(an)*11,sy+Math.sin(an)*9,1,1); } } light(sx+7,sy,16*K,P.glowP,0.25); }
    if(livesT>0){ for(var i=0;i<g.lives;i++) blit(MINI,SK.mini(),sx-2+i*7,sy-14); } }   // lives: shown only for a moment after a hit
  drawParts(dt);
}
function sCount(){ if(mode==='race'){ raceCount(); return; } countT-=DT; poolFill(2); followShip();
  SK.sky(DT,0.6); SK.ship(fx(Core.SHIP_X),shipY,clock,false);
  var n=Math.max(1,Math.ceil(countT)), cx0=Math.round(LW/2), cy0=Math.round(LH/2);
  ring(cx0,cy0,13,1-(countT-Math.floor(countT)),P.band); text(String(n),cx0,cy0-3,P.text,'center'); say(String(n));
  if(Math.ceil(countT)<Math.ceil(countT+DT)&&countT>0) Sfx.play('tick');
  if(countT<=0) startGame(); }
var SITE='sonaroids.app';
/* v0.34: the speaker or the microphone covered (the palm right at the port end, fingers): the direct sound sinks by 20–35 dB while the probe
   is still loud in the microphone. The sonar no longer takes it for a shifted input; the player gets a line under the score after 0.7 s */
var covT=0;
function coveredLine(y){ covT=(typeof DSP2!=='undefined'&&DSP2.info().covered)?covT+DT:0; if(covT>0.7) text(L('covered'),Math.round(LW/2),y,P.hit,'center'); }
function sPlay(){ if(mode==='race'){ racePlay(); return; }
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
function endGame(){ if(mode==='race'&&g&&g.car){ raceEnd(); return; } g.state='over'; overT=0; Logs.gameStop(); Board.finish(g.score); Board.flush(); if(g.score>best){ best=g.score; store.set('sonaroids_best',best); } go('over'); }
function react(){ g.events.forEach(function(k){
  if(k==='fire'){ if(Math.random()<0.5) Sfx.play('fire'); } else if(k!=='crash') Sfx.play(k); });
  var BU=SK.bursts(); (g.gone||[]).forEach(function(r){ burst(fx(r.x),r.y*K,8+Math.round(r.r*K),BU.rock,50*K); delete rockSpr[r.id]; shake=Math.max(shake,0.08+r.r*0.004); });
  (g.fx||[]).forEach(function(f){ if(f.ufo){ burst(fx(f.x),f.y*K,40,BU.ufo,90*K); shake=0.35; } else if(f.pick) burst(fx(f.x),f.y*K,14,BU.pick,50*K); });
  if(g.events.indexOf('ufo_hit')>=0&&g.ufo){ burst(fx(g.ufo.x),g.ufo.y*K,14,[P.text].concat(BU.ufo),60*K); shake=Math.max(shake,0.12); }
  if(g.events.indexOf('shield')>=0) burst(fx(g.ship.x)+6,g.ship.y*K,20,BU.pick,60*K);
  if((g.fx||[]).some(function(f){ return f.pick==='life'; })) livesT=1.8;                  // a life taken: the lives show for a moment
  if(g.events.indexOf('hit')>=0||g.events.indexOf('over')>=0){ flash=0.25; shake=0.4; livesT=1.8; burst(fx(g.ship.x)+6,g.ship.y*K,26,BU.ship,70*K); }
}
function sOver(){ if(mode==='race'&&g&&g.car){ raceOver(); return; } overT+=DT;                       // no tuning here: it is done on the wave screen before every game (24 Sep)
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
function sScores(){ var rc=mode==='race'; if(rc){ raceDemoTick(); raceScene(rDemo,rDemo.d,rDemo.car.y,DT); lx.globalAlpha=0.72; R(P.bg,0,0,LW,LH); lx.globalAlpha=1; } else sky(DT,0.3); var c=Board.top(period,rc?'race':'fly');   // v1.01: SonaRace's tables over its road
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
function gfxLabel(){ return L('gfx')+': '+(gfxMode==='hd'?'HD'+(hdAvail(skinId)?'':' ('+L('soon')+')'):L('gfx_pixel')); }
/* v0.78: «ГРАФИКА: ПИКСЕЛИ / HD» in the pause too (the maintainer: switch it right during a session) — the same action as in the menu */
/* v0.82: the pause in two columns (the maintainer's pick «Б»): the game's actions on the free side, and beside them the look and the sound —
   «◀ skin ▶» (the maintainer: «добавить выбор скина и в меню игры»), graphics, sounds; the skin changes at once, the game waits */
function sPaused(){ field(DT,0); lx.globalAlpha=0.5; R(P.bg,0,0,LW,LH); lx.globalAlpha=1; titles(L('paused'));
  var act=[['resume',L('resume'),'primary']].concat(pausedFrom==='play'?[['restart',L('restart')],['quit',L('quit')]]:[]).concat([['exit',L('exit')]]),
      look=mode==='race'?[['rskin',raceSkinLabel()],['gfx',L('gfx')+': '+(gfxMode==='hd'?'HD':L('gfx_pixel'))],['sfx','','sound']]:[['skin','','skin'],['gfx',gfxLabel()],['sfx','','sound']], top=topY()+12, bot=LH-SAFE.b-4;
  // v1.03: SonaRace's pause as SonaFly's — the skin and the graphics beside the actions (Den: «во флае можно скин и графику менять прямо во время игры в меню паузы, в гонках надо сделать аналогичное»)
  var w1=colW(act), w2=colW(look), g=10, left=freeSide()==='left', x1=sideX(w1), x2=left?x1+w1+g:x1-g-w2, cy=Math.min(Math.round(LH*0.55),Math.round((top+bot)/2));
  if(w1+g+w2>LW-SAFE.l-SAFE.r-2*Math.max(8,Math.round(LW*0.04))){                                        // too narrow for two (a tablet in Russian): one tight column
    var it=act.concat(look), gap=Math.max(2,Math.min(8,Math.floor((bot-top+2-it.length*BH)/(it.length-1))));
    column(it,Math.round((top+bot)/2),undefined,gap); return; }
  column(act,cy,x1,8); column(look,cy,x2,8); }
/* v0.24 "start over" from the pause menu: straight into a countdown with the same calibration, or through calibration again */
function sRestart(){ field(DT,0); lx.globalAlpha=0.5; R(P.bg,0,0,LW,LH); lx.globalAlpha=1; titles(L('restart'),L('restart_s'));
  column([['rs_go',L('rs_go'),'primary'],['rs_cal',L('recal')],['rs_back',L('back')]],Math.round(LH*0.58)); }
/* the running game is dropped without the game-over screen; its score still counts for the best */
function dropGame(){ if(mode==='race'&&g&&g.car){ if(g.state!=='over'){ Logs.gameEv('restarted by the player'); g.state='over'; Logs.gameStop(); if(g.score>raceBest){ raceBest=g.score; store.set('sonaroids_race_best',raceBest); } } return; }
  if(g&&g.state==='play'){ Logs.gameEv('restarted by the player'); g.state='over'; Logs.gameStop(); Board.finish(g.score); if(g.score>best){ best=g.score; store.set('sonaroids_best',best); } } }
function sLost(){ sky(DT,0.2); titles(L('lost_t'),L('lost_s'),P.hit); nextBtn('retry',L('retry')); }
function sNomic(){ sky(DT,0.2); titles(L('nomic_t'),L(errKind==='mic'?'nomic_s':'noaudio_s'),P.hit); nextBtn('retry',L('retry')); }
function sRotate(){ lx.fillStyle=P.bg; lx.fillRect(0,0,LW,LH); var y=Math.round(LH/2-24); y=para(L('rotate'),LW/2,y,LW-16,P.text);
  para(L('rotate_s'),LW/2,y+12,LW-24,P.soft); say(L('rotate')+'. '+L('rotate_s')); }   // 25 Sep: some players don't think of the rotation lock

/* ════ SONARACE (v0.84; the maintainer, 29 Sep: «ладонь только рулит; машинка едет, обгоняет, собирает топливо»). The rules are in
   src/14_race.js, the candy land in src/48_racehd.js; the getting ready (probe, empty room, wave, try-out) is SonaFly's, the car stands in
   for the ship. Drawn in HD only for now; the best race is kept on the phone ('sonaroids_race_best'), no table yet ════ */
/* v0.90, for testing (the maintainer: «верни для тестов выбор „руль по дороге“»): in SonaRace's menu the steering — by the height on the
   screen, or along the road as in 0.87 (v0.91: the «wide range» switch is gone — «это решается перекалибровкой») */
var raceSteer=store.get('sonaroids_race_steer','road')==='height'?'height':'road';   // v0.98: along the road by default («так управляется лучше»)
function raceRowLabel(){ return L('r_steer')+': '+L(raceSteer==='road'?'r_steer_r':'r_steer_h'); }
/* v0.92, «НАСТРОЙКИ ТЕСТА» (the maintainer: «наделай мне включателей и выключателей тех или иных условий, чтобы я поигрался — как лучше и
   играбельнее»; «давай попробуем не замедляться при врезании»; «оставим только „магнит + защита + ускорение“»): kept on the phone, written
   into each race's log. The defaults are his latest words: a knock does not slow, only the turbo+magnet+bubble gift */
var RACE_OPT_DEF=Race.optOf(null);   // v0.98: the rules of the game (Race.OPT0)
var raceOpt=(function(){ var o=null; try{ o=JSON.parse(store.get('sonaroids_race_opt','')||'null'); }catch(e){} if(o&&o.syrup===false){ o.syrup=true; o.puddles=0; } if(o&&o.superN===undefined){ o.superN=o.superK===undefined?6:o.superK<0.9?8:o.superK<1.4?6:4; } if(o) delete o.superK; return Race.optOf(o||RACE_OPT_DEF); })();   // v0.93: 0.92's «syrup: no» is «puddles: none»
/* v0.98: the test settings hidden (the maintainer: «спрячь меню тестов правил — если надо будет, я скажу, опять покажешь»): the race plays by the
   rules of the game, steering along the road; what was chosen in the tests stays on the phone for when RACE_TEST is back on */
/* v1.00: the race's skins (the candy land, the notebook), kept on the phone; the switch is in the race's menu */
var RACE_SKINS=['candy','note'], raceSkin=(function(){ var v=store.get('sonaroids_race_skin','candy'); return RACE_SKINS.indexOf(v)<0?'candy':v; })(); RSKIN=raceSkin;
function raceSkinLabel(){ return L('r_skin')+': '+L('r_sk_'+raceSkin); }
var RACE_TEST=false;
function raceRules(){ return RACE_TEST?raceOpt:Race.optOf(null); }
if(!RACE_TEST) raceSteer='road';
function raceOptSave(){ store.set('sonaroids_race_opt',JSON.stringify(raceOpt)); }
/* v0.93: how many cars and puddles — none, very few, few, some, many, very many (a share of the tuned number) */
var R_LEVELS=[[0,'r_none'],[0.3,'r_vfew'],[0.6,'r_few'],[1,'r_mid'],[1.5,'r_many'],[2.2,'r_vmany']];
function rLevelI(v){ var b=0; R_LEVELS.forEach(function(q,i){ if(Math.abs(q[0]-v)<Math.abs(R_LEVELS[b][0]-v)) b=i; }); return b; }
function rLevel(v){ return L(R_LEVELS[rLevelI(v)][1]); }
function rNext(v){ return R_LEVELS[(rLevelI(v)+1)%R_LEVELS.length][0]; }
var RSET=[['rs_steer',function(){ return raceRowLabel(); },function(){ raceSteer=raceSteer==='road'?'height':'road'; store.set('sonaroids_race_steer',raceSteer); rCarYs=null; }],
  ['rs_knock',function(){ return L('r_knock')+': '+L(raceOpt.crashSlow?'r_yes':'r_no'); },function(){ raceOpt.crashSlow=!raceOpt.crashSlow; }],
  ['rs_kfuel',function(){ return L('r_kfuel')+': '+L(raceOpt.crashFuel?'r_yes':'r_no'); },function(){ raceOpt.crashFuel=!raceOpt.crashFuel; }],
  ['rs_mag',function(){ return L('r_mag')+': '+L(raceOpt.gifts.magnet?'r_yes':'r_no'); },function(){ raceOpt.gifts.magnet=!raceOpt.gifts.magnet; }],
  ['rs_bub',function(){ return L('r_bub')+': '+L(raceOpt.gifts.bubble?'r_yes':'r_no'); },function(){ raceOpt.gifts.bubble=!raceOpt.gifts.bubble; }],
  ['rs_tbub',function(){ return L('r_tbub')+': '+L(raceOpt.gifts.tbubble?'r_yes':'r_no'); },function(){ raceOpt.gifts.tbubble=!raceOpt.gifts.tbubble; }],
  ['rs_tmag',function(){ return L('r_tmag')+': '+L(raceOpt.gifts.tmagnet?'r_yes':'r_no'); },function(){ raceOpt.gifts.tmagnet=!raceOpt.gifts.tmagnet; }],
  ['rs_super',function(){ return L('r_super')+': '+L('r_1of')+' '+raceOpt.superN; },function(){ raceOpt.superN=raceOpt.superN===8?6:raceOpt.superN===6?4:8; }],   // v0.96: 1 gift in 8, 6, 4 (the maintainer's numbers); v0.98: exactly one in every 8, 6, 4
  ['rs_bpop',function(){ return L('r_bpop')+': '+L(raceOpt.bubblePop?'r_yes':'r_no'); },function(){ raceOpt.bubblePop=!raceOpt.bubblePop; }],
  ['rs_cars',function(){ return L('r_cars')+': '+rLevel(raceOpt.traffic); },function(){ raceOpt.traffic=rNext(raceOpt.traffic); }],   // v0.93: none … very many
  ['rs_puds',function(){ return L('r_puds')+': '+rLevel(raceOpt.puddles); },function(){ raceOpt.puddles=rNext(raceOpt.puddles); }],
  ['rs_speed',function(){ return L('r_speed')+': '+L(raceOpt.speed<1?'r_slow':raceOpt.speed>1?'r_fast':'r_norm'); },function(){ raceOpt.speed=raceOpt.speed<1?1:raceOpt.speed>1?0.85:1.15; }],
  ['rs_burn',function(){ return L('r_burn')+': '+L(raceOpt.burn?'r_burn_y':'r_burn_n'); },function(){ raceOpt.burn=!raceOpt.burn; }],
  ['rs_verge',function(){ return L('r_verge')+': '+L(raceOpt.offSlow?'r_yes':'r_no'); },function(){ raceOpt.offSlow=!raceOpt.offSlow; }]];
function sRSet(){ raceDemoTick(); raceScene(rDemo,rDemo.d,rDemo.car.y,DT); lx.globalAlpha=0.7; R(P.bg,0,0,LW,LH); lx.globalAlpha=1;
  var y=titles(L('r_set')), nc=3, n=Math.ceil(RSET.length/nc), gap=6, w=Math.min(btnW(RSET.map(function(q){ return q[1](); })),Math.floor((LW-SAFE.l-SAFE.r-12-gap*(nc-1))/nc)), x0=Math.round((SAFE.l+LW-SAFE.r)/2-(nc*w+(nc-1)*gap)/2);   // v0.93: three columns for thirteen
  var nr=n+1, room=LH-SAFE.b-6-(y+4), g2=Math.max(2,Math.min(6,Math.floor((room-nr*BH-4)/(nr-1)))), y0=y+4+Math.max(0,Math.round((room-(nr*BH+(nr-1)*g2+4))/2));
  RSET.forEach(function(q,i){ var c=Math.floor(i/n), r=i%n; button(q[0],q[1](),x0+c*(w+gap),y0+r*(BH+g2),w,BH,''); });
  var yp=y0+n*(BH+g2)+4, cur=rPresetNow();   // v0.94: the three rule sets under the switches, the one in use lit
  R_PRESETS.forEach(function(q,i){ button(q[0],L(q[1]),x0+i*(w+gap),yp,w,BH,q[0]===cur?'primary':''); });
  say(L('r_set')); }
/* v0.94, rule sets (the maintainer: «полное описание настроек на А, Д и Е»): the bot's 30 races each picked these three to try by hand —
   А his own, Д lively and long (turbo+bubble too, a higher speed), Е strict and short (a knock slows, many cars and puddles). The steering is not part of a set */
var R_GIFT1={magnet:false,bubble:false,tbubble:false,tmagnet:true};
var R_PRESETS=[['rp_a','r_pa',Race.optOf(null)],   // v0.98: set А is the rules of the game
  ['rp_d','r_pd',{crashSlow:false,crashFuel:true,gifts:{magnet:false,bubble:false,tbubble:true,tmagnet:true},traffic:1,puddles:1,bubblePop:true,superN:6,speed:1.15,burn:true,syrup:true,offSlow:true}],
  ['rp_e','r_pe',{crashSlow:true,crashFuel:true,gifts:R_GIFT1,traffic:1.5,puddles:1.5,bubblePop:true,superN:6,speed:1,burn:true,syrup:true,offSlow:true}]];
function rPresetNow(){ var k=JSON.stringify(Race.optOf(raceOpt)), f=null; R_PRESETS.forEach(function(q){ if(JSON.stringify(Race.optOf(q[2]))===k) f=q[0]; }); return f; }
var rDemo=null, rTry=null, rTryD=0, raceBest=+store.get('sonaroids_race_best','0')||0, raceNew=false;
function raceFW(){ return Race.FH*(LW-SAFE.l)/LH; }
function newSeed(){ try{ var a=new Uint32Array(1); crypto.getRandomValues(a); return a[0]; }catch(e){ return Math.floor(Math.random()*4294967296); } }
/* the menu's and the card's race drives itself (a new one after ~6 km, so its numbers stay small) */
function raceDemoTick(){ if(!rDemo||rDemo.d>60000) rDemo=Race.create(20260929,raceFW(),Race.FH/2);
  if(rDemo._c===clock) return; rDemo._c=clock; for(var n=Math.max(1,Math.round(DT*60));n>0;n--) raceDemoStep(rDemo); }
function sRTitle(){ raceDemoTick(); raceScene(rDemo,rDemo.d,rDemo.car.y,DT);
  var items=[['play',L('play'),'primary'],['scores',L('scores')],['howto',L('howto')]].concat(RACE_TEST?[['rset',L('r_set')]]:[]).concat([['rskin',raceSkinLabel()],['gfx',L('gfx')+': '+(gfxMode==='hd'?'HD':L('gfx_pixel'))],['sfx','','sound'],['hub',L('all_games')]]), w=colW(items);
  var bx0=sideX(w), m=Math.max(8,Math.round(LW*0.04)), band0=freeSide()==='left'?0:bx0-m, band1=freeSide()==='left'?bx0+w+m:LW;
  lx.globalAlpha=0.55; R(P.bg,band0,0,band1-band0,LH); lx.globalAlpha=1;
  column(items,Math.round(LH*0.52),bx0,items.length>5?6:8);
  var a0=freeSide()==='left'?band1:SAFE.l, a1=freeSide()==='left'?LW-SAFE.r:band0, cx0=Math.round((a0+a1)/2), lsc=PF.width('SonaRace',2)<=a1-a0-12?2:1, y=Math.round(LH*0.14);
  text('SonaRace',cx0,y,P.band,'center',lsc); y+=lsc*10+6;
  PF.wrap(L('r_s'),a1-a0-16,1).forEach(function(l){ text(l,cx0,y,P.text,'center'); y+=10; });
  if(raceBest>0) text(L('best')+' '+raceBest,cx0,LH-SAFE.b-28,P.text,'center');
  say('SonaRace. '+L('play')); }
/* the try-out before the race: an empty stretch of road rolls slowly, the car follows the palm */
/* the car before the race: by the height as the ship, or along the road (then its place across the road, as in the race) */
var rCarYs=null;
function raceCarY(rg,vd){ if(raceSteer!=='road') return shipY/K; var t=Race.steerY(rg,vd+Race.CAR_X,lastHand===null?0.5:lastHand); rCarYs=rCarYs===null?t:rCarYs+(t-rCarYs)*0.49; return rCarYs; }
function raceTry(){ followShip(); lx.clearRect(0,0,LW,LH); if(!rTry){ rTry=Race.create(7,raceFW(),Race.FH/2); rTryD=0; } rTryD+=45*DT;
  raceScene(rTry,rTryD,raceCarY(rTry,rTryD),DT);
  titles(L('wave_ok'),L('r_try'));
  var items=[['start',L('play'),'primary'],['again',L('recal')]], bw=btnW(items.map(function(q){ return q[1]; })), lane=Math.round(fx(Race.CAR_X))+30;
  column(items,Math.round(LH*0.62),freeSide()==='left'?Math.max(sideX(bw),lane):undefined); stepSquares('wave'); }
/* the countdown: the race's own road, still, the car at the palm */
function raceCount(){ countT-=DT; followShip(); raceScene(g,g.d,raceCarY(g,g.d),DT);
  var n=Math.max(1,Math.ceil(countT)), cx0=Math.round(LW/2), cy0=Math.round(LH/2);
  ring(cx0,cy0,13,1-(countT-Math.floor(countT)),P.band); text(String(n),cx0,cy0-3,P.text,'center'); say(String(n));
  if(Math.ceil(countT)<Math.ceil(countT+DT)&&countT>0) Sfx.play('tick');
  if(countT<=0) startGame(); }
function raceStart(){ var y0=raceSteer==='road'?(rCarYs===null?null:+rCarYs.toFixed(3)):(shipY===null?null:+(shipY/K).toFixed(3)); if(y0!==null) g.car.y=Math.max(Race.MARGIN,Math.min(Race.FH-Race.MARGIN,y0)); g.car.y=+g.car.y.toFixed(3); g.car.off=g.car.y-Race.centre(g,g.d+g.car.x); if(!RACE_TEST) Board.start(g.seed,g.FW,g.car.y,{game:'race',core:Race.TAG,steer:g.steer});   /* v1.01: the race goes to the tables — the server replays it from this start */
  acc=0; parts=[]; raceNew=false; var I=Sonar.info();
  Logs.gameStart({core:Race.TAG,game:'race',steer:g.steer,opt:g.opt,seed:g.seed,y0:y0,FW:+g.FW.toFixed(3),cal:DSP2.info().cal,autocenter:false,tune:'frozen',asym:Tune.ASYM,field_mm:+T.field.toFixed(1),
    chan:I.chan,hand:handSide(),probe_gain:I.probe_gain,probe_snr:I.probe_snr,f_lo:I.f_lo,W:LW,H:LH,sfx:Sfx.state(),started:new Date().toISOString(),app:'sonaroids'});
  Sfx.play('start'); go('play'); }
var R_BURST={tbubble:['#ffffff','#ffd23f','#ff8ac4'],tmagnet:['#ffffff','#ffd23f','#e8284a'],coin:['#ffffff','#ffd23f','#ff4f7a'],fuel:['#ffffff','#3fd07a','#8fdcff'],magnet:['#ffffff','#e8284a','#ffd23f'],bubble:['#ffffff','#ff8ac4','#e0409a']};
function raceReact(){ var cX=fx(Race.CAR_X), cY=g.car.y*K;
  g.events.forEach(function(k){ if(k!=='over') Sfx.play(k);
    if(k==='crash'){ flash=0.25; shake=0.35; burst(cX+6,cY,24,['#ffffff','#ff4f8b','#ffd23f','#6fd7ff'],70*K); }
    else if(k==='rub'){ shake=Math.max(shake,0.1); burst(cX,cY,6,['#ffffff','#ffd23f'],40*K); }
    else if(k==='pop') burst(cX,cY,20,R_BURST.bubble,60*K);
    else if(k==='boing') burst(cX,cY,8,R_BURST.bubble,40*K);   // v0.93: the bubble took the knock and stays
    else if(k==='line') burst(cX+8,cY,14,R_BURST.coin,55*K); });
  (g.fx||[]).forEach(function(f){ burst(SAFE.l+f.x*K,f.y*K,f.pick==='coin'?6:14,R_BURST[f.pick]||R_BURST.coin,(f.pick==='coin'?35:50)*K); }); }
/* the top: the score, the fuel under it (a soda bottle, the bar), the metres; the gifts at work beside the bar with the time they have left */
/* v0.97: the fuel bar (the maintainer: «сделай полоску топлива и очки в игре — больше и ниже»; from the sketches: «очки — как сейчас, полоска как на А, кол-во метров убери», an F instead of the bottle) */
function raceFuelBar(bx,by,bw,bh,f){ var low=f<0.15, col=f<0.15?'#ff3b5c':f<0.35?'#ffb52e':'#3fd07a';
  lx.fillStyle='rgba(40,12,30,0.6)'; lx.beginPath(); lx.roundRect(bx-1,by-1,bw+2,bh+2,(bh+2)/2); lx.fill();
  if(!low||Math.floor(clock*5)%2){ lx.fillStyle=col; lx.beginPath(); lx.roundRect(bx,by,Math.max(bh/2,bw*f),bh,bh/2); lx.fill(); } }
function raceTimers(gx,cy,r){ [['turbo','#ffd23f',g.car.turbo,Race.TUNE.TURBO],['bubble','#ff8ac4',g.car.bubble,Race.TUNE.BUBBLE],['magnet','#e8284a',g.car.magnet,Race.TUNE.MAGNET]].forEach(function(q){ if(q[2]<=0) return;
    lx.fillStyle='rgba(40,12,30,0.55)'; lx.beginPath(); lx.arc(gx+r,cy,r+1,0,6.2832); lx.fill(); lx.fillStyle=q[1]; lx.beginPath(); lx.moveTo(gx+r,cy); lx.arc(gx+r,cy,r,-Math.PI/2,-Math.PI/2+6.2832*Math.min(1,q[2]/q[3])); lx.closePath(); lx.fill(); gx+=2*r+5; }); }
function raceHud(){ var cx0=Math.round(LW/2), y=topY(), f=g.fuel/Race.TUNE.FUEL, bw=96, sc=String(g.score).padStart(6,'0'), sw=PF.width(sc), fw=PF.width('F')*1.3, tw=fw+4+bw+10+sw, x0=Math.round(cx0-tw/2), bx=x0+fw+4, by=y+1;
  /* v0.99: one line — the F, the fuel bar, then the score (the maintainer: «кол-во очков и полоску топлива сделаем в одну строку, размеры как сейчас, сначала полоска, потом очки») */
  text('F',x0,y-1,'#3fd07a','left',1.3); raceFuelBar(bx,by,bw,6,f); text(sc,bx+bw+10,y,P.text,'left'); raceTimers(bx,by+15,5);   // the gift timers under the bar (beside the score they ran into the site's name)
  if(g.state==='coast'&&Math.floor(clock*3)%2===0) text(L('r_out'),cx0,Math.round(LH*0.3),P.hit,'center'); }
function racePlay(){
  acc+=DT; var n=0;
  while(acc>=Race.DT&&n<5){ acc-=Race.DT; n++; var h=Board.q(handFrac()); Race.step(g,h); Board.step(h); Logs.step({n:g.n,FH:g.FH,ship:{y:g.car.y},lives:Math.round(g.fuel),score:g.score,events:g.events},h); raceReact(); if(g.state==='over') break; }
  if(n===5) acc=0;
  shake=Math.max(0,shake-DT); flash=Math.max(0,flash-DT);
  duckT-=DT; if(duckT<=0&&Sonar.peak()>DUCK_PEAK){ duckT=0.4; if(Sfx.duck()) Logs.gameEv('sounds down',+Sfx.level().toFixed(2)); }
  raceScene(g,g.d,g.car.y,DT); raceParts(DT);
  raceHud();
  if(freeSide()==='left') text(SITE,LW-SAFE.r-14,topY(),P.soft,'right'); else text(SITE,SAFE.l+14,topY(),P.soft,'left');
  coveredLine(topY()+32);
  iconButton('pause',freeSide()==='left'?Math.round(SAFE.l*0.5)+10:LW-Math.round(SAFE.r*0.5)-10-(BH-3),SAFE.t+7); say(L('menu_a'));
  if(flash>0){ lx.globalAlpha=Math.min(0.3,flash); R('#ffffff',0,0,LW,LH); lx.globalAlpha=1; }
  if(g.state==='over') endGame(); }
function raceEnd(){ g.state='over'; overT=0; nickAsked=false; Logs.gameStop(); Board.finish(g.score); Board.flush(); if(g.score>raceBest){ raceBest=g.score; raceNew=true; store.set('sonaroids_race_best',raceBest); } go('over'); }
function raceOver(){ overT+=DT; field(DT,0); lx.globalAlpha=0.35; R(P.bg,0,0,LW,LH); lx.globalAlpha=1;
  var cx0=freeSide()==='left'?Math.round(LW*0.6):Math.round(LW*0.4), y=Math.round(LH*0.22);
  text(L('r_finish'),cx0,y,P.text,'center'); text(String(g.score),cx0,y+13,P.band,'center',2);
  var ls=[[L('r_dist')+' '+Math.floor(g.d/10)+' '+L('r_m'),P.text],[L('r_coins')+' '+g.coins,P.text],[L('r_passed')+' '+g.passed,P.text],[raceNew?L('best')+'!':L('best')+' '+raceBest,raceNew?P.band:P.soft]];
  ls.forEach(function(q,i){ text(q[0],cx0,y+38+i*11,q[1],'center'); });
  var vs='V'+VERSION, vr=freeSide()==='left', vx=vr?LW-SAFE.r-8:SAFE.l+8, vy=LH-SAFE.b-12, vw=PF.width(vs);
  text(vs,vx,vy,diag?P.band:P.soft,vr?'right':'left'); var bx0=Math.max(0,(vr?vx-vw:vx)-8), bx1=Math.min(LW,(vr?vx:vx+vw)+8), by0=vy-8; BTN.push({id:'ver',x:bx0,y:by0,w:bx1-bx0,h:Math.min(PF.CAP+16,LH-by0)});
  var bl=boardLine(); if(bl){ text(bl[0],cx0,y+38+ls.length*11+4,bl[1],'center'); if(bl[2]) text(bl[2],cx0,y+38+ls.length*11+15,P.soft,'center'); }   // v1.01: the place in SonaRace's tables
  say(L('r_finish')+' '+g.score+(bl?'. '+bl[0]:''));
  var lb=Board.last(); if(lb&&lb.state==='done'&&lb.listed&&!lb.named&&!nickAsked&&overT>1.5){ nickAsked=true; nickFrom='over'; go('nick'); return; }
  if(overT>0.8) column([['again',L('again'),'primary'],['menu',L('menu')],['scores',L('scores')]].concat(diag&&Logs.has()?[['logs',L('logs')]]:[]),Math.round(LH*0.52)); }

/* ── actions ── */
function startPrepare(){
  prep={res:null,doneT:0}; acoustic=false;
  // v0.45, the app: the media volume starts at 25% (the maintainer: 20–30% plays fine, higher «swings») and Sonar.prepare moves it until the probe is
  // as loud as on the phones that steer well; in a browser too loud a phone gets «turn it down» (why 'loud'), as too quiet gets «turn it up»
  // v0.68: «ГРОМКОСТЬ: НЕ ТРОГАТЬ» on the «ЗВУК» screen — the player's own media volume, no fitting and no «too loud» (the Redmi Note 10S
  // was turned down to 13% by the fit, and its palm echo with it; at 50% it once got ready "perfectly")
  var vol=null; if(APP){ try{ if(store.get('sonaroids_vol','auto')==='keep') vol={get:function(){ return APP.getVolume(); },set:function(){},keep:true};
    else { var v0=APP.getVolume(); if(v0<0.2||v0>0.3) APP.setVolume(0.25); vol={get:function(){ return APP.getVolume(); },set:function(v){ APP.setVolume(v); }}; } }catch(e){ vol=null; } }
  var logged=false; function slog(){ var I=Sonar.info(); logged=true;
      Logs.setupStart({kind:'подготовка',cal:I.cal,autocenter:true,tune:'waves',asym:Tune.ASYM,field_auto:true,field_mm:+store.get('sonaroids_field','100')||100,
        chan:I.chan,hand:handSide(),probe_gain:I.probe_gain,probe_snr:I.probe_snr,f_lo:I.f_lo,prom:null,sfx:Sfx.state(),vol_fit:I.vol_fit,auto_audio:I.auto_audio,route:I.route,settle:I.settle,started:new Date().toISOString(),app:APP?'sonaroids-android':'sonaroids',native:APP?(function(){ try{ return JSON.parse(APP.info()); }catch(e){ return null; } })():undefined}); }
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
function toRoom(b){ Sonar.setBand(b); prep=null; silentRetry=false; go('away'); }
function toWave(){ T=Tune.create(+store.get('sonaroids_field','100')||100,true); caught=false; flips=0; flipT=-9; seenT=0; go('wave'); }
function pauseGame(){ if(scr==='play'||scr==='count'||scr==='count-resume'){ pausedFrom=scr==='count-resume'?'play':scr; go('paused'); } }
function startCount(){ if(resumeAfterPrep&&g&&g.state!=='over'){ resumeAfterPrep=false; countT=3; go('count-resume'); return; }
  resumeAfterPrep=false; countT=3; if(scr!=='wave') shipY=null; lastHand=handFrac()===null?lastHand:handFrac(); /* from the try-out the ship goes on where it is */ Logs.ev('отсчёт',{field:+T.field.toFixed(1),auto:T.auto}); store.set('sonaroids_field',Math.round(T.field));
  if(mode==='race'){ g=Race.create(newSeed(),raceFW(),shipY===null?null:shipY/K,raceSteer,raceRules()); rTry=null; } go('count'); }
function startGame(){ if(mode==='race'){ raceStart(); return; }
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
  next:function(){ if(scr==='sound'){ if(direct&&dirSilent){ dirSilent=false; Sonar.restart(); booted=false; boot(toAway); return; }   // the sound anew, from this tap
    if(direct) (booted?toAway():go('mic')); else go('phone'); } else if(scr==='phone'){ if(booted) toAway(); else go('mic'); } },
  allow:function(){ boot(toAway); },
  appupd:function(){ try{ APP.checkUpdate(); }catch(e){} setTimeout(function(){ location.reload(); },600); },
  probe_wide:function(){ toRoom('wide'); }, probe_norm:function(){ toRoom('normal'); },
  play:function(){ if(store.get('sonaroids_seen','')!=='1'){ ACT.howto(); return; } onboarding=false; direct=false; ensure(toAway); },
  howto:function(){ onboarding=true; direct=false; go('sound'); },
  /* a deep recalibration: forget the saved palm range, close the microphone and start from "put the phone down" */
  recal:function(){ onboarding=false; direct=false; store.set('sonaroids_field','100'); Sonar.restart(); booted=false; acoustic=false; go('phone'); },
  lefty:function(){ lefty=true; store.set('sonaroids_lefty','1'); turnShown=false; Logs.ev('играю левой'); seenT=scrT; },
  hub:function(){ mode='fly'; go('hub'); },
  rset:function(){ go('rset'); },
  hub_rocks:function(){ mode='fly'; go('title'); }, rskin:function(){ raceSkin=RACE_SKINS[(RACE_SKINS.indexOf(raceSkin)+1)%RACE_SKINS.length]; RSKIN=raceSkin; store.set('sonaroids_race_skin',raceSkin); }, hub_play:function(){ mode='fly'; go('title'); }, hub_race:function(){ mode='race'; go('rtitle'); },
  gfx:function(){ setGfx(gfxMode==='hd'?'pixel':'hd'); pool={K:0,list:[[],[],[]]}; },
  skin_prev:function(){ var i=SKIN_IDS.indexOf(skinId); setSkin(SKIN_IDS[(i+SKIN_IDS.length-1)%SKIN_IDS.length]); },
  skin_next:function(){ var i=SKIN_IDS.indexOf(skinId); setSkin(SKIN_IDS[(i+1)%SKIN_IDS.length]); },
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
RSET.forEach(function(q){ ACT[q[0]]=function(){ q[2](); raceOptSave(); }; });
R_PRESETS.forEach(function(q){ ACT[q[0]]=function(){ raceOpt=Race.optOf(JSON.parse(JSON.stringify(q[2]))); raceOptSave(); }; });   // v0.92: the test switches
/* buttons act when the finger lifts (on the same button it went down on): iPhone lets a page share files or open the microphone
   only from a finished tap — acting on touch-down made "logs" work only on the second tap (v0.12) */
var downOn=null;
/* v0.89 (the maintainer: «все кнопки в игре визуально не реагируют на нажатия — непонятно, прошёл тап или нет»): every button, card,
   row, chip and link lights up under the finger while it is down and for a moment after it lifts */
var press={id:null,x:0,y:0,until:0}, PRESS_LOOK='A';
function btnRect(id,x,y){ for(var i=BTN.length-1;i>=0;i--){ var b=BTN[i]; if(b.id===id&&x>=b.x-4&&x<b.x+b.w+4&&y>=b.y-4&&y<b.y+b.h+4) return b; } return null; }
function pressGlow(){ if(!press.id) return; if(!downOn&&clock>press.until){ press.id=null; return; } var b=btnRect(press.id,press.x,press.y); if(!b) return;
  var x=Math.max(0,b.x), y=Math.max(0,b.y), w=Math.min(LW,b.x+b.w)-x, h=Math.min(LH,b.y+b.h)-y;
  lx.save(); lx.beginPath(); if(lx.roundRect) lx.roundRect(x,y,w,h,3); else lx.rect(x,y,w,h);
  if(PRESS_LOOK==='A'){ lx.fillStyle='rgba(255,255,255,0.3)'; lx.fill(); lx.strokeStyle=P.btnHi||'#fff'; lx.lineWidth=1.2; lx.stroke(); }
  else { lx.fillStyle='rgba(0,0,0,0.38)'; lx.fill(); lx.strokeStyle=P.band; lx.lineWidth=1.2; lx.stroke(); }
  lx.restore(); }
function btnAt(e){ var x=e.clientX*DPR/S, y=e.clientY*DPR/S;
  for(var i=BTN.length-1;i>=0;i--){ var b=BTN[i]; if(x>=b.x-4&&x<b.x+b.w+4&&y>=b.y-4&&y<b.y+b.h+4) return b.id; } return null; }
/* v0.56 (the maintainer): the service links show after a long press on the version (0.7 s), not a tap — a player won't open them by chance */
var verHold=null, verDown=false;   // verDown: the finger is still on the version (a pointercancel from iOS does not end the hold, only lifting the finger does)
cv.addEventListener('pointerdown',function(e){ downOn=btnAt(e); if(downOn){ press.id=downOn; press.x=e.clientX*DPR/S; press.y=e.clientY*DPR/S; press.until=clock+0.15; } if(verHold){ clearTimeout(verHold); verHold=null; }
  if(downOn==='ver'){ verDown=true; verHold=setTimeout(function(){ verHold=null; if(verDown){ verDown=false; ACT.ver(); Sfx.play('tap'); downOn=null; } },700); }
  e.preventDefault(); },{passive:false});
/* v0.87 (the maintainer): a short tap on the version on the games' screen reloads the page (a new version at once);
   the long press still shows the service links */
cv.addEventListener('pointerup',function(e){ verDown=false; press.until=clock+0.15; var quick=!!verHold; if(verHold){ clearTimeout(verHold); verHold=null; } var id=btnAt(e);
  if(id==='ver'){ if(quick&&downOn==='ver'&&scr==='hub'){ Logs.ev('обновление страницы по версии'); location.reload(); } downOn=null; e.preventDefault(); return; } if(id&&id===downOn&&!ACT[id]&&id.indexOf('aud:')===0){ Sfx.play('tap'); audAct(id); } else if(id&&id===downOn&&ACT[id]){ if(id!=='allow'&&id!=='play'&&id!=='retry'&&id!=='sfx'&&id!=='vol_dn'&&id!=='vol_up') Sfx.play('tap'); ACT[id](); } downOn=null; e.preventDefault(); },{passive:false});
cv.addEventListener('pointercancel',function(){ downOn=null; press.id=null; });
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
var DT=1/60, lastNow=performance.now(), floorHeld=false;
/* at most 60 frames a second in flight and 30 on the other screens: phones with 120 Hz screens would otherwise draw twice as often
   for nothing and warm up (v0.12) */
function loop(now){
  requestAnimationFrame(loop);
  var fast=scr==='play'||scr==='count'||scr==='count-resume'; if(now-lastNow<(fast?15:31)) return;
  DT=Math.min(0.05,Math.max(0,(now-lastNow)/1000)); lastNow=now; clock+=DT; scrT+=DT; BTN=[];
  if(LH>LW){ pauseGame(); sRotate(); present(0); return; }
  if(booted&&Sonar.lost()&&(scr==='wave'||scr==='count'||scr==='play'||scr==='over')){ if(g&&g.state==='play') Logs.gameStop(); Board.setup('lost'); go('lost'); }
  var RS=mode==='race'&&(scr==='rtitle'||scr==='rset'||scr==='scores'||scr==='count'||scr==='count-resume'||scr==='play'||scr==='over'||scr==='paused'||scr==='restart'||(scr==='wave'&&caught&&scrT-caughtT>=CAUGHT_SHOW));
  hdFrame(RS||(scr==='hub'?hubBg==='race'||hdWanted(SKIN_IDS[hubSkin]):!!SK.hd),false);   // v0.84: SonaRace's screens smooth; v0.99: or in candy pixels, as the graphics switch says
  // v0.91: while a game runs (and in its pause) the sonar keeps the empty room's level as the getting ready left it (see src/11_dsp.js)
  var gameOn=!!(g&&g.state!=='over'&&(scr==='play'||scr==='count-resume'||scr==='paused'||scr==='restart')); if(gameOn!==floorHeld){ floorHeld=gameOn; try{ DSP2.set('holdfloor',gameOn); }catch(e){} }   // v0.74: a shapes-only skin with «pixels» — the same canvas at 1 px per game pixel   // v0.72: the HD world canvas under the pixel one
  uiColours(scr!=='hub');
  switch(scr){
    case 'lang': sLang(); break; case 'title': sTitle(); break; case 'rtitle': sRTitle(); break; case 'rset': sRSet(); break; case 'hub': sHub(); break;
    case 'sound': sSound(); break;
    case 'phone': sPhone(); break; case 'mic': sMic(); break; case 'probe': sProbe(); break; case 'away': sAway(); break; case 'wave': sWave(); break;
    case 'count': sCount(); break; case 'count-resume': sCountResume(); break; case 'play': sPlay(); break; case 'over': sOver(); break;
    case 'audio': sAudio(); break; case 'paused': sPaused(); break; case 'restart': sRestart(); break; case 'scores': sScores(); break; case 'nick': sNick(); break; case 'lost': sLost(); break; case 'nomic': sNomic(); break; case 'link': sLink(); break; case 'linkshow': sLinkShow(); break; case 'linkin': sLinkIn(); break; case 'linkdone': sLinkDone(); break;
  }
  chrome(); pressGlow();
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
  var x0=Math.round(LW*0.1), y=Math.round(LH*0.2), mode=store.get('sonaroids_audio','app'), lw=Math.max(PF.width(L('aud_autotest')),PF.width(L('aud_mode')),PF.width(L('aud_mic')),PF.width(L('aud_out')),PF.width(L('aud_src')),PF.width(L('aud_usage')),PF.width(L('aud_end')))+10, x;
  text(L('aud_mode'),x0,y+5,P.soft,'left'); x=x0+lw;
  x=chip('aud:mode:browser',L('aud_browser'),x,y,mode!=='app'); chip('aud:mode:app',L('aud_app'),x,y,mode==='app'); y+=PF.CAP+11;
  var ap=null; try{ ap=JSON.parse(store.get('sonaroids_autoaudio','')||'null'); }catch(e){}
  // v0.55: «test again» only when there is a pick; it forgets it — the test runs with the next getting ready (the text says so)
  var apt=ap?L('aud_mic')+' '+ap.mic+' '+String(ap.src).toUpperCase():L(store.get('sonaroids_audio','app')==='app'?'aud_nextgame':'aud_notyet');
  text(L('aud_autotest'),x0,y+5,P.soft,'left'); x=x0+lw; text(apt,x,y+5,P.text,'left');
  if(ap) chip('aud:retest:1',L('aud_retest'),x+PF.width(apt)+12,y,false); y+=PF.CAP+11;
  var src=store.get('sonaroids_src','auto'); text(L('aud_src'),x0,y+5,P.soft,'left'); x=x0+lw;
  ['auto','unprocessed','voice','mic','camcorder'].forEach(function(k){ x=chip('aud:src:'+k,k==='auto'?L('aud_auto'):k.toUpperCase(),x,y,src===k); }); y+=PF.CAP+11;
  var mic=audGet('sonaroids_mic'), ins=(audDev.inputs||[]).filter(function(d){ return d.type==='builtin_mic'; });
  text(L('aud_mic'),x0,y+5,P.soft,'left'); x=x0+lw; x=chip('aud:mic:',L('aud_auto'),x,y,mic==='');
  ins.forEach(function(d){ var mm=(audDev.mics||[]).filter(function(m){ return m.address&&m.address===d.address; })[0], lb=d.id+(mm?' '+audLabel(mm):(d.address?' '+String(d.address).toUpperCase().slice(0,10):''));
    if(x+PF.width(lb)+12>LW-SAFE.r-8){ x=x0+lw; y+=PF.CAP+12; } x=chip('aud:mic:'+d.id,lb,x,y,mic===String(d.id)); }); y+=PF.CAP+11;
  var out=audGet('sonaroids_out'), outs=(audDev.outputs||[]).filter(function(d){ return d.type==='speaker'||d.type==='earpiece'; });
  text(L('aud_out'),x0,y+5,P.soft,'left'); x=x0+lw; x=chip('aud:out:',L('aud_auto'),x,y,out==='');
  outs.forEach(function(d){ x=chip('aud:out:'+d.id,d.id+' '+(d.type==='speaker'?L('aud_speaker'):L('aud_earpiece')),x,y,out===String(d.id)); }); y+=PF.CAP+11;
  var us=store.get('sonaroids_usage','media'); text(L('aud_usage'),x0,y+5,P.soft,'left'); x=x0+lw;
  x=chip('aud:usage:media',L('aud_media'),x,y,us==='media'); x=chip('aud:usage:game',L('aud_game'),x,y,us==='game');
  var kv=store.get('sonaroids_vol','auto'); x+=10; text(L('aud_vol'),x,y+5,P.soft,'left'); x+=PF.width(L('aud_vol'))+8;
  x=chip('aud:vol:auto',L('aud_auto'),x,y,kv!=='keep'); chip('aud:vol:keep',L('aud_keep'),x,y,kv==='keep'); y+=PF.CAP+11;
  // v0.67: which end of the phone plays the probe (auto: the one the microphone hears louder); the hand's picture follows it
  var pe=store.get('sonaroids_probe_end','auto'); text(L('aud_end'),x0,y+5,P.soft,'left'); x=x0+lw;
  x=chip('aud:end:auto',L('aud_auto'),x,y,pe==='auto'); x=chip('aud:end:camera',L('aud_cam'),x,y,pe==='camera'); chip('aud:end:port',L('aud_port'),x,y,pe==='port'); y+=PF.CAP+11;
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
  else if(k==='src') store.set('sonaroids_src',v); else if(k==='end') store.set('sonaroids_probe_end',v); else if(k==='vol') store.set('sonaroids_vol',v); else if(k==='usage') store.set('sonaroids_usage',v);
  else if(k==='retest') Sonar.audioRetest();
  else if(k==='lab'){ location.href='../lab/sonar_lab3.html'; return; }
  Sonar.restart(); booted=false; acoustic=false; audDev=null; }
var NO_MENU={hub:1,title:1,rtitle:1,lang:1,paused:1,restart:1,play:1}, NO_VER={rset:1,hub:1,over:1,play:1,count:1,'count-resume':1,paused:1,restart:1};
function chrome(){ if(LH>LW) return;
  var s=BH-3, vr=freeSide()!=='left', x=vr?LW-Math.round(SAFE.r*0.5)-10-s:Math.round(SAFE.l*0.5)+10, y=SAFE.t+7;
  if(!NO_MENU[scr]) iconButton(scr==='count'||scr==='count-resume'?'pause':scr==='scores'?'sc_back':'menu',x,y);
  // the wave screen: the try-out ship flies up the free side's edge — the version goes to the other top corner (by the "wave here" beacon)
  // the try-out ship flies up the left edge: there the version goes to the top right corner; on the scores screen the buttons' column
  // starts right under the menu button — the version stands beside it
  if(NO_VER[scr]) return;
  if((scr==='wave'&&!vr)||scr==='title'||scr==='rtitle') diagCorner('V'+VERSION,true,SAFE.t+8,scr==='title'||scr==='rtitle'?vr===(freeSide()!=='left'):true);   // the game's screen: the corner away from its buttons
  else if(scr==='scores') diagCorner('V'+VERSION,true,y+Math.round((s-PF.CAP)/2),false,vr?x-16:x+s+16);
  else diagCorner('V'+VERSION,true,y+s+14); }
SK=skinView(skinId); resize(); Board.flush();
if('serviceWorker' in navigator&&location.protocol==='https:') navigator.serviceWorker.register('sw.js').then(function(r){ r.update(); }).catch(function(){});   // works offline; checks for a new version on every launch
go('hub');   // v0.70: the games' screen first (always the menu first since 0.44; a new player's first "Play" walks through the instruction)
requestAnimationFrame(loop);
/* test hooks: headless tests drive the screens through these (harmless in the game) */
window.__sonaroids={raceNote:function(o){ for(var k in o) RN_LOOK[k]=o[k]; RCS={}; RCN=[]; RC={seed:-1,ch:{},zones:null,sp:{},key:''}; },raceSuper:function(v){ R_SUPER=v; },racePal:function(pud,bub){ if(pud) for(var k in pud) R_PUD[k]=pud[k]; if(bub) for(var j in bub) R_BUB[j]=bub[j]; RC.sp={}; },skinProbe:skinProbe,hdProbe:hdProbe,sizeProbe:sizeProbe,hdIds:hdIds,pixIds:function(){ return SKIN_IDS.filter(function(i){ return !!SKINS[i]; }); },skinIds:function(){ return SKIN_IDS.slice(); },go:go,act:ACT,scr:function(){ return scr; },btn:function(){ return BTN.slice(); },S:function(){ return {S:S,LW:LW,LH:LH,DPR:DPR,shipLane:Math.round(fx(Core.SHIP_X))+16}; },
  setBooted:function(v){ booted=v; },
  board:function(){ return {tbl:tblBox,nick:nickEl?{shown:nickEl.style.display!=='none',rect:nickEl.getBoundingClientRect().toJSON()}:null}; },
  side:function(){ return {hand:handSide(),rel:handRel,cam:camEnd(),stored:store.get('sonaroids_rel',''),say:sayLast}; }, wave:function(){ toWave(); },
  fake:function(){ booted=true; prep={res:{ok:true},doneT:-9}; T=Tune.create(100,true); T.ok=true; caught=true;          // a stand-in state for layout checks
    g=Core.create(1,Core.FH*(LW-SAFE.l)/LH); for(var i=0;i<300;i++) Core.step(g,0.5); g.state='over'; },state:function(){ return {scr:scr,g:g,T:T,caught:caught,prep:prep,lang:lang,linkCode:linkCode,gfx:gfxMode,mode:mode}; },
  race:function(){ mode='race'; booted=true; prep={res:{ok:true},doneT:-9}; T=Tune.create(100,true); T.ok=true; caught=true;   // a stand-in race for layout checks
    g=Race.create(1,raceFW(),90); for(var i=0;i<60*20;i++) raceDemoStep(g); g.fuel=40; },
  phoneK:function(k){ PHONE_SHIPK=k; }, press:function(id,look){ var b=BTN.filter(function(q){ return q.id===id; })[0]; if(look) PRESS_LOOK=look; if(b){ press.id=id; press.x=b.x+b.w/2; press.y=b.y+b.h/2; press.until=clock+99; } return !!b; }, prepBg:function(v){ PREP_BG=v; },
  raceChunkMs:function(n){ var rg=Race.create(5,raceFW(),90), t0=performance.now(); rReset(5); RC.ch={}; for(var i=0;i<n;i++) rChunk(rg,i); var ms=(performance.now()-t0)/n; RC.ch={}; return ms; } };
})();
