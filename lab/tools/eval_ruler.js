/* СонарЛинк, «Линейка» (1.56o): разбор записи с линейкой на двух телефонах. Журнал каждого телефона — «Сохранить журнал партии» после записи.
   Программа (одна на оба, по общим часам): обе ладони на 5, 10, 15, 20, 25 см и обратно (3 с перевести, 4 с держать), обе вместе вверх-вниз,
   левая ходит — правая стоит на 15, и наоборот. Для каждого телефона: что он мерит на каждой отметке — дальность эха (мм), высота вихря
   (быстрая часть + подтягивание), абсолютная (центр эха), видна ли ладонь, дрожь и уход на удержании, прыжки эха; прямая «см → мм эха»
   (наклон, сдвиг, разброс), разница «вверх» и «вниз». Для пары: на одной отметке — где вихри на экранах (доля высоты), насколько расходятся;
   вместе вверх-вниз — как идут вихри друг за другом; одна ходит — стоит ли другая (не путает ли телефон чужую ладонь).
   Запуск: node eval_ruler.js журнал_L.wav [журнал_R.wav]   Как модуль: require('./eval_ruler').analyze([файлы]) */
const E=require('./eval_string.js'), path=require('path');
const md=a=>{ if(!a.length) return NaN; const s=[...a].sort((x,y)=>x-y); return s[s.length>>1]; };
const q=(a,p)=>{ if(!a.length) return NaN; const s=[...a].sort((x,y)=>x-y); return s[Math.min(s.length-1,Math.floor(s.length*p))]; };
const f0=x=>Number.isFinite(x)?x.toFixed(0):'—', f1=x=>Number.isFinite(x)?x.toFixed(1):'—';
const G={ms:0,srv:1,f:2,ph:3,t:4,palm:5,frac:6,dist:7,hy:8,hp:9,pv:10,vL:11,vR:12};

function prep(file){ const L=E.load(file), sc=(L.g.script||[]).slice(-1)[0]; if(!sc) throw new Error(file+': в журнале нет записи с линейкой');
  const game=L.g.game.filter(r=>r[G.ph]===6);   // шаги в «линейке»
  /* общие часы → кадр звука: по строкам шага (srv, f) */
  const map=game.filter(r=>r[G.f]>=0);
  const frameAt=srv=>{ if(!map.length) return null; let lo=0, hi=map.length-1; if(srv<=map[0][1]) return map[0][2]; if(srv>=map[hi][1]) return map[hi][2];
    while(hi-lo>1){ const m=(lo+hi)>>1; if(map[m][1]<=srv) lo=m; else hi=m; } const a=map[lo], b=map[hi]; return a[2]+(b[2]-a[2])*(srv-a[1])/Math.max(1,b[1]-a[1]); };
  const cal=L.s.cal||{k:1,o:0};
  return {L,file:path.basename(file),half:L.s.half||'—',steps:sc.steps,T0:sc.T0,game,frameAt,cal,dsp:L.dsp}; }

/* окно шага: удержание — без первых 1,5 с (ладонь доезжает, вихрь догоняет); волна — целиком */
function win(P,s){ const d=s.t1-s.t0, a=s.k==='hold'?s.t0+0.375*d:s.t0+0.025*d, b=s.t1-0.04*d; return [a,b]; }   /* при 4 с: с 1,5 с до конца без 0,15 с */
function holdStats(P,s){ const [a,b]=win(P,s), fa=P.frameAt(a), fb=P.frameAt(b);
  const g=P.game.filter(r=>r[1]>=a&&r[1]<=b), fr=g.filter(r=>r[G.palm]&&r[G.frac]!==null).map(r=>r[G.frac]);
  const o={cm:s.cm,frac:md(fr),fracJ:q(fr,0.9)-q(fr,0.1),palm:g.length?g.filter(r=>r[G.palm]).length/g.length:NaN};
  if(fa!==null&&P.dsp.length){ const d=P.dsp.filter(r=>r[0]>=fa&&r[0]<=fb), dp=d.filter(r=>r[1]);
    const rg=dp.map(r=>r[4]), h=dp.map(r=>r[2]), ab=dp.map(r=>r[3]);
    o.seen=d.length?dp.length/d.length:NaN; o.range=md(rg); o.rJ=q(rg,0.9)-q(rg,0.1); o.h=md(h); o.abs=md(ab);
    const half=Math.floor(dp.length/3); o.drift=dp.length>9?md(h.slice(-half))-md(h.slice(0,half)):NaN;
    o.jumps=rg.length?rg.filter(v=>Math.abs(v-o.range)>12).length/rg.length:NaN; }
  return o; }
function fit(xs,ys){ const n=xs.length; if(n<2) return null; const mx=xs.reduce((a,b)=>a+b,0)/n, my=ys.reduce((a,b)=>a+b,0)/n; let sxy=0,sxx=0,syy=0;
  for(let i=0;i<n;i++){ sxy+=(xs[i]-mx)*(ys[i]-my); sxx+=(xs[i]-mx)**2; syy+=(ys[i]-my)**2; } const k=sxy/sxx, b=my-k*mx, r2=syy?sxy*sxy/(sxx*syy):1;
  const res=xs.map((x,i)=>ys[i]-(k*x+b)); return {k,b,r2,res}; }

function phone(P){ const out=[], O=t=>out.push(t), holds=P.steps.filter(s=>s.k==='hold').map(s=>Object.assign({dir:null},s));
  holds.forEach((s,i)=>{ s.dir=i<5?'вверх':'вниз'; });   /* 5,10,15,20,25 вверх; 20,15,10,5 вниз */
  const st=holds.map(s=>Object.assign(holdStats(P,s),{dir:s.dir}));
  const sonar=st.some(x=>Number.isFinite(x.range));
  O(`${P.file}: ${P.half==='L'?'левый':P.half==='R'?'правый':'один'} телефон, зонд ${P.L.s.tones===0?'чётные':P.L.s.tones===1?'нечётные':'все'} тоны, ${P.L.meta.probe&&P.L.meta.probe.f_lo===16000?'широкий':'обычный'}${P.L.s.control==='touch'?', управление пальцем (без сонара)':''}`);
  O('  отметка | ладонь видна | доля экрана (дрожь) '+(sonar?'| эхо мм (разброс 10–90%) | высота вихря · абсолютная | уход вихря за удержание | прыжки эха >12 мм':''));
  for(const x of st) O(`  ${String(x.cm).padStart(2)} см ${x.dir.padEnd(5)} | ${f0(100*(sonar?x.seen:x.palm))}% | ${f0(100*x.frac)}% (${f0(100*x.fracJ)}) `+(sonar?`| ${f0(x.range)} (${f0(x.rJ)}) | ${f0(x.h)} · ${f0(x.abs)} | ${Number.isFinite(x.drift)?(x.drift>0?'+':'')+x.drift.toFixed(0):'—'} | ${f0(100*x.jumps)}%`:''));
  const res={st,sonar};
  if(sonar){ const ok=st.filter(x=>Number.isFinite(x.range)); const F=fit(ok.map(x=>x.cm*10),ok.map(x=>x.range)); res.fit=F;
    if(F) O(`  эхо от высоты ладони: ${F.k.toFixed(2)} мм на мм, сдвиг ${f0(F.b)} мм (эхо при ладони «на столе»), отклонение от прямой до ${f0(Math.max(...F.res.map(Math.abs)))} мм, R² ${F.r2.toFixed(3)}`);
    const hy=[5,10,15,20].map(cm=>{ const u=st.find(x=>x.cm===cm&&x.dir==='вверх'), d=st.find(x=>x.cm===cm&&x.dir==='вниз'); return u&&d?d.range-u.range:NaN; });
    O(`  вниз минус вверх (на 5/10/15/20 см): ${hy.map(f0).join(' / ')} мм`); }
  const fr=fit(st.map(x=>x.cm),st.map(x=>100*x.frac)); res.ffit=fr; if(fr) O(`  доля экрана от высоты: ${fr.k.toFixed(1)}% на см, на 15 см — ${f0(fr.k*15+fr.b)}%, отклонение от прямой до ${f0(Math.max(...fr.res.map(Math.abs)))}%`);
  /* волны */
  for(const w of P.steps.filter(s=>s.k==='wave')){ const [a,b]=win(P,w), g=P.game.filter(r=>r[1]>=a&&r[1]<=b&&r[G.palm]), f=g.map(r=>r[G.frac]);
    O(`  ${w.who==='both'?'обе вместе':w.who==='L'?'ходит левая':'ходит правая'}: своя доля 10–90% ${f0(100*q(f,0.1))}–${f0(100*q(f,0.9))}%, видна ${f0(100*g.length/Math.max(1,P.game.filter(r=>r[1]>=a&&r[1]<=b).length))}%`); }
  return {out,res}; }

function pair(A,B){ if(A.half==='R'&&B.half==='L') [A,B]=[B,A]; const out=[], O=t=>out.push(t), flags=[];
  O(`ПАРА: ${A.file} (L) + ${B.file} (R)`);
  if(A.T0!==B.T0) { O('  ! программы начались не одновременно: '+A.T0+' и '+B.T0); flags.push('start'); }
  const ha=A.steps.filter(s=>s.k==='hold'), hb=B.steps.filter(s=>s.k==='hold'); const rows=[];
  ha.forEach((s,i)=>{ const x=holdStats(A,s), y=holdStats(B,hb[i]); rows.push({cm:s.cm,dir:i<5?'вверх':'вниз',a:x,b:y}); });
  O('  отметка | доля L | доля R | R − L (% экрана)'+(Number.isFinite(rows[0].a.range)&&Number.isFinite(rows[0].b.range)?' | эхо L мм | эхо R мм':''));
  for(const r of rows) O(`  ${String(r.cm).padStart(2)} см ${r.dir.padEnd(5)} | ${f0(100*r.a.frac)}% | ${f0(100*r.b.frac)}% | ${(r.b.frac-r.a.frac>0?'+':'')+f0(100*(r.b.frac-r.a.frac))}`+(Number.isFinite(r.a.range)?` | ${f0(r.a.range)} | ${f0(r.b.range)}`:''));
  const dd=rows.map(r=>Math.abs(r.b.frac-r.a.frac)).filter(Number.isFinite); O(`  расхождение вихрей на одной высоте ладоней: медиана ${f0(100*md(dd))}% экрана, худшее ${f0(100*Math.max(...dd))}%`);
  if(md(dd)>0.06) flags.push('frac');
  /* вместе вверх-вниз: где вихрь у хозяина и как его видит напарник — и как идут два вихря друг за другом */
  const w=A.steps.find(s=>s.k==='wave'&&s.who==='both'); if(w){ const [a,b]=win(A,w); const ga=A.game.filter(r=>r[1]>=a&&r[1]<=b&&r[G.frac]!==null);
    const at=(rows,col,srv)=>{ let lo=0,hi=rows.length-1; if(hi<0||srv<rows[0][1]||srv>rows[hi][1]) return null; while(hi-lo>1){ const m=(lo+hi)>>1; if(rows[m][1]<=srv) lo=m; else hi=m; } const p=rows[lo], qq=rows[hi]; if(p[col]===null||qq[col]===null) return null; return p[col]+(qq[col]-p[col])*(srv-p[1])/Math.max(1,qq[1]-p[1]); };
    let best=null; for(let lag=-300;lag<=300;lag+=10){ const d=[]; for(const r of ga){ const v=at(B.game,G.frac,r[1]+lag); if(v!==null) d.push(Math.abs(v-r[G.frac])); } const m=d.length?d.reduce((x,y)=>x+y,0)/d.length:NaN; if(Number.isFinite(m)&&(!best||m<best.m)) best={lag,m}; }
    const d0=ga.map(r=>{ const v=at(B.game,G.frac,r[1]); return v===null?null:v-r[G.frac]; }).filter(v=>v!==null);
    O(`  обе вместе вверх-вниз: R − L медиана ${f0(100*md(d0))}%, 10–90% ${f0(100*q(d0,0.1))}…${f0(100*q(d0,0.9))}%; лучше всего совпадают со сдвигом ${best?best.lag:'—'} мс (средняя разница ${best?f0(100*best.m):'—'}%)`); }
  /* одна ходит — другая стоит: не путает ли телефон чужую ладонь */
  for(const [who,X,Y] of [['L',B,A],['R',A,B]]){ const s=X.steps.find(z=>z.k==='wave'&&z.who===who); if(!s) continue; const [a,b]=win(X,s); const g=X.game.filter(r=>r[1]>=a&&r[1]<=b&&r[G.palm]).map(r=>r[G.frac]);
    const gm=Y.game.filter(r=>r[1]>=a&&r[1]<=b&&r[G.palm]).map(r=>r[G.frac]);
    O(`  ходит ${who==='L'?'левая':'правая'}: у неё вихрь ${f0(100*q(gm,0.1))}–${f0(100*q(gm,0.9))}%, у стоящей ${X.half==='L'?'левой':'правой'} — ${f0(100*q(g,0.1))}–${f0(100*q(g,0.9))}% (должно быть узко)`);
    if(q(g,0.9)-q(g,0.1)>0.1) flags.push('cross'); }
  return {out,flags,rows}; }

function analyze(files){ const P=files.map(prep), lines=[], phones=[]; for(const p of P){ const r=phone(p); phones.push(r.res); lines.push(...r.out,''); }
  let pr=null; if(P.length>=2){ pr=pair(P[0],P[1]); lines.push(...pr.out); } return {lines,phones,pair:pr}; }
module.exports={analyze};
if(require.main===module){ const fl=process.argv.slice(2).filter(a=>!a.startsWith('--')); if(!fl.length){ console.log('node eval_ruler.js журнал_L.wav [журнал_R.wav]'); process.exit(2); } console.log(analyze(fl).lines.join('\n')); }
