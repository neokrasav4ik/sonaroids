/* Подготовка без калибровки через код страницы с поддельными часами: пустая комната → игра; «зонда не слышно» → кнопка «Ещё раз».
   Аргумент — запас зонда в дБ (44 — норма, 20 — «почти не слышно»). */
const C=require('../common');
let js=C.appJs();
js=js.replace(/var WORKLET=`[\s\S]*?`;/,'');
js=js.replace("function pickChannel(){","function pickChannel(){ if(globalThis.__fakePick) return globalThis.__fakePick();");
js=js.replace("function autoLevel(){","function autoLevel(){ if(globalThis.__fakeLevel) return globalThis.__fakeLevel();");
js=js.replace("function setProbe(w){","function setProbe(w){ globalThis.__probe=w; if(globalThis.__noAudio) return;");
js=js.replace("function waitReady(){","function waitReady(){ if(globalThis.__fakeReady) return Promise.resolve('ok');");
js=js.replace("el('gMenu').addEventListener","globalThis.__h={quickStart:quickStart,CS:function(){return CS;},mode:function(){return mode;},setFs:function(){ fs=48000; },DSP2:DSP2,cal:function(){return curCal;}};\nel('gMenu').addEventListener");
let now=0; const timers=[]; let rafs=[];
global.setTimeout=(f,ms)=>{ timers.push({t:now+(ms||0),f}); return timers.length; };
global.requestAnimationFrame=f=>{ rafs.push(f); };
global.setInterval=()=>0; global.performance={now:()=>now};
const mockCtx=new Proxy({measureText:(t)=>({width:String(t).length*10})},{get:(t,k)=>(k in t)?t[k]:(typeof k==='string'&&/^[a-z]/.test(k)?function(){}:undefined),set:(t,k,v)=>{t[k]=v;return true;}});
const els={}; const mk=id=>els[id]||(els[id]={id,classList:{_h:new Set(),add(c){this._h.add(c);},remove(c){this._h.delete(c);},toggle(c,v){ if(v===undefined?!this._h.has(c):v) this._h.add(c); else this._h.delete(c); },contains(c){return this._h.has(c);}},
  style:{},textContent:'',disabled:false,addEventListener(){},appendChild(){},getBoundingClientRect:()=>({width:844,height:300}),getContext:()=>mockCtx,querySelectorAll:()=>[],value:'90'});
global.getComputedStyle=()=>({paddingTop:'0px',paddingRight:'47px',paddingBottom:'21px',paddingLeft:'0px'});
global.document={documentElement:{},body:{appendChild(){}},getElementById:mk,createElement:()=>Object.assign(mk('x'+Math.random()),{remove(){}}),querySelectorAll:()=>[],addEventListener(){}};
global.window={innerWidth:844,innerHeight:390,devicePixelRatio:2,addEventListener(){},matchMedia:()=>({matches:false}),navigator:{}}; global.navigator={userAgent:'iPhone'};
global.localStorage={getItem:()=>null,setItem(){}}; global.screen={};
const snr=+(process.argv[2]||44);
globalThis.__fakePick=()=>new Promise(r=>setTimeout(r,800)); globalThis.__fakeReady=true; globalThis.__noAudio=true;
globalThis.__fakeLevel=()=>new Promise(r=>setTimeout(()=>r({snr,g:0.1,atMax:snr<38}),600));
new Function(js)(); const H=globalThis.__h; H.setFs();
async function tick(dt){ const t1=now+dt*1000; while(now<t1){ now+=1000/60;
  for(let i=timers.length-1;i>=0;i--) if(timers[i].t<=now){ const f=timers[i].f; timers.splice(i,1); f(); }
  const rs=rafs; rafs=[]; rs.forEach(f=>f(now)); await null; await null; } }
(async()=>{
  const seen=[]; const note=()=>{ const s=els.calT.textContent+' | '+els.calS.textContent.slice(0,40); if(seen[seen.length-1]!==s) seen.push(s); };
  H.quickStart(); for(let i=0;i<40;i++){ await tick(0.1); note(); }
  console.log('экраны:',seen.join('  →  '));
  console.log('режим в конце:',H.mode(),'| зонд:',globalThis.__probe,'| кнопка:',els.calGo.textContent,els.calGo.disabled?'(неактивна)':'(активна)','| калибровка:',JSON.stringify(H.cal()));
})();
