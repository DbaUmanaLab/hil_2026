"""Genera le texture della 2Skate Arena di Bergamo (Time 4.2) in assets/textures/time42/.
Uso (dalla cartella del progetto): python tools/generate_time42_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/time42.png (capannone con travi curve in legno lamellare chiaro, soffitto in
pannelli OSB con riquadri fonoassorbenti grigi, lampade a sospensione tonde, vetrate continue con i
telai neri sui lati lunghi, pareti di testata in pannelli grigi, pavimento in cemento lucidato grigio con
le linee rosse e i cerchi bianchi, balaustre bianche con la fascia gialla in basso, reti bianche sopra
la balaustra di fondo con gli striscioni delle scuole).
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'time42')
os.makedirs(OUT, exist_ok=True)
random.seed(42)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'time42.png')).convert('RGBA')
JERSEY = Image.open(os.path.join(ROOT, 'assets', 'jerseys', 'time42.png')).convert('RGBA')
COPA = JERSEY.crop((163, 205, 272, 325))            # stemma "Copa Mass" sul petto della maglia
BLACK, YELLOW, WHITE = (20, 20, 22), (246, 196, 0), (255, 255, 255)
PURPLE, GREEN, CYAN, ORANGE = (172, 96, 166), (146, 194, 58), (56, 186, 214), (244, 152, 36)


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


# ================================================================== 1. PISTA: cemento lucidato grigio
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
n1 = resized_noise(512, 256, 2.0, H, W)
n2 = resized_noise(128, 64, 2.6, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([196, 198, 198], np.float32)
col += ((n1 - 0.5) * 14)[..., None]
col += ((n2 - 0.5) * 22)[..., None]                       # nuvolature del cemento lisciato
# giunti di dilatazione tagliati nel cemento (riquadri di circa 6 m)
X = (np.arange(W)[None, :] + 0.5) / S - RW / 2
Z = (np.arange(H)[:, None] + 0.5) / S - RL / 2
joint = (np.abs(((X + RW / 2) / 6.0) % 1.0 - 0.5) > 0.4985) | (np.abs(((Z + RL / 2) / 6.0) % 1.0 - 0.5) > 0.4985)
col[np.broadcast_to(joint, (H, W))] *= 0.86

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'white', 'orange')}
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


def dot(k, x, z, r):
    c = P(x, z); R = r * S * SS
    draws[k].ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], fill=255)


# hockey: linee rosse sottili (nastro), come nelle foto
rect('red', -RW / 2, -0.05, RW / 2, 0.05)
ring('red', 0, 0, 4.5, 0.05)
for sgn in (-1, 1):
    rect('red', -RW / 2 + 1.4, sgn * 31 - 0.04, RW / 2 - 1.4, sgn * 31 + 0.04)
    arc('red', 0, sgn * 31, 1.8, 180 if sgn > 0 else 0, 360 if sgn > 0 else 180, 0.05)
    for x in (-8.5, 8.5):
        ring('red', x, sgn * 22, 4.5, 0.05)
        dot('red', x, sgn * 22, 0.25)
        dot('red', x, sgn * 7, 0.2)
# pattinaggio artistico: grandi cerchi bianchi e file di puntini
for z in (-18, 18):
    ring('white', 0, z, 7.5, 0.06)
ring('white', 0, 0, 7.5, 0.06)
for z in (-26, -10, 10, 26):
    for i in range(14):
        rect('white', -13 + i * 2.0 - 0.12, z - 0.04, -13 + i * 2.0 + 0.12, z + 0.04)
# segni arancioni di riferimento a bordo pista
for z in range(-30, 31, 6):
    rect('orange', -RW / 2 + 0.6, z - 0.04, -RW / 2 + 1.0, z + 0.04)

cols = {'red': (200, 46, 48), 'white': (246, 246, 244), 'orange': (236, 120, 40)}
for k, a in (('white', 0.8), ('orange', 0.8), ('red', 0.9)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(cols[k], np.float32) * m * a

img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1200):                                      # segni leggeri delle ruote
    px, py = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(20, 160); a0 = random.uniform(0, 180)
    sd.arc([px - ln, py - ln, px + ln, py + ln], a0, a0 + random.uniform(10, 50), fill=(60, 62, 66, random.randint(5, 12)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.25 + n2 * 0.25 - np.broadcast_to(joint, (H, W)).astype(np.float32) * 0.4, 0.8), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE bianche con la fascia gialla
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([240, 240, 238], np.float32)
    arr += ((n - 0.5) * 8)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.rectangle([x - 2, 0, x + 2, h], fill=(214, 214, 212, 255))
    d.rectangle([0, h - 46, w, h], fill=(244, 184, 18, 255))     # fascia gialla (battiscopa)
    d.rectangle([0, h - 48, w, h - 46], fill=(206, 150, 10, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 20, int((xm + wm) * pxm), h - 62)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(260):                                   # segni di dischi e bastoni
        x, y = random.uniform(0, w), random.uniform(h * 0.4, h - 48)
        r = random.uniform(3, 8)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 50, random.randint(16, 55)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def time_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(34, 34, 38, 255))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 8, y0 + 6, x0 + 8 + h - 12, y1 - 6))
    paste_fit(img, text_layer('TIME 4.2', 'ariblk.ttf', WHITE, spacing=6), (x0 + h + 16, y0 + 18, x1 - 24, y0 + h * 0.6), 'left')
    paste_fit(img, text_layer('HOCKEY IN LINE BERGAMO', 'arialbd.ttf', YELLOW, spacing=6), (x0 + h + 16, y0 + h * 0.64, x1 - 24, y1 - 14), 'left')


def copa_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=BLACK + (255,))
    d.rectangle([x0, y0, x1, y0 + 8], fill=YELLOW + (255,))
    h = y1 - y0
    paste_fit(img, COPA, (x0 + 10, y0 + 10, x0 + 10 + h, y1 - 4))
    paste_fit(img, text_layer('COPA MASS', 'ariblk.ttf', YELLOW, spacing=6), (x0 + h + 30, y0 + 24, x1 - 24, y1 - 24), 'left')


def arena_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=(40, 40, 44, 255), width=5)
    paste_fit(img, text_layer('2SKATE ARENA', 'ariblk.ttf', (40, 40, 44), spacing=6), (x0 + 30, y0 + 14, x1 - 30, y0 + (y1 - y0) * 0.62))
    paste_fit(img, text_layer('BERGAMO', 'arialbd.ttf', ORANGE, spacing=14), (x0 + 120, y0 + (y1 - y0) * 0.66, x1 - 120, y1 - 10))


save(board_strip(panels=[(4.0, 4.4, time_panel)]), 'boards_a.jpg')
save(board_strip(panels=[(11.0, 4.4, copa_panel)]), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 4.4, arena_panel), (11.5, 4.4, time_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256), 'boards_corner.jpg')

# ================================================================== 3. SOFFITTO, PARETI, VETRATE
print('soffitto e pareti')
# pannelli OSB: scaglie di legno orientate, tono caldo
W = H = 512
osb = np.zeros((H, W, 3), np.float32) + np.array([206, 160, 104], np.float32)
osb += ((fft_noise(H, W, beta=1.6) - 0.5) * 26)[..., None]
oi = to_img(osb).convert('RGBA')
od = ImageDraw.Draw(oi)
for _ in range(2600):
    x, y = random.uniform(0, W), random.uniform(0, H)
    l, a = random.uniform(8, 26), random.uniform(0, 3.14)
    dx, dy = np.cos(a) * l, np.sin(a) * l * 0.5
    c = random.choice([(176, 120, 66), (226, 186, 128), (196, 146, 86), (150, 100, 56)])
    od.line([(x - dx, y - dy), (x + dx, y + dy)], fill=c + (random.randint(90, 200),), width=random.randint(3, 7))
od.rectangle([0, 0, W, 2], fill=(140, 96, 52, 255))      # giunto tra i pannelli
od.rectangle([0, 0, 2, H], fill=(140, 96, 52, 255))
save(oi.filter(ImageFilter.GaussianBlur(0.6)), 'osb.jpg')
# riquadri fonoassorbenti grigio chiaro
ac = np.zeros((256, 256, 3), np.float32) + np.array([214, 214, 210], np.float32)
ac += ((fft_noise(256, 256, beta=1.2) - 0.5) * 12)[..., None]
ai = to_img(ac)
ImageDraw.Draw(ai).rectangle([0, 0, 255, 255], outline=(176, 176, 172), width=4)
save(ai, 'acoustic.jpg')
# parete di testata in pannelli grigi
gw = np.zeros((512, 512, 3), np.float32) + np.array([170, 172, 174], np.float32)
gw += ((fft_noise(512, 512, beta=2.0) - 0.5) * 12)[..., None]
gi = to_img(gw)
gd = ImageDraw.Draw(gi)
for y in range(0, 512, 128):
    gd.rectangle([0, y, 512, y + 2], fill=(140, 142, 146))
for x in range(0, 512, 256):
    gd.rectangle([x, 0, x + 2, 512], fill=(140, 142, 146))
save(gi, 'wall_grey.jpg')
# vetrata continua: alberi sfocati dietro i telai neri (un modulo = 3 m x 5,5 m)
vw, vh = 512, 940
tr = np.zeros((vh, vw, 3), np.float32)
sky = np.linspace(0, 1, vh)[:, None]
tr[:] = np.array([200, 222, 214], np.float32)
leaves = resized_noise(64, 32, 1.4, vh, vw)
mask = np.clip((leaves - 0.35) * 3, 0, 1) * np.clip((sky - 0.05) * 3, 0, 1)
tr = tr * (1 - mask[..., None]) + (np.array([70, 128, 64], np.float32) + ((leaves - 0.5) * 70)[..., None]) * mask[..., None]
ground = sky > 0.82
tr[np.broadcast_to(ground, (vh, vw))] = np.array([112, 132, 96], np.float32)
wi = to_img(tr).filter(ImageFilter.GaussianBlur(3)).convert('RGBA')
wd = ImageDraw.Draw(wi)
F = (24, 26, 28, 255)
wd.rectangle([0, 0, vw, 22], fill=F)
wd.rectangle([0, vh - 22, vw, vh], fill=F)
wd.rectangle([0, 0, 14, vh], fill=F)
wd.rectangle([vw - 14, 0, vw, vh], fill=F)
wd.rectangle([vw // 2 - 7, 0, vw // 2 + 7, vh], fill=F)
for y in (int(vh * 0.32), int(vh * 0.64)):
    wd.rectangle([0, y - 8, vw, y + 8], fill=F)
gl = Image.new('RGBA', wi.size, (0, 0, 0, 0))
ImageDraw.Draw(gl).polygon([(60, 0), (170, 0), (40, vh), (-70, vh)], fill=(255, 255, 255, 34))   # riflesso sul vetro
wi.alpha_composite(gl.filter(ImageFilter.GaussianBlur(12)))
save(wi, 'window.jpg')
# rete bianca (maglia 10 cm) sopra la balaustra di fondo
NW = 128
net = Image.new('RGBA', (NW, NW), (0, 0, 0, 0))
nd = ImageDraw.Draw(net)
nd.line([(0, 0), (NW, 0)], fill=(236, 236, 232, 210), width=5)
nd.line([(0, 0), (0, NW)], fill=(236, 236, 232, 210), width=5)
net.save(os.path.join(OUT, 'net_white.png'))
print('   net_white.png')

# ================================================================== 4. STRISCIONI
print('striscioni')
b = Image.new('RGBA', (1280, 512), (34, 34, 38, 255))
x = 70
for ch, c, top in (('T', PURPLE, 'TRY'), ('I', GREEN, 'IMPROVE'), ('M', CYAN, 'MEASURE'), ('E', ORANGE, 'ENJOY')):
    lay = text_layer(ch, 'ariblk.ttf', c)
    box = paste_fit(b, lay, (x, 80, x + 210, 330))
    paste_fit(b, text_layer(top, 'arialbd.ttf', c).rotate(90, expand=True), (box[0] - 34, 90, box[0] - 4, 320))
    x = box[2] + 50
paste_fit(b, text_layer('4.2', 'ariblk.ttf', (190, 190, 194)), (x, 90, 1220, 280), 'left')
paste_fit(b, text_layer('I sogni hanno bisogno di sapere che siamo coraggiosi.', 'ariali.ttf', WHITE), (70, 360, 1210, 410), 'left')
paste_fit(b, text_layer('Pattinaggio  •  Hockey in line  •  Sci alpino  •  Snowboard  •  Multisport', 'arialbd.ttf', (200, 200, 204)), (70, 430, 1210, 470), 'left')
save(banner_finish(b), 'banner_time42.jpg', quality=86)

c = Image.new('RGBA', (512, 640), (250, 248, 240, 255))
paste_fit(c, COPA, (40, 30, 472, 610))
save(banner_finish(c), 'banner_copamass.jpg', quality=86)

for name, l1, l2 in (('banner_scuola.jpg', 'SCUOLA PATTINAGGIO', 'BERGAMO IN LINE'), ('banner_movimento.jpg', 'SCUOLA MOVIMENTO', 'TIME 4.2')):
    s = Image.new('RGBA', (768, 384), (248, 248, 250, 255))
    sd = ImageDraw.Draw(s)
    for i, cc in enumerate(((0, 146, 70), (248, 248, 250), (206, 43, 55))):   # onda tricolore
        sd.arc([-200, 120 + i * 18, 968, 620 + i * 18], 200, 340, fill=cc, width=14)
    paste_fit(s, text_layer(l1, 'ariblk.ttf', (34, 52, 110)), (30, 30, 738, 150), 'left')
    paste_fit(s, text_layer(l2, 'ariblk.ttf', (34, 52, 110)), (30, 170, 560, 270), 'left')
    paste_fit(s, LOGO, (600, 200, 740, 340))
    save(banner_finish(s), name, quality=86)
print('fatto')
