/* СонарЛинк, «Линейка» (1.56p): прогон звука записи с линейкой обработкой лабы (src/02_dsp.js) — на каждой отметке профиль эха по дальности
   (полоса: чем темнее, тем сильнее эхо там, относительно пустой комнаты), пик и центр (по нему обработка считает дальность); итог — наклон
   «см → мм» центра, R², «вниз минус вверх». Ключ nofreeze — без обучения фона при неподвижной ладони (правило 0.44). Запуск: node ruler_profiles.js запись.wav [nofreeze] */
const E=require('./eval_string.js'), fs=require('fs');
let src=fs.readFileSync(require('path').join(__dirname,'..','src','02_dsp.js'),'utf8');
const o="swr+=p0; sw+=p; sx+=p*(gA+i); }";
if(!src.includes(o)) throw 'no hook'; src=src.replace(o,"swr+=p0; sw+=p; sx+=p*(gA+i); DBG.p[i]=p; } DBG.gA=gA; DBG.mm=mm; DBG.G=G;");
if(process.argv[3]==='nofreeze'){ const fz='frozen=pf>=30&&pa<0.35*pf;'; if(!src.includes(fz)) throw 'no fz'; src=src.replace(fz,'frozen=false;'); }
let frz=0; src=src.replace('if(frozen){ fzHold=Math.round(10*fpsF); frozenN++; }','if(frozen){ fzHold=Math.round(10*fpsF); frozenN++; DBG.fz=(DBG.fz||[]).concat([DBG.fr]); }');
const f=process.argv[2]; const L=E.load(f), x=L.x, f0=L.meta.first_frame; const sc=L.g.script.slice(-1)[0];
const DBG={p:[]}; const D=new Function('DBG',src+'\nreturn DSP2;')(DBG); D.set('flo',L.meta.probe.f_lo!==18300?L.meta.probe.f_lo:null); D.init(L.meta.fs,L.meta.probe.bins); D.set('autocenter',1);
const evF=k=>{ const e=L.audioEv.find(a=>String(a[1]).startsWith(k)); return e?e[0]:null; };
const fStart=evF('уровень'), fHold=evF('пустая комната запомнена');
const game=L.g.game.filter(r=>r[3]===6&&r[2]>=0); const frameAt=srv=>{ let best=game[0]; for(const r of game){ if(r[1]<=srv) best=r; else break; } return best[2]; };
const holds=sc.steps.filter(s=>s.k==='hold').map((s,i)=>({cm:s.cm,dir:i<5?'↑':'↓',a:frameAt(s.t0+1500),b:frameAt(s.t1-150),acc:null,n:0,rng:[]}));
for(let k=0;k<Math.floor(x.length/512);k++){ const fr=f0+k; if(fStart!==null&&fr<=fStart) continue; if(fHold!==null&&fr===fHold) D.set('holdfloor',1);
  DBG.fr=fr; const r=D.frame(x.subarray(k*512,(k+1)*512)); if(!r) continue;
  for(const h of holds) if(fr>=h.a&&fr<=h.b&&DBG.p.length){ if(!h.acc) h.acc=new Float64Array(DBG.p.length); for(let i=0;i<DBG.p.length;i++) h.acc[i]+=DBG.p[i]; h.n++; h.rng.push(r.range); } }
const hs=holds.filter(h=>h.rng.length).map(h=>{ const rs=h.rng.slice().sort((a,b)=>a-b); return [h.cm,rs[rs.length>>1],h.dir]; }); const xs=hs.map(h=>h[0]*10), ys=hs.map(h=>h[1]); const n=xs.length,mx=xs.reduce((a,b)=>a+b)/n,my=ys.reduce((a,b)=>a+b)/n; let sxy=0,sxx=0,syy=0; for(let i=0;i<n;i++){ sxy+=(xs[i]-mx)*(ys[i]-my); sxx+=(xs[i]-mx)**2; syy+=(ys[i]-my)**2; }
console.log('ИТОГ центр: наклон',(sxy/sxx).toFixed(2),'R²',(sxy*sxy/sxx/syy).toFixed(3),'вниз−вверх',[5,10,15,20].map(c=>{ const u=hs.find(h=>h[0]===c&&h[2]==='↑'), d=hs.find(h=>h[0]===c&&h[2]==='↓'); return (d[1]-u[1]).toFixed(0); }).join('/'),'фон учился при руке (кадры):',(DBG.fz||[]).length?(DBG.fz.slice(0,6).join(',')+'… всего '+DBG.fz.length):'нет');
console.log(L.s.half,'mm/tap',DBG.mm.toFixed(2),'gA',DBG.gA,'G',DBG.G);
for(const h of holds){ if(!h.acc) continue; const p=Array.from(h.acc,v=>v/h.n), mx=Math.max(...p);
  // bar: 1 char per 2 taps, scaled
  let s=''; for(let i=0;i<p.length;i+=2){ const v=Math.max(p[i]||0,p[i+1]||0)/mx; s+=v>0.8?'█':v>0.5?'▓':v>0.25?'▒':v>0.1?'░':'·'; }
  const pk=p.indexOf(mx); const rs=h.rng.sort((a,b)=>a-b);
  console.log(String(h.cm).padStart(2)+h.dir+' |'+s+'| пик '+((DBG.gA+pk)*DBG.mm).toFixed(0)+' мм, центр '+rs[rs.length>>1].toFixed(0)); }
