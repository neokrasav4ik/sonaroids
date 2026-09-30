/* ── RACE CORE (SonaRace, v0.84): the race itself, without drawing. Deterministic like the flight core (src/13_core.js): a fixed 60 Hz
   step, a seeded integer RNG, only + − × ÷ and sqrt — so a server can later replay a race from its palm trajectory.
   Rules (agreed with the maintainer 29 Sep: «ладонь только рулит; машинка едет, обгоняет, собирает топливо»):
   - the road runs left to right and winds; the car stays at one place on the screen and the palm moves it up and down, like the ship;
   - the car drives by itself and speeds up to the top speed, which grows over the race; off the road it is half as fast, on the kerb a
     little slower, in a syrup puddle slower for a moment;
   - cars ahead go the same way, slower, and change lanes now and then; every one passed is +25; running into one costs most of the speed
     and some fuel, unless the gum bubble takes the knock;
   - fuel runs out by time; a soda bottle refills it; when it is empty the car rolls to a stop and the race is over;
   - gifts: the soda (fuel), the magnet (6 s: pulls coins and gifts in), the gum bubble (a shield for one knock, 12 s), candy coins
     (+10 each, lines of five, +50 for a whole line);
   - the score: metres driven + coins + cars passed. Harder over the race: faster, narrower road, more cars and puddles, fuel burns
     faster and sodas come less often.
   Field: FH = 180 units high (the palm's range, as in the flight), FW = 180 × aspect wide; 10 units = 1 metre. ── */
var Race=(function(){
  var DT=1/60, FH=180, MARGIN=FH*0.04, CAR_X=40, FOLLOW=0.48658, GLIDE=0.12;   // GLIDE: after the palm was lost (v0.91)          // the car follows the palm with the ship's 25 ms lag
  var CAR={hl:9,hw:4.6};                                                   // half the car's length and width (every car the same)
  var TUNE={V0:98,V1:200,VT:300, ACC:55, BRAKE:120, OFF:0.5, KERB:0.9, KERB_W:4, SYRUP:0.62, SYRUP_T:0.7,
    HW0:0.25*FH, HW1:0.185*FH, HWD:40000, FUEL:100, BURN0:2.0, BURN1:3.2, BURNT:360, SODA:30, CRASH_V:0.35, CRASH_FUEL:6, INV:1.1,
    SODA_GAP:[800,1050], SODA_GROW:40000, GIFT_GAP:[1600,2300], COIN_GAP:[330,620], CAR_GAP:[240,480], PUD_GAP:[520,980],
    MAGNET:6, BUBBLE:12, TURBO:5, TURBO_K:1.33, PASS:25, COIN:10, LINE:50};
  function rng(seed){ var a=seed>>>0; return function(){ a=(a+0x6D2B79F5)>>>0; var t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
  function rnd(g,a,b){ return a+g.rand()*(b-a); }
  function clamp(v,a,b){ return v<a?a:v>b?b:v; }
  /* how far into the race, 0 → 1: by distance for the road, by time for the pace */
  function farD(d){ return clamp(d/TUNE.HWD,0,1); }
  function farT(t){ return clamp(t/TUNE.VT,0,1); }
  /* v0.86 (the maintainer: «скорость пусть возрастает постепеннее, не сразу быстро»): slower at first and speeding up slowly, then faster —
     f^1.5 (by sqrt: exact on every engine): 92 at the start, ~100 at 1 min, ~120 at 2, ~140 at 3, ~170 at 4, 200 from 5 */
  /* v0.89 («скорость чуть пораньше начала развиваться… первую минуту скучновато»): half straight, half f^1.5 — 98 at the start, ~113 at
     1 min, ~130 at 2, ~150 at 3, ~175 at 4, 200 from 5 (0.86–0.88: 92, ~100, ~120, ~140, ~170) */
  function vmax(t){ var f=farT(t); return TUNE.V0+(TUNE.V1-TUNE.V0)*(f+f*Math.sqrt(f))/2; }
  function burn(t){ return TUNE.BURN0+(TUNE.BURN1-TUNE.BURN0)*clamp(t/TUNE.BURNT,0,1); }
  function density(t){ return 1+0.9*farT(t); }                              // cars and puddles: up to 1.9× as often
  /* the road: a middle line through key points every 90–200 units, joined by smoothstep (flat at each point — soft S-bends) */
  /* the road has its own random numbers: it is the same whichever way far ahead it is looked at (the drawing looks further than the rules) */
  function rr(g,a,b){ return a+g.roadRand()*(b-a); }
  function addKey(g){ var k=g.keys, p=k[k.length-1], dx=rr(g,90,200), hw=TUNE.HW0+(TUNE.HW1-TUNE.HW0)*farD(p.x)+rr(g,-4,4),
      lo=hw+10, hi=FH-hw-10, span=dx*0.32, c=clamp(p.c+rr(g,-span,span),lo,hi);
    if(g.straight>0){ g.straight--; c=p.c; }
    else if(g.roadRand()<0.12) g.straight=1+Math.floor(g.roadRand()*2);          // a straight now and then
    k.push({x:p.x+dx,c:c,hw:hw}); }
  function seg(g,x){ var k=g.keys, i=g.ki; while(i>0&&k[i].x>x) i--; while(i<k.length-2&&k[i+1].x<=x) i++; g.ki=i; return i; }
  function at(g,x){ while(g.keys[g.keys.length-1].x<=x+2) addKey(g); var i=seg(g,x), a=g.keys[i], b=g.keys[i+1], u=(x-a.x)/(b.x-a.x); u=clamp(u,0,1); var s=u*u*(3-2*u);
    return {c:a.c+(b.c-a.c)*s,hw:a.hw+(b.hw-a.hw)*s}; }
  function centre(g,x){ return at(g,x).c; }
  /* steering along the road: the palm (0 bottom … 1 top) → the place across the road; its range spans the road and OFFW units past each kerb */
  var OFFW=12;
  function offOf(g,x,hand){ var r=at(g,x); return (0.5-hand)*2*(r.hw+OFFW); }
  function steerY(g,x,hand){ var r=at(g,x); return clamp(r.c+(0.5-hand)*2*(r.hw+OFFW),MARGIN,FH-MARGIN); }
  function create(seed,FW,y0,steer,opt){
    var g={seed:seed>>>0,FW:FW||380,FH:FH,rand:rng(seed),n:0,t:0,state:'play',score:0,d:0,v:0,fuel:TUNE.FUEL,coins:0,passed:0,crashes:0,
      steer:steer==='road'?'road':'height',opt:optOf(opt),car:{x:CAR_X,y:FH/2,off:0,gap:0,glide:0,turbo:0,inv:0,rub:0,bubble:0,magnet:0,syrup:0,on:'road'},keys:[{x:-300,c:FH/2,hw:TUNE.HW0},{x:260,c:FH/2,hw:TUNE.HW0}],ki:0,straight:0,roadRand:rng((seed^0x5bd1e995)>>>0),
      cars:[],items:[],puddles:[],nextCar:420,nextSoda:900,nextGift:1500,bagI:0,bagAt:0,nextCoin:260,nextPud:1400,line:0,lines:{},lineN:0,kind:0,nextId:1,events:[],fx:[]};
    g.car.y=(y0===undefined||y0===null)?FH/2:clamp(y0,MARGIN,FH-MARGIN); g.car.off=g.car.y-at(g,g.car.x).c; g.v=TUNE.V0*0.55; return g; }   // y0: where the car starts (the palm at the start)
  /* what is at a place ahead: is it free of cars (for a new car or a gift) */
  function freeAt(g,x,o,dx,dy){ for(var i=0;i<g.cars.length;i++){ var c=g.cars[i]; if(c.x-x<dx&&x-c.x<dx&&c.o-o<dy&&o-c.o<dy) return false; } return true; }
  function lane(g,x){ var r=at(g,x), m=r.hw-CAR.hw-3; return rnd(g,-m,m); }
  function spawnAhead(g){ var far=g.d+g.FW+40, t=g.t, dn=density(t), x, o, i;
    while(g.nextCar<far){ x=g.nextCar; g.nextCar+=rnd(g,TUNE.CAR_GAP[0],TUNE.CAR_GAP[1])/dn/(g.opt.traffic||1); if(!(g.opt.traffic>0)) continue;   /* v0.93: traffic 0 — no cars */
      for(i=0;i<4;i++){ o=lane(g,x); if(freeAt(g,x,o,34,CAR.hw*2+4)) break; }
      if(i<4) g.cars.push({id:g.nextId++,x:x,o:o,to:o,v:vmax(t)*rnd(g,0.42,0.72),kind:(g.kind=(g.kind+1+Math.floor(g.rand()*5))%6),turnT:rnd(g,1.5,4)}); }
    while(g.nextSoda<far){ x=g.nextSoda; g.nextSoda+=rnd(g,TUNE.SODA_GAP[0],TUNE.SODA_GAP[1])*(1+g.d/TUNE.SODA_GROW); g.items.push({id:g.nextId++,type:'fuel',x:x,o:lane(g,x)}); }
    while(g.nextGift<far){ x=g.nextGift; g.nextGift+=rnd(g,TUNE.GIFT_GAP[0],TUNE.GIFT_GAP[1]); var k=g.rand(), gs=GIFTS.filter(function(q){ return g.opt.gifts[q[0]]; }), tw=0, a, N=g.opt.superN;   // v0.92: only the gifts switched on, in their shares
      /* v0.98: the super gift from a bag (the maintainer: «сделай, чтоб 1 из 6 гарантированно был суперпризом»): of every N gifts exactly one,
         at a random place among them — as often as before on average, but never a long run without it (at most 2N−2 others in a row) */
      if(N>0&&g.opt.gifts.tmagnet&&gs.length>1){ if(g.bagI===0) g.bagAt=Math.floor(g.rand()*N); var sup=g.bagI===g.bagAt; g.bagI=(g.bagI+1)%N;
        gs=sup?[['tmagnet',1]]:gs.filter(function(q){ return q[0]!=='tmagnet'; }); }
      gs.forEach(function(q){ tw+=q[1]; }); if(tw>0){ for(a=0;a<gs.length-1&&k*tw>=gs[a][1];a++) k-=gs[a][1]/tw; g.items.push({id:g.nextId++,type:gs[a][0],x:x,o:lane(g,x)}); } }
    while(g.nextCoin<far){ x=g.nextCoin; g.nextCoin+=rnd(g,TUNE.COIN_GAP[0],TUNE.COIN_GAP[1]); var ln=++g.line, o0=lane(g,x), o1=lane(g,x+64);
      g.lines[ln]=0; for(i=0;i<5;i++) g.items.push({id:g.nextId++,type:'coin',x:x+i*16,o:o0+(o1-o0)*i/4,line:ln}); }
    while(g.nextPud<far){ x=g.nextPud; g.nextPud+=rnd(g,TUNE.PUD_GAP[0],TUNE.PUD_GAP[1])/dn/(g.opt.puddles||1); if(g.t>12&&g.opt.syrup&&g.opt.puddles>0) g.puddles.push({id:g.nextId++,x:x,o:lane(g,x),r:rnd(g,6,9)}); } }
  /* v0.92, test switches (the maintainer: «наделай мне включателей и выключателей тех или иных условий, чтобы я поигрался — как лучше и
     играбельнее»): what a knock does, which gifts come, how many cars, how fast, fuel, syrup, the verge. Without opt — the tuned rules */
  var GIFTS=[['magnet',0.34],['bubble',0.34],['tbubble',0.19],['tmagnet',0.13]];
  /* v0.98, the rules of the game (the maintainer, 30 Sep, after a day of test switches: «правила игры делаем такими — достаточно сбалансированно»):
     a knock slows and costs fuel; magnet, bubble and the super gift (one in every 6 gifts); cars «some», puddles «few», speed «higher»; fuel used; the verge slows */
  var OPT0={crashSlow:true,crashFuel:true,gifts:{magnet:true,bubble:true,tbubble:false,tmagnet:true},traffic:1,speed:1.15,burn:true,syrup:true,offSlow:true,puddles:0.6,bubblePop:true,superN:6};
  function optOf(o){ var r={}, k; for(k in OPT0) r[k]=OPT0[k]; if(o) for(k in o) if(o[k]!==undefined) r[k]=o[k]; var gf={}; for(k in OPT0.gifts) gf[k]=(o&&o.gifts&&o.gifts[k]!==undefined)?!!o.gifts[k]:OPT0.gifts[k]; r.gifts=gf; return r; }
  function knock(g,c){ var s=g.car; if(s.inv>0) return;
    c.hit=true; c.v+=20;                                                    // the other car is pushed on a little
    if(s.bubble>0){ if(g.opt.bubblePop){ s.bubble=0; g.events.push('pop'); } else g.events.push('boing'); s.inv=0.6; return; }   /* v0.93: a bubble can keep for its whole time */
    if(g.opt.crashSlow) g.v*=TUNE.CRASH_V; if(g.opt.crashFuel) g.fuel=Math.max(0,g.fuel-TUNE.CRASH_FUEL); s.inv=TUNE.INV; g.crashes++; g.events.push('crash'); }
  /* side by side: a rub, not a crash — both cars are pushed apart and ours loses a little speed */
  function rub(g,c,dy){ var s=g.car, push=(2*CAR.hw-1-(dy<0?-dy:dy))/2+0.5, dir=dy<0?-1:1;
    s.y-=dir*push; c.o+=dir*push; c.to=c.o; if(s.rub<=0){ g.v*=0.85; g.events.push('rub'); } s.rub=0.4; }
  function take(g,p){ var s=g.car; p.dead=true; g.fx.push({pick:p.type,x:p.x-g.d,y:centre(g,p.x)+p.o});
    if(p.type==='fuel'){ g.fuel=Math.min(TUNE.FUEL,g.fuel+TUNE.SODA); g.events.push('fuel'); }
    else if(p.type==='magnet'){ s.magnet=TUNE.MAGNET; g.events.push('magnet'); }
    else if(p.type==='bubble'){ s.bubble=TUNE.BUBBLE; g.events.push('bubble'); }
    // v0.91 (the maintainer: «не хватает подарков „ускорение + защита“…»; «турбо + пузырь» and «турбо + магнит + пузырь», «турбо без пузыря не надо»):
    // a turbo — a third faster for 5 s — always comes with the gum bubble
    else if(p.type==='tbubble'||p.type==='tmagnet'){ s.turbo=TUNE.TURBO; s.bubble=Math.max(s.bubble,TUNE.BUBBLE); if(p.type==='tmagnet') s.magnet=TUNE.MAGNET; g.events.push('turbo'); }
    else { g.coins++; g.events.push('coin'); if(p.line&&++g.lines[p.line]===5){ delete g.lines[p.line]; g.lineN++; g.events.push('line'); } } }
  /* one fixed step. hand: palm position as a screen fraction from the bottom (0…1), or null when no palm is seen */
  function step(g,hand){
    g.events=[]; g.fx=[]; if(g.state==='over') return g;
    g.n++; g.t=g.n*DT;
    var s=g.car, i, c, p, dx, dy;
    // two ways to steer, for the maintainer to compare (v0.90: «верни для тестов выбор»): 'height' — the palm sets the car's height on the
    // screen, as the ship's; 'road' — the palm sets its place across the road, a still palm keeps its lane through the bends (0.87)
    // v0.91 (the maintainer: «машинку резко подкидывает то вверх, то вниз, если сильно сместил ладонь для быстрого манёвра»): his log — the
    // sonar lost the palm for ~0.7 s 14 times in a race, the car stood, and when the palm was seen again somewhere else the car jumped up to
    // 40 units in a frame. Now after a gap of 0.1 s or more the car glides to the palm over ~0.3 s instead
    var seen=hand!==null&&hand!==undefined;
    if(!seen) s.gap++; else { if(s.gap>=6) s.glide=18; s.gap=0; }
    var fol=s.glide>0?GLIDE:FOLLOW; if(seen&&s.glide>0) s.glide--;
    if(g.steer==='road'){ if(seen&&g.state==='play') s.off=offOf(g,g.d+s.x,hand); var rr0=at(g,g.d+s.x); s.y+=(clamp(rr0.c+s.off,MARGIN,FH-MARGIN)-s.y)*(g.state==='play'?fol:FOLLOW); }
    else if(seen&&g.state==='play'){ var ty=FH-MARGIN-hand*(FH-2*MARGIN); s.y+=(ty-s.y)*fol; }
    if(s.inv>0) s.inv-=DT; if(s.bubble>0) s.bubble-=DT; if(s.magnet>0) s.magnet-=DT; if(s.turbo>0) s.turbo-=DT; if(s.syrup>0) s.syrup-=DT; if(s.rub>0) s.rub-=DT;
    // where the car is: on the road, on the kerb or off it
    var cx=g.d+s.x, r=at(g,cx), off=s.y-r.c; if(off<0) off=-off;
    s.on=off<=r.hw-TUNE.KERB_W?'road':off<=r.hw+1?'kerb':'off';
    /* v0.98, syrup (the maintainer: «заметно, что цепляют слишком сильно от краёв — лучше наоборот, чтоб чуть более простительными были»): the puddle is
       where it is drawn (its own road centre — it was taken at our car's, off by the slope on a bend) and counts as an oval a little inside
       the drawn one (0.9r × 0.45r against the drawn 1.15r × 0.62r) touching the car's body a little inside its drawing */
    for(i=0;i<g.puddles.length;i++){ p=g.puddles[i]; dx=p.x-cx; dy=centre(g,p.x)+p.o-s.y; var qx=clamp(dx,-(CAR.hl-2),CAR.hl-2), qy=clamp(dy,-(CAR.hw-1),CAR.hw-1), ex=(dx-qx)/(0.9*p.r), ey=(dy-qy)/(0.45*p.r);
      if(ex*ex+ey*ey<1){ if(s.syrup<=0) g.events.push('syrup'); s.syrup=TUNE.SYRUP_T; } }
    // speed: towards the top speed, less off the road, on the kerb, in syrup; nothing when the fuel is out
    var top=vmax(g.t)*g.opt.speed*(s.on==='off'?(g.opt.offSlow?TUNE.OFF:1):s.on==='kerb'?(g.opt.offSlow?TUNE.KERB:1):1)*(s.syrup>0?TUNE.SYRUP:1)*(s.turbo>0?TUNE.TURBO_K:1);
    if(g.state==='coast') top=0;
    if(g.v<top) g.v=Math.min(top,g.v+TUNE.ACC*(s.turbo>0?2.5:1)*DT); else g.v=Math.max(top,g.v-TUNE.BRAKE*DT);
    g.d+=g.v*DT; cx=g.d+s.x;
    if(g.state==='play'){ if(g.opt.burn) g.fuel-=burn(g.t)*DT; if(g.fuel<=0){ g.fuel=0; g.state='coast'; g.events.push('empty'); } }
    else if(g.v<4){ g.v=0; g.state='over'; g.events.push('over'); }
    spawnAhead(g);
    // the other cars: drive on (one close behind ours slows to our speed: nobody is run into from behind), change lanes now and then
    // (not into a car next to them), keep inside their road
    for(i=0;i<g.cars.length;i++){ c=g.cars[i]; c.x+=(c.x<cx&&c.x>cx-3*CAR.hl&&c.v>g.v&&cy0(g,c,s)?g.v:c.v)*DT; var rr=at(g,c.x), m=rr.hw-CAR.hw-3;
      c.turnT-=DT; if(c.turnT<=0){ c.turnT=rnd(g,2,5); if(g.rand()<0.4){ var nt=rnd(g,-m,m); if(freeAt2(g,c,nt)) c.to=nt; } }
      c.to=clamp(c.to,-m,m); var dto=c.to-c.o, sv=16*DT; c.o+=dto>sv?sv:dto<-sv?-sv:dto; }
    // running into a car; passing one
    for(i=0;i<g.cars.length;i++){ c=g.cars[i]; dx=c.x-cx; dy=centre(g,c.x)+c.o-s.y;
      if(!c.hit&&dx<2*CAR.hl-2&&dx>-2*CAR.hl+2&&dy<2*CAR.hw-1&&dy>-2*CAR.hw+1){ if(dx>CAR.hl) knock(g,c); else rub(g,c,dy); }
      if(!c.passed&&dx<-2*CAR.hl){ c.passed=true; if(!c.hit){ g.passed++; g.score+=TUNE.PASS; g.events.push('pass'); } } }
    // gifts: the magnet pulls those near (within 70 ahead, 55 across) towards the car
    for(i=0;i<g.items.length;i++){ p=g.items[i]; var pc=centre(g,p.x), py=pc+p.o; dx=p.x-cx; dy=py-s.y;
      if(s.magnet>0&&dx<70&&dx>-10&&dy<55&&dy>-55){ var nx=p.x-dx*0.16, ny=py-dy*0.16; p.x=nx; p.o=ny-centre(g,nx); dx=p.x-cx; dy=ny-s.y; }
      if(dx<CAR.hl+5&&dx>-CAR.hl-5&&dy<CAR.hw+5&&dy>-CAR.hw-5) take(g,p); }
    // the score: metres + coins + whole lines + cars passed
    g.score=Math.floor(g.d/10)+g.coins*TUNE.COIN+g.lineN*TUNE.LINE+g.passed*TUNE.PASS;
    var back=g.d-40;
    g.cars=g.cars.filter(function(q){ return q.x>back&&q.x<g.d+g.FW+400; });
    g.items=g.items.filter(function(q){ if(!q.dead&&q.x<=back&&q.line) delete g.lines[q.line]; return !q.dead&&q.x>back; });   // a missed coin: its line can't be whole
    g.puddles=g.puddles.filter(function(q){ return q.x>back; });
    if(g.keys.length>8&&g.keys[2].x<back-200){ g.keys.shift(); g.ki=Math.max(0,g.ki-1); }
    return g;
  }
  function cy0(g,c,s){ var dy=centre(g,c.x)+c.o-s.y; return dy<2*CAR.hw+2&&dy>-2*CAR.hw-2; }
  function freeAt2(g,me,o){ var s=g.car, px=g.d+s.x, py=s.y-centre(g,px), lo0=Math.min(me.o,o)-CAR.hw*2-6, hi0=Math.max(me.o,o)+CAR.hw*2+6;
    if(me.x-px<60&&me.x-px>-40&&py>lo0&&py<hi0) return false;                 // nor into the player's car
    for(var i=0;i<g.cars.length;i++){ var c=g.cars[i]; if(c===me) continue; var dx=c.x-me.x; if(dx<40&&dx>-40){ var lo=Math.min(me.o,o)-CAR.hw*2-3, hi=Math.max(me.o,o)+CAR.hw*2+3; if(c.o>lo&&c.o<hi) return false; } } return true; }
  /* a whole race from a palm trajectory (one value per step, −1 = no palm): what a server would run */
  function replay(seed,FW,hands,y0,steer,opt){ var g=create(seed,FW,y0,steer,opt); for(var i=0;i<hands.length&&g.state!=='over';i++) step(g,hands[i]<0?null:hands[i]); return g; }
  var TAG='race-11';   // v0.98: the maintainer's rules are the game's —   // v0.98: syrup puddles where drawn, forgiving —   // v0.98: the super gift from a bag of N —   // v0.96: how often the super gift comes —   // v0.93: the number of puddles, no cars, a bubble that does not pop —   // v0.92: test switches (g.opt) —   // v0.91: the car glides back to a palm seen again; turbo gifts   // v0.89: the speed rises earlier (race-3: 0.87's gifts and sodas; race-2, steering across the road, was tried and dropped)
  return {TAG:TAG,OPT0:OPT0,optOf:optOf,TUNE:TUNE,CAR:CAR,CAR_X:CAR_X,OFFW:OFFW,offOf:offOf,steerY:steerY,DT:DT,FH:FH,MARGIN:MARGIN,create:create,step:step,replay:replay,at:at,centre:centre,vmax:vmax,burn:burn};
})();
if(typeof module!=='undefined') module.exports=Race;
