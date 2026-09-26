/* Разбор записи прототипа Арканоида (sonarark_*.wav, с 27.09): звук снова через DSP2 с той же калибровкой, ракетка — по той же карте
   хода, сверка с тем, что было на телефоне (meta.log). Считаю: видна ли ладонь в игре, дрожь ракетки (доля ширины), сколько времени
   ракетка у краёв, отбито мячей, промахи — и насколько далеко была ракетка при промахе (близко — не хватило точности или скорости;
   далеко — потерял мяч).
   Запуск: node eval_ark.js запись.wav [...] */
const C=require('./common'), path=require('path');
const SR=48000, N=512;
function analyse(meta,x){ const D=C.makeDSP(C.bandOf(meta)); D.init(SR,'all'); D.setCal(meta.cal); const rows=C.pass(D,x);
  const mk=meta.marks||{}, tP=mk.play!==undefined?mk.play/SR:null, tO=mk.over!==undefined?mk.over/SR:x.length/SR, m=meta.map;
  const X=r=>{ let f=Math.max(0,Math.min(1,(r.height-m.lo)/(m.hi-m.lo))); if(meta.port==='left') f=1-f; return 0.09+0.82*f; };
  const fl=rows.filter(r=>tP!==null&&r.t>=tP&&r.t<tO), vis=fl.length?100*fl.filter(r=>r.present).length/fl.length:NaN, xs=fl.filter(r=>r.present).map(X);
  let jit=NaN; if(xs.length>80){ const k=31,h=15,d=[]; for(let i=h;i<xs.length-h;i++){ let s=0; for(let j=i-h;j<=i+h;j++) s+=xs[j]; d.push(xs[i]-s/k); } jit=Math.sqrt(d.reduce((u,v)=>u+v*v,0)/d.length); }
  const edge=xs.length?100*xs.filter(v=>v<=0.0905||v>=0.9095).length/xs.length:NaN;
  const log=meta.log||[], ev=log.filter(e=>typeof e[1]==='string'), st=log.filter(e=>typeof e[1]==='number');
  const miss=ev.filter(e=>e[1].startsWith('miss:')).map(e=>Math.abs(+e[1].slice(5)));
  // сверка с телефоном: ракетка по кадрам экрана; с плавностью (с 27.09) — тот же фильтр, шаг экрана ~1/60 с (сверка приблизительная)
  const sm=meta.smooth||{tau:0,db:0}, byF=new Map(rows.map(r=>[Math.round(r.t*SR/N),r])), dd=[]; let pf=null, px=null;
  st.forEach(s=>{ const r=byF.get(s[0]); if(!(r&&r.present&&s[4])) return; const tg=X(r), aa=sm.tau>0?1-Math.exp(-(1/60)/sm.tau):1; pf=pf===null?tg:pf+aa*(tg-pf); if(px===null) px=s[1];
    if(pf-px>sm.db) px=pf-sm.db; else if(px-pf>sm.db) px=pf+sm.db; dd.push(Math.abs(px-s[1])); }); dd.sort((a,b)=>a-b);
  // дрожь ракетки на экране — по журналу (что видел игрок), кадры экрана ~60 в секунду, отклонение от среднего за 0,5 с
  const sx=st.filter(s=>s[4]).map(s=>s[1]); let jitS=NaN; if(sx.length>80){ const k=31,h=15,d=[]; for(let i=h;i<sx.length-h;i++){ let a=0; for(let j=i-h;j<=i+h;j++) a+=sx[j]; d.push(sx[i]-a/k); } jitS=Math.sqrt(d.reduce((u,v)=>u+v*v,0)/d.length); }
  return {sm,jitS,vis,jit,edge,dur:tP!==null?tO-tP:0,paddle:ev.filter(e=>e[1]==='paddle').length,bricks:ev.filter(e=>e[1]==='brick').length,miss,match:dd.length?dd[dd.length>>1]:NaN,span:m.hi-m.lo,waveN:m.n}; }
function report(name,meta,x){ const R=analyse(meta,x), near=R.miss.filter(v=>v<0.14).length;
  console.log(`\n== ${name} == | счёт ${meta.score}, уровень ${meta.level}, игра ${R.dur.toFixed(0)} с | разъём ${meta.port==='left'?'слева':'справа'} | зонд: запас ${meta.probe&&meta.probe.snr_db?meta.probe.snr_db.toFixed(1):'—'} дБ`);
  console.log(`  вся ширина — ${R.span.toFixed(0)} мм хода ладони (взмахов ${R.waveN} кадров) | ладонь видна ${R.vis.toFixed(1)}% | дрожь по сонару ${(R.jit*100).toFixed(2)}% ширины, на экране ${(R.jitS*100).toFixed(2)}% (плавность: ${R.sm.n||'нет'}) | у краёв ${R.edge.toFixed(1)}% | прогон против телефона ${(R.match*100).toFixed(2)}%${R.sm.tau>0||R.sm.db>0?' (приблизительно)':''}`);
  console.log(`  отбито ${R.paddle}, кирпичей ${R.bricks}, промахов ${R.miss.length}: ракетка была от мяча ${R.miss.map(v=>(v*100).toFixed(0)+'%').join(', ')||'—'} ширины (близко, < 14%: ${near})`);
  return R; }
module.exports={analyse,report};
if(require.main===module){ for(const f of process.argv.slice(2)){ const {meta,x}=C.loadWav(f); if(!meta||meta.kind!=='ark-play'){ console.log(`\n== ${path.basename(f)} == не запись Арканоида (kind ${meta&&meta.kind})`); continue; } report(path.basename(f),meta,x); } }
