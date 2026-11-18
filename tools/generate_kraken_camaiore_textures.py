"""Genera le texture del Pardini Sporting Center (Camaiore) in assets/textures/kraken_camaiore/.
Uso (dalla cartella del progetto): python tools/generate_kraken_camaiore_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
La pista è il parquet multisport della foto "arena_final" (assets/arenas/kraken_camaiore.jpg).
"""
import sys, os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'kraken_camaiore')
os.makedirs(OUT, exist_ok=True)
random.seed(2019)
rs = np.random.default_rng(2019)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'kraken_camaiore.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
NAVY, SKY, PINK = (26, 31, 92), (120, 190, 228), (226, 52, 120)
MUSTARD = (204, 150, 34)


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


# ================================================================== 1. PISTA: parquet chiaro multisport
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
# listelli da ~0,5 m x 0,07 m disposti lungo la pista (z), sfalsati a correre
SW, SL = 0.07, 0.5
X = (np.arange(W)[None, :] + 0.5) / S - RW / 2
Z = (np.arange(H)[:, None] + 0.5) / S - RL / 2
col_i = np.floor((X + RW / 2) / SW).astype(np.int64)
off = (col_i * 0.37) % 1.0
row_i = np.floor((Z + RL / 2) / SL + off).astype(np.int64)
stave_id = (col_i * 7919 + row_i * 104729) % 100003
tone = rs.uniform(-1, 1, 100003).astype(np.float32)[stave_id]
hue = rs.uniform(-1, 1, 100003).astype(np.float32)[stave_id]
grain = resized_noise(2048, 256, 1.6, H, W)               # venatura allungata lungo z
col = np.zeros((H, W, 3), np.float32) + np.array([222, 192, 146], np.float32)
col += tone[..., None] * np.array([18, 16, 12], np.float32)
col += hue[..., None] * np.array([6, 0, -8], np.float32)
col += ((grain - 0.5) * 22)[..., None]
# fughe tra i listelli
fx = ((X + RW / 2) / SW) % 1.0
fz = ((Z + RL / 2) / SL + off) % 1.0
joint = (fx < 0.06) | (fz < 0.012)
col[joint] *= 0.86
CR = 7.5
cx_, cz_ = RW / 2 - CR, RL / 2 - CR
outside = (np.abs(X) > cx_) & (np.abs(Z) > cz_) & (((np.abs(X) - cx_) ** 2 + (np.abs(Z) - cz_) ** 2) > CR ** 2)
col[outside] *= 0.8

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'white', 'blue', 'black')}
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


# hockey (rosso): linea centrale, cerchio centrale, linee di porta, aree semicircolari, punti d'ingaggio
rect('red', -RW / 2, -0.05, RW / 2, 0.05)
ring('red', 0, 0, 4.5, 0.06)
for sgn in (-1, 1):
    rect('red', -RW / 2 + 1.6, sgn * 31 - 0.04, RW / 2 - 1.6, sgn * 31 + 0.04)
    arc('red', 0, sgn * 31, 1.8, 180 if sgn > 0 else 0, 360 if sgn > 0 else 180, 0.06)
    for x in (-8.5, 8.5):
        ring('red', x, sgn * 21, 4.5, 0.05)
        rect('red', x - 0.15, sgn * 21 - 0.15, x + 0.15, sgn * 21 + 0.15)
        rect('red', x - 0.12, sgn * 9.5 - 0.12, x + 0.12, sgn * 9.5 + 0.12)
# basket (bianco): campo 15 x 28 al centro, cerchio, aree e linee da tre
outline('white', -7.5, -14, 7.5, 14, 0.05)
rect('white', -7.5, -0.025, 7.5, 0.025)
ring('white', 0, 0, 1.8, 0.05)
for sgn in (-1, 1):
    zb = sgn * 14
    outline('white', -2.45, min(zb, zb - sgn * 5.8), 2.45, max(zb, zb - sgn * 5.8), 0.05)
    arc('white', 0, zb - sgn * 5.8, 1.8, 0 if sgn > 0 else 180, 180 if sgn > 0 else 360, 0.05)
    arc('white', 0, zb - sgn * 1.6, 6.75, 180 if sgn > 0 else 0, 360 if sgn > 0 else 180, 0.05)
# pallavolo (blu): campo 9 x 18
outline('blue', -4.5, -9, 4.5, 9, 0.05)
rect('blue', -4.5, -3.0, 4.5, -2.95); rect('blue', -4.5, 2.95, 4.5, 3.0)
# calcetto (bianco esterno) e linee nere trasversali
outline('white', -10, -20, 10, 20, 0.05)
for z in (-8.0, 8.0):
    rect('black', -RW / 2 + 0.5, z - 0.025, RW / 2 - 0.5, z + 0.025)
cols = {'red': (200, 34, 40), 'white': (246, 246, 242), 'blue': (52, 110, 200), 'black': (26, 26, 28)}
for k in ('black', 'blue', 'white', 'red'):
    m = np.asarray(masks[k].resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * 0.92) + np.array(cols[k], np.float32) * m * 0.92

img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1400):                                  # segni di ruote sul parquet
    px, py = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(20, 160); a0 = random.uniform(0, 180)
    sd.arc([px - ln, py - ln, px + ln, py + ln], a0, a0 + random.uniform(15, 60), fill=(70, 50, 30, random.randint(6, 18)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)
hn = grain * 0.4 + joint.astype(np.float32) * -0.6
save(normal_from_height(hn * 2.0, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE: avorio con zoccolo senape
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([240, 232, 210], np.float32)
    arr += ((n - 0.5) * 10)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.line([(x, 0), (x, h)], fill=(206, 198, 176, 255), width=3)
    d.rectangle([0, h - 40, w, h], fill=MUSTARD + (255,))
    d.rectangle([0, h - 42, w, h - 40], fill=(150, 104, 20, 255))
    d.rectangle([0, 0, w, 5], fill=(222, 214, 192, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 18, int((xm + wm) * pxm), h - 52)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(220):
        x, y = random.uniform(0, w), random.uniform(h * 0.4, h - 44)
        r = random.uniform(3, 9)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 44, random.randint(20, 60)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def kraken_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=NAVY + (255,))
    d.rectangle([x0, y1 - 10, x1, y1], fill=PINK + (255,))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 10, y0 + 4, x0 + 10 + h, y1 - 12))
    paste_fit(img, text_layer('KRAKEN CAMAIORE', 'ariblk.ttf', (255, 255, 255)), (x0 + h + 26, y0 + 20, x1 - 20, y0 + h // 2 + 6), 'left')
    paste_fit(img, text_layer('HOCKEY IN LINE', 'arialbd.ttf', SKY, spacing=6), (x0 + h + 26, y0 + h // 2 + 16, x1 - 20, y1 - 22), 'left')


def phone_island(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(20, 26, 70, 255))
    paste_fit(img, text_layer('PHONE ISLAND', 'ariblk.ttf', (255, 255, 255), spacing=4), (x0 + 30, y0 + 22, x1 - 30, y0 + (y1 - y0) * 2 // 3))
    paste_fit(img, text_layer('RIPARAZIONI SMARTPHONE', 'arialbd.ttf', SKY, spacing=4), (x0 + 60, y0 + (y1 - y0) * 2 // 3 + 4, x1 - 60, y1 - 16))


save(board_strip(), 'boards_a.jpg')
save(board_strip(), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 4.2, phone_island), (11.0, 4.4, kraken_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256), 'boards_corner.jpg')

# ================================================================== 3. TELI E RETI
print('teli')
W = H = 512
n = fft_noise(H, W, beta=2.4)
white = np.zeros((H, W, 3), np.float32) + np.array([244, 245, 246], np.float32)
white += ((n - 0.5) * 10)[..., None]
save(to_img(white), 'membrane_white.jpg')
green = np.zeros((H, W, 3), np.float32) + np.array([14, 82, 62], np.float32)
green += ((n - 0.5) * 12)[..., None]
u = np.arange(W)[None, :] / W                          # pieghe verticali della tenda
green *= (1 - 0.12 * (0.5 + 0.5 * np.sin(u * math.pi * 2 * 6)))[..., None]
save(to_img(green), 'membrane_green.jpg')

# rete bianca (maglia 12 cm) su sfondo trasparente
NW = 128
net = Image.new('RGBA', (NW, NW), (0, 0, 0, 0))
nd = ImageDraw.Draw(net)
nd.line([(0, 0), (NW, NW)], fill=(236, 238, 240, 240), width=9)
nd.line([(NW, 0), (0, NW)], fill=(236, 238, 240, 240), width=9)
net.save(os.path.join(OUT, 'net_white.png'))
print('   net_white.png')

# cartello COPRISCOPRI sulla testata
cp = Image.new('RGBA', (512, 128), (238, 236, 220, 255))
cd = ImageDraw.Draw(cp)
cd.rectangle([0, 0, 511, 127], outline=(120, 110, 80, 255), width=6)
paste_fit(cp, text_layer('COPRISCOPRI', 'ariblk.ttf', (60, 70, 60), spacing=4), (24, 24, 488, 104))
save(cp, 'sign_copriscopri.jpg')

# striscione del Kraken
b = Image.new('RGBA', (1024, 256), NAVY + (255,))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 214, 1024, 256], fill=PINK)
paste_fit(b, LOGO, (20, 10, 236, 210))
paste_fit(b, text_layer('KRAKEN CAMAIORE', 'ariblk.ttf', (255, 255, 255)), (260, 30, 1000, 130), 'left')
paste_fit(b, text_layer('HOCKEY IN LINE • TOSCANA', 'arialbd.ttf', SKY, spacing=6), (260, 140, 1000, 200), 'left')
save(banner_finish(b), 'banner_kraken.jpg', quality=86)
pb = Image.new('RGBA', (1024, 256), (255, 255, 255, 255))
paste_fit(pb, text_layer('PHONE ISLAND', 'ariblk.ttf', NAVY, spacing=6), (60, 30, 964, 160))
paste_fit(pb, text_layer('RIPARAZIONI SMARTPHONE', 'arialbd.ttf', (90, 140, 200), spacing=6), (160, 170, 864, 220))
save(banner_finish(pb), 'banner_phoneisland.jpg', quality=86)
print('fatto')
