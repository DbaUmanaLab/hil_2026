"""Genera le texture della Fox Arena (Legnaro) in assets/textures/fox_legnaro/.
Uso (dalla cartella del progetto): python tools/generate_fox_legnaro_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Legno lamellare condiviso con Cittadella.
"""
import sys, os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'fox_legnaro')
os.makedirs(OUT, exist_ok=True)
random.seed(2004)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'fox_legnaro.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
FOX_RED, FOX_GOLD, FOX_BLACK = (208, 31, 38), (246, 196, 30), (17, 17, 20)
GREEN = (24, 128, 72)


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


# ================================================================== 1. PISTA: piastrelle bianche, linee rosse e gialle
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
base = resized_noise(1024, 512, 2.3, H, W)
fine = resized_noise(1024, 512, 1.2, H, W)
X = (np.arange(W)[None, :] + 0.5) / S - RW / 2
Z = (np.arange(H)[:, None] + 0.5) / S - RL / 2
col = np.zeros((H, W, 3), np.float32) + np.array([236, 238, 238], np.float32)
# zone dietro le porte in piastrelle grigie (come nelle foto)
end_zone = np.abs(Z) > 31.0
col[np.broadcast_to(end_zone, (H, W))] = np.array([150, 153, 156], np.float32)
col += ((base - 0.5) * 14)[..., None] + ((fine - 0.5) * 6)[..., None]
# fughe delle piastrelle (25 cm)
TILE = 0.25
gx = (np.abs(((X / TILE) % 1) - 0.5) > 0.47)
gz = (np.abs(((Z / TILE) % 1) - 0.5) > 0.47)
col[np.broadcast_to(gx | gz, (H, W))] *= 0.955
# angoli fuori dalla balaustra curva
CR = 7.5
cx_, cz_ = RW / 2 - CR, RL / 2 - CR
outside = (np.abs(X) > cx_) & (np.abs(Z) > cz_) & (((np.abs(X) - cx_) ** 2 + (np.abs(Z) - cz_) ** 2) > CR ** 2)
col[outside] *= 0.8

SS = 2
red_m = Image.new('L', (W * SS, H * SS), 0)
yel_m = Image.new('L', (W * SS, H * SS), 0)
rd, yd = ImageDraw.Draw(red_m), ImageDraw.Draw(yel_m)
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)


def rect(d, x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    d.rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def ring(d, x, z, r, wdt):
    c = P(x, z); R = r * S * SS
    d.ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], outline=255, width=max(1, int(wdt * S * SS)))


def cross(d, x, z, arm=0.42, t=0.14):
    rect(d, x - arm, z - t, x + arm, z + t)
    rect(d, x - t, z - arm, x + t, z + arm)


# rosse: linea centrale, cerchio centrale, cerchi d'ingaggio con le croci, aree di porta rettangolari
rect(rd, -RW / 2, -0.07, RW / 2, 0.07)
ring(rd, 0, 0, 4.5, 0.09)
for sgn in (-1, 1):
    rect(rd, -RW / 2 + 1.5, sgn * 31.0 - 0.05, RW / 2 - 1.5, sgn * 31.0 + 0.05)          # linea di porta
    for x in (-8.5, 8.5):
        ring(rd, x, sgn * 21, 4.5, 0.08)
        cross(rd, x, sgn * 21)
        cross(rd, x, sgn * 9.5, 0.32, 0.11)
# area di porta piena davanti alla linea
area = Image.new('L', (W * SS, H * SS), 0)
ad = ImageDraw.Draw(area)
for sgn in (-1, 1):
    rect(ad, -1.5, sgn * (31.0 - 1.3), 1.5, sgn * 31.0)    # verso il centro pista, davanti alla linea di porta
# gialle: linee del basket/pallavolo che attraversano la pista
for x in (-14.2, 14.2):
    rect(yd, x - 0.04, -RL / 2 + 1.0, x + 0.04, RL / 2 - 1.0)
for sgn in (-1, 1):
    hz = sgn * 26.0                                  # canestro virtuale a metà zona
    c = P(0, hz); R = 6.75 * S * SS
    a0, a1 = (90, 270) if False else ((180, 360) if sgn > 0 else (0, 180))
    yd.arc([c[0] - R, c[1] - R, c[0] + R, c[1] + R], a0, a1, fill=255, width=int(0.05 * S * SS))
    rect(yd, -2.45, hz - 0.03, 2.45, hz + 0.03)
    rect(yd, -2.45, min(hz, hz - sgn * 5.8), -2.41, max(hz, hz - sgn * 5.8))
    rect(yd, 2.41, min(hz, hz - sgn * 5.8), 2.45, max(hz, hz - sgn * 5.8))
    rect(yd, -2.45, hz - sgn * 5.8 - 0.03, 2.45, hz - sgn * 5.8 + 0.03)
    c2 = P(0, hz - sgn * 5.8); R2 = 1.8 * S * SS
    yd.arc([c2[0] - R2, c2[1] - R2, c2[0] + R2, c2[1] + R2], 0 if sgn > 0 else 180, 180 if sgn > 0 else 360, fill=255, width=int(0.05 * S * SS))
ring(yd, 0, 0, 1.8, 0.05)

rm = np.asarray(red_m.resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
ym = np.asarray(yel_m.resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
am = np.asarray(area.resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
col = col * (1 - ym * 0.85) + np.array([232, 196, 30], np.float32) * ym * 0.85
col = col * (1 - rm * 0.9) + np.array([200, 30, 36], np.float32) * rm * 0.9
col = col * (1 - am * 0.88) + np.array([200, 30, 36], np.float32) * am * 0.88

# la volpe al centro, ruotata per leggersi dal lato telecamera (come a Cittadella)
logo = LOGO.rotate(90, expand=True)
lw = int(6.4 * S)
lh = int(logo.height * lw / logo.width)
logo = logo.resize((lw, lh), Image.LANCZOS)
la = np.asarray(logo).astype(np.float32)
x0, y0 = W // 2 - lw // 2, H // 2 - lh // 2
a = la[..., 3:4] / 255 * 0.95
col[y0:y0 + lh, x0:x0 + lw] = col[y0:y0 + lh, x0:x0 + lw] * (1 - a) + la[..., :3] * a

img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1600):                                  # segni di ruote sulle piastrelle chiare
    px, py = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(20, 160); a0 = random.uniform(0, 180)
    sd.arc([px - ln, py - ln, px + ln, py + ln], a0, a0 + random.uniform(15, 60), fill=(60, 62, 66, random.randint(8, 22)), width=random.randint(1, 3))
for _ in range(60):                                    # macchie grigie di usura
    px, py = random.uniform(0, W), random.uniform(0, H); r = random.uniform(20, 90)
    sd.ellipse([px - r, py - r * 0.6, px + r, py + r * 0.6], fill=(120, 122, 126, random.randint(6, 16)))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)
hn = base * 0.5 + fine * 0.3 + (gx | gz).astype(np.float32) * -0.2
save(normal_from_height(np.broadcast_to(hn, (H, W)) * 2.5, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE: bianche con zoccolo verde
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    """Una striscia = 18,5 m di balaustra. panels: [(x_metri, larghezza_m, funzione_disegno)]"""
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([238, 236, 228], np.float32)
    arr += ((n - 0.5) * 12)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):                 # giunti dei pannelli
        x = int(xm * pxm)
        d.line([(x, 0), (x, h)], fill=(196, 194, 186, 255), width=3)
    d.rectangle([0, h - 24, w, h], fill=GREEN + (255,))   # zoccolo verde
    d.rectangle([0, h - 26, w, h - 24], fill=(14, 90, 50, 255))
    d.rectangle([0, 0, w, 6], fill=(214, 212, 204, 255))  # bordo superiore
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 18, int((xm + wm) * pxm), h - 34)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))     # segni dei dischi
    sd = ImageDraw.Draw(sc)
    for _ in range(220):
        x, y = random.uniform(0, w), random.uniform(h * 0.45, h - 28)
        r = random.uniform(3, 9)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 44, random.randint(25, 70)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def malastrana(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(14, 14, 16, 255))
    w = x1 - x0
    paste_fit(img, text_layer('MALASTRANA', 'ariblk.ttf', FOX_GOLD, spacing=6), (x0 + w // 10, y0 + 30, x1 - w // 10, y0 + (y1 - y0) // 2 + 6))
    paste_fit(img, text_layer('BIRRA ARTIGIANALE', 'arialbd.ttf', (220, 220, 220), spacing=4), (x0 + w // 6, y0 + (y1 - y0) // 2 + 22, x1 - w // 6, y1 - 24))


def fox_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=FOX_BLACK + (255,))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 10, y0 + 6, x0 + 10 + h, y1 - 6))
    paste_fit(img, text_layer('FOX LEGNARO', 'ariblk.ttf', (255, 255, 255)), (x0 + h + 30, y0 + 26, x1 - 20, y0 + h // 2 + 10), 'left')
    paste_fit(img, text_layer('HOCKEY IN LINE', 'arialbd.ttf', FOX_RED, spacing=6), (x0 + h + 30, y0 + h // 2 + 22, x1 - 20, y1 - 22), 'left')


save(board_strip(), 'boards_a.jpg')
save(board_strip(), 'boards_b.jpg')
save(board_strip(panels=[(5.0, 2.0, malastrana), (11.0, 3.6, fox_panel)]), 'boards_center.jpg')
corner = board_strip(1024, 256)
save(corner, 'boards_corner.jpg')

# ================================================================== 3. COPERTURA: pannelli grecati grigio chiaro (2 m x 2 m)
print('copertura')
W = H = 512
n = fft_noise(H, W, beta=2.4)
u = np.arange(W)[None, :] / W
rib = 0.5 + 0.5 * np.sign(np.sin(u * math.pi * 2 * 10)) * np.minimum(1, np.abs(np.sin(u * math.pi * 2 * 10)) * 4)
roof = np.zeros((H, W, 3), np.float32) + np.array([206, 210, 214], np.float32)
roof += ((rib - 0.5) * 18)[..., None] + ((n - 0.5) * 10)[..., None]
roof[:, :3] *= 0.85                                     # sormonto tra due lastre
save(to_img(np.broadcast_to(roof, (H, W, 3))), 'roof_panel.jpg')
save(normal_from_height(np.broadcast_to(rib, (H, W)) * 2.0 + n * 0.3, 2.0), 'roof_panel_n.jpg')

# ================================================================== 4. TESTATE: telaio in legno con pannelli traslucidi (cella 2,4 x 1,8 m)
print('testate')
W, H = 480, 360
cell = np.zeros((H, W, 3), np.float32) + np.array([186, 204, 222], np.float32)
g = fft_noise(H, W, beta=2.0)
vert = np.linspace(1.08, 0.92, H)[:, None, None]          # luce più forte in alto
cell = cell * vert + ((g - 0.5) * 14)[..., None]
for xx in range(0, W, 16):                               # alveoli del policarbonato
    cell[:, xx:xx + 2] *= 0.96
ci = to_img(cell).convert('RGBA')
d = ImageDraw.Draw(ci)
wood = Image.open(os.path.join(ROOT, 'assets', 'textures', 'cittadella', 'glulam.jpg')).convert('RGB').resize((W, H))
mask = Image.new('L', (W, H), 0)
md = ImageDraw.Draw(mask)
md.rectangle([0, 0, W, 22], fill=255); md.rectangle([0, H - 22, W, H], fill=255)
md.rectangle([0, 0, 24, H], fill=255); md.rectangle([W - 24, 0, W, H], fill=255)
ci.paste(wood, (0, 0), mask)
d.line([(0, 22), (W, 22)], fill=(110, 70, 30, 255), width=2)
d.line([(24, 0), (24, H)], fill=(110, 70, 30, 255), width=2)
save(ci, 'end_wall.jpg')

# muretto basso in blocchi grigi (cella 0,4 x 0,2 m ripetuta)
W, H = 512, 256
blk = np.zeros((H, W, 3), np.float32) + np.array([182, 184, 186], np.float32)
blk += ((fft_noise(H, W, beta=1.6) - 0.5) * 18)[..., None]
bi = to_img(blk)
bd = ImageDraw.Draw(bi)
for r in range(4):
    y = r * 64
    bd.line([(0, y), (W, y)], fill=(130, 132, 134), width=3)
    off = 0 if r % 2 == 0 else 64
    for x in range(off, W, 128):
        bd.line([(x, y), (x, y + 64)], fill=(130, 132, 134), width=3)
save(bi, 'block_wall.jpg')

# ================================================================== 5. STRISCIONI SPONSOR E BANDIERA FOX
print('striscioni')


def banner(name, w=1024, h=256):
    img = Image.new('RGBA', (w, h), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    m = int(h * 0.12)
    if name == 'ali':
        paste_fit(img, text_layer('Alì', 'ariblk.ttf', (230, 40, 30), shear=-0.12), (m, int(h * 0.1), int(w * 0.42), int(h * 0.9)))
        paste_fit(img, text_layer('MIGLIORA LA VITA!', 'arialbd.ttf', (40, 40, 40)), (int(w * 0.45), int(h * 0.3), w - m, int(h * 0.7)), 'left')
    elif name == 'firestop':
        paste_fit(img, text_layer('FIRESTOP', 'ariblk.ttf', (30, 30, 34), shear=-0.15), (m, int(h * 0.16), int(w * 0.78), int(h * 0.68)))
        d.polygon([(int(w * 0.82), int(h * 0.7)), (int(w * 0.88), int(h * 0.15)), (int(w * 0.94), int(h * 0.7))], fill=(230, 60, 20))
        paste_fit(img, text_layer('PROTEZIONE ANTINCENDIO', 'arialbd.ttf', (120, 120, 120), spacing=3), (int(w * 0.12), int(h * 0.74), int(w * 0.88), h - m))
    elif name == 'zac':
        paste_fit(img, text_layer('ZAC', 'ariblk.ttf', (210, 30, 40), shear=-0.2, spacing=8), (m, int(h * 0.1), int(w * 0.5), int(h * 0.8)))
        paste_fit(img, text_layer('RICAMBI • PNEUMATICI', 'arialbd.ttf', (30, 50, 110)), (int(w * 0.52), int(h * 0.32), w - m, int(h * 0.62)), 'left')
    elif name == 'tsb':
        d.rectangle([0, 0, w, h], fill=(232, 240, 250))
        paste_fit(img, text_layer('T.S.B.', 'ariblk.ttf', (24, 60, 140), spacing=6), (int(w * 0.2), int(h * 0.1), int(w * 0.8), int(h * 0.64)))
        paste_fit(img, text_layer('TECNOLOGIE E SERVIZI', 'arialbd.ttf', (24, 60, 140), spacing=4), (int(w * 0.18), int(h * 0.7), int(w * 0.82), h - m))
    elif name == 'pengo':
        d.rectangle([0, 0, int(h * 0.9), h], fill=(40, 140, 70))
        paste_fit(img, text_layer('F.lli PENGO', 'ariblk.ttf', (40, 120, 60)), (int(h * 0.9) + m, int(h * 0.16), w - m, int(h * 0.62)), 'left')
        paste_fit(img, text_layer('GIARDINAGGIO', 'arialbd.ttf', (110, 110, 110), spacing=6), (int(h * 0.9) + m, int(h * 0.66), int(w * 0.8), h - m), 'left')
    elif name == 'conad':
        d.rectangle([0, 0, w, h], fill=(214, 30, 36))
        paste_fit(img, text_layer('CONAD', 'ariblk.ttf', (255, 255, 255), spacing=10), (int(w * 0.18), int(h * 0.16), int(w * 0.82), int(h * 0.84)))
    elif name == 'fox':
        d.rectangle([0, 0, w, h], fill=FOX_BLACK)
        paste_fit(img, LOGO, (m, m // 2, m + h - m, h - m // 2))
        paste_fit(img, text_layer('FOX LEGNARO', 'ariblk.ttf', (255, 255, 255)), (h + m, int(h * 0.12), w - m, int(h * 0.6)), 'left')
        paste_fit(img, text_layer('HOCKEY IN LINE', 'arialbd.ttf', FOX_GOLD, spacing=8), (h + m, int(h * 0.64), w - m, int(h * 0.86)), 'left')
    return banner_finish(img)


for nm in ['ali', 'firestop', 'zac', 'tsb', 'pengo', 'conad', 'fox']:
    save(banner(nm), f'banner_{nm}.jpg', quality=86)

# bandiera nera con la volpe e il triangolo (stendardo appeso alla testata)
fw, fh = 640, 860
flag = Image.new('RGBA', (fw, fh), FOX_BLACK + (255,))
fd = ImageDraw.Draw(flag)
fd.polygon([(60, 330), (fw - 60, 330), (fw // 2, fh - 70)], fill=(70, 72, 78, 255))
paste_fit(flag, LOGO, (40, 60, fw - 40, fh - 120))
save(banner_finish(flag), 'flag_fox.jpg', quality=88)
print('fatto')
