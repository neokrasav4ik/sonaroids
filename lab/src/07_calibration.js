/* ── ПОДГОТОВКА БЕЗ КАЛИБРОВКИ (с 24.09): сторона, громкость зонда и пустая комната — сами, за пару секунд.
   Высота — в миллиметрах по физике сонара: быстрая часть даёт ход ладони почти без настройки (≈0,9 мм на единицу),
   абсолютная — 1,17 мм на мм дальности (среднее по всем записям пользователя). Середину поля игра ставит сама:
   там, где ладонь держится первую секунду после появления и во время отсчёта перед каждой партией.
   Пошаговая калибровка «низко — высоко — покачай» убрана: по ней чувствительность менялась от раза к разу в 1,7 раза. ── */
var PHYS_CAL={k:1.17,o:100-1.17*110,s:0.9}, curCal=PHYS_CAL, calLive=false;
function median(a){ var b=a.slice().sort(function(x,y){return x-y;}); return b.length?b[b.length>>1]:NaN; }
function side(){ return hand==='left'?'слева':'справа'; }
function waitReady(){ return new Promise(function(r){ (function chk(){ var i=DSP2.info(); if(i.noProbe) return r('noprobe'); if(i.ready) return r('ok'); setTimeout(chk,60); })(); }); }
var CS={step:'quick',busy:false,rs:null};
function calText(step,title,sub,btn){ el('calStep').textContent=step; el('calT').textContent=title; el('calS').textContent=sub;
  el('calGo').textContent=btn||'Ещё раз'; el('calGo').disabled=!!CS.busy; fitScreen(); }
var NOPROBE='Выключи беззвучный режим, прибавь громкость, отключи наушники и Bluetooth, открой динамики. Потом «Ещё раз».';
function quickStart(){
  show('cal'); CS={step:'quick',busy:true,rs:null}; el('calFill').style.width='0%'; el('calBig').textContent='…';
  calText('Готовлюсь','Убери руку','Пару секунд слушаю пустую комнату и подбираю громкость зонда.','…'); mode=null;
  if(!calLive){ calLive=true; calLoop(); }
  pickChannel().then(function(){ return autoLevel(); }).then(function(L){
    if(L.snr<30){ setProbe('off'); CS.busy=false; calText('Готовлюсь','Зонда почти не слышно',NOPROBE); return null; }
    DSP2.init(fs,'all'); DSP2.setCal(curCal); DSP2.set('autocenter',1); mode='cal'; slogStart('подготовка'); return waitReady(); }).then(function(st){
    if(st===null||st===undefined) return;
    if(st==='noprobe'){ CS.busy=false; setProbe('off'); calText('Готовлюсь','Зонда не слышно',NOPROBE); return; }
    el('calS').textContent='Комната готова. Сейчас начнём.';
    return sleep(1200).then(function(){ CS.busy=false; startGame(); }); });
}
/* живая полоска справа: сырая дальность до ладони */
function calLoop(){
  requestAnimationFrame(calLoop);
  if(el('cal').classList.contains('hidden')) return;
  var st=absS.st, H=el('calBar').getBoundingClientRect().height||200, frac=null;
  function pos(f){ return Math.max(0,Math.min(1,f))*H; }
  if(st&&st.present){ CS.rs=(CS.rs===null)?st.range:CS.rs+0.12*(st.range-CS.rs); frac=(CS.rs-20)/260; } else CS.rs=null;
  el('calDot').style.opacity=frac===null?0.2:1; if(frac!==null) el('calDot').style.bottom=pos(frac)+'px';
  el('calDiag').textContent=(mode==='cal')?diagText(st):'';
  el('calLogS').classList.toggle('hidden',!(SLOG&&SLOG.f>0));
}
