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
  /* v1.12: T.fl — the live mode's own travel for the lower half */
  function fracOf(T,h){ var FL=T.fl||2*T.field/(1+ASYM), FU=2*ASYM*T.field/(1+ASYM); return Math.max(0,Math.min(1,h<100?0.5+(h-100)/FL:0.5+(h-100)/FU)); }
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
  /* v1.08, the live mode (auto-calibration since 1.12): in flight the palm plays at a comfortable distance and still gets to the bottom.
     The maintainer, 1 Oct: «сложно опустить корабль вниз — ладонь уже упиралась в разъём» (18:01, and 1.10 at 18:59), «слишком далеко
     ладонь от телефона» (18:22), and on 1.11 (19:41): «рука теперь не доходит до разъёма, но приходится махать слишком далеко от телефона…
     надо какой-то компромисс». 1.11 only moved the whole screen: down when the ship would not reach the bottom with the palm at the port, up
     when it reached it with the palm far — and the two fought (19:41: 112 steps up, 125 down), the palm's middle stayed at 10 cm. Near the
     phone the height reads higher than the palm's distance says (the sonar sees the palm weaker there): the lower half of the screen needs
     more travel than the upper — moving the whole screen down for it takes the middle away from the phone.
     Now two separate things, both by the echo's own range (which no moving of the screen changes):
     the middle — the palm's median range over the last minute is kept at 7.2–8.8 cm (the games the maintainer had no complaint about the distance: 7.4–8.3; too far:
     10.2–10.5): the whole screen moves 0.5 mm a second (1 when it is over a centimetre out);
     the lower half (over the last 20 s) — the palm at the phone's end (within 4 mm of range of the closest it came in the last minute, under 58 mm) while the
     ship is clearly not at the bottom (over 8% of the screen): the lower half gets more sensitive (its travel 1 mm shorter a second, down to
     60% of the waving's; it starts at 80%);
     the ship at the bottom while the palm is still ~1.5 cm above the port: less (back up to 120%). The middle does not move for it */
  var L_WIN=20, L_RWIN=60, L_MIN=3, L_STEP=0.5, R_NEAR=4, R_CAP=58, R_FAR=62, L_N=10, F_PORT=0.08, R_MID0=72, R_MID1=88, FL_START=0.8, FL_MIN=0.6, FL_MAX=1.2;
  function stepLive(T,dt,st,shift){
    if(!T.lb){ T.lb=[]; T.rb=[]; T.lt=0; T.la=0; T.ln=0; }
    T.lt+=dt; if(st&&st.present&&typeof st.range==='number'){ T.lb.push({t:T.lt,h:st.height,r:st.range}); T.rb.push({t:T.lt,r:st.range}); T.ln+=dt; }
    while(T.lb.length&&T.lb[0].t<T.lt-L_WIN) T.lb.shift();
    while(T.rb.length&&T.rb[0].t<T.lt-L_RWIN) T.rb.shift();
    T.la+=dt; if(T.la<L_STEP) return null; T.la=0;
    if(T.ln<L_MIN||T.lb.length<L_N) return null;
    var med=function(a){ a.sort(function(x,y){return x-y;}); return a[a.length>>1]; };
    var fl0=2*T.field/(1+ASYM); if(!T.fl) T.fl=FL_START*fl0;
    var rs=T.rb.map(function(q){ return q.r; }).sort(function(x,y){return x-y;}), rPort=Math.min(R_CAP,rs[Math.floor(0.01*(rs.length-1))]+R_NEAR);   // the closest the palm came in the last minute — but no phone's end reads over ~57 mm
    var atPort=T.lb.filter(function(q){ return q.r<=rPort; }).map(function(q){ return fracOf(T,q.h); }),
        atBot=T.lb.filter(function(q){ return fracOf(T,q.h)<=0.02; }).map(function(q){ return q.r; }), rMed=rs[rs.length>>1];   // the middle over the last minute: 20 s swing with the game's demands
    var fPort=atPort.length>=L_N?med(atPort):null, rBot=atBot.length>=L_N?med(atBot):null, v=0.5*L_STEP, d=0, dfl=0;
    if(rMed>R_MID1+10||rMed<R_MID0-10) v*=2;                                  // far out of it: 1 mm a second
    if(rMed>R_MID1) d=v; else if(rMed<R_MID0) d=-v;                         // the middle: too far — the screen up (the palm comes closer), too near — down
    if(fPort!==null&&fPort>F_PORT) dfl=-Math.min(L_STEP,T.fl-FL_MIN*fl0); else if(rBot!==null&&rBot>R_FAR) dfl=Math.min(L_STEP,FL_MAX*fl0-T.fl);
    if(d){ shift(d); T.lb.forEach(function(q){ q.h+=d; }); }
    if(dfl) T.fl+=dfl;
    return d||dfl?{d:d,fl:+T.fl.toFixed(1),mid:+rMed.toFixed(0),port:fPort===null?null:+fPort.toFixed(2),bottom:rBot===null?null:+rBot.toFixed(0)}:null;
  }
  return {create:create,fracOf:fracOf,pick:pick,step:step,stepLive:stepLive,ASYM:ASYM};
})();
if(typeof module!=='undefined') module.exports=Tune;
