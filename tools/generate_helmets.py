"""Caschi dei giocatori/arbitri, maschera e gambali del portiere da modelli 3D CC BY 4.0 di Sketchfab.

Sorgenti (zip glTF scaricati da Sketchfab, nella cartella models/ del progetto):
  models/hockey_helmet_washington_capitals.zip
      "Hockey Helmet Washington Capitals" di Andrey Novichkov (https://sketchfab.com/hophobb)
      https://sketchfab.com/3d-models/hockey-helmet-washington-capitals-e49ac53913ab4bb5af3396cd273ef783
  models/helmet_for_puck.zip
      "Helmet for Puck" di K31THUZ4D (https://sketchfab.com/K31THUZ4D)
      https://sketchfab.com/3d-models/helmet-for-puck-3bfcec855d3843e889f311ead4d48481
  models/pads.zip
      "pads" di gurjbakshi (https://sketchfab.com/gurjbakshi)
      https://sketchfab.com/3d-models/pads-e6313b4e57a04a198fbe3f8598929c05
Tutti CC BY 4.0 (http://creativecommons.org/licenses/by/4.0/): uso libero, anche commerciale,
citando l'autore (lo fanno i crediti del gioco). Le texture originali NON si usano: hanno loghi e
marchi reali (Capitals, Bauer, Oilers, CCM, Warrior). Si tengono solo le forme; colori e grafiche li mette il gioco.

Lavorazione:
  - parti del modello raggruppate per ruolo (calotta, imbottitura, paraorecchie, visiera, sottogola, metallo);
  - assi del gioco: davanti -Z, alto +Y;
  - vertici saldati, poligoni ridotti (due livelli di dettaglio) con la stessa riduzione delle teste;
  - normali ricalcolate con gli spigoli vivi (angolo > CREASE);
  - calotta del giocatore e maschera del portiere: UV "di fianco" calcolate dalla forma
    (u = 0,5 + angolo dal davanti, v = 1 - angolo dall'alto) come la vecchia maschera procedurale,
    così le grafiche di src/game/GoalieMask.js e i marchi del casco si dipingono su una tela semplice;
  - gambali: i due pezzi separati, prima raggruppati su una griglia (il modello ha 434.000 triangoli),
    poi ridotti; UV piatte viste da davanti (u da sinistra a destra, v dal basso) per la grafica della squadra,
    il retro (cinghie) a parte.

Uscita: src/game/HelmetModels.js (window.HIL_HELMET_DATA). Posizioni nelle unità del modello già
centrate: la scala e la posizione sulla testa le decide il gioco (index.html e GoalieMask.js).
Uso (dalla cartella del progetto): python tools/generate_helmets.py .
Richiede numpy.
"""
import sys, os, io, json, math, base64, zipfile, collections
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generate_heads import decimate  # noqa: E402

ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
OUT_JS = os.path.join(ROOT, 'src', 'game', 'HelmetModels.js')
CREASE = math.radians(40)

PLAYER_ZIP = os.path.join(ROOT, 'models', 'hockey_helmet_washington_capitals.zip')
GOALIE_ZIP = os.path.join(ROOT, 'models', 'helmet_for_puck.zip')
PADS_ZIP = os.path.join(ROOT, 'models', 'pads.zip')
PADS_LOD = {'hi': 2200, 'lo': 900}         # triangoli per gambale

# materiali del casco (nomi dei materiali glTF) -> parte del gioco
PLAYER_PARTS = {
    'lambert3SG': 'shell',      # calotta esterna (colore del casco della squadra)
    'lambert9SG': 'pad',        # imbottiture interne
    'lambert15SG': 'pad',
    'lambert4SG': 'pad',
    'lambert2SG': 'ear',        # paraorecchie in plastica scura
    'lambert7SG': 'visor',      # visiera trasparente
    'lambert10SG': 'clip',      # staffe del sottogola
    'lambert12SG': 'strap',     # sottogola
    'lambert11SG': 'strap',     # fibbia
    'lambert14SG': 'strap',     # mentoniera
    'lambert6SG': 'metal',      # viti
    'lambert13SG': 'metal',     # attacchi della visiera
}
# triangoli per parte nei due livelli di dettaglio (None = tutti; 0 = parte tolta)
PLAYER_LOD = {
    'hi': {'shell': 2000, 'pad': 600, 'ear': 260, 'visor': 160, 'clip': 300, 'strap': 220, 'metal': None},
    'lo': {'shell': 800, 'pad': 0, 'ear': 110, 'visor': 70, 'clip': 0, 'strap': 90, 'metal': 0},
}
GOALIE_PARTS = {'Kissel_GoalieHelmet': 'shell', 'Cage': 'cage'}
GOALIE_LOD = {
    'hi': {'shell': None, 'cage': None},
    'lo': {'shell': 1100, 'cage': 700},
}

# ---------------------------------------------------------------------------------------------
# lettura glTF da zip
# ---------------------------------------------------------------------------------------------
CT = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def node_matrix(n):
    if 'matrix' in n:
        return np.array(n['matrix'], dtype=np.float64).reshape(4, 4).T
    M = np.eye(4)
    t = n.get('translation', [0, 0, 0]); r = n.get('rotation', [0, 0, 0, 1]); s = n.get('scale', [1, 1, 1])
    x, y, z, w = r
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                  [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                  [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M[:3, :3] = R * np.array(s); M[:3, 3] = t
    return M


def load_gltf_zip(path):
    """Restituisce {nome materiale: [(posizioni Nx3 nel mondo, indici Mx3), ...]}."""
    z = zipfile.ZipFile(path)
    g = json.loads(z.read('scene.gltf'))
    buf = z.read(g['buffers'][0]['uri'])

    def acc(i):
        a = g['accessors'][i]; bv = g['bufferViews'][a['bufferView']]
        off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        n = a['count'] * NC[a['type']]
        arr = np.frombuffer(buf, CT[a['componentType']], n, off)
        return arr.reshape(a['count'], NC[a['type']]) if NC[a['type']] > 1 else arr

    out = collections.defaultdict(list)

    def walk(ni, P):
        n = g['nodes'][ni]; M = P @ node_matrix(n)
        if 'mesh' in n:
            for p in g['meshes'][n['mesh']]['primitives']:
                pos = acc(p['attributes']['POSITION']).astype(np.float64)
                pw = (M @ np.c_[pos, np.ones(len(pos))].T).T[:, :3]
                idx = acc(p['indices']).astype(np.int64).reshape(-1, 3) if 'indices' in p else np.arange(len(pos)).reshape(-1, 3)
                if np.linalg.det(M[:3, :3]) < 0: idx = idx[:, ::-1]
                out[g['materials'][p['material']]['name']].append((pw, idx))
        for c in n.get('children', []): walk(c, M)
    for r in g['scenes'][g.get('scene', 0)]['nodes']: walk(r, np.eye(4))
    return out


# ---------------------------------------------------------------------------------------------
# geometria
# ---------------------------------------------------------------------------------------------
def weld(chunks, tol):
    """Unisce le parti di un ruolo saldando i vertici coincidenti."""
    P = np.vstack([c[0] for c in chunks])
    F, off = [], 0
    for pw, idx in chunks:
        F.append(idx + off); off += len(pw)
    F = np.vstack(F)
    key = np.round(P / tol).astype(np.int64)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    inv = inv.reshape(-1)
    V = P[first]
    F = inv[F]
    F = F[(F[:, 0] != F[:, 1]) & (F[:, 1] != F[:, 2]) & (F[:, 0] != F[:, 2])]
    # triangoli doppi (stessi vertici) via
    _, keep = np.unique(np.sort(F, axis=1), axis=0, return_index=True)
    return V, F[np.sort(keep)]


def reduce(V, F, target, lock=True):
    if target is None or len(F) <= target: return F
    tris = [(list(map(int, f)), list(map(int, f))) for f in F]
    ec = collections.Counter()
    for f in F:
        for i in range(3):
            a, b = int(f[i]), int(f[(i + 1) % 3]); ec[(min(a, b), max(a, b))] += 1
    # bordi aperti e spigoli non manifold bloccati (non per i gambali: il modello generato ne è pieno)
    locked = {v for (a, b), c in ec.items() if c != 2 for v in (a, b)} if lock else set()
    res = decimate(tris, [V], locked, [target])
    return np.array([vs for vs, _ in res[target]], dtype=np.int64)


def face_normals(V, F):
    n = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    a = np.linalg.norm(n, axis=1, keepdims=True)
    return n / np.maximum(a, 1e-12), a[:, 0]


def split_creases(V, F, uv_fn=None):
    """Vertici finali (posizione, normale, uv) per angolo: normali lisce entro CREASE, spigoli vivi oltre."""
    fn, area = face_normals(V, F)
    vf = collections.defaultdict(list)
    for fi, f in enumerate(F):
        for v in f: vf[int(v)].append(fi)
    cosc = math.cos(CREASE)
    corner_uv = uv_fn(V, F) if uv_fn else None
    verts, keymap, out = [], {}, []
    for fi, f in enumerate(F):
        tri = []
        for k, v in enumerate(f):
            v = int(v)
            nb = [g for g in vf[v] if np.dot(fn[g], fn[fi]) > cosc]
            n = np.sum(fn[nb] * area[nb, None], axis=0)
            n /= max(np.linalg.norm(n), 1e-12)
            uv = tuple(np.round(corner_uv[fi, k], 4)) if corner_uv is not None else None
            key = (v, tuple(np.round(n, 2)), uv)
            if key not in keymap:
                keymap[key] = len(verts)
                verts.append((V[v], n, corner_uv[fi, k] if corner_uv is not None else None))
            tri.append(keymap[key])
        out.append(tri)
    P = np.array([p for p, _, _ in verts]); N = np.array([n for _, n, _ in verts])
    UV = np.array([u for _, _, u in verts]) if corner_uv is not None else None
    return P, N, UV, np.array(out, dtype=np.int64)


def side_uv(center, radii, side_span):
    """UV 'di fianco' per angolo: u = 0,5 + d / (2 * side_span) (d = angolo dal davanti -Z, verso +X positivo
    come phi - 3/2 pi della SphereGeometry), v = 1 - theta / pi (theta dall'alto). La cucitura sta dietro."""
    def fn(V, F):
        out = np.zeros((len(F), 3, 2))
        for fi, f in enumerate(F):
            ds = []
            for k, v in enumerate(f):
                p = (V[v] - center) / radii
                r = np.linalg.norm(p)
                th = math.acos(max(-1.0, min(1.0, p[1] / max(r, 1e-9))))
                phi = math.atan2(p[2], -p[0])               # x = -cos(phi) sin(th), z = sin(phi) sin(th)
                d = (phi - 1.5 * math.pi + math.pi) % (2 * math.pi) - math.pi
                ds.append(d); out[fi, k] = (0, 1 - th / math.pi)
            # triangolo a cavallo della cucitura dietro: angoli resi continui (u esce da [0, 1])
            if max(ds) - min(ds) > math.pi:
                ds = [d + 2 * math.pi if d < 0 else d for d in ds]
            for k in range(3): out[fi, k, 0] = 0.5 + ds[k] / (2 * side_span)
        return out
    return fn


def cluster(V, F, cell):
    """Riduzione grossolana e veloce: vertici fusi su una griglia di lato 'cell' (posizione media)."""
    key = np.floor(V / cell).astype(np.int64)
    _, inv = np.unique(key, axis=0, return_inverse=True)
    inv = inv.reshape(-1)
    n = inv.max() + 1
    P = np.zeros((n, 3)); cnt = np.zeros(n)
    np.add.at(P, inv, V); np.add.at(cnt, inv, 1)
    P /= cnt[:, None]
    F = inv[F]
    F = F[(F[:, 0] != F[:, 1]) & (F[:, 1] != F[:, 2]) & (F[:, 0] != F[:, 2])]
    _, keep = np.unique(np.sort(F, axis=1), axis=0, return_index=True)
    F = F[np.sort(keep)]
    used = np.unique(F)
    remap = -np.ones(n, dtype=np.int64); remap[used] = np.arange(len(used))
    return P[used], remap[F]


def planar_uv(lo, hi):
    """UV piatte viste da davanti (-Z): u da sinistra a destra di chi guarda il gambale, v dal basso."""
    def fn(V, F):
        out = np.zeros((len(F), 3, 2))
        P = V[F]
        out[..., 0] = (hi[0] - P[..., 0]) / (hi[0] - lo[0])     # davanti a -Z: la sinistra di chi guarda è +X
        out[..., 1] = (P[..., 1] - lo[1]) / (hi[1] - lo[1])
        return out
    return fn


def b64(arr):
    return base64.b64encode(np.ascontiguousarray(arr).tobytes()).decode('ascii')


def pack(P, N, UV, F, lo, hi):
    """Posizioni Int16 sul riquadro [lo, hi] del modello, normali Int8, UV Int16 (1/8192), indici Uint16."""
    q = np.round((P - lo) / (hi - lo) * 65535 - 32768).clip(-32768, 32767).astype(np.int16)
    d = {'pos': b64(q), 'nrm': b64(np.round(N * 127).clip(-127, 127).astype(np.int8)),
         'index': b64(F.astype(np.uint16)), 'count': int(len(F))}
    if UV is not None:
        d['uv'] = b64(np.round(UV * 8192).clip(-32768, 32767).astype(np.int16))
    return d


def build(parts, lods, uv_for, bounds_parts):
    """parts: {ruolo: (V, F)}; restituisce il dizionario di uscita del modello."""
    allV = np.vstack([parts[r][0] for r in bounds_parts])
    lo = np.vstack([v for v, _ in parts.values()]).min(0)
    hi = np.vstack([v for v, _ in parts.values()]).max(0)
    model = {'box': [list(map(float, allV.min(0))), list(map(float, allV.max(0)))],
             'range': [list(map(float, lo)), list(map(float, hi))], 'lods': {}}
    for lod, targets in lods.items():
        L = {}
        for role, (V, F) in parts.items():
            t = targets.get(role, None)
            if t == 0: continue
            Fr = reduce(V, F, t)
            P, N, UV, Fo = split_creases(V, Fr, uv_for.get(role))
            assert len(P) < 65536
            L[role] = pack(P, N, UV, Fo, lo, hi)
            print(f'  {lod:2} {role:6} {len(F):5} -> {len(Fo):5} triangoli, {len(P):5} vertici')
        model['lods'][lod] = L
    return model


def main():
    data = {'credits': [
        {'title': 'Hockey Helmet Washington Capitals', 'author': 'Andrey Novichkov (hophobb)',
         'url': 'https://sketchfab.com/3d-models/hockey-helmet-washington-capitals-e49ac53913ab4bb5af3396cd273ef783',
         'license': 'CC BY 4.0'},
        {'title': 'Helmet for Puck', 'author': 'K31THUZ4D',
         'url': 'https://sketchfab.com/3d-models/helmet-for-puck-3bfcec855d3843e889f311ead4d48481',
         'license': 'CC BY 4.0'}]}

    # ------------------------------------------------------------------ casco del giocatore
    # modello: davanti +X, alto +Y  ->  gioco: (z, y, -x) (rotazione di 90 gradi attorno a Y)
    raw = load_gltf_zip(PLAYER_ZIP)
    roles = collections.defaultdict(list)
    for mat, chunks in raw.items():
        role = PLAYER_PARTS.get(mat)
        if not role: print('  materiale ignorato', mat); continue
        for pw, idx in chunks:
            roles[role].append((np.c_[pw[:, 2], pw[:, 1], -pw[:, 0]], idx))
    parts = {r: weld(c, 1e-4) for r, c in roles.items()}
    sv = parts['shell'][0]
    c = (sv.min(0) + sv.max(0)) / 2
    # centro della calotta poco sopra il bordo, raggi sul guscio
    center = np.array([c[0], sv.min(0)[1] + (sv.max(0)[1] - sv.min(0)[1]) * 0.42, c[2]])
    radii = (sv.max(0) - sv.min(0)) / 2
    print('casco giocatore')
    data['player'] = build(parts, PLAYER_LOD, {'shell': side_uv(center, radii, math.pi)}, ['shell'])
    data['player']['uvCenter'] = list(map(float, center)); data['player']['uvRadii'] = list(map(float, radii))

    # ------------------------------------------------------------------ maschera del portiere
    # modello: davanti +Z, alto +Y (centimetri)  ->  gioco: (-x, y, -z) (mezzo giro attorno a Y)
    raw = load_gltf_zip(GOALIE_ZIP)
    roles = collections.defaultdict(list)
    for mat, chunks in raw.items():
        role = GOALIE_PARTS.get(mat)
        if not role: print('  materiale ignorato', mat); continue
        for pw, idx in chunks:
            roles[role].append((np.c_[-pw[:, 0], pw[:, 1], -pw[:, 2]], idx))
    parts = {r: weld(c, 1e-3) for r, c in roles.items()}
    sv, sf = parts['shell']
    c = (sv.min(0) + sv.max(0)) / 2
    # come la vecchia maschera: centro al 46% dell'altezza (dal mento), raggi sulla calotta
    center = np.array([c[0], sv.min(0)[1] + (sv.max(0)[1] - sv.min(0)[1]) * 0.46, c[2]])
    radii = np.array([(sv.max(0)[0] - sv.min(0)[0]) / 2, sv.max(0)[1] - center[1], (sv.max(0)[2] - sv.min(0)[2]) / 2])
    # facce interne (normale verso il centro): imbottitura scura, senza grafica
    fn, _ = face_normals(sv, sf)
    cen = sv[sf].mean(1)
    inner = np.einsum('ij,ij->i', fn, (cen - center) / radii) < 0
    parts = {'shell': (sv, sf[~inner]), 'liner': (sv, sf[inner]), 'cage': parts['cage']}
    lods = {k: dict(v, liner=(None if k == 'hi' else 500)) for k, v in GOALIE_LOD.items()}
    print('maschera del portiere')
    side = 2.05          # come SIDE in GoalieMask.js: la grafica copre ±2,05 rad dal davanti
    data['goalie'] = build(parts, lods, {'shell': side_uv(center, radii, side)}, ['shell', 'liner'])
    data['goalie']['uvCenter'] = list(map(float, center)); data['goalie']['uvRadii'] = list(map(float, radii))

    # ------------------------------------------------------------------ gambali del portiere
    # modello: due gambali affiancati, davanti +Z, alto +Y  ->  gioco: (-x, y, -z)
    raw = load_gltf_zip(PADS_ZIP)
    chunks = [(np.c_[-pw[:, 0], pw[:, 1], -pw[:, 2]], idx) for cs in raw.values() for pw, idx in cs]
    V, F = weld(chunks, 2e-4)
    V, F = cluster(V, F, 0.016)
    print('gambali: dopo la griglia', len(F), 'triangoli')
    data['pads'] = {}
    cen = V[F].mean(1)
    for side, sel in (('left', cen[:, 0] < 0), ('right', cen[:, 0] >= 0)):
        Fs = F[sel]
        used = np.unique(Fs)
        remap = -np.ones(len(V), dtype=np.int64); remap[used] = np.arange(len(used))
        Vs = V[used].copy(); Fs = remap[Fs]
        c = (Vs.min(0) + Vs.max(0)) / 2
        Vs[:, 0] -= c[0]; Vs[:, 2] -= c[2]                       # centrato in larghezza e profondità
        lo, hi = Vs.min(0), Vs.max(0)
        print('gambale', side)
        m = None
        for lod, target in PADS_LOD.items():
            Fr = reduce(Vs, Fs, target, lock=False)
            fn, _ = face_normals(Vs, Fr)
            back = fn[:, 2] > 0.35                                # retro (verso +Z): cinghie e imbottitura
            parts = {'front': (Vs, Fr[~back]), 'back': (Vs, Fr[back])}
            mm = build(parts, {lod: {'front': None, 'back': None}}, {'front': planar_uv(lo, hi)}, ['front', 'back'])
            if m is None: m = mm
            else: m['lods'][lod] = mm['lods'][lod]
        data['pads'][side] = m
    data['credits'].append({'title': 'pads', 'author': 'gurjbakshi',
                            'url': 'https://sketchfab.com/3d-models/pads-e6313b4e57a04a198fbe3f8598929c05',
                            'license': 'CC BY 4.0'})

    js = ('// GENERATO da tools/generate_helmets.py: non modificare a mano.\n'
          '// Modelli da Sketchfab, CC BY 4.0: "Hockey Helmet Washington Capitals" di Andrey Novichkov (hophobb),\n'
          '// "Helmet for Puck" di K31THUZ4D e "pads" di gurjbakshi. Solo le forme: loghi e texture originali\n'
          '// non sono inclusi.\n'
          'window.HIL_HELMET_DATA = ' + json.dumps(data, separators=(',', ':')) + ';\n')
    io.open(OUT_JS, 'w', encoding='utf-8').write(js)
    print(f'scritto {OUT_JS} ({len(js) // 1024} KB)')


if __name__ == '__main__':
    main()
