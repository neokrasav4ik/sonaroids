(function(){
"use strict";
if(typeof document==='undefined') return;
var el=function(i){ return document.getElementById(i); };
var N=512,fs,kLo,kHi,kc;
var ctx,stream,node,an,gSL,gSR,gL,gR,booted=false, F_LO=18300, PROBE_G=0.25, PROBE_SNR=null;
var mode=null,lastSeq=-1,gaps=0,collector=null;
function sleep(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }
function show(id){ ['home','orient','rec','recDone','cal','game','sideIntro','recSide','dualIntro','rightIntro','rightPlay'].forEach(function(s){ el(s).classList.toggle('hidden',s!==id); });
  /* запись вбок идёт с телефоном вертикально — на её экранах просьба повернуть не показывается */
  if(document.body&&document.body.classList) document.body.classList.toggle('pok',id==='sideIntro'||id==='rightIntro'||id==='rightPlay'||((id==='recSide'||id==='recDone')&&(lastRec==='recSide'||lastRec==='recRight'))); fitScreen(); }
/* всё в один экран: если видимый экран (или открытое меню игры) не влезает по высоте или ширине — уменьшаю базовый шрифт, пока не влезет */
function fitScreen(){ try{
  var root=document.documentElement; root.style.fontSize='';
  var s=el('gPanel')&&!el('gPanel').classList.contains('hidden')&&!el('game').classList.contains('hidden')?el('gPanel'):document.querySelector('.screen:not(.hidden)');
  if(!s||s.id==='game') return;
  var f=parseFloat(getComputedStyle(root).fontSize), n=0;
  while((s.scrollHeight>s.clientHeight+1||s.scrollWidth>s.clientWidth+1)&&f>8&&n++<40){ f-=0.5; root.style.fontSize=f+'px'; }
}catch(e){} }

/* ── звук: микрофон в воркле́т, три зонда, голос ── */
function makeProbe(parity){                   // parity: 'all' | 0 (чётные) | 1 (нечётные)
  var ks=[],k,n,q;
  for(k=kLo;k<=kHi;k++) if(parity==='all'||k%2===parity) ks.push(k);
  var M=ks.length, x=new Float64Array(N), mx=0;
  for(n=0;n<N;n++){ var s=0; for(q=0;q<M;q++) s+=Math.cos(2*Math.PI*ks[q]*n/N+Math.PI*q*q/M); x[n]=s; if(Math.abs(s)>mx) mx=Math.abs(s); }
  var buf=ctx.createBuffer(1,N,fs),d=buf.getChannelData(0); for(n=0;n<N;n++) d[n]=x[n]/mx*0.9;
  return buf;
}
function loopSrc(buf){ var s=ctx.createBufferSource(); s.buffer=buf; s.loop=true; return s; }
/* ── звуковая сессия и микрофон.
   Обычный режим — как было и работало. Экспериментальный — «запись и воспроизведение»: по устройству iOS
   такая сессия работает и в беззвучном режиме, но может увести звук в разговорный динамик.
   Если iOS откажет — возвращаюсь к обычному, а не падаю. ── */
var audioNote='';
function audioMode(){ try{ return localStorage.getItem('sonar_audio_mode')||'auto'; }catch(e){ return 'auto'; } }
function openMic(){
  var want=(audioMode()==='silent'&&navigator.audioSession)?'play-and-record':'auto';
  function attempt(t){ try{ if(navigator.audioSession) navigator.audioSession.type=t; }catch(e){}
    return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1}}); }
  return attempt(want).catch(function(err){
    if(want==='auto') throw err;
    audioNote='Режим для беззвучного iOS не принял — включил обычный.';
    return attempt('auto'); });
}
function boot(){
  if(booted) return Promise.resolve();

  var AC=window.AudioContext||window.webkitAudioContext;
  if(!AC) return Promise.reject(new Error('нет Web Audio'));
  if(!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)) return Promise.reject(new Error('нет микрофона: нужна вкладка по https'));
  return openMic()
  .then(function(s){ stream=s; ctx=new AC(); if(ctx.state==='suspended') ctx.resume();
    if(!ctx.audioWorklet) throw new Error('нет AudioWorklet');
    return ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET],{type:'application/javascript'}))); })
  .then(function(){
    fs=ctx.sampleRate; var df=fs/N; kLo=Math.ceil(F_LO/df); kHi=Math.floor(20500/df); kc=Math.floor((kLo+kHi)/2);
    var mg=ctx.createChannelMerger(2);
    var sS=loopSrc(makeProbe('all')), sL=loopSrc(makeProbe(0)), sR=loopSrc(makeProbe(1));
    gSL=ctx.createGain(); gSR=ctx.createGain(); gL=ctx.createGain(); gR=ctx.createGain();
    [gSL,gSR,gL,gR].forEach(function(g){ g.gain.value=0; });
    sS.connect(gSL); sS.connect(gSR); sL.connect(gL); sR.connect(gR);
    gSL.connect(mg,0,0); gL.connect(mg,0,0); gSR.connect(mg,0,1); gR.connect(mg,0,1);
    mg.connect(ctx.destination);
    sS.start(); sL.start(); sR.start();
    var src=ctx.createMediaStreamSource(stream);
    an=ctx.createAnalyser(); an.fftSize=2048; src.connect(an);
    node=new AudioWorkletNode(ctx,'cap',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});
    src.connect(node); var mute=ctx.createGain(); mute.gain.value=0; node.connect(mute); mute.connect(ctx.destination);
    node.port.onmessage=onFrame;
    booted=true;
  });
}
function setProbe(w){                          // 'off' | 'dual' | 'single-left' | 'single-right'
  var t=ctx.currentTime;
  gSL.gain.setTargetAtTime(w==='single-left'?PROBE_G:0,t,0.02);
  gSR.gain.setTargetAtTime(w==='single-right'?PROBE_G:0,t,0.02);
  gL.gain.setTargetAtTime(w==='dual'?0.25:0,t,0.02);
  gR.gain.setTargetAtTime(w==='dual'?0.25:0,t,0.02);
}
function collect(n){ return new Promise(function(r){ collector={n:n,arr:[],done:r}; }); }

/* ── единая точка входа кадров: и запись, и игра видят ровно одно и то же ── */
var rec={on:false,frames:[],gaps:0};
function onFrame(e){
  var m=e.data;
  var gap=(lastSeq>=0&&m.s!==lastSeq+1); lastSeq=m.s; if(gap) gaps++;
  if(collector){ collector.arr.push(m.f); if(collector.arr.length>=collector.n){ var c=collector; collector=null; c.done(c.arr); } }
  if(mode==='rec'&&rec.on){ if(gap) rec.gaps++; rec.frames.push(m.f); }
  else if(mode==='right'){ var r3=DSP2.frame(m.f); if(r3) absS.st=r3; rpFrame(m.f,gap,r3); }
  else if(mode==='cal'||mode==='game'){ absS.fpsN++; if(gap){ absS.gaps++; }
    var r2=DSP2.frame(m.f); if(r2){ absS.st=r2; if(mode==='cal'&&calSink) calSink(r2); }
    if(mode==='game'&&LOG&&LOG.on) logFrame(m.f,r2,gap);
    if(SLOG&&SLOG.on) slogFrame(m.f,r2,gap); }
}
var absS={st:null,fpsN:0,fpsC:0,gaps:0}, calSink=null;
setInterval(function(){ absS.fpsC=absS.fpsN; absS.fpsN=0; },1000);

/* ── сигнал/шум в полосе зонда: 8 периодов подряд → зонд ровно в каждой 8-й линии спектра, шум — во всех ── */
/* отношение сигнал/шум в полосе: 8 периодов подряд → зонд ровно в каждой 8-й линии, шум — во всех */
function probeSNR(frames,fs,fLo,fHi){
  var N8=frames.length*512, x=new Float64Array(N8), i, j;
  for(i=0;i<frames.length;i++) for(j=0;j<512;j++) x[i*512+j]=frames[i][j];
  var P=frames.length, df=fs/N8, b0=Math.floor(fLo/df), b1=Math.ceil(fHi/df), sig=0, nz=0, nl=0, nn=0;
  for(var b=b0;b<=b1;b++){
    var w=2*Math.PI*b/N8, c=1, s=0, cw=Math.cos(w), sw=Math.sin(w), re=0, im=0;
    for(i=0;i<N8;i++){ re+=x[i]*c; im-=x[i]*s; var t=c*cw-s*sw; s=s*cw+c*sw; c=t; }
    var p=re*re+im*im, r=b%P;
    if(r===0){ sig+=p; nl++; } else if(r>=2&&r<=P-2){ nz+=p; nn++; }
  }
  var noisePerBin=nz/(nn||1), probe=sig-noisePerBin*nl, noiseBand=noisePerBin*(b1-b0+1);
  return 10*Math.log10(Math.max(probe,1e-30)/Math.max(noiseBand,1e-30));
}

/* ── автоуровень: убавляю свой зонд до минимума с запасом — громкость в комнате почти не зависит от громкости телефона ── */
var SNR_TARGET=48, G_MIN=0.015, G_MAX=0.3;
function measureSNR(){ return sleep(350).then(function(){ return collect(8); }).then(function(fr){ return probeSNR(fr,fs,F_LO,20450); }); }
function autoLevel(){
  var tries=0;
  function step(){ return measureSNR().then(function(s){
    PROBE_SNR=s; tries++;
    var raw=PROBE_G*Math.pow(10,(SNR_TARGET-s)/20), want=Math.max(G_MIN,Math.min(G_MAX,raw));
    var tooQuiet=raw>G_MAX*1.01&&s<SNR_TARGET-6;                 // нужно больше, чем можем дать
    if(tries>=3||Math.abs(20*Math.log10(want/PROBE_G))<1) return {snr:s,g:PROBE_G,atMax:tooQuiet};
    PROBE_G=want; setProbe('single-'+chan); return step(); }); }
  return step();
}
/* ── слышен ли каждый из двух зондов: пик прямого сигнала над остальной характеристикой ── */
function promSub(frames,parity){
  var ks=[],k,q,n; for(k=kLo;k<=kHi;k++) if(parity==='all'||k%2===parity) ks.push(k);
  var M=ks.length, T=(parity==='all')?N:N/2, acc=new Float64Array(T);
  frames.forEach(function(fr){
    var Hr=new Float64Array(M),Hi=new Float64Array(M);
    for(q=0;q<M;q++){ var sr=0,si=0,w=-2*Math.PI*ks[q]/N; for(n=0;n<N;n++){ var a=w*n; sr+=fr[n]*Math.cos(a); si+=fr[n]*Math.sin(a); }
      var ph=Math.PI*q*q/M,pr=Math.cos(ph),pi=Math.sin(ph); Hr[q]=sr*pr+si*pi; Hi[q]=si*pr-sr*pi; }
    for(n=0;n<T;n++){ var tr=0,ti=0; for(q=0;q<M;q++){ var a2=2*Math.PI*(ks[q]-kc)*n/N,c=Math.cos(a2),s=Math.sin(a2);
      tr+=Hr[q]*c-Hi[q]*s; ti+=Hr[q]*s+Hi[q]*c; } acc[n]+=tr*tr+ti*ti; }
  });
  var srt=Array.prototype.slice.call(acc).sort(function(a,b){return a-b;});
  return 10*Math.log10(srt[T-1]/(srt[T>>1]||1e-30));
}
