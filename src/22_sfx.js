/* ── SOUNDS: event sounds only, synthesised in the spirit of old consoles. Everything goes through three low-pass filters
   at 6 kHz, so no harmonic can reach the probe band (18–20 kHz). No music. ── */
var Sfx=(function(){
  var ctx=null, bus=null, post=null, noise=null, on=true, vol=1, lvl=6, NL=8;
  try{ var sv=+localStorage.getItem('sonaroids_sfxvol'); if(sv>0&&sv<=1) vol=sv; }catch(e){}   // v0.19: the level found on this phone is kept
  try{ var sl=+localStorage.getItem('sonaroids_sfxlvl'); if(sl>=1&&sl<=NL) lvl=Math.round(sl); }catch(e){}
  /* v0.36: the player's level, 1…8, after the compressor. At 6 (the default) the sounds are 2.25× louder than before (the maintainer, 26 Sep:
     at 50% media volume they were not heard at all with the microphone open on iPhone), at 8 — 4× (the limiter keeps the peaks at −3 dB).
     vol stays the microphone's guard (turned down when the sounds flood the microphone); a level set by hand gives it back in full */
  function postGain(){ return 4*(lvl/NL)*(lvl/NL); }
  try{ on=localStorage.getItem('sonaroids_sfx')!=='0'; }catch(e){}
  function setup(){
    var c=Sonar.ctx(); if(c!==ctx){ ctx=c; bus=null; } if(!ctx||bus) return;              // a new audio context after the microphone was re-opened: rebuild
    bus=ctx.createGain(); bus.gain.value=1.1*vol;
    var comp=ctx.createDynamicsCompressor(); comp.threshold.value=-20; comp.knee.value=6; comp.ratio.value=6; comp.attack.value=0.002; comp.release.value=0.12;
    var lim=ctx.createDynamicsCompressor(); lim.threshold.value=-3; lim.knee.value=0; lim.ratio.value=20; lim.attack.value=0.001; lim.release.value=0.06;
    var f=[ctx.createBiquadFilter(),ctx.createBiquadFilter(),ctx.createBiquadFilter()];
    f.forEach(function(q){ q.type='lowpass'; q.frequency.value=6000; q.Q.value=0.7; });
    post=ctx.createGain(); post.gain.value=postGain();
    bus.connect(comp); comp.connect(post); post.connect(lim); lim.connect(f[0]); f[0].connect(f[1]); f[1].connect(f[2]); f[2].connect(ctx.destination);
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
    else if(kind==='ping'){ tone(1568,null,0.06,'square',0.3); tone(2093,null,0.12,'square',0.3,0.06); }
    else if(kind==='level'){ [784,988,1175,1568].forEach(function(f,i){ tone(f,null,0.07,'square',0.3,i*0.07); }); }
    else if(kind==='pick'){ tone(660,1320,0.12,'square',0.35); tone(1320,1760,0.1,'square',0.3,0.1); }
    else if(kind==='shield'){ crash(0.25,2400,0.5); tone(1500,600,0.2,'triangle',0.4); }
    else if(kind==='ufo'){ for(var i=0;i<4;i++) tone(i%2?520:700,i%2?700:520,0.12,'triangle',0.3,i*0.12); }
    else if(kind==='ufo_fire'){ tone(900,300,0.1,'sawtooth',0.18); }
    else if(kind==='ufo_hit'){ crash(0.15,2200,0.5); tone(1300,500,0.12,'square',0.35); }
    else if(kind==='ufo_dodge'){ tone(380,950,0.09,'triangle',0.16); }
    else if(kind==='ufo_die'){ crash(0.6,700,0.9); tone(600,80,0.5,'square',0.45); }
  }
  /* the game's own sounds must not flood the microphone: on the OnePlus 13 (24 Sep) they reached it ~50 dB louder than on iPhone,
     far above the probe, and the ship drifted. When the microphone gets near its limit, the sounds are turned down step by step */
  /* v0.19: down to 0.03 and remembered for this phone. On the OnePlus the game's sounds reached the microphone at −17…−34 dB rms
     (peaks up to 0.84) against −55 on iPhone, and with them the echo range jumped half as much again */
  function duck(){ if(vol<=0.03) return false; vol=Math.max(0.03,vol*0.6); if(bus) bus.gain.setTargetAtTime(1.1*vol,ctx.currentTime,0.05);
    try{ localStorage.setItem('sonaroids_sfxvol',String(vol)); }catch(e){} return true; }
  function save(){ try{ localStorage.setItem('sonaroids_sfx',on?'1':'0'); localStorage.setItem('sonaroids_sfxlvl',String(lvl)); localStorage.setItem('sonaroids_sfxvol',String(vol)); }catch(e){} }
  function apply(){ if(bus){ bus.gain.setTargetAtTime(1.1*vol,ctx.currentTime,0.02); post.gain.setTargetAtTime(postGain(),ctx.currentTime,0.02); } }
  /* the sound row (v0.36): the middle switches on and off, − and + step the level; every change is heard at once */
  function setLevel(n){ if(n<1){ on=false; } else { on=true; lvl=Math.min(NL,n); vol=1; } apply(); save(); if(on) play('ping'); }
  return {duck:duck,level:function(){ return vol; },steps:NL,lvl:function(){ return lvl; },play:play,on:function(){ return on; },
    toggle:function(){ on=!on; if(on){ vol=1; apply(); } save(); if(on) play('ping'); return on; },
    down:function(){ setLevel(on?lvl-1:lvl); }, up:function(){ setLevel(on?lvl+1:lvl); },
    state:function(){ return {on:on,lvl:lvl,duck:Math.round(vol*100)/100}; }};
})();
