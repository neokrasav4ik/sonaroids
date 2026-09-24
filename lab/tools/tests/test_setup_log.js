/* Журнал настройки на синтетике с текущим зондом: пишется с запуска обработки, события появления руки, файл out/setup_log_test.wav;
   затем повторный прогон файла через движок должен совпасть с тем, что видела страница. */
const C=require('../common'), path=require('path'), fs_=require('fs'); let js=C.appJs();
js=js.replace(/var WORKLET=`[\s\S]*?`;/,'');
js=js.replace('function setProbe(w){','function setProbe(w){ globalThis.__probe=w; return;');
js=js.replace("el('gMenu').addEventListener",
 "globalThis.__t={onFrame:onFrame,setMode:function(m){mode=m;},slogStart:slogStart,getSLOG:function(){return SLOG;},slogBlob:slogBlob,diagText:diagText,absS:absS,"+
 "setAudio:function(r){ fs=r; var df=fs/N; kLo=Math.ceil(18300/df); kHi=Math.floor(20500/df); kc=Math.floor((kLo+kHi)/2); },DSP2:DSP2,setCal:function(c){curCal=c;}};\nel('gMenu').addEventListener");
const mockCtx=new Proxy({measureText:(t)=>({width:String(t).length*10})},{get:(t,k)=>(k in t)?t[k]:(typeof k==='string'&&/^[a-z]/.test(k)?function(){}:undefined),set:(t,k,v)=>{t[k]=v;return true;}});
const els={}; const mk=id=>els[id]||(els[id]={id,classList:{_h:new Set(['hidden']),add(c){this._h.add(c);},remove(c){this._h.delete(c);},toggle(c,v){ if(v===undefined?!this._h.has(c):v) this._h.add(c); else this._h.delete(c); },contains(c){return this._h.has(c);}},style:{},textContent:'',addEventListener(){},appendChild(){},
  getBoundingClientRect:()=>({width:844,height:390}),getContext:()=>mockCtx,querySelectorAll:()=>[],value:'14'});
global.getComputedStyle=()=>({paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px'});
global.document={documentElement:{},body:{appendChild(){}},getElementById:mk,createElement:()=>Object.assign(mk('x'+Math.random()),{remove(){}}),querySelectorAll:()=>[],addEventListener(){}};
global.window={innerWidth:844,innerHeight:390,devicePixelRatio:2,addEventListener(){},matchMedia:()=>({matches:false}),navigator:{}}; global.navigator={userAgent:'iPhone'};
global.localStorage={getItem:()=>null,setItem(){}}; global.requestAnimationFrame=()=>{}; global.performance={now:()=>0};
global.setInterval=()=>0; global.setTimeout=f=>0; global.screen={};
let lastBlob=null; global.Blob=class{ constructor(p){ lastBlob=Buffer.from(p[0]); } };
new Function(js)(); const T=globalThis.__t;
const raw=fs_.readFileSync(path.join(C.OUT,'synth.bin')); const x=new Float32Array(raw.buffer,raw.byteOffset,raw.length/4).slice(0,16*48000);
T.setAudio(48000); const cal={k:1.0,o:0,s:1.0}; T.setCal(cal);
T.DSP2.init(48000,'all'); T.DSP2.setCal(cal); T.setMode('cal'); T.slogStart('тест');
const nF=Math.floor(x.length/512); for(let k=0;k<nF;k++) T.onFrame({data:{f:x.slice(k*512,(k+1)*512),s:k}});
const S=T.getSLOG();
console.log('журнал настройки: кадров звука',S.f,'из',nF,'| записей обработки',S.dsp.length,'| события:',S.ev.map(e=>e[1]).join(' | '));
console.log('строка диагностики:',T.diagText(T.absS.st));
T.slogBlob(); const out=path.join(C.OUT,'setup_log_test.wav'); fs_.writeFileSync(out,lastBlob);
// сверка: повторный прогон файла через движок из приложения должен дать те же решения о руке
const L=C.loadWav(out), D=C.makeDSP(L.meta.probe.f_lo); D.init(48000,'all'); D.setCal(L.meta.setup.cal); let same=0,n=0,dh=0;
const byF=new Map(L.glog.dsp.map(a=>[a[0],a]));
for(let k=0;k<Math.floor(L.x.length/512);k++){ const r=D.frame(L.x.subarray(k*512,(k+1)*512)); const a=byF.get(k); if(!r||!a) continue; n++; if((a[1]===1)===r.present) same++; dh=Math.max(dh,Math.abs(a[2]-r.height)); }
console.log(`повторный прогон файла: рука совпала в ${(100*same/n).toFixed(1)}% кадров, высота расходится не больше ${dh.toFixed(2)} мм (16 бит против float) | размер ${(lastBlob.length/1024).toFixed(0)} КБ`);
