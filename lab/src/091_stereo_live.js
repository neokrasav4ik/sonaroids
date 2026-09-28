/* ── СТЕРЕО ВЖИВУЮ и ЗАПИСЬ С ПРОВОДКОЙ (с 28.09, 0.62) ──
   Mi 9 Lite в приложении (14:28–14:32) отдал два разных микрофона: в CAMCORDER и UNPROCESSED ладонь слева и справа различимы —
   разница путей эха до двух микрофонов B − A около −40…−44 мм слева и −80 мм справа (tools/eval_stereo.js). Две пробы:
   1) «Стерео вживую» — то же, что считает eval_stereo, но сразу: по движущемуся эху каждого канала (минус среднее за 0,5 с, дальности
      30–300 мм, окно 16 кадров, шаг 8) — где эхо в A и в B и насколько B слабее; точка на экране: по горизонтали — лево/право
      (разница путей и сил, пересчитанная по двум меткам «держу слева» / «держу справа»), по вертикали — расстояние в канале A.
      Ладонью надо качать: неподвижная ладонь для этой меры пропадает (как в eval_stereo).
   2) «Запись с проводкой» — ладонь по меткам: слева, над серединой, справа (качая), потом медленно слева направо и обратно на трёх
      высотах за бегущей по экрану точкой. Файл sonarsweep_<источник>_*.wav, разбор — tools/eval_sweep.js: меняется ли разница плавно.
   Обе — только в приложении для Android (браузер даёт один микрофон). */
function StereoEcho(){
  var lo=bandLo(), hi=lo===F_LO?20500:DEPTH_HI, df=fs/N, ks=[], k, q, n, j;
  for(k=Math.ceil(lo/df);k<=Math.floor(hi/df);k++) ks.push(k);
  var M=ks.length, C=[], S=[], Pr=new Float64Array(M), Pi=new Float64Array(M);
  for(q=0;q<M;q++){ var c=new Float32Array(N), s=new Float32Array(N); for(n=0;n<N;n++){ c[n]=Math.cos(2*Math.PI*ks[q]*n/N); s[n]=Math.sin(2*Math.PI*ks[q]*n/N); } C.push(c); S.push(s);
    Pr[q]=Math.cos(Math.PI*q*q/M); Pi[q]=Math.sin(Math.PI*q*q/M); }
  var MMS=343e3/fs/2, R=[]; for(var mm=30;mm<=300;mm+=MMS) R.push(mm); var nR=R.length, FPS=fs/N, EMPTY=Math.round(2*FPS), W=16, HOP=8;
  var aM=1-Math.exp(-1/(0.5*FPS));
  function chan(){ return {avr:new Float64Array(M),avi:new Float64Array(M),mr:new Float64Array(M),mi:new Float64Array(M),t0:0,cr:null,ci:null,ring:[]}; }
  var A=chan(), B=chan(), nf=0, dDir=0, out=null, floor=null, nw=0;
  function spec(x,ch,hr,hi){ for(var q2=0;q2<M;q2++){ var re=0,im=0,c2=C[q2],s2=S[q2]; for(var n2=0;n2<N;n2++){ re+=x[n2]*c2[n2]; im-=x[n2]*s2[n2]; } hr[q2]=re*Pr[q2]+im*Pi[q2]; hi[q2]=im*Pr[q2]-re*Pi[q2]; } }
  function locate(ch,ref){ var best=-1, t0=0; for(var t=0;t<N;t+=0.25){ var re=0,im=0; for(var q2=0;q2<M;q2++){ var a=2*Math.PI*ks[q2]*t/N; re+=ch.avr[q2]*Math.cos(a)-ch.avi[q2]*Math.sin(a); im+=ch.avr[q2]*Math.sin(a)+ch.avi[q2]*Math.cos(a); } var m=re*re+im*im; if(m>best){ best=m; t0=t; } }
    ch.t0=t0; var tr=ref===undefined?t0:ref; ch.cr=[]; ch.ci=[]; for(var j2=0;j2<nR;j2++){ var cr=new Float64Array(M), ci=new Float64Array(M), tt=tr+R[j2]/MMS; for(var q3=0;q3<M;q3++){ var ang=2*Math.PI*ks[q3]*tt/N; cr[q3]=Math.cos(ang); ci[q3]=Math.sin(ang); } ch.cr.push(cr); ch.ci.push(ci); }
    for(var q4=0;q4<M;q4++){ ch.mr[q4]=ch.avr[q4]; ch.mi[q4]=ch.avi[q4]; } }
  var hR=new Float64Array(M), hI=new Float64Array(M);   // not hr/hi: «hi» is the band's top above (var hoisting)
  function step(ch,x){ var hr=hR, hi=hI; spec(x,ch,hr,hi);
    if(nf<EMPTY){ for(var q2=0;q2<M;q2++){ ch.avr[q2]+=hr[q2]/EMPTY; ch.avi[q2]+=hi[q2]/EMPTY; } return; }
    var E=new Float64Array(nR);
    for(var q3=0;q3<M;q3++){ ch.mr[q3]+=aM*(hr[q3]-ch.mr[q3]); ch.mi[q3]+=aM*(hi[q3]-ch.mi[q3]); }
    for(var j2=0;j2<nR;j2++){ var re=0,im=0, cr=ch.cr[j2], ci=ch.ci[j2]; for(var q4=0;q4<M;q4++){ var vr=hr[q4]-ch.mr[q4], vi=hi[q4]-ch.mi[q4]; re+=vr*cr[q4]-vi*ci[q4]; im+=vr*ci[q4]+vi*cr[q4]; } E[j2]=re*re+im*im; }
    ch.ring.push(E); if(ch.ring.length>W) ch.ring.shift(); }
  function sum(ch){ var e=0,c=0; ch.ring.forEach(function(E){ for(var j2=0;j2<nR;j2++){ e+=E[j2]; c+=E[j2]*R[j2]; } }); return {e:e,c:e>0?c/e:NaN}; }
  return {
    ready:function(){ return nf>EMPTY+W; },
    push:function(a,b){ step(A,a); step(B,b); nf++;
      // as in eval_stereo: both channels' distances counted from channel A's direct sound, then the difference of the direct sounds taken off
      if(nf===EMPTY){ locate(A); locate(B,A.t0); dDir=(B.t0-A.t0)*MMS; }
      if(nf>EMPTY+W&&(nf-EMPTY)%HOP===0){ var sa=sum(A), sb=sum(B); out={t:nf/FPS,eA:sa.e,eB:sb.e,cA:sa.c,cB:sb.c,d:sb.c-sa.c-dDir,l:10*Math.log10((sb.e||1e-30)/(sa.e||1e-30))};
        // active: the moving echo stands 6 dB over the quiet level — the lowest window so far, creeping up ~25% per 10 s so that a louder
        // room is followed (a percentile of the recent windows fails when the palm waves the whole time: the «quiet» is then the palm itself)
        var e2=sa.e+sb.e; floor=floor===null?e2:Math.min(floor*1.002,e2); nw++; out.act=nw>=8&&e2>4*floor; return out; } return null; },
    last:function(){ return out; },
    info:function(){ return {M:M,band:[lo,hi],t0A:A.t0,t0B:B.t0,dDir:dDir}; } };
}

var SL={se:null,on:false,cal:{},hist:[],grab:null};
function slDraw(){ var cv=el('slCv'), g=cv.getContext('2d'), W=cv.width, H=cv.height, o=SL.se&&SL.se.last();
  g.fillStyle='#16152a'; g.fillRect(0,0,W,H); g.strokeStyle='#3a3552'; g.strokeRect(0.5,0.5,W-1,H-1); g.beginPath(); g.moveTo(W/2,0); g.lineTo(W/2,H); g.stroke();
  g.fillStyle='#8a7fa0'; g.font='13px system-ui'; g.fillText('слева',8,H-8); g.textAlign='right'; g.fillText('справа',W-8,H-8); g.textAlign='left';
  if(!SL.se||!SL.se.ready()){ g.fillStyle='#c9b8d6'; g.fillText('убери руку — слушаю пустую комнату',10,20); return; }
  if(!o) return;
  var act=o.act, cal=SL.cal, dL=cal.L?cal.L.d:-44, dR=cal.R?cal.R.d:-80, lL=cal.L?cal.L.l:-21, lR=cal.R?cal.R.l:-17;
  var xd=(o.d-dL)/((dR-dL)||1), xl=(o.l-lL)/((lR-lL)||1), x=cal.L&&cal.R?(xd+xl)/2:xd; x=Math.max(-0.2,Math.min(1.2,x));
  var y=Math.max(0,Math.min(1,(o.cA-30)/(250)));
  SL.hist.push({x:x,y:y,act:act}); if(SL.hist.length>30) SL.hist.shift();
  SL.hist.forEach(function(p,i){ if(!p.act) return; g.fillStyle='rgba(127,224,200,'+(0.1+0.6*i/SL.hist.length)+')'; g.beginPath(); g.arc(20+p.x*(W-40),H-20-p.y*(H-40),4,0,7); g.fill(); });
  if(act){ g.fillStyle='#7fe0c8'; g.beginPath(); g.arc(20+x*(W-40),H-20-y*(H-40),10,0,7); g.fill(); }
  el('slNums').innerHTML='путь B − A <b>'+o.d.toFixed(0)+'</b> мм · сила B − A <b>'+o.l.toFixed(1)+'</b> дБ · расстояние A <b>'+o.cA.toFixed(0)+'</b> мм'+(act?'':' · <span class="bad">ладонь не движется / не слышна</span>')+
    '<br>метки: слева '+(cal.L?cal.L.d.toFixed(0)+' мм / '+cal.L.l.toFixed(1)+' дБ':'— (по умолчанию −44 мм)')+' · справа '+(cal.R?cal.R.d.toFixed(0)+' мм / '+cal.R.l.toFixed(1)+' дБ':'— (по умолчанию −80 мм)');
  if(SL.grab){ SL.grab.v.push(o); if(performance.now()-SL.grab.t0>3000){ var v=SL.grab.v.filter(function(q){ return q.act; }), med=function(a){ a=a.slice().sort(function(p,q){ return p-q; }); return a[a.length>>1]; };
      if(v.length>=4) SL.cal[SL.grab.k]={d:med(v.map(function(q){ return q.d; })),l:med(v.map(function(q){ return q.l; }))}; el('sl'+SL.grab.k).textContent=SL.grab.k==='L'?'Держу слева (3 с)':'Держу справа (3 с)'; SL.grab=null; } } }
function runStereoLive(){ var src=el('stSrc')?el('stSrc').value:'camcorder';
  show('stLive'); SL={se:null,on:true,cal:SL.cal||{},hist:[],grab:null}; el('slNums').textContent='';
  if(!stNative()){ el('slNums').innerHTML='<span class="bad">Только в приложении для Android</span>: браузер отдаёт один микрофон.'; return; }
  pickChannel().then(function(){ return autoLevel(); }).then(function(){ setProbe('single-'+chan); stLabMicOff(); SL.se=StereoEcho();
    return stNatStart(src,function(a,b){ if(SL.on&&SL.se) SL.se.push(a,b); }); }).then(function(){
    (function tick(){ if(!SL.on) return; slDraw(); requestAnimationFrame(tick); })(); })
  .catch(function(e){ el('slNums').innerHTML='<span class="bad">Не вышло: '+((e&&e.message)||e)+'</span>'; });
}
function stopStereoLive(){ SL.on=false; setProbe('off'); stNatStop(); stLabMicOn(); show('stIntro'); }
el('stLiveGo').addEventListener('click',function(){ runStereoLive(); });
el('slStop').addEventListener('click',stopStereoLive);
el('slL').addEventListener('click',function(){ if(SL.se&&SL.se.ready()){ SL.grab={k:'L',t0:performance.now(),v:[]}; el('slL').textContent='Держи слева… качай'; } });
el('slR').addEventListener('click',function(){ if(SL.se&&SL.se.ready()){ SL.grab={k:'R',t0:performance.now(),v:[]}; el('slR').textContent='Держи справа… качай'; } });
el('stSweepGo').addEventListener('click',function(){ lastRec='recSt'; runStereo('sweep'); });
