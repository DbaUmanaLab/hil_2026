"""Genera le texture del PalaHockey CUS Verona in assets/textures/cus_verona/.
Uso (dalla cartella del progetto): python tools/generate_cus_verona_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Legno lamellare e rilievo piastrelle sono condivisi con Cittadella.
"""
import sys, os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish, rng

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'cus_verona')
os.makedirs(OUT, exist_ok=True)
random.seed(1993)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'cus_verona.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
NAVY, YEL = (20, 32, 100), (246, 196, 0)


def save(img, name, quality=88):
    path = os.path.join(OUT, name)
    if name.endswith('.png'):
        img.save(path, optimize=True)
    else:
        img.convert('RGB').save(path, quality=quality, optimize=True, progressive=True)
    print('  ', name, img.size, os.path.getsize(path) // 1024, 'KB')


# ================================================================== 1. PAVIMENTO IN CEMENTO LEVIGATO
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
base = fft_noise(1024, 512, beta=2.2)
base = np.asarray(Image.fromarray((base * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(np.float32) / 255
fine = fft_noise(1024, 512, beta=1.3)
fine = np.asarray(Image.fromarray((fine * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(np.float32) / 255
col = np.zeros((H, W, 3), np.float32) + np.array([186, 189, 192], np.float32)
col += ((base - 0.5) * 34)[..., None] + ((fine - 0.5) * 10)[..., None]
# giunti di dilatazione del getto (lastre da ~6 m)
for z in np.arange(-RL / 2, RL / 2, 6.0):
    y = int((z + RL / 2) * S)
    col[max(0, y - 1):y + 2] *= 0.86
for x in np.arange(-RW / 2, RW / 2, 6.0):
    xx = int((x + RW / 2) * S)
    col[:, max(0, xx - 1):xx + 2] *= 0.88
CR = 7.5
X = (np.arange(W)[None, :] + 0.5) / S - RW / 2
Z = (np.arange(H)[:, None] + 0.5) / S - RL / 2
cx_, cz_ = RW / 2 - CR, RL / 2 - CR
outside = (np.abs(X) > cx_) & (np.abs(Z) > cz_) & (((np.abs(X) - cx_) ** 2 + (np.abs(Z) - cz_) ** 2) > CR ** 2)
col[outside] *= 0.82

SS = 2
red_m = Image.new('L', (W * SS, H * SS), 0)
dark_m = Image.new('L', (W * SS, H * SS), 0)
rd, dd = ImageDraw.Draw(red_m), ImageDraw.Draw(dark_m)
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)


def rect(d, x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    d.rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def ring(d, x, z, r, wdt):
    c = P(x, z); R = r * S * SS
    d.ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], outline=255, width=max(1, int(wdt * S * SS)))


rect(rd, -RW / 2, -0.06, RW / 2, 0.06)                 # linea centrale rossa sottile
ring(rd, 0, 0, 4.5, 0.07)                              # cerchio centrale rosso
for sgn in (-1, 1):
    rect(rd, -RW / 2, sgn * 31 - 0.04, RW / 2, sgn * 31 + 0.04)
    c = P(0, sgn * 31); R = 1.8 * S * SS
    rd.arc([c[0] - R, c[1] - R, c[0] + R, c[1] + R], 180 if sgn > 0 else 0, 360 if sgn > 0 else 180, fill=255, width=int(0.06 * S * SS))
    for x in (-8.5, 8.5):
        ring(dd, x, sgn * 21, 4.3, 0.05)               # cerchi d'ingaggio grigio scuro
        rect(rd, x - 0.15, sgn * 21 - 0.15, x + 0.15, sgn * 21 + 0.15)
        for hx in (-1, 1):
            rect(rd, x + hx * 0.55, sgn * 21 - 0.03, x + hx * 1.3, sgn * 21 + 0.03)
        rect(rd, x - 0.15, sgn * 9.5 - 0.15, x + 0.15, sgn * 9.5 + 0.15)
    for x in (-RW / 2, RW / 2):
        pass
rm = np.asarray(red_m.resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
dm = np.asarray(dark_m.resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
col = col * (1 - rm * 0.9) + np.array([205, 40, 40], np.float32) * rm * 0.9
col = col * (1 - dm * 0.75) + np.array([70, 72, 76], np.float32) * dm * 0.75

img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(90):                                    # crepe e rattoppi del cemento
    x, y = random.uniform(0, W), random.uniform(0, H)
    pts = [(x, y)]
    for _k in range(random.randint(4, 12)):
        x += random.uniform(-40, 40); y += random.uniform(-40, 40)
        pts.append((x, y))
    sd.line(pts, fill=(60, 62, 66, random.randint(50, 110)), width=random.randint(1, 3))
for _ in range(1400):                                  # segni di ruote
    px, py = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(20, 140); a = random.uniform(0, 180)
    sd.arc([px - ln, py - ln, px + ln, py + ln], a, a + random.uniform(20, 70), fill=(40, 42, 46, random.randint(10, 30)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.7)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)
hn = (base * 0.6 + fine * 0.4)
save(normal_from_height(hn * 3, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. TELO BIANCO DELLA COPERTURA
print('telo')
W = H = 1024
st = fft_noise(H, W, beta=2.6)
memb = np.zeros((H, W, 3), np.float32) + np.array([236, 237, 238], np.float32)
memb += ((st - 0.5) * 16)[..., None]
save(to_img(memb), 'membrane.jpg')
save(normal_from_height(st * 0.8, 1.2), 'membrane_n.jpg')


# ================================================================== 3. STRISCIONI SPONSOR
print('striscioni')
def banner(name, w=1024, h=256):
    img = Image.new('RGBA', (w, h), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    m = int(h * 0.12)
    if name == 'artiskate':
        d.rectangle([0, 0, w, h], fill=(20, 20, 22))
        a = text_layer('arti', 'segoeuib.ttf', (255, 255, 255))
        b = text_layer('SKATE', 'ariblk.ttf', (230, 40, 40))
        comb = Image.new('RGBA', (a.width + b.width + 10, max(a.height, b.height)), (0, 0, 0, 0))
        comb.alpha_composite(a, (0, comb.height - a.height)); comb.alpha_composite(b, (a.width + 10, comb.height - b.height))
        paste_fit(img, comb, (m, int(h * 0.08), w - m, int(h * 0.68)))
        paste_fit(img, text_layer('PATTINI E ROTELLE • VERONA', 'arialbd.ttf', (200, 200, 200)), (int(w * 0.18), int(h * 0.72), int(w * 0.82), h - m))
    elif name == 'alitrans':
        d.ellipse([int(w * 0.3), int(h * 0.12), int(w * 0.7), int(h * 0.74)], fill=(214, 30, 40))
        paste_fit(img, text_layer('ALITRANS', 'ariblk.ttf', (255, 255, 255)), (int(w * 0.33), int(h * 0.24), int(w * 0.67), int(h * 0.6)))
        paste_fit(img, text_layer('SPEDIZIONI INTERNAZIONALI', 'arialbd.ttf', (90, 90, 90), spacing=4), (int(w * 0.2), int(h * 0.78), int(w * 0.8), h - 10))
    elif name == 'digital':
        paste_fit(img, text_layer('Digital', 'segoeuib.ttf', (0, 110, 190)), (m, int(h * 0.12), int(w * 0.55), int(h * 0.7)), 'right')
        paste_fit(img, text_layer('network', 'segoeuib.ttf', (230, 60, 60)), (int(w * 0.57), int(h * 0.12), w - m, int(h * 0.7)), 'left')
        paste_fit(img, text_layer('SOLUZIONI INFORMATICHE', 'arialbd.ttf', (110, 110, 110)), (int(w * 0.2), int(h * 0.74), int(w * 0.8), h - m))
    elif name == 'ecoway':
        d.rectangle([0, 0, w, h], fill=(150, 210, 230))
        d.ellipse([m, m, m + h - 2 * m, h - m], fill=(60, 160, 70))
        paste_fit(img, text_layer('ECOWAY', 'ariblk.ttf', (20, 90, 130), spacing=6), (h, int(h * 0.2), w - m, int(h * 0.8)), 'left')
    elif name == 'sandrini':
        d.ellipse([m, int(h * 0.15), m + int(h * 0.7), int(h * 0.85)], fill=(40, 160, 90))
        paste_fit(img, text_layer('SANDRINI', 'ariblk.ttf', (40, 120, 70)), (m * 2 + int(h * 0.7), int(h * 0.14), w - m, int(h * 0.6)), 'left')
        paste_fit(img, text_layer('metalli', 'segoeuib.ttf', (110, 110, 110)), (m * 2 + int(h * 0.7), int(h * 0.62), int(w * 0.7), h - m), 'left')
    elif name == 'zardini':
        d.rectangle([0, 0, w, h], fill=(18, 20, 28))
        d.rectangle([0, int(h * 0.8), w, h], fill=YEL)
        paste_fit(img, text_layer('ZARDINI', 'ariblk.ttf', YEL, shear=-0.18, spacing=10), (m, int(h * 0.1), w - m, int(h * 0.74)))
    elif name == 'cus':
        paste_fit(img, LOGO, (m, m // 2, m + h - m, h - m // 2))
        paste_fit(img, text_layer('CUS VERONA', 'ariblk.ttf', NAVY), (h + m, int(h * 0.12), w - m, int(h * 0.6)), 'left')
        paste_fit(img, text_layer('HOCKEY IN LINE', 'arialbd.ttf', (190, 150, 0), spacing=8), (h + m, int(h * 0.64), w - m, int(h * 0.86)), 'left')
    elif name == 'promopost':
        paste_fit(img, text_layer('Promo', 'ariblk.ttf', (40, 40, 40)), (m, int(h * 0.12), int(w * 0.48), int(h * 0.75)), 'right')
        paste_fit(img, text_layer('Post', 'ariblk.ttf', (240, 180, 0)), (int(w * 0.5), int(h * 0.12), w - m, int(h * 0.75)), 'left')
    elif name == 'avelia':
        paste_fit(img, text_layer('AVELIA', 'ariblk.ttf', NAVY, spacing=14), (m * 2, int(h * 0.15), w - m * 2, int(h * 0.85)))
    return banner_finish(img)


for nm in ['artiskate', 'alitrans', 'digital', 'ecoway', 'sandrini', 'zardini', 'cus', 'promopost', 'avelia']:
    save(banner(nm), f'banner_{nm}.jpg', quality=86)

# quadro "Coppa Italia" della squadra (foto di gruppo stilizzata)
cp = Image.new('RGB', (768, 512), (245, 245, 240))
cd = ImageDraw.Draw(cp)
cd.rectangle([20, 20, 748, 360], fill=(200, 205, 212))
for i in range(11):
    x = 60 + i * 62
    cd.ellipse([x, 120, x + 36, 156], fill=(214, 180, 150))
    cd.rectangle([x - 8, 156, x + 44, 300], fill=(245, 245, 245) if i % 3 else NAVY)
    cd.ellipse([x + 6, 196, x + 30, 220], fill=YEL)
cpr = cp.convert('RGBA')
paste_fit(cpr, text_layer('COPPA ITALIA', 'ariblk.ttf', NAVY), (80, 380, 520, 440))
paste_fit(cpr, text_layer('CUS VERONA HOCKEY', 'arialbd.ttf', (120, 120, 120)), (80, 446, 520, 490))
paste_fit(cpr, LOGO, (560, 375, 700, 500))
save(cpr, 'coppa_photo.jpg')
print('fatto')
