/* SonaLob «Вдвоём» (v1.64a): the rules on two palms (src/15_pong.js step2) and one game on two phones (src/16_pong_net.js).
   1. The duo game with the same palm on both rackets is the single game, bit for bit (the duo changes nothing it doesn't have to).
   2. Two phones over a network — each sends its palm with its step, the partner's arrives late (2–20 steps, bursts, a pause in the
      middle with an agreed resume step): both phones end with the very same game, and it is the game replayed from the two palms
      (what the server will run). Each phone's own racket never waits.
   Run: node tests/test_pong_net.js */
global.Pong=require('../src/15_pong.js'); const PongNet=require('../src/16_pong_net.js');
let ok=true; const check=(name,c,info)=>{ console.log((c?'ok   ':'FAIL ')+name+(info?' — '+info:'')); if(!c) ok=false; };
const q=v=>v===null?null:Math.round(v*10000)/10000;
/* a palm that plays: swings at a rhythm with drift, sometimes gone */
function palm(seed){ let a=seed*9301+49297; const r=()=>{ a=(a*9301+49297)%233280; return a/233280; }; const ph=r()*6, fq=3+r()*2;
  return (i)=>{ if(i%900>880) return null; const t=i/60; return q(0.3+0.4*Math.sin(t*fq+ph)+0.12*Math.sin(t*11.3+ph*2)); }; }
{ let bad=0, steps=0; for(let seed=1;seed<=30;seed++){ const a=Pong.create(seed,2.16,1,75), b=Pong.create2(seed,2.16,[1,1],[75,75]), P=palm(seed);
    for(let i=0;i<20000&&a.state!=='over';i++){ const h0=P(i), h=h0===null?null:Math.max(0,h0);   /* the racket kept off its very bottom: there the duo aims at the low place as such */ Pong.step(a,h); Pong.step2(b,h,h); steps++;
      if(a.score!==b.score||a.state!==b.state||(a.ball&&(a.ball.x!==b.ball.x||a.ball.y!==b.ball.y))){ bad++; break; } } }
  check('the duo game on one palm is the single game, bit for bit (the racket above its low place)',bad===0,`30 games, ${steps} steps, ${bad} apart`); }
/* the network: messages [arrival step, list]; delay per message 2–20 steps, and now and then a burst of 0.5 s */
function run(seed,opt){ opt=opt||{}; const g0=Pong.create2(seed,2.16,[1,2],[75,70]), A=PongNet.create(Pong.clone2(g0),0), B=PongNet.create(Pong.clone2(g0),1), PA=palm(seed*3+1), PB=palm(seed*7+2);
  let r=seed*48271%2147483647; const rnd=()=>{ r=r*48271%2147483647; return r/2147483647; };
  const toB=[], toA=[], hL=[], hR=[], resumeAt=opt.pause?1500:-1; let i=0;
  while(i<60*600&&(A.g.state!=='over'||B.g.state!=='over')){ i++;
    if(i===resumeAt){ PongNet.mark(A,i-1+30,['resume']); PongNet.mark(B,i-1+30,['resume']); }   // both agree on a resume 30 steps on (sent ahead)
    const fa=PA(i), fb=PB(i); hL.push(fa); hR.push(fb);
    if(A.g.n<i&&A.g.state!=='over') PongNet.stepLocal(A,fa); if(B.g.n<i&&B.g.state!=='over') PongNet.stepLocal(B,fb);
    const burst=(i%600)>540; const d1=burst?30+Math.floor(rnd()*10):2+Math.floor(rnd()*18), d2=burst?25:2+Math.floor(rnd()*18);
    toB.push([i+d1,[[i,fa]]]); toA.push([i+d2,[[i,fb]]]);
    for(const [Q,N] of [[toA,A],[toB,B]]){ const now=Q.filter(m=>m[0]<=i); if(now.length){ for(const m of now) Q.splice(Q.indexOf(m),1); PongNet.remote(N,[].concat(...now.map(m=>m[1]))); } } }
  // everything delivered at the end
  PongNet.remote(A,[].concat(...toA.map(m=>m[1]))); PongNet.remote(B,[].concat(...toB.map(m=>m[1])));
  const R=Pong.replay2(seed,2.16,[1,2],[75,70],hL.slice(0,Math.max(A.g.n,B.g.n)),hR.slice(0,Math.max(A.g.n,B.g.n)),opt.pause?[[resumeAt-1+30,'resume']]:[]);
  return {A,B,R}; }
for(const [seed,opt,name] of [[11,{},'a game'],[12,{},'another'],[13,{pause:1},'with a pause and an agreed resume']]){ const {A,B,R}=run(seed,opt);
  const same=A.g.score===B.g.score&&A.g.n===B.g.n&&A.g.passes===B.g.passes&&A.g.falls===B.g.falls&&A.g.score===R.score&&A.g.n===R.n;
  check(`two phones over a delayed network end with the same game, the one replayed from both palms: ${name}`,same&&!A.lost&&!B.lost,
    `phones ${A.g.score}/${B.g.score} in ${A.g.n}/${B.g.n} steps, replay ${R.score} in ${R.n}; passes ${A.g.passes}; went back ${A.rb}/${B.rb} times, at most ${A.rbMax}/${B.rbMax} steps`); }
console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
