/* ── PALM CLOCK (1.59l): the palm's height in time, not in bunches — for SonaFly and SonaRace (SonaPong has its own, src/16_pong_ctl.js
   palmAt, 1.59e). The sonar's frames are 10.7 ms apart, but a phone may hand them over in bunches: the Mi 9 Lite gives two at once every
   21 ms, and a game that takes «the latest height» each 60 Hz step sees the palm stand still on about a quarter of its steps and jump
   twice as far on the next (Den's SonaFly log 22:50: the ship stood on 28% of the frames). Each frame's height is kept with its place on
   the sonar's own clock (its number × the frame's length); that clock is tied to the screen's by how late the frames arrive (the 90th
   percentile of the last second's lateness), and a step takes the height at its own time — between two frames, in proportion. Nothing is
   smoothed: the palm's path is the same, only on time; where frames come one by one (the iPhone) next to nothing changes.
   Pure: no clock of its own — the times are passed in (ms). ── */
var PalmClock=(function(){
  function create(){ return {k:0,tl:[],lag:null,T:null}; }
  /* every sonar frame (whatever it carries): its number counts on */
  function tick(c){ return c.k++; }
  /* a frame's height (mm) that arrived at «now» (ms); N, fs — the frame's size and the rate */
  function push(c,k,h,now,N,fs){ var T=1000*N/fs; c.T=T; c.tl.push({k:k,a:now,l:now-k*T,h:h});
    while(c.tl.length>2&&c.tl[0].a<now-1000) c.tl.shift();
    var ls=c.tl.map(function(q){ return q.l; }).sort(function(p,q){ return p-q; }); c.lag=ls[Math.min(ls.length-1,Math.floor(ls.length*0.9))]; }
  /* the height at «now» (ms) on the screen's clock; null when none is kept */
  function at(c,now){ var tl=c.tl, n=tl.length, i; if(!n||c.lag===null||c.T===null) return null;
    var kf=(now-c.lag)/c.T;
    if(kf>=tl[n-1].k) return tl[n-1].h; if(kf<=tl[0].k) return tl[0].h;
    for(i=n-1;i>0&&tl[i-1].k>kf;i--);
    var p=tl[i-1], q=tl[i]; return p.h+(q.h-p.h)*(kf-p.k)/(q.k-p.k); }
  function reset(c){ c.tl=[]; c.lag=null; }
  return {create:create,tick:tick,push:push,at:at,reset:reset};
})();
if(typeof module!=='undefined') module.exports=PalmClock;
