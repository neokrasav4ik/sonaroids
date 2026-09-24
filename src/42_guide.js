/* ── FIRST-LAUNCH PICTURES («volume» look, agreed 24 Sep): the table seen from the front-left and above, the phone lying flat,
   the palm hovering by the short edge with the charging port. The palm is slightly smaller than real, the phone 1.6× larger
   than real so its screen is readable: a tiny ship on it follows the palm. Drawn with the port on the right;
   for a left-handed player the whole picture is mirrored (labels are not). ── */
function polyFill(pts,c){ lx.fillStyle=c; var y0=Math.floor(Math.min.apply(null,pts.map(function(p){return p[1];}))), y1=Math.ceil(Math.max.apply(null,pts.map(function(p){return p[1];})));
  for(var y=y0;y<=y1;y++){ var xs=[], yy=y+0.5; for(var a=0,b=pts.length-1;a<pts.length;b=a++){ var A=pts[a],B=pts[b]; if((A[1]>yy)!==(B[1]>yy)) xs.push(A[0]+(yy-A[1])*(B[0]-A[0])/(B[1]-A[1])); }
    xs.sort(function(p,q){return p-q;}); for(var i=0;i+1<xs.length;i+=2){ var xa=Math.round(xs[i]), xb=Math.round(xs[i+1]); if(xb>xa) lx.fillRect(xa,y,xb-xa,1); } } }
function ease(x){ x=Math.max(0,Math.min(1,x)); return x*x*(3-2*x); }
function waveH(t){ return 0.5+0.5*Math.sin(t*2.4-Math.PI/2); }       // demo waving: 0 — 5 cm, 1 — 15 cm
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
function phoneIso(o,cm,portOn){
  var X0=-7.5*cm*PSC,X1=7.5*cm*PSC,Y0=-3.6*cm*PSC,Y1=3.6*cm*PSC,Zp=1.0*cm, q;
  box(X0,X1,Y0,Y1,0,Zp,o,P.rock[2],P.rock[1],P.rock[0]);
  polyFill([iso(X0+0.5*cm,Y0+0.45*cm,Zp,o),iso(X1-0.5*cm,Y0+0.45*cm,Zp,o),iso(X1-0.5*cm,Y1-0.45*cm,Zp,o),iso(X0+0.5*cm,Y1-0.45*cm,Zp,o)],P.bg);
  for(var g=0;g<2;g++){ var a0=iso(X0+(2.2+g*1.3)*cm,Y1-0.8*cm,Zp,o), a1=iso(X0+(3.6+g*1.3)*cm,Y0+0.8*cm,Zp,o);
    for(q=0;q<=1;q+=0.06) if(bay(Math.round(a0[0]+(a1[0]-a0[0])*q),Math.round(a0[1]+(a1[1]-a0[1])*q))<0.5) R(P.neb[1],a0[0]+(a1[0]-a0[0])*q,a0[1]+(a1[1]-a0[1])*q,1,1); }
  var pa=iso(X1,-0.9*cm,Zp,o), pb=iso(X1,0.9*cm,Zp,o), port=iso(X1,0,Zp,o); for(q=0;q<=1;q+=0.1) R(portOn?P.pick:P.rock[3],pa[0]+(pb[0]-pa[0])*q,pa[1]+(pb[1]-pa[1])*q,1,1);
  return {X0:X0,X1:X1,Y0:Y0,Y1:Y1,Zp:Zp,port:port};
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
function scene(id,t,f,away,waves,T){
  var cm=Math.min(LH*0.024,LW*0.0135), o=[LW*0.43,LH*0.16+23.6*LH*0.024], labels=[];      // narrow screens (iPad): scale to the width
  var TX0=-24*cm, TX=34*cm, TY0=-15*cm, TY1=19*cm; polyFill([iso(TX0,TY0,0,o),iso(TX,TY0,0,o),iso(TX,TY1,0,o),iso(TX0,TY1,0,o)],P.neb[1]);
  for(var yy=0;yy<LH;yy+=3) for(var xx=(yy%6?2:0);xx<LW;xx+=4){ var q0=unIso(xx,yy,o); if(q0[0]>TX0&&q0[0]<TX&&q0[1]>TY0&&q0[1]<TY1) R(P.neb[2],xx,yy,1,1); }
  var ph=phoneIso(o,cm,id==='phone'&&Math.floor(T*3)%2===0);
  var HSC=0.85, hw=8.5*cm*HSC, Xa=ph.X1+1.2*cm, Yb=5*cm, al=1, Z5=5*cm, Z15=15*cm;
  var hz=Z5+(Z15-Z5)*f+2.4*cm*HSC, dy=0;
  if(id==='phone') dy=(1-ease(t/1.8))*28*cm;
  if(away>0){ var q=ease(away); dy=q*30*cm; hz+=q*8*cm; al=1-q; }
  if(al>0.1){ var sc=[Xa+hw/2,Yb-8*cm*HSC+dy], dens=Math.max(0.15,0.8-(hz/cm)*0.035)*al;       // the palm's shadow: paler the higher it is
    for(var y2=0;y2<LH;y2++) for(var x2=0;x2<LW;x2++){ var q1=unIso(x2,y2,o), ex=(q1[0]-sc[0])/(5.2*cm*HSC), ey=(q1[1]-sc[1])/(11*cm*HSC); if(ex*ex+ey*ey<1&&bay(x2,y2)<dens) R(P.neb[0],x2,y2,1,1); } }
  if(waves) for(var i=0;i<3;i++){ var rr=((T*6+i*4.5)%13.5)*cm+1*cm;
    for(var a=-1.4;a<=1.4;a+=0.05){ var pp=iso(ph.X1+Math.cos(a)*rr,Math.sin(a)*rr,0,o); R(P.bullet,pp[0],pp[1],1,1); } }
  if(id==='wave'){ var rX=Xa+hw+9*cm, rY=Yb-9*cm, b0=iso(rX,rY,0,o), b5=iso(rX,rY,Z5,o), b15=iso(rX,rY,Z15,o);         // a 5–15 cm ruler
    dots(b0[0],b0[1],b15[1],P.soft); R(P.soft,b5[0]-3,b5[1],7,1); R(P.soft,b15[0]-3,b15[1],7,1);
    labels.push({x:b15[0]+6,y:b15[1]-3,t:'15 '+L('cm'),c:P.soft}); labels.push({x:b5[0]+6,y:b5[1]-3,t:'5 '+L('cm'),c:P.soft}); }
  if(al>0.5&&id!=='phone'){ var d0=iso(Xa+hw,Yb,0,o), d1=iso(Xa+hw,Yb,hz-2.4*cm*HSC,o); dots(d0[0],d1[1],d0[1],P.soft); }
  if(al>0) handIso(Xa,Yb+dy,hz,o,cm*HSC,al);
  labels.screen={ph:ph,o:o,cm:cm,f:f,T:T};
  if(id==='phone') labels.push({x:ph.port[0]+6,y:ph.port[1]+8,t:'← '+L('port'),c:P.pick,arrow:true});
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
  var sc=labels.screen; if(sc) phoneGame(sc.ph,sc.o,sc.cm,sc.f,sc.T,mirror);
  labels.forEach(function(l){ var s=l.t, x=l.x, a=l.a||'left';
    if(mirror){ x=LW-x; a=a==='left'?'right':a==='right'?'left':a; if(l.arrow) s=s.replace('← ','')+' →'; }
    text(s,x,l.y,l.c,a); });
}
