"""Genera le texture del Palaramini (Flying Donkeys Empoli) in assets/textures/empoli/.
Uso (dalla cartella del progetto): python tools/generate_empoli_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/empoli.png (tensostruttura a botte su archi in legno lamellare, telo crema,
testate in telo verde scuro, pista in resina chiara quasi bianca con le linee rosse e blu dell'hockey
e i cerchi scuri del pattinaggio artistico, balaustre bianche con pannelli trasparenti a telaio metallico,
striscioni blu e quello della U.I.S.P. sulle reti).
"""
import sys, os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'empoli')
os.makedirs(OUT, exist_ok=True)
random.seed(1990)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'empoli.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
BLUE, SKY, RED, WHITE = (28, 84, 196), (64, 164, 232), (206, 38, 48), (255, 255, 255)
GREEN = (22, 74, 52)


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


# ================================================================== 1. PISTA: resina chiara, linee hockey rosse e blu
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
X = (np.arange(W)[None, :] + 0.5) / S - RW / 2
Z = (np.arange(H)[:, None] + 0.5) / S - RL / 2
n1 = resized_noise(512, 256, 2.0, H, W)
n2 = resized_noise(256, 128, 2.8, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([228, 226, 218], np.float32)
col += ((n1 - 0.5) * 10)[..., None]
col -= (np.clip(n2 - 0.55, 0, 1) * 30)[..., None] * np.array([1.0, 1.0, 0.9], np.float32)   # zone più consumate

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'blue', 'dark')}
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


# linea centrale rossa, cerchio centrale, linee blu e linee di porta
rect('red', -RW / 2, -0.08, RW / 2, 0.08)
ring('red', 0, 0, 4.5, 0.08)
dot('red', 0, 0, 0.25)
for sgn in (-1, 1):
    rect('blue', -RW / 2, sgn * 11.5 - 0.15, RW / 2, sgn * 11.5 + 0.15)
    rect('red', -RW / 2 + 1.4, sgn * 31 - 0.05, RW / 2 - 1.4, sgn * 31 + 0.05)
    arc('red', 0, sgn * 31, 1.8, 180 if sgn > 0 else 0, 360 if sgn > 0 else 180, 0.07)
    for x in (-8.5, 8.5):
        ring('red', x, sgn * 21, 4.5, 0.07)
        dot('red', x, sgn * 21, 0.3)
        for dz in (-0.6, 0.6):
            rect('red', x - 1.2, sgn * 21 + dz - 0.03, x - 0.4, sgn * 21 + dz + 0.03)
            rect('red', x + 0.4, sgn * 21 + dz - 0.03, x + 1.2, sgn * 21 + dz + 0.03)
        dot('red', x, sgn * 7, 0.3)
# cerchi scuri del pattinaggio artistico (sbiaditi, irregolari), come nelle foto
for _ in range(26):
    x, z = random.uniform(-13, 13), random.uniform(-30, 30)
    r = random.uniform(1.6, 3.2)
    ring('dark', x, z, r, 0.03)
    if random.random() < 0.5:
        ring('dark', x + r * 0.9, z, r * 0.5, 0.025)
for _ in range(14):
    ring('dark', random.uniform(-15, 15), random.uniform(-32, 32), random.uniform(0.4, 0.9), 0.025)

cols = {'red': (206, 52, 50), 'blue': (52, 110, 200), 'dark': (70, 74, 82)}
for k, a in (('dark', 0.55), ('blue', 0.85), ('red', 0.88)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.2)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    if k != 'dark':
        m *= (0.8 + n1[..., None] * 0.25)                   # linee un po' consumate
    col = col * (1 - m * a) + np.array(cols[k], np.float32) * m * a

img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1800):                                      # segni di ruote e frenate
    px, py = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(20, 180); a0 = random.uniform(0, 180)
    sd.arc([px - ln, py - ln, px + ln, py + ln], a0, a0 + random.uniform(10, 50), fill=(60, 60, 70, random.randint(6, 16)), width=random.randint(1, 3))
for _ in range(60):                                        # macchie rosse sbiadite, come in foto
    px, py = random.uniform(0, W), random.uniform(0, H)
    r = random.uniform(4, 14)
    sd.ellipse([px - r, py - r * 0.6, px + r, py + r * 0.6], fill=(200, 60, 60, random.randint(10, 30)))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.5 + n2 * 0.3, 0.8), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE bianche con i cartelli blu
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([236, 237, 236], np.float32)
    arr += ((n - 0.5) * 10)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.rectangle([x - 2, 0, x + 2, h], fill=(196, 198, 200, 255))
    d.rectangle([0, 0, w, 10], fill=(214, 216, 218, 255))     # bordo superiore
    d.rectangle([0, h - 22, w, h], fill=(168, 172, 178, 255))  # zoccolo grigio
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 18, int((xm + wm) * pxm), h - 30)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(360):                                   # segni di dischi e bastoni
        x, y = random.uniform(0, w), random.uniform(h * 0.35, h - 22)
        r = random.uniform(3, 9)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 50, random.randint(20, 70)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def donkeys_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=BLUE + (255,))
    d.rectangle([x0, y1 - 12, x1, y1], fill=SKY + (255,))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 10, y0 + 4, x0 + 10 + h - 8, y1 - 4))
    paste_fit(img, text_layer('FLYING DONKEYS', 'ariblk.ttf', WHITE, spacing=4), (x0 + h + 16, y0 + 24, x1 - 24, y0 + h * 0.62), 'left')
    paste_fit(img, text_layer('HOCKEY IN LINE EMPOLI', 'arialbd.ttf', (210, 232, 252), spacing=6), (x0 + h + 16, y0 + h * 0.66, x1 - 24, y1 - 18), 'left')


def uisp_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(250, 250, 248, 255), outline=(30, 120, 70, 255), width=6)
    paste_fit(img, text_layer('U.I.S.P.', 'georgiab.ttf', (30, 120, 70), spacing=6), (x0 + 40, y0 + 20, x1 - 40, y0 + (y1 - y0) * 0.62))
    paste_fit(img, text_layer('SPORTPERTUTTI', 'arialbd.ttf', (40, 40, 44), spacing=8), (x0 + 80, y0 + (y1 - y0) * 0.66, x1 - 80, y1 - 14))


def palaramini_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=BLUE + (255,), width=6)
    paste_fit(img, text_layer('PALARAMINI', 'ariblk.ttf', BLUE, spacing=6), (x0 + 30, y0 + 16, x1 - 30, y0 + (y1 - y0) * 0.62))
    paste_fit(img, text_layer('EMPOLI', 'arialbd.ttf', RED, spacing=14), (x0 + 120, y0 + (y1 - y0) * 0.66, x1 - 120, y1 - 10))


save(board_strip(panels=[(3.0, 4.4, donkeys_panel), (12.0, 4.4, uisp_panel)]), 'boards_a.jpg')
save(board_strip(panels=[(2.5, 4.4, palaramini_panel), (11.5, 4.4, donkeys_panel)]), 'boards_b.jpg')
save(board_strip(panels=[(2.0, 4.4, donkeys_panel), (8.0, 4.4, palaramini_panel), (13.5, 4.4, uisp_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256), 'boards_corner.jpg')

# ================================================================== 3. TELO crema e TELO verde delle testate
print('telo')
W = H = 512
n = fft_noise(H, W, beta=2.2)
mem = np.zeros((H, W, 3), np.float32) + np.array([240, 230, 204], np.float32)
mem += ((n - 0.5) * 18)[..., None]
mi = to_img(mem)
md = ImageDraw.Draw(mi)
for y in range(0, H, 64):                                  # giunti saldati dei teli
    md.rectangle([0, y, W, y + 3], fill=(222, 210, 182))
save(mi.filter(ImageFilter.GaussianBlur(1.5)), 'membrane.jpg')
g = np.zeros((H, W, 3), np.float32) + np.array(GREEN, np.float32)
g += ((fft_noise(H, W, beta=2.4) - 0.5) * 16)[..., None]
gi = to_img(g)
gd = ImageDraw.Draw(gi)
for x in range(0, W, 128):                                 # teli verticali cuciti
    gd.rectangle([x, 0, x + 2, H], fill=(16, 56, 40))
save(gi.filter(ImageFilter.GaussianBlur(1.0)), 'membrane_green.jpg')

# ================================================================== 4. STRISCIONI e CARTELLI
print('striscioni')
b = Image.new('RGBA', (1024, 256), (250, 250, 248, 255))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 0, 1024, 256], outline=(30, 120, 70), width=14)
paste_fit(b, text_layer('U.I.S.P.', 'georgiab.ttf', (30, 120, 70), spacing=10), (60, 30, 964, 170))
paste_fit(b, text_layer('COMITATO EMPOLI VALDELSA', 'arialbd.ttf', (40, 40, 44), spacing=6), (120, 180, 904, 230))
save(banner_finish(b), 'banner_uisp.jpg', quality=86)

bb = Image.new('RGBA', (1024, 384), BLUE + (255,))
bbd = ImageDraw.Draw(bb)
bbd.polygon([(0, 384), (0, 300), (1024, 220), (1024, 384)], fill=SKY)
paste_fit(bb, LOGO, (24, 20, 344, 364))
paste_fit(bb, text_layer('FLYING', 'ariblk.ttf', WHITE), (380, 40, 1000, 150), 'left')
paste_fit(bb, text_layer('DONKEYS', 'ariblk.ttf', WHITE), (380, 150, 1000, 260), 'left')
paste_fit(bb, text_layer('EMPOLI', 'arialbd.ttf', (255, 230, 80), spacing=14), (380, 280, 760, 350), 'left')
save(banner_finish(bb), 'banner_donkeys.jpg', quality=86)

# cartelli blu appesi alle reti (come nelle foto)
for name, title, sub in (('sign_hockey.jpg', 'HOCKEY', 'IN LINE'), ('sign_skate.jpg', 'SKATE', 'PARK')):
    s = Image.new('RGBA', (512, 320), BLUE + (255,))
    sdd = ImageDraw.Draw(s)
    sdd.rectangle([10, 10, 501, 309], outline=WHITE, width=6)
    paste_fit(s, text_layer(title, 'ariblk.ttf', WHITE), (40, 40, 472, 190))
    paste_fit(s, text_layer(sub, 'arialbd.ttf', SKY, spacing=10), (100, 200, 412, 280))
    save(s, name, quality=86)

# rampa dello skatepark: lamiera con la scritta
r = np.zeros((256, 512, 3), np.float32) + np.array([150, 156, 162], np.float32)
r += ((resized_noise(64, 128, 1.6, 256, 512) - 0.5) * 30)[..., None]
ri = to_img(r).convert('RGBA')
paste_fit(ri, text_layer('SKATE ZONE', 'ariblk.ttf', (40, 42, 48), shear=-0.15), (30, 60, 482, 170))
save(ri, 'ramp.jpg', quality=84)
print('fatto')
