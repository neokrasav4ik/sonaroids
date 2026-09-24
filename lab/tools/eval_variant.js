/* Варианты обработки на «Записях для меня» (там есть метка — истина). Обёртка над eval_recording.js:
   подменяет движок на изменённую копию DSP2 и запускает ту же оценку.
   Запуск: node eval_variant.js [--set tint=-30 ...] [--patch файл.js] запись1.wav [запись2.wav ...]
   --patch — модуль: module.exports=function(src){ return изменённый_src; } (правка исходника DSP2 из собранного приложения). */
const C=require('./common'), path=require('path');
const a=process.argv.slice(2), files=[], sets=[]; let patch=null;
for(let i=0;i<a.length;i++){ if(a[i]==='--set') sets.push(a[++i].split('=')); else if(a[i]==='--patch') patch=require(path.resolve(a[++i])); else files.push(a[i]); }
const orig=C.makeDSP;
C.makeDSP=function(flo){
  let s=C.dspSrc(); if(flo) s=s.replace('Math.ceil(18300/df)','Math.ceil('+flo+'/df)'); if(patch) s=patch(s);
  const D=new Function(s+'\nreturn DSP2;')(), init=D.init;
  D.init=function(){ const r=init.apply(D,arguments); sets.forEach(([k,v])=>D.set(k,+v)); return r; };   // set после каждого init
  return D; };
console.log('вариант:',(sets.map(s=>s.join('=')).join(' ')||'')+(patch?' patch':'')||'как в приложении');
process.argv=[process.argv[0],path.join(__dirname,'eval_recording.js'),...files];
require('./eval_recording');
