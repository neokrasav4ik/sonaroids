
/* ── СОНАРЛИНК: «СТРУНА» — прототип игры на двух телефонах (06.10, 1.56c) ──
   Эскиз «А» (sonarlink_3): два телефона торец к торцу, камеры друг к другу — одно поле из двух экранов. У внешнего края каждого
   (у разъёма) свой вихрь, его высоту ведёт ладонь у этого разъёма (как корабль Sonaroids: подстройка Tune, доля высоты). Между вихрями
   струна через стык экранов. Сверху и снизу через поле плывут светлые частицы (задеть струной — собрать) и тёмные сгустки (рвут струну;
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
function slOpen(){ slCtlLabel(); el('siNow').textContent=''; show('strIntro'); }
/* ── сеть ── */
function slNow(){ return Date.now()+(SL.off||0); }
function slPost(path,body){ var t0=Date.now(); return fetch(SL_API+'/v1/pair/'+path,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(body)})
  .then(function(r){ return r.json().then(function(j){ var t1=Date.now(); if(j&&typeof j.t==='number'){ var rtt=t1-t0; if(SL.rtt===undefined||rtt<SL.rtt+5){ SL.rtt=Math.min(SL.rtt===undefined?1e9:SL.rtt,rtt); SL.off=j.t-(t0+t1)/2; } } j.status=r.status; return j; }); }); }
function slSend(m){ if(SL.bot||!SL.code) return; slPost('send',{code:SL.code,key:SL.key,m:m}).catch(function(){}); }
function slListen(){ if(SL.es) try{ SL.es.close(); }catch(e){}
  var es=new EventSource(SL_API+'/v1/pair/sse?code='+SL.code+'&key='+SL.key); SL.es=es;
  es.addEventListener('hello',function(e){ var d=JSON.parse(e.data); SL.link=true; if(d.peer) slPeer(true); slStatus(); });
  es.addEventListener('peer',function(e){ slPeer(JSON.parse(e.data).here); });
  es.addEventListener('m',function(e){ var d=JSON.parse(e.data); slMsg(d.m,d.t); });
  es.onerror=function(){ SL.link=false; slStatus(); }; }
function slPeer(here){ SL.peerHere=here; if(here) slSend({e:'hi',half:SL.half,ready:SL.ready}); slStatus(); }
function slStatus(){ var t=SL.code?'код '+SL.code+(SL.link?'':' · нет связи')+(SL.peerHere?' · напарник здесь':' · ждём напарника'):'';
  if(SL.phase==='pair'){ var ls=SL.lastSay; el('slSay').textContent=SL.peerHere?(ls?ls[0]:'Напарник здесь'):'Код: '+SL.code; el('slSub').textContent=SL.peerHere?(ls?ls[1]:'Готовимся.'):'На втором телефоне: СонарЛинк → Струна → этот код → «Войти».'; }
  el('slHud').textContent=t+(SL.half?' · '+(SL.half==='L'?'левая':'правая')+' половина'+(SL.halfNote?' (телефоны лежат одинаково — взял другую)':''):''); }
function slMsg(m,t){ if(!m) return;
  if(typeof m.h==='number'){ SL.pb.push([m.s,m.h]); if(SL.pb.length>40) SL.pb.shift(); return; }
  if(m.e==='hi'){ SL.peerHalf=m.half; if(m.half===SL.half&&SL.side===1){ SL.half=SL.half==='L'?'R':'L'; SL.halfNote=true; slTones(); } if(m.ready) SL.peerReady=true; slStatus(); slMaybeStart(); return; }
  if(m.e==='ready'){ SL.peerReady=true; slMaybeStart(); return; }
  if(m.e==='start'){ slStartAt(m.T0,m.seed); return; }
  if(m.e==='got'){ slGot(m.k,false); return; }
  if(m.e==='cut'){ slCut(m.k,false); return; }
  if(m.e==='stitch'){ slStitch(false); return; } }
/* ── половина и тоны: разъём слева — левая половина, чётные тоны; справа — правая, нечётные ── */
function slTones(){ setLinkPar(SL.bot?'all':SL.half==='L'?0:1); }   /* один телефон — соседа нет, все тоны */
function slHalfGuess(){ var o=orientSide(); return o==='left'?'L':o==='right'?'R':(SL.side===1?'R':'L'); }
/* ── начало: комната, бот ── */
function slReset(){ if(SL.es) try{ SL.es.close(); }catch(e){} cancelAnimationFrame(SL.raf||0);
  SL={phase:'idle',pb:[],objs:[],score:0,got:0,cuts:0,combo:1,cut:null,alignT:0,res:0,fx:[],ph:0.5,hy:null,present:false,dist:null,T:null,last:0,raf:0,shifts:[]}; }
function slBegin(how){ slReset(); SL.bot=how==='bot'; show('strPlay'); el('slBtns').classList.add('hidden'); el('slStop').classList.remove('hidden'); slSize();
  if(SL.bot){ SL.half=slHalfGuess(); SL.full=true; slTones(); SL.phase='prep'; slPrep(); slLoopStart(); return; }
  SL.phase='pair'; el('slSay').textContent=how==='new'?'Открываю комнату…':'Вхожу…'; el('slSub').textContent='';
  var p=how==='new'?slPost('new',{}):slPost('join',{code:el('siCode').value});
  p.then(function(j){ if(!j.ok){ el('slSay').textContent=j.status===404?'Нет такой комнаты':j.status===409?'Комната занята':'Сервер не ответил'; el('slSub').textContent='Проверь код.'; slOver(true); return; }
      SL.code=j.code; SL.key=j.key; SL.side=j.side; SL.half=slHalfGuess(); slTones(); slListen(); slStatus(); slLoopStart(); slPrep(); })
   .catch(function(e){ el('slSay').textContent='Нет связи с сервером'; el('slSub').textContent=String(e&&e.message||e); slOver(true); }); }
/* ── подготовка сонара: как в Sonaroids (пустая комната → взмахи → «поймал») ── */
function slPrep(){ if(SL_CTL==='touch'){ slReady(); return; }
  var say=function(a,b){ SL.lastSay=[a,b||'']; if(SL.phase==='pair'&&!SL.peerHere&&!SL.bot) return; el('slSay').textContent=a; el('slSub').textContent=b||''; };
  SL.prepSay=say; boot().then(function(){ return pickChannel(); }).then(function(){ return autoLevel(); }).then(function(L){
    if(L.snr<30){ setProbe('off'); say('Зонда почти не слышно',NOPROBE); return null; }
    var cal0=dspBand(DSP2); DSP2.init(fs,linkPar()); DSP2.setCal(cal0); DSP2.set('autocenter',1); mode='str'; SL.sonar=true; SL.prep='empty';
    say('Убери руку','Слушаю пустую комнату. Тоны: '+parName(linkPar())+'.'); return rpWait(DSP2); }).then(function(st){
    if(!st) return; if(st==='noprobe'){ setProbe('off'); mode=null; say('Зонда не слышно',NOPROBE); return; }
    return sleep(500).then(function(){ SL.prep='wave'; SL.T=Tune.create(100,true); say('Помаши ладонью','К разъёму и от него, 5–15 см — вихрь ходит за ней. Секунд пять.');
      return new Promise(function(r){ SL.onCaught=r; }); }).then(function(){ SL.prep='done'; slReady(); }); })
  .catch(function(e){ say('Не вышло',(e&&e.message)||String(e)); }); }
function slFrame(r){ if(r){ SL.present=r.present; if(r.present) SL.dist=r.height; } }
function slReady(){ SL.ready=true; if(SL.bot){ slStartAt(Date.now()+3200,(Math.random()*4294967296)>>>0); return; }
  el('slSay').textContent=SL.peerReady?'Начинаем':'Готово'; el('slSub').textContent=SL.peerReady?'':'Ждём напарника.'; slSend({e:'ready'}); slMaybeStart(); }
function slMaybeStart(){ if(SL.bot||SL.side!==0||!SL.ready||!SL.peerReady||SL.T0) return; var T0=slNow()+3500, seed=(Math.random()*4294967296)>>>0; slSend({e:'start',T0:T0,seed:seed}); slStartAt(T0,seed); }
function slStartAt(T0,seed){ SL.T0=T0; SL.seed=seed; SL.objs=slWorld(seed); SL.phase='count'; SL.score=0; SL.got=0; SL.cuts=0; SL.combo=1; SL.cut=null; }
/* ── поле: из зерна, одинаковое у обоих. Предмет k: появляется в ts, по u, сверху или снизу, плывёт поперёк ── */
function slRng(s){ return function(){ s=(s+0x6D2B79F5)>>>0; var t=s; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
function slWorld(seed){ var r=slRng(seed), a=[], t=1.2, k=0;
  while(t<SL_ROUND){ var d=Math.min(1,t/70), clot=t>18&&r()<0.12+0.25*d, up=r()<0.5, sp=0.11+0.11*d+0.04*r();
    a.push({k:k++,ts:t,u:0.14+0.72*r(),dir:up?-1:1,sp:sp,kind:clot?'c':'p',ph:r()*6.28,sw:0.012+0.02*r(),gone:false});
    t+=Math.max(0.3,0.75-0.4*d+0.4*r()); }   /* на поле разом ~8–14 предметов */
  return a; }
function slPos(o,t){ var dt=t-o.ts, v=o.dir>0?-0.08+o.sp*dt:1.08-o.sp*dt; return {u:o.u+o.sw*Math.sin(o.ph+dt*1.3),v:v}; }
/* ── высоты: доля ладони → v (0 — верх экрана); напарник — с задержкой 120 мс по общим часам, без рывков ── */
function slV(f){ return 1-(SL_M+f*(1-2*SL_M)); }
function slPartner(){ if(SL.bot) return SL.botH; var b=SL.pb, n=b.length; if(!n) return null; var tt=slNow()-120, i;
  for(i=n-1;i>0;i--) if(b[i-1][0]<=tt) break; if(i<=0) return b[0][1]<0?null:b[0][1];
  var p=b[i-1], q=b[i]; if(p[1]<0||q[1]<0) return q[1]<0?null:q[1]; var w=Math.max(0,Math.min(1,(tt-p[0])/Math.max(1,q[0]-p[0]))); return p[1]+(q[1]-p[1])*w; }
function slStr(u,vL,vR){ return vL+(vR-vL)*(u-SL_UL)/(SL_UR-SL_UL); }
/* ── события ── */
function slGot(k,mine){ var o=SL.objs[k]; if(!o||o.gone) return; o.gone=true; SL.got++; SL.score+=Math.round(10*SL.combo); SL.combo=Math.min(5,SL.combo+0.25);
  var p=slPos(o,SL.t); SL.fx.push({u:p.u,v:p.v,t:SL.t,kind:'got'}); if(mine) slSend({e:'got',k:k}); }
function slCut(k,mine){ var o=SL.objs[k]; if(o) o.gone=true; if(SL.cut) return; var p=o?slPos(o,SL.t):{u:0.5,v:0.5}; SL.cut={u:p.u,t:SL.t}; SL.cuts++; SL.combo=1; SL.alignT=0;
  SL.fx.push({u:p.u,v:p.v,t:SL.t,kind:'cut'}); if(mine) slSend({e:'cut',k:k}); }
function slStitch(mine){ if(!SL.cut) return; SL.cut=null; SL.fx.push({u:0.5,v:0.5,t:SL.t,kind:'stitch'}); if(mine) slSend({e:'stitch'}); }
/* ── бот второго вихря (режим «один телефон»): ведёт струну к ближней частице своей половины, уходит от сгустков, при обрыве идёт к игроку ── */
function slBot(dt,vMe){ var mine=SL.half==='L'?'R':'L', want=0.5, best=1e9, i, o, p;
  if(SL.cut) want=vMe; else for(i=0;i<SL.objs.length;i++){ o=SL.objs[i]; if(o.gone||o.ts>SL.t) continue; p=slPos(o,SL.t); if(p.v<-0.05||p.v>1.05) continue; if((p.u<0.5)!==(mine==='L')) continue;
    var tt=Math.abs(p.v-0.5)/o.sp; if(o.kind==='p'&&tt<best){ best=tt; var uo=mine==='L'?SL_UL:SL_UR, um=mine==='L'?SL_UR:SL_UL, s=(p.u-uo)/(um-uo); want=Math.max(0.05,Math.min(0.95,(p.v-s*vMe)/(1-s||1))); } }
  if(SL.botV===undefined) SL.botV=0.5; SL.botV+=(want-SL.botV)*(1-Math.pow(0.12,dt)); SL.botH=Math.max(0,Math.min(1,(1-SL.botV-SL_M)/(1-2*SL_M))); }
/* ── шаг ── */
function slLoopStart(){ SL.last=performance.now(); cancelAnimationFrame(SL.raf||0); SL.raf=requestAnimationFrame(slLoop); }
function slLoop(now){ var dt=Math.min(0.05,(now-SL.last)/1000); SL.last=now; slSize();
  /* своя ладонь */
  if(SL_CTL!=='touch'&&SL.T){ if(SL.prep==='wave'){ Tune.step(SL.T,dt,{present:SL.present,height:SL.dist},true,function(d){ DSP2.shift(d); if(SL.dist!==null) SL.dist+=d; });
      if(SL.T.ok&&SL.onCaught){ var f=SL.onCaught; SL.onCaught=null; f(); } }
    if(SL.present&&SL.dist!==null){ SL.frac=Tune.fracOf(SL.T,SL.dist); } }
  if(SL_CTL==='touch'&&SL.touchY!==null&&SL.touchY!==undefined) SL.frac=Math.max(0,Math.min(1,(1-SL.touchY-SL_M)/(1-2*SL_M)));
  var palm=SL_CTL==='touch'?SL.frac!==undefined:SL.present&&SL.frac!==undefined;
  if(SL.frac!==undefined){ var ty=slV(SL.frac); SL.hy=SL.hy===null?ty:SL.hy+(ty-SL.hy)*(1-Math.pow(0.51,dt*60)); }
  SL.palm=palm;
  /* высота — напарнику, 25 раз в секунду */
  if(!SL.bot&&SL.code&&now-(SL.sent||0)>40){ SL.sent=now; slSend({h:palm&&SL.frac!==undefined?+SL.frac.toFixed(4):-1,s:Math.round(slNow())}); }
  var vMe=SL.hy===null?0.5:SL.hy;
  if(SL.bot&&(SL.phase==='play'||SL.phase==='count')) slBot(dt,vMe);
  var hp=slPartner(); if(hp!==null&&hp!==undefined){ var tp=slV(hp); SL.pv=SL.pv===undefined?tp:SL.pv+(tp-SL.pv)*(1-Math.pow(0.4,dt*60)); }
  var vL=SL.half==='L'?vMe:(SL.pv===undefined?0.5:SL.pv), vR=SL.half==='R'?vMe:(SL.pv===undefined?0.5:SL.pv); SL.vL=vL; SL.vR=vR;
  /* время игры по общим часам */
  if(SL.T0){ SL.t=((SL.bot?Date.now():slNow())-SL.T0)/1000;
    if(SL.phase==='count'){ var c=Math.ceil(-SL.t); el('slSay').textContent=c>0?String(c):''; el('slSub').textContent=c>0?'Вихри — к частицам, мимо сгустков.':''; if(SL.t>=0){ SL.phase='play'; el('slSay').textContent=''; el('slSub').textContent=''; } }
    if(SL.phase==='play'){ slStep(dt); if(SL.t>=SL_ROUND) slOver(false); } }
  slDraw(now/1000); slHud(); SL.raf=requestAnimationFrame(slLoop); }
function slStep(dt){ var vL=SL.vL, vR=SL.vR, res=Math.abs(vL-vR)<0.04&&!SL.cut, i, o, p;
  SL.res+=((res?1:0)-SL.res)*(1-Math.pow(0.02,dt));
  for(i=0;i<SL.objs.length;i++){ o=SL.objs[i]; if(o.gone||o.ts>SL.t) continue; p=slPos(o,SL.t); if(p.v<-0.1||p.v>1.1){ if(SL.t-o.ts>2) o.gone=true; continue; }
    var myHalf=SL.bot||((p.u<0.5)===(SL.half==='L')); if(!myHalf) continue;   /* решает тот, на чьей половине предмет */
    var dv=Math.abs(p.v-slStr(p.u,vL,vR));
    if(o.kind==='p'&&!SL.cut){ if(dv<(res?0.11:0.05)) slGot(o.k,true); }
    else if(o.kind==='c'&&!SL.cut&&dv<0.045) slCut(o.k,true); }
  /* сшить: вихри на одной высоте 0,6 с — решает левая половина (или бот) */
  if(SL.cut&&(SL.bot||SL.half==='L')){ SL.alignT=Math.abs(vL-vR)<0.07?SL.alignT+dt:0; if(SL.alignT>0.6) slStitch(true); } }
function slHud(){ if(SL.phase==='play'||SL.phase==='over') el('slHud').textContent='счёт '+SL.score+' · частиц '+SL.got+' · обрывов '+SL.cuts+(SL.phase==='play'?' · '+Math.max(0,Math.ceil(SL_ROUND-SL.t))+' с':'')+(SL.code?' · код '+SL.code:''); }
function slOver(err){ if(!err){ SL.phase='over'; el('slSay').textContent='Финиш'; el('slSub').textContent='счёт '+SL.score+' · частиц '+SL.got+' · обрывов '+SL.cuts; }
  el('slBtns').classList.remove('hidden'); el('slStop').classList.add('hidden'); }
function slExit(){ slReset(); if(booted) setProbe('off'); mode=null; slOpen(); }
/* ── рисование: своя половина поля (или всё поле — «один телефон») ── */
var SLC={w:0,h:0,dpr:1,bg:null,vx:{}};
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
  var vL=SL.vL===undefined?0.5:SL.vL, vR=SL.vR===undefined?0.5:SL.vR, live=SL.phase==='play'||SL.phase==='count'||SL.phase==='over';
  /* предметы */
  if(SL.phase==='play'||SL.phase==='over') for(i=0;i<SL.objs.length;i++){ var o=SL.objs[i]; if(o.gone||o.ts>SL.t) continue; var p=slPos(o,SL.t); if(p.v<-0.1||p.v>1.1) continue; var x=slX(p.u), y=p.v*H;
    if(x<-30||x>W+30) continue;
    if(o.kind==='p'){ slGlow(g,x,y,15,SL_P,0.75); g.strokeStyle=slHex(SL_P,0.8); g.lineWidth=1; g.beginPath(); g.moveTo(x-8,y); g.lineTo(x+8,y); g.moveTo(x,y-8); g.lineTo(x,y+8); g.stroke(); g.fillStyle='#fff'; g.beginPath(); g.arc(x,y,2.6,0,7); g.fill(); }
    else { slGlow(g,x,y,26,'#7a4cff',0.3); g.fillStyle='#05030a'; g.strokeStyle=slHex('#7a4cff',0.9); g.lineWidth=1.6; g.beginPath(); var rr=slRng(o.k+7);
      for(var j=0;j<=18;j++){ var a=j/18*6.283+ts*0.6, R=13*(0.75+rr()*0.45)*(j%2?0.8:1.1); if(j) g.lineTo(x+Math.cos(a)*R,y+Math.sin(a)*R); else g.moveTo(x+Math.cos(a)*R,y+Math.sin(a)*R); } g.closePath(); g.fill(); g.stroke(); } }
  /* струна */
  if(SL.half&&(live||SL.phase==='prep'||SL.phase==='pair')){ var N2=64, pts=[]; for(i=0;i<=N2;i++){ var tt=i/N2, u=SL_UL+(SL_UR-SL_UL)*tt; pts.push({u:u,v:vL+(vR-vL)*tt,t:tt}); }
    var cutU=SL.cut?SL.cut.u:null, wob=SL.cut?Math.min(1,(SL.t-SL.cut.t)*2):0, glow=1+SL.res*1.5;
    for(var L2=0;L2<3;L2++){ var lw=[14*glow,6*glow,1.8][L2], al=[0.16,0.33,0.95][L2]; g.lineWidth=lw; g.lineCap='round';
      for(i=0;i<N2;i++){ var a1=pts[i], b1=pts[i+1]; if(cutU!==null&&Math.abs((a1.u+b1.u)/2-cutU)<0.05+0.3*wob*Math.abs(a1.t-0.5)) continue;
        var dy=SL.cut?Math.sin(ts*9+a1.t*12)*6*wob*Math.min(1,Math.abs(a1.u-cutU)*4):0, dy2=SL.cut?Math.sin(ts*9+b1.t*12)*6*wob*Math.min(1,Math.abs(b1.u-cutU)*4):0;
        var col=slMix(SL_A,SL_B,a1.t); if(Math.abs(a1.t-0.5)<0.12) col=slMix(col,'#fff4e0',1-Math.abs(a1.t-0.5)/0.12); if(SL.res>0.3&&L2>0) col=slMix(col,'#fff4e0',SL.res*0.6);
        g.strokeStyle=slHex(col,al); g.beginPath(); g.moveTo(slX(a1.u),a1.v*H+dy); g.lineTo(slX(b1.u),b1.v*H+dy2); g.stroke(); } }
    /* бегущие по струне огоньки — поток из одного вихря в другой */
    if(!SL.cut) for(i=0;i<22;i++){ var f=((ts*0.35+i/22)%1), u3=SL_UL+(SL_UR-SL_UL)*f, v3=vL+(vR-vL)*f; g.fillStyle=slHex(slMix(SL_A,SL_B,f),0.9); g.beginPath(); g.arc(slX(u3),v3*H+Math.sin(ts*5+i)*2,1.6,0,7); g.fill(); } }
  /* вихри */
  [['L',SL_UL,vL,SL_A,1],['R',SL_UR,vR,SL_B,-1]].forEach(function(q){ var x=slX(q[1]); if(x<-200||x>W+200) return; var sp=slVortexSprite(q[3],q[4]), S=sp.width/SLC.dpr, y=q[2]*H;
    var mine=SL.half===q[0], dim=mine?(SL.palm?1:0.45):(SL.bot||SL.pv!==undefined?1:0.35);
    g.save(); g.globalAlpha=dim; g.translate(x,y); g.rotate(q[4]*ts*1.4); g.drawImage(sp,-S/2,-S/2,S,S); g.restore(); g.fillStyle='#fff'; g.beginPath(); g.arc(x,y,4,0,7); g.fill(); });
  /* вспышки */
  SL.fx=SL.fx.filter(function(e){ return SL.t-e.t<0.6; }); SL.fx.forEach(function(e){ var k=(SL.t-e.t)/0.6, x=slX(e.u), y=e.v*H;
    g.strokeStyle=e.kind==='cut'?slHex('#b48cff',1-k):slHex(e.kind==='stitch'?'#ffffff':SL_P,1-k); g.lineWidth=2; g.beginPath(); g.arc(x,y,6+k*(e.kind==='stitch'?120:28),0,7); g.stroke(); });
  /* стык: на своём телефоне у внутреннего края — тонкий свет */
  if(!SL.full&&SL.half){ var sx=SL.half==='L'?W:0, q2=g.createLinearGradient(sx,0,SL.half==='L'?W-18:18,0); q2.addColorStop(0,'rgba(255,244,224,.18)'); q2.addColorStop(1,'rgba(255,244,224,0)'); g.fillStyle=q2; g.fillRect(SL.half==='L'?W-18:0,0,18,H); } }
/* ── кнопки и палец ── */
(function(){ var cv=el('slC'); function mv(e){ var r=cv.getBoundingClientRect(), y=(e.touches?e.touches[0].clientY:e.clientY)-r.top; SL.touchY=Math.max(0,Math.min(1,y/(r.height||1))); if(e.cancelable) e.preventDefault(); }
  if(cv.addEventListener){ cv.addEventListener('pointermove',mv); cv.addEventListener('pointerdown',mv); cv.addEventListener('touchmove',mv,{passive:false}); } })();
el('lkString').addEventListener('click',slOpen);
el('siCtl').addEventListener('click',function(){ SL_CTL=SL_CTL==='touch'?'palm':'touch'; try{ localStorage.setItem('sonar_sl_ctl',SL_CTL); }catch(e){} slCtlLabel(); });
el('siNew').addEventListener('click',function(){ slBegin('new'); });
el('siJoin').addEventListener('click',function(){ if(!/^\d{4}$/.test(el('siCode').value)){ el('siNow').textContent='Код — 4 цифры'; return; } slBegin('join'); });
el('siBot').addEventListener('click',function(){ slBegin('bot'); });
el('siBack').addEventListener('click',function(){ show('link'); });
el('slStop').addEventListener('click',function(){ if(SL.phase==='play'){ slOver(false); SL.phase='over'; } else slExit(); });
el('slAgain').addEventListener('click',function(){ if(SL.bot){ slBegin('bot'); return; } SL.T0=0; SL.ready=false; SL.peerReady=false; el('slBtns').classList.add('hidden'); el('slStop').classList.remove('hidden');
  SL.objs=[]; SL.phase='prep'; SL.ready=true; slSend({e:'ready'}); el('slSay').textContent='Готово'; el('slSub').textContent='Ждём напарника.'; slMaybeStart(); });
el('slOut').addEventListener('click',slExit);
