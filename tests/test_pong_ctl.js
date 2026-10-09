/* The pong control (src/16_pong_ctl.js, v1.59): the mix the rackets follow is the lab's mix number for number (lab/src/087_arcade.js
   mixFrame, run side by side on the same frames), and the calibration's two holds catch the palm where it was held, learn the mix's offset
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
// 1. the mix: the same numbers as the lab's, through the holds, the countdown and the play, with and without the offset from the holds
{ L.P.setFs(); const D=L.P.DSP(), A=L.P.ARC(); D.info=()=>({cal:{s:0.9}}); let worst=0, n=0;
  for(const learnt of [true,false]){ const fr=frames([[0,120],[2,70],[3.5,70],[4.5,150],[6,150],[8,90],[30,140],[60,80]],18,4,true);
    const c=Ctl.create(); A.game='pong'; A.mxH=null; A.mxF=null; A.mxOff=null; A.mxCal=null; A.mix=null; A.c2={step:1}; A.phase='wave';
    fr.forEach((f,i)=>{ const ph=f.t<6?'wave':f.t<9?'count':'play'; A.phase=ph; if(ph!=='wave') A.c2=null;
      if(learnt&&i===Math.floor(6/DTF)){ A.mxCal=-17.5; A.mxOff=A.mxCal; A.mxH=null; c.mxCal=-17.5; c.mxOff=c.mxCal; c.mxH=null; }
      L.P.mix(f.r); Ctl.frame(c,f.r,N,FS,0.9,ph==='count');
      if(A.mix!==null&&A.mix!==undefined){ n++; worst=Math.max(worst,Math.abs(A.mix-c.mix)); } }); }
  check('the mix is the lab\'s, number for number',n>5000&&worst===0,`${n} frames, the largest difference ${worst}`); }
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
