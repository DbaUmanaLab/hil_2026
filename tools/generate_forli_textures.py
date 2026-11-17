"""Genera le texture del Pattinodromo comunale di Forlì in assets/textures/forli/.
Uso (dalla cartella del progetto): python tools/generate_forli_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
"""
import sys, os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish, rng

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'forli')
os.makedirs(os.path.join(OUT, 'banners'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'flags'), exist_ok=True)
random.seed(1969)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'forli.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
NAVY, SKY, BLUE, RED = (22, 36, 80), (60, 140, 210), (30, 90, 170), (210, 30, 40)


def save(img, name, quality=88):
    path = os.path.join(OUT, name)
    if name.endswith('.png'):
        img.save(path, optimize=True)
    else:
        img.convert('RGB').save(path, quality=quality, optimize=True, progressive=True)
    print('  ', name, img.size, os.path.getsize(path) // 1024, 'KB')


# ================================================================== 1. PAVIMENTO (cemento levigato con le linee del pattinaggio)
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
base = fft_noise(1024, 512, beta=2.3)
base = np.asarray(Image.fromarray((base * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(np.float32) / 255
col = np.zeros((H, W, 3), np.float32) + np.array([196, 194, 188], np.float32)
col += ((base - 0.5) * 26)[..., None]
CR = 7.5
X = (np.arange(W)[None, :] + 0.5) / S - RW / 2
Z = (np.arange(H)[:, None] + 0.5) / S - RL / 2
cx_, cz_ = RW / 2 - CR, RL / 2 - CR
outside = (np.abs(X) > cx_) & (np.abs(Z) > cz_) & (((np.abs(X) - cx_) ** 2 + (np.abs(Z) - cz_) ** 2) > CR ** 2)
col[outside] *= 0.85

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'blue', 'white')}
drw = {k: ImageDraw.Draw(m) for k, m in masks.items()}
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)


def rect(k, x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    drw[k].rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def ring(k, x, z, r, wdt):
    c = P(x, z); R = r * S * SS
    drw[k].ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], outline=255, width=max(1, int(wdt * S * SS)))


rect('red', -RW / 2, -0.05, RW / 2, 0.05)
ring('blue', 0, 0, 4.5, 0.06)
for sgn in (-1, 1):
    rect('red', -RW / 2, sgn * 31 - 0.04, RW / 2, sgn * 31 + 0.04)
    rect('blue', -RW / 2, sgn * 12.5 - 0.05, RW / 2, sgn * 12.5 + 0.05)
    c = P(0, sgn * 31); R = 1.8 * S * SS
    drw['red'].arc([c[0] - R, c[1] - R, c[0] + R, c[1] + R], 180 if sgn > 0 else 0, 360 if sgn > 0 else 180, fill=255, width=int(0.06 * S * SS))
    for x in (-8.5, 8.5):
        ring('blue', x, sgn * 21, 4.3, 0.05)
        rect('red', x - 0.15, sgn * 21 - 0.15, x + 0.15, sgn * 21 + 0.15)
        rect('red', x - 0.15, sgn * 9.5 - 0.15, x + 0.15, sgn * 9.5 + 0.15)
# cerchi bianchi del pattinaggio artistico e puntini di riferimento
for (x, z, r) in [(-9, -18, 6), (9, 18, 6), (0, 0, 8), (-9, 18, 6), (9, -18, 6)]:
    ring('white', x, z, r, 0.035)
for _ in range(90):
    x, z = random.uniform(-16, 16), random.uniform(-33, 33)
    rect('white', x - 0.05, z - 0.05, x + 0.05, z + 0.05)
for k, colr, a in (('blue', (40, 90, 170), 0.85), ('red', (200, 40, 40), 0.85), ('white', (240, 240, 240), 0.6)):
    m = np.asarray(masks[k].resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(colr, np.float32) * m * a
img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1200):
    px, py = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(20, 150); a = random.uniform(0, 180)
    sd.arc([px - ln, py - ln, px + ln, py + ln], a, a + random.uniform(20, 70), fill=(60, 60, 60, random.randint(8, 24)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.7)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)
save(normal_from_height(base * 2.5, 1.0), 'rink_normal.jpg', quality=85)


# ================================================================== 2. PANNELLI SPONSOR DELLE BALAUSTRE
def panel(name, w, h):
    img = Image.new('RGBA', (w, h), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    m = int(h * 0.12)
    def bg(c): d.rectangle([0, 0, w, h], fill=c)
    if name == 'conad':
        d.ellipse([m, int(h * 0.2), m + int(h * 0.6), int(h * 0.8)], fill=(240, 180, 0))
        paste_fit(img, text_layer('CONAD', 'ariblk.ttf', (220, 30, 30)), (m * 2 + int(h * 0.6), int(h * 0.15), w - m, int(h * 0.85)), 'left')
    elif name == 'oxa':
        bg((200, 30, 40)); paste_fit(img, text_layer('OXA', 'ariblk.ttf', (255, 255, 255), spacing=10), (m, m, w - m, h - m))
    elif name == 'fisr':
        paste_fit(img, text_layer('FISR', 'ariblk.ttf', BLUE, shear=-0.2), (int(w * 0.25), int(h * 0.1), int(w * 0.75), int(h * 0.68)))
        paste_fit(img, text_layer('FEDERAZIONE ITALIANA SPORT ROTELLISTICI', 'arialbd.ttf', (90, 90, 90)), (m, int(h * 0.72), w - m, h - m))
        d.rectangle([m, int(h * 0.15), int(w * 0.22), int(h * 0.6)], fill=(220, 120, 30))
    elif name == 'pattinodromo':
        d.rectangle([0, 0, int(h * 0.9), h], fill=(240, 200, 30))
        paste_fit(img, text_layer('PATTINODROMO', 'ariblk.ttf', NAVY), (int(h * 1.0), int(h * 0.12), w - m, int(h * 0.55)), 'left')
        paste_fit(img, text_layer('COMUNALE', 'ariblk.ttf', NAVY), (int(h * 1.0), int(h * 0.55), int(w * 0.75), int(h * 0.88)), 'left')
        paste_fit(img, text_layer('FC', 'ariblk.ttf', RED), (8, int(h * 0.2), int(h * 0.9) - 8, int(h * 0.8)))
    elif name == 'diffusion':
        bg(RED); paste_fit(img, text_layer('DIFFUSION', 'ariblk.ttf', (255, 255, 255)), (m, int(h * 0.1), w - m, int(h * 0.62)))
        paste_fit(img, text_layer('STAMPA DIGITALE • TELI • CARTELLI', 'arialbd.ttf', (255, 220, 220)), (m, int(h * 0.68), w - m, h - m))
    elif name == 'citta':
        bg((205, 30, 40))
        d.ellipse([m, int(h * 0.22), m + int(h * 0.56), int(h * 0.78)], outline=(255, 255, 255), width=max(3, h // 22))
        paste_fit(img, text_layer('FORLÌ', 'georgiab.ttf', (255, 255, 255)), (m * 2 + int(h * 0.56), int(h * 0.1), w - m, int(h * 0.52)), 'left')
        paste_fit(img, text_layer('CITTÀ DELLO SPORT', 'georgiab.ttf', (255, 255, 255)), (m * 2 + int(h * 0.56), int(h * 0.56), w - m, int(h * 0.88)), 'left')
    elif name == 'winner':
        paste_fit(img, text_layer('WINNER', 'impact.ttf', (220, 30, 40), spacing=14), (m * 2, int(h * 0.15), w - m * 2, int(h * 0.85)))
    elif name == 'promotica':
        paste_fit(img, text_layer('PROMOTICA', 'arialbd.ttf', (230, 110, 30)), (m, int(h * 0.2), w - m, int(h * 0.6)))
        paste_fit(img, text_layer('PROMOZIONI E INCENTIVI', 'arialbd.ttf', (110, 110, 110)), (int(w * 0.15), int(h * 0.66), int(w * 0.85), h - m))
    elif name == 'valentini':
        bg((250, 220, 40)); paste_fit(img, text_layer('VALENTINI', 'ariblk.ttf', (30, 30, 30)), (m, int(h * 0.15), w - m, int(h * 0.85)))
    elif name == 'bandini':
        bg((30, 120, 60)); paste_fit(img, text_layer('F.LLI BANDINI', 'ariblk.ttf', (255, 255, 255)), (m, int(h * 0.1), w - m, int(h * 0.6)))
        paste_fit(img, text_layer('VERNICI PER L\'EDILIZIA', 'arialbd.ttf', (220, 240, 220)), (m, int(h * 0.66), w - m, h - m))
    elif name == 'italiarg':
        bg(NAVY); paste_fit(img, text_layer('ITALIA', 'ariblk.ttf', (255, 255, 255)), (m, int(h * 0.08), w - m, int(h * 0.5)))
        paste_fit(img, text_layer('ROLLER GAMES', 'ariblk.ttf', SKY), (m, int(h * 0.52), w - m, h - m))
    elif name == 'forli_logo':
        paste_fit(img, LOGO, (int(w * 0.2), m // 2, int(w * 0.8), h - m // 2))
    elif name == 'forli_big':
        paste_fit(img, LOGO, (m, m // 2, int(h * 1.3), h - m // 2))
        paste_fit(img, LOGO, (w - int(h * 1.3), m // 2, w - m, h - m // 2))
        paste_fit(img, text_layer('LIBERTAS FORLÌ', 'ariblk.ttf', NAVY, shear=-0.2), (int(h * 1.45), int(h * 0.08), w - int(h * 1.45), int(h * 0.68)))
        paste_fit(img, text_layer('WAR PIGS  •  INLINE HOCKEY  •  SECURFOX', 'arialbd.ttf', SKY, spacing=6), (int(h * 1.45), int(h * 0.72), w - int(h * 1.45), int(h * 0.92)))
    elif name == 'securfox':
        d.polygon([(m, h - m), (m + int(h * 0.35), m), (m + int(h * 0.7), h - m)], fill=(240, 110, 30))
        paste_fit(img, text_layer('SECURFOX', 'ariblk.ttf', (40, 40, 40)), (m + int(h * 0.85), int(h * 0.2), w - m, int(h * 0.8)), 'left')
    elif name == 'coni':
        paste_fit(img, text_layer('CONI', 'ariblk.ttf', BLUE, spacing=10), (int(w * 0.2), int(h * 0.15), int(w * 0.8), int(h * 0.85)))
    elif name == 'emilia':
        d.rectangle([int(w * 0.3), m, int(w * 0.7), h - m], fill=(30, 140, 70))
        d.polygon([(int(w * 0.3), h - m), (int(w * 0.7), m), (int(w * 0.7), h - m)], fill=(255, 255, 255))
    return img


def board_strip(panels, w=4096, h=256, widths=None):
    img = Image.new('RGBA', (w, h), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    top_cap, kick = 26, 14
    widths = widths or [w // len(panels)] * len(panels)
    x = 0
    for name, pw in zip(panels, widths):
        img.alpha_composite(panel(name, pw - 8, h - top_cap - kick - 10), (x + 4, top_cap + 5))
        d.line([x, top_cap, x, h - kick], fill=(200, 205, 212), width=3)
        x += pw
    d.rectangle([0, 0, w, top_cap], fill=(36, 96, 180))          # bordo blu superiore
    d.rectangle([0, h - kick, w, h], fill=(36, 96, 180))
    arr = np.asarray(img).astype(np.float32)
    for _ in range(120):
        sx, sy = random.randint(0, w - 60), random.randint(h - kick - 30, h - kick - 2)
        arr[sy:sy + 3, sx:sx + random.randint(8, 50), :3] *= random.uniform(0.5, 0.8)
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA')


print('balaustre')
save(board_strip(['conad', 'oxa', 'fisr', 'valentini', 'bandini', 'diffusion', 'citta', 'winner']), 'boards_a.jpg')
save(board_strip(['promotica', 'winner', 'italiarg', 'fisr', 'coni', 'emilia', 'securfox', 'citta']), 'boards_b.jpg')
save(board_strip(['pattinodromo', 'citta', 'forli_big', 'italiarg', 'fisr'], widths=[768, 512, 1792, 512, 512]), 'boards_center.jpg')
corner = Image.new('RGBA', (1024, 256), (255, 255, 255, 255))
cd = ImageDraw.Draw(corner)
cd.rectangle([0, 0, 1024, 26], fill=(36, 96, 180)); cd.rectangle([0, 242, 1024, 256], fill=(36, 96, 180))
save(corner, 'boards_corner.jpg')

# ================================================================== 3. PARETI
print('pareti')
# fascia bassa intonacata bianca (2 m x 2 m)
W = H = 512
gr = fft_noise(H, W, beta=2.4)
wl = np.zeros((H, W, 3), np.float32) + np.array([236, 234, 228], np.float32) + ((gr - 0.5) * 14)[..., None]
save(to_img(wl), 'wall_lower.jpg')
# pannelli grigi a nervature verticali (2 m x 2 m)
prof = np.array([1.0 if (x % 128) < 110 else 0.6 for x in range(W)], np.float32)
wp = np.zeros((H, W, 3), np.float32) + np.array([196, 196, 192], np.float32)
wp *= (0.9 + 0.1 * prof)[None, :, None]
wp += ((fft_noise(H, W, beta=2.2, sx=1, sy=0.15) - 0.5) * 16)[..., None]
save(to_img(wp), 'wall_panel.jpg')
save(normal_from_height(np.tile(prof * 4, (H, 1)), 1.0), 'wall_panel_n.jpg')
# fascia argentata di pannelli isolanti trapuntati (4 m x 1 m)
W, H = 1024, 256
sb = Image.new('RGB', (W, H), (190, 194, 198))
sdw = ImageDraw.Draw(sb)
for i in range(0, W, 128):
    for j, y0 in enumerate((0, 128)):
        g = 205 - ((i // 128 + j) % 2) * 22
        sdw.polygon([(i, y0), (i + 128, y0), (i + 100, y0 + 128), (i + 28, y0 + 128)], fill=(g, g + 2, g + 6))
        sdw.line([(i, y0), (i + 64, y0 + 64), (i + 128, y0)], fill=(160, 164, 170), width=3)
    sdw.line([(i, 0), (i, H)], fill=(150, 154, 160), width=3)
save(sb.filter(ImageFilter.GaussianBlur(1.2)), 'silver_band.jpg')
# finestrone a più vetri (2,4 m x 3,6 m) e tenda color crema
W, H = 384, 576
wn = Image.new('RGB', (W, H), (60, 90, 70))
wd = ImageDraw.Draw(wn)
for y in range(H):
    v = int(200 + 40 * (1 - y / H))
    wd.line([(0, y), (W, y)], fill=(v - 20, v, v + 15))
for k in range(3):
    wd.line([(k * W // 3, 0), (k * W // 3, H)], fill=(30, 80, 50), width=10)
for k in range(5):
    wd.line([(0, k * H // 4), (W, k * H // 4)], fill=(30, 80, 50), width=10)
wd.rectangle([0, 0, W - 1, H - 1], outline=(30, 80, 50), width=16)
save(wn, 'window.jpg')
bl = Image.new('RGB', (W, H), (232, 222, 182))
bd = ImageDraw.Draw(bl)
for y in range(0, H, 24):
    bd.line([(0, y), (W, y)], fill=(214, 202, 160), width=2)
bd.rectangle([0, 0, W - 1, H - 1], outline=(30, 80, 50), width=16)
save(bl, 'blind.jpg')

# ================================================================== 4. STRISCIONI E BANDIERE
print('striscioni')
# ROSSI R. 69 — per sempre War Pig (stendardo verticale)
rs = Image.new('RGBA', (384, 896), (244, 244, 248, 255))
rd = ImageDraw.Draw(rs)
paste_fit(rs, text_layer('ROSSI R.', 'impact.ttf', NAVY, spacing=8), (30, 30, 354, 140))
cx, cy, R1, R2 = 192, 400, 170, 70
pts = [(cx + (R1 if k % 2 == 0 else R2) * math.sin(k * math.pi / 5), cy - (R1 if k % 2 == 0 else R2) * math.cos(k * math.pi / 5)) for k in range(10)]
rd.polygon(pts, fill=(246, 196, 20), outline=(200, 150, 0))
paste_fit(rs, text_layer('69', 'georgiab.ttf', NAVY, stroke=4, stroke_fill=(255, 255, 255)), (110, 330, 290, 470))
for _ in range(36):
    x, y = random.randint(20, 364), random.randint(600, 780)
    rd.polygon([(x, y - 9), (x + 3, y - 2), (x + 10, y - 2), (x + 4, y + 3), (x + 6, y + 10), (x, y + 5), (x - 6, y + 10), (x - 4, y + 3), (x - 10, y - 2), (x - 3, y - 2)], fill=NAVY)
rd.rectangle([0, 800, 384, 896], fill=NAVY)
paste_fit(rs, LOGO, (14, 806, 90, 890))
paste_fit(rs, text_layer('PER SEMPRE WAR PIG', 'arialbd.ttf', (255, 255, 255)), (96, 826, 370, 870))
save(rs, 'banners/rossi69.png')


def wide(name, w=1024, h=256):
    img = Image.new('RGBA', (w, h), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    m = int(h * 0.12)
    if name == 'libertas':
        paste_fit(img, text_layer('LIBERTAS', 'georgiab.ttf', (30, 30, 30), spacing=10), (int(w * 0.2), int(h * 0.08), int(w * 0.8), int(h * 0.6)))
        paste_fit(img, text_layer('PATTINAGGIO ARTISTICO • FORLÌ', 'arialbd.ttf', (120, 120, 120)), (int(w * 0.18), int(h * 0.66), int(w * 0.82), h - m))
    elif name == 'fisr100':
        paste_fit(img, text_layer('100', 'ariblk.ttf', (240, 140, 30), shear=-0.2), (m, m, int(w * 0.35), h - m))
        paste_fit(img, text_layer('FISR', 'ariblk.ttf', BLUE, shear=-0.2), (int(w * 0.38), int(h * 0.1), int(w * 0.75), int(h * 0.62)))
        paste_fit(img, text_layer('1922 - 2022', 'arialbd.ttf', (220, 50, 40)), (int(w * 0.38), int(h * 0.66), int(w * 0.75), h - m))
    elif name == 'coppa_u19':
        paste_fit(img, text_layer('VINCITORI COPPA ITALIA U19', 'ariblk.ttf', NAVY), (m, int(h * 0.1), w - m, int(h * 0.45)))
        paste_fit(img, text_layer('FORLÌ 2020/2021  •  ITALIA ROLLER GAMES', 'arialbd.ttf', RED), (m, int(h * 0.55), w - m, int(h * 0.82)))
    elif name == 'campionesse':
        paste_fit(img, text_layer("CAMPIONESSE D'ITALIA", 'ariblk.ttf', RED), (m, int(h * 0.12), w - m, int(h * 0.5)))
        paste_fit(img, text_layer('PATTINAGGIO ARTISTICO • LIBERTAS FORLÌ', 'arialbd.ttf', (90, 90, 90)), (m, int(h * 0.58), w - m, int(h * 0.82)))
    elif name == 'roday':
        d.rectangle([0, 0, w, h], fill=(30, 70, 160))
        paste_fit(img, text_layer('Ro DAY', 'ariblk.ttf', (255, 255, 255)), (m, m, int(w * 0.7), h - m))
        d.ellipse([int(w * 0.74), int(h * 0.2), int(w * 0.74) + int(h * 0.6), int(h * 0.8)], outline=(250, 200, 30), width=10)
    elif name == 'adjutor':
        d.rectangle([m, int(h * 0.2), m + int(h * 0.6), int(h * 0.8)], fill=(40, 40, 40))
        d.rectangle([m + int(h * 0.24), int(h * 0.26), m + int(h * 0.36), int(h * 0.74)], fill=(255, 255, 255))
        d.rectangle([m + int(h * 0.06), int(h * 0.44), m + int(h * 0.54), int(h * 0.56)], fill=(255, 255, 255))
        paste_fit(img, text_layer('ADJUTOR', 'georgiab.ttf', (40, 40, 40), spacing=8), (m * 2 + int(h * 0.6), int(h * 0.15), w - m, int(h * 0.62)), 'left')
        paste_fit(img, text_layer('SANITARIA • ORTOPEDIA', 'arialbd.ttf', (110, 110, 110)), (m * 2 + int(h * 0.6), int(h * 0.66), w - m, h - m), 'left')
    elif name == 'rizzoli':
        paste_fit(img, text_layer('Rizzoli Roberto s.r.l.', 'segoeuib.ttf', (40, 60, 140)), (m, int(h * 0.1), w - m, int(h * 0.5)))
        d.polygon([(0, h), (int(w * 0.3), int(h * 0.55), ), (int(w * 0.55), h)], fill=(70, 120, 90))
        d.polygon([(int(w * 0.35), h), (int(w * 0.65), int(h * 0.5)), (w, h)], fill=(100, 150, 200))
    elif name == 'forli_banner':
        paste_fit(img, LOGO, (m, m // 2, m + h - m, h - m // 2))
        paste_fit(img, text_layer('LIBERTAS FORLÌ', 'ariblk.ttf', NAVY), (h + m, int(h * 0.12), w - m, int(h * 0.6)), 'left')
        paste_fit(img, text_layer('WAR PIGS • HOCKEY IN LINE', 'arialbd.ttf', SKY, spacing=4), (h + m, int(h * 0.64), w - m, int(h * 0.86)), 'left')
    return banner_finish(img)


for nm in ['libertas', 'fisr100', 'coppa_u19', 'campionesse', 'roday', 'adjutor', 'rizzoli', 'forli_banner']:
    save(wide(nm), f'banners/{nm}.jpg', quality=86)

# bandiere nazionali (semplificate)
def tri(cols, vertical=True):
    im = Image.new('RGB', (300, 200)); d = ImageDraw.Draw(im)
    for i, c in enumerate(cols):
        if vertical: d.rectangle([i * 100, 0, (i + 1) * 100, 200], fill=c)
        else: d.rectangle([0, i * 200 // 3, 300, (i + 1) * 200 // 3], fill=c)
    return im
flags = {
    'italia': tri([(0, 146, 70), (244, 245, 240), (206, 43, 55)]),
    'francia': tri([(0, 85, 164), (250, 250, 250), (239, 65, 53)]),
    'slovenia': tri([(250, 250, 250), (0, 80, 160), (220, 30, 40)], False),
    'argentina': tri([(116, 172, 223), (250, 250, 250), (116, 172, 223)], False),
}
sp = Image.new('RGB', (300, 200), (198, 11, 30)); d = ImageDraw.Draw(sp); d.rectangle([0, 50, 300, 150], fill=(255, 196, 0)); flags['spagna'] = sp
pt = Image.new('RGB', (300, 200), (255, 0, 0)); d = ImageDraw.Draw(pt); d.rectangle([0, 0, 120, 200], fill=(0, 102, 0)); d.ellipse([90, 70, 150, 130], fill=(255, 220, 0)); flags['portogallo'] = pt
ch = Image.new('RGB', (300, 200), (218, 41, 28)); d = ImageDraw.Draw(ch); d.rectangle([130, 50, 170, 150], fill=(255, 255, 255)); d.rectangle([100, 80, 200, 120], fill=(255, 255, 255)); flags['svizzera'] = ch
eu = Image.new('RGB', (300, 200), (0, 51, 153)); d = ImageDraw.Draw(eu)
for k in range(12):
    a = k * math.pi / 6; x, y = 150 + 60 * math.cos(a), 100 + 60 * math.sin(a); d.ellipse([x - 7, y - 7, x + 7, y + 7], fill=(255, 204, 0))
flags['europa'] = eu
uk = Image.new('RGB', (300, 200), (1, 33, 105)); d = ImageDraw.Draw(uk)
d.line([(0, 0), (300, 200)], fill=(255, 255, 255), width=36); d.line([(300, 0), (0, 200)], fill=(255, 255, 255), width=36)
d.line([(0, 0), (300, 200)], fill=(200, 16, 46), width=12); d.line([(300, 0), (0, 200)], fill=(200, 16, 46), width=12)
d.rectangle([0, 75, 300, 125], fill=(255, 255, 255)); d.rectangle([125, 0, 175, 200], fill=(255, 255, 255))
d.rectangle([0, 85, 300, 115], fill=(200, 16, 46)); d.rectangle([135, 0, 165, 200], fill=(200, 16, 46)); flags['regnounito'] = uk
for k, im in flags.items():
    save(im, f'flags/{k}.jpg', quality=88)
print('fatto')
