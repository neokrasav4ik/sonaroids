
/* ── ЛАДОНЬ СПРАВА (с 27.09): новая механика на пробу ──
   Телефон вертикально, экраном вверх, разъёмом к игроку. Правая ладонь ребром (мизинец внизу, ладонью к телефону) стоит справа
   от нижнего торца, на одной линии с ним, в 5–15 см. Сонар меряет расстояние от разъёма до ладони: дальше вправо — корабль правее.
   Точность, если ладонь слышна сбоку от разъёма, должна быть как у нынешней игры — меряется то же расстояние.
   Две вещи: «Запись по метке» (16 с, как «Запись для меня», метка ходит по дорожке внизу; разбор — tools/eval_recording.js)
   и «Проба-игра»: корабль внизу экрана ходит влево-вправо, камни падают сверху. Проба пишет весь звук (до 150 с) и что делал
   корабль — файл sonarright_*.wav, разбор — tools/eval_right.js. */
var SCRIPT_RIGHT=[
  {t:0,  k:'empty', say:'Убери руку',            sub:'Ничего рядом с телефоном. Снимаю пустую комнату.', H:function(){return null;}, d:'—'},
  {t:3,  k:'place', say:'Ладонь справа, 10 см',   sub:'Ребром, ладонью к телефону, на одной линии с нижним торцом. Напротив метки.', H:function(){return 100;}, d:'100'},
  {t:5,  k:'move',  say:'Веди за меткой',         sub:'Вправо — дальше от телефона, влево — ближе.', H:function(t){return sn(t,5);}, d:'100+50*sin(2pi(t-5)/6)'},
  {t:11, k:'hold',  say:'Замри',                  sub:'Три секунды неподвижно на 10 см.', H:function(){return 100;}, d:'100'},
  {t:14, k:'away',  say:'Убери руку',             sub:'Совсем.', H:function(){return null;}, d:'—'},
  {t:16, k:'end'}
];
/* дорожка для записи по метке: расстояние 3–17 см слева направо (у левого края — ближе к телефону) */
function xOfMM(v){ return (v-30)/140*trackW; }
function buildRTrack(){ var tr=el('trH'); trackW=tr.getBoundingClientRect().width||300;
  Array.prototype.slice.call(tr.querySelectorAll('.lab,.tick')).forEach(function(x){ x.remove(); });
  [50,100,150].forEach(function(v){ var l=document.createElement('div'); l.className='lab'; l.textContent=(v/10)+' см'; l.style.left=xOfMM(v)+'px'; tr.appendChild(l);
    var k=document.createElement('div'); k.className='tick'; k.style.left=xOfMM(v)+'px'; tr.appendChild(k); }); }
function rightOri(){ if(el('rightIntro').classList.contains('hidden')) return; var up=window.innerHeight>window.innerWidth;
  el('rightOri').textContent=up?'Экран вертикально — можно начинать.':'Экран ещё горизонтальный. Поверни телефон вертикально; если экран не поворачивается — выключи блокировку поворота.';
  el('rightOri').className=up?'good':'bad'; el('rightRec').disabled=!up; el('rightPlayGo').disabled=!up; }
function toRight(){ lastRec='recRight'; show('rightIntro'); rightOri(); }
window.addEventListener('resize',function(){ setTimeout(rightOri,80); });

/* ── проба-игра ── */
var RP={on:false,frames:[],gaps:0,marks:{},ship:[],map:null,phase:'',t0:0,lives:3,score:0,rocks:[],inv:0,spawn:0,last:0,x:0.5,present:false,dist:null,raf:0,best:0};
var RP_MAX=Math.round(150*48000/512);
function rpFrame(f,gap,r){ if(!RP.on) return; if(RP.frames.length<RP_MAX){ if(gap) RP.gaps++; RP.frames.push(f); }
  if(r){ RP.present=r.present; if(r.present){ RP.dist=r.height; if(RP.phase==='wave') RP.wave.push(r.height); } } }
function rpMark(k){ RP.marks[k]=RP.frames.length*N; }
function rpText(a,b){ el('rpSay').textContent=a; el('rpSub').textContent=b||''; }
function rpButtons(v){ el('rpBtns').classList.toggle('hidden',!v); }
function rightPlay(){
  show('rightPlay'); rpButtons(false); cancelAnimationFrame(RP.raf);
  RP={on:false,frames:[],gaps:0,marks:{},ship:[],map:null,phase:'prep',t0:0,lives:3,score:0,rocks:[],inv:0,spawn:0.6,last:0,x:0.5,present:false,dist:null,raf:0,wave:[],best:RP.best||0};
  rpText('Готовлюсь','Убери руку. Подбираю громкость зонда.'); mode=null; rpDraw();
  pickChannel().then(function(){ return autoLevel(); }).then(function(L){
    if(L.snr<30){ setProbe('off'); rpText('Зонда почти не слышно',NOPROBE); rpButtons(true); return null; }
    DSP2.init(fs,'all'); DSP2.setCal(PHYS_CAL); mode='right'; RP.on=true; rpMark('empty'); RP.phase='empty';
    rpText('Убери руку','Слушаю пустую комнату.'); return waitReady(); }).then(function(st){
    if(!st) return;
    if(st==='noprobe'){ setProbe('off'); mode=null; RP.on=false; rpText('Зонда не слышно',NOPROBE); rpButtons(true); return; }
    return sleep(600).then(function(){ rpMark('wave'); RP.phase='wave'; RP.wave=[];
      rpText('Помаши ладонью','Справа от нижнего торца: ближе — дальше, от 5 до 15 см. Шесть секунд.');
      return sleep(6000); }).then(function(){
      var w=RP.wave.slice().sort(function(a,b){return a-b;}), lo=50, hi=150;
      if(w.length>50){ lo=w[Math.floor(w.length*0.05)]; hi=w[Math.floor(w.length*0.95)]; }
      if(hi-lo<40){ var c=(hi+lo)/2; lo=c-20; hi=c+20; } if(hi-lo>140){ var c2=(hi+lo)/2; lo=c2-70; hi=c2+70; }
      RP.map={lo:lo,hi:hi,n:w.length}; rpMark('count'); RP.phase='count';
      rpText('3','Ладонь дальше — корабль правее.');
      return sleep(1000).then(function(){ rpText('2',''); return sleep(1000); }).then(function(){ rpText('1',''); return sleep(1000); }); }).then(function(){
      rpMark('play'); RP.phase='play'; rpText('',''); RP.t0=performance.now(); RP.last=RP.t0; RP.raf=requestAnimationFrame(rpLoop); });
  }).catch(function(e){ rpText('Не вышло',(e&&e.message)||String(e)); rpButtons(true); });
}
function rpShipX(){ var m=RP.map; if(!m||RP.dist===null) return RP.x; var f=(RP.dist-m.lo)/(m.hi-m.lo); return 0.06+0.88*Math.max(0,Math.min(1,f)); }
function rpLoop(now){
  if(RP.phase!=='play') return;
  var dt=Math.min(0.05,(now-RP.last)/1000); RP.last=now; var t=(now-RP.t0)/1000;
  if(RP.present) RP.x=rpShipX();
  RP.ship.push([RP.frames.length,+RP.x.toFixed(4),RP.present?1:0]);
  var sp=0.28+0.012*t, every=Math.max(0.35,0.95-0.01*t);                         // доля высоты экрана в секунду; камни чаще со временем
  RP.spawn-=dt; if(RP.spawn<=0){ RP.spawn=every*(0.7+0.6*Math.random()); RP.rocks.push({x:0.06+0.88*Math.random(),y:-0.05,r:0.035+0.035*Math.random(),v:sp*(0.8+0.4*Math.random())}); }
  var cv=el('rpC'), W=cv.width, H=cv.height, ar=W/H, sy=0.86, sr=0.035;
  RP.rocks.forEach(function(k){ k.y+=k.v*dt; });
  RP.rocks=RP.rocks.filter(function(k){ if(k.y>1.08){ RP.score++; return false; } return true; });
  if(RP.inv>0) RP.inv-=dt;
  else RP.rocks.forEach(function(k){ var dx=(k.x-RP.x)*ar, dy=k.y-sy; if(!k.hit&&Math.hypot(dx,dy)<(k.r*ar+sr*ar)*0.8){ k.hit=true; RP.lives--; RP.inv=1.2; RP.ship.push([RP.frames.length,'hit']); } });
  rpDraw();
  if(RP.lives<=0||RP.frames.length>=RP_MAX){ RP.phase='over'; rpMark('over'); RP.on=false; mode=null; setProbe('off'); RP.best=Math.max(RP.best,RP.score);
    rpText('Конец',RP.score+' камней пропущено · лучший '+RP.best+' · '+t.toFixed(0)+' с'); rpButtons(true); return; }
  RP.raf=requestAnimationFrame(rpLoop);
}
function rpDraw(){ var cv=el('rpC'); if(!cv||!cv.getContext) return; var dpr=window.devicePixelRatio||1, bw=cv.clientWidth||300, bh=cv.clientHeight||600;
  if(cv.width!==Math.round(bw*dpr)){ cv.width=Math.round(bw*dpr); cv.height=Math.round(bh*dpr); }
  var c=cv.getContext('2d'), W=cv.width, H=cv.height; c.fillStyle='#04070A'; c.fillRect(0,0,W,H);
  c.fillStyle='#8d7bb3'; RP.rocks.forEach(function(k){ c.beginPath(); c.arc(k.x*W,k.y*H,k.r*W,0,6.283); c.fill(); });
  var sx=RP.x*W, sy=0.86*H, s=0.035*W; if(!(RP.inv>0&&Math.floor(RP.inv*10)%2)){ c.fillStyle=RP.present||RP.phase!=='play'?'#5fe0b8':'#3a6e60';
    c.beginPath(); c.moveTo(sx,sy-s*1.3); c.lineTo(sx-s,sy+s); c.lineTo(sx+s,sy+s); c.closePath(); c.fill(); }
  c.fillStyle='#E7EDE9'; c.font=Math.round(16*dpr)+'px "IBM Plex Mono",monospace'; c.textAlign='left';
  if(RP.phase==='play'||RP.phase==='over'){ c.fillText(String(RP.score),12*dpr,26*dpr); c.textAlign='right'; c.fillText('♥'.repeat(Math.max(0,RP.lives)),W-12*dpr,26*dpr); }
  c.textAlign='center'; c.fillStyle='#8A9B96'; c.font=Math.round(12*dpr)+'px "IBM Plex Mono",monospace';
  c.fillText(RP.dist===null?'ладони не слышно':(RP.present?'':'(нет ладони) ')+'ладонь '+(RP.dist/10).toFixed(1).replace('.',',')+' см',W/2,H-10*dpr); }
function rpSave(){ if(!RP.frames.length) return; var n=RP.frames.length*N, all=new Float32Array(n); RP.frames.forEach(function(f,j){ all.set(f,j*N); });
  var pk=0; for(var i=0;i<n;i++){ var a=Math.abs(all[i]); if(a>pk) pk=a; }
  var meta={v:1,kind:'right-play',fs:fs,N:N,kLo:kLo,kHi:kHi,probe:{bins:'all',channel:chan,phase:'pi*q^2/M',peak:0.9,gain:PROBE_G,snr_db:PROBE_SNR,f_lo:F_LO,loop:true},
    cal:PHYS_CAL,map:RP.map,marks:RP.marks,ship:RP.ship,score:RP.score,lives:RP.lives,samples:n,gaps:RP.gaps,peak:pk,
    orientation:{angle:(screen.orientation&&screen.orientation.angle!==undefined)?screen.orientation.angle:(window.orientation||0),w:window.innerWidth,h:window.innerHeight},
    units:'ship: [frame, x 0..1 across the screen, palm seen]; map: height mm (DSP2, PHYS_CAL) → screen, lo → 6%, hi → 94%',ua:navigator.userAgent,date:new Date().toISOString()};
  var b=wav(all,meta), d=new Date(), z=function(x){ return (x<10?'0':'')+x; };
  var name='sonarright_'+d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'_'+z(d.getHours())+z(d.getMinutes())+'.wav';
  RP.blob=b; RP.fname=name;
  if(navigator.canShare){ try{ var fl=new File([b],name,{type:'audio/wav'}); if(navigator.canShare({files:[fl]})){ navigator.share({files:[fl],title:name}).catch(function(){}); return; } }catch(e){} }
  var a2=document.createElement('a'); a2.href=URL.createObjectURL(b); a2.download=name; document.body.appendChild(a2); a2.click(); setTimeout(function(){ a2.remove(); },1000); }
el('goRight').addEventListener('click',function(){ boot().then(toRight).catch(fail); });
el('rightRec').addEventListener('click',function(){ lastRec='recRight'; runRec('right'); });
el('rightPlayGo').addEventListener('click',function(){ lastRec='recRight'; rightPlay(); });
el('rightBack').addEventListener('click',function(){ show('home'); });
el('rpAgain').addEventListener('click',function(){ rightPlay(); });
el('rpSave').addEventListener('click',function(){ rpSave(); });
el('rpStop').addEventListener('click',function(){ if(RP.phase==='play'){ RP.lives=0; return; } cancelAnimationFrame(RP.raf); RP.on=false; RP.phase=''; mode=null; setProbe('off'); rpText('Остановлено',''); rpButtons(true); });
el('rpHome').addEventListener('click',function(){ cancelAnimationFrame(RP.raf); RP.on=false; RP.phase=''; mode=null; setProbe('off'); show('home'); });
