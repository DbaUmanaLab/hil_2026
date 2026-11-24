"""Genera le texture della Pista Francisco Calvo (Pavelló Municipal Francisco Calvo, Rubí Cent Patins) in
assets/textures/rubi/.
Uso (dalla cartella del progetto): python tools/generate_rubi_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/rubi.png e le foto del palazzetto: pavimento in resina grigia liscia con le righe rosse
dell'hockey e quelle bianche e gialle degli altri sport; balaustre basse bianche; pareti in lamiera grecata chiara
sopra lo zoccolo grigio scuro, con la fascia di finestre in alto; copertura in lamiera scura con le file di
lucernari; tende arancioni; testata sud in blocchi di cemento grigio.
Nei cartelloni solo club, città e territorio: niente marchi commerciali.
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'rubi')
os.makedirs(OUT, exist_ok=True)
random.seed(8191)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'rubi.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
BLACK, WHITE, GOLD, NAVY = (20, 20, 22), (255, 255, 255), (200, 164, 106), (24, 36, 72)
RED, YEL, BLUE = (204, 48, 44), (228, 196, 40), (30, 90, 180)


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


# ================================================================== 1. PISTA in resina grigia
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
n1 = resized_noise(512, 256, 2.0, H, W)
n2 = resized_noise(1024, 512, 1.4, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([156, 154, 150], np.float32)
col += ((n1 - 0.5) * 16)[..., None]                       # chiazze della resina
col += ((n2 - 0.5) * 6)[..., None]
# giunti di dilatazione del massetto, appena visibili (lastre da 6 m)
jx = ((np.arange(W) / S) % 6.0) < (1.5 / S)
jz = ((np.arange(H) / S) % 6.0) < (1.5 / S)
joints = jz[:, None] | jx[None, :]
col[joints] *= 0.9

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'white', 'yellow')}
draws = {k: ImageDraw.Draw(m) for k, m in masks.items()}
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)
px = lambda m: max(1, int(m * S * SS))


def rect(k, x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    draws[k].rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def line(k, pts, w):
    draws[k].line([P(x, z) for x, z in pts], fill=255, width=px(w))


def ring(k, x, z, r, wdt, a0=0, a1=360):
    c = P(x, z); R = r * S * SS
    draws[k].arc([c[0] - R, c[1] - R, c[0] + R, c[1] + R], a0, a1, fill=255, width=px(wdt))


# hockey (rosso, sottile)
rect('red', -RW / 2, -0.07, RW / 2, 0.07)
ring('red', 0, 0, 4.5, 0.06)
rect('red', -0.25, -0.25, 0.25, 0.25)
for s in (-1, 1):
    rect('red', -RW / 2 + 1.4, s * 31 - 0.04, RW / 2 - 1.4, s * 31 + 0.04)
    line('red', [(-1.6, s * 31), (-1.6, s * 29.6), (1.6, s * 29.6), (1.6, s * 31)], 0.05)
    for x in (-8.5, 8.5):
        ring('red', x, s * 21, 4.5, 0.06)
        rect('red', x - 0.25, s * 21 - 0.25, x + 0.25, s * 21 + 0.25)
        rect('red', x - 0.2, s * 8 - 0.2, x + 0.2, s * 8 + 0.2)
# pallacanestro (bianco): campo 15 x 28 con le aree e le linee da tre punti
line('white', [(-7.5, -14), (7.5, -14), (7.5, 14), (-7.5, 14), (-7.5, -14)], 0.05)
line('white', [(-7.5, 0), (7.5, 0)], 0.05)
ring('white', 0, 0, 1.8, 0.05)
for s in (-1, 1):
    zb = s * 14
    line('white', [(-2.45, zb), (-2.45, zb - s * 5.8), (2.45, zb - s * 5.8), (2.45, zb)], 0.05)
    ring('white', 0, zb - s * 1.575, 6.75, 0.05, *((192, 348) if s > 0 else (12, 168)))
# calcetto (giallo): campo 20 x 40 e aree a semicerchio
line('yellow', [(-10, -20), (10, -20), (10, 20), (-10, 20), (-10, -20)], 0.05)
for s in (-1, 1):
    ring('yellow', 0, s * 20, 6, 0.05, *((180, 360) if s > 0 else (0, 180)))
cols = {'yellow': (222, 190, 60), 'white': (238, 238, 234), 'red': (200, 56, 50)}
for k, a in (('yellow', 0.8), ('white', 0.8), ('red', 0.9)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(cols[k], np.float32) * m * a
img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1800):                                      # segni delle ruote
    cx, cy = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(30, 240); a0 = random.uniform(0, 360)
    sd.arc([cx - ln, cy - ln, cx + ln, cy + ln], a0, a0 + random.uniform(10, 50), fill=(50, 50, 52, random.randint(8, 18)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img, 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.12 + (~joints) * 0.1, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE basse bianche
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([242, 242, 240], np.float32)
    arr += ((n - 0.5) * 7)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.rectangle([x - 2, 0, x + 2, h], fill=(206, 208, 208, 255))
    d.rectangle([0, h - 20, w, h], fill=(170, 172, 174, 255))              # piede grigio, sporco
    d.rectangle([0, 0, w, 6], fill=(200, 202, 202, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 30, int((xm + wm) * pxm), h - 40)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(300):                                   # segni delle palline
        x, y = random.uniform(0, w), random.uniform(h * 0.4, h - 22)
        r = random.uniform(3, 9)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 44, random.randint(20, 60)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def logo_panel(img, x0, y0, x1, y1):
    paste_fit(img, LOGO, (x0 + 6, y0 + 4, x1 - 6, y1 - 4))


def club_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=BLACK + (255,))
    d.rectangle([x0, y1 - 12, x1, y1], fill=GOLD + (255,))
    h = y1 - y0
    d.ellipse([x0 + 8, y0 + 2, x0 + h - 6, y1 - 14], fill=WHITE + (255,))
    paste_fit(img, LOGO, (x0 + 12, y0 + 6, x0 + h - 10, y1 - 18))
    paste_fit(img, text_layer('CENT PATINS', 'ariblk.ttf', WHITE), (x0 + h + 20, y0 + 14, x1 - 20, y0 + h // 2 + 2), 'left')
    paste_fit(img, text_layer('RUBÍ', 'ariblk.ttf', GOLD, spacing=10), (x0 + h + 20, y0 + h // 2 + 10, x1 - 20, y1 - 22), 'left')


def rubi_panel(img, x0, y0, x1, y1):                       # "Rubí esport", solo scritta
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=NAVY + (255,), width=6)
    paste_fit(img, text_layer('RUBÍ ESPORT', 'arialbd.ttf', NAVY, spacing=6), (x0 + 30, y0 + 22, x1 - 30, y1 - 22))


def vall_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=BLUE + (255,))
    paste_fit(img, text_layer('VALLÈS OCCIDENTAL', 'arialbd.ttf', WHITE, spacing=4), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


def cat_panel(img, x0, y0, x1, y1):                        # le quattro barre, stilizzate
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=YEL + (255,))
    hh = (y1 - y0) / 9
    for k in range(4):
        y = y0 + hh * (1 + 2 * k)
        d.rectangle([x0, int(y), x0 + 110, int(y + hh)], fill=RED + (255,))
    paste_fit(img, text_layer('CATALUNYA', 'ariblk.ttf', (150, 30, 30), spacing=6), (x0 + 130, y0 + 24, x1 - 24, y1 - 24))


def liga_panel(img, x0, y0, x1, y1):
    paste_fit(img, text_layer('LIGA ÉLITE HOCKEY LÍNEA', 'impact.ttf', BLACK, spacing=6), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


save(board_strip(panels=[(1.0, 2.2, logo_panel), (4.0, 4.2, rubi_panel), (12.5, 4.6, liga_panel)]), 'boards_a.jpg')
save(board_strip(panels=[(1.5, 4.6, vall_panel), (10.5, 2.2, logo_panel), (13.5, 4.2, cat_panel)]), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 5.6, club_panel), (11.0, 4.2, rubi_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256, panels=[(6.5, 3.6, logo_panel)]), 'boards_corner.jpg')

# ================================================================== 3. EDIFICIO
print('edificio')
# lamiera grecata chiara delle pareti (nervature verticali ogni 25 cm), texture 4 x 4 m
W = H = 512
PXw = W / 4.0
xx = np.arange(W)[None, :]
cl = np.zeros((H, W, 3), np.float32) + np.array([212, 208, 196], np.float32)
cl += ((resized_noise(32, 32, 1.8, H, W) - 0.5) * 8)[..., None]
ph = (xx % 32) / 32.0
cl *= (1 - 0.16 * ((ph > 0.42) & (ph < 0.58)) + 0.05 * (ph < 0.12))[..., None]
save(to_img(cl).filter(ImageFilter.GaussianBlur(0.5)), 'cladding.jpg')

# zoccolo in blocchi di cemento grigio scuro (blocchi 40 x 20), texture 4 x 2 m
W, H = 512, 256
PXb = W / 4.0
bz = np.zeros((H, W, 3), np.float32) + np.array([112, 110, 106], np.float32)
bz += ((fft_noise(H, W, beta=1.6) - 0.5) * 14)[..., None]
im = to_img(bz)
d = ImageDraw.Draw(im)
for r in range(11):
    y = int(r * 0.2 * PXb)
    d.line([(0, y), (W, y)], fill=(84, 82, 80), width=2)
    off = (r % 2) * 0.2
    for k in range(-1, 11):
        x = int((k * 0.4 + off) * PXb)
        d.line([(x, y), (x, y + int(0.2 * PXb))], fill=(84, 82, 80), width=2)
save(im, 'plinth_block.jpg')

# blocchi di cemento grigio chiaro della testata sud (spogliatoi a due piani), texture 4 x 2 m
bc = np.zeros((H, W, 3), np.float32) + np.array([168, 164, 156], np.float32)
bc += ((fft_noise(H, W, beta=1.6) - 0.5) * 14)[..., None]
im = to_img(bc)
d = ImageDraw.Draw(im)
for r in range(11):
    y = int(r * 0.2 * PXb)
    d.line([(0, y), (W, y)], fill=(136, 132, 126), width=2)
    off = (r % 2) * 0.2
    for k in range(-1, 11):
        x = int((k * 0.4 + off) * PXb)
        d.line([(x, y), (x, y + int(0.2 * PXb))], fill=(136, 132, 126), width=2)
save(im, 'block_light.jpg')

# fascia di finestre in alto: vetri luminosi con i montanti (texture 6 x 1,8 m)
W, H = 768, 230
fw = np.zeros((H, W, 3), np.float32) + np.array([246, 248, 248], np.float32)
fw += ((resized_noise(8, 32, 1.4, H, W) - 0.5) * 10)[..., None]
im = to_img(fw)
d = ImageDraw.Draw(im)
for k in range(0, W + 1, 128):
    d.rectangle([k - 5, 0, k + 5, H], fill=(150, 154, 158))
d.rectangle([0, 0, W, 8], fill=(150, 154, 158))
d.rectangle([0, H - 8, W, H], fill=(150, 154, 158))
save(im, 'clerestory.jpg')

# lamiera scura della copertura vista da sotto, grecata (texture 4 x 4 m)
W = H = 512
u = np.arange(W)[None, :] / W
rf = np.zeros((H, W, 3), np.float32) + np.array([96, 100, 104], np.float32)
rf += ((fft_noise(H, W, beta=2.2) - 0.5) * 10)[..., None]
rf *= (1 - 0.22 * (np.sin(u * np.pi * 2 * 16) > 0.5))[..., None]
save(to_img(rf).filter(ImageFilter.GaussianBlur(0.6)), 'roof_deck.jpg')

# lucernario: lastra traslucida giallo chiaro, grecata
W, H = 256, 128
sk = np.zeros((H, W, 3), np.float32) + np.array([252, 240, 196], np.float32)
sk *= (1 - 0.08 * (np.sin(np.arange(W)[None, :] / W * np.pi * 2 * 8) > 0.5))[..., None]
save(to_img(sk), 'skylight.jpg')

# tenda arancione a pieghe (texture 3,6 x 7,2 m)
W, H = 256, 512
ct = np.zeros((H, W, 3), np.float32) + np.array([226, 96, 30], np.float32)
xx = np.arange(W)[None, :]
ct *= (0.8 + 0.2 * np.sin(xx / W * np.pi * 2 * 11))[..., None]
ct += ((resized_noise(64, 16, 1.6, H, W) - 0.5) * 10)[..., None]
save(to_img(ct), 'curtain_orange.jpg')

# rete scura dietro le porte
W = H = 256
net = Image.new('RGBA', (W, H), (0, 0, 0, 0))
nd = ImageDraw.Draw(net)
for k in range(0, W + 1, 16):
    nd.line([(k, 0), (k, H)], fill=(28, 30, 32, 190), width=2)
    nd.line([(0, k), (W, k)], fill=(28, 30, 32, 190), width=2)
save(net, 'net.png')

# ================================================================== 4. STRISCIONE DEL CLUB
print('striscioni')
b = Image.new('RGBA', (1024, 384), BLACK + (255,))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 0, 1024, 22], fill=GOLD)
bd.rectangle([0, 362, 1024, 384], fill=GOLD)
bd.ellipse([40, 40, 344, 344], fill=WHITE)
paste_fit(b, LOGO, (56, 56, 328, 328))
paste_fit(b, text_layer('CENT PATINS', 'ariblk.ttf', WHITE), (380, 80, 990, 190), 'left')
paste_fit(b, text_layer('RUBÍ', 'ariblk.ttf', GOLD, spacing=14), (380, 220, 990, 320), 'left')
save(banner_finish(b), 'banner_club.jpg', quality=86)
print('fatto')
