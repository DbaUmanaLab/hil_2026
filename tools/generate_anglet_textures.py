"""Genera le texture della Salle du Pignada (Artzak d'Anglet) in assets/textures/anglet/.
Uso (dalla cartella del progetto): python tools/generate_anglet_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/anglet.jpg e le foto del palazzetto: pavimento sportivo azzurro con la riga centrale e i
cerchi rossi, le aree di porta piene rosse e le righe bianche e nere degli altri sport; balaustre bianche col piede
giallo; pareti bianche con la fascia grigia in basso e i cartelloni; copertura in lamiera azzurro-grigia fra le
travi in legno lamellare; stendardi verdi dei titoli del club; locali del club sotto la tribuna, coi telai rossi.
Nei cartelloni solo club, città e territorio: niente marchi commerciali.
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'anglet')
os.makedirs(OUT, exist_ok=True)
random.seed(64600)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'anglet.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
GREEN, RED, WHITE, BLACK = (20, 88, 58), (211, 47, 47), (255, 255, 255), (20, 20, 22)
YEL, NAVY, BLUE = (236, 200, 40), (24, 40, 90), (30, 110, 190)


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


# ================================================================== 1. PISTA: pavimento sportivo azzurro
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
n1 = resized_noise(512, 256, 2.0, H, W)
n2 = resized_noise(1024, 512, 1.4, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([112, 180, 222], np.float32)
col += ((n1 - 0.5) * 10)[..., None]
col += ((n2 - 0.5) * 5)[..., None]
# teli del pavimento in rotoli da 2 m, giunti appena visibili
jx = ((np.arange(W) / S) % 2.0) < (1.2 / S)
col[:, jx] *= 0.96

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'white', 'black')}
draws = {k: ImageDraw.Draw(m) for k, m in masks.items()}
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)
px = lambda m: max(1, int(m * S * SS))


def rect(k, x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    draws[k].rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def line(k, pts, w):
    draws[k].line([P(x, z) for x, z in pts], fill=255, width=px(w))


def ring(k, x, z, r, wdt, a0=0, a1=360):
    c = P(x, z); R = r * S * SS
    draws[k].arc([c[0] - R, c[1] - R, c[0] + R, c[1] + R], a0, a1, fill=255, width=px(wdt))


# hockey (rosso)
rect('red', -RW / 2, -0.12, RW / 2, 0.12)
ring('red', 0, 0, 4.5, 0.07)
rect('red', -0.25, -0.25, 0.25, 0.25)
for s in (-1, 1):
    rect('red', -RW / 2 + 1.4, s * 31 - 0.05, RW / 2 - 1.4, s * 31 + 0.05)
    rect('red', -1.8, s * 31, 1.8, s * 29.2)                   # area di porta piena
    for x in (-8.5, 8.5):
        ring('red', x, s * 21, 4.5, 0.07)
        rect('red', x - 0.28, s * 21 - 0.28, x + 0.28, s * 21 + 0.28)
        rect('red', x - 0.22, s * 8 - 0.22, x + 0.22, s * 8 + 0.22)
# pallamano (bianco): campo 20 x 40, aree a semicerchio
line('white', [(-10, -20), (10, -20), (10, 20), (-10, 20), (-10, -20)], 0.05)
for s in (-1, 1):
    ring('white', 0, s * 20, 6, 0.05, *((180, 360) if s > 0 else (0, 180)))
# pallacanestro (nero): campo 15 x 28 con le linee da tre punti
line('black', [(-7.5, -14), (7.5, -14), (7.5, 14), (-7.5, 14), (-7.5, -14)], 0.05)
ring('black', 0, 0, 1.8, 0.05)
for s in (-1, 1):
    zb = s * 14
    line('black', [(-2.45, zb), (-2.45, zb - s * 5.8), (2.45, zb - s * 5.8), (2.45, zb)], 0.05)
    ring('black', 0, zb - s * 1.575, 6.75, 0.05, *((192, 348) if s > 0 else (12, 168)))
cols = {'black': (44, 48, 56), 'white': (240, 246, 248), 'red': (214, 52, 50)}
for k, a in (('black', 0.75), ('white', 0.85), ('red', 0.92)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(cols[k], np.float32) * m * a
img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1800):                                      # segni delle ruote
    cx, cy = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(30, 240); a0 = random.uniform(0, 360)
    sd.arc([cx - ln, cy - ln, cx + ln, cy + ln], a0, a0 + random.uniform(10, 50), fill=(30, 60, 90, random.randint(8, 18)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img, 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.12 + (~jx)[None, :] * 0.1 + np.zeros((H, 1)), 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE bianche col piede giallo
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([244, 244, 242], np.float32)
    arr += ((n - 0.5) * 7)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.rectangle([x - 2, 0, x + 2, h], fill=(214, 216, 214, 255))
    d.rectangle([0, h - 34, w, h], fill=YEL + (255,))
    d.rectangle([0, 0, w, 6], fill=(204, 206, 204, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 26, int((xm + wm) * pxm), h - 50)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(280):                                   # segni delle palline
        x, y = random.uniform(0, w), random.uniform(h * 0.4, h - 36)
        r = random.uniform(3, 9)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 44, random.randint(20, 60)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def logo_panel(img, x0, y0, x1, y1):
    paste_fit(img, LOGO, (x0 + 6, y0 + 4, x1 - 6, y1 - 4))


def club_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=GREEN + (255,))
    d.rectangle([x0, y1 - 12, x1, y1], fill=RED + (255,))
    h = y1 - y0
    d.ellipse([x0 + 8, y0 + 2, x0 + h - 6, y1 - 14], fill=WHITE + (255,))
    paste_fit(img, LOGO, (x0 + 14, y0 + 8, x0 + h - 12, y1 - 20))
    paste_fit(img, text_layer('ARTZAK', 'ariblk.ttf', WHITE), (x0 + h + 20, y0 + 14, x1 - 20, y0 + h // 2 + 2), 'left')
    paste_fit(img, text_layer("ROLLER HOCKEY • ANGLET", 'arialbd.ttf', (255, 214, 214), spacing=3), (x0 + h + 20, y0 + h // 2 + 12, x1 - 20, y1 - 24), 'left')


def anglet_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=BLUE + (255,), width=6)
    paste_fit(img, text_layer('VILLE D\u2019ANGLET', 'arialbd.ttf', BLUE, spacing=5), (x0 + 30, y0 + 22, x1 - 30, y1 - 22))


def basque_panel(img, x0, y0, x1, y1):                     # bianco, rosso e verde come l'ikurriña, solo colori
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=RED + (255,))
    d.rectangle([x0, y1 - 14, x1, y1], fill=GREEN + (255,))
    paste_fit(img, text_layer('PAYS BASQUE', 'ariblk.ttf', WHITE, spacing=6), (x0 + 30, y0 + 22, x1 - 30, y1 - 30))


def cote_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=NAVY + (255,))
    paste_fit(img, text_layer('CÔTE BASQUE', 'georgia.ttf', WHITE, spacing=8), (x0 + 30, y0 + 22, x1 - 30, y1 - 22))


def ligue_panel(img, x0, y0, x1, y1):
    paste_fit(img, text_layer('LIGUE ÉLITE ROLLER HOCKEY', 'impact.ttf', BLACK, spacing=5), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


save(board_strip(panels=[(1.0, 2.2, logo_panel), (4.0, 4.4, anglet_panel), (12.5, 4.8, ligue_panel)]), 'boards_a.jpg')
save(board_strip(panels=[(1.5, 4.2, basque_panel), (10.5, 2.2, logo_panel), (13.5, 4.2, cote_panel)]), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 5.8, club_panel), (11.0, 4.4, anglet_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256, panels=[(6.5, 3.6, logo_panel)]), 'boards_corner.jpg')

# ================================================================== 3. EDIFICIO
print('edificio')
# intonaco bianco (texture 4 x 4 m)
W = H = 512
ww = np.zeros((H, W, 3), np.float32) + np.array([238, 238, 236], np.float32)
ww += ((fft_noise(H, W, beta=2.4) - 0.5) * 8)[..., None]
save(to_img(ww).filter(ImageFilter.GaussianBlur(0.6)), 'wall_white.jpg')
# fascia grigia in basso (pittura lavabile, texture 4 x 2 m)
W, H = 512, 256
gb = np.zeros((H, W, 3), np.float32) + np.array([118, 122, 128], np.float32)
gb += ((fft_noise(H, W, beta=2.2) - 0.5) * 10)[..., None]
save(to_img(gb).filter(ImageFilter.GaussianBlur(0.6)), 'wall_grey.jpg')

# fila di cartelloni sulla parete est (40 m x 2,4 m): solo territorio e club, in stile pannelli di sponsor
W, H = 4000, 240
cw = Image.new('RGBA', (W, H), (0, 0, 0, 0))
names = [('ANGLET', BLUE, WHITE), ('BIARRITZ', WHITE, NAVY), ('PAYS BASQUE', RED, WHITE), ('ARTZAK', GREEN, WHITE),
         ('CÔTE BASQUE', NAVY, WHITE), ('BAYONNE', WHITE, RED), ('LA CHAMBRE D\u2019AMOUR', (0, 120, 150), WHITE), ('PIGNADA', WHITE, GREEN),
         ('ROLLER ANGLET', (245, 245, 240), BLACK), ('ADOUR', (60, 140, 90), WHITE), ('ARTZAK', WHITE, GREEN), ('ANGLET', RED, WHITE)]
rr = random.Random(5)
dd = ImageDraw.Draw(cw)
k = 0
for (y0, y1) in ((12, 114), (126, 228)):                   # due file di pannelli per tutta la parete
    x = 20 + (0 if y0 < 100 else 140)
    while x < W - 260:
        t, bg, fg = names[k % len(names)]
        k += 1
        w = min(rr.randint(280, 420), W - 20 - x)
        dd.rectangle([x, y0, x + w, y1], fill=bg + (255,), outline=(180, 180, 176, 255), width=3)
        if t == 'ARTZAK':
            paste_fit(cw, LOGO, (x + 8, y0 + 6, x + 100, y1 - 6))
            paste_fit(cw, text_layer(t, 'ariblk.ttf', fg), (x + 110, y0 + 16, x + w - 12, y1 - 16), 'left')
        else:
            paste_fit(cw, text_layer(t, 'arialbd.ttf', fg, spacing=3), (x + 16, y0 + 16, x + w - 16, y1 - 16))
        x += w + rr.randint(40, 160)
save(cw, 'ad_panels.png')

# finestra (texture 2,4 x 1,6 m): vetro chiaro col telaio scuro e il montante
W, H = 384, 256
fw = Image.new('RGB', (W, H), (226, 236, 232))
fd = ImageDraw.Draw(fw)
fd.rectangle([0, 0, W - 1, H - 1], outline=(70, 74, 78), width=14)
fd.line([(W // 2, 0), (W // 2, H)], fill=(70, 74, 78), width=10)
save(fw.filter(ImageFilter.GaussianBlur(0.6)), 'window.jpg')

# lamiera della copertura vista da sotto: azzurro-grigia, grecata (texture 4 x 4 m)
W = H = 512
u = np.arange(W)[None, :] / W
rf = np.zeros((H, W, 3), np.float32) + np.array([178, 196, 212], np.float32)
rf += ((fft_noise(H, W, beta=2.2) - 0.5) * 10)[..., None]
rf *= (1 - 0.16 * (np.sin(u * np.pi * 2 * 14) > 0.5))[..., None]
save(to_img(rf).filter(ImageFilter.GaussianBlur(0.6)), 'roof_deck.jpg')

# legno lamellare chiaro (texture 4 m x 1 m, venature lungo la trave = lungo u, lamelle incollate orizzontali)
W, H = 512, 128
wd = np.zeros((H, W, 3), np.float32) + np.array([186, 136, 82], np.float32)
wd += ((resized_noise(8, 256, 1.4, H, W) - 0.5) * 30)[..., None]
wd *= (1 - 0.08 * ((np.arange(H)[:, None] % 21) < 2))[..., None]
save(to_img(wd), 'glulam.jpg')

# facciata dei locali del club sotto la tribuna (40 m x 3 m): bianco, telai rossi, porte verdi, vetrate
W, H = 4000, 300
PXf = W / 40.0
fc = Image.new('RGB', (W, H), (236, 236, 234))
fd = ImageDraw.Draw(fc)
rr = random.Random(9)
xm = 0.8
while xm < 39:
    kind = rr.choice(['door', 'glass', 'glass', 'board', 'door_red'])
    wm = {'door': 1.1, 'door_red': 1.1, 'glass': rr.uniform(2.4, 4.0), 'board': 1.6}[kind]
    x0, x1 = int(xm * PXf), int((xm + wm) * PXf)
    if kind == 'glass':
        fd.rectangle([x0, int(0.5 * PXf), x1, int(2.6 * PXf)], fill=(150, 170, 180), outline=(196, 40, 44), width=12)
        fd.line([((x0 + x1) // 2, int(0.5 * PXf)), ((x0 + x1) // 2, int(2.6 * PXf))], fill=(196, 40, 44), width=8)
    elif kind == 'door':
        fd.rectangle([x0, int(0.4 * PXf), x1, H], fill=(36, 120, 80), outline=(196, 40, 44), width=10)
    elif kind == 'door_red':
        fd.rectangle([x0, int(0.4 * PXf), x1, H], fill=(60, 64, 70), outline=(196, 40, 44), width=10)
    else:
        fd.rectangle([x0, int(0.9 * PXf), x1, int(2.0 * PXf)], fill=(250, 250, 250), outline=(120, 124, 128), width=6)
    xm += wm + rr.uniform(0.8, 2.6)
save(fc, 'club_front.jpg')

# stendardi verdi dei titoli del club (come nelle foto)
titles = [('VAINQUEUR', 'COUPE DE FRANCE', '2013'), ('VAINQUEUR', 'COUPE DE FRANCE', '2009'), ('VAINQUEUR', 'COUPE DE FRANCE', '2007'),
          ('VAINQUEUR', 'COUPE DE FRANCE', '2006'), ('CHAMPION', 'DE FRANCE ÉLITE', '2010'), ('CHAMPION', 'DE FRANCE ÉLITE', '2011'),
          ('CHAMPION', 'DE FRANCE ÉLITE', '2012'), ('CHAMPION', 'DE FRANCE N2', '2016')]
PW, PH = 160, 400
pen = Image.new('RGBA', (PW * len(titles), PH), (0, 0, 0, 0))
for i, (a, b, y) in enumerate(titles):
    p = Image.new('RGBA', (PW, PH), (0, 0, 0, 0))
    pd = ImageDraw.Draw(p)
    pd.polygon([(0, 0), (PW, 0), (PW, PH - 50), (PW // 2, PH), (0, PH - 50)], fill=(24, 92, 60, 255))
    pd.polygon([(8, 8), (PW - 8, 8), (PW - 8, PH - 56), (PW // 2, PH - 10), (8, PH - 56)], outline=(230, 236, 230, 255), width=3)
    paste_fit(p, LOGO, (40, 22, PW - 40, 90))
    paste_fit(p, text_layer(a, 'arialbd.ttf', WHITE), (18, 120, PW - 18, 160))
    paste_fit(p, text_layer(b, 'arialbd.ttf', WHITE), (14, 170, PW - 14, 215))
    paste_fit(p, text_layer(y, 'ariblk.ttf', WHITE), (30, 240, PW - 30, 300))
    pen.alpha_composite(p, (i * PW, 0))
save(pen, 'pennants.png')

# insegna VILLE D'ANGLET / Salle LE PIGNADA
W, H = 640, 200
sg = Image.new('RGBA', (W, H), (250, 250, 248, 255))
sd = ImageDraw.Draw(sg)
sd.rectangle([0, 0, W - 1, H - 1], outline=(160, 164, 168, 255), width=6)
sd.rectangle([22, 30, 120, 170], fill=BLUE + (255,))
paste_fit(sg, text_layer('VILLE D\u2019ANGLET', 'arialbd.ttf', NAVY, spacing=3), (140, 28, W - 24, 100), 'left')
paste_fit(sg, text_layer('Salle LE PIGNADA', 'arialbd.ttf', (60, 64, 70)), (140, 110, W - 24, 172), 'left')
save(sg, 'sign_pignada.jpg')

# ================================================================== 4. STRISCIONE DEL CLUB
print('striscioni')
b = Image.new('RGBA', (1024, 384), GREEN + (255,))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 0, 1024, 22], fill=RED)
bd.rectangle([0, 362, 1024, 384], fill=RED)
bd.ellipse([40, 40, 344, 344], fill=WHITE)
paste_fit(b, LOGO, (70, 70, 314, 314))
paste_fit(b, text_layer('ARTZAK', 'ariblk.ttf', WHITE), (380, 70, 990, 200), 'left')
paste_fit(b, text_layer('ANGLET', 'ariblk.ttf', (255, 214, 214), spacing=12), (380, 230, 990, 320), 'left')
save(banner_finish(b), 'banner_club.jpg', quality=86)
print('fatto')
