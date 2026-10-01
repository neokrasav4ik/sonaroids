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
/* v1.08–v1.12, the live mode (auto-calibration): in flight the palm plays at a comfortable distance and still gets to the bottom
   (Tune.stepLive). A player who follows the ship: the game wants the ship at a target (wandering over the screen, now and then at the very
   bottom or top); the palm goes where the screen puts that target, but not closer than its floor (the phone's port), and its height reads
   higher near the phone than its distance says (1 Oct: up to 17 mm at the floor). The maintainer, 1 Oct: the bottom out of reach (18:01),
   the palm too far (18:22, 19:41). Checks, 4 minutes each, from the start 1.13 sets (the middle at 8.2 cm by the range), with the range reading a centimetre short or
   long, with a port reading 56 mm, and with a player who never goes under a fifth: the screen settles (its last minute: it moves ≤ 6 mm — 0.1 mm a second, not felt), the palm's middle (its last minute) within 6.8–9.2 cm, and never under 2.4 cm over the port,
   the ship gets to the bottom with the palm at the port (≥ 70% of those moments, unless the player never goes low) */
function player(o0,secs,lowest,fl){ fl=fl||45; const k=1.4, T=Tune.create(85,true), FU=2*Tune.ASYM*T.field/(1+Tune.ASYM); let off=0, seed=7, off60=null, rs=[], port=0, portBot=0;
  const rnd=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }; let tgt=0.5, dt=1/60;
  const hOf=r=>k*r+o0+off+0.8*Math.max(0,65-r);   // the height reads k·range + offset, and higher near the phone
  for(let t=0;t<secs;t+=dt){ if(rnd()<dt/1.5){ const u=rnd(); tgt=u<0.15?0:u>0.85?1:rnd(); if(lowest) tgt=Math.max(lowest,tgt); }
    let r=fl; while(r<400&&Tune.fracOf(T,hOf(r))<(tgt===0?0:tgt)) r+=0.25; if(tgt===0) r=Math.max(fl,r-7);   // pushing at the bottom: 7 mm closer still
    const h=hOf(r); Tune.stepLive(T,dt,{present:true,height:h,range:r},d=>{ off+=d; });
    if(t>=secs-60&&off60===null) off60=off;
    if(t>secs-60){ rs.push(r); } if(t>secs-30){ if(r<=fl+3){ port++; if(Tune.fracOf(T,h)<=0.02) portBot++; } } }
  rs.sort((a,b)=>a-b); return {off,settle:Math.abs(off-off60),mid:rs[rs.length>>1],port:port?portBot/port:null,fl:T.fl}; }
{ const cases=[['as set at the start (8.2 cm in the middle)',-15],['the range reading 1 cm short',0],['the range reading 1 cm long',-30],['the port reading 56 mm',-15,0,56],['never under a fifth',-15,0.2]]; let ok3=true;   // v1.13: the start is set by the range (o = 100 − k·82); a phone's range may be off by a centimetre
  cases.forEach(([name,o0,lo,fl])=>{ const q=player(o0,240,lo,fl); const g=q.settle<=6&&q.mid>=Math.max(68,(fl||45)+24)&&q.mid<=Math.max(92,(fl||45)+50)&&(lo||(q.port!==null&&q.port>=0.7));
    console.log(`the live mode, in flight — ${name}: the screen moved ${q.off.toFixed(1)} mm (the last minute ${q.settle.toFixed(1)}), the palm's middle ${q.mid.toFixed(0)} mm, at the port the ship at the bottom ${q.port===null?'–':(100*q.port).toFixed(0)+'%'}, the lower half's travel ${q.fl.toFixed(0)} mm ${g?'ok':'FAIL'}`); ok3=ok3&&g; });
  console.log(ok3?'RESULT: ok':'RESULT: FAIL'); if(!ok3) process.exitCode=1; }
