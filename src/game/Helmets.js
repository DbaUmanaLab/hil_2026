// =====================================================================
// CASCHI MODELLATI (giocatori/arbitri) E MASCHERA DEL PORTIERE: geometrie
// Dati generati da tools/generate_helmets.py (src/game/HelmetModels.js) da due modelli Sketchfab CC BY 4.0:
//   "Hockey Helmet Washington Capitals" di Andrey Novichkov (hophobb) e "Helmet for Puck" di K31THUZ4D.
// Solo le forme: colori, marchi e grafiche li aggiunge il gioco (index.html, src/game/GoalieMask.js).
// Sistema di riferimento del gruppo testa (headGroup): davanti -Z, alto +Y. FIT porta le unità del modello
// sulla testa modellata (testa: ±0,128 di larghezza, sommità a y 0,298, naso a z -0,147, nuca a +0,12).
// =====================================================================
(function () {
    const DATA = window.HIL_HELMET_DATA;
    if (!DATA || typeof THREE === 'undefined') return;

    // gioco = modello * s + o (scala non uniforme: la testa è più corta del casco originale)
    const FIT = {
        player: { s: [0.212, 0.178, 0.168], o: [0, 0.15, 0.002] },
        goalie: { s: [0.00909, 0.0085, 0.0088], o: [0, -0.0123, -0.01] },
        // gambali nel sistema del ginocchio (kneePivot): dalla caviglia a sopra il ginocchio, davanti alla tibia
        pads: { s: [0.44, 0.47, 0.44], o: [0, -0.045, -0.065] }
    };

    function decode(b64, Type) {
        const bin = atob(b64);
        const buf = new ArrayBuffer(bin.length);
        const u8 = new Uint8Array(buf);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return new Type(buf);
    }

    const cache = {};
    // model: 'player' | 'goalie' | 'pads.left' | 'pads.right'; role: parte (shell, pad, ear, visor, strap, clip,
    // metal / shell, liner, cage / front, back)
    function geometry(model, role, lod) {
        const M = model.split('.').reduce((o, k) => o && o[k], DATA);
        if (!M) return null;
        lod = lod === 'lo' ? 'lo' : 'hi';
        const key = model + '|' + role + '|' + lod;
        if (key in cache) return cache[key];
        const P = M.lods[lod][role];
        if (!P) { cache[key] = null; return null; }
        const F = FIT[model.split('.')[0]], lo = M.range[0], hi = M.range[1];
        const q = decode(P.pos, Int16Array), n8 = decode(P.nrm, Int8Array);
        const pos = new Float32Array(q.length), nrm = new Float32Array(n8.length);
        for (let i = 0; i < q.length; i += 3) {
            for (let k = 0; k < 3; k++) {
                const m = lo[k] + (q[i + k] + 32768) / 65535 * (hi[k] - lo[k]);
                pos[i + k] = m * F.s[k] + F.o[k];
                nrm[i + k] = n8[i + k] / 127 / F.s[k];          // normali con la scala inversa
            }
            const l = Math.hypot(nrm[i], nrm[i + 1], nrm[i + 2]) || 1;
            nrm[i] /= l; nrm[i + 1] /= l; nrm[i + 2] /= l;
        }
        const g = new THREE.BufferGeometry();
        g.setIndex(new THREE.BufferAttribute(decode(P.index, Uint16Array), 1));
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
        if (P.uv) {
            const u16 = decode(P.uv, Int16Array), uv = new Float32Array(u16.length);
            for (let i = 0; i < u16.length; i++) uv[i] = u16[i] / 8192;
            g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        }
        g.computeBoundingSphere();
        cache[key] = g;
        return g;
    }

    window.HIL_HELMETS = {
        geometry,
        has: model => !!DATA[model],
        credits: DATA.credits || []
    };
})();
