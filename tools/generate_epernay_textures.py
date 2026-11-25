"""Genera le texture del Gymnase Henri-Viet (Bombardiers d'Épernay) in assets/textures/epernay/.
Uso (dalla cartella del progetto): python tools/generate_epernay_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/epernay.jpg e le foto della sala: pista a piastrelle modulari azzurre con la riga
centrale rossa e le aree di porta arancioni; balaustre bianche con la ringhiera in tubo; parete lunga gialla
con i controventi verdi dipinti e la fascia di finestre traslucide in alto; testate e lato opposto verde scuro
con gli armadietti in legno; controsoffitto a pannelli gialli e verde petrolio a bande diagonali.
Nei cartelloni solo club, città e territorio: niente marchi commerciali.
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'epernay')
os.makedirs(OUT, exist_ok=True)
random.seed(15000)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'epernay.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
GREEN, LIME, BLACK, WHITE, GOLD = (30, 110, 58), (98, 184, 58), (20, 20, 22), (255, 255, 255), (214, 178, 70)


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


# ================================================================== 1. PISTA a piastrelle azzurre
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
n1 = resized_noise(512, 256, 2.0, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([88, 146, 204], np.float32)
col += ((n1 - 0.5) * 10)[..., None]
# piastrelle modulari da 30,5 cm: ognuna leggermente diversa, fughe più scure
TILE = 0.3048
ix = (np.arange(W) / S / TILE).astype(int)
iz = (np.arange(H) / S / TILE).astype(int)
rng = np.random.default_rng(7)
tv = rng.normal(0, 3.0, (iz.max() + 1, ix.max() + 1)).astype(np.float32)
col += tv[iz[:, None], ix[None, :]][..., None]
gx = ((np.arange(W) / S) % TILE) < (1.2 / S)
gz = ((np.arange(H) / S) % TILE) < (1.2 / S)
groove = gz[:, None] | gx[None, :]
col[groove] *= 0.9

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
    draws[k].ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], outline=255, width=px(wdt))


rect('red', -RW / 2, -0.1, RW / 2, 0.1)              # riga centrale rossa
ring('red', 0, 0, 4.5, 0.05)
rect('orange', -0.3, -0.3, 0.3, 0.3)
for s in (-1, 1):
    rect('red', -RW / 2 + 1.4, s * 31 - 0.04, RW / 2 - 1.4, s * 31 + 0.04)
    rect('orange', -1.8, s * 31, 1.8, s * 28.8)      # area di porta piena arancione
    for x in (-8.5, 8.5):
        rect('orange', x - 0.3, s * 21 - 0.3, x + 0.3, s * 21 + 0.3)
        rect('orange', x - 0.22, s * 8 - 0.22, x + 0.22, s * 8 + 0.22)
cols = {'red': (206, 64, 52), 'orange': (226, 110, 64)}
for k, a in (('red', 0.85), ('orange', 0.92)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(cols[k], np.float32) * m * a
img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1500):
    cx, cy = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(30, 220); a0 = random.uniform(0, 360)
    sd.arc([cx - ln, cy - ln, cx + ln, cy + ln], a0, a0 + random.uniform(10, 50), fill=(30, 50, 80, random.randint(8, 18)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img, 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.15 + (~groove) * 0.25, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE bianche coi cartelloni
print('balaustre')


def board_strip(w=4096, h=256, panels=()):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([242, 242, 238], np.float32)
    arr += ((n - 0.5) * 7)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 2.0):
        x = int(xm * pxm)
        d.rectangle([x - 3, 0, x + 3, h], fill=(204, 204, 200, 255))
    d.rectangle([0, 0, w, 8], fill=(150, 152, 156, 255))
    d.rectangle([0, h - 16, w, h], fill=(170, 172, 172, 255))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 40, int((xm + wm) * pxm), h - 40)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(320):
        x, y = random.uniform(0, w), random.uniform(h * 0.35, h - 18)
        r = random.uniform(3, 9)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(40, 40, 44, random.randint(20, 60)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def logo_panel(img, x0, y0, x1, y1):
    paste_fit(img, LOGO, (x0 + 6, y0 + 2, x1 - 6, y1 - 2))


def text_panel(t, bg, fg, font='arialbd.ttf', sub=None, subcol=None):
    def f(img, x0, y0, x1, y1):
        ImageDraw.Draw(img).rectangle([x0, y0, x1, y1], fill=bg + (255,), outline=(170, 170, 170, 255), width=3)
        if sub:
            mid = y0 + (y1 - y0) * 0.62
            paste_fit(img, text_layer(t, font, fg, spacing=4), (x0 + 24, y0 + 12, x1 - 24, int(mid)))
            paste_fit(img, text_layer(sub, 'arial.ttf', subcol or fg, spacing=3), (x0 + 24, int(mid) + 4, x1 - 24, y1 - 10))
        else:
            paste_fit(img, text_layer(t, font, fg, spacing=4), (x0 + 24, y0 + 16, x1 - 24, y1 - 16))
    return f


def club_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=BLACK + (255,))
    d.rectangle([x0, y1 - 10, x1, y1], fill=LIME + (255,))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 8, y0 + 2, x0 + int(h * 1.1), y1 - 12))
    paste_fit(img, text_layer('BOMBARDIERS', 'ariblk.ttf', WHITE), (x0 + int(h * 1.1) + 20, y0 + 10, x1 - 20, y0 + h // 2 + 2), 'left')
    paste_fit(img, text_layer('ROLLER HOCKEY • ÉPERNAY', 'arialbd.ttf', LIME, spacing=3), (x0 + int(h * 1.1) + 20, y0 + h // 2 + 8, x1 - 20, y1 - 18), 'left')


save(board_strip(panels=[(1.0, 2.2, logo_panel), (4.2, 4.4, text_panel('ÉPERNAY', WHITE, BLACK, 'georgiab.ttf')), (12.0, 5.0, text_panel('Marne', GREEN, WHITE, 'arialbd.ttf', 'LE DÉPARTEMENT'))]), 'boards_a.jpg')
save(board_strip(panels=[(1.5, 4.6, text_panel('Grand Est', WHITE, BLACK, 'arialbd.ttf', 'LA RÉGION', (90, 90, 96))), (10.5, 2.2, logo_panel), (13.5, 4.4, text_panel('CHAMPAGNE', BLACK, GOLD, 'georgiab.ttf'))]), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 6.0, club_panel), (11.5, 4.4, text_panel('ÉPERNAY', WHITE, BLACK, 'georgiab.ttf'))]), 'boards_center.jpg')
save(board_strip(1024, 256, panels=[(6.5, 3.6, logo_panel)]), 'boards_corner.jpg')

# ================================================================== 3. EDIFICIO
print('edificio')
# parete gialla (blocchi intonacati e verniciati), texture 4 x 4 m
W = H = 512
yw = np.zeros((H, W, 3), np.float32) + np.array([232, 200, 34], np.float32)
yw += ((fft_noise(H, W, beta=2.2) - 0.5) * 12)[..., None]
im = to_img(yw)
d = ImageDraw.Draw(im)
for r in range(21):
    d.line([(0, int(r * 0.2 * W / 4)), (W, int(r * 0.2 * W / 4))], fill=(214, 184, 30), width=1)
save(im.filter(ImageFilter.GaussianBlur(0.5)), 'wall_yellow.jpg')
# parete verde scuro (testate e lato dei cronometristi), texture 4 x 4 m
gw = np.zeros((H, W, 3), np.float32) + np.array([26, 104, 66], np.float32)
gw += ((fft_noise(H, W, beta=2.2) - 0.5) * 10)[..., None]
im = to_img(gw)
d = ImageDraw.Draw(im)
for k in range(0, W, 64):                                       # pannelli verticali
    d.line([(k, 0), (k, H)], fill=(20, 88, 56), width=2)
save(im.filter(ImageFilter.GaussianBlur(0.5)), 'wall_green.jpg')
# controsoffitto: pannelli da 1,2 m gialli e verde petrolio a bande diagonali, profili chiari (texture 7,2 x 7,2 m: 6 x 6 pannelli)
W = H = 768
N = 6
pw = W // N
cs = Image.new('RGB', (W, H))
d = ImageDraw.Draw(cs)
for i in range(N):
    for j in range(N):
        teal = (i - j) % 3 == 0
        base = (34, 140, 118) if teal else (214, 196, 76)
        v = random.randint(-8, 8)
        d.rectangle([i * pw, j * pw, (i + 1) * pw, (j + 1) * pw], fill=tuple(max(0, min(255, c + v)) for c in base))
arr = np.asarray(cs).astype(np.float32)
arr += ((fft_noise(H, W, beta=1.6) - 0.5) * 14)[..., None]
cs = to_img(arr)
d = ImageDraw.Draw(cs)
for k in range(0, W + 1, pw):
    d.line([(k, 0), (k, H)], fill=(226, 228, 220), width=5)
    d.line([(0, k), (W, k)], fill=(226, 228, 220), width=5)
save(cs.filter(ImageFilter.GaussianBlur(0.6)), 'ceiling.jpg')
# fascia di finestre traslucide (pannelli opalini a montanti verdi), 6 x 3 m per campata
W, H = 768, 384
wf = np.zeros((H, W, 3), np.float32) + np.array([236, 240, 236], np.float32)
wf += ((resized_noise(16, 32, 1.4, H, W) - 0.5) * 14)[..., None]
wf[: H // 2] += 6
im = to_img(wf)
d = ImageDraw.Draw(im)
for k in range(0, W + 1, W // 6):
    d.rectangle([k - 5, 0, k + 5, H], fill=(70, 150, 70))
d.rectangle([0, H // 2 - 4, W, H // 2 + 4], fill=(70, 150, 70))
d.rectangle([0, 0, W, 8], fill=(70, 150, 70))
d.rectangle([0, H - 8, W, H], fill=(70, 150, 70))
save(im, 'window_band.jpg')
# armadietti in legno con le griglie di aerazione (2 m di fronte, 2,2 m di altezza)
W, H = 512, 560
lk = np.zeros((H, W, 3), np.float32) + np.array([190, 142, 92], np.float32)
lk += ((resized_noise(64, 16, 1.2, H, W) - 0.5) * 22)[..., None]
im = to_img(lk)
d = ImageDraw.Draw(im)
for k in range(4):
    x0 = k * W // 4
    d.rectangle([x0, 0, x0 + W // 4 - 1, H - 1], outline=(110, 76, 44), width=4)
    for r in range(3):
        y0 = 30 + r * 26
        d.rectangle([x0 + 18, y0, x0 + W // 4 - 18, y0 + 14], fill=(70, 46, 26))
    d.rectangle([x0 + W // 4 - 26, H // 2 - 20, x0 + W // 4 - 18, H // 2 + 20], fill=(60, 60, 60))
d.rectangle([0, H - 30, W, H], fill=(96, 66, 38))
save(im, 'lockers.jpg')
# rete bianca (tende divisorie e reti dietro le porte)
W = H = 256
net = Image.new('RGBA', (W, H), (0, 0, 0, 0))
nd = ImageDraw.Draw(net)
for k in range(0, W + 1, 16):
    nd.line([(k, 0), (k, H)], fill=(236, 232, 220, 210), width=2)
    nd.line([(0, k), (W, k)], fill=(236, 232, 220, 210), width=2)
save(net, 'net.png')
# tenda divisoria verde oliva raccolta (pieghe verticali)
W, H = 256, 512
u = np.arange(W)[None, :] / W
cu = np.zeros((H, W, 3), np.float32) + np.array([96, 112, 58], np.float32)
cu *= (0.78 + 0.22 * np.sin(u * np.pi * 2 * 7))[..., None]
cu += ((fft_noise(H, W, beta=2.0) - 0.5) * 8)[..., None]
save(to_img(cu), 'curtain.jpg')

# ================================================================== 4. STENDARDI E STRISCIONI
print('stendardi')
# stendardo bianco del club (appeso alla testata), 1 x 2,4 m
W, H = 256, 614
pn = Image.new('RGBA', (W, H), (0, 0, 0, 0))
pd = ImageDraw.Draw(pn)
pd.polygon([(0, 0), (W, 0), (W, H - 60), (W // 2, H), (0, H - 60)], fill=(246, 246, 242, 255))
pd.rectangle([0, 0, W, 16], fill=LIME + (255,))
paste_fit(pn, LOGO, (20, 40, W - 20, 250))
paste_fit(pn, text_layer('BOMBARDIERS', 'ariblk.ttf', BLACK), (16, 280, W - 16, 330))
paste_fit(pn, text_layer('ÉPERNAY', 'arialbd.ttf', GREEN, spacing=4), (30, 350, W - 30, 400))
paste_fit(pn, text_layer('ROLLER HOCKEY', 'arial.ttf', (90, 90, 96), spacing=3), (30, 420, W - 30, 460))
save(pn, 'pennant.png')
# striscione del club
b = Image.new('RGBA', (1024, 384), BLACK + (255,))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 0, 1024, 22], fill=LIME)
bd.rectangle([0, 362, 1024, 384], fill=LIME)
paste_fit(b, LOGO, (30, 36, 380, 348))
paste_fit(b, text_layer('BOMBARDIERS', 'ariblk.ttf', WHITE), (400, 80, 994, 190), 'left')
paste_fit(b, text_layer("D'ÉPERNAY", 'ariblk.ttf', LIME, spacing=10), (400, 220, 994, 320), 'left')
save(banner_finish(b), 'banner_club.jpg', quality=86)
# striscione della città (bianco, scritte verdi)
W, H = 2048, 256
cb = Image.new('RGBA', (W, H), (246, 246, 240, 255))
cd = ImageDraw.Draw(cb)
cd.rectangle([0, 0, W, 14], fill=GREEN)
cd.rectangle([0, H - 14, W, H], fill=GREEN)
paste_fit(cb, text_layer('ÉPERNAY • CAPITALE DU CHAMPAGNE', 'georgiab.ttf', GREEN, spacing=6), (60, 40, W - 60, H - 40))
save(banner_finish(cb), 'banner_city.jpg', quality=86)
print('fatto')
