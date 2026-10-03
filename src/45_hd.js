/* ── HD GRAPHICS (v0.72, the maintainer: «one switch — super-HD with rich detail, and the pixel art as it is»). In HD the world (the sky, the
   rocks, the ship, the saucer, the power-ups, the shots, the sparks) is drawn smooth on a second canvas at the screen's own resolution
   (up to 2× CSS pixels), under the game-pixel canvas, which then carries only the texts, the buttons and the menus on a transparent
   ground. Coordinates stay in game pixels (the HD canvas is scaled), so the game's logic, sizes and hit circles do not change.
   A skin has HD pictures when HDSK has it; without them the switch keeps the pixel ones. Kept in 'sonaroids_gfx' ('pixel' | 'hd'). ── */
var HDSK={}, gfxMode=(function(){ try{ return localStorage.getItem('sonaroids_gfx')==='pixel'?'pixel':'hd'; }catch(e){ return 'hd'; } })();   // v0.78: HD unless the player chose pixels (the maintainer: HD by default on the first start)
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
/* full: smooth whatever the switch says (SonaRace is drawn in HD only, v0.84) */
function hdFrame(on,full){ if(on){ var px=!full&&gfxMode!=='hd'; if(px!==hdPix){ hdPix=px; if(hdCv) hdSize(); } if(!hdCv||hdCv.width!==hdTargetW()) hdSize(); hdPace(); if(!hdShown){ hdCv.style.display='block'; hdShown=true; } lx.clearRect(0,0,LW,LH); hx.setTransform(hs,0,0,hs,0,0); }
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
function hdDrawRock(sp,x,y){ var s=sp.size; hx.save(); hx.translate(x+(sp.ox||0),y+(sp.oy||0)); if(sp.vr) hx.rotate(sp.rot/16*6.2832); hx.drawImage(sp.img,-s/2,-s/2,s,s); if(sp.after) sp.after(sp); hx.restore(); }
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
HDSK.space={id:'space', hd:true, glow:true, veil:'rgba(10,8,30,0.55)', motes:['#ffecd6','#f5dec8','#bea0aa','#ffe8c8','#ffd6aa'],   // v1.27: the stars warm (were lilac and cyan), so the blue plasma shots are not taken for them
 
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
      this._dots=['255,236,214','245,222,200','190,160,170'].map(function(rgb){ var d=hdOff(2,2), dx=d.x; dx.fillStyle='rgb('+rgb+')'; dx.beginPath(); dx.arc(1,1,0.9,0,6.2832); dx.fill(); return d.c; });
      this._spS=['255,232,200','255,214,170'].map(function(rgb){ var d=hdOff(12,12), dx=d.x; var g=dx.createRadialGradient(6,6,0,6,6,6); g.addColorStop(0,'rgba('+rgb+',0.18)'); g.addColorStop(1,'rgba('+rgb+',0)'); dx.fillStyle=g; dx.fillRect(0,0,12,12);
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
  /* v1.27, the asteroids «Б + лава» (the maintainer: «камень Б (не темнее), лава в кратерах (некоторых) и немного трещин»): a lumpy lilac
     rock with strata, many craters (some full of glowing lava), crumbs, a thin lava crack or two with embers; lit from the top left with a
     soft shadow on the far side, a warm rim and a shine. What turns with the rock (its surface, its lava) is two cached pictures turned
     as it spins; the light, the rim, the shine and the ink outline stay, drawn live round the turned outline. The lava pulses slowly. */
  rock:function(r,sz,seed){ var R2=srand(seed*977+13), pts=[], cr=[], gr=[], ck=[], em=[], n=18, i, k;
    for(i=0;i<n;i++){ var a=i/n*6.2832+R2()*0.25; pts.push([a,0.8+R2()*0.3+(R2()-0.5)*0.12]); }
    var nC=3+(r>7?3:0)+(r>11?3:0); for(i=0;i<nC;i++){ var ca=R2()*6.2832, cd=Math.sqrt(R2())*0.6; cr.push([Math.cos(ca)*cd,Math.sin(ca)*cd,0.1+R2()*0.15,i%3===1]); }
    for(i=0;i<Math.round(r*1.2);i++){ var ga=R2()*6.2832, gd=Math.sqrt(R2())*0.85; gr.push([Math.cos(ga)*gd,Math.sin(ga)*gd]); }
    var nK=r>12?2:1; for(i=0;i<nK;i++){ var ka=R2()*6.2832, px=Math.cos(ka)*1.1, py=Math.sin(ka)*1.1, L=[[px,py]]; for(k=0;k<5;k++){ px+=-px*0.25+(R2()-0.5)*0.35; py+=-py*0.25+(R2()-0.5)*0.35; L.push([px,py]); } ck.push(L); }
    for(i=0;i<Math.max(1,Math.round(r*0.25));i++){ var ea=R2()*6.2832, ed=Math.sqrt(R2())*0.75; em.push([Math.cos(ea)*ed,Math.sin(ea)*ed,R2()*6]); }
    return {r:r,pts:pts,cr:cr,gr:gr,ck:ck,em:em,size:r*2.6,rot:R2()*16,vr:(R2()-0.5)*6,ph:R2()*6,hd:true}; },
  rockMake:function(sp){ var r=sp.r, S=Math.ceil(r*2.5)+2, o=hdOff(S,S), x=o.x, l=hdOff(S,S), lx2=l.x, P=sp.pts.map(function(p){ return [Math.cos(p[0])*r*p[1],Math.sin(p[0])*r*p[1]]; }), k;
    x.translate(S/2,S/2); lx2.translate(S/2,S/2); x.lineJoin=lx2.lineJoin='round'; x.lineCap=lx2.lineCap='round';
    inkSmooth(x,P); x.fillStyle='#b898bc'; x.fill(); x.save(); inkSmooth(x,P); x.clip();
    x.strokeStyle='rgba(110,80,130,0.22)'; x.lineWidth=Math.max(0.3,r*0.05); for(k=-2;k<=2;k++){ x.beginPath(); x.ellipse(r*0.2,k*r*0.32,r*1.4,r*0.5,-0.35,Math.PI*0.9,Math.PI*1.9); x.stroke(); }
    sp.cr.forEach(function(c){ var cx=c[0]*r, cy=c[1]*r, rr=c[2]*r; x.fillStyle='rgba(96,70,120,0.85)'; x.beginPath(); x.ellipse(cx,cy,rr,rr*0.88,0,0,6.2832); x.fill();
      if(!c[3]){ x.fillStyle='rgba(46,30,70,0.85)'; x.beginPath(); x.ellipse(cx-rr*0.22,cy-rr*0.2,rr*0.72,rr*0.6,0,0,6.2832); x.fill(); }
      x.strokeStyle='rgba(240,215,232,0.7)'; x.lineWidth=Math.max(0.25,rr*0.18); x.beginPath(); x.ellipse(cx,cy,rr,rr*0.88,0,0.35,1.25); x.stroke(); });
    var s2=Math.max(0.25,r*0.035); sp.gr.forEach(function(g){ x.fillStyle='rgba(60,40,80,0.55)'; x.fillRect(g[0]*r,g[1]*r,s2,s2); x.fillStyle='rgba(255,240,250,0.5)'; x.fillRect(g[0]*r-s2*0.6,g[1]*r-s2*0.6,s2*0.7,s2*0.7); }); x.restore();
    lx2.save(); inkSmooth(lx2,P); lx2.clip();
    sp.cr.forEach(function(c){ if(!c[3]) return; var cx=c[0]*r, cy=c[1]*r, rr=c[2]*r; lx2.fillStyle='rgba(255,120,40,0.4)'; lx2.beginPath(); lx2.arc(cx,cy,rr*1.2,0,6.2832); lx2.fill(); lx2.fillStyle='#ff7a20'; lx2.beginPath(); lx2.ellipse(cx,cy,rr*0.92,rr*0.82,0,0,6.2832); lx2.fill(); lx2.fillStyle='#ffa040'; lx2.beginPath(); lx2.ellipse(cx,cy,rr*0.8,rr*0.7,0,0,6.2832); lx2.fill(); lx2.fillStyle='#fff2b0'; lx2.beginPath(); lx2.ellipse(cx+rr*0.15,cy+rr*0.1,rr*0.35,rr*0.28,0,0,6.2832); lx2.fill(); });
    sp.ck.forEach(function(L){ [[r*0.14,'rgba(255,120,40,0.35)'],[r*0.06,'rgba(255,170,60,0.9)'],[r*0.022,'#fff2b0']].forEach(function(q){ lx2.strokeStyle=q[1]; lx2.lineWidth=Math.max(0.22,q[0]); lx2.beginPath(); L.forEach(function(p,i){ if(i) lx2.lineTo(p[0]*r,p[1]*r); else lx2.moveTo(p[0]*r,p[1]*r); }); lx2.stroke(); }); });
    sp.em.forEach(function(e){ lx2.fillStyle='#ffb040'; lx2.beginPath(); lx2.arc(e[0]*r,e[1]*r,Math.max(0.25,r*0.03),0,6.2832); lx2.fill(); }); lx2.restore();
    sp._body=o.c; sp._lava=l.c; sp._S=S; sp._key=hs+'|'+hdKey; },
  drawRock:function(sp,x,y){ var r=sp.r, a0=sp.rot/16*6.2832, t=performance.now()/1000, P=sp.pts.map(function(p){ return [Math.cos(p[0]+a0)*r*p[1],Math.sin(p[0]+a0)*r*p[1]]; });
    if(!sp._body||sp._key!==hs+'|'+hdKey) this.rockMake(sp); var S=sp._S;
    hx.save(); hx.translate(x+(sp.ox||0),y); hx.lineJoin='round';
    hx.save(); hx.rotate(a0); hx.drawImage(sp._body,-S/2,-S/2,S,S); hx.restore();
    hx.save(); inkSmooth(hx,P); hx.clip();
    if(!sp._g||sp._gc!==hx){ var g=hx.createLinearGradient(-r,-r,r,r); g.addColorStop(0,'rgba(255,240,248,0.42)'); g.addColorStop(0.45,'rgba(255,240,248,0)'); g.addColorStop(0.6,'rgba(40,24,64,0)'); g.addColorStop(1,'rgba(40,24,64,0.55)'); sp._g=g; sp._gc=hx; }
    hx.fillStyle=sp._g; hx.fillRect(-r*1.3,-r*1.3,r*2.6,r*2.6);
    hx.strokeStyle='rgba(255,190,150,0.55)'; hx.lineWidth=Math.max(0.4,r*0.08); inkSmooth(hx,P.map(function(q){ return [q[0]+r*0.07,q[1]+r*0.07]; })); hx.stroke();
    hx.save(); hx.rotate(a0); hx.globalAlpha=0.75+0.25*Math.sin(t*2.5+sp.ph); hx.drawImage(sp._lava,-S/2,-S/2,S,S); hx.restore();   // the lava glows: over the shade
    hx.fillStyle='rgba(255,240,248,0.85)'; hx.beginPath(); hx.ellipse(-r*0.4,-r*0.44,r*0.25,r*0.11,-0.6,0,6.2832); hx.fill(); hx.fillStyle='rgba(255,255,255,0.9)'; hx.beginPath(); hx.arc(-r*0.15,-r*0.55,Math.max(0.3,r*0.04),0,6.2832); hx.fill();
    hx.restore(); inkSmooth(hx,P); hx.strokeStyle='#40305c'; hx.lineWidth=Math.max(0.55,r*0.065); hx.stroke(); hx.restore(); },
  /* v1.25, the fighter «БВ1» (the maintainer chose it from mixes of the detailed old ship and a heavy interceptor: «корабль всетаки бв1
     будет лучше»): the old ship's silhouette in full detail — a two-tone mint hull, panel seams and rivets, an intake grille, orange-and-yellow
     stripes on the wings, the pilot in a red helmet under the canopy — with the interceptor's twin engines and a missile under each wing.
     A cached sprite; the blue plasma flames with their shock rings and the blinking wing-tip lights live. */
  shipMake:function(){ var o=hdOff(24,14), x=o.x; x.translate(1,7); x.lineJoin='round'; x.lineCap='round';
    var lg=function(x0,y0,x1,y1,st){ var g=x.createLinearGradient(x0,y0,x1,y1); st.forEach(function(c,i){ g.addColorStop(i/(st.length-1),c); }); return g; };
    var dot=function(X,Y,r,c){ x.fillStyle=c; x.beginPath(); x.arc(X,Y,r,0,6.2832); x.fill(); };
    var hull=function(){ x.beginPath(); x.moveTo(20,0); x.bezierCurveTo(15,-2.2,10,-3,7,-6); x.lineTo(3,-6); x.lineTo(5,-2); x.lineTo(1.5,-1.6); x.lineTo(1.5,1.6); x.lineTo(5,2); x.lineTo(3,6); x.lineTo(7,6); x.bezierCurveTo(10,3,15,2.2,20,0); x.closePath(); };
    [-1.15,1.15].forEach(function(dy){ x.fillStyle=lg(0,dy-0.95,0,dy+0.95,['#7a8a98','#3a4a58','#222c36']); x.beginPath(); x.roundRect(0.1,dy-0.95,2.6,1.9,0.6); x.fill(); x.strokeStyle='#0c2a30'; x.lineWidth=0.35; x.stroke();
      x.strokeStyle='rgba(220,235,240,0.55)'; x.lineWidth=0.25; x.beginPath(); x.moveTo(0.8,dy-0.85); x.lineTo(0.8,dy+0.85); x.stroke(); });
    hull(); x.fillStyle=lg(0,-6,0,6,['#e8fff8','#8ff0d6','#3fc4a6','#1d7c6c','#14544c']); x.fill();
    x.save(); hull(); x.clip(); x.fillStyle=lg(0,-1,0,6,['rgba(10,60,55,0)','rgba(10,60,55,0.35)']); x.fillRect(0,0.4,22,7);
    [-1,1].forEach(function(s){ x.fillStyle='#ff6a3c'; x.beginPath(); x.moveTo(3.4,s*6); x.lineTo(5.4,s*6); x.lineTo(7.4,s*3.2); x.lineTo(5.6,s*3.2); x.fill();
      x.fillStyle='#ffd23f'; x.beginPath(); x.moveTo(5.6,s*6); x.lineTo(6.4,s*6); x.lineTo(8.2,s*3.8); x.lineTo(7.4,s*3.4); x.fill(); });
    x.strokeStyle='rgba(12,60,56,0.75)'; x.lineWidth=0.25; x.beginPath(); x.moveTo(9.4,-3.1); x.lineTo(9.4,3.1); x.moveTo(16,-1.4); x.lineTo(16,1.4); x.moveTo(5,-1.9); x.lineTo(10.5,-1.6); x.moveTo(5,1.9); x.lineTo(10.5,1.6); x.stroke();
    [[6,-1],[6,1],[8.6,-2.3],[8.6,2.3],[17.4,0.5],[17.4,-0.5]].forEach(function(p){ dot(p[0],p[1],0.2,'#0d4a44'); });
    x.fillStyle='#143a40'; for(var i=0;i<3;i++) x.fillRect(3.2+i*0.7,-0.9,0.35,1.8); x.restore();
    x.strokeStyle='rgba(255,255,255,0.9)'; x.lineWidth=0.45; x.beginPath(); x.moveTo(7.6,-4.7); x.quadraticCurveTo(12,-2.7,18.6,-0.5); x.stroke(); x.strokeStyle='#08362f'; x.lineWidth=0.55; hull(); x.stroke();
    [-4.4,4.4].forEach(function(Y){ x.fillStyle=lg(0,Y-0.55,0,Y+0.55,['#ffffff','#c8ced8','#7a8090']); x.beginPath(); x.moveTo(4.6,Y-0.5); x.lineTo(8.8,Y-0.5); x.quadraticCurveTo(10.2,Y,8.8,Y+0.5); x.lineTo(4.6,Y+0.5); x.closePath(); x.fill();
      x.strokeStyle='#3a4050'; x.lineWidth=0.22; x.stroke(); x.fillStyle='#e8303a'; x.fillRect(8.2,Y-0.5,0.6,1); x.fillStyle='#3a4050'; var f=Y<0?-1:1; x.beginPath(); x.moveTo(4.6,Y-0.5*f); x.lineTo(3.9,Y-1.1*f); x.lineTo(5.5,Y-0.5*f); x.fill(); });
    var X=13.2, Y=-0.4; x.fillStyle=lg(X-2,Y-2,X+2,Y+1,['#ffffff','#9ff0ff','#2a78a8','#1a3a68']); x.beginPath(); x.ellipse(X,Y,3.4,1.5,0,0,6.2832); x.fill();
    x.save(); x.beginPath(); x.ellipse(X,Y,3.4,1.5,0,0,6.2832); x.clip(); dot(X-0.8,Y+0.1,0.95,'#e8303a'); x.fillStyle='rgba(40,40,60,0.85)'; x.beginPath(); x.ellipse(X-0.3,Y+0.1,0.45,0.75,0,0,6.2832); x.fill(); x.restore();
    x.strokeStyle='#08362f'; x.lineWidth=0.4; x.beginPath(); x.ellipse(X,Y,3.4,1.5,0,0,6.2832); x.stroke(); x.fillStyle='rgba(255,255,255,0.85)'; x.beginPath(); x.ellipse(X+1.2,Y-0.7,1.1,0.32,-0.2,0,6.2832); x.fill();
    return o.c; },
  /* the twin blue plasma: a white-hot core, a fading blue tongue, two shock rings */
  plasma:function(x,y,t,dy){ var fl=0.85+0.15*Math.sin(t*41+dy), Y=y+dy; hGlow(x-1,Y,5,'110,200,255',0.55);
    var g=hx.createLinearGradient(x+1,0,x-9,0); g.addColorStop(0,'#ffffff'); g.addColorStop(0.45,'#7fdcff'); g.addColorStop(1,'rgba(60,120,255,0)'); hx.fillStyle=g;
    hx.beginPath(); hx.moveTo(x+1,Y-0.95); hx.quadraticCurveTo(x-9*fl,Y,x+1,Y+0.95); hx.fill();
    hx.fillStyle='rgba(225,250,255,0.85)'; hx.beginPath(); hx.ellipse(x-2.2*fl,Y,0.45,0.7,0,0,6.2832); hx.fill(); hx.fillStyle='rgba(225,250,255,0.55)'; hx.beginPath(); hx.ellipse(x-4.6*fl,Y,0.45,0.55,0,0,6.2832); hx.fill(); },
  ship:function(x,y,t,blink){ if(blink) return; if(!this._ship||this._shipKey!==hdKey){ this._ship=this.shipMake(); this._shipKey=hdKey; }
    if(!shipBare){ this.plasma(x,y,t,-1.15); this.plasma(x,y,t,1.15); }
    hx.drawImage(this._ship,x-1,y-7,24,14);
    var bl=Math.floor(t*3)%2; hGlow(x+3.3,y-6,1.9,'255,80,80',bl?0.95:0.4); hGlow(x+3.3,y+6,1.9,'110,255,170',bl?0.4:0.95);
    hx.fillStyle='#ff8080'; hx.beginPath(); hx.arc(x+3.3,y-6,0.4,0,6.2832); hx.fill(); hx.fillStyle='#9affc8'; hx.beginPath(); hx.arc(x+3.3,y+6,0.4,0,6.2832); hx.fill();
    light(x-2,y,9*K,'130,200,255',0.4); },
  /* v1.25, the saucer «В1»: a jellyfish — a glass dome with ribs and a pulsing core with rays, a thick ring with running lights, three
     feelers with glowing tips swaying under it */
  ufo:function(ux,uy,big,hurt){ var k=big?1:0.72, t=performance.now()/1000, H=hurt?'#ffffff':null, i;
    hGlow(ux,uy,17*k,hurt?'255,255,255':'255,120,200',0.3); hx.save(); hx.translate(ux,uy); hx.scale(k,k); hx.lineJoin='round'; hx.lineCap='round';
    var dome=function(){ hx.beginPath(); hx.ellipse(0,0,7.6,7,0,Math.PI,0); hx.closePath(); };
    [-4,0,4].forEach(function(X,j){ hx.strokeStyle=H||'rgba(255,150,225,0.9)'; hx.lineWidth=0.85; hx.beginPath(); var px=X, py=2;
      for(var q=0;q<=8;q++){ var s=q/8; px=X+Math.sin(t*4+j*1.7+s*3.2)*1.5*s; py=2+s*6.5; if(q) hx.lineTo(px,py); else hx.moveTo(px,py); } hx.stroke();
      if(!H) hGlow(px,py,1.6,'255,240,170',0.7); hx.fillStyle=H||'#fff0a8'; hx.beginPath(); hx.arc(px,py,0.6,0,6.2832); hx.fill(); });
    dome(); if(H) hx.fillStyle=H; else { var dg=hx.createRadialGradient(-2.45,-5.4,0.35,0,-2.6,7.5); dg.addColorStop(0,'#ffe4ff'); dg.addColorStop(0.5,'#e090ec'); dg.addColorStop(1,'#a040c0'); hx.fillStyle=dg; } hx.fill();
    if(!H){ hx.save(); dome(); hx.clip(); hx.strokeStyle='rgba(120,30,130,0.35)'; hx.lineWidth=0.3; [2.4,4.8,6.6].forEach(function(r){ hx.beginPath(); hx.ellipse(0,0,r,7,0,Math.PI,0); hx.stroke(); }); hx.beginPath(); hx.ellipse(0,0,7.6,3.4,0,Math.PI,0); hx.stroke(); hx.restore();
      var pu=0.5+0.5*Math.sin(t*6); hGlow(0,-2.8,4.4,'255,255,200',0.55+0.35*pu); hx.strokeStyle='rgba(255,250,210,'+(0.5+0.4*pu)+')'; hx.lineWidth=0.3; hx.beginPath();
      for(i=0;i<8;i++){ var a=i/8*6.2832+t; hx.moveTo(Math.cos(a)*1.8,-2.8+Math.sin(a)*1.8); hx.lineTo(Math.cos(a)*2.8,-2.8+Math.sin(a)*2.8); } hx.stroke();
      hx.fillStyle='#fff7c8'; hx.beginPath(); hx.arc(0,-2.8,1.5,0,6.2832); hx.fill(); hx.fillStyle='#ffffff'; hx.beginPath(); hx.arc(-0.4,-3.2,0.5,0,6.2832); hx.fill(); }
    dome(); hx.strokeStyle='#7a1a78'; hx.lineWidth=0.55; hx.stroke(); hx.strokeStyle='rgba(255,255,255,0.8)'; hx.lineWidth=0.6; hx.beginPath(); hx.ellipse(0,0,6,5.5,0,3.5,4.4); hx.stroke();
    hx.beginPath(); hx.ellipse(0,0.6,9.4,2.2,0,0,6.2832); hx.strokeStyle='#7a1a78'; hx.lineWidth=1.9; hx.stroke(); hx.strokeStyle=H||'#ffd0f0'; hx.lineWidth=1.2; hx.stroke();
    hx.strokeStyle='rgba(255,255,255,0.8)'; hx.lineWidth=0.3; hx.beginPath(); hx.ellipse(0,0.3,9.2,2,0,Math.PI*1.1,Math.PI*1.9); hx.stroke();
    if(!H) for(i=0;i<10;i++){ var b=i/10*6.2832+t*2.4; if(Math.sin(b)>-0.2){ hx.fillStyle=['#ffe66d','#7affc8','#ffffff'][i%3]; hx.beginPath(); hx.arc(Math.cos(b)*9.4,0.6+Math.sin(b)*2.2,0.55,0,6.2832); hx.fill(); } }
    hx.restore(); light(ux,uy,(big?22:16)*K,'255,140,220',0.35); },
  /* v1.25, the power-up «4» (the maintainer chose it from mixes of a plate with cut corners and a tile with depth: «4, медленно
     покачивающийся»): a gold plate with cut corners, a bevelled frame lit from the top left, a recessed panel engraved with fine rays,
     four screws on its sides, the sign embossed; it rocks slowly and a glint sweeps across it. A cached sprite per sign; the glint live. */
  octP:function(c,r,k){ c.beginPath(); c.moveTo(-r+k,-r); c.lineTo(r-k,-r); c.lineTo(r,-r+k); c.lineTo(r,r-k); c.lineTo(r-k,r); c.lineTo(-r+k,r); c.lineTo(-r,r-k); c.lineTo(-r,-r+k); c.closePath(); },
  pickMake:function(type){ var o=hdOff(14,14), x=o.x, me=this, i; x.translate(7,7); x.lineJoin='round'; x.lineCap='round';
    var g=x.createLinearGradient(-6,-6,6,6); g.addColorStop(0,'#fff8d0'); g.addColorStop(0.35,'#ffd24a'); g.addColorStop(0.7,'#e09a14'); g.addColorStop(1,'#a86a08');
    me.octP(x,5.9,2.2); x.fillStyle=g; x.fill(); x.strokeStyle='#6a3a00'; x.lineWidth=0.6; x.stroke();
    var pg=x.createRadialGradient(-2.1,-2.4,0.3,0,0,6); pg.addColorStop(0,'#ffe680'); pg.addColorStop(0.5,'#f0b030'); pg.addColorStop(1,'#c87a10');
    me.octP(x,4.4,1.6); x.fillStyle=pg; x.fill(); x.save(); me.octP(x,4.4,1.6); x.clip(); x.strokeStyle='rgba(150,80,0,0.35)'; x.lineWidth=0.18; x.beginPath();
    for(i=0;i<24;i++){ var a=i/24*6.2832; x.moveTo(Math.cos(a)*1.5,Math.sin(a)*1.5); x.lineTo(Math.cos(a)*8,Math.sin(a)*8); } x.stroke(); x.restore();
    me.octP(x,4.4,1.6); x.strokeStyle='rgba(120,60,0,0.8)'; x.lineWidth=0.35; x.stroke();
    x.strokeStyle='rgba(255,255,230,0.75)'; x.lineWidth=0.3; x.beginPath(); x.moveTo(-4.4,1.6); x.lineTo(-4.4,-2.8); x.lineTo(-2.8,-4.4); x.lineTo(2.8,-4.4); x.stroke();
    [[0,-5.15],[0,5.15],[-5.15,0],[5.15,0]].forEach(function(q){ x.fillStyle='#8a5000'; x.beginPath(); x.arc(q[0],q[1],0.5,0,6.2832); x.fill(); x.strokeStyle='#fff4c0'; x.lineWidth=0.18; x.beginPath(); x.moveTo(q[0]-0.3,q[1]-0.3); x.lineTo(q[0]+0.3,q[1]+0.3); x.stroke(); });
    var g=hdOff(14,14), gc=g.x, kh=hx, kw=hdIconW; gc.translate(7,7); hx=gc; hdIconW=1.35; try{ hx.save(); hx.translate(0.35,0.35); hdIcon(type,'rgba(255,240,180,0.75)'); hx.restore(); hdIcon(type,'#100300'); } finally { hx=kh; hdIconW=kw; }
    o.c._sign=g.c; return o.c; },   // v1.27: the sign apart, over the glint («пусть блик поверх не перекрывает эту темноту»)
  pick:function(x,y,type){ var t=performance.now()/1000, p=0.8+0.2*Math.sin(t*4);
    if(!this._pk2||this._pk2Key!==hdKey){ this._pk2={}; this._pk2Key=hdKey; } if(!this._pk2[type]) this._pk2[type]=this.pickMake(type);
    hGlow(x,y,11,'255,220,100',0.45*p); hx.save(); hx.translate(x,y); hx.rotate(Math.sin(t*1.5)*0.12); hx.drawImage(this._pk2[type],-7,-7,14,14);
    var sw=((t*0.6)%1.6-0.3)*16-8; if(sw>-9&&sw<14){ hx.save(); this.octP(hx,5.9,2.2); hx.clip(); hx.fillStyle='rgba(255,255,240,0.32)'; hx.beginPath(); hx.moveTo(sw-0.6,-8); hx.lineTo(sw+0.8,-8); hx.lineTo(sw-4.2,8); hx.lineTo(sw-5.6,8); hx.fill(); hx.restore(); }
    hx.drawImage(this._pk2[type]._sign,-7,-7,14,14); hx.restore(); light(x,y,14*K,'255,230,109',0.25); },
  /* v1.27, the shot «П4»: a plasma needle — a long thin blue trace, two shock rings on it, a white-hot head (made a little larger and
     brighter: «можно чуть увеличить размер пучка плазмы и яркость ядра») */
  bullet:function(x,y){ hGlow(x+1,y,4.6,'110,200,255',0.42);
    if(!this._blg||this._blgc!==hx){ var g=hx.createLinearGradient(-12,0,0,0); g.addColorStop(0,'rgba(60,140,255,0)'); g.addColorStop(1,'rgba(127,210,255,0.55)'); this._blg=g; this._blgc=hx; }
    hx.save(); hx.translate(x,y); hx.fillStyle=this._blg; hx.beginPath(); hx.moveTo(0,-0.6); hx.lineTo(-12,0); hx.lineTo(0,0.6); hx.fill();
    hx.lineWidth=0.3; hx.strokeStyle='rgba(225,250,255,0.5)'; hx.beginPath(); hx.ellipse(-3,0,0.4,1,0,0,6.2832); hx.stroke(); hx.strokeStyle='rgba(225,250,255,0.22)'; hx.beginPath(); hx.ellipse(-6,0,0.4,0.8,0,0,6.2832); hx.stroke();
    hx.fillStyle='#4aaeff'; hx.beginPath(); hx.ellipse(1.2,0,2.8,1.1,0,0,6.2832); hx.fill(); hx.fillStyle='#c8eeff'; hx.beginPath(); hx.ellipse(1.7,0,1.9,0.68,0,0,6.2832); hx.fill(); hx.fillStyle='#ffffff'; hx.beginPath(); hx.ellipse(2.1,0,1.2,0.42,0,0,6.2832); hx.fill(); hx.restore(); hGlow(x+2.2,y,2.6,'235,250,255',0.75); light(x,y,6*K,'130,200,255',0.35); },
  /* v1.27, the saucers' shot «Е»: a little jellyfish — a tiny dome with a glowing core, a pink ring, two feelers, bobbing */
  ebullet:function(x,y){ var t=performance.now()/1000, yy=y+Math.sin(t*6+x*0.3)*0.3, i; hGlow(x,yy,5,'255,120,200',0.45); hx.save(); hx.translate(x,yy); hx.lineCap='round';
    for(i=-1;i<=1;i+=2){ hx.strokeStyle='#ff7ad8'; hx.lineWidth=0.4; hx.beginPath(); hx.moveTo(i*0.9,0.3); hx.quadraticCurveTo(i*0.9+Math.sin(t*8+i)*0.6,1.6,i*0.9,2.6); hx.stroke(); hx.fillStyle='#fff0a8'; hx.beginPath(); hx.arc(i*0.9,2.6,0.35,0,6.2832); hx.fill(); }
    hx.beginPath(); hx.ellipse(0,0.2,2.2,2,0,Math.PI,0); hx.closePath(); var g=hx.createRadialGradient(-0.84,-1.76,0.1,0,-0.8,2.4); g.addColorStop(0,'#ffa8ec'); g.addColorStop(1,'#b830c0'); hx.fillStyle=g; hx.fill(); hx.strokeStyle='#6a0a68'; hx.lineWidth=0.3; hx.stroke();
    hx.fillStyle='#fff7c8'; hx.beginPath(); hx.arc(0,-0.6,0.55,0,6.2832); hx.fill(); hx.strokeStyle='#ff5ac8'; hx.lineWidth=0.5; hx.beginPath(); hx.ellipse(0,0.3,2.8,0.6,0,0,6.2832); hx.stroke(); hx.restore(); light(x,y,7*K,'255,122,200',0.5); },
  bursts:function(){ return spKinds({rock:['#f2dde6','#cdb0c8','#a084b4','#6a5690'],ufo:['#ffffff','#ffd0f0','#e090ec','#b040c0'],ship:['#e8fff8','#8ff0d6','#3fc4a6','#1d7c6c'],pick:['#fffbe0','#ffe066','#ffc233','#c8840c']}); },
  /* v1.27, the explosions (see spFxTrack in 43_skins.js): rock «Б», saucer «В», power-up «Д», the hit ship «Г» */
  parts:function(){ spFxTrack(); var i;
    var chunk=function(X,Y,s2,ang,c){ hx.save(); hx.translate(X,Y); hx.rotate(ang); hx.beginPath(); hx.moveTo(s2,0); hx.lineTo(s2*0.3,s2*0.8); hx.lineTo(-s2*0.8,s2*0.4); hx.lineTo(-s2*0.6,-s2*0.6); hx.lineTo(s2*0.4,-s2*0.8); hx.closePath(); hx.fillStyle=c; hx.fill(); hx.strokeStyle='rgba(40,24,60,0.85)'; hx.lineWidth=0.35; hx.stroke(); hx.restore(); };
    var dot=function(X,Y,r,c){ hx.fillStyle=c; hx.beginPath(); hx.arc(X,Y,Math.max(0.05,r),0,6.2832); hx.fill(); };
    SPFX.forEach(function(e){ var t=e.t, R2=srand(e.seed);
      if(e.k==='rock'){ if(t<0.18){ var u=t/0.18; hGlow(e.x,e.y,12*(0.5+u),'255,150,80',0.9*(1-u)); dot(e.x,e.y,4*(1-u),'#ffffff'); }
        hx.globalAlpha=Math.max(0,0.45*(1-t/0.75)); for(i=0;i<5;i++){ var a=R2()*6.2832, d=(3+R2()*5)*Math.min(1,t*4), r=(2+R2()*2.5)*(0.6+t*1.4); dot(e.x+Math.cos(a)*d,e.y+Math.sin(a)*d,r,'#8a7098'); } hx.globalAlpha=1; }
      else if(e.k==='ufo'){ var v=Math.min(1,t/0.45); hGlow(e.x,e.y,16*(0.4+v),'255,140,220',0.5*(1-v)); if(t<0.12) dot(e.x,e.y,5*(1-t/0.12)+1,'#ffffff');
        if(v<1){ hx.beginPath(); hx.arc(e.x,e.y,3+v*22,0,6.2832); hx.strokeStyle='rgba(255,170,235,'+(0.6*(1-v))+')'; hx.lineWidth=3*(1-v); hx.stroke(); hx.strokeStyle='rgba(255,255,255,'+(0.95*(1-v))+')'; hx.lineWidth=1.6*(1-v)+0.2; hx.stroke(); } }
      else if(e.k==='pick'){ hGlow(e.x,e.y,12*(0.5+t),'255,220,100',0.38*Math.max(0,1-t/0.5)); }
      else if(e.k==='ship'){ if(t<0.2){ var w=t/0.2, s3=10*(0.6+w*0.6)*(1-w*0.6); hx.save(); hx.translate(e.x,e.y); hx.rotate(0.3); hx.fillStyle='rgba(255,255,240,'+(1-w)+')'; hx.beginPath(); hx.moveTo(0,-s3); hx.quadraticCurveTo(0,0,s3,0); hx.quadraticCurveTo(0,0,0,s3); hx.quadraticCurveTo(0,0,-s3,0); hx.quadraticCurveTo(0,0,0,-s3); hx.fill(); hx.restore(); }
        var al=Math.max(0,1-t/0.7); if(al>0) for(i=0;i<7;i++){ var a2=R2()*6.2832, d2=(4+R2()*6)*(1-Math.exp(-5*t)), r2=(2.5+R2()*2.5)*(0.5+t*1.2), px=e.x+Math.cos(a2)*d2, py=e.y+Math.sin(a2)*d2;
          hx.globalAlpha=al; dot(px,py,r2,i%2?'#3fc4a6':'#8ff0d6'); hx.strokeStyle='#1d7c6c'; hx.lineWidth=0.45; hx.stroke(); dot(px-r2*0.3,py-r2*0.3,r2*0.35,'rgba(255,255,255,0.45)'); } hx.globalAlpha=1; } });
    parts.forEach(function(p){ var f=p.life/p.max, k=p._k, c=p.cols[Math.min(p.cols.length-1,Math.floor((1-f)*p.cols.length))], age=p.max-p.life, spin=((p._i*37)%13-6);
      hx.globalAlpha=Math.min(1,f*1.8); hx.lineCap='round';
      if(k==='rock'){ if(p._i%3===0){ hx.strokeStyle=SP_HOT.rock[p._i%2]; hx.lineWidth=0.6; hx.beginPath(); hx.moveTo(p.x-p.vx*0.05,p.y-p.vy*0.05); hx.lineTo(p.x,p.y); hx.stroke(); }
        else if(p._i%3===1) chunk(p.x,p.y,0.9+(p._i%5)*0.35,spin*age,p.cols[1+p._i%3]); else dot(p.x,p.y,0.4+f*0.6,c); }
      else if(k==='ufo'){ hx.strokeStyle=p._i%2?'#fff7c8':p.cols[1+p._i%3]; hx.lineWidth=0.4+f*0.6; hx.beginPath(); hx.moveTo(p.x-p.vx*0.07,p.y-p.vy*0.07); hx.lineTo(p.x,p.y); hx.stroke(); }
      else if(k==='pick'){ var tw=(0.6+0.4*Math.sin(age*30+p._i))*(0.8+f*1.4); sparkleAt(hx,p.x,p.y,tw,p._i%2?'#ffffff':p.cols[1+p._i%2]); }
      else if(k==='ship'){ if(p._i%3===0) chunk(p.x,p.y,1+(p._i%4)*0.3,spin*age,p.cols[2]); else dot(p.x,p.y,0.45+f*0.7,p._i%4===1?SP_HOT.ship[2+p._i%2]:c); }
      else dot(p.x,p.y,0.45+f*0.7,c); }); hx.globalAlpha=1; },
  shield:function(){ return P.pick; }, mini:function(){ return [P.ship[1],P.ship[2]]; },
  /* v1.27, the shield «Б»: a honeycomb bubble — a faint cyan fill growing to its edge, a mesh of hexagons, brighter at the front where
     things come from, a glint on the top left, a cell lighting up here and there. The bubble and its mesh are a cached sprite. */
  shieldMake:function(){ var o=hdOff(28,23), x=o.x, cx=14, cy=11.5, RX=12.8, RY=10.2, me=this, row, col, k; x.translate(cx,cy); me._cells=[];
    var E=function(){ x.beginPath(); x.ellipse(0,0,RX,RY,0,0,6.2832); }; E(); var g=x.createRadialGradient(0,0,4,0,0,13); g.addColorStop(0,'rgba(140,230,255,0)'); g.addColorStop(1,'rgba(140,230,255,0.28)'); x.fillStyle=g; x.fill();
    x.save(); E(); x.clip(); var hr=1.9, hw=hr*Math.sqrt(3); x.strokeStyle='rgba(170,240,255,0.32)'; x.lineWidth=0.22; x.beginPath();
    for(row=-7;row<=7;row++) for(col=-6;col<=7;col++){ var hx0=col*hw+(row%2?hw/2:0), hy0=row*hr*1.5; for(k=0;k<=6;k++){ var a=k/6*6.2832+Math.PI/6, px=hx0+Math.cos(a)*hr, py=hy0+Math.sin(a)*hr; if(k) x.lineTo(px,py); else x.moveTo(px,py); }
      var d=Math.hypot(hx0/RX,hy0/RY); if(d>0.55&&d<0.92) me._cells.push([hx0,hy0]); } x.stroke(); x.restore();
    E(); x.strokeStyle='rgba(150,240,255,0.9)'; x.lineWidth=0.7; x.stroke(); x.strokeStyle='rgba(255,255,255,0.8)'; x.lineWidth=0.6; x.beginPath(); x.ellipse(0,0,10.8,8.2,0,Math.PI*1.1,Math.PI*1.45); x.stroke();
    return o.c; },
  shieldRing:function(x,y,t){ if(!this._shS||this._shKey!==hdKey){ this._shS=this.shieldMake(); this._shKey=hdKey; } var p=0.85+0.15*Math.sin(t*5), cx=x+8, i;
    hx.save(); hx.globalAlpha=p; hx.drawImage(this._shS,cx-14,y-11.5,28,23); hx.globalAlpha=1;
    var c=this._cells[Math.floor(t*3)%this._cells.length]; if(c){ hx.fillStyle='rgba(200,250,255,'+(0.45*(1-(t*3)%1))+')'; hx.beginPath(); for(i=0;i<6;i++){ var a=i/6*6.2832+Math.PI/6; hx.lineTo(cx+c[0]+Math.cos(a)*1.9,y+c[1]+Math.sin(a)*1.9); } hx.closePath(); hx.fill(); }
    hx.strokeStyle='rgba(220,255,255,'+(0.75+0.2*Math.sin(t*7))+')'; hx.lineWidth=1.1; hx.beginPath(); hx.ellipse(cx,y,12.8,10.2,0,-0.7,0.7); hx.stroke(); hx.restore(); } };
/* the power-up icons as smooth shapes (shield, triple shot, slow motion, life), 7×7 game pixels, centred */
var hdIconW=1.2; function hdIcon(type,col){ hdIconIn(type,col); }   // v0.81: the power-ups' signs bolder (their size stays)
function hdIconIn(type,col){ hx.fillStyle=col; hx.strokeStyle=col; hx.lineWidth=hdIconW; hx.lineCap='round'; hx.lineJoin='round';
  if(type==='shield'){ hx.beginPath(); hx.moveTo(0,-3.3); hx.lineTo(2.8,-2.2); hx.quadraticCurveTo(2.8,1.8,0,3.4); hx.quadraticCurveTo(-2.8,1.8,-2.8,-2.2); hx.closePath(); hx.stroke(); hx.beginPath(); hx.arc(0,-0.2,1,0,6.2832); hx.fill(); }
  else if(type==='triple'){ hx.beginPath(); hx.moveTo(-3,0); hx.lineTo(3,0); hx.moveTo(-1,0); hx.lineTo(3,-2.8); hx.moveTo(-1,0); hx.lineTo(3,2.8); hx.stroke(); }
  else if(type==='slow'){ hx.beginPath(); hx.moveTo(-2.6,-3); hx.lineTo(2.6,-3); hx.lineTo(-2.6,3); hx.lineTo(2.6,3); hx.closePath(); hx.stroke(); hx.beginPath(); hx.moveTo(-1.2,2.2); hx.lineTo(1.2,2.2); hx.lineTo(0,0.8); hx.fill(); }
  else { hx.beginPath(); hx.moveTo(0,3); hx.bezierCurveTo(-4,0,-2.6,-3.6,0,-1.4); hx.bezierCurveTo(2.6,-3.6,4,0,0,3); hx.fill(); } }

/* v1.27: small drawing helpers for the detailed fairy-tale pictures (c — the context, in game pixels) */
function fzLg(c,x0,y0,x1,y1,st){ var g=c.createLinearGradient(x0,y0,x1,y1); for(var i=0;i<st.length;i++) g.addColorStop(i/(st.length-1),st[i]); return g; }
function fzRg(c,X,Y,r0,X1,Y1,r,st){ var g=c.createRadialGradient(X,Y,r0,X1,Y1,r); for(var i=0;i<st.length;i++) g.addColorStop(i/(st.length-1),st[i]); return g; }
function fzDisc(c,X,Y,r,col){ c.fillStyle=col; c.beginPath(); c.arc(X,Y,Math.max(0.01,r),0,6.2832); c.fill(); }
function fzEll(c,X,Y,a,b,col,rot){ c.fillStyle=col; c.beginPath(); c.ellipse(X,Y,a,b,rot||0,0,6.2832); c.fill(); }
function fzStar(c,X,Y,r,col){ c.fillStyle=col; c.beginPath(); c.moveTo(X,Y-r); c.quadraticCurveTo(X,Y,X+r,Y); c.quadraticCurveTo(X,Y,X,Y+r); c.quadraticCurveTo(X,Y,X-r,Y); c.quadraticCurveTo(X,Y,X,Y-r); c.fill(); }
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
    var ow=dark?Math.max(0.7,w*0.03):Math.max(0.4,w*0.01), line=dark?'#2d2350':'rgba(120,150,215,0.7)';   // v0.81: the storm clouds' line darker and thicker
    var base=dark?'#766ac2':'#eef5ff', low=dark?'#44388c':'#bcd0f0', top=dark?'#b0a8ea':'#ffffff';   // v0.81: the storm clouds darker (they were near the sky's own tone)
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
  /* v1.27, the storm clouds «Б, но подробнее и темнее»: darker, more puffs with seams between them, lit tops and soft shines, a pink
     glow on the underside, specks; a face on the big and middle ones (frowning brows, eyes with a shine, a frown, blushing cheeks), little
     brows on the small ones; rain under the big and middle ones, the big ones flash a lightning bolt with an edge */
  stormMake:function(w,seed){ var h=w*0.55, R2=srand(seed), P=[], i, S2=w*1.1, o=hdOff(S2,S2), c=o.x, ow=Math.max(0.7,w*0.03);
    for(i=0;i<13;i++){ var px=(-0.38+0.76*R2())*w, py=(0.02+0.16*R2())*h, pr=(0.13+0.13*R2())*w*(1-Math.abs(px)/w*0.8); P.push([px,py,pr]); } P.push([0,-0.05*h,0.24*w]);
    c.translate(S2/2,S2/2);
    c.strokeStyle='#1e1640'; c.lineWidth=ow*2; P.forEach(function(q){ c.beginPath(); c.arc(q[0],q[1],q[2],0,6.2832); c.stroke(); });
    c.fillStyle='#e070b8'; P.forEach(function(q){ c.beginPath(); c.arc(q[0],q[1]+ow*0.9,q[2],0,6.2832); c.fill(); });
    c.save(); c.beginPath(); P.forEach(function(q){ c.moveTo(q[0]+q[2],q[1]); c.arc(q[0],q[1],q[2],0,6.2832); }); c.clip();
    c.fillStyle='#5e52a8'; c.fillRect(-w,-w,2*w,2*w); c.fillStyle=fzLg(c,0,-w*0.05,0,w*0.3,['rgba(46,36,112,0)','#2e2470','#241a5e']); c.fillRect(-w,-w,2*w,2*w);
    c.fillStyle='#8a80d0'; P.forEach(function(q){ c.beginPath(); c.arc(q[0]-q[2]*0.22,q[1]-q[2]*0.28,q[2]*0.68,0,6.2832); c.fill(); });
    c.fillStyle='rgba(200,195,255,0.35)'; P.forEach(function(q){ c.beginPath(); c.arc(q[0]-q[2]*0.32,q[1]-q[2]*0.4,q[2]*0.42,0,6.2832); c.fill(); });
    c.strokeStyle='rgba(20,12,56,0.45)'; c.lineWidth=ow*0.6; c.lineCap='round'; P.slice(0,-1).forEach(function(q){ c.beginPath(); c.arc(q[0],q[1],q[2],Math.PI*1.12,Math.PI*1.7); c.stroke(); });
    for(i=0;i<Math.round(w*0.6);i++){ var sx=(R2()-0.5)*w*0.8, sy=(R2()-0.4)*h*0.6; c.fillStyle=R2()<0.5?'rgba(220,215,255,0.5)':'rgba(30,20,70,0.35)'; c.fillRect(sx,sy,Math.max(0.3,w*0.012),Math.max(0.3,w*0.012)); }
    c.fillStyle='rgba(255,255,255,0.5)'; P.slice(-4).forEach(function(q){ c.beginPath(); c.ellipse(q[0]-q[2]*0.4,q[1]-q[2]*0.5,q[2]*0.25,q[2]*0.12,-0.5,0,6.2832); c.fill(); }); c.restore();
    return o.c; },
  rock:function(r,sz,seed){ var w=r*2.3, img=this.stormMake(w,seed*13+5); return {img:img,size:w*1.1,rot:0,vr:0,hd:true,big:sz===0,sz:sz,r:r,seed:seed,
      after:function(sp){ var r2=sp.r, t=performance.now()/1000, I='#1e1640', k;
        if(sp.sz<2){ hx.strokeStyle='rgba(140,170,240,0.75)'; hx.lineWidth=Math.max(0.3,r2*0.03); hx.lineCap='round'; for(k=0;k<5;k++){ var X=(-0.5+k*0.25)*r2, ph=(t*1.5+k*0.37+sp.seed)%1, Y=0.6*r2+ph*0.6*r2; hx.globalAlpha=1-ph; hx.beginPath(); hx.moveTo(X,Y); hx.lineTo(X-0.05*r2,Y+0.14*r2); hx.stroke(); } hx.globalAlpha=1; }
        if(sp.sz<2){ var f=sp.sz?0.9:1, q=r2*f;
          [-0.3,0.26].forEach(function(ex){ fzEll(hx,ex*q,0.12*q,0.1*q,0.14*q,I); fzDisc(hx,ex*q-0.03*q,0.07*q,0.035*q,'#ffffff'); });
          hx.strokeStyle=I; hx.lineWidth=0.08*q; hx.lineCap='round'; hx.beginPath(); hx.moveTo(-0.46*q,-0.1*q); hx.lineTo(-0.16*q,-0.02*q); hx.moveTo(0.42*q,-0.1*q); hx.lineTo(0.12*q,-0.02*q); hx.stroke(); hx.beginPath(); hx.arc(0,0.52*q,0.16*q,Math.PI*1.15,Math.PI*1.85); hx.stroke();
          fzEll(hx,-0.5*q,0.32*q,0.1*q,0.05*q,'rgba(255,120,170,0.55)'); fzEll(hx,0.46*q,0.32*q,0.1*q,0.05*q,'rgba(255,120,170,0.55)'); }
        else { hx.strokeStyle=I; hx.lineWidth=0.1*r2; hx.lineCap='round'; hx.beginPath(); hx.moveTo(-0.3*r2,0.05*r2); hx.lineTo(-0.1*r2,0.12*r2); hx.moveTo(0.3*r2,0.05*r2); hx.lineTo(0.1*r2,0.12*r2); hx.stroke(); }
        if(sp.big&&Math.sin(t*2.7+sp.seed)>0.4){ hGlow(0,0.9*r2,0.5*r2,'255,240,150',0.8); hx.fillStyle='#fff3a0'; hx.beginPath(); hx.moveTo(0.05*r2,0.62*r2); hx.lineTo(-0.16*r2,0.95*r2); hx.lineTo(0,0.93*r2); hx.lineTo(-0.1*r2,1.22*r2); hx.lineTo(0.18*r2,0.86*r2); hx.lineTo(0.03*r2,0.88*r2); hx.closePath(); hx.fill(); hx.strokeStyle='#c08a10'; hx.lineWidth=0.05*r2; hx.stroke(); } } }; },
  drawRock:hdDrawRock,
  /* v1.27, the dragon «Б1» (the maintainer: «б1»): the little dragon in detail with golden sunset wings — wing bones, a claw at each
     tip, a shine on the membrane; scales on its body, a striped belly, a spine of gold plates, little claws; ringed horns, a pink ear
     frill, an eye with a lid and lashes, a puff of smoke from its nostril, a tooth, a blush; a trail of warm glows and twinkling stars */
  wingB1:function(side,fl){ var c=hx; c.save(); c.translate(6,-1.5); c.scale(1,side*(0.35+0.65*Math.abs(fl)));
    var path=function(){ c.beginPath(); c.moveTo(0,0); c.quadraticCurveTo(-3,-6,-8,-8.5); c.quadraticCurveTo(-7.2,-6.6,-7.6,-5.6); c.quadraticCurveTo(-6.4,-5,-7,-3.5); c.quadraticCurveTo(-5.4,-3.4,-4.5,-1.2); c.quadraticCurveTo(-2.6,-1.4,-1.5,0.4); c.closePath(); };
    path(); c.fillStyle=fzLg(c,0,0,-6,-9,side>0?['#b8600a','#ffb030','#fff0b0']:['#7a4008','#c88a28','#e0c890']); c.fill();
    c.save(); path(); c.clip(); c.fillStyle='rgba(255,255,255,0.25)'; c.beginPath(); c.ellipse(-4,-4.5,2.5,1.2,0.8,0,6.2832); c.fill(); c.restore();
    c.strokeStyle='#6a3a08'; c.lineWidth=0.65; c.lineJoin='round'; path(); c.stroke();
    c.strokeStyle='#a0600a'; c.lineWidth=0.45; c.lineCap='round'; c.beginPath(); c.moveTo(0,0); c.quadraticCurveTo(-3,-6,-8,-8.5); c.moveTo(-1.5,-1.2); c.quadraticCurveTo(-5,-3.5,-7.6,-5.6); c.moveTo(-1,-0.3); c.quadraticCurveTo(-4.5,-2,-7,-3.5); c.moveTo(-0.6,0.1); c.lineTo(-4.5,-1.2); c.stroke();
    c.fillStyle='#fff3e0'; c.beginPath(); c.moveTo(-8,-8.5); c.lineTo(-9.2,-9.1); c.lineTo(-8.4,-7.8); c.fill(); fzDisc(c,-1.8,-2.2,0.45,'#6a3a08'); c.restore(); },
  ship:function(x,y,t,blink){ if(blink) return; var c=hx, fl=Math.sin(t*14), i, k, s2, me=this;
    if(!shipBare) for(i=0;i<8;i++){ var a=1-i/8, ty=y+3+Math.sin(t*10+i)*1.2; hGlow(x-3-i*2.2,ty,1.3*a+0.5,'255,'+(215-i*8)+',140',0.6*a); if(i%2===0) fzStar(c,x-3-i*2.2,ty-1,(1.3*a+0.3)*(0.6+0.4*Math.sin(t*20+i)),'rgba(255,250,210,0.95)'); }
    c.save(); c.translate(x,y); c.lineJoin='round'; me.wingB1(-1,fl);
    var bg=fzLg(c,0,-5,0,5,['#b4ffd4','#4cc488','#188050','#073a24']), INKD='#0a3a24';
    c.fillStyle=bg; c.beginPath(); c.moveTo(1,1); c.quadraticCurveTo(-5,1.5,-7,5.5+fl*0.8); c.quadraticCurveTo(-3,3.6,2,3.4); c.fill(); c.strokeStyle=INKD; c.lineWidth=0.75; c.stroke();
    c.strokeStyle='rgba(10,58,36,0.4)'; c.lineWidth=0.3; c.beginPath(); for(k=0;k<4;k++){ var q=k/4; c.moveTo(-1-q*5,1.6+q*2.4); c.lineTo(-0.5-q*5,3.3+q*1.6); } c.stroke();
    c.fillStyle='#ff8a5a'; c.beginPath(); c.moveTo(-7,5.5+fl*0.8); c.lineTo(-9.4,4.4); c.lineTo(-8.6,5.7); c.lineTo(-8.8,7.2); c.closePath(); c.fill(); c.strokeStyle='#8a2a10'; c.lineWidth=0.35; c.stroke();
    c.save(); c.beginPath(); c.ellipse(6.5,0.6,6.4,3.8,-0.08,0,6.2832); c.fillStyle=bg; c.fill(); c.clip(); c.strokeStyle='rgba(10,70,40,0.35)'; c.lineWidth=0.3; c.beginPath();
    for(var r=0;r<3;r++) for(k=0;k<7;k++){ var sx=1.5+k*1.6+(r%2)*0.8, sy=-2.4+r*1.3; c.moveTo(sx+Math.cos(0.2)*0.8,sy+Math.sin(0.2)*0.8); c.arc(sx,sy,0.8,0.2,Math.PI-0.2); } c.stroke();
    c.fillStyle='rgba(255,255,255,0.3)'; c.beginPath(); c.ellipse(5,-1.8,3.2,0.9,-0.1,0,6.2832); c.fill(); c.restore(); c.beginPath(); c.ellipse(6.5,0.6,6.4,3.8,-0.08,0,6.2832); c.strokeStyle=INKD; c.lineWidth=0.75; c.stroke();
    fzEll(c,6.5,2.4,4.6,1.5,'#fff3b0',-0.08); c.strokeStyle='rgba(200,150,60,0.7)'; c.lineWidth=0.3; c.beginPath(); for(var b2=3;b2<10;b2+=1.3){ c.moveTo(b2,1.2); c.quadraticCurveTo(b2-0.5,2.4,b2-0.3,3.6); } c.stroke();
    for(s2=1;s2<11;s2+=2){ var yy=-2.8+Math.abs(s2-6)*0.12; c.fillStyle=fzLg(c,s2,yy-1.6,s2,yy,['#fff0a0','#ff9a2a']); c.beginPath(); c.moveTo(s2,yy); c.lineTo(s2+0.8,yy-1.7); c.lineTo(s2+1.6,yy); c.closePath(); c.fill(); c.strokeStyle='#a0500a'; c.lineWidth=0.25; c.stroke(); }
    [[4,4],[8.5,4]].forEach(function(l){ c.fillStyle='#1c7a50'; c.beginPath(); c.roundRect(l[0],l[1],1.4,2.4,0.6); c.fill(); c.strokeStyle=INKD; c.lineWidth=0.3; c.stroke(); c.fillStyle='#ffffff'; c.beginPath(); [0,0.5,1].forEach(function(d){ c.moveTo(l[0]+d+0.1,l[1]+2.3); c.lineTo(l[0]+d+0.3,l[1]+3); c.lineTo(l[0]+d+0.5,l[1]+2.3); }); c.fill(); });
    fzEll(c,10.6,-0.8,2.4,2.3,bg); fzEll(c,14,-2.6,4.2,3.4,bg,0.25); c.strokeStyle=INKD; c.lineWidth=0.75; c.stroke();
    c.fillStyle='#ff7ac8'; c.beginPath(); c.moveTo(11.4,-3); c.quadraticCurveTo(9.2,-3.6,8.6,-2); c.quadraticCurveTo(9.8,-2.4,10.2,-1.4); c.quadraticCurveTo(10.8,-2.6,11.4,-3); c.fill(); c.strokeStyle='#5a1a48'; c.lineWidth=0.3; c.stroke();
    [[12.4,-5.2,11,-8.6,10.2,-9,12.4,-7.6,13.6,-5.6],[14.6,-5.6,14.8,-9,14.2,-9.6,16,-8,15.8,-5.4]].forEach(function(h){ c.beginPath(); c.moveTo(h[0],h[1]); c.quadraticCurveTo(h[2],h[3],h[4],h[5]); c.quadraticCurveTo(h[6],h[7],h[8],h[9]); c.closePath(); c.fillStyle=fzLg(c,h[4],h[5],h[0],h[1],['#fff6c0','#ffc42a']); c.fill(); c.strokeStyle='#a0500a'; c.lineWidth=0.3; c.stroke(); });
    c.strokeStyle='rgba(160,80,10,0.6)'; c.lineWidth=0.25; c.beginPath(); c.moveTo(11.6,-6.4); c.lineTo(12.8,-6.6); c.moveTo(11,-7.6); c.lineTo(12.2,-7.4); c.moveTo(14.4,-6.6); c.lineTo(15.6,-6.4); c.moveTo(14.4,-7.8); c.lineTo(15.4,-7.6); c.stroke();
    fzEll(c,17.6,-1.6,1.8,1.35,fzLg(c,16,-3,19,0,['#ffc0a0','#ff8a5a']),0.2); c.strokeStyle='#a03a1a'; c.lineWidth=0.3; c.stroke(); fzDisc(c,18.7,-2.1,0.3,'#7a2a10');
    if(!shipBare){ var pf=(t*1.2)%1; c.globalAlpha=0.8*(1-pf); fzDisc(c,20.2+pf*1.6,-2.9-pf*1.2,0.5+pf*0.4,'#f0f0fa'); c.globalAlpha=1; }
    c.fillStyle='#ffffff'; c.beginPath(); c.moveTo(17.6,-0.4); c.lineTo(17.9,0.4); c.lineTo(18.2,-0.4); c.fill();
    var bl=(t%3.2)<0.12; if(bl){ c.strokeStyle=INKD; c.lineWidth=0.45; c.beginPath(); c.moveTo(13.3,-3.2); c.quadraticCurveTo(14.8,-2.4,16.3,-3.2); c.stroke(); }
    else { fzEll(c,14.8,-3.3,1.6,1.8,'#ffffff'); c.strokeStyle=INKD; c.lineWidth=0.3; c.stroke(); fzDisc(c,15.3,-3.1,0.95,'#1a1a2a'); fzDisc(c,15.3,-3.1,0.5,'#2a6a4a'); fzDisc(c,15.7,-3.6,0.35,'#ffffff'); fzDisc(c,15,-2.6,0.15,'#ffffff');
      c.strokeStyle=INKD; c.lineWidth=0.45; c.beginPath(); c.arc(14.8,-3.2,1.75,Math.PI*1.1,Math.PI*1.85); c.stroke(); }
    c.lineWidth=0.25; c.beginPath(); c.moveTo(13.4,-4.4); c.lineTo(12.9,-4.9); c.moveTo(14,-4.9); c.lineTo(13.7,-5.5); c.stroke();
    fzEll(c,15.6,-0.8,1.2,0.6,'rgba(255,120,160,0.5)'); me.wingB1(1,fl); c.restore(); },
  /* v1.27, the bat «Б1»: a night bat in detail — dark wings with finger bones, a thumb claw and a scalloped edge, a furry body, pink
     inner ears, red glowing eyes, fangs, little feet */
  ufo:function(ux,uy,big,hurt){ var k=big?1:0.72, t=performance.now()/1000, f=Math.sin(t*16), c=hx, H=hurt?'#ffffff':null;
    c.save(); c.translate(ux,uy); c.scale(k,k); c.lineJoin='round'; c.lineCap='round';
    [-1,1].forEach(function(s){ c.save(); c.scale(s,0.55+0.45*Math.abs(f));
      var P=function(){ c.beginPath(); c.moveTo(1.5,-1); c.quadraticCurveTo(6,-7,12,-5); c.quadraticCurveTo(10.8,-2.6,11.5,1.5); c.quadraticCurveTo(10,0.4,9.2,1.6); c.quadraticCurveTo(8.4,0.3,7.5,2.5); c.quadraticCurveTo(6.3,0.8,5.4,1.6); c.quadraticCurveTo(4.6,0.8,3.5,2.8); c.quadraticCurveTo(2.5,1,1.5,2); c.closePath(); };
      P(); c.fillStyle=H||fzLg(c,0,-6,0,4,['#6a5a9a','#3a2a6a','#14102a']); c.fill();
      if(!H){ c.save(); P(); c.clip(); c.fillStyle='rgba(255,200,255,0.2)'; c.beginPath(); c.ellipse(7,-2.5,3.2,1.2,-0.3,0,6.2832); c.fill(); c.restore(); }
      c.strokeStyle='#0a0614'; c.lineWidth=0.55; P(); c.stroke();
      if(!H){ c.strokeStyle='#0e0a1e'; c.lineWidth=0.4; c.beginPath(); c.moveTo(1.6,-0.8); c.quadraticCurveTo(5,-3.6,6.4,-4.6); c.lineTo(12,-5); c.moveTo(6.4,-4.6); c.lineTo(11.5,1.5); c.moveTo(6.4,-4.6); c.lineTo(9.2,1.6); c.moveTo(6.4,-4.6); c.lineTo(7.5,2.5); c.moveTo(6.4,-4.6); c.lineTo(5.4,1.6); c.stroke();
        c.fillStyle='#e8d8ff'; c.beginPath(); c.moveTo(6.2,-4.6); c.lineTo(6.6,-5.8); c.lineTo(6.9,-4.5); c.fill(); } c.restore(); });
    c.beginPath(); c.ellipse(0,0.7,2.7,3.4,0,0,6.2832); c.fillStyle=H||fzRg(c,-0.8,-1.2,0.3,0,0,3.4,['#5a4a8a','#2a1e50','#0e0a1e']); c.fill(); c.strokeStyle='#0a0614'; c.lineWidth=0.55; c.stroke();
    if(!H){ c.strokeStyle='rgba(200,170,255,0.6)'; c.lineWidth=0.25; c.beginPath(); for(var j=0;j<6;j++){ var a=-0.6+j*0.25; c.moveTo(Math.sin(a)*1.6,1.6+Math.cos(a)*0.4); c.lineTo(Math.sin(a)*2.1,2.6+Math.cos(a)*0.4); } c.stroke(); }
    [-1,1].forEach(function(s){ c.beginPath(); c.moveTo(s*0.8,-2.2); c.lineTo(s*2.6,-4.6); c.lineTo(s*2.2,-1.6); c.closePath(); c.fillStyle=H||'#2a1e50'; c.fill(); c.strokeStyle='#0a0614'; c.lineWidth=0.4; c.stroke();
      if(!H){ c.beginPath(); c.moveTo(s*1.2,-2.2); c.lineTo(s*2.3,-3.8); c.lineTo(s*2,-2); c.closePath(); c.fillStyle='#ff9ad0'; c.fill(); } });
    if(!H){ [-1,1].forEach(function(s){ hGlow(s*0.95,-0.1,1.6,'255,70,70',0.9); fzEll(c,s*0.95,-0.1,0.65,0.55,'#ff4a4a'); fzDisc(c,s*0.95,0,0.28,'#2a0000'); });
      fzDisc(c,0,1.1,0.35,'#0e0a1e'); c.fillStyle='#ffffff'; c.beginPath(); c.moveTo(-0.7,1.9); c.lineTo(-0.4,2.9); c.lineTo(-0.1,1.9); c.moveTo(0.1,1.9); c.lineTo(0.4,2.9); c.lineTo(0.7,1.9); c.fill(); }
    c.strokeStyle='#0a0614'; c.lineWidth=0.35; c.beginPath(); c.moveTo(-0.8,3.8); c.lineTo(-1,4.6); c.moveTo(0.8,3.8); c.lineTo(1,4.6); c.stroke();
    c.restore(); },
  /* v1.27, the coin «Б» (the maintainer: «б»): a gold coin in detail — a milled rim, a ring of little dots, the sign embossed, a shine
     sweeping across, a twinkle; it wobbles (not turning over), so its sign is always seen. The coin is a cached sprite per sign. */
  coinMake:function(type){ var o=hdOff(14,14), c=o.x, i; c.translate(7,7);
    fzDisc(c,0,0,6.3,'#8a5200'); for(i=0;i<36;i++){ var a=i/36*6.2832; c.fillStyle=i%2?'#c88a10':'#ffe27a'; c.beginPath(); c.moveTo(Math.cos(a)*5.6,Math.sin(a)*5.6); c.lineTo(Math.cos(a+0.09)*6.15,Math.sin(a+0.09)*6.15); c.lineTo(Math.cos(a+0.17)*5.6,Math.sin(a+0.17)*5.6); c.fill(); }
    fzDisc(c,0,0,5.4,fzRg(c,-1.9,-2.2,0.3,0,0,6,['#fffbe0','#ffd24a','#e8a41c','#a86a08'])); c.strokeStyle='#8a5200'; c.lineWidth=0.4; c.beginPath(); c.arc(0,0,5.4,0,6.2832); c.stroke();
    for(i=0;i<16;i++){ var b2=i/16*6.2832; fzDisc(c,Math.cos(b2)*4.6,Math.sin(b2)*4.6,0.22,'rgba(138,82,0,0.6)'); }
    var g=hdOff(14,14), gc=g.x, kh=hx, kw=hdIconW; gc.translate(7,7); hx=gc; hdIconW=1.5; try{ gc.save(); gc.translate(0.3,0.3); hdIcon(type,'rgba(255,245,200,0.8)'); gc.restore(); hdIcon(type,'#140400'); } finally { hx=kh; hdIconW=kw; }
    o.c._sign=g.c; return o.c; },   // the sign apart: drawn over the shine, so the shine never lightens it
  pick:function(x,y,type){ var t=performance.now()/1000, w=0.8+0.2*Math.abs(Math.cos(t*3.2));
    if(!this._cn||this._cnKey!==hdKey){ this._cn={}; this._cnKey=hdKey; } if(!this._cn[type]) this._cn[type]=this.coinMake(type);
    hGlow(x,y,10,'255,215,90',0.45); hx.save(); hx.translate(x,y); hx.scale(w,1); hx.drawImage(this._cn[type],-7,-7,14,14);
    var sw=((t*0.6)%1.6-0.3)*16-8; if(sw>-9&&sw<14){ hx.save(); hx.beginPath(); hx.arc(0,0,5.4,0,6.2832); hx.clip(); hx.fillStyle='rgba(255,255,255,0.42)'; hx.beginPath(); hx.moveTo(sw-1,-7); hx.lineTo(sw+1.2,-7); hx.lineTo(sw-3.8,7); hx.lineTo(sw-6,7); hx.fill(); hx.restore(); }
    hx.drawImage(this._cn[type]._sign,-7,-7,14,14); hx.restore(); var tw=0.5+0.5*Math.sin(t*5); fzStar(hx,x+4.2,y-4.6,1.8*tw+0.3,'#ffffff'); },
  /* v1.27, the fire «Б»: a tongue of flame — layered (a white-hot core, yellow, orange, a red edge), its tail flickering, embers behind */
  bullet:function(x,y){ var t=performance.now()/1000, c=hx, i, k;
    var flame=function(L,w,ph){ c.beginPath(); c.moveTo(2.6,0); c.bezierCurveTo(2.6,-w,0,-w*1.1,-1,-w*0.9); for(k=1;k<=4;k++) c.lineTo(-1-k*L/4,-w*0.9*(1-k/4)+Math.sin(t*25+k*1.7+ph+x*0.3)*w*0.35*(k/4)); for(k=4;k>=1;k--) c.lineTo(-1-k*L/4+0.6,w*0.9*(1-k/4)+Math.sin(t*25+k*1.3+ph+2+x*0.3)*w*0.35*(k/4)); c.lineTo(-1,w*0.9); c.bezierCurveTo(0,w*1.1,2.6,w,2.6,0); c.closePath(); };
    hGlow(x,y,4.2,'255,130,30',0.45); for(i=0;i<3;i++){ var ph=(t*3+i/3+x*0.05)%1; fzDisc(c,x-3-ph*6,y+Math.sin(i*2.3+t*12)*1.1*ph,0.35*(1-ph)+0.1,'rgba(255,'+Math.round(200-ph*100)+',60,'+(0.6*(1-ph))+')'); }
    c.save(); c.translate(x,y); c.lineJoin='round'; flame(3.5,1.9,0); c.fillStyle=fzLg(c,-5,0,2.6,0,['rgba(150,24,0,0.35)','#b8300a','#f0601a']); c.fill(); c.strokeStyle='#5a0c00'; c.lineWidth=0.45; c.stroke();
    c.save(); c.scale(0.75,0.62); flame(3,1.9,1); c.fillStyle=fzLg(c,-5,0,2.6,0,['rgba(255,200,60,0)','#ffb030','#ffe070']); c.fill(); c.restore();
    fzEll(c,0.9,0,1.5,0.9,'#fffbe0'); fzDisc(c,1.3,-0.2,0.5,'#ffffff'); c.restore(); },
  /* v1.27, the bat's shot «Б»: dark magic — an orb with a red core, smoke curling round it */
  ebullet:function(x,y){ var t=performance.now()/1000, c=hx, k; hGlow(x,y,4.6,'200,40,200',0.4);
    for(k=0;k<3;k++){ c.strokeStyle='rgba('+(120+k*30)+',40,'+(150+k*20)+','+(0.45-k*0.1)+')'; c.lineWidth=0.6-k*0.12; c.beginPath(); c.arc(x+0.9+k*0.9,y,1.9+k*0.35,Math.PI*0.6+t*4+k,Math.PI*1.4+t*4+k); c.stroke(); }
    fzDisc(c,x,y,1.9,fzRg(c,x-0.5,y-0.5,0.2,x,y,1.9,['#ffb0e8','#c02aa0','#2a0430'])); c.strokeStyle='#1a0220'; c.lineWidth=0.35; c.beginPath(); c.arc(x,y,1.9,0,6.2832); c.stroke();
    hGlow(x,y,1.6,'255,80,110',0.8); fzDisc(c,x,y,0.75,'#ff4a6a'); fzDisc(c,x-0.6,y-0.7,0.38,'#ffffff'); },
  bursts:function(){ return spKinds({rock:['#c8c3ff','#8a80d0','#5e52a8','#2e2470'],ufo:['#ffffff','#b8a8e8','#5a4a8a','#2a1e50'],ship:['#c8ffe0','#5cd498','#2c9e64','#136640'],pick:['#fffbe0','#ffe066','#ffc233','#c8840c']}); },
  /* v1.27, the fairy tale's explosions (the maintainer: «тучка В, мышь Г, монетка Б, подбит Д»): a cloud bursts into confetti of stars
     and hearts; a bat goes up in dark smoke with bits of wing and red sparks; a coin goes «poof» in golden puffs with stars; the hit dragon
     in a rainbow ring and glitter (spFxTrack in 43_skins.js keeps one record per burst) */
  parts:function(){ spFxTrack(); var c=hx, i, RB=['#d84a98','#d8a000','#10b080','#2a6ad0','#8048d0'];
    var heart=function(X,Y,r,col){ c.fillStyle=col; c.beginPath(); c.moveTo(X,Y+r*0.9); c.bezierCurveTo(X-r*1.4,Y-r*0.1,X-r*0.7,Y-r*1.2,X,Y-r*0.35); c.bezierCurveTo(X+r*0.7,Y-r*1.2,X+r*1.4,Y-r*0.1,X,Y+r*0.9); c.fill(); };
    SPFX.forEach(function(e){ var t=e.t, R2=srand(e.seed), k2;
      if(e.k==='rock') hGlow(e.x,e.y,12*(0.5+t),'200,190,255',0.5*Math.max(0,1-t/0.5));   // v1.29: the «poof» (flash, ring, flying puffs) taken back — the maintainer: «зря мы второй раз увеличили эффекты взрыва тучек, достаточно было одного»
      else if(e.k==='ufo'){ for(k2=0;k2<6;k2++){ var a=R2()*6.2832, d=(2+R2()*5)*Math.min(1,t*4), r=(2+R2()*2)*(0.6+t); c.globalAlpha=Math.max(0,0.6*(1-t/0.7)); fzDisc(c,e.x+Math.cos(a)*d,e.y+Math.sin(a)*d-t*4,r,'#3a2e66'); } c.globalAlpha=1; }
      else if(e.k==='pick'){ if(t<0.15) hGlow(e.x,e.y,10,'255,220,100',0.8*(1-t/0.15));
        for(k2=0;k2<8;k2++){ var a2=R2()*6.2832, d2=(3+R2()*7)*(1-Math.exp(-5*t)), r2=(2+R2()*2.5)*(0.5+t*1.1), al=Math.max(0,1-t/0.75), X=e.x+Math.cos(a2)*d2, Y=e.y+Math.sin(a2)*d2-t*3;
          c.globalAlpha=al; fzDisc(c,X,Y,r2,k2%2?'#ffc233':'#ffe066'); c.strokeStyle='#c8840c'; c.lineWidth=0.4; c.stroke(); fzDisc(c,X-r2*0.3,Y-r2*0.3,r2*0.35,'rgba(255,255,255,0.5)'); } c.globalAlpha=1; }
      else if(e.k==='ship'){ var u=Math.min(1,t/0.45); if(u<1){ var g; if(c.createConicGradient){ g=c.createConicGradient(t*3,e.x,e.y); RB.concat([RB[0]]).forEach(function(col,j){ g.addColorStop(j/5,col); }); } else g='#c89aff';
          c.strokeStyle=g; c.globalAlpha=1-u; c.lineWidth=2*(1-u)+0.3; c.beginPath(); c.arc(e.x,e.y,3+u*20,0,6.2832); c.stroke(); c.globalAlpha=1; } } });
    parts.forEach(function(p){ var f=p.life/p.max, k=p._k, col=p.cols[Math.min(p.cols.length-1,Math.floor((1-f)*p.cols.length))], age=p.max-p.life, tw=0.6+0.4*Math.sin(age*25+p._i);
      c.globalAlpha=Math.min(1,f*1.7);
      if(k==='rock'){ if(p._i%3===0) heart(p.x,p.y,(1.3+f)*tw,p._i%2?'#ff5a9a':'#ffc42a'); else fzStar(c,p.x,p.y,(1.6+f*1.6)*tw,p.cols[1+p._i%3]); }   // strong colours: the sky is light
      else if(k==='ufo'){ if(p._i%4===0){ c.save(); c.translate(p.x,p.y); c.rotate(((p._i*37)%13-6)*age); c.beginPath(); c.moveTo(0,0); c.quadraticCurveTo(1.6,-1.2,3,-0.6); c.quadraticCurveTo(2,0,2.6,0.8); c.quadraticCurveTo(1.2,0.2,0,0.6); c.closePath(); c.fillStyle='#5a4a8a'; c.fill(); c.restore(); }
        else if(p._i%4===1) fzDisc(c,p.x,p.y,0.5,'#ff4a4a'); else fzStar(c,p.x,p.y,0.6+f*0.6,'#d8c8ff'); }
      else if(k==='pick'){ if(p._i<10||p._i%2) fzStar(c,p.x,p.y,(0.7+f*0.8)*tw,p._i%2?'#ffffff':'#ffe066'); }
      else if(k==='ship'){ c.globalAlpha*=Math.sin(age*40+p._i)>-0.3?1:0.3; fzDisc(c,p.x,p.y,0.35+f*0.45,['#ff9ad6','#ffe066','#7affc8','#7ab8ff','#c89aff'][p._i%5]); }
      else fzDisc(c,p.x,p.y,0.45+f*0.7,col); }); c.globalAlpha=1; },
  shield:function(){ return '#ffd23f'; }, mini:function(){ return ['#1f8a5a','#3fc486']; },
  /* v1.27, the shield «Б3, край ярче, толще, пульсирует»: a soap bubble — a faint film, a thick bright rainbow rim turning slowly and
     pulsing, a white inner line on it, a shine on the top left, stars twinkling round the rim */
  shieldRing:function(x,y,t){ var c=hx, cx=x+4, p=0.5+0.5*Math.sin(t*6), i, g;   // round the dragon's middle (its tail reaches back)
    c.save(); c.beginPath(); c.ellipse(cx,y,12.5,10,0,0,6.2832); c.fillStyle=fzRg(c,cx,y,6,cx,y,12.5,['rgba(255,255,255,0)','rgba(220,240,255,0.2)']); c.fill();
    if(c.createConicGradient){ g=c.createConicGradient(t*0.8,cx,y); ['#d84a98','#d8a000','#10b080','#2a6ad0','#8048d0','#d84a98'].forEach(function(col,k){ g.addColorStop(k/5,col); }); } else g=fzLg(c,cx-12,y,cx+12,y,['#d84a98','#d8a000','#10b080','#2a6ad0','#8048d0']);   // a little darker («радужность пузыря — чуть темнее»)
    c.strokeStyle=g; c.lineWidth=1.5+0.6*p; c.beginPath(); c.ellipse(cx,y,12.5,10,0,0,6.2832); c.stroke();
    c.strokeStyle='rgba(255,255,255,'+(0.45+0.35*p)+')'; c.lineWidth=0.45; c.beginPath(); c.ellipse(cx,y,12.5,10,0,0,6.2832); c.stroke();
    c.strokeStyle='rgba(255,255,255,0.9)'; c.lineWidth=0.7; c.beginPath(); c.ellipse(cx,y,10.6,8.1,0,Math.PI*1.1,Math.PI*1.45); c.stroke(); fzDisc(c,cx+6,y-6,0.7,'rgba(255,255,255,0.8)');
    for(i=0;i<6;i++){ var a=i/6*6.2832+t*1.5, tw=0.5+0.5*Math.sin(t*8+i*2); fzStar(c,cx+Math.cos(a)*12.5,y+Math.sin(a)*10,1.3*tw+0.2,'#ffffff'); } c.restore(); } };

/* the readability audit of the HD pictures (tests/skin_audit.js with HD=1, v0.73): each HD object drawn alone on a transparent canvas at
   the HD scale, the sky (with its veil) at one game pixel per pixel; the clock is held at 0 so spinning things face the viewer */
function hdIds(){ return Object.keys(HDSK); }
function hdProbe(id){ var sk=HDSK[id], out={}, keep=hx, pn=performance.now; if(!hdCv) hdSize(); noLight=true; performance.now=function(){ return 0; };
  function grab(w,h,sc,fn){ var c=document.createElement('canvas'); c.width=Math.ceil(w*sc); c.height=Math.ceil(h*sc); hx=c.getContext('2d'); hx.setTransform(sc,0,0,sc,0,0); hx.imageSmoothingEnabled=true;
    try{ fn(); } finally { hx=keep; } return {w:c.width,h:c.height,d:Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data)}; }
  try{
    var bg=grab(LW,LH,1,function(){ sk.sky(0,0); }); out.bg=bg.d; out.bgW=bg.w; out.bgH=bg.h;
    out.motes=sk.motes||[]; out.shotsByShape=sk.shotsByShape||'';
    out.rocks=[0,1,2].map(function(sz){ var sp=makeSkinRock(sk,sz,Core.R_SIZE[sz],sz*17+3), r=Math.ceil(sp.r||rockR(sk,sz,Core.R_SIZE[sz])); return grab(r*3.2,r*3.2,hs,function(){ sk.drawRock(sp,r*1.6,r*1.6); }); });
    out.ship=grab(48,28,hs,function(){ sk.ship(16,14,0.3,false); });
    out.ufo=grab(36,22,hs,function(){ sk.ufo(18,11,true,false); });
    out.ufoS=grab(30,18,hs,function(){ sk.ufo(15,9,false,false); });
    out.pick=grab(28,28,hs,function(){ sk.pick(14,14,'shield'); });
    out.bullet=grab(16,8,hs,function(){ sk.bullet(10,4); });
    out.ebullet=grab(12,12,hs,function(){ sk.ebullet(6,6); });
  } finally { performance.now=pn; noLight=false; lights=[]; }
  return out; }
