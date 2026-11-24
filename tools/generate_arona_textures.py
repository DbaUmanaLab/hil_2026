"""Genera le texture del Pabellón Municipal de Deportes de Los Cristianos (Arona Tenerife Guanches) in
assets/textures/arona/.
Uso (dalla cartella del progetto): python tools/generate_arona_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/arona.png e le foto del palazzetto: pavimento azzurro con la riga centrale rossa,
le aree di porta piene rosse e i punti d'ingaggio a quadretti rossi, più le righe bianche e gialle degli altri
sport; balaustre bianche con il piede giallo; pareti bianche con la zoccolatura grigio-lilla, la fascia scura e
il filetto blu; pannelli acustici verdi con il disegno a labirinto; la scritta ARONA / DEPORTES sulla testata;
reticolare spaziale giallo. Nei cartelloni solo club, città e territorio: niente marchi commerciali.
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'arona')
os.makedirs(OUT, exist_ok=True)
random.seed(38650)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'arona.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
BLUE, SKY, NAVY = (31, 111, 209), (110, 196, 240), (20, 40, 96)
RED, YEL, WHITE, BLACK = (214, 46, 40), (240, 190, 30), (255, 255, 255), (20, 20, 22)
CANARY = (250, 204, 21)


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


# ================================================================== 1. PISTA azzurra multisport
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
n1 = resized_noise(512, 256, 2.0, H, W)
n2 = resized_noise(1024, 512, 1.4, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([132, 196, 230], np.float32)
col += ((n1 - 0.5) * 9)[..., None]
col += ((n2 - 0.5) * 5)[..., None]
TILE = 0.25
gx = ((np.arange(W) / S) % TILE) < (1.0 / S)
gz = ((np.arange(H) / S) % TILE) < (1.0 / S)
groove = gz[:, None] | gx[None, :]
col[groove] *= 0.96

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


def dashed(k, pts, w, on=0.5, off=0.4):
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        L = ((x1 - x0) ** 2 + (z1 - z0) ** 2) ** 0.5
        t = 0.0
        while t < L:
            t1 = min(L, t + on)
            line(k, [(x0 + (x1 - x0) * t / L, z0 + (z1 - z0) * t / L), (x0 + (x1 - x0) * t1 / L, z0 + (z1 - z0) * t1 / L)], w)
            t += on + off


def ring(k, x, z, r, wdt, a0=0, a1=360):
    c = P(x, z); R = r * S * SS
    draws[k].arc([c[0] - R, c[1] - R, c[0] + R, c[1] + R], a0, a1, fill=255, width=px(wdt))


# pallacanestro (bianco): campo 15 x 28, cerchio centrale, aree e linee da tre punti
line('white', [(-7.5, -14), (7.5, -14), (7.5, 14), (-7.5, 14), (-7.5, -14)], 0.05)
ring('white', 0, 0, 1.8, 0.05)
for s in (-1, 1):
    zb = s * 14
    line('white', [(-2.45, zb), (-2.45, zb - s * 5.8), (2.45, zb - s * 5.8), (2.45, zb)], 0.05)
    ring('white', 0, zb - s * 5.8, 1.8, 0.05, *((180, 360) if s > 0 else (0, 180)))
    ring('white', 0, zb - s * 1.575, 6.75, 0.05, *((192, 348) if s > 0 else (12, 168)))
# calcetto (giallo, tratteggiato): aree a semicerchio
for s in (-1, 1):
    zg = s * 20
    pts = []
    for k in range(25):
        a = np.pi * k / 24
        pts.append((6 * np.cos(a), zg - s * 6 * np.sin(a)))
    dashed('yellow', pts, 0.05)
    dashed('yellow', [(-16, zg - s * 0.1), (16, zg - s * 0.1)], 0.05)
# hockey (rosso): riga centrale, linee di porta, aree di porta piene, punti d'ingaggio a quadretto
rect('red', -RW / 2, -0.14, RW / 2, 0.14)
for s in (-1, 1):
    rect('red', -RW / 2 + 1.4, s * 31 - 0.05, RW / 2 - 1.4, s * 31 + 0.05)
    rect('red', -1.6, s * 31, 1.6, s * 29.3)                       # area di porta piena
    for x in (-8.5, 8.5):
        rect('red', x - 0.28, s * 21 - 0.28, x + 0.28, s * 21 + 0.28)
        rect('red', x - 0.25, s * 8 - 0.25, x + 0.25, s * 8 + 0.25)
    rect('red', -0.25, s * 26 - 0.25, 0.25, s * 26 + 0.25)
rect('red', -0.25, -0.25, 0.25, 0.25)
cols = {'yellow': (236, 200, 50), 'white': (246, 248, 248), 'red': (214, 52, 52)}
for k, a in (('yellow', 0.85), ('white', 0.85), ('red', 0.92)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(cols[k], np.float32) * m * a
img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1300):                                      # segni delle ruote
    cx, cy = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(30, 200); a0 = random.uniform(0, 360)
    sd.arc([cx - ln, cy - ln, cx + ln, cy + ln], a0, a0 + random.uniform(10, 50), fill=(40, 60, 80, random.randint(8, 18)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img, 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.2 + (~groove) * 0.2, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE bianche, piede giallo
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([244, 244, 242], np.float32)
    arr += ((n - 0.5) * 7)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.rectangle([x - 2, 0, x + 2, h], fill=(216, 216, 212, 255))
    d.rectangle([0, h - 30, w, h], fill=YEL + (255,))
    d.rectangle([0, 0, w, 6], fill=(206, 206, 202, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 24, int((xm + wm) * pxm), h - 46)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(260):
        x, y = random.uniform(0, w), random.uniform(h * 0.4, h - 32)
        r = random.uniform(3, 9)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 44, random.randint(20, 60)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def logo_panel(img, x0, y0, x1, y1):
    paste_fit(img, LOGO, (x0 + 6, y0 + 4, x1 - 6, y1 - 4))


def club_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=BLUE + (255,))
    d.rectangle([x0, y1 - 12, x1, y1], fill=SKY + (255,))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 10, y0 + 4, x0 + 10 + h, y1 - 14))
    paste_fit(img, text_layer('GUANCHES', 'ariblk.ttf', WHITE), (x0 + h + 30, y0 + 16, x1 - 20, y0 + h // 2 + 4), 'left')
    paste_fit(img, text_layer('HOCKEY CLUB • ARONA', 'arialbd.ttf', (200, 232, 252), spacing=4), (x0 + h + 30, y0 + h // 2 + 14, x1 - 20, y1 - 24), 'left')


def arona_panel(img, x0, y0, x1, y1):
    paste_fit(img, text_layer('ARONA', 'georgia.ttf', BLACK, spacing=18), (x0 + 30, y0 + 10, x1 - 30, y0 + (y1 - y0) * 2 // 3))
    d = ImageDraw.Draw(img)
    bx0, bx1 = x0 + (x1 - x0) // 2 - 110, x0 + (x1 - x0) // 2 + 110
    d.rectangle([bx0, y0 + (y1 - y0) * 2 // 3 + 4, bx1, y1 - 6], fill=(36, 72, 150, 255))
    paste_fit(img, text_layer('DEPORTES', 'georgia.ttf', WHITE, spacing=6), (bx0 + 10, y0 + (y1 - y0) * 2 // 3 + 8, bx1 - 10, y1 - 10))


def tenerife_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=NAVY + (255,), width=6)
    paste_fit(img, text_layer('TENERIFE • ISLAS CANARIAS', 'arialbd.ttf', NAVY, spacing=4), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


def cristianos_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=CANARY + (255,))
    paste_fit(img, text_layer('LOS CRISTIANOS', 'ariblk.ttf', NAVY, spacing=6), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


def liga_panel(img, x0, y0, x1, y1):
    paste_fit(img, text_layer('LIGA ÉLITE HOCKEY LÍNEA', 'impact.ttf', BLACK, spacing=6), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


save(board_strip(panels=[(1.0, 2.2, logo_panel), (4.0, 4.2, arona_panel), (12.5, 4.6, liga_panel)]), 'boards_a.jpg')
save(board_strip(panels=[(1.5, 4.4, tenerife_panel), (10.5, 2.2, logo_panel), (13.5, 4.2, cristianos_panel)]), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 5.4, club_panel), (11.0, 4.2, arona_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256, panels=[(6.5, 3.6, logo_panel)]), 'boards_corner.jpg')

# ================================================================== 3. EDIFICIO
print('edificio')
# intonaco bianco (texture in metri: 4 m x 4 m)
W = H = 512
ww = np.zeros((H, W, 3), np.float32) + np.array([236, 237, 238], np.float32)
ww += ((fft_noise(H, W, beta=2.4) - 0.5) * 9)[..., None]
save(to_img(ww).filter(ImageFilter.GaussianBlur(0.6)), 'wall_white.jpg')

# zoccolatura dietro le balaustre: pannelli grigio-lilla con i giunti (2,6 m di altezza, 4 m di passo)
W, H = 512, 256
wl = np.zeros((H, W, 3), np.float32) + np.array([200, 202, 216], np.float32)
wl += ((resized_noise(32, 64, 1.8, H, W) - 0.5) * 8)[..., None]
wl *= (1 - 0.1 * ((np.arange(W)[None, :] % 256) < 3))[..., None]
save(to_img(wl), 'wall_low.jpg')

# pannelli acustici verdi con il disegno a labirinto bianco (7 x 2,4 m)
def green_panel(seed):
    r = random.Random(seed)
    Wp, Hp = 1024, 352
    n = resized_noise(32, 96, 1.8, Hp, Wp)
    g = np.zeros((Hp, Wp, 3), np.float32) + np.array([46, 150, 58], np.float32)
    g += ((n - 0.5) * 16)[..., None]
    g *= (1 - 0.12 * ((np.arange(Wp)[None, :] % 64) < 2))[..., None]        # doghe verticali
    im = to_img(g)
    d = ImageDraw.Draw(im)
    for _ in range(18):                                                      # segmenti del labirinto
        x, y = r.randint(40, Wp - 40), r.randint(30, Hp - 30)
        pts = [(x, y)]
        for _ in range(r.randint(2, 4)):
            if r.random() < 0.5: x = max(20, min(Wp - 20, x + r.choice((-1, 1)) * r.randint(40, 160)))
            else: y = max(20, min(Hp - 20, y + r.choice((-1, 1)) * r.randint(30, 110)))
            pts.append((x, y))
        d.line(pts, fill=(226, 242, 226), width=4)
    d.rectangle([0, 0, Wp - 1, Hp - 1], outline=(30, 96, 40), width=6)
    return im


save(green_panel(1), 'green_panel_a.jpg')
save(green_panel(2), 'green_panel_b.jpg')

# lamiera della copertura vista dal basso (azzurro-grigia chiara) e lucernari / vetrate alte
W = H = 512
roof = np.zeros((H, W, 3), np.float32) + np.array([196, 210, 222], np.float32)
roof += ((fft_noise(H, W, beta=2.2) - 0.5) * 10)[..., None]
u = np.arange(W)[None, :] / W
roof *= (1 - 0.14 * (np.sin(u * np.pi * 2 * 16) > 0.5))[..., None]
save(to_img(roof).filter(ImageFilter.GaussianBlur(0.6)), 'roof_deck.jpg')
W, H = 512, 128
cl = np.zeros((H, W, 3), np.float32) + np.array([236, 242, 246], np.float32)
cl += ((resized_noise(32, 128, 1.6, H, W) - 0.5) * 14)[..., None]
cl *= (1 - 0.2 * ((np.arange(W)[None, :] % 64) < 3))[..., None]
save(to_img(cl), 'clerestory.jpg')

# scritta ARONA / DEPORTES della testata (trasparente, 12 x 3 m)
W, H = 2048, 512
sign = Image.new('RGBA', (W, H), (0, 0, 0, 0))
paste_fit(sign, text_layer('ARONA', 'georgia.ttf', (24, 24, 28), size=420, spacing=60), (40, 0, W - 40, 340))
sd = ImageDraw.Draw(sign)
sd.rectangle([W - 760, 360, W - 180, 492], fill=(36, 72, 150, 255))
paste_fit(sign, text_layer('DEPORTES', 'georgia.ttf', (250, 250, 250), size=200, spacing=20), (W - 740, 372, W - 200, 480))
save(sign, 'sign_arona.png')

# striscione rosso verticale sotto il tabellone (stemma del club)
W, H = 256, 768
rb = Image.new('RGBA', (W, H), (196, 34, 40, 255))
paste_fit(rb, LOGO, (24, 60, W - 24, 300))
paste_fit(rb, text_layer('GUANCHES', 'ariblk.ttf', WHITE), (20, 340, W - 20, 420))
paste_fit(rb, text_layer('ARONA', 'georgia.ttf', WHITE, spacing=10), (30, 440, W - 30, 520))
save(banner_finish(rb), 'banner_red.jpg', quality=86)

# rete di protezione dietro le porte
W = H = 256
net = Image.new('RGBA', (W, H), (0, 0, 0, 0))
nd = ImageDraw.Draw(net)
for k in range(0, W + 1, 16):
    nd.line([(k, 0), (k, H)], fill=(238, 238, 234, 170), width=2)
    nd.line([(0, k), (W, k)], fill=(238, 238, 234, 170), width=2)
save(net, 'net.png')

# ================================================================== 4. STRISCIONE DEL CLUB
print('striscioni')
b = Image.new('RGBA', (1024, 384), BLUE + (255,))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 0, 1024, 20], fill=SKY)
bd.rectangle([0, 364, 1024, 384], fill=SKY)
paste_fit(b, LOGO, (30, 30, 360, 354))
paste_fit(b, text_layer('ARONA', 'ariblk.ttf', WHITE), (390, 70, 990, 190), 'left')
paste_fit(b, text_layer('GUANCHES', 'ariblk.ttf', SKY), (390, 210, 990, 320), 'left')
save(banner_finish(b), 'banner_club.jpg', quality=86)
print('fatto')
