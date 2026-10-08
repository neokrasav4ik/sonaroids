// SonaPong balance model (1.58l): same racket physics as lab/src/087_arcade.js, a hitter with hand-speed error σ; run: SIG=0.3 GRIP=1 node lab/tools/sim/pong_balance.js
// Monte Carlo of SonaPong tilt physics with a human-like hitter (hand speed noise σ)
const AR=2.16, TOP=0.03, R=0.032, LIFT=0.1, STICK=0.25, PY=0.64, dt=1/60, FIELD=111;
function setup(P){ if(P.fw){ P={...P,hw:P.hwr*P.fw/4}; } const hw=P.fw?Math.max(0.03,Math.min(AR*P.hw,AR*P.fw/4-0.09)):AR*P.hw, XC=P.fw?(1-P.fw)/2+P.fw/4:Math.max(P.hw+0.01,0.5-P.gap/2-P.hw); return {...P,K:P.curve?hw/(AR*(P.fw||0)/2):0,hwA:hw,Av:P.curve===2?0.06/1.45:P.curve===1?0:Math.tan((P.tiltv===undefined?P.tilt:P.tiltv)*Math.PI/180)*hw,A:Math.tan(P.tilt*Math.PI/180)*hw,xc:[AR*XC,AR*(1-XC)]}; }
function surf(S,i,x){ const s=i?-1:1,u=(x-S.xc[i])/S.hwA; const ui=s*u; const kv=S.curve===2?0.9:0; return {u,s,y:PY-LIFT+S.Av*(ui-kv*ui*ui/2)}; }
function fac(S,ui){ if(!S.curve) return 1; const D=S.xc[1]-S.xc[0], tc=Math.tan(S.tilt*Math.PI/180), hc=D/(4*tc), kv=S.curve===2?0.9:0, yr=S.Av*(ui-kv*ui*ui/2), H0=Math.max(0.02,hc+yr); return ((D-ui*S.hwA)/(2*H0+2*Math.sqrt(H0*hc)))/tc; }
function bounce(S,b,i,vpb){ const ui=(i?-1:1)*(b.x-S.xc[i])/S.hwA, sl=(i?-1:1)*S.A/S.hwA*fac(S,ui),nl=Math.hypot(sl,1),nx=sl/nl,ny=-1/nl; let rx=b.vx,ry=b.vy-vpb; const vn=rx*nx+ry*ny;
  if(vn<0){ if(-vn>STICK){ rx-=(1+S.e)*vn*nx; ry-=(1+S.e)*vn*ny; } else { rx-=vn*nx; ry-=vn*ny; } const vt=rx*(-ny)+ry*nx, gr=S.grip||0; rx-=gr*vt*(-ny); ry-=gr*vt*nx; } return {x:b.x,y:b.y,vx:rx,vy:ry+vpb}; }
// fly until next contact; returns {kind, i, ball, apex}
function fly(S,b0,from){ let b={...b0}, apex=b.y, ceil=false; const xn=AR/2,nw=0.012, nt=PY-LIFT+(S.tiltv!==undefined?S.Av:0)-S.net;
  for(let k=0;k<600;k++){ b.vy+=S.g*dt; const py0=b.y; b.x+=b.vx*dt; b.y+=b.vy*dt; apex=Math.min(apex,b.y);
    if(b.y-R<TOP&&b.vy<0) return {kind:'ceil'};
    if(Math.abs(b.x-xn)<R+nw&&b.y+R>nt) return {kind:'net'};
    if(b.x<0||b.x>AR) return {kind:'out'};
    for(let i=0;i<2;i++){ const s=surf(S,i,b.x); if(Math.abs(s.u)<=1){ const top=s.y-R; if(b.y>top&&py0<=top+0.01&&b.vy>0){ b.y=top; return {kind:i===from?'own':'pass',i,ball:b,apex:PY-LIFT-apex}; } } }
    if(b.y>1.1) return {kind:'lost'}; }
  return {kind:'lost'}; }
function needU(S,b,i){ // hand speed (screen/s, up) that lands at the centre of the other platform
  let lo=0,hi=4; const tx=S.xc[1-i]; const f=U=>{ const r=fly(S,bounce(S,b,i,-U),i); if(r.kind==='pass') return r.ball.x-tx; if(r.kind==='own'||r.kind==='net') return i?1:-1; return i?-1:1; };
  for(let k=0;k<30;k++){ const m=(lo+hi)/2, v=f(m); if((i?-v:v)<0) lo=m; else hi=m; } return (lo+hi)/2; }
function ideal(S){ const sl=-S.A/S.hwA,nl=Math.hypot(sl,1),nx=sl/nl,ny=-1/nl; let lo=0,hi=5,best=null; const y0=PY-LIFT-R;
  for(let k=0;k<30;k++){ const v=(lo+hi)/2, r=fly(S,{x:S.xc[1],y:y0,vx:v*nx,vy:v*ny},1); let d; if(r.kind==='pass'){ best=r.ball; d=S.xc[0]-r.ball.x; } else d=(r.kind==='own'||r.kind==='net')?-1:1; if(d<0) lo=v; else hi=v; } return best; }
function run(P,sig,n=400,seed=1){ const S=setup(P); let rnd=seed; const rn=()=>{ rnd=(rnd*16807)%2147483647; return rnd/2147483647; }; const gz=()=>Math.sqrt(-2*Math.log(rn()+1e-12))*Math.cos(2*Math.PI*rn());
  const cnt={pass:0,own:0,net:0,ceil:0,lost:0,out:0}; let H=[],T=[],Um=[];
  // start: ball arriving on platform 0 as if from an ideal pass
  for(let trial=0;trial<n;trial++){ let i=0, b={x:S.xc[0],y:PY-LIFT-R,vx:-1,vy:1.5};
    // make an ideal arriving ball: mirror an ideal launch from platform 1
    const r0=ideal(S); if(!r0) continue; b=r0;
    for(let k=0;k<8;k++){ const U=needU(S,b,i), u=U*(1+sig*gz()); Um.push(U); const r=fly(S,bounce(S,b,i,-u),i); cnt[r.kind]++; if(r.kind==='pass'){ H.push(r.apex); b=r.ball; i=1-i; } else if(r.kind==='own'){ b=r.ball; } else break; } }
  const md=a=>{a=a.slice().sort((x,y)=>x-y);return a[a.length>>1]||0;}; const U=md(Um);
  const tot=Object.values(cnt).reduce((a,c)=>a+c,0); return {p:cnt.pass/tot,cnt,h:md(H),mm:U*FIELD/(0.6*P.hit)}; }
module.exports={run,setup,fly,bounce,needU,fac};
if(require.main===module){ const sig=+process.env.SIG||0.3; const rows=[];
  for(const tilt of [35,42,50,58]) for(const gap of [0.04,0.08]) for(const e of [0.5,0.65,0.8]) for(const hw of [0.15,0.2]) for(const net of [0.06]) for(const g of [2.4]) {
    const P={g,hit:0.75,e,hw,gap,net,tilt,grip:+(process.env.GRIP||1)}; const r=run(P,sig,300); rows.push([tilt,gap,e,hw,r.p.toFixed(2),r.h.toFixed(2),r.mm.toFixed(0),JSON.stringify(r.cnt)]); }
  rows.forEach(r=>console.log(r.join('\t'))); }
