/* ── v0.79: every skin draws its objects the size of what the game counts (the maintainer: «на сказке в пикселе объекты больше, чем в HD»).
   Hits, points and the server's replay live in the core (src/13_core.js) and are the same for every skin and both graphics; only the pictures
   differed — a rock was drawn from 80% (space, pixels) to 152% (fairy tale, pixels, small cloud) of the circle it is hit in. Now:
   · rocks: each skin's picture is scaled per size by its own factor rk (measured against the core's circle: tests/skin_sizes.js keeps every
     skin, both graphics, at 90–112% on common screens), and a sprite whose body sits off its centre is moved back onto it (ox / oy);
   · ships: 21–25 game pixels long in every skin (the space pixel ship and the LCD ship redrawn larger / smaller; the HD fairy dragon,
     the HD vector ship and the HD notebook ship scaled by shipK). ── */
var RK={ 'space':[1.13,1.13,1.13], 'space/hd':[0.98,0.97,0.94], 'fairy':[0.84,0.89,0.68], 'fairy/hd':[0.85,0.91,0.79],   // v1.27: L and M the same in both graphics (the small cloud is 3–4 whole pixels: ±10%)
 
  'vector':[0.91,0.88,0.73], 'vector/hd':[0.97,0.97,0.95], 'neon':[0.96,0.98,0.95], 'neon/hd':[0.97,0.99,0.99], 'note':[0.96,0.93,0.9], 'note/hd':[0.96,0.98,0.95],
  'lcd/hd':[0.91,0.86,0.79] };
function rockK(sk,sz){ var f=sk&&RK[sk.id+(sk.hd?'/hd':'')]; return f?f[sz]:1; }
/* the sprite radius for a rock of core radius rc: whole pixels for pixel pictures and the LCD cells, half pixels for smooth HD */
function rockR(sk,sz,rc){ var v=rc*K*rockK(sk,sz); return (sk&&sk.hd&&sk.id!=='lcd')?Math.max(3,Math.round(v*2)/2):Math.max(3,Math.round(v)); }
/* the middle of a picture's body (alpha ≥ 128), in its own pixels */
function alphaBox(c){ var w=c.width, h=c.height, d=c.getContext('2d').getImageData(0,0,w,h).data, x0=w, y0=h, x1=-1, y1=-1, x, y;
  for(y=0;y<h;y++) for(x=0;x<w;x++) if(d[(y*w+x)*4+3]>=128){ if(x<x0) x0=x; if(x>x1) x1=x; if(y<y0) y0=y; if(y>y1) y1=y; }
  return x1<0?null:{cx:(x0+x1+1)/2,cy:(y0+y1+1)/2,w:x1-x0+1,h:y1-y0+1}; }
/* a pixel rock (16 turning frames) or an HD cloud sprite whose body is off its centre by 1.5 game pixels or more is moved back onto it */
function rockCentre(sp){ try{
    if(sp.frames&&sp.frames.length){ var n=sp.frames.length, sx=0, sy=0, k=0; for(var f=0;f<n;f+=Math.max(1,n>>2)){ var a=alphaBox(sp.frames[f]); if(a){ sx+=a.cx; sy+=a.cy; k++; } }   // the middle over its turn
      if(k){ var dx=sp.size/2-sx/k, dy=sp.size/2-sy/k; if(Math.abs(dx)>=1.5) sp.ox=(sp.ox||0)+Math.round(dx); if(Math.abs(dy)>=1.5) sp.oy=(sp.oy||0)+Math.round(dy); } }
    else if(sp.img&&sp.img.getContext&&!sp.vr){ var c=alphaBox(sp.img), s=sp.size/sp.img.width; if(c){
      var ex=(sp.img.width/2-c.cx)*s, ey=(sp.img.height/2-c.cy)*s; if(Math.abs(ex)>=1.5) sp.ox=(sp.ox||0)+ex; if(Math.abs(ey)>=1.5) sp.oy=(sp.oy||0)+ey; } }
  }catch(e){} return sp; }
/* every rock the game draws is made here: the skin's picture at its own size, centred */
function makeSkinRock(sk,sz,rc,seed){ return rockCentre(sk.rock(rockR(sk,sz,rc),sz,seed)); }
/* HD ships drawn a little larger or smaller around their own point (the flame and the light stay with the ship) */
(function(){ var SHIPK={fairy:0.72,vector:1.15,note:1.14};   // v1.27: the detailed fairy dragon a little smaller (its tail and tips reach further)
    // v0.83: by the hull, without the flame: vector 17 → 20, notebook 15 → 20 (0.79 measured the flame with them)
  Object.keys(SHIPK).forEach(function(id){ var sk=HDSK[id]; if(!sk||sk._shipK) return; var k=SHIPK[id], draw=sk.ship; sk._shipK=k;
    sk.ship=function(x,y,t,blink){ if(blink) return; hx.save(); hx.translate(x,y); hx.scale(k,k); hx.translate(-x,-y); try{ draw.call(this,x,y,t,blink); } finally { hx.restore(); } };
    if(sk.shipRoll){ var dr=sk.shipRoll; sk.shipRoll=function(x,y,t,a){ hx.save(); hx.translate(x,y); hx.scale(k,k); hx.translate(-x,-y); try{ dr.call(this,x,y,t,a); } finally { hx.restore(); } }; }
    if(sk.shipView){ var dv=sk.shipView; sk.shipView=function(v,x,y,t){ hx.save(); hx.translate(x,y); hx.scale(k,k); hx.translate(-x,-y); try{ dv.apply(this,arguments); } finally { hx.restore(); } }; } }); })();   // v1.35: the roll's views at the same size
/* v0.81: power-ups the size of what the game counts (the maintainer: «в рамках их зон и одинаковыми размерами в скинах/графиках»): the core
   takes one when the ship's point is within 9 of it on each axis — less the ship's own 3 that is 12 core units, PICK_W = 13 game pixels on a
   usual phone. The HD pictures are measured once (the body, alpha ≥ 128) and scaled to it; the pixel ones are drawn 13 pixels. */
var PICK_W=13;
function pickScale(sk){ if(sk._pk&&sk._pkKey===hs) return sk._pk; var keepH=hx, keepHs=hs, SC=4, c=document.createElement('canvas'); c.width=c.height=40*SC; var k=1;
  try{ hx=c.getContext('2d'); hx.setTransform(SC,0,0,SC,0,0); hs=SC; noLight=true; sk._pickDraw.call(sk,20,20,'shield'); var b=alphaBox(c); if(b) k=(sk.pickW||PICK_W)/(Math.max(b.w,b.h)/SC); }   // v1.28: a skin may ask for a smaller picture (neon 12 — a bright square looked as big as the ship)
  catch(e){} finally { hx=keepH; hs=keepHs; noLight=false; lights=[]; }
  sk._pk=k; sk._pkKey=hs; return k; }
(function(){ Object.keys(HDSK).forEach(function(id){ var sk=HDSK[id]; if(!sk||sk._pickDraw||id==='lcd') return; sk._pickDraw=sk.pick;
    sk.pick=function(x,y,type){ var k=pickScale(this); hx.save(); hx.translate(x,y); hx.scale(k,k); hx.translate(-x,-y); try{ this._pickDraw(x,y,type); } finally { hx.restore(); } }; }); })();
/* v0.83: saucers the size of what the game counts, the same in every skin (they were 18–24.5 wide, the small one 12–17.5): the core hits a
   big one within 7+1 of its middle across and a small one within 5+1 — 17 and 13 game pixels on a usual phone. HD pictures measured and scaled. */
var UFO_W=[13,17], sizeMeasure=0;   // v1.29: sizeMeasure > 0 while a picture is measured (a skin leaves out what is not the body, e.g. the notebook saucer's whoosh)
function ufoScale(sk,big){ var key=hs+(big?'b':'s'); sk._uk=sk._uk||{}; if(sk._uk[key]) return sk._uk[key]; var keepH=hx, keepHs=hs, SC=4, c=document.createElement('canvas'); c.width=c.height=60*SC; var k=1;
  try{ hx=c.getContext('2d'); hx.setTransform(SC,0,0,SC,0,0); hs=SC; noLight=true; sizeMeasure++; sk._ufoDraw.call(sk,30,30,big,false); var b=alphaBox(c); if(b) k=UFO_W[big?1:0]/(b.w/SC); }
  catch(e){} finally { hx=keepH; hs=keepHs; noLight=false; lights=[]; sizeMeasure--; }
  return (sk._uk[key]=k); }
(function(){ Object.keys(HDSK).forEach(function(id){ var sk=HDSK[id]; if(!sk||sk._ufoDraw||id==='lcd') return; sk._ufoDraw=sk.ufo;
    sk.ufo=function(ux,uy,big,hurt){ var k=ufoScale(this,big); hx.save(); hx.translate(ux,uy); hx.scale(k,k); hx.translate(-ux,-uy); try{ this._ufoDraw(ux,uy,big,hurt); } finally { hx.restore(); } }; }); })();
/* for tests/skin_sizes.js: a skin's rocks and ship as the game draws them, measured in game pixels — the body (alpha ≥ 128), its size
   against the core's circle and how far its middle sits from the point the game draws it at */
function sizeProbe(id,mode){ var sk=mode==='pixel'?SKINS[id]:HDSK[id]; if(!sk) return null; var keepL=lx, keepH=hx, keepHs=hs, SC=4, W=120, H=100, out={rocks:[],ship:null};
  if(!hdCv) hdSize();
  function grab(fn){ var c=document.createElement('canvas'); noLight=true; sizeMeasure++;
    try{ if(mode==='pixel'){ c.width=W; c.height=H; lx=c.getContext('2d'); lx.imageSmoothingEnabled=false; fn(lx); }
      else { c.width=W*SC; c.height=H*SC; hx=c.getContext('2d'); hx.setTransform(SC,0,0,SC,0,0); hs=SC; fn(hx); } }
    finally { lx=keepL; hx=keepH; hs=keepHs; noLight=false; lights=[]; sizeMeasure--; }
    var b=alphaBox(c), s=mode==='pixel'?1:SC; return b?{w:b.w/s,h:b.h/s,dx:b.cx/s-W/2,dy:b.cy/s-H/2}:null; }
  try{ var t=document.createElement('canvas'); t.width=LW; t.height=LH; if(mode==='pixel'){ lx=t.getContext('2d'); sk.sky(0,0); } else { hx=t.getContext('2d'); sk.sky(0,0); } }catch(e){} lx=keepL; hx=keepH;
  [0,1,2].forEach(function(sz){ var hit=2*Core.R_SIZE[sz]*K, n=0, pc=0, dx=0, dy=0;                           // six rocks, four turns each
    for(var seed=3;seed<9;seed++){ var sp=makeSkinRock(sk,sz,Core.R_SIZE[sz],seed*17+sz); sp.after=null;   // the body only (not the fairy cloud's lightning)
      for(var q=0;q<4;q++){ var m=grab(function(ctx){ if(sk.drawRock){ var r0=sp.rot; sp.rot=q*4; sk.drawRock(sp,W/2,H/2); sp.rot=r0; }
          else ctx.drawImage(sp.frames[q*4%sp.frames.length],Math.round(W/2-sp.size/2+(sp.ox||0)),Math.round(H/2-sp.size/2+(sp.oy||0))); });
        if(m){ n++; pc+=Math.max(m.w,m.h)/hit; dx+=m.dx; dy+=m.dy; } } }
    out.rocks.push(n?{pct:Math.round(100*pc/n),dx:+(dx/n).toFixed(1),dy:+(dy/n).toFixed(1)}:null); });
  // v0.83: the ship's hull — drawn without its flame, trail or exhaust (shipBare), the union of several frames (wings flap), alpha ≥ 128
  var hw=0, hh=0; shipBare=true;
  try{ [0.05,0.13,0.21,0.34,0.47,0.6].forEach(function(t){ var m=grab(function(){ sk.ship(W/2,H/2,t,false); }); if(m){ hw=Math.max(hw,m.w); hh=Math.max(hh,m.h); } }); } finally { shipBare=false; }
  out.ship=+hw.toFixed(1); out.shipH=+hh.toFixed(1);
  var pk=grab(function(){ sk.pick(W/2,H/2,'shield'); }); out.pick=pk?+Math.max(pk.w,pk.h).toFixed(1):0;
  var ub=grab(function(){ sk.ufo(W/2,H/2,true,false); }), us=grab(function(){ sk.ufo(W/2,H/2,false,false); }), bl=grab(function(){ sk.bullet(W/2,H/2); }), eb=grab(function(){ sk.ebullet(W/2,H/2); });
  out.ufo=ub?[+ub.w.toFixed(1),+ub.h.toFixed(1)]:[0,0]; out.ufoS=us?[+us.w.toFixed(1),+us.h.toFixed(1)]:[0,0]; out.bullet=bl?[+bl.w.toFixed(1),+bl.h.toFixed(1)]:[0,0]; out.ebullet=eb?[+eb.w.toFixed(1),+eb.h.toFixed(1)]:[0,0];
  return out; }
