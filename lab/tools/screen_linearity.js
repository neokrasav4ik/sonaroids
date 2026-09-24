/* Стенд «линеен ли экран по настоящей высоте»: на «Записях для меня» подстройка по взмахам берётся с отрезка 5–11 с (синусоида 50–150 мм),
   затем печатается, на какой доле экрана корабль при метке 50/75/100/125/150 мм — без растяжки низа (ASYM 1) и с растяжкой (1,7).
   Запуск: node tools/screen_linearity.js запись.wav ... */
const C=require('./common'); const sn=t=>100+50*Math.sin(2*Math.PI*(t-5)/6);
for(const ASYM of [1,1.7]){ const all=[];
for(const f of process.argv.slice(2)){ const {meta,x}=C.loadWav(f); const D=C.makeDSP(C.bandOf(meta)); D.init(48000,'all'); D.setCal(C.physCal()); D.set('autocenter',1); const o=C.pass(D,x);
  const mv=o.filter(r=>r.t>=5.3&&r.t<11&&r.present); const h=mv.map(r=>r.height).sort((a,b)=>a-b), p=q=>h[Math.floor(q*(h.length-1))];
  const lo=p(0.05), hi=p(0.95), B=0.10, TP=0.90, F=(hi-lo)/((0.5-B)*2/(1+ASYM)+(TP-0.5)*2*ASYM/(1+ASYM)), cen=lo+(0.5-B)*2*F/(1+ASYM);
  const fr=v=>{ const FL=2*F/(1+ASYM), FU=2*ASYM*F/(1+ASYM); const hh=v-cen+100; return hh<100?0.5+(hh-100)/FL:0.5+(hh-100)/FU; };
  // экран у отметок метки: медиана по кадрам, где метка (со сдвигом 0.15 с на запаздывание руки) близка к уровню
  const at=L=>{ const q=mv.filter(r=>Math.abs(sn(r.t-0.15)-L)<6).map(r=>fr(r.height)).sort((a,b)=>a-b); return q.length?q[q.length>>1]:NaN; };
  const row=[50,75,100,125,150].map(at); all.push(row);
  console.log(`ASYM ${ASYM} ${f.split('/').pop().padEnd(27)} экран при метке 50/75/100/125/150 мм: ${row.map(v=>(v*100).toFixed(0).padStart(3)+'%').join(' ')}`); }
const m=i=>all.reduce((a,b)=>a+b[i],0)/all.length; console.log(`ASYM ${ASYM} среднее: ${[0,1,2,3,4].map(i=>(m(i)*100).toFixed(0)+'%').join(' ')}  (линейно было бы ~10/30/50/70/90)\n`); }
