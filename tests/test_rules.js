/* Game rules in the core, one by one, plus the difficulty measured with the bot player. */
const Core=require('../src/13_core.js'), bot=require('./bot.js');
const res=[]; const check=(name,ok,info)=>{ res.push(ok); console.log((ok?'ok   ':'FAIL ')+name+(info?' — '+info:'')); };
function place(g,list){ g.rocks=list.map((q,i)=>Object.assign({id:900+i,r:Core.R_SIZE[q.sz],vx:0,vy:0},q)); }
// splitting: a large rock hit by a bullet → two medium ones, 20 points × height × streak
let g=Core.create(5,380); g.spawnT=99; g.pickT=99; g.ship.y=Core.FH/2; place(g,[{sz:0,x:120,y:Core.FH/2}]);
for(let i=0;i<120&&g.rocks.every(r=>r.id>=900);i++) Core.step(g,null);
check('a large rock splits into two medium ones', g.rocks.length===2&&g.rocks.every(r=>r.sz===1), g.rocks.map(r=>r.sz).join(','));
check('middle of the screen scores ×3', g.score===60, 'score '+g.score);
// edge scores ×1
g=Core.create(5,380); g.spawnT=99; g.pickT=99; g.ship.y=Core.FH*0.1; place(g,[{sz:2,x:120,y:Core.FH*0.1}]);
for(let i=0;i<120&&g.score===0;i++) Core.step(g,null);
check('the edge scores ×1, a small rock does not split', g.score===100&&g.rocks.length===0, 'score '+g.score);
// streak: 5 hits in a row → ×2 from the 5th; capped at ×4
g=Core.create(5,380); let got=[]; for(let k=0;k<25;k++){ g.ship.y=Core.FH*0.1; g.combo=k; const b=g.score; g.score=0;
  /* award through a rock */ place(g,[{sz:2,x:g.ship.x+20,y:g.ship.y}]); g.bullets=[{x:g.ship.x+19,y:g.ship.y,vx:0,vy:0}]; Core.step(g,null); got.push(g.score); g.score=b; }
check('streak: ×1, ×2 from the 5th hit, up to ×4', got[0]===100&&got[4]===200&&got[9]===300&&got[14]===400&&got[24]===400, got.filter((_,i)=>i%5===0||i===4).join(' '));
// a hit resets the streak and costs a life; the shield takes one hit instead
g=Core.create(5,380); g.spawnT=99; g.pickT=99; g.combo=7; g.ship.shield=5; place(g,[{sz:1,x:g.ship.x+3,y:g.ship.y}]); Core.step(g,null);
check('the shield takes a hit', g.lives===3&&g.ship.shield===0&&g.events.includes('shield'));
g.ship.inv=0; place(g,[{sz:1,x:g.ship.x+3,y:g.ship.y}]); Core.step(g,null);
check('a hit costs a life and resets the streak', g.lives===2&&g.combo===0);
// power-ups
g=Core.create(5,380); g.spawnT=99; g.pickT=99; g.picks=[{type:'triple',x:g.ship.x+3,y:g.ship.y}]; Core.step(g,null); g.fireT=0; Core.step(g,null);
check('triple shot: three bullets at once', g.ship.triple>9&&g.bullets.filter(b=>b.vy!==0).length===2);
// saucers: none before the large-saucer level, a large one at it, small ones possible from the small-saucer level
g=Core.create(9,380); g.spawnT=99; g.pickT=99; for(let i=0;i<60*20;i++) Core.step(g,0.5);
const none=!g.ufo&&g.ufoT<0; g.level=Core.UFO_BIG_LV; let seen=null; for(let i=0;i<60*8&&!seen;i++){ Core.step(g,0.5); if(g.ufo) seen=g.ufo.kind; }
check('no saucer before level '+Core.UFO_BIG_LV+'; a large one after', none&&seen==='big', 'seen '+seen);
g.level=Core.UFO_SMALL_LV; g.ufo=null; g.ufoT=0.01; const kinds={}; for(let k=0;k<40;k++){ g.ufo=null; g.ufoT=0.01; g.lives=3; Core.step(g,0.5); if(g.ufo) kinds[g.ufo.kind]=1; }
check('from level '+Core.UFO_SMALL_LV+' small saucers too', kinds.small&&kinds.big, Object.keys(kinds).join(','));
// the saucer is a mini-boss (v0.17): the large one takes two hits, none count while it is off screen, and it sidesteps a ship lined up with it
g=Core.create(11,380); g.spawnT=99; g.pickT=99; g.level=Core.UFO_BIG_LV; g.ufoT=0.01; Core.step(g,0.5);
const ub=g.ufo; ub.y=Core.FH/2; ub.ty=ub.y; ub.tyT=99; ub.dodgeT=99; g.ship.y=Core.FH/2; g.ship.inv=99; let hitEv=0, dieEv=0, offHit=false;
for(let i=0;i<60*12&&g.ufo;i++){ const u=g.ufo; u.ty=Core.FH/2; u.tyT=99; u.dodgeT=99; u.fire=99; g.ship.y=Core.FH/2; Core.step(g,null);
  if(g.events.includes('ufo_hit')){ hitEv++; if(u.x>=g.FW-2) offHit=true; } if(g.events.includes('ufo_die')) dieEv++; }
check('a large saucer takes two hits, none off screen', hitEv===1&&dieEv===1&&!offHit, `hits ${hitEv}, deaths ${dieEv}`);
let dodges=0; for(let k=0;k<20;k++){ g=Core.create(100+k,380); g.spawnT=99; g.pickT=99; g.level=Core.UFO_BIG_LV; g.ufoT=0.01; Core.step(g,0.5); g.ship.inv=99;
  for(let i=0;i<60*3&&g.ufo;i++){ g.ship.y=g.ufo.y; Core.step(g,null); if(g.events.includes('ufo_dodge')){ dodges++; break; } } }
check('a saucer lined up with the ship usually sidesteps', dodges>=8, dodges+' of 20');
// the pace
check('pace: 1 for 15 s, 1.7 at 3 min, 2.2 at 7 min', Core.pace(10)===1&&Math.abs(Core.pace(180)-1.7)<1e-9&&Math.abs(Core.pace(420)-2.2)<1e-9);
// slow motion is not given while the game is still calm
{ const g=Core.create(3,380); const types=new Set(); for(let i=0;i<60*60;i++){ Core.step(g,0.5); g.lives=3; g.picks.forEach(p=>{ if(!p.seen){ p.seen=1; types.add(Core.pace(g.t)<Core.TUNE.SLOW_FROM?p.type:'later'); } }); }
  check('no slow motion before the pace reaches 1.4', !types.has('slow'), [...types].join(',')); }
// difficulty with the bot (deterministic seeds)
const runs=[]; for(let i=0;i<12;i++) runs.push(bot(1000+i,0.6)); const med=a=>a.sort((p,q)=>p-q)[a.length>>1];
const life=med(runs.map(r=>r.t))/60, ufo=med(runs.map(r=>r.firstUfo).filter(x=>x!==null))/60;
check('a middling bot lives 3–10 min', life>3&&life<10, life.toFixed(1)+' min');
check('the first saucer comes in the first minute', ufo<1, ufo.toFixed(1)+' min');
const ok=res.every(Boolean); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
