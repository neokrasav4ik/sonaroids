/* СонарЛинк, «Струна» (06.10, 1.56c): две страницы лабы в Chromium связаны через настоящий сервер (server/pair.js) — комната, код,
   вход по коду; управление пальцем (без сонара, ?mouse=1), раунд 8 с (?round=8). Проверяет: половины разошлись (левая/правая), тоны
   зонда — чётные и нечётные; старт общий (одно зерно, одно поле); высота вихря одного доходит до другого; частицы собираются, счёт и
   число частиц у обоих одинаковые; финиш у обоих. И «один телефон» с ботом. Без playwright — пропуск. Запуск: node tests/test_string_pw.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('нет playwright — пропуск'); console.log('ИТОГ: ok'); process.exit(0); }
const http=require('http'), fs=require('fs'), path=require('path'), os=require('os');
const LAB=path.join(__dirname,'..','..','app','sonar_lab3.html');
(async()=>{ let bad=0; const need=(ok,msg)=>{ console.log((ok?'ok  ':'FAIL')+'  '+msg); if(!ok) bad++; };
  const st=http.createServer((q,r)=>{ r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}); r.end(fs.readFileSync(LAB)); }); await new Promise(r=>st.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+st.address().port; process.env.ORIGINS=origin; process.env.DB=path.join(os.tmpdir(),'sl_'+process.pid+'.db');
  const {server}=require('../../../server/server.js'); await new Promise(r=>server.listen(0,'127.0.0.1',r)); const api='http://127.0.0.1:'+server.address().port;
  const b=await chromium.launch(); const url=origin+'/?mouse=1&round=8&api='+encodeURIComponent(api);
  const A=await b.newPage({viewport:{width:844,height:390}}), B=await b.newPage({viewport:{width:844,height:390}}); const errs=[]; [A,B].forEach(p=>p.on('pageerror',e=>errs.push(e.message)));
  const S=p=>p.evaluate(()=>{ const s=window.__sl(); return {phase:s.phase,code:s.code,side:s.side,half:s.half,seed:s.seed,n:s.objs.length,got:s.got,score:s.score,pv:s.pv,par:localStorage.getItem('sonar_link_par'),hy:s.hy,t:s.t,direct:!!(s.dc&&s.dc.readyState==='open'),rttD:s.rttD,near:s.near}; });
  for(const p of [A,B]){ await p.goto(url); await p.click('#goLink'); await p.click('#lkString'); }
  /* 1.56g: «Рядом» на обоих — без кода, одна сеть (оба с 127.0.0.1) */
  await A.click('#siNear'); let a; for(let i=0;i<50;i++){ a=await S(A); if(a.code) break; await A.waitForTimeout(100); }
  await B.click('#siNear');
  let b0; for(let i=0;i<50;i++){ b0=await S(B); if(b0.code) break; await B.waitForTimeout(100); }
  need(a.near&&b0.near&&a.code===b0.code&&a.side===0&&b0.side===1,'«Рядом»: нашли друг друга без кода (комната '+a.code+')');
  let bS; for(let i=0;i<80;i++){ a=await S(A); bS=await S(B); if(a.phase==='play'&&bS.phase==='play') break; await A.waitForTimeout(100); }
  need(a.phase==='play'&&bS.phase==='play','оба играют');
  for(let i=0;i<40;i++){ a=await S(A); bS=await S(B); if(a.direct&&bS.direct&&a.rttD) break; await A.waitForTimeout(100); }
  need(a.direct&&bS.direct,'связь напрямую (WebRTC): '+(a.direct&&bS.direct?'да, '+(a.rttD||0).toFixed(0)+' мс туда-обратно':'нет'));
  need(a.half==='L'&&bS.half==='R'&&a.par==='0'&&bS.par==='1','половины и тоны: '+a.half+'/'+a.par+', '+bS.half+'/'+bS.par);
  need(a.seed===bS.seed&&a.n===bS.n&&a.n>=4,'одно поле: зерно '+a.seed+', предметов '+a.n);
  /* оба водят пальцем: A — медленная волна, B — другая; проверяю, что высота A доходит до B */
  const lag=[]; for(let i=0;i<70;i++){ const ya=195+150*Math.sin(i/6), yb=195+140*Math.sin(i/5+1); await A.mouse.move(400,ya); await B.mouse.move(400,yb); await A.waitForTimeout(90);
    if(i>20&&i%5===0){ const sa=await S(A), sb=await S(B); lag.push(Math.abs(sb.pv-sa.hy)); } }
  lag.sort((x,y)=>x-y); need(lag.length&&lag[lag.length>>1]<0.2,'высота вихря A доходит до B: медиана расхождения '+(lag[lag.length>>1]*100).toFixed(0)+'% экрана (задержка и сглаживание)');
  for(let i=0;i<40;i++){ a=await S(A); bS=await S(B); if(a.phase==='over'&&bS.phase==='over') break; await A.waitForTimeout(100); }
  need(a.phase==='over'&&bS.phase==='over','финиш у обоих');
  need(a.got>0&&a.got===bS.got&&a.score===bS.score,`частиц ${a.got} / ${bS.got}, счёт ${a.score} / ${bS.score}`);
  /* по коду (для игры по сети): создать — войти */
  const A2=await b.newPage({viewport:{width:844,height:390}}), B2=await b.newPage({viewport:{width:844,height:390}});
  for(const p of [A2,B2]){ await p.goto(url); await p.click('#goLink'); await p.click('#lkString'); }
  await A2.click('#siNew'); let a2; for(let i=0;i<50;i++){ a2=await S(A2); if(a2.code) break; await A2.waitForTimeout(100); }
  await B2.fill('#siCode',a2.code); await B2.click('#siJoin'); let b2;
  for(let i=0;i<80;i++){ a2=await S(A2); b2=await S(B2); if(a2.phase==='play'&&b2.phase==='play') break; await A2.waitForTimeout(100); }
  need(a2.phase==='play'&&b2.phase==='play'&&!a2.near,'по коду: '+a2.code+' — оба играют');
  /* один телефон: бот */
  const C=await b.newPage({viewport:{width:844,height:390}}); C.on('pageerror',e=>errs.push(e.message)); await C.goto(origin+'/?mouse=1&round=6'); await C.click('#goLink'); await C.click('#lkString'); await C.click('#siBot');
  let c; for(let i=0;i<120;i++){ await C.mouse.move(400,195+150*Math.sin(i/7)); await C.waitForTimeout(100); c=await S(C); if(c.phase==='over') break; }
  need(c.phase==='over'&&c.par==='all','один телефон с ботом: финиш, все тоны (частиц '+c.got+')');
  need(!errs.length,'без ошибок страницы'+(errs.length?': '+errs.join('; '):''));
  await A.screenshot({path:path.join(__dirname,'..','out','string_A.png')}).catch(()=>{});
  await b.close(); server.closeAllConnections&&server.closeAllConnections(); server.close(); st.close(); try{ fs.unlinkSync(process.env.DB); }catch(e){}
  console.log(bad?'ИТОГ: ПРОВАЛ':'ИТОГ: ok'); process.exit(bad?1:0); })();
