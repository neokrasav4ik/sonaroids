/* The lab's SonaPong (lab/src/087_arcade.js, built into lab/app/sonar_lab3.html) run step by step in Node, for test_pong.js: the game's
   core (src/15_pong.js) must play the very same game as the prototype it was moved from. Mocks as in lab/tools/tests/test_arc.js. */
const C=require('../lab/tools/common');
let js=C.appJs();
js=js.replace(/var WORKLET=`[\s\S]*?`;/,'');
js=js.replace("function pickChannel(){","function pickChannel(){ if(globalThis.__fakePick) return globalThis.__fakePick();");
js=js.replace("function autoLevel(){","function autoLevel(){ if(globalThis.__fakeLevel) return globalThis.__fakeLevel();");
js=js.replace("function setProbe(w){","function setProbe(w){ globalThis.__probe=w; if(globalThis.__noAudio) return;");
js=js.replace("function sfx(kind,x){","function sfx(kind,x){ if(globalThis.__noSfx) return;");
js=js.replace("el('gMenu').addEventListener","globalThis.__pg={ARC:function(){return ARC;},STEP:function(){return ARC_STEP;},PGV:function(){return PG_V;},apply:pgApply,JGS:function(){return JG_SET;},init:arcInit,BALW:PG_BALW,H:function(){return jgPadH();},mix:mixFrame,DSP:function(){return DSP2;},setFs:function(){ fs=48000; }};\nel('gMenu').addEventListener");
let now=0; const timers=[]; let rafs=[];
global.setTimeout=(f,ms)=>{ timers.push({t:now+(ms||0),f}); return timers.length; };
global.requestAnimationFrame=f=>{ rafs.push(f); return rafs.length; }; global.cancelAnimationFrame=()=>{};
global.setInterval=()=>0; global.performance={now:()=>now};
const mockCtx=new Proxy({measureText:(t)=>({width:String(t).length*10}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(t,k)=>(k in t)?t[k]:(typeof k==='string'&&/^[a-z]/.test(k)?function(){}:undefined),set:(t,k,v)=>{t[k]=v;return true;}});
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
globalThis.__noSfx=true;
const R0=Math.random; new Function(js)(); Math.random=R0; const P=globalThis.__pg;
/* the lab set up as the game's world: «World for balance → Endless», sensitivity «below middle» unless asked */
function setup(ar,sens,rand){ const V=P.PGV(), W=P.BALW; Object.assign(V,W.common,W.endless); P.apply(); const J=P.JGS(); J.sens=sens===undefined?1:sens; J.net=0;
  const A=P.ARC(); A.game='pong'; A.ar=ar; P.init(); A.ar=ar; A.log=[]; A.frames=[]; A.t=0; A.pf=[]; A.over=false; A.on=true; Math.random=rand; return A; }
/* one step as the lab's game loop does it: the time, the rackets from the palm (jgPad), then the pong step */
function step(A,n,hand){ A.t=n/60; if(hand!==null&&hand!==undefined) A.py=Math.max(0.3,Math.min(0.97,0.94-hand*P.H())); P.STEP().pong(1/60); }
module.exports={setup,step,P};
