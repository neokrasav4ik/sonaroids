/* ── FLIGHT CORE: the game itself, without drawing. Deterministic: the same seed and the same palm inputs give the same game
   on any device, so the leaderboard server can replay a game from its palm trajectory and check the score.
   Rules for that: a fixed 60 Hz step; a seeded integer RNG; only + − × ÷ and sqrt (exact in IEEE on every engine) —
   no Math.sin/exp/atan, whose last bits differ between browsers. Field: FH = 180 units high, FW = 180 × aspect wide.
   Rules (agreed 24 Sep):
   - the ship fires by itself; rocks split large → 2 medium → 2 small, 20 / 50 / 100 points;
   - points × height: the middle of the screen ×3, then ×2, the edges ×1 (not shown); × streak: +1 for every 5 hits in a row, a hit resets it;
   - power-ups to fly into: shield (one hit), triple shot (10 s), slow motion (6 s);
   - one difficulty that grows smoothly: the first 15 s calm but not empty, then rocks get faster — 1.7× by 3 min, 2.2× by 7 min,
     slowly more after — and more frequent still (pace^1.125); slow motion only from pace 1.4 (~110 s);
   - levels count base points (before the multipliers, which can reach ×12): a level every 5000;
   - saucers: a large one from level 2 (shoots at random, 200 points), a small aiming one from level 4 (1000 points); 3 lives.
   With the bot player (tests/bot.js) that gives: a game of 5–8 min, the first saucer at ~1.1 min, small ones from ~1.9 min. ── */
var Core=(function(){
  var DT=1/60, FH=180, MARGIN=FH*0.08, SHIP_X=34;
  var FOLLOW=0.30952;                       // 1 − exp(−(1/60)/0.045): the ship follows the palm with a 45 ms lag (literal, see above)
  var R_SIZE=[13.5,8.1,4.3], PTS=[20,50,100], FIRE=0.17, BULLET_V=190, LIVES=3, INV=1.4;
  var UFO_BIG_LV=2, UFO_SMALL_LV=4;          // saucers: large from level 2, small aiming from level 4 (v0.13: earlier, was 3 and 5)
  var STREAK_MAX=4;                        // the streak adds up to ×4 (after 15 hits in a row)
  /* tuning, set with a bot player (tests/bot.js): a rock every SPAWN s at pace 1, and pace^1.125 times as often later (more rocks, not just faster ones); pieces fly off at SPLIT_VX × the parent's speed
     and SPLIT_VY up or down; a new level every LEVEL base points (points before the height and streak multipliers) */
  var TUNE={SPAWN:[1.0,1.7],SPLIT_VX:[0.85,1.15],SPLIT_VY:[8,18],HIT_R:0.8,LEVEL:5000,SLOW_FROM:1.4};
  var UFO={big:{hw:7,hh:3,pts:200,fire:1.4,v:70,hp:2},small:{hw:5,hh:2,pts:1000,fire:1.1,v:85,hp:1}};
  // v0.17 "a mini-boss, not one more rock": the saucer sidesteps when the ship has been level with it for a moment
  // (not always, and not again right away), moves up and down faster, the large one takes two hits, and it cannot be hit before it is on screen
  var DODGE={see:0.3,p:0.65,cool:[1.3,2.1],jump:[20,34],follow:0.035};
  function rng(seed){ var a=seed>>>0; return function(){ a=(a+0x6D2B79F5)>>>0; var t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
  /* y0 — where the ship starts (field units): at the palm, so the first frames of flight do not jerk it from the middle (v0.16) */
  function create(seed,FW,y0){
    return {seed:seed>>>0,FW:FW||380,FH:FH,rand:rng(seed),n:0,t:0,state:'play',score:0,lives:LIVES,level:1,combo:0,
      base:0,ship:{x:SHIP_X,y:(y0===undefined||y0===null)?FH/2:y0,inv:0,shield:0,triple:0},rocks:[],bullets:[],picks:[],ebullets:[],ufo:null,slow:0,
      fireT:0.3,spawnT:0.6,pickT:9,ufoT:-1,nextId:1,events:[],gone:[],fx:[]};
  }
  function rnd(g,a,b){ return a+g.rand()*(b-a); }
  /* how much faster everything is: 1 for the first 15 s, 1.7 at 3 min, 2.2 at 7 min, then +0.1 a minute up to 3 (v0.13: smoother —
     "first empty, then crowded"; v0.9: calm part 30 → 15 s) */
  function pace(t){ if(t<15) return 1; if(t<180) return 1+0.7*(t-15)/165; if(t<420) return 1.7+0.5*(t-180)/240; return Math.min(3,2.2+(t-420)/600); }
  function heightMult(y){ var f=y/FH-0.5; if(f<0) f=-f; return f<0.15?3:f<0.3?2:1; }
  function spawnRock(g,sz,x,y,vx,vy){ g.rocks.push({id:g.nextId++,sz:sz,r:R_SIZE[sz],x:x,y:y,vx:vx,vy:vy}); }
  function spawn(g,m){ var sz=g.rand()<0.55?0:(g.rand()<0.6?1:2), r=R_SIZE[sz];
    spawnRock(g,sz,g.FW+r+2,rnd(g,r+4,FH-r-4),-rnd(g,18,30)*m,rnd(g,-6,6)); }
  function award(g,base){ g.combo++; var got=base*heightMult(g.ship.y)*Math.min(STREAK_MAX,1+Math.floor(g.combo/5)); g.score+=got; g.base+=base;
    var lv=1+Math.floor(g.base/TUNE.LEVEL); if(lv>g.level){ g.level=lv; g.events.push('level'); } return got; }
  /* a rock breaks: into two smaller ones, unless it was small */
  function crack(g,r,byShip){ r.dead=true; g.gone.push(r); g.events.push(byShip?'crash':'break');
    if(r.sz<2) for(var i=0;i<2;i++) spawnRock(g,r.sz+1,r.x,r.y,r.vx*rnd(g,TUNE.SPLIT_VX[0],TUNE.SPLIT_VX[1]),(i?-1:1)*rnd(g,TUNE.SPLIT_VY[0],TUNE.SPLIT_VY[1]));
    if(!byShip) award(g,PTS[r.sz]); }
  function hurt(g){ var s=g.ship; if(s.inv>0) return;
    if(s.shield>0){ s.shield=0; s.inv=0.6; g.events.push('shield'); return; }
    g.combo=0; g.lives--; s.inv=INV; g.events.push(g.lives>0?'hit':'over'); if(g.lives<=0) g.state='over'; }
  function norm(dx,dy,v){ var l=Math.sqrt(dx*dx+dy*dy)||1; return [dx/l*v,dy/l*v]; }
  /* one fixed step. hand: palm position as a screen fraction from the bottom (0…1), or null when no palm is seen */
  function step(g,hand){
    g.events=[]; g.gone=[]; g.fx=[]; if(g.state!=='play') return g;
    g.n++; g.t=g.n*DT;
    var s=g.ship, m=pace(g.t), w=g.slow>0?0.5:1, wdt=DT*w, i, j, b, r, u=g.ufo;
    if(hand!==null&&hand!==undefined){ var ty=FH-MARGIN-hand*(FH-2*MARGIN); s.y+=(ty-s.y)*FOLLOW; }
    if(s.inv>0) s.inv-=DT; if(s.shield>0) s.shield-=DT; if(s.triple>0) s.triple-=DT; if(g.slow>0) g.slow-=DT;
    // shooting
    g.fireT-=DT; if(g.fireT<=0){ g.fireT+=FIRE; var bx=s.x+14; g.bullets.push({x:bx,y:s.y,vx:BULLET_V,vy:0});
      if(s.triple>0){ g.bullets.push({x:bx,y:s.y,vx:185,vy:-38}); g.bullets.push({x:bx,y:s.y,vx:185,vy:38}); } g.events.push('fire'); }
    // what comes in
    g.spawnT-=wdt; if(g.spawnT<=0){ spawn(g,m); g.spawnT=rnd(g,TUNE.SPAWN[0],TUNE.SPAWN[1])/(m*Math.sqrt(Math.sqrt(Math.sqrt(m)))); }   // m^1.125 via sqrt: exact on every engine, unlike pow
    g.pickT-=DT; if(g.pickT<=0){ g.pickT=rnd(g,12,18); var k=g.rand(), slowOk=m>=TUNE.SLOW_FROM;                                  // slow motion only once things have sped up
      g.picks.push({type:slowOk?(k<0.34?'shield':k<0.67?'triple':'slow'):(k<0.5?'shield':'triple'),x:g.FW+6,y:rnd(g,FH*0.15,FH*0.85)}); }
    if(g.level>=UFO_BIG_LV&&g.ufoT<0&&!u) g.ufoT=rnd(g,2,5);
    if(g.ufoT>0&&!u){ g.ufoT-=wdt; if(g.ufoT<=0){ var kind=(g.level>=UFO_SMALL_LV&&g.rand()<0.5)?'small':'big';
      u=g.ufo={id:g.nextId++,kind:kind,x:g.FW+10,y:rnd(g,FH*0.2,FH*0.8),ty:FH/2,tyT:0,fire:1.2,hp:UFO[kind].hp,seen:0,dodgeT:0,hitT:0}; g.events.push('ufo'); } }
    // movement
    for(i=0;i<g.bullets.length;i++){ b=g.bullets[i]; b.x+=b.vx*DT; b.y+=b.vy*DT; }
    for(i=0;i<g.rocks.length;i++){ r=g.rocks[i]; r.x+=r.vx*wdt; r.y+=r.vy*wdt; if((r.y<r.r&&r.vy<0)||(r.y>FH-r.r&&r.vy>0)) r.vy=-r.vy; }
    for(i=0;i<g.picks.length;i++) g.picks[i].x-=24*wdt;
    for(i=0;i<g.ebullets.length;i++){ b=g.ebullets[i]; b.x+=b.vx*wdt; b.y+=b.vy*wdt; }
    if(u){ var U=UFO[u.kind]; u.x+=(u.x>g.FW*0.72?-30:-6)*wdt;
      u.tyT-=wdt; if(u.tyT<=0){ u.tyT=rnd(g,1,2.5); u.ty=rnd(g,FH*0.2,FH*0.8); }
      u.dodgeT-=wdt; u.hitT-=wdt; var lv=s.y-u.y; if(lv<U.hh+6&&lv>-U.hh-6) u.seen+=wdt; else u.seen=0;
      if(u.seen>DODGE.see&&u.dodgeT<=0){ u.dodgeT=rnd(g,DODGE.cool[0],DODGE.cool[1]); u.seen=0;
        if(g.rand()<DODGE.p){ var jd=rnd(g,DODGE.jump[0],DODGE.jump[1]), up=u.y>=s.y?1:-1, ny=u.y+up*jd;
          if(ny<FH*0.12||ny>FH*0.88) ny=u.y-up*jd; u.ty=Math.max(FH*0.12,Math.min(FH*0.88,ny)); u.tyT=1.2; g.events.push('ufo_dodge'); } }
      u.y+=(u.ty-u.y)*DODGE.follow*w;
      u.fire-=wdt; if(u.fire<=0&&u.x<g.FW-4){ u.fire=U.fire; var v=u.kind==='small'?norm(s.x-u.x,s.y-u.y,U.v):norm(-1,rnd(g,-0.6,0.6),U.v);
        g.ebullets.push({x:u.x,y:u.y,vx:v[0],vy:v[1]}); g.events.push('ufo_fire'); }
      if(u.x<-20){ g.ufo=u=null; g.ufoT=rnd(g,16,24); } }
    // hits
    for(i=0;i<g.bullets.length;i++){ b=g.bullets[i]; if(b.dead) continue;
      for(j=0;j<g.rocks.length;j++){ r=g.rocks[j]; if(r.dead) continue; var dx=b.x-r.x, dy=b.y-r.y;
        if(dx*dx+dy*dy<(r.r+1)*(r.r+1)){ b.dead=true; crack(g,r,false); break; } }
      if(!b.dead&&u&&u.x<g.FW-2){ var U2=UFO[u.kind]; if(b.x-u.x<U2.hw+1&&u.x-b.x<U2.hw+1&&b.y-u.y<U2.hh+2&&u.y-b.y<U2.hh+2){ b.dead=true;
        if(--u.hp>0){ u.hitT=0.25; u.dodgeT=0; u.seen=DODGE.see; g.events.push('ufo_hit'); }      // hurt: it flashes and tries to get away at once
        else { g.fx.push({ufo:u.kind,x:u.x,y:u.y}); award(g,U2.pts); g.events.push('ufo_die'); g.ufo=u=null; g.ufoT=rnd(g,16,24); } } } }
    // the ship runs into things
    for(j=0;j<g.rocks.length;j++){ r=g.rocks[j]; if(r.dead) continue; var ex=r.x-s.x-3, ey=r.y-s.y;
      var hr=r.r*TUNE.HIT_R+3; if(ex*ex+ey*ey<hr*hr){ crack(g,r,true); hurt(g); } }
    for(j=0;j<g.ebullets.length;j++){ b=g.ebullets[j]; var qx=b.x-s.x-3, qy=b.y-s.y; if(qx<6&&qx>-6&&qy<5&&qy>-5){ b.dead=true; hurt(g); } }
    if(u){ var U3=UFO[u.kind], ux=u.x-s.x-3, uy=u.y-s.y; if(ux<U3.hw+5&&ux>-U3.hw-5&&uy<U3.hh+4&&uy>-U3.hh-4){ g.fx.push({ufo:u.kind,x:u.x,y:u.y}); g.events.push('ufo_die'); g.ufo=u=null; g.ufoT=rnd(g,16,24); hurt(g); } }
    for(j=0;j<g.picks.length;j++){ var p=g.picks[j], px=p.x-s.x-3, py=p.y-s.y; if(px<9&&px>-9&&py<9&&py>-9){ p.dead=true;
      if(p.type==='shield') s.shield=15; else if(p.type==='triple') s.triple=10; else g.slow=6; g.events.push('pick'); g.fx.push({pick:p.type,x:p.x,y:p.y}); } }
    g.bullets=g.bullets.filter(function(q){ return !q.dead&&q.x<g.FW+8&&q.y>-4&&q.y<FH+4; });
    g.ebullets=g.ebullets.filter(function(q){ return !q.dead&&q.x>-4&&q.x<g.FW+4&&q.y>-4&&q.y<FH+4; });
    g.rocks=g.rocks.filter(function(q){ return !q.dead&&q.x>-q.r-6; });
    g.picks=g.picks.filter(function(q){ return !q.dead&&q.x>-10; });
    return g;
  }
  /* a whole game from a palm trajectory (one value per step, −1 = no palm): what the server will run */
  function replay(seed,FW,hands,y0){ var g=create(seed,FW,y0); for(var i=0;i<hands.length&&g.state==='play';i++) step(g,hands[i]<0?null:hands[i]); return g; }
  return {TUNE:TUNE,SHIP_X:SHIP_X,UFO_BIG_LV:UFO_BIG_LV,UFO_SMALL_LV:UFO_SMALL_LV,create:create,step:step,replay:replay,pace:pace,heightMult:heightMult,DT:DT,FH:FH,MARGIN:MARGIN,UFO:UFO,DODGE:DODGE,R_SIZE:R_SIZE};
})();
if(typeof module!=='undefined') module.exports=Core;
