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
/* v1.29, the vector explosions «Д» in pixels (as HD: glass shards, the saucer's strokes and lights, the power-up's diamond strokes, the ship's strokes and a ring) */
function vtPxParts(){ spFxTrack(); var i;
  var seg=function(X,Y,L,a,col){ pxLine(X-Math.cos(a)*L,Y-Math.sin(a)*L,X+Math.cos(a)*L,Y+Math.sin(a)*L,col); };
  SPFX.forEach(function(e){ var t=e.t, X=Math.round(e.x), Y=Math.round(e.y), d, al;
    if(t<0.1){ R('#ffffff',X-1,Y-1,3,3); }
    if(e.k==='ufo'){ d=t*26; al=Math.max(0,1-t/0.6); if(al<=0) return; lx.globalAlpha=al; seg(X,Y-3-d,5,t*4,'#ffc060'); seg(X,Y+3+d,5,-t*4,'#ffc060'); seg(X-6-d,Y,2,1.57+t*4,'#ffc060'); seg(X+6+d,Y,2,1.57-t*4,'#ffc060'); lx.globalAlpha=1; }
    else if(e.k==='pick'){ d=t*30; al=Math.max(0,1-t/0.5); if(al<=0) return; lx.globalAlpha=al; [[1,-1],[1,1],[-1,1],[-1,-1]].forEach(function(q,k){ seg(X+q[0]*(3+d),Y+q[1]*(3+d),2,(k%2?-1:1)*0.785,'#d8fff0'); }); lx.globalAlpha=1; }
    else if(e.k==='ship'){ d=t*22; al=Math.max(0,1-t/0.6); var u=Math.min(1,t/0.45); if(u<1){ lx.globalAlpha=1-u; var rr=3+u*20; for(i=0;i<40;i++){ var b=i/40*6.2832; R('#7affc8',Math.round(X+Math.cos(b)*rr),Math.round(Y+Math.sin(b)*rr),1,1); } lx.globalAlpha=1; }
      if(al>0){ lx.globalAlpha=al; [[6,-3,0.36],[6,3,-0.36],[-3,-3,0.9],[-3,3,-0.9]].forEach(function(q,k){ var a=Math.atan2(q[1],q[0]); seg(X+q[0]+Math.cos(a)*d,Y+q[1]+Math.sin(a)*d,k<2?5:2,q[2]+t*(k%2?5:-5),'#d8fff0'); }); lx.globalAlpha=1; } } });
  parts.forEach(function(p){ var f=p.life/p.max, k=p._k, c=p.cols[Math.min(p.cols.length-1,Math.floor((1-f)*p.cols.length))], X=Math.round(p.x), Y=Math.round(p.y);
    if(k==='rock'){ if(p._i%3===0&&f>0.2){ var o=Math.floor((p.max-p.life)*12+p._i)%4; R('#9affd8',X,Y,1,1); R('#9affd8',X+(o<2?1:-1),Y,1,1); R('#9affd8',X,Y+(o%2?1:-1),1,1); R('#ffffff',X,Y,1,1); } else if(p._i%3===1&&f>0.4) R('#2b6652',X,Y,1,1); }
    else if(k==='ufo'){ if(p._i%4===0) R(f>0.5?'#fff0c8':'#ffc060',X,Y,1,1); }
    else if(k==='pick'||k==='ship'){ }
    else R(c,X,Y,1,1); }); }
SKINS.vector={id:'vector', glow:false, nolight:true, motes:['#2a3444','#3a4a5e','#5a6a8a'], moteDiv:1100,
  ui:HDSK.vector.ui,
  paint:function(p,w,h){ var y, x; for(y=0;y<h;y++) for(x=0;x<w;x++) p.put(x,y,[2,5,4]);
    [[0.28,0.24,18],[0.78,0.3,11]].forEach(function(q){ var cx=q[0]*w, cy=q[1]*h, r=q[2];
      p.ring(cx,cy,r,r,VFAR); p.ring(cx,cy,r*1.7,r*0.34,VFAR,0.25,Math.PI-0.25);
      for(var k=-2;k<=2;k++){ var yy=cy+k*r/3, hw=Math.sqrt(r*r-(k*r/3)*(k*r/3)); p.line(cx-hw,yy,cx+hw,yy,[20,52,42]); } });
    var prev=null; for(x=0;x<=w;x+=6){ var yy=Math.round(hill(x,w,h*0.86,h*0.05,1.7)-Math.abs(Math.sin(x*0.07))*h*0.04); if(prev) p.line(prev[0],prev[1],x,yy,VFAR); prev=[x,yy]; } },
  sky:function(dt,s){ skinSky(this,dt,s); },
  rock:function(r,sz,seed){ return pixRockFrames(r,seed,10,function(p,P,c){ p.poly(P,[8,30,22]); for(var y=0;y<p.h;y++) for(var x=0;x<p.w;x++){ var o=(y*p.w+x)*4; if(p.d[o+3]&&(x-c)+(y-c)<-r*0.25) p.put(x,y,[14,52,40]); }   // v1.29, «В»: glass lit from the top left
      p.path(P,cH('#bfffe6'),true); p.halo(VDIM); P.forEach(function(q){ p.put(q[0],q[1],[255,255,255]); });
      for(var j=0;j<p.d.length;j+=4){ var g=p.d[j+1]; if(p.d[j+3]&&p.d[j]<20&&(g===30||g===52)) p.d[j+3]=110; } }); },   // the glass see-through (the outline is the rock's edge)
  /* v1.29, the ship «Д6» and the saucer «Е3» in pixels, as HD: three strokes with gaps, bright dots at their ends and the nose; the amber
     capsule with gaps, its lights, one running */
  shipPix:function(){ return pixOnce('v-ship129b',25,16,function(p){ var y=8, W=[255,255,255];
      p.line(19,y-1,9,y-5,VPH); p.line(19,y+1,9,y+5,VPH); p.line(5,y-4,8,y-1,VPH); p.line(5,y+4,8,y+1,VPH); p.put(22,y,W); p.halo(VDIM);   // gaps of 2–3 pixels, so the halo doesn't close them
      [[9,y-5],[9,y+5],[5,y-4],[8,y-1],[5,y+4],[8,y+1]].forEach(function(q){ p.put(q[0],q[1],W); }); }); },
  ship:function(x,y,t,blink){ if(blink) return; x=Math.round(x); y=Math.round(y); var fl=Math.floor(t*20)%3;
    lx.drawImage(this.shipPix(),x-2,y-8); if(!shipBare){ R('#1d5a44',x+1,y-1,3,3); R(fl?'#7affc8':'#d8fff0',x+1,y,3,1); } },
  ufoPix:function(big,hurt){ var k=big?0.78:0.56; return pixOnce('v-ufo129b'+big+hurt,26,16,function(p){ var c=13, cy=8, A=hurt?cH('#fff4e0'):VAMB, h=Math.round(3*k), e=big?3:1, r=Math.max(2,Math.round(3*k)), m=big?5:3;
      p.line(c-e,cy-h,c+e,cy-h,A); p.line(c-e,cy+h,c+e,cy+h,A); p.ring(c-m,cy,r,r,A,Math.PI*0.65,Math.PI*1.35); p.ring(c+m,cy,r,r,A,-Math.PI*0.35,Math.PI*0.35); p.halo(VAMBD); }); },
  ufo:function(ux,uy,big,hurt){ ux=Math.round(ux); uy=Math.round(uy); lx.drawImage(this.ufoPix(big,!!hurt),ux-13,uy-8); var n=big?5:3, st=big?2:2, on=Math.floor(clock*8)%n;
    for(var i=0;i<n;i++) R(i===on?'#fff0c8':'#a86a20',ux-(n-1)*st/2+i*st,uy,1,1); },
  pick:function(x,y,type){ x=Math.round(x); y=Math.round(y); var c=pixOnce('v-pick129',13,13,function(p){ var W=[255,255,255];   // v1.29, «Б»: the diamond of four strokes with gaps, dots at its corners
      p.line(7,1,10,4,VPH); p.line(10,8,7,11,VPH); p.line(5,11,2,8,VPH); p.line(2,4,5,1,VPH); p.halo(VDIM); p.put(6,0,W); p.put(12,6,W); p.put(6,12,W); p.put(0,6,W); });
    lx.globalAlpha=0.8+0.2*Math.sin(clock*5); lx.drawImage(c,x-6,y-6); lx.globalAlpha=1; blit(PICONS[type],['#d8fff0'],x-3,y-3); },
  bullet:function(x,y){ x=Math.round(x); y=Math.round(y); R('#1d5a44',x-6,y,2,1); R('#2b8a68',x-4,y,2,1); R('#7affc8',x-2,y,2,1); R('#ffffff',x,y,1,1); R('#2b8a68',x,y-1,1,1); R('#2b8a68',x,y+1,1,1); R('#2b8a68',x+1,y,1,1); },   // v1.29, «В»: a comet
  ebullet:function(x,y){ x=Math.round(x); y=Math.round(y); var c=pixOnce('v-eb129',7,7,function(p){ p.ring(3,3,2,2,VAMB); p.put(3,3,cH('#fff0c8')); p.halo(VAMBD); }); lx.drawImage(c,x-3,y-3); },   // v1.29, «В»: an amber ring with a dot
  shieldRing:function(x,y,t){ var cx=Math.round(x)+8, cy=Math.round(y); for(var i=0;i<14;i++){ var a=i/14*6.2832, w=0.5+0.5*Math.sin(t*6-i*0.9), X=Math.round(cx+Math.cos(a)*12.5), Y=Math.round(cy+Math.sin(a)*10);   // v1.29, «Е»: 14 dots, a wave of light round them
    if(w>0.6){ R('#1d5a44',X-1,Y,3,1); R('#1d5a44',X,Y-1,1,3); R('#d8fff0',X,Y,1,1); } else R(w>0.3?'#7affc8':'#2b6652',X,Y,1,1); } },
  bursts:function(){ return HDSK.vector.bursts(); }, pxParts:function(){ vtPxParts(); },
  shield:function(){ return '#7affc8'; }, mini:function(){ return ['#2a8a6a','#d8fff0']; } };

/* ════════ NEON, pixels: a night sky with a striped sun, a dark range edged in violet drifting by, a magenta grid floor running (8 frames),
   objects as one-pixel neon tubes with a dim glow pixel round them, over dark glass ════════ */
/* v1.28, the neon explosions in pixels (as in HD: crystal shards, a torn-tape flash, a power-up's frame growing, sunset rays) */
function nePxParts(){ spFxTrack(); var i, j, SUN=NEON_SUN;
  SPFX.forEach(function(e){ var t=e.t, x0=Math.round(e.x), y0=Math.round(e.y), R2=srand(e.seed);
    if(e.k==='rock'&&t<0.12){ R('#ffffff',x0-1,y0-1,3,3); R('#f0a8ff',x0-2,y0,1,1); R('#f0a8ff',x0+2,y0,1,1); R('#f0a8ff',x0,y0-2,1,1); R('#f0a8ff',x0,y0+2,1,1); }
    if(e.k==='ufo'){ if(t<0.1) R('#ffffff',x0-2,y0-2,5,5); var al=Math.max(0,1-t/0.45);
      for(i=0;i<7;i++){ var yy=(R2()-0.5)*16*(0.6+t*1.5), w=(4+R2()*12)*(0.6+t*1.8), dx=(R2()-0.5)*32*t; R2(); if(al<=0) continue; lx.globalAlpha=al*0.85; R(i%2?'#3ff7ff':'#ff3f8e',Math.round(x0+dx-w/2+(i%2?1:-1)*t*6),Math.round(y0+yy),Math.max(1,Math.round(w)),1); } lx.globalAlpha=1; }
    if(e.k==='pick'){ var c=(e.cols&&e.cols[1])||'#3ff7ff', v=Math.min(1,t/0.4), q=Math.round(6+v*9);
      if(v<1){ lx.globalAlpha=1-v; R(c,x0-q+1,y0-q,2*q-1,1); R(c,x0-q+1,y0+q,2*q-1,1); R(c,x0-q,y0-q+1,1,2*q-1); R(c,x0+q,y0-q+1,1,2*q-1); lx.globalAlpha=1; }
      if(t<0.6){ lx.globalAlpha=1-t/0.6; for(i=0;i<8;i++){ var a=i/8*6.2832+0.4, d=4+t*20, sx=Math.round(x0+Math.cos(a)*d), sy=Math.round(y0+Math.sin(a)*d-t*6), sc=i%2?'#ffffff':c; R(sc,sx,sy,1,1); if(Math.sin(clock*30+i)>0){ R(sc,sx-1,sy,1,1); R(sc,sx+1,sy,1,1); R(sc,sx,sy-1,1,1); R(sc,sx,sy+1,1,1); } } lx.globalAlpha=1; } }
    if(e.k==='ship'){ if(t<0.12){ R('#ffffff',x0-4,y0,9,1); R('#ffffff',x0,y0-4,1,9); R('#d8fff4',x0-1,y0-1,3,3); }
      var w2=Math.min(1,t/0.35); for(i=0;i<12;i++){ var a2=i/12*6.2832+R2()*0.3, ex=R2(); if(w2>=1) continue; var r0=2+w2*14, r1=r0+(3+ex*4)*(1-w2); lx.globalAlpha=1-w2;
        for(j=r0;j<=r1;j+=1) R(SUN[i%4],Math.round(x0+Math.cos(a2)*j),Math.round(y0+Math.sin(a2)*j),1,1); } lx.globalAlpha=1; } });
  parts.forEach(function(p){ var f=p.life/p.max, k=p._k, c=p.cols[Math.min(p.cols.length-1,Math.floor((1-f)*p.cols.length))], X=Math.round(p.x), Y=Math.round(p.y);
    if(k==='rock'){ if(p._i%3===0&&f>0.2){ R(NEON_SHARD[(p._i>>1)%3],X,Y,2,2); R('#ef9aff',X+((p._i>>2)%2),Y,1,1); } else if(p._i%3===1) R('#f0a8ff',X,Y,1,1); }
    else if(k==='ufo'){ if(p._i%2){ var sz=p._i%4===3&&f>0.4?2:1; R(p._i%4===1?'#ff5ad0':'#ffffff',X,Y,sz,sz); } }
    else if(k==='pick'){ }
    else if(k==='ship'){ if(p._i%2) R(SUN[Math.min(3,Math.floor((1-f)*4))],X,Y,1,1); }
    else R(c,X,Y,1,1); }); }
SKINS.neon={id:'neon', glow:false, nolight:true, motes:['#c9b8ff','#ffc8e8'],
  ui:HDSK.neon.ui,
  skyMake:function(){ var w=LW, h=LH, hz=Math.round(h*0.7), p=new Pix(w,h), R2=srand(12), x, y;
    var top=cHS(['#07031a','#12062c','#1a0838','#2a0a44','#3a0c4a']); for(y=0;y<hz;y++){ var t=y/(hz-1)*4, i=Math.min(3,Math.floor(t)), f=t-i; for(x=0;x<w;x++) p.put(x,y,f>bay(x,y)?top[i+1]:top[i]); }
    for(y=hz;y<h;y++) for(x=0;x<w;x++) p.put(x,y,(y-hz)/(h-hz)>bay(x,y)*0.9+0.3?[7,2,14]:[20,5,36]);
    for(var i=0;i<Math.round(w*hz/220);i++){ var sx=R2()*w, sy=R2()*hz*0.9, z=R2(); p.put(sx,sy,z>0.85?[255,200,232]:z>0.4?[150,130,210]:[80,64,130]); }
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
  rock:function(r,sz,seed){ return pixRockFrames(r,seed,9,function(p,P,c){ var C=[c-r*0.18,c-r*0.14], i, n, lit, best=0, bl=-99;   // v1.28, «Б»: a crystal, as HD
      p.poly(P,[22,6,44]);
      for(i=0;i<P.length;i++){ n=P[(i+1)%P.length]; lit=Math.max(0,(-(P[i][0]+n[0])/2+c-(P[i][1]+n[1])/2+c)/(r*1.4)); p.poly([C,P[i],n],[Math.round(22+lit*80),Math.round(6+lit*22),Math.round(44+lit*90)]);
        if(-P[i][0]-P[i][1]>bl){ bl=-P[i][0]-P[i][1]; best=i; } }
      if(r>5) P.forEach(function(q){ p.line(C[0],C[1],q[0],q[1],[120,64,190]); });
      if(r>6) p.line(P[best][0]*0.7+C[0]*0.3,P[best][1]*0.7+C[1]*0.3,C[0]*0.75+P[best][0]*0.25,C[1]*0.75+P[best][1]*0.25,[255,255,255]);
      var I=P.map(function(q){ var dx=q[0]-c, dy=q[1]-c, d=Math.hypot(dx,dy)||1; return [q[0]-dx/d*1.2,q[1]-dy/d*1.2]; }); p.path(I,cH('#b050e0'),true); p.path(P,cH('#ffc4ff'),true); }); },   // the glow inside, so the tube is the rock's edge
  /* v1.27, the ship «ДВ» in pixels: the delta of dark glass, violet hatching on its top half, sunset stripes on its lower half, a
     turquoise tube and its glow, a pink and a blue flame */
  shipPix:function(){ return pixOnce('n-ship2',25,17,function(p){ var y=8, S=[[21,y],[5,y-7],[7,y-2],[3,y-2],[3,y+2],[7,y+2],[5,y+7]], xx, yy, ST=cHS(['#ffe25a','#ff9a4a','#ff3f8e','#a03ad0']);
      p.poly(S,[8,4,26]);
      var inside=function(px,py){ var ins=false; for(var a=0,b=S.length-1;a<S.length;b=a++){ var xa=S[a][0],ya=S[a][1],xb=S[b][0],yb=S[b][1]; if(((ya>py)!==(yb>py))&&(px<(xb-xa)*(py-ya)/(yb-ya)+xa)) ins=!ins; } return ins; };
      for(yy=y-6;yy<y;yy++) for(xx=4;xx<21;xx++) if(inside(xx+0.5,yy+0.5)&&((xx+yy)%4===0||(xx-yy+40)%4===0)) p.put(xx,yy,[90,42,154]);
      [[y+1,0],[y+3,1],[y+5,2],[y+6,3]].forEach(function(q){ for(xx=3;xx<21;xx++) if(inside(xx+0.5,q[0]+0.5)) p.put(xx,q[0],ST[q[1]]); });
      p.path(S,cH('#7ffbe4'),true); p.line(10,y-1,16,y,cH('#9fefff')); p.halo(cH('#1f9a8a')); }); },   // 21 long with its glow, as HD
  ship:function(x,y,t,blink){ if(blink) return; x=Math.round(x); y=Math.round(y); var fl=Math.floor(t*20)%3;
    if(!shipBare){ R('#ff5ad0',x-2-fl,y-1,4+fl,1); R('#3fb8ff',x-2-fl,y+1,4+fl,1); R('#ffd0f4',x+1,y-1,1,1); R('#d0f0ff',x+1,y+1,1,1); } lx.drawImage(this.shipPix(),x-1,y-8); },
  /* v1.27, the saucer: a mirror-ball dome (facets of lilac and white, one catching the light now and then) on the dark saucer with its pink rim */
  ufoPix:function(big,hurt){ var k=big?0.68:0.48; return pixOnce('n-ufo127'+big+hurt,26,16,function(p){ var c=13, cy=8, col=cH(hurt?'#ffffff':'#ffc8f6'), E=[], i;
      for(i=0;i<24;i++){ var a=i/24*6.2832; E.push([c+Math.cos(a)*10*k,cy+1+Math.sin(a)*3*k]); } p.poly(E,[26,3,22]); p.path(E,col,true);
      var D=[]; for(i=0;i<=10;i++){ var b=Math.PI+i/10*Math.PI; D.push([c+Math.cos(b)*4.8*k,cy-1+Math.sin(b)*4.6*k]); } p.poly(D,[26,3,22]);
      if(!hurt){ var F=cHS(['#8a78d0','#c8b8ff','#ffffff','#a090e0']); for(var yy=Math.round(cy-1-4.6*k)+1;yy<cy-1;yy++) for(var xx=Math.round(c-4.8*k)+1;xx<c+4.8*k;xx++){ var dx=(xx+0.5-c)/(4.8*k), dy=(yy+0.5-(cy-1))/(4.6*k); if(dx*dx+dy*dy<0.85) p.put(xx,yy,F[(xx*3+yy*5)%4]); } }
      p.path(D,cH(hurt?'#ffffff':'#d8c8ff'),false); p.halo(cH('#b0309e')); }); },
  ufo:function(ux,uy,big,hurt){ lx.drawImage(this.ufoPix(big,!!hurt),Math.round(ux)-13,Math.round(uy)-8); var t=performance.now()/1000, i;
    for(i=0;i<5;i++) R((Math.floor(t*6)+i)%2?'#fff27a':'#7affff',Math.round(ux)-(big?6:4)+i*(big?3:2),Math.round(uy)+1,1,1);
    if(!hurt&&Math.sin(t*3)>0.5){ var gx=Math.round(ux+Math.cos(t*1.5)*2.5*(big?1:0.7)), gy=Math.round(uy-3*(big?1:0.7)); R('#ffffff',gx-1,gy,3,1); R('#ffffff',gx,gy-1,1,3); } },
  pick:function(x,y,type){ x=Math.round(x); y=Math.round(y); var col=NEON_PICK[type]||'#ffe66d', dim={shield:'#0e5a64',triple:'#6a4210',slow:'#6a1838',life:'#3a6a10'}[type]||'#6a5a10';   // v1.27: each its own colour, as HD
    var c=pixOnce('n-pick128'+type,13,13,function(p){ p.rect(2,2,9,9,[12,6,26]); p.path([[3,1],[9,1],[11,3],[11,9],[9,11],[3,11],[1,9],[1,3]],cH(col),true); p.halo(cH(dim)); var D=cH(dim), i; for(i=0;i<p.d.length;i+=4) if(p.d[i]===D[0]&&p.d[i+1]===D[1]&&p.d[i+2]===D[2]) p.d[i+3]=110; });   // v1.28 («подарок Б»): the glow half see-through, so it reads 12 wide, not 13
    lx.drawImage(c,x-6,y-6); blit(PICONS[type],[col],x-3,y-3); },
  bullet:function(x,y){ x=Math.round(x); y=Math.round(y); var c=pixOnce('n-sh127',8,7,function(p){ var C=cH('#7ffbe4'); p.line(4,1,6,3,C); p.line(6,3,4,5,C); p.line(1,1,3,3,C); p.line(3,3,1,5,C); p.put(6,3,[255,255,255]); p.halo(cH('#1f6a60')); }); lx.drawImage(c,x-5,y-3); },   // v1.27, «Г»: a double chevron
  ebullet:function(x,y){ x=Math.round(x); y=Math.round(y); var c=pixOnce('n-eb127',8,7,function(p){ p.path([[1,3],[5,1],[5,5]],cH('#ff7a3a'),true); p.put(4,3,[255,220,190]); p.halo(cH('#5a1a08')); }); lx.drawImage(c,x-3,y-3); },   // v1.27, «Г»: an orange-red triangle
  shieldRing:function(x,y,t){ var cx=Math.round(x)+10, cy=Math.round(y), i, a;   // v1.27, «Г»: a turquoise and a pink arc turning opposite ways
    for(i=0;i<=40;i++){ a=t*2+i/40*4.2; R('#7ffbe4',Math.round(cx+Math.cos(a)*12),Math.round(cy+Math.sin(a)*9.5),1,1); }
    for(i=0;i<=30;i++){ a=-t*2.6+i/30*3.6; R('#ff7ae0',Math.round(cx+Math.cos(a)*10.5),Math.round(cy+Math.sin(a)*8),1,1); } },
  bursts:function(){ return HDSK.neon.bursts(); }, pxParts:function(){ nePxParts(); }, shield:function(){ return '#3ff7d0'; }, mini:function(){ return ['#1a8a78','#3ff7d0']; } };

/* ════════ NOTEBOOK, pixels: squared paper with a red margin, pencil doodles drifting behind, one-pixel ballpoint lines; rocks hatched on the
   shadow side, the saucer and the enemy shots in red pen, the power-up coloured with a yellow highlighter ════════ */
var NTINTP=cH('#d0daf2'), NPEN=cH('#1d3fa0'), NPEN2=cH('#6a80c8'), NRED=cH('#a8142c'), NPAPER=cH('#fdfaf0'), NPEN_L=cH('#9aaad8');
/* v1.29, the notebook's explosions in pixels (as in HD: hatched paper scraps, a red ink blot, a comic burst with «+», an eraser smear) */
function nbBurstPix(n){ return pixOnce('nb-burst'+n,25,25,function(p){ var c=12, sc=[0.55,0.8,1][n], S=[], Q=srand(77), i; for(i=0;i<18;i++){ var b=i/18*6.2832, q=(i%2?5:11)*(0.85+0.3*Q())*sc; S.push([c+Math.cos(b)*q,c+Math.sin(b)*q]); }
  p.poly(S,cH('#ffe24a')); p.path(S,cH('#d09000'),true); var Y=cH('#c88a00'); if(n){ p.line(c-2,c,c+2,c,Y); p.line(c,c-2,c,c+2,Y); } else p.put(c,c,Y); }); }
function nbPxParts(){ spFxTrack(); var i;
  SPFX.forEach(function(e){ var t=e.t, x0=Math.round(e.x), y0=Math.round(e.y), R2=srand(e.seed), u, al;
    if(e.k==='ufo'){ u=Math.min(1,t/0.1); al=Math.max(0,1-t/0.8); if(al<=0) return; lx.globalAlpha=al*0.85; lx.fillStyle='#a8142c'; var r0=Math.round(4.5*u);
      for(var yy=-r0;yy<=r0;yy++) for(var xx=-r0;xx<=r0;xx++) if(xx*xx+yy*yy<=r0*r0+1) lx.fillRect(x0+xx,y0+yy,1,1);
      for(i=0;i<10;i++){ var a=R2()*6.2832, d=(3+R2()*10)*u, rr=R2()>0.6?2:1; pxLine(x0+Math.cos(a)*2,y0+Math.sin(a)*2,x0+Math.cos(a)*d*0.8,y0+Math.sin(a)*d*0.8,'#a8142c'); lx.fillRect(Math.round(x0+Math.cos(a)*d),Math.round(y0+Math.sin(a)*d),rr,rr); } lx.globalAlpha=1; }
    if(e.k==='pick'){ al=t<0.35?1:Math.max(0,1-(t-0.35)/0.2); if(al<=0) return; lx.globalAlpha=al; lx.drawImage(nbBurstPix(t<0.05?0:t<0.1?1:2),x0-12,y0-12); lx.globalAlpha=1; }
    if(e.k==='ship'){ al=Math.max(0,1-t/0.6); if(al<=0) return; lx.globalAlpha=al*0.45; for(i=0;i<6;i++){ var w=Math.round(14+R2()*6); R('#9a9aa8',Math.round(x0-w/2+(R2()-0.5)*3),Math.round(y0+(i-2.5)*2.2),w,1); } lx.globalAlpha=1; } });
  parts.forEach(function(p){ var f=p.life/p.max, k=p._k, c=p.cols[Math.min(p.cols.length-1,Math.floor((1-f)*p.cols.length))], X=Math.round(p.x), Y=Math.round(p.y);
    if(k==='rock'){ if(p._i%3===0&&f>0.2){ R('#d0daf2',X,Y,3,2); R('#1d3fa0',X,Y,1,1); R('#1d3fa0',X+2,Y+1,1,1); R('#6a80c8',X+1,Y+1,1,1); } else if(p._i%3===1) R('#1d3fa0',X,Y,1,1); }
    else if(k==='ufo'){ }
    else if(k==='pick'){ if(p._i%3===0) R('#e0a000',X,Y,2,1); }
    else if(k==='ship'){ if(p._i%2===0) R(p._i%4?'#f0a0b0':'#1d3fa0',X,Y,2,1); }
    else R(c,X,Y,1,1); }); }
SKINS.note={id:'note', glow:false, nolight:true, motes:['#9a9aa4'],
  ui:HDSK.note.ui,
  paperMake:function(){ var p=new Pix(LW,LH), x, y, R2=srand(4242), W0=cH('#fdfaf0'), Wd=cH('#f1ece0'), Wl=cH('#fffef8'), BK=cH('#eceaee'), i, k;   // v1.29, as HD: ruled, warm, grain, the back's writing
    for(y=0;y<LH;y++) for(x=0;x<LW;x++){ var a=R2(); p.put(x,y,a<0.025?Wd:a>0.975?Wl:W0); }
    for(k=1;k*10+7<LH;k++){ if(R2()<0.35) continue; y=k*10+7; x=4+Math.floor(R2()*10); while(x<LW-20){ var wl=7+Math.floor(R2()*20); if(x+wl>LW-4) break; for(i=0;i<wl;i++) if(Math.sin(i*1.3+x)>-0.2) p.put(LW-1-(x+i),y+(Math.sin(i*1.9+x)>0.3?-1:0),BK); x+=wl+3+Math.floor(R2()*5); } }
    for(y=12;y<LH;y+=10){ var c=R2()<0.5?cH('#c4d4ec'):cH('#d2def0'); for(x=0;x<LW;x++) p.put(x,y,c); }
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
  rock:function(r,sz,seed){ var R2=srand(seed*57+3), cr=[], dots=[], i; for(i=0;i<2+(r>8?1:0);i++) cr.push([R2()*6.2832,R2()*0.5,0.14+R2()*0.12]); for(i=0;i<Math.round(r*1.2);i++) dots.push([(R2()-0.4)*1.2,(R2()-0.4)*1.2]);   // v1.29, «В», as HD
    return pixRockFrames(r,seed,11,function(p,P,c,rr,f){ p.poly(P,NTINTP); var a0=f/16*6.2832, PALE=cH('#e8eefa');
      for(var y=0;y<p.h;y++) for(var x=0;x<p.w;x++){ var o=(y*p.w+x)*4; if(!p.d[o+3]) continue; var dx=x-c, dy=y-c, sd=dx+dy; if(sd>r*0.2&&(x+y)%3===0) p.put(x,y,NPEN2); if(sd>r*0.65&&(x-y+60)%3===0) p.put(x,y,NPEN2); }   // cross-hatched on the shadow side
      cr.forEach(function(q){ var a=q[0]+a0, X=c+Math.cos(a)*q[1]*r, Y=c+Math.sin(a)*q[1]*r, R0=Math.max(1.2,q[2]*r);
        for(var yy=Math.floor(Y-R0);yy<=Y+R0;yy++) for(var xx=Math.floor(X-R0);xx<=X+R0;xx++) if((xx-X)*(xx-X)+(yy-Y)*(yy-Y)<R0*R0&&(xx+yy)%2===0) p.put(xx,yy,NPEN2);
        p.ring(X,Y,R0,R0,NPEN,Math.PI*0.9,Math.PI*1.9); if(R0>1.8) p.ring(X,Y,R0,R0,PALE,Math.PI*1.95,Math.PI*2.85); });
      dots.forEach(function(d){ var a=Math.atan2(d[1],d[0])+a0, dl=Math.hypot(d[0],d[1])*r; p.put(c+Math.cos(a)*dl,c+Math.sin(a)*dl,NPEN); });
      if(r>6){ p.put(c-r*0.45,c-r*0.45,[255,255,255]); p.put(c-r*0.45+1,c-r*0.45,[255,255,255]); p.put(c-r*0.45+2,c-r*0.45-1,[255,255,255]); }
      p.path(P,NPEN,true); if(r>7) p.path(P.map(function(q,i){ return [q[0]+(i%3===0?1:0),q[1]]; }),NPEN,true); p.path(P,NPEN,true); }); },
  /* v1.29, the ship «Г» in pixels, as HD (21 long): the lower half hatched, a yellow stripe on the upper wing, panel lines, rivets, the
     canopy white and hatched */
  shipPix:function(){ return pixOnce('nb-ship129',26,18,function(p){ var y=9, S=[[23,y],[10,y-7],[5,y-7],[8,y-2],[3,y-2],[3,y+2],[8,y+2],[5,y+7],[10,y+7]], xx, yy, YL=cH('#f2d24a'), W=[255,255,255];
      var inside=function(px,py){ var ins=false; for(var a=0,b=S.length-1;a<S.length;b=a++){ var xa=S[a][0],ya=S[a][1],xb=S[b][0],yb=S[b][1]; if(((ya>py)!==(yb>py))&&(px<(xb-xa)*(py-ya)/(yb-ya)+xa)) ins=!ins; } return ins; };
      p.poly(S,NTINTP);
      for(yy=y-5;yy<=y-4;yy++) for(xx=7;xx<16;xx++) if(inside(xx+0.5,yy+0.5)) p.put(xx,yy,YL);
      for(yy=y+1;yy<=y+7;yy++) for(xx=3;xx<23;xx++) if(inside(xx+0.5,yy+0.5)&&(xx+yy)%2===0) p.put(xx,yy,NPEN2);
      p.line(8,y-2,13,y-2,NPEN2); p.line(8,y+2,13,y+2,NPEN2); p.line(12,y-4,12,y+4,NPEN2);
      p.rect(15,y-1,5,2,W); p.put(16,y,NPEN); p.put(18,y,NPEN); p.put(17,y-1,NPEN2); p.put(19,y-1,NPEN2); p.path([[14,y],[15,y-2],[19,y-2],[21,y-1],[19,y+1],[15,y+1]],NPEN,true);
      [[9,y-5],[11,y+5],[9,y+5]].forEach(function(q){ p.put(q[0],q[1],NPEN); });
      p.path(S,NPEN,true); }); },
  ship:function(x,y,t,blink){ if(blink) return; x=Math.round(x); y=Math.round(y); var fl=Math.floor(t*14)%2;
    lx.drawImage(this.shipPix(),x-2,y-9); lx.fillStyle='#e0701a'; if(!shipBare) for(var i=0;i<5;i++) lx.fillRect(x-1-i,y+((i+fl)%2?1:-1),1,1); },
  /* v1.29, the saucer «Д» in pixels: a belt line, three white windows in the dome, three yellow lights, its shadow hatched below */
  ufoPix:function(big,hurt){ var k=big?0.78:0.56; return pixOnce('nb-ufo129'+big+hurt,26,16,function(p){ var c=13, cy=8, col=hurt?NPEN:NRED, E=[], D=[], i, xx, yy, sh=hurt?NPEN2:cH('#d06a7a');
      for(i=0;i<24;i++){ var a=i/24*6.2832; E.push([c+Math.cos(a)*10*k,cy+1+Math.sin(a)*3*k]); } p.poly(E,NTINTP);
      for(yy=Math.round(cy+2);yy<=cy+1+3*k;yy++) for(xx=Math.round(c-9*k);xx<=c+9*k;xx++) if((xx+yy)%2===0&&((xx-c)*(xx-c)/(81*k*k)+(yy-cy-1)*(yy-cy-1)/(9*k*k))<0.8) p.put(xx,yy,sh);
      for(i=0;i<=10;i++){ var b=Math.PI+i/10*Math.PI; D.push([c+Math.cos(b)*4.5*k,cy-1+Math.sin(b)*4*k]); } p.poly(D,NTINTP);
      if(big){ [-2,0,2].forEach(function(e){ p.put(Math.round(c+e*k),cy-2,[255,255,255]); }); } else p.put(c,cy-2,[255,255,255]);
      p.path(E,col,true); p.path(D,col,false); p.line(Math.round(c-8*k),cy,Math.round(c+8*k),cy,col);
      (big?[-5,0,5]:[-4,4]).forEach(function(e){ p.put(Math.round(c+e*k),cy+2,cH('#f2c21a')); }); }); },
  ufo:function(ux,uy,big,hurt){ lx.drawImage(this.ufoPix(big,!!hurt),Math.round(ux)-13,Math.round(uy)-8); },
  /* v1.29, «Б» in pixels: the sticky note, its glue strip at the top, the lower part lifting a pixel or two in three frames, the corner
     curling and the shadow growing with it */
  pick:function(x,y,type){ x=Math.round(x); y=Math.round(y); var ph={shield:0,triple:1.7,slow:3.1,life:4.4}[type]||0, s=Math.sin(clock*2.3+ph)+0.4*Math.sin(clock*7.1+ph*2), k=s>0.1?1:0;   // two frames: a pixel of lift is «немного»
    var b=11-k, cu=2+k, D=11+b-cu, c=pixOnce('nb-pick129c-'+k,12,12,function(p){ var Y=cH('#ffe766'), G=cH('#f5c932'), F=cH('#f2cf3a'), Dk=cH('#d9b31f'), Sh=cH('#f3d655'), xx, yy;
      for(yy=0;yy<=b;yy++) for(xx=0;xx<12;xx++){ var e=xx+yy; if(e>D) continue;
        var fold=xx>=11-cu&&yy>=b-cu&&e>=D-cu+1, col=yy<2?G:(k&&yy>=b-1?Sh:Y);
        if(fold) col=(xx===11-cu||yy===b-cu)?Dk:F;
        if(yy===0||xx===0||(xx===11&&yy<=b-cu)||(yy===b&&xx<=11-cu)||e===D) col=NPEN; p.put(xx,yy,col); } });
    lx.globalAlpha=0.16+0.08*k; R('#3c3214',x-5+k,y-6+b+1,11-cu+1,1+k); R('#3c3214',x+6,y-5+k,1,b-cu); lx.globalAlpha=1;
    lx.drawImage(c,x-6,y-6); blit(PICONS[type],['#1d3fa0'],x-3,y-3); },
  bullet:function(x,y){ x=Math.round(x); y=Math.round(y); R('#0a1f6a',x-4,y,7,2); },   // v0.85: thicker and darker (his pick «А»)
  ebullet:function(x,y){ x=Math.round(x); y=Math.round(y); var c=pixOnce('nb-eb129b',5,5,function(p){ ['..x..','x.x.x','.xxx.','x.x.x','..x..'].forEach(function(r,j){ for(var i=0;i<5;i++) if(r[i]==='x') p.put(i,j,NRED); }); }); lx.drawImage(c,x-2,y-2); },   // v1.29, «Б»: a red asterisk
  /* v1.29, the shield «Д» in pixels, «Г» of its pixel round (the maintainer: «в пикселях щит некрасиво получился» → «щит в пикселях г»):
     a pale zigzag of 10 teeth with dark tips, drawn once in 4 steps of its creeping (each frame rounded alike, so the teeth stay even) */
  shieldRing:function(x,y,t){ var f=Math.floor(t*4)%4, c=pixOnce('nb-sh129-'+f,40,34,function(p){ var CX=20, CY=17, T=10, P=[], i;
      for(i=0;i<=2*T;i++){ var a=(i+f/2)/(2*T)*6.2832, r=i%2?12:15.5; P.push([CX+Math.cos(a)*r,CY+Math.sin(a)*r*0.8]); }
      for(i=0;i<2*T;i++) p.line(P[i][0],P[i][1],P[i+1][0],P[i+1][1],NPEN2); for(i=0;i<=2*T;i+=2) p.put(P[i][0],P[i][1],NPEN); });
    lx.drawImage(c,Math.round(x)+8-20,Math.round(y)-17); },
  bursts:function(){ return HDSK.note.bursts(); }, pxParts:function(){ nbPxParts(); }, shield:function(){ return '#1d3fa0'; }, mini:function(){ return ['#1d3fa0','#6a80c8']; } };
