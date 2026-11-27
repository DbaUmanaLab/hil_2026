"""Genera le texture della pista all'aperto di Campomarino (Kemarin Hockey) in assets/textures/kemarin/.
Uso (dalla cartella del progetto): python tools/generate_kemarin_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/kemarin.jpg e le foto della pista: cemento lisciato a lastre con le fughe,
righe azzurre, balaustre basse scure coperte di striscioni bianchi (molti con il disegno a pietra),
recinzione con il telo verde scuro, la chiesa bianca con i campanili e i condomini in mattoni.
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'kemarin')
os.makedirs(OUT, exist_ok=True)
random.seed(86)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'kemarin.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
NAVY, GOLD, WHITE, BLACK = (20, 36, 74), (201, 154, 46), (255, 255, 255), (24, 24, 26)
LINE = (104, 168, 214)


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


# ================================================================== 1. PISTA: cemento lisciato a lastre, righe azzurre
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
n1 = resized_noise(512, 256, 2.0, H, W)
n2 = resized_noise(128, 64, 2.8, H, W)
n3 = resized_noise(64, 32, 1.6, H, W)                       # chiazze larghe (umidità, usura)
col = np.zeros((H, W, 3), np.float32) + np.array([152, 156, 158], np.float32)
col += ((n1 - 0.5) * 16)[..., None]
col += ((n2 - 0.5) * 10)[..., None]
col += ((n3 - 0.5) * 18)[..., None]
# lastre di 6 m con le fughe di dilatazione: tono leggermente diverso per lastra
X = (np.arange(W)[None, :] + 0.5) / S + RW / 2 * 0 - 0
Z = (np.arange(H)[:, None] + 0.5) / S
SL = 6.0
sx, sz = np.floor(X / SL).astype(int), np.floor(Z / SL).astype(int)
tone = np.random.default_rng(3).normal(0, 2.0, (int(RL / SL) + 2, int(RW / SL) + 2))
col += tone[np.broadcast_to(sz, (H, W)), np.broadcast_to(sx, (H, W))][..., None]
joint = np.broadcast_to(((X / SL) % 1.0) < 0.004, (H, W)) | np.broadcast_to(((Z / SL) % 1.0) < 0.002, (H, W))
col[joint] *= 0.72

SS = 2
mask = Image.new('L', (W * SS, H * SS), 0)
d = ImageDraw.Draw(mask)
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)


def rect(x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    d.rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def ring(x, z, r, wdt):
    c = P(x, z); R = r * S * SS
    d.ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], outline=255, width=max(1, int(wdt * S * SS)))


def dot(x, z, r):
    c = P(x, z); R = r * S * SS
    d.ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], fill=255)


rect(-RW / 2, -0.05, RW / 2, 0.05)
ring(0, 0, 4.5, 0.07)
dot(0, 0, 0.2)
for sgn in (-1, 1):
    rect(-RW / 2 + 1.4, sgn * 31 - 0.04, RW / 2 - 1.4, sgn * 31 + 0.04)
    for x in (-8.5, 8.5):
        ring(x, sgn * 21, 4.5, 0.06)
        dot(x, sgn * 21, 0.25)
m = np.asarray(mask.filter(ImageFilter.GaussianBlur(1.2)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
wear = (0.55 + 0.45 * n2)[..., None]                                   # vernice consumata dalle ruote
col = col * (1 - m * 0.85 * wear) + np.array(LINE, np.float32) * m * 0.85 * wear

img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(2200):                                                   # segni delle ruote e macchie
    px, py = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(20, 180); a0 = random.uniform(0, 180)
    sd.arc([px - ln, py - ln, px + ln, py + ln], a0, a0 + random.uniform(10, 50), fill=(50, 52, 56, random.randint(8, 18)), width=random.randint(1, 3))
for _ in range(60):
    px, py, r = random.uniform(0, W), random.uniform(0, H), random.uniform(10, 50)
    sd.ellipse([px - r, py - r * 0.7, px + r, py + r * 0.7], fill=(70, 72, 74, random.randint(10, 26)))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.4)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.3 + n2 * 0.3 - joint.astype(np.float32) * 0.6, 0.9), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE scure coperte di striscioni
print('balaustre')


def stone(img, x0, y0, x1, y1, dark=False):
    """disegno a pietra crepata (bianco con le venature grigie), come molti striscioni delle foto"""
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=(40, 40, 42, 255) if dark else (244, 244, 242, 255))
    for _ in range(int((x1 - x0) * (y1 - y0) / 900)):
        cx, cy = random.uniform(x0, x1), random.uniform(y0, y1)
        pts = [(cx, cy)]
        for _ in range(random.randint(2, 4)):
            cx += random.uniform(-26, 26); cy += random.uniform(-14, 14)
            pts.append((min(max(cx, x0), x1), min(max(cy, y0), y1)))
        d.line(pts, fill=(150, 150, 152, 255) if not dark else (210, 210, 212, 255), width=random.choice([1, 2, 2, 3]))


def text_banner(txt, font, fg, bg=(250, 250, 248), sub=None, stone_bg=False):
    def fn(img, x0, y0, x1, y1):
        d = ImageDraw.Draw(img)
        if stone_bg:
            stone(img, x0, y0, x1, y1)
        else:
            d.rectangle([x0, y0, x1, y1], fill=bg + (255,))
        h = y1 - y0
        paste_fit(img, text_layer(txt, font, fg, spacing=4), (x0 + 24, y0 + 10, x1 - 24, y0 + h * (0.62 if sub else 0.9)))
        if sub:
            paste_fit(img, text_layer(sub, 'arialbd.ttf', (80, 80, 84), spacing=4), (x0 + 50, y0 + h * 0.68, x1 - 50, y1 - 10))
    return fn


def kemarin_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=WHITE + (255,))
    d.rectangle([x0, y1 - 12, x1, y1], fill=GOLD + (255,))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 8, y0 + 4, x0 + 8 + int(h * 0.85), y1 - 14))
    paste_fit(img, text_layer('KEMARIN', 'ariblk.ttf', NAVY, spacing=6), (x0 + int(h * 0.95) + 16, y0 + 14, x1 - 20, y0 + h * 0.6), 'left')
    paste_fit(img, text_layer('HOCKEY • CAMPOMARINO', 'arialbd.ttf', GOLD, spacing=4), (x0 + int(h * 0.95) + 16, y0 + h * 0.64, x1 - 20, y1 - 20), 'left')


def stone_plain(img, x0, y0, x1, y1):
    stone(img, x0, y0, x1, y1)


def stone_dark(img, x0, y0, x1, y1):
    stone(img, x0, y0, x1, y1, dark=True)


def board_strip(panels, w=4096, h=256):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([58, 56, 54], np.float32)    # balaustra scura
    arr += ((n - 0.5) * 10)[..., None]
    img = to_img(arr).convert('RGBA')
    pxm = w / 18.5
    x = 0.08
    for wm, fn in panels:                           # striscioni uno accanto all'altro, appena spaziati
        fn(img, int(x * pxm), 10, int((x + wm) * pxm), h - 52)
        x += wm + 0.12
    d = ImageDraw.Draw(img)
    for xm in np.arange(0.5, 18.5, 1.5):            # fascette che legano gli striscioni
        for y in (14, h - 56):
            xx = int(xm * pxm)
            d.rectangle([xx - 3, y - 3, xx + 3, y + 3], fill=(30, 30, 32, 255))
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(240):
        x0, y0 = random.uniform(0, w), random.uniform(h * 0.4, h - 10)
        r = random.uniform(3, 8)
        sd.ellipse([x0 - r, y0 - r * 0.6, x0 + r, y0 + r * 0.6], fill=(30, 30, 36, random.randint(14, 46)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


WHITE_B = text_banner('WHITE', 'georgiab.ttf', BLACK, stone_bg=True)
SMERALDO = text_banner('Smeraldo', 'segoescb.ttf', (40, 160, 140))
SOUL = text_banner('SOULSTREET', 'times.ttf', (60, 60, 64))
SALUS = text_banner('salus', 'arialbd.ttf', (90, 90, 96), stone_bg=True)
MEDIO = text_banner('mediolanum', 'arialbd.ttf', (40, 60, 120))
EFFEGI = text_banner('EFFEGI', 'ariblk.ttf', (40, 60, 140))
save(board_strip([(3.0, kemarin_panel), (2.4, stone_plain), (2.6, SMERALDO), (2.2, stone_dark), (2.6, WHITE_B), (2.4, stone_plain), (2.6, SOUL)]), 'boards_a.jpg')
save(board_strip([(2.4, stone_plain), (2.6, MEDIO), (2.2, stone_plain), (3.0, kemarin_panel), (2.4, SALUS), (2.4, stone_dark), (2.6, EFFEGI)]), 'boards_b.jpg')
save(board_strip([(2.6, SOUL), (2.4, stone_plain), (3.0, kemarin_panel), (2.4, stone_plain), (2.6, WHITE_B), (2.4, stone_dark), (2.4, stone_plain)]), 'boards_center.jpg')
save(board_strip([(2.2, stone_plain), (2.2, stone_plain)], 1024, 256), 'boards_corner.jpg')

# ================================================================== 3. FACCIATE: chiesa e condomini
print('facciate')


def facade(w, h, base, win_rows, win_cols, shutter, frame=None, balconies=False, pipes=0, seed=0):
    rr = random.Random(seed)
    arr = np.zeros((h, w, 3), np.float32) + np.array(base, np.float32)
    arr += ((fft_noise(h, w, beta=2.2) - 0.5) * 12)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    rh = h / win_rows
    for r in range(win_rows):
        for c in range(win_cols):
            cw = w / win_cols
            x0, y0 = c * cw + cw * 0.28, r * rh + rh * 0.25
            x1, y1 = x0 + cw * 0.44, y0 + rh * 0.5
            if frame:
                d.rectangle([x0 - 4, y0 - 4, x1 + 4, y1 + 4], fill=frame)
            d.rectangle([x0, y0, x1, y1], fill=shutter)
            for k in range(1, 8):                                   # lamelle della tapparella
                yy = y0 + (y1 - y0) * k / 8
                d.line([(x0, yy), (x1, yy)], fill=tuple(max(0, v - 18) for v in shutter[:3]), width=1)
            if balconies and r > 0:
                d.rectangle([x0 - cw * 0.12, y1 + 2, x1 + cw * 0.12, y1 + rh * 0.12], fill=(236, 232, 224, 255))
                d.rectangle([x0 - cw * 0.12, y1 - rh * 0.16, x1 + cw * 0.12, y1 + 2], outline=(70, 70, 72, 255), width=2)
                if rr.random() < 0.35:                               # tende da sole
                    d.polygon([(x0 - 6, y0 - 8), (x1 + 6, y0 - 8), (x1 + 16, y0 + rh * 0.18), (x0 - 16, y0 + rh * 0.18)],
                              fill=rr.choice([(214, 168, 60, 255), (190, 120, 60, 255), (120, 140, 90, 255)]))
    for k in range(pipes):
        x = int(w * (k + 0.5) / pipes)
        d.rectangle([x - 4, 0, x + 4, h], fill=(70, 50, 40, 255))
    return img.convert('RGB')


save(facade(1024, 512, (232, 232, 228), 3, 12, (190, 192, 194, 255), pipes=4, seed=1), 'church_facade.jpg')
save(facade(512, 512, (196, 108, 72), 4, 5, (150, 140, 130, 255), frame=(226, 222, 214, 255), balconies=True, seed=2), 'flats_brick.jpg')
save(facade(512, 512, (226, 206, 168), 4, 5, (170, 160, 150, 255), frame=(240, 236, 228, 255), balconies=True, seed=3), 'flats_beige.jpg')
roof = np.zeros((128, 256, 3), np.float32) + np.array([176, 92, 60], np.float32)
roof += ((fft_noise(128, 256, beta=2.0) - 0.5) * 20)[..., None]
roof[::8] *= 0.85
save(to_img(roof), 'roof_tiles.jpg')
# telo frangivento verde scuro della recinzione
wind = np.zeros((128, 256, 3), np.float32) + np.array([40, 54, 46], np.float32)
wind += ((fft_noise(128, 256, beta=1.4) - 0.5) * 14)[..., None]
wind[:, ::4] *= 0.9
save(to_img(wind), 'windscreen.jpg')

# ================================================================== 4. SERA: finestre accese (mappe emissive)
# Stesso disegno delle facciate (facade(): righe, colonne, balconi, tende e pluviali), generatore a parte:
# le facciate restano identiche. Finestra accesa = luce calda (o fredda della TV) fra le stecche della tapparella.
print('luci di sera')


def facade_lights(w, h, win_rows, win_cols, balconies=False, pipes=0, seed=0, share=0.5):
    rr = random.Random(seed)                         # ripete le scelte di facade() (tende da sole)
    lr = random.Random(seed + 500)
    img = Image.new('RGB', (w, h), (0, 0, 0))
    d = ImageDraw.Draw(img)
    rh = h / win_rows
    for r in range(win_rows):
        for c in range(win_cols):
            cw = w / win_cols
            x0, y0 = c * cw + cw * 0.28, r * rh + rh * 0.25
            x1, y1 = x0 + cw * 0.44, y0 + rh * 0.5
            if lr.random() < share:
                col = lr.choice([(255, 196, 120), (255, 214, 150), (255, 180, 100), (190, 210, 255)])
                k = lr.uniform(0.6, 0.95)
                d.rectangle([x0, y0, x1, y1], fill=tuple(int(v * k) for v in col))
                for kk in range(1, 8):                   # stecche della tapparella
                    yy = y0 + (y1 - y0) * kk / 8
                    d.line([(x0, yy), (x1, yy)], fill=tuple(int(v * k * 0.45) for v in col), width=1)
            if balconies and r > 0:
                d.rectangle([x0 - cw * 0.12, y1 - rh * 0.16, x1 + cw * 0.12, y1 + 2], outline=(0, 0, 0), width=2)
                if rr.random() < 0.35:
                    rr.choice([0, 1, 2])
                    d.polygon([(x0 - 6, y0 - 8), (x1 + 6, y0 - 8), (x1 + 16, y0 + rh * 0.18), (x0 - 16, y0 + rh * 0.18)], fill=(0, 0, 0))
    for k in range(pipes):
        x = int(w * (k + 0.5) / pipes)
        d.rectangle([x - 4, 0, x + 4, h], fill=(0, 0, 0))
    return img.filter(ImageFilter.GaussianBlur(0.6))


save(facade_lights(1024, 512, 3, 12, pipes=4, seed=1, share=0.25), 'church_facade_lights.jpg')
save(facade_lights(512, 512, 4, 5, balconies=True, seed=2), 'flats_brick_lights.jpg')
save(facade_lights(512, 512, 4, 5, balconies=True, seed=3), 'flats_beige_lights.jpg')
print('fatto')
