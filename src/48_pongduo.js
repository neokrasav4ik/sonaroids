/* ════ SonaLob «ВДВОЁМ» on the screens (v1.64c; v1.64d: each phone its own half of the probe's tones — src/20_sonar.js setParity; v1.64f: the pause for both; stage 4 of claude/SONALOB_DUO.md). The menu: «ИГРАТЬ ОДНОМУ» / «ИГРАТЬ ВДВОЁМ» (Den
   12.10). Together: «РЯДОМ» (one Wi-Fi, both press within 30 s), «СОЗДАТЬ КОД» (4 digits to tell the partner) or «ВВЕСТИ КОД» — the
   room (src/23_link.js). Then «ВЫ ВМЕСТЕ»: who has which racket (the one who opened the room — the left; «ПОМЕНЯТЬСЯ» swaps them on both)
   and what the partner is doing. Each one calibrates as always (the waving or the auto-calibration), and on the try-out presses «ГОТОВ»;
   when both are ready the side 0 sends the start — the seed, the moment by the server's clock and both players' sensitivity and range —
   and both count down to that same moment. The game: both phones run the whole game on both palms (src/16_pong_net.js) — the steps go by
   the server's clock (the step at a moment is the same on both), the own palm is sent at once (the direct channel every frame, the server
   every ~3 steps), each message carries everything the partner has not confirmed yet, so a lost one costs nothing. The own player is
   drawn in red ink, «ТЫ» over him in the first seconds (М2). The game is over when the partner's palms up to its last step are in (till
   then a guess could still be undone). After it — «ЕЩЁ РАЗ», which starts when both press it ════ */
var PD={on:false,side:-1,left:0,me:0,peer:false,pst:'',pname:'',psens:1,pspan:0,ready:false,sent:'',sentT:0,msg:'',busy:false,code:null,near:false,t0:null,nearT:0,
  cfg:null,N:null,inq:[],mine:{},hisAck:0,myAck:0,got:{},shown:{},sentAt:0,overT:0,from:null,ep:0,eps:{},pz:null,rsT:0,endN:null,heard:0,kaT:0,offT:0,fix:false,mk:[]};
function pdMe(){ return PD.side===PD.left?0:1; }
function pdName(){ return Board.nick()||L('pd_you'); }
function pdMate(){ return PD.pname||L('pd_mate'); }
function pdSpan(){ var lin=PG.c&&PG.c.lin; return lin?Math.max(30,lin.t-lin.b):0; }
/* what this phone is doing, as the partner sees it: menu, cal (getting ready), try (the try-out), ready, play, over */
function pdState(){ if(scr==='pduo2') return 'menu'; if(scr==='pdpause') return 'pause';
  if(scr==='play'||scr==='paused'||scr==='count-resume') return 'play';
  if(scr==='count') return 'ready';
  if(scr==='over') return PD.ready?'ready':'over';
  if(scr==='phold'&&PG.done&&!PongCtl.waving(PG.c||{})&&scrT-PG.doneT>=CAUGHT_SHOW) return PD.ready?'ready':'try';
  return 'cal'; }
/* a view of the field together: the own racket where the palm is, the partner's at rest */
function pdPys(v){ var r=Pong.TUNE.PAD_LO-0.5*v.H; v.pys=[r,r]; v.pys[pdMe()]=v.py; }
function pdSend(m){ if(PD.on) Link.send(m); }
/* tell the partner the state when it changes, and every 3 s anyway (a message may be lost) */
function pdTick(){ if(!PD.on) return; var st=pdState(); if(st!=='ready'&&st!=='play'&&scr!=='over') PD.ready=false;
  if(PD.peer&&(st!==PD.sent||clock-PD.sentT>3)){ PD.sent=st; PD.sentT=clock; pdSend({e:'st',st:st,nick:Board.nick()||'',sens:pgSens(),span:pdSpan()}); }
  pdCheckGo();
  if(PD.N&&PD.N.g.state!=='over'&&g===PD.N.g){
    /* in the pause (and while one calibrates in it) — «I am here» twice a second (in the game the palms say it) */
    if((PD.pz||scr==='count-resume')&&clock-PD.kaT>0.5){ PD.kaT=clock; pdSend({e:'ka',g:PD.cfg.seed}); }
    /* the partner's game is over (he ended it, or gave up waiting) — this one ends too */
    if((PD.pst==='over'||PD.pst==='menu'||(PD.pst==='gone'&&PD.heard<0))&&(scr==='play'||scr==='pdpause'||scr==='count-resume')){ if((PD.offT+=DT)>1){ Logs.gameEv('вдвоём: у напарника партия кончена',PD.pst); pdEnd(); } } else PD.offT=0; } }
/* ── the room ── */
function pdOpen(how,code){ if(PD.busy) return; PD.busy=true; PD.msg=''; Link.on(pdGot);
  var p=how==='near'?Link.near():how==='new'?Link.create():Link.join(code);
  p.then(function(j){ PD.busy=false; if(!j||!j.ok){ PD.msg=L(j&&j.error==='code'?'pd_bad':j&&j.error==='full'?'pd_full':'pd_off'); if(scr!=='pduoin') go('pduo'); return; }
    PD.on=true; PD.side=j.side; PD.left=0; PD.code=j.code; PD.near=!!j.near; PD.peer=false; PD.pst=''; PD.pname=''; PD.ready=false; PD.sent=''; PD.nearT=clock;
    if(Sonar.setParity(j.side)) acoustic=false;   /* v1.64d: the probe's own half of the tones (the side 0 — the even ones); the room and the calibration anew */
    Logs.ev('вдвоём: комната',{code:j.code,side:j.side,near:PD.near,tones:j.side?'odd':'even'}); if(nickEl) nickField(false); go('pduowait'); }); }
function pdLeave(){ if(!PD.on) return; Logs.ev('вдвоём: выход'); try{ Link.send({e:'bye'}); }catch(e){} var l=Link; setTimeout(function(){ if(!PD.on) l.close(); },300);
  PD.on=false; PD.peer=false; PD.ready=false; PD.N=null; PD.cfg=null; PD.inq=[]; if(Sonar.setParity('all')) acoustic=false; }   // all the tones again
/* the partner's messages (from the direct channel or the server) */
function pdGot(m){ if(!PD.on||!m) return; if(m.e==='bye') PD.heard=-99; else if(m.e!=='gone'&&m.e!=='peer') PD.heard=clock;
  if(m.e==='peer'){ PD.peer=true; PD.sent=''; if(scr==='pduowait') go('pduo2'); return; }
  if(m.e==='gone'||m.e==='bye'){ PD.peer=m.e==='gone'?false:PD.peer; PD.pst='gone'; if(m.e==='bye') PD.peer=false; return; }
  if(m.e==='hi'){ PD.peer=true; PD.sent=''; if(scr==='pduowait') go('pduo2'); return; }
  if(m.e==='st'){ PD.peer=true; PD.pst=m.st; PD.pname=String(m.nick||'').slice(0,16); PD.psens=m.sens; PD.pspan=m.span; if(scr==='pduowait') go('pduo2');
    if(scr==='count'&&m.st!=='ready'&&m.st!=='play'&&PD.cfg&&!PD.N){ Logs.ev('вдвоём: напарник не готов — без старта'); PD.cfg=null; go(PD.from||'pduo2'); } return; }
  if(m.e==='swap'){ if(PD.side===0){ PD.left=1-PD.left; pdSend({e:'sides',left:PD.left}); } return; }
  if(m.e==='sides'){ PD.left=m.left?1:0; return; }
  if(m.e==='go'){ if(!PD.ready){ PD.sent=''; return; } pdCount(m); return; }
  if(m.e==='h'){ PD.inq.push(m); return; }
  if(!PD.N||m.g!==PD.cfg.seed) return;
  if(m.e==='pz'){ if(m.ep===PD.ep) pdPauseAt(m.n,'mate'); return; }
  if(m.e==='rs'){ pdResume(m); return; }
  if(m.e==='sens'){ if(m.ep===PD.ep&&PD.pz){ var o1=PD.N.g; PongNet.mark(PD.N,m.n,['sens',m.i,m.v]); pdAdopt(o1); PD.mk.push([m.n,'sens',m.i,m.v]); } return; }
  if(m.e==='end'){ if(m.ep===PD.ep) pdEndAt(m.n); return; } }
/* ── the start: the side 0 sends it once both are ready ── */
function pdCheckGo(){ if(PD.side!==0||!PD.peer||!PD.ready||PD.pst!=='ready'||scr==='count'||scr==='play') return;
  var me=pdMe(), s=[0,0], sp=[0,0]; s[me]=pgSens(); s[1-me]=PD.psens>=0&&PD.psens<=3?PD.psens:1; sp[me]=pdSpan(); sp[1-me]=PD.pspan>0?PD.pspan:0;
  var m={e:'go',seed:newSeed(),t0:Math.round(Link.now()+3700),left:PD.left,sens:s,span:sp}; pdSend(m); pdCount(m); }
function pdCount(m){ PD.left=m.left?1:0; PD.cfg={seed:m.seed>>>0,t0:m.t0,sens:m.sens,span:m.span}; PD.inq=PD.inq.filter(function(q){ return q.g===PD.cfg.seed; }); PD.N=null; PD.from=scr;
  pgKeep(); try{ DSP2.set('quarter',1); }catch(e){} countT=Math.max(0,(m.t0-Link.now())/1000); go('count'); }
/* ── the game ── */
function pdStart(){ var c=PD.cfg; g=Pong.create2(c.seed,PG_AR,c.sens,c.span); PD.me=pdMe(); PD.N=PongNet.create(g,PD.me); PD.mine={}; PD.his=[]; PD.mineAll=[]; PD.offT=0; PD.ep=0; PD.eps={}; PD.pz=null; PD.endN=null; PD.mk=[]; PD.heard=clock; PD.fix=false; PD.hisAck=0; PD.myAck=0; PD.got={}; PD.shown={}; PD.sentAt=0; PD.overT=0;
  acc=0; parts=[]; PG.pts=[]; PG.newBest=false; PG.rec=null; PG.clips=null; PG.fps=null; var I=Sonar.info(), cc=PG.c||{};
  Logs.gameStart({core:Pong.TAG2,game:'pong',duo:{code:PD.code,near:PD.near,side:PD.side,me:PD.me,mate:PD.pname||null},auto_cal:!!PG.auto,seed:c.seed,ar:PG_AR,sens:c.sens,span:c.span,t0:c.t0,cal:DSP2.info().cal,tones:Sonar.info().par,lin:cc.lin?{b:+cc.lin.b.toFixed(1),t:+cc.lin.t.toFixed(1)}:null,
    chan:I.chan,hand:handSide(),probe_gain:I.probe_gain,probe_snr:I.probe_snr,f_lo:I.f_lo,W:LW,H:LH,sfx:Sfx.state(),link:Link.state(),started:new Date().toISOString(),app:'sonaroids'});
  Sfx.lob('start'); go('play'); }
/* the partner's palms that came: into the game (it runs again from the first that differs from the guess) */
function pdTake(){ var N=PD.N; if(!N||!PD.inq.length) return; var Q=PD.inq; PD.inq=[];
  Q.forEach(function(m){ if(m.g!==PD.cfg.seed) return; var ep=m.ep||0, lim=Infinity;
    /* v1.64f: the pauses — a message from before a pause counts only up to the step the game stopped at; one from a resumed game this phone
       has not resumed yet waits; in the pause nothing after the pause's step */
    if(ep>PD.ep){ PD.inq.push(m); return; } if(ep<PD.ep) lim=PD.eps[ep]; else if(PD.pz) lim=PD.pz.n;
    if(typeof m.a==='number') PD.hisAck=Math.max(PD.hisAck,Math.min(m.a,lim));
    var list=[]; (m.v||[]).forEach(function(v,j){ var k=m.k+j; if(k<1||k>lim) return; PD.got[k]=1; PD.his[k-1]=v===undefined?null:v; list.push([k,v===null||v===undefined?null:v/10000]); });
    while(PD.got[PD.myAck+1]){ delete PD.got[PD.myAck-200]; PD.myAck++; }
    if(!list.length) return; var old=N.g, out=PongNet.remote(N,list);
    pdAdopt(old);
    (out||[]).forEach(function(s){ pdReact(s.n,s.events,s.fx); }); }); }
/* the game run again from a copy is a new object: it takes over what the screen keeps on the old one (the drawing's state, '_' keys) and
   stays «the same game» for the drawing — v1.64j (Den 22:46, Mi 9 together: «человечек дёргается как застрявший в стене и не успевает к
   месту отбития»): every rerun (tens a second together) looked to the drawing like another game, and it put the little players back to
   their start each time */
function pdAdopt(old){ var N=PD.N; if(N.g!==old){ for(var k in old) if(k.charAt(0)==='_') N.g[k]=old[k]; if(PGK.src===old) PGK.src=N.g; } g=N.g; }
/* a step's events → the sounds and the drawing, each once (a step run again shows only what it did not show before) */
function pdReact(n,events,fx){ var was=PD.shown[n]||{e:[],f:[]}, fk=function(f){ return Object.keys(f).join(','); };
  var ev=events.filter(function(e){ return was.e.indexOf(e)<0; }), fxs=(fx||[]).filter(function(f){ return was.f.indexOf(fk(f))<0; });
  PD.shown[n]={e:was.e.concat(ev),f:was.f.concat(fxs.map(fk))}; delete PD.shown[n-400]; if(!ev.length&&!fxs.length) return;
  var q={events:ev,fx:fxs,n:n,t:n*Pong.DT,series:g.series,crk:g.crk,_sk:g._sk,_dullN:g._dullN}; pgSkFx(q); pgSound(q); g._dullN=q._dullN; g._sk=q._sk; }
/* this phone's palms the partner has not confirmed yet: at once on the direct channel, every ~3 steps through the server */
function pdFlush(force){ var N=PD.N; if(!N) return; var k0=PD.hisAck+1, k1=Math.min(N.g.n,k0+39), now=performance.now(); if(k1<k0) return;
  if(!force&&!Link.direct()&&now-PD.sentAt<45) return;   // the server: ~20 messages a second (it takes up to 60)
  var v=[]; for(var k=k0;k<=k1;k++) v.push(PD.mine[k]===undefined?null:PD.mine[k]); PD.sentAt=now;
  Link.send({e:'h',g:PD.cfg.seed,ep:PD.ep,k:k0,v:v,a:PD.myAck}); for(var d in PD.mine) if(+d<k0-60) delete PD.mine[d]; }
function pdPlay(){ var N=PD.N, DTs=Pong.DT, vs=lastNow;
  var fp=PG.fps||(PG.fps={t:vs,n:0,mx:0,slow:0,last:null,rb:0}); if(fp.last!==null&&vs-fp.last<1000){ var fd=vs-fp.last; fp.n++; if(fd>fp.mx) fp.mx=fd; if(fd>25) fp.slow++; } fp.last=vs;
  if(vs-fp.t>=5000){ var ls=Link.state()||{}; Logs.gameEv('кадры',{n:fp.n,s:+((vs-fp.t)/1000).toFixed(2),max:Math.round(fp.mx),slow:fp.slow,rollbacks:N.rb-fp.rb,rb_max:N.rbMax,lag:N.g.n-PD.myAck,direct:!!ls.direct,rtt_d:ls.rttD?Math.round(ls.rttD):null,rtt_s:ls.rttS?Math.round(ls.rttS):null}); fp.t=vs; fp.n=0; fp.mx=0; fp.slow=0; fp.rb=N.rb; }
  pdTake();
  /* the steps: as many as the server's clock says (one a frame; two or none only when a whole step ahead or behind — as frameSteps) */
  var want=(Link.now()-PD.cfg.t0)/1000, e=want-(N.g.n+1)*DTs, n=1; if(e>0.75*DTs) n=1+Math.min(14,Math.round(e/DTs)); else if(e<-0.75*DTs) n=0;
  for(var i=0;i<n&&N.g.state!=='over';i++){ var c=PG.c, f=c?PongCtl.frac(c,c.present?PongCtl.palmAt(c,vs-(n-1-i)*1000*DTs):null):null; f=f===null?null:Math.round(f*10000)/10000;
    PongNet.stepLocal(N,f); g=N.g; PD.mine[g.n]=f===null?null:Math.round(f*10000); PD.mineAll[g.n-1]=PD.mine[g.n];
    Logs.step({pong:2,n:g.n,FH:1,ship:{y:g.pys[PD.me]},lives:g.lives,score:g.score,events:g.events},f); pdReact(g.n,g.events,g.fx); }
  if(N.lost){ Logs.gameEv('вдвоём: рассинхрон — партия кончена'); N.g.state='over'; }
  pdFlush(false);
  pgField(g,DT); pgHud(); coveredLine(topY()+40); pgPauseBtn(); say(L('menu_a'));
  /* v1.64f: nothing from the partner for 2 s (or he left the room) — the pause for both, and the waiting */
  if(g.state!=='over'&&clock-PD.heard>2){ Logs.gameEv('вдвоём: напарник пропал',{silent:+(clock-PD.heard).toFixed(1),peer:PD.peer}); pdPause('lost'); return; }
  if(g.state==='over'){ PD.overT+=DT; if(PD.myAck>=g.n||PD.overT>5||N.lost) pdEnd(); } }
function pdEnd(){ g.state='over'; overT=0; PD.ready=false; Logs.gameEv('вдвоём: итог',{score:g.score,n:g.n,confirmed:PD.myAck,rollbacks:PD.N.rb,rb_max:PD.N.rbMax});
  /* both palms (×10000, null — none), the left racket's first: the whole game can be replayed from the log (Pong.replay2) */
  var L0=PD.me===0?PD.mineAll:PD.his, R0=PD.me===0?PD.his:PD.mineAll, nn=g.n, cut=function(a){ var o=[]; for(var i=0;i<nn;i++) o.push(a[i]===undefined?null:a[i]); return o; };
  Logs.gameEv('вдвоём: ладони',{seed:PD.cfg.seed,sens:PD.cfg.sens,span:PD.cfg.span,n:nn,marks:PD.mk,left:cut(L0),right:cut(R0)}); Logs.gameStop(); pdFlush(true);
  var dq=function(a){ return cut(a).map(function(v){ return v===null?null:v/10000; }); }; pdClipsMake(dq(L0),dq(R0));
  /* v1.64h: the pair's records — each phone sends the game with its own key (the server replays it from both palms) */
  Board.duo({core:Pong.TAG2,seed:PD.cfg.seed,ar:PG_AR,sens:PD.cfg.sens,span:PD.cfg.span,me:PD.me,marks:PD.mk.slice().sort(function(a,b){ return a[0]-b[0]; }),mate:PD.pname||null,left:cut(L0),right:cut(R0),score:g.score}); Board.flush();
  go('over'); }
/* v1.64g: the best arcs together — as the single game's (v1.62c): each racket's best clean pass, found and shown from the game stepped
   again from its seed with both palms and the marks (the same game — it is what the server will replay); each window signed with the
   name of the one whose racket it is */
function pdClipsMake(hL,hR){ PG.clips=null; var c=PD.cfg, M=PD.mk.slice().sort(function(a,b){ return a[0]-b[0]; });
  var run=function(each){ var g2=Pong.create2(c.seed,PG_AR,c.sens,c.span), m=0; for(var i=0;i<hL.length&&g2.state!=='over';i++){
      while(m<M.length&&M[m][0]<=g2.n){ if(M[m][1]==='resume') Pong.resume2(g2); else if(M[m][1]==='sens'&&Pong.TUNE.SENS[M[m][3]]) g2.Hs[M[m][2]]=Pong.TUNE.SENS[M[m][3]]; m++; }
      Pong.step2(g2,hL[i],hR[i]); each(g2); } return g2; };
  var best=[null,null], cur=null;
  run(function(q){ (q.fx||[]).forEach(function(x){ if(x.kick!==undefined) cur={who:x.kick,n0:q.n};
    if(x.pts&&cur){ var b=best[cur.who]; if(!b||x.pts>b.pts) best[cur.who]={who:cur.who,n0:cur.n0,n1:q.n,pts:x.pts,f:x.f}; cur=null; } }); });
  var clips=best.filter(function(b){ return b; }).map(function(b){ return {who:b.who,pts:b.pts,h:Math.round(b.f*100),a:Math.max(1,b.n0-PG_PRE),z:b.n1+PG_POST,fr:[]}; }); if(!clips.length) return;
  var g2=run(function(q){ clips.forEach(function(cl){ if(q.n>=cl.a&&q.n<=cl.z) cl.fr.push(pgSnap(q)); }); });
  clips=clips.filter(function(cl){ return cl.fr.length>PG_PRE; }); clips.forEach(function(cl){ cl.v={}; cl.t0=null; cl.at=-1; });
  PG.clips=clips.length?clips:null; PG.clipCheck=g2.score; }
/* ── v1.64f: the pause for both. Whoever pauses stops at his step P and tells the other, who stops there too: a phone that ran ahead goes
   back to P (the game is cut there — src/16_pong_net.js cut), one behind runs up to it. Two pauses at once — the earlier step wins. In the
   pause the palms up to P still go both ways, so the two games are the same at P. «ДАЛЬШЕ» (either phone, the partner in the pause too):
   a moment 3 s ahead by the server's clock; the game goes on from P at that moment on both (a mark — the rules' resume, as after a single
   game's pause); the sensitivity turned in the pause — a mark at P for that racket on both. «ЗАКОНЧИТЬ ПАРТИЮ» — over at P for both.
   Nothing heard from the partner for 2 s (a lost link, a phone put away) — the pause with «НАПАРНИК ПРОПАЛ — ЖДЁМ…»: back within 30 s —
   the pause as any; not — the game ends with what it has. A message from before a pause counts only up to its step (the pause's epoch) ── */
function pdCut(P){ var N=PD.N, old=N.g; if(!PongNet.cut(N,P)){ Logs.gameEv('вдвоём: пауза дальше, чем помнит игра',{P:P,n:old.n}); return false; }
  pdAdopt(old);
  var del=function(o){ for(var d in o) if(+d>P) delete o[d]; }; del(PD.mine); del(PD.got); del(PD.shown); if(PD.mineAll.length>P) PD.mineAll.length=P; if(PD.his.length>P) PD.his.length=P;
  PD.myAck=Math.min(PD.myAck,P); PD.hisAck=Math.min(PD.hisAck,P); return true; }
function pdPauseAt(P,by){ var N=PD.N; if(!N||N.g.state==='over') return;
  if(PD.pz){ if(P<PD.pz.n){ PD.pz.n=P; pdCut(P); } if(by==='mate'&&PD.pz.by==='lost') PD.pz.by='mate'; return; }
  PD.pz={n:P,by:by,t:clock}; if(by==='lost') PD.pz.lt=clock; PD.endN=null; pdCut(P);
  Logs.gameEv('вдвоём: пауза',{P:P,n:N.g.n,by:by,ep:PD.ep}); if(scr==='play'||scr==='count-resume'||scr==='paused') go('pdpause'); }
function pdPause(why){ var N=PD.N; if(!N) return; var P=N.g.n; pdPauseAt(P,why); pdSend({e:'pz',g:PD.cfg.seed,ep:PD.ep,n:PD.pz?PD.pz.n:P}); }
/* «ДАЛЬШЕ»: from either phone; the first one heard for this pause starts the count, a later one (both pressed) only moves the moment on */
function pdResume(m){ var N=PD.N; if(!N) return;
  if(m.ep===PD.ep-1){ if(m.t>PD.rsT){ PD.rsT=m.t; PD.cfg.t0=m.t-PD.eps[m.ep]*1000*Pong.DT; } return; }
  if(m.ep!==PD.ep||!PD.pz) return; var P=Math.min(PD.pz.n,m.n); if(N.g.n>P||PD.pz.n>P){ PD.pz.n=P; pdCut(P); }
  var o2=N.g; PongNet.mark(N,P,['resume']); pdAdopt(o2); PD.mk.push([P,'resume']); PD.eps[PD.ep]=P; PD.ep++; PD.rsT=m.t; PD.cfg.t0=m.t-P*1000*Pong.DT; PD.pz=null; PD.heard=clock;
  Logs.gameEv('вдвоём: дальше',{P:P,ep:PD.ep,in_ms:Math.round(m.t-Link.now())}); countT=Math.max(0,(m.t-Link.now())/1000); go('count-resume'); }
function pdEndAt(P){ var N=PD.N; if(!N||N.g.state==='over') return; if(!PD.pz) pdPauseAt(P,'mate'); else if(P<PD.pz.n){ PD.pz.n=P; pdCut(P); } PD.endN=PD.pz.n; Logs.gameEv('вдвоём: закончить',PD.endN); }
/* the pause's screen: the field as it stopped; who paused, or how long the partner is still waited for; «ДАЛЬШЕ» once both are in the
   pause, the sensitivity, «ЗАКОНЧИТЬ ПАРТИЮ» */
function sPDPause(){ var N=PD.N; if(!N||!PD.pz){ go('title'); return; } var Pn=PD.pz.n;
  pdTake(); while(N.g.n<Pn&&N.g.state!=='over'){ var c=PG.c, f=c?PongCtl.frac(c,c.present?PongCtl.palm(c):null):null; f=f===null?null:Math.round(f*10000)/10000; PongNet.stepLocal(N,f); g=N.g; PD.mine[g.n]=f===null?null:Math.round(f*10000); PD.mineAll[g.n-1]=PD.mine[g.n]; pdReact(g.n,g.events,g.fx); }
  pdFlush(false);
  var here=clock-PD.heard<=2; if(!here&&PD.pz.by!=='lost'&&clock-PD.pz.t>2){ PD.pz.by='lost'; PD.pz.lt=clock; }
  if(PD.pz.by==='lost'&&here) PD.pz.by='mate';
  if(PD.pz.by==='lost'&&PD.pz.lt===undefined) PD.pz.lt=clock;
  var left=PD.pz.by==='lost'?Math.max(0,Math.ceil(30-(clock-PD.pz.lt))):null;
  if(left===0||(PD.endN!==null&&N.g.n>=PD.endN&&(PD.myAck>=PD.endN||clock-PD.pz.t>5))){ Logs.gameEv(left===0?'вдвоём: не дождались':'вдвоём: закончили',{P:Pn}); pdEnd(); return; }
  pgField(g,0); lx.globalAlpha=0.5; R(P.bg,0,0,LW,LH); lx.globalAlpha=1;
  var t1=PD.pz.by==='lost'?L('pd_lost').replace('{s}',left):PD.pz.by==='mate'?L('pd_pz_by').replace('{n}',pdMate()):L('paused'), t2=L('pd_mate_st').replace('{s}',pdMateSt());
  var y=titles(t1,t2,PD.pz.by==='lost'?P.hit:null);
  var can=here&&PD.pst==='pause'&&N.g.n>=Pn&&PD.endN===null, items=[['pd_resume',can?L('resume'):L('pd_wait')+'.'.repeat(1+Math.floor(clock*2)%3),can?'primary':''],['pg_sens',pgSensLabel()],['pd_end',L('pd_end')]];
  column(items,Math.round(LH*0.58)); }
/* ── the screens ── */
function pdVeil(a){ pgDemoDraw(); lx.globalAlpha=a; R(P.bg,0,0,LW,LH); lx.globalAlpha=1; }
function pdCol(items,y0){ var w=colW(items); column(items,y0,Math.round(LW/2-w/2)); }
function sPDuo(){ pdVeil(0.35); var y=titles(L('pd_t'),L('pd_s'));
  if(PD.msg) text(PD.msg,Math.round(LW/2),y+4,P.hit,'center');
  pdCol([['pd_near',PD.busy?L('loading'):L('pd_near'),'primary'],['pd_new',L('pd_new')],['pd_in',L('pd_in')],['pd_back',L('back')]],Math.round(LH*0.62)); }
function sPDuoWait(){ pdVeil(0.45); var cx0=Math.round(LW/2), dots='.'.repeat(1+Math.floor(clock*2)%3);
  if(PD.near){ titles(L('pd_near_t'),L('pd_near_s')); var left=Math.max(0,Math.ceil(30-(clock-PD.nearT))); text(L('pd_wait')+dots+' '+left,cx0,Math.round(LH*0.42),P.text,'center');
    if(left<=0){ pdLeave(); PD.msg=L('pd_none'); go('pduo'); return; } }
  else { titles(L('pd_code_t')); var cs=PD.code?PD.code.split('').join(' '):''; plaque(cx0-PF.width(cs,4)/2,Math.round(LH*0.24)-2,cx0+PF.width(cs,4)/2,Math.round(LH*0.24)+4*PF.CAP+2,0.6);
    text(cs,cx0,Math.round(LH*0.24),P.band,'center',4); para(L('pd_code_s'),cx0,Math.round(LH*0.24)+4*PF.CAP+14,LW-SAFE.l-SAFE.r-40,P.text);
    text(L('pd_wait')+dots,cx0,Math.round(LH*0.6),P.soft,'center'); say(L('pd_code_t')+' '+(PD.code||'').split('').join(' ')); }
  var w=btnW([L('pd_cancel')]); button('pd_cancel',L('pd_cancel'),Math.round(cx0-w/2),Math.round(LH*0.74),w,BH,''); }
function sPDuoIn(){ pdVeil(0.45); titles(L('pd_in_t'),L('pd_in_s')); nickField(true);
  if(PD.msg) text(PD.msg,Math.round(LW/2),Math.round(LH*0.34)-10,P.hit,'center');
  var items=[['pd_ok',PD.busy?L('loading'):L('done'),'primary'],['pd_back2',L('back')]], w=btnW(items.map(function(q){ return q[1]; })), gap=10, y0=Math.round(LH*0.66), x=Math.round(LW/2-w-gap/2);
  button(items[0][0],items[0][1],x,y0,w,BH,'primary',true); button(items[1][0],items[1][1],x+w+gap,y0,w,BH,'',false); }
/* the partner's line: his state in words */
function pdMateSt(){ if(!PD.peer||PD.pst==='gone') return L('pd_st_gone'); return PD.pst?L('pd_st_'+PD.pst)+(PD.pst==='cal'?'.'.repeat(1+Math.floor(clock*2)%3):''):L('pd_wait')+'…'; }
/* «ВЫ ВМЕСТЕ»: the field with the rackets at rest, the own player in red; who has which racket and what the partner does */
function sPDuo2(){ var v=pgView(Pong.TUNE.PAD_LO-0.5*Pong.TUNE.SENS[pgSens()]); v.pys=null; pgField(v,DT);
  var cx0=Math.round(LW/2), y=topY(), cw=Math.round(Math.min(LW*0.22,170)), me=pdMe();
  plaque(cx0-cw-20,y-2,cx0+cw+20,y+64,0.75); text(L('pd_tog'),cx0,y+2,P.band,'center'); say(L('pd_tog'));
  [0,1].forEach(function(i){ var x=cx0+(i?1:-1)*Math.round(cw/2+10), mine=i===me;
    text(L('pd_lr'+i),x,y+18,P.soft,'center'); text(mine?pdName():pdMate(),x,y+30,mine?'#ec2a17':P.text,'center',2);
    text(mine?L('pd_st_menu'):pdMateSt(),x,y+50,mine||PD.pst==='ready'?P.band:P.soft,'center'); });
  var items=[['pd_next',L('pd_next'),'primary'],['pd_swap',L('pd_swap')],['pd_exit',L('pd_exit')]], w=btnW(items.map(function(q){ return q[1]; })), gap=8, x0=Math.round(LW/2-(3*w+2*gap)/2), by=LH-SAFE.b-BH-10;
  items.forEach(function(q,i){ button(q[0],q[1],x0+i*(w+gap),by,w,BH,q[2]||'',q[2]?Math.floor(clock*2)%2===0:false); }); }
/* the try-out's buttons together: «ГОТОВ» (then «ЖДЁМ НАПАРНИКА…» — pressing it takes the «ready» back), the waving again, the sensitivity;
   the partner's state over them */
function pdTryItems(){ return [['pd_ready',PD.ready?L('pd_wait')+'.'.repeat(1+Math.floor(clock*2)%3):L('pd_ready'),'primary'],['pg_rehold',L('recal')],['pg_sens',pgSensLabel()]]; }
function pdMateLine(y){ var s=L('pd_mate_st').replace('{s}',pdMateSt()), w=PF.width(s); plaque(LW/2-w/2,y-2,LW/2+w/2,y+PF.CAP+1,0.6); text(s,Math.round(LW/2),y,PD.pst==='ready'?P.band:P.text,'center'); }
/* the game over together */
/* after the game only the partner's confirmations are read (so the last steps stop being sent once he has them) */
function pdAcks(){ var Q=PD.inq; PD.inq=[]; Q.forEach(function(m){ if(PD.cfg&&m.g===PD.cfg.seed&&typeof m.a==='number') PD.hisAck=Math.max(PD.hisAck,m.a); else if(!PD.cfg||m.g!==PD.cfg.seed) PD.inq.push(m); }); }
function pdOverItems(){ return [['pd_again',PD.ready?L('pd_wait')+'.'.repeat(1+Math.floor(clock*2)%3):L('again'),'primary'],['pd_recal',L('recal')],['pd_exit',L('pd_exit')]]; }
function pdOver(){ overT+=DT; pgField(g,DT); lx.globalAlpha=0.45; R(P.bg,0,0,LW,LH); lx.globalAlpha=1; pdAcks(); if(PD.N&&PD.hisAck<g.n) pdFlush(false);
  if(PG.clips){ pgOverClips(); return; }   /* v1.64g: the best arcs, as alone */
  var cx0=freeSide()==='left'?Math.round(LW*0.6):Math.round(LW*0.4), y=Math.round(LH*0.2);
  var ls=[[L('pg_width').replace('{n}',Math.round(Pong.width(g)*100)),P.text],[L('pg_passes').replace('{n}',g.passes),P.text],[pdName()+' + '+pdMate(),P.soft],[L('pd_mate_st').replace('{s}',pdMateSt()),PD.pst==='ready'?P.band:P.soft]];
  var fw=0; ls.forEach(function(q){ fw=Math.max(fw,PF.width(q[0])); }); fw=Math.max(fw,PF.width(L('over')))+20; plaque(cx0-fw/2,y-2,cx0+fw/2,y+38+ls.length*11,0.6);
  text(L('over'),cx0,y,P.text,'center'); text(String(g.score),cx0,y+13,P.band,'center',2); ls.forEach(function(q,i){ text(q[0],cx0,y+38+i*11,q[1],'center'); });
  say(L('over')+' '+g.score);
  if(overT>0.8) column(pdOverItems(),Math.round(LH*0.52)); }
/* the sensitivity turned in the pause: a mark at the pause's step for the own racket, on both phones */
function pdSens(v){ var N=PD.N; if(!N||!PD.pz) return; var P=PD.pz.n, o3=N.g; PongNet.mark(N,P,['sens',PD.me,v]); pdAdopt(o3); PD.mk.push([P,'sens',PD.me,v]); pdSend({e:'sens',g:PD.cfg.seed,ep:PD.ep,n:P,i:PD.me,v:v}); Logs.gameEv('вдвоём: чувствительность',[P,PD.me,v]); }
/* the actions */
var PD_ACT={
  pg_duo:function(){ PD.msg=''; go('pduo'); },
  pd_near:function(){ pdOpen('near'); }, pd_new:function(){ pdOpen('new'); }, pd_in:function(){ PD.msg=''; go('pduoin'); },
  pd_ok:function(){ if(PD.busy||!nickEl) return; var v=nickEl.value.replace(/\D/g,''); if(v.length!==4){ PD.msg=L('pd_bad'); return; } pdOpen('join',v); },
  pd_back:function(){ PD.msg=''; go('ptitle'); }, pd_back2:function(){ PD.msg=''; go('pduo'); },
  pd_cancel:function(){ pdLeave(); go('pduo'); },
  pd_exit:function(){ pdLeave(); go('ptitle'); },
  pd_swap:function(){ if(PD.side===0){ PD.left=1-PD.left; pdSend({e:'sides',left:PD.left}); } else pdSend({e:'swap'}); },
  pd_next:function(){ PD.ready=false; if(pgReady()){ PG.done=true; PG.doneT=-9; PG.w0=-9; PG.resume=false; go('phold'); return; } onboarding=false; direct=false; ensure(toAway); },
  pd_ready:function(){ PD.ready=!PD.ready; PD.sent=''; },
  pd_again:function(){ if(!(booted&&Sonar.healthy())){ PD.ready=false; ensure(toAway); return; } PD.ready=!PD.ready; PD.sent=''; },
  pd_resume:function(){ var N=PD.N; if(!N||!PD.pz||!(clock-PD.heard<=2&&PD.pst==='pause')||N.g.n<PD.pz.n) return;
    if(!(booted&&Sonar.healthy())){ PD.fix=true; ensure(toAway); return; }   /* the microphone was taken (the phone put away): the getting ready again, then back to the pause */
    var m={e:'rs',g:PD.cfg.seed,ep:PD.ep,n:PD.pz.n,t:Math.round(Link.now()+3000)}; pdSend(m); pdResume(m); },
  pd_end:function(){ var N=PD.N; if(!N||!PD.pz) return; pdSend({e:'end',g:PD.cfg.seed,ep:PD.ep,n:PD.pz.n}); pdEndAt(PD.pz.n); if(clock-PD.heard>2){ pdEnd(); } },
  pd_fixed:function(){ PD.fix=false; go('pdpause'); },
  pd_recal:function(){ PD.ready=false; if(!(booted&&Sonar.healthy())){ ensure(toAway); return; } PG.resume=false; flipT=-9; go('phold'); pgWaveStart(); }
};
