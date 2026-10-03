/* ── SKINS DRAWN AS SHAPES (v0.74, the maintainer: «вектор 80-х, неон, тетрадка — вот это интересно, и геймбой посмотреть»). Their HD
   pictures (v0.76: the pixel ones of vector, neon and notebook are in 47_pixskins.js; the LCD has none — its picture here, at one pixel
   per game pixel and blown up without smoothing, is already whole pixels: hdOnly / hdPix in 45_hd.js). Readability by the same audit (HD=1 node tests/skin_audit.js):
   objects stand out by lightness and by shape (the enemy shots have a shape of their own), not by black frames. ── */
function lwMin(w){ return Math.max(w,0.9/hs); }                                   // a line never thinner than about a screen pixel's worth
function polyAt(c,P){ c.beginPath(); for(var i=0;i<P.length;i++){ if(i) c.lineTo(P[i][0],P[i][1]); else c.moveTo(P[i][0],P[i][1]); } c.closePath(); }
function rockPoly(r,seed,n){ var R2=srand(seed*977+13), pts=[]; for(var i=0;i<n;i++) pts.push([i/n*6.2832+R2()*0.25,0.78+R2()*0.32]); return pts; }
function turnPts(pts,r,a0,x,y){ return pts.map(function(p){ return [x+Math.cos(p[0]+a0)*r*p[1],y+Math.sin(p[0]+a0)*r*p[1]]; }); }

/* ════════ VECTOR 80s: an arcade vector monitor — black, thin phosphor lines with a soft bloom, the picture fades rather than vanishes
   (afterglow trails — v1.29: no longer, they went to the LCD), a far wireframe planet and a mountain horizon, scanlines; the enemy shots are amber crosses ════════ */
var PHOS='216,255,240', PHG='120,255,200', VMAG='255,90,220', VMAGW='255,189,241';   // 1.29a: the power-ups' magenta and its white-hot core
function vline(fn,w,a,rgb){ var g=rgb||PHG; a=a===undefined?1:a; hx.lineJoin='round'; hx.lineCap='round';
  hx.strokeStyle='rgba('+g+','+(0.16*a)+')'; hx.lineWidth=lwMin(w)*4.5; fn(); hx.stroke();
  hx.strokeStyle='rgba('+g+','+(0.35*a)+')'; hx.lineWidth=lwMin(w)*2.2; fn(); hx.stroke();
  hx.strokeStyle='rgba('+(rgb?(rgb===VMAG?VMAGW:'255,214,150'):PHOS)+','+a+')'; hx.lineWidth=lwMin(w); fn(); hx.stroke(); }
/* v1.29: a soft round glow (the modern vector look's lights) */
function vGlow(c,X,Y,r,rgb,a){ var g=c.createRadialGradient(X,Y,0,X,Y,r); g.addColorStop(0,'rgba('+rgb+','+a+')'); g.addColorStop(1,'rgba('+rgb+',0)'); c.fillStyle=g; c.beginPath(); c.arc(X,Y,r,0,6.2832); c.fill(); }
HDSK.vector={id:'vector', hd:true, glow:false, nolight:true, motes:['#557a6e','#4a6a60'],
  ui:{veil:0.55,band:'#7affc8',btn:'#3fc896',btnHi:'#9affd8'},
  sky:function(dt,s){ var me=this, i, t=performance.now()/1000;
    if(!this._st||this._key!==hdKey){ this._key=hdKey; var R2=srand(31); this._st=[]; for(i=0;i<Math.round(LW*LH/900);i++) this._st.push({x:R2()*LW,y:R2()*LH*0.8,z:R2()});
      this._mt=[]; var x=0; while(x<LW*2+40){ this._mt.push([x,LH*(0.9-R2()*0.09-(R2()>0.8?0.05:0))]); x+=8+R2()*16; }
      this._px=LW*0.7; this._mx=0;
      var sl=hdOff(4,2); sl.x.fillStyle='rgba(0,0,0,0.28)'; sl.x.fillRect(0,1.2,4,0.5); this._scan=sl.c; this._scanP=null; }
    // v1.29: wiped every frame — no afterglow trails any more (the maintainer: «из первого убрать остаточные пиксели при перемещениях»; they went to the LCD)
    hx.fillStyle='#020504'; hx.fillRect(-2,-2,LW+4,LH+4);
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
  /* v1.29, the rock «В»: glass — a faint fill lit from the top left (the light stays as it turns), the bright outline, a small glowing dot
     on every corner */
  drawRock:function(sp,x,y){ var cx=x+(sp.ox||0), r=sp.r, P=turnPts(sp.pts,r,sp.rot/16*6.2832,cx,y), g=hx.createLinearGradient(cx-r,y-r,cx+r,y+r), d=Math.max(0.6,r*0.06);
    g.addColorStop(0,'rgba('+PHG+',0.22)'); g.addColorStop(1,'rgba('+PHG+',0.02)'); hx.fillStyle=g; polyAt(hx,P); hx.fill();
    vline(function(){ polyAt(hx,P); },0.65,1);
    var dot=this.vecSpr('dot',4,4,function(c){ vGlow(c,2,2,2,PHOS,0.85); }); P.forEach(function(q){ hx.drawImage(dot,q[0]-d*1.6,q[1]-d*1.6,d*3.2,d*3.2); }); },
  /* v1.29 — minimalism in a modern wrapper (the maintainer: «это же вектор 80-х.. минимализм, но в современной обертке»): thin crisp lines
     in a soft blurred bloom, drawn once into sprites; glow dots live. The ship «Д6»: a chevron of three strokes with gaps at its corners,
     a glowing dot at each stroke's end and a brighter one at the nose, the engine a short glowing dash that breathes */
  vecSpr:function(key,w,h,fn){ this._spr=this._spr||{}; if(this._sprKey!==hdKey){ this._spr={}; this._sprKey=hdKey; } if(!this._spr[key]){ var o=hdOff(w,h); fn(o.x,hs); this._spr[key]=o.c; } return this._spr[key]; },
  shipMake:function(c,sc){ var G=function(){ c.beginPath(); c.moveTo(17.4,-0.6); c.lineTo(3.6,-5.9); c.moveTo(17.4,0.6); c.lineTo(3.6,5.9); c.moveTo(2.6,-4.8); c.lineTo(5.6,-0.9); c.moveTo(2.6,4.8); c.lineTo(5.6,0.9); };
    c.translate(3,9); c.lineJoin='round'; c.lineCap='round'; c.save(); c.shadowColor='rgba('+PHG+',0.9)'; c.shadowBlur=5*sc; c.strokeStyle='rgba('+PHG+',0.6)'; c.lineWidth=1.25; G(); c.stroke(); c.restore();   // v1.29: bolder («линии пожирнее.. и у корабля тоже»)
    c.strokeStyle='rgb('+PHOS+')'; c.lineWidth=0.6; G(); c.stroke();
    [[3.6,-5.9],[3.6,5.9],[2.6,-4.8],[5.6,-0.9],[2.6,4.8],[5.6,0.9]].forEach(function(q){ vGlow(c,q[0],q[1],1.1,PHOS,0.9); }); vGlow(c,18.6,0,1.6,PHOS,1); },
  ship:function(x,y,t,blink){ if(blink) return; var me=this; hx.drawImage(this.vecSpr('ship',26,18,function(c,sc){ me.shipMake(c,sc); }),x-3,y-9,26,18);
    if(!shipBare){ vGlow(hx,x+4,y,2.4+0.4*Math.sin(t*20),PHG,0.9); vline(function(){ hx.beginPath(); hx.moveTo(x+3,y); hx.lineTo(x+5,y); },0.3,1); } },
  /* v1.29, the saucer «Е3»: an amber capsule drawn with gaps (like the ship), a soft amber glow under it, five lights inside, one running
     along them (the enemies amber, like their shots); hit once — its line burns brighter */
  ufoMake:function(c,sc,hurt){ var G=function(){ c.beginPath(); c.moveTo(-6.5,-3); c.lineTo(6.5,-3); c.moveTo(-6.5,3); c.lineTo(6.5,3); c.moveTo(-8.6,-2.2); c.arc(-7,0,3,-Math.PI*0.65,-Math.PI*1.35,true); c.moveTo(8.6,-2.2); c.arc(7,0,3,-Math.PI*0.35,Math.PI*0.35,false); };
    c.translate(14,8); vGlow(c,0,2,10,'255,170,60',0.2); c.lineJoin='round'; c.lineCap='round'; c.save(); c.shadowColor='rgba(255,170,60,0.9)'; c.shadowBlur=(hurt?7:5)*sc; c.strokeStyle='rgba(255,170,60,'+(hurt?0.8:0.55)+')'; c.lineWidth=hurt?1.1:0.8; G(); c.stroke(); c.restore();
    c.strokeStyle=hurt?'#ffffff':'rgb(255,226,170)'; c.lineWidth=0.35; G(); c.stroke(); },
  ufo:function(ux,uy,big,hurt){ var me=this, k=big?1:0.72, t=performance.now()/1000, i;
    hx.save(); hx.translate(ux,uy); hx.scale(k,k); hx.drawImage(this.vecSpr('ufo'+(hurt?1:0),28,16,function(c,sc){ me.ufoMake(c,sc,hurt); }),-14,-8,28,16);
    for(i=0;i<5;i++){ var on=Math.floor(t*8)%5===i; vGlow(hx,-6+i*3,0,on?1.6:0.8,on?'255,226,170':'255,170,60',on?1:0.5); } hx.restore(); },
  /* v1.29, the power-up «Б» (the maintainer: «Б, но можно линии пожирнее»): a diamond of four strokes with gaps at its corners, like the
     ship, a glowing dot at each corner, the sign a glowing line; it breathes */
  /* 1.29a, «В» (the maintainer: «в векторах80 подарки слишком незаметны»): the power-ups glow magenta — everything else is green, the saucers amber */
  pick:function(x,y,type){ var a=0.8+0.2*Math.sin(performance.now()/1000*5), G=VMAG, W=VMAGW;
    var sp=this.vecSpr('pick3'+type,18,18,function(c,sc){ c.translate(9,9); c.lineJoin='round'; c.lineCap='round';
      var D=function(){ c.beginPath(); [[0,-7,7,0],[7,0,0,7],[0,7,-7,0],[-7,0,0,-7]].forEach(function(q){ c.moveTo(q[0]+(q[2]-q[0])*0.2,q[1]+(q[3]-q[1])*0.2); c.lineTo(q[0]+(q[2]-q[0])*0.8,q[1]+(q[3]-q[1])*0.8); }); };
      var keep=hx; hx=c; c.save(); c.shadowColor='rgba('+G+',0.9)'; c.shadowBlur=5*sc; c.strokeStyle='rgba('+G+',0.65)'; c.lineWidth=1.7; D(); c.stroke(); hdIconW=2; hdIconIn(type,'rgba('+G+',0.65)'); c.restore();
      c.strokeStyle='rgb('+W+')'; c.lineWidth=0.85; D(); c.stroke(); hdIconW=1; hdIconIn(type,'rgb('+W+')'); hdIconW=1.2; hx=keep;
      [[0,-7],[7,0],[0,7],[-7,0]].forEach(function(q){ vGlow(c,q[0],q[1],1.3,W,0.95); }); });
    hx.globalAlpha=a; hx.drawImage(sp,x-9,y-9,18,18); hx.globalAlpha=1; },
  /* v1.29, the shot «В»: a comet — a bright head, a long tail melting away; the saucers' shot «В»: an amber ring with a dot (sprites) */
  bullet:function(x,y){ hx.drawImage(this.vecSpr('shot',13,6,function(c){ var g=c.createLinearGradient(1,3,10,3); g.addColorStop(0,'rgba('+PHG+',0)'); g.addColorStop(1,'rgba('+PHG+',0.85)'); c.strokeStyle=g; c.lineWidth=0.8; c.lineCap='round'; c.beginPath(); c.moveTo(1,3); c.lineTo(10,3); c.stroke(); vGlow(c,10,3,2.3,PHG,0.85); vGlow(c,10,3,1,'255,255,255',1); }),x-10,y-3,13,6); },
  ebullet:function(x,y){ hx.drawImage(this.vecSpr('eshot2',9,9,function(c,sc){ c.save(); c.shadowColor='rgba(255,170,60,0.9)'; c.shadowBlur=3*sc; c.strokeStyle='rgba(255,170,60,0.7)'; c.lineWidth=1.1; c.beginPath(); c.arc(4.5,4.5,2.2,0,6.2832); c.stroke(); c.restore();
    c.strokeStyle='rgb(255,196,100)'; c.lineWidth=0.5; c.beginPath(); c.arc(4.5,4.5,2.2,0,6.2832); c.stroke(); vGlow(c,4.5,4.5,1.1,'255,180,70',1); }),x-4.5,y-4.5,9,9); },
  /* v1.29, the explosions «Д» (the maintainer's pick, all four): each breaks into its own parts — a rock into glass shards with glowing
     corners; the saucer's four strokes fly apart and its lights scatter; a power-up's diamond strokes fly outward as its sign flashes; the
     hit ship's strokes fly apart and a ring opens */
  bursts:function(){ var b=spKinds({rock:['#e8fff6','#9affd8','#4ab890'],ufo:['#ffe2aa','#ffaa3c'],ship:['#ffffff','#d8fff0','#7affc8'],pick:['#ffffff','#ffbdf1']});
    ['shield','triple','slow','life'].forEach(function(t){ var a=['#ffffff','#d8fff0']; a.kind='pick'; a.type=t; b['pick_'+t]=a; }); return b; },   // the flash shows the sign taken
  parts:function(){ spFxTrack(); var me=this, AM='255,170,60', i, dot=this.vecSpr('dot',4,4,function(c){ vGlow(c,2,2,2,PHOS,0.85); });
    var seg=function(X,Y,L,a,al,rgb){ if(al<=0) return; vline(function(){ hx.beginPath(); hx.moveTo(X-Math.cos(a)*L,Y-Math.sin(a)*L); hx.lineTo(X+Math.cos(a)*L,Y+Math.sin(a)*L); },0.45,al,rgb); };
    var flash=function(X,Y,t,rgb,r){ if(t<0.12){ var u=t/0.12; vGlow(hx,X,Y,(r||8)*(0.5+u),rgb,0.8*(1-u)); vGlow(hx,X,Y,2.5*(1-u)+0.01,'255,255,255',1); } };
    SPFX.forEach(function(e){ var t=e.t, X=e.x, Y=e.y, d, al, u;
      if(e.k==='rock') flash(X,Y,t,PHG,8);
      else if(e.k==='ufo'){ flash(X,Y,t,AM,10); d=t*26; al=Math.max(0,1-t/0.6); seg(X,Y-3-d,6.5,t*4,al,AM); seg(X,Y+3+d,6.5,-t*4,al,AM); seg(X-7-d*1.2,Y,2.5,1.57+t*4,al,AM); seg(X+7+d*1.2,Y,2.5,1.57-t*4,al,AM); }
      else if(e.k==='pick'){ if(t<0.15) vGlow(hx,X,Y,8,VMAG,0.6*(1-t/0.15)); d=t*30; al=Math.max(0,1-t/0.5); [[1,-1],[1,1],[-1,1],[-1,-1]].forEach(function(q,k){ seg(X+q[0]*(3.5+d),Y+q[1]*(3.5+d),2.4,(k%2?-1:1)*0.785,al,VMAG); });
        if(t<0.2){ hx.save(); hx.translate(X,Y); hx.globalAlpha=1-t/0.2; hdIcon((e.cols&&e.cols.type)||'shield','rgb('+VMAGW+')'); hx.restore(); hx.globalAlpha=1; } }
      else if(e.k==='ship'){ flash(X,Y,t,PHG,12); d=t*22; al=Math.max(0,1-t/0.6); u=Math.min(1,t/0.45); if(u<1) vline(function(){ hx.beginPath(); hx.arc(X,Y,3+u*20,0,6.2832); },0.35,1-u);
        [[6,-3,0.36],[6,3,-0.36],[-3,-3,0.9],[-3,3,-0.9]].forEach(function(q,k){ var a=Math.atan2(q[1],q[0]); seg(X+q[0]+Math.cos(a)*d,Y+q[1]+Math.sin(a)*d,k<2?6:2,q[2]+t*(k%2?5:-5),al); }); } });
    parts.forEach(function(p){ var f=p.life/p.max, k=p._k, age=p.max-p.life, al=Math.min(1,f*1.8), c=p.cols[Math.min(p.cols.length-1,Math.floor((1-f)*p.cols.length))];
      if(k==='rock'){ if(p._i%3) return; var s=1.2+(p._i%5)*0.35, a=((p._i*37)%13-6)*age, ca=Math.cos(a), sa=Math.sin(a), T=[[s,0],[-s*0.6,s*0.6],[-s*0.4,-s*0.7]].map(function(v){ return [p.x+v[0]*ca-v[1]*sa,p.y+v[0]*sa+v[1]*ca]; });
        hx.globalAlpha=al*0.25; hx.fillStyle='rgb('+PHG+')'; polyAt(hx,T); hx.fill(); hx.globalAlpha=1; vline(function(){ polyAt(hx,T); },0.3,al); hx.globalAlpha=al; hx.drawImage(dot,T[0][0]-1.3,T[0][1]-1.3,2.6,2.6); hx.globalAlpha=1; }
      else if(k==='ufo'){ if(p._i%4) return; hx.globalAlpha=al; vGlow(hx,p.x,p.y,0.6+f,'255,226,170',1); hx.globalAlpha=1; }
      else if(k==='pick'||k==='ship'){ }   // their strokes say it
      else { hx.globalAlpha=Math.min(1,f*1.6); hx.fillStyle=c; hx.beginPath(); hx.arc(p.x,p.y,0.45+f*0.7,0,6.2832); hx.fill(); hx.globalAlpha=1; } }); },
  shield:function(){ return '#7affc8'; }, mini:function(){ return ['#2a8a6a','#d8fff0']; },
  /* v1.29, the shield «Е»: an oval of 14 glowing dots, a wave of light running round them */
  shieldRing:function(x,y,t){ for(var i=0;i<14;i++){ var a=i/14*6.2832, w=0.5+0.5*Math.sin(t*6-i*0.9); vGlow(hx,x+8+Math.cos(a)*12.5,y+Math.sin(a)*10,1+w*0.8,w>0.6?PHOS:PHG,0.5+0.5*w); } } };

/* ════════ NEON: synthwave night — a striped sun sinking behind a wireframe range, a glowing grid floor that runs by, stars; every object a
   bright neon tube over a dark glass body ════════ */
var NEON_PICK={shield:'#3ff7ff',triple:'#ffb13b',slow:'#ff5a9a',life:'#a8ff3a'};   // «сердце — салатовым, а часы песочные — розовым»
    // v1.27: each power-up its own colour; slow lime, not violet (the maintainer: «не будет у нас сливаться фиолетовый знак с маленькими астероидами??» — it would: ΔE 12–24 to their lines)
var NEON_SUN=['#ffe25a','#ff9a4a','#ff3f8e','#a03ad0'], NEON_SHARD=['#6a2aa8','#3a1470','#8a4ad0'];
/* v1.28: a crystal shard of a broken neon rock — a violet triangle in a pink tube */
function neShard(X,Y,s,ang,fill,edge,a){ if(a<=0) return; var ca=Math.cos(ang), sa=Math.sin(ang), T=[[s,0],[-s*0.6,s*0.55],[-s*0.4,-s*0.7]].map(function(q){ return [X+q[0]*ca-q[1]*sa,Y+q[0]*sa+q[1]*ca]; });
  hx.globalAlpha=a; polyAt(hx,T); hx.fillStyle=fill; hx.fill(); hx.globalAlpha=1; nline(function(){ polyAt(hx,T); },edge,0.25,a); }
function nline(fn,col,w,a){ a=a===undefined?1:a; hx.lineJoin='round'; hx.lineCap='round';
  hx.globalAlpha=0.22*a; hx.strokeStyle=col; hx.lineWidth=lwMin(w)*3.6; fn(); hx.stroke();
  hx.globalAlpha=0.95*a; hx.lineWidth=lwMin(w)*1.3; fn(); hx.stroke();
  hx.globalAlpha=0.9*a; hx.strokeStyle='#ffffff'; hx.lineWidth=lwMin(w)*0.45; fn(); hx.stroke(); hx.globalAlpha=1; }
HDSK.neon={id:'neon', hd:true, pickW:12, glow:false, nolight:true, veil:'rgba(8,2,22,0.64)', motes:['#c9b8ff','#ffc8e8'],
  ui:{veil:0.5,band:'#ff4fd8',btn:'#e04ed0',btnHi:'#ff8ae8'},
  bgMake:function(){ var w=LW, h=LH, o=hdOff(w,h), x=o.x, hz=h*0.7, R2=srand(12), i;
    var g=x.createLinearGradient(0,0,0,hz); g.addColorStop(0,'#07031a'); g.addColorStop(0.6,'#1a0838'); g.addColorStop(1,'#3a0c4a'); x.fillStyle=g; x.fillRect(0,0,w,hz);
    var g2=x.createLinearGradient(0,hz,0,h); g2.addColorStop(0,'#1a0630'); g2.addColorStop(1,'#07020e'); x.fillStyle=g2; x.fillRect(0,hz,w,h-hz);
    for(i=0;i<Math.round(w*h/260);i++){ var z=R2(); x.fillStyle=z>0.85?'rgba(255,200,232,0.8)':'rgba(201,184,255,'+(0.25+z*0.4)+')'; x.fillRect(R2()*w,R2()*hz*0.95,0.5+z*0.3,0.5+z*0.3); }
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
  /* v1.28, the rock «Б» (a crystal): facets from a point up and left of the middle, each its own shade of violet by where it faces (the
     light stays top-left while the rock turns), thin violet facet lines, the pink tube, a white glint on the lit side of the bigger ones */
  drawRock:function(sp,x,y){ var cx=x+(sp.ox||0), r=sp.r, P=turnPts(sp.pts,r,sp.rot/16*6.2832,cx,y), c=[cx-r*0.18,y-r*0.14], i, n, lit, best=0, bl=-9;
    hx.fillStyle='rgb(22,6,44)'; polyAt(hx,P); hx.fill();
    for(i=0;i<P.length;i++){ n=P[(i+1)%P.length]; lit=Math.max(0,(-(P[i][0]+n[0])/2+cx-(P[i][1]+n[1])/2+y)/(r*1.4));
      hx.beginPath(); hx.moveTo(c[0],c[1]); hx.lineTo(P[i][0],P[i][1]); hx.lineTo(n[0],n[1]); hx.closePath();
      hx.fillStyle='rgb('+Math.round(22+lit*80)+','+Math.round(6+lit*22)+','+Math.round(44+lit*90)+')'; hx.fill();
      if(-P[i][0]+cx-P[i][1]+y>bl){ bl=-P[i][0]+cx-P[i][1]+y; best=i; } }
    nline(function(){ hx.beginPath(); P.forEach(function(q){ hx.moveTo(c[0],c[1]); hx.lineTo(q[0],q[1]); }); },'#b070f0',0.22,0.55);
    nline(function(){ polyAt(hx,P); },'#ef9aff',0.85,1);
    if(r>6){ hx.strokeStyle='rgba(255,255,255,0.85)'; hx.lineWidth=lwMin(0.3); hx.lineCap='round'; hx.beginPath(); hx.moveTo(P[best][0]*0.7+c[0]*0.3,P[best][1]*0.7+c[1]*0.3); hx.lineTo(c[0]*0.8+P[best][0]*0.2,c[1]*0.8+P[best][1]*0.2); hx.stroke(); } },
  /* v1.27, the ship «ДВ» (the maintainer: «бирюзовый край из дв2, пламя из дв3, закатные полосы из дв3, без стопогней»): a delta wing of
     dark glass in a turquoise neon tube — violet hatching over its top half, sunset stripes across its lower half, a pink and a blue flame,
     a turquoise canopy line */
  ship:function(x,y,t,blink){ if(blink) return; var fl=0.75+0.25*Math.sin(t*35), i;
    var D=function(){ hx.beginPath(); hx.moveTo(x+21,y); hx.lineTo(x+3,y-7); hx.lineTo(x+5,y-2); hx.lineTo(x+1.5,y-2); hx.lineTo(x+1.5,y+2); hx.lineTo(x+5,y+2); hx.lineTo(x+3,y+7); hx.closePath(); };
    if(!shipBare) [[-1.2,'#ff5ad0'],[1.2,'#3fb8ff']].forEach(function(q){ nline(function(){ hx.beginPath(); hx.moveTo(x+1.5,y+q[0]-0.5); hx.lineTo(x+1.5-7*fl,y+q[0]); hx.lineTo(x+1.5,y+q[0]+0.5); },q[1],0.45,0.9); });
    D(); hx.fillStyle='rgba(8,4,26,0.97)'; hx.fill();
    hx.save(); D(); hx.clip(); hx.beginPath(); hx.rect(x,y-8,24,8); hx.clip(); hx.strokeStyle='rgba(180,74,255,0.45)'; hx.lineWidth=0.2; hx.beginPath(); for(i=-10;i<24;i+=2){ hx.moveTo(x+i,y-8); hx.lineTo(x+i+8,y+8); hx.moveTo(x+i,y+8); hx.lineTo(x+i+8,y-8); } hx.stroke(); hx.restore();
    hx.save(); D(); hx.clip(); hx.beginPath(); hx.rect(x,y+0.2,24,8); hx.clip(); ['#ffe25a','#ffb04a','#ff7a4a','#ff3f8e','#c03ad0','#7a3ad0'].forEach(function(c,k){ hx.fillStyle=c; hx.fillRect(x,y+0.6+k*1.1,23,0.6); }); hx.restore();
    nline(D,'#6ffbe0',0.8,1); nline(function(){ hx.beginPath(); hx.moveTo(x+9,y-0.9); hx.lineTo(x+17,y-0.3); },'#6ffbe0',0.35,0.9); },
  /* v1.27, the saucer «верх от В, низ от А»: a mirror-ball dome — little facets catching the light, glints sliding over it — on the old
     dark saucer with its pink neon rim and blinking lights */
  ufo:function(ux,uy,big,hurt){ var k=big?1:0.72, t=performance.now()/1000, i, r, c2;
    hx.save(); hx.translate(ux,uy); hx.scale(k,k); hx.fillStyle='rgba(26,3,22,0.96)'; hx.beginPath(); hx.ellipse(0,0.5,10,3,0,0,6.2832); hx.fill();
    hx.save(); hx.beginPath(); hx.ellipse(0,-1.4,4.8,4.6,0,Math.PI,0); hx.closePath(); hx.clip(); hx.fillStyle='rgba(26,3,22,0.96)'; hx.fillRect(-5,-7,10,7);
    if(!hurt) for(r=0;r<5;r++) for(c2=-6;c2<=6;c2++){ var X=c2*0.9+(r%2)*0.45, Y=-1.6-r*0.9, kk=(Math.sin(t*4+c2*1.3+r*2.1)+1)/2; hx.fillStyle='rgb('+(120+kk*135|0)+','+(100+kk*155|0)+','+(200+kk*55|0)+')'; hx.fillRect(X-0.4,Y-0.4,0.8,0.8); }
    hx.restore();
    nline(function(){ hx.beginPath(); hx.moveTo(4.8,-1.4); hx.ellipse(0,-1.4,4.8,4.6,0,0,Math.PI,true); },hurt?'#ffffff':'#c9b8ff',0.4/k,1);
    nline(function(){ hx.beginPath(); hx.ellipse(0,0.5,10,3,0,0,6.2832); },hurt?'#ffffff':'#ff9aea',0.6/k,1);
    for(i=0;i<5;i++){ hx.fillStyle=(Math.floor(t*6)+i)%2?'#fff27a':'#7affff'; hx.beginPath(); hx.arc(-6+i*3,0.8,0.55,0,6.2832); hx.fill(); }
    if(!hurt) for(i=0;i<2;i++){ var a=t*1.5+i*3; hGlow(Math.cos(a)*3.4,-3.2+Math.sin(a)*1.2,1.4,'255,255,255',0.8); }
    hx.restore(); },
  /* v1.27, the power-up «В» (the maintainer: «в, но толщина знаков внутри, как сейчас»): a neon sign of its kind's colour — shield turquoise,
     triple orange, slow violet, life pink — on a dark plate; the sign a plain thick line of the same colour, as thick as before */
  pick:function(x,y,type){ var t=performance.now()/1000, a=0.9+0.1*Math.sin(t*5), c=NEON_PICK[type]||'#fff08a';
    hx.fillStyle='rgba(12,6,26,0.97)'; hx.beginPath(); hx.roundRect(x-5.6,y-5.6,11.2,11.2,2.5); hx.fill();
    nline(function(){ hx.beginPath(); hx.roundRect(x-5.6,y-5.6,11.2,11.2,2.5); },c,0.8,a);
    hx.save(); hx.translate(x,y); if(type==='life') hx.scale(1.25,1); hdIcon(type,c); hx.restore(); },   // the heart wider («сердце в hd — шире»)   // the sign a plain thick line of its colour (the maintainer: «внутри элемент без обводки… просто толстой линией как сейчас»)
  /* v1.27, the shot «Г»: a double chevron » in the ship's turquoise */
  bullet:function(x,y){ nline(function(){ hx.beginPath(); hx.moveTo(x-1,y-1.8); hx.lineTo(x+1.6,y); hx.lineTo(x-1,y+1.8); hx.moveTo(x-3.4,y-1.8); hx.lineTo(x-0.8,y); hx.lineTo(x-3.4,y+1.8); },'#6ffbe0',0.55,1); },
  /* v1.27, the saucer's shot «Г»: an orange-red neon triangle pointing at the ship (red: told from the pink hourglass power-up) */
  ebullet:function(x,y){ nline(function(){ hx.beginPath(); hx.moveTo(x-2.4,y); hx.lineTo(x+1.6,y-2); hx.lineTo(x+1.6,y+2); hx.closePath(); },'#ff6a2a',0.55,1); },
  /* v1.28, the explosions (the maintainer: «подарок д, астероид д, нло г, подбит е»): a rock shatters into crystal shards (violet facets,
     pink edges) and pink sparks; a saucer tears like a worn tape — the flash in cyan and pink bars, square bits; a power-up's frame grows
     and fades in its own colour with sparkles; the hit ship throws out short sunset rays, then sunset dots */
  bursts:function(){ var b=spKinds({rock:['#ffffff','#f0a8ff','#e07aff','#8a3ad0'],ufo:['#ffffff','#ff9ae8','#ff5ad0'],ship:['#ffffff','#9affee','#3ff7d0','#ffb13b'],pick:['#ffffff','#3ff7ff']});
    Object.keys(NEON_PICK).forEach(function(t){ var a=['#ffffff',NEON_PICK[t]]; a.kind='pick'; b['pick_'+t]=a; }); return b; },
  parts:function(){ spFxTrack(); var i, u, SUN=NEON_SUN;
    SPFX.forEach(function(e){ var t=e.t, R2=srand(e.seed), X=e.x, Y=e.y;
      if(e.k==='rock'){ if(t<0.15){ u=t/0.15; hGlow(X,Y,12*(0.5+u),'239,154,255',0.85*(1-u)); fzDisc(hx,X,Y,3.5*(1-u),'#ffffff'); } }
      else if(e.k==='ufo'){ if(t<0.15){ u=t/0.15; hGlow(X,Y,10*(0.5+u),'255,90,208',0.85*(1-u)); fzDisc(hx,X,Y,3.5*(1-u),'#ffffff'); }
        var al=Math.max(0,1-t/0.45); for(i=0;i<7;i++){ var yy=(R2()-0.5)*16*(0.6+t*1.5), w=(4+R2()*12)*(0.6+t*1.8), dx=(R2()-0.5)*32*t, hh=0.8+R2()*0.8; if(al<=0) continue;
          hx.globalAlpha=al*0.8; hx.fillStyle=i%2?'#3ff7ff':'#ff3f8e'; hx.fillRect(X+dx-w/2+(i%2?1:-1)*t*6,Y+yy,w,hh); } hx.globalAlpha=1; }
      else if(e.k==='pick'){ var c=(e.cols&&e.cols[1])||'#3ff7ff', v=Math.min(1,t/0.4), sq=5.6+v*9;
        if(v<1) nline(function(){ hx.beginPath(); hx.roundRect(X-sq,Y-sq,sq*2,sq*2,2.5+v*2); },c,0.6,1-v);
        if(t<0.5) hGlow(X,Y,10*(0.5+t),hex(c).join(','),0.4*(1-t/0.5));
        if(t<0.6){ hx.globalAlpha=1-t/0.6; for(i=0;i<8;i++){ var a=i/8*6.2832+0.4, d=4+t*20; sparkleAt(hx,X+Math.cos(a)*d,Y+Math.sin(a)*d-t*6,1.3,i%2?'#ffffff':c); } hx.globalAlpha=1; } }
      else if(e.k==='ship'){ if(t<0.15){ u=t/0.15; hGlow(X,Y,12*(0.5+u),'111,251,224',0.85*(1-u)); fzDisc(hx,X,Y,3.5*(1-u),'#ffffff'); }
        var w2=Math.min(1,t/0.35); for(i=0;i<12;i++){ var a2=i/12*6.2832+R2()*0.3, ex=R2(); if(w2>=1) continue; var r0=2+w2*14, r1=r0+(3+ex*4)*(1-w2);
          nline(function(){ hx.beginPath(); hx.moveTo(X+Math.cos(a2)*r0,Y+Math.sin(a2)*r0); hx.lineTo(X+Math.cos(a2)*r1,Y+Math.sin(a2)*r1); },SUN[i%4],0.35,1-w2); } } });
    parts.forEach(function(p){ var f=p.life/p.max, k=p._k, age=p.max-p.life, al=Math.min(1,f*1.8), c=p.cols[Math.min(p.cols.length-1,Math.floor((1-f)*p.cols.length))];
      if(k==='rock'){ if(p._i%3===0) neShard(p.x,p.y,1.4+(p._i%5)*0.35,((p._i*37)%13-6)*age,NEON_SHARD[(p._i>>1)%3],'#ef9aff',al); else if(p._i%3===1){ hx.globalAlpha=al; fzDisc(hx,p.x,p.y,0.35+f*0.4,'#f0a8ff'); } }
      else if(k==='ufo'){ if(p._i%2){ var sz=0.7+(p._i%4)*0.25; hx.globalAlpha=al; hx.fillStyle=p._i%4===1?'#ff5ad0':'#ffffff'; hx.fillRect(p.x-sz/2,p.y-sz/2,sz,sz); } }
      else if(k==='pick'){ }   // the frame and the sparkles say it
      else if(k==='ship'){ if(p._i%2){ hx.globalAlpha=Math.min(1,f*1.6); fzDisc(hx,p.x,p.y,0.4+f*0.5,SUN[Math.min(3,Math.floor((1-f)*4))]); } }
      else { hx.globalAlpha=Math.min(1,f*1.6); fzDisc(hx,p.x,p.y,0.45+f*0.7,c); }
      hx.globalAlpha=1; }); },
  shield:function(){ return '#3ff7d0'; }, mini:function(){ return ['#1a8a78','#3ff7d0']; },
  /* v1.27, the shield «Г»: two arcs — turquoise and pink — turning opposite ways round the ship */
  shieldRing:function(x,y,t){ nline(function(){ hx.beginPath(); hx.ellipse(x+10,y,12.5,10,0,t*2,t*2+4.2); },'#3ff7d0',0.45,0.9); nline(function(){ hx.beginPath(); hx.ellipse(x+10,y,11,8.6,0,-t*2.6,-t*2.6+3.6); },'#ff5ad0',0.35,0.9); } };

/* ════════ NOTEBOOK: a squared school page with a red margin; pencil doodles (a sun, a ringed planet, stars, clouds) drift by behind;
   everything that matters is drawn in blue ballpoint (the enemies in red pen), rocks hatched on their shadow side, the power-up coloured
   with a yellow highlighter ════════ */
var PEN='#1d3fa0', RED='#a8142c', NTINT='rgba(208,218,242,0.96)';   // v0.80: rocks, the ship and the saucer tinted pale blue, as if coloured in with the pen (the maintainer's pick «Б»)
/* v1.29: pen hatching (lines at 45°, step in game pixels) over whatever clip is set, around (cx,cy) */
function noteHatch(cx,cy,step,col,dir){ hx.strokeStyle=col; hx.lineWidth=lwMin(0.2); hx.beginPath(); for(var k=-30;k<30;k+=step){ hx.moveTo(cx+k-20*dir,cy+20); hx.lineTo(cx+k+20*dir,cy-20); } hx.stroke(); }
function penLine(fn,col,w,a){ hx.lineJoin='round'; hx.lineCap='round'; hx.strokeStyle=col; hx.globalAlpha=(a===undefined?1:a)*0.95; hx.lineWidth=lwMin(w); fn(0); hx.stroke(); hx.globalAlpha=(a===undefined?1:a)*0.45; hx.lineWidth=lwMin(w*0.7); fn(1); hx.stroke(); hx.globalAlpha=1; }
HDSK.note={id:'note', hd:true, glow:false, nolight:true, motes:['#8a8a90','#9a9aa4'],
  ui:{veil:0.62,band:'#ffe14a',btn:'#ffd93a',btnHi:'#fff08a'},
  /* v1.29, the paper «Б, но в линейку» (the maintainer): the races' paper — warm, grain and fibres, the other side's writing showing through
     — ruled instead of squared, each rule printed a little stronger or fainter, the red margin */
  paperMake:function(){ var o=hdOff(LW,LH), x=o.x, R2=srand(4242), i, y, X, Y; x.fillStyle='#fdfaf0'; x.fillRect(0,0,LW,LH);
    for(i=0;i<LW*LH*0.15;i++){ var a=R2(), z=0.35+R2()*0.35; x.fillStyle=a<0.5?'rgba(120,110,90,'+(0.05+R2()*0.07)+')':'rgba(255,255,255,'+(0.4+R2()*0.4)+')'; x.fillRect(R2()*LW,R2()*LH,z,z); }
    x.lineWidth=0.15; for(i=0;i<Math.round(LW*LH/1400);i++){ X=R2()*LW; Y=R2()*LH; var an=R2()*6.28, L=1.5+R2()*4.5; x.strokeStyle='rgba('+(R2()<0.2?'120,150,200':'150,135,110')+','+(0.10+R2()*0.12)+')'; x.beginPath(); x.moveTo(X,Y); x.quadraticCurveTo(X+Math.cos(an)*L*0.5+R2()-0.5,Y+Math.sin(an)*L*0.5+R2()-0.5,X+Math.cos(an)*L,Y+Math.sin(an)*L); x.stroke(); }
    for(y=12;y<LH;y+=10){ x.globalAlpha=1-0.35*R2(); x.strokeStyle='rgba(110,150,210,0.5)'; x.lineWidth=0.35; x.beginPath(); x.moveTo(0,y); x.lineTo(LW,y); x.stroke(); }
    for(i=0;i<6;i++){ Y=12+Math.floor(R2()*(LH-12)/10)*10; X=R2()*LW; x.globalAlpha=0.35; x.lineWidth=0.5; x.beginPath(); x.moveTo(X,Y); x.lineTo(X+10+R2()*25,Y); x.stroke(); } x.globalAlpha=1;
    var B=srand(7); x.save(); x.globalAlpha=0.055; x.strokeStyle='#1f3fa8'; x.lineWidth=0.45; for(var k=1;k*10+7<LH;k++){ if(B()<0.35) continue; Y=k*10+7.5; X=4+B()*10; while(X<LW-20){ var wl=7+B()*20; if(X+wl>LW-4) break; x.beginPath(); for(var q=0;q<wl;q+=0.3) x.lineTo(LW-(X+q+Math.sin(q*3.8)*0.8),Y+Math.sin(q*2.6+X)*1.2*Math.sin(q*0.9)); x.stroke(); X+=wl+3+B()*5; } } x.restore();
    x.strokeStyle='rgba(220,70,70,0.55)'; x.lineWidth=0.5; x.beginPath(); x.moveTo(22,0); x.lineTo(22,LH); x.stroke();
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
    var dots=[]; for(i=0;i<Math.round(r*2);i++) dots.push([(R2()-0.4)*1.2,(R2()-0.4)*1.2]);
    return {r:r,pts:rockPoly(r,seed,11),cr:cr,jit:jit,dots:dots,size:r*2.4,rot:R2()*16,vr:(R2()-0.5)*6,hd:true}; },
  /* v1.29, the rock «В» (the maintainer's pick): drawn carefully in pen — its shadow side cross-hatched both ways, craters hatched inside
     with a dark upper rim and a lit lower one, stipple dots, a white highlight; the light stays top-left as it turns */
  drawRock:function(sp,x,y){ var r=sp.r, cx=x+(sp.ox||0), a0=sp.rot/16*6.2832, P=turnPts(sp.pts,r,a0,cx,y);
    hx.save(); polyAt(hx,P); hx.clip(); hx.fillStyle=NTINT; hx.fillRect(cx-r*1.3,y-r*1.3,r*2.6,r*2.6);            // the paper inside, so the doodles behind don't show through
    hx.save(); hx.beginPath(); hx.arc(cx-r*0.2,y-r*0.25,r*1.35,0,6.2832); hx.arc(cx-r*0.55,y-r*0.6,r*1.05,0,6.2832,true); hx.clip(); noteHatch(cx,y,0.8,'rgba(29,63,160,0.5)',1); hx.restore();
    hx.save(); hx.beginPath(); hx.arc(cx-r*0.1,y-r*0.15,r*1.4,0,6.2832); hx.arc(cx-r*0.45,y-r*0.5,r*1.25,0,6.2832,true); hx.clip(); noteHatch(cx,y,0.8,'rgba(29,63,160,0.45)',-1); hx.restore();
    sp.cr.forEach(function(c){ var ca=c[0]+a0, X=cx+Math.cos(ca)*c[1]*r, Y=y+Math.sin(ca)*c[1]*r, R0=c[2]*r;
      hx.save(); hx.beginPath(); hx.arc(X,Y,R0,0,6.2832); hx.clip(); noteHatch(X,Y,0.5,'rgba(29,63,160,0.55)',1); hx.restore();
      penLine(function(){ hx.beginPath(); hx.arc(X,Y,R0,Math.PI*0.9,Math.PI*1.9); },PEN,0.3); penLine(function(){ hx.beginPath(); hx.arc(X,Y,R0,Math.PI*1.95,Math.PI*0.85); },'#fdfaf0',0.3); });
    hx.fillStyle=PEN; sp.dots.forEach(function(d){ var ca=Math.atan2(d[1],d[0])+a0, dl=Math.hypot(d[0],d[1])*r; hx.beginPath(); hx.arc(cx+Math.cos(ca)*dl,y+Math.sin(ca)*dl,0.15,0,6.2832); hx.fill(); });
    hx.fillStyle='rgba(255,255,255,0.8)'; hx.beginPath(); hx.ellipse(cx-r*0.4,y-r*0.45,r*0.22,r*0.1,-0.6,0,6.2832); hx.fill();
    hx.restore();
    penLine(function(j){ var Q=j?P.map(function(p,i){ return [p[0]+sp.jit[i][0],p[1]+sp.jit[i][1]]; }):P; polyAt(hx,Q); },PEN,Math.max(0.7,r*0.09)); },
  /* v1.29, the ship «Г» (the maintainer's pick): the same fighter drawn carefully — its lower half hatched in pen (the shadow), a yellow
     highlighter stripe along the upper wing, panel lines, rivet dots, the canopy left white and hatched, the orange marker flame */
  ship:function(x,y,t,blink){ if(blink) return; var fl=Math.sin(t*30), S=[[19,0],[7,-6],[3,-6],[5,-1.5],[1.5,-1.5],[1.5,1.5],[5,1.5],[3,6],[7,6]].map(function(p){ return [x+p[0],y+p[1]]; });
    hx.fillStyle=NTINT; polyAt(hx,S); hx.fill();
    hx.save(); polyAt(hx,S); hx.clip(); hx.fillStyle='rgba(255,226,40,0.6)'; hx.fillRect(x+4,y-4.6,10,1.4); hx.beginPath(); hx.rect(x,y+0.8,22,8); hx.clip(); noteHatch(x,y,0.8,'rgba(29,63,160,0.55)',-1); hx.restore();
    penLine(function(j){ polyAt(hx,S.map(function(p,i){ return [p[0]+(j?((i*37)%5-2)*0.12:0),p[1]+(j?((i*53)%5-2)*0.12:0)]; })); },PEN,1.0);
    penLine(function(){ hx.beginPath(); hx.moveTo(x+5,y-1.5); hx.lineTo(x+11,y-1.5); hx.moveTo(x+5,y+1.5); hx.lineTo(x+11,y+1.5); hx.moveTo(x+9.5,y-3.6); hx.lineTo(x+9.5,y+3.6); },PEN,0.3,0.75);
    var CAN=function(){ hx.beginPath(); hx.ellipse(x+13.4,y-0.4,2.8,1.15,0,0,6.2832); }; hx.fillStyle='#ffffff'; CAN(); hx.fill(); hx.save(); CAN(); hx.clip(); noteHatch(x+13,y,0.55,PEN,1); hx.restore(); penLine(CAN,PEN,0.45);
    hx.fillStyle=PEN; [[6,-4.4],[7.6,-4.4],[6,4.4],[7.6,4.4],[16,-0.2]].forEach(function(q){ hx.beginPath(); hx.arc(x+q[0],y+q[1],0.3,0,6.2832); hx.fill(); });
    if(!shipBare) penLine(function(){ hx.beginPath(); hx.moveTo(x+1,y-1.2); for(var i=0;i<6;i++) hx.lineTo(x-1-i*1.2,y+(i%2?1.4:-1.4)*(1-i/7)*(0.8+0.2*fl)); hx.lineTo(x+1,y+1.2); },'#e0701a',0.5,1); },
  /* v1.29, the saucer «Д»: the classic one drawn neatly in red pen — a belt line round it, three windows in the dome, three yellow
     highlighter lights, its shadow hatched below, two little «whoosh» lines behind (not counted in its size) */
  ufo:function(ux,uy,big,hurt){ var k=big?1:0.72, col=hurt?PEN:RED;
    hx.save(); hx.translate(ux,uy); hx.scale(k,k);
    var SAU=function(){ hx.beginPath(); hx.ellipse(0,0.5,10,3,0,0,6.2832); };
    hx.fillStyle=NTINT; SAU(); hx.fill(); hx.beginPath(); hx.ellipse(0,-1,4.5,4,0,Math.PI,0); hx.fill();
    hx.save(); hx.beginPath(); hx.ellipse(0,1.6,9.2,1.8,0,0,Math.PI); hx.closePath(); hx.clip(); noteHatch(0,1,0.6,hurt?'rgba(29,63,160,0.55)':'rgba(168,20,44,0.55)',1); hx.restore();
    penLine(function(j){ hx.beginPath(); hx.ellipse(j*0.3,0.5,10,3,0,0,6.2832); hx.moveTo(4.5,-1); hx.ellipse(0,-1,4.5,4,0,0,Math.PI,true); hx.moveTo(-9.6,-0.4); hx.quadraticCurveTo(0,1.6,9.6,-0.4); },col,0.9/k);
    penLine(function(){ hx.beginPath(); hx.moveTo(-1.6,-4); hx.quadraticCurveTo(-3.2,-3,-3.2,-1.4); },col,0.3,0.8);
    [-2,0,2].forEach(function(e){ hx.fillStyle='#ffffff'; hx.beginPath(); hx.arc(e,-2,0.75,0,6.2832); hx.fill(); });
    penLine(function(){ hx.beginPath(); [-2,0,2].forEach(function(e){ hx.moveTo(e+0.75,-2); hx.arc(e,-2,0.75,0,6.2832); }); },col,0.3);
    hx.fillStyle='rgba(255,226,40,0.75)'; [-5,0,5].forEach(function(e){ hx.beginPath(); hx.arc(e,1.9,0.8,0,6.2832); hx.fill(); });
    penLine(function(){ hx.beginPath(); [-5,0,5].forEach(function(e){ hx.moveTo(e+0.8,1.9); hx.arc(e,1.9,0.8,0,6.2832); }); },col,0.3);
    if(!sizeMeasure) penLine(function(){ hx.beginPath(); hx.moveTo(11.5,-1); hx.lineTo(15,-1); hx.moveTo(12,1.5); hx.lineTo(16,1.5); },'#6a6a78',0.3,0.7);   // the whoosh — left out when the game measures it
    hx.restore(); },
  /* v1.29, the power-up «Б» (the maintainer: «Б, но приклеен не всей плоскостью и немного типа на ветру играет.. немного»): a yellow
     sticky note, tilted, stuck on only by its glue strip at the top — the rest lifts and flutters a little, its corner curling and its
     shadow growing as it lifts; the sign in pen */
  pick:function(x,y,type){ var t=performance.now()/1000, ph={shield:0,triple:1.7,slow:3.1,life:4.4}[type]||0, L=0.5+0.35*Math.sin(t*2.3+ph)+0.15*Math.sin(t*7.1+ph*2), c=2.6+1.2*L, b=6-0.9*L, bx=0.35*L, bw=0.5*L;
    hx.save(); hx.translate(x,y); hx.rotate(-0.12);
    var N=function(){ hx.beginPath(); hx.moveTo(-6,-6); hx.lineTo(6,-6); hx.quadraticCurveTo(6+bw,-0.5,6+bx,b-c); hx.lineTo(6+bx-c,b); hx.quadraticCurveTo(-1,b+0.3*L,-6+bx,b); hx.quadraticCurveTo(-6-bw,-0.5,-6,-6); hx.closePath(); };
    hx.save(); hx.translate(0.5+1.3*L,0.6+1.5*L); hx.fillStyle='rgba(60,50,20,'+(0.13+0.1*L)+')'; N(); hx.fill(); hx.restore();
    hx.fillStyle='#ffe766'; N(); hx.fill();
    hx.save(); N(); hx.clip(); hx.fillStyle='rgba(255,196,30,0.55)'; hx.fillRect(-7,-6,14,2.2); var g=hx.createLinearGradient(0,-2,0,b); g.addColorStop(0,'rgba(200,150,0,0)'); g.addColorStop(1,'rgba(200,150,0,'+(0.28*L)+')'); hx.fillStyle=g; hx.fillRect(-7,-4,14,12); hx.restore();
    hx.fillStyle='#f2cf3a'; hx.beginPath(); hx.moveTo(6+bx,b-c); hx.lineTo(6+bx-c,b); hx.lineTo(6+bx-c*0.75,b-c*0.8); hx.closePath(); hx.fill();
    penLine(function(){ N(); hx.moveTo(6+bx,b-c); hx.lineTo(6+bx-c*0.75,b-c*0.8); hx.lineTo(6+bx-c,b); },PEN,0.55);
    hx.translate(0,-0.35*L); hx.scale(1,1-0.06*L); hdIcon(type,PEN); hx.restore(); },
  // v0.85: the shot thicker and darker, a hard-pressed dark-blue pen (the maintainer: «сделай выстрелы повиднее», his pick «А» of four sketches)
  bullet:function(x,y){ penLine(function(){ hx.beginPath(); hx.moveTo(x-4,y); hx.lineTo(x+2.3,y); },'#0a1f6a',1.7,1); },
  /* v1.29, the saucers' shot «Б»: a red pen asterisk, turning slowly */
  ebullet:function(x,y){ var a0=performance.now()/1000*2; penLine(function(){ hx.beginPath(); for(var k=0;k<3;k++){ var a=a0+k*Math.PI/3; hx.moveTo(x+Math.cos(a)*2.4,y+Math.sin(a)*2.4); hx.lineTo(x-Math.cos(a)*2.4,y-Math.sin(a)*2.4); } },RED,0.8,1); },
  /* v1.29, the explosions (the maintainer: «камень Д, нло Е, подарок Б, подбит В»): a rock tears into hatched scraps of paper; a saucer
     leaves a red ink blot with drops, soaking in as it fades; a power-up — a comic burst in yellow highlighter with a «+»; the hit ship is
     rubbed out — a grey eraser smear and eraser crumbs */
  bursts:function(){ return spKinds({rock:['#1d3fa0','#3a5ac0','#6a7ab0'],ufo:['#c8283a','#e05060'],ship:['#1d3fa0','#e0701a','#c8283a'],pick:['#e0b000','#1d3fa0']}); },
  parts:function(){ spFxTrack(); var i;
    SPFX.forEach(function(e){ var t=e.t, R2=srand(e.seed), X=e.x, Y=e.y, u, al;
      if(e.k==='ufo'){ u=Math.min(1,t/0.1); al=Math.max(0,1-t/0.8); if(al<=0) return; hx.globalAlpha=al*0.85; fzDisc(hx,X,Y,4.5*u,RED);
        for(i=0;i<10;i++){ var a=R2()*6.2832, d=(3+R2()*10)*u, rr=0.4+R2()*1.2; fzDisc(hx,X+Math.cos(a)*d,Y+Math.sin(a)*d,rr,RED); hx.strokeStyle=RED; hx.lineWidth=rr*0.6; hx.beginPath(); hx.moveTo(X+Math.cos(a)*2,Y+Math.sin(a)*2); hx.lineTo(X+Math.cos(a)*d*0.8,Y+Math.sin(a)*d*0.8); hx.stroke(); } hx.globalAlpha=1; }
      else if(e.k==='pick'){ u=Math.min(1,t/0.12); al=t<0.35?1:Math.max(0,1-(t-0.35)/0.2); if(al<=0) return; var sc=0.7*(0.5+0.5*u), S=[], Q=srand(e.seed+1);
        for(i=0;i<18;i++){ var b=i/18*6.2832, q=(i%2?5:11)*(0.85+0.3*Q())*sc; S.push([X+Math.cos(b)*q,Y+Math.sin(b)*q]); }
        hx.globalAlpha=al; hx.fillStyle='rgba(255,226,40,0.85)'; polyAt(hx,S); hx.fill(); penLine(function(){ polyAt(hx,S); },'#e0a000',0.6,al);
        hx.globalAlpha=al; hx.font='bold '+(7*sc)+'px '+RN_HAND; hx.fillStyle='#c88a00'; hx.textAlign='center'; hx.textBaseline='middle'; hx.fillText('+',X,Y+0.3); hx.textAlign='left'; hx.textBaseline='alphabetic'; hx.globalAlpha=1; }
      else if(e.k==='ship'){ al=Math.max(0,1-t/0.6); if(al<=0) return; hx.globalAlpha=al*0.5; hx.fillStyle='rgba(150,150,165,0.5)';
        for(i=0;i<6;i++){ hx.beginPath(); hx.ellipse(X+(R2()-0.5)*3,Y+(i-2.5)*2.2,7+R2()*3,1.3,0.15,0,6.2832); hx.fill(); } hx.globalAlpha=1; } });
    parts.forEach(function(p){ var f=p.life/p.max, k=p._k, age=p.max-p.life, al=Math.min(1,f*1.8), spin=((p._i*37)%13-6), c=p.cols[Math.min(p.cols.length-1,Math.floor((1-f)*p.cols.length))];
      if(k==='rock'){ if(p._i%3===0){ var s=1.4+(p._i%5)*0.35, ca=Math.cos(spin*age), sa=Math.sin(spin*age), T=[[s,0],[-s*0.5,s*0.7],[-s*0.7,-s*0.3],[s*0.1,-s*0.8]].map(function(q){ return [p.x+q[0]*ca-q[1]*sa,p.y+q[0]*sa+q[1]*ca]; });
          hx.globalAlpha=al; hx.fillStyle=NTINT; polyAt(hx,T); hx.fill(); hx.save(); polyAt(hx,T); hx.clip(); noteHatch(p.x,p.y,0.5,'rgba(29,63,160,0.6)',1); hx.restore(); penLine(function(){ polyAt(hx,T); },PEN,0.3,al); }
        else if(p._i%3===1){ hx.globalAlpha=al; fzDisc(hx,p.x,p.y,0.3,PEN); } }
      else if(k==='ufo'){ }   // the blot says it
      else if(k==='pick'){ if(p._i%3===0) penLine(function(){ var a=Math.atan2(p.vy,p.vx)+spin*age, L=1+(p._i%4)*0.25; hx.beginPath(); hx.moveTo(p.x-Math.cos(a)*L,p.y-Math.sin(a)*L); hx.lineTo(p.x+Math.cos(a)*L,p.y+Math.sin(a)*L); },'#e0a000',0.4,al); }
      else if(k==='ship'){ if(p._i%2===0){ hx.globalAlpha=al; hx.save(); hx.translate(p.x,p.y); hx.rotate(spin*age); hx.fillStyle=p._i%4?'#f0a0b0':PEN; hx.fillRect(-0.6,-0.4,1.2+(p._i%5)*0.15,0.8); hx.restore(); } }
      else { hx.globalAlpha=Math.min(1,f*1.6); hx.strokeStyle=c; hx.lineWidth=lwMin(0.4); hx.lineCap='round'; hx.beginPath(); hx.moveTo(p.x,p.y); hx.lineTo(p.x-p.vx*0.03,p.y-p.vy*0.03); hx.stroke(); }
      hx.globalAlpha=1; }); },
  shield:function(){ return PEN; }, mini:function(){ return ['#1d3fa0','#5a7ad0']; },
  /* v1.29, the shield «Д»: a zigzag drawn round the ship in pen, like the force field in a child's drawing, its teeth creeping round */
  shieldRing:function(x,y,t){ penLine(function(){ hx.beginPath(); for(var i=0;i<=60;i++){ var a=i/60*6.2832+t*0.3, r=i%2?11:13; hx.lineTo(x+8+Math.cos(a)*r,y+Math.sin(a)*r*0.8); } },PEN,0.35,0.85); } };

/* ════════ RETRO LCD: a green pocket-console screen — four greens, chunky pixels of 2 game pixels, the LCD's cells with thin gaps in HD,
   a far dithered planet, stars; sprites of its own (rocks turning in 8 frames with the light fixed), square sparks ════════ */
var LCD_GHOST=24, LCD_BAYER=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];   // v1.29: how fast the LCD's ghosts fade (per second; 24 — about a quarter second)
var LCDG=['#0f380f','#306230','#8bac0f','#a8c83a'], LCDO=['#0f380f','#1f4a1f','#306230','#6a8a1a'], LP=2;   // v0.81: objects a shade darker (LCDO), the screen a touch lighter
function lcdSprite(rows,pal){ pal=pal||LCDG; var h=rows.length, w=Math.max.apply(null,rows.map(function(r){ return r.length; })), sc=hs, o=hdOff(w*LP,h*LP), x=o.x, gap=sc>1.5?0.12:0;
  for(var yy=0;yy<h;yy++) for(var xx=0;xx<w;xx++){ var ch=rows[yy][xx]||'.'; if(ch==='.') continue; x.fillStyle=pal[+ch]; x.fillRect(xx*LP+gap,yy*LP+gap,LP-2*gap,LP-2*gap); }
  return {c:o.c,w:w*LP,h:h*LP}; }
function lcdPut(sp,x,y){ hx.drawImage(sp.c,Math.round(x/LP)*LP,Math.round(y/LP)*LP,sp.w,sp.h); }
var LCD_SHIP=['0000.......','.0330......','..0310.....','00011111000','01231231330','00011111000','..0110.....','.0110......','0000.......'];   // v1.29, «В»: a long-nosed interceptor — forward-swept wing tips, a striped body (11 cells, as before)
var LCD_UFO=['...000...','..02230..','000000000','031313130','.0000000.'];   // v0.83: 9 cells (was 12): the core's zone
var LCD_ICON={shield:['01110','02320','02220','00200','..0..'],triple:['...00','..0..','00000','..0..','...00'],slow:['00000','.020.','..0..','.020.','00000'],life:['0.0.0','00000','00000','.000.','..0..']};
HDSK.lcd={id:'lcd', hd:true, glow:false, nolight:true, motes:['#8bac0f'], shotsByShape:'an arrow vs a pinwheel',
  ui:{veil:0.5,band:'#9bbc0f',btn:'#8bac0f',btnHi:'#b8d84a'},
  sky:function(dt,s){ var me=this, i;
    if(!this._bg||this._key!==hdKey){ this._key=hdKey; this._spr={}; var o=hdOff(LW,LH), x=o.x, gap=hs>1.5?0.12:0; x.fillStyle='#8a9a14'; x.fillRect(0,0,LW,LH);
      for(var yy=0;yy<LH;yy+=LP) for(var xx=0;xx<LW;xx+=LP){ x.fillStyle=LCDG[3]; x.fillRect(xx+gap,yy+gap,LP-2*gap,LP-2*gap); }
      var gl=x.createLinearGradient(0,0,LW,LH); gl.addColorStop(0,'rgba(255,255,220,0.06)'); gl.addColorStop(1,'rgba(0,30,0,0.1)'); x.fillStyle=gl; x.fillRect(0,0,LW,LH); this._bg=o.c;
      // the far planet: a dithered disc with a ring, its own sprite
      var pr=[], R=9; for(var py=-R;py<=R;py++){ var row=''; for(var px=-R;px<=R;px++){ var d=px*px+py*py;
          row+=d<=R*R?(d>(R-1)*(R-1)?'1':(px+py>2?((px+py)%2?'1':'2'):((px*3+py*5)%11===0?'1':'2'))):'.'; } pr.push(row); } this._planet=lcdSprite(pr);
      var R2=srand(8); this._st=[]; for(i=0;i<Math.round(LW*LH/700);i++) this._st.push({x:R2()*LW,y:R2()*LH,z:R2()}); this._pxp=LW*0.62; }
    // v1.29, the LCD's slow cells (the maintainer: «во второй [LCD] как хотели добавить»): the screen is laid over the last picture only partly,
    // so whatever moves leaves a short fading ghost, as on an old pocket console (a whole picture when nothing moves, and on the games' screen)
    hx.globalAlpha=dt>0&&scr!=='hub'?Math.min(1,dt*LCD_GHOST):1; hx.drawImage(this._bg,0,0,LW,LH); hx.globalAlpha=1;
    this._pxp-=1.2*K*dt*s; if(this._pxp<-60) this._pxp=LW+20; lcdPut(this._planet,this._pxp,LH*0.1);
    var dot=this._dot||(this._dot=lcdSprite(['2'])), dd=this._dd||(this._dd=lcdSprite(['1']));
    this._st.forEach(function(p){ p.x-=(3+p.z*14)*K*dt*s; if(p.x<0){ p.x+=LW; p.y=Math.random()*LH; } lcdPut(dot,p.x,p.y); }); },
  rockFrames:function(r,seed){ var rr=Math.max(2,Math.round(r/LP)), R2=srand(seed*13+5), rad=[], cr=[], i, f, out=[];   // 1.29, «Г»: a dark silhouette, a bright glint top-left, craters as light rings
    for(i=0;i<16;i++) rad.push(rr*(0.8+R2()*0.28)); for(i=0;i<1+(rr>3?2:0);i++) cr.push([R2()*6.2832,R2()*0.5*rr,Math.max(0.8,rr*0.2)]);
    for(f=0;f<8;f++){ var a0=f/8*6.2832, rows=[];
      var IN=function(xx,yy){ var a=Math.atan2(yy,xx)-a0; return Math.hypot(xx,yy)<=rad[((Math.floor(a/(2*Math.PI)*16)%16)+16)%16]-0.4; };
      for(var yy=-rr-1;yy<=rr+1;yy++){ var row=''; for(var xx=-rr-1;xx<=rr+1;xx++){ var ch='.', ins=IN(xx,yy), s=xx+yy;
          if(ins||IN(xx-1,yy)||IN(xx+1,yy)||IN(xx,yy-1)||IN(xx,yy+1)){ ch='0';
            if(ins&&IN(xx-1,yy)&&IN(xx+1,yy)&&IN(xx,yy-1)&&IN(xx,yy+1)){
              if(s<-rr*0.45&&!IN(xx-2,yy-2)) ch='3';
              cr.forEach(function(c){ var ca=c[0]+a0, q=Math.hypot(xx-Math.cos(ca)*c[1],yy-Math.sin(ca)*c[1])/c[2]; if(q<1&&q>0.45) ch='2'; }); } }
          row+=ch; } rows.push(row); }
      out.push(lcdSprite(rows,LCDO)); } return out; },
  rock:function(r,sz,seed){ return {r:r,fr:this.rockFrames(r,seed),size:r*2.4,rot:srand(seed)()*16,vr:(srand(seed+2)()-0.5)*6,hd:true}; },
  drawRock:function(sp,x,y){ var f=sp.fr[Math.floor(sp.rot/2)%8]; lcdPut(f,x+(sp.ox||0)-f.w/2,y-f.h/2); },
  sp:function(k,rows){ var s=this._spr||(this._spr={}); return s[k]||(s[k]=lcdSprite(rows,LCDO)); },
  ship:function(x,y,t,blink){ if(blink) return; lcdPut(this.sp('ship',LCD_SHIP),x-2,y-9); if(!shipBare) lcdPut(this.sp(Math.floor(t*12)%2?'fl2':'fl3',Math.floor(t*12)%2?['21','1.']:['12','.1']),x-6,y-2); },   // its flame flickers between two shapes
  ufo:function(ux,uy,big,hurt){ var sp=this.sp(big?'ufo':'ufoS',big?LCD_UFO:['..000...','.02230..','0000000.','0313130.','.00000..']); if(hurt&&Math.floor(performance.now()/60)%2) return; lcdPut(sp,ux-sp.w/2,uy-sp.h/2); },
  pick:function(x,y,type){ var ic=LCD_ICON[type]||LCD_ICON.life, b=Math.floor(performance.now()/500)%2, k=(b?'pkb_':'pk_')+type, s=this._spr||(this._spr={}), sp=s[k];   // 1.29: it blinks — every half second the inside and the sign swap their greens (the maintainer chose «Б»)
    if(!sp){ var rows=['0000000']; ic.forEach(function(r){ rows.push('0'+(b?r.replace(/0/g,'3').replace(/[.2]/g,'1'):r.replace(/[.2]/g,'3'))+'0'); }); rows.push('0000000'); sp=s[k]=lcdSprite(rows,LCDG); }
    lcdPut(sp,x-sp.w/2,y-sp.h/2); },
  bullet:function(x,y){ lcdPut(this.sp('b2',['1...','0000','1...']),x-4,y-3); },   // 1.29, «Б»: an arrow with its fletching
  ebullet:function(x,y){ var f=Math.floor(performance.now()/120)%2; lcdPut(f?this.sp('eb',['0.0','.0.','0.0']):this.sp('eb+',['.0.','000','.0.']),x-3,y-3); },   // 1.29, «Б»: a pinwheel, «+» and «×» in turn
  bursts:function(){ return spKinds({rock:['#0f380f','#306230','#306230'],ufo:['#0f380f','#306230'],ship:['#0f380f','#306230'],pick:['#0f380f','#306230']}); },
  /* 1.29 (the maintainer: «д, е, а, а»; the rock's chunks replaced by a ring in 1.29a); a saucer turns into a dust cloud
     that thins out in a checker to nothing; the ship and a power-up — the dots as before */
  parts:function(){ spFxTrack(); var me=this, c0=this.sp('p0',['0']), c1=this.sp('p1',['1']), c2=this.sp('p2',['2']), c3=this.sp('p3',['3']);
    SPFX.forEach(function(e){ var t=e.t, X=e.x, Y=e.y, d=t*24;
      if(e.k==='rock'){ if(t>0.35) return; var rr=2+t*26, cr=t<0.18?c2:c3; for(var k8=0;k8<20;k8++){ var an=k8/20*6.2832; lcdPut(cr,X+Math.cos(an)*rr*LP,Y+Math.sin(an)*rr*LP*0.85); } }   // 1.29a, «В, но чуть светлее»: a ring of dots runs out and is gone in a third of a second (the chunks were taken for rocks: «остается много и надолго осколки которые принимаются за невзорванные астероиды»)
      else if(e.k==='ufo'){ if(t>0.5) return; var r=(2+t*14)*1.15, lv=Math.min(15,Math.floor(t/0.5*17)), cs=t<0.15?c0:t<0.3?c1:c2, R=Math.ceil(r), i, j;
        for(j=-R;j<=R;j++) for(i=-R;i<=R;i++){ var a=Math.atan2(j,i), w=0.82+0.1*Math.sin(a*3+1+e.seed)+0.08*Math.sin(a*5+2); if(Math.hypot(i,j)>r*w||LCD_BAYER[(j+40)%4][(i+40)%4]<lv) continue; lcdPut(cs,X+i*LP,Y+j*LP); } } });
    parts.forEach(function(p){ var f=p.life/p.max; if(f<0.15||p._k==='rock'||(p._k==='ufo'&&p._i%3)) return; lcdPut(f>0.5?c0:c1,p.x,p.y); }); },
  shield:function(){ return LCDG[0]; }, mini:function(){ return [LCDG[1],LCDG[0]]; },
  shieldRing:function(x,y,t){   // 1.29, «Г»: four corner brackets round the ship, blinking dark / light
    var k=Math.floor(t*4)%2, me=this, sp=this._spr&&this._spr['shG'+k];
    if(!sp){ var rows=[], c=k?'2':'0'; for(var j=0;j<13;j++){ var r=''; for(var i=0;i<15;i++){ var ex=i<3||i>11, ey=j<3||j>9, edge=(i===0||i===14)&&ey||(j===0||j===12)&&ex; r+=edge?c:'.'; } rows.push(r); } sp=me.sp('shG'+k,rows); }
    lcdPut(sp,x-6,y-13); } };
