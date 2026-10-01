/* ── WAVE TUNING (from the lab, 24 Sep): while the game waits for the start, the player waves the palm in the 5–15 cm range (4–12 in v0.22–0.25)
   and the ship follows. The last 6 s of palm heights are used: their 5th and 95th percentiles land on 6% and 90% of the screen;
   the whole screen covers 50–120 mm of palm travel. Steps every 0.25 s, each 35% of the way. Frozen from the countdown to game over.
   The screen is not linear: below the middle it is stretched ASYM times (near the table the sonar sees motion weaker).
   Pure module: no DOM, tested in Node. ── */
var Tune=(function(){
  /* v0.21 (25 Sep, iPhone game 00:44 "harder to steer, hardest to go down"): the field had grown to the 150 mm cap — the player waved
     wide on the new try-out screen, and the whole screen then took 15 cm of palm travel; in flight the palm went down to only 15% of the
     screen. Now at most 120 mm, and the lowest waved point lands on 6% of the screen (was 10%) */
  var ASYM=1.7, WIN=6, STEP=0.25, A=0.35, B=0.06, TP=0.90, F_MIN=50, F_MAX=120;
  var WAVE_DUR=5;        // s: waving must go on this long before the range counts as caught (v0.10: was 1.5 s — too quick to get oriented)
  var WAVE_MIN=50;       // mm: a range counts as waved from 5 cm (was 3 cm; 24 Sep a small wiggle after a game shrank the field to 66 mm and the ship got twitchy)
  function create(field,auto){ return {buf:[],t:0,acc:0,span:null,ok:false,field:field||100,auto:auto!==false,last:null}; }
  /* screen fraction from the bottom (0…1) for a palm height in mm; 100 mm is the middle */
  function fracOf(T,h){ var FL=2*T.field/(1+ASYM), FU=2*ASYM*T.field/(1+ASYM); return Math.max(0,Math.min(1,h<100?0.5+(h-100)/FL:0.5+(h-100)/FU)); }
  function pick(buf){
    if(buf.length<60) return null;
    var h=buf.map(function(q){return q.h;}).sort(function(a,b){return a-b;}), p=function(f){ return h[Math.min(h.length-1,Math.floor(f*(h.length-1)))]; };
    var lo=p(0.05), hi=p(0.95), dur=buf[buf.length-1].t-buf[0].t;
    return {mid:(lo+hi)/2, med:p(0.5), span:hi-lo, lo:lo, hi:hi, dur:dur, wave:dur>=WAVE_DUR&&hi-lo>=WAVE_MIN};
  }
  /* one game frame. active: is tuning on (waiting for the start); st: the latest DSP2 result; shift(d): shifts DSP2's height scale.
     Returns an event for the setup log, or null */
  function step(T,dt,st,active,shift){
    if(!active){ T.buf=[]; T.ok=false; T.span=null; return null; }
    T.t+=dt; if(st&&st.present) T.buf.push({t:T.t,h:st.height});
    while(T.buf.length&&T.buf[0].t<T.t-WIN) T.buf.shift();
    T.acc+=dt; if(T.acc<STEP) return null; T.acc=0;
    var r=pick(T.buf); if(!r){ T.ok=false; return null; }
    var f0=T.field, k=(r.wave&&!T.ok)?1:A;              // v0.21: the step that catches the range lands fully — tuning stops right after it
    if(r.wave&&T.auto){ var F=r.span/((0.5-B)*2/(1+ASYM)+(TP-0.5)*2*ASYM/(1+ASYM)); F=Math.max(F_MIN,Math.min(F_MAX,F)); T.field+=(F-T.field)*k; }
    var cen=r.wave?r.lo+(0.5-B)*2*T.field/(1+ASYM):r.med, d=(cen-100)*-k;
    if(Math.abs(d)>0.2){ shift(d); T.buf.forEach(function(q){ q.h+=d; }); }
    T.ok=r.wave; T.span=r.span; T.last=r;
    if(Math.abs(d)>0.2||Math.abs(T.field-f0)>0.2) return {d:+d.toFixed(1),field:+T.field.toFixed(1),span:+r.span.toFixed(0),wave:r.wave};
    return null;
  }
  /* v1.08, the live mode (an experiment): in flight the screen keeps its bottom just above the palm's floor.
     v1.10 (the maintainer, 1 Oct): «часто было сложно опустить корабль вниз — ладонь уже упиралась в разъём» (18:01) and, the other way,
     «слишком далеко ладонь от телефона» (18:22). 1.08 moved the middle so that the lowest 5% of the palm's heights landed at 6% of the screen,
     as the waving does — but in flight the player follows the ship: pushing it against the bottom lowers those heights, the screen goes up,
     the player pushes lower (18:01 drifted 8 mm so; in its last half-minute the ship could not go under 12%); and with no waving the middle
     was where the palm happened to be in its first second (18:22: far — the whole game was played 3 cm farther than before). Now it is set by
     the echo's own range, which no moving of the screen changes, and by the phone's end: a palm at the port reads ~45 mm of range in every
     game of 1 Oct (iPhone, Mi 9 Lite; 47–48 in the iPhone games of 27 Sep). «The palm at 48 mm», turned into a height the way the last 10 s
     turned ranges into heights (the median of height − k·range), is kept 2–14 mm under the bottom of the screen: too high — the screen
     comes down, too low — up; 3 mm a second in the first 15 s, then 1. The palm's own lowest point is not used: the player follows the ship,
     so it is always just under the bottom, wherever the bottom is */
  var L_WIN=10, L_MIN=5, L_STEP=0.5, L_LO=-14, L_HI=-2, L_MID=-8, R_FLOOR=48;
  function stepLive(T,dt,st,shift,k){ k=k||1.4;
    if(!T.lb){ T.lb=[]; T.lt=0; T.la=0; T.ln=0; }
    T.lt+=dt; if(st&&st.present&&typeof st.range==='number'){ T.lb.push({t:T.lt,o:st.height-k*st.range}); T.ln+=dt; }
    while(T.lb.length&&T.lb[0].t<T.lt-L_WIN) T.lb.shift();
    T.la+=dt; if(T.la<L_STEP) return null; T.la=0;
    if(T.ln<L_MIN||T.lb.length<30) return null;
    var o=T.lb.map(function(q){return q.o;}).sort(function(a,b){return a-b;})[T.lb.length>>1];
    var h0=100-T.field/(1+ASYM), e=o+k*R_FLOOR-h0;   // where the palm's floor reads, against the bottom
    if(e>=L_LO&&e<=L_HI) return null;
    var v=(T.ln<15?3:1)*L_STEP, d=Math.max(-v,Math.min(v,L_MID-e));
    shift(d); T.lb.forEach(function(q){ q.o+=d; });
    return {d:+d.toFixed(2),floor:+e.toFixed(1)};
  }
  return {create:create,fracOf:fracOf,pick:pick,step:step,stepLive:stepLive,ASYM:ASYM};
})();
if(typeof module!=='undefined') module.exports=Tune;
