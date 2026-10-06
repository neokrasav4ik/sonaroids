
/* ── СОНАРЛИНК: «СТРУНА» — прототип игры на двух телефонах (06.10, 1.56c) ──
   Эскиз «А» (sonarlink_3): два телефона торец к торцу, камеры друг к другу — одно поле из двух экранов. У внешнего края каждого
   (у разъёма) свой вихрь, его высоту ведёт ладонь у этого разъёма (как корабль Sonaroids: подстройка Tune, доля высоты). Между вихрями
   струна через стык экранов. Сверху и снизу через поле плывут светлые частицы (задеть струной — собрать) и тёмные кляксы (рвут струну;
   сшить — свести вихри на одну высоту и подержать). Вихри на одной высоте — «резонанс»: струна горит и тянет частицы к себе. Раунд 90 с.
   Связь — комната на сервере рекордов (server/pair.js): код из 4 цифр, высота ладони 25 раз в секунду, события. Каждый телефон решает
   за свою половину поля (столкновения там, где предмет) и сообщает другому; поле одинаковое у обоих — из одного зерна и общих часов.
   Половина — по повороту экрана (разъём слева — левая), тоны зонда — тоже: левая чётные, правая нечётные (СонарЛинк, раздел 2.7к).
   «Один телефон» — второй вихрь ведёт бот, всё поле на одном экране (заодно проба вида «Р3»). «Управление: палец» — без сонара (мышь, палец). */
var SL={phase:'idle'}, SL_API=(function(){ try{ var q=new URLSearchParams(location.search).get('api'); if(q) return q; }catch(e){} return window.SONAROIDS_API||'https://api.sonaroids.app'; })();
var SL_M=0.08, SL_UL=0.085, SL_UR=0.915, SL_ROUND=90, SL_CTL='palm';
try{ var rq=+new URLSearchParams(location.search).get('round'); if(rq>=3&&rq<=600) SL_ROUND=rq; }catch(e){}   /* ?round=N — короче для проверок */
window.__sl=function(){ return SL; };
try{ SL_CTL=localStorage.getItem('sonar_sl_ctl')==='touch'?'touch':'palm'; if(/[?&]mouse=1/.test(location.search)) SL_CTL='touch'; }catch(e){}
function slCtlLabel(){ el('siCtl').textContent='Управление: '+(SL_CTL==='touch'?'палец / мышь (без сонара)':'ладонь (сонар)'); }
function slOpen(){ slCtlLabel(); slCalLabel(); slTabLabel(); el('siNow').textContent=''; show('strIntro'); }
/* ── сеть ── */
function slNow(){ return Date.now()+(SL.off||0); }
/* ── 1.56h: журнал «Струны» — у каждого телефона свой (автор: «чтобы потом понять, была ли синхронизация: движение ладоней, синхронизация
   расстояний, правильно ли вообще игра вела себя»). Звук микрофона (последние «раунд + 150 с») и числа обработки кадр за кадром — журнал
   настройки (SLOG, по кругу); здесь — игра: каждый шаг (ладонь, вихри, струна, счёт), отправленные и полученные высоты (с общими часами
   и путём: напрямую / через сервер), пинги, оценки часов, события и сообщения. Времена: ms — от начала журнала (performance.now),
   srv — общие часы (часы сервера по оценке этого телефона), f — кадр звука (512 отсчётов). Разбор двух журналов — lab/tools/eval_string.js ── */
var SLL=null, SL_VER='1.56s', SL_WK=null;
function sllStart(){ SLL={on:true,p0:performance.now(),wall:new Date().toISOString(),game:[],tx:[],rx:[],ping:[],ev:[],off:[],rounds:[],lastG:0}; }
function slObjsC(a){ return (a||[]).map(function(o){ return [o.k,+o.ts.toFixed(3),+o.u.toFixed(4),o.dir,+o.sp.toFixed(4),o.kind,o.dep===undefined?null:+o.dep.toFixed(4),o.hold===undefined?null:+o.hold.toFixed(3),o.gone?1:0,+o.ph.toFixed(4),+o.sw.toFixed(4)]; }); }
function sllT(){ return +(performance.now()-SLL.p0).toFixed(1); }
function sllF(){ return SLOG&&SL.logging&&SLOG.f!==undefined?SLOG.f:-1; }
function slE(k,x){ slogEv(k,x); if(SLL) SLL.ev.push([sllT(),Math.round(slNow()),sllF(),SL.t===undefined?null:+SL.t.toFixed(3),k,x===undefined?null:x]); }
var SL_PH={idle:0,pair:1,prep:2,count:3,play:4,over:5,ruler:6};
function r4(x){ return x===undefined||x===null?null:+x.toFixed(4); }
/* шаг игры: в раунде — каждый кадр экрана, вне раунда — не чаще 20 раз в секунду */
function sllGame(now,hp,lag){ if(!SLL||!SLL.on) return; var live=SL.phase==='count'||SL.phase==='play'||SL.phase==='ruler'; if(!live&&now-SLL.lastG<50) return; SLL.lastG=now;
  SLL.game.push([sllT(),Math.round(slNow()),sllF(),SL_PH[SL.phase]===undefined?-1:SL_PH[SL.phase],SL.t===undefined?null:+SL.t.toFixed(3),SL.palm?1:0,r4(SL.frac),SL.dist===null||SL.dist===undefined?null:+SL.dist.toFixed(1),
    r4(SL.hy),r4(hp),r4(SL.pv),r4(SL.vL),r4(SL.vR),+(SL.res||0).toFixed(3),SL.cut?1:0,+(SL.alignT||0).toFixed(2),SL.score||0,SL.got||0,SL.cuts||0,SL.burned||0,lag,slDirect()?1:0,SL.lead===null||SL.lead===undefined?null:+SL.lead.toFixed(1),SL.cm===undefined?null:+SL.cm.toFixed(2),SL.fRaw===undefined?null:+SL.fRaw.toFixed(4),SL.syncC===undefined?null:+SL.syncC.toFixed(3),SL.rules==='sync'?1:0]); }
/* где предмет и где струна в момент события — по взгляду этого телефона (у решившего зазор должен быть меньше порога; у другого — близок к нему, если синхронно) */
function slGeo(k){ var o=SL.objs[k]; if(!o||SL.t===undefined) return {k:k}; var p=slPos(o,SL.t), sv=slStr(p.u,SL.vL,SL.vR);
  return {k:k,u:r4(p.u),v:r4(p.v),str:r4(sv),dv:r4(Math.abs(p.v-sv)),vL:r4(SL.vL),vR:r4(SL.vR),res:+(SL.res||0).toFixed(3),rs:Math.abs(SL.vL-SL.vR)<0.05&&!SL.cut?1:0,half:p.u<0.5?'L':'R'}; }
/* 1.56l: размеры экрана — автор: «на айфоне вихрь был чуть ли не в середине экрана» */
function slGeom(){ var vv=window.visualViewport, cv=el('slC'), b=cv&&cv.getBoundingClientRect?cv.getBoundingClientRect():null;
  return {w:SLC.w,h:SLC.h,dpr:SLC.dpr,inner:[window.innerWidth,window.innerHeight],screen:[screen.width,screen.height],vv:vv?[+vv.width.toFixed(1),+vv.height.toFixed(1),+vv.offsetLeft.toFixed(1),+vv.scale.toFixed(3)]:null,
    canvas:b?[+b.left.toFixed(1),+b.top.toFixed(1),+b.width.toFixed(1),+b.height.toFixed(1)]:null,vortex_x:SL.half?+slX(SL.half==='L'?SL_UL:SL_UR).toFixed(1):null,seam:SL_VIEW}; }
function slLogMeta(){ var inf=null; try{ inf=booted?DSP2.info():null; }catch(e){}
  var objs=slObjsC(SL.objs);
  return {meta:{kind:'string-log',string:{v:1,lab:SL_VER,side:SL.side===undefined?null:SL.side,half:SL.half||null,peer_half:SL.peerHalf||null,half_swapped:!!SL.halfNote,bot:!!SL.bot,near:!!SL.near,code:SL.code||null,
      mode:SL.mode||'game',tab:SL_TAB,use_tab:!!SL.useTab,control:SL_CTL,cal_mode:SL_CAL,seam:SL_VIEW,peer_level:SL.peerLvl||null,level:SL.lvl?{lo:SL.lvl.lo,hi:SL.lvl.hi}:null,cal_me:SL.calMe||null,cal_peer:SL.calPeer||null,cal_shared:SL.calDone||null,field:SL.T?+SL.T.field.toFixed(1):null,cal:inf?inf.cal:null,tones:(typeof linkPar==='function'?linkPar():'all'),
      round_s:SL_ROUND,seed:SL.seed===undefined?null:SL.seed,T0:SL.T0||null,clock_off_ms:SL.off===undefined?null:Math.round(SL.off),clock_rtt_ms:SL.rtt===undefined?null:SL.rtt,
      rtt_direct_ms:SL.rttD?Math.round(SL.rttD):null,rtt_server_ms:SL.rttS?Math.round(SL.rttS):null,rtc_state:SL.rtcState||null,direct_now:slDirect(),phase:SL.phase,screen:slGeom(),screen:slGeom(),
      result:{score:SL.score||0,got:SL.got||0,burned:SL.burned||0,cuts:SL.cuts||0},log_start:SLL?SLL.wall:null,saved:new Date().toISOString(),ua:navigator.userAgent,audio:!!(SLOG&&SL.logging&&SLOG.f),
      columns:{game:['ms','srv','f','phase 0idle 1pair 2prep 3count 4play 5over','t_s','palm','frac_0_1','dist_mm','my_v (0 top)','partner_frac_interp','partner_v','vL','vR','resonance_0_1','cut','align_s','score','got','cuts','burned','lag_ms','direct','lead_mm','fist_cm','frac_raw (before centring)','sync_corr','rules_sync'],
        tx:['ms','srv_stamp','frac (-1 no palm)','via d/s'],rx:['ms','srv_now','server_t (via s)','srv_stamp','frac (-1 no palm)','via d/s'],ping:['ms','rtt_ms','via d/s'],off:['ms','clock_off_ms','post_rtt_ms'],
        events:['ms','srv','f','t_s','event','data'],objs:['k','ts_s','u','dir (+1 from top)','speed','kind p/c','depth','hold_s','gone','ph','sw'],rounds:'{T0,seed,objs} per round, objs as objs'}}},
    glog:{string:{game:SLL?SLL.game:[],tx:SLL?SLL.tx:[],rx:SLL?SLL.rx:[],ping:SLL?SLL.ping:[],off:SLL?SLL.off:[],events:SLL?SLL.ev:[],rounds:SLL?SLL.rounds:[],script:SLL&&SLL.script?SLL.script:[],objs:objs}}}; }
function slLogBlob(){ var x=slLogMeta();
  if(SLOG&&SL.logging&&SLOG.f) return slogBlob(x);
  x.meta.fs=fs||48000; x.meta.N=N; x.meta.frames=0; return glogWav(new Int16Array(0),x.meta,{dsp:[],render:[],events:[],string:x.glog.string}); }
function slSaveLog(){ shareWav(slLogBlob(),'sonar_string_'+(SL.bot?'bot':SL.half||'')+'_'); }
window.__slLog=slLogBlob;
try{ document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible'&&SL.phase&&SL.phase!=='idle'){ natOff(); try{ if(ctx&&ctx.state!=='running'&&ctx.resume) ctx.resume(); }catch(e){} slE('страница снова на экране: звук '+(ctx?ctx.state:'—'));
  /* 1.56r: если телефон забрал микрофон, пока лаба была свёрнута, — сказать и дать «Подготовиться заново» (запуск с нажатия откроет его заново) */
  setTimeout(function(){ if(booted&&SL.sonar&&SL.phase&&SL.phase!=='idle'&&SL.phase!=='over'&&!labHealthy()){ slE('звук пропал после сворачивания'); mode=null; SL.sonar=false;
    if(SL.phase==='play'||SL.phase==='ruler'||SL.phase==='count'){ SL.phase='prep'; SL.T0=0; }
    el('slSay').textContent='Звук прервался'; el('slSub').textContent='Пока лаба была свёрнута, телефон отключил микрофон. Нажми «Подготовиться заново».'; slFail(); } },900); } }); }catch(e){}
window.__slEv=function(){ return SLL?SLL.ev.map(function(e){ return e[0].toFixed(0)+' '+e[4]; }):[]; };
function slPost(path,body){ var t0=Date.now(); return fetch(SL_API+'/v1/pair/'+path,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(body)})
  .then(function(r){ return r.json().then(function(j){ var t1=Date.now(); if(j&&typeof j.t==='number'){ var rtt=t1-t0; if(SL.rtt===undefined||rtt<SL.rtt+5){ SL.rtt=Math.min(SL.rtt===undefined?1e9:SL.rtt,rtt); SL.off=j.t-(t0+t1)/2; if(SLL) SLL.off.push([sllT(),Math.round(SL.off),rtt]); } } j.status=r.status; return j; }); }); }
function slSend(m){ if(SL.bot||!SL.code) return; if(m.e&&m.e!=='ping'&&m.e!=='pong') slE('→ '+m.e+(slDirect()?' (напрямую)':' (сервер)'),m); if(SL.dc&&SL.dc.readyState==='open'){ try{ SL.dc.send(JSON.stringify(m)); return; }catch(e){} } slSrv(m); }
function slSrv(m){ slPost('send',{code:SL.code,key:SL.key,m:m}).catch(function(){}); }
/* ── 1.56g: прямой канал телефон↔телефон (WebRTC). Знакомит их сервер (предложение, ответ, адреса — сообщениями комнаты), дальше
   высоты и события идут напрямую: в одной Wi-Fi — несколько миллисекунд. Без внешних серверов (только адреса самих телефонов): в разных
   сетях прямого пути нет — тогда всё идёт через сервер, как раньше. Задержку меряю «пингом» по обоим путям раз в 2 с ── */
function slRtc(){ if(SL.pc||SL.bot||typeof RTCPeerConnection==='undefined') return; var pc; try{ pc=new RTCPeerConnection({iceServers:[]}); }catch(e){ return; } SL.pc=pc;
  pc.onicecandidate=function(e){ if(e.candidate) slE('→ rtc адрес',{c:String(e.candidate.candidate||'').split(' ').slice(4,8).join(' ')}); if(e.candidate) slSrv({e:'rtc',c:e.candidate.toJSON?e.candidate.toJSON():e.candidate}); };
  pc.ondatachannel=function(e){ slDc(e.channel); };
  pc.onconnectionstatechange=function(){ SL.rtcState=pc.connectionState; slE('прямой канал: '+pc.connectionState); slStatus(); };
  if(SL.side===0){ slDc(pc.createDataChannel("sl")); pc.createOffer().then(function(o){ return pc.setLocalDescription(o); }).then(function(){ slE('→ rtc offer'); slSrv({e:'rtc',sdp:pc.localDescription.toJSON?pc.localDescription.toJSON():pc.localDescription}); }).catch(function(e){ slE('прямой канал: ошибка '+(e&&e.message||e)); }); } }
function slDc(dc){ SL.dc=dc; dc.onmessage=function(e){ try{ slMsg(JSON.parse(e.data),null,'d'); }catch(x){} }; dc.onopen=function(){ slE('прямой канал открыт'); slStatus(); }; dc.onclose=function(){ slE('прямой канал закрыт'); slStatus(); }; }
function slRtcMsg(m){ if(m.sdp&&m.sdp.type==='offer'&&SL.pc&&SL.pc.remoteDescription){ slE('прямой канал: новое предложение'); slRtcClose(); } if(!SL.pc) slRtc(); var pc=SL.pc; if(!pc) return;
  if(m.sdp){ pc.setRemoteDescription(m.sdp).then(function(){ if(m.sdp.type==='offer') return pc.createAnswer().then(function(a){ return pc.setLocalDescription(a); }).then(function(){ slE('→ rtc answer'); slSrv({e:'rtc',sdp:pc.localDescription.toJSON?pc.localDescription.toJSON():pc.localDescription}); }); })
    .then(function(){ (SL.rtcQ||[]).forEach(function(c){ pc.addIceCandidate(c).catch(function(){}); }); SL.rtcQ=[]; }).catch(function(){}); }
  if(m.c){ if(pc.remoteDescription) pc.addIceCandidate(m.c).catch(function(){}); else (SL.rtcQ=SL.rtcQ||[]).push(m.c); } }
/* 1.56i: прямой канал начинает сторона 0, получив «hi» напарника — значит, его поток уже слушает (журналы 06.10 18:22: предложение ушло
   по первому «напарник пришёл», когда второй телефон ещё не подключил поток, и пропало — прямой связи не было всю партию). Пришёл «hi» снова,
   а канала нет — начать заново; сторона 1 на новое предложение заводит новое соединение */
function slRtcClose(){ try{ if(SL.dc) SL.dc.close(); if(SL.pc) SL.pc.close(); }catch(e){} SL.dc=null; SL.pc=null; SL.rtcQ=[]; }
function slRtcStart(){ if(SL.bot||SL.side!==0) return; if(SL.pc&&SL.pc.connectionState==='connected') return; if(SL.pc){ slE('прямой канал: заново'); slRtcClose(); } slRtc(); }
function slDirect(){ return !!(SL.dc&&SL.dc.readyState==='open'); }
function slPing(){ if(SL.bot||!SL.code||!SL.peerHere) return; var t=performance.now(); slSrv({e:'ping',t:t,v:'s'}); if(slDirect()) try{ SL.dc.send(JSON.stringify({e:'ping',t:t,v:'d'})); }catch(e){} }
function slListen(){ if(SL.es) try{ SL.es.close(); }catch(e){}
  var es=new EventSource(SL_API+'/v1/pair/sse?code='+SL.code+'&key='+SL.key); SL.es=es;
  es.addEventListener('hello',function(e){ var d=JSON.parse(e.data); slE('сервер: на связи',{peer:d.peer,t:d.t}); SL.link=true; if(d.peer) slPeer(true); slStatus(); });
  es.addEventListener('peer',function(e){ var d=JSON.parse(e.data); slE(d.here?'напарник пришёл':'напарник ушёл',{t:d.t}); slPeer(d.here); });
  es.addEventListener('m',function(e){ var d=JSON.parse(e.data); slMsg(d.m,d.t,'s'); });
  es.onerror=function(){ if(SL.link!==false) slE('сервер: связь потеряна'); SL.link=false; slStatus(); }; }
function slPeer(here){ SL.peerHere=here; if(here){ slSend({e:'hi',half:SL.half,ready:SL.ready}); if(SL.calMe) slSend({e:'cal',r:SL.calMe.r,f:SL.calMe.f,fm:SL.calMe.fm,mode:SL_CAL}); } slStatus(); }
function slStatus(){ var t=SL.code?(SL.near?'рядом':'код '+SL.code)+(SL.link?'':' · нет связи')+(SL.peerHere?(slDirect()?' · напрямую'+(SL.rttD?' '+Math.round(SL.rttD)+' мс':''):' · через сервер'+(SL.rttS?' '+Math.round(SL.rttS)+' мс':'')):' · ждём напарника'):'';
  if(SL.phase==='pair'){ var ls=SL.lastSay; el('slSay').textContent=SL.peerHere?(ls?ls[0]:'Напарник здесь'):SL.near?'Ищу второй телефон…':'Код: '+SL.code; el('slSub').textContent=SL.peerHere?(ls?ls[1]:'Готовимся.'):SL.near?'На нём: СонарЛинк → Струна → «Рядом». Не находит (VPN, разные сети) — там «Войти по коду» '+SL.code+'.':'На втором телефоне: СонарЛинк → Струна → этот код → «Войти».'; }
  el('slHud').textContent=t+(SL.half?' · '+(SL.half==='L'?'левая':'правая')+' половина'+(SL.halfNote?' (телефоны лежат одинаково — взял другую)':''):''); }
function slMsg(m,t,via){ if(!m) return;
  if(m.e==='ping'){ var r={e:'pong',t:m.t,v:m.v}; if(m.v==='d'&&slDirect()) try{ SL.dc.send(JSON.stringify(r)); }catch(e){} else slSrv(r); return; }
  if(m.e==='pong'){ var rt=performance.now()-m.t; if(SLL) SLL.ping.push([sllT(),+rt.toFixed(1),m.v]); if(m.v==='d') SL.rttD=SL.rttD?SL.rttD*0.7+rt*0.3:rt; else SL.rttS=SL.rttS?SL.rttS*0.7+rt*0.3:rt; slStatus(); return; }
  if(m.e==='rtc'){ slE('← rtc '+(m.sdp?m.sdp.type:'адрес'),m.c?{c:String(m.c.candidate||'').split(' ').slice(4,8).join(' ')}:undefined); slRtcMsg(m); return; }
  if(m.e) slE('← '+m.e+(via==='d'?' (напрямую)':' (сервер)'),{m:m,t:t||null});
  if(m.e==='cal'){ SL.calPeer={r:m.r,f:m.f,fm:m.fm,mode:m.mode}; slCalShare(); return; }
  if(m.e==='lvl'){ SL.peerLvl=SL.peerLvl||{}; if(m.stage) SL.peerLvl[m.stage]=m.skip?'skip':m.r; if(m.skip&&SL.prep==='level') slLevelDone('ровно: у напарника не вышло — калибровка по взмахам'); return; }
  if(typeof m.h==='number'){ if(m.q) flRecv(m.s,m.q); if(SLL&&SLL.on) SLL.rx.push([sllT(),Math.round(slNow()),t||null,m.s,m.h,via]); SL.pb.push([m.s,m.h]); if(SL.pb.length>40) SL.pb.shift(); return; }
  if(m.e==='hi'){ SL.peerHi=true; SL.peerHalf=m.half; if(m.half===SL.half&&SL.side===1){ SL.half=SL.half==='L'?'R':'L'; SL.halfNote=true; slE('половина: обе одинаковые — беру '+SL.half); slTones(); } if(m.ready) SL.peerReady=true; slRtcStart(); slStatus(); slMaybeStart(); return; }
  if(m.e==='ready'){ SL.peerReady=true; slMaybeStart(); return; }
  if(m.e==='relevel'){ slRelevel(false); return; }
  if(m.e==='start'){ if(m.mode&&m.mode!==SL.mode){ slE('режим от напарника: '+m.mode); SL.mode=m.mode; } slStartAt(m.T0,m.seed); return; }
  if(m.e==='got'){ slGot(m.k,false,m.p); return; }
  if(m.e==='cut'){ slCut(m.k,false); return; }
  if(m.e==='burn'){ slBurn(m.k,false,m.p); return; }
  if(m.e==='stitch'){ slStitch(false); return; } }
/* ── половина и тоны: разъём слева — левая половина, чётные тоны; справа — правая, нечётные ── */
function slTones(){ setLinkPar(SL.bot&&SL.mode!=='calib'?'all':SL.half==='L'?0:1); }   /* один телефон — соседа нет, все тоны */
function slHalfGuess(){ var o=orientSide(); return o==='left'?'L':o==='right'?'R':(SL.side===1?'R':'L'); }
/* ── начало: комната, бот ── */
function slReset(){ if(SL.es) try{ SL.es.close(); }catch(e){} try{ if(SL.dc) SL.dc.close(); if(SL.pc) SL.pc.close(); }catch(e){} cancelAnimationFrame(SL.raf||0);
  SL={phase:'idle',pb:[],objs:[],score:0,got:0,cuts:0,combo:1,cut:null,alignT:0,res:0,fx:[],ph:0.5,hy:null,present:false,dist:null,T:null,last:0,raf:0,shifts:[]}; }
function slBegin(how,md){ SL_LASTMODE=md||'game'; slReset(); sllStart(); SL.bot=how==='bot'; SL.mode=md||'game'; el('slAlign').classList.add('hidden'); slE('начало: '+how,{ctl:SL_CTL,cal:SL_CAL,round:SL_ROUND,orient:(typeof orientSide==='function'?orientSide():null),seam:SL_VIEW});
  /* 1.56k (автор: «сделай в струне зонд везде широкий»): на обоих телефонах широкий 16–20,5 кГц — один масштаб; выбор лабы вернётся при выходе */
  if(typeof probeWide!=='undefined'){ if(SL_WK===null) SL_WK=probeWide; probeWide=SL.mode==='ruler'?SL_RPROBE==='wide':true; slE('режим: '+SL.mode+', зонд: '+(probeWide?'широкий 16–20,5 кГц':'обычный 18,3–20,5 кГц')); } show('strPlay'); el('slBtns').classList.add('hidden'); el('slStop').classList.remove('hidden'); slSize();
  if(SL.bot){ SL.half=slHalfGuess(); SL.full=true; slTones(); SL.phase='prep'; slPrep(); slLoopStart(); return; }
  SL.phase='pair'; SL.near=how==='near'; el('slSay').textContent=how==='join'?'Вхожу…':'Открываю комнату…'; el('slSub').textContent='';
  var p=how==='new'?slPost('new',{}):how==='near'?slPost('near',{}):slPost('join',{code:el('siCode').value});
  p.then(function(j){ if(!j.ok){ el('slSay').textContent=j.status===404&&how!=='join'?'Сервер не умеет комнаты':j.status===404?'Нет такой комнаты':j.status===409?'Комната занята':'Сервер не ответил'; if(j.status===404&&how!=='join'){ el('slSub').textContent='Его нужно обновить: cd /opt/sonaroids && sudo git pull && sudo systemctl restart sonaroids-api'; slOver(true); return; } el('slSub').textContent='Проверь код.'; slOver(true); return; }
      SL.code=j.code; SL.key=j.key; SL.side=j.side; SL.half=slHalfGuess(); slE('комната',{code:j.code,side:j.side,near:!!j.near,half:SL.half}); slTones(); slListen(); slStatus(); slLoopStart(); slPrep();
      if(SL.near&&SL.side===0) setTimeout(function(){ if(SL.code===j.code&&!SL.peerHere&&SL.phase==='pair'){ el('slSay').textContent='Второй телефон не нашёлся'; el('slSub').textContent='Нажми «Рядом» на обоих телефонах в пределах полуминуты, в одной Wi-Fi. Или по коду: '+j.code+'.'; } },31000); })
   .catch(function(e){ el('slSay').textContent='Нет связи с сервером'; el('slSub').textContent=String(e&&e.message||e); slOver(true); }); }
/* ── подготовка сонара: как в Sonaroids (пустая комната → взмахи → «поймал») ── */
function slPrep(){ if(SL_CTL==='touch'){ slReady(); return; }
  var say=function(a,b){ SL.lastSay=[a,b||'']; if(SL.phase==='pair'&&!SL.peerHere&&!SL.bot) return; el('slSay').textContent=a; el('slSub').textContent=b||''; };
  /* 06.10: журнал подготовки (как «журнал настройки» лабы, до 120 с) — сохранить кнопкой, если не вышло; порог запаса при своих тонах — 26 дБ */
  /* как в игре: запас зонда не порог (Ми 9 в приложении играет и при 21 дБ — журнал 06.10 15:39, партия 1.19 при 20,9 дБ на 668 тыс. очков);
     судит обработка — «зонда не слышно» при выраженности ниже 12 дБ. Порог только для совсем тихого (громкость на нуле) */
  var thr=12;
  /* 1.56p (автор: «на ми9 повторная запись (или игра в лабе) — всегда пропадает зонд.. пока не перезагрузишь приложение»): перед каждой
     подготовкой снова глушу свой звук приложения (после «Сохранить журнал» — окно «поделиться», приложение уходит в фон и, вернувшись,
     может снова включить свой звук и микрофон) и бужу звук страницы; что было — в журнал */
  natOff(); var ctxSt=null; try{ ctxSt=ctx?ctx.state:null; if(ctx&&ctx.state!=='running'&&ctx.resume) ctx.resume(); }catch(e){}
  SL.prepSay=say; SL.peerLvl=null; SL.lvl=null; el('slBtns').classList.add('hidden'); boot().then(function(){ SL.logging=true; slogStart('струна '+(SL.half||'')+' '+parName(linkPar()),SL_ROUND+150,true); slE('сеть: '+(SL.bot?'бот':'комната '+SL.code+', сторона '+SL.side)); slE('звук страницы: '+(ctxSt||'ещё не запущен')+' → '+(ctx?ctx.state:'—')+(booted?', уже запускался':''));
    /* в приложении Android громкость ставлю сама, как игра: ниже 20% — 25% (лаба в окне приложения слышит зонд хуже игры со своим звуком) */
    try{ var A=window.SonaroidsApp; if(A&&A.getVolume&&A.setVolume){ var v0=A.getVolume(); if(v0<0.2){ A.setVolume(0.25); slE('громкость телефона: '+Math.round(v0*100)+'% → 25%'); } else slE('громкость телефона: '+Math.round(v0*100)+'%'); } }catch(e){}
    return sleep(150).then(function(){ return pickChannel(); }); })
  .then(function(){ slE('канал: '+chan); return autoLevel(); }).then(function(L){
    slE('уровень: запас '+L.snr.toFixed(1)+' дБ, громкость зонда '+L.g.toFixed(3)+(L.atMax?' (на пределе)':''));
    if(L.snr<thr){ setProbe('off'); slE('не готово: тихо'); say('Зонда почти не слышно','Запас '+L.snr.toFixed(0)+' дБ, нужно '+thr+(L.atMax?'; громкость зонда уже на пределе — прибавь громкость телефона':'')+'. '+NOPROBE); slFail(); return null; }
    /* 1.56r (автор, 22:13: «даже откалиброваться не смог»; журнал: эхо всю калибровку стояло на ~35 мм — линейку ставили уже после того, как
       выучена пустая комната, и ближнее эхо брало линейку): в калибровке сначала 5 с — поставить линейку и убрать руку; пустая комната
       учится уже с линейкой */
    var pre=SL.mode==='calib'?new Promise(function(r){ var n=5; (function tick(){ if(n<=0) return r(); say('Линейку — к разъёму','Поставь линейку стоймя у разъёма и убери руку. Слушаю пустую комнату через '+n+' с.'); n--; setTimeout(tick,1000); })(); }):Promise.resolve();
    return pre.then(function(){
    try{ DSP2.set('holdfloor',0); }catch(e){} var cal0=dspBand(DSP2); DSP2.init(fs,linkPar()); DSP2.setCal(cal0); DSP2.set('autocenter',1); mode='str'; SL.sonar=true; SL.prep='empty';
    say('Убери руку',SL.mode==='calib'?'Слушаю пустую комнату — линейка стоит, руки нет.':'Слушаю пустую комнату. Тоны: '+parName(linkPar())+'.'); return rpWait(DSP2); }); }).then(function(st){
    if(!st) return; var inf=DSP2.info(); slE('обработка: выраженность '+(inf.prom===null?'—':inf.prom.toFixed(1))+' дБ');
    if(st==='noprobe'){ setProbe('off'); mode=null; slE('не готово: зонда не слышно'); say('Зонда не слышно','Выраженность '+(inf.prom===null?'—':inf.prom.toFixed(0))+' дБ, нужно 12. '+NOPROBE); slFail(); return; }
    /* 1.56l (журналы 06.10 18:51: на iPhone ладонь пропадала 46 раз, видна 68% раунда, «нить дёргалась и прыгала, особенно во второй половине»):
       пока ладонь считалась ушедшей, уровень пустой комнаты учился на её эхе и полз вверх (−21 → −12 дБ), и каждая потеря облегчала следующую —
       то же, что в игре 29.09 (v0.91), где уровень на время партии держится. Здесь — держится с той же минуты, как выучен по пустой комнате
       (перед «Помаши»). Прогон журнала iPhone той же обработкой: видна 68% → 100%, потерь 46 → 0; у Ми 9 и в партии 18:22 — без изменений */
    return sleep(500).then(function(){ try{ DSP2.set('holdfloor',1); }catch(e){} slE('пустая комната запомнена',{floor:SL.floor===undefined||SL.floor===null?null:+SL.floor.toFixed(1)}); if(SL.mode==='calib'||(SL.mode==='game'&&SL_TAB)){ SL.useTab=SL.mode==='game'; SL.prep='done'; if(SL.useTab){ slE('таблица по линейке',SL_TAB); say('Кулак к разъёму','По своей таблице: 5 см — низ экрана, 15 см — верх.'); } slReady(); return 'tab'; }
      SL.prep='wave'; SL.T=Tune.create(100,true); say('Помаши ладонью','К разъёму и от него, 5–15 см — вихрь ходит за ней. Секунд пять.');
      return new Promise(function(r){ SL.onCaught=r; }); }).then(function(v){ if(v==='tab') return 'tab'; SL.prep='waved'; slCalMine(); /* 1.56s: «ровно» и проверка больше не нужны — в «один двумя руками» вихри сами в середине своего хода, резонанс — в такт */ }).then(function(v){ if(v==='tab') return; SL.prep='done'; slReady(); }); })
  .catch(function(e){ say('Не вышло',(e&&e.message)||String(e)); slFail(); }); }
/* ── 1.56g: общая калибровка (автор: один игрок — каждый телефон подгонял середину под свою ладонь, и чтобы выпрямить струну, одну ладонь
   приходилось уводить вверх, другую вниз). Поймав взмахи, телефон шлёт середину своего размаха по дальности эха (мм от телефона) и поле;
   оба берут среднее: ладонь на одном расстоянии от своего телефона — вихри на одной высоте. «Своя у каждого» — как было ── */
var SL_CAL='shared'; try{ SL_CAL=localStorage.getItem('sonar_sl_cal')==='own'?'own':'shared'; }catch(e){}
/* 1.56n (автор: «синхронизация двух ладоней — это когда один человек двумя руками играет.. когда двое играют — это лишнее.. разведи в меню»):
   «Играю один, двумя руками» — общая калибровка: «ровно» низко и высоко + проверка; «Играем вдвоём» — у каждого своя, по взмахам, без них.
   Если на телефонах выбрано разное — «ровно» не ждёт напарника, у которого «вдвоём» */
function slCalLabel(){ el('siCal').textContent=SL_CAL==='own'?'Играем вдвоём (у каждого своя рука)':'Играю один, двумя руками'; }
function slCalMine(){ if(!SL.T||SL.bot) return; var c=DSP2.info().cal; SL.calDone=null; SL.calMe={r:+((100-c.o)/c.k).toFixed(1),f:+SL.T.field.toFixed(1),fm:+(SL.T.field/c.k).toFixed(1)}; slE('калибровка: середина '+SL.calMe.r+' мм, поле '+SL.calMe.f+' ('+SL.calMe.fm+' мм)',{k:c.k,o:c.o});
  slSend({e:'cal',r:SL.calMe.r,f:SL.calMe.f,fm:SL.calMe.fm,mode:SL_CAL}); slCalShare(); }
/* 1.56i (журналы 06.10 18:22, автор: «правую руку приходилось держать выше или ниже левой»): у Ми 9 был включён широкий зонд лабы —
   другой масштаб (k 1,4 против 1,17 у iPhone), и одно «поле» в условных единицах было 71 мм у одного и 85 мм у другого; а середины размахов
   (105 и 119,5 мм) — это где махала рука, а не где у телефонов одна высота. Теперь: зонд в «Струне» у обоих один (с 1.56k — широкий), поле общее в миллиметрах,
   середину ставит шаг «ровно» — обе ладони на одной высоте секунду, эта высота — середина у обоих */
function slCalShare(){ if(SL_CAL!=='shared'||!SL.calMe||!SL.calPeer||!SL.T||SL.calPeer.mode==='own') return; var key=SL.calPeer.r+'/'+SL.calPeer.f+'/'+SL.calMe.f; if(SL.calDone===key) return; SL.calDone=key;
  var c=DSP2.info().cal, pm=SL.calPeer.fm||SL.calPeer.f/1.17, fm=(SL.calMe.fm+pm)/2;
  SL.T.field=fm*c.k; slE('общее поле: '+fm.toFixed(1)+' мм (моё '+SL.calMe.fm+', напарника '+(+pm).toFixed(1)+') → '+SL.T.field.toFixed(1)); }
/* шаг «ровно» — 1.56m: две точки (журналы 06.10 19:24, автор: «калибровка ровной ладони опять кривовато — правую руку для ровной струны
   приходилось держать чуть выше.. и разный был ход у ладоней — приходилось подстраиваться»). Одна ровная точка выравнивает только середину,
   а ход (сколько миллиметров эха на сантиметр ладони) у телефонов разный: ладонь над своим телефоном стоит по-разному, на ровных ладонях эхо
   было 168 мм у iPhone и 128 мм у Ми 9. Теперь обе ладони держат ровно дважды — низко и высоко; каждый телефон ставит свою «низко» на 15%
   высоты экрана, «высоко» — на 85% (середина и ход сразу). Телефоны идут шаг в шаг: «высоко» начинается, когда оба услышали «низко».
   На каждом шаге 3 с прочитать (отсчёт) и 2 с держать с полоской (ладонь в пределах ~1 см; шевельнулась — полоска откатывается);
   25 с не вышло — остаётся калибровка по взмахам, игра идёт */
var SL_LVL_READ=3000, SL_LVL_HOLD=2000, SL_LVL_TOL=12, SL_LVL_DRIFT=14, SL_LVL_GIVEUP=25000, SL_LVL_LO=0.15, SL_LVL_HI=0.85, SL_LVL_MIN=25;
function slLevel(){ SL.prep='level'; SL.lvl={stage:'lo',buf:[],prog:0,t0:0,last:0,txt:'',lo:null,hi:null,sent:{}}; return new Promise(function(r){ SL.onLevel=r; }); }
function slLevelSet(a,b){ var L=SL.lvl, k=a+'|'+b; if(L.txt===k||!SL.prepSay) return; L.txt=k; SL.prepSay(a,b); }
function slLevelDone(why){ SL.prep='leveled'; if(why) slE(why); var f=SL.onLevel; SL.onLevel=null; if(f) f(); }
function slLevelSend(stage,v,skip){ var L=SL.lvl, c=DSP2.info().cal; if(L.sent[stage]) return; L.sent[stage]=1; slSend({e:'lvl',stage:stage,r:v===null?null:+((v-c.o)/c.k).toFixed(1),skip:!!skip}); }
function slLevelStep(now){ var L=SL.lvl, P=SL.peerLvl||{}; if(!SL.calPeer){ slLevelSet('Ждём второй телефон','На нём ещё ловят взмахи.'); return; }
  if(SL.calPeer.mode==='own'){ slLevelDone('ровно: на втором телефоне «вдвоём» — без «ровно»'); return; }
  if(!L.t0){ L.t0=now; L.last=now; slE('ровно: '+(L.stage==='lo'?'низко':'высоко')+' — начало'); }
  var dt=Math.min(100,now-L.last), lo=L.stage==='lo'; L.last=now;
  /* своя точка уже есть — ждём напарника (ладони держать так же) */
  if(L[L.stage]!==null){ if(P[L.stage]){ if(lo){ L.stage='hi'; L.t0=0; L.buf=[]; L.prog=0; return; } return slLevelApply(); }
    slLevelSet('Держи…','Ждём, пока услышит второй телефон.'); if(now-L.t0>SL_LVL_READ+SL_LVL_GIVEUP+8000) slLevelDone('ровно: напарник не ответил — калибровка по взмахам'); return; }
  if(now-L.t0<SL_LVL_READ){ var sec=Math.ceil((SL_LVL_READ-(now-L.t0))/1000);
    if(lo) slLevelSet('Обе ладони — низко','Ровно, на нижней удобной высоте (не ниже 5 см). Начну слушать через '+sec+' с.');
    else slLevelSet('Теперь обе — высоко','Ровно, на верхней удобной высоте. Начну слушать через '+sec+' с.'); return; }
  if(now-L.t0>SL_LVL_READ+SL_LVL_GIVEUP){ slLevelSend(L.stage,null,true); slLevelDone('ровно: '+(lo?'низко':'высоко')+' не вышло за '+(SL_LVL_GIVEUP/1000)+' с — калибровка по взмахам'); return; }
  /* 1.56n (журналы 20:00, автор: «на айфоне вихрь начал уплывать вверх, на ми 9 стоял на месте как и ладонь»): высота вихря — быстрая
     часть (фаза эха) плюс медленное подтягивание к абсолютной (центр эха, медиана), за секунды; у iPhone абсолютная при неподвижной ладони
     прыгала между двумя отражениями (~2 см), и вихрь полз за ней — точка бралась на ходу (низко — на 20 единиц выше, чем пришла бы).
     Теперь: держит — значит абсолютная стоит (медианы первой и второй половины отрезка ближе SL_LVL_DRIFT) и вихрь не скачет;
     точка — где вихрь остановится, если ладонь так и стоит: абсолютная, кроме мёртвой зоны подтягивания (5, а снизу к середине вверх — 15) */
  var ok=SL.present&&SL.dist!==null&&SL.absH!==null&&SL.absH!==undefined, note='', md=function(a){ var q=a.slice().sort(function(x,y){ return x-y; }); return q[q.length>>1]; };
  if(ok){ L.buf.push([now,SL.dist,SL.absH]); while(L.buf.length&&now-L.buf[0][0]>SL_LVL_HOLD) L.buf.shift();
    var t0b=L.buf[0][0], A0=[], A1=[], H=[]; L.buf.forEach(function(b){ if(b[0]-t0b<(now-t0b)/2) A0.push(b[2]); else A1.push(b[2]); H.push(b[1]); });
    var drift=now-t0b>800&&A0.length&&A1.length?Math.abs(md(A1)-md(A0)):0, jump=Math.max.apply(null,H)-Math.min.apply(null,H);
    if(drift>SL_LVL_DRIFT||jump>SL_LVL_TOL*3){ ok=false; note='  вихрь ещё плывёт — держи'; L.buf=L.buf.filter(function(b){ return now-b[0]<300; }); } }
  else L.buf=[];
  var settle=null; if(ok&&L.buf.length>5){ var aM=md(L.buf.map(function(b){ return b[2]; })), x=SL.dist, db=(aM>x&&x<100)?15:5; settle=Math.abs(aM-x)<=db?x:aM-(aM>x?db:-db); }
  if(ok&&!lo&&L.lo!==null&&settle!==null&&settle-L.lo<SL_LVL_MIN){ ok=false; note='  выше — до нижней ещё близко'; }
  L.prog=Math.max(0,Math.min(1,L.prog+(ok?dt:-dt*1.5)/SL_LVL_HOLD));
  var n=Math.round(L.prog*10), bar=new Array(n+1).join('●')+new Array(11-n).join('○');
  slLevelSet(SL.present?'Держи…':'Ладони не видно',bar+(SL.present?(note||(lo?'  обе низко, ровно':'  обе высоко, ровно')):'  поднеси ладонь к разъёму'));
  if(L.prog<1||settle===null||now-L.buf[0][0]<SL_LVL_HOLD*0.9) return;   /* точка — только по полному отрезку, прошедшему проверку */
  var v=settle, c=DSP2.info().cal; L[L.stage]=v;
  slE('ровно: '+(lo?'низко':'высоко')+' — эхо '+((v-c.o)/c.k).toFixed(1)+' мм',{h:+v.toFixed(1),x:+SL.dist.toFixed(1),abs:+md(L.buf.map(function(b){ return b[2]; })).toFixed(1),jump:+jump.toFixed(1),took_ms:Math.round(now-L.t0)}); slLevelSend(L.stage,v); }
/* 1.56n: проверка после «ровно» — обе ладони посередине, струна видна; «Ровно — играть» на обоих — старт; «Заново» на любом — оба ещё раз
   низко и высоко. Автор (20:00): «на айфоне вихрь начал уплывать вверх.. из-за этого в игре опять был рассинхрон» — увидеть сразу, а не в игре */
function slCheck(){ SL.prep='check'; SL.chk=null; el('slChk').classList.remove('hidden');
  if(SL.prepSay) SL.prepSay('Проверка','Обе ладони посередине — струна ровная? Вверх-вниз вместе — вихри идут одинаково?');
  return new Promise(function(r){ SL.onCheck=r; }); }
function slCheckPlay(){ if(SL.prep!=='check') return; el('slChk').classList.add('hidden'); slE('проверка: ровно — играть'); var f=SL.onCheck; SL.onCheck=null; if(f) f(); }
function slRelevel(mine){ if(SL.prep!=='check'&&SL.prep!=='done'&&SL.prep!=='leveled') return; if(SL.T0) return; el('slChk').classList.add('hidden'); slE(mine?'проверка: заново':'напарник: заново');
  if(mine) slSend({e:'relevel'}); SL.ready=false; SL.peerReady=false; SL.peerLvl=null; var keep=SL.onCheck; SL.onCheck=null;
  slLevel().then(slAfterLevel).then(function(){ SL.prep='done'; if(keep) keep(); else slReady(); }); }
function slAfterLevel(){ if(SL.calPeer&&SL.calPeer.mode==='own') return; return slCheck(); }
/* оба услышали обе точки: «низко» → 15% экрана, «высоко» → 85% (экран ниже середины растянут в ASYM раз — как у корабля) */
function slLevelApply(){ var L=SL.lvl, A=Tune.ASYM, a=0.5-SL_LVL_LO, b=SL_LVL_HI-0.5, F=(L.hi-L.lo)*(1+A)/(2*a+2*A*b), FL=2*F/(1+A), d=100-a*FL-L.lo, c=DSP2.info().cal;
  DSP2.shift(d); if(SL.dist!==null&&SL.dist!==undefined) SL.dist+=d; SL.T.field=F;
  slE('ровно: низко → '+Math.round(SL_LVL_LO*100)+'%, высоко → '+Math.round(SL_LVL_HI*100)+'%: поле '+F.toFixed(1)+' ('+(F/c.k).toFixed(1)+' мм), сдвиг '+d.toFixed(1),{lo:+L.lo.toFixed(1),hi:+L.hi.toFixed(1),F:+F.toFixed(1),d:+d.toFixed(1),peer:SL.peerLvl||null});
  slLevelDone(); }
function slFail(){ el('slBtns').classList.remove('hidden'); el('slAgain').classList.add('hidden'); el('slRetry').classList.remove('hidden'); }
function slFrame(r){ if(r){ SL.lead=r.present&&r.lead!==null&&r.lead!==undefined?r.lead:null; SL.floor=r.floor; SL.absH=r.present?r.abs:null; SL.present=r.present; if(r.present) SL.dist=r.height; } }
function slReady(){ SL.ready=true; if(SL.bot){ slStartAt(Date.now()+3200,(Math.random()*4294967296)>>>0); return; }
  el('slSay').textContent=SL.peerReady?'Начинаем':'Готово'; el('slSub').textContent=SL.peerReady?'':'Ждём напарника.'; slSend({e:'ready'}); slMaybeStart(); }
/* старт — только после «hi» напарника: до него его поток мог ещё не слушать, и «start» пропадал (стенд, «палец»: второй готов сразу) */
function slMaybeStart(){ if(SL.bot||SL.side!==0||!SL.ready||!SL.peerReady||!SL.peerHi||SL.T0) return; var T0=slNow()+3500, seed=(Math.random()*4294967296)>>>0; slSend({e:'start',T0:T0,seed:seed,mode:SL.mode}); slStartAt(T0,seed); }
function slStartAt(T0,seed){ if(SL.mode==='ruler'||SL.mode==='calib') return slRulerStart(T0); if(SL.mode==='fly') flStart(seed); SL.T0=T0; SL.seed=seed; SL.objs=slWorld(seed); slE('старт раунда',{T0:T0,seed:seed,in_ms:Math.round(T0-(SL.bot?Date.now():slNow())),objs:SL.objs.length,clots:SL.objs.filter(function(o){ return o.kind==='c'; }).length,off:SL.off===undefined?null:Math.round(SL.off),half:SL.half,peer_half:SL.peerHalf||null,screen:slGeom()}); if(SLL) SLL.rounds.push({T0:T0,seed:seed,objs:slObjsC(SL.objs)}); SL.phase='count'; SL.score=0; SL.got=0; SL.cuts=0; SL.burned=0; SL.combo=1; SL.cut=null; }
/* ── поле: из зерна, одинаковое у обоих. Предмет k: появляется в ts, по u, сверху или снизу, плывёт поперёк ── */
function slRng(s){ return function(){ s=(s+0x6D2B79F5)>>>0; var t=s; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
function slWorld(seed){ var r=slRng(seed), a=[], t=1.2, k=0;
  while(t<SL_ROUND){ var d=Math.min(1,t/70), clot=t>18&&r()<0.12+0.25*d, up=r()<0.5, sp=0.11+0.11*d+0.04*r();
    var o={k:k++,ts:t,u:0.14+0.72*r(),dir:up?-1:1,sp:sp,kind:clot?'c':'p',ph:r()*6.28,sw:0.012+0.02*r(),gone:false};
    /* 06.10 (автор: «как от неё увернуться? если никак — в чём смысл?»): клякса не пролетает поле насквозь — выползает с края до своей
       глубины (0,22–0,5 высоты), висит 3–5 с и уходит обратно; перед выходом 1 с светится край. Держи струну по другую сторону —
       или выровняйте вихри: горящая струна (резонанс) кляксу сжигает */
    if(clot){ o.sp=0.16+0.06*d; o.dep=0.22+0.28*r(); o.hold=3+2*r(); o.ts+=1; o.warn=1; }
    a.push(o);
    t+=Math.max(0.3,0.75-0.4*d+0.4*r()); }   /* на поле разом ~8–14 предметов */
  return a; }
function slPos(o,t){ var dt=t-o.ts, v;
  if(o.kind==='c'){ var tin=(o.dep+0.08)/o.sp, d2=dt<tin?o.dep+0.08-o.sp*dt:dt<tin+o.hold?0.012*Math.sin(dt*3+o.ph):o.sp*(dt-tin-o.hold);   /* d2 — насколько клякса не дошла до своей глубины (при уходе — насколько отошла) */
    var depth=o.dep-d2; v=o.dir>0?depth:1-depth; return {u:o.u+o.sw*Math.sin(o.ph+dt*0.7),v:v,hover:dt>=tin&&dt<tin+o.hold,out:dt>tin+o.hold}; }
  v=o.dir>0?-0.08+o.sp*dt:1.08-o.sp*dt; return {u:o.u+o.sw*Math.sin(o.ph+dt*1.3),v:v}; }
/* ── высоты: доля ладони → v (0 — верх экрана); напарник — с задержкой 120 мс по общим часам, без рывков ── */
function slV(f){ return 1-(SL_M+f*(1-2*SL_M)); }
/* напарник рисуется чуть позади общих часов, чтобы ехал плавно: через сервер — 120 мс, напрямую — половина задержки + 30 мс (не меньше 40) */
function slPartner(){ if(SL.bot) return SL.botH; var b=SL.pb, n=b.length; if(!n) return null; var lag=slDirect()&&SL.rttD?Math.max(40,Math.min(120,SL.rttD/2+30)):120, tt=slNow()-lag, i;
  for(i=n-1;i>0;i--) if(b[i-1][0]<=tt) break; if(i<=0) return b[0][1]<0?null:b[0][1];
  var p=b[i-1], q=b[i]; if(p[1]<0||q[1]<0) return q[1]<0?null:q[1]; var w=Math.max(0,Math.min(1,(tt-p[0])/Math.max(1,q[0]-p[0]))); return p[1]+(q[1]-p[1])*w; }
function slStr(u,vL,vR){ return vL+(vR-vL)*(u-SL_UL)/(SL_UR-SL_UL); }
/* ── события ── */
/* очки считает тот, кто поймал, и присылает их — у обоих счёт одинаковый, в каком бы порядке ни пришли события */
function slGot(k,mine,pts){ var o=SL.objs[k]; if(!o||o.gone){ if(!mine) slE('частица уже взята',{k:k,p:pts}); return; } slE(mine?'взял частицу':'напарник взял частицу',Object.assign(slGeo(k),{p:pts===undefined?Math.round(10*SL.combo):pts})); o.gone=true; SL.got++; if(pts===undefined) pts=Math.round(10*SL.combo); SL.score+=pts; SL.combo=Math.min(5,SL.combo+0.25);
  var p=slPos(o,SL.t); SL.fx.push({u:p.u,v:p.v,t:SL.t,kind:'got'}); if(mine) slSend({e:'got',k:k,p:pts}); }
function slCut(k,mine){ var o=SL.objs[k]; slE(mine?'обрыв (клякса)':'напарник: обрыв',Object.assign(slGeo(k),{already:!!SL.cut})); if(o) o.gone=true; if(SL.cut) return; var p=o?slPos(o,SL.t):{u:0.5,v:0.5}; SL.cut={u:p.u,t:SL.t}; SL.cuts++; SL.combo=1; SL.alignT=0;
  SL.fx.push({u:p.u,v:p.v,t:SL.t,kind:'cut'}); if(mine) slSend({e:'cut',k:k}); }
function slBurn(k,mine,pts){ var o=SL.objs[k]; if(!o||o.gone){ if(!mine) slE('клякса уже ушла',{k:k,p:pts}); return; } slE(mine?'сжёг кляксу':'напарник сжёг кляксу',Object.assign(slGeo(k),{p:pts===undefined?Math.round(25*SL.combo):pts})); o.gone=true; SL.burned=(SL.burned||0)+1; if(pts===undefined) pts=Math.round(25*SL.combo); SL.score+=pts; var p=slPos(o,SL.t); SL.fx.push({u:p.u,v:p.v,t:SL.t,kind:'burn'}); if(mine) slSend({e:'burn',k:k,p:pts}); }
function slStitch(mine){ slE(mine?'сшил':'напарник: сшито',{had_cut:!!SL.cut,vL:r4(SL.vL),vR:r4(SL.vR),align_s:+(SL.alignT||0).toFixed(2)}); if(!SL.cut) return; SL.cut=null; SL.fx.push({u:0.5,v:0.5,t:SL.t,kind:'stitch'}); if(mine) slSend({e:'stitch'}); }
/* ── бот второго вихря (режим «один телефон»): ведёт струну к ближней частице своей половины, уходит от клякс, при обрыве идёт к игроку ── */
function slBot(dt,vMe){ var mine=SL.half==='L'?'R':'L', want=0.5, best=1e9, i, o, p;
  if(SL.cut) want=vMe; else for(i=0;i<SL.objs.length;i++){ o=SL.objs[i]; if(o.gone||o.ts>SL.t) continue; p=slPos(o,SL.t); if(p.v<-0.05||p.v>1.05) continue; if((p.u<0.5)!==(mine==='L')) continue;
    var tt=Math.abs(p.v-0.5)/o.sp; if(o.kind==='p'&&tt<best){ best=tt; var uo=mine==='L'?SL_UL:SL_UR, um=mine==='L'?SL_UR:SL_UL, s=(p.u-uo)/(um-uo); want=Math.max(0.05,Math.min(0.95,(p.v-s*vMe)/(1-s||1))); } }
  /* клякса на половине бота у струны — увести свой конец за неё (на сторону, противоположную её краю) */
  for(i=0;i<SL.objs.length;i++){ o=SL.objs[i]; if(o.gone||o.kind!=='c'||o.ts>SL.t) continue; p=slPos(o,SL.t); if(p.v<-0.05||p.v>1.05) continue;
    var uo2=mine==='L'?SL_UL:SL_UR, um2=mine==='L'?SL_UR:SL_UL, s2=(p.u-uo2)/(um2-uo2), vs=(SL.botV===undefined?0.5:SL.botV)*(1-s2)+vMe*s2;
    if(Math.abs(p.v-vs)<0.18&&s2<0.85){ var tgt=o.dir>0?Math.min(0.97,p.v+0.16):Math.max(0.03,p.v-0.16); want=Math.max(0.03,Math.min(0.97,(tgt-s2*vMe)/(1-s2||1))); break; } }
  if(SL.botV===undefined) SL.botV=0.5; SL.botV+=(want-SL.botV)*(1-Math.pow(0.12,dt)); SL.botH=Math.max(0,Math.min(1,(1-SL.botV-SL_M)/(1-2*SL_M))); }
/* ── шаг ── */
function slLoopStart(){ SL.last=performance.now(); cancelAnimationFrame(SL.raf||0); SL.raf=requestAnimationFrame(slLoop); }
function slLoop(now){ var dt=Math.min(0.05,(now-SL.last)/1000); SL.last=now; slSize();
  /* своя ладонь */
  if(SL_CTL!=='touch'&&SL.T){ if(SL.prep==='wave'){ Tune.step(SL.T,dt,{present:SL.present,height:SL.dist},true,function(d){ DSP2.shift(d); if(SL.dist!==null) SL.dist+=d; });
      if(SL.T.ok&&SL.onCaught){ var f=SL.onCaught; SL.onCaught=null; f(); } }
    if(SL.prep==='level') slLevelStep(now);
    if(SL.present&&SL.dist!==null&&!SL.useTab){ SL.frac=Tune.fracOf(SL.T,SL.dist); } }
  /* по таблице: кулак в см (сглажено ~80 мс — на iPhone эхо кулака дрожит на ~1,5 см) → доля экрана: 5 см — низ, 15 — верх */
  if(SL_CTL!=='touch'&&SL.useTab&&SL.present&&SL.lead!==null){ var cm0=slTabCm(SL.lead); SL.cm=SL.cm===undefined?cm0:SL.cm+(cm0-SL.cm)*(1-Math.exp(-dt/0.08)); SL.frac=Math.max(0,Math.min(1,(SL.cm-SL_TAB_LO)/(SL_TAB_HI-SL_TAB_LO))); }
  /* 1.56s: «один, двумя руками» — свой вихрь в середине своего хода. Записи с линейкой (06.10) показали: высоту руки сонар мерит с точностью
     ±2–3 см, у каждого телефона по-своему, — а движение (куда и как быстро) точно. Поэтому вихрь показывает не высоту, а отклонение руки от её
     среднего за последние ~6 с, в долях её обычного размаха за ~4 с: одинаковое движение обеих рук — одинаковый ход обоих вихрей, на любом телефоне */
  SL.rules=SL_RULES_Q||((SL.mode==='fly'||(SL_CAL==='shared'&&!SL.bot&&SL.mode==='game'&&(!SL.calPeer||SL.calPeer.mode!=='own')))?'sync':'level');
  /* 1.56v (автор, «Ущелье»: «опять рассинхрон высоты рук.. чтобы лететь прямо — одна выше должна быть, другая ниже»): основа — сама высота
     вихря из обработки (SL.dist, без обрезки), а не доля по калибровке взмахов: доля упирается в 0 или 1, если рука ходит вне откалиброванного
     хода, и такая рука отвечает только в одну сторону — середина её «ползёт», и для ровного полёта приходилось держать её выше или ниже */
  if(SL.rules==='sync'&&SL_CTL!=='touch'&&SL.present&&SL.dist!==null&&SL.dist!==undefined&&SL.prep!=='wave'){ var fr=SL.dist/100, kM=1-Math.exp(-dt/6), kA=1-Math.exp(-dt/4); SL.fRaw=fr;
    SL.nM=SL.nM===undefined?fr:SL.nM+(fr-SL.nM)*kM; SL.nA=SL.nA===undefined?0.15:SL.nA+(Math.abs(fr-SL.nM)-SL.nA)*kA;
    SL.frac=Math.max(0,Math.min(1,0.5+0.25*(fr-SL.nM)/Math.max(0.1,SL.nA))); }
  if(SL_CTL==='touch'&&SL.touchY!==null&&SL.touchY!==undefined) SL.frac=Math.max(0,Math.min(1,(1-SL.touchY-SL_M)/(1-2*SL_M)));
  var palm=SL_CTL==='touch'?SL.frac!==undefined:SL.present&&SL.frac!==undefined;
  if(SL.frac!==undefined){ var ty=slV(SL.frac); SL.hy=SL.hy===null?ty:SL.hy+(ty-SL.hy)*(1-Math.pow(0.51,dt*60)); }
  SL.palm=palm;
  /* высота — напарнику, 25 раз в секунду */
  if(!SL.bot&&SL.code&&now-(SL.sent||0)>(slDirect()?15:40)){ SL.sent=now; var hm={h:palm&&SL.frac!==undefined?+SL.frac.toFixed(4):-1,s:Math.round(slNow())}; if(SL.mode==='fly'&&flAuth()&&FL.W&&(SL.phase==='play'||SL.phase==='over')) hm.q=flQ(); if(SLL&&SLL.on) SLL.tx.push([sllT(),hm.s,hm.h,slDirect()?'d':'s']); slSend(hm); }
  if(!SL.bot&&SL.code&&now-(SL.pinged||0)>2000){ SL.pinged=now; slPing(); }
  var vMe=SL.hy===null?0.5:SL.hy;
  if(SL.bot&&SL.mode!=='fly'&&(SL.phase==='play'||SL.phase==='count')) slBot(dt,vMe);
  var hp=slPartner(); if(hp!==null&&hp!==undefined){ var tp=slV(hp); SL.pv=SL.pv===undefined?tp:SL.pv+(tp-SL.pv)*(1-Math.pow(0.4,dt*60)); }
  var vL=SL.half==='L'?vMe:(SL.pv===undefined?0.5:SL.pv), vR=SL.half==='R'?vMe:(SL.pv===undefined?0.5:SL.pv); SL.vL=vL; SL.vR=vR;
  /* время игры по общим часам */
  if(SL.T0){ SL.t=((SL.bot?Date.now():slNow())-SL.T0)/1000;
    if(SL.phase==='count'){ var c=Math.ceil(-SL.t); el('slSay').textContent=c>0?String(c):''; el('slSub').textContent=c>0?(SL.mode==='fly'?'Кулаки у разъёмов. Вместе вверх-вниз — высота, один выше другого — крен и поворот. Стены — щит, арки — ниже, огоньки — очки.':SL.rules==='sync'?'Струной — по частицам. Руки в такт (вместе вверх-вниз) — струна горит: ловит шире и жжёт кляксы.':'Струной — по частицам. От кляксы — держись по другую сторону, или выровняйте вихри и сожгите её.'):''; if(SL.t>=0){ SL.phase='play'; el('slSay').textContent=''; el('slSub').textContent=''; } }
    if(SL.phase==='play'){ if(SL.mode==='fly') flStep(dt); else slStep(dt); if(SL.t>=SL_ROUND) slOver(false); }
    if(SL.phase==='ruler') slRulerStep(); }
  sllGame(now,SL.bot?r4(SL.botH):hp,SL.bot?0:slDirect()&&SL.rttD?Math.round(Math.max(40,Math.min(120,SL.rttD/2+30))):120);
  if(SL.logStop&&now>SL.logStop){ SL.logStop=0; slE('журнал: пауза до следующего раунда'); if(SLL) SLL.on=false; if(SLOG) SLOG.on=false; }
  if(SL.mode==='fly'&&(SL.phase==='count'||SL.phase==='play'||SL.phase==='over')){ flDraw(now/1000); flHud(); } else { slDraw(now/1000); slHud(); } SL.raf=requestAnimationFrame(slLoop); }
/* 1.56s: «в такт» — ходы обоих вихрей за последнюю секунду: похожи по направлению (корреляция > 0,8) и оба ходят (> 0,25 экрана в секунду).
   Пороги — по записям с линейкой 06.10 (те же вихри, пересчитанные так): кулаки вместе вверх-вниз — горит 51% времени, ходит одна — 11–13%,
   обе стоят — 0%; ладонью — плохо (8%: ладонь сонар ведёт хуже) — играть кулаками */
function slSync(dt){ var b=SL.sb=SL.sb||[], n; b.push([SL.vL,SL.vR]); n=Math.max(10,Math.round(1/Math.max(0.008,dt))); while(b.length>n) b.shift();
  /* ходы за ~0,15 с, а не от кадра к кадру: вихрь напарника приходит с задержкой 30–120 мс и рывками сети — покадрово они не совпадают */
  var k=Math.max(2,Math.round(0.15/Math.max(0.008,dt))); if(b.length<k+4) return 0; var sxy=0,sxx=0,syy=0,i,m=0; for(i=k;i<b.length;i++){ var a=b[i][0]-b[i-k][0], c=b[i][1]-b[i-k][1]; sxy+=a*c; sxx+=a*a; syy+=c*c; m++; }
  var va=Math.sqrt(sxx/m)/(k*dt), vb=Math.sqrt(syy/m)/(k*dt); SL.syncC=sxx&&syy?sxy/Math.sqrt(sxx*syy):0;
  return SL.syncC>0.8&&va>0.25&&vb>0.25?1:0; }
var SL_RULES_Q=(function(){ try{ var q=new URLSearchParams(location.search).get('rules'); return q==='sync'||q==='level'?q:null; }catch(e){ return null; } })();
function slStep(dt){ var vL=SL.vL, vR=SL.vR, sync=SL.rules==='sync', res=(sync?slSync(dt)===1:Math.abs(vL-vR)<0.05)&&!SL.cut, i, o, p;
  SL.res+=((res?1:0)-SL.res)*(1-Math.pow(0.02,dt));
  for(i=0;i<SL.objs.length;i++){ o=SL.objs[i]; if(o.gone||o.ts>SL.t) continue; p=slPos(o,SL.t); if(p.v<-0.1||p.v>1.1){ if(SL.t-o.ts>2&&(o.kind!=='c'||p.out)) o.gone=true; continue; }
    var myHalf=SL.bot||((p.u<0.5)===(SL.half==='L')); if(!myHalf) continue;   /* решает тот, на чьей половине предмет */
    var dv=Math.abs(p.v-slStr(p.u,vL,vR));
    if(o.kind==='p'&&!SL.cut){ if(dv<(res?0.11:0.05)) slGot(o.k,true); }
    else if(o.kind==='c'&&!SL.cut&&dv<0.045){ if(res) slBurn(o.k,true); else slCut(o.k,true); } }
  /* сшить: вихри на одной высоте 0,6 с — решает левая половина (или бот) */
  if(SL.cut&&(SL.bot||SL.half==='L')){ SL.alignT=(sync?SL.syncC>0.7&&SL.sb&&SL.sb.length>5:Math.abs(vL-vR)<0.07)?SL.alignT+dt:0; if(SL.alignT>0.6) slStitch(true); } }
function slHud(){ if(SL.phase==='play'||SL.phase==='over') el('slHud').textContent='счёт '+SL.score+' · частиц '+SL.got+' · сожжено '+(SL.burned||0)+' · обрывов '+SL.cuts+(SL.phase==='play'?' · '+Math.max(0,Math.ceil(SL_ROUND-SL.t))+' с':'')+(SL.code?' · код '+SL.code:''); }
function slOver(err){ if(!err&&SL.mode==='calib'){ var cr=slCalibFinish(); SL.logStop=performance.now()+3000; SL.phase='over'; el('slSay').textContent=cr.ok?'Готово':'Не вышло'; el('slSub').textContent=cr.ok?'Таблица сохранена: '+SL_TAB.pts.map(function(p){ return p[1]+' см → '+Math.round(p[0])+' мм'; }).join(', ')+'. Теперь «Струна» — кулаками, без взмахов.':cr.why+'. Ещё раз — кулак ровно над разъёмом, низом кулака по линейке.'; el('slAgain').classList.remove('hidden'); el('slRetry').classList.add('hidden'); el('slBtns').classList.remove('hidden'); el('slStop').classList.add('hidden'); return; }
  if(!err&&SL.mode==='fly'){ var Fo=flAuth()?FL:flShown(); slE('ущелье: финиш',{score:Fo.score,gems:Fo.gems,hits:Fo.hits,shield:Fo.shield,s:Fo.s}); SL.logStop=performance.now()+3000; SL.phase='over'; flOverText(Fo); el('slAgain').classList.remove('hidden'); el('slRetry').classList.add('hidden'); el('slBtns').classList.remove('hidden'); el('slStop').classList.add('hidden'); return; }
  if(!err&&SL.mode==='ruler'){ slE('линейка: конец'); SL.logStop=performance.now()+3000; SL.phase='over'; el('slSay').textContent='Записано'; el('slSub').textContent='«Сохранить журнал партии» — на обоих телефонах, и присылай оба.'; el('slAgain').classList.remove('hidden'); el('slRetry').classList.add('hidden'); el('slBtns').classList.remove('hidden'); el('slStop').classList.add('hidden'); return; }
  slE(err?'остановка: '+el('slSay').textContent:'финиш',{score:SL.score||0,got:SL.got||0,burned:SL.burned||0,cuts:SL.cuts||0,t:SL.t===undefined?null:+SL.t.toFixed(2)}); if(!err) SL.logStop=performance.now()+3000;
  el('slAgain').classList.toggle('hidden',!!err); el('slRetry').classList.add('hidden'); if(!err){ SL.phase='over'; el('slSay').textContent='Финиш'; el('slSub').textContent='счёт '+SL.score+' · частиц '+SL.got+' · сожжено клякс '+(SL.burned||0)+' · обрывов '+SL.cuts; }
  el('slBtns').classList.remove('hidden'); el('slStop').classList.add('hidden'); }
function slExit(){ slReset(); if(booted) setProbe('off'); try{ DSP2.set('holdfloor',0); }catch(e){} mode=null; if(SL_WK!==null&&typeof probeWide!=='undefined'){ probeWide=SL_WK; SL_WK=null; } el('slAlign').classList.add('hidden'); el('slChk').classList.add('hidden'); if(SL_LASTMODE==='ruler') slRulerOpen(); else if(SL_LASTMODE==='fly') flOpen(); else slOpen(); }
/* ── 1.56o: «Линейка» — запись с линейкой на двух телефонах (автор: «мы ходим по кругу.. давай заново и с линейкой.. два телефона, две руки,
   линейка, линк по локалке.. запись движений ладони.. потом будешь анализировать»). Подготовка как в «Струне» (пустая комната, взмахи), без
   «ровно» и без игры; затем оба телефона по общим часам ведут одну и ту же программу: обе ладони на 5, 10, 15, 20, 25 см по линейке и обратно
   (3 с перевести, 4 с держать), обе вместе медленно вверх-вниз, потом левая ходит — правая стоит на 15, потом наоборот. Каждый пишет свой
   журнал (звук, обработка кадр за кадром, шаги программы по общим часам); разбор — lab/tools/eval_ruler.js ── */
var SL_RPROBE='wide', SL_LASTMODE='game', SL_RSCALE=1; try{ var rsq=+new URLSearchParams(location.search).get('rscale'); if(rsq>0&&rsq<=1) SL_RSCALE=rsq; }catch(e){}   /* ?rscale=0.05 — короче для проверок */ try{ if(localStorage.getItem('sonar_rl_probe')==='narrow') SL_RPROBE='narrow'; }catch(e){}
function slRulerLabel(){ el('rlProbe').textContent='Зонд: '+(SL_RPROBE==='wide'?'широкий 16–20,5 кГц':'обычный 18,3–20,5 кГц')+' (на обоих одинаково)'; }
function slRulerOpen(){ slRulerLabel(); el('rlNow').textContent=''; show('rulIntro'); }
function slRulerScript(){ var a=[], cms=[5,10,15,20,25,20,15,10,5], i;
  for(i=0;i<cms.length;i++){ a.push({k:'move',cm:cms[i],dur:3,txt:'Обе ладони — '+cms[i]+' см',sub:'Переведи ладони на '+cms[i]+' см по линейке'}); a.push({k:'hold',cm:cms[i],dur:4,txt:'Держи: '+cms[i]+' см',sub:'Обе ладони неподвижно на '+cms[i]+' см'}); }
  a.push({k:'move',cm:15,dur:3,txt:'Обе — 15 см',sub:'Сейчас обе вместе вверх-вниз'}); a.push({k:'wave',who:'both',dur:12,txt:'Обе вместе: вверх-вниз',sub:'Медленно, 5–25 см, одинаково обеими'});
  a.push({k:'move',cm:15,dur:3,txt:'Обе — 15 см',sub:'Сейчас ходит только левая'}); a.push({k:'wave',who:'L',dur:10,txt:'Левая — вверх-вниз',sub:'Правая неподвижно на 15 см'});
  a.push({k:'move',cm:15,dur:3,txt:'Обе — 15 см',sub:'Сейчас ходит только правая'}); a.push({k:'wave',who:'R',dur:10,txt:'Правая — вверх-вниз',sub:'Левая неподвижно на 15 см'});
  return a; }
function slRulerStart(T0){ var sc=SL.mode==='calib'?slCalibScript():slRulerScript(), t=0; SL.T0=T0; SL.seed=0; SL.objs=[]; SL.cut=null; SL.res=0;
  sc.forEach(function(s,i){ s.i=i; s.t0=T0+t*1000; t+=s.dur*SL_RSCALE; s.t1=T0+t*1000; }); SL.rs=sc; SL.rEnd=t; SL.rI=-1; SL.phase='ruler';
  slE('линейка: старт',{T0:T0,steps:sc.length,dur_s:t,probe:(typeof probeWide!=='undefined'&&probeWide)?'wide':'narrow',half:SL.half,peer_half:SL.peerHalf||null}); if(SLL){ SLL.script=SLL.script||[]; SLL.script.push({T0:T0,steps:sc.map(function(s){ return {i:s.i,k:s.k,cm:s.cm===undefined?null:s.cm,who:s.who||'both',t0:s.t0,t1:s.t1,txt:s.txt}; })}); } }
function slRulerStep(){ var t=SL.t, sc=SL.rs; if(!sc) return;
  if(t<0){ el('slSay').textContent='Через '+Math.ceil(-t); el('slSub').textContent=SL.mode==='calib'?'Линейку — к разъёму. Кулак на 5 см (низ кулака).':'Линейку — к разъёму. Сначала обе ладони на 5 см.'; return; }
  if(t>=SL.rEnd){ slOver(false); return; }
  var i=0; while(i<sc.length-1&&(SL.T0+t*1000)>=sc[i].t1) i++; var s=sc[i];
  if(i!==SL.rI){ SL.rI=i; slE('линейка: '+s.k+(s.cm!==undefined?' '+s.cm+' см':'')+(s.who&&s.who!=='both'?' '+s.who:''),{i:i}); }
  var left=Math.ceil((s.t1-(SL.T0+t*1000))/1000), c=null; try{ c=DSP2.info().cal; }catch(e){}
  el('slSay').textContent=s.txt+' · '+left;
  if(SL.mode==='calib'&&s.k==='hold'&&SL.present&&SL.lead!==null&&(SL.T0+t*1000)>=s.t0+0.35*(s.t1-s.t0)) (s.leads=s.leads||[]).push(SL.lead);
  el('slSub').textContent=s.sub+(SL.mode==='calib'?(SL.present&&SL.lead!==null?' · эхо '+SL.lead.toFixed(0)+' мм':' · кулака не видно'):(SL.present&&SL.dist!==null&&c?' · эхо '+((SL.dist-c.o)/c.k).toFixed(0)+' мм, вихрь '+Math.round(100*(SL.frac||0))+'%':' · ладони не видно')); }
/* ── 1.56q: калибровка «кулак по линейке» (записи с линейкой 06.10 21:18 и 21:39: ладонь даёт несколько отражений на 5–10 см — ладонь, пальцы,
   запястье, предплечье, — и центр эха врёт на 2–6 см по-разному у каждого телефона; кулак и ближнее сильное эхо — до ~1 см, «вверх» и «вниз»
   совпадают. Автор: «25–5 слишком много — махать устанешь.. 5–15 норм»; «калибровка по линейке перед каждой игрой — недружелюбно»).
   Один раз на телефоне: кулак на 5, 10, 15, 10, 5 см (2,5 с перевести, 3 с держать) — таблица «мм эха → см» хранится в телефоне; в «Струне»
   вихрь ставится прямо по высоте кулака: 5 см — низ, 15 см — верх, одинаково на обоих телефонах, без взмахов и «ровно» ── */
var SL_TAB=null, SL_TAB_LO=5, SL_TAB_HI=15, SL_TAB_ON=(function(){ try{ return /[?&]tab=1/.test(location.search); }catch(e){ return false; } })();   /* стенды в node — без location */ try{ if(SL_TAB_ON) var tb=JSON.parse(localStorage.getItem('sonar_sl_tab')||'null'); if(tb&&tb.pts&&tb.pts.length>=2) SL_TAB=tb; }catch(e){}
function slCalibScript(){ var a=[], cms=[5,10,15,10,5], i;
  for(i=0;i<cms.length;i++){ a.push({k:'move',cm:cms[i],dur:2.5,txt:'Кулак — '+cms[i]+' см',sub:'Низ кулака на '+cms[i]+' см по линейке, над разъёмом'}); a.push({k:'hold',cm:cms[i],dur:3,txt:'Держи: '+cms[i]+' см',sub:'Кулак неподвижно'}); }
  return a; }
function slTabCm(mm){ var t=SL_TAB.pts, i; if(mm<=t[0][0]) return t[0][1]+(mm-t[0][0])*(t[1][1]-t[0][1])/(t[1][0]-t[0][0]);
  for(i=1;i<t.length;i++) if(mm<=t[i][0]) return t[i-1][1]+(mm-t[i-1][0])*(t[i][1]-t[i-1][1])/(t[i][0]-t[i-1][0]);
  var n=t.length-1; return t[n][1]+(mm-t[n][0])*(t[n][1]-t[n-1][1])/(t[n][0]-t[n-1][0]); }
function slCalibFinish(){ var md=function(a){ var q=a.slice().sort(function(x,y){ return x-y; }); return q.length?q[q.length>>1]:null; }, by={}, pts=[], ok=true, why='';
  (SL.rs||[]).forEach(function(s){ if(s.k==='hold'&&s.leads&&s.leads.length>10) (by[s.cm]=by[s.cm]||[]).push(md(s.leads)); });
  [5,10,15].forEach(function(cm){ if(!by[cm]){ ok=false; why='на '+cm+' см кулака не было видно'; return; } pts.push([by[cm].reduce(function(a,b){ return a+b; },0)/by[cm].length,cm]); });
  if(ok){ for(var i=1;i<pts.length;i++) if(pts[i][0]<=pts[i-1][0]+5){ ok=false; why='эхо не растёт с высотой ('+pts.map(function(p){ return p[0].toFixed(0); }).join(' → ')+' мм)'; } }
  if(ok&&by[5].length>1&&Math.abs(by[5][0]-by[5][1])>25){ ok=false; why='на 5 см вверх и вниз разошлось на '+Math.abs(by[5][0]-by[5][1]).toFixed(0)+' мм'; }
  slE('калибровка по линейке: '+(ok?'готово':'не вышло — '+why),{by:by,pts:pts});
  if(!ok) return {ok:false,why:why};
  SL_TAB={pts:pts.map(function(p){ return [+p[0].toFixed(1),p[1]]; }),band:(typeof probeWide!=='undefined'&&probeWide)?'wide':'narrow',half:SL.half,when:new Date().toISOString()}; try{ localStorage.setItem('sonar_sl_tab',JSON.stringify(SL_TAB)); }catch(e){}
  return {ok:true}; }
function slTabLabel(){ var b=el('siTab'); if(!b) return; b.classList.toggle('hidden',!SL_TAB_ON); b.textContent=SL_TAB?'Калибровка кулаком: есть ('+SL_TAB.pts.map(function(p){ return p[1]+'→'+Math.round(p[0]); }).join(', ')+' мм) — заново':'Калибровка кулаком по линейке (один раз)'; }
/* ── рисование: своя половина поля (или всё поле — «один телефон») ── */
var SLC={w:0,h:0,dpr:1,bg:null,vx:{}};
/* 1.56i: стык экранов (автор: «когда телефоны ровно друг к другу — нить не совсем совпадает»). Высота экрана у телефонов разная, а v — доля
   высоты своего экрана; сдвиг dy и масштаб sc подгоняются на каждом телефоне («Подогнать стык») и хранятся в нём */
var SL_VIEW={dy:0,sc:1}; try{ var sv=JSON.parse(localStorage.getItem('sonar_sl_seam')||'null'); if(sv&&isFinite(sv.dy)&&isFinite(sv.sc)) SL_VIEW={dy:sv.dy,sc:sv.sc}; }catch(e){}
function slY(v){ return (0.5+SL_VIEW.dy+(v-0.5)*SL_VIEW.sc)*SLC.h; }
function slSeam(){ slReset(); SL.half=slHalfGuess(); SL.phase='seam'; show('strPlay'); el('slBtns').classList.add('hidden'); el('slStop').classList.add('hidden'); el('slAlign').classList.remove('hidden');
  el('slSay').textContent=''; el('slSub').textContent='На обоих телефонах — «Подогнать стык», торец к торцу. Двигай линии на одном, пока они не продолжат линии другого.'; slSize(); slLoopStart(); slSeamHud(); }
function slSeamHud(){ el('slHud').textContent=(SL.half==='L'?'левая':'правая')+' половина · сдвиг '+(SL_VIEW.dy*100).toFixed(1)+'% · масштаб '+(SL_VIEW.sc*100).toFixed(0)+'%'; }
function slSeamMove(ddy,dsc){ SL_VIEW.dy=Math.max(-0.2,Math.min(0.2,SL_VIEW.dy+ddy)); SL_VIEW.sc=Math.max(0.8,Math.min(1.2,SL_VIEW.sc+dsc)); try{ localStorage.setItem('sonar_sl_seam',JSON.stringify(SL_VIEW)); }catch(e){} el('slSub').textContent=''; slSeamHud(); }
function slSize(){ var cv=el('slC'); if(!cv||!cv.getContext) return; var dpr=Math.min(2,window.devicePixelRatio||1), w=cv.clientWidth||844, h=cv.clientHeight||390;
  if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){ cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr); SLC.bg=null; } SLC.w=w; SLC.h=h; SLC.dpr=dpr; }
function slX(u){ var u0=SL.full?0:SL.half==='R'?0.5:0, u1=SL.full?1:SL.half==='R'?1:0.5; return (u-u0)/(u1-u0)*SLC.w; }
function slHex(h,a){ var n=parseInt(h.slice(1),16); return 'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+a+')'; }
function slMix(a,b,t){ var A=parseInt(a.slice(1),16),B=parseInt(b.slice(1),16),s=[16,8,0].map(function(k){ return Math.round(((A>>k)&255)*(1-t)+((B>>k)&255)*t); }); return '#'+s.map(function(v){ return (v<16?'0':'')+v.toString(16); }).join(''); }
var SL_A='#ffb648', SL_B='#4fe3d6', SL_P='#fff2c8';
function slBg(){ var c=document.createElement('canvas'); c.width=Math.round(SLC.w*SLC.dpr); c.height=Math.round(SLC.h*SLC.dpr); var g=c.getContext('2d'), W=c.width, H=c.height, r=slRng(SL.half==='R'?23:11);
  var gr=g.createLinearGradient(0,0,W,H); gr.addColorStop(0,'#120a24'); gr.addColorStop(0.5,'#2a1340'); gr.addColorStop(1,'#0d1a2c'); g.fillStyle=gr; g.fillRect(0,0,W,H);
  for(var i=0;i<26;i++){ var x=r()*W,y=r()*H,R=(40+r()*120)*SLC.dpr, q=g.createRadialGradient(x,y,0,x,y,R); q.addColorStop(0,i%3?'rgba(120,60,200,.16)':'rgba(40,120,160,.14)'); q.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=q; g.fillRect(x-R,y-R,2*R,2*R); }
  SLC.bg=c; }
function slVortexSprite(col,dir){ var key=col+dir+SLC.h; if(SLC.vx[key]) return SLC.vx[key]; var R=SLC.h*0.2*SLC.dpr, S=Math.ceil(R*2.7), c=document.createElement('canvas'); c.width=c.height=S; var g=c.getContext('2d'), x=S/2, y=S/2, r=slRng(dir>0?5:9);
  var q=g.createRadialGradient(x,y,0,x,y,R*1.3); q.addColorStop(0,slHex(col,0.45)); q.addColorStop(1,slHex(col,0)); g.fillStyle=q; g.fillRect(0,0,S,S);
  for(var i=0;i<520;i++){ var arm=i%3, t=Math.pow(r(),0.8), ang=arm*2*Math.PI/3+dir*t*4.6+(r()-0.5)*0.5*t, rad=R*(0.06+t*0.94), px=x+Math.cos(ang)*rad, py=y+Math.sin(ang)*rad*0.9, a2=ang-dir*(0.06+0.1*(1-t));
    g.strokeStyle=slHex(t<0.18?'#ffffff':col,(0.95-t*0.55)*0.8); g.lineWidth=((1-t)*1.9+0.5)*SLC.dpr; g.lineCap='round'; g.beginPath(); g.moveTo(px,py); g.lineTo(x+Math.cos(a2)*rad,y+Math.sin(a2)*rad*0.9); g.stroke(); }
  SLC.vx[key]=c; return c; }
function slGlow(g,x,y,R,col,a){ var q=g.createRadialGradient(x,y,0,x,y,R); q.addColorStop(0,slHex(col,a)); q.addColorStop(1,slHex(col,0)); g.fillStyle=q; g.fillRect(x-R,y-R,2*R,2*R); }
function slDraw(ts){ var cv=el('slC'); if(!cv||!cv.getContext) return; var g=cv.getContext('2d'), W=SLC.w, H=SLC.h, i;
  g.setTransform(SLC.dpr,0,0,SLC.dpr,0,0); if(!SLC.bg) slBg(); g.drawImage(SLC.bg,0,0,W,H);
  var vL=SL.vL===undefined?0.5:SL.vL, vR=SL.vR===undefined?0.5:SL.vR, live=SL.phase==='play'||SL.phase==='count'||SL.phase==='over'||SL.phase==='ruler';
  if(SL.phase==='seam'){ for(i=0;i<=20;i++){ var vv=i/20, yy=slY(vv), big=i%10===0, mid=i%5===0; g.strokeStyle=big?'rgba(255,244,224,.9)':mid?'rgba(255,182,72,.8)':'rgba(79,227,214,.55)'; g.lineWidth=big?3:mid?2:1;
      g.beginPath(); g.moveTo(0,yy); g.lineTo(W,yy); g.stroke(); } }
  /* предметы */
  if(SL.phase==='play'||SL.phase==='over') for(i=0;i<SL.objs.length;i++){ var o=SL.objs[i]; if(o.gone||o.ts>SL.t) continue; var p=slPos(o,SL.t); if(p.v<-0.1||p.v>1.1) continue; var x=slX(p.u), y=slY(p.v);
    if(x<-30||x>W+30) continue;
    if(o.kind==='p'){ slGlow(g,x,y,15,SL_P,0.75); g.strokeStyle=slHex(SL_P,0.8); g.lineWidth=1; g.beginPath(); g.moveTo(x-8,y); g.lineTo(x+8,y); g.moveTo(x,y-8); g.lineTo(x,y+8); g.stroke(); g.fillStyle='#fff'; g.beginPath(); g.arc(x,y,2.6,0,7); g.fill(); }
    else { var pc=slPos(o,SL.t); if(pc.hover) slGlow(g,x,y,34+6*Math.sin(ts*6),'#b48cff',0.25);
      slGlow(g,x,y,26,'#7a4cff',0.3); g.fillStyle='#05030a'; g.strokeStyle=slHex('#7a4cff',0.9); g.lineWidth=1.6; g.beginPath(); var rr=slRng(o.k+7);
      for(var j=0;j<=18;j++){ var a=j/18*6.283+ts*0.6, R=13*(0.75+rr()*0.45)*(j%2?0.8:1.1); if(j) g.lineTo(x+Math.cos(a)*R,y+Math.sin(a)*R); else g.moveTo(x+Math.cos(a)*R,y+Math.sin(a)*R); } g.closePath(); g.fill(); g.stroke(); } }
  /* клякса скоро выйдет: край светится там, где она появится */
  if(SL.phase==='play') for(i=0;i<SL.objs.length;i++){ var oc=SL.objs[i]; if(oc.kind!=='c'||oc.gone||SL.t<oc.ts-oc.warn||SL.t>oc.ts) continue; var xw=slX(oc.u); if(xw<-40||xw>W+40) continue;
    var k2=1-(oc.ts-SL.t)/oc.warn, yw=oc.dir>0?slY(0):slY(1); slGlow(g,xw,yw,40+20*k2,'#7a4cff',0.25+0.35*k2); }
  /* струна */
  if(SL.half&&(live||SL.phase==='prep'||SL.phase==='pair')){ var N2=64, pts=[]; for(i=0;i<=N2;i++){ var tt=i/N2, u=SL_UL+(SL_UR-SL_UL)*tt; pts.push({u:u,v:vL+(vR-vL)*tt,t:tt}); }
    var cutU=SL.cut?SL.cut.u:null, wob=SL.cut?Math.min(1,(SL.t-SL.cut.t)*2):0, glow=1+SL.res*1.5;
    for(var L2=0;L2<3;L2++){ var lw=[14*glow,6*glow,1.8][L2], al=[0.16,0.33,0.95][L2]; g.lineWidth=lw; g.lineCap='round';
      for(i=0;i<N2;i++){ var a1=pts[i], b1=pts[i+1]; if(cutU!==null&&Math.abs((a1.u+b1.u)/2-cutU)<0.05+0.3*wob*Math.abs(a1.t-0.5)) continue;
        var dy=SL.cut?Math.sin(ts*9+a1.t*12)*6*wob*Math.min(1,Math.abs(a1.u-cutU)*4):0, dy2=SL.cut?Math.sin(ts*9+b1.t*12)*6*wob*Math.min(1,Math.abs(b1.u-cutU)*4):0;
        var col=slMix(SL_A,SL_B,a1.t); if(Math.abs(a1.t-0.5)<0.12) col=slMix(col,'#fff4e0',1-Math.abs(a1.t-0.5)/0.12); if(SL.res>0.3&&L2>0) col=slMix(col,'#fff4e0',SL.res*0.6);
        g.strokeStyle=slHex(col,al); g.beginPath(); g.moveTo(slX(a1.u),slY(a1.v)+dy); g.lineTo(slX(b1.u),slY(b1.v)+dy2); g.stroke(); } }
    /* бегущие по струне огоньки — поток из одного вихря в другой */
    if(!SL.cut) for(i=0;i<22;i++){ var f=((ts*0.35+i/22)%1), u3=SL_UL+(SL_UR-SL_UL)*f, v3=vL+(vR-vL)*f; g.fillStyle=slHex(slMix(SL_A,SL_B,f),0.9); g.beginPath(); g.arc(slX(u3),slY(v3)+Math.sin(ts*5+i)*2,1.6,0,7); g.fill(); } }
  /* вихри */
  [['L',SL_UL,vL,SL_A,1],['R',SL_UR,vR,SL_B,-1]].forEach(function(q){ var x=slX(q[1]); if(x<-200||x>W+200) return; var sp=slVortexSprite(q[3],q[4]), S=sp.width/SLC.dpr, y=slY(q[2]);
    var mine=SL.half===q[0], dim=mine?(SL.palm?1:0.45):(SL.bot||SL.pv!==undefined?1:0.35);
    g.save(); g.globalAlpha=dim; g.translate(x,y); g.rotate(q[4]*ts*1.4); g.drawImage(sp,-S/2,-S/2,S,S); g.restore(); g.fillStyle='#fff'; g.beginPath(); g.arc(x,y,4,0,7); g.fill(); });
  /* вспышки */
  SL.fx=SL.fx.filter(function(e){ return SL.t-e.t<0.6; }); SL.fx.forEach(function(e){ var k=(SL.t-e.t)/0.6, x=slX(e.u), y=slY(e.v);
    g.strokeStyle=e.kind==='cut'?slHex('#b48cff',1-k):e.kind==='burn'?slHex('#ffd34d',1-k):slHex(e.kind==='stitch'?'#ffffff':SL_P,1-k); g.lineWidth=2; g.beginPath(); g.arc(x,y,6+k*(e.kind==='stitch'?120:e.kind==='burn'?60:28),0,7); g.stroke(); });
  /* стык: на своём телефоне у внутреннего края — тонкий свет */
  if(!SL.full&&SL.half){ var sx=SL.half==='L'?W:0, q2=g.createLinearGradient(sx,0,SL.half==='L'?W-18:18,0); q2.addColorStop(0,'rgba(255,244,224,.18)'); q2.addColorStop(1,'rgba(255,244,224,0)'); g.fillStyle=q2; g.fillRect(SL.half==='L'?W-18:0,0,18,H); } }
/* ── кнопки и палец ── */
(function(){ var cv=el('slC'); function mv(e){ var r=cv.getBoundingClientRect(), y=(e.touches?e.touches[0].clientY:e.clientY)-r.top; SL.touchY=Math.max(0,Math.min(1,(y/(r.height||1)-0.5-SL_VIEW.dy)/SL_VIEW.sc+0.5)); if(e.cancelable) e.preventDefault(); }
  if(cv.addEventListener){ cv.addEventListener('pointermove',mv); cv.addEventListener('pointerdown',mv); cv.addEventListener('touchmove',mv,{passive:false}); } })();
el('lkString').addEventListener('click',slOpen);
el('lkRuler').addEventListener('click',slRulerOpen);
el('rlNear').addEventListener('click',function(){ slBegin('near','ruler'); });
el('rlNew').addEventListener('click',function(){ slBegin('new','ruler'); });
el('rlJoin').addEventListener('click',function(){ var c=el('rlCode').value; if(!/^\d{4}$/.test(c)){ el('rlNow').textContent='Код — 4 цифры'; return; } el('siCode').value=c; slBegin('join','ruler'); });
el('rlSolo').addEventListener('click',function(){ slBegin('bot','ruler'); });
el('rlProbe').addEventListener('click',function(){ SL_RPROBE=SL_RPROBE==='wide'?'narrow':'wide'; try{ localStorage.setItem('sonar_rl_probe',SL_RPROBE); }catch(e){} slRulerLabel(); });
el('rlBack').addEventListener('click',function(){ show('link'); });
el('siCtl').addEventListener('click',function(){ SL_CTL=SL_CTL==='touch'?'palm':'touch'; try{ localStorage.setItem('sonar_sl_ctl',SL_CTL); }catch(e){} slCtlLabel(); });
el('siNew').addEventListener('click',function(){ slBegin('new'); });
el('siNear').addEventListener('click',function(){ slBegin('near'); });
el('siCal').addEventListener('click',function(){ SL_CAL=SL_CAL==='own'?'shared':'own'; try{ localStorage.setItem('sonar_sl_cal',SL_CAL); }catch(e){} slCalLabel(); });
el('siJoin').addEventListener('click',function(){ if(!/^\d{4}$/.test(el('siCode').value)){ el('siNow').textContent='Код — 4 цифры'; return; } slBegin('join'); });
el('siBot').addEventListener('click',function(){ slBegin('bot'); });
el('siBack').addEventListener('click',function(){ show('link'); });
el('siSeam').addEventListener('click',slSeam);
el('siTab').addEventListener('click',function(){ slBegin('bot','calib'); });
el('saUp').addEventListener('click',function(){ slSeamMove(-0.004,0); }); el('saDn').addEventListener('click',function(){ slSeamMove(0.004,0); });
el('saLess').addEventListener('click',function(){ slSeamMove(0,-0.01); }); el('saMore').addEventListener('click',function(){ slSeamMove(0,0.01); });
el('saOk').addEventListener('click',slExit);
el('scPlay').addEventListener('click',slCheckPlay); el('scRedo').addEventListener('click',function(){ slRelevel(true); });
el('slStop').addEventListener('click',function(){ if(SL.mode==='fly'&&SL.phase==='play'){ slOver(false); return; } if(SL.phase==='ruler'){ slOver(false); return; } if(SL.phase==='play'){ slOver(false); SL.phase='over'; } else slExit(); });
el('slAgain').addEventListener('click',function(){ if(SL.bot){ slBegin('bot',SL.mode); return; } SL.logStop=0; if(SLL) SLL.on=true; if(SLOG&&SL.logging) SLOG.on=true; slE('ещё раунд'); SL.T0=0; SL.ready=false; SL.peerReady=false; el('slBtns').classList.add('hidden'); el('slStop').classList.remove('hidden');
  SL.objs=[]; SL.phase='prep'; SL.ready=true; slSend({e:'ready'}); el('slSay').textContent='Готово'; el('slSub').textContent='Ждём напарника.'; slMaybeStart(); });
el('slOut').addEventListener('click',slExit);
el('slRetry').addEventListener('click',function(){ el('slBtns').classList.add('hidden'); SL.ready=false; slPrep(); });
el('slLogB').addEventListener('click',slSaveLog);
