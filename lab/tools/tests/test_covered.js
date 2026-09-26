/* Закрытый динамик (с 26.09): ладонь вплотную или пальцы глушат прямой сигнал на ~30 дБ, но зонд в микрофоне громкий (отражение).
   Синтетика с зондом приложения: пусто 0–3 с, ладонь ходит 100 ± 50 мм с 5 с, на 12–17 с прямой сигнал ослаблен в 30 раз
   и рядом сильное отражение (ладонь у самого торца). Движок не должен «переезжать» на чужой пик, не должен объявлять пропажу зонда,
   должен пометить это «закрыто», а после — снова следить за ладонью. Запуск: node tests/test_covered.js */
const C=require('../common');
const SR=48000, N=512, js=C.appJs(), FLO=+js.match(/F_LO=(\d+)/)[1], df=SR/N, kLo=Math.ceil(FLO/df), kHi=Math.floor(20500/df), ks=[];
for(let k=kLo;k<=kHi;k++) ks.push(k); const M=ks.length;
const pr=new Float64Array(N); let mx=0; for(let n=0;n<N;n++){ let s=0; for(let q=0;q<M;q++) s+=Math.cos(2*Math.PI*ks[q]*n/N+Math.PI*q*q/M); pr[n]=s; mx=Math.max(mx,Math.abs(s)); }
for(let n=0;n<N;n++) pr[n]=pr[n]/mx*0.9*0.25;
const P={}; for(const k of ks){ let re=0,im=0; for(let n=0;n<N;n++){ re+=pr[n]*Math.cos(2*Math.PI*k*n/N); im-=pr[n]*Math.sin(2*Math.PI*k*n/N); } P[k]=[re,im]; }
const hTrue=t=>t<3?null:t<5?100:100+50*Math.sin(2*Math.PI*(t-5)/6), cov=t=>t>=12&&t<17, dDir=37.3, T=26;
const x=new Float32Array(Math.round(T*SR/N)*N); let seed=11;
for(let f=0;f<x.length/N;f++){ const t=(f+0.5)*N/SR, h=hTrue(t), paths=[{d:dDir,a:cov(t)?1/30:1},{d:dDir+62,a:0.35}];
  if(cov(t)) paths.push({d:dDir+30,a:0.5}); else if(h!==null) paths.push({d:dDir+2*h/1000/343*SR,a:0.25});
  for(const p of paths) for(const k of ks){ const a=-2*Math.PI*k*p.d/N, c=Math.cos(a), s=Math.sin(a), re=(P[k][0]*c-P[k][1]*s)*2/N*p.a, im=(P[k][0]*s+P[k][1]*c)*2/N*p.a;
    for(let n=0;n<N;n++) x[f*N+n]+=re*Math.cos(2*Math.PI*k*n/N)-im*Math.sin(2*Math.PI*k*n/N); }
  for(let n=0;n<N;n++){ seed=(seed*1664525+1013904223)>>>0; x[f*N+n]+=(seed/4294967296-0.5)*4e-4; } }
const D=C.makeDSP(); D.init(SR,'all'); D.setCal(C.physCal()); D.set('autocenter',1);
const o=[]; let covN=0, covIn=0, lostAt=null;
for(let k=0;k<x.length/N;k++){ const r=D.frame(x.subarray(k*N,(k+1)*N)), i=D.info(), t=(k+1)*N/SR; if(r) o.push(Object.assign({t},r));
  if(i.covered){ covN++; if(cov(t)) covIn++; } if(i.lost&&lostAt===null) lostAt=t; }
const inf=D.info(), after=o.filter(r=>r.t>=19&&r.present), L=after.map(r=>hTrue(r.t)), H=after.map(r=>r.height);
const m=a=>a.reduce((u,v)=>u+v,0)/a.length, ml=m(L), mh=m(H); let sxy=0,sxx=0,syy=0; for(let i=0;i<L.length;i++){ sxy+=(L[i]-ml)*(H[i]-mh); sxx+=(L[i]-ml)**2; syy+=(H[i]-mh)**2; }
const c=sxy/Math.sqrt(sxx*syy), covShare=covIn/Math.round(5*SR/N);
console.log(`переездов ${inf.relocks} (нужно 0) | зонд пропал: ${lostAt?lostAt.toFixed(1)+' с':'нет'} (нужно нет) | «закрыто» на 12–17 с: ${(100*covShare).toFixed(0)}% (нужно ≥ 80%), вне: ${covN-covIn} кадров | после: по форме ${c.toFixed(3)} (нужно ≥ 0.95)`);
const ok=inf.relocks===0&&lostAt===null&&covShare>=0.8&&covN-covIn<60&&c>=0.95;
console.log(ok?'ИТОГ: ok':'ИТОГ: FAIL'); process.exitCode=ok?0:1;
