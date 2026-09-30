/* The race core (src/14_race.js): deterministic, the car follows the palm, the fuel ends the race, and the bot driver's races
   last as tuned (29 Sep: a middling driver 2–6 min — v0.87: more gifts and sodas made it easier —, a weak one shorter). Run: node tests/test_race.js */
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
{ const g=Race.create(3,390,null,'road'); const offs=[]; for(let i=0;i<60*40;i++){ Race.step(g,0.62); if(i>60){ const r=Race.at(g,g.d+g.car.x); offs.push((g.car.y-r.c)/r.hw); } } const lo=Math.min(...offs), hi=Math.max(...offs);   // v0.90: the other way to steer
  check('steering along the road: a still palm keeps its place across the road through the bends',hi-lo<0.12,`${lo.toFixed(2)}…${hi.toFixed(2)} of the half-width`); }
{ const o={crashSlow:false,gifts:{magnet:false,bubble:false,tbubble:false,tmagnet:true},syrup:false,burn:false}, g=Race.create(11,390,null,'height',o); let kinds=new Set(), slowed=0, puds=0;   // v0.92: test switches
  for(let i=0;i<60*120;i++){ const v0=g.v; Race.step(g,0.5); g.items.forEach(p=>{ if(p.type!=='fuel'&&p.type!=='coin') kinds.add(p.type); }); puds+=g.puddles.length; if(g.events.includes('crash')&&g.v<v0*0.8) slowed++; }
  check('switches: only turbo+magnet gifts, no syrup, a knock does not slow, fuel not used',[...kinds].join()==='tmagnet'&&puds===0&&slowed===0&&g.fuel>80,`gifts ${[...kinds].join()}, puddles ${puds}, slowed by knocks ${slowed}, fuel ${g.fuel.toFixed(0)}`); }
{ const run=o=>{ const g=Race.create(21,390,null,'height',o); let cars=0, puds=0, pops=0, boings=0, bub=0; for(let i=0;i<60*120&&g.state!=='over';i++){ if(i%60===0&&g.car.bubble<=0) g.car.bubble=12; Race.step(g,0.5);   // v0.93: how many cars and puddles; a bubble that keeps
    g.cars.forEach(c=>{ if(!c.seen){ c.seen=1; cars++; } }); g.puddles.forEach(p=>{ if(!p.seen){ p.seen=1; puds++; } }); pops+=g.events.filter(e=>e==='pop').length; boings+=g.events.filter(e=>e==='boing').length; } return {cars,puds,pops,boings,crashes:g.crashes}; };
  const none=run({traffic:0,puddles:0}), lots=run({traffic:2.2,puddles:2.2}), mid=run({}), keep=run({traffic:1.5,bubblePop:false});
  check('switches: no cars and no puddles; very many — more than usual',none.cars===0&&none.puds===0&&lots.cars>mid.cars*1.6&&lots.puds>mid.puds*1.6,`cars ${none.cars}/${mid.cars}/${lots.cars}, puddles ${none.puds}/${mid.puds}/${lots.puds}`);
  check('switches: a bubble that does not pop takes the knocks',mid.pops>0&&keep.pops===0&&keep.boings>0&&keep.crashes===0,`usual: ${mid.pops} pops; keeping: ${keep.boings} knocks taken, ${keep.crashes} crashes`); }
{ const bag=N=>{ let t=0,s=0,run=0,maxRun=0; for(let i=0;i<20;i++){ const g=Race.create(300+i,390,null,'height',{gifts:{magnet:true,bubble:true,tbubble:false,tmagnet:true},burn:false,superN:N}); const seen=new Set(); run=0;   // v0.98: the super gift from a bag
    for(let n=0;n<60*240;n++){ Race.step(g,0.5); g.items.forEach(p=>{ if(p.type!=='fuel'&&p.type!=='coin'&&!seen.has(p.id)){ seen.add(p.id); t++; if(p.type==='tmagnet'){ s++; run=0; } else { run++; maxRun=Math.max(maxRun,run); } } }); } } return {every:t/s,maxRun}; };
  const b8=bag(8), b6=bag(6), b4=bag(4);
  check('switches: the super gift exactly 1 in 8, 6, 4 — never a long run without it',[[b8,8],[b6,6],[b4,4]].every(([b,N])=>Math.abs(b.every-N)<0.6&&b.maxRun<=2*N-2),`every ${b8.every.toFixed(1)}/${b6.every.toFixed(1)}/${b4.every.toFixed(1)}, longest runs without it ${b8.maxRun}/${b6.maxRun}/${b4.maxRun}`); }
{ const g=Race.create(1,390); let n=0; while(g.state!=='over'&&n<60*600){ Race.step(g,0); n++; }   // stuck at the bottom, off the road: no sodas, slow
  check('no fuel → the car rolls to a stop, the race is over',g.state==='over'&&g.fuel===0&&g.v===0,`${(g.t).toFixed(0)} s, ${Math.floor(g.d/10)} m`); }
{ const g=Race.create(5,390); let off=0, on=0; for(let i=0;i<60*8;i++){ Race.step(g,0); } off=g.v; const h=Race.create(5,390); for(let i=0;i<60*8;i++){ const road=Race.at(h,h.d+h.car.x+10); Race.step(h,(Race.FH-Race.MARGIN-road.c)/(Race.FH-2*Race.MARGIN)); } on=h.v;
  check('off the road is slower',off<on*0.6,`${off.toFixed(0)} vs ${on.toFixed(0)} units/s`); }
const med=x=>{ const q=x.slice().sort((p,q)=>p-q); return q[q.length>>1]; };
const runs=k=>{ const res=[]; for(let i=0;i<24;i++) res.push(bot(5000+i,k)); return {t:med(res.map(x=>x.t))/60,crash:med(res.map(x=>x.crashes)),score:med(res.map(x=>x.score))}; };
const w=runs(0.3), m=runs(0.6), g=runs(0.9);
check('a middling driver: 2–6 min',m.t>=2&&m.t<=6,`${m.t.toFixed(1)} min, score ${m.score}, crashes ${m.crash}`);
check('a better driver lasts longer and scores more than a weak one',g.t>w.t&&g.score>w.score&&m.t>=w.t-0.1,`weak ${w.t.toFixed(1)}, middling ${m.t.toFixed(1)}, good ${g.t.toFixed(1)} min`);
check('crashes are few when you look where you go',g.crash<=6,`${g.crash} in a race`);
out.forEach(x=>console.log(x)); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
