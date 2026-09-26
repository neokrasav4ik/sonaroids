/* Разбор записи «Два динамика» (sonardual_*.wav, с 27.09). Телефон лежит горизонтально, как в игре.
   Сценарий: пусто — левый канал 0–3 с, правый 3–6, оба вместе (левый — чётные частоты, правый — нечётные) 6–9;
   палец на верхнем динамике 9–12, убрать 12–14; ладонь у ближнего длинного края 14–17, веди вдоль телефона ±60 мм (период 8 с) 17–33;
   замри слева 33, справа 36, по центру 39; убрать 42–45.
   Вопросы:
   1) Звучат ли каналы из разных динамиков? Прямой сигнал каждого канала отдельно: задержка (1 отсчёт ≈ 7 мм пути) и уровень.
      Верхний динамик дальше от микрофона на ~14 см — его прямой сигнал должен приходить на ~20 отсчётов позже.
      И какой из каналов проседает, когда палец закрывает верхний динамик.
   2) Есть ли вторая ось: следует ли разница двух расстояний до ладони (по левому и по правому зонду) за положением вдоль телефона.
   Запуск: node eval_dual.js запись.wav [...]
           node eval_dual.js --synth — самопроверка: синтетический телефон с динамиками в разных торцах (ждём «разные динамики, ось есть»)
           и с обоими каналами из нижнего динамика (ждём «один динамик, оси нет»). */
const C=require('./common'), path=require('path');
const args=process.argv.slice(2), synth=args.includes('--synth'), files=args.filter(a=>a!=='--synth');
const SR=48000, N=512, A=60;
const PH=[['e_l',0],['e_r',3],['e_d',6],['cover',9],['uncover',12],['place',14],['move',17],['hl',33],['hr',36],['hc',39],['away',42]];
const target=t=>t<14||t>=42?null:t<17?0:t<33?A*Math.sin(2*Math.PI*(t-17)/8):t<36?-A:t<39?A:0;

/* ── синтетика ── */
function synthRec(split){ const js=C.appJs(), FLO=+js.match(/F_LO=(\d+)/)[1], df=SR/N, kLo=Math.ceil(FLO/df), kHi=Math.floor(20500/df);
  function probe(par){ const ks=[]; for(let k=kLo;k<=kHi;k++) if(par==='all'||k%2===par) ks.push(k); const M=ks.length, pr=new Float64Array(N); let mx=0;
    for(let n=0;n<N;n++){ let s=0; for(let q=0;q<M;q++) s+=Math.cos(2*Math.PI*ks[q]*n/N+Math.PI*q*q/M); pr[n]=s; mx=Math.max(mx,Math.abs(s)); }
    for(let n=0;n<N;n++) pr[n]=pr[n]/mx*0.9; const spec={}; for(const k of ks){ let re=0,im=0; for(let n=0;n<N;n++){ re+=pr[n]*Math.cos(2*Math.PI*k*n/N); im-=pr[n]*Math.sin(2*Math.PI*k*n/N); } spec[k]={re,im}; } return spec; }
  const P={all:probe('all'),0:probe(0),1:probe(1)}, cosT={}, sinT={};
  for(let k=kLo;k<=kHi;k++){ cosT[k]=Float64Array.from({length:N},(_,n)=>Math.cos(2*Math.PI*k*n/N)); sinT[k]=Float64Array.from({length:N},(_,n)=>Math.sin(2*Math.PI*k*n/N)); }
  function add(out,spec,d,a){ for(const k in spec){ const s=spec[k], ang=-2*Math.PI*k*d/N, c=Math.cos(ang), sn=Math.sin(ang), re=(s.re*c-s.im*sn)*2/N*a, im=(s.re*sn+s.im*c)*2/N*a, ct=cosT[k], st=sinT[k];
      for(let n=0;n<N;n++) out[n]+=re*ct[n]-im*st[n]; } }
  // мм: телефон 147 мм вдоль x, разъём справа (x=+70), микрофон у разъёма; нижний динамик у разъёма, верхний — в другом торце (x=−70)
  const c=343e3/SR, MIC=[66,0,3], BOT=[70,6,3], TOP=[-70,0,6], LAT=30;
  const spk={left:split?TOP:BOT, right:BOT};                      // split: левый канал — верхний динамик; иначе оба из нижнего
  const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
  const frames=[]; let seed=1;
  for(let f=0;f<Math.round(45*SR/N);f++){ const t=(f+0.5)*N/SR, out=new Float32Array(N), x=target(t);
    const mode=t<3?'single-left':t<6?'single-right':'dual';
    const srcs=mode==='single-left'?[['left',P.all,0.25]]:mode==='single-right'?[['right',P.all,0.25]]:[['left',P[0],0.25],['right',P[1],0.25]];
    for(const [ch,spec,g] of srcs){ const S=spk[ch]; let a=g*(ch==='left'&&split?0.35:1); if(t>=9&&t<12&&split&&ch==='left') a*=0.2;   // палец глушит верхний
      add(out,spec,LAT+dist(S,MIC)/c,a); add(out,spec,LAT+(dist(S,[0,300,0])+dist([0,300,0],MIC))/c,a*0.08);   // прямой и стена
      if(x!==null){ const pw=Math.sin(f*0.05)*4; for(const [dx,dy,w] of [[0,0,1],[-25,5,0.5],[25,5,0.5],[0,30,0.4]]){ const H=[x+dx+pw,-60+dy,50];
          add(out,spec,LAT+(dist(S,H)+dist(H,MIC))/c,a*w*0.1*(80*80)/(dist(S,H)*dist(H,MIC))); } } }
    for(let n=0;n<N;n++){ seed=(seed*1664525+1013904223)>>>0; out[n]+=(seed/4294967296-0.5)*4e-4; } frames.push(out); }
  const x=new Float32Array(frames.length*N); frames.forEach((fr,i)=>x.set(fr,i*N));
  const marks={}; PH.forEach(([k,t])=>marks[k]=Math.round(t*SR/N)*N);
  return {meta:{kind:'dual-landscape',probe:{f_lo:FLO},marks,port:'right',synth:true,split},x}; }

/* ── разбор ── */
function seg(x,meta,a,b){ const m=meta.marks, i=Math.round(m[a]/N)*N, j=b?Math.round(m[b]/N)*N:x.length; return x.subarray(i,j); }
function direct(xs,flo){ const D=C.makeDSP(flo); D.init(SR,'all'); C.pass(D,xs); const i=D.info(); return {d0:i.d0,prom:i.prom}; }
/* уровень прямого сигнала своего зонда по кадрам (чётные/нечётные частоты) */
function track(xs,flo,par){ const D=C.makeDSP(flo); D.init(SR,par); const o=C.pass(D,xs); return {o,inf:D.info()}; }
/* 27.09: каналы между собой — выраженность каждого считается от его же фона и не говорит, насколько один громче другого.
   Усредняю период зонда (512 отсчётов) в каждой фазе и сравниваю по тонам: разница уровней и сдвиг по задержке по наклону фазы
   (сдвиг на D отсчётов поворачивает фазу на 2π·D/512 на каждый следующий тон; 14 см пути ≈ 20 отсчётов) */
function chanCompare(x,meta,flo){ const m=meta.marks, df=SR/N, kLo=Math.ceil(flo/df), kHi=Math.floor(20500/df);
  function avg(a,b){ const i0=Math.round(m[a]/N)*N+N*30, i1=Math.round(m[b]/N)*N-N*5, o=new Float64Array(N); let n=0; for(let i=i0;i+N<=i1;i+=N){ for(let j=0;j<N;j++) o[j]+=x[i+j]; n++; } return o.map(v=>v/(n||1)); }
  function spec(v){ const S=[]; for(let k=kLo;k<=kHi;k++){ let re=0,im=0; for(let n=0;n<N;n++){ const a=2*Math.PI*k*n/N; re+=v[n]*Math.cos(a); im-=v[n]*Math.sin(a); } S.push([re,im]); } return S; }
  const L=spec(avg('e_l','e_r')), R=spec(avg('e_r','e_d')); let pl=0,pr=0; const ph=[];
  L.forEach((a,i)=>{ const b=R[i]; pl+=a[0]**2+a[1]**2; pr+=b[0]**2+b[1]**2; ph.push(Math.atan2(a[1]*b[0]-a[0]*b[1],a[0]*b[0]+a[1]*b[1])); });
  for(let i=1;i<ph.length;i++){ while(ph[i]-ph[i-1]>Math.PI) ph[i]-=2*Math.PI; while(ph[i]-ph[i-1]<-Math.PI) ph[i]+=2*Math.PI; }
  const n=ph.length, xm=(n-1)/2, ym=ph.reduce((u,v)=>u+v)/n; let sxy=0,sxx=0; ph.forEach((v,i)=>{ sxy+=(i-xm)*(v-ym); sxx+=(i-xm)**2; });
  return {dB:10*Math.log10(pl/pr), lag:-(sxy/sxx)*N/(2*Math.PI)}; }
function analyse(meta,x){ const flo=C.bandOf(meta), out={};
  out.L=direct(seg(x,meta,'e_l','e_r'),flo); out.R=direct(seg(x,meta,'e_r','e_d'),flo); out.cmp=chanCompare(x,meta,flo);
  // оба зонда вместе — с начала «оба вместе» до конца
  const xd=seg(x,meta,'e_d'), t0=meta.marks.e_d/SR;
  const TL=track(xd,flo,0), TR=track(xd,flo,1); out.TL=TL.inf; out.TR=TR.inf;
  // палец на верхнем динамике: мощность в полосе своего зонда (чётные / нечётные частоты) под пальцем против «оба вместе»
  const df=SR/N, kLo=Math.ceil(flo/df), kHi=Math.floor(20500/df);
  function bandPow(xs,par){ let s=0,n=0; for(let f=0;f+N<=xs.length;f+=N){ for(let k=kLo;k<=kHi;k++){ if(k%2!==par) continue; let re=0,im=0; for(let q=0;q<N;q+=1){ const v=xs[f+q], a=2*Math.PI*k*q/N; re+=v*Math.cos(a); im-=v*Math.sin(a); } s+=re*re+im*im; } n++; } return s/(n||1); }
  const ed=seg(x,meta,'e_d','cover'), cv=seg(x,meta,'cover','uncover'), cvIn=cv.subarray(Math.round(1*SR/N)*N);
  out.coverDrop=[0,1].map(par=>10*Math.log10(bandPow(cvIn,par)/bandPow(ed.subarray(N*20),par)));
  // вторая ось: разница расстояний двух зондов против метки
  const rows=[];
  const byT=new Map(TR.o.map(r=>[Math.round(r.t*1000),r]));
  TL.o.forEach(r=>{ const q=byT.get(Math.round(r.t*1000)); if(q) rows.push({t:t0+r.t,rl:r.range,rr:q.range,el:r.resE,er:q.resE}); });
  const mv=rows.filter(r=>r.t>=17.8&&r.t<33);
  function corr(a,b){ const n=a.length, xa=a.reduce((u,v)=>u+v)/n, xb=b.reduce((u,v)=>u+v)/n; let s=0,sa=0,sb=0; for(let i=0;i<n;i++){ s+=(a[i]-xa)*(b[i]-xb); sa+=(a[i]-xa)**2; sb+=(b[i]-xb)**2; } return s/Math.sqrt(sa*sb||1e-30); }
  let best={c:0,lag:0}; for(let lag=-0.6;lag<=0.601;lag+=0.05){ const g=mv.map(r=>target(r.t-lag)); const c=corr(mv.map(r=>r.rl-r.rr),g); if(Math.abs(c)>Math.abs(best.c)) best={c,lag}; }
  out.diffCorr=best; out.r2=best.c*best.c;
  out.bins=[[-99,-35],[-35,-12],[-12,12],[12,35],[35,99]].map(([a,b])=>{ const w=mv.filter(r=>{ const tx=target(r.t-best.lag); return tx!==null&&tx>=a&&tx<b; }); const m=k=>{ const v=w.map(r=>r[k]).sort((p,q)=>p-q); return v.length?v[v.length>>1]:NaN; }; return {a,b,rl:m('rl'),rr:m('rr')}; });
  const hold=(a,b)=>{ const w=rows.filter(r=>r.t>=a+1&&r.t<b), m=v=>{ v.sort((p,q)=>p-q); return v[v.length>>1]; }; return {d:m(w.map(r=>r.rl-r.rr)),rl:m(w.map(r=>r.rl)),rr:m(w.map(r=>r.rr))}; };
  out.hold={l:hold(33,36),r:hold(36,39),c:hold(39,42)};
  return out; }

function report(name,meta,x){ const R=analyse(meta,x);
  console.log(`\n== ${name} ==${meta.synth?(meta.split?' (синтетика: левый канал — верхний динамик)':' (синтетика: оба канала — нижний динамик)'):''} | разъём ${meta.port==='right'?'справа':meta.port==='left'?'слева':'— не знаю'}`);
  const dd=R.R.d0!==null&&R.L.d0!==null?R.L.d0-R.R.d0:NaN, T=256;   // задержки по кругу 512; разница — в пределах ±256
  const dW=isNaN(dd)?NaN:((dd+T+512)%512)-T;
  console.log(`  прямой сигнал: левый канал — задержка ${R.L.d0}, выраженность ${R.L.prom?R.L.prom.toFixed(1):'—'} дБ | правый — ${R.R.d0}, ${R.R.prom?R.R.prom.toFixed(1):'—'} дБ | левый позже правого на ${dW} отсч. (≈${(dW*343/48).toFixed(0)} мм пути)`);
  console.log(`  каналы между собой: левый ${R.cmp.dB>=0?'громче':'тише'} правого на ${Math.abs(R.cmp.dB).toFixed(1)} дБ, позже на ${R.cmp.lag.toFixed(1)} отсч. (по наклону фазы; ≈${(R.cmp.lag*343/48).toFixed(0)} мм пути)`);
  console.log(`  палец на верхнем динамике: левый зонд ${R.coverDrop[0]>=0?'+':''}${R.coverDrop[0].toFixed(1)} дБ, правый ${R.coverDrop[1]>=0?'+':''}${R.coverDrop[1].toFixed(1)} дБ`);
  const apart=Math.abs(R.cmp.lag)>=8||Math.abs(dW)>=8, cov=Math.min(...R.coverDrop)<=-4&&Math.abs(R.coverDrop[0]-R.coverDrop[1])>=3;
  const topCh=cov?(R.coverDrop[0]<R.coverDrop[1]?'левый':'правый'):apart?(dW>0?'левый':'правый'):null;
  if(R.cmp.dB<-20||R.cmp.dB>20) console.log(`  ! один канал слышен в ${Math.round(10**(Math.abs(R.cmp.dB)/20))} раз слабее другого — его эхо от ладони тонет`);
  console.log(`  → каналы ${apart||cov?'звучат из РАЗНЫХ динамиков'+(topCh?'; верхний — '+topCh+' канал':''):'звучат, похоже, из ОДНОГО места'} (разница задержек ${apart?'есть':'нет'}, палец ${cov?'глушит один из них':'не различает'})`);
  console.log(`  ладонь вдоль телефона, ±${A} мм: разница расстояний (левый − правый зонд) следует за меткой: ${R.diffCorr.c>=0?'+':''}${R.diffCorr.c.toFixed(2)} (задержка ${R.diffCorr.lag.toFixed(2)} с), R² ${R.r2.toFixed(2)}`);
  R.bins.forEach(q=>console.log(`    метка ${(q.a<-90?'≤ −35':q.b>90?'≥ +35':(q.a>0?'+':'')+q.a+'…'+(q.b>0?'+':'')+q.b).padEnd(9)} мм | по левому зонду ${q.rl.toFixed(0).padStart(4)} мм, по правому ${q.rr.toFixed(0).padStart(4)} мм, разница ${(q.rl-q.rr).toFixed(0).padStart(4)}`));
  console.log(`  замри: слева разница ${R.hold.l.d.toFixed(0)} мм, по центру ${R.hold.c.d.toFixed(0)}, справа ${R.hold.r.d.toFixed(0)}`);
  const holdsOrdered=(R.hold.l.d<R.hold.c.d&&R.hold.c.d<R.hold.r.d)||(R.hold.l.d>R.hold.c.d&&R.hold.c.d>R.hold.r.d);
  const axis=R.r2>=0.5&&holdsOrdered;
  console.log('  ВЫВОД: '+(axis?'ВТОРАЯ ОСЬ ЕСТЬ — по двум зондам видно, где ладонь вдоль телефона':(apart||cov)?'динамики разные, но положение вдоль телефона по разнице расстояний не читается':'второго динамика нет — оба канала из одного места, оси нет'));
  return {apart,cov,axis,r2:R.r2}; }

module.exports={synthRec,analyse,report,target};
if(require.main===module){
  if(synth){ const a=report('синтетика, два торца',...Object.values(synthRec(true))), b=report('синтетика, один динамик',...Object.values(synthRec(false)));
    const ok=a.apart&&a.axis&&!b.apart&&!b.axis; console.log(ok?'ИТОГ: ok':'ИТОГ: ПРОВАЛ'); process.exitCode=ok?0:1; }
  for(const f of files){ const {meta,x}=C.loadWav(f); if(!meta||meta.kind!=='dual-landscape'){ console.log(`\n== ${path.basename(f)} == не запись «два динамика» (kind ${meta&&meta.kind}) — пропускаю`); continue; }
    report(path.basename(f),meta,x); }
}
