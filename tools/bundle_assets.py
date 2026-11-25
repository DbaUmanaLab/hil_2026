#!/usr/bin/env python3
"""Prepara la copia degli asset che va dentro le app Android e iOS: più leggera di assets/, che resta intatto.

Uso (dalla cartella del progetto):  python tools/bundle_assets.py [cartella di uscita]
Uscita di default: deploy/bundle-assets/assets (ignorata da git). La lanciano da sole la build Android
(deploy/android/app/build.gradle, task bundleAssets) e quella iOS (deploy/ios/scripts/sync-web.py).

1. Esclusioni (il gioco non li carica mai):
   - le foto originali dei palazzetti e dei roster (assets/arenas/*, assets/rosters_backgrounds/*): servono solo
     come riferimento per ricostruire i palazzetti; il gioco usa arenas/thumbs/ e rosters_backgrounds/strip/;
   - track_5.mp3 (identica a track_3, vedi src/audio/AudioManager.js) e qualche file rimasto senza riferimenti
     (elenco ORPHANS: da aggiornare se uno di quei file torna in uso, altrimenti nell'app manca).
2. Ricompressione (solo se il file viene davvero più piccolo, altrimenti si copia l'originale):
   - texture/*/rink_normal.jpg: metà risoluzione (1024 x 2048), qualità 85 (è solo grana e fughe delle piastrelle);
   - le altre texture JPG: qualità 82; le fasce del roster (rosters_backgrounds/strip): qualità 80;
   - PNG di texture, maglie e loghi: 256 colori con la trasparenza se c'è libimagequant
     (pip install imagequant), altrimenti solo ottimizzati senza perdita;
   - musica (assets/audio/track_*.mp3): 128 kbps, solo se c'è ffmpeg nel PATH.
   Senza Pillow (o senza ffmpeg per l'audio) i file si copiano così come sono: la build non si ferma.

Incrementale: deploy/bundle-assets/manifest.json ricorda dimensione e data di ogni sorgente e la "ricetta"
usata; si rielabora solo quello che è cambiato e si tolgono i file che non esistono più.
"""
import json
import os
import shutil
import subprocess
import sys
from concurrent.futures import ProcessPoolExecutor

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SRC = os.path.join(ROOT, 'assets')
DEFAULT_OUT = os.path.join(ROOT, 'deploy', 'bundle-assets', 'assets')
RECIPE_VERSION = 1          # da incrementare quando cambiano le regole: forza la rielaborazione di tutto

try:
    from PIL import Image, features
    HAVE_PIL = True
except ImportError:
    HAVE_PIL = False
# 256 colori solo con libimagequant (lo stesso di pngquant): il quantizzatore interno di Pillow (FASTOCTREE)
# fa chiazze e bande sulle sfumature delle maglie. Senza, i PNG si ottimizzano senza perdita.
try:
    import imagequant
    QUANT = 'imagequant'
except ImportError:
    QUANT = 'pillow-liq' if HAVE_PIL and features.check_feature('libimagequant') else None
FFMPEG = shutil.which('ffmpeg')

# file senza riferimenti nel codice (controllati a mano: nomi fissi, non costruiti a runtime)
ORPHANS = {
    'audio/track_5.mp3',                       # identica a track_3, non usata (AudioManager.js)
    'backgrounds/roster_screen_1.webp', 'backgrounds/roster_screen_2.jpg', 'backgrounds/roster_screen_3.jpg',
    'backgrounds/start_screen.jpg', 'backgrounds/start_screen_logo.png',
    'tiles/tile_3.jpg', 'tiles/tile_5.jpg',    # lo splash usa tile_1, 2, 4, 6
}
# (logos/game badge.png e game extended.png servono: index.html li scrive con %20 al posto dello spazio)


def excluded(rel):
    parts = rel.split('/')
    # foto originali: solo i file direttamente in arenas/ e rosters_backgrounds/, non thumbs/ e strip/
    if len(parts) == 2 and parts[0] in ('arenas', 'rosters_backgrounds'):
        return True
    if rel in ORPHANS:
        return True
    name = parts[-1]
    return name.startswith('.') or name == 'Thumbs.db' or name.endswith('.psd')


def recipe(rel):
    """Che trattamento riceve il file (cambia l'uscita => cambia la ricetta)."""
    parts = rel.split('/')
    ext = os.path.splitext(rel)[1].lower()
    if parts[0] == 'audio' and rel.endswith('.mp3') and parts[-1].startswith('track_'):
        return 'mp3-128' if FFMPEG else 'copy'
    if not HAVE_PIL:
        return 'copy'
    png = 'png-256' if QUANT else 'png-opt'
    if parts[0] == 'textures':
        if parts[-1] == 'rink_normal.jpg':
            return 'jpg-half-85'
        if ext in ('.jpg', '.jpeg'):
            return 'jpg-82'
        if ext == '.png':
            return png
    if parts[0] in ('jerseys', 'logos') and ext == '.png':
        return png
    if parts[0] == 'rosters_backgrounds' and len(parts) > 2 and ext in ('.jpg', '.jpeg'):
        return 'jpg-80'
    return 'copy'


def process(job):
    """Elabora un file; ritorna (rel, ricetta effettiva, byte in ingresso, byte in uscita)."""
    rel, src, dst, how = job
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    tmp = dst + '.tmp'
    used = how
    try:
        if how.startswith('jpg-'):
            im = Image.open(src)
            q = int(how.split('-')[-1])
            if 'half' in how:
                im = im.resize((max(1, im.width // 2), max(1, im.height // 2)), Image.LANCZOS)
            im.convert('RGB').save(tmp, 'JPEG', quality=q, optimize=True, progressive=True)
        elif how == 'png-256':
            im = Image.open(src).convert('RGBA')
            if QUANT == 'imagequant':
                # min_quality: se a 256 colori l'immagine perde troppo, imagequant rinuncia e si tiene l'originale
                im = imagequant.quantize_pil_image(im, dithering_level=1.0, max_colors=256, min_quality=70, max_quality=95)
            else:
                im = im.quantize(256, method=Image.Quantize.LIBIMAGEQUANT, dither=Image.Dither.FLOYDSTEINBERG)
            im.save(tmp, 'PNG', optimize=True)
        elif how == 'png-opt':
            Image.open(src).save(tmp, 'PNG', optimize=True)
        elif how == 'mp3-128':
            r = subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-i', src, '-codec:a', 'libmp3lame', '-b:a', '128k', '-f', 'mp3', tmp],
                               capture_output=True)
            if r.returncode != 0:
                raise RuntimeError(r.stderr.decode(errors='ignore')[:200])
        else:
            raise ValueError('copy')
        # la ricompressione vale solo se rende il file più piccolo (e se l'immagine dimezzata resta tale)
        if os.path.getsize(tmp) < os.path.getsize(src) or 'half' in how:
            os.replace(tmp, dst)
        else:
            os.remove(tmp)
            shutil.copy2(src, dst)
            used = 'copy'
    except Exception as e:
        if os.path.exists(tmp):
            os.remove(tmp)
        if not (isinstance(e, ValueError) and str(e) == 'copy'):
            print('bundle-assets: %s copiato senza ottimizzare (%s)' % (rel, e))
        shutil.copy2(src, dst)
        used = 'copy'
    return rel, used, os.path.getsize(src), os.path.getsize(dst)


def main():
    out = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_OUT
    os.makedirs(out, exist_ok=True)
    man_path = os.path.join(os.path.dirname(out), 'manifest.json')
    try:
        with open(man_path, encoding='utf-8') as f:
            manifest = json.load(f)
        if manifest.get('version') != RECIPE_VERSION or manifest.get('out') != out:
            manifest = {}
    except (OSError, ValueError):
        manifest = {}
    old = manifest.get('files', {})

    jobs, keep, files, skipped = [], set(), {}, 0
    src_total = 0
    for dirpath, dirnames, filenames in os.walk(SRC):
        dirnames[:] = [d for d in dirnames if not d.startswith('.')]
        for name in filenames:
            src = os.path.join(dirpath, name)
            rel = os.path.relpath(src, SRC).replace('\\', '/')
            if excluded(rel):
                skipped += 1
                continue
            st = os.stat(src)
            src_total += st.st_size
            dst = os.path.join(out, *rel.split('/'))
            keep.add(os.path.normcase(dst))
            how = recipe(rel)
            key = [st.st_size, int(st.st_mtime), how]
            prev = old.get(rel)
            if prev and prev[:3] == key and os.path.exists(dst):
                files[rel] = prev
                continue
            jobs.append((rel, src, dst, how))
            files[rel] = key

    if jobs:
        notes = []
        if not HAVE_PIL:
            notes.append('Pillow mancante: copia senza ottimizzare')
        elif not QUANT:
            notes.append('imagequant mancante: PNG senza riduzione a 256 colori')
        if not FFMPEG:
            notes.append('ffmpeg mancante: musica non ricompressa')
        print('bundle-assets: elaboro %d file%s' % (len(jobs), ''.join(' (%s)' % n for n in notes)))
        workers = max(1, min(8, (os.cpu_count() or 2)))
        if len(jobs) > 8 and workers > 1:
            with ProcessPoolExecutor(max_workers=workers) as ex:
                results = list(ex.map(process, jobs, chunksize=4))
        else:
            results = [process(j) for j in jobs]
        for rel, used, a, b in results:
            files[rel] = files[rel][:3] + [b]

    # via i file che non ci sono più (o che ora sono esclusi)
    removed = 0
    for dirpath, dirnames, filenames in os.walk(out, topdown=False):
        for name in filenames:
            p = os.path.join(dirpath, name)
            if os.path.normcase(p) not in keep:
                os.remove(p)
                removed += 1
        if dirpath != out and not os.listdir(dirpath):
            os.rmdir(dirpath)

    with open(man_path, 'w', encoding='utf-8') as f:
        json.dump({'version': RECIPE_VERSION, 'out': out, 'files': files}, f, indent=0, ensure_ascii=False)
    out_total = sum(v[3] for v in files.values() if len(v) > 3) or sum(os.path.getsize(os.path.join(out, *r.split('/'))) for r in files)
    print('bundle-assets: %d file (%d esclusi), %.1f MB -> %.1f MB in %s%s' % (
        len(files), skipped, src_total / 1e6, out_total / 1e6, out, ', %d tolti' % removed if removed else ''))


if __name__ == '__main__':
    main()
