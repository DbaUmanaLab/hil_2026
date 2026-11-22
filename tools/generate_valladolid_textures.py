"""Genera le texture del Polideportivo Canterac (Valladolid) in assets/textures/valladolid/.
Uso (dalla cartella del progetto): python tools/generate_valladolid_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: foto del palazzetto del CPLV Hockey Valladolid (pavimento a piastrelle azzurre con la
linea centrale rossa e i cerchi "a gradini" fatti di piastrelle rosso-arancio, aree di porta
rosse, balaustre bianche coi cartelloni, pareti blu in basso e pannelli bianchi sopra, archi in
acciaio grigio chiaro, copertura scura con file di lucernari, tribuna con le panche blu e le
scale gialle, rete di protezione dietro le porte).
Nei cartelloni solo club, città e territorio: niente marchi commerciali.
"""
import sys, os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'valladolid')
os.makedirs(OUT, exist_ok=True)
random.seed(1983)
rs = np.random.default_rng(1983)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'valladolid.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
BLUE, DARK, RED = (30, 136, 229), (28, 30, 36), (214, 52, 44)
PURPLE = (110, 40, 110)          # viola di Valladolid (città)


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


# ================================================================== 1. PISTA: piastrelle azzurre, segni "a gradini"
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
X = (np.arange(W)[None, :] + 0.5) / S - RW / 2
Z = (np.arange(H)[:, None] + 0.5) / S - RL / 2
n1 = resized_noise(512, 256, 2.2, H, W)
n2 = resized_noise(1024, 512, 1.4, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([138, 200, 232], np.float32)
col += ((n1 - 0.5) * 12)[..., None]
col += ((n2 - 0.5) * 6)[..., None]
T = 0.3048
tx, tz = np.floor((X + RW / 2) / T).astype(np.int64), np.floor((Z + RL / 2) / T).astype(np.int64)
col += (rs.uniform(-1, 1, 4096).astype(np.float32)[(tx * 31 + tz * 17) % 4096] * 2.5)[..., None]
fx = np.abs(((X + RW / 2) / T) % 1 - 0.5) > 0.46
fz = np.abs(((Z + RL / 2) / T) % 1 - 0.5) > 0.46
grout = np.broadcast_to(fx | fz, col.shape[:2])
CR = 7.5
cx_, cz_ = RW / 2 - CR, RL / 2 - CR
outside = (np.abs(X) > cx_) & (np.abs(Z) > cz_) & (((np.abs(X) - cx_) ** 2 + (np.abs(Z) - cz_) ** 2) > CR ** 2)

# i segni sono piastrelle colorate intere: si decide piastrella per piastrella (centro della piastrella)
NX, NZ = int(math.ceil(RW / T)), int(math.ceil(RL / T))
cX = (np.arange(NX)[None, :] + 0.5) * T - RW / 2
cZ = (np.arange(NZ)[:, None] + 0.5) * T - RL / 2
red_t = np.zeros((NZ, NX), bool)        # linee rosse (centro, porta, aree)
ring_t = np.zeros((NZ, NX), bool)       # cerchi rosso-arancio a gradini


def tile_ring(x, z, r):
    d = np.sqrt((cX - x) ** 2 + (cZ - z) ** 2)
    return np.abs(d - r) < T * 0.95


def tile_box(x0, z0, x1, z1):
    return (cX >= min(x0, x1)) & (cX <= max(x0, x1)) & (cZ >= min(z0, z1)) & (cZ <= max(z0, z1))


red_t |= tile_box(-RW / 2, -T * 0.9, RW / 2, T * 0.9)            # linea centrale: due file di piastrelle
ring_t |= tile_ring(0, 0, 4.5)
ring_t |= tile_box(-0.35, -0.35, 0.35, 0.35)
for sgn in (-1, 1):
    red_t |= tile_box(-RW / 2 + 1.6, sgn * 31 - T * 0.4, RW / 2 - 1.6, sgn * 31 + T * 0.4)     # linea di porta
    red_t |= tile_box(-1.8, sgn * 31, 1.8, sgn * (31 - 2.0))     # area di porta rossa e squadrata
    for x in (-8.5, 8.5):
        ring_t |= tile_ring(x, sgn * 21, 4.5)
        ring_t |= tile_box(x - 0.35, sgn * 21 - 0.35, x + 0.35, sgn * 21 + 0.35)
        red_t |= tile_box(x - 0.2, sgn * 9.5 - 0.2, x + 0.2, sgn * 9.5 + 0.2)
red_px = red_t[np.clip(tz, 0, NZ - 1), np.clip(tx, 0, NX - 1)]
ring_px = ring_t[np.clip(tz, 0, NZ - 1), np.clip(tx, 0, NX - 1)]
col[ring_px] = np.array([232, 86, 52], np.float32) + ((n1[ring_px] - 0.5) * 14)[:, None]
col[red_px] = np.array([214, 48, 42], np.float32) + ((n1[red_px] - 0.5) * 14)[:, None]
col[grout] *= 0.9
col[outside] *= 0.86

img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1400):                                  # segni di ruote
    px, py = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(20, 180); a0 = random.uniform(0, 180)
    sd.arc([px - ln, py - ln, px + ln, py + ln], a0, a0 + random.uniform(15, 60), fill=(40, 60, 80, random.randint(6, 14)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)
gh = n2 * 0.6 + n1 * 0.4
gh = gh - np.broadcast_to(fx | fz, gh.shape) * 0.25
save(normal_from_height(gh, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE: bianche coi cartelloni
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([242, 243, 240], np.float32)
    arr += ((n - 0.5) * 8)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.line([(x, 0), (x, h)], fill=(212, 214, 210, 255), width=3)
    d.rectangle([0, h - 30, w, h], fill=BLUE + (255,))
    d.rectangle([0, 0, w, 5], fill=(224, 226, 222, 255))
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
    paste_fit(img, LOGO, (x0 + 6, y0 + 4, x1 - 6, y1 - 4))


def club_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=DARK + (255,))
    d.rectangle([x0, y1 - 10, x1, y1], fill=BLUE + (255,))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 10, y0 + 6, x0 + 10 + 2 * h, y1 - 14))
    paste_fit(img, text_layer('CPLV HOCKEY', 'ariblk.ttf', (255, 255, 255)), (x0 + 2 * h + 30, y0 + 18, x1 - 20, y0 + h // 2 + 6), 'left')
    paste_fit(img, text_layer('PATINAJE EN LÍNEA • VALLADOLID', 'arialbd.ttf', (110, 190, 250), spacing=4), (x0 + 2 * h + 30, y0 + h // 2 + 16, x1 - 20, y1 - 22), 'left')


def city_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=PURPLE + (255,))
    paste_fit(img, text_layer('VALLADOLID', 'ariblk.ttf', (255, 255, 255), spacing=6), (x0 + 30, y0 + 18, x1 - 30, y0 + (y1 - y0) * 2 // 3))
    paste_fit(img, text_layer('CIUDAD DEPORTIVA', 'arial.ttf', (236, 210, 236), spacing=8), (x0 + 60, y0 + (y1 - y0) * 2 // 3, x1 - 60, y1 - 12))


def region_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=(150, 20, 40, 255), width=6)
    paste_fit(img, text_layer('CASTILLA Y LEÓN', 'arialbd.ttf', (150, 20, 40), spacing=4), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


def liga_panel(img, x0, y0, x1, y1):
    paste_fit(img, text_layer('LIGA ÉLITE HOCKEY LÍNEA', 'impact.ttf', (20, 20, 24), spacing=6), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


def canterac_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(36, 140, 70, 255))
    paste_fit(img, text_layer('POLIDEPORTIVO CANTERAC', 'arialbd.ttf', (255, 255, 255), spacing=4), (x0 + 30, y0 + 28, x1 - 30, y1 - 28))


save(board_strip(panels=[(1.0, 2.2, logo_panel), (4.0, 4.2, city_panel), (12.5, 4.6, liga_panel)]), 'boards_a.jpg')
save(board_strip(panels=[(1.5, 4.4, canterac_panel), (10.5, 2.2, logo_panel), (13.5, 4.2, region_panel)]), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 5.0, club_panel), (11.0, 4.2, city_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256, panels=[(6.5, 3.6, logo_panel)]), 'boards_corner.jpg')

# ================================================================== 3. EDIFICIO
print('edificio')
# parte bassa delle pareti: pannelli blu a giunti orizzontali (riquadro 3.6 m x 3.6 m)
W, H = 512, 512
n = fft_noise(H, W, beta=2.0)
wb = np.zeros((H, W, 3), np.float32) + np.array([38, 98, 170], np.float32)
wb += ((n - 0.5) * 14)[..., None]
wbi = to_img(wb)
d = ImageDraw.Draw(wbi)
for y in range(0, H, 128):
    d.line([(0, y), (W, y)], fill=(26, 70, 128), width=3)
d.line([(0, 0), (0, H)], fill=(26, 70, 128), width=4)
save(wbi, 'wall_blue.jpg')

# parte alta: pannelli sandwich bianchi a fasce orizzontali (texture in metri: 4 m x 4 m)
W, H = 512, 512
n = fft_noise(H, W, beta=2.2)
ww = np.zeros((H, W, 3), np.float32) + np.array([228, 230, 232], np.float32)
ww += ((n - 0.5) * 10)[..., None]
y = np.arange(H)[:, None]
ww *= (1 - 0.07 * ((y % 128) < 3))[..., None]
ww *= (1 - 0.025 * (np.sin(y / 128 * math.pi * 2 * 6) > 0.7))[..., None]
save(to_img(ww), 'wall_white.jpg')

# copertura scura in lamiera grecata (vista dal basso, in ombra)
W = H = 512
n = fft_noise(H, W, beta=2.2)
roof = np.zeros((H, W, 3), np.float32) + np.array([70, 74, 80], np.float32)
roof += ((n - 0.5) * 12)[..., None]
u = np.arange(W)[None, :] / W
roof *= (1 - 0.28 * (np.sin(u * math.pi * 2 * 16) > 0.5))[..., None]
save(to_img(roof).filter(ImageFilter.GaussianBlur(0.6)), 'roof_deck.jpg')

# lucernario: lastra di policarbonato alveolare (chiara, con le nervature)
W, H = 256, 512
lt = np.zeros((H, W, 3), np.float32) + np.array([236, 242, 248], np.float32)
lt += ((resized_noise(64, 32, 1.6, H, W) - 0.5) * 14)[..., None]
lt *= (1 - 0.06 * ((np.arange(W)[None, :] % 32) < 2))[..., None]
li = to_img(lt)
ImageDraw.Draw(li).rectangle([0, 0, W - 1, H - 1], outline=(150, 156, 164), width=10)
save(li, 'skylight.jpg')

# fascia di policarbonato in alto sulle pareti lunghe
W, H = 512, 128
pb = np.zeros((H, W, 3), np.float32) + np.array([214, 224, 232], np.float32)
pb += ((resized_noise(32, 128, 1.6, H, W) - 0.5) * 18)[..., None]
pb *= (1 - 0.1 * ((np.arange(W)[None, :] % 64) < 3))[..., None]
save(to_img(pb), 'poly_band.jpg')

# rete di protezione dietro le porte (maglia scura, trasparente)
W = H = 256
net = Image.new('RGBA', (W, H), (0, 0, 0, 0))
nd = ImageDraw.Draw(net)
for k in range(0, W + 1, 16):
    nd.line([(k, 0), (k, H)], fill=(40, 42, 46, 200), width=2)
    nd.line([(0, k), (W, k)], fill=(40, 42, 46, 200), width=2)
save(net, 'net.png')

# ventilatore da parete (griglia rotonda)
W = H = 256
fan = Image.new('RGBA', (W, H), (0, 0, 0, 0))
fd = ImageDraw.Draw(fan)
fd.ellipse([4, 4, W - 4, H - 4], fill=(150, 150, 146, 255), outline=(90, 90, 88, 255), width=8)
for r in range(20, 124, 12):
    fd.ellipse([128 - r, 128 - r, 128 + r, 128 + r], outline=(100, 100, 98, 255), width=3)
for a in range(0, 360, 30):
    fd.line([(128, 128), (128 + 122 * math.cos(math.radians(a)), 128 + 122 * math.sin(math.radians(a)))], fill=(100, 100, 98, 255), width=3)
fd.ellipse([108, 108, 148, 148], fill=(70, 70, 70, 255))
save(fan, 'wall_fan.png')

# stemma tondo del club sulla parete sopra la tribuna
W = H = 512
cr = Image.new('RGBA', (W, H), (0, 0, 0, 0))
cd = ImageDraw.Draw(cr)
cd.ellipse([6, 6, W - 6, H - 6], fill=(250, 250, 250, 255), outline=BLUE + (255,), width=18)
paste_fit(cr, LOGO, (70, 150, W - 70, H - 150))
save(cr, 'crest_round.png')

# fascia di cartelloni sopra la balaustra sulla testata (club, città, territorio)
W, H = 4096, 256
ads = Image.new('RGBA', (W, H), (0, 0, 0, 0))
items = [
    ('logo', None), ('VALLADOLID', PURPLE), ('CASTILLA Y LEÓN', (150, 20, 40)), ('CPLV', BLUE),
    ('logo', None), ('CANTERAC', (36, 140, 70)), ('HOCKEY LÍNEA', DARK), ('PUCELA', PURPLE),
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
b = Image.new('RGBA', (1024, 384), DARK + (255,))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 0, 1024, 18], fill=BLUE)
bd.rectangle([0, 366, 1024, 384], fill=BLUE)
paste_fit(b, LOGO, (30, 40, 420, 344))
paste_fit(b, text_layer('CPLV HOCKEY', 'ariblk.ttf', (255, 255, 255)), (450, 70, 990, 200), 'left')
paste_fit(b, text_layer('VALLADOLID', 'ariblk.ttf', (110, 190, 250)), (450, 220, 990, 320), 'left')
save(banner_finish(b), 'banner_club.jpg', quality=86)
es = Image.new('RGB', (600, 400))
ed = ImageDraw.Draw(es)
ed.rectangle([0, 0, 600, 100], fill=(170, 21, 27))
ed.rectangle([0, 100, 600, 300], fill=(241, 191, 0))
ed.rectangle([0, 300, 600, 400], fill=(170, 21, 27))
save(es, 'flag_spain.jpg')
print('fatto')
