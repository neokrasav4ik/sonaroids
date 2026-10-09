/* The pong control (src/16_pong_ctl.js, v1.59): the mix the rackets follow sits on the palm as the lab's did (lab/src/087_arcade.js
   mixFrame, run side by side on the same frames) and, since 1.59c, also when the phase creeps, and the calibration's two holds catch the palm where it was held, learn the mix's offset
   while it is still, ignore a shaky palm and a top too close to the low. On synthetic sonar frames. Run: node tests/test_pong_ctl.js */
const Ctl=require('../src/16_pong_ctl.js'), L=require('./pong_lab.js');
let ok=true; const out=[]; const check=(name,good,info)=>{ ok=ok&&good; out.push(`${name}: ${info||''} ${good?'ok':'FAIL'}`); };
const N=512, FS=48000, DTF=N/FS;
let s=11; const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296-0.5; };
/* a palm: a list of [seconds, mm] to go through; the sonar sees its height with a little jitter, the echo's distance with an offset and
   more noise, and the phase («fast») as the height's quick part */
function frames(path,off,jit,gaps){ const fr=[]; let t=0, k=0;
  for(let i=0;i<path.length-1;i++){ const [t0,h0]=path[i], [t1,h1]=path[i+1];
    for(;t<t1;t+=DTF,k++){ const u=(t-t0)/Math.max(1e-9,t1-t0), h=h0+(h1-h0)*u, seen=!(gaps&&k%300<6);
      fr.push({t,r:{present:seen,height:seen?h+rnd()*jit:null,abs:seen?h-off+rnd()*jit*3:null,fast:h*0.9+rnd()*jit*0.5}}); } }
  return fr; }
// 1. the mix: as the lab's (lab/src/087_arcade.js mixFrame, run side by side on the same frames) while the phase doesn't creep; and, since
//    1.59c, it doesn't fall behind a phase that creeps (the lab's lagged 3 s × the creep: at 23 mm/s — 7 cm, Den's 19:41 game)
const mixRun=(creep)=>{ L.P.setFs(); const D=L.P.DSP(), A=L.P.ARC(); D.info=()=>({cal:{s:1}}); const res={lab:[],now:[],palm:[]};
  const fr=frames([[0,120],[2,70],[3.5,70],[4.5,150],[6,150],[8,90],[30,140],[60,80]],18,4,true);
  const c=Ctl.create(); A.game='pong'; A.mxH=null; A.mxF=null; A.mxOff=null; A.mxCal=null; A.mix=null; A.c2=null; A.phase='play';
  A.mxCal=18; A.mxOff=A.mxCal; c.mxCal=18; c.mxOff=c.mxCal;   // the echo reads 18 mm low (see frames)
  fr.forEach((f,i)=>{ const r=Object.assign({},f.r); if(r.present) r.fast=r.fast/0.9*1+creep*f.t; const palm=f.r.present?(f.r.fast/0.9):null;   // the phase: the palm's own height (+ a creep)
    if(r.present) r.height=palm+rnd()*2; L.P.mix(r); Ctl.frame(c,r,N,FS,1,false);
    if(f.t>12&&A.mix!==null&&A.mix!==undefined&&palm!==null){ res.lab.push(A.mix-palm); res.now.push(c.mix-palm); } });
  const md=v=>{ v=v.slice().sort((p,q)=>p-q); return v[v.length>>1]; }; return {lab:md(res.lab),now:md(res.now),n:res.now.length}; };
{ const a=mixRun(0), b=mixRun(23), c=mixRun(-3);
  check('the mix sits on the palm as the lab\'s did while the phase holds still',a.n>4000&&Math.abs(a.now)<3&&Math.abs(a.now-a.lab)<2,`off the palm by ${a.now.toFixed(1)} mm (the lab's ${a.lab.toFixed(1)})`);
  check('a creeping phase doesn\'t lift or lower the rackets (1.59c)',Math.abs(b.now)<5&&Math.abs(c.now)<3,`creep +23 mm/s: ${b.now.toFixed(1)} mm (the lab's mix ${b.lab.toFixed(0)}); −3 mm/s: ${c.now.toFixed(1)} mm (the lab's ${c.lab.toFixed(0)})`); }
// 2. the holds
const run=(path,off,jit)=>{ const c=Ctl.create(); Ctl.start(c); const got=[]; let low=null, top=null, dots=new Set();
  for(const f of frames(path,off,jit)){ Ctl.frame(c,f.r,N,FS,1,false); const r=Ctl.hold(c,f.t); dots.add(r.k); if(r.caught==='low') low=c.lin.b; if(r.caught==='top'){ top=c.lin.t; got.push(f.t); break; } }
  return {c,low,top,t:got[0],dots}; };
{ const r=run([[0,130],[1,70],[3,70],[3.6,150],[6,150]],20,4);
  check('two holds: the low and the top caught where the palm was held',Math.abs(r.low-70)<3&&Math.abs(r.top-150)<3&&r.t<5.5,`low ${r.low&&r.low.toFixed(1)} mm, top ${r.top&&r.top.toFixed(1)} mm, done at ${r.t&&r.t.toFixed(1)} s`);
  check('the mix\'s offset learnt on the holds (height − echo)',Math.abs(r.c.mxCal-20)<3,`${r.c.mxCal&&r.c.mxCal.toFixed(1)} mm (the echo reads 20 mm low)`);
  check('the dots fill up while the palm is held',[1,2,3,4].every(k=>r.dots.has(k)),[...r.dots].sort().join(' '));
  check('the low hold → 8% of the travel, the top one → 75%',Math.abs(Ctl.frac(r.c,r.low)-0.08)<1e-12&&Math.abs(Ctl.frac(r.c,r.top)-0.75)<1e-12,`${Ctl.frac(r.c,100).toFixed(3)} at 100 mm`); }
{ const r=run([[0,130],[1,70],[6,70]],20,24);
  check('a shaky palm is not caught',r.low===null,`±12 mm`); }
{ const r=run([[0,130],[1,70],[3,70],[3.5,95],[6,95],[6.5,150],[8.5,150]],20,4);
  check('the top must be at least 35 mm above the low',Math.abs(r.top-150)<3,`held 25 mm above — waited; then caught ${r.top&&r.top.toFixed(0)} mm`); }
{ const r=run([[0,130],[1,40],[3,40],[3.8,230],[6,230]],20,4);
  check('the travel is at most 160 mm',r.top-r.low===160,`low ${r.low.toFixed(0)}, top ${r.top.toFixed(0)}`); }
{ const c=Ctl.create(); Ctl.start(c); check('while the low hold is caught the rackets wait at the bottom',Ctl.lowStep(c)&&Ctl.holding(c)); }
out.forEach(x=>console.log(x)); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
