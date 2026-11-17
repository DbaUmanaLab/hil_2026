"""Genera le texture del Quanta Club Arena di Milano in assets/textures/milano/.
Uso (dalla cartella del progetto): python tools/generate_milano_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
"""
import sys, os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish, rng

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'milano')
os.makedirs(OUT, exist_ok=True)
random.seed(2024)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'milano.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
NAVY, RED = (16, 34, 92), (200, 22, 40)


def save(img, name, quality=88):
    path = os.path.join(OUT, name)
    if name.endswith('.png'):
        img.save(path, optimize=True)
    else:
        img.convert('RGB').save(path, quality=quality, optimize=True, progressive=True)
    print('  ', name, img.size, os.path.getsize(path) // 1024, 'KB')


# ------------------------------------------------------------------ pannelli sponsor delle balaustre
def panel(name, w, h):
    img = Image.new('RGBA', (w, h), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    m = int(h * 0.12)
    if name == 'joma':
        paste_fit(img, text_layer('Joma', 'seguibl.ttf', (24, 60, 140)), (m * 2, int(h * 0.1), w - m * 2, int(h * 0.9)))
    elif name == 'quanta':
        d.ellipse([m, int(h * 0.2), m + int(h * 0.6), int(h * 0.8)], outline=(70, 90, 110), width=max(3, h // 22))
        paste_fit(img, text_layer('QUANTA CLUB', 'arial.ttf', (60, 80, 100), spacing=10), (m * 2 + int(h * 0.6), int(h * 0.22), w - m, int(h * 0.58)), 'left')
        paste_fit(img, text_layer('SPORT • WELLNESS • EVENTI', 'arialbd.ttf', (130, 140, 150)), (m * 2 + int(h * 0.6), int(h * 0.62), w - m, int(h * 0.8)), 'left')
    elif name == 'lauretana':
        paste_fit(img, text_layer('LAURETANA', 'georgiab.ttf', (190, 40, 50), spacing=8), (m, int(h * 0.12), w - m, int(h * 0.62)))
        paste_fit(img, text_layer("L'acqua più leggera d'Europa", 'georgiab.ttf', (110, 110, 110)), (int(w * 0.12), int(h * 0.66), int(w * 0.88), int(h * 0.86)))
    elif name == 'q':
        d.rectangle([0, 0, w, h], fill=(36, 140, 70))
        paste_fit(img, text_layer('Q', 'segoeuib.ttf', (255, 255, 255)), (int(w * 0.35), int(h * 0.12), int(w * 0.65), int(h * 0.88)))
    elif name == 'hcm':
        paste_fit(img, LOGO, (m, m // 2, int(h * 1.3), h - m // 2))
        paste_fit(img, text_layer('HCM', 'ariblk.ttf', NAVY, shear=-0.2), (int(h * 1.35), int(h * 0.15), w - m, int(h * 0.6)), 'left')
        paste_fit(img, text_layer('HOCKEY CLUB MILANO', 'arialbd.ttf', RED), (int(h * 1.35), int(h * 0.62), w - m, int(h * 0.82)), 'left')
    elif name == 'rhino':
        paste_fit(img, LOGO, (int(w * 0.25), m // 2, int(w * 0.75), h - m // 2))
    elif name == 'hoax':
        d.polygon([(m, h // 2), (m + int(h * 0.3), m), (m + int(h * 0.6), h // 2), (m + int(h * 0.3), h - m)], fill=(40, 90, 170))
        paste_fit(img, text_layer('HOAX', 'ariblk.ttf', (30, 60, 120)), (m + int(h * 0.75), int(h * 0.12), w - m, int(h * 0.62)), 'left')
        paste_fit(img, text_layer('SPORTSWEAR', 'arialbd.ttf', (90, 90, 90), spacing=6), (m + int(h * 0.75), int(h * 0.64), w - m, int(h * 0.84)), 'left')
    elif name == 'oec':
        d.rectangle([0, 0, w, h], fill=(30, 70, 130))
        paste_fit(img, text_layer('OEC', 'ariblk.ttf', (255, 255, 255)), (m, int(h * 0.12), int(w * 0.5), int(h * 0.88)))
        paste_fit(img, text_layer('STUDIO', 'arialbd.ttf', (190, 210, 240), spacing=8), (int(w * 0.52), int(h * 0.3), w - m, int(h * 0.7)), 'left')
    elif name == 'generali':
        d.ellipse([int(w * 0.08), int(h * 0.18), int(w * 0.08) + int(h * 0.64), int(h * 0.82)], fill=(200, 30, 30))
        paste_fit(img, text_layer('GENERALI', 'georgiab.ttf', (200, 30, 30), spacing=6), (int(w * 0.08) + int(h * 0.75), int(h * 0.24), w - m, int(h * 0.76)), 'left')
    elif name == 'cn':
        d.ellipse([int(w * 0.36), int(h * 0.12), int(w * 0.36) + int(h * 0.76), int(h * 0.88)], outline=(40, 40, 40), width=max(3, h // 20))
        paste_fit(img, text_layer('CN', 'ariblk.ttf', (40, 40, 40)), (int(w * 0.36) + 10, int(h * 0.3), int(w * 0.36) + int(h * 0.76) - 10, int(h * 0.7)))
    elif name == 'milano_big':
        paste_fit(img, LOGO, (m, m // 2, int(h * 1.35), h - m // 2))
        paste_fit(img, LOGO, (w - int(h * 1.35), m // 2, w - m, h - m // 2))
        paste_fit(img, text_layer('HC MILANO QUANTA', 'ariblk.ttf', NAVY, shear=-0.2), (int(h * 1.5), int(h * 0.08), w - int(h * 1.5), int(h * 0.68)))
        paste_fit(img, text_layer('INLINE HOCKEY  •  SERIE A  •  QUANTA CLUB ARENA', 'arialbd.ttf', RED, spacing=6), (int(h * 1.5), int(h * 0.72), w - int(h * 1.5), int(h * 0.92)))
    return img


def board_strip(panels, w=4096, h=256, widths=None):
    img = Image.new('RGBA', (w, h), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    top_cap, kick = 8, 46
    ad_h = h - top_cap - kick
    widths = widths or [w // len(panels)] * len(panels)
    x = 0
    for name, pw in zip(panels, widths):
        img.alpha_composite(panel(name, pw - 6, ad_h - 8), (x + 3, top_cap + 4))
        d.line([x, top_cap, x, h - kick], fill=(212, 216, 222), width=3)
        x += pw
    d.rectangle([0, 0, w, top_cap], fill=(230, 232, 236))
    d.rectangle([0, h - kick, w, h], fill=(232, 200, 40))
    arr = np.asarray(img).astype(np.float32)
    for _ in range(160):
        sx, sy = random.randint(0, w - 60), random.randint(h - kick + 4, h - 5)
        arr[sy:sy + random.randint(2, 4), sx:sx + random.randint(8, 60), :3] *= random.uniform(0.35, 0.7)
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA')


# ================================================================== 1. PISTA
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
TILE = 0.305
tx = (np.arange(W) / S / TILE).astype(int)
ty = (np.arange(H) / S / TILE).astype(int)
TR = rng.normal(0, 1, (ty.max() + 1, tx.max() + 1))[ty[:, None], tx[None, :]]
col = np.zeros((H, W, 3), np.float32) + np.array([150, 196, 232], np.float32)
col += (TR * 2.2)[..., None]
wear = fft_noise(1024, 512, beta=2.4)
wear = np.asarray(Image.fromarray((wear * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(np.float32) / 255
col += ((wear - 0.5) * 9)[..., None]
fx = (np.arange(W) / S) % TILE
fy = (np.arange(H) / S) % TILE
col[((fx[None, :] < 0.01) | (fy[:, None] < 0.01))] *= 0.93
CR = 7.5
X = (np.arange(W)[None, :] + 0.5) / S - RW / 2
Z = (np.arange(H)[:, None] + 0.5) / S - RL / 2
cx_, cz_ = RW / 2 - CR, RL / 2 - CR
outside = (np.abs(X) > cx_) & (np.abs(Z) > cz_) & (((np.abs(X) - cx_) ** 2 + (np.abs(Z) - cz_) ** 2) > CR ** 2)
col[outside] = np.array([120, 124, 130], np.float32)

SS = 2
mask = Image.new('L', (W * SS, H * SS), 0)
md = ImageDraw.Draw(mask)
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)


def rect(x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    md.rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def ring(x, z, r, wdt):
    c = P(x, z); R = r * S * SS
    md.ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], outline=255, width=max(1, int(wdt * S * SS)))


rect(-RW / 2, -0.3, RW / 2, 0.3)                            # linea centrale larga (come nelle foto)
for sgn in (-1, 1):
    rect(-RW / 2, sgn * 31 - 0.04, RW / 2, sgn * 31 + 0.04)
    rect(-2.0, sgn * 31, 2.0, sgn * (31 - 1.8))               # area di porta rossa
    for x in (-8.5, 8.5):
        ring(x, sgn * 21, 4.3, 0.06)
        rect(x - 0.28, sgn * 21 - 0.18, x + 0.28, sgn * 21 + 0.18)
        rect(x - 0.28, sgn * 9.5 - 0.18, x + 0.28, sgn * 9.5 + 0.18)
ring(0, 0, 4.5, 0.06)
mask = mask.resize((W, H), Image.LANCZOS)
m = np.asarray(mask).astype(np.float32)[..., None] / 255
red = np.array([214, 70, 70], np.float32)
col = col * (1 - m * 0.9) + red * (m * 0.9)
# riquadrino azzurro scuro al centro della linea (come in foto)
a0, b0 = int((-0.25 + RW / 2) * S), int((-0.3 + RL / 2) * S)
col[b0:b0 + int(0.6 * S), a0:a0 + int(0.5 * S)] = np.array([110, 150, 200], np.float32)
img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(700):
    px, py = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(20, 120)
    a = random.uniform(0, 180)
    sd.arc([px - ln, py - ln, px + ln, py + ln], a, a + random.uniform(20, 60), fill=(255, 255, 255, random.randint(10, 26)), width=2)
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)

# ================================================================== 2. TELO PRESSOSTATICO
print('telo')
W = H = 1024
st = fft_noise(H, W, beta=2.6)
memb = np.zeros((H, W, 3), np.float32) + np.array([206, 210, 214], np.float32)
memb += ((st - 0.5) * 26)[..., None]
hm = st * 0.6
for sx_ in range(0, W, 128):                 # saldature dei teli
    memb[:, sx_:sx_ + 3] *= 0.9
    hm[:, sx_:sx_ + 4] += 1.0
grime = fft_noise(H, W, beta=2.2, sx=1.0, sy=0.15)
memb -= ((grime - 0.5) * 14)[..., None]
save(to_img(memb), 'membrane.jpg')
save(normal_from_height(hm, 1.2), 'membrane_n.jpg')

# ================================================================== 3. BALAUSTRE
print('balaustre')
save(board_strip(['joma', 'hcm', 'quanta', 'lauretana', 'q', 'rhino', 'hoax', 'oec']), 'boards_a.jpg')
save(board_strip(['generali', 'hoax', 'cn', 'joma', 'hcm', 'quanta', 'lauretana', 'rhino']), 'boards_b.jpg')
save(board_strip(['q', 'hoax', 'milano_big', 'lauretana', 'joma'], widths=[512, 512, 2048, 512, 512]), 'boards_center.jpg')
corner = Image.new('RGBA', (1024, 256), (255, 255, 255, 255))
cd = ImageDraw.Draw(corner)
cd.rectangle([0, 210, 1024, 256], fill=(232, 200, 40))
save(corner, 'boards_corner.jpg')

# ================================================================== 4. STENDARDI SCUDETTI HCM (atlante)
print('stendardi')
years = ['1999', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2010', '2011']
PW, PH = 128, 320
atlas = Image.new('RGBA', (PW * len(years), PH), (0, 0, 0, 0))
for i, yr in enumerate(years):
    pn = Image.new('RGBA', (PW, PH), (0, 0, 0, 0))
    d = ImageDraw.Draw(pn)
    d.polygon([(0, 0), (PW, 0), (PW, PH - 40), (PW // 2, PH), (0, PH - 40)], fill=(32, 48, 132, 255), outline=(200, 22, 40, 255))
    d.line([(4, 4), (PW - 4, 4), (PW - 4, PH - 42), (PW // 2, PH - 4), (4, PH - 42), (4, 4)], fill=(200, 22, 40, 255), width=6)
    d.rectangle([0, 0, PW, 12], fill=(220, 220, 225, 255))
    paste_fit(pn, LOGO, (18, 26, PW - 18, 108))
    paste_fit(pn, text_layer('HCM', 'ariblk.ttf', (255, 255, 255)), (24, 116, PW - 24, 146))
    paste_fit(pn, text_layer(yr, 'ariblk.ttf', (255, 255, 255), stroke=6, stroke_fill=(200, 22, 40)), (14, 158, PW - 14, 214))
    paste_fit(pn, text_layer('CAMPIONI', 'arialbd.ttf', (250, 210, 60)), (20, 226, PW - 20, 246))
    paste_fit(pn, text_layer("D'ITALIA", 'arialbd.ttf', (250, 210, 60)), (28, 250, PW - 28, 268))
    atlas.alpha_composite(pn, (i * PW, 0))
save(atlas, 'pennants.png')

# ================================================================== 5. STRISCIONI
print('striscioni')
um = Image.new('RGBA', (2048, 256), (24, 30, 92, 255))
ud = ImageDraw.Draw(um)
ud.rectangle([0, 0, 2047, 255], outline=(200, 22, 40), width=14)
ud.rectangle([16, 16, 2031, 239], outline=(255, 255, 255), width=4)
paste_fit(um, text_layer('UMBERTO PRESIDENTE PER SEMPRE', 'impact.ttf', (255, 255, 255), spacing=14), (80, 40, 1968, 216))
save(banner_finish(um), 'umberto.jpg', quality=86)

cv = Image.new('RGBA', (2048, 256), (255, 255, 255, 255))
cvd = ImageDraw.Draw(cv)
for y0 in range(0, 256, 32):
    cvd.rectangle([0, y0, 2048, y0 + 16], fill=(200, 22, 40))
cvd.rectangle([120, 40, 1928, 216], fill=(255, 255, 255))
paste_fit(cv, text_layer('QUANTA • LA CURVA CHE CANTA!', 'impact.ttf', (200, 22, 40), spacing=10), (160, 50, 1888, 206))
paste_fit(cv, LOGO, (1930, 30, 2040, 226))
paste_fit(cv, LOGO, (8, 30, 118, 226))
save(banner_finish(cv), 'curva.jpg', quality=86)

for nm in ['lauretana', 'joma', 'hoax', 'quanta']:
    save(banner_finish(panel(nm, 1024, 256)), f'banner_{nm}.jpg', quality=86)

# bandiere
it = Image.new('RGB', (512, 342))
idr = ImageDraw.Draw(it)
for i, c in enumerate([(0, 146, 70), (244, 245, 240), (206, 43, 55)]):
    idr.rectangle([i * 171, 0, (i + 1) * 171, 342], fill=c)
save(it, 'flag_italia.jpg')
fl = Image.new('RGB', (512, 342), (32, 60, 160))
fd = ImageDraw.Draw(fl)
fd.polygon([(0, 342), (512, 0), (512, 342)], fill=(200, 22, 40))
fd.line([(0, 342), (512, 0)], fill=(255, 255, 255), width=26)
flr = fl.convert('RGBA')
paste_fit(flr, LOGO, (190, 100, 322, 242))
save(flr, 'flag_hcm.jpg')

# tabellone LED a parete
sb = Image.new('RGBA', (768, 384), (18, 18, 20, 255))
sd2 = ImageDraw.Draw(sb)
sd2.rectangle([0, 0, 767, 383], outline=(60, 60, 64), width=10)
paste_fit(sb, text_layer('LOCALI', 'arialbd.ttf', (200, 200, 200)), (40, 20, 240, 60))
paste_fit(sb, text_layer('OSPITI', 'arialbd.ttf', (200, 200, 200)), (528, 20, 728, 60))
paste_fit(sb, text_layer('0', 'arialbd.ttf', (255, 60, 40)), (90, 70, 190, 190))
paste_fit(sb, text_layer('1', 'arialbd.ttf', (80, 240, 90)), (334, 70, 434, 190))
paste_fit(sb, text_layer('0', 'arialbd.ttf', (255, 60, 40)), (578, 70, 678, 190))
paste_fit(sb, text_layer('20:00', 'arialbd.ttf', (255, 190, 30)), (200, 220, 568, 350))
save(sb, 'scoreboard.jpg')
print('fatto')
