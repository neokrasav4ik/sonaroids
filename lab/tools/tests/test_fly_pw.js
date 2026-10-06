/* СонарЛинк, «Ущелье» (1.56u): две страницы лабы через настоящий сервер — «Рядом», полёт по ущелью, управление пальцем (?mouse=1),
   раунд 10 с. Левый считает корабль, правый получает его вместе с высотой руки и рисует свою половину. Проверяет: оба летят; правый
   видит корабль там же, где левый (с поправкой на ~60 мс показа); мыши вместе вверх — корабль выше; одна выше другой — крен в её сторону;
   финиш у обоих с одинаковыми очками; «Один телефон» долетает (автопилот поворотов); картинки обеих половин — в out/fly_*.png.
   Без playwright — пропуск. Запуск: node tests/test_fly_pw.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('нет playwright — пропуск'); console.log('ИТОГ: ok'); process.exit(0); }
const http=require('http'), fs=require('fs'), path=require('path'), os=require('os');
const LAB=path.join(__dirname,'..','..','app','sonar_lab3.html'), OUT=path.join(__dirname,'..','out');
(async()=>{ let bad=0; const need=(ok,msg)=>{ console.log((ok?'ok  ':'FAIL')+'  '+msg); if(!ok) bad++; };
  const st=http.createServer((q,r)=>{ r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}); r.end(fs.readFileSync(LAB)); }); await new Promise(r=>st.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+st.address().port; process.env.ORIGINS=origin; process.env.DB=path.join(os.tmpdir(),'fl_'+process.pid+'.db');
  const {server}=require('../../../server/server.js'); await new Promise(r=>server.listen(0,'127.0.0.1',r)); const api='http://127.0.0.1:'+server.address().port;
  const b=await chromium.launch(); const url=origin+'/?mouse=1&round=10&api='+encodeURIComponent(api); const errs=[]; try{ fs.mkdirSync(OUT,{recursive:true}); }catch(e){}
  const A=await b.newPage({viewport:{width:844,height:390}}), B=await b.newPage({viewport:{width:844,height:390}}); [A,B].forEach(p=>p.on('pageerror',e=>errs.push(e.message)));
  const S=p=>p.evaluate(()=>{ const s=window.__sl(), F=window.__fl(); return {phase:s.phase,half:s.half,mode:s.mode,s:F.s,x:F.x,y:F.y,phi:F.phi,score:F.score,shield:F.shield,qb:F.qb?F.qb.length:0,shown:window.__flShown()}; });
  for(const p of [A,B]){ await p.goto(url); await p.click('#goLink'); await p.click('#lkFly'); }
  await A.click('#flNear'); for(let i=0;i<30;i++){ const a=await S(A); if(a.phase!=='idle') break; await A.waitForTimeout(100); } await B.click('#flNear');
  let a,bb; for(let i=0;i<80;i++){ a=await S(A); bb=await S(B); if(a.phase==='play'&&bb.phase==='play') break; await A.waitForTimeout(100); }
  need(a.phase==='play'&&bb.phase==='play'&&a.mode==='fly'&&a.half==='L'&&bb.half==='R','оба летят: '+a.half+' считает, '+bb.half+' рисует');
  /* обе мыши вместе: вверх-вниз — высота */
  const ys=[]; for(let i=0;i<20;i++){ const y=195-120*Math.sin(i/3); await A.mouse.move(400,y); await B.mouse.move(400,y); await A.waitForTimeout(60); const s=await S(A); ys.push(s.y); }
  need(Math.max(...ys)-Math.min(...ys)>3,'вместе вверх-вниз — высота ходит: '+Math.min(...ys).toFixed(1)+'…'+Math.max(...ys).toFixed(1)+' м');
  /* левая выше правой — крен вправо (phi > 0) */
  for(let i=0;i<10;i++){ await A.mouse.move(400,80); await B.mouse.move(400,310); await A.waitForTimeout(50); } const r1=await S(A);
  for(let i=0;i<10;i++){ await A.mouse.move(400,310); await B.mouse.move(400,80); await A.waitForTimeout(50); } const r2=await S(A);
  need(r1.phi>0.2&&r2.phi<-0.2,'одна выше другой — крен в её сторону: '+r1.phi.toFixed(2)+' / '+r2.phi.toFixed(2));
  a=await S(A); bb=await S(B); need(bb.qb>5&&Math.abs(bb.shown.s-a.s)<4&&Math.abs(bb.shown.x-a.x)<1.5,'правый видит корабль: путь '+bb.shown.s.toFixed(1)+' / '+a.s.toFixed(1)+' м, в сторону '+bb.shown.x.toFixed(2)+' / '+a.x.toFixed(2));
  await A.screenshot({path:path.join(OUT,'fly_L.png')}); await B.screenshot({path:path.join(OUT,'fly_R.png')});
  for(let i=0;i<80;i++){ await A.mouse.move(400,195+60*Math.sin(i/4)); await B.mouse.move(400,195+60*Math.sin(i/4)); a=await S(A); bb=await S(B); if(a.phase==='over'&&bb.phase==='over') break; await A.waitForTimeout(100); }
  need(a.phase==='over'&&bb.phase==='over','финиш у обоих');
  const sa=await A.evaluate(()=>document.getElementById('slSub').textContent), sb=await B.evaluate(()=>document.getElementById('slSub').textContent);
  need(sa===sb&&/очки/.test(sa),'итог одинаковый: «'+sa+'»');
  /* вид из кабины, один телефон */
  const C=await b.newPage({viewport:{width:844,height:390}}); C.on('pageerror',e=>errs.push(e.message)); await C.goto(origin+'/?mouse=1&round=6'); await C.click('#goLink'); await C.click('#lkFly'); await C.click('#flView'); await C.click('#flSolo');
  let c; for(let i=0;i<120;i++){ await C.mouse.move(400,195+100*Math.sin(i/5)); await C.waitForTimeout(100); c=await S(C); if(i===60) await C.screenshot({path:path.join(OUT,'fly_solo_cockpit.png')}); if(c.phase==='over') break; }
  need(c.phase==='over'&&c.s>100,'один телефон, из кабины: долетел '+(c.s||0).toFixed(0)+' м, щит '+c.shield);
  need(!errs.length,'без ошибок страницы'+(errs.length?': '+errs.join('; '):''));
  await b.close(); server.closeAllConnections&&server.closeAllConnections(); server.close(); st.close(); try{ fs.unlinkSync(process.env.DB); }catch(e){}
  console.log(bad?'ИТОГ: ПРОВАЛ':'ИТОГ: ok'); process.exit(bad?1:0); })();
