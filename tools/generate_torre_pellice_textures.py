"""Genera le texture della pista del Filatoio (Old Style Torre Pellice) in assets/textures/torre_pellice/.
Uso (dalla cartella del progetto): python tools/generate_torre_pellice_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/torre_pellice.png e le foto del palazzetto: pavimento a piastrelle modulari
grigio chiaro con le righe rosse, il logo del club al centro e le aree di porta azzurre, balaustre
bianche con il bordo giallo e i pannelli degli sponsor, pareti in pannelli OSB, teloni bianchi con le
cinghie nere a X dietro le porte, travi in legno lamellare.
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'torre_pellice')
os.makedirs(OUT, exist_ok=True)
random.seed(77)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'torre_pellice.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
SERIEB = Image.open(os.path.join(ROOT, 'assets', 'logos', 'serie_b.png')).convert('RGBA')
SERIEB = SERIEB.crop(SERIEB.getbbox())
RED, BLACK, WHITE = (204, 34, 38), (22, 22, 22), (255, 255, 255)
YEL = (236, 192, 28)
GREEN = (28, 110, 52)
NAVY = (24, 48, 110)


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


# ================================================================== 1. PISTA: piastrelle modulari grigio chiaro
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
TILE = 0.305                                               # piastrelle da 30 cm
n1 = resized_noise(512, 256, 2.0, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([214, 216, 216], np.float32)
col += ((n1 - 0.5) * 10)[..., None]
# leggera variazione di tono piastrella per piastrella
xs = (np.arange(W) / S / TILE).astype(int)
zs = (np.arange(H) / S / TILE).astype(int)
rs = np.random.default_rng(5)
tv = rs.normal(0, 3.2, (zs.max() + 1, xs.max() + 1))
col += tv[zs][:, xs][..., None]
# fughe tra le piastrelle
gx = ((np.arange(W) / S) % TILE) < (1.6 / S)
gz = ((np.arange(H) / S) % TILE) < (1.6 / S)
groove = gz[:, None] | gx[None, :]
col[groove] *= 0.9
# traforatura fine delle piastrelle (puntini)
dots = (((np.arange(W) / S) % 0.05) < 0.012)[None, :] & (((np.arange(H) / S) % 0.05) < 0.012)[:, None]
col[dots] *= 0.95

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'blue')}
draws = {k: ImageDraw.Draw(m) for k, m in masks.items()}
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)


def rect(k, x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    draws[k].rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def ring(k, x, z, r, wdt):
    c = P(x, z); R = r * S * SS
    draws[k].ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], outline=255, width=max(1, int(wdt * S * SS)))


# riga centrale rossa larga, cerchio centrale sottile, linee di porta, cerchi d'ingaggio con i quadratini
rect('red', -RW / 2, -0.15, RW / 2, 0.15)
ring('red', 0, 0, 4.5, 0.06)
for sgn in (-1, 1):
    rect('red', -RW / 2 + 1.4, sgn * 31 - 0.04, RW / 2 - 1.4, sgn * 31 + 0.04)
    za, zb = sorted((sgn * 31, sgn * 29.4))
    rect('blue', -1.5, za, 1.5, zb)                         # area di porta azzurra
    for x in (-8.5, 8.5):
        ring('red', x, sgn * 21, 4.5, 0.06)
        rect('red', x - 0.18, sgn * 21 - 0.18, x + 0.18, sgn * 21 + 0.18)
        rect('red', x - 0.16, sgn * 8 - 0.16, x + 0.16, sgn * 8 + 0.16)

cols = {'red': (198, 40, 44), 'blue': (52, 128, 196)}
for k, a in (('blue', 0.95), ('red', 0.92)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(cols[k], np.float32) * m * a

img = to_img(col).convert('RGBA')
# logo del club dipinto al centro (diametro ~3,2 m) su un disco bianco
D = int(3.4 * S)
disc = Image.new('RGBA', (D, D), (0, 0, 0, 0))
ImageDraw.Draw(disc).ellipse([0, 0, D - 1, D - 1], fill=(236, 236, 232, 235))
paste_fit(disc, LOGO, (int(D * 0.08), int(D * 0.08), int(D * 0.92), int(D * 0.92)))
img.alpha_composite(disc, (W // 2 - D // 2, H // 2 - D // 2))
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1500):                                     # segni delle ruote
    px, py = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(20, 160); a0 = random.uniform(0, 180)
    sd.arc([px - ln, py - ln, px + ln, py + ln], a0, a0 + random.uniform(10, 50), fill=(40, 40, 44, random.randint(6, 16)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.2 + (~groove) * 0.5 + dots * -0.08, 1.4), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE bianche con il bordo giallo
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([232, 232, 228], np.float32)
    arr += ((n - 0.5) * 10)[..., None]
    arr[int(h * 0.80):] *= 0.93                                   # battiscopa un po' più scuro
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.rectangle([x - 2, 0, x + 2, h], fill=(200, 200, 196, 255))
    d.rectangle([0, 0, w, 24], fill=YEL + (255,))                 # bordo superiore giallo
    d.rectangle([0, 24, w, 27], fill=(170, 140, 30, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 40, int((xm + wm) * pxm), int(h * 0.78))
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(320):                                          # segni di dischi e pattini
        x, y = random.uniform(0, w), random.uniform(h * 0.45, h - 4)
        r = random.uniform(3, 8)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 50, random.randint(14, 50)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def panel_box(img, x0, y0, x1, y1, bg, border=None):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=bg + (255,), outline=(border or bg) + (255,), width=4)
    return d


def two_line(top, tf, tc, bottom, bf, bc, bg=WHITE, split=0.6, border=None):
    def f(img, x0, y0, x1, y1):
        panel_box(img, x0, y0, x1, y1, bg, border)
        h = y1 - y0
        paste_fit(img, text_layer(top, tf, tc, spacing=4), (x0 + 24, y0 + 10, x1 - 24, y0 + h * split))
        if bottom:
            paste_fit(img, text_layer(bottom, bf, bc, spacing=4), (x0 + 40, y0 + h * split + 8, x1 - 40, y1 - 10))
    return f


def club_panel(img, x0, y0, x1, y1):
    panel_box(img, x0, y0, x1, y1, BLACK)
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 10, y0 + 6, x0 + 10 + int(h * 1.0), y1 - 6))
    paste_fit(img, text_layer('OLD STYLE', 'ariblk.ttf', YEL, spacing=6), (x0 + int(h * 1.1) + 16, y0 + 14, x1 - 20, y0 + h * 0.6), 'left')
    paste_fit(img, text_layer('TORRE PELLICE', 'arialbd.ttf', WHITE, spacing=6), (x0 + int(h * 1.1) + 16, y0 + h * 0.64, x1 - 20, y1 - 14), 'left')


def serieb_panel(img, x0, y0, x1, y1):
    panel_box(img, x0, y0, x1, y1, WHITE, NAVY)
    paste_fit(img, SERIEB, (x0 + 20, y0 + 8, x1 - 20, y1 - 8))


def accendiamo(img, x0, y0, x1, y1):
    pw, ph = x1 - x0, y1 - y0
    tile = Image.new('RGBA', (pw, ph), YEL + (255,))
    td_ = ImageDraw.Draw(tile)
    for x in range(-ph, pw, 28):                                    # righe diagonali del pannello giallo
        td_.line([x, ph, x + ph, 0], fill=(222, 172, 18, 255), width=8)
    img.alpha_composite(tile, (x0, y0))
    d = ImageDraw.Draw(img)
    h = y1 - y0
    paste_fit(img, text_layer('ACCENDIAMO', 'arialbd.ttf', BLACK, spacing=4), (x0 + 20, y0 + 10, x0 + (x1 - x0) * 0.6, y0 + h * 0.45))
    paste_fit(img, text_layer('LE TUE IDEE', 'ariblk.ttf', BLACK, spacing=4), (x0 + 20, y0 + h * 0.5, x0 + (x1 - x0) * 0.6, y1 - 10))
    c = (x0 + (x1 - x0) * 0.8, (y0 + y1) / 2); r = h * 0.38
    d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], fill=BLACK + (255,))
    d.polygon([(c[0], c[1] - r * 0.7), (c[0] + r * 0.35, c[1] + r * 0.4), (c[0] - r * 0.35, c[1] + r * 0.4)], fill=(240, 140, 30, 255))


PANELS_A = [
    (0.4, 3.4, two_line('LA CASA CHE VOGLIO', 'arialbd.ttf', (40, 40, 40), '', None, None)),
    (4.3, 4.4, two_line('Gioielli Rollé Sandro', 'georgiai.ttf', (60, 60, 60), 'TORRE PELLICE', 'arialbd.ttf', (60, 60, 60), bg=(238, 230, 170), split=0.62)),
    (9.2, 3.2, two_line('mediolanum', 'arialbd.ttf', NAVY, 'PRIVATE BANKING', 'arial.ttf', NAVY)),
    (12.9, 2.8, club_panel),
    (16.0, 2.2, two_line('AXA', 'ariblk.ttf', WHITE, '', None, None, bg=(0, 0, 143))),
]
PANELS_B = [
    (0.4, 4.0, two_line('PUNTO AUTO', 'ariblk.ttf', BLACK, 'RICAMBI • PINEROLO', 'arialbd.ttf', RED)),
    (4.9, 4.4, two_line('MAXISCONTO', 'ariblk.ttf', RED, 'SUPERMERCATI', 'arialbd.ttf', NAVY, border=NAVY)),
    (9.8, 4.4, accendiamo),
    (14.7, 3.4, two_line('NAIS', 'ariblk.ttf', NAVY, '', None, None)),
]
PANELS_C = [
    (0.3, 3.6, two_line('SolGlass', 'arialbd.ttf', (30, 70, 140), 'VETRERIA', 'arial.ttf', (30, 30, 30))),
    (4.3, 2.8, two_line('ACQUA GRANO', 'ariblk.ttf', (30, 30, 30), 'TORRE PELLICE', 'arial.ttf', (30, 30, 30), bg=(240, 200, 60))),
    (7.5, 3.6, two_line('DAVIDE SERRA', 'arialbd.ttf', (30, 30, 30), 'PINEROLO (TO)', 'arial.ttf', (30, 30, 30))),
    (11.5, 3.4, two_line('Il Filatoio', 'georgiai.ttf', (120, 30, 30), '', None, None)),
    (15.3, 2.9, serieb_panel),
]
save(board_strip(panels=PANELS_A), 'boards_a.jpg')
save(board_strip(panels=PANELS_B), 'boards_b.jpg')
save(board_strip(panels=PANELS_C), 'boards_center.jpg')
save(board_strip(1024, 256, panels=[(2.0, 12.0, two_line('PIZZERIA Ca\'Piana', 'arialbd.ttf', (30, 30, 30), '', None, None))]), 'boards_corner.jpg')

# ================================================================== 3. PARETI, TELONI, SOFFITTO
print('pareti e teloni')
# pannelli OSB: scaglie di legno pressate
Wo, Ho = 512, 512
osb = np.zeros((Ho, Wo, 3), np.float32) + np.array([196, 160, 112], np.float32)
osb += ((fft_noise(Ho, Wo, beta=1.6) - 0.5) * 30)[..., None]
oi = to_img(osb).convert('RGBA')
od = ImageDraw.Draw(oi)
for _ in range(2600):
    x, y = random.uniform(0, Wo), random.uniform(0, Ho)
    l, t = random.uniform(8, 30), random.uniform(3, 8)
    shade = random.choice([(150, 110, 66), (222, 190, 140), (176, 136, 86), (205, 170, 120)])
    od.ellipse([x - l, y - t, x + l, y + t], fill=shade + (random.randint(60, 140),))
oi = oi.filter(ImageFilter.GaussianBlur(0.6))
od = ImageDraw.Draw(oi)
od.rectangle([0, 0, Wo, 3], fill=(120, 92, 60, 255)); od.rectangle([0, 0, 3, Ho], fill=(120, 92, 60, 255))   # fuga tra i pannelli
save(oi.convert('RGB'), 'osb.jpg')

# telone bianco con le cinghie nere a X (un modulo largo 3 m, alto 4 m)
Wt, Ht = 384, 512
tarp = np.zeros((Ht, Wt, 3), np.float32) + np.array([226, 222, 210], np.float32)
tarp += ((fft_noise(Ht, Wt, beta=2.2, sx=0.4) - 0.5) * 22)[..., None]
ti = to_img(tarp).convert('RGBA')
td = ImageDraw.Draw(ti)
for x in range(0, Wt, 24):                                         # pieghe verticali
    td.line([x, 0, x + random.randint(-6, 6), Ht], fill=(180, 176, 166, 70), width=3)
for y in (Ht // 3, 2 * Ht // 3):                                   # cuciture orizzontali
    td.line([0, y, Wt, y], fill=(190, 186, 176, 140), width=2)
td.line([0, 0, Wt, Ht], fill=(40, 40, 40, 255), width=9)
td.line([Wt, 0, 0, Ht], fill=(40, 40, 40, 255), width=9)
td.rectangle([0, 0, 5, Ht], fill=(70, 70, 70, 255)); td.rectangle([Wt - 6, 0, Wt, Ht], fill=(70, 70, 70, 255))
save(ti.convert('RGB'), 'tarp.jpg')

# soffitto: pannelli bianchi con le giunte
Wc, Hc = 256, 256
ce = np.zeros((Hc, Wc, 3), np.float32) + np.array([232, 232, 228], np.float32)
ce += ((fft_noise(Hc, Wc, beta=2.4) - 0.5) * 8)[..., None]
ci = to_img(ce)
cd = ImageDraw.Draw(ci)
for x in range(0, Wc, 64):
    cd.line([x, 0, x, Hc], fill=(200, 200, 196), width=2)
save(ci, 'ceiling.jpg')

# legno lamellare delle travi (venatura lungo u)
Wl, Hl = 512, 128
lam = np.zeros((Hl, Wl, 3), np.float32) + np.array([150, 82, 48], np.float32)
lam += ((fft_noise(Hl, Wl, beta=2.0, sx=6.0) - 0.5) * 34)[..., None]
li = to_img(lam)
ld = ImageDraw.Draw(li)
for y in range(0, Hl, 16):                                         # lamelle incollate
    ld.line([0, y, Wl, y], fill=(118, 62, 36), width=1)
save(li, 'glulam.jpg')

# ================================================================== 4. STRISCIONI (solo nomi leggibili nelle foto)
print('striscioni')


def mk(name, w, h, bg, draw):
    b = Image.new('RGBA', (w, h), bg + (255,))
    draw(b, ImageDraw.Draw(b), w, h)
    save(banner_finish(b), name, quality=86)


def blancio(b, d, w, h):
    paste_fit(b, text_layer('blancio', 'arialbd.ttf', (70, 74, 70), spacing=4), (60, 80, w - 60, 300))
    for i, c in enumerate([(230, 60, 40), (240, 160, 30), (130, 180, 40), (40, 150, 200)]):
        x = w * 0.62 + i * 46
        d.ellipse([x, 40, x + 34, 74], fill=c)
    paste_fit(b, text_layer('pub pizza grill', 'arialbd.ttf', (196, 150, 30), spacing=4), (180, 320, w - 180, 400))


mk('banner_blancio.jpg', 1024, 448, (236, 234, 226), blancio)


def nova_siria(b, d, w, h):
    paste_fit(b, text_layer('Nova Siria', 'arialbd.ttf', WHITE, spacing=6), (120, 80, w - 120, 300))


mk('banner_novasiria.jpg', 1024, 384, (40, 40, 42), nova_siria)


def valmora(b, d, w, h):
    paste_fit(b, text_layer('VALMORA', 'arialbd.ttf', (40, 40, 40), spacing=10), (80, 60, w - 80, 250))
    paste_fit(b, text_layer('ACQUA MINERALE', 'arial.ttf', (60, 60, 60), spacing=8), (260, 270, w - 260, 330))


mk('banner_valmora.jpg', 1024, 384, (246, 246, 244), valmora)


def giordan(b, d, w, h):
    paste_fit(b, text_layer('GIORDAN', 'ariblk.ttf', (30, 50, 120), spacing=8), (60, 50, w - 60, 250))
    paste_fit(b, text_layer('PINEROLO', 'arialbd.ttf', (30, 30, 30), spacing=8), (300, 270, w - 300, 330))


mk('banner_giordan.jpg', 1024, 384, (250, 250, 250), giordan)


def canton(b, d, w, h):
    paste_fit(b, text_layer('Canton del vin bon', 'georgiai.ttf', (90, 40, 30), spacing=2), (60, 90, w - 60, 290))


mk('banner_canton.jpg', 1024, 384, (236, 224, 196), canton)


def oldstyle(b, d, w, h):
    d.rectangle([0, h - 50, w, h], fill=YEL)
    paste_fit(b, LOGO, (30, 20, 400, h - 60))
    paste_fit(b, text_layer('OLD STYLE', 'ariblk.ttf', YEL, spacing=8), (430, 90, w - 40, 250), 'left')
    paste_fit(b, text_layer('TORRE PELLICE', 'arialbd.ttf', WHITE, spacing=10), (430, 280, w - 40, 350), 'left')


mk('banner_oldstyle.jpg', 1024, 448, BLACK, oldstyle)
print('fatto')
