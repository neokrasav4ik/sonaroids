#!/usr/bin/env python3
"""Builds the game from its parts in src/ into game/play/index.html — one file, so it loads fast and works offline.

  python3 build.py           write game/play/index.html
  python3 build.py --check   build and compare with game/play/index.html (CI); fails if they differ
  python3 build.py --icons   also draw the home-screen icons game/play/icon-*.png (needs Pillow; the icons are committed)

The parts are joined in name order. game/font.js (made by font/make_font.py) goes in right after the <script> tag,
then `var VERSION='…'` from the VERSION file; the same version names the service worker's cache (game/play/sw.js).
The modules (DSP2, Tune, Core, Sonar, Logs, Sfx, STR) are plain top-level objects; 40_gfx … 49_main share one closure.
"""
import os, re, sys, subprocess, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
OUT = os.path.join(HERE, 'game', 'play', 'index.html')

def version():
    return open(os.path.join(HERE, 'VERSION'), encoding='utf-8').read().strip()

def sw_source():
    p = os.path.join(HERE, 'game', 'play', 'sw.js'); s = open(p, encoding='utf-8').read()
    return p, re.sub(r"const V = '[^']*';", "const V = 'sonaroids-%s';" % version(), s)

def build():
    parts = sorted(f for f in os.listdir(SRC) if re.match(r'^\d\d_.*\.(js|html)$', f))
    font = open(os.path.join(HERE, 'game', 'font.js'), encoding='utf-8').read()
    out = []
    for f in parts:
        s = open(os.path.join(SRC, f), encoding='utf-8').read()
        out.append(s)
        if f.startswith('00_'):
            out.append(font)
            out.append("var VERSION='%s';\n" % version())
    return ''.join(out), parts

def check_js(html):
    js = re.findall(r'<script>(.*?)</script>', html, re.S)[0]
    tmp = tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8'); tmp.write(js); tmp.close()
    r = subprocess.run(['node', '--check', tmp.name], capture_output=True, text=True); os.unlink(tmp.name)
    return r.returncode == 0, r.stderr.strip()

def icons():
    """The home-screen icons, in the sonar lab's style (the maintainer's choice, 25 Sep): black space, a neon-orange outlined ship,
    white outlined rocks — like the classic vector Asteroids. Drawn big with soft glow, then scaled down.
    icon-maskable-512.png keeps everything inside the middle 80% (Android may cut the icon to a circle)."""
    from PIL import Image, ImageDraw, ImageFilter, ImageChops
    import random
    def draw(size, scale, out):
        S = 2048; k = S / 180                                    # a 180-unit grid, like the lab's icon
        def P(x, y): return ((90 + (x - 90) * scale) * k, (90 + (y - 90) * scale) * k)
        bg = Image.new('RGB', (S, S), (4, 5, 10)); d = ImageDraw.Draw(bg); r = random.Random(5)
        for _ in range(70):
            x, y = r.uniform(0, 180), r.uniform(0, 180); a = r.choice([0.6, 0.8, 1.0]); c = int(120 + 120 * r.random())
            d.ellipse(((x - a) * k, (y - a) * k, (x + a) * k, (y + a) * k), fill=(c, c, c))
        def layer(polys, col, w):
            L = Image.new('RGB', (S, S), (0, 0, 0)); dd = ImageDraw.Draw(L)
            for p in polys: dd.line([P(x, y) for x, y in p] + [P(*p[0])], fill=col, width=int(w * k * scale), joint='curve')
            return L
        ship = [[(30, 52), (98, 82), (30, 112), (46, 82)], [(14, 72), (38, 82), (14, 92), (22, 82)]]
        rocks = [[(118, 36), (134, 28), (152, 34), (160, 50), (150, 66), (132, 70), (120, 60), (124, 48)],
                 [(132, 130), (146, 120), (162, 126), (166, 142), (154, 156), (138, 154), (130, 142)],
                 [(88, 150), (100, 146), (108, 154), (104, 166), (92, 166)]]
        glow = ImageChops.add(layer(ship, (255, 140, 30), 5).filter(ImageFilter.GaussianBlur(10 * k / 4)),
                              layer(rocks, (200, 200, 210), 4).filter(ImageFilter.GaussianBlur(8 * k / 4)))
        img = ImageChops.add(bg, glow)
        img = ImageChops.lighter(img, layer(ship, (255, 168, 60), 2.2)); img = ImageChops.lighter(img, layer(rocks, (245, 245, 250), 2.0))
        img.resize((size, size), Image.LANCZOS).save(os.path.join(HERE, 'game', 'play', out))
    for size in (180, 192, 512): draw(size, 1.0, 'icon-%d.png' % size)
    draw(512, 0.8, 'icon-maskable-512.png')
    print('icons written')

if __name__ == '__main__':
    if '--icons' in sys.argv: icons()
    html, parts = build()
    ok, err = check_js(html)
    print('parts:', ' '.join(parts))
    print('syntax:', 'ok' if ok else 'ERROR\n' + err)
    if '--check' in sys.argv:
        same = os.path.exists(OUT) and open(OUT, encoding='utf-8').read() == html
        swp, sws = sw_source(); same_sw = open(swp, encoding='utf-8').read() == sws
        print('game/play/index.html matches src/:', same, '| version', version(), '| service worker has it:', same_sw)
        same = same and same_sw
        sys.exit(0 if same and ok else 1)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf-8').write(html)
    swp, sws = sw_source(); open(swp, 'w', encoding='utf-8').write(sws)
    print('written', os.path.relpath(OUT, HERE), round(len(html.encode()) / 1024), 'KB, version', version())
    sys.exit(0 if ok else 1)
