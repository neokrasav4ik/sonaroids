/* The games' screen and SonaRace pictures for the readme (v1.02): the game itself in headless Chromium, a race set up still.
   Run from the repository: NODE_PATH=$(npm root -g) node promo/make_shots.js  (needs Playwright) */
const {chromium}=require('playwright'), path=require('path'), ROOT=path.join(__dirname,'..');
(async()=>{ const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:1.5});
  for(const [skin,gfx,name] of [['candy','hd','sonarace_candy'],['note','hd','sonarace_notebook'],['candy','pixel','sonarace_pixels']]){
    const p=await ctx.newPage(); p.on('pageerror',e=>console.log('ERR',e.message));
    await p.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_lang','en'); localStorage.setItem('sonaroids_gfx','${gfx}'); localStorage.setItem('sonaroids_race_skin','${skin}');`);
    await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(600);
    if(name==='sonarace_candy'){ await p.screenshot({path:path.join(__dirname,'games.png')}); }
    await p.evaluate(()=>{ __sonaroids.fake(); __sonaroids.act.hub_race(); __sonaroids.race(); __sonaroids.go('count'); }); await p.waitForTimeout(300);
    await p.evaluate(()=>{ const S=__sonaroids, g=S.state().g; g.state='play'; g.opt.speed=0; g.opt.burn=false; g.v=0; g.car.inv=0; g.fuel=70; g.score=12480;
      let bd=1500,bs=1e9; for(let d=1500;d<8000;d+=10){ let e=0; for(let x=-40;x<=420;x+=20) e=Math.max(e,Math.abs(Race.centre(g,d+x)-90)); if(e<bs){ bs=e; bd=d; } } g.d=bd; g.t=150;
      const cx=g.d+40; g.nextCar=g.nextGift=g.nextSoda=g.nextCoin=g.nextPud=g.d+1e7;
      g.items=[{id:1,type:'fuel',x:cx+95,o:-16},{id:3,type:'tmagnet',x:cx+215,o:10},{id:4,type:'bubble',x:cx+300,o:-12}];
      for(let i=0;i<5;i++) g.items.push({id:10+i,type:'coin',x:cx+130+i*16,o:14,line:99});
      g.puddles=[{id:9,x:cx+255,o:-18,r:8}]; g.cars=[[0,160,-14],[3,275,16],[5,345,-4]].map((q,k)=>({id:30+k,x:cx+q[1],o:q[2],to:q[2],v:0,kind:q[0],turnT:99}));
      g.car.y=Race.centre(g,g.d+Race.CAR_X)+6; g.car.turbo=2; S.go('play'); });
    await p.waitForTimeout(700); await p.screenshot({path:path.join(__dirname,name+'.png')}); await p.close(); }
  await b.close(); })();
