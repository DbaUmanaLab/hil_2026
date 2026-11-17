"""Genera le texture dell'Arena di Asiago (Asiago Vipers) in assets/textures/asiago/.
Uso (dalla cartella del progetto): python tools/generate_asiago_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
"""
import sys, os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'asiago')
os.makedirs(os.path.join(OUT, 'banners'), exist_ok=True)
random.seed(1998)

LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'asiago.png')).convert('RGBA')
_a = np.asarray(LOGO).astype(np.int16)
if _a[..., 3].min() == 255:                       # logo senza trasparenza: tolgo il bianco di fondo
    white = (_a[..., 0] > 236) & (_a[..., 1] > 236) & (_a[..., 2] > 236)
    _a[..., 3] = np.where(white, 0, 255)
LOGO = Image.fromarray(_a.astype(np.uint8), 'RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
ORANGE, BLACK, WHITE, RED = (242, 107, 17), (18, 18, 20), (246, 246, 244), (214, 32, 38)


def save(img, name, quality=88):
    path = os.path.join(OUT, name)
    if name.endswith('.png'):
        img.save(path, optimize=True)
    else:
        img.convert('RGB').save(path, quality=quality, optimize=True, progressive=True)
    print('  ', name, img.size, os.path.getsize(path) // 1024, 'KB')


# ================================================================== 1. PISTA (piastrelle SportCourt azzurre, linee rosse)
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
base = fft_noise(1024, 512, beta=2.2)
base = np.asarray(Image.fromarray((base * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(np.float32) / 255
col = np.zeros((H, W, 3), np.float32) + np.array([128, 196, 238], np.float32)
col += ((base - 0.5) * 12)[..., None]
# griglia delle piastrelle (30 cm) appena percettibile
tile = int(0.3048 * S)
yy, xx = np.mgrid[0:H, 0:W]
grid = ((xx % tile) < 2) | ((yy % tile) < 2)
col[grid] *= 0.95
CR = 7.5
X = (np.arange(W)[None, :] + 0.5) / S - RW / 2
Z = (np.arange(H)[:, None] + 0.5) / S - RL / 2
cx_, cz_ = RW / 2 - CR, RL / 2 - CR
outside = (np.abs(X) > cx_) & (np.abs(Z) > cz_) & (((np.abs(X) - cx_) ** 2 + (np.abs(Z) - cz_) ** 2) > CR ** 2)
col[outside] *= 0.9

SS = 2
mask = Image.new('L', (W * SS, H * SS), 0)
dr = ImageDraw.Draw(mask)
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)


def rect(x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    dr.rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def ring(x, z, r, wdt):
    c = P(x, z); R = r * S * SS
    dr.ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], outline=255, width=max(1, int(wdt * S * SS)))


def disc(x, z, r):
    c = P(x, z); R = r * S * SS
    dr.ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], fill=255)


rect(-RW / 2, -0.15, RW / 2, 0.15)               # linea centrale larga
ring(0, 0, 4.5, 0.07)
disc(0, 0, 0.18)
for sgn in (-1, 1):
    rect(-RW / 2, sgn * 31 - 0.05, RW / 2, sgn * 31 + 0.05)       # linee di porta
    rect(-1.6, sgn * 31, 1.6, sgn * 32.1)                          # area del portiere piena (dietro la linea, come in foto)
    c = P(0, sgn * 31); R = 1.8 * S * SS
    dr.arc([c[0] - R, c[1] - R, c[0] + R, c[1] + R], 180 if sgn > 0 else 0, 360 if sgn > 0 else 180, fill=255, width=int(0.07 * S * SS))
    for x in (-8.5, 8.5):
        ring(x, sgn * 21, 4.3, 0.06)
        disc(x, sgn * 21, 0.3)
        disc(x, sgn * 9.5, 0.2)
        for k in (-1, 1):                                          # tacche ai lati del cerchio
            rect(x + k * 4.3, sgn * 21 - 0.9, x + k * 4.3 + k * 0.6, sgn * 21 - 0.84)
            rect(x + k * 4.3, sgn * 21 + 0.84, x + k * 4.3 + k * 0.6, sgn * 21 + 0.9)
m = np.asarray(mask.resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
col = col * (1 - m * 0.92) + np.array([214, 38, 44], np.float32) * m * 0.92
img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(900):                               # segni delle ruote
    px, py = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(20, 160); a = random.uniform(0, 180)
    sd.arc([px - ln, py - ln, px + ln, py + ln], a, a + random.uniform(20, 70), fill=(70, 90, 110, random.randint(8, 22)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.7)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)
hm = base * 1.5 + grid.astype(np.float32) * -0.6
save(normal_from_height(hm, 1.0), 'rink_normal.jpg', quality=85)


# ================================================================== 2. BALAUSTRE: striscia CECCATO AUTOMOBILI + pannelli sponsor + battiscopa giallo
def ceccato(w, h):
    img = Image.new('RGBA', (w, h), (250, 250, 250, 255))
    d = ImageDraw.Draw(img)
    s = max(4, h // 7)
    for i in range(3):                              # bandierina a scacchi
        for j in range(3):
            if (i + j) % 2 == 0:
                d.rectangle([8 + i * s, h // 2 - int(1.5 * s) + j * s, 8 + (i + 1) * s, h // 2 - int(1.5 * s) + (j + 1) * s], fill=(20, 20, 20))
    lay = text_layer('CECCATO', 'ariblk.ttf', (25, 25, 25), shear=-0.15)
    r = paste_fit(img, lay, (16 + 3 * s, int(h * 0.18), int(w * 0.58), int(h * 0.82)), 'left')
    paste_fit(img, text_layer('AUTOMOBILI', 'ariblk.ttf', RED, shear=-0.15), (r[2] + 8, int(h * 0.18), w - 8, int(h * 0.82)), 'left')
    return img


def panel(name, w, h):
    img = Image.new('RGBA', (w, h), (250, 250, 248, 255))
    d = ImageDraw.Draw(img)
    m = int(h * 0.1)
    def bg(c): d.rectangle([0, 0, w, h], fill=c)
    if name == 'devidal':
        bg((26, 40, 84))
        r = paste_fit(img, text_layer('De Vidal', 'georgiab.ttf', (255, 255, 255)), (m, int(h * 0.12), int(w * 0.7), int(h * 0.62)), 'left')
        paste_fit(img, text_layer('OTTICI', 'arialbd.ttf', (255, 255, 255)), (r[2] + 10, int(h * 0.18), w - m, int(h * 0.45)), 'left')
        paste_fit(img, text_layer('DAL 1963', 'arial.ttf', (200, 210, 230)), (r[2] + 10, int(h * 0.46), w - m, int(h * 0.62)), 'left')
        paste_fit(img, text_layer('ASIAGO (VI) - CORSO IV NOVEMBRE', 'arialbd.ttf', (220, 225, 235)), (m, int(h * 0.7), w - m, h - m))
    elif name == 'miramonti':
        d.polygon([(m, int(h * 0.75)), (m + int(h * 0.4), int(h * 0.2)), (m + int(h * 0.65), int(h * 0.5)), (m + int(h * 0.85), int(h * 0.3)), (m + int(h * 1.2), int(h * 0.75))], fill=(40, 130, 110))
        paste_fit(img, text_layer('ALBERGO', 'arial.ttf', (40, 110, 100), spacing=6), (m + int(h * 1.3), int(h * 0.12), w - m, int(h * 0.42)), 'left')
        paste_fit(img, text_layer('MIRAMONTI', 'georgiab.ttf', (30, 100, 95)), (m + int(h * 1.3), int(h * 0.45), w - m, int(h * 0.88)), 'left')
    elif name == 'rigoni':
        bg((120, 200, 60))
        d.rectangle([0, 0, w, int(h * 0.36)], fill=(140, 215, 70))
        paste_fit(img, text_layer('DECORAZIONI EDILI', 'ariblk.ttf', (20, 40, 20)), (m, int(h * 0.04), w - m, int(h * 0.33)))
        paste_fit(img, text_layer('RIGONI DANIELE', 'ariblk.ttf', (20, 20, 20)), (m, int(h * 0.38), w - m, int(h * 0.74)))
        paste_fit(img, text_layer('TINTEGGIATURE • ISOLAMENTI • CARTONGESSO', 'arialbd.ttf', (30, 60, 30)), (m, int(h * 0.78), w - m, h - m // 2))
    elif name == 'tuoteam':
        bg((20, 20, 22)); paste_fit(img, text_layer('tuoteam.com', 'arialbd.ttf', ORANGE), (m, int(h * 0.2), w - m, int(h * 0.8)))
    elif name == 'tecnosys':
        paste_fit(img, text_layer('Tecnosys', 'segoeuib.ttf', (60, 60, 70)), (m, int(h * 0.1), w - m, int(h * 0.62)))
        paste_fit(img, text_layer('Società Benefit', 'segoeui.ttf', (200, 40, 50)), (int(w * 0.3), int(h * 0.64), w - m, h - m))
    elif name == 'emozioni':
        bg((250, 228, 196))
        paste_fit(img, text_layer('ABBIGLIAMENTO UOMO DONNA', 'arialbd.ttf', (110, 70, 40)), (m, int(h * 0.06), w - m, int(h * 0.24)))
        paste_fit(img, text_layer('EMOZIONI', 'bahnschrift.ttf', (40, 30, 30), spacing=8), (m, int(h * 0.28), w - m, int(h * 0.72)))
        paste_fit(img, text_layer('Collection', 'segoesc.ttf', (200, 50, 80)), (int(w * 0.3), int(h * 0.72), w - m, h - m // 2))
    elif name == 'hockey':
        d.ellipse([int(w / 2 - h * 0.42), int(h * 0.08), int(w / 2 + h * 0.42), int(h * 0.92)], fill=(30, 30, 30))
        paste_fit(img, text_layer('HOCKEY', 'ariblk.ttf', (220, 50, 40)), (int(w / 2 - h * 0.36), int(h * 0.3), int(w / 2 + h * 0.36), int(h * 0.56)))
        paste_fit(img, text_layer('INLINE ASIAGO', 'arialbd.ttf', (255, 255, 255)), (int(w / 2 - h * 0.3), int(h * 0.58), int(w / 2 + h * 0.3), int(h * 0.72)))
        d.line([(int(w / 2 - h * 0.5), int(h * 0.15)), (int(w / 2 + h * 0.5), int(h * 0.85))], fill=(120, 80, 40), width=max(3, h // 20))
        d.line([(int(w / 2 + h * 0.5), int(h * 0.15)), (int(w / 2 - h * 0.5), int(h * 0.85))], fill=(120, 80, 40), width=max(3, h // 20))
    elif name == 'vipers':
        paste_fit(img, LOGO, (m, m // 2, w - m, h - m // 2))
    elif name == 'vipers_wide':
        paste_fit(img, LOGO, (m, m // 2, m + int(h * 1.1), h - m // 2))
        paste_fit(img, text_layer('www.asiagovipers.it', 'arialbd.ttf', (30, 30, 30)), (m * 2 + int(h * 1.1), int(h * 0.3), w - m, int(h * 0.7)), 'left')
    elif name == 'presti':
        bg((24, 24, 26))
        paste_fit(img, text_layer('PRESTI', 'ariblk.ttf', (250, 250, 250), spacing=10), (m, int(h * 0.1), w - m, int(h * 0.6)))
        paste_fit(img, text_layer('1961 • CAFFÈ BAR GELATERIA', 'arialbd.ttf', (230, 180, 90)), (m, int(h * 0.66), w - m, h - m))
    elif name == 'playforj':
        bg((214, 32, 50))
        paste_fit(img, text_layer('#PLAYFORJ', 'ariblk.ttf', (255, 255, 255)), (m, int(h * 0.2), int(w * 0.62), int(h * 0.8)), 'left')
        cx, cy, r = int(w * 0.8), h // 2, int(h * 0.32)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255), width=max(3, h // 18))
        d.polygon([(cx, cy + int(r * 0.6)), (cx - int(r * 0.6), cy - int(r * 0.05)), (cx, cy - int(r * 0.3)), (cx + int(r * 0.6), cy - int(r * 0.05))], fill=(255, 255, 255))
    elif name == 'husqvarna':
        d.ellipse([int(w / 2 - h * 0.36), int(h * 0.14), int(w / 2 + h * 0.36), int(h * 0.86)], outline=(30, 50, 110), width=max(4, h // 14))
        paste_fit(img, text_layer('H', 'georgiab.ttf', (30, 50, 110)), (int(w / 2 - h * 0.2), int(h * 0.28), int(w / 2 + h * 0.2), int(h * 0.72)))
    elif name == 'marobin':
        paste_fit(img, text_layer('MAROBIN', 'timesbd.ttf', (40, 40, 40), spacing=6), (m, int(h * 0.12), w - m, int(h * 0.5)))
        paste_fit(img, text_layer('RISTORANTE • RIFUGIO', 'times.ttf', (90, 90, 90)), (m, int(h * 0.58), w - m, int(h * 0.82)))
    elif name == 'sicurezza':
        paste_fit(img, text_layer('Sicurezza srls', 'segoeuib.ttf', (200, 30, 40)), (m, int(h * 0.12), w - m, int(h * 0.55)))
        paste_fit(img, text_layer('sicurezza sul lavoro', 'segoesc.ttf', (60, 60, 60)), (m, int(h * 0.6), w - m, h - m))
    return img


def board_strip(panels, w=4096, h=288, widths=None):
    img = Image.new('RGBA', (w, h), (250, 250, 250, 255))
    d = ImageDraw.Draw(img)
    top, kick = 64, 22                              # fascia Ceccato in alto, battiscopa giallo
    widths = widths or [w // len(panels)] * len(panels)
    for x in range(0, w, 512):
        img.alpha_composite(ceccato(504, top - 10), (x + 4, 5))
        d.line([x, 0, x, top], fill=(200, 200, 205), width=3)
    d.line([0, top, w, top], fill=(190, 190, 195), width=4)
    x = 0
    for name, pw in zip(panels, widths):
        img.alpha_composite(panel(name, pw - 8, h - top - kick - 10), (x + 4, top + 5))
        d.line([x, top, x, h - kick], fill=(200, 205, 212), width=3)
        x += pw
    d.rectangle([0, h - kick, w, h], fill=(222, 196, 70))
    arr = np.asarray(img).astype(np.float32)
    for _ in range(160):                            # segni dei dischi e delle ruote in basso
        sx, sy = random.randint(0, w - 60), random.randint(h - kick - 40, h - kick - 2)
        arr[sy:sy + 3, sx:sx + random.randint(8, 50), :3] *= random.uniform(0.5, 0.8)
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA')


print('balaustre')
save(board_strip(['devidal', 'miramonti', 'rigoni', 'tuoteam', 'hockey', 'tecnosys', 'emozioni', 'presti']), 'boards_a.jpg')
save(board_strip(['husqvarna', 'marobin', 'vipers_wide', 'playforj', 'sicurezza', 'devidal', 'miramonti', 'rigoni'], widths=[384, 512, 768, 512, 512, 512, 512, 384]), 'boards_b.jpg')
save(board_strip(['tecnosys', 'vipers', 'vipers_wide', 'vipers', 'tuoteam'], widths=[768, 512, 1280, 512, 1024]), 'boards_center.jpg')
corner = Image.new('RGBA', (1024, 288), (250, 250, 250, 255))   # curve senza scritte (la texture è specchiata)
cd = ImageDraw.Draw(corner)
for x in range(0, 1024, 64):
    cd.rectangle([x, 22, x + 31, 42], fill=(25, 25, 25))
cd.rectangle([0, 18, 1024, 20], fill=RED); cd.rectangle([0, 44, 1024, 46], fill=RED)
cd.line([0, 64, 1024, 64], fill=(190, 190, 195), width=4)
cd.rectangle([0, 266, 1024, 288], fill=(222, 196, 70))
save(corner, 'boards_corner.jpg')

# ================================================================== 3. PARETI, SOFFITTO, FINESTRE
print('pareti')
W = H = 512
gr = fft_noise(H, W, beta=2.5)
wl = np.zeros((H, W, 3), np.float32) + np.array([238, 238, 234], np.float32) + ((gr - 0.5) * 12)[..., None]
save(to_img(wl), 'wall_white.jpg')
# soffitto in cemento bianco (getto con le casseforme)
cl = np.zeros((H, W, 3), np.float32) + np.array([232, 234, 234], np.float32) + ((fft_noise(H, W, beta=2.0, sx=1, sy=0.3) - 0.5) * 16)[..., None]
for y in range(0, H, 128):
    cl[y:y + 2] *= 0.94
save(to_img(cl), 'ceiling.jpg')
# vetrata del bar al piano superiore: telai verdi, interno illuminato caldo
W, H = 512, 384
wn = Image.new('RGB', (W, H))
wd = ImageDraw.Draw(wn)
for y in range(H):
    t = y / H
    wd.line([(0, y), (W, y)], fill=(int(214 - 40 * t), int(196 - 50 * t), int(120 - 40 * t)))
for _ in range(14):                               # sagome di persone dietro al vetro
    x = random.randint(20, W - 20); y = random.randint(int(H * 0.45), int(H * 0.65))
    c = random.choice([(60, 50, 40), (40, 40, 50), (120, 60, 30), (90, 90, 100)])
    wd.ellipse([x - 12, y - 30, x + 12, y - 6], fill=(150, 110, 90))
    wd.rounded_rectangle([x - 22, y - 6, x + 22, H], 10, fill=c)
for k in range(5):
    wd.line([(k * W // 4, 0), (k * W // 4, H)], fill=(26, 96, 56), width=12)
wd.line([(0, H // 3), (W, H // 3)], fill=(26, 96, 56), width=10)
wd.rectangle([0, 0, W - 1, H - 1], outline=(26, 96, 56), width=16)
save(wn, 'window_bar.jpg')
# finestrone del lato lungo: telai verdi, interno grigio-azzurro
wn = Image.new('RGB', (W, H))
wd = ImageDraw.Draw(wn)
for y in range(H):
    t = y / H
    wd.line([(0, y), (W, y)], fill=(int(150 + 40 * (1 - t)), int(180 + 30 * (1 - t)), int(190 + 30 * (1 - t))))
for k in range(5):
    wd.line([(k * W // 4, 0), (k * W // 4, H)], fill=(26, 96, 56), width=12)
wd.line([(0, int(H * 0.62)), (W, int(H * 0.62))], fill=(26, 96, 56), width=10)
wd.rectangle([0, 0, W - 1, H - 1], outline=(26, 96, 56), width=16)
save(wn, 'window_side.jpg')
# sfondo della galleria dietro il vetro (bar al piano terra)
gl = Image.new('RGB', (1024, 256), (70, 60, 50))
gd = ImageDraw.Draw(gl)
for y in range(256):
    gd.line([(0, y), (1024, y)], fill=(int(120 - y * 0.2), int(100 - y * 0.2), int(80 - y * 0.15)))
for x in range(0, 1024, 170):
    gd.rectangle([x + 20, 40, x + 120, 120], fill=(200, 170, 110))
save(gl, 'gallery_back.jpg')


# portone sezionale da garage (3,6 m x 3,4 m): pannelli orizzontali grecati, fila di oblò
gw, gh = 512, 484
gd_img = Image.new('RGB', (gw, gh), (214, 216, 214))
gdd = ImageDraw.Draw(gd_img)
ph = gh // 6
for k in range(6):
    y0 = k * ph
    gdd.rectangle([0, y0, gw, y0 + ph], fill=(222, 224, 222) if k % 2 == 0 else (210, 212, 210))
    for r in (0.33, 0.66):
        gdd.line([(0, y0 + int(ph * r)), (gw, y0 + int(ph * r))], fill=(186, 188, 188), width=3)
    gdd.line([(0, y0), (gw, y0)], fill=(150, 152, 152), width=5)
for k in range(5):
    x = 40 + k * 96
    gdd.rounded_rectangle([x, ph + 18, x + 60, 2 * ph - 18], 8, fill=(120, 140, 150), outline=(90, 92, 92), width=3)
gdd.rectangle([gw // 2 - 30, gh - 24, gw // 2 + 30, gh - 14], fill=(90, 90, 90))
gdd.rectangle([0, 0, gw - 1, gh - 1], outline=(120, 122, 122), width=8)
save(gd_img.filter(ImageFilter.GaussianBlur(0.6)), 'garage_door.jpg')

# ================================================================== 4. STENDARDI DEI TROFEI, STRISCIONI DEI TIFOSI
print('stendardi')
TROPHIES = [
    (2002, 'COPPA', 'ITALIA', 'o'), (2003, 'SUPERCOPPA', 'ITALIANA', 'b'), (2004, 'CAMPIONI', "D'ITALIA", 'o'),
    (2004, 'SUPERCOPPA', 'ITALIANA', 'b'), (2005, 'CAMPIONI', "D'ITALIA", 'o'), (2005, 'CAMPIONI', "D'EUROPA", 'w'),
    (2005, 'SUPERCOPPA', 'ITALIANA', 'b'), (2006, 'SUPERCOPPA', 'ITALIANA', 'b'), (2006, 'COPPA', 'ITALIA', 'o'),
    (2006, 'CAMPIONI', "D'ITALIA", 'o'), (2007, 'SUPERCOPPA', 'ITALIANA', 'b'), (2009, 'COPPA', 'ITALIA', 'o'),
    (2011, 'CAMPIONI', "D'ITALIA", 'b'), (2013, 'SUPERCOPPA', 'ITALIANA', 'o'), (2016, 'COPPA', 'ITALIA', 'b'),
    (2023, 'CAMPIONI', "D'ITALIA", 'o'),
]


def pennant(year, l1, l2, style):
    w, h = 256, 704
    bgc, fg, yc = {'o': (ORANGE, (255, 255, 255), (255, 255, 255)), 'b': (BLACK, (255, 255, 255), (255, 255, 255)), 'w': (WHITE, (40, 50, 110), (30, 30, 30))}[style]
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.polygon([(0, 0), (w, 0), (w, int(h * 0.86)), (w // 2, h), (0, int(h * 0.86))], fill=bgc)
    d.rectangle([0, 0, w, 14], fill=(40, 40, 40))
    paste_fit(img, text_layer('ASIAGO', 'arialbd.ttf' if style != 'w' else 'ariblk.ttf', fg), (24, 30, w - 24, 92))
    paste_fit(img, text_layer('VIPERS', 'arialbd.ttf' if style != 'w' else 'ariblk.ttf', fg), (24, 96, w - 24, 158))
    d.ellipse([w // 2 - 34, 170, w // 2 + 34, 214], fill=(255, 255, 255), outline=(40, 40, 40), width=2)
    paste_fit(img, LOGO, (w // 2 - 30, 172, w // 2 + 30, 212))
    paste_fit(img, text_layer(str(year), 'ariblk.ttf', yc), (16, 230, w - 16, 312))
    paste_fit(img, text_layer(l1, 'arialbd.ttf', fg), (20, 324, w - 20, 368))
    paste_fit(img, text_layer(l2, 'arialbd.ttf', fg), (30, 372, w - 30, 414))
    # coppa stilizzata
    tc = (205, 170, 70) if style != 'w' else (190, 150, 60)
    cx = w // 2
    d.polygon([(cx - 46, 450), (cx + 46, 450), (cx + 30, 520), (cx - 30, 520)], fill=tc)
    d.arc([cx - 70, 455, cx - 30, 500], 90, 270, fill=tc, width=7)
    d.arc([cx + 30, 455, cx + 70, 500], 270, 90, fill=tc, width=7)
    d.rectangle([cx - 8, 520, cx + 8, 556], fill=tc)
    d.rectangle([cx - 34, 556, cx + 34, 576], fill=tc)
    return img


for i, (y, a, b, s) in enumerate(TROPHIES):
    save(pennant(y, a, b, s), f'banners/pennant_{i:02d}.png')


def fan_banner(lines, w=1024, h=640, colors=None):
    """Lenzuolo bianco dipinto a mano con la bomboletta."""
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pts = [(0, 6), (w // 3, 0), (2 * w // 3, 10), (w, 4), (w - 6, h - 10), (2 * w // 3, h), (w // 3, h - 14), (6, h - 4)]
    d.polygon(pts, fill=(238, 238, 230))
    n = len(lines)
    for i, ln in enumerate(lines):
        c = (colors[i] if colors else (25, 25, 25))
        lay = text_layer(ln, 'Inkfree.ttf', c + (255,), size=200, stroke=3, stroke_fill=c + (255,))
        lay = lay.rotate(random.uniform(-3, 3), expand=True, resample=Image.BICUBIC)
        paste_fit(img, lay, (40, 30 + i * (h - 60) // n, w - 40, 30 + (i + 1) * (h - 60) // n))
    arr = np.asarray(img).astype(np.float32)
    xs = np.linspace(0, 1, w)
    fold = 1.0 - 0.1 * (np.sin(xs * math.pi * 4.0 + 0.4) * 0.5 + 0.5)
    arr[..., :3] *= fold[None, :, None]
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA').filter(ImageFilter.GaussianBlur(0.5))


save(fan_banner(['TRANQUILLO', 'ZIO!!!']), 'banners/fan_zio.png')
save(fan_banner(['FEDERAZIONE', 'MAL GOVERNATA', 'NON VERRÀ', 'PERDONATA'], colors=[(25, 25, 25), (25, 25, 25), (205, 190, 40), (25, 25, 25)]), 'banners/fan_federazione.png')
save(fan_banner(['FORZA VIPERS'], w=1024, h=300, colors=[(230, 100, 20)]), 'banners/fan_vipers.png')

# logo grande da muro
wl = Image.new('RGBA', (768, 512), (250, 250, 250, 255))
wd = ImageDraw.Draw(wl)
d2 = ImageDraw.Draw(wl)
d2.polygon([(0, 0), (768, 0), (768, 512), (0, 512)], fill=(250, 250, 250))
paste_fit(wl, LOGO, (90, 40, 560, 470))
for k, c in enumerate([(0, 146, 70), (244, 245, 240), (206, 43, 55)]):
    d2.polygon([(560 + k * 60, 512), (620 + k * 60, 80), (680 + k * 60, 80), (620 + k * 60, 512)], fill=c)
save(banner_finish(wl), 'banners/vipers_wall.jpg')
print('fatto')
