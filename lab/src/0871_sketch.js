/* ── 1.59q: SonaPong «набросок» (Ден 10.10 19:40: «графика — в стиле наброска от руки.. фон — светлая чуть текстурированная мягкая
   бумага, как в блокнотах художников для скетчей. объектов минимум, всё нарисовано как бы на скорую руку ручкой»; 20:10 — «линер и
   ручка»; 21:20 — «проверим это в лабе.. линер, грубо, без перерисовок»). Перо (Sk) — то же, что на странице-наброске: каждая линия —
   заливка с нажимом (тоньше в начале и конце), медленная дрожь руки, вылет за концы, обводка в два прохода; кружки не смыкаются; тень —
   быстрая штриховка; цифры и надписи пишет то же перо (своя рукописная «азбука» из штрихов, без шрифта). Без перерисовок: у каждого
   предмета своё зерно, рисунок кадр от кадра один и тот же. Это только картинка — физика и правила не тронуты ── */
/* Hand-drawn pen on sketchbook paper — a canvas 2D toolkit (prototype for SonaPong's look).
   Every line is a filled outline with pressure (thin at the start and end), a slow hand wobble and a little overshoot;
   loops don't close exactly; shading is quick hatching; text is single-stroke handwriting drawn by the same pen. */
var Sk=(function(){
function mulberry(a){ return function(){ a=(a+0x6D2B79F5)>>>0; let t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
function hash(i){ i=(i|0)*374761393; i=(i^(i>>>13))*1274126177; i=i^(i>>>16); return ((i>>>0)%100000)/100000; }
function noise(x){ const i=Math.floor(x), f=x-i, u=f*f*(3-2*f); return hash(i)*(1-u)+hash(i+1)*u; }
function resample(pts,step){ const out=[pts[0]]; let acc=0; for(let i=1;i<pts.length;i++){ let [x0,y0]=pts[i-1]; const [x1,y1]=pts[i]; let d=Math.hypot(x1-x0,y1-y0); while(acc+d>=step){ const k=(step-acc)/d; x0=x0+(x1-x0)*k; y0=y0+(y1-y0)*k; out.push([x0,y0]); d=Math.hypot(x1-x0,y1-y0); acc=0; } acc+=d; } const l=pts[pts.length-1]; out.push(l); return out; }

/* A pen. opt: seed (the drawing), tick + amt (the «boil»: each tick the drawing is redrawn a little differently — amt 0 the same,
   1 a wholly new one), w thickness, wob hand wobble, overK overshoot, open (loops left open), passes + jit (lines gone over again),
   hs hatching spacing, cross (cross-hatching). Every random choice is a blend of the drawing's own and the tick's. */
function Pen(ctx,opt){ this.c=ctx; this.rb=mulberry(opt.seed||1); this.rt=mulberry(((opt.seed||1)*7919+(opt.tick||0)*104729+13)>>>0); this.amt=opt.tick?(opt.amt||0):0;
  this.ink=opt.ink||'#1b1b1f'; this.w=opt.w||1.6; this.wob=opt.wob===undefined?1.3:opt.wob; this.passes=opt.passes||1; this.jit=opt.jit===undefined?1:opt.jit;
  this.overK=opt.overK===undefined?1:opt.overK; this.open=opt.open||0; this.hs=opt.hs||1; this.cross=!!opt.cross; }
Pen.prototype.rnd=function(a,b){ const x=this.rb(), y=this.rt(); return a+(b-a)*(x+this.amt*(y-x)); };
Pen.prototype.sd=function(){ return [this.rb()*9999,this.rt()*9999]; };
Pen.prototype.nz=function(s,x){ const a=this.amt; if(!a) return noise(s[0]+x); return 0.5+((1-a)*(noise(s[0]+x)-0.5)+a*(noise(s[1]+x)-0.5))/Math.sqrt((1-a)*(1-a)+a*a); };
/* one stroke along points: o.w width, o.ink, o.taper (0..1), o.wob */
Pen.prototype.stroke=function(pts,o={}){ const c=this.c, P=resample(pts,1.2), n=P.length; if(n<2) return;
  const w0=o.w||this.w, wob=(o.wob===undefined?this.wob:o.wob*Math.min(2,this.wob/1.3)), s0=this.sd(), s1=this.sd(), tp=o.taper===undefined?1:o.taper;
  let dist=0; const L=[], R=[]; const tot=(n-1)*1.2;
  for(let i=0;i<n;i++){ if(i) dist+=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);
    const a=P[Math.max(i-1,0)], b=P[Math.min(i+1,n-1)]; let tx=b[0]-a[0], ty=b[1]-a[1]; const tl=Math.hypot(tx,ty)||1; tx/=tl; ty/=tl; const nx=-ty, ny=tx;
    const wv=wob*((this.nz(s0,dist/55)-0.5)*2+0.35*(this.nz(s0,500+dist/9)-0.5));
    const u=dist/Math.max(tot,1), head=Math.min(1,u*tot/6), tail=Math.min(1,(1-u)*tot/9);
    const press=(1-tp)+tp*(0.25+0.75*Math.min(head,1))*(0.35+0.65*Math.min(tail,1));
    const w=w0*press*(0.8+0.4*this.nz(s1,dist/14));
    const x=P[i][0]+nx*wv, y=P[i][1]+ny*wv; L.push([x+nx*w/2,y+ny*w/2]); R.push([x-nx*w/2,y-ny*w/2]); }
  c.beginPath(); c.moveTo(L[0][0],L[0][1]); for(let i=1;i<n;i++) c.lineTo(L[i][0],L[i][1]); for(let i=n-1;i>=0;i--) c.lineTo(R[i][0],R[i][1]); c.closePath();
  c.fillStyle=o.ink||this.ink; c.globalAlpha=o.a===undefined?1:o.a; c.fill(); c.globalAlpha=1; };
/* a stroke gone over (passes) times, each a bit off */
Pen.prototype.draw=function(pts,o={}){ const k=o.passes||this.passes; for(let p=0;p<k;p++){ const j=p?this.jit*1.2:0, dx=this.rnd(-j,j), dy=this.rnd(-j,j); this.stroke(pts.map(q=>[q[0]+dx,q[1]+dy]),Object.assign({},o,{a:p?(o.a===undefined?1:o.a)*0.7:o.a, w:(o.w||this.w)*(p?0.8:1)})); } };
/* a straight-ish line with overshoot and a slight bow */
Pen.prototype.line=function(x0,y0,x1,y1,o={}){ const d=Math.hypot(x1-x0,y1-y0)||1, ux=(x1-x0)/d, uy=(y1-y0)/d, K=this.overK, e0=this.rnd(0,(o.over===undefined?3:o.over)*K), e1=this.rnd(0,(o.over===undefined?4:o.over)*K), bow=this.rnd(-1,1)*d*(0.012+0.006*K);
  const a=[x0-ux*e0,y0-uy*e0], b=[x1+ux*e1,y1+uy*e1], m=[(a[0]+b[0])/2-uy*bow,(a[1]+b[1])/2+ux*bow], pts=[]; for(let i=0;i<=24;i++){ const t=i/24; pts.push([(1-t)*(1-t)*a[0]+2*(1-t)*t*m[0]+t*t*b[0],(1-t)*(1-t)*a[1]+2*(1-t)*t*m[1]+t*t*b[1]]); } this.draw(pts,o); };
/* a loop: with «open» it is left open or runs past its start as a spiral */
Pen.prototype.loop=function(cx,cy,rx,ry,o={}){ const op=this.open, a0=o.a0===undefined?this.rnd(-2.6,-1.6):o.a0, sw=o.sweep||Math.PI*2+this.rnd(0.25-1.3*op,0.6-0.7*op), rot=o.rot||0, s=this.sd(), pts=[];
  for(let i=0;i<=60;i++){ const t=a0+sw*i/60, k=1+0.07*(this.nz(s,i/9)-0.5)*2+(0.04+0.1*op)*i/60, x=Math.cos(t)*rx*k, y=Math.sin(t)*ry*k; pts.push([cx+x*Math.cos(rot)-y*Math.sin(rot),cy+x*Math.sin(rot)+y*Math.cos(rot)]); } this.draw(pts,o); };
/* loose hand hatching between a top and a bottom polyline (same length): quick flicks, irregular spacing, ends not kept exactly;
   with cross — a second, sparser layer the other way */
Pen.prototype.band=function(top,bot,o={}){ const n=top.length, layers=this.cross&&!o.single?2:1;
  for(let Lr=0;Lr<layers;Lr++){ const sp=(o.sp||4.5)*this.hs*(Lr?1.4:1), sh=(o.shift||4)*(Lr?-1:1); let acc=0;
  for(let i=1;i<n;i++){ acc+=Math.hypot(top[i][0]-top[i-1][0],top[i][1]-top[i-1][1]); if(acc<sp*this.rnd(0.7,1.3)) continue; acc=0;
    const j=Math.min(n-1,Math.max(0,i+Math.round(sh*this.rnd(0.7,1.3)))), a=top[i], b=bot[j], k0=this.rnd(-0.08,0.12)*this.overK, k1=1-this.rnd(-0.12,0.22)*this.overK;
    const A=[a[0]+(b[0]-a[0])*k0,a[1]+(b[1]-a[1])*k0], B=[a[0]+(b[0]-a[0])*k1,a[1]+(b[1]-a[1])*k1];
    this.stroke([A,[(A[0]+B[0])/2+this.rnd(-0.4,0.4),(A[1]+B[1])/2],B],{w:(o.w||this.w*0.55)*this.rnd(0.8,1.25),a:(o.a||0.8)*this.rnd(0.75,1)*(Lr?0.75:1),wob:0.25,ink:o.ink}); } } };
/* ── single-stroke handwriting: glyphs in a box 1 tall (baseline at 1), polylines ── */
function arc(cx,cy,rx,ry,a0,a1,n=18){ const p=[]; for(let i=0;i<=n;i++){ const t=(a0+(a1-a0)*i/n)*Math.PI/180; p.push([cx+rx*Math.cos(t),cy+ry*Math.sin(t)]); } return p; }
const GL={
 '0':{w:.6,s:[arc(.3,.5,.28,.5,-100,275,30)]},
 '1':{w:.42,s:[[[.06,.22],[.3,0],[.31,1]]]},
 '2':{w:.6,s:[arc(.3,.27,.27,.26,195,390,16).concat([[.03,1],[.62,.99]])]},
 '3':{w:.58,s:[arc(.28,.25,.25,.24,205,445,16).concat(arc(.28,.73,.29,.27,-95,160,16))]},
 '4':{w:.62,s:[[[.46,1],[.46,0],[.0,.68],[.64,.68]]]},
 '5':{w:.6,s:[[[.55,.01],[.12,0],[.07,.44]].concat(arc(.3,.69,.28,.3,-125,150,16))]},
 '6':{w:.6,s:[[[.5,0],[.26,.2],[.09,.48]].concat(arc(.31,.73,.26,.26,180,540,22))]},
 '7':{w:.58,s:[[[.0,.03],[.58,0],[.2,1]]]},
 '8':{w:.6,s:[arc(.3,.25,.22,.24,90,450,20).concat(arc(.3,.74,.28,.26,-90,270,22))]},
 '9':{w:.6,s:[arc(.3,.28,.26,.27,0,375,22).concat([[.56,.32],[.48,1]])]},
 '×':{w:.5,s:[[[.05,.45],[.42,.95]],[[.42,.45],[.05,.95]]]},
 ',':{w:.22,s:[[[.1,.88],[.12,1],[.02,1.15]]]},
 '.':{w:.2,s:[[[.08,.96],[.1,1]]]},
 ' ':{w:.3,s:[]},
 'o':{w:.48,s:[arc(.23,.73,.21,.27,-80,300,20)]},
 'a':{w:.52,s:[arc(.24,.73,.21,.27,-20,330,20),[[.45,.47],[.48,1]]]},
 's':{w:.44,s:[[[.4,.5],[.2,.45],[.05,.56],[.18,.7],[.37,.8],[.35,.95],[.14,1],[.0,.92]]]},
 'n':{w:.5,s:[[[.05,.46],[.05,1],[.05,.64],[.15,.49],[.31,.46],[.41,.6],[.42,1]]]},
 'r':{w:.38,s:[[[.05,.46],[.05,1],[.05,.66],[.16,.5],[.36,.47]]]},
 'i':{w:.2,s:[[[.07,.49],[.08,1]],[[.08,.29],[.09,.31]]]},
 'd':{w:.52,s:[arc(.23,.73,.2,.26,-10,350,20),[[.45,0],[.46,1]]]},
 'p':{w:.5,s:[[[.05,.47],[.05,1.32]],arc(.26,.72,.21,.25,185,545,20)]},
 'x':{w:.44,s:[[[.0,.48],[.4,1]],[[.4,.48],[.0,1]]]},
 '+':{w:.5,s:[[[.03,.62],[.47,.6]],[[.25,.38],[.24,.86]]]},
};
Pen.prototype.text=function(str,x,y,size,o={}){ let cx=x; const al=o.align||'left'; let tw=0; for(const ch of str) tw+=((GL[ch]||GL[' ']).w+0.1)*size*0.95; if(al==='right') cx=x-tw; else if(al==='center') cx=x-tw/2;
  for(const ch of str){ const g=GL[ch]||GL[' '], dy=this.rnd(-0.03,0.03)*size, sk=this.rnd(-0.06,0.02), sz=size*this.rnd(0.94,1.05);
    g.s.forEach(st=>{ if(st.length===2&&Math.hypot(st[1][0]-st[0][0],st[1][1]-st[0][1])<0.05){ this.stroke([[cx+st[0][0]*sz,y-sz+st[0][1]*sz+dy],[cx+st[1][0]*sz+1.2,y-sz+st[1][1]*sz+dy+1.2]],Object.assign({taper:0.3},o)); return; }
      this.stroke(st.map(p=>[cx+p[0]*sz+(1-p[1])*sz*sk,y-sz+p[1]*sz+dy]),Object.assign({w:(o.w||this.w)},o)); });
    cx+=(g.w+0.1)*size*0.95; } return cx; };

/* ── paper: warm sketchbook, soft grain, a few fibers, darker towards the edges ── */
function paper(ctx,W,H,dpr,o={}){ const r=mulberry(o.seed||3); ctx.fillStyle=o.base||'#f6f1e6'; ctx.fillRect(0,0,W,H);
  for(let i=0;i<24;i++){ const x=r()*W, y=r()*H, R=60+r()*240, g=ctx.createRadialGradient(x,y,0,x,y,R), d=r()<0.5; g.addColorStop(0,d?'rgba(170,140,95,0.012)':'rgba(255,255,250,0.05)'); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=g; ctx.fillRect(x-R,y-R,2*R,2*R); }
  ctx.lineCap='round'; for(let i=0;i<420;i++){ const x=r()*W, y=r()*H, a=r()*6.28, l=3+r()*12; ctx.strokeStyle=`rgba(${r()<0.5?'120,100,70':'255,255,255'},${0.05+r()*0.07})`; ctx.lineWidth=0.4+r()*0.4; ctx.beginPath(); ctx.moveTo(x,y); ctx.quadraticCurveTo(x+Math.cos(a)*l/2+r()*3,y+Math.sin(a)*l/2+r()*3,x+Math.cos(a)*l,y+Math.sin(a)*l); ctx.stroke(); }
  const v=ctx.createRadialGradient(W/2,H/2,H*0.35,W/2,H/2,W*0.62); v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(1,'rgba(120,92,55,0.10)'); ctx.fillStyle=v; ctx.fillRect(0,0,W,H);
  const id=ctx.getImageData(0,0,W*dpr,H*dpr), d=id.data; for(let i=0;i<d.length;i+=4){ const n=(r()-0.5)*9+(r()<0.003?-14:0); d[i]+=n; d[i+1]+=n; d[i+2]+=n*0.9; } ctx.putImageData(id,0,0); }
/* the ink layer laid on the paper: multiply, and (for a ballpoint) the paper's tooth showing through */
function lay(ctx,layer,W,H,o={}){ if(o.dry){ const l=layer.getContext('2d'), r=mulberry(9); l.save(); l.setTransform(1,0,0,1,0,0); l.globalCompositeOperation='destination-out'; for(let i=0;i<o.dry;i++){ l.fillStyle=`rgba(0,0,0,${0.25+r()*0.5})`; l.fillRect(r()*layer.width,r()*layer.height,1+r()*1.5,1); } l.restore(); }
  ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.globalCompositeOperation='multiply'; ctx.globalAlpha=o.alpha||1; ctx.drawImage(layer,0,0); ctx.restore(); }
/* a loose watercolour wash over a polygon: smooth wobbly edge, a few thin layers, a darker rim where the water dried, a little granulation */
function washPoly(ctx,poly,col,o={}){ const r=mulberry(o.seed||Math.floor(poly[0][0]*7+poly[0][1]*13)), a=o.a||0.14, amp=o.amp||4;
  const P=resample(poly.concat([poly[0]]),3); ctx.save(); ctx.globalCompositeOperation='multiply';
  for(let L=0;L<3;L++){ const s1=r()*99, s2=r()*99; ctx.beginPath(); P.forEach((p,i)=>{ const x=p[0]+amp*(noise(s1+i/14)-0.5)*2, y=p[1]+amp*(noise(s2+i/14)-0.5)*2; i?ctx.lineTo(x,y):ctx.moveTo(x,y); }); ctx.closePath();
    ctx.filter='blur(0.7px)'; ctx.fillStyle=col.replace('A',String(a*(L?0.6:1))); ctx.fill(); ctx.filter='none';
    if(L===0){ ctx.strokeStyle=col.replace('A',String(a*1.5)); ctx.lineWidth=1.3; ctx.stroke(); ctx.save(); ctx.clip(); for(let i=0;i<(o.grain||250);i++){ const q=P[Math.floor(r()*P.length)], c=[P.reduce((s,v)=>s+v[0],0)/P.length,P.reduce((s,v)=>s+v[1],0)/P.length], k=r(); ctx.fillStyle=col.replace('A',String(a*0.9)); ctx.fillRect(c[0]+(q[0]-c[0])*k+(r()-0.5)*6,c[1]+(q[1]-c[1])*k+(r()-0.5)*6,0.8,0.8); } ctx.restore(); } }
  ctx.restore(); }
function wash(ctx,cx,cy,rx,ry,col,o={}){ const poly=[]; for(let i=0;i<48;i++){ const t=i/48*Math.PI*2; poly.push([cx+Math.cos(t)*rx,cy+Math.sin(t)*ry]); } washPoly(ctx,poly,col,Object.assign({amp:Math.min(rx,ry)*0.18},o)); }
return {Pen:Pen,paper:paper,lay:lay,wash:wash,washPoly:washPoly,mulberry:mulberry,noise:noise};
})();

/* the look Den picked: fineliner, «грубо» (thick, shaky, gone over twice, loops left open), no redraws */
var PGS_ST={ink:'#121116',accent:'#d2432f',w:2.3,wob:2.2,overK:5/3,open:0.5,passes:2,jit:1.8,hs:1/0.6,cross:false};
var PGS={key:'',bg:null,pl:null,hist:[],hid:0,hb:null,tLast:null,tgt:[null,null],tKey:''};
function pgsPen(c,seed){ return new Sk.Pen(c,{seed:seed,tick:0,ink:PGS_ST.ink,w:PGS_ST.w,wob:PGS_ST.wob,overK:PGS_ST.overK,open:PGS_ST.open,passes:PGS_ST.passes,jit:PGS_ST.jit,hs:PGS_ST.hs,cross:PGS_ST.cross}); }
/* a doodled player: feet at (x,y) in field units (the screen is 390 tall), facing d; pose ready | low (racket down, waiting) | swing | run */
function pgsPlayer(p,x,y,d,pose,o){ o=o||{}; var X=function(v){ return x+d*v; }, k=o.k||1.15, st=o.step||0, hx=X(0), hy=y-47*k;
  p.loop(hx,hy,7*k,7.5*k,{w:p.w*1.05});
  if(o.hair) p.draw([[X(-6),hy-3],[X(-3),hy-8],[X(2),hy-8.5],[X(6),hy-4]],{w:p.w*0.9});
  if(o.cap) p.draw([[X(-6.5),hy-2],[X(-2),hy-7.5],[X(5),hy-6],[X(12),hy-4]],{w:p.w*1.1});
  p.draw([[X(0.5),y-39*k],[X(1.5),y-29*k],[X(1),y-19*k]]);
  var legs=pose==='swing'?[[-4,-10,-8,-1],[6,-9,10,-1]]:pose==='run'?(st?[[-6,-9,-12,-2],[5,-10,7,-1]]:[[-2,-10,-3,-1],[7,-8,12,-3]]):pose==='low'?[[-5,-9,-9,-1],[8,-10,9,-1]]:[[-5,-11,-6,-1],[7,-11,7,-1]];
  legs.forEach(function(l){ p.draw([[X(1),y-19*k],[X(l[0]),y+l[1]*k],[X(l[2]),y+l[3]*k]]); });
  if(pose==='swing'){ p.draw([[X(0.5),y-35*k],[X(8),y-42*k],[X(11),y-52*k]]); p.draw([[X(0.5),y-35*k],[X(-7),y-31*k],[X(-11),y-35*k]]);
    p.line(X(11),y-52*k,X(14),y-60*k,{over:1}); p.loop(X(16.5),y-68*k,5*k,8*k,{rot:d*0.3}); }
  else if(pose==='low'){ p.draw([[X(0.5),y-35*k],[X(9),y-25*k],[X(14),y-16*k]]); p.draw([[X(0.5),y-35*k],[X(-7),y-29*k],[X(-10),y-23*k]]);
    p.line(X(14),y-16*k,X(19),y-11*k,{over:1}); p.loop(X(24),y-6*k,5*k,8*k,{rot:d*1.0}); }
  else if(pose!=='hold'){ p.draw([[X(0.5),y-35*k],[X(8),y-30*k],[X(13),y-34*k]]); p.draw([[X(0.5),y-35*k],[X(-6),y-28*k],[X(-8),y-22*k]]);
    p.line(X(13),y-34*k,X(17),y-41*k,{over:1}); p.loop(X(19.5),y-48.5*k,5*k,8*k,{rot:d*0.5}); }
  if(pose!=='run'){ p.line(X(legs[0][2]-3),y-1*k,X(legs[0][2]+3),y-1*k,{over:1,w:p.w*0.9}); p.line(X(legs[1][2]),y-1*k,X(legs[1][2]+6),y-1*k,{over:1,w:p.w*0.9}); } }
/* the shuttlecock, cork first along angle a */
function pgsShuttle(p,x,y,a,o){ o=o||{}; var c=Math.cos(a), s=Math.sin(a), R=function(u,v){ return [x+u*c-v*s,y+u*s+v*c]; }, k=o.k||1;
  var r0=R(0,0); p.loop(r0[0],r0[1],3.3*k,3.3*k,{ink:o.cork,w:p.w*1.0});
  var a1=R(-3*k,-2.4*k), b1=R(-15*k,-7*k), a2=R(-3*k,2.4*k), b2=R(-15*k,7*k); p.line(a1[0],a1[1],b1[0],b1[1],{over:1}); p.line(a2[0],a2[1],b2[0],b2[1],{over:1});
  p.draw([R(-15*k,-7*k),R(-16.5*k,-2*k),R(-16.5*k,3*k),R(-15*k,7*k)]); }
/* a racket as a plank: its top (the real bouncing surface) in two overlapping strokes, a loosely hatched belly */
function pgsPlatform(p,top){ var n=top.length, m=Math.floor(n*p.rnd(0.42,0.58));
  p.draw(top.slice(0,Math.min(n,m+3)),{w:p.w*1.4}); p.draw(top.slice(Math.max(0,m-3)),{w:p.w*1.4});
  var bot=top.map(function(q,j){ return [q[0],q[1]+13*(0.6+0.4*Math.sin(Math.PI*j/(n-1)))]; });
  p.draw(bot.filter(function(v,j){ return j%2===0; }),{w:p.w*0.75,a:0.85}); p.band(top,bot,{sp:4.2,shift:-3,w:p.w*0.55});
  p.line(top[0][0],top[0][1],bot[0][0],bot[0][1],{over:2,w:p.w*0.85}); p.line(top[n-1][0],top[n-1][1],bot[n-1][0],bot[n-1][1],{over:2,w:p.w*0.85}); }
/* 1.59r: a doodled player whose racket meets a given point: feet at (fx,fy), facing d, the racket's face centred at (cx,cy) and tilted by
   ang (the bounce's slope). Higher than he can reach — he jumps; a racket low — he crouches */
function pgsReach(p,fx,fy,d,cx,cy,ang,o){ o=o||{}; var k=1.15, dh=fy-cy, jump=Math.max(0,dh-80), crouch=Math.max(0,Math.min(10,22-dh)), y=fy-jump+crouch*0.6, X=function(v){ return fx+d*v; };
  var hy=y-47*k, sx=X(1), sy=y-35*k;
  p.loop(X(0),hy,7*k,7.5*k,{w:p.w*1.05});
  if(o.hair) p.draw([[X(-6),hy-3],[X(-3),hy-8],[X(2),hy-8.5],[X(6),hy-4]],{w:p.w*0.9});
  if(o.cap) p.draw([[X(-6.5),hy-2],[X(-2),hy-7.5],[X(5),hy-6],[X(12),hy-4]],{w:p.w*1.1});
  p.draw([[X(0.5),y-39*k],[X(1.5),y-29*k],[X(1),y-19*k]]);
  var legs=jump>0?[[-6,-12,-3,-4],[6,-12,9,-6]]:o.moving?(o.step?[[-6,-9,-12,-2],[5,-10,7,-1]]:[[-2,-10,-3,-1],[7,-8,12,-3]]):crouch>4?[[-6,-8,-9,-1],[8,-8,9,-1]]:[[-5,-11,-6,-1],[7,-11,7,-1]];
  legs.forEach(function(l){ p.draw([[X(1),y-19*k],[X(l[0]),y+l[1]*k],[X(l[2]),y+l[3]*k]]); });
  if(!jump&&!o.moving){ p.line(X(legs[0][2]-3),y-1*k,X(legs[0][2]+3),y-1*k,{over:1,w:p.w*0.9}); p.line(X(legs[1][2]),y-1*k,X(legs[1][2]+6),y-1*k,{over:1,w:p.w*0.9}); }
  if(o.far&&o.moving){ p.stroke([[X(-14),y-30],[X(-26),y-31]],{w:p.w*0.5}); p.stroke([[X(-12),y-20],[X(-22),y-20]],{w:p.w*0.5}); }
  /* the racket: an oval whose far end is at the point, along the line to the shoulder; the handle on to the hand, the arm to the handle */
  var ux=sx-cx, uy=sy-cy, ul=Math.hypot(ux,uy)||1; ux/=ul; uy/=ul;
  var hc=[cx+ux*8.5,cy+uy*8.5], rot=Math.atan2(uy,ux)+Math.PI/2; p.loop(hc[0],hc[1],5.5,8.5,{rot:rot,w:p.w*0.95});
  var he=[cx+ux*17,cy+uy*17], arm=26*k, hd=[he[0]+ux*9,he[1]+uy*9], ad=Math.hypot(hd[0]-sx,hd[1]-sy);
  if(ad>arm){ hd=[sx-ux*arm,sy-uy*arm]; } p.line(he[0],he[1],hd[0],hd[1],{over:1,w:p.w*0.9});
  var mx=(sx+hd[0])/2, my=(sy+hd[1])/2, bend=Math.min(6,Math.max(0,(arm-Math.hypot(hd[0]-sx,hd[1]-sy))*0.4)); p.draw([[sx,sy],[mx-uy*bend*d,my+ux*bend*d],hd]);
  p.draw([[X(0.5),sy],[X(-7),sy+(jump?-8:7)],[X(-10),sy+(jump?-14:13)]]);
  if(o.hit){ p.stroke([[cx-d*4,cy-12],[cx+d*8,cy-16]],{w:p.w*0.5}); p.stroke([[cx-d*2,cy-7],[cx+d*12,cy-9]],{w:p.w*0.5}); } }
/* 1.59t: «пожарные с тентом» (Ден 23:37–23:42: тент — Л1, подъёмники-«ножницы»). Двое на подъёмниках держат тент за концы, руки — там,
   где ладонь (ARC.py); полотно — там, где оно по физике (с мягкостью отстаёт от рук, видно по натянутым лямкам). Подъёмники стоят на земле
   и раздвигаются, при сужении подъезжают друг к другу */
function pgsLift(p,x,top,gy,w){ var n=Math.max(1,Math.round((gy-12-top)/26)), h=(gy-12-top)/n, i;
  p.draw([[x-w/2-4,gy],[x+w/2+4,gy]],{w:p.w*1.1}); p.draw([[x-w/2,gy],[x-w/2,gy-12],[x+w/2,gy-12],[x+w/2,gy]]); p.loop(x-w/2+6,gy+1,3,3,{w:p.w*0.8}); p.loop(x+w/2-6,gy+1,3,3,{w:p.w*0.8});
  for(i=0;i<n;i++){ var y0=gy-12-i*h, y1=y0-h; p.line(x-w/2,y0,x+w/2,y1,{over:1,w:p.w*0.75}); p.line(x+w/2,y0,x-w/2,y1,{over:1,w:p.w*0.75}); }
  p.draw([[x-w/2-3,top],[x+w/2+3,top]],{w:p.w*1.2}); p.draw([[x-w/2-3,top],[x-w/2-3,top-11],[x+w/2+3,top-11],[x+w/2+3,top]],{w:p.w*0.55,a:0.8}); }
function pgsTent(c,i,tp,xc,hw,ar,A,hand,t){ var F=function(v){ return v*390; }, d=i?-1:1, n=tp.length, p=pgsPen(c,231+100*i), GY=Math.min(386,F(1)-4);
  p.draw(tp,{w:p.w*1.3}); var low=tp.map(function(q,j){ return [q[0],q[1]+5+5*Math.sin(Math.PI*j/(n-1))]; }); p.draw(low,{w:p.w*0.65,a:0.8});
  for(var j=6;j<n-5;j+=7) p.stroke([tp[j],[tp[j][0]+d*3,low[j][1]+3]],{w:p.w*0.33});
  [0,n-1].forEach(function(e,k){ var x=xc+(e?1:-1)*hw, hy=F(pgSurf(i,x,hand,ar,A).y), hx=tp[e][0], s=k?1:-1;   /* s: −1 the left end, +1 the right */
    var fx=hx+s*9, deck=hy+60, pf=pgsPen(c,241+100*i+10*k); pgsLift(pgsPen(c,251+100*i+10*k),fx,deck,GY,30);
    if(Math.abs(hy-tp[e][1])>1.5) pf.line(hx,hy,tp[e][0],tp[e][1],{over:0.5,w:pf.w*0.6});   /* a strap: the cloth lags behind the hands */
    pf.loop(hx,tp[e][1],2.5,2.5,{w:pf.w*0.7});
    var kk=ARC.kick&&ARC.kick[i], hit=kk&&t-kk.t0<0.25, jy=hit?-3:0;
    pgsPlayer(pf,fx,deck+jy,-s,'hold',{k:1.0});
    /* his arms go up to the corner: redraw them over the doodle's ready arms */
    var sx=fx-s*0.5, sy=deck+jy-35; pf.draw([[sx,sy],[(sx+hx)/2-s*2,(sy+hy)/2+2],[hx,hy]],{w:pf.w*0.95}); pf.draw([[sx,sy],[(sx+hx)/2+s*3,(sy+hy)/2+5],[hx+s*3,hy+3]],{w:pf.w*0.9});
    var hb=deck+jy-47; pf.draw([[fx+s*8,hb-1],[fx+s*6,hb-9],[fx-s*3,hb-11],[fx-s*8,hb-5],[fx-s*13,hb-3]],{w:pf.w*1.05});   /* the helmet */
  }); }
/* 1.59u (Ден 00:43–00:47: «берём «для вида» и дорабатываем.. на доске должна быть жизнь»; раскадровка 1–4): удар человечка читается
   как удар. Позы — суставы в долях роста (смотрит вправо): подход — присел, ракетка внизу сзади; касание — ракетка плашмя на доске прямо
   под воланом (доска и ракетка бьют в одной точке и в одно время); после удара — взмах по силе: слабый — кистью до пояса, сильный —
   снизу через голову, на носках, с дугами. Отскок по-прежнему от доски — это только рисунок */
var PGS_POSE={
 ready:{head:[0,-47],neck:[0.5,-39],hip:[1,-19],kneeL:[-5,-11],footL:[-6,-1],kneeR:[7,-11],footR:[7,-1],elbowL:[-6,-28],handL:[-8,-22],elbowR:[8,-30],handR:[13,-34],rk:-1.0},
 crouch:{head:[2,-41],neck:[2,-33],hip:[-2,-15],kneeL:[6,-9],footL:[4,-1],kneeR:[-8,-8],footR:[-10,-1],elbowL:[9,-27],handL:[14,-30],elbowR:[-4,-24],handR:[-12,-16],rk:2.98},
 contact:{head:[4,-38],neck:[4,-30],hip:[-2,-14],kneeL:[7,-8],footL:[5,-1],kneeR:[-8,-7],footR:[-10,-1],elbowL:[-6,-24],handL:[-12,-18],elbowR:[14,-17],handR:[24,-8],rk:-0.06},
 flick:{head:[2,-46],neck:[2,-38],hip:[1,-19],kneeL:[-5,-11],footL:[-6,-1],kneeR:[7,-11],footR:[7,-1],elbowL:[-6,-28],handL:[-10,-22],elbowR:[12,-26],handR:[20,-26],rk:-0.5},
 big:{head:[3,-52],neck:[3,-44],hip:[2,-24],kneeL:[-3,-14],footL:[-5,-2],kneeR:[8,-14],footR:[9,-3],elbowL:[-8,-36],handL:[-14,-44],elbowR:[9,-58],handR:[6,-70],rk:-2.0},
 runA:{head:[6,-46],neck:[5,-38],hip:[1,-19],kneeL:[9,-12],footL:[15,-6],kneeR:[-6,-9],footR:[-12,-1],elbowL:[-6,-32],handL:[-12,-26],elbowR:[12,-28],handR:[18,-34],rk:-0.9},
 runB:{head:[6,-46],neck:[5,-38],hip:[1,-19],kneeL:[-6,-9],footL:[-12,-1],kneeR:[9,-12],footR:[15,-6],elbowL:[-6,-32],handL:[-12,-26],elbowR:[12,-28],handR:[18,-34],rk:-0.9},
 dive:{head:[28,-18],neck:[20,-17],hip:[1,-15],kneeL:[-11,-12],footL:[-22,-7],kneeR:[-9,-19],footR:[-20,-22],elbowL:[14,-25],handL:[8,-30],elbowR:[33,-13],handR:[44,-9],rk:0.1},
 sit:{head:[2,-31],neck:[1.5,-23],hip:[0,-4],kneeL:[11,-13],footL:[20,-2],kneeR:[13,-10],footR:[23,0],elbowL:[-8,-15],handL:[-12,-5],elbowR:[10,-20],handR:[15,-14],rk:0.4},
 joy:{head:[0,-58],neck:[0,-50],hip:[1,-30],kneeL:[-5,-22],footL:[-8,-14],kneeR:[7,-22],footR:[9,-14],elbowL:[-10,-60],handL:[-14,-70],elbowR:[10,-60],handR:[12,-70],rk:-1.4},
 duck:{head:[2,-36],neck:[1,-28],hip:[-1,-14],kneeL:[6,-8],footL:[5,-1],kneeR:[-7,-7],footR:[-9,-1],elbowL:[-6,-40],handL:[-1,-44],elbowR:[9,-40],handR:[4,-44],rk:-2.4}};
/* 1.59v: little drawn things — a feather (lying or gliding), a star, a puff of dust */
function pgsFeather(p,x,y,a,k){ var ca=Math.cos(a), sa=Math.sin(a), R=function(u,v){ return [x+u*ca-v*sa,y+u*sa+v*ca]; }; p.draw([R(-9*k,0),R(9*k,0)],{w:p.w*0.6});
  for(var t=-7;t<=6;t+=3.2){ p.stroke([R(t*k,0),R((t+3)*k,-3*k)],{w:p.w*0.35}); p.stroke([R(t*k,0),R((t+3)*k,3*k)],{w:p.w*0.35}); } }
function pgsStar(p,x,y,r){ p.stroke([[x-r,y],[x+r,y]],{w:p.w*0.55}); p.stroke([[x,y-r],[x,y+r]],{w:p.w*0.55}); }
var PGS_REACH=49;   /* from the feet to the racket's head in the «contact» pose, in figure units */
function pgsMix(a,b,u){ u=Math.max(0,Math.min(1,u)); var o={}; for(var k in a){ if(k==='rk') o.rk=a.rk+(b.rk-a.rk)*u; else o[k]=[a[k][0]+(b[k][0]-a[k][0])*u,a[k][1]+(b[k][1]-a[k][1])*u]; } return o; }
function pgsFig(p,x,y,d,J,o){ o=o||{}; var k=o.k||1.15, P=function(q){ return [x+d*q[0]*k,y+q[1]*k]; }, h=P(J.head);
  p.loop(h[0],h[1],7*k,7.5*k,{w:p.w*1.05});
  if(o.hair) p.draw([[h[0]-d*6,h[1]-3],[h[0]-d*3,h[1]-8],[h[0]+d*2,h[1]-8.5],[h[0]+d*6,h[1]-4]],{w:p.w*0.9});
  if(o.cap) p.draw([[h[0]-d*6.5,h[1]-2],[h[0]-d*2,h[1]-7.5],[h[0]+d*5,h[1]-6],[h[0]+d*12,h[1]-4]],{w:p.w*1.1});
  p.draw([P(J.neck),P(J.hip)]); p.draw([P(J.hip),P(J.kneeL),P(J.footL)]); p.draw([P(J.hip),P(J.kneeR),P(J.footR)]);
  p.draw([P(J.neck),P(J.elbowL),P(J.handL)]); p.draw([P(J.neck),P(J.elbowR),P(J.handR)]);
  var fl=P(J.footL), fr=P(J.footR); if(fl[1]>y-4*k) p.line(fl[0]-d*3,fl[1],fl[0]+d*5,fl[1],{over:1,w:p.w*0.9}); if(fr[1]>y-4*k) p.line(fr[0]-d*3,fr[1],fr[0]+d*5,fr[1],{over:1,w:p.w*0.9});
  var a=d>0?J.rk:Math.PI-J.rk, ca=Math.cos(a), sa=Math.sin(a), hd=P(J.handR), he=[hd[0]+ca*12*k,hd[1]+sa*12*k], hc=[hd[0]+ca*21.5*k,hd[1]+sa*21.5*k];
  p.line(hd[0],hd[1],he[0],he[1],{over:1}); p.loop(hc[0],hc[1],9.5*k,5.5*k,{rot:a,w:p.w});
  if(o.shake){ p.stroke([[h[0]-12*k,h[1]-6*k],[h[0]-16*k,h[1]-2*k]],{w:p.w*0.45}); p.stroke([[h[0]+12*k,h[1]-6*k],[h[0]+16*k,h[1]-2*k]],{w:p.w*0.45}); }
  if(o.stars){ pgsStar(p,h[0]-10*k,h[1]-14*k,3*k); pgsStar(p,h[0]+4*k,h[1]-18*k,3*k); pgsStar(p,h[0]+14*k,h[1]-12*k,3*k); }
  if(o.arcs){ var sh=P(J.neck), r=40*k; [0,1].forEach(function(j){ var pts=[], a0=d>0?0.7:Math.PI-0.7, a1=d>0?-1.8:Math.PI+1.8; for(var m=0;m<=14;m++){ var aa=a0+(a1-a0)*m/14; pts.push([sh[0]+Math.cos(aa)*(r+j*9),sh[1]+Math.sin(aa)*(r+j*9)]); } p.stroke(pts,{w:p.w*(j?0.35:0.5),a:0.75}); }); }
  return hc; }
function pgSketch(c,W,H,dpr){ var U=H/390, ar=W/H, FW=ar*390, F=function(v){ return v*390; }, I=PGS_ST;
  /* the page: paper and the ceiling, kept until the screen changes size */
  var key=W+'x'+H; if(PGS.key!==key){ PGS.key=key; var bg=document.createElement('canvas'); bg.width=W; bg.height=H; var bc=bg.getContext('2d'); bc.scale(dpr,dpr); Sk.paper(bc,W/dpr,H/dpr,dpr,{seed:7});
    var L=document.createElement('canvas'); L.width=W; L.height=H; var lc=L.getContext('2d'); lc.setTransform(U,0,0,U,0,0); var p0=pgsPen(lc,101), CE=F(JG_TOP);
    p0.line(6,CE+1,FW*0.52,CE-1,{w:p0.w*1.25,over:6}); p0.line(FW*0.48,CE-1.5,FW-6,CE+1.5,{w:p0.w*1.25,over:6});
    var tp=[], bt=[]; for(var x=0;x<=FW;x+=2){ tp.push([x,CE-0.5]); bt.push([x,CE-8-6*Sk.noise(x/40)-p0.rnd(0,3)]); } p0.band(tp,bt,{sp:6,shift:4,w:p0.w*0.5,a:0.7});
    Sk.lay(bc,L,0,0,{alpha:1}); PGS.bg=bg; }
  c.setTransform(1,0,0,1,0,0); c.drawImage(PGS.bg,0,0); c.setTransform(U,0,0,U,0,0); c.globalCompositeOperation='multiply';
  var hw=pgHw(ar), A=PG_V.curve>=0.5?pgCupA():Math.tan(PG_TILTV*Math.PI/180)*hw, hand=ARC.py, py=ARC.padSoft!==null&&ARC.padSoft!==undefined?ARC.padSoft:ARC.py, t=ARC.t||0, dt=PGS.tLast===null?0:Math.max(0,Math.min(0.1,t-PGS.tLast)); PGS.tLast=t;
  /* the field's edges and the net, if the rules have them */
  var fl=ar*(1-PG_V.fw)/2, fr=ar*(1+PG_V.fw)/2, pe=pgsPen(c,151);
  if(PG_V.wall>=0.5){ pe.line(F(fl),F(JG_TOP)+4,F(fl)+1,386); pe.line(F(fr),F(JG_TOP)+4,F(fr)-1,386); }
  var nt=ARC.netTop===undefined?PG_NET0:ARC.netTop; if(nt<0.97){ pe.line(F(ar/2),F(nt),F(ar/2)+1,392,{w:pe.w*1.2}); pe.line(F(ar/2)-6,F(nt),F(ar/2)+6,F(nt)-1); }
  /* 1.59r (Ден 22:00: «половина движения ладони — на платформу, половина — на ракетку в руках человечка, и чтобы волан отскакивал от
     ракетки»; 22:02: «посмотрел бы на все три варианта»). Под ладонью не меняется ничего: точка, о которую бьётся волан, ходит ровно как
     ракетка до сих пор (pgSurf при ARC.py). Меняется только рисунок — где стоит платформа и сколько добирает рука:
     А — платформа идёт за ладонью на часть хода (ползунок «доля руки»), остальное — рука; Б — плавное движение ладони ведёт платформу
     (сглаживание — ползунок), резкое уходит в замах; В — платформа стоит внизу, человечек тянется и прыгает. Ракетка в руке встаёт ровно
     в точку удара и наклонена так, как уходит отскок */
  var who=Math.round(PG_V.who||0), REST=0.92, OFF0=30/390, plat=py;
  if(who===1) plat=REST+(1-(PG_V.share===undefined?0.5:PG_V.share))*(py-REST)+OFF0;
  else if(who===2){ var tau=PG_V.stau===undefined?0.3:PG_V.stau; PGS.slow=(PGS.slow===undefined||PGS.slow===null)?py:PGS.slow+(py-PGS.slow)*(1-Math.exp(-dt/Math.max(0.02,tau))); plat=PGS.slow+OFF0; }
  else if(who===3) plat=REST+OFF0;
  if(who) plat=Math.max(py+5/390,Math.min(who===3?9:py+105/390,plat));
  if(who===4) plat=py;
  var tops=[0,1].map(function(i){ var xc=ar*(i?1-PG_XC:PG_XC), tp=[]; for(var j=0;j<=48;j++){ var x=xc-hw+2*hw*j/48; tp.push([F(x),F(pgSurf(i,x,plat,ar,A).y)]); } if(who===4) pgsTent(c,i,tp,xc,hw,ar,A,hand,t); else pgsPlatform(pgsPen(c,201+100*i),tp); return {xc:xc,tp:tp}; });
  /* 1.59v (Ден 01:01–01:02: «больше жизни на доске и в воздухе — глаз в основном смотрит на волан.. но зритель геймплея будет смотреть на
     всё»): события игры (удар, потолок, потерянный мяч, сужение) оживляют и волан, и доски, и человечков. Всё — только рисунок */
  var LF=PGS.life; if(!LF||t<LF.lastT-0.5){ LF=PGS.life={ceils:ARC.ceils||0,falls:ARC.falls||0,nk:ARC.narrowK||1,kt:[null,null],fx:[],feathers:[],act:[null,null],flipT:-9,hitA:0.5,spinT:-9,prevVy:0,hang:-9,lastT:t}; }
  LF.lastT=t; var b00=(ARC.balls||[])[0], rnd=function(a,b){ return a+(b-a)*Math.random(); };
  var setAct=function(i,kind,dur){ LF.act[i]={kind:kind,t0:t,dur:dur}; };
  if((ARC.ceils||0)>LF.ceils){ LF.ceils=ARC.ceils; LF.spinT=t; if(b00){ var nAir=LF.fx.filter(function(f){ return f.k==='feather'; }).length; for(var f1=0;f1<Math.min(2,4-nAir);f1++) LF.fx.push({k:'feather',x:F(b00.x)+rnd(-10,10),y:F(b00.y),vx:rnd(-30,30),vy:rnd(5,25),t:0,life:6,a:rnd(0,6),glide:true}); for(var f2=0;f2<4;f2++) LF.fx.push({k:'star',x:F(b00.x)+rnd(-22,22),y:F(b00.y)+rnd(-6,18),vx:0,vy:0,t:0,life:0.6}); } setAct(0,'duck',0.6); setAct(1,'duck',0.6); }
  if((ARC.falls||0)>LF.falls){ LF.falls=ARC.falls; var lx=PGS.hist.length?PGS.hist[PGS.hist.length-1][0]:ar/2, mi=PGS.tgt[0]!==null?0:PGS.tgt[1]!==null?1:(lx<ar/2?0:1); setAct(mi,'sit',1.3); setAct(1-mi,'shake',1.2); }
  if((ARC.narrowK||1)<LF.nk-1e-6){ LF.nk=ARC.narrowK; tops.forEach(function(tp0,i){ [0,tp0.tp.length-1].forEach(function(e){ var q0=tp0.tp[e]; LF.fx.push({k:'piece',x:q0[0]+(e?8:-8),y:q0[1]+6,vx:(e?1:-1)*rnd(10,40),vy:-rnd(20,60),t:0,life:2.5,a:0,spin:(e?1:-1)*rnd(2,5),len:rnd(16,26)}); }); }); }
  [0,1].forEach(function(i){ var kq=ARC.kick&&ARC.kick[i]; if(kq&&kq.t0!==LF.kt[i]){ LF.kt[i]=kq.t0; LF.flipT=t; LF.hitA=kq.a; if(kq.a>0.95&&b00&&Math.random()<0.3&&!LF.fx.some(function(f){ return f.k==='feather'; })) LF.fx.push({k:'feather',x:F(b00.x),y:F(b00.y),vx:rnd(-20,20),vy:-rnd(30,60),t:0,life:12,a:rnd(0,6),glide:true}); } });
  if(b00&&!(b00.wait>0)){ if(LF.prevVy<0&&b00.vy>=0&&!b00.touched&&b00.y<0.22){ LF.hang=t; if(b00.from===0||b00.from===1) setAct(b00.from,'joy',0.7); } LF.prevVy=b00.vy; }
  /* the particles: feathers glide down and stay on a plank, stars blink, dust puffs, sawn-off bits of plank fall */
  var pfx=pgsPen(c,881); LF.fx.forEach(function(f){ f.t+=dt;
    if(f.k==='feather'&&f.glide){ f.vy=Math.min(f.vy+70*dt,f.y>F(0.75)?120:55); f.x+=(f.vx+Math.sin(f.t*3.2)*26)*dt; f.y+=f.vy*dt; f.a=Math.sin(f.t*3.2)*0.6;
      for(var pi=0;pi<2;pi++){ var xc0=ar*(pi?1-PG_XC:PG_XC); if(Math.abs(f.x/390-xc0)<=hw){ var yy=F(pgSurf(pi,f.x/390,plat,ar,A).y); if(f.y>=yy-2){ LF.feathers.push({i:pi,u:(f.x/390-xc0),a:rnd(-0.2,0.2)}); if(LF.feathers.length>14) LF.feathers.shift(); f.t=f.life; } } } }
    else if(f.k==='piece'||f.k==='fall'){ f.vy+=700*dt; f.x+=f.vx*dt; f.y+=f.vy*dt; f.a+=(f.spin||0)*dt; }
    else if(f.k==='dust'){ f.x+=f.vx*dt; f.y+=f.vy*dt; } });
  LF.fx=LF.fx.filter(function(f){ return f.t<f.life&&f.y<420; });
  LF.feathers=LF.feathers.filter(function(fe){ var xc0=ar*(fe.i?1-PG_XC:PG_XC); if(Math.abs(fe.u)>hw){ LF.fx.push({k:'fall',x:F(xc0+fe.u),y:F(pgSurf(fe.i,xc0+Math.sign(fe.u)*hw,plat,ar,A).y),vx:0,vy:0,t:0,life:2,a:fe.a,spin:3,feather:true}); return false; } return true; });
  LF.feathers.forEach(function(fe,j){ var xc0=ar*(fe.i?1-PG_XC:PG_XC), x=xc0+fe.u; pgsFeather(pgsPen(c,890+j),F(x),F(pgSurf(fe.i,x,plat,ar,A).y)-2,fe.a,1); });
  LF.fx.forEach(function(f,j){ var al=Math.max(0,1-f.t/f.life);
    if(f.k==='feather'||(f.k==='fall'&&f.feather)) pgsFeather(pgsPen(c,900+j),f.x,f.y,f.a,1);
    else if(f.k==='star'){ if(Math.floor(f.t*12)%2===0) pgsStar(pfx,f.x,f.y,4); }
    else if(f.k==='dust') pfx.loop(f.x,f.y,2+f.t*8,1.5+f.t*5,{w:pfx.w*0.35,a:al});
    else if(f.k==='piece'||f.k==='fall'){ var pc=pgsPen(c,950+j), ca=Math.cos(f.a), sa=Math.sin(f.a), L=f.len||20; var R=function(u,v){ return [f.x+u*ca-v*sa,f.y+u*sa+v*ca]; }; pc.draw([R(-L/2,-5),R(L/2,-5),R(L/2,5),R(-L/2,5),R(-L/2,-5)],{w:pc.w*0.8}); pc.stroke([R(-L/2+3,0),R(L/2-3,1)],{w:pc.w*0.3}); } });
  /* the players: the one the ball is coming to runs to where it will land; «как был» — stands just behind it, racket low, a hit — a swing;
     А/Б/В — stands so that his racket meets the shuttle there */
  if(!PGS.pl) PGS.pl=[{x:ar*PG_XC},{x:ar*(1-PG_XC)}];
  var noRun=who===4;
  var b0=(ARC.balls||[])[0], tk=b0?(b0.from===null||b0.from===undefined?'s':b0.from)+':'+(b0.vy>0?1:0)+':'+PGS.hid:'none';
  /* 1.59r (Ден 22:12: «когда ускоряется темп — человечки часто не успевают добежать.. поднимаешь платформу, чтобы войти в траекторию, —
     и отбиваешь платформой»): куда упадёт волан — пересчёт каждый кадр, пока он летит вниз (ракетка-то ходит за ладонью), и бег — не с
     постоянной скоростью, а догоняя: чем дальше, тем быстрее (выпад) */
  if(tk!==PGS.tKey){ PGS.tKey=tk; PGS.tgt=[null,null]; }
  if(b0&&b0.vy>0&&!(b0.wait>0)&&!b0.hold&&!b0.on){ var Pt=pgMeatPath(b0,py,ar); if(Pt){ PGS.tgt[Pt.i]=Pt.P[0]; PGS.tgt[1-Pt.i]=null; } }
  var REACH=26/390, Ap=Math.tan(PG_TILT*Math.PI/180)*hw;
  if(!noRun) [0,1].forEach(function(i){ var P=PGS.pl[i], d=i?-1:1, xc=tops[i].xc, lo=xc-hw+0.02, hi=xc+hw-0.02, off=who?REACH:PGS_REACH*1.15/390;
    /* where to stand: just behind where the shuttle lands; if that is off the plank (it lands near the far edge) — just in front, the racket
       on the other side (backhand) */
    if(P.side===undefined) P.side=d; var want=xc-P.side*(who?REACH:0); if(!who&&PGS.tgt[i]===null) P.side=d;
    if(PGS.tgt[i]!==null){ var L=PGS.tgt[i], sb=L-d*off; P.side=(sb>=lo&&sb<=hi)?d:-d; want=L-P.side*off; }
    var tx=Math.max(lo,Math.min(hi,want));
    P.x=Math.max(lo,Math.min(hi,P.x)); var dx=tx-P.x, far=Math.abs(dx)>0.08, v=Math.sign(dx)*Math.min(Math.abs(dx),Math.max(2*dt,Math.abs(dx)*(1-Math.exp(-dt/0.06)))); P.x+=v; var moving=Math.abs(dx)>0.004;
    var kk=ARC.kick&&ARC.kick[i], hit=kk&&t-kk.t0<0.3, fy=F(pgSurf(i,P.x,plat,ar,A).y);
    if(!who){ var fc=P.side, R0=PGS_REACH*1.15/390, bb=b0&&!(b0.wait>0)?b0:null, riding=bb&&bb.on&&bb.onI===i, tc=null;
      if(riding){ P.x=Math.max(lo,Math.min(hi,bb.x-fc*R0)); fy=F(pgSurf(i,P.x,plat,ar,A).y); }
      if(bb&&PGS.tgt[i]!==null&&bb.vy>0){ var sY=pgSurf(i,Math.max(xc-hw,Math.min(xc+hw,bb.x)),py,ar,A).y; tc=Math.max(0,(sY-bb.r-bb.y)/Math.max(0.05,bb.vy)); }
      var PP=PGS_POSE, J=moving?(Math.floor(t*9)%2?PP.runA:PP.runB):PP.ready, arcs=false, extra={};
      if(moving&&Math.random()<dt*(far?22:9)) LF.fx.push({k:'dust',x:F(P.x)-fc*8,y:fy-3,vx:-fc*rnd(10,30),vy:-rnd(4,14),t:0,life:0.5});
      var lunge=moving&&far&&tc!==null&&tc<0.28; if(lunge){ J=PP.dive; pgsPen(c,960+i).stroke([[F(P.x)-fc*30,fy-20],[F(P.x)-fc*62,fy-20]],{w:I.w*0.4}); pgsPen(c,962+i).stroke([[F(P.x)-fc*28,fy-32],[F(P.x)-fc*54,fy-33]],{w:I.w*0.4}); }
      var act=LF.act[i]; if(act&&t-act.t0>act.dur) act=LF.act[i]=null;
      if(act&&!(kk&&t-kk.t0<0.3)&&!riding){ var ua=(t-act.t0)/act.dur, inout=Math.min(1,Math.min(ua,1-ua)*6); if(act.kind==='sit'){ J=pgsMix(J,PP.sit,Math.min(1,ua*6)); extra.stars=ua>0.15; } else if(act.kind==='joy'){ J=pgsMix(J,PP.joy,inout); } else if(act.kind==='duck'){ J=pgsMix(J,PP.duck,inout); } else if(act.kind==='shake'){ J=pgsMix(J,PP.ready,1); J.head=[J.head[0]+Math.sin((t-act.t0)*22)*2.2,J.head[1]]; extra.shake=true; } }
      if(kk&&t-kk.t0<0.45){ var u=t-kk.t0, fol=pgsMix(PP.flick,PP.big,(kk.a-0.45)/0.45); J=u<0.12?pgsMix(PP.contact,fol,u/0.12):u<0.3?fol:pgsMix(fol,PP.ready,(u-0.3)/0.15); arcs=kk.a>0.6&&u<0.3; }
      else if(riding||(tc!==null&&tc<0.1)) J=riding?PP.contact:pgsMix(PP.crouch,PP.contact,(0.1-tc)/0.1);
      else if(tc!==null&&tc<0.5) J=pgsMix(J,PP.crouch,(0.5-tc)/0.4);
      if(J===PP.joy||(act&&act.kind==='joy')) fy-=6*Math.sin(Math.min(1,(t-(act?act.t0:t))/0.7)*Math.PI);
      pgsFig(pgsPen(c,301+10*i),F(P.x),fy,fc,J,{hair:!i,cap:!!i,arcs:arcs,shake:extra.shake,stars:extra.stars}); return; }
    var xr=Math.max(xc-hw,Math.min(xc+hw,P.x+P.side*REACH));
    /* the last moment: the shuttle close above this plank (or riding it) — the racket reaches for it, so they always meet */
    var bm=b0&&!(b0.wait>0)?b0:null; if(bm&&(PGS.tgt[i]!==null||(bm.on&&bm.onI===i))&&Math.abs(bm.x-xc)<=hw+0.05){ var gap=pgSurf(i,Math.max(xc-hw,Math.min(xc+hw,bm.x)),py,ar,A).y-bm.y, wv=Math.max(0,Math.min(1,1-gap/0.14)); xr=Math.max(xc-hw,Math.min(xc+hw,xr+(bm.x-xr)*wv)); }
    var S=pgSurf(i,xr,py,ar,A), sl=S.s*Ap/hw*S.f;
    pgsReach(pgsPen(c,301+10*i),F(P.x),fy,d,F(xr),F(S.y),Math.atan(sl),{hair:!i,cap:!!i,moving:moving,far:far,hit:hit,step:Math.floor(t*9)%2}); });
  /* the shuttle and its dashed trail (since the last hit) */
  (ARC.balls||[]).forEach(function(b,bi){ if(bi===0){ var hk=(b.from===null||b.from===undefined?'s':b.from)+':'+(b.wait>0?'w':'f'); if(hk!==PGS.hb){ PGS.hb=hk; PGS.hid++; PGS.hist=[]; }
      var last=PGS.hist[PGS.hist.length-1]; if(!(b.wait>0)&&(!last||Math.hypot(b.x-last[0],b.y-last[1])>0.002)) PGS.hist.push([b.x,b.y]); }
    if(b.wait>0&&Math.floor(b.wait*6)%2) return;
    var sp=Math.hypot(b.vx||0,b.vy||0), a=sp>0.05?Math.atan2(b.vy,b.vx):Math.PI/2, k=F(b.r)/8.5;
    var LFb=PGS.life||{flipT:-9,spinT:-9,hang:-9,hitA:0.5};
    /* 1.60d (Ден 10:06: «развороту волана при ударе не хватает промежуточных кадров — плавнее, без дёрганий»). Было: угол = направление
       полёта (скачком меняется в миг удара) + π·(1−u)² за 0,32 с — в первые кадры и скачок направления, и самый быстрый поворот. Теперь
       нарисованный угол — своё состояние: в миг удара запоминается, на сколько он отстаёт от нового направления, и это отставание
       убирается за 0,45 с плавно (медленно — быстро — медленно, без рывка в начале и в конце; не быстрее ~11° за кадр 60 Гц); в полёте угол
       догоняет направление мягко (за ~0,06 с), а не прыгает; кружение после потолка — один оборот, с ходу и плавно затихая, за 0,8 с */
    if(bi===0){ var SH=PGS.sh||(PGS.sh={ang:a,t:t,flip:-9,off:0,spin:-9}), dtS=Math.max(0,Math.min(0.1,t-SH.t)); SH.t=t;
      var wrap=function(v){ while(v>Math.PI) v-=2*Math.PI; while(v<-Math.PI) v+=2*Math.PI; return v; };
      if(LFb.flipT!==SH.flip){ SH.flip=LFb.flipT; var dir=(b.vx||0)>=0?-1:1, off=wrap(SH.ang-a); if(dir<0&&off>0.2) off-=2*Math.PI; if(dir>0&&off<-0.2) off+=2*Math.PI; if(Math.abs(off)>4) off=wrap(off); SH.off=off; }
      if(LFb.spinT!==SH.spin){ SH.spin=LFb.spinT; }
      var uf=(t-SH.flip)/0.45, aS;
      if(uf>=0&&uf<1){ var e=uf*uf*uf*(uf*(uf*6-15)+10); aS=a+SH.off*(1-e); }
      else { aS=SH.ang+wrap(a-SH.ang)*(1-Math.exp(-dtS/0.06)); }
      var us=(t-SH.spin)/0.8; var spin=us>=0&&us<1?2*Math.PI*(1-(1-us)*(1-us)*(1-us)):0;   /* ровно оборот — в конце без скачка */
      SH.ang=aS; a=aS+spin; }
    var jx=0, jy=0, nearC=bi===0&&!b.touched&&b.y-b.r<JG_TOP+0.035&&!(b.wait>0); if(nearC){ jx=Math.sin(t*61)*1.3; jy=Math.cos(t*53)*1.1; }
    var ca=Math.cos(a), sa=Math.sin(a), bx=F(b.x)+jx, by=F(b.y)+jy;
    if(nearC){ var pb=pgsPen(c,431); pb.stroke([[bx-16,by-10],[bx-21,by-15]],{w:I.w*0.4}); pb.stroke([[bx-16,by+10],[bx-21,by+15]],{w:I.w*0.4}); pb.stroke([[bx+16,by-10],[bx+21,by-15]],{w:I.w*0.4}); pb.stroke([[bx+16,by+10],[bx+21,by+15]],{w:I.w*0.4}); }
    if(bi===0&&t-LFb.hang<0.45&&Math.abs(b.vy||0)<0.5){ var ph2=pgsPen(c,433), rr=24+4*Math.sin(t*14); [[-2.6,-2.0],[-1.1,-0.5]].forEach(function(r2){ var pts2=[]; for(var m=0;m<=8;m++){ var aa=r2[0]+(r2[1]-r2[0])*m/8; pts2.push([bx+Math.cos(aa)*rr,by+Math.sin(aa)*rr]); } ph2.stroke(pts2,{w:I.w*0.35,a:0.8}); }); }
    /* 1.59w (Ден 01:33–01:38: «полосы, которые оставляет волан, отвлекают.. уменьшить, и пусть исчезают, когда он летит вниз» → вариант С3,
       «по точкам»): тающий пунктир — несколько точек сразу за юбкой, дальше — мельче; к вершине бледнеет, на спуске исчезает */
    if(bi===0&&PGS.hist.length>2&&!(b.wait>0)){ var fade=(b.vy||0)<=0?1:Math.max(0,1-(b.vy||0)/0.7); if(fade>0.02){ var hh=PGS.hist, acc=0, px0=bx, py0=by, tp=pgsPen(c,5000+PGS.hid), dots=[], d0=26*k/1.47, d1=95*k/1.47;
        for(var m=hh.length-1;m>=0&&acc<d1;m--){ var qx=F(hh[m][0]), qy=F(hh[m][1]); acc+=Math.hypot(qx-px0,qy-py0); px0=qx; py0=qy; if(acc>=d0) dots.push([qx,qy,acc]); }
        var step=Math.max(1,Math.round(dots.length/6)); for(var di=0;di<dots.length;di+=step){ var g=(dots[di][2]-d0)/(d1-d0), rr=Math.max(0.6,2.6-g*2.0); tp.loop(dots[di][0],dots[di][1],rr,rr,{w:I.w*0.45,a:0.9*fade*(1-g*0.8)}); } } }
    pgsShuttle(pgsPen(c,401+bi),bx+ca*8*k,by+sa*8*k,a,{cork:I.accent,k:k}); });
  /* the numbers, written by the same pen: score, multiplier, balls left, the series, the bar to the next narrowing */
  if(ARC.phase==='play'){ var rx=FW-F(0.05), ph=pgsPen(c,701); ph.text(String(ARC.score||0),rx,F(0.13),27,{align:'right',w:I.w*0.75});
    var mu=pgMultAll(); if(mu>1.05) pgsPen(c,702).text('×'+mu.toFixed(1).replace('.',','),rx,F(0.2),15,{align:'right',w:I.w*0.55,ink:I.accent});
    if(ARC.lastT>0) pgsPen(c,703).text('+'+ARC.lastPts,rx-F(0.16),F(0.2),15,{align:'right',w:I.w*0.55,a:Math.min(1,ARC.lastT/0.5)});
    if(PG_V.lives>0){ var hl=Math.max(0,PG_V.lives-(ARC.falls||0)); for(var h=0;h<hl;h++) pgsShuttle(pgsPen(c,720+h),rx-6-h*15,F(0.255)-4,-Math.PI/2,{k:0.6,cork:I.accent}); }
    var cb=Math.round(PG_V.combo), cap=cb===2?5:10, sr=Math.min(cap,ARC.series||0);
    if(cb){ for(var d8=0;d8<cap;d8++){ var dx8=rx-4-(cap-1-d8)*(cap>5?11:14), pd=pgsPen(c,740+d8); pd.loop(dx8,F(0.31),3,3,{w:I.w*0.38}); if(d8<sr) pd.draw([[dx8-2.5,F(0.31)+2],[dx8+2,F(0.31)-3],[dx8-1.5,F(0.31)+1],[dx8+2.5,F(0.31)-1]],{w:I.w*0.7,ink:I.accent}); } }
    var gm=Math.round(PG_V.grow), T9=pgTime(), P9=pgNarrowP(), fr9=null;
    if((gm===2&&ARC.t<4*P9)||gm===3) fr9=1-(ARC.t%P9)/P9; else if(gm===1&&(ARC.narrowK||1)>0.41) fr9=1-Math.min(10,ARC.clean||0)/10;
    if(fr9===null&&T9>0){ var st9=gm===2?4*P9:0; fr9=Math.max(0,(T9-ARC.t)/Math.max(1,T9-st9)); }
    if(fr9!==null){ var bx=FW-F(0.03), y0=F(0.38), y1=F(0.92), pb=pgsPen(c,760); pb.line(bx,y0,bx+1,y1,{over:2,w:I.w*0.45}); pb.line(bx+7,y0,bx+7,y1,{over:2,w:I.w*0.45}); pb.line(bx-1,y0,bx+8,y0,{over:1,w:I.w*0.4}); pb.line(bx-1,y1,bx+8,y1,{over:1,w:I.w*0.4});
      if(fr9>0.01){ var tl=[], bl=[]; for(var yy=y1-1;yy>=y1-(y1-y0)*fr9;yy-=1){ tl.push([bx+0.5,yy]); bl.push([bx+6.5,yy]); } if(tl.length>2) pb.band(tl,bl,{sp:2.8,shift:3,w:I.w*0.35,a:0.9,ink:I.accent,single:true}); } } }
  (ARC.pf||[]).forEach(function(p,i){ pgsPen(c,800+(p.pts%97)).text('+'+p.pts,F(p.x),F(p.y+0.06-0.05*(1-p.t)),24,{align:'center',w:I.w*0.65,ink:I.accent,a:Math.min(1,p.t/0.4)}); });
  c.globalCompositeOperation='source-over'; c.setTransform(1,0,0,1,0,0);
  if(ARC.flash>0){ c.fillStyle='rgba(210,67,47,'+(0.5*ARC.flash)+')'; c.fillRect(0,0,W,H); } }
