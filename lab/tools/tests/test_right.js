/* «Ладонь справа» через код страницы (27.09): портрет 390×844, поддельные часы, синтетический микрофон (eval_right.synthFrame).
   1) Проба-игра: пустая комната → взмахи 5–15 см → отсчёт → полёт; ладонь ходит 6–14 см — корабль правее, когда ладонь дальше;
      камни падают, удары считаются, игра кончается, запись сохраняется с метками, картой хода и кораблём; разбор eval_right.js сходится.
   2) Запись по метке (16 с): метка ходит по дорожке, WAV kind 'right-portrait' с тем же сценарием, что «Запись для меня»,
      и eval_recording.js разбирает его по форме. */
const C=require('../common'), fs=require('fs'), path=require('path'), E=require('../eval_right'), cp=require('child_process');
let js=C.appJs();
js=js.replace(/var WORKLET=`[\s\S]*?`;/,'');
js=js.replace("function pickChannel(){","function pickChannel(){ if(globalThis.__fakePick) return globalThis.__fakePick();");
js=js.replace("function autoLevel(){","function autoLevel(){ if(globalThis.__fakeLevel) return globalThis.__fakeLevel();");
js=js.replace("function setProbe(w){","function setProbe(w){ globalThis.__probe=w; if(globalThis.__noAudio) return;");
js=js.replace("function promSub(frames,parity){","function promSub(frames,parity){ if(globalThis.__fakeProm) return globalThis.__fakeProm;");
js=js.replace("el('gMenu').addEventListener","globalThis.__h={rpPose:function(){return rpPose;},rpPoseNext:rpPoseNext,rpMode:function(){return rpMode;},rpModeNext:rpModeNext,runRec:runRec,rightPlay:rightPlay,rpSave:rpSave,onFrame:onFrame,rec:function(){return rec;},RP:function(){return RP;},meta:function(){return recMeta;},blob:function(){return blob;},fname:function(){return fname;},setFs:function(){ fs=48000; },toRight:toRight,mode:function(){return mode;}};\nel('gMenu').addEventListener");
let now=0; const timers=[]; let rafs=[];
global.setTimeout=(f,ms)=>{ timers.push({t:now+(ms||0),f}); return timers.length; };
global.requestAnimationFrame=f=>{ rafs.push(f); return rafs.length; }; global.cancelAnimationFrame=()=>{};
global.setInterval=()=>0; global.performance={now:()=>now};
const mockCtx=new Proxy({measureText:(t)=>({width:String(t).length*10})},{get:(t,k)=>(k in t)?t[k]:(typeof k==='string'&&/^[a-z]/.test(k)?function(){}:undefined),set:(t,k,v)=>{t[k]=v;return true;}});
const els={}; const mk=id=>els[id]||(els[id]={id,classList:{_h:new Set(),add(c){this._h.add(c);},remove(c){this._h.delete(c);},toggle(c,v){ if(v===undefined?!this._h.has(c):v) this._h.add(c); else this._h.delete(c); },contains(c){return this._h.has(c);}},
  style:{},textContent:'',disabled:false,width:390,height:844,clientWidth:390,clientHeight:844,addEventListener(){},appendChild(){},getBoundingClientRect:()=>({width:360,height:300}),getContext:()=>mockCtx,querySelectorAll:()=>[],value:'90'});
global.getComputedStyle=()=>({paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',fontSize:'16px'});
const body={classList:mk('body').classList,appendChild(){}};
global.document={scripts:[{textContent:js}],documentElement:{style:{}},body,getElementById:mk,createElement:()=>Object.assign(mk('x'+Math.random()),{remove(){},click(){}}),querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}};
global.window={innerWidth:390,innerHeight:844,devicePixelRatio:1,addEventListener(){},matchMedia:()=>({matches:false}),navigator:{}}; global.navigator={userAgent:'iPhone'};
global.URL.createObjectURL=()=>'blob:x';
global.localStorage={getItem:()=>null,setItem(){}}; global.screen={orientation:{angle:0}};
globalThis.__fakePick=()=>new Promise(r=>setTimeout(r,500)); globalThis.__noAudio=true; globalThis.__fakeProm=30;
globalThis.__fakeLevel=()=>new Promise(r=>setTimeout(()=>r({snr:44,g:0.1,atMax:false}),400));
new Function(js)(); const H=globalThis.__h; H.setFs();
const SR=48000, N=512; let fed=0, seq=0, palm=()=>null, t0=0;
function feed(){ const due=Math.floor(now/1000*SR/N); while(fed<due){ const t=fed*N/SR; H.onFrame({data:{s:seq++,f:E.synthFrame(palm(t),fed*7+1)}}); fed++; } }
async function tick(dt){ const t1=now+dt*1000; while(now<t1){ now+=1000/60; feed();
  for(let i=timers.length-1;i>=0;i--) if(timers[i].t<=now){ const f=timers[i].f; timers.splice(i,1); f(); }
  const rs=rafs; rafs=[]; rs.forEach(f=>f(now)); await null; await null; } }
(async()=>{
  let bad=0; const need=(ok,msg)=>{ console.log((ok?'ok  ':'FAIL')+'  '+msg); if(!ok) bad++; };
  H.toRight(); need(!els.rightIntro.classList.contains('hidden')&&body.classList.contains('pok')&&!els.rightPlayGo.disabled,'экран-подсказка открыт в портрете, кнопки доступны: '+els.rightOri.textContent);
  // 1) проба-игра: пока не пошли взмахи — ладони нет; дальше ладонь ходит 58–142 мм с периодом 4 с
  // рука непрерывна: сонар не следит за мгновенными скачками, и настоящая рука их не делает
  palm=t=>{ const P=H.RP(); if(!P||P.phase==='prep'||P.phase==='empty'||P.phase===''){ return null; } return 100+42*Math.sin(2*Math.PI*t/4); };
  H.rightPlay(); const seen=[]; const pairs=[];
  for(let i=0;i<1200;i++){ await tick(0.1); const P=H.RP(); if(seen[seen.length-1]!==P.phase) seen.push(P.phase);
    if(P.phase==='play'&&P.present&&P.dist!==null) pairs.push([P.dist,P.x]); if(P.phase==='over') break; }
  const P=H.RP(); need(seen.join(' → ').indexOf('empty → wave → count → play → over')>=0,'фазы: '+seen.join(' → '));
  need(P.map&&P.map.hi-P.map.lo>60&&P.map.hi-P.map.lo<120,`карта хода по взмахам: ${P.map&&P.map.lo.toFixed(0)}–${P.map&&P.map.hi.toFixed(0)} мм (${P.map&&P.map.n} кадров)`);
  const cor=(a,b)=>{ const n=a.length, ma=a.reduce((u,v)=>u+v)/n, mb=b.reduce((u,v)=>u+v)/n; let s=0,sa=0,sb=0; for(let i=0;i<n;i++){ s+=(a[i]-ma)*(b[i]-mb); sa+=(a[i]-ma)**2; sb+=(b[i]-mb)**2; } return s/Math.sqrt(sa*sb); };
  const c=pairs.length>50?cor(pairs.map(p=>p[0]),pairs.map(p=>p[1])):NaN; need(c>0.95,`ладонь дальше — корабль правее: согласие ${c.toFixed(3)} по ${pairs.length} кадрам`);
  need(P.lives<=0&&P.ship.some(s=>s[1]==='hit'),`камни попадают, игра кончилась: счёт ${P.score}, ударов ${P.ship.filter(s=>s[1]==='hit').length}`);
  need(!els.rpBtns.classList.contains('hidden'),'после конца видны кнопки «Ещё раз / Сохранить / В начало»');
  H.rpSave(); const b=P.blob; need(b&&/^sonarright_/.test(P.fname),'сохранение: '+(P.fname||'нет файла'));
  fs.mkdirSync(C.OUT,{recursive:true}); const f1=path.join(C.OUT,'right_play_test.wav'); fs.writeFileSync(f1,Buffer.from(await b.arrayBuffer()));
  const w=C.loadWav(f1); need(w.meta.kind==='right-play'&&['empty','wave','count','play','over'].every(k=>w.meta.marks[k]!==undefined)&&w.meta.ship.length>100,'WAV: kind right-play, метки фаз, корабль по кадрам ('+w.meta.ship.length+')');
  const R=E.report('right_play_test.wav (через страницу)',w.meta,w.x); need(R.vis>95&&R.match<0.01&&R.edge<25,`разбор: ладонь видна ${R.vis.toFixed(0)}%, прогон против телефона ${(R.match*100).toFixed(2)}% ширины, у краёв ${R.edge.toFixed(0)}%`);
  // 1б) тот же путь в режиме «только движение»: правка движка на странице применилась, корабль идёт за ладонью, разбор сходится
  global.localStorage={getItem:()=>null,setItem(){}}; els.rightMode.textContent='';
  const H2=globalThis.__h; for(let i=0;i<5&&H2.rpMode()!=='motion';i++) H2.rpModeNext();
  const pairs2=[]; H.rightPlay(); for(let i=0;i<1200;i++){ await tick(0.1); const P2=H.RP(); if(P2.phase==='play'&&P2.present&&P2.dist!==null) pairs2.push([P2.dist,P2.x]); if(P2.phase==='over') break; }
  const P2=H.RP(); need(P2.mode==='motion'&&P2.D!==undefined&&/только движение/.test(els.rpMode.textContent),'режим «только движение»: движок пробы '+(P2.mode)+', кнопка «'+els.rpMode.textContent+'»');
  const c2=pairs2.length>50?cor(pairs2.map(p=>p[0]),pairs2.map(p=>p[1])):NaN; need(c2>0.9,`только движение: корабль правее при ладони дальше, согласие ${c2.toFixed(3)}`);
  H.rpSave(); const fm=path.join(C.OUT,'right_play_motion_test.wav'); fs.writeFileSync(fm,Buffer.from(await H.RP().blob.arrayBuffer()));
  const wm=C.loadWav(fm); const Rm=E.report('right_play_motion_test.wav',wm.meta,wm.x); need(wm.meta.mode==='motion'&&Rm.match<0.01,`разбор в том же режиме сходится с кораблём: ${(Rm.match*100).toFixed(2)}% ширины`);
  // 1в) поза «разъём от себя»: экран пробы перевёрнут (body.flip), сначала просьба перевернуть телефон, поза в записи
  for(let i=0;i<3&&H.rpPose()!=='away';i++) H.rpPoseNext(); for(let i=0;i<5&&H.rpMode()!=='game';i++) H.rpModeNext();
  H.rightPlay(); await tick(0.5); const flipSay=els.rpSay.textContent, flipped=body.classList.contains('flip');
  for(let i=0;i<1200;i++){ await tick(0.1); if(H.RP().phase==='over') break; }
  H.rpSave(); const fa=path.join(C.OUT,'right_play_away_test.wav'); fs.writeFileSync(fa,Buffer.from(await H.RP().blob.arrayBuffer())); const wa=C.loadWav(fa);
  need(flipped&&/Переверни/.test(flipSay)&&H.RP().phase==='over'&&wa.meta.pose==='away'&&/от себя/.test(els.rpPose.textContent),`поза «разъём от себя»: экран перевёрнут, «${flipSay}», проба дошла до конца, в записи pose=${wa.meta.pose}`);
  els.rpHome.click&&0; H.toRight(); need(!body.classList.contains('flip'),'на экране-подсказке переворот снят');
  for(let i=0;i<3&&H.rpPose()!=='near';i++) H.rpPoseNext();
  // 2) запись по метке: ладонь идёт ровно по сценарию «Запись для меня» (100 ± 50 мм)
  const sc=t=>t<3?null:t<5?100:t<11?100+50*Math.sin(2*Math.PI*(t-5)/6):t<14?100:null;
  let rs=null; palm=t=>{ const r=H.rec(); if(!r.on) return null; if(rs===null) rs=t; return sc(t-rs); };
  H.runRec('right'); const pos={};
  for(let i=0;i<300;i++){ await tick(0.1); const say=els.sdSay.textContent; if(els.mkH.style.left&&pos[say]===undefined) pos[say]=parseFloat(els.mkH.style.left); if(!els.recDone.classList.contains('hidden')) break; }
  need(!els.recDone.classList.contains('hidden')&&/^sonar1r_/.test(H.fname())&&H.meta().kind==='right-portrait','запись по метке готова: '+H.fname());
  need(pos['Ладонь справа, 10 см']>0,'метка на дорожке: 10 см → '+(pos['Ладонь справа, 10 см']||0).toFixed(0)+' px');
  const f2=path.join(C.OUT,'right_rec_test.wav'); fs.writeFileSync(f2,Buffer.from(await H.blob().arrayBuffer()));
  const out=cp.execFileSync('node',[path.join(__dirname,'..','eval_recording.js'),'--phys',f2],{encoding:'utf8'}); const m=out.match(/по форме: ([\d.]+)/);
  need(m&&+m[1]>0.95,'eval_recording.js --phys на этой записи: по форме '+(m?m[1]:'—'));
  console.log(bad?'ИТОГ: ПРОВАЛ':'ИТОГ: ok'); process.exitCode=bad?1:0;
})();
