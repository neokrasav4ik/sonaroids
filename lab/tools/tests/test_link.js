/* СонарЛинк (06.10): тоны зонда «чётные» (localStorage sonar_link_par=0) → подготовка и игра лабы обрабатывают только чётные тоны;
   в микрофоне рядом пищит сосед нечётными тонами (−15 дБ, часы на 20 ppm быстрее) и машет своей ладонью — высота идёт за своей ладонью,
   в пустой комнате ладони нет; экран «пищу» отделяет свой зонд от соседа (на сколько дБ тише). Синтетика — tools/sim_link.js. */
const C=require('../common'), L=require('../sim_link');
let js=C.appJs();
js=js.replace(/var WORKLET=`[\s\S]*?`;/,'');
js=js.replace("function pickChannel(){","function pickChannel(){ if(globalThis.__fakePick) return globalThis.__fakePick();");
js=js.replace("function autoLevel(){","function autoLevel(){ if(globalThis.__fakeLevel) return globalThis.__fakeLevel();");
js=js.replace("function setProbe(w){","function setProbe(w){ globalThis.__probe=w; if(globalThis.__noAudio) return;");
js=js.replace("el('gMenu').addEventListener","globalThis.__h={quickStart:quickStart,mode:function(){return mode;},setFs:function(){ fs=48000; },DSP2:DSP2,onFrame:onFrame,absS:function(){return absS;},lkLevels:lkLevels,probeSNR:probeSNR,linkPar:linkPar};\nel('gMenu').addEventListener");
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
global.localStorage={getItem:k=>k==='sonar_link_par'?'0':null,setItem(){}}; global.screen={};
globalThis.__fakePick=()=>new Promise(r=>setTimeout(r,300)); globalThis.__noAudio=true;
globalThis.__fakeLevel=()=>new Promise(r=>setTimeout(()=>r({snr:44,g:0.1,atMax:false}),300));
new Function(js)(); const H=globalThis.__h; H.setFs();
const inits=[]; const oi=H.DSP2.init; H.DSP2.init=function(f,p){ inits.push(p); return oi.call(this,f,p); };
const SR=48000, N=512, x=L.synth(0,1,-15,20,7), NF=Math.floor(x.length/N); let fed=0, seq=0;
function feed(){ const due=Math.min(NF,Math.floor(now/1000*SR/N)); while(fed<due){ H.onFrame({data:{s:seq++,f:x.subarray(fed*N,(fed+1)*N)}}); fed++; } }
async function tick(dt){ const t1=now+dt*1000; while(now<t1){ now+=1000/60; feed();
  for(let i=timers.length-1;i>=0;i--) if(timers[i].t<=now){ const f=timers[i].f; timers.splice(i,1); f(); }
  const rs=rafs; rafs=[]; rs.forEach(f=>f(now)); await null; await null; } }
(async()=>{ let bad=0; const need=(ok,msg)=>{ console.log((ok?'ok  ':'FAIL')+'  '+msg); if(!ok) bad++; };
  need(H.linkPar()===0,'тоны из настроек: '+H.linkPar());
  H.quickStart(); const pr=[], em=[]; for(let i=0;i<160;i++){ await tick(0.1); const st=H.absS().st, t=now/1000, h=L.hA(t);
    if(st&&t>1.2&&t<2.9) em.push(st.present?1:0); if(st&&h!==null&&t>5.5&&t<11&&st.present) pr.push([h,st.height]); }
  need(inits.length&&inits.every(p=>p===0),'обработка — только чётные тоны: init('+inits.join(',')+')');
  const n=pr.length, a=pr.map(p=>p[0]), b=pr.map(p=>p[1]), ma=a.reduce((u,v)=>u+v,0)/n, mb=b.reduce((u,v)=>u+v,0)/n; let sab=0,saa=0,sbb=0; for(let i=0;i<n;i++){ sab+=(a[i]-ma)*(b[i]-mb); saa+=(a[i]-ma)**2; sbb+=(b[i]-mb)**2; }
  const c=sab/Math.sqrt(saa*sbb); need(n>40&&c>0.95,`сосед пищит рядом, высота идёт за своей ладонью: согласие ${c.toFixed(3)} (${n} кадров)`);
  need(em.length>5&&em.every(v=>!v),`пустая комната: ладонь не видна (${em.length} замеров)`);
  const fr=[]; for(let k=0;k<8;k++) fr.push(x.subarray((40+k)*N,(41+k)*N)); const lv=H.lkLevels(fr,0), d=lv.own-lv.other;
  need(d>11&&d<19,`экран «пищу»: свой ${lv.own.toFixed(1)} дБ, сосед ${lv.other.toFixed(1)} дБ — на ${d.toFixed(1)} дБ тише (сосед на 15 дБ тише)`);
  const s0=H.probeSNR(fr,SR,18300,20450,0), sAll=H.probeSNR(fr,SR,18300,20450,'all'); need(s0<sAll,`запас зонда считает только свои тоны: ${s0.toFixed(1)} дБ (со всеми — ${sAll.toFixed(1)})`);
  console.log(bad?'ИТОГ: ПРОВАЛ':'ИТОГ: ok'); process.exitCode=bad?1:0; })();
