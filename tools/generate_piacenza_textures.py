"""Genera le texture del Pattinodromo B. Metti (Lepis Piacenza, Piacenza) in assets/textures/piacenza/.
Uso (dalla cartella del progetto): python tools/generate_piacenza_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/piacenza.png e le foto della cupola geodetica: reticolo di travi nere a
triangoli sotto il telo bianco, pareti basse con le finestre, pista in resina color terracotta
puntinata con le righe rosse e i cerchi neri, balaustre bianche con la fascia azzurra in basso,
tribuna con le sedute rosse, striscioni gialli sulla testata.
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'piacenza')
os.makedirs(OUT, exist_ok=True)
random.seed(53)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'piacenza.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
SERIEB = Image.open(os.path.join(ROOT, 'assets', 'logos', 'serie_b.png')).convert('RGBA')
SERIEB = SERIEB.crop(SERIEB.getbbox())
RED, BLACK, WHITE = (214, 26, 34), (20, 20, 22), (255, 255, 255)
SKY = (92, 170, 214)
YEL = (246, 204, 20)


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


# ================================================================== 1. PISTA: resina terracotta puntinata
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
n1 = resized_noise(512, 256, 2.0, H, W)
n2 = resized_noise(128, 64, 2.6, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([160, 104, 92], np.float32)
col += ((n1 - 0.5) * 14)[..., None]
col += ((n2 - 0.5) * 10)[..., None]
# granuli chiari e scuri della resina (come nella foto delle pattinatrici)
rs = np.random.default_rng(11)
spk = rs.random((H, W))
col[spk > 0.985] = col[spk > 0.985] * 0.6 + np.array([236, 220, 214], np.float32) * 0.4
col[spk < 0.012] *= 0.72

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'black')}
draws = {k: ImageDraw.Draw(m) for k, m in masks.items()}
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)


def rect(k, x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    draws[k].rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def frame(k, x0, z0, x1, z1, w):
    rect(k, x0, z0, x1, z0 + w); rect(k, x0, z1 - w, x1, z1); rect(k, x0, z0, x0 + w, z1); rect(k, x1 - w, z0, x1, z1)


def ring(k, x, z, r, wdt):
    c = P(x, z); R = r * S * SS
    draws[k].ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], outline=255, width=max(1, int(wdt * S * SS)))


def dot(k, x, z, r):
    c = P(x, z); R = r * S * SS
    draws[k].ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], fill=255)


# hockey: riga centrale e cerchio centrale rossi, cerchi d'ingaggio neri, aree di porta rosse
rect('red', -RW / 2, -0.06, RW / 2, 0.06)
ring('red', 0, 0, 4.5, 0.07)
dot('red', 0, 0, 0.25)
for sgn in (-1, 1):
    rect('red', -RW / 2 + 1.4, sgn * 31 - 0.05, RW / 2 - 1.4, sgn * 31 + 0.05)
    z0, z1 = (sgn * 31, sgn * 31 - sgn * 1.0)
    frame('red', -1.5, min(z0, z1), 1.5, max(z0, z1), 0.06)
    for x in (-8.5, 8.5):
        ring('black', x, sgn * 21, 4.5, 0.06)
        dot('red', x, sgn * 21, 0.3)
        dot('red', x, sgn * 8, 0.25)
# pattinaggio artistico: cerchi neri sottili
for (x, z, r) in [(-9, -6, 3.0), (-3, -6, 3.0), (5, 7, 3.0), (11, 7, 3.0), (0, 15, 6.0), (0, -15, 6.0)]:
    ring('black', x, z, r, 0.035)

cols = {'red': (196, 34, 36), 'black': (30, 22, 22)}
for k, a in (('black', 0.8), ('red', 0.9)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(cols[k], np.float32) * m * a

img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1600):                                     # segni delle ruote e riflessi lucidi
    px, py = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(20, 160); a0 = random.uniform(0, 180)
    c = (30, 16, 14, random.randint(8, 18)) if random.random() < 0.7 else (255, 230, 220, random.randint(6, 12))
    sd.arc([px - ln, py - ln, px + ln, py + ln], a0, a0 + random.uniform(10, 50), fill=c, width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.35 + n2 * 0.25 + (spk > 0.985) * 0.15, 0.8), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE bianche con la fascia azzurra in basso
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([244, 244, 242], np.float32)
    arr += ((n - 0.5) * 8)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.rectangle([x - 2, 0, x + 2, h], fill=(214, 214, 212, 255))
    d.rectangle([0, h - 26, w, h], fill=SKY + (255,))            # fascia azzurra al piede
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 22, int((xm + wm) * pxm), h - 44)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(260):
        x, y = random.uniform(0, w), random.uniform(h * 0.4, h - 26)
        r = random.uniform(3, 8)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 50, random.randint(14, 50)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def lepis_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=BLACK + (255,))
    d.rectangle([x0, y1 - 10, x1, y1], fill=RED + (255,))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 8, y0 + 4, x0 + 8 + int(h * 1.15), y1 - 12))
    paste_fit(img, text_layer('GS LEPIS', 'ariblk.ttf', WHITE, spacing=6), (x0 + int(h * 1.25) + 16, y0 + 14, x1 - 20, y0 + h * 0.6), 'left')
    paste_fit(img, text_layer('PIACENZA • HOCKEY IN LINE', 'arialbd.ttf', RED, spacing=4), (x0 + int(h * 1.25) + 16, y0 + h * 0.64, x1 - 20, y1 - 18), 'left')


def lepis_white_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=BLACK + (255,), width=4)
    paste_fit(img, text_layer('GS LEPIS', 'ariblk.ttf', BLACK, spacing=8), (x0 + 30, y0 + 10, x1 - 30, y0 + (y1 - y0) * 0.62))
    paste_fit(img, text_layer('PIACENZA', 'arialbd.ttf', RED, spacing=12), (x0 + 60, y0 + (y1 - y0) * 0.66, x1 - 60, y1 - 8))


def serieb_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=(30, 60, 140, 255), width=4)
    paste_fit(img, SERIEB, (x0 + 20, y0 + 8, x1 - 20, y1 - 8))


save(board_strip(panels=[(2.0, 4.4, lepis_panel), (9.0, 3.6, lepis_white_panel), (14.2, 3.0, serieb_panel)]), 'boards_a.jpg')
save(board_strip(panels=[(3.0, 3.6, lepis_white_panel), (10.0, 4.4, lepis_panel)]), 'boards_b.jpg')
save(board_strip(panels=[(1.5, 3.6, lepis_white_panel), (7.0, 4.4, lepis_panel), (13.5, 3.6, lepis_white_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256), 'boards_corner.jpg')

# ================================================================== 3. TELO E FINESTRE
print('telo e finestre')
Wm, Hm = 512, 512
mem = np.zeros((Hm, Wm, 3), np.float32) + np.array([236, 234, 228], np.float32)
mem += ((fft_noise(Hm, Wm, beta=2.4) - 0.5) * 10)[..., None]
save(to_img(mem), 'membrane.jpg')
# fascia di finestre in policarbonato nella parete bassa: riquadri chiari con i montanti
win = np.zeros((256, 512, 3), np.float32) + np.array([214, 224, 228], np.float32)
win += ((fft_noise(256, 512, beta=2.0) - 0.5) * 18)[..., None]
wi = to_img(win)
wd = ImageDraw.Draw(wi)
for x in range(0, 512, 128):
    wd.rectangle([x, 0, x + 6, 256], fill=(70, 74, 78))
wd.rectangle([0, 0, 512, 8], fill=(70, 74, 78)); wd.rectangle([0, 248, 512, 256], fill=(70, 74, 78))
wd.rectangle([0, 124, 512, 130], fill=(110, 114, 118))
save(wi, 'windows.jpg')

# ================================================================== 4. STRISCIONI
print('striscioni')


def mk(name, w, h, bg, draw):
    b = Image.new('RGBA', (w, h), bg + (255,))
    draw(b, ImageDraw.Draw(b), w, h)
    save(banner_finish(b), name, quality=86)


def lepis(b, d, w, h):
    d.rectangle([0, h - 60, w, h], fill=RED)
    paste_fit(b, LOGO, (30, 20, 440, h - 70))
    paste_fit(b, text_layer('LEPIS', 'ariblk.ttf', WHITE, spacing=8), (470, 80, w - 40, 260), 'left')
    paste_fit(b, text_layer('PIACENZA', 'arialbd.ttf', RED, spacing=10), (470, 290, w - 40, 360), 'left')


mk('banner_lepis.jpg', 1024, 512, BLACK, lepis)


def piacenza_yellow(b, d, w, h):
    paste_fit(b, text_layer('PIACENZA', 'ariblk.ttf', BLACK, spacing=10), (60, 60, w - 60, 220))
    d.rectangle([60, 250, w - 60, 262], fill=RED)
    paste_fit(b, text_layer('HOCKEY IN LINE', 'arialbd.ttf', BLACK, spacing=8), (140, 280, w - 140, 330))


mk('banner_yellow.jpg', 1024, 384, YEL, piacenza_yellow)


def uisp(b, d, w, h):
    paste_fit(b, text_layer('UISP', 'ariblk.ttf', (34, 60, 150), spacing=10), (100, 50, w - 100, 230))
    paste_fit(b, text_layer('SPORTPERTUTTI', 'arialbd.ttf', (34, 60, 150), spacing=6), (160, 260, w - 160, 320))


mk('banner_uisp.jpg', 1024, 384, (250, 250, 250), uisp)
print('fatto')
