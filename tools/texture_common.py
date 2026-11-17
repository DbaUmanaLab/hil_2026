"""Funzioni comuni per generare texture procedurali dei palazzetti (numpy + Pillow)."""
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FONTS = 'C:/Windows/Fonts/'
rng = np.random.default_rng(1949)


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
    nx, ny, nz = -dx * strength, dy * strength, np.ones_like(hm)
    l = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    rgb = np.stack([nx / l, ny / l, nz / l], axis=-1) * 0.5 + 0.5
    return Image.fromarray((rgb * 255).clip(0, 255).astype(np.uint8), 'RGB')


def to_img(arr):
    return Image.fromarray(np.asarray(arr).clip(0, 255).astype(np.uint8), 'RGB')


def font(name, size):
    return ImageFont.truetype(FONTS + name, size)


def text_layer(text, fontfile, color, size=220, shear=0.0, stroke=0, stroke_fill=None, spacing=0):
    f = font(fontfile, size)
    d = ImageDraw.Draw(Image.new('L', (10, 10)))
    bb = d.textbbox((0, 0), text, font=f, stroke_width=stroke)
    if spacing:
        widths = [d.textlength(ch, font=f) for ch in text]
        W, H = int(sum(widths) + spacing * (len(text) - 1) + size), int(bb[3] - bb[1] + size)
        img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        dd = ImageDraw.Draw(img)
        x = size // 2
        for ch, cw in zip(text, widths):
            dd.text((x, size // 2 - bb[1]), ch, font=f, fill=color, stroke_width=stroke, stroke_fill=stroke_fill)
            x += cw + spacing
    else:
        img = Image.new('RGBA', (bb[2] - bb[0] + size, bb[3] - bb[1] + size), (0, 0, 0, 0))
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
    px = x0 if align == 'left' else (x1 - lw if align == 'right' else x0 + (bw - lw) // 2)
    py = y0 + (bh - lh) // 2
    dst.alpha_composite(lay, (int(px), int(py)))
    return (int(px), int(py), int(px + lw), int(py + lh))


def banner_finish(img):
    """Bordo cucito, occhielli e leggere pieghe di uno striscione in PVC."""
    w, h = img.size
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w - 1, h - 1], outline=(200, 200, 200, 255), width=6)
    for (x, y) in [(14, 14), (w - 15, 14), (14, h - 15), (w - 15, h - 15), (w // 2, 12), (w // 2, h - 13)]:
        d.ellipse([x - 7, y - 7, x + 7, y + 7], fill=(170, 170, 175), outline=(90, 90, 95), width=2)
    xs = np.linspace(0, 1, w)
    fold = 1.0 - 0.06 * (np.sin(xs * math.pi * 3.0 + 0.6) * 0.5 + 0.5) - 0.03 * np.sin(xs * math.pi * 11)
    arr = np.asarray(img).astype(np.float32)
    arr[..., :3] *= fold[None, :, None]
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA')
