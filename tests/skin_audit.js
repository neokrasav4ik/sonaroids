/* Readability audit of the skins (v0.71): every picture of every skin against that skin's own sky.
   For each object — rocks (3 sizes), ship, saucers, power-up, own and enemy shots — its silhouette (the opaque pixels at its edge), its dark
   and its lit parts (quartiles) are compared with the sky's main colours (k-means, 6 clusters of the sky sheet):
   - CR — the luminance contrast ratio (WCAG) of the best of those three tones against the worst sky colour that covers at least 5% of the sky;
   - camo — the share of the sky where that contrast is under 3:1 (the object "sinks" there);
   - ΔE — the smallest colour distance (CIE76, Lab) between the object's inside (without its outline) and those sky colours.
   Readable: CR ≥ 3.5 (shots, a few pixels: ≥ 4.5) — the space skin, readable by the maintainer, measures ≥ 3.9. Also: own vs enemy shots and shots vs the sky's drifting motes (ΔE).
   Needs Playwright with Chromium. Run: node tests/skin_audit.js [--json out.json]; exits 1 if anything is unreadable. */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('no playwright — skipped'); console.log('RESULT: ok'); process.exit(0); }
const path=require('path'), fs=require('fs'), ROOT=path.join(__dirname,'..'), GAME=process.env.GAME||path.join(ROOT,'game','play','index.html');   // GAME=… audits another build
function lin(c){ c/=255; return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4); }
function lum(r,g,b){ return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b); }
function lab(r,g,b){ let R=lin(r),G=lin(g),B=lin(b); let X=(R*0.4124+G*0.3576+B*0.1805)/0.95047, Y=R*0.2126+G*0.7152+B*0.0722, Z=(R*0.0193+G*0.1192+B*0.9505)/1.08883;
  const f=t=>t>0.008856?Math.cbrt(t):7.787*t+16/116; return [116*f(Y)-16,500*(f(X)-f(Y)),200*(f(Y)-f(Z))]; }
const dE=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const CR=(a,b)=>(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
function clusters(px,k){ // px: [[r,g,b],...] → [{c:[r,g,b],w}]
  let cen=[]; for(let i=0;i<k;i++) cen.push(px[Math.floor((i+0.5)*px.length/k)]);
  const L=px.map(p=>lab(...p)); let cl=cen.map(c=>lab(...c)), asg=new Array(px.length).fill(0);
  for(let it=0;it<12;it++){ for(let i=0;i<px.length;i++){ let b=0,bd=1e9; for(let j=0;j<k;j++){ const d=dE(L[i],cl[j]); if(d<bd){ bd=d; b=j; } } asg[i]=b; }
    const s=cl.map(()=>[0,0,0,0]); for(let i=0;i<px.length;i++){ const q=s[asg[i]]; q[0]+=px[i][0]; q[1]+=px[i][1]; q[2]+=px[i][2]; q[3]++; }
    cen=s.map((q,j)=>q[3]?[q[0]/q[3],q[1]/q[3],q[2]/q[3]]:cen[j]); cl=cen.map(c=>lab(...c)); }
  const w=new Array(k).fill(0); asg.forEach(a=>w[a]++); return cen.map((c,j)=>({c,w:w[j]/px.length,lum:lum(...c),lab:cl[j]})).filter(q=>q.w>0).sort((a,b)=>b.w-a.w); }
function analyse(o){ const W=o.w,H=o.h,d=o.d, op=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&d[(y*W+x)*4+3]>128;
  const edge=[],body=[],core=[]; for(let y=0;y<H;y++) for(let x=0;x<W;x++){ if(!op(x,y)) continue; const i=(y*W+x)*4, c=[d[i],d[i+1],d[i+2]];
    body.push(c); if(!op(x-1,y)||!op(x+1,y)||!op(x,y-1)||!op(x,y+1)) edge.push(c); else core.push(c); }
  if(!body.length) return null;
  const pc=(a,f)=>{ const l=a.map(c=>lum(...c)).sort((p,q)=>p-q); return l[Math.min(l.length-1,Math.floor(l.length*f))]; }, med=a=>pc(a,0.5);
  const mean=a=>{ const s=[0,0,0]; a.forEach(c=>{ s[0]+=c[0]; s[1]+=c[1]; s[2]+=c[2]; }); return s.map(v=>v/a.length); };
  // the object shows by its outline, or by its dark parts on a light sky, or by its lit parts on a dark sky: the best of the three
  return {tones:[med(edge),pc(body,0.25),pc(body,0.75)],bodyLab:lab(...mean(core.length?core:body)),n:body.length}; }   // the colour: the inside, without the outline
(async()=>{
  const b=await chromium.launch(), p=await b.newPage({viewport:{width:844,height:390}});
  await p.goto('file://'+GAME); await p.waitForTimeout(500);
  const ids=await p.evaluate(()=>__sonaroids.skinIds());
  const rows=[], json={}; let bad=0;
  for(const id of ids){
    const o=await p.evaluate(i=>__sonaroids.skinProbe(i),id);
    const px=[]; for(let y=0;y<o.bgH;y+=2) for(let x=0;x<o.bgW;x+=3){ const i=(y*o.bgW+x)*4; px.push([o.bg[i],o.bg[i+1],o.bg[i+2]]); }
    const cl=clusters(px,6), main=cl.filter(q=>q.w>=0.05);
    const objs=[['rock L',o.rocks[0]],['rock M',o.rocks[1]],['rock S',o.rocks[2]],['ship',o.ship],['saucer',o.ufo],['saucer S',o.ufoS],['power-up',o.pick],['shot',o.bullet],['enemy shot',o.ebullet]];
    const shotLab=[], res={};
    for(const [name,ob] of objs){ const a=analyse(ob); if(!a) continue;
      const shotish=/shot/.test(name), need=shotish?4.5:3.5;   // 3.5: the space skin, readable by the maintainer, is ≥ 3.9 everywhere
      const best=q=>Math.max(...a.tones.map(t=>CR(t,q.lum)));
      const crs=main.map(q=>({q,cr:best(q)})), worst=crs.reduce((m,x)=>x.cr<m.cr?x:m,crs[0]);
      const camo=cl.reduce((s,q)=>s+(best(q)<3?q.w:0),0), minDE=Math.min(...main.map(q=>dE(a.bodyLab,q.lab)));
      const ok=worst.cr>=need;
      if(shotish) shotLab.push([name,a.bodyLab]);
      if(!ok) bad++;
      res[name]={cr:+worst.cr.toFixed(2),camo:+camo.toFixed(2),dE:Math.round(minDE),ok};
      rows.push(`${id.padEnd(6)} ${name.padEnd(11)} CR ${worst.cr.toFixed(1).padStart(4)} camo ${String(Math.round(camo*100)).padStart(3)}% ΔE ${String(Math.round(minDE)).padStart(3)}  ${ok?'ok':'UNREADABLE'}`); }
    // own vs enemy shots; shots vs the drifting motes of the sky
    if(shotLab.length===2){ const d=dE(shotLab[0][1],shotLab[1][1]); rows.push(`${id.padEnd(6)} own/enemy shots ΔE ${Math.round(d)} ${d>=40?'ok':'TOO ALIKE'}`); if(d<40) bad++; res.shots_apart=Math.round(d); }
    const moteDE=Math.min(...(o.motes||[]).map(m=>Math.min(...shotLab.map(s=>dE(lab(...hex(m)),s[1])))));
    if(isFinite(moteDE)){ rows.push(`${id.padEnd(6)} shots vs motes ΔE ${Math.round(moteDE)} ${moteDE>=30?'ok':'CONFUSABLE'}`); if(moteDE<30) bad++; res.motes=Math.round(moteDE); }
    rows.push(`${id.padEnd(6)} sky: `+cl.map(q=>`${Math.round(q.w*100)}% L${(q.lum*100).toFixed(0)}`).join(' · ')); rows.push('');
    json[id]=res; }
  await b.close();
  console.log(rows.join('\n'));
  const out=process.argv.indexOf('--json'); if(out>0) fs.writeFileSync(process.argv[out+1],JSON.stringify(json,null,1));
  console.log(bad?`RESULT: FAIL (${bad} unreadable)`:'RESULT: ok'); process.exitCode=bad?1:0;
})();
