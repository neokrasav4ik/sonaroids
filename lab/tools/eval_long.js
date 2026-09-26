/* Длинная запись по метке (sonarlong_*.wav, лаба с 26.09): 3 с пустая комната, ладонь на 10 см, потом 4 круга по 22 с —
   «веди за меткой» 18 с (100 ± 50 мм, период 6 с) и «замри» 4 с на 100 мм, в конце рука убрана. 96 с.
   Зачем: уход за полторы минуты — особенно когда телефон в руке (ладонь у торца всё время, пустая комната не обновляется).
   Движок — как в игре: калибровка игры (PHYS_CAL) и центровка после появления руки. По каждому кругу:
   - по форме: согласие с меткой (корреляция), масштаб (мм на мм метки), сдвиг (среднее «итог − метка»), разброс вокруг подогнанной формы;
   - удержание: среднее и дрожь на «замри»;
   - положение и фаза по отдельности: согласие дальности эха и быстрой части с меткой (фаза ведёт, положение держит от ухода).
   Уход — насколько сдвиг и удержание поменялись от 1-го круга к 4-му.
   Запуск: node eval_long.js [--set tau=3 ...] [--patch файл.js] запись.wav [ещё.wav]
           node eval_long.js --synth [--drift]   — самопроверка на синтетике (--drift: комната «уезжает», как у телефона в руке) */
const C=require('./common'), path=require('path');
const args=process.argv.slice(2), files=[], sets=[]; let patch=null, synth=false, drift=false;
for(let i=0;i<args.length;i++){ if(args[i]==='--set') sets.push(args[++i].split('=')); else if(args[i]==='--patch') patch=require(path.resolve(args[++i]));
  else if(args[i]==='--synth') synth=true; else if(args[i]==='--drift') drift=true; else files.push(args[i]); }
const SR=48000, N=512;
/* метка по сценарию из метаданных записи */
function labelOf(script){
  const seg=script.map(s=>{ let f=null; const m=String(s.H).match(/^100\+50\*sin\(2pi\(t-(\d+(?:\.\d+)?)\)\/6\)$/);
    if(m){ const t0=+m[1]; f=t=>100+50*Math.sin(2*Math.PI*(t-t0)/6); } else if(/^\d+(\.\d+)?$/.test(String(s.H))){ const v=+s.H; f=()=>v; } return {k:s.k,t:s.t,f}; });
  return {seg, at:t=>{ let s=null; for(const q of seg) if(t>=q.t) s=q; return s&&s.f?s.f(t):null; }};
}
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length, sd=a=>{ const m=mean(a); return Math.sqrt(mean(a.map(v=>(v-m)**2))); };
function fit(x,y){ const mx=mean(x), my=mean(y); let sxy=0,sxx=0,syy=0; for(let i=0;i<x.length;i++){ sxy+=(x[i]-mx)*(y[i]-my); sxx+=(x[i]-mx)**2; syy+=(y[i]-my)**2; }
  const k=sxy/sxx, b=my-k*mx; return {c:sxy/Math.sqrt(sxx*syy), k, res:Math.sqrt(mean(y.map((v,i)=>(v-(k*x[i]+b))**2)))/Math.abs(k)}; }
function makeDSP(flo){ let s=C.dspSrc(); if(flo) s=s.replace('Math.ceil(18300/df)','Math.ceil('+flo+'/df)'); if(patch) s=patch(s); return new Function(s+'\nreturn DSP2;')(); }
function evaluate(name,meta,x){
  const lab=labelOf(meta.script), D=makeDSP(C.bandOf(meta)); D.init(SR,'all'); D.setCal(C.physCal()); D.set('autocenter',1); sets.forEach(([k,v])=>D.set(k,+v));
  const o=C.pass(D,x), lag=0.1;                                       // метка сдвинута на реакцию человека ~0,1 с
  const circles=lab.seg.filter(s=>/^move\d+$/.test(s.k)).map(s=>{ const n=+s.k.slice(4), h=lab.seg.find(q=>q.k==='hold'+n), end=h?h.t:s.t+18;
    const mv=o.filter(r=>r.t>=s.t+0.3&&r.t<end&&r.present), L=mv.map(r=>lab.at(r.t-lag));
    const f=fit(L,mv.map(r=>r.height)), fr=fit(L,mv.map(r=>r.range)), ff=fit(L,mv.map(r=>r.fast));
    const hd=h?o.filter(r=>r.t>=h.t+0.5&&r.t<h.t+4&&r.present).map(r=>r.height):[];
    return {n, c:f.c, k:f.k, res:f.res, bias:mean(mv.map((r,i)=>r.height-L[i])), hold:hd.length?mean(hd)-100:NaN, jit:hd.length?sd(hd):NaN, cr:fr.c, cf:ff.c, seen:100*mv.length/o.filter(r=>r.t>=s.t+0.3&&r.t<end).length}; });
  const em=o.filter(r=>r.t>=0.8&&r.t<3), aw=lab.seg.find(s=>s.k==='away'), gone=aw?o.filter(r=>r.t>=aw.t+0.7):[];
  console.log(`\n== ${name} ==  ${meta.probe&&meta.probe.snr_db?'запас '+meta.probe.snr_db.toFixed(1)+' дБ, ':''}${(x.length/SR).toFixed(0)} с${(sets.length||patch)?' | вариант: '+sets.map(s=>s.join('=')).join(' ')+(patch?' patch':''):''}`);
  console.log('  круг | по форме | масштаб | сдвиг, мм | разброс, мм | удержание: сдвиг / дрожь, мм | положение / фаза с меткой | рука видна');
  circles.forEach(q=>console.log(`   ${q.n}   |  ${q.c.toFixed(3)}  |  ${q.k.toFixed(2)}   |  ${q.bias>=0?'+':''}${q.bias.toFixed(0).padStart(3)}     |    ${q.res.toFixed(1).padStart(4)}     |       ${isNaN(q.hold)?'  —':(q.hold>=0?'+':'')+q.hold.toFixed(0).padStart(3)} / ${isNaN(q.jit)?'—':q.jit.toFixed(1)}             |   ${q.cr.toFixed(2).padStart(5)} / ${q.cf.toFixed(2)}          | ${q.seen.toFixed(0)}%`));
  const a=circles[0], z=circles[circles.length-1];
  console.log(`  уход с 1-го круга по ${z.n}-й: сдвиг ${(z.bias-a.bias)>=0?'+':''}${(z.bias-a.bias).toFixed(0)} мм, удержание ${(z.hold-a.hold)>=0?'+':''}${(z.hold-a.hold).toFixed(0)} мм | по форме в среднем ${mean(circles.map(q=>q.c)).toFixed(3)} | рука видна: пусто ${(100*em.filter(r=>r.present).length/Math.max(1,em.length)).toFixed(0)}%, после «убери» ${(100*gone.filter(r=>r.present).length/Math.max(1,gone.length)).toFixed(0)}%`);
  return circles;
}
/* самопроверка: синтетический зонд приложения, ладонь по длинному сценарию; --drift — отражение комнаты медленно уезжает (телефон в руке) */
function synthLong(){
  const js=C.appJs(), FLO=+js.match(/F_LO=(\d+)/)[1], df=SR/N, kLo=Math.ceil(FLO/df), kHi=Math.floor(20500/df), ks=[]; for(let k=kLo;k<=kHi;k++) ks.push(k); const M=ks.length;
  const pr=new Float64Array(N); let mx=0; for(let n=0;n<N;n++){ let s=0; for(let q=0;q<M;q++) s+=Math.cos(2*Math.PI*ks[q]*n/N+Math.PI*q*q/M); pr[n]=s; mx=Math.max(mx,Math.abs(s)); }
  for(let n=0;n<N;n++) pr[n]=pr[n]/mx*0.9*0.25;
  const P={}; for(const k of ks){ let re=0,im=0; for(let n=0;n<N;n++){ re+=pr[n]*Math.cos(2*Math.PI*k*n/N); im-=pr[n]*Math.sin(2*Math.PI*k*n/N); } P[k]=[re,im]; }
  const script=[{k:'empty',t:0,H:'—'},{k:'place',t:3,H:'100'}]; let t=5; for(let n=1;n<=4;n++){ script.push({k:'move'+n,t,H:`100+50*sin(2pi(t-${t})/6)`},{k:'hold'+n,t:t+18,H:'100'}); t+=22; }
  script.push({k:'away',t,H:'—'}); const T=t+3, lab=labelOf(script), dDir=37.3, x=new Float32Array(Math.round(T*SR/N)*N); let seed=7;
  for(let f=0;f<x.length/N;f++){ const tt=(f+0.5)*N/SR, h=lab.at(tt), room=dDir+62+(drift?Math.min(tt,90)*0.25:0);   // --drift: +0,25 отсчёта в секунду ≈ 0,9 мм/с
    const paths=[{d:dDir,a:1},{d:room,a:0.35}]; if(h!==null) paths.push({d:dDir+2*h/1000/343*SR,a:0.25});
    for(const p of paths) for(const k of ks){ const a=-2*Math.PI*k*p.d/N, c=Math.cos(a), s=Math.sin(a), re=(P[k][0]*c-P[k][1]*s)*2/N*p.a, im=(P[k][0]*s+P[k][1]*c)*2/N*p.a;
      for(let n=0;n<N;n++) x[f*N+n]+=re*Math.cos(2*Math.PI*k*n/N)-im*Math.sin(2*Math.PI*k*n/N); }
    for(let n=0;n<N;n++){ seed=(seed*1664525+1013904223)>>>0; x[f*N+n]+=(seed/4294967296-0.5)*4e-4; } }
  return {meta:{kind:'single-landscape-long',probe:{f_lo:FLO},script}, x};
}
if(synth){ const s=synthLong(), q=evaluate('синтетика'+(drift?', комната уезжает':''),s.meta,s.x);
  const ok=drift?true:q.every(c=>c.c>0.98&&Math.abs(c.bias)<15&&Math.abs(c.hold)<15);
  console.log(ok?'ИТОГ: ok':'ИТОГ: FAIL'); process.exitCode=ok?0:1; }
for(const f of files){ const {meta,x}=C.loadWav(f); if(!meta||meta.kind!=='single-landscape-long'){ console.log(`\n== ${path.basename(f)} == не длинная запись (${meta&&meta.kind}) — для «Записи для меня» есть eval_recording.js`); continue; }
  evaluate(path.basename(f),meta,x); }
