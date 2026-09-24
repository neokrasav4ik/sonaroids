/* Общие помощники для инструментов: всё берётся ИЗ СОБРАННОГО ПРИЛОЖЕНИЯ app/sonar_lab3.html,
   поэтому проверки всегда идут тем же кодом, что работает на телефоне. */
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
const OUT=path.join(__dirname,'out');
function appHtml(){ return fs.readFileSync(path.join(ROOT,'app','sonar_lab3.html'),'utf8'); }
function appJs(){ return appHtml().match(/<script>([\s\S]*?)<\/script>/)[1]; }
function grab(js,name){ const i=js.indexOf('function '+name+'('); if(i<0) throw new Error('нет функции '+name);
  let d=0,j=js.indexOf('{',i); for(let k=j;k<js.length;k++){ if(js[k]==='{')d++; else if(js[k]==='}'){ if(!--d) return js.slice(i,k+1);} } }
function dspSrc(){ const js=appJs(); return js.slice(js.indexOf('var DSP2=(function(){'),js.indexOf('var Game=(function(){')); }
function gameSrc(){ const js=appJs(); return js.slice(js.indexOf('var Game=(function(){'),js.indexOf('(function(){\n"use strict";')); }
/* движок обработки; flo — нижний край полосы: 18300 для нового зонда, 17750 для записей до 24.09 утра */
function makeDSP(flo){ let s=dspSrc(); if(flo) s=s.replace('Math.ceil(18300/df)','Math.ceil('+flo+'/df)'); return new Function(s+'\nreturn DSP2;')(); }
function makeGame(){ return new Function(gameSrc()+'\nreturn Game;')(); }
/* калибровка по удержаниям и покачиванию — из приложения она убрана 24.09 (там теперь физика и центровка),
   а инструменты разбора ею по-прежнему оценивают записи по метке: самокалибровка по пикам синусоиды */
function calComputeLocal(lo,hi,sw){
  function med(a){ var b=a.slice().sort(function(x,y){return x-y;}); return b.length?b[b.length>>1]:NaN; }
  var rLo=med(lo.map(function(q){return q.range;})), rHi=med(hi.map(function(q){return q.range;}));
  var fLo=med(lo.map(function(q){return q.fast;})), fHi=med(hi.map(function(q){return q.fast;}));
  var k=100/(rHi-rLo), o=50-k*rLo;
  var p=sw.filter(function(q){return q.present;}), n=p.length, i, mx=0, my=0;
  for(i=0;i<n;i++){ mx+=p[i].fast; my+=p[i].range; } mx/=n||1; my/=n||1;
  var sxy=0,sxx=0,syy=0; for(i=0;i<n;i++){ var dx=p[i].fast-mx, dy=p[i].range-my; sxy+=dx*dy; sxx+=dx*dx; syy+=dy*dy; }
  var a=sxy/(sxx||1e-9), r=sxy/Math.sqrt((sxx*syy)||1e-30);
  var s1=k*a, s2=100/(fHi-fLo), s, how;
  if(r>0.6&&s1>0.2&&s1<4){ s=s1; how='покачивание'; } else if(s2>0.2&&s2<4){ s=s2; how='удержания'; } else { s=k; how='запасной'; }
  return {k:k,o:o,s:s,r:r,rLo:rLo,rHi:rHi,span:rHi-rLo,how:how,ok:(rHi-rLo)>=25};
}
function calCompute(){ const js=appJs(); return js.indexOf('function calCompute(')>=0?new Function(grab(js,'calCompute')+'\nreturn calCompute;')():calComputeLocal; }
/* калибровка приложения по умолчанию (физика): k, s и o */
function physCal(){ const m=appJs().match(/PHYS_CAL=\{k:([\d.]+),o:([^,]+),s:([\d.]+)\}/); return m?{k:+m[1],o:eval(m[2]),s:+m[3]}:null; }
function probeSNR(){ return new Function(grab(appJs(),'probeSNR')+'\nreturn probeSNR;')(); }
/* чтение WAV из приложения: запись по метке (float32) и журнал партии (PCM16 + кусок glog) */
function loadWav(file){
  const raw=fs.readFileSync(file); let p=12, meta=null, glog=null, x=null, fmt=null;
  while(p<raw.length){ const id=raw.toString('ascii',p,p+4), sz=raw.readUInt32LE(p+4), b=p+8;
    if(id==='fmt ') fmt={format:raw.readUInt16LE(b),bits:raw.readUInt16LE(b+14)};
    else if(id==='LIST'&&raw.toString('ascii',b,b+4)==='INFO'){ let q=b+4; while(q<b+sz){ const sid=raw.toString('ascii',q,q+4), ssz=raw.readUInt32LE(q+4);
        if(sid==='ICMT') meta=JSON.parse(raw.toString('utf8',q+8,q+8+ssz).trim()); q+=8+ssz+(ssz&1); } }
    else if(id==='glog') glog=JSON.parse(raw.toString('utf8',b,b+sz).trim());
    else if(id==='data'){ if(fmt.format===3) x=new Float32Array(raw.buffer.slice(raw.byteOffset+b,raw.byteOffset+b+sz));
      else { const i16=new Int16Array(raw.buffer.slice(raw.byteOffset+b,raw.byteOffset+b+sz)), fsc=(meta&&meta.pcm&&meta.pcm.full_scale)||1; x=Float32Array.from(i16,v=>v/32767*fsc); } }
    p+=8+sz+(sz&1); }
  return {meta,glog,x};
}
/* нижний край полосы по метаданным записи */
function bandOf(meta){ return (meta&&meta.probe&&meta.probe.f_lo)||17750; }
function pass(DSP2,x){ const o=[]; for(let k=0;k<Math.floor(x.length/512);k++){ const r=DSP2.frame(x.subarray(k*512,(k+1)*512)); if(r) o.push(Object.assign({t:(k+1)*512/48000},r)); } return o; }
module.exports={ROOT,OUT,appHtml,appJs,grab,dspSrc,gameSrc,makeDSP,makeGame,calCompute,physCal,probeSNR,loadWav,bandOf,pass};
