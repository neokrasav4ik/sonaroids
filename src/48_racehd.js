/* ── SONARACE: THE CANDY LAND, HD (v0.84; the maintainer's picks from the sketches, 29 Sep: the road «А4» — chocolate tiles with candy
   kerbs; the land «Б2» — pink glaze with sprinkles and milk rivers, no chocolate ones; sweets of every kind and size; bridges, villages,
   camping, roadside cafés, a city — «конфетная страна»). Drawn smooth on the HD canvas, seen from above; the road comes from the race core
   (src/14_race.js), the land along it is made in chunks of 120 field units (baked once into off-screen canvases, from the race's seed and the
   chunk's number — the same land for the same race), the cars and gifts are drawn live.
   Units: the sketches were drawn in «sketch pixels» on a 195-pixel-high screen, so a field unit is SU = 195/180 of them; KS turns them into
   game pixels on this phone. ── */
var SU=195/180, RC={seed:-1,ch:{},zones:null,sp:{},key:''}, rx=null, RCW=120, rX0=null;
function rKS(){ return K/SU; }
function rR(seed){ var s=((seed>>>0)%2147483646)+1; return function(){ s=(s*16807)%2147483647; return (s-1)/2147483646; }; }
function rHash(a,b){ var h=Math.imul((a>>>0)^0x9e3779b9,0x85ebca6b)^Math.imul((b|0)+0x632be5ab,0xc2b2ae35); h^=h>>>15; h=Math.imul(h,0x27d4eb2f); return (h^(h>>>13))>>>0; }
/* ── the sweets (sketch pixels, around a point) ── */
function rShadow(px,py,w,h){ rx.fillStyle='rgba(80,20,50,0.16)'; rx.beginPath(); rx.ellipse(px+1.5,py+1.5,w,h,0,0,6.2832); rx.fill(); }
function rLolli(px,py,r,c1,c2){ rx.strokeStyle='#f6efe6'; rx.lineWidth=1.4; rx.beginPath(); rx.moveTo(px,py); rx.lineTo(px,py+r*2.2); rx.stroke();
  rx.fillStyle=c1; rx.beginPath(); rx.arc(px,py,r,0,6.2832); rx.fill(); rx.strokeStyle=c2; rx.lineWidth=r*0.2; rx.lineCap='round'; rx.beginPath(); for(var a=0;a<=12.6;a+=0.3){ var rr=r*0.9*a/12.6; rx.lineTo(px+Math.cos(a)*rr,py+Math.sin(a)*rr); } rx.stroke();
  rx.strokeStyle='rgba(90,30,60,0.55)'; rx.lineWidth=0.5; rx.beginPath(); rx.arc(px,py,r,0,6.2832); rx.stroke(); }
function rGum(px,py,r,c){ rx.fillStyle='rgba(0,0,0,0.12)'; rx.beginPath(); rx.ellipse(px+1,py+r*0.55,r*1.05,r*0.35,0,0,6.2832); rx.fill();
  rx.fillStyle=c; rx.beginPath(); rx.moveTo(px-r,py+r*0.5); rx.quadraticCurveTo(px-r,py-r,px,py-r); rx.quadraticCurveTo(px+r,py-r,px+r,py+r*0.5); rx.closePath(); rx.fill();
  rx.fillStyle='rgba(255,255,255,0.55)'; rx.beginPath(); rx.ellipse(px-r*0.35,py-r*0.45,r*0.28,r*0.18,-0.5,0,6.2832); rx.fill(); }
function rCotton(px,py,r,c){ rx.fillStyle=c; [[0,0,1],[-0.7,0.25,0.7],[0.7,0.2,0.75],[0.2,-0.45,0.65]].forEach(function(q){ rx.beginPath(); rx.arc(px+q[0]*r,py+q[1]*r,q[2]*r,0,6.2832); rx.fill(); });
  rx.fillStyle='rgba(255,255,255,0.45)'; rx.beginPath(); rx.arc(px-r*0.2,py-r*0.3,r*0.35,0,6.2832); rx.fill(); }
function rGinger(px,py,r){ var w=14+r()*4, h=11; rShadow(px,py+2,w*0.6,h*0.55);
  rx.fillStyle='#c07a3a'; rx.beginPath(); rx.roundRect(px-w/2,py-h/2,w,h,2); rx.fill();
  rx.fillStyle='#e8a060'; rx.beginPath(); rx.moveTo(px-w/2,py-h/2); rx.lineTo(px,py); rx.lineTo(px+w/2,py-h/2); rx.closePath(); rx.fill();
  rx.strokeStyle='#ffffff'; rx.lineWidth=1.1; rx.lineJoin='round'; rx.beginPath(); rx.roundRect(px-w/2,py-h/2,w,h,2); rx.stroke();
  rx.beginPath(); for(var i=0;i<=6;i++){ rx.lineTo(px-w/2+w*i/6,py-h/2+(i%2?1.8:0)); } rx.stroke(); rx.beginPath(); rx.moveTo(px-w/2,py); rx.lineTo(px+w/2,py); rx.stroke();
  [['#ff4f7a',-w/4],['#3fc7ff',w/4]].forEach(function(q){ rx.fillStyle=q[0]; rx.beginPath(); rx.arc(px+q[1],py+h/4,1.3,0,6.2832); rx.fill(); });
  rx.fillStyle='#8a4a1a'; rx.fillRect(px+w/2-4,py-h/2-2,2.4,3); rx.fillStyle='rgba(255,255,255,0.8)'; rx.beginPath(); rx.arc(px+w/2-2.8,py-h/2-3,1.4,0,6.2832); rx.fill(); }
function rCupcake(px,py,r){ var s=4.6+r()*1.4; rShadow(px,py,s*1.1,s*0.8);
  rx.fillStyle='#f3c9a0'; rx.beginPath(); rx.arc(px,py,s*1.05,0,6.2832); rx.fill(); rx.strokeStyle='#d99a66'; rx.lineWidth=0.5; rx.beginPath(); for(var a=0;a<6.28;a+=0.5){ rx.moveTo(px+Math.cos(a)*s*0.7,py+Math.sin(a)*s*0.7); rx.lineTo(px+Math.cos(a)*s*1.05,py+Math.sin(a)*s*1.05); } rx.stroke();
  rx.fillStyle=['#ffb3d9','#c9f0ff','#fff3a8','#d8c2ff'][Math.floor(r()*4)]; rx.beginPath(); rx.arc(px,py,s*0.78,0,6.2832); rx.fill();
  rx.strokeStyle='rgba(255,255,255,0.8)'; rx.lineWidth=0.7; rx.beginPath(); for(var b=0;b<=12.6;b+=0.3){ var rr=s*0.7*(1-b/12.6); rx.lineTo(px+Math.cos(b)*rr,py+Math.sin(b)*rr); } rx.stroke();
  rx.fillStyle='#e8123a'; rx.beginPath(); rx.arc(px+0.3,py-0.3,1.3,0,6.2832); rx.fill(); rx.fillStyle='rgba(255,255,255,0.8)'; rx.beginPath(); rx.arc(px-0.1,py-0.7,0.4,0,6.2832); rx.fill(); }
function rDonut(px,py,r){ var s=6+r()*2; rShadow(px,py,s,s*0.8); rx.fillStyle='#e0a060'; rx.beginPath(); rx.arc(px,py,s,0,6.2832); rx.fill();
  rx.fillStyle=['#ff7ab8','#7a3a20','#b8f0ff'][Math.floor(r()*3)]; rx.beginPath(); rx.arc(px,py,s*0.86,0,6.2832); rx.fill();
  for(var i=0;i<12;i++){ var a=r()*6.28, d=s*(0.5+r()*0.3); rx.fillStyle=['#fff','#ffe066','#6fd7ff','#7be38f'][i%4]; rx.save(); rx.translate(px+Math.cos(a)*d,py+Math.sin(a)*d); rx.rotate(r()*3); rx.fillRect(-0.8,-0.25,1.6,0.5); rx.restore(); }
  rx.fillStyle='#ffd8ec'; rx.beginPath(); rx.arc(px,py,s*0.36,0,6.2832); rx.fill(); }
function rCane(px,py,r){ var ang=-0.6+r()*0.3, L=12; rx.save(); rx.translate(px,py); rx.rotate(ang); rShadow(1,1,L*0.55,1.6);
  rx.lineCap='round'; rx.lineWidth=2.6; rx.strokeStyle='#ffffff'; rx.beginPath(); rx.moveTo(-L/2,0); rx.lineTo(L/2-3,0); rx.arc(L/2-3,-3,3,Math.PI/2,-Math.PI/2*0.2,true); rx.stroke();
  rx.strokeStyle='#ff2f55'; rx.setLineDash([1.6,1.6]); rx.beginPath(); rx.moveTo(-L/2,0); rx.lineTo(L/2-3,0); rx.arc(L/2-3,-3,3,Math.PI/2,-Math.PI/2*0.2,true); rx.stroke(); rx.setLineDash([]); rx.restore(); }
function rMarsh(px,py,r){ var s=2.6+r()*1; rShadow(px,py,s,s*0.7); rx.fillStyle=['#ffffff','#ffd6ea','#d6f5ff'][Math.floor(r()*3)]; rx.beginPath(); rx.roundRect(px-s,py-s,s*2,s*2,s*0.8); rx.fill(); rx.strokeStyle='rgba(200,150,180,0.6)'; rx.lineWidth=0.4; rx.stroke(); }
function rScoop(px,py,r){ var s=5+r()*1.5, c=['#ffb3d9','#fff0c0','#a8f0c8','#c8a0ff','#8a4a2a'][Math.floor(r()*5)]; rShadow(px,py+1,s,s*0.8);
  rx.fillStyle=c; rx.beginPath(); rx.arc(px,py,s,0,6.2832); rx.fill(); for(var i=0;i<5;i++){ rx.beginPath(); rx.arc(px-s+i*s*0.5,py+s*0.75,s*0.28,0,6.2832); rx.fill(); }
  rx.fillStyle='rgba(255,255,255,0.55)'; rx.beginPath(); rx.ellipse(px-s*0.35,py-s*0.4,s*0.35,s*0.22,-0.5,0,6.2832); rx.fill(); }
function rCake(px,py){ var s=8; rShadow(px,py,s,s*0.7); rx.fillStyle='#fff6e8'; rx.beginPath(); rx.arc(px,py,s,0,6.2832); rx.fill(); rx.strokeStyle='#ffb3d0'; rx.lineWidth=1.4; rx.beginPath(); rx.arc(px,py,s-0.8,0,6.2832); rx.stroke();
  rx.fillStyle='#e8123a'; for(var i=0;i<8;i++){ var a=i/8*6.28; rx.beginPath(); rx.arc(px+Math.cos(a)*s*0.62,py+Math.sin(a)*s*0.62,1.1,0,6.2832); rx.fill(); } rx.fillStyle='#ff4f7a'; rx.beginPath(); rx.arc(px,py,1.8,0,6.2832); rx.fill(); }
function rBonbon(px,py,k,r){ var c=['#ff4f7a','#ffd23f','#3fc7ff','#9b5bff','#2fd08a'][Math.floor(r()*5)], a=r()*0.8-0.4; rx.save(); rx.translate(px,py); rx.rotate(a); rx.scale(k,k); rShadow(1,1,6,2.6);
  rx.fillStyle=c; rx.beginPath(); rx.moveTo(-3,0); rx.lineTo(-7,-3); rx.lineTo(-6,0); rx.lineTo(-7,3); rx.closePath(); rx.fill(); rx.beginPath(); rx.moveTo(3,0); rx.lineTo(7,-3); rx.lineTo(6,0); rx.lineTo(7,3); rx.closePath(); rx.fill();
  rx.beginPath(); rx.ellipse(0,0,3.6,2.8,0,0,6.2832); rx.fill(); rx.strokeStyle='rgba(255,255,255,0.8)'; rx.lineWidth=0.6; rx.beginPath(); for(var i=-2;i<=2;i+=2){ rx.moveTo(i-1,-2.4); rx.lineTo(i+1,2.4); } rx.stroke();
  rx.fillStyle='rgba(255,255,255,0.6)'; rx.beginPath(); rx.ellipse(-1,-1.3,1.2,0.6,-0.3,0,6.2832); rx.fill(); rx.restore(); }
function rMacaron(px,py,k,r){ var c=['#ffb3d0','#b8f0d0','#d8c2ff','#fff0a0','#a8dcff'][Math.floor(r()*5)], s=4*k; rShadow(px,py,s*1.05,s*0.8);
  rx.fillStyle=c; rx.beginPath(); rx.arc(px,py,s,0,6.2832); rx.fill(); rx.strokeStyle='rgba(255,255,255,0.9)'; rx.lineWidth=0.8*k; rx.beginPath(); rx.arc(px,py,s*0.93,0,6.2832); rx.stroke();
  rx.fillStyle='rgba(255,255,255,0.5)'; rx.beginPath(); rx.arc(px-s*0.3,py-s*0.3,s*0.3,0,6.2832); rx.fill(); }
function rCookie(px,py,k,r){ var s=5.5*k; rShadow(px,py,s,s*0.8); rx.fillStyle='#e0a860'; rx.beginPath(); for(var a=0;a<6.3;a+=0.4){ var rr=s*(0.92+((a*13)%1)*0.1); rx.lineTo(px+Math.cos(a)*rr,py+Math.sin(a)*rr); } rx.closePath(); rx.fill();
  rx.strokeStyle='#b87a3a'; rx.lineWidth=0.5; rx.stroke(); rx.fillStyle='#4a2410'; for(var i=0;i<6;i++){ var a2=r()*6.28, d=r()*s*0.7; rx.beginPath(); rx.arc(px+Math.cos(a2)*d,py+Math.sin(a2)*d,0.9*k,0,6.2832); rx.fill(); } }
function rLicorice(px,py,k,r){ var s=5*k, c=r()<0.5?'#2a1420':'#e8284a'; rShadow(px,py,s,s*0.8); rx.strokeStyle=c; rx.lineWidth=1.6*k; rx.lineCap='round'; rx.beginPath(); for(var a=0;a<=15;a+=0.3){ var rr=s*a/15; rx.lineTo(px+Math.cos(a)*rr,py+Math.sin(a)*rr); } rx.stroke();
  if(c==='#2a1420'){ rx.fillStyle='#ff5ab0'; rx.beginPath(); rx.arc(px,py,1.2*k,0,6.2832); rx.fill(); } }
function rChoc(px,py,k,r){ var w=9*k, h=7*k, a=r()*0.6-0.3; rx.save(); rx.translate(px,py); rx.rotate(a); rShadow(1,1,w*0.6,h*0.5); rx.fillStyle='#5a2e16'; rx.beginPath(); rx.roundRect(-w/2,-h/2,w,h,1); rx.fill();
  rx.strokeStyle='rgba(30,10,4,0.6)'; rx.lineWidth=0.6; rx.beginPath(); rx.moveTo(0,-h/2); rx.lineTo(0,h/2); rx.moveTo(-w/2,0); rx.lineTo(w/2,0); rx.stroke();
  rx.fillStyle='#f4f4f8'; rx.beginPath(); rx.moveTo(w/2-2*k,-h/2); rx.lineTo(w/2+1.5*k,-h/2-1*k); rx.lineTo(w/2+1*k,h/2+1*k); rx.lineTo(w/2-2*k,h/2); rx.closePath(); rx.fill(); rx.restore(); }
function rScaled(fn){ return function(px,py,k,r){ rx.save(); rx.translate(px,py); rx.scale(k,k); rx.translate(-px,-py); fn(px,py,r); rx.restore(); }; }
var R_ITEMS={ house:[rScaled(rGinger),13,[1,1.6]], cake:[rScaled(rCake),9,[0.9,1.7]], cupcake:[rScaled(rCupcake),6,[0.8,1.8]], donut:[rScaled(rDonut),7,[0.7,1.6]],
  lolli:[function(px,py,k,r){ rLolli(px,py-5*k,4*k,['#ff5a8a','#6fd7ff','#ffd23f','#7be38f','#b98cff'][Math.floor(r()*5)],'#ffffff'); },5,[0.7,2.2]],
  cane:[rScaled(rCane),6,[0.8,1.7]], gum:[function(px,py,k,r){ rGum(px,py,3.6*k,['#9b5bff','#2fd08a','#ff8a3d','#ff4fa0','#3fc7ff'][Math.floor(r()*5)]); },4,[0.6,2]],
  marsh:[rScaled(rMarsh),3,[0.8,2]], scoop:[rScaled(rScoop),6,[0.7,1.6]], cotton:[function(px,py,k,r){ rCotton(px,py,4*k,['#ffd6f0','#d6f0ff','#fff3b0'][Math.floor(r()*3)]); },5,[0.8,2]],
  bonbon:[rBonbon,6,[0.7,1.6]], macaron:[rMacaron,4,[0.7,1.8]], cookie:[rCookie,6,[0.7,1.7]], licorice:[rLicorice,5,[0.7,1.6]], choc:[rChoc,6,[0.7,1.5]] };
var R_KINDS=['house','cake','cupcake','donut','lolli','cane','gum','marsh','scoop','cotton','bonbon','macaron','cookie','licorice','choc'];
/* ── the village, the camping, the café, the city ── */
function rRoofHouse(px,py,w,h,wall,roof,trim){ rShadow(px+1,py+1,w*0.6,h*0.6); rx.fillStyle=wall; rx.beginPath(); rx.roundRect(px-w/2,py-h/2,w,h,1.5); rx.fill();
  rx.fillStyle=roof; rx.beginPath(); rx.moveTo(px-w/2,py-h/2); rx.lineTo(px+w/2,py-h/2); rx.lineTo(px+w/2-h*0.25,py); rx.lineTo(px-w/2+h*0.25,py); rx.closePath(); rx.fill();
  rx.fillStyle='rgba(0,0,0,0.12)'; rx.beginPath(); rx.moveTo(px-w/2,py+h/2); rx.lineTo(px+w/2,py+h/2); rx.lineTo(px+w/2-h*0.25,py); rx.lineTo(px-w/2+h*0.25,py); rx.closePath(); rx.fill();
  rx.strokeStyle=trim; rx.lineWidth=0.9; rx.lineJoin='round'; rx.beginPath(); rx.roundRect(px-w/2,py-h/2,w,h,1.5); rx.stroke(); rx.beginPath(); rx.moveTo(px-w/2+h*0.25,py); rx.lineTo(px+w/2-h*0.25,py); rx.stroke();
  rx.beginPath(); for(var i=0;i<=8;i++) rx.lineTo(px-w/2+w*i/8,py-h/2+(i%2?1.4:0)); rx.stroke(); }
function rChimney(px,py){ rx.fillStyle='#8a4a1a'; rx.fillRect(px-1.2,py-1.2,2.4,2.4); rx.fillStyle='rgba(255,240,250,0.85)'; [[1.5,-2,1.6],[3,-4,2],[5,-6.5,2.4]].forEach(function(q){ rx.beginPath(); rx.arc(px+q[0],py+q[1],q[2],0,6.2832); rx.fill(); }); }
function rFence(px0,py,px1){ rx.strokeStyle='#ffffff'; rx.lineWidth=0.9; rx.beginPath(); rx.moveTo(px0,py); rx.lineTo(px1,py); rx.stroke(); for(var p=px0,i=0;p<=px1;p+=3,i++){ rx.fillStyle=i%2?'#ff3b5c':'#ffffff'; rx.fillRect(p-0.6,py-1.4,1.2,2.8); } }
function rGarden(px,py,cols,rows){ rx.fillStyle='#c98a5a'; rx.beginPath(); rx.roundRect(px-1,py-1,cols*4+2,rows*4+2,1.5); rx.fill(); for(var i=0;i<cols;i++) for(var j=0;j<rows;j++){ rx.fillStyle=['#ff4fa0','#2fd08a','#ffd23f','#9b5bff'][(i+j*2)%4]; rx.beginPath(); rx.arc(px+i*4+2,py+j*4+2,1.4,0,6.2832); rx.fill(); } }
function rWell(px,py){ rShadow(px,py,4,3); rx.fillStyle='#e0a860'; rx.beginPath(); rx.arc(px,py,3.6,0,6.2832); rx.fill(); rx.fillStyle='#fffaf0'; rx.beginPath(); rx.arc(px,py,2.2,0,6.2832); rx.fill(); rx.strokeStyle='#ff3b5c'; rx.lineWidth=0.8; rx.beginPath(); rx.moveTo(px-4,py); rx.lineTo(px+4,py); rx.stroke(); }
function rStall(px,py,c){ rShadow(px,py+1,5,3); rx.fillStyle='#fff'; rx.fillRect(px-5,py-3.5,10,7); rx.fillStyle=c; for(var i=0;i<5;i++) rx.fillRect(px-5+i*2,py-3.5,1,7); rx.strokeStyle='rgba(120,40,60,0.5)'; rx.lineWidth=0.4; rx.strokeRect(px-5,py-3.5,10,7); }
function rChurch(px,py){ rRoofHouse(px,py,16,11,'#fff0f6','#ff8ab8','#ffffff'); rx.fillStyle='#ffd23f'; rx.beginPath(); rx.moveTo(px+9,py-3); rx.lineTo(px+15,py); rx.lineTo(px+9,py+3); rx.closePath(); rx.fill(); rx.fillStyle='#e8123a'; rx.beginPath(); rx.arc(px,py-0.5,1.8,0,6.2832); rx.fill(); }
function rWindmill(px,py,t){ rShadow(px,py,5,4); rx.fillStyle='#ffe0b8'; rx.beginPath(); rx.arc(px,py,4.5,0,6.2832); rx.fill(); rx.strokeStyle='#d99a66'; rx.lineWidth=0.6; rx.stroke();
  for(var i=0;i<4;i++){ rx.save(); rx.translate(px,py); rx.rotate(t+i*Math.PI/2); rx.fillStyle=i%2?'#ff4f7a':'#ffffff'; rx.beginPath(); rx.moveTo(0,-1); rx.lineTo(11,-2.6); rx.lineTo(11,2.6); rx.lineTo(0,1); rx.closePath(); rx.fill(); rx.restore(); }
  rx.fillStyle='#ffd23f'; rx.beginPath(); rx.arc(px,py,1.6,0,6.2832); rx.fill(); }
function rCow(px,py){ rShadow(px,py,3.4,2); rx.fillStyle='#ffffff'; rx.beginPath(); rx.ellipse(px,py,3.4,2.2,0,0,6.2832); rx.fill(); rx.fillStyle='#ff9ccc'; rx.beginPath(); rx.arc(px+3.4,py,1.3,0,6.2832); rx.fill(); rx.fillStyle='#8a4a2a'; rx.beginPath(); rx.arc(px-1,py-0.5,0.9,0,6.2832); rx.arc(px+1,py+0.8,0.7,0,6.2832); rx.fill(); }
function rTent(px,py,c){ rShadow(px,py+1,6,4); rx.fillStyle=c; rx.beginPath(); rx.moveTo(px-6,py+4); rx.lineTo(px,py-5); rx.lineTo(px+6,py+4); rx.closePath(); rx.fill(); rx.fillStyle='rgba(0,0,0,0.15)'; rx.beginPath(); rx.moveTo(px,py-5); rx.lineTo(px+6,py+4); rx.lineTo(px,py+4); rx.closePath(); rx.fill();
  rx.strokeStyle='rgba(150,90,30,0.6)'; rx.lineWidth=0.4; rx.beginPath(); for(var i=-4;i<=4;i+=2){ rx.moveTo(px+i,py+4); rx.lineTo(px,py-5); } rx.stroke(); rx.fillStyle='#3a1a10'; rx.beginPath(); rx.moveTo(px-1.2,py+4); rx.lineTo(px,py+1); rx.lineTo(px+1.2,py+4); rx.fill(); }
function rCampfire(px,py){ rx.fillStyle='rgba(255,180,80,0.35)'; rx.beginPath(); rx.arc(px,py,6,0,6.2832); rx.fill(); rx.fillStyle='#8a4a1a'; rx.fillRect(px-3,py-0.6,6,1.2); rx.fillRect(px-0.6,py-3,1.2,6); rx.fillStyle='#ff8a3d'; rx.beginPath(); rx.arc(px,py,1.8,0,6.2832); rx.fill(); rx.fillStyle='#ffe066'; rx.beginPath(); rx.arc(px,py,0.9,0,6.2832); rx.fill();
  [[-5,-4],[5,3],[-4,5]].forEach(function(q){ rx.strokeStyle='#c8a070'; rx.lineWidth=0.5; rx.beginPath(); rx.moveTo(px+q[0]*1.4,py+q[1]*1.4); rx.lineTo(px+q[0]*0.5,py+q[1]*0.5); rx.stroke(); rx.fillStyle='#fff'; rx.beginPath(); rx.roundRect(px+q[0]*0.55-1,py+q[1]*0.55-1,2,2,0.6); rx.fill(); }); }
function rLake(px,py,rX,rY){ rx.fillStyle='#e8dcc8'; rx.beginPath(); rx.ellipse(px,py,rX+1.5,rY+1.5,0,0,6.2832); rx.fill(); rx.fillStyle='#fffaf0'; rx.beginPath(); rx.ellipse(px,py,rX,rY,0,0,6.2832); rx.fill();
  rx.strokeStyle='rgba(200,180,150,0.6)'; rx.lineWidth=0.7; for(var i=0;i<5;i++){ rx.beginPath(); rx.arc(px-rX*0.4+i*rX*0.2,py-rY*0.3+(i%2)*rY*0.4,3,0.2,1.4); rx.stroke(); } }
function rBoat(px,py){ rx.fillStyle='#e0a860'; rx.beginPath(); rx.ellipse(px,py,4,1.8,0,0,6.2832); rx.fill(); rx.strokeStyle='#b87a3a'; rx.lineWidth=0.5; rx.stroke(); rx.fillStyle='#ff4f7a'; rx.beginPath(); rx.moveTo(px,py-0.5); rx.lineTo(px+2.5,py-0.5); rx.lineTo(px,py-4); rx.closePath(); rx.fill(); }
function rPier(px0,py0,px1,py1){ rx.strokeStyle='#d8a060'; rx.lineWidth=2.4; rx.lineCap='butt'; rx.beginPath(); rx.moveTo(px0,py0); rx.lineTo(px1,py1); rx.stroke(); rx.strokeStyle='rgba(150,90,30,0.6)'; rx.setLineDash([0.5,1.5]); rx.beginPath(); rx.moveTo(px0,py0); rx.lineTo(px1,py1); rx.stroke(); rx.setLineDash([]); }
function rCafe(px,py){ rShadow(px,py+2,11,6); rx.fillStyle='#fff6e8'; rx.beginPath(); rx.roundRect(px-10,py-7,20,14,2); rx.fill(); rx.fillStyle='#ffb3d0'; rx.beginPath(); rx.roundRect(px-10,py-7,20,6,[2,2,0,0]); rx.fill();
  rx.strokeStyle='#ff4f9a'; rx.lineWidth=0.6; rx.beginPath(); rx.roundRect(px-10,py-7,20,14,2); rx.stroke(); rx.fillStyle='#e0a860'; rx.beginPath(); rx.moveTo(px-3,py-9); rx.lineTo(px+3,py-9); rx.lineTo(px,py-3); rx.closePath(); rx.fill(); rx.fillStyle='#ff9ccc'; rx.beginPath(); rx.arc(px,py-10,3,0,6.2832); rx.fill();
  [[-15,6],[-7,11],[3,12],[13,7]].forEach(function(q,i){ var c=['#ff4f7a','#3fc7ff','#ffd23f','#2fd08a'][i]; rShadow(px+q[0],py+q[1],3.5,3); rx.fillStyle=c; rx.beginPath(); rx.arc(px+q[0],py+q[1],3.6,0,6.2832); rx.fill(); rx.fillStyle='#fff'; for(var k=0;k<4;k++){ rx.beginPath(); rx.moveTo(px+q[0],py+q[1]); rx.arc(px+q[0],py+q[1],3.6,k*1.57,k*1.57+0.6); rx.fill(); } }); }
function rStation(px,py){ rShadow(px,py+2,14,7); rx.fillStyle='#8fdcff'; rx.beginPath(); rx.roundRect(px-12,py-7,24,14,3); rx.fill(); rx.fillStyle='#ffffff'; rx.beginPath(); rx.roundRect(px-12,py-7,24,4,[3,3,0,0]); rx.fill();
  rx.fillStyle='#ff4f9a'; for(var i=0;i<6;i++) rx.fillRect(px-12+i*4,py-7,2,4); rx.strokeStyle='#2a7ab0'; rx.lineWidth=0.6; rx.beginPath(); rx.roundRect(px-12,py-7,24,14,3); rx.stroke();
  [[-6,3],[0,3],[6,3]].forEach(function(q){ rx.fillStyle='#3fd07a'; rx.beginPath(); rx.roundRect(px+q[0]-1.6,py+q[1]-3,3.2,5,1); rx.fill(); rx.fillStyle='#e8363a'; rx.fillRect(px+q[0]-0.8,py+q[1]-4,1.6,1); }); }
function rShade(c,k){ var n=parseInt(c.slice(1),16); return 'rgb('+Math.round(((n>>16)&255)*k)+','+Math.round(((n>>8)&255)*k)+','+Math.round((n&255)*k)+')'; }
function rBlock(px,py,w,h,wall,r){ rShadow(px+2,py+2,w*0.55,h*0.55);
  rx.fillStyle=rShade(wall,0.78); rx.beginPath(); rx.roundRect(px-w/2,py-h/2,w,h,2); rx.fill();
  rx.fillStyle=wall; rx.beginPath(); rx.roundRect(px-w/2+1.2,py-h/2+1.2,w-2.4,h-2.4,1.6); rx.fill();
  rx.strokeStyle='#ffffff'; rx.lineWidth=1.1; rx.lineJoin='round'; rx.beginPath(); for(var k=0;k<=Math.floor(w/2.5);k++) rx.lineTo(px-w/2+1.2+k*2.5,py-h/2+1.2+(k%2?1.6:0)); rx.stroke();
  var kind=Math.floor(r()*4);
  if(kind===0){ rx.fillStyle='#e8123a'; for(var i=0;i<3;i++){ rx.beginPath(); rx.arc(px-w/4+i*w/4,py+1,1.6,0,6.2832); rx.fill(); } }
  else if(kind===1){ rx.fillStyle='#fff'; rx.beginPath(); rx.arc(px,py+0.5,Math.min(w,h)*0.28,0,6.2832); rx.fill(); rx.fillStyle=rShade(wall,0.7); rx.beginPath(); rx.arc(px,py+0.5,Math.min(w,h)*0.14,0,6.2832); rx.fill(); }
  else if(kind===2){ rx.fillStyle='rgba(255,255,255,0.75)'; for(var j=0;j<6;j++){ rx.save(); rx.translate(px-w/2+3+r()*(w-6),py-h/2+4+r()*(h-6)); rx.rotate(r()*3); rx.fillRect(-1,-0.3,2,0.6); rx.restore(); } }
  else { rx.fillStyle='#ffd23f'; rx.fillRect(px-0.6,py-2,1.2,3.5); rx.fillStyle='#ff8a3d'; rx.beginPath(); rx.arc(px,py-2.6,1,0,6.2832); rx.fill(); } }
function rTower(px,py,r,c){ rShadow(px+1,py+1,r,r*0.8); rx.fillStyle=c; rx.beginPath(); rx.arc(px,py,r,0,6.2832); rx.fill(); rx.strokeStyle='#fff'; rx.lineWidth=r*0.18; rx.beginPath(); for(var a=0;a<=12.6;a+=0.3){ var rr=r*0.9*a/12.6; rx.lineTo(px+Math.cos(a)*rr,py+Math.sin(a)*rr); } rx.stroke(); }
function rFountain(px,py){ rx.fillStyle='#bfefb0'; rx.beginPath(); rx.arc(px,py,11,0,6.2832); rx.fill(); rx.fillStyle='#e0d0c0'; rx.beginPath(); rx.arc(px,py,6.5,0,6.2832); rx.fill(); rx.fillStyle='#8fdcff'; rx.beginPath(); rx.arc(px,py,5.3,0,6.2832); rx.fill();
  rx.strokeStyle='rgba(255,255,255,0.85)'; rx.lineWidth=0.4; for(var i=0;i<8;i++){ rx.beginPath(); rx.arc(px+((i*37)%7)-3.5,py+((i*23)%7)-3.5,0.5+(i%3)*0.4,0,6.28); rx.stroke(); } rx.fillStyle='#fff'; rx.beginPath(); rx.arc(px,py,1.3,0,6.2832); rx.fill(); }
function rLight3(px,py){ rx.fillStyle='#3a2a40'; rx.beginPath(); rx.roundRect(px-1.8,py-5,3.6,10,1.2); rx.fill(); [['#ff3b5c',-3],['#ffd23f',0],['#2fd08a',3]].forEach(function(q,i){ rx.fillStyle=i===2?q[0]:'rgba(255,255,255,0.25)'; rx.beginPath(); rx.arc(px,py+q[1],1.2,0,6.2832); rx.fill(); }); }
function rSign(px,py,dir){ rx.fillStyle='#f6efe6'; rx.fillRect(px-0.6,py,1.2,6); rShadow(px,py+6,2.5,1);
  rx.fillStyle='#ffd23f'; rx.beginPath(); rx.moveTo(px,py-6); rx.lineTo(px+5,py-1); rx.lineTo(px,py+4); rx.lineTo(px-5,py-1); rx.closePath(); rx.fill(); rx.strokeStyle='#e8284a'; rx.lineWidth=0.9; rx.stroke();
  rx.strokeStyle='#3a1a10'; rx.lineWidth=1; rx.lineCap='round'; rx.beginPath(); rx.moveTo(px-2,py+1*dir); rx.quadraticCurveTo(px,py-2*dir,px+2,py-1*dir); rx.lineTo(px+0.6,py-2.4*dir); rx.moveTo(px+2,py-1*dir); rx.lineTo(px+0.5,py+0.2*dir); rx.stroke(); }
/* ── the land in chunks ── */
/* zones along the road, from the race's seed: a meadow first, then the village, the camping by a milk lake, the city… with meadows between */
var R_ZONES=['village','meadow','camp','meadow','city','meadow'];
function rZone(i){ var z=RC.zones; if(!z){ z=RC.zones=[{from:-99,to:5,type:'meadow'}]; }
  while(z[z.length-1].to<=i){ var last=z[z.length-1], r=rR(rHash(RC.seed,z.length*31+7)), type;
    if(last.type==='meadow') type=['village','camp','city'][Math.floor(r()*3)]; else type='meadow';
    if(z.length>=2&&type===z[z.length-2].type&&type!=='meadow') type=['village','camp','city'][(['village','camp','city'].indexOf(type)+1+Math.floor(r()*2))%3];
    var len=type==='meadow'?5+Math.floor(r()*6):type==='city'?7+Math.floor(r()*4):6+Math.floor(r()*4); z.push({from:last.to,to:last.to+len,type:type}); }
  for(var k=z.length-1;k>=0;k--) if(z[k].from<=i) return z[k]; return z[0]; }
/* the chunk's road in sketch pixels, sampled every 2: its middle and half-width at local x */
function rChunkRoad(rg,i){ var x0=i*RCW, n=Math.ceil(RCW*SU/2)+6, m=[], w=[];
  for(var k=0;k<n;k++){ var px=-4+k*2, a=Race.at(rg,x0+px/SU); m.push(a.c*SU); w.push(a.hw*SU); } return {m:m,w:w}; }
function rAt(road,px){ var f=(px+4)/2, k=Math.max(0,Math.min(road.m.length-2,Math.floor(f))), u=Math.max(0,Math.min(1,f-k)); return [road.m[k]+(road.m[k+1]-road.m[k])*u,road.w[k]+(road.w[k+1]-road.w[k])*u]; }
function rRoadPath(road,off){ rx.beginPath(); var n=road.m.length, k; for(k=0;k<n;k++) rx.lineTo(-4+k*2,road.m[k]-road.w[k]-off); for(k=n-1;k>=0;k--) rx.lineTo(-4+k*2,road.m[k]+road.w[k]+off); rx.closePath(); }
function rEdge(road,sd,off){ rx.beginPath(); for(var k=0;k<road.m.length;k++) rx.lineTo(-4+k*2,road.m[k]+sd*(road.w[k]+off)); }
function rOff(road,px,py,m){ var a=rAt(road,px); return Math.abs(py-a[0])>a[1]+m; }
/* the road «А4»: chocolate with tiles, candy kerbs, a dashed cream middle line — its pattern keeps to the world (x0s: the chunk's start in sketch px) */
function rChocRoad(road,x0s,W){ rRoadPath(road,0); rx.fillStyle='#6b3a22'; rx.fill(); rx.save(); rRoadPath(road,0); rx.clip();
  var p0=-((x0s%13)+13)%13, px; rx.strokeStyle='rgba(30,12,4,0.55)'; rx.lineWidth=0.9; rx.beginPath(); for(px=p0;px<W+4;px+=13){ rx.moveTo(px,0); rx.lineTo(px,220); } rx.stroke();
  rx.beginPath(); for(var k=-2;k<=2;k++){ if(!k) continue; rx.moveTo(-4,road.m[0]+k*road.w[0]/2); for(var j=1;j<road.m.length;j++) rx.lineTo(-4+j*2,road.m[j]+k*road.w[j]/2); } rx.stroke();
  rx.strokeStyle='rgba(180,110,70,0.35)'; rx.beginPath(); for(px=p0+1.2;px<W+4;px+=13){ rx.moveTo(px,0); rx.lineTo(px,220); } rx.stroke(); rx.restore();
  [-1,1].forEach(function(sd){ var q0=Math.floor((x0s-4)/5); for(var q=q0;q*5<x0s+W+6;q++){ var p=q*5-x0s, a=rAt(road,p+2.5); rx.fillStyle=((q%2)+2)%2?'#ffffff':'#ff3b5c'; rx.beginPath(); rx.arc(p+2.5,a[0]+sd*(a[1]+1.5),2.2,0,6.2832); rx.fill(); } });
  rx.strokeStyle='rgba(255,246,220,0.85)'; rx.lineWidth=1.1; rx.setLineDash([6,6]); rx.lineDashOffset=((x0s+4)%12+12)%12; rx.beginPath(); for(var k2=0;k2<road.m.length;k2++) rx.lineTo(-4+k2*2,road.m[k2]); rx.stroke(); rx.setLineDash([]); rx.lineDashOffset=0; }
function rSprinkles(r,n,W,H,cols){ for(var i=0;i<n;i++){ rx.fillStyle=cols[i%cols.length]; rx.save(); rx.translate(r()*W,r()*H); rx.rotate(r()*6.28); rx.fillRect(-1.2,-0.35,2.4,0.7); rx.restore(); } }
/* sweets scattered off the road, the big ones first, none over another, none over the river or the places kept (keep: [x,y,radius]) */
function rScatter(r,road,n,kinds,W,H,keep,ymin){ var list=[], placed=(keep||[]).slice();
  for(var i=0;i<n;i++){ var name=kinds[Math.floor(r()*kinds.length)], it=R_ITEMS[name], k=it[2][0]+Math.pow(r(),1.6)*(it[2][1]-it[2][0]); list.push({it:it,k:k,rad:it[1]*k}); }
  list.sort(function(a,b){ return b.rad-a.rad; });
  list.forEach(function(o){ for(var t=0;t<30;t++){ var px=o.rad+r()*(W-2*o.rad), py=(ymin||22)+r()*(H-(ymin||22)-3); if(!rOff(road,px,py,o.rad+4)) continue;
      if(placed.some(function(q){ var dx=q[0]-px, dy=q[1]-py; return dx*dx+dy*dy<(q[2]+o.rad+1.5)*(q[2]+o.rad+1.5); })) continue; placed.push([px,py,o.rad]); o.it[0](px,py,o.k,r); break; } }); }
/* one side of the road at local x: the room between the kerb and the screen's edge (sd −1 above, +1 below) */
function rSideY(road,px,sd,gap){ var a=rAt(road,px); return a[0]+sd*(a[1]+gap); }
function rVillage(r,road,W,H,keep){ var i, sd, px, y, cols=[['#c07a3a','#ff8ab8'],['#d08a48','#8fd8ff'],['#c07a3a','#ffe066'],['#b86a32','#b890f0'],['#d08a48','#7fd88a']];
  [-1,1].forEach(function(sd){ var gap=8+r()*4; if(r()<0.7){ var fy=rSideY(road,W/2,sd,5); rFence(6,fy,W-6); gap+=4; }
    for(px=12+r()*8;px<W-12;px+=24+r()*10){ var w=18+r()*10, h=12+r()*6, c=cols[Math.floor(r()*cols.length)]; y=rSideY(road,px,sd,gap+h/2+r()*6);
      if(y<24||y>H-4) continue; if(r()<0.15&&!keep.church){ keep.church=1; rChurch(px,y); keep.push([px,y,14]); continue; }
      rRoofHouse(px,y,w,h,c[0],c[1],'#ffffff'); if(r()<0.6) rChimney(px+w/4,y-h/2+1); keep.push([px,y,Math.max(w,h)/2+2]);
      var by=y+sd*(h/2+8+r()*6); if(by>26&&by<H-6){ var k=r(); if(k<0.35){ rGarden(px-8,by-4,4+Math.floor(r()*3),2); keep.push([px,by,12]); } else if(k<0.5){ rWell(px,by); keep.push([px,by,5]); } else if(k<0.65){ rCow(px-4,by); rCow(px+5,by+3); keep.push([px,by,8]); } else if(k<0.75){ rWindmill(px,by+sd*4,r()*3); keep.push([px,by+sd*4,12]); } else if(k<0.85){ rStall(px,by,['#ff4f7a','#3fc7ff','#ffd23f'][Math.floor(r()*3)]); keep.push([px,by,6]); } } } }); }
function rCamp(r,road,W,H,keep){ var sd=r()<0.5?-1:1, cx=W/2+(r()-0.5)*20, a=rAt(road,cx), room=sd<0?a[0]-a[1]-22:H-(a[0]+a[1])-4;
  if(room>26){ var ry=Math.min(22,room/2-3), rX=Math.min(W/2-8,40+r()*14), cy=sd<0?a[0]-a[1]-8-ry:a[0]+a[1]+8+ry;
    var ok=true; for(var p=cx-rX;p<=cx+rX;p+=4){ var b=rAt(road,p); if((sd<0&&cy+ry+6>b[0]-b[1])||(sd>0&&cy-ry-6<b[0]+b[1])) ok=false; }
    if(ok){ rLake(cx,cy,rX,ry); rBoat(cx-rX*0.3,cy); rBoat(cx+rX*0.35,cy+ry*0.3); rPier(cx-rX*0.8,cy-sd*ry*0.2,cx-rX*0.55,cy); keep.push([cx,cy,Math.max(rX,ry)+4]); for(var q=cx-rX+8;q<cx+rX-8;q+=12) keep.push([q,cy,ry+3]); } }
  var sd2=-sd; for(var px=14+r()*8;px<W-12;px+=18+r()*10){ var y=rSideY(road,px,sd2,12+r()*18); if(y<26||y>H-8) continue; rTent(px,y,['#ff8ab8','#8fdcff','#ffe066','#b890f0'][Math.floor(r()*4)]); keep.push([px,y,8]);
    if(r()<0.35){ var fy=y+sd2*14; if(fy>26&&fy<H-6){ rCampfire(px+6,fy); keep.push([px+6,fy,7]); } } } }
function rCity(r,road,W,H,keep,x0s){ var cols=['#ff8ab8','#6fc8ff','#ffd24a','#7fd88a','#b890f0','#ffa870','#ff6f8a'];
  rx.fillStyle='#fff4e6'; rRoadPath(road,7); rx.fill(); rx.strokeStyle='rgba(200,170,140,0.5)'; rx.lineWidth=0.5; rx.beginPath();
  for(var q=Math.floor(x0s/6);q*6<x0s+W+6;q++){ var p=q*6-x0s, a=rAt(road,p); [-1,1].forEach(function(sd){ var y0=a[0]+sd*(a[1]+3.5); rx.moveTo(p,y0-3.5); rx.lineTo(p,y0+3.5); }); } rx.stroke();
  [-1,1].forEach(function(sd){ for(var bx=3;bx<W-10;bx+=26){ var w=18+r()*4, h=14+r()*10, a=rAt(road,bx+w/2), ey=a[0]+sd*(a[1]+9), py=ey+sd*(h/2+2);
      if((sd<0&&py-h/2<22)||(sd>0&&py-h/2>H-4)) continue;
      if(r()<0.12){ rTower(bx+w/2,py,6,['#ff9ccc','#9b7bff','#6fc8ff'][Math.floor(r()*3)]); continue; }
      if(r()<0.08){ var fy=py+sd*4; rFountain(bx+w/2,fy); continue; }
      rBlock(bx+w/2,py,w,h,cols[Math.floor(r()*cols.length)],r); if(r()<0.5){ var y2=py+sd*(h/2+10); if(y2-6>22&&y2+6<H) rBlock(bx+w/2,y2,w,12,cols[Math.floor(r()*cols.length)],r); } } }); }
/* a milk river across the road with a wafer bridge (a chunk's feature) */
function rRiver(r,road,W,H,keep){ var x0=W/2, amp=6+r()*5, per=30+r()*15, ph=r()*6, tilt=(r()-0.5)*0.4, hw=11;
  function rxAt(py){ return x0+amp*Math.sin(py/per+ph)+(py-H/2)*tilt; }
  function band(off,col){ rx.fillStyle=col; rx.beginPath(); for(var py=-4;py<=H+4;py+=3) rx.lineTo(rxAt(py)-hw-off,py); for(py=H+4;py>=-4;py-=3) rx.lineTo(rxAt(py)+hw+off,py); rx.closePath(); rx.fill(); }
  band(1.5,'#e8dcc8'); band(0,'#fffaf0'); rx.strokeStyle='rgba(200,180,150,0.6)'; rx.lineWidth=0.8; rx.lineCap='round';
  for(var i=0;i<8;i++){ var yy=(i*29+7)%H, o=((i*5)%9)-4; rx.beginPath(); rx.moveTo(rxAt(yy)+o,yy); rx.quadraticCurveTo(rxAt(yy+4)+o+1.5,yy+4,rxAt(yy+8)+o,yy+8); rx.stroke(); }
  for(var py=0;py<H;py+=8) keep.push([rxAt(py),py,hw+3]);
  var cy=rAt(road,x0)[0], cx=rxAt(cy); return {cx:cx}; }
function rBridge(road,cx){ var half=19, p, sd;
  function deck(off,dy){ rx.beginPath(); for(p=cx-half;p<=cx+half;p+=2){ var a=rAt(road,p); rx.lineTo(p,a[0]-a[1]-off+dy); } for(p=cx+half;p>=cx-half;p-=2){ var b=rAt(road,p); rx.lineTo(p,b[0]+b[1]+off+dy); } rx.closePath(); }
  rx.fillStyle='rgba(120,70,60,0.28)'; deck(5,4); rx.fill(); rx.fillStyle='#f0c070'; deck(5,0); rx.fill();
  rx.save(); deck(5,0); rx.clip(); rx.strokeStyle='rgba(170,100,30,0.55)'; rx.lineWidth=0.8; rx.beginPath(); for(var q=-60;q<60;q+=4){ rx.moveTo(cx+q,0); rx.lineTo(cx+q+100,200); rx.moveTo(cx+q,0); rx.lineTo(cx+q-100,200); } rx.stroke(); rx.restore();
  [-1,1].forEach(function(sd){ function rail(){ rx.beginPath(); for(p=cx-half;p<=cx+half;p+=2){ var a=rAt(road,p); rx.lineTo(p,a[0]+sd*(a[1]+4)); } }
    rx.lineCap='round'; rx.lineWidth=2.4; rx.strokeStyle='#ffffff'; rail(); rx.stroke(); rx.strokeStyle='#ff2f55'; rx.setLineDash([2,2]); rail(); rx.stroke(); rx.setLineDash([]);
    for(p=cx-half;p<=cx+half+0.1;p+=half/2){ var a=rAt(road,p); rx.fillStyle='#ffd23f'; rx.beginPath(); rx.arc(p,a[0]+sd*(a[1]+4),1.8,0,6.2832); rx.fill(); rx.strokeStyle='#c8841a'; rx.lineWidth=0.5; rx.stroke(); } });
  rx.strokeStyle='rgba(120,60,20,0.8)'; rx.lineWidth=1.1; rx.setLineDash([6,6]); rx.beginPath(); for(p=cx-half;p<=cx+half;p+=2) rx.lineTo(p,rAt(road,p)[0]); rx.stroke(); rx.setLineDash([]); }
/* one chunk of the land: made once, kept while it is on screen */
function rChunk(rg,i){ var c=RC.ch[i]; if(c) return c;
  var KS=rKS(), W=RCW*SU, H=LH/KS, o=hdOff(RCW*K+3,LH,hs); rx=o.x; rx.setTransform(hs*KS,0,0,hs*KS,0,0);
  var r=rR(rHash(RC.seed,i)), road=rChunkRoad(rg,i), x0s=i*W, z=rZone(i).type, keep=[];
  rx.fillStyle='#ffd8ec'; rx.fillRect(-2,-2,W+8,H+4); rSprinkles(r,Math.round(W*H/340),W+3,H,['#ffffff','#6fd7ff','#ffe066','#9b7bff']);
  var feat=null; if(i>2&&z==='meadow'){ var f=r(); if(f<0.16) feat='river'; else if(f<0.27) feat='cafe'; else if(f<0.36) feat='station'; }
  var river=null; if(feat==='river') river=rRiver(r,road,W,H,keep);
  if(z==='village') rVillage(r,road,W,H,keep); else if(z==='camp') rCamp(r,road,W,H,keep); else if(z==='city') rCity(r,road,W,H,keep,x0s);
  if(feat==='cafe'||feat==='station'){ var sd=r()<0.5?-1:1, px=W*0.5, y=rSideY(road,px,sd,20); if(y>30&&y<H-14){ if(feat==='cafe'){ rCafe(px,y); keep.push([px,y,18]); } else { rStation(px,y); keep.push([px,y,15]); } } }
  if(z==='meadow'&&!feat&&r()<0.3){ var sd2=r()<0.5?-1:1, sx=10+r()*20, sy=rSideY(road,sx,sd2,9); if(sy>26&&sy<H-10){ var d=rAt(road,sx+40)[0]-rAt(road,sx)[0]; if(Math.abs(d)>6){ rSign(sx,sy,d<0?1:-1); keep.push([sx,sy,6]); } } }
  rScatter(r,road,z==='meadow'?(feat?10:16):z==='city'?2:z==='camp'?6:5,z==='city'?['lolli','gum','marsh']:z==='camp'?['cotton','lolli','cane','gum','marsh']:R_KINDS,W,H,keep);
  rChocRoad(road,x0s,W+3/KS); if(river) rBridge(road,river.cx);
  if(z==='city'&&r()<0.35){ var zx=20+r()*(W-40); rx.save(); rRoadPath(road,0); rx.clip(); var za=rAt(road,zx); for(var k=-4;k<=4;k++){ rx.fillStyle=k%2?'#fff4f8':'#2a1420'; rx.fillRect(zx-4,za[0]+k*za[1]*2/9-za[1]/9,8,za[1]*2/9); } rx.restore(); rLight3(zx-8,za[0]-za[1]-5); }
  c=RC.ch[i]={c:o.c,w:RCW*K+3,h:LH}; return c; }
/* a land per race and scale: the menu's race, the backdrop, the drawn phone's screen and the real race each keep their own (v0.87) */
var RCS={}, RCN=[];
function rReset(seed){ var key=seed+'|'+LW+'x'+LH+'x'+hs; if(RC.key===key) return; var c=RCS[key];
  if(!c){ c=RCS[key]={seed:seed,key:key,ch:{},zones:null,sp:{}}; RCN.push(key); while(RCN.length>5){ delete RCS[RCN.shift()]; } }
  RC=c; }
/* ── the cars, the gifts: small sprites, made once per colour ── */
var R_CARS=[['#ff4f8b','#b0184f'],['#ffb52e','#b06a00'],['#4fb8ff','#1a6aa8'],['#2f47c9','#141d66'],['#f4ecff','#8a78b8'],['#e8284a','#8a0c20']], R_PLAYER=['#2fe0b0','#0f8a6a'];
function rCar(px,py,body,dark,player){ var L=19, W=10, glass='rgba(40,20,60,0.75)';
  rx.fillStyle='rgba(40,10,30,0.22)'; rx.beginPath(); rx.roundRect(px-L/2+1.5,py-W/2+2,L,W,4); rx.fill();
  rx.fillStyle='#2a1a28'; [[-6,-5.4],[5,-5.4],[-6,5.4],[5,5.4]].forEach(function(w){ rx.beginPath(); rx.roundRect(px+w[0]-2.2,py+w[1]-1.3,4.4,2.6,1); rx.fill(); });
  var g=rx.createLinearGradient(0,py-W/2,0,py+W/2); g.addColorStop(0,'#ffffff'); g.addColorStop(0.18,body); g.addColorStop(1,dark); rx.fillStyle=g;
  rx.beginPath(); rx.roundRect(px-L/2,py-W/2,L,W,[4,5,5,4]); rx.fill(); rx.strokeStyle=dark; rx.lineWidth=0.6; rx.stroke();
  rx.fillStyle=glass; rx.beginPath(); rx.roundRect(px-2,py-3.3,7,6.6,2.5); rx.fill(); rx.fillStyle='rgba(255,255,255,0.7)'; rx.beginPath(); rx.roundRect(px-1.2,py-2.6,2.4,1.4,0.7); rx.fill();
  if(player){ rx.fillStyle='#ffffff'; rx.fillRect(px-L/2+1,py-0.8,5,1.6); rx.fillStyle='rgba(255,240,180,0.95)'; rx.beginPath(); rx.ellipse(px+L/2-0.5,py-3,0.9,1.3,0,0,6.2832); rx.ellipse(px+L/2-0.5,py+3,0.9,1.3,0,0,6.2832); rx.fill(); }
  else { rx.fillStyle='rgba(255,60,60,0.9)'; rx.fillRect(px-L/2,py-3.6,0.9,1.6); rx.fillRect(px-L/2,py+2,0.9,1.6); } }
/* v0.86: the player's car — a rocket car (the maintainer: «наша машинка должна быть непохожа на все остальные, не только цветом», his pick
   «В»): a long round mint body with a pink nose cone, two pink fins at the back, a round window; the candy exhaust puffs are drawn live */
function rRocket(px,py){ rx.fillStyle='rgba(40,10,30,0.22)'; rx.beginPath(); rx.ellipse(px+1.5,py+2,11,4.5,0,0,6.2832); rx.fill();
  rx.fillStyle='#2a1a28'; [[-5,-5],[5,-5],[-5,5],[5,5]].forEach(function(w){ rx.beginPath(); rx.roundRect(px+w[0]-2.2,py+w[1]-1.3,4.4,2.6,1); rx.fill(); });
  rx.fillStyle='#ff4f7a'; rx.beginPath(); rx.moveTo(px-7,py-3); rx.lineTo(px-11,py-7); rx.lineTo(px-4,py-3); rx.closePath(); rx.fill(); rx.beginPath(); rx.moveTo(px-7,py+3); rx.lineTo(px-11,py+7); rx.lineTo(px-4,py+3); rx.closePath(); rx.fill();
  var g=rx.createLinearGradient(0,py-4,0,py+4); g.addColorStop(0,'#ffffff'); g.addColorStop(0.3,'#2fe0b0'); g.addColorStop(1,'#0f8a6a'); rx.fillStyle=g;
  rx.beginPath(); rx.moveTo(px-9,py-3.6); rx.lineTo(px+4,py-3.6); rx.quadraticCurveTo(px+11,py-2.5,px+11,py); rx.quadraticCurveTo(px+11,py+2.5,px+4,py+3.6); rx.lineTo(px-9,py+3.6); rx.closePath(); rx.fill(); rx.strokeStyle='#0a5a44'; rx.lineWidth=0.6; rx.stroke();
  rx.fillStyle='#ff4f7a'; rx.beginPath(); rx.moveTo(px+6,py-3.2); rx.quadraticCurveTo(px+11,py-2.5,px+11,py); rx.quadraticCurveTo(px+11,py+2.5,px+6,py+3.2); rx.closePath(); rx.fill();
  rx.fillStyle='rgba(40,20,60,0.8)'; rx.beginPath(); rx.arc(px+1,py,2.2,0,6.2832); rx.fill(); rx.fillStyle='rgba(255,255,255,0.8)'; rx.beginPath(); rx.arc(px+0.4,py-0.8,0.7,0,6.2832); rx.fill(); }
function rFuel(px,py){ rx.fillStyle='rgba(0,0,0,0.18)'; rx.beginPath(); rx.ellipse(px+1,py+6,5,1.6,0,0,6.2832); rx.fill();
  rx.fillStyle='#3fd07a'; rx.beginPath(); rx.roundRect(px-3.5,py-3,7,9,2.2); rx.fill(); rx.fillRect(px-1.4,py-6.5,2.8,4); rx.fillStyle='#e8363a'; rx.fillRect(px-1.8,py-7.5,3.6,1.6);
  rx.strokeStyle='#1a6a3a'; rx.lineWidth=0.5; rx.beginPath(); rx.roundRect(px-3.5,py-3,7,9,2.2); rx.stroke(); rx.fillStyle='rgba(255,255,255,0.45)'; rx.fillRect(px-2.8,py-2,0.7,6);
  /* v0.96: a big F on the bottle (the maintainer: «на бутылочках с топливом должна быть большая буква F») */
  rx.beginPath(); rx.moveTo(px-1.7,py+4.6); rx.lineTo(px-1.7,py-2); rx.lineTo(px+2.3,py-2); rx.lineTo(px+2.3,py-0.7); rx.lineTo(px-0.35,py-0.7); rx.lineTo(px-0.35,py+0.8); rx.lineTo(px+1.7,py+0.8); rx.lineTo(px+1.7,py+2.1); rx.lineTo(px-0.35,py+2.1); rx.lineTo(px-0.35,py+4.6); rx.closePath();
  rx.fillStyle='#ffffff'; rx.fill(); rx.strokeStyle='#0f5a2e'; rx.lineWidth=0.45; rx.stroke(); }
function rCoin(px,py){ rx.fillStyle='rgba(0,0,0,0.16)'; rx.beginPath(); rx.ellipse(px+1,py+4.2,3.8,1.2,0,0,6.2832); rx.fill();
  rx.fillStyle='#c8841a'; rx.beginPath(); rx.arc(px,py,4.2,0,6.2832); rx.fill(); rx.fillStyle='#ffd23f'; rx.beginPath(); rx.arc(px,py,3.5,0,6.2832); rx.fill();
  rx.strokeStyle='#e8a020'; rx.lineWidth=0.6; rx.beginPath(); rx.arc(px,py,2.5,0,6.2832); rx.stroke();
  rx.fillStyle='#ff4f7a'; rx.beginPath(); for(var k=0;k<10;k++){ var a=-Math.PI/2+k*Math.PI/5, rr=k%2?0.8:1.8; rx.lineTo(px+Math.cos(a)*rr,py+Math.sin(a)*rr); } rx.closePath(); rx.fill();
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
function rSprite(key,w,h,draw){ var s=RC.sp[key]; if(s) return s; var KS=rKS(), o=hdOff(w*KS,h*KS,hs); rx=o.x; rx.setTransform(hs*KS,0,0,hs*KS,0,0); rx.translate(w/2,h/2); draw(); return RC.sp[key]={c:o.c,w:w*KS,h:h*KS}; }
function rCarSprite(kind,player){ if(player) return rSprite('p',30,20,function(){ rx.translate(1.5,0); rRocket(0,0); });   // the middle of its body stays the car's point
  var col=R_CARS[kind%R_CARS.length]; return rSprite('c'+kind%R_CARS.length,28,20,function(){ rCar(0,0,col[0],col[1],false); }); }
var R_FUELK=1.2, R_BUBK=1.1;   // v0.98: the fuel bottle's and the shield bubble's sizes (the audit: the most needed thing was one of the smallest)
function rGiftSprite(t){ if(t==='fuel') return rSprite('gfuel',Math.ceil(16*R_FUELK),Math.ceil(18*R_FUELK),function(){ rx.scale(R_FUELK,R_FUELK); rFuel(0,0); });
  if(t==='bubble') return rSprite('gbubble',Math.ceil(16*R_BUBK),Math.ceil(18*R_BUBK),function(){ rx.scale(R_BUBK,R_BUBK); rBubble(0,0); rShieldIcon(0.2,0.3,1); }); return rSprite('g'+t,t[0]==='t'?22:16,18,function(){ if(t==='fuel') rFuel(0,0); else if(t==='coin') rCoin(0,0); else if(t==='magnet') rMagnet(0,0); else if(t==='tbubble') rTurboBubble(0,0); else if(t==='tmagnet') rTurboMagnet(0,0); else { rBubble(0,0); rShieldIcon(0.2,0.3,1); } }); }
/* v0.96: the super gift stands out (the maintainer: «сделай суперподарок более заметным.. варианты») — sketch variants A…D; he picked A */
var R_SUPER='A';   // his pick: bigger, with a golden glow
function rSuper(s,X,Y,t,id){ var u=K/SU, v=R_SUPER, k=1.3, bob=Math.sin(t*3+id)*0.8*K, i;
  if(v==='A'){ k=1.45+0.08*Math.sin(t*6); var gr=hx.createRadialGradient(X,Y+bob,2*u,X,Y+bob,16*u); gr.addColorStop(0,'rgba(255,236,120,0.95)'); gr.addColorStop(0.5,'rgba(255,200,40,'+(0.45+0.2*Math.sin(t*6))+')'); gr.addColorStop(1,'rgba(255,200,40,0)'); hx.fillStyle=gr; hx.beginPath(); hx.arc(X,Y+bob,16*u,0,6.2832); hx.fill(); }
  else if(v==='B'){ hx.save(); hx.translate(X,Y+bob); hx.rotate(t*1.5); hx.fillStyle='rgba(255,214,60,0.8)'; for(i=0;i<12;i++){ hx.rotate(6.2832/12); hx.beginPath(); hx.moveTo(0,0); hx.lineTo(18*u,-2.6*u); hx.lineTo(18*u,2.6*u); hx.closePath(); hx.fill(); } hx.restore(); }
  else if(v==='C'){ var cols=['#ff4f7a','#ffb52e','#ffe066','#3fd07a','#4fb8ff','#9b5bff']; hx.lineWidth=2.2*u; for(i=0;i<6;i++){ hx.strokeStyle=cols[i]; hx.beginPath(); hx.arc(X,Y+bob,12.5*u,t*2+i*1.0472,t*2+(i+1)*1.0472); hx.stroke(); }
    for(i=0;i<3;i++){ var a=t*2.5+i*2.0944, sx0=X+Math.cos(a)*15*u, sy0=Y+bob+Math.sin(a)*15*u, r=(1.6+0.8*Math.sin(t*9+i))*u; hx.fillStyle='#ffffff'; hx.beginPath(); hx.moveTo(sx0,sy0-2*r); hx.lineTo(sx0+0.5*r,sy0-0.5*r); hx.lineTo(sx0+2*r,sy0); hx.lineTo(sx0+0.5*r,sy0+0.5*r); hx.lineTo(sx0,sy0+2*r); hx.lineTo(sx0-0.5*r,sy0+0.5*r); hx.lineTo(sx0-2*r,sy0); hx.lineTo(sx0-0.5*r,sy0-0.5*r); hx.closePath(); hx.fill(); } }
  else if(v==='D'){ k=1.4; bob=-Math.abs(Math.sin(t*4+id))*6*u; hx.fillStyle='rgba(0,0,0,0.2)'; hx.beginPath(); hx.ellipse(X,Y+9*u,7*u*(1+bob/(20*u)),2*u,0,0,6.2832); hx.fill();
    if(Math.floor(t*4)%2){ hx.strokeStyle='#ffffff'; hx.lineWidth=1.6*u; hx.beginPath(); hx.arc(X,Y+bob,11.5*u,0,6.2832); hx.stroke(); } }
  hx.drawImage(s.c,X-s.w*k/2,Y+bob-s.h*k/2,s.w*k,s.h*k); }
function rBlit(s,X,Y,a){ if(a){ hx.save(); hx.translate(X,Y); hx.rotate(a); hx.drawImage(s.c,-s.w/2,-s.h/2,s.w,s.h); hx.restore(); } else hx.drawImage(s.c,X-s.w/2,Y-s.h/2,s.w,s.h); }
/* the road's direction at a place (radians; drawing only) */
function rSlope(rg,wx){ return Math.atan2(Race.centre(rg,wx+4)-Race.centre(rg,wx-4),8); }
/* ── the whole scene: the land, the puddles, the gifts, the cars, the player's car. vd: how far the view has gone (field units), cy: the
   player's car (field units) or null, ang: its turn ── */
var rPrevY=null, rTilt=0, rCarK=1;   // rCarK: the player's car drawn larger (the drawn phone's screen, v0.87)
function raceScene(rg,vd,carY,dt){ rReset(rg.seed); var KS=rKS(), X0=rX0===null?SAFE.l:rX0, i0=Math.floor((vd-X0/K)/RCW), i1=Math.floor((vd+(LW-X0)/K)/RCW);
  hx.setTransform(hs,0,0,hs,0,0); hx.imageSmoothingEnabled=true;
  var made=0; for(var i=i0;i<=i1;i++){ var ch=RC.ch[i]; if(!ch){ ch=rChunk(rg,i); made++; } hx.setTransform(hs,0,0,hs,0,0); hx.drawImage(ch.c,X0+(i*RCW-vd)*K,0,ch.w,ch.h); }
  if(!made&&!RC.ch[i1+1]) rChunk(rg,i1+1);                                                     // the next one ahead, made while nothing else was
  hx.setTransform(hs,0,0,hs,0,0);
  for(var k in RC.ch) if(+k<i0-1) delete RC.ch[k];
  function sx(wx){ return X0+(wx-vd)*K; }
  (rg.puddles||[]).forEach(function(p){ var X=sx(p.x), Y=(Race.centre(rg,p.x)+p.o)*K, r=p.r*K; hx.fillStyle=R_PUD.fill; hx.beginPath(); hx.ellipse(X,Y,r*1.15,r*0.62,0.1,0,6.2832); hx.ellipse(X+r*0.6,Y+r*0.25,r*0.45,r*0.3,0,0,6.2832); hx.fill(); if(R_PUD.rim){ hx.strokeStyle=R_PUD.rim; hx.lineWidth=Math.max(1,0.9*K/SU); hx.stroke(); }
    hx.fillStyle=R_PUD.shine; hx.beginPath(); hx.ellipse(X-r*0.35,Y-r*0.18,r*0.35,r*0.1,0.1,0,6.2832); hx.fill(); });
  var t=clock;
  (rg.items||[]).forEach(function(p){ var X=sx(p.x); if(X<-20||X>LW+20) return; var Y=(Race.centre(rg,p.x)+p.o)*K, s=rGiftSprite(p.type);
    if(p.type==='coin'){ var f=Math.abs(Math.cos(t*4+p.id)); hx.save(); hx.translate(X,Y); hx.scale(0.35+0.65*f,1); hx.drawImage(s.c,-s.w/2,-s.h/2,s.w,s.h); hx.restore(); }
    else if(p.type==='tmagnet'&&R_SUPER) rSuper(s,X,Y,t,p.id);
    else rBlit(s,X,Y+Math.sin(t*3+p.id)*0.8*K,0); });
  (rg.cars||[]).forEach(function(c){ var X=sx(c.x); if(X<-30||X>LW+30) return; var Y=(Race.centre(rg,c.x)+c.o)*K; rBlit(rCarSprite(c.kind,false),X,Y,rSlope(rg,c.x)+(c.to-c.o)*0.02); });
  if(carY!==null&&carY!==undefined){ var s=rg.car, cx=vd+s.x, X=sx(cx), Y=carY*K;
    var vy=rPrevY===null||!dt?0:(carY-rPrevY)/dt; rPrevY=carY; var want=Math.max(-0.5,Math.min(0.5,Math.atan2(vy,Math.max(60,rg.v||0))));   // the car turns the way it goes, 30° at most rTilt+=(want-rTilt)*Math.min(1,(dt||0)*12);
    var blink=s.inv>0&&Math.floor(clock*14)%2===0;
    if(s.magnet>0&&(s.magnet>2||Math.floor(clock*8)%2)){ for(var m=0;m<3;m++){ var ph=((clock*1.4+m/3)%1); hx.strokeStyle='rgba(232,40,74,'+(0.5*(1-ph)).toFixed(3)+')'; hx.lineWidth=0.8; hx.beginPath(); hx.arc(X,Y,(10+ph*30)*K/SU,-0.9,0.9); hx.stroke(); } }
    if(!blink){ var ks=K/SU*rCarK, sp=Math.min(1,(rg.v||40)/120); hx.save(); hx.translate(X,Y); hx.rotate(rTilt);           // candy puffs behind it, livelier the faster it goes
      if(s.turbo>0){ hx.strokeStyle='rgba(255,255,255,0.8)'; hx.lineWidth=0.8*ks; hx.lineCap='round'; [[-6,-26],[0,-30],[6,-24]].forEach(function(q,i){ var jx=((clock*9+i*0.37)%1)*4; hx.beginPath(); hx.moveTo((-16-jx)*ks,q[0]*ks); hx.lineTo((q[1]-jx)*ks,q[0]*ks); hx.stroke(); });
        [[-13,0,3.4,'#ffd23f'],[-17,-1,2.8,'#ff8a3d']].forEach(function(q){ var fl=0.85+0.3*Math.abs(Math.sin(clock*40+q[0])); hx.fillStyle=q[3]; hx.beginPath(); hx.arc(q[0]*ks,q[1]*ks,q[2]*fl*ks,0,6.2832); hx.fill(); }); }
      [[0,'#ffe0f0',2.4],[1,'#ffd23f',1.8],[2,'#ffb3d9',1.3]].forEach(function(q){ var ph=(clock*6+q[0]*0.33)%1, r=q[2]*(0.7+0.5*sp)*(1-ph*0.4)*ks; hx.globalAlpha=0.9-ph*0.5;
        hx.fillStyle=q[1]; hx.beginPath(); hx.arc((-11.5-q[0]*2.6-ph*4*sp)*ks,(q[0]===1?-0.9:q[0]===2?0.8:0)*ks,r,0,6.2832); hx.fill(); });
      hx.globalAlpha=1; hx.restore(); var cs=rCarSprite(0,true); if(rCarK!==1){ hx.save(); hx.translate(X,Y); hx.rotate(rTilt); hx.drawImage(cs.c,-cs.w*rCarK/2,-cs.h*rCarK/2,cs.w*rCarK,cs.h*rCarK); hx.restore(); } else rBlit(cs,X,Y,rTilt); }
    if(s.bubble>0&&(s.bubble>3||Math.floor(clock*8)%2)){ var R0=13*K/SU; hx.fillStyle=R_BUB.glass+'0.28)'; hx.beginPath(); hx.arc(X,Y,R0,0,6.2832); hx.fill(); hx.strokeStyle=R_BUB.edge+'0.8)'; hx.lineWidth=0.8; hx.stroke();
      hx.fillStyle='rgba(255,255,255,0.75)'; hx.beginPath(); hx.ellipse(X-R0*0.4,Y-R0*0.5,R0*0.25,R0*0.12,-0.6,0,6.2832); hx.fill(); } }
}
/* sparks over everything (the game's own list of parts; drawn round and soft here) */
function raceParts(dt){ parts.forEach(function(p){ p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=0.985; p.vy*=0.985; p.life-=dt; }); parts=parts.filter(function(p){ return p.life>0; });
  parts.forEach(function(p){ var f=p.life/p.max, c=p.cols[Math.min(p.cols.length-1,Math.floor((1-f)*p.cols.length))]; hx.globalAlpha=Math.min(1,f*1.6); hx.fillStyle=c; hx.beginPath(); hx.arc(p.x,p.y,0.6+f*0.9,0,6.2832); hx.fill(); }); hx.globalAlpha=1; }
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
