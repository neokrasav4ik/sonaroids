/* ── SONARACE: THE NOTEBOOK (v1.00; the maintainer's picks from the sketches, 30 Sep: «тетрадка — карандаш + маркер», the road shaded with a
   pencil and a yellow highlighter along its edges; «деревья и солнце — из фломастера», «добавь разнообразие мира вокруг — немного»; our car
   «ракетомобиль с полосками как у спорткара» (white stripes); fuel — the petrol pump with an F; coins — stars; the magnet; a knight's shield;
   the super gift — the sun with the magnet; the hazard — an ink blot; the rivals — a truck, a bus, a beetle and cars). Drawn in the sketches'
   pixels (CSS pixels at 844×390, two of them to a sketch pixel of 48_racehd.js), so the sizes are the candy land's: what is drawn and what
   the game counts agree. ── */
var RN_INK='#23264a';
/* v1.02: the paper, its grid, the pencil on the road, the doodles' strength (the maintainer: «дорогу чуть темнее, а обочину и пр. чуть светлее — варианты») */
var RN_LOOK={paper:'#ffffff',grid:'#edf2f8',base:0.2,h1:0.36,h2:0.2,doodle:1};   // his pick: «дорога графит, бумага светлее, объекты не смягчай»
function nFt(col,w){ rx.strokeStyle=col; rx.lineWidth=w||3; rx.lineCap='round'; rx.lineJoin='round'; }
/* the felt-tip world round the road (around 0,0, in the sketches' pixels) */
var RN_DOODLE={
  tree:[function(){ nFt('#8a5a2a',3); rx.beginPath(); rx.moveTo(0,14); rx.lineTo(0,0); rx.stroke(); nFt('#3fae4a',3); rx.fillStyle='rgba(63,174,74,0.25)'; rx.beginPath(); rx.arc(0,-9,11,0,6.2832); rx.fill(); rx.stroke(); },12],
  fir:[function(){ nFt('#1f8a5a',3); rx.fillStyle='rgba(31,138,90,0.2)'; rx.beginPath(); rx.moveTo(0,-16); rx.lineTo(10,6); rx.lineTo(-10,6); rx.closePath(); rx.fill(); rx.stroke(); nFt('#8a5a2a',3); rx.beginPath(); rx.moveTo(0,6); rx.lineTo(0,12); rx.stroke(); },12],
  flowers:[function(){ for(var k=0;k<5;k++){ var fx=k*9-18, fy=((k*7)%5)-2; nFt('#3fae4a',2); rx.beginPath(); rx.moveTo(fx,fy+8); rx.lineTo(fx,fy); rx.stroke(); rx.fillStyle=['#ff4f8b','#b85ae8','#ffd23f'][k%3]; rx.beginPath(); rx.arc(fx,fy,3,0,6.2832); rx.fill(); } },14],
  sun:[function(){ nFt('#f0a020',3); rx.fillStyle='rgba(255,210,63,0.35)'; rx.beginPath(); rx.arc(0,0,13,0,6.2832); rx.fill(); rx.stroke(); for(var k=0;k<8;k++){ var a=k*0.785; rx.beginPath(); rx.moveTo(Math.cos(a)*18,Math.sin(a)*18); rx.lineTo(Math.cos(a)*25,Math.sin(a)*25); rx.stroke(); }
    nFt('#e0602a',2); rx.beginPath(); rx.arc(0,2,6,0.3,2.8); rx.stroke(); rx.fillStyle='#e0602a'; rx.beginPath(); rx.arc(-4,-3,1.6,0,6.2832); rx.arc(4,-3,1.6,0,6.2832); rx.fill(); },26],
  house:[function(r){ var col=['#e87a20','#b85ae8','#2a8ad8','#e0402a'][Math.floor(r()*4)]; nFt(col,3); rx.fillStyle='rgba(255,255,255,0.6)'; rx.beginPath(); rx.rect(-14,-2,28,20); rx.fill(); rx.stroke(); nFt('#e0402a',3); rx.beginPath(); rx.moveTo(-18,0); rx.lineTo(0,-16); rx.lineTo(18,0); rx.stroke();
    nFt('#2a5ad8',2.4); rx.strokeRect(-8,3,7,7); rx.beginPath(); rx.moveTo(4,18); rx.lineTo(4,8); rx.lineTo(10,8); rx.lineTo(10,18); rx.stroke(); },20],
  pond:[function(){ nFt('#2a8ad8',3); rx.fillStyle='rgba(111,184,255,0.35)'; rx.beginPath(); rx.ellipse(0,0,30,13,0,0,6.2832); rx.fill(); rx.stroke(); nFt('#e0402a',2); rx.beginPath(); rx.moveTo(-6,0); rx.lineTo(6,0); rx.lineTo(3,4); rx.lineTo(-3,4); rx.closePath(); rx.stroke(); rx.beginPath(); rx.moveTo(0,0); rx.lineTo(0,-10); rx.lineTo(6,-3); rx.stroke(); },32],
  cloud:[function(){ nFt('#6fb8ff',3); rx.beginPath(); rx.arc(-10,0,8,Math.PI*0.5,Math.PI*1.5); rx.arc(0,-6,10,Math.PI,0); rx.arc(12,0,8,Math.PI*1.5,Math.PI*0.5); rx.closePath(); rx.stroke(); },22],
  plane:[function(){ nFt('#2a5ad8',2.6); rx.beginPath(); rx.moveTo(-16,0); rx.lineTo(14,0); rx.moveTo(2,0); rx.lineTo(-4,-12); rx.moveTo(2,0); rx.lineTo(-4,12); rx.moveTo(-14,0); rx.lineTo(-18,-6); rx.stroke(); rx.setLineDash([3,5]); rx.beginPath(); rx.moveTo(-20,0); rx.lineTo(-50,4); rx.stroke(); rx.setLineDash([]); },26],
  cat:[function(){ nFt('#e87a20',2.6); rx.beginPath(); rx.arc(0,0,7,0,6.2832); rx.stroke(); rx.beginPath(); rx.moveTo(-6,-4); rx.lineTo(-5,-12); rx.lineTo(-1,-7); rx.moveTo(6,-4); rx.lineTo(5,-12); rx.lineTo(1,-7); rx.stroke(); rx.beginPath(); rx.moveTo(7,3); rx.quadraticCurveTo(16,4,14,-6); rx.stroke(); rx.fillStyle=RN_INK; rx.beginPath(); rx.arc(-2.5,-1,1.2,0,6.2832); rx.arc(2.5,-1,1.2,0,6.2832); rx.fill(); },14],
  sign:[function(){ nFt('#8a5a2a',3); rx.beginPath(); rx.moveTo(0,14); rx.lineTo(0,-6); rx.stroke(); nFt('#e0402a',2.6); rx.fillStyle='#fff'; rx.beginPath(); rx.moveTo(-10,-14); rx.lineTo(10,-14); rx.lineTo(15,-9); rx.lineTo(10,-4); rx.lineTo(-10,-4); rx.closePath(); rx.fill(); rx.stroke(); },14] };
var RN_KINDS=['tree','tree','fir','tree','flowers','fir','tree','fir'], RN_RARE=['house','pond','cloud','plane','cat','sign','sun','house','cloud'];
/* the grid of the paper, the pencil road with the highlighter, the doodles — a chunk of the land (as rChunk in 48_racehd.js) */
function noteChunk(rg,i,W,H){ var r=rR(rHash(RC.seed,i)+7), road=rChunkRoad(rg,i), x0s=i*W, x, k;
  rx.fillStyle=RN_LOOK.paper; rx.fillRect(-2,-2,W+8,H+4);
  rx.strokeStyle=RN_LOOK.grid; rx.lineWidth=0.4; for(x=8-(x0s%8);x<W+6;x+=8){ rx.beginPath(); rx.moveTo(x,-2); rx.lineTo(x,H+2); rx.stroke(); } for(var y=0;y<H+2;y+=8){ rx.beginPath(); rx.moveTo(-2,y); rx.lineTo(W+6,y); rx.stroke(); }
  // the doodles: a few kinds, one rare one now and then, none on the road, none over another
  var placed=[], list=[]; for(k=0;k<5;k++) list.push(RN_KINDS[Math.floor(r()*RN_KINDS.length)]); if(r()<0.7) list.unshift(RN_RARE[Math.floor(r()*RN_RARE.length)]);
  list.forEach(function(name){ var d=RN_DOODLE[name], rad=d[1]/2+1; for(var t=0;t<30;t++){ var px=rad+r()*(W-2*rad), py=26+r()*(H-36); if(!rOff(road,px,py,rad+4)) continue;
      if(placed.some(function(q){ var dx=q[0]-px, dy=q[1]-py; return dx*dx+dy*dy<(q[2]+rad+2)*(q[2]+rad+2); })) continue; placed.push([px,py,rad]);
      rx.save(); rx.globalAlpha=RN_LOOK.doodle; rx.translate(px,py); rx.scale(0.5,0.5); d[0](r); rx.restore(); break; } });
  // the road: pencil shading (keeps to the world), the highlighter along the edges, a hand-drawn edge twice, a white dashed middle
  rx.save(); rRoadPath(road,0); rx.clip(); if(RN_LOOK.base){ rx.fillStyle='rgba(90,90,110,'+RN_LOOK.base+')'; rx.fillRect(-2,-2,W+8,H+4); } rx.lineWidth=0.6; rx.strokeStyle='rgba(80,80,100,'+RN_LOOK.h1+')'; var tn=Math.tan(0.35)*H;
  for(x=-H-(x0s%1.75);x<W+H;x+=1.75){ rx.beginPath(); rx.moveTo(x,0); rx.lineTo(x+tn,H); rx.stroke(); }
  rx.strokeStyle='rgba(80,80,100,'+RN_LOOK.h2+')'; rx.lineWidth=0.5; tn=Math.tan(-0.5)*H; for(x=-(x0s%2.5);x<W+H;x+=2.5){ rx.beginPath(); rx.moveTo(x,0); rx.lineTo(x+tn,H); rx.stroke(); } rx.restore();
  rx.lineCap='round'; rx.lineJoin='round';
  [-1,1].forEach(function(sd){ rx.strokeStyle='rgba(255,226,80,0.55)'; rx.lineWidth=4.5; rEdge(road,sd,-2.5); rx.stroke();
    [0,0.6].forEach(function(j){ rx.strokeStyle='rgba(60,60,80,0.8)'; rx.lineWidth=0.8; rx.beginPath(); for(var q=0;q<road.m.length;q++){ var px=-4+q*2; rx.lineTo(px,road.m[q]+sd*(road.w[q]+j)+Math.sin((x0s+px)*0.11+j*3)*0.35); } rx.stroke(); }); });
  rx.setLineDash([6,6]); rx.lineDashOffset=x0s%12; rx.strokeStyle=RN_LOOK.paper; rx.lineWidth=1.75; rx.beginPath(); for(k=0;k<road.m.length;k++) rx.lineTo(-4+k*2,road.m[k]); rx.stroke(); rx.setLineDash([]); rx.lineDashOffset=0; }
/* ── the cars and the gifts (around 0,0, in the sketches' pixels; rSprite scales them by a half) ── */
function nWheel(x,y,w,h){ rx.fillStyle=RN_INK; rx.beginPath(); rx.roundRect(x-w/2,y-h/2,w,h,2); rx.fill(); }
function nRocket(){ [[-10,-12],[12,-12],[-10,12],[12,12]].forEach(function(q){ nWheel(q[0],q[1],9,5); }); rx.strokeStyle=RN_INK; rx.lineWidth=2; rx.lineJoin='round';
  rx.fillStyle='#8a8aa0'; rx.beginPath(); rx.roundRect(-27,-5,7,10,2); rx.fill(); rx.stroke();
  function body(){ rx.beginPath(); rx.moveTo(26,0); rx.quadraticCurveTo(24,-10,10,-11); rx.lineTo(-20,-10); rx.lineTo(-20,10); rx.lineTo(10,11); rx.quadraticCurveTo(24,10,26,0); }
  rx.fillStyle='#2fe0b0'; body(); rx.fill(); rx.save(); body(); rx.clip(); rx.fillStyle='#ffffff'; rx.fillRect(-22,-5,50,3); rx.fillRect(-22,2,50,3); rx.restore(); body(); rx.stroke();
  rx.fillStyle='#bfe8ff'; rx.beginPath(); rx.roundRect(2,-7,9,14,3); rx.fill(); rx.stroke();
  rx.fillStyle='#ff5a8a'; rx.beginPath(); rx.moveTo(-16,-10); rx.lineTo(-22,-17); rx.lineTo(-8,-10); rx.fill(); rx.stroke(); rx.beginPath(); rx.moveTo(-16,10); rx.lineTo(-22,17); rx.lineTo(-8,10); rx.fill(); rx.stroke();
  rx.fillStyle='#ffe066'; rx.beginPath(); rx.arc(24,-4,1.6,0,6.2832); rx.arc(24,4,1.6,0,6.2832); rx.fill(); }
function nCar(fill){ rx.fillStyle=fill; rx.strokeStyle=RN_INK; rx.lineWidth=2; rx.beginPath(); rx.roundRect(-19,-10,38,20,7); rx.fill(); rx.stroke(); rx.fillStyle='#fbfaf4'; rx.beginPath(); rx.roundRect(-3,-7,11,14,3); rx.fill(); rx.stroke(); rx.fillStyle=RN_INK; [[-11,-12],[9,-12],[-11,12],[9,12]].forEach(function(q){ rx.beginPath(); rx.roundRect(q[0]-4,q[1]-2,8,4,2); rx.fill(); }); }
function nTruck(){ rx.strokeStyle=RN_INK; rx.lineWidth=2; [[-11,-11],[3,-11],[13,-11],[-11,11],[3,11],[13,11]].forEach(function(q){ nWheel(q[0],q[1],7,4); }); rx.fillStyle='#ffb52e'; rx.fillRect(-19,-10,26,20); rx.strokeRect(-19,-10,26,20); rx.fillStyle='#e8284a'; rx.beginPath(); rx.roundRect(8,-9,12,18,[1,5,5,1]); rx.fill(); rx.stroke(); rx.fillStyle='#bfe8ff'; rx.fillRect(13,-6,5,12); }
function nBus(){ rx.strokeStyle=RN_INK; rx.lineWidth=2; [[-11,-11],[10,-11],[-11,11],[10,11]].forEach(function(q){ nWheel(q[0],q[1],7,4); }); rx.fillStyle='#4fb8ff'; rx.beginPath(); rx.roundRect(-20,-10,40,20,4); rx.fill(); rx.stroke(); rx.fillStyle='#fff'; for(var k=-15;k<12;k+=7){ rx.fillRect(k,-7,4.5,14); rx.strokeRect(k,-7,4.5,14); } }
function nBug(){ rx.strokeStyle=RN_INK; rx.lineWidth=2; [[-9,-11],[9,-11],[-9,11],[9,11]].forEach(function(q){ nWheel(q[0],q[1],7,4); }); rx.fillStyle='#e040c0'; rx.beginPath(); rx.ellipse(0,0,19,11,0,0,6.2832); rx.fill(); rx.stroke(); rx.fillStyle='#fff'; rx.beginPath(); rx.ellipse(4,0,6,8,0,0,6.2832); rx.fill(); rx.stroke(); }
var RN_CARS=[nTruck,nBus,nBug,function(){ nCar('#5a5a6e'); },function(){ nCar('#b87a3a'); },function(){ nCar('#e8284a'); }];   // the audit: an orange car was the truck's colour, a light blue one the bus's — dark grey and brown now (purple came out the ink blot's colour)   // no dark blue car here — the ink blot is dark blue
function nF(x,y,s,col){ rx.save(); rx.translate(x,y); rx.scale(s,s); rx.fillStyle=col; rx.beginPath(); rx.moveTo(-1.7,4.6); rx.lineTo(-1.7,-2); rx.lineTo(2.3,-2); rx.lineTo(2.3,-0.7); rx.lineTo(-0.35,-0.7); rx.lineTo(-0.35,0.8); rx.lineTo(1.7,0.8); rx.lineTo(1.7,2.1); rx.lineTo(-0.35,2.1); rx.lineTo(-0.35,4.6); rx.closePath(); rx.fill(); rx.restore(); }
function nPump(){ rx.strokeStyle=RN_INK; rx.lineWidth=2; rx.lineJoin='round'; rx.fillStyle='#3fd07a'; rx.beginPath(); rx.roundRect(-9,-13,15,27,3); rx.fill(); rx.stroke(); rx.fillStyle='#fff'; rx.fillRect(-6,-9,9,7); rx.strokeRect(-6,-9,9,7);
  rx.lineCap='round'; rx.beginPath(); rx.moveTo(6,-6); rx.quadraticCurveTo(14,-6,12,6); rx.lineTo(12,10); rx.stroke(); nF(-1.8,3.5,2.1,'#ffffff'); }
function nStar(r,fill){ rx.strokeStyle=RN_INK; rx.lineWidth=1.8; rx.lineJoin='round'; rx.fillStyle=fill||'#ffd23f'; rx.beginPath(); for(var k=0;k<10;k++){ var a=-1.5708+k*0.6283, rr=k%2?r*0.45:r; rx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr); } rx.closePath(); rx.fill(); rx.stroke(); }
function nMagnet(){ rx.fillStyle='#e8284a'; rx.strokeStyle=RN_INK; rx.lineWidth=1.8; rx.lineJoin='round'; rx.beginPath(); rx.arc(0,-2,11,Math.PI,0); rx.lineTo(11,10); rx.lineTo(4,10); rx.lineTo(4,-2); rx.arc(0,-2,4,0,Math.PI,true); rx.lineTo(-4,10); rx.lineTo(-11,10); rx.closePath(); rx.fill(); rx.stroke(); rx.fillStyle='#fff'; rx.fillRect(-10,5,5,4); rx.fillRect(5,5,5,4); }
function nKnight(){ rx.strokeStyle=RN_INK; rx.lineWidth=2; rx.lineJoin='round'; rx.fillStyle='#4fb8ff'; rx.beginPath(); rx.moveTo(-11,-12); rx.lineTo(11,-12); rx.lineTo(10,2); rx.quadraticCurveTo(6,11,0,15); rx.quadraticCurveTo(-6,11,-10,2); rx.closePath(); rx.fill(); rx.stroke(); rx.fillStyle='#fff'; rx.fillRect(-2,-10,4,20); rx.fillRect(-9,-3,18,4); }
function nSuper(){ rx.strokeStyle='#e8a020'; rx.lineWidth=2.4; rx.lineCap='round'; for(var k=0;k<12;k++){ var a=k*0.5236; rx.beginPath(); rx.moveTo(Math.cos(a)*19,Math.sin(a)*19); rx.lineTo(Math.cos(a)*27,Math.sin(a)*27); rx.stroke(); }
  rx.fillStyle='#ffe066'; rx.strokeStyle=RN_INK; rx.lineWidth=1.8; rx.beginPath(); rx.arc(0,0,16,0,6.2832); rx.fill(); rx.stroke(); rx.save(); rx.translate(0,1); rx.scale(0.7,0.7); nMagnet(); rx.restore(); }
/* the ink blot (in sketch pixels: its half-width as the candy puddle's, 1.15 r) */
function nBlot(r){ rx.fillStyle='#1f3fa8'; rx.beginPath(); for(var k=0;k<18;k++){ var a=k/18*6.2832, rr=1+0.18*Math.sin(k*2.3); rx.lineTo(Math.cos(a)*r*1.15*rr,Math.sin(a)*r*0.64*rr); } rx.closePath(); rx.fill();
  [[1.45,-0.42,0.13],[-1.4,0.48,0.11],[0.97,0.67,0.085]].forEach(function(q){ rx.beginPath(); rx.arc(q[0]*r,q[1]*r,q[2]*r,0,6.2832); rx.fill(); }); rx.fillStyle='rgba(255,255,255,0.35)'; rx.beginPath(); rx.ellipse(-r*0.36,-r*0.21,r*0.3,r*0.09,0,0,6.2832); rx.fill(); }
/* the sprites, in the size of the candy ones: the cars 19 sketch pixels long like theirs; the gifts a little bigger (the audit of 29 Sep) */
function noteCar(kind,player){ if(player){ rx.scale(0.43,0.43); nRocket(); return; } var k=kind%RN_CARS.length; rx.scale(k===1?0.46:k===0?0.47:0.5,0.5); RN_CARS[k](); }
function noteGift(t){ if(t==='fuel'){ rx.scale(0.62,0.62); nPump(); } else if(t==='coin'){ rx.scale(0.55,0.55); nStar(8); } else if(t==='magnet'){ rx.scale(0.5,0.5); nMagnet(); } else if(t==='bubble'){ rx.scale(0.55,0.55); nKnight(); } else if(t==='tmagnet'||t==='tbubble'){ rx.scale(0.5,0.5); nSuper(); } }
