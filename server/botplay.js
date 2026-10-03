/* v1.31: how a bot plays one game of SonaFly or SonaRace — the same rules the phone runs (src/13_core.js, src/14_race.js), stepped at 60 Hz
   with a palm height every step, rounded to 1/4000 exactly as the page sends it, so the server can replay a bot's game like anyone's.
   The aiming is the tests' bots (tests/bot.js, tests/race_bot.js); on top of it, a person's limits by skill (0 — a beginner, 1 — a strong player):
   it sees late (0.3–0.65 s), its palm shakes and moves slower, it loses focus now and then (the palm drifts for half a second or more), more
   often as the game grows fast; past the score it is going for this time (cap) it goes for the next rock or car and soon loses; or it just
   stops there (quit) — ends the game from the pause, as a beginner does (a game ended so is replayed to the same score). All its chance comes from its own seed. */
'use strict';
const path=require('node:path');
const Core=require(path.join(__dirname,'..','src','13_core.js'));
const Race=require(path.join(__dirname,'..','src','14_race.js'));
const Q=4000;
function rng(seed){ let s=(seed>>>0)||1; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
/* the palm: follows what the bot wants, late, shaky, at a limited speed, with lapses */
function palm(skill,rnd){
  const u=1-skill, delay=Math.round(60*(0.3+0.5*u)), speed=(1/30)*(0.35+0.65*skill), shake=0.012+0.09*u;
  const lapseRate=(0.012+0.45*u*u)/60;   // lapses a step
  let hand=0.5, noise=0, drift=0, lapse=0; const q=[];
  return { delay,
    step(want,hard,tired){   // hard — how fast the game has grown (0…1); tired — past its cap
      if(tired){ lapse=0; hand+=Math.max(-2*speed,Math.min(2*speed,want-hand)); }   // past its cap it goes for the next rock or car, fast
      else if(lapse>0){ lapse--; hand=Math.max(0,Math.min(1,hand+drift)); }
      else { if(rnd()<lapseRate*(1+2.5*hard)){ lapse=Math.round(60*(0.35+rnd()*1.1)); drift=(rnd()-0.5)*0.03; }
        hand+=Math.max(-speed,Math.min(speed,want-hand)); }
      noise=noise*0.94+(rnd()-0.5)*shake; const h=Math.round(Math.max(0,Math.min(1,hand+noise))*Q); q.push(h); return h/Q; },
    q };
}
/* SonaFly: lines up with the nearest rock ahead, dodges what is close, grabs power-ups (tests/bot.js) */
function fly(seed,FW,skill,cap,quit){
  const rnd=rng(seed^0x5bd1e995), g=Core.create(seed,FW,null), FH=Core.FH, M=Core.MARGIN, P=palm(skill,rnd), seen=[];
  const greed=skill>0.35;   // a beginner doesn't go for the power-ups
  while(g.state==='play'&&g.t<1500&&!(quit&&g.score>=quit)){
    seen.push({rocks:g.rocks.map(r=>[r.x,r.y,r.r]),eb:(g.ebullets||[]).map(b=>[b.x,b.y]),ufo:g.ufo?[g.ufo.x,g.ufo.y]:null,picks:(g.picks||[]).map(p=>[p.x,p.y])});
    const v=seen.length>P.delay?seen[seen.length-1-P.delay]:seen[0]; if(seen.length>P.delay+2) seen.shift();
    const y=g.ship.y, X=g.ship.x+3; let ty=FH/2, best=1e9;
    v.rocks.forEach(r=>{ const dx=r[0]-X; if(dx>10&&dx<best&&dx<220){ best=dx; ty=r[1]; } });
    if(v.ufo&&v.ufo[0]-X<250) ty=v.ufo[1];
    if(greed) v.picks.forEach(p=>{ const dx=p[0]-X; if(dx>0&&dx<90) ty=p[1]; });
    let danger=0; const reach=4+26*skill*skill, threat=(oy,rad,dx)=>{ if(dx>-6&&dx<reach+rad&&Math.abs(oy-y)<rad+10) danger+=oy>y?-1:1; };   // a beginner sees danger late
    v.rocks.forEach(r=>threat(r[1],r[2],r[0]-X)); v.eb.forEach(b=>threat(b[1],3,b[0]-X)); if(v.ufo) threat(v.ufo[1],7,v.ufo[0]-X);
    if(danger) ty=y+Math.sign(danger)*30;
    const tired=cap&&g.score>cap;
    if(tired){ let nr=null; v.rocks.forEach(r=>{ const dx=r[0]-X; if(dx>15&&dx<160&&(!nr||dx<nr[0]-X)) nr=r; }); if(nr) ty=nr[1]+(nr[1]>y?-1:1)*nr[2]*0.9; }   // past its best: it grazes the next rock
    const want=Math.max(0,Math.min(1,(FH-M-ty)/(FH-2*M)));
    Core.step(g,P.step(want,Math.min(1,g.level/30),tired));
  }
  return {score:g.score,level:g.level,t:g.t,q:P.q};
}
/* SonaRace: picks the best line across the road — away from cars and syrup, towards gifts (tests/race_bot.js), steering along the road */
function race(seed,FW,skill,cap,quit){
  const rnd=rng(seed^0x27d4eb2f), g=Race.create(seed,FW,null,'road',null), P=palm(skill,rnd), seen=[], C=x=>Race.centre(g,x);
  const want=p=>p.type==='fuel'?(g.fuel<70?4:1.5):p.type==='coin'?1:p.type[0]==='t'?2.5:2;
  while(g.state!=='over'&&g.t<1500&&!(quit&&g.score>=quit)){
    seen.push({cars:g.cars.map(c=>({x:c.x,y:C(c.x)+c.o})),items:g.items.map(p=>({x:p.x,y:C(p.x)+p.o,type:p.type})),puds:g.puddles.map(p=>({x:p.x,y:C(p.x)+p.o,r:p.r}))});
    const v=seen.length>P.delay?seen[seen.length-1-P.delay]:seen[0]; if(seen.length>P.delay+2) seen.shift();
    const cx=g.d+g.car.x, y=g.car.y, road=Race.at(g,cx+30*(1+skill)), here=Race.at(g,cx), off=y-here.c; let to=0, bo=-1e9;
    for(let oo=-road.hw+6;oo<=road.hw-6;oo+=3){ let sc=-Math.abs(oo-off)*0.02-Math.abs(oo)*0.01;
      v.cars.forEach(c=>{ const dx=c.x-cx, co=c.y-C(c.x); if(dx>-20&&dx<50+70*skill){ const tr=Math.max(0,dx+18)/Math.max(10,g.v*0.45), po=off+Math.sign(oo-off)*Math.min(Math.abs(oo-off),110*tr); if(Math.abs(po-co)<12) sc-=6-dx/30;
        if(dx<20){ const lo=Math.min(off,oo)-10, hi=Math.max(off,oo)+10; if(co>lo&&co<hi) sc-=6; } } });
      v.puds.forEach(p=>{ const dx=p.x-cx; if(dx>-10&&dx<50&&Math.abs(p.y-C(p.x)-oo)<p.r+7) sc-=1.5; });
      v.items.forEach(p=>{ const dx=p.x-cx; if(dx>4&&dx<140*(0.5+skill)&&Math.abs(p.y-C(p.x)-oo)<7) sc+=want(p)*(1-dx/250); });
      if(sc>bo){ bo=sc; to=oo; } }
    const tired=cap&&g.score>cap;
    if(tired){ const c=v.cars.find(c=>c.x-cx>10&&c.x-cx<120); if(c) to=Math.max(-road.hw+4,Math.min(road.hw-4,c.y-C(c.x))); }   // past its best: it doesn't get round the next car
    const w=Math.max(0,Math.min(1,0.5-to/(2*(here.hw+Race.OFFW))));
    Race.step(g,P.step(w,Math.min(1,g.t/400),tired));
  }
  return {score:g.score,level:Math.floor(g.d/10),t:g.t,q:P.q};
}
module.exports={fly,race,Q};
