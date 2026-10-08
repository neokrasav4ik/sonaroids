// SonaPong rules/strategy model (1.58z5–z11, 8 Oct): which tactics pay under which rules.
// Calibrated on Den's 19:31 game (iPhone, field full width, bowl racket, tilt 35, gravity 1.9):
//  - arc height share f of the room (from the low calibration hold to the ceiling): median 0.70, sd(ln f) 0.22;
//  - landing point around the other racket's centre: sd 0.107 screen heights (0 lost balls in ~100 passes at wide
//    rackets, 3 in ~50 at 40–50%).
// A pass: f = fc·k·exp(2u + v), u ~ N(0, 0.05·s) (swing strength error — moves both height and range), v ~ N(0, 0.195·s);
// landing offset = (screen width / 2)·(k·exp(2u) − 1); lost if |offset| > racket half-width; f > 1 — ceiling touch
// (no points, the series restarts, the ball lands at random ±0.15); flight time 2·sqrt(2·f·room/g).
// Strategy: fc — the arc height of the centre pass the tilt setting gives; k — how the player aims (1 to the centre,
// >1 harder/longer); s — hand precision (1 = Den on 8 Oct). Rules: narrowing every minute 80% → 40% (1/8 of the start
// per minute), 3 balls, 5 minutes; points 100·f^pw / width share; series +st per clean pass up to cap passes.
// Run: node lab/tools/sim/pong_rules.js            (all tables)
//      node lab/tools/sim/pong_rules.js series     (only the series comparison)
const G=1.9, ROOM=0.69, AR=2.16, HW1=AR/4;
let seed=3; const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
const gz=()=>Math.sqrt(-2*Math.log(rnd()+1e-12))*Math.cos(2*Math.PI*rnd());
function game(S){ let t=0,lives=3,score=0,passes=0,ceils=0,series=0;
  while(t<300&&lives>0){ const w=Math.max(0.4,0.8-0.1*Math.floor(t/60));
    const u=gz()*0.05*S.s, f=S.fc*S.k*Math.exp(2*u+gz()*0.195*S.s), touched=f>1;
    t+=2*Math.sqrt(2*Math.min(f,1)*ROOM/G)+0.05;
    const off=AR/2*(S.k*Math.exp(2*u)-1)+(touched?gz()*0.15:0);
    if(Math.abs(off)>HW1*w){ lives--; series=0; t+=3; continue; }
    passes++; if(touched){ ceils++; series=0; continue; }
    series++; score+=100*Math.pow(f,S.pw||2)/w*(S.combo?1+(S.st||0.1)*Math.min(S.cap||10,series-1):1); }
  return {score,passes,ceils,lost:3-lives,t:Math.min(t,300)}; }
function avg(S,n=3000){ const a={score:0,passes:0,ceils:0,lost:0,t:0}, sc=[]; let full=0;
  for(let i=0;i<n;i++){ const r=game(S); sc.push(r.score); if(r.t>=300) full++; for(const q in a) a[q]+=r[q]/n; }
  sc.sort((x,y)=>x-y); a.p10=sc[Math.floor(n*0.1)]; a.p90=sc[Math.floor(n*0.9)]; a.full=full/n; return a; }
const fmt=(nm,a)=>console.log(nm.padEnd(46),String(Math.round(a.score)).padStart(6),'('+Math.round(a.p10)+'–'+Math.round(a.p90)+')',
  'пасов',Math.round(a.passes),'потолок',Math.round(a.ceils),'упало',a.lost.toFixed(1),'игра',Math.round(a.t)+'с','до конца',Math.round(a.full*100)+'%');
const B={k:1,s:1,pw:3,combo:1,st:0.1,cap:5};   // «Правила для баланса» (1.58z11)
const only=process.argv[2];
if(!only||only==='tactics'){ console.log('== правила для баланса (очки за высоту круче, короткая серия)');
  for(const fc of [0.55,0.65,0.72,0.8,0.88]) fmt('пас в центр на '+Math.round(fc*100)+'% высоты',avg({...B,fc}));
  for(const k of [0.93,1.07,1.15]) fmt('дуга 72%, бью '+(k<1?'слабее':'сильнее')+' ×'+k,avg({...B,fc:0.72,k}));
  for(const s of [0.85,1.2]) fmt('дуга 72%, рука '+(s<1?'точнее':'неточнее')+' ×'+s,avg({...B,fc:0.72,s})); }
if(!only||only==='series'){ console.log('== серия: как меняет тактику (очки за высоту круче)');
  const V=[['нет',{combo:0}],['длинная: +10% до ×2',{combo:1,st:0.1,cap:10}],['короткая: +10% до ×1,5',{combo:1,st:0.1,cap:5}],['мягкая: +5% до ×1,5',{combo:1,st:0.05,cap:10}]];
  for(const [nm,X] of V){ const r={}; for(const fc of [0.65,0.72,0.8,0.88]) r[fc]=avg({...B,...X,fc}).score;
    const soft=avg({...B,...X,fc:0.72,k:0.93}).score, pr=avg({...B,...X,fc:0.72,s:0.85}).score, im=avg({...B,...X,fc:0.72,s:1.2}).score, b=Math.max(r[0.65],r[0.72]);
    console.log(nm.padEnd(26),'72%',Math.round(r[0.72]),'80%',Math.round((r[0.8]/b-1)*100)+'%','88%',Math.round((r[0.88]/b-1)*100)+'%','недобить',Math.round((soft/r[0.72]-1)*100)+'%','точная/неточная',(pr/im).toFixed(2)); } }
if(!only||only==='points'){ console.log('== рост очков с высотой (короткая серия)');
  for(const pw of [2,3]) for(const fc of [0.72,0.8]) fmt('доля^'+pw+', пас на '+Math.round(fc*100)+'%',avg({...B,pw,fc})); }
