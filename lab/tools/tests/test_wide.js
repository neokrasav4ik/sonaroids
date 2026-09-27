/* Широкий зонд для записей по метке (27.09, 0.39t): синтетическая «Запись для меня» широким зондом 16–20,5 кГц (ладонь идёт по сценарию:
   пусто, 100 мм, 100 ± 50 мм синусоида, держит, убрана) разбирается eval_recording.js дважды — как широкая и (--narrow) как узкая
   полоса игры внутри неё. Обе должны идти за меткой (фазы зонда для узкой — от широкого, common.makeDSP sub); без этой поправки узкая
   ломается. Плюс: в собранной лабе есть переключатель зонда для записей и проверка писка. */
const C=require('../common'), S=require('../eval_right'), fs=require('fs'), path=require('path'), cp=require('child_process');
let bad=0; const need=(ok,msg)=>{ console.log((ok?'ok  ':'FAIL')+'  '+msg); if(!ok) bad++; };
const SR=48000, N=512, F=Math.floor(16*SR/N), x=new Float32Array(F*N);
const H=t=>t<3?null:t<5?100:t<11?100+50*Math.sin(2*Math.PI*(t-5)/6):t<14?100:null;
for(let f=0;f<F;f++){ const t=f*N/SR, h=H(t); x.set(S.synthMulti(h===null?[]:[{d:h,a:0.25},{d:h+8,a:0.1},{d:h-6,a:0.08}],f*7+1,[16000,20500]),f*N); }
function wavOut(file,meta,x){ let txt=Buffer.from(JSON.stringify(meta),'utf8'); if(txt.length%2) txt=Buffer.concat([txt,Buffer.from(' ')]);
  const info=Buffer.concat([Buffer.from('INFO'),Buffer.from('ICMT'),u32(txt.length),txt]), fmt=Buffer.alloc(18); fmt.writeUInt16LE(3,0); fmt.writeUInt16LE(1,2); fmt.writeUInt32LE(SR,4); fmt.writeUInt32LE(SR*4,8); fmt.writeUInt16LE(4,12); fmt.writeUInt16LE(32,14);
  const data=Buffer.from(x.buffer), body=Buffer.concat([Buffer.from('WAVE'),Buffer.from('fmt '),u32(18),fmt,Buffer.from('LIST'),u32(info.length),info,Buffer.from('data'),u32(data.length),data]);
  fs.writeFileSync(file,Buffer.concat([Buffer.from('RIFF'),u32(body.length),body])); function u32(v){ const b=Buffer.alloc(4); b.writeUInt32LE(v); return b; } }
fs.mkdirSync(C.OUT,{recursive:true}); const f=path.join(C.OUT,'wide_rec_test.wav'); wavOut(f,{kind:'single-landscape',probe:{f_lo:16000,f_hi:20500}},x);
const run=a=>cp.execFileSync('node',[path.join(__dirname,'..','eval_recording.js'),'--phys'].concat(a,[f]),{encoding:'utf8'});
const shp=o=>{ const m=o.match(/по форме: ([\d.]+)/); return m?+m[1]:0; };
const w=run([]), n=run(['--narrow']); console.log(w.split('\n').filter(l=>/по форме|полоса/.test(l)).join('\n')); console.log(n.split('\n').filter(l=>/по форме|полоса/.test(l)).join('\n'));
need(shp(w)>0.97,`широкая полоса идёт за меткой: по форме ${shp(w)}`);
need(shp(n)>0.97,`узкая полоса из той же записи тоже: по форме ${shp(n)}`);
const js=C.appJs(); need(/sonar_probe_wide/.test(js)&&/id="pwNarrow"/.test(C.appHtml()),'в лабе: переключатель зонда для записей и проверка писка');
console.log(bad?'ИТОГ: ПРОВАЛ':'ИТОГ: ok'); process.exitCode=bad?1:0;
