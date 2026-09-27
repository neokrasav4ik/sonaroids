/* 0.46: "is the probe heard" before a recording (promSub) with the wide probe. The Mi 9 Lite refused to record on the wide probe even
   at 100% volume ("7–11 dB, need 15"): the check decoded the game's band with the game probe's phases, while the wide probe's tones
   there have other phases. Now the check decodes the band that plays. Synthetic microphone: the wide probe, the direct sound and a wall.
   Run (from lab/tools): node tests/test_wide_prom.js */
const fs=require('fs'), path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','..','src','04_audio_engine.js'),'utf8');
const body=src.slice(src.indexOf('function promSub'),src.indexOf('\n}\n',src.indexOf('function promSub'))+2);
const make=require(path.join(__dirname,'..','..','..','tests','sim_source.js'));
function prom(wide,playFlo){ const g={N:512,fs:48000,F_LO:18300,DEPTH_LO:16000,DEPTH_HI:20500,probeWide:wide};
  const df=48000/512; g.kLo=Math.ceil(18300/df); g.kHi=Math.floor(20500/df); g.kc=Math.floor((g.kLo+g.kHi)/2);
  const f=new Function('N','fs','F_LO','DEPTH_LO','DEPTH_HI','kLo','kHi','kc','probeWide','function bandLo(){ return probeWide?DEPTH_LO:F_LO; }\n'+body+'\nreturn promSub;')(g.N,g.fs,g.F_LO,g.DEPTH_LO,g.DEPTH_HI,g.kLo,g.kHi,g.kc,wide);
  const s=make(()=>null,{flo:playFlo}), fr=[]; for(let i=0;i<10;i++) fr.push(Array.from(s(i+100))); return f(fr,'all'); }
const pn=prom(false,18300), pw=prom(true,16000);
const ok=pn>=15&&pw>=15;
console.log((pn>=15?'ok  ':'FAIL')+`  обычный зонд: ${pn.toFixed(1)} дБ (нужно 15)`);
console.log((pw>=15?'ok  ':'FAIL')+`  широкий зонд: ${pw.toFixed(1)} дБ (нужно 15; до 0.46 проверка читала его как обычный — 6.7 дБ)`);
console.log('ИТОГ: '+(ok?'ok':'FAIL')); process.exitCode=ok?0:1;
