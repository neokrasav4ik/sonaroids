/* ── SONAR: speaker probe, microphone, echo processing. Moved over from the lab (04_audio_engine, 06_side_pick, 07_calibration)
   without changes to the numbers; only the lab's screens are gone.
   The probe is a periodic multi-tone (512 samples, 18.3–20.5 kHz, Schroeder phases). Two extra probes on the even and odd tones
   let us tell the left speaker from the right one: the louder one at the microphone is next to the charging port, and the port
   faces the playing hand. ── */
var Sonar=(function(){
  var N=512, F_LO=18300, F_HI=20500, fs=0, kLo, kHi, kc, band='normal', sS=null, sL=null, sR=null;
  /* v0.40: the wide probe, 16–20.5 kHz — the player picks it before every game (the lab, 27 Sep: it follows the palm about twice as cleanly,
     but children and animals may hear it). WIDE_CAL — fitted on the maintainer's wide recording against the marker (offset −1 mm) */
  var BANDS={normal:18300,wide:16000}, WIDE_CAL={k:1.4,o:100-1.4*100,s:0.9};
  var ctx=null, stream=null, node=null, an=null, gSL, gSR, gL, gR, booted=false;
  var PROBE_G=0.25, PROBE_SNR=null, chan='right', active=false, lastSeq=-1, gaps=0, collector=null, last=null, lost=false;
  var listeners=[], peak=0, lastFrameAt=0, simIv=null, simStalled=false;
  var PHYS_CAL={k:1.17,o:100-1.17*110,s:0.9};   // mm of palm height per mm of echo range, and per unit of the fast (phase) part — from the lab
  function sleep(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }
  /* v0.50: the app's own sound. In the Android app (window.SonaroidsApp.audioStart) the app can record and play itself — then the microphone
     and the speaker can be picked (a WebView gets whatever microphone Android gives it: on the Redmi sometimes the port's, sometimes the
     front camera's). The page keeps doing all the processing; only where the frames come from and where the probe goes change.
     'sonaroids_audio': 'app' | 'browser' (default: the browser, until the app's sound is tried on phones); 'sonaroids_mic' / 'sonaroids_out':
     the device ids to use, '' — Android's pick; 'sonaroids_src': the recording source. */
  var NATA=null, natPort=null, natOn=false, natCfg=null;
  function lsGet(k,d){ try{ var v=localStorage.getItem(k); return v===null?d:v; }catch(e){ return d; } }
  function natAvail(){ var A=typeof window!=='undefined'&&window.SonaroidsApp; return !!(A&&A.audioStart); }
  function natWanted(){ return natAvail()&&lsGet('sonaroids_audio','browser')==='app'; }
  function f32b64(a){ var b=new Uint8Array(new Float32Array(a).buffer), s='', i; for(i=0;i<b.length;i++) s+=String.fromCharCode(b[i]); return btoa(s); }
  function probeData(parity){
    var ks=[],k,n,q; for(k=kLo;k<=kHi;k++) if(parity==='all'||k%2===parity) ks.push(k);
    var M=ks.length, x=new Float64Array(N), mx=0;
    for(n=0;n<N;n++){ var s=0; for(q=0;q<M;q++) s+=Math.cos(2*Math.PI*ks[q]*n/N+Math.PI*q*q/M); x[n]=s; if(Math.abs(s)>mx) mx=Math.abs(s); }
    var d=new Float32Array(N); for(n=0;n<N;n++) d[n]=x[n]/mx*0.9; return d;
  }
  function natProbes(){ NATA.audioProbe('all',f32b64(probeData('all'))); NATA.audioProbe('even',f32b64(probeData(0))); NATA.audioProbe('odd',f32b64(probeData(1))); }
  /* a message: "<seq>:<base64 of int16 LE>", two frames (interleaved if stereo — the first channel is used) */
  function natMsg(e){ var d=e.data; if(typeof d!=='string') return; var c=d.indexOf(':'); if(c<0) return;
    var seq=+d.slice(0,c), bin=atob(d.slice(c+1)), ch=natCfg&&natCfg.ch===2?2:1, n=bin.length>>1, nf=Math.floor(n/ch/N), f, i, j, v;
    for(i=0;i<nf;i++){ f=new Float32Array(N);
      for(j=0;j<N;j++){ var o=((i*N+j)*ch)<<1; v=bin.charCodeAt(o)|(bin.charCodeAt(o+1)<<8); if(v>=32768) v-=65536; f[j]=v/32768; }
      onFrame({data:{f:f,s:seq+i}}); } }
  function natBoot(){
    NATA=window.SonaroidsApp; var AC=window.AudioContext||window.webkitAudioContext;
    try{ if(AC){ ctx=new AC(); if(ctx.state==='suspended') ctx.resume(); } }catch(e){ ctx=null; }   // only for the game's sounds
    fs=48000; var df=fs/N; kLo=Math.ceil(F_LO/df); kHi=Math.floor(F_HI/df); kc=Math.floor((kLo+kHi)/2);
    var mic=lsGet('sonaroids_mic',''), out=lsGet('sonaroids_out','');
    natCfg={mic:mic===''?-1:+mic,out:out===''?-1:+out,src:lsGet('sonaroids_src','auto'),usage:lsGet('sonaroids_usage','media'),ch:1};
    var au=autoPick(); if(natAuto()&&au){ natCfg.mic=au.mic; natCfg.src=au.src; }
    natProbes(); NATA.audioGains(0,0,0,0);
    return new Promise(function(res,rej){
      var to=setTimeout(function(){ window.removeEventListener('message',h); rej(new Error('no-mic')); },4000);
      function h(e){ if(e.data!=='sonaroids-audio'||!e.ports||!e.ports[0]) return; window.removeEventListener('message',h); clearTimeout(to);
        natPort=e.ports[0]; natPort.onmessage=natMsg; natOn=true; booted=true; lastSeq=-1; lastFrameAt=performance.now(); res(); }
      window.addEventListener('message',h);
      var ok=false; try{ ok=NATA.audioStart(JSON.stringify(natCfg)); }catch(e){ ok=false; }
      if(!ok){ clearTimeout(to); window.removeEventListener('message',h); rej(new Error('no-mic')); }
    });
  }
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
  /* v0.54: the app picks the recording itself. Mi 9 Lite, 28 Sep: UNPROCESSED let the probe's level wander ~6% frame to frame in an empty
     room (the palm lost now and then), VOICE_RECOGNITION held it at 0.9%; the back microphone heard the probe 14 dB quieter and could
     not tell the palm's distance. On the Redmi the WebView sometimes records at the port, sometimes at the front camera. So, in the app's
     mode with the source and the microphone left on «auto», getting ready tries each built-in microphone with VOICE_RECOGNITION (and
     UNPROCESSED where the phone has it): ~0.25 s to settle, 0.5 s (48 frames) with the probe on and the hand away, and measures how steady
     the probe is at the microphone (the frame-to-frame wander of its tones) and how loud (its line). Of those steady enough (under 3%) and not
     clipping, the one with the best signal-to-noise wins, VOICE_RECOGNITION and the bottom microphone with a 6 dB head start (v0.55); it is remembered (sonaroids_autoaudio) and used from the start next time, and tried again only after
     a getting ready that failed, or from the service screen. The results go into the setup log (auto_audio). */
  var autoLog=null, autoRetest=false;
  function natAuto(){ return lsGet('sonaroids_mic','')===''&&lsGet('sonaroids_src','auto')==='auto'; }
  function autoPick(){ try{ var j=JSON.parse(lsGet('sonaroids_autoaudio','')||'null'); return j&&typeof j.mic==='number'&&j.src&&j.v===2?j:null; }catch(e){ return null; } }   // v:2 — picks by v0.55's rules (v0.54's are tried again)
  function steadiness(frames){ var ks=[],k,n,t; for(k=kLo;k<=kHi;k++) ks.push(k); var K=ks.length, T=frames.length, re=[], im=[], mr=new Float64Array(K), mi=new Float64Array(K);
    for(t=0;t<T;t++){ var r=new Float64Array(K), q=new Float64Array(K), f=frames[t];
      for(var j=0;j<K;j++){ var w=2*Math.PI*ks[j]/N, sr=0, si=0; for(n=0;n<N;n++){ sr+=f[n]*Math.cos(w*n); si-=f[n]*Math.sin(w*n); } r[j]=sr; q[j]=si; mr[j]+=sr/T; mi[j]+=si/T; }
      re.push(r); im.push(q); }
    // v0.55: the wander of the probe's level as a whole — each frame projected on the mean response (all its tones at once), so the noise,
    // which differs tone by tone, averages out. v0.54 compared every tone on its own: at the test's signal-to-noise (~19 dB on the Mi 9 Lite
    // at 27%) the noise alone gave 10% for both sources, and the test could not tell them apart
    var mm=0, a=[]; for(var j2=0;j2<K;j2++) mm+=mr[j2]*mr[j2]+mi[j2]*mi[j2];
    if(!(mm>0)) return 1;
    for(t=0;t<T;t++){ var pr=0, pi=0; for(j2=0;j2<K;j2++){ pr+=re[t][j2]*mr[j2]+im[t][j2]*mi[j2]; pi+=im[t][j2]*mr[j2]-re[t][j2]*mi[j2]; } a.push(Math.hypot(pr,pi)/mm); }
    var am=0, av=0; a.forEach(function(v){ am+=v/T; }); a.forEach(function(v){ av+=(v-am)*(v-am)/T; });
    return am>0?Math.sqrt(av)/am:1; }
  function audioTest(){
    if(!natOn||!NATA.audioSwitch||!natAuto()) return Promise.resolve(null);
    if(autoPick()&&!autoRetest) return Promise.resolve(null);
    var dv={}; try{ dv=JSON.parse(NATA.audioDevices()); }catch(e){}
    var ins=(dv.inputs||[]).filter(function(d){ return d.type==='builtin_mic'; }), addr={}; ins.forEach(function(d){ addr[d.id]=String(d.address||'').toLowerCase(); });
    var mics=ins.map(function(d){ return d.id; }); if(!mics.length) mics=[-1];
    var srcs=['voice'].concat(dv.unprocessed?['unprocessed']:[]), cands=[];
    mics.forEach(function(m){ srcs.forEach(function(sc){ cands.push({mic:m,src:sc}); }); });
    var res=[];
    return cands.reduce(function(p,c){ return p.then(function(){
      if(!NATA.audioSwitch(JSON.stringify({mic:c.mic,src:c.src,ch:1}))){ res.push({mic:c.mic,src:c.src,fail:true}); return; }
      return sleep(250).then(function(){ return collect(48); }).then(function(fr){ var st=probeStats(fr,fs,F_LO,20450), rt=null;
        try{ var S=JSON.parse(NATA.audioStatus()); rt=S.in?S.in.id:null; }catch(e){}
        var pk=0; fr.forEach(function(f){ for(var j=0;j<f.length;j++){ var v=f[j]<0?-f[j]:f[j]; if(v>pk) pk=v; } });
        res.push({mic:c.mic,src:c.src,routed:rt,wander:+steadiness(fr).toFixed(4),line:+(st.line-20*Math.log10(PROBE_G)).toFixed(1),snr:+st.snr.toFixed(1),peak:+pk.toFixed(3)}); }); }); },Promise.resolve())
    // the media volume is set before this (the app, startPrepare), and every candidate hears the same probe at the same gain; the auto
    // level that follows turns the probe down to the same signal-to-noise on whichever wins — so the pick goes by that ratio (SNR), not by
    // loudness alone; a recording near clipping (peak ≥ 0.9, a loud phone) is not taken
    // v0.55 (the maintainer, Mi 9 Lite 11:33: UNPROCESSED won by 0.1 dB and steered a little worse). On the Mi 9 Lite the empty room
    // cancelled out far worse with UNPROCESSED (residual −12…−14 dB against −36 with VOICE_RECOGNITION and −33 through the browser),
    // though the probe itself was as steady — something a 0.5 s test cannot see. So VOICE_RECOGNITION and the bottom microphone (by the
    // port and the speaker) are preferred: another source or microphone must be 6 dB better in signal-to-noise to win
    .then(function(){ var bonus=function(r){ return r.snr+(r.src==='voice'?6:0)+(addr[r.mic]==='bottom'?6:0); };
      var ok=res.filter(function(r){ return !r.fail&&r.wander<0.03&&r.peak<0.9; }), pick;
      if(ok.length) pick=ok.sort(function(a,b){ return bonus(b)-bonus(a); })[0];
      else pick=res.filter(function(r){ return !r.fail; }).sort(function(a,b){ return a.wander-b.wander; })[0];
      autoLog={tried:res,pick:pick?{mic:pick.mic,src:pick.src}:null}; autoRetest=false;
      if(!pick) return;
      try{ localStorage.setItem('sonaroids_autoaudio',JSON.stringify({mic:pick.mic,src:pick.src,v:2})); }catch(e){}
      natCfg.mic=pick.mic; natCfg.src=pick.src; NATA.audioSwitch(JSON.stringify({mic:pick.mic,src:pick.src,ch:1})); return sleep(250); });
  }
  /* microphone, audio context, probes. Must start from a tap (browsers unlock sound only on a user gesture) */
  function boot(){
    if(sim) return simBoot();
    if(booted) return Promise.resolve();
    if(natWanted()) return natBoot();
    var AC=window.AudioContext||window.webkitAudioContext;
    if(!AC) return Promise.reject(new Error('no-webaudio'));
    if(!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)) return Promise.reject(new Error('no-mic'));
    return openMic().then(function(s){ stream=s; ctx=new AC(); if(ctx.state==='suspended') ctx.resume();
      if(!ctx.audioWorklet) throw new Error('no-worklet');
      return ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET],{type:'application/javascript'}))); })
    .then(function(){
      fs=ctx.sampleRate; var df=fs/N; kLo=Math.ceil(F_LO/df); kHi=Math.floor(F_HI/df); kc=Math.floor((kLo+kHi)/2);
      var mg=ctx.createChannelMerger(2); sS=loopSrc(makeProbe('all')); sL=loopSrc(makeProbe(0)); sR=loopSrc(makeProbe(1));
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
  /* the probe band: new probes on the same volume knobs (the old ones stop); the echo processing takes the band in prepare() */
  function setBand(b){ band=b==='wide'?'wide':'normal'; F_LO=BANDS[band]; if(!fs) return; var df=fs/N; kLo=Math.ceil(F_LO/df); kHi=Math.floor(F_HI/df); kc=Math.floor((kLo+kHi)/2);
    if(natOn){ natProbes(); return; }
    if(!ctx||!sS) return; [sS,sL,sR].forEach(function(s){ try{ s.stop(); s.disconnect(); }catch(e){} });
    sS=loopSrc(makeProbe('all')); sL=loopSrc(makeProbe(0)); sR=loopSrc(makeProbe(1)); sS.connect(gSL); sS.connect(gSR); sL.connect(gL); sR.connect(gR); sS.start(); sL.start(); sR.start(); }
  function curCal(){ return band==='wide'?WIDE_CAL:PHYS_CAL; }
  function setProbe(w){                        // 'off' | 'dual' | 'single-left' | 'single-right'
    if(natOn){ try{ NATA.audioGains(w==='single-left'?PROBE_G:0,w==='single-right'?PROBE_G:0,w==='dual'?0.25:0,w==='dual'?0.25:0); }catch(e){} return; }
    if(!ctx) return; var t=ctx.currentTime;
    gSL.gain.setTargetAtTime(w==='single-left'?PROBE_G:0,t,0.02);
    gSR.gain.setTargetAtTime(w==='single-right'?PROBE_G:0,t,0.02);
    gL.gain.setTargetAtTime(w==='dual'?0.25:0,t,0.02);
    gR.gain.setTargetAtTime(w==='dual'?0.25:0,t,0.02);
  }
  function collect(n){ return new Promise(function(r){ collector={n:n,arr:[],done:r}; }); }
  /* every microphone frame goes through here: echo processing, then logs */
  function onFrame(e){
    var m=e.data, gap=(lastSeq>=0&&m.s!==lastSeq+1); lastSeq=m.s; if(gap) gaps++; lastFrameAt=performance.now();
    var pk=0; for(var j=0;j<m.f.length;j++){ var av=m.f[j]<0?-m.f[j]:m.f[j]; if(av>pk) pk=av; } peak=Math.max(pk,peak*0.99);   // loudness of the microphone, ~1 s memory
    if(collector){ collector.arr.push(m.f); if(collector.arr.length>=collector.n){ var c=collector; collector=null; c.done(c.arr); } }
    var r=null; if(active){ r=DSP2.frame(m.f); if(r) last=r; if(DSP2.info().lost) lost=true; }
    for(var i=0;i<listeners.length;i++) listeners[i](m.f,r,gap);
  }
  /* signal-to-noise in the probe band: 8 periods in a row put the probe exactly on every 8th spectral line, noise on all of them */
  function probeStats(frames,fs,fLo,fHi){
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
    return {snr:10*Math.log10(Math.max(probe,1e-30)/Math.max(noiseBand,1e-30)), line:10*Math.log10(Math.max(probe,1e-30)/(nl||1))};
  }
  function probeSNR(frames,fs,fLo,fHi){ return probeStats(frames,fs,fLo,fHi).snr; }
  /* auto level: turn our own probe down to the minimum with a margin — how loud it is in the room hardly depends on the phone's volume.
     It also measures how loud the probe itself is, per unit of our gain (PROBE_LVL, dB): that — not the signal-to-noise ratio —
     tells a muted phone from a noisy room. On the maintainer's iPhone it is 12–13 dB with any volume that worked (24 Sep). */
  var SNR_TARGET=48, G_MIN=0.015, G_MAX=0.3, PROBE_LVL=null, QUIET_LVL=-6;
  function measureSNR(){ return sleep(350).then(function(){ return collect(8); }).then(function(fr){ var st=probeStats(fr,fs,F_LO,20450); PROBE_LVL=st.line-20*Math.log10(PROBE_G); return st.snr; }); }
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
    function meas(w){ setProbe(w);
      // v0.50: the app's sound has no analyser — the probe's own line power over 8 frames (probeStats), which measures the same thing
      if(natOn) return sleep(350).then(function(){ return collect(8); }).then(function(fr){ return probeStats(fr,fs,F_LO,F_HI).line; });
      return sleep(350).then(function(){ var v=[],i=0; return new Promise(function(r){
      var iv=setInterval(function(){ v.push(bandLevel()); if(++i>=10){ clearInterval(iv); v.sort(function(a,b){return a-b;}); r(v[5]); } },20); }); }); }
    return meas('single-left').then(function(Lv){ return meas('single-right').then(function(Rv){
      chan=(Lv>=Rv)?'left':'right'; setProbe('single-'+chan); return chan; }); });
  }
  function waitReady(){ return new Promise(function(r){ (function chk(){ var i=DSP2.info(); if(i.noProbe) return r('noprobe'); if(i.ready) return r('ok'); setTimeout(chk,60); })(); }); }
  /* getting ready, about 3 s with the hand away: side, probe level, the empty room. Resolves {ok} or {ok:false, why:'quiet'|'noprobe'} */
  /* v0.45: the media volume. The probe level per unit of our gain (PROBE_LVL) is, in effect, how loud the phone plays. The phones that
     steered well had 0–14 dB (iPhone, Mi 9 Lite, two Android browsers); the maintainer's Redmi Note 10S in the app, with the media volume
     pushed to 60%, had 34–37 dB — the speaker's own sound buried the palm's echo — and on it 20–30% plays fine, higher "swings".
     So the app starts at 25% (if the volume is outside 20–30%) and moves it only when the measurement says so: above LOUD_LVL it turns down
     towards VOL_TARGET (not below 2/15, the game's sounds must stay audible), below VOL_TARGET−VOL_OK it turns up (not above VOL_UP);
     up to 4 tries, ~4 dB per 1/15 of the range. A browser cannot set the volume: above LOUD_LVL it asks to turn it down, as it asks
     to turn it up when too quiet. */
  var VOL_TARGET=10, VOL_OK=5, LOUD_LVL=24, VOL_DB=60, VOL_MIN=0.13, VOL_UP=0.5, volLog=[];
  function fitVolume(vol,adj){ var n=0; volLog=[];
    function step(L){ var v=vol.get(), lv=PROBE_LVL-adj; volLog.push({v:Math.round(v*100)/100,lvl:Math.round(PROBE_LVL*10)/10});
      if(n>=4||(lv<=LOUD_LVL&&lv>=VOL_TARGET-VOL_OK)) return L;
      var nv=Math.max(lv>LOUD_LVL?VOL_MIN:v,Math.min(lv>LOUD_LVL?v:VOL_UP,v+(VOL_TARGET-lv)/VOL_DB)); if(Math.abs(nv-v)<0.034) return L;
      n++; vol.set(nv); PROBE_G=0.25; setProbe('single-'+chan); return sleep(250).then(autoLevel).then(step); }
    return step; }
  function prepare(onStage,vol){
    active=false; last=null; lost=false; PROBE_G=0.25; volLog=[];
    onStage&&onStage('side');
    var adj0=function(){ return 10*Math.log10((Math.floor(F_HI*N/fs)-Math.ceil(BANDS.normal*N/fs)+1)/(kHi-kLo+1)); };
    return pickChannel().then(audioTest).then(function(){ onStage&&onStage('level'); return autoLevel(); }).then(function(L){ return vol?fitVolume(vol,adj0())(L):L; }).then(function(L){
      // "barely heard": the probe itself is ~19 dB quieter than on a phone with sound on (the media volume at zero; on iPhone the silent switch
      // does not mute it). Not by signal-to-noise: a noisy room (24 Sep: 33 dB worked fine) and a palm moving nearby (its echo counts as "noise";
      // 24 Sep: after a game over the next start said "too quiet") both lower it. A probe too weak to read is caught by DSP2 ('noprobe')
      // the wide probe spreads the same power over about twice as many tones: each is ~3 dB quieter, so the bar moves with it
      var lvlAdj=10*Math.log10((Math.floor(F_HI*N/fs)-Math.ceil(BANDS.normal*N/fs)+1)/(kHi-kLo+1));
      if(PROBE_LVL<QUIET_LVL+lvlAdj){ setProbe('off'); autoRetest=true; return {ok:false,why:'quiet',snr:L.snr,level:PROBE_LVL}; }
      if(!vol&&PROBE_LVL>LOUD_LVL+lvlAdj){ setProbe('off'); return {ok:false,why:'loud',snr:L.snr,level:PROBE_LVL}; }
      DSP2.set('flo',band==='wide'?F_LO:null); DSP2.init(fs,'all'); DSP2.setCal(curCal()); DSP2.set('autocenter',1); active=true; onStage&&onStage('room');
      return waitReady().then(function(st){ if(st==='noprobe'){ active=false; setProbe('off'); autoRetest=true; return {ok:false,why:'noprobe'}; } return {ok:true,snr:L.snr}; });
    });
  }
  /* simulation for headless tests and demos: frames come from source(i) (Float32Array of 512) at real-time rate instead of the microphone;
     the side is given, everything after that (auto level, echo processing, logs) is the real code */
  var sim=null;
  function simulate(o){ sim=o; fs=o.fs||48000; var df=fs/N; kLo=Math.ceil(F_LO/df); kHi=Math.floor(F_HI/df); kc=Math.floor((kLo+kHi)/2); }
  function simBoot(){ if(booted) return Promise.resolve(); booted=true; var i=0, t0=performance.now(); lastSeq=-1;
    simIv=setInterval(function(){ var due=Math.floor((performance.now()-t0)/1000*fs/N); if(simStalled){ i=due; return; } while(i<due){ onFrame({data:{f:sim.source(i,PROBE_G),s:i}}); i++; } },10);
    return Promise.resolve(); }
  function pause(){ if(ctx||natOn){ setProbe('off'); } }
  function resume(){ if(natOn&&active){ setProbe('single-'+chan); return; } if(ctx&&active){ if(ctx.state!=='running') ctx.resume().catch(function(){}); setProbe('single-'+chan); } }
  /* Is the microphone still with us? When the app goes to the background iOS takes the microphone away (the island's mic light goes out)
     and does not give it back by itself (24 Sep). Signs: the track has ended or is muted, the audio context is not running,
     or no frames for half a second. Then the game has to ask for the microphone again — from a tap. */
  function healthy(){
    if(!booted) return false;
    if(sim) return !simStalled&&performance.now()-lastFrameAt<600;
    if(natOn) return performance.now()-lastFrameAt<600;
    var tr=stream?stream.getAudioTracks():[];
    if(!tr.length||tr.some(function(t){ return t.readyState!=='live'||t.muted; })) return false;
    return ctx&&ctx.state==='running'&&performance.now()-lastFrameAt<600;
  }
  /* drop everything and start over: the next boot() (from a tap) asks for the microphone again */
  function restart(){
    try{ if(stream) stream.getTracks().forEach(function(t){ t.stop(); }); }catch(e){}
    try{ if(node){ node.port.onmessage=null; node.disconnect(); } }catch(e){}
    try{ if(ctx) ctx.close(); }catch(e){}
    if(natOn||natPort){ try{ NATA.audioStop(); }catch(e){} try{ natPort.onmessage=null; natPort.close(); }catch(e){} natPort=null; natOn=false; }
    if(simIv){ clearInterval(simIv); simIv=null; } simStalled=false;     // in simulation a re-opened microphone works again
    ctx=null; stream=null; node=null; an=null; booted=false; active=false; collector=null; lastSeq=-1; last=null; lost=false; lastFrameAt=0;
  }
  return {boot:boot,prepare:prepare,setBand:setBand,band:function(){ return band; },simulate:simulate,healthy:healthy,restart:restart,simStall:function(v){ simStalled=!!v; },setProbe:setProbe,pause:pause,resume:resume,probeSNR:probeSNR,
    listen:function(f){ listeners.push(f); },
    state:function(){ return last; }, lost:function(){ return lost; }, clearLost:function(){ lost=false; },
    shift:function(d){ DSP2.shift(d); },
    peak:function(){ return peak; },
    /* what the browser really gave for the microphone: on Android the echo/noise/gain processing may stay on despite our request */
    micSettings:function(){ if(natOn){ try{ var st=JSON.parse(NATA.audioStatus()); return {audio:'app',src:st.src,usage:st.usage,fx:st.fx,mic_wanted:st.mic_wanted,out_wanted:st.out_wanted,in:st.in,out:st.out,active:st.active}; }catch(e){ return {audio:'app'}; } }
      try{ var t=stream&&stream.getAudioTracks()[0]; if(!t) return null; var s=t.getSettings(), o={}; ['autoGainControl','echoCancellation','noiseSuppression','sampleRate','channelCount','latency','deviceId'].forEach(function(k){ if(s[k]!==undefined) o[k]=k==='deviceId'?String(s[k]).slice(0,8):s[k]; }); o.label=t.label; return o; }catch(e){ return null; } },
    info:function(){ return {fs:fs,N:N,kLo:kLo,kHi:kHi,chan:chan,probe_gain:PROBE_G,probe_snr:PROBE_SNR,probe_level:PROBE_LVL,vol_fit:volLog.slice(),f_lo:F_LO,band:band,cal:curCal(),gaps:gaps,booted:booted,audio:natOn?'app':'browser',auto_audio:autoLog}; },
    audioRetest:function(){ autoRetest=true; try{ localStorage.removeItem('sonaroids_autoaudio'); }catch(e){} },
    native:function(){ return natOn; }, nativeAvail:natAvail,
    chan:function(){ return chan; }, ctx:function(){ return ctx; }};
})();
