/* Широкий зонд в игре лабы (27.09, 0.39u): переключатель «Зонд: широкий» (localStorage sonar_probe_wide=1) → подготовка берёт
   калибровку широкого (WIDE_CAL, k 1,4), DSP2 — полосу с 16 кГц (set('flo')), кнопка на главном — «Зонд: широкий». Синтетический
   микрофон играет широкий зонд (eval_right.synthMulti с полосой) и ладонь 100 ± 40 мм — высота DSP2 идёт за ладонью. */
const C=require('../common'), S=require('../eval_right');
let js=C.appJs();
js=js.replace(/var WORKLET=`[\s\S]*?`;/,'');
js=js.replace("function pickChannel(){","function pickChannel(){ if(globalThis.__fakePick) return globalThis.__fakePick();");
js=js.replace("function autoLevel(){","function autoLevel(){ if(globalThis.__fakeLevel) return globalThis.__fakeLevel();");
js=js.replace("function setProbe(w){","function setProbe(w){ globalThis.__probe=w; if(globalThis.__noAudio) return;");
js=js.replace("el('gMenu').addEventListener","globalThis.__h={quickStart:quickStart,CS:function(){return CS;},mode:function(){return mode;},setFs:function(){ fs=48000; },DSP2:DSP2,cal:function(){return curCal;},onFrame:onFrame,absS:function(){return absS;}};\nel('gMenu').addEventListener");
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
global.localStorage={getItem:k=>k==='sonar_probe_wide'?'1':null,setItem(){}}; global.screen={};
globalThis.__fakePick=()=>new Promise(r=>setTimeout(r,800)); globalThis.__noAudio=true;
globalThis.__fakeLevel=()=>new Promise(r=>setTimeout(()=>r({snr:44,g:0.1,atMax:false}),600));
new Function(js)(); const H=globalThis.__h; H.setFs();
const SR=48000, N=512; let fed=0, seq=0; const palm=t=>t<4?null:t<6?100:100+40*Math.sin(2*Math.PI*(t-6)/3);
function feed(){ const due=Math.floor(now/1000*SR/N); while(fed<due){ const d=palm(fed*N/SR); H.onFrame({data:{s:seq++,f:S.synthMulti(d===null?[]:[{d,a:0.25},{d:d+8,a:0.1}],fed*7+1,[16000,20500])}}); fed++; } }
async function tick(dt){ const t1=now+dt*1000; while(now<t1){ now+=1000/60; feed();
  for(let i=timers.length-1;i>=0;i--) if(timers[i].t<=now){ const f=timers[i].f; timers.splice(i,1); f(); }
  const rs=rafs; rafs=[]; rs.forEach(f=>f(now)); await null; await null; } }
(async()=>{ let bad=0; const need=(ok,msg)=>{ console.log((ok?'ok  ':'FAIL')+'  '+msg); if(!ok) bad++; };
  need(/широкий/.test(els.pwToggle.textContent),'кнопка на главном: '+els.pwToggle.textContent);
  H.quickStart(); const pr=[]; for(let i=0;i<150;i++){ await tick(0.1); const st=H.absS().st, t=now/1000; if(t>7&&st&&st.present) pr.push([palm(t),st.height]); }
  const I=H.DSP2.info(); need(I.band&&I.band[0]===Math.ceil(16000/(SR/N)),`DSP2: полоса с ${I.band&&(I.band[0]*SR/N).toFixed(0)} Гц`);
  need(H.cal().k===1.4,`калибровка широкого: k ${H.cal().k}`);
  const n=pr.length, a=pr.map(p=>p[0]), b=pr.map(p=>p[1]), ma=a.reduce((u,v)=>u+v,0)/n, mb=b.reduce((u,v)=>u+v,0)/n; let sab=0,saa=0,sbb=0; for(let i=0;i<n;i++){ sab+=(a[i]-ma)*(b[i]-mb); saa+=(a[i]-ma)**2; sbb+=(b[i]-mb)**2; }
  const c=sab/Math.sqrt(saa*sbb); need(n>60&&c>0.95,`высота идёт за ладонью: согласие ${c.toFixed(3)} (${n} кадров), режим ${H.mode()}`);
  console.log(bad?'ИТОГ: ПРОВАЛ':'ИТОГ: ok'); process.exitCode=bad?1:0; })();
