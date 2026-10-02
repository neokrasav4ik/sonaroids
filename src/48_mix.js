/* ── v1.24, «ВСЁ ПОДРЯД / SHUFFLE» (the maintainer: «добавим в опцию выбора скинов для игр (и флай и рейс) такую типа "рандом микс"… чтобы
   скин менялся в игре каждые 25–40 секунд на рандомный, не повторяющийся с предыдущими»; the name «ВСЁ ПОДРЯД / SHUFFLE»; the change «Г3»,
   a torn sheet: the new world comes in from the right behind a torn paper edge with a white rim). The last place in each game's skin row.
   In a game: a random skin at the start, then every 25–40 s another, never one of the last two. While the edge goes across (MX_DUR s)
   the old world is drawn again each frame into its own canvases (the game's drawing pointed at them) and laid over the left of the edge,
   so both worlds move. The race's next chunks and the flight's next rocks are made in the seconds before, a little each frame. ── */
var flyMix=false, raceMix=false, MX={t:0,next:30,hist:[],tr:null,pend:null,warm:null,pre:false}, MX_DUR=1.1, mxH=null, mxL=null;
function mixOn(){ return mode==='race'?raceMix:flyMix; }
function mixList(){ return mode==='race'?RACE_SKINS:SKIN_IDS; }
function mixCur(){ return mode==='race'?RSKIN:skinId; }
function mixPick(){ var L=mixList(), last=MX.hist.slice(-2).concat([mixCur()]), c=L.filter(function(k){ return last.indexOf(k)<0; }); if(!c.length) c=L.filter(function(k){ return k!==mixCur(); }); return c[Math.floor(Math.random()*c.length)]; }
function mixSet(id){ MX.hist.push(id); if(MX.hist.length>6) MX.hist.shift(); if(mode==='race') RSKIN=id; else { skinId=id; SK=skinView(id); } }
function mixPlan(){ MX.t=0; MX.next=25+Math.random()*15; MX.pend=mixPick(); MX.warm=null; }
/* v1.25 (the maintainer: «подготовка и калибровка должна проходить тоже на рандомном, который первый в игре будет»): the first skin is picked
   as the getting-ready steps begin (from go(), entering them from any other screen), and the game starts on it */
var MX_PRE=['sound','phone','mic','probe','away','wave'];
function mixPrep(from,to){ if(!mixOn()||MX_PRE.indexOf(to)<0||MX_PRE.indexOf(from)>=0) return; MX.tr=null; MX.hist=[mixCur()]; mixSet(mixPick()); MX.pre=true; }
/* a new game: the skin picked for getting ready, or (straight to the count, e.g. «again») a random one at once; the next one planned */
function mixStart(){ MX.tr=null; if(!mixOn()){ MX.pre=false; return; } if(MX.pre){ MX.pre=false; mixPlan(); return; } MX.hist=[mixCur()]; mixSet(mixPick()); mixPlan(); }
/* every frame of a game in play */
function mixTick(dt){ if(!mixOn()||!g||g.state!=='play'){ MX.tr=null; return; }
  if(!MX.pend) mixPlan();
  if(MX.tr){ MX.tr.t+=dt; if(MX.tr.t>=MX_DUR) MX.tr=null; }
  MX.t+=dt; if(!MX.tr&&MX.next-MX.t<3) mixWarm();
  if(!MX.tr&&MX.t>=MX.next){ var old={id:mixCur(),SK:SK,pool:pool,rockSpr:rockSpr}; mixSet(MX.pend); if(mode!=='race'&&MX.warm&&MX.warm.skin===SK){ pool=MX.warm; rockSpr={}; } MX.tr={t:0,old:old}; mixPlan(); if(!hdShown) hdFrame(true,false); } }   // the HD canvas on this frame (the new world or the old one may be HD-only, as the LCD)
/* the next world made ahead, a little each frame: the race's chunks round the view and ahead, the flight's rock pictures */
function mixWarm(){ var id=MX.pend; if(!id) return;
  if(mode==='race'){ var keep=RSKIN; RSKIN=id; try{ rReset(g.seed); if(RSKIN==='pirate') rpWarm(); else if(RSKIN==='candy') cwWarm(); else nWarm();
      var X0=rX0===null?SAFE.l:rX0, i0=Math.floor((g.d-X0/K)/RCW), i1=Math.floor((g.d+(LW-X0)/K+(g.v||100)*3.5)/RCW);
      for(var i=i0;i<=i1;i++) if(!RC.ch[i]){ rChunk(g,i); break; } } finally { RSKIN=keep; rReset(g.seed); } return; }
  var kSK=SK, kPool=pool; SK=skinView(id); pool=MX.warm||{K:0,list:[[],[],[]]}; try{ poolFill(1); MX.warm=pool; } finally { SK=kSK; pool=kPool; } }
/* the torn edge (static in shape: it slides across), at x (L px) */
function mixEdge(c,xe,side){ c.beginPath(); c.moveTo(side<0?-4:LW+4,-4); for(var y=-4;y<=LH+4;y+=2){ var f=y/LH; c.lineTo(xe+LW*(0.018*Math.sin(f*40)+0.012*Math.sin(f*97+1)+0.008*Math.sin(f*173)),y); } c.lineTo(side<0?-4:LW+4,LH+4); c.closePath(); }
function mixCanvas(c,w,h){ if(!c){ c=document.createElement('canvas'); } if(c.width!==w||c.height!==h){ c.width=w; c.height=h; } return c; }
/* after the world is drawn, before the texts: the old world over the left of the edge (from the frame the HD canvas is on) */
function mixDraw(speed){ var tr=MX.tr; if(!tr||!hdCv||!hdShown) return; var u=Math.min(1,tr.t/MX_DUR), e=u*u*(3-2*u), xe=LW*(1.06-e*1.16), old=tr.old;
  mxH=mixCanvas(mxH,hdCv.width,hdCv.height); mxL=mixCanvas(mxL,lc.width,lc.height);
  var hc=mxH.getContext('2d'), lc2=mxL.getContext('2d'); hc.setTransform(1,0,0,1,0,0); hc.clearRect(0,0,mxH.width,mxH.height); hc.setTransform(hs,0,0,hs,0,0); hc.imageSmoothingEnabled=!hdPix;
  lc2.setTransform(1,0,0,1,0,0); lc2.clearRect(0,0,mxL.width,mxL.height); lc2.setTransform(uiS,0,0,uiS,0,0); lc2.imageSmoothingEnabled=false;
  var kH=hx, kL=lx, kSK=SK, kPool=pool, kRock=rockSpr, kParts=parts, kNL=noLight, kLights=lights, kR=RSKIN, kPY=rPrevY, kTilt=rTilt;
  try{ hx=hc; lx=lc2; parts=[]; noLight=true;
    if(mode==='race'){ RSKIN=old.id; raceScene(g,g.d,g.car.y,0); }
    else { SK=old.SK; pool=old.pool; rockSpr=old.rockSpr; field(0,speed); old.pool=pool; old.rockSpr=rockSpr; } }
  finally { hx=kH; lx=kL; SK=kSK; pool=kPool; rockSpr=kRock; parts=kParts; noLight=kNL; lights=kLights; RSKIN=kR; rPrevY=kPY; rTilt=kTilt; if(mode==='race') rReset(g.seed); }
  // the old world on the HD canvas left of the edge; the pixel canvas cleared there so it shows
  hx.save(); hx.setTransform(hs,0,0,hs,0,0); mixEdge(hx,xe,-1); hx.clip(); var sm=hx.imageSmoothingEnabled; hx.drawImage(mxH,0,0,LW,LH); hx.imageSmoothingEnabled=false; hx.drawImage(mxL,0,0,LW,LH); hx.imageSmoothingEnabled=sm; hx.restore();
  lx.save(); mixEdge(lx,xe,-1); lx.clip(); lx.clearRect(0,0,LW,LH); lx.restore();
  // the torn paper: a faint shadow on the new world, a white rim and its fibres on the old sheet
  lx.save(); lx.lineJoin='round'; lx.strokeStyle='rgba(60,50,30,0.22)'; lx.lineWidth=3; mixEdge(lx,xe+2.2,-1); lx.stroke();
  lx.strokeStyle='rgba(255,255,255,0.95)'; lx.lineWidth=1.6; mixEdge(lx,xe-0.6,-1); lx.stroke();
  lx.strokeStyle='rgba(200,190,170,0.7)'; lx.lineWidth=0.5; for(var k=0;k<LH;k+=7){ var f=k/LH, x=xe+LW*(0.018*Math.sin(f*40)+0.012*Math.sin(f*97+1)+0.008*Math.sin(f*173)); lx.beginPath(); lx.moveTo(x-0.5,k); lx.lineTo(x+1+((k*37)%5)*0.4,k+((k*13)%3)-1); lx.stroke(); }
  lx.restore(); }
