
/* ── СОНАРЛИНК (06.10): два телефона рядом, каждый пищит своими тонами ──
   Экран «СонарЛинк»: тоны зонда (все / чётные / нечётные — для всей лабы), «Только пищать» (второй телефон — источник соседа),
   «Запись для меня» и игра лабы с выбранными тонами. На экране «пищу» раз в секунду — что слышит микрофон: свои тоны, тоны соседа
   и шум между ними (8 периодов подряд: тоны ложатся в каждую 8-ю линию). Разбор записей — tools/eval_link.js и eval_recording.js. */
function lkLabel(){ el('lkPar').textContent='Тоны зонда: '+parName(linkPar()); el('lkNow').textContent=linkPar()==='all'?'Сейчас: все тоны — как в игре.':'Сейчас: '+parName(linkPar())+' — второй телефон ставь на '+(linkPar()?'чётные':'нечётные')+'.'; }
function lkLevels(frames,par){ var N8=frames.length*512, x=new Float64Array(N8), i, j; for(i=0;i<frames.length;i++) for(j=0;j<512;j++) x[i*512+j]=frames[i][j];
  var P=frames.length, df=fs/N8, b0=Math.ceil(bandLo()/df/P)*P, b1=Math.floor(20450/df), own=0, oth=0, no=0, nn=0, b;
  for(b=b0;b<=b1;b++){ var w=2*Math.PI*b/N8, c=1, s=0, cw=Math.cos(w), sw=Math.sin(w), re=0, im=0;
    for(i=0;i<N8;i++){ re+=x[i]*c; im-=x[i]*s; var t=c*cw-s*sw; s=s*cw+c*sw; c=t; }
    var p=re*re+im*im, r=b%P; if(r===0){ if(par==='all'||(b/P)%2===par) own+=p; else oth+=p; } else if(r>=2&&r<=P-2){ no+=p; nn++; } }
  var nb=no/(nn||1)*(b1-b0+1), db=function(v){ return 10*Math.log10(Math.max(v,1e-30)/Math.max(nb,1e-30)); };
  return {own:db(own),other:par==='all'?null:db(oth)}; }
var LB={on:false,lock:null};
function lkBeacon(){ show('linkBeacon'); el('lbSay').textContent='Пищу: '+parName(linkPar())+' тоны'; el('lbNow').textContent='Выбираю динамик…'; mode=null;
  LB.on=true; try{ if(navigator.wakeLock) navigator.wakeLock.request('screen').then(function(l){ LB.lock=l; }).catch(function(){}); }catch(e){}
  boot().then(function(){ return pickChannel(); }).then(function(){ return autoLevel(); }).then(function(){
    (function loop(){ if(!LB.on) return; collect(8).then(function(fr){ if(!LB.on) return; var L=lkLevels(fr,linkPar());
      el('lbNow').textContent='Свой зонд: '+L.own.toFixed(0)+' дБ над шумом'+(L.other===null?'':' | соседа: '+(L.other<3?'не слышно':L.other.toFixed(0)+' дБ (на '+(L.own-L.other).toFixed(0)+' дБ тише)'))+' | громкость зонда '+PROBE_G.toFixed(3);
      setTimeout(loop,700); }); })();
  }).catch(function(e){ LB.on=false; fail(e); }); }
function lkStop(){ LB.on=false; try{ if(LB.lock) LB.lock.release(); }catch(e){} LB.lock=null; if(booted) setProbe('off'); lkLabel(); show('link'); }
el('goLink').addEventListener('click',function(){ lkLabel(); show('link'); });
el('lkPar').addEventListener('click',function(){ var p=linkPar(); setLinkPar(p==='all'?0:p===0?1:'all'); lkLabel(); });
el('lkBeacon').addEventListener('click',lkBeacon);
el('lbStop').addEventListener('click',lkStop);
el('lkRec').addEventListener('click',function(){ boot().then(function(){ viaOrient('rec'); }).catch(fail); });
el('lkGame').addEventListener('click',function(){ boot().then(function(){ viaOrient('game'); }).catch(fail); });
el('lkBack').addEventListener('click',function(){ show('home'); });
/* 06.10: прототипы и пробы 27.09 с главного экрана — на экран «Ещё 2» (автор: «спрячь лишнее под „еще2“») */
el('goMore2').addEventListener('click',function(){ show('more2'); });
el('more2Back').addEventListener('click',function(){ show('home'); });
