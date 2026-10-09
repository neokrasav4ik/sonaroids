/* ── WAVE TUNING (from the lab, 24 Sep): while the game waits for the start, the player waves the palm in the 5–15 cm range (4–12 in v0.22–0.25)
   and the ship follows. The last 6 s of palm heights are used: their 5th and 95th percentiles land on 6% and 90% of the screen;
   the whole screen covers 50–120 mm of palm travel. Steps every 0.25 s, each 35% of the way. Frozen from the countdown to game over.
   The screen was not linear until 1.59m: below the middle it was stretched ASYM=1.7 times (near the table the sonar saw motion weaker); now even.
   Pure module: no DOM, tested in Node. ── */
var Tune=(function(){
  /* v0.21 (25 Sep, iPhone game 00:44 "harder to steer, hardest to go down"): the field had grown to the 150 mm cap — the player waved
     wide on the new try-out screen, and the whole screen then took 15 cm of palm travel; in flight the palm went down to only 15% of the
     screen. Now at most 120 mm, and the lowest waved point lands on 6% of the screen (was 10%) */
  /* 1.59m: ASYM 1.7 → 1, the screen even (Den 23:35, iPhone, by hand and auto-calibration alike: «неравномерность.. мешает»). The 1.7
     came from the lab on 24 Sep (near the table the sonar saw motion weaker); the processing has changed a lot since (the wide probe,
     the phase by parts of a frame) — to be judged by hand; if the bottom turns sluggish, a middle value (1.3) is next */
  var ASYM=1, WIN=6, STEP=0.25, A=0.35, B=0.06, TP=0.90, F_MIN=50, F_MAX=120;
  var WAVE_DUR=5;        // s: waving must go on this long before the range counts as caught (v0.10: was 1.5 s — too quick to get oriented)
  var WAVE_MIN=50;       // mm: a range counts as waved from 5 cm (was 3 cm; 24 Sep a small wiggle after a game shrank the field to 66 mm and the ship got twitchy)
  /* opt.soft (lab, 8 Oct, Den: «после настройки и на старте платформы немного смещаются и перестраиваются»): while waving, the middle and
     the field already follow the waved range (lowest point on 6%) in 35% steps once it spans 5 cm — not the median — so the step that
     catches the range is small instead of a ~3 cm jump. The game does not pass it: unchanged. */
  function create(field,auto,opt){ return {buf:[],t:0,acc:0,span:null,ok:false,field:field||100,auto:auto!==false,last:null,soft:!!(opt&&opt.soft)}; }
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
    var f0=T.field, k=(r.wave&&!T.ok)?1:A, pre=T.soft&&!r.wave&&r.span>=WAVE_MIN;              // v0.21: the step that catches the range lands fully — tuning stops right after it
    if((r.wave||pre)&&T.auto){ var F=r.span/((0.5-B)*2/(1+ASYM)+(TP-0.5)*2*ASYM/(1+ASYM)); F=Math.max(F_MIN,Math.min(F_MAX,F)); T.field+=(F-T.field)*k; }
    var cen=(r.wave||pre)?r.lo+(0.5-B)*2*T.field/(1+ASYM):r.med, d=(cen-100)*-k;
    if(Math.abs(d)>0.2){ shift(d); T.buf.forEach(function(q){ q.h+=d; }); r.lo+=d; r.hi+=d; r.med+=d; r.mid+=d; }   /* 1.59m: the last pick kept in the heights as they are now (after the shift), as the buffer */
    T.ok=r.wave; T.span=r.span; T.last=r;
    if(Math.abs(d)>0.2||Math.abs(T.field-f0)>0.2) return {d:+d.toFixed(1),field:+T.field.toFixed(1),span:+r.span.toFixed(0),wave:r.wave};
    return null;
  }
  return {create:create,fracOf:fracOf,pick:pick,step:step,ASYM:ASYM};
})();
if(typeof module!=='undefined') module.exports=Tune;
