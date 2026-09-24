/* Автоподстройка по взмахам на синтетике с текущим зондом, через настоящий код страницы (обработка + игровой цикл):
   ладонь на 100 мм (3–5 с), машет 100±50 мм (5–11 с), держит (11–14 с). Игра ждёт «Старт» до 11 с, потом «Старт».
   Ждём: помаханный диапазон ложится на 10–90% экрана (запас с обеих сторон, стол — не упор), после «Старт» подстройка замерла. */
const C=require('../common'), path=require('path'), fs_=require('fs'); let js=C.appJs();
js=js.replace(/var WORKLET=`[\s\S]*?`;/,'');
js=js.replace('function setProbe(w){','function setProbe(w){ globalThis.__probe=w; return;');
js=js.replace("el('gMenu').addEventListener",
 "globalThis.__t={onFrame:onFrame,gLoop:gLoop,gSize:gSize,setMode:function(m){mode=m;},getG:function(){return G;},AT:function(){return AT;},span:function(){return gSpan;},handFrac:handFrac,fracOf:fracOf,tunePick:tunePick,SLOG:function(){return SLOG;},slogStart:slogStart,slogBlob:slogBlob,"+
 "setAudio:function(r){ fs=r; var df=fs/N; kLo=Math.ceil(18300/df); kHi=Math.floor(20500/df); kc=Math.floor((kLo+kHi)/2); },DSP2:DSP2,Game:Game};\nel('gMenu').addEventListener");
let now=0; const mockCtx=new Proxy({measureText:(t)=>({width:String(t).length*10})},{get:(t,k)=>(k in t)?t[k]:(typeof k==='string'&&/^[a-z]/.test(k)?function(){}:undefined),set:(t,k,v)=>{t[k]=v;return true;}});
const els={}; const mk=id=>els[id]||(els[id]={id,classList:{_h:new Set(['hidden']),add(c){this._h.add(c);},remove(c){this._h.delete(c);},toggle(c,v){ if(v===undefined?!this._h.has(c):v) this._h.add(c); else this._h.delete(c); },contains(c){return this._h.has(c);}},style:{},textContent:'',addEventListener(){},appendChild(){},
  getBoundingClientRect:()=>({width:844,height:390}),getContext:()=>mockCtx,querySelectorAll:()=>[],value:'90'});
global.getComputedStyle=()=>({paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px'});
global.document={documentElement:{},body:{appendChild(){}},getElementById:mk,createElement:()=>Object.assign(mk('x'+Math.random()),{remove(){}}),querySelectorAll:()=>[],addEventListener(){}};
global.window={innerWidth:844,innerHeight:390,devicePixelRatio:2,addEventListener(){},matchMedia:()=>({matches:false}),navigator:{}}; global.navigator={userAgent:'iPhone'};
global.localStorage={getItem:()=>null,setItem(){}}; global.requestAnimationFrame=()=>{}; global.performance={now:()=>now};
global.setInterval=()=>0; global.setTimeout=f=>0; global.screen={}; let lastBlob=null; global.Blob=class{ constructor(p){ lastBlob=Buffer.from(p[0]); } };
new Function(js)(); const T=globalThis.__t;
const raw=fs_.readFileSync(path.join(C.OUT,'synth.bin')); const x=new Float32Array(raw.buffer,raw.byteOffset,raw.length/4).slice(0,15*48000);
T.setAudio(48000); T.DSP2.init(48000,'all'); T.DSP2.setCal(C.physCal()); T.DSP2.set('autocenter',1); T.setMode('game'); T.gSize(); T.slogStart('тест');
const G=T.getG(); let pressed=false, spanAtStart=null, endLo=null, endHi=null, spanLog=[];
for(let k=0;k<Math.floor(x.length/512);k++){ T.onFrame({data:{f:x.slice(k*512,(k+1)*512),s:k}}); if(process.env.DBG&&k%47===0){ const st=T.DSP2; } const t=(k+1)*512/48000;
  if(!pressed&&t>=11){ const r=T.tunePick(T.AT().buf); endLo=T.fracOf(r.lo); endHi=T.fracOf(r.hi); T.Game.begin(G); pressed=true; spanAtStart=T.span(); }
  while(now<t*1000){ now+=1000/60; T.gLoop(now); }
  if(k%47===0) spanLog.push([t.toFixed(1),T.span().toFixed(0)]); }
const endSpan=T.span();
const ev=T.SLOG().ev.filter(e=>e[1]==='подстройка').length;
const ok=spanAtStart>95&&spanAtStart<130&&endLo>0.06&&endLo<0.14&&endHi>0.86&&endHi<0.94&&Math.abs(endSpan-spanAtStart)<0.01;
console.log(`ход на весь экран: ${spanLog.filter((_,i)=>i%4===0).map(s=>s[0]+'с→'+s[1]).join(' ')} мм | к «Старт» ${spanAtStart.toFixed(0)} мм (размах ~89 мм на 80% экрана) | после «Старт» ${endSpan.toFixed(0)}`);
console.log(`помаханный диапазон к «Старт» лёг на экран: низ ${(endLo*100).toFixed(0)}% (ждём 10), верх ${(endHi*100).toFixed(0)}% (ждём 90) | шагов подстройки в журнале настройки: ${ev}`);
// журнал настройки с шагами подстройки: повторный прогон должен дать те же высоты, что видела страница
T.slogBlob(); const out=path.join(C.OUT,'autotune_setup_test.wav'); fs_.writeFileSync(out,lastBlob);
const {execFileSync}=require('child_process'); const rep=execFileSync('node',[path.join(__dirname,'..','replay_game.js'),out]).toString();
const m=rep.match(/итог \|Δ\| медиана ([\d.]+) мм/), same=m&&+m[1]<1.5;
console.log('повторный прогон журнала с подстройкой: итог расходится с телефоном на',m?m[1]:'?','мм (медиана)');
const ok2=ok&&same;
console.log(ok2?'ИТОГ: ok':'ИТОГ: ПРОВАЛ'); process.exitCode=ok2?0:1;
