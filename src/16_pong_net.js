/* ── SonaLob «Вдвоём»: one game on two phones (v1.64a). Both phones run the same game (src/15_pong.js step2) on both palms. A phone knows
   its own palm at once; the partner's comes over the network a little later, with the step it belongs to. Till then the partner's palm is
   guessed (the last one known — the racket stays where it was); when the real one comes and differs, the game goes back to the last step
   before it (a copy is kept of every step for the last 3 s) and runs again to now with what is known. The partner's palm decides only
   when the shuttle is at his racket, so a guess wrong at other times changes nothing; where it does matter, the shuttle on this phone
   jumps forward by the network's delay — tens of ms of flight. One's own racket answers with no delay at all. Both phones end with the
   very same game (tests/test_pong_net.js: two phones over a network with delays and bursts, against the whole game replayed from both
   palms). Nothing here knows about the network itself — it is fed the partner's palms and hands out its own ── */
var PongNet=(function(){
  var KEEP=180;   // steps kept to go back to: 3 s
  /* g — the game (Pong.create2), me — this phone's side (0 left, 1 right) */
  function create(g,me){ return {g:g,me:me,o:1-me,n:g.n,inp:[{},{}],used:{},last:null,lastK:-1,marks:{},snaps:{},rb:0,rbMax:0,lost:false}; }
  function guess(N,k){ var v=N.inp[N.o][k]; if(v!==undefined) return v; return N.last; }
  /* the partner's last known palm before step k (what the guess is for a step not yet heard) */
  function relast(N){ var best=-1, v=null, I=N.inp[N.o]; for(var k in I){ k=+k; if(k>best){ best=k; v=I[k]; } } N.last=v; N.lastK=best; }
  function one(N){ var k=N.g.n+1, mine=N.inp[N.me][k], his=guess(N,k); N.used[k]=his;
    (N.marks[N.g.n]||[]).forEach(function(m){ if(m[0]==='resume') Pong.resume2(N.g); else if(m[0]==='sens'&&Pong.TUNE.SENS[m[2]]) N.g.Hs[m[1]]=Pong.TUNE.SENS[m[2]]; });   // as replay2: before the step after it
    N.snaps[N.g.n]=Pong.clone2(N.g); delete N.snaps[N.g.n-KEEP];
    var hL=N.me===0?mine:his, hR=N.me===0?his:mine; Pong.step2(N.g,hL===undefined?null:hL,hR===undefined?null:hR); N.n=N.g.n; return N.g; }
  /* this phone's palm for the next step, and the step: returns the game (its events and fx are this step's) */
  function stepLocal(N,f){ N.inp[N.me][N.g.n+1]=f===undefined?null:f; return one(N); }
  /* the partner's palms: list of [step, palm]. Returns the events of the steps run again that differ from what was shown
     (so the screen can still sound a hit it learnt of late), or null when nothing changed */
  function remote(N,list){ var from=Infinity, I=N.inp[N.o];
    list.forEach(function(q){ var k=q[0], v=q[1]===undefined?null:q[1]; I[k]=v; if(k<=N.g.n&&N.used[k]!==v) from=Math.min(from,k); });
    relast(N); for(var k in I){ if(+k<N.g.n-KEEP-5) delete I[k]; } var J=N.inp[N.me]; for(var j in J){ if(+j<N.g.n-KEEP-5) delete J[j]; } for(var u in N.used){ if(+u<N.g.n-KEEP-5) delete N.used[u]; }
    /* the guesses after the newest heard step were the older last palm: they may be wrong too — run again from the first of them */
    for(var k2=N.lastK+1;k2<=N.g.n;k2++){ if(N.used[k2]!==N.last){ from=Math.min(from,k2); break; } }
    if(from===Infinity) return null;
    var base=N.snaps[from-1]; if(!base){ N.lost=true; return null; }   // older than kept: the phones can't agree any more (the screen ends the game)
    var to=N.g.n, out=[]; N.g=Pong.clone2(base); N.rb++; N.rbMax=Math.max(N.rbMax,to-from+1);
    while(N.g.n<to&&N.g.state!=='over'){ one(N); if(N.g.events.length) out.push({n:N.g.n,events:N.g.events.slice(),fx:N.g.fx.slice()}); }
    return out; }
  /* marks, as replay2's: at step s (applied before step s+1) — ['resume'] (a pause's end, agreed by both phones for the same step) or
     ['sens', side, 0…3]. A mark for a step already run makes the game run again from there */
  function mark(N,s,m){ (N.marks[s]=N.marks[s]||[]).push(m); if(s<N.g.n){ var base=N.snaps[s]; if(!base){ N.lost=true; return; } var to=N.g.n; N.g=Pong.clone2(base); N.rb++; while(N.g.n<to&&N.g.state!=='over') one(N); } }
  return {create:create,stepLocal:stepLocal,remote:remote,mark:mark,KEEP:KEEP};
})();
if(typeof module!=='undefined') module.exports=PongNet;
