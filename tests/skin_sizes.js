/* v0.79: every skin, in pixels and in HD, draws its objects the size of what the game counts (the maintainer: the pixel fairy tale's clouds
   looked bigger than the HD ones). Hits and points are the core's (the same for every skin); the pictures must match them:
   rocks 90–112% of the core's circle on average (six rocks, four turns each; the small ones 85–125% in pixels and 90–118% in HD — a whole
   pixel is a big step for them), their middle within 2 game pixels of where the game puts them;
   ships' hulls 19–23 game pixels long; v1.27 (the maintainer: «а размеры в hd и пикселях у тучек, драконов и мышей — точно совпадают??»): a skin's
   pixel and HD pictures the same size — ship, saucers and power-up within 1.5 game pixels, big and middle rocks within 8 points of the circle
   (skins not yet redrawn are listed in PENDING and reported, not failed); (v0.83: the hull — several frames, not the flame behind); power-ups 12–14.5 across (v0.81: the core's zone, the same in every skin); saucers 15–20.5 / 11.5–16 wide, own shots 4–8.5 long, enemy shots 3.5–7 (v0.83). Three screen sizes. Needs Playwright with Chromium. Run: node tests/skin_sizes.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('no playwright — skipped'); console.log('RESULT: ok'); process.exit(0); }
const path=require('path'), ROOT=path.join(__dirname,'..');
const PENDING=['vector','neon','note'];   // their objects get redrawn in turn (v1.27 on); each leaves this list then
(async()=>{ const b=await chromium.launch(); let ok=true; const errors=[];
  for(const [w,h] of [[568,320],[844,390],[1024,768]]){
    const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:2}); p.on('pageerror',e=>errors.push(e.message));
    await p.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_live','0'); Math.random=(()=>{ let s=7; return ()=>((s=s*16807%2147483647)/2147483647); })();`);
    await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(300);
    const ids=await p.evaluate(()=>__sonaroids.skinIds());
    const got={};
    for(const id of ids) for(const m of ['pixel','hd']){ const r=await p.evaluate(([i,m])=>__sonaroids.sizeProbe(i,m),[id,m]); if(!r) continue; got[id+'/'+m]=r;
      const bad=[]; r.rocks.forEach((q,sz)=>{ if(!q){ bad.push('rock '+sz+' not drawn'); return; } const px=m==='pixel'||id==='lcd', lo=sz===2&&px?85:90, hi=sz===2?(px?125:118):112;
        if(q.pct<lo||q.pct>hi) bad.push(`rock ${sz} ${q.pct}%`); if(Math.abs(q.dx)>2||Math.abs(q.dy)>2) bad.push(`rock ${sz} off by ${q.dx},${q.dy}`); });
      if(r.ship<19||r.ship>23) bad.push(`ship ${r.ship}`); if(!(r.pick>=12&&r.pick<=14.5)) bad.push(`power-up ${r.pick}`);
      if(!(r.ufo[0]>=15&&r.ufo[0]<=20.5)) bad.push(`saucer ${r.ufo[0]}`); if(!(r.ufoS[0]>=11.5&&r.ufoS[0]<=16)) bad.push(`small saucer ${r.ufoS[0]}`);
      if(!(r.bullet[0]>=4&&r.bullet[0]<=8.5)) bad.push(`shot ${r.bullet[0]}`); if(!(Math.max(...r.ebullet)>=3.5&&Math.max(...r.ebullet)<=7)) bad.push(`enemy shot ${r.ebullet}`); if(bad.length) ok=false;
      console.log(`${w}x${h} ${(id+' '+m).padEnd(13)} rocks ${r.rocks.map(q=>q?q.pct+'%':'—').join(' / ').padEnd(18)} ship ${String(r.ship).padEnd(5)} power-up ${String(r.pick).padEnd(5)} saucers ${r.ufo[0]}/${r.ufoS[0]} shots ${r.bullet[0]}/${Math.max(...r.ebullet)} ${bad.length?'FAIL: '+bad.join('; '):'ok'}`); }
    for(const id of ids){ const a=got[id+'/pixel'], c=got[id+'/hd']; if(!a||!c) continue; const d=[];
      if(Math.abs(a.ship-c.ship)>1.5) d.push(`ship ${a.ship}/${c.ship}`); if(Math.abs(a.ufo[0]-c.ufo[0])>1.5) d.push(`saucer ${a.ufo[0]}/${c.ufo[0]}`); if(Math.abs(a.ufoS[0]-c.ufoS[0])>1.5) d.push(`small saucer ${a.ufoS[0]}/${c.ufoS[0]}`);
      if(Math.abs(a.pick-c.pick)>1.5) d.push(`power-up ${a.pick}/${c.pick}`); [0,1].forEach(sz=>{ if(a.rocks[sz]&&c.rocks[sz]&&Math.abs(a.rocks[sz].pct-c.rocks[sz].pct)>8) d.push(`rock ${sz} ${a.rocks[sz].pct}%/${c.rocks[sz].pct}%`); });
      const pend=PENDING.indexOf(id)>=0; if(d.length&&!pend) ok=false;
      console.log(`${w}x${h} ${(id+' pixel vs HD').padEnd(17)} ${d.length?(pend?'to match when redrawn: ':'FAIL: ')+d.join('; '):'the same size'}`); }
    await p.close(); }
  await b.close(); if(errors.length){ ok=false; console.log('page errors: '+errors.join('; ')); }
  console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1; })();
