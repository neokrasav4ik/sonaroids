

/* ── ЖУРНАЛ ПАРТИИ: звук + что видела обработка + что происходило в игре ── */
var LOG=null, logOn=true, LOG_SEC=150, LOG_SCALE=4;          // 16 бит, полная шкала = 1/4 входа
function logStart(){
  if(!logOn){ LOG=null; return; }
  var cap=LOG_SEC*fs;
  if(!LOG||!LOG.pcm||LOG.pcm.length!==cap) LOG={pcm:new Int16Array(cap)};
  LOG.on=true; LOG.f=0; LOG.clip=0; LOG.gaps=0; LOG.dsp=[]; LOG.ren=[]; LOG.ev=[]; LOG.t0=performance.now();
  LOG.meta0={cal:curCal,cal_now:DSP2.info().cal,autocenter:true,tune:'waves',asym:ASYM,field_auto:gAutoField,field_mm:gSpan,diff:gDiff,span:gSpan,sfx:{on:gSfxOn,vol:sfxVol},chan:chan,hand:hand,probe_gain:PROBE_G,probe_snr:PROBE_SNR,f_lo:F_LO,
    W:Math.round(G?G.W:0),H:Math.round(G?G.H:0),prom:DSP2.info().prom,started:new Date().toISOString()};
}
function logFrame(fr,r,gap){
  var L=LOG, cap=L.pcm.length, base=(L.f*N)%cap, i, v;
  if(gap) L.gaps++;
  for(i=0;i<N;i++){ v=Math.round(fr[i]*32767*LOG_SCALE); if(v>32767){ v=32767; L.clip++; } else if(v<-32768){ v=-32768; L.clip++; } L.pcm[(base+i)%cap]=v; }
  if(r) L.dsp.push([L.f,r.present?1:0,+r.height.toFixed(1),+r.abs.toFixed(1),+r.range.toFixed(1),+r.fast.toFixed(1),+r.E.toFixed(1),+r.resE.toFixed(1)]);
  L.f++;
  if(L.dsp.length>LOG_SEC*100) L.dsp.splice(0,L.dsp.length-LOG_SEC*95);
}
var STC={wait:0,play:1,pause:2,over:3};
function logRender(hand){
  var L=LOG; if(!L||!L.on||!G) return;
  var rocks=G.rocks.map(function(q){ return [+(q.x/G.H).toFixed(3),+(q.y/G.H).toFixed(3),+(q.r/G.H).toFixed(3)]; });
  L.ren.push([L.f,Math.round(performance.now()-L.t0),hand===null?-1:+hand.toFixed(3),+(G.ship.y/G.H).toFixed(3),STC[G.state],G.lives,Math.floor(G.score),G.level,rocks]);
  G.events.forEach(function(k){ L.ev.push([L.f,k,+(G.ship.y/G.H).toFixed(3)]); });
  if(L.ren.length>LOG_SEC*70) L.ren.splice(0,L.ren.length-LOG_SEC*62);
}
function logStop(){ if(LOG) LOG.on=false; }
function logInfo(){
  if(!LOG||!LOG.f) return 'Журнала пока нет — сыграй партию.';
  var sec=Math.min(LOG.f*N/fs,LOG_SEC); return 'Записано '+sec.toFixed(0)+' с партии'+(LOG.f*N/fs>LOG_SEC?' (последние '+LOG_SEC+' с)':'')+'.';
}
function logBlob(){
  var L=LOG, cap=L.pcm.length, total=L.f*N, n=Math.min(total,cap), start=total-n, i;
  var pcm=new Int16Array(n); for(i=0;i<n;i++) pcm[i]=L.pcm[(start+i)%cap];
  var f0=Math.floor(start/N);
  var meta={v:5,kind:'game-log',fs:fs,N:N,kLo:kLo,kHi:kHi,probe:{bins:'all',channel:chan,phase:'pi*q^2/M',peak:0.9,gain:0.25,loop:true},
    pcm:{bits:16,full_scale:1/LOG_SCALE},first_frame:f0,frames:L.f-f0,clipped:L.clip,gaps:L.gaps,game:L.meta0,
    ended:new Date().toISOString(),ua:navigator.userAgent,
    columns:{dsp:['frame','present','height_mm','abs_mm','range_mm','fast_mm','motion_db','echo_db'],
             render:['frame','t_ms','hand_0_1_or_-1','ship_y_over_H','state 0wait 1play 2pause 3over','lives','score','level','rocks [x/H,y/H,r/H]'],
             events:['frame','event','ship_y_over_H']}};
  var glog={dsp:L.dsp.filter(function(a){return a[0]>=f0;}),render:L.ren.filter(function(a){return a[0]>=f0;}),events:L.ev.filter(function(a){return a[0]>=f0;})};
  return glogWav(pcm,meta,glog);
}
/* WAV: PCM16 моно + метаданные JSON в LIST/INFO/ICMT + кусок glog с JSON — общий для журнала партии и журнала настройки */
function glogWav(pcm,meta,glog){
  var n=pcm.length, i;
  var mtxt=unescape(encodeURIComponent(JSON.stringify(meta))); if(mtxt.length%2) mtxt+=' ';
  var gtxt=unescape(encodeURIComponent(JSON.stringify(glog))); if(gtxt.length%2) gtxt+=' ';
  var infoLen=4+8+mtxt.length, dataLen=n*2, total2=12+(8+16)+(8+infoLen)+(8+gtxt.length)+(8+dataLen);
  var buf=new ArrayBuffer(total2), v=new DataView(buf), p=0;
  function s4(x){ for(var k=0;k<4;k++) v.setUint8(p++,x.charCodeAt(k)); } function u32(x){ v.setUint32(p,x,true); p+=4; } function u16(x){ v.setUint16(p,x,true); p+=2; }
  s4('RIFF'); u32(total2-8); s4('WAVE');
  s4('fmt '); u32(16); u16(1); u16(1); u32(fs); u32(fs*2); u16(2); u16(16);
  s4('LIST'); u32(infoLen); s4('INFO'); s4('ICMT'); u32(mtxt.length); for(i=0;i<mtxt.length;i++) v.setUint8(p++,mtxt.charCodeAt(i));
  s4('glog'); u32(gtxt.length); for(i=0;i<gtxt.length;i++) v.setUint8(p++,gtxt.charCodeAt(i));
  s4('data'); u32(dataLen); for(i=0;i<n;i++){ v.setInt16(p,pcm[i],true); p+=2; }
  return new Blob([buf],{type:'audio/wav'});
}
function logSave(){
  if(!LOG||!LOG.f){ el('gLogI').textContent=logInfo(); return; }
  shareWav(logBlob(),'sonar_game_');
}
function shareWav(b,prefix){
  var d=new Date(), z=function(x){ return (x<10?'0':'')+x; };
  var name=prefix+d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'_'+z(d.getHours())+z(d.getMinutes())+'.wav';
  var f=null; try{ f=new File([b],name,{type:'audio/wav'}); }catch(e){}
  if(f&&navigator.canShare&&navigator.canShare({files:[f]})){ navigator.share({files:[f],title:name}).catch(function(){}); return; }
  var a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ a.remove(); },1000);
}

/* ── ЖУРНАЛ НАСТРОЙКИ: от запуска обработки (пустая комната) через шаги калибровки и ожидание «Старта» — до 120 с.
   Нужен для разбора старта: как учились фон и уровень пустой комнаты, когда рука появлялась и пропадала и почему. ── */
var SLOG=null, SLOG_SEC=120;
function slogStart(kind){
  var cap=SLOG_SEC*fs;
  if(!SLOG||!SLOG.pcm||SLOG.pcm.length!==cap) SLOG={pcm:new Int16Array(cap)};
  var S=SLOG; S.on=true; S.f=0; S.clip=0; S.gaps=0; S.dsp=[]; S.ev=[]; S.pres=null; S.kind=kind;
  S.meta0={kind:kind,cal:curCal,autocenter:true,tune:'waves',asym:ASYM,field_auto:gAutoField,field_mm:gSpan,chan:chan,hand:hand,probe_gain:PROBE_G,probe_snr:PROBE_SNR,f_lo:F_LO,prom:null,started:new Date().toISOString()};
  slogEv('старт: '+kind);
}
function slogEv(k,x){ var S=SLOG; if(!S||!S.on) return; S.ev.push(x===undefined?[S.f,k]:[S.f,k,x]); }
function slogFrame(fr,r,gap){
  var S=SLOG, i, v;
  if(S.f*N>=S.pcm.length){ S.on=false; return; }                              // 120 с — хватит на настройку и начало игры
  if(gap) S.gaps++;
  for(i=0;i<N;i++){ v=Math.round(fr[i]*32767*LOG_SCALE); if(v>32767){ v=32767; S.clip++; } else if(v<-32768){ v=-32768; S.clip++; } S.pcm[S.f*N+i]=v; }
  if(r){ S.dsp.push([S.f,r.present?1:0,+r.height.toFixed(1),+r.abs.toFixed(1),+r.range.toFixed(1),+r.fast.toFixed(1),+r.E.toFixed(1),+r.resE.toFixed(1),
      r.floor===null||r.floor===undefined?null:+r.floor.toFixed(1),+(r.Em||0).toFixed(1)]);
    if(S.pres!==null&&r.present!==S.pres) slogEv(r.present?'рука есть: '+r.why:'рука ушла: '+r.why);
    S.pres=r.present; }
  S.f++;
}
function slogInfo(){ if(!SLOG||!SLOG.f) return 'Журнала настройки пока нет.'; return 'Журнал настройки: '+(SLOG.f*N/fs).toFixed(0)+' с'+(SLOG.on?', пишется':'')+'.'; }
function slogBlob(){
  var S=SLOG, n=S.f*N, pcm=S.pcm.slice(0,n), inf=DSP2.info();
  var meta={v:1,kind:'setup-log',fs:fs,N:N,kLo:kLo,kHi:kHi,probe:{bins:'all',channel:chan,phase:'pi*q^2/M',peak:0.9,gain:PROBE_G,snr_db:PROBE_SNR,f_lo:F_LO,loop:true},
    pcm:{bits:16,full_scale:1/LOG_SCALE},first_frame:0,frames:S.f,clipped:S.clip,gaps:S.gaps,setup:S.meta0,cal_now:DSP2.info().cal,
    dsp_info:{d0:inf.d0,prom:inf.prom,mm:inf.mm},ended:new Date().toISOString(),ua:navigator.userAgent,
    columns:{dsp:['frame','present','height_mm','abs_mm','range_mm','fast_mm','motion_db','echo_db','empty_floor_db','motion_smooth_db'],
             events:['frame','event','data']}};
  return glogWav(pcm,meta,{dsp:S.dsp,render:[],events:S.ev});
}
function slogSave(){ if(!SLOG||!SLOG.f) return; shareWav(slogBlob(),'sonar_setup_'); }
/* строка диагностики: что сейчас видит обработка — в калибровке всегда, в игре по переключателю в меню */
function diagText(st){
  if(!st) return 'обработка готовится…';
  var fl=(st.floor===null||st.floor===undefined)?null:st.floor, em=(st.Em===undefined)?null:st.Em;
  return 'рука: '+(st.present?'видна':'нет')+(st.why?' ('+st.why+')':'')+' · эхо '+(fl===null?'— (пустота не выучена)':((st.resE-fl>=0?'+':'')+(st.resE-fl).toFixed(0)+' дБ над пустой'))+
    ' · движение '+(em===null?'—':em.toFixed(0)+' дБ');
}
var gDiagOn=false;

/* ── запуск с домашнего экрана и попытка полного экрана там, где браузер это умеет ── */
(function(){ var st=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true;
  if(/iPhone|iPad|iPod/.test(navigator.userAgent)&&!st) el('a2hs').classList.remove('hidden'); })();
function tryFullscreen(){ var d=document.documentElement, f=d.requestFullscreen||d.webkitRequestFullscreen;
  if(f){ try{ var p=f.call(d); if(p&&p.catch) p.catch(function(){}); }catch(e){} } }
el('goGame').addEventListener('click',tryFullscreen);

/* ── АСТЕРОИДЫ: цикл, рисование, звуки, меню ── */
var probeLost=false, G=null, gCtx=null, gDpr=1, gLast=0, gOn=false, gMenuOpen=false, gSpan=100, gDiff='easy', gTick=0, gSfxOn=true, gBest=0, sfxOut=null, gFont='"Press Start 2P", "IBM Plex Mono", monospace';
function bestKey(){ return 'sonar_asteroids_best_'+gDiff; }
function loadBest(){ try{ gBest=parseInt(localStorage.getItem(bestKey())||'0',10)||0; }catch(e){ gBest=0; } if(G) G.best=gBest; }
loadBest();
var gSafe={t:0,r:0,b:0,l:0};
function safeInsets(){ var d=document.createElement('div');
  d.style.cssText='position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(d); var cs=getComputedStyle(d);
  var r={t:parseFloat(cs.paddingTop)||0,r:parseFloat(cs.paddingRight)||0,b:parseFloat(cs.paddingBottom)||0,l:parseFloat(cs.paddingLeft)||0}; d.remove(); return r; }
function gSize(){
  try{ gSafe=safeInsets(); }catch(e){}
  var cv=el('gc'), r=cv.getBoundingClientRect(); gDpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.max(100,Math.round(r.width*gDpr)); cv.height=Math.max(100,Math.round(r.height*gDpr));
  gCtx=cv.getContext('2d');
  var W=cv.width/gDpr, H=cv.height/gDpr;
  if(!G){ G=Game.create(W,H); Game.setDiff(G,gDiff); G.best=gBest; } else Game.resize(G,W,H);
}
function startGame(){ probeLost=false;
  mode='game'; show('game'); gMenuOpen=false; el('gPanel').classList.add('hidden');
  setTimeout(function(){ gSize(); if(!gOn){ gOn=true; gLast=performance.now(); requestAnimationFrame(gLoop); } },30);
}
window.addEventListener('resize',function(){ if(mode==='game') setTimeout(gSize,100); });
/* ── АВТОПОДСТРОЙКА ПО ВЗМАХАМ: пока ждём «Старт» (и «Ещё раз»), ладонью машут в рабочем диапазоне вместе с кораблём.
   Берутся последние 6 с высот с рукой; 5-й и 95-й процентили ложатся на 10% и 90% экрана, ход на весь экран — в пределах 5–15 см. Подстраивается плавно, шагами по 0,25 с;
   с отсчёта до конца партии всё заморожено. Если ладонью не машут (размах меньше 3 см) — подтягивается только середина. ── */
var AT={buf:[],t:0,acc:0,span:null,ok:false}, gAutoField=true;
/* Экран не линеен по высоте: по всем шести записям с меткой ладонь в нижней половине хода (5–10 см) двигает итог
   на ~0,85 мм за мм, а в верхней (10–15 см) — на ~1,45: у стола сонар «видит» движение слабее. Поэтому ниже середины
   экран растянут в ASYM раз — чтобы опустить корабль до низа, не нужно тянуться ладонью сквозь стол. */
var ASYM=1.7;
function fracOf(h){ var FL=2*gSpan/(1+ASYM), FU=2*ASYM*gSpan/(1+ASYM); return Math.max(0,Math.min(1,h<100?0.5+(h-100)/FL:0.5+(h-100)/FU)); }
function tunePick(buf){                                   // чистая функция: по высотам — середина, размах, годится ли
  if(buf.length<60) return null;
  var h=buf.map(function(q){return q.h;}).sort(function(a,b){return a-b;}), p=function(f){ return h[Math.min(h.length-1,Math.floor(f*(h.length-1)))]; };
  var lo=p(0.05), hi=p(0.95), dur=buf[buf.length-1].t-buf[0].t;
  return {mid:(lo+hi)/2, med:p(0.5), span:hi-lo, lo:lo, hi:hi, dur:dur, wave:dur>=1.5&&hi-lo>=30};
}
function autoTune(dt){
  var waiting=G&&(G.state==='wait'||G.state==='over'), st=absS.st;
  if(!waiting){ AT.buf=[]; AT.ok=false; AT.span=null; return; }
  AT.t+=dt; if(st&&st.present) AT.buf.push({t:AT.t,h:st.height});
  while(AT.buf.length&&AT.buf[0].t<AT.t-6) AT.buf.shift();
  AT.acc+=dt; if(AT.acc<0.25) return; AT.acc=0;
  var r=tunePick(AT.buf); if(!r){ AT.ok=false; return; }
  // помаханный диапазон ложится на 10–90% экрана: запас с обеих сторон, чтобы поправить ещё ниже или выше, не упираясь в стол.
  // Стол как «низ экрана» пользователь отверг: у стола сонар подлагивает, а скорректировать ниже уже некуда. Рабочий диапазон — 5–15 см
  var a=0.35, B=0.10, TP=0.90, f0=gSpan;
  if(r.wave&&gAutoField){ var F=r.span/((0.5-B)*2/(1+ASYM)+(TP-0.5)*2*ASYM/(1+ASYM)); F=Math.max(50,Math.min(150,F)); gSpan+=(F-gSpan)*a; }
  var cen=r.wave?r.lo+(0.5-B)*2*gSpan/(1+ASYM):r.med, d=(cen-100)*-a;   // тянем середину на треть за шаг
  if(Math.abs(d)>0.2){ DSP2.shift(d); AT.buf.forEach(function(q){ q.h+=d; }); }
  AT.ok=r.wave; AT.span=r.span;
  if(Math.abs(d)>0.2||Math.abs(gSpan-f0)>0.2) slogEv('подстройка',{d:+d.toFixed(1),field:+gSpan.toFixed(1),span:+r.span.toFixed(0),wave:r.wave});
}
function handFrac(){
  var st=absS.st; if(!st||!st.present) return null;
  return fracOf(st.height);
}
/* звуки: громкие и яркие — но через три фильтра, чтобы ни одна гармоника не попала в полосу зонда */
var sfxIn=null, sfxVol=0.9, sfxNoise=null;
function sfxBus(){
  if(sfxIn) return;
  sfxIn=ctx.createGain(); sfxIn.gain.value=1.4*sfxVol;
  var comp=ctx.createDynamicsCompressor(); comp.threshold.value=-20; comp.knee.value=6; comp.ratio.value=6; comp.attack.value=0.002; comp.release.value=0.12;
  var lim=ctx.createDynamicsCompressor(); lim.threshold.value=-3; lim.knee.value=0; lim.ratio.value=20; lim.attack.value=0.001; lim.release.value=0.06;
  var f1=ctx.createBiquadFilter(), f2=ctx.createBiquadFilter(), f3=ctx.createBiquadFilter();
  [f1,f2,f3].forEach(function(f){ f.type='lowpass'; f.frequency.value=6000; f.Q.value=0.7; });
  sfxIn.connect(comp); comp.connect(lim); lim.connect(f1); f1.connect(f2); f2.connect(f3); f3.connect(ctx.destination);
  var len=Math.floor(ctx.sampleRate*0.8); sfxNoise=ctx.createBuffer(1,len,ctx.sampleRate);
  var d=sfxNoise.getChannelData(0); for(var i=0;i<len;i++) d[i]=Math.random()*2-1;
}
function sfx(kind){
  if(!gSfxOn||!ctx) return;
  sfxBus();
  var t=ctx.currentTime;
  function tone(f1,f2,dur,type,vol,at){ var o=ctx.createOscillator(), g=ctx.createGain(), s=t+(at||0); o.type=type||'square';
    o.frequency.setValueAtTime(f1,s); if(f2) o.frequency.exponentialRampToValueAtTime(f2,s+dur);
    g.gain.setValueAtTime(0,s); g.gain.linearRampToValueAtTime(vol,s+0.004); g.gain.setValueAtTime(vol,s+dur*0.6); g.gain.exponentialRampToValueAtTime(0.0001,s+dur);
    o.connect(g); g.connect(sfxIn); o.start(s); o.stop(s+dur+0.02); }
  function crash(dur,freq,vol,at){ var src=ctx.createBufferSource(), bp=ctx.createBiquadFilter(), g=ctx.createGain(), s=t+(at||0);
    src.buffer=sfxNoise; bp.type='bandpass'; bp.frequency.value=freq; bp.Q.value=0.8;
    g.gain.setValueAtTime(vol,s); g.gain.exponentialRampToValueAtTime(0.0001,s+dur);
    src.connect(bp); bp.connect(g); g.connect(sfxIn); src.start(s); src.stop(s+dur+0.02); }
  if(kind==='start'){ tone(880,null,0.09,'square',0.5); tone(1320,null,0.14,'square',0.5,0.1); }
  else if(kind==='hit'){ crash(0.4,1800,0.9); tone(900,160,0.32,'square',0.5); }
  else if(kind==='level'){ [1047,1319,1568].forEach(function(f,i){ tone(f,null,0.08,'square',0.45,i*0.08); }); }
  else if(kind==='over'){ tone(880,110,0.9,'square',0.5); crash(0.7,1200,0.6); }
  else if(kind==='pause'){ tone(1000,700,0.12,'square',0.35); }
  else if(kind==='resume'){ tone(700,1000,0.12,'square',0.35); }
  else if(kind==='tick'){ tone(1200,null,0.07,'square',0.35); }
}
el('gVol').addEventListener('input',function(){ sfxVol=parseInt(this.value,10)/100; el('gVolv').textContent=this.value+'%';
  if(sfxIn) sfxIn.gain.setTargetAtTime(1.4*sfxVol,ctx.currentTime,0.02); sfx('pause'); });
function gLoop(now){
  if(mode!=='game'){ gOn=false; return; }
  requestAnimationFrame(gLoop);
  var dt=(now-gLast)/1000; gLast=now; if(!G||!gCtx) return;
  if(!probeLost&&DSP2.info().lost){ probeLost=true; setProbe('off'); }
  if(!gMenuOpen){ var hf=handFrac(); Game.update(G,dt,hf); G.events.forEach(sfx);
    if(G.events.indexOf('count')>=0){ logStart(); gTick=4; slogEv('отсчёт',{field:+gSpan.toFixed(1),auto:gAutoField}); spanLabel(); try{ localStorage.setItem('sonar_field_mm',String(Math.round(gSpan))); }catch(e){} }
    autoTune(dt);
    if(G.state==='count'){ var n=Math.ceil(G.countT); if(n<gTick){ gTick=n; sfx('tick'); } }
    logRender(hf);
    if(G.events.indexOf('over')>=0) logStop();
    if(G.events.indexOf('over')>=0&&G.best>gBest){ gBest=G.best; try{ localStorage.setItem(bestKey(),String(gBest)); }catch(e){} } }
  draw();
  el('gStart').classList.toggle('hidden',!(G.state==='wait'&&!gMenuOpen));
  el('gAgain').classList.toggle('hidden',!(G.state==='over'&&!gMenuOpen&&G.overT>0.8));
  el('gSave').classList.toggle('hidden',!(G.state==='over'&&LOG&&LOG.f>0&&!gMenuOpen&&G.overT>0.8));
}
function poly(c,x,y,v,rot){ c.beginPath(); var cs=Math.cos(rot), sn=Math.sin(rot);
  v.forEach(function(p,i){ var px=x+p[0]*cs-p[1]*sn, py=y+p[0]*sn+p[1]*cs; if(i) c.lineTo(px,py); else c.moveTo(px,py); }); c.closePath(); }
function ship(c,x,y,r,t,thrust){
  c.save(); c.translate(x,y);
  if(thrust){ var f=r*(0.9+0.5*Math.sin(t*38)+0.3*Math.sin(t*23)); c.strokeStyle='#F2B35A'; c.beginPath(); c.moveTo(-r*0.7,-r*0.3); c.lineTo(-r*0.7-f,0); c.lineTo(-r*0.7,r*0.3); c.stroke(); }
  c.strokeStyle='#D9743F'; c.shadowColor='#D9743F'; c.shadowBlur=10;
  c.beginPath(); c.moveTo(r*1.2,0); c.lineTo(-r*0.8,-r*0.75); c.lineTo(-r*0.45,0); c.lineTo(-r*0.8,r*0.75); c.closePath(); c.stroke();
  c.restore();
}
function draw(){
  var c=gCtx, W=G.W, H=G.H; c.setTransform(gDpr,0,0,gDpr,0,0);
  c.fillStyle='#04070A'; c.fillRect(0,0,W,H);
  G.stars.forEach(function(s){ var a=0.25+0.6*s.z; c.fillStyle='rgba(200,215,210,'+a.toFixed(2)+')'; c.fillRect(s.x,s.y,s.z*1.8,s.z*1.8); });
  c.lineWidth=1.6; c.lineJoin='round';
  c.strokeStyle='#CFD8D4'; c.shadowColor='#9FB3AE'; c.shadowBlur=6;
  G.rocks.forEach(function(r){ poly(c,r.x,r.y,r.v,r.rot); c.stroke(); });
  c.shadowBlur=0;
  G.parts.forEach(function(p){ var a=Math.max(0,Math.min(1,p.life*1.4)); c.strokeStyle='rgba(242,179,90,'+a.toFixed(2)+')';
    c.beginPath(); c.moveTo(p.x,p.y); c.lineTo(p.x-p.vx*0.03,p.y-p.vy*0.03); c.stroke(); });
  var hasHand=handFrac()!==null, blink=G.inv>0&&Math.floor(G.t*12)%2===0;
  if(G.state!=='over'&&!blink) ship(c,G.ship.x,G.ship.y,G.ship.r,G.t,G.state==='play');
  if(G.flash>0){ c.fillStyle='rgba(196,80,58,'+(G.flash*1.2).toFixed(2)+')'; c.fillRect(0,0,W,H); }
  // индикатор руки у края — внутри безопасной зоны
  var m=H*0.08, hf=handFrac(), ix=(hand==='left')?Math.max(16,gSafe.l+12)-3:W-Math.max(16,gSafe.r+12); c.fillStyle='rgba(37,49,57,.9)'; c.fillRect(ix,m,3,H-2*m);
  if(hf!==null){ c.fillStyle='#D9743F'; c.fillRect(ix-3,H-m-hf*(H-2*m)-4,9,8); }
  if(AT.ok&&(G.state==='wait'||G.state==='over')){ var r2=tunePick(AT.buf); if(r2){ c.fillStyle='#6FAE7E';     // пойманный диапазон — две зелёные отметки у индикатора
    [r2.lo,r2.hi].forEach(function(v){ var f=fracOf(v); c.fillRect(ix-7,H-m-f*(H-2*m)-1,17,2); }); } }
  // счёт, рекорд, уровень и жизни — одним блоком по центру сверху
  var fs=Math.max(11,Math.round(H*0.04)), top=Math.max(gSafe.t,H*0.03)+6, sc=String(Math.floor(G.score)).padStart(5,'0');
  c.textBaseline='top'; c.textAlign='center'; c.font=fs+'px '+gFont; c.fillStyle='#E7EDE9'; c.fillText(sc,W/2,top);
  var sw=c.measureText(sc).width;
  for(var i=0;i<G.lives;i++){ c.save(); c.translate(W/2+sw/2+fs*1.3+i*fs*1.5,top+fs*0.5); c.strokeStyle='#D9743F'; c.lineWidth=1.2;
    c.beginPath(); c.moveTo(fs*0.55,0); c.lineTo(-fs*0.4,-fs*0.35); c.lineTo(-fs*0.2,0); c.lineTo(-fs*0.4,fs*0.35); c.closePath(); c.stroke(); c.restore(); }
  if(LOG&&LOG.on&&(G.state==='play'||G.state==='count')){ c.fillStyle='rgba(196,80,58,'+(0.5+0.4*Math.sin(G.t*4)).toFixed(2)+')';
    c.beginPath(); c.arc(W/2-sw/2-fs*1.1,top+fs*0.5,fs*0.28,0,Math.PI*2); c.fill(); }
  var fs2=Math.max(9,Math.round(fs*0.62)); c.font=fs2+'px '+gFont; c.fillStyle='#8A9B96';
  c.fillText('РЕКОРД '+String(Math.max(gBest,G.best)).padStart(5,'0')+(G.state==='play'&&G.level>1?'   УР '+G.level:''),W/2,top+fs*1.45);
  // надписи состояний
  function center(big,small){ c.textAlign='center'; c.textBaseline='middle';
    c.font=Math.round(H*0.06)+'px '+gFont; c.fillStyle='#E7EDE9'; c.fillText(big,W/2,H*0.42);
    if(small){ c.font=Math.max(9,Math.round(H*0.028))+'px '+gFont; c.fillStyle='#8A9B96';
      small.split('\n').forEach(function(line,j){ c.fillText(line,W/2,H*0.55+j*H*0.06); }); } }
  if(probeLost) center('НЕТ ЗОНДА','звук ушёл в другое устройство — наушники или Bluetooth?\nотключи их и нажми «Меню» → «Перезагрузить»');
  else if(G.state==='wait') center(hasHand?'ГОТОВ?':'АСТЕРОИДЫ',!hasHand?'поставь ладонь '+side()+' от телефона':
      (AT.ok?'диапазон '+(AT.span/10).toFixed(1).replace('.',',')+' см пойман\nможно жать «Старт»':'помаши ладонью вверх-вниз, примерно 5–15 см над столом —\nкорабль подстроится под твой размах'));
  else if(G.state==='count') center(String(Math.max(1,Math.ceil(G.countT))),'приготовься');
  else if(G.state==='over') center('ИГРА ОКОНЧЕНА','Счёт '+Math.floor(G.score)+'   рекорд '+Math.max(gBest,G.best)+'\n'+(AT.ok?'диапазон '+(AT.span/10).toFixed(1).replace('.',',')+' см пойман':'помаши ладонью — подстрою заново'));
  if(gDiagOn){ c.textAlign='left'; c.textBaseline='bottom'; c.font='11px "IBM Plex Mono", monospace'; c.fillStyle='#8A9B96';
    c.fillText(diagText(absS.st),Math.max(10,gSafe.l+8),H-Math.max(6,gSafe.b+4)); }
}
el('gMenu').addEventListener('click',function(){ gMenuOpen=true; el('gPanel').classList.remove('hidden'); el('gLogI').textContent=logInfo()+' '+slogInfo(); spanLabel(); fitScreen(); });
el('gSave').addEventListener('click',function(ev){ ev.stopPropagation(); logSave(); });
el('gLogS').addEventListener('click',function(){ logSave(); });
el('sLogS').addEventListener('click',function(){ slogSave(); });
el('calLogS').addEventListener('click',function(){ slogSave(); });
el('gDiagT').addEventListener('click',function(){ gDiagOn=!gDiagOn; this.textContent='Диагностика на экране: '+(gDiagOn?'вкл':'выкл'); });
el('gLogT').addEventListener('click',function(){ logOn=!logOn; this.textContent='Журнал партии: '+(logOn?'вкл':'выкл'); if(!logOn) logStop(); });
el('gResume').addEventListener('click',function(){ gMenuOpen=false; el('gPanel').classList.add('hidden'); gLast=performance.now(); fitScreen(); });
/* поле экрана — сколько миллиметров хода ладони на весь экран; запоминается */
function spanLabel(){ var v=Math.round(gSpan/5)*5; el('gSpanv').textContent=(v/10).toFixed(v%10?1:0).replace('.',',')+' см';
  el('gSpan').value=String(v); el('gAutoF').textContent='Подбирать по взмахам: '+(gAutoField?'да':'нет, вручную'); }
try{ var sv=parseInt(localStorage.getItem('sonar_field_mm')||'',10); if(sv>=50&&sv<=150) gSpan=sv; gAutoField=localStorage.getItem('sonar_field_auto')!=='0'; }catch(e){}
spanLabel();
el('gSpan').addEventListener('input',function(){ gSpan=parseInt(this.value,10); gAutoField=false; spanLabel();     // тронул ползунок — дальше ход ладони только вручную
  try{ localStorage.setItem('sonar_field_mm',String(gSpan)); localStorage.setItem('sonar_field_auto','0'); }catch(e){} });
el('gAutoF').addEventListener('click',function(){ gAutoField=!gAutoField; spanLabel(); try{ localStorage.setItem('sonar_field_auto',gAutoField?'1':'0'); }catch(e){} });
seg('data-gd',function(v){ gDiff=v; if(G){ Game.setDiff(G,v); G.state='wait'; G.rocks=[]; G.parts=[]; G.score=0; } loadBest(); });
el('gSfx').addEventListener('click',function(){ gSfxOn=!gSfxOn; this.textContent='Звуки: '+(gSfxOn?'вкл':'выкл'); });
el('gRecal').addEventListener('click',function(){ gMenuOpen=false; el('gPanel').classList.add('hidden'); quickStart(); });
el('gStart').addEventListener('click',function(ev){ ev.stopPropagation(); if(G&&G.state==='wait') Game.begin(G); });
el('gAgain').addEventListener('click',function(ev){ ev.stopPropagation(); if(G&&G.state==='over') Game.begin(G); });
['reload1','reload2','reload3'].forEach(function(id){ el(id).addEventListener('click',function(){ location.reload(); }); });
el('gHome').addEventListener('click',function(){ gMenuOpen=false; el('gPanel').classList.add('hidden'); mode=null; setProbe('off'); show('home'); });
})();
</script>
</body>
</html>
