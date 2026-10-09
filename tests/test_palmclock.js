/* The palm clock (src/17_palmclock.js, v1.59l): frames handed over in bunches (the Mi 9 Lite: two at once every 21 ms) — a game step at
   60 Hz still gets a new height every step, only a few ms later than without; frames one by one — nothing added. Run: node tests/test_palmclock.js */
const PC=require('../src/17_palmclock.js');
let ok=true; const out=[]; const check=(name,good,info)=>{ ok=ok&&good; out.push(`${name}: ${info||''} ${good?'ok':'FAIL'}`); };
const N=512, FS=48000, T=1000*N/FS, h=t=>100+40*Math.sin(2*Math.PI*t/800);
let js=3; const jr=()=>{ js=(js*1664525+1013904223)>>>0; return js/4294967296; };
function run(bunch){ const c=PC.create(); let k=0, latest=null; const now=[], raw=[]; let lastRaw=null, lastNow=null, still0=0, still1=0, moving=0;
  for(let i=0;i<60*10;i++){ const tr=i*1000/60+0.3;
    while(true){ const ka=Math.ceil((k+1)/bunch)*bunch*T+2+jr()*2; if(ka>tr) break; const kk=PC.tick(c); PC.push(c,kk,h(kk*T),ka,N,FS); latest=h(kk*T); k++; }
    if(i<60) continue; const p0=latest, p1=PC.at(c,tr);
    if(lastRaw!==null&&Math.abs(h(tr)-h(tr-16.7))>0.5){ moving++; if(p0===lastRaw) still0++; if(Math.abs(p1-lastNow)<1e-9) still1++; }
    lastRaw=p0; lastNow=p1; now.push([tr,p1]); raw.push([tr,p0]); }
  const fit=v=>{ let best=1e9, bd=0; for(let d=0;d<=50;d++){ let e=0; v.forEach(([t,p])=>{ e+=(p-h(t-d))**2; }); if(e<best){ best=e; bd=d; } } return [bd,Math.sqrt(best/v.length)]; };
  const [late,rms]=fit(now), [late0]=fit(raw); return {still0:100*still0/moving, still1:100*still1/moving, late, late0, rms}; }
const m=run(2), e=run(1);
check('a bunch of frames at once: the height still changes every step',m.still0>15&&m.still1<1&&m.late-m.late0<=11&&m.rms<1.5,`two frames every 21 ms: the palm stood on ${m.still0.toFixed(0)}% of steps → ${m.still1.toFixed(0)}%; behind the palm ${m.late0} → ${m.late} ms, off its path by ${m.rms.toFixed(2)} mm`);
check('frames one by one: next to no delay added',e.late-e.late0<=4&&e.rms<1.5,`behind the palm ${e.late0} → ${e.late} ms, off its path by ${e.rms.toFixed(2)} mm`);
{ const c=PC.create(); check('nothing kept yet — no height (the game falls back to the latest)',PC.at(c,100)===null); }
out.forEach(x=>console.log(x)); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
