"""Genera le texture del Polideportivo Municipal Laura Oter (Kamikazes Tres Cantos) in assets/textures/tres_cantos/.
Uso (dalla cartella del progetto): python tools/generate_tres_cantos_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/tres_cantos.png e le foto del palazzetto: pavimento azzurro con la riga centrale,
le linee di porta e le aree squadrate rosse e i cerchi sottili blu scuro, balaustre bianche coi cartelloni
e lo zoccolo giallo, pareti in lamiera grecata bianca con tre fasce di vetri colorati (rosa, magenta, giallo,
azzurro) sulla testata, copertura piana su reticolare spaziale bianco con i lucernari, e il grande murale della
parete lunga (colonne colorate, sagome di atleti, stemma di Tres Cantos). Nei cartelloni solo club, città e
territorio: niente marchi commerciali.
"""
import sys, os, random, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'tres_cantos')
os.makedirs(OUT, exist_ok=True)
random.seed(2024)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'tres_cantos.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
RED, BLACK, WHITE = (215, 25, 32), (18, 18, 20), (255, 255, 255)
YEL = (242, 186, 30)
NAVY = (28, 52, 104)
MADRID = (196, 18, 48)          # rosso della Comunidad de Madrid


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


# ================================================================== 1. PISTA azzurra, segni rossi e cerchi blu scuro
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
TILE = 0.25
n1 = resized_noise(512, 256, 2.0, H, W)
n2 = resized_noise(1024, 512, 1.4, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([140, 196, 222], np.float32)
col += ((n1 - 0.5) * 9)[..., None]
col += ((n2 - 0.5) * 5)[..., None]
xs = (np.arange(W) / S / TILE).astype(int)
zs = (np.arange(H) / S / TILE).astype(int)
tv = np.random.default_rng(5).normal(0, 1.8, (zs.max() + 1, xs.max() + 1))
col += tv[zs][:, xs][..., None]
gx = ((np.arange(W) / S) % TILE) < (1.2 / S)
gz = ((np.arange(H) / S) % TILE) < (1.2 / S)
groove = gz[:, None] | gx[None, :]
col[groove] *= 0.94

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'navy')}
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
    draws[k].arc([c[0] - R, c[1] - R, c[0] + R, c[1] + R], 0, 360, fill=255, width=px(wdt))


rect('red', -RW / 2, -0.15, RW / 2, 0.15)                 # riga centrale rossa
ring('navy', 0, 0, 4.5, 0.05)
rect('red', -0.22, -0.22, 0.22, 0.22)
for s in (-1, 1):
    rect('red', -RW / 2 + 1.4, s * 31 - 0.05, RW / 2 - 1.4, s * 31 + 0.05)          # linea di porta
    # area di porta squadrata e più larga, come nelle foto (la "Γ" rossa vicino alla porta)
    line('red', [(-2.2, s * 31), (-2.2, s * 28.6), (2.2, s * 28.6), (2.2, s * 31)], 0.1)
    for x in (-8.5, 8.5):
        ring('navy', x, s * 21, 4.5, 0.05)
        rect('red', x - 0.3, s * 21 - 0.15, x + 0.3, s * 21 + 0.15)
        rect('red', x - 0.25, s * 8 - 0.12, x + 0.25, s * 8 + 0.12)
cols = {'navy': (34, 58, 112), 'red': (214, 44, 46)}
for k, a in (('navy', 0.8), ('red', 0.93)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(cols[k], np.float32) * m * a

img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1300):                                      # segni delle ruote
    cx, cy = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(30, 200); a0 = random.uniform(0, 360)
    sd.arc([cx - ln, cy - ln, cx + ln, cy + ln], a0, a0 + random.uniform(10, 50), fill=(40, 60, 80, random.randint(8, 18)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img, 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.2 + (~groove) * 0.3, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE bianche, zoccolo giallo
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([243, 243, 240], np.float32)
    arr += ((n - 0.5) * 7)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.rectangle([x - 2, 0, x + 2, h], fill=(214, 214, 210, 255))
    d.rectangle([0, h - 34, w, h], fill=YEL + (255,))                # zoccolo giallo
    d.rectangle([0, 0, w, 6], fill=(206, 206, 202, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 22, int((xm + wm) * pxm), h - 50)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(260):                                   # segni dei dischi
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
    d.rectangle([x0, y1 - 12, x1, y1], fill=RED + (255,))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 10, y0 + 6, x0 + 10 + h, y1 - 16))
    paste_fit(img, text_layer('KAMIKAZES', 'ariblk.ttf', WHITE), (x0 + h + 30, y0 + 16, x1 - 20, y0 + h // 2 + 4), 'left')
    paste_fit(img, text_layer('HOCKEY LÍNEA • TRES CANTOS', 'arialbd.ttf', (240, 90, 96), spacing=4), (x0 + h + 30, y0 + h // 2 + 14, x1 - 20, y1 - 24), 'left')


def town_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=RED + (255,))
    paste_fit(img, text_layer('TRES CANTOS', 'ariblk.ttf', WHITE, spacing=6), (x0 + 30, y0 + 14, x1 - 30, y0 + (y1 - y0) * 2 // 3))
    paste_fit(img, text_layer('CIUDAD DEL DEPORTE', 'arial.ttf', WHITE, spacing=6), (x0 + 60, y0 + (y1 - y0) * 2 // 3, x1 - 60, y1 - 10))


def madrid_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=MADRID + (255,), width=6)
    paste_fit(img, text_layer('COMUNIDAD DE MADRID', 'arialbd.ttf', MADRID, spacing=4), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


def hall_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=NAVY + (255,))
    paste_fit(img, text_layer('POLIDEPORTIVO LAURA OTER', 'arialbd.ttf', WHITE, spacing=4), (x0 + 30, y0 + 28, x1 - 30, y1 - 28))


def liga_panel(img, x0, y0, x1, y1):
    paste_fit(img, text_layer('LIGA ÉLITE HOCKEY LÍNEA', 'impact.ttf', BLACK, spacing=6), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


save(board_strip(panels=[(1.0, 2.2, logo_panel), (4.0, 4.2, town_panel), (12.5, 4.6, liga_panel)]), 'boards_a.jpg')
save(board_strip(panels=[(1.5, 4.4, madrid_panel), (10.5, 2.2, logo_panel), (13.5, 4.2, hall_panel)]), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 5.4, club_panel), (11.0, 4.2, town_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256, panels=[(6.5, 3.6, logo_panel)]), 'boards_corner.jpg')

# ================================================================== 3. EDIFICIO
print('edificio')
# pareti in lamiera grecata bianca, nervature verticali (texture in metri: 4 m x 4 m)
W = H = 512
n = fft_noise(H, W, beta=2.2)
ww = np.zeros((H, W, 3), np.float32) + np.array([232, 233, 234], np.float32)
ww += ((n - 0.5) * 8)[..., None]
x = np.arange(W)[None, :]
ww *= (1 - 0.09 * (np.sin(x / W * np.pi * 2 * 20) > 0.55))[..., None]
ww *= (1 - 0.05 * ((np.arange(H)[:, None] % 256) < 2))[..., None]
save(to_img(ww).filter(ImageFilter.GaussianBlur(0.5)), 'wall_white.jpg')

# fascia di vetri colorati della testata (una fascia lunga 32 m, vetri da 1,6 m)
W, H = 2048, 64
PALETTE = [(244, 132, 196), (214, 84, 186), (250, 214, 96), (150, 206, 236), (246, 246, 250), (236, 96, 120), (180, 120, 220)]
gl = Image.new('RGB', (W, H), (60, 60, 64))
gd = ImageDraw.Draw(gl)
pane = W // 20
for i in range(20):
    c = random.choice(PALETTE)
    gd.rectangle([i * pane + 3, 4, (i + 1) * pane - 3, H - 5], fill=c)
save(gl.filter(ImageFilter.GaussianBlur(0.6)), 'glass_bands.jpg')

# lamiera della copertura vista dal basso (chiara) e lucernari
W = H = 512
roof = np.zeros((H, W, 3), np.float32) + np.array([206, 208, 210], np.float32)
roof += ((fft_noise(H, W, beta=2.2) - 0.5) * 10)[..., None]
u = np.arange(W)[None, :] / W
roof *= (1 - 0.16 * (np.sin(u * np.pi * 2 * 16) > 0.5))[..., None]
save(to_img(roof).filter(ImageFilter.GaussianBlur(0.6)), 'roof_deck.jpg')
W, H = 256, 512
lt = np.zeros((H, W, 3), np.float32) + np.array([240, 244, 248], np.float32)
lt += ((resized_noise(64, 32, 1.6, H, W) - 0.5) * 12)[..., None]
lt *= (1 - 0.05 * ((np.arange(W)[None, :] % 32) < 2))[..., None]
save(to_img(lt), 'skylight.jpg')

# fascia di cartelloni appesi sulle testate e sulla parete est (club, città, territorio)
W, H = 4096, 256
ads = Image.new('RGBA', (W, H), (0, 0, 0, 0))
items = [('logo', None), ('TRES CANTOS', RED), ('KAMIKAZES', BLACK), ('MADRID', MADRID),
         ('HOCKEY LÍNEA', NAVY), ('logo', None), ('LAURA OTER', NAVY), ('VAMOS KAMIKAZES', RED)]
seg = W // len(items)
ad = ImageDraw.Draw(ads)
for i, (t, c) in enumerate(items):
    x0, x1 = i * seg + 28, (i + 1) * seg - 28
    ad.rectangle([x0, 30, x1, H - 30], fill=(250, 250, 248, 255), outline=(196, 196, 192, 255), width=4)
    if t == 'logo':
        paste_fit(ads, LOGO, (x0 + 20, 36, x1 - 20, H - 36))
    else:
        paste_fit(ads, text_layer(t, 'ariblk.ttf', c, spacing=4), (x0 + 36, 72, x1 - 36, H - 72))
save(ads, 'wall_ads.png')

# ================================================================== 4. STRISCIONE DEL CLUB
print('striscioni')
b = Image.new('RGBA', (1024, 384), (255, 255, 255, 255))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 0, 1024, 22], fill=RED)
bd.rectangle([0, 362, 1024, 384], fill=RED)
bd.rectangle([0, 22, 1024, 32], fill=BLACK)
bd.rectangle([0, 352, 1024, 362], fill=BLACK)
paste_fit(b, LOGO, (30, 44, 330, 340))
paste_fit(b, text_layer('KAMIKAZES', 'ariblk.ttf', BLACK), (360, 80, 990, 200), 'left')
paste_fit(b, text_layer('TRES CANTOS', 'ariblk.ttf', RED), (360, 216, 990, 320), 'left')
save(banner_finish(b), 'banner_club.jpg', quality=86)

# ================================================================== 5. MURALE della parete lunga (segno distintivo)
# Riproduzione del murale dal riferimento fotografico: fondo grigio-lavanda; colonne di rettangoli colorati "a
# equalizzatore" che sfumano dal rosso-arancio (sinistra) al giallo, verde, azzurro e blu (destra), più chiari
# in basso; due grandi ellissi gialle con quadratini verdi a sinistra, una a destra con un rettangolo scuro e la
# scritta DEPORTE; sagome nere di atleti (pattinatore col bastone, portiere a terra, calciatore, corridori,
# giocatore in piedi); al centro lo stemma di Tres Cantos con la scritta TRES CANTOS.
# Misure in metri: 72 m x 9 m (parete da z = -36 a 36, da 1 m a 10 m d'altezza); esce in due metà da 4096 px.
print('murale')
MW, MH = 72.0, 9.0
SSM = 2                                   # disegno a doppia risoluzione, poi ridotto (bordi morbidi)
PXM = 8192 / MW * SSM
MWp, MHp = int(MW * PXM), int(MH * PXM)
rnd = random.Random(1976)
BG = np.array([176, 178, 192], np.float32)
mur = np.zeros((MHp, MWp, 3), np.float32) + BG
mur += ((resized_noise(64, 512, 2.0, MHp, MWp) - 0.5) * 10)[..., None]
yy = np.arange(MHp)[:, None] / MHp
mur *= (0.97 + 0.05 * yy)[..., None]                 # appena più scuro in alto
mural = to_img(mur).convert('RGBA')
md = ImageDraw.Draw(mural)
Xp = lambda u: u * PXM
Yp = lambda v: (MH - v) * PXM


def mrect(u0, v0, u1, v1, fill):
    md.rectangle([Xp(u0), Yp(v1), Xp(u1), Yp(v0)], fill=fill)


def mellipse(cu, cv, ru, rv, fill):
    md.ellipse([Xp(cu - ru), Yp(cv + rv), Xp(cu + ru), Yp(cv - rv)], fill=fill)


# tonalità lungo la parete (u da 0 a 1)
HUES = [(0.0, (214, 64, 46)), (0.14, (236, 128, 44)), (0.28, (232, 186, 58)), (0.42, (70, 160, 76)),
        (0.58, (58, 172, 156)), (0.74, (80, 158, 216)), (0.9, (52, 98, 186)), (1.0, (44, 84, 170))]


def hue_at(t):
    for (a, ca), (b, cb) in zip(HUES, HUES[1:]):
        if t <= b:
            f = (t - a) / (b - a)
            return [ca[i] + (cb[i] - ca[i]) * f for i in range(3)]
    return list(HUES[-1][1])


# 1) ellissi gialle (dietro ai quadratini)
YELLOW = (240, 198, 40, 255)
mellipse(17.0, 6.9, 4.4, 1.55, YELLOW)
mellipse(25.6, 5.7, 2.7, 1.05, YELLOW)
mellipse(68.6, 7.3, 3.4, 1.0, YELLOW)
mellipse(66.0, 5.1, 2.0, 0.8, YELLOW)
mrect(67.6, 7.0, 69.0, 7.6, (30, 40, 86, 255))            # rettangolo scuro dentro l'ellisse di destra

# 2) colonne "a equalizzatore": rettangoli 0,7 x 0,32 m, passo 0,95 m in orizzontale e 0,44 m in verticale
COL_W, ROW_H, PITCH, ROW_P, V0 = 0.7, 0.32, 0.95, 0.44, 0.55
u = 0.4
while u < MW - 0.8:
    t = u / MW
    # sullo stemma (al centro) le colonne si diradano
    if abs(u - 39.0) < 3.4:
        u += PITCH
        continue
    level = 5 + 4.5 * math.sin(u * 0.33) + 2.5 * math.sin(u * 0.91 + 1.3) + rnd.uniform(-1.2, 1.2)
    n = max(2, min(13, int(round(level))))
    base = hue_at(t)
    for r in range(n):
        k = 0.32 + 0.68 * (r / max(1, n - 1)) ** 0.8          # in basso più chiari, verso l'alto più saturi
        c = tuple(int(BG[i] + (base[i] - BG[i]) * k) for i in range(3))
        v = V0 + r * ROW_P
        mrect(u, v, u + COL_W, v + ROW_H, c + (255,))
    # qualche rettangolo sparso sopra la colonna, come nelle foto
    if rnd.random() < 0.55:
        v = V0 + (n + rnd.randint(1, 3)) * ROW_P
        if v < MH - 0.6:
            mrect(u, v, u + COL_W, v + ROW_H, tuple(int(x) for x in base) + (255,))
    u += PITCH
# quadratini verdi sopra le ellissi gialle di sinistra e blu su quella di destra
for cu, cv, n, col in ((17.0, 6.9, 9, (58, 150, 70)), (25.6, 5.7, 4, (58, 150, 70)), (66.0, 5.1, 3, (44, 84, 170))):
    for _ in range(n):
        du, dv = rnd.uniform(-3.0, 3.0) * (0.6 if n < 5 else 1), rnd.uniform(-0.8, 0.8)
        mrect(cu + du, cv + dv, cu + du + 0.55, cv + dv + 0.3, col + (255,))

# 3) sagome nere degli atleti: pose come giunti (metri, piedi all'origine, y in alto)
INK = (26, 28, 36, 245)


def silhouette(cu, cv, scale, pose, flip=False):
    sx = -1 if flip else 1
    P = lambda p: (Xp(cu + sx * p[0] * scale), Yp(cv + p[1] * scale))
    W = lambda m: max(2, int(m * scale * PXM))

    def limb(*pts, w):
        pp = [P(p) for p in pts]
        md.line(pp, fill=INK, width=W(w), joint='curve')
        for q in pp:
            r = W(w) / 2
            md.ellipse([q[0] - r, q[1] - r, q[0] + r, q[1] + r], fill=INK)
    j = pose
    # busto a trapezio dalle spalle ai fianchi
    sh, hp = j['neck'], j['hip']
    dx, dy = hp[0] - sh[0], hp[1] - sh[1]
    ln = math.hypot(dx, dy) or 1
    nx, ny = -dy / ln, dx / ln
    md.polygon([P((sh[0] + nx * 0.25, sh[1] + ny * 0.25)), P((sh[0] - nx * 0.25, sh[1] - ny * 0.25)),
                P((hp[0] - nx * 0.19, hp[1] - ny * 0.19)), P((hp[0] + nx * 0.19, hp[1] + ny * 0.19))], fill=INK)
    for leg in j['legs']:
        limb(hp, *leg, w=0.23)
    for arm in j['arms']:
        limb(sh, *arm, w=0.15)
    if 'stick' in j:
        limb(*j['stick'], w=0.05)
    h, r = j['head'], j.get('hr', 0.15)
    c = P(h)
    md.ellipse([c[0] - W(r), c[1] - W(r), c[0] + W(r), c[1] + W(r)], fill=INK)
    limb(h, sh, w=0.14)


SKATER = {'head': (0.3, 1.6), 'neck': (0.22, 1.44), 'hip': (0.0, 0.95),
          'legs': [[(0.25, 0.55), (0.18, 0.05)], [(-0.25, 0.55), (-0.62, 0.18)]],
          'arms': [[(0.36, 1.15), (0.5, 0.95)], [(0.06, 1.18), (0.3, 1.0)]],
          'stick': [(0.25, 1.08), (0.85, 0.08), (1.08, 0.05)]}
GOALIE_DOWN = {'head': (0.78, 0.62), 'hr': 0.14, 'neck': (0.6, 0.55), 'hip': (0.0, 0.38),
               'legs': [[(-0.42, 0.22), (-0.86, 0.05)], [(-0.18, 0.62), (-0.56, 0.9)]],
               'arms': [[(0.72, 0.95), (0.88, 1.32)], [(0.86, 0.48), (1.12, 0.36)]]}
KICKER = {'head': (0.12, 1.66), 'neck': (0.08, 1.5), 'hip': (0.0, 0.95),
          'legs': [[(0.36, 0.7), (0.76, 0.8)], [(-0.05, 0.5), (-0.14, 0.0)]],
          'arms': [[(-0.3, 1.3), (-0.56, 1.14)], [(0.34, 1.36), (0.56, 1.52)]]}
RUNNER = {'head': (0.16, 1.66), 'neck': (0.12, 1.5), 'hip': (0.0, 0.95),
          'legs': [[(0.36, 0.64), (0.26, 0.18)], [(-0.22, 0.55), (-0.56, 0.46)]],
          'arms': [[(0.3, 1.24), (0.46, 1.44)], [(-0.2, 1.2), (-0.36, 1.0)]]}
JUMPER = {'head': (0.05, 1.72), 'neck': (0.04, 1.55), 'hip': (0.0, 1.0),
          'legs': [[(0.3, 0.68), (0.12, 0.3)], [(-0.3, 0.75), (-0.62, 0.55)]],
          'arms': [[(0.28, 1.82), (0.42, 2.1)], [(-0.3, 1.78), (-0.4, 2.06)]]}
STANDING = {'head': (0.0, 1.68), 'neck': (0.0, 1.52), 'hip': (0.0, 0.96),
            'legs': [[(0.13, 0.5), (0.17, 0.0)], [(-0.13, 0.5), (-0.17, 0.0)]],
            'arms': [[(0.27, 1.17), (0.3, 0.9)], [(-0.24, 1.2), (-0.08, 1.04)]]}

silhouette(5.5, 0.9, 2.1, SKATER)                  # pattinatore col bastone (estremità sinistra)
silhouette(9.6, 0.25, 1.9, GOALIE_DOWN)            # portiere a terra con il braccio alzato
silhouette(14.2, 2.4, 2.0, JUMPER, flip=True)      # salto con le braccia alzate
silhouette(22.4, 0.3, 1.9, GOALIE_DOWN, flip=True)
silhouette(29.6, 0.5, 2.1, KICKER)                 # calciatore
silhouette(48.6, 0.4, 2.2, STANDING)               # giocatore in piedi
silhouette(57.4, 0.45, 2.2, RUNNER)                # corridore
silhouette(70.4, 0.45, 1.6, KICKER, flip=True)     # vicino a DEPORTE

# 4) stemma di Tres Cantos con la corona, e la scritta TRES CANTOS
CU, CV = 39.0, 3.2                                  # centro dello scudo
SW, SH = 2.2, 2.8                                    # larghezza e altezza dello scudo


def shield_poly(cu, cv, w, h, inset=0.0):
    w2, top, bot = w / 2 - inset, cv + h / 2 - inset, cv - h / 2 + inset
    pts = [(cu - w2, top), (cu + w2, top)]
    # lati dritti fino a metà, poi la punta arrotondata
    mid = cv - h * 0.05
    pts.append((cu + w2, mid))
    for k in range(1, 20):
        a = k / 20 * math.pi
        pts.append((cu + w2 * math.cos(a), mid - (mid - bot) * math.sin(a)))
    pts.append((cu - w2, mid))
    return [(Xp(a), Yp(b)) for a, b in pts]


RED_S, WHITE_S, GOLD = (196, 30, 42, 255), (244, 244, 240, 255), (232, 176, 40, 255)
md.polygon(shield_poly(CU, CV, SW + 0.14, SH + 0.14), fill=(250, 250, 246, 255))        # filetto bianco esterno
md.polygon(shield_poly(CU, CV, SW, SH), fill=RED_S)                                     # bordura rossa
md.polygon(shield_poly(CU, CV, SW, SH, 0.36), fill=WHITE_S)                             # campo d'argento


def star(cu, cv, r, fill):
    pts = []
    for k in range(10):
        a = math.pi / 2 + k * math.pi / 5
        rr = r if k % 2 == 0 else r * 0.42
        pts.append((Xp(cu + rr * math.cos(a)), Yp(cv + rr * math.sin(a))))
    md.polygon(pts, fill=fill)


# otto stelle bianche sulla bordura
for su, sv in ((-0.92, 1.18), (0.92, 1.18), (-0.92, 0.35), (0.92, 0.35), (-0.92, -0.5), (0.92, -0.5), (-0.55, -1.12), (0.55, -1.12)):
    star(CU + su, CV + sv, 0.13, WHITE_S)
# collina d'oro e due alberi verdi (tronchi marroni)
md.chord([Xp(CU - 0.78), Yp(CV - 0.2), Xp(CU + 0.78), Yp(CV - 1.35)], 180, 360, fill=GOLD)
mrect(CU - 0.78, CV - 0.78, CU + 0.78, CV - 0.8 + 0.02, GOLD)
for tu in (-0.34, 0.34):
    mrect(CU + tu - 0.05, CV - 0.55, CU + tu + 0.05, CV - 0.05, (110, 66, 30, 255))
    for du, dv, rr in ((0, 0.42, 0.3), (-0.17, 0.25, 0.2), (0.17, 0.25, 0.2), (0, 0.15, 0.2)):
        mellipse(CU + tu + du, CV + dv, rr, rr * 0.9, (40, 120, 52, 255))
# corona reale: cerchio d'oro con le pietre rosse, cupola rossa, archi d'oro e la croce
CT = CV + SH / 2 + 0.1
mrect(CU - 0.95, CT, CU + 0.95, CT + 0.28, GOLD)
for k in range(5):
    mellipse(CU - 0.7 + k * 0.35, CT + 0.14, 0.07, 0.08, RED_S)
md.chord([Xp(CU - 0.85), Yp(CT + 1.15), Xp(CU + 0.85), Yp(CT + 0.05)], 180, 360, fill=RED_S)
for au in (-0.85, -0.42, 0.0, 0.42, 0.85):
    md.line([(Xp(CU + au), Yp(CT + 0.28)), (Xp(CU + au * 0.35), Yp(CT + 0.95)), (Xp(CU), Yp(CT + 1.02))], fill=GOLD, width=int(0.07 * PXM))
    mellipse(CU + au, CT + 0.34, 0.07, 0.07, (250, 230, 150, 255))
mellipse(CU, CT + 1.08, 0.13, 0.13, GOLD)
mrect(CU - 0.035, CT + 1.15, CU + 0.035, CT + 1.55, GOLD)
mrect(CU - 0.14, CT + 1.36, CU + 0.14, CT + 1.43, GOLD)
# scritta TRES CANTOS sotto lo stemma
paste_fit(mural, text_layer('TRES CANTOS', 'ariblk.ttf', (24, 26, 32), size=400),
          (int(Xp(CU - 4.6)), int(Yp(1.25)), int(Xp(CU + 4.6)), int(Yp(0.3))))

# 5) DEPORTE: lettere bianche con l'ombra scura, sull'ellisse gialla di destra
dep_shadow = text_layer('DEPORTE', 'ariblk.ttf', (30, 34, 50), size=360)
dep = text_layer('DEPORTE', 'ariblk.ttf', (250, 250, 250), size=360)
box = (int(Xp(63.4)), int(Yp(6.7)), int(Xp(68.4)), int(Yp(5.5)))
off = int(0.06 * PXM)
paste_fit(mural, dep_shadow, (box[0] + off, box[1] + off, box[2] + off, box[3] + off))
paste_fit(mural, dep, box)

mural = mural.convert('RGB').resize((8192, 1024), Image.LANCZOS)
save(mural.crop((0, 0, 4096, 1024)), 'mural_a.jpg', quality=88)
save(mural.crop((4096, 0, 8192, 1024)), 'mural_b.jpg', quality=88)
print('fatto')
