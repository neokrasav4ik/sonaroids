/* The probe level fit (src/18_level.js, v1.60z), shared by the game and the lab: a quiet probe is turned up as before; an overloaded
   microphone and a speaker that distorts at the top are turned DOWN. Simulated phones: the microphone hears the probe at gain g with a
   signal-to-noise ratio snr(g) and a peak peak(g). Run: node tests/test_level.js */
const LF=require('../src/18_level.js');
let ok=true; const out=[]; const check=(n,g,i)=>{ ok=ok&&g; out.push(`${n}: ${i||''} ${g?'ok':'FAIL'}`); };
function fit(snr,peak,g0){ const h=[]; let g=g0||0.25; for(let k=0;k<10;k++){ h.push({g,snr:snr(g),peak:peak(g)}); const d=LF.next(h); if(d.done) return {g:d.g,h,d}; g=d.g; } return {g,h,d:{done:false}}; }
const db=x=>20*Math.log10(x);
// 1. a quiet phone (the usual): SNR grows with the gain, no distortion — goes up to the top, as before
{ const r=fit(g=>45+db(g/0.3),g=>0.024*g/0.3); check('a quiet probe is turned up to the top',Math.abs(r.g-0.3)<1e-6,`kept ${r.g}, tries ${r.h.length}`); }
// 2. plenty of signal: turned down to the target (as before)
{ const r=fit(g=>62+db(g/0.3),g=>0.02*g/0.3); check('plenty of signal: down to the target',r.g<0.1&&r.g>0.04,`kept ${r.g.toFixed(3)}`); }
// 3. 100% media volume (16:38): 10× louder, the speaker's distortion grows with it — SNR best around a quarter of the gain
{ const snr=g=>{ const clean=45+db(g/0.3)+10, dist=35-2*db(g/0.3)-10; return -10*Math.log10(Math.pow(10,-clean/10)+Math.pow(10,-dist/10)); }; const r=fit(snr,g=>0.25*g/0.3,0.25);
  check('an overloaded microphone: turned down',r.g<=0.1,`kept ${r.g.toFixed(3)} (snr ${snr(r.g).toFixed(1)} dB vs ${snr(0.3).toFixed(1)} at the top), tries ${r.h.length}: ${r.h.map(q=>q.g.toFixed(3)+'→'+q.snr.toFixed(0)).join(' ')}`); }
// 4. loud but not overloaded, distortion at the top: the half-step down finds a cleaner level
{ const snr=g=>{ const clean=50+db(g/0.3), dist=40-2*db(g/0.3); return -10*Math.log10(Math.pow(10,-clean/10)+Math.pow(10,-dist/10)); }; const r=fit(snr,g=>0.05*g/0.3,0.3);
  check('distortion at the top: a lower, cleaner gain is kept',r.g<0.3&&snr(r.g)>snr(0.3)+1,`kept ${r.g.toFixed(3)} (${snr(r.g).toFixed(1)} dB vs ${snr(0.3).toFixed(1)}), tries ${r.h.length}`); }
// 5. at most 6 measurements
{ const r=fit(g=>30+5*Math.sin(g*50),g=>0.05); check('never more than 6 measurements',r.h.length<=6,`${r.h.length}`); }
// 6. very quiet even at the top, and lower is worse: stays at the top and says so
{ const r=fit(g=>30+db(g/0.3),g=>0.005*g/0.3); check('too quiet: stays at the top and says so',Math.abs(r.g-0.3)<1e-6&&r.d.atMax,`kept ${r.g}, atMax ${r.d.atMax}`); }
console.log(out.join('\n')); console.log('RESULT:',ok?'ok':'FAIL'); process.exit(ok?0:1);
