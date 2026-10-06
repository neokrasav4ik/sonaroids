/* СонарЛинк (1.56q): способы мерить дальность ладони/кулака по профилю эха — против линейки (записи «Линейки»). Прогон звука обработкой лабы с
   выводом профиля эха по дальности; оценки: центр (как в обработке), самый громкий пик, ближнее сильное эхо (lead — первый горб ≥45% самого
   сильного, по профилю за 5 кадров; с 1.56q он и в обработке, выход lead), центр у пика, слежение. Итог по каждой: наклон «см → мм», R²,
   ошибка после своей прямой, «вниз минус вверх», дрожь. Записи 06.10: ладонь — все до 4–10 см; кулак + lead — до 1,6–2,4 см, вниз=вверх.
   Запуск: node ruler_est.js запись.wav [запись2.wav …] */
/* исследование: способы мерить дальность ладони по профилю эха, против линейки */
const E=require('./eval_string.js'), fs=require('fs');
const SRC=fs.readFileSync(require('path').join(__dirname,'..','src','02_dsp.js'),'utf8');
function run(file,nofreeze){ let src=SRC.replace("swr+=p0; sw+=p; sx+=p*(gA+i); if(ldP) ldP[i]=p; }","swr+=p0; sw+=p; sx+=p*(gA+i); if(ldP) ldP[i]=p; DBG.p[i]=p; } DBG.gA=gA; DBG.mm=mm;");
  if(src===SRC) throw new Error('обработка изменилась — не нашёл, куда подключиться');
  if(nofreeze) src=src.replace('frozen=pf>=30&&pa<0.35*pf;','frozen=false;');
  const L=E.load(file), x=L.x, f0=L.meta.first_frame, sc=L.g.script.slice(-1)[0];
  const DBG={p:[]}; const D=new Function('DBG',src+'\nreturn DSP2;')(DBG); D.set('flo',L.meta.probe.f_lo!==18300?L.meta.probe.f_lo:null); D.init(L.meta.fs,L.meta.probe.bins); D.set('autocenter',1);
  const evF=k=>{ const e=L.audioEv.find(a=>String(a[1]).startsWith(k)); return e?e[0]:null; }; const fStart=evF('уровень'), fHold=evF('пустая комната запомнена');
  const game=L.g.game.filter(r=>r[3]===6&&r[2]>=0); const frameAt=srv=>{ let b=game[0]; for(const r of game){ if(r[1]<=srv) b=r; else break; } return b[2]; };
  const steps=sc.steps.map((s,i)=>({...s,fa:frameAt(s.t0),fb:frameAt(s.t1)})); const fr0=steps[0].fa, fr1=steps[steps.length-1].fb;
  const frames=[];
  for(let k=0;k<Math.floor(x.length/512);k++){ const fr=f0+k; if(fStart!==null&&fr<=fStart) continue; if(fHold!==null&&fr===fHold) D.set('holdfloor',1);
    const r=D.frame(x.subarray(k*512,(k+1)*512)); if(!r||fr<fr0-200||fr>fr1) continue; frames.push({fr,present:r.present,range:r.range,h:r.height,fast:r.fast,p:Float32Array.from(DBG.p)}); }
  return {L,steps,frames,gA:DBG.gA,mm:DBG.mm,half:L.s.half}; }
const mx=a=>{ let m=-1,i0=0; for(let i=0;i<a.length;i++) if(a[i]>m){ m=a[i]; i0=i; } return [m,i0]; };
const para=(a,i)=>{ if(i<=0||i>=a.length-1) return i; const y0=a[i-1],y1=a[i],y2=a[i+1], d=y0-2*y1+y2; return d<0?i+0.5*(y0-y2)/d:i; };
function smooth(frames,n){ /* усреднение профиля по n кадрам */ const out=[]; let acc=null, q=[];
  for(const f of frames){ q.push(f.p); if(!acc) acc=new Float64Array(f.p.length); for(let i=0;i<acc.length;i++) acc[i]+=f.p[i]; if(q.length>n){ const o=q.shift(); for(let i=0;i<acc.length;i++) acc[i]-=o[i]; }
    out.push(Float64Array.from(acc,v=>v/q.length)); } return out; }
const EST={
  centroid:(R)=>R.frames.map(f=>f.range),
  peak:(R,S)=>S.map(p=>(R.gA+para(p,mx(p)[1]))*R.mm),
  lead:(R,S)=>S.map(p=>{ const [m]=mx(p); for(let i=1;i<p.length-1;i++) if(p[i]>=0.45*m&&p[i]>=p[i-1]&&p[i]>=p[i+1]) return (R.gA+para(p,i))*R.mm; return (R.gA+mx(p)[1])*R.mm; }),
  localc:(R,S)=>S.map(p=>{ const [,i0]=mx(p), w=Math.round(20/R.mm); let s=0,sx=0; for(let i=Math.max(0,i0-w);i<=Math.min(p.length-1,i0+w);i++){ s+=p[i]; sx+=p[i]*i; } return (R.gA+sx/s)*R.mm; }),
  track:(R,S)=>{ let prev=null; return S.map(p=>{ const [m,i0]=mx(p); const pk=[]; for(let i=1;i<p.length-1;i++) if(p[i]>=0.3*m&&p[i]>=p[i-1]&&p[i]>=p[i+1]) pk.push(i);
      if(prev===null) prev=i0; let best=pk[0]??i0, bd=1e9; for(const i of pk){ const d=Math.abs(i-prev)-2*p[i]/m; if(d<bd){ bd=d; best=i; } } prev=prev+(best-prev)*0.5; return (R.gA+para(p,best))*R.mm; }); },
};
function score(R,vals){ const holds=R.steps.filter(s=>s.k==='hold'); const res=holds.map((s,j)=>{ const a=s.fa+Math.round((s.fb-s.fa)*0.375), b=s.fb-3; const v=[]; R.frames.forEach((f,i)=>{ if(f.fr>=a&&f.fr<=b&&f.present) v.push(vals[i]); }); v.sort((x,y)=>x-y);
    return {cm:s.cm,dir:j<5?'u':'d',m:v[v.length>>1],iqr:v[Math.floor(v.length*0.9)]-v[Math.floor(v.length*0.1)]}; });
  const xs=res.map(r=>r.cm*10), ys=res.map(r=>r.m), n=xs.length, mxx=xs.reduce((a,b)=>a+b)/n, my=ys.reduce((a,b)=>a+b)/n; let sxy=0,sxx=0,syy=0; for(let i=0;i<n;i++){ sxy+=(xs[i]-mxx)*(ys[i]-my); sxx+=(xs[i]-mxx)**2; syy+=(ys[i]-my)**2; }
  const k=sxy/sxx, b=my-k*mxx, err=res.map(r=>(r.m-b)/k/10-r.cm);   /* ошибка в см после своей прямой */
  const hy=[5,10,15,20].map(c=>{ const u=res.find(r=>r.cm===c&&r.dir==='u'), d=res.find(r=>r.cm===c&&r.dir==='d'); return (d.m-u.m)/k/10; });
  return {k,r2:sxy*sxy/sxx/syy,maxErr:Math.max(...err.map(Math.abs)),rms:Math.sqrt(err.reduce((a,e)=>a+e*e,0)/n),hy:hy.map(v=>v.toFixed(1)).join('/'),jit:res.map(r=>r.iqr).sort((a,b)=>a-b)[4]/k/10,ms:res.map(r=>r.m.toFixed(0)).join(' ')}; }
module.exports={run,EST,smooth,score};
if(require.main===module){ for(const f of process.argv.slice(2)){ const R=run(f,false), S=smooth(R.frames,5); console.log('==',require('path').basename(f),R.half);
  for(const [name,fn] of Object.entries(EST)){ const sc=score(R,fn(R,S)); console.log('  '+name.padEnd(9)+' наклон '+sc.k.toFixed(2)+' R² '+sc.r2.toFixed(3)+' ошибка до '+sc.maxErr.toFixed(1)+' см (скв '+sc.rms.toFixed(1)+') вниз−вверх '+sc.hy+' см, дрожь '+sc.jit.toFixed(1)+' | '+sc.ms); } } }
