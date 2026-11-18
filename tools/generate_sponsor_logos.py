"""Genera 100 sponsor fittizi per la modalità Hockey Manager.

Uscite:
  assets/sponsors_logos/sNNN.png  logo (PNG trasparente 480x240)
  src/data/sponsors.js            catalogo (window.SPONSORS) letto dal gioco

I nomi sono combinazioni casuali (settore + cognome/parola), non aziende reali.
Seme fisso: rilanciando lo script si ottengono gli stessi sponsor.

    python tools/generate_sponsor_logos.py
"""
import json
import math
import os
import random

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'assets', 'sponsors_logos')
DATA_JS = os.path.join(ROOT, 'src', 'data', 'sponsors.js')
FONT_DIR = os.path.join(os.environ.get('WINDIR', r'C:\Windows'), 'Fonts')

W, H = 480, 240
N = 100
rng = random.Random(2026)

SURNAMES = [
    'Bortolin', 'Zanon', 'Furlan', 'Pavan', 'Rigon', 'Zanetti', 'Marcon', 'Pozzobon', 'Gasparini', 'Boscolo',
    'Tonello', 'Carraro', 'Scarpa', 'Bianchin', 'Michielin', 'Dalla Costa', 'Lazzarin', 'Busato', 'Fabris',
    'Sartor', 'Vettore', 'Zuin', 'Cecchetto', 'Bertoldo', 'Mason', 'Baldo', 'Dissegna', 'Pegoraro', 'Ruzza',
    'Visentin', 'Favaro', 'Righetto', 'Pellizzari', 'Mazzocato', 'Tessaro', 'Zorzi', 'Bonato', 'Bressan',
    'Stocco', 'Toffanin', 'Gobbo', 'Sbrissa', 'Zampieri', 'Bettin', 'Fantin', 'Corò', 'Dal Bello', 'Lovato',
]
WORDS = [
    'Aurora', 'Dolomiti', 'Laguna', 'Brenta', 'Piave', 'Berica', 'Euganea', 'Stella', 'Fenice', 'Orsa',
    'Vento', 'Torre', 'Vela', 'Alpina', 'Rondine', 'Quercia', 'Faro', 'Sole', 'Nova', 'Delta', 'Zenit',
    'Vertice', 'Nordest', 'Aquila', 'Leone', 'Riva', 'Colle', 'Ponte', 'Cometa', 'Ambra', 'Cristallo',
    'Granito', 'Corallo', 'Tridente', 'Onda', 'Astra', 'Volta', 'Arco', 'Prisma', 'Ginestra',
]
PLACES = ['dei Colli', 'del Grappa', 'dell\'Altopiano', 'della Pedemontana', 'del Brenta', 'della Riviera', 'delle Valli', 'del Lago']

# settore: (modelli di nome, livello minimo, livello massimo)
SECTORS = {
    'Ristorazione':  (['Pizzeria {w}', 'Ristorante {w}', 'Trattoria {s}', 'Osteria {w}'], 1, 2),
    'Dolciaria':     (['Gelateria {w}', 'Pasticceria {s}', 'Panificio {s}'], 1, 2),
    'Alimentare':    (['Caseificio {p}', 'Macelleria {s}', 'Salumificio {s}', 'Birrificio {w}', 'Cantina {s}'], 1, 4),
    'Commercio':     (['Ferramenta {s}', 'Ottica {s}', 'Lavanderia {w}', 'Vivaio {s}', '{w} Sport'], 1, 2),
    'Edilizia':      (['Edilizia {s}', '{s} Costruzioni', 'Serramenti {s}', 'Termoidraulica {s}', '{w} Impianti'], 2, 4),
    'Industria':     (['Officina Meccanica {s}', 'Mobilificio {s}', '{w} Metalli', '{s} Plastiche', 'Tipografia {s}'], 2, 4),
    'Motori':        (['Autofficina {s}', '{s} Auto', '{w} Pneumatici', 'Carrozzeria {s}'], 1, 4),
    'Servizi':       (['Studio {s}', 'Immobiliare {w}', 'Grafica {w}', 'Agenzia {w} Viaggi', 'Palestra {w}'], 1, 3),
    'Tecnologia':    (['{w}Tech', '{w} Software', 'Elettronica {w}', '{w} Digital', '{w} Telecomunicazioni'], 2, 5),
    'Logistica':     (['{w} Logistica', 'Trasporti {s}', '{w} Spedizioni'], 3, 5),
    'Energia':       (['{w} Energia', '{w} Solare', '{w} Gas & Luce'], 3, 5),
    'Finanza':       (['Credito {w}', 'Assicurazioni {w}', '{w} Investimenti', 'Fondazione {w}'], 3, 5),
}
TIER_TARGET = {1: 30, 2: 28, 3: 22, 4: 13, 5: 7}

PALETTE = [
    '#c8102e', '#e4572e', '#f39c12', '#d4a017', '#2e8b57', '#0f766e', '#1d4ed8', '#0b3d91', '#5b21b6',
    '#9d174d', '#111827', '#374151', '#0e7490', '#15803d', '#b45309', '#7c2d12', '#be185d', '#1e3a8a',
]
FONTS = {
    'bold': ['arialbd.ttf', 'trebucbd.ttf', 'verdanab.ttf', 'tahomabd.ttf', 'segoeuib.ttf', 'calibrib.ttf', 'bahnschrift.ttf'],
    'display': ['impact.ttf', 'BRITANIC.TTF', 'GILLUBCD.TTF', 'ARIALNB.TTF'],
    'serif': ['georgiab.ttf', 'cambriab.ttf'],
}


def font(name, size):
    path = os.path.join(FONT_DIR, name)
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.truetype(os.path.join(FONT_DIR, 'arialbd.ttf'), size)


def pick_font():
    family = rng.choices(['bold', 'display', 'serif'], [5, 3, 2])[0]
    return rng.choice(FONTS[family])


def hex_rgb(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def make_name(sector):
    tpl = rng.choice(SECTORS[sector][0])
    return tpl.format(s=rng.choice(SURNAMES), w=rng.choice(WORDS), p=rng.choice(PLACES))


def initials(name):
    parts = [p for p in name.replace('&', ' ').split() if p[0].isupper() and p.lower() not in ('dei', 'del', 'della', 'delle')]
    if not parts:
        return name[:1].upper()
    if len(parts) == 1:
        return parts[0][:1].upper()
    return (parts[0][0] + parts[-1][0]).upper()


def fit_font(draw, text, fname, max_w, max_h, start):
    size = start
    while size > 12:
        f = font(fname, size)
        box = draw.textbbox((0, 0), text, font=f)
        if box[2] - box[0] <= max_w and box[3] - box[1] <= max_h:
            return f, box
        size -= 2
    f = font(fname, 12)
    return f, draw.textbbox((0, 0), text, font=f)


def polygon(cx, cy, r, sides, rot=0.0):
    return [(cx + r * math.cos(rot + 2 * math.pi * i / sides), cy + r * math.sin(rot + 2 * math.pi * i / sides)) for i in range(sides)]


def draw_emblem(d, cx, cy, r, shape, c1, c2, text, fname):
    """Emblema con le iniziali: cerchio, scudo, esagono, rombo, quadrato o anello."""
    if shape == 'circle':
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c1)
        d.ellipse([cx - r * .82, cy - r * .82, cx + r * .82, cy + r * .82], outline=c2, width=max(3, int(r * .06)))
    elif shape == 'ring':
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=c1, width=int(r * .2))
    elif shape == 'hex':
        d.polygon(polygon(cx, cy, r, 6, math.pi / 6), fill=c1)
    elif shape == 'diamond':
        d.polygon(polygon(cx, cy, r * 1.1, 4, 0), fill=c1)
    elif shape == 'square':
        d.rounded_rectangle([cx - r * .9, cy - r * .9, cx + r * .9, cy + r * .9], radius=int(r * .28), fill=c1)
    elif shape == 'shield':
        w = r * .92
        pts = [(cx - w, cy - r * .9), (cx + w, cy - r * .9), (cx + w, cy + r * .1), (cx, cy + r), (cx - w, cy + r * .1)]
        d.polygon(pts, fill=c1)
        d.line([(cx - w * .7, cy - r * .62), (cx + w * .7, cy - r * .62)], fill=c2, width=max(3, int(r * .07)))
    txt_col = c1 if shape == 'ring' else c2
    f, box = fit_font(d, text, fname, r * 1.15, r * .95, int(r * 1.05))
    tw, th = box[2] - box[0], box[3] - box[1]
    d.text((cx - tw / 2 - box[0], cy - th / 2 - box[1] + (r * .06 if shape == 'shield' else 0)), text, font=f, fill=txt_col)


def render_logo(s):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c1 = hex_rgb(s['color'])
    c2 = hex_rgb(s['accent'])
    white = (255, 255, 255, 255)
    fname = s['_font']
    name = s['name']
    ini = initials(name)
    layout = s['_layout']
    shape = s['_shape']

    if layout == 'side':                       # emblema a sinistra, nome a destra
        draw_emblem(d, 100, H / 2, 78, shape, c1, white, ini, fname)
        words = name.split()
        lines = [name] if len(words) == 1 else [' '.join(words[:max(1, len(words) // 2)]), ' '.join(words[max(1, len(words) // 2):])]
        y = H / 2 - (len(lines) * 52) / 2
        for i, ln in enumerate(lines):
            f, box = fit_font(d, ln.upper() if i == 0 else ln, fname, 270, 56, 58 if i == 0 else 46)
            d.text((196 - box[0], y - box[1] + i * 6), ln.upper() if i == 0 else ln, font=f, fill=c1 if i == 0 else c2[:3] + (255,) if s['accent'] != '#ffffff' else c1)
            y += box[3] - box[1] + 10
        d.text((198, H - 44), s['sector'].upper(), font=font('arialbd.ttf', 18), fill=hex_rgb('#64748b'))
    elif layout == 'stack':                    # emblema sopra, nome sotto
        draw_emblem(d, W / 2, 82, 62, shape, c1, white, ini, fname)
        f, box = fit_font(d, name.upper(), fname, 440, 60, 52)
        tw = box[2] - box[0]
        d.text((W / 2 - tw / 2 - box[0], 160 - box[1]), name.upper(), font=f, fill=c1)
    elif layout == 'banner':                   # nome dentro una fascia colorata
        d.rounded_rectangle([16, 56, W - 16, H - 56], radius=26, fill=c1)
        d.rounded_rectangle([28, 68, W - 28, H - 68], radius=18, outline=white, width=3)
        f, box = fit_font(d, name.upper(), fname, W - 90, 80, 72)
        tw, th = box[2] - box[0], box[3] - box[1]
        d.text((W / 2 - tw / 2 - box[0], H / 2 - th / 2 - box[1]), name.upper(), font=f, fill=white)
        d.text((W / 2 - 60, H - 48), s['sector'].upper(), font=font('arialbd.ttf', 18), fill=c1)
    else:                                      # 'swoosh': marchio con onda sotto
        f, box = fit_font(d, name, fname, W - 60, 92, 84)
        tw, th = box[2] - box[0], box[3] - box[1]
        x0, y0 = W / 2 - tw / 2, H / 2 - th / 2 - 22
        d.text((x0 - box[0], y0 - box[1]), name, font=f, fill=c1)
        pts = []
        for i in range(41):
            t = i / 40
            pts.append((x0 + t * tw, y0 + th + 26 - math.sin(t * math.pi) * 18))
        d.line(pts, fill=c2[:3] + (255,) if s['accent'] != '#ffffff' else c1, width=9, joint='curve')
        d.ellipse([x0 + tw - 8, pts[-1][1] - 9, x0 + tw + 10, pts[-1][1] + 9], fill=c1)
    img.save(os.path.join(OUT_DIR, s['id'] + '.png'), optimize=True)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    # quante per livello: si sceglie il settore compatibile col livello
    tiers = [t for t, n in TIER_TARGET.items() for _ in range(n)]
    rng.shuffle(tiers)
    used = set()
    sponsors = []
    for i, tier in enumerate(tiers):
        sectors = [k for k, v in SECTORS.items() if v[1] <= tier <= v[2]]
        for _ in range(50):
            sector = rng.choice(sectors)
            name = make_name(sector)
            if name not in used:
                break
        used.add(name)
        color = rng.choice(PALETTE)
        accent = rng.choice(['#ffffff', '#f6b511', '#94a3b8', '#ef4444', '#22c55e', '#38bdf8'])
        s = {
            'id': 's%03d' % (i + 1),
            'name': name,
            'sector': sector,
            'tier': tier,
            'color': color,
            'accent': accent,
            'logo': 'assets/sponsors_logos/s%03d.png' % (i + 1),
            '_font': pick_font(),
            '_layout': rng.choice(['side', 'side', 'stack', 'banner', 'swoosh']),
            '_shape': rng.choice(['circle', 'ring', 'hex', 'diamond', 'square', 'shield']),
        }
        render_logo(s)
        sponsors.append({k: v for k, v in s.items() if not k.startswith('_')})

    with open(DATA_JS, 'w', encoding='utf-8') as fh:
        fh.write('// --- src/data/sponsors.js ---\n')
        fh.write('// Generato da tools/generate_sponsor_logos.py: 100 sponsor fittizi (nomi casuali) per Hockey Manager.\n')
        fh.write('// tier: 1 = bottega locale ... 5 = grande azienda. Loghi in assets/sponsors_logos/.\n')
        fh.write('window.SPONSORS = ' + json.dumps(sponsors, ensure_ascii=False, indent=1) + ';\n')
    print('Generati %d sponsor in %s' % (len(sponsors), OUT_DIR))


if __name__ == '__main__':
    main()
