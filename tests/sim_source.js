/* A synthetic microphone for headless tests: the game's current probe (F_LO from the game code) with a direct path, one fixed
   reflection and a palm whose height follows a scenario. Same model as the lab's synth_probe.js.
   The level is scaled to what the maintainer's iPhone microphone hears (probe ~12.5 dB per unit of gain in probeStats, 24 Sep logs).
   Used in Node and inside the page (Playwright addInitScript) as source(i) for Sonar.simulate. */
function makeSimSource(h, opts){
  opts=opts||{}; var SR=48000, N=512, df=SR/N, FLO=opts.flo||18300, kLo=Math.ceil(FLO/df), kHi=Math.floor(20500/df), ks=[], k, n, q;
  for(k=kLo;k<=kHi;k++) ks.push(k); var M=ks.length;
  var pr=new Float64Array(N), mx=0; for(n=0;n<N;n++){ var s=0; for(q=0;q<M;q++) s+=Math.cos(2*Math.PI*ks[q]*n/N+Math.PI*q*q/M); pr[n]=s; mx=Math.max(mx,Math.abs(s)); }
  for(n=0;n<N;n++) pr[n]=pr[n]/mx*0.9*0.25;
  var Pre={},Pim={},C={},Sn={};
  ks.forEach(function(k){ var re=0,im=0; C[k]=new Float64Array(N); Sn[k]=new Float64Array(N);
    for(var n=0;n<N;n++){ C[k][n]=Math.cos(2*Math.PI*k*n/N); Sn[k][n]=Math.sin(2*Math.PI*k*n/N); re+=pr[n]*C[k][n]; im-=pr[n]*Sn[k][n]; } Pre[k]=re; Pim[k]=im; });
  var dDir=37.3, seed=12345, LEVEL=opts.scale===undefined?0.0141:opts.scale;
  return function(i){
    var t=(i+0.5)*N/SR, hh=h(t), paths=[{d:dDir,a:1},{d:dDir+62,a:0.35}], out=new Float32Array(N);
    if(hh!==null) paths.push({d:dDir+2*hh/1000/343*SR,a:0.25});
    paths.forEach(function(p){ ks.forEach(function(k){ var a=-2*Math.PI*k*p.d/N, c=Math.cos(a), sn=Math.sin(a), re=(Pre[k]*c-Pim[k]*sn)*2/N*p.a, im=(Pre[k]*sn+Pim[k]*c)*2/N*p.a;
      var Ck=C[k], Sk=Sn[k]; for(var n=0;n<N;n++) out[n]+=re*Ck[n]-im*Sk[n]; }); });
    for(n=0;n<N;n++){ seed=(seed*1664525+1013904223)>>>0; out[n]=(out[n]+(seed/4294967296-0.5)*2e-3)*LEVEL;   /* noise ~57 dB under the probe per line, as on the iPhone in a quiet room */ }
    return out;
  };
}
if(typeof module!=='undefined') module.exports=makeSimSource;
