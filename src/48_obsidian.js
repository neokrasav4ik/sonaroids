/* ── v1.42: the heavy SonaFly skin «обсидиан» — a test for flagship phones, switched on in the maintainer's test panel (a long press on the
   version in SonaFly's menu). Everything is drawn on the graphics chip (WebGL 2) on a canvas of its own under the HD one:
   · the wallpaper — the bench's «К переход» (game/bench, W20): ink in fog, the first ink computed «evenly» (half the near ink a frame,
     the far ink at half size), the palette flowing cold ↔ warm, the light going round the screen once a minute; drawn at a lower
     resolution than the screen (the maintainer: «дыра 1.5 — на глаз чернила почти не портят») and stepped down by itself when frames slow;
   · the objects at the screen's own resolution: rocks of black glossy obsidian with glowing gold kintsugi cracks (sparse on the small ones),
     the ship «О5г» — a needle of obsidian and two splinter blades with gold edges, a gold kintsugi vein on its belly; the splinters lag
     a moment behind a turn, drift apart in a roll and close up again; the roll takes 1.6 s (the maintainer: «бочка 1.6»);
   · no explosions (the maintainer: «будем стрелять типа аннигилятором.. чтоб возмущение чернил не загораживать банальным взрывом»):
     three annihilations to choose from in the game (the maintainer: «хочу все 3 и потом выбрать какая лучше уже в игре»), each with its
     own split of a large or medium rock into two smaller ones (the maintainer: «большие камни распадаются на средние.. это тоже надо вписать»):
       А — the cracks flare, the rock folds into a point along them, a spark-sized flash, a ring goes through the ink like a lens;
           a split: a flash of gold along the break and a smaller ring;
       Б — the rock comes apart from its cracks inward, gold threads pull out of it and the ink carries them off;
           a split: a few threads from the break;
       В — the rock is gone at once: a hole of the ink's negative, rimmed with cold light, the ink swirls in and closes it;
           a split: a thin slit of the negative along the break, closing at once.
   The menus keep the space skin's pictures (this skin draws only where the flight field is: the game, its count-down, pause, the end).
   Without WebGL 2 the switch says so and the skin stays off. ── */
var OBS={ok:null,err:'',cv:null,g:null,act:false,drew:false,vis:false,t:34,list:[],an:[],hist:[],shipH:[],ship:null,rollT0:-9,rollWas:false,
  bd:1.5,od:3,perf:{t:0,n:0,sum:0,skip:3},P:{},key:'',tx:null};
function obsOn(){ return typeof store!=='undefined'&&store.get('sonaroids_obs','0')==='1'&&obsInit(); }
function obsAnn(){ var v=typeof store!=='undefined'?+store.get('sonaroids_obs_ann','0'):0; return v>=0&&v<=2?v:0; }
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
'vec2 stir(vec2 uv){ vec2 p=vec2(0.0);',
'  float back=uShip.x-uv.x; if(back>0.0&&back<1.2){ float ty=shipHist(back/0.35); float dy=uv.y-ty; float fade=smoothstep(0.0,0.12,back)*smoothstep(1.2,0.9,back); p+=(vec2(0.0,dy/(abs(dy)+0.02))*exp(-dy*dy/0.004)*exp(-back*2.0)*0.25+vec2(-dy,0.0)*exp(-dy*dy/0.01)*exp(-back*1.5)*1.2)*fade; } return p; }',
'float inkD(vec2 p,int oc,out vec2 q,out vec2 r){ q=vec2(fbm(vec3(p,uTime*0.035),oc),fbm(vec3(p+vec2(5.2,1.3),uTime*0.035),oc));',
'  r=vec2(fbm(vec3(p+4.0*q+vec2(1.7,9.2),uTime*0.05),oc),fbm(vec3(p+4.0*q+vec2(8.3,2.8),uTime*0.05),oc)); return fbm(vec3(p+4.0*r,uTime*0.025),oc); }',
'float inkCheap(vec2 p){ vec2 q=vec2(fbm(vec3(p,uTime*0.035),3),fbm(vec3(p+vec2(5.2,1.3),uTime*0.035),3)); return fbm(vec3(p+4.0*q,uTime*0.03),3); }'].join('\n');
/* the ink: near (colour + density, and the cheap density for the light) or far (half size) */
var OBS_FS_N=OBS_COMMON.replace('out vec4 fragColor;','layout(location=0) out vec4 fragColor; layout(location=1) out vec4 frag1;')+'\n'+OBS_EVF+'\n'+[
'uniform float uEnc; uniform float uMode;',
'vec4 enc(vec4 v){ return uEnc>0.0?sqrt(clamp(v*0.5,0.0,1.0)):v; }',
'void main(){ vec2 uv=vec2((gl_FragCoord.x-0.5*uRes.x)/uRes.y,gl_FragCoord.y/uRes.y-0.5); int OC=uQ==0?3:uQ==1?4:5; vec2 sv=stir(uv);',
'  if(uMode>0.5){ vec2 pf=uv*0.8+vec2(uTime*0.012,7.0)+sv*0.4; vec2 q2,r2; float f2=inkD(pf,max(OC-1,2),q2,r2);',
'    vec3 far=inkColM(q2,r2,f2)*mix(vec3(0.45,0.6,1.0),vec3(0.8,0.55,0.5),uMix)*(0.04+0.45*f2*f2*f2); fragColor=enc(vec4(far,1.0)); frag1=vec4(0.0); return; }',
'  vec2 p=uv*1.5+vec2(uTime*0.028,0.0)+sv; vec2 q,r; float f=inkD(p,OC,q,r); float fa=inkA(f); vec3 near=inkColM(q,r,fa)*(0.10+1.3*fa*fa*fa);',
'  fragColor=enc(vec4(near,f)); frag1=enc(vec4(inkCheap(p),0.0,0.0,1.0)); }'].join('\n');
/* the wallpaper from the ink: far under near, the light's rims on the ink, the shafts through its gaps */
var OBS_FS_B=OBS_COMMON+'\n'+[
'uniform sampler2D uA; uniform sampler2D uB; uniform sampler2D uF; uniform float uEnc; uniform float uExt; uniform float uMix; uniform vec2 uSun;',
'vec4 dec(vec4 v){ return uEnc>0.0?v*v*2.0:v; }',
'vec2 tcOf(vec2 u){ return vec2((u.x*uRes.y+0.5*uRes.x)/uRes.x,(u.y+0.5)/uExt); }',
'void main(){ vec2 uv=uvOf(); int NS=uQ==0?6:uQ==1?9:12; vec2 sun=uSun;',
'  vec4 A=dec(texture(uA,tcOf(uv))); vec3 near=A.rgb, far=dec(texture(uF,tcOf(uv))).rgb; float f=A.a, dens=smoothstep(0.42,0.80,inkA(f));',
'  vec3 col=mix(far,near,dens); col*=mix(0.75,0.6,uMix); float lu=dot(col,vec3(0.3,0.59,0.11)); col=max(mix(vec3(lu),col,1.45),0.0);',
'  vec2 ld=normalize(sun-uv); float fl=dec(texture(uB,tcOf(uv+ld*0.06))).r; float rim=clamp((f-fl)*5.0,0.0,1.0);',
'  vec3 lc=mix(vec3(1.0,0.78,0.48),vec3(0.55,0.80,1.0),uMix); vec3 nk=near/(max(near.r,max(near.g,near.b))+1e-3); col+=mix(lc,nk,0.65)*rim*dens*0.13*(0.4+0.6*smoothstep(2.2,0.3,length(uv-sun)));',
'  vec2 ds=uv-sun; float dl=length(ds); float bm=0.0; for(int i=0;i<3;i++){ float fi=float(i); bm+=pow(n3(vec3(normalize(ds)*(8.0+fi*7.0),fi*3.0+uTime*(0.04+fi*0.03))),3.0)*(0.9-fi*0.2); }',
'  float T=0.0; for(int i=1;i<=16;i++){ if(i>NS) break; vec2 u=uv+(sun-uv)*float(i)/float(NS); T+=smoothstep(0.35,0.8,dec(texture(uB,tcOf(u))).r); } T=exp(-T/float(NS)*2.4);',
'  vec3 tint=mix(lc,normalize(near+1e-3)*1.2,0.45); col+=tint*bm*T*0.075*exp(-dl*0.7)*(0.5+0.6*(1.0-dens))+lc*0.03/(dl*dl+0.04)*0.06;',
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
'vec4 outC(vec4 c){ if(uDisp==1) c.rgb=pow(max(c.rgb,0.0),vec3(0.4545)); return c; }'].join('\n');
/* the wallpaper on the screen, pushed about where the annihilations happen (in linear light into the scene, or straight to the screen) */
var OBS_FS_C=OBS_SC+'\n'+[
'uniform vec4 uAn[12]; uniform vec4 uAk[12]; uniform int uNa;',
'void main(){ vec2 uv=(gl_FragCoord.xy-0.5*uRes)/uRes.y; vec2 su=uv; float negM=0.0, negC=0.0, rimG=0.0, lens=0.0;',
'  for(int i=0;i<12;i++){ if(i>=uNa) break; vec4 A=uAn[i], B=uAk[i]; float a=A.z, R=A.w; vec2 d=uv-A.xy; float L=length(d); if(L>1.2) continue; vec2 n=d/max(L,1e-4); float sz=R/0.075; int V=int(B.x+0.5); bool sp=B.y>0.5;',
'    if(V==0){ float ac=a-(sp?0.08:0.30); if(ac>0.0&&ac<2.0){ float k=sp?0.5:1.0, rr=R*0.4+ac*0.36, w=0.018+ac*0.03, amp=0.055*sz*k*exp(-ac*1.1); float x=(L-rr)/w; su-=n*amp*x*exp(-x*x)*1.6; lens+=exp(-x*x)*exp(-ac*1.4)*sz*k; } }',
'    else if(V==1){ float f=exp(-a*0.9)*sz*(sp?0.5:1.0); su-=rotv(d,0.9*f*exp(-L/(R*2.0)))-d; su-=n*0.012*f*exp(-pow((L-R*1.2-a*0.15)/0.05,2.0)); }',
'    else if(!sp){ float life=1.5*sqrt(sz); if(a<life){ float hr=R*1.25*(1.0-ez(a/life))*smoothstep(0.0,0.06,a)+R*(1.0-smoothstep(0.0,0.06,a)); float fade=1.0-ez(a/life);',
'      float sw=2.2*fade*exp(-max(L-hr,0.0)/(R*1.5)); vec2 dd=rotv(d,sw); float pull=0.6*fade*exp(-max(L-hr,0.0)/(R*1.2)); su+=(A.xy+dd*(1.0+pull))-uv;',
'      float m=smoothstep(hr+0.004,hr-0.004,L); negM=max(negM,m); negC=max(negC,(1.0-L/max(hr,1e-3))*m); rimG+=exp(-pow((L-hr)/0.006,2.0))*fade; } }',
'    else { float life=0.45; if(a<life){ float s=sin(3.1416*a/life), hh=max(R*0.28*s,1e-4); vec2 dd=vec2(d.x/(R*1.15),d.y/hh); float l=length(dd), m=smoothstep(1.08,0.92,l);',
'      negM=max(negM,m); negC=max(negC,(1.0-l)*m); rimG+=exp(-pow((l-1.0)*hh/0.004,2.0))*s*0.8; su-=vec2(0.0,d.y)*0.5*s*exp(-l*0.6)*step(L,R*2.0); } } }',
'  vec3 col=bgAt(su); col*=1.0+0.35*lens;',
'  if(negM>0.0){ vec3 sc=pow(col,vec3(0.4545)); vec3 ng=vec3(1.0)-sc; float l=dot(ng,vec3(0.3,0.59,0.11)); ng=mix(vec3(l),ng,2.2); ng=pow(max(ng,0.0),vec3(2.2))*(0.10-0.07*negC); col=mix(col,ng,negM); }',
'  col+=vec3(0.85,0.9,1.0)*rimG*0.25; fragColor=outC(vec4(col,1.0)); }'].join('\n');
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
/* the enemy\'s saucer: black glass, a red dome and red lights (red is the enemy in every skin) */
'vec4 saucer(vec2 uv,vec2 c,float S,float hurt){ vec2 p=(uv-c)/S; float rim=length(p/vec2(1.0,0.24)), dome=length((p-vec2(0.0,0.14))/vec2(0.45,0.38)); float px=1.5/(uRes.y*S);',
'  float cov=max(smoothstep(1.0+px*4.0,1.0-px*4.0,rim),smoothstep(1.0+px*2.5,1.0-px*2.5,dome)*step(0.06,p.y));',
'  vec3 lights=vec3(0.0); for(int j=0;j<5;j++){ vec2 lp=vec2((float(j)-2.0)*0.36,-0.03); lights+=vec3(1.0,0.12,0.18)*exp(-dot(p-lp,p-lp)/0.004)*(0.7+0.3*sin(uT*8.0+float(j))); }',
'  lights+=vec3(1.0,0.15,0.22)*exp(-dot(p,p)*1.5)*0.06;',
'  if(cov<=0.0) return vec4(lights,0.0); vec3 Ld=normalize(vec3(uL-c,0.4)); float df; vec3 col;',
'  if(rim<1.0&&!(dome<1.0&&p.y>0.06)){ vec3 n=normalize(vec3(p.x*0.2,p.y*3.0,0.6)); df=max(dot(n,Ld),0.0); float fr=0.04+0.96*pow(1.0-n.z,4.0);',
'    col=vec3(0.002)+bgAt(c+(uv-c)*0.5+n.xy*0.1)*fr*1.2+uLc*pow(max(dot(n,normalize(Ld+vec3(0,0,1))),0.0),80.0)*3.0+vec3(1.0,0.2,0.25)*smoothstep(0.9,0.99,rim)*0.5; }',
'  else { vec2 dq=(p-vec2(0.0,0.14))/vec2(0.45,0.38); vec3 n=normalize(vec3(dq,sqrt(max(0.0,1.0-dot(dq,dq))))); df=max(dot(n,Ld),0.0); col=vec3(0.6,0.1,0.15)*(0.3+df)+vec3(1.0)*pow(max(dot(n,normalize(Ld+vec3(0,0,1))),0.0),40.0); }',
'  col=mix(col,vec3(1.0),hurt*0.8); return vec4(col*cov+lights,cov); }',
/* a power-up: a bead of obsidian in a gold ring (its sign is drawn over it on the HD canvas) */
'vec4 gift(vec2 uv,vec2 c,float r){ vec2 p=(uv-c)/r; float L=length(p); float px=1.5/(uRes.y*r); float pulse=0.8+0.2*sin(uT*4.0);',
'  vec3 glow=GOLD*exp(-L*L*1.6)*0.10*pulse; if(L>1.0+px) return vec4(glow,0.0); float cov=smoothstep(1.0+px,1.0-px,L);',
'  float z=sqrt(max(0.0,1.0-L*L)); vec3 n=normalize(vec3(p,z)); vec3 Ld=normalize(vec3(uL-c,0.5)); float fr=0.04+0.96*pow(1.0-n.z,4.0);',
'  vec3 col=vec3(0.002)+bgAt(c+(uv-c)*0.4+n.xy*0.1)*fr*1.4+uLc*pow(max(dot(n,normalize(Ld+vec3(0,0,1))),0.0),120.0)*4.0;',
'  float ring=smoothstep(0.13,0.04,abs(L-0.86)); col=mix(col,GOLD*1.3*pulse,ring); return vec4(col*cov+glow*(1.0-cov),cov); }',
/* the shield: a thin gold ring round the ship, shimmering */
'vec4 shield(vec2 uv,vec2 c,float S){ vec2 p=(uv-c)/S; float L=length(p/vec2(1.0,0.8)); float a=atan(p.y,p.x); float w=0.035+0.02*sin(a*3.0+uT*5.0);',
'  float r=exp(-pow((L-1.0)/w,2.0))*(0.55+0.45*sin(a*2.0-uT*3.0)); return vec4(GOLD*r*1.2+GOLD*exp(-pow((L-1.0)/0.15,2.0))*0.06,0.0); }',
/* the annihilations (the wallpaper\'s part is in the composite pass): kind 0 А, 1 Б, 2 В; split — a rock breaking into two */
'vec4 ann(vec2 uv,vec2 c,float a,int V,bool sp,float sd,float R,float rotA){ vec3 col=vec3(0.0); float cov=0.0; float sz=R/0.075;',
'  if(V==0){ if(!sp){',
'      if(a<0.30){ float s=1.0-ez(a/0.30); vec4 r=rock(uv,c,R*max(s,0.02),sd,rotA+a*4.0,smoothstep(0.0,0.08,a)); col=r.rgb; cov=r.a; col+=GOLD*cov*smoothstep(0.0,0.08,a)*0.9; col+=GOLD*smoothstep(0.0,0.08,a)*0.5*exp(-pow(length(uv-c)/(R*s*1.3+0.004),2.0)); }',
'      float ap=a-0.30; if(ap>0.0&&ap<0.25){ float pt=exp(-ap*14.0); col+=vec3(1.0,0.92,0.75)*pt*(exp(-pow(length(uv-c)/0.006,2.0))*3.0+exp(-pow(length(uv-c)/0.03,2.0))*0.3); }',
'      if(ap>0.0&&ap<1.6){ col+=GOLD*0.10*exp(-ap*3.0)*exp(-pow((length(uv-c)-(R*0.4+ap*0.36))/0.003,2.0))*sz; } }',
'    else { vec2 q=rot(rotA)*(uv-c); float k=exp(-a*9.0); float seam=exp(-pow(q.y/0.0035,2.0))*smoothstep(R*1.05,R*0.6,abs(q.x)); col+=GOLD*seam*k*2.2+GOLD*exp(-dot(q,q)/(R*R*0.5))*k*0.25;',
'      float ap=a-0.08; if(ap>0.0&&ap<1.0) col+=GOLD*0.06*exp(-ap*3.0)*exp(-pow((length(uv-c)-(R*0.4+ap*0.36))/0.003,2.0))*sz; } }',
'  else if(V==1){ if(!sp){ float thr=ez(a/0.7); vec2 q=rot(rotA)*(uv-c)/R; vec3 v2=vor(q*1.2+sd*1.3+3.0); float nz=0.55*fb(q*3.0+sd)+0.45*clamp(v2.x*3.0,0.0,1.0);',
'      if(thr<1.0){ vec4 r=rock(uv,c,R,sd,rotA,0.0); float m=smoothstep(thr-0.02,thr+0.04,nz); float edge=exp(-pow((nz-thr)/0.035,2.0))*r.a*step(0.001,thr); col=r.rgb*m; cov=r.a*m; col+=GOLD*edge*1.6; } }',
'    else { vec2 q=rot(rotA)*(uv-c); float k=exp(-a*6.0); col+=GOLD*exp(-pow(q.y/0.004,2.0))*smoothstep(R*1.0,R*0.5,abs(q.x))*k*1.2; }',
'    int NT=sp?4:11; float sc=sp?0.55:1.0;',
'    for(int i=0;i<11;i++){ if(i>=NT) break; float fi=float(i); float an=sp?(fi<2.0?0.0:3.1416)+(h12(vec2(fi,sd))-0.5)*1.2-rotA:fi*0.5712+h12(vec2(fi,sd))*0.4-rotA; vec2 dir=vec2(cos(an),sin(an)); float t0=h12(vec2(fi,sd+2.0))*(sp?0.15:0.45); float ai=a-t0; if(ai<0.0) continue;',
'      float spd=(0.10+0.10*h12(vec2(fi,sd+4.0)))*sc, len=(0.10+0.10*h12(vec2(fi,sd+5.0)))*sc, wob=6.0+4.0*h12(vec2(fi,sd+6.0)), fade=exp(-ai*(sp?2.0:1.1))*(sz*0.6+0.4);',
'      float u1=ai*spd, u0=max(u1-len*smoothstep(0.0,0.5,ai),0.0); float best=1e5; float cu=(h12(vec2(fi,sd+7.0))-0.5)*14.0; float r0=sp?R*0.3:R*0.8;',
'      vec2 Pp=vec2(0.0); for(int s=0;s<8;s++){ float ua=mix(u0,u1,float(s)/7.0); vec2 dA=rotv(dir,cu*ua); vec2 P=c+dA*(r0+ua)+vec2(-0.25,0.06)*ua*ua*6.0+vec2(-dA.y,dA.x)*0.012*sin(ua*wob*5.0+fi); if(s>0) best=min(best,sdSeg(uv,Pp,P)); Pp=P; }',
'      col+=GOLD*fade*(smoothstep(0.0028,0.0008,best)*1.3+exp(-best*best/0.00012)*0.25); } }',
'  else { if(!sp&&a<0.05){ vec4 r=rock(uv,c,R,sd,rotA,0.0); float m=1.0-a/0.05; col=r.rgb*m; cov=r.a*m; } }',
'  return vec4(col,cov); }',
'void main(){ vec2 uv=vP; vec2 c=vA.xy; int K=int(vA.w+0.5); vec4 r=vec4(0.0);',
'  if(K==0) r=rock(uv,c,vB.x,vB.y,vB.z,0.0);',
'  else if(K==1) r=ship3(uv,c,vB.x,vB.y);',
'  else if(K==2){ vec2 p=rot(-vB.x)*(uv-c)/vec2(0.028,0.006)*vec2(1.0,1.0); float d=length(vec2(max(abs(p.x)-0.5,0.0),p.y)); r=vec4(vec3(1.0,0.75,0.3)*(exp(-d*d*3.0)*1.6+exp(-d*d*0.25)*0.25),0.0); }',
'  else if(K==3){ float d=length(uv-c)/0.012; r=vec4(vec3(1.0,0.12,0.2)*(exp(-d*d*2.0)*1.5+exp(-d*d*0.3)*0.3)+vec3(1.0)*exp(-d*d*12.0),0.0); }',
'  else if(K==4) r=saucer(uv,c,vB.x,vB.y);',
'  else if(K==5) r=gift(uv,c,vB.x);',
'  else if(K==6) r=ann(uv,c,vB.x,int(vB.y+0.5),vB.z>0.5,vB.w,vC.x,vC.y);',
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
    bw=Math.max(1,Math.round(cssW*OBS.bd)), bh=Math.max(1,Math.round(cssH*OBS.bd)), key=[W,H,bw,bh].join('x');
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
  if(OBS.bd>0.75) OBS.bd=Math.max(0.75,OBS.bd-0.25); else if(OBS.od>1.5) OBS.od=Math.max(1.5,Math.min(OBS.od,DPR)-0.5); else return;
  P.skip=2; try{ if(typeof Logs!=='undefined'&&Logs.ev) Logs.ev('obsidian: '+Math.round(1/avg)+' fps → ink '+OBS.bd+'×, objects '+Math.min(DPR,OBS.od)+'×'); }catch(e){} }
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
  /* 1. the ink: near — half its rows this frame (top and bottom in turn), far — all of it at half size */
  var run=function(far,part){ var ww=far?Math.max(1,T.bw>>1):T.bw, hh=far?Math.max(1,T.eh>>1):T.eh; g.bindFramebuffer(g.FRAMEBUFFER,far?T.fc:T.fa); g.drawBuffers(far?[g.COLOR_ATTACHMENT0]:[g.COLOR_ATTACHMENT0,g.COLOR_ATTACHMENT1]);
    g.viewport(0,0,ww,hh); if(part>=0){ var h2=Math.ceil(hh/2); g.enable(g.SCISSOR_TEST); g.scissor(0,part?hh-h2:0,ww,h2); }
    g.useProgram(pn); g.uniform2f(obsU(pn,'uRes'),far?ww:T.bw,far?ww*T.bh/T.bw:T.bh); g.uniform1f(obsU(pn,'uTime'),t); g.uniform1i(obsU(pn,'uQ'),2); g.uniform1f(obsU(pn,'uEnc'),T.enc); g.uniform1f(obsU(pn,'uMode'),far?1:0);
    g.uniform1f(obsU(pn,'uAmt'),1.0); g.uniform1f(obsU(pn,'uMix'),mix); obsShipUni(pn); g.drawArrays(g.TRIANGLES,0,3); g.disable(g.SCISSOR_TEST); };
  if(T.n===0) run(false,-1); else run(false,T.n%2); run(true,-1); T.n++;
  g.bindFramebuffer(g.FRAMEBUFFER,T.fbg); g.drawBuffers([g.COLOR_ATTACHMENT0]);
  /* 2. the wallpaper (at its own size) */
  g.viewport(0,0,T.bw,T.bh); g.useProgram(pb); g.uniform2f(obsU(pb,'uRes'),T.bw,T.bh); g.uniform1f(obsU(pb,'uTime'),t); g.uniform1i(obsU(pb,'uQ'),2); g.uniform1f(obsU(pb,'uAmt'),1.0);
  g.uniform1f(obsU(pb,'uEnc'),T.enc); g.uniform1f(obsU(pb,'uExt'),T.eh/T.bh); g.uniform1f(obsU(pb,'uMix'),mix); g.uniform2f(obsU(pb,'uSun'),sun[0],sun[1]);
  [[T.a,'uA'],[T.b,'uB'],[T.c,'uF']].forEach(function(x,i){ g.activeTexture(g.TEXTURE1+i); g.bindTexture(g.TEXTURE_2D,x[0]); g.uniform1i(obsU(pb,x[1]),1+i); }); g.drawArrays(g.TRIANGLES,0,3);
  /* 3. on the screen (or into the linear scene): the wallpaper pushed about by the annihilations */
  var disp=T.fsc?0:1; g.bindFramebuffer(g.FRAMEBUFFER,T.fsc||null); g.viewport(0,0,T.W,T.H);
  var AN=OBS.an.filter(function(e){ return t-e.t0<3.2; }).slice(-12), an=new Float32Array(48), ak=new Float32Array(48);
  AN.forEach(function(e,i){ an[i*4]=e.x; an[i*4+1]=e.y; an[i*4+2]=t-e.t0; an[i*4+3]=e.R; ak[i*4]=e.v; ak[i*4+1]=e.sp?1:0; ak[i*4+2]=e.sd; });
  g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D,T.bg);
  g.useProgram(pc); g.uniform2f(obsU(pc,'uRes'),T.W,T.H); g.uniform1f(obsU(pc,'uT'),t); g.uniform1i(obsU(pc,'uBg'),0); g.uniform1i(obsU(pc,'uDisp'),disp);
  g.uniform4fv(obsU(pc,'uAn'),an); g.uniform4fv(obsU(pc,'uAk'),ak); g.uniform1i(obsU(pc,'uNa'),AN.length); g.drawArrays(g.TRIANGLES,0,3);
  /* 4. the objects (premultiplied, light added where they have no body) */
  var L=OBS.list; AN.forEach(function(e){ var a=t-e.t0, ext=e.R*1.5;
    if(e.v===0) ext=e.sp?Math.max(e.R*1.6,e.R*0.4+0.36*Math.min(a,1.0)+0.01):Math.max(e.R*2.6,0.09,e.R*0.4+0.36*Math.min(Math.max(a-0.3,0),1.6)+0.01);   /* the flash's glow and the ring inside the quad */
    else if(e.v===1){ var u=a*0.2; ext=e.R*0.8+u+1.5*u*u+0.05; }
    if(e.v===2&&(e.sp||a>0.06)) return; if(e.v===0&&e.sp&&a>1.1) return; L.push([e.x,e.y,ext,6,a,e.v,e.sp?1:0,e.sd,e.R,e.rot,0,0]); });
  var n=Math.min(L.length,200); if(n){ var D=OBS.buf&&OBS.buf.d.length>=n*12?OBS.buf.d:new Float32Array(Math.max(n,64)*12);
    for(var i=0;i<n;i++){ var o=L[i]; for(var j=0;j<12;j++) D[i*12+j]=o[j]||0; }
    if(!OBS.buf||OBS.buf.d!==D){ if(!OBS.buf){ OBS.buf={b:g.createBuffer(),vao:g.createVertexArray()}; } OBS.buf.d=D; g.bindVertexArray(OBS.buf.vao); g.bindBuffer(g.ARRAY_BUFFER,OBS.buf.b); g.bufferData(g.ARRAY_BUFFER,D.byteLength,g.DYNAMIC_DRAW);
      for(var a2=0;a2<3;a2++){ g.enableVertexAttribArray(a2); g.vertexAttribPointer(a2,4,g.FLOAT,false,48,a2*16); g.vertexAttribDivisor(a2,1); } }
    g.bindVertexArray(OBS.buf.vao); g.bindBuffer(g.ARRAY_BUFFER,OBS.buf.b); g.bufferSubData(g.ARRAY_BUFFER,0,D,0,n*12);
    g.enable(g.BLEND); g.blendFunc(g.ONE,g.ONE_MINUS_SRC_ALPHA); g.useProgram(po);
    g.uniform2f(obsU(po,'uRes'),T.W,T.H); g.uniform1f(obsU(po,'uT'),t); g.uniform1i(obsU(po,'uBg'),0); g.uniform1i(obsU(po,'uDisp'),disp);
    var lc=[1-0.45*mix,0.78+0.02*mix,0.48+0.52*mix]; g.uniform2f(obsU(po,'uL'),sun[0]*1.4,sun[1]*1.4); g.uniform3f(obsU(po,'uLc'),lc[0],lc[1],lc[2]);
    g.uniform4fv(obsU(po,'uPose'),OBS.pose||new Float32Array(12)); g.drawArraysInstanced(g.TRIANGLE_STRIP,0,4,n); g.disable(g.BLEND); g.bindVertexArray(OBS.vao); }
  /* 5. the scene to the screen */
  if(T.fsc){ g.bindFramebuffer(g.FRAMEBUFFER,null); g.viewport(0,0,T.W,T.H); g.useProgram(pf); g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D,T.sc); g.uniform1i(obsU(pf,'uS'),0); g.uniform2f(obsU(pf,'uRes'),T.W,T.H); g.drawArrays(g.TRIANGLES,0,3); }
  OBS.an=OBS.an.filter(function(e){ return t-e.t0<3.2; }); }

/* ═════ the frame: begun where the flight field is drawn, rendered at its end; hidden on a frame that drew no field ═════ */
function obsBegin(){ if(!OBS.ok) return; OBS.act=true; OBS.list=[]; OBS.t+=DT; }
function obsEnd(){ if(!OBS.act) return; OBS.act=false; try{ if(!OBS.vis){ OBS.cv.style.display='block'; OBS.vis=true; OBS.perf.t=0; OBS.perf.skip=3; }
    var tf=hdCv&&hdCv.style.transform||''; if(OBS.cv.style.transform!==tf) OBS.cv.style.transform=tf; obsPace(); obsRender(); OBS.err=''; }catch(e){ OBS.err=String(e&&e.message||e); if(!OBS.logged){ OBS.logged=true; try{ Logs.ev('obsidian: '+OBS.err.slice(0,200)); }catch(e2){} } }
  OBS.drew=true; }
function obsTick(){ if(!OBS.cv) return; if(OBS.vis&&!OBS.drew){ OBS.cv.style.display='none'; OBS.vis=false; } OBS.drew=false; }
/* the ship's pose: the needle now; each splinter a beat behind (a turn, a roll), drifting out from the axis in a roll and back */
function obsShip(sx,sy,ra){ var L=FLY_LOOK.obsidian, u=obsUV(sx+L.piv,sy), t=OBS.t, yaw=-Math.atan(FLY.tl*flyTiltK()), D=OBSK.rollDur;
  OBS.ship={x:u[0],y:u[1]}; OBS.shipH.push([t,u[1]]); while(OBS.shipH.length&&t-OBS.shipH[0][0]>3.8) OBS.shipH.shift();
  OBS.hist.push([t,yaw,ra]); while(OBS.hist.length&&t-OBS.hist[0][0]>1.0) OBS.hist.shift();
  var at=function(lag){ var ta=t-lag, H=OBS.hist, h=H[0]; for(var i=H.length-1;i>=0;i--){ if(H[i][0]<=ta){ h=H[i]; break; } } return h; };
  var on=FLY.roll>=0; if(on&&!OBS.rollWas) OBS.rollT0=t; OBS.rollWas=on; var sp=Math.sin(Math.PI*Math.max(0,Math.min(1,(t-OBS.rollT0)/(D*1.15))));
  var a1=at(0.09*D), a2=at(0.15*D), y1=at(0.10), y2=at(0.14);
  OBS.pose=new Float32Array([yaw,ra,0,0, y1[1],a1[2],0.11*sp+0.006*Math.sin(t*2.7),0.06*sp+0.004*Math.sin(t*2.1), y2[1],a2[2],0.09*sp+0.006*Math.sin(t*2.3+1),0.08*sp+0.004*Math.sin(t*1.7+2)]);
  var Su=11/LH; OBS.list.push([u[0],u[1],Su*1.9,1,Su,0.8+0.6*(FLY.k||0)]); }
/* a rock gone: the annihilation where it was (the core has put its two halves there already, if it was large or medium) */
function obsGone(x,y,R,sd,rot,split){ var u=obsUV(x,y); OBS.an.push({x:u[0],y:u[1],R:R,sd:sd,rot:rot,sp:split,v:obsAnn(),t0:OBS.t}); }

/* ═════ the skin: its pictures go to the graphics chip while the field is drawn; anywhere else (the menus' demo) the space skin's ═════ */
function obsBase(n,a){ var s=HDSK.space; return s[n]?s[n].apply(s,a):undefined; }
var OBSK={id:'obsidian', hd:true, glow:false, nolight:true, flyLook:'obsidian', rollDur:1.6, motes:['#f0d9a8','#d8b878'],
  glBegin:function(){ obsBegin(); }, glEnd:function(){ obsEnd(); },
  sky:function(dt,s){ if(!OBS.act) return obsBase('sky',arguments); hx.clearRect(-4,-4,LW+8,LH+8); },
  rock:function(r,sz,seed){ var b=HDSK.space.rock(r,sz,seed); b.obsR=r; b.obsSd=(seed%97)*0.731+1.3; return b; },
  drawRock:function(sp,x,y){ if(!OBS.act||sp.obsR===undefined) return obsBase('drawRock',arguments); var u=obsUV(x,y), R=sp.obsR/LH; OBS.list.push([u[0],u[1],R*1.25,0,R,sp.obsSd+(sp.vr||0)*0.37,-sp.rot/16*6.2832]); },
  ship:function(x,y,t,blink){ if(!OBS.act) return obsBase('ship',arguments); if(blink) return; obsShip(x,y,0); },
  shipRoll:function(x,y,t,ra){ if(!OBS.act) return obsBase('ship',[x,y,t,false]); obsShip(x,y,ra); },
  ufo:function(ux,uy,big,hurt){ if(!OBS.act) return obsBase('ufo',arguments); var u=obsUV(ux,uy), Su=(big?7:5)*K*1.4/LH;   /* the core's half width, a little more (the rim is thin) */ OBS.list.push([u[0],u[1],Su*1.6,4,Su,hurt?1:0]); },
  pick:function(x,y,type){ if(!OBS.act) return obsBase('pick',arguments); var u=obsUV(x,y), r=6.5/LH; OBS.list.push([u[0],u[1],r*2.2,5,r]);
    hx.save(); hx.translate(x,y); hdIcon(type,'rgba(255,222,150,0.95)'); hx.restore(); },
  bullet:function(x,y){ if(!OBS.act) return obsBase('bullet',arguments); var m=hx.getTransform?hx.getTransform():{a:1,b:0}, a=-Math.atan2(m.b,m.a), u=obsUV(x,y); OBS.list.push([u[0],u[1],0.05,2,a]); },
  ebullet:function(x,y){ if(!OBS.act) return obsBase('ebullet',arguments); var u=obsUV(x,y); OBS.list.push([u[0],u[1],0.04,3]); },
  shieldRing:function(x,y,t){ if(!OBS.act) return obsBase('shieldRing',arguments); var u=obsUV(x+11,y), Su=14/LH; OBS.list.push([u[0],u[1],Su*1.4,7,Su]); },
  shield:function(){ return P.pick; }, mini:function(){ return obsBase('mini',[]); },
  bursts:function(){ return spKinds({rock:['#fff0c8','#ffd27a','#e0a040','#8a5a20'],ufo:['#ffffff','#ffb0b8','#ff4060','#a01030'],ship:['#fff6dc','#ffdc8a','#e8b050','#9a6a28'],pick:['#fffbe0','#ffe066','#ffc233','#c8840c']}); },
  /* the hooks the game calls when a rock or a saucer is destroyed: an annihilation instead of a burst */
  gone:function(r,sp){ var R=(sp&&sp.obsR!==undefined?sp.obsR:r.r*K)/LH; obsGone(fx(r.x),r.y*K,R,sp&&sp.obsSd!==undefined?sp.obsSd+(sp.vr||0)*0.37:1.3,sp?-sp.rot/16*6.2832:0,r.sz<2); },
  goneUfo:function(f){ obsGone(fx(f.x),f.y*K,(f.ufo==='big'?11:8)/LH,4.2,0,false); }
};
FLY_LOOK.obsidian={piv:11,tip:[-2,6],trail:'none',c:'255,214,140',life:0.6,w:1.0};
