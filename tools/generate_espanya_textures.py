"""Genera le texture del Poliesportiu Joan Seguí (Espanya Hockey Club, Palma di Maiorca) in assets/textures/espanya/.
Uso (dalla cartella del progetto): python tools/generate_espanya_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/espanya.png e le foto del palazzetto: parquet scuro multisport con le righe gialle,
per l'hockey il campo azzurro con le righe rosso-arancio e i punti d'ingaggio a quadretto; parete lunga in blocchi
di pietra beige (marès) con gli striscioni dello sport municipale; sopra, la fascia di rete frangivento verde;
testate in intonaco color crema con le finestrelle in alto e le tende grigie; recinzione bassa con lo zoccolo in
legno e la rete metallica a maglie quadre; copertura in lamiera chiara su capriate blu scuro.
Nei cartelloni solo club, città e territorio: niente marchi commerciali.
"""
import sys, os, random, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'espanya')
os.makedirs(OUT, exist_ok=True)
random.seed(1923)
rs = np.random.default_rng(1923)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'espanya.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
RED, YEL, BLUE, BLACK, WHITE = (215, 31, 38), (245, 197, 24), (46, 98, 184), (20, 20, 22), (255, 255, 255)


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


# ================================================================== 1. PISTA: campo azzurro dell'hockey con le righe rosso-arancio
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
n1 = resized_noise(512, 256, 2.0, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([150, 200, 228], np.float32)
col += ((n1 - 0.5) * 9)[..., None]
col += ((resized_noise(1024, 512, 1.4, H, W) - 0.5) * 4)[..., None]
TILE = 0.3048
gx = ((np.arange(W) / S) % TILE) < (1.0 / S)
gz = ((np.arange(H) / S) % TILE) < (1.0 / S)
groove = gz[:, None] | gx[None, :]
col[groove] *= 0.95
SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'white')}
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


rect('red', -RW / 2, -0.08, RW / 2, 0.08)                    # riga centrale
ring('red', 0, 0, 4.5, 0.07)
rect('red', -0.3, -0.3, 0.3, 0.3)
for s in (-1, 1):
    rect('red', -RW / 2 + 1.4, s * 31 - 0.05, RW / 2 - 1.4, s * 31 + 0.05)
    line('red', [(-1.5, s * 31), (-1.5, s * 29.6), (1.5, s * 29.6), (1.5, s * 31)], 0.06)
    for x in (-8.5, 8.5):
        ring('red', x, s * 21, 4.5, 0.07)
        rect('red', x - 0.3, s * 21 - 0.3, x + 0.3, s * 21 + 0.3)
        rect('red', x - 0.3, s * 8 - 0.3, x + 0.3, s * 8 + 0.3)
# righe bianche di un altro sport (come nella foto, una linea lungo il lato)
line('white', [(-RW / 2 + 0.8, -RL / 2 + 2), (-RW / 2 + 0.8, RL / 2 - 2)], 0.05)
for k, c, a in (('white', (244, 246, 246), 0.8), ('red', (232, 86, 52), 0.92)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(c, np.float32) * m * a
img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1300):
    cx, cy = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(30, 200); a0 = random.uniform(0, 360)
    sd.arc([cx - ln, cy - ln, cx + ln, cy + ln], a0, a0 + random.uniform(10, 50), fill=(40, 60, 80, random.randint(8, 18)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img, 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.2 + (~groove) * 0.25, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. PARQUET del palazzetto (fuori dal campo), 8 x 8 m
print('parquet')
W = H = 1024
PX = W / 8.0
pq = np.zeros((H, W, 3), np.float32)
board_w = 0.12                                     # listoni da 12 cm, lunghezze diverse
nboards = int(8 / board_w) + 1
grain = resized_noise(64, 512, 1.4, H, W)
for i in range(nboards):
    x0 = int(i * board_w * PX)
    x1 = min(W, int((i + 1) * board_w * PX))
    y = -rs.uniform(0, 1.5) * PX
    while y < H:
        L = rs.uniform(0.6, 1.4) * PX
        tone = rs.choice([0, 1, 2], p=[0.45, 0.35, 0.2])
        base = [(118, 74, 44), (92, 56, 34), (138, 92, 56)][tone]
        base = np.array(base, np.float32) * rs.uniform(0.88, 1.1)
        ya, yb = int(max(0, y)), int(min(H, y + L))
        if yb > ya:
            pq[ya:yb, x0:x1] = base
            pq[ya:min(H, ya + 2), x0:x1] *= 0.6               # giunto di testa
        y += L
    pq[:, x0:min(W, x0 + 2)] *= 0.65                         # giunto laterale
pq *= (0.88 + 0.24 * grain)[..., None]
img = to_img(pq)
d = ImageDraw.Draw(img)
d.line([(0, int(3.1 * PX)), (W, int(3.1 * PX))], fill=(226, 196, 60), width=5)      # riga gialla del basket
save(img.filter(ImageFilter.GaussianBlur(0.5)), 'parquet.jpg')

# ================================================================== 3. EDIFICIO
print('edificio')
# blocchi di marès beige (1,0 x 0,5 m), texture 4 x 4 m
W = H = 512
PXs = W / 4.0
st = np.zeros((H, W, 3), np.float32) + np.array([214, 196, 160], np.float32)
st += ((fft_noise(H, W, beta=1.6) - 0.5) * 26)[..., None]
im = to_img(st)
d = ImageDraw.Draw(im)
for row in range(8):
    y = int(row * 0.5 * PXs)
    off = (row % 2) * 0.5
    for k in range(-1, 5):
        x0, x1 = int((k + off) * PXs), int((k + off + 1) * PXs)
        tint = rs.uniform(-14, 10)
        d.rectangle([x0 + 2, y + 2, x1 - 2, y + int(0.5 * PXs) - 2], fill=tuple(int(c + tint) for c in (214, 196, 160)))
    d.line([(0, y), (W, y)], fill=(176, 160, 128), width=3)
    for k in range(-1, 6):
        x = int((k + off) * PXs)
        d.line([(x, y), (x, y + int(0.5 * PXs))], fill=(176, 160, 128), width=3)
spk = Image.new('RGBA', im.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(spk)
for _ in range(1800):                                             # porosità della pietra
    x, y = random.uniform(0, W), random.uniform(0, H)
    r = random.uniform(0.5, 1.6)
    sd.ellipse([x - r, y - r, x + r, y + r], fill=(120, 104, 80, random.randint(40, 110)))
im = im.convert('RGBA'); im.alpha_composite(spk)
save(im.convert('RGB').filter(ImageFilter.GaussianBlur(0.5)), 'stone_wall.jpg')

# intonaco color crema delle testate
W = H = 512
cr = np.zeros((H, W, 3), np.float32) + np.array([232, 216, 168], np.float32)
cr += ((fft_noise(H, W, beta=2.4) - 0.5) * 12)[..., None]
save(to_img(cr).filter(ImageFilter.GaussianBlur(0.8)), 'plaster_cream.jpg')

# fascia di rete frangivento verde-acqua a strisce orizzontali (texture 6 x 4,4 m)
W, H = 512, 384
gn = np.zeros((H, W, 3), np.float32) + np.array([40, 120, 104], np.float32)
gn += ((resized_noise(32, 64, 1.6, H, W) - 0.5) * 22)[..., None]
y = np.arange(H)[:, None]
gn *= (1 + 0.35 * (((y // 22) % 2) == 0) * (np.sin(np.arange(W)[None, :] / 40) * 0.1 + 0.9))[..., None]
im = to_img(gn)
d = ImageDraw.Draw(im)
for k in range(0, W, 8):
    d.line([(k, 0), (k, H)], fill=(24, 70, 62), width=1)
for k in range(0, H, 8):
    d.line([(0, k), (W, k)], fill=(24, 70, 62), width=1)
save(im, 'green_net.jpg')

# rete metallica a maglie quadre della recinzione (trasparente)
W = H = 256
mesh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
md = ImageDraw.Draw(mesh)
for k in range(0, W + 1, 32):
    md.line([(k, 0), (k, H)], fill=(70, 74, 78, 235), width=4)
    md.line([(0, k), (W, k)], fill=(70, 74, 78, 235), width=4)
save(mesh, 'mesh_fence.png')

# zoccolo in legno della recinzione
W, H = 512, 64
wd = np.zeros((H, W, 3), np.float32) + np.array([176, 104, 52], np.float32)
wd += ((resized_noise(8, 128, 1.2, H, W) - 0.5) * 30)[..., None]
save(to_img(wd), 'fence_base.jpg')

# finestrelle in alto sulle testate (due file da 4) e tenda grigia della vetrata alta
W, H = 512, 256
fw = Image.new('RGB', (W, H), (232, 216, 168))
fd = ImageDraw.Draw(fw)
for r in range(2):
    for k in range(4):
        x0, y0 = 16 + k * 124, 16 + r * 120
        fd.rectangle([x0, y0, x0 + 112, y0 + 104], fill=(246, 248, 250), outline=(150, 150, 146), width=8)
        fd.line([(x0 + 56, y0), (x0 + 56, y0 + 104)], fill=(160, 160, 156), width=4)
save(fw, 'high_windows.jpg')
W, H = 256, 512
ct = np.zeros((H, W, 3), np.float32) + np.array([150, 152, 154], np.float32)
xx = np.arange(W)[None, :]
ct *= (0.85 + 0.15 * np.sin(xx / W * math.pi * 2 * 9))[..., None]
ct += ((resized_noise(64, 16, 1.6, H, W) - 0.5) * 10)[..., None]
save(to_img(ct), 'curtain.jpg')

# lamiera grecata chiara della copertura (vista dal basso)
W = H = 512
roof = np.zeros((H, W, 3), np.float32) + np.array([198, 196, 188], np.float32)
roof += ((fft_noise(H, W, beta=2.2) - 0.5) * 10)[..., None]
u = np.arange(H)[:, None] / H
roof *= (1 - 0.22 * (np.sin(u * np.pi * 2 * 20) > 0.45))[..., None]
save(to_img(roof).filter(ImageFilter.GaussianBlur(0.6)), 'roof_deck.jpg')

# striscione dello sport municipale: girandola a quattro colori e scritta (niente loghi ufficiali)
W, H = 768, 384
b = Image.new('RGBA', (W, H), (250, 250, 248, 255))
bd = ImageDraw.Draw(b)
cx, cy, R = 190, 192, 130
for k, c in enumerate([(240, 180, 30), (226, 60, 50), (60, 150, 80), (40, 110, 190)]):
    a0 = math.radians(k * 90 + 20)
    pts = [(cx, cy), (cx + R * math.cos(a0), cy + R * math.sin(a0)), (cx + R * 0.55 * math.cos(a0 + 0.9), cy + R * 0.55 * math.sin(a0 + 0.9))]
    bd.polygon(pts, fill=c)
paste_fit(b, text_layer('ESPORT', 'ariblk.ttf', (40, 44, 52)), (350, 90, W - 30, 190), 'left')
paste_fit(b, text_layer('PALMA', 'arialbd.ttf', (196, 30, 40), spacing=8), (350, 210, W - 60, 290), 'left')
bd.rectangle([0, 0, W - 1, H - 1], outline=(200, 200, 196), width=6)
save(b, 'banner_sport.jpg')

# striscione del club
b = Image.new('RGBA', (1024, 384), RED + (255,))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 0, 1024, 22], fill=YEL)
bd.rectangle([0, 362, 1024, 384], fill=YEL)
paste_fit(b, LOGO, (30, 36, 330, 348))
paste_fit(b, text_layer('ESPANYA HC', 'ariblk.ttf', WHITE), (360, 70, 990, 190), 'left')
paste_fit(b, text_layer('PALMA • MALLORCA', 'arialbd.ttf', YEL, spacing=4), (360, 220, 990, 300), 'left')
save(banner_finish(b), 'banner_club.jpg', quality=86)
print('fatto')
