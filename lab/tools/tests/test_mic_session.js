/* Запуск микрофона и звуковой сессии: обычный режим, экспериментальный принят, экспериментальный отклонён iOS (откат), старый Safari без API. */
const C=require('../common'), path=require('path');
const fs_=require('fs'); const js=C.appJs();
const g=n=>{ const i=js.indexOf('function '+n+'('); let d=0,j=js.indexOf('{',i); for(let k=j;k<js.length;k++){ if(js[k]==='{')d++; else if(js[k]==='}'){ if(!--d) return js.slice(i,k+1);} } };
async function run(lab,stored,hasAPI,refuse){
  const types=[];
  const session=hasAPI?{set type(v){ types.push(v); this._t=v; }, get type(){ return this._t; }}:undefined;
  const navigator={audioSession:session,mediaDevices:{getUserMedia:()=>{ const t=session?session._t:'(нет API)';
    return refuse.includes(t)?Promise.reject(new Error('AudioSession category is not compatible with audio capture')):Promise.resolve({ok:true,type:t}); }}};
  const localStorage={getItem:()=>stored};
  const api=new Function('navigator','localStorage',"var audioNote='';\n"+g('audioMode')+'\n'+g('openMic')+"\nreturn {openMic:openMic,note:function(){return audioNote;}};")(navigator,localStorage);
  try{ const s=await api.openMic(); console.log(`  ${lab.padEnd(58)} → микрофон есть, сессия «${s.type}»${api.note()?' | сообщение: '+api.note():''} | пробовал: ${types.join(' → ')||'—'}`); }
  catch(e){ console.log(`  ${lab.padEnd(58)} → ОШИБКА: ${e.message}`); }
}
(async()=>{
  await run("обычный режим",null,true,['playback']);
  await run("эксперимент, iOS принимает «запись и воспроизведение»",'silent',true,['playback']);
  await run("эксперимент, iOS отказывает (так было 24.09)",'silent',true,['playback','play-and-record']);
  await run("старый Safari без переключения сессий, эксперимент включён",'silent',false,[]);
})();
