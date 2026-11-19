"""Genera le texture del Pattinodromo Giorgio Burani (Ferrara Warriors, Ferrara) in assets/textures/ferrara/.
Uso (dalla cartella del progetto): python tools/generate_ferrara_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/ferrara.jpg e le foto della tensostruttura: archi reticolari grigio scuro, telo
bianco-azzurro con i cavi incrociati, drappi bianchi appesi, pista SportCourt azzurra a piastrelle con la
riga centrale rossa larga, cerchi neri, balaustre bianche con lo zoccolo giallo, tribuna dietro la ringhiera
con lo striscione rosa FERRARA SPORT FESTIVAL, striscioni degli sponsor e testate con la fascia verde.
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'ferrara')
os.makedirs(OUT, exist_ok=True)
random.seed(44)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'ferrara.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
FISR = Image.open(os.path.join(ROOT, 'assets', 'logos', 'serie_b.png')).convert('RGBA')   # pannello della lega (fisr.png è un SVG)
FISR = FISR.crop(FISR.getbbox())
BLUE, ORANGE, WHITE, BLACK = (29, 63, 154), (240, 138, 28), (255, 255, 255), (22, 22, 24)
YEL = (246, 196, 0)
PINK = (214, 40, 78)
GREEN = (36, 140, 64)


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


# ================================================================== 1. PISTA: SportCourt azzurro a piastrelle
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
n1 = resized_noise(512, 256, 2.0, H, W)
n2 = resized_noise(128, 64, 2.6, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([138, 186, 198], np.float32)
col += ((n1 - 0.5) * 10)[..., None]
col += ((n2 - 0.5) * 10)[..., None]
# piastrelle da 30 cm: fughe più scure e ogni piastrella con un tono appena diverso
TILE = 0.3
X = (np.arange(W)[None, :] + 0.5) / S - RW / 2
Z = (np.arange(H)[:, None] + 0.5) / S - RL / 2
tx = np.floor((X + RW / 2) / TILE).astype(int)
tz = np.floor((Z + RL / 2) / TILE).astype(int)
tile_rng = np.random.default_rng(7).normal(0, 2.2, (int(RL / TILE) + 2, int(RW / TILE) + 2))
col += tile_rng[np.broadcast_to(tz, (H, W)), np.broadcast_to(tx, (H, W))][..., None]
grid = np.broadcast_to((((X + RW / 2) / TILE) % 1.0) < 0.05, (H, W)) | np.broadcast_to((((Z + RL / 2) / TILE) % 1.0) < 0.05, (H, W))
col[grid] *= 0.9

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'black')}
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


def cross(k, x, z):
    """punto d'ingaggio a croce fatto di piastrelle rosse, come nelle foto"""
    rect(k, x - 0.45, z - 0.15, x + 0.45, z + 0.15)
    rect(k, x - 0.15, z - 0.45, x + 0.15, z + 0.45)


# hockey: riga centrale rossa larga (una fila di piastrelle), cerchio centrale rosso
rect('red', -RW / 2, -0.15, RW / 2, 0.15)
ring('red', 0, 0, 4.5, 0.07)
cross('red', 0, 0)
for sgn in (-1, 1):
    rect('red', -RW / 2 + 1.4, sgn * 31 - 0.05, RW / 2 - 1.4, sgn * 31 + 0.05)          # linea di porta
    rect('red', -1.1, sgn * 31 - (0.9 if sgn > 0 else 0), 1.1, sgn * 31 + (0 if sgn > 0 else 0.9))   # area del portiere piena
    for x in (-8.5, 8.5):
        ring('black', x, sgn * 21, 4.5, 0.06)                                           # cerchi d'ingaggio neri
        cross('red', x, sgn * 21)
    for x in (-8.5, 8.5):
        cross('red', x, sgn * 8)                                                        # punti della zona neutra
# pattinaggio artistico: cerchi neri sottili (otto e cerchi grandi), come nelle foto
for (x, z, r) in [(-10, -9, 3.0), (-4, -9, 3.0), (6, 10, 3.0), (12, 10, 3.0), (0, -14, 6.2), (0, 14, 6.2), (-11, 4, 2.0), (11, -4, 2.0)]:
    ring('black', x, z, r, 0.04)

cols = {'red': (214, 58, 44), 'black': (24, 30, 34)}
for k, a in (('black', 0.85), ('red', 0.95)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(cols[k], np.float32) * m * a
col[grid] *= 0.97     # le fughe si vedono anche sopra le righe

img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1600):                                     # segni delle ruote e graffi
    px, py = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(20, 160); a0 = random.uniform(0, 180)
    sd.arc([px - ln, py - ln, px + ln, py + ln], a0, a0 + random.uniform(10, 50), fill=(40, 80, 100, random.randint(6, 14)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.3 + n2 * 0.2 - grid.astype(np.float32) * 0.45, 0.9), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE bianche con lo zoccolo giallo
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([243, 243, 241], np.float32)
    arr += ((n - 0.5) * 8)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.rectangle([x - 2, 0, x + 2, h], fill=(214, 214, 212, 255))
    d.rectangle([0, h - 44, w, h], fill=YEL + (255,))          # zoccolo giallo
    d.rectangle([0, h - 46, w, h - 44], fill=(206, 150, 0, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 18, int((xm + wm) * pxm), h - 60)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(260):                                   # segni dei dischetti
        x, y = random.uniform(0, w), random.uniform(h * 0.4, h - 46)
        r = random.uniform(3, 8)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 50, random.randint(14, 50)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def warriors_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=BLUE + (255,))
    d.rectangle([x0, y1 - 12, x1, y1], fill=ORANGE + (255,))
    h = y1 - y0
    d.rounded_rectangle([x0 + 6, y0 + 4, x0 + 10 + int(h * 1.2), y1 - 14], radius=10, fill=WHITE + (255,))
    paste_fit(img, LOGO, (x0 + 10, y0 + 8, x0 + 6 + int(h * 1.2), y1 - 18))
    paste_fit(img, text_layer('WARRIORS', 'ariblk.ttf', WHITE, spacing=6), (x0 + int(h * 1.3) + 16, y0 + 14, x1 - 20, y0 + h * 0.58), 'left')
    paste_fit(img, text_layer('FERRARA HOCKEY', 'arialbd.ttf', ORANGE, spacing=6), (x0 + int(h * 1.3) + 16, y0 + h * 0.62, x1 - 20, y1 - 20), 'left')


def fisr_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=(30, 60, 140, 255), width=4)
    paste_fit(img, FISR, (x0 + 20, y0 + 8, x1 - 20, y1 - 8))


def cibix_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=(200, 30, 40, 255), width=4)
    paste_fit(img, text_layer('CiBiX', 'ariblk.ttf', (206, 28, 40), shear=-0.18), (x0 + 30, y0 + 10, x1 - 30, y0 + (y1 - y0) * 0.68))
    paste_fit(img, text_layer('COMPUTER SERVICE', 'arialbd.ttf', (60, 60, 64), spacing=6), (x0 + 60, y0 + (y1 - y0) * 0.72, x1 - 60, y1 - 8))


def felsina_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255))
    paste_fit(img, text_layer('FELSINA', 'ariblk.ttf', (36, 40, 72), spacing=4), (x0 + 30, y0 + 10, x1 - 30, y0 + (y1 - y0) * 0.55))
    paste_fit(img, text_layer('PONTEGGI', 'arialbd.ttf', (36, 40, 72), spacing=10), (x0 + 50, y0 + (y1 - y0) * 0.58, x1 - 50, y1 - 8))


def estensi_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=GREEN + (255,), width=4)
    paste_fit(img, text_layer('PATTINATORI ESTENSI', 'timesbd.ttf', BLACK), (x0 + 24, y0 + 10, x1 - 24, y0 + (y1 - y0) * 0.6))
    paste_fit(img, text_layer('FERRARA', 'arialbd.ttf', GREEN, spacing=10), (x0 + 80, y0 + (y1 - y0) * 0.64, x1 - 80, y1 - 8))


save(board_strip(panels=[(2.0, 4.6, warriors_panel), (9.0, 3.6, cibix_panel), (14.0, 3.2, fisr_panel)]), 'boards_a.jpg')
save(board_strip(panels=[(2.5, 4.0, felsina_panel), (9.5, 4.6, warriors_panel)]), 'boards_b.jpg')
save(board_strip(panels=[(1.5, 4.0, estensi_panel), (7.2, 4.6, warriors_panel), (13.6, 3.6, cibix_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256), 'boards_corner.jpg')

# ================================================================== 3. TELO, PARETI
print('telo e pareti')
# telo bianco-azzurro: teli verticali saldati (cuciture ogni 1/4 della texture) e leggere ombre
Wm, Hm = 512, 512
mem = np.zeros((Hm, Wm, 3), np.float32) + np.array([226, 240, 240], np.float32)
mem += ((fft_noise(Hm, Wm, beta=2.4) - 0.5) * 10)[..., None]
xx = np.arange(Wm)[None, :]
seam = (np.abs(((xx / Wm) * 4) % 1.0 - 0.5) > 0.493)
mem[np.broadcast_to(seam, (Hm, Wm))] *= 0.93
save(to_img(mem), 'membrane.jpg')
# parete bassa grigio chiaro (pannelli del telo tesi fino a terra)
wall = np.zeros((256, 256, 3), np.float32) + np.array([200, 206, 206], np.float32)
wall += ((fft_noise(256, 256, beta=2.2) - 0.5) * 10)[..., None]
wall[:, ::64] *= 0.9
save(to_img(wall), 'wall.jpg')

# ================================================================== 4. STRISCIONI
print('striscioni')
# FERRARA SPORT FESTIVAL: lunga fascia rosa appesa alla ringhiera della tribuna (texture ripetibile, 6 m)
fw, fh = 2048, 256
f = Image.new('RGBA', (fw, fh), PINK + (255,))
fd = ImageDraw.Draw(f)
for i in range(3):
    x0 = i * fw // 3
    fd.polygon([(x0 + 40, 190), (x0 + 120, 40), (x0 + 160, 40), (x0 + 80, 190)], fill=(255, 255, 255, 230))
    fd.ellipse([x0 + 140, 20, x0 + 180, 60], fill=(255, 255, 255, 230))
    paste_fit(f, text_layer('FERRARA', 'ariblk.ttf', WHITE, spacing=4), (x0 + 200, 42, x0 + fw // 3 - 40, 150), 'left')
    paste_fit(f, text_layer('SPORT FESTIVAL', 'arialbd.ttf', (255, 220, 230), spacing=6), (x0 + 200, 160, x0 + fw // 3 - 60, 214), 'left')
save(f, 'banner_festival.jpg', quality=86)


def mk(name, w, h, bg, draw):
    b = Image.new('RGBA', (w, h), bg + (255,))
    draw(b, ImageDraw.Draw(b), w, h)
    save(banner_finish(b), name, quality=86)


def estensi(b, d, w, h):
    paste_fit(b, text_layer('PATTINATORI ESTENSI - FERRARA', 'timesbd.ttf', BLACK), (180, 40, w - 180, 150))
    paste_fit(b, text_layer('Artistico • Hockey', 'timesi.ttf', (60, 60, 60)), (300, 170, w - 300, 230))
    d.ellipse([w // 2 - 70, 260, w // 2 + 70, 400], outline=(60, 60, 60), width=6)
    d.rectangle([w // 2 - 30, 300, w // 2 + 30, 360], outline=(60, 60, 60), width=5)   # stemma stilizzato
    for cx, c in ((90, (40, 90, 170)), (w - 90, GREEN)):
        d.ellipse([cx - 60, 40, cx + 60, 160], fill=c)
    # due pattinatori stilizzati ai lati
    d.line([(120, 300), (90, 420), (60, 470)], fill=(50, 50, 50), width=10)
    d.line([(120, 300), (170, 380)], fill=(50, 50, 50), width=10)
    d.ellipse([105, 260, 140, 295], fill=(50, 50, 50))
    d.line([(w - 120, 300), (w - 150, 430)], fill=(50, 50, 50), width=10)
    d.line([(w - 150, 430), (w - 70, 470)], fill=(50, 50, 50), width=8)
    d.ellipse([w - 138, 260, w - 103, 295], fill=(50, 50, 50))


mk('banner_estensi.jpg', 1024, 512, (250, 250, 248), estensi)


def silla(b, d, w, h):
    d.ellipse([60, 70, 230, 240], fill=(120, 190, 40))
    d.ellipse([110, 110, 190, 200], fill=(250, 210, 30))
    paste_fit(b, text_layer('SILLA', 'ariblk.ttf', (38, 120, 48), spacing=10), (260, 60, w - 60, 250), 'left')
    d.rectangle([0, h - 110, w, h - 70], fill=(38, 120, 48))


mk('banner_silla.jpg', 1024, 512, (248, 248, 244), silla)


def quadrifoglio(b, d, w, h):
    for dx, dy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        cx, cy = w // 2 + dx * 55, 230 + dy * 55
        d.ellipse([cx - 70, cy - 70, cx + 70, cy + 70], fill=(30, 150, 60))
    d.line([(w // 2, 260), (w // 2 + 30, 440)], fill=(30, 150, 60), width=14)
    paste_fit(b, text_layer('Pattinaggio', 'segoescb.ttf', (30, 110, 50)), (60, 120, w // 2 - 150, 260))
    paste_fit(b, text_layer('Il Quadrifoglio', 'segoescb.ttf', (30, 110, 50)), (w // 2 + 150, 120, w - 60, 260))
    paste_fit(b, text_layer('FERRARA', 'arialbd.ttf', (30, 110, 50), spacing=8), (w // 2 + 200, 300, w - 120, 360))


mk('banner_quadrifoglio.jpg', 1024, 512, (190, 232, 150), quadrifoglio)


def cibix(b, d, w, h):
    paste_fit(b, text_layer('CiBiX', 'ariblk.ttf', (206, 28, 40), shear=-0.18), (120, 50, w - 220, 250))
    d.line([(w - 230, 60), (w - 80, 250)], fill=(206, 28, 40), width=18)
    paste_fit(b, text_layer('computer service', 'arialbd.ttf', (80, 80, 84)), (w - 300, 260, w - 60, 300))


mk('banner_cibix.jpg', 1024, 512, (252, 252, 252), cibix)


def fomir(b, d, w, h):
    d.polygon([(70, 120), (190, 60), (310, 120), (190, 180)], fill=(240, 150, 30))
    d.polygon([(70, 120), (190, 180), (190, 330), (70, 270)], fill=(200, 110, 20))
    d.polygon([(310, 120), (190, 180), (190, 330), (310, 270)], fill=(250, 190, 80))
    paste_fit(b, text_layer('FOMIR', 'ariblk.ttf', (34, 70, 150), spacing=8), (360, 90, w - 60, 300), 'left')


mk('banner_fomir.jpg', 1024, 384, (250, 250, 250), fomir)


def kerakoll(b, d, w, h):
    paste_fit(b, text_layer('KERAKOLL', 'ariblk.ttf', (40, 40, 44), spacing=6), (60, 70, w - 60, 250))
    d.rectangle([0, h - 100, w, h - 60], fill=(120, 180, 40))


mk('banner_kerakoll.jpg', 1024, 384, (250, 250, 250), kerakoll)


def mast(b, d, w, h):
    paste_fit(b, text_layer('mast', 'ariblk.ttf', (30, 60, 140)), (80, 40, w - 80, 230))
    d.rectangle([80, 250, w - 80, 262], fill=(240, 138, 28))
    paste_fit(b, text_layer('ORGANIZZIAMO SPORT', 'arialbd.ttf', (30, 60, 140), spacing=8), (100, 280, w - 100, 330))


mk('banner_mast.jpg', 1024, 384, (250, 250, 250), mast)


def ama(b, d, w, h):
    d.polygon([(w // 2 - 90, 120), (w // 2, 40), (w // 2 + 90, 120), (w // 2, 260)], fill=(214, 40, 60))
    paste_fit(b, text_layer('AMA', 'ariblk.ttf', (34, 70, 160), spacing=10), (w // 2 - 260, 90, w // 2 + 260, 250))


mk('banner_ama.jpg', 1024, 384, (250, 250, 250), ama)


def uisp(b, d, w, h):
    paste_fit(b, text_layer('UISP', 'ariblk.ttf', (34, 60, 150), spacing=10), (100, 50, w - 100, 230))
    paste_fit(b, text_layer('SPORTPERTUTTI', 'arialbd.ttf', (34, 60, 150), spacing=6), (160, 260, w - 160, 320))


mk('banner_uisp.jpg', 1024, 384, (250, 214, 30), uisp)


def felsina(b, d, w, h):
    paste_fit(b, text_layer('FELSINA PONTEGGI', 'ariblk.ttf', (36, 40, 72)), (60, 90, w - 60, 220))
    for i in range(7):
        x = 120 + i * 120
        d.line([(x, 250), (x, 340)], fill=(220, 120, 30), width=8)
    d.line([(100, 270), (w - 100, 270)], fill=(220, 120, 30), width=8)
    d.line([(100, 330), (w - 100, 330)], fill=(220, 120, 30), width=8)


mk('banner_felsina.jpg', 1024, 384, (250, 250, 250), felsina)


def warriors(b, d, w, h):
    d.rectangle([0, h - 70, w, h], fill=ORANGE)
    d.rounded_rectangle([24, 24, 476, h - 94], radius=24, fill=WHITE)
    paste_fit(b, LOGO, (40, 40, 460, h - 110))
    paste_fit(b, text_layer('WARRIORS', 'ariblk.ttf', WHITE), (500, 80, w - 40, 250), 'left')
    paste_fit(b, text_layer('FERRARA HOCKEY', 'arialbd.ttf', ORANGE, spacing=6), (500, 280, w - 40, 340), 'left')


mk('banner_warriors.jpg', 1024, 512, BLUE, warriors)
print('fatto')
