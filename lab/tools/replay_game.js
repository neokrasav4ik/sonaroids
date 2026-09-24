/* Стенд повторного прогона журнала партии: звук из журнала снова проходит через DSP2 из собранного приложения.
   Зачем: (1) проверить, что офлайн-движок повторяет то, что видел телефон (сверка с glog.dsp по кадрам);
          (2) мерить варианты обработки на настоящих партиях — те же метрики, что у game_log.py.
   Запуск: node replay_game.js журнал.wav [ещё.wav ...] [--set tint=-30 --set deadband=10 ...] [--patch файл.js]
   --set  — параметры через DSP2.set (tint, tau, absmed, deadband);
   --patch — модуль, экспортирующий function(src){ return изменённый_src; } — правка исходника DSP2 для опытов.
   --bg mean|learn   — фон пустой комнаты: mean (по умолчанию) — среднее комплексной характеристики за всю партию
                       (эхо движущейся ладони вращается по фазе и усредняется к нулю); learn — как в приложении, по первым кадрам
                       (годится, только если журнал начался с пустой комнаты — обычно нет: журнал стартует на отсчёте, ладонь уже на месте);
   --present force|dsp — force (по умолчанию): рука считается присутствующей всегда (в партиях телефон видел её 100%);
                       dsp — решает сам движок (без пустой комнаты в начале журнала уровень «пустоты» учится с рукой — будут ложные уходы).
   --phys — прогнать старый журнал по новой схеме (с 24.09): физическая калибровка приложения + центровка; --cal k,s — своя калибровка, центр по первым 2 с.
   Журнал, записанный с центровкой (autocenter в метаданных), прогоняется с ней же.
   Калибровка и полоса берутся из метаданных журнала. Первые 1,5 с прогона — разогрев, в сверку и метрики не входят. */
const C=require('./common');
const args=process.argv.slice(2), files=[], sets=[]; let patch=null, bgMode=null, presMode=null, calOv=null, phys=false;
for(let i=0;i<args.length;i++){ if(args[i]==='--set') sets.push(args[++i].split('=')); else if(args[i]==='--patch') patch=require(require('path').resolve(args[++i]));
  else if(args[i]==='--phys') phys=true; else if(args[i]==='--cal') calOv=args[++i].split(',').map(Number); else if(args[i]==='--bg') bgMode=args[++i]; else if(args[i]==='--present') presMode=args[++i]; else files.push(args[i]); }
/* стендовые крючки в копии DSP2 (в приложение не попадают): HK.h2 — видеть характеристику кадра, HK.bg — подставить фон, HK.force — рука всегда есть */
function makeDSP(flo,HK){ let s=C.dspSrc(); s=s.replace('Math.ceil(18300/df)','Math.ceil('+flo+'/df)');
  const a1='if(bgR===null){', a2='var started=present&&!was;';
  if(s.indexOf(a1)<0||s.indexOf(a2)<0) throw new Error('крючки стенда не нашли место в DSP2 — код изменился, поправь replay_game.js');
  s=s.replace(a1,'if(HK.h2) HK.h2(h2); if(bgR===null&&HK.bg){ bgR=HK.bg[0].slice(); bgI=HK.bg[1].slice(); }\n    '+a1);
  s=s.replace(a2,'if(HK.force) present=true; '+a2);
  if(patch) s=patch(s); return new Function('HK',s+'\nreturn DSP2;')(HK); }
function gameOf(meta){ return meta.game||Object.assign({f_lo:meta.probe.f_lo},meta.setup); }
/* --cal k,s — своя калибровка вместо записанной: o подбирается так, чтобы медиана дальности за первые 2 с после разогрева стала 100 (середина поля) */
function calOverride(x,meta,flo,HK){ const g=gameOf(meta), c0=g.cal; const rows=run(x,meta,flo,HK,c0); const t0=rows[0].t+1.5, w=rows.filter(r=>r.t>=t0&&r.t<t0+2&&r.present).map(r=>r.range).sort((a,b)=>a-b);
  const r0=w[w.length>>1]; return {k:calOv[0],o:100-calOv[0]*r0,s:calOv[1]}; }
function run(x,meta,flo,HK,cal){ const gm=gameOf(meta), D=makeDSP(flo,HK); D.init(meta.fs,'all'); D.setCal(cal||HK.cal||gm.cal); if(HK.auto) D.set('autocenter',1); sets.forEach(([k,v])=>D.set(k,+v));
  const rows=[]; for(let k=0;k<Math.floor(x.length/512);k++){ if(HK.calAt&&HK.calAt.has(meta.first_frame+k)) D.setCal(HK.calAt.get(meta.first_frame+k)); if(HK.recAt&&HK.recAt.has(meta.first_frame+k)) D.recenter(); if(HK.shiftAt&&HK.shiftAt.has(meta.first_frame+k)) HK.shiftAt.get(meta.first_frame+k).forEach(d=>D.shift(d)); const r=D.frame(x.subarray(k*512,(k+1)*512)); if(r) rows.push(Object.assign({f:meta.first_frame+k,t:(k+1)*512/meta.fs},r)); }
  return rows; }
function meanBg(x,meta,flo){ let acc=null,n=0; run(x,meta,flo,{h2:h=>{ if(!acc) acc=[new Float64Array(h[0].length),new Float64Array(h[0].length)];
  for(let i=0;i<h[0].length;i++){ acc[0][i]+=h[0][i]; acc[1][i]+=h[1][i]; } n++; }});
  for(let i=0;i<acc[0].length;i++){ acc[0][i]/=n; acc[1][i]/=n; } return acc; }
const std=a=>{ const m=a.reduce((u,v)=>u+v,0)/a.length; return Math.sqrt(a.reduce((u,v)=>u+(v-m)**2,0)/a.length); };
const pct=(a,p)=>{ const b=a.slice().sort((x,y)=>x-y); return b[Math.min(b.length-1,Math.floor(b.length*p))]; };
function smoothDev(v,k){ const h=k>>1, out=[]; for(let i=h;i<v.length-h;i++){ let s=0; for(let j=i-h;j<=i+h;j++) s+=v[j]; out.push(v[i]-s/k); } return out; }
function corr(a,b){ const n=a.length, ma=a.reduce((u,v)=>u+v)/n, mb=b.reduce((u,v)=>u+v)/n; let sab=0,saa=0,sbb=0;
  for(let i=0;i<n;i++){ sab+=(a[i]-ma)*(b[i]-mb); saa+=(a[i]-ma)**2; sbb+=(b[i]-mb)**2; } return sab/Math.sqrt(saa*sbb); }
/* метрики как в game_log.py: по кадрам, где рука есть */
function metrics(rows,cal){
  const m=rows.filter(r=>r.present); if(m.length<100) return null;
  const h=rows.map(r=>r.height), ab=rows.map(r=>r.abs), pres=rows.map(r=>r.present);
  const jit=(v)=>{ const d=smoothDev(v,31), p=pres.slice(15,-15), q=d.filter((_,i)=>p[i]); return std(q.slice(31,-31)); };
  const dF=[],dA=[], t=rows.map(r=>r.t);
  for(let a=t[0];a<t[t.length-1]-2;a+=0.5){ const w=rows.filter(r=>r.present&&r.t>=a&&r.t<a+2); if(w.length<150) continue;
    const f=w.map(r=>r.fast*cal.s), b=w.map(r=>r.abs); dF.push(Math.max(...f)-Math.min(...f)); dA.push(Math.max(...b)-Math.min(...b)); }
  const gap=m.map(r=>Math.abs(r.height-r.abs)), jmp=[]; for(let i=1;i<rows.length;i++) if(pres[i]&&pres[i-1]) jmp.push(Math.abs(h[i]-h[i-1]));
  return {vis:100*m.length/rows.length,gap:pct(gap,0.5),gap95:pct(gap,0.95),agree:dF.length>3?corr(dF,dA):NaN,jump:pct(jmp,0.5),jump99:pct(jmp,0.99),jitA:jit(ab),jitH:jit(h)};
}
const fmt=s=>s?`рука ${s.vis.toFixed(1)}% | итог−абс. ${s.gap.toFixed(1)}/${s.gap95.toFixed(0)} мм | согласие ${s.agree.toFixed(2)} | скачок ${s.jump.toFixed(2)}/${s.jump99.toFixed(1)} мм | шум абс. ${s.jitA.toFixed(1)} мм, итога ${s.jitH.toFixed(2)} мм`:'мало кадров с рукой';
for(const f of files){
  const {meta,glog,x}=C.loadWav(f), setup=meta.kind==='setup-log', gm=gameOf(meta), flo=gm.f_lo||C.bandOf(meta), f0=meta.first_frame;
  // журнал настройки начинается с запуска обработки — пустая комната в нём есть, поэтому по умолчанию движок решает всё сам, как на телефоне
  const bgM=bgMode||(setup?'learn':'mean'), prM=presMode||(setup?'dsp':'force');
  const HK={force:prM==='force'}; if(bgM==='mean') HK.bg=meanBg(x,meta,flo); if(calOv) HK.cal=calOverride(x,meta,flo,HK);
  // центровка, как в приложении с 24.09: сама после появления руки и в конце каждого отсчёта (событие 'start' журнала партии, 'центр' журнала настройки).
  // --phys — прогнать старый журнал по новой схеме: физическая калибровка приложения + центровка
  if(phys){ HK.cal=C.physCal(); }
  if(phys||gm.autocenter){ HK.auto=true;
    if(gm.tune==='waves'){ HK.shiftAt=new Map(); glog.events.filter(e=>e[1]==='подстройка').forEach(e=>{ const a=HK.shiftAt.get(e[0])||[]; a.push(e[2].d); HK.shiftAt.set(e[0],a); }); }   // с подстройкой по взмахам: сдвиги из журнала настройки
    else HK.recAt=new Set(glog.events.filter(e=>e[1]===(setup?'центр':'start')).map(e=>e[0])); }
  if(setup) HK.calAt=new Map(glog.events.filter(e=>e[1]==='калибровка').map(e=>[e[0],e[2]]));
  const rows=run(x,meta,flo,HK);
  // сверка с тем, что видел телефон: только кадры после разогрева, где обе стороны видят руку
  const logged=new Map(glog.dsp.map(a=>[a[0],a])), warm=f0+Math.round(meta.fs/512*1.5);
  const dh=[],dr=[],dp=[]; rows.forEach(r=>{ const a=logged.get(r.f); if(!a||r.f<warm) return; dp.push((a[1]===1)===r.present?0:1);
    if(a[1]===1&&r.present){ dr.push(Math.abs(a[4]-r.range)); dh.push(Math.abs(a[2]-r.height)); } });
  console.log(`\n== ${f.split('/').pop()} ==  полоса с ${flo} Гц | калибровка k=${gm.cal.k.toFixed(2)} o=${gm.cal.o.toFixed(0)} s=${gm.cal.s.toFixed(2)} | фон ${bgM}, рука ${prM}${sets.length?' | --set '+sets.map(s=>s.join('=')).join(' '):''}${patch?' | --patch':''}`);
  console.log(`  сверка с телефоном: присутствие расходится ${(100*dp.reduce((a,b)=>a+b,0)/(dp.length||1)).toFixed(1)}% кадров | дальность |Δ| медиана ${pct(dr,0.5).toFixed(2)} мм, p99 ${pct(dr,0.99).toFixed(1)} | итог |Δ| медиана ${pct(dh,0.5).toFixed(1)} мм (итог копит историю — расхождение ожидаемо)`);
  const pl=glog.dsp.map(a=>({f:a[0],t:a[0]*512/meta.fs,present:a[1]===1,height:a[2],abs:a[3],range:a[4],fast:a[5]}));
  console.log(`  телефон : ${fmt(metrics(pl,gm.cal))}`);
  console.log(`  прогон  : ${fmt(metrics(rows.filter(r=>r.f>=warm),HK.cal||gm.cal))}${HK.cal?` | калибровка прогона k=${HK.cal.k.toFixed(2)} o=${HK.cal.o.toFixed(0)} s=${HK.cal.s.toFixed(2)}`:''}`);
}
