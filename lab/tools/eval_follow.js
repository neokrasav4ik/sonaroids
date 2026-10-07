/* «Ладонь по линейке» (1.57e): разбор записи sonararc_follow_*.wav — насколько точно сонар повторяет ладонь. Звук снова через DSP2
   (варианты: как есть, 'half' — фаза по полукадрам, 'unwrap' — доворот), высота сонара переводится в сантиметры прямой по трём
   удержаниям (5, 10, 15 см). По каждому виду движения: дрожь в покое (см), где сонар видит концы ходов 5 и 15 (медленно / быстрее /
   быстро) и во сколько раз сжимается ход на скорости, рывки до 15 — до скольки доходит, запаздывание концов хода от стука (вместе с
   рукой человека), мелкая дрожь на ходу. Запуск: node eval_follow.js запись.wav */
const C=require('./common'), path=require('path');
const SR=48000, N=512, fps=SR/N;
const md=a=>{ if(!a.length) return NaN; const s=[...a].sort((x,y)=>x-y); return s[s.length>>1]; };
const f1=x=>Number.isFinite(x)?x.toFixed(1):'—', f2=x=>Number.isFinite(x)?x.toFixed(2):'—';
function replay(meta,x,opt){ const D=C.makeDSP(C.bandOf(meta)); D.init(SR,meta.probe&&(meta.probe.bins===0||meta.probe.bins===1)?meta.probe.bins:'all'); D.setCal(meta.cal); if(meta.autocenter) D.set('autocenter',1);
  (opt||[]).forEach(o=>D.set(o,1)); const sh=(meta.tune&&meta.tune.shifts)||[], h=new Float64Array(Math.floor(x.length/N)).fill(NaN); let j=0;
  for(let k=0;k<h.length;k++){ while(j<sh.length&&sh[j][0]<=k){ D.shift(sh[j][1]); j++; } const r=D.frame(x.subarray(k*N,(k+1)*N)); if(r&&r.present&&r.height!==null) h[k]=r.height; }
  return h; }
function steps(meta){ const ev=(meta.log||[]).filter(e=>typeof e[1]==='string'), st=[], beats=[];
  ev.forEach(e=>{ const p=e[1].split(':'); if(p[0]==='step') st.push({f:e[0],k:p[2],v:+p[3]}); if(p[0]==='beat') beats.push({f:e[0],cm:+p[1]}); if(p[0]==='done') st.push({f:e[0],k:'end'}); });
  for(let i=0;i<st.length-1;i++) st[i].f1=st[i+1].f; return {st:st.filter(s=>s.k!=='end'),beats}; }
function analyse(meta,x,opt){ const h=replay(meta,x,opt), {st,beats}=steps(meta), fr=k=>h[k-1];   // журнал: кадр k — после k кадров звука
  const holds=st.filter(s=>s.k==='hold'), H={};
  holds.forEach(s=>{ const a=s.f+Math.round(1.5*fps), b=s.f1-Math.round(0.2*fps), v=[]; for(let k=a;k<b;k++){ const y=fr(k); if(Number.isFinite(y)) v.push(y); } (H[s.v]=H[s.v]||[]).push(v); });
  const pts=[5,10,15].map(cm=>{ const vs=(H[cm]||[])[0]||[]; return [cm,md(vs)]; }).filter(p=>Number.isFinite(p[1]));
  const n=pts.length, mx=pts.reduce((s,p)=>s+p[1],0)/n, my=pts.reduce((s,p)=>s+p[0],0)/n; let sxy=0,sxx=0; pts.forEach(p=>{ sxy+=(p[1]-mx)*(p[0]-my); sxx+=(p[1]-mx)**2; });
  const k=sxy/sxx, b=my-k*mx, cm=y=>k*y+b, lin=Math.max(...pts.map(p=>Math.abs(cm(p[1])-p[0])));
  const jit={}; Object.keys(H).forEach(c=>{ const all=[].concat(...H[c]).map(cm), m=all.reduce((s,v)=>s+v,0)/all.length; jit[c]=Math.sqrt(all.reduce((s,v)=>s+(v-m)**2,0)/all.length); });
  const seen=(a,b)=>{ let s=0,t=0; for(let q=a;q<b;q++){ t++; if(Number.isFinite(fr(q))) s++; } return t?100*s/t:NaN; };
  const moves=st.filter(s=>s.k==='move').map(s=>{ const per=s.v, bs=beats.filter(e=>e.f>=s.f&&e.f<s.f1), ends=[]; let fine=[];
    bs.forEach((e,i)=>{ const tEnd=e.f+Math.round(per*fps), a=tEnd-Math.round(0.35*per*fps), z=tEnd+Math.round(0.45*per*fps); let best=null, bk=null;
      for(let q=a;q<=z;q++){ const y=fr(q); if(!Number.isFinite(y)) continue; const c=cm(y); if(best===null||(e.cm===15?c>best:c<best)){ best=c; bk=q; } }
      if(best!==null) ends.push({want:e.cm,got:best,lag:(bk-tEnd)/fps}); });
    for(let q=s.f;q<s.f1;q++){ const y=fr(q); if(!Number.isFinite(y)) continue; let sm=0,c=0; for(let w=q-4;w<=q+4;w++){ const z=fr(w); if(Number.isFinite(z)){ sm+=z; c++; } } fine.push(cm(y)-cm(sm/c)); }
    const top=ends.filter(e=>e.want===15).map(e=>e.got), bot=ends.filter(e=>e.want===5).map(e=>e.got);
    return {per,top:md(top),bot:md(bot),travel:md(top)-md(bot),lag:md(ends.map(e=>e.lag)),fine:Math.sqrt(fine.reduce((s,v)=>s+v*v,0)/Math.max(1,fine.length)),seen:seen(s.f,s.f1)}; });
  const flick=st.filter(s=>s.k==='flick').map(s=>{ const bs=beats.filter(e=>e.f>=s.f&&e.f<s.f1), pk=[], base=[];
    bs.forEach(e=>{ let best=-1e9, lo=1e9; for(let q=e.f;q<e.f+Math.round(0.9*fps);q++){ const y=fr(q); if(Number.isFinite(y)){ best=Math.max(best,cm(y)); } } for(let q=e.f-Math.round(0.4*fps);q<e.f;q++){ const y=fr(q); if(Number.isFinite(y)) lo=Math.min(lo,cm(y)); } if(best>-1e9) pk.push(best); if(lo<1e9) base.push(lo); });
    return {peak:md(pk),base:md(base),seen:seen(s.f,s.f1)}; })[0];
  return {fit:{k,b,lin,pts},jit,moves,flick}; }
function report(file){ const {meta,x}=C.loadWav(file); if(!meta||meta.game!=='follow'){ console.log(path.basename(file)+': не запись «Ладонь по линейке»'); return; }
  console.log(`\n== ${path.basename(file)} == ${meta.ua&&/iPhone/.test(meta.ua)?'iPhone':meta.ua&&/Android/.test(meta.ua)?'Android':''} | зонд: запас ${meta.probe&&meta.probe.snr_db?meta.probe.snr_db.toFixed(1):'—'} дБ, тоны ${meta.probe&&meta.probe.bins!==undefined?meta.probe.bins:'все'} | ход подстройки ${meta.tune?meta.tune.field.toFixed(0):'—'} мм`);
  const out={};
  for(const [name,opt] of [['как в игре',[]],['фаза по полукадрам',['half']],['доворот фазы',['unwrap']]]){ const R=analyse(meta,x,opt); out[name]=R;
    console.log(`  — ${name}: прямая по удержаниям ${R.fit.pts.map(p=>p[0]+' см').join(', ')}: 1 мм сонара = ${(10*R.fit.k).toFixed(2)} мм ладони (отклонение от прямой до ${f1(R.fit.lin)} см); дрожь в покое ${Object.keys(R.jit).map(c=>c+' см: '+f2(R.jit[c])).join(', ')} см`);
    R.moves.forEach(m=>console.log(`      ход ${m.per} с: концы ${f1(m.bot)} и ${f1(m.top)} см (надо 5 и 15) → ход ${f1(m.travel)} из 10 см; конец позже стука на ${(m.lag*1000).toFixed(0)} мс; мелкая дрожь на ходу ${f2(m.fine)} см; ладонь видна ${f1(m.seen)}%`));
    if(R.flick) console.log(`      рывки: вверх до ${f1(R.flick.peak)} см (надо 15) от ${f1(R.flick.base)}; ладонь видна ${f1(R.flick.seen)}%`); }
  return out; }
module.exports={analyse,report,replay,steps};
if(require.main===module) process.argv.slice(2).forEach(report);
