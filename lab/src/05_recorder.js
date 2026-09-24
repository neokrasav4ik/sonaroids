
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
function runRec(){
  show('rec'); el('mkL').style.opacity=0; el('mkR').style.opacity=0;
  el('say').textContent='Выбираю сторону'; el('sub').textContent='Рука убрана.'; el('clock').textContent='';
  mode=null; rec={on:false,frames:[],gaps:0};
  var prom;
  pickChannel().then(function(){ return autoLevel(); }).then(function(){
    buildTracks(); mode='rec';
    el('sub').textContent='Рука будет '+(hand==='left'?'слева':'справа')+' от телефона.';
    return sleep(400).then(function(){ return collect(10); });
  }).then(function(fr){
    prom=promSub(fr,'all');
    if(prom<15){
      el('say').textContent='Зонда не слышно';
      el('sub').textContent='Прибавь громкость, выключи беззвучный, отключи наушники, открой динамики. Сейчас '+prom.toFixed(0)+' дБ, нужно 15.';
      setProbe('off'); mode=null; return sleep(7000).then(function(){ show('home'); });
    }
    var mk=(hand==='left')?'mkL':'mkR', marks={}, t0=performance.now(), cur=-1;
    rec.on=true;
    return new Promise(function(done){
      (function tick(){
        var t=(performance.now()-t0)/1000,i;
        for(i=SCRIPT.length-1;i>=0;i--) if(t>=SCRIPT[i].t) break;
        if(i!==cur){ cur=i; var s=SCRIPT[i]; if(s.k==='end'){ done(marks); return; }
          marks[s.k]=rec.frames.length*N; el('say').textContent=s.say; el('sub').textContent=s.sub; }
        var h=SCRIPT[cur].H(t); el(mk).style.opacity=h===null?0:1; if(h!==null) el(mk).style.top=yOf(h)+'px';
        el('clock').textContent=t.toFixed(1)+' / 16 с'; requestAnimationFrame(tick);
      })();
    }).then(function(marks){
      rec.on=false; setProbe('off'); mode=null;
      var n=rec.frames.length*N, all=new Float32Array(n);
      rec.frames.forEach(function(f,j){ all.set(f,j*N); });
      var pk=0; for(var i=0;i<n;i++){ var a=Math.abs(all[i]); if(a>pk) pk=a; }
      var so=(screen.orientation&&screen.orientation.angle!==undefined)?screen.orientation.angle:(window.orientation||0);
      recMeta={v:4,kind:'single-landscape',fs:fs,N:N,kLo:kLo,kHi:kHi,
        hand:hand,probe:{bins:'all',channel:chan,phase:'pi*q^2/M',peak:0.9,gain:PROBE_G,snr_db:PROBE_SNR,f_lo:F_LO,loop:true},
        prom_db:prom,samples:n,gaps:rec.gaps,peak:pk,orientation:{angle:so,w:window.innerWidth,h:window.innerHeight},
        script:SCRIPT.filter(function(s){return s.k!=='end';}).map(function(s){ return {k:s.k,t:s.t,H:s.d}; }),
        marks:marks,units:'target height in mm above the table',ua:navigator.userAgent,date:new Date().toISOString()};
      blob=wav(all,recMeta);
      var d=new Date(), z=function(x){ return (x<10?'0':'')+x; };
      fname='sonar1h_'+d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'_'+z(d.getHours())+z(d.getMinutes())+'.wav';
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
  kv('сторона руки',(hand==='left'?'слева':'справа')+(hand!==chan?' (зонд в другом канале)':''));
  kv('зонд слышен',pr.toFixed(0)+' дБ',pr>=15?'good':'bad');
  kv('пик входа',pk.toFixed(3),(pk>0.002&&pk<0.98)?'good':'bad');
  kv('размер',(blob.size/1048576).toFixed(1)+' МБ');
  el('meta').value=JSON.stringify(recMeta); fitScreen();
  el('share').classList.add('hidden');
  if(navigator.canShare){ try{ var f=new File([blob],fname,{type:'audio/wav'}); if(navigator.canShare({files:[f]})) el('share').classList.remove('hidden'); }catch(e){} }
}
