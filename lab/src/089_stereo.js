/* ── СТЕРЕОМИКРОФОН (с 27.09, 0.39q) ──
   «Две ладони» показали: один микрофон слышит одну ось (расстояние) и признак «обе руки синхронно», но не лево/право.
   Разные волны из одного динамика руки не разделят — обе отражают всё. Остаётся второй микрофон: эхо от руки придёт в два микрофона
   с разной задержкой и силой, и по разнице видно, где рука. Проба: второй поток микрофона с просьбой о двух каналах
   (channelCount 2, без обработки), запись обоих каналов по метке. Телефон лежит вертикально, разъёмом к игроку; ладонь над столом
   качается вверх-вниз по очереди слева, справа, за верхним торцом, перед разъёмом. Разбор — tools/eval_stereo.js. Файл sonarstereo_*.wav
   (два канала). На экране сразу видно, что отдал браузер: сколько каналов и различаются ли они. */
var SCRIPT_ST=[
  {t:0,  k:'empty', say:'Убери руку',               sub:'Снимаю пустую комнату.'},
  {t:3,  k:'L',     say:'Ладонь слева от телефона', sub:'Над столом, напротив середины телефона. Качай вверх-вниз.'},
  {t:9,  k:'R',     say:'Ладонь справа',            sub:'Так же, с правой стороны. Качай вверх-вниз.'},
  {t:15, k:'T',     say:'За верхним торцом',        sub:'Над столом, за дальним от тебя концом телефона. Качай.'},
  {t:21, k:'B',     say:'Перед разъёмом',           sub:'Между собой и разъёмом. Качай.'},
  {t:27, k:'away',  say:'Убери руку',               sub:'Совсем.'},
  {t:30, k:'end'}
];
var ST={on:false,a:[],b:[],nch:0,stream:null,node:null};
function stInfo(){ var tr=ST.stream&&ST.stream.getAudioTracks()[0], st={}, cap={}; try{ st=tr.getSettings(); }catch(e){} try{ cap=tr.getCapabilities?tr.getCapabilities():{}; }catch(e){}
  return {label:tr?tr.label:'',settings:st,caps:cap,nch:ST.nch}; }
/* различаются ли каналы: корреляция и разница уровней по последней секунде */
function stDiff(){ var n=Math.min(ST.a.length,94); if(n<10) return null; var sa=0,sb=0,sab=0,d=0;
  for(var f=ST.a.length-n;f<ST.a.length;f++){ var A=ST.a[f], B=ST.b[f]; for(var i=0;i<512;i++){ sa+=A[i]*A[i]; sb+=B[i]*B[i]; sab+=A[i]*B[i]; d+=(A[i]-B[i])*(A[i]-B[i]); } }
  return {corr:sab/Math.sqrt(sa*sb||1e-30),db:10*Math.log10((sb||1e-30)/(sa||1e-30)),same:d<1e-12*n*512}; }
function stShow(){ var I=stInfo(), D=stDiff(); el('stInfo').innerHTML='каналов от браузера: <b>'+(I.nch||'—')+'</b> · в настройках: '+(I.settings.channelCount||'—')+
    (I.caps&&I.caps.channelCount?' (можно '+JSON.stringify(I.caps.channelCount)+')':'')+'<br>'+(D?(D.same?'каналы <b class="bad">одинаковые</b> — это один микрофон':'каналы <b class="good">разные</b>: сходство '+D.corr.toFixed(3)+', разница уровней '+D.db.toFixed(1)+' дБ'):'')+(I.label?'<br><span class="small">'+I.label+'</span>':''); }
function runStereo(){ var S=SCRIPT_ST, TOT=S[S.length-1].t;
  show('recSt'); el('stSay').textContent='Открываю микрофон в стерео'; el('stSub').textContent='Рука убрана.'; el('stClock').textContent=''; el('stInfo').textContent='';
  ST={on:false,a:[],b:[],nch:0,stream:null,node:null,marks:{}};
  pickChannel().then(function(){ return autoLevel(); }).then(function(){ setProbe('single-'+chan);
    return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:{ideal:2}}}); }).then(function(s){
    ST.stream=s; var src=ctx.createMediaStreamSource(s);
    ST.node=new AudioWorkletNode(ctx,'cap2',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1],channelCount:2,channelCountMode:'explicit',channelInterpretation:'discrete'});
    src.connect(ST.node); var mute=ctx.createGain(); mute.gain.value=0; ST.node.connect(mute); mute.connect(ctx.destination);
    ST.node.port.onmessage=function(e){ var m=e.data; ST.nch=Math.max(ST.nch,m.nch); if(ST.on){ ST.a.push(m.a); ST.b.push(m.b); } else { ST.a.push(m.a); ST.b.push(m.b); if(ST.a.length>94){ ST.a.shift(); ST.b.shift(); } } };
    return sleep(1200); }).then(function(){ stShow(); ST.a=[]; ST.b=[]; ST.on=true; var t0=performance.now(), cur=-1;
    return new Promise(function(done){ (function tick(){ var t=(performance.now()-t0)/1000, i; for(i=S.length-1;i>=0;i--) if(t>=S[i].t) break;
      if(i!==cur){ cur=i; var s=S[i]; if(s.k==='end'){ done(); return; } ST.marks[s.k]=ST.a.length*N; el('stSay').textContent=s.say; el('stSub').textContent=s.sub; stShow(); }
      el('stClock').textContent=t.toFixed(1)+' / '+TOT+' с'; requestAnimationFrame(tick); })(); }); }).then(function(){
    ST.on=false; setProbe('off'); var I=stInfo(), D=stDiff(); try{ ST.stream.getTracks().forEach(function(t){ t.stop(); }); ST.node.disconnect(); }catch(e){}
    var n=ST.a.length*N, L=new Float32Array(n), R=new Float32Array(n); ST.a.forEach(function(f,j){ L.set(f,j*N); }); ST.b.forEach(function(f,j){ R.set(f,j*N); });
    var so=(screen.orientation&&screen.orientation.angle!==undefined)?screen.orientation.angle:(window.orientation||0);
    recMeta={v:4,kind:'stereo-portrait',fs:fs,N:N,kLo:kLo,kHi:kHi,probe:{bins:'all',channel:chan,phase:'pi*q^2/M',peak:0.9,gain:PROBE_G,snr_db:PROBE_SNR,f_lo:F_LO,loop:true},
      mic:I,diff:D,samples:n,channels:2,orientation:{angle:so,w:window.innerWidth,h:window.innerHeight},script:SCRIPT_ST.filter(function(s){return s.k!=='end';}).map(function(s){ return {k:s.k,t:s.t}; }),
      marks:ST.marks,units:'two input channels as the browser gave them (interleaved in the WAV); phone flat, portrait, port towards the player; the palm waves up and down to the left, right, beyond the top end, in front of the port',ua:navigator.userAgent,date:new Date().toISOString()};
    blob=wav2(L,R,recMeta); var d=new Date(), z=function(x){ return (x<10?'0':'')+x; };
    fname='sonarstereo_'+d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'_'+z(d.getHours())+z(d.getMinutes())+'.wav';
    var pk=0; for(var i=0;i<n;i++) pk=Math.max(pk,Math.abs(L[i]),Math.abs(R[i])); showDone(pk,PROBE_SNR||0);
  }).catch(function(e){ setProbe('off'); el('stSay').textContent='Не вышло'; el('stSub').textContent=(e&&e.message)||String(e); });
}
/* WAV на два канала (float32, чередуются), метаданные — как у wav() */
function wav2(L,R,meta){ var n=L.length, x=new Float32Array(2*n); for(var i=0;i<n;i++){ x[2*i]=L[i]; x[2*i+1]=R[i]; }
  var txt=unescape(encodeURIComponent(JSON.stringify(meta))); if(txt.length%2) txt+=' ';
  var infoLen=4+8+txt.length, dataLen=x.length*4, total=12+(8+18)+(8+4)+(8+infoLen)+(8+dataLen), b=new ArrayBuffer(total), v=new DataView(b), p=0;
  function s4(q){ for(var i=0;i<4;i++) v.setUint8(p++,q.charCodeAt(i)); } function u32(q){ v.setUint32(p,q,true); p+=4; } function u16(q){ v.setUint16(p,q,true); p+=2; }
  s4('RIFF'); u32(total-8); s4('WAVE'); s4('fmt '); u32(18); u16(3); u16(2); u32(fs); u32(fs*8); u16(8); u16(32); u16(0);
  s4('fact'); u32(4); u32(n); s4('LIST'); u32(infoLen); s4('INFO'); s4('ICMT'); u32(txt.length); for(var k=0;k<txt.length;k++) v.setUint8(p++,txt.charCodeAt(k));
  s4('data'); u32(dataLen); for(k=0;k<x.length;k++){ v.setFloat32(p,x[k],true); p+=4; } return new Blob([b],{type:'audio/wav'}); }
function toStereo(){ lastRec='recSt'; show('stIntro'); }
el('goStereo').addEventListener('click',function(){ boot().then(toStereo).catch(fail); });
el('stGo').addEventListener('click',function(){ lastRec='recSt'; runStereo(); });
el('stBack').addEventListener('click',function(){ show('home'); });
