/* Зонд пропал посреди партии (наушники/Bluetooth): надпись «НЕТ ЗОНДА» и зонд выключен. Нужен out/synth.bin. */
const C=require('../common'), path=require('path');
const fs_=require('fs'); let js=C.appJs();
js=js.replace(/var WORKLET=`[\s\S]*?`;/,'');
js=js.replace('function setProbe(w){','function setProbe(w){ globalThis.__probe=w; return;');
js=js.replace("el('gMenu').addEventListener",
 "globalThis.__t={onFrame:onFrame,gLoop:gLoop,gSize:gSize,setMode:function(m){mode=m;},getLOG:function(){return LOG;},getG:function(){return G;},logBlob:logBlob,"+
 "setAudio:function(r){ fs=r; var df=fs/N; kLo=Math.ceil(17750/df); kHi=Math.floor(20500/df); kc=Math.floor((kLo+kHi)/2); },DSP2:DSP2,Game:Game,setCal:function(c){curCal=c;}};\nel('gMenu').addEventListener");
let now=0; globalThis.__texts=[]; const mockCtx=new Proxy({measureText:(t)=>({width:String(t).length*10}),fillText:(t)=>globalThis.__texts.push(String(t))},{get:(t,k)=>(k in t)?t[k]:(typeof k==='string'&&/^[a-z]/.test(k)?function(){}:undefined),set:(t,k,v)=>{t[k]=v;return true;}});
const els={}; const mk=id=>els[id]||(els[id]={id,classList:{_h:new Set(['hidden']),add(c){this._h.add(c);},remove(c){this._h.delete(c);},toggle(c,v){ if(v===undefined?!this._h.has(c):v) this._h.add(c); else this._h.delete(c); },contains(c){return this._h.has(c);}},style:{},textContent:'',addEventListener(){},appendChild(){},
  getBoundingClientRect:()=>({width:844,height:390}),getContext:()=>mockCtx,querySelectorAll:()=>[],value:'14'});
global.getComputedStyle=()=>({paddingTop:'0px',paddingRight:'47px',paddingBottom:'21px',paddingLeft:'0px'});
global.document={documentElement:{},body:{appendChild(){}},getElementById:mk,createElement:()=>Object.assign(mk('x'+Math.random()),{remove(){}}),querySelectorAll:()=>[],addEventListener(){}};
global.window={innerWidth:844,innerHeight:390,devicePixelRatio:2,addEventListener(){},matchMedia:()=>({matches:false}),navigator:{}}; global.navigator={userAgent:'iPhone'};
global.localStorage={getItem:()=>null,setItem(){}}; global.requestAnimationFrame=()=>{}; global.performance={now:()=>now};
global.setInterval=()=>0; global.setTimeout=f=>0; global.screen={};
let lastBlob=null; global.Blob=class{ constructor(p){ lastBlob=Buffer.from(p[0]); } };
new Function(js)();
const T=globalThis.__t;
// настоящая запись
const raw=fs_.readFileSync(path.join(C.OUT,'synth.bin')); const x=new Float32Array(raw.buffer,raw.byteOffset,raw.length/4);
T.setAudio(48000); const cal={k:1.0,o:0,s:1.0}; T.setCal(cal);
T.DSP2.init(48000,'all'); T.DSP2.setCal(cal); T.setMode('game'); T.gSize();
const G=T.getG(); T.Game.setDiff(G,'easy'); let pressed=false;
const nF=Math.floor(x.length/512), frames=[];
for(let k=0;k<nF;k++){ const fr=x.slice(k*512,(k+1)*512); frames.push(fr);
  T.onFrame({data:{f:fr,s:k}});
  const tAudio=(k+1)*512/48000;
  if(!pressed&&tAudio>4.5&&G.state==='wait'){ T.Game.begin(G); pressed=true; }
  while(now<tAudio*1000){ now+=1000/60; if(false){
      G.rocks.push({x:G.ship.x,y:G.ship.y,r:20,v:[[1,0]],vx:-1,vy:0,rot:0,vr:0}); }        // устраиваю проигрыш
    T.gLoop(now); } }

const t=globalThis.__texts; const i=t.lastIndexOf('НЕТ ЗОНДА');
console.log("в конце партии на экране:",i>=0?"«НЕТ ЗОНДА» — "+t[i+1]:"сообщения нет","| зонд переведён в:",globalThis.__probe);
