/* ── SKINS (v0.70, the maintainer's sketches of 28 Sep): the same game, other pictures. A skin draws the sky, the rocks, the ship, the saucer,
   the power-ups, the shots and says the colours of the bursts; the game's logic, sizes and hit circles stay the same. The menus, the texts
   and the getting-ready screens keep the game's own colours (P). 'space' is the game as it was. Chosen on the game's menu, kept in
   'sonaroids_skin'. ── */
var SKIN_IDS=['space','fairy','sea','sweet'];
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
  sky:function(dt,s){ sky(dt,s); },
  rock:function(r){ return makeRock(r); },
  ship:function(x,y,t,blink){ drawShip(x,y,t,blink); },
  ufo:function(ux,uy,big,hurt){ blit(big?UFO_BIG:UFO_SMALL,hurt?[P.text,P.text,P.text,P.text]:P.ufo,ux-(big?9:6),uy-(big?4:2));
    if(Math.floor(clock*6)%2){ R(P.ufo[3],ux-(big?5:3),uy+1,1,1); R(P.ufo[3],ux+(big?4:2),uy+1,1,1); } light(ux,uy,(big?22:16)*K,hex(P.ufo[2]).join(','),0.35); },
  pick:function(x,y,type){ R(P.pick,x-5,y-5,11,11); R(P.bg,x-4,y-4,9,9); blit(ICON[type],[P.pick],x-3,y-3); light(x,y,14*K,P.glowP,0.35); },
  bullet:function(x,y){ R(P.bullet,x-2,y,4,1); light(x,y,6*K,P.glowB,0.45); },
  ebullet:function(x,y){ R(P.ebullet,x-1,y-1,2,2); light(x,y,7*K,hex(P.ebullet).join(','),0.5); },
  bursts:function(){ return {rock:P.rock.slice(2).concat([P.flame[1]]),ufo:P.ufo,ship:P.ship.concat(P.flame),pick:[P.pick,P.text]}; },
  shield:function(){ return P.pick; }, mini:function(){ return [P.ship[1],P.ship[2]]; } };

/* ═══ fairy — a little dragon over a fairy-tale land by day; grumpy storm clouds, a bat for the saucer, fireballs, gold coins ═══ */
var DRAGON=['...........h.h....','..www.....gGgGg...','.wWWWw...gGGGGGg..','.wWWWWw.gGGGekGGg.','..wWWWWwgGGGGGGGGy','...wwWWgGGGGGGggg.',
  'g...wwgGGGLLLg....','Gg..gGGGGLLLLg....','.GggGGGGLLLLg.....','..GGGGGGGLLg......','....gGg.gGg.......','....gg...gg.......'];
var DRAGON_PAL={g:'#1f8a5a',G:'#3fc486',L:'#fff1a6',w:'#c86fb6',W:'#ff9ed8',e:'#ffffff',k:'#1a1a2a',h:'#ffd23f',y:'#ff8a5a'};
var BAT=['k................k','kk.....k..k.....kk','kmk....kkkk....kmk','kmmkk.kkkkkk.kkmmk','kmmmmkkekkekkmmmmk','.kmm.kkkkkkkk.mmk.','..k...kkkkkk...k..','.......k..k.......'];
var BAT_S=['k..........k','kk..k..k..kk','kmkkkkkkkkmk','kmmkekkekmmk','.km.kkkk.mk.','....k..k....'];
SKINS.fairy={id:'fairy', glow:false, motes:['#ffffff','#fff6b0','#ffd6ec'], moteDiv:1400, moteH:0.8,
  paint:function(p,w,h){ vgradPix(p,['#6ec3ff','#8fd3ff','#b6e3ff','#d9eeff','#ffe3f1']);
    var R2=srand(4), cl=cH('#d2ecff');
    for(var i=0;i<9;i++){ var cx=R2()*w, cy=h*(0.08+R2()*0.55), s=0.8+R2()*0.7;
      [[-14,3,7],[-5,-2,10],[7,0,9],[16,4,6]].forEach(function(b){ for(var d=-w;d<=w;d+=w) p.disc(cx+d+b[0]*s,cy+b[1]*s,b[2]*s,cl); }); }
    var hl=cH('#c7b5f0'), hl2=cH('#bca8ea'), c1=cH('#b3a0e6'), c2=cH('#9f8ad8'), roof=cH('#f5a8d4'), gr=cH('#9fe0a0'), grl=cH('#c8f5b8');
    for(var x=0;x<w;x++){ var y1=Math.round(hill(x,w,h-20,7,1)); for(var y=y1;y<h;y++) p.put(x,y,(x+y)%17?hl:hl2); }
    [w*0.3,w*0.8].forEach(function(cx){ cx=Math.round(cx); var base=Math.round(hill(cx,w,h-20,7,1))+2;             // two castles far away
      p.rect(cx-14,base-14,36,18,c1); for(var i=0;i<36;i+=4) p.rect(cx-14+i,base-16,2,2,c1); p.rect(cx+1,base-8,6,12,c2);
      [[-18,7,26],[-3,8,34],[16,7,24]].forEach(function(t){ p.rect(cx+t[0],base-t[2],t[1],t[2]+4,c1); p.poly([[cx+t[0]-1,base-t[2]],[cx+t[0]+t[1]/2,base-t[2]-11],[cx+t[0]+t[1]+1,base-t[2]]],roof); }); });
    for(x=0;x<w;x++){ var y2=Math.round(hill(x,w,h-9,4,2.5)); for(y=y2;y<h;y++) p.put(x,y,y>y2+1?gr:grl); } },
  sky:function(dt,s){ skinSky(this,dt,s); },
  rock:function(r,sz,seed){ var ramp=cHS(['#3f3670','#5f5596','#8279b8','#a9a2d6','#d0cbef']), n=Math.ceil(r*2.6)+4, p=new Pix(n,n), c=n/2;
    var B=[[-0.55,0.15,0.55],[0,-0.2,0.7],[0.5,0.1,0.55],[0.1,0.35,0.5],[-0.3,0.4,0.4]];
    B.forEach(function(b){ p.ball(c+b[0]*r,c+b[1]*r,b[2]*r+1,ramp,true); }); B.forEach(function(b){ p.ball(c+b[0]*r,c+b[1]*r,b[2]*r,ramp,false); });
    if(r>=12){ var d=cH('#3d3a66'), wh=[255,255,255];                                                 // a grumpy face and a tiny lightning on the big ones
      [-4,3].forEach(function(ex){ p.rect(c+ex,c+1,2,3,d); p.put(c+ex,c+1,wh); }); p.rect(c-6,c-2,3,1,d); p.put(c-4,c-1,d); p.rect(c+4,c-2,3,1,d); p.put(c+4,c-1,d); p.rect(c-1,c+6,3,1,d);
      [[2,0],[1,1],[0,2],[1,2],[2,2],[1,3],[0,4]].forEach(function(q){ p.put(c+q[0]-1,c+r*0.8+q[1],cH('#ffe066')); }); }
    var cv=p.canvas(), fr=[]; for(var i=0;i<16;i++) fr.push(cv); return {frames:fr,size:n,rot:0,vr:0}; },
  ship:function(x,y,t,blink){ if(blink) return; x=Math.round(x); y=Math.round(y);
    for(var i=0;i<5;i++){ lx.globalAlpha=0.9-i*0.15; R('#fff3a6',x-3-i*2,y+3+(i%2)+Math.round(Math.sin(t*9+i)),1,1); } lx.globalAlpha=1;
    lx.drawImage(mapCanvas('dragon',DRAGON,DRAGON_PAL),x-1,y-7); },
  ufo:function(ux,uy,big,hurt){ var m=big?BAT:BAT_S, flap=Math.floor(clock*6)%2, pal=hurt?{w:'#ffffff'}:{k:'#4a2d7a',m:flap?'#8f6ad0':'#6f4aa8',e:'#ffe066'};
    lx.drawImage(mapCanvas('bat'+big+hurt+flap,hurt?whiteMap(m):m,pal),ux-(big?9:6),uy-(big?4:3)); },
  pick:function(x,y,type){ var c=mapCanvas('coin',['..yyyyyyy..','.yYYYYYYYy.','yYYYYYYYYYy','yYYYYYYYYYy','yYYYYYYYYYy','yYYYYYYYYYy','yYYYYYYYYYy','yYYYYYYYYYy','yYYYYYYYYYy','.yYYYYYYYy.','..yyyyyyy..'],{y:'#ffb020',Y:'#fff3c0'});
    lx.drawImage(c,x-5,y-5); blit(ICON[type],['#e0902a'],x-3,y-3); if(Math.floor(clock*4)%2) R('#ffffff',x+6,y-6,1,1); },
  bullet:function(x,y){ R('#ff8a3d',x-3,y-1,5,3); R('#ffd23f',x-2,y,4,1); R('#fff6c8',x+1,y,1,1); },
  ebullet:function(x,y){ R('#ff5ab4',x,y,1,1); R('#ffb3dc',x-1,y,1,1); R('#ffb3dc',x+1,y,1,1); R('#ffb3dc',x,y-1,1,1); R('#ffb3dc',x,y+1,1,1); },
  bursts:function(){ return {rock:['#ffffff','#d0cbef','#a9a2d6','#ffe066'],ufo:['#8f6ad0','#4a2d7a','#ffe066'],ship:['#3fc486','#fff1a6','#ff9ed8'],pick:['#ffd23f','#ffffff']}; },
  shield:function(){ return '#ffd23f'; }, mini:function(){ return ['#1f8a5a','#3fc486']; } };

/* ═══ sea — a yellow submarine in a warm sea; puffer fish, a shark for the saucer, torpedoes, power-ups in bubbles ═══ */
var SUB=['.........pp.......','.........p........','........yyyy......','.....yyyYYYYyy....','...yyYYYYYYYYYYy..','o.yYYwwYYwwYYYYYy.','oyyYYwwYYwwYYYYYYy','o.yYYYYYYYYYYYYYy.','...yydddddddddyy..'];
var SUB_PAL={y:'#d9941e',Y:'#ffd23f',w:'#7fe8ff',p:'#8a9aa8',o:'#8a9aa8',d:'#b87a14'};
var SHARK=['..........k.......','.........kk.......','....kkkkkkkkk....k','..kkmmmmmmmmmkk.kk','.kekmmmmmmmmmmmkkk','kkmmmmmmmmmmmmmkk.','.wwwwwwwwwwmmkk.kk','..wwwwwwww.....k..'];
var SHARK_S=['.......k....','...kkkkkk..k','.kkmmmmmmkkk','kemmmmmmmmk.','.wwwwwwmkk.k','..wwww....k.'];
SKINS.sea={id:'sea', glow:false, motes:['#bff6ff','#e8fdff','#ffffff'], moteDiv:700, moteUp:-3,
  paint:function(p,w,h){ vgradPix(p,['#5fe0e8','#3cc4dc','#27a3cf','#1d86bf','#1a74b0']);
    var ray=cH('#bff6ff'); for(var y=0;y<h;y++) for(var x=0;x<w;x++){ var v=(x+y*0.45)%70; if(v<9&&bay(x,y)<0.5*(1-y/h)){ var c=p.get(x,y); p.put(x,y,mixc(c,ray,0.35)); } }
    var s1=cH('#e8d79a'), s2=cH('#d9c688'), R2=srand(9);
    for(x=0;x<w;x++){ var yy=Math.round(hill(x,w,h-9,3,4)); for(y=yy;y<h;y++) p.put(x,y,(x*3+y)%11?s1:s2); }
    for(var i=0;i<Math.round(w/28);i++){ var wx=Math.round(R2()*w), hg=12+Math.round(R2()*22), c=cH(R2()<0.5?'#2aa876':'#1f8f66');
      for(var j=0;j<hg;j++){ p.put(wx+Math.round(2*Math.sin(j/3)),h-8-j,c); p.put(wx+1+Math.round(2*Math.sin(j/3)),h-8-j,c); } }
    for(i=0;i<Math.round(w/60);i++){ var cx=10+Math.round(R2()*(w-20)), cc=cH(['#ff8fa3','#ffa94d','#c38cff'][i%3]); for(var a=0;a<3;a++) for(var r=0;r<7;r++) p.put(cx+(a-1)*r*0.5,h-8-r,cc); } },
  sky:function(dt,s){ skinSky(this,dt,s); },
  rock:function(r,sz,seed){ var ramps=[['#a8561a','#e08a2c','#ffc24a','#ffe38a','#fff6c8'],['#b0406e','#e86e9c','#ff9ec2','#ffc9dc','#fff0f6'],['#2f6fb0','#4f9ae0','#7fc0ff','#b8dcff','#ecf6ff']];
    var ramp=cHS(sz===0?ramps[0]:ramps[seed%3]), n=Math.ceil(r*3.4)+6, p=new Pix(n,n), c=Math.round(n*0.42), cy=n/2;
    for(var a=0;a<360;a+=(r>6?30:60)){ var an=(a+15)*Math.PI/180; p.put(c+Math.cos(an)*(r+1.2),cy+Math.sin(an)*(r+1.2),ramp[0]); }
    p.poly([[c+r-1,cy],[c+r+r*0.6,cy-r*0.5],[c+r+r*0.6,cy+r*0.5]],ramp[1]);                             // the tail behind, to the right
    p.ball(c,cy,r,ramp,true); var ex=c-r*0.45, ey=cy-r*0.25;                                          // the eye looks left, at the player
    if(r>6){ p.rect(ex-1,ey-1,3,3,[255,255,255]); p.rect(ex-1,ey,2,2,cH('#1a1a2a')); p.rect(c-r*0.85,cy+r*0.2,2,1,ramp[0]); } else p.put(ex,ey,cH('#1a1a2a'));
    var cv=p.canvas(), fr=[]; for(var i=0;i<16;i++) fr.push(cv); return {frames:fr,size:n,rot:0,vr:0,ox:n/2-c}; },
  ship:function(x,y,t,blink){ if(blink) return; x=Math.round(x); y=Math.round(y);
    [[-5,1,1],[-9,-1,1.6],[-14,2,1.2],[-19,0,2]].forEach(function(b,i){ var bx=x+b[0]-((t*20)%3), by=y+b[1]; lx.globalAlpha=0.8-i*0.15;
      for(var a=0;a<8;a++) R('#ffffff',bx+Math.round(Math.cos(a*0.785)*b[2]),by+Math.round(Math.sin(a*0.785)*b[2]),1,1); }); lx.globalAlpha=1;
    lx.drawImage(mapCanvas('sub',SUB,SUB_PAL),x-1,y-5); },
  ufo:function(ux,uy,big,hurt){ var m=big?SHARK:SHARK_S, pal=hurt?{w:'#ffffff'}:{k:'#3d5a80',m:'#6f8fb8',w:'#e8f1ff',e:'#ffffff'};
    lx.drawImage(mapCanvas('shark'+big+hurt,hurt?whiteMap(m):m,pal),ux-(big?9:6),uy-(big?4:3)); },
  pick:function(x,y,type){ var c=mapCanvas('bubble',['...wwwww...','..w.....w..','.w.h.....w.','w.h.......w','w.........w','w.........w','w.........w','w.........w','.w.......w.','..w.....w..','...wwwww...'],{w:'#e8fdff',h:'#ffffff'});
    lx.drawImage(c,x-5,y-5); blit(ICON[type],['#ffe066'],x-3,y-3); },
  bullet:function(x,y){ R('#e8f1ff',x-3,y,5,2); R('#ff7a3d',x+2,y,1,2); R('#8a9aa8',x-4,y,1,1); },
  ebullet:function(x,y){ R('#ff7a9a',x-1,y,1,1); R('#ff7a9a',x+1,y,1,1); R('#ff7a9a',x,y-1,1,1); R('#ff7a9a',x,y+1,1,1); },
  bursts:function(){ return {rock:['#ffffff','#e8fdff','#ffe38a','#ffc24a'],ufo:['#6f8fb8','#e8f1ff','#ffffff'],ship:['#ffd23f','#d9941e','#ffffff'],pick:['#ffe066','#ffffff']}; },
  shield:function(){ return '#e8fdff'; }, mini:function(){ return ['#d9941e','#ffd23f']; } };

/* ═══ sweet — a candy rocket in a pink sky with sprinkles; doughnut → cookie → sweets, a macaron saucer, sprinkles for shots ═══ */
var SPR=['#ff5a8a','#ffd23f','#5ac8ff','#7ee07e','#b58cff','#ffffff'];
var MACARON=['....pppppppppp....','..ppPPPPPPPPPPpp..','.pPPPPPPPPPPPPPPp.','rrrrrrrrrrrrrrrrrr','cccccccccccccccccc','rrrrrrrrrrrrrrrrrr','.pPPPPPPPPPPPPPPp.','..pppppppppppppp..'];
var MACARON_S=['..pppppppp..','.pPPPPPPPPp.','rrrrrrrrrrrr','cccccccccccc','rrrrrrrrrrrr','.pPPPPPPPPp.'];
SKINS.sweet={id:'sweet', glow:false, motes:['#ffffff','#fff7fb','#ffd23f'], moteDiv:1600,
  paint:function(p,w,h){ vgradPix(p,['#ffc9e3','#ffd6e8','#ffe2ea','#ffead9','#fff0cf']);
    var R2=srand(11), cr=cH('#fff7fb');
    for(var i=0;i<8;i++){ var cx=R2()*w, cy=h*(0.1+R2()*0.8), s=0.9+R2()*0.6;
      [[-12,3,7],[-4,-2,9],[6,0,8],[14,4,5]].forEach(function(b){ for(var d=-w;d<=w;d+=w) p.disc(cx+d+b[0]*s,cy+b[1]*s,b[2]*s,cr); }); }
    // sprinkles: sparse and pale, so the shots (bright sprinkles) stand out against them
    for(i=0;i<Math.round(w*h/1400);i++){ var x=Math.floor(R2()*w), y=Math.floor(R2()*h), c=mixc(cH(SPR[i%5]),p.get(x,y),0.55); p.put(x,y,c); if(R2()<0.5) p.put(x+1,y,c); else p.put(x,y+1,c); } },
  sky:function(dt,s){ skinSky(this,dt,s); },
  rock:function(r,sz,seed){ var n=Math.ceil(r*2)+(sz===2?12:4), p=new Pix(n,n), c=n/2, R2=srand(seed*31+7);
    if(sz===0){ p.ball(c,c,r,cHS(['#8a4a1c','#c47a3a','#e0a060','#f0c088','#ffe0b8']),true);                 // a doughnut with icing and sprinkles
      var ic=cHS(seed%2?['#b0306a','#e0508c','#ff7fb4','#ffb3d4','#ffe0ee']:['#5a2f1c','#7a4028','#9a5a38','#c07a50','#e0a07a']);
      for(var y=0;y<n;y++) for(var x=0;x<n;x++){ var dx=x+0.5-c, dy=y+0.5-c, d=Math.sqrt(dx*dx+dy*dy), an=Math.atan2(dy,dx);
        if(d<r*(0.78+0.08*Math.sin(an*7))){ var lum=0.6+(-dx*0.62-dy*0.78)/r*0.45; p.put(x,y,ic[Math.max(1,Math.min(4,Math.floor(lum*4+bay(x,y)-0.5)))]); } }
      for(var i=0;i<14;i++){ var a=R2()*6.28, dd=(0.42+R2()*0.3)*r, cc=cH(SPR[i%6]), px=c+Math.cos(a)*dd, py=c+Math.sin(a)*dd; p.put(px,py,cc); p.put(px+(i%2),py+1-(i%2),cc); }
      var hr=r*0.3; for(y=0;y<n;y++) for(x=0;x<n;x++){ var q=Math.sqrt((x+0.5-c)*(x+0.5-c)+(y+0.5-c)*(y+0.5-c)); if(q<hr-1.2) p.clear(x,y); else if(q<hr) p.put(x,y,cH('#8a4a1c')); } }
    else if(sz===1){ p.ball(c,c,r,cHS(['#8a5220','#c07a3a','#dea060','#f0c080','#ffe2b0']),true);          // a cookie with chocolate chips
      for(i=0;i<6;i++){ var a2=R2()*6.28, d2=R2()*0.7*r; p.rect(c+Math.cos(a2)*d2,c+Math.sin(a2)*d2,2,2,cH('#5a2f14')); } }
    else { var cc2=cH(['#ff5a8a','#5ac8ff','#7ee07e'][seed%3]), wr=mixc(cc2,[255,255,255],0.4);                   // a wrapped sweet
      p.poly([[c-r,c],[c-r-4,c-3],[c-r-4,c+3]],wr); p.poly([[c+r,c],[c+r+4,c-3],[c+r+4,c+3]],wr);
      for(y=0;y<n;y++) for(x=0;x<n;x++) if((x+0.5-c)*(x+0.5-c)+(y+0.5-c)*(y+0.5-c)<=r*r) p.put(x,y,Math.floor((x-y)/2)%2?cc2:[255,255,255]); p.put(c-2,c-2,[255,255,255]); }
    var cv=p.canvas(), fr=[]; for(i=0;i<16;i++) fr.push(cv); return {frames:fr,size:n,rot:0,vr:0}; },
  ship:function(x,y,t,blink){ if(blink) return; x=Math.round(x); y=Math.round(y); var fl=Math.floor(t*20)%3;
    R('#ffd23f',x-4-fl,y-1,4+fl,3); R('#ff8a3d',x-3,y,2,1);
    if(!mapCache.rocket){ var rows=SHIP_MAP.map(function(r,j){ return r.split('').map(function(ch,i){ return ch==='.'?'.':ch==='1'?'d':(Math.floor((i+j)/2)%2?'w':'r'); }).join(''); }); mapCanvas('rocket',rows,{d:'#b0104a',w:'#ffffff',r:'#ff3b6b'}); }
    lx.drawImage(mapCache.rocket,x,y-5); R('#7fd8ff',x+9,y-1,2,3); },
  ufo:function(ux,uy,big,hurt){ var m=big?MACARON:MACARON_S, pal=hurt?{w:'#ffffff'}:{p:'#8f5ad0',P:'#b98cff',r:'#a070e0',c:'#fff4e0'};
    lx.drawImage(mapCanvas('mac'+big+hurt,hurt?whiteMap(m):m,pal),ux-(big?9:6),uy-(big?4:3)); },
  pick:function(x,y,type){ R('#ff5a8a',x-5,y-5,11,11); R('#ffffff',x-4,y-4,9,9); blit(ICON[type],['#ff5a8a'],x-3,y-3);
    R('#7ee07e',x-1,y-8,1,3); R('#7ee07e',x+1,y-8,1,3); R('#7ee07e',x-2,y-8,1,1); R('#7ee07e',x+2,y-8,1,1); },
  bullet:function(x,y){ R(SPR[Math.floor(x/10)%5],x-2,y,4,1); },
  ebullet:function(x,y){ R('#6b3a1c',x-1,y-1,3,2); },
  bursts:function(){ return {rock:['#e0a060','#c47a3a','#ff7fb4','#ffd23f','#5ac8ff'],ufo:['#b98cff','#fff4e0','#8f5ad0'],ship:['#ff3b6b','#ffffff','#ffd23f'],pick:['#ff5a8a','#ffffff']}; },
  shield:function(){ return '#ff5a8a'; }, mini:function(){ return ['#b0104a','#ff3b6b']; } };

var skinId=(function(){ var s=null; try{ s=localStorage.getItem('sonaroids_skin'); }catch(e){} return SKIN_IDS.indexOf(s)>=0?s:'space'; })(), SK=SKINS[skinId];
function setSkin(id){ if(!SKINS[id]) return; skinId=id; SK=SKINS[id]; try{ localStorage.setItem('sonaroids_skin',id); }catch(e){} }

/* ── the demo flight behind the menus and in the games' cards: a few rocks drifting left, the ship bobbing and firing, now and then
   a saucer — drawn with any skin, on the screen or into an off-screen canvas ── */
var demo=null, demoSpr={};
function demoMake(){ var R2=srand(5), d={rocks:[],shots:[],ufo:{x:LW*0.8,y:LH*0.35},t:0};
  for(var i=0;i<7;i++) d.rocks.push({x:LW*(0.3+R2()*0.8),y:LH*(0.12+R2()*0.76),sz:i%3===0?0:i%3===1?1:2,v:10+R2()*14,id:i});
  return d; }
function demoRock(sk,sz,id){ var k=sk.id+':'+sz+':'+id+':'+K; if(!demoSpr[k]) demoSpr[k]=sk.rock(Math.max(3,Math.round(Core.R_SIZE[sz]*K)),sz,id*13+sz); return demoSpr[k]; }
function drawDemo(sk,dt,shipX){ if(!demo||demo.LW!==LW){ demo=demoMake(); demo.LW=LW; } var d=demo; d.t+=dt;
  sk.sky(dt,0.5);
  d.rocks.forEach(function(r){ r.x-=r.v*K*dt; if(r.x<-20){ r.x=LW+20; r.y=LH*(0.12+Math.random()*0.76); }
    var sp=demoRock(sk,r.sz,r.id), fr=sp.frames[Math.floor((d.t*2+r.id)%16)]; lx.drawImage(fr,Math.round(r.x-sp.size/2+(sp.ox||0)),Math.round(r.y-sp.size/2)); });
  var sy=Math.round(LH*(0.5+0.18*Math.sin(d.t*0.9))), sx=Math.round(shipX===undefined?fx(Core.SHIP_X):shipX);
  if(Math.floor(d.t*6)!==Math.floor((d.t-dt)*6)) d.shots.push({x:sx+16,y:sy});
  d.shots=d.shots.filter(function(b){ b.x+=190*K*dt; return b.x<LW+10; }); d.shots.forEach(function(b){ sk.bullet(b.x,b.y); });
  var u=d.ufo; u.x-=6*K*dt; if(u.x<-30) u.x=LW+60; sk.ufo(Math.round(u.x),Math.round(u.y+Math.sin(d.t*1.7)*6),true,false);
  sk.ship(sx,sy,d.t,false); }
/* a demo frame of skin sk into an off-screen canvas at the screen's size (for the games' cards and the games' screen background) */
var demoC=null;
function demoInto(sk,dt){ if(!demoC||demoC.width!==LW||demoC.height!==LH){ demoC=document.createElement('canvas'); demoC.width=LW; demoC.height=LH; }
  var keep=lx; lx=demoC.getContext('2d'); lx.imageSmoothingEnabled=false; noLight=true; try{ drawDemo(sk,dt); } finally { lx=keep; noLight=false; } return demoC; }
