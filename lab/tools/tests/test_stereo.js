/* Проба стереомикрофона (27.09, 0.39q): разбор eval_stereo.js на синтетике — (1) второй микрофон в 7 см вбок: слева и справа
   различимы по пути и силе; (2) браузер отдал один микрофон двумя одинаковыми каналами — разбор это видит и дальше не идёт;
   (3) в собранной лабе есть процессор cap2 (оба канала) и сценарий SCRIPT_ST. Поток браузера здесь не подделываю — только разбор. */
const C=require('../common'), E=require('../eval_stereo');
let bad=0; const need=(ok,msg)=>{ console.log((ok?'ok  ':'FAIL')+'  '+msg); if(!ok) bad++; };
const js=C.appJs(); need(/registerProcessor\('cap2',Cap2\)/.test(js)&&/var SCRIPT_ST=/.test(js)&&/channelCount:\{ideal:2\}/.test(js),'в лабе: процессор двух каналов, сценарий, запрос стерео');
const {meta,x}=E.synth(); const r=E.analyse(meta,x); const g=k=>r.phases.find(p=>p.k===k);
need(!r.same&&r.lr.path&&r.lr.level&&g('L').d.med>10&&g('R').d.med<-10,`второй микрофон вбок: слева путь B − A ${g('L').d.med.toFixed(0)} мм, справа ${g('R').d.med.toFixed(0)} мм — различимы`);
const y=new Float32Array(x.length); for(let i=0;i<x.length;i+=2){ y[i]=x[i]; y[i+1]=x[i]; }
const r2=E.analyse(meta,y); need(r2.same&&r2.phases.length===0,'один микрофон двумя одинаковыми каналами — «одинаковые», второй оси нет');
console.log(bad?'ИТОГ: ПРОВАЛ':'ИТОГ: ok'); process.exitCode=bad?1:0;
