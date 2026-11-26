"""Teste modellate dei personaggi umani (giocatori, arbitri, pubblico, staff) da MakeHuman.

Sorgente: MakeHuman (https://github.com/makehumancommunity/makehuman) e il suo pacchetto
"system assets": mesh base, target, pelli, occhi e sopracciglia sono rilasciati CC0 1.0
(pubblico dominio, vedi LICENSE.ASSETS.md del repository). Gli asset scaricati restano in
tools/.cache/makehuman (ignorata da git); i file generati invece si committano.

Uscite:
  src/game/HeadModels.js        geometrie (due livelli di dettaglio, una forma per variante)
  assets/heads/<variante>.jpg   pelle del volto + occhi (layout UV comune a tutte le varianti)
  assets/heads/masks_a.png      R sopracciglia sottili, G sopracciglia folte, B barba
  assets/heads/masks_b.png      R baffi, G ombra della barba rasata

Tutte le varianti condividono indici e UV (la riduzione dei poligoni collassa i lati solo su
vertici esistenti, decisa una volta per tutte): cambiano solo posizioni e normali.
Sistema di riferimento delle teste in uscita: volto verso +X, alto +Y, unità = raggio della
vecchia sfera (calotta a y = +1), così il gioco le scala con lo stesso raggio di prima.

Uso (dalla cartella del progetto): python tools/generate_heads.py .
Richiede numpy e Pillow.
"""
import sys, os, io, json, math, base64, heapq, zipfile, urllib.request, collections, random
import numpy as np
from PIL import Image, ImageFilter

ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
CACHE = os.path.join(ROOT, 'tools', '.cache', 'makehuman')
OUT_IMG = os.path.join(ROOT, 'assets', 'heads')
OUT_JS = os.path.join(ROOT, 'src', 'game', 'HeadModels.js')

GH = 'https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/'
ZIP_URL = 'http://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip'

TEX_W, TEX_H = 512, 1024
EYE_PX = 112                      # occhi in basso a sinistra nella texture
HI_TRIS, LO_TRIS = 2300, 860      # triangoli della pelle (occhi e bocca a parte)
CROWN_TO_CHIN = 2.2               # in raggi della vecchia sfera

# ---------------------------------------------------------------------------------------------
# scaricamento (con cache)
# ---------------------------------------------------------------------------------------------
class HttpFile(io.RawIOBase):
    """zip remoto letto a pezzi con HTTP Range: del pacchetto (280 MB) servono pochi file"""
    def __init__(self, url):
        self.url = url
        with urllib.request.urlopen(urllib.request.Request(url, method='HEAD')) as r:
            self.size = int(r.headers['Content-Length'])
        self.pos = 0
    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.pos
    def seek(self, off, whence=0):
        self.pos = off if whence == 0 else (self.pos + off if whence == 1 else self.size + off)
        return self.pos
    def read(self, n=-1):
        if n < 0: n = self.size - self.pos
        if n == 0 or self.pos >= self.size: return b''
        end = min(self.size, self.pos + n) - 1
        req = urllib.request.Request(self.url, headers={'Range': f'bytes={self.pos}-{end}'})
        with urllib.request.urlopen(req) as r: data = r.read()
        self.pos += len(data)
        return data
    def readinto(self, b):
        d = self.read(len(b)); b[:len(d)] = d; return len(d)


_zip = None
def cached(rel, source):
    dst = os.path.join(CACHE, rel.replace('/', os.sep))
    if not os.path.exists(dst):
        global _zip
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if source == 'gh':
            with urllib.request.urlopen(GH + rel) as r: data = r.read()
        else:
            if _zip is None:
                _zip = zipfile.ZipFile(io.BufferedReader(HttpFile(ZIP_URL), buffer_size=1 << 20))
            data = _zip.read(rel)
        with open(dst, 'wb') as f: f.write(data)
        print('  scaricato', rel)
    return dst

# ---------------------------------------------------------------------------------------------
# mesh base, target, proxy
# ---------------------------------------------------------------------------------------------
def load_obj(path):
    V, VT, F = [], [], []
    group = None
    for line in open(path, encoding='utf-8'):
        if line.startswith('v '): V.append([float(x) for x in line.split()[1:4]])
        elif line.startswith('vt '): VT.append([float(x) for x in line.split()[1:3]])
        elif line.startswith('g '): group = line.split()[1]
        elif line.startswith('f '):
            ps = [p.split('/') for p in line.split()[1:]]
            F.append((group, [int(p[0]) - 1 for p in ps], [int(p[1]) - 1 for p in ps]))
    return np.array(V), np.array(VT), F


_targets = {}
def target(name):
    if name not in _targets:
        folder = name.split('-')[0] if not name.startswith(('l-', 'r-')) else name.split('-')[1]
        folder = {'caucasian': 'macrodetails', 'african': 'macrodetails', 'asian': 'macrodetails',
                  'ear': 'ears', 'eye': 'eyes'}.get(folder, folder)
        path = cached(f'targets/{folder}/{name}.target', 'gh')
        idx, d = [], []
        for line in open(path, encoding='utf-8'):
            if line.startswith('#') or not line.strip(): continue
            p = line.split()
            idx.append(int(p[0])); d.append([float(p[1]), float(p[2]), float(p[3])])
        _targets[name] = (np.array(idx), np.array(d))
    return _targets[name]


def load_proxy(folder, name, source='zip'):
    """mhclo: per ogni vertice del proxy o un vertice base (rigido) o tre vertici con pesi e offset"""
    obj = load_obj(cached(f'{folder}/{name}.obj', source))
    refs, scales = [], {}
    in_verts = False
    for line in open(cached(f'{folder}/{name}.mhclo', source), encoding='utf-8'):
        p = line.split()
        if not p or p[0].startswith('#'): continue
        if p[0] in ('x_scale', 'y_scale', 'z_scale'): scales[p[0][0]] = (int(p[1]), int(p[2]), float(p[3]))
        elif p[0] == 'verts': in_verts = True
        elif in_verts:
            if len(p) == 1: refs.append(([int(p[0])], [1.0], [0, 0, 0]))
            elif len(p) >= 9: refs.append(([int(x) for x in p[:3]], [float(x) for x in p[3:6]], [float(x) for x in p[6:9]]))
            else: in_verts = False
    return obj, refs, scales


def fit_proxy(refs, scales, Vm):
    s = np.ones(3)
    for k, ax in (('x', 0), ('y', 1), ('z', 2)):
        if k in scales:
            a, b, d = scales[k]
            s[ax] = abs(Vm[a, ax] - Vm[b, ax]) / d
    out = np.zeros((len(refs), 3))
    for i, (ix, w, off) in enumerate(refs):
        out[i] = sum(wj * Vm[j] for j, wj in zip(ix, w)) + np.array(off) * s
    return out

# ---------------------------------------------------------------------------------------------
# varianti: sesso, età, etnia, pelle, occhi e una forma del volto (target casuali ma fissi)
# ---------------------------------------------------------------------------------------------
# (id, sesso, età, etnia, pelle, colore occhi)
VARIANTS = [
    ('m_cau_y1', 'm', 'young', 'caucasian', 'young_caucasian_male', 'brown'),
    ('m_cau_y2', 'm', 'young', 'caucasian', 'young_caucasian_male2', 'blue'),
    ('m_cau_y3', 'm', 'young', 'caucasian', 'young_caucasian_male', 'green'),
    ('m_cau_y4', 'm', 'young', 'caucasian', 'young_caucasian_male2', 'brownlight'),
    ('m_afr_y', 'm', 'young', 'african', 'young_african_male', 'brown'),
    ('m_asi_y', 'm', 'young', 'asian', 'young_asian_male', 'brown'),
    ('m_cau_m1', 'm', 'middle', 'caucasian', 'middleage_caucasian_male', 'grey'),
    ('m_cau_m2', 'm', 'middle', 'caucasian', 'middleage_caucasian_male', 'brown'),
    ('m_afr_m', 'm', 'middle', 'african', 'middleage_african_male', 'brown'),
    ('m_asi_m', 'm', 'middle', 'asian', 'middleage_asian_male', 'brown'),
    ('m_cau_o', 'm', 'old', 'caucasian', 'old_caucasian_male', 'lightblue'),
    ('m_afr_o', 'm', 'old', 'african', 'old_african_male', 'brown'),
    ('f_cau_y1', 'f', 'young', 'caucasian', 'young_caucasian_female', 'blue'),
    ('f_cau_y2', 'f', 'young', 'caucasian', 'young_caucasian_female2', 'brown'),
    ('f_cau_y3', 'f', 'young', 'caucasian', 'young_caucasian_female', 'green'),
    ('f_afr_y', 'f', 'young', 'african', 'young_african_female', 'brown'),
    ('f_asi_y', 'f', 'young', 'asian', 'young_asian_female', 'brown'),
    ('f_cau_m', 'f', 'middle', 'caucasian', 'middleage_caucasian_female', 'brownlight'),
    ('f_afr_m', 'f', 'middle', 'african', 'middleage_african_female', 'brown'),
    ('f_asi_m', 'f', 'middle', 'asian', 'middleage_asian_female', 'brown'),
    ('f_cau_o', 'f', 'old', 'caucasian', 'old_caucasian_female', 'grey'),
    ('f_asi_o', 'f', 'old', 'asian', 'old_asian_female', 'brown'),
]
SKIN_FILES = {
    'young_caucasian_male': 'young_lightskinned_male_diffuse.png',
    'young_caucasian_male2': 'young_lightskinned_male_diffuse2.png',
    'young_caucasian_female': 'young_lightskinned_female_diffuse.png',
    'young_caucasian_female2': 'young_lightskinned_female_diffuse2.png',
    'young_african_male': 'young_darkskinned_male_diffuse.png',
    'young_african_female': 'young_darkskinned_female_diffuse.png',
    'young_asian_male': 'young_lightskinned_male_diffuse3.png',
    'young_asian_female': 'young_lightskinned_female_diffuse3.png',
    'middleage_caucasian_male': 'middleage_lightskinned_male_diffuse.png',
    'middleage_caucasian_female': 'middleage_lightskinned_female_diffuse.png',
    'middleage_african_male': 'middleage_darkskinned_male_diffuse.png',
    'middleage_african_female': 'middleage_darkskinned_female_diffuse.png',
    'middleage_asian_male': 'middleage_lightskinned_male_diffuse2.png',
    'middleage_asian_female': 'middleage_lightskinned_female_diffuse2.png',
    'old_caucasian_male': 'old_lightskinned_male_diffuse.png',
    'old_caucasian_female': 'old_lightskinned_female_diffuse.png',
    'old_african_male': 'old_darkskinned_male_diffuse.png',
    'old_asian_female': 'old_lightskinned_female_diffuse2.png',
}
# età MakeHuman: young = 25 anni, old = 90; mezza età ~50, anziani ~70
AGE_OLD_WEIGHT = {'young': 0.0, 'middle': 0.38, 'old': 0.7}

# coppie (negativo, positivo) di target simmetrici; ogni variante ne pesca un valore in [-1, 1]
SHAPE_PAIRS = [
    ('head-fat-decr', 'head-fat-incr', 0.5),
    ('head-scale-depth-decr', 'head-scale-depth-incr', 0.3),
    ('head-scale-horiz-decr', 'head-scale-horiz-incr', 0.35),
    ('nose-scale-horiz-decr', 'nose-scale-horiz-incr', 0.6),
    ('nose-scale-vert-decr', 'nose-scale-vert-incr', 0.5),
    ('nose-scale-depth-decr', 'nose-scale-depth-incr', 0.5),
    ('nose-hump-decr', 'nose-hump-incr', 0.7),
    ('nose-point-width-decr', 'nose-point-width-incr', 0.6),
    ('nose-flaring-decr', 'nose-flaring-incr', 0.5),
    ('nose-volume-decr', 'nose-volume-incr', 0.5),
    ('chin-prominent-decr', 'chin-prominent-incr', 0.6),
    ('chin-width-decr', 'chin-width-incr', 0.6),
    ('chin-height-decr', 'chin-height-incr', 0.5),
    ('chin-bones-decr', 'chin-bones-incr', 0.6),
    ('mouth-scale-horiz-decr', 'mouth-scale-horiz-incr', 0.5),
    ('mouth-lowerlip-volume-decr', 'mouth-lowerlip-volume-incr', 0.5),
    ('mouth-upperlip-volume-decr', 'mouth-upperlip-volume-incr', 0.5),
    ('forehead-scale-vert-decr', 'forehead-scale-vert-incr', 0.5),
    ('forehead-trans-backward', 'forehead-trans-forward', 0.4),
    ('eyebrows-trans-down', 'eyebrows-trans-up', 0.4),
]
SYM_PAIRS = [   # target sinistra/destra applicati insieme
    ('cheek-bones-decr', 'cheek-bones-incr', 0.6),
    ('cheek-volume-decr', 'cheek-volume-incr', 0.5),
    ('ear-scale-decr', 'ear-scale-incr', 0.5),
    ('ear-flap-decr', 'ear-flap-incr', 0.5),
    ('ear-lobe-decr', 'ear-lobe-incr', 0.5),
]
HEAD_SHAPES = ['head-oval', 'head-round', 'head-square', 'head-triangular', 'head-invertedtriangular',
               'head-diamond', 'head-rectangular']


def variant_mesh(V, var, seed):
    vid, sex, age, eth = var[:4]
    gender = 'male' if sex == 'm' else 'female'
    Vm = V.copy()
    wo = AGE_OLD_WEIGHT[age]
    for name, w in ((f'{eth}-{gender}-young', 1 - wo), (f'{eth}-{gender}-old', wo)):
        if w > 0:
            idx, d = target(name)
            Vm[idx] += w * d
    if seed is None:
        return Vm
    r = random.Random(seed)
    def add(name, w):
        idx, d = target(name)
        Vm[idx] += w * d
    for neg, pos, amp in SHAPE_PAIRS:
        x = r.uniform(-1, 1) * amp
        add(pos if x > 0 else neg, abs(x))
    for neg, pos, amp in SYM_PAIRS:
        x = r.uniform(-1, 1) * amp
        for side in ('l', 'r'):
            add(f'{side}-' + (pos if x > 0 else neg), abs(x))
    add(r.choice(HEAD_SHAPES), r.uniform(0.15, 0.55))
    return Vm

# ---------------------------------------------------------------------------------------------
# isola UV della testa
# ---------------------------------------------------------------------------------------------
def head_island(V, VT, F):
    body = [f for f in F if f[0] == 'body']
    par = list(range(len(VT)))
    def find(a):
        while par[a] != a:
            par[a] = par[par[a]]; a = par[a]
        return a
    for _, vs, ts in body:
        for t in ts[1:]:
            ra, rb = find(ts[0]), find(t)
            if ra != rb: par[ra] = rb
    bv = sorted(set(v for f in body for v in f[1]))
    crown = bv[int(np.argmax(V[bv, 1]))]
    hid = find(next(f for f in body if crown in f[1])[2][0])
    return [(vs, ts) for _, vs, ts in body if find(ts[0]) == hid]


def triangulate(quads, V):
    tris = []
    for vs, ts in quads:
        if len(vs) == 3:
            tris.append((vs, ts)); continue
        # diagonale più corta
        if np.linalg.norm(V[vs[0]] - V[vs[2]]) <= np.linalg.norm(V[vs[1]] - V[vs[3]]):
            tris += [([vs[0], vs[1], vs[2]], [ts[0], ts[1], ts[2]]), ([vs[0], vs[2], vs[3]], [ts[0], ts[2], ts[3]])]
        else:
            tris += [([vs[0], vs[1], vs[3]], [ts[0], ts[1], ts[3]]), ([vs[1], vs[2], vs[3]], [ts[1], ts[2], ts[3]])]
    return tris


def boundary_loops(tris):
    ec = collections.Counter()
    for vs, _ in tris:
        for i in range(3):
            a, b = vs[i], vs[(i + 1) % 3]
            ec[(min(a, b), max(a, b))] += 1
    adj = collections.defaultdict(list)
    for (a, b), c in ec.items():
        if c == 1: adj[a].append(b); adj[b].append(a)
    seen, loops = set(), []
    for s in adj:
        if s in seen: continue
        loop, prev, cur = [], None, s
        while cur not in seen:
            seen.add(cur); loop.append(cur)
            nxt = [n for n in adj[cur] if n != prev and n not in seen]
            if not nxt: break
            prev, cur = cur, nxt[0]
        loops.append(loop)
    return loops

# ---------------------------------------------------------------------------------------------
# riduzione dei poligoni: collasso di mezzo lato (u -> w) con quadriche sommate su più varianti
# ---------------------------------------------------------------------------------------------
def decimate(tris, samples, locked, targets):
    """tris: lista di (vs, ts); samples: lista di array posizioni (varianti campione).
    Restituisce {target: lista di tris} per ciascun numero di triangoli richiesto (decrescente)."""
    T = [list(vs) for vs, _ in tris]
    TT = [list(ts) for _, ts in tris]
    alive = [True] * len(T)
    vtris = collections.defaultdict(set)
    for i, vs in enumerate(T):
        for v in vs: vtris[v].add(i)
    K = len(samples)
    nv = max(len(s) for s in samples)
    Q = np.zeros((K, nv, 4, 4))
    for i, vs in enumerate(T):
        for k, P in enumerate(samples):
            a, b, c = P[vs[0]], P[vs[1]], P[vs[2]]
            n = np.cross(b - a, c - a); area = np.linalg.norm(n)
            if area < 1e-12: continue
            n /= area
            p = np.append(n, -np.dot(n, a))
            q = np.outer(p, p) * area
            for v in vs: Q[k, v] += q
    H = [np.hstack([P, np.ones((len(P), 1))]) for P in samples]
    ver = collections.Counter()

    def neighbors(v):
        s = set()
        for t in vtris[v]: s.update(T[t])
        s.discard(v)
        return s

    def cost(u, w):
        c = 0.0
        for k in range(K):
            h = H[k][w]
            c += h @ (Q[k, u] + Q[k, w]) @ h
        return c

    heap = []
    def push(u):
        if u in locked: return
        for w in neighbors(u):
            heapq.heappush(heap, (cost(u, w), u, w, ver[u], ver[w]))
    for v in list(vtris):
        push(v)

    def can_collapse(u, w):
        shared = vtris[u] & vtris[w]
        if not shared: return False
        # condizione di link: i vicini comuni sono solo i vertici opposti dei triangoli sul lato
        opp = set()
        for t in shared: opp.update(T[t])
        opp -= {u, w}
        if (neighbors(u) & neighbors(w)) != opp: return False
        # niente triangoli capovolti o degeneri (su tutte le varianti campione)
        for t in vtris[u] - shared:
            vs = T[t]
            for P in samples:
                a, b, c = (P[x] for x in vs)
                n0 = np.cross(b - a, c - a)
                a2, b2, c2 = (P[w] if x == u else P[x] for x in vs)
                n1 = np.cross(b2 - a2, c2 - a2)
                l0, l1 = np.linalg.norm(n0), np.linalg.norm(n1)
                if l1 < 1e-9 or np.dot(n0, n1) / (l0 * l1 + 1e-12) < 0.35: return False
        return True

    count = sum(alive)
    results = {}
    goals = sorted(targets, reverse=True)
    while heap and goals:
        if count <= goals[0]:
            results[goals.pop(0)] = [(list(T[i]), list(TT[i])) for i in range(len(T)) if alive[i]]
            continue
        c, u, w, vu, vw = heapq.heappop(heap)
        if vu != ver[u] or vw != ver[w] or u not in vtris or w not in vtris: continue
        if not can_collapse(u, w): continue
        shared = vtris[u] & vtris[w]
        # coordinata UV di w dal lato di u (u non è su una cucitura: ha una sola UV)
        t0 = next(iter(shared))
        tw = TT[t0][T[t0].index(w)]
        for t in shared:
            alive[t] = False
            for x in T[t]: vtris[x].discard(t)
        count -= len(shared)
        for t in list(vtris[u]):
            j = T[t].index(u)
            T[t][j] = w; TT[t][j] = tw
            vtris[w].add(t)
        del vtris[u]
        Q[:, w] += Q[:, u]
        ver[w] += 1
        for n in neighbors(w) | {w}:
            ver[n] += 1
        for n in neighbors(w) | {w}:
            push(n)
    while goals:
        results[goals.pop(0)] = [(list(T[i]), list(TT[i])) for i in range(len(T)) if alive[i]]
    return results

# ---------------------------------------------------------------------------------------------
# rasterizzazione in spazio UV (per mappe di posizione e maschere)
# ---------------------------------------------------------------------------------------------
def raster(tri_uv_px, tri_attr, W, H, out, mask_out=None, combine='set', sampler=None):
    """tri_uv_px: (n,3,2) coordinate pixel; tri_attr: (n,3,C) attributi interpolati.
    combine 'set' scrive gli attributi; 'max' con sampler(attr_interp) -> valore scalare."""
    for P, A in zip(tri_uv_px, tri_attr):
        x0, y0 = np.floor(P.min(0)).astype(int); x1, y1 = np.ceil(P.max(0)).astype(int)
        x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, W - 1), min(y1, H - 1)
        if x1 < x0 or y1 < y0: continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        (ax, ay), (bx, by), (cx, cy) = P
        d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(d) < 1e-12: continue
        l0 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / d
        l1 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / d
        l2 = 1 - l0 - l1
        e = -0.02
        m = (l0 >= e) & (l1 >= e) & (l2 >= e)
        if not m.any(): continue
        interp = l0[..., None] * A[0] + l1[..., None] * A[1] + l2[..., None] * A[2]
        sub = (slice(y0, y1 + 1), slice(x0, x1 + 1))
        if combine == 'set':
            out[sub][m] = interp[m]
            if mask_out is not None: mask_out[sub][m] = 1
        else:
            val = sampler(interp)
            cur = out[sub]
            out[sub] = np.where(m, np.maximum(cur, val), cur)


def bilinear(img, u, v):
    """img (h,w) float; u,v in [0,1] con v dal basso (convenzione OBJ)"""
    h, w = img.shape
    x = np.clip(u * (w - 1), 0, w - 1); y = np.clip((1 - v) * (h - 1), 0, h - 1)
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int)
    x1 = np.minimum(x0 + 1, w - 1); y1 = np.minimum(y0 + 1, h - 1)
    fx, fy = x - x0, y - y0
    return (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x1] * fx * (1 - fy) +
            img[y1, x0] * (1 - fx) * fy + img[y1, x1] * fx * fy)


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

# ---------------------------------------------------------------------------------------------
# cuffia dei capelli: guscio che segue il cranio sopra l'attaccatura (fronte alta, sopra le
# orecchie, bassa sulla nuca). Griglia polare attorno a un centro nel cranio; il raggio della
# superficie in ogni direzione è la media dei vertici della testa vicini in angolo.
# ---------------------------------------------------------------------------------------------
HAIR_COLS, HAIR_ROWS = 40, 12
# attaccatura: altezza (y, in raggi) in funzione dell'angolo dal davanti (0 = fronte, pi = nuca)
HAIRLINE = [(0.0, 0.5), (0.55, 0.47), (0.95, 0.36), (1.25, 0.2), (1.45, 0.18), (1.6, 0.22),
            (1.9, 0.2), (2.15, 0.0), (2.6, -0.32), (math.pi, -0.42)]
HAIR_CENTER = np.array([-0.05, -0.05, 0.0])


def hairline_y(alpha):
    a = np.abs(alpha)
    xs, ys = zip(*HAIRLINE)
    return np.interp(a, xs, ys)


def hair_index():
    idx = []
    C, R = HAIR_COLS, HAIR_ROWS
    for c in range(C):                      # ventaglio attorno al polo (vertice 0)
        idx += [0, 1 + (c + 1) % C, 1 + c]
    for r in range(R - 1):
        for c in range(C):
            a = 1 + r * C + c; b = 1 + r * C + (c + 1) % C
            a2 = a + C; b2 = b + C
            idx += [a, b, b2, a, b2, a2]
    return np.array(idx, dtype=np.uint16)


def hair_shell(G):
    """G: vertici della testa (coordinate di gioco, volto +X). Restituisce (n,3) posizioni."""
    P = G - HAIR_CENTER
    rad = np.linalg.norm(P, axis=1)
    U = P / rad[:, None]

    def surf(d):                            # d: (m,3) direzioni unitarie -> punti sulla testa
        cos = d @ U.T
        w = np.exp((cos - 1) / 0.0025) * (cos > 0.98)
        r = (w * rad).sum(1) / (w.sum(1) + 1e-12)
        return d * r[:, None] + HAIR_CENTER

    def dirs(theta, phi):                   # theta dall'alto, phi dal davanti verso +Z
        return np.stack([np.sin(theta) * np.cos(phi), np.cos(theta), np.sin(theta) * np.sin(phi)], -1)

    phis = np.arange(HAIR_COLS) / HAIR_COLS * 2 * math.pi
    out = [surf(dirs(np.array([0.0]), np.array([0.0])))[0] + np.array([0, 0.065, 0])]
    # per ogni colonna, l'angolo theta dove la superficie scende sotto l'attaccatura
    th = np.linspace(0.02, 0.85 * math.pi, 240)
    edge = []
    for ph in phis:
        pts = surf(dirs(th, np.full_like(th, ph)))
        alpha = np.arctan2(np.abs(pts[:, 2]), pts[:, 0])
        below = np.nonzero(pts[:, 1] < hairline_y(alpha))[0]
        edge.append(th[below[0]] if len(below) else th[-1])
    edge = np.array(edge)
    # attaccatura un po' morbida fra colonne vicine
    edge = (np.roll(edge, 1) + 2 * edge + np.roll(edge, -1)) / 4
    for r in range(1, HAIR_ROWS + 1):
        t = r / HAIR_ROWS
        thr = edge * t
        d = dirs(thr, phis)
        p = surf(d)
        n = (p - HAIR_CENTER); n /= np.linalg.norm(n, axis=1, keepdims=True)
        thick = 0.065 * (1 - t ** 3) + 0.008      # spessore: pieno in alto, aderente al bordo
        out += list(p + n * thick)
    return np.array(out)


def b64(arr):
    return base64.b64encode(np.ascontiguousarray(arr).tobytes()).decode('ascii')


def main():
    os.makedirs(OUT_IMG, exist_ok=True)
    print('asset MakeHuman (cache:', CACHE + ')')
    V, VT, F = load_obj(cached('3dobjs/base.obj', 'gh'))
    quads = head_island(V, VT, F)
    head_vs = sorted(set(v for vs, _ in quads for v in vs))
    head_ts = sorted(set(t for _, ts in quads for t in ts))
    print(f'isola della testa: {len(quads)} quad, {len(head_vs)} vertici')

    # varianti: posizioni complete (servono anche per occhi e sopracciglia)
    var_meshes = [variant_mesh(V, var, 1000 + i) for i, var in enumerate(VARIANTS)]
    ref = variant_mesh(V, VARIANTS[0], None)            # maschio caucasico giovane "medio"

    tris = triangulate(quads, ref)
    loops = boundary_loops(tris)
    # bordo del collo = il più basso; bocca = quello sull'asse centrale sopra il collo; occhi = laterali
    loops.sort(key=lambda l: ref[l, 1].mean())
    neck_loop = loops[0]
    mouth_loop = next(l for l in loops[1:] if abs(ref[l, 0].mean()) < 0.05)
    eye_loops = [l for l in loops[1:] if l is not mouth_loop]
    print('bordi:', len(loops), '(collo, bocca, occhi)')

    # cuciture UV e bordi restano fermi
    vt_of = collections.defaultdict(set)
    for vs, ts in tris:
        for v, t in zip(vs, ts): vt_of[v].add(t)
    locked = {v for v, s in vt_of.items() if len(s) > 1} | set(v for l in loops for v in l)

    samples = [ref, var_meshes[VARIANTS.index(next(v for v in VARIANTS if v[1] == 'f'))],
               var_meshes[4], var_meshes[10]]
    print('riduzione poligoni...')
    lods = decimate(tris, samples, locked, [HI_TRIS, LO_TRIS])
    for k in lods: print(f'  {k}: {len(lods[k])} triangoli')

    # ---------------------------------------------------------------- occhi (proxy MakeHuman)
    (eo_V, eo_VT, eo_F), eye_refs, eye_scales = load_proxy('eyes/low-poly', 'low-poly')
    eye_faces = [(vs, ts) for _, vs, ts in eo_F]

    # ---------------------------------------------------------------- normalizzazione
    # sul riferimento: calotta a y = +1, mento a y = 1 - CROWN_TO_CHIN, centro del cranio a x = z = 0
    eye_y = ref[[v for l in eye_loops for v in l], 1].mean()
    mouth_y = ref[mouth_loop, 1].mean()
    crown_y = ref[head_vs, 1].max()
    front = [v for v in head_vs if abs(ref[v, 0]) < 0.04 and ref[v, 2] > ref[mouth_loop, 2].mean() - 0.5]
    chin_cands = [v for v in front if ref[v, 1] < mouth_y]
    chin_v = min((v for v in chin_cands if ref[v, 2] > ref[mouth_loop, 2].mean() - 0.25), key=lambda v: ref[v, 1])
    chin_y = ref[chin_v, 1]
    S = CROWN_TO_CHIN / (crown_y - chin_y)
    skull = [v for v in head_vs if ref[v, 1] > eye_y]
    origin = np.array([0.0, crown_y - 1.0 / S, (ref[skull, 2].max() + ref[skull, 2].min()) / 2])
    print(f'scala {S:.4f} raggi/dm; occhi y {((eye_y - origin[1]) * S):.2f}, bocca y {((mouth_y - origin[1]) * S):.2f}')

    def norm_for(Vm):
        """i target macro spostano e ridimensionano la testa (altezza del corpo): ogni variante si
        allinea sulla propria calotta e sul proprio cranio; della differenza di dimensione resta metà"""
        h = Vm[head_vs, 1].max() - Vm[chin_v, 1]
        s = S * ((crown_y - chin_y) / h) ** 0.5
        sk = Vm[skull]
        return np.array([0.0, Vm[head_vs, 1].max() - 1.0 / s, (sk[:, 2].max() + sk[:, 2].min()) / 2]), s

    def to_game(P, nrm=(origin, S)):
        p = (P - nrm[0]) * nrm[1]
        return np.stack([p[:, 2], p[:, 1], -p[:, 0]], 1)      # volto +Z(MH) -> +X(gioco)

    # ---------------------------------------------------------------- layout della texture
    uvs = VT[head_ts]
    m = 0.004
    u0, v0 = uvs.min(0) - m; u1, v1 = uvs.max(0) + m
    head_h = TEX_H - EYE_PX
    sc = min(TEX_W / (u1 - u0), head_h / (v1 - v0))
    head_w = (u1 - u0) * sc
    ox = (TEX_W - head_w) / 2

    def uv_head(t):     # uv atlante MakeHuman -> uv nella nostra texture (v dal basso)
        uv = VT[t]
        px = ox + (uv[..., 0] - u0) * sc
        py_from_bottom = EYE_PX + (uv[..., 1] - v0) * sc
        return np.stack([px / TEX_W, py_from_bottom / TEX_H], -1)

    def uv_eye(uv):
        return np.stack([uv[..., 0] * EYE_PX / TEX_W, uv[..., 1] * EYE_PX / TEX_H], -1)

    def to_px(uv):      # uv nostra -> pixel immagine (y dall'alto)
        return np.stack([uv[..., 0] * TEX_W, (1 - uv[..., 1]) * TEX_H], -1)

    # ---------------------------------------------------------------- buffer per livello di dettaglio
    def build_lod(ltris):
        corners = {}
        index = []
        def corner(key):
            if key not in corners: corners[key] = len(corners)
            return corners[key]
        for vs, ts in ltris:
            index += [corner(('h', v, t)) for v, t in zip(vs, ts)]
        # bocca chiusa: ventaglio verso un vertice centrale arretrato (UV media del bordo = labbra)
        index += []
        mouth_c = corner(('mouth',))
        ml = mouth_loop
        mouth_tris = []
        for i in range(len(ml)):
            a, b = ml[i], ml[(i + 1) % len(ml)]
            ta = next(iter(vt_of[a])); tb = next(iter(vt_of[b]))
            mouth_tris.append((corner(('h', a, ta)), corner(('h', b, tb)), mouth_c))
        # orientamento: il ventaglio guarda avanti
        P = ref
        c = P[ml].mean(0)
        a, b = ml[0], ml[1]
        n = np.cross(P[b] - P[a], c - P[a])
        if n[2] < 0: mouth_tris = [(x, z, y) for x, y, z in mouth_tris]
        for tri in mouth_tris: index += list(tri)
        # occhi
        for vs, ts in eye_faces:
            ids = [corner(('e', v, t)) for v, t in zip(vs, ts)]
            for k in range(1, len(ids) - 1):
                index += [ids[0], ids[k], ids[k + 1]]
        keys = sorted(corners, key=corners.get)
        uv = np.zeros((len(keys), 2))
        for i, k in enumerate(keys):
            if k[0] == 'h': uv[i] = uv_head(k[2])
            elif k[0] == 'e': uv[i] = uv_eye(eo_VT[k[2]])
            else: uv[i] = uv_head(np.array(list(next(iter(vt_of[v])) for v in ml))).mean(0)
        return keys, np.array(index, dtype=np.uint16), uv

    def lod_positions(keys, index, Vm, eye_pos, nrm):
        P = np.zeros((len(keys), 3))
        ml = mouth_loop
        mc = Vm[ml].mean(0); mc[2] -= 0.06
        for i, k in enumerate(keys):
            if k[0] == 'h': P[i] = Vm[k[1]]
            elif k[0] == 'e': P[i] = eye_pos[k[1]]
            else: P[i] = mc
        G = to_game(P, nrm)
        # normali sulle posizioni saldate (stesso vertice geometrico = stessa normale)
        weld = {}
        wid = np.array([weld.setdefault((k[0], k[1]) if k[0] != 'mouth' else k, len(weld)) for k in keys])
        acc = np.zeros((len(weld), 3))
        tri = index.reshape(-1, 3)
        fn = np.cross(G[tri[:, 1]] - G[tri[:, 0]], G[tri[:, 2]] - G[tri[:, 0]])
        for j in range(3): np.add.at(acc, wid[tri[:, j]], fn)
        N = acc[wid]
        N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-12
        return G, N

    out = {'lods': {}, 'variants': [], 'hair': {'index': b64(hair_index())}}
    lod_keys = {}
    for name, n in (('hi', HI_TRIS), ('lo', LO_TRIS)):
        keys, index, uv = build_lod(lods[n])
        lod_keys[name] = (keys, index)
        out['lods'][name] = {'count': len(keys), 'index': b64(index),
                             'uv': b64(np.round(np.clip(uv, 0, 1) * 65535).astype(np.uint16))}
        print(f'  lod {name}: {len(keys)} vertici, {len(index) // 3} triangoli')

    # ---------------------------------------------------------------- varianti
    POS_RANGE = 2.0
    for var, Vm in zip(VARIANTS, var_meshes):
        vid, sex, age, eth, skin, eye_col = var
        eye_pos = fit_proxy(eye_refs, eye_scales, Vm)
        nrm = norm_for(Vm)
        entry = {'id': vid, 'sex': sex, 'age': age, 'eth': eth, 'tex': f'assets/heads/{vid}.jpg'}
        for name in ('hi', 'lo'):
            keys, index = lod_keys[name]
            G, N = lod_positions(keys, index, Vm, eye_pos, nrm)
            assert np.abs(G).max() < POS_RANGE, (vid, np.abs(G).max())
            entry[name] = {'pos': b64(np.round(G / POS_RANGE * 32767).astype(np.int16)),
                           'nrm': b64(np.round(N * 127).astype(np.int8))}
        # cranio (per adattare calotte dei capelli e cappellini): semiassi sopra gli occhi
        G = to_game(Vm[head_vs], nrm)
        top = G[G[:, 1] > to_game(Vm[[v for l in eye_loops for v in l]], nrm)[:, 1].mean()]
        entry['skull'] = [round(float((top[:, 0].max() - top[:, 0].min()) / 2), 3),
                          round(float(top[:, 1].max()), 3),
                          round(float((top[:, 2].max() - top[:, 2].min()) / 2), 3),
                          round(float((top[:, 0].max() + top[:, 0].min()) / 2), 3)]
        hs = hair_shell(to_game(Vm[head_vs], nrm))
        assert np.abs(hs).max() < POS_RANGE
        entry['hair'] = b64(np.round(hs / POS_RANGE * 32767).astype(np.int16))
        out['variants'].append(entry)

    # ---------------------------------------------------------------- mappa di posizione (rif.)
    # per ogni texel della testa: punto 3D sul volto di riferimento (coordinate MakeHuman)
    pos_map = np.zeros((TEX_H, TEX_W, 3)); cover = np.zeros((TEX_H, TEX_W))
    tri_px = np.array([to_px(uv_head(np.array(ts))) for _, ts in tris])
    tri_P = np.array([ref[vs] for vs, _ in tris])
    raster(tri_px, tri_P, TEX_W, TEX_H, pos_map, cover)
    island = Image.fromarray((cover > 0).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(2))
    island.paste(255, (0, TEX_H - EYE_PX, EYE_PX, TEX_H))
    # ---------------------------------------------------------------- texture della pelle
    print('texture...')
    eye_imgs = {}
    # guance (per il tono medio della pelle: collo e mani del modello si intonano al volto)
    PX, PY, PZ = pos_map[..., 0], pos_map[..., 1], pos_map[..., 2]
    cheek = ((cover > 0) & (np.abs(PX) > 0.25) & (np.abs(PX) < 0.55) & (PY > mouth_y) & (PY < eye_y)
             & (PZ > ref[head_vs, 2].max() - 0.75))
    for vi, var in enumerate(VARIANTS):
        vid, skin, eye_col = var[0], var[4], var[5]
        src = Image.open(cached(f'skins/{skin}/{SKIN_FILES[skin]}', 'zip')).convert('RGB')
        sw, shh = src.size
        # ritaglio dell'isola (v dal basso nell'OBJ, righe dall'alto nell'immagine)
        box = (u0 * sw, (1 - v1) * shh, u1 * sw, (1 - v0) * shh)
        crop = src.crop(tuple(int(round(b)) for b in box)).resize((int(round(head_w)), head_h), Image.LANCZOS)
        bg = tuple(int(c) for c in np.median(np.array(src.crop((int(0.5 * sw), int(0.02 * shh), int(0.52 * sw), int(0.04 * shh)))).reshape(-1, 3), 0))
        tex = Image.new('RGB', (TEX_W, TEX_H), bg)
        tex.paste(crop, (int(round(ox)), 0))
        # fuori dall'isola (logo, mani, altre parti dell'atlante) solo pelle uniforme
        tex = Image.composite(tex, Image.new('RGB', tex.size, bg), island)
        if eye_col not in eye_imgs:
            e = Image.open(cached(f'eyes/materials/{eye_col}_eye.png', 'zip')).convert('RGBA')
            flat = Image.new('RGB', e.size, (235, 232, 228)); flat.paste(e, (0, 0), e)
            eye_imgs[eye_col] = flat.resize((EYE_PX, EYE_PX), Image.LANCZOS)
        tex.paste(eye_imgs[eye_col], (0, TEX_H - EYE_PX))
        tex.save(os.path.join(OUT_IMG, f'{vid}.jpg'), quality=88, optimize=True)
        rgb = np.median(np.array(tex)[cheek], 0).astype(int)
        out['variants'][vi]['skin'] = int(rgb[0]) << 16 | int(rgb[1]) << 8 | int(rgb[2])

    X, Y, Z = pos_map[..., 0], pos_map[..., 1], pos_map[..., 2]
    covered = cover > 0

    # punti di riferimento
    mouth_P = ref[mouth_loop]
    mouth_c = mouth_P.mean(0); mouth_hw = np.abs(mouth_P[:, 0]).max()
    eye_c = np.array([ref[l].mean(0) for l in eye_loops])
    nose_tip = ref[max(front, key=lambda v: ref[v, 2])]
    ear_vs = [v for v in head_vs if abs(ref[v, 0]) > np.abs(ref[head_vs, 0]).max() - 0.12]
    ear_z = ref[ear_vs, 2].mean(); ear_y = ref[ear_vs, 1].mean()
    print(f'  bocca {np.round(mouth_c, 2)} semilargh {mouth_hw:.2f}; naso {np.round(nose_tip, 2)}; orecchio z {ear_z:.2f} y {ear_y:.2f}')

    ax = np.abs(X)
    dy_m = Y - mouth_c[1]
    # davanti all'orecchio, sotto la linea guancia (zigomo -> angolo della bocca), sopra il collo
    # guance: la linea sale dal labbro verso lo zigomo, poi le basette (striscia davanti all'orecchio)
    cheek_line = mouth_c[1] + 0.12 + 0.22 * smooth(0.1, 0.62, ax)
    front_of_ear = smooth(ear_z + 0.06, ear_z + 0.2, Z)
    beard = front_of_ear * (1 - smooth(cheek_line - 0.1, cheek_line + 0.08, Y))
    eye_y_ref = eye_c[:, 1].mean()
    sideburn = (smooth(ear_z + 0.02, ear_z + 0.08, Z) * (1 - smooth(ear_z + 0.2, ear_z + 0.3, Z))
                * (1 - smooth(eye_y_ref - 0.12, eye_y_ref + 0.02, Y)) * smooth(0.55, 0.65, ax))
    beard = np.maximum(beard, sideburn)
    ear = (ax > np.abs(ref[head_vs, 0]).max() - 0.2) & (np.abs(Z - ear_z) < 0.28) & (np.abs(Y - ear_y) < 0.4)
    beard = np.where(ear, 0, beard)
    under = smooth(chin_y - 0.55, chin_y - 0.2, Y)                        # sotto il mento sfuma sul collo
    beard *= under
    lips = np.exp(-((X / (mouth_hw * 1.05)) ** 2 + (dy_m / 0.11) ** 2) ** 2)
    beard *= 1 - lips * smooth(mouth_c[2] - 0.35, mouth_c[2] - 0.1, Z)
    must = (np.exp(-((X / (mouth_hw * 1.15)) ** 4)) * smooth(0.04, 0.09, dy_m) * (1 - smooth(0.2, 0.27, dy_m))
            * smooth(mouth_c[2] - 0.3, mouth_c[2] - 0.12, Z))
    # baffi che scendono un poco ai lati della bocca
    must = np.maximum(must, np.exp(-(((ax - mouth_hw * 1.1) / 0.07) ** 2)) * smooth(-0.12, 0.0, dy_m) * (1 - smooth(0.12, 0.2, dy_m))
                      * smooth(mouth_c[2] - 0.35, mouth_c[2] - 0.15, Z))
    beard_only = beard * (1 - smooth(0.0, 0.06, dy_m) * (ax < mouth_hw * 1.25))   # senza baffi: labbro superiore libero
    # grana dei peli: rumore fine + ciocche allungate (non una macchia uniforme)
    rng = np.random.default_rng(7)
    fine = np.array(Image.fromarray((rng.random((TEX_H, TEX_W)) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.45))) / 255.0
    coarse = np.array(Image.fromarray((rng.random((TEX_H // 8, TEX_W // 8)) * 255).astype(np.uint8))
                      .resize((TEX_W, TEX_H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(3))) / 255.0
    fine = (fine - fine.mean()) / (fine.std() + 1e-6)
    coarse = (coarse - coarse.mean()) / (coarse.std() + 1e-6)
    def finish(a):
        a = np.where(covered, a, 0)
        im = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.0))
        a = np.array(im) / 255.0
        # bordi radi: la grana conta di più dove la maschera è debole
        a = a * (1 + 0.22 * fine + 0.12 * coarse) + (fine * 0.18) * a * (1 - a) * 2
        return np.clip(np.where(a > 0.04, a, 0) * 255, 0, 255).astype(np.uint8)

    # sopracciglia: proxy MakeHuman riportati sulla pelle
    def brow_mask(name):
        (bV, bVT, bF), refs, scales = load_proxy(f'eyebrows/{name}', name)
        alpha = np.array(Image.open(cached(f'eyebrows/{name}/{name}.png', 'zip')).convert('RGBA'))[..., 3] / 255.0
        # UV sulla pelle di ogni vertice del proxy: media pesata delle UV dei tre vertici di base
        uv_of_v = {v: uv_head(next(iter(s))) for v, s in vt_of.items()}
        puv = []
        for ix, w, _ in refs:
            puv.append(sum(wj * uv_of_v[j] for j, wj in zip(ix, w) if j in uv_of_v) / max(1e-9, sum(wj for j, wj in zip(ix, w) if j in uv_of_v)))
        puv = np.array(puv)
        tp, ta = [], []
        for _, vs, ts in bF:
            for k in range(1, len(vs) - 1):
                tri = [0, k, k + 1]
                tp.append(to_px(puv[[vs[i] for i in tri]]))
                ta.append(bVT[[ts[i] for i in tri]])
        mask = np.zeros((TEX_H, TEX_W))
        raster(np.array(tp), np.array(ta), TEX_W, TEX_H, mask, combine='max',
               sampler=lambda a: bilinear(alpha, a[..., 0], a[..., 1]))
        return np.array(Image.fromarray((np.clip(mask, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)))

    brows_f = brow_mask('eyebrow001')
    brows_m = brow_mask('eyebrow009')
    ma = np.stack([brows_f, brows_m, finish(beard_only)], -1)
    stubble = finish(np.maximum(beard_only, must) * 0.9)
    mb = np.stack([finish(must), stubble, np.zeros_like(stubble)], -1)
    Image.fromarray(ma.astype(np.uint8)).save(os.path.join(OUT_IMG, 'masks_a.png'), optimize=True)
    Image.fromarray(mb.astype(np.uint8)).save(os.path.join(OUT_IMG, 'masks_b.png'), optimize=True)

    # ---------------------------------------------------------------- uscita JS
    out['posRange'] = POS_RANGE
    out['masks'] = ['assets/heads/masks_a.png', 'assets/heads/masks_b.png']
    js = ('// GENERATO da tools/generate_heads.py: non modificare a mano.\n'
          '// Teste da MakeHuman (CC0 1.0, https://github.com/makehumancommunity/makehuman).\n'
          'window.HIL_HEAD_DATA = ' + json.dumps(out, separators=(',', ':')) + ';\n')
    with open(OUT_JS, 'w', encoding='utf-8') as f: f.write(js)
    print(f'scritto {OUT_JS} ({len(js) // 1024} KB) e {len(VARIANTS)} texture in {OUT_IMG}')


if __name__ == '__main__':
    main()
