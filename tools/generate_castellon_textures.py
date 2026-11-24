"""Genera le texture del Pabellón Polideportivo Municipal Gaetà Huguet (Hockey Club Castellón, Castelló de la
Plana) in assets/textures/castellon/.
Uso (dalla cartella del progetto): python tools/generate_castellon_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/castellon.jpg: pista a piastrelle azzurro-petrolio con le righe rosse sottili, le aree di
porta piene rosse e le righe bianche di altri sport; balaustre bianche col piede rosso; volta a botte in telo bianco
con le cuciture lungo la sala; pareti lunghe vetrate con i frangisole color terracotta dietro i vetri; testata
bianca col mosaico di quadrati rossi, arancio, gialli e verdi e la fascia della scritta al centro.
Nei cartelloni solo club, città e territorio: niente marchi commerciali.
"""
import sys, os, random, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'castellon')
os.makedirs(OUT, exist_ok=True)
random.seed(12001)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'castellon.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
LIME, BLACK, WHITE, RED = (168, 230, 29), (20, 20, 22), (255, 255, 255), (204, 40, 40)
MOSAIC = [(214, 40, 44), (236, 120, 30), (246, 196, 30), (60, 160, 70), (150, 152, 156), (226, 66, 50)]


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


# ================================================================== 1. PISTA a piastrelle azzurro-petrolio
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
n1 = resized_noise(512, 256, 2.0, H, W)
n2 = resized_noise(1024, 512, 1.4, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([104, 168, 190], np.float32)
col += ((n1 - 0.5) * 9)[..., None]
col += ((n2 - 0.5) * 5)[..., None]
TILE = 0.3048
gx = ((np.arange(W) / S) % TILE) < (1.4 / S)
gz = ((np.arange(H) / S) % TILE) < (1.4 / S)
groove = gz[:, None] | gx[None, :]
col[groove] *= 0.9

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'white')}
draws = {k: ImageDraw.Draw(m) for k, m in masks.items()}
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)
px = lambda m: max(1, int(m * S * SS))


def rect(k, x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    draws[k].rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def line(k, pts, w):
    draws[k].line([P(x, z) for x, z in pts], fill=255, width=px(w))


def ring(k, x, z, r, wdt):
    c = P(x, z); R = r * S * SS
    draws[k].arc([c[0] - R, c[1] - R, c[0] + R, c[1] + R], 0, 360, fill=255, width=px(wdt))


# hockey (rosso, righe sottili come nella foto), aree di porta piene e larghe
rect('red', -RW / 2, -0.08, RW / 2, 0.08)
ring('red', 0, 0, 4.5, 0.06)
rect('red', -0.25, -0.25, 0.25, 0.25)
for s in (-1, 1):
    rect('red', -RW / 2 + 1.4, s * 31 - 0.04, RW / 2 - 1.4, s * 31 + 0.04)
    rect('red', -1.8, s * 31, 1.8, s * 29.2)
    for x in (-8.5, 8.5):
        ring('red', x, s * 21, 4.5, 0.06)
        rect('red', x - 0.28, s * 21 - 0.28, x + 0.28, s * 21 + 0.28)
        rect('red', x - 0.22, s * 8 - 0.22, x + 0.22, s * 8 + 0.22)
# altri sport (bianco): righe lungo i lati e linee trasversali
for s in (-1, 1):
    line('white', [(s * (RW / 2 - 1.2), -RL / 2 + 3), (s * (RW / 2 - 1.2), RL / 2 - 3)], 0.05)
    line('white', [(-RW / 2 + 1.2, s * 20), (RW / 2 - 1.2, s * 20)], 0.05)
cols = {'white': (236, 244, 246), 'red': (212, 50, 46)}
for k, a in (('white', 0.75), ('red', 0.92)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(cols[k], np.float32) * m * a
img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1500):                                      # segni delle ruote
    cx, cy = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(30, 220); a0 = random.uniform(0, 360)
    sd.arc([cx - ln, cy - ln, cx + ln, cy + ln], a0, a0 + random.uniform(10, 50), fill=(30, 60, 76, random.randint(8, 20)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img, 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.15 + (~groove) * 0.3, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE bianche col piede rosso
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([246, 246, 244], np.float32)
    arr += ((n - 0.5) * 6)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.rectangle([x - 2, 0, x + 2, h], fill=(214, 216, 216, 255))
    d.rectangle([0, h - 22, w, h], fill=RED + (255,))
    d.rectangle([0, 0, w, 6], fill=(206, 208, 208, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 28, int((xm + wm) * pxm), h - 40)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(220):                                   # segni delle palline
        x, y = random.uniform(0, w), random.uniform(h * 0.4, h - 24)
        r = random.uniform(3, 9)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 44, random.randint(20, 55)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def logo_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=BLACK + (255,))
    paste_fit(img, LOGO, (x0 + 10, y0 + 6, x1 - 10, y1 - 6))


def club_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=BLACK + (255,))
    d.rectangle([x0, y1 - 12, x1, y1], fill=LIME + (255,))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 10, y0 + 6, x0 + 10 + int(h * 1.3), y1 - 16))
    paste_fit(img, text_layer('HOCKEY CLUB', 'ariblk.ttf', WHITE), (x0 + int(h * 1.3) + 30, y0 + 14, x1 - 20, y0 + h // 2), 'left')
    paste_fit(img, text_layer('CASTELLÓN', 'ariblk.ttf', LIME), (x0 + int(h * 1.3) + 30, y0 + h // 2 + 8, x1 - 20, y1 - 22), 'left')


def castello_panel(img, x0, y0, x1, y1):
    paste_fit(img, text_layer('CASTELLÓ', 'georgia.ttf', (40, 40, 44), spacing=12), (x0 + 30, y0 + 14, x1 - 30, y0 + (y1 - y0) * 3 // 5))
    paste_fit(img, text_layer('DE LA PLANA', 'arialbd.ttf', RED, spacing=6), (x0 + 60, y0 + (y1 - y0) * 3 // 5 + 6, x1 - 60, y1 - 6))


def patronat_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    h = y1 - y0
    for k in range(3):
        for j in range(2):
            c = MOSAIC[(k * 2 + j) % 4]
            d.rectangle([x0 + 10 + k * 26, y0 + 18 + j * 26, x0 + 32 + k * 26, y0 + 40 + j * 26], fill=c + (255,))
    paste_fit(img, text_layer("PATRONAT D'ESPORTS", 'arialbd.ttf', (40, 40, 44), spacing=4), (x0 + 110, y0 + 10, x1 - 20, y0 + h // 2 + 4), 'left')
    paste_fit(img, text_layer('CASTELLÓ', 'arial.ttf', (90, 90, 96), spacing=6), (x0 + 110, y0 + h // 2 + 12, x1 - 120, y1 - 8), 'left')


def liga_panel(img, x0, y0, x1, y1):
    paste_fit(img, text_layer('LIGA ÉLITE HOCKEY LÍNEA', 'impact.ttf', BLACK, spacing=6), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


save(board_strip(panels=[(1.0, 2.4, logo_panel), (4.4, 4.4, castello_panel), (12.5, 4.6, liga_panel)]), 'boards_a.jpg')
save(board_strip(panels=[(1.5, 4.8, patronat_panel), (10.5, 2.4, logo_panel), (13.5, 4.4, castello_panel)]), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 5.6, club_panel), (11.0, 4.8, patronat_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256, panels=[(6.5, 3.6, logo_panel)]), 'boards_corner.jpg')

# ================================================================== 3. EDIFICIO
print('edificio')
# telo della volta: bianco caldo, cuciture lungo la sala (u = lungo la sala, 6 m; v = lungo l'arco, 4 m)
W, H = 512, 512
mb = np.zeros((H, W, 3), np.float32) + np.array([236, 234, 226], np.float32)
mb += ((resized_noise(64, 64, 2.0, H, W) - 0.5) * 10)[..., None]
yy = np.arange(H)[:, None]
mb *= (1 - 0.05 * ((yy % 64) < 3))[..., None]                                # cuciture dei teli
mb *= (1 - 0.03 * np.sin(yy / H * np.pi * 2 * 8))[..., None]
save(to_img(mb).filter(ImageFilter.GaussianBlur(0.6)), 'membrane.jpg')

# vetrata lunga: campata da 6 m x 6,5 m, montanti grigi, frangisole terracotta dietro i vetri, fascia chiara in alto
W, H = 768, 832
PXg = W / 6.0
gl = np.zeros((H, W, 3), np.float32) + np.array([196, 112, 84], np.float32)
gl += ((resized_noise(32, 64, 1.6, H, W) - 0.5) * 18)[..., None]
y = np.arange(H)[:, None]
gl *= (0.82 + 0.18 * ((y % 14) > 4))[..., None]                              # lamelle orizzontali
top = int(1.2 * PXg)
gl[:top] = np.array([236, 240, 238], np.float32) + ((resized_noise(16, 64, 1.6, top, W) - 0.5) * 16)[..., None]
im = to_img(gl)
d = ImageDraw.Draw(im)
for k in (0, 2, 4, 6):                                                       # montanti ogni 2 m (pilastro ai bordi)
    x = int(k * PXg)
    d.rectangle([x - (10 if k % 6 == 0 else 5), 0, x + (10 if k % 6 == 0 else 5), H], fill=(104, 106, 110))
for ym in (1.2, 3.6):
    yp = int(ym * PXg)
    d.rectangle([0, yp - 5, W, yp + 5], fill=(104, 106, 110))
sh = Image.new('RGBA', im.size, (255, 255, 255, 0))                          # riflesso del vetro
sd = ImageDraw.Draw(sh)
for k in range(6):
    x0 = random.randint(0, W)
    sd.polygon([(x0, 0), (x0 + 60, 0), (x0 - 140, H), (x0 - 200, H)], fill=(255, 255, 255, 26))
im = im.convert('RGBA'); im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(6)))
save(im, 'glazing.jpg')

# zoccolo in cemento sotto le vetrate
W, H = 512, 128
zc = np.zeros((H, W, 3), np.float32) + np.array([176, 172, 164], np.float32)
zc += ((fft_noise(H, W, beta=1.8) - 0.5) * 14)[..., None]
save(to_img(zc), 'plinth.jpg')

# testata: bianco col mosaico di quadrati colorati (50 m x 15 m), fascia con la scritta al centro
W, H = 2000, 600
PXm = W / 50.0
te = Image.new('RGB', (W, H), (240, 240, 236))
td = ImageDraw.Draw(te)
rr = random.Random(7)
Q = 0.9                                                                      # quadrati da 90 cm
for j in range(int(15 / Q)):
    for i in range(int(50 / Q) + 1):
        ym = 15 - (j + 1) * Q                                                 # in metri dal basso
        if ym < 1.2:
            continue
        xm = i * Q
        band = 2.6 < ym < 5.0 and 13 < xm < 37                               # fascia bianca della scritta
        if band:
            continue
        p = 0.55 if ym < 9 else 0.3
        if rr.random() < p:
            c = rr.choice(MOSAIC)
            td.rectangle([int(xm * PXm) + 2, int((15 - ym - Q) * PXm) + 2, int((xm + Q) * PXm) - 2, int((15 - ym) * PXm) - 2], fill=c)
te = te.convert('RGBA')
bx0, bx1, by0, by1 = int(13.5 * PXm), int(36.5 * PXm), int((15 - 4.9) * PXm), int((15 - 2.7) * PXm)
paste_fit(te, text_layer("PATRONAT D'ESPORTS", 'arialbd.ttf', (40, 40, 44), spacing=6), (bx0 + 40, by0 + 40, bx1 - 40, by0 + (by1 - by0) // 2 + 10))
paste_fit(te, text_layer('CASTELLÓ', 'arial.ttf', (90, 90, 96), spacing=10), (bx0 + 220, by0 + (by1 - by0) // 2 + 20, bx1 - 220, by1 - 12))
paste_fit(te, LOGO, (int(9 * PXm), by0, int(13 * PXm), by1))
save(te, 'end_mosaic.jpg')

# testata sud: grande vetrata fino alla volta, telaio grigio a griglia (lastre 1,33 x 2 m), texture 4 x 4 m
W = H = 512
PXe = W / 4.0
eg = np.zeros((H, W, 3), np.float32) + np.array([226, 234, 236], np.float32)
eg += ((resized_noise(16, 16, 1.4, H, W) - 0.5) * 24)[..., None]            # cielo e sagome sfocate fuori
im = to_img(eg)
d = ImageDraw.Draw(im)
for k in range(4):
    x = int(k * 4 / 3 * PXe)
    d.rectangle([x - 5, 0, x + 5, H], fill=(112, 116, 122))
for k in range(2):
    y = int(k * 2 * PXe)
    d.rectangle([0, y - 5, W, y + 5], fill=(112, 116, 122))
sh = Image.new('RGBA', im.size, (255, 255, 255, 0))                          # riflessi del vetro
sd = ImageDraw.Draw(sh)
for k in range(4):
    x0 = random.randint(0, W)
    sd.polygon([(x0, 0), (x0 + 40, 0), (x0 - 90, H), (x0 - 130, H)], fill=(255, 255, 255, 30))
im = im.convert('RGBA'); im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(5)))
save(im, 'end_glass.jpg')
print('fatto')
