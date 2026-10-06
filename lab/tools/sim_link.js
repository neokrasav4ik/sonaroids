/* СонарЛинк (06.10): мешает ли зонд СОСЕДНЕГО телефона. Синтетика: микрофон телефона А слышит свой зонд (прямой, комната, ладонь
   по сценарию «Записи для меня») и зонд телефона Б — с другой громкостью и со сдвигом частоты дискретизации (часы двух телефонов
   идут чуть по-разному, ppm), плюс эхо ладони игрока Б. Обработка А — тем же DSP2, что в игре, со своими тонами (parity).
   Сравнивает: Б молчит / Б играет те же тоны / тоны разведены (А чётные, Б нечётные).
   Запуск: node sim_link.js [--quick] */
const C=require('./common');
const SR=48000,N=512,df=SR/N,T=17;
const kLo=Math.ceil(18300/df),kHi=Math.floor(20500/df);
function tones(par){ const ks=[]; for(let k=kLo;k<=kHi;k++) if(par==='all'||k%2===par) ks.push(k); return ks; }
function probeAmp(ks){ /* нормировка как makeProbe: пик 0.9, громкость 0.25 */ const M=ks.length; let mx=0;
  for(let n=0;n<N;n++){ let s=0; for(let q=0;q<M;q++) s+=Math.cos(2*Math.PI*ks[q]*n/N+Math.PI*q*q/M); mx=Math.max(mx,Math.abs(s)); } return 0.9*0.25/mx; }
const hA=t=>t<3?null:t<5?100:t<11?100+50*Math.sin(2*Math.PI*(t-5)/6):t<14?100:null;      // ладонь А, мм
const hB=t=>t<1?null:120+40*Math.sin(2*Math.PI*t/2.3);                                       // ладонь Б, своя, всё время двигается
function synth(parA,parB,levB,ppm,seed){
  const ksA=tones(parA), ksB=parB===null?[]:tones(parB), gA=probeAmp(ksA), gB=parB===null?0:probeAmp(ksB)*Math.pow(10,levB/20);
  const nT=Math.round(T*SR/N)*N, x=new Float32Array(nT), dDir=37.3, mm2s=2/1000/343*SR; let s=seed>>>0||1;
  const pathsA=t=>{ const p=[{d:dDir,a:1},{d:dDir+62,a:0.35},{d:dDir+140,a:0.12}]; const h=hA(t); if(h!==null) p.push({d:dDir+h*mm2s,a:0.25}); return p; };
  /* Б: путь до микрофона А ~30 см (торцы с динамиками смотрят наружу), его ладонь — у дальнего торца, ещё дальше */
  const pathsB=t=>{ const p=[{d:300*mm2s/2,a:1},{d:300*mm2s/2+90,a:0.3}]; const h=hB(t); if(h!==null) p.push({d:(300+h)*mm2s/2*2,a:0.05}); return p; };
  for(let f=0;f<nT/N;f++){ const t=(f+0.5)*N/SR, pa=pathsA(t), pb=pathsB(t);
    for(let n0=0;n0<N;n0++){ const n=f*N+n0; let v=0;
      for(const p of pa){ for(let q=0;q<ksA.length;q++) v+=gA*p.a*Math.cos(2*Math.PI*ksA[q]*(n-p.d)/N+Math.PI*q*q/ksA.length); }
      if(gB){ const nb=n*(1+ppm*1e-6); for(const p of pb){ for(let q=0;q<ksB.length;q++) v+=gB*p.a*Math.cos(2*Math.PI*ksB[q]*(nb-p.d)/N+Math.PI*q*q/ksB.length+1.3); } }
      s=(s*1664525+1013904223)>>>0; v+=(s/4294967296-0.5)*4e-4; x[n]=v; } }
  return x;
}
function run(x,parA){ const D=C.makeDSP(), cc=C.calCompute(); D.init(SR,parA); let o=C.pass(D,x); const W=(a,b)=>o.filter(r=>r.t>=a&&r.t<b);
  const cal=cc(W(9.2,9.8),W(6.2,6.8),W(5.2,11)); D.init(SR,parA); D.setCal(cal); o=C.pass(D,x);
  const e=o.filter(r=>r.t>=5.3&&r.t<11&&r.present&&r.height!=null).map(r=>Math.abs(r.height-hA(r.t))).sort((a,b)=>a-b);
  const hold=o.filter(r=>r.t>=11.5&&r.t<14&&r.height!=null).map(r=>r.height), m=hold.reduce((a,b)=>a+b,0)/(hold.length||1);
  const sd=Math.sqrt(hold.reduce((a,b)=>a+(b-m)*(b-m),0)/(hold.length||1));
  const pres=(a,b)=>{ const q=o.filter(r=>r.t>=a&&r.t<b); return q.length?100*q.filter(r=>r.present).length/q.length:0; };
  return {med:e.length?e[e.length>>1]:NaN,p90:e.length?e[Math.floor(e.length*0.9)]:NaN,sd,empty:pres(0.8,3),move:pres(5.3,11),gone:pres(15,17),prom:D.info().prom}; }
module.exports={synth,run,tones,hA};
if(require.main===module){
const quick=process.argv.includes('--quick');
const cases=[['Б молчит, А все тоны','all',null,0,0],['Б молчит, А чётные','0',null,0,0]];
for(const lev of quick?[-20]:[-10,-20,-30]) for(const ppm of quick?[20]:[0,20,100]){
  cases.push([`Б те же тоны, ${lev} дБ, ${ppm} ppm`,'all','all',lev,ppm]);
  cases.push([`А чётные / Б нечётные, ${lev} дБ, ${ppm} ppm`,0,1,lev,ppm]); }
console.log('случай | ошибка против метки: медиана / 90% | дрожь удержания | ладонь видна: пусто / ведёт / убрана');
const res=[];
for(const [name,pa0,pb,lev,ppm] of cases){ const pa=pa0==='0'?0:pa0; const x=synth(pa,pb,lev,ppm,7); const r=run(x,pa); res.push({name,pa,pb,ppm,r});
  console.log(`${name.padEnd(40)} | ${r.med.toFixed(1)} / ${r.p90.toFixed(1)} мм | ${r.sd.toFixed(2)} мм | ${r.empty.toFixed(0)}% / ${r.move.toFixed(0)}% / ${r.gone.toFixed(0)}%`); }
/* итог (часы соседа до 20 ppm — обычный разброс кварцев; 100 ppm — справка, там хуже на ~5 мм, но без ложной ладони и дрожи): разведённые тоны не хуже «Б молчит» больше чем на 2 мм, без ложной ладони в пустой комнате и без дрожи на удержании.
   («убрана» — справка: в этой синтетике ладонь после ухода держится и без Б) */
const base=res[1].r, sep=res.filter(c=>c.pb===1&&c.ppm<=20), ok=sep.every(c=>c.r.med<base.med+2&&c.r.empty<5&&c.r.move>90&&c.r.sd<1);
console.log(ok?'ИТОГ: ok':'ИТОГ: ПРОВАЛ'); process.exitCode=ok?0:1;
}
