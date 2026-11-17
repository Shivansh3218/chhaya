"""Turn raw generated images (art-src/raw) into game-ready art (public/art/gen).

Usage:  python -I scripts/art/process.py [name ...]      (no names = every recipe)
Needs Pillow and NumPy (pip install pillow numpy).

Recipes:
  sil    silhouette prop/character: the white background becomes transparent, the shape becomes ink with a
         faint trace of its original detail, fitted into a box (keeping aspect) and anchored bottom-centre.
  layer  silhouette background layer: luminance -> alpha, tinted to the layer colour, made to tile
         horizontally (cross-fade), blurred for depth of field, placed on a canvas of the layer's size.
  sky    full-frame painted sky: cropped to 16:9, resized, partly desaturated and darkened.
"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter

RAW = 'art-src/raw'
OUT = 'public/art/gen'

def load(name):
    for ext in ('.png', '.webp', '.jpg'):
        p = os.path.join(RAW, name + ext)
        if os.path.exists(p):
            return Image.open(p).convert('RGB')
    raise FileNotFoundError(name)

def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)

def lum(a):
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114

def sil(name, out, box, ink='#07080a', detail=0.10, soft=(232, 252), crop=None, pad=0.0, flip=False, anchor='bottom'):
    im = load(name)
    if crop:  # fractions (l, t, r, b)
        w, h = im.size
        im = im.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)))
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    a = np.asarray(im).astype(np.float32)
    L = lum(a)
    lo, hi = soft
    alpha = np.clip((hi - L) / (hi - lo), 0, 1)
    # only the background connected to the border should vanish; keep light areas inside the shape opaque
    from collections import deque
    bg = L > lo
    seen = np.zeros_like(bg)
    H, W = bg.shape
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if bg[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if bg[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and bg[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    # pixels not reachable from the border are inside: opaque. Large enclosed white holes (> 2% of area) stay holes.
    inside = ~seen
    alpha = np.where(inside, 1.0, alpha)
    # holes: enclosed bright regions bigger than a threshold become transparent again (e.g. the millstone's eye)
    hole = inside & (L > hi - 4)
    if hole.sum() > 0.004 * H * W:
        alpha = np.where(hole, 0.0, alpha)
    base = hexrgb(ink)
    rgb = base[None, None, :] + (L[..., None] / 255.0) * detail * 255.0
    rgba = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
    img = Image.fromarray(rgba, 'RGBA')
    bb = img.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    img = img.crop(bb)
    bw, bh = box
    iw, ih = bw * (1 - pad), bh * (1 - pad)
    s = min(iw / img.width, ih / img.height)
    img = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)
    canvas = Image.new('RGBA', (bw, bh), (0, 0, 0, 0))
    x = (bw - img.width) // 2
    y = bh - img.height if anchor == 'bottom' else (bh - img.height) // 2
    canvas.paste(img, (x, y), img)
    canvas.save(os.path.join(OUT, out + '.png'))
    return canvas

def tile_x(img, overlap):
    a = np.asarray(img).astype(np.float32)
    W = a.shape[1]
    n = W - overlap
    out = a[:, :n].copy()
    t = np.linspace(0, 1, overlap, dtype=np.float32)[None, :, None]
    out[:, :overlap] = a[:, n:n + overlap] * (1 - t) + a[:, :overlap] * t
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), img.mode)

def layer(name, out, size, color, top, height, blur=0.0, soft=(60, 245), overlap=0.18, alpha_mul=1.0, crop=None, fill_below=True, fade_top=0):
    """`top`/`height`: where the scaled image sits on the size[1]-tall canvas; below it is filled solid"""
    im = load(name)
    if crop:
        w, h = im.size
        im = im.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)))
    a = np.asarray(im).astype(np.float32)
    L = lum(a)
    lo, hi = soft
    alpha = np.clip((hi - L) / (hi - lo), 0, 1) * alpha_mul
    if fade_top:  # canopies dissolve upward into the haze instead of ending on a line
        n = int(alpha.shape[0] * fade_top)
        alpha[:n] *= (np.linspace(0, 1, n) ** 1.6)[:, None]
    col = hexrgb(color)
    rgba = np.dstack([np.broadcast_to(col, a.shape).copy(), alpha * 255]).astype(np.uint8)
    img = Image.fromarray(rgba, 'RGBA')
    img = tile_x(img, int(img.width * overlap))
    W, Hh = size
    img = img.resize((W, height), Image.LANCZOS)
    canvas = Image.new('RGBA', (W, Hh), (0, 0, 0, 0))
    canvas.paste(img, (0, top))
    if fill_below and top + height < Hh:
        solid = Image.new('RGBA', (W, Hh - top - height), tuple(int(c) for c in col) + (int(255 * alpha_mul),))
        canvas.paste(solid, (0, top + height))
    if blur > 0:
        # blur with wrap-around so it still tiles
        pad = int(blur * 4) + 2
        a = np.asarray(canvas)
        wrapped = np.concatenate([a[:, -pad:], a, a[:, :pad]], axis=1)
        # premultiply to avoid dark fringes
        f = wrapped.astype(np.float32)
        f[..., :3] *= f[..., 3:4] / 255
        b = Image.fromarray(np.clip(f, 0, 255).astype(np.uint8), 'RGBA').filter(ImageFilter.GaussianBlur(blur))
        f = np.asarray(b).astype(np.float32)
        al = np.maximum(f[..., 3:4], 1)
        f[..., :3] = np.clip(f[..., :3] * 255 / al, 0, 255)
        canvas = Image.fromarray(f[:, pad:-pad].astype(np.uint8), 'RGBA')
    canvas.save(os.path.join(OUT, out + '.png'))
    return canvas

def sky(name, out, size=(1280, 720), sat=0.45, gain=0.8, gamma=1.1, crop=None):
    im = load(name)
    if crop:
        w, h = im.size
        im = im.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)))
    w, h = im.size
    tw = h * size[0] / size[1]
    if tw <= w:
        x0 = (w - tw) / 2
        im = im.crop((int(x0), 0, int(x0 + tw), h))
    else:
        th = w * size[1] / size[0]
        im = im.crop((0, 0, w, int(th)))
    im = im.resize(size, Image.LANCZOS)
    a = np.asarray(im).astype(np.float32) / 255
    L = lum(a)[..., None]
    a = L + (a - L) * sat
    a = np.clip(a * gain, 0, 1) ** gamma
    Image.fromarray((a * 255).astype(np.uint8), 'RGB').filter(ImageFilter.GaussianBlur(1.2)).save(os.path.join(OUT, out + '.png'))

def hanging_roots(name, out, size=(1024, 240), seed=7):
    """the top foreground: a fringe of banyan canopy (from the image) with curtains of aerial roots hanging from it"""
    from PIL import ImageDraw
    W, H = size
    rnd = np.random.default_rng(seed)
    big = Image.new('L', (W * 2, H * 2), 0)
    d = ImageDraw.Draw(big)
    # curtains: clumps of strands, a few long and thick, many thin
    x = 0.0
    while x < W * 2:
        clump = rnd.integers(3, 12)
        cx = x
        for _ in range(clump):
            sx = cx + rnd.normal(0, 14)
            length = rnd.uniform(0.25, 1.0) ** 0.7 * H * 2 * rnd.uniform(0.55, 1.0)
            w0 = rnd.uniform(1.5, 7.0)
            sway = rnd.normal(0, 10)
            pts = [(sx + sway * (t ** 2) + np.sin(t * 6 + sx) * 2, t * length) for t in np.linspace(0, 1, 24)]
            for i in range(len(pts) - 1):
                wv = max(1, int(w0 * (1 - i / len(pts)) + 1))
                d.line([pts[i], pts[i + 1]], fill=255, width=wv)
            if rnd.random() < 0.35:  # a root tip with a few fibres
                ex, ey = pts[-1]
                for k in range(3):
                    d.line([(ex, ey), (ex + rnd.normal(0, 6), ey + rnd.uniform(6, 18))], fill=255, width=1)
        x += rnd.uniform(60, 220)
    strands = np.asarray(big.resize((W, H), Image.LANCZOS)).astype(np.float32) / 255
    # the canopy fringe along the top, from the generated image
    im = load(name)
    w, h = im.size
    canopy = im.crop((0, 0, w, int(h * 0.22))).resize((W, int(H * 0.45)), Image.LANCZOS)
    cl = lum(np.asarray(canopy).astype(np.float32))
    ca = np.clip((235 - cl) / 200, 0, 1)
    ca *= np.linspace(1, 0, ca.shape[0])[:, None] ** 0.8
    alpha = strands.copy()
    alpha[:ca.shape[0]] = np.maximum(alpha[:ca.shape[0]], ca)
    img = Image.fromarray(np.dstack([np.full((H, W, 3), 2, np.float32), alpha * 255]).astype(np.uint8), 'RGBA')
    img = tile_x(img, int(W * 0.15)).resize((W, H), Image.LANCZOS)
    img = img.filter(ImageFilter.GaussianBlur(2.2))
    img.save(os.path.join(OUT, out + '.png'))

def cutout(name, out, box, color='#07080a', soft=(40, 240), crop=None, blur=0.0, flip=False, fade_left=0.0):
    """a single object kept with its soft luminance edges (fog stays see-through), fitted bottom-centre"""
    im = load(name)
    if crop:
        w, h = im.size
        im = im.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)))
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    a = np.asarray(im).astype(np.float32)
    L = lum(a)
    alpha = np.clip((soft[1] - L) / (soft[1] - soft[0]), 0, 1)
    if fade_left:  # a branch whose thick end dissolves into the haze instead of ending in a cut
        n = int(alpha.shape[1] * fade_left)
        alpha[:, :n] *= (np.linspace(0, 1, n) ** 1.3)[None, :]
    col = hexrgb(color)
    img = Image.fromarray(np.dstack([np.broadcast_to(col, a.shape).copy(), alpha * 255]).astype(np.uint8), 'RGBA')
    bw, bh = box
    sc = min(bw / img.width, bh / img.height)
    img = img.resize((round(img.width * sc), round(img.height * sc)), Image.LANCZOS)
    if blur:
        img = img.filter(ImageFilter.GaussianBlur(blur))
    canvas = Image.new('RGBA', box, (0, 0, 0, 0))
    canvas.paste(img, ((bw - img.width) // 2, bh - img.height), img)
    canvas.save(os.path.join(OUT, out + '.png'))

RECIPES = {
    # the banyan forest (TAAFT, second batch): misty scenes whose fog becomes see-through
    'trees_mid': lambda: layer('banyan_far', 'trees_mid', (1024, 720), '#15191c', 60, 660, blur=0.8, soft=(30, 238), crop=(0.08, 0, 0.92, 0.9), fill_below=False, fade_top=0.3),
    'trees_far': lambda: layer('banyan_mist', 'trees_far', (1024, 720), '#2a3034', 130, 580, blur=2.5, soft=(50, 240), alpha_mul=0.8, crop=(0, 0, 1, 0.88), fill_below=False, fade_top=0.35),
    'trees_far2': lambda: layer('banyan_far2', 'trees_far2', (1024, 720), '#454d53', 190, 510, blur=5, soft=(60, 242), alpha_mul=0.55, crop=(0, 0, 1, 0.85), fill_below=False, fade_top=0.4),
    'trees_mid2': lambda: layer('banyan_mid2', 'trees_mid2', (1024, 720), '#15191c', 60, 660, blur=0.8, soft=(30, 238), crop=(0.04, 0, 0.96, 0.92), fill_below=False, fade_top=0.3),
    'bough': lambda: cutout('bough2', 'bough', (1040, 400), color='#07080a', soft=(60, 225), crop=(0, 0.05, 0.98, 0.98), fade_left=0.3),
    'fields_mid': lambda: layer('fields_mid', 'fields_mid', (1024, 720), '#1f2427', 190, 500, blur=1.4, soft=(70, 225), crop=(0, 0.22, 1, 0.8), fill_below=True, fade_top=0.25),
    'fg_roots': lambda: hanging_roots('banyan_roots', 'fg_roots'),
    'banyan_fg': lambda: cutout('banyan_trunk', 'banyan_fg', (520, 1400), soft=(90, 185), crop=(0.0, 0.03, 0.56, 0.9), blur=7),
    'banyan_near': lambda: cutout('banyan_trunk', 'banyan_near', (520, 1400), soft=(90, 180), crop=(0.0, 0.03, 0.56, 0.9)),

    # the girl's torso (template 48x70, anchored at the hip = bottom centre)
    'g_torso': lambda: sil('g_torso', 'g_torso', (48, 70), detail=0.0, pad=0.0),
    'post_lamp': lambda: sil('post_lamp', 'post_lamp', (48, 120), detail=0.05),
    # the cart: the bed and rails only (the wheels are separate sprites)
    'cart_body': lambda: sil('cart_body', 'cart_body', (160, 80), crop=(0.0, 0.0, 1.0, 0.70), detail=0.10, anchor='bottom'),
    'crate': lambda: sil('crate', 'crate', (128, 128), detail=0.16, soft=(236, 252)),
    'log': lambda: sil('log', 'log', (660, 110), detail=0.14),
    'millstone': lambda: sil('millstone', 'millstone', (256, 256), detail=0.16, soft=(185, 252), anchor='center', crop=(0, 0, 1, 0.93)),
    'gear': lambda: sil('gear', 'gear', (256, 256), detail=0.16, anchor='center'),
    'walllamp': lambda: sil('walllamp', 'walllamp', (64, 64), detail=0.06, anchor='center'),
    # skies
    'sky2': lambda: sky('sky2', 'sky2', sat=0.35, gain=0.85),
    'sky3': lambda: sky('sky3', 'sky3', sat=0.5, gain=0.85),
    # stepwell layers
    'arch_far': lambda: layer('arch_far', 'arch_far', (1024, 720), '#434a50', 150, 600, blur=3, crop=(0, 0.25, 1, 1)),
    'arch_mid': lambda: layer('arch_mid', 'arch_mid', (1024, 720), '#24282c', 230, 470, blur=1.2, crop=(0, 0.08, 1, 0.92)),
    'fg_rubble': lambda: layer('fg_rubble', 'fg_rubble', (1024, 220), '#020203', 20, 200, blur=4, crop=(0, 0.45, 1, 1)),
    # mill layers
    'hills_far': lambda: layer('hills_far', 'hills_far', (1024, 720), '#6a5c55', 380, 340, blur=5, crop=(0, 0.45, 1, 1)),
    'fields_far': lambda: layer('fields_far', 'fields_far', (1024, 720), '#4a403c', 380, 340, blur=2.5, crop=(0, 0.3, 1, 1)),
    'mill_mid': lambda: layer('mill_mid', 'mill_mid', (1024, 720), '#2d2724', 300, 420, blur=1.2, crop=(0, 0.25, 1, 1)),
    'fg_reeds': lambda: layer('fg_reeds', 'fg_reeds', (1024, 220), '#020203', 0, 220, blur=4, crop=(0, 0.35, 1, 1)),
}

if __name__ == '__main__':
    names = sys.argv[1:] or list(RECIPES)
    os.makedirs(OUT, exist_ok=True)
    for n in names:
        RECIPES[n]()
        print('ok', n)
