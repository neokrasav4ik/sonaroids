/* ── БЛИЖНЯЯ И ДАЛЬНЯЯ РУКА (с 27.09, 0.39s) ──
   Один микрофон не слышит лево/право (2.7ж, 2.7з: стерео на iPhone в браузере — второй канал пустой), но слышит расстояние. Правило
   вместо направления: одна рука работает БЛИЗКО к телефону (6–10 см), другая ДАЛЕКО (16–24 см) — два пятна по расстоянию = две оси.
   Мешает разрешение: зонд игры 18,3–20,5 кГц (2,2 кГц) — ~8 см. Здесь зонд шире: 16–20,5 кГц (4,5 кГц) — ~4 см. Его могут слышать —
   перед записью спрашиваю. Одна запись разбирается и как широкая, и как узкая (частоты 18,3–20,5 — часть широкого зонда).
   Сценарий 61 с: левая близко, правая далеко — по одной, обе; потом наоборот. Метки — расстояние каждой руки, как в «двух ладонях».
   Разбор — tools/eval_depth.js. Файл sonardepth_*.wav. */
var DEPTH_LO=16000, DEPTH_HI=20500, DP={g:null,src:null,audible:null};
function dpS(c,a,per,t0){ return function(t){ return c+a*Math.sin(2*Math.PI*(t-t0)/per); }; }
var SCRIPT_DEPTH=[
  {t:0,  k:'empty', say:'Убери руки',                 sub:'Снимаю пустую комнату.', L:null, R:null, d:'—'},
  {t:3,  k:'place', say:'Левая близко, правая далеко', sub:'Левая у разъёма (8 см), правая дальше (20 см). Напротив меток.', L:twoK(80), R:twoK(200), d:'L=80, R=200'},
  {t:6,  k:'nearL', say:'Качай ближней',              sub:'Левая — за меткой, правая замерла.', L:dpS(80,25,2,6), R:twoK(200), d:'L=80+25sin(2pi(t-6)/2), R=200'},
  {t:13, k:'farR',  say:'Качай дальней',              sub:'Правая — за меткой, левая замерла.', L:twoK(80), R:dpS(200,40,2.7,13), d:'L=80, R=200+40sin(2pi(t-13)/2.7)'},
  {t:20, k:'bothLR',say:'Обе качаются',               sub:'Каждая за своей меткой.', L:dpS(80,25,2,20), R:dpS(200,40,2.7,20), d:'L=80+25sin(2pi(t-20)/2), R=200+40sin(2pi(t-20)/2.7)'},
  {t:30, k:'swap',  say:'Наоборот',                   sub:'Правая близко (8 см), левая далеко (20 см).', L:twoK(200), R:twoK(80), d:'L=200, R=80'},
  {t:34, k:'nearR', say:'Качай ближней',              sub:'Правая — за меткой, левая замерла.', L:twoK(200), R:dpS(80,25,2,34), d:'L=200, R=80+25sin(2pi(t-34)/2)'},
  {t:41, k:'farL',  say:'Качай дальней',              sub:'Левая — за меткой, правая замерла.', L:dpS(200,40,2.7,41), R:twoK(80), d:'L=200+40sin(2pi(t-41)/2.7), R=80'},
  {t:48, k:'bothRL',say:'Обе качаются',               sub:'Каждая за своей меткой.', L:dpS(200,40,2.7,48), R:dpS(80,25,2,48), d:'L=200+40sin(2pi(t-48)/2.7), R=80+25sin(2pi(t-48)/2)'},
  {t:58, k:'away',  say:'Убери руки',                 sub:'Совсем.', L:null, R:null, d:'—'},
  {t:61, k:'end'}
];
/* широкий зонд: свой источник на тот же динамик, что выбрал pickChannel */
function dpProbe(on){ if(typeof ctx==="undefined"||!ctx||!ctx.createBuffer) return;   /* стенд без звука */
  if(!DP.g){ var df=fs/N, ks=[], k, n, q; for(k=Math.ceil(DEPTH_LO/df);k<=Math.floor(DEPTH_HI/df);k++) ks.push(k);
    var M=ks.length, x=new Float64Array(N), mx=0; for(n=0;n<N;n++){ var s=0; for(q=0;q<M;q++) s+=Math.cos(2*Math.PI*ks[q]*n/N+Math.PI*q*q/M); x[n]=s; if(Math.abs(s)>mx) mx=Math.abs(s); }
    var buf=ctx.createBuffer(1,N,fs), d=buf.getChannelData(0); for(n=0;n<N;n++) d[n]=x[n]/mx*0.9;
    DP.src=loopSrc(buf); DP.g=ctx.createGain(); DP.g.gain.value=0; DP.mg=ctx.createChannelMerger(2); DP.src.connect(DP.g); DP.g.connect(DP.mg,0,chan==='left'?0:1); DP.mg.connect(ctx.destination); DP.src.start(); }
  DP.g.gain.setTargetAtTime(on?PROBE_G:0,ctx.currentTime,0.02); }
function dpAsk(){ return new Promise(function(r){ el('twAsk').classList.remove('hidden');
  function pick(v){ el('twAsk').classList.add('hidden'); el('twYes').onclick=null; el('twNo').onclick=null; r(v); }
  el('twYes').onclick=function(){ pick(true); }; el('twNo').onclick=function(){ pick(false); }; }); }
function runDepth(){ var S=SCRIPT_DEPTH, TOT=S[S.length-1].t;
  show('recTwo'); el('twAsk').classList.add('hidden'); el('twSay').textContent='Выбираю динамик'; el('twSub').textContent='Руки убраны.'; el('twClock').textContent=''; twoDraw(null,null);
  mode=null; rec={on:false,frames:[],gaps:0}; var prom;
  pickChannel().then(function(){ return autoLevel(); }).then(function(){ mode='rec'; return sleep(400).then(function(){ return collect(10); }); }).then(function(fr){
    prom=promSub(fr,'all');
    if(prom<15){ el('twSay').textContent='Зонда не слышно'; el('twSub').textContent='Прибавь громкость, выключи беззвучный, отключи наушники, открой динамики.'; setProbe('off'); mode=null; return sleep(7000).then(function(){ show('home'); }); }
    setProbe('off'); dpProbe(true); el('twSay').textContent='Слышишь писк?'; el('twSub').textContent='Сейчас играет зонд пошире — от 16 кГц. Прислушайся пару секунд.';
    return dpAsk().then(function(a){ DP.audible=a; var marks={}, t0=performance.now(), cur=-1; rec={on:true,frames:[],gaps:0};
      return new Promise(function(done){ (function tick(){ var t=(performance.now()-t0)/1000, i; for(i=S.length-1;i>=0;i--) if(t>=S[i].t) break;
          if(i!==cur){ cur=i; var s=S[i]; if(s.k==='end'){ done(marks); return; } marks[s.k]=rec.frames.length*N; el('twSay').textContent=s.say; el('twSub').textContent=s.sub; }
          var s2=S[cur]; twoDraw(s2.L?s2.L(t):null,s2.R?s2.R(t):null); el('twClock').textContent=t.toFixed(1)+' / '+TOT+' с'; requestAnimationFrame(tick); })(); }); }).then(function(marks){
      rec.on=false; dpProbe(false); setProbe('off'); mode=null;
      var n=rec.frames.length*N, all=new Float32Array(n); rec.frames.forEach(function(f,j){ all.set(f,j*N); });
      var pk=0; for(var i=0;i<n;i++){ var a=Math.abs(all[i]); if(a>pk) pk=a; }
      var so=(screen.orientation&&screen.orientation.angle!==undefined)?screen.orientation.angle:(window.orientation||0);
      recMeta={v:4,kind:'depth-portrait',audible:DP.audible,fs:fs,N:N,probe:{bins:'all',channel:chan,phase:'pi*q^2/M',peak:0.9,gain:PROBE_G,snr_db:PROBE_SNR,f_lo:DEPTH_LO,f_hi:DEPTH_HI,loop:true,game_band:[F_LO,20500]},
        prom_db:prom,samples:n,gaps:rec.gaps,peak:pk,orientation:{angle:so,w:window.innerWidth,h:window.innerHeight},
        script:S.filter(function(s){return s.k!=='end';}).map(function(s){ return {k:s.k,t:s.t,H:s.d}; }),
        marks:marks,units:'target distance of each hand (L, R — as the player sees them) from the bottom end in mm; phone flat, portrait, port towards the player; wide probe 16–20.5 kHz',ua:navigator.userAgent,date:new Date().toISOString()};
      blob=wav(all,recMeta); var d=new Date(), z=function(x){ return (x<10?'0':'')+x; };
      fname='sonardepth_'+d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'_'+z(d.getHours())+z(d.getMinutes())+'.wav'; showDone(pk,prom); }); }).catch(function(e){ dpProbe(false); setProbe('off'); el('twSay').textContent='Не вышло'; el('twSub').textContent=(e&&e.message)||String(e); }); }
function toDepth(){ lastRec='recDepth'; show('depthIntro'); }
el('goDepth').addEventListener('click',function(){ boot().then(toDepth).catch(fail); });
el('dpGo').addEventListener('click',function(){ lastRec='recDepth'; runDepth(); });
el('dpBack').addEventListener('click',function(){ show('home'); });
