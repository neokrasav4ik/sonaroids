/* Центровка и физическая калибровка на синтетике с текущим зондом (ладонь 100 мм на 3–5 с, синусоида 100±50 мм на 5–11, держит 100 мм на 11–14):
   сама ли встаёт середина после появления руки, не прыгает ли корабль при повторной центровке, какой размах даёт физика. */
const C=require('../common'), fs=require('fs'), path=require('path');
const raw=fs.readFileSync(path.join(C.OUT,'synth.bin')); const x=new Float32Array(raw.buffer,raw.byteOffset,raw.length/4);
const D=C.makeDSP(), cal=C.physCal(); D.init(48000,'all'); D.setCal(cal); D.set('autocenter',1);
const o=[]; let rc=null;
for(let k=0;k<Math.floor(x.length/512);k++){ const t=(k+1)*512/48000; if(rc===null&&t>=12.5) rc=D.recenter(); const r=D.frame(x.subarray(k*512,(k+1)*512)); if(r) o.push(Object.assign({t},r)); }
const med=a=>a.slice().sort((p,q)=>p-q)[a.length>>1], H=(a,b)=>o.filter(r=>r.t>=a&&r.t<b&&r.present).map(r=>r.height);
const before=med(H(4.2,5)), hold1=med(H(12,12.5)), hold2=med(H(12.6,13.5));
const mv=H(6.2,6.8), dn=H(9.2,9.8), swing=(med(mv)-med(dn))/100;
const ok=Math.abs(before-100)<4&&Math.abs(hold2-100)<4&&Math.abs(swing-cal.s)<0.12;
console.log(`физика k=${cal.k} s=${cal.s} | после появления руки середина ${before.toFixed(1)} (ждём 100) | удержание до центровки ${hold1.toFixed(1)}, после ${hold2.toFixed(1)} (сдвиг ${rc&&rc.shift}) | размах ${(swing*100).toFixed(0)}% хода (ждём ${(cal.s*100).toFixed(0)}% — в синтетике дальность равна высоте)`);
console.log(ok?'ИТОГ: ok':'ИТОГ: ПРОВАЛ'); process.exitCode=ok?0:1;
