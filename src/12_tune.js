/* ── WAVE TUNING (from the lab, 24 Sep): while the game waits for the start, the player waves the palm in the 5–15 cm range
   and the ship follows. The last 6 s of palm heights are used: their 5th and 95th percentiles land on 10% and 90% of the screen;
   the whole screen covers 50–150 mm of palm travel. Steps every 0.25 s, each 35% of the way. Frozen from the countdown to game over.
   The screen is not linear: below the middle it is stretched ASYM times (near the table the sonar sees motion weaker).
   Pure module: no DOM, tested in Node. ── */
var Tune=(function(){
  var ASYM=1.7, WIN=6, STEP=0.25, A=0.35, B=0.10, TP=0.90, F_MIN=50, F_MAX=150;
  var WAVE_MIN=50;       // mm: a range counts as waved from 5 cm (was 3 cm; 24 Sep a small wiggle after a game shrank the field to 66 mm and the ship got twitchy)
  function create(field,auto){ return {buf:[],t:0,acc:0,span:null,ok:false,field:field||100,auto:auto!==false,last:null}; }
  /* screen fraction from the bottom (0…1) for a palm height in mm; 100 mm is the middle */
  function fracOf(T,h){ var FL=2*T.field/(1+ASYM), FU=2*ASYM*T.field/(1+ASYM); return Math.max(0,Math.min(1,h<100?0.5+(h-100)/FL:0.5+(h-100)/FU)); }
  function pick(buf){
    if(buf.length<60) return null;
    var h=buf.map(function(q){return q.h;}).sort(function(a,b){return a-b;}), p=function(f){ return h[Math.min(h.length-1,Math.floor(f*(h.length-1)))]; };
    var lo=p(0.05), hi=p(0.95), dur=buf[buf.length-1].t-buf[0].t;
    return {mid:(lo+hi)/2, med:p(0.5), span:hi-lo, lo:lo, hi:hi, dur:dur, wave:dur>=1.5&&hi-lo>=WAVE_MIN};
  }
  /* one game frame. active: is tuning on (waiting for the start); st: the latest DSP2 result; shift(d): shifts DSP2's height scale.
     Returns an event for the setup log, or null */
  function step(T,dt,st,active,shift){
    if(!active){ T.buf=[]; T.ok=false; T.span=null; return null; }
    T.t+=dt; if(st&&st.present) T.buf.push({t:T.t,h:st.height});
    while(T.buf.length&&T.buf[0].t<T.t-WIN) T.buf.shift();
    T.acc+=dt; if(T.acc<STEP) return null; T.acc=0;
    var r=pick(T.buf); if(!r){ T.ok=false; return null; }
    var f0=T.field;
    if(r.wave&&T.auto){ var F=r.span/((0.5-B)*2/(1+ASYM)+(TP-0.5)*2*ASYM/(1+ASYM)); F=Math.max(F_MIN,Math.min(F_MAX,F)); T.field+=(F-T.field)*A; }
    var cen=r.wave?r.lo+(0.5-B)*2*T.field/(1+ASYM):r.med, d=(cen-100)*-A;
    if(Math.abs(d)>0.2){ shift(d); T.buf.forEach(function(q){ q.h+=d; }); }
    T.ok=r.wave; T.span=r.span; T.last=r;
    if(Math.abs(d)>0.2||Math.abs(T.field-f0)>0.2) return {d:+d.toFixed(1),field:+T.field.toFixed(1),span:+r.span.toFixed(0),wave:r.wave};
    return null;
  }
  return {create:create,fracOf:fracOf,pick:pick,step:step,ASYM:ASYM};
})();
if(typeof module!=='undefined') module.exports=Tune;
