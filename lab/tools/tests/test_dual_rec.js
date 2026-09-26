/* «Два динамика» целиком через код страницы (27.09): телефон горизонтально (844×390, разъём справа — поворот 90°), поддельные часы,
   синтетический микрофон (tools/eval_dual.js: левый канал — верхний динамик). Проверяю: зонд переключается по фазам
   (левый → правый → оба), метка ходит вдоль дорожки, концы подписаны торцами, WAV собирается с kind 'dual-landscape', метками
   и стороной разъёма, и разбор eval_dual.js находит два динамика и вторую ось. */
const C=require('../common'), fs=require('fs'), path=require('path'), E=require('../eval_dual');
let js=C.appJs();
js=js.replace(/var WORKLET=`[\s\S]*?`;/,'');
js=js.replace("function pickChannel(){","function pickChannel(){ if(globalThis.__fakePick) return globalThis.__fakePick();");
js=js.replace("function autoLevel(){","function autoLevel(){ if(globalThis.__fakeLevel) return globalThis.__fakeLevel();");
js=js.replace("function setProbe(w){","function setProbe(w){ globalThis.__probe=w; (globalThis.__probes=globalThis.__probes||[]).push(w); if(globalThis.__noAudio) return;");
js=js.replace("function promSub(frames,parity){","function promSub(frames,parity){ if(globalThis.__fakeProm) return globalThis.__fakeProm;");
js=js.replace("el('gMenu').addEventListener","globalThis.__h={runRec:runRec,onFrame:onFrame,rec:function(){return rec;},meta:function(){return recMeta;},blob:function(){return blob;},fname:function(){return fname;},setFs:function(){ fs=48000; },goFlow:goFlow,setLast:function(v){ lastRec=v; }};\nel('gMenu').addEventListener");
let now=0; const timers=[]; let rafs=[];
global.setTimeout=(f,ms)=>{ timers.push({t:now+(ms||0),f}); return timers.length; };
global.requestAnimationFrame=f=>{ rafs.push(f); };
global.setInterval=()=>0; global.performance={now:()=>now};
const mockCtx=new Proxy({measureText:(t)=>({width:String(t).length*10})},{get:(t,k)=>(k in t)?t[k]:(typeof k==='string'&&/^[a-z]/.test(k)?function(){}:undefined),set:(t,k,v)=>{t[k]=v;return true;}});
const made=[];
const els={}; const mk=id=>els[id]||(els[id]={id,classList:{_h:new Set(),add(c){this._h.add(c);},remove(c){this._h.delete(c);},toggle(c,v){ if(v===undefined?!this._h.has(c):v) this._h.add(c); else this._h.delete(c); },contains(c){return this._h.has(c);}},
  style:{},textContent:'',disabled:false,addEventListener(){},appendChild(ch){ made.push(ch); },getBoundingClientRect:()=>({width:800,height:300}),getContext:()=>mockCtx,querySelectorAll:()=>[],value:'90'});
global.getComputedStyle=()=>({paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',fontSize:'16px'});
const body={classList:mk('body').classList,appendChild(){}};
global.document={documentElement:{style:{}},body,getElementById:mk,createElement:()=>Object.assign(mk('x'+Math.random()),{remove(){}}),querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}};
global.window={innerWidth:844,innerHeight:390,devicePixelRatio:3,addEventListener(){},matchMedia:()=>({matches:false}),navigator:{}}; global.navigator={userAgent:'iPhone'};
global.localStorage={getItem:()=>null,setItem(){}}; global.screen={orientation:{angle:90}};
globalThis.__fakePick=()=>new Promise(r=>setTimeout(r,800)); globalThis.__noAudio=true; globalThis.__fakeProm=30;
globalThis.__fakeLevel=()=>new Promise(r=>setTimeout(()=>r({snr:44,g:0.1,atMax:false}),600));
new Function(js)(); const H=globalThis.__h; H.setFs();

const syn=E.synthRec(true), X=syn.x, N=512, SR=48000, NF=Math.floor(X.length/N);
let fed=0, seq=0, recStart=null;
function feed(){ const due=Math.floor(now/1000*SR/N);
  while(fed<due){ const r=H.rec(); let k;
    if(r.on){ if(recStart===null) recStart=fed; k=fed-recStart; if(k>=NF) k=NF-1; } else k=fed%Math.round(2.5*SR/N);
    H.onFrame({data:{s:seq++,f:X.subarray(k*N,(k+1)*N)}}); fed++; } }
async function tick(dt){ const t1=now+dt*1000; while(now<t1){ now+=1000/60; feed();
  for(let i=timers.length-1;i>=0;i--) if(timers[i].t<=now){ const f=timers[i].f; timers.splice(i,1); f(); }
  const rs=rafs; rafs=[]; rs.forEach(f=>f(now)); await null; await null; } }
(async()=>{
  let bad=0; const need=(ok,msg)=>{ console.log((ok?'ok  ':'FAIL')+'  '+msg); if(!ok) bad++; };
  H.setLast('recDual'); H.goFlow('dualIntro'); need(!els.dualIntro.classList.contains('hidden')&&!body.classList.contains('pok'),'экран-подсказка открыт (горизонтально, без body.pok)');
  globalThis.__probes=[]; H.runRec('dual'); const pos={};
  for(let i=0;i<520;i++){ await tick(0.1); const say=els.sdSay.textContent; if(els.mkH.style.left&&!pos[say]) pos[say]=parseFloat(els.mkH.style.left);
    if(!els.recDone.classList.contains('hidden')) break; }
  need(!els.recDone.classList.contains('hidden'),'запись дошла до конца, экран «Запись готова»');
  const seqP=globalThis.__probes.filter((p,i,a)=>i===0||p!==a[i-1]); const iL=seqP.lastIndexOf('single-left'), iR=seqP.indexOf('single-right',iL), iD=seqP.indexOf('dual',iR);
  need(iL>=0&&iR>iL&&iD>iR,'зонд по фазам: '+seqP.join(' → '));
  const l=pos['Замри слева'], r=pos['Замри справа'], c=pos['Замри по центру']; need(r>c&&c>l,`метка: справа ${r&&r.toFixed(0)} > центр ${c&&c.toFixed(0)} > слева ${l&&l.toFixed(0)} px`);
  const labs=made.filter(e=>e.className==='lab').map(e=>e.textContent); need(labs.some(t=>/разъём →/.test(t))&&labs.some(t=>/← камера/.test(t)),'концы дорожки: '+labs.filter(t=>/разъём|камера/.test(t)).slice(-2).join(' … '));
  const m=H.meta(); need(m&&m.kind==='dual-landscape'&&/^sonardual_/.test(H.fname())&&m.port==='right','метаданные: kind '+(m&&m.kind)+', разъём '+(m&&m.port)+', файл '+H.fname());
  const ks=['e_l','e_r','e_d','cover','uncover','place','move','hl','hr','hc','away']; need(ks.every(k=>m.marks[k]!==undefined)&&m.script.every(s=>s.probe),'все метки фаз и зонд каждой фазы в метаданных');
  need(Math.abs(m.marks.e_d/SR-6)<0.1&&Math.abs(m.marks.move/SR-17)<0.1&&Math.abs(m.samples/SR-45)<0.3,`время: «оба» ${(m.marks.e_d/SR).toFixed(2)} с, «веди» ${(m.marks.move/SR).toFixed(2)} с, всего ${(m.samples/SR).toFixed(1)} с`);
  fs.mkdirSync(C.OUT,{recursive:true}); const f=path.join(C.OUT,'dual_test.wav'); fs.writeFileSync(f,Buffer.from(await H.blob().arrayBuffer()));
  const w=C.loadWav(f); const v=E.report('dual_test.wav (через страницу)',w.meta,w.x); need(v.apart&&v.axis,'разбор: два динамика и вторая ось — как у синтетики');
  console.log(bad?'ИТОГ: ПРОВАЛ':'ИТОГ: ok'); process.exitCode=bad?1:0;
})();
