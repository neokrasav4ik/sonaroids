#!/usr/bin/env python3
"""Builds the game from its parts in src/ into game/play/index.html — one file, so it loads fast and works offline.

  python3 build.py           write game/play/index.html
  python3 build.py --check   build and compare with game/play/index.html (CI); fails if they differ
  python3 build.py --icons   also draw the home-screen icons game/play/icon-*.png (needs Pillow; the icons are committed)

The parts are joined in name order. game/font.js (made by font/make_font.py) goes in right after the <script> tag.
The modules (DSP2, Tune, Core, Sonar, Logs, Sfx, STR) are plain top-level objects; 40_gfx … 49_main share one closure.
"""
import os, re, sys, subprocess, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
OUT = os.path.join(HERE, 'game', 'play', 'index.html')

def build():
    parts = sorted(f for f in os.listdir(SRC) if re.match(r'^\d\d_.*\.(js|html)$', f))
    font = open(os.path.join(HERE, 'game', 'font.js'), encoding='utf-8').read()
    out = []
    for f in parts:
        s = open(os.path.join(SRC, f), encoding='utf-8').read()
        out.append(s)
        if f.startswith('00_'):
            out.append(font)
    return ''.join(out), parts

def check_js(html):
    js = re.findall(r'<script>(.*?)</script>', html, re.S)[0]
    tmp = tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8'); tmp.write(js); tmp.close()
    r = subprocess.run(['node', '--check', tmp.name], capture_output=True, text=True); os.unlink(tmp.name)
    return r.returncode == 0, r.stderr.strip()

SHIP = ['....11..........', '....1221........', '.....12221......', '..1112233321....', '.122223333332111', '.123333333333333',
        '.122223333332111', '..1112233321....', '.....12221......', '....1221........', '....11..........']
def icons():
    from PIL import Image
    import random
    ship = [(31, 94, 82), (47, 143, 124), (127, 224, 200), (233, 255, 248)]
    for size in (180, 192, 512):
        g = 40                                              # the icon is a 40×40 pixel picture, scaled up without smoothing
        im = Image.new('RGB', (g, g), (27, 26, 46)); px = im.load(); rnd = random.Random(7)
        for _ in range(26):
            x, y = rnd.randrange(g), rnd.randrange(g); px[x, y] = rnd.choice([(90, 76, 110), (184, 155, 178), (255, 233, 214)])
        for y in range(g):                                  # a soft nebula band
            for x in range(g):
                if abs((y - 26) - 0.35 * (x - 20)) < 3 and (x * 7 + y * 3) % 4 == 0: px[x, y] = (60, 43, 79)
        ox, oy = 10, 14
        for r, row in enumerate(SHIP):
            for c, ch in enumerate(row):
                if ch != '.': px[ox + c, oy + r] = ship[int(ch) - 1]
        for (x, y, col) in [(8, 19, (255, 122, 122)), (9, 19, (255, 184, 107)), (10, 19, (255, 241, 201)), (8, 18, (255, 122, 122)), (8, 20, (255, 122, 122)), (7, 19, (255, 122, 122))]:
            px[x, y] = col
        for x in (29, 33): px[x, 19] = (255, 184, 107); px[x + 1, 19] = (255, 184, 107)
        im.resize((size, size), Image.NEAREST).save(os.path.join(HERE, 'game', 'play', 'icon-%d.png' % size))
    print('icons written')

if __name__ == '__main__':
    if '--icons' in sys.argv: icons()
    html, parts = build()
    ok, err = check_js(html)
    print('parts:', ' '.join(parts))
    print('syntax:', 'ok' if ok else 'ERROR\n' + err)
    if '--check' in sys.argv:
        same = os.path.exists(OUT) and open(OUT, encoding='utf-8').read() == html
        print('game/play/index.html matches src/:', same)
        sys.exit(0 if same and ok else 1)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf-8').write(html)
    print('written', os.path.relpath(OUT, HERE), round(len(html.encode()) / 1024), 'KB')
    sys.exit(0 if ok else 1)
