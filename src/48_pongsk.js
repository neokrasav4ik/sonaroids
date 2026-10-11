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
  G.pgMeatPath=function(b,pad,ar){ var i=b.from===null||b.from===undefined?b.to:1-b.from; if(i!==0&&i!==1) return null;
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
   fades after the catch. A ceiling touch — no points, no tag. In the pause, until Den picks one */
function pgHint(){ if(PG.hint===undefined||PG.hint===null){ var v=parseInt(store.get('sonaroids_pong_hint','1'),10); PG.hint=v===2?2:1; } return PG.hint; }
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
function pgSkDraw(q,dt,playing,cardH){ var u=pgU(), fw=Math.max(1,Math.round(PG_AR*u*uiS)), fh=Math.max(1,Math.round(u*uiS));
  if(cardH){ fh=Math.max(1,Math.round(cardH)); fw=Math.round(fh*PG_AR); }   // 1.61s: the games' screen card — its own size
  var key=cardH?'cc':'cv'; if(!PGK[key]) PGK[key]=document.createElement('canvas'); var cv0=PGK[key]; if(cv0.width!==fw||cv0.height!==fh){ cv0.width=fw; cv0.height=fh; PGS.key=''; }
  var K=pgSkSt(q), dq=Math.max(0,Math.min(0.1,q.t-K.t)); K.t=q.t;   // 1.61m: the flash and the «+N» fade by the game's own time (the menu's rally was drawn with dt 0 — its red veil never faded)
  if(PGK.src!==q){ PGK.src=q; PGS.life=null; PGS.pl=null; PGS.sh=null; PGS.hist=[]; PGS.mPl=null; PGS.mV=0; PGS.mRef=undefined; PGS.tLast=null; PGS.slow=null; PGS.pth=null; }   // another game on the screen: the players, the shuttle's turn, the motors start afresh
  PG_V.dark=pgSkin(); PG_V.phint=pgHint(); PG_V.hudL=handSide()==='left'; PG_V.skw=cardH?Math.min(4,Math.max(2.2,1.7*390/fh)):undefined;   /* 1.61s: on the small card the pen thicker — the lines stay at least ~1.5 dots */ PGK.v.ar=PG_AR; PGK.v.hw=q.hw; PGK.v.H=q.H; K.lastT=Math.max(0,K.lastT-dq); K.flash=Math.max(0,K.flash-dq);
  var A=window.ARC; A.ar=PG_AR; A.t=q.t; A.py=q.py; A.padSoft=null; A.balls=q.ball?[q.ball]:[]; A.webD=q.webD||0; A.crk=K.crk; A.crkB=K.crkB; A.crkM=K.crkM;
  A.ceils=q.ceils||0; A.falls=q.falls||0; A.narrowK=q.k||1; A.score=q.score||0; A.series=q.series||0; A.kick=K.kick; A.phase=playing?'play':'menu'; A.lastPts=K.lastPts; A.lastT=K.lastT; A.pf=[]; A.flash=K.flash; A.clean=0;
  var t0=performance.now(), c=cv0.getContext('2d'); c.setTransform(1,0,0,1,0,0);
  pgSketch(c,fw,fh,Math.max(1,uiS*DPR/S));
  /* 1.61m: the slow-phone steps only in the game itself (the menu and the getting ready run at 30 frames a second on purpose — they read
     as «slow» and stepped every phone down to the coarsest drawing within seconds) */
  if(cardH) return cv0;
  if(scr==='play'&&PGK.q.prev&&t0-PGK.q.prev<100) pgSkQual(t0-PGK.q.prev); PGK.q.prev=scr==='play'?t0:0;
  lx.fillStyle=PG_V.dark?'#1d1b18':'#f6f1e6'; lx.fillRect(0,0,LW,LH); var sm=lx.imageSmoothingEnabled; lx.imageSmoothingEnabled=true;
  lx.drawImage(cv0,pgX(0),pgY(0),PG_AR*u,u); lx.imageSmoothingEnabled=sm; }
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
