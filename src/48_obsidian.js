/* ── v1.42: the heavy SonaFly skin «обсидиан» — a test for flagship phones, switched on in the maintainer's test panel (a long press on the
   version in SonaFly's menu). Everything is drawn on the graphics chip (WebGL 2) on a canvas of its own under the HD one:
   · the wallpaper — the bench's «К переход» (game/bench, W20): ink in fog, the first ink computed «evenly» (half the near ink a frame,
     the far ink at half size), the palette flowing cold ↔ warm, the light going round the screen once a minute; drawn at a lower
     resolution than the screen (the maintainer: «дыра 1.5 — на глаз чернила почти не портят») and stepped down by itself when frames slow;
   · the objects at the screen's own resolution: rocks of black glossy obsidian with glowing gold kintsugi cracks (sparse on the small ones),
     the ship «О5г» — a needle of obsidian and two splinter blades with gold edges, a gold kintsugi vein on its belly; the splinters lag
     a moment behind a turn, drift apart in a roll and close up again; the roll takes 1.6 s (the maintainer: «бочка 1.6»);
   · no explosions (the maintainer: «будем стрелять типа аннигилятором.. чтоб возмущение чернил не загораживать банальным взрывом»):
     a rock hit folds into a point along its cracks, a spark-sized flash, a ring goes through the ink like a lens; a large or medium rock
     breaking in two — a flash of gold along the break and a smaller ring (the maintainer, after three in the game, 1.42: «схлопывание —
     самый играбельный, не тормозит, красивый, ничего лишнего. Берем его»; the gold threads «очень мельтешат и… тормозит», the negative
     «играбелен, но некрасивый» — both dropped in 1.43);
   · the ink's masses pushed and swirled by each hit (1.43, the maintainer: «сами массы чернил слабо реагируют на взрывы камней.. я бы
     поиграл с этим ползунком»): the near and far ink are sampled shifted away from the hit, a wave spreading and relaxing over ~4 s; how
     strongly — a slider in the test panel («ЧЕРНИЛА НА ВЗРЫВЫ», 0–100%, 50% by default; 100% is twice the default).
   The menus keep the space skin's pictures (this skin draws only where the flight field is: the game, its count-down, pause, the end).
   Without WebGL 2 the switch says so and the skin stays off. ── */
var OBS={ok:null,err:'',cv:null,g:null,act:false,rk:[],drew:false,vis:false,t:34,list:[],an:[],hist:[],shipH:[],ship:null,rollT0:-9,rollWas:false,
  bd:1.5,od:3,q:2,perf:{t:0,n:0,sum:0,skip:3},P:{},key:'',tx:null};
function obsOn(){ return typeof store!=='undefined'&&store.get('sonaroids_obs','0')==='1'&&obsInit(); }
/* v1.43–1.44: the maintainer's sliders for the skin (in the pause, 0…1, 0.5 by default; the shaders take twice the value):
   ink — how strongly a hit draws the ink in; ring — how far the ring is from a circle; wake — the ship's wake; rwake — the rocks' wakes */
/* v1.45: 0–200% (the maintainer: «самое зрелищное это 100/100/50/100.. можно было бы и по зрелищнее (200?)»), those four his picks to start;
   and the ink's fine detail (the maintainer: «иногда слишком широкие мазки без детализации, без нитей… может им тоже ползунок?») */
var OBS_SL=[['obs_ink','sonaroids_obs_ink',1],['obs_ring','sonaroids_obs_ring',1],['obs_wake','sonaroids_obs_wake',0.5],['obs_rwake','sonaroids_obs_rwake',1],['obs_det','sonaroids_obs_det',0.5],['obs_vsp','sonaroids_obs_vsp',0.5]];
function obsSl(id){ for(var i=0;i<OBS_SL.length;i++) if(OBS_SL[i][0]===id){ var d=OBS_SL[i][2], v=typeof store!=='undefined'?+store.get(OBS_SL[i][1],String(d)):d; return v>=0&&v<=2?v:d; } return 0.5; }
function obsSlSet(id,v){ for(var i=0;i<OBS_SL.length;i++) if(OBS_SL[i][0]===id){ store.set(OBS_SL[i][1],String(v)); return true; } return false; }
function obsInk(){ return obsSl('obs_ink'); }
/* v1.46: the shot to try (Л1 comet, Л4 beads, Л5 crystal, Л6 a fringe of the ink's opposite colour) and the power-up's rim (on / off) */
var OBS_SHOTS=[1,4,5,6];
function obsShot(){ var v=typeof store!=='undefined'?+store.get('sonaroids_obs_shot','1'):1; return OBS_SHOTS.indexOf(v)>=0?v:1; }
function obsRingOn(){ return typeof store==='undefined'||store.get('sonaroids_obs_ringon','1')==='1'; }
function obsGRim(){ return typeof store==='undefined'||store.get('sonaroids_obs_grim','1')==='1'; }
/* the skin for a SonaFly view: this one while the switch is on */
function obsWrap(sk){ return obsOn()?OBSK:sk; }
function obsInit(){ if(OBS.ok!==null) return OBS.ok; OBS.ok=false;
  try{ var c=document.createElement('canvas'); c.id='obs'; c.style.cssText='position:fixed;left:0;top:0;display:none;pointer-events:none';
    var g=c.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
    if(!g){ OBS.err='no webgl2'; return false; }
    document.body.insertBefore(c,(typeof hdCv!=='undefined'&&hdCv)||cv); OBS.cv=c; OBS.g=g;
    c.addEventListener('webglcontextlost',function(e){ e.preventDefault(); OBS.lost=true; });
    c.addEventListener('webglcontextrestored',function(){ OBS.lost=false; OBS.P={}; OBS.key=''; OBS.tx=null; OBS.noise=null; OBS.buf=null; obsGl(); });
    obsGl(); OBS.ok=true; }catch(e){ OBS.err=String(e&&e.message||e); OBS.ok=false; }
  return OBS.ok; }
function obsGl(){ var g=OBS.g; OBS.f16=!!g.getExtension('EXT_color_buffer_float'); OBS.vao=g.createVertexArray(); }

/* ═════ the shaders ═════ */
var OBS_VS='#version 300 es\nvoid main(){ vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2)); gl_Position=vec4(p*2.0-1.0,0.0,1.0); }';
var OBS_COMMON=['#version 300 es','precision highp float; precision highp int;','uniform vec2 uRes; uniform float uTime; uniform int uQ;','out vec4 fragColor;',
'float h13(vec3 p){ p=fract(p*0.1031); p+=dot(p,p.zyx+31.32); return fract((p.x+p.y)*p.z); }',
'float h12(vec2 p){ vec3 q=fract(vec3(p.xyx)*0.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }',
'float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);',
'  return mix(mix(mix(h13(i),h13(i+vec3(1,0,0)),f.x),mix(h13(i+vec3(0,1,0)),h13(i+vec3(1,1,0)),f.x),f.y),',
'             mix(mix(h13(i+vec3(0,0,1)),h13(i+vec3(1,0,1)),f.x),mix(h13(i+vec3(0,1,1)),h13(i+vec3(1,1,1)),f.x),f.y),f.z); }',
'float fbm(vec3 p,int oc){ float a=0.5,s=0.0; for(int i=0;i<8;i++){ if(i>=oc) break; s+=a*n3(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5; } return s; }',
'mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }',
'float AR(){ return uRes.x/uRes.y; }','vec2 uvOf(){ return (gl_FragCoord.xy-0.5*uRes)/uRes.y; }',
'vec3 tone(vec3 c){ c=1.0-exp(-c*1.25); return pow(c,vec3(0.4545)); }',
'uniform vec2 uShip; uniform float uAmt; uniform float uSH[24];',
'float inkA(float f){ return clamp(f+(uAmt-0.5)*0.36,0.0,1.0); }',
/* where the ship was a seconds ago (sampled every 0.15 s): its wake stirs the ink behind it */
'float shipHist(float a){ float i=clamp(a/0.15,0.0,22.99); int k=int(i); return mix(uSH[k],uSH[k+1],fract(i)); }'].join('\n');
var OBS_EVF=[
'uniform float uMix;',
'vec3 inkColM(vec2 q,vec2 r,float f){ vec3 a0=vec3(0.012,0.008,0.035), b0=vec3(0.16,0.05,0.30), c0=vec3(0.02,0.20,0.26), d0=vec3(0.50,0.30,0.10);',
'  vec3 a1=vec3(0.012,0.004,0.004), b1=vec3(0.36,0.04,0.05), c1=vec3(0.45,0.22,0.04), d1=vec3(0.06,0.22,0.30);',
'  vec3 a=mix(a0,a1,uMix), b=mix(b0,b1,uMix), c=mix(c0,c1,uMix), d=mix(d0,d1,uMix);',
'  vec3 k=mix(a,b,clamp(f*f*2.2,0.0,1.0)); k=mix(k,c,clamp(length(q)*0.65-0.25,0.0,1.0)); k=mix(k,d,clamp(r.x*r.x*1.3-0.35,0.0,1.0)*0.55); return k; }',
'uniform vec4 uFx[8]; uniform int uNf; uniform float uStir; uniform float uWake; uniform vec4 uRk[12]; uniform int uNr; uniform float uRWake;',
/* how the ink is read (an offset of where it is sampled): the ink moves the other way. v1.44 (the maintainer: «возмущение чернил от
   взрывов — их собирание в точку взрыва»; «след… начиная с носа — сначала маленький, потом расходится»; «след от камней… от больших
   широкий, от маленьких узкий, и тоже расходящийся»):
   · a hit draws the ink round it in to its point (read from further out) with a turn, then lets it go over ~3 s;
   · the ship cuts the ink from its nose: two arms of a V that open behind it, the ink pushed off the nose's path along them, a narrow
     churn right behind the tail; each rock the same, smaller, its V as wide as the rock and opening behind it */
'vec2 stir(vec2 uv){ vec2 p=vec2(0.0);',
'  for(int i=0;i<8;i++){ if(i>=uNf) break; vec4 f=uFx[i]; vec2 d=uv-f.xy; float r=length(d), a=f.z, sz=clamp(f.w/0.075,0.3,1.0);',
'    float sg=0.06+0.10*sz, A=uStir*0.30*sz*(1.0-exp(-a*7.0))*(1.0-smoothstep(0.4,3.0,a)), g=exp(-r*r/(sg*sg))*min(1.0,r/(sg*0.35)); vec2 n=d/max(r,1e-4);',
'    p+=(n+vec2(-n.y,n.x)*(fract(f.x*13.7+f.y*7.1)>0.5?0.5:-0.5))*A*g; }',
'  float back=uShip.x-uv.x; if(uWake>0.0&&back>0.0&&back<1.2){ float ty=shipHist(back/0.35), sl=(shipHist((back+0.01)/0.35)-ty)/0.01; float ln=sqrt(1.0+sl*sl);',
'    vec2 nr=vec2(sl,1.0)/ln; float s=(uv.y-ty)/ln, sg=s/(abs(s)+0.002);',   /* across the nose's path, square to it (the path is steep when the ship moved) */
'    float h=0.003+back*0.20, w=0.004+back*0.07, arm=exp(-pow((abs(s)-h)/w,2.0)), amp=uWake*1.6*w*exp(-back*1.4)*smoothstep(0.0,0.02,back);',   /* the push never wider than the arm: no folds */
'    p-=nr*sg*arm*amp; p.x+=arm*amp*0.4;',
'    float core=exp(-s*s/(0.0002+back*back*0.004))*exp(-back*2.2)*smoothstep(0.05,0.14,back); p-=nr*sg*core*uWake*0.012; }',
'  for(int i=0;i<12;i++){ if(i>=uNr) break; vec4 k=uRk[i]; vec2 dir=vec2(cos(k.w),sin(k.w)), d=uv-k.xy; float al=-dot(d,dir)-k.z*0.6; if(al<=0.0||al>0.6) continue;',
'    float ac=dot(d,vec2(-dir.y,dir.x)), h=k.z*0.55+al*0.18, w=k.z*0.22+al*0.05, arm=exp(-pow((abs(ac)-h)/w,2.0)), amp=uRWake*1.0*w*exp(-al*3.0)*smoothstep(0.0,0.04,al);',
'    p-=vec2(-dir.y,dir.x)*(ac/(abs(ac)+0.002))*arm*amp; p+=dir*arm*amp*0.4; }',
'  return p/(1.0+length(p)*0.5); }',   /* several pushes in one place add up, but softly */
'float inkD(vec2 p,int oc,out vec2 q,out vec2 r){ q=vec2(fbm(vec3(p,uTime*0.035),oc),fbm(vec3(p+vec2(5.2,1.3),uTime*0.035),oc));',
'  r=vec2(fbm(vec3(p+4.0*q+vec2(1.7,9.2),uTime*0.05),oc),fbm(vec3(p+4.0*q+vec2(8.3,2.8),uTime*0.05),oc)); return fbm(vec3(p+4.0*r,uTime*0.025),oc); }',
'float inkCheap(vec2 p){ vec2 q=vec2(fbm(vec3(p,uTime*0.035),3),fbm(vec3(p+vec2(5.2,1.3),uTime*0.035),3)); return fbm(vec3(p+4.0*q,uTime*0.03),3); }'].join('\n');
/* the ink: near (colour + density, and the cheap density for the light) or far (half size) */
var OBS_FS_N=OBS_COMMON.replace('out vec4 fragColor;','layout(location=0) out vec4 fragColor; layout(location=1) out vec4 frag1;')+'\n'+OBS_EVF+'\n'+[
'uniform float uEnc; uniform float uMode; uniform float uDet; uniform float uVsp;',
'vec4 enc(vec4 v){ return uEnc>0.0?sqrt(clamp(v*0.5,0.0,1.0)):v; }',
'void main(){ vec2 uv=vec2((gl_FragCoord.x-0.5*uRes.x)/uRes.y,gl_FragCoord.y/uRes.y-0.5); int OC=uQ==0?3:uQ==1?4:5; vec2 sv=stir(uv);',
'  if(uMode>0.5){ vec2 pf=uv*0.8+vec2(uTime*0.012,7.0)+sv*0.4; vec2 q2,r2; float f2=inkD(pf,max(OC-1,2),q2,r2);',
'    vec3 far=inkColM(q2,r2,f2)*mix(vec3(0.45,0.6,1.0),vec3(0.8,0.55,0.5),uMix)*(0.04+0.45*f2*f2*f2); fragColor=enc(vec4(far,1.0)); frag1=vec4(0.0); return; }',
/* v1.45 the detail (uDet 0 — as before): a fine wobble before the warps (they blow it up into ragged edges), and thin veins along the
   warped ink's ridges at two sizes — kept apart (frag1.g) and laid over the wallpaper whatever the ink's density there, so the broad dim
   strokes get threads too */
'  vec2 p=uv*1.5+vec2(uTime*0.028,0.0)+sv; if(uDet>0.0) p+=uDet*0.018*(vec2(n3(vec3(p*9.0,uTime*0.08)),n3(vec3(p*9.0+5.3,uTime*0.08)))-0.5); vec2 q,r; float f=inkD(p,OC,q,r);',
'  float vn=0.0; if(uDet>0.0){ float tv=uTime*uVsp; float r1=1.0-abs(2.0*fbm(vec3(p*2.4+3.0*r+vec2(tv*0.02,0.0),tv*0.03),3)-1.0), r2=1.0-abs(2.0*fbm(vec3(p*5.5+2.0*q-vec2(0.0,tv*0.015),tv*0.04+3.0),2)-1.0); vn=uDet*(0.6*pow(r1,7.0)+0.4*pow(r2,9.0)); } float fa=inkA(f); vec3 near=inkColM(q,r,fa)*(0.10+1.3*fa*fa*fa);',
'  fragColor=enc(vec4(near,f)); frag1=enc(vec4(inkCheap(p),min(vn,1.9),0.0,1.0)); }'].join('\n');
/* the wallpaper from the ink: far under near, the light's rims on the ink, the shafts through its gaps */
var OBS_FS_B=OBS_COMMON+'\n'+[
'uniform sampler2D uA; uniform sampler2D uB; uniform sampler2D uF; uniform float uEnc; uniform float uExt; uniform float uMix; uniform vec2 uSun;',
'vec4 dec(vec4 v){ return uEnc>0.0?v*v*2.0:v; }',
'vec2 tcOf(vec2 u){ return vec2((u.x*uRes.y+0.5*uRes.x)/uRes.x,(u.y+0.5)/uExt); }',
'void main(){ vec2 uv=uvOf(); int NS=uQ==0?6:uQ==1?9:12; vec2 sun=uSun;',
'  vec4 A=dec(texture(uA,tcOf(uv))); vec3 near=A.rgb, far=dec(texture(uF,tcOf(uv))).rgb; float f=A.a, dens=smoothstep(0.42,0.80,inkA(f));',
'  vec3 col=mix(far,near,dens); col*=mix(0.75,0.6,uMix); float lu=dot(col,vec3(0.3,0.59,0.11)); col=max(mix(vec3(lu),col,1.45),0.0);',
'  vec2 ld=normalize(sun-uv); float fl=dec(texture(uB,tcOf(uv+ld*0.06))).r; float rim=clamp((f-fl)*5.0,0.0,1.0); float vn=dec(texture(uB,tcOf(uv))).g;',
'  vec3 lc=mix(vec3(1.0,0.78,0.48),vec3(0.55,0.80,1.0),uMix); vec3 nk=near/(max(near.r,max(near.g,near.b))+1e-3); col+=mix(lc,nk,0.65)*rim*dens*0.13*(0.4+0.6*smoothstep(2.2,0.3,length(uv-sun)));',
'  vec2 ds=uv-sun; float dl=length(ds); float bm=0.0; for(int i=0;i<3;i++){ float fi=float(i); bm+=pow(n3(vec3(normalize(ds)*(8.0+fi*7.0),fi*3.0+uTime*(0.04+fi*0.03))),3.0)*(0.9-fi*0.2); }',
'  float T=0.0; for(int i=1;i<=16;i++){ if(i>NS) break; vec2 u=uv+(sun-uv)*float(i)/float(NS); T+=smoothstep(0.35,0.8,dec(texture(uB,tcOf(u))).r); } T=exp(-T/float(NS)*2.4);',
'  vec3 tint=mix(lc,normalize(near+1e-3)*1.2,0.45); col+=tint*bm*T*0.075*exp(-dl*0.7)*(0.5+0.6*(1.0-dens))+lc*0.03/(dl*dl+0.04)*0.06;',
'  col+=(col*1.1+mix(lc,nk,0.5)*0.02)*vn;',
'  col*=1.0-0.25*smoothstep(0.35,0.75,abs(uv.y));',
'  fragColor=vec4(tone(col),1.0); }'].join('\n');
/* shared by the screen passes: the wallpaper in linear light, the annihilations' list */
var OBS_SC=['#version 300 es','precision highp float; precision highp int;','uniform vec2 uRes; uniform float uT; uniform sampler2D uBg; uniform int uDisp;','out vec4 fragColor;',
'float h12(vec2 p){ vec3 q=fract(vec3(p.xyx)*0.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }',
'float n2(vec2 x){ vec2 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f); return mix(mix(h12(i),h12(i+vec2(1,0)),f.x),mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),f.x),f.y); }',
'float fb(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=a*n2(p); p*=2.03; a*=0.5; } return s; }',
'mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }',
'vec2 rotv(vec2 v,float a){ float c=cos(a),s=sin(a); return vec2(c*v.x-s*v.y,s*v.x+c*v.y); }',
'float ez(float r){ r=clamp(r,0.0,1.0); return r<0.5?2.0*r*r:1.0-2.0*(1.0-r)*(1.0-r); }',
'vec3 lin(vec3 c){ return pow(max(c,0.0),vec3(2.2)); }',
'vec3 bgAt(vec2 u){ return lin(texture(uBg,vec2(u.x*uRes.y/uRes.x+0.5,u.y+0.5)).rgb); }',
'vec4 outC(vec4 c){ if(uDisp==1) c.rgb=pow(max(c.rgb,0.0),vec3(0.4545)); return c; }',
'float luAt(vec2 u){ return dot(texture(uBg,vec2(u.x*uRes.y/uRes.x+0.5,u.y+0.5)).rgb,vec3(0.3,0.59,0.11)); }',
/* v1.44 (the maintainer: «не ровной окружностью, а индивидуальной кривой, которая расходится/тает по индивидуальному рисунку чернил»):
   the ring's radius along its round — a noise of its own (seamless round the circle) and the ink under it (it runs ahead in dense ink,
   lags in thin); irr 0 — a true circle */
'uniform float uIrr; uniform int uRingOn;',   /* v1.46: the hit\'s ring on / off (the maintainer: «сделай выключатель кольца от взрыва.. хочу посмотреть как будет без него») */
'float ringK(vec2 n,float sd,float lu){ float an=n2(n*2.2+sd*7.3)*0.65+n2(n*5.0+sd*3.1)*0.35; return max(0.3,1.0+uIrr*((an-0.5)*1.1+(lu-0.3)*0.7)); }',
'float ringA(float lu){ return mix(1.0,0.25+1.6*smoothstep(0.08,0.45,lu),min(uIrr,1.0)); }'].join('\n');
/* the wallpaper on the screen, pushed about where the annihilations happen (in linear light into the scene, or straight to the screen) */
var OBS_FS_C=OBS_SC+'\n'+[
'uniform vec4 uAn[12]; uniform vec4 uAk[12]; uniform int uNa;',
'void main(){ vec2 uv=(gl_FragCoord.xy-0.5*uRes)/uRes.y; vec2 su=uv; float lens=0.0;',
'  for(int i=0;i<12;i++){ if(i>=uNa||uRingOn==0) break; vec4 A=uAn[i], B=uAk[i]; float a=A.z, R=A.w; vec2 d=uv-A.xy; float L=length(d); if(L>1.2) continue; vec2 n=d/max(L,1e-4); float sz=R/0.075; bool sp=B.y>0.5;',
'    float ac=a-(sp?0.08:0.30); if(ac>0.0&&ac<2.0){ float k=sp?0.5:1.0, lu=luAt(uv), rk=ringK(n,B.z,lu), rr=(R*0.4+ac*0.36)*rk, w=(0.018+ac*0.03)*(0.7+0.3*rk), amp=0.055*sz*k*exp(-ac*1.1)*ringA(lu); float x=(L-rr)/w; su-=n*amp*x*exp(-x*x)*1.6; lens+=exp(-x*x)*exp(-ac*1.4)*sz*k*ringA(lu); }',
'  }',
'  vec3 col=bgAt(su); col*=1.0+0.35*lens;',
'  fragColor=outC(vec4(col,1.0)); }'].join('\n');
/* the scene to the screen */
var OBS_FS_F=['#version 300 es','precision highp float;','uniform sampler2D uS; uniform vec2 uRes; out vec4 o;','void main(){ vec3 c=texture(uS,gl_FragCoord.xy/uRes).rgb; o=vec4(pow(max(c,0.0),vec3(0.4545)),1.0); }'].join('\n');
/* the objects: one quad each (a: x, y, reach, kind; b, c: the kind's own numbers) */
var OBS_VS_O=['#version 300 es','precision highp float;','layout(location=0) in vec4 aA; layout(location=1) in vec4 aB; layout(location=2) in vec4 aC;','uniform vec2 uRes;',
'out vec2 vP; flat out vec4 vA; flat out vec4 vB; flat out vec4 vC;',
'void main(){ vec2 cr=vec2(float(gl_VertexID&1),float((gl_VertexID>>1)&1))*2.0-1.0; vec2 p=aA.xy+cr*aA.z; vP=p; vA=aA; vB=aB; vC=aC; gl_Position=vec4(p.x*2.0*uRes.y/uRes.x,p.y*2.0,0.0,1.0); }'].join('\n');
var OBS_FS_O=OBS_SC+'\n'+[
'in vec2 vP; flat in vec4 vA; flat in vec4 vB; flat in vec4 vC;',
'uniform vec2 uL; uniform vec3 uLc; uniform vec4 uPose[3];',
'float rockR(float a,float sd){ float r=1.0; for(int k=0;k<3;k++){ float fk=float(k); r+=0.09/(1.0+fk)*sin(a*(3.0+fk*2.0)+sd*(1.7+fk)+fk); } return r; }',
'vec3 vor(vec2 p){ vec2 n=floor(p), f=fract(p); float d1=8.0,d2=8.0; vec2 id=vec2(0.0); for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g=vec2(i,j), o=vec2(h12(n+g),h12(n+g+7.3)); vec2 r=g+o-f; float d=dot(r,r); if(d<d1){ d2=d1; d1=d; id=n+g; } else if(d<d2) d2=d; } return vec3(sqrt(d2)-sqrt(d1),id); }',
'float sdSeg(vec2 p,vec2 a,vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*h); }',
'const vec3 GOLD=vec3(1.0,0.70,0.28);',
/* a rock of obsidian: a black mirror (the ink in its facets), sharp highlights after the light, gold cracks glowing (few on the small ones) */
'vec4 rock(vec2 uv,vec2 c,float R,float sd,float rotA,float flare){ vec2 q=rot(rotA)*(uv-c)/R; float a=atan(q.y,q.x), L=length(q), rr=rockR(a,sd); float px=1.2/(uRes.y*R); if(L>rr+px) return vec4(0.0);',
'  float cov=smoothstep(rr+px,rr-px,L); vec2 qn=q/rr; float z=sqrt(max(0.0,1.0-dot(qn,qn))); vec3 n=normalize(vec3(qn,z*0.9));',
'  vec3 Ld=normalize(vec3(rot(rotA)*(uL-c),0.45)); vec3 V=vec3(0,0,1);',
'  vec3 v=vor(q*2.2+sd); vec3 fn=normalize(n+vec3(h12(v.yz)-0.5,h12(v.yz+3.1)-0.5,0.0)*0.9); float df=max(dot(fn,Ld),0.0); vec3 hh=normalize(Ld+V); float edge=smoothstep(0.06,0.0,v.x);',
'  float fr=0.03+0.97*pow(1.0-max(dot(fn,V),0.0),5.0); vec3 env=bgAt(c+(uv-c)*0.6+fn.xy*0.12)*1.8;',
'  vec3 col=vec3(0.0012,0.0012,0.002)+vec3(0.006,0.006,0.008)*df+env*fr*0.8+uLc*(pow(max(dot(fn,hh),0.0),220.0)*6.0+pow(max(dot(fn,hh),0.0),30.0)*0.10)+uLc*edge*0.03;',
'  float sz=clamp(R/0.085,0.2,1.0); vec3 v2=vor(q*mix(0.5,1.6,sz)+sd*1.3+3.0); float w=0.075+0.015*(1.0-sz); float inner=smoothstep(0.99,0.8,L/rr);',
'  float seam=smoothstep(w*(1.0+flare*0.8),w*0.45,v2.x)*inner; float halo=exp(-v2.x*12.0)*inner*mix(0.4,1.0,sz);',
'  vec3 g=GOLD*(1.1+0.9*df)+vec3(1.0,0.9,0.7)*pow(max(dot(fn,hh),0.0),30.0)*2.0; col=mix(col,g*1.25*(1.0+flare*1.5),seam); col+=GOLD*halo*(0.30+flare*1.2);',
'  return vec4(col*cov,cov); }',
/* the ship О5г: three knife-edged slabs of obsidian, marched through along the view */
'float sdPolyN(vec2 p,vec2 v[8],int N){ float d=dot(p-v[0],p-v[0]); float sg=1.0; int j=N-1; for(int i=0;i<8;i++){ if(i>=N) break; vec2 e=v[j]-v[i], w=p-v[i]; vec2 b=w-e*clamp(dot(w,e)/dot(e,e),0.0,1.0); d=min(d,dot(b,b));',
'    bvec3 cc=bvec3(p.y>=v[i].y,p.y<v[j].y,e.x*w.y>e.y*w.x); if(all(cc)||all(not(cc))) sg*=-1.0; j=i; } return sg*sqrt(d); }',
'float out2(int id,vec2 p){ vec2 v[8];',
'  if(id==0){ float th=0.20; v[0]=vec2(1.10,0.0); v[1]=vec2(0.35,th*0.75); v[2]=vec2(-0.25,th); v[3]=vec2(-0.75,th*0.65); v[4]=vec2(-0.62,0.0); v[5]=vec2(-0.78,-th*0.7); v[6]=vec2(-0.20,-th*0.95); v[7]=vec2(0.45,-th*0.55); return sdPolyN(p,v,8); }',
'  if(id==1){ v[0]=vec2(0.38,0.285); v[1]=vec2(-0.30,0.40); v[2]=vec2(-0.93,0.47); v[3]=vec2(-0.71,0.335); v[4]=vec2(-0.52,0.245); return sdPolyN(p,v,5); }',
'  v[0]=vec2(0.28,-0.285); v[1]=vec2(-0.35,-0.40); v[2]=vec2(-0.98,-0.48); v[3]=vec2(-0.78,-0.345); v[4]=vec2(-0.58,-0.245); return sdPolyN(p,v,5); }',
'float piece(int id,vec3 p){ float d2=out2(id,p.xy); float k=id==0?0.60:0.40; return max(d2,(abs(p.z)+k*d2)/sqrt(1.0+k*k)); }',
'mat3 rx(float a){ float c=cos(a),s=sin(a); return mat3(1,0,0, 0,c,s, 0,-s,c); }',
'mat3 rz(float a){ float c=cos(a),s=sin(a); return mat3(c,s,0, -s,c,0, 0,0,1); }',
'mat3 PM[3]; vec3 PO[3];',
'vec3 toBody(int i,vec3 w){ return transpose(PM[i])*w-PO[i]; }',
'float mapS(vec3 w,out int id){ float d=1e5; id=0; for(int i=0;i<3;i++){ float di=piece(i,toBody(i,w)); if(di<d){ d=di; id=i; } } return d; }',
'vec4 ship3(vec2 uv,vec2 c,float S,float fl){ vec2 q=(uv-c)/S; if(length(q)>1.8) return vec4(0.0);',
'  for(int i=0;i<3;i++){ PM[i]=rz(uPose[i].x)*rx(uPose[i].y); float s=i==1?1.0:i==2?-1.0:0.0; PO[i]=vec3(-uPose[i].w,s*uPose[i].z,0.0); }',
'  vec3 tw=PM[0]*vec3(-0.98,0.0,0.0); vec2 hx=normalize((PM[0]*vec3(1,0,0)).xy+1e-4); vec2 lq=vec2(dot(q-tw.xy,hx),dot(q-tw.xy,vec2(-hx.y,hx.x)));',
'  float fe=length(lq/vec2(0.28*fl,0.06)); vec3 eng=vec3(1.0,0.82,0.5)*exp(-fe*fe*1.3)*1.2;',
'  float px=1.0/(uRes.y*S); float z=1.0, dmin=1e5, zmin=1.0; int id=0; bool hit=false;',
'  for(int s=0;s<64;s++){ int ii; float d=mapS(vec3(q,z),ii); if(d<dmin){ dmin=d; zmin=z; id=ii; } if(d<0.0008){ hit=true; break; } z-=max(d*0.9,0.002); if(z<-1.0) break; }',
'  if(!hit) eng+=GOLD*0.10*exp(-dmin*45.0); float cov=hit?1.0:smoothstep(px*1.2,0.0,dmin); if(cov<=0.0) return vec4(eng,0.0);',
'  vec3 pb=toBody(id,vec3(q,zmin)); mat3 M=PM[id];',
'  float e=0.002; vec3 nb=normalize(vec3(piece(id,pb+vec3(e,0,0))-piece(id,pb-vec3(e,0,0)),piece(id,pb+vec3(0,e,0))-piece(id,pb-vec3(0,e,0)),piece(id,pb+vec3(0,0,e))-piece(id,pb-vec3(0,0,e))));',
'  float d2=out2(id,pb.xy); vec3 v=vor(pb.xy*2.0+3.0+float(id)*5.0); nb=normalize(nb+vec3(h12(v.yz)-0.5,h12(v.yz+3.1)-0.5,0.0)*0.55*smoothstep(0.0,-0.05,d2));',
'  bool belly=nb.z<0.0; vec3 n=M*nb; if(n.z<0.0) n=-n;',
'  vec3 Ld=normalize(vec3((uL-c)/0.5,0.6)), V=vec3(0,0,1), hh=normalize(Ld+V); float df=max(dot(n,Ld),0.0);',
'  float fr=0.04+0.96*pow(1.0-max(n.z,0.0),4.0); vec3 env=bgAt(c+(uv-c)*0.5+n.xy*0.15)*1.8;',
'  vec3 col=vec3(0.0012,0.0012,0.002)+vec3(0.006)*df+env*fr*0.8+uLc*(pow(max(dot(n,hh),0.0),200.0)*6.0+pow(max(dot(n,hh),0.0),28.0)*0.12);',
'  float trim=smoothstep(0.030,0.009,-d2);',
'  if(belly&&id==0){ float vein=abs(pb.y-0.025*sin(pb.x*6.0+1.0)); float sm=smoothstep(0.022,0.008,vein)*step(-0.62,pb.x)*step(pb.x,0.85); vec3 vb=vor(pb.xy*vec2(2.2,3.0)+11.0); sm=max(sm,smoothstep(0.05,0.018,vb.x)*smoothstep(0.0,-0.06,d2)*0.9); trim=max(trim,sm); }',
'  vec3 g=GOLD*(1.15+0.8*df)+vec3(1.0,0.9,0.7)*pow(max(dot(n,hh),0.0),30.0)*1.5; col=mix(col,g,trim); if(!hit) col=mix(col,g,0.6);',
'  return vec4(col*cov+eng*(1.0-cov),cov); }',
/* the shield: a thin gold ring round the ship, shimmering */
'vec4 shield(vec2 uv,vec2 c,float S){ vec2 p=(uv-c)/S; float L=length(p/vec2(1.0,0.8)); float a=atan(p.y,p.x); float w=0.035+0.02*sin(a*3.0+uT*5.0);',
'  float r=exp(-pow((L-1.0)/w,2.0))*(0.55+0.45*sin(a*2.0-uT*3.0)); return vec4(GOLD*r*1.2+GOLD*exp(-pow((L-1.0)/0.15,2.0))*0.06,0.0); }',
/* the annihilations (the wallpaper\'s part is in the composite pass): kind 0 А, 1 Б, 2 В; split — a rock breaking into two */
'vec4 ann(vec2 uv,vec2 c,float a,bool sp,float sd,float R,float rotA){ vec3 col=vec3(0.0); float cov=0.0; float sz=R/0.075;',
'  if(!sp){',
'      if(a<0.30){ float s=1.0-ez(a/0.30); vec4 r=rock(uv,c,R*max(s,0.02),sd,rotA+a*4.0,smoothstep(0.0,0.08,a)); col=r.rgb; cov=r.a; col+=GOLD*cov*smoothstep(0.0,0.08,a)*0.9; col+=GOLD*smoothstep(0.0,0.08,a)*0.5*exp(-pow(length(uv-c)/(R*s*1.3+0.004),2.0)); }',
'      float ap=a-0.30; if(ap>0.0&&ap<0.25){ float pt=exp(-ap*14.0); col+=vec3(1.0,0.92,0.75)*pt*(exp(-pow(length(uv-c)/0.006,2.0))*3.0+exp(-pow(length(uv-c)/0.03,2.0))*0.3); }',
'      if(uRingOn==1&&ap>0.0&&ap<1.6){ vec2 nn=normalize(uv-c+1e-5); float lu=luAt(uv); col+=GOLD*0.10*exp(-ap*3.0)*exp(-pow((length(uv-c)-(R*0.4+ap*0.36)*ringK(nn,sd,lu))/0.003,2.0))*sz*ringA(lu); } }',
'    else { vec2 q=rot(rotA)*(uv-c); float k=exp(-a*9.0); float seam=exp(-pow(q.y/0.0035,2.0))*smoothstep(R*1.05,R*0.6,abs(q.x)); col+=GOLD*seam*k*2.2+GOLD*exp(-dot(q,q)/(R*R*0.5))*k*0.25;',
'      float ap=a-0.08; if(uRingOn==1&&ap>0.0&&ap<1.0){ vec2 nn=normalize(uv-c+1e-5); float lu=luAt(uv); col+=GOLD*0.06*exp(-ap*3.0)*exp(-pow((length(uv-c)-(R*0.4+ap*0.36)*ringK(nn,sd,lu))/0.003,2.0))*sz*ringA(lu); } }',
'  return vec4(col,cov); }',
/* v1.46 the shots — the gold laser's variations to choose in the game (the maintainer: «в игре сделай выбор л1, л4, л5, л6»):
   1 a comet (a white-hot head, a thin gold tail), 4 beads (a head and three fading behind), 5 a gold crystal with a white facet,
   6 the laser with a fringe of the ink's opposite colour; q — along the shot */
'uniform int uShot;',
'vec3 invOf(vec3 lc){ vec3 s=pow(clamp(lc,0.0,1.0),vec3(0.4545)); vec3 v=vec3(1.0)-s; float m=max(v.r,max(v.g,v.b)), n=min(v.r,min(v.g,v.b)); v=(v-n)/max(m-n,1e-3); return mix(vec3(1.0),v,0.8); }',
'vec3 shot(vec2 q,vec2 c){ vec3 G=vec3(1.0,0.75,0.3), W=vec3(1.0,0.95,0.85); vec3 a=vec3(0.0);',
'  if(uShot==1){ float h=length(q/vec2(0.006,0.0035)); a+=W*exp(-h*h*2.0)*2.2; float b=-q.x; if(b>0.0&&b<0.07){ float w=0.0018+b*0.02; a+=G*exp(-q.y*q.y/(w*w))*pow(1.0-b/0.07,1.5)*1.3; } a+=G*exp(-dot(q,q)/0.0006)*0.10; }',
'  else if(uShot==4){ for(int j=0;j<4;j++){ float r=length(q+vec2(float(j)*0.016,0.0)), s=0.0042*(1.0-float(j)*0.2); a+=(j==0?W*1.6:G*(1.2-float(j)*0.25))*exp(-r*r/(s*s)); } a+=G*exp(-dot(q,q)/0.0007)*0.10; }',
'  else if(uShot==5){ vec2 b=abs(q); float d=b.x/0.026+b.y/0.0055-1.0; float body=smoothstep(0.08,-0.08,d); a+=G*body*1.5+W*body*smoothstep(0.0012,0.0,abs(q.y))*1.2+G*exp(-max(d,0.0)*3.0)*0.35*(1.0-body); }',
'  else { vec2 p=q/vec2(0.028,0.006); float d=length(vec2(max(abs(p.x)-0.5,0.0),p.y)); a+=G*exp(-d*d*3.0)*1.6; if(uShot==6) a+=invOf(bgAt(c))*exp(-pow((d-1.15)/0.35,2.0))*0.55*0.30; else a+=G*exp(-d*d*0.25)*0.25; }',
'  return a; }',
/* v1.46 the power-up «Т2» (the maintainer: «подарки т2, но… рисунок крупнее и жирнее; и вариант без переливающейся кромки — выберу в игре»):
   a tile of glowing gold, beveled; its sign is drawn over it in black on the HD canvas, big and bold; a thick rim of the ink's opposite
   colour (the ink right under it, so it shifts as the ink flows by) — or none */
'uniform int uGRim;',
'float sdRBox(vec2 p,vec2 b,float r){ vec2 q=abs(p)-b+r; return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r; }',
'vec4 tile(vec2 uv,vec2 c,float S){ vec2 p=(uv-c)/S; float d=sdRBox(p,vec2(0.86),0.26); float px=1.5/(uRes.y*S); float pulse=0.85+0.15*sin(uT*4.0); vec3 gold=vec3(1.0,0.64,0.20);',
'  vec3 em=gold*exp(-max(d,0.0)*10.0)*0.12*pulse; if(uGRim==1){ vec3 rc=invOf(bgAt(c+(uv-c)*2.5)); float rim=smoothstep(0.075,0.045,abs(d-0.13)); em+=rc*(rim*1.5+exp(-max(d,0.0)*6.0)*0.18)*pulse; }',
'  if(d>px) return vec4(em,0.0); float cov=smoothstep(px,-px,d);',
'  vec2 g=vec2(sdRBox(p+vec2(0.01,0.0),vec2(0.86),0.26)-d,sdRBox(p+vec2(0.0,0.01),vec2(0.86),0.26)-d)/0.01; float bev=smoothstep(0.0,-0.14,d); vec3 n=normalize(vec3(-g*(1.0-bev)*1.2,0.6+bev));',
'  vec3 Ld=normalize(vec3((uL-c)/0.4,0.6)), hh=normalize(Ld+vec3(0,0,1)); vec3 col=gold*(0.70+0.30*max(dot(n,Ld),0.0))*(0.9+0.1*pulse)+mix(gold,vec3(1.0),0.5)*pow(max(dot(n,hh),0.0),60.0)*1.6;',
'  return vec4(col*cov+em*(1.0-cov),cov); }',
/* v1.46 the saucer «Г6» (the maintainer: «НЛО пока г6»): an almond of obsidian split in two, red light between the halves, a red pupil looking
   at us, a red edge; hurt — it flashes white */
'float sdPolyE(vec2 p,vec2 v[8]){ float d=dot(p-v[0],p-v[0]); float sg=1.0; int j=7; for(int i=0;i<8;i++){ vec2 e=v[j]-v[i], w=p-v[i]; vec2 b=w-e*clamp(dot(w,e)/dot(e,e),0.0,1.0); d=min(d,dot(b,b));',
'    bvec3 cc=bvec3(p.y>=v[i].y,p.y<v[j].y,e.x*w.y>e.y*w.x); if(all(cc)||all(not(cc))) sg*=-1.0; j=i; } return sg*sqrt(d); }',
'float almond(vec2 p){ vec2 v[8]; v[0]=vec2(-1.0,0.02); v[1]=vec2(-0.55,0.30); v[2]=vec2(0.0,0.40); v[3]=vec2(0.55,0.27); v[4]=vec2(1.0,0.0); v[5]=vec2(0.60,-0.26); v[6]=vec2(0.05,-0.38); v[7]=vec2(-0.50,-0.27); return sdPolyE(p,v); }',
'float eyeD(vec2 p){ float up=almond(p-vec2(0.0,0.09)), lo=almond(p+vec2(0.0,0.09)); return min(max(up,-p.y+0.06),max(lo,p.y+0.06)); }',
'vec4 saucer(vec2 uv,vec2 c,float S,float hurt){ vec2 p=(uv-c)/S; if(length(p)>1.6) return vec4(0.0); float t=uT; float d=eyeD(p); float px=1.5/(uRes.y*S); vec3 red=vec3(1.0,0.12,0.16);',
'  vec2 pc=vec2(-0.25+0.06*sin(t*1.3),0.03*sin(t*0.9)); float pu=length(p-pc); float gap=exp(-pow(p.y/0.04,2.0))*step(almond(p),0.02);',
'  vec3 em=red*(exp(-max(d,0.0)*9.0)*0.28+gap*1.2)*(0.85+0.15*sin(t*6.0))+red*exp(-pu*pu*14.0)*0.25*step(0.0,d);',
'  if(d>px) return vec4(em,0.0); float cov=smoothstep(px,-px,d);',
'  vec2 g=vec2(eyeD(p+vec2(0.01,0.0))-d,eyeD(p+vec2(0.0,0.01))-d)/0.01; float inner=clamp(-d*6.0,0.0,1.0); vec3 n=normalize(vec3(-g*(1.0-inner)*0.9,0.55+inner));',
'  vec3 v=vor(p*2.4+15.0); n=normalize(n+vec3(h12(v.yz)-0.5,h12(v.yz+3.1)-0.5,0.0)*0.7);',
'  vec3 Ld=normalize(vec3((uL-c)/0.5,0.6)), hh=normalize(Ld+vec3(0,0,1)); float df=max(dot(n,Ld),0.0); float fr=0.04+0.96*pow(1.0-n.z,4.0);',
'  vec3 col=vec3(0.0012)+bgAt(c+(uv-c)*0.5+n.xy*0.15)*1.8*fr*0.8+uLc*(pow(max(dot(n,hh),0.0),200.0)*6.0+pow(max(dot(n,hh),0.0),28.0)*0.12);',
'  float trim=smoothstep(0.035,0.010,-d)*(0.85+0.15*sin(t*7.0)); float pupil=smoothstep(0.17,0.10,pu), iris=exp(-pow((pu-0.19)/0.025,2.0));',
'  col=mix(col,red*(1.3+0.6*df),trim); col+=red*(pupil*1.8+iris*0.9)+vec3(1.0,0.6,0.5)*pupil*0.5+red*gap*1.5; col=mix(col,vec3(1.0),hurt*0.8);',
'  return vec4(col*cov+em*(1.0-cov),cov); }',
'void main(){ vec2 uv=vP; vec2 c=vA.xy; int K=int(vA.w+0.5); vec4 r=vec4(0.0);',
'  if(K==0) r=rock(uv,c,vB.x,vB.y,vB.z,0.0);',
'  else if(K==1) r=ship3(uv,c,vB.x,vB.y);',
'  else if(K==2) r=vec4(shot(rot(-vB.x)*(uv-c),c),0.0);',
'  else if(K==3){ float d=length(uv-c)/0.012; r=vec4(vec3(1.0,0.12,0.2)*(exp(-d*d*2.0)*1.5+exp(-d*d*0.3)*0.3)+vec3(1.0)*exp(-d*d*12.0),0.0); }',
'  else if(K==4) r=saucer(uv,c,vB.x,vB.y);',
'  else if(K==5) r=tile(uv,c,vB.x);',
'  else if(K==6) r=ann(uv,c,vB.x,vB.z>0.5,vB.w,vC.x,vC.y);',
'  else if(K==7) r=shield(uv,c,vB.x);',
'  fragColor=outC(r); }'].join('\n');

/* ═════ GL plumbing ═════ */
function obsSh(t,s){ var g=OBS.g, x=g.createShader(t); g.shaderSource(x,s); g.compileShader(x); if(!g.getShaderParameter(x,g.COMPILE_STATUS)){ var e=g.getShaderInfoLog(x); g.deleteShader(x); throw new Error(e); } return x; }
function obsProg(name,vs,fs){ if(OBS.P[name]) return OBS.P[name]; var g=OBS.g, p=g.createProgram(); g.attachShader(p,obsSh(g.VERTEX_SHADER,vs)); g.attachShader(p,obsSh(g.FRAGMENT_SHADER,fs)); g.linkProgram(p);
  if(!g.getProgramParameter(p,g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(p)); p.U={}; return OBS.P[name]=p; }
function obsU(p,n){ var u=p.U[n]; if(u===undefined) u=p.U[n]=OBS.g.getUniformLocation(p,n); return u; }
function obsTex(w,h,kind){ var g=OBS.g, x=g.createTexture(); g.bindTexture(g.TEXTURE_2D,x);
  if(kind==='f') g.texImage2D(g.TEXTURE_2D,0,g.RGBA16F,w,h,0,g.RGBA,g.HALF_FLOAT,null); else g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,w,h,0,g.RGBA,g.UNSIGNED_BYTE,null);
  g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR); g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR); g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE); g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE); return x; }
function obsFb(texs){ var g=OBS.g, f=g.createFramebuffer(); g.bindFramebuffer(g.FRAMEBUFFER,f); texs.forEach(function(t,i){ g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0+i,g.TEXTURE_2D,t,0); });
  var ok=g.checkFramebufferStatus(g.FRAMEBUFFER)===g.FRAMEBUFFER_COMPLETE; return ok?f:null; }
/* the sizes: the canvas at the screen's pixels (objects), the wallpaper at bd CSS pixels per CSS pixel */
function obsSize(){ var c=OBS.cv, cssW=LW*S/DPR, cssH=LH*S/DPR, od=Math.min(DPR,OBS.od), W=Math.max(1,Math.round(cssW*od)), H=Math.max(1,Math.round(cssH*od)),
    bd=Math.min(OBS.bd,Math.sqrt(900000/(cssW*cssH))), bw=Math.max(1,Math.round(cssW*bd)), bh=Math.max(1,Math.round(cssH*bd)),   /* a big screen (a tablet, a computer): the ink at most ~0.9 M pixels */ key=[W,H,bw,bh].join('x');
  if(c.style.width!==cssW+'px'){ c.style.width=cssW+'px'; c.style.height=cssH+'px'; }
  if(key===OBS.key&&OBS.tx) return; OBS.key=key; if(c.width!==W||c.height!==H){ c.width=W; c.height=H; }
  var g=OBS.g, T=OBS.tx; if(T){ ['a','b','c','bg','sc'].forEach(function(k){ if(T[k]) g.deleteTexture(T[k]); }); ['fa','fc','fbg','fsc'].forEach(function(k){ if(T[k]) g.deleteFramebuffer(T[k]); }); }
  var eh=Math.round(bh*1.24), enc=OBS.f16?0:1; T=OBS.tx={W:W,H:H,bw:bw,bh:bh,eh:eh,enc:enc,n:0};
  var mk=function(e){ T.enc=e; T.a=obsTex(bw,eh,e?'b':'f'); T.b=obsTex(bw,eh,e?'b':'f'); T.c=obsTex(Math.max(1,bw>>1),Math.max(1,eh>>1),e?'b':'f'); T.fa=obsFb([T.a,T.b]); T.fc=obsFb([T.c]); };
  mk(enc); if((!T.fa||!T.fc)&&enc===0){ [T.a,T.b,T.c].forEach(function(x){ g.deleteTexture(x); }); mk(1); }
  T.bg=obsTex(bw,bh,'b'); T.fbg=obsFb([T.bg]);
  T.sc=OBS.f16?obsTex(W,H,'f'):null; T.fsc=T.sc?obsFb([T.sc]):null; if(T.sc&&!T.fsc){ g.deleteTexture(T.sc); T.sc=null; } }
/* the frame's pace: slower than ~50 a second for two seconds — the wallpaper steps down (1.5 → 0.75 CSS px), then the objects (3 → 1.5) */
function obsPace(){ var P=OBS.perf, now=performance.now(), dt=P.t?(now-P.t)/1000:0; P.t=now; if(dt<=0||dt>0.25) return;
  if(P.skip>0){ P.skip-=dt; return; } P.sum+=dt; P.n++; if(P.sum<2) return; var avg=P.sum/P.n; P.sum=0; P.n=0; if(avg<=1/50) return;
  if(OBS.bd>0.75) OBS.bd=Math.max(0.75,OBS.bd-0.25); else if(OBS.od>1.5) OBS.od=Math.max(1.5,Math.min(OBS.od,DPR)-0.5); else if(OBS.q>0) OBS.q--; else if(OBS.bd>0.5) OBS.bd=0.5; else return;   /* v1.44: then fewer octaves of ink (a Mi 9 was far too slow) */
  P.skip=2; try{ if(typeof Logs!=='undefined'&&Logs.ev) Logs.ev('obsidian: '+Math.round(1/avg)+' fps → ink '+OBS.bd+'×, objects '+Math.min(DPR,OBS.od)+'×, quality '+OBS.q); }catch(e){} }
var OBS_SUN_T=60, OBS_MIX_T=60;
function obsSun(t){ var a=2.2+t/OBS_SUN_T*6.2832, ar=LW/LH; return [Math.cos(a)*ar*0.62,Math.sin(a)*0.74]; }
function obsMix(t){ return 0.5-0.5*Math.cos(t/OBS_MIX_T*6.2832); }
function obsUV(x,y){ return [(x-LW/2)/LH,(LH/2-y)/LH]; }
function obsShipUni(p){ var g=OBS.g, sh=new Float32Array(24), H=OBS.shipH, now=OBS.t, s=OBS.ship;
  for(var k=0;k<24;k++){ var ta=now-k*0.15, v=s?s.y:0; for(var i=H.length-1;i>=0;i--){ if(H[i][0]<=ta){ v=H[i][1]; break; } v=H[i][1]; } sh[k]=v; }
  g.uniform1fv(obsU(p,'uSH'),sh); g.uniform2f(obsU(p,'uShip'),s?s.x:-9,s?s.y:0); }
function obsRender(){ var g=OBS.g; if(!g||OBS.lost) return; obsSize(); var T=OBS.tx, t=OBS.t, mix=obsMix(t), sun=obsSun(t);
  var pn=obsProg('n',OBS_VS,OBS_FS_N), pb=obsProg('b',OBS_VS,OBS_FS_B), pc=obsProg('c',OBS_VS,OBS_FS_C), po=obsProg('o',OBS_VS_O,OBS_FS_O), pf=obsProg('f',OBS_VS,OBS_FS_F);
  g.bindVertexArray(OBS.vao); g.disable(g.BLEND);
  var FX=OBS.an.filter(function(e){ return t-e.t0<4.0; }).slice(-8), fx=new Float32Array(32), nf=FX.length, stir=obsInk()*2;
  FX.forEach(function(e,i){ fx[i*4]=e.x; fx[i*4+1]=e.y; fx[i*4+2]=t-e.t0; fx[i*4+3]=e.R*(e.sp?0.7:1); });
  var RK=OBS.rk.slice(0,12), rk=new Float32Array(48), nr=RK.length; RK.forEach(function(k,i){ for(var j=0;j<4;j++) rk[i*4+j]=k[j]; });
  /* 1. the ink: near — half its rows this frame (top and bottom in turn), far — all of it at half size */
  var run=function(far,part){ var ww=far?Math.max(1,T.bw>>1):T.bw, hh=far?Math.max(1,T.eh>>1):T.eh; g.bindFramebuffer(g.FRAMEBUFFER,far?T.fc:T.fa); g.drawBuffers(far?[g.COLOR_ATTACHMENT0]:[g.COLOR_ATTACHMENT0,g.COLOR_ATTACHMENT1]);
    g.viewport(0,0,ww,hh); if(part>=0){ var h2=Math.ceil(hh/2); g.enable(g.SCISSOR_TEST); g.scissor(0,part?hh-h2:0,ww,h2); }
    g.useProgram(pn); g.uniform2f(obsU(pn,'uRes'),far?ww:T.bw,far?ww*T.bh/T.bw:T.bh); g.uniform1f(obsU(pn,'uTime'),t); g.uniform1i(obsU(pn,'uQ'),OBS.q); g.uniform1f(obsU(pn,'uEnc'),T.enc); g.uniform1f(obsU(pn,'uMode'),far?1:0);
    g.uniform1f(obsU(pn,'uAmt'),1.0); g.uniform1f(obsU(pn,'uMix'),mix); obsShipUni(pn); g.uniform4fv(obsU(pn,'uFx'),fx); g.uniform1i(obsU(pn,'uNf'),nf); g.uniform1f(obsU(pn,'uStir'),stir); g.uniform1f(obsU(pn,'uWake'),obsSl('obs_wake')*2); g.uniform4fv(obsU(pn,'uRk'),rk); g.uniform1i(obsU(pn,'uNr'),nr); g.uniform1f(obsU(pn,'uRWake'),obsSl('obs_rwake')*2); g.uniform1f(obsU(pn,'uDet'),obsSl('obs_det')*2); g.uniform1f(obsU(pn,'uVsp'),obsSl('obs_vsp')*4);   /* the veins' speed: 25% — as in 1.45, 100% four times that */ g.drawArrays(g.TRIANGLES,0,3); g.disable(g.SCISSOR_TEST); };
  if(T.n===0) run(false,-1); else run(false,T.n%2); run(true,-1); T.n++;
  g.bindFramebuffer(g.FRAMEBUFFER,T.fbg); g.drawBuffers([g.COLOR_ATTACHMENT0]);
  /* 2. the wallpaper (at its own size) */
  g.viewport(0,0,T.bw,T.bh); g.useProgram(pb); g.uniform2f(obsU(pb,'uRes'),T.bw,T.bh); g.uniform1f(obsU(pb,'uTime'),t); g.uniform1i(obsU(pb,'uQ'),OBS.q); g.uniform1f(obsU(pb,'uAmt'),1.0);
  g.uniform1f(obsU(pb,'uEnc'),T.enc); g.uniform1f(obsU(pb,'uExt'),T.eh/T.bh); g.uniform1f(obsU(pb,'uMix'),mix); g.uniform2f(obsU(pb,'uSun'),sun[0],sun[1]);
  [[T.a,'uA'],[T.b,'uB'],[T.c,'uF']].forEach(function(x,i){ g.activeTexture(g.TEXTURE1+i); g.bindTexture(g.TEXTURE_2D,x[0]); g.uniform1i(obsU(pb,x[1]),1+i); }); g.drawArrays(g.TRIANGLES,0,3);
  /* 3. on the screen (or into the linear scene): the wallpaper pushed about by the annihilations */
  var disp=T.fsc?0:1; g.bindFramebuffer(g.FRAMEBUFFER,T.fsc||null); g.viewport(0,0,T.W,T.H);
  var AN=OBS.an.filter(function(e){ return t-e.t0<3.2; }).slice(-12), an=new Float32Array(48), ak=new Float32Array(48);
  AN.forEach(function(e,i){ an[i*4]=e.x; an[i*4+1]=e.y; an[i*4+2]=t-e.t0; an[i*4+3]=e.R; ak[i*4+1]=e.sp?1:0; ak[i*4+2]=e.sd; });
  g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D,T.bg);
  g.useProgram(pc); g.uniform1f(obsU(pc,'uIrr'),obsSl('obs_ring')*2); g.uniform1i(obsU(pc,'uRingOn'),obsRingOn()?1:0); g.uniform2f(obsU(pc,'uRes'),T.W,T.H); g.uniform1f(obsU(pc,'uT'),t); g.uniform1i(obsU(pc,'uBg'),0); g.uniform1i(obsU(pc,'uDisp'),disp);
  g.uniform4fv(obsU(pc,'uAn'),an); g.uniform4fv(obsU(pc,'uAk'),ak); g.uniform1i(obsU(pc,'uNa'),AN.length); g.drawArrays(g.TRIANGLES,0,3);
  /* 4. the objects (premultiplied, light added where they have no body) */
  var L=OBS.list; AN.forEach(function(e){ var a=t-e.t0, ext=e.R*1.5;
    ext=e.sp?Math.max(e.R*1.6,e.R*0.4+0.36*Math.min(a,1.0)+0.01):Math.max(e.R*2.6,0.09,e.R*0.4+0.36*Math.min(Math.max(a-0.3,0),1.6)+0.01);   /* the flash's glow and the ring inside the quad */
    if(e.sp?a>1.1:a>1.9) return; L.push([e.x,e.y,ext,6,a,0,e.sp?1:0,e.sd,e.R,e.rot,0,0]); });
  var n=Math.min(L.length,200); if(n){ var D=OBS.buf&&OBS.buf.d.length>=n*12?OBS.buf.d:new Float32Array(Math.max(n,64)*12);
    for(var i=0;i<n;i++){ var o=L[i]; for(var j=0;j<12;j++) D[i*12+j]=o[j]||0; }
    if(!OBS.buf||OBS.buf.d!==D){ if(!OBS.buf){ OBS.buf={b:g.createBuffer(),vao:g.createVertexArray()}; } OBS.buf.d=D; g.bindVertexArray(OBS.buf.vao); g.bindBuffer(g.ARRAY_BUFFER,OBS.buf.b); g.bufferData(g.ARRAY_BUFFER,D.byteLength,g.DYNAMIC_DRAW);
      for(var a2=0;a2<3;a2++){ g.enableVertexAttribArray(a2); g.vertexAttribPointer(a2,4,g.FLOAT,false,48,a2*16); g.vertexAttribDivisor(a2,1); } }
    g.bindVertexArray(OBS.buf.vao); g.bindBuffer(g.ARRAY_BUFFER,OBS.buf.b); g.bufferSubData(g.ARRAY_BUFFER,0,D,0,n*12);
    g.enable(g.BLEND); g.blendFunc(g.ONE,g.ONE_MINUS_SRC_ALPHA); g.useProgram(po);
    g.uniform2f(obsU(po,'uRes'),T.W,T.H); g.uniform1f(obsU(po,'uIrr'),obsSl('obs_ring')*2); g.uniform1i(obsU(po,'uShot'),obsShot()); g.uniform1i(obsU(po,'uGRim'),obsGRim()?1:0); g.uniform1i(obsU(po,'uRingOn'),obsRingOn()?1:0); g.uniform1f(obsU(po,'uT'),t); g.uniform1i(obsU(po,'uBg'),0); g.uniform1i(obsU(po,'uDisp'),disp);
    var lc=[1-0.45*mix,0.78+0.02*mix,0.48+0.52*mix]; g.uniform2f(obsU(po,'uL'),sun[0]*1.4,sun[1]*1.4); g.uniform3f(obsU(po,'uLc'),lc[0],lc[1],lc[2]);
    g.uniform4fv(obsU(po,'uPose'),OBS.pose||new Float32Array(12)); g.drawArraysInstanced(g.TRIANGLE_STRIP,0,4,n); g.disable(g.BLEND); g.bindVertexArray(OBS.vao); }
  /* 5. the scene to the screen */
  if(T.fsc){ g.bindFramebuffer(g.FRAMEBUFFER,null); g.viewport(0,0,T.W,T.H); g.useProgram(pf); g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D,T.sc); g.uniform1i(obsU(pf,'uS'),0); g.uniform2f(obsU(pf,'uRes'),T.W,T.H); g.drawArrays(g.TRIANGLES,0,3); }
  OBS.an=OBS.an.filter(function(e){ return t-e.t0<4.0; }); }

/* ═════ the frame: begun where the flight field is drawn, rendered at its end; hidden on a frame that drew no field ═════ */
function obsBegin(){ if(!OBS.ok) return; OBS.act=true; OBS.list=[]; OBS.rk=[]; OBS.t+=DT; }
function obsEnd(){ if(!OBS.act) return; OBS.act=false; try{ if(!OBS.vis){ OBS.cv.style.display='block'; OBS.vis=true; OBS.perf.t=0; OBS.perf.skip=3; }
    var tf=hdCv&&hdCv.style.transform||''; if(OBS.cv.style.transform!==tf) OBS.cv.style.transform=tf; obsPace(); obsRender(); OBS.err=''; }catch(e){ OBS.err=String(e&&e.message||e); if(!OBS.logged){ OBS.logged=true; try{ Logs.ev('obsidian: '+OBS.err.slice(0,200)); }catch(e2){} } }
  OBS.drew=true; }
function obsTick(){ if(!OBS.cv) return; if(OBS.vis&&!OBS.drew){ OBS.cv.style.display='none'; OBS.vis=false; } OBS.drew=false; }
/* the ship's pose: the needle now; each splinter a beat behind (a turn, a roll), drifting out from the axis in a roll and back */
function obsShip(sx,sy,ra){ var L=FLY_LOOK.obsidian, u=obsUV(sx+L.piv,sy), t=OBS.t, yaw=-Math.atan(FLY.tl*flyTiltK()), D=flyRollDur();
  var Su=11/LH, nx=u[0]+Math.cos(yaw)*1.1*Su, ny=u[1]+Math.sin(yaw)*1.1*Su;   /* the wake starts at the nose */
  OBS.ship={x:nx,y:ny}; OBS.shipH.push([t,ny]); while(OBS.shipH.length&&t-OBS.shipH[0][0]>3.8) OBS.shipH.shift();
  OBS.hist.push([t,yaw,ra]); while(OBS.hist.length&&t-OBS.hist[0][0]>1.0) OBS.hist.shift();
  var at=function(lag){ var ta=t-lag, H=OBS.hist, h=H[0]; for(var i=H.length-1;i>=0;i--){ if(H[i][0]<=ta){ h=H[i]; break; } } return h; };
  var on=FLY.roll>=0; if(on&&!OBS.rollWas) OBS.rollT0=t; OBS.rollWas=on; var sp=Math.sin(Math.PI*Math.max(0,Math.min(1,(t-OBS.rollT0)/(D*1.15))));
  var a1=at(0.09*D), a2=at(0.15*D), y1=at(0.10), y2=at(0.14);
  OBS.pose=new Float32Array([yaw,ra,0,0, y1[1],a1[2],0.11*sp+0.006*Math.sin(t*2.7),0.06*sp+0.004*Math.sin(t*2.1), y2[1],a2[2],0.09*sp+0.006*Math.sin(t*2.3+1),0.08*sp+0.004*Math.sin(t*1.7+2)]);
  OBS.list.push([u[0],u[1],Su*1.9,1,Su,0.8+0.6*(FLY.k||0)]); }
/* a rock gone: the annihilation where it was (the core has put its two halves there already, if it was large or medium) */
function obsGone(x,y,R,sd,rot,split){ var u=obsUV(x,y); OBS.an.push({x:u[0],y:u[1],R:R,sd:sd,rot:rot,sp:split,t0:OBS.t}); }

/* ═════ the skin: its pictures go to the graphics chip while the field is drawn; anywhere else (the menus' demo) the space skin's ═════ */
function obsBase(n,a){ var s=HDSK.space; return s[n]?s[n].apply(s,a):undefined; }
var OBSK={id:'obsidian', hd:true, glow:false, nolight:true, flyLook:'obsidian', motes:['#f0d9a8','#d8b878'],
  glBegin:function(){ obsBegin(); }, glEnd:function(){ obsEnd(); },
  sky:function(dt,s){ if(!OBS.act) return obsBase('sky',arguments); hx.clearRect(-4,-4,LW+8,LH+8); },
  rock:function(r,sz,seed){ var b=HDSK.space.rock(r,sz,seed); b.obsR=r; b.obsSd=(seed%97)*0.731+1.3; return b; },
  drawRock:function(sp,x,y){ if(!OBS.act||sp.obsR===undefined) return obsBase('drawRock',arguments); var u=obsUV(x,y), R=sp.obsR/LH; if(sp._ox!==undefined){ var dx=u[0]-sp._ox, dy=u[1]-sp._oy; if(dx*dx+dy*dy>1e-9) sp._ang=Math.atan2(dy,dx); } sp._ox=u[0]; sp._oy=u[1]; OBS.rk.push([u[0],u[1],R,sp._ang===undefined?Math.PI:sp._ang]); OBS.list.push([u[0],u[1],R*1.25,0,R,sp.obsSd+(sp.vr||0)*0.37,-sp.rot/16*6.2832]); },
  ship:function(x,y,t,blink){ if(!OBS.act) return obsBase('ship',arguments); if(blink) return; obsShip(x,y,0); },
  shipRoll:function(x,y,t,ra){ if(!OBS.act) return obsBase('ship',[x,y,t,false]); obsShip(x,y,ra); },
  ufo:function(ux,uy,big,hurt){ if(!OBS.act) return obsBase('ufo',arguments); var u=obsUV(ux,uy), Su=(big?7:5)*K*1.25/LH;   /* the core's half width, a little more */ OBS.list.push([u[0],u[1],Su*1.7,4,Su,hurt?1:0]); },
  pick:function(x,y,type){ if(!OBS.act) return obsBase('pick',arguments); var u=obsUV(x,y), r=7.2/LH; OBS.list.push([u[0],u[1],r*2.4,5,r]);
    var w=hdIconW; hdIconW=1.55; hx.save(); hx.translate(x,y); hx.scale(1.42,1.42); hdIcon(type,'#140e12'); hx.restore(); hdIconW=w; },   /* the sign: black on the gold, big and bold */
  bullet:function(x,y){ if(!OBS.act) return obsBase('bullet',arguments); var m=hx.getTransform?hx.getTransform():{a:1,b:0}, a=-Math.atan2(m.b,m.a), u=obsUV(x,y); OBS.list.push([u[0],u[1],0.09,2,a]); },
  ebullet:function(x,y){ if(!OBS.act) return obsBase('ebullet',arguments); var u=obsUV(x,y); OBS.list.push([u[0],u[1],0.04,3]); },
  shieldRing:function(x,y,t){ if(!OBS.act) return obsBase('shieldRing',arguments); var u=obsUV(x+11,y), Su=14/LH; OBS.list.push([u[0],u[1],Su*1.4,7,Su]); },
  shield:function(){ return P.pick; }, mini:function(){ return obsBase('mini',[]); },
  bursts:function(){ return spKinds({rock:['#fff0c8','#ffd27a','#e0a040','#8a5a20'],ufo:['#ffffff','#ffb0b8','#ff4060','#a01030'],ship:['#fff6dc','#ffdc8a','#e8b050','#9a6a28'],pick:['#fffbe0','#ffe066','#ffc233','#c8840c']}); },
  /* the hooks the game calls when a rock or a saucer is destroyed: an annihilation instead of a burst */
  gone:function(r,sp){ var R=(sp&&sp.obsR!==undefined?sp.obsR:r.r*K)/LH; obsGone(fx(r.x),r.y*K,R,sp&&sp.obsSd!==undefined?sp.obsSd+(sp.vr||0)*0.37:1.3,sp?-sp.rot/16*6.2832:0,r.sz<2); },
  goneUfo:function(f){ obsGone(fx(f.x),f.y*K,(f.ufo==='big'?11:8)/LH,4.2,0,false); }
};
FLY_LOOK.obsidian={piv:11,tip:[-2,6],trail:'none',c:'255,214,140',life:0.6,w:1.0};
