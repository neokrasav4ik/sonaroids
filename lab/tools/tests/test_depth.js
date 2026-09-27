/* «Ближняя и дальняя рука» (27.09, 0.39s) через код страницы: вертикально 390×844, поддельные часы, синтетический микрофон
   с широким зондом 16–20,5 кГц (eval_right.synthMulti с полосой) — руки идут за метками сценария. Проверяю: экран-подсказка,
   вопрос «слышишь писк?» (ответ пишется в запись), фазы по метке, запись sonardepth_*.wav, разбор eval_depth.js: в широкой полосе
   руки разделяются, в узкой (как в игре) — нет. */
const C=require('../common'), fs=require('fs'), path=require('path'), S=require('../eval_right'), E=require('../eval_depth');
let js=C.appJs();
js=js.replace(/var WORKLET=`[\s\S]*?`;/,'');
js=js.replace("function pickChannel(){","function pickChannel(){ if(globalThis.__fakePick) return globalThis.__fakePick();");
js=js.replace("function autoLevel(){","function autoLevel(){ if(globalThis.__fakeLevel) return globalThis.__fakeLevel();");
js=js.replace("function promSub(frames,parity){","function promSub(frames,parity){ if(globalThis.__fakeProm) return globalThis.__fakeProm;");
js=js.replace("function setProbe(w){","function setProbe(w){ globalThis.__probe=w; if(globalThis.__noAudio) return;");
js=js.replace("el('gMenu').addEventListener","globalThis.__h={runDepth:runDepth,toDepth:toDepth,onFrame:onFrame,setFs:function(){ fs=48000; },blob:function(){ return blob; },fname:function(){ return fname; },meta:function(){ return recMeta; },SC:SCRIPT_DEPTH};\nel('gMenu').addEventListener");
let now=0; const timers=[]; let rafs=[];
global.setTimeout=(f,ms)=>{ timers.push({t:now+(ms||0),f}); return timers.length; };
global.requestAnimationFrame=f=>{ rafs.push(f); return rafs.length; }; global.cancelAnimationFrame=()=>{};
global.setInterval=()=>0; global.performance={now:()=>now};
const mockCtx=new Proxy({measureText:(t)=>({width:String(t).length*10})},{get:(t,k)=>(k in t)?t[k]:(typeof k==='string'&&/^[a-z]/.test(k)?function(){}:undefined),set:(t,k,v)=>{t[k]=v;return true;}});
const els={}; const mk=id=>els[id]||(els[id]={id,classList:{_h:new Set(),add(c){this._h.add(c);},remove(c){this._h.delete(c);},toggle(c,v){ if(v===undefined?!this._h.has(c):v) this._h.add(c); else this._h.delete(c); },contains(c){return this._h.has(c);}},
  style:{},textContent:'',disabled:false,width:390,height:844,clientWidth:390,clientHeight:844,addEventListener(){},appendChild(){},getBoundingClientRect:()=>({width:390,height:844}),getContext:()=>mockCtx,querySelectorAll:()=>[],value:'90'});
global.getComputedStyle=()=>({paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',fontSize:'16px'});
const body={classList:mk('body').classList,appendChild(){}};
global.document={documentElement:{style:{}},body,getElementById:mk,createElement:()=>Object.assign(mk('x'+Math.random()),{remove(){},click(){}}),querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}};
global.window={innerWidth:390,innerHeight:844,devicePixelRatio:1,addEventListener(){},matchMedia:()=>({matches:false}),navigator:{}}; global.navigator={userAgent:'iPhone'};
global.URL.createObjectURL=()=>'blob:x';
global.localStorage={getItem:()=>null,setItem(){}}; global.screen={orientation:{angle:0}};
globalThis.__fakePick=()=>new Promise(r=>setTimeout(r,500)); globalThis.__noAudio=true; globalThis.__fakeProm=30;
globalThis.__fakeLevel=()=>new Promise(r=>setTimeout(()=>r({snr:44,g:0.1,atMax:false}),400));
// случайность повторяемая: углы запуска мяча и раскладка не должны менять итог проверки от прогона к прогону (27.09: без этого падала 1 раз из 6)
let seed=12345; Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
new Function(js)(); const H=globalThis.__h; H.setFs();
const SR=48000, N=512; let fed=0, seq=0, tStart=null;
function hands(t){ if(tStart===null) return [null,null]; const tt=t-tStart, S=H.SC; let k=S.length-1; while(k>0&&S[k].t>tt) k--; const s=S[k]; return [s.L?s.L(tt):null,s.R?s.R(tt):null]; }
function feed(){ const due=Math.floor(now/1000*SR/N); while(fed<due){ const [L,R]=hands(fed*N/SR); H.onFrame({data:{s:seq++,f:S.synthMulti([{d:L,a:0.22},{d:R,a:0.22}],fed*7+1,[16000,20500])}}); fed++; } }
async function tick(dt){ const t1=now+dt*1000; while(now<t1){ now+=1000/60; feed();
  for(let i=timers.length-1;i>=0;i--) if(timers[i].t<=now){ const f=timers[i].f; timers.splice(i,1); f(); }
  const rs=rafs; rafs=[]; rs.forEach(f=>f(now)); await null; await null; } }
(async()=>{
  let bad=0; const need=(ok,msg)=>{ console.log((ok?'ok  ':'FAIL')+'  '+msg); if(!ok) bad++; };
  H.toDepth(); need(!els.depthIntro.classList.contains('hidden')&&els.body.classList.contains('pok'),'экран-подсказка открыт, портрет разрешён');
  H.runDepth(); let asked=false;
  for(let i=0;i<800;i++){ await tick(0.1); if(!asked&&!els.twAsk.classList.contains('hidden')){ asked=true; need(/Слышишь писк/.test(els.twSay.textContent)&&typeof els.twNo.onclick==='function','вопрос «слышишь писк?» с кнопками'); await tick(1); els.twNo.onclick(); }
    if(tStart===null&&asked&&els.twClock.textContent) tStart=now/1000-parseFloat(els.twClock.textContent); if(!els.recDone.classList.contains('hidden')) break; }
  const M=H.meta(); need(!els.recDone.classList.contains('hidden')&&M&&M.kind==='depth-portrait'&&M.audible===false&&M.probe.f_lo===16000&&/^sonardepth_/.test(H.fname())&&['nearL','farR','bothLR','swap','nearR','farL','bothRL'].every(k=>M.marks[k]!==undefined),`запись: ${M&&M.kind}, писк ${M&&M.audible}, зонд от ${M&&M.probe.f_lo} Гц, файл ${H.fname()}`);
  const f=path.join(C.OUT,'depth_test.wav'); fs.mkdirSync(C.OUT,{recursive:true}); fs.writeFileSync(f,Buffer.from(await H.blob().arrayBuffer())); const w=C.loadWav(f);
  const R=E.report('depth_test.wav (через страницу)',w.meta,w.x);
  need(R[0].verdict.single===1&&R[0].verdict.both===1,`широкая полоса: руки разделяются (одна в своей зоне ${R[0].verdict.single*100}%, обе порознь ${R[0].verdict.both*100}%)`);
  need(R[1].verdict.both<1,`узкая полоса (как в игре): две руки порознь не видны (${R[1].verdict.both*100}%) — ради этого и нужен широкий зонд`);
  console.log(bad?'ИТОГ: ПРОВАЛ':'ИТОГ: ok'); process.exitCode=bad?1:0;
})();
