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
P.btn=P.ship[1]; P.btnHi=P.ship[2]; P.band0=P.band;
var PIXH=215;
/* v0.75 (the maintainer: «if HD graphics is chosen, every screen and everything else must be HD too»): with HD the game-pixel canvas is made
   at the screen's resolution (uiS device pixels per game pixel) and keeps working in game pixels through its transform; texts are set in
   a smooth typeface fitted to the pixel font's own widths (so every layout stays as it is), frames, buttons, rings and the pictures'
   shapes are drawn smooth. With «pixels» uiS is 1 — the game as it was */
var uiS=1, uiPong=false, UIFONT='system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
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
  uiPong=typeof mode!=='undefined'&&mode==='pong';   // 1.59c: SonaPong is drawn at the screen's resolution whatever the graphics switch (a ball on game pixels jumped a whole pixel at a time)
  uiS=((typeof gfxMode!=='undefined'&&gfxMode==='hd')||uiPong)?S*Math.min(2,DPR)/DPR:1;
  lc.width=Math.round(LW*uiS); lc.height=Math.round(LH*uiS); pc.width=lc.width; pc.height=lc.height;
  lx.setTransform(uiS,0,0,uiS,0,0); lx.imageSmoothingEnabled=false; var pcx0=pc.getContext('2d'); pcx0.setTransform(uiS,0,0,uiS,0,0); pcx0.imageSmoothingEnabled=false;
  var css=function(el){ el.style.width=(LW*S/DPR)+'px'; el.style.height=(LH*S/DPR)+'px'; };
  css(cv); css(gl); gl.width=LW*2; gl.height=LH*2; glowDirty=false; tableC=null;   // soft light needs no fine detail: half a game pixel, scaled up smoothly
  var si={l:0,r:0,t:0,b:0}; try{ si=safeInsets(); }catch(e){}
  var u=DPR/S; SAFE={l:Math.ceil(si.l*u),r:Math.ceil(si.r*u),t:Math.ceil(si.t*u),b:Math.ceil(si.b*u)};
  makeNebula(); makeStars(); if(typeof hdCv!=='undefined'&&hdCv) hdSize();
}
function noise2(){ var g=[],N=16,i; for(i=0;i<N*N;i++) g.push(Math.random());
  return function(x,y){ var xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi; function v(a,b){ return g[((a%N+N)%N)+((b%N+N)%N)*N]; }
    var sx=fx*fx*(3-2*fx), sy=fy*fy*(3-2*fy); return (v(xi,yi)*(1-sx)+v(xi+1,yi)*sx)*(1-sy)+(v(xi,yi+1)*(1-sx)+v(xi+1,yi+1)*sx)*sy; }; }
/* 1.33, the space skin's sky «В2» (the maintainer: «мир космоса сильно фиолетовый и напоминает мир неона.. можем как-то сместить его цветовую гамму не углубляясь
   в настройку всех объектов»): every colour the sky is painted with goes through spaceTint — graphite: hues pulled to a grey-blue (212°),
   colour to 45%, a shade darker. The ship, rocks, saucers and shots keep theirs. Takes '#rrggbb' or 'rgba(r,g,b,a)', gives the same kind back */
function spaceTint(c){ var m=/^#([0-9a-f]{6})$/i.exec(c), n, A=null;
  if(m){ n=parseInt(m[1],16); n=[n>>16,(n>>8)&255,n&255]; } else { m=/rgba?\(([^)]*)\)/.exec(c); if(!m) return c; n=m[1].split(',').map(Number); A=n.length>3?n[3]:1; }
  var r=n[0]/255, g=n[1]/255, b=n[2]/255, mx=Math.max(r,g,b), mn=Math.min(r,g,b), l=(mx+mn)/2, s0=0, h=0, dd=mx-mn;
  if(dd>0){ s0=l>0.5?dd/(2-mx-mn):dd/(mx+mn); h=(mx===r?((g-b)/dd+(g<b?6:0)):mx===g?((b-r)/dd+2):((r-g)/dd+4))*60; }
  var H=(((212+(((h-212+540)%360)-180)*0.2)%360+360)%360)/360, S=s0*0.45, L=l*0.85, q=L<0.5?L*(1+S):L+S-L*S, p=2*L-q;
  var f=function(t){ t=t<0?t+1:t>1?t-1:t; return Math.round((t<1/6?p+(q-p)*6*t:t<0.5?q:t<2/3?p+(q-p)*(2/3-t)*6:p)*255); }, o=[f(H+1/3),f(H),f(H-1/3)];
  return A===null?'#'+((1<<24)|(o[0]<<16)|(o[1]<<8)|o[2]).toString(16).slice(1):'rgba('+o[0]+','+o[1]+','+o[2]+','+A+')'; }
function makeNebula(){
  var w=LW*2, h=LH; nebC=document.createElement('canvas'); nebC.width=w; nebC.height=h;
  var c=nebC.getContext('2d'), im=c.createImageData(w,h), n1=noise2(), n2=noise2(), cols=P.neb.map(function(c){ return hex(spaceTint(c)); }), bg=hex(spaceTint(P.bg));   // 1.33: graphite
  for(var y=0;y<h;y++) for(var x=0;x<w;x++){
    var u=x/w*6, v=y/h*3.2, a=n1(u,v)*0.65+n2(u*2.1,v*2.1)*0.35, t=(a-0.42)*2.6, d=bay(x,y), idx=-1;
    if(t>0.75+(d-0.5)*0.25) idx=2; else if(t>0.35+(d-0.5)*0.3) idx=1; else if(t>0.02+(d-0.5)*0.35) idx=0;
    var col=idx<0?bg:cols[idx], o=(y*w+x)*4; im.data[o]=col[0]; im.data[o+1]=col[1]; im.data[o+2]=col[2]; im.data[o+3]=255; }
  c.putImageData(im,0,0);
}
function makeStars(){ stars=[]; for(var i=0;i<Math.round(LW*LH/420);i++) stars.push({x:Math.random()*LW,y:Math.random()*LH,z:Math.random(),tw:Math.random()*6}); }
function spaceSky(dt,speed){                                        // nebula and stars drift left; speed 0…1 (v0.71: sky() draws the chosen skin's)
  nebX=(nebX+3*K*dt*speed)%LW;
  stars.forEach(function(s){ s.x-=(4+s.z*s.z*30)*K*dt*speed; if(s.x<0){ s.x+=LW; s.y=Math.random()*LH; } });
  lx.fillStyle=P.bg; lx.fillRect(0,0,LW,LH);
  lx.drawImage(nebC,-Math.floor(nebX),0); lx.drawImage(nebC,LW*2-Math.floor(nebX),0);
  var t=performance.now()/1000;
  stars.forEach(function(s){ var i=s.z<0.5?0:s.z<0.85?1:2; if(i===2&&Math.sin(t*3+s.tw)>0.6) i=1; lx.fillStyle=P.stars[i]; lx.fillRect(Math.round(s.x),Math.round(s.y),1,1); });
}
/* v1.55 (the review's п.8): a soft dark plaque under text over a busy picture */
function plaque(x0,y0,x1,y1,a){ var k, A=a||0.5; for(k=0;k<4;k++){ lx.globalAlpha=A*(k===3?1:0.22); lx.fillStyle=P.bg; lx.beginPath(); lx.roundRect(x0-6+k*1.5,y0-4+k*1.2,x1-x0+12-k*3,y1-y0+8-k*2.4,6); lx.fill(); } lx.globalAlpha=1; }
/* the menu's dim band, its open edge fading (п.9) */
function bandVeil(b0,b1,a){ lx.globalAlpha=a; R(P.bg,b0,0,b1-b0,LH); var F=Math.round(LW*0.06), c=P.bg;   /* v1.55 (the review's п.9): the menu's dim band, its open edge fading, not cut */
  [[b0,-1],[b1,1]].forEach(function(e){ if(e[0]<=0||e[0]>=LW) return; var x=e[0], gr=lx.createLinearGradient(x,0,x+e[1]*F,0); gr.addColorStop(0,c); gr.addColorStop(1,c.length===7?c+'00':'rgba(0,0,0,0)'); lx.fillStyle=gr; lx.fillRect(Math.min(x,x+e[1]*F),0,F,LH); });
  lx.globalAlpha=1; }
function light(x,y,rad,rgb,a){ if(noLight||(SK&&SK.nolight)) return; lights.push([x,y,rad,rgb,a]); }
/* a soft light sprite per colour, made once: drawing it is much cheaper than a new gradient per light per frame */
function glowSprite(rgb){ var c=glowSpr[rgb]; if(c) return c; c=document.createElement('canvas'); c.width=c.height=64; var x=c.getContext('2d'), g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba('+rgb+',1)'); g.addColorStop(1,'rgba('+rgb+',0)'); x.fillStyle=g; x.fillRect(0,0,64,64); return glowSpr[rgb]=c; }
function present(shake){
  var ox=0, oy=0; if(shake>0){ ox=Math.round(rnd(-1,1)*shake*6)*S/DPR; oy=Math.round(rnd(-1,1)*shake*6)*S/DPR; }
  var tf=ox||oy?'translate('+ox+'px,'+oy+'px)':''; if(cv.style.transform!==tf){ cv.style.transform=tf; gl.style.transform=tf; if(hdCv) hdCv.style.transform=tf; }
  if(glowDirty||lights.length){ gx.clearRect(0,0,gl.width,gl.height); gx.globalCompositeOperation='lighter';
    lights.forEach(function(L){ var r=L[2]*2; gx.globalAlpha=Math.min(1,L[4]); gx.drawImage(glowSprite(L[3]),L[0]*2-r,L[1]*2-r,2*r,2*r); });
    gx.globalAlpha=1; gx.globalCompositeOperation='source-over'; glowDirty=lights.length>0; }
  lights=[];
}

/* ── pixels, text, buttons ── */
function R(c,x,y,w,h){ lx.fillStyle=c; lx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); }
function frame(x,y,w,h,c){ if(uiS>1){ lx.strokeStyle=c; lx.lineWidth=0.7; lx.strokeRect(x+0.35,y+0.35,w-0.7,h-0.7); return; } R(c,x,y,w,1); R(c,x,y+h-1,w,1); R(c,x,y,1,h); R(c,x+w-1,y,1,h); }
function dots(x,y0,y1,c){ for(var y=Math.round(Math.min(y0,y1));y<=Math.max(y0,y1);y+=2) R(c,x,y,1,1); }
/* text in game pixels; a dark 1-pixel rim keeps it readable over stars and nebula */
function text(s,x,y,col,align,sc,noRim){ sc=sc||1; var w=PF.width(s,sc); x=Math.round(align==='center'?x-w/2:align==='right'?x-w:x); y=Math.round(y);
  if(uiS>1){ lx.save(); lx.font='700 '+(10*sc)+'px '+UIFONT; lx.textBaseline='alphabetic'; var nat=lx.measureText(s).width, fx=nat>0?Math.min(1.35,Math.max(0.45,w/nat)):1;
    lx.translate(x+(w-nat*fx)/2,y+7*sc); lx.scale(fx,1); if(!noRim){ lx.lineJoin='round'; lx.strokeStyle=P.bg; lx.lineWidth=2.2*sc; lx.strokeText(s,0,0); }
    lx.fillStyle=col; lx.fillText(s,0,0); lx.restore(); return w; }
  if(lx.globalAlpha===1&&lx.globalCompositeOperation==='source-over'&&typeof col==='string'){ var c=textImg(s,col,sc,noRim); lx.drawImage(c,x-1,y-sc-1); return w; }
  if(!noRim){ lx.fillStyle=P.bg; for(var dx=-1;dx<=1;dx++) for(var dy=-1;dy<=1;dy++) if(dx||dy) PF.draw(lx,s,x+dx,y+dy,sc); }
  PF.draw(lx,s,x,y,sc,col); return w; }
/* 1.59b: a pixel line of text drawn once and kept as a picture (the font draws every lit pixel as its own square, nine times with the
   rim: a menu's few lines were ~10 000 squares a frame — SonaPong's menu took three times SonaFly's time). Same pixels; only at full
   opacity (with a see-through text the rim and the letters blend differently). At most 400 kept; then the store starts anew */
var TXC={}, TXN=0;
function textImg(s,col,sc,noRim){ var k=s+'|'+col+'|'+sc+'|'+(noRim?0:P.bg), c=TXC[k]; if(c) return c;
  if(TXN>=400){ TXC={}; TXN=0; }
  c=document.createElement('canvas'); c.width=PF.width(s,sc)+2; c.height=10*sc+2; var x=c.getContext('2d');
  if(!noRim){ x.fillStyle=P.bg; for(var dx=-1;dx<=1;dx++) for(var dy=-1;dy<=1;dy++) if(dx||dy) PF.draw(x,s,1+dx,sc+1+dy,sc); }
  PF.draw(x,s,1,sc+1,sc,col); TXC[k]=c; TXN++; return c; }
/* a block of lines wrapped to maxW, centred on cx; returns the y after the block */
function para(s,cx0,y,maxW,col){ PF.wrap(s,maxW,1).forEach(function(l){ text(l,cx0,y,col,'center'); y+=10; }); return y; }
var BTN=[];                                                         // buttons of the current frame: hit areas in game pixels
var BH=22;                                                          // button height in game pixels (17 → 20 in v0.6 → 22 in v0.9)
/* a small icon button: three bars (menu) in a frame; the hit area is larger than the drawing */
/* v1.54 (the polish review's п.2, the maintainer's «1»): the corner button says what it does — «←» where it goes back (the scores, the settings,
   the skins, the sound from the settings), «❚❚» where it pauses (the count-down, the game), «☰» only where it opens the menu */
var ICON_BACK={sc_back:1,set_back:1,sk_back:1,settings:1};
function iconButton(id,x,y){ var s=BH-3, kind=id==='pause'?'pause':ICON_BACK[id]?'back':'menu';
  if(uiS>1){ lx.fillStyle=P.bg; lx.beginPath(); lx.roundRect(x,y,s,s,3); lx.fill(); lx.strokeStyle=P.line; lx.lineWidth=0.7; lx.stroke(); lx.fillStyle=P.soft; lx.strokeStyle=P.soft;
    if(kind==='pause'){ lx.beginPath(); lx.roundRect(x+s*0.33,y+s*0.27,s*0.12,s*0.46,0.6); lx.roundRect(x+s*0.55,y+s*0.27,s*0.12,s*0.46,0.6); lx.fill(); }
    else if(kind==='back'){ lx.lineWidth=1.3; lx.lineCap='round'; lx.lineJoin='round'; lx.beginPath();
      lx.moveTo(x+s*0.72,y+s/2); lx.lineTo(x+s*0.28,y+s/2); lx.moveTo(x+s*0.46,y+s*0.30); lx.lineTo(x+s*0.27,y+s/2); lx.lineTo(x+s*0.46,y+s*0.70);
      lx.stroke(); }
    else for(var j=0;j<3;j++){ lx.beginPath(); lx.roundRect(x+4.5,y+5+j*3.2,s-9,1.2,0.6); lx.fill(); } }
  else { R(P.bg,x,y,s,s); frame(x,y,s,s,P.line); var cx=x+Math.floor(s/2), cy=y+Math.floor(s/2), k;
    if(kind==='pause'){ R(P.soft,cx-3,cy-3,2,7); R(P.soft,cx+1,cy-3,2,7); }
    else if(kind==='back'){ R(P.soft,cx-3,cy,7,1); for(k=1;k<=3;k++){ R(P.soft,cx-3+k,cy-k,1,1); R(P.soft,cx-3+k,cy+k,1,1); } }
    else for(var i=0;i<3;i++) R(P.soft,x+4,y+5+i*3,s-8,1); }
  BTN.push({id:id,x:x-4,y:y-4,w:s+8,h:s+8}); }
function button(id,label,x,y,w,h,kind,on){
  var hot=kind==='primary', blink=hot&&on;
  if(uiS>1){ lx.fillStyle=hot?(blink?P.btnHi:P.btn):P.bg; lx.beginPath(); lx.roundRect(x,y,w,h,3); lx.fill(); lx.strokeStyle=hot?P.btnHi:P.line; lx.lineWidth=0.8; lx.beginPath(); lx.roundRect(x+0.4,y+0.4,w-0.8,h-0.8,2.6); lx.stroke(); }
  else { R(hot?(blink?P.btnHi:P.btn):P.bg,x,y,w,h); frame(x,y,w,h,hot?P.btnHi:P.line); }   // v0.71: the primary button in the skin's accent
  var tw=PF.width(label), fit=Math.min(1,(w-8)/Math.max(1,tw));        // v0.92: a label wider than its button is drawn narrower (a tablet's test settings)
  if(fit<1){ lx.save(); lx.translate(x+w/2,0); lx.scale(fit,1); lx.translate(-(x+w/2),0); }
  text(label,x+w/2,y+Math.round((h-7)/2),hot?P.bg:P.text,'center',1,true);
  if(fit<1) lx.restore();
  BTN.push({id:id,x:x,y:y,w:w,h:h});
}
