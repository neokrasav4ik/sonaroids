/* ── ДВЕ ЛАДОНИ («мультисонар», с 27.09, 0.39o) ──
   Идея автора 27.09: телефон лежит на столе вертикально, разъёмом к игроку; игрок двигает две ладони (чуть согнутые, «магические пассы»)
   к телефону и от него — то вместе, то по очереди. Один микрофон слышит расстояния и скорости всех отражателей сразу, но не слышит, где они
   слева или справа. Запись по метке отвечает на вопросы: (1) отличаются ли «вместе» и «по очереди» (по очереди — одна ладонь приближается,
   другая удаляется: в эхе одновременно обе стороны скорости); (2) видны ли две ладони порознь, когда они на разных расстояниях;
   (3) есть ли хоть какая-то разница между «только левая» и «только правая». Метки — расстояние каждой ладони от нижнего торца в мм.
   Разбор — tools/eval_two.js (карта «расстояние × скорость»). Файл sonartwo_*.wav. */
var TWO_M=120, TWO_A=50;
function twoSin(t0,per,ph){ return function(t){ return TWO_M+TWO_A*Math.sin(2*Math.PI*(t-t0)/per+(ph||0)); }; }
function twoK(v){ return function(){ return v; }; }
var SCRIPT_TWO=[
  {t:0,  k:'empty', say:'Убери руки',           sub:'Ничего рядом с телефоном. Снимаю пустую комнату.', L:null, R:null, d:'—'},
  {t:3,  k:'place', say:'Обе ладони к разъёму',  sub:'Чуть согнутые, пальцами к телефону, по бокам от разъёма. Напротив меток.', L:twoK(TWO_M), R:twoK(TWO_M), d:'L=R=120'},
  {t:6,  k:'both',  say:'Обе вместе',            sub:'Вперёд-назад за метками, одновременно.', L:twoSin(6,3), R:twoSin(6,3), d:'L=R=120+50sin(2pi(t-6)/3)'},
  {t:18, k:'alt',   say:'По очереди',            sub:'Одна к телефону — другая от него. За метками.', L:twoSin(18,3), R:twoSin(18,3,Math.PI), d:'L=120+50sin(2pi(t-18)/3), R=120-50sin(..)'},
  {t:30, k:'left',  say:'Только левая',          sub:'Правая замерла напротив своей метки.', L:twoSin(30,2.7), R:twoK(TWO_M), d:'L=120+50sin(2pi(t-30)/2.7), R=120'},
  {t:38, k:'right', say:'Только правая',         sub:'Левая замерла напротив своей метки.', L:twoK(TWO_M), R:twoSin(38,2.7), d:'L=120, R=120+50sin(2pi(t-38)/2.7)'},
  {t:46, k:'nl',    say:'Левая близко, правая далеко', sub:'Обе качаются за метками: левая чуть-чуть у телефона, правая шире и дальше.', L:function(t){ return 70+15*Math.sin(2*Math.PI*(t-46)/2); }, R:function(t){ return 170+30*Math.sin(2*Math.PI*(t-46)/2.7); }, d:'L=70+15sin(2pi(t-46)/2), R=170+30sin(2pi(t-46)/2.7)'},
  {t:53, k:'nr',    say:'Наоборот',              sub:'Правая чуть-чуть у телефона, левая шире и дальше.', L:function(t){ return 170+30*Math.sin(2*Math.PI*(t-53)/2.7); }, R:function(t){ return 70+15*Math.sin(2*Math.PI*(t-53)/2); }, d:'L=170+30sin(2pi(t-53)/2.7), R=70+15sin(2pi(t-53)/2)'},
  {t:60, k:'away',  say:'Убери руки',            sub:'Совсем.', L:null, R:null, d:'—'},
  {t:63, k:'end'}
];
/* 27.09, вариант автора «кулак и ладонь»: руки различаются не местом, а «голосом» эха — кулак меньше и круглее (эхо слабее, собрано),
   согнутая ладонь больше (эхо сильнее, пальцы дают разброс скорости). Проверка: по одной руке, потом руки меняются местами —
   если «кулак» и «ладонь» различимы при любой стороне, руку можно узнать по эху. Метки L/R — как в «двух ладонях». */
var SCRIPT_FIST=[
  {t:0,  k:'empty', say:'Убери руки',                sub:'Ничего рядом с телефоном. Снимаю пустую комнату.', L:null, R:null, d:'—'},
  {t:3,  k:'place', say:'Левая — кулак, правая — ладонь', sub:'Обе напротив меток. Кулак костяшками к телефону, ладонь чуть согнута.', L:twoK(TWO_M), R:twoK(TWO_M), d:'L=R=120'},
  {t:6,  k:'fL',    say:'Двигай кулаком',            sub:'Левый кулак за меткой, правая ладонь замерла.', L:twoSin(6,2.7), R:twoK(TWO_M), d:'L=120+50sin(2pi(t-6)/2.7), R=120'},
  {t:14, k:'pR',    say:'Двигай ладонью',            sub:'Правая ладонь за меткой, кулак замер.', L:twoK(TWO_M), R:twoSin(14,2.7), d:'L=120, R=120+50sin(2pi(t-14)/2.7)'},
  {t:22, k:'bothA', say:'Оба вместе',                sub:'Кулак и ладонь за метками, одновременно.', L:twoSin(22,3), R:twoSin(22,3), d:'L=R=120+50sin(2pi(t-22)/3)'},
  {t:30, k:'swap',  say:'Поменяй руки',              sub:'Теперь левая — ладонь, правая — кулак. Напротив меток.', L:twoK(TWO_M), R:twoK(TWO_M), d:'L=R=120'},
  {t:34, k:'pL',    say:'Двигай ладонью',            sub:'Левая ладонь за меткой, кулак замер.', L:twoSin(34,2.7), R:twoK(TWO_M), d:'L=120+50sin(2pi(t-34)/2.7), R=120'},
  {t:42, k:'fR',    say:'Двигай кулаком',            sub:'Правый кулак за меткой, ладонь замерла.', L:twoK(TWO_M), R:twoSin(42,2.7), d:'L=120, R=120+50sin(2pi(t-42)/2.7)'},
  {t:50, k:'bothB', say:'Оба вместе',                sub:'Ладонь и кулак за метками, одновременно.', L:twoSin(50,3), R:twoSin(50,3), d:'L=R=120+50sin(2pi(t-50)/3)'},
  {t:58, k:'away',  say:'Убери руки',                sub:'Совсем.', L:null, R:null, d:'—'},
  {t:61, k:'end'}
];
var twoVar='two'; try{ if(localStorage.getItem('sonar_two_var')==='fist') twoVar='fist'; }catch(e){}
function twoVarLabel(){ el('twoVar').textContent='Вариант: '+(twoVar==='fist'?'кулак и ладонь':'две ладони'); }
var TWO_LO=40, TWO_HI=220;
function twoDraw(L,R){ var cv=el('twC'); if(!cv||!cv.getContext) return; var dpr=Math.min(2,window.devicePixelRatio||1), w=cv.clientWidth||360, h=cv.clientHeight||300;
  if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){ cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr); }
  var c=cv.getContext('2d'), W=cv.width, H=cv.height, top=0.06*H, bot=0.94*H, Y=function(v){ return top+(v-TWO_LO)/(TWO_HI-TWO_LO)*(bot-top); };
  c.clearRect(0,0,W,H);
  /* сверху — телефон (разъём), вниз — к игроку: ладонь ниже — дальше от телефона */
  c.fillStyle='#3A4A52'; c.fillRect(W*0.38,0,W*0.24,0.03*H); c.fillStyle='#8A9B96'; c.font=Math.round(11*dpr)+'px "IBM Plex Mono",monospace'; c.textAlign='center'; c.fillText('разъём',W/2,0.03*H+13*dpr);
  [60,100,140,180,220].forEach(function(v){ c.fillStyle='#253139'; c.fillRect(W*0.12,Y(v),W*0.76,1); c.fillStyle='#8A9B96'; c.textAlign='center'; c.fillText((v/10)+' см',W/2,Y(v)-3*dpr); });
  [[L,0.25,'левая'],[R,0.75,'правая']].forEach(function(q){ var x=W*q[1]; c.fillStyle='#253139'; c.fillRect(x-1,top,2,bot-top);
    if(q[0]!==null){ c.fillStyle='#3F92AB'; c.beginPath(); c.ellipse(x,Y(q[0]),W*0.09,0.03*H,0,0,6.283); c.fill(); }
    c.fillStyle='#E7EDE9'; c.textAlign='center'; c.fillText(q[2],x,H-4*dpr); }); }
function runTwo(){ var S=twoVar==='fist'?SCRIPT_FIST:SCRIPT_TWO, TOT=S[S.length-1].t;
  show('recTwo'); el('twSay').textContent='Выбираю динамик'; el('twSub').textContent='Руки убраны.'; el('twClock').textContent=''; twoDraw(null,null);
  mode=null; rec={on:false,frames:[],gaps:0}; var prom;
  pickChannel().then(function(){ return autoLevel(); }).then(function(){ mode='rec'; el('twSub').textContent='Телефон лежит, разъём к тебе.'; return sleep(400).then(function(){ return collect(10); }); }).then(function(fr){
    prom=promSub(fr,'all');
    if(prom<15){ el('twSay').textContent='Зонда не слышно'; el('twSub').textContent='Прибавь громкость, выключи беззвучный, отключи наушники, открой динамики. Сейчас '+prom.toFixed(0)+' дБ, нужно 15.';
      setProbe('off'); mode=null; return sleep(7000).then(function(){ show('home'); }); }
    var marks={}, t0=performance.now(), cur=-1; rec.on=true;
    return new Promise(function(done){ (function tick(){ var t=(performance.now()-t0)/1000, i; for(i=S.length-1;i>=0;i--) if(t>=S[i].t) break;
        if(i!==cur){ cur=i; var s=S[i]; if(s.k==='end'){ done(marks); return; } marks[s.k]=rec.frames.length*N; el('twSay').textContent=s.say; el('twSub').textContent=s.sub; }
        var s2=S[cur]; twoDraw(s2.L?s2.L(t):null,s2.R?s2.R(t):null); el('twClock').textContent=t.toFixed(1)+' / '+TOT+' с'; requestAnimationFrame(tick); })(); }).then(function(marks){
      rec.on=false; setProbe('off'); mode=null;
      var n=rec.frames.length*N, all=new Float32Array(n); rec.frames.forEach(function(f,j){ all.set(f,j*N); });
      var pk=0; for(var i=0;i<n;i++){ var a=Math.abs(all[i]); if(a>pk) pk=a; }
      var so=(screen.orientation&&screen.orientation.angle!==undefined)?screen.orientation.angle:(window.orientation||0);
      recMeta={v:4,kind:'two-portrait',variant:twoVar,fs:fs,N:N,kLo:kLo,kHi:kHi,probe:{bins:'all',channel:chan,phase:'pi*q^2/M',peak:0.9,gain:PROBE_G,snr_db:PROBE_SNR,f_lo:F_LO,loop:true},
        prom_db:prom,samples:n,gaps:rec.gaps,peak:pk,orientation:{angle:so,w:window.innerWidth,h:window.innerHeight},
        script:S.filter(function(s){return s.k!=='end';}).map(function(s){ return {k:s.k,t:s.t,H:s.d}; }),
        marks:marks,units:'target distance of each palm (L, R — as the player sees them) from the bottom end of the phone in mm; phone flat, portrait, port towards the player',ua:navigator.userAgent,date:new Date().toISOString()};
      blob=wav(all,recMeta); var d=new Date(), z=function(x){ return (x<10?'0':'')+x; };
      fname=(twoVar==='fist'?'sonarfist_':'sonartwo_')+d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'_'+z(d.getHours())+z(d.getMinutes())+'.wav'; showDone(pk,prom); }); }); }
function toTwo(){ lastRec='recTwo'; twoVarLabel(); show('twoIntro'); }
el('twoVar').addEventListener('click',function(){ twoVar=twoVar==='fist'?'two':'fist'; try{ localStorage.setItem('sonar_two_var',twoVar); }catch(e){} twoVarLabel(); });
el('goTwo').addEventListener('click',function(){ boot().then(toTwo).catch(fail); });
el('twoGo').addEventListener('click',function(){ lastRec='recTwo'; runTwo(); });
el('twoBack').addEventListener('click',function(){ show('home'); });
