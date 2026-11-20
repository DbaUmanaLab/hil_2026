"""Genera le texture del PalaRaciti (Ghosts Padova) in assets/textures/padova/.
Uso (dalla cartella del progetto): python tools/generate_padova_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/padova.jpg e le foto dell'Impianto Polifunzionale Filippo Raciti: pavimento a
piastrelle azzurre con le righe rosse dell'hockey e quelle bianche e gialle degli altri sport, balaustre
bianche con la fascia gialla al piede, pareti in pannelli di cemento grigio chiaro, tetto in lamiera
grecata sopra il reticolo spaziale rosso, striscioni degli sponsor sulle testate.
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'padova')
os.makedirs(OUT, exist_ok=True)
random.seed(37)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'padova.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
RED, BLACK, WHITE = (200, 16, 46), (20, 20, 22), (255, 255, 255)
YEL = (240, 200, 30)
BLUE = (20, 70, 160)


def save(img, name, quality=88):
    path = os.path.join(OUT, name)
    img.convert('RGB').save(path, quality=quality, optimize=True, progressive=True)
    print('  ', name, img.size, os.path.getsize(path) // 1024, 'KB')


def resized_noise(h, w, beta, H, W):
    n = fft_noise(h, w, beta=beta)
    return np.asarray(Image.fromarray((n * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(np.float32) / 255


# ================================================================== 1. PISTA: piastrelle azzurre multisport
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
TILE = 0.25
n1 = resized_noise(512, 256, 2.0, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([156, 200, 226], np.float32)
col += ((n1 - 0.5) * 10)[..., None]
xs = (np.arange(W) / S / TILE).astype(int)
zs = (np.arange(H) / S / TILE).astype(int)
tv = np.random.default_rng(8).normal(0, 2.5, (zs.max() + 1, xs.max() + 1))
col += tv[zs][:, xs][..., None]
gx = ((np.arange(W) / S) % TILE) < (1.4 / S)
gz = ((np.arange(H) / S) % TILE) < (1.4 / S)
groove = gz[:, None] | gx[None, :]
col[groove] *= 0.9

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'white', 'yellow')}
draws = {k: ImageDraw.Draw(m) for k, m in masks.items()}
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)
px = lambda m: max(1, int(m * S * SS))


def rect(k, x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    draws[k].rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def line(k, pts, w):
    draws[k].line([P(x, z) for x, z in pts], fill=255, width=px(w))


def ring(k, x, z, r, wdt, a0=0, a1=360):
    c = P(x, z); R = r * S * SS
    draws[k].arc([c[0] - R, c[1] - R, c[0] + R, c[1] + R], a0, a1, fill=255, width=px(wdt))


# pallacanestro (bianco): campo 15 x 28 lungo la pista, cerchio centrale, aree e linee da tre punti
line('white', [(-7.5, -14), (7.5, -14), (7.5, 14), (-7.5, 14), (-7.5, -14)], 0.05)
line('white', [(-7.5, 0), (7.5, 0)], 0.05)
ring('white', 0, 0, 1.8, 0.05)
for s in (-1, 1):
    zb = s * 14
    line('white', [(-2.45, zb), (-2.45, zb - s * 5.8), (2.45, zb - s * 5.8), (2.45, zb)], 0.05)
    ring('white', 0, zb - s * 5.8, 1.8, 0.05, *((180, 360) if s > 0 else (0, 180)))
    zc = zb - s * 1.575
    line('white', [(-6.6, zb), (-6.6, zc)], 0.05); line('white', [(6.6, zb), (6.6, zc)], 0.05)
    ring('white', 0, zc, 6.75, 0.05, *((180 + 12, 360 - 12) if s > 0 else (12, 180 - 12)))
# pallavolo (giallo): campo 9 x 18 con le linee d'attacco
line('yellow', [(-4.5, -9), (4.5, -9), (4.5, 9), (-4.5, 9), (-4.5, -9)], 0.05)
line('yellow', [(-4.5, -3), (4.5, -3)], 0.05); line('yellow', [(-4.5, 3), (4.5, 3)], 0.05)
# hockey (rosso): riga centrale larga, cerchio centrale, cerchi d'ingaggio, linee di porta, punti
rect('red', -RW / 2, -0.15, RW / 2, 0.15)
ring('red', 0, 0, 4.5, 0.06)
for s in (-1, 1):
    rect('red', -RW / 2 + 1.4, s * 31 - 0.04, RW / 2 - 1.4, s * 31 + 0.04)
    line('red', [(-1.5, s * 31), (-1.5, s * 29.6), (1.5, s * 29.6), (1.5, s * 31)], 0.05)
    for x in (-8.5, 8.5):
        ring('red', x, s * 21, 4.5, 0.06)
        rect('red', x - 0.3, s * 21 - 0.15, x + 0.3, s * 21 + 0.15)
        rect('red', x - 0.25, s * 8 - 0.12, x + 0.25, s * 8 + 0.12)

cols = {'yellow': (232, 196, 40), 'white': (246, 248, 248), 'red': (204, 40, 44)}
for k, a in (('yellow', 0.85), ('white', 0.9), ('red', 0.92)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(cols[k], np.float32) * m * a

img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1400):                                     # segni delle ruote
    cx, cy = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(30, 200); a0 = random.uniform(0, 360)
    sd.arc([cx - ln, cy - ln, cx + ln, cy + ln], a0, a0 + random.uniform(10, 50), fill=(40, 60, 80, random.randint(8, 22)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img, 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.2 + (~groove) * 0.5, 1.2), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE bianche con la fascia gialla al piede
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
        d.rectangle([x - 2, 0, x + 2, h], fill=(210, 210, 206, 255))
    d.rectangle([0, h - 34, w, h], fill=YEL + (255,))              # fascia gialla al piede
    d.rectangle([0, 0, w, 6], fill=(200, 200, 196, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 26, int((xm + wm) * pxm), h - 52)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(260):
        x, y = random.uniform(0, w), random.uniform(h * 0.4, h - 34)
        r = random.uniform(3, 8)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 50, random.randint(14, 50)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def ghosts_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=BLACK + (255,))
    d.rectangle([x0, y1 - 12, x1, y1], fill=RED + (255,))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 8, y0 + 6, x0 + 8 + int(h * 0.95), y1 - 14))
    paste_fit(img, text_layer('GHOSTS', 'ariblk.ttf', WHITE, spacing=6), (x0 + int(h * 1.05) + 14, y0 + 12, x1 - 18, y0 + h * 0.58), 'left')
    paste_fit(img, text_layer('PADOVA • HOCKEY INLINE', 'arialbd.ttf', RED, spacing=4), (x0 + int(h * 1.05) + 14, y0 + h * 0.62, x1 - 18, y1 - 18), 'left')


def text_panel(top, tf, tc, bottom=None, bf=None, bc=None, bg=WHITE, border=None):
    def f(img, x0, y0, x1, y1):
        d = ImageDraw.Draw(img)
        d.rectangle([x0, y0, x1, y1], fill=bg + (255,), outline=(border or bg) + (255,), width=4)
        h = y1 - y0
        paste_fit(img, text_layer(top, tf, tc, spacing=4), (x0 + 24, y0 + 10, x1 - 24, y0 + h * (0.6 if bottom else 0.9)))
        if bottom:
            paste_fit(img, text_layer(bottom, bf, bc, spacing=4), (x0 + 40, y0 + h * 0.64, x1 - 40, y1 - 8))
    return f


panasonic = text_panel('Panasonic', 'arialbd.ttf', (20, 60, 150))
clima = text_panel('4clima.com', 'arialbd.ttf', (40, 40, 40), 'climatizzazione', 'arial.ttf', (60, 60, 60))
uisp = text_panel('UISP', 'ariblk.ttf', (20, 60, 150), 'SPORTPERTUTTI', 'arialbd.ttf', (20, 60, 150))
save(board_strip(panels=[(1.0, 4.2, ghosts_panel), (6.5, 3.4, panasonic), (11.0, 3.4, clima), (15.2, 2.6, uisp)]), 'boards_a.jpg')
save(board_strip(panels=[(2.0, 3.4, panasonic), (7.0, 4.2, ghosts_panel), (12.6, 3.4, clima)]), 'boards_b.jpg')
save(board_strip(panels=[(1.5, 4.2, ghosts_panel), (7.0, 2.6, uisp), (12.5, 4.2, ghosts_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256), 'boards_corner.jpg')

# ================================================================== 3. PARETI E TETTO
print('pareti e tetto')
# pannelli prefabbricati in cemento grigio chiaro (modulo 2,5 m x 1,25 m)
Wc, Hc = 512, 256
cc = np.zeros((Hc, Wc, 3), np.float32) + np.array([214, 214, 210], np.float32)
cc += ((fft_noise(Hc, Wc, beta=2.2) - 0.5) * 14)[..., None]
ci = to_img(cc)
cd = ImageDraw.Draw(ci)
cd.line([0, 0, Wc, 0], fill=(176, 176, 172), width=3)
cd.line([0, 0, 0, Hc], fill=(186, 186, 182), width=2)
for _ in range(40):                                        # colature e macchie leggere
    x = random.uniform(0, Wc); y = random.uniform(0, Hc * 0.5)
    cd.line([x, y, x + random.uniform(-3, 3), y + random.uniform(20, 90)], fill=(196, 196, 192), width=random.randint(2, 6))
save(ci.filter(ImageFilter.GaussianBlur(0.5)), 'concrete.jpg')

# lamiera grecata del tetto (vista da sotto)
Wl, Hl = 256, 256
la = np.zeros((Hl, Wl, 3), np.float32) + np.array([168, 172, 176], np.float32)
xs = np.arange(Wl)
rib = (np.sin(xs / Wl * np.pi * 2 * 4) * 0.5 + 0.5) ** 3
la += (rib * 40 - 18)[None, :, None]
la += ((fft_noise(Hl, Wl, beta=2.4) - 0.5) * 8)[..., None]
save(to_img(la), 'roof.jpg')

# fascia di lucernari traslucidi (sopra la tribuna)
Wt, Ht = 512, 128
tr = np.zeros((Ht, Wt, 3), np.float32) + np.array([224, 206, 160], np.float32)
tr += ((fft_noise(Ht, Wt, beta=1.8) - 0.5) * 40)[..., None]
ti = to_img(tr)
td = ImageDraw.Draw(ti)
for x in range(0, Wt, 64):
    td.line([x, 0, x, Ht], fill=(150, 40, 40), width=5)
save(ti, 'skylight.jpg')

# ================================================================== 4. STRISCIONI (solo nomi leggibili nelle foto)
print('striscioni')


def mk(name, w, h, bg, draw):
    b = Image.new('RGBA', (w, h), bg + (255,))
    draw(b, ImageDraw.Draw(b), w, h)
    save(banner_finish(b), name, quality=86)


def ghosts(b, d, w, h):
    paste_fit(b, LOGO, (30, 30, 260, h - 30))
    paste_fit(b, LOGO.transpose(Image.FLIP_LEFT_RIGHT), (w - 260, 30, w - 30, h - 30))
    paste_fit(b, text_layer('GHOSTS', 'ariblk.ttf', RED, spacing=10), (300, 50, w - 300, 220))
    paste_fit(b, text_layer('HOCKEY INLINE', 'arialbd.ttf', BLUE, spacing=6), (380, 230, w - 380, 270))
    paste_fit(b, text_layer('PADOVA', 'ariblk.ttf', RED, spacing=14), (340, 285, w - 340, 370))


mk('banner_ghosts.jpg', 1400, 400, (246, 246, 246), ghosts)


def coppa(b, d, w, h):
    for i, c in enumerate([(220, 40, 40), (250, 180, 40), (60, 170, 80), (40, 110, 210), (160, 60, 170)]):
        cx, cy, r = random.randint(0, w), random.randint(0, h), random.randint(80, 260)   # pennellate colorate
        d.ellipse([cx - r, cy - r * 0.6, cx + r, cy + r * 0.6], outline=c, width=26)
    b.alpha_composite(Image.new('RGBA', b.size, (255, 255, 255, 120)))
    paste_fit(b, text_layer('COPPA ITALIA', 'ariblk.ttf', BLACK, shear=-0.15, spacing=4), (40, 40, w - 40, 210))
    paste_fit(b, text_layer('2024', 'ariblk.ttf', (200, 40, 40), spacing=8), (w * 0.3, 220, w * 0.7, 300))
    paste_fit(b, text_layer('PADOVA', 'ariblk.ttf', BLACK, spacing=8), (w * 0.3, 310, w * 0.7, 370))


mk('banner_coppa.jpg', 1024, 400, (250, 236, 200), coppa)


def panasonic_b(b, d, w, h):
    paste_fit(b, text_layer('Panasonic', 'arialbd.ttf', (20, 60, 150), spacing=4), (60, 60, w - 60, h - 60))


mk('banner_panasonic.jpg', 1400, 320, (250, 250, 250), panasonic_b)


def forclima(b, d, w, h):
    paste_fit(b, text_layer('Panasonic', 'arialbd.ttf', (20, 60, 150), spacing=3), (100, 40, w * 0.55, 150), 'left')
    paste_fit(b, text_layer('idee per la vita', 'arial.ttf', (20, 60, 150), spacing=3), (w * 0.57, 70, w - 60, 140), 'left')
    paste_fit(b, text_layer('by FORCLIMA', 'arialbd.ttf', (30, 30, 30), spacing=4), (w * 0.35, 170, w - 100, 260))


mk('banner_forclima.jpg', 1200, 320, (232, 242, 250), forclima)


def clima_b(b, d, w, h):
    paste_fit(b, text_layer('4clima.com', 'arialbd.ttf', (30, 30, 30), spacing=4), (60, 30, w - 60, 200))
    paste_fit(b, text_layer('climatizzazione su internet', 'arial.ttf', (60, 60, 60), spacing=2), (100, 220, w - 100, 290))


mk('banner_4clima.jpg', 1100, 340, (250, 250, 250), clima_b)


def elettro(b, d, w, h):
    paste_fit(b, text_layer('4elettro', 'arialbd.ttf', (30, 30, 30), spacing=2), (60, 30, w - 60, 170))
    d.rectangle([w * 0.55, 180, w - 60, 240], fill=(230, 120, 30))
    paste_fit(b, text_layer('STORE', 'ariblk.ttf', WHITE, spacing=6), (w * 0.57, 186, w - 70, 234))
    paste_fit(b, text_layer('OUTLET di elettrodomestici', 'arial.ttf', (60, 60, 60), spacing=2), (60, 260, w - 60, 310))


mk('banner_4elettro.jpg', 800, 340, (250, 250, 250), elettro)


def advertendo(b, d, w, h):
    paste_fit(b, text_layer('advertendo', 'arialbd.ttf', (30, 30, 30), spacing=3), (60, 60, w - 60, h - 60))


mk('banner_advertendo.jpg', 900, 260, (250, 250, 250), advertendo)


def bedeschi(b, d, w, h):
    paste_fit(b, text_layer('BEDESCHI', 'ariblk.ttf', (200, 30, 30), spacing=8), (60, 50, w - 60, h - 50))


mk('banner_bedeschi.jpg', 900, 260, (250, 250, 250), bedeschi)


def sign(text):
    def f(b, d, w, h):
        paste_fit(b, text_layer(text, 'ariblk.ttf', BLACK, spacing=8), (40, 30, w - 40, h - 30))
    return f


for t in ('LOCALI', 'OSPITI'):
    b = Image.new('RGBA', (640, 160), (250, 250, 250, 255))
    sign(t)(b, ImageDraw.Draw(b), 640, 160)
    ImageDraw.Draw(b).rectangle([0, 0, 639, 159], outline=(60, 60, 60, 255), width=6)
    save(b, 'sign_%s.jpg' % t.lower())
print('fatto')
