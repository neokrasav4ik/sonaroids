/* Band equalization (v0.20): a probe that reaches the microphone 30 dB weaker at the top of the band (like the OnePlus and Redmi)
   switches it on and still finds the direct sound; a flat one (like the iPhone) leaves it off. Run: node tests/test_eq.js */
const DSP2=require('../src/11_dsp.js');
function run(slopeDb){ const N=512, fs=48000, df=fs/N, k0=Math.ceil(18300/df), k1=Math.floor(20500/df), M=k1-k0+1, d=100;
  DSP2.init(fs,'all'); let seed=7; const rnd=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296-0.5; };
  for(let f=0;f<80;f++){ const x=new Float32Array(N);
    for(let n=0;n<N;n++){ let v=0; for(let q=0;q<M;q++){ const a=Math.pow(10,-slopeDb*q/(M-1)/20); v+=a*Math.cos(2*Math.PI*(k0+q)*(n-d)/N+Math.PI*q*q/M); } x[n]=0.02*v/M+1e-4*rnd(); }
    DSP2.frame(x); }
  return DSP2.info(); }
const a=run(30), b=run(5);
const ok=a.eq===true&&b.eq===false&&a.d0!==null&&b.d0!==null&&a.d0===b.d0;
console.log(`probe 30 dB weaker at the top: equalizer ${a.eq?'on':'off'} (spread ${a.eq_db.toFixed(1)} dB), direct at ${a.d0} | nearly flat: ${b.eq?'on':'off'} (${b.eq_db.toFixed(1)} dB), direct at ${b.d0}`);
console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
