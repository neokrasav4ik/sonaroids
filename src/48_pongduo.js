/* ════ SonaLob «ВДВОЁМ» on the screens (v1.64c; v1.64d: each phone its own half of the probe's tones — src/20_sonar.js setParity; stage 4 of claude/SONALOB_DUO.md). The menu: «ИГРАТЬ ОДНОМУ» / «ИГРАТЬ ВДВОЁМ» (Den
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
  cfg:null,N:null,inq:[],mine:{},hisAck:0,myAck:0,got:{},shown:{},sentAt:0,overT:0,from:null};
function pdMe(){ return PD.side===PD.left?0:1; }
function pdName(){ return Board.nick()||L('pd_you'); }
function pdMate(){ return PD.pname||L('pd_mate'); }
function pdSpan(){ var lin=PG.c&&PG.c.lin; return lin?Math.max(30,lin.t-lin.b):0; }
/* what this phone is doing, as the partner sees it: menu, cal (getting ready), try (the try-out), ready, play, over */
function pdState(){ if(scr==='pduo2') return 'menu';
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
  pdCheckGo(); }
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
function pdGot(m){ if(!PD.on||!m) return;
  if(m.e==='peer'){ PD.peer=true; PD.sent=''; if(scr==='pduowait') go('pduo2'); return; }
  if(m.e==='gone'||m.e==='bye'){ PD.peer=m.e==='gone'?false:PD.peer; PD.pst='gone'; if(m.e==='bye') PD.peer=false; return; }
  if(m.e==='hi'){ PD.peer=true; PD.sent=''; if(scr==='pduowait') go('pduo2'); return; }
  if(m.e==='st'){ PD.peer=true; PD.pst=m.st; PD.pname=String(m.nick||'').slice(0,16); PD.psens=m.sens; PD.pspan=m.span; if(scr==='pduowait') go('pduo2');
    if(scr==='count'&&m.st!=='ready'&&m.st!=='play'&&PD.cfg&&!PD.N){ Logs.ev('вдвоём: напарник не готов — без старта'); PD.cfg=null; go(PD.from||'pduo2'); } return; }
  if(m.e==='swap'){ if(PD.side===0){ PD.left=1-PD.left; pdSend({e:'sides',left:PD.left}); } return; }
  if(m.e==='sides'){ PD.left=m.left?1:0; return; }
  if(m.e==='go'){ if(!PD.ready){ PD.sent=''; return; } pdCount(m); return; }
  if(m.e==='h'){ PD.inq.push(m); return; } }
/* ── the start: the side 0 sends it once both are ready ── */
function pdCheckGo(){ if(PD.side!==0||!PD.peer||!PD.ready||PD.pst!=='ready'||scr==='count'||scr==='play') return;
  var me=pdMe(), s=[0,0], sp=[0,0]; s[me]=pgSens(); s[1-me]=PD.psens>=0&&PD.psens<=3?PD.psens:1; sp[me]=pdSpan(); sp[1-me]=PD.pspan>0?PD.pspan:0;
  var m={e:'go',seed:newSeed(),t0:Math.round(Link.now()+3700),left:PD.left,sens:s,span:sp}; pdSend(m); pdCount(m); }
function pdCount(m){ PD.left=m.left?1:0; PD.cfg={seed:m.seed>>>0,t0:m.t0,sens:m.sens,span:m.span}; PD.inq=PD.inq.filter(function(q){ return q.g===PD.cfg.seed; }); PD.N=null; PD.from=scr;
  pgKeep(); try{ DSP2.set('quarter',1); }catch(e){} countT=Math.max(0,(m.t0-Link.now())/1000); go('count'); }
/* ── the game ── */
function pdStart(){ var c=PD.cfg; g=Pong.create2(c.seed,PG_AR,c.sens,c.span); PD.me=pdMe(); PD.N=PongNet.create(g,PD.me); PD.mine={}; PD.his=[]; PD.mineAll=[]; PD.offT=0; PD.hisAck=0; PD.myAck=0; PD.got={}; PD.shown={}; PD.sentAt=0; PD.overT=0;
  acc=0; parts=[]; PG.pts=[]; PG.newBest=false; PG.rec=null; PG.clips=null; PG.fps=null; var I=Sonar.info(), cc=PG.c||{};
  Logs.gameStart({core:Pong.TAG2,game:'pong',duo:{code:PD.code,near:PD.near,side:PD.side,me:PD.me,mate:PD.pname||null},auto_cal:!!PG.auto,seed:c.seed,ar:PG_AR,sens:c.sens,span:c.span,t0:c.t0,cal:DSP2.info().cal,tones:Sonar.info().par,lin:cc.lin?{b:+cc.lin.b.toFixed(1),t:+cc.lin.t.toFixed(1)}:null,
    chan:I.chan,hand:handSide(),probe_gain:I.probe_gain,probe_snr:I.probe_snr,f_lo:I.f_lo,W:LW,H:LH,sfx:Sfx.state(),link:Link.state(),started:new Date().toISOString(),app:'sonaroids'});
  Sfx.lob('start'); go('play'); }
/* the partner's palms that came: into the game (it runs again from the first that differs from the guess) */
function pdTake(){ var N=PD.N; if(!N||!PD.inq.length) return; var Q=PD.inq; PD.inq=[];
  Q.forEach(function(m){ if(m.g!==PD.cfg.seed) return; if(typeof m.a==='number') PD.hisAck=Math.max(PD.hisAck,m.a);
    var list=[]; (m.v||[]).forEach(function(v,j){ var k=m.k+j; if(k<1) return; PD.got[k]=1; PD.his[k-1]=v===undefined?null:v; list.push([k,v===null||v===undefined?null:v/10000]); });
    while(PD.got[PD.myAck+1]){ delete PD.got[PD.myAck-200]; PD.myAck++; }
    if(!list.length) return; var old=N.g, out=PongNet.remote(N,list);
    if(N.g!==old){ for(var k in old) if(k.charAt(0)==='_') N.g[k]=old[k]; g=N.g; }
    (out||[]).forEach(function(s){ pdReact(s.n,s.events,s.fx); }); }); }
/* a step's events → the sounds and the drawing, each once (a step run again shows only what it did not show before) */
function pdReact(n,events,fx){ var was=PD.shown[n]||{e:[],f:[]}, fk=function(f){ return Object.keys(f).join(','); };
  var ev=events.filter(function(e){ return was.e.indexOf(e)<0; }), fxs=(fx||[]).filter(function(f){ return was.f.indexOf(fk(f))<0; });
  PD.shown[n]={e:was.e.concat(ev),f:was.f.concat(fxs.map(fk))}; delete PD.shown[n-400]; if(!ev.length&&!fxs.length) return;
  var q={events:ev,fx:fxs,n:n,t:n*Pong.DT,series:g.series,crk:g.crk,_sk:g._sk,_dullN:g._dullN}; pgSkFx(q); pgSound(q); g._dullN=q._dullN; g._sk=q._sk; }
/* this phone's palms the partner has not confirmed yet: at once on the direct channel, every ~3 steps through the server */
function pdFlush(force){ var N=PD.N; if(!N) return; var k0=PD.hisAck+1, k1=Math.min(N.g.n,k0+39), now=performance.now(); if(k1<k0) return;
  if(!force&&!Link.direct()&&now-PD.sentAt<45) return;   // the server: ~20 messages a second (it takes up to 60)
  var v=[]; for(var k=k0;k<=k1;k++) v.push(PD.mine[k]===undefined?null:PD.mine[k]); PD.sentAt=now;
  Link.send({e:'h',g:PD.cfg.seed,k:k0,v:v,a:PD.myAck}); for(var d in PD.mine) if(+d<k0-60) delete PD.mine[d]; }
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
  /* the partner is no longer in this game (he left, his game broke off) — this one ends too (the pause for both and the waiting come next) */
  if(PD.pst==='play'||PD.pst==='ready') PD.offT=0; else if((PD.offT+=DT)>3&&N.g.state!=='over'){ Logs.gameEv('вдвоём: напарник не в игре — партия кончена',PD.pst); N.lost=true; N.g.state='over'; }
  pdFlush(false);
  pgField(g,DT); pgHud(); coveredLine(topY()+40); say(L('menu_a'));
  if(g.state==='over'){ PD.overT+=DT; if(PD.myAck>=g.n||PD.overT>5||N.lost) pdEnd(); } }
function pdEnd(){ g.state='over'; overT=0; PD.ready=false; Logs.gameEv('вдвоём: итог',{score:g.score,n:g.n,confirmed:PD.myAck,rollbacks:PD.N.rb,rb_max:PD.N.rbMax});
  /* both palms (×10000, null — none), the left racket's first: the whole game can be replayed from the log (Pong.replay2) */
  var L0=PD.me===0?PD.mineAll:PD.his, R0=PD.me===0?PD.his:PD.mineAll, nn=g.n, cut=function(a){ var o=[]; for(var i=0;i<nn;i++) o.push(a[i]===undefined?null:a[i]); return o; };
  Logs.gameEv('вдвоём: ладони',{seed:PD.cfg.seed,sens:PD.cfg.sens,span:PD.cfg.span,n:nn,left:cut(L0),right:cut(R0)}); Logs.gameStop(); pdFlush(true); go('over'); }
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
function pdOver(){ overT+=DT; pgField(g,DT); lx.globalAlpha=0.45; R(P.bg,0,0,LW,LH); lx.globalAlpha=1; pdAcks(); if(PD.N&&PD.hisAck<g.n) pdFlush(false);
  var cx0=freeSide()==='left'?Math.round(LW*0.6):Math.round(LW*0.4), y=Math.round(LH*0.2);
  var ls=[[L('pg_width').replace('{n}',Math.round(Pong.width(g)*100)),P.text],[L('pg_passes').replace('{n}',g.passes),P.text],[pdName()+' + '+pdMate(),P.soft],[L('pd_mate_st').replace('{s}',pdMateSt()),PD.pst==='ready'?P.band:P.soft]];
  var fw=0; ls.forEach(function(q){ fw=Math.max(fw,PF.width(q[0])); }); fw=Math.max(fw,PF.width(L('over')))+20; plaque(cx0-fw/2,y-2,cx0+fw/2,y+38+ls.length*11,0.6);
  text(L('over'),cx0,y,P.text,'center'); text(String(g.score),cx0,y+13,P.band,'center',2); ls.forEach(function(q,i){ text(q[0],cx0,y+38+i*11,q[1],'center'); });
  say(L('over')+' '+g.score);
  if(overT>0.8) column([['pd_again',PD.ready?L('pd_wait')+'.'.repeat(1+Math.floor(clock*2)%3):L('again'),'primary'],['pd_recal',L('recal')],['pd_exit',L('pd_exit')]],Math.round(LH*0.52)); }
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
  pd_recal:function(){ PD.ready=false; if(!(booted&&Sonar.healthy())){ ensure(toAway); return; } PG.resume=false; flipT=-9; go('phold'); pgWaveStart(); }
};
