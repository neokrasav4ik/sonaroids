/* СонарЛинк (06.10): что слышно от СОСЕДНЕГО телефона в записи этого. Запись сделана со своими тонами (meta.probe.bins: 0 или 1),
   сосед пищал другими. По каждому тону — уровень на микрофоне: свои тоны, тоны соседа, шум между ними; и насколько у соседа
   «плывут» часы (ppm: на сколько частота его тонов отличается от номинальной — по набегу фазы от кадра к кадру).
   Записи «Запись для меня» дальше разбирает eval_recording.js — с теми же тонами, что играли.
   Запуск: node eval_link.js запись.wav [...] */
const C=require('./common'); const SR=48000,N=512;
function analyse(x,par,flo){ const df=SR/N, kLo=Math.ceil(flo/df), kHi=Math.floor(20500/df), F=Math.floor(x.length/N);
  /* по кадрам: комплексная амплитуда каждого тона полосы */
  const amp={}; for(let k=kLo;k<=kHi;k++) amp[k]={re:new Float64Array(F),im:new Float64Array(F)};
  const cs=[],sn=[]; for(let k=kLo;k<=kHi;k++){ const c=new Float64Array(N),s=new Float64Array(N); for(let n=0;n<N;n++){ c[n]=Math.cos(2*Math.PI*k*n/N); s[n]=Math.sin(2*Math.PI*k*n/N); } cs[k]=c; sn[k]=s; }
  for(let f=0;f<F;f++){ const o=f*N; for(let k=kLo;k<=kHi;k++){ let re=0,im=0; const c=cs[k],s=sn[k]; for(let n=0;n<N;n++){ re+=x[o+n]*c[n]; im-=x[o+n]*s[n]; } amp[k].re[f]=re; amp[k].im[f]=im; } }
  const own=[],other=[]; let wsum=0,psum=0;
  for(let k=kLo;k<=kHi;k++){ const a=amp[k]; let p=0; for(let f=0;f<F;f++) p+=a.re[f]**2+a.im[f]**2; p/=F;
    const mine=par==='all'||k%2===par; (mine?own:other).push(10*Math.log10(p+1e-30));
    if(!mine){ /* набег фазы за кадр: средний по записи угол произведения соседних кадров */ let sr=0,si=0; for(let f=1;f<F;f++){ const r1=a.re[f],i1=a.im[f],r0=a.re[f-1],i0=a.im[f-1]; sr+=r1*r0+i1*i0; si+=i1*r0-r1*i0; }
      const dphi=Math.atan2(si,sr), dfHz=dphi/(2*Math.PI)*SR/N, ppm=dfHz/(k*df)*1e6; wsum+=p*ppm; psum+=p; } }
  const med=a=>{ const s=a.slice().sort((u,v)=>u-v); return s[s.length>>1]; };
  return {own:med(own),other:other.length?med(other):null,ppm:psum?wsum/psum:null}; }
for(const f of process.argv.slice(2)){ const {meta,x}=C.loadWav(f), par=C.binsOf(meta), flo=C.bandOf(meta);
  const r=analyse(x,par,flo);
  console.log(`\n== ${f.split('/').pop()} == тоны ${par==='all'?'все':par?'нечётные':'чётные'}, полоса с ${flo} Гц`);
  if(par==='all'){ console.log('  тоны не разведены — соседа от своего зонда не отделить'); continue; }
  console.log(`  свои тоны ${r.own.toFixed(1)} дБ | тоны соседа ${r.other.toFixed(1)} дБ — на ${(r.own-r.other).toFixed(1)} дБ тише` + (r.own-r.other>45?' (соседа почти не слышно)':''));
  if(r.own-r.other<45) console.log(`  часы соседа: ${r.ppm>=0?'+':''}${r.ppm.toFixed(1)} ppm` + (Math.abs(r.ppm)>60?' — много: тоны соседа сильнее просачиваются в свои (tools/sim_link.js)':'')); }
