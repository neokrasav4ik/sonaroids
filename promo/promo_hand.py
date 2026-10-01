"""The palm of the promo GIF (v1.03): a right hand drawn by ray marching a smooth distance field (numpy), seen from its back, turned
45° toward the phone's charging end — halfway between the table's way (palm flat, facing down) and the held phone's (edge down, facing
the end). Den's picks: pose «relaxed» with the sleeve's cuff, low knuckles («уменьшить костяшки в основании пальцев»).
Hand frame, cm: X toward the pinky, Y along the fingers, Z out of the back of the hand; the palm faces -Z.
Used by make_promo.py; alone: python3 promo/promo_hand.py '{"pose":"relaxed","out":"hand.png","sleeve":true}' """
import numpy as np, sys, json, math
from PIL import Image

def rx(a):
    c, s = math.cos(a), math.sin(a); return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
def ry(a):
    c, s = math.cos(a), math.sin(a); return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
def rz(a):
    c, s = math.cos(a), math.sin(a); return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
def nrm(v): v = np.asarray(v, float); return v / np.linalg.norm(v)

POSES = {
    # flex per joint (deg) for each finger, splay (deg, + toward the pinky), thumb opening
    'relaxed':  dict(flex=[[8, 14, 8], [7, 12, 8], [8, 14, 9], [10, 16, 10]], splay=[-5, -1, 3, 8], thumb=0.0),
    'open':     dict(flex=[[3, 5, 3], [2, 4, 3], [3, 5, 3], [4, 6, 4]], splay=[-10, -2, 6, 15], thumb=0.5),
    'cupped':   dict(flex=[[18, 26, 14], [16, 24, 14], [18, 26, 15], [20, 28, 16]], splay=[-3, 0, 2, 5], thumb=-0.3),
    'end':      dict(flex=[[8, 14, 8], [7, 12, 8], [8, 14, 9], [10, 16, 10]], splay=[-5, -1, 3, 8], thumb=0.0, thumbL=0.85, thumbR=1.18, frad=1.12),   # at the phone's end: «relaxed», the thumb thicker and a little shorter, the fingers a little thicker
    'hold':     dict(flex=[[0, 88, 80], [0, 88, 80], [0, 88, 80], [2, 12, 8]], splay=[-2, 0, 1, 3], thumb=-0.6, thumbZ=0.35, flen=0.82, frad=1.22),   # holding a phone from below: straight under it, up its far side, onto its top
    'straight': dict(flex=[[2, 3, 2], [1, 2, 2], [2, 3, 2], [3, 4, 3]], splay=[-3, -1, 1, 3], thumb=-0.2),
}

def build(pose, wide=1.0):
    P = POSES[pose]
    segs = []   # (a, b, r1, r2, k, tag, back)
    base = [(x * wide, y) for x, y in [(-2.65, 9.0), (-0.85, 9.45), (0.95, 9.15), (2.6, 8.4)]]   # wide: a broader palm
    fl, fr = P.get('flen', 1.0), P.get('frad', 1.0)   # the fingers shorter / thicker
    lens = [[v * fl for v in q] for q in [[4.0, 2.4, 1.9], [4.5, 2.8, 2.0], [4.2, 2.6, 1.95], [3.3, 1.95, 1.75]]]
    rads = [[v * fr for v in q] for q in [[0.93, 0.85, 0.78, 0.7], [0.96, 0.88, 0.8, 0.72], [0.91, 0.83, 0.76, 0.69], [0.8, 0.73, 0.67, 0.6]]]
    knuck, pip = [], []
    for f in range(4):
        j = np.array([base[f][0], base[f][1], -0.1]); d = rz(-math.radians(P['splay'][f])) @ np.array([0, 1, 0.]); back = np.array([0, 0, 1.])
        knuck.append(j.copy())
        for s in range(3):
            fl = math.radians(P['flex'][f][s]); d, back = d * math.cos(fl) - back * math.sin(fl), back * math.cos(fl) + d * math.sin(fl)
            e = j + d * lens[f][s]
            segs.append((j, e, rads[f][s], rads[f][s + 1], 0.12 if s else 0.75, 'nail' if s == 2 else 'f', back.copy()))
            if s < 2: pip.append(e.copy())
            j = e
    t = P['thumb']; tz = P.get('thumbZ', 0.0)   # thumbZ > 0: the thumb toward the back of the hand (under a phone lying on the palm)
    c0 = np.array([-2.7, 1.8, -0.7]); m1 = np.array([-4.7 - 0.5 * t, 4.4, -1.5 + 0.3 * t + 1.2 * tz])
    d1 = nrm(np.array([-0.35 - 0.3 * t, 1.0, -0.25 + tz])); tl, tr = P.get('thumbL', 1.0), P.get('thumbR', 1.0)   # the thumb shorter / thicker
    p1 = m1 + d1 * 2.9 * tl; d2 = nrm(d1 + np.array([0.12, 0.05, -0.05])); p2 = p1 + d2 * 2.3 * tl
    tb = nrm([-0.75, 0.1, 0.65])
    segs += [(c0, m1, 1.35 * tr, 1.0 * tr, 0.9, 'f', tb), (m1, p1, 1.0 * tr, 0.9 * tr, 0.15, 'f', tb), (p1, p2, 0.9 * tr, 0.78 * tr, 0.12, 'nail', tb)]
    return segs, knuck, pip

def seg_d(p, a, b, r1, r2):
    ba = b - a; pa = p - a; h = np.clip((pa @ ba) / (ba @ ba), 0, 1)
    q = pa - h[:, None] * ba; return np.sqrt((q * q).sum(1)) - (r1 + (r2 - r1) * h), h

def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1); return b * (1 - h) + a * h - k * h * (1 - h)

class Hand:
    def __init__(self, pose, sleeve=False, wide=1.0):
        self.segs, self.knuck, self.pip = build(pose, wide); self.sleeve = sleeve; self.wide = wide
    def palm(self, p):
        q = p * np.array([1.0, 1.0, 1.3])
        d = None
        for kn in self.knuck:
            a = np.array([kn[0] * 0.5 + 0.1, 0.6, -0.2]); b = kn + np.array([0, -0.5, -0.15])
            ds, _ = seg_d(q, a * np.array([1, 1, 1.3]), b * np.array([1, 1, 1.3]), 1.3, 1.1)
            d = ds if d is None else smin(d, ds, 1.8)
        d = d / 1.1
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        yy = np.clip(y / 9.0, 0, 1); hw = (2.1 + 0.55 * yy) * self.wide
        xs = (x - 0.1) * 2.9 / hw; zz = z + 0.45 * (xs / 3.2) ** 2 - 0.05
        q2 = np.stack([np.abs(xs) - 2.6, np.abs(y - 4.5) - 3.0, np.abs(zz) - 0.05], 1)
        box = np.linalg.norm(np.maximum(q2, 0), axis=1) + np.minimum(q2.max(1), 0) - 1.2
        return smin(d, box, 0.9)
    def arm(self, p):
        x, y, z = p[:, 0] - 0.15, p[:, 1], p[:, 2]
        yc = np.clip(y, -30, 0.5); w = 2.15 + 0.08 * np.clip(-yc / 6, 0, 1.5)
        if self.sleeve: w = w + 0.55 * np.clip((-y - 1.9) * 4, 0, 1)
        return np.sqrt((x / 1.35) ** 2 + (y - yc) ** 2 + z ** 2) - w
    def d(self, p, full=False):
        d = smin(self.palm(p), self.arm(p), 1.3)
        d = smin(d, np.linalg.norm(p - np.array([-2.3, 3.0, -1.1]), axis=1) - 1.7, 1.0)          # the thumb's pad
        tag = np.zeros(len(p), int); best = np.full(len(p), 9.0); bh = np.zeros(len(p))
        for i, (a, b, r1, r2, k, t, back) in enumerate(self.segs):
            ds, h = seg_d(p, a, b, r1, r2); d = smin(d, ds, k)
            if full: m = ds < best; best = np.where(m, ds, best); tag = np.where(m, i, tag); bh = np.where(m, h, bh)
        for kn in self.knuck: d = smin(d, np.linalg.norm(p - (kn + np.array([0, -0.4, 0.05])), axis=1) - 0.55, 0.8)   # knuckles: low (Den: «уменьшить костяшки в основании пальцев»)
        for kn in self.knuck:                                                                       # tendons on the back
            ds, _ = seg_d(p, np.array([kn[0] * 0.35 + 0.1, 1.2, 0.55]), kn + np.array([0, -0.7, 0.55]), 0.2, 0.22); d = smin(d, ds, 0.45)
        if full: return d, tag, bh, best
        return d

def render(pose, out, W=520, H=760, ppcm=36.0, handA=45, rigY=-24, rigX=8, extra=None, sleeve=False, skin=(226, 170, 138), cx=-1.0, cy=4.0, dist=45.0, ss=2, fadeL=None, wide=1.0, oblique=None, occ=None):   # occ=(centre, half sizes): a box in the world that hides the hand behind it (the phone on the holding hand)   # oblique=(a, b): the games' own drawing — screen x = X + a·Z, y down = b·Z − Y (Z toward the viewer)   # fadeL: the arm fades out this far (cm) from the wrist, along the arm
    hand = Hand(pose, sleeve, wide)
    R = ry(math.radians(rigY)) @ rx(-math.radians(rigX)) @ ry(math.radians(handA))
    if extra is not None: R = R @ np.asarray(extra, float)
    Rt = R.T
    Wp, Hp = W * ss, H * ss
    xs = (np.arange(Wp) + 0.5 - Wp / 2) / (ppcm * ss) + cx
    ys = -(np.arange(Hp) + 0.5 - Hp / 2) / (ppcm * ss) + cy
    X, Y = np.meshgrid(xs, ys); n = X.size
    if oblique:                                   # parallel rays along the drawing's depth direction
        a_, b_ = oblique; dv = np.array([-a_, b_, 1.0]); dv /= np.linalg.norm(dv); Zf = 25.0
        ro = np.stack([X.ravel() - a_ * Zf, Y.ravel() + b_ * Zf, np.full(n, Zf)], 1); rd = np.tile(-dv, (n, 1)); dist = Zf / dv[2]
    else:
        eye = np.array([cx, cy, dist])
        pix = np.stack([X.ravel(), Y.ravel(), np.zeros(n)], 1)
        rd = pix - eye; rd /= np.linalg.norm(rd, axis=1)[:, None]
        ro = np.tile(eye, (n, 1))
    # into the hand's frame
    rol = ro @ Rt.T; rdl = rd @ Rt.T
    span = 30.0 if oblique else 14.0
    t = np.full(n, dist - span); hit = np.zeros(n, bool); act = np.arange(n)
    if occ is not None: oc, oh = np.asarray(occ[0], float), np.asarray(occ[1], float)
    def occd(p):
        q = np.abs(p @ R.T - oc) - oh; return np.linalg.norm(np.maximum(q, 0), axis=1) + np.minimum(q.max(1), 0)
    for it in range(220 if oblique else 140):
        p = rol[act] + rdl[act] * t[act][:, None]; dd = hand.d(p)
        if occ is not None:
            do = occd(p); blocked = do < 0.004
            act = act[~blocked]; p = p[~blocked]; dd = dd[~blocked]; dd = np.minimum(dd, do[~blocked])
        t[act] += dd * 0.9
        done = dd < 0.004; hit[act[done]] = True
        act = act[~done & (t[act] < dist + span)]
        if len(act) == 0: break
    idx = np.where(hit)[0]
    p = rol[idx] + rdl[idx] * t[idx][:, None]
    e = 0.003; ex = np.array([e, 0, 0]); ey = np.array([0, e, 0]); ez = np.array([0, 0, e])
    nl = np.stack([hand.d(p + ex) - hand.d(p - ex), hand.d(p + ey) - hand.d(p - ey), hand.d(p + ez) - hand.d(p - ez)], 1)
    nl /= np.linalg.norm(nl, axis=1)[:, None]
    _, tag, bh, _ = hand.d(p, True)
    # lights in the world, taken into the hand's frame
    Lw = [(nrm([-0.55, 0.7, 0.45]), np.array([1.0, 0.96, 0.9]), 1.15),     # key: upper left, front
          (nrm([0.8, -0.1, 0.45]), np.array([0.75, 0.8, 1.0]), 0.28),      # fill: right
          (nrm([-0.85, 0.1, -0.5]), np.array([0.5, 0.95, 0.85]), 0.55)]    # rim: the sonar's teal, from behind the phone side
    base = np.array(skin) / 255.0
    col = np.zeros((len(idx), 3))
    # ambient occlusion
    ao = np.ones(len(idx))
    for k in range(1, 6):
        h = 0.18 * k; ao -= (h - hand.d(p + nl * h)) * (0.5 ** k) * 1.6
    ao = np.clip(ao, 0.25, 1)
    # the key light's soft shadow
    L0 = Rt @ Lw[0][0]; sh = np.ones(len(idx)); tt = np.full(len(idx), 0.06)
    for it in range(28):
        dd = hand.d(p + L0 * tt[:, None]); sh = np.minimum(sh, 8 * dd / tt); tt += np.clip(dd, 0.05, 0.6)
    sh = np.clip(sh, 0.15, 1)
    # nails
    nail = np.zeros(len(idx))
    for i, s in enumerate(hand.segs):
        if s[5] != 'nail': continue
        m = tag == i
        bk = s[6]; nd = nl[m] @ bk
        nail[m] = np.clip((nd - 0.62) * 6, 0, 1) * np.clip((bh[m] - 0.38) * 7, 0, 1) * np.clip((0.97 - bh[m]) * 12, 0, 1) * 0.85
    # redder knuckles and joints
    red = np.zeros(len(idx))
    for kn in hand.pip:
        red += np.exp(-((p - kn) ** 2).sum(1) / 0.55) * np.clip(nl[:, 2], 0, 1)
    red = np.clip(red, 0, 1)
    alb = base[None, :] * (1 - 0.13 * red[:, None]) + np.array([0.9, 0.35, 0.35])[None, :] * 0.13 * red[:, None]
    alb = alb * (1 - nail[:, None]) + np.array([0.93, 0.74, 0.7])[None, :] * nail[:, None]
    V = -rdl[idx]
    for j, (Ld, lc, li) in enumerate(Lw):
        L = Rt @ Ld; ndl = nl @ L
        wrap = np.clip((ndl + 0.2) / 1.2, 0, 1) ** 1.3
        sss = np.clip(1 - np.abs(ndl) * 2.2, 0, 1) * 0.22          # a warm band along the terminator
        s = sh if j == 0 else np.ones(len(idx))
        if j == 2: wrap = np.clip(ndl, 0, 1) ** 1.5 * np.clip(1 - (nl * V).sum(1), 0, 1) ** 1.2 * 2.0; sss = 0
        col += li * s[:, None] * (alb * wrap[:, None] + np.array([0.9, 0.3, 0.2])[None, :] * sss[:, None]) * lc[None, :] if j < 2 else li * wrap[:, None] * lc[None, :]
        if j == 0:
            Hh = L + V; Hh /= np.linalg.norm(Hh, axis=1)[:, None]
            spec = np.clip((nl * Hh).sum(1), 0, 1) ** (18 + 40 * nail) * (0.08 + 0.2 * nail) * s
            col += spec[:, None] * lc[None, :]
    col += alb * np.array([0.2, 0.16, 0.22])[None, :] * ao[:, None]      # ambient (the night's purple)
    col *= (0.55 + 0.45 * ao)[:, None]
    # the arm fades out toward the bottom
    img = np.zeros((n, 4))
    img[idx, :3] = np.clip(col, 0, 1) ** (1 / 1.08)
    a = np.ones(len(idx))
    if sleeve:
        sl = p[:, 1] < -1.75
        img[idx[sl], :3] = (np.array([0.17, 0.42, 0.40]) * (0.35 + 0.8 * np.clip(nl[sl] @ (Rt @ Lw[0][0]), 0, 1)[:, None] * sh[sl, None]) * (0.5 + 0.5 * ao[sl, None]))
    wy = (p @ R.T)[:, 1]
    if not sleeve and not fadeL: a *= np.clip((wy - (cy - H / 2 / ppcm)) / 5.0, 0, 1)
    if fadeL: a *= np.clip((p[:, 1] + fadeL) / 3.0, 0, 1)
    img[idx, 3] = a
    im = (img.reshape(Hp, Wp, 4) * 255).astype(np.uint8)
    Image.fromarray(im, 'RGBA').resize((W, H), Image.LANCZOS).save(out)

if __name__ == '__main__':
    a = json.loads(sys.argv[1]); render(**a)
