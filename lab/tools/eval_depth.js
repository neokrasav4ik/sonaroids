/* Разбор «Ближней и дальней руки» (sonardepth_*.wav, с 27.09, 0.39s): разделит ли один микрофон две руки по расстоянию —
   ближнюю (6–10 см) и дальнюю (16–24 см). Движущееся эхо (eval_two.motion) дважды: широкий зонд 16–20,5 кГц и только его часть
   18,3–20,5 кГц (полоса игры), обе — с окном Ханна по частотам. Окна по 16 кадров (0,17 с), шаг 8. По фазам:
   - качается одна рука: доля энергии в «её» зоне (близко — 30–140 мм, далеко — 140–300 мм) и сколько просачивается в другую (дБ);
   - качаются обе: в какой доле окон видны оба пятна (в каждой зоне свой максимум не слабее −15 дБ от главного) и где они.
   Запуск: node eval_depth.js запись.wav [...] | --synth */
const C=require('./common'), T=require('./eval_two'), path=require('path');
const SR=48000, N=512, FR=SR/N, SPLIT=140;
const BANDS=[['широкий 16–20,5 кГц',null],['узкий 18,3–20,5 кГц (как в игре)',[18300,20500]]];
function zones(meta,x,band){ const A=T.motion(meta,x,undefined,band,true), R=A.R, nR=A.nR, F=A.F, mk=meta.marks||{}, keys=Object.keys(mk).sort((p,q)=>mk[p]-mk[q]), out={};
  keys.forEach((k,i)=>{ const f0=Math.round(mk[k]/N+0.8*FR), f1=Math.round((i+1<keys.length?mk[keys[i+1]]:x.length)/N-0.3*FR); if(f1-f0<20) return;
    const ws=[]; for(let f=f0;f+16<=Math.min(f1,F);f+=8){ const e=new Float64Array(nR); for(let g=f;g<f+16;g++) for(let j=0;j<nR;j++) e[j]+=A.DR[g][j]**2+A.DI[g][j]**2; ws.push(e); }
    const emax=Math.max(...ws.map(e=>Math.max(...e))), act=ws.filter(e=>Math.max(...e)>0.05*emax); if(act.length<3){ out[k]=null; return; }
    let nearE=0,farE=0,both=0; const pn=[],pf=[];
    act.forEach(e=>{ let mn=0,jn=0,mf=0,jf=0; for(let j=0;j<nR;j++){ if(R[j]<SPLIT){ nearE+=e[j]; if(e[j]>mn){ mn=e[j]; jn=j; } } else { farE+=e[j]; if(e[j]>mf){ mf=e[j]; jf=j; } } }
      const top=Math.max(mn,mf), peak=j=>j>0&&j<nR-1&&e[j]>=e[j-1]&&e[j]>=e[j+1]&&Math.abs(R[j]-SPLIT)>10;   // настоящий горб, а не склон соседнего пятна у границы зон
      if(mn>top*0.0316&&mf>top*0.0316&&peak(jn)&&peak(jf)){ both++; pn.push(R[jn]); pf.push(R[jf]); } });
    const med=a=>{ a=a.slice().sort((p,q)=>p-q); return a.length?a[a.length>>1]:NaN; };
    out[k]={n:act.length,near:100*nearE/(nearE+farE),leakDb:10*Math.log10(Math.min(nearE,farE)/Math.max(nearE,farE)),both:100*both/act.length,pn:med(pn),pf:med(pf)}; });
  return out; }
function analyse(meta,x){ return BANDS.map(([name,band])=>({name,band,z:zones(meta,x,band)})); }
const SINGLE={nearL:'near',nearR:'near',farR:'far',farL:'far'}, NAME={nearL:'качается ближняя (левая)',farR:'качается дальняя (правая)',bothLR:'обе (левая близко)',nearR:'качается ближняя (правая)',farL:'качается дальняя (левая)',bothRL:'обе (правая близко)'};
function report(name,meta,x){ const res=analyse(meta,x);
  console.log(`\n== ${name} == | широкий зонд ${meta.audible===true?'СЛЫШНО':meta.audible===false?'не слышно':'—'}`);
  res.forEach(r=>{ console.log('  '+r.name+':'); let okS=0,nS=0,okB=0,nB=0;
    Object.keys(NAME).forEach(k=>{ const z=r.z[k]; if(!z) return;
      if(SINGLE[k]){ const own=SINGLE[k]==='near'?z.near:100-z.near; nS++; if(own>80) okS++;
        console.log(`    ${NAME[k].padEnd(28)} в своей зоне ${own.toFixed(0).padStart(3)}% энергии, в чужую просачивается ${z.leakDb.toFixed(0)} дБ`); }
      else { nB++; if(z.both>60) okB++; console.log(`    ${NAME[k].padEnd(28)} оба пятна видны в ${z.both.toFixed(0).padStart(3)}% окон; где: ближнее ${isNaN(z.pn)?'—':z.pn.toFixed(0)} мм, дальнее ${isNaN(z.pf)?'—':z.pf.toFixed(0)} мм`); } });
    r.verdict={single:nS?okS/nS:0,both:nB?okB/nB:0};
    console.log(`    ВЫВОД: одна рука в своей зоне — ${okS} из ${nS}; две руки порознь — ${okB} из ${nB} → ${okS===nS&&okB===nB&&nS?'РАЗДЕЛЯЮТСЯ':'не разделяются'}`); });
  return res; }
/* синтетика по сценарию страницы: руки — отражатели на своих расстояниях, зонд широкий */
function synth(){ const S=require('./eval_right'), js=C.appJs(), i=js.indexOf('function dpS('), SC=new Function('function twoK(v){ return function(){ return v; }; }\n'+js.slice(i,js.indexOf('/* широкий зонд',i))+'\nreturn SCRIPT_DEPTH;')();
  const TOT=SC[SC.length-1].t, F=Math.floor(TOT*FR), x=new Float32Array(F*N), marks={}; let cur=-1;
  for(let f=0;f<F;f++){ const t=f/FR; let k=SC.length-1; while(SC[k].t>t) k--; if(k!==cur){ cur=k; if(SC[k].k!=='end') marks[SC[k].k]=f*N; }
    const s=SC[k], L=s.L?s.L(t):null, R=s.R?s.R(t):null; x.set(S.synthMulti([{d:L,a:0.22},{d:R,a:0.22}],f*7+3,[16000,20500]),f*N); }
  return {meta:{kind:'depth-portrait',marks,audible:false,probe:{f_lo:16000,f_hi:20500}},x}; }
module.exports={analyse,report,synth};
if(require.main===module){ const args=process.argv.slice(2);
  if(args[0]==='--synth'){ const {meta,x}=synth(); report('синтетика по сценарию',meta,x); }
  else for(const f of args){ const {meta,x}=C.loadWav(f); if(!meta||meta.kind!=='depth-portrait'){ console.log(`\n== ${path.basename(f)} == не «ближняя и дальняя рука» (kind ${meta&&meta.kind})`); continue; } report(path.basename(f),meta,x); } }
