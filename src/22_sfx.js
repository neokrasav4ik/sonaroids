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
    // v0.84, SonaRace: a candy coin, a whole line of them, the soda, a car passed, a rub, a crash, the gifts, syrup, the fuel out
    else if(kind==='coin'){ tone(1568,2093,0.05,'square',0.18); }
    else if(kind==='line'){ [1319,1568,2093].forEach(function(f,i){ tone(f,null,0.06,'square',0.22,i*0.06); }); }
    else if(kind==='fuel'){ tone(420,1100,0.16,'triangle',0.4); crash(0.18,3200,0.25,0.05); }
    else if(kind==='pass'){ tone(260,520,0.1,'triangle',0.14); }
    else if(kind==='rub'){ crash(0.12,1600,0.35); }
    else if(kind==='crash'){ crash(0.4,900,0.9); tone(500,120,0.3,'square',0.45); }
    else if(kind==='magnet'||kind==='bubble'){ tone(880,1760,0.14,'triangle',0.35); tone(1320,2640,0.1,'triangle',0.25,0.1); }
    else if(kind==='turbo'){ tone(300,1400,0.35,'sawtooth',0.22); tone(880,1760,0.14,'triangle',0.3,0.05); }
    else if(kind==='pop'){ crash(0.2,2600,0.5); tone(1400,500,0.16,'triangle',0.35); }
    else if(kind==='boing'){ tone(520,260,0.08,'triangle',0.35); tone(260,780,0.14,'triangle',0.3,0.07); }   // v0.93: a knock on a bubble that does not pop
    else if(kind==='syrup'){ tone(260,140,0.22,'triangle',0.25); }
    else if(kind==='empty'){ tone(700,180,0.7,'triangle',0.4); }
  }
  /* v1.61t — SonaLob's own sounds (the maintainer 11 Oct 22:01: «качественными, деликатными, ненавязчивыми, грамотно спроектированными»;
     22:26 picked from the sketches page «Звуки SonaLob»). One family — wood and pencil, as the sketch on paper; the frequent sounds the
     quietest and shortest; good goes up (the clean passes climb a pentatonic), bad goes down. Through the same chain as every sound
     (the compressor, the player's level, the limiter, three low-passes at 6 kHz — nothing near the probe at 18–20 kHz). For a phone's small
     speaker (it hardly plays below ~200 Hz) every low thump has its octave above. Each sound varies a little (±2.5% pitch, ±1.5 dB), so a
     long rally doesn't sound like a machine. Not part of the rules: Math.random here is fine */
  var PENTA=[261.63,293.66,329.63,392.0,440.0,523.25,587.33];
  function lob(kind,n,a){
    if(!on) return; setup(); if(!bus) return;
    var t=ctx.currentTime+0.005, rp=function(){ return 1+(Math.random()-0.5)*0.05; }, rv=function(){ return Math.pow(10,(Math.random()-0.5)*0.15); };
    function env(g,s,at,peak,dur){ g.gain.setValueAtTime(0.0001,s); g.gain.exponentialRampToValueAtTime(Math.max(0.0002,peak),s+at); g.gain.exponentialRampToValueAtTime(0.0001,s+at+dur); }
    function sine(f,s,peak,dur,at,type,glide){ var o=ctx.createOscillator(), g=ctx.createGain(); o.type=type||'sine'; o.frequency.setValueAtTime(f,s); if(glide) o.frequency.exponentialRampToValueAtTime(glide,s+dur);
      env(g,s,at||0.004,peak,dur); o.connect(g); g.connect(bus); o.start(s); o.stop(s+dur+0.05); }
    function nz(s,dur,ft,freq,Q,peak,at,sweep){ var src=ctx.createBufferSource(), f=ctx.createBiquadFilter(), g=ctx.createGain(); src.buffer=noise; src.loop=true;
      f.type=ft; f.frequency.setValueAtTime(freq,s); if(sweep) f.frequency.exponentialRampToValueAtTime(sweep,s+dur); f.Q.value=Q||1; env(g,s,at||0.002,peak,dur);
      src.connect(f); f.connect(g); g.connect(bus); src.start(s,Math.random()*0.5); src.stop(s+dur+0.05); }
    function wood(f,s,v,len){ sine(f,s,v,len,0.003); sine(f*3.93,s,v*0.22,len*0.18,0.002); nz(s,0.018,'bandpass',2400,1.5,v*0.35,0.001); }
    function thump(s,v,f0,f1,len){ sine(f0,s,v,len,0.002,'sine',f1); sine(f0*2,s,v*0.45,len*0.6,0.002,'sine',f1*2); }   // the octave — for a phone's speaker
    var v=rv();
    if(kind==='serve'){ wood(196*rp(),t,0.26*v,0.2); wood(261.6*rp(),t+0.11,0.22*v,0.25); }
    else if(kind==='pass'){ var f=PENTA[Math.max(0,Math.min(PENTA.length-1,n||0))]*(1+(Math.random()-0.5)*0.012), k=0.6+0.4*Math.max(0,Math.min(1,a===undefined?0.7:a)); wood(f,t,0.34*k*v,0.36); }   // the hit's strength — louder
    else if(kind==='dull'){ sine(196*rp(),t,0.24*v,0.16); nz(t,0.03,'lowpass',700,1,0.2*v); }
    else if(kind==='land'){ var kl=0.5+0.5*Math.max(0,Math.min(1,a===undefined?0.6:a)); thump(t,0.26*kl*v,150*rp(),70,0.09); }
    else if(kind==='crack'){ var kc=1+0.25*Math.min(3,n||0); nz(t,0.025,'highpass',2600*rp(),0.8,0.3*kc*v); nz(t+0.02,0.04,'bandpass',1400,2,0.12*kc*v); }
    else if(kind==='cave'){ [0,0.12,0.24,0.36].forEach(function(d,i){ sine((i%2?165:147)*rp(),t+d,0.18*v,0.08); sine((i%2?330:294),t+d,0.07*v,0.05); }); sine(330,t+0.6,0.2*v,0.22,0.01,'triangle',150); }   // creeping steps — and «ам»
    else if(kind==='lost'){ thump(t,0.4*v,120,45,0.2); wood(220*rp(),t+0.08,0.22*v,0.3); wood(174.6*rp(),t+0.26,0.22*v,0.4); }
    else if(kind==='narrow'){ nz(t,0.14,'bandpass',700*rp(),3,0.24*v,0.03,1600); nz(t+0.2,0.14,'bandpass',700*rp(),3,0.24*v,0.03,1600); }   // the saw: a bit of each plank is sawn off
    else if(kind==='tick'){ wood(523.3,t,0.2*v,0.12); }
    else if(kind==='start'){ [261.6,329.6,392].forEach(function(f,i){ wood(f,t+i*0.04,0.24*v,0.5); }); }
    else if(kind==='over'){ [523.3,392,329.6,261.6].forEach(function(f,i){ wood(f,t+i*0.22,0.26*v,0.45); }); }
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
  return {duck:duck,level:function(){ return vol; },steps:NL,lvl:function(){ return lvl; },play:play,lob:lob,on:function(){ return on; },
    toggle:function(){ on=!on; if(on){ vol=1; apply(); } save(); if(on) play('ping'); return on; },
    down:function(){ setLevel(on?lvl-1:lvl); }, up:function(){ setLevel(on?lvl+1:lvl); },
    state:function(){ return {on:on,lvl:lvl,duck:Math.round(vol*100)/100}; }};
})();
