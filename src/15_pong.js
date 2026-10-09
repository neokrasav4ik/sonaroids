/* ── PONG CORE (SonaPong, v1.59): one palm moves two rackets, the ball flies between them; the game itself, without drawing.
   Deterministic like the flight and race cores (src/13_core.js, src/14_race.js): a fixed 60 Hz step, a seeded integer RNG, only + − × ÷
   and sqrt (the bounce angles' tangents are numbers written out below, not Math.tan) — so a server can later replay a game from its palm
   trajectory.
   The world is the lab's «endless» world for balance (lab/src/087_arcade.js 1.58z19–z24, PG_SL + PG_BALW.endless, found with the
   maintainer 8–9 Oct, lab/tools/sim/pong_world.py and pong_endless.py):
   - two rackets at the screen's edges, each in the middle of its half of the field; one palm moves both up and down — the racket's travel
     is strictly proportional to the palm (from the two calibration holds: the low hold → 8% of the travel, the top hold → 75%);
   - the rackets are bowls (drawn a little concave), «grippy»: the ball leaves strictly along the racket's slope at the hit point, its speed
     the bounce plus the part of the swing along the slope. The slope's angle changes along the racket: 36° from the vertical at the
     field's edge, 26° in the middle, 23° at the gap — an even swing from anywhere sends the ball to the other racket's middle;
   - the serve: the ball appears in a random top corner and flies on a high arc to the middle of the other racket; that racket meets it as
     if it fell from the top of an ordinary pass (the same swing — the same strength as in play);
   - points for a pass: for the arc's height from the hit point, as a share f of the room from the calibrated low to the ceiling:
     100·f³, and above 70% a «hill» up to +200 (300 at the ceiling); a pass that touched the ceiling scores nothing and restarts the series;
   - the series: +10% for every clean pass in a row, up to ×1.5;
   - the rackets narrow every 30 s by 1/8 of their width, without end; the multiplier for narrow rackets — up to ×2;
   - 5 balls; the game is over when they are all lost.
   Units: the screen's height is 1, its width is ar (the aspect ratio); y grows downwards (0 — the top). ── */
var Pong=(function(){
  var DT=1/60;
  var TUNE={G:1.8, HIT:0.6, E:0.6, STICK:0.25,
    HWR:0.8,                       // the rackets' width at the start: 80% of their half of the field
    XC:0.25,                       // a racket's middle: a quarter of the field from its edge
    T_MID:0.48773258856586144,     // tan 26° — the bounce at the racket's middle (from the vertical)
    T_OUT:0.72654252800536079,     // tan 36° — at the field's edge
    T_IN:0.42447481620960470,      // tan 23° — at the gap
    CUP:0.06, KV:0.9,              // the bowl: the field's edge 0.06 higher than the middle, the gap side a little lower
    LIFT:0.10, PAD_LO:0.94, PAD_MIN:0.3, PAD_MAX:0.97, CB:0.08, CT:0.75, R:0.032, TOP:0.03, CEIL_BACK:0.35,
    SENS:[0.3,0.4,0.5,0.6],        // the racket's travel, screen heights: «low», «below middle», «middle», «high» sensitivity
    NARROW_T:30, NARROW_K:0.875, MULT_CAP:2, SERIES:0.1, SERIES_N:5, LIVES:5,
    WAIT:0.8, RESPAWN0:0.3, RESPAWN:0.6, HILL:0.7, HILL_W:0.3, HILL_PTS:200};   // the hill: from 70% of the height, over the last 0.3
  function rng(seed){ var a=seed>>>0; return function(){ a=(a+0x6D2B79F5)>>>0; var t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
  function clamp(v,a,b){ return v<a?a:v>b?b:v; }
  /* the rackets' half-width now (narrowed by k) */
  function hwOf(g){ return Math.max(0.03,Math.min(g.ar*(TUNE.HWR/4)*g.k,g.ar/4-0.09)); }
  /* the racket surface under x: u — across the racket (−1 … 1), ui — the same from the field's edge (−1) to the gap (+1), f — how the
     slope's tangent compares with the middle's, y — the surface's height (the bowl's shape added to the racket's place) */
  function surf(g,i,x){ var s=i?-1:1, xc=g.ar*(i?1-TUNE.XC:TUNE.XC), hw=g.hw, u=(x-xc)/hw, ui=s*u, A=TUNE.CUP/(1+TUNE.KV/2), kv=TUNE.KV,
      yr=A*(ui-kv*ui*ui/2), f, D=g.ar/2, tc=TUNE.T_MID, hc=D/(4*tc), H1=hc;
    var law=function(uu,yy){ var H0=Math.max(0.02,hc+yy); return ((D-uu*hw)/(2*H0+2*Math.sqrt(H0*H1)))/tc; };
    if(ui<0){ var ym=A*(-1-kv/2); f=law(ui,yr)+(-ui)*(TUNE.T_OUT/tc-law(-1,ym)); }
    else { var H0=Math.max(0.02,hc+yr); f=((D-ui*hw)/(2*H0+2*Math.sqrt(H0*H1)))/tc;
      if(ui>0){ var y1=A*(1-kv/2), H01=Math.max(0.02,hc+y1), f1=((D-hw)/(2*H01+2*Math.sqrt(H01*H1)))/tc; f+=ui*(TUNE.T_IN/tc-f1); } }
    return {u:u,s:s,ui:ui,f:f,xc:xc,y:g.py-TUNE.LIFT+yr}; }
  /* the palm → the rackets' place: hand is the palm as a share of the calibrated travel (0.08 at the low hold, 0.75 at the top one) */
  function padOf(g,hand){ return Math.max(TUNE.PAD_MIN,Math.min(TUNE.PAD_MAX,TUNE.PAD_LO-hand*g.H)); }
  function create(seed,ar,sens){
    var H=TUNE.SENS[sens===undefined||sens===null?1:sens]||TUNE.SENS[1];
    var g={seed:seed>>>0,ar:ar||2.16,H:H,rand:rng(seed),n:0,t:0,state:'play',score:0,lives:TUNE.LIVES,falls:0,passes:0,tosses:0,ceils:0,
      series:0,streak:0,best:0,bestPts:0,k:1,step:0,py:TUNE.PAD_LO-0.5*H,padPrev:null,vpS:0,vr:0,vpb:0,ball:null,respawn:TUNE.RESPAWN0,events:[],fx:[]};
    g.hw=hwOf(g); return g; }
  function mult(g){ var w=g.hw/(g.ar/4); return 1/Math.max(1/TUNE.MULT_CAP,Math.min(1,w)); }
  function ptsOf(f){ var v=100*(f*f*f); if(f>TUNE.HILL){ var x=(f-TUNE.HILL)/TUNE.HILL_W; v+=TUNE.HILL_PTS*x; } return v; }
  function spawn(g){ var s=g.rand()<0.5?0:1, b={x:0,y:0,vx:0,vy:0,r:TUNE.R,on:false,onI:-1,from:null,to:s?0:1,wait:TUNE.WAIT,peakY:null,y0:null,touched:false,sk:0};
    b.x=s?g.ar-b.r-0.03:b.r+0.03; b.y=TUNE.TOP+b.r+0.07; g.ball=b; g.events.push('serve'); g.fx.push({serve:s?'right':'left'}); }
  function serveGo(g,b){ var tx=g.ar*(b.to?1-TUNE.XC:TUNE.XC), ty=surf(g,b.to,tx).y-b.r, ya=TUNE.TOP+b.r+0.012, y0=b.y;
    var vy0=-Math.sqrt(2*TUNE.G*Math.max(0.001,y0-ya)), tu=-vy0/TUNE.G, td=Math.sqrt(2*Math.max(0.01,ty-ya)/TUNE.G); b.vy=vy0; b.vx=(tx-b.x)/(tu+td);
    var hcS=(g.ar/2)/(4*TUNE.T_MID); b.sk=Math.sqrt(Math.min(1,hcS/Math.max(0.01,ty-ya))); g.events.push('go'); }
  function points(g,b){ if(b.touched||b.peakY===null) return; var lvl0=TUNE.PAD_LO-TUNE.CB*g.H-TUNE.LIFT-b.r, room=lvl0-(TUNE.TOP+b.r), h=(b.y0===null?g.py-TUNE.LIFT-b.r:b.y0)-b.peakY;
    var f=Math.max(0,Math.min(1,h/room)), m=mult(g)*(1+TUNE.SERIES*Math.min(TUNE.SERIES_N,g.series)), p=Math.round(ptsOf(f)*m); if(p<1) return;
    g.score+=p; if(p>g.bestPts) g.bestPts=p; g.events.push('pts'); g.fx.push({pts:p,mult:m,f:f,x:b.x,y:b.y}); }
  function lose(g,b){ g.falls++; g.lives=Math.max(0,TUNE.LIVES-g.falls); g.streak=0; g.series=0; g.ball=null; g.respawn=TUNE.RESPAWN; g.events.push('lost'); g.fx.push({lost:b.x});
    if(g.falls>=TUNE.LIVES){ g.state='over'; g.events.push('over'); } }
  /* one fixed step. hand: the palm as a share of the calibrated travel (see padOf), or null when no palm is seen (the rackets stay) */
  function step(g,hand){
    g.events=[]; g.fx=[]; if(g.state==='over') return g;
    g.n++; g.t=g.n*DT;
    if(hand!==null&&hand!==undefined) g.py=padOf(g,hand);
    var st=Math.floor(g.t/TUNE.NARROW_T); while(g.step<st){ g.step++; g.k*=TUNE.NARROW_K; g.events.push('narrow'); }
    g.hw=hwOf(g);
    var pad=g.py, vr=g.padPrev===null?0:(pad-g.padPrev)/DT; g.padPrev=pad; g.vr=vr;
    g.vpS+=(clamp(vr,-4,4)-g.vpS)*0.45; var vpb=g.vpS*(0.6/g.H)*TUNE.HIT; g.vpb=vpb;
    if(!g.ball){ g.respawn-=DT; if(g.respawn<=0) spawn(g); }
    var b=g.ball; if(!b) return g;
    if(b.wait>0){ b.wait-=DT; if(b.wait<=0) serveGo(g,b); return g; }
    var was=b.on, py0=b.y; b.vy+=TUNE.G*DT; b.x+=b.vx*DT; b.y+=b.vy*DT; b.on=false; if(b.peakY!==null&&b.y<b.peakY) b.peakY=b.y;
    if(b.y-b.r<TUNE.TOP&&b.vy<0){ b.y=TUNE.TOP+b.r; b.vy=-b.vy*TUNE.CEIL_BACK; b.touched=true; g.ceils++; g.events.push('ceil'); }
    for(var i=0;i<2;i++){ var S=surf(g,i,b.x);
      if(S.u<=1&&S.u>=-1){ var top=S.y-b.r;
        if(b.y>top&&b.y<top+0.12&&py0<=top-vr*DT+0.01){ var sl=S.s*(TUNE.T_MID*g.hw)/g.hw*S.f, nl=Math.sqrt(sl*sl+1), nx=sl/nl, ny=-1/nl, sk=b.sk||1, rx=b.vx*sk, ry=b.vy*sk-vpb, vn=rx*nx+ry*ny;
          b.y=top; b.sk=0;
          if(vn<0){ var un=(-vn>TUNE.STICK?-TUNE.E*vn:0)+vpb*ny; if(-vn>0.5){ g.events.push('land'); g.fx.push({land:i,v:-vn}); } b.vx=un*nx; b.vy=un*ny; }
          b.on=true; b.onI=i;
          if(b.from!==i){ if(b.from!==null){ points(g,b);
              if(b.touched){ g.series=0; g.events.push('dull'); } else { g.series++; g.events.push('pass'); }
              g.passes++; g.streak++; if(g.streak>g.best) g.best=g.streak; }
            b.from=i; } } } }
    if(was&&!b.on&&b.vy<-0.5){ var sp=Math.sqrt(b.vx*b.vx+b.vy*b.vy); b.touched=false; b.peakY=b.y; b.y0=b.y; g.tosses++; g.events.push('toss'); g.fx.push({kick:b.onI,a:sp/1.2,vy:-b.vy}); }
    if(b.y>1.1||b.x<-0.15||b.x>g.ar+0.15) lose(g,b);
    return g; }
  /* the share of the start width the rackets have now, and how long till they narrow again */
  function width(g){ return TUNE.HWR*g.k; }
  function nextNarrow(g){ return (g.step+1)*TUNE.NARROW_T-g.t; }
  /* a whole game from a palm trajectory (one value per step; NONE or less — no palm; the palm itself may go a little below 0): what a server would run */
  var NONE=-9;
  function replay(seed,ar,sens,hands){ var g=create(seed,ar,sens); for(var i=0;i<hands.length&&g.state!=='over';i++) step(g,hands[i]===null||hands[i]<=NONE?null:hands[i]); return g; }
  var TAG='pong-1';
  return {NONE:NONE,TAG:TAG,TUNE:TUNE,DT:DT,create:create,step:step,replay:replay,surf:surf,padOf:padOf,hwOf:hwOf,mult:mult,ptsOf:ptsOf,width:width,nextNarrow:nextNarrow};
})();
if(typeof module!=='undefined') module.exports=Pong;
