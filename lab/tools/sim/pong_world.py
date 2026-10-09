# SonaPong world model (1.58z19, 9 Oct): tactics (spot on own racket x target on the other) for angle sets; angles from the real pgSurf via angtab.json
# (scratchpad harness), racket heights at hit from Den's 13:46 recording. Expert: speed sd 5%, spot sd 0.25; novice: 8%, 0.40.
import json,math,random,sys
SP='/tmp/claude-0/-home-claude-sonaroids/f24eda48-188b-5049-89e1-75404e43dc02/scratchpad'
AT=json.load(open(SP+'/angtab.json')); PY=json.load(open(SP+'/py1346.json'))
G=1.8; AR=844/390; D=AR/2; ROOMP=0.714; TOP=0.062
KS=['1','0.875','0.75','0.625','0.5']
def theta(tab,ui):
  p=(max(-1,min(1,ui))+1)*20; i=min(39,int(p)); f=p-i; return math.radians(tab['th'][i]*(1-f)+tab['th'][i+1]*f)
SK={'опытный':(0.05,0.25),'новичок':(0.08,0.40)}
def game(key,tac,skill,rng):
  sv,ss=SK[skill]; t=0; lives=5; score=0; series=0; passes=0; ceils=0; lost=0; hs=[]
  while t<200 and lives>0:
    k=KS[min(4,int(t//40))]; tab=AT[key][k]; hw=tab['hw']
    ui0,tg=tac
    th0=theta(tab,ui0); Rn=D+(tg-ui0)*hw; v2=Rn*G/math.sin(2*th0)
    ui=ui0+rng.gauss(0,ss); ui=max(-1,min(1,ui)); th=theta(tab,ui); v2*=math.exp(2*rng.gauss(0,sv))
    R=v2*math.sin(2*th)/G; h=v2*math.cos(th)**2/(2*G); off=(ui*hw+R-D)/hw
    room=rng.choice(PY)-0.132-TOP
    touched=h>room
    if touched: h=room; off+=rng.gauss(0,0.15)/hw
    t+=2*math.sqrt(2*h/G)+0.05
    if abs(off)>1: lives-=1; lost+=1; series=0; t+=3; continue
    passes+=1
    if touched: ceils+=1; series=0; continue
    f=min(1,h/ROOMP); hs.append(f)
    score+=100*f**1.5*(1.25/float(k))*(1+0.1*min(5,series)); series+=1
  return score,passes,ceils,lost,t,sum(hs)/max(1,len(hs))
def avg(key,tac,skill,n=1500,seed=1):
  rng=random.Random(seed); a=[0]*6
  for _ in range(n):
    r=game(key,tac,skill,rng); a=[x+y/n for x,y in zip(a,r)]
  return a
keys=['36/27/25','36/27/23','36/27/22','37/31/27']
SPOT={-0.6:'внешн',-0.3:'внешн½',0:'серед',0.3:'внутр½',0.6:'внутр'}; TG={-0.5:'ближн',0:'центр',0.5:'дальн'}
for skill in SK:
  print('=====',skill)
  for key in keys:
    res=[]
    for ui0 in SPOT:
      for tg in TG:
        s,p,c,l,t,f=avg(key,(ui0,tg),skill,n=600)
        res.append((s,SPOT[ui0]+'→'+TG[tg],p,c,l,f))
    res.sort(reverse=True)
    cc=[r for r in res if r[1]=='серед→центр'][0]
    print(key,'| серед→центр',round(cc[0]),'выс',round(cc[5]*100),'% потолок',round(cc[3]),'упало',round(cc[4],1))
    for r in res[:4]: print('    ',r[1].ljust(14),round(r[0]),'пасов',round(r[2]),'потолок',round(r[3]),'упало',round(r[4],1),'выс',round(r[5]*100),'%')
    print('     худшая:',res[-1][1],round(res[-1][0]),'упало',round(res[-1][4],1),'| разброс лучших 5 тактик',round(res[4][0]/res[0][0]*100),'% от лучшей')
