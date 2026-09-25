/* ── LEADERBOARD CLIENT (v0.25): talks to server/server.js at api.sonaroids.app.
   A game is sent as its seed, field width, start height and the palm height of every core step — rounded to 1/4000,
   and the game itself steps with exactly those rounded numbers, so the server's replay lands on the same score.
   The player is a random secret kept on the device (sonaroids_pid); the nickname is asked once, at the first place in a table.
   No network (or a local file) — nothing is sent; a game that could not be sent is kept (the last 3) and tried again later. ── */
var Board=(function(){
  var API=(typeof window!=='undefined'&&window.SONAROIDS_API)||'https://api.sonaroids.app', Q=4000, NONE=65535;
  var cur=null, last=null, cache={}, pending=null, devFn=null, model='';
  /* v0.29: with every game goes a short note on the phone (see devInfo in 49_main.js; the server keeps only known keys).
     Android's model name comes from Chrome's userAgentData, asked once; iPhone gives none. */
  try{ var uad=typeof navigator!=='undefined'&&navigator.userAgentData; if(uad&&uad.getHighEntropyValues&&uad.platform==='Android')
    uad.getHighEntropyValues(['model']).then(function(h){ model=String(h.model||'').replace(/[^A-Za-z0-9 _.()+-]/g,'').slice(0,32); },function(){}); }catch(e){}
  function dev(){ var d=null; try{ d=devFn?devFn():null; }catch(e){} if(d&&model) d.model=model; return d; }
  function ls(k,v){ try{ if(v===undefined) return localStorage.getItem(k); if(v===null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(e){} return null; }
  function on(){ return !!(typeof window!=='undefined'&&(window.SONAROIDS_API||location.protocol==='https:'))&&typeof fetch==='function'; }
  function pid(){ var p=ls('sonaroids_pid'); if(p&&/^[0-9a-f]{32}$/.test(p)) return p;
    var a=new Uint8Array(16); crypto.getRandomValues(a); p=''; for(var i=0;i<16;i++) p+=(a[i]<16?'0':'')+a[i].toString(16); ls('sonaroids_pid',p); return p; }
  function nick(){ return ls('sonaroids_nick'); }
  /* the palm height the game steps with: rounded so that the server can repeat it exactly */
  function q(h){ return h===null||h===undefined?null:Math.round(h*Q)/Q; }
  function start(seed,FW,y0){ cur={core:Core.TAG,seed:seed,FW:FW,y0:y0,q:[]}; last=null; }
  function step(h){ if(cur) cur.q.push(h===null?NONE:Math.round(h*Q)); }
  function b64(u8){ var s='', CH=0x8000; for(var i=0;i<u8.length;i+=CH) s+=String.fromCharCode.apply(null,u8.subarray(i,i+CH)); return btoa(s); }
  function pack(qs){ var u8=new Uint8Array(qs.length*2); for(var i=0;i<qs.length;i++){ u8[2*i]=qs[i]&255; u8[2*i+1]=qs[i]>>8; }
    if(typeof CompressionStream!=='function') return Promise.resolve({enc:'raw',hands:b64(u8)});
    try{ var cs=new CompressionStream('deflate-raw'), w=cs.writable.getWriter(); w.write(u8); w.close();
      return new Response(cs.readable).arrayBuffer().then(function(ab){ return {enc:'deflate',hands:b64(new Uint8Array(ab))}; },function(){ return {enc:'raw',hands:b64(u8)}; }); }
    catch(e){ return Promise.resolve({enc:'raw',hands:b64(u8)}); } }
  function keep(body){ var l=[]; try{ l=JSON.parse(ls('sonaroids_unsent')||'[]'); }catch(e){} l.push(body); ls('sonaroids_unsent',JSON.stringify(l.slice(-3))); }
  function post(path,body){ return fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){ return r.json().then(function(j){ j.code=r.status; return j; }); }); }
  /* a game is over (or dropped): send it. last — what the game-over screen shows: sending | done | offline | old | error */
  function finish(score){ var c=cur; cur=null; if(!c||!on()||!(score>0)||!c.q.length) return; last={state:'sending',score:score}; var d=dev();
    pack(c.q).then(function(p){ var body={pid:pid(),core:c.core,seed:c.seed,FW:c.FW,y0:c.y0,enc:p.enc,hands:p.hands,score:score,dev:d};
      return post('/v1/game',body).then(function(j){ cache={};
        if(j.ok) last={state:'done',score:j.score,ranks:j.ranks,listed:j.listed,named:j.named||!!nick()};
        else if(j.error==='core') last={state:'old'}; else last={state:'error',why:j.error}; },
      function(){ keep(body); last={state:'offline'}; }); }); }
  /* v0.29: how getting ready went, from every player — also those who never get to play (no microphone, the probe not heard, the palm
     never caught). Sent once and forgotten: result caught | nocatch | quiet | noprobe | error | nomic | noaudio | lost; t — seconds on the wave step,
     flips — how many times the game suggested the other end of the phone. */
  function setup(result,x){ if(!on()) return; x=x||{}; var b={pid:pid(),result:result,dev:dev()};
    if(typeof x.t==='number') b.t=Math.round(x.t*10)/10; if(typeof x.flips==='number') b.flips=x.flips;
    try{ post('/v1/setup',b).catch(function(){}); }catch(e){} }
  /* games that could not be sent before: try again (at launch and after a game) */
  function flush(){ if(!on()||pending) return; var l=[]; try{ l=JSON.parse(ls('sonaroids_unsent')||'[]'); }catch(e){} if(!l.length) return;
    ls('sonaroids_unsent',null); pending=Promise.all(l.map(function(b){ return post('/v1/game',b).catch(function(){ keep(b); }); })).then(function(){ pending=null; cache={}; }); }
  function setNick(n){ return post('/v1/nick',{pid:pid(),nick:n}).then(function(j){ if(j.ok){ ls('sonaroids_nick',j.nick); cache={}; if(last&&last.state==='done') last.named=true; } return j; }); }
  /* a table: cached for 30 s; state loading | ok | offline */
  function top(period){ var c=cache[period]; if(c&&(c.state==='loading'||Date.now()-c.at<30000)) return c;
    c=cache[period]={state:'loading',at:Date.now()}; if(!on()){ c.state='offline'; return c; }
    fetch(API+'/v1/top?period='+period+'&limit=10',{headers:{'X-Player':pid()}}).then(function(r){ return r.json(); })
      .then(function(j){ c.state='ok'; c.entries=j.entries||[]; c.me=j.me||null; c.at=Date.now(); },function(){ c.state='offline'; c.at=Date.now(); });
    return c; }
  return {setup:setup,devInfo:function(f){ devFn=f; },q:q,start:start,step:step,finish:finish,flush:flush,setNick:setNick,top:top,nick:nick,on:on,
    last:function(){ return last; }, _set:function(p,c){ cache[p]=c; }, _last:function(l){ last=l; }};
})();
