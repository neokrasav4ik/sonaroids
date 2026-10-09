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
Sonar.listen(function(f,r){ if(mode!=='pong'||!PG.c||!r) return; PongCtl.frame(PG.c,r,512,PG.fs,(DSP2.info().cal||{}).s,scr==='count'&&PG.c.mxCal===null); });
/* a view of the rules' field for drawing outside a game (the menu, the holds, the countdown): the rackets at a place, no ball */
function pgView(py){ var v=PG.view; if(!v||v.ar!==pgAr()||v.H!==Pong.TUNE.SENS[pgSens()]){ v=PG.view=Pong.create(1,pgAr(),pgSens()); }
  v.py=py; v.k=1; v.hw=Pong.hwOf(v); return v; }
function pgPalmPad(v){ var c=PG.c, f=c?PongCtl.frac(c,PongCtl.palm(c)):null; return f===null?v.py:Pong.padOf(v,f); }
/* ── drawing (a stand-in look) ── */
var PG_COL={bg:'#0d1024',ceil:'#3a4370',rack:'#7ee0ff',rack2:'#3b8fb0',ball:'#ffd166',gap:'#1a2040'};
function pgField(q,dt){ R(PG_COL.bg,0,0,LW,LH);
  R(PG_COL.ceil,Math.max(SAFE.l,pgX(0)),pgY(Pong.TUNE.TOP)-1,Math.min(LW-SAFE.r,pgX(PG_AR))-Math.max(SAFE.l,pgX(0)),2);                                  // the ceiling
  for(var i=0;i<2;i++) pgRacket(q,i);
  var b=q.ball; if(b&&!(b.wait>0&&Math.floor(clock*6)%2)){ lx.fillStyle=PG_COL.ball; lx.beginPath(); lx.arc(pgX(b.x),pgY(b.y),Math.max(2,b.r*pgU()),0,6.2832); lx.fill(); }
  drawParts(dt||0); }
function pgRacket(q,i){ var n=18, xc=q.ar*(i?1-Pong.TUNE.XC:Pong.TUNE.XC), hw=q.hw, pts=[], k, x, s;
  for(k=0;k<=n;k++){ x=xc+(-1+2*k/n)*hw; s=Pong.surf(q,i,x); pts.push([pgX(x),pgY(s.y)]); }
  lx.fillStyle=PG_COL.rack2; lx.beginPath(); pts.forEach(function(p,j){ if(j) lx.lineTo(p[0],p[1]); else lx.moveTo(p[0],p[1]); });
  for(k=n;k>=0;k--) lx.lineTo(pts[k][0],pts[k][1]+4+2*Math.sin(k/n*Math.PI)); lx.closePath(); lx.fill();
  lx.strokeStyle=PG_COL.rack; lx.lineWidth=2.2; lx.lineJoin='round'; lx.lineCap='round'; lx.beginPath(); pts.forEach(function(p,j){ if(j) lx.lineTo(p[0],p[1]); else lx.moveTo(p[0],p[1]); }); lx.stroke(); }
function pgHeart(x,y,c){ R(c,x,y,2,1); R(c,x+3,y,2,1); R(c,x-1,y+1,7,2); R(c,x,y+3,5,1); R(c,x+1,y+4,3,1); R(c,x+2,y+5,1,1); }
/* the HUD (Den's lab layout): the score, the multiplier, the balls and the series in the top right corner; the time till the rackets
   narrow again — a bar along the bottom, burning down to its middle (1.59c; was along the right edge); the pause in the bottom corner on the free side */
function pgHud(){ var x=LW-SAFE.r-8, y=topY(), m=Pong.mult(g)*(1+Pong.TUNE.SERIES*Math.min(Pong.TUNE.SERIES_N,g.series));
  text(String(g.score),x,y,P.text,'right',2); y+=PF.CAP*2+5;
  text('×'+m.toFixed(2),x,y,P.band,'right'); y+=PF.CAP+5;
  for(var i=0;i<g.lives;i++) pgHeart(x-6-i*9,y,'#ff7a8a'); y+=9;
  for(var d=0;d<Pong.TUNE.SERIES_N;d++){ var on=d<Math.min(Pong.TUNE.SERIES_N,g.series); R(on?P.band:P.line,x-4-(Pong.TUNE.SERIES_N-1-d)*6,y,4,4); }
  // the time till the rackets narrow: a thin bar along the bottom, in the middle (1.59c, Den 19:43: «полосу убрать вниз и сделать горизонтальной»)
  var fr=Pong.nextNarrow(g)/Pong.TUNE.NARROW_T, x0=Math.round(LW*0.3), x1=Math.round(LW*0.7), by=LH-SAFE.b-6, bw=Math.round((x1-x0)*fr);
  R(P.line,x0,by,x1-x0,2); R(fr<0.2?P.hit:P.band,Math.round((x0+x1-bw)/2),by,bw,2);
  (PG.pts||[]).forEach(function(p){ p.t-=DT; if(p.t>0){ lx.globalAlpha=Math.min(1,p.t*2); text('+'+p.n,pgX(p.x),pgY(p.y)-14-(1.2-p.t)*12,P.text,'center'); lx.globalAlpha=1; } });
  PG.pts=(PG.pts||[]).filter(function(p){ return p.t>0; }); }
function pgPauseBtn(){ var s=BH-3, x=freeSide()==='left'?SAFE.l+8:LW-SAFE.r-8-s; iconButton('pause',x,LH-SAFE.b-s-6); }
/* ── the menu's own rally: the rules played by a bot ── */
function pgDemoBot(){ var s=12345, rnd=function(){ s=(s*1664525+1013904223)>>>0; return s/4294967296-0.5; }, REST=0.12, T=0.16, st='rest', t0=0, amp=0, h0=REST, hand=REST, trig=0.08, base=0.24;
  return function(q){ var b=q.ball, t=q.t;
    if(q.events.indexOf('pass')>=0||q.events.indexOf('dull')>=0){ var i=b.onI, xc=q.ar*(i?1-Pong.TUNE.XC:Pong.TUNE.XC); base=Math.max(0.1,Math.min(0.5,base-0.04*(i?1:-1)*(b.x-xc)/q.hw)); }
    if(st==='swing'){ var u=(t-t0)/T; if(u>=1) st='down'; else hand=h0+amp*(1-Math.cos(Math.PI*u))/2; }
    else { hand=hand>REST?Math.max(REST,hand-1.5*Pong.DT):Math.min(REST,hand+1.5*Pong.DT); if(st==='down'&&hand<=REST+1e-9) st='rest';
      if(st==='rest'&&b&&!(b.wait>0)&&b.vy>0&&(q.py-Pong.TUNE.LIFT-b.r-b.y)/b.vy<trig){ st='swing'; t0=t; h0=hand; amp=base+rnd()*0.06; trig=0.08+rnd()*0.01; } }
    return hand; }; }
function pgDemoTick(){ var d=PG.demo; if(!d||d.state==='over'||Math.abs(d.ar-pgAr())>1e-6||d.t>600){ d=PG.demo=Pong.create(20261009,pgAr(),1); PG.dbot=pgDemoBot(); }
  if(d._c===clock) return d; d._c=clock; for(var n=Math.max(1,Math.round(DT*60));n>0;n--) Pong.step(d,PG.dbot(d)); return d; }
function pgDemoDraw(){ var d=pgDemoTick(); pgField(d,0); }
/* the card on the games' screen: the menu's rally drawn full size off screen */
var pgCardC=null;
function pgCard(){ if(!pgCardC||pgCardC.width!==LW||pgCardC.height!==LH){ pgCardC=document.createElement('canvas'); pgCardC.width=LW; pgCardC.height=LH; }
  var keep=lx; try{ lx=pgCardC.getContext('2d'); pgDemoDraw(); } finally { lx=keep; } return pgCardC; }
/* ── the menu: play, how to play, the sensitivity (the only setting), the sounds, all the games ── */
function pgSensLabel(){ return L('pg_sens')+': '+L('pg_sens'+pgSens()); }
function sPTitle(){ pgDemoDraw();
  var items=[['play',L('play'),'primary'],['howto',L('howto')],['pg_sens',pgSensLabel()],['sfx','','sound'],['hub',L('all_games')]], w=colW(items);
  var bx0=sideX(w), m=Math.max(8,Math.round(LW*0.04)), band0=freeSide()==='left'?0:bx0-m, band1=freeSide()==='left'?bx0+w+m:LW;
  bandVeil(band0,band1,0.6); column(items,Math.round(LH*0.52),bx0,8);
  var a0=freeSide()==='left'?band1:SAFE.l, a1=freeSide()==='left'?LW-SAFE.r:band0, cx0=Math.round((a0+a1)/2), lsc=PF.width('SonaPong',2)<=a1-a0-12?2:1, y=Math.round(LH*0.14);
  var sl=PF.wrap(L('pg_s'),a1-a0-16,1), rw=PF.width('SonaPong',lsc); sl.forEach(function(l){ rw=Math.max(rw,PF.width(l)); }); plaque(cx0-rw/2,y-2,cx0+rw/2,y+lsc*10+6+sl.length*10-3,0.55);
  text('SonaPong',cx0,y,P.band,'center',lsc); y+=lsc*10+6; sl.forEach(function(l){ text(l,cx0,y,P.text,'center'); y+=10; });
  if(pgBest()>0) text(L('best')+' '+pgBest(),cx0,LH-SAFE.b-28,P.text,'center');
  say('SonaPong. '+L('play')+'. '+pgSensLabel()); }
/* ── the getting ready's last step: the two holds (instead of SonaFly's waving), then the try-out — the rackets follow the palm ── */
function pgHoldStart(){ if(!PG.c) PG.c=PongCtl.create(); PongCtl.start(PG.c); PG.done=false; PG.seenT=scrT; try{ PG.fs=Sonar.info().fs||48000; }catch(e){} }
function pgToHold(){ forceWave=false; autoTry=false; try{ DSP2.set('quarter',1); }catch(e){} PG.c=PongCtl.create(); PG.flips=0; caught=false; go('phold'); pgHoldStart(); }
function pgReady(){ return booted&&Sonar.healthy()&&acoustic&&!!PG.c&&!!PG.c.lin&&!PongCtl.holding(PG.c); }
function sPHold(){ var c=PG.c; if(!c){ pgHoldStart(); c=PG.c; }
  var v=pgView(Pong.TUNE.PAD_LO-Pong.TUNE.CB*Pong.TUNE.SENS[pgSens()]), r=null;
  if(PongCtl.holding(c)){ r=PongCtl.hold(c,clock); if(r.caught){ Sfx.play('ok'); Logs.ev(r.caught==='low'?'низ':'верх',{low:c.lin&&+c.lin.b.toFixed(1),top:c.lin&&+c.lin.t.toFixed(1),off:c.mxCal===null?null:+c.mxCal.toFixed(1)}); }
    if(r.done){ PG.done=true; PG.doneT=scrT; store.set('sonaroids_seen','1'); handSaved=handSide(); store.set('sonaroids_hand',handSaved); } }
  if(!PongCtl.lowStep(c)) v.py=pgPalmPad(v);                                             // the low hold: the rackets wait at the bottom
  if(c.present) PG.seenT=scrT; if(PongCtl.holding(c)&&scrT-PG.seenT>NOHAND_T){ flipSide(); PG.flips++; pgHoldStart(); }   // no palm heard: offer the other end
  pgField(v,DT);
  if(PG.done&&PG.resume){ if(scrT-PG.doneT>0.6){ PG.resume=false; countT=3; go('count-resume'); } titles(L('pg_ok_t')); return; }
  if(PG.done){ titles(L('pg_ok_t'),L('pg_ok_s'));
    column([['start',L('play'),'primary'],['pg_rehold',L('recal')]],Math.round(LH*0.62)); return; }
  var low=PongCtl.lowStep(c), k=r?r.k:0, y=titles(L(low?'pg_low_t':'pg_top_t'),L(low?'pg_low_s':'pg_top_s')), cx0=Math.round((SAFE.l+LW-SAFE.r)/2);
  for(var d=0;d<5;d++){ var x=cx0-24+d*12; if(d<k) { lx.fillStyle=P.band; lx.beginPath(); lx.arc(x,y+8,3.5,0,6.2832); lx.fill(); } else { lx.strokeStyle=P.soft; lx.lineWidth=1; lx.beginPath(); lx.arc(x,y+8,3,0,6.2832); lx.stroke(); } }
  coveredLine(y+20); handBeacon(); }
/* ── the countdown: the rackets at the palm, then the game ── */
function pgCount(){ countT-=DT; var v=pgView(PG.view?PG.view.py:Pong.TUNE.PAD_LO-0.5*Pong.TUNE.SENS[pgSens()]); v.py=pgPalmPad(v); pgField(v,DT);
  var n=Math.max(1,Math.ceil(countT)), cx0=Math.round(LW/2), cy0=Math.round(LH/2), fr=countT-Math.floor(countT), cs=3, pu=1+0.18*Math.max(0,fr-0.75)/0.25;
  ring(cx0,cy0,13*cs,1-fr,P.band); lx.save(); lx.translate(cx0,cy0); lx.scale(pu,pu); lx.translate(-cx0,-cy0); text(String(n),cx0,cy0-Math.round(3.5*cs),P.text,'center',cs); lx.restore(); say(String(n));
  if(Math.ceil(countT)<Math.ceil(countT+DT)&&countT>0) Sfx.play('tick');
  if(countT<=0) startGame(); }
function pgCountStart(){ countT=3; try{ DSP2.set('quarter',1); }catch(e){} go('count'); }
function pgStart(){ var seed=newSeed(); var lin=PG.c&&PG.c.lin; g=Pong.create(seed,pgAr(),pgSens(),lin?Math.max(30,lin.t-lin.b):null); var f=PG.c?PongCtl.frac(PG.c,PongCtl.palm(PG.c)):null; if(f!==null) g.py=Pong.padOf(g,f);
  acc=0; parts=[]; PG.pts=[]; PG.newBest=false; nickAsked=false; var I=Sonar.info(), c=PG.c||{};
  Logs.gameStart({core:Pong.TAG,game:'pong',seed:seed,ar:+g.ar.toFixed(4),sens:pgSens(),span:g.span,cal:DSP2.info().cal,lin:c.lin?{b:+c.lin.b.toFixed(1),t:+c.lin.t.toFixed(1)}:null,mix_off:c.mxCal===null||c.mxCal===undefined?null:+c.mxCal.toFixed(1),
    chan:I.chan,hand:handSide(),probe_gain:I.probe_gain,probe_snr:I.probe_snr,f_lo:I.f_lo,W:LW,H:LH,sfx:Sfx.state(),started:new Date().toISOString(),app:'sonaroids'});
  Sfx.play('start'); go('play'); }
/* ── the game ── */
var PG_SND={go:'tap',land:'tap',ceil:'rub',pass:'coin',dull:'syrup',lost:'crash',narrow:'level'};
function pgReact(){ g.events.forEach(function(k){ if(PG_SND[k]) Sfx.play(PG_SND[k]); });
  (g.fx||[]).forEach(function(f){ if(f.pts) PG.pts.push({n:f.pts,x:f.x,y:f.y,t:1.2}); if(f.lost!==undefined){ flash=0.25; burst(pgX(Math.max(0,Math.min(g.ar,f.lost))),Math.min(LH,pgY(1))-6,20,[PG_COL.ball,'#ffffff',P.hit],60*K); } }); }
function pgPlay(){
  /* 1.59c: the steps a frame — the nearest whole number, not «while a whole step has gathered»: at 60 frames a second the gathered time
     hovers right at one step, and a hair's difference either way gave a frame with no step and the next with two — the ball jerked
     (Den 19:26: «мяч дёргается в полёте»). Now it is one step a frame; the time left over (under half a step either way) carries on */
  var fs=Pong.frameSteps(acc+DT), n=0, want=fs.n; acc=fs.acc;
  while(n<want){ n++; var c=PG.c, f=c?PongCtl.frac(c,c.present?PongCtl.palm(c):null):null; f=f===null?null:Math.round(f*4000)/4000;   // the palm rounded as the other games' (a replay takes these exact numbers)
    Pong.step(g,f); Logs.step({n:g.n,FH:1,ship:{y:g.py},lives:g.lives,score:g.score,events:g.events},f); pgReact(); if(g.state==='over') break; }
  flash=Math.max(0,flash-DT); duckT-=DT; if(duckT<=0&&Sonar.peak()>DUCK_PEAK){ duckT=0.4; if(Sfx.duck()) Logs.gameEv('sounds down',+Sfx.level().toFixed(2)); }
  pgField(g,DT); pgHud(); coveredLine(topY()+40); pgPauseBtn(); say(L('menu_a'));
  if(flash>0){ lx.globalAlpha=Math.min(0.3,flash); R(P.hit,0,0,LW,LH); lx.globalAlpha=1; }
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
