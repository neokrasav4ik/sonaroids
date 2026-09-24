/* ── LOGS, for analysis on a computer (the lab's tools read them: replay_game.js, setup_log.py, game_log.py).
   Setup log: from the start of processing (empty room) through waving to the start — up to 120 s.
   Game log: the last 150 s of a game. Both are WAV: mono PCM16 microphone, JSON metadata in LIST/INFO/ICMT, and a 'glog' chunk
   with what the processing saw (dsp), what the game did (render: one row per core step) and events. ── */
var Logs=(function(){
  /* event names stay Russian: the lab's analysis tools look for them ('подстройка', 'рука есть', ...) */
  var N=512, SCALE=4, SLOG_SEC=120, GLOG_SEC=150, S=null, G=null;
  function pcmPut(L,fr,at){ for(var i=0;i<N;i++){ var v=Math.round(fr[i]*32767*SCALE); if(v>32767){ v=32767; L.clip++; } else if(v<-32768){ v=-32768; L.clip++; } L.pcm[(at+i)%L.pcm.length]=v; } }
  function dspRow(f,r,full){ var a=[f,r.present?1:0,+r.height.toFixed(1),+r.abs.toFixed(1),+r.range.toFixed(1),+r.fast.toFixed(1),+r.E.toFixed(1),+r.resE.toFixed(1)];
    if(full) a.push(r.floor===null||r.floor===undefined?null:+r.floor.toFixed(1),+(r.Em||0).toFixed(1)); return a; }
  function setupStart(meta){ var I=Sonar.info(), cap=SLOG_SEC*I.fs;
    if(!S||S.pcm.length!==cap) S={pcm:new Int16Array(cap)};
    S.on=true; S.f=0; S.clip=0; S.gaps=0; S.dsp=[]; S.ev=[]; S.pres=null; S.meta0=meta; ev('старт: подготовка'); }
  function ev(k,x){ if(!S||!S.on) return; S.ev.push(x===undefined?[S.f,k]:[S.f,k,x]); }
  function gameStart(meta){ var I=Sonar.info(), cap=GLOG_SEC*I.fs;
    if(!G||G.pcm.length!==cap) G={pcm:new Int16Array(cap)};
    G.on=true; G.f=0; G.clip=0; G.gaps=0; G.dsp=[]; G.ren=[]; G.ev=[]; G.meta0=meta; }
  function gameStop(){ if(G) G.on=false; }
  /* microphone frame (from Sonar.listen) */
  function frame(fr,r,gap){
    if(S&&S.on){ if(S.f*N>=S.pcm.length) S.on=false; else { if(gap) S.gaps++; pcmPut(S,fr,S.f*N);
      if(r){ S.dsp.push(dspRow(S.f,r,true)); if(S.pres!==null&&r.present!==S.pres) ev(r.present?'рука есть: '+r.why:'рука ушла: '+r.why); S.pres=r.present; }
      S.f++; } }
    if(G&&G.on){ if(gap) G.gaps++; pcmPut(G,fr,(G.f*N)%G.pcm.length); if(r) G.dsp.push(dspRow(G.f,r,false)); G.f++;
      if(G.dsp.length>GLOG_SEC*100) G.dsp.splice(0,G.dsp.length-GLOG_SEC*95); }
  }
  /* one core step: [mic frame, step, palm 0…1 or −1, ship y/FH, lives, score] */
  function step(g,hand){ if(!G||!G.on) return;
    G.ren.push([G.f,g.n,hand===null?-1:+hand.toFixed(4),+(g.ship.y/g.FH).toFixed(3),g.lives,g.score]);
    g.events.forEach(function(k){ if(k!=='fire') G.ev.push([G.f,k,g.n]); });
    if(G.ren.length>GLOG_SEC*62) G.ren.splice(0,G.ren.length-GLOG_SEC*60); }
  function gameEv(k,x){ if(G&&G.on) G.ev.push([G.f,k,x===undefined?null:x]); }
  function wav(pcm,meta,glog){
    var fs=Sonar.info().fs, n=pcm.length, i;
    var mtxt=unescape(encodeURIComponent(JSON.stringify(meta))); if(mtxt.length%2) mtxt+=' ';
    var gtxt=unescape(encodeURIComponent(JSON.stringify(glog))); if(gtxt.length%2) gtxt+=' ';
    var infoLen=4+8+mtxt.length, dataLen=n*2, total=12+(8+16)+(8+infoLen)+(8+gtxt.length)+(8+dataLen);
    var buf=new ArrayBuffer(total), v=new DataView(buf), p=0;
    function s4(x){ for(var k=0;k<4;k++) v.setUint8(p++,x.charCodeAt(k)); } function u32(x){ v.setUint32(p,x,true); p+=4; } function u16(x){ v.setUint16(p,x,true); p+=2; }
    s4('RIFF'); u32(total-8); s4('WAVE'); s4('fmt '); u32(16); u16(1); u16(1); u32(fs); u32(fs*2); u16(2); u16(16);
    s4('LIST'); u32(infoLen); s4('INFO'); s4('ICMT'); u32(mtxt.length); for(i=0;i<mtxt.length;i++) v.setUint8(p++,mtxt.charCodeAt(i));
    s4('glog'); u32(gtxt.length); for(i=0;i<gtxt.length;i++) v.setUint8(p++,gtxt.charCodeAt(i));
    s4('data'); u32(dataLen); for(i=0;i<n;i++){ v.setInt16(p,pcm[i],true); p+=2; }
    return new Blob([buf],{type:'audio/wav'});
  }
  function base(kind){ var I=Sonar.info();
    return {kind:kind,fs:I.fs,N:N,kLo:I.kLo,kHi:I.kHi,probe:{bins:'all',channel:I.chan,phase:'pi*q^2/M',peak:0.9,gain:I.probe_gain,snr_db:I.probe_snr,level_db:I.probe_level,f_lo:I.f_lo,loop:true},
      pcm:{bits:16,full_scale:1/SCALE},app:'sonaroids',ended:new Date().toISOString(),ua:navigator.userAgent}; }
  function setupBlob(){ if(!S||!S.f) return null; var inf=DSP2.info(), m=base('setup-log');
    m.v=1; m.first_frame=0; m.frames=S.f; m.clipped=S.clip; m.gaps=S.gaps; m.setup=S.meta0; m.cal_now=inf.cal; m.dsp_info={d0:inf.d0,prom:inf.prom,mm:inf.mm};
    m.columns={dsp:['frame','present','height_mm','abs_mm','range_mm','fast_mm','motion_db','echo_db','empty_floor_db','motion_smooth_db'],events:['frame','event','data']};
    return wav(S.pcm.slice(0,S.f*N),m,{dsp:S.dsp,render:[],events:S.ev}); }
  function gameBlob(){ if(!G||!G.f) return null; var cap=G.pcm.length, total=G.f*N, n=Math.min(total,cap), start=total-n, i;
    var pcm=new Int16Array(n); for(i=0;i<n;i++) pcm[i]=G.pcm[(start+i)%cap];
    var f0=Math.floor(start/N), m=base('game-log');
    m.v=6; m.first_frame=f0; m.frames=G.f-f0; m.clipped=G.clip; m.gaps=G.gaps; m.game=G.meta0;
    m.columns={dsp:['frame','present','height_mm','abs_mm','range_mm','fast_mm','motion_db','echo_db'],
      render:['frame','core_step','hand_0_1_or_-1','ship_y_over_FH','lives','score'],events:['frame','event','data']};
    return wav(pcm,m,{dsp:G.dsp.filter(function(a){return a[0]>=f0;}),render:G.ren.filter(function(a){return a[0]>=f0;}),events:G.ev.filter(function(a){return a[0]>=f0;})}); }
  function stamp(){ var d=new Date(), z=function(x){ return (x<10?'0':'')+x; }; return d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'_'+z(d.getHours())+z(d.getMinutes()); }
  /* share both logs at once (iPhone: the share sheet), or download them */
  function share(){
    var files=[], st=stamp(), a=gameBlob(), b=setupBlob();
    try{ if(a) files.push(new File([a],'sonaroids_game_'+st+'.wav',{type:'audio/wav'})); if(b) files.push(new File([b],'sonaroids_setup_'+st+'.wav',{type:'audio/wav'})); }catch(e){}
    if(!files.length) return false;
    if(navigator.canShare&&navigator.canShare({files:files})){ navigator.share({files:files,title:'Sonaroids logs'}).catch(function(){}); return true; }
    files.forEach(function(f){ var el=document.createElement('a'); el.href=URL.createObjectURL(f); el.download=f.name; document.body.appendChild(el); el.click(); setTimeout(function(){ el.remove(); },1000); });
    return true;
  }
  return {setupStart:setupStart,ev:ev,gameStart:gameStart,gameStop:gameStop,frame:frame,step:step,gameEv:gameEv,setupBlob:setupBlob,gameBlob:gameBlob,share:share,
    has:function(){ return !!((G&&G.f)||(S&&S.f)); }};
})();
