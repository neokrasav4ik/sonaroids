/* Игра через код страницы: ожидание → «Старт» → отсчёт → полёт → без пауз → проигрыш → «Ещё раз»; надписи по центру и вне выреза камеры. */
const C=require('../common'), path=require('path');
const fs_=require('fs'); let js=C.appJs();
js=js.replace(/var WORKLET=`[\s\S]*?`;/,'');
js=js.replace("el('gMenu').addEventListener","globalThis.__t={gSize:gSize,gLoop:gLoop,absS:absS,getG:function(){return G;},setMode:function(m){mode=m;}};\nel('gMenu').addEventListener");
let now=0; const drawn={rects:[],texts:[]};
const mockCtx=new Proxy({measureText:(s)=>({width:String(s).length*10}),fillRect:(x,y,w,h)=>drawn.rects.push([x,w]),fillText:(s,x,y)=>drawn.texts.push([s,x,y])},{get:(t,k)=>(k in t)?t[k]:(typeof k==='string'&&/^[a-z]/.test(k)?function(){}:undefined),set:(t,k,v)=>{t[k]=v;return true;}});
const els={}; const mk=id=>els[id]||(els[id]={id,classList:{_h:new Set(['hidden']),add(c){this._h.add(c);},remove(c){this._h.delete(c);},toggle(c,v){ if(v===undefined?!this._h.has(c):v) this._h.add(c); else this._h.delete(c); },contains(c){return this._h.has(c);}},
  style:{},textContent:'',addEventListener(){},appendChild(){},getBoundingClientRect:()=>({width:844,height:390}),getContext:()=>mockCtx,querySelectorAll:()=>[],value:'110'});
global.getComputedStyle=()=>({paddingTop:'0px',paddingRight:'47px',paddingBottom:'21px',paddingLeft:'0px'});
global.document={documentElement:{},body:{appendChild(){}},getElementById:mk,createElement:()=>Object.assign(mk('x'+Math.random()),{remove(){}}),querySelectorAll:()=>[],addEventListener(){}};
global.window={innerWidth:844,innerHeight:390,devicePixelRatio:2,addEventListener(){},matchMedia:()=>({matches:false}),navigator:{}}; global.navigator={userAgent:'iPhone'};
global.localStorage={getItem:()=>null,setItem(){}}; global.requestAnimationFrame=()=>{}; global.performance={now:()=>now}; global.setInterval=()=>0; global.setTimeout=()=>0; global.screen={};
const Game=new Function(C.gameSrc()+'\nreturn Game;')();
new Function(js)(); const T=globalThis.__t; T.setMode('game'); T.gSize(); const G=T.getG(); Game.setDiff(G,'hard');
const vis=id=>!els[id].classList.contains('hidden'); const seq=[], errs=[];
function run(sec,hand){ for(let i=0;i<Math.round(sec*60);i++){ now+=1000/60; T.absS.st=hand===null?{present:false,height:0}:{present:true,height:100+(hand-0.5)*110};
  try{ T.gLoop(now); }catch(e){ errs.push(e.message); } const s=G.state+(vis('gStart')?'[Старт]':'')+(vis('gAgain')?'[Ещё раз]':'')+(vis('gSave')?'[Журнал]':'');
  if(!seq.length||seq[seq.length-1]!==s) seq.push(s); } }
run(2,0.5);                                  // рука есть — не стартует сама
Game.begin(G); run(1,0.5); run(2.5,0.5);     // «Старт» → отсчёт → полёт
run(1.5,null);                               // рука убрана посреди игры — без паузы
let n=0; while(G.state!=='over'&&n<60*300){ run(1/60*10,0.5); n+=10; }
run(4,0.95);                                 // после проигрыша ладонь вверху — ничего
Game.begin(G); run(3.5,0.5);                 // «Ещё раз»
console.log("состояния и кнопки:",seq.join(" → "));
const W=844; const maxX=Math.max(...drawn.texts.map(t=>t[1])), minX=Math.min(...drawn.texts.map(t=>t[1]));
console.log(`надписи по горизонтали от ${minX.toFixed(0)} до ${maxX.toFixed(0)} px при ширине ${W} (центр ${W/2}); индикатор руки на x=${Math.max(...drawn.rects.filter(r=>r[1]===3).map(r=>r[0])).toFixed(0)} — вырез справа 47 px`);
console.log("ошибок:",errs.length?errs.slice(0,3):"нет");
