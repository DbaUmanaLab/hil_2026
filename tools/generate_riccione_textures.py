"""Genera le texture del Pattinodromo Comunale di Riccione (Corsari Riccione) in assets/textures/riccione/.
Uso (dalla cartella del progetto): python tools/generate_riccione_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/riccione.jpg e le foto del palazzetto: pavimento in cemento lucidato beige-grigio con le
macchie e le righe sottili (centrale rossa, cerchi blu, cerchi del pattinaggio artistico al centro); copertura a
capanna su capriate in legno lamellare chiaro col tavolato di perline; pareti bianche col bordo blu della gronda,
finestre a nastro in alto (con le tende beige sul lato delle panchine); balaustre trasparenti col telaio in
alluminio e il corrimano color crema; striscioni del club. Nei cartelloni solo club e città: niente marchi commerciali.
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'riccione')
os.makedirs(OUT, exist_ok=True)
random.seed(47838)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'riccione.png')).convert('RGBA')
_a = np.asarray(LOGO).astype(np.float32)                    # sfondo bianco -> trasparente
_a[..., 3] *= 1 - np.clip((_a[..., :3].min(axis=2) - 236) / 16, 0, 1)
LOGO = Image.fromarray(_a.astype(np.uint8))
LOGO = LOGO.crop(LOGO.getbbox())
BLACK, WHITE, RED, BLUE = (20, 20, 22), (255, 255, 255), (196, 30, 46), (40, 92, 186)


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


# ================================================================== 1. PISTA: cemento lucidato con le macchie e le righe sottili
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
n1 = resized_noise(512, 256, 2.0, H, W)
n2 = resized_noise(128, 64, 2.4, H, W)                      # macchie larghe (umido, cera)
n3 = resized_noise(1024, 512, 1.2, H, W)                    # grana fine del cemento
col = np.zeros((H, W, 3), np.float32) + np.array([204, 198, 186], np.float32)
col += ((n1 - 0.5) * 10)[..., None]
col += ((n3 - 0.5) * 9)[..., None]
blot = np.clip((n2 - 0.55) * 2.4, 0, 1)
col -= (blot * 13)[..., None] * np.array([1.0, 1.0, 1.08])   # chiazze più scure, appena fredde
# tagli di dilatazione ogni 6 m (sottili, scuri)
X = (np.arange(W) + 0.5) / S
Z = (np.arange(H) + 0.5) / S
joint = (((X / 6.0) % 1.0) < 0.0025)[None, :] | (((Z / 6.0) % 1.0) < 0.0013)[:, None]
col[joint] *= 0.8

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'blue')}
draws = {k: ImageDraw.Draw(m) for k, m in masks.items()}
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)
px = lambda m: max(1, int(m * S * SS))


def rect(k, x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    draws[k].rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def ring(k, x, z, r, wdt, a0=0, a1=360):
    c = P(x, z); R = r * S * SS
    draws[k].arc([c[0] - R, c[1] - R, c[0] + R, c[1] + R], a0, a1, fill=255, width=px(wdt))


rect('red', -RW / 2, -0.04, RW / 2, 0.04)                 # riga centrale rossa sottile
ring('blue', 0, 0, 4.5, 0.05)
ring('blue', 0, 0, 0.75, 0.05)                             # cerchi del pattinaggio artistico al centro
for s in (-1, 1):
    ring('blue', 0, s * 3.0, 3.0, 0.05)
    ring('red', 0, s * 9.5, 6.0, 0.05, 200 if s < 0 else 20, 340 if s < 0 else 160)   # archi rossi
    rect('red', -RW / 2 + 1.4, s * 31 - 0.03, RW / 2 - 1.4, s * 31 + 0.03)              # linea di porta
    ring('blue', 0, s * 31, 1.8, 0.05, 180 if s > 0 else 0, 360 if s > 0 else 180)     # area di porta
    for x in (-8.5, 8.5):
        ring('blue', x, s * 21, 4.5, 0.05)
        rect('red', x - 0.18, s * 21 - 0.18, x + 0.18, s * 21 + 0.18)
        ring('blue', x, s * 6, 2.8, 0.05)                  # cerchi del pattinaggio in zona neutra
cols = {'red': (176, 52, 52), 'blue': (52, 92, 184)}
wear = (0.75 + 0.25 * n1)[..., None]
for k, a in (('blue', 0.85), ('red', 0.8)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(0.9)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a * wear) + np.array(cols[k], np.float32) * m * a * wear
img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(2000):                                       # segni delle ruote
    cx, cy = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(30, 200); a0 = random.uniform(0, 360)
    sd.arc([cx - ln, cy - ln, cx + ln, cy + ln], a0, a0 + random.uniform(10, 50), fill=(70, 66, 60, random.randint(8, 18)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img.convert('RGB'), 'rink_color.jpg', quality=90)
save(normal_from_height(n3 * 0.12 + n1 * 0.1 - joint.astype(np.float32) * 0.4, 0.8), 'rink_normal.jpg', quality=85)

# ================================================================== 2. LEGNO, INTONACO, FINESTRE
print('edificio')
# legno lamellare chiaro (texture 4 m x 1 m, venature lungo u, lamelle incollate)
W, H = 512, 128
wd = np.zeros((H, W, 3), np.float32) + np.array([170, 104, 50], np.float32)
wd += ((resized_noise(8, 256, 1.4, H, W) - 0.5) * 30)[..., None]
wd *= (1 - 0.08 * ((np.arange(H)[:, None] % 18) < 2))[..., None]
save(to_img(wd), 'glulam.jpg')
# tavolato di perline del soffitto (texture 4 x 4 m, perline da 12 cm lungo v)
W = H = 512
pl = np.zeros((H, W, 3), np.float32) + np.array([178, 116, 60], np.float32)
pl += ((resized_noise(16, 512, 1.3, H, W) - 0.5) * 26)[..., None]
board = (np.arange(W) // 15)
tone = np.random.default_rng(5).normal(0, 7, board.max() + 1)
pl += tone[board][None, :, None]
pl[:, (np.arange(W) % 15) < 1] *= 0.72
save(to_img(pl), 'planks.jpg')
# intonaco bianco (texture 4 x 4 m)
W = H = 512
ww = np.zeros((H, W, 3), np.float32) + np.array([238, 238, 234], np.float32)
ww += ((fft_noise(H, W, beta=2.4) - 0.5) * 8)[..., None]
save(to_img(ww).filter(ImageFilter.GaussianBlur(0.6)), 'wall_white.jpg')


def window_band(n, curtain, w_px=1600, h_px=256):
    """finestre a nastro (n vetri in fila, telai bianchi); curtain: tende beige tirate con le pieghe"""
    img = Image.new('RGB', (w_px, h_px), (232, 232, 228))
    d = ImageDraw.Draw(img)
    pw = w_px / n
    for i in range(n):
        x0, x1 = int(i * pw) + 8, int((i + 1) * pw) - 8
        if curtain:
            for x in range(x0, x1):
                v = 0.86 + 0.14 * np.sin((x - x0) / 9.0) ** 2
                d.line([(x, 10), (x, h_px - 10)], fill=(int(226 * v), int(206 * v), int(160 * v)))
            for x in range(x0, x1, 14):                  # orlo smerlato in alto (come nelle foto)
                d.arc([x, 4, x + 14, 22], 0, 180, fill=(196, 176, 130), width=2)
        else:
            g = np.linspace(0, 1, h_px)
            for y in range(10, h_px - 10):
                t = g[y]
                d.line([(x0, y), (x1, y)], fill=(int(196 + 30 * t), int(214 + 18 * t), int(226 + 10 * t)))
        d.rectangle([x0, 8, x1, h_px - 8], outline=(250, 250, 248), width=10)
        d.line([(x0, h_px // 2), (x1, h_px // 2)], fill=(250, 250, 248), width=6) if not curtain else None
    return img.filter(ImageFilter.GaussianBlur(0.6))


save(window_band(8, False), 'windows.jpg')
save(window_band(8, True), 'windows_curtain.jpg')
# lucernario sul colmo (vetro chiaro coi profili)
W, H = 512, 128
sk = Image.new('RGB', (W, H), (236, 242, 246))
skd = ImageDraw.Draw(sk)
for x in range(0, W, 64):
    skd.line([(x, 0), (x, H)], fill=(160, 166, 170), width=6)
skd.rectangle([0, 0, W - 1, H - 1], outline=(150, 156, 160), width=8)
save(sk, 'skylight.jpg')

# ================================================================== 3. STRISCIONI
print('striscioni')
# bandiera dei Corsari (bianca col teschio, come quella appesa in fondo)
b = Image.new('RGBA', (640, 760), (246, 246, 244, 255))
bd = ImageDraw.Draw(b)
paste_fit(b, LOGO, (40, 60, 600, 600))
paste_fit(b, text_layer('RICCIONE', 'ariblk.ttf', BLACK, spacing=10), (90, 620, 550, 720))
save(banner_finish(b), 'flag_corsari.jpg', quality=86)
# striscione dei 30 anni del club (1982 - 2012), tricolore
b = Image.new('RGBA', (900, 640), (248, 248, 246, 255))
bd = ImageDraw.Draw(b)
for i, c in enumerate([(0, 140, 70), (250, 250, 250), (206, 43, 55)]):
    bd.arc([90 + i * 18, 180 + i * 18, 640 - i * 18, 600 - i * 18], 150, 290, fill=c, width=28)
paste_fit(b, text_layer('1982', 'georgiab.ttf', (90, 90, 96)), (60, 40, 260, 140), 'left')
paste_fit(b, text_layer('2012', 'georgiab.ttf', (90, 90, 96)), (640, 40, 840, 140), 'right')
paste_fit(b, text_layer('30°', 'georgiab.ttf', (40, 60, 120)), (440, 220, 780, 450))
paste_fit(b, text_layer('CORSARI RICCIONE', 'arialbd.ttf', (40, 60, 120), spacing=4), (300, 480, 840, 560))
save(banner_finish(b), 'banner_30.jpg', quality=86)
# striscione rosso-nero del club (lato tribuna)
b = Image.new('RGBA', (1400, 360), BLACK + (255,))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 0, 1400, 24], fill=RED); bd.rectangle([0, 336, 1400, 360], fill=RED)
bd.ellipse([30, 30, 330, 330], fill=WHITE)
paste_fit(b, LOGO, (50, 50, 310, 310))
paste_fit(b, text_layer('CORSARI', 'ariblk.ttf', WHITE, spacing=10), (370, 50, 1360, 210), 'left')
paste_fit(b, text_layer('HOCKEY IN LINE RICCIONE', 'arialbd.ttf', (230, 90, 100), spacing=6), (370, 230, 1360, 310), 'left')
save(banner_finish(b), 'banner_club.jpg', quality=86)
# insegna del palazzetto
b = Image.new('RGBA', (1200, 260), (250, 250, 248, 255))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 0, 1199, 259], outline=(40, 92, 186, 255), width=10)
paste_fit(b, text_layer('PATTINODROMO COMUNALE', 'arialbd.ttf', (40, 92, 186), spacing=6), (40, 30, 1160, 140))
paste_fit(b, text_layer('CITTÀ DI RICCIONE', 'arialbd.ttf', (90, 92, 96), spacing=6), (200, 160, 1000, 230))
save(b, 'sign_city.jpg')
print('fatto')
