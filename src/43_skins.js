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
SKINS.space={id:'space', glow:true,
  sky:function(dt,s){ spaceSky(dt,s); lx.fillStyle='rgba(10,6,26,0.45)'; lx.fillRect(0,0,LW,LH); },   // v0.81: the background dimmed like in HD (the rocks stood out half as much)
  rock:function(r){ return makeRock(r); },
  ship:function(x,y,t,blink){ drawShip(x,y,t,blink); },
  ufo:function(ux,uy,big,hurt){ blit(big?UFO_BIG:UFO_SMALL,hurt?[P.text,P.text,P.text,P.text]:P.ufo,ux-(big?9:6),uy-(big?4:2));
    if(Math.floor(clock*6)%2){ R(P.ufo[3],ux-(big?5:3),uy+1,1,1); R(P.ufo[3],ux+(big?4:2),uy+1,1,1); } light(ux,uy,(big?22:16)*K,hex(P.ufo[2]).join(','),0.35); },
  pick:function(x,y,type){ R(P.pick,x-6,y-6,13,13); R(P.bg,x-4,y-4,9,9); blit(ICON[type],[P.pick],x-3,y-3); light(x,y,14*K,P.glowP,0.4); },   // v0.81: 13 pixels (the core's zone) with a two-pixel frame (was 11 with one)
  bullet:function(x,y){ R(P.bullet,x-3,y,6,1); light(x,y,6*K,P.glowB,0.45); },   // v0.83: 6 long (was 4), like the other skins' shots
  ebullet:function(x,y){ R(P.ebullet,x-1,y-2,2,4); R(P.ebullet,x-2,y-1,4,2);   // v0.83: a 4-pixel round (was 2×2)
    light(x,y,7*K,hex(P.ebullet).join(','),0.5); },
  bursts:function(){ return {rock:P.rock.slice(2).concat([P.flame[1]]),ufo:P.ufo,ship:P.ship.concat(P.flame),pick:[P.pick,P.text]}; },
  shield:function(){ return P.pick; }, mini:function(){ return [P.ship[1],P.ship[2]]; } };

/* ═══ fairy — a little dragon over a fairy-tale land by day; grumpy storm clouds, a bat for the saucer, fireballs, gold coins ═══ */
var DRAGON=['...........h.h....','..www.....gGgGg...','.wWWWw...gGGGGGg..','.wWWWWw.gGGGekGGg.','..wWWWWwgGGGGGGGGy','...wwWWgGGGGGGggg.',
  'g...wwgGGGLLLg....','Gg..gGGGGLLLLg....','.GggGGGGLLLLg.....','..GGGGGGGLLg......','....gGg.gGg.......','....gg...gg.......'];
var DRAGON_PAL={g:'#136640',G:'#2c9e64',L:'#fff1a6',w:'#9a3c8e',W:'#e874bc',e:'#ffffff',k:'#1a1a2a',h:'#f0b820',y:'#e8683a'};
var BAT=['k................k','kk.....k..k.....kk','kmk....kkkk....kmk','kmmkk.kkkkkk.kkmmk','kmmmmkkekkekkmmmmk','.kmm.kkkkkkkk.mmk.','..k...kkkkkk...k..','.......k..k.......'];
var BAT_S=['k..........k','kk..k..k..kk','kmkkkkkkkkmk','kmmkekkekmmk','.km.kkkk.mk.','....k..k....'];
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
  rock:function(r,sz,seed){ var ramp=cHS(['#2e2660','#4a4088','#6e64aa','#9a92cc','#c8c2ec']), n=Math.ceil(r*2.6)+4, p=new Pix(n,n), c=n/2;
    var B=[[-0.55,0.15,0.55],[0,-0.2,0.7],[0.5,0.1,0.55],[0.1,0.35,0.5],[-0.3,0.4,0.4]];
    B.forEach(function(b){ p.ball(c+b[0]*r,c+b[1]*r,b[2]*r+1,ramp,true); }); B.forEach(function(b){ p.ball(c+b[0]*r,c+b[1]*r,b[2]*r,ramp,false); });
    if(r>=12){ var d=cH('#3d3a66'), wh=[255,255,255];                                                 // a grumpy face and a tiny lightning on the big ones
      [-4,3].forEach(function(ex){ p.rect(c+ex,c+1,2,3,d); p.put(c+ex,c+1,wh); }); p.rect(c-6,c-2,3,1,d); p.put(c-4,c-1,d); p.rect(c+4,c-2,3,1,d); p.put(c+4,c-1,d); p.rect(c-1,c+6,3,1,d);
      [[2,0],[1,1],[0,2],[1,2],[2,2],[1,3],[0,4]].forEach(function(q){ p.put(c+q[0]-1,c+r*0.8+q[1],cH('#ffe066')); }); }
    return inkRock(p,this.ink); },
  ship:function(x,y,t,blink){ if(blink) return; x=Math.round(x); y=Math.round(y);
    if(!shipBare){ for(var i=0;i<5;i++){ lx.globalAlpha=0.9-i*0.15; R('#ff8a3d',x-3-i*2,y+3+(i%2)+Math.round(Math.sin(t*9+i)),1,1); } lx.globalAlpha=1; }
    spr('dragon',DRAGON,DRAGON_PAL,x-1,y-7,this.ink); },
  ufo:function(ux,uy,big,hurt){ var m=big?BAT:BAT_S, flap=Math.floor(clock*6)%2, pal=hurt?{w:'#ffffff'}:{k:'#4a2d7a',m:flap?'#8f6ad0':'#6f4aa8',e:'#ffe066'};
    spr('bat'+big+hurt+flap,hurt?whiteMap(m):m,pal,ux-(big?9:6),uy-(big?4:3),this.ink); },
  pick:function(x,y,type){ var c=mapCanvas('coin',['..yyyyyyy..','.yYYYYYYYy.','yYYYYYYYYYy','yYYYYYYYYYy','yYYYYYYYYYy','yYYYYYYYYYy','yYYYYYYYYYy','yYYYYYYYYYy','yYYYYYYYYYy','.yYYYYYYYy.','..yyyyyyy..'],{y:'#c07808',Y:'#ffd24a'});
    var k='coin|'+this.ink; if(!mapCache[k]) mapCache[k]=ink(c,this.ink); lx.drawImage(mapCache[k],x-6,y-6); blit(ICON[type],['#3a1600'],x-3,y-3); },   // v0.81: a darker sign
  bullet:function(x,y){ shot([[x-3,y-1,4,1,'#d8340c'],[x-4,y,6,1,'#f06a14'],[x-3,y+1,4,1,'#d8340c'],[x-1,y,2,1,'#fff0a0']],this.ink); },   // a round-ish fireball, white-hot at the front
  ebullet:function(x,y){ shot([[x-1,y-1,3,3,'#8a0c70']],this.ink); R('#ff9ad8',x,y,1,1); },
  bursts:function(){ return {rock:['#3d3a66','#5f5596','#8279b8','#ffb020'],ufo:['#4a2d7a','#8f6ad0','#e8187a'],ship:['#1f8a5a','#3fc486','#ff5a1f'],pick:['#b05a00','#ffb020']}; },
  shield:function(){ return '#6a4aa8'; }, mini:function(){ return ['#136640','#2c9e64']; } };

/* v0.73 (the maintainer): the sea and sweets skins are gone — «не интересно»; next: vector 80s, neon, notebook, maybe Game Boy */

/* v0.71 (the maintainer: the getting-ready screens and all the others in the skin's style): every screen but the flight draws the chosen
   skin's sky under a dark veil — the texts, the buttons and the pictures stay readable on it — and the skin's accent colour takes the
   place of the game's teal on the buttons, rings, links and highlights. The games' screen keeps the game's own colours */
SKINS.fairy.ui={veil:0.5,band:'#ffd23f',btn:'#e0a020',btnHi:'#ffd23f'};
function uiColours(themed){ var u=themed&&SK&&SK.ui; P.band=u?u.band:P.band0; P.btn=u?u.btn:P.ship[1]; P.btnHi=u?u.btnHi:P.ship[2]; }
function sky(dt,s){ if(!SK) return spaceSky(dt,s); SK.sky(dt,s); if(SK.ui){ lx.globalAlpha=SK.ui.veil; R(P.bg,0,0,LW,LH); lx.globalAlpha=1; } }
var skinId=(function(){ var s=null; try{ s=localStorage.getItem('sonaroids_skin'); }catch(e){} return SKIN_IDS.indexOf(s)>=0?s:'space'; })(), SK=SKINS[skinId]||SKINS.space;
function setSkin(id){ if(!SKINS[id]&&!(typeof HDSK!=='undefined'&&HDSK[id])) return; skinId=id; SK=skinView(id); try{ localStorage.setItem('sonaroids_skin',id); }catch(e){} }
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
  var sy=Math.round(shipY!==undefined?shipY:LH*(0.5+0.18*Math.sin(d.t*0.9))), sx=Math.round(shipX===undefined?fx(Core.SHIP_X):shipX);
  if(Math.floor(d.t*6)!==Math.floor((d.t-dt)*6)) d.shots.push({x:sx+16,y:sy});
  d.shots=d.shots.filter(function(b){ b.x+=190*K*dt; return b.x<LW+10; }); d.shots.forEach(function(b){ sk.bullet(b.x,b.y); });
  var u=d.ufo; u.x-=6*K*dt; if(u.x<-30) u.x=LW+60; sk.ufo(Math.round(u.x),Math.round(u.y+Math.sin(d.t*1.7)*6),true,false);
  if(shipK&&shipK!==1){ var c=sk.hd?hx:lx; c.save(); c.translate(sx+8,sy); c.scale(shipK,shipK); c.translate(-sx-8,-sy); sk.ship(sx,sy,d.t,false); c.restore(); }
  else sk.ship(sx,sy,d.t,false); }
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
