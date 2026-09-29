/* ── PIXEL PICTURES OF THE SHAPE SKINS (v0.76, the maintainer: «у этих четырёх скинов нет отдельной пиксельной версии — надо сделать»).
   With «ГРАФИКА: ПИКСЕЛИ» vector 80s, neon and notebook are real pixel art now — one-pixel lines, a pixel bloom or halo round them,
   pictures made once per size and kept, like the space and fairy skins. The retro LCD needs none: its HD picture is already whole
   pixels (2 game pixels per LCD cell, no smoothing) — at one pixel per game pixel it is its own pixel version. ── */
Pix.prototype.line=function(x0,y0,x1,y1,c){ x0=Math.round(x0); y0=Math.round(y0); x1=Math.round(x1); y1=Math.round(y1);
  var dx=Math.abs(x1-x0), dy=-Math.abs(y1-y0), sx=x0<x1?1:-1, sy=y0<y1?1:-1, e=dx+dy;
  for(;;){ this.put(x0,y0,c); if(x0===x1&&y0===y1) break; var e2=2*e; if(e2>=dy){ e+=dy; x0+=sx; } if(e2<=dx){ e+=dx; y0+=sy; } } };
Pix.prototype.path=function(P,c,closed){ for(var i=0;i<P.length-(closed?0:1);i++){ var a=P[i], b=P[(i+1)%P.length]; this.line(a[0],a[1],b[0],b[1],c); } };
Pix.prototype.ring=function(cx,cy,rx,ry,c,a0,a1){ a0=a0||0; a1=a1===undefined?6.2832:a1; var n=Math.max(12,Math.round((rx+ry)*(a1-a0)*0.8)), prev=null;
  for(var i=0;i<=n;i++){ var a=a0+(a1-a0)*i/n, q=[cx+Math.cos(a)*rx,cy+Math.sin(a)*ry]; if(prev) this.line(prev[0],prev[1],q[0],q[1],c); prev=q; } };
/* a one-pixel halo (the bloom of a phosphor line, the glow of a neon tube): every empty pixel touching a drawn one side-on */
Pix.prototype.halo=function(c,diag){ var w=this.w, h=this.h, on=new Uint8Array(w*h), i, x, y;
  for(i=0;i<w*h;i++) on[i]=this.d[i*4+3]>0?1:0;
  for(y=0;y<h;y++) for(x=0;x<w;x++){ if(on[y*w+x]) continue; var t=(x>0&&on[y*w+x-1])||(x<w-1&&on[y*w+x+1])||(y>0&&on[(y-1)*w+x])||(y<h-1&&on[(y+1)*w+x]);
    if(!t&&diag) t=(x>0&&y>0&&on[(y-1)*w+x-1])||(x<w-1&&y>0&&on[(y-1)*w+x+1])||(x>0&&y<h-1&&on[(y+1)*w+x-1])||(x<w-1&&y<h-1&&on[(y+1)*w+x+1]);
    if(t) this.put(x,y,c); } };
/* 16 turning frames of a rock drawn by fn(p, points, c, r) — the outline turns, the light (if any) stays */
function pixRockFrames(r,seed,n,fn){ var pts=rockPoly(r,seed,n), size=Math.ceil(r*2.4)+6, c=size/2, frames=[];
  for(var f=0;f<16;f++){ var p=new Pix(size,size), P=turnPts(pts,r,f/16*6.2832,c,c); fn(p,P,c,r,f); frames.push(p.canvas()); }
  var R2=srand(seed+5); return {frames:frames,size:size,rot:R2()*16,vr:(R2()-0.5)*6}; }
/* a sprite made once by fn(p) and kept (by key and size) */
var pixCache={};
function pixOnce(key,w,h,fn){ var k=key+'|'+K; if(!pixCache[k]){ var p=new Pix(w,h); fn(p); pixCache[k]=p.canvas(); } return pixCache[k]; }
function pxLine(x0,y0,x1,y1,c){ lx.fillStyle=c; var n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0)); for(var i=0;i<=n;i++){ var t=n?i/n:0; lx.fillRect(Math.round(x0+(x1-x0)*t),Math.round(y0+(y1-y0)*t),1,1); } }
var PICONS=ICON;

/* ════════ VECTOR 80s, pixels: black, one-pixel phosphor lines with a dim green bloom, a wireframe planet and a mountain line drifting
   behind, dim stars; the enemy shots are amber crosses, own shots a bright dot with a short trail ════════ */
var VPH=cH('#d8fff0'), VMID=cH('#7affc8'), VDIM=cH('#1d5a44'), VFAR=cH('#2b6652'), VAMB=cH('#ffc060'), VAMBD=cH('#6a3a08');
SKINS.vector={id:'vector', glow:false, nolight:true, motes:['#2a3444','#3a4a5e','#5a6a8a'], moteDiv:1100,
  ui:HDSK.vector.ui,
  paint:function(p,w,h){ var y, x; for(y=0;y<h;y++) for(x=0;x<w;x++) p.put(x,y,[2,5,4]);
    [[0.28,0.24,18],[0.78,0.3,11]].forEach(function(q){ var cx=q[0]*w, cy=q[1]*h, r=q[2];
      p.ring(cx,cy,r,r,VFAR); p.ring(cx,cy,r*1.7,r*0.34,VFAR,0.25,Math.PI-0.25);
      for(var k=-2;k<=2;k++){ var yy=cy+k*r/3, hw=Math.sqrt(r*r-(k*r/3)*(k*r/3)); p.line(cx-hw,yy,cx+hw,yy,[20,52,42]); } });
    var prev=null; for(x=0;x<=w;x+=6){ var yy=Math.round(hill(x,w,h*0.86,h*0.05,1.7)-Math.abs(Math.sin(x*0.07))*h*0.04); if(prev) p.line(prev[0],prev[1],x,yy,VFAR); prev=[x,yy]; } },
  sky:function(dt,s){ skinSky(this,dt,s); },
  rock:function(r,sz,seed){ return pixRockFrames(r,seed,10,function(p,P){ p.path(P,cH('#bfffe6'),true); p.halo(VDIM); }); },
  shipPix:function(){ return pixOnce('v-ship',24,16,function(p){ var y=8; p.path([[21,y],[3,y-7],[6,y],[3,y+7]],VPH,true); p.line(9,y-4,9,y+4,VPH); p.halo(VDIM); }); },
  ship:function(x,y,t,blink){ if(blink) return; x=Math.round(x); y=Math.round(y); var fl=Math.floor(t*20)%3;
    R('#7affc8',x-2-fl,y,3+fl,1); R('#1d5a44',x-3-fl,y,1,1); lx.drawImage(this.shipPix(),x-2,y-8); },
  ufoPix:function(big){ var k=big?1:0.72; return pixOnce('v-ufo'+big,26,16,function(p){ var c=13, cy=8, s=function(a,b){ return [c+a*k,cy+b*k]; };
      p.path([s(-10,0),s(10,0),s(6,3.2),s(-6,3.2)],VPH,true); p.path([s(-10,0),s(-5,-3),s(5,-3),s(10,0)],VPH,false); p.path([s(-3,-3),s(-2,-6),s(2,-6),s(3,-3)],VPH,false); p.halo(VDIM); }); },
  ufo:function(ux,uy,big,hurt){ var c=this.ufoPix(big); lx.drawImage(c,Math.round(ux)-13,Math.round(uy)-8); if(hurt){ lx.globalAlpha=0.6; R('#ffffff',ux-9,uy-3,18,6); lx.globalAlpha=1; } },
  pick:function(x,y,type){ x=Math.round(x); y=Math.round(y); var c=pixOnce('v-pick',17,17,function(p){ p.path([[8,1],[15,8],[8,15],[1,8]],VPH,true); p.halo(VDIM); });
    lx.drawImage(c,x-8,y-8); blit(PICONS[type],['#d8fff0'],x-3,y-3); },
  bullet:function(x,y){ x=Math.round(x); y=Math.round(y); R('#2b6652',x-5,y,3,1); R('#7affc8',x-2,y,2,1); R('#ffffff',x,y,1,1); R('#1d5a44',x,y-1,1,1); R('#1d5a44',x,y+1,1,1); },
  ebullet:function(x,y){ x=Math.round(x); y=Math.round(y); var c=pixOnce('v-eb',7,7,function(p){ p.line(1,1,5,5,VAMB); p.line(5,1,1,5,VAMB); p.halo(VAMBD); }); lx.drawImage(c,x-3,y-3); },
  bursts:function(){ return {rock:['#e8fff6','#9affd8','#4ab890'],ufo:['#ffffff','#9affd8'],ship:['#ffffff','#d8fff0','#7affc8'],pick:['#ffffff','#d8fff0']}; },
  shield:function(){ return '#7affc8'; }, mini:function(){ return ['#2a8a6a','#d8fff0']; } };

/* ════════ NEON, pixels: a night sky with a striped sun, a dark range edged in violet drifting by, a magenta grid floor running (8 frames),
   objects as one-pixel neon tubes with a dim glow pixel round them, over dark glass ════════ */
SKINS.neon={id:'neon', glow:false, nolight:true, motes:['#c9b8ff','#9ef8ff'],
  ui:HDSK.neon.ui,
  skyMake:function(){ var w=LW, h=LH, hz=Math.round(h*0.7), p=new Pix(w,h), R2=srand(12), x, y;
    var top=cHS(['#07031a','#12062c','#1a0838','#2a0a44','#3a0c4a']); for(y=0;y<hz;y++){ var t=y/(hz-1)*4, i=Math.min(3,Math.floor(t)), f=t-i; for(x=0;x<w;x++) p.put(x,y,f>bay(x,y)?top[i+1]:top[i]); }
    for(y=hz;y<h;y++) for(x=0;x<w;x++) p.put(x,y,(y-hz)/(h-hz)>bay(x,y)*0.9+0.3?[7,2,14]:[20,5,36]);
    for(var i=0;i<Math.round(w*hz/220);i++){ var sx=R2()*w, sy=R2()*hz*0.9, z=R2(); p.put(sx,sy,z>0.85?[158,248,255]:z>0.4?[150,130,210]:[80,64,130]); }
    // the sun: gradient bands, dark stripes widening towards the horizon
    var sx0=Math.round(w*0.5), sr=Math.round(h*0.3), sc=cHS(['#ffe25a','#ffb24a','#ff8a4a','#ff5a6a','#ff2f8e']);
    for(y=hz-sr;y<hz;y++){ var fy=(y-(hz-sr))/sr, band=Math.min(4,Math.floor(fy*5)), cut=fy>0.45&&((y-hz)%Math.max(2,Math.round(7-fy*5)))===0;
      if(cut) continue; var hw=Math.sqrt(Math.max(0,sr*sr-(hz-y)*(hz-y))); for(x=Math.round(sx0-hw);x<=Math.round(sx0+hw);x++) p.put(x,y,sc[band]); }
    return p.canvas(); },
  rangeMake:function(){ var w=LW*2+40, h=LH, hz=Math.round(h*0.7), p=new Pix(w,h), R2=srand(4), pts=[], x=0;
    while(x<w){ pts.push([x,hz-4-R2()*26*(R2()>0.35?1:0.4)]); x+=10+R2()*18; } pts.push([w,hz-6]);
    for(var i=0;i+1<pts.length;i++){ var a=pts[i], b=pts[i+1]; for(var xx=Math.round(a[0]);xx<Math.round(b[0]);xx++){ var yy=Math.round(a[1]+(b[1]-a[1])*(xx-a[0])/(b[0]-a[0])); for(var y=yy;y<hz;y++) p.put(xx,y,[12,4,24]); } }
    p.path(pts,cH('#b44aff'),false); for(i=0;i<pts.length;i+=2) p.line(pts[i][0],pts[i][1],pts[i][0]+(pts[i][0]%40-20)*0.2,hz-1,cH('#4a1a8a'));
    return p.canvas(); },
  gridMake:function(ph){ var w=LW, h=LH, hz=Math.round(h*0.7), p=new Pix(w,h-hz), vx=w/2, i, col=cH('#86286c'), dim=cH('#6a1450');
    for(i=1;i<8;i++){ var yy=Math.round((h-hz)*Math.pow(i/7,1.9)); p.line(0,yy,w,yy,col); }
    for(i=-30;i<=30;i++){ var off=(i*16-ph); p.line(vx+off*0.12,0,vx+off*2.2,h-hz+1,col); }
    p.line(0,0,w,0,cH('#ff7ae0')); return p.canvas(); },   // no glow on the floor: it is background
  sky:function(dt,s){ var hz=Math.round(LH*0.7);
    if(!this._k||this._k!==LW+'x'+LH){ this._k=LW+'x'+LH; this._sky=this.skyMake(); this._rng=this.rangeMake(); this._grid=[]; for(var f=0;f<8;f++) this._grid.push(this.gridMake(f*2)); this._mx=this._mx||0; this._gx=this._gx||0; }
    this._mx=(this._mx+4*K*dt*s)%(LW*2+40); this._gx=(this._gx+26*K*dt*s)%16;
    lx.drawImage(this._sky,0,0); var mx=Math.floor(this._mx); lx.drawImage(this._rng,-mx,0); lx.drawImage(this._rng,LW*2+40-mx,0);
    lx.drawImage(this._grid[Math.floor(this._gx/2)%8],0,hz); lx.fillStyle='rgba(8,2,22,0.55)'; lx.fillRect(0,0,LW,LH); },   // v0.80: the background dimmed (the maintainer's pick «Б»)
  rock:function(r,sz,seed){ var R2=srand(seed*31+7), inner=[]; for(var i=0;i<3+(r>8?2:0);i++) inner.push(Math.floor(R2()*9));
    return pixRockFrames(r,seed,9,function(p,P,c){ p.poly(P,[16,3,28]); var cc=[c-r*0.15,c-r*0.1]; inner.forEach(function(k){ p.line(cc[0],cc[1],P[k][0],P[k][1],[110,60,170]); }); var I=P.map(function(q){ var dx=q[0]-c, dy=q[1]-c, d=Math.hypot(dx,dy)||1; return [q[0]-dx/d*1.2,q[1]-dy/d*1.2]; }); p.path(I,cH('#b050e0'),true); p.path(P,cH('#ffc4ff'),true); }); },   // the glow inside, so the tube is the rock's edge
  shipPix:function(){ return pixOnce('n-ship',24,16,function(p){ var y=8, S=[[21,y],[8,y-6],[4,y-6],[6,y-2],[2,y-2],[2,y+2],[6,y+2],[4,y+6],[8,y+6]];
      p.poly(S,[3,22,28]); p.path(S,cH('#7ffbe4'),true); p.line(12,y-1,15,y-1,cH('#9fefff')); p.line(12,y,16,y,cH('#3fb8ff')); p.halo(cH('#0f5a54')); }); },
  ship:function(x,y,t,blink){ if(blink) return; x=Math.round(x); y=Math.round(y); var fl=Math.floor(t*20)%3; R('#ffb13b',x-2-fl,y,3+fl,1); R('#fff2b0',x,y,1,1); lx.drawImage(this.shipPix(),x-2,y-8); },
  ufoPix:function(big,hurt){ var k=big?1:0.72; return pixOnce('n-ufo'+big+hurt,26,16,function(p){ var c=13, cy=8, col=cH(hurt?'#ffffff':'#ff9aea'), E=[];
      for(var i=0;i<24;i++){ var a=i/24*6.2832; E.push([c+Math.cos(a)*10*k,cy+1+Math.sin(a)*3*k]); } p.poly(E,[26,3,22]); p.path(E,col,true);
      var D=[]; for(i=0;i<=10;i++){ var b=Math.PI+i/10*Math.PI; D.push([c+Math.cos(b)*4.5*k,cy-1+Math.sin(b)*4.2*k]); } p.poly(D,[26,3,22]); p.path(D,col,false); p.halo(cH('#6a1a60')); }); },
  ufo:function(ux,uy,big,hurt){ lx.drawImage(this.ufoPix(big,!!hurt),Math.round(ux)-13,Math.round(uy)-8); var t=performance.now()/1000;
    for(var i=0;i<5;i++) R((Math.floor(t*6)+i)%2?'#fff27a':'#7affff',Math.round(ux)-6+i*3,Math.round(uy)+1,1,1); },
  pick:function(x,y,type){ x=Math.round(x); y=Math.round(y); var c=pixOnce('n-pick',15,15,function(p){ p.rect(2,2,11,11,[22,17,3]); p.path([[3,1],[11,1],[13,3],[13,11],[11,13],[3,13],[1,11],[1,3]],cH('#ffe66d'),true); p.halo(cH('#6a5a10')); });
    lx.drawImage(c,x-7,y-7); blit(PICONS[type],['#fff6c0'],x-3,y-3); },
  bullet:function(x,y){ x=Math.round(x); y=Math.round(y); R('#ffd24a',x-3,y,3,1); R('#fff6d0',x,y,2,1); R('#1e1404',x-3,y-1,5,1); R('#1e1404',x-3,y+1,5,1); },
  ebullet:function(x,y){ x=Math.round(x); y=Math.round(y); var c=pixOnce('n-eb',7,7,function(p){ p.ring(3,3,2,2,cH('#ffc0d2')); p.rect(2,2,3,3,cH('#ff5a8a')); p.put(3,3,[255,255,255]); p.halo(cH('#2a0418')); }); lx.drawImage(c,x-3,y-3); },
  bursts:function(){ return HDSK.neon.bursts(); }, shield:function(){ return '#3ff7d0'; }, mini:function(){ return ['#1a8a78','#3ff7d0']; } };

/* ════════ NOTEBOOK, pixels: squared paper with a red margin, pencil doodles drifting behind, one-pixel ballpoint lines; rocks hatched on the
   shadow side, the saucer and the enemy shots in red pen, the power-up coloured with a yellow highlighter ════════ */
var NTINTP=cH('#d0daf2'), NPEN=cH('#1d3fa0'), NPEN2=cH('#6a80c8'), NRED=cH('#a8142c'), NPAPER=cH('#fbf8ef'), NPEN_L=cH('#9aaad8');
SKINS.note={id:'note', glow:false, nolight:true, motes:['#9a9aa4'],
  ui:HDSK.note.ui,
  paperMake:function(){ var p=new Pix(LW,LH), x, y, g=cH('#d6e2f2'), g2=cH('#e6edf6');
    for(y=0;y<LH;y++) for(x=0;x<LW;x++) p.put(x,y,y%5===0||x%5===0?(y%5===0&&x%5===0?g:((x+y)%2?g:g2)):NPAPER);
    for(y=0;y<LH;y++) p.put(22,y,[232,150,150]); return p.canvas(); },
  doodleMake:function(){ var w=LW*2, h=LH, p=new Pix(w,h), R2=srand(9), i, PC=cH('#a4a4ae'), PC2=cH('#c4c4cc');
    var star=function(sx,sy,r){ var S=[]; for(var k=0;k<5;k++){ var a=-Math.PI/2+k*2*2.513; S.push([sx+Math.cos(a)*r,sy+Math.sin(a)*r]); } p.path(S,PC,true); };
    for(i=0;i<Math.round(w*h/2600);i++) star(R2()*w,R2()*h,2+R2()*1.4);
    [[0.2,0.2],[0.72,0.3]].forEach(function(q){ var cx=q[0]*w, cy=q[1]*h; p.ring(cx,cy,9,9,PC); for(var k=0;k<10;k++){ var a=k*0.628; p.line(cx+Math.cos(a)*12,cy+Math.sin(a)*12,cx+Math.cos(a)*15,cy+Math.sin(a)*15,PC); } });
    [[0.45,0.28],[0.95,0.7]].forEach(function(q){ var cx=q[0]*w, cy=q[1]*h; for(var yy=-12;yy<=12;yy++) for(var xx=-12;xx<=12;xx++) if(xx*xx+yy*yy<150&&(xx-yy)%3===0) p.put(cx+xx,cy+yy,PC2);
      p.ring(cx,cy,13,13,PC); p.ring(cx,cy,23,5,PC,Math.PI*0.05,Math.PI*0.95); });
    [[0.1,0.75],[0.6,0.85],[0.33,0.62]].forEach(function(q){ var cx=q[0]*w, cy=q[1]*h; p.ring(cx,cy,5,5,PC,Math.PI,6.2832); p.ring(cx+7,cy-2,6,6,PC,Math.PI,6.2832); p.ring(cx+14,cy,4.5,4.5,PC,Math.PI,6.2832); p.line(cx-5,cy,cx+18,cy,PC); });
    return p.canvas(); },
  sky:function(dt,s){ if(!this._k||this._k!==LW+'x'+LH){ this._k=LW+'x'+LH; this._paper=this.paperMake(); this._dood=this.doodleMake(); this._x=this._x||0; }
    this._x=(this._x+2.5*K*dt*s)%(LW*2); lx.drawImage(this._paper,0,0); var x=Math.floor(this._x); lx.drawImage(this._dood,-x,0); lx.drawImage(this._dood,LW*2-x,0); },
  rock:function(r,sz,seed){ var R2=srand(seed*57+3), cr=[]; for(var i=0;i<2+(r>8?1:0);i++) cr.push([R2()*6.2832,R2()*0.5,0.14+R2()*0.12]);
    return pixRockFrames(r,seed,11,function(p,P,c,rr,f){ p.poly(P,NTINTP);
      for(var y=0;y<p.h;y++) for(var x=0;x<p.w;x++){ var o=(y*p.w+x)*4; if(!p.d[o+3]) continue; var dx=x-c, dy=y-c; if(dx+dy>r*0.35&&(x+y)%3===0) p.put(x,y,NPEN2); }   // hatched on the shadow side
      var a0=f/16*6.2832; cr.forEach(function(q){ var a=q[0]+a0; p.ring(c+Math.cos(a)*q[1]*r,c+Math.sin(a)*q[1]*r,Math.max(1.2,q[2]*r),Math.max(1.2,q[2]*r),NPEN,0.3,6); });
      p.path(P,NPEN,true); if(r>7) p.path(P.map(function(q,i){ return [q[0]+(i%3===0?1:0),q[1]]; }),NPEN,true); p.path(P,NPEN,true); }); },
  shipPix:function(){ return pixOnce('nb-ship',24,16,function(p){ var y=8, S=[[21,y],[9,y-6],[5,y-6],[7,y-2],[3,y-2],[3,y+2],[7,y+2],[5,y+6],[9,y+6]];
      p.poly(S,NTINTP); p.path(S,NPEN,true); p.rect(13,y-1,4,2,NPEN); p.line(8,y-3,12,y-1,NPEN2); p.line(8,y+3,12,y+1,NPEN2); }); },
  ship:function(x,y,t,blink){ if(blink) return; x=Math.round(x); y=Math.round(y); var fl=Math.floor(t*14)%2;
    lx.drawImage(this.shipPix(),x-2,y-8); lx.fillStyle='#e0701a'; for(var i=0;i<5;i++) lx.fillRect(x-1-i,y+((i+fl)%2?1:-1),1,1); },
  ufoPix:function(big,hurt){ var k=big?1:0.72; return pixOnce('nb-ufo'+big+hurt,26,16,function(p){ var c=13, cy=8, col=hurt?NPEN:NRED, E=[], D=[], i;
      for(i=0;i<24;i++){ var a=i/24*6.2832; E.push([c+Math.cos(a)*10*k,cy+1+Math.sin(a)*3*k]); } p.poly(E,NTINTP); p.path(E,col,true);
      for(i=0;i<=10;i++){ var b=Math.PI+i/10*Math.PI; D.push([c+Math.cos(b)*4.5*k,cy-1+Math.sin(b)*4*k]); } p.poly(D,NTINTP); p.path(D,col,false);
      for(i=0;i<5;i++) p.put(c-6*k+i*3*k,cy+1,col); }); },
  ufo:function(ux,uy,big,hurt){ lx.drawImage(this.ufoPix(big,!!hurt),Math.round(ux)-13,Math.round(uy)-8); },
  pick:function(x,y,type){ x=Math.round(x); y=Math.round(y); R('#ffe44a',x-6,y-6,12,12); var c=pixOnce('nb-pick',14,14,function(p){ p.path([[1,1],[12,1],[12,12],[1,12]],NPEN,true); p.line(2,0,12,0,NPEN_L); }); lx.drawImage(c,x-7,y-7); blit(PICONS[type],['#1d3fa0'],x-3,y-3); },
  bullet:function(x,y){ x=Math.round(x); y=Math.round(y); R('#1d3fa0',x-4,y,6,1); R('#6a80c8',x-3,y+1,4,1); },
  ebullet:function(x,y){ x=Math.round(x); y=Math.round(y); var c=pixOnce('nb-eb',6,6,function(p){ p.line(0,0,4,4,NRED); p.line(4,0,0,4,NRED); p.line(1,0,5,4,NRED); p.line(5,0,1,4,NRED); }); lx.drawImage(c,x-3,y-2); },
  bursts:function(){ return HDSK.note.bursts(); }, shield:function(){ return '#1d3fa0'; }, mini:function(){ return ['#1d3fa0','#6a80c8']; } };
