/* Автоуровень зонда на разных громкостях телефона: выход на цель по сигнал/шум, «прибавь громкость», выключение, когда не слышно. Нужен out/synth.bin. */
const C=require('../common'), path=require('path');
const fs_=require('fs'); const js=C.appJs();
const grab=n=>{ const i=js.indexOf('function '+n+'('); let d=0,j=js.indexOf('{',i); for(let k=j;k<js.length;k++){ if(js[k]==='{')d++; else if(js[k]==='}'){ if(!--d) return js.slice(i,k+1);} } };
const raw=fs_.readFileSync(path.join(C.OUT,'synth.bin')); const x=new Float32Array(raw.buffer,raw.byteOffset,raw.length/4);
// пустая комната из синтетики: 8 периодов зонда при уровне 0.25
const base=[]; for(let k=0;k<8;k++) base.push(x.slice((20+k)*512,(21+k)*512));
function scenario(phoneVolDb,noiseAmp){
  const env={PROBE_G:0.25,chan:'right',fs:48000,F_LO:18300,moves:[]};
  const src=`var PROBE_G=${env.PROBE_G},PROBE_SNR=null,chan='right',fs=48000,F_LO=18300,SNR_TARGET=48,G_MIN=0.015,G_MAX=0.3;
    function sleep(){ return Promise.resolve(); }
    function setProbe(){ __moves.push(PROBE_G); }
    function collect(n){ var k=PROBE_G/0.25*Math.pow(10,${phoneVolDb}/20), out=[], s=${Math.floor(Math.random()*1e6)};
      for(var i=0;i<n;i++){ var f=new Float32Array(512); for(var j=0;j<512;j++){ s=(s*1664525+1013904223)>>>0; f[j]=__base[i][j]*k+(s/4294967296-0.5)*${noiseAmp}; } out.push(f); }
      return Promise.resolve(out); }
    ${grab('probeSNR')}
    ${grab('measureSNR')}
    ${grab('autoLevel')}
    return {autoLevel:autoLevel,get g(){ return PROBE_G; }};`;
  const moves=[]; const api=new Function('__base','__moves',src)(base,moves);
  return api.autoLevel().then(L=>({L,moves,g:api.g}));
}
(async()=>{
  console.log("громкость телефона | стартовый запас | итог: запас, уровень зонда | предупреждение «тихо»");
  for(const [lab,vol] of [["очень громко (+12 дБ)",12],["громко",6],["средне",0],["тихо (−12 дБ)",-12],["очень тихо (−24 дБ)",-24],["почти беззвучно (−36 дБ)",-36],["на грани (−44 дБ)",-44]]){
    const r=await scenario(vol,6e-4);
    const start=r.moves.length? '' : '';
    console.log(`  ${lab.padEnd(26)} | итог ${r.L.snr.toFixed(1)} дБ, уровень ${r.g.toFixed(3)} (было 0.25, ${(20*Math.log10(r.g/0.25)>=0?'+':'')}${(20*Math.log10(r.g/0.25)).toFixed(0)} дБ) | ${r.L.atMax?'ДА — прибавь громкость':'нет'}${r.L.snr<30?' → «зонда почти не слышно», зонд выключен':''}`);
  }
})();
