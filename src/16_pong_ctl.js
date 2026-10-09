/* ── PONG CONTROL (SonaPong, v1.59): the palm → the rackets, moved from the lab (lab/src/087_arcade.js 1.57f–1.58z24) as it is.
   Not part of the rules (src/15_pong.js gets only the result — the palm as a share of the calibrated travel), so it may use exp.
   - The «mix» — what the rackets follow: the slow part from the echo's distance (DSP2 abs) plus an offset, smoothed over 3 s; the fast part
     from the phase only (DSP2 fast, by quarter frames — DSP2 'quarter' on), its deviation from its own 3-s smoothing. 1.59c: the smoothing
     follows a steady creep of the phase (see frame). No leads or filters
     beyond that: the racket is where the sonar sees the palm. (The lab's 14:49 «ruler» record: as the flight's height — a 1 s sweep 83%,
     jerks 36%; the mix — 90%, jerks 79%, drifts half as much.)
   - The calibration — two holds (1.58z2): «lower the palm to where you start hitting from below — hold», «raise it to a comfortable
     height — hold». A hold is caught when the palm stays within 14 mm (10–90% of its readings) for 1.1 s of the last 1.2 s; the top one
     must be at least 35 mm above the low one (at most 160). The low hold → 8% of the racket travel, the top one → 75%, straight between.
     While the low hold is being caught the rackets stay at the bottom (1.58z17); progress — five dots.
   - The mix's offset is learnt on the holds themselves, while the palm is still: the median of height − echo over both (1.58z24 — when it
     was learnt over the countdown, with the hand already moving, it missed by 2–3.5 cm in 3 of 5 of the maintainer's games, and the rackets
     «pulled the palm to the table»). ── */
var PongCtl=(function(){
  var TAU=3, TAU_OFF=1.5, CB=0.08, CT=0.75, TOL=14, WIN=1.2, NEED=1.1, MINR=35, MAXR=160;
  function create(){ return {mxH:null,mxF:null,mxOff:null,mxCal:null,mix:null,height:null,abs:null,present:false,
    lin:null,hold:null}; }
  /* one DSP2 frame (r: its result; N, fs: the frame's size and rate; calS: DSP2's scale cal.s; counting: the countdown before play — the
     offset is learnt there only if the holds gave none). Returns the mix, or null while no palm is seen */
  function frame(c,r,N,fs,calS,counting){
    if(!r) return c.mix; c.present=!!r.present; if(r.present){ c.height=r.height; c.abs=r.abs; }
    if(!r.present||r.height===null) return c.mix;
    var F=r.fast*(calS||1), a=1-Math.exp(-N/(TAU*fs));
    var base=r.height; if(r.abs!==null&&r.abs!==undefined){ var dd=r.height-r.abs;
      if(c.mxCal!==null){ c.mxOff=c.mxCal; base=r.abs+c.mxOff; }
      else if(counting) c.mxOff=c.mxOff===null?dd:c.mxOff+(1-Math.exp(-N/(TAU_OFF*fs)))*(dd-c.mxOff);
      else if(c.mxOff!==null) base=r.abs+c.mxOff; }
    /* the mix = the phase + a slow correction (the echo's place − the phase), smoothed over 3 s. 1.59c: the correction follows a steady
       drift too (a level and its trend — a double exponential), it no longer lags behind it: the phase can creep a few mm a second, and
       at Den's 19:41 game 23 mm/s — a plain 3-s smoothing lagged 3 s × the creep behind = the rackets 7 cm above the palm («опять тянет
       ладонь вниз»). In the lab the creep was 2–4 mm/s downwards — the rackets sat 1–1.5 cm low. With no creep it is the 1.59 mix */
    var d=base-F; if(c.mxH===null){ c.mxH=d; c.mxF=d; c.mxOff=c.mxCal!==null?c.mxCal:c.mxOff; }
    c.mxH+=a*(d-c.mxH); c.mxF+=a*(c.mxH-c.mxF); c.mix=F+2*c.mxH-c.mxF; return c.mix; }
  /* the calibration: start, then hold() every frame (t — seconds). Returns {step:1|2, k:0…5 dots, caught:'low'|'top'|null, done} */
  function start(c){ c.hold={step:1,buf:[],k:-1,hb:null,dd:[]}; }
  function hold(c,t){ var H=c.hold; if(!H) return {done:true,step:0,k:0,caught:null};
    var h=c.height, res={step:H.step,k:0,caught:null,done:false};
    if(c.present&&h!==null&&h!==undefined) H.buf.push({t:t,h:h,a:(c.abs===undefined?null:c.abs)});
    while(H.buf.length&&H.buf[0].t<t-WIN) H.buf.shift();
    var mn=1e9, mx=-1e9, held=0, i; for(i=H.buf.length-1;i>=0;i--){ mn=Math.min(mn,H.buf[i].h); mx=Math.max(mx,H.buf[i].h); if(mx-mn>TOL) break; held=H.buf[H.buf.length-1].t-H.buf[i].t; }
    res.k=Math.max(0,Math.min(5,Math.floor(held/NEED*5+0.0001))); if(H.step===2&&h!==null&&h!==undefined&&h<=H.hb+MINR) res.k=0;
    if(H.buf.length<20||H.buf[H.buf.length-1].t-H.buf[0].t<NEED) return res;
    var hs=H.buf.map(function(q){ return q.h; }).sort(function(p,q){ return p-q; }), lo=hs[Math.floor(hs.length*0.1)], hi=hs[Math.floor(hs.length*0.9)], med=hs[hs.length>>1];
    if(hi-lo>TOL) return res;
    var dds=H.buf.filter(function(q){ return q.a!==null&&q.a!==undefined; }).map(function(q){ return q.h-q.a; });
    if(H.step===1){ H.dd=dds; H.hb=med; H.step=2; H.buf=[]; c.lin={b:med,t:med+100}; res.caught='low'; res.step=2; res.k=0; return res; }
    if(med>H.hb+MINR){ var top=Math.min(H.hb+MAXR,med); c.lin={b:H.hb,t:top}; H.dd=H.dd.concat(dds);
      if(H.dd.length>=20){ var sd=H.dd.slice().sort(function(p,q){ return p-q; }); c.mxCal=sd[sd.length>>1]; c.mxOff=c.mxCal; c.mxH=null; }
      c.hold=null; res.caught='top'; res.done=true; }
    return res; }
  function holding(c){ return !!c.hold; }
  function lowStep(c){ return !!c.hold&&c.hold.step===1; }
  /* the palm (a height in mm, the mix) → the share of the calibrated travel that the rules take (0.08 at the low hold, 0.75 at the top) */
  function frac(c,h){ if(!c.lin||h===null||h===undefined) return null; return CB+(CT-CB)*(h-c.lin.b)/Math.max(30,c.lin.t-c.lin.b); }
  /* what the rackets follow now: the mix, or the height before the mix has started */
  function palm(c){ return c.mix!==null?c.mix:c.height; }
  return {create:create,frame:frame,start:start,hold:hold,holding:holding,lowStep:lowStep,frac:frac,palm:palm,CB:CB,CT:CT,TOL:TOL};
})();
if(typeof module!=='undefined') module.exports=PongCtl;
