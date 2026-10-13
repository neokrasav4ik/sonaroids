"""The SonaLob «together» GIF (v1.64l), step 2 of 2: puts together what make_duo_gif.js drew — the scene, both phones' screens (warped
into their perspective), the two palms (promo_hand.py, drawn once as the main GIF's, the left one its mirror), each at its phone's
charging end and moving to and from it with that phone's palm in the game (the farther, the higher the racket), the ultrasound arcs,
the captions over it all. The loop: the recording runs W frames past the end, and those fade into the start, so it joins without a jump.
Everything at twice the size, then halved. Writes promo/sonalob_duo_<lang>_<w>.gif for w = 480, 640, 800 (Den: «маленький, средний,
полный»). Run from the repository after make_duo_gif.js: python3 promo/make_duo_gif.py [en|ru]   (needs numpy, Pillow and ffmpeg)"""
import json, os, sys, subprocess, shutil
import numpy as np
from PIL import Image, ImageDraw, ImageOps
HERE = os.path.dirname(os.path.abspath(__file__)); FR = os.path.join(HERE, 'frames_duo')
sys.path.insert(0, HERE); import promo_hand
meta = json.load(open(os.path.join(FR, 'meta.json'))); X = meta['X']; N = meta['N']; W = meta['W']; FPS = meta['FPS']; F = meta['F']
K = 0.45                                          # the phones' size against the main GIF's (make_duo_gif.js)
WW, HH = 800 * X, 450 * X
L = lambda n: Image.open(os.path.join(FR, n)).convert('RGBA')
bg, over = L('bg.png'), L('over.png'); masks = [L('mask%d.png' % k).split()[3] for k in (0, 1)]
HP = os.path.join(FR, 'hand.png')
if not os.path.exists(HP):
    promo_hand.render(pose='relaxed', out=HP, W=int(300 * X * K), H=int(470 * X * K), ppcm=13.8 * X * K, ss=2, cy=7.5, cx=-1.2, rigY=18, rigX=0, sleeve=True)
HAND = [ImageOps.mirror(Image.open(HP).convert('RGBA')), Image.open(HP).convert('RGBA')]   # the left phone — the left hand
def coeffs(dst, src):
    A, B = [], []
    for (x, y), (u, v) in zip(dst, src):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]; B += [u, v]
    return np.linalg.solve(np.array(A, float), np.array(B, float)).tolist()
g0 = Image.open(os.path.join(FR, 'en_0_0000.png') if os.path.exists(os.path.join(FR, 'en_0_0000.png')) else os.path.join(FR, 'ru_0_0000.png'))
SRC = [(0, 0), (g0.width, 0), (g0.width, g0.height), (0, g0.height)]
CO = [coeffs([(x * X, y * X) for x, y in meta['quad'][k]], SRC) for k in (0, 1)]
PORT = [(x * X, y * X) for x, y in meta['port']]
# the palm's way: from the racket at rest (0.12) to the highest swings seen
lo = 0.12; hi = max(0.3, float(np.percentile([f for fr in F for f in fr], 99.5)))
def gap(f): u = min(1.0, max(0.0, (f - lo) / (hi - lo))); return u
def screen(lang, k, j): return Image.open(os.path.join(FR, '%s_%d_%04d.png' % (lang, k, j))).convert('RGB')
def compose(j, lang, sub, j2=None, a=0.0):      # j2, a: at the loop's end the screens fade into the start's and the palms move to theirs
    im = bg.copy()
    for k in (0, 1):
        s = screen(lang, k, j)
        if j2 is not None: s = Image.blend(s, screen(lang, k, j2), a)
        im.paste(s.transform((WW, HH), Image.PERSPECTIVE, CO[k], Image.BICUBIC), (0, 0), masks[k])
    im.alpha_composite(over)
    t = j / FPS; arc = Image.new('RGBA', (WW, HH), (0, 0, 0, 0)); d = ImageDraw.Draw(arc); hands = []   # the arcs: N/FPS·1.2 whole turns a loop
    for k in (0, 1):
        f = F[j][k] if j2 is None else F[j][k] + (F[j2][k] - F[j][k]) * a
        u = gap(f); sc = 0.95 + 0.1 * u; PX, PY = PORT[k]
        h = HAND[k]; hw, hh = int(h.width * sc), int(h.height * sc); near = 72 * K * X * sc
        g = (16 + 40 * u) * X                     # the palm's near side from the charging end
        x = int(PX + g - near) if k else int(PX - g - (hw - near)); y = int(PY - 205 * K * X * sc)
        hands.append((h.resize((hw, hh), Image.LANCZOS), (x, y)))
        a0, a1 = (-38, 38) if k else (142, 218)
        for n in range(4):
            ph = (t * 1.2 + n / 4 + 0.13 * k) % 1; r = 6 * X + ph * (g - 7 * X)
            if r > 3: d.arc([PX - r, PY - r, PX + r, PY + r], a0, a1, fill=(255, 179, 71, int(235 * (1 - ph))), width=int(2.5 * X))
    im.alpha_composite(arc)
    for h, at in hands: im.alpha_composite(h, at)
    im.alpha_composite(sub)
    return im.convert('RGB').resize((800, 450), Image.LANCZOS)
GIF_FPS = int(os.environ.get('GIF_FPS', '15'))
for lang in (sys.argv[1:] or ['en', 'ru']):
    if not os.path.exists(os.path.join(FR, '%s_0_0000.png' % lang)): print('no frames for', lang); continue
    sub = L('sub_%s.png' % lang); od = os.path.join(FR, 'out_' + lang); os.makedirs(od, exist_ok=True)
    for i in range(N):
        im = compose(i + W, lang, sub) if i < N - W else compose(i + W, lang, sub, i + W - N, (i - (N - W) + 1) / (W + 1))
        im.save(os.path.join(od, '%04d.png' % i))
    if not shutil.which('ffmpeg'): print('no ffmpeg: the frames are in', od); continue
    for w, cols in ((480, 96), (640, 128), (800, 128)):
        out = os.path.join(HERE, 'sonalob_duo_%s_%d.gif' % (lang, w))
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-framerate', str(FPS), '-i', os.path.join(od, '%04d.png'), '-vf',
                        'fps=%d,scale=%d:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff:max_colors=%d[p];[b][p]paletteuse=dither=none:diff_mode=rectangle' % (GIF_FPS, w, cols), out], check=True)
        print(out, round(os.path.getsize(out) / 1024), 'KB')
