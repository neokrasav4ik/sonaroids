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
console.log(`after 7 s of waving: range ${(lo*100).toFixed(0)}–${(hi*100).toFixed(0)}% of the screen (want ~10–90), field ${T.field.toFixed(0)} mm, ${ev} tuning steps, caught: ${T.ok}`);
const ok=T.ok&&lo>0.06&&lo<0.14&&hi>0.86&&hi<0.94&&T.field>95&&T.field<130; console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
