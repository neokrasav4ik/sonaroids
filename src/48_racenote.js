/* ── SONARACE: THE NOTEBOOK (v1.00; the maintainer's picks from the sketches, 30 Sep: «тетрадка — карандаш + маркер», the road shaded with a
   pencil and a yellow highlighter along its edges; «деревья и солнце — из фломастера», «добавь разнообразие мира вокруг — немного»; our car
   «ракетомобиль с полосками как у спорткара» (white stripes); fuel — the petrol pump with an F; coins — stars; the magnet; a knight's shield;
   the super gift — the sun with the magnet; the hazard — an ink blot; the rivals — a truck, a bus, a beetle and cars). Drawn in the sketches'
   pixels (CSS pixels at 844×390, two of them to a sketch pixel of 48_racehd.js), so the sizes are the candy land's: what is drawn and what
   the game counts agree. ── */
var RN_INK='#23264a';
/* v1.02: the paper's look (kept for the layout checks' hook; v1.23 the paper itself is «В») */
var RN_LOOK={paper:'#fdfcf6',grid:'rgba(120,160,205,0.42)',base:0.2,h1:0.36,h2:0.2,doodle:1};
function nFt(col,w){ rx.strokeStyle=col; rx.lineWidth=w||3; rx.lineCap='round'; rx.lineJoin='round'; }
/* ── v1.23, THE NOTEBOOK REDRAWN (the maintainer: «не хватает остро детализации как миру, так и объектам всем»; step by step from the
   sketches): the paper «В» — warm, its grid printed a little unevenly, grain and fibres, the other side's writing showing through; three
   zones one after another, each some 20–30 seconds at any speed («зоны должны меняться не каждую минуту, а каждые 20–30 секунд»):
   mathematics (graphs, figures, formulas, a grade; the road in pencil-shaded cells), geography (a contour map: mountains, a river, a lake, a
   compass; the road in pencil with the yellow highlighter), the margins' doodles (a cube, a spiral, faces, noughts and crosses, sea battle;
   the road ruled in pen); between them the notebook's spiral binding («пружина — ок»). Every label in Latin, in the phone's own handwriting
   font («можно для всех латиницу»). Drawn in L units (half a sketch pixel: the sketches' CSS pixels), as the river and the candy land. ── */
var RN={tiles:{}}, RN_ZK=['math','geo','doo'];
var RN_BLUE='#1f3fa8', RN_DARK='#2a2a3a', RN_RED='#d8283a', RN_GRN='#2f8a4a', RN_HAND='"Bradley Hand","Segoe Print","Chalkboard SE","Comic Sans MS","Dancing Script",cursive';
function nW(w){ return RPX?Math.max(1.3,w*1.5):w; }   // pixels: thin pen lines kept whole
function nInk(c,w){ rx.strokeStyle=c; rx.lineWidth=nW(w); rx.lineCap='round'; rx.lineJoin='round'; }
function nLine(pts,c,w,r,j){ nInk(c,w); rx.beginPath(); for(var i=0;i<pts.length;i++){ var q=j===0?0:(j||0.35), X=pts[i][0]+(r()-0.5)*q, Y=pts[i][1]+(r()-0.5)*q; if(i) rx.lineTo(X,Y); else rx.moveTo(X,Y); } rx.stroke(); }
function nCirc(X,Y,rad,c,w,r,fill){ nInk(c,w); rx.beginPath(); var a0=r()*6.28; for(var i=0;i<=42;i++){ var a=a0+i/40*6.2832, q=rad*(1+(r()-0.5)*0.03)+(i>40?0.6:0); rx.lineTo(X+Math.cos(a)*q,Y+Math.sin(a)*q); } if(fill){ rx.fillStyle=fill; rx.fill(); } rx.stroke(); }
function nHatch(path,ang,step,c,w){ rx.save(); path(); rx.clip(); nInk(c,w||0.5); for(var k=-200;k<200;k+=step){ rx.beginPath(); rx.moveTo(k,-200); rx.lineTo(k+Math.tan(ang)*400,200); rx.stroke(); } rx.restore(); }
function nTxt(s,X,Y,size,c,rot){ rx.save(); rx.translate(X,Y); if(rot) rx.rotate(rot); rx.font=size+'px '+RN_HAND; rx.fillStyle=c; rx.textBaseline='alphabetic'; rx.fillText(s,0,0); rx.restore(); }
function nArrow(x0,y0,x1,y1,c,w,r){ nLine([[x0,y0],[x1,y1]],c,w,r,0.2); var a=Math.atan2(y1-y0,x1-x0); nLine([[x1-Math.cos(a-0.45)*5,y1-Math.sin(a-0.45)*5],[x1,y1],[x1-Math.cos(a+0.45)*5,y1-Math.sin(a+0.45)*5]],c,w,r,0.1); }
function nStar5(X,Y,rad,c,w,fill){ nInk(c,w); rx.beginPath(); for(var k=0;k<11;k++){ var a=-1.5708+k*0.6283, q=k%2?rad*0.42:rad; rx.lineTo(X+Math.cos(a)*q,Y+Math.sin(a)*q); } rx.closePath(); if(fill){ rx.fillStyle=fill; rx.fill(); } rx.stroke(); }
/* the paper's tile: grain and fibres, periodic (RP.T L px), at the screen's own resolution */
function nTile(){ var res=cwRes(), t=RN.tiles[res]; if(t) return t; var T=RP.T, N=T*res, cv=document.createElement('canvas'); cv.width=cv.height=N; var c=cv.getContext('2d'), r=rR(4242), i, k;
  c.fillStyle=RN_LOOK.paper; c.fillRect(0,0,N,N);
  for(i=0;i<T*T*0.5;i++){ var a=r(); c.fillStyle=a<0.5?'rgba(120,110,90,'+(0.05+r()*0.07)+')':'rgba(255,255,255,'+(0.4+r()*0.4)+')'; var z=1+Math.floor(r()*2); c.fillRect(Math.floor(r()*N),Math.floor(r()*N),z,z); }
  c.lineWidth=0.35*res; for(i=0;i<27;i++){ var X=r()*N, Y=r()*N, an=r()*6.28, L=(3+r()*9)*res, col='rgba('+(r()<0.2?'120,150,200':'150,135,110')+','+(0.10+r()*0.12)+')', b1=r()*2-1, b2=r()*2-1;
    for(k=0;k<4;k++){ var ox=(k&1)?-N:0, oy=(k&2)?-N:0; if(!k) ox=oy=0; c.strokeStyle=col; c.beginPath(); c.moveTo(X+ox,Y+oy); c.quadraticCurveTo(X+ox+Math.cos(an)*L*0.5+b1*res,Y+oy+Math.sin(an)*L*0.5+b2*res,X+ox+Math.cos(an)*L,Y+oy+Math.sin(an)*L); c.stroke(); } }
  return RN.tiles[res]={c:cv,res:res}; }
function nWarm(){ if(!RN.tiles[cwRes()]) nTile(); }
/* the zones: the chunk each starts at, so that each lasts 20–30 s at the race's top speed */
function nZones(rg){ if(RC.zones&&RC.zones.note) return RC.zones; var k=(rg.opt&&rg.opt.speed)||1, d=0, t=0, z=[], next=0, h=rR(rHash(RC.seed,99));
  next=20+h()*10; z.push(-1e9); while(z.length<60){ var v=Race.vmax(t)*k; d+=v*0.1; t+=0.1; if(t>=next){ z.push(Math.round(d/RCW)); next+=20+h()*10; } }
  z.note=1; RC.zones=z; return z; }
function nZoneOf(rg,i){ var z=nZones(rg), k=0; while(k+1<z.length&&i>=z[k+1]) k++; return {k:k,first:k>0&&i===z[k],at:k?z[k]:0}; }
/* the paper: the tile, the printed grid (each line its own strength, to the world), the other side's writing */
function nPaper(x0L,WL,HL,r){ rpPat(nTile(),x0L,WL,HL); var st=16, k, X, Y, a;
  for(k=Math.floor(x0L/st);k*st<x0L+WL+st;k++){ X=k*st-x0L; a=1-0.35*(rHash(k,13)/4294967296); rx.globalAlpha=a; nInk(RN_LOOK.grid,0.64); rx.beginPath(); rx.moveTo(X,-4); rx.lineTo(X,HL+4); rx.stroke(); }
  for(k=0;k*st<HL+st;k++){ Y=k*st; a=1-0.35*(rHash(k,17)/4294967296); rx.globalAlpha=a; nInk(RN_LOOK.grid,0.64); rx.beginPath(); rx.moveTo(-4,Y); rx.lineTo(WL+4,Y); rx.stroke(); } rx.globalAlpha=1;
  for(k=0;k<6;k++){ var vert=r()<0.5, p=Math.floor(r()*30)*st, s0=r()*(vert?HL:WL), L=20+r()*50; rx.globalAlpha=0.35; nInk(RN_LOOK.grid,1); rx.beginPath(); if(vert){ X=(Math.ceil(x0L/st)+Math.floor(r()*16))*st-x0L; rx.moveTo(X,s0); rx.lineTo(X,s0+L); } else { Y=Math.floor(r()*HL/st)*st; rx.moveTo(s0,Y); rx.lineTo(s0+L,Y); } rx.stroke(); } rx.globalAlpha=1;
  if(!RPX){ rx.save(); rx.globalAlpha=0.075; nInk('#1f3fa8',0.9); for(k=1;k<12;k++){ if(r()<0.35) continue; Y=k*24+5; X=8+r()*20; while(X<WL-40){ var wl=14+r()*40; if(X+wl>WL-8) break; rx.beginPath(); for(var q=0;q<wl;q+=0.6) rx.lineTo(X+q+Math.sin(q*1.9)*1.6,Y+Math.sin(q*1.3+X)*2.4*Math.sin(q*0.45)); rx.stroke(); X+=wl+6+r()*10; } } rx.restore(); } }
/* along the road at an offset (L units): a path, its wobble kept to the world */
function nAlong(road,off,x0L,wob){ var n=road.m.length, k, px; rx.beginPath(); for(k=0;k<n;k++){ px=(-4+k*2)*2; var w=wob?Math.sin((x0L+px)*0.055+off)*wob:0; rx.lineTo(px,road.m[k]*2+off+w); } }
function nAlongW(road,sd,off,x0L,wob){ var n=road.m.length, k, px; rx.beginPath(); for(k=0;k<n;k++){ px=(-4+k*2)*2; var w=wob?Math.sin((x0L+px)*0.055+sd*1.7+off)*wob:0; rx.lineTo(px,road.m[k]*2+sd*(road.w[k]*2+off)+w); } }
function nRoadClip(road){ var n=road.m.length, k; rx.beginPath(); for(k=0;k<n;k++) rx.lineTo((-4+k*2)*2,(road.m[k]-road.w[k])*2); for(k=n-1;k>=0;k--) rx.lineTo((-4+k*2)*2,(road.m[k]+road.w[k])*2); rx.closePath(); }
/* geography: the pencil road with the yellow highlighter (today's, «1») */
function nRoadPencil(road,x0L,WL,HL){ var X, tn;
  rx.save(); nRoadClip(road); rx.clip(); rx.fillStyle='rgba(90,90,110,'+RN_LOOK.base+')'; rx.fillRect(-4,-4,WL+8,HL+8); nInk('rgba(80,80,100,'+RN_LOOK.h1+')',1.2); tn=Math.tan(0.35)*HL;
  for(X=-HL-(x0L%3.5);X<WL+HL;X+=3.5){ rx.beginPath(); rx.moveTo(X,0); rx.lineTo(X+tn,HL); rx.stroke(); }
  nInk('rgba(80,80,100,'+RN_LOOK.h2+')',1); tn=Math.tan(-0.5)*HL; for(X=-(x0L%5);X<WL+HL;X+=5){ rx.beginPath(); rx.moveTo(X,0); rx.lineTo(X+tn,HL); rx.stroke(); } rx.restore();
  [-1,1].forEach(function(sd){ nInk('rgba(255,226,80,0.55)',9); nAlongW(road,sd,-5,x0L,0); rx.stroke(); [0,1.2].forEach(function(j){ nInk('rgba(60,60,80,0.8)',1.6); nAlongW(road,sd,j,x0L,0.7); rx.stroke(); }); });
  rx.setLineDash([12,12]); rx.lineDashOffset=x0L%24; nInk(RN_LOOK.paper,3.5); nAlong(road,0,x0L,0); rx.stroke(); rx.setLineDash([]); rx.lineDashOffset=0; }
/* the margins' doodles: ruled in pen — a double blue line each side, a pencil guide, marks every two cells, a dashed middle */
function nRoadRuled(road,x0L){ [-1,1].forEach(function(sd){ nInk('rgba(60,60,80,0.25)',0.6); nAlongW(road,sd,3,x0L,0); rx.stroke(); nInk(RN_BLUE,1.3); nAlongW(road,sd,0,x0L,0.35); rx.stroke(); nInk(RN_BLUE,0.9); nAlongW(road,sd,-5,x0L,0.35); rx.stroke();
    for(var q=Math.ceil(x0L/32);q*32<x0L+road.m.length*4;q++){ var X=q*32-x0L, a=rpAt(road,X), a2=rpAt(road,X+2), an=Math.atan2(a2[0]-a[0],2), Y=a[0]+sd*(a[1]-5); nInk(RN_BLUE,0.8); rx.beginPath(); rx.moveTo(X,Y); rx.lineTo(X+Math.sin(an)*sd*7,Y-Math.cos(an)*sd*7); rx.stroke(); } });
  rx.setLineDash([16,12]); rx.lineDashOffset=x0L%28; nInk(RN_BLUE,1.3); nAlong(road,0,x0L,0.3); rx.stroke(); rx.setLineDash([]); rx.lineDashOffset=0; }
/* mathematics: the grid's cells hatched in pencil one by one, the edge stepping along them, the middle left blank cell by cell */
function nRoadCells(road,x0L,WL,HL){ var st=16, on={}, i, j, i0=Math.floor(x0L/st)-1, i1=Math.ceil((x0L+WL)/st)+1;
  function inR(ci,cj){ var lx=ci*st+st/2-x0L, a=rpAt(road,lx), d=cj*st+st/2-a[0]; return Math.abs(d)<a[1]-2?((Math.abs(d)<st*0.6&&((ci%3)+3)%3!==0)?2:1):0; }
  for(i=i0;i<=i1;i++) for(j=-1;j*st<HL+st;j++){ var v=inR(i,j); if(v) on[i+','+j]=v; }
  Object.keys(on).forEach(function(key){ if(on[key]!==1) return; var p=key.split(','), ci=+p[0], cj=+p[1], X0=ci*st-x0L, Y0=cj*st, h=rR(rHash(ci*7919+cj,31)), ang=((ci+cj)%2)?0.7:-0.7, den=2.4+h()*0.8;
    rx.save(); rx.beginPath(); rx.rect(X0+0.6,Y0+0.6,st-1.2,st-1.2); rx.clip(); rx.fillStyle='rgba(90,90,110,'+(0.1+h()*0.06)+')'; rx.fillRect(X0,Y0,st,st); nInk('rgba(70,70,90,'+(0.45+h()*0.15)+')',0.7);
    for(var k=-st*2;k<st*2;k+=den){ rx.beginPath(); rx.moveTo(X0+k,Y0); rx.lineTo(X0+k+Math.tan(ang)*st,Y0+st); rx.stroke(); } rx.restore(); });
  nInk('rgba(40,40,60,0.85)',1.4); Object.keys(on).forEach(function(key){ var p=key.split(','), ci=+p[0], cj=+p[1], X0=ci*st-x0L, Y0=cj*st;
    [[0,-1,X0,Y0,X0+st,Y0],[0,1,X0,Y0+st,X0+st,Y0+st],[-1,0,X0,Y0,X0,Y0+st],[1,0,X0+st,Y0,X0+st,Y0+st]].forEach(function(e){ if(!on[(ci+e[0])+','+(cj+e[1])]){ rx.beginPath(); rx.moveTo(e[2],e[3]); rx.lineTo(e[4],e[5]); rx.stroke(); } }); }); }
function nRoad(kind,road,x0L,WL,HL){ if(kind==='math') nRoadCells(road,x0L,WL,HL); else if(kind==='geo') nRoadPencil(road,x0L,WL,HL); else nRoadRuled(road,x0L); }
/* the spiral binding across the screen at x (the pages' gutter, the punched holes, the rings) */
function nSpring(X,HL){ var g=rx.createLinearGradient(X-22,0,X+22,0), Y; g.addColorStop(0,'rgba(90,80,60,0)'); g.addColorStop(0.45,'rgba(90,80,60,0.22)'); g.addColorStop(0.55,'rgba(90,80,60,0.22)'); g.addColorStop(1,'rgba(90,80,60,0)'); rx.fillStyle=g; rx.fillRect(X-22,-4,44,HL+8);
  for(Y=10;Y<HL+10;Y+=22){ [-1,1].forEach(function(s){ rx.fillStyle='#3a3a44'; rx.beginPath(); rx.ellipse(X+s*11,Y,3.2,4.2,0,0,6.2832); rx.fill(); });
    var rg=rx.createLinearGradient(0,Y-6,0,Y+6); rg.addColorStop(0,'#f4f4f8'); rg.addColorStop(0.5,'#9a9aac'); rg.addColorStop(1,'#5a5a6e'); rx.strokeStyle=rg; rx.lineWidth=3.4; rx.beginPath(); rx.ellipse(X,Y-1,12,5.5,0,Math.PI*1.05,Math.PI*1.95); rx.stroke(); rx.strokeStyle='rgba(30,30,40,0.5)'; rx.lineWidth=nW(0.6); rx.stroke(); } }
/* the zones' drawings, each round its middle (L units), with its half-width and half-height for the placing */
var RN_DRAW=(function(){ var B=RN_BLUE, D=RN_DARK, RE=RN_RED, G=RN_GRN; return {
 math:[
  [70,46,function(r){ rx.save(); rx.translate(-85,-50); nArrow(20,74,150,74,D,0.8,r); nArrow(78,96,78,6,D,0.8,r); nTxt('x',146,86,11,D); nTxt('y',84,12,11,D); nTxt('0',70,86,9,D);
    for(var k=-4;k<=5;k++) nLine([[78+k*12,72],[78+k*12,76]],D,0.5,r,0); for(k=1;k<=6;k++) nLine([[76,74-k*11],[80,74-k*11]],D,0.5,r,0);
    nInk(RE,1.1); rx.beginPath(); for(var t=-3.6;t<=3.6;t+=0.1) rx.lineTo(78+t*14,74-t*t*5.4+8); rx.stroke(); nTxt('y = x² − 1',112,26,12,RE); rx.restore(); }],
  [58,46,function(r){ rx.save(); rx.translate(-250,-50); var A=[200,82],Bp=[300,82],C=[238,14]; nLine([A,Bp,C,A],B,1,r); rx.setLineDash([3,2.5]); nLine([C,[238,82]],B,0.7,r,0); rx.setLineDash([]); nLine([[232,82],[232,76],[238,76]],B,0.6,r,0);
    nInk(B,0.7); rx.beginPath(); rx.arc(A[0],A[1],12,-1.06,0); rx.stroke(); nTxt('α',214,77,10,B); nTxt('A',188,94,11,B); nTxt('B',302,94,11,B); nTxt('C',234,10,11,B); nTxt('h',241,52,10,B); rx.restore(); }],
  [54,11,function(r){ nTxt(['a² + b² = c²','(a + b)² = a² + 2ab + b²','sin²x + cos²x = 1','π ≈ 3,14159','7 × 8 = 56','E = mc²','2³ = 8','√49 = 7'][Math.floor(r()*8)],-52,6,15,B,-0.02); }],
  [70,16,function(r){ nTxt('No '+(100+Math.floor(r()*500)),-70,-2,12,D); nTxt('S = ½ · a · h',0,-2,12,B); nInk(B,0.7); rx.beginPath(); rx.moveTo(-70,12); rx.lineTo(60,12); rx.stroke(); }],
  [68,32,function(r){ nCirc(-36,0,30,B,0.9,r); nLine([[-36,0],[-10,-15]],B,0.7,r,0); rx.fillStyle=B; rx.beginPath(); rx.arc(-36,0,1.6,0,6.2832); rx.fill(); nTxt('R = 3 cm',-4,-2,11,B); }],
  [42,24,function(r){ nInk(D,0.8); rx.beginPath(); rx.arc(0,20,40,Math.PI,0); rx.closePath(); rx.stroke(); for(var k=0;k<=18;k++){ var a=Math.PI+k/18*Math.PI, q=k%9?4:7; nLine([[Math.cos(a)*40,20+Math.sin(a)*40],[Math.cos(a)*(40-q),20+Math.sin(a)*(40-q)]],D,0.45,r,0); }
    rx.beginPath(); rx.arc(0,20,22,Math.PI,0); rx.stroke(); nTxt('90°',-8,-4,8,D); }],
  [62,22,function(r){ var e=[['x² − 5x + 6 = 0','x = 2,  x = 3'],['x² − 7x + 12 = 0','x = 3,  x = 4'],['2x + 5 = 13','x = 4'],['x² = 81','x = ±9'],['3x − 4 = 11','x = 5']][Math.floor(r()*5)]; nTxt(e[0],-58,-8,12,B); nTxt(e[1],-58,12,12,B); nInk(B,0.8); rx.strokeRect(-62,-2,124,20); }],
  [44,26,function(r){ nInk(RE,1.4); rx.beginPath(); rx.ellipse(-16,-2,18,20,0.2,0,6.2832); rx.stroke(); nTxt('5',-27,10,30,RE,0.12); nTxt('well done!',4,22,11,RE); }]],
 geo:[
  [80,42,function(r){ rx.save(); rx.translate(-90,-52); [[40,80,26],[72,76,34],[110,84,22],[140,78,28]].forEach(function(m){ var X=m[0],Y=m[1],h=m[2],w=h*0.9; nLine([[X-w,Y],[X,Y-h],[X+w,Y]],'#6b4a2a',1,r);
      nHatch(function(){ rx.beginPath(); rx.moveTo(X,Y-h); rx.lineTo(X+w,Y); rx.lineTo(X,Y); rx.closePath(); },0.6,2.2,'#8a6a4a',0.45); nLine([[X-w*0.3,Y-h*0.7],[X-w*0.1,Y-h*0.62],[X+w*0.05,Y-h*0.72],[X+w*0.28,Y-h*0.68]],'#6b4a2a',0.6,r); });
    nTxt(['Sonar Mountains','Mount Eraser','Pencil Peaks'][Math.floor(r()*3)],40,98,11,'#6b4a2a'); rx.restore(); }],
  [40,46,function(r){ var cx=0, cy=4; [[0,-30],[22,0],[0,30],[-22,0]].forEach(function(q,i){ rx.beginPath(); rx.moveTo(cx,cy); rx.lineTo(cx+q[0]*0.25+q[1]*0.18,cy+q[1]*0.25-q[0]*0.18); rx.lineTo(cx+q[0],cy+q[1]); rx.closePath(); rx.fillStyle=i===0?RE:'#fff'; rx.fill(); nInk(D,0.7); rx.stroke(); });
    nCirc(cx,cy,14,D,0.5,r); nTxt('N',cx-4,cy-34,12,RE); nTxt('S',cx-4,cy+44,11,D); nTxt('W',cx-36,cy+4,11,D); nTxt('E',cx+26,cy+4,11,D); }],
  [52,8,function(r){ var nm=['Notebook City','Gridville','Inkton','Pencilburg'][Math.floor(r()*4)]; rx.fillStyle=D; rx.beginPath(); rx.arc(-46,0,2.6,0,6.2832); rx.fill(); nCirc(-46,0,4.5,D,0.6,r); nTxt(nm,-38,4,11,D); }],
  [90,40,function(r){ nInk('#b04a8a',1); rx.setLineDash([7,3,1.5,3]); rx.beginPath(); rx.moveTo(-90,-40); rx.bezierCurveTo(-40,-10,-10,-30,50,10); rx.lineTo(90,40); rx.stroke(); rx.setLineDash([]); }],
  [135,34,function(r){ rx.save(); rx.translate(-155,-252); nInk(B,1); [0,6].forEach(function(o){ rx.beginPath(); rx.moveTo(20,226+o); rx.bezierCurveTo(80,214+o,90,262+o,160,250+o); rx.bezierCurveTo(220,238+o,240,276+o,290,262+o); rx.stroke(); }); nTxt(['Pencil River','Ink River','Blue Creek'][Math.floor(r()*3)],100,284,11,B); rx.restore(); }],
  [50,24,function(r){ var lake=function(){ rx.beginPath(); rx.ellipse(0,0,48,22,-0.1,0,6.2832); }; nHatch(lake,0,3,'rgba(31,63,168,0.45)',0.5); lake(); nInk(B,1); rx.stroke(); nTxt(['Lake Blot','Lake Ink','Puddle Bay'][Math.floor(r()*3)],-24,4,11,B); }],
  [58,18,function(r){ for(var i=0;i<14;i++){ var X=-50+(i%7)*16+(i>6?8:0), Y=-8+Math.floor(i/7)*16; nCirc(X,Y,4,G,0.7,r); nLine([[X,Y+4],[X,Y+8]],G,0.7,r,0); } }],
  [62,12,function(r){ nLine([[-60,8],[60,8]],D,0.9,r,0); for(var k=0;k<=4;k++) nLine([[-60+k*30,4],[-60+k*30,12]],D,0.6,r,0); rx.fillStyle=D; rx.fillRect(-60,6,30,4); rx.fillRect(0,6,30,4); nTxt('0',-64,0,9,D); nTxt([10,20,50,100][Math.floor(r()*4)]+' km',44,0,9,D); }]],
 doo:[
  [34,32,function(r){ nInk(B,0.9); rx.strokeRect(-30,-16,40,40); rx.strokeRect(-14,-30,40,40); [[-30,-16,-14,-30],[10,-16,26,-30],[-30,24,-14,10],[10,24,26,10]].forEach(function(q){ nLine([[q[0],q[1]],[q[2],q[3]]],B,0.9,r,0); }); }],
  [26,26,function(r){ nInk(D,0.8); rx.beginPath(); for(var a=0;a<22;a+=0.15){ var q=1+a*1.2; rx.lineTo(Math.cos(a)*q,Math.sin(a)*q); } rx.stroke(); }],
  [23,23,function(r){ nCirc(0,0,22,B,1,r); rx.fillStyle=B; rx.beginPath(); rx.arc(-8,-6,2.6,0,6.2832); rx.arc(8,-6,2.6,0,6.2832); rx.fill(); nInk(B,1); rx.beginPath(); rx.arc(0,2,12,0.3,2.8); rx.stroke(); }],
  [30,22,function(r){ [[-12,-6,9],[10,20,6],[26,-14,5]].forEach(function(h){ var X=h[0],Y=h[1],s=h[2]; nInk(RE,0.9); rx.beginPath(); rx.moveTo(X,Y+s); rx.bezierCurveTo(X-s*1.6,Y-s*0.2,X-s*0.6,Y-s*1.4,X,Y-s*0.4); rx.bezierCurveTo(X+s*0.6,Y-s*1.4,X+s*1.6,Y-s*0.2,X,Y+s); rx.fillStyle='rgba(216,40,58,0.2)'; rx.fill(); rx.stroke(); }); }],
  [38,40,function(r){ [[-12,-37,-12,37],[12,-37,12,37],[-36,-13,36,-13],[-36,11,36,11]].forEach(function(q){ nLine([[q[0],q[1]],[q[2],q[3]]],D,0.9,r,0.6); });
    [[-24,-25],[24,-1],[0,25]].forEach(function(q){ nLine([[q[0]-6,q[1]-6],[q[0]+6,q[1]+6]],B,1.1,r,0.3); nLine([[q[0]+6,q[1]-6],[q[0]-6,q[1]+6]],B,1.1,r,0.3); }); [[0,-25],[-24,25]].forEach(function(q){ nCirc(q[0],q[1],7,RE,1.1,r); }); }],
  [24,36,function(r){ rx.save(); rx.rotate(-0.6); nInk(D,0.9); rx.beginPath(); rx.moveTo(0,-34); rx.quadraticCurveTo(12,-16,10,14); rx.lineTo(-10,14); rx.quadraticCurveTo(-12,-16,0,-34); rx.fillStyle='#fff'; rx.fill(); rx.stroke(); nCirc(0,-10,5,B,0.8,r,'rgba(31,63,168,0.2)');
    nLine([[-10,4],[-18,20],[-10,16]],D,0.9,r,0); nLine([[10,4],[18,20],[10,16]],D,0.9,r,0); nInk('#e07a20',1); rx.beginPath(); rx.moveTo(-6,16); rx.quadraticCurveTo(0,40,6,16); rx.fillStyle='rgba(255,160,40,0.4)'; rx.fill(); rx.stroke(); rx.restore(); }],
  [38,42,function(r){ var k; for(k=0;k<=6;k++){ nLine([[-36+k*12,-30],[-36+k*12,42]],D,0.45,r,0); nLine([[-36,-30+k*12],[36,-30+k*12]],D,0.45,r,0); } nTxt('A B C D E F',-34,-34,7,D);
    [[1,1],[1,2],[1,3],[4,4],[3,0]].forEach(function(q){ rx.fillStyle='rgba(31,63,168,0.6)'; rx.fillRect(-35+q[0]*12,-29+q[1]*12,10,10); }); [[5,1],[2,5],[0,4]].forEach(function(q){ var X=-30+q[0]*12, Y=-24+q[1]*12; nLine([[X-4,Y-4],[X+4,Y+4]],RE,1,r,0); nLine([[X+4,Y-4],[X-4,Y+4]],RE,1,r,0); }); }],
  [26,30,function(r){ nCirc(0,2,20,'#e07a20',1,r,'rgba(255,170,80,0.15)'); nLine([[-17,-8],[-14,-26],[-4,-16]],'#e07a20',1,r,0); nLine([[17,-8],[14,-26],[4,-16]],'#e07a20',1,r,0); rx.fillStyle=D; rx.beginPath(); rx.arc(-7,-1,2.4,0,6.2832); rx.arc(7,-1,2.4,0,6.2832); rx.fill();
    nLine([[0,5],[-3,8],[0,10],[3,8],[0,5]],D,0.8,r,0); [-1,1].forEach(function(s){ nLine([[s*6,9],[s*24,6]],D,0.5,r,0); nLine([[s*6,11],[s*24,13]],D,0.5,r,0); }); }],
  [32,32,function(r){ nCirc(0,0,18,'#c8901a',1,r,'rgba(255,210,63,0.35)'); for(var k=0;k<12;k++){ var a=k*0.5236; nLine([[Math.cos(a)*22,Math.sin(a)*22],[Math.cos(a)*30,Math.sin(a)*30]],'#c8901a',1,r,0.3); }
    rx.fillStyle=D; rx.fillRect(-12,-6,10,6); rx.fillRect(2,-6,10,6); nLine([[-2,-4],[2,-4]],D,1,r,0); nInk(D,1); rx.beginPath(); rx.arc(0,4,8,0.4,2.7); rx.stroke(); }],
  [64,14,function(r){ nTxt(['Vasya was here','Masha + Dima','I ♥ racing','so boring...','Vasya was here'][Math.floor(r()*5)],-62,0,14,B,-0.06); nInk(B,0.8); rx.beginPath(); rx.moveTo(-64,8); rx.bezierCurveTo(-10,16,20,0,62,12); rx.stroke(); }],
  [40,8,function(r){ nTxt(['2 + 2 = 4  ✓','3 + 5 = 8  ✓','9 − 4 = 5  ✓','6 × 7 = 42  ✓'][Math.floor(r()*4)],-38,4,12,D); }],
  [22,22,function(r){ nStar5(-8,-6,9,'#c8901a',0.8,'rgba(255,210,63,0.4)'); nStar5(12,10,6,'#c8901a',0.7); nStar5(14,-14,4,'#c8901a',0.6); }]] }; })();
/* place a zone's drawings off the road in a chunk (from x0 on), none over another */
function nDoodles(kind,road,r,WL,HL,x0,zk,ci,keep){ var set=RN_DRAW[kind], placed=(keep||[]).slice(), order=[], i, n=2+Math.floor(r()*3), h=rR(rHash(RC.seed,zk*31+5)), o=[];   // the zone's own order of its drawings, each chunk the next few: none again close by
  for(i=0;i<set.length;i++) o.push(i); for(i=o.length-1;i>0;i--){ var j=Math.floor(h()*(i+1)), t=o[i]; o[i]=o[j]; o[j]=t; } for(i=0;i<3;i++) order.push(o[(((ci*3+i)%o.length)+o.length)%o.length]);   // three of them, none of the chunk before's
  n+=placed.length; for(i=0;i<order.length&&placed.length<n;i++){ var d=set[order[i]], hw=d[0]+4, hh=d[1]+4;
    for(var t=0;t<24;t++){ var px=x0+hw+r()*Math.max(1,WL-x0-2*hw), py=44+hh+r()*Math.max(1,HL-52-2*hh), ok=px+hw<WL-2;
      for(var q=-1;q<=1&&ok;q++){ var a=rpAt(road,px+q*hw); if(!(py+hh<a[0]-a[1]-8||py-hh>a[0]+a[1]+8)) ok=false; }
      if(ok&&placed.some(function(p){ return Math.abs(p[0]-px)<p[2]+hw&&Math.abs(p[1]-py)<p[3]+hh; })) ok=false;
      if(!ok) continue; placed.push([px,py,hw,hh]); rx.save(); rx.translate(px,py); d[2](r); rx.restore(); break; } } }
/* ── v1.23, the roads' few things (the maintainer: «здесь нужен минимализм и только лёгкие акценты»; his picks «м1,3,4 / г1,2,4 / к2,3,4»): now and
   then one per chunk — mathematics: a crossing of blank cells, paper clips along the edges, an eraser for a bus stop and a sharpener with its
   shavings for the fuel; geography: an ink river under a bridge, a railway as on a map with its crossing sign, a signpost and a flag; the
   margins: a strip of tape across the road, a «GO!» sticker with arrows, a coffee cup's ring and a paper plane. Each gives the places it
   takes, so the drawings keep off them; drawn over the road. ── */
var RN_INFRA={math:['zebra','clips','shop'],geo:['bridge','rail','sign'],doo:['tape','sticker','coffee']};
var RN_FORCE=null;   // the layout checks: one road thing in every chunk
function nInfAt(i){ return RN_FORCE?!(i%2):rHash(RC.seed,i*13+1)/4294967296<0.2; }
function nAcross(road,X,f){ var a=rpAt(road,X), b=rpAt(road,X+3), c=rpAt(road,X-3); rx.save(); rx.translate(X,a[0]); rx.rotate(Math.atan2(b[0]-c[0],6)); f(a[1]); rx.restore(); }
function nSide(road,X,sd,gap,hh,HL){ var a=rpAt(road,X), y=a[0]+sd*(a[1]+gap+hh); return (y-hh<44||y+hh>HL-8)?null:y; }
function nInfra(kind,road,r,x0L,WL,HL){ var nm=RN_INFRA[kind][Math.floor(r()*3)]; if(RN_FORCE) nm=RN_FORCE[kind]; var wide=nm==='shop'||nm==='sign'||nm==='sticker'||nm==='coffee', X=wide?60+r()*Math.max(1,WL-240):90+r()*(WL-180),   // the wide ones kept whole inside the chunk
    keep=[], drw=null, y, y2;
  if(nm==='zebra'){ var st=16, ci0=Math.round((x0L+X)/st); keep.push([X+st*2,30,30,40]); drw=function(){ for(var ci=ci0;ci<=ci0+4;ci+=2) for(var cj=0;cj*st<HL;cj++){ var lx=ci*st+8-x0L, a=rpAt(road,lx); if(Math.abs(cj*st+8-a[0])<a[1]-2){ rx.fillStyle=RN_LOOK.paper; rx.fillRect(ci*st-x0L+0.8,cj*st+0.8,st-1.6,st-1.6); nInk(RN_LOOK.grid,0.64); rx.strokeRect(ci*st-x0L,cj*st,st,st); } }
      var a2=rpAt(road,ci0*st+40-x0L); if(a2[0]-a2[1]-10>50) nTxt('crossing',ci0*st-x0L-6,a2[0]-a2[1]-10,11,RN_BLUE); }; }
  else if(nm==='clips'){ drw=function(){ [-1,1].forEach(function(sd){ nAcross(road,X,function(hw){ rx.translate(0,sd*(hw+12)); nInk('#8a8aa0',2.2); rx.beginPath(); rx.moveTo(-60,-4); rx.lineTo(60,-4); rx.arc(60,1,5,-1.57,1.57); rx.lineTo(-50,6); rx.arc(-50,2,4,1.57,4.71); rx.lineTo(50,-2); rx.stroke(); nInk('rgba(255,255,255,0.7)',0.6); rx.beginPath(); rx.moveTo(-58,-5); rx.lineTo(58,-5); rx.stroke(); }); }); };
      keep.push([X,rpAt(road,X)[0],72,rpAt(road,X)[1]+24]); }
  else if(nm==='shop'){ y=nSide(road,X,-1,14,22,HL); y2=nSide(road,X+60,1,14,20,HL); if(y!==null) keep.push([X,y,40,28]); if(y2!==null) keep.push([X+80,y2,64,26]);
    drw=function(){ if(y!==null){ rx.save(); rx.translate(X,y-4); rx.rotate(-0.08); rpSw(6,1.5,2,0.3); rx.fillStyle='#f4a6b4'; rx.beginPath(); rx.roundRect(-34,-15,46,30,5); rx.fill(); rpNos(); rx.fillStyle='#4f8fd8'; rx.beginPath(); rx.roundRect(12,-15,22,30,[0,5,5,0]); rx.fill();
        nInk('rgba(80,40,50,0.5)',0.8); rx.beginPath(); rx.roundRect(-34,-15,68,30,5); rx.stroke(); nTxt('ERASER',-30,5,10,'rgba(120,40,60,0.8)'); rx.fillStyle='rgba(255,255,255,0.5)'; rx.fillRect(-30,-12,40,3); rx.restore(); nTxt('bus stop',X-30,y+24,10,RN_BLUE); }
      if(y2!==null){ var X2=X+60; rx.save(); rx.translate(X2,y2); rpSw(5,1.5,2,0.3); rx.fillStyle='#5a5a6e'; rx.beginPath(); rx.roundRect(-16,-12,32,24,3); rx.fill(); rpNos(); rx.fillStyle='#8a8aa0'; rx.beginPath(); rx.arc(-4,0,7,0,6.2832); rx.fill(); rx.fillStyle='#2a2a3a'; rx.beginPath(); rx.arc(-4,0,3,0,6.2832); rx.fill(); rx.restore();
        for(var k=0;k<6;k++){ rx.save(); rx.translate(X2+22+k*9,y2-6+(k%2)*10); rx.rotate(k); nInk('#c88a48',1.2); rx.fillStyle='rgba(240,200,140,0.8)'; rx.beginPath(); rx.arc(0,0,5,0,4.2); rx.lineTo(0,0); rx.closePath(); rx.fill(); rx.stroke(); nInk('#3fae4a',1.2); rx.beginPath(); rx.arc(0,0,5,0,4.2); rx.stroke(); rx.restore(); } nTxt('fuel',X2-12,y2+24,10,RN_BLUE); } }; }
  else if(nm==='bridge'){ keep.push([X,HL/2,52,HL]); drw=function(){ rx.save(); rx.beginPath(); rx.rect(-4,-4,WL+8,HL+8); var n=road.m.length, k; for(k=0;k<n;k++) rx.lineTo((-4+k*2)*2,(road.m[k]-road.w[k])*2-14); for(k=n-1;k>=0;k--) rx.lineTo((-4+k*2)*2,(road.m[k]+road.w[k])*2+14); rx.closePath(); rx.clip('evenodd');
      nInk(RN_BLUE,1); [0,7].forEach(function(o){ rx.beginPath(); rx.moveTo(X-40+o,-4); rx.bezierCurveTo(X+10+o,HL*0.3,X-30+o,HL*0.66,X+20+o,HL+4); rx.stroke(); }); rx.restore();
      nAcross(road,X-6,function(hw){ [-1,1].forEach(function(sd){ nInk('rgba(60,60,80,0.85)',1.4); rx.beginPath(); rx.moveTo(-22,sd*(hw+2)); rx.lineTo(22,sd*(hw+2)); rx.stroke(); rx.beginPath(); rx.moveTo(-22,sd*(hw+2)); rx.lineTo(-30,sd*(hw+12)); rx.moveTo(22,sd*(hw+2)); rx.lineTo(30,sd*(hw+12)); rx.stroke(); }); });
      var a=rpAt(road,X+30); if(a[0]-a[1]-20>60) nTxt(['Ink River','Blue Creek','River Biro'][Math.floor(r()*3)],X+26,a[0]-a[1]-24,11,RN_BLUE); }; }
  else if(nm==='rail'){ keep.push([X,HL/2,70,HL]); drw=function(){ nAcross(road,X,function(hw){ rx.save(); rx.rotate(0.4); for(var k=-hw-70;k<hw+70;k+=12){ rx.fillStyle=(Math.floor(k/12)%2)?'#2a2a3a':RN_LOOK.paper; rx.fillRect(-3,k,6,12); } nInk('#2a2a3a',0.8); rx.strokeRect(-3,-hw-70,6,2*hw+140); rx.restore(); });
      var a=rpAt(road,X-40), Y=a[0]-a[1]-30; if(Y>60){ nInk('#2a2a3a',1); rx.beginPath(); rx.moveTo(X-40,Y+24); rx.lineTo(X-40,Y); rx.stroke(); rx.save(); rx.translate(X-40,Y-6); rx.rotate(0.785); rx.fillStyle='#fff'; rx.fillRect(-12,-2.5,24,5); rx.strokeRect(-12,-2.5,24,5); rx.rotate(-1.57); rx.fillRect(-12,-2.5,24,5); rx.strokeRect(-12,-2.5,24,5); rx.restore(); } }; }
  else if(nm==='sign'){ y=nSide(road,X,-1,6,26,HL); y2=nSide(road,X+80,1,6,20,HL); if(y!==null) keep.push([X+38,y,48,30]); if(y2!==null) keep.push([X+110,y2,44,22]);
    drw=function(){ if(y!==null){ var Y=y+18; nInk('#8a5a2a',1.6); rx.beginPath(); rx.moveTo(X,Y+8); rx.lineTo(X,Y-26); rx.stroke(); nInk('#2a2a3a',1); rx.fillStyle='#fff'; rx.beginPath(); rx.moveTo(X-4,Y-46); rx.lineTo(X+70,Y-46); rx.lineTo(X+80,Y-37); rx.lineTo(X+70,Y-28); rx.lineTo(X-4,Y-28); rx.closePath(); rx.fill(); rx.stroke(); nTxt(['Gridville ','Inkton ','Pencilburg '][Math.floor(r()*3)]+(3+Math.floor(r()*40)),X,Y-33,11,'#2a2a3a'); }
      if(y2!==null){ var X2=X+80, Y2=y2+6; nInk('#2a2a3a',1); rx.beginPath(); rx.moveTo(X2,Y2+14); rx.lineTo(X2,Y2-24); rx.stroke(); rx.fillStyle=RN_RED; rx.beginPath(); rx.moveTo(X2,Y2-24); rx.lineTo(X2+20,Y2-18); rx.lineTo(X2,Y2-12); rx.closePath(); rx.fill(); rx.stroke(); nTxt('check point',X2+8,Y2+12,10,RN_RED); } }; }
  else if(nm==='tape'){ keep.push([X,HL/2,40,HL]); drw=function(){ nAcross(road,X,function(hw){ rx.rotate(-0.25); rx.fillStyle='rgba(235,240,220,0.55)'; rx.beginPath(); rx.moveTo(-16,-hw-30); for(var q=-16;q<=16;q+=3) rx.lineTo(q,-hw-30+((q/3)%2?2:-1)); rx.lineTo(16,hw+30); for(q=16;q>=-16;q-=3) rx.lineTo(q,hw+30+((q/3)%2?-2:1)); rx.closePath(); rx.fill();
      nInk('rgba(150,150,130,0.45)',0.6); rx.stroke(); rx.fillStyle='rgba(255,255,255,0.5)'; rx.fillRect(-12,-hw-20,4,2*hw+40); }); }; }
  else if(nm==='sticker'){ y=nSide(road,X,-1,10,24,HL); y2=nSide(road,X+70,1,8,8,HL); if(y!==null) keep.push([X,y,32,30]); if(y2!==null) keep.push([X+110,y2,70,14]);
    drw=function(){ if(y!==null){ rx.save(); rx.translate(X,y); rx.rotate(0.06); rpSw(5,0,1.5,0.3); rx.fillStyle='#ffe46a'; rx.fillRect(-26,-22,52,44); rpNos(); rx.fillStyle='rgba(0,0,0,0.05)'; rx.fillRect(-26,-22,52,8); nTxt(['GO!','FAST!','WOW!'][Math.floor(r()*3)],-20,9,18,RN_RED); rx.restore(); }
      if(y2!==null) for(var k=0;k<3;k++){ var X2=X+70+k*40, Y2=y2; nInk(RN_BLUE,1.3); rx.beginPath(); rx.moveTo(X2-12,Y2); rx.lineTo(X2+10,Y2); rx.moveTo(X2+3,Y2-6); rx.lineTo(X2+10,Y2); rx.lineTo(X2+3,Y2+6); rx.stroke(); } }; }
  else { var a=rpAt(road,X), sd=r()<0.5?-1:1, cy=a[0]+sd*(a[1]-6), py=nSide(road,X+110,-sd,8,16,HL); keep.push([X,cy,40,40]); if(py!==null) keep.push([X+90,py,70,24]);
    drw=function(){ var g=rx.createRadialGradient(X,cy,20,X,cy,34); g.addColorStop(0,'rgba(160,110,60,0)'); g.addColorStop(0.8,'rgba(160,110,60,0.18)'); g.addColorStop(0.92,'rgba(130,80,40,0.35)'); g.addColorStop(1,'rgba(130,80,40,0)'); rx.fillStyle=g; rx.beginPath(); rx.arc(X,cy,34,0,6.2832); rx.fill();
      nInk('rgba(130,80,40,0.3)',1); rx.beginPath(); rx.arc(X+5,cy-3,33,0.4,2.2); rx.stroke();
      if(py!==null){ rx.save(); rx.translate(X+120,py); rx.rotate(-0.25); nInk('#2a2a3a',1); rx.fillStyle='#fff'; rx.beginPath(); rx.moveTo(30,0); rx.lineTo(-24,-14); rx.lineTo(-14,0); rx.closePath(); rx.fill(); rx.stroke(); rx.fillStyle='#e8eef8'; rx.beginPath(); rx.moveTo(30,0); rx.lineTo(-24,12); rx.lineTo(-14,0); rx.closePath(); rx.fill(); rx.stroke(); rx.restore();
        rx.setLineDash([4,5]); nInk('rgba(42,42,58,0.6)',0.9); rx.beginPath(); rx.moveTo(X+92,py+6); rx.bezierCurveTo(X+70,py-14,X+50,py+18,X+20,py); rx.stroke(); rx.setLineDash([]); } }; }
  return {keep:keep,draw:drw}; }
/* one chunk of the notebook: the paper, the zone's drawings and road; the first chunk of a zone has the binding with the last zone before it */
function noteChunk(rg,i,W,H){ var r=rR(rHash(RC.seed,i)+7), road=rChunkRoad(rg,i), WL=W*2, HL=H*2, x0L=i*W*2, z=nZoneOf(rg,i), kind=RN_ZK[z.k%3], SX=26;
  RP.ds=hs*rKS()/2; rx.save(); rx.scale(0.5,0.5); nPaper(x0L,WL,HL,r);
  if(z.first){ var prev=RN_ZK[(z.k+2)%3]; nDoodles(kind,road,r,WL,HL,SX+30,z.k,0); rx.save(); rx.beginPath(); rx.rect(-4,-4,SX+4,HL+8); rx.clip(); nRoad(prev,road,x0L,WL,HL); rx.restore();
    rx.save(); rx.beginPath(); rx.rect(SX,-4,WL,HL+8); rx.clip(); nRoad(kind,road,x0L,WL,HL); rx.restore(); nSpring(SX,HL); }
  else { var inf=(nInfAt(i)&&!nInfAt(i-1)&&!nZoneOf(rg,i-1).first)?nInfra(kind,road,rR(rHash(RC.seed,i)+91),x0L,WL,HL):null;   // about one chunk in six, never two together
    nDoodles(kind,road,r,WL,HL,0,z.k,i-z.at,inf?inf.keep:null); nRoad(kind,road,x0L,WL,HL); if(inf&&inf.draw) inf.draw(); }
  rx.restore(); }
/* ── the cars and the gifts (around 0,0, in the sketches' pixels; rSprite scales them by a half) ── */
function nWheel(x,y,w,h){ rx.fillStyle=RN_INK; rx.beginPath(); rx.roundRect(x-w/2,y-h/2,w,h,2); rx.fill(); }
function nRocket(){ [[-10,-12],[12,-12],[-10,12],[12,12]].forEach(function(q){ nWheel(q[0],q[1],9,5); }); rx.strokeStyle=RN_INK; rx.lineWidth=2; rx.lineJoin='round';
  rx.fillStyle='#8a8aa0'; rx.beginPath(); rx.roundRect(-27,-5,7,10,2); rx.fill(); rx.stroke();
  function body(){ rx.beginPath(); rx.moveTo(26,0); rx.quadraticCurveTo(24,-10,10,-11); rx.lineTo(-20,-10); rx.lineTo(-20,10); rx.lineTo(10,11); rx.quadraticCurveTo(24,10,26,0); }
  rx.fillStyle='#2fe0b0'; body(); rx.fill(); rx.save(); body(); rx.clip(); rx.fillStyle='#ffffff'; rx.fillRect(-22,-5,50,3); rx.fillRect(-22,2,50,3); rx.restore(); body(); rx.stroke();
  rx.fillStyle='#bfe8ff'; rx.beginPath(); rx.roundRect(2,-7,9,14,3); rx.fill(); rx.stroke();
  rx.fillStyle='#ff5a8a'; rx.beginPath(); rx.moveTo(-16,-10); rx.lineTo(-22,-17); rx.lineTo(-8,-10); rx.fill(); rx.stroke(); rx.beginPath(); rx.moveTo(-16,10); rx.lineTo(-22,17); rx.lineTo(-8,10); rx.fill(); rx.stroke();
  rx.fillStyle='#ffe066'; rx.beginPath(); rx.arc(24,-4,1.6,0,6.2832); rx.arc(24,4,1.6,0,6.2832); rx.fill(); }
function nCar(fill){ rx.fillStyle=fill; rx.strokeStyle=RN_INK; rx.lineWidth=2; rx.beginPath(); rx.roundRect(-19,-10,38,20,7); rx.fill(); rx.stroke(); rx.fillStyle='#fbfaf4'; rx.beginPath(); rx.roundRect(-3,-7,11,14,3); rx.fill(); rx.stroke(); rx.fillStyle=RN_INK; [[-11,-12],[9,-12],[-11,12],[9,12]].forEach(function(q){ rx.beginPath(); rx.roundRect(q[0]-4,q[1]-2,8,4,2); rx.fill(); }); }
function nTruck(){ rx.strokeStyle=RN_INK; rx.lineWidth=2; [[-11,-11],[3,-11],[13,-11],[-11,11],[3,11],[13,11]].forEach(function(q){ nWheel(q[0],q[1],7,4); }); rx.fillStyle='#ffb52e'; rx.fillRect(-19,-10,26,20); rx.strokeRect(-19,-10,26,20); rx.fillStyle='#e8284a'; rx.beginPath(); rx.roundRect(8,-9,12,18,[1,5,5,1]); rx.fill(); rx.stroke(); rx.fillStyle='#bfe8ff'; rx.fillRect(13,-6,5,12); }
function nBus(){ rx.strokeStyle=RN_INK; rx.lineWidth=2; [[-11,-11],[10,-11],[-11,11],[10,11]].forEach(function(q){ nWheel(q[0],q[1],7,4); }); rx.fillStyle='#4fb8ff'; rx.beginPath(); rx.roundRect(-20,-10,40,20,4); rx.fill(); rx.stroke(); rx.fillStyle='#fff'; for(var k=-15;k<12;k+=7){ rx.fillRect(k,-7,4.5,14); rx.strokeRect(k,-7,4.5,14); } }
function nBug(){ rx.strokeStyle=RN_INK; rx.lineWidth=2; [[-9,-11],[9,-11],[-9,11],[9,11]].forEach(function(q){ nWheel(q[0],q[1],7,4); }); rx.fillStyle='#e040c0'; rx.beginPath(); rx.ellipse(0,0,19,11,0,0,6.2832); rx.fill(); rx.stroke(); rx.fillStyle='#fff'; rx.beginPath(); rx.ellipse(4,0,6,8,0,0,6.2832); rx.fill(); rx.stroke(); }
var RN_CARS=[nTruck,nBus,nBug,function(){ nCar('#5a5a6e'); },function(){ nCar('#b87a3a'); },function(){ nCar('#e8284a'); }];   // the audit: an orange car was the truck's colour, a light blue one the bus's — dark grey and brown now (purple came out the ink blot's colour)   // no dark blue car here — the ink blot is dark blue
function nF(x,y,s,col){ rx.save(); rx.translate(x,y); rx.scale(s,s); rx.fillStyle=col; rx.beginPath(); rx.moveTo(-1.7,4.6); rx.lineTo(-1.7,-2); rx.lineTo(2.3,-2); rx.lineTo(2.3,-0.7); rx.lineTo(-0.35,-0.7); rx.lineTo(-0.35,0.8); rx.lineTo(1.7,0.8); rx.lineTo(1.7,2.1); rx.lineTo(-0.35,2.1); rx.lineTo(-0.35,4.6); rx.closePath(); rx.fill(); rx.restore(); }
function nPump(){ rx.strokeStyle=RN_INK; rx.lineWidth=2; rx.lineJoin='round'; rx.fillStyle='#3fd07a'; rx.beginPath(); rx.roundRect(-9,-13,15,27,3); rx.fill(); rx.stroke(); rx.fillStyle='#fff'; rx.fillRect(-6,-9,9,7); rx.strokeRect(-6,-9,9,7);
  rx.lineCap='round'; rx.beginPath(); rx.moveTo(6,-6); rx.quadraticCurveTo(14,-6,12,6); rx.lineTo(12,10); rx.stroke(); nF(-1.8,3.5,2.1,'#ffffff'); }
function nStar(r,fill){ rx.strokeStyle=RN_INK; rx.lineWidth=1.8; rx.lineJoin='round'; rx.fillStyle=fill||'#ffd23f'; rx.beginPath(); for(var k=0;k<10;k++){ var a=-1.5708+k*0.6283, rr=k%2?r*0.45:r; rx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr); } rx.closePath(); rx.fill(); rx.stroke(); }
function nMagnet(){ rx.fillStyle='#e8284a'; rx.strokeStyle=RN_INK; rx.lineWidth=1.8; rx.lineJoin='round'; rx.beginPath(); rx.arc(0,-2,11,Math.PI,0); rx.lineTo(11,10); rx.lineTo(4,10); rx.lineTo(4,-2); rx.arc(0,-2,4,0,Math.PI,true); rx.lineTo(-4,10); rx.lineTo(-11,10); rx.closePath(); rx.fill(); rx.stroke(); rx.fillStyle='#fff'; rx.fillRect(-10,5,5,4); rx.fillRect(5,5,5,4); }
function nKnight(){ rx.strokeStyle=RN_INK; rx.lineWidth=2; rx.lineJoin='round'; rx.fillStyle='#4fb8ff'; rx.beginPath(); rx.moveTo(-11,-12); rx.lineTo(11,-12); rx.lineTo(10,2); rx.quadraticCurveTo(6,11,0,15); rx.quadraticCurveTo(-6,11,-10,2); rx.closePath(); rx.fill(); rx.stroke(); rx.fillStyle='#fff'; rx.fillRect(-2,-10,4,20); rx.fillRect(-9,-3,18,4); }
function nSuper(){ rx.strokeStyle='#e8a020'; rx.lineWidth=2.4; rx.lineCap='round'; for(var k=0;k<12;k++){ var a=k*0.5236; rx.beginPath(); rx.moveTo(Math.cos(a)*19,Math.sin(a)*19); rx.lineTo(Math.cos(a)*27,Math.sin(a)*27); rx.stroke(); }
  rx.fillStyle='#ffe066'; rx.strokeStyle=RN_INK; rx.lineWidth=1.8; rx.beginPath(); rx.arc(0,0,16,0,6.2832); rx.fill(); rx.stroke(); rx.save(); rx.translate(0,1); rx.scale(0.7,0.7); nMagnet(); rx.restore(); }
/* the ink blot (in sketch pixels: its half-width as the candy puddle's, 1.15 r) */
function nBlot(r){ rx.fillStyle='#1f3fa8'; rx.beginPath(); for(var k=0;k<18;k++){ var a=k/18*6.2832, rr=1+0.18*Math.sin(k*2.3); rx.lineTo(Math.cos(a)*r*1.15*rr,Math.sin(a)*r*0.64*rr); } rx.closePath(); rx.fill();
  [[1.45,-0.42,0.13],[-1.4,0.48,0.11],[0.97,0.67,0.085]].forEach(function(q){ rx.beginPath(); rx.arc(q[0]*r,q[1]*r,q[2]*r,0,6.2832); rx.fill(); }); rx.fillStyle='rgba(255,255,255,0.35)'; rx.beginPath(); rx.ellipse(-r*0.36,-r*0.21,r*0.3,r*0.09,0,0,6.2832); rx.fill(); }
/* the sprites, in the size of the candy ones: the cars 19 sketch pixels long like theirs; the gifts a little bigger (the audit of 29 Sep) */
/* ── v1.23, our rocket car «БД1» (the maintainer's pick of the sketches «Д, Б и их миксы»): drawn in pen and pencil — the wheels' tread
   and hubs, a seam, rivets, the lower side shaded in pencil strokes, the driver's red helmet under the canopy, the number 7, the fins
   hatched — and stuck into the notebook as a sticker: a white border and the sticker's soft shadow (nRocket's units, around 0,0) ── */
function nrBody(){ rx.beginPath(); rx.moveTo(26,0); rx.quadraticCurveTo(24,-10,10,-11); rx.lineTo(-20,-10); rx.lineTo(-20,10); rx.lineTo(10,11); rx.quadraticCurveTo(24,10,26,0); rx.closePath(); }
function nrFin(s){ rx.beginPath(); rx.moveTo(-16,s*10); rx.lineTo(-23,s*18); rx.lineTo(-7,s*10); rx.closePath(); }
function nrHatch(path,a,st,c,w,path2){ rx.save(); path(); rx.clip(); if(path2){ path2(); rx.clip(); } rx.strokeStyle=c; rx.lineWidth=w; rx.lineCap='round'; for(var k=-80;k<80;k+=st){ rx.beginPath(); rx.moveTo(k,-40); rx.lineTo(k+Math.tan(a)*80,40); rx.stroke(); } rx.restore(); }
var RN_WH=[[-10,-12],[12,-12],[-10,12],[12,12]];
function nOurs(){ var d=hs*rKS()*0.43, i;
  // the sticker: a white border round the whole silhouette, its shadow
  rx.save(); rx.shadowColor='rgba(40,40,60,0.35)'; rx.shadowBlur=0.6*d; rx.shadowOffsetX=0.2*d; rx.shadowOffsetY=0.32*d; rx.fillStyle='#fff'; rx.strokeStyle='#fff'; rx.lineWidth=6; rx.lineJoin='round';
  nrBody(); rx.fill(); rx.stroke(); [-1,1].forEach(function(s){ nrFin(s); rx.fill(); rx.stroke(); }); rx.beginPath(); rx.roundRect(-28,-6,9,12,2); rx.fill(); rx.stroke(); RN_WH.forEach(function(q){ rx.beginPath(); rx.roundRect(q[0]-5,q[1]-2.8,10,5.6,2); rx.fill(); rx.stroke(); }); rx.restore();
  // the wheels with their tread and hubs
  RN_WH.forEach(function(q){ rx.fillStyle=RN_INK; rx.beginPath(); rx.roundRect(q[0]-5,q[1]-2.8,10,5.6,2); rx.fill(); if(RPX) return; rx.strokeStyle='rgba(255,255,255,0.45)'; rx.lineWidth=0.5; for(var t=-3.5;t<4;t+=1.6){ rx.beginPath(); rx.moveTo(q[0]+t,q[1]-2.4); rx.lineTo(q[0]+t+0.6,q[1]+2.4); rx.stroke(); } rx.fillStyle='#8a8aa0'; rx.beginPath(); rx.arc(q[0],q[1],1.3,0,6.2832); rx.fill(); });
  // the nozzle with its rings, a pencil flame
  rx.fillStyle='#8a8aa0'; rx.beginPath(); rx.roundRect(-27,-5,7,10,2); rx.fill(); nFt(RN_INK,1.6); rx.stroke(); nFt(RN_INK,0.6); rx.beginPath(); rx.moveTo(-25,-5); rx.lineTo(-25,5); rx.moveTo(-23,-5); rx.lineTo(-23,5); rx.stroke();
  var fl=function(){ rx.beginPath(); rx.moveTo(-27,-4); rx.quadraticCurveTo(-36,-3,-42,0); rx.quadraticCurveTo(-36,3,-27,4); rx.closePath(); }; if(!RPX){ nrHatch(fl,1.2,1,'rgba(255,140,40,0.8)',0.6); fl(); nFt('#e07a20',0.8); rx.stroke(); }
  // the body: mint with white stripes, the lower side shaded, a seam, rivets, a doubled pen outline
  nrBody(); rx.fillStyle='#2fe0b0'; rx.fill(); rx.save(); nrBody(); rx.clip(); rx.fillStyle='#fff'; rx.fillRect(-22,-5,50,3); rx.fillRect(-22,2,50,3); rx.restore();
  if(!RPX){ nrHatch(nrBody,-0.6,1.5,'rgba(10,90,70,0.45)',0.45,function(){ rx.beginPath(); rx.rect(-30,3.5,60,20); });
  nFt(RN_INK,0.6); rx.beginPath(); rx.moveTo(-5,-10.5); rx.lineTo(-5,10.5); rx.stroke(); rx.fillStyle=RN_INK; [-16,-12,-8,14,18].forEach(function(X){ rx.beginPath(); rx.arc(X,-7.5,0.55,0,6.2832); rx.arc(X,7.5,0.55,0,6.2832); rx.fill(); }); }   // pixels: the small strokes would be noise
  [[0.35,-0.2],[-0.3,0.25]].forEach(function(o){ rx.save(); rx.translate(o[0],o[1]); nrBody(); nFt(RN_INK,1.5); rx.stroke(); rx.restore(); });
  // the canopy with the driver's helmet
  rx.fillStyle='#bfe8ff'; rx.beginPath(); rx.roundRect(2,-7,10,14,3.5); rx.fill(); rx.fillStyle='#e8283a'; rx.beginPath(); rx.arc(6,0,3.8,0,6.2832); rx.fill(); nFt('#23264a',1.4); rx.beginPath(); rx.arc(6,0,2.4,-1.1,1.1); rx.stroke(); rx.fillStyle='rgba(255,255,255,0.7)'; rx.beginPath(); rx.arc(4.8,-1.6,0.9,0,6.2832); rx.fill();
  nFt(RN_INK,1.4); rx.beginPath(); rx.roundRect(2,-7,10,14,3.5); rx.stroke(); nFt('rgba(255,255,255,0.9)',0.8); rx.beginPath(); rx.moveTo(9.5,-5); rx.quadraticCurveTo(11,-2,10.5,1); rx.stroke();
  // the fins hatched, the number, the headlights
  [-1,1].forEach(function(s){ nrFin(s); rx.fillStyle='#ff5a8a'; rx.fill(); if(!RPX) nrHatch(function(){ nrFin(s); },0.5,1.3,'rgba(150,20,60,0.5)',0.45); nrFin(s); nFt(RN_INK,1.4); rx.stroke(); });
  if(!RPX){ rx.save(); rx.translate(-13,1.6); rx.rotate(Math.PI/2); rx.font='bold 6px sans-serif'; rx.fillStyle=RN_INK; rx.textAlign='center'; rx.fillText('7',0,1.2); rx.restore(); }
  rx.fillStyle='#ffe066'; [-4,4].forEach(function(Y){ rx.beginPath(); rx.arc(23.5,Y,1.6,0,6.2832); rx.fill(); nFt('#c8901a',0.5); rx.stroke(); }); }
/* ── v1.23, the rivals redrawn, in another style than our sticker car so it stands out («соперникам другой стиль, чтоб наша выделялась»):
   six cars with their windows, roofs, a pickup's bed, a spoiler, the lights — a truck, a bus, a beetle, a saloon, a pickup, a sports car;
   the style RN_RIV: 'pen' (a hand-drawn outline, the colour in strokes), 'cpencil' (coloured pencils, a graphite outline, a hatched
   shadow), 'be2' their mix ── */
var RN_RIV='be2';   // the maintainer's pick «бе2»: the pen's hand-drawn outline and paper windows, the coloured pencils' strokes and hatched shadow
function nRR(X,Y,w,h,r){ return function(){ rx.beginPath(); rx.roundRect(X,Y,w,h,r); }; }
function nEL(X,Y,a,b){ return function(){ rx.beginPath(); rx.ellipse(X,Y,a,b,0,0,6.2832); }; }
function nPL(pts,open){ return function(){ rx.beginPath(); pts.forEach(function(p,i){ if(i) rx.lineTo(p[0],p[1]); else rx.moveTo(p[0],p[1]); }); if(!open) rx.closePath(); }; }
function nW4(a,b){ return [[a,-11],[b,-11],[a,11],[b,11]]; }
var RN_RCARS=[
 {w:[[-13,-11],[-4,-11],[13,-11],[-13,11],[-4,11],[13,11]],p:[[nRR(-21,-10,28,20,1.5),'b','#ffb52e'],[nPL([[-15,-10],[-15,10]],1),'l'],[nPL([[-9,-10],[-9,10]],1),'l'],[nPL([[-3,-10],[-3,10]],1),'l'],[nRR(8,-9,13,18,[1,5,5,1]),'b','#e8284a'],[nRR(14,-6.5,5,13,1.5),'g'],[nRR(9,-11,3,2,0.5),'d'],[nRR(9,9,3,2,0.5),'d']],lt:[[21,-6],[21,6]]},
 {w:nW4(-12,11),p:[[nRR(-21,-10,42,20,4),'b','#4fb8ff'],[nRR(-17,-7.5,5,15,1),'g'],[nRR(-10,-7.5,5,15,1),'g'],[nRR(-3,-7.5,5,15,1),'g'],[nRR(4,-7.5,5,15,1),'g'],[nRR(15,-8,4,16,1.5),'g'],[nPL([[-21,0],[13,0]],1),'l']],lt:[[20.5,-7],[20.5,7]]},
 {w:nW4(-10,10),p:[[nEL(0,0,19.5,11),'b','#e040c0'],[nEL(-14,-8,5,3.4),'b','#e040c0'],[nEL(-14,8,5,3.4),'b','#e040c0'],[nEL(11,-8,5,3.4),'b','#e040c0'],[nEL(11,8,5,3.4),'b','#e040c0'],[nEL(0,0,13,8.5),'b','#e040c0'],[nEL(6,0,4.5,7.5),'g'],[nEL(-8,0,3,5.5),'g']],lt:[[18,-5],[18,5]]},
 {w:nW4(-11,10),p:[[nRR(-20,-10,40,20,7),'b','#5a5a6e'],[nRR(-9,-7.5,13,15,2.5),'b','#7a7a8e'],[nRR(4,-7.5,6,15,2.5),'g'],[nRR(-14,-6.5,4.5,13,2),'g'],[nRR(5,-12,3,2.4,1),'d'],[nRR(5,9.6,3,2.4,1),'d']],lt:[[19,-6],[19,6]]},
 {w:nW4(-12,11),p:[[nRR(-21,-10,42,20,3),'b','#b87a3a'],[nRR(-19,-8,17,16,1),'d2'],[nPL([[-19,-3],[-2,-3]],1),'l'],[nPL([[-19,3],[-2,3]],1),'l'],[nRR(0,-8,10,16,2.5),'b','#c88a4a'],[nRR(10,-7,5,14,2),'g']],lt:[[20.5,-6],[20.5,6]]},
 {w:nW4(-11,11),p:[[nPL([[22,0],[16,-8],[-14,-10],[-20,-8],[-20,8],[-14,10],[16,8]]),'b','#e8284a'],[nRR(-23,-11,3.5,22,1),'d'],[nRR(-2,-6.5,10,13,3),'g'],[nPL([[-20,-1.3],[20,-1.3]],1),'s'],[nPL([[-20,1.3],[20,1.3]],1),'s']],lt:[[20,-4],[20,4]]}];
function nHP(path,a,st,c,w){ if(RPX){ path(); rx.fillStyle=c; rx.fill(); return; } rx.save(); path(); rx.clip(); rx.strokeStyle=c; rx.lineWidth=w; for(var k=-60;k<60;k+=st){ rx.beginPath(); rx.moveTo(k,-30); rx.lineTo(k+Math.tan(a)*60,30); rx.stroke(); } rx.restore(); }
function nWob(path,c,w){ (RPX?[[0,0]]:[[0.3,-0.2],[-0.25,0.2]]).forEach(function(o){ rx.save(); rx.translate(o[0],o[1]); path(); rx.strokeStyle=c; rx.lineWidth=w; rx.lineJoin='round'; rx.lineCap='round'; rx.stroke(); rx.restore(); }); }
function nMix(h,t){ var n=parseInt(h.slice(1),16), r=n>>16&255, g=n>>8&255, b=n&255; return 'rgb('+Math.round(r+(255-r)*t)+','+Math.round(g+(255-g)*t)+','+Math.round(b+(255-b)*t)+')'; }
function nLum(h){ var n=parseInt(h.slice(1),16); return ((n>>16&255)*0.3+(n>>8&255)*0.59+(n&255)*0.11)/255; }
var RN_RST={
 pen:{wheel:function(q){ var p=nRR(q[0]-3.6,q[1]-2.1,7.2,4.2,1.5); nHP(p,0.6,0.9,'#23264a',0.6); p(); rx.strokeStyle='#23264a'; rx.lineWidth=0.9; rx.stroke(); },
   b:function(p,c){ rx.fillStyle=nMix(c,RPX?0.3:0.82); p(); rx.fill(); if(!RPX) nHP(p,0.75,1.25,c,0.7); }, g:function(p){ rx.fillStyle='#fdfcf6'; p(); rx.fill(); }, d:function(p){ nHP(p,0.6,0.8,'#23264a',0.6); }, d2:function(p){ nHP(p,-0.6,1.2,'rgba(60,40,20,0.6)',0.5); },
   out:function(p,r){ nWob(p,'#23264a',r==='g'?0.7:1); }, l:'#23264a', s:'#fff', lt:'#ffd23f'},
 be2:{wheel:function(q){ RN_RST.pen.wheel(q); }, b:function(p,c){ RN_RST.cpencil.b(p,c); }, g:function(p){ RN_RST.pen.g(p); }, d:function(p){ RN_RST.pen.d(p); }, d2:function(p){ RN_RST.pen.d2(p); }, out:function(p,r){ RN_RST.pen.out(p,r); }, l:'#23264a', s:'#fff', lt:'#ffd23f', shadow:1},
 cpencil:{wheel:function(q){ var p=nRR(q[0]-3.6,q[1]-2.1,7.2,4.2,1.5); nHP(p,0.6,0.8,'rgba(35,38,74,0.9)',0.6); p(); rx.strokeStyle='rgba(35,38,74,0.9)'; rx.lineWidth=0.7; rx.stroke(); },
   b:function(p,c){ if(RPX){ p(); rx.fillStyle=c; rx.fill(); return; } nHP(p,0.6,0.95,c,0.75); nHP(p,-0.6,2.2,c,0.5); }, g:function(p){ nHP(p,-0.6,1.1,'rgba(120,190,240,0.9)',0.6); }, d:function(p){ nHP(p,0.6,0.7,'rgba(35,38,74,0.9)',0.6); }, d2:function(p){ nHP(p,-0.6,1,'rgba(90,60,30,0.7)',0.5); },
   out:function(p){ nWob(p,'rgba(50,50,65,0.85)',0.8); }, l:'rgba(50,50,65,0.7)', s:'rgba(255,255,255,0.9)', lt:'#ffd23f', shadow:1}};
function nRival(k){ var c=RN_RCARS[k], st=RN_RST[RN_RIV]||RN_RST.pen;
  if(st.shadow&&!RPX){ rx.save(); rx.translate(1.6,2.2); c.p.forEach(function(q){ if(q[1]==='b') nHP(q[0],0.8,1.3,'rgba(70,70,90,0.3)',0.45); }); c.w.forEach(function(q){ nHP(nRR(q[0]-3.6,q[1]-2.1,7.2,4.2,1.5),0.8,1.3,'rgba(70,70,90,0.3)',0.45); }); rx.restore(); }
  c.w.forEach(function(q){ st.wheel(q); });
  c.p.forEach(function(q){ var p=q[0], r=q[1]; if(r==='b'){ st.b(p,q[2]); st.out(p,r); } else if(r==='g'){ st.g(p); st.out(p,r); } else if(r==='d') st.d(p); else if(r==='d2'){ st.d2(p); st.out(p,r); } else if(r==='l'){ p(); rx.strokeStyle=st.l; rx.lineWidth=0.6; rx.stroke(); } else { p(); rx.strokeStyle=st.s; rx.lineWidth=1.4; rx.stroke(); } });
  c.lt.forEach(function(q){ rx.fillStyle=st.lt; rx.beginPath(); rx.arc(q[0],q[1],1.3,0,6.2832); rx.fill(); rx.strokeStyle='rgba(35,38,74,0.6)'; rx.lineWidth=0.4; rx.stroke(); });
  rx.fillStyle='#e8283a'; rx.fillRect(-20.1,-8.2,1.2,2.4); rx.fillRect(-20.1,5.8,1.2,2.4); }
function noteCar(kind,player){ if(player){ rx.scale(0.43,0.43); nOurs(); return; } rx.scale(0.5,0.5); nRival(kind%6); }
/* ── v1.23, the gifts (the maintainer's picks: «топливо Б, монета А, магнит А, суперп А, клякса Б»): the petrol pump drawn in pen and
   strokes — a window with figures, a hose with its nozzle, a base; the ink blot with splashes, a drip and a shine ── */
function nHatchP(path,a,st,c,w){ if(RPX){ path(); rx.fillStyle=c; rx.globalAlpha=0.55; rx.fill(); rx.globalAlpha=1; return; } rx.save(); path(); rx.clip(); rx.strokeStyle=c; rx.lineWidth=w; for(var k=-60;k<60;k+=st){ rx.beginPath(); rx.moveTo(k,-40); rx.lineTo(k+Math.tan(a)*80,40); rx.stroke(); } rx.restore(); }
function nPump2(){ var body=function(){ rx.beginPath(); rx.roundRect(-9,-13,15,27,3); };
  rx.fillStyle='#bff0cc'; body(); rx.fill(); nHatchP(body,0.7,1.3,'#2fa860',0.7); nWob(body,RN_INK,1.6);
  rx.fillStyle='#fff'; rx.fillRect(-6,-10,9,7); rx.strokeStyle=RN_INK; rx.lineWidth=1; rx.strokeRect(-6,-10,9,7); if(!RPX){ rx.font='bold 4px monospace'; rx.fillStyle=RN_INK; rx.fillText('88',-5,-5); }
  nF(-1.8,4,2,'#ffffff');
  rx.strokeStyle=RN_INK; rx.lineWidth=1.6; rx.lineCap='round'; rx.beginPath(); rx.moveTo(6,-6); rx.quadraticCurveTo(15,-6,12.5,6); rx.lineTo(12.5,9); rx.stroke(); rx.fillStyle='#8a8aa0'; rx.beginPath(); rx.roundRect(10,8,6,4,1); rx.fill(); rx.stroke(); rx.fillStyle=RN_INK; rx.fillRect(-10,13,17,2.5); }
function nBlot2(r){ var k=r/8, i; rx.save(); rx.scale(k,k); rx.fillStyle='#1f3fa8'; rx.beginPath(); for(i=0;i<26;i++){ var a=i/26*6.2832, q=1+0.22*Math.sin(i*2.3)+0.1*Math.sin(i*5.1); rx.lineTo(Math.cos(a)*9.2*q,Math.sin(a)*5.2*q); } rx.closePath(); rx.fill();
  rx.fillStyle='#16307e'; rx.beginPath(); rx.ellipse(1,0.6,5,2.6,0.1,0,6.2832); rx.fill(); rx.fillStyle='#1f3fa8'; [[12,-3,1.2],[-11.5,4,0.9],[8,5.4,0.7],[-6,-6,0.6],[14,1,0.5]].forEach(function(q){ rx.beginPath(); rx.arc(q[0],q[1],q[2],0,6.2832); rx.fill(); });
  rx.beginPath(); rx.moveTo(2,4); rx.quadraticCurveTo(3,9,2.5,11); rx.arc(2.5,11.6,1.1,-1.5,4.6); rx.quadraticCurveTo(1,8,0,4); rx.fill();
  rx.fillStyle='rgba(255,255,255,0.45)'; rx.beginPath(); rx.ellipse(-3,-2,3,0.9,-0.1,0,6.2832); rx.fill(); rx.beginPath(); rx.arc(3.5,-1.8,0.6,0,6.2832); rx.fill(); rx.restore(); }
function noteGift(t){ if(t==='fuel'){ rx.scale(0.62,0.62); nPump2(); } else if(t==='coin'){ rx.scale(0.55,0.55); nStar(8); } else if(t==='magnet'){ rx.scale(0.5,0.5); nMagnet(); } else if(t==='bubble'){ rx.scale(0.55,0.55); nKnight(); } else if(t==='tmagnet'||t==='tbubble'){ rx.scale(0.5,0.5); nSuper(); } }
/* ── v1.23, the effects (the maintainer's picks: «выхлоп А, турбо Б, магнит Б, щит А, клякса Б, авария Б, след В»; the pick-up's sparks
   stay): pencil loops of smoke behind the car, a broad highlighter streak for the turbo, double red-pencil arcs for the magnet, the car
   circled twice in blue pen for the shield, ink tracks from the wheels after a blot, stars circling and strike lines after a crash, and
   the tyres' tread printed in pencil on the road, left there till it goes off the screen (the candy land's track history, 48_racecandy.js).
   Car-frame units: our car's own (0.43 of a sketch pixel) ── */
function nLoop(X,Y,r,u){ hx.beginPath(); for(var a=0;a<6*Math.PI;a+=0.3) hx.lineTo((X-a*0.9+Math.cos(a)*r)*u,(Y+Math.sin(a)*r)*u); hx.stroke(); }
function nTread(X,dd,u){ var x0=X-10*u, st=1.3, i, k; hx.strokeStyle='rgba(70,70,90,0.5)'; hx.lineWidth=0.9*u; hx.lineCap='round';
  for(i=CW_TR.length-1;i>0;i--){ var p=CW_TR[i], q=CW_TR[i-1], xa=x0-(dd-p.d)*K; if(xa<-6) break; if(p.d-q.d>40) continue;
    for(var n=Math.ceil(q.d/st);n*st<p.d;n++){ var f=(n*st-q.d)/Math.max(1e-6,p.d-q.d), y=q.y+(p.y-q.y)*f, tx=x0-(dd-n*st)*K;
      for(k=-1;k<=1;k+=2){ var ty=y+k*12*u; hx.beginPath(); hx.moveTo(tx,ty-2.4*u); hx.lineTo(tx-1.4*u,ty+2.4*u); hx.stroke(); } } } }
function nInkTrack(X,dd,u){ if(!cwTrackOn()) return; hx.strokeStyle='#1f3fa8'; hx.lineCap='round';
  for(var i=CW_TR.length-1;i>0;i--){ var p=CW_TR[i], q=CW_TR[i-1]; if(!p.on||!q.on) continue; var d=(clock-q.t)/0.9; if(d>=1) continue; var x1=X-14*u-(dd-p.d)*K, x2=X-14*u-(dd-q.d)*K;
    hx.globalAlpha=(1-d)*0.85; hx.lineWidth=3.2*(1-d*0.5)*u; [-12,12].forEach(function(w){ hx.beginPath(); hx.moveTo(x1,p.y+w*u); hx.lineTo(x2,q.y+w*u); hx.stroke(); }); } hx.globalAlpha=1; }
function nStar5(X,Y,r,c,w,fill){ hx.beginPath(); for(var k=0;k<11;k++){ var a=-1.5708+k*0.6283, q=k%2?r*0.45:r; hx.lineTo(X+Math.cos(a)*q,Y+Math.sin(a)*q); } hx.closePath(); if(fill){ hx.fillStyle=fill; hx.fill(); } hx.strokeStyle=c; hx.lineWidth=w; hx.stroke(); }
function nPlayer(rg,s,X,Y,blink){ var u=K/SU*rCarK*0.43, t=clock, m, i; cwTrack(s,Y,rg.d);
  nTread(X,rg.d,u); nInkTrack(X,rg.d,u);
  if(s.magnet>0&&(s.magnet>2||Math.floor(t*8)%2)) for(m=0;m<3;m++){ var ph=(t*1.4+m/3)%1, R=(26+ph*44)*u; hx.globalAlpha=1-ph*0.8; hx.strokeStyle='rgba(232,40,74,0.75)'; hx.lineWidth=1.3*u; [0,1.6].forEach(function(o){ hx.beginPath(); hx.arc(X+0.5*o*u,Y+0.4*o*u,R+o*u,-0.8,0.8); hx.stroke(); }); } hx.globalAlpha=1;
  if(!blink){ hx.save(); hx.translate(X,Y); hx.rotate(rTilt);
    if(s.turbo>0){ hx.lineCap='round'; var jl=Math.sin(t*30)*4; [['rgba(255,226,80,0.55)',22],['rgba(190,240,90,0.45)',12]].forEach(function(q){ hx.strokeStyle=q[0]; hx.lineWidth=q[1]*u; hx.beginPath(); hx.moveTo(-28*u,0); hx.lineTo((-110+jl)*u,0); hx.stroke(); });
      hx.strokeStyle='#23264a'; hx.lineWidth=0.9*u; [[-15,-40,-70],[15,-44,-66]].forEach(function(q,j){ var jx=((t*9+j*0.37)%1)*8; hx.beginPath(); hx.moveTo((q[1]-jx)*u,q[0]*u); hx.lineTo((q[2]-jx)*u,q[0]*u); hx.stroke(); }); }
    hx.strokeStyle='rgba(70,70,90,0.8)'; hx.lineWidth=0.9*u; for(i=0;i<3;i++){ var ph2=(t*1.6+i/3)%1; hx.globalAlpha=Math.max(0,0.9-ph2*0.9); nLoop(-34-ph2*30,(i-1)*1.2,4.2-ph2*1.6,u); } hx.globalAlpha=1;
    hx.restore(); var cs=rCarSprite(0,true); if(rCarK!==1){ hx.save(); hx.translate(X,Y); hx.rotate(rTilt); hx.drawImage(cs.c,-cs.w*rCarK/2,-cs.h*rCarK/2,cs.w*rCarK,cs.h*rCarK); hx.restore(); } else rBlit(cs,X,Y,rTilt); }
  if(s.bubble>0&&(s.bubble>3||Math.floor(t*8)%2)){ hx.save(); hx.translate(X,Y); hx.rotate(rTilt); hx.strokeStyle='#1f3fa8'; hx.lineWidth=1.5*u; hx.lineJoin='round'; hx.beginPath(); for(var a=0;a<4.3*Math.PI;a+=0.12){ var r=33+Math.sin(a*1.3+t*2)*1.6+a*0.35; hx.lineTo(Math.cos(a)*r*1.12*u,Math.sin(a)*r*0.82*u); } hx.stroke(); hx.restore(); }
  var age=t-cwDazeT; if(age>=0&&age<1.5){ hx.globalAlpha=Math.min(1,(1.5-age)*3); hx.strokeStyle='rgba(35,38,74,0.5)'; hx.lineWidth=0.8*u; hx.beginPath(); hx.ellipse(X+4*u,Y-26*u,20*u,6*u,0,0,6.2832); hx.stroke();
    for(i=0;i<3;i++){ var b=t*5+i*2.094; nStar5(X+(4+Math.cos(b)*20)*u,Y+(-26+Math.sin(b)*6)*u,4.2*u,'#23264a',0.9*u,'#ffe066'); }
    if(age<0.5){ hx.strokeStyle='#23264a'; hx.lineWidth=1.3*u; [[30,-8,44,-16],[32,0,48,0],[30,8,44,16]].forEach(function(q){ hx.beginPath(); hx.moveTo(X+q[0]*u,Y+q[1]*u); hx.lineTo(X+q[2]*u,Y+q[3]*u); hx.stroke(); }); } hx.globalAlpha=1; }  nPickFx(); }
function nPlayerPx(rg,s,X,Y,blink){ var u=K/SU*rCarK*0.43, x=Math.round(X), y=Math.round(Y), t=clock, m, i; cwTrack(s,y,rg.d);
  var x0=x-10*u, st=1.3; for(i=CW_TR.length-1;i>0;i--){ var p=CW_TR[i], q=CW_TR[i-1]; if(x0-(rg.d-p.d)*K<-4) break; if(p.d-q.d>40) continue; for(var n=Math.ceil(q.d/st);n*st<p.d;n++){ if(n%2) continue; var f=(n*st-q.d)/Math.max(1e-6,p.d-q.d), yy=q.y+(p.y-q.y)*f, tx=Math.round(x0-(rg.d-n*st)*K); hx.fillStyle='#9a9aac'; hx.fillRect(tx,Math.round(yy-12*u)-1,1,2); hx.fillRect(tx,Math.round(yy+12*u)-1,1,2); } }
  if(cwTrackOn()) for(i=CW_TR.length-1;i>0;i--){ var p2=CW_TR[i]; if(clock-p2.t>0.9) break; if(!p2.on) continue; var tx2=Math.round(x-14*u-(rg.d-p2.d)*K); hx.fillStyle='#1f3fa8'; hx.fillRect(tx2-1,Math.round(p2.y-12*u)-1,3,2); hx.fillRect(tx2-1,Math.round(p2.y+12*u)-1,3,2); }
  if(s.magnet>0&&(s.magnet>2||Math.floor(t*8)%2)) for(m=0;m<3;m++){ var ph=(t*1.4+m/3)%1, R=(26+ph*44)*u; if(ph>0.8) continue; hx.fillStyle='#e8284a'; for(var a=-0.8;a<=0.8;a+=1/R){ hx.fillRect(Math.round(x+Math.cos(a)*R),Math.round(y+Math.sin(a)*R),1,1); hx.fillRect(Math.round(x+Math.cos(a)*(R+2)),Math.round(y+Math.sin(a)*(R+2)),1,1); } }
  if(!blink){ if(s.turbo>0){ hx.fillStyle='#ffe250'; hx.fillRect(Math.round(x-100*u),Math.round(y-8*u),Math.round(72*u),Math.round(16*u)); hx.fillStyle='#bff05a'; hx.fillRect(Math.round(x-100*u),Math.round(y-4*u),Math.round(72*u),Math.round(8*u)); }
    for(i=0;i<3;i++){ var ph2=(t*1.6+i/3)%1; if(ph2>0.8) continue; pxRing(x+(-34-ph2*30)*u,y+(i-1)*1.2*u,Math.max(1.5,(4.2-ph2*1.6)*u),'#8a8aa0'); }
    var cs=rCarSprite(0,true,rTilt); if(rCarK!==1) hx.drawImage(cs.c,Math.round(x-cs.w*rCarK/2),Math.round(y-cs.h*rCarK/2),cs.w*rCarK,cs.h*rCarK); else rBlit(cs,x,y,0); }
  if(s.bubble>0&&(s.bubble>3||Math.floor(t*8)%2)){ hx.fillStyle='#1f3fa8'; for(var b=0;b<4.3*Math.PI;b+=0.05){ var r=(33+b*0.35)*u; hx.fillRect(Math.round(x+Math.cos(b)*r*1.12),Math.round(y+Math.sin(b)*r*0.82),1,1); } }
  var age=t-cwDazeT; if(age>=0&&age<1.5) for(m=0;m<3;m++){ var c=t*5+m*2.094, sx=Math.round(x+(4+Math.cos(c)*20)*u), sy=Math.round(y+(-26+Math.sin(c)*6)*u); hx.fillStyle='#23264a'; hx.fillRect(sx-2,sy-1,5,3); hx.fillRect(sx-1,sy-2,3,5); hx.fillStyle='#ffe066'; hx.fillRect(sx-1,sy,3,1); hx.fillRect(sx,sy-1,1,3); }  nPickFx(); }
/* the pick-ups («сбор подарка А»): what was taken written in pen where it was — «+10» for a coin, «+50» for a whole line, «fuel!»,
   «magnet!», «shield!», «SUPER!» with a red tick — rising a little and fading */
var RN_FX=[], RN_FXT={coin:'+10',line:'+50',fuel:'fuel!',magnet:'magnet!',bubble:'shield!',tmagnet:'SUPER!',tbubble:'SUPER!'};
function nPickFx(){ var px=RPX; RN_FX=RN_FX.filter(function(f){ return clock-f.t<1&&clock>=f.t; });
  RN_FX.forEach(function(f){ var a=clock-f.t, s=RN_FXT[f.k]||'+10', X=f.x, Y=f.y-8-a*16, fs=f.k==='coin'?11:12; hx.globalAlpha=Math.min(1,(1-a)*2.5);
    hx.save(); hx.translate(px?Math.round(X):X,px?Math.round(Y):Y); hx.rotate(-0.08); hx.font=(px?'bold ':'italic bold ')+fs+'px '+RN_HAND; hx.fillStyle='#1f3fa8'; hx.textBaseline='middle'; hx.fillText(s,-6,0);
    if(f.k!=='coin'&&f.k!=='line'){ var w=hx.measureText(s).width; hx.strokeStyle='#d8283a'; hx.lineWidth=px?2:1.8; hx.lineCap='round'; hx.lineJoin='round'; hx.beginPath(); hx.moveTo(w-2,0); hx.lineTo(w+1,3.5); hx.lineTo(w+7,-5); hx.stroke(); }
    hx.restore(); }); hx.globalAlpha=1; }
