"""Genera le texture del Pabellón Chelva / Príncipe de Asturias (CHL Aranda de Duero) in assets/textures/aranda/.
Uso (dalla cartella del progetto): python tools/generate_aranda_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/aranda.png e le foto del palazzetto: pista a piastrelle modulari grigie con la riga
centrale rossa larga, i cerchi d'ingaggio rossi sottili, i punti d'ingaggio a quadretto e le aree di porta piene
rosse; balaustre bianche col piede giallo e la rete bianca sopra; pareti in pannelli sandwich bianchi a fasce
orizzontali; copertura in lamiera grigio chiaro con le strisce di lucernari.
Nei cartelloni solo club, città e territorio: niente marchi commerciali.
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'aranda')
os.makedirs(OUT, exist_ok=True)
random.seed(9400)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'aranda.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
BLUE, NAVY, BLACK, WHITE = (35, 80, 184), (20, 40, 100), (20, 20, 22), (255, 255, 255)
YEL, RED, WINE = (236, 192, 30), (210, 48, 44), (122, 30, 52)


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


# ================================================================== 1. PISTA a piastrelle grigie
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
n1 = resized_noise(512, 256, 2.0, H, W)
n2 = resized_noise(1024, 512, 1.4, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([150, 154, 158], np.float32)
col += ((n1 - 0.5) * 9)[..., None]
col += ((n2 - 0.5) * 5)[..., None]
TILE = 0.3048
fx = (np.arange(W) / S) % TILE
fz = (np.arange(H) / S) % TILE
groove = (fz[:, None] < 1.5 / S) | (fx[None, :] < 1.5 / S)
col[groove] *= 0.84
# la grata delle piastrelle: un quadrettato fine appena più scuro dentro ogni piastrella
sub = ((fz[:, None] % (TILE / 4)) < 0.8 / S) | ((fx[None, :] % (TILE / 4)) < 0.8 / S)
col[sub & ~groove] *= 0.95

SS = 2
masks = {'red': Image.new('L', (W * SS, H * SS), 0)}
draws = {k: ImageDraw.Draw(m) for k, m in masks.items()}
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)
px = lambda m: max(1, int(m * S * SS))


def rect(k, x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    draws[k].rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def ring(k, x, z, r, wdt):
    c = P(x, z); R = r * S * SS
    draws[k].arc([c[0] - R, c[1] - R, c[0] + R, c[1] + R], 0, 360, fill=255, width=px(wdt))


rect('red', -RW / 2, -0.15, RW / 2, 0.15)
ring('red', 0, 0, 4.5, 0.07)
rect('red', -0.28, -0.28, 0.28, 0.28)
for s in (-1, 1):
    rect('red', -RW / 2 + 1.4, s * 31 - 0.05, RW / 2 - 1.4, s * 31 + 0.05)
    rect('red', -1.9, s * 31, 1.9, s * 29.0)                   # area di porta piena, larga
    for x in (-8.5, 8.5):
        ring('red', x, s * 21, 4.5, 0.07)
        rect('red', x - 0.3, s * 21 - 0.3, x + 0.3, s * 21 + 0.3)
        rect('red', x - 0.3, s * 8 - 0.3, x + 0.3, s * 8 + 0.3)
m = np.asarray(masks['red'].filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
col = col * (1 - m * 0.9) + np.array((222, 70, 60), np.float32) * m * 0.9
img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1500):                                      # segni delle ruote
    cx, cy = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(30, 220); a0 = random.uniform(0, 360)
    sd.arc([cx - ln, cy - ln, cx + ln, cy + ln], a0, a0 + random.uniform(10, 50), fill=(40, 42, 46, random.randint(8, 18)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img, 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.15 + (~groove) * 0.3 + (~sub) * 0.08, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE bianche col piede giallo
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([245, 245, 243], np.float32)
    arr += ((n - 0.5) * 7)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.rectangle([x - 2, 0, x + 2, h], fill=(214, 216, 214, 255))
    d.rectangle([0, h - 38, w, h], fill=YEL + (255,))
    d.rectangle([0, 0, w, 6], fill=(204, 206, 204, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 24, int((xm + wm) * pxm), h - 54)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(260):                                   # segni delle palline
        x, y = random.uniform(0, w), random.uniform(h * 0.4, h - 40)
        r = random.uniform(3, 9)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 44, random.randint(20, 60)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def logo_panel(img, x0, y0, x1, y1):
    paste_fit(img, LOGO, (x0 + 6, y0 + 4, x1 - 6, y1 - 4))


def club_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=BLACK + (255,))
    d.rectangle([x0, y1 - 12, x1, y1], fill=BLUE + (255,))
    h = y1 - y0
    d.ellipse([x0 + 8, y0 + 2, x0 + h - 6, y1 - 14], fill=WHITE + (255,))
    paste_fit(img, LOGO, (x0 + 12, y0 + 6, x0 + h - 10, y1 - 18))
    paste_fit(img, text_layer('CHL ARANDA', 'ariblk.ttf', WHITE), (x0 + h + 20, y0 + 14, x1 - 20, y0 + h // 2 + 2), 'left')
    paste_fit(img, text_layer('DE DUERO', 'ariblk.ttf', (120, 160, 240)), (x0 + h + 20, y0 + h // 2 + 10, x1 - 20, y1 - 22), 'left')


def aranda_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=WINE + (255,), width=6)
    paste_fit(img, text_layer('ARANDA DE DUERO', 'georgia.ttf', WINE, spacing=6), (x0 + 30, y0 + 22, x1 - 30, y1 - 22))


def ribera_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=WINE + (255,))
    paste_fit(img, text_layer('RIBERA DEL DUERO', 'arialbd.ttf', WHITE, spacing=5), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


def cyl_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=NAVY + (255,))
    paste_fit(img, text_layer('CASTILLA Y LEÓN', 'arialbd.ttf', WHITE, spacing=5), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


def yellow_panel(img, x0, y0, x1, y1):                     # il cartello giallo come nelle foto, col nome della città
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(250, 214, 40, 255))
    paste_fit(img, text_layer('HOCKEY ARANDA', 'ariblk.ttf', (30, 60, 140), spacing=4), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


def liga_panel(img, x0, y0, x1, y1):
    paste_fit(img, text_layer('LIGA ÉLITE HOCKEY LÍNEA', 'impact.ttf', BLACK, spacing=6), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


save(board_strip(panels=[(1.0, 2.2, logo_panel), (4.0, 4.6, aranda_panel), (12.5, 4.6, liga_panel)]), 'boards_a.jpg')
save(board_strip(panels=[(1.5, 4.4, cyl_panel), (10.5, 2.2, logo_panel), (13.5, 4.4, ribera_panel)]), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 5.6, club_panel), (11.0, 4.2, yellow_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256, panels=[(6.5, 3.6, logo_panel)]), 'boards_corner.jpg')

# ================================================================== 3. EDIFICIO
print('edificio')
# pannelli sandwich bianchi a fasce orizzontali da 1 m (texture 4 x 4 m)
W = H = 512
PXw = W / 4.0
wp = np.zeros((H, W, 3), np.float32) + np.array([236, 238, 238], np.float32)
wp += ((resized_noise(32, 32, 1.8, H, W) - 0.5) * 8)[..., None]
y = np.arange(H)[:, None]
wp *= (1 - 0.18 * ((y % int(PXw)) < 3))[..., None]                          # giunti orizzontali
wp *= (1 - 0.06 * (((y % int(PXw)) > PXw - 10)))[..., None]                   # ombra sotto il giunto
wp *= (1 - 0.03 * ((np.arange(W)[None, :] % 16) < 2))[..., None]              # microgrecatura
save(to_img(wp).filter(ImageFilter.GaussianBlur(0.5)), 'wall_panels.jpg')

# lamiera grecata della copertura vista da sotto (texture 4 x 4 m)
W = H = 512
u = np.arange(W)[None, :] / W
rf = np.zeros((H, W, 3), np.float32) + np.array([206, 210, 212], np.float32)
rf += ((fft_noise(H, W, beta=2.2) - 0.5) * 8)[..., None]
rf *= (1 - 0.18 * (np.sin(u * np.pi * 2 * 16) > 0.5))[..., None]
save(to_img(rf).filter(ImageFilter.GaussianBlur(0.6)), 'roof_deck.jpg')

# lucernario: lastra traslucida grecata, luminosa
W, H = 256, 128
sk = np.zeros((H, W, 3), np.float32) + np.array([250, 252, 252], np.float32)
sk *= (1 - 0.06 * (np.sin(np.arange(W)[None, :] / W * np.pi * 2 * 8) > 0.5))[..., None]
im = to_img(sk)
ImageDraw.Draw(im).rectangle([0, 0, W - 1, H - 1], outline=(170, 176, 180), width=4)
save(im, 'skylight.jpg')

# rete metallica bianca sopra le balaustre (trasparente)
W = H = 256
mesh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
md = ImageDraw.Draw(mesh)
for k in range(0, W + 1, 21):
    md.line([(k, 0), (k, H)], fill=(244, 246, 246, 230), width=3)
    md.line([(0, k), (W, k)], fill=(244, 246, 246, 230), width=3)
save(mesh, 'mesh_white.png')

# finestra della galleria
W, H = 256, 192
wn = Image.new('RGB', (W, H), (200, 214, 222))
wd = ImageDraw.Draw(wn)
wd.rectangle([0, 0, W - 1, H - 1], outline=(120, 124, 128), width=12)
wd.line([(W // 2, 0), (W // 2, H)], fill=(120, 124, 128), width=8)
save(wn, 'window.jpg')

# ================================================================== 4. STRISCIONE DEL CLUB
print('striscioni')
b = Image.new('RGBA', (1024, 384), BLACK + (255,))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 0, 1024, 22], fill=BLUE)
bd.rectangle([0, 362, 1024, 384], fill=BLUE)
bd.ellipse([40, 40, 344, 344], fill=WHITE)
paste_fit(b, LOGO, (56, 56, 328, 328))
paste_fit(b, text_layer('CHL ARANDA', 'ariblk.ttf', WHITE), (380, 80, 990, 190), 'left')
paste_fit(b, text_layer('DE DUERO', 'ariblk.ttf', (120, 160, 240)), (380, 220, 990, 320), 'left')
save(banner_finish(b), 'banner_club.jpg', quality=86)
print('fatto')
