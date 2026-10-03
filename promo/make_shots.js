/* The games' screen and SonaRace pictures for the readme (v1.02): the game itself in headless Chromium, a race set up still.
   Run from the repository: NODE_PATH=$(npm root -g) node promo/make_shots.js  (needs Playwright) */
const {chromium}=require('playwright'), path=require('path'), ROOT=path.join(__dirname,'..');
(async()=>{ const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:1.5});
  for(const [skin,gfx,name,d0,d1] of [['candy','hd','sonarace_candy'],['note','hd','sonarace_notebook'],['candy','pixel','sonarace_pixels'],['pirate','hd','sonarace_pirates',3900,4900],['pirate','pixel','sonarace_pirates_pixels',2450,3350]]){   // v1.06: the pirates — the lagoon in HD, the fjords in pixels (where the zones are: src/48_racepirate.js, rpZone)
    const p=await ctx.newPage(); p.on('pageerror',e=>console.log('ERR',e.message));
    await p.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_live','0'); localStorage.setItem('sonaroids_lang','en'); localStorage.setItem('sonaroids_gfx','${gfx}'); localStorage.setItem('sonaroids_race_skin','${skin}');`);
    await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(600);
    if(name==='sonarace_candy'){ await p.screenshot({path:path.join(__dirname,'games.png')}); }
    await p.evaluate(()=>{ __sonaroids.fake(); __sonaroids.act.hub_race(); __sonaroids.race(); __sonaroids.go('count'); }); await p.waitForTimeout(300);
    await p.evaluate(([d0,d1])=>{ const S=__sonaroids, g=S.state().g; g.state='play'; g.opt.speed=0; g.opt.burn=false; g.v=0; g.car.inv=0; g.fuel=70; g.score=12480;
      let bd=d0||1500,bs=1e9; for(let d=d0||1500;d<(d1||8000);d+=10){ let e=0; for(let x=-40;x<=420;x+=20) e=Math.max(e,Math.abs(Race.centre(g,d+x)-90)); if(e<bs){ bs=e; bd=d; } } g.d=bd; g.t=150;
      const cx=g.d+40; g.nextCar=g.nextGift=g.nextSoda=g.nextCoin=g.nextPud=g.d+1e7;
      g.items=[{id:1,type:'fuel',x:cx+95,o:-16},{id:3,type:'tmagnet',x:cx+215,o:10},{id:4,type:'bubble',x:cx+300,o:-12}];
      for(let i=0;i<5;i++) g.items.push({id:10+i,type:'coin',x:cx+130+i*16,o:14,line:99});
      g.puddles=[{id:9,x:cx+255,o:-18,r:8}]; g.cars=[[0,160,-14],[3,275,16],[5,345,-4]].map((q,k)=>({id:30+k,x:cx+q[1],o:q[2],to:q[2],v:0,kind:q[0],turnT:99}));
      g.car.y=Race.centre(g,g.d+Race.CAR_X)+6; g.car.turbo=2; S.go('play'); },[d0,d1]);
    await p.waitForTimeout(700); await p.screenshot({path:path.join(__dirname,name+'.png')}); await p.close(); }
  /* v1.32: SonaFly's six skins in one picture (HD, a still moment of play: rocks, a saucer, a power-up, shots) → promo/sonafly_skins.png */
  const fs=require('fs'), SK=[['space','Space'],['fairy','Fairy tale'],['vector','Vector 80s'],['neon','Neon'],['note','Notebook'],['lcd','Retro LCD']], tiles=[];
  for(const [skin] of SK){ const p=await ctx.newPage(); p.on('pageerror',e=>console.log('ERR',e.message));
    await p.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_lang','en'); localStorage.setItem('sonaroids_gfx','hd'); localStorage.setItem('sonaroids_skin','${skin}'); localStorage.setItem('sonaroids_skin_list','${skin}');`);
    await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(500);
    await p.evaluate(()=>{ const S=__sonaroids; S.fake(); const g=S.state().g; g.state='play'; g.ship.y=g.FH*0.52; g.ufo={id:99,kind:'big',x:g.FW*0.74,y:g.FH*0.3,ty:g.FH*0.3,tyT:0,fire:99,hp:2,seen:1,dodgeT:0,hitT:0}; g.ufoT=99;
      g.picks=[{type:'shield',x:g.FW*0.46,y:g.FH*0.26}]; g.ebullets=[{x:g.FW*0.6,y:g.FH*0.36,vx:-10,vy:0}]; S.go('play'); });
    await p.waitForTimeout(1400); const f=path.join(__dirname,'_tile_'+skin+'.png'); await p.screenshot({path:f}); tiles.push(f); await p.close(); }
  const g=await b.newPage({viewport:{width:3*422+4*10,height:2*(195+24)+10},deviceScaleFactor:2});
  await g.setContent(`<body style="margin:0;background:#1B1A2E;display:grid;grid-template-columns:repeat(3,422px);gap:10px;padding:10px;font:700 13px system-ui,sans-serif;color:#C9A9B6">${SK.map((s,i)=>`<div><img src="data:image/png;base64,${fs.readFileSync(tiles[i]).toString('base64')}" style="width:422px;height:195px;display:block;border-radius:6px"><div style="text-align:center;margin-top:4px">${s[1]}</div></div>`).join('')}</body>`);
  await g.waitForTimeout(300); await g.screenshot({path:path.join(__dirname,'sonafly_skins.png'),fullPage:true}); tiles.forEach(f=>fs.unlinkSync(f));
  await b.close(); })();
