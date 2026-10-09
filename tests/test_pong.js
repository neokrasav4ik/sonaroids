/* The pong core (src/15_pong.js, v1.59): the same game as the lab's SonaPong it was moved from (lab/src/087_arcade.js, «World for
   balance → Endless»: the two run side by side step by step on the same palm and must not differ in a single bit), deterministic,
   the world's rules, and a bot plays real rallies on it. Run: node tests/test_pong.js */
const Pong=require('../src/15_pong.js'), B=require('./pong_bot.js'), L=require('./pong_lab.js');
let ok=true; const out=[]; const check=(name,good,info)=>{ ok=ok&&good; out.push(`${name}: ${info||''} ${good?'ok':'FAIL'}`); };
function rngOf(seed){ let a=seed>>>0; return function(){ a=(a+0x6D2B79F5)>>>0; let t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
// 1. the lab and the core side by side: three screen shapes, all four sensitivities, the palm lost now and then
{ let same=0, games=0, steps=0, passes=0, why='';
  for(let seed=1;seed<=12;seed++){ const ar=[844/390,667/375,2.0][seed%3], sens=seed%4;
    const g=Pong.create(seed,ar,sens), bot=B.makeBot(seed*7+3,0.4+0.1*(seed%6)), A=L.setup(ar,sens,rngOf(seed)); let bad='';
    for(let n=1;n<=60*600&&g.state!=='over'&&!A.over;n++){ const h=(n%400<5)?null:bot(g); Pong.step(g,h); L.step(A,n,h); steps++;
      const lb=A.balls[0], cb=g.ball;
      if(!!lb!==!!cb){ bad='a ball in one only, step '+n; break; }
      if(lb&&cb&&(lb.x!==cb.x||lb.y!==cb.y||(lb.vx||0)!==cb.vx||(lb.vy||0)!==cb.vy)){ bad='the ball differs, step '+n; break; }
      if((A.score||0)!==g.score||A.py!==g.py){ bad='score or rackets differ, step '+n; break; } }
    games++; if(!bad&&A.over===(g.state==='over')&&A.falls===g.falls&&A.passes===g.passes){ same++; passes+=g.passes; } else why=why||`seed ${seed}: ${bad||'the end differs'}`; }
  check('the core plays the lab\'s game bit for bit',same===games,`${same} of ${games} games the same (${steps} steps, ${passes} passes)${why?' — '+why:''}`); }
// 2. deterministic: the same seed and palm — the same game; a replay; another seed — other serves
{ const a=B.play(42,844/390,1,0.6), b=B.play(42,844/390,1,0.6), r=Pong.replay(42,844/390,1,a.hands), c=B.play(43,844/390,1,0.6);
  check('same seed and palm → same game',a.g.score===b.g.score&&a.g.t===b.g.t&&a.g.passes===b.g.passes,`score ${a.g.score}, ${a.g.t.toFixed(1)} s, ${a.g.passes} passes`);
  check('a replay from the palm gives the same game',r.score===a.g.score&&r.t===a.g.t&&r.state==='over',`${r.score}`);
  check('another seed → another game',c.g.score!==a.g.score||c.g.t!==a.g.t); }
{ let L0=0, R0=0; for(let s=1;s<=200;s++){ const g=Pong.create(s,2.16,1); for(let i=0;i<20;i++) Pong.step(g,0.2); g.fx.length; if(g.ball&&g.ball.to===1) L0++; else R0++; }
  check('the serve comes from either top corner',L0>70&&R0>70,`from the left ${L0}, from the right ${R0} of 200`); }
// 3. the world's rules
{ const g=Pong.create(1,2.16,1); g.respawn=1e9; const ks=[]; for(let i=0;i<60*200;i++){ Pong.step(g,0.3); if(g.events.indexOf('narrow')>=0) ks.push(g.t.toFixed(2)+':'+g.k); }
  check('the rackets narrow every 30 s by an eighth, without end',ks.length===6&&ks[0]==='30.00:0.875'&&Math.abs(g.k-Math.pow(0.875,6))<1e-12,`${ks.length} times by 200 s, now ${(Pong.width(g)*100).toFixed(0)}% of the half-field`);
  check('the multiplier for narrow rackets stops at ×2',Math.abs(Pong.mult(g)-2)<1e-12,`×${Pong.mult(g).toFixed(2)} at ${(Pong.width(g)*100).toFixed(0)}%`); }
{ const p=f=>Pong.ptsOf(f), v=[p(0.5),p(0.7),p(0.85),p(1)].map(x=>Math.round(x));
  check('points: the cube and the hill near the ceiling',v.join()==='13,34,161,300',`half the height ${v[0]}, 70% ${v[1]}, 85% ${v[2]}, the ceiling ${v[3]}`); }
{ const g=Pong.create(1,2.16,1), T=Pong.TUNE, lo=Pong.padOf(g,T.CB), hi=Pong.padOf(g,T.CT);
  check('the palm moves the rackets in proportion: the low hold at 8% of the travel, the top one at 75%',Math.abs(lo-(T.PAD_LO-0.08*0.4))<1e-12&&Math.abs(hi-(T.PAD_LO-0.75*0.4))<1e-12&&Pong.padOf(g,-5)===T.PAD_MAX&&Pong.padOf(g,9)===T.PAD_MIN,`low ${lo.toFixed(3)}, top ${hi.toFixed(3)} of the screen`); }
{ const g=Pong.create(9,2.16,1); let n=0; while(g.state!=='over'&&n<60*600){ Pong.step(g,null); n++; }
  check('without a palm the balls are lost and the game ends after five',g.state==='over'&&g.falls===5&&g.passes===0,`${g.t.toFixed(0)} s`); }
// 4. a bot plays real rallies; the rackets narrow while it plays
{ const med=x=>{ const q=x.slice().sort((p,q)=>p-q); return q[q.length>>1]; }, R=[]; for(let i=0;i<16;i++) R.push(B.play(500+i,844/390,1,0.6).g);
  const t=med(R.map(g=>g.t))/60, p=med(R.map(g=>g.passes)), w=med(R.map(g=>Pong.width(g))), c=R.reduce((s,g)=>s+g.ceils,0);
  check('a bot plays rallies until the narrow rackets beat it',t>=0.7&&t<=6&&p>=20&&w<0.8&&c>0,`median ${t.toFixed(1)} min, ${p} passes, ends at ${(w*100).toFixed(0)}% width; ${c} ceiling touches in 16 games`); }
out.forEach(x=>console.log(x)); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
