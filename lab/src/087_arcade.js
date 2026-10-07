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
    unit:'метры'},
  follow:{title:'Ладонь по линейке',file:'follow',
    intro:'Запись для настройки: точно ли сонар повторяет ладонь — медленно и быстро. Поставь линейку стоймя у разъёма телефона (ноль — на столе). Ладонь держи как в игре. Около минуты: сначала держишь ладонь на 5, 10 и 15 см, потом водишь её между 5 и 15 под стук — медленно, быстрее, быстро, потом резкие рывки до 15 и обратно. Кружок на экране показывает, где ладонь должна быть. В конце нажми «Сохранить запись» и пришли мне.',
    unit:''},
  juggle:{title:'Жонглёр',file:'juggle',
    intro:'Подкинь мяч как можно выше — но не задень потолок. Внизу — твоя ладонь-платформа, чуть вогнутая чашей: мяч от неё отскакивает и гуляет влево-вправо. Резче взмах — выше мяч. Пунктир — твой рекорд высоты, белая черта — последний бросок. Задел потолок — бросок не в счёт. Справа вверху — переключатели: глубина чаши, бортики, торможение вбок; меняй прямо в игре. Выход — «Стоп».',
    unit:'очки'}
};
var arcGame='slalom';
function arcText(a,b){ el('acSay').textContent=a; el('acSub').textContent=b||''; }
function arcButtons(v){ el('acBtns').classList.toggle('hidden',!v); }
function arcMark(k){ ARC.marks[k]=ARC.frames.length*N; }
function arcEv(k){ ARC.log.push([ARC.frames.length,k]); }
function arcFrame(f,gap,r){ if(!ARC.on) return; if(ARC.frames.length<ARC_MAX){ if(gap) ARC.gaps++; ARC.frames.push(f); }
  if(r){ ARC.present=r.present; if(r.present) ARC.dist=r.height; if(ARC.game==='juggle'||ARC.game==='follow') mixFrame(r); } }
/* 1.57f — «смесь» для платформы (жонглёр и «по линейке»). Запись Дена «по линейке» 14:49 (iPhone), разбор eval_follow.js, ход 5↔15 см,
   медленный = 100%:   как в игре — 1 с за ход 83%, 0,5 с — 71%, рывки 36%, в покое высота плывёт ~18 мм/с (абсолютная часть сонара
   ходит на 2–3 см и тянет за собой);   фаза по четвертям кадра — 87/85%, рывки 74%;   смесь — 90/86%, рывки 79%, плывёт вдвое меньше.
   Смесь: медленное — от высоты как в игре, сглаженной за MIX_TAU с; быстрое — только от фазы (её отклонение от своей такой же
   сглаженной). Никаких добавок, упреждений и фильтров сверх этого — платформа там, куда сонар видит ладонь. */
var MIX_TAU=3;
function mixFrame(r){ if(!r.present||r.height===null||!(ARC.phase==='play'||ARC.phase==='count')){ return; } var F=r.fast*(DSP2.info().cal.s||1), a=1-Math.exp(-N/(MIX_TAU*fs));
  if(ARC.mxH===undefined||ARC.mxH===null){ ARC.mxH=r.height; ARC.mxF=F; }
  ARC.mxH+=a*(r.height-ARC.mxH); ARC.mxF+=a*(F-ARC.mxF); ARC.mix=ARC.mxH+(F-ARC.mxF); }
function arcOpen(g){ arcGame=g; var G=ARC_GAMES[g]; el('acTitle').textContent=G.title+' — прототип'; el('acIntro').textContent=G.intro;
  var b=ARC.best[g]; el('acBest').textContent=b===undefined?'':'Лучший результат: '+arcFmt(g,b); show('arcIntro'); }
function arcFmt(g,v){ return g==='slalom'?v.toFixed(1).replace('.',',')+' с':(g==='cave'||g==='race')?Math.round(v)+' м':String(v); }

/* ── общая часть: подготовка как в Sonaroids ── */
function arcPlay(){
  show('arcPlay'); arcButtons(false); cancelAnimationFrame(ARC.raf); el('jgCtl').classList.toggle('hidden',arcGame!=='juggle'); jgCtlLabels();
  ARC={on:false,frames:[],gaps:0,marks:{},log:[],phase:'prep',raf:0,best:ARC.best||{},present:false,dist:null,T:null,shifts:[],game:arcGame,
       frac:null,py:0.5,W:null,t:0,lives:3,score:0,over:false,port:orientSide()||'right'};
  arcInit(); arcText('Готовлюсь','Убери руку. Подбираю громкость зонда.'); mode=null; arcDraw();
  pickChannel().then(function(){ return autoLevel(); }).then(function(L){
    if(L.snr<30){ setProbe('off'); arcText('Зонда почти не слышно',NOPROBE); arcButtons(true); return null; }
    var cal0=dspBand(DSP2); DSP2.init(fs,(typeof linkPar==='function'?linkPar():'all')); DSP2.setCal(cal0); DSP2.set('autocenter',1); if(arcGame==='juggle'||arcGame==='follow') DSP2.set('quarter',1); mode='arc'; ARC.on=true; arcMark('empty'); ARC.phase='empty';
    arcText('Убери руку','Слушаю пустую комнату.'); return rpWait(DSP2); }).then(function(st){
    if(!st) return;
    if(st==='noprobe'){ setProbe('off'); mode=null; ARC.on=false; arcText('Зонда не слышно',NOPROBE); arcButtons(true); return; }
    return sleep(600).then(function(){ arcMark('wave'); ARC.phase='wave'; ARC.T=Tune.create(100,true);
      arcText('Помаши ладонью','К разъёму и от него, 5–15 см — '+(arcGame==='slalom'?'лыжник':arcGame==='bombs'?'вёдра':arcGame==='race'?'машина':arcGame==='juggle'?'ладонь внизу':arcGame==='follow'?'метка':'корабль')+' ходит за ней. Секунд пять.');
      ARC.last=performance.now(); ARC.raf=requestAnimationFrame(arcLive); return new Promise(function(r){ ARC.onCaught=r; }); }).then(function(){
      arcMark('count'); ARC.phase='count'; arcText('Поймал','Ладонь дальше от разъёма — выше.');
      return sleep(1500).then(function(){ arcText('3',''); return sleep(1000); }).then(function(){ arcText('2',''); return sleep(1000); }).then(function(){ arcText('1',''); return sleep(1000); }); }).then(function(){
      cancelAnimationFrame(ARC.raf); arcMark('play'); ARC.phase='play'; arcText('',''); ARC.last=performance.now(); ARC.raf=requestAnimationFrame(arcLoop); });
  }).catch(function(e){ arcText('Не вышло',(e&&e.message)||String(e)); arcButtons(true); });
}
/* игрок: доля высоты по подстройке → y (0 — верх экрана), догоняет на 0,49 за кадр 60 Гц — как корабль Sonaroids */
function arcMove(dt){ if(ARC.present&&ARC.dist!==null&&ARC.T){ ARC.frac=Tune.fracOf(ARC.T,ARC.dist); }
  if(ARC.game==='juggle'){ jgPad(dt); return; }
  if(ARC.frac!==null){ var ty=ARC.game==='juggle'?JG_PAD_LO-ARC.frac*JG_PAD_H:1-(ARC_M+ARC.frac*(1-2*ARC_M)); ARC.py+=(ty-ARC.py)*(1-Math.pow(0.51,dt*60)); } }
function arcLive(now){ if(ARC.phase!=='wave'&&ARC.phase!=='count') return; var dt=Math.min(0.033,(now-ARC.last)/1000); ARC.last=now;
  if(ARC.phase==='wave'&&ARC.T){ Tune.step(ARC.T,dt,{present:ARC.present,height:ARC.dist},true,function(d){ DSP2.shift(d); ARC.shifts.push([ARC.frames.length,+d.toFixed(2)]); if(ARC.dist!==null) ARC.dist+=d; });
    if(ARC.T.ok&&ARC.onCaught){ var f=ARC.onCaught; ARC.onCaught=null; f(); } }
  arcMove(dt); arcDraw(); ARC.raf=requestAnimationFrame(arcLive); }
function arcLoop(now){
  if(ARC.phase!=='play') return;
  var dt=Math.min(0.033,(now-ARC.last)/1000); ARC.last=now; ARC.t+=dt; arcMove(dt);
  var cv=el('acC'); ARC.ar=(cv.width||800)/(cv.height||400);
  ARC_STEP[ARC.game](dt);
  ARC.log.push([ARC.frames.length,ARC.frac===null?null:+ARC.frac.toFixed(4),ARC.game==='follow'?(ARC.fwCm===null?null:+ARC.fwCm.toFixed(2)):+ARC.py.toFixed(4),ARC.present?1:0,ARC.mix===undefined||ARC.mix===null?null:+ARC.mix.toFixed(1)]);
  arcDraw();
  if(ARC.over||(ARC.frames.length>=ARC_MAX&&ARC.game!=='juggle')){ ARC.phase='over'; arcMark('over'); ARC.on=false; mode=null; setProbe('off');
    var g=ARC.game, res=g==='slalom'?ARC.time:ARC.score, b=ARC.best[g], better=g==='slalom'?(ARC.done&&(b===undefined||res<b)):(b===undefined||res>b);
    if(better&&(g!=='slalom'||ARC.done)) ARC.best[g]=res;
    arcText(g==='slalom'&&!ARC.done?'Стоп':'Финиш',arcSummary()+(ARC.best[g]!==undefined?' · лучший '+arcFmt(g,ARC.best[g]):'')); arcButtons(true); return; }
  ARC.raf=requestAnimationFrame(arcLoop);
}
function arcSummary(){ var g=ARC.game;
  if(g==='slalom') return 'ворот '+ARC.passed+' из '+ARC.gates+' · время '+arcFmt(g,ARC.time||ARC.t)+' (штраф '+(ARC.missed*3)+' с)';
  if(g==='race') return 'проехал '+Math.round(ARC.score)+' м · канистр '+ARC.cans+' · аварий '+ARC.crashes+' · на траве '+ARC.grassT.toFixed(0)+' с';
  if(g==='bombs') return 'поймано '+ARC.caught+' · очки '+ARC.score+' · волна '+ARC.wave;
  if(g==='follow') return 'программа пройдена за '+Math.round(ARC.t)+' с — сохрани запись и пришли';
  if(g==='juggle'&&JG_PRACTICE) return 'рекорд '+(ARC.bestH?Math.round(ARC.bestH*100)+'%':'—')+' · бросков '+ARC.tosses+' · в потолок '+ARC.ceils+' · мимо платформы '+(ARC.falls||0);
  if(g==='juggle') return 'очки '+ARC.score+' · звёзд '+ARC.nst+' · лучшая серия '+ARC.comboMax+' · подбросов '+ARC.tosses+' · мячей было '+ARC.nb+' · сгорело '+ARC.burns+' · в потолок '+ARC.ceils+' · самый сильный бросок '+ARC.vmax.toFixed(1).replace('.',',')+(ARC.recFull?' · запись — первые 150 с':'');
  return 'пролетел '+Math.round(ARC.score)+' м · ударов '+ARC.hits; }

/* ── игры: координаты — в высотах экрана (x от 0 до ar, y от 0 сверху до 1) ── */
var ARC_PX=0.32;                                           // где игрок по горизонтали
function arcInit(){ var g=ARC.game; ARC.py=0.5; ARC.score=0; ARC.lives=3; ARC.t=0;
  if(g==='slalom'){ ARC.gates=40; ARC.passed=0; ARC.missed=0; ARC.made=0; ARC.flags=[]; ARC.v=0.42; ARC.nextX=1.4; ARC.side=1; ARC.time=null; ARC.done=false; ARC.trail=[]; }
  if(g==='bombs'){ ARC.buckets=3; ARC.caught=0; ARC.wave=1; ARC.left=10; ARC.bombs=[]; ARC.by=0.5; ARC.bv=0; ARC.btgt=0.5; ARC.drop=0.6; ARC.pause=0; ARC.boom=0; }
  if(g==='race'){ ARC.cols=[]; ARC.cx=0; ARC.cc=0.5; ARC.ctg=0.5; ARC.rw=0.56; ARC.v=0.3; ARC.fuel=100; ARC.cars=[]; ARC.fcans=[]; ARC.nextCar=1.2; ARC.nextCan=2.5;
    ARC.cans=0; ARC.crashes=0; ARC.grassT=0; ARC.onGrass=false; ARC.inv=0; ARC.flash=0; ARC.dash=0; }
  if(g==='cave'){ ARC.cols=[]; ARC.cx=0; ARC.cc=0.5; ARC.cg=0.62; ARC.ctg=0.5; ARC.v=0.45; ARC.hits=0; ARC.inv=0; ARC.flash=0; }
  if(g==='follow'){ ARC.fw=fwScript(); ARC.fwI=-1; ARC.fwBeat=0; ARC.fwCm=5; }
  if(g==='juggle'){ ARC.py=JG_PAD_LO-0.5*JG_PAD_H; ARC.padPrev=null; ARC.balls=[jgBall(0,ARC.py-JG_R,true)]; ARC.nb=1; ARC.stars=[]; ARC.nst=0; ARC.combo=0; ARC.comboMax=0;
    ARC.tosses=0; ARC.burns=0; ARC.ceils=0; ARC.falls=0; ARC.bestH=0; ARC.lastH=null; ARC.lastTouch=false; ARC.vmax=0; ARC.vlast=0; ARC.respawn=0; ARC.say=0; ARC.flash=0; ARC.pf=[]; ARC.recFull=false; }
}
/* ── «Ладонь по линейке» (1.57e; Ден 14:27 после 1.57d: «стало не сильно лучше, а может даже и хуже.. давай начнем с нуля.. тесты линейка
   запись и пр.. задача 1: научить платформу точно следовать движениям ладони — медленным и быстрым.. без дерганий и пр.. когда это
   сделаем — добавим мяч»). Один телефон, линейка у разъёма. Программа по времени партии: удержания на 5/10/15 см (дрожь в покое и
   «где эта высота» у сонара), ходы 5↔15 под стук — по 2, 1 и 0,5 с на ход (сжимается ли ход на скорости, запаздывание), рывки до 15
   и обратно (резкие движения), замри на 10. Журнал по кадрам экрана: [кадр, доля по подстройке, где должна быть ладонь (см), видна];
   события: step:номер:вид:… и beat:цель_см. Разбор — tools/eval_follow.js */
/* 1.58a (Ден 15:46: «за командами на экране я часто не успевал хоть делал неск раз.. ты постоянно не учитываешь что мы люди
   существа медленные»): перед каждым шагом — 3 с «Дальше: …» на месте (ладонь держит, где была), удержания по 5 с, ходы по 3, 1,5
   и 0,8 с (были 2, 1, 0,5), рывки раз в 2,5 с (было 1,5) */
function fwScript(){ var S=[], t=0, at=5; function add(o){ o.t0=t; t+=o.d; o.t1=t; S.push(o); }
  function next(say,cm){ add({k:'hold',cm:at,d:3,say:'Дальше: '+say,prep:1}); if(cm!==undefined) at=cm; }
  next('держи ладонь на 5 см',5); add({k:'hold',cm:5,d:5,say:'Держи на 5 см'});
  next('на 10 см',10); add({k:'hold',cm:10,d:5,say:'Держи на 10 см'});
  next('на 15 см',15); add({k:'hold',cm:15,d:5,say:'Держи на 15 см'});
  [[3,4,'медленно 5 ↔ 15 под стук'],[1.5,6,'быстрее 5 ↔ 15'],[0.8,8,'быстро 5 ↔ 15']].forEach(function(m){ next('опусти на 5, потом '+m[2],5); add({k:'hold',cm:5,d:2,say:'На 5 — сейчас начнём'}); add({k:'move',per:m[0],n:m[1],d:m[0]*m[1],say:m[2][0].toUpperCase()+m[2].slice(1)}); at=5; });
  next('рывок до 15 и сразу вниз — на каждый стук',5); add({k:'flick',n:5,gap:2.5,d:12.5,say:'Рывок на стук'});
  next('замри на 10',10); add({k:'hold',cm:10,d:4,say:'Держи на 10 см'});
  add({k:'free',d:15,say:'Свободно: води ладонью как хочешь — смотри, как идёт метка'}); return S; }
function fwCmAt(S,t){ for(var i=0;i<S.length;i++){ var s=S[i]; if(t<s.t1){ var u=t-s.t0;
      if(s.k==='hold') return s.cm; if(s.k==='free') return null;
      if(s.k==='move'){ var leg=Math.floor(u/s.per), a=(u-leg*s.per)/s.per, from=leg%2?15:5; return from+(from===5?10:-10)*a; }
      if(s.k==='flick'){ var q=u%s.gap; return q<0.2?5+10*q/0.2:q<0.4?15-10*(q-0.2)/0.2:5; } } }
  return 10; }
/* ── жонглёр (7.10, 1.57a; Ден выбрал из идей «для одного»: «жонглёр эскизы варианты» → «да, давай посмотрим») ──
   Ладонь — полоса внизу экрана (доля хода ладони → 0,94…0,54 высоты), мяч отскакивает от неё как от ракетки бесконечной массы:
   при ударе относительная скорость отражается с коэффициентом JG_E, медленное касание — мяч лежит и едет вместе с ладонью; когда
   ладонь тормозит быстрее, чем падает мяч, он отрывается сам — так получается бросок. Держать высоту не нужно: сила броска — это
   скорость ладони в момент отрыва. Мяч горячий: на ладони (и в 3 % над ней) копится жар, больше JG_HOT с — сгорел (минус жизнь).
   Звёзды — в колонке каждого мяча, на высоте 0,12…0,50. Координаты — в высотах экрана, y сверху вниз.
   1.57b (первая партия Дена 13:14, iPhone: 39 звёзд за 34 с, три мяча, три мяча лопнули о потолок; «что-то в этом есть.. но дорабатывать
   не мало» → «все кроме 5 пункта сделай.. и пусть количество мячей растет не так быстро.. интереснее сначала одним мячом научиться
   управляться.. потом двумя.. третьи потом»):
   — звёзды пачками (новая вставала на пути летящего мяча — 4–6 за долю секунды): новая появляется через 0,6 с и не ближе 0,2 к мячу
     и не на его пути вверх;
   — три мяча летали как один (лежат на ладони вместе — один взмах бросает всех): мячи разного веса — второй лёгкий (тяжесть ×0,72,
     от того же взмаха выше и дольше), третий тяжёлый (×1,35) — и расходятся сами;
   — потолок больше не лопает мяч: отбивает вниз и сжигает серию; жизнь теряется только за сгоревший мяч;
   — очки: звезда даёт столько, какая она по счёту в серии (до 5);
   — звуки: бросок, приземление, звезда, потолок, сгорел (через фильтры лабы, мимо полосы зонда);
   — второй мяч с 15 звёзд, третий с 40 (было 6 и 15); запись звука кончается на 150 с, игра — нет. */
/* сила: быстрая часть сонара однозначна только до ~40 см/с (поворот фазы за кадр, см. 'unwrap' в 02_dsp.js; синтетика: без доворота
   броски ломаются с ~35 см/с, с ним — держатся до ~50), поэтому вся игра — в рывках 15–40 см/с: ход ладони 0,40 высоты экрана на весь путь,
   тяжесть 2,2 — до верхней звезды хватает ~35 см/с. Партия Дена 13:14: рука на взмахе 13 см/с в среднем, самая резкая 30, ладонь видна 99,9% */
/* 1.57c (Ден 13:38: «платформа сильно запаздывает за ладонью и вообще на резкие движения не реагирует.. подожди с игрой очками и
   прочим.. учимся адекватно и естественно управлять прыгскоком одним мячом»). Запись 13:38: поворот фазы на рывках 2–2,6 рад за кадр
   (у предела, но без перехлёста), рука — до ~25–30 см/с; ладонь видна. Значит, дело не в потере ладони, а в том, как ладонь
   переводится в платформу: весь ход руки (≈10 см) давал 0,40 экрана, и платформа ещё догоняла цель (0,49 за кадр 60 Гц).
   Теперь: (1) без догоняния — платформа там, где ладонь; (2) рывок крупнее: к ходу 0,40 добавлено 0,55 экрана на весь ход от
   быстрой части движения (отклонение от среднего за JG_HP с) — короткий взмах на 3 см сдвигает платформу на ~0,3 экрана, а в покое
   она сама возвращается к прежнему ходу; (3) упреждение JG_LEAD — платформа ставится туда, где ладонь будет через 30 мс (задержка
   микрофона и экрана); (4) DSP 'half' — поворот фазы по полукадрам, предел скорости ~80 см/с вместо ~40; (5) тяжесть 4,2 — от
   более быстрой платформы мяч не улетает в потолок; (6) учебный режим: один мяч, без звёзд, жизней, очков и жара. */
/* 1.57d (Ден 14:07: «уже лучше.. но платформа постоянно подергивается и дрожит»). В 1.57c добавка к ходу шла от любого отклонения
   ладони от её среднего, а упреждение — от сырой скорости: дрожь руки и сонара (~1–2 мм) тоже множилась. Прогон его записи 14:07
   через разные фильтры (дрожь — отклонение платформы от её среднего за 0,15 с, когда ладонь почти стоит; взмах — ход платформы за
   рывок; запаздывание — по скорости):  1.57b — дрожь 3,0‰ экрана, взмах 0,08, запаздывание 21 мс;  1.57c — 12,0‰, 0,21, −32 мс;
   теперь — 7,1‰, 0,21, 0 мс. Как: (1) ладонь сглаживается фильтром «one euro» — в покое сильно (срез 1 Гц), на ходу почти нет
   (срез растёт со скоростью, β 8); (2) добавка к ходу — как «ускорение» у мыши: копится только из быстрых приращений (вес 0 при
   скорости до 0,6 хода в секунду ≈ 6 см/с, 1 — от 2 ≈ 20 см/с), 0,55 экрана на ход, и тает за 0,8 с; (3) упреждение 30 мс — тоже
   только на ходу. */
var JG_HP=0.8, JG_HPG=0.55, JG_LEAD=0.03, JG_PRACTICE=true, JG_OE={mc:1.0,beta:8,dc:1.0}, JG_W={lo:0.6,hi:2.0};
function jgRawFrac(T,h){ var FL=2*T.field/(1+Tune.ASYM), FU=2*Tune.ASYM*T.field/(1+Tune.ASYM); return h<100?0.5+(h-100)/FL:0.5+(h-100)/FU; }
function jgPad(dt){ var hh=ARC.mix!==undefined&&ARC.mix!==null?ARC.mix:ARC.dist; if(!ARC.T||hh===null||hh===undefined) return;   // 1.57f: без добавок — весь ход ладони = 0,6 экрана
  ARC.py=Math.max(0.3,Math.min(0.97,JG_PAD_LO-jgRawFrac(ARC.T,hh)*JG_PAD_H)); }
var JG_PAD_LO=0.94, JG_PAD_H=0.60, JG_R=0.032, JG_G=4.2, JG_E=0.5, JG_STICK=0.25, JG_HOT=1.2, JG_SLOTS=[0.5,0.36,0.64], JG_N2=15, JG_N3=40, JG_TOP=0.03;
var JG_KIND=[{g:1,r:1,col:'#ffd166'},{g:0.72,r:1.15,col:'#5ad1c0'},{g:1.35,r:0.85,col:'#ff8fa8'}];   // обычный, лёгкий, тяжёлый
/* 1.58b (Ден 16:00–16:03: «добавь платформе небольшую изогнутость, чтобы мячик прыгал влево-вправо по экрану.. но надо как-то решить
   вопрос с тем, чтобы он постоянно не улетал за платформу» → из предложенного: чаша, бортики, торможение вбок — «все 3 пункта по
   выключателю/ползунку на каждый, чтоб я попробовал и микс и что-то одно»; и про саму игру: «интересны не звёзды — а подкинуть мяч как
   можно выше, но не касаясь потолка.. лежим и подкидываем мячик к потолку»).
   Платформа — чаша: поверхность y = py − D·u², u — от −1 до 1 по ширине (края выше середины); удар отражает скорость мяча относительно
   платформы от наклона поверхности в точке касания (коэффициент JG_E по нормали), медленное касание — мяч скользит по чаше к середине.
   Бортики — у концов платформы, отбивают мяч назад с 60% скорости. Торможение вбок — боковая скорость гаснет за τ с. Упал мимо
   платформы — мяч снова на ней через 0,9 с. Высота броска — самая верхняя точка полёта от пола (низ экрана) до потолка, в %; задел
   потолок — бросок не в счёт. */
var JG_HW=0.30, JG_BOWLS=[0,0.02,0.04,0.07], JG_DAMPS=[0,2,0.7], JG_SET={bowl:2,wall:1,damp:1};
try{ var jgs=JSON.parse(localStorage.getItem('sonar_jg_set')||'null'); if(jgs) JG_SET={bowl:+jgs.bowl||0,wall:jgs.wall?1:0,damp:+jgs.damp||0}; }catch(e){}
function jgSetSave(){ try{ localStorage.setItem('sonar_jg_set',JSON.stringify(JG_SET)); }catch(e){} jgCtlLabels(); if(ARC&&ARC.log) arcEv('set:'+JSON.stringify(JG_SET)); }
function jgCtlLabels(){ var b=el('jgBowl'); if(!b) return; b.textContent='Чаша: '+['нет','мелкая','средняя','глубокая'][JG_SET.bowl]; el('jgWall').textContent='Бортики: '+(JG_SET.wall?'да':'нет'); el('jgDamp').textContent='Тормоз вбок: '+['нет','слабый','сильный'][JG_SET.damp]; }
function jgBall(slot,y,on){ var K=JG_KIND[slot]; return {slot:slot,x:null,vx:0,y:y,vy:0,heat:0,on:!!on,apex:null,peak:null,touched:false,g:JG_G*K.g,r:JG_R*K.r}; }
function jgStar(b){ var k=Math.min(1,ARC.nst/60), y=0.3, i;
  for(i=0;i<20;i++){ y=0.12+0.38*Math.random(); if(Math.abs(y-b.y)<0.2) continue; if(b.apex!==null&&y>b.apex-0.06&&y<b.y) continue; break; }
  ARC.stars.push({slot:b.slot,y:y,r:0.075-0.035*k,t:0,wait:0.6}); }
function jgLose(b){ ARC.lives--; ARC.flash=0.35; ARC.combo=0; ARC.burns++; arcEv('burn:'+b.slot); sfx('jburn');
  ARC.balls.splice(ARC.balls.indexOf(b),1); if(ARC.lives<=0){ ARC.over=true; return; } if(ARC.respawn<=0) ARC.respawn=0.9; }
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
  follow:function(dt){ var S=ARC.fw, t=ARC.t, i=0; while(i<S.length&&t>=S[i].t1) i++;
    if(i>=S.length){ arcEv('done'); ARC.over=true; return; }
    if(i!==ARC.fwI){ ARC.fwI=i; ARC.fwBeat=0; var s0=S[i]; arcEv('step:'+i+':'+(s0.prep?'prep':s0.k)+':'+(s0.k==='hold'?s0.cm:s0.k==='move'?s0.per:s0.k==='flick'?s0.gap:0)); arcText(s0.say,''); if(s0.prep) sfx('level'); }
    var s=S[i], u=t-s.t0;
    if(s.k==='move'||s.k==='flick'){ var per=s.k==='move'?s.per:s.gap, nb=Math.floor(u/per); if(nb>=ARC.fwBeat&&nb<s.n){ ARC.fwBeat=nb+1; arcEv('beat:'+(s.k==='move'?(nb%2?5:15):15)); sfx('jtoss',1); } }
    ARC.fwCm=fwCmAt(S,t); var left=Math.max(0,s.t1-t); el('acSub').textContent=left>0.5?Math.ceil(left)+' с':''; },
  juggle:function(dt){ var pad=ARC.py, vr=ARC.padPrev===null?0:(pad-ARC.padPrev)/Math.max(dt,1e-3); ARC.padPrev=pad;
    /* скорость платформы — сглаженная (кадры сонара 94 в секунду, экрана 60: положение идёт ступеньками, и сырая скорость давала броски
       до 9 высот экрана в секунду) и не больше 4 */
    ARC.vpS=(ARC.vpS||0)+(Math.max(-4,Math.min(4,vr))-(ARC.vpS||0))*0.45; var vp=ARC.vpS;
    if(ARC.flash>0) ARC.flash-=dt; if(ARC.say>0){ ARC.say-=dt; if(ARC.say<=0) arcText('',''); }
    if(!ARC.recFull&&ARC.frames.length>=ARC_MAX){ ARC.recFull=true; arcEv('rec-full'); }
    var want=JG_PRACTICE?1:ARC.nst>=JG_N3?3:ARC.nst>=JG_N2?2:1;
    if(want>ARC.nb){ ARC.nb=want; arcEv('balls:'+want); arcText(want===2?'Второй мяч — лёгкий':'Третий мяч — тяжёлый',want===2?'от того же взмаха летит выше':'падает быстрее'); ARC.say=2.5; sfx('level');
      var used=ARC.balls.map(function(b){ return b.slot; }), fs0=[0,1,2].filter(function(i){ return used.indexOf(i)<0; })[0]; ARC.balls.push(jgBall(fs0,0.08,false)); }
    if(ARC.balls.length<ARC.nb&&!ARC.over){ if(ARC.respawn<=0) ARC.respawn=0.9; ARC.respawn-=dt;   // сгоревший мяч — снова на ладони, по одному
      if(ARC.respawn<=0){ var u=ARC.balls.map(function(b){ return b.slot; }), sl=[0,1,2].filter(function(i){ return u.indexOf(i)<0; })[0];
        var nb=jgBall(sl,pad-JG_R*JG_KIND[sl].r,true); nb.vy=Math.min(0,vp); nb.x=ARC.ar*(0.5+0.15*JG_HW); ARC.balls.push(nb); arcEv('ball:'+sl); } }
    var xc=ARC.ar*0.5, hw=ARC.ar*JG_HW, D=JG_BOWLS[JG_SET.bowl]||0, tau=JG_DAMPS[JG_SET.damp]||0;
    ARC.balls.slice().forEach(function(b){ var was=b.on; if(b.x===null) b.x=JG_PRACTICE?xc+0.15*hw:ARC.ar*JG_SLOTS[b.slot];
      b.vy+=b.g*dt; b.x+=b.vx*dt; b.y+=b.vy*dt; b.on=false; if(tau) b.vx*=Math.exp(-dt/tau);
      if(JG_SET.wall){ var wl=xc-hw-0.02, wr=xc+hw+0.02; if(b.x-b.r<wl&&b.vx<0){ b.x=wl+b.r; b.vx=-b.vx*0.6; arcEv('wall'); if(Math.abs(b.vx)>0.15) sfx('jland'); } else if(b.x+b.r>wr&&b.vx>0){ b.x=wr-b.r; b.vx=-b.vx*0.6; arcEv('wall'); if(Math.abs(b.vx)>0.15) sfx('jland'); } }
      var u=(b.x-xc)/hw, top=pad-D*u*u-b.r;
      if(Math.abs(u)<=1&&b.y>top&&b.y<top+0.12){ var sl=-2*D*u/hw, nl=Math.sqrt(sl*sl+1), nx=sl/nl, ny=-1/nl, rx=b.vx, ry=b.vy-vp, vn=rx*nx+ry*ny; b.y=top;
        if(vn<0){ if(-vn>JG_STICK){ rx-=(1+JG_E)*vn*nx; ry-=(1+JG_E)*vn*ny; arcEv('bounce:'+(-vn).toFixed(2)); if(-vn>0.5) sfx('jland'); } else { rx-=vn*nx; ry-=vn*ny; } }
        b.vx=rx; b.vy=ry+vp; b.on=true; }
      if(b.y>1.1){ arcEv('fall:'+b.x.toFixed(2)); ARC.falls=(ARC.falls||0)+1; ARC.flash=0.25; sfx('jburn'); ARC.balls.splice(ARC.balls.indexOf(b),1); ARC.say=1.2; arcText('Мимо!',''); return; }
      if(was&&!b.on&&b.vy<-0.5){ var v=-b.vy; ARC.tosses++; ARC.vlast=v; if(v>ARC.vmax) ARC.vmax=v; b.apex=b.y-v*v/(2*b.g); if(D>0) b.vx+=(Math.random()-0.5)*0.25*Math.min(1,v/1.5);   /* с чашей — броски чуть неровные (как у живой руки): иначе мяч из середины так и ходил бы строго вверх-вниз */
        b.peak=b.y; b.touched=false; arcEv('toss:'+v.toFixed(2)+':'+b.apex.toFixed(3)); sfx('jtoss',v); }
      if(b.peak!==null&&b.vy<0) b.peak=Math.min(b.peak,b.y);
      if(b.peak!==null&&b.vy>=0&&!b.on){ var hp=Math.max(0,Math.min(1,(1-b.peak)/(1-JG_TOP)));   // верхняя точка пройдена
        if(b.touched){ ARC.lastH=null; ARC.lastTouch=true; } else { ARC.lastH=hp; ARC.lastTouch=false; if(!(ARC.bestH>=hp)){ ARC.bestH=hp; if(JG_PRACTICE) ARC.score=Math.round(hp*100); if(hp>0.5&&JG_PRACTICE){ ARC.say=1.2; arcText('Рекорд: '+Math.round(hp*100)+'%',''); sfx('jstar',3); } } arcEv('apex:'+hp.toFixed(3)); }
        b.peak=null; }
      if(b.vy>=0) b.apex=null;
      if(b.on||b.y>top-0.03) b.heat+=dt; else b.heat=Math.max(0,b.heat-2*dt);
      if(b.heat>JG_HOT&&!JG_PRACTICE){ jgLose(b); return; }
      if(b.y-b.r<JG_TOP&&b.vy<0){ b.y=JG_TOP+b.r; b.vy=-b.vy*0.35; b.apex=null; b.touched=true; if(JG_PRACTICE){ ARC.say=1.2; arcText('Потолок!',''); } ARC.ceils++; if(ARC.combo) arcEv('combo-lost:'+ARC.combo); ARC.combo=0; ARC.flash=Math.max(ARC.flash,0.12); arcEv('ceil:'+b.slot); sfx('jceil'); }
      ARC.stars.slice().forEach(function(s){ if(s.wait<=0&&s.slot===b.slot&&Math.abs(b.y-s.y)<s.r+b.r*0.5){ ARC.stars.splice(ARC.stars.indexOf(s),1); ARC.nst++; ARC.combo++; if(ARC.combo>ARC.comboMax) ARC.comboMax=ARC.combo;
          var pts=Math.min(5,ARC.combo); ARC.score+=pts; arcEv('star:'+s.y.toFixed(3)+':'+pts); ARC.pf.push({slot:s.slot,y:s.y,t:0.5,pts:pts}); sfx('jstar',ARC.combo); } }); });
    ARC.pf=ARC.pf.filter(function(p){ p.t-=dt; return p.t>0; });
    var sl0=ARC.balls.map(function(b){ return b.slot; }); ARC.stars.forEach(function(s){ s.t+=dt; if(s.wait>0) s.wait-=dt; }); ARC.stars=ARC.stars.filter(function(s){ return s.t<12&&sl0.indexOf(s.slot)>=0; });   // долго не берётся — переедет
    if(!JG_PRACTICE) ARC.balls.forEach(function(b){ if(!ARC.stars.some(function(s){ return s.slot===b.slot; })) jgStar(b); }); },
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
  if(g==='follow'){ c.fillStyle='#0f1530'; c.fillRect(0,0,W,H); var cmY=function(cm){ return Y(0.92-cm/20*0.8); }, rx=W*0.62;
    c.strokeStyle='#5b6aa8'; c.lineWidth=2*dpr; c.beginPath(); c.moveTo(rx,cmY(0)); c.lineTo(rx,cmY(20)); c.stroke();
    c.fillStyle='#8f9cc0'; c.font=Math.round(0.045*H)+'px "IBM Plex Mono",monospace'; c.textAlign='left';
    for(var cm=0;cm<=20;cm++){ var big=cm%5===0; c.fillRect(rx,cmY(cm)-1*dpr,(big?0.05:0.025)*H,2*dpr); if(big) c.fillText(cm+' см',rx+0.07*H,cmY(cm)+0.015*H); }
    if(ARC.fwCm!==null){ var gy=cmY(ARC.fwCm||5); c.strokeStyle='#ffd166'; c.lineWidth=3*dpr; c.beginPath(); c.arc(rx-0.12*H,gy,0.04*H,0,6.283); c.stroke(); }
    var fm=ARC.mix!==undefined&&ARC.mix!==null&&ARC.T?Tune.fracOf(ARC.T,ARC.mix):ARC.frac;
    if(fm!==null&&fm!==undefined){ var my=cmY(5+10*fm); c.fillStyle='#ff8a3d'; c.fillRect(rx-0.32*H,my-0.012*H,0.16*H,0.024*H); } }
  if(g==='juggle'){ var ar2=W/H, sx=function(sl){ return X(ar2*JG_SLOTS[sl]); }, star=function(x,y,r,col){ c.fillStyle=col; c.beginPath(); for(var i=0;i<10;i++){ var a=-Math.PI/2+i*Math.PI/5, rr=i%2?r*0.45:r; c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr); } c.closePath(); c.fill(); };
    c.fillStyle='#0f1530'; c.fillRect(0,0,W,H); c.fillStyle='#3a4373'; c.fillRect(0,0,W,Y(JG_TOP)); c.fillStyle='#4d578f'; for(var k=0;k<W;k+=0.04*H) c.fillRect(k,0,0.012*H,Y(JG_TOP));
    (ARC.stars||[]).forEach(function(s){ c.strokeStyle='rgba(232,238,252,.12)'; c.setLineDash([3*dpr,5*dpr]); c.beginPath(); c.moveTo(sx(s.slot),Y(s.y)); c.lineTo(sx(s.slot),Y(py)); c.stroke(); c.setLineDash([]); c.globalAlpha=s.wait>0?0.25:1; star(sx(s.slot),Y(s.y),Y(s.r)*(s.wait>0?1-s.wait:1),s.t>10&&Math.floor(s.t*8)%2?'#6a6f90':'#ffd166'); c.globalAlpha=1; });
    (ARC.pf||[]).forEach(function(p){ c.globalAlpha=p.t/0.5; star(sx(p.slot),Y(p.y),Y(0.12-0.1*p.t),'#fff3c4'); c.fillStyle='#fff3c4'; c.font=Math.round(0.06*H)+'px "IBM Plex Mono",monospace'; c.textAlign='left'; c.fillText('+'+p.pts,sx(p.slot)+0.07*H,Y(p.y-0.06*(0.5-p.t))); c.globalAlpha=1; });
    var Dd=JG_BOWLS[JG_SET.bowl]||0, xc2=ar2*0.5, hw2=ar2*JG_HW;
    if(JG_PRACTICE&&ARC.bestH>0){ var by=Y(1-ARC.bestH*(1-JG_TOP)); c.strokeStyle='rgba(255,209,102,.55)'; c.setLineDash([6*dpr,6*dpr]); c.lineWidth=2*dpr; c.beginPath(); c.moveTo(0,by); c.lineTo(W,by); c.stroke(); c.setLineDash([]);
      c.fillStyle='rgba(255,209,102,.8)'; c.font=Math.round(0.045*H)+'px "IBM Plex Mono",monospace'; c.textAlign='left'; c.fillText('рекорд '+Math.round(ARC.bestH*100)+'%',8*dpr,by-6*dpr); }
    if(JG_PRACTICE&&ARC.lastH>0){ var ly=Y(1-ARC.lastH*(1-JG_TOP)); c.strokeStyle='rgba(232,238,252,.5)'; c.lineWidth=2*dpr; c.beginPath(); c.moveTo(X(xc2-hw2),ly); c.lineTo(X(xc2+hw2),ly); c.stroke(); }
    c.fillStyle='#ff8a3d'; c.beginPath(); for(var pi=0;pi<=24;pi++){ var uu=-1+pi/12; c.lineTo(X(xc2+uu*hw2),Y(py-Dd*uu*uu)); } for(pi=24;pi>=0;pi--){ var uu2=-1+pi/12; c.lineTo(X(xc2+uu2*hw2),Y(py-Dd*uu2*uu2)+0.03*H); } c.closePath(); c.fill();
    c.fillStyle='rgba(255,138,61,.18)'; c.fillRect(X(xc2-hw2),Y(py)+0.03*H,X(2*hw2),H);
    if(JG_SET.wall){ c.fillStyle='#5b6aa8'; [xc2-hw2-0.02,xc2+hw2+0.02].forEach(function(wx){ c.fillRect(X(wx)-2*dpr,Y(py-Dd-0.25),4*dpr,Y(0.28)); }); }
    var bl=ARC.phase==='play'||ARC.phase==='over'?(ARC.balls||[]):[jgBall(0,py-JG_R,true)], bxOf=function(b){ return b.x===null||b.x===undefined?X(ar2*0.5):X(b.x); };
    bl.forEach(function(b){ var h=Math.min(1,(b.heat||0)/JG_HOT);
      if(b.apex!==null&&b.apex!==undefined){ c.strokeStyle='rgba(255,209,102,.5)'; c.lineWidth=2*dpr; c.beginPath(); c.moveTo(bxOf(b)-0.05*H,Y(b.apex)); c.lineTo(bxOf(b)+0.05*H,Y(b.apex)); c.stroke(); }
      c.fillStyle=JG_KIND[b.slot].col; c.beginPath(); c.arc(bxOf(b),Y(b.y),Y(b.r),0,6.283); c.fill();
      if(h>0.05){ c.strokeStyle='rgba(255,70,40,'+h.toFixed(2)+')'; c.lineWidth=(2+4*h)*dpr; c.beginPath(); c.arc(bxOf(b),Y(b.y),Y(b.r)+3*dpr,0,6.283); c.stroke(); } });
    
    if(ARC.flash>0){ c.fillStyle='rgba(255,90,110,'+(ARC.flash)+')'; c.fillRect(0,0,W,H); } }
  if(ARC.phase!=='play'){ c.fillStyle=ARC.phase==='wave'||ARC.phase==='count'?'rgba(7,10,18,.4)':'rgba(7,10,18,.72)'; c.fillRect(0,0,W,H); }
  c.fillStyle='#E7EDE9'; c.font=Math.round(15*dpr)+'px "IBM Plex Mono",monospace'; c.textAlign='left';
  if(ARC.phase==='play'||ARC.phase==='over'){ var left=g==='slalom'?(ARC.t+3*(ARC.missed||0)).toFixed(1).replace('.',',')+' с':(g==='cave'||g==='race')?Math.round(ARC.score)+' м':String(ARC.score);
    if(g==='follow') left='';
    else if(g==='juggle'&&JG_PRACTICE) left='бросок '+(ARC.lastTouch?'— потолок':ARC.lastH===undefined||ARC.lastH===null?'—':Math.round(ARC.lastH*100)+'%')+'   рекорд '+(ARC.bestH?Math.round(ARC.bestH*100)+'%':'—');
    else if(g==='juggle') left='очки '+ARC.score+(ARC.combo>1?'  серия ×'+Math.min(5,ARC.combo):'')+'   звёзд '+(ARC.nst||0)+(ARC.nb<3?'/'+(ARC.nb<2?JG_N2:JG_N3):'');
    var right=g==='slalom'?'ворота '+(ARC.passed||0)+'/'+ARC.gates+(ARC.missed?'  +'+ARC.missed*3+' с':''):g==='bombs'?'волна '+ARC.wave:g==='race'?Math.round((ARC.v||0)*100)+' км/ч  бензин':'♥'.repeat(Math.max(0,ARC.lives)); if(g==='juggle'&&JG_PRACTICE) right=''; if(g==='follow') right='';
    c.fillText(left,10*dpr,0.07*H); c.textAlign='right'; c.fillText(right,W-10*dpr,0.07*H); }
  c.textAlign='center'; c.fillStyle='#8A9B96'; c.font=Math.round(11*dpr)+'px "IBM Plex Mono",monospace';
  c.fillText(ARC.dist===null||ARC.dist===undefined?'ладони не слышно':(ARC.present?'':'(нет ладони) ')+'ладонь '+(ARC.dist/10).toFixed(1).replace('.',',')+' см',W/2,H-6*dpr); }
function arcSave(){ if(!ARC.frames.length) return; var n=ARC.frames.length*N, all=new Float32Array(n); ARC.frames.forEach(function(f,j){ all.set(f,j*N); });
  var pk=0; for(var i=0;i<n;i++){ var a=Math.abs(all[i]); if(a>pk) pk=a; }
  var meta={v:1,kind:'arc-play',game:ARC.game,port:ARC.port,autocenter:true,unwrap:false,half:false,quarter:ARC.game==='juggle'||ARC.game==='follow',mix_tau:MIX_TAU,unw:DSP2.info().unw,halfN:DSP2.info().half,jg:ARC.game==='juggle'?{pad_lo:JG_PAD_LO,pad_h:JG_PAD_H,hp_s:JG_HP,hp_g:JG_HPG,lead_s:JG_LEAD,g:JG_G,practice:JG_PRACTICE,set:JG_SET,bowls:JG_BOWLS,damps:JG_DAMPS,hw:JG_HW,v:'1.58b'}:null,tune:ARC.T?{field:+ARC.T.field.toFixed(2),asym:Tune.ASYM,shifts:ARC.shifts}:null,margin:ARC_M,
    fs:fs,N:N,kLo:kLo,kHi:kHi,probe:{bins:(typeof linkPar==='function'?linkPar():'all'),channel:chan,phase:'pi*q^2/M',peak:0.9,gain:PROBE_G,snr_db:PROBE_SNR,f_lo:bandLo(),loop:true},
    cal:DSP2.info().cal||PHYS_CAL,marks:ARC.marks,log:ARC.log,score:ARC.score,summary:arcSummary(),samples:n,gaps:ARC.gaps,peak:pk,
    orientation:{angle:(screen.orientation&&screen.orientation.angle!==undefined)?screen.orientation.angle:(window.orientation||0),w:window.innerWidth,h:window.innerHeight},
    units:ARC.game==='follow'?'log: [frame, palm share by Tune.fracOf, where the palm should be (cm on the ruler; null — free), palm seen, mixed height (slow from the height, fast from the phase)] or [frame, event]':'log: [frame, palm share of the height by Tune.fracOf (0 low … 1 high), player y (0 top … 1 bottom, eased 0.49 per 60 Hz frame), palm seen] or [frame, event]',
    ua:navigator.userAgent,date:new Date().toISOString()};
  var b=wav(all,meta), d=new Date(), z=function(x){ return (x<10?'0':'')+x; };
  var name='sonararc_'+ARC_GAMES[ARC.game].file+'_'+d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'_'+z(d.getHours())+z(d.getMinutes())+'.wav'; ARC.blob=b; ARC.fname=name;
  if(labApp(b,name)) return;
  if(navigator.canShare){ try{ var fl=new File([b],name,{type:'audio/wav'}); if(navigator.canShare({files:[fl]})){ navigator.share({files:[fl],title:name}).catch(function(){}); return; } }catch(e){} }
  var a2=document.createElement('a'); a2.href=URL.createObjectURL(b); a2.download=name; document.body.appendChild(a2); a2.click(); setTimeout(function(){ a2.remove(); },1000); }
function arcHalt(){ cancelAnimationFrame(ARC.raf); ARC.on=false; ARC.phase=''; mode=null; setProbe('off'); }
['slalom','bombs','cave','race','juggle','follow'].forEach(function(g){ el('go_'+g).addEventListener('click',function(){ boot().then(function(){ lastRec='arc'; arcGame=g; viaOrient('arcIntro'); }).catch(fail); }); });
el('acGo').addEventListener('click',function(){ arcPlay(); });
['jgBowl','jgWall','jgDamp'].forEach(function(id){ el(id).addEventListener('click',function(){ if(id==='jgBowl') JG_SET.bowl=(JG_SET.bowl+1)%JG_BOWLS.length; if(id==='jgWall') JG_SET.wall=JG_SET.wall?0:1; if(id==='jgDamp') JG_SET.damp=(JG_SET.damp+1)%JG_DAMPS.length; jgSetSave(); }); });
jgCtlLabels();
el('acBack').addEventListener('click',function(){ show('home'); });
el('acAgain').addEventListener('click',function(){ arcPlay(); });
el('acSave').addEventListener('click',function(){ arcSave(); });
el('acSet').addEventListener('click',function(){ arcHalt(); arcOpen(ARC.game||arcGame); });
el('acStop').addEventListener('click',function(){ if(ARC.phase==='play'){ ARC.over=true; return; } arcHalt(); arcText('Остановлено',''); arcButtons(true); });
el('acHome').addEventListener('click',function(){ arcHalt(); show('home'); });
el('goProbes').addEventListener('click',function(){ show('probes'); });
el('probesBack').addEventListener('click',function(){ show('home'); });
