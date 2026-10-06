/* СонарЛинк, «Струна» (1.56h): разбор журналов партии. У каждого телефона свой журнал (кнопка «Сохранить журнал» после раунда):
   звук микрофона, числа обработки, каждый шаг игры, отправленные и полученные высоты, пинги, события. Один журнал — отчёт по телефону;
   два (с обоих телефонов одной партии) — ещё и синхронизация: сходятся ли часы, доходят ли высоты ладони и с какой задержкой, видит ли
   каждый вихрь напарника там, где тот на самом деле, одинаковые ли у них поле, события, резонанс и счёт.
   Запуск: node eval_string.js журнал_L.wav [журнал_R.wav] [--json]
   Как модуль: require('./eval_string').analyze([файлы]) → {phones, pair, lines, ok} */
const C=require('./common'), fs=require('fs'), path=require('path');
/* положение предмета и струна — та же функция, что в игре (берётся из исходника лабы) */
const SRC=fs.readFileSync(path.join(__dirname,'..','src','093_string.js'),'utf8');
function grab(name){ const i=SRC.indexOf('function '+name+'('); if(i<0) throw new Error('нет '+name); let d=0, j=SRC.indexOf('{',i);
  for(;j<SRC.length;j++){ if(SRC[j]==='{') d++; else if(SRC[j]==='}'&&--d===0) break; } return SRC.slice(i,j+1); }
const G=new Function('var SL_UL=0.085, SL_UR=0.915;\n'+grab('slPos')+'\n'+grab('slStr')+'\nreturn {slPos:slPos,slStr:slStr};')();

const med=a=>{ if(!a.length) return NaN; const s=[...a].sort((x,y)=>x-y); return s[s.length>>1]; };
const pct=(a,q)=>{ if(!a.length) return NaN; const s=[...a].sort((x,y)=>x-y); return s[Math.min(s.length-1,Math.floor(s.length*q))]; };
const f0=x=>Number.isFinite(x)?x.toFixed(0):'—', f1=x=>Number.isFinite(x)?x.toFixed(1):'—', pc=x=>Number.isFinite(x)?(100*x).toFixed(0)+'%':'—';
const COL={ms:0,srv:1,f:2,ph:3,t:4,palm:5,frac:6,dist:7,hy:8,hp:9,pv:10,vL:11,vR:12,res:13,cut:14,align:15,score:16,got:17,cuts:18,burned:19,lag:20,direct:21};

function load(file){ const w=C.loadWav(file); if(!w.meta||w.meta.kind!=='string-log'||!w.glog||!w.glog.string) throw new Error(file+': это не журнал «Струны»');
  const m=w.meta, s=m.string, g=w.glog.string; return {file:path.basename(file),meta:m,s,g,dsp:w.glog.dsp||[],audioEv:w.glog.events||[],x:w.x}; }
/* значение столбца в момент srv (общие часы) — линейно между соседними шагами */
function at(rows,col,srv){ let lo=0, hi=rows.length-1; if(hi<0||srv<rows[0][1]||srv>rows[hi][1]) return null;
  while(hi-lo>1){ const m=(lo+hi)>>1; if(rows[m][1]<=srv) lo=m; else hi=m; }
  const a=rows[lo], b=rows[hi], va=a[col], vb=b[col]; if(va===null||vb===null) return va===null?vb:va; const w=b[1]>a[1]?(srv-a[1])/(b[1]-a[1]):0; return va+(vb-va)*w; }

/* ── один телефон ── */
function phone(L){ const s=L.s, g=L.g, out={file:L.file,half:s.half,side:s.side,bot:s.bot,lines:[]}, P=t=>out.lines.push(t);
  const play=g.game.filter(r=>r[COL.ph]===4);
  P(`${L.file}: ${s.bot?'один телефон с ботом':'сторона '+s.side+', '+(s.half==='L'?'левая':'правая')+' половина'}${s.half_swapped?' (взял другую — телефоны лежали одинаково)':''}, тоны ${s.tones===0?'чётные':s.tones===1?'нечётные':'все'}, управление ${s.control==='touch'?'палец':'ладонь'}`);
  P(`  связь: ${s.bot?'—':(s.near?'«рядом»':'код '+s.code)+', в конце '+(s.direct_now?'напрямую':'через сервер')+', пинг напрямую '+f0(s.rtt_direct_ms)+' мс, через сервер '+f0(s.rtt_server_ms)+' мс; часы: сдвиг к серверу '+f0(s.clock_off_ms)+' мс (по запросу '+f0(s.clock_rtt_ms)+' мс)'}`);
  const offs=g.off.map(r=>r[1]); if(offs.length>1) P(`  оценки часов: ${offs.length}, разброс ${f0(Math.max(...offs)-Math.min(...offs))} мс`);
  if(s.cal_me||s.cal_peer) P(`  калибровка (${s.cal_mode==='own'?'своя':'общая'}): моя середина ${f1(s.cal_me&&s.cal_me.r)} мм, поле ${f1(s.cal_me&&s.cal_me.f)}; напарника ${f1(s.cal_peer&&s.cal_peer.r)} мм, ${f1(s.cal_peer&&s.cal_peer.f)}; итог поле ${f1(s.field)}`);
  P(`  раунд: зерно ${s.seed}, предметов ${g.objs.length}, раундов в журнале ${g.rounds.length}; итог: счёт ${s.result.score}, частиц ${s.result.got}, сожжено ${s.result.burned}, обрывов ${s.result.cuts}`);
  if(play.length){ const dur=(play[play.length-1][COL.ms]-play[0][COL.ms])/1000, palm=play.filter(r=>r[COL.palm]).length/play.length;
    const fr=play.filter(r=>r[COL.palm]&&r[COL.frac]!==null).map(r=>r[COL.frac]);
    const steps=play.slice(1).map((r,i)=>r[COL.ms]-play[i][COL.ms]);
    out.palm=palm; out.fps=play.length/dur;
    P(`  ладонь в раунде: видна ${pc(palm)} времени, высота (доля поля) 5–95%: ${f1(100*pct(fr,0.05))}–${f1(100*pct(fr,0.95))}%; шаг игры ${f1(med(steps))} мс (самый долгий ${f0(Math.max(...steps))} мс)`);
    const lost=[]; for(let i=1;i<play.length;i++) if(play[i-1][COL.palm]&&!play[i][COL.palm]) lost.push(play[i][COL.t]); P(`  ладонь пропадала ${lost.length} раз${lost.length?': '+lost.slice(0,12).map(t=>t.toFixed(1)+' с').join(', ')+(lost.length>12?'…':''):''}`); }
  if(!s.bot){ const sec=g.tx.length>1?(g.tx[g.tx.length-1][0]-g.tx[0][0])/1000:0, rsec=g.rx.length>1?(g.rx[g.rx.length-1][0]-g.rx[0][0])/1000:0;
    const gaps=g.rx.slice(1).map((r,i)=>r[0]-g.rx[i][0]), lat=g.rx.map(r=>r[1]-r[3]);
    const byVia=v=>g.rx.filter(r=>r[5]===v).length;
    out.rxMaxGap=gaps.length?Math.max(...gaps):NaN;
    P(`  высоты: отправлено ${g.tx.length} (${f1(g.tx.length/(sec||1))}/с), получено ${g.rx.length} (${f1(g.rx.length/(rsec||1))}/с; напрямую ${byVia('d')}, через сервер ${byVia('s')}); самая долгая пауза в получении ${f0(out.rxMaxGap)} мс`);
    P(`  в пути (часы получателя − метка отправителя): медиана ${f0(med(lat))} мс, 90% ${f0(pct(lat,0.9))} мс`); }
  const dp=L.dsp; if(dp.length){ const pres=dp.filter(r=>r[1]).length/dp.length; P(`  сонар: кадров обработки ${dp.length}, ладонь видна в ${pc(pres)} кадров, звука в журнале ${f0(L.x?L.x.length/L.meta.fs:0)} с${L.meta.gaps?', пропусков звука '+L.meta.gaps:''}${L.meta.clipped?', перегруз '+L.meta.clipped+' отсчётов':''}`); }
  else P(`  сонар: ${s.control==='touch'?'не было (палец)':'чисел обработки нет'}${L.x&&L.x.length?', звука в журнале '+f1(L.x.length/L.meta.fs)+' с':''}`);
  /* поведение игры: у решившего зазор до струны должен быть меньше порога */
  const bad=[]; for(const e of g.events){ const k=e[4], d=e[5]; if(!d||d.dv===undefined||d.dv===null) continue;
    if(k==='взял частицу'&&d.dv>((d.rs!==undefined?d.rs:d.res>0.5)?0.11:0.05)+0.005) bad.push(`${e[3].toFixed(1)} с: частица ${d.k} взята за ${f1(100*d.dv)}% от струны`);
    if((k==='сжёг кляксу'||k==='обрыв (клякса)')&&d.dv>0.045+0.005) bad.push(`${e[3].toFixed(1)} с: клякса ${d.k} задела за ${f1(100*d.dv)}% от струны`);
    if(['взял частицу','сжёг кляксу','обрыв (клякса)'].includes(k)&&!s.bot&&d.half!==s.half) bad.push(`${e[3].toFixed(1)} с: решил за чужую половину (предмет ${d.k})`); }
  out.bad=bad; P(bad.length?`  СТРАННО в решениях (${bad.length}): `+bad.slice(0,6).join('; '):'  решения о касаниях: все в пределах порога и на своей половине');
  return out; }

/* ── пара: два телефона одной партии ── */
function pair(A,B){ const out={lines:[],flags:[]}, P=t=>out.lines.push(t), F=t=>{ out.flags.push(t); P('  ! '+t); };
  if(A.s.half==='R'&&B.s.half==='L') [A,B]=[B,A];
  P(`ПАРА: ${A.file} (${A.s.half}) + ${B.file} (${B.s.half})`);
  if(A.s.code!==B.s.code) F(`разные комнаты: ${A.s.code} и ${B.s.code} — это не одна партия?`);
  if(A.s.half===B.s.half) F('обе половины одинаковые ('+A.s.half+')');
  if(A.s.tones===B.s.tones) F('одинаковые тоны зонда — телефоны мешают друг другу');
  /* раунды: одно зерно, один старт */
  const rA=A.g.rounds, rB=B.g.rounds, nR=Math.min(rA.length,rB.length);
  for(let i=0;i<nR;i++){ const same=rA[i].seed===rB[i].seed&&rA[i].T0===rB[i].T0&&JSON.stringify(rA[i].objs.map(o=>o.slice(0,8).concat(o.slice(9))))===JSON.stringify(rB[i].objs.map(o=>o.slice(0,8).concat(o.slice(9))));
    P(`  раунд ${i+1}: ${same?'поле одинаковое (зерно '+rA[i].seed+', старт по общим часам '+rA[i].T0+')':'ПОЛЕ РАЗНОЕ'}`); if(!same) F('раунд '+(i+1)+': разное поле'); }
  if(rA.length!==rB.length) F(`раундов в журналах: ${rA.length} и ${rB.length}`);
  /* общая калибровка: моя у одного = напарника у другого, итог один */
  if(A.s.cal_mode==='shared'&&A.s.cal_me&&B.s.cal_me){ const cross=A.s.cal_peer&&B.s.cal_peer&&A.s.cal_peer.r===B.s.cal_me.r&&B.s.cal_peer.r===A.s.cal_me.r;
    P(`  калибровка: ${cross?'обменялись':'НЕ обменялись'}; итог поле ${f1(A.s.field)} / ${f1(B.s.field)}, середины ${f1(A.s.cal_me.r)} и ${f1(B.s.cal_me.r)} мм`); if(!cross) F('калибровками не обменялись'); else if(Math.abs(A.s.field-B.s.field)>0.5) F('поле разное после общей калибровки'); }
  /* высоты: что ушло от одного — пришло ли к другому, за сколько; часы — по разнице двух направлений */
  const dir=(X,Y)=>{ const rx=new Map(Y.g.rx.map(r=>[r[3]+'|'+r[4],r])); let got=0; const d=[], dv={d:[],s:[]};
    for(const t of X.g.tx){ const r=rx.get(t[1]+'|'+t[2]); if(r){ got++; d.push(r[1]-t[1]); dv[r[5]].push(r[1]-t[1]); } }
    return {sent:X.g.tx.length,got,loss:X.g.tx.length?1-got/X.g.tx.length:NaN,d,med:med(d),p90:pct(d,0.9),dmed:med(dv.d),smed:med(dv.s),nd:dv.d.length,ns:dv.s.length}; };
  const ab=dir(A,B), ba=dir(B,A); out.ab=ab; out.ba=ba;
  P(`  высоты ${A.s.half}→${B.s.half}: дошло ${ab.got} из ${ab.sent} (${pc(1-ab.loss)}), в пути медиана ${f0(ab.med)} мс, 90% ${f0(ab.p90)} мс (напрямую ${ab.nd} шт., ${f0(ab.dmed)} мс; через сервер ${ab.ns} шт., ${f0(ab.smed)} мс)`);
  P(`  высоты ${B.s.half}→${A.s.half}: дошло ${ba.got} из ${ba.sent} (${pc(1-ba.loss)}), в пути медиана ${f0(ba.med)} мс, 90% ${f0(ba.p90)} мс (напрямую ${ba.nd} шт., ${f0(ba.dmed)} мс; через сервер ${ba.ns} шт., ${f0(ba.smed)} мс)`);
  out.clock=(ab.med-ba.med)/2; P(`  часы: по разнице направлений общие часы ${B.s.half} ${out.clock>=0?'впереди':'позади'} ${A.s.half} на ~${f0(Math.abs(out.clock))} мс (честный путь в одну сторону ~${f0((ab.med+ba.med)/2)} мс)`);
  if(Math.abs(out.clock)>40) F(`часы телефонов расходятся на ~${f0(Math.abs(out.clock))} мс — старт и предметы у них сдвинуты на столько же`);
  if(ab.loss>0.05||ba.loss>0.05) F(`теряются высоты: ${pc(ab.loss)} / ${pc(ba.loss)}`);
  /* синхронизация расстояний: где вихрь у хозяина (его v) и где его видит напарник (pv) — в одно и то же общее время */
  const vis=(X,Y)=>{ const own=X.g.game.filter(r=>r[COL.ph]===4&&r[COL.hy]!==null), seen=Y.g.game.filter(r=>r[COL.ph]===4&&r[COL.pv]!==null); if(own.length<10||seen.length<10) return null;
    const err=lag=>{ const e=[]; for(const r of seen){ const v=at(own,COL.hy,r[COL.srv]-lag-out.clockAdj(X,Y)); if(v!==null) e.push(Math.abs(r[COL.pv]-v)); } return e; };
    let best={lag:0,m:1e9}; for(let lag=-100;lag<=600;lag+=10){ const e=err(lag); if(e.length>20){ const m=e.reduce((a,b)=>a+b,0)/e.length; if(m<best.m) best={lag,m}; } }
    const e0=err(0), eb=err(best.lag);
    /* сколько вихрь ходит сам — чтобы понимать, велика ли ошибка */
    const hv=own.map(r=>r[COL.hy]); return {lag:best.lag,now:med(e0),now90:pct(e0,0.9),best:med(eb),best90:pct(eb,0.9),span:pct(hv,0.95)-pct(hv,0.05)}; };
  /* поправка часов: у Y общие часы отстают от X на clock (если A→B) — для сравнения в одном времени */
  out.clockAdj=(X,Y)=>Number.isFinite(out.clock)?(X===A?out.clock:-out.clock):0;
  for(const [X,Y] of [[A,B],[B,A]]){ const v=vis(X,Y); if(!v){ P(`  вихрь ${X.s.half} на экране ${Y.s.half}: мало данных`); continue; }
    out['vis'+X.s.half]=v;
    P(`  вихрь ${X.s.half} на экране ${Y.s.half}: отстаёт на ~${v.lag} мс; расхождение в тот же миг — медиана ${f1(100*v.now)}% высоты экрана (90%: ${f1(100*v.now90)}%), с учётом отставания ${f1(100*v.best)}% (вихрь ходит в пределах ${f0(100*v.span)}%)`);
    if(v.lag>250) F(`вихрь ${X.s.half} у напарника отстаёт на ${v.lag} мс — заметно глазом`);
    if(v.best>0.05) F(`вихрь ${X.s.half} у напарника не там, где у хозяина, даже с учётом задержки (${f1(100*v.best)}%)`); }
  /* резонанс: оба ли видят вихри на одной высоте в одно и то же время */
  { const ga=A.g.game.filter(r=>r[COL.ph]===4); let both=0, onlyA=0, onlyB=0, n=0;
    for(const r of ga){ const srvB=r[COL.srv]+out.clockAdj(A,B); const vl=at(B.g.game,COL.vL,srvB), vr=at(B.g.game,COL.vR,srvB); if(vl===null||vr===null) continue; n++;
      const ra=Math.abs(r[COL.vL]-r[COL.vR])<0.05, rb=Math.abs(vl-vr)<0.05; if(ra&&rb) both++; else if(ra) onlyA++; else if(rb) onlyB++; }
    out.res={n,both,onlyA,onlyB}; P(`  резонанс: у обоих ${pc(both/(n||1))} времени, только у ${A.s.half} ${pc(onlyA/(n||1))}, только у ${B.s.half} ${pc(onlyB/(n||1))}`);
    if(n&&(onlyA+onlyB)/n>0.05&&(onlyA+onlyB)>both) F('резонанс у телефонов часто разный'); }
  /* события: каждый взятый предмет — у обоих, с одинаковыми очками; решал тот, на чьей половине */
  const evs=X=>{ const m=new Map(); for(const e of X.g.events){ const k=e[4], d=e[5]; if(!d||d.k===undefined) continue; const kind=/частиц/.test(k)?'got':/сжёг/.test(k)?'burn':/обрыв/.test(k)?'cut':null; if(!kind) continue;
      const mine=!/напарник/.test(k), key=kind+':'+d.k; if(!m.has(key)) m.set(key,{kind,k:d.k,mine,srv:e[1],t:e[3],p:d.p,dv:d.dv,half:d.half}); } return m; };
  const eA=evs(A), eB=evs(B), keys=new Set([...eA.keys(),...eB.keys()]); let agree=0; const only=[], who=[], pts=[], late=[], dvO=[];
  for(const key of keys){ const a=eA.get(key), b=eB.get(key); if(!a||!b){ only.push(key+(a?' только у '+A.s.half:' только у '+B.s.half)); continue; }
    if(a.mine===b.mine) who.push(key+(a.mine?' решили оба':' не решил никто')); else agree++;
    if(a.kind!=='cut'&&a.p!==b.p) pts.push(key+' очки '+a.p+'/'+b.p);
    const dec=a.mine?a:b, oth=a.mine?b:a; late.push(oth.srv-dec.srv-(a.mine?out.clockAdj(A,B):out.clockAdj(B,A))); if(oth.dv!==null&&oth.dv!==undefined) dvO.push(oth.dv); }
  out.events={n:keys.size,agree,only,who,pts};
  P(`  события: ${keys.size} (взято/сожжено/обрывы), совпали у обоих ${agree}; дошли до напарника за медиану ${f0(med(late))} мс; у напарника в этот миг зазор до струны медиана ${f1(100*med(dvO))}% (90%: ${f1(100*pct(dvO,0.9))}%)`);
  if(only.length) F(`событие только у одного (${only.length}): ${only.slice(0,6).join(', ')}`);
  if(who.length) F(`спорные решения (${who.length}): ${who.slice(0,6).join(', ')}`);
  if(pts.length) F(`разные очки (${pts.length}): ${pts.slice(0,6).join(', ')}`);
  const sa=A.s.result, sb=B.s.result, same=sa.score===sb.score&&sa.got===sb.got&&sa.burned===sb.burned&&sa.cuts===sb.cuts;
  P(`  итог: ${A.s.half} счёт ${sa.score}, частиц ${sa.got}, сожжено ${sa.burned}, обрывов ${sa.cuts} · ${B.s.half} ${sb.score}, ${sb.got}, ${sb.burned}, ${sb.cuts} — ${same?'одинаково':'РАЗНЫЙ'}`);
  if(!same) F('итог разный');
  delete out.clockAdj; return out; }

function analyze(files){ const L=files.map(load), phones=L.map(phone), lines=[]; phones.forEach(p=>lines.push(...p.lines,''));
  let pr=null; if(L.length>=2){ pr=pair(L[0],L[1]); lines.push(...pr.lines); lines.push(pr.flags.length?`ВЫВОД: синхронизация с замечаниями (${pr.flags.length}) — см. «!» выше`:'ВЫВОД: синхронизация в порядке — часы, высоты, поле, события и счёт сходятся'); }
  const ok=phones.every(p=>!p.bad.length)&&(!pr||!pr.flags.length); return {phones,pair:pr,lines,ok}; }
module.exports={analyze,load};
if(require.main===module){ const args=process.argv.slice(2), files=args.filter(a=>!a.startsWith('--'));
  if(!files.length){ console.log('node eval_string.js журнал1.wav [журнал2.wav] [--json]'); process.exit(2); }
  const r=analyze(files); if(args.includes('--json')) console.log(JSON.stringify({phones:r.phones,pair:r.pair,ok:r.ok},null,1)); else console.log(r.lines.join('\n')); }
