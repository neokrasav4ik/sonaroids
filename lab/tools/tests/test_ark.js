/* Прототип Арканоида через код страницы (27.09): горизонтально 844×390, разъём справа (поворот 90°), поддельные часы, синтетический
   микрофон (eval_right.synthFrame — ладонь на расстоянии d мм). Первые 25 с ладонь «играет хорошо» — ведёт ракетку за мячом
   (расстояние из положения мяча по карте хода), потом замирает у края. Проверяю: фазы, ракетка правее при ладони дальше,
   мяч отбивается, кирпичи бьются, промахи кончают игру, запись с журналом, разбор eval_ark.js сходится с телефоном. */
const C=require('../common'), fs=require('fs'), path=require('path'), S=require('../eval_right'), E=require('../eval_ark');
let js=C.appJs();
js=js.replace(/var WORKLET=`[\s\S]*?`;/,'');
js=js.replace("function pickChannel(){","function pickChannel(){ if(globalThis.__fakePick) return globalThis.__fakePick();");
js=js.replace("function autoLevel(){","function autoLevel(){ if(globalThis.__fakeLevel) return globalThis.__fakeLevel();");
js=js.replace("function setProbe(w){","function setProbe(w){ globalThis.__probe=w; if(globalThis.__noAudio) return;");
js=js.replace("el('gMenu').addEventListener","globalThis.__h={arkPlay:arkPlay,akSave:akSave,onFrame:onFrame,AK:function(){return AK;},setFs:function(){ fs=48000; },goFlow:goFlow};\nel('gMenu').addEventListener");
let now=0; const timers=[]; let rafs=[];
global.setTimeout=(f,ms)=>{ timers.push({t:now+(ms||0),f}); return timers.length; };
global.requestAnimationFrame=f=>{ rafs.push(f); return rafs.length; }; global.cancelAnimationFrame=()=>{};
global.setInterval=()=>0; global.performance={now:()=>now};
const mockCtx=new Proxy({measureText:(t)=>({width:String(t).length*10})},{get:(t,k)=>(k in t)?t[k]:(typeof k==='string'&&/^[a-z]/.test(k)?function(){}:undefined),set:(t,k,v)=>{t[k]=v;return true;}});
const els={}; const mk=id=>els[id]||(els[id]={id,classList:{_h:new Set(),add(c){this._h.add(c);},remove(c){this._h.delete(c);},toggle(c,v){ if(v===undefined?!this._h.has(c):v) this._h.add(c); else this._h.delete(c); },contains(c){return this._h.has(c);}},
  style:{},textContent:'',disabled:false,width:844,height:390,clientWidth:844,clientHeight:390,addEventListener(){},appendChild(){},getBoundingClientRect:()=>({width:844,height:390}),getContext:()=>mockCtx,querySelectorAll:()=>[],value:'90'});
global.getComputedStyle=()=>({paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',fontSize:'16px'});
const body={classList:mk('body').classList,appendChild(){}};
global.document={documentElement:{style:{}},body,getElementById:mk,createElement:()=>Object.assign(mk('x'+Math.random()),{remove(){},click(){}}),querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}};
global.window={innerWidth:844,innerHeight:390,devicePixelRatio:1,addEventListener(){},matchMedia:()=>({matches:false}),navigator:{}}; global.navigator={userAgent:'iPhone'};
global.URL.createObjectURL=()=>'blob:x';
global.localStorage={getItem:()=>null,setItem(){}}; global.screen={orientation:{angle:90}};
globalThis.__fakePick=()=>new Promise(r=>setTimeout(r,500)); globalThis.__noAudio=true;
globalThis.__fakeLevel=()=>new Promise(r=>setTimeout(()=>r({snr:44,g:0.1,atMax:false}),400));
new Function(js)(); const H=globalThis.__h; H.setFs();
const SR=48000, N=512; let fed=0, seq=0, tPlay=null, dPrev=100;
/* ладонь: до взмахов нет; взмахи 58–142 мм; в игре первые 25 с — туда, где будет мяч (по карте хода, с ограничением скорости руки 40 см/с), потом замерла */
function palm(t){ const A=H.AK(); if(!A||A.phase==='prep'||A.phase==='empty'||A.phase===''){ return null; }
  if(A.phase!=='play'||!A.map) return (dPrev=100+42*Math.sin(2*Math.PI*t/4));
  if(tPlay===null) tPlay=t; if(t-tPlay>25) return dPrev;
  const b=A.ball, f=Math.max(0,Math.min(1,(b.x-0.09)/0.82)), want=A.map.lo+f*(A.map.hi-A.map.lo)+10;   // +10: высота DSP2 ≈ расстояние − 10 мм (PHYS_CAL)
  const step=400*N/SR; dPrev+=Math.max(-step,Math.min(step,want-dPrev)); return dPrev; }
function feed(){ const due=Math.floor(now/1000*SR/N); while(fed<due){ H.onFrame({data:{s:seq++,f:S.synthFrame(palm(fed*N/SR),fed*7+1)}}); fed++; } }
async function tick(dt){ const t1=now+dt*1000; while(now<t1){ now+=1000/60; feed();
  for(let i=timers.length-1;i>=0;i--) if(timers[i].t<=now){ const f=timers[i].f; timers.splice(i,1); f(); }
  const rs=rafs; rafs=[]; rs.forEach(f=>f(now)); await null; await null; } }
(async()=>{
  let bad=0; const need=(ok,msg)=>{ console.log((ok?'ok  ':'FAIL')+'  '+msg); if(!ok) bad++; };
  H.goFlow('arkIntro'); need(!els.arkIntro.classList.contains('hidden'),'экран-подсказка открыт');
  H.arkPlay(); const seen=[], pairs=[];
  for(let i=0;i<1500;i++){ await tick(0.1); const A=H.AK(); if(seen[seen.length-1]!==A.phase) seen.push(A.phase); if(A.phase==='play'&&A.present&&A.dist!==null) pairs.push([A.dist,A.px]); if(A.phase==='over') break; }
  const A=H.AK(); need(seen.join(' → ').indexOf('empty → wave → count → play → over')>=0,'фазы: '+seen.join(' → '));
  need(A.port==='right'&&A.map&&A.map.hi-A.map.lo>60,`разъём справа, карта хода ${A.map&&A.map.lo.toFixed(0)}–${A.map&&A.map.hi.toFixed(0)} мм`);
  const cor=(a,b)=>{ const n=a.length, ma=a.reduce((u,v)=>u+v)/n, mb=b.reduce((u,v)=>u+v)/n; let s=0,sa=0,sb=0; for(let i=0;i<n;i++){ s+=(a[i]-ma)*(b[i]-mb); sa+=(a[i]-ma)**2; sb+=(b[i]-mb)**2; } return s/Math.sqrt(sa*sb); };
  const c=pairs.length>50?cor(pairs.map(p=>p[0]),pairs.map(p=>p[1])):NaN; need(c>0.95,`ладонь дальше от разъёма — ракетка правее: согласие ${c.toFixed(3)}`);
  const ev=A.log.filter(e=>typeof e[1]==='string'), nP=ev.filter(e=>e[1]==='paddle').length, nB=ev.filter(e=>e[1]==='brick').length, nM=ev.filter(e=>e[1].startsWith('miss')).length;
  need(nP>=8&&nB>=8,`пока ладонь ведёт ракетку за мячом: отбито ${nP}, кирпичей ${nB}, уровень ${A.level}`);
  need(nM===3&&A.phase==='over'&&!els.akBtns.classList.contains('hidden'),`ладонь замерла — три промаха и конец (промахов ${nM}), кнопки видны`);
  H.akSave(); const f=path.join(C.OUT,'ark_test.wav'); fs.mkdirSync(C.OUT,{recursive:true}); fs.writeFileSync(f,Buffer.from(await A.blob.arrayBuffer()));
  const w=C.loadWav(f); need(w.meta.kind==='ark-play'&&/^sonarark_/.test(A.fname)&&w.meta.log.length>500,'запись: '+A.fname+', журнал '+w.meta.log.length+' строк');
  const R=E.report('ark_test.wav (через страницу)',w.meta,w.x); need(R.vis>95&&R.match<0.01&&R.paddle===nP,`разбор сходится с телефоном: ${(R.match*100).toFixed(2)}% ширины, отбито ${R.paddle}`);
  console.log(bad?'ИТОГ: ПРОВАЛ':'ИТОГ: ok'); process.exitCode=bad?1:0;
})();
