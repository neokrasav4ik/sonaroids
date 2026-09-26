
/* ── кнопки ── */
var nextFlow='game';
function fail(e){ show('home'); el('err').classList.remove('hidden'); el('err').textContent='Не вышло: '+((e&&e.message)||e); fitScreen(); }
/* без масштабирования Safari: ни щипка, ни двойного тапа (на кнопках двойной тап уже снят через touch-action) */
(function(){ function stop(e){ e.preventDefault(); }
  ['gesturestart','gesturechange','gestureend'].forEach(function(t){ document.addEventListener(t,stop,{passive:false}); });
  document.addEventListener('touchmove',function(e){ if(e.touches&&e.touches.length>1) e.preventDefault(); },{passive:false});
  var lastT=0; document.addEventListener('touchend',function(e){ var t=Date.now(), tg=e.target;
    if(t-lastT<350&&!(tg&&tg.closest&&tg.closest('button,input,a'))) e.preventDefault(); lastT=t; },{passive:false});
  document.addEventListener('dblclick',stop,{passive:false});
  window.addEventListener('resize',function(){ setTimeout(fitScreen,60); });
  window.addEventListener('orientationchange',function(){ setTimeout(function(){ handSide(); fitScreen(); },250); });
})();
function goFlow(flow){ if(flow==='dualIntro'){ show('dualIntro'); return; } if(flow==='rec'||flow==='recLong'){ lastRec=flow; runRec(flow==='recLong'?'long':'rec'); } else quickStart(); }
/* запись вбок: сначала экран-подсказка; начать можно, только когда экран стоит вертикально (иначе метка пойдёт не по той оси) */
function sideOri(){ if(el('sideIntro').classList.contains('hidden')) return; var up=window.innerHeight>window.innerWidth;
  el('sideOri').textContent=up?'Экран вертикально — можно начинать.':'Экран ещё горизонтальный. Поверни телефон вертикально; если экран не поворачивается — выключи блокировку поворота.';
  el('sideOri').className=up?'good':'bad'; el('sideGo').disabled=!up; }
function toSide(){ lastRec='recSide'; show('sideIntro'); sideOri(); }
window.addEventListener('resize',function(){ setTimeout(sideOri,80); });
var lastRec='rec';
function viaOrient(flow){ nextFlow=flow; if(window.innerWidth<window.innerHeight) show('orient'); else goFlow(flow); }
function silentLabel(){ var on=audioMode()==='silent';
  el('silentT').textContent='Беззвучный режим телефона: '+(on?'пробую работать (эксперимент)':'не поддерживается (обычный)');
  el('silentP').textContent=on?'Если зонд не слышно или звук ушёл в разговорный динамик — выключи эту кнопку.'
    :'В обычном режиме переключатель беззвучного режима глушит зонд. Можно попробовать экспериментальный.'; }
silentLabel();
el('silentT').addEventListener('click',function(){ try{ localStorage.setItem('sonar_audio_mode',audioMode()==='silent'?'auto':'silent'); }catch(e){} location.reload(); });
el('goGame').addEventListener('click',function(){ boot().then(function(){ viaOrient('game'); }).catch(fail); });
el('goRec').addEventListener('click',function(){ boot().then(function(){ viaOrient('rec'); }).catch(fail); });
el('goRecLong').addEventListener('click',function(){ boot().then(function(){ viaOrient('recLong'); }).catch(fail); });
el('goRecDual').addEventListener('click',function(){ boot().then(function(){ lastRec='recDual'; viaOrient('dualIntro'); }).catch(fail); });
el('dualGo').addEventListener('click',function(){ lastRec='recDual'; runRec('dual'); });
el('dualBack').addEventListener('click',function(){ show('home'); });
el('goRecSide').addEventListener('click',function(){ boot().then(toSide).catch(fail); });
el('sideGo').addEventListener('click',function(){ lastRec='recSide'; runRec('side'); });
el('sideBack').addEventListener('click',function(){ show('home'); });
el('orientOk').addEventListener('click',function(){ goFlow(nextFlow); });
el('orientBack').addEventListener('click',function(){ show('home'); });
el('recAgain').addEventListener('click',function(){ if(lastRec==='recSide') toSide(); else if(lastRec==='recDual') viaOrient('dualIntro'); else viaOrient(lastRec); });
el('toHome').addEventListener('click',function(){ show('home'); });
el('save').addEventListener('click',function(){ var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=fname; document.body.appendChild(a); a.click(); setTimeout(function(){ a.remove(); },1000); });
el('share').addEventListener('click',function(){ navigator.share({files:[new File([blob],fname,{type:'audio/wav'})],title:fname}).catch(function(){}); });
el('calGo').addEventListener('click',function(){ if(!CS.busy) quickStart(); });
function seg(attr,fn){ Array.prototype.forEach.call(document.querySelectorAll('['+attr+']'),function(b){
  b.addEventListener('click',function(){ Array.prototype.forEach.call(document.querySelectorAll('['+attr+']'),function(x){ x.classList.toggle('sel',x===b); }); fn(b.getAttribute(attr)); }); }); }
document.addEventListener('visibilitychange',function(){ if(!ctx) return;
  if(document.hidden) setProbe('off'); else if(mode==='cal'||mode==='game'||mode==='rec') setProbe('single-'+chan); });
