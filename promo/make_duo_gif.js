/* The SonaLob «together» GIF (v1.64l), step 1 of 2 (Den 13.10: «гифка два телефона, две ладони.. играю в соналоб.. за основу нашу главную
   гифку»; the sketch «А»: the left hand at the left phone, the right hand at the right one, a cardboard between them, as in the video).
   The scene is the main GIF's (make_promo.js), with two smaller phones turned to each other; on their screens a real game together:
   two pages of the game in headless Chromium, stepped frame by frame in step, each with the menu's rally bot on its own racket, their
   palms going to each other as on the network (a tick late, so the games run again from the guess as they do on phones). Each phone
   shows its own racket in red ink and «ТЫ»/«YOU» over it in the first seconds.
   Writes promo/frames_duo/: <lang>_<k>_<i>.png — phone k's screen (0 — the left one) at frame i; bg.png, mask0.png, mask1.png, over.png,
   sub_en.png, sub_ru.png; meta.json (the screens' corners, the ports, each frame's palms).
   Then python3 promo/make_duo_gif.py puts them together. Run from the repository: NODE_PATH=$(npm root -g) node promo/make_duo_gif.js */
const {chromium}=require('playwright'), fs=require('fs'), path=require('path');
const OUT=path.join(__dirname,'frames_duo'), T=15, FPS=20, N=+(process.env.NF||T*FPS), W=12, X=2, SUB=3, SEED=20261013, WARM=0.35;   // W — frames past the loop, faded into its start
const LANGS=(process.env.LANGS||'en,ru').split(',');
/* the phones: the main GIF's, 0.415 of its size; the left one mirrored (its charging end to the left, turned the other way) */
const K=0.45, PW=530*K, PH=248*K, TH=24*K, SW=500*K, SH=231*K, CY=228, CXS=[252,548], ROT=[-18,18]   /* one camera in the middle; each phone's camera end (to the middle) nearer, as the main GIF's */;
function phoneHtml(k){ const cx=CXS[k], port=k?'rgt':'lft', isl=k?`left:${(PW-SW)/2+10*K}px`:`right:${(PW-SW)/2+10*K}px`;
  return `<div class="stage" id="s${k}"><div class="rig" style="left:${cx}px;top:${CY}px;transform:rotateY(${ROT[k]}deg)">
    <div class="f back"></div><div class="f side top"></div><div class="f side bot"></div>
    <div class="f side rgt">${port==='rgt'?'<div class="port"></div>':''}</div><div class="f side lft">${port==='lft'?'<div class="port"></div>':''}</div>
    <div class="f front"><div class="scr"><i style="left:0;top:0"></i><i style="right:0;top:0"></i><i style="right:0;bottom:0"></i><i style="left:0;bottom:0"></i></div><div class="isl" style="${isl}"></div><div class="glare"></div></div>
  </div></div>`; }
/* the cardboard between them: a big sheet stood on its edge, its corrugation seen at the top */
function cardboard(){ let fl='', st='';
  for(let x=0;x<34;x+=3.4){ fl+=`<path d="M${383+x} ${84+x*0.06} q1.7 -2.6 3.4 0" fill="none" stroke="#7a5530" stroke-width="1"/>`; st+=`<line x1="${384.7+x}" y1="${86+x*0.06}" x2="${384.7+x}" y2="${394-x*0.03}" stroke="#a5784a" stroke-width=".7" opacity=".35"/>`; }
  return `<svg class="card" width="800" height="450"><defs><linearGradient id="cb" x1="0" x2="1"><stop offset="0" stop-color="#9c7043"/><stop offset=".4" stop-color="#C39361"/><stop offset="1" stop-color="#8d643a"/></linearGradient></defs>
    <polygon points="383,85 417,87 417,393 383,395" fill="url(#cb)" stroke="#6e4c2a" stroke-width="1.2"/>${st}${fl}
    <path d="M392 300 l9 -6 M395 318 l7 -4" stroke="#6e4c2a" stroke-width="1" opacity=".5"/></svg>`; }
function pills(lang){ const T=lang==='ru'?{a:'СОНАР-УПРАВЛЕНИЕ',as:'ладонь в воздухе вместо кнопок',b:'ВДВОЁМ',bs:'два телефона, одна партия'}:{a:'SONAR CONTROL',as:'your palm in mid-air instead of buttons',b:'TOGETHER',bs:'two phones, one game'};
  const HAND='<svg width="24" height="26" viewBox="0 0 22 24"><path d="M5 22 C2 18 2 14 3 11 L3 6 C3 4.6 5 4.6 5 6 L5 11 L6 3 C6 1.6 8 1.6 8 3 L8 10 L9 2 C9 0.6 11 0.6 11 2 L11 10 L12 3.5 C12 2.1 14 2.1 14 3.5 L14 12 L16 9 C17 7.6 19 8.6 18 10 L15 17 C14 20 12 22 10 22 Z" fill="none" stroke="#7FE0C8" stroke-width="1.6"/><path d="M17 3 a5 5 0 0 1 3 4 M18.5 0.8 a8 8 0 0 1 3 6" stroke="#FFB347" stroke-width="1.4" fill="none"/></svg>';
  const TWO='<svg width="34" height="26" viewBox="0 0 34 26"><rect x="1" y="7" width="14" height="12" rx="2.5" fill="none" stroke="#7FE0C8" stroke-width="1.6"/><rect x="19" y="7" width="14" height="12" rx="2.5" fill="none" stroke="#7FE0C8" stroke-width="1.6"/><circle cx="6" cy="14" r="1.6" fill="#E2584A"/><circle cx="28" cy="14" r="1.6" fill="#E2584A"/><path d="M8 10 Q17 1 26 10" fill="none" stroke="#FFB347" stroke-width="1.4" stroke-dasharray="2 2"/></svg>';
  const st='position:absolute;top:394px;height:48px;border-radius:14px;border:2px solid #7FE0C8;background:rgba(27,26,46,.9);color:#E9E4F0;display:flex;align-items:center;gap:11px;padding:0 15px;box-shadow:0 0 14px rgba(127,224,200,.18);box-sizing:border-box';
  const tx=(t,u)=>`<div style="display:flex;flex-direction:column;line-height:1.15"><b style="font:800 17px system-ui,sans-serif;letter-spacing:.5px">${t}</b><small style="font:600 12.5px system-ui,sans-serif;color:#C9A9B6;letter-spacing:.3px">${u}</small></div>`;
  return `<div id="pa" style="${st}">${HAND}${tx(T.a,T.as)}</div><div id="pb" style="${st}">${TWO}${tx(T.b,T.bs)}</div>
  <script>{ const a=document.getElementById('pa'), b=document.getElementById('pb'), gap=26, w=a.offsetWidth+gap+b.offsetWidth, x0=Math.round((800-w)/2); a.style.left=x0+'px'; b.style.left=(x0+a.offsetWidth+gap)+'px'; }</script>`; }
function scene(mode,lang,k){
  let s=7, rnd=()=>{ s=(s*16807)%2147483647; return s/2147483647; }, stars='';
  for(let i=0;i<90;i++){ const x=rnd()*800, y=rnd()*450, r=rnd()<0.1?1.4:0.7+rnd()*0.5, a=0.3+rnd()*0.6; stars+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${rnd()<0.2?'#FFE9D6':'#B89BB2'}" opacity="${a.toFixed(2)}"/>`; }
  const only={bg:'',mask:`.bg,.t,.shadow,.card,.back,.side,.front>*:not(.scr),.scr img{visibility:hidden} .front{background:transparent!important;box-shadow:none!important} .scr{background:#fff} #s${1-k}{visibility:hidden}`,
    over:'.bg,.t,.shadow,.card,.back,.side,.scr{visibility:hidden} .front{background:transparent!important;box-shadow:none!important}', sub:'.bg,.t,.shadow,.card,.stage{visibility:hidden}'}[mode];
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:800px;height:450px;overflow:hidden;background:${mode==='bg'?'#1B1A2E':'transparent'};font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  .bg{position:absolute;inset:0;background:radial-gradient(ellipse 45% 45% at 22% 60%,rgba(74,47,74,.5),transparent 70%),radial-gradient(ellipse 45% 45% at 78% 60%,rgba(74,47,74,.5),transparent 70%),radial-gradient(ellipse 50% 40% at 50% 25%,rgba(60,43,79,.6),transparent 70%),radial-gradient(ellipse 70% 50% at 50% 110%,rgba(127,224,200,.07),transparent 70%),#1B1A2E}
  .t{position:absolute;left:0;right:0;top:14px;text-align:center;color:#7FE0C8;font-weight:800;font-size:54px;letter-spacing:.5px;text-shadow:0 0 22px rgba(127,224,200,.35)}
  .card{position:absolute;left:0;top:0}
  .stage{position:absolute;left:0;top:0;width:800px;height:450px;perspective:1100px;perspective-origin:50% 45%}
  .rig{position:absolute;width:0;height:0;transform-style:preserve-3d}
  .f{position:absolute;backface-visibility:hidden}
  .front{left:${-PW/2}px;top:${-PH/2}px;width:${PW}px;height:${PH}px;border-radius:${40*K}px;background:#0c0b14;box-shadow:inset 0 0 0 1.5px #5b5670,inset 0 0 0 2.5px #1d1b27;transform:translateZ(${TH/2}px)}
  .scr{position:absolute;left:${(PW-SW)/2}px;top:${(PH-SH)/2}px;width:${SW}px;height:${SH}px;border-radius:${28*K}px;overflow:hidden;background:#000}
  .scr i{position:absolute;width:0;height:0}
  .isl{position:absolute;top:${PH/2-38*K}px;width:${17*K}px;height:${76*K}px;border-radius:${9*K}px;background:#000}
  .glare{position:absolute;inset:0;border-radius:${40*K}px;background:linear-gradient(115deg,rgba(255,255,255,.10),rgba(255,255,255,0) 40%)}
  .back{left:${-PW/2}px;top:${-PH/2}px;width:${PW}px;height:${PH}px;border-radius:${40*K}px;background:#2c2838;transform:rotateY(180deg) translateZ(${TH/2}px)}
  .side{background:linear-gradient(#8d88a0,#4a4658 50%,#2a2735)}
  .top{left:${-PW/2+30*K}px;top:${-TH/2}px;width:${PW-60*K}px;height:${TH}px;transform:rotateX(90deg) translateZ(${PH/2}px)}
  .bot{left:${-PW/2+30*K}px;top:${-TH/2}px;width:${PW-60*K}px;height:${TH}px;transform:rotateX(-90deg) translateZ(${PH/2}px)}
  .rgt,.lft{left:${-TH/2}px;top:${-PH/2+30*K}px;width:${TH}px;height:${PH-60*K}px;background:linear-gradient(90deg,#7d7890,#4a4658 50%,#2a2735)}
  .rgt{transform:rotateY(90deg) translateZ(${PW/2}px)} .lft{transform:rotateY(-90deg) translateZ(${PW/2}px)}
  .port{position:absolute;left:${TH/2-2}px;top:${(PH-60*K)/2-7}px;width:4px;height:14px;border-radius:2px;background:#0c0b14}
  .shadow{position:absolute;top:372px;width:240px;height:24px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.45),transparent);filter:blur(3px)}
  ${only}</style></head><body><div class="bg"><svg width="800" height="450">${stars}</svg></div><div class="t">sonaroids.app</div>
  <div class="shadow" style="left:${CXS[0]-120}px"></div><div class="shadow" style="left:${CXS[1]-120}px"></div>${cardboard()}
  ${phoneHtml(0)}${phoneHtml(1)}${mode==='sub'?pills(lang):''}</body></html>`; }
/* the game, patched in memory as for the main GIF (promo_game.js: the loop stepped by us, the insets of an iPhone in landscape), and: the drawing's quality kept (the shots are slow, it
   would step down), the palm from the menu's rally bot on the own racket */
function patched(){ let html=fs.readFileSync(path.join(__dirname,'..','game','play','index.html'),'utf8');
  const patch=(a,b)=>{ if(html.split(a).length!==2) throw new Error('anchor not found once: '+a.slice(0,60)); html=html.replace(a,b); };
  patch('function loop(now){ Sfx.setGame(mode);   /* 1.61w: which game\'s sounds */\n  requestAnimationFrame(loop);','function loop(now){ Sfx.setGame(mode);\n  requestAnimationFrame(loop); if(window.__gifMode&&!window.__gifCall) return;');
  patch('function safeInsets(){','function safeInsets(){ if(window.__safe) return window.__safe; ');
  patch('function hdPace(){','function hdPace(){ if(window.__gifMode) return; ');
  patch('window.__sonaroids={','window.__gifTick=function(now){ window.__gifCall=true; try{ loop(now); } finally { window.__gifCall=false; } }; window.__PD=PD; window.__pdCount=pdCount; window.__pdGot=pdGot; window.__Link=Link;\nwindow.__sonaroids={');
  patch('function pgSkQual(ms,pace){','function pgSkQual(ms,pace){ if(window.__gifMode) return; ');
  patch('PongCtl.palmAt(c,vs-(n-1-i)*1000*DTs):null):null;','PongCtl.palmAt(c,vs-(n-1-i)*1000*DTs):null):null; if(window.__botF) f=window.__botF();');
  const tmp=path.join(__dirname,'..','game','play','__promo_duo.html'); fs.writeFileSync(tmp,html); return tmp; }
async function record(b,file,lang,meta){
  const P=[];
  for(let k=0;k<2;k++){ const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:1}); const p=await ctx.newPage(); p.on('pageerror',e=>console.log('page',k,e.message));
    await p.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_live','0'); localStorage.setItem('sonaroids_lang','${lang}'); localStorage.setItem('sonaroids_pong_skin','0'); localStorage.setItem('sonaroids_hand','${k?'right':'left'}'); window.__gifMode=true; window.__safe={t:0,r:47,b:21,l:47};`);
    await p.goto('file://'+file); await p.waitForTimeout(300); P.push(p); }
  let now=1000;
  for(const [k,p] of P.entries()) await p.evaluate(([k,now,seed])=>{ window.__T=now; window.__gifTick(now); const S=__sonaroids; S.fake(); S.act.hub_pong();
      window.__out=[]; const L=window.__Link; L.now=()=>window.__T; L.send=m=>{ if(m&&m.e==='h') window.__out.push(m); }; L.direct=()=>true;
      window.__botF=function(){ const f=__sonaroids.pongBotDuo(); window.__f=f===null||f===undefined?0.12:f; return window.__f; };
      Object.assign(window.__PD,{on:true,side:k,left:0,peer:true}); window.__pdCount({e:'go',seed:seed,t0:now+3000,left:0,sens:[1,1],span:[0,0]}); },[k,now,SEED]);
  /* one tick on both; what each sent comes to the other on the next tick */
  let box=[[],[]]; const tick=async()=>{ now+=1000/60; const r=await Promise.all(P.map((p,k)=>p.evaluate(([now,inb])=>{ inb.forEach(m=>window.__pdGot(m)); window.__T=now; window.__gifTick(now);
      const o=window.__out; window.__out=[]; const g=__sonaroids.duoGame(); return {o:o,f:window.__f===undefined?0.12:window.__f,t:g?g.t:null,scr:__sonaroids.scr()}; },[now,box[k]])));
    box=[r[1].o,r[0].o]; return r; };
  let r; do r=await tick(); while(!(r[0].t>=WARM&&r[1].t>=WARM));
  const F=[];
  for(let i=0;i<N+W;i++){ let fs2=[[],[]]; for(let s=0;s<SUB;s++){ r=await tick(); fs2[0].push(r[0].f); fs2[1].push(r[1].f); }
    F.push([fs2[0][SUB-1],fs2[1][SUB-1]].map(v=>+v.toFixed(4)));
    const sh=await Promise.all(P.map(p=>p.screenshot())); sh.forEach((buf,k)=>fs.writeFileSync(path.join(OUT,`${lang}_${k}_${String(i).padStart(4,'0')}.png`),buf));
    if(i%60===0) process.stdout.write(`${lang} ${i}/${N+W} `); }
  const st=await Promise.all(P.map(p=>p.evaluate(()=>{ const g=__sonaroids.duoGame(); return {n:g.n,t:+g.t.toFixed(2),score:g.score,passes:g.passes,lives:g.lives,state:g.state,rb:window.__PD.N.rb,rbMax:window.__PD.N.rbMax}; })));
  console.log('\n',lang,JSON.stringify(st)); meta.F=F;
  for(const p of P) await p.context().close(); }
(async()=>{ if(!process.env.LAYERS_ONLY) fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch(), lay=await b.newPage({viewport:{width:800,height:450},deviceScaleFactor:X}), meta={T,FPS,N,W,X,quad:[],port:[]};
  for(const [mode,lang,name,k] of [['bg','en','bg'],['mask','en','mask0',0],['mask','en','mask1',1],['over','en','over'],['sub','en','sub_en'],['sub','ru','sub_ru']]){
    fs.writeFileSync(path.join(OUT,'s.html'),scene(mode,lang,k)); await lay.goto('file://'+path.join(OUT,'s.html')); await lay.waitForTimeout(150);
    if(mode==='bg') Object.assign(meta,await lay.evaluate(()=>{ const c=q=>{ const r=q.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]; };
      return {quad:[...document.querySelectorAll('.stage')].map(s=>[...s.querySelectorAll('.scr i')].map(c)),port:[...document.querySelectorAll('.port')].map(c)}; }));
    await lay.screenshot({path:path.join(OUT,name+'.png'),omitBackground:mode!=='bg'}); }
  fs.unlinkSync(path.join(OUT,'s.html'));
  if(process.env.LAYERS_ONLY){ const old=JSON.parse(fs.readFileSync(path.join(OUT,'meta.json'),'utf8')); meta.F=old.F; fs.writeFileSync(path.join(OUT,'meta.json'),JSON.stringify(meta)); await b.close(); return; }
  const file=patched(); for(const lang of LANGS) await record(b,file,lang,meta);
  fs.writeFileSync(path.join(OUT,'meta.json'),JSON.stringify(meta)); await b.close(); fs.unlinkSync(file); })();
