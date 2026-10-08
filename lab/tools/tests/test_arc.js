/* Экшн-прототипы (27.09, 0.39m: слалом, ловец бомб, пещера) через код страницы: горизонтально 844×390, разъём справа, поддельные часы,
   синтетический микрофон (с 0.39n и трасса: цель — середина дороги впереди, канистра или объезд машины; eval_right.synthFrame — ладонь на расстоянии d мм), случайность зафиксирована. Ладонь: пустая комната →
   машет 100 ± 35 мм, пока подстройка (Tune) не поймает ход → в игре синтетический игрок ведёт ладонь к цели (ворота / ближайшая бомба /
   середина пещеры впереди) со скоростью руки ≤ 40 см/с. Проверяю: фазы, ход пойман, игра идёт и кончается, события, запись, разбор
   eval_arc.js сходится с телефоном, ладонь почти всё время в движении. */
const C=require('../common'), fs=require('fs'), path=require('path'), S=require('../eval_right'), E=require('../eval_arc');
let js=C.appJs();
js=js.replace(/var WORKLET=`[\s\S]*?`;/,'');
js=js.replace("function pickChannel(){","function pickChannel(){ if(globalThis.__fakePick) return globalThis.__fakePick();");
js=js.replace("function autoLevel(){","function autoLevel(){ if(globalThis.__fakeLevel) return globalThis.__fakeLevel();");
js=js.replace("function setProbe(w){","function setProbe(w){ globalThis.__probe=w; if(globalThis.__noAudio) return;");
js=js.replace("el('gMenu').addEventListener","globalThis.__h={arcPlay:arcPlay,arcSave:arcSave,arcOpen:arcOpen,ARC:function(){return ARC;},game:function(g){ arcGame=g; },onFrame:onFrame,setFs:function(){ fs=48000; },goFlow:goFlow};\nel('gMenu').addEventListener");
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
// случайность повторяемая: углы запуска мяча и раскладка не должны менять итог проверки от прогона к прогону (27.09: без этого падала 1 раз из 6)
let seed=12345; Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
new Function(js)(); const H=globalThis.__h; H.setFs();
const SR=48000, N=512; let fed=0, seq=0, tWave=null, dPrev=100;
function palm(t){ const A=H.ARC(); if(!A||A.phase==='prep'||A.phase==='empty'||A.phase===''){ return null; }
  if(A.phase==='wave'){ if(tWave===null) tWave=t; return (dPrev=100+35*Math.sin(2*Math.PI*(t-tWave)/2)); }
  if(A.phase!=='play'||A.frac===null) return dPrev;
  // цель по высоте экрана (0 — верх) → доля высоты по подстройке
  let ty=0.5;
  if(A.game==='slalom'){ const f=(A.flags||[]).filter(f=>f.st===0).sort((a,b)=>a.x-b.x)[0]; if(f) ty=f.y; }
  if(A.game==='bombs'){ const b=(A.bombs||[]).slice().sort((a,b)=>a.x-b.x)[0]; ty=b?b.y:A.by; }
  if(A.game==='race'){ const px=0.32, r=(A.cols||[]).find(c=>c.x>=px+0.3); ty=r?r.c:0.5;
    const can=(A.fcans||[]).filter(f=>f.x>px&&f.x<px+1.0).sort((a,b)=>a.x-b.x)[0]; if(can) ty=can.y;
    const car=(A.cars||[]).filter(k=>k.x>px-0.05&&k.x<px+0.8&&Math.abs((k.y||0)-ty)<0.1).sort((a,b)=>a.x-b.x)[0];
    if(car&&r){ const up=car.y-0.13, dn=car.y+0.13; ty=Math.abs(up-r.c)<Math.abs(dn-r.c)?up:dn; } }
  if(A.game==='cave'){ const c=(A.cols||[]).find(c=>c.x>=0.32+0.25); if(c) ty=c.c; }
  if(A.game==='juggle') return juggler(t,A);
  if(A.game==='pong') return ponger(t,A);
  if(A.game==='follow'){ const st=300*N/SR, e=(A.fwCm===null?100+30*Math.sin(t*3):A.fwCm*10)-dPrev; dPrev+=Math.max(-st,Math.min(st,e)); return dPrev; }   /* 1.57e: рука идёт к кружку (5 см → 50 мм) не быстрее 30 см/с */
  const want=(1-ty-0.06)/0.88, e=want-A.frac, step=400*N/SR;
  dPrev=Math.max(45,Math.min(175,dPrev+Math.max(-step,Math.min(step,0.25*e*A.T.field)))); return dPrev; }
/* жонглёр (1.57a): рука ждёт внизу (60 мм); мяч на ладони и уже чуть нагрелся — взмах вверх: скорость растёт и спадает по синусу
   за 0,16 с (как у живой руки — не скачком), пик — какой нужен до звезды мяча (не больше JG_V мм/с); мяч отрывается сам, когда ладонь
   тормозит; потом рука не спеша (25 см/с) возвращается вниз */
let jgS=null;
function juggler(t,A){ const dt=N/SR, base=60, T=0.16;
  if(!jgS) jgS={st:'wait'};
  if(jgS.st==='up'){ const u=(t-jgS.t0)/T; if(u>=1){ jgS.st='down'; } else dPrev+=jgS.v*Math.sin(Math.PI*u)*dt; }
  else { if(dPrev>base) dPrev=Math.max(base,dPrev-250*dt);
    const b=(A.balls||[]).find(b=>b.on&&b.heat>0.15);
    if(b){ const s=(A.stars||[]).find(s=>s.slot===b.slot), top=A.py-b.r, h=s?Math.max(0.08,top-s.y):0.25;
      const v=Math.sqrt(2*b.g*h)*0.97; jgS={st:'up',t0:t,v:Math.min(+(process.env.JG_V||900),v/0.60*A.T.field)}; } }
  dPrev=Math.max(45,Math.min(175,dPrev)); return dPrev; }
/* СонаПонг (1.58e): мяч падает на платформу и уже близко — взмах вверх (синус 0,16 с, пик PG_V мм/с), потом рука медленно вниз */
let pgS=null;
function ponger(t,A){ const dt=N/SR, base=60, T=0.16;
  if(!pgS) pgS={st:'wait'};
  if(pgS.st==='up'){ const u=(t-pgS.t0)/T; if(u>=1) pgS.st='down'; else dPrev+=pgS.v*Math.sin(Math.PI*u)*dt; }
  else { if(dPrev>base) dPrev=Math.max(base,dPrev-200*dt); const ar=A.ar||2, b=(A.balls||[]).find(b=>{ if(b.hold) return true; if(!(b.vy>0)) return false; return A.py-0.1-b.y<+(process.env.PG_H||0.10); }); if(b) pgS={st:'up',t0:t,v:+(process.env.PG_V||200)}; }
  dPrev=Math.max(45,Math.min(175,dPrev)); return dPrev; }
function feed(){ const due=Math.floor(now/1000*SR/N); while(fed<due){ H.onFrame({data:{s:seq++,f:S.synthFrame(palm(fed*N/SR),fed*7+1)}}); fed++; } }
async function tick(dt){ const t1=now+dt*1000; while(now<t1){ now+=1000/60; feed();
  for(let i=timers.length-1;i>=0;i--) if(timers[i].t<=now){ const f=timers[i].f; timers.splice(i,1); f(); }
  const rs=rafs; rafs=[]; rs.forEach(f=>f(now)); await null; await null; } }
(async()=>{
  let bad=0; const need=(ok,msg)=>{ console.log((ok?'ok  ':'FAIL')+'  '+msg); if(!ok) bad++; };
  for(const g of ['slalom','bombs','cave','race','juggle','follow','pong']){
    H.game(g); H.goFlow('arcIntro'); need(!els.arcIntro.classList.contains('hidden')&&/прототип/.test(els.acTitle.textContent),`${g}: экран-подсказка — ${els.acTitle.textContent}`);
    tWave=null; dPrev=100; H.arcPlay(); const seen=[];
    for(let i=0;i<1600;i++){ await tick(0.1); const A=H.ARC(); if((g==='juggle'||g==='pong')&&A.phase==='play'&&A.t>75) A.over=true;   /* жонглёр без потолка-смерти может играть долго — 75 с хватит */ if(seen[seen.length-1]!==A.phase) seen.push(A.phase); if(A.phase==='over') break; }
    const A=H.ARC(); need(seen.join(' → ').indexOf('empty → wave → count → play → over')>=0&&A.T&&A.T.ok&&A.T.field>=50&&A.T.field<=120,`${g}: фазы ${seen.join(' → ')}, ход пойман: весь путь ${A.T&&A.T.field.toFixed(0)} мм`);
    need(!els.acBtns.classList.contains('hidden'),`${g}: конец — ${els.acSay.textContent}: ${els.acSub.textContent}`);
    H.arcSave(); const f=path.join(C.OUT,'arc_'+g+'_test.wav'); fs.mkdirSync(C.OUT,{recursive:true}); fs.writeFileSync(f,Buffer.from(await A.blob.arrayBuffer()));
    const w=C.loadWav(f); need(w.meta.kind==='arc-play'&&w.meta.game===g&&new RegExp('^sonararc_'+g+'_').test(A.fname)&&w.meta.log.length>300,`${g}: запись ${A.fname}, журнал ${w.meta.log.length} строк`);
    if(g==='follow'){ const FW=require('../eval_follow'), R2=FW.analyse(w.meta,w.x,[]), m=R2.moves;
      console.log(`      follow: удержания ${R2.fit.pts.map(p=>p[0]+'→'+p[1].toFixed(0)).join(' ')}; ходы ${m.map(q=>q.per+' с: '+q.bot.toFixed(1)+'…'+q.top.toFixed(1)).join(' | ')}; рывки до ${R2.flick&&R2.flick.peak.toFixed(1)}`);
      need(w.meta.log.filter(e=>typeof e[1]==='string'&&e[1].startsWith('step')).length===20&&m.length===3&&Math.abs(m[0].travel-10)<3&&R2.fit.lin<1.5,`follow: программа (20 шагов), медленный ход ${m[0].travel.toFixed(1)} из 10 см (синтетика — грубая), прямая по удержаниям ±${R2.fit.lin.toFixed(2)} см`); continue; }
    if(g==='pong'){ const ev=w.meta.log.filter(e=>typeof e[1]==='string'), n=k=>ev.filter(e=>e[1].startsWith(k)).length; console.log(`      pong: подач ${n('serve')}, бросков ${n('toss')}, пасов ${n('pass')}, в сетку ${n('net')}, потеряно ${n('lost')} — ${w.meta.summary}`);
      need(n('toss')>=1&&n('serve')>=1&&w.meta.jg&&w.meta.jg.pong,`pong: игра идёт (${w.meta.summary})`); continue; }
    const R=E.report('arc_'+g+'_test.wav (через страницу)',w.meta,w.x);
    const good=g==='slalom'?(R.gate>=20&&R.finish===1):g==='bombs'?(R.caught>=10&&R.wave>=1):g==='race'?(A.score>300&&R.fuel>=1):g==='juggle'?(R.jg&&R.jg.tosses>=20&&A.nb===1&&R.jg.star===0&&R.jg.burn===0&&R.jg.visFlick>95&&R.jg.vMed>0.3):   /* 1.57c: учебный режим — один мяч, без звёзд и жара */(R.hit<=3&&R.gate===0&&A.score>100);
    need(good&&R.vis>95&&R.match<0.005&&R.moving>(g==='juggle'?10:25),`${g}: игра идёт (${w.meta.summary}), сверка ${(R.match*100).toFixed(2)}%, ладонь в движении ${R.moving.toFixed(0)}%`); }
  console.log(bad?'ИТОГ: ПРОВАЛ':'ИТОГ: ok'); process.exitCode=bad?1:0;
})();
