/* Синтетическая запись с ТЕКУЩИМ зондом приложения (формула как в makeProbe, нижний край — из F_LO приложения):
   пусто 0–3 с, рука 100 мм 3–5, синусоида 100±50 мм 5–11, держит 100 мм 11–14, убрана 14–16.5, с 16.5 с зонд «ушёл в Bluetooth».
   Пишет tools/out/synth.bin (float32, 48 кГц) и сразу проверяет: узнаёт ли движок зонд, как следит, замечает ли пропажу.
   Нужен тестам test_log.js, test_probe_lost.js, test_autolevel.js. Запуск: node synth_probe.js */
const C=require('./common'), fs=require('fs'), path=require('path');
const js=C.appJs(), FLO=+js.match(/F_LO=(\d+)/)[1];
const SR=48000,N=512,df=SR/N,kLo=Math.ceil(FLO/df),kHi=Math.floor(20500/df),ks=[]; for(let k=kLo;k<=kHi;k++) ks.push(k); const M=ks.length;
const pr=new Float64Array(N); let mx=0; for(let n=0;n<N;n++){ let s=0; for(let q=0;q<M;q++) s+=Math.cos(2*Math.PI*ks[q]*n/N+Math.PI*q*q/M); pr[n]=s; mx=Math.max(mx,Math.abs(s)); }
for(let n=0;n<N;n++) pr[n]=pr[n]/mx*0.9*0.25;
const Pre=new Float64Array(N),Pim=new Float64Array(N);
for(const k of ks){ let re=0,im=0; for(let n=0;n<N;n++){ re+=pr[n]*Math.cos(2*Math.PI*k*n/N); im-=pr[n]*Math.sin(2*Math.PI*k*n/N); } Pre[k]=re; Pim[k]=im; }
function frameOf(paths,noise,seed){ const out=new Float32Array(N); let s=seed;
  for(const p of paths) for(const k of ks){ const a=-2*Math.PI*k*p.d/N, c=Math.cos(a), sn=Math.sin(a), re=(Pre[k]*c-Pim[k]*sn)*2/N*p.a, im=(Pre[k]*sn+Pim[k]*c)*2/N*p.a;
    for(let n=0;n<N;n++) out[n]+=re*Math.cos(2*Math.PI*k*n/N)-im*Math.sin(2*Math.PI*k*n/N); }
  for(let n=0;n<N;n++){ s=(s*1664525+1013904223)>>>0; out[n]+=(s/4294967296-0.5)*noise; } return out; }
const hTrue=t=>t<3?null:t<5?100:t<11?100+50*Math.sin(2*Math.PI*(t-5)/6):t<14?100:null;
const frames=[], dDir=37.3;
for(let f=0;f<Math.round(20*SR/N);f++){ const t=(f+0.5)*N/SR, h=hTrue(t), gone=t>=16.5;
  const p=gone?[]:[{d:dDir,a:1},{d:dDir+62,a:0.35}]; if(h!==null&&!gone) p.push({d:dDir+2*h/1000/343*SR,a:0.25}); frames.push(frameOf(p,4e-4,f*7+1)); }
fs.mkdirSync(C.OUT,{recursive:true});
const all=new Float32Array(frames.length*N); frames.forEach((fr,i)=>all.set(fr,i*N)); fs.writeFileSync(path.join(C.OUT,'synth.bin'),Buffer.from(all.buffer));
console.log(`зонд приложения: ${M} частот, ${(kLo*df/1000).toFixed(2)}–${(kHi*df/1000).toFixed(2)} кГц → записано out/synth.bin (${(all.length/SR).toFixed(1)} с)`);
const DSP2=C.makeDSP(), calCompute=C.calCompute();
DSP2.init(SR,'all'); let o=C.pass(DSP2,all); const inf=DSP2.info(), W=(a,b)=>o.filter(r=>r.t>=a&&r.t<b);
const cal=calCompute(W(9.2,9.8),W(6.2,6.8),W(5.2,11)); DSP2.init(SR,'all'); DSP2.setCal(cal); o=[]; let lostAt=null;
for(let k=0;k<frames.length;k++){ const r=DSP2.frame(frames[k]); if(r) o.push(Object.assign({t:(k+1)*N/SR},r)); if(lostAt===null&&DSP2.info().lost) lostAt=(k+1)*N/SR; }
const e=o.filter(r=>r.t>=5.3&&r.t<11&&r.present).map(r=>Math.abs(r.height-hTrue(r.t))).sort((a,b)=>a-b);
const pres=(a,b)=>{ const q=o.filter(r=>r.t>=a&&r.t<b); return (100*q.filter(r=>r.present).length/q.length).toFixed(0)+'%'; };
const ok=inf.prom>20&&e[e.length>>1]<10&&pres(0.8,3)==='0%'&&lostAt!==null&&lostAt>16.5;
console.log(`движок узнал зонд: ${inf.prom.toFixed(1)} дБ | слежение: медиана ${e[e.length>>1].toFixed(1)} мм | рука видна: пусто ${pres(0.8,3)}, ведёт ${pres(5.3,11)}, держит ${pres(11,14)} | пропажа зонда в 16.5 → замечена ${lostAt===null?'никогда':lostAt.toFixed(2)+' с'}`);
console.log(ok?'ИТОГ: ok':'ИТОГ: ПРОВАЛ'); process.exitCode=ok?0:1;
