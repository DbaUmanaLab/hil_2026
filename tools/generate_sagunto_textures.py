"""Genera le texture del Pabellón Polideportivo Internúcleos (Alas de Sagunto, Sagunto/Sagunt) in
assets/textures/sagunto/.
Uso (dalla cartella del progetto): python tools/generate_sagunto_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/sagunto.jpg e le foto del palazzetto: pista azzurra con la riga centrale rossa, i
cerchi d'ingaggio rossi sottili e le aree di porta piene rosse; balaustre bianche con il piede giallo; pareti in
blocchi di cemento grigio-beige in basso e pannelli di policarbonato traslucido fino alla gronda; telo frangivento
blu sul lato lungo; copertura a due falde con le capriate bianche, la fascia centrale di lastre traslucide e le
lastre azzurre ai lati; reti scure dietro le porte.
Nei cartelloni solo club, città e territorio: niente marchi commerciali.
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'sagunto')
os.makedirs(OUT, exist_ok=True)
random.seed(46500)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'sagunto.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
LIME, BLACK, WHITE, GREY = (134, 216, 31), (20, 20, 22), (255, 255, 255), (90, 92, 96)
YEL, RED, VAL_BLUE = (238, 196, 40), (214, 50, 44), (30, 70, 150)


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


# ================================================================== 1. PISTA azzurra con le righe rosse dell'hockey
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
n1 = resized_noise(512, 256, 2.0, H, W)
n2 = resized_noise(1024, 512, 1.4, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([128, 194, 232], np.float32)
col += ((n1 - 0.5) * 9)[..., None]
col += ((n2 - 0.5) * 5)[..., None]
TILE = 0.25
gx = ((np.arange(W) / S) % TILE) < (1.0 / S)
gz = ((np.arange(H) / S) % TILE) < (1.0 / S)
groove = gz[:, None] | gx[None, :]
col[groove] *= 0.965

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


# riga centrale rossa larga, cerchio centrale e cerchi d'ingaggio sottili, aree di porta piene
rect('red', -RW / 2, -0.15, RW / 2, 0.15)
ring('red', 0, 0, 4.5, 0.06)
rect('red', -0.25, -0.25, 0.25, 0.25)
for s in (-1, 1):
    rect('red', -RW / 2 + 1.4, s * 31 - 0.05, RW / 2 - 1.4, s * 31 + 0.05)
    rect('red', -1.6, s * 31, 1.6, s * 29.4)                       # area di porta piena
    for x in (-8.5, 8.5):
        ring('red', x, s * 21, 4.5, 0.06)
        rect('red', x - 0.28, s * 21 - 0.28, x + 0.28, s * 21 + 0.28)
        rect('red', x - 0.22, s * 8 - 0.22, x + 0.22, s * 8 + 0.22)
# righe bianche sottili di un altro sport lungo i lati
for s in (-1, 1):
    line('white', [(s * (RW / 2 - 1.0), -RL / 2 + 3), (s * (RW / 2 - 1.0), RL / 2 - 3)], 0.04)
cols = {'white': (240, 244, 246), 'red': (218, 54, 48)}
for k, a in (('white', 0.6), ('red', 0.92)):
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
save(normal_from_height(n1 * 0.2 + (~groove) * 0.2, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE bianche col piede giallo
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([244, 245, 244], np.float32)
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
        fn(img, int(xm * pxm), 24, int((xm + wm) * pxm), h - 50)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(260):                                   # segni delle palline
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
    d.rectangle([x0, y1 - 12, x1, y1], fill=LIME + (255,))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 10, y0 + 4, x0 + 10 + int(h * 1.2), y1 - 14))
    paste_fit(img, text_layer('ALAS', 'ariblk.ttf', LIME), (x0 + int(h * 1.2) + 30, y0 + 14, x1 - 20, y0 + h // 2 + 2), 'left')
    paste_fit(img, text_layer('DE SAGUNTO', 'ariblk.ttf', WHITE), (x0 + int(h * 1.2) + 30, y0 + h // 2 + 10, x1 - 20, y1 - 22), 'left')


def sagunt_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255, 255), outline=(150, 30, 50, 255), width=6)
    paste_fit(img, text_layer('SAGUNT • SAGUNTO', 'georgia.ttf', (150, 30, 50), spacing=6), (x0 + 30, y0 + 22, x1 - 30, y1 - 22))


def valencia_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=VAL_BLUE + (255,))
    hh = (y1 - y0) // 4
    for k in range(4):                                      # le quattro barre rosse su fondo giallo, stilizzate
        d.rectangle([x0 + 16 + k * 22, y0 + 14, x0 + 26 + k * 22, y1 - 14], fill=(RED if k % 2 else YEL) + (255,))
    paste_fit(img, text_layer('COMUNITAT VALENCIANA', 'arialbd.ttf', WHITE, spacing=4), (x0 + 120, y0 + hh, x1 - 24, y1 - hh), 'left')


def liga_panel(img, x0, y0, x1, y1):
    paste_fit(img, text_layer('LIGA ÉLITE HOCKEY LÍNEA', 'impact.ttf', BLACK, spacing=6), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


def camp_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=LIME + (255,))
    paste_fit(img, text_layer('CAMP DE MORVEDRE', 'ariblk.ttf', BLACK, spacing=4), (x0 + 30, y0 + 24, x1 - 30, y1 - 24))


save(board_strip(panels=[(1.0, 2.2, logo_panel), (4.0, 4.4, sagunt_panel), (12.5, 4.6, liga_panel)]), 'boards_a.jpg')
save(board_strip(panels=[(1.5, 4.6, valencia_panel), (10.5, 2.2, logo_panel), (13.5, 4.2, camp_panel)]), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 5.6, club_panel), (11.0, 4.4, sagunt_panel)]), 'boards_center.jpg')
save(board_strip(1024, 256, panels=[(6.5, 3.6, logo_panel)]), 'boards_corner.jpg')

# ================================================================== 3. EDIFICIO
print('edificio')
# blocchi di cemento grigio-beige (40 x 20 cm), texture 4 x 2,6 m
W, H = 512, 336
PXs = W / 4.0
bl = np.zeros((H, W, 3), np.float32) + np.array([186, 180, 166], np.float32)
bl += ((fft_noise(H, W, beta=1.5) - 0.5) * 18)[..., None]
im = to_img(bl)
d = ImageDraw.Draw(im)
rows = int(round(H / (0.2 * PXs)))
for r in range(rows + 1):
    y = int(r * 0.2 * PXs)
    off = (r % 2) * 0.2
    for k in range(-1, 11):
        x0 = int((k * 0.4 + off) * PXs)
        tint = random.uniform(-10, 8)
        d.rectangle([x0 + 1, y + 1, x0 + int(0.4 * PXs) - 1, y + int(0.2 * PXs) - 1], fill=tuple(int(c + tint) for c in (186, 180, 166)))
        d.line([(x0, y), (x0, y + int(0.2 * PXs))], fill=(150, 146, 136), width=2)
    d.line([(0, y), (W, y)], fill=(150, 146, 136), width=2)
spk = Image.new('RGBA', im.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(spk)
for _ in range(2200):                                       # porosità del cemento
    x, y = random.uniform(0, W), random.uniform(0, H)
    r = random.uniform(0.4, 1.3)
    sd.ellipse([x - r, y - r, x + r, y + r], fill=(110, 106, 98, random.randint(40, 110)))
im = im.convert('RGBA'); im.alpha_composite(spk)
save(im.convert('RGB').filter(ImageFilter.GaussianBlur(0.4)), 'block_wall.jpg')

# pannelli di policarbonato traslucido delle pareti (chiaro, con le nervature verticali e le ombre dell'esterno)
W, H = 512, 512
pc = np.zeros((H, W, 3), np.float32) + np.array([214, 224, 228], np.float32)
pc += ((resized_noise(16, 32, 1.4, H, W) - 0.5) * 34)[..., None]          # sagome sfocate degli edifici fuori
pc[H // 2:, :] *= np.array([0.92, 0.95, 0.9], np.float32)                   # in basso un po' di verde e di case
xx = np.arange(W)[None, :]
pc *= (1 - 0.06 * ((xx % 16) < 2))[..., None]                               # nervature delle lastre alveolari
pc *= (1 - 0.25 * ((xx % 256) < 6))[..., None]                              # montanti ogni 2 m
yy = np.arange(H)[:, None]
pc *= (1 - 0.22 * ((yy % 256) < 5))[..., None]                              # traverso a metà
save(to_img(pc).filter(ImageFilter.GaussianBlur(0.5)), 'poly_wall.jpg')

# copertura: lastre traslucide bianche (fascia centrale) e lastre azzurre ai lati, con le greche
W = H = 512
u = np.arange(W)[None, :] / W
rib = (np.sin(u * np.pi * 2 * 16) > 0.55)
rw = np.zeros((H, W, 3), np.float32) + np.array([240, 244, 246], np.float32)
rw += ((fft_noise(H, W, beta=2.2) - 0.5) * 8)[..., None]
rw *= (1 - 0.1 * rib)[..., None]
save(to_img(rw).filter(ImageFilter.GaussianBlur(0.6)), 'roof_light.jpg')
rb = np.zeros((H, W, 3), np.float32) + np.array([86, 142, 196], np.float32)
rb += ((fft_noise(H, W, beta=2.2) - 0.5) * 10)[..., None]
rb *= (1 - 0.18 * rib)[..., None]
save(to_img(rb).filter(ImageFilter.GaussianBlur(0.6)), 'roof_blue.jpg')

# telo frangivento blu (texture 4 x 2 m) con le cuciture e le pieghe
W, H = 512, 256
wb = np.zeros((H, W, 3), np.float32) + np.array([34, 96, 190], np.float32)
wb += ((resized_noise(16, 64, 1.6, H, W) - 0.5) * 22)[..., None]
wb *= (0.92 + 0.08 * np.sin(np.arange(W)[None, :] / W * np.pi * 2 * 6))[..., None]
im = to_img(wb)
d = ImageDraw.Draw(im)
for k in range(0, W, 4):
    d.line([(k, 0), (k, H)], fill=(28, 84, 168), width=1)
d.line([(0, 8), (W, 8)], fill=(220, 226, 236), width=4)
for x in range(32, W, 128):
    d.ellipse([x - 5, 3, x + 5, 13], fill=(180, 184, 190), outline=(90, 90, 96))
save(im, 'windscreen.jpg')

# rete scura dietro le porte
W = H = 256
net = Image.new('RGBA', (W, H), (0, 0, 0, 0))
nd = ImageDraw.Draw(net)
for k in range(0, W + 1, 16):
    nd.line([(k, 0), (k, H)], fill=(24, 26, 30, 190), width=2)
    nd.line([(0, k), (W, k)], fill=(24, 26, 30, 190), width=2)
save(net, 'net.png')

# rete metallica a maglie quadre della recinzione davanti alla tribuna (trasparente)
W = H = 256
mesh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
md = ImageDraw.Draw(mesh)
for k in range(0, W + 1, 32):
    md.line([(k, 0), (k, H)], fill=(150, 154, 158, 235), width=4)
    md.line([(0, k), (W, k)], fill=(150, 154, 158, 235), width=4)
save(mesh, 'mesh_fence.png')

# ================================================================== 4. STRISCIONE DEL CLUB
print('striscioni')
b = Image.new('RGBA', (1024, 384), BLACK + (255,))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 0, 1024, 20], fill=LIME)
bd.rectangle([0, 364, 1024, 384], fill=LIME)
paste_fit(b, LOGO, (30, 32, 400, 352))
paste_fit(b, text_layer('ALAS', 'ariblk.ttf', LIME), (430, 70, 990, 190), 'left')
paste_fit(b, text_layer('DE SAGUNTO', 'ariblk.ttf', WHITE), (430, 210, 990, 320), 'left')
save(banner_finish(b), 'banner_club.jpg', quality=86)
print('fatto')
