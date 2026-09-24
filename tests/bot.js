/* A simple bot player for tuning the difficulty: it lines up with the nearest rock ahead, dodges rocks, saucers and their shots
   that are close, and grabs power-ups on the way. Human limits: it reacts 0.25 s late, its palm shakes a little and
   moves at most about one screen height per half second. Usage: node tests/bot.js [games] [skill 0…1] */
const Core=require('../src/13_core.js');
function botGame(seed,skill){
  const g=Core.create(seed,390), FH=Core.FH, M=Core.MARGIN, hist=[], delay=Math.round(0.25*60*(1.6-skill)); let hand=0.5, noise=0, s=seed>>>0;
  const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; };
  let firstUfo=null, lvl3=null;
  while(g.state==='play'&&g.t<1200){
    hist.push(JSON.parse(JSON.stringify({rocks:g.rocks,ebullets:g.ebullets||[],ufo:g.ufo||null,picks:g.picks||[],y:g.ship.y})));
    const v=hist.length>delay?hist[hist.length-1-delay]:hist[0], y=g.ship.y, X=g.ship.x+3;
    let ty=FH/2, best=1e9;
    v.rocks.forEach(r=>{ const dx=r.x-X; if(dx>10&&dx<best&&dx<220){ best=dx; ty=r.y; } });
    if(v.ufo&&v.ufo.x-X<250) ty=v.ufo.y;
    v.picks.forEach(p=>{ const dx=p.x-X; if(dx>0&&dx<90) ty=p.y; });
    let danger=0; const threat=(ox,oy,rad,dx)=>{ if(dx>-6&&dx<30+rad&&Math.abs(oy-y)<rad+10){ danger+=oy>y?-1:1; } };
    v.rocks.forEach(r=>threat(r.x,r.y,r.r,r.x-X)); v.ebullets.forEach(b=>threat(b.x,b.y,3,b.x-X)); if(v.ufo) threat(v.ufo.x,v.ufo.y,7,v.ufo.x-X);
    if(danger) ty=y+Math.sign(danger)*30;
    let want=(FH-M-ty)/(FH-2*M); want=Math.max(0,Math.min(1,want));
    noise=noise*0.95+(rnd()-0.5)*0.02*(1.5-skill); const step=1/30;
    hand+=Math.max(-step,Math.min(step,want-hand)); const h=Math.max(0,Math.min(1,hand+noise));
    Core.step(g,h);
    if(g.events.includes('ufo')&&firstUfo===null) firstUfo=g.t; if(g.level>=3&&lvl3===null) lvl3=g.t;
  }
  return {t:g.t,score:g.score,level:g.level,firstUfo,lvl3};
}
if(require.main===module){
  const n=+(process.argv[2]||20), skill=+(process.argv[3]||0.6), res=[];
  for(let i=0;i<n;i++) res.push(botGame(1000+i,skill));
  const med=a=>{ const b=a.filter(x=>x!==null).sort((p,q)=>p-q); return b.length?b[b.length>>1]:null; };
  const f=x=>x===null?'—':(x/60).toFixed(1)+' min';
  console.log(`bot skill ${skill}, ${n} games: lives ${f(med(res.map(r=>r.t)))} (range ${f(Math.min(...res.map(r=>r.t)))}–${f(Math.max(...res.map(r=>r.t)))}), score ${med(res.map(r=>r.score))}, level ${med(res.map(r=>r.level))}; level 3 at ${f(med(res.map(r=>r.lvl3)))}, first saucer at ${f(med(res.map(r=>r.firstUfo)))}`);
}
module.exports=botGame;
