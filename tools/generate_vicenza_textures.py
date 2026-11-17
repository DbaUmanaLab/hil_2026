"""Genera le texture del PalaFerrarin di Vicenza in assets/textures/vicenza/.
Uso (dalla cartella del progetto): python tools/generate_vicenza_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
La normal map della pista è condivisa con Cittadella (stesse piastrelle SportCourt).
"""
import sys, os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish, rng

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'vicenza')
os.makedirs(os.path.join(OUT, 'banners'), exist_ok=True)
random.seed(1949)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'vicenza.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())


def save(img, name, quality=88):
    path = os.path.join(OUT, name)
    if name.endswith('.png'):
        img.save(path, optimize=True)
    else:
        img.convert('RGB').save(path, quality=quality, optimize=True, progressive=True)
    print('  ', name, img.size, os.path.getsize(path) // 1024, 'KB')


RED = (206, 28, 36)


# ------------------------------------------------------------------ pannelli sponsor
def mc_logo(img, box):
    """Logo giallo 'mc' con tracciato a elettrocardiogramma."""
    x0, y0, x1, y1 = box
    d = ImageDraw.Draw(img)
    d.rectangle(box, fill=(250, 222, 30))
    d.rectangle(box, outline=(120, 150, 40), width=max(2, (x1 - x0) // 60))
    w, h = x1 - x0, y1 - y0
    pts = [(x0 + w * 0.06, y0 + h * 0.62), (x0 + w * 0.3, y0 + h * 0.62), (x0 + w * 0.36, y0 + h * 0.3),
           (x0 + w * 0.44, y0 + h * 0.85), (x0 + w * 0.5, y0 + h * 0.5), (x0 + w * 0.94, y0 + h * 0.5)]
    d.line(pts, fill=(60, 140, 60), width=max(2, h // 22))
    paste_fit(img, text_layer('mc', 'arialbd.ttf', (40, 120, 50)), (int(x0 + w * 0.5), int(y0 + h * 0.08), int(x1 - w * 0.06), int(y0 + h * 0.48)))
    paste_fit(img, text_layer('Controls', 'segoeuib.ttf', (40, 120, 50)), (int(x0 + w * 0.42), int(y0 + h * 0.62), int(x1 - w * 0.06), int(y1 - h * 0.08)))


def panel(name, w, h):
    img = Image.new('RGBA', (w, h), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    m = int(h * 0.12)

    def bg(col):
        d.rectangle([0, 0, w, h], fill=col)

    if name == 'mc':
        mc_logo(img, (m, m, m + int((h - 2 * m) * 1.3), h - m))
        paste_fit(img, text_layer('CONTROLLI', 'arialbd.ttf', (40, 40, 40)), (m * 2 + int((h - 2 * m) * 1.3), int(h * 0.18), w - m, int(h * 0.48)), 'left')
        paste_fit(img, text_layer('NON DISTRUTTIVI', 'arialbd.ttf', (40, 40, 40)), (m * 2 + int((h - 2 * m) * 1.3), int(h * 0.52), w - m, int(h * 0.82)), 'left')
    elif name == 'mc_square':
        mc_logo(img, (0, 0, w, h))
    elif name == 'verdecasa':
        d.polygon([(m, h // 2), (m + h // 3, m), (m + 2 * h // 3, h // 2)], fill=(46, 140, 70))
        paste_fit(img, text_layer('VERDECASA', 'arialbd.ttf', (46, 120, 60), spacing=6), (m + int(h * 0.8), int(h * 0.2), w - m, int(h * 0.62)), 'left')
        paste_fit(img, text_layer('GIARDINI E ARREDO ESTERNO', 'arialbd.ttf', (110, 110, 110)), (m + int(h * 0.8), int(h * 0.64), w - m, int(h * 0.84)), 'left')
    elif name == 'omr':
        paste_fit(img, text_layer('O.M.R.', 'ariblk.ttf', (20, 50, 120)), (m, int(h * 0.1), int(w * 0.6), int(h * 0.7)), 'left')
        paste_fit(img, text_layer('snc', 'arialbd.ttf', (20, 50, 120)), (int(w * 0.62), int(h * 0.3), w - m, int(h * 0.62)), 'left')
        paste_fit(img, text_layer('OFFICINA MECCANICA', 'arialbd.ttf', (90, 90, 90)), (m, int(h * 0.72), w - m, h - m))
    elif name == 'skypub':
        paste_fit(img, text_layer('sky', 'ariblk.ttf', (0, 110, 190)), (m, int(h * 0.12), int(w * 0.3), int(h * 0.62)), 'left')
        paste_fit(img, text_layer('PUBBLICITÀ', 'ariblk.ttf', (30, 30, 30)), (int(w * 0.31), int(h * 0.16), w - m, int(h * 0.6)), 'left')
        paste_fit(img, text_layer('AGENZIA PUBBLICITARIA', 'arialbd.ttf', (0, 110, 190)), (m, int(h * 0.68), w - m, h - m))
    elif name == 'rodofili':
        paste_fit(img, text_layer('RODOFILI', 'FRAMDCN.TTF', (60, 60, 60), spacing=10), (m, int(h * 0.1), int(w * 0.82), int(h * 0.62)), 'left')
        d.rectangle([int(w * 0.85), int(h * 0.15), w - m, int(h * 0.6)], outline=(60, 60, 60), width=max(2, h // 30))
        paste_fit(img, text_layer('Porte e Finestre', 'segoeuib.ttf', (120, 120, 120)), (m, int(h * 0.66), int(w * 0.7), h - m), 'left')
    elif name == 'fat':
        paste_fit(img, text_layer('F.A.T.', 'impact.ttf', (30, 110, 60), spacing=8), (m, m, int(w * 0.62), int(h * 0.7)), 'left')
        paste_fit(img, text_layer('s.r.l.', 'arialbd.ttf', (30, 110, 60)), (int(w * 0.64), int(h * 0.3), w - m, int(h * 0.6)), 'left')
        paste_fit(img, text_layer('LA QUALITÀ DEGLI UTENSILI', 'arialbd.ttf', (40, 40, 40)), (m, int(h * 0.74), w - m, h - m))
    elif name == 'euler':
        d.rectangle([m, m, m + int(h * 0.6), h - m], fill=(0, 72, 140))
        paste_fit(img, text_layer('EH', 'arialbd.ttf', (255, 255, 255)), (m, int(h * 0.25), m + int(h * 0.6), int(h * 0.75)))
        paste_fit(img, text_layer('EULER HERMES', 'arialbd.ttf', (0, 72, 140)), (m * 2 + int(h * 0.6), int(h * 0.2), w - m, int(h * 0.56)), 'left')
        paste_fit(img, text_layer('AGENZIA GENERALE', 'arialbd.ttf', (110, 110, 110)), (m * 2 + int(h * 0.6), int(h * 0.62), w - m, int(h * 0.82)), 'left')
    elif name == 'sai':
        d.rectangle([m, m, m + int(h * 0.7), h - m], fill=(0, 80, 160))
        paste_fit(img, text_layer('SAI', 'ariblk.ttf', (255, 255, 255)), (m + 4, int(h * 0.25), m + int(h * 0.7) - 4, int(h * 0.75)))
        paste_fit(img, text_layer('FONDIARIA', 'arialbd.ttf', (0, 80, 160), spacing=4), (m * 2 + int(h * 0.7), int(h * 0.3), w - m, int(h * 0.7)), 'left')
    elif name == 'fisep':
        paste_fit(img, text_layer('fisep', 'seguibl.ttf', (0, 90, 170)), (m, int(h * 0.1), int(w * 0.7), int(h * 0.82)), 'left')
        d.polygon([(int(w * 0.76), h - m), (int(w * 0.88), m), (w - m, h - m)], fill=(220, 40, 40))
    elif name == 'diavoli':
        bg((12, 12, 14))
        paste_fit(img, text_layer('DIAVOLI', 'ariblk.ttf', (255, 255, 255), shear=-0.2), (m, int(h * 0.08), w - m, int(h * 0.55)))
        paste_fit(img, text_layer('VICENZA', 'ariblk.ttf', RED, shear=-0.2, spacing=12), (m, int(h * 0.55), w - m, h - m))
    elif name == 'diavoli_big':
        paste_fit(img, LOGO, (m, m // 2, int(h * 1.3), h - m // 2))
        paste_fit(img, LOGO, (w - int(h * 1.3), m // 2, w - m, h - m // 2))
        paste_fit(img, text_layer('DIAVOLI VICENZA', 'ariblk.ttf', (14, 14, 16), shear=-0.2), (int(h * 1.45), int(h * 0.08), w - int(h * 1.45), int(h * 0.7)))
        paste_fit(img, text_layer('INLINE HOCKEY  •  PALAFERRARIN', 'arialbd.ttf', RED, spacing=6), (int(h * 1.45), int(h * 0.72), w - int(h * 1.45), int(h * 0.92)))
    elif name == 'promopost':
        paste_fit(img, text_layer('Promo', 'ariblk.ttf', (40, 40, 40)), (m, int(h * 0.12), int(w * 0.48), int(h * 0.7)), 'right')
        paste_fit(img, text_layer('Post', 'ariblk.ttf', (240, 180, 0)), (int(w * 0.5), int(h * 0.12), w - m, int(h * 0.7)), 'left')
        paste_fit(img, text_layer('SERVIZI POSTALI E SPEDIZIONI', 'arialbd.ttf', (90, 90, 90)), (m, int(h * 0.74), w - m, h - m))
    elif name == 'tecnoforniture':
        paste_fit(img, text_layer('Tecnoforniture', 'seguibl.ttf', (20, 40, 110)), (m, int(h * 0.1), int(w * 0.82), int(h * 0.64)), 'left')
        paste_fit(img, text_layer('25', 'seguibl.ttf', (0, 140, 200)), (int(w * 0.84), int(h * 0.1), w - m, int(h * 0.64)))
        paste_fit(img, text_layer('Industrial Services', 'segoeuib.ttf', (0, 140, 200)), (m, int(h * 0.68), int(w * 0.7), h - m), 'left')
    elif name == 'emo':
        d.ellipse([m, m, m + int(h * 1.4), h - m], outline=(0, 120, 170), width=max(3, h // 18))
        paste_fit(img, text_layer('EMO', 'ariblk.ttf', (40, 140, 60)), (m + int(h * 0.2), int(h * 0.25), m + int(h * 1.2), int(h * 0.68)))
        paste_fit(img, text_layer('INSTALLAZIONE E ASSISTENZA', 'arialbd.ttf', (30, 30, 30)), (m * 2 + int(h * 1.4), int(h * 0.2), w - m, int(h * 0.48)), 'left')
        paste_fit(img, text_layer('IMPIANTI DI SPILLATURA', 'arialbd.ttf', (30, 30, 30)), (m * 2 + int(h * 1.4), int(h * 0.54), w - m, int(h * 0.8)), 'left')
    elif name == 'alma':
        paste_fit(img, text_layer('ALMA', 'georgiab.ttf', (190, 30, 40), spacing=10), (m, int(h * 0.08), int(w * 0.5), int(h * 0.62)), 'left')
        paste_fit(img, text_layer('ABBIGLIAMENTO', 'arialbd.ttf', (60, 60, 60)), (int(w * 0.52), int(h * 0.16), w - m, int(h * 0.4)), 'left')
        paste_fit(img, text_layer('DA LAVORO', 'arialbd.ttf', (60, 60, 60)), (int(w * 0.52), int(h * 0.42), w - m, int(h * 0.62)), 'left')
        d.rectangle([m, int(h * 0.72), w - m, int(h * 0.84)], fill=(190, 30, 40))
    elif name == 'bcc':
        d.rectangle([m, m, m + int(h * 0.55), h - m], fill=(0, 104, 72))
        paste_fit(img, text_layer('BCC', 'arialbd.ttf', (255, 255, 255)), (m + 3, int(h * 0.3), m + int(h * 0.55) - 3, int(h * 0.7)))
        paste_fit(img, text_layer('CASSA RURALE ED ARTIGIANA', 'arialbd.ttf', (40, 40, 40)), (m * 2 + int(h * 0.55), int(h * 0.18), w - m, int(h * 0.46)), 'left')
        paste_fit(img, text_layer('DI BRENDOLA', 'arialbd.ttf', (0, 104, 72)), (m * 2 + int(h * 0.55), int(h * 0.52), w - m, int(h * 0.8)), 'left')
    elif name == 'quadro':
        bg((22, 22, 24))
        paste_fit(img, text_layer('QUADRO  ADVERTISING', 'arial.ttf', (240, 240, 240), spacing=18), (m, int(h * 0.28), w - m, int(h * 0.72)))
    elif name == 'wildcats':
        paste_fit(img, text_layer('WILDCATS', 'COOPBL.TTF', (120, 30, 50)), (int(h * 0.9), int(h * 0.12), w - int(h * 0.9), int(h * 0.75)))
        for cx in (int(h * 0.45), w - int(h * 0.45)):
            d.ellipse([cx - int(h * 0.3), int(h * 0.2), cx + int(h * 0.3), int(h * 0.8)], fill=(120, 30, 50))
        paste_fit(img, text_layer('VICENZA • HOCKEY GIOVANILE', 'arialbd.ttf', (90, 90, 90)), (int(w * 0.25), int(h * 0.78), int(w * 0.75), h - 6))
    elif name == 'lifestyle':
        paste_fit(img, text_layer('LIFESTYLE', 'georgiab.ttf', (20, 20, 20), spacing=8), (int(w * 0.25), int(h * 0.12), int(w * 0.75), int(h * 0.56)))
        paste_fit(img, text_layer('per Via Roma 15', 'BRUSHSCI.TTF', (150, 30, 60)), (int(w * 0.28), int(h * 0.56), int(w * 0.72), h - m))
        for x in (m, w - m - int(h * 0.42)):
            d.rounded_rectangle([x, m, x + int(h * 0.42), h - m], radius=12, fill=(60, 50, 50))
    return img


# ================================================================== 1. PISTA
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
TILE = 0.305
tx = (np.arange(W) / S / TILE).astype(int)
ty = (np.arange(H) / S / TILE).astype(int)
tile_rand = rng.normal(0, 1, (ty.max() + 1, tx.max() + 1))
TR = tile_rand[ty[:, None], tx[None, :]]
col = np.zeros((H, W, 3), np.float32) + np.array([128, 182, 222], np.float32)
col += (TR * 4.0)[..., None]                    # piastrelle visibilmente diverse (pista consumata)
wear = fft_noise(1024, 512, beta=2.2)
wear = np.asarray(Image.fromarray((wear * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(np.float32) / 255
col += ((wear - 0.5) * 16)[..., None]
fx = (np.arange(W) / S) % TILE
fy = (np.arange(H) / S) % TILE
groove = ((fx[None, :] < 0.012) | (fy[:, None] < 0.012))
col[groove] *= 0.9
CR = 7.5
X = (np.arange(W)[None, :] + 0.5) / S - RW / 2
Z = (np.arange(H)[:, None] + 0.5) / S - RL / 2
cx_, cz_ = RW / 2 - CR, RL / 2 - CR
outside = (np.abs(X) > cx_) & (np.abs(Z) > cz_) & (((np.abs(X) - cx_) ** 2 + (np.abs(Z) - cz_) ** 2) > CR ** 2)
col[outside] = np.array([150, 150, 146], np.float32) + (TR[outside] * 2)[..., None]

SS = 2
mask = Image.new('L', (W * SS, H * SS), 0)
md = ImageDraw.Draw(mask)


def P(x, z):
    return ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)


def rect(x0, z0, x1, z1, m=None):
    a, b = P(x0, z0), P(x1, z1)
    (m or md).rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def ring(x, z, r, wdt):
    c = P(x, z)
    R = r * S * SS
    md.ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], outline=255, width=max(1, int(wdt * S * SS)))


GOAL_Z = 31.0
rect(-RW / 2, -0.17, RW / 2, 0.17)                          # linea centrale larga
for sgn in (-1, 1):
    for x in np.arange(-RW / 2, RW / 2, 0.9):                # linea di porta tratteggiata e consumata
        if random.random() > 0.12:
            rect(x, sgn * GOAL_Z - 0.05, x + random.uniform(0.55, 0.85), sgn * GOAL_Z + 0.05)
    rect(-2.4, sgn * GOAL_Z, 2.4, sgn * (GOAL_Z - 2.3))      # grande area rossa davanti alla porta
    for x in (-8.5, 8.5):
        ring(x, sgn * 21, 4.3, 0.07)
        rect(x - 0.3, sgn * 21 - 0.3, x + 0.3, sgn * 21 + 0.3)
        rect(x - 0.3, sgn * 9.5 - 0.3, x + 0.3, sgn * 9.5 + 0.3)
ring(0, 0, 4.5, 0.07)
mask = mask.resize((W, H), Image.LANCZOS)
m = np.asarray(mask).astype(np.float32)[..., None] / 255
red = np.array([204, 62, 44], np.float32)                   # rosso-arancio delle foto
col = col * (1 - m * 0.92) + red * (m * 0.92)

# toppa tricolore sulla linea centrale, lato panchine
for i, c in enumerate([(30, 150, 70), (240, 242, 238), (204, 50, 46)]):
    z0 = -1.8 + i * 1.2
    a, b = (13.0 + RW / 2) * S, (z0 + RL / 2) * S
    col[int(b):int(b + 1.2 * S), int(a):int(a + 1.0 * S)] = np.array(c, np.float32) + (TR[int(b):int(b + 1.2 * S), int(a):int(a + 1.0 * S)] * 3)[..., None]

# scritta STILMAT dipinta, leggibile dalla tribuna (lato -x)
txt = text_layer('STILMAT', 'ariblk.ttf', (255, 255, 255, 255), size=400, spacing=20)
txt = txt.resize((int(17.0 * S), int(2.5 * S)), Image.LANCZOS).rotate(-90, expand=True)   # 17 m x 2,5 m
alpha = np.asarray(txt).astype(np.float32)[..., 3:4] / 255 * 0.9
x0 = int((-6.2 + RW / 2) * S) - txt.width // 2
y0 = H // 2 - txt.height // 2
col[y0:y0 + txt.height, x0:x0 + txt.width] = col[y0:y0 + txt.height, x0:x0 + txt.width] * (1 - alpha) + red * alpha

img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1400):                                        # graffi e segni di ruote
    zc = random.uniform(-34, 34)
    xc = random.uniform(-17, 17)
    px, py = (xc + RW / 2) * S, (zc + RL / 2) * S
    ln, ang = random.uniform(20, 160), random.uniform(0, math.pi)
    sd.arc([px - ln, py - ln, px + ln, py + ln], math.degrees(ang), math.degrees(ang) + random.uniform(20, 70),
           fill=(255, 255, 255, random.randint(14, 34)) if random.random() < 0.6 else (40, 50, 60, random.randint(10, 24)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)

# ================================================================== 2. PARETI IN BLOCCHI VERNICIATI
print('pareti')
W = H = 512   # 2 m x 2 m
grime = fft_noise(H, W, beta=2.3)
streak = fft_noise(H, W, beta=2.0, sx=1.0, sy=0.1)
wall = np.zeros((H, W, 3), np.float32) + np.array([236, 233, 224], np.float32)
wall += ((grime - 0.5) * 16 + (streak - 0.5) * 10)[..., None]
hm = grime * 0.3
for y in range(0, H, 51):            # corsi dei blocchi (20 cm)
    wall[y:y + 2] *= 0.94
    hm[y:y + 2] -= 1
for row, y in enumerate(range(0, H, 51)):
    off = 0 if row % 2 == 0 else 51
    for x in range(off, W + 102, 102):   # giunti verticali (40 cm)
        xs = x % W
        wall[y:y + 51, xs:xs + 2] *= 0.95
        hm[y:y + 51, xs:xs + 2] -= 1
save(to_img(wall), 'wall_block.jpg')
save(normal_from_height(hm, 1.2), 'wall_block_n.jpg')

# ================================================================== 3. FASCIA FINESTRATA (vetri scuri con riflessi ad arco)
print('finestre')
W, H = 1024, 256     # 6 m x 1.5 m
win = Image.new('RGB', (W, H), (34, 36, 42))
wd = ImageDraw.Draw(win)
pane = W // 6
for i in range(6):
    x0 = i * pane
    g = np.linspace(46, 26, H)
    for y in range(H):
        wd.line([x0, y, x0 + pane, y], fill=(int(g[y]), int(g[y] + 2), int(g[y] + 8)))
    wd.arc([x0 + 18, 70, x0 + pane - 18, 70 + (pane - 36)], 180, 360, fill=(235, 230, 210), width=5)   # riflesso ad arco
    wd.arc([x0 + 30, 82, x0 + pane - 30, 82 + (pane - 60)], 200, 340, fill=(160, 150, 130), width=2)
    if random.random() < 0.4:
        wd.ellipse([x0 + pane // 2 - 14, 30, x0 + pane // 2 + 14, 58], fill=(250, 210, 140))
    wd.rectangle([x0, 0, x0 + 8, H], fill=(120, 124, 130))
wd.rectangle([0, 0, W, 10], fill=(120, 124, 130))
wd.rectangle([0, H - 12, W, H], fill=(120, 124, 130))
save(win, 'windows.jpg')

# ================================================================== 4. LAMIERA GRECATA DELLA COPERTURA
print('copertura')
W = H = 512   # 1 m x 1 m
period = 102
prof = np.array([1.0 if (x % period) < 50 else (0.0 if (x % period) < 80 else 0.5) for x in range(W)], np.float32)
deck = np.zeros((H, W, 3), np.float32) + np.array([168, 184, 200], np.float32)
deck *= (0.9 + 0.12 * prof)[None, :, None]
deck += ((fft_noise(H, W, beta=2.4) - 0.5) * 12)[..., None]
save(to_img(deck), 'ceiling_deck.jpg')
save(normal_from_height(np.tile(prof * 5, (H, 1)), 1.0), 'ceiling_deck_n.jpg')

# ================================================================== 5. BALAUSTRE
print('balaustre')


def board_strip(panels, w=4096, h=256, widths=None):
    img = Image.new('RGBA', (w, h), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    top_cap, kick = 10, 50
    ad_h = h - top_cap - kick
    widths = widths or [w // len(panels)] * len(panels)
    x = 0
    for name, pw in zip(panels, widths):
        img.alpha_composite(panel(name, pw - 6, ad_h - 8), (x + 3, top_cap + 4))
        d.line([x, top_cap, x, h - kick], fill=(205, 210, 216), width=3)
        x += pw
    d.rectangle([0, 0, w, top_cap], fill=(60, 64, 70))
    d.rectangle([0, h - kick, w, h], fill=(214, 196, 60))
    arr = np.asarray(img).astype(np.float32)
    for _ in range(220):
        sx, sy = random.randint(0, w - 60), random.randint(h - kick + 4, h - 5)
        arr[sy:sy + random.randint(2, 4), sx:sx + random.randint(8, 70), :3] *= random.uniform(0.3, 0.7)
    for _ in range(120):
        sx, sy = random.randint(0, w - 30), random.randint(top_cap, h - kick - 4)
        arr[sy:sy + 3, sx:sx + random.randint(6, 30), :3] *= 0.82
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA')


save(board_strip(['mc', 'verdecasa', 'omr', 'skypub', 'rodofili', 'fat', 'euler', 'sai']), 'boards_a.jpg')
save(board_strip(['fisep', 'mc', 'promopost', 'diavoli', 'tecnoforniture', 'omr', 'alma', 'bcc']), 'boards_b.jpg')
save(board_strip(['mc', 'omr', 'diavoli_big', 'skypub', 'mc'], widths=[512, 512, 2048, 512, 512]), 'boards_center.jpg')
corner = Image.new('RGBA', (1024, 256), (255, 255, 255, 255))
cd = ImageDraw.Draw(corner)
cd.rectangle([0, 0, 1024, 10], fill=(60, 64, 70))
cd.rectangle([0, 206, 1024, 256], fill=(214, 196, 60))
for i in range(0, 1024, 256):
    cd.rectangle([i + 40, 98, i + 216, 110], fill=RED)
save(corner, 'boards_corner.jpg')

# ================================================================== 6. STRISCIONI E STENDARDI
print('striscioni')
for nm in ['mc', 'emo', 'alma', 'bcc', 'quadro', 'tecnoforniture', 'wildcats', 'lifestyle', 'promopost', 'verdecasa']:
    save(banner_finish(panel(nm, 1024, 256)), f'banners/{nm}.jpg', quality=86)
sq = Image.new('RGBA', (256, 256), (255, 255, 255, 255))
mc_logo(sq, (8, 8, 248, 248))
save(sq, 'banners/mc_square.jpg')

# stendardo COPPA ITALIA 2019
cp = Image.new('RGBA', (384, 768), (196, 24, 34, 255))
cdr = ImageDraw.Draw(cp)
cdr.rectangle([12, 12, 372, 756], outline=(255, 255, 255), width=6)
paste_fit(cp, LOGO, (90, 40, 294, 220))
paste_fit(cp, text_layer('COPPA', 'ariblk.ttf', (255, 255, 255)), (40, 270, 344, 380))
paste_fit(cp, text_layer('ITALIA', 'ariblk.ttf', (255, 255, 255)), (40, 400, 344, 510))
paste_fit(cp, text_layer('2019', 'ariblk.ttf', (255, 255, 255), stroke=6, stroke_fill=(120, 10, 16)), (60, 540, 324, 680))
cdr.polygon([(12, 700), (192, 768), (372, 700), (372, 768), (12, 768)], fill=(120, 10, 16))
save(cp, 'banners/coppa.jpg')

# grande diavolo su telo bianco
dv = Image.new('RGBA', (768, 768), (246, 246, 244, 255))
paste_fit(dv, LOGO, (40, 40, 728, 728))
save(dv, 'banners/devil.jpg')

# banner storico 1949-2019 (foto in bianco e nero stilizzata: gambe con pattini)
hb = Image.new('RGB', (1024, 512), (40, 40, 40))
hd = ImageDraw.Draw(hb)
for y in range(512):
    v = int(70 + 80 * (y / 512))
    hd.line([0, y, 1024, y], fill=(v, v, v))
for i in range(9):
    x = 60 + i * 110
    hd.rectangle([x, 40, x + 34, 330], fill=(18, 18, 18))
    hd.rectangle([x + 46, 60, x + 80, 330], fill=(24, 24, 24))
    hd.rounded_rectangle([x - 10, 320, x + 58, 360], radius=10, fill=(10, 10, 10))
    hd.rounded_rectangle([x + 36, 320, x + 104, 360], radius=10, fill=(14, 14, 14))
    for wx in range(4):
        hd.ellipse([x - 6 + wx * 16, 360, x + 8 + wx * 16, 374], fill=(200, 200, 200))
hbr = hb.convert('RGBA')
paste_fit(hbr, text_layer('1949-2019', 'georgiab.ttf', (245, 245, 245)), (420, 380, 1000, 490))
save(hbr, 'banners/history.jpg')

# tabellone segnapunti a parete
sbi = Image.new('RGBA', (1024, 640), (16, 16, 18, 255))
sdw = ImageDraw.Draw(sbi)
sdw.rectangle([0, 0, 1023, 639], outline=(70, 70, 74), width=10)
paste_fit(sbi, text_layer('OSPITI', 'arialbd.ttf', (240, 240, 240)), (40, 30, 360, 100))
paste_fit(sbi, text_layer('DIAVOLI', 'arialbd.ttf', (240, 240, 240)), (664, 30, 984, 100))
for x0, txt_ in [(60, '0'), (180, '0'), (724, '0'), (844, '0')]:
    sdw.rectangle([x0, 130, x0 + 100, 300], fill=(40, 10, 10))
    paste_fit(sbi, text_layer(txt_, 'arialbd.ttf', (255, 70, 40)), (x0 + 10, 140, x0 + 90, 290))
paste_fit(sbi, text_layer('PERIOD', 'arialbd.ttf', (220, 220, 220)), (420, 140, 604, 190))
paste_fit(sbi, text_layer('1', 'arialbd.ttf', (255, 200, 40)), (470, 200, 554, 300))
paste_fit(sbi, text_layer('T.OUT', 'arialbd.ttf', (200, 200, 200)), (60, 330, 260, 380))
paste_fit(sbi, text_layer('T.OUT', 'arialbd.ttf', (200, 200, 200)), (764, 330, 964, 380))
paste_fit(sbi, text_layer('PLAYER - PENALTY', 'arialbd.ttf', (200, 200, 200)), (40, 440, 470, 490))
paste_fit(sbi, text_layer('PLAYER - PENALTY', 'arialbd.ttf', (200, 200, 200)), (554, 440, 984, 490))
save(sbi, 'scoreboard.jpg')

# transenne gialle (rete metallica) con trasparenza
fz = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
fd = ImageDraw.Draw(fz)
for x in range(8, 256, 16):
    fd.line([x, 0, x, 256], fill=(236, 196, 30, 255), width=4)
fd.rectangle([0, 0, 255, 12], fill=(36, 110, 60, 255))
fd.rectangle([0, 244, 255, 255], fill=(36, 110, 60, 255))
save(fz, 'fence.png')
print('fatto')
