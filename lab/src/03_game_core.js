/* ── ИГРА: логика отдельно от рисования, чтобы её можно было проверить на записи ── */
var Game=(function(){
  var DIFF={easy:{v0:0.20,acc:0.006,rMin:0.028,rMax:0.06,sp0:1.4,spMin:0.55,pairLvl:5,hitS:0.55,hitR:0.7,lives:5},
            normal:{v0:0.26,acc:0.009,rMin:0.032,rMax:0.08,sp0:1.2,spMin:0.42,pairLvl:4,hitS:0.62,hitR:0.75,lives:3},
            hard:{v0:0.32,acc:0.012,rMin:0.035,rMax:0.10,sp0:1.05,spMin:0.32,pairLvl:3,hitS:0.75,hitR:0.8,lives:3}};
  function rng(seed){ var s=seed||Math.floor(Math.random()*1e9); return function(){ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
  function create(W,H,seed){
    var g={W:W,H:H,rand:rng(seed),t:0,state:'wait',ship:{x:W*0.18,y:H/2,r:Math.max(9,H*0.035)},
      rocks:[],parts:[],stars:[],countT:0,overT:0,diff:DIFF.easy,score:0,best:0,lives:3,inv:0,spawnT:0.8,speed:0,handT:0,awayT:0,flash:0,level:1,events:[]};
    for(var i=0;i<90;i++) g.stars.push({x:g.rand()*W,y:g.rand()*H,z:0.2+0.8*g.rand()});
    return g;
  }
  function resize(g,W,H){ var fx=W/g.W, fy=H/g.H; g.W=W; g.H=H; g.ship.x=W*0.18; g.ship.y*=fy; g.ship.r=Math.max(9,H*0.035);
    g.stars.forEach(function(s){ s.x*=fx; s.y*=fy; }); g.rocks.forEach(function(r){ r.x*=fx; r.y*=fy; }); }
  function begin(g){ g.state='count'; g.countT=3; g.rocks=[]; g.parts=[]; g.score=0; g.lives=g.diff.lives; g.pending='count'; }   // событие отдаётся в следующем кадре
  function start(g){ var D=g.diff; g.overT=0; g.state='play'; g.score=0; g.lives=D.lives; g.inv=1.2; g.rocks=[]; g.parts=[]; g.speed=g.W*D.v0; g.spawnT=0.8; g.level=1; g.events.push('start'); }
  function spawn(g){
    var D=g.diff, r=g.H*(D.rMin+(D.rMax-D.rMin)*g.rand()), y=r+g.rand()*(g.H-2*r), n=9+Math.floor(g.rand()*4), v=[];
    for(var i=0;i<n;i++){ var a=i/n*Math.PI*2, k=0.72+0.4*g.rand(); v.push([Math.cos(a)*r*k,Math.sin(a)*r*k]); }
    g.rocks.push({x:g.W+r+4,y:y,r:r,v:v,vx:-g.speed*(0.8+0.45*g.rand()),vy:(g.rand()-0.5)*g.H*0.06,rot:0,vr:(g.rand()-0.5)*2.2});
  }
  function boom(g,x,y,n,sp){ for(var i=0;i<n;i++){ var a=g.rand()*Math.PI*2, s=sp*(0.3+g.rand()); g.parts.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0.5+0.6*g.rand(),a:a}); } }
  /* hand: 0…1 снизу вверх, или null — руки нет */
  function update(g,dt,hand){
    dt=Math.min(dt,0.05); g.t+=dt; g.events=[]; if(g.pending){ g.events.push(g.pending); g.pending=null; }
    var scroll=(g.state==='play')?g.speed:g.W*0.05;
    g.stars.forEach(function(s){ s.x-=scroll*0.35*s.z*dt; if(s.x<0){ s.x+=g.W; s.y=g.rand()*g.H; } });
    var m=g.H*0.08;
    if(hand!==null){ var ty=g.H-m-hand*(g.H-2*m); g.ship.y+=(ty-g.ship.y)*(1-Math.exp(-dt/0.045)); }
    if(hand!==null){ g.handT+=dt; g.awayT=0; } else { g.awayT+=dt; g.handT=0; }
    if(g.state==='wait'){ /* ждёт кнопку «Старт» — корабль уже ходит за ладонью */ }
    else if(g.state==='count'){ g.countT-=dt; if(g.countT<=0) start(g); }
    else if(g.state==='over'){ g.overT+=dt; /* ждёт кнопку «Ещё раз» */ }
    else if(g.state==='play'){
      g.speed+=g.W*g.diff.acc*dt;                                    // медленно разгоняется
      var lvl=1+Math.floor(g.score/500); if(lvl>g.level){ g.level=lvl; g.events.push('level'); }
      g.spawnT-=dt; if(g.spawnT<=0){ var D=g.diff; spawn(g); if(g.level>=D.pairLvl&&g.rand()<0.35) spawn(g); g.spawnT=Math.max(D.spMin,D.sp0-0.07*g.level)*(0.7+0.6*g.rand()); }
      g.score+=dt*g.speed*0.1; if(g.inv>0) g.inv-=dt; if(g.flash>0) g.flash-=dt;
      for(var i=g.rocks.length-1;i>=0;i--){ var r=g.rocks[i]; r.x+=r.vx*dt; r.y+=r.vy*dt; r.rot+=r.vr*dt;
        if(r.y<r.r||r.y>g.H-r.r) r.vy=-r.vy;
        if(r.x<-r.r-10){ g.rocks.splice(i,1); continue; }
        var dx=r.x-g.ship.x, dy=r.y-g.ship.y, rr=g.ship.r*g.diff.hitS+r.r*g.diff.hitR;
        if(g.inv<=0&&dx*dx+dy*dy<rr*rr){ g.lives--; g.inv=1.6; g.flash=0.3; boom(g,r.x,r.y,18,g.H*0.5); g.rocks.splice(i,1); g.events.push('hit');
          if(g.lives<=0){ g.state='over'; g.overT=0; g.best=Math.max(g.best,Math.floor(g.score)); boom(g,g.ship.x,g.ship.y,40,g.H*0.7); g.events.push('over'); } }
      }
    }
    for(var j=g.parts.length-1;j>=0;j--){ var p=g.parts[j]; p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt; if(p.life<=0) g.parts.splice(j,1); }
    return g;
  }
  return {create:create,update:update,resize:resize,start:start,begin:begin,DIFF:DIFF,setDiff:function(g,k){ g.diff=DIFF[k]||DIFF.easy; }};
})();
