/* ── v1.35: the ship's flight, the picture only — it tilts with its own vertical speed, banks a little, rolls over on a sharp turn,
   leaves two swirling trails from its wing tips and its flame grows with a fast move. Nothing here changes the game: in flight the tilt
   is the core's own (g.ship.tl, the slope the shots may follow, src/13_core.js), elsewhere (the try-out, the demo) the same formula on
   the ship's screen position. Every skin has its own look of the trail and flame (FLY_LOOK); LCD keeps its cells (no turning). ── */
var FLY={tl:0,sv:0,k:0,y:null,roll:-1,cool:0,fastS:0,fastT:-9,tr:[],emit:0,last:-1,id:''};
var FLY_LOOK={
  space:{piv:11,tip:[-2,6.5],trail:'vapor',c:'150,215,255',life:0.9,w:1.0,fl:['220,245,255','90,180,255'],flx:-1},
  fairy:{piv:11,tip:[-1,7],trail:'dust',c:'255,226,150',life:1.0,w:0.9,fl:['255,240,190','255,150,60'],flx:-3},
  vector:{piv:10,tip:[-2,6],trail:'line',c:'150,255,170',life:0.35,w:0.8,fl:['230,255,235','90,255,140'],flx:-1,flLine:true},
  neon:{piv:10,tip:[-2,6],trail:'neon',c:'255,90,210',c2:'90,220,255',life:0.7,w:1.0,fl:['255,230,250','255,70,200'],flx:0},
  note:{piv:10,tip:[-2,6],trail:'pencil',c:'60,66,110',life:0.9,w:0.8,fl:['255,210,80','240,110,40'],flx:-3,flPen:true},
  lcd:{piv:10,tip:[-3,6],trail:'dots',c:'30,50,20',life:0.6,w:1.0,still:true}
};
var FLY_ON=true;   // the switch for tests that measure the ship (tests/skin_sizes.js keeps it as is: shipBare draws no trail)
/* the tilt and the roll's trigger; tl — the core's slope when there is one (flight), else estimated the core's way from the screen */
function flyStep(sy,dt,tl){ var f=FLY, T=Core.TILT, yf=sy/K;
  if(f.y===null||dt<=0||dt>0.2){ f.y=yf; f.sv=0; }
  var sv=(yf-f.y)/Math.max(dt,1e-3); f.y=yf; f.sv+=(sv-f.sv)*(1-Math.exp(-dt/0.12));
  if(tl===undefined||tl===null){ var vv=f.sv>T.dead?f.sv-T.dead:f.sv<-T.dead?f.sv+T.dead:0, tt=Math.max(-T.max,Math.min(T.max,vv*T.gain)); f.tl+=(tt-f.tl)*(1-Math.exp(-dt/0.08)); }
  else f.tl=tl;
  f.k=Math.min(1,Math.abs(f.sv)/(Core.FH*0.9));                                   // how hard the ship moves, 0…1 — the flame and the trail
  /* the roll: on a turn after a fast move (down then up, or up then down), not more often than every 2.5 s, over a second */
  var sg=f.sv>0?1:-1; if(Math.abs(f.sv)>Core.FH*0.55){ f.fastS=sg; f.fastT=clock; }
  f.cool-=dt; if(f.roll<0&&f.cool<=0&&clock-f.fastT<0.45&&sg!==f.fastS&&Math.abs(f.sv)>Core.FH*0.2){ f.roll=0; f.cool=2.5; f.fastT=-9; }
  if(f.roll>=0){ f.roll+=dt/1.0; if(f.roll>=1) f.roll=-1; } }
function flyReset(){ FLY.y=null; FLY.tl=0; FLY.sv=0; FLY.roll=-1; FLY.tr=[]; FLY.cool=1; }
/* the roll's phase eased: 0…1 → the angle round the ship's own axis, 0…2π */
function flyRollA(){ var r=FLY.roll; if(r<0) return 0; var e=r<0.5?2*r*r:1-2*(1-r)*(1-r); return e*6.2832; }
/* the trails: two swirling wakes from the wing tips — each puff drifts back with the world, spreads and curls round its line, fading */
var flyDot={};
function flyDotSpr(c){ if(flyDot[c]) return flyDot[c]; var o=document.createElement('canvas'); o.width=o.height=32; var x=o.getContext('2d'), g=x.createRadialGradient(16,16,0,16,16,16);
  g.addColorStop(0,'rgba('+c+',1)'); g.addColorStop(0.45,'rgba('+c+',0.45)'); g.addColorStop(1,'rgba('+c+',0)'); x.fillStyle=g; x.fillRect(0,0,32,32); return flyDot[c]=o; }
function flyTrail(L,cx,cy,ang,sy2,dt){ var f=FLY, ca=Math.cos(ang), sa=Math.sin(ang), hd=SK.hd, drift=LW*0.42;
  if(dt>0) [-1,1].forEach(function(s){ var lx0=L.tip[0]-L.piv, ly0=s*L.tip[1]*sy2;   /* one puff a frame and side; the drawing fills between them */
      f.tr.push({x:cx+lx0*ca-ly0*sa,y:cy+lx0*sa+ly0*ca,s:s,t:clock,ph:s*1.7+clock*3,k:0.35+0.65*f.k}); });
  for(var i=0;i<f.tr.length;i++) f.tr[i].x-=drift*dt;
  f.tr=f.tr.filter(function(p){ return clock-p.t<L.life&&p.x>-20; });
  var C=hd?hx:lx; C.save();
  if(L.trail==='vapor'||L.trail==='dust'||L.trail==='neon'){ if(!hd){ C.restore(); flyTrailPx(L); return; }
    C.globalCompositeOperation=L.trail==='neon'?'lighter':'source-over';
    var at=function(p){ var a=(clock-p.t)/L.life; return {a:a,x:p.x,y:p.y+(Math.sin(a*6+p.ph)*a*5*L.w+a*a*3)*p.s}; };   // spreads, curls round its line, sinks a little
    [-1,1].forEach(function(s){ var pts=f.tr.filter(function(p){ return p.s===s; }), col=L.trail==='neon'&&s>0?L.c2:L.c, spr=flyDotSpr(col);
      for(var i=1;i<pts.length;i++){ var A=at(pts[i-1]), B=at(pts[i]), kk=pts[i].k;
        for(var j=0;j<3;j++){ var u=j/3, a=A.a+(B.a-A.a)*u, x=A.x+(B.x-A.x)*u, y=A.y+(B.y-A.y)*u, rr=(0.9+a*5)*L.w, al=Math.pow(1-a,1.7)*(L.trail==='neon'?0.22:0.16)*kk;
          if(al<0.006) continue; C.globalAlpha=al; C.drawImage(spr,x-rr,y-rr,2*rr,2*rr); }
        if(L.trail==='dust'&&i%4===0){ var a2=B.a; C.globalAlpha=Math.min(1,Math.pow(1-a2,1.2)*0.9*kk); C.fillStyle='rgba(255,250,215,1)'; C.fillRect(B.x+Math.sin(pts[i].ph*5)*a2*5-0.5,B.y+Math.cos(pts[i].ph*3)*a2*5-0.5,1,1); } } }); }
  else if(L.trail==='line'||L.trail==='pencil'){ C.lineCap='round';
    [-1,1].forEach(function(s){ var pts=f.tr.filter(function(p){ return p.s===s; });
      for(var i=1;i<pts.length;i++){ var a=(clock-pts[i].t)/L.life, sw=L.trail==='pencil'?Math.sin(a*9+pts[i].ph)*a*3:0, sw0=L.trail==='pencil'?Math.sin(((clock-pts[i-1].t)/L.life)*9+pts[i-1].ph)*((clock-pts[i-1].t)/L.life)*3:0;
        C.globalAlpha=Math.pow(1-a,1.3)*(L.trail==='pencil'?0.55:0.6)*pts[i].k; C.strokeStyle='rgb('+L.c+')'; C.lineWidth=(hd?0.6:1)*L.w;
        C.beginPath(); C.moveTo(pts[i-1].x,pts[i-1].y+sw0*s); C.lineTo(pts[i].x,pts[i].y+sw*s); C.stroke(); } }); }
  else if(L.trail==='dots'){ f.tr.forEach(function(p,i){ if(i%4) return; var a=(clock-p.t)/L.life; C.globalAlpha=0.55*(1-a); C.fillStyle='rgb('+L.c+')'; C.fillRect(Math.round(p.x/2)*2,Math.round((p.y+Math.sin(a*6+p.ph)*a*4*p.s)/2)*2,2,2); }); }
  C.restore(); }
/* the pixel graphics: the same wakes as single pixels */
function flyTrailPx(L){ FLY.tr.forEach(function(p,i){ if(i%2) return; var a=(clock-p.t)/L.life, al=Math.pow(1-a,1.4)*0.5*p.k; if(al<0.04) return;
  lx.globalAlpha=al; R('rgb('+(L.trail==='neon'&&p.s>0?L.c2:L.c)+')',p.x,p.y+Math.sin(a*7+p.ph)*a*5*p.s,1,1); }); lx.globalAlpha=1; }
/* the ship drawn turned: tilt (the slope's angle), bank (squashed a little when tilted), roll (round its own axis, with a glint edge-on) */
var flyPx=null;
/* the flame grows with a fast move: a cone of the skin's colours behind the ship, turned with it (drawn under the ship's own flame) */
function flyFlame(C,L,sx,sy,t){ var k=FLY.k; if(!L.fl||k<0.04) return; var x0=sx+L.flx, len=4+16*k*(0.85+0.15*Math.sin(t*37)), w=1.3+1.4*k;
  C.save(); if(L.flPen){ C.strokeStyle='rgba('+L.fl[1]+','+(0.4+0.5*k).toFixed(3)+')'; C.lineWidth=0.5; C.beginPath();   /* the notebook: a pen's flame, scribbled */
      for(var i=0;i<=6;i++){ var u=i/6, yy=(i%2?1:-1)*w*(1-u); if(i) C.lineTo(x0-len*u,sy+yy); else C.moveTo(x0,sy+yy); } C.stroke(); C.restore(); return; }
  C.globalCompositeOperation='lighter'; var g=C.createLinearGradient(x0,0,x0-len,0); g.addColorStop(0,'rgba('+L.fl[0]+','+(0.25+0.6*k).toFixed(3)+')'); g.addColorStop(0.35,'rgba('+L.fl[1]+','+(0.25+0.45*k).toFixed(3)+')'); g.addColorStop(1,'rgba('+L.fl[1]+',0)');
  if(L.flLine){ C.strokeStyle=g; C.lineWidth=0.7; C.beginPath(); C.moveTo(x0,sy-w); C.lineTo(x0-len,sy); C.lineTo(x0,sy+w); C.stroke(); C.restore(); return; }   /* the vector: a flickering outline */
  C.fillStyle=g; C.beginPath(); C.moveTo(x0+1,sy-w); C.quadraticCurveTo(x0-len,sy,x0+1,sy+w); C.fill(); C.restore(); }
function flyShip(sx,sy,t,blink,dt,tl){ var L=FLY_LOOK[skinId]||FLY_LOOK.space;
  if(!FLY_ON||shipBare){ SK.ship(sx,sy,t,blink); return; }
  flyStep(sy,dt,tl); var f=FLY, ang=Math.atan(f.tl), ra=flyRollA(), bank=1-0.22*Math.abs(f.tl)/Core.TILT.max, sy2=bank*Math.cos(ra), cx=sx+L.piv;
  if(L.still){ ang=0; sy2=1; }
  flyTrail(L,cx,sy,ang,sy2,dt);
  if(blink) return;
  if(SK.hd&&SK.shipView&&f.roll>=0){ var C=hx, rc=Math.cos(ra), rs=Math.sin(ra), side=Math.abs(rs)>Math.abs(rc), k=side?Math.abs(rs):Math.abs(rc);   /* v1.35: the roll through the skin's own views — top → side → belly → side upside down */
    C.save(); C.translate(cx,sy); C.rotate(ang); C.scale(1,bank*k*(side&&rs<0?-1:1)); C.translate(-cx,-sy); flyFlame(C,L,sx,sy,t);
    if(side) SK.shipView('side',sx,sy,t); else if(rc<0) SK.shipView('belly',sx,sy,t); else SK.ship(sx,sy,t,false); C.restore(); return; }
  if(SK.hd){ var C=hx; C.save(); C.translate(cx,sy); C.rotate(ang); C.scale(1,Math.abs(sy2)<0.06?(sy2<0?-0.06:0.06):sy2); C.translate(-cx,-sy); flyFlame(C,L,sx,sy,t); SK.ship(sx,sy,t,false); C.restore();
    if(f.roll>=0){ var e=Math.abs(Math.cos(ra)); if(e<0.35){ var g=1-e/0.35; C.save(); C.globalCompositeOperation='lighter'; C.translate(cx,sy); C.rotate(ang);   // edge-on: a glint runs along the hull
        var gr=C.createLinearGradient(-14,0,14,0); gr.addColorStop(0,'rgba('+L.c+',0)'); gr.addColorStop(0.5,'rgba(255,255,255,'+(0.9*g).toFixed(3)+')'); gr.addColorStop(1,'rgba('+L.c+',0)');
        C.fillStyle=gr; C.fillRect(-14,-1.2,28,2.4); C.globalAlpha=0.5*g; C.drawImage(flyDotSpr(L.c),-10,-6,20,12); C.restore(); } } }
  else { if(!flyPx){ flyPx=document.createElement('canvas'); flyPx.width=64; flyPx.height=48; }
    var px=flyPx.getContext('2d'), keep=lx; px.setTransform(1,0,0,1,0,0); px.clearRect(0,0,64,48); lx=px; try{ SK.ship(32-L.piv,24,t,false); } finally { lx=keep; }
    var q=Math.round(ang/0.0873)*0.0873;   /* turned in 5° steps, nearest pixel: the pixel look stays */
    lx.save(); lx.imageSmoothingEnabled=false; lx.translate(Math.round(cx),Math.round(sy)); lx.rotate(q); lx.scale(1,Math.abs(sy2)<0.12?(sy2<0?-0.12:0.12):Math.round(sy2*8)/8); lx.drawImage(flyPx,-32,-24); lx.restore(); } }
