/* Стенд «плохой старт»: движок запускается посреди «Записи для меня», когда ладонь уже рядом —
   так пустая комната выучивается вместе с рукой (случай «рука видна рывками»).
   Запуск: node startmid.js [--patch правка.js] [--from 3.6,4.2,11.2] запись.wav ...
   Печать: доля кадров с рукой по фазам после старта и число уходов/входов. */
const C=require('./common'), path=require('path');
const a=process.argv.slice(2), files=[]; let patch=null, from=[0,3.6,4.2,6,11.2];
for(let i=0;i<a.length;i++){ if(a[i]==='--patch') patch=require(path.resolve(a[++i])); else if(a[i]==='--from') from=a[++i].split(',').map(Number); else files.push(a[i]); }
function mk(flo){ let s=C.dspSrc(); if(flo) s=s.replace('Math.ceil(18300/df)','Math.ceil('+flo+'/df)'); if(patch) s=patch(s); return new Function(s+'\nreturn DSP2;')(); }
const pc=(o,a,b)=>{ const q=o.filter(r=>r.t>=a&&r.t<b); return q.length?(100*q.filter(r=>r.present).length/q.length).toFixed(0).padStart(3)+'%':'  — '; };
for(const f of files){ const {meta,x}=C.loadWav(f), flo=C.bandOf(meta); console.log('\n'+f.split('/').pop());
  for(const t0 of from){ const k0=Math.round(t0*48000/512), D=mk(flo); D.init(48000,'all'); const o=[];
    for(let k=k0;k<Math.floor(x.length/512);k++){ const r=D.frame(x.subarray(k*512,(k+1)*512)); if(r) o.push(Object.assign({t:(k+1)*512/48000},r)); }
    const ready=o.length?o[0].t:NaN, ex=o.filter((r,i)=>i&&o[i-1].present&&!r.present&&r.t<14.2).length;
    console.log(`  старт ${t0.toFixed(1)} с (готов ${ready.toFixed(1)}): пусто ${pc(o,0.8,3)} ставит ${pc(o,4,5)} ведёт ${pc(o,5,11)} держит ${pc(o,11,14)} убрана ${pc(o,14.5,16)} | ложных уходов до 14.2 с: ${ex}`); } }
