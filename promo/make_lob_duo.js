/* SonaLob «Вдвоём» for the readme (v1.64j): two games in headless Chromium, a records server with its pair rooms on a temporary database,
   each page with a synthetic palm (tests/sim_source.js) played by the menu's rally bot on its own racket. A makes a code, B enters it, both
   calibrate, press «ГОТОВ», play; at a moment the shuttle is high, both screens are taken at once and laid side by side.
   Run from the repository: NODE_PATH=$(npm root -g) node promo/make_lob_duo.js   (needs Playwright, node:sqlite and python3 with Pillow)
   → promo/sonalob_duo.png */
const {chromium}=require('playwright'), os=require('os'), path=require('path'), fs=require('fs'), {execFileSync}=require('child_process'), ROOT=path.join(__dirname,'..');
process.env.DB=path.join(os.tmpdir(),'sonaroids_promo_duo_'+process.pid+'.db'); process.env.ORIGINS='null';
const {server}=require('../server/server.js'), SRC=fs.readFileSync(path.join(ROOT,'tests','sim_source.js'),'utf8');
const WAVE=`function(t){ if(t<8) return null; if(!window.__bot) return 110-40*Math.cos(2*Math.PI*(t-8)/(window.__per||1.6));
  var S=window.__sonaroids, f=S&&S.pongBotDuo(), c=S&&S.pongCtl(); if(f===null||f===undefined||!c||!c.lin) return window.__lastH||110;
  var h=c.lin.b+(f-0.08)/0.67*(c.lin.t-c.lin.b); window.__lastH=h; return h; }`;
(async()=>{ await new Promise(r=>server.listen(0,'127.0.0.1',r)); const base='http://127.0.0.1:'+server.address().port;
  const b=await chromium.launch(), P=[];
  for(let i=0;i<2;i++){ const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:1.5,hasTouch:true});
    await ctx.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_live','0'); localStorage.setItem('sonaroids_lang','${process.env.LANG2||'en'}'); localStorage.setItem('sonaroids_hand','right'); localStorage.setItem('sonaroids_pong_skin','0'); localStorage.setItem('sonaroids_pong_sens','2'); localStorage.setItem('sonaroids_nick','${i?'ANN':'DEN'}'); ${SRC}; window.makeSimSource=makeSimSource; window.__scen=${WAVE}; window.__per=${i?1.3:1.6}; window.SONAROIDS_API='${base}';`);
    const p=await ctx.newPage(); p.on('pageerror',e=>console.log('ERR',i,e.message)); await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(600);
    await p.evaluate(()=>{ Sonar.simulate({fs:48000,chan:'right',source:makeSimSource(window.__scen)}); }); P.push(p); }
  const [A,B]=P, act=(p,a)=>p.evaluate(a=>__sonaroids.act[a](),a), wait=async(p,f,ms)=>{ const t0=Date.now(); while(Date.now()-t0<ms){ if(await p.evaluate(f)) return true; await p.waitForTimeout(100); } return false; };
  for(const p of P){ await act(p,'hub_pong'); await p.waitForTimeout(300); await act(p,'pg_duo'); }
  await act(A,'pd_new'); await wait(A,()=>{ const d=__sonaroids.duo(); return d.on&&d.code; },5000); const code=(await A.evaluate(()=>__sonaroids.duo())).code;
  await act(B,'pd_in'); await B.waitForTimeout(200); await B.evaluate(c=>{ document.querySelector('input').value=c; },code); await act(B,'pd_ok');
  await wait(A,()=>__sonaroids.scr()==='pduo2',6000); await wait(B,()=>__sonaroids.scr()==='pduo2',6000);
  for(const p of P) await act(p,'pd_next');
  const t0=Date.now(), done=[false,false]; while(Date.now()-t0<60000&&!(done[0]&&done[1])){ await A.waitForTimeout(150);
    for(let i=0;i<2;i++){ const s=await P[i].evaluate(()=>({scr:__sonaroids.scr(),d:__sonaroids.duo()})); if(s.scr==='probe') await act(P[i],'probe_norm'); if(s.d.state==='try') done[i]=true; } }
  await A.waitForTimeout(800); for(const p of P) await act(p,'pd_ready');
  await wait(A,()=>__sonaroids.scr()==='play',8000); await wait(B,()=>__sonaroids.scr()==='play',3000);
  for(const p of P) await p.evaluate(()=>{ window.__bot=1; }); await A.waitForTimeout(9000);
  /* the shuttle high and rising on its way over, a few points scored — then both screens at once */
  const t1=Date.now(); while(Date.now()-t1<40000){ const ok=await A.evaluate(()=>{ const g=__sonaroids.duoGame(), b=g&&g.ball; return !!b&&!(b.wait>0)&&b.vy<0&&b.vy>-0.3&&b.y<0.38&&g.t>4; }); if(ok) break; await A.waitForTimeout(16); }
  const fa=path.join(os.tmpdir(),'duo_a.png'), fb=path.join(os.tmpdir(),'duo_b.png'); await Promise.all([A.screenshot({path:fa}),B.screenshot({path:fb})]);
  console.log('the game:',JSON.stringify(await A.evaluate(()=>{ const g=__sonaroids.duoGame(); return {t:+g.t.toFixed(1),score:g.score,passes:g.passes,lives:g.lives}; })));
  execFileSync('python3',['-c',`import sys; from PIL import Image
a=Image.open(sys.argv[1]).convert('RGB'); b=Image.open(sys.argv[2]).convert('RGB'); gap=24
o=Image.new('RGBA',(a.width+b.width+gap,a.height),(0,0,0,0)); o.paste(a,(0,0)); o.paste(b,(a.width+gap,0)); o.save(sys.argv[3],optimize=True)`,fa,fb,path.join(__dirname,'sonalob_duo.png')]);
  await b.close(); server.close(); try{ fs.unlinkSync(process.env.DB); }catch(e){} console.log('promo/sonalob_duo.png'); })();
