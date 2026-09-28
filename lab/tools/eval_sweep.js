/* Разбор «записи с проводкой» (sonarsweep_*.wav, с 28.09, 0.62) и пробы стерео (sonarstereo_*.wav) тем же счётом, что «Стерео вживую»
   в лабе (StereoEcho из src/091_stereo_live.js — один код): по движущемуся эху каждого канала — разница путей до двух микрофонов
   B − A (мм) и разница силы (дБ), окно 16 кадров, шаг 8, только «живые» окна (эхо заметно над фоном).
   Для фаз «качай» (Lw, Cw, Rw; в пробе стерео L, R, T, B) — медианы. Для проводки (S1–S3: ладонь медленно слева направо и обратно,
   период 5 с, за точкой на экране) — корреляция разницы с положением точки (сдвиг 0–1 с на запаздывание руки) и размах:
   если лево/право видно плавно, корреляция пути отрицательная (справа путь до B короче — см. пробу 28.09) и заметно больше нуля по модулю.
   Запуск: node eval_sweep.js запись.wav [...] */
const C=require('./common'), fs=require('fs'), path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','src','091_stereo_live.js'),'utf8'), body=src.slice(src.indexOf('function StereoEcho'),src.indexOf('var SL='));
function makeSE(lo){ return new Function('bandLo','F_LO','DEPTH_HI','fs','N',body+'\nreturn StereoEcho;')(()=>lo,18300,20500,48000,512)(); }
function series(meta,x){ const se=makeSE((meta.probe&&meta.probe.f_lo)||18300), n=Math.floor(x.length/2/512), out=[];
  for(let i=0;i<n;i++){ const a=new Float32Array(512), b=new Float32Array(512); for(let j=0;j<512;j++){ a[j]=x[2*(i*512+j)]; b[j]=x[2*(i*512+j)+1]; } const o=se.push(a,b); if(o) out.push(Object.assign({f:i,t:i*512/48000},o)); }
  return {out,info:se.info(),n}; }
const med=a=>{ a=a.slice().sort((p,q)=>p-q); return a.length?a[a.length>>1]:NaN; }, pct=(a,p)=>{ a=a.slice().sort((u,v)=>u-v); return a.length?a[Math.min(a.length-1,Math.floor(a.length*p))]:NaN; };
function corr(a,b){ const n=a.length; if(n<5) return NaN; let ma=0,mb=0; for(let i=0;i<n;i++){ ma+=a[i]/n; mb+=b[i]/n; } let sab=0,saa=0,sbb=0; for(let i=0;i<n;i++){ sab+=(a[i]-ma)*(b[i]-mb); saa+=(a[i]-ma)**2; sbb+=(b[i]-mb)**2; } return sab/Math.sqrt(saa*sbb||1e-30); }
function analyse(meta,x){ const {out}=series(meta,x), mk=meta.marks||{}, keys=Object.keys(mk).sort((p,q)=>mk[p]-mk[q]), P=meta.sweep_period||5, res=[];
  const tEnd=x.length/2/48000;
  keys.forEach((k,i)=>{ const t0=mk[k]/48000, t1=i+1<keys.length?mk[keys[i+1]]/48000:tEnd, v=out.filter(o=>o.t>=t0+0.8&&o.t<t1-0.3), act=v.filter(o=>o.act);
    const r={k,n:v.length,act:act.length,d:med(act.map(o=>o.d)),l:med(act.map(o=>o.l)),cA:med(act.map(o=>o.cA))};
    if(/^S\d/.test(k)&&act.length>=8){ let best={cd:0,cl:0,lag:0};
      for(let lag=0;lag<=1.0001;lag+=0.1){ const tg=act.map(o=>-Math.cos(2*Math.PI*(o.t-lag-t0)/P)), cd=corr(act.map(o=>o.d),tg), cl=corr(act.map(o=>o.l),tg);
        if(Math.abs(cd)+Math.abs(cl)>Math.abs(best.cd)+Math.abs(best.cl)) best={cd,cl,lag}; }
      Object.assign(r,best,{span:pct(act.map(o=>o.d),0.9)-pct(act.map(o=>o.d),0.1)}); }
    res.push(r); });
  return res; }
if(require.main===module) for(const f of process.argv.slice(2)){ const {meta,x}=C.loadWav(f);
  if(!meta||(meta.channels||1)!==2){ console.log(`\n== ${path.basename(f)} == не два канала`); continue; }
  console.log(`\n== ${path.basename(f)} == ${meta.kind}, источник ${(meta.mic&&meta.mic.label)||'—'}, полоса с ${meta.probe&&meta.probe.f_lo} Гц`);
  analyse(meta,x).forEach(r=>console.log(`  ${r.k.padEnd(6)} живых окон ${String(r.act).padStart(3)}/${String(r.n).padStart(3)} | путь B − A ${isNaN(r.d)?'   —':r.d.toFixed(0).padStart(4)} мм | сила B − A ${isNaN(r.l)?'  —':r.l.toFixed(1).padStart(5)} дБ | расстояние A ${isNaN(r.cA)?'—':r.cA.toFixed(0)} мм`+
    (r.cd!==undefined?` | с точкой: путь ${r.cd.toFixed(2)}, сила ${r.cl.toFixed(2)} (запаздывание ${r.lag.toFixed(1)} с), размах пути ${r.span.toFixed(0)} мм`:''))); }
module.exports={series,analyse};
