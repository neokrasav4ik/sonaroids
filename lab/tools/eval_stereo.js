/* Разбор пробы стереомикрофона (sonarstereo_*.wav, с 27.09, 0.39q): два канала входа, как их отдал браузер.
   1) Разные ли каналы вообще: сходство (корреляция) и разница уровней; одинаковые — значит, микрофон один (дальше смысла нет).
   2) Для каждой фазы (ладонь слева / справа / за верхним торцом / перед разъёмом) по движущемуся эху каждого канала (eval_two.motion):
      где по расстоянию эхо в канале A и в канале B (середина энергии), разница путей B − A в мм (поправка на прямой сигнал) и разница силы.
      Если «слева» и «справа» дают разные разницы — есть вторая ось.
   Запуск: node eval_stereo.js запись.wav [...] | --synth — синтетика (второй микрофон в 7 см вбок) */
const C=require('./common'), T=require('./eval_two'), path=require('path');
const SR=48000, N=512, FR=SR/N;
function split(x,ch){ if(ch!==2) return [x,x]; const n=x.length>>1, a=new Float32Array(n), b=new Float32Array(n); for(let i=0;i<n;i++){ a[i]=x[2*i]; b[i]=x[2*i+1]; } return [a,b]; }
function analyse(meta,x){ const [a,b]=split(x,meta.channels||1); let sa=0,sb=0,sab=0,dd=0; for(let i=0;i<a.length;i++){ sa+=a[i]*a[i]; sb+=b[i]*b[i]; sab+=a[i]*b[i]; dd+=(a[i]-b[i])**2; }
  const same=dd<1e-12*a.length, corr=sab/Math.sqrt(sa*sb||1e-30), db=10*Math.log10((sb||1e-30)/(sa||1e-30));
  const res={same,corr,db,phases:[]}; if(same) return res;
  const A=T.motion(meta,a), B=T.motion(meta,b,A.t0), B0=T.motion(meta,b); res.t0a=A.t0; res.t0b=B0.t0; const dDir=(B0.t0-A.t0)*343e3/SR/2;   // мм: разница прямого сигнала
  const mk=meta.marks||{}, keys=Object.keys(mk).sort((p,q)=>mk[p]-mk[q]), nR=A.nR, R=A.R;
  keys.forEach((k,i)=>{ const f0=Math.round(mk[k]/N+0.8*FR), f1=Math.round((i+1<keys.length?mk[keys[i+1]]:x.length/(meta.channels||1))/N-0.3*FR); if(f1-f0<20) return;
    const per=[]; for(let f=f0;f+16<=f1;f+=8){ let ea=0,eb=0,ca=0,cb=0; for(let g=f;g<f+16;g++) for(let j=0;j<nR;j++){ const pa=A.DR[g][j]**2+A.DI[g][j]**2, pb=B.DR[g][j]**2+B.DI[g][j]**2; ea+=pa; eb+=pb; ca+=pa*R[j]; cb+=pb*R[j]; }
      per.push({e:ea+eb,d:cb/eb-ca/ea-dDir,l:10*Math.log10(eb/ea)}); }
    const emax=Math.max(...per.map(q=>q.e)), act=per.filter(q=>q.e>0.1*emax); if(act.length<3) return;
    const st=v=>{ v=v.slice().sort((p,q)=>p-q); return {med:v[v.length>>1],lo:v[Math.floor(v.length*0.25)],hi:v[Math.floor(v.length*0.75)]}; };
    const e=act.reduce((u,q)=>u+q.e,0)/act.length;
    res.phases.push({k,n:act.length,e,d:st(act.map(q=>q.d)),l:st(act.map(q=>q.l))}); });
  const g=k=>res.phases.find(p=>p.k===k), sep=(p,q,f)=>p&&q&&(Math.abs(p[f].med-q[f].med)>((p[f].hi-p[f].lo)+(q[f].hi-q[f].lo))/2);
  res.lr={path:sep(g('L'),g('R'),'d'),level:sep(g('L'),g('R'),'l')}; res.tb={path:sep(g('T'),g('B'),'d'),level:sep(g('T'),g('B'),'l')};
  return res; }
const NAME={empty:'пусто',L:'ладонь слева',R:'ладонь справа',T:'за верхним торцом',B:'перед разъёмом',away:'руки нет'};
function report(name,meta,x){ const r=analyse(meta,x), mic=meta.mic||{};
  console.log(`\n== ${name} == | браузер: каналов ${mic.nch||'—'}, в настройках ${mic.settings&&mic.settings.channelCount||'—'}${mic.label?', «'+mic.label+'»':''}`);
  console.log(`  каналы ${r.same?'ОДИНАКОВЫЕ — микрофон один, второй оси нет':'разные'}: сходство ${r.corr.toFixed(3)}, уровень B − A ${r.db.toFixed(1)} дБ${r.same?'':`, прямой сигнал A ${r.t0a.toFixed(2)} / B ${r.t0b.toFixed(2)} отсчёта`}`);
  if(r.same) return r;
  r.phases.forEach(p=>console.log(`  ${(NAME[p.k]||p.k).padEnd(20)} путь B − A ${p.d.med.toFixed(0).padStart(4)} мм (${p.d.lo.toFixed(0)}…${p.d.hi.toFixed(0)}) | сила B − A ${p.l.med.toFixed(1).padStart(5)} дБ (${p.l.lo.toFixed(1)}…${p.l.hi.toFixed(1)}) | окон ${p.n}`));
  console.log(`  ВЫВОД: слева/справа — ${r.lr.path||r.lr.level?'РАЗЛИЧИМЫ ('+[r.lr.path?'по пути':'',r.lr.level?'по силе':''].filter(Boolean).join(', ')+')':'не различимы'}; за торцом/перед разъёмом — ${r.tb.path||r.tb.level?'различимы ('+[r.tb.path?'по пути':'',r.tb.level?'по силе':''].filter(Boolean).join(', ')+')':'не различимы'}`);
  return r; }
/* синтетика: микрофон A у разъёма, B — в 7 см вбок (как если бы браузер отдал второй микрофон с другого места); ладонь слева/справа/сверху/снизу */
function synth(){ const S=require('./eval_right'), js=C.appJs(), i=js.indexOf('var SCRIPT_ST='), SC=new Function(js.slice(i,js.indexOf('var ST=',i))+'\nreturn SCRIPT_ST;')();
  const TOT=SC[SC.length-1].t, F=Math.floor(TOT*FR), x=new Float32Array(2*F*N), marks={}; let cur=-1;
  const pos={L:[-90,0],R:[90,0],T:[0,-180],B:[0,90]};   // мм: x вбок (+ вправо), y вдоль телефона (+ к игроку); разъём в (0,0), микрофон B в (70,-20)
  for(let f=0;f<F;f++){ const t=f/FR; let k=SC.length-1; while(SC[k].t>t) k--; if(k!==cur){ cur=k; if(SC[k].k!=='end') marks[SC[k].k]=f*N; }
    const p=pos[SC[k].k]; let la=[],lb=[]; if(p){ const h=60+25*Math.sin(2*Math.PI*t/1.5), dA=Math.hypot(p[0],p[1],h), dB=Math.hypot(p[0]-70,p[1]+20,h);
      la=[{d:dA,a:0.25}]; lb=[{d:(dA+dB)/2,a:0.25*dA/dB}]; }
    const fa=S.synthMulti(la,f*7+3), fb=S.synthMulti(lb,f*11+5); for(let n=0;n<N;n++){ x[2*(f*N+n)]=fa[n]; x[2*(f*N+n)+1]=fb[n]; } }
  return {meta:{kind:'stereo-portrait',channels:2,marks,probe:{f_lo:+js.match(/F_LO=(\d+)/)[1]},mic:{nch:2}},x}; }
module.exports={analyse,report,synth};
if(require.main===module){ const args=process.argv.slice(2);
  if(args[0]==='--synth'){ const {meta,x}=synth(); report('синтетика: второй микрофон в 7 см вбок',meta,x); }
  else for(const f of args){ const {meta,x}=C.loadWav(f); if(!meta||meta.kind!=='stereo-portrait'){ console.log(`\n== ${path.basename(f)} == не проба стерео (kind ${meta&&meta.kind})`); continue; } report(path.basename(f),meta,x); } }
