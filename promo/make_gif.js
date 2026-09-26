/* The promo GIF: both ways to play side by side (v0.37) — the phone on the table and the phone in the hand — drawn like the
   getting-ready pictures, without rulers, with a bigger phone and a smaller palm; on both phones' screens the ship follows the palm and shoots rocks. Drawn by the game's own code (game/play/index.html, patched in memory),
   frame by frame in headless Chromium, then packed by make_gif.py. Everything repeats every D seconds, so the GIF loops without a seam.
   Run: node promo/make_gif.js && python3 promo/make_gif.py */
const {chromium}=require('playwright'), fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..'), OUT=path.join(__dirname,'frames');
const D=4.5, FPS=20, W=+(process.env.W||960), H=+(process.env.H||540);
/* where the two pictures sit (as the game's SPLIT_T / SPLIT_H: the phone's centre at ox·W, oy·H + a fixed drop; k — size) and the "or" between them */
const J=process.env.LAYOUT?JSON.parse(process.env.LAYOUT):{}, LT=J.t||{ox:0.23,oy:0.29,k:0.6}, LH_=J.h||{ox:0.665,oy:0.27,k:0.6}, OR=J.or||[0.475,0.56];

let html=fs.readFileSync(path.join(ROOT,'game','play','index.html'),'utf8');
const patch=(a,b)=>{ if(!html.includes(a)) throw new Error('anchor not found: '+a.slice(0,50)); html=html.replace(a,b); };
patch('var PSC=1.6;','var PSC=2.05;');                                               // the phone bigger
patch('var HSC=0.85,','var HSC=0.62,');                                              // the palm smaller
patch('function loop(now){\n  requestAnimationFrame(loop);','function loop(now){\n  requestAnimationFrame(loop); if(window.__gifMode) return;');
patch('function phoneGame(ph,o,cm,f,T,mirror){','function phoneGame(ph,o,cm,f,T,mirror){ if(window.__gifPhone) return window.__gifPhone(ph,o,cm,f,T,{iso:iso,R:R,blit:blit,SHIP_MAP:SHIP_MAP,P:P,light:light,K:K});');
patch('  var t=performance.now()/1000;','  var t=window.__gifMode?window.__gifT*4*Math.PI/(3*'+D+'):performance.now()/1000;');   // star twinkle, looping with the GIF
patch("if(al>0.5&&id!=='phone'){ var d0=","if(al>0.5&&id!=='phone'&&id!=='gif'){ var d0=");     // no height line: no rulers of any kind in the GIF
patch('window.__sonaroids={','window.__gifFrame=function(t,f){ window.__gifT=t; sky(0,0); picture(function(){ var a=scene("gif",t,f,0,true,t,'+JSON.stringify(LT)+'), b=sceneHand("gif",t,f,0,true,t,'+JSON.stringify(LH_)+'), o=[]; o.screens=[a.screen,b.screen]; return o; },false); text("or",LW*'+OR[0]+',LH*'+OR[1]+',P.soft,"center"); var ty=Math.round(LH*0.1), tw=text("sonaroids.app",LW/2,ty,P.band,"center",2); light(LW/2,ty+7,tw*0.4,"127,224,200",0.12); present(0); };\nwindow.__sonaroids={');
const tmp=path.join(ROOT,'game','play','__gif.html'); fs.writeFileSync(tmp,html);

/* the little game on the phone: periodic, worked out by stepping from two loops back */
const PHONE=`(function(){
  var D=${D}, hand=function(t){ return 0.5+0.5*Math.sin(2*Math.PI*t/(D/2)-Math.PI/2); };
  var shipV=function(t){ return 0.14+(1-hand(t))*0.72; };
  function state(t){ var dt=1/60, t0=Math.floor(t/D)*D-2*D, rocks=[], bullets=[], parts=[], fireT=0, k=0, nextRock=t0;
    for(var s=t0;s<t;s+=dt){
      if(s>=nextRock){ var i=Math.round((s-t0)/0.45); rocks.push({u:1.08,v:Math.min(0.88,Math.max(0.12,shipV(s+1.3)+0.12*(((i*5)%3)-1))),r:0.07+0.03*((i*7)%3)/2,id:i}); nextRock+=0.45; }
      fireT-=dt; if(fireT<=0){ fireT+=0.25; bullets.push({u:0.2,v:shipV(s)}); }
      rocks.forEach(function(r){ r.u-=0.42*dt; }); bullets.forEach(function(b){ b.u+=0.9*dt; });
      parts.forEach(function(p){ p.u+=p.du*dt; p.v+=p.dv*dt; p.life-=dt; });
      bullets.forEach(function(b){ rocks.forEach(function(r){ if(!b.dead&&!r.dead&&b.u>r.u-r.r*0.7&&b.u<r.u+r.r&&Math.abs(b.v-r.v)<r.r+0.015){ b.dead=r.dead=true;
        for(var j=0;j<14;j++){ var a=j/14*6.283+r.id; parts.push({u:r.u,v:r.v,du:Math.cos(a)*(0.18+0.1*(j%3)),dv:Math.sin(a)*(0.35+0.2*(j%3)),life:0.5,c:j%3}); } } }); });
      rocks=rocks.filter(function(r){ return !r.dead&&r.u>-0.1; }); bullets=bullets.filter(function(b){ return !b.dead&&b.u<1.05; }); parts=parts.filter(function(p){ return p.life>0; });
    }
    return {rocks:rocks,bullets:bullets,parts:parts,ship:shipV(t)}; }
  window.__hand=hand;
  window.__gifPhone=function(ph,o,cm,f,T,G){
    var m=0.9*cm, x0=ph.X0+m, x1=ph.X1-m, y0=ph.Y0+m, y1=ph.Y1-m, W0=x1-x0, H0=y1-y0;
    function at(u,v){ return G.iso(x0+u*W0,y0+v*H0,ph.Zp,o); }
    for(var i=0;i<22;i++){ var u=(((i*0.137-T*0.05*(1+i%3)*(D/4.5))%1)+1)%1, v=(i*0.311)%1, p=at(u,v); G.R(i%3?G.P.stars[1]:G.P.stars[2],p[0],p[1],1,1); }
    var st=state(T), sz=Math.max(2,Math.round(cm*0.9));
    var inside=function(u,v,m){ return u>m&&u<1-m&&v>0&&v<1; };                     // nothing is drawn past the phone's screen
    st.rocks.forEach(function(r){ if(!inside(r.u,r.v,r.r*0.6)) return; var p=at(r.u,r.v), rad=Math.max(2,Math.round(r.r*H0*0.9));        // a round pixel rock, lit from the top-left
      for(var yy=-rad;yy<=rad;yy++) for(var xx=-rad;xx<=rad;xx++){ var d=xx*xx+yy*yy; if(d>rad*rad+rad*0.6) continue; var l=(-xx-yy)/(rad*1.6);
        G.R(d>(rad-1)*(rad-1)+0.5?G.P.rock[1]:l>0.3?G.P.rock[3]:l>-0.25?G.P.rock[2]:G.P.rock[1],Math.round(p[0])+xx,Math.round(p[1])+yy,1,1); }
      if(rad>=3) G.R(G.P.rock[1],Math.round(p[0])+1,Math.round(p[1]),1,1); });
    st.bullets.forEach(function(b){ if(!inside(b.u,b.v,0.01)) return; var p=at(b.u,b.v); G.R(G.P.bullet,p[0],p[1],3,1); G.light(p[0],p[1],5*G.K,G.P.glowB,0.35); });
    st.parts.forEach(function(q){ if(!inside(q.u,q.v,0.01)) return; var p=at(q.u,q.v); G.R([G.P.rock[3],G.P.bullet,G.P.text][q.c],p[0],p[1],1,1); });
    var sp=at(0.1,st.ship); G.blit(G.SHIP_MAP,G.P.ship,Math.round(sp[0])-2,Math.round(sp[1])-5); G.light(sp[0],sp[1],8*G.K,'127,224,200',0.25);
  };
})();`;

(async()=>{
  fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch(), ctx=await b.newContext({viewport:{width:W,height:H},deviceScaleFactor:1});
  await ctx.addInitScript(`localStorage.setItem('sonaroids_lang','en'); localStorage.setItem('sonaroids_seen','1');`);
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+tmp); await p.waitForTimeout(500);
  await p.evaluate(PHONE); await p.evaluate(()=>{ window.__gifMode=true; });
  const n=process.env.ONE?1:Math.round(D*FPS);
  for(let i=0;i<n;i++){ const t=process.env.ONE?+process.env.ONE:i/FPS; await p.evaluate(t=>window.__gifFrame(t,window.__hand(t)),t);
    await p.screenshot({path:path.join(OUT,String(i).padStart(4,'0')+'.png')}); }
  await b.close(); fs.unlinkSync(tmp);
  console.log(`${n} frames, ${W}×${H}, loop ${D} s at ${FPS} fps`+(errs.length?' | errors: '+errs.join('; '):''));
})();
