/* Разбор записи экшн-прототипов (sonararc_<игра>_*.wav, с 27.09: слалом, ловец бомб, пещера; с 0.39n — трасса): звук снова через DSP2 с той же калибровкой,
   центровкой и сдвигами подстройки в те же кадры, доля высоты — модулем игры Tune (из собранной лабы). Считаю: видна ли ладонь, сколько
   времени ладонь в движении (главное, ради чего эти игры: «экшн без перерыва»), дрожь в покое, события игры, сверку с телефоном.
   Запуск: node eval_arc.js запись.wav [...] */
const C=require('./common'), path=require('path');
const SR=48000, N=512;
function tuneMod(){ const js=C.appJs(), i=js.indexOf('var Tune=(function(){'); return new Function(js.slice(i,js.indexOf('if(typeof module',i))+'\nreturn Tune;')(); }
/* 1.57a: тоны — как пищал телефон (лаба помнит чётные/нечётные со СонарЛинка) */
function replay(meta,x){ const D=C.makeDSP(C.bandOf(meta)); D.init(SR,meta.probe&&(meta.probe.bins===0||meta.probe.bins===1)?meta.probe.bins:'all'); D.setCal(meta.cal); if(meta.autocenter) D.set('autocenter',1); const uw=process.env.UNWRAP!==undefined?process.env.UNWRAP==='1':!!meta.unwrap; if(uw) D.set('unwrap',1); const hf=process.env.HALF!==undefined?process.env.HALF==='1':!!meta.half; if(hf) D.set('half',1); if(meta.quarter&&process.env.HALF===undefined) D.set('quarter',1);   // UNWRAP=0/1 — разобрать иначе, чем играли
  const sh=(meta.tune&&meta.tune.shifts)||[], o=[]; let j=0;
  for(let k=0;k<Math.floor(x.length/N);k++){ while(j<sh.length&&sh[j][0]<=k){ D.shift(sh[j][1]); j++; } const r=D.frame(x.subarray(k*N,(k+1)*N)); if(r) o.push(Object.assign({k:k+1,t:(k+1)*N/SR},r)); }
  return o; }
function analyse(meta,x){ const rows=replay(meta,x), TU=tuneMod(), T={field:meta.tune?meta.tune.field:100};
  const mk=meta.marks||{}, tP=mk.play!==undefined?mk.play/SR:null, tO=mk.over!==undefined?mk.over/SR:x.length/SR;
  const fl=rows.filter(r=>tP!==null&&r.t>=tP&&r.t<tO), vis=fl.length?100*fl.filter(r=>r.present).length/fl.length:NaN;
  // ладонь в движении: скорость по сглаженной высоте (0,1 с) больше 20 мм/с
  const h=fl.filter(r=>r.present).map(r=>r.height), sm=[]; for(let i=0;i<h.length;i++){ let s=0,n=0; for(let j=Math.max(0,i-4);j<=Math.min(h.length-1,i+4);j++){ s+=h[j]; n++; } sm.push(s/n); }
  let mv=0; for(let i=1;i<sm.length;i++) if(Math.abs(sm[i]-sm[i-1])*SR/N>20) mv++; const moving=sm.length>1?100*mv/(sm.length-1):NaN;
  const log=meta.log||[], ev=log.filter(e=>typeof e[1]==='string'), st=log.filter(e=>typeof e[1]!=='string');
  const byK=new Map(rows.map(r=>[r.k,r])), dd=[]; st.forEach(s=>{ if(s[1]===null||!s[3]) return; const r=byK.get(s[0]); if(!r||!r.present) return; const L=meta.tune&&meta.tune.lin, fr=L?(()=>{ let x=L.fb+(L.ft-L.fb)*(r.height-L.b)/Math.max(30,L.t-L.b); if(L.soft&&x<L.fb) x=L.fb*Math.exp((x-L.fb)/L.fb); return Math.max(0,Math.min(1,x)); })():TU.fracOf(T,r.height);   /* 1.58z8: мягкое дно */ dd.push(Math.abs(fr-s[1]));   /* 1.58z2: ход по двум удержаниям */ }); dd.sort((a,b)=>a-b);
  const cnt=k=>ev.filter(e=>e[1]===k||e[1].startsWith(k+':')).length;
  /* жонглёр (1.57a): броски — сила (скорость мяча при отрыве, высот экрана в секунду) и что делала рука на взмахе: самая большая скорость
     ладони за 0,2 с до отрыва (по высоте через 3 кадра, мм/с) и видна ли ладонь вокруг броска — главный вопрос: успевает ли сонар за рывком */
  let jg=null; if(meta.game==='juggle'){ const fr=rows.filter(r=>tP!==null&&r.t>=tP&&r.t<tO), at=new Map(fr.map((r,i)=>[r.k,i]));
    const ts=ev.filter(e=>e[1].startsWith('toss:')).map(e=>({k:e[0],v:+e[1].split(':')[1]})), sp=[], vs=[]; let seen=0, all=0;
    ts.forEach(t=>{ let best=0; for(let k=t.k-19;k<=t.k+2;k++){ const i=at.get(k); if(i===undefined) continue; all++; if(fr[i].present) seen++;
        const j=at.get(k-3); if(j!==undefined&&fr[i].present&&fr[j].present){ const v=Math.abs(fr[i].height-fr[j].height)/(3*N/SR); if(v>best) best=v; } }
      sp.push(best); vs.push(t.v); });
    const md=a=>{ const q=[...a].sort((x,y)=>x-y); return q.length?q[q.length>>1]:NaN; };
    jg={tosses:ts.length,vMed:md(vs),vMax:vs.length?Math.max(...vs):NaN,handMed:md(sp),handMax:sp.length?Math.max(...sp):NaN,visFlick:all?100*seen/all:NaN,
      star:cnt('star'),burn:cnt('burn'),pop:cnt('pop'),ceil:cnt('ceil'),bounce:cnt('bounce')}; }
  return {game:meta.game,jg,field:T.field,vis,moving,dur:tP!==null?tO-tP:0,match:dd.length?dd[dd.length>>1]:NaN,n:dd.length,
    gate:cnt('gate'),miss:cnt('miss'),caught:cnt('catch'),boom:cnt('boom'),hit:cnt('hit'),crash:cnt('crash'),fuel:cnt('fuel'),grass:cnt('grass'),nofuel:cnt('nofuel'),wave:cnt('wave'),finish:cnt('finish')}; }
function report(name,meta,x){ const R=analyse(meta,x);
  console.log(`\n== ${name} == | ${meta.game} | ${meta.summary||''} | игра ${R.dur.toFixed(0)} с | зонд: запас ${meta.probe&&meta.probe.snr_db?meta.probe.snr_db.toFixed(1):'—'} дБ`);
  console.log(`  весь путь — ${R.field.toFixed(0)} мм хода ладони | ладонь видна ${R.vis.toFixed(1)}% | в движении ${R.moving.toFixed(0)}% времени | сверка доли высоты с телефоном ${(R.match*100).toFixed(2)}% (${R.n} кадров)`);
  const e=R.game==='slalom'?`ворот ${R.gate}, пропущено ${R.miss}${R.finish?', финиш':''}`:R.game==='bombs'?`поймано ${R.caught}, упущено ${R.miss}, волн пройдено ${R.wave}`:R.game==='juggle'&&R.jg?`звёзд ${R.jg.star}, бросков ${R.jg.tosses} (сила мяча: медиана ${R.jg.vMed.toFixed(2)}, самый сильный ${R.jg.vMax.toFixed(2)} высоты экрана/с), сгорело ${R.jg.burn}, ${R.jg.pop?'лопнуло '+R.jg.pop:'в потолок '+R.jg.ceil}\n  рука на взмахе: медиана ${(R.jg.handMed/10).toFixed(0)} см/с, самый резкий ${(R.jg.handMax/10).toFixed(0)} см/с; ладонь видна вокруг бросков ${R.jg.visFlick.toFixed(1)}%`:R.game==='race'?`аварий ${R.crash}, канистр ${R.fuel}, вылетов на траву ${R.grass}${R.nofuel?', бензин кончился':''}`:`ударов о стены ${R.hit}`;
  console.log('  '+e); return R; }
module.exports={analyse,report};
if(require.main===module){ for(const f of process.argv.slice(2)){ const {meta,x}=C.loadWav(f); if(!meta||meta.kind!=='arc-play'){ console.log(`\n== ${path.basename(f)} == не запись экшн-прототипа (kind ${meta&&meta.kind})`); continue; } report(path.basename(f),meta,x); } }
