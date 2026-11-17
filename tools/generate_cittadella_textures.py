"""Genera le texture del PalaHockey di Cittadella in assets/textures/cittadella/.
Uso (dalla cartella del progetto): python tools/generate_cittadella_textures.py .
Richiede numpy e Pillow; usa i font di Windows (C:/Windows/Fonts).
"""
import sys, os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'cittadella')
os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.join(OUT, 'banners'), exist_ok=True)
FONTS = 'C:/Windows/Fonts/'
rng = np.random.default_rng(1990)
random.seed(1990)

LOGO = Image.open(os.path.join(ROOT, 'assets', 'logos', 'cittadella.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())


def save(img, name, quality=88):
    path = os.path.join(OUT, name)
    if name.endswith('.png'):
        img.save(path, optimize=True)
    else:
        img.convert('RGB').save(path, quality=quality, optimize=True, progressive=True)
    print('  ', name, img.size, os.path.getsize(path) // 1024, 'KB')


# ------------------------------------------------------------------ rumore
def fft_noise(h, w, beta=2.0, sx=1.0, sy=1.0):
    """Rumore frattale periodico (tileable). sx/sy < 1 allungano le strutture lungo quell'asse."""
    n = rng.standard_normal((h, w))
    F = np.fft.fft2(n)
    fy = np.fft.fftfreq(h)[:, None] / sy
    fx = np.fft.fftfreq(w)[None, :] / sx
    f = np.sqrt(fx ** 2 + fy ** 2)
    f[0, 0] = 1
    F = F / f ** (beta / 2)
    F[0, 0] = 0
    r = np.real(np.fft.ifft2(F))
    r -= r.min()
    r /= max(1e-9, r.max())
    return r


def normal_from_height(hm, strength):
    dx = (np.roll(hm, -1, axis=1) - np.roll(hm, 1, axis=1)) * 0.5
    dy = (np.roll(hm, -1, axis=0) - np.roll(hm, 1, axis=0)) * 0.5
    nx = -dx * strength
    ny = dy * strength
    nz = np.ones_like(hm)
    l = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    rgb = np.stack([nx / l, ny / l, nz / l], axis=-1) * 0.5 + 0.5
    return Image.fromarray((rgb * 255).clip(0, 255).astype(np.uint8), 'RGB')


def to_img(arr):
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGB')


# ------------------------------------------------------------------ testo
def font(name, size):
    return ImageFont.truetype(FONTS + name, size)


def text_layer(text, fontfile, color, size=220, shear=0.0, stroke=0, stroke_fill=None, spacing=0):
    f = font(fontfile, size)
    tmp = Image.new('L', (10, 10))
    d = ImageDraw.Draw(tmp)
    if spacing:
        widths = [d.textlength(ch, font=f) for ch in text]
        total = sum(widths) + spacing * (len(text) - 1)
        bb = d.textbbox((0, 0), text, font=f, stroke_width=stroke)
        W, H = int(total + size), int(bb[3] - bb[1] + size)
        img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        dd = ImageDraw.Draw(img)
        x = size // 2
        for ch, cw in zip(text, widths):
            dd.text((x, size // 2 - bb[1]), ch, font=f, fill=color, stroke_width=stroke, stroke_fill=stroke_fill)
            x += cw + spacing
    else:
        bb = d.textbbox((0, 0), text, font=f, stroke_width=stroke)
        W, H = bb[2] - bb[0] + size, bb[3] - bb[1] + size
        img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(img).text((size // 2 - bb[0], size // 2 - bb[1]), text, font=f, fill=color,
                                 stroke_width=stroke, stroke_fill=stroke_fill)
    if shear:
        w, h = img.size
        extra = int(abs(shear) * h)
        img = img.transform((w + extra, h), Image.AFFINE, (1, shear, -extra if shear > 0 else 0, 0, 1, 0), Image.BICUBIC)
    return img.crop(img.getbbox())


def paste_fit(dst, layer, box, align='center'):
    x0, y0, x1, y1 = box
    bw, bh = x1 - x0, y1 - y0
    k = min(bw / layer.width, bh / layer.height)
    lw, lh = max(1, int(layer.width * k)), max(1, int(layer.height * k))
    lay = layer.resize((lw, lh), Image.LANCZOS)
    if align == 'left':
        px = x0
    elif align == 'right':
        px = x1 - lw
    else:
        px = x0 + (bw - lw) // 2
    py = y0 + (bh - lh) // 2
    dst.alpha_composite(lay, (int(px), int(py)))
    return (int(px), int(py), int(px + lw), int(py + lh))


def logo_fit(dst, box):
    return paste_fit(dst, LOGO, box)


# ------------------------------------------------------------------ pannelli sponsor (riutilizzati su balaustre e striscioni)
def panel(name, w, h):
    """Disegna un pannello pubblicitario w x h (RGBA)."""
    img = Image.new('RGBA', (w, h), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    m = int(h * 0.12)

    def bg(col):
        d.rectangle([0, 0, w, h], fill=col)

    if name == 'cittadella':
        logo_fit(img, (m, m, int(h * 1.25), h - m))
        paste_fit(img, text_layer('CITTADELLA', 'ariblk.ttf', (200, 16, 46), shear=-0.22), (int(h * 1.32), m, w - m, int(h * 0.62)), 'left')
        paste_fit(img, text_layer('HOCKEY', 'ariblk.ttf', (20, 35, 90), shear=-0.22, spacing=30), (int(h * 1.32), int(h * 0.6), w - m, h - m), 'left')
    elif name == 'cittadella_big':
        logo_fit(img, (m, m // 2, int(h * 1.5), h - m // 2))
        logo_fit(img, (w - int(h * 1.5), m // 2, w - m, h - m // 2))
        paste_fit(img, text_layer('CITTADELLA HOCKEY', 'ariblk.ttf', (20, 35, 90), shear=-0.22), (int(h * 1.7), int(h * 0.08), w - int(h * 1.7), int(h * 0.7)))
        paste_fit(img, text_layer('INLINE HOCKEY  •  SERIE A  •  CITTADELLA (PD)', 'arialbd.ttf', (200, 16, 46), spacing=6), (int(h * 1.7), int(h * 0.72), w - int(h * 1.7), int(h * 0.92)))
    elif name == 'sariv':
        paste_fit(img, text_layer('SARIV', 'seguibl.ttf', (24, 128, 72), spacing=18), (m, m, int(w * 0.62), h - m))
        paste_fit(img, text_layer('IMPIANTI', 'arialbd.ttf', (90, 90, 90)), (int(w * 0.65), int(h * 0.28), w - m, int(h * 0.52)), 'left')
        paste_fit(img, text_layer('ELETTRICI', 'arialbd.ttf', (90, 90, 90)), (int(w * 0.65), int(h * 0.54), w - m, int(h * 0.78)), 'left')
    elif name == 'intimissimi':
        paste_fit(img, text_layer('intimissimi', 'segoeuib.ttf', (20, 20, 20), spacing=4), (m * 2, int(h * 0.22), w - m * 2, int(h * 0.78)))
    elif name == 'forese':
        paste_fit(img, text_layer('FORESE', 'ariblk.ttf', (210, 30, 40)), (m, int(h * 0.1), int(w * 0.7), int(h * 0.62)), 'left')
        paste_fit(img, text_layer('GROUP', 'arialbd.ttf', (30, 30, 30), spacing=20), (m, int(h * 0.64), int(w * 0.5), h - m), 'left')
        d.ellipse([int(w * 0.74), int(h * 0.2), int(w * 0.74) + int(h * 0.6), int(h * 0.8)], fill=(76, 175, 80))
        paste_fit(img, text_layer('G', 'ariblk.ttf', (255, 255, 255)), (int(w * 0.74), int(h * 0.26), int(w * 0.74) + int(h * 0.6), int(h * 0.74)))
    elif name == 'vetrocar':
        bg((28, 76, 156))
        paste_fit(img, text_layer('VETROCAR', 'impact.ttf', (255, 255, 255), spacing=10), (m, m, w - m, int(h * 0.76)))
        d.rectangle([int(w * 0.18), int(h * 0.8), int(w * 0.82), int(h * 0.86)], fill=(230, 40, 40))
    elif name == 'ferrara':
        paste_fit(img, text_layer('Da Ferrara', 'COOPBL.TTF', (196, 30, 36)), (m, m, w - m, int(h * 0.7)))
        paste_fit(img, text_layer('SERRAMENTI', 'arialbd.ttf', (60, 60, 60), spacing=14), (int(w * 0.2), int(h * 0.72), int(w * 0.8), h - m))
    elif name == 'autostazione':
        bg((200, 24, 34))
        paste_fit(img, text_layer("L'AUTOSTAZIONE", 'ariblk.ttf', (255, 255, 255)), (m, int(h * 0.2), w - m, int(h * 0.8)))
    elif name == 'torresin':
        bg((36, 132, 64))
        paste_fit(img, text_layer('TORRESIN', 'ariblk.ttf', (255, 255, 255)), (m, m, w - m, int(h * 0.64)))
        paste_fit(img, text_layer('G.F.S.', 'arialbd.ttf', (255, 235, 59), spacing=12), (int(w * 0.3), int(h * 0.66), int(w * 0.7), h - m))
    elif name == 'cortal':
        paste_fit(img, text_layer('CORTAL', 'ROCKEB.TTF', (214, 40, 30)), (m, m, int(w * 0.7), int(h * 0.72)), 'left')
        paste_fit(img, text_layer('extrasoy', 'segoeuib.ttf', (245, 124, 0)), (int(w * 0.5), int(h * 0.6), w - m, h - m), 'right')
        d.ellipse([int(w * 0.78), int(h * 0.12), int(w * 0.78) + int(h * 0.42), int(h * 0.54)], outline=(214, 40, 30), width=max(2, h // 30))
    elif name == 'torni':
        bg((18, 36, 84))
        paste_fit(img, text_layer('TORNI LUIGI', 'FRAMDCN.TTF', (255, 255, 255), spacing=8), (m, int(h * 0.12), w - m, int(h * 0.68)))
        paste_fit(img, text_layer('LAVORAZIONI MECCANICHE', 'arialbd.ttf', (148, 190, 255), spacing=4), (int(w * 0.12), int(h * 0.72), int(w * 0.88), h - m))
    elif name == 'celenit':
        paste_fit(img, text_layer('CELENIT', 'arialbd.ttf', (24, 84, 166), spacing=16), (m, m, w - m, int(h * 0.72)))
        d.rectangle([m, int(h * 0.78), w - m, int(h * 0.84)], fill=(218, 37, 29))
    elif name == 'edilnova':
        bg((16, 58, 118))
        paste_fit(img, text_layer('EDILNOVA', 'GILSANUB.TTF', (255, 255, 255)), (m, int(h * 0.15), w - m, int(h * 0.7)))
        paste_fit(img, text_layer('COSTRUZIONI', 'arialbd.ttf', (255, 213, 79), spacing=12), (int(w * 0.25), int(h * 0.72), int(w * 0.75), h - m))
    elif name == 'promec':
        paste_fit(img, text_layer('PROMEC', 'ariblk.ttf', (15, 15, 15), spacing=10), (m, m, w - m, h - m))
        bb = (w - m - h // 6, m, w - m, m + h // 6)
        d.ellipse(bb, fill=(220, 38, 38))
    elif name == 'diprint':
        lay_a = text_layer('DI', 'ariblk.ttf', (218, 37, 29))
        lay_b = text_layer('print.it', 'ariblk.ttf', (25, 25, 25))
        comb = Image.new('RGBA', (lay_a.width + lay_b.width + 20, max(lay_a.height, lay_b.height)), (0, 0, 0, 0))
        comb.alpha_composite(lay_a, (0, comb.height - lay_a.height))
        comb.alpha_composite(lay_b, (lay_a.width + 20, comb.height - lay_b.height))
        paste_fit(img, comb, (m, int(h * 0.08), int(w * 0.62), int(h * 0.92)), 'left')
        for i, t in enumerate(['STRISCIONI', 'ESPOSITORI', 'GADGET • RICAMO']):
            paste_fit(img, text_layer(t, 'arialbd.ttf', (70, 70, 70)), (int(w * 0.65), int(h * (0.16 + i * 0.24)), w - m, int(h * (0.36 + i * 0.24))), 'left')
    elif name == 'xausa':
        bg((0, 92, 170))
        paste_fit(img, text_layer('XAUSA', 'ariblk.ttf', (255, 255, 255), spacing=20), (m, int(h * 0.16), w - m, int(h * 0.84)))
    elif name == 'studiomarcon':
        bg((14, 92, 86))
        paste_fit(img, text_layer('StudioMarcon', 'segoeuib.ttf', (255, 255, 255)), (m, int(h * 0.08), w - m, int(h * 0.64)))
        paste_fit(img, text_layer('Postura e occlusione', 'segoeuib.ttf', (190, 236, 226)), (int(w * 0.2), int(h * 0.66), int(w * 0.8), h - m))
    elif name == 'dafranco':
        paste_fit(img, text_layer('Da Franco', 'BRUSHSCI.TTF', (200, 24, 34)), (m, 0, w - m, int(h * 0.74)))
        paste_fit(img, text_layer('PIZZERIA • SPAGHETTERIA', 'arialbd.ttf', (40, 110, 50), spacing=6), (int(w * 0.12), int(h * 0.72), int(w * 0.88), h - m))
    elif name == 'berto':
        d.polygon([(m, h - m), (m + int(h * 0.38), m), (m + int(h * 0.76), h - m)], fill=(34, 139, 34))
        paste_fit(img, text_layer('BERTO', 'ariblk.ttf', (30, 30, 30), spacing=10), (m + int(h * 0.9), m, w - m, int(h * 0.66)), 'left')
        paste_fit(img, text_layer('FORNITURE INDUSTRIALI', 'arialbd.ttf', (34, 139, 34)), (m + int(h * 0.9), int(h * 0.68), w - m, h - m), 'left')
    elif name == 'lottando':
        paste_fit(img, text_layer('LOTTANDO SI VINCE', 'impact.ttf', (25, 25, 25), spacing=12), (m, int(h * 0.14), w - m, int(h * 0.86)))
    elif name == 'sempre':
        paste_fit(img, text_layer('SEMPRE INSIEME A VOI', 'impact.ttf', (30, 30, 30), spacing=14), (m * 2 + int(h * 0.62), int(h * 0.12), w - m * 2 - int(h * 0.62), int(h * 0.88)))
        for x in (m, w - m - int(h * 0.5)):
            logo_fit(img, (x, int(h * 0.2), x + int(h * 0.5), int(h * 0.8)))
    elif name == 'rollerblade':
        bg((12, 12, 12))
        paste_fit(img, text_layer('ROLLERBLADE', 'ariblk.ttf', (255, 255, 255), shear=-0.25, spacing=8), (m, int(h * 0.2), w - m, int(h * 0.8)))
    elif name == 'spazio':
        paste_fit(img, text_layer('SPAZIO PUBBLICITARIO LIBERO', 'arialbd.ttf', (25, 25, 25), spacing=6), (m, int(h * 0.12), w - m, int(h * 0.6)))
        paste_fit(img, text_layer('INFO: SEGRETERIA CITTADELLA HOCKEY', 'arialbd.ttf', (200, 16, 46), spacing=4), (int(w * 0.15), int(h * 0.64), int(w * 0.85), h - m))
    return img


def banner(name, w=1024, h=256):
    """Striscione in PVC: pannello + bordo cucito, occhielli e leggere pieghe."""
    img = panel(name, w, h)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w - 1, h - 1], outline=(200, 200, 200, 255), width=6)
    for (x, y) in [(14, 14), (w - 15, 14), (14, h - 15), (w - 15, h - 15), (w // 2, 12), (w // 2, h - 13)]:
        d.ellipse([x - 7, y - 7, x + 7, y + 7], fill=(170, 170, 175), outline=(90, 90, 95), width=2)
    # pieghe: leggera modulazione di luminosità
    xs = np.linspace(0, 1, w)
    fold = 1.0 - 0.06 * (np.sin(xs * math.pi * 3.0 + 0.6) * 0.5 + 0.5) - 0.03 * np.sin(xs * math.pi * 11)
    arr = np.asarray(img).astype(np.float32)
    arr[..., :3] *= fold[None, :, None]
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA')


# ================================================================== 1. LEGNO LAMELLARE
print('legno lamellare')
W, H = 1024, 256
grain = fft_noise(H, W, beta=2.2, sx=0.05, sy=1.0)
fine = fft_noise(H, W, beta=1.4, sx=0.15, sy=1.0)
lam_edges = [0]
while lam_edges[-1] < H:
    lam_edges.append(lam_edges[-1] + int(rng.integers(10, 14)))
lam_edges[-1] = H
base = np.zeros((H, W, 3), np.float32)
height = np.zeros((H, W), np.float32)
for a, b in zip(lam_edges[:-1], lam_edges[1:]):
    jitter = rng.normal(0, 9, 3)
    tone = np.array([200, 128, 62], np.float32) + jitter + rng.normal(0, 7)
    base[a:b] = tone
    base[a:min(b, a + 1)] *= 0.72  # linea di colla
    height[a:min(b, a + 1)] = -1.0
g = (grain - 0.5) * 50 + (fine - 0.5) * 22
base += g[..., None] * np.array([1.0, 0.72, 0.42])
# nodi (con wrap orizzontale)
yy, xx = np.mgrid[0:H, 0:W]
for _ in range(9):
    kx, ky = rng.integers(0, W), rng.integers(8, H - 8)
    for off in (-W, 0, W):
        dd = ((xx - kx - off) / 18.0) ** 2 + ((yy - ky) / 5.0) ** 2
        k = np.exp(-dd)
        base -= (k * 70)[..., None] * np.array([1.0, 0.85, 0.7])
        height -= k * 0.5
save(to_img(base), 'glulam.jpg')
save(normal_from_height(height + grain * 1.5 + fine * 0.6, 2.2), 'glulam_n.jpg')

# ================================================================== 2. TELO DI COPERTURA (PVC)
print('telo copertura')
W = H = 1024
stain = fft_noise(H, W, beta=2.6)
weave = (np.sin(np.arange(W) * 2 * math.pi / 4)[None, :] * np.sin(np.arange(H) * 2 * math.pi / 4)[:, None])
memb = np.zeros((H, W, 3), np.float32) + np.array([240, 233, 216], np.float32)
memb += ((stain - 0.5) * 22)[..., None]
memb += (weave * 2.0)[..., None]
mh = weave * 0.15 + stain * 0.8
for sx_ in (0, 341, 683):  # saldature dei teli (parallele all'arco)
    memb[:, sx_:sx_ + 3] *= 0.93
    memb[:, sx_ + 3:sx_ + 5] *= 1.02
    mh[:, sx_:sx_ + 5] += 1.2
save(to_img(memb), 'membrane.jpg')
save(normal_from_height(mh, 1.6), 'membrane_n.jpg')

# ================================================================== 3. LAMIERA GRECATA BORDEAUX
print('lamiera bordeaux')
W = H = 512
period, top, slope = 128, 40, 24
prof = np.zeros(W, np.float32)
shade = np.zeros(W, np.float32)
for x in range(W):
    p = x % period
    if p < top:
        prof[x], shade[x] = 1.0, 1.0
    elif p < top + slope:
        prof[x], shade[x] = 1.0 - (p - top) / slope, 0.82
    elif p < top + slope + top:
        prof[x], shade[x] = 0.0, 0.94
    else:
        prof[x], shade[x] = (p - top - slope - top) / slope, 1.1
grime = fft_noise(H, W, beta=2.0, sx=1.0, sy=0.12)
wall = np.zeros((H, W, 3), np.float32) + np.array([118, 30, 34], np.float32)
wall *= shade[None, :, None]
wall += ((grime - 0.5) * 18)[..., None]
save(to_img(wall), 'wall_maroon.jpg')
save(normal_from_height(np.tile(prof * 6.0, (H, 1)) + grime * 0.6, 1.0), 'wall_maroon_n.jpg')

# ================================================================== 4. PISTA (colore + rilievo piastrelle SportCourt)
print('pista')
RW, RL = 36.0, 72.0
W, H = 2048, 4096
S = W / RW
TILE = 0.305
tx = (np.arange(W) / S / TILE).astype(int)
ty = (np.arange(H) / S / TILE).astype(int)
tile_rand = rng.normal(0, 1, (ty.max() + 1, tx.max() + 1))
tile_tilt_x = rng.normal(0, 0.035, (ty.max() + 1, tx.max() + 1))
tile_tilt_y = rng.normal(0, 0.035, (ty.max() + 1, tx.max() + 1))
TR = tile_rand[ty[:, None], tx[None, :]]
col = np.zeros((H, W, 3), np.float32) + np.array([122, 170, 220], np.float32)
col += (TR * 2.6)[..., None]
wear = fft_noise(1024, 512, beta=2.4)
wear = np.asarray(Image.fromarray((wear * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(np.float32) / 255
col += ((wear - 0.5) * 10)[..., None]
# fughe tra le piastrelle
fx = (np.arange(W) / S) % TILE
fy = (np.arange(H) / S) % TILE
groove = ((fx[None, :] < 0.012) | (fy[:, None] < 0.012))
col[groove] *= 0.9

# area esterna agli angoli arrotondati (pavimento di servizio grigio)
CR = 7.5
X = (np.arange(W)[None, :] + 0.5) / S - RW / 2
Z = (np.arange(H)[:, None] + 0.5) / S - RL / 2
cx_, cz_ = RW / 2 - CR, RL / 2 - CR
outside = (np.abs(X) > cx_) & (np.abs(Z) > cz_) & (((np.abs(X) - cx_) ** 2 + (np.abs(Z) - cz_) ** 2) > CR ** 2)
col[outside] = np.array([118, 124, 132], np.float32) + (TR[outside] * 2)[..., None]

# segnaletica rossa disegnata a 2x e ridotta (antialias)
SS = 2
mask = Image.new('L', (W * SS, H * SS), 0)
md = ImageDraw.Draw(mask)


def P(x, z):
    return ((x + RW / 2) * S * SS, (z + RL / 2) * S * SS)


def rect(x0, z0, x1, z1):
    a, b = P(x0, z0), P(x1, z1)
    md.rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=255)


def ring(x, z, r, wdt):
    c = P(x, z)
    R = r * S * SS
    md.ellipse([c[0] - R, c[1] - R, c[0] + R, c[1] + R], outline=255, width=max(1, int(wdt * S * SS)))


GOAL_Z = 31.0
rect(-RW / 2, -0.15, RW / 2, 0.15)                       # linea centrale
for sgn in (-1, 1):
    rect(-RW / 2, sgn * GOAL_Z - 0.04, RW / 2, sgn * GOAL_Z + 0.04)   # linea di porta
    # area di porta rossa (sotto la porta e davanti)
    rect(-2.1, sgn * GOAL_Z - sgn * 1.35, 2.1, sgn * (GOAL_Z + 1.25))
    for x in (-8.5, 8.5):
        ring(x, sgn * 21, 4.3, 0.09)                     # cerchi di ingaggio
        rect(x - 0.18, sgn * 21 - 0.18, x + 0.18, sgn * 21 + 0.18)
        for hx in (-1, 1):                               # tacche
            for hz in (-1, 1):
                rect(x + hx * 0.6, sgn * 21 + hz * 0.32, x + hx * 1.05, sgn * 21 + hz * 0.38)
        rect(x - 0.15, sgn * 9.5 - 0.15, x + 0.15, sgn * 9.5 + 0.15)   # punti zona neutra
ring(0, 0, 4.5, 0.1)                                     # cerchio centrale
mask = mask.resize((W, H), Image.LANCZOS)
m = np.asarray(mask).astype(np.float32)[..., None] / 255
red = np.array([186, 20, 30], np.float32)
col = col * (1 - m * 0.93) + red * (m * 0.93)

# logo al centro, ruotato per leggersi dal lato panchine/telecamera
logo = LOGO.rotate(90, expand=True)
LW_M = 7.4
lw = int(LW_M * S)
lh = int(logo.height * lw / logo.width)
logo = logo.resize((lw, lh), Image.LANCZOS)
la = np.asarray(logo).astype(np.float32)
x0, y0 = W // 2 - lw // 2, H // 2 - lh // 2
a = la[..., 3:4] / 255 * 0.94
col[y0:y0 + lh, x0:x0 + lw] = col[y0:y0 + lh, x0:x0 + lw] * (1 - a) + la[..., :3] * a

# segni di ruote e gomma
img = to_img(col).convert('RGBA')
sc = Image.new('RGBA', img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(sc)
for _ in range(520):
    zc = random.choice([-21, 21, -31, 31, 0, -9.5, 9.5]) + random.gauss(0, 4)
    xc = random.gauss(0, 7)
    px, py = (xc + RW / 2) * S, (zc + RL / 2) * S
    ln = random.uniform(30, 140)
    ang = random.uniform(0, math.pi)
    sd.line([px, py, px + math.cos(ang) * ln, py + math.sin(ang) * ln], fill=(40, 45, 55, random.randint(10, 28)), width=random.randint(2, 4))
sc = sc.filter(ImageFilter.GaussianBlur(1.2))
img.alpha_composite(sc)
save(img.convert('RGB'), 'rink_color.jpg', quality=90)

hn = np.zeros((H, W), np.float32)
hn[groove] = -1.0
nimg = np.asarray(normal_from_height(hn, 1.4)).astype(np.float32) / 255 * 2 - 1
TX = tile_tilt_x[ty[:, None], tx[None, :]]
TY = tile_tilt_y[ty[:, None], tx[None, :]]
nimg[..., 0] += TX
nimg[..., 1] += TY
nimg /= np.linalg.norm(nimg, axis=-1, keepdims=True)
save(Image.fromarray(((nimg * 0.5 + 0.5) * 255).astype(np.uint8), 'RGB'), 'rink_normal.jpg', quality=90)

# ================================================================== 5. BALAUSTRE PUBBLICITARIE
print('balaustre')


def board_strip(panels, w=4096, h=256, widths=None):
    img = Image.new('RGBA', (w, h), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    top_cap, kick = 10, 54
    ad_h = h - top_cap - kick
    widths = widths or [w // len(panels)] * len(panels)
    x = 0
    for name, pw in zip(panels, widths):
        p = panel(name, pw - 6, ad_h - 8)
        img.alpha_composite(p, (x + 3, top_cap + 4))
        d.line([x, top_cap, x, h - kick], fill=(205, 210, 216), width=3)
        x += pw
    d.rectangle([0, 0, w, top_cap], fill=(46, 52, 62))
    d.rectangle([0, h - kick, w, h], fill=(242, 190, 26))
    d.line([0, h - kick, w, h - kick], fill=(196, 150, 10), width=3)
    arr = np.asarray(img).astype(np.float32)
    for _ in range(140):  # segni di dischi e pattini sul battiscopa
        sx = random.randint(0, w - 60)
        sy = random.randint(h - kick + 6, h - 6)
        ln = random.randint(8, 60)
        arr[sy:sy + random.randint(2, 4), sx:sx + ln, :3] *= random.uniform(0.35, 0.7)
    for _ in range(60):
        sx, sy = random.randint(0, w - 30), random.randint(top_cap, h - kick - 4)
        arr[sy:sy + 3, sx:sx + random.randint(6, 26), :3] *= 0.85
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA')


save(board_strip(['cittadella', 'sariv', 'intimissimi', 'forese', 'vetrocar', 'ferrara', 'autostazione', 'torresin']), 'boards_a.jpg')
save(board_strip(['cortal', 'torni', 'celenit', 'cittadella', 'edilnova', 'promec', 'diprint', 'xausa']), 'boards_b.jpg')
save(board_strip(['studiomarcon', 'forese', 'cittadella_big', 'sariv', 'cortal'], widths=[512, 512, 2048, 512, 512]), 'boards_center.jpg')
corner = Image.new('RGBA', (1024, 256), (255, 255, 255, 255))
cd = ImageDraw.Draw(corner)
cd.rectangle([0, 0, 1024, 10], fill=(46, 52, 62))
cd.rectangle([0, 202, 1024, 256], fill=(242, 190, 26))
for i in range(0, 1024, 256):
    cd.rectangle([i + 40, 92, i + 216, 104], fill=(200, 16, 46))
    cd.rectangle([i + 40, 110, i + 216, 116], fill=(20, 35, 90))
save(corner, 'boards_corner.jpg')

# ================================================================== 6. STRISCIONI SUL TELO E IN TESTATA
print('striscioni')
for nm in ['promec', 'diprint', 'forese', 'studiomarcon', 'dafranco', 'celenit', 'berto', 'cortal', 'edilnova',
           'xausa', 'torni', 'vetrocar', 'sariv', 'lottando', 'rollerblade', 'spazio']:
    save(banner(nm), f'banners/{nm}.jpg', quality=86)
save(banner('sempre', 2048, 320), 'banners/sempre.jpg', quality=86)

# stendardo verticale del club
em = Image.new('RGBA', (512, 768), (248, 248, 248, 255))
ed = ImageDraw.Draw(em)
ed.rectangle([0, 0, 512, 60], fill=(200, 16, 46))
ed.rectangle([0, 60, 512, 74], fill=(20, 35, 90))
logo_fit(em, (60, 120, 452, 470))
paste_fit(em, text_layer('CITTADELLA', 'ariblk.ttf', (20, 35, 90), shear=-0.2), (40, 500, 472, 590))
paste_fit(em, text_layer('HOCKEY', 'ariblk.ttf', (200, 16, 46), shear=-0.2, spacing=26), (110, 600, 402, 670))
ed.polygon([(0, 700), (256, 768), (512, 700), (512, 768), (0, 768)], fill=(200, 16, 46))
save(em, 'banners/emblem.png')

# pennoni bianchi con logo
pn = Image.new('RGBA', (256, 384), (0, 0, 0, 0))
pd_ = ImageDraw.Draw(pn)
pd_.rectangle([0, 0, 256, 384], fill=(250, 250, 250, 255))
pd_.rectangle([0, 0, 256, 18], fill=(150, 150, 155, 255))
logo_fit(pn, (30, 60, 226, 250))
pd_.rectangle([0, 300, 256, 326], fill=(200, 16, 46, 255))
pd_.rectangle([0, 330, 256, 344], fill=(20, 35, 90, 255))
save(pn, 'pennant.png')

# bandiere
it = Image.new('RGB', (512, 342))
idr = ImageDraw.Draw(it)
for i, c in enumerate([(0, 146, 70), (244, 245, 240), (206, 43, 55)]):
    idr.rectangle([i * 171, 0, (i + 1) * 171, 342], fill=c)
save(it, 'flag_italia.jpg')

ve = Image.new('RGBA', (640, 400), (0, 0, 0, 0))
vd = ImageDraw.Draw(ve)
crimson, gold = (155, 20, 30, 255), (240, 190, 40, 255)
vd.rectangle([0, 0, 470, 400], fill=crimson)
for i in range(6):  # sei code
    y0 = i * 400 / 6
    vd.rectangle([470, y0 + 6, 636, y0 + 400 / 6 - 6], fill=crimson, outline=gold, width=5)
vd.rectangle([0, 0, 470, 400], outline=gold, width=8)
vd.ellipse([150, 90, 330, 270], outline=gold, width=10)          # aureola
vd.polygon([(240, 140), (120, 110), (160, 190), (240, 210)], fill=gold)   # ali stilizzate
vd.polygon([(240, 140), (360, 110), (320, 190), (240, 210)], fill=gold)
vd.rectangle([205, 190, 275, 300], fill=gold)                    # libro
vd.line([240, 195, 240, 295], fill=crimson, width=4)
save(ve, 'flag_veneto.png')

# alone luminoso per i corpi illuminanti
gl = np.zeros((128, 128), np.float32)
yy, xx = np.mgrid[0:128, 0:128]
r = np.sqrt((xx - 63.5) ** 2 + (yy - 63.5) ** 2) / 64
gl = np.clip(1 - r, 0, 1) ** 2.4
glow = np.stack([np.full_like(gl, 255), np.full_like(gl, 244), np.full_like(gl, 214), gl * 255], -1)
save(Image.fromarray(glow.astype(np.uint8), 'RGBA'), 'glow.png')

# rete di protezione dietro le porte
nt = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
nd = ImageDraw.Draw(nt)
for o in (0, 128):
    nd.line([o - 128, 0, o, 128], fill=(30, 30, 30, 200), width=3)
    nd.line([o, 0, o - 128, 128], fill=(30, 30, 30, 200), width=3)
    nd.line([o, 0, o + 128, 128], fill=(30, 30, 30, 200), width=3)
    nd.line([o + 128, 0, o, 128], fill=(30, 30, 30, 200), width=3)
save(nt, 'netting.png')
print('fatto')
