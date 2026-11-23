#!/usr/bin/env python3
"""Copia il gioco web (index.html, src/, assets/) dentro l'app iOS, nella cartella web/ delle risorse.

Lanciato da Xcode a ogni build (fase "Copia il gioco web" in project.yml); a mano:
    python3 deploy/ios/scripts/sync-web.py <cartella di destinazione>

- Copia solo i file cambiati e toglie quelli che non esistono più: le build successive sono veloci.
- Versione offline (default; HIL_OFFLINE=0 per disattivarla): la prima volta scarica in deploy/ios/vendor/
  Phaser 3.60, Tailwind (Play CDN 3.4.17) e i font Google, e nella copia di index.html i link ai CDN
  diventano quelli locali (come la build Android). L'index.html del repository non viene toccato.
"""
import os
import re
import shutil
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
IOS = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(IOS, '..', '..'))
VENDOR = os.path.join(IOS, 'vendor')
OFFLINE = os.environ.get('HIL_OFFLINE', '1') != '0'

VENDOR_LIBS = {
    'phaser.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js',
    'tailwind.min.js': 'https://cdn.tailwindcss.com/3.4.17',
}
FONTS_CSS = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&family=Oswald:wght@500;600;700&display=swap'
UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'


def dest_dir():
    if len(sys.argv) > 1:
        return os.path.abspath(sys.argv[1])
    build = os.environ.get('TARGET_BUILD_DIR')
    res = os.environ.get('UNLOCALIZED_RESOURCES_FOLDER_PATH')
    if not build or not res:
        sys.exit('sync-web: indica la cartella di destinazione (fuori da Xcode)')
    return os.path.join(build, res, 'web')


def http_get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def download_vendor():
    os.makedirs(VENDOR, exist_ok=True)
    for name, url in VENDOR_LIBS.items():
        f = os.path.join(VENDOR, name)
        if not os.path.exists(f) or os.path.getsize(f) == 0:
            print('sync-web: scarico', url)
            with open(f, 'wb') as out:
                out.write(http_get(url))
    css_path = os.path.join(VENDOR, 'fonts.css')
    if not os.path.exists(css_path):
        print('sync-web: scarico i font Google')
        fonts = os.path.join(VENDOR, 'fonts')
        os.makedirs(fonts, exist_ok=True)
        text = http_get(FONTS_CSS).decode('utf-8')
        n = [0]

        def local(m):
            name = 'f%d.woff2' % n[0]
            n[0] += 1
            with open(os.path.join(fonts, name), 'wb') as out:
                out.write(http_get(m.group(1)))
            return 'url(fonts/%s)' % name
        text = re.sub(r'url\((https://fonts\.gstatic\.com/[^)]+)\)', local, text)
        with open(css_path, 'w', encoding='utf-8') as out:
            out.write(text)


def same(src, dst):
    try:
        a, b = os.stat(src), os.stat(dst)
    except FileNotFoundError:
        return False
    return a.st_size == b.st_size and int(a.st_mtime) <= int(b.st_mtime)


def sync_tree(src_root, dst_root):
    """Copia src_root in dst_root (solo i file cambiati) e toglie da dst_root quello che non c'è più."""
    keep = set()
    copied = 0
    for dirpath, dirnames, filenames in os.walk(src_root):
        dirnames[:] = [d for d in dirnames if not d.startswith('.') and d != '__pycache__']
        rel = os.path.relpath(dirpath, src_root)
        out_dir = os.path.normpath(os.path.join(dst_root, rel))
        os.makedirs(out_dir, exist_ok=True)
        keep.add(out_dir)
        for f in filenames:
            if f.startswith('.') or f == 'Thumbs.db':
                continue
            s, d = os.path.join(dirpath, f), os.path.join(out_dir, f)
            keep.add(d)
            if not same(s, d):
                shutil.copy2(s, d)
                copied += 1
    for dirpath, dirnames, filenames in os.walk(dst_root, topdown=False):
        for f in filenames:
            p = os.path.join(dirpath, f)
            if p not in keep:
                os.remove(p)
        if dirpath not in keep and dirpath != dst_root:
            shutil.rmtree(dirpath, ignore_errors=True)
    return copied


def main():
    dst = dest_dir()
    os.makedirs(dst, exist_ok=True)
    if OFFLINE:
        try:
            download_vendor()
        except Exception as e:      # senza rete la build continua: l'app userà i CDN
            print('sync-web: warning: librerie offline non scaricate (%s): servirà la rete' % e)
    copied = 0
    for sub in ('src', 'assets'):
        copied += sync_tree(os.path.join(ROOT, sub), os.path.join(dst, sub))
    vendor_ok = OFFLINE and os.path.exists(os.path.join(VENDOR, 'fonts.css'))
    if vendor_ok:
        copied += sync_tree(VENDOR, os.path.join(dst, 'vendor'))
    elif os.path.isdir(os.path.join(dst, 'vendor')):
        shutil.rmtree(os.path.join(dst, 'vendor'))
    # index.html: nella versione offline i link ai CDN puntano alle copie locali in vendor/
    with open(os.path.join(ROOT, 'index.html'), encoding='utf-8') as f:
        html = f.read()
    if vendor_ok:
        html = (html.replace('https://cdn.tailwindcss.com', 'vendor/tailwind.min.js')
                    .replace(VENDOR_LIBS['phaser.min.js'], 'vendor/phaser.min.js')
                    .replace(FONTS_CSS, 'vendor/fonts.css')
                    .replace(FONTS_CSS.replace('&', '&amp;'), 'vendor/fonts.css'))
    out = os.path.join(dst, 'index.html')
    old = None
    if os.path.exists(out):
        with open(out, encoding='utf-8') as f:
            old = f.read()
    if old != html:
        with open(out, 'w', encoding='utf-8') as f:
            f.write(html)
        copied += 1
    print('sync-web: %d file aggiornati in %s%s' % (copied, dst, '' if vendor_ok else ' (librerie dai CDN)'))


if __name__ == '__main__':
    main()
