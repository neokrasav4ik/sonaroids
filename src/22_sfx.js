/* ── SOUNDS: event sounds only, synthesised in the spirit of old consoles. Everything goes through three low-pass filters
   at 6 kHz, so no harmonic can reach the probe band (18–20 kHz). No music. ── */
var Sfx=(function(){
  var ctx=null, bus=null, noise=null, on=true, vol=1;
  try{ on=localStorage.getItem('sonaroids_sfx')!=='0'; }catch(e){}
  function setup(){
    var c=Sonar.ctx(); if(c!==ctx){ ctx=c; bus=null; } if(!ctx||bus) return;              // a new audio context after the microphone was re-opened: rebuild
    bus=ctx.createGain(); bus.gain.value=1.1*vol;
    var comp=ctx.createDynamicsCompressor(); comp.threshold.value=-20; comp.knee.value=6; comp.ratio.value=6; comp.attack.value=0.002; comp.release.value=0.12;
    var lim=ctx.createDynamicsCompressor(); lim.threshold.value=-3; lim.knee.value=0; lim.ratio.value=20; lim.attack.value=0.001; lim.release.value=0.06;
    var f=[ctx.createBiquadFilter(),ctx.createBiquadFilter(),ctx.createBiquadFilter()];
    f.forEach(function(q){ q.type='lowpass'; q.frequency.value=6000; q.Q.value=0.7; });
    bus.connect(comp); comp.connect(lim); lim.connect(f[0]); f[0].connect(f[1]); f[1].connect(f[2]); f[2].connect(ctx.destination);
    var len=Math.floor(ctx.sampleRate*0.8); noise=ctx.createBuffer(1,len,ctx.sampleRate);
    var d=noise.getChannelData(0); for(var i=0;i<len;i++) d[i]=Math.random()*2-1;
  }
  function play(kind){
    if(!on) return; setup(); if(!bus) return;
    var t=ctx.currentTime;
    function tone(f1,f2,dur,type,vol,at){ var o=ctx.createOscillator(), g=ctx.createGain(), s=t+(at||0); o.type=type||'square';
      o.frequency.setValueAtTime(f1,s); if(f2) o.frequency.exponentialRampToValueAtTime(f2,s+dur);
      g.gain.setValueAtTime(0,s); g.gain.linearRampToValueAtTime(vol,s+0.004); g.gain.setValueAtTime(vol,s+dur*0.6); g.gain.exponentialRampToValueAtTime(0.0001,s+dur);
      o.connect(g); g.connect(bus); o.start(s); o.stop(s+dur+0.02); }
    function crash(dur,freq,vol,at){ var src=ctx.createBufferSource(), bp=ctx.createBiquadFilter(), g=ctx.createGain(), s=t+(at||0);
      src.buffer=noise; bp.type='bandpass'; bp.frequency.value=freq; bp.Q.value=0.8;
      g.gain.setValueAtTime(vol,s); g.gain.exponentialRampToValueAtTime(0.0001,s+dur);
      src.connect(bp); bp.connect(g); g.connect(bus); src.start(s); src.stop(s+dur+0.02); }
    if(kind==='fire') tone(1400,700,0.05,'square',0.07);
    else if(kind==='break'){ crash(0.22,900,0.55); tone(320,90,0.18,'triangle',0.35); }
    else if(kind==='hit'){ crash(0.4,1800,0.9); tone(900,160,0.32,'square',0.5); }
    else if(kind==='over'){ tone(880,110,0.9,'square',0.5); crash(0.7,1200,0.6); }
    else if(kind==='start'){ tone(880,null,0.09,'square',0.45); tone(1320,null,0.14,'square',0.45,0.1); }
    else if(kind==='tick'){ tone(1200,null,0.07,'square',0.3); }
    else if(kind==='ok'){ [1047,1319,1568].forEach(function(f,i){ tone(f,null,0.08,'square',0.35,i*0.08); }); }
    else if(kind==='tap'){ tone(1000,700,0.06,'square',0.25); }
    else if(kind==='level'){ [784,988,1175,1568].forEach(function(f,i){ tone(f,null,0.07,'square',0.3,i*0.07); }); }
    else if(kind==='pick'){ tone(660,1320,0.12,'square',0.35); tone(1320,1760,0.1,'square',0.3,0.1); }
    else if(kind==='shield'){ crash(0.25,2400,0.5); tone(1500,600,0.2,'triangle',0.4); }
    else if(kind==='ufo'){ for(var i=0;i<4;i++) tone(i%2?520:700,i%2?700:520,0.12,'triangle',0.3,i*0.12); }
    else if(kind==='ufo_fire'){ tone(900,300,0.1,'sawtooth',0.18); }
    else if(kind==='ufo_die'){ crash(0.6,700,0.9); tone(600,80,0.5,'square',0.45); }
  }
  /* the game's own sounds must not flood the microphone: on the OnePlus 15 (24 Sep) they reached it ~50 dB louder than on iPhone,
     far above the probe, and the ship drifted. When the microphone gets near its limit, the sounds are turned down step by step */
  function duck(){ if(vol<=0.05) return false; vol=Math.max(0.05,vol*0.7); if(bus) bus.gain.setTargetAtTime(1.1*vol,ctx.currentTime,0.05); return true; }
  return {duck:duck,level:function(){ return vol; },play:play,on:function(){ return on; },toggle:function(){ on=!on; try{ localStorage.setItem('sonaroids_sfx',on?'1':'0'); }catch(e){} return on; }};
})();
