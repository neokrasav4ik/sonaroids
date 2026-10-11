/* ════ SONAPONG on the games' screen (v1.59, step 4 of claude/SONAPONG_PORT.md): the card, the menu, the getting ready with the two
   holds, the countdown, the game, the pause's «re-hold», the game over. The rules are src/15_pong.js, the palm → the rackets
   src/16_pong_ctl.js; the getting ready before the holds (the probe, the empty room) is SonaFly's. The look is a plain stand-in until
   the skins (step 5: «paper» and «neon/vector»); the sounds — the game's existing ones until step 6. No tables yet: the best game is
   kept on the phone ('sonaroids_pong_best').
   The field (1.59a): one shape for every phone — PG_AR = 2.16 screen heights across, the lab's own (Den's iPhone, 852×393, the whole
   screen); fitted into the whole screen (the field may go under the notch, as in the lab), only the HUD and the buttons keep to the safe
   area. 1.59 took the safe area's width instead — on the iPhone ar 1.87, the rackets 14% closer together with the same bounce angles, and
   a high arc flew past the other racket's middle (Den: «высокая дуга всегда уходит в даль»). One shape also keeps the records fair. ════ */
var PG={c:null,best:null,bestW:null,sens:null,demo:null,dbot:null,view:null,fs:48000,resume:false,done:false,doneT:0,seenT:0,flips:0,last:null,pts:[],newBest:false};
function pgBest(){ if(PG.best===null) PG.best=+store.get('sonaroids_pong_best','0')||0; return PG.best; }
function pgSens(){ if(PG.sens===null){ var v=parseInt(store.get('sonaroids_pong_sens','1'),10); PG.sens=v>=0&&v<=3?v:1; } return PG.sens; }
var PG_AR=2.16;
function pgAr(){ return PG_AR; }
function pgU(){ return Math.min(LH,LW/PG_AR); }                       // game pixels per the rules' unit
function pgX(x){ var u=pgU(); return (LW-PG_AR*u)/2+x*u; }
function pgY(y){ var u=pgU(); return (LH-u)/2+y*u; }
/* the palm's frames → the control (the mix, the holds' readings) — only in SonaPong */
Sonar.listen(function(f,r){ if(mode!=='pong'||!PG.c||!r) return; PongCtl.frame(PG.c,r,512,PG.fs,(DSP2.info().cal||{}).s,scr==='count'&&PG.c.mxCal===null,performance.now()); });
/* a view of the rules' field for drawing outside a game (the menu, the holds, the countdown): the rackets at a place, no ball */
function pgView(py){ var v=PG.view; if(!v||v.ar!==pgAr()||v.H!==Pong.TUNE.SENS[pgSens()]){ v=PG.view=Pong.create(1,pgAr(),pgSens()); }
  v.py=py; v.k=1; v.hw=Pong.hwOf(v); return v; }
function pgPalmPad(v){ var c=PG.c, f=c?PongCtl.frac(c,PongCtl.palmAt(c,lastNow)):null; return f===null?v.py:Pong.padOf(v,f); }
/* ── drawing (a stand-in look) ── */
var PG_COL={bg:'#0d1024',ceil:'#3a4370',rack:'#7ee0ff',rack2:'#3b8fb0',ball:'#ffd166',gap:'#1a2040'};
function pgField(q,dt){ if(pgSkOn()){ if(q===PG.view) q.t=clock; pgSkDraw(q,dt||0,q===g&&(scr==='play'||scr==='paused'||scr==='count-resume')); return; }   // v1.61h: «набросок» (src/48_pongsk.js)
  R(PG_COL.bg,0,0,LW,LH);
  R(PG_COL.ceil,Math.max(SAFE.l,pgX(0)),pgY(Pong.TUNE.TOP)-1,Math.min(LW-SAFE.r,pgX(PG_AR))-Math.max(SAFE.l,pgX(0)),2);                                  // the ceiling
  if(q.webD>0.002){ var wx0=Math.max(0,pgX(0)), wx1=Math.min(LW,pgX(PG_AR)), wy=pgY(Pong.TUNE.TOP+q.webD), wt=pgY(Pong.TUNE.TOP);   // v1.61e: the web (a stand-in until the skins)
    lx.fillStyle='rgba(200,210,235,.08)'; lx.fillRect(wx0,wt,wx1-wx0,wy-wt); lx.strokeStyle='rgba(220,228,245,.5)'; lx.lineWidth=1.2; lx.beginPath();
    for(var j=0;j<=24;j++){ var x=wx0+(wx1-wx0)*j/24, y=wy-Math.abs(Math.sin(j/24*12*Math.PI))*0.006*pgU(); if(j) lx.lineTo(x,y); else lx.moveTo(x,y); } lx.stroke(); }
  pgCracks(q,dt||0);
  for(var i=0;i<2;i++) pgRacket(q,i);
  var b=q.ball; if(b&&!(b.wait>0&&Math.floor(clock*6)%2)){ lx.fillStyle=PG_COL.ball; lx.beginPath(); lx.arc(pgX(b.x),pgY(b.y),Math.max(2,b.r*pgU()),0,6.2832); lx.fill(); }
  drawParts(dt||0); }
/* v1.61d: the ceiling's cracks (the rules' g.crk) as jagged lines down from it, the next one to break trembling; mended ones fade (a stand-in
   until the skins and the spider, stage 3 of claude/SONAPONG_PORT.md) */
function pgCrack(x,n,a,wob){ var u=pgU(), x0=pgX(x)+wob, y0=pgY(Pong.TUNE.TOP), L=(0.025+0.012*n)*u, s=((x*997)|0)%7-3;
  lx.globalAlpha=a; lx.strokeStyle='#ff8c78'; lx.lineWidth=1.6; lx.beginPath(); lx.moveTo(x0,y0); lx.lineTo(x0+s*0.6,y0+L*0.4); lx.lineTo(x0-s*0.4,y0+L*0.7); lx.lineTo(x0+s*0.3,y0+L);
  lx.moveTo(x0+s*0.6,y0+L*0.4); lx.lineTo(x0+s*1.8+4,y0+L*0.6); lx.stroke(); lx.globalAlpha=1; }
function pgCracks(q,dt){ var cr=q.crk||[], N=Pong.TUNE.CRACK; cr.forEach(function(x,j){ pgCrack(x,j+1,1,j===N-2?Math.sin(clock*30)*0.8:0); });
  PG.mend=(PG.mend||[]).filter(function(m){ m.t-=dt; if(m.t>0) m.xs.forEach(function(x,j){ pgCrack(x,j+1,m.t/0.6,0); }); return m.t>0; }); }
function pgRacket(q,i){ var n=18, xc=q.ar*(i?1-Pong.TUNE.XC:Pong.TUNE.XC), hw=q.hw, pts=[], k, x, s;
  for(k=0;k<=n;k++){ x=xc+(-1+2*k/n)*hw; s=Pong.surf(q,i,x); pts.push([pgX(x),pgY(s.y)]); }
  lx.fillStyle=PG_COL.rack2; lx.beginPath(); pts.forEach(function(p,j){ if(j) lx.lineTo(p[0],p[1]); else lx.moveTo(p[0],p[1]); });
  for(k=n;k>=0;k--) lx.lineTo(pts[k][0],pts[k][1]+4+2*Math.sin(k/n*Math.PI)); lx.closePath(); lx.fill();
  lx.strokeStyle=PG_COL.rack; lx.lineWidth=2.2; lx.lineJoin='round'; lx.lineCap='round'; lx.beginPath(); pts.forEach(function(p,j){ if(j) lx.lineTo(p[0],p[1]); else lx.moveTo(p[0],p[1]); }); lx.stroke(); }
function pgHeart(x,y,c){ R(c,x,y,2,1); R(c,x+3,y,2,1); R(c,x-1,y+1,7,2); R(c,x,y+3,5,1); R(c,x+1,y+4,3,1); R(c,x+2,y+5,1,1); }
/* the HUD (Den's lab layout): the score and the multiplier in the top corner on the hand's side, the balls and the series under them in the bottom one (1.59d); the time till the
   rackets narrow again — a bar along the bottom, burning down to its middle (1.59c; was along the right edge). 1.59d (Den 20:23): the pause
   as in the other games — in the top corner on the free side; the site's name (sonaroids.app) — in the bottom corner on the free side */
function pgHud(){ if(pgSkOn()){ var hr0=freeSide()==='left'; text(SITE,hr0?SAFE.l+14:LW-SAFE.r-14,LH-SAFE.b-12,PG_V.dark?'#d8d2c4':'#5a554c',hr0?'left':'right'); PG.pts=[]; return; }   // v1.61h: the sketch writes the score, the balls, the series and the narrowing with its pen
  var hr=freeSide()==='left', al=hr?'right':'left', sg=hr?-1:1, x=hr?LW-SAFE.r-8:SAFE.l+8, y=topY(), m=Pong.mult(g)*(1+Pong.TUNE.SERIES*Math.min(Pong.TUNE.SERIES_N,g.series));
  text(String(g.score),x,y,P.text,al,2); y+=PF.CAP*2+5;
  text('×'+m.toFixed(2),x,y,P.band,al);
  /* 1.59d (Den 20:31): the balls and the series — one row in the bottom corner on the same side: ♥♥♥♥♥  ■■■■■ (the series nearer the edge) */
  var N=Pong.TUNE.SERIES_N, by=LH-SAFE.b-12, sw=N*6-2, hw=Math.max(0,g.lives*9-2), sx=hr?x-sw:x+hw+8, hx=hr?sx-8-hw:x;
  for(var d=0;d<N;d++) R(d<Math.min(N,g.series)?P.band:P.line,sx+d*6,by+1,4,4);
  for(var i=0;i<g.lives;i++) pgHeart(hx+1+i*9,by,'#ff7a8a');
  text(SITE,hr?SAFE.l+14:LW-SAFE.r-14,LH-SAFE.b-12,P.soft,hr?'left':'right');
  // the time till the rackets narrow: a thin bar along the bottom, in the middle (1.59c, Den 19:43: «полосу убрать вниз и сделать горизонтальной»)
  var fr=Pong.nextNarrow(g)/Pong.TUNE.NARROW_T, x0=Math.round(LW*0.3), x1=Math.round(LW*0.7), by=LH-SAFE.b-6, bw=Math.round((x1-x0)*fr);
  R(P.line,x0,by,x1-x0,2); R(fr<0.2?P.hit:P.band,Math.round((x0+x1-bw)/2),by,bw,2);
  (PG.pts||[]).forEach(function(p){ p.t-=DT; if(p.t>0){ lx.globalAlpha=Math.min(1,p.t*2); text('+'+p.n,pgX(p.x),pgY(p.y)-14-(1.2-p.t)*12,P.text,'center'); lx.globalAlpha=1; } });
  PG.pts=(PG.pts||[]).filter(function(p){ return p.t>0; }); }
function pgPauseBtn(){ iconButton('pause',freeSide()==='left'?Math.round(SAFE.l*0.5)+10:LW-Math.round(SAFE.r*0.5)-10-(BH-3),SAFE.t+7); }   // as SonaFly's and SonaRace's
/* ── the menu's own rally: the rules played by a bot ── */
function pgDemoBot(){ var s=12345, rnd=function(){ s=(s*1664525+1013904223)>>>0; return s/4294967296-0.5; }, REST=0.12, T=0.16, st='rest', t0=0, amp=0, h0=REST, hand=REST, trig=0.08, base=0.24;
  return function(q){ var b=q.ball, t=q.t;
    if(q.events.indexOf('pass')>=0||q.events.indexOf('dull')>=0){ var i=b.onI, xc=q.ar*(i?1-Pong.TUNE.XC:Pong.TUNE.XC); base=Math.max(0.1,Math.min(0.5,base-0.04*(i?1:-1)*(b.x-xc)/q.hw)); }
    if(st==='swing'){ var u=(t-t0)/T; if(u>=1) st='down'; else hand=h0+amp*(1-Math.cos(Math.PI*u))/2; }
    else { hand=hand>REST?Math.max(REST,hand-1.5*Pong.DT):Math.min(REST,hand+1.5*Pong.DT); if(st==='down'&&hand<=REST+1e-9) st='rest';
      if(st==='rest'&&b&&!(b.wait>0)&&b.vy>0&&(q.py-Pong.TUNE.LIFT-b.r-b.y)/b.vy<trig){ st='swing'; t0=t; h0=hand; amp=base+rnd()*0.06; trig=0.08+rnd()*0.01; } }
    return hand; }; }
function pgDemoTick(){ var d=PG.demo; if(!d||d.state==='over'||Math.abs(d.ar-pgAr())>1e-6||d.t>600){ d=PG.demo=Pong.create(20261009,pgAr(),1); PG.dbot=pgDemoBot(); }
  if(d._c===clock) return d; d._c=clock; for(var n=Math.max(1,Math.round(DT*60));n>0;n--){ Pong.step(d,PG.dbot(d)); pgSkFx(d); } return d; }
function pgDemoDraw(){ var d=pgDemoTick(); pgField(d,0); }
/* the card on the games' screen: the menu's rally drawn full size off screen */
var pgCardC=null;
/* 1.61s (Den 21:53: «почему на главном экране скин на карточке SonaLob такого низкого качества?»): the card was the whole screen's drawing at
   the game's pixels, squeezed ~4× into the card without smoothing — the pen's thin lines broke into steps. Now the rally is drawn for the
   card at the card's own size (one and a half times its dots, smoothed down), the pen thicker, and laid smoothly */
function pgCard(w,h){ var s=Math.min(3,Math.max(1,uiS)*1.5), CW=Math.max(8,Math.round((w||LW)*s)), CH=Math.max(4,Math.round((h||LH)*s));
  if(!pgCardC||pgCardC.width!==CW||pgCardC.height!==CH){ pgCardC=document.createElement('canvas'); pgCardC.width=CW; pgCardC.height=CH; }
  var d=pgDemoTick(), fh=Math.min(CH,CW/PG_AR), fc=pgSkDraw(d,0,false,fh), c=pgCardC.getContext('2d'); c.setTransform(1,0,0,1,0,0);
  c.fillStyle=pgSkin()?'#1d1b18':'#f6f1e6'; c.fillRect(0,0,CW,CH); c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high'; c.drawImage(fc,(CW-fc.width)/2,(CH-fc.height)/2);
  pgCardC.smooth=true; return pgCardC; }
/* ── the menu: play, how to play, the sensitivity (the only setting), the sounds, all the games ── */
function pgSensLabel(){ return L('pg_sens')+': '+L('pg_sens'+pgSens()); }
function sPTitle(){ pgDemoDraw();
  var items=[['play',L('play'),'primary'],['howto',L('howto')],['pg_sens',pgSensLabel()],['pg_skin',pgSkinLabel()],['sfx','','sound'],['hub',L('all_games')]], w=colW(items);
  var bx0=sideX(w), m=Math.max(8,Math.round(LW*0.04)), band0=freeSide()==='left'?0:bx0-m, band1=freeSide()==='left'?bx0+w+m:LW;
  bandVeil(band0,band1,0.6); column(items,Math.round(LH*0.52),bx0,8);
  var a0=freeSide()==='left'?band1:SAFE.l, a1=freeSide()==='left'?LW-SAFE.r:band0, cx0=Math.round((a0+a1)/2), lsc=PF.width('SonaLob',2)<=a1-a0-12?2:1, y=Math.round(LH*0.14);
  var sl=PF.wrap(L('pg_s'),a1-a0-16,1), rw=PF.width('SonaLob',lsc); sl.forEach(function(l){ rw=Math.max(rw,PF.width(l)); }); plaque(cx0-rw/2,y-2,cx0+rw/2,y+lsc*10+6+sl.length*10-3,0.55);
  text('SonaLob',cx0,y,P.band,'center',lsc);   /* v1.61k: the name — SonaLob (Den 19:18: «у нас же теперь не сонапонг — SonaLob»; a lob — the high arc the game is about) */ y+=lsc*10+6; sl.forEach(function(l){ text(l,cx0,y,P.text,'center'); y+=10; });
  if(pgBest()>0) text(L('best')+' '+pgBest(),cx0,LH-SAFE.b-28,P.text,'center');
  say('SonaLob. '+L('play')+'. '+pgSensLabel()); }
/* ── the getting ready's last step. v1.61f: the waving, as SonaFly's and SonaRace's (was the two holds): «get ready» (WAVE_PAUSE), «wave as
   you will hit», the ring fills with the swings, the rackets already follow what is caught (src/16_pong_ctl.js PongCtl.wave — the lab's
   «помахать», «низ подальше от стола», «размах 75 мм»); caught — «РАЗМАХ ПОЙМАН» for CAUGHT_SHOW s, then the try-out: the rackets follow
   the palm; «play», «recalibrate» (the waving again) and the sensitivity — watch the rackets and turn it here (the maintainer 11 Oct
   17:28). No palm heard for NOHAND_T s — «wave from the other side», as SonaFly's ── */
function pgWaveStart(w0){ if(!PG.c) PG.c=PongCtl.create(); PongCtl.waveStart(PG.c); PG.c.lin=null; PG.done=false; PG.auto=false; PG.wk=0; PG.w0=w0===undefined?scrT:w0; PG.seenT=scrT; try{ PG.fs=Sonar.info().fs||48000; }catch(e){} }
/* v1.61g — the auto-calibration for SonaPong (the maintainer 11 Oct 17:26: «если на ручной один раз удачно откалибровался и игроку понравилось
   — он включает авто, и в следующие разы играет на этих настройках, просто перед игрой телефон слушает пустую комнату»). As SonaFly's
   (settings → АВТОКАЛИБРОВКА, 'sonaroids_live'): a waving that the player started a game with is kept — the rackets' low as the echo's range
   (mm from the probe, the lift off the table included; per probe band, with the time). With the auto-calibration on: the empty room, then
   straight to the try-out «КАЛИБРОВКА ИЗ ПРОШЛОЙ ИГРЫ» — the rackets follow the palm on the kept low (+PG_LIVE_UP mm of range, as SonaFly's
   1.15: the range of the same palm shifts by ~5 mm from one getting ready to the next; up — away from the table); «play», «recalibrate»
   (the waving), the sensitivity. Nothing kept yet — the waving, as with it off */
var PG_LIVE_UP=6;
function pgSavedLow(){ try{ var q=JSON.parse(store.get('sonaroids_pong_cal_'+Sonar.band(),'null')); return q&&q.r>=30&&q.r<=250?q:null; }catch(e){ return null; } }
function pgKeep(){ var c=PG.c, cal=DSP2.info().cal; if(!c||!c.lin||PG.auto||!PG.fresh||!cal||!(cal.k>0)) return; PG.fresh=false;
  var r=(c.lin.b-cal.o)/cal.k; if(r>=30&&r<=250){ store.set('sonaroids_pong_cal_'+Sonar.band(),JSON.stringify({r:+r.toFixed(1),t:Date.now()})); Logs.ev('низ запомнен',{range_mm:+r.toFixed(1),low:+c.lin.b.toFixed(1)}); } }
function pgToHold(){ var fw=forceWave; forceWave=false; autoTry=false; PG.resume=false; flipT=-9; try{ DSP2.set('quarter',1); }catch(e){} PG.c=PongCtl.create(); PG.flips=0; PG.auto=false; PG.fresh=false; caught=false; go('phold');
  var q=liveOn()&&!fw?pgSavedLow():null, cal=DSP2.info().cal;
  if(q&&cal&&cal.k>0){ var b=cal.k*(q.r+PG_LIVE_UP)+cal.o; PG.c.lin={b:b,t:b+PongCtl.SPAN}; PG.c.mxCal=0; PG.c.mxOff=0; PG.auto=true; PG.done=true; PG.doneT=-9; PG.w0=-9; PG.seenT=0;
    Logs.ev('живой режим: без взмахов',{range_mm:q.r,up:PG_LIVE_UP,low:+b.toFixed(1),top:+(b+PongCtl.SPAN).toFixed(1),saved:new Date(q.t).toISOString()}); return; }
  pgWaveStart(); }
function pgReady(){ return booted&&Sonar.healthy()&&acoustic&&!!PG.c&&!!PG.c.lin&&!PongCtl.waving(PG.c); }
function sPHold(){ var c=PG.c; if(!c){ pgWaveStart(); c=PG.c; }
  var v=pgView(Pong.TUNE.PAD_LO-Pong.TUNE.CB*Pong.TUNE.SENS[pgSens()]), wt=scrT-PG.w0;
  if(PongCtl.waving(c)&&wt>=WAVE_PAUSE){ var cal=DSP2.info().cal||{}, r=PongCtl.wave(c,clock,{recenter:function(){ return DSP2.recenter(); },shift:function(d){ DSP2.shift(d); },k:cal.k||1.4,centered:!!DSP2.info().centered}); if(r.retie) Logs.ev('взмахи: шкала привязалась — собираю заново'); PG.wk=r.k;
    if(r.done){ PG.done=true; PG.doneT=scrT; PG.auto=false; PG.fresh=true; Sfx.play('ok'); store.set('sonaroids_seen','1'); handSaved=handSide(); store.set('sonaroids_hand',handSaved);
      Logs.ev('размах',{swing:Math.round(r.span0),span:r.span,lift:Math.round(r.lift),low_r:r.low_r===null?null:Math.round(r.low_r),tie:+r.tie.toFixed(1),low:+c.lin.b.toFixed(1),top:+c.lin.t.toFixed(1)}); } }
  if(c.lin) v.py=pgPalmPad(v);                                                           // the rackets follow what is caught so far
  if(c.present||wt<WAVE_PAUSE) PG.seenT=scrT;
  if(PongCtl.waving(c)&&scrT-PG.seenT>NOHAND_T){ flipSide(); PG.flips++; pgWaveStart(scrT-WAVE_PAUSE); }   // no palm heard: offer the other end
  pgField(v,DT);
  if(PG.done&&PG.resume){ if(scrT-PG.doneT>0.6){ PG.resume=false; pgKeep(); countT=3; go('count-resume'); } titles(L('wave_ok')); return; }
  if(PG.done&&scrT-PG.doneT>=CAUGHT_SHOW){ titles(L(PG.auto?'auto_ok':'wave_ok'),L('pg_try_s'));
    column([['start',L('play'),'primary'],['pg_rehold',L('recal')],['pg_sens',pgSensLabel()]],Math.round(LH*0.43)); /* under the titles: over the free side's racket only at its top, the other one is always in sight */ say(L(PG.auto?'auto_ok':'wave_ok')+'. '+L('pg_try_s')); return; }
  var st=wt<WAVE_PAUSE?'wait':PG.done?'ok':'catch';
  var y=(scrT-flipT<4&&!PG.done)?titles(L('other_t'),L('other_s'),P.pick):titles(L('wave_t'),PG.done?L('wave_ok'):L('pg_wave_s'));
  coveredLine(y+2); ringUI(st==='wait'?wt/WAVE_PAUSE:st==='ok'?1:Math.min(0.95,PG.wk/5),st); handBeacon(); }
/* ── the countdown: the rackets at the palm, then the game ── */
function pgCount(){ countT-=DT; var v=pgView(PG.view?PG.view.py:Pong.TUNE.PAD_LO-0.5*Pong.TUNE.SENS[pgSens()]); v.py=pgPalmPad(v); pgField(v,DT);
  var n=Math.max(1,Math.ceil(countT)), cx0=Math.round(LW/2), cy0=Math.round(LH/2), fr=countT-Math.floor(countT), cs=3, pu=1+0.18*Math.max(0,fr-0.75)/0.25;
  ring(cx0,cy0,13*cs,1-fr,P.band); lx.save(); lx.translate(cx0,cy0); lx.scale(pu,pu); lx.translate(-cx0,-cy0); text(String(n),cx0,cy0-Math.round(3.5*cs),P.text,'center',cs); lx.restore(); say(String(n));
  if(Math.ceil(countT)<Math.ceil(countT+DT)&&countT>0) Sfx.play('tick');
  if(countT<=0) startGame(); }
function pgCountStart(){ pgKeep(); countT=3; try{ DSP2.set('quarter',1); }catch(e){} go('count'); }
function pgStart(){ PG.fps=null; PG.resume=false; PG.resumed=false; var seed=newSeed(); var lin=PG.c&&PG.c.lin; g=Pong.create(seed,pgAr(),pgSens(),lin?Math.max(30,lin.t-lin.b):null); var f=PG.c?PongCtl.frac(PG.c,PongCtl.palm(PG.c)):null; if(f!==null) g.py=Pong.padOf(g,f);
  acc=0; parts=[]; PG.pts=[]; PG.newBest=false; nickAsked=false; var I=Sonar.info(), c=PG.c||{};
  Logs.gameStart({core:Pong.TAG,game:'pong',auto_cal:!!PG.auto,seed:seed,ar:+g.ar.toFixed(4),sens:pgSens(),span:g.span,cal:DSP2.info().cal,lin:c.lin?{b:+c.lin.b.toFixed(1),t:+c.lin.t.toFixed(1)}:null,mix_off:c.mxCal===null||c.mxCal===undefined?null:+c.mxCal.toFixed(1),
    chan:I.chan,hand:handSide(),probe_gain:I.probe_gain,probe_snr:I.probe_snr,f_lo:I.f_lo,W:LW,H:LH,sfx:Sfx.state(),started:new Date().toISOString(),app:'sonaroids'});
  Sfx.play('start'); go('play'); }
/* ── the game ── */
var PG_SND={go:'tap',land:'tap',ceil:'rub',pass:'coin',dull:'syrup',lost:'crash',narrow:'level'};
function pgReact(){ pgSkFx(g); if(pgSkOn()){ g.events.forEach(function(k){ if(PG_SND[k]) Sfx.play(PG_SND[k]); }); (g.fx||[]).forEach(function(f){ if(f.pts) PG.pts.push({n:f.pts,x:f.x,y:f.y,t:1.2}); }); return; }
  g.events.forEach(function(k){ if(PG_SND[k]) Sfx.play(PG_SND[k]); });
  (g.fx||[]).forEach(function(f){ if(f.pts) PG.pts.push({n:f.pts,x:f.x,y:f.y,t:1.2}); if(f.lost!==undefined){ flash=0.25; burst(pgX(Math.max(0,Math.min(g.ar,f.lost))),f.cave?pgY(Pong.TUNE.TOP)+4:Math.min(LH,pgY(1))-6,20,[PG_COL.ball,'#ffffff',P.hit],60*K); }
    if(Array.isArray(f.cave)) f.cave.forEach(function(x){ burst(pgX(x),pgY(Pong.TUNE.TOP)+3,8,[PG_COL.ceil,'#ff8c78','#8f9cc0'],40*K); });   // v1.61d: the ceiling comes down
    if(f.mend) PG.mend=(PG.mend||[]).concat([{xs:f.mend,t:0.6}]); }); }
function pgPlay(){
  /* 1.59c: the steps a frame — the nearest whole number, not «while a whole step has gathered»: at 60 frames a second the gathered time
     hovers right at one step, and a hair's difference either way gave a frame with no step and the next with two — the ball jerked
     (Den 19:26: «мяч дёргается в полёте»). Now it is one step a frame; the time left over (under half a step either way) carries on */
  var fs=Pong.frameSteps(acc+DT), n=0, want=fs.n; acc=fs.acc;
  var now=performance.now(), vs=lastNow;   // 1.59g: the palm is taken at the screen frame's own time (the frame's start), not when this code got to run — on the Mi 9 Lite that wandered by up to 30 ms behind the sonar's work, and so did the rackets
  /* 1.59f: how the phone keeps up — every 5 s into the game's log: frames drawn, the longest one (ms), frames over 25 ms */
  var fp=PG.fps||(PG.fps={t:now,n:0,mx:0,slow:0,last:null}); if(fp.last!==null&&now-fp.last<1000){ var fd=now-fp.last; fp.n++; if(fd>fp.mx) fp.mx=fd; if(fd>25) fp.slow++; } fp.last=now;
  if(now-fp.t>=5000){ Logs.gameEv('кадры',{n:fp.n,s:+((now-fp.t)/1000).toFixed(2),max:Math.round(fp.mx),slow:fp.slow}); fp.t=now; fp.n=0; fp.mx=0; fp.slow=0; }
  while(n<want){ n++; var c=PG.c, f=c?PongCtl.frac(c,c.present?PongCtl.palmAt(c,vs-(want-n)*1000*Pong.DT):null):null;   // 1.59e: the palm at each step's own time (src/16_pong_ctl.js palmAt)
    f=f===null?null:Math.round(f*10000)/10000;   /* 1.61p: the palm rounded to the 4 digits the log keeps, so a replay from the log is the same game (since 1.59g this line sat inside the comment above — the rules got the unrounded palm; the grid was 1/4000, which 4 digits can't hold) */
    if(PG.resumed){ PG.resumed=false; Pong.resume(g); Logs.gameEv('resume',g.n); }   // 1.61r: the first step after a pause is no swing (pong-8)
    Pong.step(g,f); Logs.step({pong:1,n:g.n,FH:1,ship:{y:g.py},lives:g.lives,score:g.score,events:g.events},f); pgReact(); if(g.state==='over') break; }
  flash=Math.max(0,flash-DT); duckT-=DT; if(duckT<=0&&Sonar.peak()>DUCK_PEAK){ duckT=0.4; if(Sfx.duck()) Logs.gameEv('sounds down',+Sfx.level().toFixed(2)); }
  pgField(g,DT); pgHud(); coveredLine(topY()+40); pgPauseBtn(); say(L('menu_a'));
  if(flash>0&&!pgSkOn()){ lx.globalAlpha=Math.min(0.3,flash); R(P.hit,0,0,LW,LH); lx.globalAlpha=1; }
  if(g.state==='over') endGame(); }
function pgEnd(){ g.state='over'; overT=0; Logs.gameStop(); if(g.score>pgBest()){ PG.best=g.score; PG.newBest=true; store.set('sonaroids_pong_best',PG.best); } go('over'); }
function pgDrop(){ if(g&&g.ball!==undefined&&g.state!=='over'){ Logs.gameEv('restarted by the player'); g.state='over'; Logs.gameStop(); if(g.score>pgBest()){ PG.best=g.score; store.set('sonaroids_pong_best',PG.best); } } }
function pgOver(){ overT+=DT; pgField(g,DT); lx.globalAlpha=0.45; R(P.bg,0,0,LW,LH); lx.globalAlpha=1;
  var cx0=freeSide()==='left'?Math.round(LW*0.6):Math.round(LW*0.4), y=Math.round(LH*0.24);
  var ls=[[L('pg_width').replace('{n}',Math.round(Pong.width(g)*100)),P.text],[L('pg_passes').replace('{n}',g.passes),P.text]].concat(PG.newBest?[[L('best')+'!',P.band]]:pgBest()>0?[[L('best')+' '+pgBest(),P.soft]]:[]);
  var fw=0; ls.forEach(function(q){ fw=Math.max(fw,PF.width(q[0])); }); fw=Math.max(fw,PF.width(L('over')))+20; plaque(cx0-fw/2,y-2,cx0+fw/2,y+38+ls.length*11,0.6);
  text(L('over'),cx0,y,P.text,'center'); text(String(g.score),cx0,y+13,P.band,'center',2);
  ls.forEach(function(q,i){ text(q[0],cx0,y+38+i*11,q[1],'center'); });
  var vs='V'+VERSION, vr=freeSide()==='left', vx=vr?LW-SAFE.r-8:SAFE.l+8, vy=LH-SAFE.b-12, vw=PF.width(vs);
  text(vs,vx,vy,diag?P.band:P.soft,vr?'right':'left'); var bx0=Math.max(0,(vr?vx-vw:vx)-8), bx1=Math.min(LW,(vr?vx:vx+vw)+8), by0=vy-8; BTN.push({id:'ver',x:bx0,y:by0,w:bx1-bx0,h:Math.min(PF.CAP+16,LH-by0)});
  say(L('over')+' '+g.score);
  if(overT>0.8) column([['again',L('again'),'primary'],['over_cal',L('recal')],['menu',L('menu')]].concat(diag&&Logs.has()?[['logs',L('logs')]]:[]),Math.round(LH*0.52)); }
