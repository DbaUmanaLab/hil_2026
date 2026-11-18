"""Genera le texture del Palamunicipio Roma XI (Mammuth Roma) in assets/textures/roma/.
Uso (dalla cartella del progetto): python tools/generate_roma_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/roma.jpg (parquet d'acero con le linee di basket, pallavolo e calcetto,
balaustre bianche con il vetro, cupola geodetica con telo color crema, pareti basse verde scuro).
"""
import sys, os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'roma')
os.makedirs(OUT, exist_ok=True)
random.seed(2011)
rs = np.random.default_rng(2011)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'roma.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
MAROON, GOLD = (110, 28, 40), (242, 165, 22)
TEAL = (24, 74, 66)


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


# ================================================================== 1. PISTA: parquet d'acero con linee multisport
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
SW, SL = 0.07, 0.6                                          # listelli stretti, posa a correre lungo la pista
X = (np.arange(W)[None, :] + 0.5) / S - RW / 2
Z = (np.arange(H)[:, None] + 0.5) / S - RL / 2
col_i = np.floor((X + RW / 2) / SW).astype(np.int64)
off = (col_i * 0.41) % 1.0
row_i = np.floor((Z + RL / 2) / SL + off).astype(np.int64)
stave_id = (col_i * 7919 + row_i * 104729) % 100003
tone = rs.uniform(-1, 1, 100003).astype(np.float32)[stave_id]
grain = resized_noise(2048, 256, 1.6, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([226, 196, 148], np.float32)
col += tone[..., None] * np.array([20, 17, 12], np.float32)
col += ((grain - 0.5) * 20)[..., None]
fx = ((X + RW / 2) / SW) % 1.0
fz = ((Z + RL / 2) / SL + off) % 1.0
joint = (fx < 0.06) | (fz < 0.012)
col[joint] *= 0.88
CR = 7.5
cx_, cz_ = RW / 2 - CR, RL / 2 - CR
outside = (np.abs(X) > cx_) & (np.abs(Z) > cz_) & (((np.abs(X) - cx_) ** 2 + (np.abs(Z) - cz_) ** 2) > CR ** 2)
col[outside] *= 0.82

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'white', 'blue', 'green')}
draws = {k: ImageDraw.Draw(m) for k, m in masks.items()}
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)


def rect(k, x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    draws[k].rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def ring(k, x, z, r, wdt):
    c = P(x, z); R = r * S * SS
    draws[k].ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], outline=255, width=max(1, int(wdt * S * SS)))


def arc(k, x, z, r, a0, a1, wdt):
    c = P(x, z); R = r * S * SS
    draws[k].arc([c[0] - R, c[1] - R, c[0] + R, c[1] + R], a0, a1, fill=255, width=max(1, int(wdt * S * SS)))


def outline(k, x0, z0, x1, z1, t):
    rect(k, x0, z0, x1, z0 + t); rect(k, x0, z1 - t, x1, z1)
    rect(k, x0, z0, x0 + t, z1); rect(k, x1 - t, z0, x1, z1)


# hockey (rosso)
rect('red', -RW / 2, -0.05, RW / 2, 0.05)
ring('red', 0, 0, 4.5, 0.06)
for sgn in (-1, 1):
    rect('red', -RW / 2 + 1.6, sgn * 31 - 0.04, RW / 2 - 1.6, sgn * 31 + 0.04)
    arc('red', 0, sgn * 31, 1.8, 180 if sgn > 0 else 0, 360 if sgn > 0 else 180, 0.06)
    for x in (-8.5, 8.5):
        ring('red', x, sgn * 21, 4.5, 0.05)
        rect('red', x - 0.15, sgn * 21 - 0.15, x + 0.15, sgn * 21 + 0.15)
        rect('red', x - 0.12, sgn * 9.5 - 0.12, x + 0.12, sgn * 9.5 + 0.12)
# basket (blu): cerchio centrale e linee da tre
outline('blue', -7.5, -14, 7.5, 14, 0.05)
ring('blue', 0, 0, 1.8, 0.06)
for sgn in (-1, 1):
    zb = sgn * 14
    arc('blue', 0, zb - sgn * 1.6, 6.75, 180 if sgn > 0 else 0, 360 if sgn > 0 else 180, 0.06)
    outline('blue', -2.45, min(zb, zb - sgn * 5.8), 2.45, max(zb, zb - sgn * 5.8), 0.05)
# calcetto (bianco): campo 20 x 40 con le aree e il dischetto tratteggiato
outline('white', -10, -20, 10, 20, 0.05)
rect('white', -10, -0.025, 10, 0.025)
for sgn in (-1, 1):
    zg = sgn * 20
    arc('white', 0, zg, 6.0, 180 if sgn > 0 else 0, 360 if sgn > 0 else 180, 0.05)
    for xd in np.arange(-6, 6.01, 0.6):
        rect('white', xd - 0.15, zg - sgn * 10 - 0.03, xd + 0.15, zg - sgn * 10 + 0.03)
# pallavolo / linee lunghe (verde)
rect('green', -RW / 2 + 1.2, -RL / 2 + 6, -RW / 2 + 1.27, RL / 2 - 6)
rect('green', RW / 2 - 1.27, -RL / 2 + 6, RW / 2 - 1.2, RL / 2 - 6)
outline('green', -4.5, -9, 4.5, 9, 0.05)
cols = {'red': (196, 40, 40), 'white': (246, 246, 242), 'blue': (40, 70, 190), 'green': (30, 130, 70)}
for k in ('green', 'blue', 'white', 'red'):
    m = np.asarray(masks[k].resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * 0.92) + np.array(cols[k], np.float32) * m * 0.92

img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1400):
    px, py = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(20, 160); a0 = random.uniform(0, 180)
    sd.arc([px - ln, py - ln, px + ln, py + ln], a0, a0 + random.uniform(15, 60), fill=(70, 50, 30, random.randint(6, 16)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)
save(normal_from_height(grain * 0.4 + joint.astype(np.float32) * -0.6, 2.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE: bianche con pannelli
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([244, 244, 240], np.float32)
    arr += ((n - 0.5) * 8)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.line([(x, 0), (x, h)], fill=(214, 214, 208, 255), width=3)
    d.rectangle([0, h - 26, w, h], fill=(206, 206, 200, 255))
    d.rectangle([0, 0, w, 5], fill=(228, 228, 222, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 16, int((xm + wm) * pxm), h - 36)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(240):
        x, y = random.uniform(0, w), random.uniform(h * 0.4, h - 30)
        r = random.uniform(3, 9)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 44, random.randint(20, 60)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def mammuth_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=MAROON + (255,))
    d.rectangle([x0, y1 - 10, x1, y1], fill=GOLD + (255,))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 10, y0 + 4, x0 + 10 + h, y1 - 12))
    paste_fit(img, text_layer('MAMMUTH', 'ariblk.ttf', GOLD), (x0 + h + 26, y0 + 18, x1 - 20, y0 + h // 2 + 6), 'left')
    paste_fit(img, text_layer('HOCKEY ROMA', 'arialbd.ttf', (255, 255, 255), spacing=6), (x0 + h + 26, y0 + h // 2 + 14, x1 - 20, y1 - 22), 'left')


def logo_panel(img, x0, y0, x1, y1):
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + (x1 - x0 - h) // 2, y0 + 2, x0 + (x1 - x0 + h) // 2, y1 - 2))


def municipio_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=MAROON + (255,), width=6)
    paste_fit(img, text_layer('PALAMUNICIPIO', 'ariblk.ttf', MAROON, spacing=4), (x0 + 30, y0 + 18, x1 - 30, y0 + (y1 - y0) * 3 // 5))
    paste_fit(img, text_layer('ROMA XI', 'arialbd.ttf', (40, 40, 44), spacing=10), (x0 + 120, y0 + (y1 - y0) * 3 // 5 + 2, x1 - 120, y1 - 12))


def inline_panel(img, x0, y0, x1, y1):
    paste_fit(img, text_layer('HOCKEY IN LINE', 'impact.ttf', (30, 60, 140), spacing=6), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


save(board_strip(panels=[(1.5, 1.3, logo_panel), (8.0, 4.2, inline_panel), (15.0, 1.3, logo_panel)]), 'boards_a.jpg')
save(board_strip(panels=[(2.5, 4.4, municipio_panel), (11.5, 1.3, logo_panel)]), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 4.4, mammuth_panel), (11.0, 4.4, municipio_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256, panels=[(7.0, 4.0, logo_panel)]), 'boards_corner.jpg')

# ================================================================== 3. EDIFICIO
print('edificio')
# telo della cupola: crema con leggere pieghe
W = H = 512
n = fft_noise(H, W, beta=2.4)
mem = np.zeros((H, W, 3), np.float32) + np.array([240, 230, 208], np.float32)
mem += ((n - 0.5) * 16)[..., None]
save(to_img(mem), 'membrane.jpg')
# pareti basse: pannelli verde scuro
n = fft_noise(H, W, beta=1.8)
wall = np.zeros((H, W, 3), np.float32) + np.array(TEAL, np.float32)
wall += ((n - 0.5) * 14)[..., None]
wi = to_img(wall)
wd = ImageDraw.Draw(wi)
for x in range(0, W, 128):
    wd.line([(x, 0), (x, H)], fill=(16, 52, 46), width=4)
save(wi, 'wall_green.jpg')

# ================================================================== 4. STRISCIONI E BANDIERA
print('striscioni')
b = Image.new('RGBA', (1024, 512), (255, 255, 255, 255))
paste_fit(b, LOGO, (40, 30, 470, 482))
paste_fit(b, text_layer('MAMMUTH', 'ariblk.ttf', MAROON), (490, 90, 990, 260), 'left')
paste_fit(b, text_layer('HOCKEY ROMA', 'arialbd.ttf', GOLD, spacing=8), (490, 290, 990, 400), 'left')
save(banner_finish(b), 'banner_mammuth.jpg', quality=86)
fl = Image.new('RGB', (600, 400))
fd = ImageDraw.Draw(fl)
for i, c in enumerate([(0, 146, 70), (255, 255, 255), (206, 43, 55)]):
    fd.rectangle([i * 200, 0, i * 200 + 200, 400], fill=c)
save(fl, 'flag_italy.jpg')
rb = Image.new('RGBA', (1024, 256), (180, 30, 36, 255))
paste_fit(rb, text_layer('FORZA MAMMUTH', 'ariblk.ttf', (255, 255, 255), spacing=8), (60, 40, 964, 216))
save(banner_finish(rb), 'banner_red.jpg', quality=86)
wb = Image.new('RGBA', (1024, 256), (250, 250, 248, 255))
paste_fit(wb, text_layer('HOCKEY IN LINE • ROMA', 'arialbd.ttf', (30, 60, 140), spacing=6), (60, 60, 964, 196))
save(banner_finish(wb), 'banner_white.jpg', quality=86)

# rete bianca (per la porta da calcetto)
NW = 128
net = Image.new('RGBA', (NW, NW), (0, 0, 0, 0))
nd = ImageDraw.Draw(net)
nd.line([(0, 0), (NW, 0)], fill=(240, 240, 240, 235), width=8)
nd.line([(0, 0), (0, NW)], fill=(240, 240, 240, 235), width=8)
net.save(os.path.join(OUT, 'net_white.png'))
print('   net_white.png')
print('fatto')
