/* ── SONAR: speaker probe, microphone, echo processing. Moved over from the lab (04_audio_engine, 06_side_pick, 07_calibration)
   without changes to the numbers; only the lab's screens are gone.
   The probe is a periodic multi-tone (512 samples, 18.3–20.5 kHz, Schroeder phases). Two extra probes on the even and odd tones
   let us tell the left speaker from the right one: the louder one at the microphone is next to the charging port, and the port
   faces the playing hand. ── */
var Sonar=(function(){
  var N=512, F_LO=18300, F_HI=20500, fs=0, kLo, kHi, kc;
  var ctx=null, stream=null, node=null, an=null, gSL, gSR, gL, gR, booted=false;
  var PROBE_G=0.25, PROBE_SNR=null, chan='right', active=false, lastSeq=-1, gaps=0, collector=null, last=null, lost=false;
  var listeners=[];
  var PHYS_CAL={k:1.17,o:100-1.17*110,s:0.9};   // mm of palm height per mm of echo range, and per unit of the fast (phase) part — from the lab
  function sleep(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }
  function makeProbe(parity){
    var ks=[],k,n,q; for(k=kLo;k<=kHi;k++) if(parity==='all'||k%2===parity) ks.push(k);
    var M=ks.length, x=new Float64Array(N), mx=0;
    for(n=0;n<N;n++){ var s=0; for(q=0;q<M;q++) s+=Math.cos(2*Math.PI*ks[q]*n/N+Math.PI*q*q/M); x[n]=s; if(Math.abs(s)>mx) mx=Math.abs(s); }
    var buf=ctx.createBuffer(1,N,fs), d=buf.getChannelData(0); for(n=0;n<N;n++) d[n]=x[n]/mx*0.9;
    return buf;
  }
  function loopSrc(buf){ var s=ctx.createBufferSource(); s.buffer=buf; s.loop=true; return s; }
  function openMic(){
    try{ if(navigator.audioSession) navigator.audioSession.type='auto'; }catch(e){}
    return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1}});
  }
  /* microphone, audio context, probes. Must start from a tap (browsers unlock sound only on a user gesture) */
  function boot(){
    if(sim) return simBoot();
    if(booted) return Promise.resolve();
    var AC=window.AudioContext||window.webkitAudioContext;
    if(!AC) return Promise.reject(new Error('no-webaudio'));
    if(!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)) return Promise.reject(new Error('no-mic'));
    return openMic().then(function(s){ stream=s; ctx=new AC(); if(ctx.state==='suspended') ctx.resume();
      if(!ctx.audioWorklet) throw new Error('no-worklet');
      return ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET],{type:'application/javascript'}))); })
    .then(function(){
      fs=ctx.sampleRate; var df=fs/N; kLo=Math.ceil(F_LO/df); kHi=Math.floor(F_HI/df); kc=Math.floor((kLo+kHi)/2);
      var mg=ctx.createChannelMerger(2), sS=loopSrc(makeProbe('all')), sL=loopSrc(makeProbe(0)), sR=loopSrc(makeProbe(1));
      gSL=ctx.createGain(); gSR=ctx.createGain(); gL=ctx.createGain(); gR=ctx.createGain();
      [gSL,gSR,gL,gR].forEach(function(g){ g.gain.value=0; });
      sS.connect(gSL); sS.connect(gSR); sL.connect(gL); sR.connect(gR);
      gSL.connect(mg,0,0); gL.connect(mg,0,0); gSR.connect(mg,0,1); gR.connect(mg,0,1);
      mg.connect(ctx.destination); sS.start(); sL.start(); sR.start();
      var src=ctx.createMediaStreamSource(stream);
      an=ctx.createAnalyser(); an.fftSize=2048; src.connect(an);
      node=new AudioWorkletNode(ctx,'cap',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});
      src.connect(node); var mute=ctx.createGain(); mute.gain.value=0; node.connect(mute); mute.connect(ctx.destination);
      node.port.onmessage=onFrame; booted=true;
    });
  }
  function setProbe(w){                        // 'off' | 'dual' | 'single-left' | 'single-right'
    if(!ctx) return; var t=ctx.currentTime;
    gSL.gain.setTargetAtTime(w==='single-left'?PROBE_G:0,t,0.02);
    gSR.gain.setTargetAtTime(w==='single-right'?PROBE_G:0,t,0.02);
    gL.gain.setTargetAtTime(w==='dual'?0.25:0,t,0.02);
    gR.gain.setTargetAtTime(w==='dual'?0.25:0,t,0.02);
  }
  function collect(n){ return new Promise(function(r){ collector={n:n,arr:[],done:r}; }); }
  /* every microphone frame goes through here: echo processing, then logs */
  function onFrame(e){
    var m=e.data, gap=(lastSeq>=0&&m.s!==lastSeq+1); lastSeq=m.s; if(gap) gaps++;
    if(collector){ collector.arr.push(m.f); if(collector.arr.length>=collector.n){ var c=collector; collector=null; c.done(c.arr); } }
    var r=null; if(active){ r=DSP2.frame(m.f); if(r) last=r; if(DSP2.info().lost) lost=true; }
    for(var i=0;i<listeners.length;i++) listeners[i](m.f,r,gap);
  }
  /* signal-to-noise in the probe band: 8 periods in a row put the probe exactly on every 8th spectral line, noise on all of them */
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
  /* auto level: turn our own probe down to the minimum with a margin — how loud it is in the room hardly depends on the phone's volume */
  var SNR_TARGET=48, G_MIN=0.015, G_MAX=0.3;
  function measureSNR(){ return sleep(350).then(function(){ return collect(8); }).then(function(fr){ return probeSNR(fr,fs,F_LO,20450); }); }
  function autoLevel(){
    var tries=0;
    function step(){ return measureSNR().then(function(s){
      PROBE_SNR=s; tries++;
      var raw=PROBE_G*Math.pow(10,(SNR_TARGET-s)/20), want=Math.max(G_MIN,Math.min(G_MAX,raw));
      var tooQuiet=raw>G_MAX*1.01&&s<SNR_TARGET-6;
      if(tries>=3||Math.abs(20*Math.log10(want/PROBE_G))<1) return {snr:s,g:PROBE_G,atMax:tooQuiet};
      PROBE_G=want; setProbe('single-'+chan); return step(); }); }
    return step();
  }
  /* which side the palm is on: the speaker whose probe is louder at the microphone */
  function bandLevel(){ var b=new Float32Array(an.frequencyBinCount); an.getFloatFrequencyData(b);
    var bw=fs/2048, s=0; for(var i=Math.ceil(F_LO/bw);i<=Math.floor(F_HI/bw);i++) s+=Math.pow(10,b[i]/10); return s; }
  function pickChannel(){
    if(sim) return sleep(700).then(function(){ chan=sim.chan||'right'; return chan; });
    function meas(w){ setProbe(w); return sleep(350).then(function(){ var v=[],i=0; return new Promise(function(r){
      var iv=setInterval(function(){ v.push(bandLevel()); if(++i>=10){ clearInterval(iv); v.sort(function(a,b){return a-b;}); r(v[5]); } },20); }); }); }
    return meas('single-left').then(function(Lv){ return meas('single-right').then(function(Rv){
      chan=(Lv>=Rv)?'left':'right'; setProbe('single-'+chan); return chan; }); });
  }
  function waitReady(){ return new Promise(function(r){ (function chk(){ var i=DSP2.info(); if(i.noProbe) return r('noprobe'); if(i.ready) return r('ok'); setTimeout(chk,60); })(); }); }
  /* getting ready, about 3 s with the hand away: side, probe level, the empty room. Resolves {ok} or {ok:false, why:'quiet'|'noprobe'} */
  function prepare(onStage){
    active=false; last=null; lost=false; PROBE_G=0.25;
    onStage&&onStage('side');
    return pickChannel().then(function(){ onStage&&onStage('level'); return autoLevel(); }).then(function(L){
      if(L.snr<30){ setProbe('off'); return {ok:false,why:'quiet',snr:L.snr}; }
      DSP2.init(fs,'all'); DSP2.setCal(PHYS_CAL); DSP2.set('autocenter',1); active=true; onStage&&onStage('room');
      return waitReady().then(function(st){ if(st==='noprobe'){ active=false; setProbe('off'); return {ok:false,why:'noprobe'}; } return {ok:true,snr:L.snr}; });
    });
  }
  /* simulation for headless tests and demos: frames come from source(i) (Float32Array of 512) at real-time rate instead of the microphone;
     the side is given, everything after that (auto level, echo processing, logs) is the real code */
  var sim=null;
  function simulate(o){ sim=o; fs=o.fs||48000; var df=fs/N; kLo=Math.ceil(F_LO/df); kHi=Math.floor(F_HI/df); kc=Math.floor((kLo+kHi)/2); }
  function simBoot(){ if(booted) return Promise.resolve(); booted=true; var i=0, t0=performance.now();
    setInterval(function(){ var due=Math.floor((performance.now()-t0)/1000*fs/N); while(i<due){ onFrame({data:{f:sim.source(i),s:i}}); i++; } },10);
    return Promise.resolve(); }
  function pause(){ if(ctx){ setProbe('off'); } }
  function resume(){ if(ctx&&active){ if(ctx.state==='suspended') ctx.resume(); setProbe('single-'+chan); } }
  return {boot:boot,prepare:prepare,simulate:simulate,setProbe:setProbe,pause:pause,resume:resume,probeSNR:probeSNR,
    listen:function(f){ listeners.push(f); },
    state:function(){ return last; }, lost:function(){ return lost; }, clearLost:function(){ lost=false; },
    shift:function(d){ DSP2.shift(d); },
    info:function(){ return {fs:fs,N:N,kLo:kLo,kHi:kHi,chan:chan,probe_gain:PROBE_G,probe_snr:PROBE_SNR,f_lo:F_LO,cal:PHYS_CAL,gaps:gaps,booted:booted}; },
    chan:function(){ return chan; }, ctx:function(){ return ctx; }};
})();
