/* 0.62: «Стерео вживую» и «запись с проводкой» — один счёт (StereoEcho, src/091_stereo_live.js, через tools/eval_sweep.js).
   Синтетика: микрофон A у разъёма, B в 7 см вбок (как в eval_stereo --synth); ладонь качается слева, над серединой, справа, потом
   ведётся слева направо и обратно (период 5 с) на трёх высотах. Нужно: слева и справа разница путей B − A различается, при проводке
   разница пути ходит вместе с ладонью (|корреляция| > 0,6), в пустой комнате живых окон нет. Плюс лаба: экран, сценарий, кнопки. */
const S=require('../eval_right'), W=require('../eval_sweep'), C=require('../common');
const js=C.appJs(), i=js.indexOf('var SCRIPT_SW='), SC=new Function(js.slice(i,js.indexOf('var SW_PERIOD',i))+'\nreturn SCRIPT_SW;')(), P=5;
const SR=48000, N=512, FR=SR/N, TOT=SC[SC.length-1].t, F=Math.floor(TOT*FR), x=new Float32Array(2*F*N), marks={}; let cur=-1;
for(let f=0;f<F;f++){ const t=f/FR; let k=SC.length-1; while(SC[k].t>t) k--; if(k!==cur){ cur=k; if(SC[k].k!=='end') marks[SC[k].k]=f*N; }
  const s=SC[k], H={S1:100,S2:60,S3:150}[s.k]||100; let p=null;
  if(s.k==='Lw') p=[-90,0]; else if(s.k==='Cw') p=[0,-60]; else if(s.k==='Rw') p=[90,0]; else if(s.sweep) p=[-90*Math.cos(2*Math.PI*(t-s.t)/P),0];
  let la=[],lb=[]; if(p){ const h=H+(s.sweep?20:25)*Math.sin(2*Math.PI*t/1.5), dA=Math.hypot(p[0],p[1],h), dB=Math.hypot(p[0]-70,p[1]+20,h); la=[{d:dA,a:0.25}]; lb=[{d:(dA+dB)/2,a:0.25*dA/dB}]; }
  const fa=S.synthMulti(la,f*7+3), fb=S.synthMulti(lb,f*11+5); for(let n=0;n<N;n++){ x[2*(f*N+n)]=fa[n]; x[2*(f*N+n)+1]=fb[n]; } }
const meta={kind:'stereo-sweep',channels:2,marks,sweep_period:P,probe:{f_lo:+js.match(/F_LO=(\d+)/)[1]}};
const r=W.analyse(meta,x), g=k=>r.find(q=>q.k===k)||{};
const okLR=Math.abs(g('Lw').d-g('Rw').d)>15, sw=['S1','S2','S3'].map(k=>g(k)), okSw=sw.every(q=>Math.abs(q.cd||0)>0.6), okE=(g('empty').act||0)===0;
console.log((okLR?'ok  ':'FAIL')+`  слева / справа: путь B − A ${g('Lw').d.toFixed(0)} / ${g('Rw').d.toFixed(0)} мм`);
console.log((okSw?'ok  ':'FAIL')+'  проводка: корреляция пути с ладонью '+sw.map(q=>q.k+' '+(q.cd||0).toFixed(2)+' ('+q.act+'/'+q.n+' живых, размах '+(q.span||0).toFixed(0)+' мм)').join(', '));
console.log((okE?'ok  ':'FAIL')+`  пустая комната: живых окон ${g('empty').act||0}`);
const html=require('fs').readFileSync(require('path').join(__dirname,'..','..','app','sonar_lab3.html'),'utf8'), page=/id="stLive"/.test(html)&&/id="stSweepGo"/.test(html)&&/function runStereoLive/.test(js)&&/stereo-sweep/.test(js);
console.log((page?'ok  ':'FAIL')+'  в лабе: экран «Стерео вживую», кнопка записи с проводкой, запись kind stereo-sweep');
console.log('ИТОГ: '+(okLR&&okSw&&okE&&page?'ok':'FAIL')); process.exitCode=okLR&&okSw&&okE&&page?0:1;
