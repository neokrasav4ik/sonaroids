/* Сдвиг всего отклика без провала входа (с 26.09, v0.36): в партиях «в руке» (iPhone 10:29 — на 256 отсчётов, OnePlus 15:53 — на ~144)
   прямой сигнал и вся комната разом переезжали по задержке, а нулей во входе не было. v0.34 считала это «закрыто» — не тянула по
   положению, и корабль уплывал. Синтетика с зондом приложения: пусто 0–3 с, ладонь близко (5–10 см, как «в руке») ходит с 5 с,
   на 12 с весь отклик сдвигается на 256 отсчётов (без нулей). Движок должен один раз переехать на новый прямой с точностью до отсчёта (не на ладонь,
   которая рядом громче), не объявлять «закрыто» дольше полсекунды и после — следить за ладонью. Запуск: node tests/test_shift.js */
const C=require('../common');
const SR=48000, N=512, js=C.appJs(), FLO=+js.match(/F_LO=(\d+)/)[1], df=SR/N, kLo=Math.ceil(FLO/df), kHi=Math.floor(20500/df), ks=[];
for(let k=kLo;k<=kHi;k++) ks.push(k); const M=ks.length;
const pr=new Float64Array(N); let mx=0; for(let n=0;n<N;n++){ let s=0; for(let q=0;q<M;q++) s+=Math.cos(2*Math.PI*ks[q]*n/N+Math.PI*q*q/M); pr[n]=s; mx=Math.max(mx,Math.abs(s)); }
for(let n=0;n<N;n++) pr[n]=pr[n]/mx*0.9*0.25;
const P={}; for(const k of ks){ let re=0,im=0; for(let n=0;n<N;n++){ re+=pr[n]*Math.cos(2*Math.PI*k*n/N); im-=pr[n]*Math.sin(2*Math.PI*k*n/N); } P[k]=[re,im]; }
const hTrue=t=>t<3?null:t<5?75:75+25*Math.sin(2*Math.PI*(t-5)/3), SH=t=>t>=12?256:0, dDir=37.3, T=24;
const x=new Float32Array(Math.round(T*SR/N)*N); let seed=5;
for(let f=0;f<x.length/N;f++){ const t=(f+0.5)*N/SR, h=hTrue(t), s=SH(t), paths=[{d:dDir+s,a:1},{d:dDir+62+s,a:0.35},{d:dDir+130+s,a:0.2}];
  if(h!==null) paths.push({d:dDir+s+2*h/1000/343*SR,a:1.1});                     // ладонь близко — громче прямого, как «в руке»
  for(const p of paths) for(const k of ks){ const a=-2*Math.PI*k*p.d/N, c=Math.cos(a), sn=Math.sin(a), re=(P[k][0]*c-P[k][1]*sn)*2/N*p.a, im=(P[k][0]*sn+P[k][1]*c)*2/N*p.a;
    for(let n=0;n<N;n++) x[f*N+n]+=re*Math.cos(2*Math.PI*k*n/N)-im*Math.sin(2*Math.PI*k*n/N); }
  for(let n=0;n<N;n++){ seed=(seed*1664525+1013904223)>>>0; x[f*N+n]+=(seed/4294967296-0.5)*4e-4; } }
const D=C.makeDSP(); D.init(SR,'all'); D.setCal(C.physCal()); D.set('autocenter',1);
const o=[]; let covN=0, d00=null;
for(let k=0;k<x.length/N;k++){ const r=D.frame(x.subarray(k*N,(k+1)*N)), i=D.info(), t=(k+1)*N/SR; if(d00===null&&i.d0!==null) d00=i.d0; if(r) o.push(Object.assign({t},r)); if(i.covered) covN++; }
const inf=D.info(), moved=((inf.d0-d00)%N+N)%N, after=o.filter(r=>r.t>=14&&r.present), L=after.map(r=>hTrue(r.t)), H=after.map(r=>r.height);
const m=a=>a.reduce((u,v)=>u+v,0)/a.length, ml=m(L), mh=m(H); let sxy=0,sxx=0,syy=0; for(let i=0;i<L.length;i++){ sxy+=(L[i]-ml)*(H[i]-mh); sxx+=(L[i]-ml)**2; syy+=(H[i]-mh)**2; }
const c=sxy/Math.sqrt(sxx*syy), covS=covN*N/SR;
console.log(`переездов ${inf.relocks} (нужно 1) | прямой переехал на ${moved} (нужно 256 ± 1) | «закрыто» ${covS.toFixed(2)} с (нужно ≤ 0,5) | после: по форме ${c.toFixed(3)} (нужно ≥ 0.95)`);
const ok=inf.relocks===1&&Math.abs(moved-256)<=1&&covS<=0.5&&c>=0.95;
console.log(ok?'ИТОГ: ok':'ИТОГ: FAIL'); process.exitCode=ok?0:1;
