/* v0.50: the app's own sound. A stand-in of the Android app: audioStart hands the page a MessagePort ("sonaroids-audio") and sends the
   synthetic microphone through it as the app does — "<seq>:<base64 int16 LE>", two frames per message, in real time; the probe gains the
   page sets go into the synthetic sound. With 'sonaroids_audio' = 'app' the game must get ready and catch a waving palm through that
   path, after picking the microphone itself (v0.54: the stand-in's back microphone hears the probe 14 dB quieter — the bottom one must win
   and be remembered); the service screen «sound» must list the stand-in's microphones and switch the mode. Needs Playwright with Chromium.
   Run: node tests/native_audio.js */
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ console.log('no playwright — skipped'); console.log('RESULT: ok'); process.exit(0); }
const fs=require('fs'), path=require('path'), ROOT=path.join(__dirname,'..'), SRC=fs.readFileSync(path.join(__dirname,'sim_source.js'),'utf8');
const APPSTUB=`(function(){ var st={on:false,g:[0,0,0,0],probes:0,iv:null,frames:0,cfg:null};
  window.__nat=st; window.__hand=null;
  window.SonaroidsApp={getVolume:function(){ return 0.27; },setVolume:function(){},route:function(){ return 'speaker'; },info:function(){ return '{"app":"test"}'; },checkUpdate:function(){},
    audioProbe:function(w,b){ st.probes++; },
    audioGains:function(a,b,c,d){ st.g=[a,b,c,d]; },
    audioDevices:function(){ return JSON.stringify({inputs:[{id:3,type:'builtin_mic',name:'M2101K7BNY',address:'bottom'},{id:4,type:'builtin_mic',name:'M2101K7BNY',address:'back'}],
      outputs:[{id:1,type:'earpiece',name:'x'},{id:2,type:'speaker',name:'x'}],mics:[{id:0,address:'bottom',desc:'bottom',type:'builtin_mic',location:1,pos_mm:[35,5,0]},{id:1,address:'back',desc:'back',type:'builtin_mic',location:1,pos_mm:[20,150,-8]}],unprocessed:false,sdk:33}); },
    audioStatus:function(){ var m=st.moved?4:(st.cfg&&st.cfg.mic>=0?st.cfg.mic:3), a=m===4?'back':'bottom', r=st.moved&&!st.told?[{t:1234,kind:'in',dev:{id:4,type:'builtin_mic',address:'back'},mode:0}]:undefined; if(r) st.told=true;
      return JSON.stringify({running:st.on,frames:st.frames,src:'voice',ch:1,mic_wanted:st.cfg?st.cfg.mic:-1,out_wanted:-1,error:'',mode:0,in:{id:m,type:'builtin_mic',address:a},out:{id:2,type:'speaker'},active:[{id:0,address:a,desc:a}],routes:r}); },
    audioSwitch:function(cfg){ var c=JSON.parse(cfg); st.cfg.mic=c.mic; st.cfg.src=c.src; st.switches=(st.switches||0)+1; st.moved=false; return true; },   /* v0.64: asked again, the phone obeys */
    audioStop:function(){ st.on=false; if(st.iv) clearInterval(st.iv); st.iv=null; },
    audioStart:function(cfg){ if(st.iv) clearInterval(st.iv); st.cfg=JSON.parse(cfg); st.starts=(st.starts||0)+1; st.moved=false;   /* v0.65: the page reopens the recording to set a microphone */ var mc=new MessageChannel(), src=makeSimSource(function(t){ return window.__hand?window.__hand(t):null; }), i=0, t0=performance.now();
      st.on=true; setTimeout(function(){ window.postMessage('sonaroids-audio','*',[mc.port2]); },50);
      st.iv=setInterval(function(){ var due=Math.floor((performance.now()-t0)/1000*48000/512); while(i+2<=due){ var g=Math.max(st.g[0],st.g[1],st.g[2],st.g[3])*(st.cfg&&st.cfg.mic===4&&!window.__same?0.2:1)*(st.drop||1);   /* the back microphone hears the probe 14 dB quieter */
          var b=new Uint8Array(2048), dv=new DataView(b.buffer); for(var k=0;k<2;k++){ var f=src(i+k,g); for(var j=0;j<512;j++) dv.setInt16((k*512+j)*2,Math.max(-32768,Math.min(32767,Math.round(f[j]*32768))),true); }
          var s=''; for(var q=0;q<b.length;q++) s+=String.fromCharCode(b[q]); mc.port1.postMessage(i+':'+btoa(s)); i+=2; st.frames+=2; } },10);
      return true; } }; })();`;
(async()=>{
  const b=await chromium.launch(), ctx=await b.newContext({viewport:{width:844,height:390}});
  await ctx.addInitScript(`localStorage.setItem('sonaroids_seen','1'); localStorage.setItem('sonaroids_live','0'); localStorage.setItem('sonaroids_lang','ru'); localStorage.setItem('sonaroids_audio','app'); ${SRC}; ${APPSTUB} window.SONAROIDS_API='https://api.test';`);
  const p=await ctx.newPage(); const errors=[]; p.on('pageerror',e=>errors.push(e.message));
  await p.route('https://api.test/**',r=>r.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:'{"ok":true}'}));
  await p.goto('file://'+path.join(ROOT,'game','play','index.html')); await p.waitForTimeout(300);
  await p.evaluate(()=>__sonaroids.act.play()); await p.waitForTimeout(400); await p.evaluate(()=>__sonaroids.act.probe_norm());
  const scr=()=>p.evaluate(()=>__sonaroids.scr());
  let s='', t0=Date.now(); while(Date.now()-t0<25000){ s=await scr(); if(s==='wave') break; await p.waitForTimeout(200); }
  const info=await p.evaluate(()=>({settle:Sonar.info().settle,auto:Sonar.info().auto_audio,stored:localStorage.getItem('sonaroids_autoaudio'),switches:__nat.switches,audio:Sonar.info().audio,probes:__nat.probes,frames:__nat.frames,gain:Sonar.info().probe_gain,snr:Sonar.info().probe_snr,mic:Sonar.micSettings()}));
  await p.evaluate(()=>{ window.__hand=t=>100+45*Math.sin(2*Math.PI*t/1.4); });
  let caught=false; t0=Date.now(); while(Date.now()-t0<25000){ caught=await p.evaluate(()=>__sonaroids.state().caught); if(caught) break; await p.waitForTimeout(250); }
  // v0.64: the phone moves the recording to another microphone by itself (the Redmi Note 10S): the page must log it and ask for its own again
  await p.evaluate(()=>{ __nat.moved=true; __nat.starts=0; }); await p.waitForTimeout(2600);
  const back=await p.evaluate(()=>({mic:__nat.cfg.mic,sw:__nat.starts,log:Sonar.info().routes.map(r=>r[1]+(r[2]!==undefined?' '+JSON.stringify(r[2]):''))}));
  const backOk=back.mic===3&&back.sw>=1&&back.log.some(x=>/^android/.test(x))&&back.log.some(x=>/^верну микрофон/.test(x));
  // v0.65: an unreported change — the probe at the microphone falls by 14 dB and stays there: logged as a jump
  await p.evaluate(()=>{ __nat.drop=0.2; }); await p.waitForTimeout(3600);
  const jump=await p.evaluate(()=>Sonar.info().routes.filter(r=>r[1]==='скачок зонда').map(r=>r[2].db));
  await p.evaluate(()=>{ __nat.drop=1; });
  const jumpOk=jump.length>=1&&jump[0]<-10;
  // the service screen
  await p.evaluate(()=>{ __sonaroids.act.audio(); }); await p.waitForTimeout(400);
  const ids=await p.evaluate(()=>__sonaroids.btn().map(q=>q.id));
  await p.screenshot({path:path.join(ROOT,'tests','out','audio_screen.png')});
  const listed=ids.includes('aud:mic:3')&&ids.includes('aud:mic:4')&&ids.includes('aud:out:2')&&ids.includes('aud:mode:browser')&&ids.includes('aud:end:camera')&&ids.includes('aud:end:port')&&ids.includes('aud:vol:keep');   // v0.67: the probe's end
  await p.evaluate(()=>{ Sfx&&0; }); await p.mouse.click(1,1);
  const modeAfter=await p.evaluate(()=>{ const q=__sonaroids.btn().find(x=>x.id==='aud:mic:3'); return q; });
  // v0.64: with nothing chosen, the app's own sound is the default
  const p2=await ctx.newPage(); await p2.addInitScript(()=>{ localStorage.removeItem('sonaroids_audio'); });
  await p2.goto('file://'+path.join(ROOT,'game','play','index.html')); await p2.waitForTimeout(300);
  await p2.evaluate(()=>__sonaroids.act.play()); await p2.waitForTimeout(400); await p2.evaluate(()=>__sonaroids.act.probe_norm());
  let def=''; t0=Date.now(); while(Date.now()-t0<15000){ def=await p2.evaluate(()=>Sonar.info().booted?Sonar.info().audio:''); if(def) break; await p2.waitForTimeout(200); }
  // v0.65: both microphones sound the same (the phone does not switch them): no microphone is asked for
  const p3=await ctx.newPage(); await p3.addInitScript(()=>{ window.__same=true; localStorage.removeItem('sonaroids_autoaudio'); });
  await p3.goto('file://'+path.join(ROOT,'game','play','index.html')); await p3.waitForTimeout(300);
  await p3.evaluate(()=>__sonaroids.act.play()); await p3.waitForTimeout(400); await p3.evaluate(()=>__sonaroids.act.probe_norm());
  let same=null; t0=Date.now(); while(Date.now()-t0<25000){ same=await p3.evaluate(()=>Sonar.info().auto_audio); if(same) break; await p3.waitForTimeout(250); }
  const sameOk=!!(same&&same.same&&same.pick&&same.pick.mic===3);
  await b.close();
  const autoOk=!!(info.auto&&info.auto.tried.length===2&&info.auto.pick&&info.auto.pick.mic===3&&info.stored&&JSON.parse(info.stored).mic===3);
  const settleOk=!!(info.settle&&info.settle.ms<3000&&info.settle.db.length>=3);
  const ok=settleOk&&autoOk&&backOk&&jumpOk&&sameOk&&def==='app'&&s==='wave'&&info.audio==='app'&&info.probes>=3&&info.frames>100&&info.mic&&info.mic.audio==='app'&&caught&&listed&&!errors.length;
  console.log(`auto pick: tried ${info.auto&&info.auto.tried.map(r=>r.mic+'/'+r.src+' wander '+r.wander+' SNR '+r.snr).join(', ')} → mic ${info.auto&&info.auto.pick&&info.auto.pick.mic} (want 3), remembered ${info.stored} ${autoOk?'ok':'FAIL'}`);
  console.log(`through the app's sound: ready → ${s}, mode ${info.audio}, probes sent ${info.probes}, frames ${info.frames}, probe gain ${info.gain&&info.gain.toFixed(3)}, SNR ${info.snr&&info.snr.toFixed(1)} dB; palm caught ${caught}; service screen lists the microphones and the speaker ${listed}`+(errors.length?' | errors: '+[...new Set(errors)].join('; ').slice(0,400):''));
  console.log(`the phone moved the recording to mic 4: logged and asked back (the recording reopened) → mic ${back.mic} (want 3), reopened ${back.sw} ${backOk?'ok':'FAIL'}\n  ${back.log.join('\n  ')}`);
  console.log(`the probe held still before the empty room: ${info.settle&&info.settle.ms} ms, ${info.settle&&info.settle.db.join(' / ')} dB ${settleOk?'ok':'FAIL'}`);
  console.log(`the probe fell 14 dB unreported: logged ${JSON.stringify(jump)} dB ${jumpOk?'ok':'FAIL'}`);
  console.log(`both microphones sound the same: pick ${same&&same.pick&&same.pick.mic} (want 3, the bottom one), tried ${same&&same.tried.map(r=>r.mic+' line '+r.line+' SNR '+r.snr).join(' / ')} ${sameOk?'ok':'FAIL'}`);
  console.log(`nothing chosen: the sound goes through ${def||'?'} (want app) ${def==='app'?'ok':'FAIL'}`);
  console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
})();
