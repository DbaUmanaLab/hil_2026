"""Genera le texture del Pattinodromo delle Acquette (Sporting Treviso) in assets/textures/treviso/.
Uso (dalla cartella del progetto): python tools/generate_treviso_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/treviso.png (pista in cemento lucidato grigio chiaro, balaustre bianche con
lo zoccolo verde, tensostruttura a botte con reticolo d'acciaio a triangoli e telo bianco, pilastri in
cemento con vetrate verde scuro, testata con grigliato alto, bandiere tricolori appese).
"""
import sys, os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'treviso')
os.makedirs(OUT, exist_ok=True)
random.seed(1977)
rs = np.random.default_rng(1977)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'treviso.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
BLUE, YELLOW, GREEN = (28, 72, 170), (246, 214, 30), (24, 150, 70)


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


# ================================================================== 1. PISTA: cemento lucidato grigio chiaro
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
X = (np.arange(W)[None, :] + 0.5) / S - RW / 2
Z = (np.arange(H)[:, None] + 0.5) / S - RL / 2
n1 = resized_noise(512, 256, 2.4, H, W)
n2 = resized_noise(1024, 512, 1.3, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([206, 210, 212], np.float32)
col += ((n1 - 0.5) * 22)[..., None]
col += ((n2 - 0.5) * 10)[..., None]
# giunti del getto: riquadri di circa 6 x 6 m
jx = ((X + RW / 2) % 6.0) < 0.025
jz = ((Z + RL / 2) % 6.0) < 0.025
joint = np.broadcast_to(jx, (H, W)) | np.broadcast_to(jz, (H, W))
col[joint] *= 0.82
CR = 7.5
cx_, cz_ = RW / 2 - CR, RL / 2 - CR
outside = (np.abs(X) > cx_) & (np.abs(Z) > cz_) & (((np.abs(X) - cx_) ** 2 + (np.abs(Z) - cz_) ** 2) > CR ** 2)
col[outside] *= 0.86

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'black')}
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


# hockey (rosso, un po' consumato)
rect('red', -RW / 2, -0.05, RW / 2, 0.05)
ring('red', 0, 0, 4.5, 0.06)
for sgn in (-1, 1):
    rect('red', -RW / 2 + 1.6, sgn * 31 - 0.04, RW / 2 - 1.6, sgn * 31 + 0.04)
    arc('red', 0, sgn * 31, 1.8, 180 if sgn > 0 else 0, 360 if sgn > 0 else 180, 0.06)
    for x in (-8.5, 8.5):
        ring('red', x, sgn * 21, 4.5, 0.05)
        rect('red', x - 0.15, sgn * 21 - 0.15, x + 0.15, sgn * 21 + 0.15)
        rect('red', x - 0.12, sgn * 9.5 - 0.12, x + 0.12, sgn * 9.5 + 0.12)
# pattinaggio artistico: cerchi neri sottili a coppie
for z in (-24, -12, 12, 24):
    for x in (-6, 6):
        ring('black', x, z, 3.0, 0.03)
ring('black', 0, 0, 3.0, 0.03)
rect('black', -0.015, -RL / 2 + 4, 0.015, RL / 2 - 4)
cols = {'red': (196, 52, 48), 'black': (40, 42, 44)}
for k, a in (('black', 0.75), ('red', 0.85)):
    m = np.asarray(masks[k].resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    m = m * (0.75 + 0.25 * n1[..., None])                       # vernice consumata
    col = col * (1 - m * a) + np.array(cols[k], np.float32) * m * a

img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1800):
    px, py = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(20, 200); a0 = random.uniform(0, 180)
    sd.arc([px - ln, py - ln, px + ln, py + ln], a0, a0 + random.uniform(15, 60), fill=(60, 60, 64, random.randint(6, 16)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)
save(normal_from_height(n2 * 0.5 + joint.astype(np.float32) * -0.5, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE: bianche con zoccolo verde e striscioni
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([244, 244, 241], np.float32)
    arr += ((n - 0.5) * 8)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.line([(x, 0), (x, h)], fill=(214, 214, 210, 255), width=3)
    d.rectangle([0, h - 44, w, h], fill=GREEN + (255,))
    d.rectangle([0, h - 46, w, h - 44], fill=(14, 100, 46, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 10, int((xm + wm) * pxm), h - 56)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(220):
        x, y = random.uniform(0, w), random.uniform(h * 0.4, h - 48)
        r = random.uniform(3, 9)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 44, random.randint(20, 60)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def rhinos_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=BLUE + (255,))
    d.rectangle([x0, y1 - 10, x1, y1], fill=YELLOW + (255,))
    h = y1 - y0
    d.ellipse([x0 + 8, y0 + 4, x0 + 8 + h - 14, y1 - 10], fill=(255, 255, 255, 255))
    paste_fit(img, LOGO, (x0 + 14, y0 + 8, x0 + h - 12, y1 - 16))
    paste_fit(img, text_layer('SPORTING TREVISO', 'ariblk.ttf', (255, 255, 255)), (x0 + h + 14, y0 + 16, x1 - 20, y0 + h // 2 + 6), 'left')
    paste_fit(img, text_layer('RHINOS HOCKEY IN LINE', 'arialbd.ttf', YELLOW, spacing=4), (x0 + h + 14, y0 + h // 2 + 14, x1 - 20, y1 - 20), 'left')


def skates_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(44, 72, 170, 255))
    d.ellipse([x0 - 40, y0 + 40, x0 + (x1 - x0) * 0.6, y1 + 60], outline=(250, 200, 40, 255), width=10)
    paste_fit(img, text_layer('PATTINAGGIO TREVISO', 'impact.ttf', (255, 255, 255), spacing=4), (x0 + 30, y0 + 20, x1 - 30, y1 - 20))


def acquette_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=BLUE + (255,), width=6)
    paste_fit(img, text_layer('PATTINODROMO', 'ariblk.ttf', BLUE, spacing=4), (x0 + 30, y0 + 16, x1 - 30, y0 + (y1 - y0) * 3 // 5))
    paste_fit(img, text_layer('DELLE ACQUETTE', 'arialbd.ttf', (40, 40, 44), spacing=8), (x0 + 60, y0 + (y1 - y0) * 3 // 5 + 2, x1 - 60, y1 - 10))


def uisp_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(250, 210, 30, 255))
    paste_fit(img, text_layer('UISP • PATTINAGGIO', 'ariblk.ttf', (30, 60, 140), spacing=4), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


save(board_strip(panels=[(0.5, 4.0, skates_panel), (5.0, 4.0, skates_panel), (9.5, 4.0, uisp_panel), (14.0, 4.0, skates_panel)]), 'boards_a.jpg')
save(board_strip(panels=[(1.0, 4.4, acquette_panel), (6.0, 4.0, skates_panel), (11.0, 4.4, rhinos_panel)]), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 4.4, rhinos_panel), (11.0, 4.4, acquette_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256), 'boards_corner.jpg')

# ================================================================== 3. EDIFICIO
print('edificio')
W = H = 512
n = fft_noise(H, W, beta=2.4)
mem = np.zeros((H, W, 3), np.float32) + np.array([236, 238, 240], np.float32)
mem += ((n - 0.5) * 12)[..., None]
save(to_img(mem), 'membrane.jpg')
# vetrate verde scuro tra i pilastri
gw = np.zeros((256, 512, 3), np.float32) + np.array([28, 62, 52], np.float32)
gw += ((resized_noise(64, 128, 1.6, 256, 512) - 0.5) * 22)[..., None]
gi = to_img(gw)
gd = ImageDraw.Draw(gi)
for x in (0, 256):
    gd.rectangle([x, 0, x + 6, 256], fill=(70, 80, 78))
gd.rectangle([0, 0, 512, 6], fill=(70, 80, 78)); gd.rectangle([0, 124, 512, 130], fill=(70, 80, 78))
save(gi, 'glass_green.jpg')
# cemento dei pilastri
cn = np.zeros((256, 256, 3), np.float32) + np.array([182, 176, 166], np.float32)
cn += ((fft_noise(256, 256, beta=1.4) - 0.5) * 30)[..., None]
save(to_img(cn), 'concrete.jpg')
# testata: pannelli grigio chiaro con il grigliato alto
tw = Image.new('RGB', (1024, 512), (208, 210, 212))
td = ImageDraw.Draw(tw)
for y in range(0, 512, 64):
    td.line([(0, y), (1024, y)], fill=(186, 188, 190), width=3)
td.rectangle([180, 20, 844, 230], fill=(70, 80, 88))
for x in range(180, 845, 22):
    td.line([(x, 20), (x, 230)], fill=(150, 156, 160), width=4)
for y in range(20, 231, 52):
    td.line([(180, y), (844, y)], fill=(150, 156, 160), width=6)
save(tw.filter(ImageFilter.GaussianBlur(0.6)), 'end_wall.jpg')

# ================================================================== 4. STRISCIONI E BANDIERE
print('striscioni')
fl = Image.new('RGB', (600, 400))
fd = ImageDraw.Draw(fl)
for i, c in enumerate([(0, 146, 70), (255, 255, 255), (206, 43, 55)]):
    fd.rectangle([i * 200, 0, i * 200 + 200, 400], fill=c)
save(fl, 'flag_italy.jpg')
b = Image.new('RGBA', (2048, 512), (255, 255, 255, 255))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 0, 900, 512], fill=(70, 130, 200))
bd.rectangle([0, 360, 900, 512], fill=(230, 210, 150))
bd.polygon([(380, 360), (420, 120), (460, 120), (500, 360)], fill=(232, 222, 200))     # la torre civica, stilizzata
bd.rectangle([405, 80, 475, 130], fill=(232, 222, 200))
paste_fit(b, text_layer('PATTINODROMO DELLE ACQUETTE', 'ariblk.ttf', (200, 30, 40), spacing=4), (940, 80, 2000, 260))
paste_fit(b, text_layer('TREVISO', 'arialbd.ttf', (40, 60, 140), spacing=14), (1100, 300, 1840, 440))
save(banner_finish(b), 'banner_end.jpg', quality=86)
cb = Image.new('RGBA', (1024, 256), BLUE + (255,))
cbd = ImageDraw.Draw(cb)
cbd.rectangle([0, 214, 1024, 256], fill=YELLOW)
cbd.ellipse([18, 14, 210, 206], fill=(255, 255, 255))
paste_fit(cb, LOGO, (28, 22, 200, 198))
paste_fit(cb, text_layer('SPORTING TREVISO', 'ariblk.ttf', (255, 255, 255)), (240, 30, 1000, 130), 'left')
paste_fit(cb, text_layer('RHINOS • HOCKEY IN LINE', 'arialbd.ttf', YELLOW, spacing=6), (240, 140, 1000, 200), 'left')
save(banner_finish(cb), 'banner_club.jpg', quality=86)
NW = 128
net = Image.new('RGBA', (NW, NW), (0, 0, 0, 0))
nd = ImageDraw.Draw(net)
nd.line([(0, 0), (NW, 0)], fill=(238, 236, 226, 235), width=7)
nd.line([(0, 0), (0, NW)], fill=(238, 236, 226, 235), width=7)
net.save(os.path.join(OUT, 'net_white.png'))
print('   net_white.png')
print('fatto')
