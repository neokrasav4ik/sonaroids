/* ── SKINS DRAWN AS SHAPES (v0.74, the maintainer: «вектор 80-х, неон, тетрадка — вот это интересно, и геймбой посмотреть»). Their HD
   pictures (v0.76: the pixel ones of vector, neon and notebook are in 47_pixskins.js; the LCD has none — its picture here, at one pixel
   per game pixel and blown up without smoothing, is already whole pixels: hdOnly / hdPix in 45_hd.js). Readability by the same audit (HD=1 node tests/skin_audit.js):
   objects stand out by lightness and by shape (the enemy shots have a shape of their own), not by black frames. ── */
function lwMin(w){ return Math.max(w,0.9/hs); }                                   // a line never thinner than about a screen pixel's worth
function polyAt(c,P){ c.beginPath(); for(var i=0;i<P.length;i++){ if(i) c.lineTo(P[i][0],P[i][1]); else c.moveTo(P[i][0],P[i][1]); } c.closePath(); }
function rockPoly(r,seed,n){ var R2=srand(seed*977+13), pts=[]; for(var i=0;i<n;i++) pts.push([i/n*6.2832+R2()*0.25,0.78+R2()*0.32]); return pts; }
function turnPts(pts,r,a0,x,y){ return pts.map(function(p){ return [x+Math.cos(p[0]+a0)*r*p[1],y+Math.sin(p[0]+a0)*r*p[1]]; }); }

/* ════════ VECTOR 80s: an arcade vector monitor — black, thin phosphor lines with a soft bloom, the picture fades rather than vanishes
   (afterglow trails), a far wireframe planet and a mountain horizon, scanlines; the enemy shots are amber crosses ════════ */
var PHOS='216,255,240', PHG='120,255,200';
function vline(fn,w,a,rgb){ var g=rgb||PHG; a=a===undefined?1:a; hx.lineJoin='round'; hx.lineCap='round';
  hx.strokeStyle='rgba('+g+','+(0.16*a)+')'; hx.lineWidth=lwMin(w)*4.5; fn(); hx.stroke();
  hx.strokeStyle='rgba('+g+','+(0.35*a)+')'; hx.lineWidth=lwMin(w)*2.2; fn(); hx.stroke();
  hx.strokeStyle='rgba('+(rgb?'255,214,150':PHOS)+','+a+')'; hx.lineWidth=lwMin(w); fn(); hx.stroke(); }
HDSK.vector={id:'vector', hd:true, glow:false, nolight:true, motes:['#557a6e','#4a6a60'],
  ui:{veil:0.55,band:'#7affc8',btn:'#3fc896',btnHi:'#9affd8'},
  sky:function(dt,s){ var me=this, i, t=performance.now()/1000;
    if(!this._st||this._key!==hdKey){ this._key=hdKey; var R2=srand(31); this._st=[]; for(i=0;i<Math.round(LW*LH/900);i++) this._st.push({x:R2()*LW,y:R2()*LH*0.8,z:R2()});
      this._mt=[]; var x=0; while(x<LW*2+40){ this._mt.push([x,LH*(0.9-R2()*0.09-(R2()>0.8?0.05:0))]); x+=8+R2()*16; }
      this._px=LW*0.7; this._mx=0;
      var sl=hdOff(4,2); sl.x.fillStyle='rgba(0,0,0,0.28)'; sl.x.fillRect(0,1.2,4,0.5); this._scan=sl.c; this._scanP=null; }
    // the afterglow: the last picture is dimmed, not wiped (a whole wipe when nothing moves — a still preview)
    hx.fillStyle=dt>0&&scr!=='hub'?'rgba(2,5,4,'+Math.min(1,dt*16)+')':'#020504';   // (not on the games' screen: its card is cut from this canvas)
    hx.fillRect(-2,-2,LW+4,LH+4);
    this._px-=1.2*K*dt*s; if(this._px<-60) this._px=LW+60; this._mx=(this._mx+3*K*dt*s)%(LW*2);
    this._st.forEach(function(p){ p.x-=(2+p.z*10)*K*dt*s; if(p.x<0){ p.x+=LW; p.y=Math.random()*LH*0.8; } hx.fillStyle='rgba(120,170,150,'+(0.3+0.4*p.z)+')'; hx.fillRect(p.x,p.y,lwMin(0.45),lwMin(0.45)); });
    var px=this._px, py=LH*0.22;
    vline(function(){ hx.beginPath(); hx.arc(px,py,18,0,6.2832); },0.35,0.35);
    vline(function(){ hx.beginPath(); hx.ellipse(px,py,31,6,-0.2,0,6.2832); },0.3,0.3);
    vline(function(){ hx.beginPath(); for(var k=-2;k<=2;k++){ var yy=k*6, hw=Math.sqrt(324-yy*yy); hx.moveTo(px-hw,py+yy); hx.lineTo(px+hw,py+yy); } },0.2,0.22);
    var mx=this._mx, M=this._mt;
    vline(function(){ hx.beginPath(); var first=true; M.forEach(function(p){ var xx=p[0]-mx; if(xx<-30) xx+=LW*2+40; if(xx>LW+30) return; if(first){ hx.moveTo(xx,p[1]); first=false; } else hx.lineTo(xx,p[1]); }); },0.35,0.3);
    if(hs>1.5){ if(!this._scanP||this._scanC!==hx){ this._scanP=hx.createPattern(this._scan,'repeat'); this._scanC=hx; } hx.save(); hx.setTransform(1,0,0,1,0,0); hx.fillStyle=this._scanP; hx.fillRect(0,0,hdCv.width,hdCv.height); hx.restore(); } },
  rock:function(r,sz,seed){ return {r:r,pts:rockPoly(r,seed,10),size:r*2.4,rot:srand(seed)()*16,vr:(srand(seed+1)()-0.5)*6,hd:true}; },
  drawRock:function(sp,x,y){ var P=turnPts(sp.pts,sp.r,sp.rot/16*6.2832,x+(sp.ox||0),y); vline(function(){ polyAt(hx,P); },0.55,1); },
  ship:function(x,y,t,blink){ if(blink) return; var fl=0.7+0.3*Math.sin(t*37);
    vline(function(){ hx.beginPath(); hx.moveTo(x+19,y); hx.lineTo(x+2,y-6.5); hx.lineTo(x+5.5,y); hx.lineTo(x+2,y+6.5); hx.closePath(); hx.moveTo(x+8,y-3.6); hx.lineTo(x+8,y+3.6); },0.6,1);
    if(!shipBare) vline(function(){ hx.beginPath(); hx.moveTo(x+4.5,y-2); hx.lineTo(x+4.5-7*fl,y); hx.lineTo(x+4.5,y+2); },0.45,0.8); },
  ufo:function(ux,uy,big,hurt){ var k=big?1:0.72;
    vline(function(){ hx.save(); hx.translate(ux,uy); hx.scale(k,k); hx.beginPath(); hx.moveTo(-10,0); hx.lineTo(10,0); hx.lineTo(6,3.2); hx.lineTo(-6,3.2); hx.closePath();
      hx.moveTo(-10,0); hx.lineTo(-5,-3); hx.lineTo(5,-3); hx.lineTo(10,0); hx.moveTo(-3,-3); hx.lineTo(-2,-6); hx.lineTo(2,-6); hx.lineTo(3,-3); hx.restore(); },hurt?0.9:0.6,1); },
  pick:function(x,y,type){ var t=performance.now()/1000, a=0.75+0.25*Math.sin(t*5);
    vline(function(){ hx.beginPath(); hx.moveTo(x,y-7); hx.lineTo(x+7,y); hx.lineTo(x,y+7); hx.lineTo(x-7,y); hx.closePath(); },0.8,a);
    hx.save(); hx.translate(x,y); hdIcon(type,'rgb('+PHOS+')'); hx.restore(); },
  bullet:function(x,y){ vline(function(){ hx.beginPath(); hx.moveTo(x-6,y); hx.lineTo(x-1.5,y); },0.35,0.8); hx.fillStyle='rgba('+PHG+',0.35)'; hx.beginPath(); hx.arc(x,y,1.6,0,6.2832); hx.fill(); hx.fillStyle='rgb('+PHOS+')'; hx.beginPath(); hx.arc(x,y,0.85,0,6.2832); hx.fill(); },   // v0.83: the trail brighter (the shot read as a dot)
  ebullet:function(x,y){ vline(function(){ hx.beginPath(); hx.moveTo(x-2,y-2); hx.lineTo(x+2,y+2); hx.moveTo(x+2,y-2); hx.lineTo(x-2,y+2); },0.6,1,'255,150,40'); },
  bursts:function(){ return {rock:['#e8fff6','#9affd8','#4ab890'],ufo:['#ffffff','#9affd8'],ship:['#ffffff','#d8fff0','#7affc8'],pick:['#ffffff','#d8fff0']}; },
  shield:function(){ return '#7affc8'; }, mini:function(){ return ['#2a8a6a','#d8fff0']; },
  shieldRing:function(x,y,t){ vline(function(){ hx.beginPath(); for(var i=0;i<12;i++){ var a=i/12*6.2832+t*1.5; hx.moveTo(x+8+Math.cos(a)*12,y+Math.sin(a)*9.5); hx.lineTo(x+8+Math.cos(a+0.3)*12,y+Math.sin(a+0.3)*9.5); } },0.4,0.8); } };

/* ════════ NEON: synthwave night — a striped sun sinking behind a wireframe range, a glowing grid floor that runs by, stars; every object a
   bright neon tube over a dark glass body ════════ */
function nline(fn,col,w,a){ a=a===undefined?1:a; hx.lineJoin='round'; hx.lineCap='round';
  hx.globalAlpha=0.22*a; hx.strokeStyle=col; hx.lineWidth=lwMin(w)*3.6; fn(); hx.stroke();
  hx.globalAlpha=0.95*a; hx.lineWidth=lwMin(w)*1.3; fn(); hx.stroke();
  hx.globalAlpha=0.9*a; hx.strokeStyle='#ffffff'; hx.lineWidth=lwMin(w)*0.45; fn(); hx.stroke(); hx.globalAlpha=1; }
HDSK.neon={id:'neon', hd:true, glow:false, nolight:true, veil:'rgba(8,2,22,0.64)', motes:['#c9b8ff','#9ef8ff'],
  ui:{veil:0.5,band:'#ff4fd8',btn:'#e04ed0',btnHi:'#ff8ae8'},
  bgMake:function(){ var w=LW, h=LH, o=hdOff(w,h), x=o.x, hz=h*0.7, R2=srand(12), i;
    var g=x.createLinearGradient(0,0,0,hz); g.addColorStop(0,'#07031a'); g.addColorStop(0.6,'#1a0838'); g.addColorStop(1,'#3a0c4a'); x.fillStyle=g; x.fillRect(0,0,w,hz);
    var g2=x.createLinearGradient(0,hz,0,h); g2.addColorStop(0,'#1a0630'); g2.addColorStop(1,'#07020e'); x.fillStyle=g2; x.fillRect(0,hz,w,h-hz);
    for(i=0;i<Math.round(w*h/260);i++){ var z=R2(); x.fillStyle=z>0.85?'rgba(158,248,255,0.8)':'rgba(201,184,255,'+(0.25+z*0.4)+')'; x.fillRect(R2()*w,R2()*hz*0.95,0.5+z*0.3,0.5+z*0.3); }
    // the sun: a gradient disc cut by widening dark bands, a haze round it
    var sx=w*0.5, sy=hz, sr=h*0.3; var hg=x.createRadialGradient(sx,sy-sr*0.4,sr*0.5,sx,sy-sr*0.4,sr*1.8); hg.addColorStop(0,'rgba(255,80,160,0.25)'); hg.addColorStop(1,'rgba(255,80,160,0)'); x.fillStyle=hg; x.fillRect(0,0,w,hz);
    x.save(); x.beginPath(); x.arc(sx,sy,sr,Math.PI,0); x.closePath(); x.clip(); var sg=x.createLinearGradient(0,sy-sr,0,sy); sg.addColorStop(0,'#ffe25a'); sg.addColorStop(0.55,'#ff8a4a'); sg.addColorStop(1,'#ff2f8e'); x.fillStyle=sg; x.fillRect(sx-sr,sy-sr,2*sr,sr);
    x.globalCompositeOperation='destination-out'; for(i=0;i<7;i++){ var by=sy-sr*0.5+i*sr*0.08; x.fillRect(sx-sr,by,2*sr,0.8+i*0.55); } x.restore();
    return o.c; },
  sky:function(dt,s){ var me=this, i, hz=LH*0.7, t=performance.now()/1000;
    if(!this._bg||this._key!==hdKey){ this._key=hdKey; this._bg=this.bgMake(); var R2=srand(4); this._mt=[]; var xx=0; while(xx<LW*2+40){ this._mt.push([xx,hz-4-R2()*26*(R2()>0.35?1:0.4)]); xx+=10+R2()*18; } this._mx=0; this._gx=0; }
    this._mx=(this._mx+4*K*dt*s)%(LW*2+40); this._gx=(this._gx+26*K*dt*s)%16;
    hx.drawImage(this._bg,0,0,LW,LH);
    // the wireframe range: a ridge line and lines down from its peaks
    var mx=this._mx, M=this._mt.map(function(p){ var x2=p[0]-mx; if(x2<-40) x2+=LW*2+40; return [x2,p[1]]; }).filter(function(p){ return p[0]>-40&&p[0]<LW+40; }).sort(function(a,b){ return a[0]-b[0]; });
    hx.fillStyle='#0c0418'; hx.beginPath(); hx.moveTo(-40,hz); M.forEach(function(p){ hx.lineTo(p[0],p[1]); }); hx.lineTo(LW+40,hz); hx.fill();
    nline(function(){ hx.beginPath(); M.forEach(function(p,j){ if(j) hx.lineTo(p[0],p[1]); else hx.moveTo(p[0],p[1]); }); },'#b44aff',0.4,0.55);
    nline(function(){ hx.beginPath(); M.forEach(function(p,j){ if(j%2===0){ hx.moveTo(p[0],p[1]); hx.lineTo(p[0]+(p[0]-LW/2)*0.08,hz); } }); },'#6a2ad0',0.25,0.4);
    // the floor: lines to the vanishing point sweep by, cross lines closer together toward the horizon
    var vx=LW/2, gx=this._gx;
    nline(function(){ hx.beginPath(); for(i=-30;i<=30;i++){ var bx=vx+(i*16-gx)*2.2; hx.moveTo(vx+(i*16-gx)*0.12,hz); hx.lineTo(bx,LH+2); } },'#ff3fb4',0.28,0.5);
    nline(function(){ hx.beginPath(); for(i=1;i<9;i++){ var yy=hz+(LH-hz)*Math.pow(i/8,1.9); hx.moveTo(0,yy); hx.lineTo(LW,yy); } },'#ff3fb4',0.28,0.5);
    nline(function(){ hx.beginPath(); hx.moveTo(0,hz); hx.lineTo(LW,hz); },'#ff7ae0',0.4,0.7);
    hdVeil(this); },
  rock:function(r,sz,seed){ var R2=srand(seed*31+7), inner=[]; for(var i=0;i<3+(r>8?2:0);i++) inner.push(Math.floor(R2()*9)); return {r:r,pts:rockPoly(r,seed,9),inner:inner,size:r*2.4,rot:R2()*16,vr:(R2()-0.5)*6,hd:true}; },
  drawRock:function(sp,x,y){ var cx=x+(sp.ox||0), P=turnPts(sp.pts,sp.r,sp.rot/16*6.2832,cx,y), c=[cx-sp.r*0.15,y-sp.r*0.1];
    hx.fillStyle='rgba(16,3,28,0.96)'; polyAt(hx,P); hx.fill();
    nline(function(){ hx.beginPath(); sp.inner.forEach(function(k){ hx.moveTo(c[0],c[1]); hx.lineTo(P[k][0],P[k][1]); }); },'#a05ad8',0.3,0.6);
    nline(function(){ polyAt(hx,P); },'#ef9aff',0.85,1); },
  ship:function(x,y,t,blink){ if(blink) return; var fl=0.75+0.25*Math.sin(t*35);
    hx.fillStyle='rgba(3,22,28,0.96)'; hx.beginPath(); hx.moveTo(x+20,y); hx.lineTo(x+7,y-6); hx.lineTo(x+3,y-6); hx.lineTo(x+5,y-1.6); hx.lineTo(x+1.5,y-1.6); hx.lineTo(x+1.5,y+1.6); hx.lineTo(x+5,y+1.6); hx.lineTo(x+3,y+6); hx.lineTo(x+7,y+6); hx.closePath(); hx.fill();
    if(!shipBare) nline(function(){ hx.beginPath(); hx.moveTo(x+1.5,y-1.2); hx.lineTo(x+1.5-8*fl,y); hx.lineTo(x+1.5,y+1.2); },'#ffb13b',0.5,0.9);
    nline(function(){ hx.beginPath(); hx.moveTo(x+20,y); hx.lineTo(x+7,y-6); hx.lineTo(x+3,y-6); hx.lineTo(x+5,y-1.6); hx.lineTo(x+1.5,y-1.6); hx.lineTo(x+1.5,y+1.6); hx.lineTo(x+5,y+1.6); hx.lineTo(x+3,y+6); hx.lineTo(x+7,y+6); hx.closePath(); },'#6ffbe0',0.85,1);
    nline(function(){ hx.beginPath(); hx.ellipse(x+13,y-0.4,3,1.2,0,0,6.2832); },'#3fb8ff',0.4,0.9); },
  ufo:function(ux,uy,big,hurt){ var k=big?1:0.72, col=hurt?'#ffffff':'#ff9aea';
    hx.save(); hx.translate(ux,uy); hx.scale(k,k); hx.fillStyle='rgba(26,3,22,0.96)'; hx.beginPath(); hx.ellipse(0,0.5,10,3,0,0,6.2832); hx.fill(); hx.beginPath(); hx.ellipse(0,-1.4,4.5,4.2,0,Math.PI,0); hx.fill();
    nline(function(){ hx.beginPath(); hx.ellipse(0,0.5,10,3,0,0,6.2832); hx.moveTo(4.5,-1.4); hx.ellipse(0,-1.4,4.5,4.2,0,0,Math.PI,true); },col,0.6/k,1);
    var t=performance.now()/1000; for(var i=0;i<5;i++){ hx.fillStyle=(Math.floor(t*6)+i)%2?'#fff27a':'#7affff'; hx.beginPath(); hx.arc(-6+i*3,0.8,0.55,0,6.2832); hx.fill(); } hx.restore(); },
  pick:function(x,y,type){ var t=performance.now()/1000, a=0.8+0.2*Math.sin(t*5);
    hx.fillStyle='rgba(58,42,4,0.96)'; hx.beginPath(); hx.roundRect(x-5.5,y-5.5,11,11,2.5); hx.fill();
    nline(function(){ hx.beginPath(); hx.roundRect(x-5.5,y-5.5,11,11,2.5); },'#fff08a',0.85,a); hx.save(); hx.translate(x,y); hdIcon(type,'#fff6c0'); hx.restore(); },
  bullet:function(x,y){ nline(function(){ hx.beginPath(); hx.moveTo(x-3.5,y); hx.lineTo(x+2,y); },'#ffd24a',0.8,1); },
  ebullet:function(x,y){ nline(function(){ hx.beginPath(); hx.arc(x,y,1.8,0,6.2832); },'#ff8aa8',0.6,1); hx.fillStyle='#fff0f5'; hx.beginPath(); hx.arc(x,y,1.5,0,6.2832); hx.fill(); },
  bursts:function(){ return {rock:['#ffffff','#f0a8ff','#e07aff','#8a3ad0'],ufo:['#ffffff','#ff9ae8','#ff5ad0'],ship:['#ffffff','#9affee','#3ff7d0','#ffb13b'],pick:['#ffffff','#ffe66d']}; },
  shield:function(){ return '#3ff7d0'; }, mini:function(){ return ['#1a8a78','#3ff7d0']; },
  shieldRing:function(x,y,t){ nline(function(){ hx.beginPath(); hx.ellipse(x+8,y,12.5,10,0,t*2,t*2+4.8); },'#3ff7d0',0.45,0.8); } };

/* ════════ NOTEBOOK: a squared school page with a red margin; pencil doodles (a sun, a ringed planet, stars, clouds) drift by behind;
   everything that matters is drawn in blue ballpoint (the enemies in red pen), rocks hatched on their shadow side, the power-up coloured
   with a yellow highlighter ════════ */
var PEN='#1d3fa0', RED='#a8142c', NTINT='rgba(208,218,242,0.96)';   // v0.80: rocks, the ship and the saucer tinted pale blue, as if coloured in with the pen (the maintainer's pick «Б»)
function penLine(fn,col,w,a){ hx.lineJoin='round'; hx.lineCap='round'; hx.strokeStyle=col; hx.globalAlpha=(a===undefined?1:a)*0.95; hx.lineWidth=lwMin(w); fn(0); hx.stroke(); hx.globalAlpha=(a===undefined?1:a)*0.45; hx.lineWidth=lwMin(w*0.7); fn(1); hx.stroke(); hx.globalAlpha=1; }
HDSK.note={id:'note', hd:true, glow:false, nolight:true, motes:['#8a8a90','#9a9aa4'],
  ui:{veil:0.62,band:'#ffe14a',btn:'#ffd93a',btnHi:'#fff08a'},
  paperMake:function(){ var o=hdOff(LW,LH), x=o.x, i; x.fillStyle='#fbf8ef'; x.fillRect(0,0,LW,LH);
    x.strokeStyle='rgba(120,160,220,0.32)'; x.lineWidth=0.25; x.beginPath(); for(i=0;i<LW;i+=5){ x.moveTo(i,0); x.lineTo(i,LH); } for(i=0;i<LH;i+=5){ x.moveTo(0,i); x.lineTo(LW,i); } x.stroke();
    x.strokeStyle='rgba(220,70,70,0.55)'; x.lineWidth=0.5; x.beginPath(); x.moveTo(22,0); x.lineTo(22,LH); x.stroke();
    var R2=srand(5); x.fillStyle='rgba(120,100,60,0.035)'; for(i=0;i<14;i++){ x.beginPath(); x.arc(R2()*LW,R2()*LH,2+R2()*8,0,6.2832); x.fill(); }   // a few smudges of a well-used page
    return o.c; },
  doodleMake:function(){ var w=LW*2, h=LH, o=hdOff(w,h), x=o.x, R2=srand(9), i, P2='rgba(80,80,90,0.5)';
    var pencil=function(fn){ x.lineJoin='round'; x.lineCap='round'; x.strokeStyle=P2; x.lineWidth=0.45; fn(0); x.stroke(); x.strokeStyle='rgba(80,80,90,0.25)'; x.lineWidth=0.35; fn(0.4); x.stroke(); };
    var star=function(sx,sy,r){ pencil(function(j){ x.beginPath(); for(var k=0;k<5;k++){ var a=-Math.PI/2+k*2.513; x.lineTo(sx+j+Math.cos(a)*r,sy+Math.sin(a)*r); } x.closePath(); }); };
    for(i=0;i<Math.round(w*h/2600);i++) star(R2()*w,R2()*h,1.6+R2()*1.4);
    [[0.2,0.2],[0.72,0.3]].forEach(function(q){ var cx=q[0]*w, cy=q[1]*h; pencil(function(j){ x.beginPath(); x.arc(cx+j,cy,9,0,6.2832); for(var k=0;k<10;k++){ var a=k*0.628; x.moveTo(cx+Math.cos(a)*12,cy+Math.sin(a)*12); x.lineTo(cx+Math.cos(a)*16,cy+Math.sin(a)*16); } }); });
    [[0.45,0.28],[0.95,0.7]].forEach(function(q){ var cx=q[0]*w, cy=q[1]*h; pencil(function(j){ x.beginPath(); x.arc(cx,cy+j,13,0,6.2832); x.moveTo(cx-22,cy+5); x.ellipse(cx,cy,23,5,-0.2,Math.PI*0.95,Math.PI*2.05,true); });
      x.save(); x.beginPath(); x.arc(cx,cy,13,0,6.2832); x.clip(); x.strokeStyle='rgba(80,80,90,0.22)'; x.lineWidth=0.3; x.beginPath(); for(var k=-16;k<30;k+=1.6){ x.moveTo(cx+k,cy+14); x.lineTo(cx+k+14,cy-14); } x.stroke(); x.restore(); });
    [[0.1,0.75],[0.6,0.85],[0.33,0.62]].forEach(function(q){ var cx=q[0]*w, cy=q[1]*h; pencil(function(j){ x.beginPath(); x.arc(cx,cy+j,5,Math.PI,0); x.arc(cx+7,cy+j-2,6,Math.PI,0); x.arc(cx+14,cy+j,4.5,Math.PI,0); x.lineTo(cx-5,cy+j); }); });
    return o.c; },
  sky:function(dt,s){ if(!this._paper||this._key!==hdKey){ this._key=hdKey; this._paper=this.paperMake(); this._dood=this.doodleMake(); this._x=this._x||0;
      var hc=hdOff(4,4); hc.x.strokeStyle='rgba(29,63,160,0.5)'; hc.x.lineWidth=0.35; hc.x.beginPath(); hc.x.moveTo(-1,5); hc.x.lineTo(5,-1); hc.x.moveTo(-1,1); hc.x.lineTo(1,-1); hc.x.moveTo(3,5); hc.x.lineTo(5,3); hc.x.stroke(); this._hatch=hc.c; this._hp=null; }
    this._x=(this._x+2.5*K*dt*s)%(LW*2);
    hx.drawImage(this._paper,0,0,LW,LH); hx.drawImage(this._dood,-this._x,0,LW*2,LH); hx.drawImage(this._dood,LW*2-this._x,0,LW*2,LH); },
  hatchFill:function(){ if(!this._hp||this._hpc!==hx){ this._hp=hx.createPattern(this._hatch,'repeat'); this._hp.setTransform(new DOMMatrix().scale(1/hs)); this._hpc=hx; } return this._hp; },
  rock:function(r,sz,seed){ var R2=srand(seed*57+3), cr=[], jit=[]; for(var i=0;i<2+(r>8?1:0);i++) cr.push([R2()*6.2832,R2()*0.5,0.13+R2()*0.12]); for(i=0;i<11;i++) jit.push([(R2()-0.5)*0.5,(R2()-0.5)*0.5]);
    return {r:r,pts:rockPoly(r,seed,11),cr:cr,jit:jit,size:r*2.4,rot:R2()*16,vr:(R2()-0.5)*6,hd:true}; },
  drawRock:function(sp,x,y){ var r=sp.r, cx=x+(sp.ox||0), a0=sp.rot/16*6.2832, P=turnPts(sp.pts,r,a0,cx,y);
    hx.save(); polyAt(hx,P); hx.clip(); hx.fillStyle=NTINT; hx.fillRect(cx-r*1.3,y-r*1.3,r*2.6,r*2.6);            // the paper inside, so the doodles behind don't show through
    hx.fillStyle=this.hatchFill(); hx.beginPath(); hx.arc(cx-r*0.2,y-r*0.25,r*1.35,0,6.2832); hx.arc(cx-r*0.55,y-r*0.6,r*1.05,0,6.2832,true); hx.fill();   // hatched on the shadow side
    sp.cr.forEach(function(c){ var ca=c[0]+a0; penLine(function(){ hx.beginPath(); hx.arc(cx+Math.cos(ca)*c[1]*r,y+Math.sin(ca)*c[1]*r,c[2]*r,0.3,6.0); },PEN,0.35,0.9); });
    hx.restore();
    penLine(function(j){ var Q=j?P.map(function(p,i){ return [p[0]+sp.jit[i][0],p[1]+sp.jit[i][1]]; }):P; polyAt(hx,Q); },PEN,Math.max(0.7,r*0.09)); },
  ship:function(x,y,t,blink){ if(blink) return; var fl=Math.sin(t*30);
    var S=[[19,0],[7,-6],[3,-6],[5,-1.5],[1.5,-1.5],[1.5,1.5],[5,1.5],[3,6],[7,6]];
    hx.fillStyle=NTINT; polyAt(hx,S.map(function(p){ return [x+p[0],y+p[1]]; })); hx.fill();
    penLine(function(j){ polyAt(hx,S.map(function(p,i){ return [x+p[0]+(j?((i*37)%5-2)*0.12:0),y+p[1]+(j?((i*53)%5-2)*0.12:0)]; })); },PEN,1.0);   // v0.81: a thicker pen
    hx.fillStyle=PEN; hx.beginPath(); hx.ellipse(x+13,y-0.4,2.8,1.1,0,0,6.2832); hx.fill();
    penLine(function(){ hx.beginPath(); hx.moveTo(x+6,y-3); hx.lineTo(x+10,y-1.4); hx.moveTo(x+6,y+3); hx.lineTo(x+10,y+1.4); },PEN,0.3,0.8);
    if(!shipBare) penLine(function(){ hx.beginPath(); hx.moveTo(x+1,y-1.2); for(var i=0;i<6;i++) hx.lineTo(x-1-i*1.2,y+(i%2?1.4:-1.4)*(1-i/7)*(0.8+0.2*fl)); hx.lineTo(x+1,y+1.2); },'#e0701a',0.5,1); },
  ufo:function(ux,uy,big,hurt){ var k=big?1:0.72, col=hurt?PEN:RED;
    hx.save(); hx.translate(ux,uy); hx.scale(k,k); hx.fillStyle=NTINT; hx.beginPath(); hx.ellipse(0,0.5,10,3,0,0,6.2832); hx.fill(); hx.beginPath(); hx.ellipse(0,-1,4.5,4,0,Math.PI,0); hx.fill();
    penLine(function(j){ hx.beginPath(); hx.ellipse(j*0.3,0.5,10,3,0,0,6.2832); hx.moveTo(4.5,-1); hx.ellipse(0,-1,4.5,4,0,0,Math.PI,true); },col,1.0/k);
    hx.fillStyle=col; for(var i=0;i<5;i++){ hx.beginPath(); hx.arc(-6+i*3,1,0.6,0,6.2832); hx.fill(); } hx.restore(); },
  pick:function(x,y,type){ hx.fillStyle='rgba(255,226,40,0.65)'; hx.fillRect(x-6,y-6,12,12);
    penLine(function(j){ hx.beginPath(); hx.rect(x-6+j*0.3,y-6-j*0.2,12,12); },PEN,1.0); hx.save(); hx.translate(x,y); hdIcon(type,PEN); hx.restore(); },
  // v0.85: the shot thicker and darker, a hard-pressed dark-blue pen (the maintainer: «сделай выстрелы повиднее», his pick «А» of four sketches)
  bullet:function(x,y){ penLine(function(){ hx.beginPath(); hx.moveTo(x-4,y); hx.lineTo(x+2.3,y); },'#0a1f6a',1.7,1); },
  ebullet:function(x,y){ penLine(function(){ hx.beginPath(); hx.moveTo(x-2,y-2); hx.lineTo(x+2,y+2); hx.moveTo(x+2,y-2); hx.lineTo(x-2,y+2); },RED,0.95,1); },
  bursts:function(){ return {rock:['#1d3fa0','#3a5ac0','#6a7ab0'],ufo:['#c8283a','#e05060'],ship:['#1d3fa0','#e0701a','#c8283a'],pick:['#e0b000','#1d3fa0']}; },
  parts:function(){ parts.forEach(function(p){ var f=p.life/p.max, c=p.cols[Math.min(p.cols.length-1,Math.floor((1-f)*p.cols.length))]; hx.globalAlpha=Math.min(1,f*1.6); hx.strokeStyle=c; hx.lineWidth=lwMin(0.4); hx.lineCap='round';
      hx.beginPath(); hx.moveTo(p.x,p.y); hx.lineTo(p.x-p.vx*0.03,p.y-p.vy*0.03); hx.stroke(); }); hx.globalAlpha=1; },
  shield:function(){ return PEN; }, mini:function(){ return ['#1d3fa0','#5a7ad0']; },
  shieldRing:function(x,y,t){ penLine(function(){ hx.beginPath(); for(var i=0;i<14;i++){ var a=i/14*6.2832+t; hx.moveTo(x+8+Math.cos(a)*12,y+Math.sin(a)*9.5); hx.lineTo(x+8+Math.cos(a+0.25)*12,y+Math.sin(a+0.25)*9.5); } },PEN,0.45,0.8); } };

/* ════════ RETRO LCD: a green pocket-console screen — four greens, chunky pixels of 2 game pixels, the LCD's cells with thin gaps in HD,
   a far dithered planet, stars; sprites of its own (rocks turning in 8 frames with the light fixed), square sparks ════════ */
var LCDG=['#0f380f','#306230','#8bac0f','#a8c83a'], LCDO=['#0f380f','#1f4a1f','#306230','#6a8a1a'], LP=2;   // v0.81: objects a shade darker (LCDO), the screen a touch lighter
function lcdSprite(rows,pal){ pal=pal||LCDG; var h=rows.length, w=Math.max.apply(null,rows.map(function(r){ return r.length; })), sc=hs, o=hdOff(w*LP,h*LP), x=o.x, gap=sc>1.5?0.12:0;
  for(var yy=0;yy<h;yy++) for(var xx=0;xx<w;xx++){ var ch=rows[yy][xx]||'.'; if(ch==='.') continue; x.fillStyle=pal[+ch]; x.fillRect(xx*LP+gap,yy*LP+gap,LP-2*gap,LP-2*gap); }
  return {c:o.c,w:w*LP,h:h*LP}; }
function lcdPut(sp,x,y){ hx.drawImage(sp.c,Math.round(x/LP)*LP,Math.round(y/LP)*LP,sp.w,sp.h); }
var LCD_SHIP=['.00........','.0110......','.011100....','00111112200','01222112210','00111111100','.011100....','.0110......','.00........'];   // v0.79: 11 cells long (was 13)
var LCD_UFO=['...000...','..02230..','000000000','031313130','.0000000.'];   // v0.83: 9 cells (was 12): the core's zone
var LCD_ICON={shield:['01110','02320','02220','00200','..0..'],triple:['...00','..0..','00000','..0..','...00'],slow:['00000','.020.','..0..','.020.','00000'],life:['0.0.0','00000','00000','.000.','..0..']};
HDSK.lcd={id:'lcd', hd:true, glow:false, nolight:true, motes:['#8bac0f'], shotsByShape:'a dash vs an X',
  ui:{veil:0.5,band:'#9bbc0f',btn:'#8bac0f',btnHi:'#b8d84a'},
  sky:function(dt,s){ var me=this, i;
    if(!this._bg||this._key!==hdKey){ this._key=hdKey; this._spr={}; var o=hdOff(LW,LH), x=o.x, gap=hs>1.5?0.12:0; x.fillStyle='#8a9a14'; x.fillRect(0,0,LW,LH);
      for(var yy=0;yy<LH;yy+=LP) for(var xx=0;xx<LW;xx+=LP){ x.fillStyle=LCDG[3]; x.fillRect(xx+gap,yy+gap,LP-2*gap,LP-2*gap); }
      var gl=x.createLinearGradient(0,0,LW,LH); gl.addColorStop(0,'rgba(255,255,220,0.06)'); gl.addColorStop(1,'rgba(0,30,0,0.1)'); x.fillStyle=gl; x.fillRect(0,0,LW,LH); this._bg=o.c;
      // the far planet: a dithered disc with a ring, its own sprite
      var pr=[], R=9; for(var py=-R;py<=R;py++){ var row=''; for(var px=-R;px<=R;px++){ var d=px*px+py*py;
          row+=d<=R*R?(d>(R-1)*(R-1)?'1':(px+py>2?((px+py)%2?'1':'2'):((px*3+py*5)%11===0?'1':'2'))):'.'; } pr.push(row); } this._planet=lcdSprite(pr);
      var R2=srand(8); this._st=[]; for(i=0;i<Math.round(LW*LH/700);i++) this._st.push({x:R2()*LW,y:R2()*LH,z:R2()}); this._pxp=LW*0.62; }
    hx.drawImage(this._bg,0,0,LW,LH);
    this._pxp-=1.2*K*dt*s; if(this._pxp<-60) this._pxp=LW+20; lcdPut(this._planet,this._pxp,LH*0.1);
    var dot=this._dot||(this._dot=lcdSprite(['2'])), dd=this._dd||(this._dd=lcdSprite(['1']));
    this._st.forEach(function(p){ p.x-=(3+p.z*14)*K*dt*s; if(p.x<0){ p.x+=LW; p.y=Math.random()*LH; } lcdPut(dot,p.x,p.y); }); },
  rockFrames:function(r,seed){ var rr=Math.max(2,Math.round(r/LP)), R2=srand(seed*13+5), rad=[], cr=[], i, f, out=[];
    for(i=0;i<16;i++) rad.push(rr*(0.8+R2()*0.28)); for(i=0;i<1+(rr>3?2:0);i++) cr.push([R2()*6.2832,R2()*0.5*rr]);
    for(f=0;f<8;f++){ var a0=f/8*6.2832, rows=[];
      for(var yy=-rr-1;yy<=rr+1;yy++){ var row=''; for(var xx=-rr-1;xx<=rr+1;xx++){ var a=Math.atan2(yy,xx)-a0, k=rad[((Math.floor((a/(2*Math.PI))*16)%16)+16)%16], d=Math.hypot(xx,yy), ch='.';
          if(d<=k-0.9){ var lit=(xx+yy)<-rr*0.5, dark=(xx+yy)>rr*0.5; ch=lit?'2':dark?'1':((xx+yy)%2?'1':'2');
            cr.forEach(function(c){ var ca=c[0]+a0, cx2=Math.cos(ca)*c[1], cy2=Math.sin(ca)*c[1]; if(Math.hypot(xx-cx2,yy-cy2)<Math.max(0.8,rr*0.18)) ch='0'; }); }
          else if(d<=k+0.3) ch='0'; row+=ch; } rows.push(row); }
      out.push(lcdSprite(rows,LCDO)); } return out; },
  rock:function(r,sz,seed){ return {r:r,fr:this.rockFrames(r,seed),size:r*2.4,rot:srand(seed)()*16,vr:(srand(seed+2)()-0.5)*6,hd:true}; },
  drawRock:function(sp,x,y){ var f=sp.fr[Math.floor(sp.rot/2)%8]; lcdPut(f,x+(sp.ox||0)-f.w/2,y-f.h/2); },
  sp:function(k,rows){ var s=this._spr||(this._spr={}); return s[k]||(s[k]=lcdSprite(rows,LCDO)); },
  ship:function(x,y,t,blink){ if(blink) return; lcdPut(this.sp('ship',LCD_SHIP),x-2,y-9); if(!shipBare&&Math.floor(t*12)%2) lcdPut(this.sp('fl',['11','0.']),x-5,y-1); },
  ufo:function(ux,uy,big,hurt){ var sp=this.sp(big?'ufo':'ufoS',big?LCD_UFO:['..000...','.02230..','0000000.','0313130.','.00000..']); if(hurt&&Math.floor(performance.now()/60)%2) return; lcdPut(sp,ux-sp.w/2,uy-sp.h/2); },
  pick:function(x,y,type){ var ic=LCD_ICON[type]||LCD_ICON.life, rows=['0000000']; ic.forEach(function(r){ rows.push('0'+r.replace(/[.2]/g,'3')+'0'); }); rows.push('0000000');   // v0.81: 7 cells (the core's zone), light inside, the sign and the frame dark
    var s=this._spr||(this._spr={}), sp=s['pk_'+type]||(s['pk_'+type]=lcdSprite(rows,LCDG)); lcdPut(sp,x-sp.w/2,y-sp.h/2); },   // v0.81: light inside, the sign and the frame dark
  bullet:function(x,y){ lcdPut(this.sp('b',['001']),x-3,y-1); },
  ebullet:function(x,y){ lcdPut(this.sp('eb',['0.0','.0.','0.0']),x-3,y-3); },
  bursts:function(){ return {rock:['#0f380f','#306230','#306230'],ufo:['#0f380f','#306230'],ship:['#0f380f','#306230'],pick:['#0f380f','#306230']}; },
  parts:function(){ var me=this; parts.forEach(function(p){ var f=p.life/p.max; if(f<0.15) return; lcdPut(me.sp(f>0.5?'p0':'p1',[f>0.5?'0':'1']),p.x,p.y); }); },
  shield:function(){ return LCDG[0]; }, mini:function(){ return [LCDG[1],LCDG[0]]; },
  shieldRing:function(x,y,t){ var d=this.sp('sh',['1']); for(var i=0;i<16;i++){ var a=i/16*6.2832+t*1.5; if(i%2===0) lcdPut(d,x+8+Math.cos(a)*12,y+Math.sin(a)*9.5); } } };
