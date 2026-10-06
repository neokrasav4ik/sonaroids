/* СонарЛинк, «Струна» (1.56l): прогон звука из журнала партии той же обработкой лабы (lab/src/02_dsp.js), с теми же тонами и полосой, что
   на телефоне, — с какого кадра она работала («уровень»). Сравнивает «как было» с удержанием уровня пустой комнаты (holdfloor) с разных
   моментов. На журнале iPhone 06.10 18:51 «как было» повторяет телефон кадр в кадр (видна 68%, потерь 46); с удержанием с «Помаши» — 100%, 0.
   Запуск: node replay_string.js журнал.wav */
const E=require('./eval_string.js'), fs=require('fs'), path=require('path');
const SRC=fs.readFileSync(path.join(__dirname,'..','src','02_dsp.js'),'utf8');
function replay(file){ const L=E.load(file), x=L.x, f0=L.meta.first_frame, out=[];
  if(!x||!x.length) return {file,lines:['звука в журнале нет']};
  const evF=k=>{ const e=L.audioEv.find(a=>String(a[1]).startsWith(k)); return e?e[0]:null; };
  const g=L.g.game.filter(r=>r[3]===4); if(!g.length) return {file,lines:['раунда в журнале нет']};
  const pf0=g[0][2], pf1=g[g.length-1][2], fStart=evF('уровень'), fProc=evF('обработка'), fWave=evF('пустая комната запомнена');
  const logged=L.dsp.filter(a=>a[0]>=pf0&&a[0]<=pf1), lp=logged.filter(a=>a[1]).length/(logged.length||1);
  out.push(`${path.basename(file)}: на телефоне ладонь видна ${(100*lp).toFixed(0)}% кадров раунда${fWave!==null?' (уровень держался с «Помаши»)':''}`);
  const variants=[['как было',fWave],['держать с «Помаши» (обработка + 0,5 с)',fProc===null?null:fProc+Math.round(0.5*L.meta.fs/512)],['держать с начала раунда',pf0],['не держать',null]];
  const res={};
  for(const [name,fh] of variants){ const D=new Function(SRC+'\nreturn DSP2;')(); D.set('flo',L.meta.probe.f_lo!==18300?L.meta.probe.f_lo:null); D.init(L.meta.fs,L.meta.probe.bins); D.set('autocenter',1);
    let pres=0,n=0,lost=0,prev=null; const fl=[];
    for(let k=0;k<Math.floor(x.length/512);k++){ const fr=f0+k; if(fStart!==null&&fr<=fStart) continue; if(fh!==null&&fr===fh) D.set('holdfloor',1);
      const r=D.frame(x.subarray(k*512,(k+1)*512)); if(!r||fr<pf0||fr>pf1) continue; n++; if(r.present) pres++; if(prev===true&&!r.present) lost++; prev=r.present; if(n%940===1) fl.push(r.floor===null?'—':r.floor.toFixed(1)); }
    res[name]={seen:pres/(n||1),lost}; out.push(`  ${name}: видна ${(100*pres/(n||1)).toFixed(0)}%, пропадала ${lost} раз; пустая комната по 10 с: ${fl.join(' ')} дБ`); }
  return {file,lines:out,res}; }
module.exports={replay};
if(require.main===module){ const fl=process.argv.slice(2); if(!fl.length){ console.log('node replay_string.js журнал.wav ...'); process.exit(2); } for(const f of fl) console.log(replay(f).lines.join('\n')); }
