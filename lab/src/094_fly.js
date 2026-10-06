
/* ── СОНАРЛИНК: «УЩЕЛЬЕ» — проба полёта на двух телефонах (06.10, 1.56u) ──
   Автор: «можно придумать игру для двух телефонов, в которой руки должны постоянно быть в движении.. полёт между ущельями и узкими
   местами»; «ущелье.. вид сзади и вид из кабины.. надо смотреть». Два телефона торец к торцу — одна широкая картинка: левый рисует левую
   половину, правый — правую. Управление кулаками у разъёмов (как «Струна» в «один, двумя руками»: каждая рука — отклонение от своего
   среднего за ~6 с, в долях своего размаха — движение сонар мерит точно, точную высоту нет):
     обе вместе вверх-вниз — высота полёта; одна выше другой — крен, и корабль уходит в сторону крена (как штурвал).
   Долгую позу сонар «забывает» за 5–6 с, поэтому ущелье всё время виляет (повороты на 3–7 с и обратно), а не тянет длинный вираж.
   Стены — царапина (щит −1), арки — лететь ниже, огоньки — очки (руки в такт — вдвое). Корабль считает левый телефон (или один), правому
   он идёт вместе с высотой руки; правый только рисует. Вид — сзади (третье лицо) или из кабины; стык телефонов — посередине кадра.
   Связь, подготовка сонара, журнал — те же, что у «Струны» (093_string.js), режим SL.mode='fly'. ── */
var FL_VIEW='back'; try{ if(localStorage.getItem('sonar_fl_view')==='cockpit') FL_VIEW='cockpit'; }catch(e){}
var FL_V=22, FL_SHIELD=5, FL={};
function flViewLabel(){ el('flView').textContent='Вид: '+(FL_VIEW==='cockpit'?'из кабины':'сзади (третье лицо)'); }
function flOpen(){ flViewLabel(); el('flNow').textContent=''; show('flyIntro'); }
/* трасса из зерна: центр ущелья xc(s) — сумма синусов (повороты 3–7 с при 22 м/с), ширина с сужениями, арки (лететь ниже), огоньки */
function flWorld(seed){ var r=slRng(seed^0x5a17), k, W={sin:[],narrow:[],arch:[],gems:[]};
  for(k=0;k<3;k++){ var L=[70,110,150][k]*(0.85+0.3*r()); W.sin.push({A:[3.2,2.6,1.6][k]*(0.8+0.4*r()),L:L,p:r()*6.28}); }
  for(var s=330;s<FL_V*SL_ROUND;s+=200+120*r()){ if(r()<0.55) W.narrow.push({s:s,len:45+25*r()}); else W.arch.push({s:s,y:3.6+1.6*r()}); }
  for(s=60;s<FL_V*SL_ROUND;s+=26+16*r()) W.gems.push({s:s,dx:(r()-0.5)*6,y:1.5+6*r(),got:false});
  return W; }
function flXc(s){ var x=0; FL.W.sin.forEach(function(q){ x+=q.A*Math.sin(2*Math.PI*s/q.L+q.p)*Math.min(1,s/120); }); return x; }
function flHalfW(s){ var w=8; FL.W.narrow.forEach(function(n){ var d=s-n.s; if(d>-15&&d<n.len+15) w=Math.min(w,8-3.5*Math.min(1,Math.min(d+15,n.len+15-d)/15)); }); return w; }
function flArchAt(s){ for(var i=0;i<FL.W.arch.length;i++){ var a=FL.W.arch[i]; if(Math.abs(s-a.s)<1.5) return a; } return null; }
function flStart(seed){ FL={W:flWorld(seed),s:0,x:0,y:3,phi:0,shield:FL_SHIELD,score:0,gems:0,hits:0,cool:0,flash:0,qb:[],seed:seed}; SL.score=0; }
function flAuth(){ return SL.bot||SL.half==='L'; }
/* корабль — по рукам: aL, aR — доли кулаков (0…1, середина 0,5) */
function flStep(dt){ if(!FL.W) return; var fMe=SL.frac===undefined?0.5:SL.frac, hp=slPartner(), fP=hp===null||hp===undefined?0.5:hp;
  var fL=SL.half==='L'?fMe:fP, fR=SL.half==='L'?fP:fMe;
  SL.vL=slV(fL); SL.vR=slV(fR); var inTime=slSync(dt)===1; SL.res+=((inTime?1:0)-SL.res)*(1-Math.pow(0.02,dt));
  if(!flAuth()) return;
  FL.s+=FL_V*dt; var xc=flXc(FL.s), hw=flHalfW(FL.s), slope=(flXc(FL.s+2)-xc)/2;
  var phiT=SL.bot?Math.max(-0.8,Math.min(0.8,(xc-FL.x)*0.25+slope*1.5)):Math.max(-0.8,Math.min(0.8,(fL-fR)*1.6));
  FL.phi+=(phiT-FL.phi)*(1-Math.exp(-dt/0.12)); FL.x+=FL_V*0.45*Math.sin(FL.phi)*dt;
  var yT=0.8+((fL+fR)/2)*9; FL.y+=(yT-FL.y)*(1-Math.exp(-dt/0.18));
  FL.cool=Math.max(0,FL.cool-dt); FL.flash=Math.max(0,FL.flash-dt);
  if(Math.abs(FL.x-xc)>hw-1.1&&FL.cool===0){ FL.shield--; FL.hits++; FL.cool=1; FL.flash=0.4; FL.x+=(xc-FL.x)>0?1.5:-1.5; slE('ущелье: стена',{s:+FL.s.toFixed(1),x:+FL.x.toFixed(2),xc:+xc.toFixed(2),hw:+hw.toFixed(2),shield:FL.shield}); }
  var a=flArchAt(FL.s); if(a&&!a.hit&&FL.y>a.y-0.6){ a.hit=true; FL.shield--; FL.hits++; FL.flash=0.4; slE('ущелье: арка',{s:+FL.s.toFixed(1),y:+FL.y.toFixed(2),arch:+a.y.toFixed(2),shield:FL.shield}); }
  FL.W.gems.forEach(function(g){ if(g.got||Math.abs(g.s-FL.s)>1.2) return; if(Math.abs(xc+g.dx-FL.x)<1.8&&Math.abs(g.y-FL.y)<1.8){ g.got=true; FL.gems++; FL.score+=SL.res>0.5?20:10; } });
  SL.score=FL.score; SL.got=FL.gems; SL.cuts=FL.hits;
  if(FL.shield<=0&&SL.phase==='play'){ slE('ущелье: щит кончился',{s:+FL.s.toFixed(0)}); slOver(false); } }
/* состояние корабля — правому телефону, вместе с высотой руки */
function flQ(){ return [+FL.s.toFixed(2),+FL.x.toFixed(3),+FL.y.toFixed(3),+FL.phi.toFixed(3),FL.shield,FL.score,FL.gems,FL.hits,+FL.flash.toFixed(2)]; }
function flRecv(stamp,q){ if(!FL.W) return; FL.qb.push([stamp,q]); if(FL.qb.length>30) FL.qb.shift();
  if(SL.phase==='over'&&!flAuth()) flOverText({s:q[0],shield:q[4],score:q[5],gems:q[6],hits:q[7]}); }   /* итог — по последнему, что прислал левый */
function flOverText(F){ el('slSay').textContent=F.shield>0?'Долетели':'Щит кончился'; el('slSub').textContent='очки '+F.score+' · огоньков '+F.gems+' · ударов '+F.hits+' · пролетели '+Math.round(F.s)+' м'; }
function flShown(){ if(flAuth()||!FL.qb||!FL.qb.length) return FL; var tt=slNow()-60, b=FL.qb, i; for(i=b.length-1;i>0;i--) if(b[i-1][0]<=tt) break;
  var p=b[Math.max(0,i-1)], q=b[i], w=q[0]>p[0]?Math.max(0,Math.min(1,(tt-p[0])/(q[0]-p[0]))):1, L=function(k){ return p[1][k]+(q[1][k]-p[1][k])*w; };
  var o={W:FL.W,s:L(0),x:L(1),y:L(2),phi:L(3),shield:q[1][4],score:q[1][5],gems:q[1][6],hits:q[1][7],flash:q[1][8]};
  SL.score=o.score; SL.got=o.gems; SL.cuts=o.hits; if(o.shield<=0&&SL.phase==='play') slOver(false); return o; }
/* ── рисование: псевдо-3D. Вся картинка — полоса на два экрана (левый + стык + правый); каждый телефон рисует свою половину ── */
function flDraw(ts){ var cv=el('slC'); if(!cv||!cv.getContext) return; var g=cv.getContext('2d'), W=SLC.w, H=SLC.h, gap=W*0.05;
  g.setTransform(SLC.dpr,0,0,SLC.dpr,0,0); var TW=SL.full?W:2*W+gap, ox=SL.full?0:SL.half==='R'?-(W+gap):0;
  var F=flShown(); if(!F||!F.W){ g.fillStyle='#120a24'; g.fillRect(0,0,W,H); return; }
  var cock=FL_VIEW==='cockpit', camY=cock?F.y:F.y+1.2, camZ=cock?0:-9, roll=cock?F.phi:F.phi*0.3, f=Math.max(H*1.25,TW*0.28), cx=TW/2, cy=H*(cock?0.48:0.42), pitch=cock?0:0.06;
  var cr=Math.cos(-roll), sr=Math.sin(-roll);
  function P(X,Y,Z){ var dz=Z-camZ; if(dz<0.5) dz=0.5; var x=X-F.x, y=Y-camY; var xr=x*cr-y*sr, yr=x*sr+y*cr; return [ox+cx+f*xr/dz, cy-f*(yr/dz)+f*pitch]; }
  /* небо и дно с поворотом горизонта */
  g.save(); g.translate(ox+cx,cy); g.rotate(roll); var sk=g.createLinearGradient(0,-H*1.5,0,f*pitch); sk.addColorStop(0,'#1d2350'); sk.addColorStop(1,'#e39a63'); g.fillStyle=sk; g.fillRect(-TW*1.5,-H*2,TW*3,H*2+f*pitch);
  var gr=g.createLinearGradient(0,f*pitch,0,H*2); gr.addColorStop(0,'#5c3426'); gr.addColorStop(1,'#24150f'); g.fillStyle=gr; g.fillRect(-TW*1.5,f*pitch,TW*3,H*3); g.restore();
  /* стены, дно, арки — от дальних к ближним */
  var DZ=2.5, ZM=130, z, i, seg=[];
  for(z=ZM;z>=0;z-=DZ){ var s=F.s+z, xc=flXc(s), hw=flHalfW(s); seg.push({z:z,s:s,xl:xc-hw,xr:xc+hw}); }
  for(i=0;i<seg.length-1;i++){ var a=seg[i], b=seg[i+1], fog=Math.min(1,a.z/ZM), Hw=11;
    var fl=[P(a.xl,0,a.z),P(a.xr,0,a.z),P(b.xr,0,b.z),P(b.xl,0,b.z)]; flPoly(g,fl,slMix(Math.floor(a.s/5)%2?'#7a452f':'#6d3d29','#c98a62',fog*0.8));
    flPoly(g,[P(a.xl,0,a.z),P(a.xl,Hw,a.z),P(b.xl,Hw,b.z),P(b.xl,0,b.z)],slMix(Math.floor(a.s/7)%2?'#b8643e':'#a85a38','#e0a072',fog*0.75));
    flPoly(g,[P(a.xr,0,a.z),P(a.xr,Hw,a.z),P(b.xr,Hw,b.z),P(b.xr,0,b.z)],slMix(Math.floor(a.s/7)%2?'#cf7a4b':'#c06d41','#e8ab7c',fog*0.75));
    var ar=null; F.W.arch.forEach(function(q){ if(q.s<=a.s&&q.s>b.s) ar=q; });
    if(ar){ var zz=ar.s-F.s; flPoly(g,[P(a.xl,ar.y,zz),P(a.xr,ar.y,zz),P(a.xr,Hw,zz),P(a.xl,Hw,zz)],slMix('#5a3326','#c98a62',fog*0.7),'rgba(0,0,0,.4)'); }
    F.W.gems.forEach(function(q){ if(q.got||q.s>a.s||q.s<=b.s) return; var zz=q.s-F.s; if(zz<1) return; var pp=P(flXc(q.s)+q.dx,q.y,zz), R=Math.max(1.5,f*0.35/(zz-camZ)); slGlow(g,pp[0],pp[1],R*3,SL_P,0.8); g.fillStyle='#fff'; g.beginPath(); g.arc(pp[0],pp[1],R*0.6,0,7); g.fill(); }); }
  /* корабль (вид сзади) или кабина */
  if(!cock){ var sp=P(F.x,F.y,0); flJet(g,sp[0],sp[1],f*0.16,F.phi-roll,SL.res>0.5); }
  else { g.strokeStyle='rgba(15,18,24,.97)'; g.lineWidth=H*0.07; g.beginPath(); g.moveTo(ox-20,H*0.08); g.quadraticCurveTo(ox+TW/2,-H*0.2,ox+TW+20,H*0.08); g.stroke();
    g.fillStyle='rgba(15,18,24,.97)'; g.fillRect(ox,H*0.86,TW,H*0.2); g.strokeStyle=SL.res>0.5?'rgba(255,211,77,.9)':'rgba(111,211,255,.8)'; g.lineWidth=2; g.beginPath(); g.arc(ox+cx,cy,H*0.05,0,7); g.moveTo(ox+cx-H*0.15,cy); g.lineTo(ox+cx-H*0.06,cy); g.moveTo(ox+cx+H*0.06,cy); g.lineTo(ox+cx+H*0.15,cy); g.stroke(); }
  if(F.flash>0){ g.fillStyle='rgba(255,60,40,'+(F.flash*0.8)+')'; g.fillRect(0,0,W,H); } }
function flPoly(g,p,col,line){ g.beginPath(); g.moveTo(p[0][0],p[0][1]); for(var i=1;i<p.length;i++) g.lineTo(p[i][0],p[i][1]); g.closePath(); g.fillStyle=col; g.fill(); if(line){ g.strokeStyle=line; g.lineWidth=1; g.stroke(); } }
function flJet(g,x,y,s,roll,hot){ g.save(); g.translate(x,y); g.rotate(roll); var P2=function(pts,c){ g.beginPath(); pts.forEach(function(p,i){ i?g.lineTo(p[0]*s,p[1]*s):g.moveTo(p[0]*s,p[1]*s); }); g.closePath(); g.fillStyle=c; g.fill(); g.strokeStyle='#202733'; g.lineWidth=1.5; g.stroke(); };
  P2([[-0.5,0.06],[-0.08,-0.02],[0.08,-0.02],[0.5,0.06],[0.1,0.1],[-0.1,0.1]],'#cfd8e6'); P2([[-0.06,-0.16],[0.06,-0.16],[0.09,0.12],[-0.09,0.12]],'#e9eef6'); P2([[-0.015,-0.3],[0.015,-0.3],[0.05,-0.12],[-0.05,-0.12]],'#9fb0c8');
  [-1,1].forEach(function(k){ slGlow(g,k*0.04*s,0.11*s,s*(hot?0.14:0.08),hot?'#ffd34d':'#ffb648',0.9); }); g.restore(); }
function flHud(){ var F=flAuth()?FL:flShown(); if(!F) return; el('slHud').textContent='щит '+Math.max(0,F.shield)+' · огоньков '+(F.gems||0)+' · очки '+(F.score||0)+(SL.phase==='play'?' · '+Math.max(0,Math.ceil(SL_ROUND-SL.t))+' с':'')+(SL.res>0.5?' · в такт ×2':'')+(SL.code?' · '+(slDirect()?'напрямую':'через сервер'):''); }
window.__fl=function(){ return FL; }; window.__flShown=function(){ var o=flShown(); return {s:o.s,x:o.x,y:o.y,phi:o.phi}; };
el('lkFly').addEventListener('click',flOpen);
el('flNear').addEventListener('click',function(){ slBegin('near','fly'); });
el('flNew').addEventListener('click',function(){ slBegin('new','fly'); });
el('flJoin').addEventListener('click',function(){ var c=el('flCode').value; if(!/^\d{4}$/.test(c)){ el('flNow').textContent='Код — 4 цифры'; return; } el('siCode').value=c; slBegin('join','fly'); });
el('flSolo').addEventListener('click',function(){ slBegin('bot','fly'); });
el('flView').addEventListener('click',function(){ FL_VIEW=FL_VIEW==='cockpit'?'back':'cockpit'; try{ localStorage.setItem('sonar_fl_view',FL_VIEW); }catch(e){} flViewLabel(); });
el('flBack').addEventListener('click',function(){ show('link'); });
