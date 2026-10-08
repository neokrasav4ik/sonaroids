// 1.58q: replays the waving phase of a lab recording with the old and the soft (opt.soft) tuning, prints the last shift before the catch. node lab/tools/sim/tune_start.js file.wav lab/tools
const path=require('path'); const TD=process.argv[3]; const C=require(path.join(TD,'common')); const Tune=require(path.join(TD,'..','..','src','12_tune.js'));
const {meta,x}=C.loadWav(process.argv[2]); const SR=48000,N=512; const kw=Math.round(meta.marks.wave/N);
for(const soft of [false,true]){ const D=C.makeDSP(C.bandOf(meta)); D.init(SR,meta.probe&&(meta.probe.bins===0||meta.probe.bins===1)?meta.probe.bins:'all'); D.setCal(meta.cal); D.set('autocenter',1); if(meta.quarter) D.set('quarter',1);
  const T=Tune.create(100,true,{soft}); const sh=[]; let caught=null;
  for(let k=0;k<Math.floor(x.length/N);k++){ const r=D.frame(x.subarray(k*N,(k+1)*N)); if(k<kw||!r) continue;
    Tune.step(T,N/SR,{present:r.present,height:r.height},true,d=>{ D.shift(d); sh.push([k,+d.toFixed(1),+T.field.toFixed(0)]); }); if(T.ok){ caught=k; break; } }
  const last=sh[sh.length-1]; console.log(soft?'мягкая  ':'как было','поймал через',((caught-kw)*N/SR).toFixed(1),'с; последний сдвиг',last&&last[1],'мм; ход',T.field.toFixed(0),'мм; сдвиги:',sh.slice(-6).map(q=>q[1]+'/'+q[2]).join(' ')); }
