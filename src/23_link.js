/* ── SonaLob «Вдвоём»: the link between two phones (v1.64b; the lab's СонарЛинк, lab/src/093_string.js 1.56c–v, made a part of the game).
   A room on the records server (server/pair.js: nothing stored, rooms live in memory): «Рядом» — both press within 30 s from one
   network (no code); or one opens a room and gets a 4-digit code, the other enters it. Each phone listens to its stream (Server-Sent
   Events) and posts its messages, which the server hands to the other phone. Once both are there, a direct channel between the phones is
   tried (WebRTC, the phones' own addresses only — in one Wi-Fi a few ms one way); when it opens, messages go that way, otherwise through
   the server (~50–100 ms). The server's clock is learnt from every answer (the one with the shortest round trip wins): both phones start
   the game at the same server moment and count its steps from there. Nothing here knows the game — it carries JSON messages ── */
var Link=(function(){
  var API=function(){ return (typeof window!=='undefined'&&window.SONAROIDS_API)||'https://api.sonaroids.app'; };
  var L=null, fn=null;
  function fresh(){ return {code:null,key:null,side:-1,near:false,es:null,link:false,peer:false,pc:null,dc:null,rtcQ:[],off:0,rtt:null,rttD:null,rttS:null,closed:false,iv:null,log:[],syncs:0}; }
  function ev(k,x){ if(!L) return; L.log.push([Math.round(performance.now()),k,x===undefined?null:x]); if(L.log.length>400) L.log.shift(); try{ if(typeof Logs!=='undefined'&&Logs.gameEv) Logs.gameEv('связь: '+k,x===undefined?null:x); }catch(e){} }
  function post(path,body){ var t0=Date.now(), l=L; return fetch(API()+'/v1/pair/'+path,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(body)})
    .then(function(r){ return r.json().then(function(j){ var t1=Date.now(); if(l&&j&&typeof j.t==='number'){ var rtt=t1-t0; if(l.rtt===null||rtt<l.rtt+5){ l.rtt=l.rtt===null?rtt:Math.min(l.rtt,rtt); l.off=j.t-(t0+t1)/2; } } j.status=r.status; return j; }); }); }
  /* the server's clock now, ms */
  function now(){ return Date.now()+(L?L.off:0); }
  function direct(){ return !!(L&&L.dc&&L.dc.readyState==='open'); }
  function srv(m){ if(!L||!L.code) return; post('send',{code:L.code,key:L.key,m:m}).catch(function(){}); }
  /* a message to the partner: the direct channel when open, else the server */
  function send(m){ if(!L||!L.code) return; if(direct()){ try{ L.dc.send(JSON.stringify(m)); return; }catch(e){} } srv(m); }
  function got(m,via){ if(!m) return;
    if(m.e==='ping'){ var r={e:'pong',t:m.t,v:m.v}; if(m.v==='d'&&direct()) try{ L.dc.send(JSON.stringify(r)); }catch(e){} else srv(r); return; }
    if(m.e==='pong'){ var rt=performance.now()-m.t; if(m.v==='d') L.rttD=L.rttD?L.rttD*0.7+rt*0.3:rt; else L.rttS=L.rttS?L.rttS*0.7+rt*0.3:rt; return; }
    if(m.e==='rtc'){ rtcMsg(m); return; }
    if(m.e==='clock') return;
    if(m.e==='hi'){ if(L.side===0) rtcStart(); }
    if(fn) try{ fn(m,via); }catch(e){} }
  /* ── the direct channel (1.56g): the side 0 offers once the partner's stream is up («hi»); addresses and answers go through the room ── */
  function rtc(){ if(!L||L.pc||typeof RTCPeerConnection==='undefined') return; var pc; try{ pc=new RTCPeerConnection({iceServers:[]}); }catch(e){ return; } L.pc=pc;
    pc.onicecandidate=function(e){ if(e.candidate) srv({e:'rtc',c:e.candidate.toJSON?e.candidate.toJSON():e.candidate}); };
    pc.ondatachannel=function(e){ dc(e.channel); };
    pc.onconnectionstatechange=function(){ ev('прямой канал: '+pc.connectionState); };
    if(L.side===0){ dc(pc.createDataChannel('lob',{ordered:true})); pc.createOffer().then(function(o){ return pc.setLocalDescription(o); }).then(function(){ srv({e:'rtc',sdp:pc.localDescription.toJSON?pc.localDescription.toJSON():pc.localDescription}); }).catch(function(e){ ev('прямой канал: ошибка',String(e&&e.message||e)); }); } }
  function dc(ch){ L.dc=ch; ch.onmessage=function(e){ try{ got(JSON.parse(e.data),'d'); }catch(x){} }; ch.onopen=function(){ ev('прямой канал открыт'); }; ch.onclose=function(){ ev('прямой канал закрыт'); }; }
  function rtcMsg(m){ if(m.sdp&&m.sdp.type==='offer'&&L.pc&&L.pc.remoteDescription) rtcClose(); if(!L.pc) rtc(); var pc=L.pc; if(!pc) return;
    if(m.sdp){ pc.setRemoteDescription(m.sdp).then(function(){ if(m.sdp.type==='offer') return pc.createAnswer().then(function(a){ return pc.setLocalDescription(a); }).then(function(){ srv({e:'rtc',sdp:pc.localDescription.toJSON?pc.localDescription.toJSON():pc.localDescription}); }); })
      .then(function(){ L.rtcQ.forEach(function(c){ pc.addIceCandidate(c).catch(function(){}); }); L.rtcQ=[]; }).catch(function(){}); }
    if(m.c){ if(pc.remoteDescription) pc.addIceCandidate(m.c).catch(function(){}); else L.rtcQ.push(m.c); } }
  function rtcClose(){ try{ if(L.dc) L.dc.close(); if(L.pc) L.pc.close(); }catch(e){} L.dc=null; L.pc=null; L.rtcQ=[]; }
  function rtcStart(){ if(!L||L.side!==0) return; if(L.pc&&L.pc.connectionState==='connected') return; if(L.pc) rtcClose(); rtc(); }
  function listen(){ if(L.es) try{ L.es.close(); }catch(e){} var l=L, es=new EventSource(API()+'/v1/pair/sse?code='+L.code+'&key='+L.key); L.es=es;
    es.addEventListener('hello',function(e){ if(L!==l) return; var d=JSON.parse(e.data); L.link=true; ev('на связи',{peer:d.peer}); if(d.peer) peer(true); });
    es.addEventListener('peer',function(e){ if(L!==l) return; var d=JSON.parse(e.data); ev(d.here?'напарник пришёл':'напарник ушёл'); peer(d.here); });
    es.addEventListener('m',function(e){ if(L!==l) return; var d=JSON.parse(e.data); got(d.m,'s'); });
    es.onerror=function(){ if(L===l&&L.link){ L.link=false; ev('сервер: связь потеряна'); } }; }
  function peer(here){ L.peer=here; if(here) send({e:'hi'}); if(fn) try{ fn({e:here?'peer':'gone'},'l'); }catch(e){} }
  /* the clock: a few quick round trips at once (the room's first answer can be slow — a cold server, a busy phone), the shortest wins */
  function sync(n){ var l=L; if(!l||n<=0) return; post('send',{code:l.code,key:l.key,m:{e:'clock'}}).then(function(){ if(L===l){ l.syncs++; setTimeout(function(){ sync(n-1); },60); } },function(){}); }
  function start(j){ if(!j||!j.ok) return j; L.code=j.code; L.key=j.key; L.side=j.side; L.near=!!j.near; ev('комната',{code:j.code,side:j.side,near:L.near}); listen(); sync(6);
    L.iv=setInterval(function(){ if(!L||!L.peer) return; var t=performance.now(); srv({e:'ping',t:t,v:'s'}); if(direct()) try{ L.dc.send(JSON.stringify({e:'ping',t:t,v:'d'})); }catch(e){} },2000); return j; }
  function open(path,body){ close(); L=fresh(); return post(path,body||{}).then(start,function(){ return {ok:false,error:'offline'}; }); }
  function close(){ if(!L) return; L.closed=true; try{ if(L.es) L.es.close(); }catch(e){} rtcClose(); if(L.iv) clearInterval(L.iv); L=null; }
  return {near:function(){ return open('near'); },create:function(){ return open('new'); },join:function(code){ return open('join',{code:String(code||'')}); },
    close:close,send:send,on:function(f){ fn=f; },now:now,direct:direct,
    state:function(){ return L?{code:L.code,side:L.side,near:L.near,link:L.link,peer:L.peer,direct:direct(),rtt:L.rtt,rttD:L.rttD,rttS:L.rttS,off:L.off,syncs:L.syncs}:null; },log:function(){ return L?L.log.slice():[]; }};
})();
