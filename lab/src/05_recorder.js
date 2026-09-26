
/* ── запись для меня: одна рука сбоку у микрофона, долгое неподвижное удержание ── */
function sn(t,t0){ return 100+50*Math.sin(2*Math.PI*(t-t0)/6); }
var SCRIPT=[
  {t:0,  k:'empty', say:'Убери руку',              sub:'Ничего рядом с телефоном. Снимаю пустую комнату.', H:function(){return null;}, d:'—'},
  {t:3,  k:'place', say:'Ладонь сбоку на 10 см',   sub:'У края с микрофоном, ладонью вниз, напротив метки.', H:function(){return 100;}, d:'100'},
  {t:5,  k:'move',  say:'Веди за меткой',          sub:'Плавно вверх-вниз.', H:function(t){return sn(t,5);}, d:'100+50*sin(2pi(t-5)/6)'},
  {t:11, k:'hold',  say:'Замри',                   sub:'Три секунды неподвижно на 10 см.', H:function(){return 100;}, d:'100'},
  {t:14, k:'away',  say:'Убери руку',              sub:'Совсем.', H:function(){return null;}, d:'—'},
  {t:16, k:'end'}
];
/* 26.09: длинная запись — 4 круга по 22 с (веди за меткой 18 с, замри 4 с), 96 с всего. Зачем: уход за полторы минуты,
   особенно когда телефон в руке (ладонь у торца всё время, пустая комната не обновляется). Разбор — tools/eval_long.js */
var SCRIPT_LONG=(function(){ var s=[
  {t:0, k:'empty', say:'Убери руку', sub:'Ничего рядом с телефоном. Снимаю пустую комнату.', H:function(){return null;}, d:'—'},
  {t:3, k:'place', say:'Ладонь на 10 см', sub:'Как играешь: над столом сбоку или у торца, если телефон в руке.', H:function(){return 100;}, d:'100'}], t=5;
  for(var n=1;n<=4;n++){ (function(t0,n){
    s.push({t:t0, k:'move'+n, say:'Веди за меткой', sub:'Круг '+n+' из 4. Плавно.', H:function(t){return sn(t,t0);}, d:'100+50*sin(2pi(t-'+t0+')/6)'});
    s.push({t:t0+18, k:'hold'+n, say:'Замри', sub:'Четыре секунды на 10 см.', H:function(){return 100;}, d:'100'}); })(t,n); t+=22; }
  s.push({t:t, k:'away', say:'Убери руку', sub:'Совсем.', H:function(){return null;}, d:'—'}); s.push({t:t+3, k:'end'}); return s; })();
/* 26.09: запись вбок — новая механика: телефон вертикально в левой руке, разъёмом к игроку; правая ладонь ребром
   (мизинец внизу, пальцы на разъём) ~8 см от торца ходит влево-вправо. Метка — смещение ладони вбок в мм, + — вправо (как видит игрок).
   Вопрос записи: различает ли сонар (один микрофон) лево и право, или слышит только «ушла от центра». Разбор — tools/eval_side.js */
var SIDE_A=40;
var SCRIPT_SIDE=[
  {t:0,  k:'empty', say:'Убери руку',            sub:'Ничего рядом с телефоном. Снимаю пустую комнату.', H:function(){return null;}, d:'—'},
  {t:3,  k:'place', say:'Ладонь ребром к разъёму', sub:'Мизинец внизу, пальцы на разъём, ~8 см от торца. Напротив метки.', H:function(){return 0;}, d:'0'},
  {t:6,  k:'move',  say:'Веди за меткой',        sub:'Влево-вправо, на том же расстоянии от торца.', H:function(t){return SIDE_A*Math.sin(2*Math.PI*(t-6)/6);}, d:SIDE_A+'*sin(2pi(t-6)/6)'},
  {t:18, k:'c1',    say:'Замри по центру',       sub:'Три секунды.', H:function(){return 0;}, d:'0'},
  {t:21, k:'r1',    say:'Замри справа',          sub:'Напротив метки, на том же расстоянии.', H:function(){return SIDE_A;}, d:String(SIDE_A)},
  {t:24, k:'l1',    say:'Замри слева',           sub:'Напротив метки, на том же расстоянии.', H:function(){return -SIDE_A;}, d:String(-SIDE_A)},
  {t:27, k:'r2',    say:'Снова справа',          sub:'Замри.', H:function(){return SIDE_A;}, d:String(SIDE_A)},
  {t:30, k:'l2',    say:'Снова слева',           sub:'Замри.', H:function(){return -SIDE_A;}, d:String(-SIDE_A)},
  {t:33, k:'c2',    say:'По центру',             sub:'Замри.', H:function(){return 0;}, d:'0'},
  {t:36, k:'away',  say:'Убери руку',            sub:'Совсем.', H:function(){return null;}, d:'—'},
  {t:39, k:'end'}
];
var trackW=0;
function xOf(v){ return (0.5+v/(2*SIDE_A*1.2))*trackW; }
function buildHTrack(){ var tr=el('trH'); trackW=tr.getBoundingClientRect().width||300;
  Array.prototype.slice.call(tr.querySelectorAll('.lab,.tick')).forEach(function(x){ x.remove(); });
  [-40,-20,0,20,40].forEach(function(v){
    var l=document.createElement('div'); l.className='lab'; l.textContent=v===0?'центр':(v<0?'← ':'')+(Math.abs(v)/10)+' см'+(v>0?' →':''); l.style.left=xOf(v)+'px'; tr.appendChild(l);
    var k=document.createElement('div'); k.className='tick'; k.style.left=xOf(v)+'px'; tr.appendChild(k); }); }
var trackH=0;
function yOf(v){ return (1-(v-30)/(170-30))*trackH; }
function buildTracks(){
  var mine=(hand==='left')?'trL':'trR', other=(hand==='left')?'trR':'trL';
  el(other).style.visibility='hidden'; el(mine).style.visibility='visible';
  var tr=el(mine); trackH=tr.getBoundingClientRect().height||300;
  Array.prototype.slice.call(tr.querySelectorAll('.lab,.tick')).forEach(function(x){ x.remove(); });
  [50,100,150].forEach(function(v){
    var l=document.createElement('div'); l.className='lab'; l.textContent=(v/10)+' см'; l.style.top=yOf(v)+'px'; tr.appendChild(l);
    var k=document.createElement('div'); k.className='tick'; k.style.top=yOf(v)+'px'; tr.appendChild(k); });
}
var recMeta=null, blob=null, fname='';
/* kind: 'rec' — 16 с, 'long' — 1,5 мин, 'side' — вбок, телефон вертикально */
function runRec(kind){ var long=kind==='long', side=kind==='side', S=side?SCRIPT_SIDE:long?SCRIPT_LONG:SCRIPT, TOT=S[S.length-1].t;
  var SAY=side?'sdSay':'say', SUB=side?'sdSub':'sub', CLK=side?'sdClock':'clock';
  if(side){ show('recSide'); el('mkH').style.opacity=0; } else { show('rec'); el('mkL').style.opacity=0; el('mkR').style.opacity=0; }
  el(SAY).textContent='Выбираю динамик'; el(SUB).textContent='Рука убрана.'; el(CLK).textContent='';
  mode=null; rec={on:false,frames:[],gaps:0};
  var prom;
  pickChannel().then(function(){ return autoLevel(); }).then(function(){
    if(side) buildHTrack(); else buildTracks(); mode='rec';
    el(SUB).textContent=side?'Правая ладонь у разъёма.':'Рука будет '+(hand==='left'?'слева':'справа')+' от телефона'+(orientSide()?(hand===orientSide()?', у разъёма.':', у фронтальной камеры.'):'.');
    return sleep(400).then(function(){ return collect(10); });
  }).then(function(fr){
    prom=promSub(fr,'all');
    if(prom<15){
      el(SAY).textContent='Зонда не слышно';
      el(SUB).textContent='Прибавь громкость, выключи беззвучный, отключи наушники, открой динамики. Сейчас '+prom.toFixed(0)+' дБ, нужно 15.';
      setProbe('off'); mode=null; return sleep(7000).then(function(){ show('home'); });
    }
    var mk=side?'mkH':(hand==='left')?'mkL':'mkR', marks={}, t0=performance.now(), cur=-1;
    rec.on=true;
    return new Promise(function(done){
      (function tick(){
        var t=(performance.now()-t0)/1000,i;
        for(i=S.length-1;i>=0;i--) if(t>=S[i].t) break;
        if(i!==cur){ cur=i; var s=S[i]; if(s.k==='end'){ done(marks); return; }
          marks[s.k]=rec.frames.length*N; el(SAY).textContent=s.say; el(SUB).textContent=s.sub; }
        var h=S[cur].H(t); el(mk).style.opacity=h===null?0:1; if(h!==null){ if(side) el(mk).style.left=xOf(h)+'px'; else el(mk).style.top=yOf(h)+'px'; }
        el(CLK).textContent=t.toFixed(1)+' / '+TOT+' с'; requestAnimationFrame(tick);
      })();
    }).then(function(marks){
      rec.on=false; setProbe('off'); mode=null;
      var n=rec.frames.length*N, all=new Float32Array(n);
      rec.frames.forEach(function(f,j){ all.set(f,j*N); });
      var pk=0; for(var i=0;i<n;i++){ var a=Math.abs(all[i]); if(a>pk) pk=a; }
      var so=(screen.orientation&&screen.orientation.angle!==undefined)?screen.orientation.angle:(window.orientation||0);
      recMeta={v:4,kind:side?'side-portrait':long?'single-landscape-long':'single-landscape',fs:fs,N:N,kLo:kLo,kHi:kHi,
        hand:hand,probe:{bins:'all',channel:chan,phase:'pi*q^2/M',peak:0.9,gain:PROBE_G,snr_db:PROBE_SNR,f_lo:F_LO,loop:true},
        prom_db:prom,samples:n,gaps:rec.gaps,peak:pk,orientation:{angle:so,w:window.innerWidth,h:window.innerHeight},
        script:S.filter(function(s){return s.k!=='end';}).map(function(s){ return {k:s.k,t:s.t,H:s.d}; }),
        marks:marks,units:side?'target sideways offset of the palm in mm, + = to the right as the player sees it (phone upright, port towards the player)':'target height in mm above the table',ua:navigator.userAgent,date:new Date().toISOString()};
      blob=wav(all,recMeta);
      var d=new Date(), z=function(x){ return (x<10?'0':'')+x; };
      fname=(side?'sonarside_':long?'sonarlong_':'sonar1h_')+d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'_'+z(d.getHours())+z(d.getMinutes())+'.wav';
      showDone(pk,prom);
    });
  });
}

function wav(samples,meta){
  var txt=unescape(encodeURIComponent(JSON.stringify(meta))); if(txt.length%2) txt+=' ';
  var infoLen=4+8+txt.length, dataLen=samples.length*4, total=12+(8+18)+(8+4)+(8+infoLen)+(8+dataLen);
  var b=new ArrayBuffer(total), v=new DataView(b), p=0;
  function s4(x){ for(var i=0;i<4;i++) v.setUint8(p++,x.charCodeAt(i)); }
  function u32(x){ v.setUint32(p,x,true); p+=4; } function u16(x){ v.setUint16(p,x,true); p+=2; }
  s4('RIFF'); u32(total-8); s4('WAVE');
  s4('fmt '); u32(18); u16(3); u16(1); u32(fs); u32(fs*4); u16(4); u16(32); u16(0);
  s4('fact'); u32(4); u32(samples.length);
  s4('LIST'); u32(infoLen); s4('INFO'); s4('ICMT'); u32(txt.length);
  for(var i=0;i<txt.length;i++) v.setUint8(p++,txt.charCodeAt(i));
  s4('data'); u32(dataLen); for(i=0;i<samples.length;i++){ v.setFloat32(p,samples[i],true); p+=4; }
  return new Blob([b],{type:'audio/wav'});
}
function showDone(pk,pr){
  show('recDone');
  var st=el('stats'); st.innerHTML='';
  function kv(k,v,c){ var r=document.createElement('div'); r.className='kv'; r.innerHTML='<span>'+k+'</span><b class="'+(c||'')+'">'+v+'</b>'; st.appendChild(r); }
  kv('длительность',(recMeta.samples/fs).toFixed(1)+' с');
  kv('разрывов потока',recMeta.gaps,recMeta.gaps===0?'good':'bad');
  if(recMeta.kind==='side-portrait'){ var up=recMeta.orientation.h>recMeta.orientation.w; kv('экран',up?'вертикально':'горизонтально — поверни и запиши заново',up?'good':'bad'); }
  else { var os=orientSide(); kv('сторона руки',(hand==='left'?'слева':'справа')+(os?(hand===os?' — у разъёма':' — у фронтальной камеры'):'')); }
  kv('зонд слышен',pr.toFixed(0)+' дБ',pr>=15?'good':'bad');
  kv('пик входа',pk.toFixed(3),(pk>0.002&&pk<0.98)?'good':'bad');
  kv('размер',(blob.size/1048576).toFixed(1)+' МБ');
  el('meta').value=JSON.stringify(recMeta); fitScreen();
  el('share').classList.add('hidden');
  if(navigator.canShare){ try{ var f=new File([blob],fname,{type:'audio/wav'}); if(navigator.canShare({files:[f]})) el('share').classList.remove('hidden'); }catch(e){} }
}
