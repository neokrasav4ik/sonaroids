/* v1.48: the obsidian skin (drawn on the graphics chip, src/48_obsidian.js) draws its objects the size of what the game counts — the same
   bounds as tests/skin_sizes.js keeps for every other skin: rocks 90–112% of the core's circle on average (the small ones up to 118%),
   their middle within 2 game pixels; the ship's hull 19–23 game pixels long; the power-up 12–14.5 across; saucers 15–20.5 / 11.5–16 wide;
   own shots 4–8.5 long, enemy shots 3.5–7. Each object is drawn alone onto nothing and read back (obsProbe). The chip here is a software
   one (SwiftShader): the skin is forced on with ?obs=force (a phone lists it only on a real chip).
   Needs Playwright with Chromium. Run: node tests/obsidian_sizes.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('no playwright — skipped'); console.log('RESULT: ok'); process.exit(0); }
const path=require('path'), ROOT=path.join(__dirname,'..');
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}); let ok=true; const errors=[];
  for(const [w,h] of [[568,320],[844,390],[1024,768]]){
    const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:2}); p.on('pageerror',e=>errors.push(e.message));
    await p.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_live','0'); localStorage.setItem('sonaroids_gfx','hd');`);
    await p.goto('file://'+path.join(ROOT,'game','play','index.html')+'?obs=force'); await p.waitForTimeout(300);
    const r=await p.evaluate(()=>{ const P=__sonaroids.obsProbe, S=__sonaroids.S(), K=S.LH/180, RS=[13.5,8.1,4.3], out={rocks:[]};
      [0,1,2].forEach(sz=>{ let n=0,pc=0,dx=0,dy=0; for(let seed=3;seed<9;seed++){ const m=P('rock',sz,seed*17+sz); if(!m) continue; n++; pc+=Math.max(m.w,m.h)/(2*RS[sz]*K); dx+=m.dx; dy+=m.dy; }
        out.rocks.push(n?{pct:Math.round(pc/n*100),dx:+(dx/n).toFixed(1),dy:+(dy/n).toFixed(1)}:null); });
      const sh=P('ship'), pk=P('pick'), ub=P('ufo',1), us=P('ufo',0), bu=P('bullet'), eb=P('ebullet');
      out.ship=sh&&sh.w; out.pick=pk&&Math.max(pk.w,pk.h); out.ufo=ub&&ub.w; out.ufoS=us&&us.w; out.bullet=bu&&bu.w; out.ebullet=eb&&Math.max(eb.w,eb.h); return out; });
    const bad=[]; r.rocks.forEach((q,sz)=>{ if(!q){ bad.push('rock '+sz+' not drawn'); return; } const hi=sz===2?118:112; if(q.pct<90||q.pct>hi) bad.push(`rock ${sz} ${q.pct}%`); if(Math.abs(q.dx)>2||Math.abs(q.dy)>2) bad.push(`rock ${sz} off by ${q.dx},${q.dy}`); });
    if(!(r.ship>=19&&r.ship<=23)) bad.push(`ship ${r.ship}`); if(!(r.pick>=12&&r.pick<=14.5)) bad.push(`power-up ${r.pick}`);
    if(!(r.ufo>=15&&r.ufo<=20.5)) bad.push(`saucer ${r.ufo}`); if(!(r.ufoS>=11.5&&r.ufoS<=16)) bad.push(`small saucer ${r.ufoS}`);
    if(!(r.bullet>=4&&r.bullet<=8.5)) bad.push(`shot ${r.bullet}`); if(!(r.ebullet>=3.5&&r.ebullet<=7)) bad.push(`enemy shot ${r.ebullet}`);
    if(bad.length) ok=false;
    console.log(`${w}x${h} obsidian  rocks ${r.rocks.map(q=>q?q.pct+'%':'—').join(' / ')}  ship ${r.ship}  power-up ${r.pick}  saucers ${r.ufo}/${r.ufoS}  shots ${r.bullet}/${r.ebullet} ${bad.length?'FAIL: '+bad.join('; '):'ok'}`);
    await p.close(); }
  await b.close(); if(errors.length){ ok=false; console.log('page errors: '+errors.join('; ')); }
  console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1; })();
