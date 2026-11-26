"""Texture del disco da hockey in linea dalla foto assets/textures/puck/puck_photo.jpg (vista di tre quarti).

Uscite in assets/textures/puck/:
  puck_top.jpg   faccia del disco vista dall'alto (512x512): l'ellisse della foto raddrizzata in un cerchio.
                 Il centro (logo del produttore) è lasciato scuro: il gioco ci incolla l'adesivo con il logo
                 della squadra di casa (index.html, setPuckSticker).
  puck_side.jpg  bordo zigrinato (512x64), ripetibile in orizzontale.

Nella foto (350x350) la faccia superiore è l'ellisse di centro (174.5, 140) e semiassi 171.5 x 126;
il bordo laterale, davanti, va da y 266 a 333.
Uso (dalla cartella del progetto): python tools/generate_puck_textures.py .
Richiede numpy e Pillow.
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
DIR = os.path.join(ROOT, 'assets', 'textures', 'puck')
SRC = os.path.join(DIR, 'puck_photo.jpg')

CX, CY, A, B = 174.5, 140.0, 171.5, 126.0       # ellisse della faccia superiore nella foto
STICKER_R = 0.37                                 # raggio (frazione) dell'area del logo centrale
BAND_Y0, BAND_Y1 = 268, 330                      # bordo laterale davanti al centro


def bilinear(img, x, y):
    h, w = img.shape[:2]
    x = np.clip(x, 0, w - 1.001); y = np.clip(y, 0, h - 1.001)
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int)
    fx = (x - x0)[..., None]; fy = (y - y0)[..., None]
    return (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy) +
            img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy)


def main():
    photo = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)

    # ---------------------------------------------------------------- faccia vista dall'alto
    N = 512
    u = (np.arange(N) + 0.5) / N * 2 - 1
    X, Y = np.meshgrid(u, u)
    R = np.hypot(X, Y)
    # raddrizzamento affine (la prospettiva della foto è debole): ellisse → cerchio, 2% dentro il bordo
    top = bilinear(photo, CX + X * A * 0.98, CY + Y * B * 0.98)
    # fuori dal cerchio: nero del disco (serve ai bordi filtrati della texture)
    edge = np.clip((R - 0.985) / 0.015, 0, 1)[..., None]
    top = top * (1 - edge) + np.array([14, 14, 16]) * edge
    # area del logo centrale: piatto scuro con un filo di bordo; l'adesivo lo disegna il gioco
    disc = np.clip((STICKER_R + 0.012 - R) / 0.012, 0, 1)[..., None]
    rim = (np.abs(R - STICKER_R - 0.02) < 0.008)[..., None] * 1.0
    top = top * (1 - disc) + np.array([20, 20, 22]) * disc
    top = top * (1 - rim * 0.6) + np.array([70, 70, 74]) * rim * 0.6
    Image.fromarray(np.clip(top, 0, 255).astype(np.uint8)).save(os.path.join(DIR, 'puck_top.jpg'), quality=90)

    # ---------------------------------------------------------------- bordo zigrinato
    # striscia centrale del bordo (davanti, dove è quasi piatta), specchiata per essere ripetibile
    strip = Image.fromarray(photo[BAND_Y0:BAND_Y1, 120:230].astype(np.uint8))
    strip = strip.resize((256, 64), Image.LANCZOS)
    tile = Image.new('RGB', (512, 64))
    tile.paste(strip, (0, 0))
    tile.paste(strip.transpose(Image.FLIP_LEFT_RIGHT), (256, 0))
    tile = tile.filter(ImageFilter.SMOOTH)
    tile.save(os.path.join(DIR, 'puck_side.jpg'), quality=90)
    print('scritte', os.path.join(DIR, 'puck_top.jpg'), 'e puck_side.jpg')


if __name__ == '__main__':
    main()
