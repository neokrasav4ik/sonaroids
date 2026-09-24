#!/usr/bin/env python3
"""Разбор журнала настройки (sonar_setup_*.wav): от запуска обработки (пустая комната) через шаги калибровки до игры.
Запуск: python3 setup_log.py журнал.wav [--step 0.5]
Печатает: настройки зонда, события (кнопки, шаги, появления и уходы руки с причиной), и ленту по времени:
 доля кадров с рукой, эхо над уровнем пустой комнаты, сглаженная энергия движения, дальность, высота.
Признак бага «рука видна рывками»: много уходов, за которыми через 1–2 с снова вход по движению."""
import sys, json, struct, numpy as np
def load(fn):
    raw=open(fn,'rb').read(); p=12; ch={}
    while p<len(raw):
        cid=raw[p:p+4]; sz=struct.unpack('<I',raw[p+4:p+8])[0]; ch[cid]=raw[p+8:p+8+sz]; p+=8+sz+(sz&1)
    info=ch[b'LIST']; sz=struct.unpack('<I',info[8:12])[0]
    return json.loads(info[12:12+sz].decode('utf-8').strip()), json.loads(ch[b'glog'].decode('utf-8').strip())
args=[a for a in sys.argv[1:]]; step=0.5
if '--step' in args: i=args.index('--step'); step=float(args[i+1]); del args[i:i+2]
for fn in args:
    m,g=load(fn); fs=m['fs']; N=m['N']; fr=lambda f: f*N/fs; S=m.get('setup',{})
    print(f"\n== {fn.split('/')[-1]} == {S.get('kind')} | начало {S.get('started')} | {fr(m['frames']):.1f} с | разрывов {m['gaps']}, зашкалов {m['clipped']}")
    print(f"  зонд: сторона {S.get('chan')}, уровень {S.get('probe_gain')}, запас {S.get('probe_snr')} дБ, полоса с {S.get('f_lo')} Гц | прямой: выраженность {m['dsp_info'].get('prom')} дБ")
    print(f"  калибровка в начале {S.get('cal')} (была: {S.get('calDone')}) | в конце {m.get('cal_now')}")
    print("  события:")
    for e in g['events']: print(f"    {fr(e[0]):6.2f} с  {e[1]}" + (f"  {json.dumps(e[2],ensure_ascii=False)}" if len(e)>2 else ''))
    D=np.array([[np.nan if v is None else v for v in r] for r in g['dsp']],dtype=float)
    if not len(D): continue
    t=fr(D[:,0]); pres=D[:,1]==1; ech=D[:,7]-D[:,8]
    print(f"  {'время':>6} {'рука':>5} {'эхо над пустой':>14} {'движение':>9} {'дальность':>9} {'высота':>7}")
    for a in np.arange(np.floor(t[0]/step)*step,t[-1],step):
        w=(t>=a)&(t<a+step)
        if not w.any(): continue
        e=np.nanmedian(ech[w]) if np.isfinite(ech[w]).any() else float('nan')
        print(f"  {a:6.1f} {100*pres[w].mean():4.0f}% {e:+13.0f} {np.median(D[w,9]):+9.0f} {np.median(D[w,4]):9.0f} {np.median(D[w,2]):7.0f}")
    ent=[e for e in g['events'] if e[1].startswith('рука есть')]; lv=[e for e in g['events'] if e[1].startswith('рука ушла')]
    flick=sum(1 for l in lv if any(0<fr(e[0]-l[0])<2.0 for e in ent))
    first=next((i for i,p in enumerate(pres) if p),None)
    share=100*pres[first:].mean() if first is not None else 0
    print(f"  итог: входов {len(ent)}, уходов {len(lv)}, из них с возвратом за 2 с (рывки) {flick} | рука видна {share:.0f}% времени после первого появления")
