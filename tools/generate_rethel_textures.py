"""Genera le texture del Gymnase André Chausson (Rethel, Ardenne) in assets/textures/rethel/.
Uso (dalla cartella del progetto): python tools/generate_rethel_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: foto del palazzetto dei Diables Rethelois (pavimento a piastrelle azzurro chiaro con
la linea centrale rossa e cerchi/linee arancio, balaustre bianche coi cartelloni, pareti in doghe di
pino sopra uno zoccolo chiaro, finestre alte e strette, grande vetrata a riquadri, copertura in
lamiera grecata grigia su travi in legno lamellare, parete d'arrampicata grigia sulla testata).
Nei cartelloni solo club, città e territorio: niente marchi commerciali.
"""
import sys, os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'rethel')
os.makedirs(OUT, exist_ok=True)
random.seed(2008)
rs = np.random.default_rng(2008)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'rethel.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
RED, BLACK, ORANGE = (200, 16, 46), (17, 17, 20), (232, 112, 40)
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


# ================================================================== 1. PISTA: piastrelle azzurro chiaro
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
X = (np.arange(W)[None, :] + 0.5) / S - RW / 2
Z = (np.arange(H)[:, None] + 0.5) / S - RL / 2
n1 = resized_noise(512, 256, 2.2, H, W)
n2 = resized_noise(1024, 512, 1.4, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([112, 186, 222], np.float32)
col += ((n1 - 0.5) * 14)[..., None]
col += ((n2 - 0.5) * 6)[..., None]
# piastrelle da 30 cm: fughe appena più scure e leggere differenze di tono fra una piastrella e l'altra
T = 0.3048
tx, tz = np.floor((X + RW / 2) / T).astype(np.int64), np.floor((Z + RL / 2) / T).astype(np.int64)
col += (rs.uniform(-1, 1, 4096).astype(np.float32)[(tx * 31 + tz * 17) % 4096] * 2.5)[..., None]
fx = np.abs(((X + RW / 2) / T) % 1 - 0.5) > 0.47
fz = np.abs(((Z + RL / 2) / T) % 1 - 0.5) > 0.47
col[np.broadcast_to(fx | fz, col.shape[:2])] *= 0.93
CR = 7.5
cx_, cz_ = RW / 2 - CR, RL / 2 - CR
outside = (np.abs(X) > cx_) & (np.abs(Z) > cz_) & (((np.abs(X) - cx_) ** 2 + (np.abs(Z) - cz_) ** 2) > CR ** 2)
col[outside] *= 0.85

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'orange', 'crease')}
draws = {k: ImageDraw.Draw(m) for k, m in masks.items()}
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)


def rect(k, x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    draws[k].rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def ring(k, x, z, r, wdt):
    c = P(x, z); R = r * S * SS
    draws[k].ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], outline=255, width=max(1, int(wdt * S * SS)))


def disc(k, x, z, r):
    c = P(x, z); R = r * S * SS
    draws[k].ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], fill=255)


def pie(k, x, z, r, a0, a1):
    c = P(x, z); R = r * S * SS
    draws[k].pieslice([c[0] - R, c[1] - R, c[0] + R, c[1] + R], a0, a1, fill=255)


# linea centrale rossa larga, come nelle foto; il resto delle linee in arancio
rect('red', -RW / 2, -0.16, RW / 2, 0.16)
ring('orange', 0, 0, 4.5, 0.11)
disc('red', 0, 0, 0.3)
for sgn in (-1, 1):
    rect('orange', -RW / 2 + 1.6, sgn * 31 - 0.08, RW / 2 - 1.6, sgn * 31 + 0.08)
    pie('crease', 0, sgn * 31, 1.8, 180 if sgn > 0 else 0, 360 if sgn > 0 else 180)
    for x in (-8.5, 8.5):
        ring('orange', x, sgn * 21, 4.5, 0.1)
        disc('red', x, sgn * 21, 0.3)
        disc('red', x, sgn * 9.5, 0.22)
cols = {'orange': ORANGE, 'red': (214, 50, 40), 'crease': (226, 92, 52)}
for k, a in (('crease', 0.85), ('orange', 0.9), ('red', 0.92)):
    m = np.asarray(masks[k].resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(cols[k], np.float32) * m * a

img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1400):                                  # segni di ruote
    px, py = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(20, 180); a0 = random.uniform(0, 180)
    sd.arc([px - ln, py - ln, px + ln, py + ln], a0, a0 + random.uniform(15, 60), fill=(40, 60, 80, random.randint(6, 14)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)
save(normal_from_height(n2 * 0.6 + n1 * 0.4, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE: bianche coi cartelloni
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
    d.rectangle([0, h - 30, w, h], fill=RED + (255,))
    d.rectangle([0, 0, w, 5], fill=(226, 226, 220, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 16, int((xm + wm) * pxm), h - 42)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(260):                               # segni dei dischi
        x, y = random.uniform(0, w), random.uniform(h * 0.4, h - 34)
        r = random.uniform(3, 9)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 44, random.randint(20, 60)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def logo_panel(img, x0, y0, x1, y1):
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + (x1 - x0 - h) // 2, y0 + 4, x0 + (x1 - x0 + h) // 2, y1 - 4))


def club_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=BLACK + (255,))
    d.rectangle([x0, y1 - 10, x1, y1], fill=RED + (255,))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 10, y0 + 4, x0 + 10 + h, y1 - 12))
    paste_fit(img, text_layer('DIABLES RETHELOIS', 'ariblk.ttf', (255, 255, 255)), (x0 + h + 26, y0 + 18, x1 - 20, y0 + h // 2 + 6), 'left')
    paste_fit(img, text_layer('ROLLER HOCKEY • PAYS RETHÉLOIS', 'arialbd.ttf', (240, 90, 100), spacing=4), (x0 + h + 26, y0 + h // 2 + 16, x1 - 20, y1 - 22), 'left')


def city_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=(20, 60, 130, 255), width=6)
    paste_fit(img, text_layer('VILLE DE RETHEL', 'arialbd.ttf', (20, 60, 130), spacing=4), (x0 + 30, y0 + 20, x1 - 30, y0 + (y1 - y0) * 2 // 3))
    paste_fit(img, text_layer('ARDENNES', 'arial.ttf', (60, 120, 190), spacing=10), (x0 + 80, y0 + (y1 - y0) * 2 // 3, x1 - 80, y1 - 14))


def region_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(0, 102, 178, 255))
    paste_fit(img, text_layer('GRAND EST', 'ariblk.ttf', (255, 255, 255), spacing=6), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


def elite_panel(img, x0, y0, x1, y1):
    paste_fit(img, text_layer('LIGUE ÉLITE ROLLER HOCKEY', 'impact.ttf', (20, 20, 24), spacing=6), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


save(board_strip(panels=[(1.5, 1.4, logo_panel), (4.0, 4.2, city_panel), (12.5, 4.4, elite_panel)]), 'boards_a.jpg')
save(board_strip(panels=[(2.0, 4.2, region_panel), (10.5, 1.4, logo_panel), (13.5, 4.2, city_panel)]), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 4.4, club_panel), (11.0, 4.2, region_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256, panels=[(7.0, 4.0, logo_panel)]), 'boards_corner.jpg')

# ================================================================== 3. EDIFICIO
print('edificio')
# legno lamellare delle travi: lamelle orizzontali color miele
W, H = 512, 256
g = resized_noise(64, 512, 1.5, H, W)
wood = np.zeros((H, W, 3), np.float32) + np.array([206, 158, 92], np.float32)
wood += ((g - 0.5) * 30)[..., None]
wood[np.broadcast_to((np.arange(H)[:, None] % 32) < 2, (H, W))] *= 0.8
save(to_img(wood), 'glulam.jpg')

# rivestimento in doghe verticali di pino (giallo-arancio, venature e fughe scure)
W, H = 512, 512
grain = resized_noise(512, 32, 1.2, H, W)
wcl = np.zeros((H, W, 3), np.float32) + np.array([214, 160, 84], np.float32)
wcl += ((grain - 0.5) * 34)[..., None]
board = (np.arange(W)[None, :] // 64)
wcl += (rs.uniform(-1, 1, 16).astype(np.float32)[board % 16] * 12)[..., None]
wcl[np.broadcast_to((np.arange(W)[None, :] % 64) < 3, (H, W))] *= 0.62
save(to_img(wcl), 'wood_cladding.jpg')

# zoccolo chiaro (intonaco crema) sotto il legno
W, H = 512, 256
n = fft_noise(H, W, beta=2.0)
plaster = np.zeros((H, W, 3), np.float32) + np.array([226, 220, 204], np.float32)
plaster += ((n - 0.5) * 12)[..., None]
pi = to_img(plaster)
ImageDraw.Draw(pi).line([(0, 3), (W, 3)], fill=(180, 172, 156), width=6)
save(pi, 'wall_low.jpg')

# copertura in lamiera grecata grigio chiaro
W = H = 512
n = fft_noise(H, W, beta=2.2)
roof = np.zeros((H, W, 3), np.float32) + np.array([150, 154, 158], np.float32)
roof += ((n - 0.5) * 14)[..., None]
u = np.arange(W)[None, :] / W
roof *= (1 - 0.2 * (np.sin(u * math.pi * 2 * 16) > 0.55))[..., None]
save(to_img(roof).filter(ImageFilter.GaussianBlur(0.6)), 'roof_deck.jpg')


# finestre: alte e strette (vetro chiaro coi traversi) e grande vetrata a riquadri sugli alberi
def window_tall():
    W, H = 128, 512
    base = np.zeros((H, W, 3), np.float32) + np.array([206, 222, 236], np.float32)
    base += ((resized_noise(64, 32, 1.6, H, W) - 0.5) * 22)[..., None]
    im = to_img(base)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W - 1, H - 1], outline=(110, 116, 124), width=8)
    for y in range(0, H, 64):
        d.rectangle([0, y - 3, W, y + 3], fill=(120, 126, 134))
    return im


def window_grid():
    W, H = 1024, 512
    sky = np.zeros((H, W, 3), np.float32)
    t = np.arange(H)[:, None] / H
    sky += np.array([214, 230, 244], np.float32) * (1 - t[..., None] * 0.15)
    trees = resized_noise(64, 128, 1.8, H, W)
    hor = (np.arange(H)[:, None] > H * 0.55 - (trees[:, :1] - 0.5) * 60)
    tree_col = np.array([70, 104, 66], np.float32) + ((trees - 0.5) * 50)[..., None]
    sky = np.where(np.broadcast_to(hor[..., None], sky.shape) & (trees[..., None] > 0.35), tree_col, sky)
    im = to_img(sky)
    d = ImageDraw.Draw(im)
    for x in range(0, W + 1, 128):
        d.rectangle([x - 5, 0, x + 5, H], fill=(96, 100, 108))
    for y in range(0, H + 1, 128):
        d.rectangle([0, y - 5, W, y + 5], fill=(96, 100, 108))
    return im


save(window_tall(), 'window_tall.jpg')
save(window_grid(), 'window_grid.jpg')

# parete d'arrampicata: pannelli grigi con gli appigli colorati
W, H = 1024, 768
n = fft_noise(H, W, beta=2.0)
cw = np.zeros((H, W, 3), np.float32) + np.array([150, 154, 160], np.float32)
cw += ((n - 0.5) * 22)[..., None]
ci = to_img(cw).convert('RGBA')
cd = ImageDraw.Draw(ci)
for x in range(0, W, 128):
    cd.line([(x, 0), (x, H)], fill=(120, 124, 130, 255), width=3)
for y in range(0, H, 128):
    cd.line([(0, y), (W, y)], fill=(120, 124, 130, 255), width=3)
hold_cols = [(220, 40, 40), (40, 120, 220), (250, 200, 40), (60, 170, 80), (240, 120, 30), (150, 60, 180), (30, 30, 30), (245, 245, 245)]
for _ in range(240):
    x, y = random.uniform(10, W - 10), random.uniform(10, H - 10)
    r = random.uniform(5, 13)
    c = random.choice(hold_cols)
    cd.ellipse([x - r, y - r * 0.8, x + r, y + r * 0.8], fill=c + (255,), outline=(40, 40, 40, 160))
save(ci, 'climbing_wall.jpg')

# fascia di cartelloni sul legno sopra la balaustra (club, città, territorio)
W, H = 4096, 256
ads = Image.new('RGBA', (W, H), (0, 0, 0, 0))
items = [
    ('logo', None), ('DIABLES', (200, 16, 46)), ('VILLE DE RETHEL', (20, 60, 130)), ('ARDENNES', (34, 34, 38)),
    ('logo', None), ('GRAND EST', (0, 102, 178)), ('PAYS RETHÉLOIS', (34, 34, 38)), ('ROLLER HOCKEY', (200, 16, 46)),
]
seg = W // len(items)
ad = ImageDraw.Draw(ads)
for i, (t, c) in enumerate(items):
    x0 = i * seg + 18
    x1 = (i + 1) * seg - 18
    ad.rectangle([x0, 26, x1, H - 26], fill=(250, 250, 248, 255), outline=(200, 200, 196, 255), width=4)
    if t == 'logo':
        paste_fit(ads, LOGO, (x0 + 20, 34, x1 - 20, H - 34))
    else:
        paste_fit(ads, text_layer(t, 'ariblk.ttf', c, spacing=4), (x0 + 40, 70, x1 - 40, H - 70))
save(ads, 'wall_ads.png')

# ================================================================== 4. STRISCIONI E BANDIERA
print('striscioni')
b = Image.new('RGBA', (512, 1024), BLACK + (255,))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 960, 512, 1024], fill=RED)
paste_fit(b, LOGO, (40, 100, 472, 600))
paste_fit(b, text_layer('DIABLES', 'ariblk.ttf', (255, 255, 255)), (40, 640, 472, 760))
paste_fit(b, text_layer('RETHELOIS', 'ariblk.ttf', RED), (40, 780, 472, 880))
save(banner_finish(b), 'banner_club.jpg', quality=86)
fr = Image.new('RGB', (600, 400))
fd = ImageDraw.Draw(fr)
for i, c in enumerate([(0, 85, 164), (255, 255, 255), (239, 65, 53)]):
    fd.rectangle([i * 200, 0, i * 200 + 200, 400], fill=c)
save(fr, 'flag_france.jpg')
print('fatto')
