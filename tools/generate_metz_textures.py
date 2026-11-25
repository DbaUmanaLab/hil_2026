"""Genera le texture del Gymnase René Aviez (Green Falcons de Pont-de-Metz) in assets/textures/metz/.
Uso (dalla cartella del progetto): python tools/generate_metz_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/metz.jpg e le foto della sala, un capannone moderno in acciaio: pista a piastrelle
grigio chiaro con i cerchi rossi, la riga centrale e le aree di porta verdi e lo stemma del club al centro;
balaustre verdi col piede giallo, dietro le porte quelle nere consumate con la scritta GREEN FALCONS; pareti in
lamiera grecata grigio chiaro con i controventi, zoccolo in blocchi grigi, fascia di pannelli traslucidi in alto;
copertura in lamiera scura col grande lucernario a volta lungo il colmo; reti nere tutt'attorno alla pista.
Nei cartelloni solo club, città e territorio: niente marchi commerciali.
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'metz')
os.makedirs(OUT, exist_ok=True)
random.seed(17000)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'metz.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
GREEN, DKGREEN, BLACK, WHITE, YELLOW = (40, 170, 74), (22, 76, 46), (20, 20, 22), (255, 255, 255), (236, 204, 40)


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


# ================================================================== 1. PISTA grigia, righe verdi e cerchi rossi
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
n1 = resized_noise(512, 256, 2.0, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([196, 196, 192], np.float32)
col += ((n1 - 0.5) * 10)[..., None]
TILE = 0.3048
ix = (np.arange(W) / S / TILE).astype(int)
iz = (np.arange(H) / S / TILE).astype(int)
rng = np.random.default_rng(11)
col += rng.normal(0, 2.2, (iz.max() + 1, ix.max() + 1)).astype(np.float32)[iz[:, None], ix[None, :]][..., None]
gx = ((np.arange(W) / S) % TILE) < (1.1 / S)
gz = ((np.arange(H) / S) % TILE) < (1.1 / S)
groove = gz[:, None] | gx[None, :]
col[groove] *= 0.93

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'green')}
draws = {k: ImageDraw.Draw(m) for k, m in masks.items()}
P = lambda x, z: ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)
px = lambda m: max(1, int(m * S * SS))


def rect(k, x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    draws[k].rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def ring(k, x, z, r, wdt):
    c = P(x, z); R = r * S * SS
    draws[k].ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], outline=255, width=px(wdt))


rect('green', -RW / 2, -0.15, RW / 2, 0.15)                       # riga centrale verde
for s in (-1, 1):
    rect('red', -RW / 2 + 1.4, s * 31 - 0.04, RW / 2 - 1.4, s * 31 + 0.04)
    rect('green', -1.8, s * 31, 1.8, s * 28.8)                    # area di porta verde
    for x in (-8.5, 8.5):
        ring('red', x, s * 21, 4.5, 0.06)
        rect('green', x - 0.35, s * 21 - 0.22, x + 0.35, s * 21 + 0.22)
        rect('green', x - 0.25, s * 8 - 0.25, x + 0.25, s * 8 + 0.25)
cols = {'red': (214, 64, 60), 'green': (50, 166, 92)}
for k, a in (('red', 0.9), ('green', 0.92)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(cols[k], np.float32) * m * a
img = to_img(col).convert('RGBA')
# stemma del club al centro, su un rombo bianco (come il tappetino dipinto delle foto)
C = (int(W / 2), int(H / 2))
dia = Image.new('RGBA', img.size, (0, 0, 0, 0))
dd = ImageDraw.Draw(dia)
R = int(2.6 * S)
dd.polygon([(C[0], C[1] - R), (C[0] + int(R * 1.3), C[1]), (C[0], C[1] + R), (C[0] - int(R * 1.3), C[1])], fill=(236, 236, 232, 230))
img.alpha_composite(dia)
lg = LOGO.copy()
lg.putalpha(lg.getchannel('A').point(lambda v: int(v * 0.9)))
paste_fit(img, lg, (C[0] - int(1.6 * S), C[1] - int(2.1 * S), C[0] + int(1.6 * S), C[1] + int(2.1 * S)))
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(2000):
    cx, cy = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(30, 260); a0 = random.uniform(0, 360)
    sd.arc([cx - ln, cy - ln, cx + ln, cy + ln], a0, a0 + random.uniform(10, 50), fill=(60, 60, 66, random.randint(10, 22)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img, 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.15 + (~groove) * 0.25, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE verdi col piede giallo; nere consumate dietro le porte
print('balaustre')


def board_strip(w=4096, h=256, base=(44, 168, 80), panels=(), worn=False):
    n = resized_noise(64, 512, 1.8, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array(base, np.float32)
    arr += ((n - 0.5) * (22 if worn else 10))[..., None]
    if worn:   # legno nero scrostato: chiazze più chiare e graffi
        arr += (np.clip(resized_noise(32, 256, 1.4, h, w) - 0.6, 0, 1) * 120)[..., None]
    img = to_img(arr).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 1.22):
        x = int(xm * pxm)
        d.rectangle([x - 2, 0, x + 2, h], fill=tuple(int(c * 0.8) for c in base) + (255,))
    d.rectangle([0, h - 44, w, h], fill=YELLOW + (255,))                     # piede giallo
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 26, int((xm + wm) * pxm), h - 54)
    sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    for _ in range(420):
        x, y = random.uniform(0, w), random.uniform(h * 0.3, h - 6)
        r = random.uniform(3, 9)
        sd.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(30, 30, 34, random.randint(20, 70)))
    img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(0.8)))
    return img


def logo_panel(img, x0, y0, x1, y1):
    paste_fit(img, LOGO, (x0 + 6, y0 + 2, x1 - 6, y1 - 2))


def falcons_text(col):
    def f(img, x0, y0, x1, y1):
        paste_fit(img, text_layer('GREEN FALCONS', 'georgiab.ttf', col, spacing=8), (x0 + 10, y0 + 18, x1 - 10, y1 - 14))
    return f


def text_panel(t, bg, fg, fnt='arialbd.ttf', sub=None, subcol=None):
    def f(img, x0, y0, x1, y1):
        ImageDraw.Draw(img).rectangle([x0, y0, x1, y1], fill=bg + (255,), outline=(170, 170, 170, 255), width=3)
        if sub:
            mid = y0 + (y1 - y0) * 0.62
            paste_fit(img, text_layer(t, fnt, fg, spacing=4), (x0 + 24, y0 + 10, x1 - 24, int(mid)))
            paste_fit(img, text_layer(sub, 'arial.ttf', subcol or fg, spacing=3), (x0 + 24, int(mid) + 4, x1 - 24, y1 - 8))
        else:
            paste_fit(img, text_layer(t, fnt, fg, spacing=4), (x0 + 24, y0 + 14, x1 - 24, y1 - 14))
    return f


save(board_strip(panels=[(1.0, 1.4, logo_panel), (3.4, 6.0, falcons_text(DKGREEN)), (12.0, 5.0, text_panel('SOMME', WHITE, DKGREEN, 'arialbd.ttf', 'LE DÉPARTEMENT', (80, 80, 86)))]), 'boards_a.jpg')
save(board_strip(panels=[(1.5, 5.2, text_panel('Hauts-de-France', WHITE, (30, 60, 130), 'arialbi.ttf', 'LA RÉGION', (80, 80, 86))), (10.5, 1.4, logo_panel), (13.0, 4.8, text_panel('PONT-DE-METZ', DKGREEN, WHITE, 'ariblk.ttf'))]), 'boards_b.jpg')
save(board_strip(base=(30, 34, 32), worn=True, panels=[(1.2, 7.0, falcons_text(GREEN)), (9.0, 1.4, logo_panel), (11.5, 6.0, falcons_text(GREEN))]), 'boards_center.jpg')
save(board_strip(1024, 256, base=(30, 34, 32), worn=True, panels=[(7.5, 1.4, logo_panel)]), 'boards_corner.jpg')

# ================================================================== 3. EDIFICIO
print('edificio')
# lamiera grecata verticale grigio chiaro (texture 4 x 4 m, greche ogni 25 cm)
W = H = 512
u = np.arange(W)[None, :] / W
cl = np.zeros((H, W, 3), np.float32) + np.array([176, 178, 172], np.float32)
cl += ((fft_noise(H, W, beta=2.2) - 0.5) * 8)[..., None]
rib = np.sin(u * np.pi * 2 * 16)
cl *= (0.86 + 0.08 * (rib > 0.55) + 0.06 * np.clip(rib, 0, 1))[..., None]
save(to_img(cl).filter(ImageFilter.GaussianBlur(0.5)), 'cladding.jpg')
# zoccolo in blocchi di cemento verniciati di grigio (texture 4 x 4 m, blocchi 50 x 20 cm)
bw = np.zeros((H, W, 3), np.float32) + np.array([186, 186, 182], np.float32)
bw += ((fft_noise(H, W, beta=2.0) - 0.5) * 10)[..., None]
im = to_img(bw)
d = ImageDraw.Draw(im)
pxm = W / 4
for r in range(21):
    y = int(r * 0.2 * pxm)
    d.line([(0, y), (W, y)], fill=(160, 160, 156), width=2)
    off = 0.25 * pxm if r % 2 else 0
    for k in range(9):
        x = int(k * 0.5 * pxm + off)
        d.line([(x, y), (x, y + int(0.2 * pxm))], fill=(164, 164, 160), width=2)
save(im.filter(ImageFilter.GaussianBlur(0.4)), 'block_wall.jpg')
# lamiera scura della copertura vista da sotto
rf = np.zeros((H, W, 3), np.float32) + np.array([66, 70, 76], np.float32)
rf += ((fft_noise(H, W, beta=2.2) - 0.5) * 8)[..., None]
rf *= (1 - 0.28 * (np.sin(u * np.pi * 2 * 20) > 0.45))[..., None]
save(to_img(rf).filter(ImageFilter.GaussianBlur(0.5)), 'roof_deck.jpg')
# policarbonato alveolare del lucernario a volta (costole) e della fascia di finestre
sk = np.zeros((256, 512, 3), np.float32) + np.array([236, 240, 242], np.float32)
sk += ((resized_noise(8, 32, 1.4, 256, 512) - 0.5) * 12)[..., None]
sk *= (1 - 0.1 * (np.sin(np.arange(512)[None, :] / 512 * np.pi * 2 * 24) > 0.6))[..., None]
im = to_img(sk)
d = ImageDraw.Draw(im)
for k in range(0, 513, 128):
    d.rectangle([k - 4, 0, k + 4, 256], fill=(160, 166, 170))
save(im, 'skylight.jpg')
W, H = 768, 256
wf = np.zeros((H, W, 3), np.float32) + np.array([238, 240, 238], np.float32)
wf += ((resized_noise(16, 48, 1.4, H, W) - 0.5) * 10)[..., None]
wf *= (1 - 0.07 * (np.sin(np.arange(W)[None, :] / W * np.pi * 2 * 48) > 0.6))[..., None]
im = to_img(wf)
d = ImageDraw.Draw(im)
d.rectangle([0, H // 2 - 4, W, H // 2 + 4], fill=(120, 124, 128))
for k in (0, W):
    d.rectangle([k - 8, 0, k + 8, H], fill=(110, 114, 118))
d.rectangle([0, 0, W, 6], fill=(110, 114, 118)); d.rectangle([0, H - 6, W, H], fill=(110, 114, 118))
save(im, 'window_band.jpg')
# rete nera di protezione
W = H = 256
net = Image.new('RGBA', (W, H), (0, 0, 0, 0))
nd = ImageDraw.Draw(net)
for k in range(0, W + 1, 12):
    nd.line([(k, 0), (k, H)], fill=(16, 16, 18, 190), width=2)
    nd.line([(0, k), (W, k)], fill=(16, 16, 18, 190), width=2)
save(net, 'net.png')
# telo frangivista nero (rete fitta) dietro le porte
tw = np.zeros((128, 512, 3), np.float32) + np.array([34, 36, 36], np.float32)
tw += ((resized_noise(16, 64, 1.6, 128, 512) - 0.5) * 18)[..., None]
save(to_img(tw), 'windscreen.jpg')
# porte verdi, finestra della buvette, maglia incorniciata, bandiera
W, H = 256, 512
dr = Image.new('RGB', (W, H), (40, 150, 70))
dd = ImageDraw.Draw(dr)
dd.rectangle([0, 0, W - 1, H - 1], outline=(30, 110, 52), width=10)
dd.rectangle([30, 40, W - 30, 200], outline=(30, 110, 52), width=6)
dd.rectangle([W - 50, H // 2 - 10, W - 30, H // 2 + 30], fill=(190, 190, 190))
save(dr, 'door_green.jpg')
W, H = 512, 256
bv = Image.new('RGBA', (W, H), (120, 92, 60, 255))
bd = ImageDraw.Draw(bv)
bd.rectangle([20, 50, W - 20, H - 20], fill=(60, 70, 78))
bd.rectangle([20, 50, W - 20, H - 20], outline=(220, 220, 216), width=8)
bd.line([(W // 2, 50), (W // 2, H - 20)], fill=(220, 220, 216), width=6)
paste_fit(bv, text_layer('BUVETTE', 'georgiab.ttf', (40, 150, 70), spacing=6), (120, 6, 392, 44))
save(bv, 'buvette.jpg')
jf = Image.new('RGBA', (300, 300), (236, 236, 232, 255))
jfd = ImageDraw.Draw(jf)
jfd.rectangle([0, 0, 299, 299], outline=(40, 40, 40), width=10)
jersey = Image.open(os.path.join(ROOT, 'assets', 'jerseys', 'metz.png')).convert('RGBA')
paste_fit(jf, jersey, (30, 30, 270, 270))
save(jf, 'jersey_frame.jpg')
fl = Image.new('RGB', (600, 400), WHITE)
fd = ImageDraw.Draw(fl)
fd.rectangle([0, 0, 200, 400], fill=(0, 56, 146))
fd.rectangle([400, 0, 600, 400], fill=(226, 26, 44))
arr = np.asarray(fl).astype(np.float32) * (0.9 + 0.1 * np.sin(np.arange(600)[None, :] / 600 * np.pi * 4))[..., None]
save(to_img(arr), 'flag_france.jpg')

# ================================================================== 4. STRISCIONI
print('striscioni')
# grande telo verde scuro con lo stemma (testate)
b = Image.new('RGBA', (900, 720), (34, 70, 52, 255))
paste_fit(b, LOGO.convert('LA').convert('RGBA'), (200, 40, 700, 680))   # stampato stinto, quasi monocromo
arr = np.asarray(b).astype(np.float32)
tint = np.array([0.55, 0.85, 0.65, 1.0], np.float32)
arr = arr * tint + np.array([18, 48, 30, 0], np.float32) * (1 - arr[..., 3:4] / 255)
save(banner_finish(to_img(arr[..., :3]).convert('RGBA')), 'banner_shield.jpg', quality=86)
# striscione verde lungo (al posto di quello dello sponsor sopra le reti)
b = Image.new('RGBA', (2048, 300), (34, 120, 64, 255))
paste_fit(b, LOGO, (30, 10, 230, 290))
paste_fit(b, text_layer('GREEN FALCONS • PONT-DE-METZ', 'arialbd.ttf', WHITE, spacing=6), (270, 70, 2010, 230), 'left')
save(banner_finish(b), 'banner_long.jpg', quality=86)
# striscione della città
b = Image.new('RGBA', (1400, 300), (246, 246, 242, 255))
paste_fit(b, LOGO, (20, 10, 220, 290))
paste_fit(b, text_layer('AMIENS • PONT-DE-METZ', 'arialbd.ttf', DKGREEN, spacing=4), (250, 50, 1370, 170))
paste_fit(b, text_layer('ROLLER HOCKEY', 'arial.ttf', (80, 80, 86), spacing=6), (450, 190, 1170, 260))
save(banner_finish(b), 'banner_city.jpg', quality=86)
# piccolo stendardo bianco coi due stemmi (sopra la porta del club)
b = Image.new('RGBA', (800, 260), (246, 246, 242, 255))
paste_fit(b, LOGO, (40, 20, 220, 240))
paste_fit(b, LOGO, (580, 20, 760, 240))
paste_fit(b, text_layer('CLUB HOUSE', 'georgiab.ttf', DKGREEN, spacing=4), (240, 80, 560, 180))
save(banner_finish(b), 'banner_house.jpg', quality=86)
print('fatto')
