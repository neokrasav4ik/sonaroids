/* Разбор «Записи вбок» (sonarside_*.wav, с 26.09): телефон вертикально в левой руке, разъёмом к игроку; правая ладонь ребром
   (мизинец внизу, пальцы на разъём) ~8 см от торца ходит влево-вправо. Метка — смещение вбок, мм, + — вправо (как видит игрок).
   Сценарий: пусто 0–3 с, по центру 3–6, веди за меткой ±40 мм (период 6 с) 6–18, замри: центр 18, справа 21, слева 24,
   снова справа 27, снова слева 30, центр 33, убрать 36–39.
   Главный вопрос: различает ли сонар с одним микрофоном ЛЕВО и ПРАВО или слышит только «ушла от центра».
   Что считаю:
   - картина эха (мощность эха ладони по дальности 3–30 см, за вычетом пустой комнаты) на каждом «замри», без первой секунды;
   - различие картин: d(A,B) = |PA−PB| / √(|PA|·|PB|). Если d(справа, слева) заметно больше, чем d(справа, снова справа)
     и d(слева, снова слева), а «снова справа» ближе к «справа», чем к «слева» (и так же для левой) — лево и право различимы;
   - на «веди за меткой»: как дальность эха, сила эха и быстрая часть следуют за меткой x и за |x| (лучшая задержка до ±0,6 с).
   Запуск: node eval_side.js запись.wav [...]
           node eval_side.js --synth [--asym 0.3] — самопроверка на синтетике: ладонь-«ребро» из точек, динамик и микрофон
           по бокам разъёма (±12 мм). Без --asym картина симметрична — ждём «не различает»; с --asym правая сторона отражает
           сильнее (на 30%) — ждём «различает». --patch/--set — как в других стендах. */
const C=require('./common'), path=require('path');
const args=process.argv.slice(2), files=[], sets=[]; let patch=null, synth=false, asym=0;
for(let i=0;i<args.length;i++){ if(args[i]==='--set') sets.push(args[++i].split('=')); else if(args[i]==='--patch') patch=require(path.resolve(args[++i]));
  else if(args[i]==='--synth') synth=true; else if(args[i]==='--asym') asym=+args[++i]; else files.push(args[i]); }
const SR=48000, N=512, A=40;
const HOLDS=['c1','r1','l1','r2','l2','c2'], NAME={c1:'центр',r1:'справа',l1:'слева',r2:'снова справа',l2:'снова слева',c2:'снова центр'};
const target=t=>t<3?null:t<6?0:t<18?A*Math.sin(2*Math.PI*(t-6)/6):t<21?0:t<24?A:t<27?-A:t<30?A:t<33?-A:t<36?0:null;

function makeDSP(flo,HK){ let s=C.dspSrc(); s=s.replace('Math.ceil(18300/df)','Math.ceil('+flo+'/df)');
  const a1='if(bgR===null){'; if(s.indexOf(a1)<0) throw new Error('крючок стенда не нашёл место в DSP2 — код изменился, поправь eval_side.js');
  s=s.replace(a1,'if(HK.h2) HK.h2(h2,bgR,bgI);\n    '+a1); if(patch) s=patch(s);
  const D=new Function('HK',s+'\nreturn DSP2;')(HK); return D; }

/* синтетика: зонд как в приложении, прямой сигнал, отражение комнаты, ладонь — 7 точек вдоль «ребра» (от кончиков пальцев назад) */
function synthRec(){ const js=C.appJs(), FLO=+js.match(/F_LO=(\d+)/)[1], df=SR/N, kLo=Math.ceil(FLO/df), kHi=Math.floor(20500/df), ks=[];
  for(let k=kLo;k<=kHi;k++) ks.push(k); const M=ks.length, pr=new Float64Array(N); let mx=0;
  for(let n=0;n<N;n++){ let s=0; for(let q=0;q<M;q++) s+=Math.cos(2*Math.PI*ks[q]*n/N+Math.PI*q*q/M); pr[n]=s; mx=Math.max(mx,Math.abs(s)); }
  for(let n=0;n<N;n++) pr[n]=pr[n]/mx*0.9*0.25;
  const Pre={},Pim={}; for(const k of ks){ let re=0,im=0; for(let n=0;n<N;n++){ re+=pr[n]*Math.cos(2*Math.PI*k*n/N); im-=pr[n]*Math.sin(2*Math.PI*k*n/N); } Pre[k]=re; Pim[k]=im; }
  const cosT=ks.map(k=>Float64Array.from({length:N},(_,n)=>Math.cos(2*Math.PI*k*n/N))), sinT=ks.map(k=>Float64Array.from({length:N},(_,n)=>Math.sin(2*Math.PI*k*n/N)));
  function frameOf(paths,noise,seed){ const out=new Float32Array(N); let s=seed;
    for(const p of paths) ks.forEach((k,q)=>{ const a=-2*Math.PI*k*p.d/N, c=Math.cos(a), sn=Math.sin(a), re=(Pre[k]*c-Pim[k]*sn)*2/N*p.a, im=(Pre[k]*sn+Pim[k]*c)*2/N*p.a;
      const ct=cosT[q], st=sinT[q]; for(let n=0;n<N;n++) out[n]+=re*ct[n]-im*st[n]; });
    for(let n=0;n<N;n++){ s=(s*1664525+1013904223)>>>0; out[n]+=(s/4294967296-0.5)*noise; } return out; }
  const S=[12,0], Mc=[-12,0], d0=80, dDir=37.3, c=343e3/SR;   // мм; c — мм за отсчёт
  const frames=[], TT=39; let jit=0;
  for(let f=0;f<Math.round(TT*SR/N);f++){ const t=(f+0.5)*N/SR, x=target(t), p=[{d:dDir,a:1},{d:dDir+62,a:0.35}];
    if(x!==null){ jit+=0.02*(Math.sin(f*0.37)+Math.sin(f*0.11));
      const ph=Math.floor(t/3), ox=6*Math.sin(ph*2.3+1), od=6*Math.sin(ph*1.7+2);   // рука каждый раз встаёт чуть иначе: ±6 мм вбок и по дальности
      const xx=x+jit*0.2+ox, dd=d0+od;
      for(let j=0;j<7;j++){ const P=[xx,dd+j*12], r1=Math.hypot(P[0]-S[0],P[1]-S[1]), r2=Math.hypot(P[0]-Mc[0],P[1]-Mc[1]);
        const g=(j===0?1:0.35)*(asym?(1+asym*Math.tanh(xx/20)):1);
        p.push({d:dDir+(r1+r2-24)/c,a:0.25*g*(80*80)/(r1*r2)*Math.exp(-(xx*xx)/(2*45*45))}); } }
    frames.push(frameOf(p,4e-4,f*7+1)); }
  const x=new Float32Array(frames.length*N); frames.forEach((fr,i)=>x.set(fr,i*N));
  const marks={}; [['empty',0],['place',3],['move',6],['c1',18],['r1',21],['l1',24],['r2',27],['l2',30],['c2',33],['away',36]].forEach(([k,t])=>marks[k]=Math.round(t*SR/N)*N);
  return {meta:{kind:'side-portrait',probe:{f_lo:FLO},marks,synth:true,asym},x}; }

function analyse(meta,x){ const flo=C.bandOf(meta), rows=[]; let cur=null;
  const HK={h2:(h2,bR,bI)=>{ cur=bR?{h2:[Float64Array.from(h2[0]),Float64Array.from(h2[1])],bR:bR,bI:bI}:null; }};
  const D=makeDSP(flo,HK); D.init(SR,'all'); sets.forEach(([k,v])=>D.set(k,+v));
  for(let k=0;k<Math.floor(x.length/N);k++){ cur=null; const r=D.frame(x.subarray(k*N,(k+1)*N)); const t=(k+1)*N/SR;
    if(r&&cur){ const G=cur.h2[0].length, p=new Float64Array(G); for(let i=0;i<G;i++){ const dr=cur.h2[0][i]-cur.bR[i], di=cur.h2[1][i]-cur.bI[i]; p[i]=dr*dr+di*di; }
      rows.push({t,range:r.range,res:r.resE,fast:r.fast,present:r.present,E:r.E,p}); } }
  const inf=D.info(), mm=inf.mm, gA=Math.round(30/mm);
  const mk=meta.marks||{}, tOf=k=>mk[k]!==undefined?mk[k]/SR:null;
  const bounds=['empty','place','move','c1','r1','l1','r2','l2','c2','away'].map(k=>[k,tOf(k)]);
  const phase=k=>{ const i=bounds.findIndex(b=>b[0]===k); return [bounds[i][1], i+1<bounds.length?bounds[i+1][1]:rows[rows.length-1].t]; };
  const prof=k=>{ const [a,b]=phase(k), w=rows.filter(r=>r.t>=a+1&&r.t<b); if(!w.length) return null; const G=w[0].p.length, P=new Float64Array(G);
    w.forEach(r=>{ for(let i=0;i<G;i++) P[i]+=r.p[i]/w.length; }); const q=w.map(r=>r.range).sort((u,v)=>u-v), e=w.map(r=>r.res).sort((u,v)=>u-v);
    return {P,range:q[q.length>>1],res:e[e.length>>1],pres:100*w.filter(r=>r.present).length/w.length}; };
  const nrm=P=>Math.sqrt(P.reduce((u,v)=>u+v*v,0)), dist=(A,B)=>{ let s=0; for(let i=0;i<A.length;i++) s+=(A[i]-B[i])**2; return Math.sqrt(s)/Math.sqrt(nrm(A)*nrm(B)); };
  const H={}; HOLDS.forEach(k=>H[k]=prof(k));
  // «веди за меткой»: как следуют признаки за x и |x|
  const [ma,mb]=phase('move'), mv=rows.filter(r=>r.t>=ma+0.8&&r.t<mb);
  function corr(a,b){ const n=a.length, xa=a.reduce((u,v)=>u+v)/n, xb=b.reduce((u,v)=>u+v)/n; let s=0,sa=0,sb=0; for(let i=0;i<n;i++){ s+=(a[i]-xa)*(b[i]-xb); sa+=(a[i]-xa)**2; sb+=(b[i]-xb)**2; } return s/Math.sqrt(sa*sb||1e-30); }
  function follow(get,f){ let best={c:0,lag:0}; for(let lag=-0.6;lag<=0.601;lag+=0.05){ const v=mv.map(get), g=mv.map(r=>f(target(r.t-lag)));
      const c=corr(v,g); if(Math.abs(c)>Math.abs(best.c)) best={c,lag}; } return best; }
  const cum=[]; let acc=0; mv.forEach(r=>{ cum.push(r.fast); });
  const feats={'дальность эха':r=>r.range,'сила эха':r=>r.res,'быстрая часть':r=>r.fast};
  const fol={}; for(const [n,g] of Object.entries(feats)) fol[n]={x:follow(g,v=>v),ax:follow(g,v=>Math.abs(v))};
  /* 27.09: главный тест — можно ли по эху восстановить x в движении. Подгоняю x ≈ a·дальность + b·сила + c (лучшая задержка до 0,6 с).
     Одни «замри» обманчивы: у настоящей руки «галочка» (ближе всего к разъёму — не по центру, а на 1–2 см вбок, так ходит рука от локтя),
     и крайние точки слева и справа могут различаться, хотя посередине пути лево и право путаются (запись 22:17, кулак) */
  function fitX(lag){ const X=[],Y=[]; mv.forEach(r=>{ const tx=target(r.t-lag); if(tx===null) return; X.push([r.range,r.res,1]); Y.push(tx); });
    const A=[[0,0,0],[0,0,0],[0,0,0]], b=[0,0,0]; X.forEach((v,i)=>{ for(let p=0;p<3;p++){ b[p]+=v[p]*Y[i]; for(let q=0;q<3;q++) A[p][q]+=v[p]*v[q]; } });
    const det=m=>m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
    const D=det(A); if(!D) return {lag,r2:0,rmse:NaN}; const w=[0,1,2].map(k=>det(A.map((row,i)=>row.map((v,j)=>j===k?b[i]:v)))/D);
    const P=X.map(v=>v[0]*w[0]+v[1]*w[1]+w[2]), my=Y.reduce((u,v)=>u+v)/Y.length; let ss=0,st=0; P.forEach((p,i)=>{ ss+=(Y[i]-p)**2; st+=(Y[i]-my)**2; });
    return {lag,r2:1-ss/st,rmse:Math.sqrt(ss/Y.length)}; }
  let fx=null; for(let lag=-0.6;lag<=0.601;lag+=0.05){ const q=fitX(lag); if(!fx||q.r2>fx.r2) fx=q; }
  const bins=[[-99,-25],[-25,-10],[-10,10],[10,25],[25,99]].map(([a,b])=>{ const w=mv.filter(r=>{ const tx=target(r.t-fx.lag); return tx!==null&&tx>=a&&tx<b; });
    const m=k=>{ const v=w.map(r=>r[k]).sort((p,q)=>p-q); return v.length?v[v.length>>1]:NaN; }; return {a,b,range:m('range'),res:m('res')}; });
  return {inf,mm,gA,H,dist,fol,fx,bins,rows,mvN:mv.length}; }

function report(name,meta,x){ const R=analyse(meta,x), H=R.H, d=R.dist;
  console.log(`\n== ${name} ==${meta.synth?' (синтетика'+(meta.asym?', правая сторона сильнее на '+Math.round(meta.asym*100)+'%':'')+')':''} | зонд: выраженность ${R.inf.prom.toFixed(1)} дБ`+
    (meta.probe&&meta.probe.snr_db?` | запас ${meta.probe.snr_db.toFixed(1)} дБ`:'')+(meta.orientation?` | экран ${meta.orientation.h>meta.orientation.w?'вертикально':'ГОРИЗОНТАЛЬНО'}`:''));
  const miss=HOLDS.filter(k=>!H[k]); if(miss.length){ console.log('  нет фаз: '+miss.join(', ')); return null; }
  console.log('  замри          | рука видна | дальность эха, мм | сила эха, дБ над пустой');
  HOLDS.forEach(k=>console.log(`  ${NAME[k].padEnd(14)} | ${H[k].pres.toFixed(0).padStart(8)}%  | ${H[k].range.toFixed(0).padStart(10)}        | ${H[k].res.toFixed(1).padStart(8)}`));
  const dRL=(d(H.r1.P,H.l1.P)+d(H.r2.P,H.l2.P)+d(H.r1.P,H.l2.P)+d(H.r2.P,H.l1.P))/4, dRR=d(H.r1.P,H.r2.P), dLL=d(H.l1.P,H.l2.P), dCC=d(H.c1.P,H.c2.P);
  const dCS=(d(H.c1.P,H.r1.P)+d(H.c1.P,H.l1.P)+d(H.c2.P,H.r2.P)+d(H.c2.P,H.l2.P))/4;
  const okR=d(H.r2.P,H.r1.P)<d(H.r2.P,H.l1.P), okL=d(H.l2.P,H.l1.P)<d(H.l2.P,H.r1.P), okR1=d(H.r1.P,H.r2.P)<d(H.r1.P,H.l2.P), okL1=d(H.l1.P,H.l2.P)<d(H.l1.P,H.r2.P);
  const sep=dRL/((dRR+dLL)/2||1e-30), sepC=dCS/((dCC+(dRR+dLL)/2)/2||1e-30);
  console.log(`  различие картин эха: справа↔слева ${dRL.toFixed(2)} | справа↔снова справа ${dRR.toFixed(2)}, слева↔снова слева ${dLL.toFixed(2)} (разброс повторов)`);
  console.log(`  узнаёт повтор: «снова справа» ближе к «справа» — ${okR?'да':'нет'}, «снова слева» к «слева» — ${okL?'да':'нет'} (и наоборот: ${okR1?'да':'нет'}, ${okL1?'да':'нет'})`);
  console.log(`  центр против краёв: ${dCS.toFixed(2)}, центр↔снова центр ${dCC.toFixed(2)}`);
  console.log('  «веди за меткой» (±'+A+' мм): признак следует за x (лево/право) | за |x| (от центра)');
  for(const [n,f] of Object.entries(R.fol)) console.log(`    ${n.padEnd(14)} | ${f.x.c>=0?'+':''}${f.x.c.toFixed(2)} (задержка ${f.x.lag.toFixed(2)} с) | ${f.ax.c>=0?'+':''}${f.ax.c.toFixed(2)} (задержка ${f.ax.lag.toFixed(2)} с)`);
  // различимо — если повтор узнаётся, разница сторон вдвое больше разброса повторов и не меньше четверти эффекта «ушла от центра»
  const rep=(dRR+dLL)/2, lrP=okR&&okL&&okR1&&okL1&&dRL>=2*rep&&dRL>=0.25*dCS, offP=dCS>=2*(dCC+dRR+dLL)/3&&dCS>=0.2;
  // простые признаки: сила эха и дальность — стороны расходятся, если обе «справа» по одну сторону от обеих «слева» и разница вдвое больше разброса повторов
  function sc(key,thr,unit){ const r=[H.r1[key],H.r2[key]], l=[H.l1[key],H.l2[key]], c=[H.c1[key],H.c2[key]], m=a=>(a[0]+a[1])/2;
    const gap=Math.abs(m(r)-m(l)), rp=(Math.abs(r[0]-r[1])+Math.abs(l[0]-l[1]))/2, cons=Math.min(...r)>Math.max(...l)||Math.min(...l)>Math.max(...r);
    const side=[...r,...l], cg=Math.abs(m(c)-side.reduce((u,v)=>u+v)/4), cons2=Math.min(...c)>Math.max(...side)||Math.max(...c)<Math.min(...side);
    const lr=cons&&gap>=2*rp&&gap>=thr, off=cons2&&cg>=thr;
    console.log(`  ${key==='res'?'сила эха':'дальность'}: справа ${r.map(v=>v.toFixed(1)).join('/')}, слева ${l.map(v=>v.toFixed(1)).join('/')}, центр ${c.map(v=>v.toFixed(1)).join('/')} ${unit} → стороны ${lr?'РАСХОДЯТСЯ':'не расходятся'}, центр ${off?'отличается от краёв':'не отличается'}`);
    return {lr,off}; }
  const sR=sc('res',1,'дБ'), sG=sc('range',3,'мм');
  const lrHold=lrP||sR.lr||sG.lr, off=offP||sR.off||sG.off;
  console.log(`  в движении: x по дальности и силе эха — R² ${R.fx.r2.toFixed(2)}, ошибка ${R.fx.rmse.toFixed(0)} мм при размахе ±${A} (задержка ${R.fx.lag.toFixed(2)} с); по метке:`);
  R.bins.forEach(q=>console.log(`    x ${(q.a<-90?'≤ −25':q.b>90?'≥ +25':(q.a>0?'+':'')+q.a+'…'+(q.b>0?'+':'')+q.b).padEnd(9)} мм | дальность ${q.range.toFixed(0).padStart(4)} мм | сила эха ${q.res.toFixed(1).padStart(5)} дБ`));
  // лево и право различимы, только если x восстанавливается и в движении (R² ≥ 0,5), а не только на крайних «замри»
  const lr=lrHold&&R.fx.r2>=0.5;
  const v=lr?'ЛЕВО И ПРАВО РАЗЛИЧИМЫ':lrHold?'крайние положения слева и справа различаются, но в движении x по эху не восстанавливается — лево и право путаются':off?'лево и право НЕ различимы; различимо только «ушла от центра»':'не различимы ни стороны, ни уход от центра';
  console.log('  ВЫВОД: '+v); return {lr,lrHold,off,sep,sepC,r2:R.fx.r2}; }

module.exports={synthRec,analyse,report,target,SCRIPT_T:39};
if(require.main===module){
if(synth){
  const a=report('синтетика, симметрично',...Object.values(synthRec()));
  asym=asym||0.3; const b=report('синтетика, несимметрично',...Object.values(synthRec()));
  const ok=a&&b&&!a.lr&&a.off&&b.lr; console.log(ok?'ИТОГ: ok':'ИТОГ: ПРОВАЛ'); process.exitCode=ok?0:1; }
for(const f of files){ const {meta,x}=C.loadWav(f); if(!meta||meta.kind!=='side-portrait'){ console.log(`\n== ${path.basename(f)} == не запись вбок (kind ${meta&&meta.kind}) — пропускаю`); continue; }
  report(path.basename(f),meta,x); }
}
