
/* ── АРКАНОИД: прототип (с 27.09) ──
   Решение автора 27.09: следующая игра — Арканоид, режимом внутри Sonaroids (сборник ретро-игр с сонарным управлением);
   сначала прототип в лабе. Управление — проверенное: телефон горизонтально, разъём смотрит на ладонь (в руке — ладонь к торцу
   и от него; на столе — вверх-вниз над столом). Ракетка внизу ходит влево-вправо (вариант «Б» эскиза): ладонь дальше от
   разъёма — ракетка дальше от него (разъём справа — правее; повёрнут влево — зеркально). Подготовка как в пробе «ладонь справа»:
   пустая комната → взмахи 6 с (ход на всю ширину — 5-й и 95-й перцентили, 50–140 мм) → отсчёт → мяч сам. Касаний нет.
   Пишется звук (до 150 с), метки фаз, карта хода и по кадрам ракетка/мяч/события — sonarark_*.wav, разбор tools/eval_ark.js. */
var AK={on:false,frames:[],gaps:0,marks:{},log:[],map:null,phase:'',raf:0,best:0};
var AK_MAX=Math.round(150*48000/512), AK_COLS=12, AK_ROWS=6, AK_COLORS=['#f2a7c3','#e8b4f0','#c9b8e8','#9fd3f0','#a8e6cf','#ffd59e'];
/* История управления ракеткой (27.09, всё — по записям и словам автора):
   0.39f прямо, ход на ширину — по взмахам: «норм, но дёрганая»; 0.39g сглаживание: «совсем некомфортно» (отставание);
   0.39h ускорение как у мыши: «всё равно плохо — слишком большой размах руки» (запись 10:51: взмахи дали 12 см на ширину, ускорение
   ослабляло медленные движения в 0,4 раза — спокойно провести через всю ширину можно было лишь ~30 см хода; в игре ладонь ходила ~15 см,
   все три промаха — в 3–8% ширины от мяча: не довёл).
   Теперь (0.39i): ход на всю ширину — ФИКСИРОВАННЫЙ, выбирается кнопкой: 6 / 8 / 10 см (по умолчанию 8); середину с 0.39j задаёт
   удобное положение ладони (держать 2 с), а не взмахи. Ускорения нет. «Замок в покое»: пока ладонь почти стоит (< 25 мм/с), ракетка не отзывается на сдвиги меньше
   1,8% ширины (0.39j; в 0.39i — 1,2%); в движении — 0,2%, без отставания. «Ретро-пиксели» — как были. «Шире + магнит»: ракетка 22% вместо 16%, а когда мяч
   падает и ракетка рядом (ближе 16% ширины к месту падения), её мягко подтягивает туда — не больше 6% ширины. */
var AK_RANGES=[60,80,100], AK_LOCK={v:25,db:0.018,dbMove:0.002,tau:0.04}, AK_PIX={step:1/160,hys:2/3}, AK_MAG={pw:0.22,near:0.16,max:0.06,from:0.55};
var akRange=1, akLock=true, akPix=true, akMag=false;
try{ var sr=parseInt(localStorage.getItem('sonar_ark_range'),10); if(sr>=0&&sr<AK_RANGES.length) akRange=sr;
  [['sonar_ark_lock','akLock'],['sonar_ark_pix','akPix'],['sonar_ark_mag','akMag']].forEach(function(k){ var v=localStorage.getItem(k[0]); if(v==='0'||v==='1'){ if(k[1]==='akLock') akLock=v==='1'; if(k[1]==='akPix') akPix=v==='1'; if(k[1]==='akMag') akMag=v==='1'; } }); }catch(e){}
function akCtlLabel(){ el('arkRange').textContent='Ход на всю ширину: '+(AK_RANGES[akRange]/10)+' см'; el('arkLock').textContent='Замок в покое: '+(akLock?'вкл':'выкл');
  el('arkPix').textContent='Ретро-пиксели: '+(akPix?'вкл':'выкл'); el('arkMag').textContent='Шире + магнит: '+(akMag?'вкл':'выкл'); }
function akSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} akCtlLabel(); }
function akRangeNext(){ akRange=(akRange+1)%AK_RANGES.length; akSet('sonar_ark_range',String(akRange)); }
function akLockNext(){ akLock=!akLock; akSet('sonar_ark_lock',akLock?'1':'0'); }
function akPixNext(){ akPix=!akPix; akSet('sonar_ark_pix',akPix?'1':'0'); }
function akMagNext(){ akMag=!akMag; akSet('sonar_ark_mag',akMag?'1':'0'); }
/* ракетка по шагу экрана (до магнита): прямо по карте хода, «замок в покое», ретро-пиксели. Чистая функция — её же гоняет eval_ark.js */
function akStep(st,dist,dt,map,port,lock,pix){ var f=Math.max(0,Math.min(1,(dist-map.lo)/(map.hi-map.lo))); if(port==='left') f=1-f; var x=0.09+0.82*f;
  if(st.last===null){ st.last=dist; st.v=0; if(st.p===null) st.p=x; }
  else { st.v+=(1-Math.exp(-dt/AK_LOCK.tau))*(Math.abs(dist-st.last)/Math.max(dt,1e-3)-st.v); st.last=dist; }
  var db=lock?(st.v<AK_LOCK.v?AK_LOCK.db:AK_LOCK.dbMove):0;
  if(x-st.p>db) st.p=x-db; else if(st.p-x>db) st.p=x+db;
  if(pix){ var sp=AK_PIX.step; if(st.q===null||Math.abs(st.p-st.q)>sp*AK_PIX.hys) st.q=Math.round(st.p/sp)*sp; return st.q; }
  st.q=st.p; return st.p; }
/* магнит: куда мяч придёт к линии ракетки (отражения от стен, без кирпичей) */
function akLand(B,py){ if(B.vy<=0) return null; var t=(py-B.y)/B.vy, x=B.x+B.vx*t; x=((x%2)+2)%2; return x>1?2-x:x; }
function akFrame(f,gap,r){ if(!AK.on) return; if(AK.frames.length<AK_MAX){ if(gap) AK.gaps++; AK.frames.push(f); }
  if(r){ AK.present=r.present; if(r.present){ AK.dist=r.height; if(AK.phase==='wave') AK.wave.push(r.height); } } }
function akMark(k){ AK.marks[k]=AK.frames.length*N; }
function akText(a,b){ el('akSay').textContent=a; el('akSub').textContent=b||''; }
function akButtons(v){ el('akBtns').classList.toggle('hidden',!v); }
function akBricks(level){ var b=[], gap=level%3; for(var r=0;r<AK_ROWS;r++) for(var c=0;c<AK_COLS;c++){
    if(gap===1&&(c+r)%5===0) continue; if(gap===2&&(r===2||r===3)&&c%3===1) continue;
    b.push({c:c,r:r,hp:(r===0&&level>1)?2:1}); } return b; }
function akNewBall(){ AK.ball={x:AK.px,y:0.8,vx:0,vy:0,wait:1.0}; }
function arkPlay(){
  show('arkPlay'); akButtons(false); cancelAnimationFrame(AK.raf);
  AK={on:false,frames:[],gaps:0,marks:{},log:[],map:null,phase:'prep',raf:0,best:AK.best||0,wave:[],present:false,dist:null,
      px:0.5,off:0,st:{p:null,last:null,v:0,q:null},range:AK_RANGES[akRange],lock:akLock,pix:akPix,mag:akMag,lives:3,score:0,level:1,speed:0.62,bricks:akBricks(1),ball:null,port:orientSide()||'right'};
  akNewBall(); akText('Готовлюсь','Убери руку. Подбираю громкость зонда.'); mode=null; akDraw();
  pickChannel().then(function(){ return autoLevel(); }).then(function(L){
    if(L.snr<30){ setProbe('off'); akText('Зонда почти не слышно',NOPROBE); akButtons(true); return null; }
    DSP2.init(fs,'all'); DSP2.setCal(PHYS_CAL); mode='ark'; AK.on=true; akMark('empty'); AK.phase='empty';
    akText('Убери руку','Слушаю пустую комнату.'); return rpWait(DSP2); }).then(function(st){
    if(!st) return;
    if(st==='noprobe'){ setProbe('off'); mode=null; AK.on=false; akText('Зонда не слышно',NOPROBE); akButtons(true); return; }
    /* 27.09, запись 11:07: середина по взмахам — (5-й + 95-й перцентиль)/2 — уехала к 12 см: одна дальняя отмашка до 20 см,
       и всю игру ладонь пришлось держать в 9–15 см («очень далеко, неудобно»). Теперь середина — там, где игроку удобно:
       «поставь ладонь и держи», середина — медиана высоты за последние 2 с (фаза и метка по-прежнему называются 'wave') */
    return sleep(600).then(function(){ akMark('wave'); AK.phase='wave'; AK.wave=[];
      akText('Поставь ладонь, где удобно','Это будет середина. Держи две секунды.'); return sleep(1000); }).then(function(){ AK.wave=[]; return sleep(2000); }).then(function(){
      var w=AK.wave.slice().sort(function(a,b){return a-b;}), c=100;
      if(w.length>50) c=w[w.length>>1];
      AK.map={lo:c-AK.range/2,hi:c+AK.range/2,n:w.length,mid:c}; akMark('count'); AK.phase='count';
      akText('3','Ладонь дальше от разъёма — ракетка дальше от него.');
      return sleep(1000).then(function(){ akText('2',''); return sleep(1000); }).then(function(){ akText('1',''); return sleep(1000); }); }).then(function(){
      akMark('play'); AK.phase='play'; akText('',''); AK.last=performance.now(); AK.t0=AK.last; AK.raf=requestAnimationFrame(akLoop); });
  }).catch(function(e){ akText('Не вышло',(e&&e.message)||String(e)); akButtons(true); });
}
function akPaddleX(){ var m=AK.map; if(!m||AK.dist===null) return AK.px; var f=Math.max(0,Math.min(1,(AK.dist-m.lo)/(m.hi-m.lo))); if(AK.port==='left') f=1-f; return 0.09+0.82*f; }
function akEv(k){ AK.log.push([AK.frames.length,k]); }
function akLoop(now){
  if(AK.phase!=='play') return;
  var dt=Math.min(0.033,(now-AK.last)/1000); AK.last=now;
  var cv=el('akC'), ar=(cv.width||800)/(cv.height||400);                           // ширина/высота: мяч летит по-честному круглым
  if(AK.present&&AK.dist!==null&&AK.map) AK.px=akStep(AK.st,AK.dist,dt,AK.map,AK.port,AK.lock,AK.pix); else AK.st.last=null;   /* ладонь пропала — при возвращении ход подхватывается заново */
  var pw=AK.mag?AK_MAG.pw:0.16, py=0.92, B=AK.ball, br=0.018;
  var tgo=0; if(AK.mag&&B.wait<=0&&B.vy>0&&B.y>AK_MAG.from){ var lx=akLand(B,py); if(lx!==null&&Math.abs(lx-AK.px)<AK_MAG.near){ var wgt=Math.min(1,(B.y-AK_MAG.from)/0.3); tgo=Math.max(-AK_MAG.max,Math.min(AK_MAG.max,lx-AK.px))*wgt; } }
  AK.off+=(tgo-AK.off)*Math.min(1,dt*12); var PX=Math.max(pw/2,Math.min(1-pw/2,AK.px+AK.off)); AK.pd=PX;
  if(B.wait>0){ B.wait-=dt; B.x=PX; B.y=py-0.05; if(B.wait<=0){ var a=(-0.35+0.7*Math.random()); B.vx=Math.sin(a)*AK.speed/ar; B.vy=-Math.cos(a)*AK.speed; } }
  else { var steps=3; for(var s=0;s<steps;s++){ B.x+=B.vx*dt/steps; B.y+=B.vy*dt/steps;
      if(B.x<br/ar){ B.x=br/ar; B.vx=Math.abs(B.vx); } if(B.x>1-br/ar){ B.x=1-br/ar; B.vx=-Math.abs(B.vx); } if(B.y<br){ B.y=br; B.vy=Math.abs(B.vy); }
      // ракетка: угол отскока — от места удара (классика)
      if(B.vy>0&&B.y+br>=py&&B.y<py+0.03&&Math.abs(B.x-PX)<=pw/2+br/ar){ var off=(B.x-PX)/(pw/2), ang=off*1.05; AK.speed=Math.min(1.25,AK.speed*1.015);
        B.vx=Math.sin(ang)*AK.speed/ar; B.vy=-Math.cos(ang)*AK.speed; B.y=py-br; akEv('paddle'); }
      // кирпичи: сетка в верхней трети
      var bw=1/AK_COLS, bh=0.045, top=0.08;
      for(var i=0;i<AK.bricks.length;i++){ var k=AK.bricks[i], x0=k.c*bw, y0=top+k.r*bh;
        if(B.x+br/ar>x0&&B.x-br/ar<x0+bw&&B.y+br>y0&&B.y-br<y0+bh){ var ox=Math.min(B.x+br/ar-x0,x0+bw-(B.x-br/ar))*ar, oy=Math.min(B.y+br-y0,y0+bh-(B.y-br));
          if(ox<oy) B.vx=-B.vx; else B.vy=-B.vy; k.hp--; if(k.hp<=0){ AK.bricks.splice(i,1); AK.score+=10*AK.level; akEv('brick'); } else akEv('hit2'); break; } }
      if(B.y>1.03){ AK.lives--; akEv('miss:'+(B.x-PX).toFixed(3)); if(AK.lives>0) akNewBall(); break; } }
    if(!AK.bricks.length){ AK.level++; AK.bricks=akBricks(AK.level); AK.speed=Math.min(1.25,0.62+0.06*(AK.level-1)); akNewBall(); akEv('level'); } }
  AK.log.push([AK.frames.length,+AK.px.toFixed(4),+B.x.toFixed(4),+B.y.toFixed(4),AK.present?1:0,+AK.off.toFixed(4)]);
  akDraw();
  if(AK.lives<=0||AK.frames.length>=AK_MAX){ AK.phase='over'; akMark('over'); AK.on=false; mode=null; setProbe('off'); AK.best=Math.max(AK.best,AK.score);
    akText('Конец','счёт '+AK.score+' · уровень '+AK.level+' · лучший '+AK.best); akButtons(true); return; }
  AK.raf=requestAnimationFrame(akLoop);
}
function akDraw(){ var cv=el('akC'); if(!cv||!cv.getContext) return; var dpr=Math.min(2,window.devicePixelRatio||1), bw0=cv.clientWidth||800, bh0=cv.clientHeight||400;
  if(cv.width!==Math.round(bw0*dpr)){ cv.width=Math.round(bw0*dpr); cv.height=Math.round(bh0*dpr); }
  var c=cv.getContext('2d'), W=cv.width, H=cv.height; c.fillStyle='#0b0a14'; c.fillRect(0,0,W,H);
  var bw=W/AK_COLS, bh=0.045*H, top=0.08*H; (AK.bricks||[]).forEach(function(k){ c.fillStyle=AK_COLORS[k.r%AK_COLORS.length]; c.globalAlpha=k.hp>1?1:0.85;
    c.fillRect(k.c*bw+2*dpr,top+k.r*bh+2*dpr,bw-4*dpr,bh-4*dpr); c.globalAlpha=1; if(k.hp>1){ c.strokeStyle='#fff'; c.lineWidth=dpr; c.strokeRect(k.c*bw+3*dpr,top+k.r*bh+3*dpr,bw-6*dpr,bh-6*dpr); } });
  var pw=(AK.mag?AK_MAG.pw:0.16)*W, px=(AK.pd!==undefined?AK.pd:(AK.px||0.5))*W, py=0.92*H; c.fillStyle=AK.present||AK.phase!=='play'?'#5fe0b8':'#3a6e60'; c.fillRect(px-pw/2,py,pw,0.022*H);
  if(AK.ball){ c.fillStyle='#ffb27a'; c.beginPath(); c.arc(AK.ball.x*W,AK.ball.y*H,0.018*H,0,6.283); c.fill(); }
  if(AK.phase!=='play'){ c.fillStyle='rgba(11,10,20,.72)'; c.fillRect(0,0,W,H); }   /* вне игры поле притушено — надписи поверх читаются */
  c.fillStyle='#E7EDE9'; c.font=Math.round(15*dpr)+'px "IBM Plex Mono",monospace'; c.textAlign='left';
  if(AK.phase==='play'||AK.phase==='over'){ c.fillText(String(AK.score),10*dpr,0.06*H); c.textAlign='right'; c.fillText('♥'.repeat(Math.max(0,AK.lives))+'  ур. '+AK.level,W-10*dpr,0.06*H); }
  c.textAlign='center'; c.fillStyle='#8A9B96'; c.font=Math.round(11*dpr)+'px "IBM Plex Mono",monospace';
  c.fillText(AK.dist===null||AK.dist===undefined?'ладони не слышно':(AK.present?'':'(нет ладони) ')+'ладонь '+(AK.dist/10).toFixed(1).replace('.',',')+' см',W/2,H-6*dpr); }
function akSave(){ if(!AK.frames.length) return; var n=AK.frames.length*N, all=new Float32Array(n); AK.frames.forEach(function(f,j){ all.set(f,j*N); });
  var pk=0; for(var i=0;i<n;i++){ var a=Math.abs(all[i]); if(a>pk) pk=a; }
  var meta={v:3,kind:'ark-play',port:AK.port,ctl:{range:AK.range,lock:AK.lock?AK_LOCK:null,pix:AK.pix?AK_PIX:null,mag:AK.mag?AK_MAG:null},fs:fs,N:N,kLo:kLo,kHi:kHi,probe:{bins:'all',channel:chan,phase:'pi*q^2/M',peak:0.9,gain:PROBE_G,snr_db:PROBE_SNR,f_lo:F_LO,loop:true},
    cal:PHYS_CAL,map:AK.map,marks:AK.marks,log:AK.log,score:AK.score,level:AK.level,lives:AK.lives,samples:n,gaps:AK.gaps,peak:pk,
    orientation:{angle:(screen.orientation&&screen.orientation.angle!==undefined)?screen.orientation.angle:(window.orientation||0),w:window.innerWidth,h:window.innerHeight},
    units:'log: [frame, paddle x 0..1, ball x, ball y (0 top), palm seen] or [frame, event]; paddle x = 0.09+0.82·f, f from height (DSP2, PHYS_CAL) by map, mirrored if the port is on the left',
    ua:navigator.userAgent,date:new Date().toISOString()};
  var b=wav(all,meta), d=new Date(), z=function(x){ return (x<10?'0':'')+x; };
  var name='sonarark_'+d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'_'+z(d.getHours())+z(d.getMinutes())+'.wav'; AK.blob=b; AK.fname=name;
  if(navigator.canShare){ try{ var fl=new File([b],name,{type:'audio/wav'}); if(navigator.canShare({files:[fl]})){ navigator.share({files:[fl],title:name}).catch(function(){}); return; } }catch(e){} }
  var a2=document.createElement('a'); a2.href=URL.createObjectURL(b); a2.download=name; document.body.appendChild(a2); a2.click(); setTimeout(function(){ a2.remove(); },1000); }
el('goArk').addEventListener('click',function(){ boot().then(function(){ lastRec='ark'; viaOrient('arkIntro'); }).catch(fail); });
el('arkGo').addEventListener('click',function(){ arkPlay(); });
el('arkBack').addEventListener('click',function(){ show('home'); });
el('arkRange').addEventListener('click',akRangeNext); el('arkLock').addEventListener('click',akLockNext); el('arkPix').addEventListener('click',akPixNext); el('arkMag').addEventListener('click',akMagNext); akCtlLabel();
el('akSet').addEventListener('click',function(){ cancelAnimationFrame(AK.raf); AK.on=false; AK.phase=''; mode=null; setProbe('off'); show('arkIntro'); });
el('akAgain').addEventListener('click',function(){ arkPlay(); });
el('akSave').addEventListener('click',function(){ akSave(); });
el('akStop').addEventListener('click',function(){ if(AK.phase==='play'){ AK.lives=0; return; } cancelAnimationFrame(AK.raf); AK.on=false; AK.phase=''; mode=null; setProbe('off'); akText('Остановлено',''); akButtons(true); });
el('akHome').addEventListener('click',function(){ cancelAnimationFrame(AK.raf); AK.on=false; AK.phase=''; mode=null; setProbe('off'); show('home'); });
