/* ── SKINS (v0.70, the maintainer's sketches of 28 Sep): the same game, other pictures. A skin draws the sky, the rocks, the ship, the saucer,
   the power-ups, the shots and says the colours of the bursts; the game's logic, sizes and hit circles stay the same. The menus, the texts
   and the getting-ready screens keep the game's own colours (P). 'space' is the game as it was. Chosen on the game's menu, kept in
   'sonaroids_skin'. ── */
var SKIN_IDS=['space','fairy','vector','neon','note','lcd'];   // v0.73: sea and sweets removed; v0.74: vector 80s, neon, notebook, green LCD (shapes only, 45_hd.js)
var noLight=false;                                                     // an off-screen preview draws no soft light
/* a small pixel image made in memory, then turned into a canvas once */
function Pix(w,h){ this.w=w; this.h=h; this.d=new Uint8ClampedArray(w*h*4); }
Pix.prototype.put=function(x,y,c){ x=Math.round(x); y=Math.round(y); if(x<0||y<0||x>=this.w||y>=this.h) return; var o=(y*this.w+x)*4; this.d[o]=c[0]; this.d[o+1]=c[1]; this.d[o+2]=c[2]; this.d[o+3]=255; };
Pix.prototype.clear=function(x,y){ x=Math.round(x); y=Math.round(y); if(x<0||y<0||x>=this.w||y>=this.h) return; this.d[(y*this.w+x)*4+3]=0; };
Pix.prototype.get=function(x,y){ var o=(y*this.w+x)*4; return [this.d[o],this.d[o+1],this.d[o+2]]; };
Pix.prototype.rect=function(x,y,w,h,c){ for(var j=Math.round(y);j<Math.round(y+h);j++) for(var i=Math.round(x);i<Math.round(x+w);i++) this.put(i,j,c); };
Pix.prototype.disc=function(cx,cy,r,c){ for(var y=Math.floor(cy-r)-1;y<=cy+r+1;y++) for(var x=Math.floor(cx-r)-1;x<=cx+r+1;x++) if((x+0.5-cx)*(x+0.5-cx)+(y+0.5-cy)*(y+0.5-cy)<=r*r) this.put(x,y,c); };
/* a lit ball on a 5-step ramp with ordered dithering, the game's look (rim: the darkest step at the edge) */
Pix.prototype.ball=function(cx,cy,r,ramp,rim,k){ k=k===undefined?0.6:k; var n=ramp.length-1;
  for(var y=Math.floor(cy-r)-1;y<=cy+r+1;y++) for(var x=Math.floor(cx-r)-1;x<=cx+r+1;x++){ var dx=(x+0.5-cx)/r, dy=(y+0.5-cy)/r, d=Math.sqrt(dx*dx+dy*dy);
    if(d>1) continue; var lum=0.55+(-dx*0.62-dy*0.78)*k*d+(1-d)*0.2, i=Math.max(1,Math.min(n,Math.floor(lum*n+(bay(x,y)-0.5)*0.9+0.5)));
    if(rim&&d>1-1.3/r) i=0; this.put(x,y,ramp[i]); } };
Pix.prototype.poly=function(pts,c){ var y0=Math.floor(Math.min.apply(null,pts.map(function(p){ return p[1]; }))), y1=Math.ceil(Math.max.apply(null,pts.map(function(p){ return p[1]; })));
  for(var y=y0;y<=y1;y++){ var py=y+0.5, xs=[]; for(var a=0,b=pts.length-1;a<pts.length;b=a++){ var A=pts[a], B=pts[b]; if((A[1]>py)!==(B[1]>py)) xs.push(A[0]+(py-A[1])*(B[0]-A[0])/(B[1]-A[1])); }
    xs.sort(function(p,q){ return p-q; }); for(var k=0;k+1<xs.length;k+=2) for(var x=Math.ceil(xs[k]-0.5);x<=Math.floor(xs[k+1]-0.5);x++) this.put(x,y,c); } };
Pix.prototype.map=function(rows,pal,x,y){ for(var j=0;j<rows.length;j++) for(var i=0;i<rows[j].length;i++){ var c=pal[rows[j][i]]; if(c) this.put(x+i,y+j,c); } };
Pix.prototype.canvas=function(){ var c=document.createElement('canvas'); c.width=this.w; c.height=this.h; var x=c.getContext('2d'), im=x.createImageData(this.w,this.h); im.data.set(this.d); x.putImageData(im,0,0); return c; };
function cH(s){ return hex(s); }
function cHS(a){ return a.map(hex); }
function mixc(a,b,t){ return [Math.round(a[0]+(b[0]-a[0])*t),Math.round(a[1]+(b[1]-a[1])*t),Math.round(a[2]+(b[2]-a[2])*t)]; }
/* a vertical gradient through colour stops, ordered-dithered between neighbours */
function vgradPix(p,stops){ var S=cHS(stops), n=S.length-1; for(var y=0;y<p.h;y++){ var t=y/(p.h-1)*n, i=Math.min(n-1,Math.floor(t)), f=t-i; for(var x=0;x<p.w;x++) p.put(x,y,f>bay(x,y)?S[i+1]:S[i]); } }
function srand(seed){ var s=seed>>>0||1; return function(){ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
/* a sprite drawn from rows once per colour set and kept */
var mapCache={};
function mapCanvas(key,rows,pal){ if(mapCache[key]) return mapCache[key]; var w=0; rows.forEach(function(r){ w=Math.max(w,r.length); }); var p=new Pix(w,rows.length), P2={};
  for(var k in pal) if(pal[k]) P2[k]=cH(pal[k]); p.map(rows,P2,0,0); return mapCache[key]=p.canvas(); }
/* v0.71 (the readability audit, tests/skin_audit.js): on a light or mid sky every object gets a 1-pixel dark outline — the way pixel
   games keep things apart from any background. ink(canvas) is that canvas one pixel larger each way with the outline behind it */
function ink(c,col){ if(col==='sel') return selout(c); var w=c.width, h=c.height, s=c.getContext('2d').getImageData(0,0,w,h).data, o=document.createElement('canvas'); o.width=w+2; o.height=h+2;
  var ox=o.getContext('2d'), im=ox.createImageData(w+2,h+2), d=im.data, k=cH(col), A=function(x,y){ return x>=0&&y>=0&&x<w&&y<h&&s[(y*w+x)*4+3]>128; };
  for(var y=0;y<h+2;y++) for(var x=0;x<w+2;x++){ var o4=(y*(w+2)+x)*4, sx=x-1, sy=y-1;
    if(A(sx,sy)){ var i=(sy*w+sx)*4; d[o4]=s[i]; d[o4+1]=s[i+1]; d[o4+2]=s[i+2]; d[o4+3]=255; }
    else if(A(sx-1,sy)||A(sx+1,sy)||A(sx,sy-1)||A(sx,sy+1)||A(sx-1,sy-1)||A(sx+1,sy-1)||A(sx-1,sy+1)||A(sx+1,sy+1)){ d[o4]=k[0]; d[o4+1]=k[1]; d[o4+2]=k[2]; d[o4+3]=255; } }
  ox.putImageData(im,0,0); return o; }
/* v0.75 (the maintainer: not black frames — subtler): «selective outline» — the rim pixel takes a darker shade of the object's own colour
   next to it (the way pixel artists keep a sprite apart without a black line). ink(c,'sel') does that */
function darker(r,g,b){ var m=Math.max(r,g,b)||1; return [Math.round(r*0.42*(0.7+0.3*r/m)),Math.round(g*0.42*(0.7+0.3*g/m)),Math.round(b*0.42*(0.7+0.3*b/m))]; }
function selout(c){ var w=c.width, h=c.height, s=c.getContext('2d').getImageData(0,0,w,h).data, o=document.createElement('canvas'); o.width=w+2; o.height=h+2;
  var ox=o.getContext('2d'), im=ox.createImageData(w+2,h+2), d=im.data, A=function(x,y){ return x>=0&&y>=0&&x<w&&y<h&&s[(y*w+x)*4+3]>128; };
  for(var y=0;y<h+2;y++) for(var x=0;x<w+2;x++){ var o4=(y*(w+2)+x)*4, sx=x-1, sy=y-1;
    if(A(sx,sy)){ var i=(sy*w+sx)*4; d[o4]=s[i]; d[o4+1]=s[i+1]; d[o4+2]=s[i+2]; d[o4+3]=255; continue; }
    var nb=[[sx-1,sy],[sx+1,sy],[sx,sy-1],[sx,sy+1],[sx-1,sy-1],[sx+1,sy-1],[sx-1,sy+1],[sx+1,sy+1]].filter(function(q){ return A(q[0],q[1]); });
    if(nb.length){ var j=(nb[0][1]*w+nb[0][0])*4, k=darker(s[j],s[j+1],s[j+2]); d[o4]=k[0]; d[o4+1]=k[1]; d[o4+2]=k[2]; d[o4+3]=255; } }
  ox.putImageData(im,0,0); return o; }
/* a sprite from rows with the skin's outline, drawn with its top-left corner (of the rows) at x, y */
function spr(key,rows,pal,x,y,col){ var k=key+'|'+col; if(!mapCache[k]) mapCache[k]=ink(mapCanvas(key,rows,pal),col); lx.drawImage(mapCache[k],Math.round(x)-1,Math.round(y)-1); }
/* a small solid shape (a shot) with the outline: rects [x,y,w,h,colour] drawn over their own dark border */
function shot(parts,col){ parts.forEach(function(q){ var c=col; if(col==='sel'){ var k=hex(q[4]), dk=darker(k[0],k[1],k[2]); c='rgb('+dk.join(',')+')'; } R(c,q[0]-1,q[1]-1,q[2]+2,q[3]+2); }); parts.forEach(function(q){ R(q[4],q[0],q[1],q[2],q[3]); }); }
function inkRock(p,col){ var cv=ink(p.canvas(),col), fr=[]; for(var i=0;i<16;i++) fr.push(cv); return {frames:fr,size:cv.width,rot:0,vr:0}; }
function whiteMap(rows){ return rows.map(function(r){ return r.replace(/[^.]/g,'w'); }); }
/* a sky: a canvas twice the screen's width drifting left (as the nebula does), made once per screen size, plus drifting motes */
function skySheet(sk){ var key=LW+'x'+LH; if(sk._sheet&&sk._sheet.key===key) return sk._sheet;
  var w=LW*2, p=new Pix(w,LH); sk.paint(p,w,LH); var sh={key:key,c:p.canvas(),x:0,motes:[]};
  var R2=srand(7); for(var i=0;i<Math.round(LW*LH/(sk.moteDiv||900));i++) sh.motes.push({x:R2()*LW,y:R2()*LH*(sk.moteH||1),z:R2(),tw:R2()*6});
  return sk._sheet=sh; }
function skinSky(sk,dt,speed){ var sh=skySheet(sk); sh.x=(sh.x+3*K*dt*speed*(sk.skySpeed||1))%(LW*2);
  lx.drawImage(sh.c,-Math.floor(sh.x),0); lx.drawImage(sh.c,LW*2-Math.floor(sh.x),0);
  var t=performance.now()/1000;
  sh.motes.forEach(function(m){ m.x-=(4+m.z*m.z*20)*K*dt*speed; m.y+=(sk.moteUp||0)*K*dt*(0.5+m.z); if(m.x<0){ m.x+=LW; m.y=Math.random()*LH*(sk.moteH||1); } if(m.y<0) m.y+=LH*(sk.moteH||1);
    var c=sk.motes[m.z<0.6?0:1]; if(Math.sin(t*3+m.tw)>0.7) c=sk.motes[2]||c; R(c,Math.round(m.x),Math.round(m.y),1,1); }); }
/* hills that wrap round the sheet's width: a sum of sines with whole periods */
function hill(x,w,base,amp,seed){ var a=2*Math.PI*x/w; return base+amp*(0.6*Math.sin(a*3+seed)+0.3*Math.sin(a*7+seed*2)+0.15*Math.sin(a*13+seed*3)); }

var SKINS={};
/* ═══ space — the game as it was ═══ */
/* v1.25, the space skin's pixel ship «БВ1» and saucer «В1» (the HD pictures in 45_hd.js, drawn again pixel by pixel): the old ship's
   silhouette with its orange-and-yellow wing stripes, the intake grille, the pilot in a red helmet under the canopy, twin engines and a
   missile under each wing; the jellyfish — a glass dome with its glowing core on a pink ring, feelers swaying under it (live) */
var SP_SHIP=[
 '...kkkkk.............',
 '...kooylk............',
 '....ksssssr..........',
 '....kmllldlk.........',
 'gGgkklllldllwwk......',
 'gGgkllllllkcccWckwk..',
 '..kdmdmmmmkbrnbbkmmlk',
 'gGgkmmmmmmmmkkkmdk...',
 'gGgkkddddkddddk......',
 '....kddddkdk.........',
 '....ksssssr..........',
 '...kooydk............',
 '...kkkkk.............'
].map(function(r){ return r.replace(/ /g,'k'); });
var SP_SHIP_PAL={s:'#e8ecf2',k:'#0c3a34',d:'#1d7c6c',m:'#3fc4a6',l:'#8ff0d6',w:'#e8fff8',g:'#3a4a58',G:'#8a9aa8',o:'#ff6a3c',y:'#ffd23f',c:'#9ff0ff',b:'#2a78a8',r:'#e8303a',n:'#283040',W:'#ffffff'};
var SP_UFO=['......KKKKK......','.....KqWPPPK.....','....KqPyYyPpK....','...KqPPyYyPppK...','...KPPPPyPPppK...','.KKRRRpppppRRRKK.','KRRRRRRRRRRRRRRRK','.KKrrrrrrrrrrrKK.','...KKKKKKKKKKK...'];
var SP_UFO_S=['.....KKK.....','...KqWPPpK...','..KqPyYyPpK..','..KPPPyPppK..','.KKRRpppRRKK.','KRRRRRRRRRRRK','.KKrrrrrrrKK.'];
var SP_UFO_PAL={f:'#ff96e1',K:'#7a1a78',p:'#b04ac8',P:'#e090ec',q:'#ffd8ff',W:'#ffffff',y:'#ffe9a0',Y:'#fffbe0',R:'#ffd0f0',r:'#c050c8'};
var SP_JEL0=['.KKK.','KqYpK','RRRRR','.f.f.','.y.y.'], SP_JEL1=['.KKK.','KqYpK','RRRRR','.f.f.','y...y'];   // v1.27, the saucers' shot: a little jellyfish (5×5)
var SP_JEL_PAL={K:'#7a1a78',q:'#ff9ae6',Y:'#fff3a0',p:'#c040c8',R:'#ff5ac8',f:'#ff7ad8',y:'#ffe066'};   // stronger pink than the saucer: told from the blue shots at a glance
/* v1.25, the pixel power-up «4»: a gold plate with cut corners, lit from the top left, a plain panel (the rays of HD are too fine for 13 pixels), screws on its sides, the dark sign; a glint runs across */
var SP_PICK=['..KKKKKKKKK..','.KLLLLsLLLGK.','KLLqqqqqppGGK','KLqqqqqppppDK','KLqqqqpppppDK','KLqqqppppppDK','KsqqpppppppsK','KLqppppppppDK','KLpppppppppDK','KLpppppppppDK','KGGpppppppDDK','.KGDDDsDDDDK.','..KKKKKKKKK..'];
var SP_PICK_PAL={K:'#6a3a00',L:'#fff2b0',G:'#ffd24a',D:'#c8840c',s:'#8a5000',q:'#ffe27a',p:'#f4b832',r:'#dc9a1c'};
/* v1.27, the space skin's pixel asteroid «Б + лава»: the old dithered rock (lit from the top left, craters), now with lava glowing in some
   of its craters and a thin lava crack on the bigger ones — 16 turning frames, as before */
function makeRockLava(r){
  var n=11+Math.floor(Math.random()*4), pts=[], i, f, k;
  for(i=0;i<n;i++) pts.push({a:i/n*Math.PI*2+rnd(-0.15,0.15), r:r*rnd(0.74,1.0)});
  var cr=[]; for(i=0;i<2+Math.floor(r/5);i++) cr.push({a:rnd(0,6.28),d:rnd(0.1,0.55)*r,r:rnd(0.14,0.28)*r,lava:i%3===1});
  var ck=[]; if(r>=8){ var ka=rnd(0,6.28), px=Math.cos(ka)*r, py=Math.sin(ka)*r; ck.push([px,py]); for(k=0;k<4;k++){ px+=-px*0.28+rnd(-0.3,0.3)*r; py+=-py*0.28+rnd(-0.3,0.3)*r; ck.push([px,py]); } }
  var size=Math.ceil(r*2)+3, frames=[], ramp=P.rock.map(hex), LV=[hex('#c8501a'),hex('#ff8c32'),hex('#fff2b0')];
  for(f=0;f<16;f++){
    var rot=f/16*Math.PI*2, cvs=document.createElement('canvas'); cvs.width=size; cvs.height=size;
    var c=cvs.getContext('2d'), im=c.createImageData(size,size), cxr=size/2, cyr=size/2, inside=new Uint8Array(size*size), lava=new Uint8Array(size*size);
    var poly=pts.map(function(p){ return [cxr+Math.cos(p.a+rot)*p.r, cyr+Math.sin(p.a+rot)*p.r]; });
    for(var y=0;y<size;y++) for(var x=0;x<size;x++){ var qx=x+0.5,qy=y+0.5,ins=false;
      for(var a=0,b=poly.length-1;a<poly.length;b=a++){ var xa=poly[a][0],ya=poly[a][1],xb=poly[b][0],yb=poly[b][1];
        if(((ya>qy)!==(yb>qy))&&(qx<(xb-xa)*(qy-ya)/(yb-ya)+xa)) ins=!ins; }
      inside[y*size+x]=ins?1:0; }
    if(ck.length){ var cs=Math.cos(rot), sn=Math.sin(rot); for(k=0;k<ck.length-1;k++){ var x0=cxr+ck[k][0]*cs-ck[k][1]*sn, y0=cyr+ck[k][0]*sn+ck[k][1]*cs, x1=cxr+ck[k+1][0]*cs-ck[k+1][1]*sn, y1=cyr+ck[k+1][0]*sn+ck[k+1][1]*cs, m=Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0)));
      for(var j=0;j<=m;j++){ var lxp=Math.floor(x0+(x1-x0)*j/m), lyp=Math.floor(y0+(y1-y0)*j/m); if(lxp>=0&&lyp>=0&&lxp<size&&lyp<size) lava[lyp*size+lxp]=Math.max(lava[lyp*size+lxp],2); } } }
    for(y=0;y<size;y++) for(x=0;x<size;x++){ if(!inside[y*size+x]) continue;
      var dx=(x+0.5-cxr)/r, dy=(y+0.5-cyr)/r, d=Math.min(1,Math.sqrt(dx*dx+dy*dy));
      var lum=0.55+(-dx*0.62-dy*0.78)*0.55*d+(1-d)*0.18, lv=lava[y*size+x];
      for(k=0;k<cr.length;k++){ var ca=cr[k].a+rot, ccx=cxr+Math.cos(ca)*cr[k].d, ccy=cyr+Math.sin(ca)*cr[k].d, q=Math.hypot(x+0.5-ccx,y+0.5-ccy)/cr[k].r;
        if(q<1){ var inner=((x+0.5-ccx)*0.62+(y+0.5-ccy)*0.78)/cr[k].r; if(cr[k].lava&&q<0.75) lv=Math.max(lv,q<0.35?3:2); else lum+=q<0.8?-0.22+inner*0.18:0.08; } }
      var edge=!inside[y*size+x-1]||!inside[y*size+x+1]||!inside[(y-1)*size+x]||!inside[(y+1)*size+x];
      var col; if(lv&&!edge) col=LV[lv-1]; else { var idx=Math.max(1,Math.min(4,Math.floor(lum*4+(bay(x,y)-0.5)*0.9+0.5))); if(edge) idx=Math.max(0,Math.min(idx,1)); col=ramp[idx]; }
      var o=(y*size+x)*4; im.data[o]=col[0]; im.data[o+1]=col[1]; im.data[o+2]=col[2]; im.data[o+3]=255; }
    c.putImageData(im,0,0); frames.push(cvs); }
  return {frames:frames,size:size,rot:Math.random()*16,vr:rnd(-5,5)};
}
/* v1.27, the space skin's explosions — a style per event (the maintainer: «камень Б, нло В, подарок Д, подбит Г»): a broken rock throws
   tumbling chunks, dust and lava sparks after a flash; a saucer goes in a white flash and a shockwave with streaking sparks; a power-up
   bursts into twinkling stars; the hit ship in a star flash and cartoon puffs of smoke. The game's sparks (parts) carry their event in their
   colours (bursts(): each list named by its kind); the flash, the ring and the puffs of each burst are kept here, one per burst, ~0.8 s. */
var SPFX=[], SPFX_T=0, SPFX_N=0;
function spKinds(b){ for(var k in b) b[k].kind=k; return b; }
function spFxTrack(){ var now=performance.now()/1000, dt=SPFX_T?Math.min(0.1,Math.max(0,now-SPFX_T)):0, seen={}; SPFX_T=now;
  SPFX.forEach(function(e){ e.t+=dt; }); SPFX=SPFX.filter(function(e){ return e.t<0.8; });
  parts.forEach(function(p){ if(p._k!==undefined) return; var k=(p.cols&&p.cols.kind)||''; p._k=k; p._i=SPFX_N++; if(!k) return;
    var key=k+'|'+Math.round(p.x)+'|'+Math.round(p.y); if(seen[key]) return; seen[key]=1; SPFX.push({x:p.x,y:p.y,k:k,t:0,seed:(SPFX_N*7919)%1000,cols:p.cols}); }); }   // v1.28: the colours kept (neon: a power-up's own colour)
var SP_HOT={rock:['#fff2b0','#ff8c32'],ufo:['#ffffff','#fff7c8'],pick:['#ffffff','#ffe066'],ship:['#ffffff','#7fdcff','#ff6a3c','#ffd23f']};
/* the pixel look of the same: chunks are 2×2 blocks with a dark pixel, sparks short streaks, stars little crosses, puffs round blocks */
function spPxParts(){ spFxTrack(); var i;
  SPFX.forEach(function(e){ var t=e.t, x0=Math.round(e.x), y0=Math.round(e.y), R2=srand(e.seed);
    if(e.k==='rock'&&t<0.12){ R('#ffffff',x0-1,y0-1,3,3); }
    if(e.k==='rock'&&t<0.7){ lx.globalAlpha=0.35*(1-t/0.7); for(i=0;i<4;i++){ var a=R2()*6.2832, d=(3+R2()*4)*Math.min(1,t*4), r=Math.round((2+R2()*2)*(0.6+t)); R('#8a7098',Math.round(x0+Math.cos(a)*d-r/2),Math.round(y0+Math.sin(a)*d-r/2),r,r); } lx.globalAlpha=1; }
    if(e.k==='ufo'){ var u=Math.min(1,t/0.45); if(t<0.1) R('#ffffff',x0-2,y0-2,5,5); if(u<1){ lx.globalAlpha=1-u; var rr=3+u*20; for(i=0;i<32;i++){ var b=i/32*6.2832; R(i%2?'#ffffff':'#ffd0f0',Math.round(x0+Math.cos(b)*rr),Math.round(y0+Math.sin(b)*rr*0.8),1,1); } lx.globalAlpha=1; } }
    if(e.k==='ship'){ if(t<0.15){ R('#fffbe0',x0-4,y0,9,1); R('#fffbe0',x0,y0-4,1,9); R('#ffffff',x0-1,y0-1,3,3); }
      if(t<0.7){ lx.globalAlpha=Math.max(0,1-t/0.7); for(i=0;i<6;i++){ var a2=R2()*6.2832, d2=(3+R2()*5)*(1-Math.exp(-5*t)), r2=Math.round((2+R2()*2)*(0.5+t*1.2)), cx=Math.round(x0+Math.cos(a2)*d2), cy=Math.round(y0+Math.sin(a2)*d2);
        R(i%2?'#3fc4a6':'#8ff0d6',cx-r2,cy-r2+1,2*r2+1,2*r2-1); R(i%2?'#3fc4a6':'#8ff0d6',cx-r2+1,cy-r2,2*r2-1,2*r2+1); R('#e8fff8',cx-r2+1,cy-r2+1,1,1); } lx.globalAlpha=1; } } });
  parts.forEach(function(p){ var f=p.life/p.max, k=p._k, c=p.cols[Math.min(p.cols.length-1,Math.floor((1-f)*p.cols.length))], X=Math.round(p.x), Y=Math.round(p.y);
    if(k==='rock'){ if(p._i%3===0){ R(SP_HOT.rock[p._i%2],X,Y,1,1); R(SP_HOT.rock[1],Math.round(p.x-p.vx*0.03),Math.round(p.y-p.vy*0.03),1,1); } else if(p._i%3===1&&f>0.3){ R(p.cols[2],X,Y,2,2); R(p.cols[3],X+1,Y+1,1,1); } else R(c,X,Y,1,1); }
    else if(k==='ufo'){ R(p._i%2?'#ffffff':c,X,Y,1,1); R(c,Math.round(p.x-p.vx*0.04),Math.round(p.y-p.vy*0.04),1,1); }
    else if(k==='pick'){ var tw=Math.sin(clock*30+p._i)>0; R(c,X,Y,1,1); if(tw&&f>0.3){ R(c,X-1,Y,1,1); R(c,X+1,Y,1,1); R(c,X,Y-1,1,1); R(c,X,Y+1,1,1); } }
    else if(k==='ship'){ if(p._i%3===0&&f>0.3){ R(p.cols[2],X,Y,2,2); R(p.cols[3],X+1,Y+1,1,1); } else R(p._i%4===1?SP_HOT.ship[2+p._i%2]:c,X,Y,1,1); }
    else R(c,X,Y,1,1);
    if(f>0.6) light(p.x,p.y,3*K,hex(c).join(','),0.2); }); }
/* v1.27, the fairy tale's explosions in pixels (as in HD: cloud — stars and hearts, bat — dark smoke, wing bits, red sparks, coin — golden
   puffs and stars, the hit dragon — a rainbow ring and glitter) */
function fzPxParts(){ spFxTrack(); var i, RB=['#d84a98','#d8a000','#10b080','#2a6ad0','#8048d0'], GL=['#ff9ad6','#ffe066','#7affc8','#7ab8ff','#c89aff'];
  SPFX.forEach(function(e){ var t=e.t, x0=Math.round(e.x), y0=Math.round(e.y), R2=srand(e.seed);
    if(e.k==='ufo'&&t<0.7){ lx.globalAlpha=0.55*(1-t/0.7); for(i=0;i<5;i++){ var a=R2()*6.2832, d=(2+R2()*5)*Math.min(1,t*4), r=Math.round((2+R2()*2)*(0.6+t)); R('#3a2e66',Math.round(x0+Math.cos(a)*d-r/2),Math.round(y0+Math.sin(a)*d-t*4-r/2),r,r); } lx.globalAlpha=1; }
    if(e.k==='pick'&&t<0.75){ lx.globalAlpha=1-t/0.75; for(i=0;i<7;i++){ var a2=R2()*6.2832, d2=(3+R2()*7)*(1-Math.exp(-5*t)), r2=Math.round((1.5+R2()*2)*(0.5+t)), cx=Math.round(x0+Math.cos(a2)*d2), cy=Math.round(y0+Math.sin(a2)*d2-t*3);
        R('#c8840c',cx-r2,cy-r2+1,2*r2+1,2*r2-1); R('#c8840c',cx-r2+1,cy-r2,2*r2-1,2*r2+1); R(i%2?'#ffc233':'#ffe066',cx-r2+1,cy-r2+1,2*r2-1,2*r2-1); R('#fffbe0',cx-r2+1,cy-r2+1,1,1); } lx.globalAlpha=1; }
    if(e.k==='ship'){ var u=Math.min(1,t/0.45); if(u<1){ lx.globalAlpha=1-u; var rr=3+u*20; for(i=0;i<40;i++){ var b=i/40*6.2832; R(RB[Math.floor(((b+t*3)/6.2832*5)%5+5)%5],Math.round(x0+Math.cos(b)*rr),Math.round(y0+Math.sin(b)*rr),1,1); } lx.globalAlpha=1; } } });
  parts.forEach(function(p){ var f=p.life/p.max, k=p._k, c=p.cols[Math.min(p.cols.length-1,Math.floor((1-f)*p.cols.length))], X=Math.round(p.x), Y=Math.round(p.y), tw=Math.sin(clock*25+p._i)>0;
    if(k==='rock'){ if(p._i%3===0){ var hc=p._i%2?'#ff8ab8':'#fff3a0'; R(hc,X-1,Y-1,1,1); R(hc,X+1,Y-1,1,1); R(hc,X-1,Y,3,1); R(hc,X,Y+1,1,1); } else { var sc=p.cols[p._i%3]; R(sc,X,Y,1,1); if(tw&&f>0.3){ R(sc,X-1,Y,1,1); R(sc,X+1,Y,1,1); R(sc,X,Y-1,1,1); R(sc,X,Y+1,1,1); } } }
    else if(k==='ufo'){ if(p._i%4===0){ R('#5a4a8a',X,Y,2,1); R('#2a1e50',X+1,Y+1,1,1); } else if(p._i%4===1) R('#ff4a4a',X,Y,1,1); else R('#d8c8ff',X,Y,1,1); }
    else if(k==='pick'){ if(p._i<10||p._i%2){ var pc=p._i%2?'#ffffff':'#ffe066'; R(pc,X,Y,1,1); if(tw&&f>0.3){ R(pc,X-1,Y,1,1); R(pc,X+1,Y,1,1); R(pc,X,Y-1,1,1); R(pc,X,Y+1,1,1); } } }
    else if(k==='ship'){ if(Math.sin(clock*40+p._i)>-0.3) R(GL[p._i%5],X,Y,1,1); }
    else R(c,X,Y,1,1); }); }
SKINS.space={id:'space', glow:true,
  sky:function(dt,s){ spaceSky(dt,s); lx.fillStyle='rgba(10,6,26,0.45)'; lx.fillRect(0,0,LW,LH); },   // v0.81: the background dimmed like in HD (the rocks stood out half as much)
  rock:function(r){ return makeRockLava(r); },
  ship:function(x,y,t,blink){ if(blink) return; var sx=Math.round(x), sy=Math.round(y), fl=Math.floor(t*20)%3;
    if(!shipBare) [[-2,-1],[1,2]].forEach(function(r2){ var a=r2[0], b=r2[1], c=r2[0]<0?a:b, e=r2[0]<0?b:a;   // two rows each: the outer one short, the inner one long and white-hot
      R('#4a90ff',sx-3-(fl>>1),sy+c,3+(fl>>1),1); R('#3a7cff',sx-6-fl,sy+e,6+fl,1); R('#9fe6ff',sx-4-(fl>>1),sy+e,4+(fl>>1),1); R('#ffffff',sx-2,sy+e,2,1); if(fl!==1) R('#d8f6ff',sx-4-(fl>>1),sy+c,1,1); });
    lx.drawImage(mapCanvas('spship1',SP_SHIP,SP_SHIP_PAL),sx,sy-6);
    var bl=Math.floor(t*3)%2; R(bl?'#ff6060':'#7a2020',sx+3,sy-6,1,1); R(bl?'#2a6a40':'#7affb0',sx+3,sy+6,1,1); light(x-2,y,9*K,'130,200,255',0.4); },
  ufo:function(ux,uy,big,hurt){ var m=big?SP_UFO:SP_UFO_S, w=big?17:13, cx=Math.round(ux), cy=Math.round(uy), ox=cx-(w>>1), top=cy-(big?6:5), t=clock, i;
    var fc=hurt?'#ffffff':'#ff96e1';
    (big?[-4,0,4]:[-3,0,3]).forEach(function(X,j){ var n=big?5:3; for(var q=1;q<=n;q++){ var s=q/n, px=cx+X+Math.round(Math.sin(t*4+j*1.7+s*3.2)*1.2*s); R(q===n?(hurt?'#ffffff':'#fff0a8'):fc,px,cy+(big?2:1)+q,1,1); } });
    lx.drawImage(mapCanvas('spufo'+big+hurt,hurt?whiteMap(m):m,hurt?{w:'#ffffff'}:SP_UFO_PAL),ox,top);
    if(!hurt){ if(Math.sin(t*6)>0.3) R('#ffffff',cx,cy-(big?4:3),1,1);
      var nL=big?7:5, rx=big?7:5; for(i=0;i<nL;i++){ var a=i/nL*6.2832+t*2.4; if(Math.sin(a)>0.1) R(['#ffe66d','#7affc8','#ffffff'][i%3],cx+Math.round(Math.cos(a)*rx),cy,1,1); } }
    light(ux,uy,(big?22:16)*K,'255,140,220',0.35); },
  pick:function(x,y,type){ var sx=Math.round(x), sy=Math.round(y), t=clock, i; lx.drawImage(mapCanvas('sppick',SP_PICK,SP_PICK_PAL),sx-6,sy-6);
    var gp=Math.floor(((t*0.6)%1.6)*20)-4; if(gp>=0&&gp<=24) for(i=0;i<13;i++){ var gx=gp-i; if(gx<0||gx>12) continue; var ch=SP_PICK[i][gx]; if(ch!=='.'&&ch!=='K') { lx.globalAlpha=0.55; R('#fffbe0',sx-6+gx,sy-6+i,1,1); lx.globalAlpha=1; } }
    blit(ICON[type],['#fff2b0'],sx-2,sy-2); blit(ICON[type],['#100300'],sx-3,sy-3);   // v1.27: the sign over the glint, darker
    light(x,y,14*K,P.glowP,0.4); },   // v0.81: 13 pixels (the core's zone) with a two-pixel frame (was 11 with one)
  bullet:function(x,y){ var sx=Math.round(x), sy=Math.round(y);   // v1.27, «П4»: a plasma needle — a faint blue trace, a ring, a white-hot head
    lx.globalAlpha=0.45; R('#3a7cff',sx-9,sy,5,1); lx.globalAlpha=1; R('#4aa8ff',sx-4,sy,2,1); R('#bff0ff',sx-3,sy-1,1,1); R('#bff0ff',sx-3,sy+1,1,1); R('#7fdcff',sx-2,sy,2,1); R('#e8fbff',sx,sy,1,1); R('#ffffff',sx+1,sy,2,1); R('#7fdcff',sx+3,sy,1,1); R('#4aa8ff',sx-1,sy-1,1,1); R('#4aa8ff',sx-1,sy+1,1,1); R('#7fdcff',sx,sy-1,3,1); R('#7fdcff',sx,sy+1,3,1);
    light(x,y,7*K,'150,215,255',0.55); },
  ebullet:function(x,y){ var f=Math.floor(clock*6+x*0.2)%2;   // v1.27, «Е»: a little jellyfish, its feelers swaying
    lx.drawImage(mapCanvas('spjel'+f,f?SP_JEL1:SP_JEL0,SP_JEL_PAL),Math.round(x)-2,Math.round(y)-2); light(x,y,7*K,'255,122,200',0.5); },
  /* v1.27, the shield «Б»: a honeycomb bubble — a faint mesh of hexagons inside a cyan ring, brighter at the front, a cell lighting up */
  shieldRing:function(x,y,t){ var cx=Math.round(x)+8, cy=Math.round(y), W=27, H=23, ox=cx-13, oy=cy-11;
    var mesh=pixOnce('spshmesh',W,H,function(p){ var c=cH('#8fe8ff'), hr=3, hw=hr*Math.sqrt(3), row, col, k, inside=function(px,py){ return Math.pow((px-13)/11.5,2)+Math.pow((py-11)/9.2,2)<1; };
        for(row=-4;row<=4;row++) for(col=-3;col<=4;col++){ var hx0=13+col*hw+(row%2?hw/2:0), hy0=11+row*hr*1.5;
          for(k=0;k<6;k++){ var a0=k/6*6.2832+Math.PI/6, a1=a0+1.0472, x0=hx0+Math.cos(a0)*hr, y0=hy0+Math.sin(a0)*hr, x1=hx0+Math.cos(a1)*hr, y1=hy0+Math.sin(a1)*hr, n=Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0)));
            for(var j=0;j<=n;j++){ var px=Math.round(x0+(x1-x0)*j/n), py=Math.round(y0+(y1-y0)*j/n); if(inside(px,py)) p.put(px,py,c); } } } });
    var ring=pixOnce('spshring',W,H,function(p){ p.ring(13,11,12.5,10,cH('#9ff0ff')); p.ring(13,11,12.5,10,cH('#e8fbff'),-0.7,0.7); p.ring(13,11,11.5,9,cH('#e8fbff'),-0.6,0.6); p.ring(13,11,10.5,8,cH('#ffffff'),Math.PI*1.12,Math.PI*1.4); });
    lx.globalAlpha=0.22; lx.drawImage(mesh,ox,oy); lx.globalAlpha=0.75+0.2*Math.sin(t*5); lx.drawImage(ring,ox,oy);
    var k2=Math.floor(t*3)%9, a=k2/9*6.2832+0.3; lx.globalAlpha=0.6*(1-(t*3)%1); R('#e8fbff',cx+Math.round(Math.cos(a)*7.5)-1,cy+Math.round(Math.sin(a)*6)-1,3,2); lx.globalAlpha=1; },
  bursts:function(){ return spKinds({rock:['#f2dde6','#cdb0c8','#a084b4','#6a5690'],ufo:['#ffffff','#ffd0f0','#e090ec','#b040c0'],ship:['#e8fff8','#8ff0d6','#3fc4a6','#1d7c6c'],pick:['#fffbe0','#ffe066','#ffc233','#c8840c']}); },
  pxParts:function(){ spPxParts(); },
  shield:function(){ return P.pick; }, mini:function(){ return [P.ship[1],P.ship[2]]; } };

/* ═══ fairy — a little dragon over a fairy-tale land by day; grumpy storm clouds, a bat for the saucer, fireballs, gold coins ═══ */
var DRAGON=['.....U.............','.....UU.......h.h..','......UU......h.h..','......WWW....VVee..','.......WWW.ooGGekG.','........VWVVGGGeeyy','.......GGGGGGGgpgg.','....GGgggLLLLGg....','...GGGGgLLLLLg.....','ttgggg...gg.g......','tt.......g..g......'];   // v1.27: redrawn from the HD dragon «Б1» (its outline, golden wing, spine, big eye, snout, blush, tail tip): 21×13 with the outline, as HD
var DRAGON_PAL={g:'#136640',G:'#2c9e64',V:'#5cd498',L:'#fff1a6',o:'#ffb030',W:'#ffb030',U:'#fff0b0',t:'#ff8a5a',h:'#f0c030',y:'#ff9a6a',e:'#ffffff',k:'#1a1a2a',p:'#ff8ab0'};
var BAT=['k....k...k....k','kk...kpkpk...kk','kmk.kkekekk.kmk','kmmkkkkkkkkkmmk','.kmmkkwkwkkmmk.','..k...k.k...k..'];   // v1.27: 17×8 with its outline, the size of the HD bat; pink ears, red eyes, fangs
var BAT_S=['k...k.k...k','kk.kpkpk.kk','kmkkekekkmk','.kmkwkwkmk.','...k...k...'];   // 13×7 with its outline
SKINS.fairy={id:'fairy', glow:false, ink:'sel', motes:['#ffffff','#f4f3ff','#ffffff'],   // v0.75: selective outline, pale haze
  moteDiv:1400, moteH:0.8,
  paint:function(p,w,h){ vgradPix(p,['#b8def8','#c6e5fa','#d5ecfb','#e5f2fc','#f8eaf2']);
    var R2=srand(4), cl=cH('#eaf4fd');
    for(var i=0;i<9;i++){ var cx=R2()*w, cy=h*(0.08+R2()*0.55), s=0.8+R2()*0.7;
      [[-14,3,7],[-5,-2,10],[7,0,9],[16,4,6]].forEach(function(b){ for(var d=-w;d<=w;d+=w) p.disc(cx+d+b[0]*s,cy+b[1]*s,b[2]*s,cl); }); }
    var hl=cH('#d8d0f2'), hl2=cH('#d0c6ee'), c1=cH('#cbbff0'), c2=cH('#bcaee8'), roof=cH('#f4c6e0'), gr=cH('#c6ecc2'), grl=cH('#dcf5d4');
    for(var x=0;x<w;x++){ var y1=Math.round(hill(x,w,h-20,7,1)); for(var y=y1;y<h;y++) p.put(x,y,(x+y)%17?hl:hl2); }
    [w*0.3,w*0.8].forEach(function(cx){ cx=Math.round(cx); var base=Math.round(hill(cx,w,h-20,7,1))+2;             // two castles far away
      p.rect(cx-14,base-14,36,18,c1); for(var i=0;i<36;i+=4) p.rect(cx-14+i,base-16,2,2,c1); p.rect(cx+1,base-8,6,12,c2);
      [[-18,7,26],[-3,8,34],[16,7,24]].forEach(function(t){ p.rect(cx+t[0],base-t[2],t[1],t[2]+4,c1); p.poly([[cx+t[0]-1,base-t[2]],[cx+t[0]+t[1]/2,base-t[2]-11],[cx+t[0]+t[1]+1,base-t[2]]],roof); }); });
    for(x=0;x<w;x++){ var y2=Math.round(hill(x,w,h-9,4,2.5)); for(y=y2;y<h;y++) p.put(x,y,y>y2+1?gr:grl); } },
  sky:function(dt,s){ skinSky(this,dt,s); },
  /* v1.27, the storm cloud «Б» in pixels — the HD cloud's own puffs (the same shape and size): lit tops, a dark belly, seams between the
     puffs, a pink glow under it, a face on the big and middle ones (brows, eyes with a shine, a frown, cheeks), brows on the small ones,
     a lightning bolt under the big ones */
  rock:function(r,sz,seed){ var w=r*2.3, h=w*0.55, R2=srand(seed*13+5), P=[], i, x0, y0;
    for(i=0;i<13;i++){ var px=(-0.38+0.76*R2())*w, py=(0.02+0.16*R2())*h, pr=(0.13+0.13*R2())*w*(1-Math.abs(px)/w*0.8); P.push([px,py,pr]); } P.push([0,-0.05*h,0.24*w]);
    var n=Math.ceil(w*1.1)+4, c=n/2, p=new Pix(n,n), C={base:cH('#5e52a8'),belly:cH('#2e2470'),top:cH('#8a80d0'),hi:cH('#c8c3ff'),rim:cH('#e070b8'),seam:cH('#1e1640'),I:cH('#1e1640'),w:cH('#ffffff'),pk:cH('#ff8ab8'),y:cH('#fff3a0')};
    var inU=function(X,Y,dy){ for(var k=0;k<P.length;k++){ var q=P[k]; if(Math.pow(X-q[0],2)+Math.pow(Y-q[1]-(dy||0),2)<=q[2]*q[2]) return k; } return -1; };
    for(y0=0;y0<n;y0++) for(x0=0;x0<n;x0++){ var X=x0+0.5-c, Y=y0+0.5-c, k=inU(X,Y,0);
      if(k<0){ if(inU(X,Y,1.2)>=0) p.put(x0,y0,C.rim); continue; }
      var col=Y>h*0.18?C.belly:C.base;
      for(var j=0;j<P.length;j++){ var q=P[j], d=Math.sqrt(Math.pow(X-q[0]+q[2]*0.22,2)+Math.pow(Y-q[1]+q[2]*0.28,2)); if(d<q[2]*0.68&&Y<h*0.25) col=d<q[2]*0.35&&j>=P.length-4?C.hi:C.top; }
      for(j=0;j<P.length-1;j++){ var q2=P[j], dd=Math.sqrt(Math.pow(X-q2[0],2)+Math.pow(Y-q2[1],2)); if(Math.abs(dd-q2[2])<0.55&&Y<q2[1]-q2[2]*0.35&&inU(X,Y-1.2,0)>=0) col=C.seam; }
      p.put(x0,y0,col); }
    var put=function(X,Y,col){ p.put(Math.round(c+X),Math.round(c+Y),col); };
    if(sz<2){ var f=sz?0.9:1, q3=r*f; [-0.3,0.26].forEach(function(ex){ put(ex*q3,0.12*q3,C.I); put(ex*q3,0.12*q3+1,C.I); put(ex*q3-1,0.12*q3-0.5,C.w); });
      for(i=0;i<3;i++){ put(-0.46*q3+i*1,-0.1*q3+i*0.4,C.I); put(0.42*q3-i*1,-0.1*q3+i*0.4,C.I); } put(-0.12*q3,0.45*q3,C.I); put(0,0.4*q3,C.I); put(0.12*q3,0.45*q3,C.I); put(-0.5*q3,0.32*q3,C.pk); put(0.46*q3,0.32*q3,C.pk); }
    else { put(-0.3*r,0.05*r,C.I); put(-0.1*r,0.12*r,C.I); put(0.3*r,0.05*r,C.I); put(0.1*r,0.12*r,C.I); }
    var spr=inkRock(p,this.ink);
    if(sz===0){ var bolt=new Pix(5,7); [[3,0],[2,1],[1,2],[2,2],[3,2],[2,3],[1,4],[0,5],[1,5]].forEach(function(q4){ bolt.put(q4[0],q4[1],C.y); }); var bc=ink(bolt.canvas(),'#8a6010'), x1=spr.frames[0].getContext('2d'); x1.drawImage(bc,Math.round(spr.size/2-2),Math.round(spr.size/2+0.55*r)); }
    return spr; },
  ship:function(x,y,t,blink){ if(blink) return; x=Math.round(x); y=Math.round(y);
    if(!shipBare){ for(var i=0;i<5;i++){ lx.globalAlpha=0.9-i*0.15; R('#ff8a3d',x-8-i*2,y+3+(i%2)+Math.round(Math.sin(t*9+i)),1,1); } lx.globalAlpha=1; }
    spr('dragon',DRAGON,DRAGON_PAL,x-6,y-6,this.ink); },   // placed where the HD dragon is
  ufo:function(ux,uy,big,hurt){ var m=big?BAT:BAT_S, flap=Math.floor(clock*6)%2, pal=hurt?{w:'#ffffff',p:'#ffffff'}:{k:'#1e1636',m:flap?'#7a68b8':'#5a4a96',e:'#ff4a4a',p:'#ff9ad0',w:'#ffffff'};   // v1.27: the night bat «б1», red eyes
    spr('bat'+big+hurt+flap,hurt?whiteMap(m):m,pal,ux-(big?7:5),uy-(big?3:2),this.ink); },
  pick:function(x,y,type){   // v1.27, the coin «Б»: a milled rim (light and dark pixels round it), a lit top left, the sign dark with a light edge, a glint, a twinkle
    var c=mapCanvas('coin2',['..ymymymy..','.mYYYYYYYm.','yYZZZYYYYYy','mYZYYYYYYYm','yYZYYYYYYYy','mYYYYYYYYYm','yYYYYYYYYYy','mYYYYYYYYDm','yYYYYYYYDDy','.mYYYYYDDm.','..ymymymy..'],{y:'#c07808',m:'#ffe27a',Y:'#ffd24a',Z:'#fff6c8',D:'#e0a020'});
    var k='coin2|'+this.ink, sx=Math.round(x), sy=Math.round(y), t=clock, i; if(!mapCache[k]) mapCache[k]=ink(c,this.ink); lx.drawImage(mapCache[k],sx-6,sy-6);
    var gp=Math.floor(((t*0.6)%1.6)*18)-3; if(gp>=0&&gp<=22){ lx.globalAlpha=0.5; for(i=1;i<10;i++){ var gx=gp-i; if(gx>=1&&gx<=9) R('#fffbe0',sx-5+gx,sy-5+i,1,1); } lx.globalAlpha=1; }
    blit(ICON[type],['#fff2b0'],sx-2,sy-2); blit(ICON[type],['#140400'],sx-3,sy-3);   // the sign over the glint, darker
    if(Math.sin(t*5)>0.3){ R('#ffffff',sx+4,sy-6,1,3); R('#ffffff',sx+3,sy-5,3,1); } },
  bullet:function(x,y){ x=Math.round(x); y=Math.round(y); var fl=Math.floor(clock*20+x)%2;   // v1.27, «Б»: a tongue of flame — red edge, orange, a yellow and white-hot head, a flickering tail
    lx.globalAlpha=0.45; R('#e04a10',x-6,y+(fl?-1:0),2,1); R('#ff8a18',x-7,y+(fl?0:1),1,1); lx.globalAlpha=1;
    shot([[x-3,y-1,4,1,'#c8300a'],[x-4,y,6,1,'#e04a10'],[x-3,y+1,4,1,'#c8300a'],[x-1,y-1,2,1,'#ff8a18'],[x-1,y+1,2,1,'#ff8a18'],[x-2,y,2,1,'#ffb030'],[x,y,1,1,'#ffe070'],[x+1,y,1,1,'#ffffff']],this.ink); },
  ebullet:function(x,y){ x=Math.round(x); y=Math.round(y); var f=Math.floor(clock*8)%2;   // v1.27, «Б»: dark magic — a purple orb with a red core, smoke curling behind
    lx.globalAlpha=0.45; R('#a040c0',x+2,y+(f?-1:1),1,1); R('#7a2a98',x+3,y+(f?1:-1),1,1); lx.globalAlpha=1;
    shot([[x-1,y-1,3,3,'#6a0a68']],this.ink); R('#ff4a6a',x,y,1,1); R('#ffb0e8',x-1,y-1,1,1); },   // 5 across with its outline, as HD
  shieldRing:function(x,y,t){ var cx=Math.round(x)+4, cy=Math.round(y), p=Math.sin(t*6)>0, i, n=64, C=['#d84a98','#d8a000','#10b080','#2a6ad0','#8048d0'];   // v1.27: the bubble — a rainbow rim turning and pulsing (two pixels thick at its beat), a shine, stars
    for(i=0;i<n;i++){ var a=i/n*6.2832, col=C[Math.floor(((a+t*0.8)/6.2832*5)%5+5)%5]; R(col,Math.round(cx+Math.cos(a)*12),Math.round(cy+Math.sin(a)*9.5),1,1); if(p) R(col,Math.round(cx+Math.cos(a)*11),Math.round(cy+Math.sin(a)*8.5),1,1); }
    for(i=0;i<6;i++){ var b=Math.PI*1.12+i*0.06; R('#ffffff',Math.round(cx+Math.cos(b)*10),Math.round(cy+Math.sin(b)*7.5),1,1); }
    for(i=0;i<6;i++){ var s2=i/6*6.2832+t*1.5; if(Math.sin(t*8+i*2)>0.2){ var sx=Math.round(cx+Math.cos(s2)*12), sy=Math.round(cy+Math.sin(s2)*9.5); R('#ffffff',sx-1,sy,3,1); R('#ffffff',sx,sy-1,1,3); } } },
  bursts:function(){ return spKinds({rock:['#c8c3ff','#8a80d0','#5e52a8','#2e2470'],ufo:['#ffffff','#b8a8e8','#5a4a8a','#2a1e50'],ship:['#c8ffe0','#5cd498','#2c9e64','#136640'],pick:['#fffbe0','#ffe066','#ffc233','#c8840c']}); },
  pxParts:function(){ fzPxParts(); },
  shield:function(){ return '#6a4aa8'; }, mini:function(){ return ['#136640','#2c9e64']; } };

/* v0.73 (the maintainer): the sea and sweets skins are gone — «не интересно»; next: vector 80s, neon, notebook, maybe Game Boy */

/* v0.71 (the maintainer: the getting-ready screens and all the others in the skin's style): every screen but the flight draws the chosen
   skin's sky under a dark veil — the texts, the buttons and the pictures stay readable on it — and the skin's accent colour takes the
   place of the game's teal on the buttons, rings, links and highlights. The games' screen keeps the game's own colours */
SKINS.fairy.ui={veil:0.5,band:'#ffd23f',btn:'#e0a020',btnHi:'#ffd23f'};
function uiColours(themed){ var u=themed&&SK&&SK.ui; P.band=u?u.band:P.band0; P.btn=u?u.btn:P.ship[1]; P.btnHi=u?u.btnHi:P.ship[2]; }
/* v0.87: the getting ready and the instructions on a plain dark ground, for every game and skin (the maintainer: «для всех игр сделать в
   этих экранах нейтральный тёмный фон, а сами игры показываются на нарисованных смартфонах») */
var PREP_BG='flat', PREP_SCR={lang:1,sound:1,phone:1,mic:1,probe:1,away:1,wave:1,lost:1,nomic:1};
function prepGround(){ if(PREP_BG==='off'||!PREP_SCR[scr]||(scr==='wave'&&caught&&scrT-caughtT>=CAUGHT_SHOW)) return false;
  lx.fillStyle='#15141c'; lx.fillRect(0,0,LW,LH);
  if(PREP_BG==='vig'){ var g=lx.createRadialGradient(LW/2,LH*0.45,LH*0.1,LW/2,LH*0.5,LW*0.62); g.addColorStop(0,'#24222e'); g.addColorStop(1,'#0e0d13'); lx.fillStyle=g; lx.fillRect(0,0,LW,LH); }
  return true; }
function sky(dt,s){ if(prepGround()) return; if(!SK) return spaceSky(dt,s); SK.sky(dt,s); if(SK.ui){ lx.globalAlpha=SK.ui.veil; R(P.bg,0,0,LW,LH); lx.globalAlpha=1; } }
var skinId=(function(){ var s=null; try{ s=localStorage.getItem('sonaroids_skin'); }catch(e){} return SKIN_IDS.indexOf(s)>=0?s:'space'; })(), SK=SKINS[skinId]||SKINS.space;
function setSkin(id){ if(!SKINS[id]&&!(typeof HDSK!=='undefined'&&HDSK[id])) return; skinId=id; SK=obsWrap(skinView(id)); try{ localStorage.setItem('sonaroids_skin',id); }catch(e){} }
/* v0.72: the pictures a skin is drawn with — its HD ones when HD is chosen and it has them (they share the pixel skin's menu colours) */
function skinView(id){ if(typeof hdWanted==='function'&&hdWanted(id)){ var h=HDSK[id]; if(!h.ui&&SKINS[id]&&SKINS[id].ui) h.ui=SKINS[id].ui; return h; } return SKINS[id]||SKINS.space; }

/* ── the demo flight behind the menus and in the games' cards: a few rocks drifting left, the ship bobbing and firing, now and then
   a saucer — drawn with any skin, on the screen or into an off-screen canvas ── */
var demo=null, demoSpr={};
function demoMake(){ var R2=srand(5), d={rocks:[],shots:[],ufo:{x:LW*0.8,y:LH*0.35},t:0};
  for(var i=0;i<7;i++) d.rocks.push({x:LW*(0.3+R2()*0.8),y:LH*(0.12+R2()*0.76),sz:i%3===0?0:i%3===1?1:2,v:10+R2()*14,id:i});
  return d; }
function demoRock(sk,sz,id){ var k=sk.id+(sk.hd?'hd'+hs:'')+':'+sz+':'+id+':'+K; if(!demoSpr[k]) demoSpr[k]=makeSkinRock(sk,sz,Core.R_SIZE[sz],id*13+sz); return demoSpr[k]; }
function drawDemo(sk,dt,shipX,st,shipY,skyS,shipK){ var d;                   // v0.77: shipK — the ship a little larger (the drawn phone's screen)                            // v0.76: st — a demo of its own (the drawn phone's screen), shipY — the ship's height, skyS — the sky's speed
  if(st){ if(!st.d||st.d.LW!==LW){ st.d=demoMake(); st.d.LW=LW; } d=st.d; } else { if(!demo||demo.LW!==LW){ demo=demoMake(); demo.LW=LW; } d=demo; } d.t+=dt;
  sk.sky(dt,skyS===undefined?0.5:skyS);
  d.rocks.forEach(function(r){ r.x-=r.v*K*dt; if(r.x<-20){ r.x=LW+20; r.y=LH*(0.12+Math.random()*0.76); }
    var sp=demoRock(sk,r.sz,r.id); if(sk.drawRock){ sp.rot=(sp.rot+(sp.vr||0)*dt+16)%16; sk.drawRock(sp,r.x,r.y); return; }
    var fr=sp.frames[Math.floor((d.t*2+r.id)%16)]; lx.drawImage(fr,Math.round(r.x-sp.size/2+(sp.ox||0)),Math.round(r.y-sp.size/2+(sp.oy||0))); });
  if(!d.path) d.path=pathMake(); if(!d.fly) d.fly={};   // v1.40: a palm's path and the ship's flight (tilt, roll, trails), each skin its own
  var sy=Math.round(shipY!==undefined?shipY:LH*(0.5+0.3*pathStep(d.path,dt))), sx=Math.round(shipX===undefined?fx(Core.SHIP_X):shipX);
  if(Math.floor(d.t*6)!==Math.floor((d.t-dt)*6)) d.shots.push({x:sx+8+8*(shipK||1),y:sy});
  d.shots=d.shots.filter(function(b){ b.x+=190*K*dt; return b.x<LW+10; }); d.shots.forEach(function(b){ sk.bullet(b.x,b.y); });
  var u=d.ufo; u.x-=6*K*dt; if(u.x<-30) u.x=LW+60; sk.ufo(Math.round(u.x),Math.round(u.y+Math.sin(d.t*1.7)*6),true,false);
  var fs=d.fly[sk.id+(sk.hd?'h':'')]||(d.fly[sk.id+(sk.hd?'h':'')]=flyNew()); flyDemo(sk,fs,sx,sy,d.t,dt,shipK); }
/* a demo frame of skin sk into an off-screen canvas at the screen's size (for the games' cards and the games' screen background) */
var demoC=null;
function demoInto(sk,dt){ if(!demoC||demoC.width!==LW||demoC.height!==LH){ demoC=document.createElement('canvas'); demoC.width=LW; demoC.height=LH; }
  var keep=lx; lx=demoC.getContext('2d'); lx.imageSmoothingEnabled=false; noLight=true; try{ drawDemo(sk,dt); } finally { lx=keep; noLight=false; } return demoC; }
/* v0.71: for the readability audit (tests/skin_audit.js): the skin's sky sheet and each of its pictures drawn alone, as pixels */
function skinProbe(id){ var sk=SKINS[id], out={}, keep=lx, oldSK=SK;
  function grab(w,h,fn){ var c=document.createElement('canvas'); c.width=w; c.height=h; lx=c.getContext('2d'); lx.imageSmoothingEnabled=false; noLight=true;
    try{ fn(); } finally { lx=keep; noLight=false; } return Array.from(lx.canvas===c?[]:c.getContext('2d').getImageData(0,0,w,h).data); }
  var sh=(id==='space'||!sk.paint)?null:skySheet(sk);
  if(sh){ out.bg=Array.from(sh.c.getContext('2d').getImageData(0,0,sh.c.width,sh.c.height).data); out.bgW=sh.c.width; out.bgH=sh.c.height; }
  else { out.bg=grab(LW,LH,function(){ sk.sky(0,0); }); out.bgW=LW; out.bgH=LH; }   // v0.81: the skin's own sky (sky() follows the chosen graphics — with HD by default it drew onto the HD canvas, and space was audited on nothing)   // v0.76: a skin's own sky (not the chosen one's)
  out.motes=sk.motes||P.stars;
  out.rocks=[0,1,2].map(function(sz){ var r=makeSkinRock(sk,sz,Core.R_SIZE[sz],sz*17+3), c=r.frames[0], d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; return {w:c.width,h:c.height,d:Array.from(d)}; });
  function obj(w,h,fn){ return {w:w,h:h,d:grab(w,h,fn)}; }
  out.ship=obj(40,24,function(){ sk.ship(20,12,0.3,false); });
  out.ufo=obj(30,16,function(){ sk.ufo(15,8,true,false); });
  out.ufoS=obj(24,14,function(){ sk.ufo(12,7,false,false); });
  out.pick=obj(20,20,function(){ sk.pick(10,10,'shield'); });
  out.bullet=obj(12,6,function(){ sk.bullet(6,3); });
  out.ebullet=obj(8,8,function(){ sk.ebullet(4,4); });
  out.bursts=sk.bursts(); out.shield=sk.shield();
  return out; }
