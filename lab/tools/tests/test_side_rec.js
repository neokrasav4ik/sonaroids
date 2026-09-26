/* «Запись вбок» целиком через код страницы (26.09): экран вертикальный (390×844), поддельные часы, синтетический микрофон
   (ладонь-ребро ходит влево-вправо по сценарию, tools/eval_side.js --synth). Проверяю: метка ходит вбок в нужную сторону,
   WAV собирается с kind 'side-portrait', метками фаз и ориентацией, и разбор eval_side.js читает его как синтетику
   (симметрично — «лево и право не различимы, различимо только „ушла от центра“»). */
const C=require('../common'), fs=require('fs'), path=require('path'), S=require('../eval_side');
let js=C.appJs();
js=js.replace(/var WORKLET=`[\s\S]*?`;/,'');
js=js.replace("function pickChannel(){","function pickChannel(){ if(globalThis.__fakePick) return globalThis.__fakePick();");
js=js.replace("function autoLevel(){","function autoLevel(){ if(globalThis.__fakeLevel) return globalThis.__fakeLevel();");
js=js.replace("function setProbe(w){","function setProbe(w){ globalThis.__probe=w; if(globalThis.__noAudio) return;");
js=js.replace("function promSub(frames,parity){","function promSub(frames,parity){ if(globalThis.__fakeProm) return globalThis.__fakeProm;");
js=js.replace("el('gMenu').addEventListener","globalThis.__h={runRec:runRec,onFrame:onFrame,rec:function(){return rec;},meta:function(){return recMeta;},blob:function(){return blob;},fname:function(){return fname;},setFs:function(){ fs=48000; },toSide:toSide};\nel('gMenu').addEventListener");
let now=0; const timers=[]; let rafs=[];
global.setTimeout=(f,ms)=>{ timers.push({t:now+(ms||0),f}); return timers.length; };
global.requestAnimationFrame=f=>{ rafs.push(f); };
global.setInterval=()=>0; global.performance={now:()=>now};
const mockCtx=new Proxy({measureText:(t)=>({width:String(t).length*10})},{get:(t,k)=>(k in t)?t[k]:(typeof k==='string'&&/^[a-z]/.test(k)?function(){}:undefined),set:(t,k,v)=>{t[k]=v;return true;}});
const els={}; const mk=id=>els[id]||(els[id]={id,classList:{_h:new Set(),add(c){this._h.add(c);},remove(c){this._h.delete(c);},toggle(c,v){ if(v===undefined?!this._h.has(c):v) this._h.add(c); else this._h.delete(c); },contains(c){return this._h.has(c);}},
  style:{},textContent:'',disabled:false,addEventListener(){},appendChild(){},getBoundingClientRect:()=>({width:360,height:300}),getContext:()=>mockCtx,querySelectorAll:()=>[],value:'90'});
global.getComputedStyle=()=>({paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',fontSize:'16px'});
const body={classList:mk('body').classList,appendChild(){}};
global.document={documentElement:{style:{}},body,getElementById:mk,createElement:()=>Object.assign(mk('x'+Math.random()),{remove(){}}),querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}};
global.window={innerWidth:390,innerHeight:844,devicePixelRatio:3,addEventListener(){},matchMedia:()=>({matches:false}),navigator:{}}; global.navigator={userAgent:'iPhone'};
global.localStorage={getItem:()=>null,setItem(){}}; global.screen={orientation:{angle:0}};
globalThis.__fakePick=()=>new Promise(r=>setTimeout(r,800)); globalThis.__noAudio=true; globalThis.__fakeProm=30;
globalThis.__fakeLevel=()=>new Promise(r=>setTimeout(()=>r({snr:44,g:0.1,atMax:false}),600));
new Function(js)(); const H=globalThis.__h; H.setFs();

const syn=S.synthRec(), X=syn.x, N=512, SR=48000, NF=Math.floor(X.length/N);
let fed=0, seq=0, recStart=null;
function feed(){ const due=Math.floor(now/1000*SR/N);
  while(fed<due){ const r=H.rec(); let k;
    if(r.on){ if(recStart===null) recStart=fed; k=fed-recStart; if(k>=NF) k=NF-1; }
    else k=fed%Math.round(2.5*SR/N);                            // до начала записи — пустая комната из начала синтетики
    H.onFrame({data:{s:seq++,f:X.subarray(k*N,(k+1)*N)}}); fed++; } }
async function tick(dt){ const t1=now+dt*1000; while(now<t1){ now+=1000/60; feed();
  for(let i=timers.length-1;i>=0;i--) if(timers[i].t<=now){ const f=timers[i].f; timers.splice(i,1); f(); }
  const rs=rafs; rafs=[]; rs.forEach(f=>f(now)); await null; await null; } }
(async()=>{
  let bad=0; const need=(ok,msg)=>{ console.log((ok?'ok  ':'FAIL')+'  '+msg); if(!ok) bad++; };
  H.toSide(); need(!els.sideIntro.classList.contains('hidden')&&body.classList.contains('pok'),'экран-подсказка открыт, просьба повернуть на нём скрыта (body.pok)');
  need(!els.sideGo.disabled,'в вертикальном экране кнопка «Держу, начать» доступна: '+els.sideOri.textContent);
  H.runRec('side'); const pos={};
  for(let i=0;i<460;i++){ await tick(0.1); const say=els.sdSay.textContent; if(els.mkH.style.left&&!pos[say]) pos[say]=parseFloat(els.mkH.style.left);
    if(!els.recDone.classList.contains('hidden')) break; }
  need(!els.recDone.classList.contains('hidden'),'запись дошла до конца, экран «Запись готова»');
  const c=pos['Замри по центру'], r=pos['Замри справа'], l=pos['Замри слева'];
  need(r>c&&c>l,`метка: справа ${r&&r.toFixed(0)} > центр ${c&&c.toFixed(0)} > слева ${l&&l.toFixed(0)} (px по ширине дорожки)`);
  const m=H.meta(); need(m&&m.kind==='side-portrait'&&/^sonarside_/.test(H.fname()),'метаданные: kind '+(m&&m.kind)+', файл '+H.fname());
  need(m&&m.orientation.h>m.orientation.w,'в метаданных экран вертикальный');
  const ks=['empty','place','move','c1','r1','l1','r2','l2','c2','away']; need(m&&ks.every(k=>m.marks[k]!==undefined),'все метки фаз на месте');
  const tMove=m.marks.move/SR, tR1=m.marks.r1/SR; need(Math.abs(tMove-6)<0.1&&Math.abs(tR1-21)<0.1,`метки по времени: «веди» ${tMove.toFixed(2)} с (ждём 6), «справа» ${tR1.toFixed(2)} с (ждём 21)`);
  const dur=m.samples/SR; need(Math.abs(dur-39)<0.3,`длительность ${dur.toFixed(1)} с (ждём 39)`);
  fs.mkdirSync(C.OUT,{recursive:true}); const f=path.join(C.OUT,'side_test.wav'); fs.writeFileSync(f,Buffer.from(await H.blob().arrayBuffer()));
  const w=C.loadWav(f); need(w.meta.kind==='side-portrait'&&w.x.length===m.samples,'WAV читается: '+(w.x.length/SR).toFixed(1)+' с float32');
  const v=S.report('side_test.wav (через страницу)',w.meta,w.x); need(v&&!v.lr&&v.off,'разбор: лево и право не различимы, «ушла от центра» различима — как у симметричной синтетики');
  console.log(bad?'ИТОГ: ПРОВАЛ':'ИТОГ: ok'); process.exitCode=bad?1:0;
})();
