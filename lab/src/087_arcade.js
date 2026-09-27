/* ── ЭКШН-ПРОТОТИПЫ: слалом, ловец бомб, пещера (с 27.09, 0.39m) ──
   Диагноз автора 27.09: в Sonaroids ладонь всё время движется («экшн без перерыва»), а в Арканоиде ракетка в основном ждёт —
   и ждущая рука показывает своё качание (1–2 мм). Поэтому для сборника — игры, где ладонь всё время в деле. Порядок (решение автора):
   Слалом → Ловец бомб → Пещера → Трасса (0.39n; первые три 27.09 13:22: «слалом ещё куда ни шло, остальные фигня»). Управление и подготовка — как в Sonaroids: телефон горизонтально, разъём к ладони,
   пустая комната → взмахи (модуль игры Tune: ход ловится за ~5 с, ракетка/лыжник сразу ходит за ладонью) → «Поймал» → отсчёт.
   Игрок у левого края ходит вверх-вниз по короткой стороне экрана (ладонь дальше — выше), мир едет справа налево.
   Положение игрока — как у корабля Sonaroids: доля высоты по Tune.fracOf, поля 6% сверху и снизу, догоняет цель на 0,49 за кадр 60 Гц.
   Пишется звук (до 150 с), метки фаз, сдвиги высоты подстройки и по кадрам экрана [кадр, доля по ладони, y игрока, ладонь видна]
   и события — sonararc_<игра>_*.wav, разбор tools/eval_arc.js. */
var ARC={on:false,frames:[],phase:'',raf:0,best:{}}, ARC_MAX=Math.round(150*48000/512), ARC_M=0.06;
var ARC_GAMES={
  slalom:{title:'Слалом',file:'slalom',
    intro:'Лыжник у левого края едет вниз по склону — склон бежит справа налево, быстрее и быстрее. Проезжай между парой флажков: ворота то вверху, то внизу. 40 ворот на время; пропустил ворота — +3 с.',
    unit:'время'},
  bombs:{title:'Ловец бомб',file:'bombs',
    intro:'Справа мечется бомбист и бросает бомбы влево — всё чаще. Лови их вёдрами у левого края. Упустил бомбу — все бомбы на экране взрываются и одно ведро пропадает. Вёдер три.',
    unit:'очки'},
  race:{title:'Трасса',file:'race',
    intro:'Машина у левого края мчится по петляющей дороге. Обгоняй попутные машины, не вылетай на траву — там машина тормозит. Бензин кончается: подбирай канистры на дороге. Удар — резкое торможение. Едешь, пока есть бензин; счёт — метры.',
    unit:'метры'},
  cave:{title:'Пещера',file:'cave',
    intro:'Корабль летит по извилистой пещере — она сужается и ускоряется. Не задевай стены. Три жизни; после удара — полторы секунды неуязвимости.',
    unit:'метры'}
};
var arcGame='slalom';
function arcText(a,b){ el('acSay').textContent=a; el('acSub').textContent=b||''; }
function arcButtons(v){ el('acBtns').classList.toggle('hidden',!v); }
function arcMark(k){ ARC.marks[k]=ARC.frames.length*N; }
function arcEv(k){ ARC.log.push([ARC.frames.length,k]); }
function arcFrame(f,gap,r){ if(!ARC.on) return; if(ARC.frames.length<ARC_MAX){ if(gap) ARC.gaps++; ARC.frames.push(f); }
  if(r){ ARC.present=r.present; if(r.present) ARC.dist=r.height; } }
function arcOpen(g){ arcGame=g; var G=ARC_GAMES[g]; el('acTitle').textContent=G.title+' — прототип'; el('acIntro').textContent=G.intro;
  var b=ARC.best[g]; el('acBest').textContent=b===undefined?'':'Лучший результат: '+arcFmt(g,b); show('arcIntro'); }
function arcFmt(g,v){ return g==='slalom'?v.toFixed(1).replace('.',',')+' с':(g==='cave'||g==='race')?Math.round(v)+' м':String(v); }

/* ── общая часть: подготовка как в Sonaroids ── */
function arcPlay(){
  show('arcPlay'); arcButtons(false); cancelAnimationFrame(ARC.raf);
  ARC={on:false,frames:[],gaps:0,marks:{},log:[],phase:'prep',raf:0,best:ARC.best||{},present:false,dist:null,T:null,shifts:[],game:arcGame,
       frac:null,py:0.5,W:null,t:0,lives:3,score:0,over:false,port:orientSide()||'right'};
  arcInit(); arcText('Готовлюсь','Убери руку. Подбираю громкость зонда.'); mode=null; arcDraw();
  pickChannel().then(function(){ return autoLevel(); }).then(function(L){
    if(L.snr<30){ setProbe('off'); arcText('Зонда почти не слышно',NOPROBE); arcButtons(true); return null; }
    var cal0=dspBand(DSP2); DSP2.init(fs,'all'); DSP2.setCal(cal0); DSP2.set('autocenter',1); mode='arc'; ARC.on=true; arcMark('empty'); ARC.phase='empty';
    arcText('Убери руку','Слушаю пустую комнату.'); return rpWait(DSP2); }).then(function(st){
    if(!st) return;
    if(st==='noprobe'){ setProbe('off'); mode=null; ARC.on=false; arcText('Зонда не слышно',NOPROBE); arcButtons(true); return; }
    return sleep(600).then(function(){ arcMark('wave'); ARC.phase='wave'; ARC.T=Tune.create(100,true);
      arcText('Помаши ладонью','К разъёму и от него, 5–15 см — '+(arcGame==='slalom'?'лыжник':arcGame==='bombs'?'вёдра':arcGame==='race'?'машина':'корабль')+' ходит за ней. Секунд пять.');
      ARC.last=performance.now(); ARC.raf=requestAnimationFrame(arcLive); return new Promise(function(r){ ARC.onCaught=r; }); }).then(function(){
      arcMark('count'); ARC.phase='count'; arcText('Поймал','Ладонь дальше от разъёма — выше.');
      return sleep(1500).then(function(){ arcText('3',''); return sleep(1000); }).then(function(){ arcText('2',''); return sleep(1000); }).then(function(){ arcText('1',''); return sleep(1000); }); }).then(function(){
      cancelAnimationFrame(ARC.raf); arcMark('play'); ARC.phase='play'; arcText('',''); ARC.last=performance.now(); ARC.raf=requestAnimationFrame(arcLoop); });
  }).catch(function(e){ arcText('Не вышло',(e&&e.message)||String(e)); arcButtons(true); });
}
/* игрок: доля высоты по подстройке → y (0 — верх экрана), догоняет на 0,49 за кадр 60 Гц — как корабль Sonaroids */
function arcMove(dt){ if(ARC.present&&ARC.dist!==null&&ARC.T){ ARC.frac=Tune.fracOf(ARC.T,ARC.dist); }
  if(ARC.frac!==null){ var ty=1-(ARC_M+ARC.frac*(1-2*ARC_M)); ARC.py+=(ty-ARC.py)*(1-Math.pow(0.51,dt*60)); } }
function arcLive(now){ if(ARC.phase!=='wave'&&ARC.phase!=='count') return; var dt=Math.min(0.033,(now-ARC.last)/1000); ARC.last=now;
  if(ARC.phase==='wave'&&ARC.T){ Tune.step(ARC.T,dt,{present:ARC.present,height:ARC.dist},true,function(d){ DSP2.shift(d); ARC.shifts.push([ARC.frames.length,+d.toFixed(2)]); if(ARC.dist!==null) ARC.dist+=d; });
    if(ARC.T.ok&&ARC.onCaught){ var f=ARC.onCaught; ARC.onCaught=null; f(); } }
  arcMove(dt); arcDraw(); ARC.raf=requestAnimationFrame(arcLive); }
function arcLoop(now){
  if(ARC.phase!=='play') return;
  var dt=Math.min(0.033,(now-ARC.last)/1000); ARC.last=now; ARC.t+=dt; arcMove(dt);
  var cv=el('acC'); ARC.ar=(cv.width||800)/(cv.height||400);
  ARC_STEP[ARC.game](dt);
  ARC.log.push([ARC.frames.length,ARC.frac===null?null:+ARC.frac.toFixed(4),+ARC.py.toFixed(4),ARC.present?1:0]);
  arcDraw();
  if(ARC.over||ARC.frames.length>=ARC_MAX){ ARC.phase='over'; arcMark('over'); ARC.on=false; mode=null; setProbe('off');
    var g=ARC.game, res=g==='slalom'?ARC.time:ARC.score, b=ARC.best[g], better=g==='slalom'?(ARC.done&&(b===undefined||res<b)):(b===undefined||res>b);
    if(better&&(g!=='slalom'||ARC.done)) ARC.best[g]=res;
    arcText(g==='slalom'&&!ARC.done?'Стоп':'Финиш',arcSummary()+(ARC.best[g]!==undefined?' · лучший '+arcFmt(g,ARC.best[g]):'')); arcButtons(true); return; }
  ARC.raf=requestAnimationFrame(arcLoop);
}
function arcSummary(){ var g=ARC.game;
  if(g==='slalom') return 'ворот '+ARC.passed+' из '+ARC.gates+' · время '+arcFmt(g,ARC.time||ARC.t)+' (штраф '+(ARC.missed*3)+' с)';
  if(g==='race') return 'проехал '+Math.round(ARC.score)+' м · канистр '+ARC.cans+' · аварий '+ARC.crashes+' · на траве '+ARC.grassT.toFixed(0)+' с';
  if(g==='bombs') return 'поймано '+ARC.caught+' · очки '+ARC.score+' · волна '+ARC.wave;
  return 'пролетел '+Math.round(ARC.score)+' м · ударов '+ARC.hits; }

/* ── игры: координаты — в высотах экрана (x от 0 до ar, y от 0 сверху до 1) ── */
var ARC_PX=0.32;                                           // где игрок по горизонтали
function arcInit(){ var g=ARC.game; ARC.py=0.5; ARC.score=0; ARC.lives=3; ARC.t=0;
  if(g==='slalom'){ ARC.gates=40; ARC.passed=0; ARC.missed=0; ARC.made=0; ARC.flags=[]; ARC.v=0.42; ARC.nextX=1.4; ARC.side=1; ARC.time=null; ARC.done=false; ARC.trail=[]; }
  if(g==='bombs'){ ARC.buckets=3; ARC.caught=0; ARC.wave=1; ARC.left=10; ARC.bombs=[]; ARC.by=0.5; ARC.bv=0; ARC.btgt=0.5; ARC.drop=0.6; ARC.pause=0; ARC.boom=0; }
  if(g==='race'){ ARC.cols=[]; ARC.cx=0; ARC.cc=0.5; ARC.ctg=0.5; ARC.rw=0.56; ARC.v=0.3; ARC.fuel=100; ARC.cars=[]; ARC.fcans=[]; ARC.nextCar=1.2; ARC.nextCan=2.5;
    ARC.cans=0; ARC.crashes=0; ARC.grassT=0; ARC.onGrass=false; ARC.inv=0; ARC.flash=0; ARC.dash=0; }
  if(g==='cave'){ ARC.cols=[]; ARC.cx=0; ARC.cc=0.5; ARC.cg=0.62; ARC.ctg=0.5; ARC.v=0.45; ARC.hits=0; ARC.inv=0; ARC.flash=0; }
}
var ARC_STEP={
  /* слалом: ворота чередуются вверху и внизу, амплитуда 0,16–0,32 от середины; ширина 0,30 → 0,19; скорость 0,42 → 0,95 высоты/с */
  slalom:function(dt){ var ar=ARC.ar, px=ARC_PX;
    ARC.v=Math.min(0.95,0.42+0.013*ARC.passed+0.004*ARC.t); var dx=ARC.v*dt;
    ARC.flags.forEach(function(f){ f.x-=dx; }); ARC.nextX-=dx;
    while(ARC.made<ARC.gates&&ARC.nextX<ar+0.3){ var k=ARC.made/ARC.gates, gw=0.30-0.11*k, amp=0.16+0.16*Math.random();
      ARC.side=-ARC.side; ARC.flags.push({x:ARC.nextX,y:0.5+ARC.side*amp,w:gw,st:0}); ARC.made++; ARC.nextX+=0.95-0.25*k+0.15*Math.random(); }
    ARC.flags.forEach(function(f){ if(f.st===0&&f.x<=px){ if(Math.abs(ARC.py-f.y)<=f.w/2){ f.st=1; ARC.passed++; arcEv('gate'); } else { f.st=2; ARC.missed++; arcEv('miss:'+(ARC.py-f.y).toFixed(3)); } } });
    ARC.flags=ARC.flags.filter(function(f){ return f.x>-0.3; });
    ARC.trail.push(ARC.py); if(ARC.trail.length>90) ARC.trail.shift();
    if(ARC.made>=ARC.gates&&ARC.flags.every(function(f){ return f.st!==0; })){ ARC.done=true; ARC.time=ARC.t+3*ARC.missed; ARC.score=ARC.passed; arcEv('finish'); ARC.over=true; }
    if(ARC.lives<=0) ARC.over=true; },
  /* ловец бомб: волна n — 10·n бомб, бомбист быстрее, бомбы летят быстрее; упустил — все бомбы взрываются, ведро долой, волна заново медленнее */
  bombs:function(dt){ var ar=ARC.ar, bx=ar-0.12, bh=0.15;
    if(ARC.boom>0){ ARC.boom-=dt; return; }
    if(ARC.pause>0){ ARC.pause-=dt; if(ARC.pause<=0) arcText('',''); return; }
    var w=ARC.wave, bspd=0.55+0.12*(w-1), mv=0.35+0.12*(w-1), gap=Math.max(0.28,0.85-0.09*(w-1));
    if(Math.abs(ARC.btgt-ARC.by)<0.02) ARC.btgt=0.1+0.8*Math.random();
    ARC.by+=Math.max(-mv*dt,Math.min(mv*dt,ARC.btgt-ARC.by));
    ARC.drop-=dt; if(ARC.drop<=0&&ARC.left>0){ ARC.bombs.push({x:bx-0.05,y:ARC.by}); ARC.left--; ARC.drop=gap*(0.7+0.6*Math.random()); }
    var xs=[0.28,0.2,0.12].slice(0,ARC.buckets), lost=false;
    for(var i=ARC.bombs.length-1;i>=0;i--){ var b=ARC.bombs[i]; b.x-=bspd*dt;
      for(var j=0;j<xs.length;j++){ if(b.x<=xs[j]+0.03&&b.x>=xs[j]-0.03&&Math.abs(b.y-ARC.py)<=bh/2+0.02){ ARC.bombs.splice(i,1); ARC.caught++; ARC.score+=w; arcEv('catch'); b=null; break; } }
      if(b&&b.x<0.04){ lost=true; arcEv('miss:'+(ARC.py-b.y).toFixed(3)); break; } }
    if(lost){ ARC.bombs=[]; ARC.buckets--; ARC.boom=1.2; arcEv('boom'); if(ARC.buckets<=0){ ARC.over=true; return; }
      ARC.wave=Math.max(1,ARC.wave-1); ARC.left=10*ARC.wave; ARC.drop=1.0; return; }
    if(ARC.left<=0&&!ARC.bombs.length){ ARC.wave++; ARC.left=10*ARC.wave; ARC.pause=1.2; ARC.drop=0.5; arcText('Волна '+ARC.wave,''); arcEv('wave'); } },
  /* трасса (как «Enduro» / «Road Fighter»): дорога петляет (цель середины меняется каждые 0,8–1,6 высоты пути), ширина 0,56 → 0,42;
     скорость сама растёт до 1,1 высоты/с, на траве падает к 0,3; попутные машины едут 0,3–0,6 и иногда меняют полосу; удар — скорость 0,15
     и секунда неуязвимости; бензин 100, расход 2,2 в секунду (~45 с), канистра +25; кончился — финиш. Счёт — метры (10 на высоту экрана) */
  race:function(dt){ var ar=ARC.ar, px=ARC_PX, step=0.02, pw=0.10, ph=0.065;
    function roadAt(x){ var k=ARC.cols; for(var i=0;i<k.length;i++) if(k[i].x>=x-step/2) return k[i]; return k[k.length-1]; }
    var R0=ARC.cols.length?roadAt(px):null, grass=R0&&Math.abs(ARC.py-R0.c)>R0.w/2-0.01;
    if(grass&&!ARC.onGrass) arcEv('grass'); ARC.onGrass=!!grass; if(grass) ARC.grassT+=dt;
    var vmax=grass?0.3:1.1; ARC.v+=grass?(vmax-ARC.v)*Math.min(1,dt*2.5):Math.min(0.28*dt,vmax-ARC.v);
    var dx=ARC.v*dt; ARC.score+=dx*10; ARC.dash=(ARC.dash+dx)%0.24;
    ARC.fuel-=2.2*dt; if(ARC.fuel<=0){ ARC.fuel=0; arcEv('nofuel'); ARC.over=true; }
    ARC.cols.forEach(function(c){ c.x-=dx; }); ARC.cols=ARC.cols.filter(function(c){ return c.x>-0.05; });
    while(!ARC.cols.length||ARC.cols[ARC.cols.length-1].x<ar+0.4){ var lx=ARC.cols.length?ARC.cols[ARC.cols.length-1].x+step:0;
      ARC.cx-=step; if(ARC.cx<=0){ ARC.ctg=Math.random(); ARC.cx=0.8+0.8*Math.random(); }
      ARC.rw=Math.max(0.42,0.56-0.00012*ARC.score); var lo=ARC.rw/2+0.05, tg=lo+(1-2*lo)*ARC.ctg; ARC.cc+=(tg-ARC.cc)*0.04;
      ARC.cols.push({x:lx,c:ARC.cc,w:ARC.rw}); }
    ARC.nextCar-=dx; if(ARC.nextCar<=0){ ARC.cars.push({x:ar+0.3,lane:(Math.random()<0.5?-1:1)*(0.12+0.18*Math.random()),v:0.3+0.3*Math.random(),sw:0}); ARC.nextCar=0.9+0.9*Math.random()-Math.min(0.3,ARC.score/3000); }
    ARC.nextCan-=dx; if(ARC.nextCan<=0){ ARC.fcans.push({x:ar+0.3,lane:(Math.random()-0.5)*0.6}); ARC.nextCan=3.5+2.5*Math.random(); }
    ARC.cars.forEach(function(k){ k.x-=(ARC.v-k.v)*dt; if(k.sw===0&&Math.random()<dt*0.12){ k.sw=-Math.sign(k.lane)*0.25; } if(k.sw){ var d=Math.max(-0.12*dt,Math.min(0.12*dt,k.sw)); k.lane+=d; k.sw-=d; if(Math.abs(k.sw)<1e-3) k.sw=0; }
      var r=roadAt(k.x); k.y=r?r.c+k.lane*r.w:0.5; });
    ARC.cars=ARC.cars.filter(function(k){ return k.x>-0.3&&k.x<ar+0.8; });
    ARC.fcans.forEach(function(f){ f.x-=dx; var r=roadAt(f.x); f.y=r?r.c+f.lane*r.w:0.5; });
    if(ARC.inv>0) ARC.inv-=dt; if(ARC.flash>0) ARC.flash-=dt;
    for(var i=0;i<ARC.cars.length;i++){ var k=ARC.cars[i]; if(ARC.inv<=0&&Math.abs(k.x-px)<pw&&Math.abs(k.y-ARC.py)<ph){ ARC.crashes++; ARC.v=0.15; ARC.inv=1.0; ARC.flash=0.3; arcEv('crash:'+(ARC.py-k.y).toFixed(3)); ARC.cars.splice(i,1); break;   /* сбитая машина уходит с дороги — иначе, пока мы тормозим, она догоняет и бьёт снова */ } }
    for(var j=ARC.fcans.length-1;j>=0;j--){ var f=ARC.fcans[j]; if(Math.abs(f.x-px)<0.06&&Math.abs(f.y-ARC.py)<0.07){ ARC.fcans.splice(j,1); ARC.fuel=Math.min(100,ARC.fuel+25); ARC.cans++; arcEv('fuel'); } else if(f.x<-0.1) ARC.fcans.splice(j,1); } },
  /* пещера: середина прохода блуждает (цель меняется каждые 0,6–1,2 высоты пути), проход 0,62 → 0,30; скорость 0,45 → 1,0 высоты/с */
  cave:function(dt){ var ar=ARC.ar, px=ARC_PX, sr=0.035;
    ARC.v=Math.min(1.0,0.45+0.006*ARC.t); var dx=ARC.v*dt; ARC.score+=dx*10;
    ARC.cols.forEach(function(c){ c.x-=dx; }); ARC.cols=ARC.cols.filter(function(c){ return c.x>-0.05; });
    var step=0.02; while(!ARC.cols.length||ARC.cols[ARC.cols.length-1].x<ar+0.05){ var lx=ARC.cols.length?ARC.cols[ARC.cols.length-1].x+step:0;
      ARC.cx-=step; if(ARC.cx<=0){ ARC.ctg=Math.max(0,Math.min(1,0.5+(Math.random()-0.5)*1.2)); ARC.cx=0.6+0.6*Math.random(); }
      ARC.cg=Math.max(0.30,0.62-0.004*ARC.t); var lo=ARC.cg/2+0.03, tg=lo+(1-2*lo)*ARC.ctg; ARC.cc+=(tg-ARC.cc)*0.05;
      ARC.cols.push({x:lx,c:ARC.cc,g:ARC.cg}); }
    if(ARC.inv>0) ARC.inv-=dt; if(ARC.flash>0) ARC.flash-=dt;
    var col=null; for(var i=0;i<ARC.cols.length;i++) if(Math.abs(ARC.cols[i].x-px)<=step){ col=ARC.cols[i]; break; }
    if(col&&ARC.inv<=0&&Math.abs(ARC.py-col.c)>col.g/2-sr){ ARC.hits++; ARC.lives--; ARC.inv=1.5; ARC.flash=0.3; arcEv('hit:'+(ARC.py-col.c).toFixed(3)); if(ARC.lives<=0) ARC.over=true; } }
};

/* ── рисование: пиксельный ретро-стиль, как в Sonaroids ── */
function arcDraw(){ var cv=el('acC'); if(!cv||!cv.getContext) return; var dpr=Math.min(2,window.devicePixelRatio||1), bw0=cv.clientWidth||800, bh0=cv.clientHeight||400;
  if(cv.width!==Math.round(bw0*dpr)){ cv.width=Math.round(bw0*dpr); cv.height=Math.round(bh0*dpr); }
  var c=cv.getContext('2d'), W=cv.width, H=cv.height, g=ARC.game, X=function(x){ return x*H; }, Y=function(y){ return y*H; }, px=ARC_PX, py=ARC.py;
  c.fillStyle=g==='slalom'?'#1a2230':'#070a12'; c.fillRect(0,0,W,H);
  if(g==='slalom'){ c.fillStyle='#dfe8f0'; c.globalAlpha=0.06; for(var s=0;s<30;s++){ var sx=((s*97.3+(ARC.t||0)*(ARC.v||0.4)*H)%W); c.fillRect(W-sx,(s*53)%H,2*dpr,2*dpr); } c.globalAlpha=1;
    if(ARC.trail&&ARC.trail.length>1){ c.strokeStyle='rgba(223,232,240,.35)'; c.lineWidth=2*dpr; c.beginPath(); ARC.trail.forEach(function(y,i){ var x=X(px)-(ARC.trail.length-1-i)*(ARC.v||0.4)/60*H; if(i) c.lineTo(x,Y(y)); else c.moveTo(x,Y(y)); }); c.stroke(); }
    (ARC.flags||[]).forEach(function(f){ var col=f.st===1?'#6FAE7E':f.st===2?'#555':(f.y<0.5?'#ff7a8a':'#7aa8ff'); [f.y-f.w/2,f.y+f.w/2].forEach(function(y,k){
        c.fillStyle='#c9d3dc'; c.fillRect(X(f.x)-1*dpr,Y(y)-(k?0:0.07*H),2*dpr,0.07*H); c.fillStyle=col; c.fillRect(X(f.x),Y(y)-(k?-0.045*H:0.07*H),0.05*H,0.025*H); }); });
    c.fillStyle='#5fe0b8'; c.fillRect(X(px)-0.03*H,Y(py)-0.012*H,0.06*H,0.024*H); c.fillStyle='#ffd27a'; c.fillRect(X(px)-0.008*H,Y(py)-0.03*H,0.016*H,0.02*H); }
  if(g==='bombs'){ var ar=W/H, bx=ar-0.12; c.fillStyle='#ff7a8a'; c.fillRect(X(bx)-0.03*H,Y(ARC.by||0.5)-0.05*H,0.06*H,0.1*H); c.fillStyle='#231f33'; c.fillRect(X(bx)-0.02*H,Y(ARC.by||0.5)-0.03*H,0.04*H,0.012*H);
    (ARC.bombs||[]).forEach(function(b){ c.fillStyle='#ffd27a'; c.beginPath(); c.arc(X(b.x),Y(b.y),0.02*H,0,6.283); c.fill(); c.fillStyle='#ff9a3c'; c.fillRect(X(b.x)+0.012*H,Y(b.y)-0.03*H,0.008*H,0.012*H); });
    if(ARC.boom>0){ c.fillStyle='rgba(255,122,138,'+(0.35*ARC.boom)+')'; c.fillRect(0,0,W,H); }
    c.fillStyle='#5fe0b8'; [0.28,0.2,0.12].slice(0,ARC.buckets===undefined?3:ARC.buckets).forEach(function(x){ c.fillRect(X(x)-0.025*H,Y(py)-0.075*H,0.05*H,0.15*H); c.fillStyle='#3a9c80'; c.fillRect(X(x)-0.025*H,Y(py)-0.075*H,0.012*H,0.15*H); c.fillStyle='#5fe0b8'; }); }
  if(g==='race'){ c.fillStyle='#1d3a24'; c.fillRect(0,0,W,H); var cols=ARC.cols||[], cw=0.02*H+1;
    cols.forEach(function(k){ c.fillStyle='#3a3a44'; c.fillRect(X(k.x),Y(k.c-k.w/2),cw,Y(k.w)); var red=Math.floor((k.x+(ARC.dash||0))/0.06)%2===0; c.fillStyle=red?'#d65a5a':'#e8e8e8'; c.fillRect(X(k.x),Y(k.c-k.w/2)-0.012*H,cw,0.012*H); c.fillRect(X(k.x),Y(k.c+k.w/2),cw,0.012*H);
      if(Math.floor((k.x+(ARC.dash||0))/0.12)%2===0){ c.fillStyle='#cfcfa0'; c.fillRect(X(k.x),Y(k.c)-0.004*H,cw,0.008*H); } });
    (ARC.fcans||[]).forEach(function(f){ c.fillStyle='#ffd27a'; c.fillRect(X(f.x)-0.022*H,Y(f.y)-0.03*H,0.044*H,0.06*H); c.fillStyle='#3a2a10'; c.font='bold '+Math.round(0.045*H)+'px monospace'; c.textAlign='center'; c.fillText('F',X(f.x),Y(f.y)+0.016*H); });
    var car=function(x,y,col){ c.fillStyle='#111'; [[-0.035,-0.034],[0.025,-0.034],[-0.035,0.024],[0.025,0.024]].forEach(function(w){ c.fillRect(X(x+w[0]),Y(y+w[1]),0.022*H,0.01*H); }); c.fillStyle=col; c.fillRect(X(x-0.045),Y(y-0.026),0.09*H,0.052*H); c.fillStyle='rgba(255,255,255,.35)'; c.fillRect(X(x+0.01),Y(y-0.02),0.018*H,0.04*H); };
    (ARC.cars||[]).forEach(function(k){ car(k.x,k.y,'#ff7a8a'); });
    if(ARC.flash>0){ c.fillStyle='rgba(255,122,138,.35)'; c.fillRect(0,0,W,H); }
    if(!(ARC.inv>0&&Math.floor(ARC.inv*10)%2)) car(px,py,'#5fe0b8');
    if(ARC.phase==='play'||ARC.phase==='over'){ var fw=0.25*H; c.fillStyle='rgba(0,0,0,.5)'; c.fillRect(W-fw-10*dpr,0.1*H,fw,0.03*H); c.fillStyle=(ARC.fuel||0)<25?'#ff7a8a':'#ffd27a'; c.fillRect(W-fw-10*dpr,0.1*H,fw*(ARC.fuel||0)/100,0.03*H); } }
  if(g==='cave'){ c.fillStyle='#4a4270'; var cols=ARC.cols||[]; cols.forEach(function(k){ c.fillRect(X(k.x),0,0.02*H+1,Y(k.c-k.g/2)); c.fillRect(X(k.x),Y(k.c+k.g/2),0.02*H+1,H); });
    if(ARC.flash>0){ c.fillStyle='rgba(255,122,138,.35)'; c.fillRect(0,0,W,H); }
    if(!(ARC.inv>0&&Math.floor(ARC.inv*10)%2)){ c.fillStyle='#5fe0b8'; c.beginPath(); c.moveTo(X(px)+0.04*H,Y(py)); c.lineTo(X(px)-0.03*H,Y(py)-0.025*H); c.lineTo(X(px)-0.03*H,Y(py)+0.025*H); c.closePath(); c.fill(); } }
  if(ARC.phase!=='play'){ c.fillStyle=ARC.phase==='wave'||ARC.phase==='count'?'rgba(7,10,18,.4)':'rgba(7,10,18,.72)'; c.fillRect(0,0,W,H); }
  c.fillStyle='#E7EDE9'; c.font=Math.round(15*dpr)+'px "IBM Plex Mono",monospace'; c.textAlign='left';
  if(ARC.phase==='play'||ARC.phase==='over'){ var left=g==='slalom'?(ARC.t+3*(ARC.missed||0)).toFixed(1).replace('.',',')+' с':(g==='cave'||g==='race')?Math.round(ARC.score)+' м':String(ARC.score);
    var right=g==='slalom'?'ворота '+(ARC.passed||0)+'/'+ARC.gates+(ARC.missed?'  +'+ARC.missed*3+' с':''):g==='bombs'?'волна '+ARC.wave:g==='race'?Math.round((ARC.v||0)*100)+' км/ч  бензин':'♥'.repeat(Math.max(0,ARC.lives));
    c.fillText(left,10*dpr,0.07*H); c.textAlign='right'; c.fillText(right,W-10*dpr,0.07*H); }
  c.textAlign='center'; c.fillStyle='#8A9B96'; c.font=Math.round(11*dpr)+'px "IBM Plex Mono",monospace';
  c.fillText(ARC.dist===null||ARC.dist===undefined?'ладони не слышно':(ARC.present?'':'(нет ладони) ')+'ладонь '+(ARC.dist/10).toFixed(1).replace('.',',')+' см',W/2,H-6*dpr); }
function arcSave(){ if(!ARC.frames.length) return; var n=ARC.frames.length*N, all=new Float32Array(n); ARC.frames.forEach(function(f,j){ all.set(f,j*N); });
  var pk=0; for(var i=0;i<n;i++){ var a=Math.abs(all[i]); if(a>pk) pk=a; }
  var meta={v:1,kind:'arc-play',game:ARC.game,port:ARC.port,autocenter:true,tune:ARC.T?{field:+ARC.T.field.toFixed(2),asym:Tune.ASYM,shifts:ARC.shifts}:null,margin:ARC_M,
    fs:fs,N:N,kLo:kLo,kHi:kHi,probe:{bins:'all',channel:chan,phase:'pi*q^2/M',peak:0.9,gain:PROBE_G,snr_db:PROBE_SNR,f_lo:bandLo(),loop:true},
    cal:DSP2.info().cal||PHYS_CAL,marks:ARC.marks,log:ARC.log,score:ARC.score,summary:arcSummary(),samples:n,gaps:ARC.gaps,peak:pk,
    orientation:{angle:(screen.orientation&&screen.orientation.angle!==undefined)?screen.orientation.angle:(window.orientation||0),w:window.innerWidth,h:window.innerHeight},
    units:'log: [frame, palm share of the height by Tune.fracOf (0 low … 1 high), player y (0 top … 1 bottom, eased 0.49 per 60 Hz frame), palm seen] or [frame, event]',
    ua:navigator.userAgent,date:new Date().toISOString()};
  var b=wav(all,meta), d=new Date(), z=function(x){ return (x<10?'0':'')+x; };
  var name='sonararc_'+ARC_GAMES[ARC.game].file+'_'+d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'_'+z(d.getHours())+z(d.getMinutes())+'.wav'; ARC.blob=b; ARC.fname=name;
  if(navigator.canShare){ try{ var fl=new File([b],name,{type:'audio/wav'}); if(navigator.canShare({files:[fl]})){ navigator.share({files:[fl],title:name}).catch(function(){}); return; } }catch(e){} }
  var a2=document.createElement('a'); a2.href=URL.createObjectURL(b); a2.download=name; document.body.appendChild(a2); a2.click(); setTimeout(function(){ a2.remove(); },1000); }
function arcHalt(){ cancelAnimationFrame(ARC.raf); ARC.on=false; ARC.phase=''; mode=null; setProbe('off'); }
['slalom','bombs','cave','race'].forEach(function(g){ el('go_'+g).addEventListener('click',function(){ boot().then(function(){ lastRec='arc'; arcGame=g; viaOrient('arcIntro'); }).catch(fail); }); });
el('acGo').addEventListener('click',function(){ arcPlay(); });
el('acBack').addEventListener('click',function(){ show('home'); });
el('acAgain').addEventListener('click',function(){ arcPlay(); });
el('acSave').addEventListener('click',function(){ arcSave(); });
el('acSet').addEventListener('click',function(){ arcHalt(); arcOpen(ARC.game||arcGame); });
el('acStop').addEventListener('click',function(){ if(ARC.phase==='play'){ ARC.over=true; return; } arcHalt(); arcText('Остановлено',''); arcButtons(true); });
el('acHome').addEventListener('click',function(){ arcHalt(); show('home'); });
el('goProbes').addEventListener('click',function(){ show('probes'); });
el('probesBack').addEventListener('click',function(){ show('home'); });
