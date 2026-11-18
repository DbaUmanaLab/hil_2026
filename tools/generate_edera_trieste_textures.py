"""Genera le texture del Pattinodromo Edera (Trieste) in assets/textures/edera_trieste/.
Uso (dalla cartella del progetto): python tools/generate_edera_trieste_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Le bandiere italiana e slovena sono riusate da assets/textures/forli/flags/.
"""
import sys, os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'edera_trieste')
os.makedirs(OUT, exist_ok=True)
random.seed(1904)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'edera_trieste.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
RED, GREEN, NAVY = (215, 38, 46), (29, 122, 58), (34, 52, 92)
FRAME_GREEN = (36, 84, 60)


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


# ================================================================== 1. PISTA: piastrelle azzurro chiaro, linee sottili scure
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
base = resized_noise(1024, 512, 2.3, H, W)
fine = resized_noise(1024, 512, 1.2, H, W)
X = (np.arange(W)[None, :] + 0.5) / S - RW / 2
Z = (np.arange(H)[:, None] + 0.5) / S - RL / 2
col = np.zeros((H, W, 3), np.float32) + np.array([176, 212, 232], np.float32)
col += ((base - 0.5) * 16)[..., None] + ((fine - 0.5) * 6)[..., None]
TILE = 0.25
gx = (np.abs(((X / TILE) % 1) - 0.5) > 0.47)
gz = (np.abs(((Z / TILE) % 1) - 0.5) > 0.47)
col[np.broadcast_to(gx | gz, (H, W))] *= 0.965
CR = 7.5
cx_, cz_ = RW / 2 - CR, RL / 2 - CR
outside = (np.abs(X) > cx_) & (np.abs(Z) > cz_) & (((np.abs(X) - cx_) ** 2 + (np.abs(Z) - cz_) ** 2) > CR ** 2)
col[outside] *= 0.8

SS = 2
line_m = Image.new('L', (W * SS, H * SS), 0)
ld = ImageDraw.Draw(line_m)
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)


def rect(d, x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    d.rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def ring(d, x, z, r, wdt):
    c = P(x, z); R = r * S * SS
    d.ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], outline=255, width=max(1, int(wdt * S * SS)))


rect(ld, -RW / 2, -0.04, RW / 2, 0.04)                 # linea centrale sottile
ring(ld, 0, 0, 4.5, 0.05)
for sgn in (-1, 1):
    rect(ld, -RW / 2 + 1.6, sgn * 31 - 0.03, RW / 2 - 1.6, sgn * 31 + 0.03)
    # area di porta rettangolare, solo il contorno (come nelle foto)
    z0, z1 = sgn * 31, sgn * (31 - 1.4)
    for (a, b, c, d) in [(-1.6, z0, -1.56, z1), (1.56, z0, 1.6, z1), (-1.6, z1 - 0.02, 1.6, z1 + 0.02)]:
        rect(ld, a, min(b, d), c, max(b, d))
    for x in (-8.5, 8.5):
        ring(ld, x, sgn * 21, 4.5, 0.05)
        rect(ld, x - 0.12, sgn * 21 - 0.12, x + 0.12, sgn * 21 + 0.12)
        rect(ld, x - 0.1, sgn * 9.5 - 0.1, x + 0.1, sgn * 9.5 + 0.1)
lm = np.asarray(line_m.resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
col = col * (1 - lm * 0.7) + np.array(NAVY, np.float32) * lm * 0.7

img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1800):                                  # segni di ruote
    px, py = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(20, 160); a0 = random.uniform(0, 180)
    sd.arc([px - ln, py - ln, px + ln, py + ln], a0, a0 + random.uniform(15, 60), fill=(50, 70, 90, random.randint(8, 22)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)
hn = base * 0.5 + fine * 0.3 + (gx | gz).astype(np.float32) * -0.2
save(normal_from_height(np.broadcast_to(hn, (H, W)) * 2.5, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE: bianche con zoccolo blu
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([236, 238, 236], np.float32)
    arr += ((n - 0.5) * 12)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.line([(x, 0), (x, h)], fill=(198, 204, 206, 255), width=3)
    d.rectangle([0, h - 30, w, h], fill=(38, 120, 196, 255))     # zoccolo blu
    d.rectangle([0, h - 32, w, h - 30], fill=(22, 80, 140, 255))
    d.rectangle([0, 0, w, 5], fill=(214, 218, 218, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 18, int((xm + wm) * pxm), h - 40)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(260):                                # segni dei dischi
        x, y = random.uniform(0, w), random.uniform(h * 0.4, h - 34)
        r = random.uniform(3, 9)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 44, 50, random.randint(25, 70)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def edera_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=RED + (255,), width=4)
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 10, y0 + 6, x0 + 10 + h, y1 - 6))
    paste_fit(img, text_layer('A.S.D. EDERA TRIESTE', 'ariblk.ttf', RED), (x0 + h + 26, y0 + 22, x1 - 20, y0 + h // 2 + 8), 'left')
    paste_fit(img, text_layer('HOCKEY IN LINE • DAL 1904', 'arialbd.ttf', GREEN, spacing=4), (x0 + h + 26, y0 + h // 2 + 20, x1 - 20, y1 - 20), 'left')


save(board_strip(), 'boards_a.jpg')
save(board_strip(), 'boards_b.jpg')
save(board_strip(panels=[(7.0, 4.4, edera_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256), 'boards_corner.jpg')

# ================================================================== 3. PARETI E VETRATE
print('pareti')
# intonaco azzurro chiaro (tileable, 4 m x 4 m)
W = H = 512
n = fft_noise(H, W, beta=2.2)
wall = np.zeros((H, W, 3), np.float32) + np.array([196, 218, 236], np.float32)
wall += ((n - 0.5) * 14)[..., None]
save(to_img(wall), 'wall_blue.jpg')

# vetrata a tutta altezza: cella 3 m x 3 m con montanti verdi, cielo e alberi fuori
W = H = 512
cell = Image.new('RGB', (W, H))
cd = ImageDraw.Draw(cell)
for y in range(H):
    t = y / H
    cd.line([(0, y), (W, y)], fill=(int(206 + 30 * t), int(226 + 20 * t), int(240 + 10 * t)))
tr = Image.new('RGBA', (W, H), (0, 0, 0, 0))
td = ImageDraw.Draw(tr)
for _ in range(70):                                     # chiome degli alberi
    x, y = random.uniform(-40, W + 40), random.uniform(H * 0.25, H * 0.9)
    r = random.uniform(30, 80)
    g = random.randint(70, 120)
    td.ellipse([x - r, y - r, x + r, y + r], fill=(int(g * 0.55), g, int(g * 0.5), 210))
for _ in range(12):                                     # tronchi
    x = random.uniform(0, W)
    td.line([(x, H * 0.55), (x + random.uniform(-10, 10), H)], fill=(70, 60, 50, 200), width=random.randint(4, 8))
cell.paste(tr.filter(ImageFilter.GaussianBlur(2.5)), (0, 0), tr.filter(ImageFilter.GaussianBlur(2.5)))
ca = np.asarray(cell).astype(np.float32)
ca = ca * 0.82 + np.array([230, 240, 248], np.float32) * 0.18   # riflesso del vetro
cell = to_img(ca)
cd = ImageDraw.Draw(cell)
cd.rectangle([0, 0, W, 14], fill=FRAME_GREEN); cd.rectangle([0, H - 14, W, H], fill=FRAME_GREEN)
cd.rectangle([0, 0, 14, H], fill=FRAME_GREEN); cd.rectangle([W - 14, 0, W, H], fill=FRAME_GREEN)
cd.rectangle([0, H // 2 - 5, W, H // 2 + 5], fill=FRAME_GREEN)
save(cell, 'facade_glass.jpg')

# finestre a nastro in alto (cella 2,4 m x 1,6 m)
W, H = 480, 320
win = Image.new('RGB', (W, H), (224, 238, 246))
wd = ImageDraw.Draw(win)
for y in range(H):
    wd.line([(0, y), (W, y)], fill=(int(214 + 26 * y / H), int(232 + 14 * y / H), 246))
for _ in range(10):
    x, y, r = random.uniform(0, W), random.uniform(H * 0.5, H), random.uniform(20, 50)
    wd.ellipse([x - r, y - r, x + r, y + r], fill=(110, 140, 100))
win = win.filter(ImageFilter.GaussianBlur(2))
wd = ImageDraw.Draw(win)
wd.rectangle([0, 0, W, 16], fill=FRAME_GREEN); wd.rectangle([0, H - 16, W, H], fill=FRAME_GREEN)
wd.rectangle([0, 0, 16, H], fill=FRAME_GREEN); wd.rectangle([W - 16, 0, W, H], fill=FRAME_GREEN)
save(win, 'ribbon_window.jpg')

# ================================================================== 4. STRISCIONI
print('striscioni')


def banner(name, w=1024, h=256):
    img = Image.new('RGBA', (w, h), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    m = int(h * 0.12)
    if name == 'zkb':
        d.rectangle([m, m, m + h - 2 * m, h - m], fill=(0, 130, 70))
        paste_fit(img, text_layer('ZKB', 'ariblk.ttf', (255, 255, 255)), (m + 16, m + 30, m + h - 2 * m - 16, h - m - 30))
        paste_fit(img, text_layer('ZADRUŽNA KRAŠKA BANKA', 'arialbd.ttf', (0, 110, 60)), (h + m, int(h * 0.3), w - m, int(h * 0.7)), 'left')
    elif name == 'zssdi':
        d.ellipse([m, m, h - m, h - m], fill=(40, 150, 90))
        d.ellipse([m + 30, m + 30, h - m - 30, h - m - 30], fill=(60, 140, 200))
        paste_fit(img, text_layer('ZSŠDI', 'ariblk.ttf', (30, 60, 120), spacing=6), (h + m, int(h * 0.14), w - m, int(h * 0.62)), 'left')
        paste_fit(img, text_layer('SPORT • TRST', 'arialbd.ttf', (110, 110, 110), spacing=6), (h + m, int(h * 0.66), int(w * 0.75), h - m), 'left')
    elif name == 'edera':
        paste_fit(img, LOGO, (m, m // 2, m + h - m, h - m // 2))
        paste_fit(img, text_layer('EDERA TRIESTE', 'ariblk.ttf', RED), (h + m, int(h * 0.12), w - m, int(h * 0.6)), 'left')
        paste_fit(img, text_layer('HOCKEY IN LINE', 'arialbd.ttf', GREEN, spacing=8), (h + m, int(h * 0.64), w - m, int(h * 0.86)), 'left')
    return banner_finish(img)


for nm in ['zkb', 'zssdi', 'edera']:
    save(banner(nm), f'banner_{nm}.jpg', quality=86)

# cartello di uscita di emergenza
ex = Image.new('RGB', (256, 128), (20, 140, 70))
ed = ImageDraw.Draw(ex)
ed.rectangle([150, 20, 236, 108], outline=(255, 255, 255), width=6)
ed.polygon([(40, 64), (100, 30), (100, 50), (140, 50), (140, 78), (100, 78), (100, 98)], fill=(255, 255, 255))
save(ex, 'exit_sign.jpg')
print('fatto')
