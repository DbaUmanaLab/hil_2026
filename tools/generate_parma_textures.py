"""Genera le texture del PalaGufi (Gufi Parma) in assets/textures/parma/.
Uso (dalla cartella del progetto): python tools/generate_parma_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/parma.png e le foto del Palapattinaggio Giuseppe Avanzini: volta a botte con
gli archi in legno lamellare e il telo color crema, testate e zoccolo laterale in telo verde scuro,
pavimento in cemento grigio-verde consumato con le righe gialle del calcetto, i cerchi neri dell'hockey
e la riga centrale bianca, balaustre trasparenti con il corrimano bianco.
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'parma')
os.makedirs(OUT, exist_ok=True)
random.seed(91)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'parma.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
YEL, NAVY, WHITE, BLACK = (246, 222, 30), (30, 44, 140), (255, 255, 255), (20, 20, 22)


def save(img, name, quality=88):
    path = os.path.join(OUT, name)
    img.convert('RGB').save(path, quality=quality, optimize=True, progressive=True)
    print('  ', name, img.size, os.path.getsize(path) // 1024, 'KB')


def resized_noise(h, w, beta, H, W):
    n = fft_noise(h, w, beta=beta)
    return np.asarray(Image.fromarray((n * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(np.float32) / 255


# ================================================================== 1. PISTA: cemento grigio-verde consumato
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
n1 = resized_noise(512, 256, 2.2, H, W)
n2 = resized_noise(128, 64, 1.6, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([132, 146, 146], np.float32)
col += ((n1 - 0.5) * 26)[..., None]
col += ((n2 - 0.5) * 12)[..., None]

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('yellow', 'black', 'white', 'red')}
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
    draws[k].ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], outline=255, width=px(wdt))


def dot(k, x, z, r):
    c = P(x, z); R = r * S * SS
    draws[k].ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], fill=255)


# calcetto (giallo): perimetro, metà campo, cerchio centrale, aree di rigore smussate
line('yellow', [(-16.6, -34), (16.6, -34), (16.6, 34), (-16.6, 34), (-16.6, -34)], 0.09)
line('yellow', [(-16.6, 0.0), (-4.5, 0.0)], 0.09)
line('yellow', [(4.5, 0.0), (16.6, 0.0)], 0.09)
ring('yellow', 0, 0, 3.0, 0.09)
for s in (-1, 1):
    zb = s * 34
    line('yellow', [(-8.5, zb), (-8.5, zb - s * 3.5), (-5.0, zb - s * 6.0), (5.0, zb - s * 6.0), (8.5, zb - s * 3.5), (8.5, zb)], 0.09)
    dot('yellow', 0, zb - s * 9.0, 0.12)
# hockey (nero, dipinto a mano): cerchio centrale, cerchi d'ingaggio; riga centrale bianca; linee di porta rosse
ring('black', 0, 0, 4.5, 0.06)
for s in (-1, 1):
    for x in (-8.5, 8.5):
        ring('black', x, s * 21, 4.5, 0.06)
        dot('red', x, s * 21, 0.28)
        dot('red', x, s * 8, 0.22)
    rect('red', -RW / 2 + 1.4, s * 31 - 0.03, RW / 2 - 1.4, s * 31 + 0.03)
    line('black', [(-1.5, s * 31), (-1.5, s * 29.6), (1.5, s * 29.6), (1.5, s * 31)], 0.05)
rect('white', -RW / 2, -0.07, RW / 2, 0.09)

cols = {'yellow': (232, 178, 30), 'black': (26, 28, 28), 'white': (232, 234, 230), 'red': (176, 40, 36)}
for k, a in (('yellow', 1.0), ('black', 0.8), ('white', 0.9), ('red', 0.85)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.2)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    wear = (0.75 + 0.25 * n2)[..., None]                           # righe consumate
    col = col * (1 - m * a * wear) + np.array(cols[k], np.float32) * m * a * wear

img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(600):                                     # segni neri delle ruote (archi lunghi, come nelle foto)
    cx, cy = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(60, 420); a0 = random.uniform(0, 360)
    sd.arc([cx - ln, cy - ln, cx + ln, cy + ln], a0, a0 + random.uniform(15, 70), fill=(20, 24, 24, random.randint(30, 90)), width=random.randint(2, 4))
for _ in range(220):                                     # rattoppi e macchie
    cx, cy = random.uniform(0, W), random.uniform(0, H)
    r = random.uniform(10, 50)
    sd.ellipse([cx - r, cy - r * 0.7, cx + r, cy + r * 0.7], fill=(90, 100, 100, random.randint(10, 30)))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
save(img, 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.5 + n2 * 0.3, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. TELO, TELO VERDE, LEGNO
print('teli e legno')
Wm, Hm = 512, 512
mem = np.zeros((Hm, Wm, 3), np.float32) + np.array([244, 230, 206], np.float32)
mem += ((fft_noise(Hm, Wm, beta=2.4) - 0.5) * 12)[..., None]
mi = to_img(mem)
md = ImageDraw.Draw(mi)
for y in (0, 256):                                       # cuciture dei teli (lungo l'arco)
    md.line([0, y, Wm, y], fill=(214, 196, 168), width=3)
save(mi, 'membrane.jpg')

Wg, Hg = 512, 512
gr = np.zeros((Hg, Wg, 3), np.float32) + np.array([22, 70, 42], np.float32)
gr += ((fft_noise(Hg, Wg, beta=2.0, sx=0.3) - 0.5) * 16)[..., None]
gi = to_img(gr)
gd = ImageDraw.Draw(gi)
for x in range(0, Wg, 128):
    gd.line([x, 0, x, Hg], fill=(16, 52, 32), width=3)
save(gi, 'green.jpg')

Wl, Hl = 512, 128
lam = np.zeros((Hl, Wl, 3), np.float32) + np.array([196, 116, 58], np.float32)
lam += ((fft_noise(Hl, Wl, beta=2.0, sx=6.0) - 0.5) * 30)[..., None]
li = to_img(lam)
ld = ImageDraw.Draw(li)
for y in range(0, Hl, 16):
    ld.line([0, y, Wl, y], fill=(160, 90, 44), width=1)
save(li, 'glulam.jpg')

# ================================================================== 3. STRISCIONI (solo nomi leggibili nelle foto)
print('striscioni')


def mk(name, w, h, bg, draw):
    b = Image.new('RGBA', (w, h), bg + (255,))
    draw(b, ImageDraw.Draw(b), w, h)
    save(banner_finish(b), name, quality=86)


def gufi(b, d, w, h):
    paste_fit(b, LOGO, (60, 40, w - 60, h - 40))


mk('banner_gufi.jpg', 640, 700, YEL, gufi)


def cerchio(b, d, w, h):
    paste_fit(b, text_layer('Polisportiva', 'arialbd.ttf', WHITE, spacing=4), (260, 30, w - 260, 100))
    paste_fit(b, text_layer('Il Cerchio', 'georgiab.ttf', WHITE, spacing=4), (80, 110, w - 80, 290))
    paste_fit(b, text_layer('SORAGNA (PR)', 'arialbd.ttf', WHITE, spacing=6), (330, 305, w - 330, 350))


mk('banner_cerchio.jpg', 1024, 384, NAVY, cerchio)


def avanzini(b, d, w, h):
    paste_fit(b, text_layer('PALAPATTINAGGIO "GIUSEPPE AVANZINI"', 'arialbd.ttf', (60, 60, 70), spacing=4), (40, 30, w - 40, 110))
    paste_fit(b, text_layer('Coni', 'arialbd.ttf', (40, 70, 150), spacing=4), (w * 0.62, 150, w - 80, 260))
    paste_fit(b, text_layer('Comune di Soragna', 'georgiai.ttf', (60, 60, 70), spacing=2), (120, 290, w - 120, 360))


mk('banner_avanzini.jpg', 1024, 400, (238, 238, 240), avanzini)


def conad(b, d, w, h):
    paste_fit(b, text_layer('CONAD', 'ariblk.ttf', (220, 40, 30), spacing=8), (120, 70, w - 120, 300))


mk('banner_conad.jpg', 1024, 384, (248, 248, 246), conad)


def carwrap(b, d, w, h):
    paste_fit(b, text_layer('CAR WRAPPING', 'ariblk.ttf', WHITE, spacing=4), (60, 70, w * 0.66, 170), 'left')
    paste_fit(b, text_layer('OSCURAMENTO VETRI', 'ariblk.ttf', WHITE, spacing=4), (60, 190, w * 0.66, 280), 'left')
    paste_fit(b, text_layer('PARMA', 'arialbd.ttf', (200, 200, 200), spacing=6), (60, 300, w * 0.4, 350), 'left')
    d.polygon([(w * 0.72, 40), (w - 40, 40), (w - 40, h - 40), (w * 0.62, h - 40)], fill=(60, 60, 64))


mk('banner_carwrap.jpg', 1024, 384, (24, 24, 26), carwrap)


def arteplast(b, d, w, h):
    paste_fit(b, text_layer('ARTEPLAST', 'ariblk.ttf', WHITE, stroke=6, stroke_fill=(30, 30, 30), spacing=6), (120, 60, w - 120, 260))


mk('banner_arteplast.jpg', 1024, 384, (232, 196, 40), arteplast)
print('fatto')
