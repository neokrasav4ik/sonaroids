/* The flight core is deterministic: the same seed and palm trajectory give the same game, and a game replayed from its log
   (what the leaderboard server will do) ends with the same score. Also: the ship follows the palm. */
const Core=require('../src/13_core.js');
const hands=[]; for(let i=0;i<60*90;i++) hands.push(i%600<30?-1:0.5+0.45*Math.sin(i/47)+0.03*Math.sin(i/5));
function play(seed){ const g=Core.create(seed,380), log=[]; let i=0; for(;i<hands.length&&g.state==='play';i++){ const h=hands[i]<0?null:hands[i]; Core.step(g,h); log.push(h===null?-1:h); } return {g,log}; }
const a=play(42), b=play(42), c=play(43), r=Core.replay(42,380,a.log);
const same=a.g.score===b.g.score&&a.g.n===b.g.n&&a.g.lives===b.g.lives, rep=r.score===a.g.score&&r.n===a.g.n&&r.state===a.g.state, diff=c.g.score!==a.g.score||c.g.n!==a.g.n;
// following: after 0.3 s at a fixed palm the ship is within 1% of its target
const g=Core.create(1,380); for(let i=0;i<18;i++) Core.step(g,1); const top=Core.MARGIN, follow=Math.abs(g.ship.y-top)<Core.FH*0.01;
console.log(`seed 42: score ${a.g.score}, lives ${a.g.lives}, ${a.g.state} after ${(a.g.n/60).toFixed(1)} s | again: ${same?'identical':'DIFFERENT'} | replay from the palm log: ${rep?'identical':'DIFFERENT'} | seed 43 differs: ${diff}`);
console.log(`the ship reaches a fixed palm in 0.3 s: ${follow?'yes':'no'} (y ${g.ship.y.toFixed(2)}, target ${top.toFixed(2)})`);
const ok=same&&rep&&diff&&follow&&a.g.score>0; console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
