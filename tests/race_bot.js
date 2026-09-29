/* A simple bot driver for tuning the race (src/14_race.js): it keeps to the road, goes round the cars ahead, goes for sodas, gifts and
   coins, and steps round syrup. Human limits as in tests/bot.js: it sees 0.25 s late (more for a weaker driver), its palm shakes a little
   and moves at most about one screen height per half second. Usage: node tests/race_bot.js [races] [skill 0…1] */
const Race=require('../src/14_race.js');
function botRace(seed,skill,FW){
  const g=Race.create(seed,FW||390), FH=Race.FH, M=Race.MARGIN, delay=Math.round(0.25*60*(1.6-skill)), hist=[];
  let hand=0.5, noise=0, s=seed>>>0; const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; };
  // v0.87: the palm sets the place across the road, so the bot thinks in places across the road too (o: from the road's middle)
  const seen=()=>({d:g.d,cars:g.cars.map(c=>({x:c.x,o:c.o})),items:g.items.map(p=>({x:p.x,o:p.o,type:p.type})),puds:g.puddles.map(p=>({x:p.x,o:p.o,r:p.r}))});
  let offT=0, fuelLow=null;
  while(g.state!=='over'&&g.t<1500){
    hist.push(seen()); const v=hist.length>delay?hist[hist.length-1-delay]:hist[0]; if(hist.length>delay+2) hist.shift();
    const cx=g.d+g.car.x, here=Race.at(g,cx), o=g.car.y-here.c, road=Race.at(g,cx+30*(1+skill));
    // it tries places across the road and takes the best: away from cars and syrup ahead, towards gifts, not too far from where it is
    const want=p=>p.type==='fuel'?(g.fuel<70?4:1.5):p.type==='coin'?1:2;
    let to=0, best=-1e9;
    for(let oo=-road.hw+6;oo<=road.hw-6;oo+=3){ let sc=-Math.abs(oo-o)*0.02-Math.abs(oo)*0.01;
      // where it would be when it reaches that car (the palm moves ~110 units a second at most)
      v.cars.forEach(c=>{ const dx=c.x-cx; if(dx>-20&&dx<50+70*skill){ const tr=Math.max(0,dx+18)/Math.max(10,g.v*0.45), po=o+Math.sign(oo-o)*Math.min(Math.abs(oo-o),110*tr); if(Math.abs(po-c.o)<12) sc-=6-dx/30;
        if(dx<20){ const lo=Math.min(o,oo)-10, hi=Math.max(o,oo)+10; if(c.o>lo&&c.o<hi) sc-=6; } } });   // one alongside: don't steer into it
      v.puds.forEach(p=>{ const dx=p.x-cx; if(dx>-10&&dx<50&&Math.abs(p.o-oo)<p.r+7) sc-=1.5; });
      v.items.forEach(p=>{ const dx=p.x-cx; if(dx>4&&dx<140*(0.5+skill)&&Math.abs(p.o-oo)<7) sc+=want(p)*(1-dx/250); });
      if(sc>best){ best=sc; to=oo; } }
    let w=0.5-to/(2*(here.hw+Race.OFFW)); w=Math.max(0,Math.min(1,w));
    noise=noise*0.95+(rnd()-0.5)*0.02*(1.5-skill); const st=1/30;
    hand+=Math.max(-st,Math.min(st,w-hand)); Race.step(g,Math.max(0,Math.min(1,hand+noise)));
    if(g.car.on==='off') offT+=Race.DT; if(g.fuel<20&&fuelLow===null) fuelLow=g.t;
  }
  return {t:g.t,score:g.score,m:Math.floor(g.d/10),coins:g.coins,passed:g.passed,crashes:g.crashes,offT,fuelLow,vEnd:Race.vmax(g.t)};
}
if(require.main===module){
  const n=+(process.argv[2]||20), skill=+(process.argv[3]||0.6), res=[];
  for(let i=0;i<n;i++) res.push(botRace(1000+i,skill));
  const med=a=>{ const b=a.slice().sort((p,q)=>p-q); return b[b.length>>1]; };
  const f=x=>(x/60).toFixed(1)+' min';
  console.log(`race bot skill ${skill}, ${n} races: time ${f(med(res.map(r=>r.t)))} (${f(Math.min(...res.map(r=>r.t)))}–${f(Math.max(...res.map(r=>r.t)))}), `+
    `score ${med(res.map(r=>r.score))}, ${med(res.map(r=>r.m))} m, coins ${med(res.map(r=>r.coins))}, passed ${med(res.map(r=>r.passed))}, crashes ${med(res.map(r=>r.crashes))}, off road ${med(res.map(r=>r.offT)).toFixed(1)} s`);
}
module.exports=botRace;
