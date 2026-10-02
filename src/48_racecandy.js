/* ── SONARACE: THE CANDY LAND REDRAWN (v1.20; the maintainer, 2 Oct: «переходим к редизайну конфетной гонки… надо сделать конфетную такой же
   красивой и детализированной», as the river; his yes to the three zones of the sketches «Пряничная деревня — Мармеладный лес — Мороженые
   горы», driven through one after another as the river's). Built as the river world (48_racepirate.js — its noise, tiles, shadows and the
   way the chunks are made are shared): the road is the race's, the zones change every RP_ZN chunks and blend over the last two.
   Each zone its own road: a chocolate bar with an icing kerb (the village), pulled caramel with a candy-cane kerb (the forest), a waffle with
   whipped-cream piping (the mountains); its own verge (off the road): cookie crumbs, granulated sugar, powdered sugar; its own land and
   things. The cars, the gifts and the effects are still the candy land's of 0.84 (the next sketches). ── */
var CW={tiles:{}}, CW_Z=['vil','for','mnt'];
var CW_RASP=[[222,112,156],[196,82,130],[170,60,108]];   // the village's raspberry glaze (the maintainer's «В — малиновая» of three pinks)
/* the land's tiles: per pixel, periodic (RP.T), made once — the dough with chocolate chips, the mint sugar grass, the vanilla ice cream */
var CW_TILE={
  dough:function(x,y){ var P=CW_RASP, n=rpF(x,y,5,5,4), n2=rpF(x+40,y+70,22,22,2), h=rpShade(x,y,5,0.03,4), col=rpMul(rpL3(P[0],P[1],n),h);   /* pink glaze (the maintainer: «землю сделаем розовым, а не коричневым») */
    if(n2>0.66) col=rpL3(col,P[2],rpCl((n2-0.66)*3,0,0.45));
    var q=rpH(Math.floor(x/3),Math.floor(y/3)); if(q>0.93){ var cx=Math.floor(x/3)*3+1.5, cy=Math.floor(y/3)*3+1.5, a=q*40, dx=x-cx, dy=y-cy, u=dx*Math.cos(a)+dy*Math.sin(a), v=-dx*Math.sin(a)+dy*Math.cos(a); if(Math.abs(u)<1.4&&Math.abs(v)<0.45) col=[[255,255,255],[86,200,245],[255,212,71],[122,214,107],[179,131,255]][Math.floor(q*1000)%5]; }   // sprinkles
    if(rpH(Math.floor(x*2),Math.floor(y*2))>0.994) col=[255,240,246]; return col; },
  mint:function(x,y){ var n=rpF(x,y,6,6,4), n2=rpF(x+20,y+50,30,30,2), h=rpShade(x,y,6,0.035,4), col=rpMul(rpL3([190,242,214],[140,212,178],n),h);
    var st=Math.sin(6.2832*(9*x+3*y)/RP.T+n*10)*0.5+0.5; col=rpL3(col,[120,196,160],st*0.12); if(n2>0.7) col=rpL3(col,[214,250,232],0.4);
    if(rpH(Math.floor(x*2),Math.floor(y*2))>0.99) col=[255,255,255]; return col; },
  vanilla:function(x,y){ var n=rpF(x,y,4,4,4), n2=rpF(x+30,y+60,10,10,3), h=rpShade(x,y,4,0.06,4), col=rpMul(rpL3([255,252,246],[240,228,210],n),h);
    if(h<0.97) col=rpL3(col,[226,206,190],rpCl((0.97-h)*3,0,0.4)); var sw=Math.sin(6.2832*(3*x+2*y)/RP.T+n2*9); if(sw>0.82) col=rpL3(col,[255,190,212],rpCl((sw-0.82)*4,0,0.55));   // strawberry ripple
    var q=rpH(Math.floor(x),Math.floor(y)); if(q>0.996) col=[[255,93,143],[86,200,245],[255,212,71],[122,214,107]][Math.floor(q*1e4)%4]; return col; } };
/* the tiles at the screen's own resolution (the maintainer: «увеличь детализацию»): res device px per L px, up to 3 */
function cwRes(){ return Math.min(3,Math.max(1,Math.ceil(hs*rKS()/2-0.05))); }
function cwTile(kind){ var res=cwRes(), key=kind+res, t=CW.tiles[key]; if(t) return t; var N=RP.T*res, cv=document.createElement('canvas'); cv.width=cv.height=N; var x=cv.getContext('2d'), im=x.createImageData(N,N), D=im.data, fn=CW_TILE[kind];
  for(var j=0;j<N;j++) for(var i=0;i<N;i++){ var col=fn(i/res,j/res), o=(j*N+i)*4; D[o]=col[0]; D[o+1]=col[1]; D[o+2]=col[2]; D[o+3]=255; } x.putImageData(im,0,0); return CW.tiles[key]={c:cv,res:res}; }
var CW_TILES=['dough','mint','vanilla'];
function cwWarm(){ var res=cwRes(); for(var i=0;i<CW_TILES.length;i++) if(!CW.tiles[CW_TILES[i]+res]){ cwTile(CW_TILES[i]); return; } }
/* the zones (as the river's): 12 chunks each, the last two blend into the next */
function cwZone(i){ return rpZone(i); }
/* a path along the road at a share f of the half-width (−1 … 1) plus off, the road's own frame (L px) */
function cwAlong(road,f,off){ var n=road.m.length, k; rx.beginPath(); for(k=0;k<n;k++) rx.lineTo((-4+k*2)*2,road.m[k]*2+f*road.w[k]*2+off); }
function cwBand(road,f0,o0,f1,o1){ var n=road.m.length, k; rx.beginPath(); for(k=0;k<n;k++) rx.lineTo((-4+k*2)*2,road.m[k]*2+f0*road.w[k]*2+o0); for(k=n-1;k>=0;k--) rx.lineTo((-4+k*2)*2,road.m[k]*2+f1*road.w[k]*2+o1); rx.closePath(); }
/* dashes along the road by x on the world's grid (period P, on D of it), so the chunks meet without a seam */
function cwDash(road,f,off,x0L,WL,P,D,col,lw){ var p0=-(((x0L%P)+P)%P), X, t; rx.strokeStyle=col; rx.lineWidth=lw; rx.lineCap='butt'; rx.beginPath();
  for(X=p0-P;X<WL+P;X+=P){ for(t=0;t<=D;t+=2){ var a=rpAt(road,X+t), y=a[0]+f*a[1]+off; if(t) rx.lineTo(X+t,y); else rx.moveTo(X+t,y); } } rx.stroke(); }
function cwSpr(x,y,c,len,a){ rx.save(); rx.translate(x,y); rx.rotate(a); rx.strokeStyle=c; rx.lineCap='round'; rx.lineWidth=2.6; rx.beginPath(); rx.moveTo(-len/2,0); rx.lineTo(len/2,0); rx.stroke(); rx.restore(); }
var CW_SPR=['#ff5d8f','#56c8f5','#ffd447','#7ad66b','#b383ff'];
/* ── the sweets of the land (L px around a point; the shadow falls down-right, as the river's) ── */
function cwHsl(h,s,l,a){ return a===undefined?'hsl('+h+','+s+'%,'+l+'%)':'hsla('+h+','+s+'%,'+l+'%,'+a+')'; }
function cwGumdrop(x,y,r,h){ rpSw(3,2,2,0.35); rpDisc(x,y,r,rpRg(x,y,r,cwHsl(h,90,82),cwHsl(h,80,45))); rpNos(); var q=rpSeed(x*7+y*3);
  for(var i=0;i<6;i++) rpDisc(x+(q()-0.5)*r*1.2,y+(q()-0.5)*r*1.2,0.7,'rgba(255,255,255,0.9)'); rpEll(x-r*0.35,y-r*0.4,r*0.3,r*0.18,-0.5,'rgba(255,255,255,0.7)'); }
function cwLolliTree(x,y,r,h){ rpSw(10,7,7,0.38); rpDisc(x,y,r,cwHsl(h,75,52)); rpNos(); rx.save(); rx.beginPath(); rx.arc(x,y,r,0,6.2832); rx.clip();
  rx.fillStyle=rpRg(x,y,r*1.2,cwHsl(h,90,88),cwHsl(h,75,52)); rx.fillRect(x-r,y-r,2*r,2*r);
  rx.lineWidth=r*0.3; rx.strokeStyle=cwHsl(h,85,96,0.85); rx.beginPath(); for(var a=0;a<14;a+=0.12){ var rr=r*a/14; rx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr); } rx.stroke(); rx.restore();
  rx.beginPath(); rx.arc(x,y,r,0,6.2832); rx.lineWidth=1.4; rx.strokeStyle=cwHsl(h,60,38,0.7); rx.stroke(); rpEll(x-r*0.35,y-r*0.42,r*0.28,r*0.16,-0.6,'rgba(255,255,255,0.75)'); }
function cwCupcake(x,y,r,h){ var i, k; rpSw(6,4,4,0.38); rpDisc(x,y,r*1.12,'#e9a0b8'); rpNos();
  for(i=0;i<20;i++){ var a=i/20*6.2832; rx.beginPath(); rx.moveTo(x,y); rx.arc(x,y,r*1.12,a,a+0.16); rx.fillStyle=i%2?'#e9a0b8':'#f7c6d5'; rx.fill(); }
  for(k=3;k>=1;k--){ var rr=r*k/3.2, o=(3-k)*0.6; rpDisc(x+o,y+o,rr+1.5,cwHsl(h,60,70)); rpDisc(x+o,y+o,rr,rpRg(x,y,rr,cwHsl(h,80,96),cwHsl(h,60,78))); }
  var q=rpSeed(x*3+y); for(i=0;i<10;i++) cwSpr(x+(q()-0.5)*r*1.4,y+(q()-0.5)*r*1.4,CW_SPR[i%4],3,q()*3);
  rpDisc(x+1,y-1,r*0.24,rpRg(x+1,y-1,r*0.24,'#ff8a8a','#c0102a')); rpEll(x,y-2,r*0.08,r*0.05,0,'rgba(255,255,255,0.9)'); }
function cwHouse(x,y,w,h,a){ var i, s; rx.save(); rx.translate(x,y); rx.rotate(a||0);
  rpSw(14,8,8,0.42); rx.fillStyle='#7e3f17'; rx.fillRect(-w/2,-h/2,w,h); rpNos();
  rx.fillStyle=rpRg(0,-h/4,w,'#d48a4c','#9c5524'); rx.fillRect(-w/2,-h/2,w,h/2); rx.fillStyle=rpRg(0,h/4,w,'#b8682f','#7e3f17'); rx.fillRect(-w/2,0,w,h/2);
  var q=rpSeed(x*5+y*7); for(i=0;i<w*h/40;i++) rpDisc((q()-0.5)*(w-4),(q()-0.5)*(h-4),0.7,'rgba(90,40,10,0.35)');
  rx.strokeStyle='#fffaf5'; rx.lineCap='round'; rx.lineWidth=3; rx.beginPath(); rx.moveTo(-w/2+2,0); rx.lineTo(w/2-2,0); rx.stroke();
  for(s=-1;s<=1;s+=2){ rx.lineWidth=2.2; rx.beginPath(); for(i=0;i<=w-6;i+=7){ rx.moveTo(-w/2+i,s*h/2); rx.arc(-w/2+i+3.5,s*h/2,3.5,Math.PI,0,s>0); } rx.stroke();
    rx.lineWidth=1.1; rx.strokeStyle='rgba(255,250,245,0.8)'; for(var rr=1;rr<3;rr++){ rx.beginPath(); for(i=3;i<w-6;i+=9){ rx.moveTo(-w/2+i,s*h/2*rr/3); rx.quadraticCurveTo(-w/2+i+4.5,s*(h/2*rr/3+3),-w/2+i+9,s*h/2*rr/3); } rx.stroke(); } rx.strokeStyle='#fffaf5'; }
  rx.lineWidth=2; rx.strokeRect(-w/2,-h/2,w,h);
  var hs4=[340,50,200,120]; for(i=0;i<4;i++) cwGumdrop(-w/2+w*(i+0.5)/4,0,3.2,hs4[i]);
  rx.fillStyle='#b44a3a'; rx.fillRect(w/4-5,-h/2+4,10,10); rx.strokeStyle='#fff'; rx.lineWidth=1.2; rx.strokeRect(w/4-5,-h/2+4,10,10);
  for(i=0;i<4;i++) rpDisc(w/4+i*6+4,-h/2-3-i*5,2.6+i*1.1,'rgba(255,240,250,'+(0.7-i*0.14)+')'); rx.restore(); }
function cwFence(x0,y0,x1,y1){ var n=Math.max(2,Math.round(Math.hypot(x1-x0,y1-y0)/13)), i; rx.lineCap='round';
  rx.lineWidth=3.4; rx.strokeStyle='#f6eee6'; rx.beginPath(); rx.moveTo(x0,y0); rx.lineTo(x1,y1); rx.stroke(); rx.setLineDash([4,4]); rx.strokeStyle='#e0263a'; rx.stroke(); rx.setLineDash([]);
  for(i=0;i<=n;i++){ var X=x0+(x1-x0)*i/n, Y=y0+(y1-y0)*i/n; rpSw(3,2,2,0.35); rpDisc(X,Y,3.6,'#fff'); rpNos(); rx.beginPath(); rx.arc(X,Y,3.6,0,3.1416); rx.fillStyle='#e0263a'; rx.fill(); rpDisc(X-1.1,Y-1.1,1.1,'rgba(255,255,255,0.9)'); } }
function cwPig(x,y,s,a){ rx.save(); rx.translate(x,y); rx.rotate(a); rx.scale(s,s); rpSw(3,2,2,0.3); rpEll(0,0,7,5,0,'#f08aa5'); rpNos();
  rpEll(0,0,7,5,0,rpRg(0,0,7,'#ffd6df','#f08aa5')); rpDisc(7,0,3.4,'#f7a3ba'); rpEll(8.6,0,1.6,2,0,'#e47292'); rpDisc(8.3,-0.6,0.4,'#7a2a3a'); rpDisc(8.3,0.6,0.4,'#7a2a3a');
  rpEll(5,-3.4,1.6,1,0.6,'#e47292'); rpEll(5,3.4,1.6,1,-0.6,'#e47292'); rpDisc(5.8,-1.6,0.6,'#222'); rpDisc(5.8,1.6,0.6,'#222'); rx.strokeStyle='#e47292'; rx.lineWidth=0.8; rx.beginPath(); rx.arc(-8,0,1.6,0,4.5); rx.stroke(); rx.restore(); }
function cwCookie(x,y,r){ rpSw(5,3,3,0.38); rpDisc(x,y,r,'#c88a48'); rpNos(); rpDisc(x,y,r,rpRg(x,y,r,'#f0c27c','#c0823e')); var q=rpSeed(x*11+y);
  for(var i=0;i<7;i++) rpEll(x+(q()-0.5)*r*1.3,y+(q()-0.5)*r*1.3,r*0.13,r*0.1,q()*3,'#5a2c12'); rpEll(x-r*0.3,y-r*0.35,r*0.3,r*0.15,-0.5,'rgba(255,255,255,0.3)'); }
function cwLamp(x,y,h){ rpEll(x+5,y+4,4,2,0,'rgba(60,20,40,0.25)'); rpSw(4,3,3,0.35); rpDisc(x,y,5.4,'#fff'); rpNos(); rx.save(); rx.beginPath(); rx.arc(x,y,5.4,0,6.2832); rx.clip();
  rx.lineWidth=2.2; rx.strokeStyle=cwHsl(h,80,60); rx.beginPath(); for(var a=0;a<12;a+=0.2){ var rr=5.4*a/12; rx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr); } rx.stroke(); rx.restore();
  var g=rx.createRadialGradient(x,y,2,x,y,16); g.addColorStop(0,'rgba(255,240,200,0.35)'); g.addColorStop(1,'rgba(255,240,200,0)'); rx.fillStyle=g; rx.beginPath(); rx.arc(x,y,16,0,6.2832); rx.fill(); }
function cwCotton(x,y,r,h){ var q=rpSeed(x*13+y*5), k; rpSw(14,9,8,0.36); rpDisc(x+2,y+2,r,cwHsl(h,70,72)); rpNos();
  for(k=0;k<9;k++){ var a=k/9*6.2832+(q()-0.5)*0.4, d=r*(0.35+q()*0.27), px=x+Math.cos(a)*d, py=y+Math.sin(a)*d; rpDisc(px,py,r*(0.42+q()*0.13),rpRg(px,py,r*0.55,cwHsl(h,90,93),cwHsl(h,70,72))); }
  rpDisc(x,y,r*0.6,rpRg(x,y,r*0.6,cwHsl(h,95,96),cwHsl(h,75,80))); for(k=0;k<18;k++){ var b=q()*6.2832, e=q()*r*0.9; rpDisc(x+Math.cos(b)*e,y+Math.sin(b)*e,0.5+q()*0.8,cwHsl(h,90,98,0.8)); } }
function cwBear(x,y,s,a,h){ rx.save(); rx.translate(x,y); rx.rotate(a); rx.scale(s,s); rx.globalAlpha=0.93; var c0=cwHsl(h,95,72), c1=cwHsl(h,90,45);
  rpSw(4,2,3,0.3); rpEll(0,1.5,5,6,0,c1); rpNos(); rpEll(0,1.5,5,6,0,rpRg(0,1.5,6,c0,c1)); rpDisc(0,-6,4,rpRg(0,-6,4,c0,c1)); rpDisc(-3,-9,1.7,c1); rpDisc(3,-9,1.7,c1);
  rpEll(-5,0,1.8,2.6,0.5,c1); rpEll(5,0,1.8,2.6,-0.5,c1); rpEll(-3,7,2.2,2,0,c1); rpEll(3,7,2.2,2,0,c1); rpEll(-1.5,-1,1.5,3,0.2,'rgba(255,255,255,0.45)'); rpDisc(-1.4,-7,0.9,'rgba(255,255,255,0.7)'); rx.restore(); }
function cwBean(x,y,a,h){ rx.save(); rx.translate(x,y); rx.rotate(a); rpSw(2,1.5,1.5,0.3); rpEll(0,0,4.6,2.8,0,cwHsl(h,85,45)); rpNos(); rpEll(0,0,4.6,2.8,0,rpRg(0,0,4.6,cwHsl(h,95,75),cwHsl(h,85,45))); rpEll(-1.2,-1,1.8,0.8,0,'rgba(255,255,255,0.7)'); rx.restore(); }
function cwBeans(x,y){ var q=rpSeed(x*3+y*11), H=[0,40,60,120,200,300]; for(var j=0;j<6;j++) cwBean(x+(q()-0.5)*26,y+(q()-0.5)*16,q()*3,H[j]); }
function cwLicorice(x,y,len,a){ rx.save(); rx.translate(x,y); rx.rotate(a); rpSw(4,3,3,0.35); rx.fillStyle='#14060c'; rx.fillRect(-len/2,-4.5,len,9); rpNos();
  rx.fillStyle=rpLg(0,-4.5,0,4.5,['#5a2238','#2a0d1a','#14060c']); rx.fillRect(-len/2,-4.5,len,9); rx.strokeStyle='rgba(255,255,255,0.18)'; rx.lineWidth=1; rx.beginPath();
  for(var i=-len/2;i<len/2;i+=4){ rx.moveTo(i,-4.5); rx.lineTo(i+3,4.5); } rx.stroke(); rpDisc(len/2,0,4.5,'#3a1426'); rpDisc(len/2,0,1.8,'#e24a8b'); rx.restore(); }
function cwMush(x,y,r){ rpSw(3,2,2,0.3); rpDisc(x,y,r,'#e8b98f'); rpNos(); rpDisc(x,y,r,rpRg(x,y,r,'#fff6ef','#e8b98f')); rx.strokeStyle='rgba(190,130,80,0.5)'; rx.lineWidth=0.8;
  for(var k=0;k<6;k++){ rx.beginPath(); rx.moveTo(x,y); rx.lineTo(x+Math.cos(k)*r*0.9,y+Math.sin(k)*r*0.9); rx.stroke(); } rpDisc(x,y,r*0.25,'#f3d2b0'); var q=rpSeed(x+y*9); for(var i=0;i<3;i++) rpDisc(x+(q()-0.5)*r,y+(q()-0.5)*r,r*0.14,'#ff6f9a'); }
function cwMushes(x,y){ var q=rpSeed(x*5+y); for(var j=0;j<3;j++) cwMush(x+(q()-0.5)*16,y+(q()-0.5)*12,5+q()*3.5); }
function cwTruffle(x,y,r){ rpSw(4,3,3,0.38); rpDisc(x,y,r,'#3a1a0c'); rpNos(); rpDisc(x,y,r,rpRg(x,y,r,'#8a4a24','#2a1206')); var q=rpSeed(x*7+y); for(var i=0;i<12;i++) rpDisc(x+(q()-0.5)*r*1.4,y+(q()-0.5)*r*1.4,0.7,'rgba(240,200,160,0.7)'); }
function cwFlower(x,y,h){ for(var k=0;k<5;k++){ var a=k*1.2566; rpDisc(x+Math.cos(a)*2.6,y+Math.sin(a)*2.6,2,cwHsl(h,90,75)); } rpDisc(x,y,1.6,'#ffd447'); }
function cwScoop(x,y,r,c,top){ var i, k, q=rpSeed(x*17+y*3); rpSw(18,12,10,0.36); rpDisc(x,y,r,cwHsl(c[0],c[1],c[2]-14)); rpNos();
  for(k=0;k<16;k++){ var a=k/16*6.2832+0.2, d=r*(0.94+q()*0.08); rpEll(x+Math.cos(a)*d,y+Math.sin(a)*d,r*0.12,r*(0.09+q()*0.08),a+1.57,cwHsl(c[0],c[1],c[2]-8)); }
  rpDisc(x,y,r*0.97,rpRg(x,y,r,cwHsl(c[0],c[1],Math.min(97,c[2]+14)),cwHsl(c[0],c[1]+5,c[2]-12)));
  for(i=0;i<12;i++){ var b=q()*6.2832, e=q()*r*0.8; rpEll(x+Math.cos(b)*e,y+Math.sin(b)*e,1.5+q()*2.5,0.6+q()*0.6,q()*3,cwHsl(c[0],c[1],c[2]-12,0.5)); }
  if(top==='cherry'){ rpSw(3,2,2,0.35); rpDisc(x-r*0.15,y-r*0.15,r*0.17,'#a00a20'); rpNos(); rpDisc(x-r*0.15,y-r*0.15,r*0.17,rpRg(x-r*0.15,y-r*0.15,r*0.17,'#ff7a7a','#a00a20')); rpEll(x-r*0.2,y-r*0.22,r*0.05,r*0.03,0,'#fff');
    rx.strokeStyle='#5a7a2a'; rx.lineWidth=1.2; rx.beginPath(); rx.moveTo(x-r*0.15,y-r*0.3); rx.quadraticCurveTo(x,y-r*0.45,x+r*0.12,y-r*0.42); rx.stroke(); }
  if(top==='choc'){ rx.strokeStyle='#5a2c14'; rx.lineWidth=3; rx.lineCap='round'; rx.beginPath(); for(var t=0;t<12;t+=0.2){ var rr=r*0.7*(1-t/14); rx.lineTo(x+Math.cos(t*1.3)*rr*(0.6+0.4*Math.sin(t*3)),y+Math.sin(t*1.3)*rr*0.8); } rx.stroke(); }
  if(top==='spr') for(i=0;i<22;i++) cwSpr(x+(q()-0.5)*r*1.3,y+(q()-0.5)*r*1.3,CW_SPR[i%5],4,q()*3);
  rpEll(x-r*0.38,y-r*0.45,r*0.28,r*0.14,-0.6,'rgba(255,255,255,0.55)'); }
function cwCone(x,y,s,a){ rx.save(); rx.translate(x,y); rx.rotate(a); rx.scale(s,s); rpSw(5,4,4,0.35); rx.beginPath(); rx.moveTo(-14,-8); rx.lineTo(14,0); rx.lineTo(-14,8); rx.closePath(); rx.fillStyle='#b97a35'; rx.fill(); rpNos();
  rx.fillStyle=rpLg(0,-8,0,8,['#f2c37a','#b97a35']); rx.fill(); rx.save(); rx.clip(); rx.strokeStyle='rgba(120,70,20,0.6)'; rx.lineWidth=0.8; rx.beginPath();
  for(var i=-30;i<30;i+=4){ rx.moveTo(i,-10); rx.lineTo(i+16,10); rx.moveTo(i,10); rx.lineTo(i+16,-10); } rx.stroke(); rx.restore();
  rpDisc(-15,0,8.5,rpRg(-15,0,8.5,'#fff2f6','#f39ab6')); rx.restore(); }
function cwSnowman(x,y){ rpSw(5,3,4,0.3); rpDisc(x,y,8,'#e8e0e8'); rpNos(); rpDisc(x,y,8,rpRg(x,y,8,'#ffffff','#e2d8e2')); rpDisc(x+6,y-5,5.5,rpRg(x+6,y-5,5.5,'#ffffff','#e2d8e2'));
  rpDisc(x+7,y-6,0.8,'#2a1a10'); rpDisc(x+5,y-7,0.8,'#2a1a10'); rpEll(x+8.6,y-4,2,0.9,0.4,'#ff8a2a'); rx.strokeStyle='#e0263a'; rx.lineWidth=2; rx.beginPath(); rx.moveTo(x+2,y-1); rx.lineTo(x+4,y-2); rx.stroke(); }
function cwCherries(x,y){ rpSw(3,2,2,0.35); rpDisc(x,y,4,'#a00a20'); rpDisc(x+7,y+2,4,'#a00a20'); rpNos(); rpDisc(x,y,4,rpRg(x,y,4,'#ff7a7a','#a00a20')); rpDisc(x+7,y+2,4,rpRg(x+7,y+2,4,'#ff7a7a','#a00a20'));
  rx.strokeStyle='#4a6a22'; rx.lineWidth=1; rx.beginPath(); rx.moveTo(x,y-3); rx.quadraticCurveTo(x+4,y-10,x+6,y-11); rx.moveTo(x+7,y-1); rx.lineTo(x+6,y-11); rx.stroke(); }
function cwPopsicle(x,y,a,h){ rx.save(); rx.translate(x,y); rx.rotate(a); rpSw(4,3,3,0.35); rx.fillStyle=cwHsl(h,80,60); rx.beginPath(); rx.roundRect(-6,-10,12,16,[6,6,2,2]); rx.fill(); rpNos();
  rx.fillStyle=rpLg(-6,0,6,0,[cwHsl(h,85,78),cwHsl(h,80,58)]); rx.beginPath(); rx.roundRect(-6,-10,12,16,[6,6,2,2]); rx.fill(); rx.fillStyle='#e8c88a'; rx.fillRect(-1.6,6,3.2,9); rpEll(-2.5,-5,1.4,3.5,0,'rgba(255,255,255,0.5)'); rx.restore(); }
/* the zones' sets: [draw(x,y,s,r), radius, [s from, to], weight] (as RP_SET) */
var CW_SET={
  vil:[[function(x,y,s,r){ cwHouse(x,y,58+16*s,40+10*s,(r()-0.5)*0.4); },44,[0,1],1.1],[function(x,y,s,r){ cwLolliTree(x,y,14+8*s,[340,200,50,280,120][Math.floor(r()*5)]); },20,[0,1],3.2],
    [function(x,y,s,r){ cwCupcake(x,y,13+5*s,[330,200,40][Math.floor(r()*3)]); },18,[0,1],1.4],[function(x,y,s,r){ var H=[340,50,200,120,280]; for(var j=0;j<4;j++) cwGumdrop(x+(r()-0.5)*20,y+(r()-0.5)*14,3.6+r()*1.6,H[j]); },13,[1,1],1.2],
    [function(x,y,s,r){ var a=(r()-0.5)*0.6, L=30+20*s; cwFence(x-Math.cos(a)*L,y-Math.sin(a)*L,x+Math.cos(a)*L,y+Math.sin(a)*L); },30,[0,1],0.7],[function(x,y,s,r){ cwPig(x,y,1.5,r()*6); if(r()<0.5) cwPig(x+16,y+10,1.2,r()*6); },14,[1,1],0.6],
    [function(x,y,s){ cwCookie(x,y,8+4*s); },11,[0,1],0.8],[function(x,y,s,r){ cwLamp(x,y,[340,200,50][Math.floor(r()*3)]); },8,[1,1],0.4]],
  for:[[function(x,y,s,r){ cwCotton(x,y,20+12*s,[330,200,280,160][Math.floor(r()*4)]); },28,[0,1],5],[function(x,y,s,r){ cwBear(x,y,1.6,(r()-0.5)*1.2,[0,40,120,200,300][Math.floor(r()*5)]); },12,[1,1],1],
    [function(x,y){ cwBeans(x,y); },15,[1,1],0.9],[function(x,y,s,r){ cwLicorice(x,y,30+16*s,(r()-0.5)*1); },22,[0,1],0.7],[function(x,y){ cwMushes(x,y); },12,[1,1],0.9],
    [function(x,y,s){ cwTruffle(x,y,7+3*s); },9,[0,1],0.6],[function(x,y,s,r){ for(var j=0;j<5;j++) cwFlower(x+(r()-0.5)*24,y+(r()-0.5)*16,[330,200,50,280,0][j]); },14,[1,1],0.8]],
  mnt:[[function(x,y,s,r){ var C=[[340,80,82],[30,60,70],[150,50,78],[40,80,85],[0,0,96],[200,70,84]]; cwScoop(x,y,40+24*s,C[Math.floor(r()*C.length)],['cherry','choc','spr'][Math.floor(r()*3)]); },54,[0,1],4],
    [function(x,y,s,r){ cwCone(x,y,1.5,r()*6.28); },22,[1,1],0.9],[function(x,y,s){ cwMush(x,y,8+4*s); },11,[0,1],0.7],[function(x,y,s,r){ var H=[200,180,340]; for(var j=0;j<5;j++) cwGumdrop(x+(r()-0.5)*22,y+(r()-0.5)*14,3.4+r()*1.4,H[j%3]); },14,[1,1],0.8],
    [function(x,y){ cwSnowman(x,y); },12,[1,1],0.4],[function(x,y){ cwCherries(x,y); },9,[1,1],0.6],[function(x,y,s,r){ cwPopsicle(x,y,(r()-0.5)*2,[340,30,200,120][Math.floor(r()*4)]); },11,[1,1],0.6]] };
var CW_N={vil:30,for:46,mnt:16};
/* the road — always a chocolate bar (the maintainer: «дорога всегда шоколадная, но меняется от тёмного к молочному и белому»): dark in the
   village, milk in the forest, white in the mountains. [groove, tile top, tile, tile bottom, shadow, rim light, gloss] */
var CW_CHOC={dark:['#2a1006','#7a4020','#5a2a12','#4a2010','#2a0e04','rgba(255,200,160,0.16)',0.09],
  milk:['#5a2e14','#b8763e','#9a5a2a','#86481e','#5a2c10','rgba(255,225,190,0.22)',0.12],
  white:['#dcc6a0','#fffdf8','#fff8ec','#f6ecd8','#e2d0b0','rgba(255,255,255,0.7)',0.2]};
/* a tile following the road: from x0 to x1, between the shares f0, f1 of the half-width, inset by g — its outline's points */
function cwTilePts(road,x0,x1,f0,f1,g){ var pts=[], t, n=Math.max(2,Math.ceil((x1-x0)/10)); for(var i=0;i<=n;i++){ t=x0+g+(x1-x0-2*g)*i/n; var a=rpAt(road,t); pts.push([t,a[0]+f0*a[1]+g,a[0]+f1*a[1]-g]); } return pts; }
function cwTilePath(pts,dy0,dy1){ rx.beginPath(); pts.forEach(function(q){ rx.lineTo(q[0],q[1]+(dy0||0)); }); for(var k=pts.length-1;k>=0;k--) rx.lineTo(pts[k][0],pts[k][2]-(dy1||0)); rx.closePath(); }
function cwTileTop(pts,d){ rx.beginPath(); pts.forEach(function(q,k){ if(k) rx.lineTo(q[0],q[1]+d); else rx.moveTo(q[0],q[1]+d); }); }
function cwTileBot(pts,d){ rx.beginPath(); pts.forEach(function(q,k){ if(k) rx.lineTo(q[0],q[2]-d); else rx.moveTo(q[0],q[2]-d); }); }
/* the pillow tile: dark rim, a lighter inset face, light on the upper-left edges, shade on the lower-right (C as CW_CHOC) */
function cwPillow(road,x0,x1,f0,f1,C,bev){ var p=cwTilePts(road,x0,x1,f0,f1,1.6), q=cwTilePts(road,x0,x1,f0,f1,1.6+bev), m=p[Math.floor(p.length/2)];
  rx.fillStyle=C[4]; cwTilePath(p); rx.fill(); rx.fillStyle=rpLg(0,m[1],0,m[2],[C[1],C[3]]); cwTilePath(p,0,bev*0.6); rx.fill();
  rx.fillStyle=rpLg(0,m[1]+bev,0,m[2]-bev,[C[1],C[2],C[3]]); cwTilePath(q); rx.fill();
  rx.strokeStyle=C[5]; rx.lineWidth=2; cwTileTop(q,0.8); rx.stroke(); rx.beginPath(); rx.moveTo(q[0][0]+0.8,q[0][1]); rx.lineTo(q[0][0]+0.8,q[0][2]); rx.stroke();
  rx.strokeStyle='rgba(0,0,0,0.25)'; cwTileBot(q,0.6); rx.stroke(); var L=q[q.length-1]; rx.beginPath(); rx.moveTo(L[0]-0.6,L[1]); rx.lineTo(L[0]-0.6,L[2]); rx.stroke(); return q; }
function cwStar(x,y,r,c){ rx.beginPath(); for(var k=0;k<10;k++){ var a=-1.5708+k*0.6283, rr=k%2?r*0.45:r; rx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr); } rx.closePath(); rx.fillStyle=c; rx.fill(); }
/* the chocolate road: big pillow tiles in two rows (the maintainer's «Б» of six) */
function cwChoc(road,x0L,WL,C){ rx.fillStyle=C[0]; rx.fillRect(-10,-10,WL+20,400); var TW=76, p0=-(((x0L%TW)+TW)%TW), X, j;
  for(X=p0-2*TW;X<WL+2*TW;X+=TW) for(j=0;j<2;j++) cwPillow(road,X,X+TW,-1+j,j,C,7);
  rx.globalAlpha=C[6]; rx.lineWidth=34; rx.strokeStyle='#fff'; cwAlong(road,-0.4,0); rx.stroke(); rx.globalAlpha=1; }
/* the waffle road: thin wafer sheets, a fine diagonal grid, the sheets' joins (the maintainer's «В5», a shade darker) */
function cwWaffle(road,x0L,WL){ var X, k, lo=[160,100,44], hi=[192,138,74], SW=150, pS=-(((x0L%SW)+SW)%SW);
  rx.fillStyle='#e6b06a'; rx.fillRect(-10,-10,WL+20,400); for(k=0;k<4;k++){ var f=1-k/4; rx.fillStyle=rpC(rpL3(lo,hi,k/3)); cwBand(road,-f,0,f,0); rx.fill(); }
  rx.save(); rpRiver(road,0,0,0); rx.clip(); rx.strokeStyle='rgba(84,44,10,0.58)'; rx.lineWidth=1.3; rx.beginPath(); var d0=-(((x0L%10)+10)%10);
  for(var i=d0-500;i<WL+500;i+=10){ rx.moveTo(i,-10); rx.lineTo(i+300,400); rx.moveTo(i,400); rx.lineTo(i+300,-10); } rx.stroke(); rx.restore();
  for(X=pS-SW;X<WL+SW;X+=SW){ var a=rpAt(road,X); rx.fillStyle='rgba(90,45,10,0.7)'; rx.fillRect(X-1.5,a[0]-a[1],3,2*a[1]); rx.fillStyle='rgba(255,230,180,0.55)'; rx.fillRect(X+1.5,a[0]-a[1],1.5,2*a[1]); }
  rx.globalAlpha=0.12; rx.lineWidth=34; rx.strokeStyle='#fff'; cwAlong(road,-0.4,0); rx.stroke(); rx.globalAlpha=1; }
/* the caramel road: pulled caramel with streaks and gloss (the maintainer's «А, тянучка») */
function cwCaramel(road,x0L,WL){ for(var k=0;k<6;k++){ var f=1-k/6; rx.fillStyle=rpC(rpL3([168,91,28],[224,154,62],k/5)); cwBand(road,-f,0,f,0); rx.fill(); }
  var G=6, g0=Math.floor((x0L-140)/G); for(var gi=g0;gi*G<x0L+WL;gi++){ var q=rpSeed(gi*7919+13); if(q()>0.5) continue; var X=gi*G-x0L, o=(q()-0.5)*1.8, L=40+q()*90; if(X+L<0) continue;   /* the streaks on the world's grid: no seam between the chunks */
    rx.strokeStyle='rgba(255,'+(200+Math.floor(q()*40))+',150,'+(0.08+q()*0.14)+')'; rx.lineWidth=1+q()*3; rx.beginPath(); for(var t=0;t<=L;t+=8){ var a=rpAt(road,X+t); rx.lineTo(X+t,a[0]+o*a[1]); } rx.stroke(); }
  rx.globalAlpha=0.16; rx.lineWidth=24; rx.strokeStyle='#fff8e8'; cwAlong(road,-0.45,0); rx.stroke(); rx.globalAlpha=1; }
/* the zones' looks: land tile, verge colour and crumbs, the road's surface and kerb, the middle line */
var CW_LOOK={
  vil:{choc:'dark',land:'dough',verge:[150,96,48],crumbs:['#7a4418','#b8783a','#4a240c','#e8c890'],wob:4,line:'rgba(160,118,74,0.6)',
    road:function(road,x0L,WL){ cwChoc(road,x0L,WL,CW_CHOC.white); },   /* the maintainer: «белый шоколад — деревня, вафля — лес, карамель — горы» */
    kerb:function(road,sd,K0,r){ rx.lineWidth=K0; rx.strokeStyle='#fffaf3'; cwAlong(road,sd,-sd*K0/2); rx.stroke();
      for(var X=r()*10;X<road.m.length*4;X+=9+r()*10){ var a=rpAt(road,X); rpEll(X,a[0]+sd*(a[1]-K0)-sd*(2+r()*3),2.8,3.5+r()*4,0,'#fffaf3'); }
      rx.lineWidth=1.2; rx.strokeStyle='rgba(160,110,80,0.45)'; cwAlong(road,sd,0); rx.stroke();
      var H=[340,50,200,120]; for(var X2=6,n=0;X2<road.m.length*4;X2+=30,n++){ var b=rpAt(road,X2); cwGumdrop(X2,b[0]+sd*(b[1]-K0/2),3,H[n%4]); } } },
  for:{choc:'milk',land:'mint',verge:[246,255,250],crumbs:['#ffffff','#e4fff2','#c4ecd8','#ffe0ee'],wob:4,line:'rgba(255,248,232,0.75)',
    road:function(road,x0L,WL){ cwWaffle(road,x0L,WL); },
    kerb:function(road,sd,K0,r,x0L,WL){ rx.lineWidth=K0; rx.strokeStyle='#fff'; cwAlong(road,sd,-sd*K0/2); rx.stroke(); cwDash(road,sd,-sd*K0/2,x0L,WL,20,10,'#e8243e',K0);
      rx.lineWidth=1.5; rx.strokeStyle='rgba(255,255,255,0.7)'; cwAlong(road,sd,-sd*(K0/2+2)); rx.stroke(); } },
  mnt:{choc:'white',land:'vanilla',verge:[255,246,232],crumbs:['#ffffff','#f3e2cc','#ffe3ec','#d9f2ff'],wob:5,line:'rgba(255,240,210,0.7)',
    road:function(road,x0L,WL){ cwCaramel(road,x0L,WL); },
    kerb:function(road,sd,K0,r){ var n=road.m.length*4; for(var X=-6;X<n+6;X+=9){ var a=rpAt(road,X), Y=a[0]+sd*(a[1]-K0/2); rpSw(3,1.5,2,0.25); rpDisc(X,Y,K0*0.62,'#f0dfcf'); rpNos(); rpDisc(X,Y,K0*0.62,rpRg(X,Y,K0*0.62,'#ffffff','#f0dfcf'));
        rx.strokeStyle='rgba(200,170,150,0.6)'; rx.lineWidth=0.8; rx.beginPath(); rx.arc(X,Y,K0*0.35,0.5,4); rx.stroke(); }
      for(var X2=12;X2<n;X2+=54){ var b=rpAt(road,X2), Y2=b[0]+sd*(b[1]-K0/2)-1; rpDisc(X2,Y2,2.8,rpRg(X2,Y2,2.8,'#ff8a8a','#b0102a')); } } } };
/* the ground of a zone: land, verge (off the road) — and, apart, the road: its surface, kerbs and middle line */
function cwLand(L,road,x0L,WL,HL,r){ var SH=RP_SH, i;
  rpPat(cwTile(L.land),x0L,WL,HL);
  rx.fillStyle=rpC(rpMul(L.verge,0.86)); rpRiver(road,SH+2,x0L,L.wob); rx.fill(); rx.fillStyle=rpC(L.verge); rpRiver(road,SH,x0L,L.wob); rx.fill();
  rx.save(); rpRiver(road,SH,x0L,L.wob); rx.clip(); for(i=0;i<WL*1.2;i++){ var x=r()*WL, a=rpAt(road,x), y=a[0]+(r()-0.5)*2*(a[1]+SH); rpDisc(x,y,0.6+r()*1.4,L.crumbs[Math.floor(r()*L.crumbs.length)]); } rx.restore(); }
function cwRoadAll(L,road,x0L,WL,r){ rx.save(); rpRiver(road,0,x0L,0); rx.clip(); L.road(road,x0L,WL,r); rx.restore();
  [-1,1].forEach(function(sd){ L.kerb(road,sd,RP_KERB,r,x0L,WL); }); cwDash(road,0,0,x0L,WL,40,22,L.line,3); }
/* where two zones meet, the road changes at once across a seam of pink fondant with sprinkles (a blend of two roads looked muddy) */
function cwSeam(road,x){ var a=rpAt(road,x), y0=a[0]-a[1]-RP_SH*0.4, y1=a[0]+a[1]+RP_SH*0.4, q=rpSeed(Math.round(x)*7+5), w=11, i;
  rpSw(8,3,4,0.4); rx.fillStyle='#d8608a'; rx.beginPath(); rx.roundRect(x-w,y0,2*w,y1-y0,w); rx.fill(); rpNos();
  rx.fillStyle=rpLg(x-w,0,x+w,0,['#e86a96','#ffb3cc','#ffd0e0','#f28aae']); rx.beginPath(); rx.roundRect(x-w+1.5,y0+1.5,2*w-3,y1-y0-3,w-1.5); rx.fill();
  rx.strokeStyle='rgba(255,255,255,0.75)'; rx.lineWidth=2; rx.beginPath(); rx.moveTo(x-w*0.45,y0+w); rx.lineTo(x-w*0.45,y1-w); rx.stroke();
  for(i=0;i<(y1-y0)/3;i++) cwSpr(x+(q()-0.5)*w*1.4,y0+4+q()*(y1-y0-8),CW_SPR[i%5],4,q()*3);
  [y0+6,y1-6].forEach(function(y,k){ cwGumdrop(x,y,4.4,k?200:340); }); }
function cwGroundAll(road,z,x0L,WL,HL,r){ cwLand(CW_LOOK[CW_Z[z.a]],road,x0L,WL,HL,rpSeed(r()*1e9));
  if(z.t1>0){ var KS=rKS(), o=hdOff(RCW*K+3,LH,hs), keep=rx; rx=o.x; rx.setTransform(hs*KS,0,0,hs*KS,0,0); rx.scale(0.5,0.5); cwLand(CW_LOOK[CW_Z[z.b]],road,x0L,WL,HL,rpSeed(r()*1e9));
    if(RPX) rpDitherIn(o.c,z.t0,z.t1);
    else { rx.globalCompositeOperation='destination-in'; var g=rx.createLinearGradient(0,0,WL,0); g.addColorStop(0,'rgba(0,0,0,'+z.t0+')'); g.addColorStop(1,'rgba(0,0,0,'+z.t1+')'); rx.fillStyle=g; rx.fillRect(-20,-20,WL+40,HL+40); }
    rx=keep; rx.save(); rx.setTransform(1,0,0,1,0,0); rx.drawImage(o.c,0,0); rx.restore(); }
  var second=z.t1>0&&z.t0>=0.5; cwRoadAll(CW_LOOK[CW_Z[second?z.b:z.a]],road,x0L,WL,rpSeed(r()*1e9));
  if(z.t1>0) cwSeam(road,second?0:WL); }
/* a chocolate stream across the land (the forest; the road crosses it on a wafer bridge): drawn before the road */
function cwStream(road,x,HL,r){ var w=34, ph=r()*6; rx.beginPath(); for(var Y=-10;Y<=HL+10;Y+=6) rx.lineTo(x+14*Math.sin(Y/37+ph)-w/2,Y); for(Y=HL+10;Y>=-10;Y-=6) rx.lineTo(x+14*Math.sin(Y/37+ph)+w/2,Y); rx.closePath();
  rx.fillStyle=rpLg(x-w/2,0,x+w/2,0,['#3a1a0c','#6e3518','#3a1a0c']); rx.fill(); rx.strokeStyle='rgba(255,220,190,0.35)'; rx.lineWidth=1.4;
  for(var i=0;i<22;i++){ var y=r()*HL, xx=x+14*Math.sin(y/37+ph)+(r()-0.5)*w*0.6; rx.beginPath(); rx.moveTo(xx,y); rx.quadraticCurveTo(xx+3,y+6,xx,y+12); rx.stroke(); }
  rx.strokeStyle='#fff3e6'; rx.lineWidth=2.4; [-1,1].forEach(function(s){ rx.beginPath(); for(var Y2=-10;Y2<=HL+10;Y2+=6) rx.lineTo(x+14*Math.sin(Y2/37+ph)+s*w/2,Y2); rx.stroke(); }); }
function cwWafer(road,x){ [-1,1].forEach(function(sd){ var x0=x-32, x1=x+32, X, a; rx.beginPath(); for(X=x0;X<=x1;X+=4){ a=rpAt(road,X); rx.lineTo(X,a[0]+sd*(a[1]+RP_SH*0.55)); }
    rpSw(6,3,4,0.45); rx.lineCap='round'; rx.lineWidth=7; rx.strokeStyle='#c9894a'; rx.stroke(); rpNos(); rx.lineWidth=5; rx.strokeStyle='#f0c886'; rx.stroke();
    rx.strokeStyle='rgba(140,80,30,0.6)'; rx.lineWidth=0.8; rx.beginPath(); for(X=x0+2;X<x1;X+=4){ a=rpAt(road,X); var y=a[0]+sd*(a[1]+RP_SH*0.55); rx.moveTo(X,y-2.4); rx.lineTo(X,y+2.4); } rx.stroke();
    for(X=x0;X<=x1;X+=32){ a=rpAt(road,X); cwGumdrop(X,a[0]+sd*(a[1]+RP_SH*0.55),3.6,sd<0?340:200); } }); }
/* the road's buildings, now and then — the maintainer's picks of the sketches (2 Oct): the village all six (a zebra, a filling station, a cake
   café, a bus stop, a sign; the milk stream with candy-cane rails comes as the forest's chocolate one), the forest all but the cotton-candy
   tunnel (a licorice guardrail, a bear crossing, a picnic; the chocolate stream with wafer rails), the mountains all four (a cable car and a
   tunnel through a ridge of scoops over the road, marshmallow bollards, an igloo); plus the fences, lamps and ice lollies of before.
   Returns the chunk's top layer, if any (over the cars) */
function cwInfra(zn,r,road,x0L,WL,HL,placed){ var SH=RP_SH, sd=r()<0.5?-1:1, x=70+r()*(WL-140), q=r(), k, top=null;
  function Y(xx,d){ var a=rpAt(road,xx); return a[0]+sd*(a[1]+d); } function ok(y){ return y>48&&y<HL-6; } function room(d,rad){ var y=Y(x,d); if(!ok(y)) return false; placed.push([x,y,rad]); return true; }
  if(zn==='vil'){ if(q<0.1) cwZebra(road,x); else if(q<0.17){ if(room(SH+40,96)) cwStation(road,x,sd); } else if(q<0.25){ if(room(SH+46,64)) cwCafe(road,x,sd); }
    else if(q<0.37){ if(room(SH+14,40)) cwBusStop(road,x,sd); } else if(q<0.49){ if(room(SH*0.6,18)) cwSignBoard(road,x,sd); }
    else if(q<0.8){ var L=90+r()*60; x=40+r()*(WL-160); for(k=x;k<x+L;k+=30){ var y0=Y(k,SH+10), y1=Y(k+30,SH+10); if(ok(y0)&&ok(y1)) cwFence(k,y0,k+30,y1); } for(k=x+15;k<x+L;k+=60){ var ly=Y(k,SH+22); if(ok(ly)) cwLamp(k,ly,[340,200,50][Math.floor(r()*3)]); } placed.push([x+L/2,Y(x+L/2,SH+14),L/2]); }
    return null; }
  if(zn==='for'){ if(q<0.12){ room(SH*0.75,30); cwLicoriceRail(road,x,sd); } else if(q<0.24){ cwJellyZebra(road,x); placed.push([x-40,Y(x-40,SH*0.6),20]); } else if(q<0.34){ if(room(SH+34,44)) cwPicnic(road,x,sd); } return null; }
  if(q<0.1){ x=WL/2; top=cwTop(road,function(){ cwCable(road,x); }); placed.push([x-30,cwY(road,x,-1,SH+30),16],[x+30,cwY(road,x,1,SH+30),16]); }
  else if(q<0.18){ x=WL/2; top=cwTop(road,function(){ cwScoopTunnel(road,x); }); }
  else if(q<0.33){ room(SH*0.6,24); cwBollards(road,x,sd); } else if(q<0.43){ if(room(SH+40,48)) cwIgloo(road,x,sd); }
  else if(q<0.6){ for(k=0;k<4;k++){ var px=x+k*26, py=Y(px,SH+12); if(ok(py)) cwPopsicle(px,py,sd>0?0:3.1416,[340,30,200,120][k]); } placed.push([x+40,Y(x+40,SH+12),50]); }
  return top; }
function cwScatter(r,road,z,x0L,WL,HL,placed){ var list=[], i, nA=CW_N[CW_Z[z.a]], nB=CW_N[CW_Z[z.b]], n=Math.round(nA+(nB-nA)*(z.t0+z.t1)/2);
  for(i=0;i<n;i++){ var px=r()*WL, zt=z.t0+(z.t1-z.t0)*px/WL, set=CW_SET[CW_Z[r()<zt?z.b:z.a]], tot=0, k; set.forEach(function(it){ tot+=it[3]; }); var w=r()*tot; for(k=0;k<set.length-1&&(w-=set[k][3])>0;k++); var it=set[k]; list.push({it:it,s:it[2][0]+r()*(it[2][1]-it[2][0]),x:px}); }
  list.sort(function(a,b){ return b.it[1]-a.it[1]; });
  list.forEach(function(o){ var rad=o.it[1]*(0.7+0.3*o.s); for(var t=0;t<20;t++){ var px=t?rad+r()*(WL-2*rad):Math.max(rad,Math.min(WL-rad,o.x)), py=44+r()*(HL-48), a=rpAt(road,px);
      if(Math.abs(py-a[0])<a[1]+RP_SH+8+rad*0.7) continue; if(placed.some(function(q){ var dx=q[0]-px, dy=q[1]-py; return dx*dx+dy*dy<(q[2]+rad)*(q[2]+rad)*0.75; })) continue;
      placed.push([px,py,rad]); o.it[0](px,py,o.s,r); break; } }); }
function cwStreamAt(i){ return rHash(RC.seed,i*7+3)/4294967296<0.2; }
/* one chunk of the candy land (as pirateChunk) */
function candyChunk(rg,i,W,H){ var r=rR(rHash(RC.seed,i)+17), road=rChunkRoad(rg,i), z=cwZone(i), WL=W*2, HL=H*2, x0L=i*W*2, placed=[], tm=(z.t0+z.t1)/2, zn=CW_Z[r()<tm?z.b:z.a], st=null;
  RP.ds=hs*rKS()/2; rx.save(); rx.scale(0.5,0.5);
  if((zn==='for'||zn==='vil')&&!z.t1&&i>2&&cwStreamAt(i)&&!cwStreamAt(i-1)){ st=60+r()*(WL-120); placed.push([st,40,30],[st,HL-40,30]); }
  if(st===null) cwGroundAll(road,z,x0L,WL,HL,r);
  else { var L=CW_LOOK[CW_Z[z.a]]; cwLand(L,road,x0L,WL,HL,r); if(zn==='vil'){ cwMilkBridge(road,st); cwRoadAll(L,road,x0L,WL,r); cwCaneRails(road,st); } else { cwStream(road,st,HL,rpSeed(st)); cwRoadAll(L,road,x0L,WL,r); cwWafer(road,st); } }
  var top=cwInfra(zn,r,road,x0L,WL,HL,placed);
  cwScatter(r,road,z,x0L,WL,HL,placed);
  rx.restore(); return top; }
/* ── the road's own buildings (v1.20 sketches; the maintainer: «теперь дорожная инфраструктура»): each (road, x, side) in L px, x mid-chunk;
   the ones that go over the road (tunnels, the cable car) draw into the chunk's top layer, see-through over the road ── */
function cwY(road,x,sd,d){ var a=rpAt(road,x); return a[0]+sd*(a[1]+d); }
function cwTop(road,draw){ var KS=rKS(), o=hdOff(RCW*K+3,LH,hs), keep=rx; rx=o.x; rx.setTransform(hs*KS,0,0,hs*KS,0,0); rx.scale(0.5,0.5); draw();
  rpRiver(road,0,0,0); rx.setTransform(1,0,0,1,0,0); rx.globalCompositeOperation='destination-out'; rx.fillStyle='rgba(0,0,0,0.5)'; rx.fill(); rx.globalCompositeOperation='source-over'; rx=keep; return o.c; }
/* village */
function cwZebra(road,x){ var a=rpAt(road,x), n=6, i, w=a[1]*2/(n*2-1); for(i=0;i<n;i++){ var y=a[0]-a[1]+i*2*w;
    rpSw(4,1.5,2,0.3); rx.fillStyle=i%2?'#ffc2d6':'#ffffff'; rx.beginPath(); rx.roundRect(x-16,y,32,w,w/2); rx.fill(); rpNos(); rx.fillStyle='rgba(255,255,255,0.6)'; rx.fillRect(x-12,y+1.5,24,2); }
  [-1,1].forEach(function(sd){ var by=cwY(road,x+24,sd,RP_SH*0.55); rpSw(4,2,3,0.35); rpDisc(x+24,by,5.5,'#ff9a2a'); rpNos(); rpDisc(x+24,by,5.5,rpRg(x+24,by,5.5,'#ffd27a','#ff7a1a')); rpEll(x+22.5,by-2,1.8,1,0,'rgba(255,255,255,0.8)'); }); }
function cwStation(road,x,sd){ var y=cwY(road,x,sd,RP_SH+40), i;
  rx.fillStyle='#e8d2b0'; [-34,34].forEach(function(dx){ rx.beginPath(); var y0=cwY(road,x+dx,sd,RP_SH-2); rx.moveTo(x+dx-9,y0); rx.lineTo(x+dx+9,y0); rx.lineTo(x+dx+9,y); rx.lineTo(x+dx-9,y); rx.fill(); });
  rpSw(6,3,4,0.3); rx.fillStyle='#f0e0c4'; rx.beginPath(); rx.roundRect(x-62,y-26,124,52,10); rx.fill(); rpNos(); rx.strokeStyle='rgba(160,120,80,0.35)'; rx.lineWidth=1; for(i=-56;i<62;i+=12){ rx.beginPath(); rx.moveTo(x+i,y-26); rx.lineTo(x+i,y+26); rx.stroke(); }
  [-18,18].forEach(function(dx){ rpSw(3,1.5,2,0.35); rx.fillStyle='#ff4f8b'; rx.beginPath(); rx.roundRect(x+dx-5,y-8,10,16,3); rx.fill(); rpNos(); rpDisc(x+dx,y-3,3,'#fff'); rx.fillStyle='#2a1a20'; rx.fillRect(x+dx-1,y+8,2,6); });
  rpSw(12,6,8,0.4); rx.fillStyle='#ffffff'; rx.beginPath(); rx.roundRect(x-44,y-sd*4-17,88,34,4); rx.fill(); rpNos(); rx.save(); rx.beginPath(); rx.roundRect(x-44,y-sd*4-17,88,34,4); rx.clip(); for(i=-44;i<44;i+=11){ rx.fillStyle='#ff5d8f'; rx.fillRect(x+i,y-sd*4-17,5.5,34); } rx.restore();
  rx.globalAlpha=0.35; rx.fillStyle='#fff'; rx.fillRect(x-44,y-sd*4-17,88,6); rx.globalAlpha=1;
  cwHouse(x+92,y+sd*6,40,30,0); rpSw(4,2,3,0.35); rpDisc(x-80,y,8,'#2ec27e'); rpNos(); rpDisc(x-80,y,8,rpRg(x-80,y,8,'#7af0b4','#1a9a5e')); rx.fillStyle='#fff'; rx.font='bold 10px sans-serif'; rx.textAlign='center'; rx.textBaseline='middle'; rx.fillText('F',x-80,y+0.5); }
function cwCafe(road,x,sd){ var y=cwY(road,x,sd,RP_SH+46), i, k;
  rpSw(14,7,8,0.4); rpDisc(x,y,34,'#c87a9a'); rpNos();
  [[34,'#f7c6d5','#e98fb0'],[25,'#fff4e6','#f0d6b8'],[16,'#ffd6e4','#f7a3c0']].forEach(function(t){ rpDisc(x,y,t[0],rpRg(x,y,t[0],t[1],t[2])); for(k=0;k<20;k++){ var a=k/20*6.2832; rpDisc(x+Math.cos(a)*t[0],y+Math.sin(a)*t[0],2.2,t[1]); } });
  for(k=0;k<5;k++){ var b=k/5*6.2832+0.3, cx=x+Math.cos(b)*9, cy=y+Math.sin(b)*9; rpDisc(cx,cy,2.2,CW_SPR[k]); rpDisc(cx,cy,1,'#ffe680'); }
  rpDisc(x,y,4,rpRg(x,y,4,'#ff7a7a','#b0102a'));
  for(i=0;i<3;i++){ var tx=x-48+i*48, ty=y-sd*48; rpSw(6,3,4,0.35); rpDisc(tx,ty,11,'#fff'); rpNos(); for(k=0;k<8;k++){ rx.beginPath(); rx.moveTo(tx,ty); rx.arc(tx,ty,11,k*0.785,(k+1)*0.785); rx.fillStyle=k%2?['#ff5d8f','#56c8f5','#ffd447'][i]:'#ffffff'; rx.fill(); } rpDisc(tx,ty,1.6,'#c8a070'); } }
function cwBusStop(road,x,sd){ var y=cwY(road,x,sd,RP_SH*0.5), y2=cwY(road,x,sd,RP_SH+14);
  rx.strokeStyle='rgba(255,255,255,0.8)'; rx.lineWidth=2; rx.setLineDash([6,5]); rx.beginPath(); for(var t=x-50;t<=x+50;t+=5) rx.lineTo(t,cwY(road,t,sd,1)); rx.stroke(); rx.setLineDash([]);
  rpSw(8,4,5,0.4); rx.fillStyle='#c88a40'; rx.fillRect(x-26,y2-9,52,18); rpNos(); rx.fillStyle=rpLg(0,y2-9,0,y2+9,['#f2c37a','#c88a40']); rx.fillRect(x-26,y2-9,52,18);
  rx.strokeStyle='rgba(110,60,20,0.5)'; rx.lineWidth=0.8; rx.beginPath(); for(var i=-26;i<26;i+=4){ rx.moveTo(x+i,y2-9); rx.lineTo(x+i+6,y2+9); rx.moveTo(x+i+6,y2-9); rx.lineTo(x+i,y2+9); } rx.stroke();
  rpSw(4,2,3,0.35); rpDisc(x+36,y,6,'#fff'); rpNos(); rpDisc(x+36,y,6,'#2a7ad8'); rx.fillStyle='#fff'; rx.beginPath(); rx.roundRect(x+32.5,y-2.5,7,4.5,1.2); rx.fill(); rpDisc(x+34,y+2.6,0.9,'#fff'); rpDisc(x+38,y+2.6,0.9,'#fff'); }
function cwSignBoard(road,x,sd,kind){ var y=cwY(road,x,sd,RP_SH*0.6); rpSw(6,4,5,0.4); rx.fillStyle='#a8602a'; rx.beginPath(); rx.roundRect(x-14,y-10,28,20,5); rx.fill(); rpNos();
  rx.fillStyle=rpRg(x,y,16,'#e0a060','#a8602a'); rx.beginPath(); rx.roundRect(x-14,y-10,28,20,5); rx.fill(); rx.strokeStyle='#fffaf3'; rx.lineWidth=1.6; rx.beginPath(); rx.roundRect(x-11.5,y-7.5,23,15,3.5); rx.stroke();
  rx.lineWidth=2.6; rx.lineCap='round'; rx.beginPath(); if(kind==='bear'){ cwBear(x,y,0.6,0,0); return; } rx.moveTo(x-6,y+4); rx.quadraticCurveTo(x-6,y-4,x+4,y-4); rx.stroke(); rx.beginPath(); rx.moveTo(x+1,y-7); rx.lineTo(x+5,y-4); rx.lineTo(x+1,y-1); rx.stroke(); }
function cwMilkBridge(road,x){ var w=30, HL=420, ph=1.3; rx.beginPath(); for(var Y=-10;Y<=HL;Y+=6) rx.lineTo(x+12*Math.sin(Y/41+ph)-w/2,Y); for(Y=HL;Y>=-10;Y-=6) rx.lineTo(x+12*Math.sin(Y/41+ph)+w/2,Y); rx.closePath();
  rx.fillStyle=rpLg(x-w/2,0,x+w/2,0,['#e8eef8','#ffffff','#e8eef8']); rx.fill(); rx.strokeStyle='rgba(180,200,230,0.6)'; rx.lineWidth=1.2; for(var i=0;i<16;i++){ var yy=i*26+8, xx=x+12*Math.sin(yy/41+ph); rx.beginPath(); rx.moveTo(xx-6,yy); rx.quadraticCurveTo(xx,yy+5,xx+6,yy); rx.stroke(); } }
function cwCaneRails(road,x){ [-1,1].forEach(function(sd){ var x0=x-30, x1=x+30, X; rx.beginPath(); for(X=x0;X<=x1;X+=4) rx.lineTo(X,cwY(road,X,sd,RP_SH*0.55)); rpSw(5,2,3,0.4); rx.lineWidth=6; rx.lineCap='round'; rx.strokeStyle='#fff'; rx.stroke(); rpNos(); rx.setLineDash([5,5]); rx.strokeStyle='#e0263a'; rx.stroke(); rx.setLineDash([]); }); }
/* forest */
function cwLicoriceRail(road,x,sd){ var x0=x-80, x1=x+80, X; rx.beginPath(); for(X=x0;X<=x1;X+=4) rx.lineTo(X,cwY(road,X,sd,RP_SH*0.75)); rpSw(5,3,3,0.4); rx.lineWidth=5; rx.lineCap='round'; rx.strokeStyle='#1a0810'; rx.stroke(); rpNos();
  rx.lineWidth=2; rx.strokeStyle='rgba(255,255,255,0.18)'; rx.stroke(); for(X=x0;X<=x1;X+=16){ var y=cwY(road,X,sd,RP_SH*0.75); rpDisc(X,y,3.6,'#3a1426'); rpDisc(X,y,1.4,'#e24a8b'); } }
function cwJellyZebra(road,x){ var a=rpAt(road,x), n=6, w=a[1]*2/(n*2-1); for(var i=0;i<n;i++){ var y=a[0]-a[1]+i*2*w; rx.globalAlpha=0.85; rpSw(4,1.5,2,0.25); rx.fillStyle=['#5ad86a','#ff5a6a','#ffd447'][i%3]; rx.beginPath(); rx.roundRect(x-16,y,32,w,w/2); rx.fill(); rpNos(); rx.globalAlpha=1; rx.fillStyle='rgba(255,255,255,0.5)'; rx.fillRect(x-12,y+1.5,24,2); }
  cwSignBoard(road,x-40,-1,'bear'); cwBear(x+30,cwY(road,x+30,1,RP_SH*0.7),1.4,0.3,40); cwBear(x+44,cwY(road,x+44,1,RP_SH*0.9),1.2,-0.2,120); }
function cwPicnic(road,x,sd){ var y=cwY(road,x,sd,RP_SH+34), i, j; rx.save(); rx.translate(x,y); rx.rotate(0.12); rpSw(6,3,4,0.3); rx.fillStyle='#fff'; rx.fillRect(-30,-22,60,44); rpNos();
  for(i=0;i<6;i++) for(j=0;j<4;j++) if((i+j)%2){ rx.fillStyle='#e8243e'; rx.fillRect(-30+i*10,-22+j*11,10,11); } rx.restore();
  cwCupcake(x-12,y-4,7,330); cwCupcake(x+10,y+6,6,200); cwBeans(x+14,y-10); [-1,1].forEach(function(s){ rpSw(5,2,3,0.35); rx.fillStyle='#8a5028'; rx.fillRect(x-28,y+s*32-3,56,6); rpNos(); }); }
/* mountains */
function cwCable(road,x){ var a=rpAt(road,x), yT=a[0]-a[1]-RP_SH-30, yB=a[0]+a[1]+RP_SH+30, xT=x-30, xB=x+30;
  [[xT,yT],[xB,yB]].forEach(function(p){ rpSw(10,8,8,0.4); rx.fillStyle='#e8c88a'; rx.fillRect(p[0]-5,p[1]-12,10,24); rpNos(); rx.fillStyle=rpLg(p[0]-5,0,p[0]+5,0,['#f6dcae','#c8a060']); rx.fillRect(p[0]-5,p[1]-12,10,24); rpDisc(p[0],p[1],7,'#ff5d8f'); rpDisc(p[0],p[1],3,'#fff'); });
  rx.strokeStyle='rgba(40,30,40,0.18)'; rx.lineWidth=2; rx.beginPath(); rx.moveTo(xT+14,yT+16); rx.lineTo(xB+14,yB+16); rx.stroke(); rx.strokeStyle='#4a3a40'; rx.lineWidth=1.4; rx.beginPath(); rx.moveTo(xT-2,yT); rx.lineTo(xB-2,yB); rx.moveTo(xT+2,yT); rx.lineTo(xB+2,yB); rx.stroke();
  [0.3,0.68].forEach(function(t,k){ var cx=xT+(xB-xT)*t, cy=yT+(yB-yT)*t; rpEll(cx+14,cy+16,10,7,0,'rgba(40,20,40,0.2)'); rx.fillStyle=k?'#56c8f5':'#ffd447'; rx.beginPath(); rx.moveTo(cx-14,cy-5); rx.lineTo(cx-8,cy); rx.lineTo(cx-14,cy+5); rx.fill(); rx.beginPath(); rx.moveTo(cx+14,cy-5); rx.lineTo(cx+8,cy); rx.lineTo(cx+14,cy+5); rx.fill();
    rpEll(cx,cy,9,7,0,rpRg(cx,cy,9,k?'#c6ecff':'#fff2a8',k?'#2a8ad8':'#e0a010')); rpEll(cx-3,cy-3,3,1.6,-0.5,'rgba(255,255,255,0.8)'); }); }
function cwScoopTunnel(road,x){ var a=rpAt(road,x), n=5, k, C=[[340,80,82],[30,60,70],[150,50,78],[40,80,85],[200,70,84]];   // a ridge of scoops across the road, the road through it
  for(k=0;k<n;k++){ var f=-1.3+2.6*k/(n-1), py=a[0]+f*(a[1]+RP_SH), q=rpSeed(k*17+Math.round(x)); cwScoop(x+(q()-0.5)*30,py,46+q()*12,C[k],k===2?'cherry':k%2?'spr':'choc'); }
  [-1,1].forEach(function(e){ var px=x+e*64, b=rpAt(road,px); rx.fillStyle=rpLg(px-e*16,0,px+e*4,0,['rgba(90,30,50,0.5)','rgba(90,30,50,0)']); rx.fillRect(Math.min(px-e*16,px+e*4),b[0]-b[1],20,2*b[1]); }); }
function cwBollards(road,x,sd){ for(var X=x-90;X<=x+90;X+=22){ var y=cwY(road,X,sd,RP_SH*0.6); rpSw(4,2,3,0.35); rpDisc(X,y,5.4,'#f0dcd0'); rpNos(); rpDisc(X,y,5.4,rpRg(X,y,5.4,'#ffffff','#f0d8cc')); rx.strokeStyle='#ff8ab0'; rx.lineWidth=1.6; rx.beginPath(); rx.arc(X,y,3.6,0,6.2832); rx.stroke(); } }
function cwIgloo(road,x,sd){ var y=cwY(road,x,sd,RP_SH+40), k, j; rpSw(12,6,8,0.35); rpDisc(x,y,28,'#e8e0e8'); rpNos();
  for(j=4;j>=1;j--){ var rr=28*j/4; for(k=0;k<j*7;k++){ var a=k/(j*7)*6.2832+j*0.4; rx.fillStyle=rpRg(x+Math.cos(a)*rr*0.85,y+Math.sin(a)*rr*0.85,7,'#ffffff','#e6dce6'); rx.beginPath(); rx.roundRect(x+Math.cos(a)*rr*0.85-4.5,y+Math.sin(a)*rr*0.85-4.5,9,9,2.5); rx.fill(); } }
  rpDisc(x,y,5,'#fff'); rx.fillStyle='rgba(60,40,60,0.6)'; rx.beginPath(); rx.ellipse(x,y-sd*30,8,5,0,0,6.2832); rx.fill();
  [[-44,-8,0.3],[-38,10,0.5]].forEach(function(s){ rx.save(); rx.translate(x+s[0],y+s[1]); rx.rotate(s[2]); rpSw(3,1.5,2,0.35); rx.fillStyle=['#ff5d8f','#56c8f5'][s[1]>0?1:0]; rx.beginPath(); rx.roundRect(-18,-1.6,36,3.2,1.6); rx.fill(); rpNos(); rx.restore(); }); }
/* ── our car (the maintainer's «АЕ4» of the sketches, 2 Oct: the F1's candy-cane body, the rocket's mint cone, mint spoilers, lollipop
   wheels, the driver under the glass): drawn at 0.62 of the sketch, so the body is the old rocket's 20 sketch px — the same hull the race
   counts; the nose to +x ── */
function cwLolli(x,y,h,s){ rpSw(1,0.5,0.8,0.45); rpDisc(x,y,s,'#fff'); rpNos(); rx.save(); rx.beginPath(); rx.arc(x,y,s,0,6.2832); rx.clip(); rx.strokeStyle=h; rx.lineWidth=s*0.42; rx.beginPath();
  for(var a=0;a<11;a+=0.25){ var r=s*a/11; rx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r); } rx.stroke(); rx.restore(); rx.beginPath(); rx.arc(x,y,s,0,6.2832); rx.strokeStyle='rgba(120,20,40,0.5)'; rx.lineWidth=0.35; rx.stroke(); rpDisc(x-s*0.35,y-s*0.4,s*0.22,'rgba(255,255,255,0.85)'); }
function cwOurs(px,py){ rx.save(); rx.translate(px,py); rx.scale(0.62,0.62);
  function body(){ rx.beginPath(); rx.moveTo(9,-4.4); rx.quadraticCurveTo(-2,-6,-12,-5); rx.lineTo(-14,-4.4); rx.lineTo(-14,4.4); rx.lineTo(-12,5); rx.quadraticCurveTo(-2,6,9,4.4); rx.closePath(); }
  function nose(){ rx.beginPath(); rx.moveTo(19,0); rx.bezierCurveTo(17,-4.6,13,-5.6,9,-5.4); rx.lineTo(9,5.4); rx.bezierCurveTo(13,5.6,17,4.6,19,0); }
  [[-9,-8],[8,-8],[-9,8],[8,8]].forEach(function(q){ cwLolli(q[0],q[1],'#e0263a',3); });
  rpSw(2.4,1.2,1.6,0.45); body(); rx.fillStyle='#fff'; rx.fill(); rpNos();
  rx.save(); body(); rx.clip(); rx.fillStyle='#fff'; rx.fillRect(-16,-8,28,16); rx.fillStyle='#e0263a'; for(var i=-40;i<40;i+=5){ rx.beginPath(); rx.moveTo(i,-8); rx.lineTo(i+2.5,-8); rx.lineTo(i+8.5,8); rx.lineTo(i+6,8); rx.fill(); }
  rx.fillStyle=rpLg(0,-6,0,6,['rgba(255,255,255,0.55)','rgba(255,255,255,0)','rgba(0,0,0,0)','rgba(60,0,20,0.33)']); rx.fillRect(-16,-8,28,16); rx.restore();
  [[-17,-9.4,4.4,18.8,1.6],[15.2,-7.4,3,14.8,1.2]].forEach(function(s){ rpSw(1.4,0.8,1.2,0.4); rx.fillStyle='#0f8a6a'; rx.beginPath(); rx.roundRect(s[0],s[1],s[2],s[3],s[4]); rx.fill(); rpNos();
    rx.fillStyle=rpLg(s[0],0,s[0]+s[2],0,['#7af0cc','#2fe0b0','#0f8a6a']); rx.beginPath(); rx.roundRect(s[0],s[1],s[2],s[3],s[4]); rx.fill(); rx.fillStyle='rgba(255,255,255,0.5)'; rx.fillRect(s[0]+0.6,s[1]+1,0.8,s[3]-2); });
  rx.save(); rx.translate(1,0); nose(); rx.fillStyle=rpLg(9,-5,9,5,['#c8fff0','#2fe0b0','#0a6a50']); rx.fill(); rx.beginPath(); rx.moveTo(19,0); rx.bezierCurveTo(17,-4.6,13,-5.6,9,-5.4); rx.lineTo(9,-2); rx.closePath(); rx.fillStyle='rgba(255,255,255,0.4)'; rx.fill(); rx.restore();
  rpEll(1,0,5.4,4.2,0,'#2a1a20'); rpEll(1,0,4.6,3.4,0,'#1a3a6a'); rpDisc(0.4,0,2.45,rpRg(0.4,0,2.45,'#ffffff','#2fe0b0')); rx.fillStyle='rgba(20,30,70,0.9)'; rx.beginPath(); rx.ellipse(1.6,0,1.1,1.9,0,0,6.2832); rx.fill(); rx.fillStyle='#fff'; rx.fillRect(-1.98,-0.3,1.9,0.6);
  rpEll(1,0,4.6,3.4,0,'rgba(150,215,255,0.35)'); rpEll(-0.6,-1.4,1.9,0.75,-0.2,'rgba(255,255,255,0.85)'); rpEll(2.4,1.5,0.9,0.35,0.3,'rgba(255,255,255,0.4)');
  rx.restore(); }
/* ── the rivals (the maintainer's picks «Ж, Л, М, Д, Г, Б» of ten sketches, detailed): a chocolate jeep, a wafer pickup, an ice-cream van,
   a cupcake car, a gummy car, a donut car; drawn at 0.63 of the sketch — the old cars' 19 sketch px body, the same size the race counts ── */
var CW_SPRC=['#ff5d8f','#56c8f5','#ffd447','#7ad66b','#b383ff','#ffffff'];
function cwRg(X,Y,r,c0,c1,fx,fy){ return rpRg(X,Y,r,c0,c1,fx===undefined?-0.35:fx,fy===undefined?-0.4:fy); }
function cwRR(X,Y,w,h,r,c){ rx.beginPath(); rx.roundRect(X,Y,w,h,r); rx.fillStyle=c; rx.fill(); }
function cwSRR(X,Y,w,h,r,c,lw){ rx.beginPath(); rx.roundRect(X,Y,w,h,r); rx.strokeStyle=c; rx.lineWidth=lw; rx.stroke(); }
function cwShRR(X,Y,w,h,r){ rpSw(2.6,1.3,1.8,0.5); cwRR(X,Y,w,h,r,'#000'); rpNos(); }
function cwTyre(X,Y,w,h,rim){ var i; cwRR(X-w/2,Y-h/2,w,h,h*0.42,'#1a1418'); rx.fillStyle='rgba(255,255,255,0.12)'; for(i=-w/2+0.8;i<w/2;i+=1.3) rx.fillRect(X+i,Y-h/2+0.3,0.5,h-0.6);
  if(rim){ cwRR(X-w*0.22,Y-h/2+0.2,w*0.44,h-0.4,0.6,rim); rx.fillStyle='rgba(255,255,255,0.6)'; rx.fillRect(X-w*0.2,Y-h/2+0.3,w*0.4,0.5); } }
function cwLights(X,ys,c){ ys.forEach(function(y){ rpEll(X,y,1.1,1.3,0,c||'#fff6d8'); rpEll(X-0.2,y-0.3,0.4,0.4,0,'#fff'); }); }
function cwTail(X,ys){ ys.forEach(function(y){ cwRR(X-0.5,y-1.1,1,2.2,0.4,'#ff3a5a'); }); }
function cwScreen(X,y0,y1,w){ rx.beginPath(); rx.moveTo(X,y0); rx.quadraticCurveTo(X+w,0,X,y1); rx.lineTo(X-w*0.35,y1-0.6); rx.quadraticCurveTo(X+w*0.5,0,X-w*0.35,y0+0.6); rx.closePath(); rx.fillStyle=rpLg(X-w,y0,X+w,y1,['#e0f4ff','#6aa8d8','#2a5a8a']); rx.fill();
  rx.beginPath(); rx.moveTo(X-w*0.1,y0+1.4); rx.quadraticCurveTo(X+w*0.5,y0+3,X+w*0.2,y0+5); rx.strokeStyle='rgba(255,255,255,0.8)'; rx.lineWidth=0.6; rx.stroke(); }
function cwSprinkle(X,Y,a,k,l){ rx.save(); rx.translate(X,Y); rx.rotate(a); rx.fillStyle=CW_SPRC[k%6]; rx.fillRect(-l/2,-0.32,l,0.64); rx.restore(); }
function cwJeep(){ var i, j;
  [[-9,-9],[9,-9],[-9,9],[9,9]].forEach(function(q){ cwTyre(q[0],q[1],9,5,'#c88a48'); });
  cwShRR(-15,-7.8,30,15.6,3.6); cwRR(-15,-7.8,30,15.6,3.6,rpLg(0,-7.8,0,7.8,['#8a4a24','#5a2a12','#2a0e04']));
  rx.save(); rx.beginPath(); rx.roundRect(-15,-7.8,30,15.6,3.6); rx.clip(); for(i=-15;i<15;i+=5) for(j=-8;j<8;j+=7.8){ cwRR(i+0.5,j+0.5,4,6.8,1,rpLg(0,j,0,j+7.8,['#9a5a30','#6b3418','#4a2010'])); rx.fillStyle='rgba(255,210,170,0.25)'; rx.fillRect(i+1,j+1,3,0.7); } rx.restore();
  cwSRR(-15,-7.8,30,15.6,3.6,'rgba(20,6,2,0.8)',0.5);
  cwRR(-8,-5.6,13,11.2,2.6,rpLg(0,-5.6,0,5.6,['#e8b070','#c47a3a','#a05a24'])); cwSRR(-7.4,-5,11.8,10,2.2,'rgba(255,230,190,0.6)',0.4);
  rpEll(-1.5,0,3.6,2.7,0,cwRg(-1.5,0,3.6,'#f6d29a','#a8682a')); rx.strokeStyle='#7a4418'; rx.lineWidth=0.4; rx.beginPath(); rx.moveTo(-4.4,0); rx.lineTo(1.4,0); rx.stroke(); rpEll(-2.6,-1,1.2,0.6,0,'rgba(255,255,255,0.6)');
  cwScreen(7,-5.4,5.4,2.4); cwRR(13.8,-7,2.2,14,1,'#f6ecd8'); rx.fillStyle='#d8c8a8'; for(i=-6;i<7;i+=2.4) rx.fillRect(14.2,i,1.4,1); cwLights(15.4,[-5.2,5.2]);
  rpDisc(-16.2,0,3.4,'#1a1418'); rpDisc(-16.2,0,1.8,'#c88a48'); rpDisc(-16.2,0,0.6,'#6a3a14'); cwTail(-15.1,[-5.8,5.8]); }
function cwPickup(){ var i, k;
  [[-9,-9],[8,-9],[-9,9],[8,9]].forEach(function(q){ cwTyre(q[0],q[1],8,4.6,'#ff4f7a'); });
  cwShRR(-15,-7.6,30,15.2,2.8); cwRR(-15,-7.6,30,15.2,2.8,rpLg(0,-7.6,0,7.6,['#f6d08e','#dca058','#b0702c']));
  rx.save(); rx.beginPath(); rx.roundRect(-15,-7.6,30,15.2,2.8); rx.clip(); rx.strokeStyle='rgba(120,70,20,0.5)'; rx.lineWidth=0.5; rx.beginPath(); for(i=-24;i<24;i+=2.4){ rx.moveTo(i,-8); rx.lineTo(i+7,8); rx.moveTo(i,8); rx.lineTo(i+7,-8); } rx.stroke(); rx.restore();
  cwSRR(-15,-7.6,30,15.2,2.8,'#8a5020',0.5); cwRR(-15,-7.6,30,1.4,0.7,'#ff4f7a'); cwRR(-15,6.2,30,1.4,0.7,'#ff4f7a');
  cwRR(-13.4,-5.8,15,11.6,2,'#8a5424'); cwRR(-13,-5.4,14.2,10.8,1.8,'#a86a2a');
  for(k=0;k<9;k++){ var cx=-11.6+(k%5)*2.8+(k>4?1.4:0), cy=k>4?2:-1.8; rpDisc(cx,cy,2.5,'#e8d8cc'); rpDisc(cx-0.3,cy-0.3,2.2,cwRg(cx,cy,2.4,'#ffffff','#f2e2d6')); rx.strokeStyle='rgba(220,200,190,0.8)'; rx.lineWidth=0.3; rx.beginPath(); rx.arc(cx,cy,1.2,0.4,4); rx.stroke(); }
  rpDisc(-8,0.2,1.7,cwRg(-8,0.2,1.7,'#ff8a8a','#a8081e')); rpDisc(-3,-1.6,1.4,cwRg(-3,-1.6,1.4,'#ff8a8a','#a8081e')); rx.strokeStyle='#4a6a22'; rx.lineWidth=0.35; rx.beginPath(); rx.moveTo(-8,-1.4); rx.quadraticCurveTo(-7,-3,-6,-3.4); rx.stroke();
  cwRR(-5.8,2.4,6,1.1,0.5,'#4a2010'); cwRR(3,-6,9.6,12,2.2,rpLg(0,-6,0,6,['#fff4e0','#f0d6a8'])); cwScreen(9,-4.8,4.8,2.2); cwRR(4,-4.6,3,9.2,0.8,'rgba(40,30,30,0.15)'); cwLights(15,[-5.4,5.4]); cwTail(-15,[-5.6,5.6]); }
function cwVan(){ var i, k, j;
  [[-9,-9],[9,-9],[-9,9],[9,9]].forEach(function(q){ cwTyre(q[0],q[1],8,4.6,'#ffffff'); });
  cwShRR(-15,-7.8,30,15.6,4.2); cwRR(-15,-7.8,30,15.6,4.2,rpLg(0,-7.8,0,7.8,['#d8f2ff','#62c6f2','#2a86d0']));
  rx.fillStyle='#ffffff'; for(i=-14;i<12;i+=3.2){ rx.beginPath(); rx.arc(i+1.6,-7.8,1.6,0,Math.PI); rx.fill(); rx.beginPath(); rx.arc(i+1.6,7.8,1.6,Math.PI,0); rx.fill(); }
  for(i=-13;i<10;i+=6) for(j=-4;j<5;j+=4) rpDisc(i+(j%8?3:0),j,0.5,'rgba(255,255,255,0.8)');
  cwSRR(-15,-7.8,30,15.6,4.2,'#1a5a9a',0.5);
  rx.save(); rx.translate(-3,0); rpSw(1.6,0.8,1.2,0.4); rx.beginPath(); rx.moveTo(-6,-3.2); rx.lineTo(7,0); rx.lineTo(-6,3.2); rx.closePath(); rx.fillStyle='#a8682a'; rx.fill(); rpNos();
  rx.fillStyle=rpLg(0,-3,0,3,['#f6d29a','#d89a4c','#a8682a']); rx.fill(); rx.save(); rx.clip(); rx.strokeStyle='rgba(120,70,20,0.6)'; rx.lineWidth=0.35; rx.beginPath(); for(i=-10;i<10;i+=1.4){ rx.moveTo(i,-4); rx.lineTo(i+3,4); rx.moveTo(i,4); rx.lineTo(i+3,-4); } rx.stroke(); rx.restore();
  rpDisc(-6.4,0,4.4,'#e87aa0'); rpDisc(-6.6,-0.2,4,cwRg(-6.6,0,4,'#fff2f6','#f39ab6')); for(k=0;k<6;k++) rpEll(-6.4+Math.cos(k)*4.1,Math.sin(k)*4.1,0.8,1.3,k,'#f39ab6'); for(k=0;k<7;k++) cwSprinkle(-6.4+Math.cos(k*0.9)*2.2,Math.sin(k*0.9)*2.2,k,k,1.4);
  rpDisc(-7.4,-1.2,0.9,cwRg(-7.4,-1.2,0.9,'#ff8a8a','#a8081e')); rx.restore();
  cwRR(-2,5,8,2.4,0.8,'#ffd447'); rx.fillStyle='rgba(120,80,0,0.6)'; rx.fillRect(-1.4,5.8,6.8,0.4); rpDisc(6.4,-5.4,0.9,'#ffd447');
  cwRR(9,-6.4,4.4,12.8,1.6,'#ffffff'); cwScreen(11.4,-5.6,5.6,2); cwLights(15.2,[-5.6,5.6]); cwTail(-15,[-6,6]); }
function cwCupcar(){ var i, k;
  [[-9,-9],[9,-9],[-9,9],[9,9]].forEach(function(q){ cwTyre(q[0],q[1],8,4.6,'#56c8f5'); });
  cwShRR(-14.6,-7.8,29.2,15.6,5.4); rx.save(); rx.beginPath(); rx.roundRect(-14.6,-7.8,29.2,15.6,5.4); rx.clip();
  for(i=-15;i<15;i+=2.2){ rx.fillStyle=rpLg(i,0,i+2.2,0,(Math.round(i/2.2))%2?['#ff7aa6','#ff9ec0']:['#ffd0e0','#ffb4cc']); rx.fillRect(i,-8,2.2,16); } rx.fillStyle=rpLg(0,-8,0,8,['rgba(255,255,255,0.3)','rgba(0,0,0,0)','rgba(90,0,30,0.18)']); rx.fillRect(-15,-8,30,16); rx.restore();
  cwSRR(-14.6,-7.8,29.2,15.6,5.4,'#d0507a',0.5);
  for(k=3;k>=1;k--){ var r=6.4*k/3, ox=-2+(3-k)*0.6; rpEll(ox,0,r*1.32+1,r+1,0,'#f08ab0'); rpEll(ox,0,r*1.32,r,0,cwRg(ox,0,r*1.32,'#fffbf8','#ffd2e2')); rx.strokeStyle='rgba(240,150,185,0.6)'; rx.lineWidth=0.35; rx.beginPath(); rx.ellipse(ox,0,r*1.32-0.8,r-0.8,0,0.5,4.4); rx.stroke(); }
  for(i=0;i<16;i++) cwSprinkle(-2+Math.cos(i*1.7)*((i*13)%8)*1.1,Math.sin(i*1.7)*((i*11)%6),i,i,1.8);
  [[-9,-4],[-9,4],[4,-5],[4,5]].forEach(function(q){ rpDisc(q[0],q[1],0.9,'#4a2010'); rpDisc(q[0]-0.3,q[1]-0.3,0.3,'rgba(255,220,180,0.6)'); });
  rpDisc(12.6,0,2.8,cwRg(12.6,0,2.8,'#ff8a8a','#a8081e')); rpEll(11.8,-0.9,0.9,0.5,0,'#fff'); rx.strokeStyle='#4a6a22'; rx.lineWidth=0.5; rx.beginPath(); rx.moveTo(10.6,0); rx.quadraticCurveTo(8.6,-1.6,7.6,-1); rx.stroke();
  cwScreen(6.4,-5.6,5.6,2.2); cwLights(14.8,[-5.4,5.4]); cwTail(-14.6,[-5.6,5.6]); }
function cwGummy(){ var i;
  [[-8.6,-8.4],[8.6,-8.4],[-8.6,8.4],[8.6,8.4]].forEach(function(q){ rpDisc(q[0],q[1],3.2,'rgba(240,180,30,0.9)'); rpDisc(q[0],q[1],1.4,'rgba(120,70,0,0.5)'); rpDisc(q[0]-1,q[1]-1,0.9,'rgba(255,255,255,0.8)'); });
  rx.globalAlpha=0.93; rpSw(3,1,1.8,0.4); rpEll(0,0,15.2,7.8,0,'#2ad08a'); rpNos(); rpEll(0,0,15.2,7.8,0,cwRg(0,0,15,'#b8ffe0','#14a060',-0.3,-0.5)); rx.globalAlpha=1;
  rpEll(0.6,0.6,11,5.4,0,'rgba(10,110,70,0.25)'); for(i=0;i<34;i++){ var a=i*2.4, r=(i*7%13)/13; rpDisc(Math.cos(a)*13*r,Math.sin(a)*6.6*r,0.35,'rgba(255,255,255,0.85)'); }
  rpEll(2.6,0,5.4,4.2,0,'rgba(10,80,60,0.4)'); rpEll(2,0,4.4,3.4,0,cwRg(2,0,4.4,'#d8f6ff','#2a6a8a')); rpEll(1,-1.4,1.8,0.8,-0.2,'rgba(255,255,255,0.85)');
  rpEll(-4.8,-4.6,8,1.5,-0.06,'rgba(255,255,255,0.75)'); rpDisc(10.6,-3,1.3,'rgba(255,255,255,0.85)'); cwLights(14.2,[-3.2,3.2],'#fff8c0'); for(i=0;i<9;i++) rpDisc(-12+i*3,5.2,0.5,'rgba(255,255,255,0.75)'); cwTail(-14.6,[-3,3]); }
function cwDonut(){ var i, k, a;
  [[-8,-9.4],[8,-9.4],[-8,9.4],[8,9.4]].forEach(function(q){ cwTyre(q[0],q[1],7.4,4.4,'#ffd447'); });
  rpSw(2.6,1.3,1.8,0.5); rpDisc(0,0,11,'#b8783a'); rpNos(); rpDisc(0,0,11,cwRg(0,0,11,'#f6c48a','#b8783a')); rx.strokeStyle='rgba(255,230,190,0.6)'; rx.lineWidth=0.6; rx.beginPath(); rx.arc(0,0,10.4,0,6.2832); rx.stroke();
  rx.beginPath(); for(a=0;a<6.29;a+=0.12){ var r=9.4+Math.sin(a*6)*0.8+Math.sin(a*13)*0.35; rx.lineTo(Math.cos(a)*r,Math.sin(a)*r); } rx.closePath(); rx.fillStyle=cwRg(0,0,10,'#ffd6e8','#ff5a98'); rx.fill();
  for(k=0;k<7;k++){ a=k*0.9+0.3; rpEll(Math.cos(a)*9.8,Math.sin(a)*9.8,0.9,1.5,a+1.57,'#ff5a98'); }
  rpEll(-3.6,-5.2,3.6,1.3,-0.55,'rgba(255,255,255,0.6)'); for(i=0;i<26;i++){ a=i*0.83; var rr=5.2+((i*37)%30)/10; cwSprinkle(Math.cos(a)*rr,Math.sin(a)*rr,a*2.2,i,2.2); }
  rpDisc(0,0,4.6,'#4a2a20'); rpDisc(0,0,3.8,'#2a1a20'); rpDisc(-0.4,0,2.5,cwRg(-0.4,0,2.5,'#ffffff','#ffd447')); rx.fillStyle='rgba(20,30,70,0.9)'; rx.beginPath(); rx.ellipse(0.8,0,1.1,1.8,0,0,6.2832); rx.fill(); rpEll(0,0,3.8,3.8,0,'rgba(150,215,255,0.3)'); rpEll(-1.2,-1.4,1.6,0.6,-0.3,'rgba(255,255,255,0.8)');
  cwRR(10.6,-4.4,2.6,8.8,1.2,rpLg(10.6,0,13.2,0,['#ffffff','#b8c0d0','#e8ecf4'])); cwLights(13.4,[-3,3]); cwTail(-11,[-2.6,2.6]); }
var CW_RIVALS=[cwJeep,cwPickup,cwVan,cwCupcar,cwGummy,cwDonut];
function cwRival(k,px,py){ rx.save(); rx.translate(px,py); rx.scale(0.63,0.63); CW_RIVALS[((k%6)+6)%6](); rx.restore(); }
/* ── v1.21, the gifts and the hazard (the maintainer's picks of the sketches: «топливо В, монета Б, магнит Б, пузырь Б, суперп А, лужа Б»,
   detailed): a candy-cane fuel canister, a gummy star coin, a red magnet, a sugar ball with a shield, a gift box, a melted-chocolate
   puddle. To be seen they get the highlight «Г1»: a soft halo in the gift's own colour and twinkles of that colour with a dark edge (white
   ones were lost on white chocolate: «ореол и искорки на белом шоколаде не видно»); the coins and the fuel without twinkles («монетки и
   топливо без искорок»). Drawn in gift units, 0.8 of a sprite unit. ── */
var CW_GK=0.8, CW_GC={fuel:['255,58,90','#ff3a5a',8],coin:['255,176,32','#ffb020',7],magnet:['255,58,90','#ff3a5a',7],bubble:['42,138,216','#2a8ad8',7.6],tmagnet:['154,90,232','#9a5ae8',8],tbubble:['154,90,232','#9a5ae8',8]};
var CW_SP=[[1.25,-1.1,1.2],[-1.35,0.6,0.9],[0.4,1.45,0.7],[-0.6,-1.4,0.6]], CW_SUPK=1.6;
function cwStar(X,Y,r,c){ rx.beginPath(); for(var k=0;k<10;k++){ var a=-1.5708+k*0.6283, q=k%2?r*0.45:r; rx.lineTo(X+Math.cos(a)*q,Y+Math.sin(a)*q); } rx.closePath(); rx.fillStyle=c; rx.fill(); }
function cwGSh(f){ rpSw(1.6,0.5,0.8,0.4); f(); rpNos(); }
function cwF(c){ rx.beginPath(); rx.moveTo(-1.4,3.1); rx.lineTo(-1.4,-1.1); rx.lineTo(1.7,-1.1); rx.lineTo(1.7,-0.05); rx.lineTo(-0.25,-0.05); rx.lineTo(-0.25,0.6); rx.lineTo(1.2,0.6); rx.lineTo(1.2,1.6); rx.lineTo(-0.25,1.6); rx.lineTo(-0.25,3.1); rx.closePath(); rx.fillStyle=c; rx.fill(); }
function cwCanister(){ var i;
  cwGSh(function(){ cwRR(-6,-7,12,14.4,2.6,'#000'); }); cwRR(-6,-7,12,14.4,2.6,rpLg(-6,0,6,0,['#b0102a','#ff6a7a','#e0263a','#900820']));
  rx.save(); rx.beginPath(); rx.roundRect(-6,-7,12,14.4,2.6); rx.clip(); rx.fillStyle='rgba(255,255,255,0.9)'; for(i=-16;i<14;i+=4.5){ rx.beginPath(); rx.moveTo(i,-8); rx.lineTo(i+2,-8); rx.lineTo(i+7,8); rx.lineTo(i+5,8); rx.fill(); }
  rx.fillStyle=rpLg(-6,0,6,0,['rgba(0,0,0,0.25)','rgba(255,255,255,0.25)','rgba(0,0,0,0)','rgba(60,0,10,0.3)']); rx.fillRect(-7,-8,14,16); rx.restore();
  cwSRR(-6,-7,12,14.4,2.6,'rgba(120,0,20,0.7)',0.5); cwSRR(-5.2,-6.2,10.4,12.8,2,'rgba(255,255,255,0.5)',0.5);
  cwRR(-4.6,-9.6,4.4,2.4,1,'#900820'); cwSRR(-4.6,-9.6,4.4,2.4,1,'#5a0410',0.4);
  cwRR(1.2,-9.8,3.6,3,0.9,rpLg(1,0,5,0,['#e8b010','#ffe680','#d8a010'])); rx.fillStyle='rgba(120,80,0,0.6)'; for(i=0;i<3;i++) rx.fillRect(1.4,-9.2+i*0.9,3.2,0.3);
  rpDisc(0,0.8,3.8,'#fff'); rx.strokeStyle='#e0263a'; rx.lineWidth=0.4; rx.beginPath(); rx.arc(0,0.8,3.8,0,6.2832); rx.stroke(); if(!RPX) cwF('#1aa86a');   // pixels: the F laid on pixel by pixel
  rpEll(-3.4,-4.4,0.8,2.2,0.2,'rgba(255,255,255,0.75)'); rpDisc(4,5,0.5,'rgba(255,255,255,0.8)'); }
function cwGStar(){ var i; cwGSh(function(){ cwStar(0,0,7.4,'#000'); }); rx.lineJoin='round'; rx.beginPath(); for(i=0;i<10;i++){ var sa=-1.5708+i*0.6283, sq=i%2?3.42:7.6; rx.lineTo(Math.cos(sa)*sq,Math.sin(sa)*sq); } rx.closePath(); rx.strokeStyle='#6b3a10'; rx.lineWidth=1.6; rx.stroke();   // v1.21: a dark edge, seen on the caramel too («на карамельной дороге плохо читаются звездочки» — «звезды Б»)
  cwStar(0,0.4,7.4,'#d88a10'); cwStar(0,0,7.2,rpLg(-6,-6,6,6,['#fff3a0','#ffc030','#f0a010'])); cwStar(-0.3,-0.4,5.2,cwRg(0,0,5.6,'#fffbd8','#ffcc40'));
  for(i=0;i<14;i++){ var a=i*2.3, r=1+(i%5); rx.save(); rx.translate(Math.cos(a)*r,Math.sin(a)*r); rx.rotate(a); rx.fillStyle='rgba(255,255,255,0.95)'; rx.fillRect(-0.3,-0.3,0.6,0.6); rx.restore(); }   // sugar grains
  rpEll(-2,-2.8,1.6,0.7,-0.5,'rgba(255,255,255,0.9)'); rpDisc(2.4,1.6,0.5,'rgba(255,255,255,0.7)'); }
function cwMagnetG(){ var arc=function(){ rx.beginPath(); rx.arc(0,-0.6,5,Math.PI,0); rx.lineTo(5,5.4); rx.moveTo(-5,-0.6); rx.lineTo(-5,5.4); };
  rx.lineCap='butt'; rpSw(1.6,0.5,0.8,0.4); arc(); rx.lineWidth=4.4; rx.strokeStyle='#000'; rx.stroke(); rpNos(); arc(); rx.strokeStyle='#8a0614'; rx.stroke(); arc(); rx.lineWidth=3.6; rx.strokeStyle=rpLg(-7,0,7,0,['#ff6a7a','#e0263a','#a8081e']); rx.stroke();
  rx.beginPath(); rx.arc(0,-0.6,5,3.5,4.7); rx.lineWidth=1.1; rx.strokeStyle='rgba(255,255,255,0.75)'; rx.stroke(); rx.beginPath(); rx.moveTo(-5.8,0.4); rx.lineTo(-5.8,4.4); rx.stroke();
  [[-7.2,4.4],[2.8,4.4]].forEach(function(q){ cwRR(q[0],q[1],4.4,2.8,0.6,rpLg(q[0],0,q[0]+4.4,0,['#a8b0c0','#ffffff','#c8d0dc'])); cwSRR(q[0],q[1],4.4,2.8,0.6,'#7a8290',0.3); });
  cwStar(5.4,-5.4,1.4,'#fff'); }
function cwShield(s,c){ rx.beginPath(); rx.moveTo(0,-3.8*s); rx.lineTo(3.2*s,-2.6*s); rx.lineTo(2.8*s,1.4*s); rx.lineTo(0,4*s); rx.lineTo(-2.8*s,1.4*s); rx.lineTo(-3.2*s,-2.6*s); rx.closePath(); rx.fillStyle=c; rx.fill(); }
function cwSugar(){ var i; cwGSh(function(){ rpDisc(0,0,7.6,'#000'); }); rpDisc(0,0,7.6,cwRg(0,0,7.6,'#ffffff','#7ac0f4')); rx.strokeStyle='rgba(40,120,200,0.6)'; rx.lineWidth=0.5; rx.beginPath(); rx.arc(0,0,7.4,0,6.2832); rx.stroke();
  for(i=0;i<40;i++){ var a=i*2.4, r=(i*13%70)/10; rx.save(); rx.translate(Math.cos(a)*r,Math.sin(a)*r); rx.rotate(a); rx.fillStyle='rgba(255,255,255,0.95)'; rx.fillRect(-0.35,-0.35,0.7,0.7); rx.restore(); }
  if(!RPX){ cwShield(1.15,'#fff'); cwShield(1,rpLg(-3,-3,3,3,['#5ab0ff','#2a7ad8','#1a5aa8'])); rx.beginPath(); rx.moveTo(0,-3.8); rx.lineTo(-3.2,-2.6); rx.lineTo(-2.8,1.4); rx.lineTo(0,4); rx.closePath(); rx.fillStyle='rgba(255,255,255,0.25)'; rx.fill(); cwStar(0,0.2,1.4,'#fff'); }
  rpEll(-3,-4.2,2.2,0.9,-0.6,'rgba(255,255,255,0.95)'); rpDisc(4.4,3.4,0.8,'rgba(255,255,255,0.8)'); }
function cwBox(){ var i, j; cwGSh(function(){ cwRR(-7,-5,14,13,1.6,'#000'); }); cwRR(-7,-5,14,13,1.6,rpLg(-7,0,7,0,['#8a5ad8','#c8a8ff','#b383ff','#6a3ab8']));
  rx.save(); rx.beginPath(); rx.roundRect(-7,-5,14,13,1.6); rx.clip(); for(i=-6;i<8;i+=3) for(j=-4;j<9;j+=3) cwStar(i+(((j+4)/3)%2?1.5:0),j,0.7,'rgba(255,255,255,0.55)'); rx.restore();
  rx.fillStyle=rpLg(-1.6,0,1.6,0,['#d8a010','#ffe680','#e8b010']); rx.fillRect(-1.6,-5,3.2,13); rx.fillStyle=rpLg(0,0,0,3,['#ffe680','#d8a010']); rx.fillRect(-7,0,14,3);
  var loop=function(s){ rx.beginPath(); rx.ellipse(s*2.8,-6.2,3,1.8,s*0.5,0,6.2832); rx.fillStyle=rpLg(s,-8,s*5,-5,['#ffe680','#e8b010']); rx.fill(); rpEll(s*2.8,-6.2,1.4,0.7,s*0.5,'#b88008'); };
  loop(-1); loop(1); rx.beginPath(); rx.moveTo(-0.8,-5.4); rx.lineTo(-2.4,-2.4); rx.lineTo(-1.2,-2.6); rx.closePath(); rx.fillStyle='#e8b010'; rx.fill(); rpDisc(0,-5.8,1.4,cwRg(0,-5.8,1.4,'#fff3a0','#d8a010'));
  cwRR(3,3.6,3.4,2.2,0.5,'#fff'); rx.strokeStyle='#d8a010'; rx.lineWidth=0.3; rx.beginPath(); rx.moveTo(3,4.7); rx.lineTo(1.6,2.6); rx.stroke(); rpEll(-4.6,-3,1.2,2.6,0.2,'rgba(255,255,255,0.45)'); }
function cwChocPud(){ rx.beginPath(); for(var a=0;a<6.3;a+=0.2){ var q=1+0.15*Math.sin(a*4)+0.06*Math.sin(a*9); rx.lineTo(Math.cos(a)*11*q,Math.sin(a)*6.6*q); } rx.closePath(); rx.fillStyle=cwRg(0,0,11,'#8a4a24','#3a1806'); rx.fill();
  rx.strokeStyle='rgba(255,226,192,0.9)'; rx.lineWidth=1; rx.stroke(); rpEll(-3,-2.2,4.4,1.1,-0.15,'rgba(255,230,200,0.35)');
  rx.strokeStyle='rgba(255,220,190,0.3)'; rx.lineWidth=0.5; rx.beginPath(); rx.arc(2,1,2.4,0.3,2.8); rx.stroke(); rpDisc(-6.4,2.2,0.7,'rgba(255,220,190,0.3)'); rpDisc(5.6,-2.4,0.5,'rgba(255,220,190,0.3)'); }
var CW_GD={fuel:cwCanister,coin:cwGStar,magnet:cwMagnetG,bubble:cwSugar,tmagnet:cwBox,tbubble:cwBox};
function cwGiftSprite(t,big){ var f=CW_GD[t]||cwGStar, k=big?CW_SUPK:1, sp=rSprite('cg'+t+(big?'B':''),18*k,19*k,function(){ RP.ds=hs*rKS()*CW_GK*k; rx.scale(CW_GK*k,CW_GK*k); f(); });
  if(RPX&&t==='fuel') return rPxIcon(sp,PX_F,{1:'#1aa86a'},1); if(RPX&&t==='bubble') return rPxIcon(sp,PX_SHIELD,{1:'#2a7ad8',2:'#ffffff'},0); return sp; }
function cwHalo(t,k){ var c=CW_GC[t]||CW_GC.coin, R=c[2]*(k||1), d=R*3.4*CW_GK+1; return rSprite('ch'+t+(k?'B':''),d,d,function(){ rx.scale(CW_GK,CW_GK); var g=rx.createRadialGradient(0,0,R*0.3,0,0,R*1.7);
  g.addColorStop(0,'rgba('+c[0]+',0.69)'); g.addColorStop(0.55,'rgba('+c[0]+',0.31)'); g.addColorStop(1,'rgba('+c[0]+',0)'); rx.fillStyle=g; rx.beginPath(); rx.arc(0,0,R*1.7,0,6.2832); rx.fill(); }); }
/* the puddle 15% smaller than first drawn, its cream rim brighter (the audit: «лужа нарисована больше, чем тормозит»; on the waffle it was brown on brown) */
function cwPudSprite(rr){ return rSprite('cpud'+rr,rr*2.7*SU,rr*1.7*SU,function(){ var r=rr*SU; rx.scale(r*0.91/11,r*0.54/6.6); cwChocPud(); },true); }
/* the twinkles, live: each breathes on its own beat (HD only) */
function cwTwinkles(t,X,Y,tm,id,k){ var c=CW_GC[t]; if(!c||RPX||t==='fuel'||t==='coin') return;   // none in pixels («в пиксельной версии искорки будут мешаться»)
  var u=rKS()*CW_GK*(k||1), R=c[2];
  CW_SP.forEach(function(q,j){ var b=0.55+0.45*Math.sin(tm*4+id*1.7+j*1.9); if(b<0.2) return; var x=X+q[0]*R*u, y=Y+q[1]*R*u, s=q[2]*3.4*u*b;
    hx.beginPath(); hx.moveTo(x,y-s); hx.quadraticCurveTo(x,y,x+s,y); hx.quadraticCurveTo(x,y,x,y+s); hx.quadraticCurveTo(x,y,x-s,y); hx.quadraticCurveTo(x,y,x,y-s); hx.closePath();
    hx.strokeStyle='rgba(60,20,30,0.55)'; hx.lineWidth=0.5*u; hx.stroke(); hx.fillStyle=c[1]; hx.fill(); hx.fillStyle='#fff'; hx.beginPath(); hx.arc(x,y,s*0.22,0,6.2832); hx.fill(); }); }
/* the super gift: half as big again, its halo breathing (pixels: a dithered violet ring, as before in gold) */
function cwSuper(t,X,Y,tm,id){ var u=rKS(), bob=Math.sin(tm*3+id)*0.8*K, s=cwGiftSprite(t,true), y=Y+bob, i, j;
  if(RPX){ var x=Math.round(X), R0=Math.round((14+Math.sin(tm*6))*u); y=Math.round(y); hx.fillStyle='#c8a0ff'; for(j=-R0;j<=R0;j++) for(i=-R0;i<=R0;i++){ var d2=i*i+j*j; if(d2<=R0*R0&&d2>=(R0-4)*(R0-4)&&((i+j+Math.floor(tm*6))&1)===0) hx.fillRect(x+i,y+j,1,1); }
    rBlit(s,x,y,0); return; }
  var h=cwHalo(t,CW_SUPK), hk=1+0.12*Math.sin(tm*6); hx.drawImage(h.c,X-h.w*hk/2,y-h.h*hk/2,h.w*hk,h.h*hk); rBlit(s,X,y,0); cwTwinkles(t,X,y,tm,id,CW_SUPK); }
/* one gift on the road: the halo, the gift (the coin turning), the twinkles */
function cwGiftDraw(s,t,X,Y,tm,id){ if(t[0]==='t'){ cwSuper(t,X,Y,tm,id); return; } Y+=Math.sin(tm*3+id)*0.8*K; if(RPX){ X=Math.round(X); Y=Math.round(Y); }
  if(!RPX) rBlit(cwHalo(t),X,Y,0);
  if(t==='coin'){ var f=Math.abs(Math.cos(tm*4+id));
    if(RPX){ var cw=Math.max(2,Math.round(s.w*(0.35+0.65*f)/2)*2); hx.drawImage(s.c,Math.round(X-cw/2),Math.round(Y-s.h/2),cw,s.h); }
    else { hx.save(); hx.translate(X,Y); hx.scale(0.35+0.65*f,1); hx.drawImage(s.c,-s.w/2,-s.h/2,s.w,s.h); hx.restore(); } }
  else rBlit(s,X,Y,0);
  cwTwinkles(t,X,Y,tm,id); }
/* ── v1.21, the effects (the maintainer's picks of the sketches: «выхлоп В, турбо Б, магнит А (поменьше и потоньше), пузырь-щит А,
   сбор подарка А, лужа Б, авария Б»): soda bubbles and sugar sparks behind the car, a rainbow ribbon for the turbo, striped candy arcs
   for the magnet, a blue sugar ball for the shield, sprinkles in the gift's colours when one is taken, a chocolate track and blots after
   a puddle, cookie crumbs and stars circling over the car after a crash. Car-frame units: sprite units (ks logical px each). ── */
var CW_BURST={coin:['#ffb020','#fff2b0','#ffffff','#ffb020'],fuel:['#ff3a5a','#ffd0d8','#ffffff','#ff3a5a'],magnet:['#ff3a5a','#ffd0d8','#ffffff','#ff3a5a'],bubble:['#2a8ad8','#cfe8ff','#ffffff','#2a8ad8'],
  tmagnet:['#9a5ae8','#ecdcff','#ffd447','#9a5ae8'],tbubble:['#9a5ae8','#ecdcff','#ffd447','#9a5ae8'],crash:['#c88a48','#8a4a24','#f0c890','#6b3418']};
var CW_RAIN=['#ff5d8f','#ffb020','#ffd447','#7ad66b','#56c8f5','#b383ff'], CW_TR=[], cwDazeT=-9;
function cwH(i,k){ return rHash(i,k)/4294967296; }
function cwStar5(c,X,Y,r,col,edge,lw){ c.beginPath(); for(var k=0;k<10;k++){ var a=-1.5708+k*0.6283, q=k%2?r*0.45:r; c.lineTo(X+Math.cos(a)*q,Y+Math.sin(a)*q); } c.closePath(); c.fillStyle=col; c.fill(); if(edge){ c.strokeStyle=edge; c.lineWidth=lw; c.stroke(); } }
function cwTw(X,Y,s,col,edge,lw){ hx.beginPath(); hx.moveTo(X,Y-s); hx.quadraticCurveTo(X,Y,X+s,Y); hx.quadraticCurveTo(X,Y,X,Y+s); hx.quadraticCurveTo(X,Y,X-s,Y); hx.quadraticCurveTo(X,Y,X,Y-s); hx.closePath(); hx.strokeStyle=edge; hx.lineWidth=lw; hx.stroke(); hx.fillStyle=col; hx.fill(); hx.fillStyle='#fff'; hx.beginPath(); hx.arc(X,Y,s*0.2,0,6.2832); hx.fill(); }
/* the track: where the car was over the last moment (logical px), and whether it was in chocolate */
function cwTrack(s,Y,dd){ var n=CW_TR.length; if(n&&(CW_TR[n-1].t>clock||dd<CW_TR[n-1].d)) CW_TR.length=0; CW_TR.push({t:clock,y:Y,on:s.syrup>0,d:dd}); while(CW_TR.length&&((dd-CW_TR[0].d)*K>LW||CW_TR.length>900)) CW_TR.shift(); }   // dd: how far the race has gone, so the marks keep to the road
function cwTrackOn(){ for(var i=CW_TR.length-1;i>=0&&clock-CW_TR[i].t<0.9;i--) if(CW_TR[i].on) return true; return false; }
/* the shapes in the car's frame (hx at the car's point, turned) */
function cwSoda(ks,sp){ var i, j;
  for(i=0;i<8;i++){ var ph=(clock*1.6+i/8)%1, sd=cwH(i,7)-0.5, X=(-12-ph*26*(0.6+0.4*sp))*ks, Y=sd*(2+ph*9)*ks, r=(1.4-ph*0.6+cwH(i,9)*0.5)*ks; hx.globalAlpha=1-ph*0.7;
    hx.beginPath(); hx.arc(X,Y,r,0,6.2832); hx.fillStyle='rgba(255,170,215,0.4)'; hx.fill(); hx.strokeStyle='#ff5fa8'; hx.lineWidth=0.35*ks; hx.stroke(); hx.fillStyle='#fff'; hx.beginPath(); hx.arc(X-r*0.35,Y-r*0.35,r*0.3,0,6.2832); hx.fill(); }
  for(j=0;j<3;j++){ var q=(clock*1.2+j/3)%1; hx.globalAlpha=1-q; cwTw((-14-q*20)*ks,[-3.4,3.6,-1.4][j]*ks,(1.6-q*0.7)*ks,'#ffd447','rgba(90,40,20,0.6)',0.35*ks); } hx.globalAlpha=1; }
function cwRainbow(ks){ var i, X; hx.lineWidth=1.3*ks; hx.lineCap='butt';
  for(i=0;i<6;i++){ var y0=(i-2.5)*1.25; hx.strokeStyle=CW_RAIN[i]; for(X=-11;X>-62;X-=2){ var d=(-11-X)/51, X2=X-2.2, d2=(-11-X2)/51; hx.globalAlpha=1-d;
    hx.beginPath(); hx.moveTo(X*ks,(y0*(1+d*0.9)+Math.sin(X*0.22+clock*14)*d*2.4)*ks); hx.lineTo(X2*ks,(y0*(1+d2*0.9)+Math.sin(X2*0.22+clock*14)*d2*2.4)*ks); hx.stroke(); } }
  for(i=0;i<3;i++){ var q=(clock*1.5+i/3)%1; hx.globalAlpha=1-q; cwStar5(hx,(-24-q*36)*ks,[-8.5,7.5,-4][i]*(0.8+q*0.4)*ks,(1.5-q*0.6)*ks,['#ffd447','#ff8ac0','#56c8f5'][i],'rgba(90,40,20,0.7)',0.3*ks); } hx.globalAlpha=1; }
function cwBlots(ks,a){ hx.globalAlpha=a; [[-4,-2.6,1.3],[3,2,1],[7,-1.6,0.8],[-8,1.8,0.9]].forEach(function(q){ hx.beginPath(); for(var b=0;b<6.3;b+=0.5){ var s=q[2]*(1+0.25*Math.sin(b*3)); hx.lineTo((q[0]+Math.cos(b)*s)*ks,(q[1]+Math.sin(b)*s)*ks); } hx.closePath(); hx.fillStyle='#5a2a12'; hx.fill();
  hx.fillStyle='rgba(255,220,190,0.6)'; hx.beginPath(); hx.arc((q[0]-q[2]*0.3)*ks,(q[1]-q[2]*0.3)*ks,q[2]*0.3*ks,0,6.2832); hx.fill(); }); hx.globalAlpha=1; }
/* around the car, not turned */
function cwMagArcs(X,Y,ks){ hx.lineCap='butt'; for(var m=0;m<3;m++){ var ph=(clock*1.4+m/3)%1, R=(9+ph*20)*ks; hx.globalAlpha=1-ph*0.75; hx.beginPath(); hx.arc(X,Y,R,-0.75,0.75);
  hx.strokeStyle='rgba(90,10,30,0.5)'; hx.lineWidth=1.15*ks; hx.stroke(); hx.strokeStyle='#ff3a5a'; hx.lineWidth=0.8*ks; hx.stroke(); hx.setLineDash([1.1*ks,1.1*ks]); hx.strokeStyle='#fff'; hx.stroke(); hx.setLineDash([]); } hx.globalAlpha=1; }
function cwSugarBall(X,Y,ks){ var R=14*ks, g=hx.createRadialGradient(X,Y,R*0.5,X,Y,R), i; g.addColorStop(0,'rgba(120,190,255,0.06)'); g.addColorStop(0.8,'rgba(90,170,255,0.3)'); g.addColorStop(1,'rgba(50,130,235,0.65)');
  hx.fillStyle=g; hx.beginPath(); hx.arc(X,Y,R,0,6.2832); hx.fill(); hx.strokeStyle='rgba(20,80,170,0.9)'; hx.lineWidth=0.5*ks; hx.stroke(); hx.fillStyle='#fff';
  for(i=0;i<34;i++){ var a=cwH(i,31)*6.2832+clock*0.5, q=R*(0.78+cwH(i,37)*0.2), z=0.8*ks; hx.save(); hx.translate(X+Math.cos(a)*q,Y+Math.sin(a)*q); hx.rotate(a); hx.fillRect(-z/2,-z/2,z,z); hx.restore(); }
  hx.fillStyle='rgba(255,255,255,0.9)'; hx.beginPath(); hx.ellipse(X-R*0.42,Y-R*0.55,R*0.32,R*0.12,-0.6,0,6.2832); hx.fill(); hx.beginPath(); hx.arc(X+R*0.55,Y+R*0.45,0.8*ks,0,6.2832); hx.fill(); }
function cwDaze(X,Y,ks){ var age=clock-cwDazeT; if(age<0||age>1.5) return; hx.globalAlpha=Math.min(1,(1.5-age)*3); var cx=X+2*ks, cy=Y-11*ks;
  hx.strokeStyle='rgba(255,255,255,0.7)'; hx.lineWidth=0.4*ks; hx.beginPath(); hx.ellipse(cx,cy,8*ks,2.6*ks,0,0,6.2832); hx.stroke();
  for(var k=0;k<3;k++){ var a=clock*5+k*2.094, s=Math.sin(a); cwStar5(hx,cx+Math.cos(a)*8*ks,cy+s*2.6*ks,(1.7+0.3*s)*ks,'#ffd447','rgba(90,40,20,0.8)',0.3*ks); } hx.globalAlpha=1; }
/* the track the car presses into the road, two glossy ruts from the rear wheels, left on the road till it goes off the screen (v1.22: «давай след от машинки не будет исчезающим.. просто остается и уходит за экран»; first «добавить машинке эффект
   небольшого следа, типа она проминает под собой дорогу.. исчезающий след» — «след Г»); darker in the road's own colour */
var CW_RUT={vil:'110,80,50',for:'50,25,8',mnt:'90,40,8'};
function cwRutCol(vd){ var i=Math.floor((vd+Race.CAR_X)/RCW), z=cwZone(i); return CW_RUT[CW_Z[(z.t0+z.t1)/2>0.5?z.b:z.a]]||CW_RUT.vil; }
function cwRuts(X,dd,ks,col){ var x0=X-6*ks, i, w, k; hx.lineCap='butt';
  for(i=CW_TR.length-1;i>0;i--){ var p=CW_TR[i], q=CW_TR[i-1], x1=x0-(dd-p.d)*K, x2=x0-(dd-q.d)*K; if(x1<-4) break;
    for(k=-1;k<=1;k+=2){ w=k*5*ks; var y1=p.y+w, y2=q.y+w;
      hx.strokeStyle='rgba('+col+',0.38)'; hx.lineWidth=2.4*ks; hx.beginPath(); hx.moveTo(x1,y1); hx.lineTo(x2,y2); hx.stroke();
      hx.lineWidth=0.45*ks; hx.strokeStyle='rgba(255,255,255,0.5)'; hx.beginPath(); hx.moveTo(x1,y1+1.35*ks); hx.lineTo(x2,y2+1.35*ks); hx.stroke();
      hx.lineWidth=0.4*ks; hx.strokeStyle='rgba('+col+',0.35)'; hx.beginPath(); hx.moveTo(x1,y1-1.3*ks); hx.lineTo(x2,y2-1.3*ks); hx.stroke();
      hx.lineWidth=0.5*ks; hx.strokeStyle='rgba(255,255,255,0.75)'; hx.beginPath(); hx.moveTo(x1,y1-0.3*ks); hx.lineTo(x2,y2-0.3*ks); hx.stroke(); } } }
function cwRutsPx(x,dd,u,col){ var x0=x-6*u, i, k, c=col.split(','), dark='rgb('+Math.round(c[0]*0.9+40)+','+Math.round(c[1]*0.9+40)+','+Math.round(c[2]*0.9+40)+')';
  for(i=CW_TR.length-1;i>0;i--){ var p=CW_TR[i], tx=Math.round(x0-(dd-p.d)*K), tx2=Math.round(x0-(dd-CW_TR[i-1].d)*K); if(tx<-2) break; var wd=Math.max(1,tx-tx2);
    for(k=-1;k<=1;k+=2){ var ty=Math.round(p.y+k*5*u); hx.fillStyle=dark; hx.fillRect(tx-wd+1,ty-1,wd,2); hx.fillStyle='#fff6e0'; hx.fillRect(tx-wd+1,ty+1,wd,1); } } }
/* the chocolate track: two streaks from the rear wheels where the car went through the puddle */
function cwTrail(X,dd,ks){ if(!cwTrackOn()) return; hx.strokeStyle='#4a2410'; hx.lineCap='round';
  for(var i=CW_TR.length-1;i>0;i--){ var p=CW_TR[i], q=CW_TR[i-1]; if(!p.on||!q.on) continue; var x1=X-9*ks-(dd-p.d)*K, x2=X-9*ks-(dd-q.d)*K, d=(clock-q.t)/0.9; if(d>=1) continue; hx.globalAlpha=(1-d)*0.85; hx.lineWidth=1.8*(1-d*0.5)*ks;
    [-5.6,5.6].forEach(function(w){ hx.beginPath(); hx.moveTo(x1,p.y+w*ks); hx.lineTo(x2,q.y+w*ks); hx.stroke(); }); } hx.globalAlpha=1; }
/* the player's car with all of it (HD) */
function cwPlayer(rg,s,X,Y,blink){ var ks=K/SU*rCarK, sp=Math.min(1,(rg.v||40)/120), sy=s.syrup>0?Math.min(1,s.syrup/0.3):0; cwTrack(s,Y,rg.d);
  cwRuts(X,rg.d,ks,cwRutCol(rg.d)); cwTrail(X,rg.d,ks);
  if(s.magnet>0&&(s.magnet>2||Math.floor(clock*8)%2)) cwMagArcs(X,Y,ks);
  if(!blink){ hx.save(); hx.translate(X,Y); hx.rotate(rTilt); if(s.turbo>0) cwRainbow(ks); cwSoda(ks,sp); hx.restore();
    var cs=rCarSprite(0,true); if(rCarK!==1){ hx.save(); hx.translate(X,Y); hx.rotate(rTilt); hx.drawImage(cs.c,-cs.w*rCarK/2,-cs.h*rCarK/2,cs.w*rCarK,cs.h*rCarK); hx.restore(); } else rBlit(cs,X,Y,rTilt);
    if(sy){ hx.save(); hx.translate(X,Y); hx.rotate(rTilt); cwBlots(ks,sy); hx.restore(); } }
  if(s.bubble>0&&(s.bubble>3||Math.floor(clock*8)%2)) cwSugarBall(X,Y,ks);
  cwDaze(X,Y,ks); }
/* the same in whole pixels */
function cwPx(x,y,c){ hx.fillStyle=c; hx.fillRect(Math.round(x),Math.round(y),1,1); }
function cwPlayerPx(rg,s,X,Y,blink){ var u=K/SU*rCarK, sp=Math.min(1,(rg.v||40)/120), x=Math.round(X), y=Math.round(Y), i, j, m; cwTrack(s,y,rg.d);
  cwRutsPx(x,rg.d,u,cwRutCol(rg.d));
  if(cwTrackOn()) for(i=CW_TR.length-1;i>0;i--){ var p=CW_TR[i]; if(clock-p.t>0.9) break; if(!p.on||((clock-p.t)/0.9>0.6&&i%2)) continue; var tx=Math.round(x-9*u-(rg.d-p.d)*K); hx.fillStyle='#4a2410'; hx.fillRect(tx,Math.round(p.y-5.6*u)-1,2,2); hx.fillRect(tx,Math.round(p.y+5.6*u)-1,2,2); }
  if(s.magnet>0&&(s.magnet>2||Math.floor(clock*8)%2)) for(m=0;m<3;m++){ var ph=(clock*1.4+m/3)%1, R=(9+ph*20)*u; if(ph>0.8) continue; for(var a=-0.75,n=0;a<=0.75;a+=1/R,n++) cwPx(x+Math.cos(a)*R,y+Math.sin(a)*R,(Math.floor(n/2)%2)?'#ffffff':'#e8284a'); }
  if(!blink){
    if(s.turbo>0) for(i=0;i<6;i++){ var y0=(i-2.5)*1.25; hx.fillStyle=CW_RAIN[i]; for(j=11;j<56;j++){ var d=(j-11)/45; if(cwH(i*64+j,Math.floor(clock*12))<d) continue; hx.fillRect(Math.round(x-j*u*0.9),Math.round(y+(y0*(1+d*0.9)+Math.sin(-j*0.22+clock*14)*d*2.4)*u),1,Math.max(1,Math.round(u))); } }
    for(i=0;i<8;i++){ var q=(clock*1.6+i/8)%1; if(q>0.8) continue; var bx=x+(-12-q*26*(0.6+0.4*sp))*u, by=y+(cwH(i,7)-0.5)*(2+q*9)*u; hx.fillStyle='#ff5fa8'; hx.fillRect(Math.round(bx)-1,Math.round(by)-1,2,2); cwPx(bx-1,by-1,'#ffffff'); }
    for(j=0;j<3;j++){ var q2=(clock*1.2+j/3)%1; if(q2>0.7) continue; var tx2=Math.round(x+(-14-q2*20)*u), ty2=Math.round(y+[-3.4,3.6,-1.4][j]*u); hx.fillStyle='#ffd447'; hx.fillRect(tx2-1,ty2,3,1); hx.fillRect(tx2,ty2-1,1,3); }
    var cs=rCarSprite(0,true,rTilt); if(rCarK!==1) hx.drawImage(cs.c,Math.round(x-cs.w*rCarK/2),Math.round(y-cs.h*rCarK/2),cs.w*rCarK,cs.h*rCarK); else rBlit(cs,x,y,0);
    if(s.syrup>0){ hx.fillStyle='#5a2a12'; [[-4,-2.6],[3,2],[7,-1.6],[-8,1.8]].forEach(function(b){ hx.fillRect(Math.round(x+b[0]*u)-1,Math.round(y+b[1]*u)-1,2,2); }); } }
  if(s.bubble>0&&(s.bubble>3||Math.floor(clock*8)%2)){ var R0=Math.round(14*u); pxRing(x,y,R0,'rgba(0,0,0,0)','rgba(90,170,255,0.45)'); pxRing(x,y,R0,'#2a7ad8'); pxRing(x,y,R0-1,'rgba(207,232,255,0.8)');
    for(i=0;i<10;i++){ var a2=cwH(i,31)*6.2832+clock*0.5; cwPx(x+Math.cos(a2)*(R0-2),y+Math.sin(a2)*(R0-2),'#ffffff'); } hx.fillStyle='#ffffff'; hx.fillRect(x-Math.round(R0*0.55),y-Math.round(R0*0.55),Math.max(2,Math.round(R0*0.3)),1); }
  var age=clock-cwDazeT; if(age>=0&&age<1.5) for(m=0;m<3;m++){ var a3=clock*5+m*2.094, sx=Math.round(x+2*u+Math.cos(a3)*8*u), sy2=Math.round(y-11*u+Math.sin(a3)*2.6*u); hx.fillStyle='#2a1420'; hx.fillRect(sx-2,sy2-1,5,3); hx.fillRect(sx-1,sy2-2,3,5); hx.fillStyle='#ffd447'; hx.fillRect(sx-1,sy2,3,1); hx.fillRect(sx,sy2-1,1,3); } }
/* one spark of the candy race (raceParts): a sprinkle turning as it flies, or a cookie crumb */
function cwPart(p,f,c){ var z=K/SU*1.4, age=p.max-p.life; hx.save(); hx.translate(p.x,p.y); hx.rotate(p.a+age*(p.k-0.5)*16);
  if(p.sh==='spr'){ hx.beginPath(); hx.roundRect(-1.2*z,-0.4*z,2.4*z,0.8*z,0.4*z); hx.fillStyle=c; hx.fill(); hx.strokeStyle='rgba(60,20,30,0.35)'; hx.lineWidth=0.2*z; hx.stroke(); }
  else { var s=(0.6+p.k*0.9)*z; hx.beginPath(); for(var k=0;k<5;k++){ var b=k*1.256+cwH(k,p.k*1e6|0)*0.5, q=s*(0.7+cwH(k+9,p.k*1e6|0)*0.5); hx.lineTo(Math.cos(b)*q,Math.sin(b)*q); } hx.closePath(); hx.fillStyle=c; hx.fill(); hx.strokeStyle='rgba(40,15,5,0.5)'; hx.lineWidth=0.2*z; hx.stroke(); }
  hx.restore(); }
