"""Genera le texture del Pattinodromo Comunale "G. Parodi" (Novi Hockey) in assets/textures/novi/.
Uso (dalla cartella del progetto): python tools/generate_novi_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/novi.png (pallone pressostatico color crema tenuto da una rete di cavi,
file di fari tondi, pista SportCourt verde acqua a piastrelle con le linee rosse dell'hockey, gialle
e i cerchi neri del pattinaggio, fascia blu fuori dalla pista, balaustre bianche con la rete sopra).
"""
import sys, os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'novi')
os.makedirs(OUT, exist_ok=True)
random.seed(1965)
rs = np.random.default_rng(1965)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'novi.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
RED, BLACK = (206, 32, 40), (20, 20, 22)


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


# ================================================================== 1. PISTA: SportCourt verde acqua a piastrelle
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
X = (np.arange(W)[None, :] + 0.5) / S - RW / 2
Z = (np.arange(H)[:, None] + 0.5) / S - RL / 2
n1 = resized_noise(512, 256, 2.2, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([150, 204, 196], np.float32)
col += ((n1 - 0.5) * 14)[..., None]
TILE = 0.305                                              # piastrelle da 30,5 cm
tx = ((X + RW / 2) / TILE) % 1.0
tz = ((Z + RL / 2) / TILE) % 1.0
grid = np.broadcast_to(tx < 0.05, (H, W)) | np.broadcast_to(tz < 0.05, (H, W))
col[grid] *= 0.9
CR = 7.5
cx_, cz_ = RW / 2 - CR, RL / 2 - CR
outside = (np.abs(X) > cx_) & (np.abs(Z) > cz_) & (((np.abs(X) - cx_) ** 2 + (np.abs(Z) - cz_) ** 2) > CR ** 2)
col[outside] = col[outside] * 0.3 + np.array([40, 86, 170], np.float32) * 0.7     # fascia blu negli angoli

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'yellow', 'black')}
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


rect('red', -RW / 2, -0.07, RW / 2, 0.07)
ring('red', 0, 0, 4.5, 0.08)
for sgn in (-1, 1):
    rect('red', -RW / 2 + 1.6, sgn * 31 - 0.05, RW / 2 - 1.6, sgn * 31 + 0.05)
    arc('red', 0, sgn * 31, 1.8, 180 if sgn > 0 else 0, 360 if sgn > 0 else 180, 0.07)
    for x in (-8.5, 8.5):
        ring('red', x, sgn * 21, 4.5, 0.07)
        # punto d'ingaggio a scacchi, come nelle foto
        for dx, dz in ((-0.2, -0.2), (0.2, 0.2), (0.2, -0.2), (-0.2, 0.2)):
            if dx * dz < 0: continue
            rect('red', x + dx - 0.2, sgn * 21 + dz - 0.2, x + dx + 0.2, sgn * 21 + dz + 0.2)
        rect('red', x - 0.4, sgn * 21 - 0.03, x + 0.4, sgn * 21 + 0.03)
# linee gialle oblique (campo di pattinaggio corsa)
for sgn in (-1, 1):
    line('yellow', (-RW / 2 + 1, sgn * 12), (0, sgn * 26), 0.06)
    line('yellow', (RW / 2 - 1, sgn * 12), (0, sgn * 26), 0.06)
rect('yellow', -RW / 2 + 1, -0.6, RW / 2 - 1, -0.55)
# figure del pattinaggio artistico: cerchi neri e piccoli anelli
for z in (-27, -15, -5, 5, 15, 27):
    for x in (-8, 0, 8):
        if random.random() < 0.7:
            ring('black', x + random.uniform(-1, 1), z + random.uniform(-1, 1), random.uniform(2.6, 3.4), 0.035)
for _ in range(10):
    ring('black', random.uniform(-14, 14), random.uniform(-30, 30), random.uniform(0.6, 1.1), 0.03)
cols = {'red': (214, 52, 44), 'yellow': (232, 200, 40), 'black': (36, 40, 42)}
for k, a in (('black', 0.8), ('yellow', 0.85), ('red', 0.9)):
    m = np.asarray(masks[k].resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(cols[k], np.float32) * m * a

img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1400):
    px, py = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(20, 160); a0 = random.uniform(0, 180)
    sd.arc([px - ln, py - ln, px + ln, py + ln], a0, a0 + random.uniform(15, 60), fill=(40, 60, 60, random.randint(6, 14)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.4 + grid.astype(np.float32) * -0.5, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE bianche a pannelli con gli striscioni
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([238, 238, 234], np.float32)
    arr += ((n - 0.5) * 10)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.rectangle([x - 2, 0, x + 2, h], fill=(198, 198, 194, 255))
    d.rectangle([0, h - 18, w, h], fill=(200, 200, 196, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 14, int((xm + wm) * pxm), h - 24)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(320):                                   # pannelli molto vissuti
        x, y = random.uniform(0, w), random.uniform(h * 0.3, h - 20)
        r = random.uniform(3, 10)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 44, random.randint(20, 70)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def novi_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(236, 226, 206, 255), outline=(150, 120, 90, 255), width=4)
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 10, y0 + 6, x0 + 10 + h - 12, y1 - 6))
    paste_fit(img, text_layer('NOVI HOCKEY', 'georgiab.ttf', RED, spacing=4), (x0 + h + 10, y0 + 30, x1 - 20, y1 - 30), 'left')


def inline_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=BLACK + (255,))
    d.rectangle([x0, y1 - 10, x1, y1], fill=RED + (255,))
    paste_fit(img, text_layer('HOCKEY IN LINE • NOVI LIGURE', 'ariblk.ttf', (255, 255, 255), spacing=4), (x0 + 30, y0 + 30, x1 - 30, y1 - 34))


def parodi_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=RED + (255,), width=6)
    paste_fit(img, text_layer('PATTINODROMO', 'ariblk.ttf', (40, 40, 44), spacing=4), (x0 + 30, y0 + 16, x1 - 30, y0 + (y1 - y0) * 3 // 5))
    paste_fit(img, text_layer('G. PARODI', 'arialbd.ttf', RED, spacing=10), (x0 + 100, y0 + (y1 - y0) * 3 // 5 + 2, x1 - 100, y1 - 10))


save(board_strip(panels=[(4.0, 4.4, inline_panel), (13.0, 4.4, parodi_panel)]), 'boards_a.jpg')
save(board_strip(panels=[(2.0, 4.4, novi_panel)]), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 4.4, novi_panel), (11.0, 4.4, parodi_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256), 'boards_corner.jpg')

# ================================================================== 3. TELO E RETI
print('telo')
W = H = 512
n = fft_noise(H, W, beta=2.2)
mem = np.zeros((H, W, 3), np.float32) + np.array([242, 232, 210], np.float32)
mem += ((n - 0.5) * 22)[..., None]
mi = to_img(mem)
md = ImageDraw.Draw(mi)
for _ in range(8):                                         # aloni scuri vicino ai giunti, come nelle foto
    x, y = random.uniform(0, W), random.uniform(0, H)
    md.ellipse([x - 90, y - 30, x + 90, y + 30], fill=(234, 222, 198))
save(mi.filter(ImageFilter.GaussianBlur(14)), 'membrane.jpg')
# rete nera (maglia 10 cm) sopra le balaustre
NW = 128
net = Image.new('RGBA', (NW, NW), (0, 0, 0, 0))
nd = ImageDraw.Draw(net)
nd.line([(0, 0), (NW, 0)], fill=(26, 28, 30, 220), width=6)
nd.line([(0, 0), (0, NW)], fill=(26, 28, 30, 220), width=6)
net.save(os.path.join(OUT, 'net_black.png'))
print('   net_black.png')

# ================================================================== 4. STRISCIONI
print('striscioni')
b = Image.new('RGBA', (1024, 384), (238, 228, 208, 255))
paste_fit(b, text_layer('HOCKEY', 'arialbd.ttf', (60, 50, 40)), (40, 30, 220, 80), 'left')
paste_fit(b, text_layer('IN LINE', 'arialbd.ttf', (60, 50, 40)), (40, 90, 220, 140), 'left')
paste_fit(b, LOGO, (430, 20, 594, 180))
paste_fit(b, text_layer('NOVI HOCKEY', 'georgiab.ttf', RED, spacing=6), (60, 200, 964, 350))
save(banner_finish(b), 'banner_novi.jpg', quality=86)
bb = Image.new('RGBA', (1024, 256), BLACK + (255,))
bbd = ImageDraw.Draw(bb)
bbd.rectangle([0, 214, 1024, 256], fill=RED)
paste_fit(bb, LOGO.convert('L').point(lambda v: 255 - v).convert('RGBA'), (20, 14, 210, 204))
paste_fit(bb, text_layer('NOVI HOCKEY', 'ariblk.ttf', (255, 255, 255)), (240, 30, 1000, 130), 'left')
paste_fit(bb, text_layer('FENICI • HOCKEY IN LINE', 'arialbd.ttf', RED, spacing=6), (240, 140, 1000, 200), 'left')
save(banner_finish(bb), 'banner_club.jpg', quality=86)
print('fatto')
