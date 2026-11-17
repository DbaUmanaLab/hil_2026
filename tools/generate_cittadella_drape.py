"""Genera il drappo con lo stemma dei Carraresi (il carro rosso) e le tende bordeaux laterali
del PalaHockey di Cittadella, in assets/textures/cittadella/banners/.
Uso (dalla cartella del progetto): python tools/generate_cittadella_drape.py .
"""
import sys, os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'textures', 'cittadella', 'banners')
os.makedirs(OUT, exist_ok=True)
RED = (196, 30, 42, 255)
SS = 2                                        # disegno a risoluzione doppia, poi riduco (antialias)

# ---------------------------------------------------------------- drappo bianco con il carro carrarese
W, H = 512 * SS, 896 * SS
img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
# telo con la punta in basso, come quello appeso nel palazzetto
d.polygon([(0, 0), (W, 0), (W, int(H * 0.86)), (W // 2, H), (0, int(H * 0.86))], fill=(242, 240, 236, 255))

cx = W // 2
def wheel(x, y, r):
    lw = int(r * 0.13)
    d.ellipse([x - r, y - r, x + r, y + r], outline=RED, width=lw)
    d.ellipse([x - r * 0.18, y - r * 0.18, x + r * 0.18, y + r * 0.18], fill=RED)
    for k in range(8):                        # otto raggi
        a = k * math.pi / 4
        d.line([x + math.cos(a) * r * 0.15, y + math.sin(a) * r * 0.15, x + math.cos(a) * r * 0.92, y + math.sin(a) * r * 0.92], fill=RED, width=int(r * 0.09))

r = int(W * 0.17)
yT, yB = int(H * 0.22), int(H * 0.52)
xL, xR = cx - int(W * 0.24), cx + int(W * 0.24)
lw = int(W * 0.045)
# telaio del carro: assi tra le ruote, timone centrale con le traverse
d.line([xL, yT, xR, yT], fill=RED, width=lw)
d.line([xL, yB, xR, yB], fill=RED, width=lw)
d.line([cx, yT - int(r * 0.9), cx, int(H * 0.8)], fill=RED, width=lw)
for yy in (int(H * 0.37), int(H * 0.63)):
    d.line([cx - int(W * 0.11), yy, cx + int(W * 0.11), yy], fill=RED, width=int(lw * 0.8))
# punta del timone a forcella
yF = int(H * 0.8)
d.line([cx, yF, cx - int(W * 0.08), yF + int(H * 0.06)], fill=RED, width=int(lw * 0.8))
d.line([cx, yF, cx + int(W * 0.08), yF + int(H * 0.06)], fill=RED, width=int(lw * 0.8))
d.ellipse([cx - lw, yT - int(r * 0.9) - lw, cx + lw, yT - int(r * 0.9) + lw], fill=RED)
for (x, y) in [(xL, yT), (xR, yT), (xL, yB), (xR, yB)]:
    wheel(x, y, r)
# cucitura del bordo
d.line([(int(W * 0.03), 0), (int(W * 0.03), int(H * 0.85))], fill=(200, 196, 190, 255), width=SS * 3)
d.line([(W - int(W * 0.03), 0), (W - int(W * 0.03), int(H * 0.85))], fill=(200, 196, 190, 255), width=SS * 3)
img = img.resize((W // SS, H // SS), Image.LANCZOS)

# pieghe verticali del tessuto
arr = np.asarray(img).astype(np.float32)
xs = np.linspace(0, 1, arr.shape[1])
fold = 1.0 - 0.08 * (np.sin(xs * math.pi * 5.0) * 0.5 + 0.5) - 0.04 * np.sin(xs * math.pi * 13 + 1)
arr[..., :3] *= fold[None, :, None]
Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA').save(os.path.join(OUT, 'carraresi.png'), optimize=True)
print('  carraresi.png')

# ---------------------------------------------------------------- tenda bordeaux drappeggiata (lato sinistro; il destro è specchiato)
W, H = 256, 640
y = np.linspace(0, 1, H)[:, None]
x = np.linspace(0, 1, W)[None, :]
# la tenda è legata in alto e si apre verso il basso in diagonale (bordo interno curvo)
edge = 0.35 + 0.6 * (1 - (1 - y) ** 1.6)
alpha = (x < edge).astype(np.float32)
alpha *= (y < 0.98)
folds = 0.72 + 0.28 * (np.sin((x / np.maximum(edge, 0.05)) * math.pi * 6) * 0.5 + 0.5)
shade = 0.85 + 0.15 * (1 - y)
col = np.zeros((H, W, 4), np.float32)
col[..., 0] = 128 * folds * shade
col[..., 1] = 22 * folds * shade
col[..., 2] = 32 * folds * shade
col[..., 3] = alpha * 255
cur = Image.fromarray(col.clip(0, 255).astype(np.uint8), 'RGBA').filter(ImageFilter.GaussianBlur(0.6))
cur.save(os.path.join(OUT, 'curtain.png'), optimize=True)
print('  curtain.png')
