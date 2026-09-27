/* «Две ладони» (27.09, 0.39o) через код страницы: вертикально 390×844, поддельные часы, синтетический микрофон с двумя отражателями
   (eval_right.synthMulti) — ладони идут за метками сценария. Проверяю: экран-подсказка, фазы по метке, запись sonartwo_*.wav с метками
   и сценарием, «запись готова» в портрете, разбор eval_two.js: вместе и по очереди различимы, на разных расстояниях — два пятна. */
const C=require('../common'), fs=require('fs'), path=require('path'), S=require('../eval_right'), E=require('../eval_two');
let js=C.appJs();
js=js.replace(/var WORKLET=`[\s\S]*?`;/,'');
js=js.replace("function pickChannel(){","function pickChannel(){ if(globalThis.__fakePick) return globalThis.__fakePick();");
js=js.replace("function autoLevel(){","function autoLevel(){ if(globalThis.__fakeLevel) return globalThis.__fakeLevel();");
js=js.replace("function promSub(frames,parity){","function promSub(frames,parity){ if(globalThis.__fakeProm) return globalThis.__fakeProm;");
js=js.replace("function setProbe(w){","function setProbe(w){ globalThis.__probe=w; if(globalThis.__noAudio) return;");
js=js.replace("el('gMenu').addEventListener","globalThis.__h={runTwo:runTwo,toTwo:toTwo,onFrame:onFrame,setFs:function(){ fs=48000; },blob:function(){ return blob; },fname:function(){ return fname; },meta:function(){ return recMeta; },SC:SCRIPT_TWO,SF:SCRIPT_FIST,varNext:function(){ el('twoVar').click&&0; twoVar=twoVar==='fist'?'two':'fist'; twoVarLabel(); return twoVar; }};\nel('gMenu').addEventListener");
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
let VAR='two'; function hands(t){ if(!els.recTwo||els.recTwo.classList.contains('hidden')||tStart===null) return [null,null]; const tt=t-tStart, S=VAR==='fist'?H.SF:H.SC; let k=S.length-1; while(k>0&&S[k].t>tt) k--; const s=S[k]; return [s.L?s.L(tt):null,s.R?s.R(tt):null]; }
function feed(){ const due=Math.floor(now/1000*SR/N); while(fed<due){ const t=fed*N/SR, [L,R]=hands(t), sw=VAR==='fist'&&tStart!==null&&t-tStart>=30, hand=(d,f)=>d===null?[]:f?[{d,a:0.12}]:[{d,a:0.2},{d:d-12,a:0.12},{d:d+10,a:0.1}];
    const list=VAR==='fist'?hand(L,!sw).concat(hand(R,sw)):[{d:L,a:0.22},{d:R,a:0.2}]; H.onFrame({data:{s:seq++,f:S.synthMulti(list,fed*7+1)}}); fed++; } }
async function tick(dt){ const t1=now+dt*1000; while(now<t1){ now+=1000/60; feed();
  for(let i=timers.length-1;i>=0;i--) if(timers[i].t<=now){ const f=timers[i].f; timers.splice(i,1); f(); }
  const rs=rafs; rafs=[]; rs.forEach(f=>f(now)); await null; await null; } }
(async()=>{
  let bad=0; const need=(ok,msg)=>{ console.log((ok?'ok  ':'FAIL')+'  '+msg); if(!ok) bad++; };
  H.toTwo(); need(!els.twoIntro.classList.contains('hidden')&&els.body.classList.contains('pok'),'экран-подсказка открыт, портрет разрешён');
  H.runTwo(); for(let i=0;i<700;i++){ if(process.env.DBG&&i%50===0) console.log('  dbg',i,els.twSay.textContent,'|',els.twSub.textContent,'|',els.twClock.textContent); await tick(0.1); if(tStart===null&&els.twClock.textContent) tStart=now/1000-parseFloat(els.twClock.textContent); if(!els.recDone.classList.contains('hidden')) break; }
  const M=H.meta(); need(!els.recDone.classList.contains('hidden')&&els.body.classList.contains('pok'),'запись готова, экран в портрете');
  need(M&&M.kind==='two-portrait'&&['empty','place','both','alt','left','right','nl','nr','away'].every(k=>M.marks[k]!==undefined)&&/^sonartwo_/.test(H.fname()),`метаданные: ${M&&M.kind}, меток ${M&&Object.keys(M.marks).length}, файл ${H.fname()}`);
  const f=path.join(C.OUT,'two_test.wav'); fs.mkdirSync(C.OUT,{recursive:true}); fs.writeFileSync(f,Buffer.from(await H.blob().arrayBuffer())); const w=C.loadWav(f);
  const A=E.report('two_test.wav (через страницу)',w.meta,w.x), g=k=>A.phases.find(p=>p.k===k);
  need(g('both')&&g('alt')&&g('alt').B>2*g('both').B,`вместе и по очереди различимы: B ${g('both').B.toFixed(2)} против ${g('alt').B.toFixed(2)}`);
  need(g('nl').blobs===2&&g('nr').blobs===2&&g('both').blobs===1,`на разных расстояниях — два пятна (${g('nl').blobs}, ${g('nr').blobs}), вместе — одно (${g('both').blobs})`);
  // вариант «кулак и ладонь» (0.39p): кнопка варианта, свой сценарий, файл sonarfist_*, разбор узнаёт кулак и ладонь по силе эха при любой стороне
  VAR=H.varNext(); tStart=null; H.toTwo(); need(/кулак и ладонь/.test(els.twoVar.textContent),'кнопка варианта: '+els.twoVar.textContent);
  H.runTwo(); for(let i=0;i<700;i++){ await tick(0.1); if(tStart===null&&els.twClock.textContent&&!els.recTwo.classList.contains('hidden')) tStart=now/1000-parseFloat(els.twClock.textContent); if(!els.recDone.classList.contains('hidden')) break; }
  const M2=H.meta(); need(M2.variant==='fist'&&['fL','pR','bothA','swap','pL','fR','bothB'].every(k=>M2.marks[k]!==undefined)&&/^sonarfist_/.test(H.fname()),`«кулак и ладонь»: метки ${Object.keys(M2.marks).join(',')}, файл ${H.fname()}`);
  const f2=path.join(C.OUT,'fist_test.wav'); fs.writeFileSync(f2,Buffer.from(await H.blob().arrayBuffer())); const w2=C.loadWav(f2); const A2=E.report('fist_test.wav (через страницу)',w2.meta,w2.x);
  const sn=A2.fist&&A2.fist.find(q=>q.k==='snr'); need(sn&&sn.x1>2&&sn.x2>2,`ладонь громче кулака при любой стороне: ${sn&&sn.x1.toFixed(1)} и ${sn&&sn.x2.toFixed(1)} дБ`);
  console.log(bad?'ИТОГ: ПРОВАЛ':'ИТОГ: ok'); process.exitCode=bad?1:0;
})();
