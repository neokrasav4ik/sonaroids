"""Packs promo/frames/*.png (from make_gif.js) into promo/sonaroids.gif: cropped to the picture, one shared palette, looping forever.
Run: python3 promo/make_gif.py [scale]   — scale < 1 makes a smaller file (nearest-neighbour, keeps the pixels crisp)."""
import glob, os, sys
from PIL import Image, ImageChops
HERE = os.path.dirname(os.path.abspath(__file__))
files = sorted(glob.glob(os.path.join(HERE, 'frames', '*.png')))
frames = [Image.open(f).convert('RGB') for f in files]
# crop: where anything changes between frames, plus the still table and phone around it (the union of all differences, padded)
box = None
for f in frames[1:]:
    b = ImageChops.difference(frames[0], f).getbbox()
    if b: box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
W, H = frames[0].size
pad = int(0.08 * H)
x0, y0, x1, y1 = max(0, box[0] - pad), max(0, box[1] - pad), min(W, box[2] + pad), min(H, box[3] + pad)
# keep a 16:9-ish shape for posts
cw, ch = x1 - x0, y1 - y0
if cw / ch < 16 / 9:
    extra = int(ch * 16 / 9) - cw; x0 = max(0, x0 - extra // 2); x1 = min(W, x0 + int(ch * 16 / 9))
frames = [f.crop((x0, y0, x1, y1)) for f in frames]
scale = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
if scale != 1.0: frames = [f.resize((int(f.width * scale), int(f.height * scale)), Image.NEAREST) for f in frames]
# one palette for all frames (from a strip of several), no dithering: flat pixel art stays flat
strip = Image.new('RGB', (frames[0].width, frames[0].height * 6))
for i in range(6): strip.paste(frames[i * len(frames) // 6], (0, i * frames[0].height))
pal = strip.quantize(colors=128, method=Image.MEDIANCUT)
q = [f.quantize(palette=pal, dither=Image.NONE) for f in frames]
out = os.path.join(HERE, 'sonaroids.gif')
q[0].save(out, save_all=True, append_images=q[1:], duration=50, loop=0, optimize=True, disposal=1)
print(out, q[0].size, len(q), 'frames', round(os.path.getsize(out) / 1024), 'KB')
