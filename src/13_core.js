/* ── FLIGHT CORE: the game itself, without drawing. Deterministic: the same seed and the same palm inputs give the same game
   on any device, so the leaderboard server can replay a game from its palm trajectory and check the score.
   Rules for that: a fixed 60 Hz step; a seeded integer RNG; only + − × ÷ and sqrt (exact in IEEE on every engine) —
   no Math.sin/exp/atan, whose last bits differ between browsers.
   Field: FH = 180 units high, FW = 180 × aspect wide (stored in the game log). The skeleton has test rocks only:
   the real rules (splitting, streak, power-ups, saucer, levels) come next. ── */
var Core=(function(){
  var DT=1/60, FH=180, MARGIN=FH*0.08, SHIP_X=30;
  var FOLLOW=0.30952;                       // 1 − exp(−(1/60)/0.045): the ship follows the palm with a 45 ms lag (literal, see above)
  var R_SIZE=[13.5,8.1,4.3], PTS=[20,50,100], FIRE=0.17, BULLET_V=190, LIVES=3, INV=1.4;
  function rng(seed){ var a=seed>>>0; return function(){ a=(a+0x6D2B79F5)>>>0; var t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
  function create(seed,FW){
    var g={seed:seed>>>0,FW:FW||380,FH:FH,rand:rng(seed),n:0,t:0,state:'play',score:0,lives:LIVES,
      ship:{x:SHIP_X,y:FH/2,inv:0},rocks:[],bullets:[],fireT:0.3,spawnT:0.6,nextId:1,events:[]};
    return g;
  }
  function rnd(g,a,b){ return a+g.rand()*(b-a); }
  function spawn(g){
    var sz=g.rand()<0.55?0:(g.rand()<0.6?1:2), r=R_SIZE[sz];
    g.rocks.push({id:g.nextId++,sz:sz,r:r,x:g.FW+r+2,y:rnd(g,r+4,FH-r-4),vx:-rnd(g,18,30),vy:rnd(g,-6,6)});
  }
  /* one fixed step. hand: palm position as a screen fraction from the bottom (0…1), or null when no palm is seen */
  function step(g,hand){
    g.events=[]; if(g.state!=='play') return g;
    g.n++; g.t=g.n*DT;
    var s=g.ship;
    if(hand!==null&&hand!==undefined){ var ty=FH-MARGIN-hand*(FH-2*MARGIN); s.y+=(ty-s.y)*FOLLOW; }
    if(s.inv>0) s.inv-=DT;
    g.fireT-=DT; if(g.fireT<=0){ g.fireT+=FIRE; g.bullets.push({x:s.x+14,y:s.y}); g.events.push('fire'); }
    g.spawnT-=DT; if(g.spawnT<=0){ spawn(g); g.spawnT=rnd(g,0.9,1.6); }
    var i,j,b,r;
    for(i=0;i<g.bullets.length;i++) g.bullets[i].x+=BULLET_V*DT;
    for(i=0;i<g.rocks.length;i++){ r=g.rocks[i]; r.x+=r.vx*DT; r.y+=r.vy*DT; if((r.y<r.r&&r.vy<0)||(r.y>FH-r.r&&r.vy>0)) r.vy=-r.vy; }
    for(i=0;i<g.bullets.length;i++){ b=g.bullets[i];
      for(j=0;j<g.rocks.length;j++){ r=g.rocks[j]; if(r.dead) continue; var dx=b.x-r.x, dy=b.y-r.y;
        if(dx*dx+dy*dy<(r.r+1)*(r.r+1)){ b.dead=true; r.dead=true; g.score+=PTS[r.sz]; g.events.push('break'); break; } } }
    for(j=0;j<g.rocks.length;j++){ r=g.rocks[j]; if(r.dead) continue; var ex=r.x-s.x-3, ey=r.y-s.y;
      if(ex*ex+ey*ey<(r.r+4)*(r.r+4)){ r.dead=true; r.byShip=true;
        if(s.inv<=0){ g.lives--; s.inv=INV; g.events.push(g.lives>0?'hit':'over'); if(g.lives<=0) g.state='over'; } } }
    g.bullets=g.bullets.filter(function(q){ return !q.dead&&q.x<g.FW+8; });
    g.gone=g.rocks.filter(function(q){ return q.dead; });                  // for the renderer: explosions
    g.rocks=g.rocks.filter(function(q){ return !q.dead&&q.x>-q.r-6; });
    return g;
  }
  /* a whole game from a palm trajectory (one value per step, −1 = no palm): what the server will run */
  function replay(seed,FW,hands){ var g=create(seed,FW); for(var i=0;i<hands.length&&g.state==='play';i++) step(g,hands[i]<0?null:hands[i]); return g; }
  return {create:create,step:step,replay:replay,DT:DT,FH:FH,MARGIN:MARGIN};
})();
if(typeof module!=='undefined') module.exports=Core;
