"""Genera le texture del Palahockey di Monleale (Sportleale Monleale) in assets/textures/monleale/.
Uso (dalla cartella del progetto): python tools/generate_monleale_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/monleale.jpg e le foto del palazzetto: tensostruttura in telo bianco-crema su
archi in acciaio, pareti basse in pannelli grigi coi cartelloni appesi, pavimento a piastrelle azzurre
con la riga centrale e i cerchi rossi, balaustre bianche con lo zoccolo in legno chiaro, reti bianche
sopra le balaustre. Nei cartelloni solo club, paese e territorio: niente marchi commerciali.
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'monleale')
os.makedirs(OUT, exist_ok=True)
random.seed(1975)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'monleale.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
ORANGE, NAVY, SKY = (242, 106, 27), (28, 40, 110), (74, 180, 230)
WOOD = (206, 176, 128)
GREEN = (46, 120, 64)            # colline del Tortonese
WINE = (120, 28, 52)


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


# ================================================================== 1. PISTA: piastrelle azzurre, segni rossi
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
TILE = 0.3048
n1 = resized_noise(512, 256, 2.0, H, W)
n2 = resized_noise(1024, 512, 1.4, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([150, 204, 230], np.float32)
col += ((n1 - 0.5) * 10)[..., None]
col += ((n2 - 0.5) * 5)[..., None]
xs = (np.arange(W) / S / TILE).astype(int)
zs = (np.arange(H) / S / TILE).astype(int)
tv = np.random.default_rng(11).normal(0, 2.4, (zs.max() + 1, xs.max() + 1))
col += tv[zs][:, xs][..., None]
gx = ((np.arange(W) / S) % TILE) < (1.6 / S)
gz = ((np.arange(H) / S) % TILE) < (1.6 / S)
groove = gz[:, None] | gx[None, :]
col[groove] *= 0.9

SS = 2
mask = Image.new('L', (W * SS, H * SS), 0)
dr = ImageDraw.Draw(mask)
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)
px = lambda m: max(1, int(m * S * SS))


def rect(x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    dr.rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def line(pts, w):
    dr.line([P(x, z) for x, z in pts], fill=255, width=px(w))


def ring(x, z, r, wdt):
    c = P(x, z); R = r * S * SS
    dr.arc([c[0] - R, c[1] - R, c[0] + R, c[1] + R], 0, 360, fill=255, width=px(wdt))


rect(-RW / 2, -0.15, RW / 2, 0.15)                      # riga centrale rossa (nastro)
ring(0, 0, 4.5, 0.07)
rect(-0.25, -0.25, 0.25, 0.25)
for s in (-1, 1):
    rect(-RW / 2 + 1.4, s * 31 - 0.04, RW / 2 - 1.4, s * 31 + 0.04)
    line([(-1.5, s * 31), (-1.5, s * 29.6), (1.5, s * 29.6), (1.5, s * 31)], 0.05)
    for x in (-8.5, 8.5):
        ring(x, s * 21, 4.5, 0.07)
        rect(x - 0.3, s * 21 - 0.15, x + 0.3, s * 21 + 0.15)
        rect(x - 0.25, s * 8 - 0.12, x + 0.25, s * 8 + 0.12)
m = np.asarray(mask.filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
col = col * (1 - m * 0.92) + np.array([214, 40, 52], np.float32) * m * 0.92

img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1500):                                     # segni delle ruote
    cx, cy = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(30, 200); a0 = random.uniform(0, 360)
    sd.arc([cx - ln, cy - ln, cx + ln, cy + ln], a0, a0 + random.uniform(10, 50), fill=(40, 60, 80, random.randint(8, 20)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img, 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.2 + (~groove) * 0.5, 1.2), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE bianche, zoccolo in legno chiaro
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([242, 242, 238], np.float32)
    arr += ((n - 0.5) * 8)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.rectangle([x - 2, 0, x + 2, h], fill=(212, 212, 208, 255))
    # zoccolo in legno chiaro con le venature
    wn = resized_noise(16, 512, 1.2, 38, w)
    wood = np.zeros((38, w, 3), np.float32) + np.array(WOOD, np.float32)
    wood += ((wn - 0.5) * 30)[..., None]
    img.paste(to_img(wood), (0, h - 38))
    d.rectangle([0, 0, w, 6], fill=(206, 206, 202, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 24, int((xm + wm) * pxm), h - 52)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(280):                                  # segni dei dischi
        x, y = random.uniform(0, w), random.uniform(h * 0.4, h - 40)
        r = random.uniform(3, 9)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 44, random.randint(20, 60)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def logo_panel(img, x0, y0, x1, y1):
    paste_fit(img, LOGO, (x0 + 6, y0 + 4, x1 - 6, y1 - 4))


def club_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=NAVY + (255,))
    d.rectangle([x0, y1 - 12, x1, y1], fill=ORANGE + (255,))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 10, y0 + 6, x0 + 10 + h, y1 - 16))
    paste_fit(img, text_layer('SPORTLEALE', 'ariblk.ttf', (255, 255, 255)), (x0 + h + 30, y0 + 16, x1 - 20, y0 + h // 2 + 4), 'left')
    paste_fit(img, text_layer('HOCKEY IN LINEA • MONLEALE', 'arialbd.ttf', SKY, spacing=4), (x0 + h + 30, y0 + h // 2 + 14, x1 - 20, y1 - 24), 'left')


def town_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=ORANGE + (255,))
    paste_fit(img, text_layer('MONLEALE', 'ariblk.ttf', (255, 255, 255), spacing=6), (x0 + 30, y0 + 14, x1 - 30, y0 + (y1 - y0) * 2 // 3))
    paste_fit(img, text_layer('COMUNE DI MONLEALE (AL)', 'arial.ttf', NAVY, spacing=6), (x0 + 50, y0 + (y1 - y0) * 2 // 3, x1 - 50, y1 - 10))


def hills_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=GREEN + (255,), width=6)
    paste_fit(img, text_layer('COLLI TORTONESI', 'arialbd.ttf', GREEN, spacing=4), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


def wine_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=WINE + (255,))
    paste_fit(img, text_layer('TERRE DEL TIMORASSO', 'georgiab.ttf', (246, 226, 180), spacing=4), (x0 + 30, y0 + 26, x1 - 30, y1 - 26))


def hockey_panel(img, x0, y0, x1, y1):
    paste_fit(img, text_layer('PALAHOCKEY MONLEALE', 'impact.ttf', NAVY, spacing=6), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


save(board_strip(panels=[(1.0, 2.2, logo_panel), (4.0, 4.2, town_panel), (12.5, 4.6, hockey_panel)]), 'boards_a.jpg')
save(board_strip(panels=[(1.5, 4.4, hills_panel), (10.5, 2.2, logo_panel), (13.5, 4.2, wine_panel)]), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 5.4, club_panel), (11.0, 4.2, town_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256, panels=[(6.5, 3.6, logo_panel)]), 'boards_corner.jpg')

# ================================================================== 3. EDIFICIO
print('edificio')
# telo della tensostruttura: crema con le saldature dei teli (texture in metri: 8 m x 8 m)
W = H = 512
n = fft_noise(H, W, beta=2.4)
mem = np.zeros((H, W, 3), np.float32) + np.array([238, 232, 216], np.float32)
mem += ((n - 0.5) * 16)[..., None]
u = np.arange(W)[None, :]
mem *= (1 - 0.06 * ((u % 128) < 4))[..., None]           # saldature ogni 2 m
mem *= (1 - 0.02 * (np.sin(np.arange(H)[:, None] / H * np.pi * 14) > 0.85))[..., None]
save(to_img(mem).filter(ImageFilter.GaussianBlur(0.7)), 'membrane.jpg')

# pareti basse: pannelli grigi a giunti verticali (riquadro 4 m x 4 m)
W = H = 512
n = fft_noise(H, W, beta=2.0)
wg = np.zeros((H, W, 3), np.float32) + np.array([168, 166, 160], np.float32)
wg += ((n - 0.5) * 16)[..., None]
x = np.arange(W)[None, :]
wg *= (1 - 0.12 * ((x % 128) < 3))[..., None]
wg *= (1 - 0.05 * ((np.arange(H)[:, None] % 256) < 2))[..., None]
save(to_img(wg), 'wall_grey.jpg')

# rete bianca di protezione sopra le balaustre (maglia larga, trasparente)
W = H = 256
net = Image.new('RGBA', (W, H), (0, 0, 0, 0))
nd = ImageDraw.Draw(net)
for k in range(0, W + 1, 16):
    nd.line([(k, 0), (k, H)], fill=(236, 236, 232, 190), width=2)
    nd.line([(0, k), (W, k)], fill=(236, 236, 232, 190), width=2)
save(net, 'net.png')

# cartelloni appesi alle pareti grigie (club, paese, territorio)
W, H = 4096, 256
ads = Image.new('RGBA', (W, H), (0, 0, 0, 0))
items = [
    ('logo', None), ('MONLEALE', ORANGE), ('COLLI TORTONESI', GREEN), ('SPORTLEALE', NAVY),
    ('TIMORASSO', WINE), ('logo', None), ('VAL CURONE', GREEN), ('FORZA MONLEALE', ORANGE),
]
seg = W // len(items)
ad = ImageDraw.Draw(ads)
for i, (t, c) in enumerate(items):
    x0 = i * seg + 30
    x1 = (i + 1) * seg - 30
    bg = (252, 236, 120) if i % 3 == 1 else (250, 250, 248)       # alcuni teli gialli, come nelle foto
    ad.rectangle([x0, 30, x1, H - 30], fill=bg + (255,), outline=(190, 190, 186, 255), width=4)
    if t == 'logo':
        paste_fit(ads, LOGO, (x0 + 20, 38, x1 - 20, H - 38))
    else:
        paste_fit(ads, text_layer(t, 'ariblk.ttf', c, spacing=4), (x0 + 36, 72, x1 - 36, H - 72))
save(ads, 'wall_ads.png')

# ================================================================== 4. STRISCIONE DEL CLUB
print('striscioni')
b = Image.new('RGBA', (1024, 384), (255, 255, 255, 255))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 0, 1024, 22], fill=ORANGE)
bd.rectangle([0, 362, 1024, 384], fill=ORANGE)
bd.rectangle([0, 22, 1024, 34], fill=NAVY)
bd.rectangle([0, 350, 1024, 362], fill=NAVY)
paste_fit(b, LOGO, (30, 46, 330, 338))
paste_fit(b, text_layer('SPORTLEALE', 'ariblk.ttf', NAVY), (360, 80, 990, 200), 'left')
paste_fit(b, text_layer('MONLEALE', 'ariblk.ttf', ORANGE), (360, 216, 990, 320), 'left')
save(banner_finish(b), 'banner_club.jpg', quality=86)
print('fatto')
