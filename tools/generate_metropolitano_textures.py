"""Genera le texture del Polideportivo Municipal de Zorroza (Metropolitano Hockey Club, Bilbao) in
assets/textures/metropolitano/.
Uso (dalla cartella del progetto): python tools/generate_metropolitano_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/metropolitano.jpg e le foto del palazzetto: pista a piastrelle modulari grigio chiaro
con la riga centrale e i cerchi d'ingaggio rossi, i punti d'ingaggio a croce, le aree di porta piene rosse e le
righe nere sottili di un altro sport; balaustre color crema col piede giallo; pareti di policarbonato lattiginoso
con il telaio grigio fino al tetto; copertura piana con le travi grigie, i pannelli color miele e i lucernari;
reti beige dietro le porte; stendardi blu-bianco-rossi del club.
Nei cartelloni solo club, città e territorio: niente marchi commerciali.
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'metropolitano')
os.makedirs(OUT, exist_ok=True)
random.seed(48013)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'metropolitano.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
BLUE, NAVY, RED, WHITE, BLACK = (31, 58, 158), (20, 32, 74), (214, 43, 43), (255, 255, 255), (20, 20, 22)
YEL = (232, 178, 36)


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


# ================================================================== 1. PISTA a piastrelle grigio chiaro
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
n1 = resized_noise(512, 256, 2.0, H, W)
n2 = resized_noise(1024, 512, 1.4, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([204, 208, 210], np.float32)
col += ((n1 - 0.5) * 10)[..., None]
col += ((n2 - 0.5) * 5)[..., None]
TILE = 0.3048                                              # piastrelle modulari da 30 cm, giunti ben visibili
gx = ((np.arange(W) / S) % TILE) < (1.6 / S)
gz = ((np.arange(H) / S) % TILE) < (1.6 / S)
groove = gz[:, None] | gx[None, :]
col[groove] *= 0.86
# qualche piastrella appena più chiara o più scura (sostituite in tempi diversi)
tw = int(np.ceil(RW / TILE)) + 1
tl = int(np.ceil(RL / TILE)) + 1
tone = np.random.default_rng(48013).normal(0, 2.2, (tl, tw)).astype(np.float32)
ti = ((np.arange(H) / S) // TILE).astype(int)
tj = ((np.arange(W) / S) // TILE).astype(int)
col += tone[ti][:, tj][..., None]

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'black')}
draws = {k: ImageDraw.Draw(m) for k, m in masks.items()}
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)
px = lambda m: max(1, int(m * S * SS))


def rect(k, x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    draws[k].rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def line(k, pts, w):
    draws[k].line([P(x, z) for x, z in pts], fill=255, width=px(w))


def ring(k, x, z, r, wdt):
    c = P(x, z); R = r * S * SS
    draws[k].arc([c[0] - R, c[1] - R, c[0] + R, c[1] + R], 0, 360, fill=255, width=px(wdt))


def cross(k, x, z, a=0.3, t=0.1):                          # punto d'ingaggio a croce (come nelle foto)
    rect(k, x - a, z - t, x + a, z + t)
    rect(k, x - t, z - a, x + t, z + a)


# hockey (rosso)
rect('red', -RW / 2, -0.12, RW / 2, 0.12)
ring('red', 0, 0, 4.5, 0.07)
cross('red', 0, 0)
for s in (-1, 1):
    rect('red', -RW / 2 + 1.4, s * 31 - 0.05, RW / 2 - 1.4, s * 31 + 0.05)
    rect('red', -1.6, s * 31, 1.6, s * 29.4)                   # area di porta piena
    for x in (-8.5, 8.5):
        ring('red', x, s * 21, 4.5, 0.07)
        cross('red', x, s * 21)
        cross('red', x, s * 8, 0.24, 0.08)
# altro sport (nero, sottile): campo 20 x 40 con la riga di metà e le aree
line('black', [(-10, -20), (10, -20), (10, 20), (-10, 20), (-10, -20)], 0.05)
line('black', [(-10, 0), (10, 0)], 0.05)
for s in (-1, 1):
    line('black', [(-6, s * 20), (-6, s * 14), (6, s * 14), (6, s * 20)], 0.05)
cols = {'black': (40, 42, 46), 'red': (204, 44, 40)}
for k, a in (('black', 0.85), ('red', 0.92)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(cols[k], np.float32) * m * a
img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(2200):                                      # segni delle ruote, molti (pista molto usata)
    cx, cy = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(40, 260); a0 = random.uniform(0, 360)
    sd.arc([cx - ln, cy - ln, cx + ln, cy + ln], a0, a0 + random.uniform(10, 60), fill=(50, 54, 60, random.randint(10, 24)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
save(img, 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.15 + (~groove) * 0.35, 1.0), 'rink_normal.jpg', quality=85)

# piastrelle grigio scuro attorno alla pista (texture 4 x 4 m)
W = H = 512
PXa = W / 4.0
ap = np.zeros((H, W, 3), np.float32) + np.array([118, 122, 126], np.float32)
ap += ((fft_noise(H, W, beta=1.8) - 0.5) * 10)[..., None]
g = ((np.arange(W) / PXa) % 0.5) < (2.5 / PXa)
ap[:, g] *= 0.82
ap[g, :] *= 0.82
save(to_img(ap).filter(ImageFilter.GaussianBlur(0.5)), 'apron_tiles.jpg')

# ================================================================== 2. BALAUSTRE color crema col piede giallo
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([240, 236, 224], np.float32)
    arr += ((n - 0.5) * 8)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.rectangle([x - 2, 0, x + 2, h], fill=(210, 206, 194, 255))
    d.rectangle([0, h - 36, w, h], fill=YEL + (255,))
    d.rectangle([0, 0, w, 6], fill=(200, 196, 186, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 24, int((xm + wm) * pxm), h - 52)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(320):                                   # segni delle palline
        x, y = random.uniform(0, w), random.uniform(h * 0.35, h - 38)
        r = random.uniform(3, 9)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 44, random.randint(20, 60)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def logo_panel(img, x0, y0, x1, y1):
    paste_fit(img, LOGO, (x0 + 6, y0 + 4, x1 - 6, y1 - 4))


def club_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=BLUE + (255,))
    d.rectangle([x0, y1 - 12, x1, y1], fill=RED + (255,))
    h = y1 - y0
    d.ellipse([x0 + 8, y0 + 2, x0 + 8 + h - 12, y1 - 14], fill=(255, 255, 255, 255))
    paste_fit(img, LOGO, (x0 + 14, y0 + 6, x0 + h - 10, y1 - 20))
    paste_fit(img, text_layer('METROPOLITANO', 'ariblk.ttf', WHITE), (x0 + h + 20, y0 + 16, x1 - 20, y0 + h // 2 + 4), 'left')
    paste_fit(img, text_layer('HOCKEY CLUB • BILBAO', 'arialbd.ttf', (214, 224, 250), spacing=4), (x0 + h + 20, y0 + h // 2 + 14, x1 - 20, y1 - 24), 'left')


def bilbao_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=RED + (255,), width=6)
    paste_fit(img, text_layer('BILBAO', 'ariblk.ttf', RED, spacing=10), (x0 + 30, y0 + 22, x1 - 30, y1 - 22))


def bizkaia_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(196, 30, 36, 255))
    d.rectangle([x0, y1 - 14, x1, y1], fill=(24, 120, 60, 255))
    paste_fit(img, text_layer('BIZKAIA', 'arialbd.ttf', WHITE, spacing=8), (x0 + 30, y0 + 22, x1 - 30, y1 - 30))


def zorroza_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=NAVY + (255,))
    paste_fit(img, text_layer('ZORROZA KIROLAK', 'arialbd.ttf', WHITE, spacing=4), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


def liga_panel(img, x0, y0, x1, y1):
    paste_fit(img, text_layer('LIGA ÉLITE HOCKEY LÍNEA', 'impact.ttf', BLACK, spacing=6), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


save(board_strip(panels=[(1.0, 2.2, logo_panel), (4.0, 4.2, bilbao_panel), (12.5, 4.6, liga_panel)]), 'boards_a.jpg')
save(board_strip(panels=[(1.5, 4.4, zorroza_panel), (10.5, 2.2, logo_panel), (13.5, 4.0, bizkaia_panel)]), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 5.8, club_panel), (11.0, 4.2, bilbao_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256, panels=[(6.5, 3.6, logo_panel)]), 'boards_corner.jpg')

# ================================================================== 3. EDIFICIO
print('edificio')
# policarbonato lattiginoso con il telaio grigio: lastre da 1 m, traversi ogni 1,25 m (texture 4 x 5 m)
W, H = 512, 640
PXw = W / 4.0
pc = np.zeros((H, W, 3), np.float32) + np.array([226, 222, 228], np.float32)
pc += ((resized_noise(16, 16, 1.4, H, W) - 0.5) * 22)[..., None]
xx = np.arange(W)[None, :]
pc *= (1 - 0.05 * ((xx % 12) < 2))[..., None]                                # alveoli delle lastre
im = to_img(pc)
d = ImageDraw.Draw(im)
for k in range(0, 5):
    d.rectangle([int(k * PXw) - 3, 0, int(k * PXw) + 3, H], fill=(120, 124, 130))
for r in range(0, 5):
    y = int(r * 1.25 * PXw)
    d.rectangle([0, y - 3, W, y + 3], fill=(120, 124, 130))
save(im.filter(ImageFilter.GaussianBlur(0.5)), 'poly_wall.jpg')

# zoccolatura in lamiera grigia dietro le balaustre (texture 4 x 2 m)
W, H = 512, 256
zl = np.zeros((H, W, 3), np.float32) + np.array([168, 172, 176], np.float32)
zl += ((resized_noise(16, 64, 1.6, H, W) - 0.5) * 10)[..., None]
zl *= (1 - 0.12 * ((np.arange(W)[None, :] % 32) < 4))[..., None]
save(to_img(zl), 'wall_low.jpg')

# pannelli della copertura visti da sotto: color miele, grecati (texture 4 x 4 m)
W = H = 512
u = np.arange(W)[None, :] / W
rf = np.zeros((H, W, 3), np.float32) + np.array([214, 178, 112], np.float32)
rf += ((fft_noise(H, W, beta=2.2) - 0.5) * 14)[..., None]
rf *= (1 - 0.2 * (np.sin(u * np.pi * 2 * 14) > 0.5))[..., None]
save(to_img(rf).filter(ImageFilter.GaussianBlur(0.6)), 'roof_deck.jpg')

# lucernario: lastre luminose con il telaio a griglia (texture 4 x 2 m)
W, H = 512, 256
sk = Image.new('RGB', (W, H), (250, 244, 222))
sd = ImageDraw.Draw(sk)
for k in range(0, W + 1, 64):
    sd.rectangle([k - 4, 0, k + 4, H], fill=(150, 140, 120))
sd.rectangle([0, H // 2 - 4, W, H // 2 + 4], fill=(150, 140, 120))
sd.rectangle([0, 0, W - 1, H - 1], outline=(130, 122, 104), width=8)
save(sk, 'skylight.jpg')

# rete beige dietro le porte
W = H = 256
net = Image.new('RGBA', (W, H), (0, 0, 0, 0))
nd = ImageDraw.Draw(net)
for k in range(0, W + 1, 16):
    nd.line([(k, 0), (k, H)], fill=(196, 180, 150, 180), width=2)
    nd.line([(0, k), (W, k)], fill=(196, 180, 150, 180), width=2)
save(net, 'net.png')

# ================================================================== 4. STENDARDI DEL CLUB
print('stendardi')
# stendardo verticale a tre bande (blu, bianco col logo, rosso)
W, H = 384, 768
b = Image.new('RGBA', (W, H), WHITE + (255,))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 0, W, 150], fill=BLUE)
bd.rectangle([0, H - 150, W, H], fill=RED)
paste_fit(b, LOGO, (30, 170, W - 30, H - 170))
save(banner_finish(b), 'banner_flag.jpg', quality=86)
# striscione orizzontale
b = Image.new('RGBA', (1024, 384), BLUE + (255,))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 0, 1024, 22], fill=RED)
bd.rectangle([0, 362, 1024, 384], fill=RED)
bd.ellipse([40, 40, 344, 344], fill=WHITE)
paste_fit(b, LOGO, (62, 60, 322, 324))
paste_fit(b, text_layer('METROPOLITANO', 'ariblk.ttf', WHITE), (380, 80, 990, 190), 'left')
paste_fit(b, text_layer('HOCKEY CLUB • BILBAO', 'arialbd.ttf', (214, 224, 250), spacing=4), (380, 220, 990, 300), 'left')
save(banner_finish(b), 'banner_club.jpg', quality=86)
print('fatto')
