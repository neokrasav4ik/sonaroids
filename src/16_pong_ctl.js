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
    lin:null,hold:null,k:0,tl:[],lag:null,mxMap:null}; }
  /* one DSP2 frame (r: its result; N, fs: the frame's size and rate; calS: DSP2's scale cal.s; counting: the countdown before play — the
     offset is learnt there only if the holds gave none). Returns the mix, or null while no palm is seen */
  function frame(c,r,N,fs,calS,counting,now){
    var k=c.k++; if(!r) return c.mix; c.present=!!r.present; if(r.present){ c.height=r.height; c.abs=r.abs; }
    if(!r.present||r.height===null) return c.mix;
    if(now!==undefined&&now!==null) tlPush(c,k,now,N,fs);
    var F=r.fast*(calS||1), a=1-Math.exp(-N/(TAU*fs));
    var base=r.height; if(r.abs!==null&&r.abs!==undefined){ var dd=r.height-r.abs;
      if(c.mxMap){ base=c.mxMap.h0+(r.abs-c.mxMap.a0)*c.mxMap.g; }
      else if(c.mxCal!==null){ c.mxOff=c.mxCal; base=r.abs+c.mxOff; }
      else if(counting) c.mxOff=c.mxOff===null?dd:c.mxOff+(1-Math.exp(-N/(TAU_OFF*fs)))*(dd-c.mxOff);
      else if(c.mxOff!==null) base=r.abs+c.mxOff; }
    /* the mix = the phase + a slow correction (the echo's place − the phase), smoothed over 3 s. 1.59c: the correction follows a steady
       drift too (a level and its trend — a double exponential), it no longer lags behind it: the phase can creep a few mm a second, and
       at Den's 19:41 game 23 mm/s — a plain 3-s smoothing lagged 3 s × the creep behind = the rackets 7 cm above the palm («опять тянет
       ладонь вниз»). In the lab the creep was 2–4 mm/s downwards — the rackets sat 1–1.5 cm low. With no creep it is the 1.59 mix */
    var d=base-F; if(c.mxH===null){ c.mxH=d; c.mxF=d; c.mxOff=c.mxCal!==null?c.mxCal:c.mxOff; }
    c.mxH+=a*(d-c.mxH); c.mxF+=a*(c.mxH-c.mxF); c.mix=F+2*c.mxH-c.mxF; if(c.tl.length) c.tl[c.tl.length-1].m=c.mix; return c.mix; }
  /* 1.59e — the palm in time, not in bursts. The sonar's frames are 10.7 ms apart, but a phone may hand them over in bunches: the
     Mi 9 Lite gives two at once every 21 ms (Den 20:55: «ракетки ходят не плавно, а иногда рывками» — in his log the palm stood still
     on 22% of the frames and jumped twice as far on the next). Each frame's mix is kept with its place on the sonar's own clock (its
     number × 10.7 ms); the sonar's clock is tied to the screen's by how late the frames arrive (the 90th of the last second's lateness),
     and the rackets take the palm at «now» on that clock — between two frames, in proportion. That costs the bunch's spread (~10 ms on
     the Mi 9 Lite, next to nothing where the frames come evenly) and nothing else: no smoothing, the palm's path is the same */
  function tlPush(c,k,now,N,fs){ var T=1000*N/fs; c.tl.push({k:k,a:now,l:now-k*T,m:null});
    while(c.tl.length>2&&c.tl[0].a<now-1000) c.tl.shift();
    var ls=c.tl.map(function(q){ return q.l; }).sort(function(p,q){ return p-q; }); c.lag=ls[Math.min(ls.length-1,Math.floor(ls.length*0.9))]; c.T=T; }
  function palmAt(c,now){ var tl=c.tl, n=tl.length; if(!n||c.lag===null||now===undefined||now===null) return palm(c);
    var kf=(now-c.lag)/c.T, i;
    if(tl[n-1].m===null) n--; if(n<=0) return palm(c);
    if(kf>=tl[n-1].k) return tl[n-1].m; if(kf<=tl[0].k) return tl[0].m;
    for(i=n-1;i>0&&tl[i-1].k>kf;i--);
    var p=tl[i-1], q=tl[i]; if(p.m===null||q.m===null) return q.m!==null?q.m:palm(c);
    return p.m+(q.m-p.m)*(kf-p.k)/(q.k-p.k); }
  /* the calibration: start, then hold() every frame (t — seconds). Returns {step:1|2, k:0…5 dots, caught:'low'|'top'|null, done} */
  function start(c){ c.hold={step:1,buf:[],k:-1,hb:null,dd:[],lo:null}; c.mxMap=null; }
  function hold(c,t){ var H=c.hold; if(!H) return {done:true,step:0,k:0,caught:null};
    var h=c.height, res={step:H.step,k:0,caught:null,done:false};
    if(c.present&&h!==null&&h!==undefined) H.buf.push({t:t,h:h,a:(c.abs===undefined?null:c.abs)});
    while(H.buf.length&&H.buf[0].t<t-WIN) H.buf.shift();
    var mn=1e9, mx=-1e9, held=0, i; for(i=H.buf.length-1;i>=0;i--){ mn=Math.min(mn,H.buf[i].h); mx=Math.max(mx,H.buf[i].h); if(mx-mn>TOL) break; held=H.buf[H.buf.length-1].t-H.buf[i].t; }
    res.k=Math.max(0,Math.min(5,Math.floor(held/NEED*5+0.0001))); if(H.step===2&&h!==null&&h!==undefined&&h<=H.hb+MINR) res.k=0;
    if(H.buf.length<20||H.buf[H.buf.length-1].t-H.buf[0].t<NEED) return res;
    var hs=H.buf.map(function(q){ return q.h; }).sort(function(p,q){ return p-q; }), lo=hs[Math.floor(hs.length*0.1)], hi=hs[Math.floor(hs.length*0.9)], med=hs[hs.length>>1];
    if(hi-lo>TOL) return res;
    var wa=H.buf.filter(function(q){ return q.a!==null&&q.a!==undefined; }), dds=wa.map(function(q){ return q.h-q.a; }),
      ma=wa.length>=10?medOf(wa.map(function(q){ return q.a; })):null, mh=wa.length>=10?medOf(wa.map(function(q){ return q.h; })):null;
    if(H.step===1){ H.dd=dds; H.hb=med; H.lo=ma===null?null:{a:ma,h:mh}; H.step=2; H.buf=[]; c.lin={b:med,t:med+100}; res.caught='low'; res.step=2; res.k=0; return res; }
    if(med>H.hb+MINR){ var top=Math.min(H.hb+MAXR,med); c.lin={b:H.hb,t:top}; H.dd=H.dd.concat(dds);
      if(H.dd.length>=20){ var sd=H.dd.slice().sort(function(p,q){ return p-q; }); c.mxCal=sd[sd.length>>1]; c.mxOff=c.mxCal; c.mxH=null; }
      /* 1.59i: the echo's scale too, from the two holds — the echo's place is turned into the phase's millimetres by a line through both:
         at each hold the slow part then sits exactly where the phase put the palm. Den's Mi 9 Lite: its echo moves 1.8–2.4 mm per mm of
         the phase (six games 20:28–22:20; the iPhone 1.0–1.3); with an offset only, a palm that moved and stayed was followed at once by
         the phase and then, over ~3 s, carried on as far again by the echo — the rackets slid off («поначалу калибровка опять уводила
         ладонь вниз»). Taken only when the holds are far enough apart on the echo too (15 mm) and the scale is sane (0.3–2) */
      c.mxMap=null; if(H.lo&&ma!==null&&Math.abs(ma-H.lo.a)>=15){ var g=(mh-H.lo.h)/(ma-H.lo.a); if(g>=0.3&&g<=2) c.mxMap={a0:H.lo.a,h0:H.lo.h,g:g}; }
      c.hold=null; res.caught='top'; res.done=true; }
    return res; }
  function medOf(v){ v=v.slice().sort(function(p,q){ return p-q; }); return v[v.length>>1]; }
  function holding(c){ return !!c.hold; }
  function lowStep(c){ return !!c.hold&&c.hold.step===1; }
  /* the palm (a height in mm, the mix) → the share of the calibrated travel that the rules take (0.08 at the low hold, 0.75 at the top) */
  function frac(c,h){ if(!c.lin||h===null||h===undefined) return null; return CB+(CT-CB)*(h-c.lin.b)/Math.max(30,c.lin.t-c.lin.b); }
  /* what the rackets follow now: the mix, or the height before the mix has started */
  function palm(c){ return c.mix!==null?c.mix:c.height; }
  return {create:create,frame:frame,palmAt:palmAt,start:start,hold:hold,holding:holding,lowStep:lowStep,frac:frac,palm:palm,CB:CB,CT:CT,TOL:TOL};
})();
if(typeof module!=='undefined') module.exports=PongCtl;
