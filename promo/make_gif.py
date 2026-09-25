"""Packs promo/frames/*.png (from make_gif.js) into promo/sonaroids.gif: the whole 16:9 frame, one shared palette, looping forever.
Run: python3 promo/make_gif.py [scale]   — scale < 1 makes a smaller file (nearest-neighbour, keeps the pixels crisp)."""
import glob, os, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
files = sorted(glob.glob(os.path.join(HERE, 'frames', '*.png')))
frames = [Image.open(f).convert('RGB') for f in files]
# no crop: the frame is already 16:9, and the site name sits in the sky at the top (an auto-crop by motion would cut it off)
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
