/* ── ОБРАБОТКА v2: быстрое смещение по фазе + абсолютная высота по центру эха, слитые вместе ── */
var DSP2=(function(){
  var N=512,C=343,fs,kLo,kHi,kc,ks,M,Pr,Pi,lam,mm,T,gA,gB,G,cosT,sinT;
  var d0,dref,boot,bootN=30,prevH,hist,L=4,prom,noProbe,bgAcc,bgN,bgR,bgI,BG_N=40;
  var Es,hold,present,refr,Q_FLOOR=-28,T_ON=-16,T_INT=-30,HOLD_S=1.5,tauE=0.15,REFR_S=0.7,TAU_BG=2.0,TAU=1.5;
  var eqW=null,eqDb=0,EQ_ON=16,EQ_MAX=10,gN=null,drops=0,moveN=0,scanWait=0,relocks=0,eAvg=0,TE=3,E_FAST=12,ePres=0,why='',rngBuf=[],xBuf=[],centered=false,autoC=false,presN=0,x,fast,cal={k:0.75,o:1,s:0.8},eHold=null,lowN=0,resS=-99,resFloor=null,upN=0,warm=0,absBuf=[],ABS_MED=15,DEADB=5,dirS=null,lostN=0,lost=false;
  function init(sampleRate,parity){
    fs=sampleRate; var df=fs/N; kLo=Math.ceil(18300/df); kHi=Math.floor(20500/df); kc=Math.floor((kLo+kHi)/2);
    ks=[]; for(var k=kLo;k<=kHi;k++) if(parity===undefined||parity==='all'||k%2===parity) ks.push(k);
    M=ks.length; T=(parity===0||parity===1)?N/2:N;
    lam=C/(kc*df)*1000; mm=C/fs/2*1000; gA=Math.round(30/mm); gB=Math.round(300/mm); G=gB-gA;
    Pr=new Float64Array(M); Pi=new Float64Array(M);
    for(var q=0;q<M;q++){ var ph=Math.PI*q*q/M; Pr[q]=Math.cos(ph); Pi[q]=Math.sin(ph); }
    cosT=new Float64Array(M*N); sinT=new Float64Array(M*N);
    for(q=0;q<M;q++){ var w=-2*Math.PI*ks[q]/N; for(var n=0;n<N;n++){ cosT[q*N+n]=Math.cos(w*n); sinT[q*N+n]=Math.sin(w*n); } }
    d0=null; dref=null; eqW=null; eqDb=0; gN=null; drops=0; moveN=0; scanWait=0; relocks=0; boot=[]; prevH=null; hist=[]; prom=null; noProbe=false;
    bgAcc=null; bgN=0; bgR=null; bgI=null; Es=-80; hold=0; present=false; refr=0; x=null; fast=0; eHold=null; ePres=0; why=""; rngBuf=[]; xBuf=[]; centered=false; presN=0; lowN=0; resS=-99; resFloor=null; upN=0; warm=0; absBuf=[]; dirS=null; lostN=0; lost=false;
  }
  function bandSpec(fr){
    var Hr=new Float64Array(M),Hi=new Float64Array(M),q,n;
    for(q=0;q<M;q++){ var sr=0,si=0,o=q*N; for(n=0;n<N;n++){ sr+=fr[n]*cosT[o+n]; si+=fr[n]*sinT[o+n]; }
      Hr[q]=sr*Pr[q]+si*Pi[q]; Hi[q]=si*Pr[q]-sr*Pi[q]; }
    return [Hr,Hi];
  }
  function tap(H,n){ var sr=0,si=0; for(var q=0;q<M;q++){ var a=2*Math.PI*(ks[q]-kc)*n/N, c=Math.cos(a), s=Math.sin(a);
    sr+=H[0][q]*c-H[1][q]*s; si+=H[0][q]*s+H[1][q]*c; } return [sr/N,si/N]; }
  function frame(fr){
    /* провал входа: Android вставляет тишину (ровные нули). Такой кадр — не звук комнаты: пропускаю и начинаю разности заново,
       иначе скачок на его краях выглядит как движение руки */
    var zr=0; for(var zi=0;zi<fr.length;zi++){ if(fr[zi]===0){ if(++zr>=48) break; } else zr=0; }
    if(zr>=48&&d0!==null){ prevH=null; hist=[]; drops++; return null; }
    var H=bandSpec(fr),i,n;
    if(eqW) for(i=0;i<M;i++){ H[0][i]*=eqW[i]; H[1][i]*=eqW[i]; }
    if(d0===null){                                     // первые кадры: слышен ли зонд, где прямой сигнал
      boot.push(H);
      if(boot.length>=bootN){ var s=new Float64Array(T),b=0,bv=0;
        // с 25.09: выравнивание полосы. На OnePlus и Redmi зонд у микрофона к 20 кГц слабее на 20–33 дБ (на iPhone перепад ~11 дБ):
        // верхняя половина полосы почти пропадала, отклик расплывался. Если перепад по тонам больше 16 дБ — каждый тон делится
        // на свой уровень (не больше чем в 10 раз). Записи с меткой OnePlus: против метки 81 → 12 мм (23:40), 201 → 21 (22:28), рука видна дольше
        var pw=new Float64Array(M),pmx=0,pmn=1e300; boot.forEach(function(h){ for(var q=0;q<M;q++) pw[q]+=h[0][q]*h[0][q]+h[1][q]*h[1][q]; });
        for(var q=0;q<M;q++){ pmx=Math.max(pmx,pw[q]); pmn=Math.min(pmn,pw[q]); }
        eqW=null; eqDb=10*Math.log10(pmx/(pmn||1e-30));
        if(eqDb>EQ_ON){ eqW=new Float64Array(M); for(q=0;q<M;q++) eqW[q]=Math.min(EQ_MAX,Math.sqrt(pmx/(pw[q]||1e-30)));
          boot.forEach(function(h){ for(var q2=0;q2<M;q2++){ h[0][q2]*=eqW[q2]; h[1][q2]*=eqW[q2]; } }); }
        boot=boot.map(function(h){ var m=new Float64Array(T); for(var j=0;j<T;j++){ var v=tap(h,j); m[j]=v[0]*v[0]+v[1]*v[1]; } return m; });
        boot.forEach(function(m){ for(var j=0;j<T;j++) s[j]+=m[j]; });
        for(n=0;n<T;n++) if(s[n]>bv){ bv=s[n]; b=n; }
        var srt=Array.prototype.slice.call(s).sort(function(p,q){return p-q;}); prom=10*Math.log10(bv/(srt[T>>1]||1e-30));
        if(prom<12){ noProbe=true; boot=[]; return null; }
        noProbe=false; d0=b; dref=bv/boot.length; }
      return null;
    }
    // с 24.09 ночи: отклик нормируется на прямой сигнал (его усиление и фазу). На Android (OnePlus 15) усиление тракта
    // «динамик→микрофон» плавает на 2–3 дБ за секунды, а ближний хвост прямого сигнала там сильный (−27 дБ) — пустая комната
    // давала остаток −10 дБ вместо −30, и ладонь тонула. Усиление учится только в тихой пустой комнате (как уровень пустоты):
    // рука рядом с телефоном просачивается в прямой отсчёт, и на iPhone иначе портилась высота
    var vd0=tap(H,d0); if(!gN) gN=[vd0[0],vd0[1]]; else if(!present&&Es<Q_FLOOR){ gN[0]+=0.03*(vd0[0]-gN[0]); gN[1]+=0.03*(vd0[1]-gN[1]); }
    var gm=gN[0]*gN[0]+gN[1]*gN[1], sq=Math.sqrt(dref), nr=sq*gN[0]/gm, ni=-sq*gN[1]/gm;
    var h=[new Float64Array(G),new Float64Array(G)];
    for(i=0;i<G;i++){ var v2=tap(H,(d0+gA+i)%T); h[0][i]=v2[0]*nr-v2[1]*ni; h[1][i]=v2[0]*ni+v2[1]*nr; }
    // прямой сигнал пропал на 20 дБ и больше целую секунду — звук ушёл в другое устройство
    var vd=tap(H,d0), pd=vd[0]*vd[0]+vd[1]*vd[1]; dirS=(dirS===null)?pd:dirS+0.1*(pd-dirS);
    if(dirS<dref*0.01){ if(++lostN>fs/N) lost=true; } else lostN=0;
    // прямой сигнал «переехал» (с 24.09 ночи): Android иногда вставляет во вход кусок тишины (запись OnePlus 23:40 — 1920 нулей),
    // и весь отклик сдвигается по задержке на столько же отсчётов по кругу. Комната та же — надо лишь заново найти прямой сигнал.
    // Упал ниже −10 дБ на ~0,1 с — ищу пик по всем задержкам (не чаще раза в 0,5 с); если он почти прежней силы — перехожу туда
    if(dirS<dref*0.1){ if(++moveN>=8&&--scanWait<=0){ scanWait=Math.round(0.5*fs/N); var bb=0,bp=0; for(n=0;n<T;n++){ var vs=tap(H,n), ps=vs[0]*vs[0]+vs[1]*vs[1]; if(ps>bp){ bp=ps; bb=n; } }
        if(bp>dref*0.25&&bb!==d0){ var vn=tap(H,bb); if(gN) gN=[vn[0],vn[1]]; d0=bb; dirS=bp; moveN=0; relocks++; prevH=null; hist=[]; lostN=0; return null; }   /* сдвиг поворачивает и фазу прямого — усиление берётся заново */ } }
    else { moveN=0; scanWait=0; }
    if(!prevH){ prevH=h; return null; }
    var h2=[new Float64Array(G),new Float64Array(G)];
    for(i=0;i<G;i++){ h2[0][i]=0.5*(h[0][i]+prevH[0][i]); h2[1][i]=0.5*(h[1][i]+prevH[1][i]); }
    prevH=h;
    if(bgR===null){                                    // фон пустой комнаты
      if(!bgAcc) bgAcc=[new Float64Array(G),new Float64Array(G)];
      for(i=0;i<G;i++){ bgAcc[0][i]+=h2[0][i]; bgAcc[1][i]+=h2[1][i]; }
      if(++bgN>=BG_N){ bgR=new Float64Array(G); bgI=new Float64Array(G); for(i=0;i<G;i++){ bgR[i]=bgAcc[0][i]/bgN; bgI[i]=bgAcc[1][i]/bgN; } }
      hist.push(h2); if(hist.length>L+2) hist.shift();
      return null;
    }
    hist.push(h2); if(hist.length>L+2) hist.shift();
    if(hist.length<L+2) return null;
    // быстрое: скорость вращения фазы по всей полосе
    var a1=hist[L+1],b1=hist[1],a0=hist[L],b0=hist[0],rr=0,ri=0,e=0;
    for(i=0;i<G;i++){ var g1r=a1[0][i]-b1[0][i],g1i=a1[1][i]-b1[1][i],g0r=a0[0][i]-b0[0][i],g0i=a0[1][i]-b0[1][i];
      rr+=g1r*g0r+g1i*g0i; ri+=g1i*g0r-g1r*g0i; e+=g1r*g1r+g1i*g1i; }
    var E=10*Math.log10(e/dref+1e-30), vel=-Math.atan2(ri,rr)*lam/(4*Math.PI);
    // медленное: центр тяжести эха относительно пустой комнаты
    var sw=0,sx=0; for(i=0;i<G;i++){ var dr=h2[0][i]-bgR[i],di=h2[1][i]-bgI[i],p=dr*dr+di*di; sw+=p; sx+=p*(gA+i); }
    var range=sx/(sw||1e-30)*mm, abs=cal.k*range+cal.o;
    var fpsF=fs/N, aE=1-Math.exp(-1/(tauE*fpsF)); Es+=aE*(E-Es);
    var resE=10*Math.log10(sw/dref+1e-30); resS+=0.2*(resE-resS);
    // появление — только по движению: дрейф фона так не выглядит
    if(Es>T_ON&&refr===0) hold=Math.max(hold,Math.round(HOLD_S*fpsF));
    var moving=hold>0; if(hold>0) hold--;
    var was=present;
    if(!present){
      // уровень пустой комнаты учится только на тихих кадрах: если ладонь уже рядом и шевелится при старте,
      // он не выучит её эхо как «пустоту» (иначе потом неподвижная рука не видна — «видна рывками»)
      if(Es<Q_FLOOR){ if(resFloor===null) resFloor=resS;
        warm++;
        var tf=warm<fpsF?0.15:1.0;                                // первую секунду уровень пустой комнаты только учится
        resFloor+=(1-Math.exp(-1/(tf*fpsF)))*(resS-resFloor); }
      if(resFloor!==null&&warm>=fpsF&&resS>resFloor+15) upN++; else upN=0;   // вход по резкому росту эха над пустой комнатой
      if(refr===0&&(moving||upN>=4)){ present=true; eHold=resS; ePres=resS; lowN=0; why=moving?'движение':'эхо'; upN=0; }
    }
    else {
      // остаётся, пока её эхо заметно выше пустой комнаты — даже неподвижная и в «тихой» позе.
      // Уходит, когда эхо опустилось почти до пустоты. Сравнивать с пиком нельзя: эхо сильно зависит от позы ладони.
      // Второй признак ухода: эхо упало на 18 дБ ниже своего уровня с рукой (поза меняет эхо лишь на ~10 дБ) и близко к пустоте.
      if(resS>ePres-6) ePres+=(1-Math.exp(-1/fpsF))*(resS-ePres);
      var lowF=resFloor!==null&&resS<resFloor+10, lowD=resS<ePres-18&&(resFloor===null||resS<resFloor+15);
      if(lowF||lowD) lowN++; else lowN=0;
      if(lowN>=Math.round(0.3*fpsF)){ present=false; refr=Math.round(REFR_S*fpsF); hold=0; why=lowF?'уход: эхо у пустоты':'уход: эхо упало'; }
    }
    if(refr>0) refr--;
    var started=present&&!was;
    if(!present){ var aB=1-Math.exp(-1/(TAU_BG*fpsF));      // без руки фон тихо обновляется
      for(i=0;i<G;i++){ bgR[i]+=aB*(h2[0][i]-bgR[i]); bgI[i]+=aB*(h2[1][i]-bgI[i]); } }
    if(E>T_INT) fast+=vel;                                   // сырое смещение — для калибровки
    absBuf.push(abs); if(absBuf.length>ABS_MED) absBuf.shift();
    var absM=absBuf.length>2?absBuf.slice().sort(function(p,q){return p-q;})[absBuf.length>>1]:abs;
    if(started||x===null){ x=abs; eAvg=0; }
    if(present){ if(E>T_INT) x+=cal.s*vel;
      // абсолютная часть — ограничитель ухода. С 24.09 тянет по СРЕДНЕМУ расхождению за 3 с, а не по мгновенному:
      // у краёв (особенно внизу, у стола) абсолютная часть сжата и раньше тянула корабль к середине — «ладонь на столе, а корабль не внизу»
      // с 24.09 вечера: чем больше расхождение, тем быстрее тянет (в 1+(e/12)² раза): при быстрых взмахах быстрая часть уплывала
      // на 60–90 мм за несколько секунд, и корабль «прилипал» к краю (партия 2001). На записях с меткой форма не хуже
      var kq=1+(eAvg/E_FAST)*(eAvg/E_FAST);
      eAvg+=(1-Math.exp(-kq/(TE*fpsF)))*((absM-x)-eAvg);
      var ex=Math.abs(eAvg)>DEADB?eAvg-(eAvg>0?DEADB:-DEADB):0, dx=(1-Math.exp(-kq/(TAU*fpsF)))*ex;
      x+=dx; eAvg-=dx; }
    // память последней секунды с рукой — для центровки; первая центровка сама, через 0,8 с после появления руки
    if(present){ rngBuf.push(range); xBuf.push(x); if(rngBuf.length>Math.round(fpsF)){ rngBuf.shift(); xBuf.shift(); } presN++; }
    else { rngBuf=[]; xBuf=[]; presN=0; }
    if(autoC&&!centered&&presN>=Math.round(0.8*fpsF)) recenter();
    return {present:present,started:started,height:x,abs:abs,range:range,fast:fast,E:E,resE:resS,floor:resFloor,Em:Es,why:why};
  }
  /* центровка: середина поля (100) — там, где ладонь была последнюю секунду. Сдвигает и абсолютную часть (o), и итог (x) —
     движение не теряется, корабль лишь переезжает так, чтобы среднее положение ладони пришлось на середину */
  function med(a){ var b=a.slice().sort(function(p,q){return p-q;}); return b[b.length>>1]; }
  function recenter(){
    if(rngBuf.length<30) return null;
    var r0=med(rngBuf), xm=med(xBuf), oOld=cal.o, i;
    cal.o=100-cal.k*r0; for(i=0;i<absBuf.length;i++) absBuf[i]+=cal.o-oOld;
    x+=100-xm; for(i=0;i<xBuf.length;i++) xBuf[i]+=100-xm;
    centered=true; return {r0:+r0.toFixed(1),o:+cal.o.toFixed(1),shift:+(100-xm).toFixed(1)};
  }
  /* сдвиг всей шкалы высот на d мм — и абсолютной части, и итога: так игра подстраивает середину по взмахам ладони */
  function shift(d){ var i; cal.o+=d; for(i=0;i<absBuf.length;i++) absBuf[i]+=d; if(x!==null) x+=d; for(i=0;i<xBuf.length;i++) xBuf[i]+=d; centered=true; }
  return {init:init,frame:frame,recenter:recenter,shift:shift,
    setCal:function(c){ cal.k=c.k; cal.o=c.o; cal.s=c.s; },
    set:function(k,v){ if(k==='tint') T_INT=v; if(k==='tau') TAU=v; if(k==='absmed') ABS_MED=Math.max(1,Math.round(v)); if(k==='deadband') DEADB=Math.max(0,v); if(k==='autocenter') autoC=!!v; },
    info:function(){ return {eq_db:eqDb,eq:!!eqW,relocks:relocks,drops:drops,d0:d0,prom:prom,noProbe:noProbe,lost:lost,ready:bgR!==null,mm:mm,centered:centered,cal:{k:cal.k,o:cal.o,s:cal.s}}; }};
})();
