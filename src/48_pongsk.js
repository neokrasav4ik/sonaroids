/* ════ SONAPONG «НАБРОСОК» in the game (v1.61h; stage 3 of claude/SONAPONG_PORT.md — the maintainer 11 Oct 17:29: «скины — пока два, наши
   тёмный и светлый, оба „набросок“»; 16:50: «с соплами вместо пропеллеров картинка смотрится поинтереснее»). The lab's drawing as it is:
   src/39_sketch.js (pgSketch) is one file for the lab and the game. It reads the lab's names — ARC (the game's state), PG_V (the options),
   pgSurf, JG_TOP… — so here they are made from the game's own: the rules' state (src/15_pong.js) and its world (Pong.TUNE). The lab's
   options are the world Den chose («Как советую»): the bowls, cracks every 5th, 5 balls, the series to 5, the rackets narrowing without
   end, the nozzles under the planks, the little players («для вида»). Only the picture: the rules see nothing of it.
   The field is drawn on its own canvas at the field's shape (2.16) and laid where the field is (pgX/pgY); the paper fills the rest ════ */
var PGK={cv:null,src:null,v:{ar:PG_AR,hw:0.2},q:{prev:0}};
(function(){ var T=Pong.TUNE, G=window;
  G.JG_TOP=T.TOP; G.PG_XC=T.XC; G.PG_LIFT=T.LIFT; G.PG_CB=T.CB; G.JG_PAD_LO=T.PAD_LO; G.PG_NET0=1; G.PG_SPIDER=T.SPIDER; G.PG_G=T.G;
  G.PG_TILT=26; G.PG_TILTV=25; G.PG_Q={lvl:0,ms:16.7,slow:0};
  G.PG_V={fw:1,curve:2,crack:T.CRACK,lives:T.LIVES,combo:2,grow:3,gsec:T.NARROW_T,motor:1,phint:0,pts:0,wall:0,who:0,skin:1,dark:0,mult:1};
  G.ARC={};
  G.pgHw=function(){ return PGK.v.hw; };
  G.pgCupA=function(){ return T.CUP/(1+T.KV/2); };
  G.pgSurf=function(i,x,py){ return Pong.surf(PGK.v,i,x,py); };
  G.jgPadH=function(){ return PGK.v.H||T.SENS[1]; };
  G.pgPtsF=function(f){ return Pong.ptsOf(f); };
  G.pgMultAll=function(){ var q=PGK.src; return q?Pong.mult(q)*(1+T.SERIES*Math.min(T.SERIES_N,q.series||0)):1; };
  G.pgTime=function(){ return 0; };
  G.pgNarrowP=function(){ return T.NARROW_T; };
  /* where the shuttle will land on the racket it flies to — for the little player who runs there (the lab's pgMeatPath, only what the drawing uses) */
  G.pgMeatPath=function(b,pad,ar){ var i=b.from===null||b.from===undefined?b.to:1-b.from; if(i!==0&&i!==1) return null; if(ARC.pys) pad=ARC.pys[i];   // v1.64c: together — each racket at its own place
    var x=b.x, y=b.y, vx=b.vx, vy=b.vy, h=1/240, S=null, k;
    for(k=0;k<1200;k++){ vy+=T.G*h; x+=vx*h; y+=vy*h; if(vy>0){ S=Pong.surf(PGK.v,i,x,pad); if(Math.abs(S.u)<=1&&y>=S.y-b.r) break; S=null; } if(y>1.1) return null; }
    return S?{i:i,P:[x,S.y-b.r]}:null; };
})();
function pgSkOn(){ return true; }
/* v1.61i: the two skins — light paper with black ink, dark paper with white ink (the lab's «Бумага: тёмная», 1.60p/s/x); kept on the phone */
function pgSkin(){ if(PG.skin===undefined||PG.skin===null){ var v=parseInt(store.get('sonaroids_pong_skin','0'),10); PG.skin=v===1?1:0; } return PG.skin; }
function pgSkinLabel(){ return L('skin')+': '+L('pg_sk'+pgSkin()); }
/* v1.61j: the points by the shuttle (the lab's 1.60t/w «Очки у волана»; Den 19:17: «сделай и о1, и о2, я потом выберу.. по умолчанию — о1»).
   О1 — a «+N» tag rides below-left of the shuttle, growing with the height; at the top it freezes and swells; on the catch it flies into the
   score. О2 — at the top of the arc the pen writes the number, it hangs there while the shuttle falls (never on the ceiling or the web) and
   fades after the catch. A ceiling touch — no points, no tag. In the pause; О2 by default since 1.61u */
function pgHint(){ if(PG.hint===undefined||PG.hint===null){ var v=parseInt(store.get('sonaroids_pong_hint','2'),10); PG.hint=v===1?1:2; }   /* 1.61u: О2 by default (Den 22:40) */ return PG.hint; }
function pgHintLabel(){ return L('pg_hint')+': '+L('pg_h'+pgHint()); }
/* the game's events → what the drawing animates: cracks with the time they appeared, the cave-in (the spider's cartoon), the mended cracks,
   the hits (the planks' kick, the players' swing), the last points. Called after every rules step of the game that is on the screen.
   1.61m: kept on the game itself (q._sk) — the menu's rally, the views and the real game each keep their own; coming back to the game
   after the pause's waving, its cracks don't grow again and the spider goes on */
function pgSkSt(q){ return q._sk||(q._sk={crk:[],crkB:null,crkM:null,kick:[null,null],lastPts:null,lastT:0,flash:0,t:q.t}); }
function pgSkFx(q){ var K=pgSkSt(q), t=q.t; (q.fx||[]).forEach(function(f){
    if(Array.isArray(f.cave)) K.crkB={t:t,x:f.x,xs:f.cave.slice()};
    if(f.mend) K.crkM={t:t,xs:f.mend.slice()};
    if(f.kick!==undefined) K.kick[f.kick]={t0:t,a:Math.max(0.3,Math.min(1,f.a||0))};
    if(f.pts){ K.lastPts=f.pts; K.lastT=1.5; }
    if(f.lost!==undefined) K.flash=0.25; });
  var cr=q.crk||[]; K.crk=cr.map(function(x,j){ var o=K.crk[j]; return o&&o.x===x?o:{x:x,t:t}; }); }
/* the drawing: q — a game (or a view of the field: the menu's demo, the waving, the countdown); playing — the score and the rest written in the corner */
function pgSkDraw(q,dt,playing,cardH,ckey){ var u=pgU(), fw=Math.max(1,Math.round(PG_AR*u*uiS)), fh=Math.max(1,Math.round(u*uiS));
  if(cardH){ fh=Math.max(1,Math.round(cardH)); fw=Math.round(fh*PG_AR); }   // 1.61s: the games' screen card — its own size
  var key=ckey||(cardH?'cc':'cv'); if(!PGK[key]) PGK[key]=document.createElement('canvas'); var cv0=PGK[key]; if(cv0.width!==fw||cv0.height!==fh){ cv0.width=fw; cv0.height=fh; PGS.key=''; }
  var K=pgSkSt(q), dq=Math.max(0,Math.min(0.1,q.t-K.t)); K.t=q.t;   // 1.61m: the flash and the «+N» fade by the game's own time (the menu's rally was drawn with dt 0 — its red veil never faded)
  if(PGK.src!==q){ PGK.src=q; PGS.life=null; PGS.pl=null; PGS.sh=null; PGS.hist=[]; PGS.mPl=null; PGS.mV=0; PGS.mRef=undefined; PGS.tLast=null; PGS.slow=null; PGS.pth=null; }   // another game on the screen: the players, the shuttle's turn, the motors start afresh
  PG_V.dark=pgSkin(); PG_V.phint=pgHint(); PG_V.hudL=handSide()==='left'; PG_V.skw=cardH?Math.min(4,Math.max(2.2,1.7*390/fh)):undefined;   /* 1.61s: on the small card the pen thicker — the lines stay at least ~1.5 dots */ PGK.v.ar=PG_AR; PGK.v.hw=q.hw; PGK.v.H=q.H; K.lastT=Math.max(0,K.lastT-dq); K.flash=Math.max(0,K.flash-dq);
  var A=window.ARC; A.ar=PG_AR; A.t=q.t; A.py=q.py; A.padSoft=null; A.balls=q.ball?[q.ball]:[]; A.webD=q.webD||0; A.crk=K.crk; A.crkB=K.crkB; A.crkM=K.crkM;
  A.ceils=q.ceils||0; A.falls=q.falls||0; A.narrowK=q.k||1; A.score=q.score||0; A.series=q.series||0; A.kick=K.kick; A.phase=playing?'play':'menu'; A.lastPts=K.lastPts; A.lastT=K.lastT; A.pf=[]; A.flash=K.flash; A.clean=0;
  /* v1.64c: together — each racket at its own palm (q.pys), the own player in red ink, «ТЫ» over him (always before the game, the first 3 s in it) */
  A.pys=q.pys||null; A.me=PD.on&&!cardH&&!ckey&&q!==PG.demo?pdMe():null; A.youA=q.duo?Math.max(0,Math.min(1,4-q.t)):scr==='pduo2'?0:1;
  var t0=performance.now(), c=cv0.getContext('2d'); c.setTransform(1,0,0,1,0,0);
  pgSketch(c,fw,fh,Math.max(1,uiS*DPR/S));
  /* 1.61m: the slow-phone steps only in the game itself (the menu and the getting ready run at 30 frames a second on purpose — they read
     as «slow» and stepped every phone down to the coarsest drawing within seconds) */
  if(cardH) return cv0;
  if(scr==='play'&&PGK.q.prev&&t0-PGK.q.prev<100) pgSkQual(t0-PGK.q.prev); PGK.q.prev=scr==='play'?t0:0;
  lx.fillStyle=PG_V.dark?'#1d1b18':'#f6f1e6'; lx.fillRect(0,0,LW,LH); var sm=lx.imageSmoothingEnabled; lx.imageSmoothingEnabled=true;
  lx.drawImage(cv0,pgX(0),pgY(0),PG_AR*u,u); lx.imageSmoothingEnabled=sm;
  if(A.me!==null&&A.meXY&&A.youA>0) pdYou(pgX(A.meXY[0]),pgY(A.meXY[1]),A.youA); A.meXY=null; }
/* v1.64c (М2): «ТЫ» and an arrow over the own player, in red */
function pdYou(x,y,a){ var red=pgSkin()?'#ff4b36':'#ec2a17', s=L('pd_you'), top=y-Math.round(pgU()*0.25); lx.globalAlpha=a;
  text(s,Math.round(x),top-PF.CAP*2-12,red,'center',2,true); R(red,Math.round(x)-1,top-8,2,8); for(var k=1;k<=4;k++) R(red,Math.round(x)-1-k,top+4-k,2*k+2,1);
  lx.globalAlpha=1; }
/* v1.62c: a replay window — a view of one of the game's arcs drawn at the window's own size on its own canvas (ckey), with its own drawing
   state: the players, the shuttle's turn, the trail (PGS) are kept on the view and swapped in for its drawing, so two windows side by side
   don't start each other's afresh every frame */
var PGS0={key:'',bg:null,pl:null,hist:[],hid:0,hb:null,tLast:null,tgt:[null,null],tKey:''};
function pgSkClip(v,cardH,ckey){ var keep=PGS, src=PGK.src; PGS=v._pgs||(v._pgs=JSON.parse(JSON.stringify(PGS0))); PGK.src=v;
  try{ return pgSkDraw(v,0,false,cardH,ckey); } finally { v._pgs=PGS; PGS=keep; PGK.src=src; } }
/* a slow phone: as the lab's (1.60r) — frames longer than ~21 ms for 1.5 s step the drawing down once: the ink laid plainly instead of
   «multiply» (slow on Android), then the lines' points sparser. The canvas is already at most twice the game's pixels */
function pgSkQual(ms){ var Q=PG_Q; if(!(ms>0&&ms<200)) return; Q.ms+=(ms-Q.ms)*0.1; if(Q.ms>21) Q.slow+=ms/1000; else Q.slow=Math.max(0,Q.slow-ms/2000);
  if(Q.slow>1.5&&Q.lvl<4){ Q.lvl++; Q.slow=0; Q.ms=16.7; try{ Logs.gameEv('набросок: качество',Q.lvl); }catch(e){} } }
/* 1.61o: the drawn phone on the getting-ready screens (away, the waving, the instructions) showed SonaFly's ship; for SonaLob it shows
   the paper with one big plank going up and down with the palm (Den 20:28: «на нарисованном смартфоне скин сонафлая вместо платформ..
   лучше одну платформу нарисовать — так её точно видно будет»). Drawn thick: the phone on the picture is small */
var PGP={c:null,at:-1};
function pongPhone(f){ if(PGP.at===clock&&PGP.c) return PGP.c; PGP.at=clock; var q=2, W=Math.round(LW*q), H=Math.round(LH*q);
  if(!PGP.c||PGP.c.width!==W||PGP.c.height!==H){ PGP.c=document.createElement('canvas'); PGP.c.width=W; PGP.c.height=H; }
  var c=PGP.c.getContext('2d'), dark=pgSkin()===1, U=H/390, FW=390*W/H; c.setTransform(1,0,0,1,0,0); c.fillStyle=dark?'#1d1b18':'#f3eee2'; c.fillRect(0,0,W,H);
  c.setTransform(U,0,0,U,0,0); var ff=f===null||f===undefined?0.5:Math.max(0,Math.min(1,f)), y=80+(1-ff)*190, x0=FW*0.12, x1=FW*0.88, top=[], bot=[], TH=46;   // the phone on the picture is seen nearly edge-on: everything drawn tall
  for(var j=0;j<=24;j++){ var u=j/24, x=x0+(x1-x0)*u, yt=y-40*(1-u)*(1-u)+8*u; top.push([x,yt]); bot.push([x,yt+TH*(0.75+0.25*Math.sin(Math.PI*u))]); }   // a bowl: the outer edge higher
  var ink=dark?'#ffffff':'#121116', red=dark?'#ff4b36':'#ec2a17';
  [0.26,0.74].forEach(function(u){ var k=Math.round(u*24), x=top[k][0], yy=bot[k][1]; c.fillStyle=red; c.globalAlpha=0.85; c.beginPath(); c.moveTo(x-22,yy+8); c.lineTo(x+22,yy+8); c.lineTo(x,yy+90); c.closePath(); c.fill(); c.globalAlpha=1;
    c.fillStyle=ink; c.fillRect(x-26,yy-2,52,14); });   // the nozzles and their fire under it
  c.beginPath(); top.forEach(function(q,k){ if(k) c.lineTo(q[0],q[1]); else c.moveTo(q[0],q[1]); }); for(var k2=bot.length-1;k2>=0;k2--) c.lineTo(bot[k2][0],bot[k2][1]); c.closePath();
  c.fillStyle=ink; c.globalAlpha=0.28; c.fill(); c.globalAlpha=1;
  var p=new Sk.Pen(c,{seed:5151,tick:0,ink:ink,w:9,wob:1.2,overK:2,open:0.5,passes:1,jit:1,hs:1/0.8,cross:true,step:3});
  p.draw(top,{w:16}); p.draw(bot,{w:9}); p.band(top,bot,{sp:14,shift:-10,w:5}); p.line(top[0][0],top[0][1],bot[0][0],bot[0][1],{w:9}); p.line(top[24][0],top[24][1],bot[24][0],bot[24][1],{w:9});
  c.setTransform(1,0,0,1,0,0); return PGP.c; }
/* ── v1.61v: «Как играть» — SonaLob's rules in four drawn screens, at the start of «ИНСТРУКЦИЯ» (the maintainer 11 Oct 22:50–23:08: «в
   инструкции, отдельно правил не надо.. ладонь на первом экране лишняя»; the sketches «Подкидывай выше», «Серия», «Потолок трескается»,
   «Ракетки сужаются»). Each a little cartoon of ~4 s on a loop, drawn by the game's own pen on its paper: the shuttle flies the high arc and
   the pen writes 240 at its top; the series' dots fill one by one and the notes climb; the cracks come one by one and the spider takes the
   shuttle; the planks' ends are sawn off and fall, the web comes down. Only the picture; the coordinates are the field's, 390 high ── */
var PGH={cv:null,key:''};
function pgHowDraw(step,t){ var u=pgU(), fw=Math.max(1,Math.round(PG_AR*u*uiS)), fh=Math.max(1,Math.round(u*uiS));
  PG_V.dark=pgSkin(); PG_V.skw=undefined; var key=fw+'x'+fh+'|'+pgsStyle();
  if(!PGH.cv) PGH.cv=document.createElement('canvas'); var cv=PGH.cv; if(cv.width!==fw||cv.height!==fh){ cv.width=fw; cv.height=fh; }
  if(PGH.key!==key){ PGH.key=key; PGH.bg=document.createElement('canvas'); PGH.bg.width=fw; PGH.bg.height=fh; var bc=PGH.bg.getContext('2d'); var d0=Math.max(1,uiS*DPR/S); bc.scale(d0,d0); Sk.paper(bc,fw/d0,fh/d0,d0,{seed:7});
    if(PGS_ST.dark){ try{ var idt=bc.getImageData(0,0,fw,fh), dd=idt.data; for(var q=0;q<dd.length;q+=4){ var lu=0.3*dd[q]+0.59*dd[q+1]+0.11*dd[q+2], v=Math.max(0,255-lu*0.93); dd[q]=v*1.02+3; dd[q+1]=v*0.98+2; dd[q+2]=v*0.93; } bc.putImageData(idt,0,0); }catch(e){} } }
  var c=cv.getContext('2d'), U=fh/390, FW=390*fw/fh, I=PGS_ST, CE=112, PY=350, RED=I.accent;
  c.setTransform(1,0,0,1,0,0); c.globalCompositeOperation='source-over'; c.drawImage(PGH.bg,0,0); c.setTransform(U,0,0,U,0,0); c.globalCompositeOperation=PGS_ST.dark?'screen':'multiply';
  var P=function(s){ return pgsPen(c,s); }, T=function(s,str,x,y,size,o){ var pp=P(s); pp.text(str,x,y,size,Object.assign({align:'center',w:I.w*0.7},o||{})); };
  var ez=function(v){ v=Math.max(0,Math.min(1,v)); return v*v*(3-2*v); };
  /* the ceiling with its hatching */
  var p0=P(101); p0.line(6,CE+1,FW*0.52,CE-1,{w:p0.w*1.25,over:6}); p0.line(FW*0.48,CE-1.5,FW-6,CE+1.5,{w:p0.w*1.25,over:6});
  var tp=[], bt=[]; for(var x=0;x<=FW;x+=3){ tp.push([x,CE-0.5]); bt.push([x,CE-8-6*Sk.noise(x/40)]); } p0.band(tp,bt,{sp:6,shift:4,w:p0.w*0.5,a:0.7});
  /* the scene under the ceiling, a little smaller (about the ceiling's middle) — the buttons get the bottom of the screen */
  var KS=0.8; c.translate(FW/2,CE); c.scale(KS,KS); c.translate(-FW/2,-CE);
  function plank(s,x0,x1,side){ var top=[]; for(var j=0;j<=24;j++){ var uu=j/24, ui=side?1-uu:uu; top.push([x0+(x1-x0)*uu,PY-16*(1-ui)*(1-ui)+4*ui]); } pgsPlatform(P(s),top); }
  function fig(s,x,d,pose){ pgsFig(P(s),x,PY-10,d,PGS_POSE[pose||'ready'],{hair:d>0,cap:d<0}); }
  function arcPt(x0,x1,y0,top,uu){ var base=y0, y=base-(base-top)*4*uu*(1-uu); return [x0+(x1-x0)*uu,y]; }
  function dots(s,x0,x1,y0,top,u1){ var pd=P(s); for(var i=1;i<=Math.floor(40*u1);i+=2){ var q=arcPt(x0,x1,y0,top,i/40); pd.loop(q[0],q[1],1.3,1.3,{w:I.w*0.5,a:0.8}); } }
  if(step===0){ var L=2.6, tt=t%L, uu=Math.min(1,tt/1.6); plank(11,60,430,0); plank(12,470,840,1); fig(21,200,1,tt<0.3?'flick':'ready'); fig(22,700,-1,uu>0.9?'crouch':'ready');
    dots(31,300,600,322,CE+14,uu); var q1=arcPt(300,600,322,CE+14,uu), q2=arcPt(300,600,322,CE+14,Math.min(1,uu+0.01)); pgsShuttle(P(32),q1[0],q1[1],Math.atan2(q2[1]-q1[1],q2[0]-q1[0]),{cork:RED,k:1.1});
    if(uu>=0.5){ var n=Math.max(1,Math.ceil(3*Math.min(1,(tt-0.8)/0.3))); T(41,'240'.slice(0,n),464,CE+40,22,{align:'left'}); }
    dots(33,320,560,322,262,1); T(42,'30',446,252,16,{align:'left',a:0.6});
    var ps=P(51); ps.stroke([[40,CE+14],[40,322]],{w:I.w*0.45}); for(var k=0;k<=4;k++) ps.stroke([[34,CE+14+k*(308-CE)/4],[46,CE+14+k*(308-CE)/4]],{w:I.w*0.45}); }
  else if(step===1){ var nf=Math.floor(t/0.55)%7; plank(11,60,430,0); plank(12,470,840,1); fig(21,240,1,nf%2?'flick':'ready'); fig(22,660,-1,nf%2?'ready':'flick');
    [0,1,2].forEach(function(i){ dots(31+i,262+i*14,640-i*14,322,215-i*30,1); });
    ['1,1','1,2','1,3','1,4','1,5'].forEach(function(s,i){ var x=300+i*62, pd=P(60+i); pd.loop(x,268,6,6,{w:I.w*0.6}); if(i<Math.min(5,nf)) pd.draw([[x-4.5,271],[x+3.5,262],[x-3,269],[x+4.5,265]],{w:I.w*0.9,ink:RED}); T(70+i,'×'+s,x,298,13,{a:i<nf?1:0.45}); });
    var pn=P(80); for(var m=0;m<Math.min(3,nf);m++){ var xx=690+m*22, yy=236-m*18; pn.loop(xx,yy,4.5,3.5,{w:I.w*0.6}); pn.stroke([[xx+4,yy],[xx+4,yy-16]],{w:I.w*0.5}); } }
  else if(step===2){ var L3=4.2, t3=t%L3, nc=Math.min(4,Math.floor(t3/0.5)); plank(11,60,430,0); plank(12,470,840,1); fig(21,200,1); fig(22,700,-1,nc>=4?'duck':'ready');
    [140,250,360,470].slice(0,nc).forEach(function(x0,j){ var pc=P(6100+j), Lc=10+5*j, pts=[[x0,CE+2]]; for(var mm=1;mm<=5;mm++){ var hh=((j+1)*7.31+mm*3.17)%1; pts.push([x0+(mm%2?1:-1)*(2+hh*5),CE+2+Lc*mm/5]); } pc.draw(pts,{w:I.w*0.7}); T(6200+j,String(j+1),x0,CE+Lc+30,13,{a:0.7}); });
    var sp=ez((t3-2.2)/0.8), sx=600, lives=5-(t3>3.4?1:0);
    if(t3>=2.0){ P(90).stroke([[sx,CE+2],[sx,CE+2+78*sp]],{w:I.w*0.3}); pgsSpider(P(91),sx,CE+8+78*sp,t3*6,1.4); }
    if(t3<3.0){ var sy=t3<2.0?260-(260-CE-120)*ez(t3/2):CE+120; pgsShuttle(P(93),sx,sy,-Math.PI/2,{cork:RED,k:1.1}); }
    else { var cp=P(92), cy=CE+120-(t3>3.4?60*ez((t3-3.4)/0.6):0); cp.loop(sx,cy,8,12,{w:I.w*0.6}); for(var w2=0;w2<6;w2++) cp.stroke([[sx-9,cy-10+w2*3.4],[sx+9,cy-8+w2*3.4]],{w:I.w*0.35}); }
    if(nc>=4) T(94,'5',sx+30,CE+70,15,{ink:RED});
    for(var h=0;h<lives;h++) pgsShuttle(P(95+h),790-h*18,150,-Math.PI/2,{k:0.7,cork:RED}); }
  else { var L4=4.0, t4=t%L4, cut=ez((t4-0.4)/0.5), fall=Math.max(0,t4-0.9); var a0=60+70*cut, b1=840-70*cut;
    plank(11,a0,380,0); plank(12,520,b1,1); fig(21,250,1); fig(22,650,-1);
    if(t4>0.4&&t4<0.9){ var pw=P(30); pw.stroke([[130,PY-30],[130,PY+20]],{w:I.w*0.4,a:0.6}); pw.stroke([[770,PY-30],[770,PY+20]],{w:I.w*0.4,a:0.6}); }
    if(t4>=0.9){ var pc4=P(31); [[95,-1],[805,1]].forEach(function(q){ var x=q[0]+q[1]*30*fall, y=PY+4+300*fall*fall, a=q[1]*(0.5+2*fall), ca=Math.cos(a), sa=Math.sin(a), R=function(uu,vv){ return [x+uu*ca-vv*sa,y+uu*sa+vv*ca]; }; if(y<420) pc4.draw([R(-30,-6),R(30,-6),R(30,6),R(-30,6),R(-30,-6)],{w:I.w*0.75}); }); }
    var pop=1+0.15*Math.max(0,1-Math.abs(t4-1.0)/0.3); T(32,'×2',450,268,26*pop,{ink:RED});
    var WY=CE+6+22*ez(t4/L4*1.6), wp=P(40); for(var aa=0;aa<6;aa++){ var x1=aa*FW/6, x2=(aa+1)*FW/6, pts4=[]; for(var m4=0;m4<=10;m4++){ var u4=m4/10; pts4.push([x1+(x2-x1)*u4,CE+(WY-CE)*(0.35+0.65*Math.sin(Math.PI*u4))]); } wp.stroke(pts4,{w:I.w*0.3,a:0.6}); }
    c.setTransform(U,0,0,U,0,0); [[24,40],[FW-24,40]].forEach(function(q){ for(var k4=0;k4<5;k4++){ var an=Math.PI*(0.1+0.8*k4/4); wp.stroke([[q[0],CE+1],[q[0]+Math.cos(an)*q[1],CE+Math.sin(an)*q[1]]],{w:I.w*0.28,a:0.6}); } }); }
  c.globalCompositeOperation='source-over'; c.setTransform(1,0,0,1,0,0);
  lx.fillStyle=PG_V.dark?'#1d1b18':'#f6f1e6'; lx.fillRect(0,0,LW,LH); var sm=lx.imageSmoothingEnabled; lx.imageSmoothingEnabled=true; lx.drawImage(cv,pgX(0),pgY(0),PG_AR*u,u); lx.imageSmoothingEnabled=sm; }
