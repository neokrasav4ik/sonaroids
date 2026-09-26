
/* ── АРКАНОИД: прототип (с 27.09) ──
   Решение автора 27.09: следующая игра — Арканоид, режимом внутри Sonaroids (сборник ретро-игр с сонарным управлением);
   сначала прототип в лабе. Управление — проверенное: телефон горизонтально, разъём смотрит на ладонь (в руке — ладонь к торцу
   и от него; на столе — вверх-вниз над столом). Ракетка внизу ходит влево-вправо (вариант «Б» эскиза): ладонь дальше от
   разъёма — ракетка дальше от него (разъём справа — правее; повёрнут влево — зеркально). Подготовка как в пробе «ладонь справа»:
   пустая комната → взмахи 6 с (ход на всю ширину — 5-й и 95-й перцентили, 50–140 мм) → отсчёт → мяч сам. Касаний нет.
   Пишется звук (до 150 с), метки фаз, карта хода и по кадрам ракетка/мяч/события — sonarark_*.wav, разбор tools/eval_ark.js. */
var AK={on:false,frames:[],gaps:0,marks:{},log:[],map:null,phase:'',raf:0,best:0};
var AK_MAX=Math.round(150*48000/512), AK_COLS=12, AK_ROWS=6, AK_COLORS=['#f2a7c3','#e8b4f0','#c9b8e8','#9fd3f0','#a8e6cf','#ffd59e'];
/* 27.09, запись 00:40: «в целом норм, но ракетка дёрганая, не хватало плавности». Показания доходят ровно (1–2 замера на кадр экрана),
   дрожь ~1% ширины — в точках экрана та же, что у корабля Sonaroids, но ракетка — длинная гладкая планка на длинной стороне, и её видно.
   Расчёт на записи: сглаживание 60 мс — дрожь −20%, +50 мс отставания; мёртвая зона (ракетка не отзывается на мелочь) — ещё −⅓ шевеления
   в покое. Переключатель «Плавность»: нет / средняя (60 мс + 0,5% ширины) / сильная (100 мс + 0,7%) — выбрать рукой. */
var AK_SM=[{n:'нет',tau:0,db:0},{n:'средняя',tau:0.06,db:0.005},{n:'сильная',tau:0.1,db:0.007}], akSm=1;
try{ var sv=parseInt(localStorage.getItem('sonar_ark_smooth'),10); if(sv>=0&&sv<AK_SM.length) akSm=sv; }catch(e){}
function akSmLabel(){ ['arkSmooth','akSmooth'].forEach(function(id){ el(id).textContent='Плавность: '+AK_SM[akSm].n; }); }
function akSmNext(){ akSm=(akSm+1)%AK_SM.length; try{ localStorage.setItem('sonar_ark_smooth',String(akSm)); }catch(e){} akSmLabel(); }
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
      px:0.5,pf:null,sm:akSm,lives:3,score:0,level:1,speed:0.62,bricks:akBricks(1),ball:null,port:orientSide()||'right'};
  akNewBall(); akText('Готовлюсь','Убери руку. Подбираю громкость зонда.'); mode=null; akDraw();
  pickChannel().then(function(){ return autoLevel(); }).then(function(L){
    if(L.snr<30){ setProbe('off'); akText('Зонда почти не слышно',NOPROBE); akButtons(true); return null; }
    DSP2.init(fs,'all'); DSP2.setCal(PHYS_CAL); mode='ark'; AK.on=true; akMark('empty'); AK.phase='empty';
    akText('Убери руку','Слушаю пустую комнату.'); return rpWait(DSP2); }).then(function(st){
    if(!st) return;
    if(st==='noprobe'){ setProbe('off'); mode=null; AK.on=false; akText('Зонда не слышно',NOPROBE); akButtons(true); return; }
    return sleep(600).then(function(){ akMark('wave'); AK.phase='wave'; AK.wave=[];
      akText('Помаши ладонью','У разъёма: ближе — дальше, как в игре (5–15 см). Шесть секунд.'); return sleep(6000); }).then(function(){
      var w=AK.wave.slice().sort(function(a,b){return a-b;}), lo=50, hi=150;
      if(w.length>50){ lo=w[Math.floor(w.length*0.05)]; hi=w[Math.floor(w.length*0.95)]; }
      if(hi-lo<50){ var c=(hi+lo)/2; lo=c-25; hi=c+25; } if(hi-lo>140){ var c2=(hi+lo)/2; lo=c2-70; hi=c2+70; }
      AK.map={lo:lo,hi:hi,n:w.length}; akMark('count'); AK.phase='count';
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
  if(AK.present){ var tg=akPaddleX(), S=AK_SM[AK.sm], aa=S.tau>0?1-Math.exp(-dt/S.tau):1; AK.pf=AK.pf===null?tg:AK.pf+aa*(tg-AK.pf);
    if(AK.pf-AK.px>S.db) AK.px=AK.pf-S.db; else if(AK.px-AK.pf>S.db) AK.px=AK.pf+S.db; }
  var pw=0.16, py=0.92, B=AK.ball, br=0.018;
  if(B.wait>0){ B.wait-=dt; B.x=AK.px; B.y=py-0.05; if(B.wait<=0){ var a=(-0.35+0.7*Math.random()); B.vx=Math.sin(a)*AK.speed/ar; B.vy=-Math.cos(a)*AK.speed; } }
  else { var steps=3; for(var s=0;s<steps;s++){ B.x+=B.vx*dt/steps; B.y+=B.vy*dt/steps;
      if(B.x<br/ar){ B.x=br/ar; B.vx=Math.abs(B.vx); } if(B.x>1-br/ar){ B.x=1-br/ar; B.vx=-Math.abs(B.vx); } if(B.y<br){ B.y=br; B.vy=Math.abs(B.vy); }
      // ракетка: угол отскока — от места удара (классика)
      if(B.vy>0&&B.y+br>=py&&B.y<py+0.03&&Math.abs(B.x-AK.px)<=pw/2+br/ar){ var off=(B.x-AK.px)/(pw/2), ang=off*1.05; AK.speed=Math.min(1.25,AK.speed*1.015);
        B.vx=Math.sin(ang)*AK.speed/ar; B.vy=-Math.cos(ang)*AK.speed; B.y=py-br; akEv('paddle'); }
      // кирпичи: сетка в верхней трети
      var bw=1/AK_COLS, bh=0.045, top=0.08;
      for(var i=0;i<AK.bricks.length;i++){ var k=AK.bricks[i], x0=k.c*bw, y0=top+k.r*bh;
        if(B.x+br/ar>x0&&B.x-br/ar<x0+bw&&B.y+br>y0&&B.y-br<y0+bh){ var ox=Math.min(B.x+br/ar-x0,x0+bw-(B.x-br/ar))*ar, oy=Math.min(B.y+br-y0,y0+bh-(B.y-br));
          if(ox<oy) B.vx=-B.vx; else B.vy=-B.vy; k.hp--; if(k.hp<=0){ AK.bricks.splice(i,1); AK.score+=10*AK.level; akEv('brick'); } else akEv('hit2'); break; } }
      if(B.y>1.03){ AK.lives--; akEv('miss:'+(B.x-AK.px).toFixed(3)); if(AK.lives>0) akNewBall(); break; } }
    if(!AK.bricks.length){ AK.level++; AK.bricks=akBricks(AK.level); AK.speed=Math.min(1.25,0.62+0.06*(AK.level-1)); akNewBall(); akEv('level'); } }
  AK.log.push([AK.frames.length,+AK.px.toFixed(4),+B.x.toFixed(4),+B.y.toFixed(4),AK.present?1:0]);
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
  var pw=0.16*W, px=(AK.px||0.5)*W, py=0.92*H; c.fillStyle=AK.present||AK.phase!=='play'?'#5fe0b8':'#3a6e60'; c.fillRect(px-pw/2,py,pw,0.022*H);
  if(AK.ball){ c.fillStyle='#ffb27a'; c.beginPath(); c.arc(AK.ball.x*W,AK.ball.y*H,0.018*H,0,6.283); c.fill(); }
  if(AK.phase!=='play'){ c.fillStyle='rgba(11,10,20,.72)'; c.fillRect(0,0,W,H); }   /* вне игры поле притушено — надписи поверх читаются */
  c.fillStyle='#E7EDE9'; c.font=Math.round(15*dpr)+'px "IBM Plex Mono",monospace'; c.textAlign='left';
  if(AK.phase==='play'||AK.phase==='over'){ c.fillText(String(AK.score),10*dpr,0.06*H); c.textAlign='right'; c.fillText('♥'.repeat(Math.max(0,AK.lives))+'  ур. '+AK.level,W-10*dpr,0.06*H); }
  c.textAlign='center'; c.fillStyle='#8A9B96'; c.font=Math.round(11*dpr)+'px "IBM Plex Mono",monospace';
  c.fillText(AK.dist===null||AK.dist===undefined?'ладони не слышно':(AK.present?'':'(нет ладони) ')+'ладонь '+(AK.dist/10).toFixed(1).replace('.',',')+' см',W/2,H-6*dpr); }
function akSave(){ if(!AK.frames.length) return; var n=AK.frames.length*N, all=new Float32Array(n); AK.frames.forEach(function(f,j){ all.set(f,j*N); });
  var pk=0; for(var i=0;i<n;i++){ var a=Math.abs(all[i]); if(a>pk) pk=a; }
  var meta={v:1,kind:'ark-play',port:AK.port,smooth:AK_SM[AK.sm],fs:fs,N:N,kLo:kLo,kHi:kHi,probe:{bins:'all',channel:chan,phase:'pi*q^2/M',peak:0.9,gain:PROBE_G,snr_db:PROBE_SNR,f_lo:F_LO,loop:true},
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
el('arkSmooth').addEventListener('click',akSmNext); el('akSmooth').addEventListener('click',akSmNext); akSmLabel();
el('akAgain').addEventListener('click',function(){ arkPlay(); });
el('akSave').addEventListener('click',function(){ akSave(); });
el('akStop').addEventListener('click',function(){ if(AK.phase==='play'){ AK.lives=0; return; } cancelAnimationFrame(AK.raf); AK.on=false; AK.phase=''; mode=null; setProbe('off'); akText('Остановлено',''); akButtons(true); });
el('akHome').addEventListener('click',function(){ cancelAnimationFrame(AK.raf); AK.on=false; AK.phase=''; mode=null; setProbe('off'); show('home'); });
