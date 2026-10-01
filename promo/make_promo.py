"""The promo GIF (v1.03), step 2 of 2: puts together what make_promo.js drew — the scene, the games on the phone's screen (warped into
its perspective, cross-faded between games), the palm (promo_hand.py, drawn once, then moved and scaled along its line to the phone:
farther — to the right and a little bigger), the ultrasound arcs from the charging end to the palm, the subtitle over it all.
Everything at twice the size, then halved (smooth edges). Writes promo/sonaroids_en.gif, sonaroids_ru.gif (640×360, for the README) and
sonaroids_en_full.gif, sonaroids_ru_full.gif (800×450); a 15 s loop.
Run from the repository after make_promo.js: python3 promo/make_promo.py [en|ru]   (needs numpy, Pillow and ffmpeg)"""
import json, os, sys, math
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); PV = 'pixel' if os.environ.get('PROMO') == 'pixel' else 'hd'
FR = os.path.join(HERE, 'frames_promo_pixel' if PV == 'pixel' else 'frames_promo')
sys.path.insert(0, HERE); import promo_hand
meta = json.load(open(os.path.join(FR, 'meta.json'))); X = meta['X']; N = meta['N']; M = meta['M']; Q = N // 4
W, H = 800 * X, 450 * X
L = lambda n: Image.open(os.path.join(FR, n)).convert('RGBA')
bg, over = L('bg.png'), L('over.png'); mask = L('mask.png').split()[3]
# the palm, drawn once (at twice the size; «relaxed» with the cuff, turned for the phone's 18°)
HP = os.path.join(FR, 'hand.png')
if not os.path.exists(HP):
    promo_hand.render(pose='relaxed', out=HP, W=300 * X, H=470 * X, ppcm=13.8 * X, ss=2, cy=7.5, cx=-1.2, rigY=18, rigX=0, sleeve=True)
hand = Image.open(HP).convert('RGBA')
# the screen: the game's frame warped onto the phone's screen (four corners from the page)
quad = [(x * X, y * X) for x, y in meta['quad']]
def coeffs(dst, src):
    A, B = [], []
    for (x, y), (u, v) in zip(dst, src):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]; B += [u, v]
    return np.linalg.solve(np.array(A, float), np.array(B, float)).tolist()
PS = meta.get('S', 4) if PV == 'pixel' else 1   # pixels: the game's own pixels first (each was PS×PS in the shot), so the warp keeps them square and sharp
def game(k, i):
    p = os.path.join(FR, 'g%d_%04d.png' % (k, i % N))
    if not os.path.exists(p): return None
    im = Image.open(p).convert('RGB'); return im.resize((im.width // PS, im.height // PS), Image.NEAREST) if PS > 1 else im
g0 = game(0, 0); SRC = [(0, 0), (g0.width, 0), (g0.width, g0.height), (0, g0.height)]; CO = coeffs(quad, SRC)
def screen(i):
    k = (i // Q) % 4; a = game(k, i); b = None; t = 1.0
    j = i % Q
    if j < M:                                    # the start of game k: the previous one fades out
        b = game((k - 1) % 4, i); t = (j + M + 0.5) / (2 * M)
    elif j >= Q - M:                              # the end of game k: the next one fades in
        b = game((k + 1) % 4, i); t = 1 - (j - (Q - M) + 0.5) / (2 * M)
    img = a if b is None else Image.blend(b, a, t)
    return img.transform((W, H), Image.PERSPECTIVE, CO, Image.NEAREST if PV == 'pixel' else Image.BICUBIC)
PX, PY = meta['port'][0] * X, meta['port'][1] * X
def frame(i, sub):
    u = meta['U'][i]; t = i / meta['FPS']
    im = bg.copy(); im.paste(screen(i), (0, 0), mask); im.alpha_composite(over)
    s = 0.95 + 0.1 * u; hw, hh = int(hand.width * s), int(hand.height * s)   # Den: «движение ладони с чуть большей амплитудой, так будет нагляднее»
    hl = (492 + 85 * u) * X; ht = 35 * X
    x = int(hl + hand.width / 2 - hw / 2); y = int(ht + hand.height / 2 - hh / 2)
    edge = x + 72 * X * s - PX                    # the palm's near side
    arc = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(arc)
    for k in range(4):
        ph = (t * 1.2 + k / 4) % 1; r = 12 * X + ph * (edge - 14 * X)
        if r > 4: d.arc([PX - r, PY - r, PX + r, PY + r], -38, 38, fill=(255, 179, 71, int(235 * (1 - ph))), width=3 * X)
    im.alpha_composite(arc); im.alpha_composite(hand.resize((hw, hh), Image.LANCZOS), (x, y)); im.alpha_composite(sub)
    return im.convert('RGB').resize((800, 450), Image.LANCZOS)
# packed by ffmpeg: 15 fps, one palette of 128 colours weighted to what moves, no dithering
import subprocess, shutil
GIF_FPS = int(os.environ.get('GIF_FPS', '15'))
for lang in (sys.argv[1:] or ['en', 'ru']):
    sub = L('sub_%s.png' % lang); od = os.path.join(FR, 'out_' + lang); os.makedirs(od, exist_ok=True)
    for i in range(N): frame(i, sub).save(os.path.join(od, '%04d.png' % i))
    if not shutil.which('ffmpeg'): print('no ffmpeg: the frames are in', od); continue
    # two sizes (Den: «в ридми ставим малый гиф, полный в папку просто рядом положи»): 640×360 for the README (~5.7 MB), 800×450 full (~8 MB)
    for name, w in ((('sonaroids_pixel_%s.gif', 640), ('sonaroids_pixel_%s_full.gif', 800)) if PV == 'pixel' else (('sonaroids_%s.gif', 640), ('sonaroids_%s_full.gif', 800))):
        out = os.path.join(HERE, name % lang)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-framerate', str(meta['FPS']), '-i', os.path.join(od, '%04d.png'), '-vf',
                        'fps=%d,scale=%d:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff:max_colors=128[p];[b][p]paletteuse=dither=none:diff_mode=rectangle' % (GIF_FPS, w), out], check=True)
        print(out, round(os.path.getsize(out) / 1024), 'KB')
