# SonaPong endless-narrowing world model (1.58z21, 9 Oct): narrowing every N s (x0.875), game ends with balls; tactics x hand levels;
# options tried: series only for high arcs, extra ball for points/high arcs, high arcs delay narrowing, points scale with a hill near the ceiling.
import json,math,random
SP='/tmp/claude-0/-home-claude-sonaroids/f24eda48-188b-5049-89e1-75404e43dc02/scratchpad'
AT=json.load(open(SP+'/angtab.json'))['36/27/23']['1']; PY=json.load(open(SP+'/py1346.json'))
G=1.8; AR=844/390; D=AR/2; ROOMP=0.714; TOP=0.062; HW0=AR*0.2
def theta(ui):
  p=(max(-1,min(1,ui))+1)*20; i=min(39,int(p)); f=p-i; return math.radians(AT['th'][i]*(1-f)+AT['th'][i+1]*f)
SK={'новичок':(0.08,0.40),'опытный':(0.05,0.25),'точный':(0.035,0.18)}
def game(N,tac,skill,rng,PE=3,F=0.75,X=0,M=0,LMAX=5):
  sv,ss=SK[skill]; t=0; lives=5; score=0; ser=0; st=0; nxt=N; hi=0
  while lives>0 and t<3600:
    while t>=nxt: st+=1; nxt+=N
    k=0.875**st; hw=max(0.03,HW0*k); mult=1/max(0.2,0.8*k)
    ui0,tg=tac
    th0=theta(ui0); Rn=D+(tg-ui0)*hw; v2=Rn*G/math.sin(2*th0)
    ui=max(-1,min(1,ui0+rng.gauss(0,ss))); th=theta(ui); v2*=math.exp(2*rng.gauss(0,sv))
    R=v2*math.sin(2*th)/G; h=v2*math.cos(th)**2/(2*G); off=(ui*hw+R-D)/hw
    room=rng.choice(PY)-0.132-TOP; touched=h>room
    if touched: h=room; off+=rng.gauss(0,0.15)/hw
    t+=2*math.sqrt(2*h/G)+0.05
    if abs(off)>1: lives-=1; ser=0; t+=3; continue
    if touched: ser=0; continue
    f=min(1,h/ROOMP); score+=100*f**PE*mult*(1+0.1*min(5,ser)); ser+=1
    if f>=F:
      if X: nxt=min(t+N,nxt+X)
      if M:
        hi+=1
        if hi>=M: hi=0; lives=min(LMAX,lives+1)
  return score,t,0.8*k
TAC=[((0.6,0),'у сетки→центр'),((0,0),'серединой→центр'),((0,0.2),'серединой→дальше'),((0.6,0.25),'у сетки→дальше')]
def table(label,**kw):
  print('==',label)
  for skill in SK:
    r=[]
    for tac,nm in TAC:
      rng=random.Random(7); R=[game(30,tac,skill,rng,**kw) for _ in range(500)]
      r.append((sum(x[0] for x in R)/500,nm,sum(x[1] for x in R)/500/60,sum(x[2] for x in R)/500))
    b=max(x[0] for x in r)
    print(' ',skill.ljust(8),' | '.join(f'{nm} {round(s/b*100)}% ({m:.1f} мин, до {round(w*100)}%)' for s,nm,m,w in r))
