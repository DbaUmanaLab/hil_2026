"""Genera le texture della Halle Clemenceau (Yétis de Grenoble) in assets/textures/grenoble/.
Uso (dalla cartella del progetto): python tools/generate_grenoble_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/grenoble.jpg e le foto della sala: pista azzurro chiaro con la riga centrale e i cerchi
rossi e le aree di porta arancio-rosse piene; balaustre bianche coi cartelloni e il bordo giallo in alto; grande
volta in legno scuro su archi lamellari; tende arancioni davanti alle vetrate; la casetta in legno vetrata del
club su una testata e la cabina bianca della regia sul lato lungo; grande tribuna in cemento con le panche di
legno scuro.
Nei cartelloni solo club, città e territorio: niente marchi commerciali.
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'grenoble')
os.makedirs(OUT, exist_ok=True)
random.seed(38000)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'grenoble.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
BLUE, NAVY, RED, WHITE, BLACK = (36, 70, 166), (20, 32, 74), (224, 48, 47), (255, 255, 255), (20, 20, 22)
YEL, ICE = (236, 196, 40), (150, 190, 230)


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


# ================================================================== 1. PISTA azzurro chiaro
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
n1 = resized_noise(512, 256, 2.0, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([184, 214, 232], np.float32)
col += ((n1 - 0.5) * 9)[..., None]
col += ((resized_noise(1024, 512, 1.4, H, W) - 0.5) * 4)[..., None]
TILE = 0.25
gx = ((np.arange(W) / S) % TILE) < (1.0 / S)
gz = ((np.arange(H) / S) % TILE) < (1.0 / S)
groove = gz[:, None] | gx[None, :]
col[groove] *= 0.965

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'orange')}
draws = {k: ImageDraw.Draw(m) for k, m in masks.items()}
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)
px = lambda m: max(1, int(m * S * SS))


def rect(k, x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    draws[k].rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def ring(k, x, z, r, wdt):
    c = P(x, z); R = r * S * SS
    draws[k].arc([c[0] - R, c[1] - R, c[0] + R, c[1] + R], 0, 360, fill=255, width=px(wdt))


rect('red', -RW / 2, -0.12, RW / 2, 0.12)
ring('red', 0, 0, 4.5, 0.06)
for s in (-1, 1):
    rect('red', -RW / 2 + 1.4, s * 31 - 0.05, RW / 2 - 1.4, s * 31 + 0.05)
    rect('orange', -2.0, s * 31, 2.0, s * 29.0)                # area di porta piena, arancio-rossa
    for x in (-8.5, 8.5):
        ring('red', x, s * 21, 4.5, 0.06)
        rect('red', x - 0.3, s * 21 - 0.3, x + 0.3, s * 21 + 0.3)
        rect('red', x - 0.25, s * 8 - 0.25, x + 0.25, s * 8 + 0.25)
for k, c, a in (('orange', (236, 90, 50), 0.9), ('red', (218, 56, 50), 0.9)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(c, np.float32) * m * a
img = to_img(col).convert('RGBA')
# stemma del club a centro pista, appena accennato
cl = LOGO.copy(); cl.thumbnail((int(5.2 * S), int(5.2 * S)))
al = cl.split()[3].point(lambda v: int(v * 0.55)); cl.putalpha(al)
img.alpha_composite(cl, (W // 2 - cl.width // 2, int((RL / 2 - 13) * S) - cl.height // 2))
img.alpha_composite(cl, (W // 2 - cl.width // 2, int((RL / 2 + 13) * S) - cl.height // 2))
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1400):
    cx, cy = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(30, 220); a0 = random.uniform(0, 360)
    sd.arc([cx - ln, cy - ln, cx + ln, cy + ln], a0, a0 + random.uniform(10, 50), fill=(40, 70, 100, random.randint(8, 16)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img, 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.15 + (~groove) * 0.2, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE bianche, bordo giallo in alto
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([246, 246, 244], np.float32)
    arr += ((n - 0.5) * 6)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.rectangle([x - 2, 0, x + 2, h], fill=(214, 216, 216, 255))
    d.rectangle([0, 0, w, 16], fill=YEL + (255,))
    d.rectangle([0, h - 14, w, h], fill=(190, 194, 198, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 36, int((xm + wm) * pxm), h - 34)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(240):
        x, y = random.uniform(0, w), random.uniform(h * 0.4, h - 16)
        r = random.uniform(3, 9)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 44, random.randint(20, 55)))
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
    d.rectangle([x0, y0, x1, y1], fill=NAVY + (255,))
    d.rectangle([x0, y1 - 10, x1, y1], fill=RED + (255,))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 8, y0 + 4, x0 + h, y1 - 12))
    paste_fit(img, text_layer('YÉTIS', 'ariblk.ttf', WHITE), (x0 + h + 20, y0 + 10, x1 - 20, y0 + h // 2 + 2), 'left')
    paste_fit(img, text_layer('ROLLER HOCKEY • GRENOBLE', 'arialbd.ttf', ICE, spacing=3), (x0 + h + 20, y0 + h // 2 + 8, x1 - 20, y1 - 18), 'left')


save(board_strip(panels=[(1.0, 2.2, logo_panel), (4.0, 4.4, text_panel('GRENOBLE', WHITE, BLUE, 'georgia.ttf')), (12.5, 4.8, text_panel('LIGUE ÉLITE ROLLER HOCKEY', WHITE, BLACK, 'impact.ttf'))]), 'boards_a.jpg')
save(board_strip(panels=[(1.5, 4.2, text_panel('ISÈRE', (226, 40, 40), WHITE, 'ariblk.ttf')), (10.5, 2.2, logo_panel), (13.5, 4.6, text_panel('ALPES', (30, 110, 70), WHITE, 'ariblk.ttf'))]), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 6.0, club_panel), (11.5, 4.4, text_panel('GRENOBLE', WHITE, BLUE, 'georgia.ttf'))]), 'boards_center.jpg')
save(board_strip(1024, 256, panels=[(6.5, 3.6, logo_panel)]), 'boards_corner.jpg')

# ================================================================== 3. EDIFICIO
print('edificio')
# volta in legno scuro: doghe lungo l'arco (u = lungo la sala 6 m, v = lungo l'arco 4 m)
W = H = 512
wd = np.zeros((H, W, 3), np.float32) + np.array([88, 58, 36], np.float32)
wd += ((resized_noise(256, 16, 1.4, H, W) - 0.5) * 26)[..., None]
x = np.arange(W)[None, :]
wd *= (1 - 0.18 * ((x % 22) < 2))[..., None]                                # doghe
wd *= (1 - 0.25 * ((np.arange(H)[:, None] % 256) < 6))[..., None]            # coprigiunti trasversali
save(to_img(wd).filter(ImageFilter.GaussianBlur(0.5)), 'vault_wood.jpg')
# legno lamellare degli archi (texture 4 x 1 m)
W, H = 512, 128
gl = np.zeros((H, W, 3), np.float32) + np.array([118, 74, 42], np.float32)
gl += ((resized_noise(8, 256, 1.4, H, W) - 0.5) * 24)[..., None]
gl *= (1 - 0.1 * ((np.arange(H)[:, None] % 21) < 2))[..., None]
save(to_img(gl), 'glulam.jpg')
# tende arancioni a pieghe (texture 3 x 7 m)
W, H = 256, 512
ct = np.zeros((H, W, 3), np.float32) + np.array([226, 108, 40], np.float32)
ct *= (0.78 + 0.22 * np.sin(np.arange(W)[None, :] / W * np.pi * 2 * 9))[..., None]
ct += ((resized_noise(64, 16, 1.6, H, W) - 0.5) * 10)[..., None]
save(to_img(ct), 'curtain.jpg')
# casetta del club in legno vetrata (20 x 7 m): piano terra porticato, piano alto a finestre
W, H = 2000, 700
PXc = W / 20.0
cb = np.zeros((H, W, 3), np.float32) + np.array([176, 120, 66], np.float32)
cb += ((resized_noise(16, 128, 1.4, H, W) - 0.5) * 22)[..., None]
im = to_img(cb)
d = ImageDraw.Draw(im)
d.rectangle([0, int(2.6 * PXc), W, int(3.1 * PXc)], fill=(140, 92, 50))          # solaio
for k in range(15):                                                              # finestre del piano alto
    x0 = int((0.5 + k * 1.3) * PXc)
    d.rectangle([x0, int(0.5 * PXc), x0 + int(1.1 * PXc), int(2.3 * PXc)], fill=(150, 168, 178), outline=(110, 70, 36), width=6)
for k in range(9):                                                               # portico al piano terra
    x0 = int((0.4 + k * 2.2) * PXc)
    d.rectangle([x0, int(3.1 * PXc), x0 + int(0.25 * PXc), H], fill=(120, 80, 44))
    d.rectangle([x0 + int(0.35 * PXc), int(3.5 * PXc), x0 + int(2.0 * PXc), int(6.6 * PXc)], fill=(70, 90, 104))
save(im, 'club_house.jpg')
# cabina bianca della regia (6 x 2,4 m) con le finestre
W, H = 600, 240
bo = Image.new('RGB', (W, H), (236, 238, 238))
bd = ImageDraw.Draw(bo)
for k in range(5):
    x0 = 20 + k * 116
    bd.rectangle([x0, 40, x0 + 100, 150], fill=(70, 86, 100), outline=(180, 184, 188), width=6)
bd.rectangle([0, 170, W, 214], fill=(46, 70, 166))
save(bo, 'booth.jpg')
# striscione del club
b = Image.new('RGBA', (1024, 384), NAVY + (255,))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 0, 1024, 22], fill=RED)
bd.rectangle([0, 362, 1024, 384], fill=RED)
paste_fit(b, LOGO, (40, 36, 352, 348))
paste_fit(b, text_layer('YÉTIS', 'ariblk.ttf', WHITE), (390, 70, 990, 200), 'left')
paste_fit(b, text_layer('GRENOBLE', 'ariblk.ttf', ICE, spacing=10), (390, 230, 990, 320), 'left')
save(banner_finish(b), 'banner_club.jpg', quality=86)
print('fatto')
