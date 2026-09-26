/* ── ОБРАБОТКА v2: быстрое смещение по фазе + абсолютная высота по центру эха, слитые вместе ── */
var DSP2=(function(){
  var N=512,C=343,fs,kLo,kHi,kc,ks,M,Pr,Pi,lam,mm,T,gA,gB,G,cosT,sinT;
  var d0,dref,boot,bootN=30,prevH,hist,L=4,prom,noProbe,bgAcc,bgN,bgR,bgI,BG_N=40;
  var Es,hold,present,refr,Q_FLOOR=-28,T_ON=-16,T_INT=-30,HOLD_S=1.5,tauE=0.15,REFR_S=0.7,TAU_BG=2.0,TAU=1.5;
  var eqW=null,eqDb=0,EQ_ON=16,ACC_N=24,FINE_N=188,EQ_MAX=10,gN=null,drops=0,sinceDrop=1e9,covered=false,lastPeak=null,d0B=0,fineN=-1,fR=null,fI=null,refR=null,refI=null,acR=null,acI=null,acN=0,moveN=0,scanWait=0,relocks=0,eAvg=0,TE=3,E_FAST=12,ePres=0,why='',rngBuf=[],xBuf=[],centered=false,autoC=false,presN=0,x,fast,cal={k:0.75,o:1,s:0.8},eHold=null,lowN=0,resS=-99,resFloor=null,upN=0,warm=0,absBuf=[],ABS_MED=15,DEADB=5,DEADB_UP=15,dirS=null,lostN=0,lost=false;
  function init(sampleRate,parity){
    fs=sampleRate; var df=fs/N; kLo=Math.ceil(18300/df); kHi=Math.floor(20500/df); kc=Math.floor((kLo+kHi)/2);
    ks=[]; for(var k=kLo;k<=kHi;k++) if(parity===undefined||parity==='all'||k%2===parity) ks.push(k);
    M=ks.length; T=(parity===0||parity===1)?N/2:N;
    lam=C/(kc*df)*1000; mm=C/fs/2*1000; gA=Math.round(30/mm); gB=Math.round(300/mm); G=gB-gA;
    Pr=new Float64Array(M); Pi=new Float64Array(M);
    for(var q=0;q<M;q++){ var ph=Math.PI*q*q/M; Pr[q]=Math.cos(ph); Pi[q]=Math.sin(ph); }
    cosT=new Float64Array(M*N); sinT=new Float64Array(M*N);
    for(q=0;q<M;q++){ var w=-2*Math.PI*ks[q]/N; for(var n=0;n<N;n++){ cosT[q*N+n]=Math.cos(w*n); sinT[q*N+n]=Math.sin(w*n); } }
    d0=null; dref=null; eqW=null; eqDb=0; gN=null; drops=0; sinceDrop=1e9; covered=false; lastPeak=null; d0B=0; fineN=-1; fR=null; fI=null; refR=null; refI=null; acR=null; acI=null; acN=0; moveN=0; scanWait=0; relocks=0; boot=[]; prevH=null; hist=[]; prom=null; noProbe=false;
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
    if(zr>=48&&d0!==null){ prevH=null; hist=[]; drops++; sinceDrop=0; return null; }
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
        refR=new Float64Array(T); refI=new Float64Array(T); boot.forEach(function(h){ for(var j=0;j<T;j++){ var v=tap(h,j); refR[j]+=v[0]; refI[j]+=v[1]; } });   // v0.36: the complex response, for finding a shift
        boot=boot.map(function(h){ var m=new Float64Array(T); for(var j=0;j<T;j++){ var v=tap(h,j); m[j]=v[0]*v[0]+v[1]*v[1]; } return m; });
        boot.forEach(function(m){ for(var j=0;j<T;j++) s[j]+=m[j]; });
        for(n=0;n<T;n++) if(s[n]>bv){ bv=s[n]; b=n; }
        var srt=Array.prototype.slice.call(s).sort(function(p,q){return p-q;}); prom=10*Math.log10(bv/(srt[T>>1]||1e-30));
        if(prom<12){ noProbe=true; boot=[]; return null; }
        noProbe=false; d0=b; d0B=b; dref=bv/boot.length; }
      return null;
    }
    // с 24.09 ночи: отклик нормируется на прямой сигнал (его усиление и фазу). На Android (OnePlus 13) усиление тракта
    // «динамик→микрофон» плавает на 2–3 дБ за секунды, а ближний хвост прямого сигнала там сильный (−27 дБ) — пустая комната
    // давала остаток −10 дБ вместо −30, и ладонь тонула. Усиление учится только в тихой пустой комнате (как уровень пустоты):
    // рука рядом с телефоном просачивается в прямой отсчёт, и на iPhone иначе портилась высота
    var vd0=tap(H,d0); if(!gN) gN=[vd0[0],vd0[1]]; else if(!present&&!covered&&Es<Q_FLOOR){ gN[0]+=0.03*(vd0[0]-gN[0]); gN[1]+=0.03*(vd0[1]-gN[1]); }
    var gm=gN[0]*gN[0]+gN[1]*gN[1], sq=Math.sqrt(dref), nr=sq*gN[0]/gm, ni=-sq*gN[1]/gm;
    var h=[new Float64Array(G),new Float64Array(G)];
    for(i=0;i<G;i++){ var v2=tap(H,(d0+gA+i)%T); h[0][i]=v2[0]*nr-v2[1]*ni; h[1][i]=v2[0]*ni+v2[1]*nr; }
    // прямой сигнал пропал на 20 дБ и больше целую секунду — звук ушёл в другое устройство
    sinceDrop++; var vd=tap(H,d0), pd=vd[0]*vd[0]+vd[1]*vd[1]; dirS=(dirS===null)?pd:dirS+0.1*(pd-dirS);
    // с 26.09: зонд пропал, только если его не слышно ни на одной задержке. Закрытый ладонью динамик глушит прямой сигнал на 20–35 дБ,
    // но зонд в микрофоне громкий (отражение от ладони) — это не наушники и не Bluetooth
    if(dirS<dref*0.01&&!(lastPeak!==null&&lastPeak>dref*0.1)){ if(++lostN>fs/N) lost=true; } else lostN=0;
    // прямой сигнал «переехал» (с 24.09 ночи): Android иногда вставляет во вход кусок тишины (запись OnePlus 23:40 — 1920 нулей),
    // и весь отклик сдвигается по задержке на столько же отсчётов по кругу. Комната та же — надо лишь заново найти прямой сигнал.
    // Упал ниже −10 дБ на ~0,1 с — ищу сдвиг (не чаще раза в 0,5 с). v0.34 переезжала только в первые 2 с после провала входа,
    // а без провала считала это «закрыто» (covered): ничего не переучивается, абсолютная часть не тянет. Закрытым остаётся лишь то,
    // для чего сдвинутой копии отклика не нашлось
    // с 26.09 (v0.36): прямой сигнал пропал — ищу, не сдвинулся ли весь отклик по задержке. В партиях «в руке» — iPhone 26.09 10:29
    // (весь отклик сдвинулся на ~256 отсчётов) и OnePlus 15:53 (на ~140) — провалов входа не было, профиль по всем задержкам совпадал
    // со сдвинутым на 0,99, а v0.34 считала это «закрыто»: не тянула по положению, корабль уплывал вверх, игрок видел «не закрывай динамик»
    // при свободном торце. Сдвиг ищу по КОМПЛЕКСНОМУ отклику, накопленному за ~0,3 с: ладонь движется, её эхо при накоплении гасится,
    // а прямой сигнал стоит. По модулю (и по самому громкому отсчёту) выходило на 10–17 отсчётов мимо — ладонь в 5 см громче прямого,
    // а положение эха от точности d0 зависит сильно (согласие быстрой части и дальности 0,03 против 0,9 на партии 10:29)
    if(dirS<dref*0.1){ moveN++;
      if(moveN>=8){ if(!acR){ acR=new Float64Array(T); acI=new Float64Array(T); acN=0; }
        for(n=0;n<T;n++){ var va=tap(H,n); acR[n]+=va[0]; acI[n]+=va[1]; } acN++;
        if(acN>=ACC_N&&--scanWait<=0){ scanWait=Math.round(0.5*fs/N); var bb=0,bp=0,br=0,bi=0,n0=0,n1=0,bs=0,bc=-1;
          for(n=0;n<T;n++){ var pa=(acR[n]*acR[n]+acI[n]*acI[n])/(acN*acN); if(pa>bp){ bp=pa; bb=n; } }
          lastPeak=bp;
          for(n=0;n<T;n++){ n0+=refR[n]*refR[n]+refI[n]*refI[n]; n1+=acR[n]*acR[n]+acI[n]*acI[n]; }
          for(var sh=0;sh<T;sh++){ br=0; bi=0; for(n=0;n<T;n++){ var m=(n+sh)%T; br+=refR[n]*acR[m]+refI[n]*acI[m]; bi+=refR[n]*acI[m]-refI[n]*acR[m]; } var cc=br*br+bi*bi; if(cc>bc){ bc=cc; bs=sh; } }
          var sim=Math.sqrt(bc/(n0*n1||1e-30)), nd=(d0B+bs)%T, pn=(acR[nd]*acR[nd]+acI[nd]*acI[nd])/(acN*acN);
          acR=null; acI=null; acN=0;
          if(nd!==d0&&sim>0.9&&pn>dref*0.1){ var vn=tap(H,nd); if(gN) gN=[vn[0],vn[1]]; d0=nd; dirS=pn; moveN=0; covered=false; relocks++; prevH=null; hist=[]; lostN=0; fineN=0; fR=null; fI=null; return null; }   /* сдвиг поворачивает и фазу прямого — усиление берётся заново */ } }
      covered=moveN>=8; }
    else { moveN=0; scanWait=0; covered=false; lastPeak=null; acR=null; acI=null; acN=0; }
    // после переезда — уточнение: 2 с комплексного отклика (ладонь за это время уходит, её эхо гасится сильнее), поиск ±4 отсчёта.
    // Точность нужна: на партии 10:29 d0 на 1 отсчёт мимо — согласие быстрой части и дальности 0,84 → 0,71, на 4 — 0,2;
    // OnePlus 15:53: первый поиск — 148, уточнение — 144 (как по отклику за каждую секунду), согласие 0,31 → 0,55
    if(fineN>=0&&!covered){ if(!fR){ fR=new Float64Array(T); fI=new Float64Array(T); }
      for(n=0;n<T;n++){ var vf=tap(H,n); fR[n]+=vf[0]; fI[n]+=vf[1]; }
      if(++fineN>=FINE_N){ var fb=0,fc=-1,sh0=(d0-d0B+T)%T;
        for(var j=-4;j<=4;j++){ var fr2=0,fi2=0; for(n=0;n<T;n++){ var m3=(n+sh0+j+T)%T; fr2+=refR[n]*fR[m3]+refI[n]*fI[m3]; fi2+=refR[n]*fI[m3]-refI[n]*fR[m3]; } var fcc=fr2*fr2+fi2*fi2; if(fcc>fc){ fc=fcc; fb=j; } }
        if(Math.abs(fb)<2) fb=0;   /* ±1 — в пределах точности (на OnePlus и без сдвига оценка ходит на ±2) */
        if(fb!==0){ d0=(d0+fb+T)%T; gN=[fR[d0]/fineN,fI[d0]/fineN]; dirS=(gN[0]*gN[0]+gN[1]*gN[1]); prevH=null; hist=[]; }
        fineN=-1; fR=null; fI=null; if(fb!==0) return null; } }
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
    if(!present&&!covered){ var aB=1-Math.exp(-1/(TAU_BG*fpsF));      // без руки фон тихо обновляется
      for(i=0;i<G;i++){ bgR[i]+=aB*(h2[0][i]-bgR[i]); bgI[i]+=aB*(h2[1][i]-bgI[i]); } }
    if(E>T_INT) fast+=vel;                                   // сырое смещение — для калибровки
    if(!covered){ absBuf.push(abs); if(absBuf.length>ABS_MED) absBuf.shift(); }
    var absM=absBuf.length>2?absBuf.slice().sort(function(p,q){return p-q;})[absBuf.length>>1]:abs;
    if((started&&!covered)||x===null){ x=abs; eAvg=0; }
    if(present){ if(E>T_INT) x+=cal.s*vel;
      // абсолютная часть — ограничитель ухода. С 24.09 тянет по СРЕДНЕМУ расхождению за 3 с, а не по мгновенному:
      // у краёв (особенно внизу, у стола) абсолютная часть сжата и раньше тянула корабль к середине — «ладонь на столе, а корабль не внизу»
      // с 24.09 вечера: чем больше расхождение, тем быстрее тянет (в 1+(e/12)² раза): при быстрых взмахах быстрая часть уплывала
      // на 60–90 мм за несколько секунд, и корабль «прилипал» к краю (партия 2001). На записях с меткой форма не хуже
      // с 25.09: ниже середины абсолютная часть тянет ВВЕРХ без ускорения и с зоной ±15 мм: у стола (ладонь на 4–5 см) она врёт вверх
      // на 25–40 мм, и ускоренное подтягивание не пускало корабль вниз («резинка» внизу; запись с меткой 11:09 на 4–12 см:
      // форма 0.826 → 0.911, дрожь удержания 6.9 → 4.1 мм; 11:26 0.628 → 0.895; остальные записи те же или лучше)
      if(!covered){ var up=eAvg>0&&x<100, kq=up?1:1+(eAvg/E_FAST)*(eAvg/E_FAST);
      eAvg+=(1-Math.exp(-kq/(TE*fpsF)))*((absM-x)-eAvg);
      var db=up?DEADB_UP:DEADB, ex=Math.abs(eAvg)>db?eAvg-(eAvg>0?db:-db):0, dx=(1-Math.exp(-kq/(TAU*fpsF)))*ex;
      x+=dx; eAvg-=dx; } }
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
    info:function(){ return {covered:covered,eq_db:eqDb,eq:!!eqW,relocks:relocks,drops:drops,d0:d0,prom:prom,noProbe:noProbe,lost:lost,ready:bgR!==null,mm:mm,centered:centered,cal:{k:cal.k,o:cal.o,s:cal.s}}; }};
})();
if(typeof module!=='undefined') module.exports=DSP2;
