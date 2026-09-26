#!/usr/bin/env python3
"""Всё в один экран в альбомной ориентации: каждый экран приложения в настоящем браузере (Chromium, playwright) на размерах
iPhone от SE до Pro Max. Проверяю, что ничего не вылезает за экран и нет прокрутки; портрет — только просьба повернуть.
Снимки кладутся в tools/out/layout_*.png. Нужен python-пакет playwright с Chromium; без него стенд пропускается."""
import pathlib, sys
try:
    from playwright.sync_api import sync_playwright
except Exception:
    print('пропущено: нет playwright'); sys.exit(0)
ROOT=pathlib.Path(__file__).resolve().parents[2]; OUT=ROOT/'tools'/'out'; OUT.mkdir(exist_ok=True)
URL='file://'+str(ROOT/'app'/'sonar_lab3.html')
SIZES=[(568,320,'SE-1'),(667,375,'SE'),(750,390,'вырез 844x390'),(844,390,'14'),(932,430,'Pro Max'),(1002,462,'пользователь')]
SETUP={
 'home':"show('home'); el('a2hs').classList.remove('hidden'); el('err').classList.remove('hidden'); el('err').textContent='Не вышло: нет микрофона: нужна вкладка по https'; el('silentP').textContent='В обычном режиме переключатель беззвучного режима глушит зонд. Можно попробовать экспериментальный.'; el('silentT').textContent='Беззвучный режим телефона: не поддерживается (обычный)';",
 'orient':"show('orient');",
 'rec':"show('rec'); el('say').textContent='Ладонь сбоку на 10 см'; el('sub').textContent='У края с микрофоном, ладонью вниз, напротив метки.'; el('clock').textContent='4.2 / 16 с';",
 'recDone':"show('recDone'); var st=el('stats'); ['длительность','разрывов потока','сторона руки','зонд слышен','пик входа','размер'].forEach(function(k){ var r=document.createElement('div'); r.className='kv'; r.innerHTML='<span>'+k+'</span><b>16.0 с</b>'; st.appendChild(r); }); el('share').classList.remove('hidden'); fitScreen();",
 'cal':"show('cal'); CS.busy=false; calText('Готовлюсь','Зонда почти не слышно',NOPROBE); el('calBig').textContent='руки пока не вижу'; el('calDiag').textContent='рука: видна (движение) · эхо +31 дБ над пустой · движение -18 дБ'; el('calLogS').classList.remove('hidden'); fitScreen();",
 'menu':"show('game'); el('gPanel').classList.remove('hidden'); el('gLogI').textContent='Записано 150 с партии (последние 150 с). Журнал настройки: 120 с.'; fitScreen();",
}
# 26.09: запись вбок идёт с телефоном вертикально — её экраны проверяю в портрете
PSIZES=[(320,568,'SE-1'),(375,667,'SE'),(390,844,'14'),(430,932,'Pro Max')]
PSETUP={
 'sideIntro':"lastRec='recSide'; show('sideIntro'); sideOri();",
 'recSide':"lastRec='recSide'; show('recSide'); buildHTrack(); el('mkH').style.left=xOf(40)+'px'; el('sdSay').textContent='Замри справа'; el('sdSub').textContent='Напротив метки, на том же расстоянии.'; el('sdClock').textContent='22.4 / 39 с';",
 'sideDone':"lastRec='recSide'; show('recDone'); var st=el('stats'); ['длительность','разрывов потока','экран','зонд слышен','пик входа','размер'].forEach(function(k){ var r=document.createElement('div'); r.className='kv'; r.innerHTML='<span>'+k+'</span><b>39.0 с</b>'; st.appendChild(r); }); el('share').classList.remove('hidden'); fitScreen();",
}
bad=0
def run(b,sizes,setup):
    global bad
    for (w,h,name) in sizes:
        pg=b.new_page(viewport={'width':w,'height':h})
        pg.goto(URL); pg.wait_for_timeout(200)
        pg.evaluate("()=>{ window.__T={}; }")
        # код приложения живёт внутри замыкания — подключаюсь через тестовый крючок, который собираю тут же из текста страницы
        for scr,js in setup.items():
            pg.goto(URL); pg.wait_for_timeout(150)
            r=pg.evaluate("""(js)=>{ const src=[...document.scripts].map(s=>s.textContent).join('\\n');
                const hook=src.replace("el('gMenu').addEventListener","window.__run=function(c){ eval(c); };\\nel('gMenu').addEventListener");
                document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
                (0,eval)(hook); window.__run(js);
                const s=[...document.querySelectorAll('.screen')].find(x=>!x.classList.contains('hidden'));
                const t=(!document.getElementById('gPanel').classList.contains('hidden')&&s.id==='game')?document.getElementById('gPanel'):s;
                const out=[]; t.querySelectorAll('*').forEach(e=>{ const r=e.getBoundingClientRect(); if(!r.width||!r.height||getComputedStyle(e).visibility==='hidden') return;
                  if(r.left<-1||r.top<-1||r.right>innerWidth+1||r.bottom>innerHeight+1) out.push((e.id||e.tagName)+' '+Math.round(r.left)+','+Math.round(r.top)+'–'+Math.round(r.right)+','+Math.round(r.bottom)); });
                return {over:t.scrollHeight>t.clientHeight+1||t.scrollWidth>t.clientWidth+1, sh:t.scrollHeight, ch:t.clientHeight, out:out.slice(0,4), fs:getComputedStyle(document.documentElement).fontSize,
                        page:document.documentElement.scrollHeight>innerHeight+1||document.documentElement.scrollWidth>innerWidth+1}; }""",js)
            ok=not r['over'] and not r['out'] and not r['page']
            if not ok: bad+=1
            pg.screenshot(path=str(OUT/f'layout_{scr}_{w}x{h}.png'))
            print(f"{'ok ' if ok else 'НЕ ВЛЕЗАЕТ'} {name:>14} {w}x{h} {scr:8} шрифт {r['fs']:>6} | высота {r['sh']}/{r['ch']}" + ('' if ok else f" | вылезает: {r['out']}"))
        pg.close()
with sync_playwright() as p:
    b=p.chromium.launch()
    run(b,SIZES,SETUP)
    run(b,PSIZES,PSETUP)
    # сторона кнопок: рука справа — кнопки слева; рука слева — зеркально
    for hand in ('right','left'):
        pg=b.new_page(viewport={'width':844,'height':390}); pg.goto(URL); pg.wait_for_timeout(150)
        r=pg.evaluate('''(hand)=>{ document.body.classList.toggle('hand-left',hand==='left');
          const x=id=>{ const e=document.getElementById(id); e.classList.remove('hidden'); return e; };
          const home=x('home'), g=document.getElementById('goGame').getBoundingClientRect(), t=home.querySelector('h1').getBoundingClientRect();
          document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('hidden',s.id!=='game')); ['gStart','gAgain','gSave'].forEach(i=>x(i));
          const st=document.getElementById('gStart').getBoundingClientRect(), mn=document.getElementById('gMenu').getBoundingClientRect();
          return {playLeft:g.left<t.left, startLeft:st.right<innerWidth/2, menuLeft:mn.right<innerWidth/2}; }''',hand)
        want=(hand=='right'); ok=r['playLeft']==want and r['startLeft']==want and r['menuLeft']==want
        if not ok: bad+=1
        pg.screenshot(path=str(OUT/f'layout_game_buttons_{hand}.png'))
        print(f"{'ok ' if ok else 'НЕ ТАК'} рука {'справа' if hand=='right' else 'слева'}: «Играть» {'слева' if r['playLeft'] else 'справа'}, «Старт» {'слева' if r['startLeft'] else 'справа'}, «Меню» {'слева' if r['menuLeft'] else 'справа'}")
        pg.close()
    pg=b.new_page(viewport={'width':390,'height':844}); pg.goto(URL); pg.wait_for_timeout(150)
    vis=pg.evaluate("()=>getComputedStyle(document.getElementById('portrait')).display")
    pg.screenshot(path=str(OUT/'layout_portrait.png')); print('портрет 390x844: просьба повернуть', 'видна' if vis=='flex' else 'НЕ видна')
    if vis!='flex': bad+=1
    b.close()
print('ИТОГ:', 'ok' if bad==0 else f'ПРОВАЛ ({bad})'); sys.exit(1 if bad else 0)
