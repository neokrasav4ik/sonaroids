#!/usr/bin/env python3
"""Сборка приложения из частей src/ в app/sonar_lab3.html.
Порядок частей важен: 00 открывает страницу, 01 открывает <script> и задаёт AudioWorklet,
02 и 03 — модули верхнего уровня (DSP2, Game), 04–09 — одна общая обёртка (function(){ ... })(),
которую закрывает 09 вместе с </script></body></html>.
Запуск:  python3 build.py            — собрать в app/sonar_lab3.html
         python3 build.py --check    — собрать и сравнить с app/sonar_lab3.html, не перезаписывая
"""
import os, sys, re, subprocess, tempfile
HERE=os.path.dirname(os.path.abspath(__file__))
ORDER=['00_head.html', '01_worklet.js', '02_dsp.js', '03_game_core.js', '04_audio_engine.js', '05_recorder.js', '06_side_pick.js', '07_calibration.js', '08_wiring.js', '085_right.js', '09_game_ui_log.js']
def build():
    return "".join(open(os.path.join(HERE,'src',f),encoding='utf-8').read() for f in ORDER)
def check_js(html):
    js=re.findall(r'<script>(.*?)</script>',html,re.S)[0]
    tmp=tempfile.NamedTemporaryFile('w',suffix='.js',delete=False,encoding='utf-8'); tmp.write(js); tmp.close()
    r=subprocess.run(['node','--check',tmp.name],capture_output=True,text=True); os.unlink(tmp.name)
    ids=set(re.findall(r'id="([^"]+)"',html)); used=set(re.findall(r"el\('([^']+)'\)",js))
    return r.returncode==0, r.stderr.strip(), sorted(used-ids)
if __name__=='__main__':
    html=build(); ok,err,missing=check_js(html)
    print('синтаксис:', 'ok' if ok else 'ОШИБКА\n'+err)
    print('ссылки на несуществующие элементы:', missing or 'нет')
    out=os.path.join(HERE,'app','sonar_lab3.html')
    if '--check' in sys.argv:
        same=open(out,encoding='utf-8').read()==html
        print('совпадает с app/sonar_lab3.html:', same); sys.exit(0 if same and ok else 1)
    open(out,'w',encoding='utf-8').write(html); print('записано', out, round(len(html)/1024),'КБ')
