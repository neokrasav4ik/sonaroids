/* Оценка механики на «Записи для меня» (сценарий: пусто 0–3 с, ставит 3–5, ведёт по синусоиде 5–11, держит 11–14, убирает 14–16).
   Запуск: node eval_recording.js запись1.wav [запись2.wav ...]
   Метрики:
   - «по форме»: согласие с меткой после подгонки сдвига во времени и масштаба — отделяет ошибку прибора от того, как рука шла за меткой;
   - «разброс»: медианное отклонение от подогнанной формы, мм;
   - удержание: дрожь (СКО) и уход за 2 с, мм;
   - присутствие по фазам и моменты входа/выхода. */
const C=require('./common');
const calCompute=C.calCompute();
const sn=t=>100+50*Math.sin(2*Math.PI*(t-5)/6);
const sd=a=>{ const m=a.reduce((u,v)=>u+v)/a.length; return Math.sqrt(a.reduce((u,v)=>u+(v-m)**2,0)/a.length); };
function shape(o){ const mv=o.filter(r=>r.t>=5.3&&r.t<11&&r.present), ts=mv.map(r=>r.t), hs=mv.map(r=>r.height); let best=null;
  for(let s=-0.6;s<=0.61;s+=0.02){ const g=ts.map(t=>sn(t-s)), n=g.length, mg=g.reduce((u,v)=>u+v)/n, mh=hs.reduce((u,v)=>u+v)/n; let sxy=0,sxx=0,syy=0;
    for(let i=0;i<n;i++){ sxy+=(g[i]-mg)*(hs[i]-mh); sxx+=(g[i]-mg)**2; syy+=(hs[i]-mh)**2; } const c=sxy/Math.sqrt(sxx*syy), k=sxy/sxx, b=mh-k*mg;
    if(!best||c>best.c){ const res=hs.map((h,i)=>Math.abs(h-(k*g[i]+b))/k).sort((u,v)=>u-v); best={c,shift:s,k,med:res[res.length>>1]}; } } return best; }
for(const f of process.argv.slice(2)){
  const {meta,x}=C.loadWav(f), flo=C.bandOf(meta), DSP2=C.makeDSP(flo);
  DSP2.init(48000,'all'); let o=C.pass(DSP2,x); const W=(a,b)=>o.filter(r=>r.t>=a&&r.t<b); const inf=DSP2.info();
  const cal=calCompute(W(9.2,9.8),W(6.2,6.8),W(5.2,11));
  DSP2.init(48000,'all'); DSP2.setCal(cal); o=C.pass(DSP2,x);
  const sh=shape(o), e=o.filter(r=>r.t>=5.3&&r.t<11&&r.present).map(r=>Math.abs(r.height-sn(r.t))).sort((a,b)=>a-b);
  const hd=o.filter(r=>r.t>=11.8&&r.t<13.8&&r.present).map(r=>r.height);
  const pres=(a,b)=>{ const q=o.filter(r=>r.t>=a&&r.t<b); return (100*q.filter(r=>r.present).length/q.length).toFixed(0)+'%'; };
  console.log(`\n== ${f.split('/').pop()} ==  полоса с ${flo} Гц | зонд: выраженность ${inf.prom.toFixed(1)} дБ` + (meta.probe&&meta.probe.gain!==undefined?` | уровень ${(+meta.probe.gain).toFixed(3)}, запас ${meta.probe.snr_db?meta.probe.snr_db.toFixed(1):'—'} дБ`:''));
  console.log(`  калибровка по записи: k=${cal.k.toFixed(2)} o=${cal.o.toFixed(0)} s=${cal.s.toFixed(2)} (согласие ${cal.r.toFixed(2)})`);
  console.log(`  по форме: ${sh.c.toFixed(3)} (сдвиг ${sh.shift>=0?'+':''}${sh.shift.toFixed(2)} с, масштаб ${sh.k.toFixed(2)}), разброс ${sh.med.toFixed(1)} мм | против метки: медиана ${e[e.length>>1].toFixed(1)}, p90 ${e[Math.floor(e.length*.9)].toFixed(0)} мм`);
  console.log(`  удержание: среднее ${(hd.reduce((a,b)=>a+b)/hd.length).toFixed(0)} мм, дрожь ${sd(hd).toFixed(1)} мм, уход ${(hd[hd.length-1]-hd[0]).toFixed(0)} мм`);
  console.log(`  рука видна: пусто ${pres(0.8,3)} | ставит ${pres(3,5)} | ведёт ${pres(5,11)} | держит ${pres(11,14)} | убрана ${pres(14.5,16)} | входы ${o.filter(r=>r.started).map(r=>r.t.toFixed(2)).join(',')} | уходы ${o.filter((r,i)=>i&&o[i-1].present&&!r.present).map(r=>r.t.toFixed(2)).join(',')}`);
}
