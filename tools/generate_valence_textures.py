"""Genera le texture del Gymnase Denis Maurin (Aiglons de Valence) in assets/textures/valence/.
Uso (dalla cartella del progetto): python tools/generate_valence_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/valence.jpg e le foto della sala, una palestra moderna: pista a piastrelle azzurre con
la riga centrale rosso scuro, i cerchi e le aree di porta arancio-rosse; balaustre bianche col piede giallo;
controsoffitto bianco in pannelli fonoassorbenti con i faretti tondi; lanterne lungo la sala con le capriate a
vista, la lamiera chiara e le vetrate; parete in doghe verticali di legno chiaro; al piano terra porte vetrate fra
pilastri bianchi, sopra il ballatoio con la ringhiera e la tribuna.
Nei cartelloni solo club, città e territorio: niente marchi commerciali.
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'valence')
os.makedirs(OUT, exist_ok=True)
random.seed(18000)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'valence.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
RED, BLACK, WHITE, NAVY = (216, 35, 42), (20, 20, 22), (255, 255, 255), (28, 52, 120)


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


# ================================================================== 1. PISTA azzurra, righe arancio-rosse
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
n1 = resized_noise(512, 256, 2.0, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([150, 196, 228], np.float32)
col += ((n1 - 0.5) * 9)[..., None]
TILE = 0.3048
ix = (np.arange(W) / S / TILE).astype(int)
iz = (np.arange(H) / S / TILE).astype(int)
rng = np.random.default_rng(13)
col += rng.normal(0, 2.0, (iz.max() + 1, ix.max() + 1)).astype(np.float32)[iz[:, None], ix[None, :]][..., None]
gx = ((np.arange(W) / S) % TILE) < (1.0 / S)
gz = ((np.arange(H) / S) % TILE) < (1.0 / S)
groove = gz[:, None] | gx[None, :]
col[groove] *= 0.94

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('dark', 'orange')}
draws = {k: ImageDraw.Draw(m) for k, m in masks.items()}
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)
px = lambda m: max(1, int(m * S * SS))


def rect(k, x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    draws[k].rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def ring(k, x, z, r, wdt):
    c = P(x, z); R = r * S * SS
    draws[k].ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], outline=255, width=px(wdt))


rect('dark', -RW / 2, -0.22, RW / 2, 0.22)                 # riga centrale larga rosso scuro
ring('orange', 0, 0, 4.5, 0.06)
rect('orange', -0.25, -0.25, 0.25, 0.25)
for s in (-1, 1):
    rect('orange', -RW / 2 + 1.4, s * 31 - 0.05, RW / 2 - 1.4, s * 31 + 0.05)
    rect('orange', -1.8, s * 31, 1.8, s * 28.8)            # area di porta piena
    rect('orange', -RW / 2 + 1, s * 12 - 0.05, RW / 2 - 1, s * 12 + 0.05)
    for x in (-8.5, 8.5):
        ring('orange', x, s * 21, 4.5, 0.06)
        rect('orange', x - 0.35, s * 21 - 0.25, x + 0.35, s * 21 + 0.25)
        rect('orange', x - 0.3, s * 8 - 0.18, x + 0.3, s * 8 + 0.18)
cols = {'dark': (170, 52, 44), 'orange': (230, 108, 64)}
for k, a in (('dark', 0.9), ('orange', 0.9)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(cols[k], np.float32) * m * a
img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1800):
    cx, cy = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(30, 260); a0 = random.uniform(0, 360)
    sd.arc([cx - ln, cy - ln, cx + ln, cy + ln], a0, a0 + random.uniform(10, 50), fill=(40, 60, 90, random.randint(8, 18)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img, 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.15 + (~groove) * 0.22, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE bianche col piede giallo
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([238, 240, 240], np.float32)
    arr += ((n - 0.5) * 7)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.rectangle([x - 2, 0, x + 2, h], fill=(210, 212, 212, 255))
    d.rectangle([0, 0, w, 6], fill=(70, 90, 130, 255))
    d.rectangle([0, h - 36, w, h], fill=(236, 196, 30, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 26, int((xm + wm) * pxm), h - 48)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(300):
        x, y = random.uniform(0, w), random.uniform(h * 0.35, h - 8)
        r = random.uniform(3, 8)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 44, random.randint(20, 55)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def logo_panel(img, x0, y0, x1, y1):
    paste_fit(img, LOGO, (x0 + 6, y0 + 2, x1 - 6, y1 - 2))


def text_panel(t, bg, fg, fnt='arialbd.ttf', sub=None, subcol=None):
    def f(img, x0, y0, x1, y1):
        ImageDraw.Draw(img).rectangle([x0, y0, x1, y1], fill=bg + (255,), outline=(170, 170, 170, 255), width=3)
        if sub:
            mid = y0 + (y1 - y0) * 0.62
            paste_fit(img, text_layer(t, fnt, fg, spacing=4), (x0 + 24, y0 + 10, x1 - 24, int(mid)))
            paste_fit(img, text_layer(sub, 'arial.ttf', subcol or fg, spacing=3), (x0 + 24, int(mid) + 4, x1 - 24, y1 - 8))
        else:
            paste_fit(img, text_layer(t, fnt, fg, spacing=4), (x0 + 24, y0 + 14, x1 - 24, y1 - 14))
    return f


def club_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=RED + (255,))
    d.rectangle([x0, y1 - 10, x1, y1], fill=BLACK + (255,))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 8, y0 + 2, x0 + int(h * 1.1), y1 - 12))
    paste_fit(img, text_layer('AIGLONS', 'ariblk.ttf', WHITE), (x0 + int(h * 1.1) + 16, y0 + 8, x1 - 20, y0 + h // 2 + 2), 'left')
    paste_fit(img, text_layer('ROLLER HOCKEY • VALENCE', 'arialbd.ttf', WHITE, spacing=3), (x0 + int(h * 1.1) + 16, y0 + h // 2 + 8, x1 - 20, y1 - 18), 'left')


save(board_strip(panels=[(1.0, 2.0, logo_panel), (4.0, 4.4, text_panel('VALENCE', WHITE, RED, 'ariblk.ttf')), (12.0, 5.2, text_panel('DRÔME', (120, 40, 110), WHITE, 'arialbd.ttf', 'LE DÉPARTEMENT', (236, 220, 236)))]), 'boards_a.jpg')
save(board_strip(panels=[(1.2, 5.8, text_panel('Auvergne-Rhône-Alpes', WHITE, NAVY, 'arialbi.ttf', 'LA RÉGION', (90, 90, 96))), (10.5, 2.0, logo_panel), (13.5, 4.4, text_panel('AIGLONS', BLACK, RED, 'ariblk.ttf'))]), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 6.0, club_panel), (11.5, 4.4, text_panel('VALENCE', WHITE, RED, 'ariblk.ttf'))]), 'boards_center.jpg')
save(board_strip(1024, 256, panels=[(6.5, 3.6, logo_panel)]), 'boards_corner.jpg')

# ================================================================== 3. EDIFICIO
print('edificio')
# doghe verticali di legno chiaro (texture 4 x 4 m, doghe da 8 cm con le fughe scure)
W = H = 1024
u = np.arange(W)[None, :] / W
wd = np.zeros((H, W, 3), np.float32) + np.array([214, 168, 104], np.float32)
grain = resized_noise(4, 512, 1.2, H, W)
wd *= (0.88 + 0.18 * grain)[..., None]
slat = (np.arange(W) // (W // 50))
rr = np.random.default_rng(3).normal(0, 0.05, slat.max() + 1)
wd *= (1 + rr[slat])[None, :, None]
gap = (np.arange(W) % (W // 50)) < 4
wd[:, gap] *= 0.45
save(to_img(wd), 'wood_slats.jpg')
# controsoffitto in pannelli fonoassorbenti bianchi (texture 2,4 x 2,4 m, pannelli 60 cm, microforatura)
W = H = 512
ce = np.zeros((H, W, 3), np.float32) + np.array([236, 236, 232], np.float32)
ce += ((fft_noise(H, W, beta=1.2) - 0.5) * 6)[..., None]
im = to_img(ce)
d = ImageDraw.Draw(im)
for k in range(0, W + 1, W // 4):
    d.line([(k, 0), (k, H)], fill=(206, 206, 202), width=3)
    d.line([(0, k), (W, k)], fill=(206, 206, 202), width=3)
save(im.filter(ImageFilter.GaussianBlur(0.4)), 'ceiling.jpg')
# intonaco bianco-grigio (pareti e soffitti delle travi)
pl = np.zeros((H, W, 3), np.float32) + np.array([226, 226, 222], np.float32)
pl += ((fft_noise(H, W, beta=2.2) - 0.5) * 8)[..., None]
save(to_img(pl).filter(ImageFilter.GaussianBlur(0.6)), 'plaster.jpg')
# piano terra sotto il ballatoio: pilastri bianchi, porte vetrate e pannelli traslucidi (una campata da 3 m x 3,4 m)
W, H = 512, 580
fa = Image.new('RGB', (W, H), (232, 232, 228))
fd = ImageDraw.Draw(fa)
fd.rectangle([60, 30, W - 60, H - 10], fill=(150, 162, 168))
fd.rectangle([70, 40, W // 2 - 4, H - 20], fill=(88, 104, 112))
fd.rectangle([W // 2 + 4, 40, W - 70, H - 20], fill=(210, 216, 216))
fd.rectangle([W // 2 - 30, H // 2, W // 2 - 20, H // 2 + 40], fill=(200, 200, 200))
fd.rectangle([0, 0, 58, H], fill=(244, 244, 240))
fd.rectangle([W - 58, 0, W, H], fill=(244, 244, 240))
fd.rectangle([0, 0, W, 28], fill=(240, 240, 236))
save(fa, 'facade.jpg')
# porta grigia con l'oblò (lato legno)
dr = Image.new('RGB', (256, 512), (190, 194, 196))
dd = ImageDraw.Draw(dr)
dd.rectangle([0, 0, 255, 511], outline=(150, 154, 156), width=10)
dd.rectangle([80, 70, 176, 220], fill=(80, 96, 104))
dd.rectangle([190, 250, 214, 290], fill=(120, 120, 120))
save(dr, 'door.jpg')
# vetrate laterali delle lanterne, con le diagonali delle travi reticolari davanti
W, H = 768, 256
cl = np.zeros((H, W, 3), np.float32) + np.array([200, 214, 226], np.float32)
cl += ((resized_noise(8, 32, 1.4, H, W) - 0.5) * 16)[..., None]
im = to_img(cl)
d = ImageDraw.Draw(im)
for k in range(0, W + 1, 96):
    d.rectangle([k - 4, 0, k + 4, H], fill=(236, 238, 238))
for k in range(0, W, 192):
    d.line([(k, H - 8), (k + 96, 8)], fill=(240, 240, 240), width=8)
    d.line([(k + 96, 8), (k + 192, H - 8)], fill=(240, 240, 240), width=8)
d.rectangle([0, 0, W, 8], fill=(236, 238, 238)); d.rectangle([0, H - 8, W, H], fill=(236, 238, 238))
save(im, 'clerestory.jpg')
# lamiera chiara della lanterna e lucernari
W = H = 512
rf = np.zeros((H, W, 3), np.float32) + np.array([206, 208, 210], np.float32)
rf += ((fft_noise(H, W, beta=2.2) - 0.5) * 8)[..., None]
rf *= (1 - 0.16 * (np.sin(np.arange(W)[None, :] / W * np.pi * 2 * 20) > 0.45))[..., None]
save(to_img(rf).filter(ImageFilter.GaussianBlur(0.5)), 'roof_deck.jpg')
sk = np.zeros((256, 512, 3), np.float32) + np.array([224, 234, 242], np.float32)
sk += ((resized_noise(8, 32, 1.4, 256, 512) - 0.5) * 14)[..., None]
im = to_img(sk)
d = ImageDraw.Draw(im)
for k in range(0, 513, 128):
    d.rectangle([k - 4, 0, k + 4, 256], fill=(170, 176, 180))
save(im, 'skylight.jpg')
# rete bianca (davanti al piano terra e sopra la ringhiera del ballatoio)
W = H = 256
net = Image.new('RGBA', (W, H), (0, 0, 0, 0))
nd = ImageDraw.Draw(net)
for k in range(0, W + 1, 14):
    nd.line([(k, 0), (k, H)], fill=(244, 244, 240, 200), width=2)
    nd.line([(0, k), (W, k)], fill=(244, 244, 240, 200), width=2)
save(net, 'net.png')

# ================================================================== 4. STRISCIONI
print('striscioni')
# striscione del tifo (nero, scritte rosse e bianche) appeso alla ringhiera del ballatoio
b = Image.new('RGBA', (1024, 512), BLACK + (255,))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 0, 1024, 20], fill=RED); bd.rectangle([0, 492, 1024, 512], fill=RED)
paste_fit(b, text_layer('LE KOP', 'impact.ttf', WHITE, spacing=10), (60, 50, 964, 230))
paste_fit(b, text_layer('DES AIGLONS', 'impact.ttf', RED, spacing=8), (60, 260, 964, 460))
save(banner_finish(b), 'banner_kop.jpg', quality=86)
# stendardo del club (verticale, con l'aquila)
b = Image.new('RGBA', (512, 820), (246, 246, 242, 255))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 0, 512, 30], fill=RED); bd.rectangle([0, 790, 512, 820], fill=RED)
paste_fit(b, LOGO, (30, 60, 482, 520))
paste_fit(b, text_layer('AIGLONS', 'ariblk.ttf', BLACK), (40, 560, 472, 660))
paste_fit(b, text_layer('VALENCE', 'arialbd.ttf', RED, spacing=8), (80, 680, 432, 750))
save(banner_finish(b), 'banner_club.jpg', quality=86)
# striscione della città
b = Image.new('RGBA', (1600, 300), RED + (255,))
paste_fit(b, LOGO, (20, 10, 300, 290))
paste_fit(b, text_layer('VALENCE • DRÔME', 'ariblk.ttf', WHITE, spacing=6), (330, 50, 1560, 180), 'left')
paste_fit(b, text_layer('ROLLER HOCKEY', 'arialbd.ttf', (255, 220, 220), spacing=4), (330, 200, 1400, 260), 'left')
save(banner_finish(b), 'banner_city.jpg', quality=86)
print('fatto')
