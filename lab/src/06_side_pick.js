
/* ── сторона руки: динамик, чей зонд громче у микрофона ── */
var chan='right';                                     // канал зонда: тот динамик, что громче у микрофона
var hand='right';                                     // сторона руки (разъёма). До выбора считаю, что рука справа (как у пользователя)
/* сторона разъёма по повороту экрана: 90 — разъём справа, 270/−90 — слева; null — не знаю.
   С 24.09 ночи сторона руки берётся отсюда, а звук выбирает только канал зонда: на Redmi каналы динамиков
   не переставляются при повороте, и «громкий канал» 9 раз из 10 оказывался «с другой стороны» */
function orientSide(){ var a=null; try{ if(screen.orientation&&typeof screen.orientation.angle==='number') a=screen.orientation.angle; }catch(e){}
  if(a===null&&typeof window.orientation==='number') a=window.orientation;
  return a===90?'right':(a===270||a===-90)?'left':null; }
/* кнопки — со стороны свободной руки. Сторона руки запоминается, чтобы и главный экран сразу открывался правильно */
function handSide(){ hand=orientSide()||chan; try{ localStorage.setItem('sonar_hand',hand); }catch(e){} if(document.body&&document.body.classList) document.body.classList.toggle('hand-left',hand==='left'); }
try{ var hs=localStorage.getItem('sonar_hand'); if(hs==='left'||hs==='right'){ chan=hs; hand=hs; } }catch(e){}
hand=orientSide()||hand;
if(document.body&&document.body.classList) document.body.classList.toggle('hand-left',hand==='left');
function bandLevel(){ var b=new Float32Array(an.frequencyBinCount); an.getFloatFrequencyData(b);
  var bw=fs/2048,s=0; for(var i=Math.ceil(F_LO/bw);i<=Math.floor(20500/bw);i++) s+=Math.pow(10,b[i]/10); return s; }
function pickChannel(){
  function meas(w){ setProbe(w); return sleep(350).then(function(){ var v=[],i=0; return new Promise(function(r){
    var iv=setInterval(function(){ v.push(bandLevel()); if(++i>=10){ clearInterval(iv); v.sort(function(a,b){return a-b;}); r(v[5]); } },20); }); }); }
  return meas('single-left').then(function(Lv){ return meas('single-right').then(function(Rv){
    chan=(Lv>=Rv)?'left':'right'; setProbe('single-'+chan); handSide(); }); });
}
