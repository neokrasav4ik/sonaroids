/* ── HD GRAPHICS (v0.72, the maintainer: «one switch — super-HD with rich detail, and the pixel art as it is»). In HD the world (the sky, the
   rocks, the ship, the saucer, the power-ups, the shots, the sparks) is drawn smooth on a second canvas at the screen's own resolution
   (up to 2× CSS pixels), under the game-pixel canvas, which then carries only the texts, the buttons and the menus on a transparent
   ground. Coordinates stay in game pixels (the HD canvas is scaled), so the game's logic, sizes and hit circles do not change.
   A skin has HD pictures when HDSK has it; without them the switch keeps the pixel ones. Kept in 'sonaroids_gfx' ('pixel' | 'hd'). ── */
var HDSK={}, gfxMode=(function(){ try{ return localStorage.getItem('sonaroids_gfx')==='hd'?'hd':'pixel'; }catch(e){ return 'pixel'; } })();
var hdCv=null, hx=null, hs=1, hdShown=false, hdKey='', hdD=2, hdPix=false, hdPerf={t:0,n:0,sum:0,skip:2};
function hdSize(){ if(!hdCv){ hdCv=document.createElement('canvas'); hdCv.id='hd';
    hdCv.style.cssText='position:fixed;left:0;top:0;display:none;pointer-events:none;image-rendering:auto'; document.body.insertBefore(hdCv,cv); hx=hdCv.getContext('2d'); }
  var cssW=LW*S/DPR, cssH=LH*S/DPR, d=Math.min(hdD,DPR); hdCv.width=hdTargetW(); hdCv.height=hdPix?LH:Math.round(cssH*d); hdCv.style.width=cssW+'px'; hdCv.style.height=cssH+'px';
  hdCv.style.imageRendering=hdPix?'pixelated':'auto';
  hs=hdCv.width/LW; hdKey=LW+'x'+LH+'x'+hs; hx.setTransform(hs,0,0,hs,0,0); hx.imageSmoothingEnabled=true; hx.imageSmoothingQuality='high'; }
/* v0.74: a skin drawn only as shapes (vector 80s, neon, notebook, green LCD) has no pixel pictures of its own: with «pixels» chosen it is
   drawn on the same canvas at one pixel per game pixel and shown blown up without smoothing — its own pixel look */
function hdTargetW(){ return hdPix?LW:Math.round(LW*S/DPR*Math.min(hdD,DPR)); }
function hdAvail(id){ return !!HDSK[id]; }
function hdOnly(id){ return !!HDSK[id]&&!SKINS[id]; }
function hdWanted(id){ return hdAvail(id)&&(gfxMode==='hd'||!SKINS[id]); }
/* the frame: with an HD picture the pixel canvas is cleared to transparent (the world goes under it) and the HD canvas is shown */
/* the HD canvas keeps up with the phone: if frames come slower than ~45 a second for two seconds, its resolution steps down (2× → 1.5× →
   1× CSS pixels); the game's own pixels and logic are untouched */
function hdPace(){ var now=performance.now(), dt=hdPerf.t?(now-hdPerf.t)/1000:0; hdPerf.t=now; if(dt<=0||dt>0.25){ return; }
  if(hdPerf.skip>0){ hdPerf.skip-=dt; return; } hdPerf.sum+=dt; hdPerf.n++;
  if(hdPerf.sum>=2){ var avg=hdPerf.sum/hdPerf.n; hdPerf.sum=0; hdPerf.n=0;
    if(!hdPix&&avg>1/45&&Math.min(hdD,DPR)>1){ hdD=Math.max(1,Math.min(hdD,DPR)-0.5); hdSize(); hdPerf.skip=2; if(typeof Logs!=='undefined'&&Logs.ev) { Logs.ev('hd: '+Math.round(1/avg)+' fps → '+hdD+'×'); if(Logs.gameEv) Logs.gameEv('hd: '+Math.round(1/avg)+' fps → '+hdD+'×'); } } } }
function hdFrame(on){ if(on){ var px=gfxMode!=='hd'; if(px!==hdPix){ hdPix=px; if(hdCv) hdSize(); } if(!hdCv||hdCv.width!==hdTargetW()) hdSize(); hdPace(); if(!hdShown){ hdCv.style.display='block'; hdShown=true; } lx.clearRect(0,0,LW,LH); hx.setTransform(hs,0,0,hs,0,0); }
  else { hdPerf.t=0; if(hdShown){ hdCv.style.display='none'; hdShown=false; } } }
function setGfx(m){ gfxMode=m==='hd'?'hd':'pixel'; try{ localStorage.setItem('sonaroids_gfx',gfxMode); }catch(e){} setSkin(skinId); resize(); }   // v0.75: the texts and buttons follow the mode

/* ── drawing helpers for the HD canvas (game-pixel coordinates) ── */
/* the background veil (the maintainer: «на hd лучше весь фон немного приглушить, чтобы основные объекты хорошо читались»): drawn last in sky() */
function hdVeil(sk){ if(!sk.veil) return; hx.globalAlpha=1; hx.fillStyle=sk.veil; hx.fillRect(-2,-2,LW+4,LH+4); }
function hGlow(x,y,r,rgb,a){ var ga=hx.globalAlpha; hx.globalAlpha=ga*a; hx.drawImage(glowSprite(rgb),x-r,y-r,2*r,2*r); hx.globalAlpha=ga; }   // a cached glow sprite (a new gradient per glow per frame is too slow on phones)
/* an off-screen canvas of w×h game pixels at the HD scale; ctx works in game pixels */
function hdOff(w,h,sc){ sc=sc||hs; var c=document.createElement('canvas'); c.width=Math.max(1,Math.ceil(w*sc)); c.height=Math.max(1,Math.ceil(h*sc)); var x=c.getContext('2d'); x.setTransform(sc,0,0,sc,0,0); x.imageSmoothingEnabled=true; return {c:c,x:x,w:w,h:h,sc:sc}; }
/* fractal value noise from the game's noise2 (a 16×16 periodic grid): octaves of it */
function fbmOf(n){ return function(x,y,o){ var s=0,a=0.5,f=1,t=0; for(var i=0;i<(o||4);i++){ s+=a*n(x*f,y*f); t+=a; a*=0.5; f*=2.03; } return s/t; }; }
function lerp(a,b,t){ return a+(b-a)*t; }
function mix3(a,b,t){ return [lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)]; }
function clamp01(v){ return v<0?0:v>1?1:v; }
/* a lit relief sprite, pixel by pixel at the HD scale: shape(u,v) → 0…1 inside (soft edge), height(u,v) → relief, colour(u,v,n,light) → [r,g,b] */
function reliefSprite(size,shape,height,shade){ var o=hdOff(size,size), W2=o.c.width, H2=o.c.height, im=o.x.createImageData(W2,H2), d=im.data, e=0.35;
  for(var y=0;y<H2;y++) for(var x=0;x<W2;x++){ var u=(x+0.5)/o.sc-size/2, v=(y+0.5)/o.sc-size/2, a=shape(u,v); if(a<=0) continue;
    var h=height(u,v), hx1=height(u+e,v), hy1=height(u,v+e), nx=-(hx1-h)/e, ny=-(hy1-h)/e, nz=1, nl=Math.sqrt(nx*nx+ny*ny+nz*nz); nx/=nl; ny/=nl; nz/=nl;
    var c=shade(u,v,[nx,ny,nz],h), i=(y*W2+x)*4; d[i]=c[0]; d[i+1]=c[1]; d[i+2]=c[2]; d[i+3]=Math.round(255*clamp01(a)); }
  o.x.putImageData(im,0,0); return o.c; }
var LDIR=(function(){ var l=[-0.55,-0.65,0.52], n=Math.hypot(l[0],l[1],l[2]); return [l[0]/n,l[1]/n,l[2]/n]; })();
function lamb(n){ return Math.max(0,n[0]*LDIR[0]+n[1]*LDIR[1]+n[2]*LDIR[2]); }
/* a rock sprite drawn rotated about its centre */
function hdDrawRock(sp,x,y){ var s=sp.size; hx.save(); hx.translate(x+(sp.ox||0),y); if(sp.vr) hx.rotate(sp.rot/16*6.2832); hx.drawImage(sp.img,-s/2,-s/2,s,s); if(sp.after) sp.after(sp); hx.restore(); }
/* sparks: soft round dots with a little light */
function hdParts(){ if(SK&&SK.parts){ SK.parts(); return; } parts.forEach(function(p){ var f=p.life/p.max, c=p.cols[Math.min(p.cols.length-1,Math.floor((1-f)*p.cols.length))]; hx.globalAlpha=Math.min(1,f*1.6); hx.fillStyle=c; hx.beginPath(); hx.arc(p.x,p.y,0.45+f*0.7,0,6.2832); hx.fill(); }); hx.globalAlpha=1; }

/* ════════ SPACE HD (v0.72, style «A3 + outline», chosen by the maintainer: drawn, not photographic): a soft cartoon — every object has a
   dark ink outline, three-tone shading with soft steps, a cool rim light on its shadow side; nebulae of soft layered clouds with swirls,
   far galaxies and little planets baked into a wide sheet; a big ringed planet with a storm and a moon drifting slower; a comet now and
   then; crisp stars and twinkling sparkles; asteroids drawn live (the light stays top-left while they turn) with craters, a crack, grain;
   a glossy teal fighter with a flickering flame, a violet saucer with running lights, glowing shots ════════ */
var INK='#1b1233';
function inkSmooth(c,p){ var n=p.length; c.beginPath(); for(var i=0;i<n;i++){ var a=p[i], b=p[(i+1)%n], mx=(a[0]+b[0])/2, my=(a[1]+b[1])/2;
    if(i===0){ var z=p[n-1]; c.moveTo((z[0]+a[0])/2,(z[1]+a[1])/2); } c.quadraticCurveTo(a[0],a[1],mx,my); } c.closePath(); }
function blobPts(cx,cy,rx,ry,R2,n){ var p=[]; n=n||12; for(var i=0;i<n;i++){ var a=i/n*6.2832, k=0.72+R2()*0.46; p.push([cx+Math.cos(a)*rx*k,cy+Math.sin(a)*ry*k]); } return p; }
function sparkleAt(c,x,y,r,col){ c.fillStyle=col; c.beginPath(); c.moveTo(x,y-r); c.quadraticCurveTo(x,y,x+r,y); c.quadraticCurveTo(x,y,x,y+r); c.quadraticCurveTo(x,y,x-r,y); c.quadraticCurveTo(x,y,x,y-r); c.fill(); }
HDSK.space={id:'space', hd:true, glow:true, veil:'rgba(10,8,30,0.55)', motes:['#cdc8f5','#b4befa','#becdff','#96f0ff'],
  /* the wide sheet (twice the screen, wrapping): gradient, nebula clouds, swirls, dust, far galaxies, little planets */
  bgMake:function(){ var w=LW*2, h=LH, o=hdOff(w,h,Math.min(hs,2)), x=o.x, R2=srand(21), i;
    var gr=x.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#131943'); gr.addColorStop(0.55,'#1f1a4e'); gr.addColorStop(1,'#2e174c'); x.fillStyle=gr; x.fillRect(0,0,w,h);
    var wrap=function(cx,r,fn){ fn(cx); if(cx-r<0) fn(cx+w); if(cx+r>w) fn(cx-w); };
    // nebulae: three clusters of soft clouds, each cloud a gradient lit from the top left, pale cores, a few swirl lines
    [[0.18,0.34,['#7a4fd0','#2c2a78'],['#b25cc8','#4a2a88'],['#ffb0e0','#9a4ab8']],
     [0.55,0.72,['#3f6ad8','#1e2a70'],['#5a9ae8','#2a3a88'],['#b8f0ff','#4a7ac8']],
     [0.86,0.4,['#a04ac0','#3a1a6a'],['#e06ab0','#6a2a88'],['#ffd0a8','#c05a90']]].forEach(function(q){
      var cx0=q[0]*w, cy0=q[1]*h, W0=w*0.13, H0=h*0.2;
      for(var k=0;k<7;k++){ var cx=cx0+(R2()-0.5)*W0*1.6, cy=cy0+(R2()-0.5)*H0*1.2, rx=W0*(0.35+R2()*0.45), ry=H0*(0.3+R2()*0.35), pal=k<4?q[2]:q[3], pts=blobPts(0,0,rx,ry,R2,12);
        wrap(cx,rx*1.3,function(px){ x.save(); x.translate(px,cy); x.globalAlpha=0.5; var g2=x.createRadialGradient(-rx*0.3,-ry*0.4,1,0,0,Math.max(rx,ry)); g2.addColorStop(0,pal[0]); g2.addColorStop(1,pal[1]); x.fillStyle=g2; inkSmooth(x,pts); x.fill(); x.restore(); }); }
      for(k=0;k<2;k++){ var ccx=cx0+(R2()-0.5)*W0*0.6, ccy=cy0+(R2()-0.5)*H0*0.4, crx=W0*(0.2+R2()*0.15), cry=H0*(0.12+R2()*0.08), cp=blobPts(0,0,crx,cry,R2,10);
        wrap(ccx,crx*1.3,function(px){ x.save(); x.translate(px,ccy); x.globalAlpha=0.42; var g3=x.createRadialGradient(-crx*0.3,-cry*0.3,0.5,0,0,crx); g3.addColorStop(0,q[4][0]); g3.addColorStop(1,q[4][1]); x.fillStyle=g3; inkSmooth(x,cp); x.fill(); x.restore(); }); }
      x.strokeStyle='rgba(220,190,255,0.28)'; x.lineWidth=0.7; x.lineCap='round';
      for(k=0;k<3;k++){ var sx=cx0-W0*0.8+R2()*W0*0.6, sy=cy0+(R2()-0.5)*H0*0.8, L=W0*(0.8+R2()*0.8);
        wrap(sx+L/2,L,function(px){ var a0=px-L/2; x.beginPath(); x.moveTo(a0,sy); x.bezierCurveTo(a0+L*0.3,sy-10,a0+L*0.6,sy+12,a0+L,sy-2); x.stroke(); }); } });
    // dust: tiny dots in three tints
    for(i=0;i<Math.round(w*h/110);i++){ var z=R2(); x.fillStyle=z>0.85?'rgba(255,240,200,0.7)':z>0.5?'rgba(190,180,255,0.45)':'rgba(120,110,200,0.4)'; x.beginPath(); x.arc(R2()*w,R2()*h,0.2+z*0.35,0,6.2832); x.fill(); }
    // two far spiral galaxies
    [[0.4,0.16,1],[0.95,0.8,0.7]].forEach(function(gq){ var gx=gq[0]*w, gy=gq[1]*h, sc=gq[2];
      wrap(gx,14,function(px){ x.save(); x.translate(px,gy); x.rotate(-0.4); x.scale(sc,0.45*sc); x.lineCap='round';
        for(var a=0;a<2;a++){ x.strokeStyle=a?'rgba(255,200,240,0.5)':'rgba(160,200,255,0.5)'; x.lineWidth=1.1; x.beginPath(); for(var t=0;t<9;t+=0.2){ var rr=t*1.3; x.lineTo(Math.cos(t+a*3.14)*rr,Math.sin(t+a*3.14)*rr); } x.stroke(); }
        var gg=x.createRadialGradient(0,0,0,0,0,4); gg.addColorStop(0,'#fff6d8'); gg.addColorStop(1,'rgba(255,230,200,0)'); x.fillStyle=gg; x.beginPath(); x.arc(0,0,4,0,6.2832); x.fill(); x.restore(); }); });
    // little far planets: flat, a soft shade, a thin ink line
    [[0.08,0.8,4,'#7fd0c8','#2f6a80'],[0.66,0.22,3,'#f0a0b8','#8a3a70'],[0.3,0.9,2.4,'#c8b8ff','#5a4aa0']].forEach(function(pq){ var qx=pq[0]*w, qy=pq[1]*h, r=pq[2];
      wrap(qx,r,function(px){ var pg=x.createRadialGradient(px-r*0.4,qy-r*0.4,r*0.2,px,qy,r); pg.addColorStop(0,pq[3]); pg.addColorStop(1,pq[4]); x.fillStyle=pg; x.beginPath(); x.arc(px,qy,r,0,6.2832); x.fill();
        x.strokeStyle='rgba(20,16,50,0.45)'; x.lineWidth=0.4; x.stroke(); }); });
    return o.c; },
  /* the big ringed planet with a storm and a moon — its own sprite, drifting slower than the sheet */
  planetMake:function(){ var o=hdOff(120,80), x=o.x, px=58, py=42, pr=22;
    var ring=function(a0,a1){ x.lineWidth=3.6; x.strokeStyle='#5a3a30'; x.beginPath(); x.ellipse(px,py,pr*1.7,pr*0.42,-0.2,a0,a1); x.stroke();
      x.lineWidth=2.4; x.strokeStyle='#b88a58'; x.stroke(); x.lineWidth=1.3; x.strokeStyle='#ffe3b0'; x.stroke(); x.lineWidth=0.35; x.strokeStyle='rgba(120,80,40,0.7)'; x.beginPath(); x.ellipse(px,py,pr*1.62,pr*0.38,-0.2,a0,a1); x.stroke(); };
    ring(Math.PI+0.1,2*Math.PI-0.1);
    x.save(); x.beginPath(); x.arc(px,py,pr,0,6.2832); x.clip(); x.fillStyle='#f0b46a'; x.fillRect(px-pr,py-pr,2*pr,2*pr);
    x.fillStyle='#d98a4a'; [[-12,5],[-2,3],[8,6],[15,3]].forEach(function(b){ x.beginPath(); x.ellipse(px,py+b[0],pr+3,b[1]/2,-0.2,0,6.2832); x.fill(); });
    x.fillStyle='#f6c890'; [[-7,1.4],[3,1.2]].forEach(function(b){ x.beginPath(); x.ellipse(px,py+b[0],pr+3,b[1]/2,-0.2,0,6.2832); x.fill(); });
    x.fillStyle='#e8a060'; x.beginPath(); x.ellipse(px+6,py+4,4,2,-0.2,0,6.2832); x.fill(); x.fillStyle='#b06a3a'; x.beginPath(); x.ellipse(px+6,py+4.4,2.6,1.1,-0.2,0,6.2832); x.fill();
    var sh=x.createRadialGradient(px-9,py-9,pr*0.7,px-9,py-9,pr*1.35); sh.addColorStop(0,'rgba(50,20,80,0)'); sh.addColorStop(0.35,'rgba(50,20,80,0.55)'); sh.addColorStop(1,'rgba(30,10,60,0.8)'); x.fillStyle=sh; x.fillRect(px-pr,py-pr,2*pr,2*pr);
    x.strokeStyle='rgba(120,230,255,0.8)'; x.lineWidth=1.2; x.beginPath(); x.arc(px,py,pr-0.6,-0.2,1.9); x.stroke(); x.restore();
    x.fillStyle='rgba(255,250,230,0.85)'; x.beginPath(); x.ellipse(px-9,py-11,5,2.2,-0.7,0,6.2832); x.fill();
    x.strokeStyle='#6a3a3a'; x.lineWidth=0.7; x.beginPath(); x.arc(px,py,pr,0,6.2832); x.stroke(); ring(0.1,Math.PI-0.1);
    var mx=px+42, my=py-26, mr=5; var mg=x.createRadialGradient(mx-2,my-2,0.5,mx,my,mr); mg.addColorStop(0,'#e0e8ff'); mg.addColorStop(0.6,'#a8b4f0'); mg.addColorStop(1,'#5a60a8'); x.fillStyle=mg; x.beginPath(); x.arc(mx,my,mr,0,6.2832); x.fill();
    x.fillStyle='rgba(70,70,140,0.6)'; [[1,1,1.2],[-1.6,1.8,0.8],[1.8,-1.2,0.6]].forEach(function(c){ x.beginPath(); x.arc(mx+c[0],my+c[1],c[2],0,6.2832); x.fill(); });
    x.strokeStyle='#3a3a78'; x.lineWidth=0.5; x.beginPath(); x.arc(mx,my,mr,0,6.2832); x.stroke();
    return o.c; },
  cometMake:function(){ var o=hdOff(70,14), x=o.x; x.save(); x.translate(64,7);
    [['#3c4f9a',9],['#5f83d8',6],['#a8d4ff',3]].forEach(function(b){ x.fillStyle=b[0]; x.beginPath(); x.moveTo(0,-b[1]/2); x.quadraticCurveTo(-30,-b[1]/3,-62,0); x.quadraticCurveTo(-30,b[1]/3,0,b[1]/2); x.fill(); });
    x.fillStyle='#e8f6ff'; x.beginPath(); x.arc(0,0,2.6,0,6.2832); x.fill(); x.strokeStyle='#3c4f9a'; x.lineWidth=0.7; x.stroke(); x.restore(); return o.c; },
  sky:function(dt,s){ var me=this, t=performance.now()/1000, i;
    if(!this._bg||this._bgKey!==hdKey){ this._bg=this.bgMake(); this._planet=this.planetMake(); this._comet=this.cometMake(); this._bgKey=hdKey; this._x=this._x||0; this._px=this._px||0;
      var R2=srand(5); this._stars=[]; for(i=0;i<Math.round(LW*LH/1000);i++){ var z=0.3+R2()*0.7; this._stars.push({x:R2()*LW,y:R2()*LH,z:z,c:R2()>0.7?1:R2()>0.4?2:0}); }
      this._spk=[]; for(i=0;i<Math.max(4,Math.round(LW*LH/16000));i++) this._spk.push({x:R2()*LW,y:R2()*LH,r:1.4+R2()*1.4,tw:R2()*6,c:i%3?0:1});   // few, small, dim: stars must not pull the eye
      this._dots=['205,200,245','180,190,250','140,130,210'].map(function(rgb){ var d=hdOff(2,2), dx=d.x; dx.fillStyle='rgb('+rgb+')'; dx.beginPath(); dx.arc(1,1,0.9,0,6.2832); dx.fill(); return d.c; });
      this._spS=['190,205,255','150,240,255'].map(function(rgb){ var d=hdOff(12,12), dx=d.x; var g=dx.createRadialGradient(6,6,0,6,6,6); g.addColorStop(0,'rgba('+rgb+',0.18)'); g.addColorStop(1,'rgba('+rgb+',0)'); dx.fillStyle=g; dx.fillRect(0,0,12,12);
        sparkleAt(dx,6,6,3.4,'rgba('+rgb+',0.6)'); return d.c; });
      this._cT=6; }
    this._x=(this._x+2*K*dt*s)%(LW*2); this._px=(this._px+0.9*K*dt*s)%(LW+130);
    hx.drawImage(this._bg,-this._x,0,LW*2,LH); hx.drawImage(this._bg,LW*2-this._x,0,LW*2,LH);
    hx.drawImage(this._planet,LW*0.6-this._px+130,LH*0.02,120,80);
    // a comet every half a minute or so, crossing high up
    this._cT-=dt*s; if(this._cT<0){ if(!this._cm) this._cm={x:LW+70,y:LH*(0.08+Math.random()*0.25)}; this._cm.x-=26*K*dt*s; this._cm.y+=6*K*dt*s;
      hx.save(); hx.translate(this._cm.x,this._cm.y); hx.rotate(Math.atan2(6,-26)+Math.PI); hx.drawImage(this._comet,-64,-7,70,14); hx.restore();
      if(this._cm.x<-80){ this._cm=null; this._cT=22+Math.random()*16; } }
    this._stars.forEach(function(st){ st.x-=(3+st.z*st.z*30)*K*dt*s; if(st.x<-2){ st.x+=LW+4; st.y=Math.random()*LH; } var r=0.3+st.z*0.4; hx.globalAlpha=0.35+0.4*st.z; hx.drawImage(me._dots[st.c],st.x-r,st.y-r,2*r,2*r); }); hx.globalAlpha=1;
    this._spk.forEach(function(p){ p.x-=12*K*dt*s; if(p.x<-6){ p.x+=LW+12; p.y=Math.random()*LH; } var k=0.8+0.2*Math.sin(t*1.6+p.tw), r=p.r*1.8*k; hx.drawImage(me._spS[p.c],p.x-r,p.y-r,2*r,2*r); }); hdVeil(this); },
  /* asteroids, drawn live: the outline and the craters turn, the light stays */
  rock:function(r,sz,seed){ var R2=srand(seed*977+13), pts=[], cr=[], gr=[], n=12, i;
    for(i=0;i<n;i++){ var a=i/n*6.2832+R2()*0.25; pts.push([a,0.8+R2()*0.3]); }
    for(i=0;i<2+(r>7?2:0)+(r>11?1:0);i++) cr.push([R2()*6.2832,R2()*0.55,0.12+R2()*0.14]);
    for(i=0;i<Math.round(r*1.6);i++) gr.push([R2()*6.2832,Math.sqrt(R2())*0.8]);
    return {r:r,pts:pts,cr:cr,gr:gr,crack:r>8?R2()*6.2832:null,size:r*2.6,rot:R2()*16,vr:(R2()-0.5)*6,hd:true}; },
  drawRock:function(sp,x,y){ var r=sp.r, a0=sp.rot/16*6.2832, P=sp.pts.map(function(p){ return [Math.cos(p[0]+a0)*r*p[1],Math.sin(p[0]+a0)*r*p[1]]; });
    hx.save(); hx.translate(x+(sp.ox||0),y);
    if(!sp._g||sp._gc!==hx){ var g=hx.createLinearGradient(-r,-r,r,r); g.addColorStop(0,'#ecd6e0'); g.addColorStop(0.42,'#c4a6c0'); g.addColorStop(0.58,'#9a7eae'); g.addColorStop(1,'#6a5690'); sp._g=g; sp._gc=hx; }
    inkSmooth(hx,P); hx.fillStyle=sp._g; hx.fill();
    hx.save(); inkSmooth(hx,P); hx.clip();
    hx.strokeStyle='rgba(130,210,255,0.75)'; hx.lineWidth=Math.max(0.5,r*0.13); inkSmooth(hx,P.map(function(q){ return [q[0]-r*0.08,q[1]-r*0.08]; })); hx.stroke();      // the rim light, shadow side
    sp.cr.forEach(function(c){ var ca=c[0]+a0, cx=Math.cos(ca)*c[1]*r, cy=Math.sin(ca)*c[1]*r, rr=c[2]*r;
      hx.fillStyle='rgba(84,62,108,0.9)'; hx.beginPath(); hx.ellipse(cx,cy,rr,rr*0.88,0,0,6.2832); hx.fill();                                  // a pit: the floor, the rim's shadow on it, a lit far lip
      hx.fillStyle='rgba(46,30,70,0.9)'; hx.beginPath(); hx.ellipse(cx-rr*0.22,cy-rr*0.2,rr*0.72,rr*0.6,0,0,6.2832); hx.fill();
      hx.strokeStyle='rgba(222,196,215,0.6)'; hx.lineWidth=Math.max(0.25,rr*0.18); hx.beginPath(); hx.ellipse(cx,cy,rr,rr*0.88,0,0.35,1.25); hx.stroke(); });
    if(sp.crack!==null){ var ka=sp.crack+a0, c1=Math.cos(ka), s1=Math.sin(ka); hx.strokeStyle='rgba(40,26,60,0.8)'; hx.lineWidth=Math.max(0.3,r*0.05); hx.lineJoin='round';
      hx.beginPath(); hx.moveTo(c1*r*0.95,s1*r*0.95); hx.lineTo(c1*r*0.55-s1*r*0.1,s1*r*0.55+c1*r*0.1); hx.lineTo(c1*r*0.3+s1*r*0.05,s1*r*0.3-c1*r*0.05); hx.stroke(); }
    hx.fillStyle='rgba(60,40,80,0.45)'; sp.gr.forEach(function(g2){ var ga=g2[0]+a0; hx.fillRect(Math.cos(ga)*g2[1]*r,Math.sin(ga)*g2[1]*r,Math.max(0.3,r*0.05),Math.max(0.3,r*0.05)); });
    hx.fillStyle='rgba(255,236,246,0.8)'; hx.beginPath(); hx.ellipse(-r*0.38,-r*0.42,r*0.27,r*0.13,-0.6,0,6.2832); hx.fill();
    hx.restore(); inkSmooth(hx,P); hx.strokeStyle='#4a3868'; hx.lineJoin='round'; hx.lineWidth=Math.max(0.55,r*0.065); hx.stroke(); hx.restore(); },
  /* the fighter: a cached sprite (glossy hull, panel lines, canopy, ink), a live flame */
  shipMake:function(){ var o=hdOff(24,14), x=o.x; x.translate(1,7);
    var hull=function(){ x.beginPath(); x.moveTo(20,0); x.bezierCurveTo(15,-2.2,10,-3,7,-6); x.lineTo(3,-6); x.lineTo(5,-2); x.lineTo(1.5,-1.6); x.lineTo(1.5,1.6); x.lineTo(5,2); x.lineTo(3,6); x.lineTo(7,6); x.bezierCurveTo(10,3,15,2.2,20,0); x.closePath(); };
    hull(); var hg=x.createLinearGradient(0,-6,0,6); hg.addColorStop(0,'#b4ffe8'); hg.addColorStop(0.4,'#4fd6b4'); hg.addColorStop(0.62,'#2a9a86'); hg.addColorStop(1,'#1a6a60'); x.fillStyle=hg; x.fill();
    x.strokeStyle='rgba(255,255,255,0.85)'; x.lineWidth=0.5; x.lineCap='round'; x.beginPath(); x.moveTo(7.5,-4.6); x.quadraticCurveTo(12,-2.6,18,-0.6); x.stroke();
    x.strokeStyle='rgba(20,80,72,0.7)'; x.lineWidth=0.3; x.beginPath(); x.moveTo(6,-3.4); x.lineTo(10.5,-1.6); x.moveTo(6,3.4); x.lineTo(10.5,1.6); x.moveTo(3.5,-0.9); x.lineTo(8,-0.9); x.moveTo(3.5,0.9); x.lineTo(8,0.9); x.stroke();
    x.fillStyle='#145048'; [[7,-1.8],[7,1.8],[17.4,0]].forEach(function(p){ x.beginPath(); x.arc(p[0],p[1],0.3,0,6.2832); x.fill(); });
    x.fillStyle='#ffcf3a'; x.fillRect(4.4,-5.3,1.8,0.7); x.fillRect(4.4,4.6,1.8,0.7);
    x.strokeStyle='#0c4a40'; x.lineWidth=0.6; x.lineJoin='round'; hull(); x.stroke();
    var cg=x.createLinearGradient(11,-2,15,1); cg.addColorStop(0,'#ffffff'); cg.addColorStop(0.35,'#9ff0ff'); cg.addColorStop(1,'#2a78a8'); x.fillStyle=cg; x.beginPath(); x.ellipse(13.2,-0.5,3.3,1.4,0,0,6.2832); x.fill(); x.lineWidth=0.45; x.stroke();
    x.fillStyle='#ffffff'; x.beginPath(); x.ellipse(12.4,-1,1.1,0.35,-0.2,0,6.2832); x.fill();
    return o.c; },
  ship:function(x,y,t,blink){ if(blink) return; if(!this._ship||this._shipKey!==hdKey){ this._ship=this.shipMake(); this._shipKey=hdKey; }
    var fl=0.8+0.2*Math.sin(t*40)+0.1*Math.sin(t*23);
    hGlow(x,y,7,'255,170,100',0.6);
    hx.fillStyle='#ff8a3c'; hx.beginPath(); hx.moveTo(x+1.5,y-1.7); hx.quadraticCurveTo(x-9*fl,y,x+1.5,y+1.7); hx.fill();
    hx.fillStyle='#ffd070'; hx.beginPath(); hx.moveTo(x+1.5,y-1.1); hx.quadraticCurveTo(x-6*fl,y,x+1.5,y+1.1); hx.fill();
    hx.fillStyle='#fff8e0'; hx.beginPath(); hx.moveTo(x+1.5,y-0.55); hx.quadraticCurveTo(x-2.5*fl,y,x+1.5,y+0.55); hx.fill();
    hx.drawImage(this._ship,x-1,y-7,24,14);
    if(Math.floor(t*3)%2){ hGlow(x+5.2,y-5.7,1.8,'255,90,90',0.9); hGlow(x+5.2,y+5.7,1.8,'120,255,170',0.9); } light(x-2,y,9*K,'255,184,107',0.4); },
  ufo:function(ux,uy,big,hurt){ var k=big?1:0.72, t=performance.now()/1000, H=hurt?'#ffffff':null;
    hGlow(ux,uy,16*k,hurt?'255,255,255':'200,140,255',0.3); hx.save(); hx.translate(ux,uy); hx.scale(k,k); hx.lineJoin='round';
    hx.beginPath(); hx.ellipse(0,-1.6,4.6,4.4,0,Math.PI,0); hx.closePath(); var dg=hx.createLinearGradient(-3,-6,3,0); dg.addColorStop(0,'#ffffff'); dg.addColorStop(1,'#7fcfff'); hx.fillStyle=H||dg; hx.fill(); hx.strokeStyle='#5a1a78'; hx.lineWidth=0.6; hx.stroke();
    hx.fillStyle='rgba(255,255,255,0.9)'; hx.beginPath(); hx.ellipse(-1.8,-3.7,1.2,0.5,-0.5,0,6.2832); hx.fill();
    hx.beginPath(); hx.ellipse(0,0.6,10,3,0,0,6.2832); var bg=hx.createLinearGradient(0,-2.4,0,3.6); bg.addColorStop(0,'#fcd2ff'); bg.addColorStop(0.5,'#e08af0'); bg.addColorStop(1,'#9a4ac0'); hx.fillStyle=H||bg; hx.fill(); hx.stroke();
    hx.strokeStyle='rgba(255,220,255,0.7)'; hx.lineWidth=0.4; hx.beginPath(); hx.ellipse(0,0.2,8.6,2,0,Math.PI*1.1,Math.PI*1.9); hx.stroke();
    for(var i=0;i<6;i++){ var a=i/6*6.2832+t*3, lx2=Math.cos(a)*7.2, ly=1+Math.sin(a)*1.2; if(Math.sin(a)>-0.15){ hx.fillStyle=i%2?'#ffe66d':'#7affc8'; hx.beginPath(); hx.arc(lx2,ly,0.75,0,6.2832); hx.fill(); } }
    hx.restore(); light(ux,uy,(big?22:16)*K,'180,140,255',0.35); },
  pick:function(x,y,type){ var t=performance.now()/1000, p=0.8+0.2*Math.sin(t*4);
    hGlow(x,y,11,'255,220,100',0.45*p); hx.save(); hx.translate(x,y); hx.rotate(Math.sin(t*1.5)*0.12);
    if(!this._pg||this._pgc!==hx){ var kg=hx.createLinearGradient(0,-6,0,6); kg.addColorStop(0,'#fff0a0'); kg.addColorStop(0.5,'#ffc933'); kg.addColorStop(1,'#c88a10'); this._pg=kg; this._pgc=hx; }
    hx.fillStyle=this._pg; hx.beginPath(); hx.roundRect(-5.5,-5.5,11,11,2.5); hx.fill(); hx.strokeStyle='#8a5000'; hx.lineWidth=0.6; hx.stroke();
    hx.fillStyle='rgba(255,255,255,0.7)'; hx.beginPath(); hx.roundRect(-4.2,-4.4,6,1,0.5); hx.fill();
    hdIcon(type,'#5a3000'); hx.restore(); light(x,y,14*K,'255,230,109',0.35); },
  bullet:function(x,y){ hGlow(x,y,4,'255,180,90',0.4); hx.fillStyle='#ffb13b'; hx.beginPath(); hx.roundRect(x-4,y-1,6.5,2,1); hx.fill(); hx.strokeStyle='#b05a10'; hx.lineWidth=0.4; hx.stroke();
    hx.fillStyle='#fff8e0'; hx.beginPath(); hx.roundRect(x-1.5,y-0.5,3.5,1,0.5); hx.fill(); light(x,y,6*K,'255,184,107',0.35); },
  ebullet:function(x,y){ hGlow(x,y,4.5,'255,70,140',0.4); hx.fillStyle='#ff5a9a'; hx.beginPath(); hx.arc(x,y,1.9,0,6.2832); hx.fill(); hx.strokeStyle='#b0306a'; hx.lineWidth=0.4; hx.stroke();
    hx.fillStyle='#ffe0ec'; hx.beginPath(); hx.arc(x-0.4,y-0.4,0.7,0,6.2832); hx.fill(); light(x,y,7*K,'255,122,160',0.5); },
  bursts:function(){ return {rock:['#fff1c9','#cfb0c0','#9a7a98','#6e5480'],ufo:['#ffffff','#f0a8ff','#b04ad0'],ship:['#b4ffe8','#4fd6b4','#ffb13b','#ff7a7a'],pick:['#fff0a0','#ffc933']}; },
  shield:function(){ return P.pick; }, mini:function(){ return [P.ship[1],P.ship[2]]; },
  shieldRing:function(x,y,t){ var p=0.85+0.15*Math.sin(t*5); hx.fillStyle='rgba(140,230,255,'+0.12*p+')'; hx.beginPath(); hx.ellipse(x+8,y,12.5,10,0,0,6.2832); hx.fill();
    hx.strokeStyle='rgba(150,240,255,'+0.85*p+')'; hx.lineWidth=0.8; hx.stroke(); hx.strokeStyle='rgba(255,255,255,0.8)'; hx.lineWidth=0.6; hx.beginPath(); hx.ellipse(x+8,y,10.5,8,0,Math.PI*1.1,Math.PI*1.45); hx.stroke(); } };
/* the power-up icons as smooth shapes (shield, triple shot, slow motion, life), 7×7 game pixels, centred */
function hdIcon(type,col){ hx.fillStyle=col; hx.strokeStyle=col; hx.lineWidth=0.9; hx.lineCap='round'; hx.lineJoin='round';
  if(type==='shield'){ hx.beginPath(); hx.moveTo(0,-3.3); hx.lineTo(2.8,-2.2); hx.quadraticCurveTo(2.8,1.8,0,3.4); hx.quadraticCurveTo(-2.8,1.8,-2.8,-2.2); hx.closePath(); hx.stroke(); hx.beginPath(); hx.arc(0,-0.2,1,0,6.2832); hx.fill(); }
  else if(type==='triple'){ hx.beginPath(); hx.moveTo(-3,0); hx.lineTo(3,0); hx.moveTo(-1,0); hx.lineTo(3,-2.8); hx.moveTo(-1,0); hx.lineTo(3,2.8); hx.stroke(); }
  else if(type==='slow'){ hx.beginPath(); hx.moveTo(-2.6,-3); hx.lineTo(2.6,-3); hx.lineTo(-2.6,3); hx.lineTo(2.6,3); hx.closePath(); hx.stroke(); hx.beginPath(); hx.moveTo(-1.2,2.2); hx.lineTo(1.2,2.2); hx.lineTo(0,0.8); hx.fill(); }
  else { hx.beginPath(); hx.moveTo(0,3); hx.bezierCurveTo(-4,0,-2.6,-3.6,0,-1.4); hx.bezierCurveTo(2.6,-3.6,4,0,0,3); hx.fill(); } }

/* ════════ FAIRY HD: a bright day — a sun with slow rays, far blue mountains, a castle with flags that wave, round trees, a flowery meadow,
   soft volumetric clouds on two layers; storm clouds with relief, a dark belly, grumpy faces and flickering lightning; a little dragon
   whose wings flap, with scales, horns and a sparkling trail; a flapping bat; spinning gold coins; fireballs with flames ════════ */
HDSK.fairy={id:'fairy', hd:true, glow:false, ink:'#2d2350', veil:'rgba(238,242,255,0.5)', motes:['#ffffff'],
  _layers:null,
  /* a cartoon cloud (v0.72 style «A3 + outline»): a union of puffs with an outline (ink for the storm clouds, a soft blue line for the sky's
     own), a base tone, a shaded belly, lit tops per puff */
  cloudSprite:function(w,seed,dark){ var h=w*0.55, R2=srand(seed), puffs=[], i, S2=w*1.1;
    for(i=0;i<9;i++){ var px=(-0.38+0.76*R2())*w, py=(0.02+0.16*R2())*h, pr=(0.13+0.13*R2())*w*(1-Math.abs(px)/w*0.8); puffs.push([px,py,pr]); }
    puffs.push([0,-0.05*h,0.24*w]);
    var ow=dark?Math.max(0.5,w*0.018):Math.max(0.4,w*0.01), line=dark?'#4a3a8a':'rgba(120,150,215,0.7)';
    var base=dark?'#9a90d8':'#eef5ff', low=dark?'#5c4ea0':'#bcd0f0', top=dark?'#dcd6ff':'#ffffff';
    var ring=hdOff(S2,S2), body=hdOff(S2,S2), c=S2/2;
    ring.x.strokeStyle=line; ring.x.lineWidth=ow*2; puffs.forEach(function(q){ ring.x.beginPath(); ring.x.arc(c+q[0],c+q[1],q[2],0,6.2832); ring.x.stroke(); });
    var bx=body.x; bx.fillStyle=base; puffs.forEach(function(q){ bx.beginPath(); bx.arc(c+q[0],c+q[1],q[2],0,6.2832); bx.fill(); });
    bx.globalCompositeOperation='source-atop';
    var bg=bx.createLinearGradient(0,c-h*0.1,0,c+h*0.4); bg.addColorStop(0,dark?'rgba(92,78,160,0)':'rgba(188,208,240,0)'); bg.addColorStop(0.45,low); bg.addColorStop(1,low); bx.fillStyle=bg; bx.fillRect(0,0,S2,S2);   // the belly
    bx.fillStyle=top; puffs.forEach(function(q){ bx.beginPath(); bx.arc(c+q[0]-q[2]*0.22,c+q[1]-q[2]*0.28,q[2]*0.68,0,6.2832); bx.fill(); });                          // lit tops
    bx.fillStyle=dark?'rgba(255,255,255,0.45)':'rgba(255,255,255,0.9)'; puffs.slice(-3).forEach(function(q){ bx.beginPath(); bx.ellipse(c+q[0]-q[2]*0.4,c+q[1]-q[2]*0.5,q[2]*0.25,q[2]*0.12,-0.5,0,6.2832); bx.fill(); });
    ring.x.setTransform(1,0,0,1,0,0); ring.x.drawImage(body.c,0,0); return ring.c; },
  bgMake:function(){ var w=LW*2, h=LH, o=hdOff(w,h), x=o.x, R2=srand(3), i;
    var gr=x.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#3aa0f0'); gr.addColorStop(0.45,'#86ccff'); gr.addColorStop(0.8,'#cfe9ff'); gr.addColorStop(1,'#ffe6f2'); x.fillStyle=gr; x.fillRect(0,0,w,h);
    // far mountains (bluish, with snow caps), wrapping round the sheet
    var mnt=function(base,amp,col,snow,seed2){ x.fillStyle=col; x.beginPath(); x.moveTo(0,h); var pts=[]; for(var xx=0;xx<=w;xx+=2){ var a=6.2832*xx/w, yy=base-amp*(0.55+0.45*Math.sin(a*5+seed2))*(0.6+0.4*Math.abs(Math.sin(a*11+seed2*2))); pts.push([xx,yy]); x.lineTo(xx,yy); } x.lineTo(w,h); x.fill();
      if(snow){ x.fillStyle='rgba(255,255,255,0.75)'; pts.forEach(function(p,j){ if(j%2===0&&p[1]<base-amp*0.72){ x.beginPath(); x.moveTo(p[0]-3,p[1]+3); x.lineTo(p[0],p[1]); x.lineTo(p[0]+3,p[1]+3); x.fill(); } }); } };
    mnt(h*0.72,h*0.34,'#a9c6ee',true,1); mnt(h*0.8,h*0.2,'#9ab8e6',false,2.2);
    // the castle, twice round the sheet
    [w*0.28,w*0.78].forEach(function(cx){ var base=h*0.83, c1='#c4b4ee', c2='#a996e0', rf='#f39ac8', rf2='#d8629e';
      x.fillStyle=c1; x.fillRect(cx-22,base-22,52,26); for(i=0;i<52;i+=5) x.fillRect(cx-22+i,base-25,3,3);
      [[-28,10,40],[-5,12,52],[25,10,36]].forEach(function(tw){ var tx=cx+tw[0], th=tw[2]; var tg=x.createLinearGradient(tx,0,tx+tw[1],0); tg.addColorStop(0,c1); tg.addColorStop(1,c2); x.fillStyle=tg; x.fillRect(tx,base-th,tw[1],th+4);
        var rg=x.createLinearGradient(tx,0,tx+tw[1],0); rg.addColorStop(0,rf); rg.addColorStop(1,rf2); x.fillStyle=rg; x.beginPath(); x.moveTo(tx-2,base-th); x.lineTo(tx+tw[1]/2,base-th-18); x.lineTo(tx+tw[1]+2,base-th); x.fill();
        x.fillStyle='#6a5aa8'; for(var wy=base-th+8;wy<base-4;wy+=10){ x.beginPath(); x.roundRect(tx+tw[1]/2-1.5,wy,3,4.5,[1.5,1.5,0,0]); x.fill(); x.fillStyle='rgba(255,230,140,0.8)'; x.fillRect(tx+tw[1]/2-1,wy+1.5,2,2.5); x.fillStyle='#6a5aa8'; } });
      x.fillStyle='#7a6ab8'; x.beginPath(); x.roundRect(cx-2,base-10,8,14,[4,4,0,0]); x.fill(); });
    // round trees along the hills
    for(i=0;i<22;i++){ var tx2=R2()*w, ty=h*(0.86+R2()*0.06), tr=3+R2()*3.5; x.fillStyle='#7a5a3a'; x.fillRect(tx2-0.6,ty,1.2,tr*0.9); var tg2=x.createRadialGradient(tx2-tr*0.4,ty-tr*0.5,tr*0.2,tx2,ty-tr*0.2,tr*1.1); tg2.addColorStop(0,'#9fef7a'); tg2.addColorStop(0.6,'#4fbf55'); tg2.addColorStop(1,'#2a8a44'); x.fillStyle=tg2; x.beginPath(); x.arc(tx2,ty-tr*0.3,tr,0,6.2832); x.fill(); }
    // the meadow with flowers
    var mg=x.createLinearGradient(0,h*0.88,0,h); mg.addColorStop(0,'#aef08e'); mg.addColorStop(1,'#62c050'); x.fillStyle=mg; x.beginPath(); x.moveTo(0,h); for(var xx=0;xx<=w;xx+=2){ var a=6.2832*xx/w; x.lineTo(xx,h*0.93-3*Math.sin(a*9+1)-1.5*Math.sin(a*23)); } x.lineTo(w,h); x.fill();
    for(i=0;i<Math.round(w/3);i++){ var fx2=R2()*w, fy=h*(0.94+R2()*0.06); x.fillStyle=['#ffffff','#ffd23f','#ff8fc8','#b98cff'][i%4]; x.beginPath(); x.arc(fx2,fy,0.55,0,6.2832); x.fill(); }
    return o.c; },
  sky:function(dt,s){ var me=this;
    if(!this._bg||this._bgKey!==hdKey){ this._bg=this.bgMake(); this._bgKey=hdKey; this._x=0; this._clouds=[]; var R2=srand(8);
      for(var i=0;i<9;i++){ var far=i<5, w=far?30+R2()*25:45+R2()*30; this._clouds.push({img:this.cloudSprite(w,i*7+1,false),w:w*1.1,x:R2()*LW*1.4,y:LH*(0.04+R2()*(far?0.45:0.55)),v:far?4:9,a:far?0.85:1}); }
      this._spark=[]; for(i=0;i<40;i++) this._spark.push({x:R2()*LW,y:R2()*LH*0.85,tw:R2()*6}); }
    var t=performance.now()/1000; this._x=(this._x+2.5*K*dt*s)%(LW*2);
    hx.drawImage(this._bg,-this._x,0,LW*2,LH); hx.drawImage(this._bg,LW*2-this._x,0,LW*2,LH);
    var sx=LW*0.84, sy=LH*0.14; if(!this._rays||this._raysKey!==hdKey){ var ro=hdOff(140,140); for(var k=0;k<14;k++){ ro.x.save(); ro.x.translate(70,70); ro.x.rotate(k*6.2832/14); var rg=ro.x.createLinearGradient(0,0,70,0); rg.addColorStop(0,'rgba(255,250,210,0.35)'); rg.addColorStop(1,'rgba(255,250,210,0)'); ro.x.fillStyle=rg; ro.x.beginPath(); ro.x.moveTo(0,0); ro.x.lineTo(70,-6); ro.x.lineTo(70,6); ro.x.fill(); ro.x.restore(); } this._rays=ro.c; this._raysKey=hdKey; }
    hx.save(); hx.translate(sx,sy); hx.rotate(t*0.05); hx.drawImage(this._rays,-70,-70,140,140); hx.restore();
    hGlow(sx,sy,30,'255,248,210',0.8); var sg=hx.createRadialGradient(sx-3,sy-3,1,sx,sy,11); sg.addColorStop(0,'#ffffff'); sg.addColorStop(1,'#fff0a0'); hx.fillStyle=sg; hx.beginPath(); hx.arc(sx,sy,11,0,6.2832); hx.fill();
    this._clouds.forEach(function(c){ c.x-=c.v*K*dt*s; if(c.x<-c.w) c.x+=LW+c.w*2; hx.globalAlpha=c.a; hx.drawImage(c.img,c.x-c.w/2,c.y-c.w/2,c.w,c.w); });
    hx.globalAlpha=1; this._spark.forEach(function(p){ var a=0.5+0.5*Math.sin(t*3+p.tw); if(a>0.7){ hGlow(p.x,p.y,2.2,'255,255,255',a-0.5); } }); hdVeil(this); },
  rock:function(r,sz,seed){ var w=r*2.3, img=this.cloudSprite(w,seed*13+5,true); return {img:img,size:w*1.1,rot:0,vr:0,hd:true,big:sz===0,r:r,seed:seed,
      after:function(sp){ if(!sp.big) return; var r2=sp.r, t=performance.now()/1000;                                                      // the face and the lightning, drawn live
        hx.fillStyle='#2d2350'; [-0.3,0.26].forEach(function(ex){ hx.beginPath(); hx.ellipse(ex*r2,0.12*r2,0.1*r2,0.14*r2,0,0,6.2832); hx.fill(); });
        hx.fillStyle='#ffffff'; [-0.3,0.26].forEach(function(ex){ hx.beginPath(); hx.arc(ex*r2-0.03*r2,0.07*r2,0.035*r2,0,6.2832); hx.fill(); });
        hx.strokeStyle='#2d2350'; hx.lineWidth=0.08*r2; hx.lineCap='round'; hx.beginPath(); hx.moveTo(-0.46*r2,-0.1*r2); hx.lineTo(-0.16*r2,-0.02*r2); hx.moveTo(0.42*r2,-0.1*r2); hx.lineTo(0.12*r2,-0.02*r2); hx.stroke();
        hx.beginPath(); hx.arc(0,0.52*r2,0.16*r2,Math.PI*1.15,Math.PI*1.85); hx.stroke();
        if(Math.sin(t*2.7+sp.seed)>0.55){ hGlow(0,0.9*r2,0.5*r2,'255,240,150',0.8); hx.fillStyle='#fff3a0'; hx.beginPath(); hx.moveTo(0.05*r2,0.62*r2); hx.lineTo(-0.16*r2,0.95*r2); hx.lineTo(0,0.93*r2); hx.lineTo(-0.1*r2,1.22*r2); hx.lineTo(0.18*r2,0.86*r2); hx.lineTo(0.03*r2,0.88*r2); hx.closePath(); hx.fill(); } } }; },
  drawRock:hdDrawRock,
  ship:function(x,y,t,blink){ if(blink) return; var fl=Math.sin(t*14);
    for(var i=0;i<9;i++){ var a=1-i/9; hGlow(x-3-i*2.2,y+3+Math.sin(t*10+i)*1.2,1.4*a+0.6,'255,'+(210-i*8)+',120',0.7*a); }
    hx.save(); hx.translate(x,y);
    // the far wing, the tail, the body, the near wing
    var wingD=function(side){ hx.save(); hx.translate(6,-1.5); hx.scale(1,side*(0.35+0.65*Math.abs(fl))); var wg=hx.createLinearGradient(0,0,-6,-9); wg.addColorStop(0,side>0?'#b8307e':'#7a2060'); wg.addColorStop(1,side>0?'#ff9ad6':'#c86aa8'); hx.fillStyle=wg;
      hx.beginPath(); hx.moveTo(0,0); hx.quadraticCurveTo(-3,-6,-8,-8.5); hx.quadraticCurveTo(-6,-5.5,-7,-3.5); hx.quadraticCurveTo(-4.5,-3.2,-4.5,-1.2); hx.quadraticCurveTo(-2.4,-1.2,-1.5,0.4); hx.closePath(); hx.fill(); hx.save(); hx.strokeStyle='#8a2a6a'; hx.lineWidth=0.4; hx.lineJoin='round'; hx.stroke(); hx.restore();
      hx.strokeStyle='rgba(140,30,90,0.55)'; hx.lineWidth=0.3; hx.beginPath(); hx.moveTo(0,0); hx.lineTo(-8,-8.5); hx.moveTo(-1,0); hx.lineTo(-7,-3.5); hx.moveTo(-0.5,0.2); hx.lineTo(-4.5,-1.2); hx.stroke(); hx.restore(); };
    wingD(-1);
    var bg2=hx.createLinearGradient(0,-5,0,5); bg2.addColorStop(0,'#8ff0b8'); bg2.addColorStop(0.45,'#188050'); bg2.addColorStop(1,'#073a24'); hx.fillStyle=bg2;
    hx.beginPath(); hx.moveTo(1,1); hx.quadraticCurveTo(-5,1.5,-7,5.5+fl*0.8); hx.quadraticCurveTo(-3,3.6,2,3.4); hx.fill(); hx.strokeStyle='#145a3a'; hx.lineWidth=0.45; hx.lineJoin='round'; hx.stroke();                                   // tail
    hx.fillStyle='#ff8a5a'; hx.beginPath(); hx.moveTo(-7,5.5+fl*0.8); hx.lineTo(-9,4.6); hx.lineTo(-8.2,6.8); hx.fill();
    hx.fillStyle=bg2; hx.beginPath(); hx.ellipse(6.5,0.6,6.4,3.8,-0.08,0,6.2832); hx.fill(); hx.strokeStyle='#145a3a'; hx.lineWidth=0.45; hx.stroke();                                                                         // body
    hx.fillStyle='#fff3b0'; hx.beginPath(); hx.ellipse(6.5,2.4,4.6,1.5,-0.08,0,6.2832); hx.fill(); hx.strokeStyle='rgba(200,150,60,0.5)'; hx.lineWidth=0.25; for(var b=3;b<10;b+=1.6){ hx.beginPath(); hx.moveTo(b,1.4); hx.lineTo(b-0.3,3.4); hx.stroke(); }
    hx.fillStyle='#ffd23f'; for(var sp=1;sp<11;sp+=2){ hx.beginPath(); hx.moveTo(sp,-2.8+Math.abs(sp-6)*0.12); hx.lineTo(sp+0.8,-4.3+Math.abs(sp-6)*0.12); hx.lineTo(sp+1.6,-2.8+Math.abs(sp-6)*0.12); hx.fill(); }      // spine
    hx.fillStyle='#1c7a50'; [[4,4],[8.5,4]].forEach(function(l){ hx.beginPath(); hx.roundRect(l[0],l[1],1.4,2.4,0.6); hx.fill(); });
    hx.fillStyle=bg2; hx.beginPath(); hx.ellipse(14,-2.6,4.2,3.4,0.25,0,6.2832); hx.fill(); hx.strokeStyle='#145a3a'; hx.lineWidth=0.45; hx.stroke(); hx.fillStyle=bg2; hx.beginPath(); hx.ellipse(10.6,-0.8,2.2,2.2,0,0,6.2832); hx.fill();                                                                           // head
    hx.fillStyle='#ffd23f'; hx.beginPath(); hx.moveTo(12.4,-5.2); hx.quadraticCurveTo(11,-8.6,10.2,-9); hx.quadraticCurveTo(12.4,-7.6,13.6,-5.6); hx.fill(); hx.beginPath(); hx.moveTo(14.6,-5.6); hx.quadraticCurveTo(14.8,-9,14.2,-9.6); hx.quadraticCurveTo(16,-8,15.8,-5.4); hx.fill();
    hx.fillStyle='#ff9a6a'; hx.beginPath(); hx.ellipse(17.6,-1.6,1.7,1.3,0.2,0,6.2832); hx.fill(); hx.fillStyle='#7a2a10'; hx.beginPath(); hx.arc(18.6,-2,0.3,0,6.2832); hx.fill();
    hx.fillStyle='#ffffff'; hx.beginPath(); hx.ellipse(14.8,-3.3,1.5,1.7,0,0,6.2832); hx.fill(); hx.fillStyle='#1a1a2a'; hx.beginPath(); hx.arc(15.3,-3.1,0.85,0,6.2832); hx.fill(); hx.fillStyle='#ffffff'; hx.beginPath(); hx.arc(15.6,-3.5,0.3,0,6.2832); hx.fill();
    hx.fillStyle='rgba(255,120,160,0.45)'; hx.beginPath(); hx.ellipse(15.6,-0.8,1.2,0.6,0,0,6.2832); hx.fill();
    wingD(1); hx.restore(); },
  ufo:function(ux,uy,big,hurt){ var k=big?1:0.72, t=performance.now()/1000, f=Math.sin(t*16);
    hx.save(); hx.translate(ux,uy); hx.scale(k,k); var col=hurt?'#ffffff':null;
    [-1,1].forEach(function(s){ hx.save(); hx.scale(s,0.55+0.45*Math.abs(f)); var wg=hx.createLinearGradient(0,-6,0,4); wg.addColorStop(0,'#a07ae8'); wg.addColorStop(1,'#3a2066'); hx.fillStyle=col||wg;
      hx.beginPath(); hx.moveTo(1.5,-1); hx.quadraticCurveTo(6,-7,12,-5); hx.quadraticCurveTo(10.5,-2,11.5,1.5); hx.quadraticCurveTo(9,0,7.5,2.5); hx.quadraticCurveTo(5.5,0.6,3.5,2.8); hx.quadraticCurveTo(2.5,1,1.5,2); hx.closePath(); hx.fill(); hx.save(); hx.strokeStyle='#1a0a30'; hx.lineWidth=0.6; hx.lineJoin='round'; hx.stroke(); hx.restore();
      hx.strokeStyle='rgba(30,10,60,0.6)'; hx.lineWidth=0.3; hx.beginPath(); hx.moveTo(1.5,-0.5); hx.lineTo(11.5,1.5); hx.moveTo(2,0); hx.lineTo(7.5,2.5); hx.stroke(); hx.restore(); });
    var bd=hx.createRadialGradient(-0.8,-1.2,0.3,0,0,3.4); bd.addColorStop(0,'#8a66cc'); bd.addColorStop(1,'#2a1450'); hx.fillStyle=col||bd; hx.beginPath(); hx.ellipse(0,0.6,2.6,3.3,0,0,6.2832); hx.fill(); hx.strokeStyle='#1a0a30'; hx.lineWidth=0.6; hx.stroke(); hx.fillStyle=col||bd;
    hx.beginPath(); hx.moveTo(-1.8,-1.8); hx.lineTo(-2.4,-4); hx.lineTo(-0.8,-2.4); hx.moveTo(1.8,-1.8); hx.lineTo(2.4,-4); hx.lineTo(0.8,-2.4); hx.fill();
    if(!hurt){ hGlow(-0.9,0,1.5,'255,220,80',0.9); hGlow(0.9,0,1.5,'255,220,80',0.9); hx.fillStyle='#ffffff'; hx.beginPath(); hx.moveTo(-0.6,2.4); hx.lineTo(-0.3,3.2); hx.lineTo(0,2.4); hx.moveTo(0.3,2.4); hx.lineTo(0.6,3.2); hx.lineTo(0.9,2.4); hx.fill(); }
    hx.restore(); },
  pick:function(x,y,type){ var t=performance.now()/1000, sc=Math.cos(t*3.2), w=Math.max(0.12,Math.abs(sc));
    hGlow(x,y,10,'255,215,90',0.45); hx.save(); hx.translate(x,y); hx.scale(w,1);
    var cg=hx.createRadialGradient(-2,-2.5,0.5,0,0,6.6); cg.addColorStop(0,'#fffbe0'); cg.addColorStop(0.4,'#ffc233'); cg.addColorStop(0.68,'#c87a08'); cg.addColorStop(1,sc>0?'#6a3000':'#4a2000'); hx.fillStyle=cg; hx.beginPath(); hx.arc(0,0,6.2,0,6.2832); hx.fill();
    hx.strokeStyle='#8a5200'; hx.lineWidth=0.6; hx.stroke(); hx.beginPath(); hx.arc(0,0,4.6,0,6.2832); hx.strokeStyle='rgba(138,82,0,0.6)'; hx.stroke();
    if(sc>0) hdIcon(type,'#9a5a00'); hx.restore();
    if(Math.sin(t*5)>0.6){ hx.fillStyle='#ffffff'; hx.beginPath(); hx.moveTo(x+4,y-6.5); hx.lineTo(x+4.4,y-5.2); hx.lineTo(x+5.7,y-4.8); hx.lineTo(x+4.4,y-4.4); hx.lineTo(x+4,y-3.1); hx.lineTo(x+3.6,y-4.4); hx.lineTo(x+2.3,y-4.8); hx.lineTo(x+3.6,y-5.2); hx.fill(); } },
  bullet:function(x,y){ var t=performance.now()/1000;
    for(var i=1;i<5;i++){ hGlow(x-i*1.5,y+Math.sin(t*30+i+x)*0.5,1.8-i*0.3,'255,'+(140+i*15)+',40',0.6-i*0.12); }
    hGlow(x,y,3.6,'255,120,30',0.4); var f=hx.createRadialGradient(x+0.6,y-0.3,0.2,x,y,2.4); f.addColorStop(0,'#ffffff'); f.addColorStop(0.3,'#fff0a0'); f.addColorStop(0.55,'#ff8a18'); f.addColorStop(0.8,'#c42a00'); f.addColorStop(1,'#7a1400'); hx.fillStyle=f; hx.beginPath(); hx.ellipse(x,y,2.6,1.8,0,0,6.2832); hx.fill(); hx.strokeStyle='#6a1000'; hx.lineWidth=0.45; hx.stroke(); },
  ebullet:function(x,y){ var t=performance.now()/1000; hGlow(x,y,4.5,'255,40,150',0.35); var og=hx.createRadialGradient(x-0.5,y-0.5,0.2,x,y,2); og.addColorStop(0,'#ff8ad8'); og.addColorStop(0.3,'#a01a88'); og.addColorStop(1,'#3a0640'); hx.fillStyle=og; hx.beginPath(); hx.arc(x,y,2,0,6.2832); hx.fill(); hx.strokeStyle='#ff9ae0'; hx.lineWidth=0.3; hx.stroke(); hx.fillStyle='#ffffff'; hx.beginPath(); hx.arc(x-0.3,y-0.3,0.7,0,6.2832); hx.fill();
    hx.strokeStyle='rgba(255,180,230,0.9)'; hx.lineWidth=0.35; hx.beginPath(); for(var i=0;i<4;i++){ var a=t*6+i*1.57; hx.moveTo(x+Math.cos(a)*1.6,y+Math.sin(a)*1.6); hx.lineTo(x+Math.cos(a)*3,y+Math.sin(a)*3); } hx.stroke(); },
  bursts:function(){ return {rock:['#ffffff','#eeeaff','#a9a2d6','#5f5596'],ufo:['#e0c8ff','#8f6ad0','#4a2d7a'],ship:['#8ff0b8','#36b878','#ffd23f','#ff8a5a'],pick:['#fff6c8','#ffc233','#ffffff']}; },
  shield:function(){ return '#ffd23f'; }, mini:function(){ return ['#1f8a5a','#3fc486']; },
  shieldRing:function(x,y,t){ for(var i=0;i<10;i++){ var a=i/10*6.2832+t*1.8; hGlow(x+8+Math.cos(a)*12,y+Math.sin(a)*9.5,1.6,'255,220,90',0.9); } } };

/* the readability audit of the HD pictures (tests/skin_audit.js with HD=1, v0.73): each HD object drawn alone on a transparent canvas at
   the HD scale, the sky (with its veil) at one game pixel per pixel; the clock is held at 0 so spinning things face the viewer */
function hdIds(){ return Object.keys(HDSK); }
function hdProbe(id){ var sk=HDSK[id], out={}, keep=hx, pn=performance.now; if(!hdCv) hdSize(); noLight=true; performance.now=function(){ return 0; };
  function grab(w,h,sc,fn){ var c=document.createElement('canvas'); c.width=Math.ceil(w*sc); c.height=Math.ceil(h*sc); hx=c.getContext('2d'); hx.setTransform(sc,0,0,sc,0,0); hx.imageSmoothingEnabled=true;
    try{ fn(); } finally { hx=keep; } return {w:c.width,h:c.height,d:Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data)}; }
  try{
    var bg=grab(LW,LH,1,function(){ sk.sky(0,0); }); out.bg=bg.d; out.bgW=bg.w; out.bgH=bg.h;
    out.motes=sk.motes||[]; out.shotsByShape=sk.shotsByShape||'';
    out.rocks=[0,1,2].map(function(sz){ var r=Math.max(3,Math.round(Core.R_SIZE[sz]*K)), sp=sk.rock(r,sz,sz*17+3); return grab(r*3.2,r*3.2,hs,function(){ sk.drawRock(sp,r*1.6,r*1.6); }); });
    out.ship=grab(48,28,hs,function(){ sk.ship(16,14,0.3,false); });
    out.ufo=grab(36,22,hs,function(){ sk.ufo(18,11,true,false); });
    out.ufoS=grab(30,18,hs,function(){ sk.ufo(15,9,false,false); });
    out.pick=grab(28,28,hs,function(){ sk.pick(14,14,'shield'); });
    out.bullet=grab(16,8,hs,function(){ sk.bullet(10,4); });
    out.ebullet=grab(12,12,hs,function(){ sk.ebullet(6,6); });
  } finally { performance.now=pn; noLight=false; lights=[]; }
  return out; }
