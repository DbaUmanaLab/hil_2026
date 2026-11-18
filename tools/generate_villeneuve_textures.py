"""Genera le texture del Gymnase Fernand Schwartz (Villeneuve-la-Garenne) in assets/textures/villeneuve/.
Uso (dalla cartella del progetto): python tools/generate_villeneuve_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/villeneuve.jpg (pavimento sportivo azzurro con linee multisport,
balaustre bianche con zoccolo giallo, fascia pubblicitaria scura, travi in legno lamellare,
copertura in pannelli blu ardesia, parete in blocchi e galleria vetrata con montanti gialli).
"""
import sys, os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'villeneuve')
os.makedirs(OUT, exist_ok=True)
random.seed(1984)
rs = np.random.default_rng(1984)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'villeneuve.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
NAVY, SKY, YELLOW = (24, 42, 80), (56, 182, 232), (236, 190, 30)
WHITE = (246, 246, 242)


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


# ================================================================== 1. PISTA: pavimento sportivo azzurro
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
X = (np.arange(W)[None, :] + 0.5) / S - RW / 2
Z = (np.arange(H)[:, None] + 0.5) / S - RL / 2
n1 = resized_noise(512, 256, 2.2, H, W)
n2 = resized_noise(1024, 512, 1.4, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([118, 158, 204], np.float32)
col += ((n1 - 0.5) * 16)[..., None]
col += ((n2 - 0.5) * 8)[..., None]
# teli di resina posati in strisce da 1,5 m lungo la pista: leggere differenze di tono
strip = np.floor((X + RW / 2) / 1.5).astype(np.int64)
col += (rs.uniform(-1, 1, 64).astype(np.float32)[strip % 64] * 3)[..., None]
CR = 7.5
cx_, cz_ = RW / 2 - CR, RL / 2 - CR
outside = (np.abs(X) > cx_) & (np.abs(Z) > cz_) & (((np.abs(X) - cx_) ** 2 + (np.abs(Z) - cz_) ** 2) > CR ** 2)
col[outside] *= 0.85

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'white', 'navy', 'green')}
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


# hockey (rosso): linea centrale, cerchio, linee di porta, aree, ingaggi
rect('red', -RW / 2, -0.05, RW / 2, 0.05)
ring('red', 0, 0, 4.5, 0.06)
for sgn in (-1, 1):
    rect('red', -RW / 2 + 1.6, sgn * 31 - 0.04, RW / 2 - 1.6, sgn * 31 + 0.04)
    arc('red', 0, sgn * 31, 1.8, 180 if sgn > 0 else 0, 360 if sgn > 0 else 180, 0.06)
    for x in (-8.5, 8.5):
        ring('red', x, sgn * 21, 4.5, 0.05)
        rect('red', x - 0.15, sgn * 21 - 0.15, x + 0.15, sgn * 21 + 0.15)
        rect('red', x - 0.12, sgn * 9.5 - 0.12, x + 0.12, sgn * 9.5 + 0.12)
# pallamano (bianco): campo 20 x 40, aree a 6 m e tratteggio a 9 m
outline('white', -10, -20, 10, 20, 0.05)
rect('white', -10, -0.025, 10, 0.025)
for sgn in (-1, 1):
    zg = sgn * 20
    arc('white', 0, zg, 6.0, 180 if sgn > 0 else 0, 360 if sgn > 0 else 180, 0.05)
    for a in range(0, 180, 12):
        a0 = (180 if sgn > 0 else 0) + a
        arc('white', 0, zg, 9.0, a0, a0 + 6, 0.05)
# basket (blu scuro): campo 15 x 28 trasversale, come nella foto
outline('navy', -14, -7.5, 14, 7.5, 0.05)
for sgn in (-1, 1):
    xb = sgn * 14
    outline('navy', min(xb, xb - sgn * 5.8), -2.45, max(xb, xb - sgn * 5.8), 2.45, 0.05)
    arc('navy', xb - sgn * 1.6, 0, 6.75, 90 if sgn > 0 else 270, 270 if sgn > 0 else 450, 0.05)
# badminton / pallavolo (verde)
for z0 in (-27, 17):
    outline('green', -3.05, z0, 3.05, z0 + 10, 0.04)
    rect('green', -3.05, z0 + 5 - 0.02, 3.05, z0 + 5 + 0.02)
outline('green', -9, -4.5, 9, 4.5, 0.04)
cols = {'red': (206, 52, 46), 'white': WHITE, 'navy': (30, 46, 96), 'green': (40, 140, 90)}
for k in ('green', 'navy', 'white', 'red'):
    m = np.asarray(masks[k].resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * 0.9) + np.array(cols[k], np.float32) * m * 0.9

img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1600):                                  # segni di ruote sulla resina
    px, py = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(20, 180); a0 = random.uniform(0, 180)
    sd.arc([px - ln, py - ln, px + ln, py + ln], a0, a0 + random.uniform(15, 60), fill=(40, 50, 70, random.randint(6, 16)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)
save(normal_from_height(n2 * 0.6 + n1 * 0.4, 1.2), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE: bianche con zoccolo giallo e pannelli
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
        d.line([(x, 0), (x, h)], fill=(212, 212, 206, 255), width=3)
    d.rectangle([0, h - 34, w, h], fill=YELLOW + (255,))
    d.rectangle([0, h - 36, w, h - 34], fill=(170, 130, 10, 255))
    d.rectangle([0, 0, w, 5], fill=(226, 226, 220, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 16, int((xm + wm) * pxm), h - 46)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(260):                               # segni dei dischi
        x, y = random.uniform(0, w), random.uniform(h * 0.4, h - 38)
        r = random.uniform(3, 9)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 44, random.randint(20, 60)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def jester_panel(img, x0, y0, x1, y1):
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + (x1 - x0 - h) // 2, y0 + 4, x0 + (x1 - x0 + h) // 2, y1 - 4))


def fdb_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=NAVY + (255,))
    d.rectangle([x0, y1 - 10, x1, y1], fill=SKY + (255,))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 10, y0 + 4, x0 + 10 + h, y1 - 12))
    paste_fit(img, text_layer('LES FOUS DU BITUME', 'ariblk.ttf', (255, 255, 255)), (x0 + h + 26, y0 + 20, x1 - 20, y0 + h // 2 + 6), 'left')
    paste_fit(img, text_layer('ROLLER HOCKEY VILLENEUVE-LA-GARENNE', 'arialbd.ttf', SKY, spacing=4), (x0 + h + 26, y0 + h // 2 + 16, x1 - 20, y1 - 22), 'left')


def mission_panel(img, x0, y0, x1, y1):
    paste_fit(img, text_layer('TEAM MISSION', 'impact.ttf', (20, 20, 24), spacing=6), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


def city_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=NAVY + (255,), width=6)
    paste_fit(img, text_layer('VILLENEUVE-LA-GARENNE', 'arialbd.ttf', NAVY, spacing=4), (x0 + 30, y0 + 20, x1 - 30, y0 + (y1 - y0) * 2 // 3))
    paste_fit(img, text_layer('HAUTS-DE-SEINE', 'arial.ttf', (60, 120, 190), spacing=8), (x0 + 80, y0 + (y1 - y0) * 2 // 3, x1 - 80, y1 - 14))


save(board_strip(panels=[(1.5, 1.4, jester_panel), (8.0, 1.4, jester_panel), (14.5, 3.4, mission_panel)]), 'boards_a.jpg')
save(board_strip(panels=[(2.5, 4.2, city_panel), (11.0, 1.4, jester_panel)]), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 4.4, fdb_panel), (11.0, 4.4, city_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256, panels=[(7.0, 4.0, jester_panel)]), 'boards_corner.jpg')

# ================================================================== 3. EDIFICIO
print('edificio')
# legno lamellare: lamelle orizzontali color miele
W, H = 512, 256
g = resized_noise(64, 512, 1.5, H, W)
wood = np.zeros((H, W, 3), np.float32) + np.array([214, 168, 96], np.float32)
wood += ((g - 0.5) * 30)[..., None]
lam = (np.arange(H)[:, None] % 32) < 2
wood[np.broadcast_to(lam, (H, W))] *= 0.8
save(to_img(wood), 'glulam.jpg')

# copertura: pannelli grecati blu ardesia con qualche lastra più chiara
W = H = 512
n = fft_noise(H, W, beta=2.2)
roof = np.zeros((H, W, 3), np.float32) + np.array([58, 70, 96], np.float32)
roof += ((n - 0.5) * 18)[..., None]
u = np.arange(W)[None, :] / W
roof *= (1 - 0.18 * (np.sin(u * math.pi * 2 * 16) > 0.6))[..., None]
ri = Image.fromarray(roof.clip(0, 255).astype(np.uint8), 'RGB')
rd = ImageDraw.Draw(ri)
rd.rectangle([264, 264, 376, 504], fill=(104, 116, 138))     # una lastra traslucida ogni tanto
rd.line([(0, 255), (W, 255)], fill=(40, 48, 64), width=4)
rd.line([(0, 0), (W, 0)], fill=(40, 48, 64), width=4)
save(ri.filter(ImageFilter.GaussianBlur(0.6)), 'roof_panels.jpg')

# parete in blocchi di cemento grigio
W, H = 512, 512
n = fft_noise(H, W, beta=1.6)
wall = np.zeros((H, W, 3), np.float32) + np.array([150, 146, 140], np.float32)
wall += ((n - 0.5) * 24)[..., None]
bi = to_img(wall)
bd = ImageDraw.Draw(bi)
for r in range(0, H, 64):
    bd.line([(0, r), (W, r)], fill=(118, 114, 108), width=4)
    off = 0 if (r // 64) % 2 == 0 else 128
    for c in range(off, W + 256, 256):
        bd.line([(c % W, r), (c % W, r + 64)], fill=(118, 114, 108), width=4)
save(bi, 'blockwall.jpg')

# testate: pannelli in cemento beige con giunti orizzontali
W, H = 512, 512
n = fft_noise(H, W, beta=2.0)
bg = np.zeros((H, W, 3), np.float32) + np.array([214, 204, 186], np.float32)
bg += ((n - 0.5) * 14)[..., None]
bgi = to_img(bg)
gd = ImageDraw.Draw(bgi)
for r in range(0, H, 128):
    gd.line([(0, r), (W, r)], fill=(176, 166, 150), width=3)
gd.line([(0, 0), (0, H)], fill=(176, 166, 150), width=3)
save(bgi, 'end_panels.jpg')


# vetrate: galleria con montanti gialli (sera, luci accese dentro) e finestre sul lato panchine (giorno)
def glazing(night):
    W, H = 1024, 256
    base = np.zeros((H, W, 3), np.float32) + (np.array([34, 30, 30], np.float32) if night else np.array([150, 168, 186], np.float32))
    base += ((resized_noise(64, 256, 1.6, H, W) - 0.5) * (30 if night else 26))[..., None]
    im = to_img(base).convert('RGBA')
    d = ImageDraw.Draw(im)
    if night:
        for _ in range(26):                            # luci e riflessi dentro la galleria
            x, y = random.uniform(0, W), random.uniform(40, 200)
            r = random.uniform(4, 9)
            d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 236, 190, 230))
        im = im.filter(ImageFilter.GaussianBlur(1.2))
        d = ImageDraw.Draw(im)
    for x in range(0, W + 1, 128):
        d.rectangle([x - 6, 0, x + 6, H], fill=YELLOW + (255,))
    for y in (0, 128, H - 1):
        d.rectangle([0, y - 5, W, y + 5], fill=YELLOW + (255,))
    return im


save(glazing(True), 'gallery_glass.jpg')
save(glazing(False), 'windows_day.jpg')

# fascia pubblicitaria scura lungo le pareti
W, H = 4096, 256
ads = Image.new('RGBA', (W, H), (34, 38, 48, 255))
ad = ImageDraw.Draw(ads)
items = [
    ('elior', 'arialbd.ttf', (255, 255, 255)), ('AVG', 'ariblk.ttf', (255, 255, 255)),
    ('FOUS DU BITUME', 'impact.ttf', SKY), ('VILLENEUVE-LA-GARENNE', 'arialbd.ttf', (255, 255, 255)),
    ('elior', 'arialbd.ttf', (255, 255, 255)), ('HAUTS-DE-SEINE', 'arialbd.ttf', (130, 190, 240)),
    ('AVG', 'ariblk.ttf', (255, 255, 255)), ('FOUS DU BITUME', 'impact.ttf', SKY),
]
seg = W // len(items)
for i, (t, f, c) in enumerate(items):
    x0 = i * seg
    ad.line([(x0, 10), (x0, H - 10)], fill=(70, 76, 90), width=4)
    if t == 'FOUS DU BITUME':
        paste_fit(ads, LOGO, (x0 + 20, 20, x0 + 236, H - 20))
        paste_fit(ads, text_layer(t, f, c, spacing=4), (x0 + 250, 50, x0 + seg - 30, H - 50))
    else:
        paste_fit(ads, text_layer(t, f, c, spacing=6), (x0 + 50, 60, x0 + seg - 50, H - 60))
save(ads, 'ads_strip.jpg')

# ================================================================== 4. STRISCIONI, BANDIERE, BAR
print('striscioni')
b = Image.new('RGBA', (512, 1024), NAVY + (255,))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 960, 512, 1024], fill=SKY)
paste_fit(b, LOGO, (40, 120, 472, 552))
paste_fit(b, text_layer('LES FOUS', 'ariblk.ttf', (255, 255, 255)), (40, 600, 472, 720))
paste_fit(b, text_layer('DU BITUME', 'ariblk.ttf', (255, 255, 255)), (40, 740, 472, 860))
save(banner_finish(b), 'banner_club.jpg', quality=86)
wb = Image.new('RGBA', (512, 1024), (250, 250, 248, 255))
paste_fit(wb, LOGO, (96, 140, 416, 460))
paste_fit(wb, text_layer('CHAMPIONS', 'ariblk.ttf', NAVY), (60, 540, 452, 640))
paste_fit(wb, text_layer('LIGUE ÉLITE', 'arialbd.ttf', SKY, spacing=6), (80, 660, 432, 740))
save(banner_finish(wb), 'banner_white.jpg', quality=86)

fr = Image.new('RGB', (600, 400))
fd = ImageDraw.Draw(fr)
for i, c in enumerate([(0, 85, 164), (255, 255, 255), (239, 65, 53)]):
    fd.rectangle([i * 200, 0, i * 200 + 200, 400], fill=c)
save(fr, 'flag_france.jpg')
cz = Image.new('RGB', (600, 400), (255, 255, 255))
czd = ImageDraw.Draw(cz)
czd.rectangle([0, 200, 600, 400], fill=(215, 20, 26))
czd.polygon([(0, 0), (300, 200), (0, 400)], fill=(17, 69, 126))
save(cz, 'flag_czech.jpg')

# insegna del bar: parete blu notte con la scritta al neon e i giullari
bar = Image.new('RGBA', (1024, 512), (26, 38, 70, 255))
glow = Image.new('RGBA', bar.size, (0, 0, 0, 0))
neon = text_layer('Fous Du Bitume', 'georgiai.ttf', (210, 235, 255), size=200)
paste_fit(glow, neon, (180, 40, 844, 160))
bar.alpha_composite(glow.filter(ImageFilter.GaussianBlur(10)))
bar.alpha_composite(glow)
paste_fit(bar, LOGO, (40, 200, 220, 380))
paste_fit(bar, LOGO, (804, 200, 984, 380))
brd = ImageDraw.Draw(bar)
brd.rectangle([330, 200, 694, 400], fill=(16, 16, 20, 255), outline=(60, 60, 66, 255), width=8)
brd.rectangle([346, 216, 678, 384], fill=(70, 120, 170, 255))
brd.rectangle([0, 430, 1024, 512], fill=(40, 52, 82, 255))
save(bar, 'bar_wall.jpg')
print('fatto')
