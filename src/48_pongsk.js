/* ════ SONAPONG «НАБРОСОК» in the game (v1.61h; stage 3 of claude/SONAPONG_PORT.md — the maintainer 11 Oct 17:29: «скины — пока два, наши
   тёмный и светлый, оба „набросок“»; 16:50: «с соплами вместо пропеллеров картинка смотрится поинтереснее»). The lab's drawing as it is:
   src/39_sketch.js (pgSketch) is one file for the lab and the game. It reads the lab's names — ARC (the game's state), PG_V (the options),
   pgSurf, JG_TOP… — so here they are made from the game's own: the rules' state (src/15_pong.js) and its world (Pong.TUNE). The lab's
   options are the world Den chose («Как советую»): the bowls, cracks every 5th, 5 balls, the series to 5, the rackets narrowing without
   end, the nozzles under the planks, the little players («для вида»). Only the picture: the rules see nothing of it.
   The field is drawn on its own canvas at the field's shape (2.16) and laid where the field is (pgX/pgY); the paper fills the rest ════ */
var PGK={cv:null,src:null,arc:null,crk:[],crkB:null,crkM:null,kick:[null,null],lastPts:null,lastT:0,flash:0,v:{ar:PG_AR,hw:0.2},q:{ms:16.7,slow:0}};
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
/* the game's events → what the drawing animates: cracks with the time they appeared, the cave-in (the spider's cartoon), the mended cracks,
   the hits (the planks' kick, the players' swing), the last points. Called after every rules step of the game that is on the screen */
function pgSkFx(q){ if(PGK.src!==q){ PGK.src=q; PGK.crk=[]; PGK.crkB=null; PGK.crkM=null; PGK.kick=[null,null]; PGK.lastT=0; PGS.life=null; PGS.pl=null; PGS.sh=null; PGS.hist=[]; }
  var t=q.t; (q.fx||[]).forEach(function(f){
    if(f.cave){ if(f.x!==undefined) PGK.crkB={t:t,x:f.x,xs:f.cave.slice()}; }
    if(f.mend) PGK.crkM={t:t,xs:f.mend.slice()};
    if(f.kick!==undefined) PGK.kick[f.kick]={t0:t,a:Math.max(0.3,Math.min(1,f.a||0))};
    if(f.pts){ PGK.lastPts=f.pts; PGK.lastT=1.5; }
    if(f.lost!==undefined) PGK.flash=0.25; });
  var cr=q.crk||[]; PGK.crk=cr.map(function(x,j){ var o=PGK.crk[j]; return o&&o.x===x?o:{x:x,t:t}; }); }
/* the drawing: q — a game (or a view of the field: the menu's demo, the waving, the countdown); playing — the score and the rest written in the corner */
function pgSkDraw(q,dt,playing){ var u=pgU(), fw=Math.max(1,Math.round(PG_AR*u*uiS)), fh=Math.max(1,Math.round(u*uiS));
  if(!PGK.cv) PGK.cv=document.createElement('canvas'); var cv0=PGK.cv; if(cv0.width!==fw||cv0.height!==fh){ cv0.width=fw; cv0.height=fh; PGS.key=''; }
  if(PGK.src!==q) pgSkFx(q);
  PGK.v.ar=PG_AR; PGK.v.hw=q.hw; PGK.v.H=q.H; PGK.lastT=Math.max(0,PGK.lastT-dt); PGK.flash=Math.max(0,PGK.flash-dt);
  var A=window.ARC; A.ar=PG_AR; A.t=q.t; A.py=q.py; A.padSoft=null; A.balls=q.ball?[q.ball]:[]; A.webD=q.webD||0; A.crk=PGK.crk; A.crkB=PGK.crkB; A.crkM=PGK.crkM;
  A.ceils=q.ceils||0; A.falls=q.falls||0; A.narrowK=q.k||1; A.score=q.score||0; A.series=q.series||0; A.kick=PGK.kick; A.phase=playing?'play':'menu'; A.lastPts=PGK.lastPts; A.lastT=PGK.lastT; A.pf=[]; A.flash=PGK.flash; A.clean=0;
  var t0=performance.now(), c=cv0.getContext('2d'); c.setTransform(1,0,0,1,0,0);
  pgSketch(c,fw,fh,Math.max(1,uiS*DPR/S));
  if(PGK.q.prev) pgSkQual(t0-PGK.q.prev); PGK.q.prev=t0;   // the frames' own rhythm, as the lab's
  lx.fillStyle=PG_V.dark?'#1b1916':'#f6f1e6'; lx.fillRect(0,0,LW,LH); var sm=lx.imageSmoothingEnabled; lx.imageSmoothingEnabled=true;
  lx.drawImage(cv0,pgX(0),pgY(0),PG_AR*u,u); lx.imageSmoothingEnabled=sm; }
/* a slow phone: as the lab's (1.60r) — frames longer than ~21 ms for 1.5 s step the drawing down once: the ink laid plainly instead of
   «multiply» (slow on Android), then the lines' points sparser. The canvas is already at most twice the game's pixels */
function pgSkQual(ms){ var Q=PG_Q; if(!(ms>0&&ms<200)) return; Q.ms+=(ms-Q.ms)*0.1; if(Q.ms>21) Q.slow+=ms/1000; else Q.slow=Math.max(0,Q.slow-ms/2000);
  if(Q.slow>1.5&&Q.lvl<4){ Q.lvl++; Q.slow=0; Q.ms=16.7; try{ Logs.gameEv('набросок: качество',Q.lvl); }catch(e){} } }
