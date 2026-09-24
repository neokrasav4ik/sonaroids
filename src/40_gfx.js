/* ════ THE APP: drawing, first-launch screens and the game loop share one scope (40_gfx … 49_main) ════ */
(function(){
"use strict";
if(typeof document==='undefined') return;

/* ── picture: the game is drawn at low resolution in whole pixels (about 215 of them on the short side) and scaled up
   without smoothing; soft light (shots, engine, explosions) goes on top at full resolution. Text uses the same pixel. ── */
var P={bg:'#1B1A2E', neb:['#2A2440','#3C2B4F','#4A2F4A'], stars:['#5A4C6E','#B89BB2','#FFE9D6'],
  rock:['#2A2233','#4C3E57','#7A6380','#B08FA5','#EBCBD0'],
  ship:['#1F5E52','#2F8F7C','#7FE0C8','#E9FFF8'], flame:['#FF7A7A','#FFB86B','#FFF1C9'], bullet:'#FFB86B', glowB:'255,184,107',
  pick:'#FFE66D', glowP:'255,230,109', ufo:['#4B2F80','#7B55C7','#B48CFF','#EADFFF'], ebullet:'#FF7A7A', text:'#FFF3EA', soft:'#C9A9B6', line:'#4A3A57', band:'#7FE0C8', hit:'#FF7A7A', hand:['#6E4D57','#C99A94','#F3CDBF']};
var PIXH=215;
var cv=document.getElementById('cv'), lc=cv, lx=cv.getContext('2d');                          // the visible canvas is the low-resolution one
var gl=document.getElementById('glow'), gx=gl.getContext('2d'), glowDirty=false, glowSpr={};
var pc=document.createElement('canvas');                         // pictures that can be mirrored for a left-handed player
var DPR=1, W=0, H=0, S=1, LW=380, LH=215, K=LH/180, SAFE={l:0,r:0,t:0,b:0}, nebC=null, nebX=0, stars=[], lights=[], parts=[];
var BAY=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
function bay(x,y){ return (BAY[(y&3)*4+(x&3)]+0.5)/16; }
function hex(c){ return [parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]; }
function rnd(a,b){ return a+Math.random()*(b-a); }
function safeInsets(){ var d=document.createElement('div');
  d.style.cssText='position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(d); var cs=getComputedStyle(d);
  var r={t:parseFloat(cs.paddingTop)||0,r:parseFloat(cs.paddingRight)||0,b:parseFloat(cs.paddingBottom)||0,l:parseFloat(cs.paddingLeft)||0}; d.remove(); return r; }
function resize(){
  DPR=Math.min(3,window.devicePixelRatio||1);
  var w=Math.max(200,window.innerWidth), h=Math.max(150,window.innerHeight);
  W=Math.round(w*DPR); H=Math.round(h*DPR);
  S=Math.max(1,Math.round(Math.min(W,H)/PIXH)); LH=Math.ceil(H/S); LW=Math.ceil(W/S); K=LH/180;
  lc.width=LW; lc.height=LH; pc.width=LW; pc.height=LH; lx.imageSmoothingEnabled=false;
  var css=function(el){ el.style.width=(LW*S/DPR)+'px'; el.style.height=(LH*S/DPR)+'px'; };
  css(cv); css(gl); gl.width=LW*2; gl.height=LH*2; glowDirty=false; tableC=null;   // soft light needs no fine detail: half a game pixel, scaled up smoothly
  var si={l:0,r:0,t:0,b:0}; try{ si=safeInsets(); }catch(e){}
  var u=DPR/S; SAFE={l:Math.ceil(si.l*u),r:Math.ceil(si.r*u),t:Math.ceil(si.t*u),b:Math.ceil(si.b*u)};
  makeNebula(); makeStars();
}
function noise2(){ var g=[],N=16,i; for(i=0;i<N*N;i++) g.push(Math.random());
  return function(x,y){ var xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi; function v(a,b){ return g[((a%N+N)%N)+((b%N+N)%N)*N]; }
    var sx=fx*fx*(3-2*fx), sy=fy*fy*(3-2*fy); return (v(xi,yi)*(1-sx)+v(xi+1,yi)*sx)*(1-sy)+(v(xi,yi+1)*(1-sx)+v(xi+1,yi+1)*sx)*sy; }; }
function makeNebula(){
  var w=LW*2, h=LH; nebC=document.createElement('canvas'); nebC.width=w; nebC.height=h;
  var c=nebC.getContext('2d'), im=c.createImageData(w,h), n1=noise2(), n2=noise2(), cols=P.neb.map(hex), bg=hex(P.bg);
  for(var y=0;y<h;y++) for(var x=0;x<w;x++){
    var u=x/w*6, v=y/h*3.2, a=n1(u,v)*0.65+n2(u*2.1,v*2.1)*0.35, t=(a-0.42)*2.6, d=bay(x,y), idx=-1;
    if(t>0.75+(d-0.5)*0.25) idx=2; else if(t>0.35+(d-0.5)*0.3) idx=1; else if(t>0.02+(d-0.5)*0.35) idx=0;
    var col=idx<0?bg:cols[idx], o=(y*w+x)*4; im.data[o]=col[0]; im.data[o+1]=col[1]; im.data[o+2]=col[2]; im.data[o+3]=255; }
  c.putImageData(im,0,0);
}
function makeStars(){ stars=[]; for(var i=0;i<Math.round(LW*LH/420);i++) stars.push({x:Math.random()*LW,y:Math.random()*LH,z:Math.random(),tw:Math.random()*6}); }
function sky(dt,speed){                                             // nebula and stars drift left; speed 0…1
  nebX=(nebX+3*K*dt*speed)%LW;
  stars.forEach(function(s){ s.x-=(4+s.z*s.z*30)*K*dt*speed; if(s.x<0){ s.x+=LW; s.y=Math.random()*LH; } });
  lx.fillStyle=P.bg; lx.fillRect(0,0,LW,LH);
  lx.drawImage(nebC,-Math.floor(nebX),0); lx.drawImage(nebC,LW*2-Math.floor(nebX),0);
  var t=performance.now()/1000;
  stars.forEach(function(s){ var i=s.z<0.5?0:s.z<0.85?1:2; if(i===2&&Math.sin(t*3+s.tw)>0.6) i=1; lx.fillStyle=P.stars[i]; lx.fillRect(Math.round(s.x),Math.round(s.y),1,1); });
}
function light(x,y,rad,rgb,a){ lights.push([x,y,rad,rgb,a]); }
/* a soft light sprite per colour, made once: drawing it is much cheaper than a new gradient per light per frame */
function glowSprite(rgb){ var c=glowSpr[rgb]; if(c) return c; c=document.createElement('canvas'); c.width=c.height=64; var x=c.getContext('2d'), g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba('+rgb+',1)'); g.addColorStop(1,'rgba('+rgb+',0)'); x.fillStyle=g; x.fillRect(0,0,64,64); return glowSpr[rgb]=c; }
function present(shake){
  var ox=0, oy=0; if(shake>0){ ox=Math.round(rnd(-1,1)*shake*6)*S/DPR; oy=Math.round(rnd(-1,1)*shake*6)*S/DPR; }
  var tf=ox||oy?'translate('+ox+'px,'+oy+'px)':''; if(cv.style.transform!==tf){ cv.style.transform=tf; gl.style.transform=tf; }
  if(glowDirty||lights.length){ gx.clearRect(0,0,gl.width,gl.height); gx.globalCompositeOperation='lighter';
    lights.forEach(function(L){ var r=L[2]*2; gx.globalAlpha=Math.min(1,L[4]); gx.drawImage(glowSprite(L[3]),L[0]*2-r,L[1]*2-r,2*r,2*r); });
    gx.globalAlpha=1; gx.globalCompositeOperation='source-over'; glowDirty=lights.length>0; }
  lights=[];
}

/* ── pixels, text, buttons ── */
function R(c,x,y,w,h){ lx.fillStyle=c; lx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); }
function frame(x,y,w,h,c){ R(c,x,y,w,1); R(c,x,y+h-1,w,1); R(c,x,y,1,h); R(c,x+w-1,y,1,h); }
function dots(x,y0,y1,c){ for(var y=Math.round(Math.min(y0,y1));y<=Math.max(y0,y1);y+=2) R(c,x,y,1,1); }
/* text in game pixels; a dark 1-pixel rim keeps it readable over stars and nebula */
function text(s,x,y,col,align,sc,noRim){ sc=sc||1; var w=PF.width(s,sc); x=Math.round(align==='center'?x-w/2:align==='right'?x-w:x); y=Math.round(y);
  if(!noRim){ lx.fillStyle=P.bg; for(var dx=-1;dx<=1;dx++) for(var dy=-1;dy<=1;dy++) if(dx||dy) PF.draw(lx,s,x+dx,y+dy,sc); }
  PF.draw(lx,s,x,y,sc,col); return w; }
/* a block of lines wrapped to maxW, centred on cx; returns the y after the block */
function para(s,cx0,y,maxW,col){ PF.wrap(s,maxW,1).forEach(function(l){ text(l,cx0,y,col,'center'); y+=10; }); return y; }
var BTN=[];                                                         // buttons of the current frame: hit areas in game pixels
var BH=22;                                                          // button height in game pixels (17 → 20 in v0.6 → 22 in v0.9)
/* a small icon button: three bars (menu) in a frame; the hit area is larger than the drawing */
function iconButton(id,x,y){ var s=BH-3; R(P.bg,x,y,s,s); frame(x,y,s,s,P.line); for(var i=0;i<3;i++) R(P.soft,x+4,y+5+i*3,s-8,1);
  BTN.push({id:id,x:x-4,y:y-4,w:s+8,h:s+8}); }
function button(id,label,x,y,w,h,kind,on){
  var hot=kind==='primary', blink=hot&&on;
  R(hot?(blink?P.ship[2]:P.ship[1]):P.bg,x,y,w,h); frame(x,y,w,h,hot?P.ship[2]:P.line);
  text(label,x+w/2,y+Math.round((h-7)/2),hot?P.bg:P.text,'center',1,true);
  BTN.push({id:id,x:x,y:y,w:w,h:h});
}
