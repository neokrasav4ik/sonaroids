/* «Ладонь справа» (с 27.09): телефон вертикально, разъёмом к игроку; ладонь ребром справа от нижнего торца, на одной линии с ним.
   Разбор пробы-игры (sonarright_*.wav): звук прогоняется через DSP2 с той же калибровкой, что на телефоне, и сверяется
   с тем, что делал корабль (meta.ship). Считаю: видна ли ладонь в полёте, дрожь корабля (доля ширины экрана),
   какой ход ладони на весь экран (map), сколько времени корабль у краёв, удары.
   Запись по метке (sonar1r_*.wav) разбирается обычным eval_recording.js — сценарий тот же (метка — расстояние 5–15 см).
   Запуск: node eval_right.js проба.wav [...]
   Модуль отдаёт synthFrame(d,seed) — кадр синтетического микрофона с ладонью на расстоянии d мм (null — ладони нет); им пользуются стенды. */
const C=require('./common'), path=require('path');
const SR=48000, N=512;
let SYN=null;
function synthInit(){ if(SYN) return SYN; const js=C.appJs(), FLO=+js.match(/F_LO=(\d+)/)[1], df=SR/N, kLo=Math.ceil(FLO/df), kHi=Math.floor(20500/df), ks=[];
  for(let k=kLo;k<=kHi;k++) ks.push(k); const M=ks.length, pr=new Float64Array(N); let mx=0;
  for(let n=0;n<N;n++){ let s=0; for(let q=0;q<M;q++) s+=Math.cos(2*Math.PI*ks[q]*n/N+Math.PI*q*q/M); pr[n]=s; mx=Math.max(mx,Math.abs(s)); }
  for(let n=0;n<N;n++) pr[n]=pr[n]/mx*0.9*0.25;
  const spec=ks.map(k=>{ let re=0,im=0; for(let n=0;n<N;n++){ re+=pr[n]*Math.cos(2*Math.PI*k*n/N); im-=pr[n]*Math.sin(2*Math.PI*k*n/N); } return {k,re,im}; });
  const cosT=ks.map(k=>Float64Array.from({length:N},(_,n)=>Math.cos(2*Math.PI*k*n/N))), sinT=ks.map(k=>Float64Array.from({length:N},(_,n)=>Math.sin(2*Math.PI*k*n/N)));
  return SYN={spec,cosT,sinT}; }
/* прямой сигнал, отражение комнаты, ладонь — три точки (середина и края ребра), путь туда-обратно 2·d */
function synthFrame(d,seed){ const S=synthInit(), out=new Float32Array(N), c=343e3/SR, dDir=37.3;
  const paths=[{d:dDir,a:1},{d:dDir+62,a:0.35}]; if(d!==null) [[0,0.25],[8,0.1],[-6,0.08]].forEach(([o,a])=>paths.push({d:dDir+2*(d+o)/c,a:a*(100/(d+o))}));
  for(const p of paths) S.spec.forEach((s,q)=>{ const ang=-2*Math.PI*s.k*p.d/N, cc=Math.cos(ang), sn=Math.sin(ang), re=(s.re*cc-s.im*sn)*2/N*p.a, im=(s.re*sn+s.im*cc)*2/N*p.a, ct=S.cosT[q], st=S.sinT[q];
    for(let n=0;n<N;n++) out[n]+=re*ct[n]-im*st[n]; });
  let r=seed>>>0; for(let n=0;n<N;n++){ r=(r*1664525+1013904223)>>>0; out[n]+=(r/4294967296-0.5)*4e-4; } return out; }

function analyse(meta,x){ const flo=C.bandOf(meta), D=C.makeDSP(flo); D.init(SR,'all'); D.setCal(meta.cal); const rows=C.pass(D,x);
  const mk=meta.marks||{}, tP=mk.play!==undefined?mk.play/SR:null, tO=mk.over!==undefined?mk.over/SR:x.length/SR, m=meta.map;
  const fl=rows.filter(r=>tP!==null&&r.t>=tP&&r.t<tO); const vis=fl.length?100*fl.filter(r=>r.present).length/fl.length:NaN;
  const X=r=>0.06+0.88*Math.max(0,Math.min(1,(r.height-m.lo)/(m.hi-m.lo)));
  const xs=fl.filter(r=>r.present).map(X); let jit=NaN;
  if(xs.length>80){ const k=31, h=k>>1, d=[]; for(let i=h;i<xs.length-h;i++){ let s=0; for(let j=i-h;j<=i+h;j++) s+=xs[j]; d.push(xs[i]-s/k); } jit=Math.sqrt(d.reduce((u,v)=>u+v*v,0)/d.length); }
  const edge=xs.length?100*xs.filter(v=>v<=0.065||v>=0.935).length/xs.length:NaN;
  const sh=(meta.ship||[]).filter(s=>typeof s[1]==='number'), hits=(meta.ship||[]).filter(s=>s[1]==='hit').length;
  // сверка с кораблём на телефоне: по кадру — x прогона против записанного
  const byF=new Map(rows.map(r=>[Math.round(r.t*SR/N),r])); const dd=[]; sh.forEach(s=>{ const r=byF.get(s[0]); if(r&&r.present&&s[2]) dd.push(Math.abs(X(r)-s[1])); }); dd.sort((a,b)=>a-b);
  return {vis,jit,edge,hits,span:m.hi-m.lo,dur:tP!==null?tO-tP:0,match:dd.length?dd[dd.length>>1]:NaN,waveN:m.n}; }
function report(name,meta,x){ const R=analyse(meta,x);
  console.log(`\n== ${name} == | счёт ${meta.score}, ударов ${R.hits}, полёт ${R.dur.toFixed(0)} с | зонд: запас ${meta.probe&&meta.probe.snr_db?meta.probe.snr_db.toFixed(1):'—'} дБ | экран ${meta.orientation&&meta.orientation.h>meta.orientation.w?'вертикально':'ГОРИЗОНТАЛЬНО'}`);
  console.log(`  весь экран — ${R.span.toFixed(0)} мм хода ладони (по взмахам: ${R.waveN} кадров) | ладонь видна в полёте ${R.vis.toFixed(1)}% | дрожь корабля ${(R.jit*100).toFixed(2)}% ширины | у краёв ${R.edge.toFixed(1)}% | прогон против телефона: ${(R.match*100).toFixed(2)}% ширины`);
  return R; }
module.exports={synthFrame,analyse,report};
if(require.main===module){ for(const f of process.argv.slice(2)){ const {meta,x}=C.loadWav(f);
  if(!meta||meta.kind!=='right-play'){ console.log(`\n== ${path.basename(f)} == не проба «ладонь справа» (kind ${meta&&meta.kind}); запись по метке — eval_recording.js`); continue; }
  report(path.basename(f),meta,x); } }
