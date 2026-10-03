/* The promo GIF (v1.03), step 1 of 2: the pictures that do not come from Python.
   One big phone in the air, turned so the camera's end is nearer, the real games on its screen (SonaFly space HD → SonaRace notebook →
   SonaFly neon HD → SonaRace candy, 3.75 s each), the palm at the charging end moving to and from it (two waves: big slow + small quick),
   the ship or the car following it (the palm nearer — lower). Agreed with Den on 30 Sep 2026 from sketches.
   Writes promo/frames_promo/: g<k>_<i>.png — game k's screen at the GIF's frame i; layers bg.png (the scene without screen, palm, arcs
   and subtitle), mask.png (the screen's shape), over.png (the island and the glass glare), sub_en.png / sub_ru.png; meta.json.
   Then python3 promo/make_promo.py puts them together. Run from the repository: NODE_PATH=$(npm root -g) node promo/make_promo.js */
const {chromium}=require('playwright'), fs=require('fs'), path=require('path'), G=require('./promo_game.js');
/* PROMO=pixel (v1.05, the maintainer: «вариант нашей промогифки с играми на телефоне в графике пикселей, для сообществ ретроигр» — the hand and
   the phone in HD, the games on the screen in pixels) → promo/frames_promo_pixel/, then PROMO=pixel python3 promo/make_promo.py */
const PV=process.env.PROMO==='pixel'?'pixel':process.env.PROMO==='mix'?'mix':'hd';
/* PROMO=mix (v1.32, the maintainer: «демонстрацию этой фишки например сонофлая: космос-вектор-тетрадка-неон-космос») — one SonaFly flight, its skin
   playlist changing the world every 3 s with the game's own torn-sheet change → promo/frames_promo_mix/, then PROMO=mix python3 promo/make_promo.py */
const OUT=path.join(__dirname,PV==='pixel'?'frames_promo_pixel':PV==='mix'?'frames_promo_mix':'frames_promo'), T=15, FPS=20, N=T*FPS, Q=N/4, X=2;   // X — rendered at twice the GIF's size
/* the palm: 0 — near the phone (the ship low), 1 — far (high); loops every T seconds (Den's pick «второй») */
const U=t=>0.5+0.3*Math.sin(2*Math.PI*t*4/T)+0.14*Math.sin(2*Math.PI*t*11/T+1.0);
const GAMES=[{fly:'space',k:0.84,b:0.08,warm:2},{race:'note',k:0.44,b:0.28,warm:2},{fly:'neon',k:0.84,b:0.08,warm:3},{race:'candy',k:0.44,b:0.28,warm:9}].map(g=>Object.assign(g,{gfx:PV}));
const PW=530, PH=248, TH=24, SW=500, SH=231, CX=310, CY=240, RIG='rotateY(18deg)';
function scene(mode,lang,hi){
  const sub=lang==='ru'?'ИГРЫ, КОТОРЫМИ УПРАВЛЯЕТ ЛАДОНЬ В ВОЗДУХЕ':'GAMES YOU PLAY WITH YOUR PALM IN MID-AIR';
  let s=7, rnd=()=>{ s=(s*16807)%2147483647; return s/2147483647; }, stars='';
  for(let i=0;i<90;i++){ const x=rnd()*800, y=rnd()*450, r=rnd()<0.1?1.4:0.7+rnd()*0.5, a=0.3+rnd()*0.6; stars+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${rnd()<0.2?'#FFE9D6':'#B89BB2'}" opacity="${a.toFixed(2)}"/>`; }
  const only={bg:'',mask:'.bg,.t,.shadow,.back,.side,.front>*:not(.scr),.scr img{visibility:hidden} .front{background:transparent!important;box-shadow:none!important} .scr{background:#fff}',
    over:'.bg,.t,.shadow,.back,.side,.scr{visibility:hidden} .front{background:transparent!important;box-shadow:none!important}', sub:'.bg,.t,.shadow,.stage{visibility:hidden}'}[mode];
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:800px;height:450px;overflow:hidden;background:${mode==='bg'?'#1B1A2E':'transparent'};font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  .bg{position:absolute;inset:0;background:radial-gradient(ellipse 60% 45% at 30% 60%,rgba(74,47,74,.55),transparent 70%),radial-gradient(ellipse 50% 40% at 80% 30%,rgba(60,43,79,.6),transparent 70%),radial-gradient(ellipse 70% 50% at 50% 110%,rgba(127,224,200,.07),transparent 70%),#1B1A2E}
  .t{position:absolute;left:0;right:0;top:14px;text-align:center;color:#7FE0C8;font-weight:800;font-size:54px;letter-spacing:.5px;text-shadow:0 0 22px rgba(127,224,200,.35)}
  .s{position:absolute;left:0;right:0;top:408px;text-align:center;color:#C9A9B6;font-weight:700;font-size:21px;letter-spacing:.6px;text-shadow:0 0 6px #1B1A2E,0 0 12px #1B1A2E;${mode==='sub'?'':'display:none'}}
  .stage{position:absolute;left:0;top:0;width:800px;height:450px;perspective:1100px;perspective-origin:50% 45%}
  .rig{position:absolute;left:${CX}px;top:${CY}px;width:0;height:0;transform-style:preserve-3d;transform:${RIG}}
  .f{position:absolute;backface-visibility:hidden}
  .front{left:${-PW/2}px;top:${-PH/2}px;width:${PW}px;height:${PH}px;border-radius:40px;background:#0c0b14;box-shadow:inset 0 0 0 2px #5b5670,inset 0 0 0 4px #1d1b27;transform:translateZ(${TH/2}px)}
  .scr{position:absolute;left:${(PW-SW)/2}px;top:${(PH-SH)/2}px;width:${SW}px;height:${SH}px;border-radius:28px;overflow:hidden;background:#000}
  .scr i{position:absolute;width:0;height:0}
  .isl{position:absolute;left:${(PW-SW)/2+10}px;top:${PH/2-38}px;width:17px;height:76px;border-radius:9px;background:#000}
  .glare{position:absolute;inset:0;border-radius:40px;background:linear-gradient(115deg,rgba(255,255,255,.10),rgba(255,255,255,0) 40%)}
  .back{left:${-PW/2}px;top:${-PH/2}px;width:${PW}px;height:${PH}px;border-radius:40px;background:#2c2838;transform:rotateY(180deg) translateZ(${TH/2}px)}
  .side{background:linear-gradient(#8d88a0,#4a4658 50%,#2a2735)}
  .top{left:${-PW/2+30}px;top:${-TH/2}px;width:${PW-60}px;height:${TH}px;transform:rotateX(90deg) translateZ(${PH/2}px)}
  .bot{left:${-PW/2+30}px;top:${-TH/2}px;width:${PW-60}px;height:${TH}px;transform:rotateX(-90deg) translateZ(${PH/2}px)}
  .rgt,.lft{left:${-TH/2}px;top:${-PH/2+30}px;width:${TH}px;height:${PH-60}px;background:linear-gradient(90deg,#7d7890,#4a4658 50%,#2a2735)}
  .rgt{transform:rotateY(90deg) translateZ(${PW/2}px)} .lft{transform:rotateY(-90deg) translateZ(${PW/2}px)}
  .port{position:absolute;left:${TH/2-4}px;top:${(PH-60)/2-16}px;width:8px;height:32px;border-radius:4px;background:#0c0b14}
  .shadow{position:absolute;left:${CX-260}px;top:390px;width:520px;height:40px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.45),transparent);filter:blur(4px)}
  ${only}</style></head><body><div class="bg"><svg width="800" height="450">${stars}</svg></div><div class="t">sonaroids.app</div><div class="shadow"></div>
  <div class="stage"><div class="rig"><div class="f back"></div><div class="f side top"></div><div class="f side bot"></div>
    <div class="f side rgt"><div class="port"></div></div><div class="f side lft"></div>
    <div class="f front"><div class="scr"><i style="left:0;top:0"></i><i style="right:0;top:0"></i><i style="right:0;bottom:0"></i><i style="left:0;bottom:0"></i></div><div class="isl"></div><div class="glare"></div></div>
  </div></div>${PV==='mix'?pills(lang,mode,hi):`<div class="s">${sub}</div>`}</body></html>`; }
/* v1.32, the playlist GIF's caption «Б1» (the maintainer: «вместо "ладонь в воздухе" — "сонар-управление (ладонь в воздухе вместо кнопок)"»):
   two plates, a title and a line under it in each */
function pills(lang,mode,hi){ if(mode!=='sub') return '';   // hi — which world of the four is on now: its square lit (the maintainer: «квадратики подсвечиваться по очереди со сменой миров»)
  const T=lang==='ru'?{a:'СОНАР-УПРАВЛЕНИЕ',as:'ладонь в воздухе вместо кнопок',b:'ПЛЕЙЛИСТ СКИНОВ',bs:'мир меняется прямо в полёте'}:{a:'SONAR CONTROL',as:'your palm in mid-air instead of buttons',b:'SKIN PLAYLIST',bs:'the world changes mid-flight'};
  const HAND='<svg width="24" height="26" viewBox="0 0 22 24"><path d="M5 22 C2 18 2 14 3 11 L3 6 C3 4.6 5 4.6 5 6 L5 11 L6 3 C6 1.6 8 1.6 8 3 L8 10 L9 2 C9 0.6 11 0.6 11 2 L11 10 L12 3.5 C12 2.1 14 2.1 14 3.5 L14 12 L16 9 C17 7.6 19 8.6 18 10 L15 17 C14 20 12 22 10 22 Z" fill="none" stroke="#7FE0C8" stroke-width="1.6"/><path d="M17 3 a5 5 0 0 1 3 4 M18.5 0.8 a8 8 0 0 1 3 6" stroke="#FFB347" stroke-width="1.4" fill="none"/></svg>';
  const SQ=[[0,1,'#3a2f6e'],[11,1,'#000'],[22,1,'#fff8e8'],[5.5,11,'#5a1f6e'],[16.5,11,'#a8c83a']];   // space, vector, notebook, neon, LCD — the playlist's order
  const PL='<svg width="38" height="26" viewBox="-1 -1 33 21" style="overflow:visible">'+SQ.map((q,k)=>k===hi?`<rect x="${q[0]-1.2}" y="${q[1]-1.2}" width="11.4" height="9.4" rx="2.2" fill="none" stroke="#7FE0C8" stroke-width="1" opacity=".55" style="filter:drop-shadow(0 0 2.5px #7FE0C8)"/><rect x="${q[0]}" y="${q[1]}" width="9" height="7" rx="1.5" fill="${q[2]}" stroke="#fff" stroke-width="1.5"/>`:
    `<rect x="${q[0]}" y="${q[1]}" width="9" height="7" rx="1.5" fill="${q[2]}" stroke="#7FE0C8" stroke-width=".8" opacity=".38"/>`).join('')+'</svg>';
  const st='position:absolute;top:394px;height:48px;border-radius:14px;border:2px solid #7FE0C8;background:rgba(27,26,46,.9);color:#E9E4F0;display:flex;align-items:center;gap:11px;padding:0 15px;box-shadow:0 0 14px rgba(127,224,200,.18);box-sizing:border-box';
  const tx=(t,u)=>`<div style="display:flex;flex-direction:column;line-height:1.15"><b style="font:800 17px system-ui,sans-serif;letter-spacing:.5px">${t}</b><small style="font:600 12.5px system-ui,sans-serif;color:#C9A9B6;letter-spacing:.3px">${u}</small></div>`;
  return `<div id="pa" style="${st}">${HAND}${tx(T.a,T.as)}</div><div id="pb" style="${st}">${PL}${tx(T.b,T.bs)}</div>
  <script>{ const a=document.getElementById('pa'), b=document.getElementById('pb'), gap=26, w=a.offsetWidth+gap+b.offsetWidth, x0=Math.round((690-w)/2); a.style.left=x0+'px'; b.style.left=(x0+a.offsetWidth+gap)+'px'; }</script>`; }
(async()=>{ if(!process.env.LAYERS_ONLY) fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const lay=await b.newPage({viewport:{width:800,height:450},deviceScaleFactor:X}); const meta={T,FPS,N,X,U:[]};
  const LAY=[['bg','en','bg'],['mask','en','mask'],['over','en','over'],['sub','en','sub_en'],['sub','ru','sub_ru']]; if(PV==='mix') for(const l of ['en','ru']) for(let k=0;k<5;k++) LAY.push(['sub',l,`sub_${l}_${k}`,k]);   // v1.32: the caption with each square lit
  for(const [mode,lang,name,hi] of LAY){
    fs.writeFileSync(path.join(OUT,'s.html'),scene(mode,lang,hi)); await lay.goto('file://'+path.join(OUT,'s.html')); await lay.waitForTimeout(150);
    if(mode==='bg') Object.assign(meta,await lay.evaluate(()=>{ const c=q=>{ const r=q.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]; };
      return {quad:[...document.querySelectorAll('.scr i')].map(c),port:c(document.querySelector('.port'))}; }));
    await lay.screenshot({path:path.join(OUT,name+'.png'),omitBackground:mode!=='bg'}); }
  fs.unlinkSync(path.join(OUT,'s.html'));
  for(let i=0;i<N;i++) meta.U.push(+U(i/FPS).toFixed(4));
  if(process.env.LAYERS_ONLY){ const old=JSON.parse(fs.readFileSync(path.join(OUT,'meta.json'),'utf8')); Object.assign(meta,{S:old.S,M:old.M,V:old.V,W:old.W}); fs.writeFileSync(path.join(OUT,'meta.json'),JSON.stringify(meta)); await b.close(); return; }   // v1.32: only the scene's layers again
  /* the games: game k plays its quarter and a little more on both sides (for the cross-fade), the palm from the same curve */
  const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:X}), file=G.patched(), M=2;
  if(PV==='mix'){ const W=22, g={fly:'space',mix:['space','vector','note','neon','lcd'],mixAt:[3.55,6.55,9.55,12.55],k:0.84,b:0.08,warm:2,gfx:'hd'};   // five worlds, 3 s each; the GIF starts W frames in — those first frames come back torn in at the loop (make_promo.py), so it joins without a jump   // space first, then the list in turn; the last change brings space back for the loop
    const st=await G.play(ctx,file,g,t=>g.b+g.k*U(t),g.warm,N+W,FPS,(j,buf)=>fs.writeFileSync(path.join(OUT,`g0_${String(j).padStart(4,"0")}.png`),buf));
    console.log('mix flight, frames 0 …',N+W-1,st.scr); meta.S=st.S; meta.W=W; }
  else for(let k=0;k<4;k++){ const g=GAMES[k], i0=k*Q-M, n=Q+2*M, t0=i0/FPS;
    const st=await G.play(ctx,file,g,t=>g.b+g.k*U(t0+t),g.warm,n,FPS,(j,buf)=>fs.writeFileSync(path.join(OUT,`g${k}_${String(((i0+j)%N+N)%N).padStart(4,"0")}.png`),buf));
    console.log('game',k,g.fly||g.race,PV,'frames',i0,'…',i0+n-1,st.scr); meta.S=st.S; }
  meta.M=PV==='mix'?meta.W:M; meta.V=PV; fs.writeFileSync(path.join(OUT,'meta.json'),JSON.stringify(meta));
  await b.close(); fs.unlinkSync(file); })();
