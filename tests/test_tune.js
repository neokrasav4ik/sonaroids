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
/* v1.08, the live mode: in flight the range is followed slowly (Tune.stepLive). Synthetic heights straight in (no sonar): the palm waves
   100±40 mm, then its whole range drifts 30 mm up (the phone moved). Each second ≤ 1 mm of shift and of field; after a minute the middle has
   followed most of the drift; a palm that only wiggles (±1.5 cm) changes nothing */
{ const T3=Tune.create(100,true); let off=0, maxStep=0, dt=1/60; const sh=d=>{ off+=d; maxStep=Math.max(maxStep,Math.abs(d)); };
  for(let t=0;t<90;t+=dt){ const h=100+40*Math.sin(2*Math.PI*t/4)+(t>20?30:0)+off; Tune.stepLive(T3,dt,{present:true,height:h},sh); }
  const T4=Tune.create(100,true); let off4=0; for(let t=0;t<60;t+=dt) Tune.stepLive(T4,dt,{present:true,height:100+15*Math.sin(2*Math.PI*t/2)},d=>{ off4+=d; });
  const ok3=maxStep<=1.0001&&off<-20&&off>-35&&T3.field>=50&&T3.field<=120&&off4===0&&T4.field===100;
  console.log(`the live mode, in flight: a 30 mm drift followed by ${(-off).toFixed(1)} mm in 70 s, the biggest step ${maxStep.toFixed(2)} mm, field ${T3.field.toFixed(0)} mm; a ±1.5 cm wiggle moved ${off4.toFixed(1)} mm`);
  console.log(ok3?'RESULT: ok':'RESULT: FAIL'); if(!ok3) process.exitCode=1; }
