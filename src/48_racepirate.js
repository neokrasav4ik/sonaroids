/* ── SONARACE: THE PIRATE WORLD (v1.06; the maintainer's picks from the sketches, 1 Oct: «пиратский мир, делаем по той же схеме, как
   тетрадку»; the world «лагуна → финская речка → фьорды (викинги) → и обратно», «в лагуне — больше скелетов больших животных и разрушенных
   кораблей; в финской — больше растительности и животных, ещё больше ёлок; во фьордах — скалы»; drawn «более реалистично»; the river's own
   buildings — piers, pilings, buoys, sunken masts, jetties, a bathing platform, nets, a beaver dam, boathouses, a stone quay with a longship,
   boat sheds, a lighthouse, skerries, ice floes, bridges; our boat — the red speedboat «3, но широкий» (a red deck with a white stripe, a
   wooden foredeck with a black skull, gold trim, a jolly roger at the stern); the rivals «катер только у нас» — a raft, a longship, a canoe
   (purple: a yellow one was the coins' colour), a swan pedalo, an inflatable, an emerald galleon; the gifts: a canister with an F, a coin with
   a skull, the red magnet, a lifebuoy, the golden ship's wheel; the hazard — a whirlpool; the effects: a water bubble, foam «whiskers», a
   splash, red waves, the whirl under the boat; «след на воде — от нас большой, от соперников маленький»; pixels in 34 colours).
   Drawn in the sketches' logical pixels — two to a sketch pixel of 48_racehd.js, as the notebook — so the sizes are the candy land's: our
   hull is the cars' 18 units, what is drawn and what the game counts agree (the audit). The river is the road: the channel (full speed),
   its lighter edge (the kerb), the shallows beyond (off the road: slow), then the shore. ── */
var RP={tiles:{},ds:1,T:128}, RP_U=2*SU, RP_KERB=4*RP_U, RP_EDGE=RP_U, RP_SH=12*RP_U;
/* the pixels' colours (the sketch «Б», 34 then; taken again from the game's own HD: seven for each zone's land and water, the boats' and gifts' fifteen) */
var RP_PALH=['f6e2b0','ecd59f','bedcc6','79d0d4','8eb4ac','4aafc4','3b8699','728460','45613c','3d5837','2a5250','30423f','1d4048','173847','d9dee0','727e85','4c525b','2f4555','1c2d3f','122437','0c1c2f',
  'ffffff','f0f4fa','141418','d8302a','e8442a','f0c848','78d040','7b2aa1','aee6ff','f89845','bc793f','8e7443','443429','167060','4a8a3a'];
function rpCl(v,a,b){ return v<a?a:v>b?b:v; }
function rpL3(a,b,t){ return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]; }
function rpMul(c,f){ return [rpCl(c[0]*f,0,255),rpCl(c[1]*f,0,255),rpCl(c[2]*f,0,255)]; }
function rpC(c,a){ return a===undefined?'rgb('+Math.round(c[0])+','+Math.round(c[1])+','+Math.round(c[2])+')':'rgba('+Math.round(c[0])+','+Math.round(c[1])+','+Math.round(c[2])+','+a+')'; }
function rpSeed(n){ var s=((Math.floor(n)%2147483646)+2147483646)%2147483646+1; return function(){ s=(s*16807)%2147483647; return (s-1)/2147483646; }; }
/* periodic value noise over the ground's tile (T logical px): cx, cy cells across it, so it repeats seamlessly */
function rpH(x,y){ var h=(x*374761393+y*668265263)|0; h=Math.imul(h^(h>>>13),1274126177); return ((h^(h>>>16))>>>0)/4294967295; }
function rpN(x,y,p,q){ var xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi, u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf), x0=((xi%p)+p)%p, y0=((yi%q)+q)%q, x1=(x0+1)%p, y1=(y0+1)%q,
  a=rpH(x0,y0), b=rpH(x1,y0), c=rpH(x0,y1), d=rpH(x1,y1); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }
function rpF(x,y,cx,cy,o){ var T=RP.T, s=0, a=0.5, f=1; for(var i=0;i<(o||4);i++){ s+=a*rpN(x*cx*f/T,y*cy*f/T,cx*f,cy*f); f*=2; a*=0.5; } return s; }
function rpShade(x,y,n,amp,o){ var e=0.8, dx=rpF(x+e,y,n,n,o)-rpF(x-e,y,n,n,o), dy=rpF(x,y+e,n,n,o)-rpF(x,y-e,n,n,o); return 1+(-dx-dy)*amp/(n/RP.T*e); }
/* the ground's tiles (the sketches' per-pixel ground, made once per resolution): the land opaque, the water's texture as a see-through layer */
var RP_TILE={
  sand:function(x,y){ var n=rpF(x,y,6,6,4), n2=rpF(x+50,y+30,38,38,2), rip=Math.sin(6.2832*(11*x+6*y)/RP.T+n*9)*0.5+0.5, col=rpMul(rpL3([246,226,174],[226,196,136],n*0.9),rpShade(x,y,4,0.035,4));
    col=rpL3(col,[255,244,214],rip*0.12); if(n2>0.74) col=rpL3(col,[180,150,110],0.4); return col; },
  grass:function(x,y){ var n=rpF(x,y,5,5,4), n2=rpF(x+40,y+20,32,32,2), col=rpMul(rpL3([70,110,48],[44,78,32],n),rpShade(x,y,6,0.03,4));
    col=rpL3(col,[96,132,60],rpCl((n2-0.6)*2,0,0.5)); if(n2<0.22) col=rpL3(col,[120,100,70],0.35); return col; },
  snow:function(x,y){ var n=rpF(x,y,4,4,4), n2=rpF(x+30,y+60,26,26,3), h=rpShade(x,y,4,0.05,4), sn=rpMul(rpL3([236,242,250],[206,218,236],rpCl((n-0.35)*1.6,0,1)),h);
    if(h<0.97) sn=rpL3(sn,[170,190,225],rpCl((0.97-h)*3,0,0.4)); var rock=rpF(x+70,y+90,6,6,4), rk=rpCl((rock-0.56)/0.1,0,1);
    return rk>0?rpL3(sn,rpMul(rpL3([96,100,110],[136,140,150],n2),h*1.05),rk*rk*(3-2*rk)):sn; },
  wlag:function(x,y){ var cau=1-Math.abs(rpF(x+30,y,12,17,3)*2-1), a=rpCl((cau-0.82)*3,0,0.35), sd=rpF(x+7,y+3,4,8,3), b=rpCl((sd-0.55)*2,0,0.3); return a>b*0.6?[235,255,255,a*255]:[150,220,210,b*255]; },
  wfin:function(x,y){ var refl=rpF(x,y+40,8,3,3), a=rpCl((0.55-refl)*1.4,0,0.45), rip=Math.sin(6.2832*5*x/RP.T+rpF(x,y,6,6,3)*8)*0.5+0.5; return a>0.03?[14,40,40,a*255]:[120,160,180,rip*0.08*255]; },
  wfj:function(x,y){ var refl=rpF(x,y+70,6,3,3); return [8,16,26,rpCl((0.6-refl)*1.6,0,0.5)*255]; } };
function rpTile(kind){ var res=1, key=kind, t=RP.tiles[key]; if(t) return t;
  var N=Math.round(RP.T*res), cv=document.createElement('canvas'); cv.width=cv.height=N; var x=cv.getContext('2d'), im=x.createImageData(N,N), D=im.data, fn=RP_TILE[kind];
  for(var j=0;j<N;j++) for(var i=0;i<N;i++){ var col=fn(i/res,j/res), o=(j*N+i)*4; D[o]=col[0]; D[o+1]=col[1]; D[o+2]=col[2]; D[o+3]=col.length>3?col[3]:255; }
  x.putImageData(im,0,0); return RP.tiles[key]={c:cv,res:res}; }
/* the tiles are made one a frame from the first pirate frame on (each a few dozen ms), so a new zone does not stall the race */
var RP_TILES=['sand','wlag','grass','wfin','snow','wfj'];
function rpWarm(){ for(var i=0;i<RP_TILES.length;i++) if(!RP.tiles[RP_TILES[i]]){ rpTile(RP_TILES[i]); return; } }
function rpPat(t,x0L,WL,HL){ var T=RP.T; rx.save(); rx.translate(-(((x0L%T)+T)%T)-T,-T); rx.scale(1/t.res,1/t.res); rx.fillStyle=rx.createPattern(t.c,'repeat'); rx.fillRect(0,0,(WL+3*T)*t.res,(HL+3*T)*t.res); rx.restore(); }
/* soft shadows: the boats' sketches gave blur and offset in logical px, the world's blur at two device px to one (their own canvases) */
function rpBs(b,ox,oy,a){ rx.shadowColor='rgba(0,20,40,'+(a||0.4)+')'; rx.shadowBlur=b*RP.ds; rx.shadowOffsetX=ox*RP.ds; rx.shadowOffsetY=oy*RP.ds; }
function rpSw(b,ox,oy,a){ rx.shadowColor='rgba(0,0,0,'+(a||0.35)+')'; rx.shadowBlur=b*RP.ds/2; rx.shadowOffsetX=ox*RP.ds; rx.shadowOffsetY=oy*RP.ds; }
function rpNos(){ rx.shadowColor='transparent'; rx.shadowBlur=0; rx.shadowOffsetX=0; rx.shadowOffsetY=0; }
function rpRg(x,y,r,c0,c1,dx,dy){ var g=rx.createRadialGradient(x+(dx===undefined?-0.35:dx)*r,y+(dy===undefined?-0.35:dy)*r,r*0.1,x,y,r*1.05); g.addColorStop(0,c0); g.addColorStop(1,c1); return g; }
function rpLg(x0,y0,x1,y1,st){ var g=rx.createLinearGradient(x0,y0,x1,y1); st.forEach(function(s,i){ g.addColorStop(i/(st.length-1),s); }); return g; }
function rpDisc(x,y,r,col){ rx.fillStyle=col; rx.beginPath(); rx.arc(x,y,r,0,6.2832); rx.fill(); }
function rpEll(x,y,a,b,an,col){ rx.fillStyle=col; rx.beginPath(); rx.ellipse(x,y,a,b,an||0,0,6.2832); rx.fill(); }

/* ── the world round the river (logical px, around a point) ── */
function rpPine(x,y,s,snow){ var A=['#4a8a5a','#3e7e50','#357248','#2e6840','#2a5e3a'], B=['#0a2214','#0e2a1a','#123222','#163a28','#1a4230'], k, a;
  rpSw(12,6,7,0.5); rx.save(); rx.translate(x,y);
  for(k=0;k<5;k++){ var rr=s*(1-k*0.18), o=-k*s*0.04; rx.save(); rx.translate(o,o); rx.scale(rr,rr); rx.beginPath(); for(a=0;a<26;a++){ var an=a/26*6.283+x*0.37+k, R=(a%2?0.8:1)*(0.92+0.08*Math.sin(a*2.3+x)); rx.lineTo(Math.cos(an)*R,Math.sin(an)*R); } rx.closePath(); rx.restore();
    rx.fillStyle=rpRg(o,o,rr,A[k],B[k]); rx.fill(); if(k===0) rpNos(); }
  rx.strokeStyle='rgba(150,200,150,0.25)'; rx.lineWidth=0.6; rx.beginPath(); for(a=0;a<12;a++){ var an2=a/12*6.283+x; rx.moveTo(Math.cos(an2)*s*0.15,Math.sin(an2)*s*0.15); rx.lineTo(Math.cos(an2)*s*0.85,Math.sin(an2)*s*0.85); } rx.stroke();
  if(snow){ rx.fillStyle='rgba(250,252,255,0.92)'; for(k=0;k<5;k++){ var an3=k*1.3+x, R3=s*0.55; rx.beginPath(); rx.ellipse(Math.cos(an3)*R3*0.7-s*0.15,Math.sin(an3)*R3*0.7-s*0.15,s*0.22,s*0.12,an3,0,6.2832); rx.fill(); } }
  rpDisc(0,0,s*0.12,'#5a3a1a'); rx.restore(); }
function rpBlobs(x,y,s,n,c0,c1,k0,k1,sd){ var r=rpSeed(sd), i; for(i=0;i<n;i++){ var a=r()*6.283, d=r()*s*k0, rr=s*(k1+r()*0.2); rx.fillStyle=rpRg(x+Math.cos(a)*d,y+Math.sin(a)*d,rr,c0,c1); rx.beginPath(); rx.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,rr,0,6.2832); rx.fill(); if(i===0) rpNos(); } rpNos(); return r; }
function rpBirch(x,y,s){ rpSw(9,4,5,0.38); rpBlobs(x,y,s,14,'#b8e08a','#4a7a2e',0.75,0.32,x*13+y); }
function rpBush(x,y,s,berry){ rpSw(6,3,3,0.35); var r=rpBlobs(x,y,s,8,'#6aa04a','#24481e',0.6,0.4,x*7+y*3); if(berry) for(var i=0;i<7;i++) rpDisc(x+(r()-0.5)*s*1.4,y+(r()-0.5)*s*1.4,1.3,berry); }
function rpPalm(x,y,s){ var r=rpSeed(x*5+y), k, j; rpSw(12,7,8,0.4);
  for(k=0;k<8;k++){ var a=k*0.785+r()*0.3; rx.save(); rx.translate(x,y); rx.rotate(a); rx.fillStyle=rpLg(0,0,s*1.1,0,['#2a6a2a','#4aa040','#8ad070']);
    rx.beginPath(); rx.moveTo(0,0); rx.quadraticCurveTo(s*0.5,-s*0.26,s*1.1,0); rx.quadraticCurveTo(s*0.5,s*0.26,0,0); rx.fill(); if(k===0) rpNos();
    rx.strokeStyle='rgba(20,60,20,0.6)'; rx.lineWidth=0.8; rx.beginPath(); rx.moveTo(0,0); rx.lineTo(s*1.05,0); rx.stroke(); rx.strokeStyle='rgba(20,60,20,0.35)'; rx.beginPath();
    for(j=1;j<7;j++){ var t=j/7*s; rx.moveTo(t,0); rx.lineTo(t+s*0.08,-s*0.2*(1-j/8)); rx.moveTo(t,0); rx.lineTo(t+s*0.08,s*0.2*(1-j/8)); } rx.stroke(); rx.restore(); }
  rpNos(); rpDisc(x,y,s*0.14,'#7a5028'); [[1,1],[-1,1.5],[1.5,-0.5]].forEach(function(q){ rpDisc(x+q[0]*2.4,y+q[1]*2,2.2,'#5a3a18'); }); }
function rpFern(x,y,s){ rx.strokeStyle='#4a8a34'; rx.lineWidth=1; for(var k=0;k<7;k++){ rx.save(); rx.translate(x,y); rx.rotate(k*0.9); rx.beginPath(); rx.moveTo(0,0); rx.lineTo(s,0); for(var j=1;j<6;j++){ rx.moveTo(j*s/6,0); rx.lineTo(j*s/6+2,-2.4); rx.moveTo(j*s/6,0); rx.lineTo(j*s/6+2,2.4); } rx.stroke(); rx.restore(); } }
function rpRock(x,y,s,snow){ var r=rpSeed(x*9+y*5), n=7, P=[], i; for(i=0;i<n;i++){ var a=i/n*6.283+r()*0.4; P.push([x+Math.cos(a)*s*(0.7+r()*0.4),y+Math.sin(a)*s*(0.55+r()*0.35)]); }
  rpSw(10,5,6,0.5); rx.fillStyle='#4a4e58'; rx.beginPath(); P.forEach(function(p){ rx.lineTo(p[0],p[1]); }); rx.closePath(); rx.fill(); rpNos();
  var top=[x-s*0.15,y-s*0.2]; for(i=0;i<n;i++){ var a2=P[i], b=P[(i+1)%n], mx=(a2[0]+b[0])/2-top[0], my=(a2[1]+b[1])/2-top[1], lit=rpCl(0.5-(mx+my)/(s*1.6),0,1);
    rx.fillStyle=rpC(rpL3([70,74,84],[178,184,196],lit)); rx.beginPath(); rx.moveTo(top[0],top[1]); rx.lineTo(a2[0],a2[1]); rx.lineTo(b[0],b[1]); rx.closePath(); rx.fill(); }
  if(snow){ rx.fillStyle='rgba(248,250,255,0.95)'; rx.beginPath(); rx.moveTo(top[0],top[1]); for(i=0;i<n;i++){ var p=P[i], k=0.5+0.25*Math.sin(i*2.1+x); rx.lineTo(top[0]+(p[0]-top[0])*k,top[1]+(p[1]-top[1])*k); } rx.closePath(); rx.fill();
    rx.fillStyle='rgba(170,190,220,0.45)'; rx.beginPath(); rx.moveTo(top[0],top[1]); rx.lineTo(P[2][0]*0.5+top[0]*0.5,P[2][1]*0.5+top[1]*0.5); rx.lineTo(P[3][0]*0.5+top[0]*0.5,P[3][1]*0.5+top[1]*0.5); rx.closePath(); rx.fill(); } }
function rpBoulder(x,y,s){ rpSw(8,4,5,0.45); rpEll(x,y,s,s*0.78,0.3,rpRg(x,y,s,'#c8c8c0','#5a5a58')); rpNos(); rpEll(x+s*0.3,y+s*0.3,s*0.4,s*0.25,0.4,'rgba(120,150,90,0.35)'); }
function rpRoof(x,y,w,h,c0,c1,a){ rx.save(); rx.translate(x,y); rx.rotate(a||0); rpSw(12,6,7,0.45); rx.fillStyle=c0; rx.fillRect(-w/2,-h/2,w,h/2); rpNos(); rx.fillStyle=c1; rx.fillRect(-w/2,0,w,h/2);
  rx.strokeStyle='rgba(0,0,0,0.18)'; rx.lineWidth=0.8; rx.beginPath(); for(var k=-h/2+3;k<h/2;k+=3.4){ rx.moveTo(-w/2,k); rx.lineTo(w/2,k); } rx.stroke(); rx.fillStyle='rgba(0,0,0,0.3)'; rx.fillRect(-w/2,-1,w,2); rx.restore(); }
function rpCottage(x,y,a,wall){ rx.save(); rx.translate(x,y); rx.rotate(a||0); rpSw(12,6,7,0.45); rx.fillStyle=wall||'#a8302a'; rx.fillRect(-20,-14,40,28); rpNos(); rx.restore(); rpRoof(x,y,40,24,'#5a5a62','#3e3e46',a);
  rx.save(); rx.translate(x,y); rx.rotate(a||0); rx.fillStyle='#f4f0e8'; rx.fillRect(-20,-14,3,28); rx.fillRect(17,-14,3,28); rx.fillStyle='#8a8a90'; rx.fillRect(8,-17,5,6); rx.restore(); }
function rpSauna(x,y,a){ rpCottage(x,y,a,'#6a3e22'); rx.fillStyle='rgba(235,235,240,0.55)'; [[10,-24,6],[14,-32,5],[18,-40,4],[20,-47,3]].forEach(function(q){ rx.beginPath(); rx.arc(x+q[0],y+q[1],q[2],0,6.2832); rx.fill(); }); }
function rpLonghouse(x,y,a){ rx.save(); rx.translate(x,y); rx.rotate(a||0); rpSw(14,7,8,0.5); rx.fillStyle='#4a6a2e'; rx.beginPath(); rx.roundRect(-36,-13,72,26,11); rx.fill(); rpNos();
  var r=rpSeed(x+y), C=['#5e8a3a','#6e9a44','#3e5a24','#7aaa50']; for(var i=0;i<70;i++){ rx.fillStyle=C[i%4]; rx.fillRect(-34+r()*68,-12+r()*24,1.6,1.6); }
  rx.fillStyle='rgba(255,255,255,0.12)'; rx.beginPath(); rx.roundRect(-36,-13,72,12,[11,11,0,0]); rx.fill(); rx.fillStyle='rgba(0,0,0,0.18)'; rx.beginPath(); rx.roundRect(-36,1,72,12,[0,0,11,11]); rx.fill();
  rx.fillStyle='#6a4a2a'; rx.fillRect(-39,-4,5,8); rx.fillRect(34,-4,5,8); rx.fillStyle='rgba(230,230,235,0.5)'; rx.beginPath(); rx.arc(10,-18,5,0,6.2832); rx.arc(15,-25,4,0,6.2832); rx.fill(); rx.restore(); }
function rpStave(x,y){ rpSw(12,6,8,0.5); rx.fillStyle='#2e2016'; rx.fillRect(x-15,y-11,30,22); rpNos(); rx.fillStyle='#24180f'; rx.fillRect(x-11,y-15,22,11); rx.fillStyle='#1a110a'; rx.fillRect(x-6,y-21,12,9);
  rx.strokeStyle='rgba(255,220,160,0.18)'; rx.lineWidth=0.8; rx.beginPath(); for(var k=-14;k<15;k+=2.6){ rx.moveTo(x+k,y-11); rx.lineTo(x+k,y+11); } rx.stroke();
  rx.strokeStyle='#c8a050'; rx.lineWidth=1.6; rx.beginPath(); rx.moveTo(x-15,y-11); rx.quadraticCurveTo(x-20,y-14,x-19,y-19); rx.moveTo(x+15,y-11); rx.quadraticCurveTo(x+20,y-14,x+19,y-19); rx.stroke(); }
function rpRune(x,y){ rpSw(6,3,4,0.45); rx.fillStyle=rpRg(x,y,9,'#b0b4bc','#4a4e58'); rx.beginPath(); rx.roundRect(x-5.5,y-10,11,18,[6,6,2,2]); rx.fill(); rpNos();
  rx.strokeStyle='#b8342a'; rx.lineWidth=1.1; rx.beginPath(); rx.moveTo(x-2,y-6); rx.lineTo(x+2,y-1); rx.lineTo(x-2,y+4); rx.moveTo(x,y-8); rx.lineTo(x,y+6); rx.stroke(); }
function rpFire(x,y){ var g=rx.createRadialGradient(x,y,1,x,y,22); g.addColorStop(0,'rgba(255,190,90,0.5)'); g.addColorStop(1,'rgba(255,150,60,0)'); rx.fillStyle=g; rx.beginPath(); rx.arc(x,y,22,0,6.2832); rx.fill();
  rpDisc(x,y,6,'#4a3e34'); rpDisc(x,y,4.5,rpRg(x,y,4.5,'#fff2a0','#ff6a1a',0,0)); rx.strokeStyle='#5a3a1e'; rx.lineWidth=2; rx.beginPath(); rx.moveTo(x-7,y-5); rx.lineTo(x+7,y+5); rx.moveTo(x+7,y-5); rx.lineTo(x-7,y+5); rx.stroke(); }
function rpCamp(x,y){ rpFire(x,y); [[-14,-6],[14,-4],[0,12]].forEach(function(q){ rpSw(3,1.5,2,0.4); rpDisc(x+q[0],y+q[1],3.8,'#6a4a2e'); rpNos(); rpDisc(x+q[0],y+q[1]-0.8,2.3,'#e8c088'); }); }
function rpTiki(x,y,s){ rpSw(12,6,7,0.45); rpDisc(x,y,s,rpRg(x,y,s,'#f0d088','#9a7030')); rpNos(); rx.strokeStyle='rgba(120,80,30,0.55)'; rx.lineWidth=0.7; rx.beginPath(); for(var k=0;k<36;k++){ var a=k/36*6.283; rx.moveTo(x+Math.cos(a)*s*0.15,y+Math.sin(a)*s*0.15); rx.lineTo(x+Math.cos(a)*s,y+Math.sin(a)*s); } rx.stroke(); rpDisc(x,y,s*0.14,'#7a5020'); }
function rpTent(x,y){ rpSw(10,5,6,0.4); rx.fillStyle='#e8dcc0'; rx.beginPath(); rx.moveTo(x-17,y+9); rx.lineTo(x,y-13); rx.lineTo(x+17,y+9); rx.fill(); rpNos(); rx.fillStyle='rgba(0,0,0,0.18)'; rx.beginPath(); rx.moveTo(x,y-13); rx.lineTo(x+17,y+9); rx.lineTo(x+1,y+9); rx.fill(); }
function rpBarrel(x,y,s){ rpSw(6,3,4,0.45); rpDisc(x,y,s,rpRg(x,y,s,'#c88a4a','#6a3a14')); rpNos(); rx.strokeStyle='#3a2208'; rx.lineWidth=1.2; rx.beginPath(); rx.arc(x,y,s*0.92,0,6.2832); rx.stroke(); rx.beginPath(); rx.arc(x,y,s*0.6,0,6.2832); rx.stroke(); }
function rpChest(x,y){ rpSw(6,3,4,0.45); rx.fillStyle='#7a4a22'; rx.fillRect(x-9,y-6,18,12); rpNos(); rx.fillStyle='#a06a32'; rx.fillRect(x-9,y-6,18,5); rx.fillStyle='#d8a830'; rx.fillRect(x-9,y-2,18,1.6); rx.fillRect(x-1.5,y-3,3,4); }
function rpWreck(x,y,a){ rx.save(); rx.translate(x,y); rx.rotate(a||0); rpSw(16,8,10,0.5); rx.fillStyle='#4a2e18'; rx.beginPath(); rx.moveTo(-52,0); rx.quadraticCurveTo(-30,-23,40,-15); rx.lineTo(54,0); rx.lineTo(40,15); rx.quadraticCurveTo(-30,23,-52,0); rx.fill(); rpNos();
  rx.save(); rx.clip(); rx.fillStyle=rpLg(0,-18,0,18,['#9a6a40','#6a4426','#3e2612']); rx.fillRect(-60,-30,120,60); rx.strokeStyle='rgba(30,16,6,0.6)'; rx.lineWidth=1; rx.beginPath(); for(var k=-50;k<54;k+=5){ rx.moveTo(k,-20); rx.lineTo(k+1,20); } rx.stroke(); rx.restore();
  rx.fillStyle='#0e0a08'; rx.beginPath(); rx.moveTo(2,-7); rx.lineTo(18,-3); rx.lineTo(10,6); rx.lineTo(-4,9); rx.lineTo(-8,1); rx.fill(); rx.strokeStyle='#5a3a1e'; rx.lineWidth=1.4; rx.beginPath(); [[4,-6,8,4],[12,-3,6,6],[-4,4,-10,8]].forEach(function(q){ rx.moveTo(q[0],q[1]); rx.lineTo(q[2],q[3]); }); rx.stroke();
  rx.save(); rx.rotate(0.65); rpSw(8,4,5,0.4); rx.fillStyle='#3a2410'; rx.fillRect(-2.5,-50,5,44); rpNos(); rx.restore(); rx.fillStyle='rgba(232,220,190,0.9)'; rx.beginPath(); rx.moveTo(-18,-36); rx.quadraticCurveTo(0,-46,10,-40); rx.lineTo(2,-26); rx.quadraticCurveTo(-6,-30,-18,-36); rx.fill(); rx.restore(); }
function rpRibs(x,y,a){ rx.save(); rx.translate(x,y); rx.rotate(a||0); rpSw(8,4,5,0.4); rx.strokeStyle='#4a2e16'; rx.lineWidth=3.4; rx.lineCap='round'; rx.beginPath(); rx.moveTo(-38,0); rx.lineTo(38,0); rx.stroke(); rx.lineWidth=2.6; rx.beginPath();
  for(var k=-32;k<=32;k+=7){ var L=13*(1-Math.abs(k)/46); rx.moveTo(k,0); rx.quadraticCurveTo(k-4,-L,k+2,-L-3); rx.moveTo(k,0); rx.quadraticCurveTo(k-4,L,k+2,L+3); } rx.stroke(); rpNos(); rx.restore(); }
function rpBone(w){ rx.strokeStyle='#efe8d6'; rx.lineWidth=w; rx.lineCap='round'; }
function rpWhale(x,y,a,s){ rx.save(); rx.translate(x,y); rx.rotate(a||0); rx.scale(s,s); rpSw(6,4,5,0.4); rpBone(4.5); rx.beginPath(); rx.moveTo(-46,0); rx.quadraticCurveTo(0,-4,34,0); rx.stroke();
  rpBone(2.6); rx.beginPath(); for(var k=-32;k<=24;k+=5.5){ var L=15*(1-Math.abs(k+4)/42); rx.moveTo(k,-1); rx.quadraticCurveTo(k+5,-L*0.7,k+1,-L); rx.moveTo(k,1); rx.quadraticCurveTo(k+5,L*0.7,k+1,L); } rx.stroke();
  rpEll(48,0,15,8.5,0,'#efe8d6'); rpNos(); rpEll(52,0,9,4.4,0,'#cfc6b0'); rpDisc(41,-4.4,2.4,'#5a4a34'); rpDisc(41,4.4,2.4,'#5a4a34');
  rpBone(3.4); rx.beginPath(); rx.moveTo(-46,0); rx.lineTo(-56,-9); rx.moveTo(-46,0); rx.lineTo(-56,9); rx.stroke(); rx.restore(); }
function rpSkullBig(x,y,s){ rpSw(6,3,4,0.4); rx.fillStyle=rpRg(x,y,12*s,'#fbf6e8','#b8ae96'); rx.beginPath(); rx.ellipse(x,y,12*s,9*s,0,0,6.2832); rx.fill(); rx.beginPath(); rx.ellipse(x+12*s,y,8*s,5*s,0,0,6.2832); rx.fill();
  rpBone(2.8*s); rx.beginPath(); rx.moveTo(x-6*s,y-8*s); rx.quadraticCurveTo(x-15*s,y-19*s,x-4*s,y-23*s); rx.moveTo(x-6*s,y+8*s); rx.quadraticCurveTo(x-15*s,y+19*s,x-4*s,y+23*s); rx.stroke(); rpNos(); rpDisc(x+2*s,y-4*s,2.8*s,'#3a2e22'); rpDisc(x+2*s,y+4*s,2.8*s,'#3a2e22'); }
function rpAnchor(x,y,a){ rx.save(); rx.translate(x,y); rx.rotate(a||0); rpSw(5,3,4,0.45); rx.strokeStyle='#5a5e66'; rx.lineWidth=3.4; rx.lineCap='round'; rx.beginPath(); rx.moveTo(0,-12); rx.lineTo(0,10); rx.moveTo(-6,-7); rx.lineTo(6,-7); rx.stroke(); rx.beginPath(); rx.arc(0,4,9,0.3,2.84); rx.stroke(); rx.beginPath(); rx.arc(0,-14,3,0,6.2832); rx.stroke(); rpNos();
  rx.strokeStyle='rgba(160,90,40,0.6)'; rx.lineWidth=1.2; rx.beginPath(); rx.arc(0,4,9,1.2,2.2); rx.stroke(); rx.restore(); }
function rpCannon(x,y,a){ rx.save(); rx.translate(x,y); rx.rotate(a||0); rpSw(6,3,4,0.45); rx.fillStyle=rpLg(0,-4,0,4,['#6a6a74','#2a2a30','#141418']); rx.beginPath(); rx.roundRect(-13,-4,26,8,3); rx.fill(); rpDisc(-13,0,5,'#2a2a30'); rpNos(); rpDisc(13,0,2.4,'#0a0a0c'); rx.restore();
  [[18,5],[23,9],[20,11]].forEach(function(q){ rpSw(3,1,2,0.4); rpDisc(x+q[0],y+q[1],2.8,rpRg(x+q[0],y+q[1],2.8,'#6a6a74','#141418')); rpNos(); }); }
function rpRowboat(x,y,a){ rx.save(); rx.translate(x,y); rx.rotate(a); rpSw(8,4,5,0.45); rpEll(0,0,19,7.5,0,'#8a5028'); rpNos(); rpEll(0,0,15,5,0,rpRg(0,0,15,'#d8a060','#9a6030',0,0)); rx.fillStyle='#6a3e1e'; [-9,-1,7].forEach(function(k){ rx.fillRect(k-1,-5,2.4,10); }); rx.restore(); }
function rpCrab(x,y){ rpSw(3,1.5,2,0.45); rpEll(x,y,5.5,4,0,rpRg(x,y,5,'#ff7a5a','#a8281a')); rpNos(); rx.strokeStyle='#c8382a'; rx.lineWidth=1.3;
  for(var k=-1;k<=1;k+=2){ rx.beginPath(); rx.moveTo(x+k*4,y-1); rx.lineTo(x+k*8,y-5); for(var j=0;j<3;j++){ rx.moveTo(x+k*3,y+1+j); rx.lineTo(x+k*7.5,y+3+j*1.6); } rx.stroke(); rpEll(x+k*8.5,y-6,2.4,1.6,k*0.5,'#d8402a'); } rpDisc(x-1.6,y-3.4,0.9,'#111'); rpDisc(x+1.6,y-3.4,0.9,'#111'); }
function rpTurtle(x,y,a){ rx.save(); rx.translate(x,y); rx.rotate(a||0); rpSw(4,2,3,0.4); [[-6,-5],[6,-5],[-6,5],[6,5]].forEach(function(q){ rpEll(q[0],q[1],3.4,2,0.6*Math.sign(q[0]*q[1]),'#7aa860'); }); rpEll(10.5,0,3.8,2.8,0,'#7aa860'); rpNos();
  rpEll(0,0,8.5,7,0,rpRg(0,0,8,'#8aa850','#2e4a1a')); rx.strokeStyle='rgba(30,50,10,0.7)'; rx.lineWidth=0.8; for(var k=-1;k<=1;k++){ rx.beginPath(); rx.arc(k*4,0,2.6,0,6.2832); rx.stroke(); } rx.restore(); }
function rpGull(x,y){ rpEll(x+14,y+22,7,2,0,'rgba(0,0,0,0.12)'); rx.strokeStyle='#ffffff'; rx.lineWidth=2.4; rx.lineCap='round'; rx.beginPath(); rx.moveTo(x-9,y-2); rx.quadraticCurveTo(x-3,y-7,x,y); rx.quadraticCurveTo(x+3,y-7,x+9,y-2); rx.stroke();
  rx.strokeStyle='#5a5e66'; rx.lineWidth=1; rx.beginPath(); rx.moveTo(x-9,y-2); rx.lineTo(x-7,y-3); rx.moveTo(x+9,y-2); rx.lineTo(x+7,y-3); rx.stroke(); }
function rpParrot(x,y){ rpSw(3,2,2,0.35); rpEll(x,y,4,7,0.3,rpRg(x,y,6,'#ff4a5a','#a8102a')); rpNos(); rx.fillStyle='#ffd23f'; rx.beginPath(); rx.moveTo(x+2,y+4); rx.lineTo(x+9,y+10); rx.lineTo(x+1,y+8); rx.fill(); rx.fillStyle='#2a8ad8'; rx.beginPath(); rx.moveTo(x-2,y+4); rx.lineTo(x-8,y+11); rx.lineTo(x,y+7); rx.fill(); rpDisc(x+1,y-4,1.3,'#fff'); }
function rpMoose(x,y,a){ rx.save(); rx.translate(x,y); rx.rotate(a||0); rpSw(6,3,4,0.45); rpEll(0,0,15,7,0,rpRg(0,0,14,'#8a6040','#3a2412')); rpEll(16,0,5.5,3.6,0,'#4a2e18'); rpNos();
  rx.fillStyle='#d8c498'; [[9,-4,-0.6],[9,4,0.6]].forEach(function(q){ rx.save(); rx.translate(q[0],q[1]); rx.rotate(q[2]); rx.beginPath(); rx.ellipse(0,q[1]>0?4.5:-4.5,3.2,6.5,0,0,6.2832); rx.fill(); rx.restore(); }); rx.restore(); }
function rpBear(x,y,a,s){ rx.save(); rx.translate(x,y); rx.rotate(a||0); rx.scale(s,s); rpSw(6,3,4,0.45); rpEll(0,0,12.5,8.5,0,rpRg(0,0,12,'#8a5a3a','#2e1a0e')); rpNos(); rpDisc(12.5,0,5.6,rpRg(12.5,0,5.6,'#7a4e30','#2e1a0e')); rpDisc(14,-4.4,1.9,'#3e2414'); rpDisc(14,4.4,1.9,'#3e2414'); rpDisc(17.4,0,2,'#1a0e06'); rx.restore(); }
function rpFox(x,y){ rpSw(4,2,3,0.4); rpEll(x,y,7,3.8,0,rpRg(x,y,7,'#ffa04a','#a8481a')); rpEll(x-9,y+1,6.5,2.6,0.2,'#e8782a'); rpNos(); rpDisc(x-14.5,y+2.4,1.9,'#fff'); rpDisc(x+8,y,3.4,'#e8782a'); rx.fillStyle='#c85a1a'; rx.beginPath(); rx.moveTo(x+8,y-3); rx.lineTo(x+10,y-7); rx.lineTo(x+11,y-2); rx.fill(); }
function rpHare(x,y){ rpSw(3,1.5,2,0.4); rpEll(x,y,5.5,3.6,0,rpRg(x,y,5,'#e0d0b8','#8a7a62')); rpDisc(x+5.4,y,2.7,'#c8b8a0'); rpNos(); rpEll(x+3,y-3.8,1,3.2,0.5,'#b8a890'); rpEll(x+3,y+3.8,1,3.2,-0.5,'#b8a890'); rpDisc(x-5.4,y,1.7,'#fff'); }
function rpSheep(x,y){ rpSw(4,2,3,0.4); var r=rpSeed(x*5+y); for(var i=0;i<8;i++){ var px=x+(r()-0.5)*9, py=y+(r()-0.5)*6.5; rpDisc(px,py,3.6,rpRg(px,py,3.6,'#ffffff','#b8b4a8')); if(!i) rpNos(); } rpNos(); rpDisc(x+6.5,y,2.7,'#2a2622'); }
function rpGoat(x,y){ rpSw(4,2,3,0.4); rpEll(x,y,7,3.8,0,rpRg(x,y,7,'#f4ece0','#a89c88')); rpNos(); rpDisc(x+7,y,2.7,'#d8cfc0'); rx.strokeStyle='#5a4a3a'; rx.lineWidth=1.3; rx.beginPath(); rx.moveTo(x+7,y-2); rx.quadraticCurveTo(x+5,y-6,x+3,y-6); rx.moveTo(x+7,y+2); rx.quadraticCurveTo(x+5,y+6,x+3,y+6); rx.stroke(); }
function rpEagle(x,y){ rpEll(x+22,y+28,14,4,0,'rgba(0,0,0,0.13)'); rpSw(3,1,2,0.3); rx.fillStyle='#4a2e1a'; rx.beginPath(); rx.moveTo(x-18,y+2); rx.quadraticCurveTo(x-7,y-7,x,y); rx.quadraticCurveTo(x+7,y-7,x+18,y+2); rx.lineTo(x+7,y+2); rx.lineTo(x,y+7); rx.lineTo(x-7,y+2); rx.fill(); rpNos(); rpDisc(x,y-2.4,2.6,'#fff'); }
function rpSwan(x,y){ rpSw(3,1.5,2,0.3); rpEll(x,y,6.5,3.8,0,rpRg(x,y,6,'#ffffff','#c8ccd4')); rpNos(); rx.strokeStyle='#fff'; rx.lineWidth=1.8; rx.beginPath(); rx.moveTo(x+4,y); rx.quadraticCurveTo(x+10,y-2,x+8.5,y-5.5); rx.stroke(); rx.fillStyle='#e8782a'; rx.fillRect(x+8,y-6.5,2.6,1.4); }
function rpDuck(x,y){ rpSw(2,1,1.5,0.3); rpEll(x,y,5,3.4,0,rpRg(x,y,5,'#a88a60','#5a4428')); rpNos(); rpDisc(x+4,y-1,2.2,'#2a7a4a'); rx.fillStyle='#e8a020'; rx.fillRect(x+6,y-1.6,2.4,1.2); }
function rpHedgehog(x,y){ rpSw(3,1.5,2,0.4); rpEll(x,y,5.4,3.8,0,'#5a4a3a'); rpNos(); rx.strokeStyle='#2e241a'; rx.lineWidth=0.7; rx.beginPath(); for(var k=-4;k<=3;k+=1.2){ rx.moveTo(x+k,y-3); rx.lineTo(x+k-1.5,y-5.4); rx.moveTo(x+k,y+3); rx.lineTo(x+k-1.5,y+5.4); } rx.stroke(); rpDisc(x+5.2,y,1.7,'#c8a888'); }
function rpSquirrel(x,y){ rpSw(2,1,1.5,0.35); rpEll(x,y,3.2,2.2,0,'#c8642a'); rpNos(); rx.strokeStyle='#d8743a'; rx.lineWidth=3.4; rx.lineCap='round'; rx.beginPath(); rx.arc(x-4,y-2,3.2,1.2,4.4); rx.stroke(); rpDisc(x+3,y,1.7,'#c8642a'); }
function rpOwl(x,y){ rpSw(3,1.5,2,0.4); rpEll(x,y,4.4,5.4,0,rpRg(x,y,5,'#b08a5a','#5a4024')); rpNos(); rpDisc(x-1.6,y-2,1.5,'#ffd23f'); rpDisc(x+1.6,y-2,1.5,'#ffd23f'); rpDisc(x-1.6,y-2,0.6,'#111'); rpDisc(x+1.6,y-2,0.6,'#111'); }
function rpMushroom(x,y){ rpSw(2,1,1.5,0.4); rpDisc(x,y,3.8,rpRg(x,y,3.8,'#ff5a4a','#8a140a')); rpNos(); rpDisc(x-1,y-1,0.8,'#fff'); rpDisc(x+1.3,y+0.7,0.7,'#fff'); }
function rpLogs(x,y){ rpSw(6,3,4,0.45); rx.fillStyle='#7a5030'; rx.fillRect(x-13,y-7,26,14); rpNos(); for(var k=0;k<4;k++){ rx.fillStyle=rpLg(0,y-7+k*3.5,0,y-3.5+k*3.5,['#b07a48','#6a4424']); rx.fillRect(x-13,y-7+k*3.5,26,3.3); rpDisc(x+13,y-5.3+k*3.5,1.7,'#e8c898'); } }
function rpShields(x,y){ ['#b8302a','#2a5ab8','#e8c040','#b8302a'].forEach(function(col,k){ rpSw(3,1.5,2,0.4); rpDisc(x+k*8.5,y,4.4,rpRg(x+k*8.5,y,4.4,col,'#1a1a1a')); rpNos(); rpDisc(x+k*8.5,y,1.4,'#c8c8d0'); }); }
function rpWaterfall(x,y){ rx.fillStyle=rpLg(x-7,0,x+7,0,['rgba(200,225,255,0.85)','rgba(255,255,255,0.98)','rgba(200,225,255,0.85)']); rx.fillRect(x-7,y-50,14,52); rx.strokeStyle='rgba(170,200,240,0.7)'; rx.lineWidth=0.8; rx.beginPath(); for(var k=-5;k<=5;k+=2.5){ rx.moveTo(x+k,y-50); rx.lineTo(x+k,y); } rx.stroke();
  var f=rx.createRadialGradient(x,y+3,2,x,y+3,20); f.addColorStop(0,'rgba(255,255,255,0.95)'); f.addColorStop(1,'rgba(255,255,255,0)'); rx.fillStyle=f; rx.beginPath(); rx.ellipse(x,y+3,20,8,0,0,6.2832); rx.fill(); }
/* the zones' sets: [draw(x,y,s,r), radius at s=1, [s from, to], weight] — «больше скелетов и кораблей», «ещё больше ёлок», «скалы» */
var RP_SET={
  lag:[[function(x,y,s){ rpPalm(x,y,15*s); },17,[0.9,1.4],5],[function(x,y,s){ rpTiki(x,y,13*s); },13,[0.9,1.3],0.7],[function(x,y){ rpTent(x,y); },17,[1,1],0.35],
    [function(x,y,s,r){ rpWreck(x,y,(r()-0.5)*0.6); },50,[1,1],0.6],[function(x,y,s,r){ rpRibs(x,y,(r()-0.5)*0.6); },38,[1,1],0.8],[function(x,y,s,r){ rpWhale(x,y,(r()-0.5)*0.5,s); },56,[0.7,0.9],0.8],
    [function(x,y,s){ rpSkullBig(x,y,s); },20,[0.8,1.1],1],[function(x,y,s,r){ rpAnchor(x,y,r()*6); },14,[1,1],0.6],[function(x,y,s,r){ rpCannon(x,y,(r()-0.5)*2); },18,[1,1],0.5],
    [function(x,y,s,r){ rpRowboat(x,y,(r()-0.5)*1.2); },20,[1,1],0.4],[function(x,y){ rpBarrel(x,y,6.5); rpBarrel(x+13,y+10,5.5); },13,[1,1],0.6],[function(x,y){ rpChest(x,y); },10,[1,1],0.5],
    [function(x,y){ rpCrab(x,y); },9,[1,1],1.6],[function(x,y,s,r){ rpTurtle(x,y,r()*6); },12,[1,1],0.6],[function(x,y){ rpParrot(x,y); },10,[1,1],0.35],[function(x,y){ rpCamp(x,y); },20,[1,1],0.3],
    [function(x,y){ rpGull(x,y); rpGull(x+20,y+12); },16,[1,1],0.4]],
  fin:[[function(x,y,s){ rpPine(x,y,11+6*s); },13,[0,1],9],[function(x,y){ rpBirch(x,y,9); },11,[1,1],1.6],[function(x,y,s,r){ rpBush(x,y,6,r()<0.5?'#2a3ab8':'#c82a3a'); },8,[1,1],1.6],
    [function(x,y){ rpFern(x,y,8); },9,[1,1],1],[function(x,y,s,r){ rpCottage(x,y,(r()-0.5)*0.3,r()<0.6?'#a8302a':'#c8a030'); },26,[1,1],0.16],[function(x,y,s,r){ rpSauna(x,y,(r()-0.5)*0.2); },28,[1,1],0.1],
    [function(x,y){ rpLogs(x,y); },15,[1,1],0.4],[function(x,y,s){ rpBoulder(x,y,6+3*s); },9,[0,1],0.6],[function(x,y,s,r){ rpMoose(x,y,(r()-0.5)*1.2); },20,[1,1],0.35],
    [function(x,y,s,r){ rpBear(x,y,(r()-0.5)*1.2,1); if(r()<0.5) rpBear(x+22,y+13,(r()-0.5)*1.2,0.65); },16,[1,1],0.3],[function(x,y){ rpFox(x,y); },15,[1,1],0.35],[function(x,y){ rpHare(x,y); },8,[1,1],0.35],
    [function(x,y){ rpHedgehog(x,y); },7,[1,1],0.3],[function(x,y){ rpSquirrel(x,y); },7,[1,1],0.3],[function(x,y){ rpOwl(x,y); },6,[1,1],0.25],[function(x,y){ rpMushroom(x,y); rpMushroom(x+8,y+6); },7,[1,1],0.5]],
  fj:[[function(x,y,s){ rpRock(x,y,9+12*s,true); },16,[0,1],7],[function(x,y){ rpPine(x,y,11,true); },13,[1,1],1.3],[function(x,y,s,r){ rpLonghouse(x,y,(r()-0.5)*0.3); },38,[1,1],0.35],
    [function(x,y){ rpStave(x,y); },24,[1,1],0.15],[function(x,y){ rpRune(x,y); rpRune(x+18,y+10); },14,[1,1],0.4],[function(x,y){ rpShields(x,y); },20,[1,1],0.3],[function(x,y){ rpCamp(x,y); },22,[1,1],0.3],
    [function(x,y,s,r){ rpSheep(x,y); if(r()<0.7) rpSheep(x+19,y+8); if(r()<0.5) rpSheep(x+10,y-10); },16,[1,1],0.6],[function(x,y){ rpGoat(x,y); rpGoat(x+21,y+10); },14,[1,1],0.4],[function(x,y){ rpEagle(x,y); },20,[1,1],0.2]] };
var RP_N={lag:13,fin:42,fj:26};   // how many things a chunk tries to place
/* ── the river's own buildings, in the shallows and on the shore at the water ── */
function rpDeck(x0,y0,x1,y1,w,col){ var a=Math.atan2(y1-y0,x1-x0), L=Math.hypot(x1-x0,y1-y0), k; rx.save(); rx.translate(x0,y0); rx.rotate(a); rpSw(10,5,6,0.5); rx.fillStyle=col||'#a8784a'; rx.fillRect(0,-w/2,L,w); rpNos();
  for(k=0;k<L;k+=3.2){ rx.fillStyle=(k/3.2|0)%3?'rgba(0,0,0,0.06)':'rgba(255,255,255,0.06)'; rx.fillRect(k,-w/2,3,w); rx.fillStyle='rgba(50,30,12,0.55)'; rx.fillRect(k,-w/2,0.5,w); }
  [[0,-w/2],[0,w/2],[L,-w/2],[L,w/2],[L/2,-w/2],[L/2,w/2]].forEach(function(q){ rpDisc(q[0],q[1],2.4,rpRg(q[0],q[1],2.4,'#8a6038','#3a2410')); }); rx.restore(); }
function rpPile(x,y){ rpSw(4,2,3,0.5); rpDisc(x,y,2.8,rpRg(x,y,2.8,'#9a6a40','#3a2410')); rpNos(); rx.strokeStyle='rgba(255,255,255,0.5)'; rx.lineWidth=0.8; rx.beginPath(); rx.arc(x,y,4.2,0,6.2832); rx.stroke(); }
function rpBuoy(x,y){ rx.strokeStyle='rgba(255,255,255,0.55)'; rx.lineWidth=0.8; rx.beginPath(); rx.arc(x,y,7,0,6.2832); rx.stroke(); rpSw(4,2,3,0.45); rpDisc(x,y,4.6,rpRg(x,y,4.6,'#e8342a','#5a0a0a')); rpNos(); rx.fillStyle='#fff'; rx.fillRect(x-4.6,y-1.2,9.2,2.4); rpDisc(x-1.4,y-1.6,1,'rgba(255,255,255,0.8)'); }
function rpFloatBarrel(x,y){ rx.strokeStyle='rgba(255,255,255,0.5)'; rx.lineWidth=0.8; rx.beginPath(); rx.ellipse(x,y,9,6,0,0,6.2832); rx.stroke(); rpBarrel(x,y,5); }
function rpMast(x,y,a){ rx.save(); rx.translate(x,y); rx.rotate(a); rx.scale(0.75,0.75); rpEll(0,6,26,10,0,'rgba(40,30,20,0.35)'); rpSw(6,3,4,0.45); rx.fillStyle='#3a2410'; rx.fillRect(-2,-16,4,26); rx.fillRect(-12,-8,24,3); rpNos();
  rx.fillStyle='rgba(220,210,180,0.85)'; rx.beginPath(); rx.moveTo(2,-14); rx.lineTo(14,-10); rx.lineTo(3,-6); rx.fill(); rx.strokeStyle='rgba(255,255,255,0.6)'; rx.lineWidth=0.9; rx.beginPath(); rx.ellipse(0,9,6,2.4,0,0,6.2832); rx.stroke(); rx.restore(); }
function rpMoored(x,y,a,hull,deck){ rx.save(); rx.translate(x,y); rx.rotate(a); rpSw(8,4,5,0.45); rx.fillStyle=hull; rx.beginPath(); rx.moveTo(20,0); rx.quadraticCurveTo(8,-8,-18,-7); rx.lineTo(-18,7); rx.quadraticCurveTo(8,8,20,0); rx.fill(); rpNos();
  rx.fillStyle=deck; rx.beginPath(); rx.moveTo(15,0); rx.quadraticCurveTo(6,-5,-15,-4.5); rx.lineTo(-15,4.5); rx.quadraticCurveTo(6,5,15,0); rx.fill(); rx.fillStyle='rgba(60,36,14,0.8)'; [-9,-1,7].forEach(function(k){ rx.fillRect(k-1,-4.5,2,9); }); rx.restore(); }
function rpPlatform(x,y,a){ rx.save(); rx.translate(x,y); rx.rotate(a); rx.strokeStyle='rgba(255,255,255,0.45)'; rx.lineWidth=0.8; rx.strokeRect(-13,-13,26,26); rpSw(8,4,5,0.5); rx.fillStyle='#a8784a'; rx.fillRect(-11,-11,22,22); rpNos();   // a bathing platform (not a raft: a raft is a rival)
  rx.fillStyle='rgba(50,30,12,0.5)'; for(var k=-11;k<11;k+=3.6) rx.fillRect(-11,k,22,0.5); rx.strokeStyle='#c8ccd4'; rx.lineWidth=1.2; rx.beginPath(); rx.moveTo(-4,11); rx.lineTo(-4,16); rx.moveTo(4,11); rx.lineTo(4,16); rx.moveTo(-4,13.5); rx.lineTo(4,13.5); rx.stroke(); rx.restore(); }
function rpDam(x,y,sd){ rpSw(6,3,4,0.5); for(var i=0;i<22;i++){ var a=(i/22-0.5)*1.2, L=10+(i%3)*4; rx.save(); rx.translate(x+(i-11)*1.6,y); rx.rotate(a+(i%2?0.4:-0.4)); rx.fillStyle=i%2?'#6a4a2a':'#8a6440'; rx.fillRect(-L/2,-1,L,2); rx.restore(); if(!i) rpNos(); } rpNos(); }
function rpLongship(x,y,a){ rx.save(); rx.translate(x,y); rx.rotate(a); rx.scale(0.85,0.85); rpSw(10,5,6,0.5); rx.fillStyle='#6a4022'; rx.beginPath(); rx.moveTo(-40,0); rx.quadraticCurveTo(-30,-12,0,-11); rx.quadraticCurveTo(30,-12,40,0); rx.quadraticCurveTo(30,12,0,11); rx.quadraticCurveTo(-30,12,-40,0); rx.fill(); rpNos();
  rx.fillStyle=rpLg(0,-10,0,10,['#b07a48','#5a3418']); rx.beginPath(); rx.moveTo(-34,0); rx.quadraticCurveTo(-26,-8,0,-8); rx.quadraticCurveTo(26,-8,34,0); rx.quadraticCurveTo(26,8,0,8); rx.quadraticCurveTo(-26,8,-34,0); rx.fill();
  for(var k=-26;k<=26;k+=7.5) [-1,1].forEach(function(sd){ rpDisc(k,sd*9.5,3,rpRg(k,sd*9.5,3,['#c8342a','#e8c040','#2a5ab8'][((k+26)/7.5|0)%3],'#1a1a1a')); });
  rx.strokeStyle='#4a2a10'; rx.lineWidth=2; rx.beginPath(); rx.moveTo(40,0); rx.quadraticCurveTo(46,-4,44,-9); rx.stroke(); rx.restore(); }
function rpNaust(x,y,sd){ rx.save(); rx.translate(x,y); rpSw(12,6,7,0.5); rx.fillStyle='#3a2a1e'; rx.fillRect(-16,-sd*2,32,-sd*34); rpNos();   // a boat shed, its open end to the water (sd: the water's side, −1 above)
  rx.fillStyle=rpLg(-16,0,0,0,['#3e5a24','#5f8436']); rx.fillRect(-16,-sd*4,16,-sd*30); rx.fillStyle=rpLg(0,0,16,0,['#7aa448','#56783a']); rx.fillRect(0,-sd*4,16,-sd*30);
  var C=['#86b050','#34501e','#6e9a44']; for(var i=0;i<70;i++){ rx.fillStyle=C[i%3]; rx.fillRect(-15+((i*7)%30),-sd*(5+((i*11)%27)),1.6,1.6); }
  rx.fillStyle='#2a1e14'; rx.fillRect(-1,-sd*4,2,-sd*30); rx.fillStyle='#6a4a2e'; rx.fillRect(-16,-sd*34,32,-sd*3); rx.fillStyle='#1a120c'; rx.fillRect(-9,-sd*34,18,-sd*3); rx.restore(); }
function rpLighthouse(x,y,sd){ var dir=sd>0?-1.5708:1.5708, b=rx.createRadialGradient(x,y,4,x,y,70); b.addColorStop(0,'rgba(255,240,160,0.32)'); b.addColorStop(1,'rgba(255,240,160,0)'); rx.fillStyle=b; rx.beginPath(); rx.moveTo(x,y); rx.arc(x,y,70,dir-0.35,dir+0.35); rx.closePath(); rx.fill();
  rpSw(14,7,9,0.55); rpDisc(x,y,19,rpRg(x,y,19,'#a4a8b0','#4a4e56')); rpNos(); for(var i=0;i<10;i++){ var a=i*0.63; rpDisc(x+Math.cos(a)*16,y+Math.sin(a)*16,3.2,i%2?'#6a6e78':'#8a8e98'); }
  rpDisc(x,y,13,'#f4f0e8'); rpDisc(x,y,10.5,'#c8302a'); rpDisc(x,y,8,'#f4f0e8'); rpDisc(x,y,5.5,'#2a2e36'); rpDisc(x,y,4,'#ffe066'); rpDisc(x-1.2,y-1.2,1.4,'#fffbe0');
  var g=rx.createRadialGradient(x,y,2,x,y,34); g.addColorStop(0,'rgba(255,240,150,0.55)'); g.addColorStop(1,'rgba(255,240,150,0)'); rx.fillStyle=g; rx.beginPath(); rx.arc(x,y,34,0,6.2832); rx.fill(); }
function rpFloe(x,y,s){ rx.strokeStyle='rgba(255,255,255,0.4)'; rx.lineWidth=0.8; rx.beginPath(); rx.ellipse(x,y,s*1.3,s*0.9,0.3,0,6.2832); rx.stroke(); rpSw(6,3,4,0.35); var r=rpSeed(x+y); rx.fillStyle=rpRg(x,y,s,'#ffffff','#b8cce4'); rx.beginPath(); for(var i=0;i<8;i++){ var a=i/8*6.283; rx.lineTo(x+Math.cos(a)*s*(0.7+r()*0.4),y+Math.sin(a)*s*(0.6+r()*0.3)); } rx.closePath(); rx.fill(); rpNos(); }
function rpSkerry(x,y,s){ rx.strokeStyle='rgba(255,255,255,0.55)'; rx.lineWidth=1; rx.beginPath(); rx.ellipse(x,y,s*1.4,s,0,0,6.2832); rx.stroke(); rpRock(x,y,s,false); }
/* the chunk's road in logical px: [the middle, the half-width] at x */
function rpAt(road,x){ var a=rAt(road,x/2); return [a[0]*2,a[1]*2]; }
function rpWob(x,s){ return Math.sin(x*0.061+s*1.7)*0.55+Math.sin(x*0.023+s*4.1)*0.45; }
/* the river's outline: the road's half-width plus off, the shore's own wobble (wob px; never on the channel's edges) */
function rpRiver(road,off,x0L,wob){ var n=road.m.length, k, px; rx.beginPath();
  for(k=0;k<n;k++){ px=(-4+k*2)*2; rx.lineTo(px,(road.m[k]-road.w[k])*2-off-rpWob(x0L+px,1)*wob); }
  for(k=n-1;k>=0;k--){ px=(-4+k*2)*2; rx.lineTo(px,(road.m[k]+road.w[k])*2+off+rpWob(x0L+px,2)*wob); } rx.closePath(); }
function rpEdge(road,sd,off,x0L,wob){ var n=road.m.length, k, px; rx.beginPath(); for(k=0;k<n;k++){ px=(-4+k*2)*2; rx.lineTo(px,road.m[k]*2+sd*(road.w[k]*2+off+rpWob(x0L+px,sd<0?1:2)*wob)); } }
/* the zones: the lagoon, the Finnish river, the fjords, round and round; the last two chunks of a zone blend into the next */
var RP_Z=['lag','fin','fj'], RP_ZN=12;
function rpZone(i){ var p=i+4, z=Math.floor(p/RP_ZN), w=p-z*RP_ZN, bl=w>=RP_ZN-2; return {a:((z%3)+3)%3,b:(((z+1)%3)+3)%3,t0:bl?(w-(RP_ZN-2))/2:0,t1:bl?(w-(RP_ZN-2)+1)/2:0}; }
var RP_LOOK={
  lag:{land:'sand',wat:'wlag',deep:[22,132,178],sh:[118,214,212],flat:[178,228,206],band:[202,174,118],bw:9,wob:5,foam:1,glint:[255,255,255,0.35,70]},
  fin:{land:'grass',wat:'wfin',deep:[22,56,82],sh:[58,104,112],flat:[96,112,88],band:[106,98,78],bw:6,wob:4,reeds:1},
  fj:{land:'snow',wat:'wfj',deep:[12,30,52],sh:[44,80,110],flat:[104,128,146],band:[70,74,84],bw:15,wob:6,rock:1,glint:[200,220,255,0.25,30]} };
function rpGround(L,road,x0L,WL,HL,r){ var SH=RP_SH, k, i;
  rpPat(rpTile(L.land),x0L,WL,HL);
  rx.fillStyle=rpC(L.band); rpRiver(road,SH+L.bw,x0L,L.wob); rx.fill();
  if(L.rock){ for(i=0;i<46;i++){ var sx=4+r()*(WL-8), sa=rpAt(road,sx), ss=r()<0.5?-1:1, sy=sa[0]+ss*(sa[1]+SH+2+r()*(L.bw-2)+rpWob(x0L+sx,ss<0?1:2)*L.wob); rpRock(sx,sy,2.5+r()*4,r()<0.35); } }   // the fjords' stony shore: loose rocks, some with snow
  if(L.band&&L.land==='sand'){ rx.strokeStyle='rgba(255,250,235,0.35)'; rx.lineWidth=2; [-1,1].forEach(function(sd){ rpEdge(road,sd,SH+L.bw,x0L,L.wob); rx.stroke(); }); }
  // the water: the shallows (off the road), the channel's lighter edge to a unit past the road's edge, the channel deeper to the middle
  rx.fillStyle=rpC(L.flat); rpRiver(road,SH,x0L,L.wob); rx.fill();
  rx.fillStyle=rpC(rpL3(L.flat,L.sh,0.55)); rpRiver(road,RP_EDGE+5,x0L,0); rx.fill();
  rx.fillStyle=rpC(L.sh); rpRiver(road,RP_EDGE,x0L,0); rx.fill();
  for(k=0;k<8;k++){ var f=k/8; rx.fillStyle=rpC(rpL3(L.sh,L.deep,Math.pow((k+1)/8,0.7))); rx.beginPath(); var n=road.m.length, j;
    for(j=0;j<n;j++) rx.lineTo((-4+j*2)*2,road.m[j]*2-(road.w[j]*2-RP_KERB)*(1-f*0.85)); for(j=n-1;j>=0;j--) rx.lineTo((-4+j*2)*2,road.m[j]*2+(road.w[j]*2-RP_KERB)*(1-f*0.85)); rx.closePath(); rx.fill(); }
  rx.save(); rpRiver(road,SH,x0L,L.wob); rx.clip(); if(RPX) rx.globalAlpha=0.45; rpPat(rpTile(L.wat),x0L,WL,HL); rx.globalAlpha=1;
  if(L.glint){ var gl=L.glint; for(i=0;i<gl[4];i++){ var gx=r()*WL, ga=rpAt(road,gx), gy=ga[0]+(r()-0.5)*2*(ga[1]+SH); rpEll(gx,gy,2+r()*4,0.8,0,rpC(gl,gl[3]*(0.5+r()))); } }
  rx.restore();
  // the road's edge, softly: a line of little ripples where the channel ends and the shallows begin
  rx.strokeStyle='rgba(255,255,255,0.3)'; rx.lineWidth=1.1; rx.lineCap='round'; [-1,1].forEach(function(sd){ for(var x=r()*8;x<WL;x+=6+r()*9){ var l=3+r()*5, j=(r()-0.5)*2.4, a1=rpAt(road,x), a2=rpAt(road,x+l);
    rx.beginPath(); rx.moveTo(x,a1[0]+sd*(a1[1]+RP_EDGE+j)); rx.quadraticCurveTo(x+l/2,(a1[0]+a2[0])/2+sd*((a1[1]+a2[1])/2+RP_EDGE+j-1.2),x+l,a2[0]+sd*(a2[1]+RP_EDGE+j)); rx.stroke(); } });
  if(L.foam){ [-1,1].forEach(function(sd){ rx.strokeStyle='rgba(255,255,255,0.75)'; rx.lineWidth=2.4; rpEdge(road,sd,SH-1,x0L,L.wob); rx.stroke(); rx.strokeStyle='rgba(255,255,255,0.35)'; rx.lineWidth=1.2; rpEdge(road,sd,SH-5,x0L,L.wob); rx.stroke(); }); }
  if(L.reeds) rpReeds(road,x0L,WL,r); }
function rpReeds(road,x0L,WL,r){ rx.lineCap='round'; for(var x=4+((x0L%19)+19)%19;x<WL;x+=19){ var sd=Math.floor((x0L+x)/19)%2?1:-1, a=rpAt(road,x), y=a[0]+sd*(a[1]+RP_SH+2+rpWob(x0L+x,sd<0?1:2)*4), q=rpSeed(x0L+x);
    for(var k=0;k<5;k++){ var dx=(q()-0.5)*8, h=7+q()*7; rx.strokeStyle=k%2?'#9ab070':'#5a7a3a'; rx.lineWidth=1.1; rx.beginPath(); rx.moveTo(x+dx,y); rx.lineTo(x+dx+(q()-0.5)*4,y-sd*h); rx.stroke(); }
    rpEll(x,y-sd*13,1.4,3,0,'#5a3a1e'); } }
function rpGroundAll(road,z,x0L,WL,HL,r){ rpGround(RP_LOOK[RP_Z[z.a]],road,x0L,WL,HL,rpSeed(r()*1e9));
  if(z.t1>0){ var KS=rKS(), o=hdOff(RCW*K+3,LH,hs), keep=rx; rx=o.x; rx.setTransform(hs*KS,0,0,hs*KS,0,0); rx.scale(0.5,0.5); rpGround(RP_LOOK[RP_Z[z.b]],road,x0L,WL,HL,rpSeed(r()*1e9));
    if(RPX) rpDitherIn(o.c,z.t0,z.t1);   // pixels: each pixel the one zone's or the other's (a blend of colours would leave the palette), ordered dither
    else { rx.globalCompositeOperation='destination-in'; var g=rx.createLinearGradient(0,0,WL,0); g.addColorStop(0,'rgba(0,0,0,'+z.t0+')'); g.addColorStop(1,'rgba(0,0,0,'+z.t1+')'); rx.fillStyle=g; rx.fillRect(-20,-20,WL+40,HL+40); }
    rx=keep; rx.save(); rx.setTransform(1,0,0,1,0,0); rx.drawImage(o.c,0,0); rx.restore(); } }
var RP_BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
function rpDitherIn(c,t0,t1){ var x=c.getContext('2d'), W=c.width, H=c.height, im=x.getImageData(0,0,W,H), d=im.data, Wc=RCW*K*hs; for(var j=0;j<H;j++) for(var i=0;i<W;i++){ var t=t0+(t1-t0)*Math.min(1,i/Wc); if(t<=(RP_BAYER[(j&3)*4+(i&3)]+0.5)/16) d[(j*W+i)*4+3]=0; } x.putImageData(im,0,0); }
/* one thing per chunk on the water, sometimes (sd −1: the upper bank); placed: the shore kept clear for it */
function rpInfra(zn,r,road,x0L,WL,HL,placed){ var SH=RP_SH, sd=r()<0.5?-1:1, x=50+r()*(WL-100), a=rpAt(road,x), k=r(), ang=Math.atan2(rpAt(road,x+4)[0]-rpAt(road,x-4)[0],8);
  function Y(xx,d){ var q=rpAt(road,xx); return q[0]+sd*(q[1]+d); }
  function ok(y){ return y>48&&y<HL-6; }
  var mid=(RP_EDGE+SH)/2+1;
  if(zn==='lag'){ if(r()>0.6) return;
    if(k<0.25){ var y0=Y(x,SH+24), y1=Y(x,RP_EDGE+5); if(!ok(y0)||!ok(y1)) return; rpDeck(x,y0,x,y1,12); rpMoored(x+24,Y(x+24,mid),ang,'#7a4220','#b8804a'); placed.push([x,y0,22]); }
    else if(k<0.45){ for(var i=0;i<5;i++){ var px=x-26+i*13, py=Y(px,mid); if(ok(py)) rpPile(px,py); } }
    else if(k<0.7){ for(var j=0;j<1+Math.floor(r()*3);j++){ var bx=x-30+j*30+r()*10, by=Y(bx,mid+(r()-0.5)*6); if(ok(by)) rpBuoy(bx,by); } }
    else if(k<0.85){ var fy=Y(x,mid); if(ok(fy)) rpFloatBarrel(x,fy); if(r()<0.5&&ok(Y(x+22,mid))) rpFloatBarrel(x+22,Y(x+22,mid)); }
    else { var my=Y(x,mid+2); if(ok(my)) rpMast(x,my,(r()-0.5)*0.8); } return; }
  if(zn==='fin'){ if(r()<0.3){ var sw=Y(x+30,mid); if(ok(sw)){ rpSwan(x+30,sw); rpSwan(x+44,sw+sd*4); } else if(ok(Y(x+30,mid))){ rpDuck(x+30,Y(x+30,mid)); } }
    if(r()>0.65) return;
    if(k<0.25){ var j0=Y(x,SH+22), j1=Y(x,RP_EDGE+6); if(!ok(j0)||!ok(j1)) return; rpDeck(x,j0,x,j1,10); rpMoored(x-24,Y(x-24,mid),ang,'#2a5a8a','#e8e0d0'); placed.push([x,j0,20]); }
    else if(k<0.45){ var pp=Y(x,mid); if(ok(pp)) rpPlatform(x,pp,ang); }
    else if(k<0.65){ for(var n2=0;n2<5;n2++){ var nx=x-24+n2*12, ny=Y(nx,mid); if(!ok(ny)) continue; rpSw(3,1.5,2,0.5); rpDisc(nx,ny,1.8,'#5a3a1e'); rpNos(); if(n2<4){ var x2=nx+12, y2=Y(x2,mid); rx.strokeStyle='rgba(230,230,220,0.55)'; rx.lineWidth=0.6; rx.beginPath(); for(var q=0;q<5;q++){ rx.moveTo(nx,ny-sd*q*1.6); rx.lineTo(x2,y2-sd*q*1.6); } rx.stroke(); } } }
    else if(k<0.8){ var dy=Y(x,mid+3); if(ok(dy)) rpDam(x,dy,sd); }
    else { var hy=Y(x,SH+24); if(ok(hy)){ rpCottage(x,hy,ang,'#a8302a'); rx.fillStyle='rgba(20,30,40,0.6)'; rx.fillRect(x-9,hy-sd*14,18,-sd*2); placed.push([x,hy,26]); } } return; }
  if(r()>0.6) return;   // the fjords
  if(k<0.22){ var qx0=x-34, qx1=x+34, qy=Y(x,SH+30); if(!ok(qy)||!ok(Y(x,RP_EDGE+4))) return; rx.save(); rx.beginPath(); for(var t=qx0;t<=qx1;t+=4) rx.lineTo(t,Y(t,RP_EDGE+4)); for(t=qx1;t>=qx0;t-=4) rx.lineTo(t,Y(t,SH+30)); rx.closePath(); rpSw(8,4,5,0.5); rx.fillStyle='#7a7e88'; rx.fill(); rpNos(); rx.clip();
      for(t=qx0;t<qx1;t+=9) for(var rr=-2;rr<SH+34;rr+=6){ rx.fillStyle=((t/9+rr/6)|0)%2?'#8a8e98':'#6a6e78'; rx.fillRect(t+((rr/6|0)%2)*4,Y(t,RP_EDGE+4+rr)-(sd<0?5.4:0),8.4,5.4); } rx.restore();
      rpLongship(x,Y(x,mid),ang); placed.push([x,qy,30]); }
  else if(k<0.45){ var ny2=Y(x,SH+22); if(ok(ny2)&&ok(Y(x,SH+56))){ rpNaust(x,ny2,sd); if(r()<0.5) rpNaust(x+36,Y(x+36,SH+22),sd); placed.push([x+18,Y(x,SH+40),34]); } }
  else if(k<0.6){ var ly=Y(x,SH+22); if(ok(ly)){ rpLighthouse(x,ly,sd); placed.push([x,ly,24]); } }
  else if(k<0.8){ var ky=Y(x,mid); if(ok(ky)) rpSkerry(x,ky,7); }
  else { for(var f2=0;f2<2;f2++){ var fx2=x+f2*30, fy2=Y(fx2,mid+(r()-0.5)*6); if(ok(fy2)) rpFloe(fx2,fy2,6+r()*2); } } }
/* the land's things: the zone's set (in a blend, each thing from either zone by its place), the big ones first, none over another */
function rpScatter(r,road,z,x0L,WL,HL,placed){ var list=[], i, nA=RP_N[RP_Z[z.a]], nB=RP_N[RP_Z[z.b]], n=Math.round(nA+(nB-nA)*(z.t0+z.t1)/2);
  for(i=0;i<n;i++){ var px=r()*WL, zt=z.t0+(z.t1-z.t0)*px/WL, set=RP_SET[RP_Z[r()<zt?z.b:z.a]], tot=0, k; set.forEach(function(it){ tot+=it[3]; }); var w=r()*tot; for(k=0;k<set.length-1&&(w-=set[k][3])>0;k++); var it=set[k]; list.push({it:it,s:it[2][0]+r()*(it[2][1]-it[2][0]),x:px}); }
  list.sort(function(a,b){ return b.it[1]*b.s-a.it[1]*a.s; });
  list.forEach(function(o){ var rad=o.it[1]*Math.max(0.5,o.s); for(var t=0;t<20;t++){ var px=t?rad+r()*(WL-2*rad):Math.max(rad,Math.min(WL-rad,o.x)), py=44+r()*(HL-48), a=rpAt(road,px);
      if(Math.abs(py-a[0])<a[1]+RP_SH+10+rad*0.7) continue; if(placed.some(function(q){ var dx=q[0]-px, dy=q[1]-py; return dx*dx+dy*dy<(q[2]+rad)*(q[2]+rad)*0.75; })) continue;
      placed.push([px,py,rad]); o.it[0](px,py,o.s,r); break; } }); }
/* a bridge over the river, drawn over the boats (the chunk's own top layer); over the channel it lets them show through */
function rpBridge(road,x,stone){ var a=rpAt(road,x), ang=Math.atan2(rpAt(road,x+3)[0]-rpAt(road,x-3)[0],6), L=a[1]+RP_SH+22, deck=stone?'#8a8e98':'#a8784a', rail=stone?'#5a5e66':'#6a4424', k;
  rx.save(); rx.translate(x,a[0]); rx.rotate(ang); rpSw(18,8,12,0.55); rx.fillStyle=deck; rx.fillRect(-12,-L,24,2*L); rpNos();
  if(!stone){ rx.fillStyle='rgba(40,24,10,0.5)'; for(k=-L;k<L;k+=3.4) rx.fillRect(-12,k,24,0.6); } else { rx.strokeStyle='rgba(40,40,46,0.35)'; rx.lineWidth=0.7; rx.beginPath(); for(k=-L;k<L;k+=6){ rx.moveTo(-12,k); rx.lineTo(12,k); } rx.stroke(); }
  rx.fillStyle=rail; rx.fillRect(-13,-L,2.6,2*L); rx.fillRect(10.4,-L,2.6,2*L); rx.restore(); }
function rpOverlay(road,x,stone){ var KS=rKS(), o=hdOff(RCW*K+3,LH,hs), keep=rx; rx=o.x; rx.setTransform(hs*KS,0,0,hs*KS,0,0); rx.scale(0.5,0.5); rpBridge(road,x,stone);
  rpRiver(road,RP_EDGE,0,0); rx.setTransform(1,0,0,1,0,0); rx.globalCompositeOperation='destination-out';   // see-through over the channel: the boats, the gifts and the whirls under it stay in sight
  if(RPX){ var p=document.createElement('canvas'); p.width=p.height=2; var px=p.getContext('2d'); px.fillStyle='#000'; px.fillRect(0,0,1,1); px.fillRect(1,1,1,1); rx.fillStyle=rx.createPattern(p,'repeat'); } else rx.fillStyle='rgba(0,0,0,0.45)';
  rx.fill(); rx.globalCompositeOperation='source-over'; if(RPX) pxHard(o.c,false); rx=keep; return o.c; }
function rpBridgeAt(i){ return rHash(RC.seed,i*13+5)/4294967296<0.08; }
/* one chunk of the pirate world (as rChunk in 48_racehd.js; W, H in sketch px) */
function pirateChunk(rg,i,W,H){ var r=rR(rHash(RC.seed,i)+11), road=rChunkRoad(rg,i), z=rpZone(i), WL=W*2, HL=H*2, x0L=i*W*2, placed=[], tm=(z.t0+z.t1)/2, zn=RP_Z[r()<tm?z.b:z.a], over=null;
  RP.ds=hs*rKS()/2; rx.save(); rx.scale(0.5,0.5);
  rpGroundAll(road,z,x0L,WL,HL,r);
  if(zn==='fj'&&r()<0.18){ var wx=40+r()*(WL-80), wa=rpAt(road,wx), wy=wa[0]-wa[1]-RP_SH-RP_LOOK.fj.bw-4; if(wy-50>44){ rpWaterfall(wx,wy); placed.push([wx,wy-25,24]); } }
  rpInfra(zn,r,road,x0L,WL,HL,placed);
  rpScatter(r,road,z,x0L,WL,HL,placed);
  rx.restore();
  if(i>3&&!z.t1&&rpBridgeAt(i)&&!rpBridgeAt(i-1)) over=rpOverlay(road,WL/2,zn==='fj');   // a bridge now and then, never two in a row
  return over; }

/* ── the boats (logical px around the boat's point, the bow to +x): ours and the six rivals ── */
function rpHull(L,B,sh){ sh=sh||0.9; rx.beginPath(); rx.moveTo(L,0); rx.bezierCurveTo(L*0.7,-B*sh,L*0.1,-B,-L*0.6,-B); rx.quadraticCurveTo(-L,-B,-L,-B*0.7); rx.lineTo(-L,B*0.7); rx.quadraticCurveTo(-L,B,-L*0.6,B); rx.bezierCurveTo(L*0.1,B,L*0.7,B*sh,L,0); rx.closePath(); }
function rpSkull(x,y,s,col,bg){ rx.save(); rx.translate(x,y); rx.scale(s,s); rx.fillStyle=col; rx.strokeStyle=col; rx.lineWidth=0.9; rx.lineCap='round';
  rx.beginPath(); rx.moveTo(-3.2,2.6); rx.lineTo(3.2,-2.6); rx.moveTo(-3.2,-2.6); rx.lineTo(3.2,2.6); rx.stroke(); rx.beginPath(); rx.arc(0,-0.5,2.1,0,6.2832); rx.fill(); rx.fillRect(-1.2,0.6,2.4,1.5); rpDisc(-0.75,-0.55,0.6,bg); rpDisc(0.75,-0.55,0.6,bg); rx.restore(); }
function rpFlag(x,y,w,h,col,ph){ var i, t; rx.save(); rpBs(2,1.5,2,0.35); rx.fillStyle=col; rx.beginPath(); rx.moveTo(x,y-0.6); for(i=0;i<=8;i++){ t=i/8; rx.lineTo(x-w*t,y-0.6-h*0.5+Math.sin(t*6+ph)*1.2*t); } for(i=8;i>=0;i--){ t=i/8; rx.lineTo(x-w*t,y+h*0.5+Math.sin(t*6+ph)*1.2*t); } rx.closePath(); rx.fill(); rpNos();
  rx.fillStyle='rgba(255,255,255,0.12)'; rx.fillRect(x-w,y-h*0.5,w,h*0.3); rpSkull(x-w*0.5,y,0.62,'#f4f0e6',col); rpDisc(x,y,1.1,'#c9a040'); rx.restore(); }
function rpMotor(x,y,col){ rx.fillStyle='#1a1c22'; rx.fillRect(x-7,y-3,8,6); rx.fillStyle=rpLg(x-6,y-3,x-6,y+3,[col,'#8a90a0',col]); rx.beginPath(); rx.roundRect(x-8,y-3.4,7,6.8,2); rx.fill(); rx.fillStyle='rgba(255,255,255,0.35)'; rx.fillRect(x-7,y-2.6,4,1); }
function rpPlanks(x0,x1,y0,y1,c0,c1,n){ rx.fillStyle=c0; rx.fillRect(x0,y0,x1-x0,y1-y0); rx.strokeStyle=c1; rx.lineWidth=0.35; rx.beginPath(); for(var i=1;i<n;i++){ var y=y0+(y1-y0)*i/n; rx.moveTo(x0,y); rx.lineTo(x1,y); } rx.stroke(); }
function rpCockpit(x,w,seat,frame){ var sw=(w-5)/2; rx.fillStyle='#1c1c22'; rx.beginPath(); rx.roundRect(x-w,-5.5,w,11,3); rx.fill(); rx.fillStyle=seat; rx.beginPath(); rx.roundRect(x-w+2,-4.5,sw,9,1.5); rx.fill(); rx.beginPath(); rx.roundRect(x-w+3+sw,-4.5,sw,9,1.5); rx.fill();
  rx.fillStyle=rpLg(x+1,-5,x+5,5,['rgba(190,235,255,0.95)','rgba(90,150,190,0.9)']); rx.beginPath(); rx.moveTo(x,-6); rx.quadraticCurveTo(x+5,0,x,6); rx.lineTo(x+2,6); rx.quadraticCurveTo(x+7.5,0,x+2,-6); rx.fill();
  if(frame){ rx.strokeStyle=frame; rx.lineWidth=0.6; rx.beginPath(); rx.moveTo(x+2,-6); rx.quadraticCurveTo(x+7.5,0,x+2,6); rx.stroke(); } }
function rpOurs(){ var L=20, B=8.5; rpBs(6,3,4,0.45); rx.fillStyle='#9a1c16'; rpHull(L,B); rx.fill(); rpNos(); rx.fillStyle=rpLg(0,-B,0,B,['#f04a3e','#b0201a','#f04a3e']); rpHull(L-0.8,B-0.8); rx.fill();
  rx.save(); rpHull(L-2,B-2); rx.clip(); rx.fillStyle='#d8302a'; rx.fillRect(-L,-B,2*L,2*B); rx.fillStyle='#fff'; rx.fillRect(-L,-1.3,2*L,2.6); rx.save(); rx.beginPath(); rx.rect(4.5,-B,L,2*B); rx.clip(); rpPlanks(4.5,L,-B,B,'#d8b07a','#9a7040',7); rx.restore(); rx.fillStyle='rgba(0,0,0,0.1)'; rx.fillRect(-L,0,2*L,B); rx.restore();
  rx.strokeStyle='#d4a838'; rx.lineWidth=0.7; rpHull(L-1.6,B-1.6); rx.stroke(); rpCockpit(1,13,'#2a2a30','#fff'); rpMotor(-L,0,'#1a1c22'); rpFlag(-14,4.5,10,6,'#141418',0.6); rpSkull(11.8,0,1,'#141418','#d8b07a'); }
function rpRaft(){ var i; rpBs(5,3,4,0.45); for(i=0;i<5;i++){ var y=-7.2+i*3.6, l=17-(i%2)*1.5+(i===2?1:0); rx.fillStyle=rpLg(0,y-1.8,0,y+1.8,['#e6d2a6','#a08860']); rx.beginPath(); rx.roundRect(-l,y-1.75,2*l,3.5,1.75); rx.fill(); if(!i) rpNos(); rpDisc(l-1.2,y,1.2,'#e0b880'); } rpNos();
  rx.fillStyle='rgba(60,36,14,0.9)'; [-12,12].forEach(function(x){ rx.fillRect(x-0.8,-8.6,1.6,17.2); });
  rpDisc(-8,-3.6,2.5,rpRg(-8,-3.6,2.5,'#b07a40','#5a3416')); rx.fillStyle='#8a6a3a'; rx.fillRect(-11,2,5,4);
  rx.save(); rpBs(5,4,5,0.4); rx.fillStyle='#efe6cc'; rx.beginPath(); rx.moveTo(4,-10.5); rx.quadraticCurveTo(8.5,0,4,10.5); rx.lineTo(2.2,10.5); rx.quadraticCurveTo(6.5,0,2.2,-10.5); rx.fill(); rx.restore();
  rx.strokeStyle='#5a3a1a'; rx.lineWidth=0.7; rx.beginPath(); rx.moveTo(2.8,-11.5); rx.lineTo(2.8,11.5); rx.stroke(); rpDisc(2.8,0,1.1,'#3a2410'); rpDisc(13,4,1,'#ffd860'); }
function rpShip(){ var L=24, B=7, i; rpBs(6,3,4,0.45); rx.fillStyle='#3a2210'; rx.beginPath(); rx.moveTo(L,0); rx.bezierCurveTo(L*0.6,-B*1.1,-L*0.6,-B*1.1,-L,0); rx.bezierCurveTo(-L*0.6,B*1.1,L*0.6,B*1.1,L,0); rx.fill(); rpNos();   // the longship
  rx.fillStyle=rpLg(0,-B,0,B,['#a87038','#6a4018','#a87038']); rx.beginPath(); rx.moveTo(L-1,0); rx.bezierCurveTo(L*0.6,-B,-L*0.6,-B,-L+1,0); rx.bezierCurveTo(-L*0.6,B,L*0.6,B,L-1,0); rx.fill();
  rx.strokeStyle='rgba(60,36,14,0.6)'; rx.lineWidth=0.35; rx.beginPath(); for(i=-3;i<=3;i++){ rx.moveTo(-L*0.75,i*1.6); rx.lineTo(L*0.75,i*1.6); } rx.stroke();
  var SHC=['#2a6ab0','#f0c030','#2a6ab0','#f0f0e0','#f0c030','#2a6ab0','#f0f0e0']; for(i=0;i<7;i++){ var x=-13+i*4.2; [-1,1].forEach(function(s){ var y=s*(B*0.82-0.6*Math.abs(x)/L*B*0.6); rpDisc(x,y,1.7,SHC[(i+(s>0?2:0))%7]); rpDisc(x,y,0.55,'#5a5a60'); }); }
  rx.strokeStyle='#4a2a10'; rx.lineWidth=1.4; rx.lineCap='round'; rx.beginPath(); rx.moveTo(L-2,0); rx.quadraticCurveTo(L+3,-1.5,L+4,0.6); rx.stroke(); rpDisc(L+4.2,0.6,1.2,'#5a3416'); rpDisc(L+4.6,0.2,0.35,'#f0c030');
  rx.beginPath(); rx.moveTo(-L+2,0); rx.quadraticCurveTo(-L-2,1.5,-L-1,-1); rx.stroke();
  rx.save(); rpBs(6,5,6,0.4); rx.beginPath(); rx.moveTo(-1,-12); rx.quadraticCurveTo(4,0,-1,12); rx.lineTo(-3.4,12); rx.quadraticCurveTo(1.6,0,-3.4,-12); rx.closePath(); rx.fillStyle='#f0ead8'; rx.fill(); rpNos(); rx.clip(); rx.fillStyle='#2a6ab0'; for(i=-12;i<12;i+=4) rx.fillRect(-5,i,10,2); rx.restore();
  rx.strokeStyle='#4a2a10'; rx.lineWidth=0.7; rx.beginPath(); rx.moveTo(-2.4,-13); rx.lineTo(-2.4,13); rx.stroke(); rpDisc(-2.4,0,0.9,'#3a2410'); }
function rpCanoe(){ var L=18, B=5; rpBs(5,3,4,0.45); rx.fillStyle='#4a1a6a'; rx.beginPath(); rx.moveTo(L,0); rx.bezierCurveTo(L*0.5,-B*1.3,-L*0.5,-B*1.3,-L,0); rx.bezierCurveTo(-L*0.5,B*1.3,L*0.5,B*1.3,L,0); rx.fill(); rpNos();   // purple (the audit: a yellow one was the coins' colour)
  rx.fillStyle=rpLg(0,-B,0,B,['#a050d0','#7b2aa1','#a050d0']); rx.beginPath(); rx.moveTo(L-1,0); rx.bezierCurveTo(L*0.5,-B*1.1,-L*0.5,-B*1.1,-L+1,0); rx.bezierCurveTo(-L*0.5,B*1.1,L*0.5,B*1.1,L-1,0); rx.fill();
  rpEll(0,0,L*0.62,B*0.62,0,'#8a3ab8'); rx.fillStyle='#8a6a3a'; [-6,6].forEach(function(x){ rx.fillRect(x-0.6,-B*0.6,1.2,B*1.2); });
  [[-6,'#2a6ab0'],[6,'#3a9a64']].forEach(function(q,k){ var x=q[0]; rx.save(); rpBs(2,1.5,2,0.4); rpDisc(x,0,2.4,q[1]); rx.restore(); rpDisc(x+0.3,0,1.4,'#e8b890');
    rx.strokeStyle='#5a3a1a'; rx.lineWidth=0.7; rx.beginPath(); rx.moveTo(x-1,k?-8:8); rx.lineTo(x+1.5,k?8:-8); rx.stroke(); rpEll(x-1.1,k?-8.5:8.5,0.9,1.8,0.2,'#5a3a1a'); rpEll(x+1.6,k?8.5:-8.5,0.9,1.8,0.2,'#5a3a1a'); }); }
function rpPedalo(){ rpBs(6,3,4,0.45); rpEll(0,0,15,8.5,0,'#c8ccd4'); rpNos(); rpEll(0,0,14.2,7.8,0,rpRg(-2,-2,15,'#ffffff','#d8dce4',0,0));   // the swan pedalo
  rx.fillStyle='rgba(180,190,205,0.6)'; [-1,1].forEach(function(s){ rx.beginPath(); rx.moveTo(-12,s*2); rx.quadraticCurveTo(-4,s*9,6,s*5); rx.quadraticCurveTo(-2,s*4,-12,s*2); rx.fill(); });
  rx.fillStyle='#4a90c8'; rx.beginPath(); rx.roundRect(-8,-4,9,8,2); rx.fill(); rpDisc(-5.5,-2,1.5,'#f0a020'); rpDisc(-1.5,2,1.5,'#e04888');
  rx.save(); rpBs(4,3,4,0.4); rx.strokeStyle='#ffffff'; rx.lineWidth=3; rx.lineCap='round'; rx.beginPath(); rx.moveTo(9,0); rx.quadraticCurveTo(14,-1,16,1.5); rx.stroke(); rx.restore(); rpDisc(16.5,1.8,2,'#ffffff');
  rx.fillStyle='#f08020'; rx.beginPath(); rx.moveTo(18.2,1.4); rx.lineTo(21,2.4); rx.lineTo(18.2,3); rx.fill(); rpDisc(16.8,1,0.5,'#111'); }
function rpDinghy(){ rpBs(6,3,4,0.45); rx.fillStyle='#c85a10'; rx.beginPath(); rx.roundRect(-15,-8.5,30,17,8.5); rx.fill(); rpNos(); rx.fillStyle=rpLg(0,-8.5,0,8.5,['#ffa040','#e86a14','#ffa040']); rx.beginPath(); rx.roundRect(-14.4,-7.9,28.8,15.8,7.9); rx.fill();
  rx.fillStyle='#3a3e46'; rx.beginPath(); rx.roundRect(-11,-4.4,22,8.8,4.4); rx.fill(); rx.fillStyle='#4a4e58'; rx.fillRect(-1,-4.4,2,8.8);
  rx.strokeStyle='rgba(255,255,255,0.35)'; rx.lineWidth=0.6; rx.beginPath(); rx.roundRect(-13.6,-7,27.2,14,7); rx.stroke(); rx.strokeStyle='#2a2a30'; rx.lineWidth=0.4; rx.setLineDash([1,1]); rx.beginPath(); rx.roundRect(-12.8,-6.4,25.6,12.8,6.4); rx.stroke(); rx.setLineDash([]);
  [[-5,'#2a6ab0',-1],[5,'#f0c030',1]].forEach(function(q){ var x=q[0], s=q[2]; rx.save(); rpBs(2,1.5,2,0.4); rpDisc(x,0,2.3,q[1]); rx.restore(); rpDisc(x+0.3,0,1.3,'#e8b890'); rx.strokeStyle='#3a3a40'; rx.lineWidth=0.7; rx.beginPath(); rx.moveTo(x-2,s*2); rx.lineTo(x+1,s*12); rx.stroke(); rpEll(x+1.2,s*12.6,0.9,2,0.2,'#3a3a40'); }); }
function rpGalleon(){ var L=21, B=8.5, h0='#06302c', h1='#167060', h2='#0a4840', trim='#e0b440', sail='#f2ead6', sail2='#b8ae98';   // emerald, darker (the audit: the green canister)
  rpBs(7,4,5,0.5); rx.fillStyle=h0; rpHull(L,B,0.8); rx.fill(); rpNos(); rx.fillStyle=rpLg(0,-B,0,B,[h1,h2,h1]); rpHull(L-0.6,B-0.6,0.8); rx.fill();
  rx.save(); rpHull(L-3,B-3,0.8); rx.clip(); rpPlanks(-L,L,-B,B,'#c09a68','#806040',5); rx.fillStyle=rpLg(-L,0,-L+10,0,[h2,h1]); rx.fillRect(-L,-B,10,2*B); rx.fillStyle=rpLg(L-7,0,L,0,[h1,h2]); rx.fillRect(L-7,-B,7,2*B); rx.restore();
  rx.strokeStyle=trim; rx.lineWidth=0.8; rpHull(L-1.2,B-1.2,0.8); rx.stroke(); rx.lineWidth=0.6; rx.beginPath(); rx.moveTo(-L+10,-B+2.6); rx.lineTo(-L+10,B-2.6); rx.moveTo(L-7,-B+3); rx.lineTo(L-7,B-3); rx.stroke();
  rx.fillStyle='#14100c'; [-6,1,8].forEach(function(x){ rx.fillRect(x,-B+0.6,2,1.2); rx.fillRect(x,B-1.8,2,1.2); });
  [[-3,1],[8,0.85]].forEach(function(q){ var x=q[0], k=q[1]; rx.save(); rpBs(6,5,6,0.4); rx.beginPath(); rx.moveTo(x-1,-10.5*k); rx.quadraticCurveTo(x+5,0,x-1,10.5*k); rx.lineTo(x-3.4,10.5*k); rx.quadraticCurveTo(x+2.2,0,x-3.4,-10.5*k); rx.closePath(); rx.fillStyle=sail; rx.fill(); rpNos();
    rx.fillStyle=rpLg(x-3,0,x+3,0,[sail2,sail]); rx.fill(); rx.clip(); rx.fillStyle=h1; for(var y=-10;y<10;y+=5) rx.fillRect(x-6,y,12,2.2); rx.restore();
    rx.strokeStyle='#3a2410'; rx.lineWidth=0.7; rx.beginPath(); rx.moveTo(x-2.2,-11.5*k); rx.lineTo(x-2.2,11.5*k); rx.stroke(); });
  rpSkull(-1.2,0,0.62,'#1a1a1a',sail); rpDisc(-2.2,0,0.9,'#3a2410'); rpDisc(8.8,0,0.8,'#3a2410'); rx.strokeStyle='#3a2410'; rx.lineWidth=0.5; rx.beginPath(); rx.moveTo(L-1,0); rx.lineTo(L+6,0); rx.stroke(); rpFlag(-L+4,0,7,4.5,'#141418',1.2); }
/* the audit's sizes: every hull the cars' 18 units long, about their width (ours a little narrower, never wider than counted) */
var RP_BOATS=[[rpRaft,1.18,1.06,17,8.5],[rpShip,0.83,1.15,24,7],[rpCanoe,1.1,1.4,18,5.5],[rpPedalo,1.1,1.12,15,8.5],[rpDinghy,1.27,1.12,15,8.5],[rpGalleon,0.95,1.12,21,8.5]], RP_OURS=[rpOurs,1,1.13,20,8.5];
function rpBoat(k){ var b=k<0?RP_OURS:RP_BOATS[k]; rx.scale(b[1],b[2]); b[0](); }
/* the wakes: ours big, the rivals' small («они же медленные») */
function rpWakeBig(L,B){ var k, s, i; for(k=0;k<2;k++){ s=k?-1:1; rx.fillStyle=rpLg(-L,0,-L-46,0,['rgba(255,255,255,0.85)','rgba(255,255,255,0)']); rx.beginPath(); rx.moveTo(-L*0.2,s*B*0.9); rx.quadraticCurveTo(-L-10,s*(B+3),-L-46,s*(B+13)); rx.lineTo(-L-46,s*(B+8)); rx.quadraticCurveTo(-L-10,s*(B-1),-L*0.6,s*B*0.6); rx.fill(); }
  rx.fillStyle=rpLg(-L,0,-L-40,0,['rgba(255,255,255,0.9)','rgba(255,255,255,0)']); rx.beginPath(); rx.moveTo(-L,-B*0.7); rx.quadraticCurveTo(-L-20,-B*0.5,-L-40,-B*0.9); rx.lineTo(-L-40,B*0.9); rx.quadraticCurveTo(-L-20,B*0.5,-L,B*0.7); rx.fill();
  rx.fillStyle='rgba(255,255,255,0.55)'; for(i=0;i<14;i++){ rx.beginPath(); rx.arc(-L-3-i*3,Math.sin(i*2.7)*(B*0.5+i*0.3),1.3-i*0.06,0,6.2832); rx.fill(); }
  rx.fillStyle='rgba(255,255,255,0.7)'; [-1,1].forEach(function(s2){ rx.beginPath(); rx.moveTo(L+1,0); rx.quadraticCurveTo(L*0.6,s2*(B+2),L*0.2,s2*(B+1.5)); rx.lineTo(L*0.2,s2*(B+0.3)); rx.quadraticCurveTo(L*0.6,s2*B,L,0); rx.fill(); }); }
function rpWakeSmall(L,B){ for(var k=0;k<2;k++){ var s=k?-1:1; rx.fillStyle=rpLg(-L,0,-L-16,0,['rgba(255,255,255,0.55)','rgba(255,255,255,0)']); rx.beginPath(); rx.moveTo(-L*0.4,s*B*0.85); rx.quadraticCurveTo(-L-4,s*(B+1.5),-L-16,s*(B+5)); rx.lineTo(-L-16,s*(B+3)); rx.quadraticCurveTo(-L-4,s*(B-0.6),-L*0.7,s*B*0.55); rx.fill(); }
  rx.strokeStyle='rgba(255,255,255,0.35)'; rx.lineWidth=0.6; for(var i=1;i<=2;i++){ rx.beginPath(); rx.ellipse(-L-2-i*4,0,2+i*1.2,B*0.5+i,0,1.2,5.1); rx.stroke(); }
  rx.fillStyle='rgba(255,255,255,0.5)'; [-1,1].forEach(function(s2){ rx.beginPath(); rx.moveTo(L+0.6,0); rx.quadraticCurveTo(L*0.6,s2*(B+1),L*0.3,s2*(B+0.8)); rx.lineTo(L*0.3,s2*B); rx.quadraticCurveTo(L*0.6,s2*(B-0.3),L,0); rx.fill(); }); }
function rpWake(k){ var b=k<0?RP_OURS:RP_BOATS[k]; rx.scale(b[1],b[2]); if(k<0) rpWakeBig(b[3],b[4]); else rpWakeSmall(b[3],b[4]); }

/* ── the gifts, the whirlpool ── */
function rpRipple(r){ if(RPX) return; rx.strokeStyle='rgba(255,255,255,0.5)'; rx.lineWidth=0.8; rx.beginPath(); rx.ellipse(0,1.5,r*1.15,r*0.55+1,0,0,6.2832); rx.stroke(); rx.strokeStyle='rgba(255,255,255,0.22)'; rx.beginPath(); rx.ellipse(0,1.5,r*1.4,r*0.7+1.5,0,0,6.2832); rx.stroke(); }
function rpLetterF(x,y,s,col){ rx.save(); rx.translate(x,y); rx.scale(s,s); rx.fillStyle=col; rx.beginPath(); rx.moveTo(-1.7,4.6); rx.lineTo(-1.7,-2.6); rx.lineTo(2.5,-2.6); rx.lineTo(2.5,-1.1); rx.lineTo(-0.1,-1.1); rx.lineTo(-0.1,0.5); rx.lineTo(2,0.5); rx.lineTo(2,2); rx.lineTo(-0.1,2); rx.lineTo(-0.1,4.6); rx.closePath(); rx.fill(); rx.restore(); }
function rpCanister(){ rpRipple(10); rx.save(); rx.rotate(-0.15); rpBs(5,3,4,0.45); rx.fillStyle='#4aa82a'; rx.beginPath(); rx.roundRect(-8,-10,16,20,3); rx.fill(); rpNos(); rx.fillStyle=rpLg(-8,0,8,0,['#b4f070','#78d040','#4a9a2a']); rx.beginPath(); rx.roundRect(-8,-10,16,20,3); rx.fill();   // lime (the audit: the emerald galleon)
  rx.fillStyle='#1a1c22'; rx.beginPath(); rx.roundRect(-6,-13,6,4,1); rx.fill(); rx.fillStyle='#e0b440'; rx.fillRect(2,-12,4,2.5); rx.strokeStyle='rgba(0,0,0,0.25)'; rx.lineWidth=0.7; rx.beginPath(); rx.moveTo(-8,-10); rx.lineTo(8,10); rx.moveTo(8,-10); rx.lineTo(-8,10); rx.stroke();
  rx.fillStyle='#f4f0e6'; rx.beginPath(); rx.roundRect(-4.6,-4.6,9.2,10,2); rx.fill(); rpLetterF(0,0.2,1.3,'#3a7a1a'); rx.restore(); }
function rpCoin(){ rpBs(3,2,2.5,0.45); rpDisc(0,0,6.5,'#a87810'); rpNos(); rpDisc(0,0,6.5,rpRg(0,0,6.5,'#fff0a0','#d49a20')); rx.strokeStyle='#a87810'; rx.lineWidth=0.7; rx.beginPath(); rx.arc(0,0,5.2,0,6.2832); rx.stroke(); rpSkull(0,0.2,0.75,'#8a6008','#f0c848'); rpEll(-2.6,-3.4,1.4,0.7,-0.6,'rgba(255,255,255,0.7)'); }
function rpMagShape(){ rx.beginPath(); rx.arc(0,-1,9,Math.PI,0); rx.lineTo(9,9); rx.lineTo(3.4,9); rx.lineTo(3.4,-1); rx.arc(0,-1,3.4,0,Math.PI,true); rx.lineTo(-3.4,9); rx.lineTo(-9,9); rx.closePath(); }
function rpMagnet(){ rpRipple(10); rpBs(5,3,4,0.45); rx.fillStyle='#8a1410'; rpMagShape(); rx.fill(); rpNos(); rx.fillStyle=rpLg(-9,0,9,0,['#ff5a4a','#d8302a','#8a1410']); rpMagShape(); rx.fill();
  rx.fillStyle=rpLg(-9,0,9,0,['#ffffff','#c8ccd4','#7a808a']); rx.fillRect(-9,4.4,5.6,4.6); rx.fillRect(3.4,4.4,5.6,4.6); rx.fillStyle='rgba(255,255,255,0.45)'; rx.beginPath(); rx.arc(0,-1,7.4,3.4,4.4); rx.lineTo(-5,-1); rx.fill(); }
function rpBuoyRing(){ rpBs(5,3,4,0.45); rpDisc(0,0,11,'#c8c4b8'); rpNos(); rx.lineWidth=6; for(var k=0;k<8;k++){ rx.strokeStyle=k%2?'#f4f0e6':'#e8442a'; rx.beginPath(); rx.arc(0,0,8,k*0.785,(k+1)*0.785); rx.stroke(); }   // the lifebuoy: the shield
  rx.strokeStyle='rgba(255,255,255,0.5)'; rx.lineWidth=0.8; rx.beginPath(); rx.arc(0,0,10,3.5,4.8); rx.stroke(); rx.strokeStyle='#e0d8c0'; rx.setLineDash([2,2]); rx.beginPath(); rx.arc(0,0,11.2,0,6.2832); rx.stroke(); rx.setLineDash([]); rpDisc(0,0,5,'rgba(30,90,140,0.25)'); }
function rpWheel(){ rpBs(5,3,4,0.5); rpDisc(0,0,10,'#8a6010'); rpNos(); rx.strokeStyle='#e0b440'; rx.lineWidth=2; rx.beginPath(); rx.arc(0,0,8,0,6.2832); rx.stroke(); rx.lineWidth=1.6; rx.beginPath();   // the super gift: the golden ship's wheel
  for(var k=0;k<8;k++){ var a=k*0.785; rx.moveTo(Math.cos(a)*2,Math.sin(a)*2); rx.lineTo(Math.cos(a)*11,Math.sin(a)*11); } rx.stroke(); for(k=0;k<8;k++){ var b=k*0.785; rpDisc(Math.cos(b)*11.4,Math.sin(b)*11.4,1.5,'#f0c848'); }
  rpDisc(0,0,3.6,rpRg(0,0,3.6,'#fff0a0','#c88a18')); rx.strokeStyle='#fff4c0'; rx.lineWidth=0.6; rx.beginPath(); rx.arc(0,0,8.6,3.5,4.7); rx.stroke(); }
function rpWhirl(){ var g=rx.createRadialGradient(0,0,1,0,0,16); g.addColorStop(0,'rgba(0,20,50,0.75)'); g.addColorStop(0.7,'rgba(0,40,80,0.35)'); g.addColorStop(1,'rgba(0,40,80,0)'); rx.fillStyle=g; rx.beginPath(); rx.ellipse(0,0,22,11,0,0,6.2832); rx.fill();
  for(var k=0;k<4;k++){ rx.strokeStyle='rgba(170,226,255,'+(0.95-k*0.15)+')'; rx.lineWidth=2-k*0.3; rx.lineCap='round'; rx.beginPath(); for(var a=0;a<4.4;a+=0.1){ var r=2.5+k*3.2+a*0.6; rx.lineTo(Math.cos(a+k*1.6)*r*1.5,Math.sin(a+k*1.6)*r*0.75); } rx.stroke(); } }   // light blue (the audit: white was the swan's and the lifebuoy's)
/* the sprites (w, h in sketch px; drawn at half: logical px); the gifts the audit's sizes — the notebook's, which were checked on phones */
var RP_GIFT={fuel:[22,24,1.4,rpCanister],coin:[14,14,1.4,rpCoin],magnet:[20,20,1.3,rpMagnet],bubble:[18,18,1.3,rpBuoyRing],tmagnet:[24,24,1.5,rpWheel],tbubble:[24,24,1.5,rpWheel]};
function rpDraw(f){ return function(){ RP.ds=hs*rKS()/2; rx.scale(0.5,0.5); f(); }; }
function rpGiftSprite(t){ var g=RP_GIFT[t]||RP_GIFT.coin; return rSprite('pg'+t,g[0],g[1],rpDraw(function(){ rx.scale(g[2],g[2]); g[3](); })); }
function rpBoatSprite(k,a){ var key=k<0?'p':'pc'+k, d=rpDraw(function(){ rpBoat(k); }); return RPX?rTurned(key,32,24,a||0,d):rSprite(key,32,24,d); }
/* the wakes and the whirls: no outline in pixels, their see-through parts dithered */
function rpDither(c){ var x=c.getContext('2d'), W=c.width, H=c.height; if(!W||!H) return; var im=x.getImageData(0,0,W,H), d=im.data, P=rPalList();
  for(var j=0;j<H;j++) for(var i=0;i<W;i++){ var o=(j*W+i)*4, a=d[o+3]; if(a>=150||(a>=60&&((i+j)&1)===0)){ var q=P[rPalNear(d[o],d[o+1],d[o+2])]; d[o]=q[0]; d[o+1]=q[1]; d[o+2]=q[2]; d[o+3]=255; } else d[o+3]=0; }
  x.putImageData(im,0,0); }
function rpSoftSprite(key,w,h,draw){ var s=RC.sp[key]; if(s) return s; var KS=rKS(); if(RPX){ w=Math.ceil(w*KS/2)*2/KS; h=Math.ceil(h*KS/2)*2/KS; }
  var o=hdOff(w*KS,h*KS,hs); rx=o.x; rx.setTransform(hs*KS,0,0,hs*KS,0,0); rx.translate(w/2,h/2); draw();
  if(RPX){ rpDither(o.c); return RC.sp[key]={c:o.c,w:o.c.width,h:o.c.height}; } return RC.sp[key]={c:o.c,w:w*KS,h:h*KS}; }
function rpWakeSprite(k){ return k<0?rpSoftSprite('pw',70,26,rpDraw(function(){ rpWake(-1); })):rpSoftSprite('pw'+k,46,20,rpDraw(function(){ rpWake(k); })); }
function rpWhirlSprite(rr){ return rpSoftSprite('pwh'+rr,rr*3*SU,rr*1.8*SU,rpDraw(function(){ rx.scale(rr/7.5,rr/7.5); rpWhirl(); })); }
/* the super gift: a golden glow, the wheel turning */
function rpSuper(s,X,Y,t,id){ var u=K/SU, bob=Math.sin(t*3+id)*0.8*K;
  if(RPX){ var R0=Math.round((13+Math.sin(t*6))*u), x=Math.round(X), y=Math.round(Y+bob); hx.fillStyle='#f0c848'; for(var j=-R0;j<=R0;j++) for(var i=-R0;i<=R0;i++){ var d2=i*i+j*j; if(d2<=R0*R0&&d2>=(R0-4)*(R0-4)&&((i+j+Math.floor(t*6))&1)===0) hx.fillRect(x+i,y+j,1,1); } rBlit(s,x,y,0); return; }
  var gr=hx.createRadialGradient(X,Y+bob,2*u,X,Y+bob,17*u); gr.addColorStop(0,'rgba(255,236,120,0.9)'); gr.addColorStop(0.5,'rgba(255,200,40,'+(0.4+0.2*Math.sin(t*6))+')'); gr.addColorStop(1,'rgba(255,200,40,0)'); hx.fillStyle=gr; hx.beginPath(); hx.arc(X,Y+bob,17*u,0,6.2832); hx.fill();
  hx.save(); hx.translate(X,Y+bob); hx.rotate(t*1.2); hx.drawImage(s.c,-s.w/2,-s.h/2,s.w,s.h); hx.restore(); }

/* ── our boat in the race: the wake, the whirl under it, the magnet's red waves, the turbo's foam whiskers, the water bubble ── */
function rpBlitK(sp,X,Y,a){ if(rCarK===1){ rBlit(sp,X,Y,a); return; } hx.save(); hx.translate(X,Y); hx.rotate(a); hx.drawImage(sp.c,-sp.w*rCarK/2,-sp.h*rCarK/2,sp.w*rCarK,sp.h*rCarK); hx.restore(); }
function rpTurbo(u,t){ var k, i; hx.fillStyle='rgba(255,255,255,0.85)'; for(k=0;k<2;k++){ var s=k?-1:1; hx.beginPath(); hx.moveTo(16*u,s*4*u); hx.quadraticCurveTo(6*u,s*16*u,-6*u,s*20*u); hx.quadraticCurveTo(4*u,s*13*u,10*u,s*6*u); hx.fill();
    for(i=0;i<6;i++){ var ph=(t*5+i/6)%1; hx.globalAlpha=0.8*(1-ph); hx.beginPath(); hx.arc((-6-ph*16)*u,s*(19+ph*7)*u,(1.2-ph*0.5)*u,0,6.2832); hx.fill(); } hx.globalAlpha=1; }
  hx.strokeStyle='rgba(255,230,120,0.95)'; hx.lineWidth=1.3*u; hx.lineCap='round'; [[-30,-6],[-34,0],[-30,6]].forEach(function(q,j){ var jx=((t*9+j*0.37)%1)*6; hx.beginPath(); hx.moveTo((q[0]-jx)*u,q[1]*u); hx.lineTo((q[0]-14-jx)*u,q[1]*1.4*u); hx.stroke(); }); }
function rpBubble(X,Y,u,a){ hx.save(); hx.translate(X,Y); hx.rotate(a); var g=hx.createRadialGradient(-6*u,-6*u,2*u,0,0,28*u); g.addColorStop(0,'rgba(255,255,255,0.35)'); g.addColorStop(0.6,'rgba(150,220,255,0.18)'); g.addColorStop(0.95,'rgba(120,210,255,0.5)'); g.addColorStop(1,'rgba(255,255,255,0.9)');
  hx.fillStyle=g; hx.beginPath(); hx.ellipse(0,0,28*u,19*u,0,0,6.2832); hx.fill(); hx.fillStyle='rgba(255,255,255,0.75)'; hx.beginPath(); hx.ellipse(-12*u,-11*u,6*u,2*u,-0.4,0,6.2832); hx.fill();
  var b=rpGiftSprite('bubble'); hx.drawImage(b.c,19*u-b.w*0.3,-12*u-b.h*0.3,b.w*0.6,b.h*0.6); hx.restore(); }
function rpPlayer(rg,s,X,Y,blink){ var u=K/SU*rCarK/2, t=clock, a=rTilt, sy=s.syrup>0?Math.min(1,s.syrup/0.3):0, m;
  if(sy) a+=0.35*sy*Math.sin(t*9);   // in a whirlpool the boat turns about (the sketch «воронка под катером, катер развёрнут»)
  if(RPX){ rpPlayerPx(rg,s,X,Y,blink,u,a,sy); return; }
  if(sy){ hx.globalAlpha=sy; var w=rpWhirlSprite(5); hx.save(); hx.translate(X,Y); hx.rotate(t*2); hx.drawImage(w.c,-w.w/2,-w.h/2,w.w,w.h); hx.restore(); hx.globalAlpha=1; }
  rpBlitK(rpWakeSprite(-1),X,Y,a);
  if(s.magnet>0&&(s.magnet>2||Math.floor(t*8)%2)) for(m=0;m<3;m++){ var ph=(m/3+t*1.4)%1; hx.strokeStyle='rgba(232,68,58,'+(0.7*(1-ph)).toFixed(3)+')'; hx.lineWidth=1.2*u; hx.beginPath(); hx.ellipse(X,Y,(20+ph*26)*u,(13+ph*17)*u,a,0,6.2832); hx.stroke(); }
  if(!blink){ if(s.turbo>0){ hx.save(); hx.translate(X,Y); hx.rotate(a); rpTurbo(u,t); hx.restore(); } rpBlitK(rpBoatSprite(-1),X,Y,a); }
  if(s.bubble>0&&(s.bubble>3||Math.floor(t*8)%2)) rpBubble(X,Y,u,a); }
function pxEll(x,y,ax,ay,col,dash){ hx.fillStyle=col; var n=Math.max(16,Math.round((ax+ay)*3.5)), seen={}; for(var i=0;i<n;i++){ if(dash&&(i%4)>1) continue; var a=i/n*6.2832, px=Math.round(x+Math.cos(a)*ax), py=Math.round(y+Math.sin(a)*ay), k=px+','+py; if(seen[k]) continue; seen[k]=1; hx.fillRect(px,py,1,1); } }
function rpPlayerPx(rg,s,X,Y,blink,u,a,sy){ var x=Math.round(X), y=Math.round(Y), t=clock, m, i;
  if(sy) rBlit(rpWhirlSprite(5),x,y,0);
  var wk=rpWakeSprite(-1); if(rCarK!==1) hx.drawImage(wk.c,Math.round(x-wk.w*rCarK/2),Math.round(y-wk.h*rCarK/2),wk.w*rCarK,wk.h*rCarK); else rBlit(wk,x,y,0);
  if(s.magnet>0&&(s.magnet>2||Math.floor(t*8)%2)) for(m=0;m<3;m++){ var ph=(m/3+t*1.4)%1; if(ph<0.8) pxEll(x,y,(20+ph*26)*u,(13+ph*17)*u,'#e8442a',true); }
  if(!blink){ if(s.turbo>0){ hx.fillStyle='#ffffff'; [-1,1].forEach(function(sd){ for(i=0;i<=10;i++){ var q=i/10, px=16-22*q, py=sd*(4+16*q*q); hx.fillRect(Math.round(x+px*u),Math.round(y+py*u),1,1); } });
      hx.fillStyle='#f0c848'; [[-30,-6],[-34,0],[-30,6]].forEach(function(q,j){ var jx=((t*9+j*0.37)%1)*6, x0=Math.round(x+(q[0]-14-jx)*u), x1=Math.round(x+(q[0]-jx)*u); hx.fillRect(x0,Math.round(y+q[1]*u),Math.max(1,x1-x0),1); }); }
    var cs=rpBoatSprite(-1,a); if(rCarK!==1) hx.drawImage(cs.c,Math.round(x-cs.w*rCarK/2),Math.round(y-cs.h*rCarK/2),cs.w*rCarK,cs.h*rCarK); else rBlit(cs,x,y,0); }
  if(s.bubble>0&&(s.bubble>3||Math.floor(t*8)%2)){ pxEll(x,y,28*u,19*u,'#cbdfe7'); pxEll(x,y,28*u-1,19*u-1,'#5ab6c4'); hx.fillStyle='#ffffff'; hx.fillRect(Math.round(x-14*u),Math.round(y-12*u),Math.max(2,Math.round(8*u)),1); } }
/* the colours of the sparks (49_main.js): splashes, gold, lime */
var RP_BURST={crash:['#ffffff','#cfefff','#8fd8ff','#ffffff'],coin:['#ffffff','#ffe066','#f0c848'],fuel:['#ffffff','#b4f070','#78d040'],magnet:['#ffffff','#e8442a','#ffd23f'],bubble:['#ffffff','#aee6ff','#e8442a'],tmagnet:['#ffffff','#ffd23f','#f0c848'],tbubble:['#ffffff','#ffd23f','#aee6ff']};
