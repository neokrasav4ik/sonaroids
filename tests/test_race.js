/* The race core (src/14_race.js): deterministic, the car follows the palm, the fuel ends the race, and the bot driver's races
   last as tuned (29 Sep: a middling driver 1.5–3.5 min, a good one longer, a weak one shorter). Run: node tests/test_race.js */
const Race=require('../src/14_race.js'), bot=require('./race_bot.js');
let ok=true; const out=[]; const check=(name,good,info)=>{ ok=ok&&good; out.push(`${name}: ${info||''} ${good?'ok':'FAIL'}`); };
// a wobbling palm with gaps (no palm seen)
const hands=[]; let s=7; for(let i=0;i<60*150;i++){ s=(s*1664525+1013904223)>>>0; hands.push(i%900<30?-1:0.5+0.35*Math.sin(i/70)+((s/4294967296)-0.5)*0.1); }
function play(seed){ const g=Race.create(seed,390); let i=0; for(;i<hands.length&&g.state!=='over';i++) Race.step(g,hands[i]<0?null:hands[i]); return g; }
const a=play(42), b=play(42), c=play(43), r=Race.replay(42,390,hands);
check('same seed and palm → same race',a.score===b.score&&a.d===b.d&&a.t===b.t,`score ${a.score}, ${Math.floor(a.d/10)} m, ${a.t.toFixed(1)} s`);
check('replay gives the same race',r.score===a.score&&r.d===a.d,`${r.score}`);
check('another seed → another race',c.score!==a.score||c.d!==a.d);
{ const g=Race.create(1,390); for(let i=0;i<18;i++) Race.step(g,1); check('the car follows the palm to the top',Math.abs(g.car.y-Race.MARGIN)<Race.FH*0.01,`y ${g.car.y.toFixed(1)}`); }
{ const g=Race.create(1,390); let n=0; while(g.state!=='over'&&n<60*600){ Race.step(g,0); n++; }   // stuck at the bottom, off the road: no sodas, slow
  check('no fuel → the car rolls to a stop, the race is over',g.state==='over'&&g.fuel===0&&g.v===0,`${(g.t).toFixed(0)} s, ${Math.floor(g.d/10)} m`); }
{ const g=Race.create(5,390); let off=0, on=0; for(let i=0;i<60*8;i++){ Race.step(g,0); } off=g.v; const h=Race.create(5,390); for(let i=0;i<60*8;i++){ const road=Race.at(h,h.d+h.car.x+10); Race.step(h,(Race.FH-Race.MARGIN-road.c)/(Race.FH-2*Race.MARGIN)); } on=h.v;
  check('off the road is slower',off<on*0.6,`${off.toFixed(0)} vs ${on.toFixed(0)} units/s`); }
const med=x=>{ const q=x.slice().sort((p,q)=>p-q); return q[q.length>>1]; };
const runs=k=>{ const res=[]; for(let i=0;i<12;i++) res.push(bot(1000+i,k)); return {t:med(res.map(x=>x.t))/60,crash:med(res.map(x=>x.crashes)),score:med(res.map(x=>x.score))}; };
const w=runs(0.3), m=runs(0.6), g=runs(0.9);
check('a middling driver: 1.5–3.5 min',m.t>=1.5&&m.t<=3.5,`${m.t.toFixed(1)} min, score ${m.score}, crashes ${m.crash}`);
check('a better driver lasts longer and scores more',g.t>m.t&&g.score>m.score&&m.t>=w.t,`weak ${w.t.toFixed(1)}, middling ${m.t.toFixed(1)}, good ${g.t.toFixed(1)} min`);
check('crashes are few when you look where you go',g.crash<=6,`${g.crash} in a race`);
out.forEach(x=>console.log(x)); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
