/* ── SONARACE: THE RACE'S HD DRAWING (v0.84; the lands themselves are in 48_racecandy.js since v1.20–1.21, 48_racepirate.js and
   48_racenote.js — the first candy land of v0.84 was dropped in v1.21 when the new one had taken its place). Drawn smooth on the HD canvas, seen from above; the road comes from the race core
   (src/14_race.js), the land along it is made in chunks of 120 field units (baked once into off-screen canvases, from the race's seed and the
   chunk's number — the same land for the same race), the cars and gifts are drawn live.
   Units: the sketches were drawn in «sketch pixels» on a 195-pixel-high screen, so a field unit is SU = 195/180 of them; KS turns them into
   game pixels on this phone. ── */
var SU=195/180, RC={seed:-1,ch:{},zones:null,sp:{},key:''}, rx=null, RCW=120, rX0=null;
function rKS(){ return K/SU; }
function rR(seed){ var s=((seed>>>0)%2147483646)+1; return function(){ s=(s*16807)%2147483647; return (s-1)/2147483646; }; }
function rHash(a,b){ var h=Math.imul((a>>>0)^0x9e3779b9,0x85ebca6b)^Math.imul((b|0)+0x632be5ab,0xc2b2ae35); h^=h>>>15; h=Math.imul(h,0x27d4eb2f); return (h^(h>>>13))>>>0; }
/* ── the land in chunks ── */
/* the chunk's road in sketch pixels, sampled every 2: its middle and half-width at local x */
function rChunkRoad(rg,i){ var x0=i*RCW, n=Math.ceil(RCW*SU/2)+6, m=[], w=[];
  for(var k=0;k<n;k++){ var px=-4+k*2, a=Race.at(rg,x0+px/SU); m.push(a.c*SU); w.push(a.hw*SU); } return {m:m,w:w}; }
function rAt(road,px){ var f=(px+4)/2, k=Math.max(0,Math.min(road.m.length-2,Math.floor(f))), u=Math.max(0,Math.min(1,f-k)); return [road.m[k]+(road.m[k+1]-road.m[k])*u,road.w[k]+(road.w[k+1]-road.w[k])*u]; }
function rRoadPath(road,off){ rx.beginPath(); var n=road.m.length, k; for(k=0;k<n;k++) rx.lineTo(-4+k*2,road.m[k]-road.w[k]-off); for(k=n-1;k>=0;k--) rx.lineTo(-4+k*2,road.m[k]+road.w[k]+off); rx.closePath(); }
function rEdge(road,sd,off){ rx.beginPath(); for(var k=0;k<road.m.length;k++) rx.lineTo(-4+k*2,road.m[k]+sd*(road.w[k]+off)); }
function rOff(road,px,py,m){ var a=rAt(road,px); return Math.abs(py-a[0])>a[1]+m; }
/* one chunk of the land: made once, kept while it is on screen */
function rChunk(rg,i){ var c=RC.ch[i]; if(c) return c;
  var KS=rKS(), W=RCW*SU, H=LH/KS, o=hdOff(RCW*K+3,LH,hs); rx=o.x; rx.setTransform(hs*KS,0,0,hs*KS,0,0);
  if(RSKIN==='note'){ noteChunk(rg,i,W,H); if(RPX) pxHard(o.c,false); return RC.ch[i]={c:o.c,w:RCW*K+3,h:LH}; }
  if(RSKIN==='candy'){ var ovc=candyChunk(rg,i,W,H); if(RPX){ pxHard(o.c,false); if(ovc) pxHard(ovc,false); } return RC.ch[i]={c:o.c,w:RCW*K+3,h:LH,o:ovc}; }   // v1.20: the candy land redrawn (48_racecandy.js)
  if(RSKIN==='pirate'){ var ov=pirateChunk(rg,i,W,H); if(RPX) pxHard(o.c,false); return RC.ch[i]={c:o.c,w:RCW*K+3,h:LH,o:ov}; }
  c=RC.ch[i]={c:o.c,w:RCW*K+3,h:LH}; return c; }
/* a land per race and scale: the menu's race, the backdrop, the drawn phone's screen and the real race each keep their own (v0.87) */
var RCS={}, RCN=[];
function rReset(seed){ var key=seed+'|'+LW+'x'+LH+'x'+hs+(RPX?'px':'')+RSKIN; if(RC.key===key) return; var c=RCS[key];
  if(!c){ c=RCS[key]={seed:seed,key:key,ch:{},zones:null,sp:{}}; RCN.push(key); while(RCN.length>5){ delete RCS[RCN.shift()]; } }
  RC=c; }
/* ── the cars, the gifts: small sprites, made once per colour ── */
var R_CARS=[['#e040c0','#8a1070'],['#ffb52e','#b06a00'],['#4fb8ff','#1a6aa8'],['#2f47c9','#141d66'],['#f4ecff','#8a78b8'],['#e8284a','#8a0c20']], R_PLAYER=['#2fe0b0','#0f8a6a'];
function rCar(px,py,body,dark,player){ var L=19, W=10, glass='rgba(40,20,60,0.75)';
  rx.fillStyle='rgba(40,10,30,0.22)'; rx.beginPath(); rx.roundRect(px-L/2+1.5,py-W/2+2,L,W,4); rx.fill();
  rx.fillStyle='#2a1a28'; [[-6,-5.4],[5,-5.4],[-6,5.4],[5,5.4]].forEach(function(w){ rx.beginPath(); rx.roundRect(px+w[0]-2.2,py+w[1]-1.3,4.4,2.6,1); rx.fill(); });
  var g=rx.createLinearGradient(0,py-W/2,0,py+W/2); g.addColorStop(0,'#ffffff'); g.addColorStop(0.18,body); g.addColorStop(1,dark); rx.fillStyle=g;
  rx.beginPath(); rx.roundRect(px-L/2,py-W/2,L,W,[4,5,5,4]); rx.fill(); rx.strokeStyle=dark; rx.lineWidth=0.6; rx.stroke();
  rx.fillStyle=glass; rx.beginPath(); rx.roundRect(px-2,py-3.3,7,6.6,2.5); rx.fill(); if(RPX){ rx.strokeStyle='#a8dcff'; rx.lineWidth=1; rx.stroke(); } rx.fillStyle='rgba(255,255,255,0.7)'; rx.beginPath(); rx.roundRect(px-1.2,py-2.6,2.4,1.4,0.7); rx.fill();
  if(player){ rx.fillStyle='#ffffff'; rx.fillRect(px-L/2+1,py-0.8,5,1.6); rx.fillStyle='rgba(255,240,180,0.95)'; rx.beginPath(); rx.ellipse(px+L/2-0.5,py-3,0.9,1.3,0,0,6.2832); rx.ellipse(px+L/2-0.5,py+3,0.9,1.3,0,0,6.2832); rx.fill(); }
  else { rx.fillStyle='rgba(255,60,60,0.9)'; rx.fillRect(px-L/2,py-3.6,0.9,1.6); rx.fillRect(px-L/2,py+2,0.9,1.6); } }
/* v0.86: the player's car — a rocket car (the maintainer: «наша машинка должна быть непохожа на все остальные, не только цветом», his pick
   «В»): a long round mint body with a pink nose cone, two pink fins at the back, a round window; the candy exhaust puffs are drawn live */
function rFuelBody(px,py){ rFuel.noF=true; rFuel(px,py); rFuel.noF=false; }
function rFuel(px,py){ rx.fillStyle='rgba(0,0,0,0.18)'; rx.beginPath(); rx.ellipse(px+1,py+6,5,1.6,0,0,6.2832); rx.fill();
  rx.fillStyle='#3fd07a'; rx.beginPath(); rx.roundRect(px-3.5,py-3,7,9,2.2); rx.fill(); rx.fillRect(px-1.4,py-6.5,2.8,4); rx.fillStyle='#e8363a'; rx.fillRect(px-1.8,py-7.5,3.6,1.6);
  rx.strokeStyle='#1a6a3a'; rx.lineWidth=0.5; rx.beginPath(); rx.roundRect(px-3.5,py-3,7,9,2.2); rx.stroke(); rx.fillStyle='rgba(255,255,255,0.45)'; rx.fillRect(px-2.8,py-2,0.7,6);
  /* v0.96: a big F on the bottle (the maintainer: «на бутылочках с топливом должна быть большая буква F») */
  if(rFuel.noF) return; rx.beginPath(); rx.moveTo(px-1.7,py+4.6); rx.lineTo(px-1.7,py-2); rx.lineTo(px+2.3,py-2); rx.lineTo(px+2.3,py-0.7); rx.lineTo(px-0.35,py-0.7); rx.lineTo(px-0.35,py+0.8); rx.lineTo(px+1.7,py+0.8); rx.lineTo(px+1.7,py+2.1); rx.lineTo(px-0.35,py+2.1); rx.lineTo(px-0.35,py+4.6); rx.closePath();
  rx.fillStyle='#ffffff'; rx.fill(); rx.strokeStyle='#0f5a2e'; rx.lineWidth=0.45; rx.stroke(); }
function rCoin(px,py){ rx.fillStyle='rgba(0,0,0,0.16)'; rx.beginPath(); rx.ellipse(px+1,py+4.2,3.8,1.2,0,0,6.2832); rx.fill();
  rx.fillStyle='#c8841a'; rx.beginPath(); rx.arc(px,py,4.2,0,6.2832); rx.fill(); rx.fillStyle='#ffd23f'; rx.beginPath(); rx.arc(px,py,3.5,0,6.2832); rx.fill();
  rx.strokeStyle='#e8a020'; rx.lineWidth=0.6; rx.beginPath(); rx.arc(px,py,2.5,0,6.2832); rx.stroke();
  if(rCoin.noStar) return; rx.fillStyle='#ff4f7a'; rx.beginPath(); for(var k=0;k<10;k++){ var a=-Math.PI/2+k*Math.PI/5, rr=k%2?0.8:1.8; rx.lineTo(px+Math.cos(a)*rr,py+Math.sin(a)*rr); } rx.closePath(); rx.fill();
  rx.fillStyle='rgba(255,255,255,0.8)'; rx.beginPath(); rx.ellipse(px-1.6,py-1.8,1,0.5,-0.6,0,6.2832); rx.fill(); }
function rMagnet(px,py){ rx.fillStyle='rgba(0,0,0,0.16)'; rx.beginPath(); rx.ellipse(px+1,py+5.5,5,1.4,0,0,6.2832); rx.fill();
  rx.lineCap='butt'; rx.lineWidth=3.4; rx.strokeStyle='#e8284a'; rx.beginPath(); rx.arc(px,py-0.5,3.6,Math.PI,0,false); rx.lineTo(px+3.6,py+3); rx.moveTo(px-3.6,py-0.5); rx.lineTo(px-3.6,py+3); rx.stroke();
  rx.strokeStyle='#ffffff'; rx.beginPath(); rx.moveTo(px-3.6,py+3); rx.lineTo(px-3.6,py+5); rx.moveTo(px+3.6,py+3); rx.lineTo(px+3.6,py+5); rx.stroke();
  rx.strokeStyle='#8a0c20'; rx.lineWidth=0.5; rx.beginPath(); rx.arc(px,py-0.5,5.3,Math.PI,0,false); rx.lineTo(px+5.3,py+5); rx.lineTo(px+1.9,py+5); rx.lineTo(px+1.9,py-0.5); rx.arc(px,py-0.5,1.9,0,Math.PI,true); rx.lineTo(px-1.9,py+5); rx.lineTo(px-5.3,py+5); rx.closePath(); rx.stroke();
  rx.strokeStyle='rgba(255,255,255,0.7)'; rx.lineWidth=0.8; rx.beginPath(); rx.arc(px,py-0.5,4.4,Math.PI*1.15,Math.PI*1.45); rx.stroke(); }
/* v0.95: the colours of the syrup puddles and of the gum bubble, apart: blueberry puddles (variant Б; v0.98: lighter, blue-lilac — the violet car had their very colour and is dark blue now), a shield on the bubble gift (the maintainer: «сделай лужи и пузыри разного цвета — сейчас сливаются») */
var R_PUD={fill:'rgba(125,120,235,0.92)',rim:'rgba(215,210,255,0.95)',shine:'rgba(245,240,255,0.8)'}, R_BUB={hi:'#ffe0f0',mid:'#ff8ac4',lo:'#e0409a',rim:'#a01a68',glass:'rgba(255,138,196,',edge:'rgba(224,64,154,'};
function rShieldIcon(px,py,s){ rx.beginPath(); rx.moveTo(px-2.5*s,py-2.3*s); rx.quadraticCurveTo(px,py-3.4*s,px+2.5*s,py-2.3*s); rx.lineTo(px+2.3*s,py+0.4*s); rx.quadraticCurveTo(px+1.7*s,py+2.4*s,px,py+3.3*s); rx.quadraticCurveTo(px-1.7*s,py+2.4*s,px-2.3*s,py+0.4*s); rx.closePath();
  rx.fillStyle='rgba(255,255,255,0.95)'; rx.fill(); rx.strokeStyle=R_BUB.rim; rx.lineWidth=0.5; rx.stroke(); rx.beginPath(); rx.moveTo(px,py-2.6*s); rx.lineTo(px,py+2.6*s); rx.moveTo(px-2.1*s,py-0.6*s); rx.lineTo(px+2.1*s,py-0.6*s); rx.lineWidth=0.45; rx.strokeStyle=R_BUB.lo; rx.stroke(); }   // v0.95: the bubble gift is a shield («на пузыре значок щита надо»)
function rBubble(px,py){ rx.fillStyle='rgba(0,0,0,0.14)'; rx.beginPath(); rx.ellipse(px+1,py+5.5,4.5,1.3,0,0,6.2832); rx.fill();
  var g=rx.createRadialGradient(px-1.6,py-1.8,0.5,px,py,5); g.addColorStop(0,R_BUB.hi); g.addColorStop(0.55,R_BUB.mid); g.addColorStop(1,R_BUB.lo); rx.fillStyle=g; rx.beginPath(); rx.arc(px,py,5,0,6.2832); rx.fill();
  rx.strokeStyle=R_BUB.rim; rx.lineWidth=0.6; rx.stroke(); rx.fillStyle='rgba(255,255,255,0.9)'; rx.beginPath(); rx.ellipse(px-1.8,py-2,1.4,0.8,-0.6,0,6.2832); rx.fill(); rx.beginPath(); rx.arc(px+2,py+1.8,0.5,0,6.2832); rx.fill(); }
/* v0.91: the turbo gifts (the maintainer's picks from the sketch): the gum bubble with a golden lightning bolt and speed lines; the magnet
   on a golden badge with a bolt, inside the gum bubble */
function rBolt(px,py,s,col){ rx.fillStyle=col; rx.beginPath(); rx.moveTo(px+0.6*s,py-3*s); rx.lineTo(px-1.6*s,py+0.4*s); rx.lineTo(px-0.1*s,py+0.4*s); rx.lineTo(px-0.8*s,py+3*s); rx.lineTo(px+1.7*s,py-0.8*s); rx.lineTo(px+0.1*s,py-0.8*s); rx.closePath(); rx.fill(); rx.strokeStyle='#8a4a00'; rx.lineWidth=0.35; rx.stroke(); }
function rTurboBubble(px,py){ rBubble(px,py); rBolt(px+0.3,py+0.2,1.05,'#ffd23f'); rx.strokeStyle='rgba(255,255,255,0.9)'; rx.lineWidth=0.7; rx.lineCap='round'; rx.beginPath(); rx.moveTo(px-8.5,py-1.5); rx.lineTo(px-6,py-1.5); rx.moveTo(px-9,py+1.2); rx.lineTo(px-6.2,py+1.2); rx.stroke(); }
function rTurboMagnet(px,py){ rx.fillStyle='rgba(0,0,0,0.14)'; rx.beginPath(); rx.ellipse(px+1,py+7,5.5,1.4,0,0,6.2832); rx.fill();
  rx.fillStyle='#ffd23f'; rx.beginPath(); rx.arc(px,py+0.5,5.6,0,6.2832); rx.fill(); rx.strokeStyle='#c8841a'; rx.lineWidth=0.6; rx.stroke(); rx.save(); rx.translate(px,py+0.5); rx.scale(0.7,0.7); rMagnet(0,-0.5); rx.restore(); rBolt(px,py+2,0.55,'#ffffff');
  rx.fillStyle=R_BUB.glass+'0.25)'; rx.beginPath(); rx.arc(px,py+0.5,7.6,0,6.2832); rx.fill(); rx.strokeStyle=R_BUB.edge+'0.85)'; rx.lineWidth=0.7; rx.stroke(); rx.fillStyle='rgba(255,255,255,0.85)'; rx.beginPath(); rx.ellipse(px-3.2,py-3.8,1.6,0.8,-0.6,0,6.2832); rx.fill(); }
/* a sprite: w×h sketch pixels around its middle, at this phone's HD scale */
/* ── v0.99, CANDY PIXELS (the maintainer: «нарисуй кэнди-пиксель»): with «ГРАФИКА: ПИКСЕЛИ» the same candy land is drawn at one pixel per game
   pixel and shown blown up without smoothing (like the shape skins, v0.74), and every picture made once — the land's chunks, the cars, the
   gifts — is hardened into pixel art: no half-transparent edges, every colour snapped to the land's own palette, the cars and gifts ringed
   with a dark one-pixel outline to stand out; the cars and the rocket are drawn turned in steps (no blurry turning); the effects are drawn
   in whole pixels. The shapes and sizes stay the HD ones, so what is drawn and what the game counts do not part. ── */
var RSKIN='candy';   // v1.00: the race's skin — 'candy' or 'note' (48_racenote.js)
var RPX=false, R_PALH=['0a5a44','0f5a2e','0f8a6a','141d66','1a6a3a','1a6aa8','2a1420','2a1a28','2a7ab0','2f47c9','2fd08a','2fe0b0','3a1a10','3a2a40','3fc7ff','3fd07a','4a2410','4fb8ff','5a2e16','6b3a22','6fc8ff','6fd7ff','7a3a20','7be38f','7fd88a','8a0c20','8a4a00','8a4a1a','8a4a2a','8a78b8','8fd8ff','8fdcff','9b5bff','9b7bff','a01a68','a8dcff','a8f0c8','b0184f','b06a00','b86a32','b87a3a','b890f0','b8f0d0','b8f0ff','b98cff','bfefb0','c07a3a','c8841a','c8a070','c8a0ff','c98a5a','c9f0ff','d08a48','d6f0ff','d6f5ff','d8a060','d8c2ff','d99a66','e0409a','e0a060','e0a860','e0d0c0','e8123a','e8284a','e8363a','e8a020','e8a060','e8dcc8','f0c070','f3c9a0','f4ecff','f4f4f8','f6efe6','ff2f55','ff3b5c','ff4f7a','ff4f8b','ff4f9a','ff4fa0','ff5a8a','ff5ab0','ff6f8a','ff7ab8','ff8a3d','ff8ab8','ff8ac4','ff9ccc','ffa870','ffb3d0','ffb3d9','ffb52e','ffd23f','ffd24a','ffd6ea','ffd6f0','ffd8ec','ffe066','ffe0b8','ffe0f0','fff0a0','fff0c0','fff0f6','fff3a8','fff3b0','fff4e6','fff4f8','fff6e8','fffaf0','ffffff','4a1a30','7a3a58','c890b0','fbfaf4','d8e6f4','23264a','3c3c50','eeeef0','dcdce4','c8c8d4','9a9aac','5a5a6e','f4f0e0','fbf0a0','f8e890','8a8aa0','bfe8ff','ff5a8a','1f3fa8','f0a020','e0602a','3fae4a','1f8a5a','8a5a2a','b85ae8','2a8ad8','6fb8ff','2a5ad8','e87a20','e0402a','8a5ae8','b87a3a','edf2f8','b4b4c0','a0a0ae','e040c0','8a1070'], R_PAL=null, R_PALC={}, R_PALS={}, R_PALCS={};   // v1.06: each skin its own palette (the pirates' 34 colours)
function rPalList(){ var sk=RSKIN==='pirate'?'p':'c'; return R_PALS[sk]||(R_PALS[sk]=(sk==='p'?RP_PALH:R_PALH).map(function(h){ var n=parseInt(h,16); return [(n>>16)&255,(n>>8)&255,n&255]; })); }
function rPalNear(r,g,b){ var C=R_PALCS[RSKIN==='pirate'?'p':'c']||(R_PALCS[RSKIN==='pirate'?'p':'c']={}), k=(r>>2)<<12|(g>>2)<<6|(b>>2), q=C[k]; if(q!==undefined) return q;
  var P=rPalList(), best=0, bd=1e9; for(var i=0;i<P.length;i++){ var c=P[i], dr=c[0]-r, dg=c[1]-g, db=c[2]-b, d=2*dr*dr+4*dg*dg+3*db*db; if(d<bd){ bd=d; best=i; } }
  return C[k]=best; }
/* harden a picture into pixel art: alpha to all or nothing (a faint dark shadow stays a flat shadow), colours to the palette, an outline (line) */
function pxHard(c,line){ var x=c.getContext('2d'), W=c.width, H=c.height; if(!W||!H) return; var im=x.getImageData(0,0,W,H), d=im.data, i, on=new Uint8Array(W*H);
  for(i=0;i<W*H;i++){ var o=i*4, a=d[o+3];
    if(a>=128){ var qi=rPalNear(d[o],d[o+1],d[o+2]), q=rPalList()[qi]; d[o]=q[0]; d[o+1]=q[1]; d[o+2]=q[2]; d[o+3]=255; on[i]=1; }
    else if(a>=24&&d[o]+d[o+1]+d[o+2]<240){ if(RSKIN==='pirate'){ d[o]=10; d[o+1]=24; d[o+2]=34; } else { d[o]=40; d[o+1]=10; d[o+2]=30; } d[o+3]=64; on[i]=2; }
    else { d[o+3]=0; } }
  if(line) for(var y=0;y<H;y++) for(var X=0;X<W;X++){ i=y*W+X; if(on[i]===1) continue;
    if((X>0&&on[i-1]===1)||(X<W-1&&on[i+1]===1)||(y>0&&on[i-W]===1)||(y<H-1&&on[i+W]===1)){ var o2=i*4; d[o2]=42; d[o2+1]=20; d[o2+2]=32; d[o2+3]=255; } }
  x.putImageData(im,0,0); }
/* whole-pixel shapes on the HD canvas (at one pixel per game pixel in the candy pixels) */
function pxDisc(x,y,r,c){ hx.fillStyle=c; x=Math.round(x); y=Math.round(y); var R=Math.max(0.5,r); for(var j=-Math.ceil(R);j<=Math.ceil(R);j++){ var w=Math.floor(Math.sqrt(Math.max(0,R*R-j*j))+0.5); if(w>0||Math.abs(j)<R) hx.fillRect(x-w,y+j,2*w+1,1); } }
function pxRing(x,y,r,c,dith){ hx.fillStyle=c; x=Math.round(x); y=Math.round(y); var n=Math.max(16,Math.round(r*7)), seen={};
  for(var i=0;i<n;i++){ var a=i/n*6.2832, px=Math.round(x+Math.cos(a)*r), py=Math.round(y+Math.sin(a)*r), k=px+','+py; if(seen[k]) continue; seen[k]=1; hx.fillRect(px,py,1,1); }
  if(dith){ hx.fillStyle=dith; for(var j=-Math.floor(r)+1;j<r-1;j++) for(var i2=-Math.floor(r)+1;i2<r-1;i2++) if(((i2+j)&1)===0&&i2*i2+j*j<(r-1)*(r-1)) hx.fillRect(x+i2,y+j,1,1); } }
function rSprite(key,w,h,draw,flat){ var s=RC.sp[key]; if(s) return s; var KS=rKS();
  if(RPX){ w=Math.ceil(w*KS/2)*2/KS+2/KS; h=Math.ceil(h*KS/2)*2/KS+2/KS; }   // candy pixels: whole pixels round the middle, room for the outline
  var o=hdOff(w*KS,h*KS,hs); rx=o.x; rx.setTransform(hs*KS,0,0,hs*KS,0,0); rx.translate(w/2,h/2); draw();
  if(RPX){ pxHard(o.c,!flat); return RC.sp[key]={c:o.c,w:o.c.width,h:o.c.height}; }
  return RC.sp[key]={c:o.c,w:w*KS,h:h*KS}; }
/* candy pixels: a car turned in steps of 0.1 rad, each step its own hardened picture */
function rTurned(key,w,h,a,draw){ var q=key==='p'?(a>0.12?3:a<-0.12?-3:0):0,   /* other cars straight, the rocket in three steps: small pixel pictures turned by less read as noise */ m=Math.ceil(Math.sqrt(w*w+h*h))*(q?1:0)||0;
  return rSprite(key+'@'+q,q?m:w,q?m:h,function(){ rx.rotate(q/10); draw(); }); }
function rCarSprite(kind,player,a){ if(RSKIN==='pirate') return rpBoatSprite(player?-1:kind%RP_BOATS.length,a); if(RSKIN==='note'){ var nk=player?'np':'nc'+kind%RN_CARS.length, nd=function(){ noteCar(kind,player); }; return RPX?rTurned(player?'p':nk,player?30:28,20,a||0,nd):rSprite(nk,player?30:28,player?20:22,nd); }
  if(player) return RPX?rTurned('p',30,20,a||0,function(){ rx.translate(1.5,0); cwOurs(0,0); }):rSprite('p',30,20,function(){ rx.translate(1.5,0); cwOurs(0,0); });   // v1.21: «АЕ4» (48_racecandy.js)   // the middle of its body stays the car's point
  var col=R_CARS[kind%R_CARS.length]; if(RSKIN==='candy') return RPX?rTurned('cw'+kind%6,28,20,a||0,function(){ cwRival(kind,0,0); }):rSprite('cw'+kind%6,28,20,function(){ cwRival(kind,0,0); });   // v1.21: the candy land's own rivals (48_racecandy.js)
  var col=R_CARS[kind%R_CARS.length]; return RPX?rTurned('c'+kind%R_CARS.length,28,20,a||0,function(){ rCar(0,0,col[0],col[1],false); }):rSprite('c'+kind%R_CARS.length,28,20,function(){ rCar(0,0,col[0],col[1],false); }); }
/* candy pixels: the letter F and the shield drawn pixel by pixel over the hardened picture (smoothed and hardened they came out a smudge) */
function rPxIcon(sp,rows,pal,dy){ if(sp.icon) return sp; sp.icon=1; var x=sp.c.getContext('2d'); x.setTransform(1,0,0,1,0,0); var w=rows[0].length, h=rows.length, x0=Math.floor((sp.c.width-w)/2), y0=Math.floor((sp.c.height-h)/2)+(dy||0);
  for(var j=0;j<h;j++) for(var i=0;i<w;i++){ var c=pal[rows[j][i]]; if(c){ x.fillStyle=c; x.fillRect(x0+i,y0+j,1,1); } } return sp; }
var PX_F=['1111','1...','111.','1...','1...'], PX_SHIELD=['11111','11211','12221','11211','.111.','..1..'], PX_STAR=['..1..','11111','.111.','.1.1.'], PX_BOLT=['..11','.11.','1111','.11.','11..'];
var R_FUELK=1.2, R_BUBK=1.1;   // v0.98: the fuel bottle's and the shield bubble's sizes (the audit: the most needed thing was one of the smallest)
var RN_GIFT={fuel:[26,26],coin:[16,16],magnet:[18,18],bubble:[20,22],tmagnet:[30,30],tbubble:[30,30]};
/* v1.00: a yellow highlighter ring round the notebook's gifts, all but the super gift (the maintainer: «в тетрадке добавь призам жёлтую обводку, кроме суперприза»):
   the picture's own outline, grown by w and filled yellow, under the picture */
function rYellowRing(sp,w){ if(sp.ring) return sp; sp.ring=1; var c=sp.c, W2=c.width, H2=c.height, t=document.createElement('canvas'); t.width=W2; t.height=H2; var tx=t.getContext('2d');
  tx.drawImage(c,0,0); tx.globalCompositeOperation='source-in'; tx.fillStyle='#ffd21e'; tx.fillRect(0,0,W2,H2);
  var r=document.createElement('canvas'); r.width=W2; r.height=H2; var q=r.getContext('2d'); for(var k=0;k<16;k++){ var a=k/16*6.2832; q.drawImage(t,Math.cos(a)*w,Math.sin(a)*w); } q.drawImage(t,0,0);
  var x=c.getContext('2d'); x.save(); x.setTransform(1,0,0,1,0,0); x.globalCompositeOperation='destination-over'; x.drawImage(r,0,0); x.restore(); return sp; }
function rGiftSprite(t){ var sp; if(RSKIN==='pirate') return rpGiftSprite(t); if(RSKIN==='note'){ var gs=RN_GIFT[t]||[16,16]; sp=rSprite('n'+t,gs[0],gs[1],function(){ noteGift(t); }); return t==='tmagnet'||t==='tbubble'?sp:rYellowRing(sp,Math.max(1,Math.round(1.8*rKS()*hs))); }
  if(RSKIN==='candy') return cwGiftSprite(t);   // v1.21: the candy land's own gifts (48_racecandy.js)
  if(t==='fuel'){ sp=rSprite('gfuel',Math.ceil(16*R_FUELK),Math.ceil(18*R_FUELK),function(){ rx.scale(R_FUELK,R_FUELK); if(RPX) rFuelBody(0,0); else rFuel(0,0); }); return RPX?rPxIcon(sp,PX_F,{1:'#ffffff'},1):sp; }
  if(t==='coin'&&RPX){ sp=rSprite('gcoin',16,18,function(){ rCoin.noStar=true; rCoin(0,0); rCoin.noStar=false; }); return rPxIcon(sp,PX_STAR,{1:'#ff4f7a'},0); }
  if(t==='bubble'){ sp=rSprite('gbubble',Math.ceil(16*R_BUBK),Math.ceil(18*R_BUBK),function(){ rx.scale(R_BUBK,R_BUBK); rBubble(0,0); if(!RPX) rShieldIcon(0.2,0.3,1); }); return RPX?rPxIcon(sp,PX_SHIELD,{1:'#ffffff',2:'#e0409a'},0):sp; } return rSprite('g'+t,t[0]==='t'?22:16,18,function(){ if(t==='fuel') rFuel(0,0); else if(t==='coin') rCoin(0,0); else if(t==='magnet') rMagnet(0,0); else if(t==='tbubble') rTurboBubble(0,0); else if(t==='tmagnet') rTurboMagnet(0,0); else { rBubble(0,0); rShieldIcon(0.2,0.3,1); } }); }
/* v0.96: the super gift stands out (the maintainer: «сделай суперподарок более заметным.. варианты») — sketch variants A…D; he picked A */
var R_SUPER='A';   // his pick: bigger, with a golden glow
function rSuperPx(X,Y,t,id){ var u=K/SU, bob=Math.round(Math.sin(t*3+id)*0.8*K), R0=Math.round((13+Math.sin(t*6))*u), x=Math.round(X), y=Math.round(Y)+bob;   // candy pixels: a dithered golden glow that breathes, the gift half as big again
  hx.fillStyle='#ffd23f'; for(var j=-R0;j<=R0;j++) for(var i=-R0;i<=R0;i++){ var d2=i*i+j*j; if(d2<=R0*R0&&d2>=(R0-4)*(R0-4)&&((i+j+Math.floor(t*6))&1)===0) hx.fillRect(x+i,y+j,1,1); }
  pxRing(x,y,R0,'#fff3a8');
  var big=rPxIcon(rSprite('gtmagnetB',22*1.45,18*1.45,function(){ rx.scale(1.45,1.45); rTurboMagnet(0,0); }),PX_BOLT,{1:'#ffffff'},3); rBlit(big,x,y,0); }
function rSuper(s,X,Y,t,id){ if(RSKIN==='pirate'){ rpSuper(s,X,Y,t,id); return; } if(RSKIN==='note'){ var kk=1+0.07*Math.sin(t*6); if(RPX){ rBlit(s,X,Y,0); return; } hx.drawImage(s.c,X-s.w*kk/2,Y-s.h*kk/2,s.w*kk,s.h*kk); return; } if(RPX){ rSuperPx(X,Y,t,id); return; } var u=K/SU, v=R_SUPER, k=1.3, bob=Math.sin(t*3+id)*0.8*K, i;
  if(v==='A'){ k=1.45+0.08*Math.sin(t*6); var gr=hx.createRadialGradient(X,Y+bob,2*u,X,Y+bob,16*u); gr.addColorStop(0,'rgba(255,236,120,0.95)'); gr.addColorStop(0.5,'rgba(255,200,40,'+(0.45+0.2*Math.sin(t*6))+')'); gr.addColorStop(1,'rgba(255,200,40,0)'); hx.fillStyle=gr; hx.beginPath(); hx.arc(X,Y+bob,16*u,0,6.2832); hx.fill(); }
  else if(v==='B'){ hx.save(); hx.translate(X,Y+bob); hx.rotate(t*1.5); hx.fillStyle='rgba(255,214,60,0.8)'; for(i=0;i<12;i++){ hx.rotate(6.2832/12); hx.beginPath(); hx.moveTo(0,0); hx.lineTo(18*u,-2.6*u); hx.lineTo(18*u,2.6*u); hx.closePath(); hx.fill(); } hx.restore(); }
  else if(v==='C'){ var cols=['#ff4f7a','#ffb52e','#ffe066','#3fd07a','#4fb8ff','#9b5bff']; hx.lineWidth=2.2*u; for(i=0;i<6;i++){ hx.strokeStyle=cols[i]; hx.beginPath(); hx.arc(X,Y+bob,12.5*u,t*2+i*1.0472,t*2+(i+1)*1.0472); hx.stroke(); }
    for(i=0;i<3;i++){ var a=t*2.5+i*2.0944, sx0=X+Math.cos(a)*15*u, sy0=Y+bob+Math.sin(a)*15*u, r=(1.6+0.8*Math.sin(t*9+i))*u; hx.fillStyle='#ffffff'; hx.beginPath(); hx.moveTo(sx0,sy0-2*r); hx.lineTo(sx0+0.5*r,sy0-0.5*r); hx.lineTo(sx0+2*r,sy0); hx.lineTo(sx0+0.5*r,sy0+0.5*r); hx.lineTo(sx0,sy0+2*r); hx.lineTo(sx0-0.5*r,sy0+0.5*r); hx.lineTo(sx0-2*r,sy0); hx.lineTo(sx0-0.5*r,sy0-0.5*r); hx.closePath(); hx.fill(); } }
  else if(v==='D'){ k=1.4; bob=-Math.abs(Math.sin(t*4+id))*6*u; hx.fillStyle='rgba(0,0,0,0.2)'; hx.beginPath(); hx.ellipse(X,Y+9*u,7*u*(1+bob/(20*u)),2*u,0,0,6.2832); hx.fill();
    if(Math.floor(t*4)%2){ hx.strokeStyle='#ffffff'; hx.lineWidth=1.6*u; hx.beginPath(); hx.arc(X,Y+bob,11.5*u,0,6.2832); hx.stroke(); } }
  hx.drawImage(s.c,X-s.w*k/2,Y+bob-s.h*k/2,s.w*k,s.h*k); }
function rBlit(s,X,Y,a){ if(RPX){ hx.drawImage(s.c,Math.round(X-s.w/2),Math.round(Y-s.h/2)); return; } if(a){ hx.save(); hx.translate(X,Y); hx.rotate(a); hx.drawImage(s.c,-s.w/2,-s.h/2,s.w,s.h); hx.restore(); } else hx.drawImage(s.c,X-s.w/2,Y-s.h/2,s.w,s.h); }
/* the road's direction at a place (radians; drawing only) */
function rSlope(rg,wx){ return Math.atan2(Race.centre(rg,wx+4)-Race.centre(rg,wx-4),8); }
/* ── the whole scene: the land, the puddles, the gifts, the cars, the player's car. vd: how far the view has gone (field units), cy: the
   player's car (field units) or null, ang: its turn ── */
var rPrevY=null, rTilt=0, rCarK=1;   // rCarK: the player's car drawn larger (the drawn phone's screen, v0.87)
function raceScene(rg,vd,carY,dt){ RPX=hdPix&&hs===1; rReset(rg.seed); if(RSKIN==='pirate') rpWarm(); else if(RSKIN==='candy') cwWarm(); else if(RSKIN==='note') nWarm(); var KS=rKS(), X0=rX0===null?SAFE.l:rX0, i0=Math.floor((vd-X0/K)/RCW), i1=Math.floor((vd+(LW-X0)/K)/RCW);
  hx.setTransform(hs,0,0,hs,0,0); hx.imageSmoothingEnabled=!RPX;
  var made=0; for(var i=i0;i<=i1;i++){ var ch=RC.ch[i]; if(!ch){ ch=rChunk(rg,i); made++; } hx.setTransform(hs,0,0,hs,0,0); if(RPX) hx.drawImage(ch.c,Math.round(X0+(i*RCW-vd)*K),0); else hx.drawImage(ch.c,X0+(i*RCW-vd)*K,0,ch.w,ch.h); }
  if(!made&&!RC.ch[i1+1]) rChunk(rg,i1+1);                                                     // the next one ahead, made while nothing else was
  hx.setTransform(hs,0,0,hs,0,0);
  for(var k in RC.ch) if(+k<i0-1) delete RC.ch[k];
  function sx(wx){ return X0+(wx-vd)*K; }
  if(RSKIN==='pirate') (rg.puddles||[]).forEach(function(p){ var rr=Math.round(p.r*2)/2; rBlit(rpWhirlSprite(rr),sx(p.x),(Race.centre(rg,p.x)+p.o)*K,0); });
  else if(RSKIN==='note') (rg.puddles||[]).forEach(function(p){ var rr=Math.round(p.r*2)/2, sp=rSprite('blot2'+rr,rr*3.8*SU,rr*3.4*SU,function(){ nBlot2(rr*SU); },true); rBlit(sp,sx(p.x),(Race.centre(rg,p.x)+p.o)*K,0); });   // v1.23: the blot with its splashes and drip
  else if(RSKIN==='candy') (rg.puddles||[]).forEach(function(p){ rBlit(cwPudSprite(Math.round(p.r*2)/2),sx(p.x),(Race.centre(rg,p.x)+p.o)*K,0); });   // v1.21: melted chocolate
  else if(RPX) (rg.puddles||[]).forEach(function(p){ var rr=Math.round(p.r*2)/2, sp=rSprite('pud'+rr,rr*2.6*SU,rr*1.6*SU,function(){ var r=rr*SU; rx.fillStyle=R_PUD.fill; rx.beginPath(); rx.ellipse(0,0,r*1.15,r*0.62,0.1,0,6.2832); rx.ellipse(r*0.6,r*0.25,r*0.45,r*0.3,0,0,6.2832); rx.fill();
      rx.strokeStyle=R_PUD.rim; rx.lineWidth=1.2; rx.stroke(); rx.fillStyle=R_PUD.shine; rx.beginPath(); rx.ellipse(-r*0.35,-r*0.18,r*0.35,r*0.12,0.1,0,6.2832); rx.fill(); },true);
    rBlit(sp,sx(p.x),(Race.centre(rg,p.x)+p.o)*K,0); });
  else (rg.puddles||[]).forEach(function(p){ var X=sx(p.x), Y=(Race.centre(rg,p.x)+p.o)*K, r=p.r*K; hx.fillStyle=R_PUD.fill; hx.beginPath(); hx.ellipse(X,Y,r*1.15,r*0.62,0.1,0,6.2832); hx.ellipse(X+r*0.6,Y+r*0.25,r*0.45,r*0.3,0,0,6.2832); hx.fill(); if(R_PUD.rim){ hx.strokeStyle=R_PUD.rim; hx.lineWidth=Math.max(1,0.9*K/SU); hx.stroke(); }
    hx.fillStyle=R_PUD.shine; hx.beginPath(); hx.ellipse(X-r*0.35,Y-r*0.18,r*0.35,r*0.1,0.1,0,6.2832); hx.fill(); });
  var t=clock;
  (rg.items||[]).forEach(function(p){ var X=sx(p.x); if(X<-20||X>LW+20) return; var Y=(Race.centre(rg,p.x)+p.o)*K, s=rGiftSprite(p.type);
    if(RSKIN==='candy'){ cwGiftDraw(s,p.type,X,Y,t,p.id); return; }
    if(p.type==='coin'&&RPX){ var f2=Math.abs(Math.cos(t*4+p.id)), cw=Math.max(2,Math.round(s.w*(0.35+0.65*f2)/2)*2); hx.drawImage(s.c,Math.round(X-cw/2),Math.round(Y-s.h/2),cw,s.h); }
    else if(p.type==='coin'){ var f=Math.abs(Math.cos(t*4+p.id)); hx.save(); hx.translate(X,Y); hx.scale(0.35+0.65*f,1); hx.drawImage(s.c,-s.w/2,-s.h/2,s.w,s.h); hx.restore(); }
    else if(p.type==='tmagnet'&&R_SUPER) rSuper(s,X,Y,t,p.id);
    else rBlit(s,X,Y+Math.sin(t*3+p.id)*0.8*K,0); });
  (rg.cars||[]).forEach(function(c){ var X=sx(c.x); if(X<-30||X>LW+30) return; var Y=(Race.centre(rg,c.x)+c.o)*K; var ca=rSlope(rg,c.x)+(c.to-c.o)*0.02; if(RSKIN==='pirate') rBlit(rpWakeSprite(c.kind%RP_BOATS.length),X,Y,ca); rBlit(rCarSprite(c.kind,false,ca),X,Y,ca); });
  if(carY!==null&&carY!==undefined){ var s=rg.car, cx=vd+s.x, X=sx(cx), Y=carY*K;
    var vy=rPrevY===null||!dt?0:(carY-rPrevY)/dt; rPrevY=carY; var want=Math.max(-0.5,Math.min(0.5,Math.atan2(vy,Math.max(60,rg.v||0))));   // the car turns the way it goes, 30° at most rTilt+=(want-rTilt)*Math.min(1,(dt||0)*12);
    var blink=s.inv>0&&Math.floor(clock*14)%2===0;
    if(RSKIN==='pirate'){ rpPlayer(rg,s,X,Y,blink); rOver(i0,i1,X0,vd); return; }
    if(RSKIN==='candy'){ if(RPX) cwPlayerPx(rg,s,X,Y,blink); else cwPlayer(rg,s,X,Y,blink); rOver(i0,i1,X0,vd); return; }
    if(RSKIN==='note'){ if(RPX) nPlayerPx(rg,s,X,Y,blink); else nPlayer(rg,s,X,Y,blink); return; }   // v1.23: the notebook's effects (48_racenote.js)   // v1.21: the candy effects (48_racecandy.js)
    if(RPX){ rPlayerPx(rg,s,X,Y,blink); if(RSKIN==='candy') rOver(i0,i1,X0,vd); return; }
    if(s.magnet>0&&(s.magnet>2||Math.floor(clock*8)%2)){ for(var m=0;m<3;m++){ var ph=((clock*1.4+m/3)%1); hx.strokeStyle='rgba(232,40,74,'+(0.5*(1-ph)).toFixed(3)+')'; hx.lineWidth=0.8; hx.beginPath(); hx.arc(X,Y,(10+ph*30)*K/SU,-0.9,0.9); hx.stroke(); } }
    if(!blink){ var ks=K/SU*rCarK, sp=Math.min(1,(rg.v||40)/120); hx.save(); hx.translate(X,Y); hx.rotate(rTilt);           // candy puffs behind it, livelier the faster it goes
      if(s.turbo>0){ hx.strokeStyle='rgba(255,255,255,0.8)'; hx.lineWidth=0.8*ks; hx.lineCap='round'; [[-6,-26],[0,-30],[6,-24]].forEach(function(q,i){ var jx=((clock*9+i*0.37)%1)*4; hx.beginPath(); hx.moveTo((-16-jx)*ks,q[0]*ks); hx.lineTo((q[1]-jx)*ks,q[0]*ks); hx.stroke(); });
        [[-13,0,3.4,'#ffd23f'],[-17,-1,2.8,'#ff8a3d']].forEach(function(q){ var fl=0.85+0.3*Math.abs(Math.sin(clock*40+q[0])); hx.fillStyle=q[3]; hx.beginPath(); hx.arc(q[0]*ks,q[1]*ks,q[2]*fl*ks,0,6.2832); hx.fill(); }); }
      (RSKIN==='note'?[[0,'#9aa4c4',1.8],[1,'#c8c8d4',1.4],[2,'#9aa4c4',1.1]]:[[0,'#ffe0f0',2.4],[1,'#ffd23f',1.8],[2,'#ffb3d9',1.3]]).forEach(function(q){ var ph=(clock*6+q[0]*0.33)%1, r=q[2]*(0.7+0.5*sp)*(1-ph*0.4)*ks; hx.globalAlpha=0.9-ph*0.5;
        hx.fillStyle=q[1]; hx.beginPath(); hx.arc((-11.5-q[0]*2.6-ph*4*sp)*ks,(q[0]===1?-0.9:q[0]===2?0.8:0)*ks,r,0,6.2832); hx.fill(); });
      hx.globalAlpha=1; hx.restore(); var cs=rCarSprite(0,true); if(rCarK!==1){ hx.save(); hx.translate(X,Y); hx.rotate(rTilt); hx.drawImage(cs.c,-cs.w*rCarK/2,-cs.h*rCarK/2,cs.w*rCarK,cs.h*rCarK); hx.restore(); } else rBlit(cs,X,Y,rTilt); }
    if(s.bubble>0&&(s.bubble>3||Math.floor(clock*8)%2)){ var R0=13*K/SU, nb=RSKIN==='note'; hx.fillStyle=nb?'rgba(79,184,255,0.25)':R_BUB.glass+'0.28)'; hx.beginPath(); hx.arc(X,Y,R0,0,6.2832); hx.fill(); hx.strokeStyle=nb?'rgba(35,38,74,0.8)':R_BUB.edge+'0.8)'; hx.lineWidth=0.8; hx.stroke();
      hx.fillStyle='rgba(255,255,255,0.75)'; hx.beginPath(); hx.ellipse(X-R0*0.4,Y-R0*0.5,R0*0.25,R0*0.12,-0.6,0,6.2832); hx.fill(); } }
  else if(RSKIN==='pirate') rOver(i0,i1,X0,vd);
  if(RSKIN==='candy') rOver(i0,i1,X0,vd);   // v1.20: the candy land's tunnels and cable cars over the cars
}
/* v1.06: the chunks' top layers (the pirates' bridges), over the boats */
function rOver(i0,i1,X0,vd){ hx.setTransform(hs,0,0,hs,0,0); for(var i=i0;i<=i1;i++){ var ch=RC.ch[i]; if(!ch||!ch.o) continue; if(RPX) hx.drawImage(ch.o,Math.round(X0+(i*RCW-vd)*K),0); else hx.drawImage(ch.o,X0+(i*RCW-vd)*K,0,ch.w,ch.h); } }
/* candy pixels: the player's car and what goes with it, in whole pixels — the magnet's waves as dotted arcs, the turbo's lines and flame,
   the candy puffs, the bubble as a one-pixel ring over a dithered glass */
function rPlayerPx(rg,s,X,Y,blink){ var u=K/SU*rCarK, sp=Math.min(1,(rg.v||40)/120), x=Math.round(X), y=Math.round(Y), i;
  if(s.magnet>0&&(s.magnet>2||Math.floor(clock*8)%2)){ hx.fillStyle='#e8284a'; for(var m=0;m<3;m++){ var ph=((clock*1.4+m/3)%1), R=(10+ph*30)*u; if(ph>0.8) continue; for(var a=-0.9;a<=0.9;a+=1/R){ hx.fillRect(Math.round(x+Math.cos(a)*R),Math.round(y+Math.sin(a)*R),1,1); } } }
  if(!blink){
    if(s.turbo>0){ hx.fillStyle='#ffffff'; [[-6,-26],[0,-30],[6,-24]].forEach(function(q,k){ var jx=((clock*9+k*0.37)%1)*4; var x0=Math.round(x+(q[1]-jx)*u), x1=Math.round(x+(-16-jx)*u); hx.fillRect(x0,Math.round(y+q[0]*u),Math.max(1,x1-x0),1); });
      [[-13,0,3.4,'#ffd23f'],[-17,-1,2.8,'#ff8a3d']].forEach(function(q){ var fl=0.85+0.3*Math.abs(Math.sin(clock*40+q[0])); pxDisc(x+q[0]*u,y+q[1]*u,q[2]*fl*u,q[3]); }); }
    (RSKIN==='note'?[[0,'#9aa4c4',1.8],[1,'#c8c8d4',1.4],[2,'#9aa4c4',1.1]]:[[0,'#ffe0f0',2.4],[1,'#ffd23f',1.8],[2,'#ffb3d9',1.3]]).forEach(function(q){ var ph=(clock*6+q[0]*0.33)%1; if(ph>0.85) return; pxDisc(x+(-11.5-q[0]*2.6-ph*4*sp)*u,y+(q[0]===1?-0.9:q[0]===2?0.8:0)*u,q[2]*(0.7+0.5*sp)*(1-ph*0.4)*u,q[1]); });
    var bub=s.bubble>0&&(s.bubble>3||Math.floor(clock*8)%2), R0=Math.round(13*u); if(bub) pxRing(x,y,R0,'rgba(0,0,0,0)',RSKIN==='note'?'rgba(79,184,255,0.4)':'rgba(255,138,196,0.45)');
    var cs=rCarSprite(0,true,rTilt); if(rCarK!==1) hx.drawImage(cs.c,Math.round(x-cs.w*rCarK/2),Math.round(y-cs.h*rCarK/2),cs.w*rCarK,cs.h*rCarK); else rBlit(cs,x,y,0);
    if(bub){ pxRing(x,y,R0,RSKIN==='note'?RN_INK:R_BUB.lo); pxRing(x,y,R0-1,'rgba(255,224,240,0.6)'); hx.fillStyle='#ffffff'; hx.fillRect(x-Math.round(R0*0.55),y-Math.round(R0*0.55),Math.max(2,Math.round(R0*0.3)),1); } } }
/* sparks over everything (the game's own list of parts; drawn round and soft here) */
function raceParts(dt){ parts.forEach(function(p){ p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=0.985; p.vy*=0.985; p.life-=dt; }); parts=parts.filter(function(p){ return p.life>0; });
  parts.forEach(function(p){ var f=p.life/p.max, c=p.c||p.cols[Math.min(p.cols.length-1,Math.floor((1-f)*p.cols.length))]; hx.globalAlpha=Math.min(1,f*1.6); hx.fillStyle=c;
    if(p.sh&&!RPX){ cwPart(p,f,c); return; } if(RPX){ var z=f>0.5?2:1; hx.fillRect(Math.round(p.x)-(z>>1),Math.round(p.y)-(z>>1),z,z); } else { hx.beginPath(); hx.arc(p.x,p.y,0.6+f*0.9,0,6.2832); hx.fill(); } }); hx.globalAlpha=1; }
/* the menu's and the cards' race: the core with a simple driver of its own (keeps to the road, round the cars, to the gifts), never out of fuel */
function raceDemoStep(rg){ var s=rg.car, cx=rg.d+s.x, road=Race.at(rg,cx+40), ty=road.c, best=-1e9;
  for(var yy=road.c-road.hw+6;yy<=road.c+road.hw-6;yy+=3){ var sc=-Math.abs(yy-s.y)*0.02;
    rg.cars.forEach(function(c){ var dx=c.x-cx, cy=Race.centre(rg,c.x)+c.o; if(dx>-20&&dx<110){ var tr=Math.max(0,dx+18)/Math.max(10,rg.v-c.v), py=s.y+Math.sign(yy-s.y)*Math.min(Math.abs(yy-s.y),110*tr); if(Math.abs(py-cy)<12) sc-=6-dx/30; if(dx<20&&cy>Math.min(s.y,yy)-10&&cy<Math.max(s.y,yy)+10) sc-=6; } });
    rg.items.forEach(function(p){ var dx=p.x-cx; if(dx>4&&dx<120&&Math.abs(Race.centre(rg,p.x)+p.o-yy)<7) sc+=1; });
    if(sc>best){ best=sc; ty=yy; } }
  Race.step(rg,(Race.FH-Race.MARGIN-ty)/(Race.FH-2*Race.MARGIN)); rg.fuel=100; }

/* ── v0.87: SonaRace on the drawn phones of the getting ready and the instructions (the maintainer: «в стиле гонок»; the candy land
   behind the screens was tried and dropped — «фон слишком на себя отвлекает»): the road with the rocket car at the palm's height ── */
var rPh=null, rPhD=0, rPhC=null, rPhAt=-1;
function racePhone(f){ if(rPhAt===clock&&rPhC) return rPhC; rPhAt=clock; var q=Math.min(hs,1.5);
  if(!rPhC||rPhC.width!==Math.round(LW*q)||rPhC.height!==Math.round(LH*q)){ rPhC=document.createElement('canvas'); rPhC.width=Math.round(LW*q); rPhC.height=Math.round(LH*q); }
  if(!rPh) rPh=Race.create(515151,Race.FH*LW/LH,Race.FH/2); rPhD+=60*DT;
  var keepH=hx, keepS=hs; hx=rPhC.getContext('2d'); hs=q; rX0=0; noLight=true;
  try{ var cy=Race.FH*(0.14+(1-f)*0.72); rPh.v=120; rPh.car.x=Race.CAR_X+20; rCarK=3; raceScene(rPh,rPhD,cy,DT); } finally { hx=keepH; hs=keepS; rX0=null; noLight=false; rCarK=1; }   // the car 3× as the ship there
  return rPhC; }
