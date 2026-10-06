/* v1.56c — СонарЛинк: a room for two phones. Nothing is stored: rooms live in memory and die 30 minutes after the last message.
   One phone opens a room (a 4-digit code), the other joins it by the code; each then listens to a stream (Server-Sent Events —
   a plain long HTTP response, so nginx and Caddy need no change) and posts its messages, which the server hands to the other phone.
   The server never looks inside a message (a palm height, «ready», «caught particle 17»…) — it only relays it, with its own clock.

     POST /v1/pair/new   {}                     → {ok, code, key, side:0, t}
     POST /v1/pair/join  {code}                 → {ok, code, key, side:1, t}      404 — no such room, 409 — the room is full
     GET  /v1/pair/sse?code=&key=               → text/event-stream: «hello» {side, peer, t}, «peer» {here}, «m» {m, t}; a comment every 15 s
     POST /v1/pair/send  {code, key, m}         → {ok, t}                         m — any JSON up to 2 KB
     POST /v1/pair/near  {}                     → {ok, code, key, side, near:true, t}   v1.56g: two phones side by side, no code —
                         the first press from a network opens a room and waits 30 s; the next press from the same network joins it.
                         «The same network» — the same public IPv4 address, or the same IPv6 /64 (phones on one Wi-Fi share them).
   key — the side's secret (only the one who got it can listen or speak for that side). t — the server's clock, ms (for syncing the two). */
'use strict';
const crypto=require('node:crypto');
const ROOM_TTL=30*60000, MAX_M=2048, MAX_ROOMS=2000, PING=15000;
const rooms=new Map();   // code → {keys:[k0,k1|null], sse:[res|null,res|null], seen, n:[0,0], win:[t,t]}
function sweep(now){ for(const [c,r] of rooms) if(now-r.seen>ROOM_TTL){ for(const s of r.sse) if(s) try{ s.end(); }catch(e){} rooms.delete(c); } }
function newCode(){ for(let i=0;i<200;i++){ const c=String(crypto.randomInt(0,10000)).padStart(4,'0'); if(!rooms.has(c)) return c; } return null; }
function newKey(){ return crypto.randomBytes(12).toString('hex'); }
function sideOf(r,key){ return typeof key==='string'&&key.length===24?r.keys.indexOf(key):-1; }
function event(res,name,obj){ try{ res.write('event: '+name+'\ndata: '+JSON.stringify(obj)+'\n\n'); }catch(e){} }

const NEAR_WAIT=30000, near=new Map();   // network → {code, exp}
function netOf(ip){ ip=String(ip||'').replace(/^::ffff:/,''); if(ip.indexOf(':')<0) return ip; return ip.split(':').slice(0,4).join(':')+'::/64'; }
function postNear(b,now,ip){ const net=netOf(ip); for(const [k,w] of near) if(w.exp<now) near.delete(k);
  const w=near.get(net), r=w&&rooms.get(w.code);
  if(r&&!r.keys[1]&&w.exp>=now){ near.delete(net); const [c,o]=postJoin({code:w.code},now); o.near=true; return [c,o]; }
  const [c,o]=postNew(b,now); if(o.ok){ near.set(net,{code:o.code,exp:now+NEAR_WAIT}); o.near=true; } return [c,o]; }
function postNew(b,now){ sweep(now); if(rooms.size>=MAX_ROOMS) return [503,{ok:false,error:'busy'}];
  const code=newCode(); if(!code) return [503,{ok:false,error:'busy'}];
  const key=newKey(); rooms.set(code,{keys:[key,null],sse:[null,null],seen:now,n:[0,0],win:[now,now]});
  return [200,{ok:true,code,key,side:0,t:now}]; }
function postJoin(b,now){ const code=String(b&&b.code||'').replace(/\D/g,''), r=rooms.get(code);
  if(!r||now-r.seen>ROOM_TTL) return [404,{ok:false,error:'code'}];
  if(r.keys[1]) return [409,{ok:false,error:'full'}];
  const key=newKey(); r.keys[1]=key; r.seen=now; if(r.sse[0]) event(r.sse[0],'peer',{here:true,t:now});
  return [200,{ok:true,code,key,side:1,t:now}]; }
/* a side may post ~60 messages a second at most (a palm height 30 times a second is the plan) */
function postSend(b,now){ const r=rooms.get(String(b&&b.code||'')); if(!r) return [404,{ok:false,error:'code'}];
  const s=sideOf(r,b.key); if(s<0) return [403,{ok:false,error:'key'}];
  if(now-r.win[s]>1000){ r.win[s]=now; r.n[s]=0; } if(++r.n[s]>60) return [429,{ok:false,error:'slow down'}];
  const txt=JSON.stringify(b.m===undefined?null:b.m); if(txt.length>MAX_M) return [400,{ok:false,error:'big'}];
  r.seen=now; const o=r.sse[1-s]; if(o) try{ o.write('event: m\ndata: {"m":'+txt+',"t":'+now+'}\n\n'); }catch(e){}
  return [200,{ok:true,t:now}]; }
function getSse(url,req,res,origin,now){ const r=rooms.get(String(url.searchParams.get('code')||'')); const s=r?sideOf(r,url.searchParams.get('key')):-1;
  if(!r||s<0) return false;
  const h={'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store','X-Accel-Buffering':'no','Connection':'keep-alive'};
  if(origin){ h['Access-Control-Allow-Origin']=origin; h['Vary']='Origin'; }
  res.writeHead(200,h); res.write(':\n\n');
  if(r.sse[s]) try{ r.sse[s].end(); }catch(e){}
  r.sse[s]=res; r.seen=now; event(res,'hello',{side:s,peer:!!r.keys[1-s]&&!!r.sse[1-s],t:now});
  if(r.sse[1-s]) event(r.sse[1-s],'peer',{here:true,t:now});
  const ping=setInterval(()=>{ try{ res.write(':\n\n'); }catch(e){} },PING); ping.unref&&ping.unref();
  req.on('close',()=>{ clearInterval(ping); if(r.sse[s]===res){ r.sse[s]=null; if(r.sse[1-s]) event(r.sse[1-s],'peer',{here:false,t:Date.now()}); } });
  return true; }
module.exports={postNew,postJoin,postSend,postNear,getSse,rooms,sweep,netOf};
