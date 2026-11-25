"""Genera le texture della Salle Entrepose (Prédateurs de Vierzon) in assets/textures/vierzon/.
Uso (dalla cartella del progetto): python tools/generate_vierzon_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/vierzon.jpg e le foto della sala, un vecchio capannone industriale: pareti in mattoni
a vista imbiancati e consumati, con le colature e lo sporco in basso; lungo le pareti grandi murales in stile
graffiti (pupazzi colorati con gli occhioni, uccellini, mostri, lingue di fuoco, lettere a bolla gialle, fumetti);
pilastri e travi reticolari in acciaio; copertura in lamiera grigio scuro; pista a piastrelle grigio chiaro con le
righe rosse e le aree di porta arancio-rosse; balaustre bianche col piede giallo e il bordo blu.
I murales sono disegnati da zero (personaggi originali, non copiati da quelli veri).
Nei cartelloni solo club, città e territorio: niente marchi commerciali.
"""
import sys, os, random, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish, font

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'vierzon')
os.makedirs(OUT, exist_ok=True)
random.seed(16000)
np.random.seed(16000)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'vierzon.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
RED, BLACK, WHITE, NAVY, YELLOW = (214, 30, 42), (20, 20, 22), (255, 255, 255), (28, 52, 120), (240, 200, 40)
INK = (18, 16, 20)


def save(img, name, quality=88):
    path = os.path.join(OUT, name)
    if name.endswith('.png'):
        img.save(path, optimize=True)
    else:
        img.convert('RGB').save(path, quality=quality, optimize=True, progressive=True)
    print('  ', name, img.size, os.path.getsize(path) // 1024, 'KB')


def resized_noise(h, w, beta, H, W):
    n = fft_noise(h, w, beta=beta)
    return np.asarray(Image.fromarray((n * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(np.float32) / 255


# ================================================================== 1. PISTA a piastrelle grigio chiaro
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
n1 = resized_noise(512, 256, 2.0, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([198, 202, 206], np.float32)
col += ((n1 - 0.5) * 10)[..., None]
TILE = 0.3048
ix = (np.arange(W) / S / TILE).astype(int)
iz = (np.arange(H) / S / TILE).astype(int)
rng = np.random.default_rng(9)
col += rng.normal(0, 2.5, (iz.max() + 1, ix.max() + 1)).astype(np.float32)[iz[:, None], ix[None, :]][..., None]
gx = ((np.arange(W) / S) % TILE) < (1.2 / S)
gz = ((np.arange(H) / S) % TILE) < (1.2 / S)
groove = gz[:, None] | gx[None, :]
col[groove] *= 0.92

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'orange')}
draws = {k: ImageDraw.Draw(m) for k, m in masks.items()}
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)
px = lambda m: max(1, int(m * S * SS))


def rect(k, x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    draws[k].rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def ring(k, x, z, r, wdt):
    c = P(x, z); R = r * S * SS
    draws[k].ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], outline=255, width=px(wdt))


rect('orange', -RW / 2, -0.15, RW / 2, 0.15)          # riga centrale larga arancio-rossa
ring('red', 0, 0, 4.5, 0.06)
rect('red', -0.2, -0.2, 0.2, 0.2)
for s in (-1, 1):
    rect('red', -RW / 2 + 1.4, s * 31 - 0.04, RW / 2 - 1.4, s * 31 + 0.04)
    rect('orange', -1.8, s * 31, 1.8, s * 28.8)       # area di porta piena
    for x in (-8.5, 8.5):
        ring('red', x, s * 21, 4.5, 0.06)
        rect('orange', x - 0.35, s * 21 - 0.2, x + 0.35, s * 21 + 0.2)
        rect('red', x - 0.2, s * 8 - 0.2, x + 0.2, s * 8 + 0.2)
cols = {'red': (212, 58, 50), 'orange': (230, 86, 52)}
for k, a in (('red', 0.9), ('orange', 0.94)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(cols[k], np.float32) * m * a
img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(2200):                                 # segni delle ruote
    cx, cy = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(30, 260); a0 = random.uniform(0, 360)
    sd.arc([cx - ln, cy - ln, cx + ln, cy + ln], a0, a0 + random.uniform(10, 50), fill=(60, 60, 70, random.randint(10, 24)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img, 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.15 + (~groove) * 0.25, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE bianche, piede giallo, bordo blu
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([240, 240, 236], np.float32)
    arr += ((n - 0.5) * 8)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.rectangle([x - 3, 0, x + 3, h], fill=(206, 206, 200, 255))
    d.rectangle([0, 0, w, 14], fill=(30, 52, 120, 255))          # bordo blu in cima
    d.rectangle([0, h - 40, w, h], fill=(238, 206, 40, 255))     # piede giallo
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 26, int((xm + wm) * pxm), h - 48)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(380):
        x, y = random.uniform(0, w), random.uniform(h * 0.35, h - 8)
        r = random.uniform(3, 9)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 44, random.randint(20, 60)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def logo_panel(img, x0, y0, x1, y1):
    paste_fit(img, LOGO, (x0 + 6, y0 + 2, x1 - 6, y1 - 2))


def text_panel(t, bg, fg, fnt='arialbd.ttf', sub=None, subcol=None):
    def f(img, x0, y0, x1, y1):
        ImageDraw.Draw(img).rectangle([x0, y0, x1, y1], fill=bg + (255,), outline=(170, 170, 170, 255), width=3)
        if sub:
            mid = y0 + (y1 - y0) * 0.62
            paste_fit(img, text_layer(t, fnt, fg, spacing=4), (x0 + 24, y0 + 10, x1 - 24, int(mid)))
            paste_fit(img, text_layer(sub, 'arial.ttf', subcol or fg, spacing=3), (x0 + 24, int(mid) + 4, x1 - 24, y1 - 8))
        else:
            paste_fit(img, text_layer(t, fnt, fg, spacing=4), (x0 + 24, y0 + 14, x1 - 24, y1 - 14))
    return f


def club_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=RED + (255,))
    d.rectangle([x0, y1 - 10, x1, y1], fill=BLACK + (255,))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 8, y0 + 2, x0 + int(h * 0.95), y1 - 12))
    paste_fit(img, text_layer('PRÉDATEURS', 'ariblk.ttf', WHITE), (x0 + h + 16, y0 + 8, x1 - 20, y0 + h // 2 + 2), 'left')
    paste_fit(img, text_layer('ROLLER HOCKEY • VIERZON', 'arialbd.ttf', WHITE, spacing=3), (x0 + h + 16, y0 + h // 2 + 8, x1 - 20, y1 - 18), 'left')


save(board_strip(panels=[(1.0, 2.0, logo_panel), (4.0, 4.4, text_panel('VIERZON', WHITE, RED, 'ariblk.ttf')), (12.0, 5.2, text_panel('CHER', NAVY, WHITE, 'arialbd.ttf', 'LE DÉPARTEMENT 18', (210, 220, 240)))]), 'boards_a.jpg')
save(board_strip(panels=[(1.5, 5.4, text_panel('Centre-Val de Loire', WHITE, NAVY, 'arialbi.ttf', 'LA RÉGION', (90, 90, 96))), (10.5, 2.0, logo_panel), (13.5, 4.4, text_panel('PRÉDATEURS', BLACK, RED, 'ariblk.ttf'))]), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 6.0, club_panel), (11.5, 4.4, text_panel('VIERZON', WHITE, RED, 'ariblk.ttf'))]), 'boards_center.jpg')
save(board_strip(1024, 256, panels=[(6.5, 3.6, logo_panel)]), 'boards_corner.jpg')

# ================================================================== 3. MATTONI A VISTA imbiancati e consumati
print('mattoni')
BW = 1024                    # texture 4 x 4 m
PXM = BW / 4.0
BRICK_L, BRICK_H, JOINT = 0.22, 0.075, 0.012


def brick_wall(size=BW, seed=0, grime=True):
    r = random.Random(seed)
    base = np.zeros((size, size, 3), np.float32)
    mortar = np.array([150, 146, 138], np.float32)
    base[:] = mortar
    im = to_img(base)
    d = ImageDraw.Draw(im)
    rows = int(4.0 / BRICK_H)
    # chiazze dove l'imbiancatura è venuta via (mattoni rosso-bruni o giallastri)
    patch = resized_noise(32, 32, 2.0, size, size)
    for rr in range(rows + 1):
        y0 = rr * BRICK_H * PXM
        off = (BRICK_L / 2 if rr % 2 else 0) * PXM
        x = -off
        while x < size:
            x1 = x + (BRICK_L - JOINT) * PXM
            cyi = int(min(size - 1, max(0, y0 + 2)))
            cxi = int(min(size - 1, max(0, x + 4)))
            bare = patch[cyi, cxi] > 0.72 or r.random() < 0.03
            if bare:
                c = r.choice([(150, 92, 70), (168, 110, 80), (186, 150, 104), (140, 96, 78)])
            else:
                g = r.randint(172, 202)
                c = (g, g - r.randint(2, 8), g - r.randint(8, 18))
            v = r.randint(-10, 10)
            d.rectangle([x, y0, x1, y0 + (BRICK_H - JOINT) * PXM], fill=tuple(max(0, min(255, cc + v)) for cc in c))
            x += BRICK_L * PXM
    arr = np.asarray(im).astype(np.float32)
    arr += ((fft_noise(size, size, beta=1.4) - 0.5) * 18)[..., None]        # grana
    arr *= (0.9 + 0.1 * resized_noise(32, 32, 2.2, size, size))[..., None]  # macchie
    if grime:
        # colature verticali e sporco più scuro verso il basso
        streak = resized_noise(4, 256, 1.6, size, size)
        arr *= (0.9 + 0.12 * streak)[..., None]
        yy = np.linspace(0, 1, size)[:, None]
        arr *= (1 - 0.16 * np.clip((yy - 0.7) / 0.3, 0, 1))[..., None]
    return to_img(arr)


save(brick_wall(seed=1).filter(ImageFilter.GaussianBlur(0.4)), 'brick.jpg')
hm = np.asarray(brick_wall(seed=1, grime=False).convert('L')).astype(np.float32) / 255
save(normal_from_height(hm * 0.6, 2.0), 'brick_normal.jpg', quality=85)

# ================================================================== 4. MURALES in stile graffiti
print('murales')
MW, MH = 2048, 384        # un pannello = 16 x 3 m


def outline_ellipse(d, box, fill, w=7):
    d.ellipse(box, fill=fill, outline=INK, width=w)


def eyes(d, cx, cy, r, gap, look=(0, 0), lid=None):
    for sx in (-1, 1):
        ex = cx + sx * gap
        d.ellipse([ex - r, cy - r * 1.15, ex + r, cy + r * 1.15], fill=WHITE, outline=INK, width=5)
        pr = r * 0.45
        d.ellipse([ex - pr + look[0], cy - pr + look[1], ex + pr + look[0], cy + pr + look[1]], fill=INK)
        d.ellipse([ex - pr * 0.35 + look[0] - 3, cy - pr * 0.35 + look[1] - 3, ex + look[0] - 2, cy + look[1] - 2], fill=WHITE)
        if lid:
            d.chord([ex - r, cy - r * 1.15, ex + r, cy + r * 1.15], 180, 360, fill=lid, outline=INK, width=5)


def mouth(d, cx, cy, w, h, teeth=True):
    d.chord([cx - w, cy - h, cx + w, cy + h], 0, 180, fill=(120, 20, 30), outline=INK, width=5)
    if teeth:
        n = max(2, int(w / 12))
        for k in range(n):
            tx = cx - w * 0.8 + k * (1.6 * w / n)
            d.polygon([(tx, cy + 2), (tx + 1.6 * w / n * 0.8, cy + 2), (tx + 0.8 * w / n, cy + h * 0.45)], fill=WHITE, outline=INK)


def creature(d, cx, cy, s, colr, kind=0, r=random):
    """Pupazzo da graffito: corpo tondeggiante col contorno nero, pancia chiara, occhioni, bocca coi denti."""
    belly = tuple(min(255, c + 60) for c in colr)
    if kind == 0:      # mostro a pera con le corna
        d.polygon([(cx - 0.55 * s, cy - 0.6 * s), (cx - 0.75 * s, cy - 1.05 * s), (cx - 0.3 * s, cy - 0.75 * s)], fill=(250, 240, 220), outline=INK, width=4)
        d.polygon([(cx + 0.55 * s, cy - 0.6 * s), (cx + 0.75 * s, cy - 1.05 * s), (cx + 0.3 * s, cy - 0.75 * s)], fill=(250, 240, 220), outline=INK, width=4)
        outline_ellipse(d, [cx - 0.8 * s, cy - 0.85 * s, cx + 0.8 * s, cy + 0.9 * s], colr)
        outline_ellipse(d, [cx - 0.45 * s, cy + 0.05 * s, cx + 0.45 * s, cy + 0.8 * s], belly, 4)
        eyes(d, cx, cy - 0.35 * s, 0.17 * s, 0.22 * s, (r.randint(-4, 4), r.randint(-3, 3)))
        mouth(d, cx, cy - 0.02 * s, 0.32 * s, 0.22 * s)
    elif kind == 1:    # uccellino tondo col becco
        outline_ellipse(d, [cx - 0.6 * s, cy - 0.6 * s, cx + 0.6 * s, cy + 0.6 * s], colr)
        d.polygon([(cx - 0.1 * s, cy + 0.02 * s), (cx + 0.1 * s, cy + 0.02 * s), (cx, cy + 0.28 * s)], fill=(246, 150, 30), outline=INK, width=4)
        eyes(d, cx, cy - 0.18 * s, 0.13 * s, 0.17 * s, (2, 2))
        d.polygon([(cx - 0.05 * s, cy - 0.6 * s), (cx + 0.12 * s, cy - 0.85 * s), (cx + 0.15 * s, cy - 0.55 * s)], fill=colr, outline=INK, width=4)
        outline_ellipse(d, [cx + 0.45 * s, cy - 0.05 * s, cx + 0.8 * s, cy + 0.25 * s], colr, 4)   # ala
    elif kind == 2:    # testa quadrata col cappellino e gli occhiali
        d.rounded_rectangle([cx - 0.6 * s, cy - 0.7 * s, cx + 0.6 * s, cy + 0.6 * s], radius=int(0.2 * s), fill=colr, outline=INK, width=7)
        d.chord([cx - 0.62 * s, cy - 1.0 * s, cx + 0.62 * s, cy - 0.4 * s], 180, 360, fill=(40, 60, 140), outline=INK, width=5)
        d.rectangle([cx - 0.1 * s, cy - 0.72 * s, cx + 0.85 * s, cy - 0.62 * s], fill=(40, 60, 140), outline=INK, width=4)
        for sx in (-1, 1):
            d.rounded_rectangle([cx + sx * 0.32 * s - 0.2 * s, cy - 0.38 * s, cx + sx * 0.32 * s + 0.2 * s, cy - 0.15 * s], radius=8, fill=INK)
        d.line([(cx - 0.12 * s, cy - 0.27 * s), (cx + 0.12 * s, cy - 0.27 * s)], fill=INK, width=5)
        mouth(d, cx + 0.05 * s, cy + 0.15 * s, 0.3 * s, 0.2 * s)
    elif kind == 3:    # gatto/volpe con le orecchie a punta e il ghigno
        for sx in (-1, 1):
            d.polygon([(cx + sx * 0.25 * s, cy - 0.55 * s), (cx + sx * 0.65 * s, cy - 1.05 * s), (cx + sx * 0.7 * s, cy - 0.35 * s)], fill=colr, outline=INK, width=5)
        outline_ellipse(d, [cx - 0.72 * s, cy - 0.7 * s, cx + 0.72 * s, cy + 0.6 * s], colr)
        eyes(d, cx, cy - 0.25 * s, 0.15 * s, 0.25 * s, (3, 0), lid=colr)
        d.arc([cx - 0.35 * s, cy - 0.1 * s, cx + 0.35 * s, cy + 0.35 * s], 10, 170, fill=INK, width=6)
        for k in range(5):
            tx = cx - 0.25 * s + k * 0.12 * s
            d.polygon([(tx, cy + 0.27 * s), (tx + 0.1 * s, cy + 0.27 * s), (tx + 0.05 * s, cy + 0.17 * s)], fill=WHITE, outline=INK)
    else:              # fantasmino/blob con la lingua
        d.rounded_rectangle([cx - 0.55 * s, cy - 0.8 * s, cx + 0.55 * s, cy + 0.7 * s], radius=int(0.5 * s), fill=colr, outline=INK, width=7)
        eyes(d, cx, cy - 0.3 * s, 0.14 * s, 0.2 * s, (-3, 2))
        d.ellipse([cx - 0.18 * s, cy - 0.05 * s, cx + 0.18 * s, cy + 0.25 * s], fill=(120, 20, 30), outline=INK, width=5)
        d.ellipse([cx - 0.1 * s, cy + 0.1 * s, cx + 0.12 * s, cy + 0.42 * s], fill=(240, 110, 150), outline=INK, width=4)


def flames(d, x0, x1, ybase, hmax, r=random):
    x = x0
    while x < x1:
        w = r.uniform(30, 60); h = r.uniform(0.5, 1.0) * hmax
        pts = [(x, ybase), (x + w * 0.2, ybase - h * 0.5), (x + w * 0.45, ybase - h), (x + w * 0.6, ybase - h * 0.45), (x + w * 0.8, ybase - h * 0.7), (x + w, ybase)]
        d.polygon(pts, fill=(240, 120, 30), outline=INK)
        d.polygon([(x + w * 0.25, ybase), (x + w * 0.45, ybase - h * 0.55), (x + w * 0.65, ybase)], fill=(252, 220, 60))
        x += w * 0.85


def bubble_text(img, text, box, fill, shade=(40, 30, 90), rot_jitter=14, r=random):
    """Lettere a bolla: ogni lettera ruotata un po', contorno nero spesso e ombra sfalsata."""
    x0, y0, x1, y1 = box
    n = len(text)
    cw = (x1 - x0) / n
    for k, ch in enumerate(text):
        size = int((y1 - y0) * 1.15)
        L = Image.new('RGBA', (size * 2, size * 2), (0, 0, 0, 0))
        f = font('ariblk.ttf', size)
        dl = ImageDraw.Draw(L)
        dl.text((size * 0.5 + 10, size * 0.25 + 10), ch, font=f, fill=shade + (255,), stroke_width=int(size * 0.09), stroke_fill=shade + (255,))
        dl.text((size * 0.5, size * 0.25), ch, font=f, fill=fill + (255,), stroke_width=int(size * 0.07), stroke_fill=INK + (255,))
        L = L.rotate(r.uniform(-rot_jitter, rot_jitter), resample=Image.BICUBIC)
        L = L.crop(L.getbbox())
        L = L.resize((int(cw * 1.15), int((y1 - y0) * 1.05)), Image.LANCZOS)
        img.alpha_composite(L, (int(x0 + k * cw - cw * 0.05), int(y0 + r.uniform(-8, 8))))


def speech(d, cx, cy, w, h, text):
    d.ellipse([cx - w, cy - h, cx + w, cy + h], fill=WHITE, outline=INK, width=4)
    d.polygon([(cx - w * 0.3, cy + h * 0.8), (cx - w * 0.7, cy + h * 1.6), (cx, cy + h * 0.9)], fill=WHITE, outline=INK)
    f = font('ariblk.ttf', int(h * 0.9))
    tw = d.textlength(text, font=f)
    d.text((cx - tw / 2, cy - h * 0.55), text, font=f, fill=INK)


def tag_scribble(d, x, y, w, colr, r=random):
    pts = [(x + k * w / 10, y + r.uniform(-12, 12)) for k in range(11)]
    d.line(pts, fill=colr, width=4, joint='curve')
    for _ in range(3):
        a = r.uniform(x, x + w)
        d.line([(a, y - 16), (a + r.uniform(-10, 10), y + 16)], fill=colr, width=3)


def splash_bg(d, box, colr, r=random):
    """Fondo di vernice a nuvola, irregolare, dietro un gruppo di personaggi."""
    x0, y0, x1, y1 = box
    for _ in range(14):
        cx, cy = r.uniform(x0, x1), r.uniform(y0, y1)
        rr = r.uniform(0.18, 0.32) * (y1 - y0)
        d.ellipse([cx - rr * 1.6, cy - rr, cx + rr * 1.6, cy + rr], fill=colr)


def mural(seed, scene):
    r = random.Random(seed)
    img = Image.new('RGBA', (MW, MH), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    scene(img, d, r)
    return img


PALETTE = [(120, 90, 200), (60, 160, 90), (90, 150, 230), (240, 200, 50), (236, 120, 170), (200, 70, 60), (150, 110, 210), (80, 190, 190), (246, 160, 60)]


def scene_birds(img, d, r):
    # uccellini e pupazzi in fila con i fumetti, sotto la scritta a bolla gialla
    splash_bg(d, (20, 60, 1000, 300), (210, 196, 220, 255), r)
    for k in range(8):
        cx = 90 + k * 120 + r.uniform(-15, 15)
        creature(d, cx, 140 + r.uniform(-10, 20), r.uniform(58, 80), r.choice(PALETTE), kind=r.choice([1, 1, 0, 4]), r=r)
    for k, t in enumerate(['MOI!', 'MOI', 'YOUPZ', 'MOI!']):
        speech(d, 140 + k * 230, 38, 58, 26, t)
    bubble_text(img, 'YOUPIZ', (60, 230, 900, 370), (246, 214, 40), r=r)
    # grande mostro viola col fuoco sulla testa e il gatto verde
    splash_bg(d, (1050, 40, 2020, 360), (236, 140, 60, 255), r)
    flames(d, 1080, 2000, 120, 100, r)
    creature(d, 1240, 220, 140, (150, 100, 210), kind=0, r=r)
    creature(d, 1500, 230, 120, (80, 170, 90), kind=3, r=r)
    creature(d, 1720, 240, 110, (90, 150, 230), kind=2, r=r)
    creature(d, 1900, 250, 90, (240, 200, 50), kind=4, r=r)
    for _ in range(6):
        tag_scribble(d, r.uniform(0, MW - 200), r.uniform(300, 370), r.uniform(80, 180), r.choice([INK, (200, 40, 60), (40, 60, 160)]), r)


def scene_monsters(img, d, r):
    # faccione giallo e nero a zig-zag, poi mostri verdi e un orso col berretto
    d.rectangle([40, 40, 640, 370], fill=(30, 30, 34, 255))
    for k in range(10):
        x = 40 + k * 60
        d.polygon([(x, 40), (x + 30, 120), (x + 60, 40)], fill=(240, 196, 40))
        d.polygon([(x, 370), (x + 30, 290), (x + 60, 370)], fill=(240, 196, 40))
    d.ellipse([170, 90, 510, 330], fill=(240, 196, 40), outline=INK, width=8)
    eyes(d, 340, 170, 36, 80, (0, 6), lid=(240, 196, 40))
    d.line([(250, 120), (310, 150)], fill=INK, width=10)
    d.line([(430, 120), (370, 150)], fill=INK, width=10)
    mouth(d, 340, 245, 110, 60)
    d.line([(520, 180), (600, 150)], fill=INK, width=6)
    d.line([(540, 200), (610, 190)], fill=INK, width=6)
    splash_bg(d, (700, 50, 1350, 360), (230, 220, 200, 255), r)
    creature(d, 820, 220, 120, (90, 190, 80), kind=0, r=r)
    creature(d, 1010, 210, 110, (236, 120, 170), kind=3, r=r)
    creature(d, 1200, 230, 110, (90, 150, 230), kind=2, r=r)
    speech(d, 1100, 60, 90, 32, 'ZONE 43')
    splash_bg(d, (1400, 40, 2030, 360), (150, 200, 230, 255), r)
    creature(d, 1520, 220, 120, (120, 90, 200), kind=4, r=r)
    creature(d, 1720, 210, 130, (60, 160, 90), kind=1, r=r)
    creature(d, 1920, 230, 100, (246, 160, 60), kind=0, r=r)
    for _ in range(7):
        tag_scribble(d, r.uniform(0, MW - 200), r.uniform(320, 375), r.uniform(80, 180), r.choice([INK, (200, 40, 60), (40, 60, 160), (60, 140, 60)]), r)


def scene_mix(img, d, r):
    # lettere a bolla rosa e azzurre, uccellini, un drago verde con le fiamme
    bubble_text(img, 'VIERZON', (40, 150, 900, 360), (236, 120, 170), shade=(30, 60, 120), r=r)
    for k in range(5):
        creature(d, 110 + k * 170, 90, 60, r.choice(PALETTE), kind=1, r=r)
    splash_bg(d, (960, 40, 2020, 360), (200, 230, 200, 255), r)
    flames(d, 980, 1500, 200, 120, r)
    creature(d, 1150, 250, 120, (60, 160, 90), kind=3, r=r)
    creature(d, 1380, 240, 130, (200, 70, 60), kind=0, r=r)
    creature(d, 1620, 230, 120, (240, 200, 50), kind=2, r=r)
    creature(d, 1860, 240, 120, (150, 110, 210), kind=4, r=r)
    speech(d, 1520, 60, 70, 28, 'OUF!')
    for _ in range(6):
        tag_scribble(d, r.uniform(0, MW - 200), r.uniform(320, 375), r.uniform(80, 180), r.choice([INK, (200, 40, 60), (40, 60, 160)]), r)


brick_tile = brick_wall(seed=3)
for name, scene, seed in (('mural_a.jpg', scene_birds, 11), ('mural_b.jpg', scene_monsters, 12), ('mural_c.jpg', scene_mix, 13)):
    paint = mural(seed, scene)
    # pareti in mattoni sotto il murale: stessa scala della texture brick.jpg (4 m = 1024 px → 16 x 3 m = 4096 x 768),
    # qui ridotte a 2048 x 384; la vernice prende il rilievo dei mattoni (giunti più scuri) e si consuma un po'
    wall = Image.new('RGB', (4096, 768))
    for k in range(4):
        wall.paste(brick_tile, (k * 1024, 0))
    wall = wall.resize((MW, MH), Image.LANCZOS)
    wl = np.asarray(wall.convert('L')).astype(np.float32) / 255
    p = np.asarray(paint).astype(np.float32)
    a = p[..., 3:4] / 255 * (0.82 + 0.18 * resized_noise(32, 128, 1.8, MH, MW))[..., None]
    rgb = p[..., :3] * (0.55 + 0.5 * wl[..., None])
    out = np.asarray(wall).astype(np.float32) * (1 - a) + rgb * a
    save(to_img(out), name, quality=88)

# ================================================================== 5. COPERTURA, SERRANDA, VARIE
print('edificio')
W = H = 512
u = np.arange(W)[None, :] / W
rf = np.zeros((H, W, 3), np.float32) + np.array([78, 82, 88], np.float32)
rf += ((fft_noise(H, W, beta=2.2) - 0.5) * 10)[..., None]
rf *= (1 - 0.25 * (np.sin(u * np.pi * 2 * 16) > 0.4))[..., None]
save(to_img(rf).filter(ImageFilter.GaussianBlur(0.6)), 'roof_deck.jpg')
# lastre traslucide della copertura (lucernari)
sk = np.zeros((256, 512, 3), np.float32) + np.array([214, 220, 222], np.float32)
sk += ((resized_noise(8, 32, 1.4, 256, 512) - 0.5) * 18)[..., None]
sk *= (1 - 0.12 * (np.sin(np.arange(512)[None, :] / 512 * np.pi * 2 * 16) > 0.4))[..., None]
save(to_img(sk), 'skylight.jpg')
# serranda industriale grigia (doghe orizzontali)
W, H = 512, 512
sr = np.zeros((H, W, 3), np.float32) + np.array([150, 152, 150], np.float32)
sr *= (0.86 + 0.14 * (np.sin(np.arange(H)[:, None] / H * np.pi * 2 * 40) > 0))
sr += ((resized_noise(64, 16, 1.6, H, W) - 0.5) * 14)[..., None]
save(to_img(sr), 'shutter.jpg')
# bandiera francese
fl = Image.new('RGB', (600, 400), WHITE)
fd = ImageDraw.Draw(fl)
fd.rectangle([0, 0, 200, 400], fill=(0, 56, 146))
fd.rectangle([400, 0, 600, 400], fill=(226, 26, 44))
arr = np.asarray(fl).astype(np.float32) * (0.88 + 0.12 * np.sin(np.arange(600)[None, :] / 600 * np.pi * 4))[..., None]
save(to_img(arr), 'flag_france.jpg')

# ================================================================== 6. STRISCIONI
print('striscioni')
# striscione del club sotto il tabellone (bianco, scritte rosse, artigli)
b = Image.new('RGBA', (1024, 300), (246, 246, 242, 255))
paste_fit(b, LOGO, (20, 20, 220, 280))
paste_fit(b, LOGO.transpose(Image.FLIP_LEFT_RIGHT), (804, 20, 1004, 280))
paste_fit(b, text_layer('PRÉDATEURS DE', 'impact.ttf', RED, spacing=4), (240, 30, 784, 150))
paste_fit(b, text_layer('VIERZON', 'impact.ttf', RED, spacing=8), (240, 160, 784, 280))
save(banner_finish(b), 'banner_club.jpg', quality=86)
# motto della città
b = Image.new('RGBA', (1600, 400), (246, 246, 242, 255))
paste_fit(b, LOGO, (30, 40, 300, 360))
paste_fit(b, text_layer("ICI C'EST VIERZON", 'arialbd.ttf', BLACK, spacing=4), (330, 50, 1560, 200))
paste_fit(b, text_layer('Aliunde pauca requirens', 'arialbi.ttf', BLACK), (360, 220, 1500, 330))
save(banner_finish(b), 'banner_motto.jpg', quality=86)
# striscioni appesi alle travi: club, città, dipartimento, regione
specs = [
    ('banner_1.jpg', NAVY, WHITE, 'PRÉDATEURS', 'ROLLER HOCKEY VIERZON', (230, 230, 240)),
    ('banner_2.jpg', WHITE, RED, 'VIERZON', 'CENTRE-VAL DE LOIRE', (60, 60, 66)),
    ('banner_3.jpg', (246, 214, 60), BLACK, 'CHER 18', 'LE DÉPARTEMENT', (60, 60, 66)),
    ('banner_4.jpg', RED, WHITE, 'DEPUIS 1998', 'PRÉDATEURS DE VIERZON', (255, 230, 230)),
    ('banner_5.jpg', WHITE, NAVY, 'Centre-Val de Loire', 'LA RÉGION', (90, 90, 96)),
]
for name, bg, fg, t1, t2, c2 in specs:
    b = Image.new('RGBA', (1024, 320), bg + (255,))
    paste_fit(b, LOGO, (20, 20, 260, 300))
    paste_fit(b, text_layer(t1, 'ariblk.ttf' if t1.isupper() else 'arialbi.ttf', fg, spacing=4), (290, 40, 990, 190), 'left')
    paste_fit(b, text_layer(t2, 'arialbd.ttf', c2, spacing=3), (290, 210, 990, 290), 'left')
    save(banner_finish(b), name, quality=85)
print('fatto')
