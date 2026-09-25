#!/usr/bin/env python3
"""Разбор журналов партии: лабы (sonar_game_*.wav) и самой игры (sonaroids_game_*.wav): звук PCM16 + JSON в куске 'glog'.
Запуск: python3 game_log.py журнал1.wav [журнал2.wav ...]
В журнале игры кадры отрисовки пишутся только в полёте, столбцы другие: [кадр, шаг ядра, рука, корабль y/поле, жизни, счёт]; уровень — 1 + число событий level в записанном куске (партия хранит последние 150 с).
Для каждой партии: настройки, события, и метрики механики без всякой метки:
 - рука видна: доля кадров полёта, где рука есть;
 - итог−абс.: насколько итоговая высота расходится с абсолютной частью (медиана/95%), мм;
 - согласие: корреляция размахов быстрой и абсолютной частей на окнах по 2 с (чем выше, тем меньше «резинки»);
 - скачок/кадр: изменение итоговой высоты за кадр обработки (10.7 мс), медиана/99%;
 - шум абсолютной и шум итога: отклонение от собственной сглаженной версии (окно 31 кадр), мм;
 - у краёв: доля времени, когда корабль у самого верха или низа поля.
Первое чтение большого файла с диска бывает медленным (до минуты) — это не зависание."""
import struct, json, sys, numpy as np
from collections import Counter
def load(fn):
    raw=open(fn,'rb').read(); p=12; ch={}
    while p<len(raw):
        cid=raw[p:p+4]; sz=struct.unpack('<I',raw[p+4:p+8])[0]; ch[cid]=raw[p+8:p+8+sz]; p+=8+sz+(sz&1)
    info=ch[b'LIST']; sz=struct.unpack('<I',info[8:12])[0]
    meta=json.loads(info[12:12+sz].decode('utf-8').strip()); glog=json.loads(ch[b'glog'].decode('utf-8').strip())
    pcm=np.frombuffer(ch[b'data'],dtype='<i2').astype(np.float32)/32767*meta['pcm']['full_scale']
    return meta,glog,pcm
def analyse(fn):
    meta,g,pcm=load(fn); fs=meta['fs']; N=meta['N']; f0=meta['first_frame']; gm=meta['game']
    D=np.array(g['dsp'],dtype=float); m=D[:,1]==1; t=(D[:,0]-f0)*N/fs; h=D[:,2]; ab=D[:,3]; fa=D[:,5]
    R=g['render']; hand=np.array([q[2] for q in R]); ev=Counter(e[1] for e in g['events'])
    if 'core_step' in meta.get('columns',{}).get('render',[]):   # журнал игры Sonaroids: все кадры отрисовки — полёт
        play=np.ones(len(R),bool); score=R[-1][5] if R else 0; level=1+ev.get('level',0)
    else:                                                         # журнал лабы: состояние 1 — полёт
        st=np.array([q[4] for q in R]); play=st==1; score=R[-1][6]; level=R[-1][7]
    fastmm=fa*gm['cal']['s']; dF=[];dA=[]
    for a in np.arange(t[0],t[-1]-2,0.5):
        w=m&(t>=a)&(t<a+2)
        if w.sum()<150: continue
        dF.append(np.ptp(fastmm[w])); dA.append(np.ptp(ab[w]))
    dh=np.abs(np.diff(h)); mm=m[1:]&m[:-1]; k=31
    jitA=np.std((ab-np.convolve(ab,np.ones(k)/k,mode='same'))[m][k:-k]); jitH=np.std((h-np.convolve(h,np.ones(k)/k,mode='same'))[m][k:-k])
    hv=hand[play&(hand>=0)]
    return dict(meta=meta,dur=len(pcm)/fs,ev=ev,score=score,level=level,
        vis=100*np.mean(hand[play]>=0) if play.any() else float('nan'),gap=np.median(np.abs(h[m]-ab[m])),gap95=np.percentile(np.abs(h[m]-ab[m]),95),
        agree=np.corrcoef(dF,dA)[0,1] if len(dF)>3 else float('nan'),jump=np.median(dh[mm]),jump99=np.percentile(dh[mm],99),jitA=jitA,jitH=jitH,
        edge=100*np.mean((hv<0.05)|(hv>0.95)) if len(hv) else float('nan'))
if __name__=='__main__':
    for fn in sys.argv[1:]:
        s=analyse(fn); gm=s['meta']['game']
        head=(f"версия {s['meta'].get('version','—')}, правила {gm.get('core','—')}, поле {gm.get('field_mm','—')} мм" if 'core' in gm
              else f"сложность {gm['diff']}, поле {gm['span']}%")
        print(f"\n== {fn.split('/')[-1]} == начало {gm['started']} | {s['dur']:.1f} с записано | {head} | счёт {s['score']}, уровень {s['level']}")
        print(f"  зонд: сторона {gm['chan']}, уровень {gm.get('probe_gain','0.25 (до автоуровня)')}, запас {gm.get('probe_snr','—')} дБ, полоса с {gm.get('f_lo',17750)} Гц | калибровка {{k:{gm['cal']['k']:.2f}, o:{gm['cal']['o']:.0f}, s:{gm['cal']['s']:.2f}}}")
        print(f"  события: {dict(s['ev'])}")
        print(f"  рука видна {s['vis']:.1f}% | итог−абс. {s['gap']:.1f}/{s['gap95']:.0f} мм | согласие {s['agree']:.2f} | скачок/кадр {s['jump']:.2f}/{s['jump99']:.1f} мм | шум абсолютной {s['jitA']:.1f} мм, итога {s['jitH']:.2f} мм | у краёв {s['edge']:.1f}%")
