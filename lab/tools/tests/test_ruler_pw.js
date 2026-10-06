/* СонарЛинк, «Линейка» (1.56o): две страницы лабы через настоящий сервер — «Рядом», одна программа по общим часам (отметки 5…25 см, волны),
   управление пальцем (?mouse=1), программа ускорена (?rscale=0.08). Мышь ставит «ладонь» на долю экрана по отметке — одинаково на обеих.
   Проверяет: оба дошли до конца, программа одна (одно начало, одни шаги), журналы читаются, разбор: доли на отметках у обоих одинаковые
   и растут с высотой; «Один телефон» тоже доходит до конца. Без playwright — пропуск. Запуск: node tests/test_ruler_pw.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('нет playwright — пропуск'); console.log('ИТОГ: ok'); process.exit(0); }
const http=require('http'), fs=require('fs'), path=require('path'), os=require('os');
const LAB=path.join(__dirname,'..','..','app','sonar_lab3.html'), OUT=path.join(__dirname,'..','out');
(async()=>{ let bad=0; const need=(ok,msg)=>{ console.log((ok?'ok  ':'FAIL')+'  '+msg); if(!ok) bad++; };
  const st=http.createServer((q,r)=>{ r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}); r.end(fs.readFileSync(LAB)); }); await new Promise(r=>st.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+st.address().port; process.env.ORIGINS=origin; process.env.DB=path.join(os.tmpdir(),'rl_'+process.pid+'.db');
  const {server}=require('../../../server/server.js'); await new Promise(r=>server.listen(0,'127.0.0.1',r)); const api='http://127.0.0.1:'+server.address().port;
  const b=await chromium.launch(); const url=origin+'/?mouse=1&rscale=0.08&api='+encodeURIComponent(api); const errs=[];
  const A=await b.newPage({viewport:{width:844,height:390}}), B=await b.newPage({viewport:{width:844,height:390}}); [A,B].forEach(p=>p.on('pageerror',e=>errs.push(e.message)));
  const S=p=>p.evaluate(()=>{ const s=window.__sl(); return {phase:s.phase,code:s.code,rs:s.rs?s.rs.map(x=>[x.k,x.cm,x.t0,x.t1]):null,T0:s.T0,mode:s.mode,half:s.half}; });
  for(const p of [A,B]){ await p.goto(url); await p.click('#goLink'); await p.click('#lkRuler'); }
  await A.click('#rlNear'); let a; for(let i=0;i<50;i++){ a=await S(A); if(a.code) break; await A.waitForTimeout(100); } await B.click('#rlNear');
  let bb; for(let i=0;i<80;i++){ a=await S(A); bb=await S(B); if(a.phase==='ruler'&&bb.phase==='ruler') break; await A.waitForTimeout(100); }
  need(a.phase==='ruler'&&bb.phase==='ruler'&&a.mode==='ruler'&&bb.mode==='ruler','оба в «линейке» (комната '+a.code+')');
  need(a.T0===bb.T0&&JSON.stringify(a.rs)===JSON.stringify(bb.rs)&&a.rs.length===24,'одна программа: одно начало, '+(a.rs?a.rs.length:0)+' шагов');
  /* «ладонь» по программе: доля = 0.05 + 0.9·(см−5)/20; волна — синус */
  const yOf=f=>390*(1-(0.08+f*(1-0.16)));
  for(let i=0;i<200;i++){ const now=await A.evaluate(()=>Date.now()+(window.__sl().off||0)); const s=a.rs.find(x=>now>=x[2]&&now<x[3])||a.rs[0];
    const f=s[0]==='wave'?0.5+0.4*Math.sin(now/300):s[1]!==null&&s[1]!==undefined?0.05+0.9*(s[1]-5)/20:0.5; await A.mouse.move(400,yOf(f)); await B.mouse.move(400,yOf(f)); await A.waitForTimeout(40);
    if(i%10===0){ a=await S(A); bb=await S(B); if(a.phase==='over'&&bb.phase==='over') break; } }
  need(a.phase==='over'&&bb.phase==='over','оба дошли до конца');
  const logOf=async(p,name)=>{ const b64=await p.evaluate(async()=>{ const b=window.__slLog(), u=new Uint8Array(await b.arrayBuffer()); let s=''; for(let i=0;i<u.length;i+=8192) s+=String.fromCharCode.apply(null,u.subarray(i,i+8192)); return btoa(s); });
    const f=path.join(OUT,name); fs.writeFileSync(f,Buffer.from(b64,'base64')); return f; };
  try{ fs.mkdirSync(OUT,{recursive:true}); }catch(e){}
  const fA=await logOf(A,'ruler_L.wav'), fB=await logOf(B,'ruler_R.wav'); let R=null; try{ R=require('../eval_ruler.js').analyze([fA,fB]); }catch(e){ console.log(e.stack); }
  need(R&&R.pair,'журналы читаются, разбор пары есть'); if(R){ console.log(R.lines.map(l=>'      '+l).join('\n'));
    const rows=R.pair.rows, d=rows.map(r=>Math.abs(r.b.frac-r.a.frac)), up=rows.slice(0,5).map(r=>r.a.frac);
    need(d.every(x=>x<0.03),'на отметках доли у обоих одинаковые (до 3%): худшее '+(100*Math.max(...d)).toFixed(1)+'%');
    need(up.every((x,i)=>i===0||x>up[i-1]+0.1),'доля растёт с высотой: '+up.map(x=>(100*x).toFixed(0)).join(' → ')+'%'); }
  /* один телефон */
  const C=await b.newPage({viewport:{width:844,height:390}}); C.on('pageerror',e=>errs.push(e.message)); await C.goto(url); await C.click('#goLink'); await C.click('#lkRuler'); await C.click('#rlSolo');
  let c; for(let i=0;i<150;i++){ await C.waitForTimeout(100); c=await S(C); if(c.phase==='over') break; }
  need(c.phase==='over'&&c.mode==='ruler','один телефон: до конца');
  await C.click('#slOut'); const back=await C.evaluate(()=>!document.getElementById('rulIntro').classList.contains('hidden')); need(back,'«Выйти» — к экрану «Линейки»');
  /* 1.56q: «Калибровка кулаком по линейке» — проходит программу (5, 10, 15, 10, 5 см) и заканчивается; пальцем кулака нет — «Не вышло», таблица не пишется */
  const K=await b.newPage({viewport:{width:844,height:390}}); K.on('pageerror',e=>errs.push(e.message)); await K.goto(url+'&tab=1');   /* 1.56s: кнопка калибровки кулаком — только с ?tab=1 */ await K.click('#goLink'); await K.click('#lkString');
  const lbl=await K.evaluate(()=>document.getElementById('siTab').textContent); await K.click('#siTab'); let k;
  for(let i=0;i<120;i++){ await K.waitForTimeout(100); k=await S(K); if(k.phase==='over') break; }
  const say=await K.evaluate(()=>[document.getElementById('slSay').textContent,localStorage.getItem('sonar_sl_tab'),window.__sl().rs?window.__sl().rs.length:0]);
  need(k.phase==='over'&&k.mode==='calib'&&say[2]===10&&say[0]==='Не вышло'&&!say[1]&&/один раз/.test(lbl),'калибровка кулаком: 10 шагов, без сонара — «Не вышло», таблица не записана');
  need(!errs.length,'без ошибок страницы'+(errs.length?': '+errs.join('; '):''));
  await b.close(); server.closeAllConnections&&server.closeAllConnections(); server.close(); st.close(); try{ fs.unlinkSync(process.env.DB); }catch(e){}
  console.log(bad?'ИТОГ: ПРОВАЛ':'ИТОГ: ok'); process.exit(bad?1:0); })();
