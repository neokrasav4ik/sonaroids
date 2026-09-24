/* ── rocks: 16 rotation frames each, volume lit from the top left, craters, ordered dithering ── */
function makeRock(r){
  var n=9+Math.floor(Math.random()*4), pts=[], i, f;
  for(i=0;i<n;i++) pts.push({a:i/n*Math.PI*2+rnd(-0.15,0.15), r:r*rnd(0.72,1.0)});
  var cr=[]; for(i=0;i<2+Math.floor(r/6);i++) cr.push({a:rnd(0,6.28),d:rnd(0.1,0.55)*r,r:rnd(0.12,0.26)*r});
  var size=Math.ceil(r*2)+3, frames=[], ramp=P.rock.map(hex);
  for(f=0;f<16;f++){
    var rot=f/16*Math.PI*2, cvs=document.createElement('canvas'); cvs.width=size; cvs.height=size;
    var c=cvs.getContext('2d'), im=c.createImageData(size,size), cxr=size/2, cyr=size/2, inside=new Uint8Array(size*size);
    var poly=pts.map(function(p){ return [cxr+Math.cos(p.a+rot)*p.r, cyr+Math.sin(p.a+rot)*p.r]; });
    for(var y=0;y<size;y++) for(var x=0;x<size;x++){ var px=x+0.5,py=y+0.5,ins=false;
      for(var a=0,b=poly.length-1;a<poly.length;b=a++){ var xa=poly[a][0],ya=poly[a][1],xb=poly[b][0],yb=poly[b][1];
        if(((ya>py)!==(yb>py))&&(px<(xb-xa)*(py-ya)/(yb-ya)+xa)) ins=!ins; }
      inside[y*size+x]=ins?1:0; }
    for(y=0;y<size;y++) for(x=0;x<size;x++){ if(!inside[y*size+x]) continue;
      var dx=(x+0.5-cxr)/r, dy=(y+0.5-cyr)/r, d=Math.min(1,Math.sqrt(dx*dx+dy*dy));
      var lum=0.55+(-dx*0.62-dy*0.78)*0.55*d+(1-d)*0.18;
      for(var k=0;k<cr.length;k++){ var ca=cr[k].a+rot, ccx=cxr+Math.cos(ca)*cr[k].d, ccy=cyr+Math.sin(ca)*cr[k].d, q=Math.hypot(x+0.5-ccx,y+0.5-ccy)/cr[k].r;
        if(q<1){ var inner=((x+0.5-ccx)*0.62+(y+0.5-ccy)*0.78)/cr[k].r; lum+=q<0.8?-0.22+inner*0.18:0.08; } }
      var edge=!inside[y*size+x-1]||!inside[y*size+x+1]||!inside[(y-1)*size+x]||!inside[(y+1)*size+x];
      var idx=Math.max(1,Math.min(4,Math.floor(lum*4+(bay(x,y)-0.5)*0.9+0.5))); if(edge) idx=Math.max(0,Math.min(idx,1));
      var col=ramp[idx], o=(y*size+x)*4; im.data[o]=col[0]; im.data[o+1]=col[1]; im.data[o+2]=col[2]; im.data[o+3]=255; }
    c.putImageData(im,0,0); frames.push(cvs); }
  return {frames:frames,size:size,rot:Math.random()*16,vr:rnd(-5,5)};
}
/* sprites by rows: a digit is a colour number in the palette */
var SHIP_MAP=[
 '....11..........',
 '....1221........',
 '.....12221......',
 '..1112233321....',
 '.122223333332111',
 '.123333333333333',
 '.122223333332111',
 '..1112233321....',
 '.....12221......',
 '....1221........',
 '....11..........'];
function blit(map,cols,x,y){ for(var r=0;r<map.length;r++) for(var c=0;c<map[r].length;c++){ var ch=map[r][c]; if(ch==='.') continue;
  lx.fillStyle=cols[+ch-1]; lx.fillRect(Math.round(x+c),Math.round(y+r),1,1); } }
function bigBlit(map,col,x,y,k){ for(var r=0;r<map.length;r++) for(var c=0;c<map[r].length;c++) if(map[r][c]!=='.') R(col,x+c*k,y+r*k,k,k); }
/* the ship with its engine flame; (x, y) — the ship's nose line, like the core's ship position */
function drawShip(x,y,t,blink){
  if(blink) return; var fl=Math.floor(t*20)%3, sx=Math.round(x), sy=Math.round(y);
  R(P.flame[0],sx-3-fl,sy-1,3+fl,3); R(P.flame[1],sx-2-(fl>>1),sy,2+(fl>>1),1); R(P.flame[2],sx-1,sy,1,1);
  blit(SHIP_MAP,P.ship,sx,sy-5); light(x-2,y,9*K,hex(P.flame[1]).join(','),0.4);
}
function burst(x,y,n,cols,sp){ for(var i=0;i<n;i++){ var a=Math.random()*6.28, v=rnd(0.3,1)*sp; parts.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(0.4,0.9),max:0.9,cols:cols}); } }
function drawParts(dt){
  parts.forEach(function(p){ p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=0.985; p.vy*=0.985; p.life-=dt; });
  parts=parts.filter(function(p){ return p.life>0; });
  parts.forEach(function(p){ var f=p.life/p.max, c=p.cols[Math.min(p.cols.length-1,Math.floor((1-f)*p.cols.length))]; R(c,p.x,p.y,1,1); if(f>0.6) light(p.x,p.y,3*K,hex(c).join(','),0.2); });
}
/* a pixel ring: progress p (0…1) in colour col over a dim full circle */
function ring(x,y,r,p,col){
  for(var i=0;i<72;i++){ var a=-Math.PI/2+i/72*Math.PI*2, on=i/72<p;
    for(var w=0;w<2;w++){ var rr=r-w; R(on?col:P.line,x+Math.cos(a)*rr,y+Math.sin(a)*rr,1,1); } }
}
function tick(x,y,c){ [[-3,0],[-2,1],[-1,2],[0,1],[1,0],[2,-1],[3,-2]].forEach(function(q){ R(c,x+q[0]*2-1,y+q[1]*2-1,2,2); }); }
