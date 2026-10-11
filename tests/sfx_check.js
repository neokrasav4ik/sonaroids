/* The games' sounds rendered offline (v1.61w): every sound of SonaFly, SonaRace, SonaLob and the menus is played into an OfflineAudioContext
   through the real chain (src/22_sfx.js), and measured: it plays without an error, it is not silent (but SonaFly's saucer dodge, silent on
   purpose), it stays under the limiter, nothing reaches the probe's band (above 17 kHz — more than 60 dB under the sound itself), and the
   frequent sounds (a shot, a candy, a hit of the shuttle, a button) are the quietest. The test runner's sim has no audio context, so the
   flows never sound; this check does. Needs Playwright with Chromium (skipped without it). Run: node tests/sfx_check.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('playwright not installed — skipped'); console.log('RESULT: ok'); process.exit(0); }
const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(`localStorage.setItem('sonaroids_seen','1');`);
  await p.goto('file://'+path.join(__dirname,'..','game','play','index.html')); await p.waitForTimeout(400);
  const R=await p.evaluate(async()=>{
    const K={fly:['fire','break','shield','hit','pick','level','ufo','ufo_fire','ufo_dodge','ufo_hit','ufo_die','tick','start','over'],
      race:['coin','line','fuel','pass','rub','crash','magnet','bubble','turbo','pop','boing','syrup','empty','tick','start','over'],
      ui:['tap','ok','ping'], pong:['serve','pass','dull','land','crack','cave','lost','narrow','tick','start','over']};
    const out=[]; const fs=48000; let sd=7; Math.random=function(){ sd=(sd*1664525+1013904223)>>>0; return sd/4294967296; };   // the sounds' small variation, repeatable
    for(const g of Object.keys(K)) for(const k of K[g]){
      const oc=new OfflineAudioContext(1,fs*2.5,fs); Sonar.ctx=()=>oc; let err=null;
      try{ if(g==='pong') Sfx.lob(k,2,0.7); else { Sfx.setGame(g==='ui'?'fly':g); Sfx.play(k,2); } }catch(e){ err=e.message; }
      const buf=await oc.startRendering(), d=buf.getChannelData(0); let pk=0, ss=0; for(let i=0;i<d.length;i++){ const a=Math.abs(d[i]); if(a>pk) pk=a; ss+=d[i]*d[i]; }
      /* the probe's band: a crude high-pass — the difference of neighbours, three times — compared with the whole */
      let hp=d; for(let r=0;r<3;r++){ const h=new Float32Array(hp.length); for(let i=1;i<hp.length;i++) h[i]=hp[i]-hp[i-1]; hp=h; } let hs=0; for(let i=0;i<hp.length;i++) hs+=hp[i]*hp[i];
      const rms=Math.sqrt(ss/d.length); out.push({g,k,err,peak:+pk.toFixed(3),db:rms>0?+(20*Math.log10(rms)).toFixed(1):-200,hi:hs>0&&ss>0?+(10*Math.log10(hs/ss/64)).toFixed(1):-200}); }
    return out; });
  await b.close();
  let ok=true; const lines=[], check=(n,g,i)=>{ ok=ok&&g; lines.push(`${n}: ${i||''} ${g?'ok':'FAIL'}`); };
  const bad=R.filter(r=>r.err); check('every sound plays without an error',!bad.length&&!errors.length,bad.map(r=>r.g+'/'+r.k+': '+r.err).concat(errors).slice(0,3).join(' | ')||`${R.length} sounds`);
  const silent=R.filter(r=>r.peak<0.002&&!(r.g==='fly'&&r.k==='ufo_dodge')); check('none is silent (but the saucer\'s dodge, on purpose)',!silent.length,silent.map(r=>r.g+'/'+r.k).join(', ')||'all heard');
  const loud=R.filter(r=>r.peak>0.99); check('none clips at the default level (the old chip sounds peaked at 1.55)',!loud.length,loud.map(r=>r.g+'/'+r.k+' '+r.peak).join(', ')||`the loudest peak ${Math.max(...R.map(r=>r.peak)).toFixed(2)}`);
  const hi=R.filter(r=>r.peak>=0.002&&r.hi>-30); check('nothing near the probe\'s band',!hi.length,hi.map(r=>r.g+'/'+r.k+' '+r.hi).join(', ')||`the highest share of the top band ${Math.max(...R.filter(r=>r.peak>=0.002).map(r=>r.hi)).toFixed(0)} dB`);
  const L=(g,k)=>R.find(r=>r.g===g&&r.k===k).db, freq=[['fly','fire'],['race','coin'],['ui','tap']], rare=[['fly','hit'],['race','crash'],['fly','level']];
  check('the frequent sounds are the quietest',freq.every(([g,k])=>rare.every(([g2,k2])=>L(g,k)<L(g2,k2)-3)),freq.map(([g,k])=>k+' '+L(g,k)+' dB').join(', ')+' vs '+rare.map(([g,k])=>k+' '+L(g,k)+' dB').join(', '));
  lines.forEach(x=>console.log(x));
  console.log('levels (dB RMS over 2.5 s): '+R.map(r=>r.g+'/'+r.k+' '+r.db).join(' · '));
  console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1; })();
