"""Genera assets/players/todd_face.jpg: il volto di Todd, il cronometrista centrale del PalaHockey di
Cittadella, con barba e baffi. Parte da assets/players/player_face_2.jpg (volto steso frontale, già con
un filo di barba) e ci dipinge sopra barba piena, basette e baffi, pelo per pelo.
Uso (dalla cartella del progetto): python tools/generate_todd_face.py .
Richiede numpy e Pillow.
"""
import sys, os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
SRC = os.path.join(ROOT, 'assets', 'players', 'player_face_2.jpg')
OUT = os.path.join(ROOT, 'assets', 'players', 'todd_face.jpg')
random.seed(7)

base = Image.open(SRC).convert('RGB')
W, H = base.size
S = 2                                    # lavoro a risoluzione doppia, poi riduco
WW, HH = W * S, H * S
P = lambda x, y: (x * WW, y * HH)

# ---------- maschera della barba (coordinate normalizzate sulla foto stesa)
# guance basse, mascella, mento e basette fino alle orecchie; il bordo superiore segue lo zigomo
outer = [(0.175, 0.44), (0.19, 0.56), (0.225, 0.68), (0.28, 0.79), (0.35, 0.875), (0.43, 0.925), (0.5, 0.94),
         (0.57, 0.925), (0.65, 0.875), (0.72, 0.79), (0.775, 0.68), (0.81, 0.56), (0.825, 0.44)]
inner = [(0.765, 0.45), (0.745, 0.55), (0.70, 0.605), (0.63, 0.625), (0.565, 0.64), (0.5, 0.645),
         (0.435, 0.64), (0.37, 0.625), (0.30, 0.605), (0.255, 0.55), (0.235, 0.45)]
mask = Image.new('L', (WW, HH), 0)
d = ImageDraw.Draw(mask)
d.polygon([P(*p) for p in outer + inner], fill=255)
# bocca: le labbra restano scoperte (un po' di pelo sopra il labbro inferiore)
lips = Image.new('L', (WW, HH), 0)
ImageDraw.Draw(lips).ellipse([*P(0.435, 0.705), *P(0.565, 0.745)], fill=255)
lips = lips.filter(ImageFilter.GaussianBlur(4 * S))
mask = ImageChops.subtract(mask, lips)
mask = mask.filter(ImageFilter.GaussianBlur(9 * S))     # bordi sfumati, la barba "nasce" dalla pelle

# ---------- maschera dei baffi: dal sotto-naso al labbro superiore, con le punte che scendono
must = Image.new('L', (WW, HH), 0)
md = ImageDraw.Draw(must)
md.polygon([P(0.405, 0.705), P(0.43, 0.672), P(0.47, 0.656), P(0.5, 0.66), P(0.53, 0.656), P(0.57, 0.672),
            P(0.595, 0.705), P(0.585, 0.72), P(0.55, 0.703), P(0.5, 0.708), P(0.45, 0.703), P(0.415, 0.72)], fill=255)
must = must.filter(ImageFilter.GaussianBlur(3 * S))

# ---------- peli: tratti corti orientati come la crescita della barba
hair = Image.new('RGBA', (WW, HH), (0, 0, 0, 0))
hd = ImageDraw.Draw(hair)
cols = [(52, 36, 26), (66, 46, 32), (40, 28, 21), (82, 60, 42), (30, 22, 17), (96, 72, 52)]
m_arr = np.asarray(mask)
u_arr = np.asarray(must)


def grow_dir(x, y):
    """direzione del pelo: verso il basso, aperta verso l'esterno sulle guance, verso il mento sul mento"""
    dx = (x - 0.5) * 0.9
    dy = 1.0
    if y > 0.85:
        dx = (0.5 - x) * 0.6           # sul mento converge al centro
    n = math.hypot(dx, dy)
    return dx / n, dy / n


for _ in range(26000):
    x, y = random.random(), 0.42 + random.random() * 0.54
    a = m_arr[int(y * HH) % HH, int(x * WW) % WW] / 255
    if a < 0.15 or random.random() > a:
        continue
    gx, gy = grow_dir(x, y)
    ang = math.atan2(gy, gx) + random.uniform(-0.45, 0.45)
    ln = random.uniform(5, 12) * S
    x0, y0 = x * WW, y * HH
    c = random.choice(cols)
    hd.line([(x0, y0), (x0 + math.cos(ang) * ln, y0 + math.sin(ang) * ln)], fill=c + (int(150 + 100 * a),), width=random.choice([1, 2, 2, 3]))

for _ in range(5000):                   # baffi: peli più lunghi, dal centro verso le punte
    x, y = 0.40 + random.random() * 0.2, 0.65 + random.random() * 0.075
    a = u_arr[int(y * HH), int(x * WW)] / 255
    if a < 0.2 or random.random() > a:
        continue
    side = -1 if x < 0.5 else 1
    ang = math.atan2(0.55, side * 1.0) + random.uniform(-0.3, 0.3)
    ln = random.uniform(8, 16) * S
    x0, y0 = x * WW, y * HH
    c = random.choice(cols[:5])
    hd.line([(x0, y0), (x0 + math.cos(ang) * ln, y0 + math.sin(ang) * ln)], fill=c + (230,), width=random.choice([2, 2, 3]))

# ---------- composizione: fondo scuro morbido sotto i peli (densità), poi i peli, poi un filo di luce
big = base.resize((WW, HH), Image.LANCZOS).convert('RGBA')
under = Image.new('RGBA', (WW, HH), (48, 34, 25, 0))
dens = ImageChops.lighter(mask, must).point(lambda v: int(v * 0.78))
under.putalpha(dens)
big.alpha_composite(under)
hair_soft = hair.filter(ImageFilter.GaussianBlur(0.6))
big.alpha_composite(hair_soft)
# riflesso sul mento e sulle guance (volume)
hl = Image.new('L', (WW, HH), 0)
ImageDraw.Draw(hl).ellipse([*P(0.40, 0.80), *P(0.60, 0.90)], fill=70)
ImageDraw.Draw(hl).ellipse([*P(0.27, 0.62), *P(0.37, 0.74)], fill=40)
ImageDraw.Draw(hl).ellipse([*P(0.63, 0.62), *P(0.73, 0.74)], fill=40)
hl = ImageChops.multiply(hl.filter(ImageFilter.GaussianBlur(14 * S)), mask)
light = Image.new('RGBA', (WW, HH), (150, 120, 96, 0))
light.putalpha(hl)
big.alpha_composite(light)

# labbra di nuovo visibili tra baffi e barba del mento
lipm = Image.new('L', (WW, HH), 0)
ImageDraw.Draw(lipm).ellipse([*P(0.445, 0.709), *P(0.555, 0.744)], fill=235)
lipm = lipm.filter(ImageFilter.GaussianBlur(3 * S))
big.paste(base.resize((WW, HH), Image.LANCZOS).convert('RGBA'), (0, 0), lipm)

out = big.convert('RGB').resize((W, H), Image.LANCZOS)
out.save(OUT, quality=90, optimize=True)
print('scritto', OUT, out.size)
