"""Genera le texture della Salle Claude Debussy (Hawks d'Angers) in assets/textures/angers/.
Uso (dalla cartella del progetto): python tools/generate_angers_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
Riferimento: assets/arenas/angers.png e le foto del palazzetto: pavimento sportivo azzurro chiaro con la riga
centrale rossa molto larga, i cerchi rossi e le righe grigio scuro degli altri sport; pareti in compensato color
miele col piede giallo (fanno anche da balaustra); sopra, vetrate alte a telaio metallico o intonaco chiaro;
copertura in lamiera chiara su travi e archi in legno lamellare scuro; stendardi blu del club (numeri ritirati e
titoli) e il tricolore francese.
Nei cartelloni solo club, città e territorio: niente marchi commerciali.
"""
import sys, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from texture_common import fft_noise, normal_from_height, to_img, text_layer, paste_fit, banner_finish

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'angers')
os.makedirs(OUT, exist_ok=True)
random.seed(49000)
LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'angers.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
NAVY, RED, WHITE, BLACK, SKY = (27, 42, 107), (224, 43, 54), (255, 255, 255), (20, 20, 22), (64, 190, 236)
YEL = (238, 206, 40)


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
n2 = resized_noise(1024, 512, 1.4, H, W)
col = np.zeros((H, W, 3), np.float32) + np.array([150, 198, 222], np.float32)
col += ((n1 - 0.5) * 10)[..., None]
col += ((n2 - 0.5) * 5)[..., None]
TILE = 0.3048
gx = ((np.arange(W) / S) % TILE) < (1.0 / S)
gz = ((np.arange(H) / S) % TILE) < (1.0 / S)
groove = gz[:, None] | gx[None, :]
col[groove] *= 0.95

SS = 2
masks = {k: Image.new('L', (W * SS, H * SS), 0) for k in ('red', 'dark', 'white')}
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


# hockey (rosso): la riga centrale è larghissima, come nelle foto
rect('red', -RW / 2, -0.3, RW / 2, 0.3)
ring('red', 0, 0, 4.5, 0.07)
for s in (-1, 1):
    rect('red', -RW / 2 + 1.4, s * 31 - 0.05, RW / 2 - 1.4, s * 31 + 0.05)
    rect('red', -1.6, s * 31, 1.6, s * 29.4)
    for x in (-8.5, 8.5):
        ring('red', x, s * 21, 4.5, 0.07)
        rect('red', x - 0.28, s * 21 - 0.28, x + 0.28, s * 21 + 0.28)
        rect('red', x - 0.22, s * 8 - 0.22, x + 0.22, s * 8 + 0.22)
# altri sport (grigio scuro): campo di pallamano, linee trasversali e lungo i lati
line('dark', [(-10, -20), (10, -20), (10, 20), (-10, 20), (-10, -20)], 0.05)
for s in (-1, 1):
    ring('dark', 0, s * 20, 6, 0.05, *((180, 360) if s > 0 else (0, 180)))
    line('dark', [(s * 14, -RL / 2 + 2), (s * 14, RL / 2 - 2)], 0.05)
    line('dark', [(-RW / 2 + 1, s * 12), (RW / 2 - 1, s * 12)], 0.05)
# trattini bianchi a centro campo
for x in (-3, 3):
    rect('white', x - 0.4, -0.04 - 1.2, x + 0.4, 0.04 - 1.2)
    rect('white', x - 0.4, -0.04 + 1.2, x + 0.4, 0.04 + 1.2)
cols = {'dark': (60, 64, 70), 'white': (240, 246, 248), 'red': (230, 70, 56)}
for k, a in (('dark', 0.8), ('white', 0.85), ('red', 0.92)):
    m = np.asarray(masks[k].filter(ImageFilter.GaussianBlur(1.0)).resize((W, H), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    col = col * (1 - m * a) + np.array(cols[k], np.float32) * m * a
img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(1600):
    cx, cy = random.uniform(0, W), random.uniform(0, H)
    ln = random.uniform(30, 240); a0 = random.uniform(0, 360)
    sd.arc([cx - ln, cy - ln, cx + ln, cy + ln], a0, a0 + random.uniform(10, 50), fill=(40, 70, 90, random.randint(8, 18)), width=random.randint(1, 3))
img.alpha_composite(sc.filter(ImageFilter.GaussianBlur(1.0)))
save(img, 'rink_color.jpg', quality=90)
save(normal_from_height(n1 * 0.15 + (~groove) * 0.2, 1.0), 'rink_normal.jpg', quality=85)

# ================================================================== 2. BALAUSTRE in compensato col piede giallo
print('balaustre')


def plywood(w, h):
    n = resized_noise(32, 256, 1.6, h, w)
    arr = np.zeros((h, w, 3), np.float32) + np.array([206, 150, 88], np.float32)
    arr += ((n - 0.5) * 34)[..., None]
    arr += ((resized_noise(64, 64, 1.0, h, w) - 0.5) * 14)[..., None]       # macchie del legno
    return arr


def board_strip(w=4096, h=256, panels=()):
    img = to_img(plywood(w, h)).convert('RGBA')
    d = ImageDraw.Draw(img)
    pxm = w / 18.5
    for xm in np.arange(0, 18.5, 1.22):
        x = int(xm * pxm)
        d.rectangle([x - 2, 0, x + 2, h], fill=(150, 104, 58, 255))
    d.rectangle([0, h - 46, w, h], fill=YEL + (255,))
    for xm, wm, fn in panels:
        fn(img, int(xm * pxm), 18, int((xm + wm) * pxm), h - 60)
    return img


def logo_panel(img, x0, y0, x1, y1):
    ImageDraw.Draw(img).rectangle([x0, y0, x1, y1], fill=WHITE + (255,))
    paste_fit(img, LOGO, (x0 + 8, y0 + 6, x1 - 8, y1 - 6))


def text_panel(t, bg, fg, font='arialbd.ttf'):
    def f(img, x0, y0, x1, y1):
        ImageDraw.Draw(img).rectangle([x0, y0, x1, y1], fill=bg + (255,), outline=(150, 150, 150, 255), width=3)
        paste_fit(img, text_layer(t, font, fg, spacing=4), (x0 + 24, y0 + 20, x1 - 24, y1 - 20))
    return f


def club_panel(img, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    d.rectangle([x0, y0, x1, y1], fill=NAVY + (255,))
    d.rectangle([x0, y1 - 12, x1, y1], fill=RED + (255,))
    h = y1 - y0
    paste_fit(img, LOGO, (x0 + 10, y0 + 6, x0 + int(h * 1.2), y1 - 16))
    paste_fit(img, text_layer('HAWKS', 'ariblk.ttf', WHITE), (x0 + int(h * 1.2) + 20, y0 + 14, x1 - 20, y0 + h // 2 + 2), 'left')
    paste_fit(img, text_layer('ROLLER HOCKEY • ANGERS', 'arialbd.ttf', SKY, spacing=3), (x0 + int(h * 1.2) + 20, y0 + h // 2 + 12, x1 - 20, y1 - 24), 'left')


save(board_strip(panels=[(1.0, 2.4, logo_panel), (4.2, 4.4, text_panel('ANGERS', WHITE, NAVY, 'georgia.ttf')), (12.5, 4.8, text_panel('LIGUE ÉLITE ROLLER HOCKEY', WHITE, BLACK, 'impact.ttf'))]), 'boards_a.jpg')
save(board_strip(panels=[(1.5, 4.2, text_panel('ANJOU', RED, WHITE, 'ariblk.ttf')), (10.5, 2.4, logo_panel), (13.5, 4.6, text_panel('PAYS DE LA LOIRE', NAVY, WHITE))]), 'boards_b.jpg')
save(board_strip(panels=[(3.0, 6.0, club_panel), (11.5, 4.2, text_panel('ANGERS', WHITE, NAVY, 'georgia.ttf'))]), 'boards_center.jpg')
save(board_strip(1024, 256, panels=[(6.5, 3.6, logo_panel)]), 'boards_corner.jpg')

# ================================================================== 3. EDIFICIO
print('edificio')
# compensato delle pareti basse (texture 4 x 3 m), pannelli da 1,22 m
W, H = 512, 384
im = to_img(plywood(W, H))
d = ImageDraw.Draw(im)
for xm in (0, 1.22, 2.44, 3.66):
    x = int(xm / 4 * W)
    d.line([(x, 0), (x, H)], fill=(150, 104, 58), width=3)
d.line([(0, int(H * 0.4)), (W, int(H * 0.4))], fill=(150, 104, 58), width=3)
save(im, 'plywood.jpg')
# intonaco chiaro delle testate
W = H = 512
pl = np.zeros((H, W, 3), np.float32) + np.array([226, 224, 216], np.float32)
pl += ((fft_noise(H, W, beta=2.4) - 0.5) * 10)[..., None]
save(to_img(pl).filter(ImageFilter.GaussianBlur(0.6)), 'plaster.jpg')
# vetrata alta: lastre traslucide chiare a riquadri, telaio grigio (texture 6 x 6 m)
W = H = 768
PXg = W / 6.0
gw = np.zeros((H, W, 3), np.float32) + np.array([236, 240, 242], np.float32)
gw += ((resized_noise(16, 32, 1.4, H, W) - 0.5) * 18)[..., None]
im = to_img(gw)
d = ImageDraw.Draw(im)
for k in range(0, 7):
    x = int(k * PXg)
    d.rectangle([x - 5, 0, x + 5, H], fill=(130, 134, 140))
for ym in (0, 2.0, 4.0, 6.0):
    y = int(ym * PXg)
    d.rectangle([0, y - 4, W, y + 4], fill=(130, 134, 140))
for k in range(0, 6):                                        # montanti intermedi più sottili
    x = int((k + 0.5) * PXg)
    d.rectangle([x - 2, 0, x + 2, H], fill=(160, 164, 168))
save(im.filter(ImageFilter.GaussianBlur(0.5)), 'glazing.jpg')
# zoccolo grigio sul lato della tribuna
W, H = 512, 256
gz2 = np.zeros((H, W, 3), np.float32) + np.array([150, 156, 160], np.float32)
gz2 += ((fft_noise(H, W, beta=2.2) - 0.5) * 10)[..., None]
save(to_img(gz2), 'wall_grey.jpg')
# lamiera chiara della copertura, grecata (texture 4 x 4 m)
W = H = 512
u = np.arange(W)[None, :] / W
rf = np.zeros((H, W, 3), np.float32) + np.array([222, 228, 234], np.float32)
rf += ((fft_noise(H, W, beta=2.2) - 0.5) * 8)[..., None]
rf *= (1 - 0.14 * (np.sin(u * np.pi * 2 * 16) > 0.5))[..., None]
save(to_img(rf).filter(ImageFilter.GaussianBlur(0.6)), 'roof_deck.jpg')
# legno lamellare scuro (texture 4 x 1 m, venature lungo la trave)
W, H = 512, 128
wd = np.zeros((H, W, 3), np.float32) + np.array([110, 66, 38], np.float32)
wd += ((resized_noise(8, 256, 1.4, H, W) - 0.5) * 26)[..., None]
wd *= (1 - 0.1 * ((np.arange(H)[:, None] % 21) < 2))[..., None]
save(to_img(wd), 'glulam.jpg')
# rete scura dietro le porte
W = H = 256
net = Image.new('RGBA', (W, H), (0, 0, 0, 0))
nd = ImageDraw.Draw(net)
for k in range(0, W + 1, 16):
    nd.line([(k, 0), (k, H)], fill=(34, 48, 38, 190), width=2)
    nd.line([(0, k), (W, k)], fill=(34, 48, 38, 190), width=2)
save(net, 'net.png')

# ================================================================== 4. STENDARDI, BANDIERA, STRISCIONI
print('stendardi')


def pennant(w, h, top, lines, logo=False, number=None):
    p = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(p)
    d.rectangle([0, 0, w, h], fill=NAVY + (255,))
    d.rectangle([0, 0, w, int(h * 0.1)], fill=RED + (255,))
    d.rectangle([0, h - 12, w, h], fill=RED + (255,))
    d.rectangle([6, 6, w - 7, h - 7], outline=(200, 206, 230, 255), width=3)
    paste_fit(p, text_layer(top, 'arialbd.ttf', WHITE), (12, 6, w - 12, int(h * 0.1) - 4))
    y = int(h * 0.14)
    if logo:
        paste_fit(p, LOGO, (14, y, w - 14, y + int(w * 0.8)))
        y += int(w * 0.85)
    if number:
        for k in range(5):
            cx = 18 + k * (w - 36) / 4
            d.regular_polygon((cx, y + 18, 9), 5, fill=WHITE + (255,))
        paste_fit(p, text_layer(number, 'ariblk.ttf', WHITE), (16, y + 40, w - 16, h - 30))
    for t in lines:
        paste_fit(p, text_layer(t, 'arialbd.ttf', WHITE), (16, y, w - 16, y + 44))
        y += 54
    return p


PW = 200
pens = [pennant(PW, 600, 'HAWKS', ['ROLLER HOCKEY', 'LOISIR', 'COMPÉTITION', 'ÉLITE', 'JEUNESSE', 'FAMILLE'], logo=True),
        pennant(PW, 400, 'ÉLITE', ['1998', '2000', '2001', '2002']),
        pennant(PW, 400, 'COUPE', ['2001', '2014']),
        pennant(PW, 400, 'NATIONALE', ['1997', '2016'])]
nums = [pennant(PW, 330, 'HAWKS', [], number=n) for n in ('15', '27', '6')]
sheet = Image.new('RGBA', (PW * 7 + 60, 600), (0, 0, 0, 0))
x = 0
for p in pens + nums:
    sheet.alpha_composite(p, (x, 0))
    x += PW + 10
save(sheet, 'pennants.png')

# tricolore francese, con una leggera piega
W, H = 600, 400
fl = np.zeros((H, W, 3), np.float32)
fl[:, :200] = (0, 35, 149); fl[:, 200:400] = (250, 250, 250); fl[:, 400:] = (237, 41, 57)
fl *= (0.88 + 0.12 * np.sin(np.arange(W)[None, :] / W * np.pi * 5))[..., None]
save(to_img(fl), 'flag_fr.jpg')

# striscione della città sopra l'uscita delle panchine
b = Image.new('RGBA', (1024, 256), WHITE + (255,))
bd = ImageDraw.Draw(b)
bd.rectangle([850, 0, 1024, 256], fill=RED)
bd.polygon([(850, 0), (1024, 0), (850, 256)], fill=NAVY)
paste_fit(b, text_layer('ANGERS', 'georgia.ttf', BLACK, spacing=10), (40, 30, 820, 140), 'left')
paste_fit(b, text_layer('LE SPORT EN ANJOU', 'arialbd.ttf', NAVY, spacing=6), (40, 160, 820, 230), 'left')
save(banner_finish(b), 'banner_city.jpg', quality=86)
# striscione del club
b = Image.new('RGBA', (1024, 384), NAVY + (255,))
bd = ImageDraw.Draw(b)
bd.rectangle([0, 0, 1024, 22], fill=RED)
bd.rectangle([0, 362, 1024, 384], fill=RED)
paste_fit(b, LOGO, (30, 40, 400, 344))
paste_fit(b, text_layer('HAWKS', 'ariblk.ttf', WHITE), (430, 70, 990, 200), 'left')
paste_fit(b, text_layer('ANGERS', 'ariblk.ttf', SKY, spacing=12), (430, 230, 990, 320), 'left')
save(banner_finish(b), 'banner_club.jpg', quality=86)
print('fatto')
