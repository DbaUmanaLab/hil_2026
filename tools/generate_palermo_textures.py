"""Genera le texture della pista all'aperto del Centro Sportivo Dopolavoro Ferroviario "I Ciclopi" (Phoenix Hockey
Palermo) in assets/textures/palermo/.
Uso (dalla cartella del progetto): python tools/generate_palermo_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/palermo.jpg: pista all'aperto in resina chiara rosata, balaustre basse bianche col piede
giallo (in parte con i pannelli di rete grigia), il padiglione vetrato del bar con gli infissi bianchi, la pensilina
verde scuro, il muro in blocchetti e i condomini alti bianchi e color crema con i balconi.
Nei cartelloni solo club, città e territorio: niente marchi commerciali.
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'palermo')
os.makedirs(OUT, exist_ok=True)
random.seed(90100)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'palermo.png')).convert('RGBA')
# il logo ha lo sfondo bianco: lo rendo trasparente (bianco puro e quasi bianco)
_a = np.asarray(LOGO).astype(np.float32)
_white = np.clip((_a[..., :3].min(axis=2) - 232) / 20, 0, 1)
_a[..., 3] *= 1 - _white
LOGO = Image.fromarray(_a.astype(np.uint8))
LOGO = LOGO.crop(LOGO.getbbox())
PINK, BLACK, WHITE, YEL = (232, 108, 166), (22, 22, 24), (255, 255, 255), (232, 192, 44)
ROSE, SKY = (246, 196, 220), (52, 120, 196)


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


# ================================================================== 1. PISTA: resina chiara rosata, righe rosse e blu
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
n1 = resized_noise(512, 256, 2.0, H, W)
n2 = resized_noise(128, 64, 2.6, H, W)
n3 = resized_noise(64, 32, 1.6, H, W)                        # chiazze larghe (sole, usura)
col = np.zeros((H, W, 3), np.float32) + np.array([218, 188, 194], np.float32)
col += ((n1 - 0.5) * 8)[..., None]
col += ((n2 - 0.5) * 6)[..., None]
col += ((n3 - 0.5) * 12)[..., None] * np.array([1.0, 0.9, 0.9])

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'blue')}
draws = {k: ImageDraw.Draw(m) for k, m in masks.items()}
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)
px = lambda m: max(1, int(m * S * SS))


def rect(k, x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    draws[k].rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def ring(k, x, z, r, wdt):
    c = P(x, z); R = r * S * SS
    draws[k].arc([c[0] - R, c[1] - R, c[0] + R, c[1] + R], 0, 360, fill=255, width=px(wdt))


rect('red', -RW / 2, -0.15, RW / 2, 0.15)                 # riga centrale
ring('blue', 0, 0, 4.5, 0.07)
rect('blue', -0.25, -0.25, 0.25, 0.25)
for s in (-1, 1):
    rect('red', -RW / 2 + 1.4, s * 31 - 0.05, RW / 2 - 1.4, s * 31 + 0.05)   # linea di porta
    rect('blue', -1.6, s * 31, 1.6, s * 29.4)                                 # area di porta
    for x in (-8.5, 8.5):
        ring('red', x, s * 21, 4.5, 0.07)
        rect('red', x - 0.28, s * 21 - 0.28, x + 0.28, s * 21 + 0.28)
        rect('red', x - 0.22, s * 8 - 0.22, x + 0.22, s * 8 + 0.22)
cols = {'red': (206, 52, 60), 'blue': (60, 108, 178)}
wear = (0.7 + 0.3 * n2)[..., None]                       # vernice consumata dalle ruote
for k, a in (('blue', 0.85), ('red', 0.88)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.1)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a * wear) + np.array(cols[k], np.float32) * m * a * wear
img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1800):                                     # segni delle ruote
    cx, cy = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(30, 200); a0 = random.uniform(0, 360)
    sd.arc([cx - ln, cy - ln, cx + ln, cy + ln], a0, a0 + random.uniform(10, 50), fill=(80, 60, 66, random.randint(8, 18)), width=random.randint(1, 3))
for _ in range(50):                                       # aloni più scuri (polvere, pioggia)
    cx, cy, r = random.uniform(0, W), random.uniform(0, H), random.uniform(20, 70)
    sd.ellipse([cx - r, cy - r * 0.7, cx + r, cy + r * 0.7], fill=(120, 104, 104, random.randint(8, 20)))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.2)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.25 + n2 * 0.2, 0.7), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE bianche col piede giallo
print('balaustre')


def board_strip(panels, w=4096, h=256, mesh_from=None):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([240, 240, 238], np.float32)
    arr += ((n - 0.5) * 8)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    if mesh_from is not None:                             # tratto con i pannelli di rete grigia (lato bar nella foto)
        x0 = int(mesh_from * pxm)
        d.rectangle([x0, 8, w, h - 36], fill=(118, 124, 138, 255))
        for k in range(x0, w, 7):
            d.line([(k, 8), (k + 20, h - 36)], fill=(150, 156, 170, 255), width=1)
            d.line([(k + 20, 8), (k, h - 36)], fill=(96, 100, 112, 255), width=1)
        for xm in np.arange(mesh_from, 18.5, 3.0):        # montanti in tubo
            xx = int(xm * pxm)
            d.rectangle([xx - 5, 0, xx + 5, h], fill=(170, 172, 176, 255))
    for xm in np.arange(0, 18.5, 2.0):                    # giunti tra i pannelli
        x = int(xm * pxm)
        d.rectangle([x - 2, 0, x + 2, h], fill=(212, 212, 210, 255))
    d.rectangle([0, h - 34, w, h], fill=YEL + (255,))
    d.rectangle([0, 0, w, 6], fill=(200, 200, 200, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 20, int((xm + wm) * pxm), h - 46)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(300):                                  # segni delle palline e dei dischi
        x, y = random.uniform(0, w), random.uniform(h * 0.4, h - 36)
        r = random.uniform(3, 9)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 44, random.randint(20, 60)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def logo_panel(img, x0, y0, x1, y1):
    paste_fit(img, LOGO, (x0 + 6, y0 + 4, x1 - 6, y1 - 4))


def club_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=BLACK + (255,))
    d.rectangle([x0, y1 - 16, x1, y1], fill=PINK + (255,))
    h = y1 - y0
    d.ellipse([x0 + 8, y0 + 2, x0 + 12 + int(h * 0.95), y1 - 18], fill=WHITE + (255,))   # la scritta del logo è nera
    paste_fit(img, LOGO, (x0 + 16, y0 + 8, x0 + 4 + int(h * 0.95), y1 - 24))
    paste_fit(img, text_layer('PHOENIX', 'georgiab.ttf', WHITE, spacing=6), (x0 + int(h * 1.05) + 16, y0 + 12, x1 - 20, y0 + h * 0.6), 'left')
    paste_fit(img, text_layer('HOCKEY PALERMO', 'arialbd.ttf', PINK, spacing=4), (x0 + int(h * 1.05) + 16, y0 + h * 0.62, x1 - 20, y1 - 22), 'left')


def text_panel(txt, fontfile, fg, bg, sub=None, subcol=None):
    def fn(img, x0, y0, x1, y1):
        d = ImageDraw.Draw(img)
        d.rectangle([x0, y0, x1, y1], fill=bg + (255,))
        h = y1 - y0
        paste_fit(img, text_layer(txt, fontfile, fg, spacing=4), (x0 + 24, y0 + 10, x1 - 24, y0 + h * (0.6 if sub else 0.9)))
        if sub:
            paste_fit(img, text_layer(sub, 'arialbd.ttf', subcol or fg, spacing=4), (x0 + 40, y0 + h * 0.66, x1 - 40, y1 - 10))
    return fn


def trinacria_panel(img, x0, y0, x1, y1):
    """colori della Sicilia (giallo e rosso in diagonale) con la scritta PALERMO"""
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(236, 186, 40, 255))
    d.polygon([(x0, y1), (x1, y0), (x1, y1)], fill=(196, 40, 44, 255))
    paste_fit(img, text_layer('PALERMO', 'ariblk.ttf', WHITE, stroke=8, stroke_fill=(40, 20, 20), spacing=6), (x0 + 30, y0 + 14, x1 - 30, y1 - 14))


DLF = text_panel('DLF "I CICLOPI"', 'ariblk.ttf', SKY, WHITE, 'CENTRO SPORTIVO DOPOLAVORO FERROVIARIO', (90, 92, 96))
PINKP = text_panel('PHOENIX', 'georgiab.ttf', WHITE, PINK, 'DAL 1997', BLACK)
INLINE = text_panel('HOCKEY IN LINE', 'ariblk.ttf', BLACK, ROSE, 'SERIE B • FISR', (120, 40, 80))
SICILIA = text_panel('SICILIA', 'georgiab.ttf', (196, 40, 44), WHITE, 'TERRA DI SPORT', (120, 120, 124))
save(board_strip([(0.4, 3.0, club_panel), (4.0, 2.6, PINKP), (7.2, 3.4, DLF), (11.2, 2.4, logo_panel), (14.2, 3.4, trinacria_panel)]), 'boards_a.jpg')
save(board_strip([(0.5, 3.4, INLINE), (4.4, 3.0, club_panel)], mesh_from=8.2), 'boards_b.jpg')
save(board_strip([(0.4, 3.4, DLF), (4.4, 2.4, logo_panel), (7.6, 3.4, club_panel), (11.6, 3.0, SICILIA), (15.2, 2.6, PINKP)]), 'boards_center.jpg')
save(board_strip([], 1024, 256), 'boards_corner.jpg')

# ================================================================== 3. FACCIATE dei condomini (balconi con le ringhiere)
print('facciate')


def flats(w, h, base, floors, cols, seed, shutter=(150, 140, 126), railing=(70, 72, 74), awnings=True, glass_balcony=False):
    rr = random.Random(seed)
    arr = np.zeros((h, w, 3), np.float32) + np.array(base, np.float32)
    arr += ((fft_noise(h, w, beta=2.2) - 0.5) * 10)[..., None]
    ys = np.linspace(0, 1, h)[:, None, None]
    arr *= 1 - 0.08 * ys                                   # in basso più sporco
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    rh, cw = h / floors, w / cols
    # mappa delle luci di sera (emissiva): finestre accese sotto la tapparella, nero altrove; stesso disegno
    # della facciata, con un generatore a parte così la facciata resta identica
    lit = Image.new('RGB', (w, h), (0, 0, 0))
    ld = ImageDraw.Draw(lit)
    lr = random.Random(seed + 500)
    for r in range(floors):
        y0 = r * rh
        d.rectangle([0, y0 + rh - 6, w, y0 + rh], fill=tuple(int(v * 0.9) for v in base) + (255,))   # marcapiano
        for c in range(cols):
            x0 = c * cw
            wx0, wx1 = x0 + cw * 0.22, x0 + cw * 0.78
            wy0, wy1 = y0 + rh * 0.14, y0 + rh * 0.84
            open_ = rr.random()
            d.rectangle([wx0, wy0, wx1, wy1], fill=(40, 44, 50, 255))                       # vano porta-finestra
            sh = int((wy1 - wy0) * (0.2 + 0.8 * open_))
            d.rectangle([wx0, wy0, wx1, wy0 + sh], fill=shutter + (255,))                  # tapparella
            for k in range(wy0.__int__(), int(wy0 + sh), 5):
                d.line([(wx0, k), (wx1, k)], fill=tuple(max(0, v - 16) for v in shutter) + (255,), width=1)
            on = lr.random()
            if on < 0.5:                                    # metà delle case accese: luce calda o luce fredda della TV
                warm = lr.choice([(255, 196, 120), (255, 214, 150), (255, 180, 100), (190, 210, 255)])
                k_ = lr.uniform(0.7, 1.0)
                ld.rectangle([wx0, wy0 + sh, wx1, wy1], fill=tuple(int(v * k_) for v in warm))
                for k in range(int(wy0) + 2, int(wy0 + sh), 5):            # filo di luce fra le stecche
                    ld.line([(wx0, k), (wx1, k)], fill=tuple(int(v * k_ * 0.35) for v in warm), width=1)
            if r < floors - 1 or True:
                by0 = y0 + rh * 0.6
                if glass_balcony and rr.random() < 0.3:                                     # veranda a vetri verdi
                    d.rectangle([x0 + cw * 0.08, wy0, x0 + cw * 0.92, y0 + rh * 0.9], fill=(96, 150, 104, 255))
                    ld.rectangle([x0 + cw * 0.08, wy0, x0 + cw * 0.92, y0 + rh * 0.9], fill=(150, 170, 110) if on < 0.5 else (0, 0, 0))
                    for k in range(4):
                        xx = x0 + cw * (0.08 + 0.84 * k / 3)
                        d.line([(xx, wy0), (xx, y0 + rh * 0.9)], fill=(230, 230, 226, 255), width=3)
                        ld.line([(xx, wy0), (xx, y0 + rh * 0.9)], fill=(0, 0, 0), width=3)
                else:
                    d.rectangle([x0 + cw * 0.08, by0, x0 + cw * 0.92, y0 + rh * 0.9], outline=railing + (255,), width=3)
                    ld.rectangle([x0 + cw * 0.08, by0, x0 + cw * 0.92, y0 + rh * 0.9], outline=(0, 0, 0), width=3)
                    for k in np.arange(x0 + cw * 0.08, x0 + cw * 0.92, 7):
                        d.line([(k, by0), (k, y0 + rh * 0.9)], fill=railing + (255,), width=1)
                        ld.line([(k, by0), (k, y0 + rh * 0.9)], fill=(0, 0, 0), width=1)
                d.rectangle([x0 + cw * 0.04, y0 + rh * 0.9, x0 + cw * 0.96, y0 + rh * 0.97], fill=tuple(min(255, v + 10) for v in base) + (255,))
                if awnings and rr.random() < 0.25:                                           # tende da sole
                    d.polygon([(wx0 - 8, wy0 - 4), (wx1 + 8, wy0 - 4), (wx1 + 18, wy0 + rh * 0.22), (wx0 - 18, wy0 + rh * 0.22)],
                              fill=rr.choice([(214, 168, 60, 255), (60, 110, 80, 255), (190, 80, 60, 255), (220, 220, 214, 255)]))
                    ld.polygon([(wx0 - 8, wy0 - 4), (wx1 + 8, wy0 - 4), (wx1 + 18, wy0 + rh * 0.22), (wx0 - 18, wy0 + rh * 0.22)], fill=(0, 0, 0))
                if rr.random() < 0.12:                                                       # condizionatore
                    d.rectangle([x0 + cw * 0.8, by0 - 30, x0 + cw * 0.95, by0 - 4], fill=(228, 228, 224, 255))
                    ld.rectangle([x0 + cw * 0.8, by0 - 30, x0 + cw * 0.95, by0 - 4], fill=(0, 0, 0))
    return img.convert('RGB'), lit.filter(ImageFilter.GaussianBlur(0.6))


for name, args, kw in (('flats_white', ((236, 234, 228), 4, 4, 1), {}),
                       ('flats_cream', ((230, 214, 186), 4, 4, 2), {'glass_balcony': True}),
                       ('flats_ochre', ((214, 138, 92), 4, 4, 3), {'shutter': (120, 92, 70)})):
    fac, lit = flats(512, 512, *args, **kw)
    save(fac, name + '.jpg')
    save(lit, name + '_lights.jpg')             # di sera: finestre accese (mappa emissiva)

# muro in blocchetti di cemento dietro la pensilina
bw = np.zeros((256, 512, 3), np.float32) + np.array([156, 146, 128], np.float32)
bw += ((fft_noise(256, 512, beta=1.6) - 0.5) * 18)[..., None]
img = to_img(bw)
d = ImageDraw.Draw(img)
for r in range(0, 256, 32):
    d.line([(0, r), (512, r)], fill=(110, 104, 92), width=3)
    off = 0 if (r // 32) % 2 == 0 else 64
    for c in range(off, 512 + 128, 128):
        d.line([(c, r), (c, r + 32)], fill=(110, 104, 92), width=3)
save(img, 'blocks.jpg')
# siepe (alloro/pitosforo) davanti al muro
hd = np.zeros((128, 256, 3), np.float32) + np.array([58, 84, 50], np.float32)
hd += ((fft_noise(128, 256, beta=0.9) - 0.5) * 50)[..., None] * np.array([0.8, 1.0, 0.7])
save(to_img(hd), 'hedge.jpg')
print('fatto')
