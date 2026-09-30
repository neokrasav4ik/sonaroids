/* The promo GIF (v1.03), step 1 of 2: the pictures that do not come from Python.
   One big phone in the air, turned so the camera's end is nearer, the real games on its screen (SonaFly space HD → SonaRace notebook →
   SonaFly neon HD → SonaRace candy, 3.75 s each), the palm at the charging end moving to and from it (two waves: big slow + small quick),
   the ship or the car following it (the palm nearer — lower). Agreed with Den on 30 Sep 2026 from sketches.
   Writes promo/frames_promo/: g<k>_<i>.png — game k's screen at the GIF's frame i; layers bg.png (the scene without screen, palm, arcs
   and subtitle), mask.png (the screen's shape), over.png (the island and the glass glare), sub_en.png / sub_ru.png; meta.json.
   Then python3 promo/make_promo.py puts them together. Run from the repository: NODE_PATH=$(npm root -g) node promo/make_promo.js */
const {chromium}=require('playwright'), fs=require('fs'), path=require('path'), G=require('./promo_game.js');
const OUT=path.join(__dirname,'frames_promo'), T=15, FPS=20, N=T*FPS, Q=N/4, X=2;   // X — rendered at twice the GIF's size
/* the palm: 0 — near the phone (the ship low), 1 — far (high); loops every T seconds (Den's pick «второй») */
const U=t=>0.5+0.3*Math.sin(2*Math.PI*t*4/T)+0.14*Math.sin(2*Math.PI*t*11/T+1.0);
const GAMES=[{fly:'space',k:0.84,b:0.08,warm:2},{race:'note',k:0.44,b:0.28,warm:2},{fly:'neon',k:0.84,b:0.08,warm:3},{race:'candy',k:0.44,b:0.28,warm:9}];
const PW=530, PH=248, TH=24, SW=500, SH=231, CX=310, CY=240, RIG='rotateY(18deg)';
function scene(mode,lang){
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
  </div></div><div class="s">${sub}</div></body></html>`; }
(async()=>{ fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const lay=await b.newPage({viewport:{width:800,height:450},deviceScaleFactor:X}); const meta={T,FPS,N,X,U:[]};
  for(const [mode,lang,name] of [['bg','en','bg'],['mask','en','mask'],['over','en','over'],['sub','en','sub_en'],['sub','ru','sub_ru']]){
    fs.writeFileSync(path.join(OUT,'s.html'),scene(mode,lang)); await lay.goto('file://'+path.join(OUT,'s.html')); await lay.waitForTimeout(150);
    if(mode==='bg') Object.assign(meta,await lay.evaluate(()=>{ const c=q=>{ const r=q.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]; };
      return {quad:[...document.querySelectorAll('.scr i')].map(c),port:c(document.querySelector('.port'))}; }));
    await lay.screenshot({path:path.join(OUT,name+'.png'),omitBackground:mode!=='bg'}); }
  fs.unlinkSync(path.join(OUT,'s.html'));
  for(let i=0;i<N;i++) meta.U.push(+U(i/FPS).toFixed(4));
  /* the games: game k plays its quarter and a little more on both sides (for the cross-fade), the palm from the same curve */
  const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:X}), file=G.patched(), M=2;
  for(let k=0;k<4;k++){ const g=GAMES[k], i0=k*Q-M, n=Q+2*M, t0=i0/FPS;
    const st=await G.play(ctx,file,g,t=>g.b+g.k*U(t0+t),g.warm,n,FPS,(j,buf)=>fs.writeFileSync(path.join(OUT,`g${k}_${String(((i0+j)%N+N)%N).padStart(4,"0")}.png`),buf));
    console.log('game',k,g.fly||g.race,'frames',i0,'…',i0+n-1,st); }
  meta.M=M; fs.writeFileSync(path.join(OUT,'meta.json'),JSON.stringify(meta));
  await b.close(); fs.unlinkSync(file); })();
