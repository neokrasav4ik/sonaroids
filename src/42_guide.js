/* ── FIRST-LAUNCH PICTURES («volume» look, agreed 24 Sep): the table seen from the front-left and above, the phone lying flat,
   the palm hovering by the short edge with the charging port. The palm is slightly smaller than real, the phone 1.6× larger
   than real so its screen is readable: a tiny ship on it follows the palm. Drawn with the port on the right;
   for a left-handed player the whole picture is mirrored (labels are not). ── */
function polyFill(pts,c){ lx.fillStyle=c; var y0=Math.floor(Math.min.apply(null,pts.map(function(p){return p[1];}))), y1=Math.ceil(Math.max.apply(null,pts.map(function(p){return p[1];})));
  for(var y=y0;y<=y1;y++){ var xs=[], yy=y+0.5; for(var a=0,b=pts.length-1;a<pts.length;b=a++){ var A=pts[a],B=pts[b]; if((A[1]>yy)!==(B[1]>yy)) xs.push(A[0]+(yy-A[1])*(B[0]-A[0])/(B[1]-A[1])); }
    xs.sort(function(p,q){return p-q;}); for(var i=0;i+1<xs.length;i+=2){ var xa=Math.round(xs[i]), xb=Math.round(xs[i+1]); if(xb>xa) lx.fillRect(xa,y,xb-xa,1); } } }
function ease(x){ x=Math.max(0,Math.min(1,x)); return x*x*(3-2*x); }
function waveH(t){ return 0.5+0.5*Math.sin(t*2.4-Math.PI/2); }       // demo waving: 0 — 5 cm, 1 — 15 cm (v0.26: back from 4–12)
/* oblique projection "front-left, from above": the long side of the phone runs along the screen */
function iso(X,Y,Z,o){ return [o[0]+X+0.42*Y, o[1]+0.62*Y-Z]; }
function unIso(sx,sy,o){ var Y=(sy-o[1])/0.62; return [sx-o[0]-0.42*Y, Y]; }
function polyA(pts,c,al){ if(al===undefined||al>=1){ polyFill(pts,c); return; } if(al<=0) return;
  lx.fillStyle=c; var y0=Math.floor(Math.min.apply(null,pts.map(function(p){return p[1];}))), y1=Math.ceil(Math.max.apply(null,pts.map(function(p){return p[1];})));
  for(var y=y0;y<=y1;y++){ var xs=[], yy=y+0.5; for(var a=0,b=pts.length-1;a<pts.length;b=a++){ var A=pts[a],B=pts[b]; if((A[1]>yy)!==(B[1]>yy)) xs.push(A[0]+(yy-A[1])*(B[0]-A[0])/(B[1]-A[1])); }
    xs.sort(function(p,q){return p-q;}); for(var i=0;i+1<xs.length;i+=2) for(var x=Math.round(xs[i]);x<Math.round(xs[i+1]);x++) if(bay(x,y)<al) lx.fillRect(x,y,1,1); } }
function box(x0,x1,y0,y1,z0,z1,o,cT,cX,cY,al){                         // a block: top, front (+Y, towards the player) and left (−X) faces
  polyA([iso(x0,y0,z0,o),iso(x0,y1,z0,o),iso(x0,y1,z1,o),iso(x0,y0,z1,o)],cX,al);
  polyA([iso(x0,y1,z0,o),iso(x1,y1,z0,o),iso(x1,y1,z1,o),iso(x0,y1,z1,o)],cY,al);
  polyA([iso(x0,y0,z1,o),iso(x1,y0,z1,o),iso(x1,y1,z1,o),iso(x0,y1,z1,o)],cT,al); }
function slab(bx,by,d,nb,len,z0,z1,t,ch,o,cF,cT,al){       // a block turned in plan: base (bx,by), length along d, height z0…z1, thickness t along nb (away from the viewer); ch — rounded end
  var ex=bx+d[0]*len, ey=by+d[1]*len, cx=ex-d[0]*ch, cy=ey-d[1]*ch, c2=Math.min(ch,(z1-z0)/2);
  polyA([iso(bx,by,z0,o),iso(cx,cy,z0,o),iso(ex,ey,z0+c2,o),iso(ex,ey,z1-c2,o),iso(cx,cy,z1,o),iso(bx,by,z1,o)],cF,al);
  polyA([iso(bx,by,z1,o),iso(cx,cy,z1,o),iso(cx+nb[0]*t,cy+nb[1]*t,z1,o),iso(bx+nb[0]*t,by+nb[1]*t,z1,o)],cT,al); }
function handIso(Xa,Yb,hz,o,cm,al){                                    // Xa — palm edge by the phone, Yb — wrist, hz — top of the palm
  var HS={t:P.hand[1],h:P.hand[2],x:P.hand[0],y:'#9A7274'}, w=8.5*cm, Xb=Xa+w, Ya=Yb-10*cm, th=2.4*cm, L=[7.4,8.4,7.9,6.3], fw=w/4, i;
  for(i=0;i<4;i++){ var fx0=Xa+i*fw+0.35*cm, fx1=Xa+(i+1)*fw-0.35*cm;
    box(fx0,fx1,Ya-L[i]*cm,Ya,hz-1.9*cm,hz-0.35*cm,o,HS.t,HS.x,HS.y,al);
    var tip=iso((fx0+fx1)/2,Ya-L[i]*cm+0.9*cm,hz-0.35*cm,o); if(al>0.5) R(HS.h,tip[0]-1,tip[1],2,1); }
  box(Xa,Xb,Ya,Yb,hz-th,hz,o,HS.t,HS.x,HS.y,al);
  box(Xa-4.6*cm,Xa+0.2*cm,Ya+4.2*cm,Ya+6.4*cm,hz-2.7*cm,hz-0.9*cm,o,HS.t,HS.x,HS.y,al);          // thumb, towards the phone
  for(i=0;i<4;i++){ var k2=iso(Xa+(i+0.5)*fw,Ya+0.7*cm,hz,o); if(al>0.5) R(HS.x,k2[0]-1,k2[1],2,1); }
  var e0=iso(Xa+0.5*cm,Ya+0.3*cm,hz,o), e1=iso(Xb-0.5*cm,Ya+0.3*cm,hz,o); if(al>0.5) for(var q=0;q<=1;q+=0.05) R(HS.h,e0[0]+(e1[0]-e0[0])*q,e0[1]+(e1[1]-e0[1])*q,1,1);
  box(Xa+0.8*cm,Xb-0.8*cm,Yb,Yb+11*cm,hz-3.2*cm,hz-0.2*cm,o,HS.t,HS.x,HS.y,al);                 // forearm, towards the player,
  box(Xa+0.8*cm,Xb-0.8*cm,Yb+11*cm,Yb+17*cm,hz-3.4*cm,hz-0.4*cm,o,HS.t,HS.x,HS.y,al*0.55);      // fading further on
}
var PSC=1.6;
function portLabel(ph,o,labels){ var y=Math.round(iso(ph.X1,ph.Y1,0,o)[1])+5, x=Math.round(ph.port[0]);          // v0.35: under the phone, the arrow points up at the port
  labels.push({x:x,y:y,t:'↑',c:P.pick,a:'center'}); labels.push({x:x,y:y+10,t:L(ph.cam?'cam':'port'),c:P.pick,a:'center'}); }
function phoneIso(o,cm,portOn,cam){                                          // cam: the hand's end is the front-camera end (v0.17)
  var X0=-7.5*cm*PSC,X1=7.5*cm*PSC,Y0=-3.6*cm*PSC,Y1=3.6*cm*PSC,Zp=1.0*cm, q;
  box(X0,X1,Y0,Y1,0,Zp,o,P.rock[2],P.rock[1],P.rock[0]);
  polyFill([iso(X0+0.5*cm,Y0+0.45*cm,Zp,o),iso(X1-0.5*cm,Y0+0.45*cm,Zp,o),iso(X1-0.5*cm,Y1-0.45*cm,Zp,o),iso(X0+0.5*cm,Y1-0.45*cm,Zp,o)],P.bg);
  for(var g=0;g<2;g++){ var a0=iso(X0+(2.2+g*1.3)*cm,Y1-0.8*cm,Zp,o), a1=iso(X0+(3.6+g*1.3)*cm,Y0+0.8*cm,Zp,o);
    for(q=0;q<=1;q+=0.06) if(bay(Math.round(a0[0]+(a1[0]-a0[0])*q),Math.round(a0[1]+(a1[1]-a0[1])*q))<0.5) R(P.neb[1],a0[0]+(a1[0]-a0[0])*q,a0[1]+(a1[1]-a0[1])*q,1,1); }
  var PX=cam?X0:X1, pa=iso(PX,-0.9*cm,Zp,o), pb=iso(PX,0.9*cm,Zp,o), port=iso(PX,0,Zp,o); for(q=0;q<=1;q+=0.1) R(!cam&&portOn?P.pick:P.rock[3],pa[0]+(pb[0]-pa[0])*q,pa[1]+(pb[1]-pa[1])*q,1,1);
  var camP=iso(X1-0.25*cm,0,Zp,o); if(cam){ R(portOn?P.pick:P.rock[0],camP[0]-1,camP[1]-1,3,3); R(P.bg,camP[0],camP[1],1,1); }       // the front camera: a dot at the hand's end
  return {X0:X0,X1:X1,Y0:Y0,Y1:Y1,Zp:Zp,port:cam?camP:port,cam:!!cam};
}
/* the tiny game on the drawn phone's screen. It is drawn after the picture is mirrored: a turned-over phone turns its screen too,
   so the ship stays on the player's left and flies right */
function phoneGame(ph,o,cm,f,T,mirror){
  var m=0.9*cm, x0=ph.X0+m, x1=ph.X1-m, y0=ph.Y0+m, y1=ph.Y1-m, W0=x1-x0, H0=y1-y0;
  function at(u,v){ if(!mirror) return iso(x0+u*W0,y0+v*H0,ph.Zp,o); var p=iso(x0+(1-u)*W0,y0+v*H0,ph.Zp,o); return [LW-p[0],p[1]]; }
  for(var i=0;i<14;i++){ var u=((i*0.137+T*0.05*(1+i%3))%1), v=(i*0.311)%1, p=at(1-u,v); R(i%3?P.stars[1]:P.stars[2],p[0],p[1],1,1); }
  [[0.62,0.3,3],[0.83,0.68,2],[0.45,0.8,2]].forEach(function(r,j){ var u=(((r[0]-T*0.04*(j+1))%1)+1)%1*0.9+0.08, p=at(u,r[1]);
    R(P.rock[3],p[0]-1,p[1]-1,r[2],r[2]); R(P.rock[2],p[0],p[1],r[2]-1,r[2]-1); });
  var sp=at(0.12,0.12+(1-f)*0.76); blit(SHIP_MAP,P.ship,Math.round(sp[0])-2,Math.round(sp[1])-5);
  for(var b=0;b<3;b++){ var bu=((T*0.9+b/3)%1)*0.7+0.22, bp=at(bu,0.12+(1-f)*0.76); R(P.bullet,bp[0],bp[1],3,1); }
}
/* the scene. id: 'phone' | 'away' | 'wave'; t — seconds on this screen; f — palm height 0…1 (5…15 cm); away — 0…1 how far the hand has left;
   waves — probe waves on. Returns labels (in picture coordinates) */
var tableC=null;
function scene(id,t,f,away,waves,T,lay){
  var cm=Math.min(LH*0.024,LW*0.0135)*(lay?lay.k:1), o=lay?[LW*lay.ox,LH*lay.oy+23.6*cm]:[LW*0.43,LH*0.16+23.6*LH*0.024], labels=[];      // narrow screens (iPad): scale to the width
  var TX0=-21.1*cm, TX=31.1*cm, TY0=-13.3*cm, TY1=17.3*cm, fl=iso(TX0,TY0,0,o)[0];          // v0.35: the table 10% smaller
  if(lay&&!lay.solo&&fl<LW*0.04) TX0+=LW*0.04-fl;                                     // and, beside the second picture, it stops short of the left edge
  var fr=iso(TX,TY1,0,o)[0]; if(lay&&!lay.solo&&fr>LW*0.47) TX-=fr-LW*0.47;           // …and of the middle, where the second picture starts
  var tkey=LW+'x'+LH+(lay?':'+lay.ox+':'+lay.k:'');
  if(!tableC||tableC._k!==tkey){ tableC=document.createElement('canvas'); tableC.width=LW; tableC.height=LH; tableC._k=tkey; var keep=lx; lx=tableC.getContext('2d');
    polyFill([iso(TX0,TY0,0,o),iso(TX,TY0,0,o),iso(TX,TY1,0,o),iso(TX0,TY1,0,o)],P.neb[1]);
    for(var yy=0;yy<LH;yy+=3) for(var xx=(yy%6?2:0);xx<LW;xx+=4){ var q0=unIso(xx,yy,o); if(q0[0]>TX0&&q0[0]<TX&&q0[1]>TY0&&q0[1]<TY1) R(P.neb[2],xx,yy,1,1); }
    var tc=[iso(TX0,TY0,0,o),iso(TX,TY0,0,o),iso(TX,TY1,0,o),iso(TX0,TY1,0,o)];                   // v0.35: a thin edge, so the table never melts into the nebula behind it
    for(var e=0;e<4;e++){ var e0=tc[e], e1=tc[(e+1)%4], n=Math.ceil(Math.max(Math.abs(e1[0]-e0[0]),Math.abs(e1[1]-e0[1])));
      for(var u=0;u<=n;u++) R(P.stars[0],e0[0]+(e1[0]-e0[0])*u/n,e0[1]+(e1[1]-e0[1])*u/n,1,1); }
    lx=keep; }
  lx.drawImage(tableC,0,0);
  var ph=phoneIso(o,cm,id==='phone'&&Math.floor(T*3)%2===0,typeof camEnd==='function'&&camEnd());
  var HSC=0.85, hw=8.5*cm*HSC, Xa=ph.X1+1.2*cm, Yb=5*cm, al=1, Z5=5*cm, Z15=15*cm;          // v0.26: back to 5–15 cm (4–12 was tried in v0.22–0.25)
  var hz=Z5+(Z15-Z5)*f+2.4*cm*HSC, dy=0;
  if(id==='phone') dy=(1-ease(t/1.8))*28*cm;
  if(away>0){ var q=ease(away); dy=q*30*cm; hz+=q*8*cm; al=1-q; }
  if(al>0.1){ var sc=[Xa+hw/2,Yb-8*cm*HSC+dy], dens=Math.max(0.15,0.8-(hz/cm)*0.035)*al;       // the palm's shadow: paler the higher it is
    var rx=5.2*cm*HSC, ry=11*cm*HSC, c4=[iso(sc[0]-rx,sc[1]-ry,0,o),iso(sc[0]+rx,sc[1]-ry,0,o),iso(sc[0]-rx,sc[1]+ry,0,o),iso(sc[0]+rx,sc[1]+ry,0,o)];
    var bx0=Math.max(0,Math.floor(Math.min(c4[0][0],c4[1][0],c4[2][0],c4[3][0]))), bx1=Math.min(LW,Math.ceil(Math.max(c4[0][0],c4[1][0],c4[2][0],c4[3][0])));
    var by0=Math.max(0,Math.floor(Math.min(c4[0][1],c4[1][1],c4[2][1],c4[3][1]))), by1=Math.min(LH,Math.ceil(Math.max(c4[0][1],c4[1][1],c4[2][1],c4[3][1])));
    lx.fillStyle=P.neb[0];
    for(var y2=by0;y2<by1;y2++) for(var x2=bx0;x2<bx1;x2++){ var q1=unIso(x2,y2,o), ex=(q1[0]-sc[0])/rx, ey=(q1[1]-sc[1])/ry; if(ex*ex+ey*ey<1&&bay(x2,y2)<dens) lx.fillRect(x2,y2,1,1); } }
  if(waves) for(var i=0;i<3;i++){ var rr=((T*6+i*4.5)%13.5)*cm+1*cm;
    for(var a=-1.4;a<=1.4;a+=0.05){ var pp=iso(ph.X1+Math.cos(a)*rr,Math.sin(a)*rr,0,o); R(P.bullet,pp[0],pp[1],1,1); } }
  if(id==='wave'){ var rX=Xa+hw+8.5*cm, rY=Yb-12*cm, b0=iso(rX,rY,0,o), b5=iso(rX,rY,Z5,o), b15=iso(rX,rY,Z15,o);         // a 5–15 cm ruler
    dots(b0[0],b0[1],b15[1],P.soft); R(P.soft,b5[0]-3,b5[1],7,1); R(P.soft,b15[0]-3,b15[1],7,1);
    labels.push({x:b15[0]+6,y:b15[1]-3,t:'10 '+L('cm'),c:P.soft});   /* v0.31: the numbers say 5–10 (plays better, the maintainer); the ruler and tuning are unchanged */ labels.push({x:b5[0]+6,y:b5[1]-3,t:'5 '+L('cm'),c:P.soft}); }
  if(al>0.5&&id!=='phone'){ var d0=iso(Xa+hw,Yb,0,o), d1=iso(Xa+hw,Yb,hz-2.4*cm*HSC,o); dots(d0[0],d1[1],d0[1],P.soft); }
  if(al>0) handIso(Xa,Yb+dy,hz,o,cm*HSC,al);
  labels.screen={ph:ph,o:o,cm:cm,f:f,T:T};
  if(id==='phone') portLabel(ph,o,labels);
  return labels;
}
/* sound picture: a speaker and the volume scale with 3–7 lit. On the maintainer's iPhone (24 Sep) the probe follows the media volume —
   the one the side buttons change while the game plays; the silent switch does not mute it */
var SPEAKER=['...11....','..111..1.','11111...1','11111.1.1','11111...1','..111..1.','...11....'];
function soundVolume(t){ var k=Math.max(3,Math.round(LH/55)), cy=Math.round(LH*0.5), x2=Math.round(LW/2-13*k); bigBlit(SPEAKER,P.text,x2,cy-4*k,k);
  var lvl=Math.min(5,Math.floor((t%3)*3)+1), bx=x2+11*k;
  for(var j=0;j<10;j++){ var h=Math.round((3+j*1.1)*k*0.6), xb=bx+j*Math.round(k*1.6), yb=cy+3*k-h;
    if(j>=2&&j<=6) R(P.band,xb-1,yb-1,Math.round(k)+2,h+2); R(j<lvl?P.text:P.line,xb,yb,Math.round(k),h); } }
/* draw a picture function into the side canvas and copy it onto the screen, mirrored when the port is on the left */
function picture(fn,mirror){
  var keep=lx, pcx=pc.getContext('2d'); pcx.clearRect(0,0,LW,LH); lx=pcx; var labels;
  try{ labels=fn()||[]; } finally { lx=keep; }
  if(mirror){ lx.save(); lx.translate(LW,0); lx.scale(-1,1); lx.drawImage(pc,0,0); lx.restore(); } else lx.drawImage(pc,0,0);
  (labels.screens||(labels.screen?[labels.screen]:[])).forEach(function(sc){ phoneGame(sc.ph,sc.o,sc.cm,sc.f,sc.T,mirror); });
  labels.forEach(function(l){ var s=l.t, x=l.x, a=l.a||'left';
    if(mirror){ x=LW-x; a=a==='left'?'right':a==='right'?'left':a; if(l.arrow) s=s.replace('← ','')+' →'; }
    text(s,x,l.y,l.c,a); });
}

/* v0.35: the second way to play — the phone held in the air by the other hand, the palm edge-on at the port end, 5–10 cm away
   (26 Sep, the maintainer: as precise as on the table). The same "volume" look, no table. f — distance 0…1 (5…10 cm) */
function sceneHand(id,t,f,away,waves,T,lay){
  var cm=Math.min(LH*0.024,LW*0.0135)*lay.k, o=[LW*lay.ox,LH*lay.oy+23.6*cm], labels=[];
  var HS={t:P.hand[1],h:P.hand[2],x:P.hand[0],y:'#9A7274'}, X0=-7.5*cm*PSC, Y0=-3.6*cm*PSC, Y1=3.6*cm*PSC, Zp=1.0*cm;
  // the holding hand (v0.35, the maintainer: the phone lies in the palm, the thumb under it, the other fingers over the far long edge)
  var gx=X0, ph, j;
  box(gx-1.8*cm,gx+6.6*cm,Y0+0.3*cm,Y1-0.2*cm,-2.4*cm,-0.05*cm,o,HS.t,HS.x,HS.y);                      // the palm under the phone, wide
  for(j=0;j<4;j++) box(gx+0.1*cm+j*1.7*cm,gx+1.6*cm+j*1.7*cm,Y0-1.1*cm,Y0,-1.6*cm,Zp+0.9*cm,o,HS.t,HS.x,HS.y);   // fingers up the far side…
  box(gx-2.0*cm,gx+5.4*cm,Y1-1.4*cm,Y1+9*cm,-7.4*cm,-2.0*cm,o,HS.t,HS.x,HS.y);                          // forearm towards the player and down
  box(gx-2.0*cm,gx+5.4*cm,Y1+9*cm,Y1+14*cm,-9.8*cm,-4.4*cm,o,HS.t,HS.x,HS.y,0.55);
  ph=phoneIso(o,cm,id==='phone'&&Math.floor(T*3)%2===0,typeof camEnd==='function'&&camEnd());
  for(j=0;j<4;j++) box(gx+0.1*cm+j*1.7*cm,gx+1.6*cm+j*1.7*cm,Y0-0.2*cm,Y0+(2.6-(j===3?0.7:0)-(j===0?0.3:0))*cm,Zp,Zp+0.9*cm,o,HS.t,HS.x,HS.y);   // …curled onto the top
  box(gx+1.0*cm,gx+5.4*cm,Y1-0.6*cm,Y1+1.2*cm,-1.9*cm,-0.2*cm,o,HS.t,HS.x,HS.y);                       // the thumb under the near edge
  var al=1, gap=(5+5*f)*cm, dy=0;
  if(id==='phone') dy=(1-ease(t/1.8))*28*cm;
  if(away>0){ var q=ease(away); dy=q*30*cm; gap+=q*6*cm; al=1-q; }
  var Za=-4.2*cm, Zb=4.4*cm, Kx=ph.X1+gap+2.8*cm, Ky=-2.0*cm+dy, D=[0,-1], NB=[1,0], PL=8.5*cm, Wx=Kx-D[0]*PL, Wy=Ky-D[1]*PL;   // a straight hand along the phone's end (v0.35, the maintainer): knuckles K, wrist W, fingers along D, back of the hand along NB
  if(waves) for(var i=0;i<3;i++){ var rr=((T*6+i*4.5)%13.5)*cm+1*cm;
    for(var a=-1.2;a<=1.2;a+=0.06){ var pp=iso(ph.X1+Math.cos(a)*rr,0,Zp/2+Math.sin(a)*rr*0.8,o); if(Math.cos(a)*rr<gap) R(P.bullet,pp[0],pp[1],1,1); } }
  if(al>0){ var fz=[2.9,0.6,-1.7,-3.9], fh=[1.5,1.5,1.45,1.3], L2=[7.6,8.6,8.0,6.2], k;            // index … little finger, top to bottom
    for(k=3;k>=0;k--) slab(Kx-D[0]*0.6*cm,Ky-D[1]*0.6*cm,D,NB,(L2[k]+0.6)*cm,fz[k]*cm,(fz[k]+fh[k])*cm,0.9*cm,0.5*cm,o,HS.t,HS.h,al);
    if(al>0.5) for(k=0;k<3;k++){ var g0=iso(Kx,Ky,fz[k]*cm-0.4*cm,o), g1=iso(Kx+D[0]*(Math.min(L2[k],L2[k+1])-0.3)*cm,Ky+D[1]*(Math.min(L2[k],L2[k+1])-0.3)*cm,fz[k]*cm-0.4*cm,o);   // the lines between the fingers
      for(var u=0;u<=1;u+=0.02) R(HS.y,g0[0]+(g1[0]-g0[0])*u,g0[1]+(g1[1]-g0[1])*u,1,2); }
    slab(Wx,Wy,D,NB,PL,Za,Zb,1.9*cm,0,o,HS.t,HS.h,al);                                                    // the palm
    if(al>0.5) for(k=0;k<3;k++){ var c0=iso(Kx-D[0]*1.4*cm,Ky-D[1]*1.4*cm,fz[k]*cm-0.25*cm,o), c1=iso(Kx,Ky,fz[k]*cm-0.25*cm,o);
      for(u=0;u<=1;u+=0.1) R(HS.y,c0[0]+(c1[0]-c0[0])*u,c0[1]+(c1[1]-c0[1])*u,1,1); }
    var tx=Wx+D[0]*2.0*cm-NB[0]*0.9*cm, ty=Wy+D[1]*2.0*cm-NB[1]*0.9*cm;                                     // the thumb on top, along the index finger, a little towards the phone
    slab(tx,ty,D,NB,7.2*cm,Zb-0.2*cm,Zb+1.7*cm,1.5*cm,0.7*cm,o,HS.x,HS.h,al);
    if(al>0.5){ var h0=iso(tx+D[0]*1.2*cm,ty+D[1]*1.2*cm,Zb-0.3*cm,o), h1=iso(tx+D[0]*6.6*cm,ty+D[1]*6.6*cm,Zb-0.3*cm,o); for(u=0;u<=1;u+=0.03) R(HS.y,h0[0]+(h1[0]-h0[0])*u,h0[1]+(h1[1]-h0[1])*u,1,1); }
    box(Wx-1.0*cm,Wx+2.4*cm,Wy-0.8*cm,Wy+9*cm,Za+1.6*cm,Za+6.4*cm,o,HS.t,HS.x,HS.y,al);                 // forearm straight towards the player, along the phone's end
    box(Wx-1.0*cm,Wx+2.4*cm,Wy+9*cm,Wy+14*cm,Za+1.4*cm,Za+6.2*cm,o,HS.t,HS.x,HS.y,al*0.55);
  }
  if(id==='wave'){ var rz=Zb+10.5*cm, r0=iso(ph.X1,0,rz,o), r5=iso(ph.X1+5*cm,0,rz,o), r10=iso(ph.X1+10*cm,0,rz,o);   // a 0–10 cm ruler from the port, above the picture
    for(var x=r0[0];x<=r10[0];x+=2) R(P.soft,x,r0[1],1,1); R(P.soft,r0[0],r0[1]-2,1,5); R(P.soft,r5[0],r5[1]-2,1,5); R(P.soft,r10[0],r10[1]-2,1,5);
    labels.push({x:r5[0]-2,y:r5[1]-11,t:'5',c:P.soft}); labels.push({x:r10[0]-2,y:r10[1]-11,t:'10 '+L('cm'),c:P.soft}); }
  labels.screen={ph:ph,o:o,cm:cm,f:f,T:T};
  if(id==='phone') portLabel(ph,o,labels);
  return labels;
}
/* both ways on one screen: on the table (left) and in the hand (right), «OR» between */
var SPLIT_T={ox:0.25,oy:0.2,k:0.62}, SPLIT_H={ox:0.70,oy:0.16,k:0.62};
function sceneBoth(id,t,f,away,waves,T){
  var a=scene(id,t,f,away,waves,T,SPLIT_T), b=sceneHand(id,t,f,away,waves,T,SPLIT_H), out=a.concat(b);
  out.screens=[a.screen,b.screen]; out.push({x:Math.round(LW*0.515),y:Math.round(LH*0.55),t:L('or'),c:P.soft,a:'center'}); return out;
}
