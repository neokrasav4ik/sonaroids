
/* ── сторона руки: динамик, чей зонд громче у микрофона ── */
var chan='right';                                     // до выбора стороны считаю, что рука справа (как у пользователя)
/* кнопки — со стороны свободной руки. Сторона руки запоминается, чтобы и главный экран сразу открывался правильно */
function handSide(){ try{ localStorage.setItem('sonar_hand',chan); }catch(e){} if(document.body&&document.body.classList) document.body.classList.toggle('hand-left',chan==='left'); }
try{ var hs=localStorage.getItem('sonar_hand'); if(hs==='left'||hs==='right'){ chan=hs; } }catch(e){}
if(document.body&&document.body.classList) document.body.classList.toggle('hand-left',chan==='left');
function bandLevel(){ var b=new Float32Array(an.frequencyBinCount); an.getFloatFrequencyData(b);
  var bw=fs/2048,s=0; for(var i=Math.ceil(F_LO/bw);i<=Math.floor(20500/bw);i++) s+=Math.pow(10,b[i]/10); return s; }
function pickChannel(){
  function meas(w){ setProbe(w); return sleep(350).then(function(){ var v=[],i=0; return new Promise(function(r){
    var iv=setInterval(function(){ v.push(bandLevel()); if(++i>=10){ clearInterval(iv); v.sort(function(a,b){return a-b;}); r(v[5]); } },20); }); }); }
  return meas('single-left').then(function(Lv){ return meas('single-right').then(function(Rv){
    chan=(Lv>=Rv)?'left':'right'; setProbe('single-'+chan); handSide(); }); });
}
