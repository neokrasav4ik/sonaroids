/* Wave tuning on the synthetic microphone through the game's own DSP2 and Tune (as on the wave screen):
   empty room 0–4 s, palm at 100 mm 4–5 s, waving 100±50 mm 5–12 s. Tuning runs from 5 s.
   Want: the waved range lands on ~10–90% of the screen, the field is ~110 mm (89 mm of palm travel on 80% of the screen). */
const DSP2=require('../src/11_dsp.js'), Tune=require('../src/12_tune.js'), make=require('./sim_source.js');
const src=make(t=>t<4?null:t<5?100:100+50*Math.sin(2*Math.PI*(t-5)/2));
const PHYS={k:1.17,o:100-1.17*110,s:0.9};
DSP2.init(48000,'all'); DSP2.setCal(PHYS); DSP2.set('autocenter',1);
const T=Tune.create(100,true); let st=null, n=0, ev=0;
for(let i=0;i<Math.round(12*48000/512);i++){ const r=DSP2.frame(src(i)); if(r) st=r; const t=(i+1)*512/48000;
  if(t>=5){ const e=Tune.step(T,512/48000,st,true,d=>DSP2.shift(d)); if(e) ev++; } }
const r=T.last, lo=Tune.fracOf(T,r.lo), hi=Tune.fracOf(T,r.hi);
console.log(`after 7 s of waving: range ${(lo*100).toFixed(0)}–${(hi*100).toFixed(0)}% of the screen (want ~6–90), field ${T.field.toFixed(0)} mm, ${ev} tuning steps, caught: ${T.ok}`);
const ok=T.ok&&lo>0.02&&lo<0.10&&hi>0.86&&hi<0.94&&T.field>95&&T.field<130; console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
/* a small wiggle (±2 cm, as when the hand just rests after a game) must not count as waving and must not shrink the field:
   24 Sep a wiggle after a game shrank it from 118 to 66 mm and the ship got twitchy */
{ const src2=make(t=>t<4?null:100+20*Math.sin(2*Math.PI*t/1.5));
  DSP2.init(48000,'all'); DSP2.setCal(PHYS); DSP2.set('autocenter',1);
  const T2=Tune.create(110,true); let st2=null;
  for(let i=0;i<Math.round(12*48000/512);i++){ const r=DSP2.frame(src2(i)); if(r) st2=r; if((i+1)*512/48000>=5) Tune.step(T2,512/48000,st2,true,d=>DSP2.shift(d)); }
  const ok2=!T2.ok&&Math.abs(T2.field-110)<0.01;
  console.log(`a ±2 cm wiggle: caught ${T2.ok}, field ${T2.field.toFixed(0)} mm (want: not caught, still 110)`); console.log(ok2?'RESULT: ok':'RESULT: FAIL'); if(!ok2) process.exitCode=1; }
/* v1.08/v1.10, the live mode: in flight the screen keeps its bottom just above the palm's floor (Tune.stepLive). A player who follows the
   ship: the game wants the ship at a target (wandering over the screen, now and then at the very bottom or top); the palm goes there, but
   not closer than its floor (the phone's port, the echo's range 45 mm), and pushing at the bottom it overshoots by 1 cm. The maintainer,
   1 Oct: 1.08 chased that overshoot (18:01: the bottom out of reach) and took the middle from the palm's first second (18:22: the palm 3 cm
   too far). Checks, 3 minutes each: the screen settles (its last minute moves ≤ 3 mm); the bottom reached; the palm at the port (45 mm)
   puts the ship at the bottom, but not with 2.5 cm to spare (0–25 mm of height under it) — whether the game began with the bottom out of reach, with the palm far, about right, or with a player who
   never goes under a fifth of the screen */
function player(o0,secs,lowest,fl){ fl=fl||45; const k=1.4, T=Tune.create(85,true), FL=2*T.field/(1+Tune.ASYM), FU=2*Tune.ASYM*T.field/(1+Tune.ASYM); let off=0, atBot=0, n=0, seed=7, off60=null, rS=0;
  const rnd=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }; let tgt=0.5, dt=1/60;
  for(let t=0;t<secs;t+=dt){ if(rnd()<dt/1.5){ const u=rnd(); tgt=u<0.15?0:u>0.85?1:rnd(); if(lowest) tgt=Math.max(lowest,tgt); }
    // the height reads k·range + offset, and near the phone higher than that (1 Oct: up to 17 mm at the floor — the sonar sees the palm weaker there)
    const hOf=r=>k*r+o0+off+0.8*Math.max(0,65-r), want=tgt<0.5?100+(tgt-0.5)*FL:100+(tgt-0.5)*FU, aim=want-(tgt===0?10:0);
    let r=fl; while(r<400&&hOf(r)<aim) r+=0.25; const h=hOf(r);
    Tune.stepLive(T,dt,{present:true,height:h,range:r},d=>{ off+=d; });
    if(t>=secs-60&&off60===null) off60=off;
    if(t>secs-30){ n++; rS+=r; if(Tune.fracOf(T,h)<=0.02) atBot++; } }
  const floorGap=k*fl+o0+off+0.8*Math.max(0,65-fl)-(100-T.field/(1+Tune.ASYM));
  return {off,settle:Math.abs(off-off60),bottom:atBot/n,floorGap,r:rS/n}; }
{ const cases=[['the bottom out of reach',14],['the palm far',-60],['about right',-30],['never under a fifth',-30,0.2],['the port reading 56 mm (iPhone, 18:57), out of reach',14,0,56],['the port reading 56 mm, the palm far',-60,0,56]]; let ok3=true;
  cases.forEach(([name,o0,lo,fl])=>{ const q=player(o0,180,lo,fl); const g=q.settle<=3&&q.floorGap<=0&&q.floorGap>=-25&&(lo||q.bottom>0.05);
    console.log(`the live mode, in flight — ${name}: the screen moved ${q.off.toFixed(1)} mm (the last minute ${q.settle.toFixed(1)}), the floor ${q.floorGap.toFixed(1)} mm against the bottom, the ship at the bottom ${(100*q.bottom).toFixed(0)}%, the palm's range ${q.r.toFixed(0)} mm ${g?'ok':'FAIL'}`); ok3=ok3&&g; });
  console.log(ok3?'RESULT: ok':'RESULT: FAIL'); if(!ok3) process.exitCode=1; }
