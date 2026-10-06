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
  need(a.phase==='play'&&bS.phase==='play','оба играют'+(a.phase==='play'&&bS.phase==='play'?'':' — '+JSON.stringify(await Promise.all([A,B].map(p=>p.evaluate(()=>{ const s=window.__sl(); return [s.phase,s.ready,s.peerReady,s.T0,s.rtcState,s.dc&&s.dc.readyState,document.getElementById('slSay').textContent,window.__slEv()]; }))))));
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
  /* 1.56h: журнал партии с каждого телефона — и разбор пары: часы, высоты, поле, события, счёт сходятся */
  const OUT=path.join(__dirname,'..','out'); try{ fs.mkdirSync(OUT,{recursive:true}); }catch(e){}
  const logOf=async(p,name)=>{ const b64=await p.evaluate(async()=>{ const b=window.__slLog(), u=new Uint8Array(await b.arrayBuffer()); let s=''; for(let i=0;i<u.length;i+=8192) s+=String.fromCharCode.apply(null,u.subarray(i,i+8192)); return btoa(s); });
    const f=path.join(OUT,name); fs.writeFileSync(f,Buffer.from(b64,'base64')); return f; };
  const fA=await logOf(A,'string_log_L.wav'), fB=await logOf(B,'string_log_R.wav');
  const E=require('../eval_string.js'); let R=null; try{ R=E.analyze([fA,fB]); }catch(e){ console.log(e.stack); }
  need(R&&R.phones.length===2&&R.pair,'журналы с обоих телефонов читаются ('+(R?R.phones.map(p=>p.file).join(', '):'—')+')');
  if(R){ console.log(R.lines.map(l=>'      '+l).join('\n'));
    const P=R.pair; need(P.ab.got>20&&P.ba.got>20&&P.ab.loss<0.05&&P.ba.loss<0.05,'высоты в журналах: дошли '+P.ab.got+' и '+P.ba.got+', потери '+(100*P.ab.loss).toFixed(0)+'% / '+(100*P.ba.loss).toFixed(0)+'%');
    need(Math.abs(P.clock)<30,'часы по журналам сходятся: ~'+P.clock.toFixed(0)+' мс');
    need(P.visL&&P.visR&&P.visL.best<0.05&&P.visR.best<0.05&&P.visL.lag<=250,'вихрь напарника там, где у хозяина: отставание '+(P.visL&&P.visL.lag)+' мс, расхождение '+(P.visL?(100*P.visL.best).toFixed(1):'—')+'%');
    need(P.events.n>0&&P.events.agree===P.events.n,'события у обоих одни и те же: '+P.events.agree+' из '+P.events.n);
    need(R.ok,'разбор: замечаний нет'); }
  /* по коду (для игры по сети): создать — войти */
  const A2=await b.newPage({viewport:{width:844,height:390}}), B2=await b.newPage({viewport:{width:844,height:390}});
  for(const p of [A2,B2]){ await p.goto(url); await p.click('#goLink'); await p.click('#lkString'); }
  await A2.click('#siNew'); let a2; for(let i=0;i<50;i++){ a2=await S(A2); if(a2.code) break; await A2.waitForTimeout(100); }
  await B2.fill('#siCode',a2.code); await B2.click('#siJoin'); let b2;
  for(let i=0;i<80;i++){ a2=await S(A2); b2=await S(B2); if(a2.phase==='play'&&b2.phase==='play') break; await A2.waitForTimeout(100); }
  need(a2.phase==='play'&&b2.phase==='play'&&!a2.near,'по коду: '+a2.code+' — оба играют'+(a2.phase==='play'&&b2.phase==='play'?'':' ('+JSON.stringify([a2.phase,b2.phase,b2.code,await B2.evaluate(()=>document.getElementById('slSay').textContent+' / '+document.getElementById('slSub').textContent)])+')'));
  /* 1.56i: по коду прямой канал тоже открывается (06.10 18:22 предложение уходило, пока второй ещё не слушал, и пропадало) */
  for(let i=0;i<40;i++){ a2=await S(A2); b2=await S(B2); if(a2.direct&&b2.direct) break; await A2.waitForTimeout(100); }
  need(a2.direct&&b2.direct,'по коду: связь напрямую '+(a2.direct&&b2.direct?'да':'нет'));
  /* 1.56i: стык экранов — сдвиг и масштаб на этом телефоне, сохраняются */
  const D=await b.newPage({viewport:{width:844,height:390}}); D.on('pageerror',e=>errs.push(e.message)); await D.goto(url); await D.click('#goLink'); await D.click('#lkString'); await D.click('#siSeam');
  for(let i=0;i<3;i++) await D.click('#saUp'); for(let i=0;i<2;i++) await D.click('#saMore');
  const sv=await D.evaluate(()=>JSON.parse(localStorage.getItem('sonar_sl_seam')||'null')); await D.click('#saOk'); const back=await D.evaluate(()=>!document.getElementById('strIntro').classList.contains('hidden'));
  need(sv&&Math.abs(sv.dy+0.012)<1e-6&&Math.abs(sv.sc-1.02)<1e-6&&back,'стык: сдвиг '+(sv&&(sv.dy*100).toFixed(1))+'%, масштаб '+(sv&&(sv.sc*100).toFixed(0))+'%, «Готово» — назад');
  /* один телефон: бот */
  const C=await b.newPage({viewport:{width:844,height:390}}); C.on('pageerror',e=>errs.push(e.message)); await C.goto(origin+'/?mouse=1&round=6'); await C.click('#goLink'); await C.click('#lkString'); await C.click('#siBot');
  let c; for(let i=0;i<120;i++){ await C.mouse.move(400,195+150*Math.sin(i/7)); await C.waitForTimeout(100); c=await S(C); if(c.phase==='over') break; }
  need(c.phase==='over'&&c.par==='all','один телефон с ботом: финиш, все тоны (частиц '+c.got+')');
  need(!errs.length,'без ошибок страницы'+(errs.length?': '+errs.join('; '):''));
  await A.screenshot({path:path.join(__dirname,'..','out','string_A.png')}).catch(()=>{});
  await b.close(); server.closeAllConnections&&server.closeAllConnections(); server.close(); st.close(); try{ fs.unlinkSync(process.env.DB); }catch(e){}
  console.log(bad?'ИТОГ: ПРОВАЛ':'ИТОГ: ok'); process.exit(bad?1:0); })();
