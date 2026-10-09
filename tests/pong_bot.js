/* A bot player for the pong core (src/15_pong.js): rests the palm low, and when the ball comes down to a racket swings up — a quick rise
   of the palm, its size and timing a little different every time (skill 0…1: how even the swings are), then lowers the palm again.
   It looks only at what a player sees: where the ball is and where the rackets are. Returns the palm for the next step (see Pong.padOf). */
const Pong=require('../src/15_pong.js');
function makeBot(seed,skill){
  let s=(seed>>>0)||1; const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; };
  const k=skill===undefined?0.6:skill, REST=0.12, T=0.16;
  let hand=REST, st='rest', t0=0, amp=0, h0=REST, trig=0.08, base=0.24, lastX=null;
  return function(g){
    const b=g.ball, t=g.t;
    // like a player: where did the last swing send the ball? landed past the other racket's middle — swing a little softer next time
    if(g.events.indexOf('pass')>=0||g.events.indexOf('dull')>=0){ const i=b.onI, xc=g.ar*(i?1-Pong.TUNE.XC:Pong.TUNE.XC), out=(i?1:-1)*(b.x-xc)/g.hw; base=Math.max(0.1,Math.min(0.5,base-0.04*out)); }
    if(g.events.indexOf('lost')>=0&&lastX!==null){ const far=lastX<0.05*g.ar||lastX>0.95*g.ar; base=Math.max(0.1,Math.min(0.5,base+(far?-0.03:0.03))); }
    if(b) lastX=b.x;
    if(st==='swing'){ const u=(t-t0)/T; if(u>=1){ st='down'; } else hand=h0+amp*(1-Math.cos(Math.PI*u))/2; }
    else { if(hand>REST) hand=Math.max(REST,hand-1.5*Pong.DT); else hand=Math.min(REST,hand+1.5*Pong.DT);
      if(st==='down'&&hand<=REST+1e-9) st='rest';
      if(st==='rest'&&b&&!(b.wait>0)&&b.vy>0&&(g.py-Pong.TUNE.LIFT-b.r-b.y)/b.vy<trig){   // swing so that the ball meets the racket when it is fastest
        // the swing: an even player picks the size for a high pass, a weaker one is less sure of it
        st='swing'; t0=t; h0=hand; amp=base+(rnd()-0.5)*0.3*(1.2-k); trig=0.08+(rnd()-0.5)*0.05*(1.2-k); } }
    return hand; };
}
/* a whole game: the core, the bot, the palm trajectory (for a replay) */
function play(seed,ar,sens,skill,maxT){ const g=Pong.create(seed,ar,sens), bot=makeBot(seed*7+3,skill), hands=[]; const N=(maxT||1200)*60;
  for(let i=0;i<N&&g.state!=='over';i++){ const h=bot(g); hands.push(h); Pong.step(g,h); }
  return {g,hands}; }
module.exports={makeBot,play};
