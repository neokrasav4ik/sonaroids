/* The live mode (v1.08, an experiment behind the service screen's switch; the maintainer: «игра готовилась, калибровалась и игралась
   одновременно и постоянно… если существенно меняется звуковой фон комнаты — игра теряет ладонь и/или управление»).
   DSP2 alone in Node on the synthetic microphone (tests/sim_source.js): the room, then a palm waving and holding still, taken away
   for 2 s near the end; in the middle of the game the room changes — in-band noise, noise bursts, a still thing appearing near or
   far, one going away, the speaker-to-microphone gain falling. For each case, with the live mode off (as now) and on: how much of the time the palm is
   seen, how often a palm is seen that is not there, how well the height follows the palm (correlation and the error left after a
   straight-line fit, mm) — before the change and after it.
   Checks: in the quiet room the live mode is as good as the old one; after each change it is no worse, and where the old one breaks
   (noise, a new thing near the palm) it holds. Run: node tests/test_live.js [--table] */
const DSP2=require('../src/11_dsp.js'), makeSimSource=require('./sim_source.js');
const SETS=(process.env.SETS||'').split(',').filter(Boolean).map(z=>z.split('=')), FS=48000, N=512, FPS=FS/N, CAL={k:1.17,o:100-1.17*110,s:0.9}, DUR=48, CHANGE=20, AWAY=[40,44.5];
function wave(u){ return 100+40*Math.sin(2*Math.PI*u/4)+8*Math.sin(2*Math.PI*u/9.3); }
function palm(t){ if(t<4||(t>=AWAY[0]&&t<AWAY[1])) return null;   // the palm comes at 4 s, waves, holds still 30–33 s (where it was), goes away for 2.5 s near the end
  const u=t<30?t-4:t<33?26:t-7; return wave(u)+(t>=30&&t<33?0.2*Math.sin(2*Math.PI*9*t)+0.5*Math.sin(2*Math.PI*0.2*(t-30)):0); }   // a held palm trembles and drifts a little (labelled recordings: its echo changes −25…0 dB over a second, a cup's −30…−55)
const CASES={
  'quiet room':{},
  'noise +20 dB':{noise:t=>t>=CHANGE?10:1},
  'noise +30 dB':{noise:t=>t>=CHANGE?31.6:1,hard:1},   // the palm's echo ~10 dB over this noise: neither mode follows it well — the live one no worse, and no palm that is not there
  'noise bursts':{noise:t=>t>=CHANGE&&(t%2)<0.25?100:1},
  'thing at 20 cm':{extra:t=>t>=CHANGE?[{mm:200,a:0.05}]:[]},   // as loud as the palm
  'thing at 7 cm':{extra:t=>t>=CHANGE?[{mm:70,a:0.05}]:[]},
  'thing goes':{extra:t=>t<CHANGE?[{mm:170,a:0.05}]:[]},
  'loud thing near':{extra:t=>t>=CHANGE?[{mm:220,a:0.2}]:[]},   // four times the palm
  'gain −4 dB':{gain:t=>t>=CHANGE?0.6:1},
};
function run(opts,live){ const src=makeSimSource(palm,Object.assign({palmA:()=>0.05},opts));   // the palm's echo ~42 dB over the empty room, as on the phones (the default 0.25 is far louder)
  DSP2.set('holdfloor',0); DSP2.set('live',live?1:0); if(live) SETS.forEach(([k,v])=>DSP2.set(k,+v)); DSP2.init(FS,'all'); DSP2.setCal(CAL); DSP2.set('autocenter',1);
  const rows=[]; for(let i=0;i<DUR*FPS;i++){ const t=(i+0.5)/FPS; if(Math.abs(t-6)<0.5/FPS) DSP2.set('holdfloor',1); const r=DSP2.frame(src(i,0.25)); if(r) rows.push({t,p:palm(t),...r}); }
  DSP2.set('holdfloor',0); DSP2.set('live',0); return rows; }
function stats(rows,a,b){ const w=rows.filter(r=>r.t>=a&&r.t<b), on=w.filter(r=>r.p!==null), off=w.filter(r=>r.p===null&&r.t>=AWAY[0]+2.5);   // the palm gone 4.5 s: 2.5 s after it went it must not be seen (a thing put down meanwhile is learnt as room in that time)
  const seen=on.filter(r=>r.present), vis=on.length?seen.length/on.length:NaN, fal=off.length?off.filter(r=>r.present).length/off.length:NaN;
  let corr=NaN, err=NaN; if(seen.length>50){ const x=seen.map(r=>r.p), y=seen.map(r=>r.height), n=x.length, mx=x.reduce((u,v)=>u+v)/n, my=y.reduce((u,v)=>u+v)/n;
    let sxy=0,sxx=0,syy=0; for(let i=0;i<n;i++){ sxy+=(x[i]-mx)*(y[i]-my); sxx+=(x[i]-mx)**2; syy+=(y[i]-my)**2; } corr=sxy/Math.sqrt(sxx*syy);
    const k=sxy/sxx; let e=0; for(let i=0;i<n;i++) e+=(y[i]-my-k*(x[i]-mx))**2; err=Math.sqrt(e/n); }
  return {vis,fal,corr,err}; }
const f=v=>isNaN(v)?'  –  ':v.toFixed(2), pc=v=>isNaN(v)?'  – ':(100*v).toFixed(0).padStart(3)+'%';
let ok=true; const out=[];
for(const [name,o] of Object.entries(CASES)){
  const R0=run(o,false), R1=run(o,true), b0=stats(R0,8,CHANGE), a0=stats(R0,CHANGE+4,AWAY[0]), b1=stats(R1,8,CHANGE), a1=stats(R1,CHANGE+4,AWAY[0]), g0=stats(R0,AWAY[0],AWAY[1]), g1=stats(R1,AWAY[0],AWAY[1]);
  out.push(`${name.padEnd(15)} before: off seen ${pc(b0.vis)} corr ${f(b0.corr)} err ${f(b0.err)} | on ${pc(b1.vis)} ${f(b1.corr)} ${f(b1.err)}   after: off seen ${pc(a0.vis)} corr ${f(a0.corr)} err ${f(a0.err)} | on ${pc(a1.vis)} ${f(a1.corr)} ${f(a1.err)}   palm away, seen anyway: off ${pc(g0.fal)} on ${pc(g1.fal)}`);
  // the live mode: no worse before the change; from 4 s after it — seen ≥ 95% of the time, follows (corr ≥ 0.95); 2.5 s after the palm went, it is not seen
  const good=b1.vis>=b0.vis-0.02&&(isNaN(b0.corr)||b1.corr>=b0.corr-0.02)&&(o.hard?a1.vis>=0.9&&a1.corr>=a0.corr-0.02:a1.vis>=0.95&&a1.corr>=0.95)&&!(g1.fal>0.2);
  if(!good){ ok=false; out[out.length-1]+='  FAIL'; }
}
out.forEach(s=>console.log(s)); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
