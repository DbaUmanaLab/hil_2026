"""Genera le texture del Polideportivo Carlos García (Molina Sport ACEGC, Las Palmas de Gran Canaria)
in assets/textures/molina/.
Uso (dalla cartella del progetto): python tools/generate_molina_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/molina.png (palazzetto con capriate in acciaio blu scuro e lucernari, pareti
pesca con la fascia arancio-gialla in basso, tribune blu, pista in resina azzurra multisport con le linee
gialle, bianche e rosse, balaustre bianche con lo zoccolo arancio, striscioni e gagliardetti dei club).
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'molina')
os.makedirs(OUT, exist_ok=True)
random.seed(35)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'molina.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
RFEP = Image.open(os.path.join(ROOT, 'assets', 'logos', 'rfep.png')).convert('RGBA')
RFEP = RFEP.crop(RFEP.getbbox())
YEL, BLUE, BLACK, WHITE = (245, 200, 20), (31, 79, 181), (22, 22, 24), (255, 255, 255)
ORANGE = (232, 160, 40)


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


# ================================================================== 1. PISTA: resina azzurra multisport
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
n1 = resized_noise(512, 256, 2.0, H, W)
n2 = resized_noise(128, 64, 2.6, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([128, 178, 212], np.float32)
col += ((n1 - 0.5) * 12)[..., None]
col += ((n2 - 0.5) * 14)[..., None]
# piastrelle modulari (come nelle foto): griglia appena visibile
X = (np.arange(W)[None, :] + 0.5) / S - RW / 2
Z = (np.arange(H)[:, None] + 0.5) / S - RL / 2
grid = np.broadcast_to((((X + RW / 2) / 0.25) % 1.0) < 0.04, (H, W)) | np.broadcast_to((((Z + RL / 2) / 0.25) % 1.0) < 0.04, (H, W))
col[grid] *= 0.95

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'white', 'yellow', 'blue')}
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


def line(k, a, b, wdt):
    draws[k].line([P(*a), P(*b)], fill=255, width=max(1, int(wdt * S * SS)))


def dot(k, x, z, r):
    c = P(x, z); R = r * S * SS
    draws[k].ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], fill=255)


# hockey (rosso)
rect('red', -RW / 2, -0.07, RW / 2, 0.07)
ring('red', 0, 0, 4.5, 0.07)
for sgn in (-1, 1):
    rect('red', -RW / 2 + 1.4, sgn * 31 - 0.05, RW / 2 - 1.4, sgn * 31 + 0.05)
    arc('red', 0, sgn * 31, 1.8, 180 if sgn > 0 else 0, 360 if sgn > 0 else 180, 0.06)
    for x in (-8.5, 8.5):
        ring('red', x, sgn * 21, 4.5, 0.06)
        rect('red', x - 0.35, sgn * 21 - 0.25, x + 0.35, sgn * 21 + 0.25)
# pallavolo/calcetto (giallo): rettangolo, linee d'attacco tratteggiate e area di porta
rect('yellow', -12, -24.05, 12, -23.95); rect('yellow', -12, 23.95, 12, 24.05)
rect('yellow', -12.05, -24, -11.95, 24); rect('yellow', 11.95, -24, 12.05, 24)
for sgn in (-1, 1):
    for i in range(24):
        rect('yellow', -12 + i * 1.0, sgn * 8 - 0.04, -12 + i * 1.0 + 0.5, sgn * 8 + 0.04)
# pallamano/basket (bianco): linee laterali, aree semicircolari
rect('white', -16.6, -34, -16.5, 34); rect('white', 16.5, -34, 16.6, 34)
for sgn in (-1, 1):
    rect('white', -16.6, sgn * 34 - 0.05, 16.6, sgn * 34 + 0.05)
    arc('white', 0, sgn * 34, 9, 180 if sgn > 0 else 0, 360 if sgn > 0 else 180, 0.06)
    for i in range(18):
        a0 = (180 if sgn > 0 else 0) + i * 10
        arc('white', 0, sgn * 34, 13, a0, a0 + 5, 0.06)
# riquadri blu scuro e rossi (zone di servizio, come nelle foto)
rect('blue', -RW / 2 + 1.5, 26, -RW / 2 + 8, 33.5)
rect('red', 5, 12, 8, 13.6)
for z in (-14, 14):
    dot('red', 0, z, 0.25)

cols = {'red': (206, 64, 52), 'white': (238, 240, 240), 'yellow': (226, 206, 60), 'blue': (34, 62, 128)}
for k, a in (('blue', 0.85), ('white', 0.75), ('yellow', 0.8), ('red', 0.9)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(cols[k], np.float32) * m * a

img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1400):                                     # riflessi e segni delle ruote
    px, py = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(20, 160); a0 = random.uniform(0, 180)
    sd.arc([px - ln, py - ln, px + ln, py + ln], a0, a0 + random.uniform(10, 50), fill=(40, 70, 90, random.randint(6, 14)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.3 + n2 * 0.2 - grid.astype(np.float32) * 0.25, 0.8), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE bianche con lo zoccolo arancio
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([242, 242, 240], np.float32)
    arr += ((n - 0.5) * 8)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.rectangle([x - 2, 0, x + 2, h], fill=(212, 212, 210, 255))
    d.rectangle([0, h - 58, w, h], fill=ORANGE + (255,))          # zoccolo arancio-giallo
    d.rectangle([0, h - 60, w, h - 58], fill=(196, 128, 24, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 18, int((xm + wm) * pxm), h - 74)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(240):
        x, y = random.uniform(0, w), random.uniform(h * 0.4, h - 60)
        r = random.uniform(3, 8)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 50, random.randint(14, 50)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def molina_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=BLACK + (255,))
    d.rectangle([x0, y1 - 10, x1, y1], fill=YEL + (255,))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 6, y0 + 4, x0 + 6 + h - 8, y1 - 12))
    paste_fit(img, text_layer('MOLINA SPORT', 'ariblk.ttf', YEL, spacing=6), (x0 + h + 14, y0 + 16, x1 - 20, y0 + h * 0.6), 'left')
    paste_fit(img, text_layer('HOCKEY LÍNEA • GRAN CANARIA', 'arialbd.ttf', WHITE, spacing=4), (x0 + h + 14, y0 + h * 0.64, x1 - 20, y1 - 18), 'left')


def palmas_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=BLUE + (255,), width=5)
    paste_fit(img, text_layer('LAS PALMAS', 'ariblk.ttf', BLUE, spacing=6), (x0 + 30, y0 + 12, x1 - 30, y0 + (y1 - y0) * 0.6))
    paste_fit(img, text_layer('DE GRAN CANARIA', 'arialbd.ttf', (232, 160, 40), spacing=8), (x0 + 60, y0 + (y1 - y0) * 0.64, x1 - 60, y1 - 10))


def rfep_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=(30, 40, 80, 255), width=4)
    paste_fit(img, RFEP, (x0 + 20, y0 + 8, x1 - 20, y1 - 8))


save(board_strip(panels=[(3.0, 4.4, molina_panel), (12.0, 3.4, rfep_panel)]), 'boards_a.jpg')
save(board_strip(panels=[(2.5, 4.4, palmas_panel), (11.5, 4.4, molina_panel)]), 'boards_b.jpg')
save(board_strip(panels=[(2.0, 4.4, molina_panel), (8.0, 4.4, palmas_panel), (13.5, 3.4, rfep_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256), 'boards_corner.jpg')

# ================================================================== 3. PARETI, TETTO, TRIBUNE
print('pareti e tetto')
# parete: pesca in alto, fascia arancio-gialla in basso (lo stacco cade a 1/3 dell'altezza della texture)
Wp, Hp = 512, 1024
wall = np.zeros((Hp, Wp, 3), np.float32)
yy = np.arange(Hp)[:, None] / Hp
peach = np.array([238, 182, 128], np.float32)
band = np.array([238, 168, 40], np.float32)
wall[:] = peach
wall[np.broadcast_to(yy > 0.66, (Hp, Wp))] = band
wall += ((fft_noise(Hp, Wp, beta=2.2) - 0.5) * 10)[..., None]
wi = to_img(wall)
ImageDraw.Draw(wi).rectangle([0, int(Hp * 0.66) - 3, Wp, int(Hp * 0.66)], fill=(214, 140, 30))
save(wi, 'wall.jpg')
# lamiera grecata del tetto con le nervature
roof = np.zeros((256, 256, 3), np.float32) + np.array([168, 178, 190], np.float32)
xx = np.arange(256)[None, :]
roof += (np.sin(xx / 256 * np.pi * 2 * 8) * 14)[..., None]
roof += ((fft_noise(256, 256, beta=2.0) - 0.5) * 8)[..., None]
save(to_img(roof), 'roof.jpg')
# striscioni
print('striscioni')
b = Image.new('RGBA', (1024, 512), (20, 140, 70, 255))
bd = ImageDraw.Draw(b)
for i in range(6):
    bd.polygon([(900 + i * 18, 0), (930 + i * 18, 0), (870 + i * 18, 512), (840 + i * 18, 512)], fill=(240, 250, 240, 255))
paste_fit(b, text_layer('DEPORTES', 'ariblk.ttf', WHITE, spacing=10), (70, 120, 820, 270), 'left')
paste_fit(b, text_layer('LAS PALMAS DE GRAN CANARIA', 'arialbd.ttf', (220, 240, 225), spacing=4), (70, 300, 820, 370), 'left')
save(banner_finish(b), 'banner_deportes.jpg', quality=86)
c = Image.new('RGBA', (1024, 512), (255, 255, 255, 255))
cd = ImageDraw.Draw(c)
cd.rectangle([0, 0, 512, 512], fill=(36, 96, 176)); cd.rectangle([512, 0, 1024, 512], fill=(248, 210, 30))
paste_fit(c, text_layer('ISLAS', 'ariblk.ttf', WHITE), (40, 140, 470, 260))
paste_fit(c, text_layer('CANARIAS', 'ariblk.ttf', WHITE), (40, 280, 470, 380))
paste_fit(c, text_layer('HOCKEY', 'ariblk.ttf', (36, 96, 176)), (550, 140, 980, 260))
paste_fit(c, text_layer('LÍNEA', 'ariblk.ttf', (36, 96, 176)), (550, 280, 980, 380))
save(banner_finish(c), 'banner_canarias.jpg', quality=86)
m = Image.new('RGBA', (1024, 384), BLACK + (255,))
md = ImageDraw.Draw(m)
md.rectangle([0, 320, 1024, 384], fill=YEL)
paste_fit(m, LOGO, (20, 10, 330, 314))
paste_fit(m, text_layer('MOLINA SPORT', 'ariblk.ttf', YEL), (360, 60, 1000, 180), 'left')
paste_fit(m, text_layer('ACEGC • LAS PALMAS', 'arialbd.ttf', WHITE, spacing=6), (360, 200, 1000, 270), 'left')
save(banner_finish(m), 'banner_molina.jpg', quality=86)
# gagliardetti dei club di pattinaggio (bianchi con la punta fucsia)
names = ['PATÍN', 'HOCKEY', 'ARTÍSTICO', 'VELOCIDAD', 'LÍNEA', 'ESCUELA']
for i, nm in enumerate(names):
    g = Image.new('RGBA', (256, 384), (250, 250, 250, 255))
    gd = ImageDraw.Draw(g)
    gd.rectangle([0, 0, 256, 60], fill=(24, 24, 26))
    gd.rectangle([0, 300, 256, 384], fill=(226, 30, 120))
    paste_fit(g, text_layer('CLUB ' + nm, 'arialbd.ttf', WHITE), (12, 10, 244, 52))
    paste_fit(g, text_layer(random.choice(['GRAN CANARIA', 'TENERIFE', 'LANZAROTE']), 'arialbd.ttf', (40, 40, 40)), (20, 316, 236, 364))
    cx, cy = 128, 180
    gd.ellipse([cx - 50, cy - 70, cx + 50, cy + 30], outline=(40, 40, 40), width=6)
    gd.line([(cx - 60, cy + 60), (cx + 60, cy + 40)], fill=(226, 30, 120), width=8)
    save(g, f'pennant_{i}.jpg', quality=84)
print('fatto')
