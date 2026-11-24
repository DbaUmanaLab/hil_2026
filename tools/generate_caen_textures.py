"""Genera le texture della Halle des Granges (Conquérants de Caen) in assets/textures/caen/.
Uso (dalla cartella del progetto): python tools/generate_caen_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/caen.jpg e le foto della sala: pavimento sportivo azzurro con le righe rosse dell'hockey
e quelle nere degli altri sport; balaustre basse bianche; pareti in blocchi verniciati di bianco con le finestre
in legno in alto e le porte rosse; testata nord color pesca con le finestre ad arco e lo striscione rosso della
città; copertura in lamiera grigio-azzurra su capriate reticolari bianche, con la lanterna vetrata al colmo;
bandiera della Normandia (due leopardi d'oro in campo rosso) e la scritta "Les Conquérants".
Nei cartelloni solo club, città e territorio: niente marchi commerciali.
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'caen')
os.makedirs(OUT, exist_ok=True)
random.seed(14000)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'caen.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
RED, GOLD, BLACK, WHITE, NAVY = (224, 38, 43), (217, 180, 90), (20, 20, 22), (255, 255, 255), (24, 36, 80)


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


# ================================================================== 1. PISTA azzurra
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
n1 = resized_noise(512, 256, 2.0, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([92, 168, 214], np.float32)
col += ((n1 - 0.5) * 10)[..., None]
col += ((resized_noise(1024, 512, 1.4, H, W) - 0.5) * 5)[..., None]
TILE = 0.3048
gx = ((np.arange(W) / S) % TILE) < (1.0 / S)
gz = ((np.arange(H) / S) % TILE) < (1.0 / S)
groove = gz[:, None] | gx[None, :]
col[groove] *= 0.95

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'black', 'yellow')}
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


rect('red', -RW / 2, -0.07, RW / 2, 0.07)
ring('red', 0, 0, 4.5, 0.06)
rect('red', -0.25, -0.25, 0.25, 0.25)
for s in (-1, 1):
    rect('red', -RW / 2 + 1.4, s * 31 - 0.04, RW / 2 - 1.4, s * 31 + 0.04)
    rect('red', -1.6, s * 31, 1.6, s * 29.6)
    for x in (-8.5, 8.5):
        ring('red', x, s * 21, 4.5, 0.06)
        rect('red', x - 0.3, s * 21 - 0.3, x + 0.3, s * 21 + 0.3)
        rect('red', x - 0.22, s * 8 - 0.22, x + 0.22, s * 8 + 0.22)
# altri sport (nero): campi di pallamano/pallavolo e righe lunghe
line('black', [(-10, -20), (10, -20), (10, 20), (-10, 20), (-10, -20)], 0.05)
line('black', [(-4.5, -9), (4.5, -9), (4.5, 9), (-4.5, 9), (-4.5, -9)], 0.05)
for s in (-1, 1):
    line('black', [(-RW / 2 + 1.5, s * 12), (RW / 2 - 1.5, s * 12)], 0.05)
    line('black', [(s * 12.5, -RL / 2 + 2), (s * 12.5, RL / 2 - 2)], 0.05)
    ring('yellow', 0, s * 20, 6, 0.05, *((180, 360) if s > 0 else (0, 180)))
cols = {'black': (36, 40, 48), 'yellow': (226, 196, 60), 'red': (214, 54, 46)}
for k, a in (('black', 0.8), ('yellow', 0.8), ('red', 0.92)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(cols[k], np.float32) * m * a
img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1500):
    cx, cy = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(30, 220); a0 = random.uniform(0, 360)
    sd.arc([cx - ln, cy - ln, cx + ln, cy + ln], a0, a0 + random.uniform(10, 50), fill=(30, 60, 90, random.randint(8, 18)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img, 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.15 + (~groove) * 0.2, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE basse bianche
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([244, 244, 240], np.float32)
    arr += ((n - 0.5) * 7)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 1.5):
        x = int(xm * pxm)
        d.rectangle([x - 3, 0, x + 3, h], fill=(206, 206, 200, 255))
    d.rectangle([0, h - 14, w, h], fill=(170, 172, 172, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 34, int((xm + wm) * pxm), h - 34)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(320):
        x, y = random.uniform(0, w), random.uniform(h * 0.35, h - 16)
        r = random.uniform(3, 9)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 44, random.randint(20, 60)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def logo_panel(img, x0, y0, x1, y1):
    paste_fit(img, LOGO, (x0 + 6, y0 + 4, x1 - 6, y1 - 4))


def text_panel(t, bg, fg, font='arialbd.ttf'):
    def f(img, x0, y0, x1, y1):
        ImageDraw.Draw(img).rectangle([x0, y0, x1, y1], fill=bg + (255,), outline=(170, 170, 170, 255), width=3)
        paste_fit(img, text_layer(t, font, fg, spacing=4), (x0 + 24, y0 + 16, x1 - 24, y1 - 16))
    return f


def club_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=RED + (255,))
    d.rectangle([x0, y1 - 10, x1, y1], fill=BLACK + (255,))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 8, y0 + 4, x0 + h, y1 - 12))
    paste_fit(img, text_layer('CONQUÉRANTS', 'ariblk.ttf', WHITE), (x0 + h + 20, y0 + 10, x1 - 20, y0 + h // 2 + 2), 'left')
    paste_fit(img, text_layer('ROLLER HOCKEY • CAEN', 'arialbd.ttf', GOLD, spacing=3), (x0 + h + 20, y0 + h // 2 + 8, x1 - 20, y1 - 18), 'left')


save(board_strip(panels=[(1.0, 2.2, logo_panel), (4.0, 4.0, text_panel('CAEN', RED, WHITE, 'ariblk.ttf')), (12.5, 4.8, text_panel('LIGUE ÉLITE ROLLER HOCKEY', WHITE, BLACK, 'impact.ttf'))]), 'boards_a.jpg')
save(board_strip(panels=[(1.5, 4.4, text_panel('NORMANDIE', WHITE, RED, 'georgia.ttf')), (10.5, 2.2, logo_panel), (13.5, 4.4, text_panel('CALVADOS', NAVY, WHITE))]), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 6.0, club_panel), (11.5, 4.0, text_panel('CAEN', RED, WHITE, 'ariblk.ttf'))]), 'boards_center.jpg')
save(board_strip(1024, 256, panels=[(6.5, 3.6, logo_panel)]), 'boards_corner.jpg')

# ================================================================== 3. EDIFICIO
print('edificio')
# blocchi verniciati di bianco (30 x 20 cm a giunti allineati), texture 4 x 4 m
W = H = 512
PXb = W / 4.0
wb = np.zeros((H, W, 3), np.float32) + np.array([238, 236, 230], np.float32)
wb += ((fft_noise(H, W, beta=2.0) - 0.5) * 8)[..., None]
im = to_img(wb)
d = ImageDraw.Draw(im)
for r in range(21):
    d.line([(0, int(r * 0.2 * PXb)), (W, int(r * 0.2 * PXb))], fill=(206, 204, 198), width=2)
for k in range(14):
    d.line([(int(k * 0.3 * PXb), 0), (int(k * 0.3 * PXb), H)], fill=(214, 212, 206), width=2)
save(im.filter(ImageFilter.GaussianBlur(0.4)), 'wall_white.jpg')
# testata color pesca (intonaco), texture 4 x 4 m
pe = np.zeros((H, W, 3), np.float32) + np.array([226, 176, 120], np.float32)
pe += ((fft_noise(H, W, beta=2.2) - 0.5) * 12)[..., None]
save(to_img(pe).filter(ImageFilter.GaussianBlur(0.6)), 'wall_peach.jpg')
# finestra in legno marrone (1,6 x 1,3 m) e finestra ad arco
W, H = 256, 208
fw = Image.new('RGB', (W, H), (40, 44, 48))
fd = ImageDraw.Draw(fw)
fd.rectangle([0, 0, W - 1, H - 1], outline=(120, 70, 36), width=16)
fd.line([(W // 2, 0), (W // 2, H)], fill=(120, 70, 36), width=10)
fd.rectangle([16, 16, W // 2 - 5, H - 16], fill=(90, 104, 110))
fd.rectangle([W // 2 + 5, 16, W - 16, H - 16], fill=(80, 96, 104))
save(fw, 'window_wood.jpg')
W, H = 512, 384
aw = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ad = ImageDraw.Draw(aw)
ad.rectangle([0, 128, W, H], fill=(246, 248, 240, 255))
ad.pieslice([0, 0, W, 256], 180, 360, fill=(246, 248, 240, 255))
for k in range(1, 6):
    x = k * W // 6
    ad.line([(x, 30 if 1 < k < 5 else 70), (x, H)], fill=(60, 60, 60, 255), width=6)
for y in (180, 280):
    ad.line([(0, y), (W, y)], fill=(60, 60, 60, 255), width=6)
ad.arc([0, 0, W, 256], 180, 360, fill=(60, 60, 60, 255), width=10)
ad.rectangle([0, 128, W - 1, H - 1], outline=(60, 60, 60, 255), width=10)
save(aw, 'window_arch.png')
# lamiera grigio-azzurra della copertura vista da sotto, grecata (texture 4 x 4 m)
W = H = 512
u = np.arange(W)[None, :] / W
rf = np.zeros((H, W, 3), np.float32) + np.array([108, 132, 160], np.float32)
rf += ((fft_noise(H, W, beta=2.2) - 0.5) * 10)[..., None]
rf *= (1 - 0.2 * (np.sin(u * np.pi * 2 * 16) > 0.5))[..., None]
save(to_img(rf).filter(ImageFilter.GaussianBlur(0.6)), 'roof_deck.jpg')
# vetrate della lanterna al colmo
W, H = 512, 256
gl = np.zeros((H, W, 3), np.float32) + np.array([236, 242, 246], np.float32)
gl += ((resized_noise(8, 32, 1.4, H, W) - 0.5) * 16)[..., None]
im = to_img(gl)
d = ImageDraw.Draw(im)
for k in range(0, W + 1, 64):
    d.rectangle([k - 4, 0, k + 4, H], fill=(200, 204, 208))
save(im, 'skylight.jpg')
# rete scura
W = H = 256
net = Image.new('RGBA', (W, H), (0, 0, 0, 0))
nd = ImageDraw.Draw(net)
for k in range(0, W + 1, 16):
    nd.line([(k, 0), (k, H)], fill=(22, 24, 28, 200), width=2)
    nd.line([(0, k), (W, k)], fill=(22, 24, 28, 200), width=2)
save(net, 'net.png')

# ================================================================== 4. BANDIERA, STRISCIONI, SCRITTA
print('stendardi')


def leopard(d, cx, cy, s, col):
    """Leopardo d'oro stilizzato (passante, guarda verso chi osserva), come nello stemma normanno."""
    d.ellipse([cx - 1.3 * s, cy - 0.35 * s, cx + 0.9 * s, cy + 0.35 * s], fill=col)              # corpo
    d.ellipse([cx + 0.75 * s, cy - 0.75 * s, cx + 1.35 * s, cy - 0.1 * s], fill=col)            # testa
    for lx in (-1.05, -0.65, 0.35, 0.7):                                                        # zampe
        d.rectangle([cx + lx * s, cy + 0.2 * s, cx + (lx + 0.14) * s, cy + 0.75 * s], fill=col)
    d.line([(cx - 1.25 * s, cy - 0.1 * s), (cx - 1.7 * s, cy - 0.7 * s), (cx - 1.4 * s, cy - 1.0 * s)], fill=col, width=max(2, int(0.14 * s)))


W, H = 600, 420
fl = Image.new('RGB', (W, H), (206, 30, 36))
fd = ImageDraw.Draw(fl)
leopard(fd, 300, 130, 90, (240, 196, 40))
leopard(fd, 300, 300, 90, (240, 196, 40))
arr = np.asarray(fl).astype(np.float32)
arr *= (0.86 + 0.14 * np.sin(np.arange(W)[None, :] / W * np.pi * 5))[..., None]
save(to_img(arr), 'flag_normandie.jpg')
# striscione rosso della città sulla testata nord (CAEN ripetuto)
W, H = 2400, 200
cb = Image.new('RGBA', (W, H), (200, 30, 40, 255))
for k in range(6):
    paste_fit(cb, text_layer('CAEN', 'ariblk.ttf', WHITE, spacing=10), (k * 400 + 60, 40, k * 400 + 340, 160))
save(banner_finish(cb), 'banner_city.jpg', quality=86)
# scritta "Les Conquérants" sulla parete (trasparente) col logo
W, H = 1200, 400
cq = Image.new('RGBA', (W, H), (0, 0, 0, 0))
paste_fit(cq, LOGO, (10, 10, 380, 390))
paste_fit(cq, text_layer('Les', 'georgiab.ttf', BLACK), (400, 30, 600, 150), 'left')
paste_fit(cq, text_layer('Conquérants', 'georgiab.ttf', BLACK), (400, 170, 1190, 340), 'left')
save(cq, 'mural.png')
# striscione del club
b = Image.new('RGBA', (1024, 384), RED + (255,))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 0, 1024, 22], fill=BLACK)
bd.rectangle([0, 362, 1024, 384], fill=BLACK)
paste_fit(b, LOGO, (40, 36, 352, 348))
paste_fit(b, text_layer('CONQUÉRANTS', 'ariblk.ttf', WHITE), (380, 80, 990, 190), 'left')
paste_fit(b, text_layer('CAEN', 'ariblk.ttf', GOLD, spacing=14), (380, 220, 990, 320), 'left')
save(banner_finish(b), 'banner_club.jpg', quality=86)
print('fatto')
