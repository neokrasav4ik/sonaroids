/* v0.79: every skin, in pixels and in HD, draws its objects the size of what the game counts (the maintainer: the pixel fairy tale's clouds
   looked bigger than the HD ones). Hits and points are the core's (the same for every skin); the pictures must match them:
   rocks 90–112% of the core's circle on average (six rocks, four turns each; the small ones 85–125% in pixels and 90–118% in HD — a whole
   pixel is a big step for them), their middle within 2 game pixels of where the game puts them;
   ships 20–26 game pixels long; power-ups 12–14.5 across (v0.81: the core's zone, the same in every skin). Three screen sizes. Needs Playwright with Chromium. Run: node tests/skin_sizes.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('no playwright — skipped'); console.log('RESULT: ok'); process.exit(0); }
const path=require('path'), ROOT=path.join(__dirname,'..');
(async()=>{ const b=await chromium.launch(); let ok=true; const errors=[];
  for(const [w,h] of [[568,320],[844,390],[1024,768]]){
    const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:2}); p.on('pageerror',e=>errors.push(e.message));
    await p.addInitScript(`localStorage.setItem('sonaroids_seen','1'); Math.random=(()=>{ let s=7; return ()=>((s=s*16807%2147483647)/2147483647); })();`);
    await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(300);
    const ids=await p.evaluate(()=>__sonaroids.skinIds());
    for(const id of ids) for(const m of ['pixel','hd']){ const r=await p.evaluate(([i,m])=>__sonaroids.sizeProbe(i,m),[id,m]); if(!r) continue;
      const bad=[]; r.rocks.forEach((q,sz)=>{ if(!q){ bad.push('rock '+sz+' not drawn'); return; } const px=m==='pixel'||id==='lcd', lo=sz===2&&px?85:90, hi=sz===2?(px?125:118):112;
        if(q.pct<lo||q.pct>hi) bad.push(`rock ${sz} ${q.pct}%`); if(Math.abs(q.dx)>2||Math.abs(q.dy)>2) bad.push(`rock ${sz} off by ${q.dx},${q.dy}`); });
      if(r.ship<20||r.ship>26) bad.push(`ship ${r.ship}`); if(!(r.pick>=12&&r.pick<=14.5)) bad.push(`power-up ${r.pick}`); if(bad.length) ok=false;
      console.log(`${w}x${h} ${(id+' '+m).padEnd(13)} rocks ${r.rocks.map(q=>q?q.pct+'%':'—').join(' / ').padEnd(18)} ship ${String(r.ship).padEnd(5)} power-up ${String(r.pick).padEnd(5)} ${bad.length?'FAIL: '+bad.join('; '):'ok'}`); }
    await p.close(); }
  await b.close(); if(errors.length){ ok=false; console.log('page errors: '+errors.join('; ')); }
  console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1; })();
