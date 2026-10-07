/* ── ОБРАБОТКА v2: быстрое смещение по фазе + абсолютная высота по центру эха, слитые вместе ── */
var DSP2=(function(){
  var fzF=[],fzA=[],fzN=0,fzHold=0,frozen=false,frozenN=0,N=512,C=343,fs,kLo,kHi,kc,ks,M,Pr,Pi,lam,mm,T,gA,gB,G,cosT,sinT,BAND_LO=null;   // BAND_LO — нижний край полосы зонда, если не 18,3 кГц (широкий зонд, с 0.39u; задаётся set('flo') до init)
  var d0,dref,boot,bootN=30,prevH,hist,L=4,prom,noProbe,bgAcc,bgN,bgR,bgI,BG_N=40;
  var ldP=null,ldS=null,ldQ=[];
  /* 1.57a (лаба, «Жонглёр»): быстрая часть — поворот фазы за кадр, однозначный только до λ/4 за кадр (~4,5 мм за 10,7 мс, ≈ 40 см/с);
     рывок быстрее «перекручивается» и уходит в обратную сторону (так «уплывало» и 24.09 при быстрых взмахах). С 'unwrap' — доворот на
     оборот — к прогнозу из двух прошлых кадров (поворот + половина его прироста), только когда прошлый кадр уже быстрый (> λ/12),
     разгон ровный (прирост < 0,6π) и эхо сильное. Рука не останавливается за один кадр (10,7 мс), поэтому ближайший к прогнозу поворот
     и есть настоящий. Всплеск при появлении ладони не годится (первая проба доворачивала по одному кадру и раскручивала высоту на метры).
     Читается до ~3 λ/4 за кадр (≈ 1,2 м/с), пока разгон ровный. По умолчанию выключено — игра как была */
  var UNWRAP=false,vPrev=null,vPrev2=null,unwN=0;
  /* 1.57c (лаба, «Жонглёр»; Ден 13:38: «платформа сильно запаздывает за ладонью и вообще на резкие движения не реагирует»): 'half' —
     поворот фазы ещё и по окну, сдвинутому на полкадра (хвост прошлого кадра + начало этого; зонд периодичен в N, поэтому такое окно —
     тот же отклик, со знаком (−1)^k у тона k). Поворот за кадр = за первую половину + за вторую, каждая однозначна до ±π — предел
     скорости вдвое выше (~80 см/с вместо ~40). Сырые отклики без усреднения двух кадров. По умолчанию выключено — игра как была */
  var HALF=false,lastFr=null,hRh=[],hMh=[],halfN=0;   // 1.56q: ближнее сильное эхо (lead)
  var holdFloor=false, Es,hold,present,refr,Q_FLOOR=-28,T_ON=-16,T_INT=-30,HOLD_S=1.5,tauE=0.15,REFR_S=0.35,TAU_BG=2.0,TAU=1.5;
  var eqW=null,eqDb=0,EQ_ON=16,ACC_N=24,FINE_N=188,EQ_MAX=10,gN=null,drops=0,sinceDrop=1e9,covered=false,lastPeak=null,d0B=0,fineN=-1,fR=null,fI=null,refR=null,refI=null,acR=null,acI=null,acN=0,moveN=0,scanWait=0,relocks=0,eAvg=0,TE=3,E_FAST=12,ePres=0,why='',rngBuf=[],xBuf=[],centered=false,autoC=false,presN=0,x,fast,cal={k:0.75,o:1,s:0.8},eHold=null,lowN=0,resS=-99,resFloor=null,upN=0,warm=0,absBuf=[],ABS_MED=15,DEADB=5,DEADB_UP=15,dirS=null,lostN=0,lost=false;
  /* v1.08, the live mode (an experiment, off unless set('live',1)): see liveNoise and the background learnt round the palm below */
  var live=false,nD=0,nS=0,NXT=0.07,NXK=2,BURSTK=100,BEND=0,BMAX=0.4,NZH=1,NZG=4,nBase=null,nX=0,burst=0,nMin=null,nzK=null,nzC=null,nzS=null,nzP=null,nzN=0,zc=null,lagB=[],lagD=null,lagR=null,gStill=0,postB=0,fresh=0,EsR=-80,STILL=0.003,TAU_SW=10,TAU_ST=2,TAU_ALL=0.2,MOVW=0.3,BURST=1;
  function init(sampleRate,parity){
    fs=sampleRate; var df=fs/N; kLo=Math.ceil(18300/df); if(BAND_LO) kLo=Math.ceil(BAND_LO/df); kHi=Math.floor(20500/df); kc=Math.floor((kLo+kHi)/2);
    ks=[]; for(var k=kLo;k<=kHi;k++) if(parity===undefined||parity==='all'||k%2===parity) ks.push(k);
    M=ks.length; T=(parity===0||parity===1)?N/2:N;
    lam=C/(kc*df)*1000; mm=C/fs/2*1000; gA=Math.round(30/mm); gB=Math.round(300/mm); G=gB-gA;
    Pr=new Float64Array(M); Pi=new Float64Array(M);
    for(var q=0;q<M;q++){ var ph=Math.PI*q*q/M; Pr[q]=Math.cos(ph); Pi[q]=Math.sin(ph); }
    cosT=new Float64Array(M*N); sinT=new Float64Array(M*N);
    for(q=0;q<M;q++){ var w=-2*Math.PI*ks[q]/N; for(var n=0;n<N;n++){ cosT[q*N+n]=Math.cos(w*n); sinT[q*N+n]=Math.sin(w*n); } }
    d0=null; dref=null; eqW=null; eqDb=0; gN=null; drops=0; sinceDrop=1e9; covered=false; lastPeak=null; d0B=0; fineN=-1; fR=null; fI=null; refR=null; refI=null; acR=null; acI=null; acN=0; moveN=0; scanWait=0; relocks=0; boot=[]; prevH=null; hist=[]; prom=null; noProbe=false;
    ldP=null; ldQ=[]; UNWRAP=false; vPrev=null; vPrev2=null; unwN=0; HALF=false; lastFr=null; hRh=[]; hMh=[]; halfN=0; bgAcc=null; bgN=0; bgR=null; bgI=null; Es=-80; hold=0; present=false; refr=0; x=null; fast=0; eHold=null; ePres=0; why=""; rngBuf=[]; xBuf=[]; centered=false; presN=0; lowN=0; resS=-99; resFloor=null; upN=0; warm=0; absBuf=[]; dirS=null; lostN=0; lost=false; fzF=[]; fzA=[]; fzN=0; fzHold=0; frozen=false; frozenN=0; nD=0; nS=0; nBase=null; nX=0; burst=0; nMin=null; nzK=null; nzC=null; nzS=null; nzP=null; nzN=0; lagB=[]; lagD=null; lagR=null; gStill=0; postB=0; fresh=0; EsR=-80; zc=null;
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
    var prevFr=lastFr; if(HALF) lastFr=Float32Array.from(fr);
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
    /* live: the speaker-to-microphone gain is followed while the palm is there too (slowly), when the palm is 6 cm or more from the phone —
       closer, its echo leaks into the direct sound. A gain that fell by 4 dB mid-game had left the whole still room as «echo» */
    else if(live&&present&&!covered&&zc!==null&&(gA+zc)*mm>=60){ gN[0]+=0.01*(vd0[0]-gN[0]); gN[1]+=0.01*(vd0[1]-gN[1]); }
    var gm=gN[0]*gN[0]+gN[1]*gN[1], sq=Math.sqrt(dref), nr=sq*gN[0]/gm, ni=-sq*gN[1]/gm;
    var h=[new Float64Array(G),new Float64Array(G)];
    for(i=0;i<G;i++){ var v2=tap(H,(d0+gA+i)%T); h[0][i]=v2[0]*nr-v2[1]*ni; h[1][i]=v2[0]*ni+v2[1]*nr; }
    var hm=null; if(HALF&&prevFr&&prevFr.length===N&&fr.length===N){ var wn=new Float32Array(N); wn.set(prevFr.subarray(N/2)); wn.set(fr.subarray(0,N/2),N/2);
      var Hm=bandSpec(wn); for(i=0;i<M;i++){ var sgn=(ks[i]&1?-1:1)*(eqW?eqW[i]:1); Hm[0][i]*=sgn; Hm[1][i]*=sgn; }
      hm=[new Float64Array(G),new Float64Array(G)]; for(i=0;i<G;i++){ var v3=tap(Hm,(d0+gA+i)%T); hm[0][i]=v3[0]*nr-v3[1]*ni; hm[1][i]=v3[0]*ni+v3[1]*nr; } }
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
    /* live: the room's noise, from the tones just outside the probe's band (3–12 tones below and above it): the probe and its echoes never
       reach them — a palm's motion spreads its echo over all delays (tried: the far delays rose 20 dB with the palm in), but not out of
       the band. Their change from frame to frame is the noise; scaled to one delay of the response, it is taken off the motion energy and
       off the echo over the room. Noise in the band (keys, rustle, a kettle) had read as a moving palm and pulled the height to the middle */
    if(live){ if(!nzC){ nzK=[]; for(var kz=kLo-12;kz<=kLo-NZG;kz++) if(kz*fs/N>=14000) nzK.push(kz); for(kz=kHi+NZG;kz<=kHi+12;kz++) if(kz<N/2-2) nzK.push(kz);
        nzC=new Float64Array(nzK.length*N); nzS=new Float64Array(nzK.length*N); for(var jz=0;jz<nzK.length;jz++) for(n=0;n<N;n++){ var wz=NZH?0.5-0.5*Math.cos(2*Math.PI*n/N):1; nzC[jz*N+n]=wz*Math.cos(2*Math.PI*nzK[jz]*n/N); nzS[jz*N+n]=wz*Math.sin(2*Math.PI*nzK[jz]*n/N); } }
      var nzF=new Float64Array(2*nzK.length); for(jz=0;jz<nzK.length;jz++){ var zr0=0,zi0=0; for(n=0;n<N;n++){ zr0+=fr[n]*nzC[jz*N+n]; zi0+=fr[n]*nzS[jz*N+n]; } nzF[2*jz]=zr0; nzF[2*jz+1]=zi0; }
      if(nzP&&nzK.length){ var dz=new Float64Array(nzK.length); for(jz=0;jz<nzK.length;jz++){ var u1=nzF[2*jz]-nzP[2*jz], u2=nzF[2*jz+1]-nzP[2*jz+1]; dz[jz]=u1*u1+u2*u2; }
        var sw2=0; for(var qz=0;qz<M;qz++) sw2+=eqW?eqW[qz]*eqW[qz]:1;
        // one tone's noise power (the median of a noise power is 0.69 of its mean; a difference of two frames doubles it) → one delay of the
        // response: Σ over the band's tones /N², the normalisation by the direct sound; the same as the change of one delay over L frames
        var md=Array.prototype.slice.call(dz).sort(function(p,q){return p-q;})[dz.length>>1]/0.69/2/(NZH?0.375:1)*sw2/(N*N)*dref/(gN[0]*gN[0]+gN[1]*gN[1]);
        if(nzN++===0){ nD=md; nS=md; } nD+=0.15*(md-nD); nS+=(1-Math.exp(-1/(NXT*fs/N)))*(md-nS);
        /* a burst of noise (keys, a spoon): 20 dB over the quiet of the last seconds (nMin: the least noise, rising 10 dB in 5 s; the palm
           itself coming and going lifts these tones 10–16 dB, the labelled recordings). While it lasts and until it falls back to 6 dB
           over that quiet, nothing is decided: the palm is neither taken nor dropped, nothing learnt, the echo's centre does not pull the
           height (the motion still steers: the game's own sounds are such bursts, 35–90 in a game, and freezing it lost the palm's moves).
           Never longer than 0.4 s: a noise that stays (a kettle) is the room's noise then */
        nMin=nMin===null?nD:Math.min(nMin*Math.pow(10,1/(5*fs/N)),nD);
        if(BURST&&!burst&&md>BURSTK*nMin) burst=1; else if(burst&&((BEND?nD:md)<4*nMin||++burst>BMAX*fs/N)){ if(burst>BMAX*fs/N) nMin=nD; burst=0; }   // by this frame's own noise: it starts and ends at once
        nX=nBase===null?0:Math.max(0,nS-NXK*nBase); }   // the noise over twice the room's own when its empty level was learnt: only that is taken off (the estimate itself wavers ±3 dB)
      nzP=nzF; }
    if(!prevH){ prevH=h; return null; }
    var h2=[new Float64Array(G),new Float64Array(G)];
    for(i=0;i<G;i++){ h2[0][i]=0.5*(h[0][i]+prevH[0][i]); h2[1][i]=0.5*(h[1][i]+prevH[1][i]); }
    prevH=h;
    if(bgR===null){                                    // фон пустой комнаты
      if(!bgAcc) bgAcc=[new Float64Array(G),new Float64Array(G)];
      for(i=0;i<G;i++){ bgAcc[0][i]+=h2[0][i]; bgAcc[1][i]+=h2[1][i]; }
      if(++bgN>=BG_N){ bgR=new Float64Array(G); bgI=new Float64Array(G); for(i=0;i<G;i++){ bgR[i]=bgAcc[0][i]/bgN; bgI[i]=bgAcc[1][i]/bgN; } }
      hist.push(h2); if(hist.length>L+2) hist.shift(); if(HALF){ if(hist.length===1){ hRh=[]; hMh=[]; } hRh.push(h); hMh.push(hm); if(hRh.length>L+2){ hRh.shift(); hMh.shift(); } }
      return null;
    }
    hist.push(h2); if(hist.length>L+2) hist.shift(); if(HALF){ if(hist.length===1){ hRh=[]; hMh=[]; } hRh.push(h); hMh.push(hm); if(hRh.length>L+2){ hRh.shift(); hMh.shift(); } }
    if(hist.length<L+2) return null;
    // быстрое: скорость вращения фазы по всей полосе
    var a1=hist[L+1],b1=hist[1],a0=hist[L],b0=hist[0],rr=0,ri=0,e=0,mz=0,mzw=0, nXg=live?nX:0;
    for(i=0;i<G;i++){ var g1r=a1[0][i]-b1[0][i],g1i=a1[1][i]-b1[1][i],g0r=a0[0][i]-b0[0][i],g0i=a0[1][i]-b0[1][i];
      rr+=g1r*g0r+g1i*g0i; ri+=g1i*g0r-g1r*g0i; var em=g1r*g1r+g1i*g1i; e+=em; if(live){ var ex0=em-nD; if(ex0>0){ mz+=ex0*i; mzw+=ex0; } } }
    var eR=e; if(live) e=Math.max(e-G*nXg,e*1e-4);
    var E=10*Math.log10(e/dref+1e-30), phR=Math.atan2(ri,rr);
    if(HALF&&hRh.length===L+2&&hMh[L+1]&&hMh[1]){ var pR=hRh, pM=hMh, x1r=0,x1i=0,x2r=0,x2i=0;   // g(n−1), g(n−½), g(n): разности через L кадров
      for(i=0;i<G;i++){ var gpr=pR[L][0][i]-pR[0][0][i], gpi=pR[L][1][i]-pR[0][1][i], gcr=pR[L+1][0][i]-pR[1][0][i], gci=pR[L+1][1][i]-pR[1][1][i], gmr=pM[L+1][0][i]-pM[1][0][i], gmi=pM[L+1][1][i]-pM[1][1][i];
        x1r+=gmr*gpr+gmi*gpi; x1i+=gmi*gpr-gmr*gpi; x2r+=gcr*gmr+gci*gmi; x2i+=gci*gmr-gcr*gmi; }
      phR=Math.atan2(x1i,x1r)+Math.atan2(x2i,x2r); halfN++; }
    if(UNWRAP&&vPrev!==null&&vPrev2!==null&&E>T_INT+10){ var phP=-vPrev*4*Math.PI/lam, phQ=-vPrev2*4*Math.PI/lam, phF=2*phP-phQ, PI2=2*Math.PI;
      phF=phP+0.5*(phP-phQ);
      if(Math.abs(phP)>Math.PI/3&&Math.abs(phP-phQ)<0.6*Math.PI){ var kW=Math.max(-1,Math.min(1,Math.round((phF-phR)/PI2))); if(kW){ phR+=kW*PI2; unwN++; } } }
    var vel=-phR*lam/(4*Math.PI); vPrev2=E>T_INT?vPrev:null; vPrev=E>T_INT?vel:null;
    // live: where the palm moves — the centre of the motion (still things have none); kept while the palm holds still
    if(live&&mzw>0&&E>T_INT){ var zn=mz/mzw; zc=zc===null?zn:zc+0.3*(zn-zc); }
    // live: how much each tap changed over the last second, and how much stands over the room there (both smoothed, τ 0.15 s)
    if(live){ lagB.push(h2); var LG=Math.round(fs/N); if(lagB.length>LG+1) lagB.shift();
      if(lagB.length===LG+1&&!(burst>0)){ var o1=lagB[0], aG=1-Math.exp(-1/(0.15*fs/N)); if(!lagD){ lagD=new Float64Array(G); lagR=new Float64Array(G); for(i=0;i<G;i++) lagD[i]=1e30; }
        var sD1=0, sR1=0;
        for(i=0;i<G;i++){ var q1=h2[0][i]-o1[0][i], q2=h2[1][i]-o1[1][i], q3=h2[0][i]-bgR[i], q4=h2[1][i]-bgI[i]; sD1+=q1*q1+q2*q2; sR1+=q3*q3+q4*q4;
          lagD[i]=lagD[i]>1e29?q1*q1+q2*q2:lagD[i]+aG*(q1*q1+q2*q2-lagD[i]); lagR[i]+=aG*(q3*q3+q4*q4-lagR[i]); }
        // and all the taps together, frame by frame (the sum over 76 taps is steady enough): «all of it stands still» 5 frames running
        gStill=sD1-G*nD<STILL*Math.max(0,sR1-G*nD/2)?gStill+1:0; } }
    // медленное: центр тяжести эха относительно пустой комнаты
    /* 1.56q (лаба, «Струна»): ближнее сильное эхо — профиль эха по дальности за последние 5 кадров, первый горб не слабее 45% самого сильного.
       Записи с линейкой 06.10 21:39 (кулак): на обоих телефонах ложится на линейку до ~1 см, «вверх» и «вниз» совпадают; центр эха (range) —
       ошибка до 6 см (дальние отражения запястья, предплечья тянут его). На остальное не влияет: только выход lead (мм) */
    if(!ldP||ldP.length!==G){ ldP=new Float64Array(G); ldS=new Float64Array(G); ldQ=[]; }
    var sw=0,sx=0,swr=0,nH=live?nX/2:0; for(i=0;i<G;i++){ var dr=h2[0][i]-bgR[i],di=h2[1][i]-bgI[i],p0=dr*dr+di*di,p=p0-nH; if(p<0) p=0; if(live&&lagD&&lagD[i]<1e29) p*=Math.min(1,Math.max(0,lagD[i]-nD)/(MOVW*Math.max(1e-30,lagR[i]-nD/2))); swr+=p0; sw+=p; sx+=p*(gA+i); if(ldP) ldP[i]=p; }
    var ldC=Float64Array.from(ldP); ldQ.push(ldC); for(i=0;i<G;i++) ldS[i]+=ldC[i]; if(ldQ.length>5){ var ldO=ldQ.shift(); for(i=0;i<G;i++) ldS[i]-=ldO[i]; }
    var ldM=0, ldJ=-1; for(i=0;i<G;i++) if(ldS[i]>ldM) ldM=ldS[i]; for(i=1;i<G-1&&ldM>0;i++) if(ldS[i]>=0.45*ldM&&ldS[i]>=ldS[i-1]&&ldS[i]>=ldS[i+1]){ ldJ=i; break; }
    var lead=null; if(ldJ>0){ var ly0=ldS[ldJ-1], ly1=ldS[ldJ], ly2=ldS[ldJ+1], lq=ly0-2*ly1+ly2; lead=(gA+ldJ+(lq<0?0.5*(ly0-ly2)/lq:0))*mm; }   // live: the noise's share of each tap off the centre
    var range=sx/(sw||1e-30)*mm, abs=cal.k*range+cal.o;
    var fpsF=fs/N, aE=1-Math.exp(-1/(tauE*fpsF)); Es+=aE*(E-Es); EsR+=aE*(10*Math.log10(eR/dref+1e-30)-EsR);   // live: EsR — with the noise in (the room's quiet frames are judged by it: noise taken off must not make a stir look quiet)
    var resE=10*Math.log10(swr/dref+1e-30); resS+=0.2*(resE-resS);
    // live: the empty room's level counts the noise too — louder noise lifts it (a palm's echo must stand over both to come or to stay)
    var fl=resFloor; if(live&&resFloor!==null) fl=10*Math.log10(Math.pow(10,resFloor/10)+G*nH/dref+1e-30);
    // появление — только по движению: дрейф фона так не выглядит
    if(live){ if(burst>0) postB=Math.round(0.2*fpsF); else if(postB>0) postB--; }
    if(Es>T_ON&&refr===0&&!(live&&(burst>0||postB>0))) hold=Math.max(hold,Math.round(HOLD_S*fpsF));   // live: a burst's own stir (and its tail) is not a palm's
    var moving=hold>0; if(hold>0) hold--;
    var was=present;
    if(live&&burst>0){}
    else if(!present){
      // уровень пустой комнаты учится только на тихих кадрах: если ладонь уже рядом и шевелится при старте,
      // он не выучит её эхо как «пустоту» (иначе потом неподвижная рука не видна — «видна рывками»)
      // v0.91 (the maintainer's race, 29 Sep 22:10: the palm lost 15 times — while it counted as gone the empty-room level crept up to the
      // palm's echo, and each loss made the next one easier): during a game the level stays as the getting ready left it (holdFloor);
      // the wait before a palm may be taken back 0.7 → 0.35 s. Checked on 13 game logs: the losses there 15 → 4, the time without the
      // palm 7.2% → 1.5%; the other logs unchanged, no new comings and goings
      if((live?EsR:Es)<Q_FLOOR&&!(holdFloor&&resFloor!==null)){ if(resFloor===null) resFloor=resS;
        warm++;
        var tf=warm<fpsF?0.15:1.0;                                // первую секунду уровень пустой комнаты только учится
        resFloor+=(1-Math.exp(-1/(tf*fpsF)))*(resS-resFloor); if(live){ nBase=nBase===null?nD:nBase+(1-Math.exp(-1/(tf*fpsF)))*(nD-nBase); } }
      if(resFloor!==null&&warm>=fpsF&&resS>fl+15&&!(fresh>0)) upN++; else upN=0;   // вход по резкому росту эха над пустой комнатой
      if(refr===0&&(moving||upN>=4)){ present=true; eHold=resS; ePres=resS; lowN=0; why=moving?'движение':'эхо'; upN=0; }
    }
    else {
      // остаётся, пока её эхо заметно выше пустой комнаты — даже неподвижная и в «тихой» позе.
      // Уходит, когда эхо опустилось почти до пустоты. Сравнивать с пиком нельзя: эхо сильно зависит от позы ладони.
      // Второй признак ухода: эхо упало на 18 дБ ниже своего уровня с рукой (поза меняет эхо лишь на ~10 дБ) и близко к пустоте.
      if(resS>ePres-6) ePres+=(1-Math.exp(-1/fpsF))*(resS-ePres);
      var lowF=resFloor!==null&&resS<fl+10, lowD=resS<ePres-18&&(resFloor===null||resS<fl+15||(live&&Es<Q_FLOOR));   // live: 18 dB under the palm's own and nothing moving — gone, whatever the room kept of it
      if(lowF||lowD) lowN++; else lowN=0;
      if(lowN>=Math.round(0.3*fpsF)){ present=false; refr=Math.round(REFR_S*fpsF); hold=0; if(live) fresh=Math.round(0.6*fpsF); why=lowF?'уход: эхо у пустоты':'уход: эхо упало'; }
    }
    if(refr>0) refr--;
    var started=present&&!was;
    // live: the room is learnt without the palm only on quiet frames — the frames before a coming palm counts as «there» (it moves) left
    // a few per cent of its echo in the room, and that stayed once it went
    /* live: the palm has just gone — what its echo leaves (what the room learnt of it, a thing put down meanwhile) is room now: learnt at
       once (0.6 s, τ 0.15 s), and meanwhile it may not count as a palm by its echo (only by moving) */
    if(live&&fresh>0){ fresh--; if(!present&&!covered&&!(burst>0)){ var aF=1-Math.exp(-1/(0.15*fpsF)); for(i=0;i<G;i++){ bgR[i]+=aF*(h2[0][i]-bgR[i]); bgI[i]+=aF*(h2[1][i]-bgI[i]); } } else fresh=0; }
    else if(!present&&!covered&&!(live&&(EsR>=Q_FLOOR||burst>0))){ var aB=1-Math.exp(-1/(TAU_BG*fpsF));      // без руки фон тихо обновляется
      for(i=0;i<G;i++){ bgR[i]+=aB*(h2[0][i]-bgR[i]); bgI[i]+=aB*(h2[1][i]-bgI[i]); } }
    /* с 0.44 (27.09, Redmi, рука у фронтальной камеры): после подготовки рядом появилось неподвижное эхо (~7 см), которого не было в пустой
       комнате, — абсолютная часть «застыла» на нём (дальность 6,5–8,2 см при руке, ходившей на 5–10 см), согласие частей 0,05, и она
       тянула корабль к одной высоте («уводит»). Если за 2 с быстрая часть прошла ≥ 30 мм, а абсолютная — меньше 0,35 от этого, фон учится
       и при руке (τ 10 с) ещё 10 с: движущаяся ладонь в фон не попадает (её эхо вращается по фазе и усредняется), неподвижное — уходит.
       Прогон журналов подготовки: Redmi 0.10 → 0.29, остальные 15 — без изменений (14) или лучше; записи с меткой — те же до цифры */
    /* live: with the palm there, the room is learnt too — tap by tap, where the echo has stood still for the last second: its change over
       1 s is under 0.003 (−25 dB) of what stands over the room there. A held palm still drifts and trembles (labelled recordings, holds:
       −25…0 dB, mostly over −20); a cup, a laptop lid, a phone's own leftovers — −30…−55 dB. So a thing that appears or goes mid-game
       becomes room in a few seconds, and the moving palm never does */
    else if(live&&!covered&&burst===0&&lagD){ var aL=1-Math.exp(-1/(TAU_ST*fpsF));
      var fz=present&&(frozen||fzHold>0); if(fz&&fzHold>0) fzHold--; var aW=fz?1-Math.exp(-1/(TAU_SW*fpsF)):0;
      if(gStill>=5){ aL=1-Math.exp(-1/(TAU_ALL*fpsF)); aW=aL; }   // all of it stands still (what is left of a palm that went, a thing): learnt at once
      for(i=0;i<G;i++){ var aT=lagD[i]-nD<STILL*Math.max(0,lagR[i]-nD/2)?aL:aW; bgR[i]+=aT*(h2[0][i]-bgR[i]); bgI[i]+=aT*(h2[1][i]-bgI[i]); } }
    else if(present&&!covered&&(frozen||fzHold>0)){ if(fzHold>0) fzHold--; var aP=1-Math.exp(-1/(10*fpsF));
      for(i=0;i<G;i++){ bgR[i]+=aP*(h2[0][i]-bgR[i]); bgI[i]+=aP*(h2[1][i]-bgI[i]); } }
    if(E>T_INT) fast+=vel;                                   // сырое смещение — для калибровки
    if(!covered&&!(live&&burst>0)){ absBuf.push(abs); if(absBuf.length>ABS_MED) absBuf.shift(); }
    if(present&&!covered){ fzF.push(fast*cal.s); fzA.push(abs); if(fzF.length>Math.round(2*fpsF)){ fzF.shift(); fzA.shift(); }
      if(++fzN%10===0&&fzF.length>=Math.round(2*fpsF)){ var pf=Math.max.apply(null,fzF)-Math.min.apply(null,fzF), pa=Math.max.apply(null,fzA)-Math.min.apply(null,fzA);
        frozen=pf>=30&&pa<0.35*pf; if(frozen){ fzHold=Math.round(10*fpsF); frozenN++; } } } else { fzF=[]; fzA=[]; frozen=false; fzHold=0; }
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
      if(!covered&&!(live&&burst>0)){ var up=eAvg>0&&x<100, kq=up?1:1+(eAvg/E_FAST)*(eAvg/E_FAST);
      eAvg+=(1-Math.exp(-kq/(TE*fpsF)))*((absM-x)-eAvg);
      var db=up?DEADB_UP:DEADB, ex=Math.abs(eAvg)>db?eAvg-(eAvg>0?db:-db):0, dx=(1-Math.exp(-kq/(TAU*fpsF)))*ex;
      x+=dx; eAvg-=dx; } }
    // память последней секунды с рукой — для центровки; первая центровка сама, через 0,8 с после появления руки
    if(present){ rngBuf.push(range); xBuf.push(x); if(rngBuf.length>Math.round(fpsF)){ rngBuf.shift(); xBuf.shift(); } presN++; }
    else { rngBuf=[]; xBuf=[]; presN=0; }
    if(autoC&&!centered&&presN>=Math.round(0.8*fpsF)) recenter();
    return {present:present,started:started,height:x,abs:abs,range:range,fast:fast,E:E,resE:resS,floor:resFloor,Em:Es,why:why,lead:lead};
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
    set:function(k,v){ if(k==='flo') BAND_LO=v||null; if(k==='tint') T_INT=v; if(k==='tau') TAU=v; if(k==='absmed') ABS_MED=Math.max(1,Math.round(v)); if(k==='deadband') DEADB=Math.max(0,v); if(k==='autocenter') autoC=!!v; if(k==='unwrap') UNWRAP=!!v; if(k==='half') HALF=!!v; if(k==='holdfloor') holdFloor=!!v; if(k==='live') live=!!v; if(k==='tausw') TAU_SW=v; if(k==='taust') TAU_ST=v; if(k==='still') STILL=v; if(k==='tauall') TAU_ALL=v; if(k==='movw') MOVW=v; if(k==='burst') BURST=v; if(k==='nxt') NXT=v; if(k==='nxk') NXK=v; if(k==='burstk') BURSTK=v; if(k==='bend') BEND=v; if(k==='bmax') BMAX=v; if(k==='nzh'){ NZH=v; nzC=null; } if(k==='nzg'){ NZG=v; nzC=null; } },
    info:function(){ return {covered:covered,eq_db:eqDb,eq:!!eqW,relocks:relocks,drops:drops,d0:d0,prom:prom,noProbe:noProbe,lost:lost,ready:bgR!==null,mm:mm,centered:centered,band:[kLo,kHi],frozen:frozenN,unw:unwN,half:halfN,cal:{k:cal.k,o:cal.o,s:cal.s},live:live,noise:live?+(10*Math.log10(nD/dref+1e-30)).toFixed(1):null,zone:zc===null?null:+((gA+zc)*mm).toFixed(0)}; }};
})();
