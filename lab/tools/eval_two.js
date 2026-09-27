/* Разбор «Двух ладоней» (sonartwo_*.wav, с 27.09, 0.39o) и «Кулака и ладони» (sonarfist_*.wav, 0.39p: сила эха, разброс скорости и по расстоянию — узнаётся ли рука по эху): карта «расстояние × скорость» по одному микрофону.
   Каждый кадр (512 отсчётов) — отклик на частотах зонда, делённый на сам зонд; из отклика вычитаю медленное среднее (0,5 с) — остаётся
   только то, что движется; обратным преобразованием — «движущееся эхо» по расстоянию (шаг 3,6 мм, разрешение ~8 см при полосе 2,2 кГц).
   По каждому расстоянию — спектр по времени (окно 0,34 с): скорость к телефону и от него (шаг ~26 мм/с).
   По фазам записи считаю:
   - «обе стороны» B = min(E к, E от)/max(E к, E от) в каждом окне, среднее по фазе: вместе — мало, по очереди — много;
   - где по расстоянию движение к телефону и от него (середины энергии), и сколько отдельных пятен по расстоянию (для «близко/далеко»);
   - левая против правой: те же числа — если одинаковы, лево и право не различимы.
   Картинка расстояние × время (красное — к телефону, синее — от) — out/<имя>.ppm (и .png, если есть python3 с PIL).
   Запуск: node eval_two.js запись.wav [...] | node eval_two.js --synth — синтетическая запись по сценарию. */
const C=require('./common'), fs=require('fs'), path=require('path');
const SR=48000, N=512, FR=SR/N, MMS=343e3/SR/2;          // мм расстояния на отсчёт задержки (туда-обратно)
function probeSpec(flo){ const df=SR/N, kLo=Math.ceil(flo/df), kHi=Math.floor(20500/df), ks=[]; for(let k=kLo;k<=kHi;k++) ks.push(k);
  const M=ks.length, pr=new Float64Array(N); for(let n=0;n<N;n++){ let s=0; for(let q=0;q<M;q++) s+=Math.cos(2*Math.PI*ks[q]*n/N+Math.PI*q*q/M); pr[n]=s; }
  return ks.map(k=>{ let re=0,im=0; for(let n=0;n<N;n++){ re+=pr[n]*Math.cos(2*Math.PI*k*n/N); im-=pr[n]*Math.sin(2*Math.PI*k*n/N); } return {k,re,im}; }); }
/* движущееся эхо по расстоянию (общая часть; её же берёт eval_stereo.js для каждого канала); t0 — задержка прямого сигнала (можно задать) */
function motion(meta,x,t0fix){ const P=probeSpec((meta.probe&&meta.probe.f_lo)||18300), M=P.length, F=Math.floor(x.length/N);
  const cs=P.map(p=>Float64Array.from({length:N},(_,n)=>Math.cos(2*Math.PI*p.k*n/N))), sn=P.map(p=>Float64Array.from({length:N},(_,n)=>Math.sin(2*Math.PI*p.k*n/N)));
  // отклик по частотам, делённый на зонд
  const Hr=[],Hi=[]; for(let f=0;f<F;f++){ const o=f*N, hr=new Float64Array(M), hi=new Float64Array(M);
    for(let q=0;q<M;q++){ let re=0,im=0; const c=cs[q], s=sn[q]; for(let n=0;n<N;n++){ const v=x[o+n]; re+=v*c[n]; im-=v*s[n]; } const pr=P[q].re, pi=P[q].im, d=pr*pr+pi*pi; hr[q]=(re*pr+im*pi)/d; hi[q]=(im*pr-re*pi)/d; }
    Hr.push(hr); Hi.push(hi); }
  // прямой сигнал — задержка пика отклика по пустой комнате (первые 2 с)
  const TAU=[]; for(let t=0;t<N;t+=0.25) TAU.push(t); const e0=Math.min(F,Math.round(2*FR)), avr=new Float64Array(M), avi=new Float64Array(M);
  for(let f=0;f<e0;f++) for(let q=0;q<M;q++){ avr[q]+=Hr[f][q]/e0; avi[q]+=Hi[f][q]/e0; }
  let t0=0,best=-1; if(t0fix!==undefined){ t0=t0fix; best=1; } else TAU.forEach(t=>{ let re=0,im=0; for(let q=0;q<M;q++){ const a=2*Math.PI*P[q].k*t/N; re+=avr[q]*Math.cos(a)-avi[q]*Math.sin(a); im+=avr[q]*Math.sin(a)+avi[q]*Math.cos(a); } const m=re*re+im*im; if(m>best){ best=m; t0=t; } });
  // движущееся эхо: минус медленное среднее (0,5 с), по расстояниям 30–300 мм
  const R=[]; for(let mm=30;mm<=300;mm+=MMS) R.push(mm); const nR=R.length, a=1-Math.exp(-1/(0.5*FR)), mr=new Float64Array(M), mi=new Float64Array(M);
  const DR=[],DI=[]; for(let f=0;f<F;f++){ for(let q=0;q<M;q++){ if(f===0){ mr[q]=Hr[0][q]; mi[q]=Hi[0][q]; } mr[q]+=a*(Hr[f][q]-mr[q]); mi[q]+=a*(Hi[f][q]-mi[q]); }
    const dr=new Float64Array(nR), di=new Float64Array(nR);
    for(let j=0;j<nR;j++){ const t=t0+R[j]/MMS; let re=0,im=0; for(let q=0;q<M;q++){ const ang=2*Math.PI*P[q].k*t/N, c=Math.cos(ang), s=Math.sin(ang), vr=Hr[f][q]-mr[q], vi=Hi[f][q]-mi[q]; re+=vr*c-vi*s; im+=vr*s+vi*c; } dr[j]=re; di[j]=im; }
    DR.push(dr); DI.push(di); }
  return {P,M,F,R,nR,DR,DI,t0}; }
function analyse(meta,x,opt){ opt=opt||{}; const {F,R,nR,DR,DI,t0}=motion(meta,x);
  // скорость: окно 32 кадра (0,34 с), шаг 8; знак: + — к телефону (проверено на синтетике)
  const W=32, HOP=8, han=Float64Array.from({length:W},(_,i)=>0.5-0.5*Math.cos(2*Math.PI*i/(W-1))), VB=FR/W*343e3/(2*19400), win=[];
  for(let s=0;s+W<=F;s+=HOP){ const Ep=new Float64Array(nR), Em=new Float64Array(nR), Vs=new Float64Array(W/2);
    for(let j=0;j<nR;j++){ for(let b=1;b<W/2;b++){ let pr=0,pi=0,mr2=0,mi2=0; for(let i=0;i<W;i++){ const ang=2*Math.PI*b*i/W, c=Math.cos(ang), sn2=Math.sin(ang), vr=DR[s+i][j]*han[i], vi=DI[s+i][j]*han[i];
            pr+=vr*c+vi*sn2; pi+=vi*c-vr*sn2; mr2+=vr*c-vi*sn2; mi2+=vi*c+vr*sn2; }
          Ep[j]+=pr*pr+pi*pi; Em[j]+=mr2*mr2+mi2*mi2; Vs[b]+=pr*pr+pi*pi+mr2*mr2+mi2*mi2; } }
    win.push({t:(s+W/2)/FR,Ep,Em,Vs}); }
  const tot=w=>{ let p=0,m=0; for(let j=0;j<nR;j++){ p+=w.Ep[j]; m+=w.Em[j]; } return [p,m]; };
  const cen=arr=>{ let s=0,sw=0; for(let j=0;j<nR;j++){ s+=arr[j]*R[j]; sw+=arr[j]; } return sw>0?s/sw:NaN; };
  // пятна по расстоянию: местные максимумы не слабее −12 дБ от главного и не ближе 50 мм друг к другу
  const blobs=w=>{ const e=R.map((_,j)=>w.Ep[j]+w.Em[j]), mx=Math.max(...e), pk=[]; for(let j=1;j<nR-1;j++) if(e[j]>=e[j-1]&&e[j]>=e[j+1]&&e[j]>mx*0.063) pk.push(j);
    pk.sort((p,q)=>e[q]-e[p]); const keep=[]; pk.forEach(j=>{ if(keep.every(k=>Math.abs(R[k]-R[j])>=50)) keep.push(j); }); return keep.length; };
  // фазы
  const mk=meta.marks||{}, keys=Object.keys(mk).sort((p,q)=>mk[p]-mk[q]), ph=[];
  keys.forEach((k,i)=>{ const a1=mk[k]/SR+0.8, b1=(i+1<keys.length?mk[keys[i+1]]/SR:x.length/SR)-0.3; const ws=win.filter(w=>w.t>=a1&&w.t<b1); if(!ws.length) return;
    const noise=win.filter(w=>w.t<(mk.place!==undefined?mk.place/SR:3)-0.3).map(w=>{ const [p,m]=tot(w); return p+m; }); const nz=noise.length?noise.reduce((u,v)=>u+v,0)/noise.length:0;
    let B=0,E=0,Pp=0,Pm=0,cp=[],cm=[],bl=[],vsp=[],rsp=[]; ws.forEach(w=>{ const [p,m]=tot(w); E+=p+m; Pp+=p; Pm+=m;
      { let a2=0,b2=0,c2=0; for(let b=1;b<W/2;b++){ const v=b*VB; a2+=w.Vs[b]; b2+=w.Vs[b]*v; c2+=w.Vs[b]*v*v; } const mv=b2/a2; vsp.push(Math.sqrt(Math.max(0,c2/a2-mv*mv))/Math.max(mv,1)); }
      { let a3=0,b3=0,c3=0; for(let j=0;j<nR;j++){ const e=w.Ep[j]+w.Em[j]; a3+=e; b3+=e*R[j]; c3+=e*R[j]*R[j]; } const mr3=b3/a3; rsp.push(Math.sqrt(Math.max(0,c3/a3-mr3*mr3))); } B+=Math.min(p,m)/Math.max(p,m,1e-30); const c1=cen(w.Ep), c2=cen(w.Em); if(p>m*0.3) cp.push(c1); if(m>p*0.3) cm.push(c2); bl.push(blobs(w)); });
    const med=a2=>{ a2=a2.filter(v=>!isNaN(v)).sort((u,v)=>u-v); return a2.length?a2[a2.length>>1]:NaN; };
    ph.push({k,vspread:med(vsp),rspread:med(rsp),B:B/ws.length,snr:10*Math.log10((E/ws.length)/Math.max(nz,1e-30)),toward:100*Pp/(Pp+Pm),cp:med(cp),cm:med(cm),blobs:med(bl),n:ws.length}); });
  if(opt.img) image(opt.img,win,nR);
  return {t0,phases:ph,VB,win}; }
function image(file,win,nR){ const W=win.length, Hh=nR; let mx=0; win.forEach(w=>{ for(let j=0;j<nR;j++) mx=Math.max(mx,w.Ep[j],w.Em[j]); });
  const buf=Buffer.alloc(W*Hh*3); win.forEach((w,x)=>{ for(let j=0;j<nR;j++){ const y=j, p=Math.min(1,Math.sqrt(w.Ep[j]/mx)*1.6), m=Math.min(1,Math.sqrt(w.Em[j]/mx)*1.6), o=(y*W+x)*3; buf[o]=Math.round(255*p); buf[o+1]=Math.round(60*Math.min(p,m)); buf[o+2]=Math.round(255*m); } });
  fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,Buffer.concat([Buffer.from(`P6\n${W} ${Hh}\n255\n`),buf]));
  try{ require('child_process').execSync(`python3 -c "from PIL import Image; im=Image.open('${file}'); im=im.resize((im.width*2,im.height*2)); im.save('${file.replace(/\.ppm$/,'.png')}')"`,{stdio:'ignore'}); }catch(e){} }
const NAME={fL:'кулак слева (двигается)',pR:'ладонь справа (двигается)',bothA:'кулак+ладонь вместе',swap:'поменял руки',pL:'ладонь слева (двигается)',fR:'кулак справа (двигается)',bothB:'ладонь+кулак вместе',place:'ладони стоят',both:'обе вместе',alt:'по очереди',left:'только левая',right:'только правая',nl:'левая близко, правая далеко',nr:'правая близко, левая далеко',away:'руки убраны',empty:'пусто'};
function report(name,meta,x,opt){ const A=analyse(meta,x,opt); console.log(`\n== ${name} == | прямой сигнал на ${A.t0.toFixed(2)} отсчёта | шаг скорости ${A.VB.toFixed(0)} мм/с`);
  A.phases.forEach(p=>console.log(`  ${(NAME[p.k]||p.k).padEnd(30)} движение над тишиной ${p.snr.toFixed(0).padStart(3)} дБ | обе стороны скорости B=${p.B.toFixed(2)} | к телефону ${p.toward.toFixed(0).padStart(3)}% | где «к» ${isNaN(p.cp)?'—':p.cp.toFixed(0)} мм, «от» ${isNaN(p.cm)?'—':p.cm.toFixed(0)} мм | пятен по расстоянию ${p.blobs}`));
  const g=k=>A.phases.find(p=>p.k===k);
  if(g('fL')&&g('pR')&&g('pL')&&g('fR')){ A.phases.filter(p=>['fL','pR','pL','fR','bothA','bothB'].includes(p.k)).forEach(p=>console.log(`  ${(NAME[p.k]||p.k).padEnd(30)} сила ${p.snr.toFixed(1)} дБ | разброс скорости ${p.vspread.toFixed(2)} | разброс по расстоянию ${p.rspread.toFixed(0)} мм`));
    const d=(a,b,k)=>g(a)[k]-g(b)[k], ks=[['snr','сила, дБ',1],['vspread','разброс скорости',0.05],['rspread','разброс по расстоянию, мм',3]];
    ks.forEach(([k,nm,thr])=>{ const x1=d('pR','fL',k), x2=d('pL','fR',k), side=Math.abs(d('pL','pR',k))+Math.abs(d('fL','fR',k)); const ok=Math.sign(x1)===Math.sign(x2)&&Math.min(Math.abs(x1),Math.abs(x2))>thr&&Math.min(Math.abs(x1),Math.abs(x2))>side/2;
      console.log(`  ВЫВОД ${nm}: ладонь − кулак ${x1.toFixed(2)} (ладонь справа) и ${x2.toFixed(2)} (ладонь слева); та же рука слева − справа в сумме ${side.toFixed(2)} → ${ok?'кулак и ладонь РАЗЛИЧИМЫ по этому признаку':'не различимы'}`); });
    A.fist=ks.map(([k])=>({k,x1:d('pR','fL',k),x2:d('pL','fR',k)})); }
  if(g('both')&&g('alt')) console.log(`  ВЫВОД: вместе B=${g('both').B.toFixed(2)}, по очереди B=${g('alt').B.toFixed(2)} — ${g('alt').B>1.5*g('both').B?'различимы':'НЕ различимы'}`+(g('left')&&g('right')?`; левая/правая: B ${g('left').B.toFixed(2)}/${g('right').B.toFixed(2)}, «к» ${g('left').cp.toFixed(0)}/${g('right').cp.toFixed(0)} мм, сила ${g('left').snr.toFixed(0)}/${g('right').snr.toFixed(0)} дБ`:''));
  return A; }
/* синтетическая запись по сценарию страницы (SCRIPT_TWO из собранной лабы): две ладони — два отражателя на своих расстояниях */
function synth(variant){ const S=require('./eval_right'), js=C.appJs(), i=js.indexOf('var TWO_M='), src=js.slice(i,js.indexOf('var twoVar=',i)), fist=variant==='fist';
  const SC=new Function(src+'\nreturn '+(fist?'SCRIPT_FIST':'SCRIPT_TWO')+';')(), TOT=SC[SC.length-1].t, F=Math.floor(TOT*FR), x=new Float32Array(F*N), marks={};
  let cur=-1; for(let f=0;f<F;f++){ const t=f/FR; let k=SC.length-1; while(SC[k].t>t) k--; if(k!==cur){ cur=k; if(SC[k].k!=='end') marks[SC[k].k]=f*N; }
    const s=SC[k], L=s.L?s.L(t):null, R=s.R?s.R(t):null;
    // «кулак и ладонь»: кулак — одна точка послабее; ладонь — три точки (пальцы чуть впереди и подрагивают) посильнее; после «поменяй» — наоборот
    const swapped=fist&&t>=30, hand=(d,isFist)=>d===null?[]:isFist?[{d,a:0.12}]:[{d,a:0.2},{d:d-12+3*Math.sin(t*37),a:0.12},{d:d+10,a:0.1}];
    const list=fist?hand(L,!swapped).concat(hand(R,swapped)):[{d:L,a:0.22},{d:R,a:0.2}];
    x.set(S.synthMulti(list,f*7+3),f*N); }
  return {meta:{kind:'two-portrait',variant:fist?'fist':'two',marks,probe:{f_lo:+js.match(/F_LO=(\d+)/)[1]}},x}; }
module.exports={analyse,report,synth,motion,probeSpec};
if(require.main===module){ const args=process.argv.slice(2);
  if(args[0]==='--synth'){ const v=args[1]==='fist'?'fist':'two', {meta,x}=synth(v); report('синтетика по сценарию «'+(v==='fist'?'кулак и ладонь':'две ладони')+'»',meta,x,{img:path.join(C.OUT,'two_synth_'+v+'.ppm')}); }
  else for(const f of args){ const {meta,x}=C.loadWav(f); if(!meta||meta.kind!=='two-portrait'){ console.log(`\n== ${path.basename(f)} == не запись «двух ладоней» / «кулака и ладони» (kind ${meta&&meta.kind})`); continue; } report(path.basename(f),meta,x,{img:path.join(C.OUT,path.basename(f).replace(/\.wav$/,'.ppm'))}); } }
