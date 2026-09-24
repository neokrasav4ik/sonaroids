/* "Is the probe heard?" — decided by how loud the probe itself is, not by signal-to-noise:
   a noisy room with the sound on must go on, a muted phone must be sent to the sound screens.
   Uses the page's own probeStats on the synthetic microphone (at gain 0.25, as the page measures first). */
const fs=require('fs'), path=require('path'), make=require('./sim_source.js');
const src=fs.readFileSync(path.join(__dirname,'..','src','20_sonar.js'),'utf8');
const stats=new Function(src.slice(src.indexOf('  function probeStats'),src.indexOf('  function probeSNR'))+'return probeStats;')();
const QUIET=+src.match(/QUIET_LVL=(-?[\d.]+)/)[1], G=0.25;
function decide(scale,noise,hand){ const s=make(hand||(()=>null)), fr=[]; let seed=7;
  for(let i=0;i<8;i++){ const f=s(i+200).map(v=>v*scale); for(let n=0;n<512;n++){ seed=(seed*1664525+1013904223)>>>0; f[n]+=(seed/4294967296-0.5)*noise*0.0141; } fr.push(f); }
  const st=stats(fr,48000,18300,20450), lvl=st.line-20*Math.log10(G); return {snr:st.snr,lvl,quiet:lvl<QUIET}; }
const cases=[['sound on, quiet room',1,0,false],['sound on, a palm waving next to the phone (after a game over)',1,0,false,t=>100+60*Math.sin(t*9)],['sound on, noisy room (like 24 Sep, 33 dB)',1,0.02,false],['media volume at zero (probe −30 dB)',0.03,0,true],['volume very low (−20 dB)',0.1,0,true]];
let ok=true; cases.forEach(([name,sc,nz,want,hand])=>{ const d=decide(sc,nz,hand); const good=d.quiet===want; ok=ok&&good;
  console.log(`${good?'ok  ':'FAIL'} ${name}: level ${d.lvl.toFixed(1)} dB, SNR ${d.snr.toFixed(1)} dB → ${d.quiet?'barely heard':'go on'}`); });
console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
