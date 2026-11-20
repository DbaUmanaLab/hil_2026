"""Genera le varianti dei volti fotografici in assets/players/:
  player_face_<n>_beard.jpg     barba senza baffi
  player_face_<n>_mustache.jpg  solo baffi
  player_face_<n>_full.jpg      barba e baffi
  player_face_<n>_female.jpg    volto femminile (mascella più stretta, pelle levigata, trucco)
per n = 1, 2, 3. Le maschere della barba sono quelle di tools/generate_todd_face.py (disegnate su
player_face_2) riportate su ciascun volto tramite tre punti di riferimento verticali (occhi, bocca,
mento) e la larghezza della mascella.
Uso (dalla cartella del progetto): python tools/generate_face_variants.py .
Richiede numpy e Pillow.
"""
import sys, os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
DIR = os.path.join(ROOT, 'assets', 'players')
S = 2

# punti di riferimento (coordinate normalizzate): y di occhi, bocca, mento; semi-larghezza della mascella;
# x degli occhi; semi-larghezza della bocca
FACES = {
    1: dict(eye=0.41, mouth=0.635, chin=0.81, jaw=0.29, eyes=(0.39, 0.61), mw=0.08),
    2: dict(eye=0.42, mouth=0.70, chin=0.92, jaw=0.36, eyes=(0.375, 0.625), mw=0.10),
    3: dict(eye=0.42, mouth=0.715, chin=0.89, jaw=0.31, eyes=(0.375, 0.62), mw=0.105),
}
REF = FACES[2]


def mapper(f):
    """porta un punto delle maschere (disegnate su player_face_2) sul volto f"""
    sx = f['jaw'] / REF['jaw']

    def my(y):
        if y <= REF['mouth']:
            return f['eye'] + (y - REF['eye']) * (f['mouth'] - f['eye']) / (REF['mouth'] - REF['eye'])
        return f['mouth'] + (y - REF['mouth']) * (f['chin'] - f['mouth']) / (REF['chin'] - REF['mouth'])

    return lambda x, y: (0.5 + (x - 0.5) * sx, my(y))


def beard_variant(base, f, kind, seed):
    rnd = random.Random(seed)
    W, H = base.size
    WW, HH = W * S, H * S
    M = mapper(f)
    P = lambda x, y: (M(x, y)[0] * WW, M(x, y)[1] * HH)
    with_beard = kind in ('beard', 'full')
    with_must = kind in ('mustache', 'full')

    outer = [(0.175, 0.44), (0.19, 0.56), (0.225, 0.68), (0.28, 0.79), (0.35, 0.875), (0.43, 0.925), (0.5, 0.94),
             (0.57, 0.925), (0.65, 0.875), (0.72, 0.79), (0.775, 0.68), (0.81, 0.56), (0.825, 0.44)]
    inner = [(0.765, 0.45), (0.745, 0.55), (0.70, 0.605), (0.63, 0.625), (0.565, 0.64), (0.5, 0.645),
             (0.435, 0.64), (0.37, 0.625), (0.30, 0.605), (0.255, 0.55), (0.235, 0.45)]
    if kind == 'beard':
        # senza baffi la barba lascia scoperto anche il labbro superiore
        inner = [(x, 0.765 if 0.36 < x < 0.64 else (0.68 if 0.29 < x < 0.71 else y)) for x, y in inner]
    mask = Image.new('L', (WW, HH), 0)
    if with_beard:
        ImageDraw.Draw(mask).polygon([P(*p) for p in outer + inner], fill=255)
        lips = Image.new('L', (WW, HH), 0)
        ImageDraw.Draw(lips).ellipse([*P(0.435, 0.705), *P(0.565, 0.745)], fill=255)
        mask = ImageChops.subtract(mask, lips.filter(ImageFilter.GaussianBlur(4 * S)))
        mask = mask.filter(ImageFilter.GaussianBlur(9 * S))
    must = Image.new('L', (WW, HH), 0)
    if with_must:
        ImageDraw.Draw(must).polygon([P(0.405, 0.705), P(0.43, 0.672), P(0.47, 0.656), P(0.5, 0.66), P(0.53, 0.656), P(0.57, 0.672),
                                      P(0.595, 0.705), P(0.585, 0.72), P(0.55, 0.703), P(0.5, 0.708), P(0.45, 0.703), P(0.415, 0.72)], fill=255)
        must = must.filter(ImageFilter.GaussianBlur(3 * S))

    hair = Image.new('RGBA', (WW, HH), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hair)
    cols = [(52, 36, 26), (66, 46, 32), (40, 28, 21), (82, 60, 42), (30, 22, 17), (96, 72, 52)]
    m_arr, u_arr = np.asarray(mask), np.asarray(must)
    y0n, y1n = M(0.5, 0.40)[1], M(0.5, 0.97)[1]
    if with_beard:
        for _ in range(26000):
            x, y = rnd.random(), y0n + rnd.random() * (y1n - y0n)
            a = m_arr[min(HH - 1, int(y * HH)), int(x * WW) % WW] / 255
            if a < 0.15 or rnd.random() > a:
                continue
            dx, dy = (x - 0.5) * 0.9, 1.0
            if y > M(0.5, 0.85)[1]:
                dx = (0.5 - x) * 0.6
            ang = math.atan2(dy, dx) + rnd.uniform(-0.45, 0.45)
            ln = rnd.uniform(5, 12) * S
            hd.line([(x * WW, y * HH), (x * WW + math.cos(ang) * ln, y * HH + math.sin(ang) * ln)],
                    fill=rnd.choice(cols) + (int(150 + 100 * a),), width=rnd.choice([1, 2, 2, 3]))
    if with_must:
        mx0, mx1 = M(0.40, 0)[0], M(0.60, 0)[0]
        my0, my1 = M(0.5, 0.65)[1], M(0.5, 0.725)[1]
        for _ in range(5000):
            x, y = mx0 + rnd.random() * (mx1 - mx0), my0 + rnd.random() * (my1 - my0)
            a = u_arr[int(y * HH), int(x * WW)] / 255
            if a < 0.2 or rnd.random() > a:
                continue
            side = -1 if x < 0.5 else 1
            ang = math.atan2(0.55, side * 1.0) + rnd.uniform(-0.3, 0.3)
            ln = rnd.uniform(8, 16) * S
            hd.line([(x * WW, y * HH), (x * WW + math.cos(ang) * ln, y * HH + math.sin(ang) * ln)],
                    fill=rnd.choice(cols[:5]) + (230,), width=rnd.choice([2, 2, 3]))

    big = base.resize((WW, HH), Image.LANCZOS).convert('RGBA')
    under = Image.new('RGBA', (WW, HH), (48, 34, 25, 0))
    under.putalpha(ImageChops.lighter(mask, must).point(lambda v: int(v * 0.78)))
    big.alpha_composite(under)
    big.alpha_composite(hair.filter(ImageFilter.GaussianBlur(0.6)))
    if with_beard:
        hl = Image.new('L', (WW, HH), 0)
        ImageDraw.Draw(hl).ellipse([*P(0.40, 0.80), *P(0.60, 0.90)], fill=70)
        ImageDraw.Draw(hl).ellipse([*P(0.27, 0.62), *P(0.37, 0.74)], fill=40)
        ImageDraw.Draw(hl).ellipse([*P(0.63, 0.62), *P(0.73, 0.74)], fill=40)
        hl = ImageChops.multiply(hl.filter(ImageFilter.GaussianBlur(14 * S)), mask)
        light = Image.new('RGBA', (WW, HH), (150, 120, 96, 0))
        light.putalpha(hl)
        big.alpha_composite(light)
    lipm = Image.new('L', (WW, HH), 0)
    ImageDraw.Draw(lipm).ellipse([*P(0.445, 0.709), *P(0.555, 0.744)], fill=235)
    big.paste(base.resize((WW, HH), Image.LANCZOS).convert('RGBA'), (0, 0), lipm.filter(ImageFilter.GaussianBlur(3 * S)))
    return big.convert('RGB').resize((W, H), Image.LANCZOS)


def female_variant(base, f):
    W, H = base.size
    arr = np.asarray(base.convert('RGB')).astype(np.float32)
    # 1. mascella più stretta: sotto la bocca le colonne si avvicinano al centro
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    yn, xn = ys / H, xs / W
    t = np.clip((yn - (f['eye'] + 0.02)) / (f['chin'] - f['eye']), 0, 1)
    k = 1 + 0.27 * t ** 1.25                         # campiono più lontano dal centro = viso più stretto
    near = np.exp(-((xn - 0.5) / (f['jaw'] * 1.6)) ** 4)   # solo sul viso, non sulle orecchie
    src_x = 0.5 + (xn - 0.5) * (1 + (k - 1) * near)
    sx = np.clip(src_x * W, 0, W - 1)
    x0 = np.floor(sx).astype(int)
    x1 = np.minimum(x0 + 1, W - 1)
    fr = (sx - x0)[..., None]
    yi = ys.astype(int)
    arr = arr[yi, x0] * (1 - fr) + arr[yi, x1] * fr
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

    WW, HH = W * S, H * S
    P = lambda x, y: (x * WW, y * HH)
    big = img.resize((WW, HH), Image.LANCZOS).convert('RGBA')
    # 2. pelle levigata (via barba e pori) tranne occhi e bocca
    smooth = big.filter(ImageFilter.GaussianBlur(5 * S))
    sm = Image.new('L', (WW, HH), 0)
    sd = ImageDraw.Draw(sm)
    sd.ellipse([*P(0.5 - f['jaw'] * 1.05, f['eye'] - 0.2), *P(0.5 + f['jaw'] * 1.05, f['chin'] + 0.05)], fill=175)
    for ex in f['eyes']:
        sd.ellipse([*P(ex - 0.07, f['eye'] - 0.05), *P(ex + 0.07, f['eye'] + 0.035)], fill=0)
    sd.ellipse([*P(0.5 - f['mw'] - 0.02, f['mouth'] - 0.03), *P(0.5 + f['mw'] + 0.02, f['mouth'] + 0.03)], fill=0)
    sd.ellipse([*P(0.44, f['eye'] + 0.06), *P(0.56, f['mouth'] - 0.06)], fill=60)    # il naso resta definito
    big.paste(smooth, (0, 0), sm.filter(ImageFilter.GaussianBlur(10 * S)))
    # schiarisce un filo l'incarnato
    tone = Image.new('RGBA', (WW, HH), (236, 196, 176, 0))
    tone.putalpha(sm.point(lambda v: int(v * 0.05)).filter(ImageFilter.GaussianBlur(10 * S)))
    big.alpha_composite(tone)

    def paint(color, shapes, blur, alpha=255):
        m = Image.new('L', (WW, HH), 0)
        d = ImageDraw.Draw(m)
        for kind, box in shapes:
            getattr(d, kind)([*P(*box[:2]), *P(*box[2:])], fill=alpha)
        m = m.filter(ImageFilter.GaussianBlur(blur * S))
        layer = Image.new('RGBA', (WW, HH), color + (0,))
        layer.putalpha(m)
        big.alpha_composite(layer)

    # 2b. sopracciglia: quelle folte maschili spariscono sotto la pelle (presa poco più su, sulla fronte)
    #     e al loro posto se ne disegnano di sottili e arcuate
    ey = f['eye']
    brow = Image.new('L', (WW, HH), 0)
    bd = ImageDraw.Draw(brow)
    for ex in f['eyes']:
        bd.ellipse([*P(ex - 0.09, ey - 0.09), *P(ex + 0.09, ey - 0.02)], fill=255)
    bd.ellipse([*P(0.43, ey - 0.1), *P(0.57, ey - 0.01)], fill=230)       # glabella: via le rughe della fronte aggrottata
    brow = brow.filter(ImageFilter.GaussianBlur(5 * S))
    forehead = big.crop((0, 0, WW, HH)).transform((WW, HH), Image.AFFINE, (1, 0, 0, 0, 1, -0.06 * HH))
    forehead = forehead.filter(ImageFilter.GaussianBlur(6 * S))
    big.paste(forehead, (0, 0), brow)
    for i, ex in enumerate(f['eyes']):
        out = 1 if i == 1 else -1                     # verso la tempia
        pts = []
        for j in range(13):
            u = j / 12                                 # 0 = vicino al naso, 1 = verso la tempia
            x = ex + out * (-0.05 + u * 0.115)
            y = ey - 0.043 - 0.012 * math.sin(math.pi * min(1, u * 1.35)) + 0.006 * u
            pts.append(P(x, y))
        m = Image.new('L', (WW, HH), 0)
        md = ImageDraw.Draw(m)
        for j in range(len(pts) - 1):
            w = int((4.2 - 2.6 * j / (len(pts) - 1)) * S)   # più spesso all'attacco, sottile in coda
            md.line([pts[j], pts[j + 1]], fill=165, width=max(1, w))
        m = m.filter(ImageFilter.GaussianBlur(1.3 * S))
        layer = Image.new('RGBA', (WW, HH), (58, 40, 30, 0))
        layer.putalpha(m)
        big.alpha_composite(layer)

    my, mw = f['mouth'], f['mw']
    # 3. fard sugli zigomi
    paint((214, 96, 104), [('ellipse', (f['eyes'][0] - 0.09, f['eye'] + 0.07, f['eyes'][0] + 0.03, f['eye'] + 0.15)),
                           ('ellipse', (f['eyes'][1] - 0.03, f['eye'] + 0.07, f['eyes'][1] + 0.09, f['eye'] + 0.15))], 16, 70)
    # 4. ombretto e eyeliner
    for i, ex in enumerate(f['eyes']):
        paint((120, 72, 92), [('ellipse', (ex - 0.055, f['eye'] - 0.042, ex + 0.055, f['eye'] - 0.006))], 4, 120)
        out = 1 if i == 1 else -1
        paint((20, 12, 12), [('ellipse', (ex - 0.045, f['eye'] - 0.016, ex + 0.045, f['eye'] - 0.004)),
                             ('ellipse', (min(ex, ex + out * 0.06), f['eye'] - 0.02, max(ex, ex + out * 0.06), f['eye'] - 0.01))], 1.2, 210)
        # ciglia: piccoli tratti sopra la palpebra, più lunghi verso l'esterno
        lash = Image.new('L', (WW, HH), 0)
        ld = ImageDraw.Draw(lash)
        for j in range(4):
            u = 0.45 + j / 6                           # solo nella metà esterna dell'occhio
            x = ex + out * (-0.035 + u * 0.075)
            y = f['eye'] - 0.014 - 0.004 * math.sin(math.pi * u)
            ln = 0.004 + 0.007 * u
            ld.line([P(x, y), P(x + out * ln * 0.8, y - ln)], fill=170, width=max(1, int(0.8 * S)))
        lash = lash.filter(ImageFilter.GaussianBlur(0.7 * S))
        layer = Image.new('RGBA', (WW, HH), (16, 10, 10, 0))
        layer.putalpha(lash)
        big.alpha_composite(layer)
    # 5. rossetto: labbra un po' più piene
    paint((176, 34, 58), [('ellipse', (0.5 - mw * 0.95, my - 0.022, 0.5 + mw * 0.95, my + 0.006)),
                          ('ellipse', (0.5 - mw * 0.85, my - 0.004, 0.5 + mw * 0.85, my + 0.03))], 2.2, 175)
    paint((255, 210, 215), [('ellipse', (0.5 - mw * 0.25, my + 0.008, 0.5 + mw * 0.2, my + 0.02))], 2, 60)   # riflesso
    return big.convert('RGB').resize((W, H), Image.LANCZOS)


for n, f in FACES.items():
    base = Image.open(os.path.join(DIR, f'player_face_{n}.jpg')).convert('RGB')
    for i, kind in enumerate(('beard', 'mustache', 'full')):
        out = beard_variant(base, f, kind, seed=n * 10 + i)
        path = os.path.join(DIR, f'player_face_{n}_{kind}.jpg')
        out.save(path, quality=88, optimize=True)
        print('scritto', path)
    out = female_variant(base, f)
    path = os.path.join(DIR, f'player_face_{n}_female.jpg')
    out.save(path, quality=88, optimize=True)
    print('scritto', path)
