// --- src/game/People.js ---
// Varietà delle persone in palazzetto:
//  - pubblico: uomini e donne, capelli di colori e tagli diversi, qualche calvo, barba/baffi;
//    il 10% tifa per gli ospiti, il resto per la squadra di casa; alcuni indossano la maglia o la
//    felpa (colore + logo) della squadra, altri sventolano una bandierina con i suoi colori;
//  - giocatori: altezza e peso diversi, qualcuno con barba e/o baffi, nazionalità.
// Script classico: usa a runtime THREE, TEAM_DATA, CLUB_ROSTERS, matchConfig e
// getFaceMaterialFromFile dello script principale di index.html.
(function () {
    'use strict';

    // ---------- casualità deterministica (stesso giocatore = stesso aspetto a ogni partita)
    function hash(str) {
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
        return h >>> 0;
    }
    function rng(seed) {
        let a = seed >>> 0;
        return () => {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    function pickWeighted(list, r) {
        const tot = list.reduce((s, it) => s + it[1], 0);
        let x = r * tot;
        for (const it of list) { if ((x -= it[1]) < 0) return it[0]; }
        return list[list.length - 1][0];
    }

    // ---------- volti fotografici e loro varianti (tools/generate_face_variants.py)
    const FACE_COUNT = 3;
    const FEMALE_FACES = [1, 3];
    const FACIAL_HAIR = ['beard', 'mustache', 'full'];
    const faceFile = (n, variant) => `assets/players/player_face_${n}${variant ? '_' + variant : ''}.jpg`;
    function normFacialHair(v) {
        v = String(v || '').toLowerCase();
        if (v === 'both' || v === 'entrambi' || v === 'full') return 'full';
        if (v === 'beard' || v === 'barba') return 'beard';
        if (v === 'mustache' || v === 'moustache' || v === 'baffi') return 'mustache';
        return 'none';
    }

    // =====================================================================
    // GIOCATORI
    // =====================================================================
    function findPlayerInfo(clubId, num, name) {
        const club = window.CLUB_ROSTERS ? CLUB_ROSTERS[clubId] : (TEAM_DATA.rosters[clubId]);
        if (!club) return null;
        const all = [club.goalie, ...(club.backupGoalies || []), ...[].concat(...(club.lines || [])), ...(club.reserves || [])].filter(Boolean);
        return all.find(p => String(p.num) === String(num) && p.name === name) || all.find(p => p.name === name) || null;
    }

    // Tratti di un giocatore: i campi facoltativi di teams.json (nat, gender, height, weight, facialHair)
    // hanno la precedenza; quelli mancanti sono generati in modo stabile dal nome.
    const isFemale = g => /^(f|female|donna|femmina)$/i.test(String(g || ''));
    function playerTraits(clubId, info, isGoalie) {
        info = info || {};
        const r = rng(hash(`${clubId}|${info.num || ''}|${info.name || ''}|${info.first || ''}`));
        const country = (TEAM_DATA.countries && TEAM_DATA.countries[clubId]) || 'IT';
        const female = isFemale(info.gender);
        const height = +info.height || Math.round(female
            ? 156 + (r() + r() + r()) / 3 * 22 + (isGoalie ? 2 : 0)                                         // 156–178 cm
            : 167 + (r() + r() + r()) / 3 * 27 + (isGoalie ? 2 : 0));                                        // 167–196 cm, media ~181
        const bmi = (female ? 20 : 21.5) + (r() + r()) / 2 * 5.5;
        const weight = +info.weight || Math.round(bmi * Math.pow(height / 100, 2));
        const fr = r();
        const facialHair = female ? 'none' : info.facialHair != null ? normFacialHair(info.facialHair)
            : (fr < 0.06 ? 'beard' : fr < 0.11 ? 'mustache' : fr < 0.17 ? 'full' : 'none');               // pochi: ~17%
        const fi = r();
        const face = female ? FEMALE_FACES[Math.floor(fi * FEMALE_FACES.length)] : 1 + Math.floor(fi * FACE_COUNT);
        return { nat: String(info.nat || country).toUpperCase(), female, height, weight, facialHair, face };
    }

    function traitsOf(clubId, num, name, isGoalie) {
        return playerTraits(clubId, findPlayerInfo(clubId, num, name), isGoalie);
    }

    // Applica altezza, corporatura e volto al modello creato da createSkater()
    function applySkaterLook(sk) {
        if (!sk || sk.isRef || !sk.mesh) return;
        const t = traitsOf(sk.clubId, sk.jerseyNum, sk.playerName, sk.isGoalie);
        sk.traits = t;
        sk.nationality = t.nat;
        // altezza: tutto il modello in scala (piedi a terra, stecca compresa)
        const h = clamp(t.height / 181, 0.86, 1.1);
        sk.mesh.scale.setScalar(h);
        // peso: busto, braghe e cosce più o meno larghi a parità di altezza
        const bmi = t.weight / Math.pow(t.height / 100, 2);
        const w = clamp(Math.sqrt(bmi / 24), 0.88, 1.15);
        const wl = 1 + (w - 1) * 0.7;
        if (sk.torsoMesh) sk.torsoMesh.scale.set(w, 1, 1 + (w - 1) * 0.85);
        if (sk.shortsMesh) sk.shortsMesh.scale.set(w, 1, w);
        [sk.leftLegPivot, sk.rightLegPivot].forEach(lp => { if (lp && lp.children[0]) lp.children[0].scale.set(wl, 1, wl); });
        [sk.leftArmPivot, sk.rightArmPivot].forEach(ap => {
            if (!ap) return;
            if (ap.userData.baseX == null) ap.userData.baseX = ap.position.x;
            ap.position.x = ap.userData.baseX * (1 + (w - 1) * 0.9);
        });
        // volto (il portiere ha la maschera: niente barba)
        if (sk.headMesh && typeof getFaceMaterialFromFile === 'function') {
            const variant = t.female ? 'female' : (sk.isGoalie || t.facialHair === 'none' ? '' : t.facialHair);
            sk.headMesh.material = getFaceMaterialFromFile(faceFile(t.face, variant));
        }
        // forma della testa: le giocatrici hanno mento, arcate e mascella più delicati
        if (sk.headMesh && sk.headMesh.userData.headRadius) {
            sk.headMesh.geometry = makeHeadGeometry(sk.headMesh.userData.headRadius, t.female);
        }
    }

    // =====================================================================
    // PUBBLICO
    // =====================================================================
    const GUEST_FAN_RATIO = 0.1;
    const FEMALE_RATIO = 0.5;
    const HAIR_COLORS = [
        [0x15100d, 20], [0x2a1d14, 30], [0x4a3020, 18], [0x7a5532, 10],
        [0xc9a464, 9], [0x8e3b1c, 5], [0x8d8d8d, 6], [0xd8d6d0, 2]
    ];
    const HAIR_COLORS_YOUNG = HAIR_COLORS.filter(c => c[0] !== 0x8d8d8d && c[0] !== 0xd8d6d0);

    const matCache = {};
    function colorMat(hex, roughness = 0.8, side) {
        const key = hex + '|' + roughness + '|' + (side || 0);
        if (!matCache[key]) matCache[key] = new THREE.MeshStandardMaterial({ color: hex, roughness, side: side || THREE.FrontSide });
        return matCache[key];
    }
    const geoCache = {};
    function geo(key, make) { return geoCache[key] || (geoCache[key] = make()); }

    // =====================================================================
    // TESTE MODELLATE (giocatori, arbitri, pubblico, cronometristi, staff)
    // Una sfera deformata: naso, arcate sopraccigliari, orbite, zigomi, labbra, mento, mascella
    // che si stringe verso il collo e nuca. Le UV restano quelle della SphereGeometry, quindi la
    // foto del volto (centrata su +X, occhi a ~0.41 dell'altezza, bocca a ~0.66) cade sui rilievi.
    // La griglia è più fitta sul davanti (dove c'è il volto) e rada dietro; la calotta resta
    // sferica in alto così i capelli (sfere poco più grandi) la coprono come prima.
    // Geometria condivisa per raggio, sesso e dettaglio.
    // =====================================================================
    const G = (x, s) => Math.exp(-(x * x) / (2 * s * s));
    const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    const PI = Math.PI;

    function headShape(th, dphi, female) {
        // th = angolo dall'alto (0..π), dphi = angolo dal centro del volto (-π..π)
        let r = 1;
        // naso: dorso che sale dalla radice (fra gli occhi) alla punta, poi rientra sotto le narici
        const up = smooth(0.43 * PI, 0.565 * PI, th);
        const down = th > 0.565 * PI ? G(th - 0.565 * PI, 0.028 * PI) : 1;
        const nose = (0.22 + 0.78 * up) * up * down + (th < 0.565 * PI ? 0.18 * G(th - 0.43 * PI, 0.03 * PI) : 0);
        r += (female ? 0.105 : 0.125) * nose * G(dphi, 0.075 + 0.045 * up);
        // arcata sopraccigliare e orbite
        r += (female ? 0.012 : 0.03) * G(th - 0.365 * PI, 0.035 * PI) * G(dphi, 0.55);
        r -= 0.032 * G(th - 0.415 * PI, 0.032 * PI) * (G(dphi - 0.66, 0.19) + G(dphi + 0.66, 0.19));
        // zigomi
        r += 0.026 * G(th - 0.5 * PI, 0.055 * PI) * (G(dphi - 0.82, 0.28) + G(dphi + 0.82, 0.28));
        // labbra e mento
        r += (female ? 0.034 : 0.026) * G(th - 0.66 * PI, 0.03 * PI) * G(dphi, 0.24);
        r -= 0.018 * G(th - 0.72 * PI, 0.022 * PI) * G(dphi, 0.3);                 // solco sotto il labbro
        r += (female ? 0.035 : 0.06) * G(th - 0.79 * PI, 0.05 * PI) * G(dphi, 0.36);
        return r;
    }

    function headGeometry(radius, female, low) {
        const key = ['head', Math.round(radius * 1000), female ? 'f' : 'm', low ? 'lo' : 'hi'].join('_');
        return geo(key, () => {
            const W = low ? 30 : 44, H = low ? 22 : 32;
            const pos = [], uv = [], index = [];
            const v = new THREE.Vector3();
            for (let iy = 0; iy <= H; iy++) {
                const th = (iy / H) * PI;
                for (let ix = 0; ix <= W; ix++) {
                    // phi denso davanti (phi = π) e rado dietro
                    const s = (ix / W) * 2 - 1;
                    const dphi = PI * (0.52 * s + 0.48 * s * s * s);
                    const phi = PI + dphi;
                    const nx = -Math.cos(phi) * Math.sin(th), ny = Math.cos(th), nz = Math.sin(phi) * Math.sin(th);
                    const r = headShape(th, dphi, female);
                    v.set(nx * r, ny * r, nz * r);
                    // proporzioni: più stretta che profonda, più lunga verso il mento (la calotta resta com'è)
                    v.z *= 0.9;
                    if (ny < 0) v.y *= 1.1;
                    // mascella e collo: sotto gli zigomi la testa si stringe, soprattutto ai lati e dietro
                    const t = smooth(-0.3, -0.95, ny);
                    v.z *= 1 - (female ? 0.2 : 0.14) * t;
                    if (nx < 0) v.x *= 1 - 0.3 * t * -nx;
                    else v.x *= 1 - 0.08 * t * smooth(0.5, 1.4, Math.abs(dphi));     // guance verso la mandibola
                    // nuca un po' sporgente
                    if (nx < 0 && ny > -0.2) v.x *= 1 + 0.07 * -nx * smooth(-0.2, 0.5, ny);
                    pos.push(v.x * radius, v.y * radius, v.z * radius);
                    uv.push(phi / (2 * PI), 1 - iy / H);
                }
            }
            for (let iy = 0; iy < H; iy++) {
                for (let ix = 0; ix < W; ix++) {
                    const a = iy * (W + 1) + ix + 1, b = iy * (W + 1) + ix;
                    const c = (iy + 1) * (W + 1) + ix, d = (iy + 1) * (W + 1) + ix + 1;
                    if (iy !== 0) index.push(a, b, d);
                    if (iy !== H - 1) index.push(b, c, d);
                }
            }
            const g = new THREE.BufferGeometry();
            g.setIndex(index);
            g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
            g.computeVertexNormals();
            // cucitura dietro (prima e ultima colonna coincidono) e poli: normali uguali, niente spigoli
            const n = g.attributes.normal, tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
            for (let iy = 0; iy <= H; iy++) {
                const i0 = iy * (W + 1), i1 = i0 + W;
                tmp.fromBufferAttribute(n, i0).add(tmp2.fromBufferAttribute(n, i1)).normalize();
                n.setXYZ(i0, tmp.x, tmp.y, tmp.z); n.setXYZ(i1, tmp.x, tmp.y, tmp.z);
            }
            [0, H].forEach(iy => {
                const ny = iy === 0 ? 1 : -1;
                for (let ix = 0; ix <= W; ix++) n.setXYZ(iy * (W + 1) + ix, 0, ny, 0);
            });
            g.computeBoundingSphere();
            return g;
        });
    }

    // radius: raggio della vecchia sfera; la testa nuova ha la stessa calotta
    function makeHeadGeometry(radius, female) {
        const low = typeof getActiveQualityPreset === 'function' && getActiveQualityPreset().id === 'low';
        return headGeometry(radius, !!female, low);
    }

    // Sostituisce la geometria sferica di una testa (stesso raggio, stessa foto)
    function reshapeHead(head, female) {
        if (!head || !head.geometry || head.geometry.type !== 'SphereGeometry') return;
        const old = head.geometry;
        head.geometry = makeHeadGeometry(old.parameters.radius, female);
        old.dispose();
    }

    // =====================================================================
    // CORPI MODELLATI (pubblico, cronometristi, staff in panchina)
    // I costruttori dei palazzetti fanno busto, maniche e gambe con cilindri dritti. upgradeBody()
    // ne sostituisce le geometrie con profili anatomici (lathe a sezione ellittica come i giocatori):
    // bacino, vita, petto, spalle arrotondate; braccia con deltoide, bicipite, gomito, avambraccio
    // e polso; gambe con coscia, ginocchio, polpaccio e caviglia; collo e scarpe. Gerarchia,
    // animazioni e materiali (maglie e felpe col logo comprese) restano quelli originali: le UV
    // seguono la stessa convenzione di CylinderGeometry (u = angolo da +Z verso +X, v dal basso).
    // Le geometrie sono condivise fra tutte le persone con le stesse misure.
    // =====================================================================
    function bodyDetail() {
        const low = typeof getActiveQualityPreset === 'function' && getActiveQualityPreset().id === 'low';
        return low ? { seg: 12, sm: 10, low } : { seg: 20, sm: 18, low };
    }

    // profile: [y, raggio in profondità (asse frontale), raggio in larghezza], dal basso verso l'alto.
    // front '+x': profondità lungo X (pubblico, cronometristi); '-z': lungo Z (staff in panchina).
    // closeBottom / closeTop chiudono le estremità con un punto sull'asse.
    function ellipticLathe(profile, seg, smoothN, front, closeBottom, closeTop) {
        let pts = profile;
        if (smoothN > 0) {
            const c = new THREE.CatmullRomCurve3(profile.map(p => new THREE.Vector3(p[1], p[0], p[2])));
            pts = c.getPoints(smoothN).map(p => [p.y, Math.max(0, p.x), Math.max(0, p.z)]);
        }
        if (closeBottom) pts = [[pts[0][0] - 0.004, 0, 0]].concat(pts);
        if (closeTop) pts = pts.concat([[pts[pts.length - 1][0] + 0.004, 0, 0]]);
        const ymin = pts[0][0], ymax = pts[pts.length - 1][0];
        const pos = [], uv = [], idx = [];
        // righe dall'alto verso il basso, come CylinderGeometry
        for (let j = pts.length - 1; j >= 0; j--) {
            const [y, rd, rw] = pts[j];
            for (let i = 0; i <= seg; i++) {
                const u = i / seg, a = u * Math.PI * 2;
                const s = Math.sin(a), c = Math.cos(a);
                if (front === '-z') pos.push(rw * s, y, -rd * c);
                else pos.push(rd * s, y, rw * c);
                uv.push(u, (y - ymin) / (ymax - ymin || 1));
            }
        }
        const rows = pts.length;
        for (let j = 0; j < rows - 1; j++) for (let i = 0; i < seg; i++) {
            const a = j * (seg + 1) + i, b = a + seg + 1, c = b + 1, d = a + 1;
            idx.push(a, b, d, b, c, d);
        }
        const g = new THREE.BufferGeometry();
        g.setIndex(idx);
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        g.computeVertexNormals();
        // cucitura: prima e ultima colonna con la stessa normale
        const n = g.attributes.normal, t1 = new THREE.Vector3(), t2 = new THREE.Vector3();
        for (let j = 0; j < rows; j++) {
            const i0 = j * (seg + 1), i1 = i0 + seg;
            t1.fromBufferAttribute(n, i0).add(t2.fromBufferAttribute(n, i1)).normalize();
            n.setXYZ(i0, t1.x, t1.y, t1.z); n.setXYZ(i1, t1.x, t1.y, t1.z);
        }
        g.computeBoundingSphere();
        return g;
    }

    const mm = v => Math.round(v * 1000);

    // profilo del busto: [t dal basso (0..1), profondità, larghezza] in multipli del raggio medio
    function torsoProfile(female) {
        return female ? [
                [0.0, 0.74, 0.98], [0.16, 0.74, 0.97], [0.36, 0.66, 0.8], [0.52, 0.74, 0.86],
                [0.64, 0.86, 0.92], [0.78, 0.76, 0.98], [0.89, 0.66, 0.94], [0.96, 0.44, 0.58], [1.0, 0.26, 0.3]
            ] : [
                [0.0, 0.72, 0.93], [0.16, 0.73, 0.93], [0.36, 0.71, 0.88], [0.56, 0.78, 0.97],
                [0.72, 0.8, 1.04], [0.84, 0.74, 1.08], [0.92, 0.64, 0.98], [0.97, 0.44, 0.6], [1.0, 0.27, 0.32]
            ];
    }
    // profondità e larghezza (in multipli di R) all'altezza t, interpolate linearmente
    function torsoAt(female, t) {
        const P = torsoProfile(female);
        t = clamp(t, 0, 1);
        for (let i = 1; i < P.length; i++) {
            if (t <= P[i][0]) {
                const a = P[i - 1], b = P[i], f = (t - a[0]) / (b[0] - a[0]);
                return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
            }
        }
        return [P[P.length - 1][1], P[P.length - 1][2]];
    }

    // busto centrato come il cilindro originale (altezza h, raggio medio R)
    function torsoGeometry(rTop, rBottom, h, female, front) {
        const D = bodyDetail();
        const key = ['torso', mm(rTop), mm(rBottom), mm(h), female ? 'f' : 'm', front, D.low ? 'lo' : 'hi'].join('_');
        return geo(key, () => {
            const R = (rTop + rBottom) / 2, y = t => -h / 2 + t * h;
            const P = torsoProfile(female);
            return ellipticLathe(P.map(([t, d, w]) => [y(t), d * R, w * R]), D.seg, D.sm, front, true, true);
        });
    }

    // braccio appeso al perno della spalla (y = 0), lungo len (la manica originale era di len, centrata a -len/2)
    function armGeometry(r, len, front) {
        const D = bodyDetail();
        const key = ['arm', mm(r), mm(len), front, D.low ? 'lo' : 'hi'].join('_');
        return geo(key, () => {
            const k = r / 0.062, L = len / 0.42;
            // [y, raggio] (y verso il basso), la sezione è un filo più stretta in profondità
            const P = [[-0.425, 0.041], [-0.4, 0.043], [-0.33, 0.05], [-0.27, 0.055], [-0.225, 0.049],
                [-0.18, 0.053], [-0.11, 0.06], [-0.04, 0.067], [0.0, 0.066], [0.025, 0.052], [0.04, 0.03]];
            return ellipticLathe(P.map(([y, rr]) => [y * L, rr * k * 0.92, rr * k]), Math.max(10, D.seg - 6), D.sm, front, true, true);
        });
    }

    // gamba verticale intera (in piedi), centrata come il cilindro: caviglia in basso, anca in alto
    function standingLegGeometry(r, h, front) {
        const D = bodyDetail();
        const key = ['legS', mm(r), mm(h), front, D.low ? 'lo' : 'hi'].join('_');
        return geo(key, () => {
            const k = r / 0.085;
            const P = [[0.0, 0.043], [0.06, 0.047], [0.2, 0.066], [0.3, 0.064], [0.44, 0.055], [0.5, 0.058],
                [0.58, 0.072], [0.74, 0.083], [0.9, 0.09], [1.0, 0.088]];
            return ellipticLathe(P.map(([t, rr]) => [-h / 2 + t * h, rr * k * 0.96, rr * k]), Math.max(10, D.seg - 6), D.sm, front, true, true);
        });
    }

    // coscia (seduti): il cilindro originale è ruotato di 90° su Z, quindi -Y locale = ginocchio (avanti)
    function thighGeometry(r, h, front) {
        const D = bodyDetail();
        const key = ['thigh', mm(r), mm(h), front, D.low ? 'lo' : 'hi'].join('_');
        return geo(key, () => {
            const k = r / 0.085;
            const P = [[0.0, 0.062], [0.08, 0.066], [0.3, 0.078], [0.65, 0.088], [0.9, 0.092], [1.0, 0.088]];
            return ellipticLathe(P.map(([t, rr]) => [-h / 2 + t * h, rr * k, rr * k * 0.95]), Math.max(10, D.seg - 6), D.sm, front, true, true);
        });
    }

    // polpaccio (seduti): caviglia in basso, ginocchio in alto
    function calfGeometry(r, h, front) {
        const D = bodyDetail();
        const key = ['calf', mm(r), mm(h), front, D.low ? 'lo' : 'hi'].join('_');
        return geo(key, () => {
            const k = r / 0.075;
            const P = [[0.0, 0.042], [0.08, 0.045], [0.35, 0.062], [0.62, 0.07], [0.85, 0.064], [0.94, 0.066], [1.0, 0.07]];
            return ellipticLathe(P.map(([t, rr]) => [-h / 2 + t * h, rr * k, rr * k * 0.95]), Math.max(10, D.seg - 6), D.sm, front, true, true);
        });
    }

    // scarpa: tomaia arrotondata e suola, punta verso l'asse frontale
    function shoeGeometry(front) {
        const D = bodyDetail();
        return geo('shoe_' + front + (D.low ? '_lo' : '_hi'), () => {
            const parts = [];
            const upper = new THREE.SphereGeometry(1, D.low ? 10 : 16, D.low ? 6 : 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
            upper.scale(0.13, 0.075, 0.056);
            upper.translate(0.035, 0.0, 0);
            const sole = new THREE.CylinderGeometry(1, 1, 0.022, D.low ? 10 : 16);
            sole.scale(0.135, 1, 0.058);
            sole.translate(0.035, -0.006, 0);
            parts.push(upper, sole);
            const g = mergeParts(parts);
            if (front === '-z') g.rotateY(Math.PI / 2);
            return g;
        });
    }

    function neckGeometry(r) {
        const D = bodyDetail();
        return geo('neck_' + mm(r) + (D.low ? '_lo' : '_hi'), () => {
            const g = new THREE.CylinderGeometry(r * 0.92, r, 0.11, D.low ? 8 : 14, 1, true);
            return g;
        });
    }

    const isCyl = m => m && m.isMesh && m.geometry && m.geometry.type === 'CylinderGeometry';
    const SHOE_COLORS = [[0x18181b, 45], [0x3f2a1c, 15], [0xf4f4f5, 22], [0x1e3a8a, 8], [0x6b7280, 10]];

    // root: radice della persona; bodyPivot: gruppo del busto; arms: gruppi delle braccia
    // opts: { female, front: '+x' | '-z', skinMat, shoes: true/false (lo staff ha già le scarpe), r }
    function upgradeBody(root, bodyPivot, arms, opts = {}) {
        if (!root || !bodyPivot || root.userData.bodyUpgraded) return;
        root.userData.bodyUpgraded = true;
        const front = opts.front || '+x';
        const swap = (mesh, g) => { const old = mesh.geometry; mesh.geometry = g; if (old.type === 'CylinderGeometry') old.dispose(); };

        // busto
        const torso = bodyPivot.children.find(isCyl);
        if (torso) {
            const p = torso.geometry.parameters;
            const R = (p.radiusTop + p.radiusBottom) / 2;
            const tOf = y => (y - torso.position.y) / p.height + 0.5;
            // fasce (cilindri bassi attorno al busto) e colletti (scatole sul petto) seguono la nuova sagoma
            bodyPivot.children.forEach(c => {
                if (c === torso || !c.isMesh) return;
                const [d, w] = torsoAt(!!opts.female, tOf(c.position.y));
                if (isCyl(c) && c.geometry.parameters.height < 0.2 && c.geometry.parameters.radiusTop >= R * 0.95) {
                    const rb = c.geometry.parameters.radiusTop, k = 1.03;
                    if (front === '-z') c.scale.set(w * R * k / rb, 1, d * R * k / rb);
                    else c.scale.set(d * R * k / rb, 1, w * R * k / rb);
                } else if (c.geometry.type === 'BoxGeometry' && front === '+x' && c.position.x > 0.05) {
                    c.position.x = d * R - c.geometry.parameters.width / 2 + 0.012;
                }
            });
            torso.userData.torsoShape = { R, h: p.height, female: !!opts.female, front };
            swap(torso, torsoGeometry(p.radiusTop, p.radiusBottom, p.height, !!opts.female, front));
            // collo, del colore della pelle, fra il busto e la testa
            if (opts.skinMat && !bodyDetail().low) {
                const neck = new THREE.Mesh(neckGeometry(0.052 * (p.radiusTop / 0.2)), opts.skinMat);
                neck.position.set(0, torso.position.y + p.height / 2 + 0.03, 0);
                bodyPivot.add(neck);
            }
        }

        // braccia: la manica diventa un braccio modellato, la mano scende al polso
        (arms || []).forEach(a => {
            const sleeve = a.children.find(isCyl);
            if (!sleeve) return;
            const p = sleeve.geometry.parameters;
            const len = p.height;
            swap(sleeve, armGeometry(p.radiusTop, len, front));
            sleeve.position.y = 0;
        });

        // gambe
        const r = opts.random || Math.random;
        const legs = root.children.filter(isCyl);
        const shoeSpots = [];
        legs.forEach(leg => {
            const p = leg.geometry.parameters;
            const horizontal = Math.abs(Math.abs(leg.rotation.z) - Math.PI / 2) < 0.3;
            if (horizontal) {
                swap(leg, thighGeometry(Math.max(p.radiusTop, p.radiusBottom), p.height, front));
            } else if (p.height >= 0.6) {
                swap(leg, standingLegGeometry(Math.max(p.radiusTop, p.radiusBottom), p.height, front));
                shoeSpots.push([leg.position.x, leg.position.y - p.height / 2, leg.position.z]);
            } else {
                swap(leg, calfGeometry(Math.max(p.radiusTop, p.radiusBottom), p.height, front));
                shoeSpots.push([leg.position.x, leg.position.y - p.height / 2, leg.position.z]);
            }
        });
        if (opts.shoes !== false && shoeSpots.length) {
            // le due scarpe in un solo mesh (una draw call), geometria condivisa fra chi ha le stesse misure
            const key = 'shoes_' + front + '_' + shoeSpots.map(p => p.map(mm).join(',')).join(';') + (bodyDetail().low ? '_lo' : '_hi');
            const g = geo(key, () => mergeParts(shoeSpots.map(([x, y, z]) => {
                const one = shoeGeometry(front).clone();
                one.translate(x, y + 0.012, z);
                return one;
            })));
            root.add(new THREE.Mesh(g, colorMat(pickWeighted(SHOE_COLORS, r()), 0.55)));
        }
    }

    // =====================================================================
    // MANI CON LE DITA (pubblico, cronometristi, staff in panchina, arbitri)
    // Palmo, quattro dita in due falangi e pollice sono fusi in una sola geometria condivisa:
    // una mano resta un solo mesh (stesse draw call della vecchia sfera). Con la grafica Bassa
    // le dita sono di un pezzo e con meno poligoni.
    // Sistema locale: dita verso -Y, pollice in avanti (+X), dorso verso l'esterno (+Z * side),
    // l'origine è il centro della vecchia sfera (0.44 sotto la spalla).
    // =====================================================================
    function mergeParts(parts) {
        let nv = 0, ni = 0;
        parts.forEach(p => { nv += p.attributes.position.count; ni += p.index.count; });
        const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = new Uint16Array(ni);
        let vo = 0, io = 0;
        parts.forEach(p => {
            pos.set(p.attributes.position.array, vo * 3);
            nor.set(p.attributes.normal.array, vo * 3);
            const src = p.index.array;
            for (let i = 0; i < src.length; i++) idx[io + i] = src[i] + vo;
            vo += p.attributes.position.count;
            io += src.length;
            p.dispose();
        });
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        g.setIndex(new THREE.BufferAttribute(idx, 1));
        g.computeBoundingSphere();
        return g;
    }

    // pose: dita piegate (prima e seconda falange) e pollice
    const HAND_POSES = {
        relaxed: { c1: 0.22, c2: 0.38, thumbFwd: 0.55, thumbIn: 0.35 },
        fist:    { c1: 1.35, c2: 1.55, thumbFwd: 1.05, thumbIn: 1.0 },    // impugna l'asta della bandierina
        typing:  { c1: 0.45, c2: 0.55, thumbFwd: 0.7,  thumbIn: 0.5 }
    };
    // index, medio, anulare, mignolo: posizione lungo X, lunghezza, raggio
    const FINGERS = [[0.027, 0.05, 0.0095], [0.009, 0.056, 0.0098], [-0.009, 0.052, 0.0094], [-0.026, 0.041, 0.0086]];

    function handGeometry(side, pose, front, low) {
        const key = ['hand', side, pose, front, low ? 'lo' : 'hi'].join('_');
        return geo(key, () => {
            const P = HAND_POSES[pose] || HAND_POSES.relaxed;
            const parts = [];
            const M = new THREE.Matrix4(), T = new THREE.Matrix4();
            const capsule = (r, len) => low
                ? new THREE.CapsuleGeometry(r, len, 1, 4)
                : new THREE.CapsuleGeometry(r, len, 2, 6);
            // segmento che parte da "base" e scende lungo -Y ruotato di rx (piega verso il palmo) e rz
            const segment = (r, len, base, rx, rz) => {
                const g = capsule(r, len);
                g.translate(0, -len / 2, 0);
                M.makeTranslation(base.x, base.y, base.z)
                    .multiply(T.makeRotationZ(rz))
                    .multiply(new THREE.Matrix4().makeRotationX(rx));
                g.applyMatrix4(M);
                parts.push(g);
                // punta del segmento, per attaccarci il successivo
                return new THREE.Vector3(0, -len, 0).applyMatrix4(M);
            };
            const curl = c => side * c;     // il palmo guarda verso il corpo (-Z * side)

            // palmo: ellissoide schiacciato, appena più largo verso le nocche
            const palm = low ? new THREE.SphereGeometry(1, 8, 6) : new THREE.SphereGeometry(1, 12, 9);
            palm.scale(0.042, 0.047, 0.019);
            palm.translate(0, -0.015, -side * 0.002);
            parts.push(palm);

            FINGERS.forEach(([fx, len, r]) => {
                const base = new THREE.Vector3(fx, -0.052, -side * 0.002);
                const spread = fx * 1.4;                 // le dita si aprono leggermente a ventaglio
                if (low) {
                    segment(r, len * 0.95, base, curl((P.c1 + P.c2) * 0.45), spread);
                } else {
                    const tip = segment(r, len * 0.55, base, curl(P.c1), spread);
                    segment(r * 0.92, len * 0.45, tip, curl(P.c1 + P.c2), spread);
                }
            });

            // pollice: parte dal lato anteriore del palmo, verso il basso-avanti e un po' verso il palmo
            const tBase = new THREE.Vector3(0.033, -0.005, -side * 0.009);
            if (low) {
                segment(0.0108, 0.042, tBase, curl(P.thumbIn), P.thumbFwd);
            } else {
                const tTip = segment(0.0112, 0.024, tBase, curl(P.thumbIn * 0.6), P.thumbFwd);
                segment(0.0102, 0.022, tTip, curl(P.thumbIn), P.thumbFwd * 0.55);
            }

            const g = mergeParts(parts);
            // personaggi che guardano verso -Z (staff in panchina, arbitri): +X -> -Z, +Z -> +X
            if (front === '-z') g.rotateY(Math.PI / 2);
            return g;
        });
    }

    // side: +1 / -1 = lato del corpo (verso +Z per chi guarda +X, verso +X per chi guarda -Z)
    // pose: 'relaxed' | 'fist' | 'typing'; front: '+x' (pubblico, cronometristi) | '-z' (staff, arbitri)
    function makeHand(mat, side, pose = 'relaxed', front = '+x') {
        const low = typeof getActiveQualityPreset === 'function' && getActiveQualityPreset().id === 'low';
        const m = new THREE.Mesh(handGeometry(side < 0 ? -1 : 1, pose, front, low), mat);
        m.userData.isHand = true;
        return m;
    }

    // Sostituisce la sfera della mano di un braccio con una mano con le dita (stessa posizione e materiale)
    function replaceSphereHand(armPivot, side, pose, front) {
        const old = armPivot.children.find(c => c.isMesh && (c.userData.isHand || (c.geometry && c.geometry.type === 'SphereGeometry')));
        if (!old) return null;
        const hand = makeHand(old.material, side, pose, front);
        hand.position.copy(old.position);
        hand.castShadow = old.castShadow;
        hand.receiveShadow = old.receiveShadow;
        armPivot.add(hand);
        armPivot.remove(old);
        if (!old.userData.isHand) old.geometry.dispose();   // le geometrie delle mani nuove sono condivise
        return hand;
    }

    // ---------- materiali dei tifosi di una squadra (maglia, felpa, bandierina), in cache per club
    const gearCache = {};
    const hexStr = v => (typeof v === 'number' ? '#' + v.toString(16).padStart(6, '0') : v);
    function lum(hex) {
        const n = parseInt(String(hex).replace('#', ''), 16);
        return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    }
    function logoImage(clubId) {
        const file = TEAM_DATA.logos && TEAM_DATA.logos[clubId];
        if (!file) return null;
        const img = new Image();
        img.src = 'assets/logos/' + file;
        return img;
    }
    // canvas -> texture; il logo viene disegnato appena l'immagine è pronta
    function canvasTexture(w, h, drawBase, logo, logoBoxes) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        drawBase(ctx, w, h);
        const tex = new THREE.CanvasTexture(c);
        tex.anisotropy = 4;
        const drawLogo = () => {
            logoBoxes.forEach(([cx, cy, size]) => {
                const k = Math.min(size / logo.naturalWidth, size / logo.naturalHeight);
                const lw = logo.naturalWidth * k, lh = logo.naturalHeight * k;
                ctx.drawImage(logo, cx - lw / 2, cy - lh / 2, lw, lh);
            });
            tex.needsUpdate = true;
        };
        if (logo && logoBoxes && logoBoxes.length) {
            if (logo.complete && logo.naturalWidth) drawLogo();
            else logo.addEventListener('load', drawLogo, { once: true });
        }
        return tex;
    }

    function fanGear(clubId) {
        if (gearCache[clubId]) return gearCache[clubId];
        const theme = (TEAM_DATA.rosterThemes && TEAM_DATA.rosterThemes[clubId]) || { primary: '#1e293b', secondary: '#f8fafc' };
        const club = (window.CLUB_ROSTERS && CLUB_ROSTERS[clubId]) || TEAM_DATA.rosters[clubId] || {};
        let primary = hexStr(theme.primary), secondary = hexStr(theme.secondary);
        // se i due colori sono quasi uguali il secondo diventa bianco o nero
        if (Math.abs(lum(primary) - lum(secondary)) < 0.18) secondary = lum(primary) > 0.5 ? '#111111' : '#ffffff';
        const ink = lum(primary) > 0.55 ? '#111111' : '#ffffff';
        const logo = logoImage(clubId);
        // Sul cilindro del busto u = 0.25 è il davanti (+X locale), u = 0.75 la schiena.
        const nums = [];
        ((club.lines && club.lines[0]) || []).forEach(p => p && p.num && nums.push(String(p.num)));
        if (!nums.length) nums.push('10');
        const jerseys = nums.slice(0, 4).map(num => new THREE.MeshStandardMaterial({
            roughness: 0.62,
            map: canvasTexture(512, 256, (ctx, W, H) => {
                ctx.fillStyle = primary; ctx.fillRect(0, 0, W, H);
                ctx.fillStyle = secondary; ctx.fillRect(0, 0, W, 34);             // spalle
                ctx.fillRect(0, 196, W, 14); ctx.fillRect(0, 220, W, 8);          // righe in fondo
                ctx.font = '900 112px Arial, sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.lineWidth = 8; ctx.strokeStyle = ink === '#ffffff' ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.7)';
                ctx.strokeText(num, W * 0.75, 118);
                ctx.fillStyle = secondary; ctx.fillText(num, W * 0.75, 118);       // numero sulla schiena
            }, logo, [[128, 110, 84]])
        }));
        const hoodies = [primary, secondary].map(col => {
            const dark = lum(col) < 0.5;
            return {
                body: new THREE.MeshStandardMaterial({
                    roughness: 0.88,
                    map: canvasTexture(512, 256, (ctx, W, H) => {
                        ctx.fillStyle = col; ctx.fillRect(0, 0, W, H);
                        ctx.fillStyle = dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.12)';
                        ctx.fillRect(58, 168, 140, 58);                                // tascone
                        ctx.fillStyle = dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.16)';
                        ctx.fillRect(0, 232, W, 24);                                   // polsino in fondo
                    }, logo, [[128, 96, 120]])
                }),
                plain: colorMat(parseInt(col.slice(1), 16), 0.88),
                string: colorMat(dark ? 0xf1f5f9 : 0x1f2937, 0.7)
            };
        });
        const flagMat = new THREE.MeshStandardMaterial({
            roughness: 0.85, side: THREE.DoubleSide,
            map: canvasTexture(256, 160, (ctx, W, H) => {
                ctx.fillStyle = primary; ctx.fillRect(0, 0, W, H / 2);
                ctx.fillStyle = secondary; ctx.fillRect(0, H / 2, W, H / 2);
            }, logo, [[128, 80, 112]])
        });
        gearCache[clubId] = { primary, secondary, jerseys, jerseySleeve: colorMat(parseInt(primary.slice(1), 16), 0.62), hoodies, flagMat };
        return gearCache[clubId];
    }

    // ---------- capelli
    function addLongHair(headGroup, hairMat, style, r) {
        const R = 0.15;
        // fronte libera: davanti = +X (θ = π/2 sul cilindro); le ciocche laterali incorniciano il viso
        const gap = 0.78, start = Math.PI / 2 + gap, len = Math.PI * 2 - gap * 2;
        if (style === 'ponytail') {
            const tail = new THREE.Mesh(geo('pony', () => new THREE.SphereGeometry(0.07, 10, 8)), hairMat);
            tail.scale.set(0.75, 1.9, 0.75);
            tail.position.set(-0.17, -0.04, 0);
            tail.rotation.z = -0.35;
            const tie = new THREE.Mesh(geo('ponytie', () => new THREE.SphereGeometry(0.035, 8, 6)), hairMat);
            tie.position.set(-0.145, 0.06, 0);
            headGroup.add(tail, tie);
            return;
        }
        const long = style === 'long';
        const h = long ? 0.34 + r * 0.08 : 0.2;
        const key = 'hair_' + style + '_' + Math.round(h * 100);
        const g = geo(key, () => new THREE.CylinderGeometry(R, R + (long ? 0.03 : 0.012), h, 14, 1, true, start, len));
        const m = new THREE.Mesh(g, colorMat(hairMat.color.getHex(), 0.8, THREE.DoubleSide));
        m.position.set(-0.012, 0.03 - h / 2, 0);
        headGroup.add(m);
    }

    function styleHair(head, hair, headGroup, female, adult, r) {
        const palette = adult ? HAIR_COLORS : HAIR_COLORS_YOUNG;
        let color = pickWeighted(female ? palette.filter(c => c[0] !== 0xd8d6d0) : palette, r());
        const hairMat = colorMat(color, 0.8);
        if (!hair) return;
        if (!female && adult && r() < 0.08) {
            // calvo: niente calotta; a volte resta la corona di capelli su nuca e tempie
            hair.visible = false;
            if (r() < 0.6) {
                const fringe = new THREE.Mesh(geo('fringe', () => new THREE.SphereGeometry(0.149, 14, 5, -1.9, 3.8, Math.PI * 0.44, Math.PI * 0.17)),
                    colorMat(r() < 0.5 ? 0x8d8d8d : color, 0.85));
                headGroup.add(fringe);
            }
            return;
        }
        hair.material = hairMat;
        if (female) addLongHair(headGroup, hairMat, pickWeighted([['long', 55], ['ponytail', 15], ['bob', 30]], r()), r());
    }

    // ---------- abbigliamento
    function dressFan(bodyPivot, torso, arms, clubId, kind, r) {
        const gear = fanGear(clubId);
        if (kind === 'jersey') {
            torso.material = gear.jerseys[Math.floor(r() * gear.jerseys.length)];
            arms.forEach(a => { const sl = a.children.find(c => c.isMesh); if (sl) sl.material = gear.jerseySleeve; });
        } else if (kind === 'hoodie') {
            const hd = gear.hoodies[r() < 0.72 ? 0 : 1];
            torso.material = hd.body;
            arms.forEach(a => { const sl = a.children.find(c => c.isMesh); if (sl) sl.material = hd.plain; });
            // cappuccio sulla schiena e cordini sul petto
            const hood = new THREE.Mesh(geo('hood', () => new THREE.SphereGeometry(0.12, 12, 8)), hd.plain);
            hood.scale.set(0.62, 0.55, 1.2);
            hood.position.set(-0.13, 0.55, 0);
            bodyPivot.add(hood);
            [-0.045, 0.045].forEach(z => {
                const s = new THREE.Mesh(geo('cord', () => new THREE.CylinderGeometry(0.006, 0.006, 0.14, 5)), hd.string);
                s.position.set(0.165, 0.45, z);
                bodyPivot.add(s);
            });
        }
    }

    function addFlag(arm, clubId) {
        const gear = fanGear(clubId);
        const pivot = new THREE.Group();
        pivot.position.set(0, -0.44, 0);                       // nella mano
        const stick = new THREE.Mesh(geo('flagstick', () => new THREE.CylinderGeometry(0.008, 0.008, 0.62, 5)), colorMat(0x3f3a35, 0.6));
        stick.position.y = 0.22;
        const cloth = new THREE.Mesh(geo('flagcloth', () => new THREE.PlaneGeometry(0.36, 0.23, 4, 1)), gear.flagMat);
        cloth.rotation.y = Math.PI / 2;                        // rivolta verso la pista (+X locale)
        cloth.position.set(0, 0.41, 0.185);
        pivot.add(stick, cloth);
        pivot.userData.cloth = cloth;
        arm.add(pivot);
        // la mano destra stringe l'asta: il pugno segue la bandierina (che resta verticale mentre il braccio
        // oscilla), girato di 90° perché l'asta attraversi le dita chiuse, pollice in su
        const old = arm.children.find(c => c.isMesh && (c.userData.isHand || (c.geometry && c.geometry.type === 'SphereGeometry')));
        if (old) {
            const fist = makeHand(old.material, 1, 'fist', '+x');
            fist.rotation.z = Math.PI / 2;
            fist.position.set(-0.058, 0, 0.02);
            pivot.add(fist);
            arm.remove(old);
            if (!old.userData.isHand) old.geometry.dispose();
        }
        return pivot;
    }

    // Chiamata per ogni tifoso subito dopo maybeMakeCrowdChild(): headGroup è figlio di bodyPivot,
    // la testa è il primo figlio di headGroup e la calotta dei capelli il secondo; il busto è il primo
    // mesh di bodyPivot e le braccia sono i gruppi di bodyPivot (quello con z > 0 è il destro).
    // opts (facoltativo): { female: true/false (forza il sesso), gear: false (niente maglia/felpa/bandierina) }
    function decorateCrowdMember(root, headGroup, isChild, opts = {}) {
        const bodyPivot = headGroup && headGroup.parent;
        if (!bodyPivot || typeof matchConfig === 'undefined') return;
        const r = Math.random;
        const head = headGroup.children[0], hair = headGroup.children[1];
        const torso = bodyPivot.children.find(c => c.isMesh);
        const arms = bodyPivot.children.filter(c => c.isGroup && c !== headGroup);
        const rightArm = arms.find(a => a.position.z > 0);
        const adult = !isChild;
        const female = opts.female != null ? !!opts.female : r() < FEMALE_RATIO;
        root.userData.female = female;
        arms.forEach(a => replaceSphereHand(a, a.position.z > 0 ? 1 : -1, 'relaxed', '+x'));
        // corpo modellato al posto dei cilindri (collo del colore delle mani)
        const handMesh = arms.length && arms[0].children.find(c => c.userData && c.userData.isHand);
        upgradeBody(root, bodyPivot, arms, { female, front: '+x', skinMat: handMesh ? handMesh.material : null, random: r });

        // volto
        if (head && typeof getFaceMaterialFromFile === 'function') {
            let file;
            if (female) file = faceFile(FEMALE_FACES[Math.floor(r() * FEMALE_FACES.length)], 'female');
            else {
                const n = 1 + Math.floor(r() * FACE_COUNT);
                file = faceFile(n, adult && r() < 0.22 ? FACIAL_HAIR[Math.floor(r() * FACIAL_HAIR.length)] : '');
            }
            head.material = getFaceMaterialFromFile(file);
        }
        reshapeHead(head, female);
        styleHair(head, hair, headGroup, female, adult, r);

        // corporatura: le donne un filo più minute
        if (female && torso) {
            torso.scale.set(0.95, 0.98, 0.95);   // la sagoma femminile è già nel profilo del busto
            arms.forEach(a => { a.position.z *= 0.92; });
        }

        if (opts.gear === false) return;
        // tifo: 10% ospiti, il resto casa
        const guest = r() < GUEST_FAN_RATIO;
        const clubId = guest ? matchConfig.guestClub : matchConfig.homeClub;
        if (!clubId || !TEAM_DATA.rosterThemes[clubId]) return;
        root.userData.fanOf = guest ? 'guest' : 'home';
        const gearChance = guest ? 0.75 : 0.42;   // gli ospiti in trasferta si fanno riconoscere
        const g = r();
        if (torso) {
            if (g < gearChance * 0.5) dressFan(bodyPivot, torso, arms, clubId, 'jersey', r);
            else if (g < gearChance) dressFan(bodyPivot, torso, arms, clubId, 'hoodie', r);
        }
        if (rightArm && r() < (guest ? 0.3 : 0.15)) root.userData.flagPivot = addFlag(rightArm, clubId);
    }

    // ---------- stemma della squadra sul petto (giacche dello staff)
    const crestTexCache = {};
    function crestTexture(clubId) {
        if (crestTexCache[clubId] !== undefined) return crestTexCache[clubId];
        const file = TEAM_DATA.logos && TEAM_DATA.logos[clubId];
        const tex = file ? new THREE.TextureLoader().load('assets/logos/' + file) : null;
        if (tex) tex.anisotropy = 4;
        return (crestTexCache[clubId] = tex);
    }

    // Stemma cucito sul lato sinistro del petto, appoggiato sulla sagoma del busto modellato
    // (serve upgradeBody prima). opts: { t: altezza sul busto 0..1, size }
    function addChestCrest(bodyPivot, clubId, opts = {}) {
        const torso = bodyPivot && bodyPivot.children.find(c => c.isMesh && c.userData.torsoShape);
        const tex = clubId && crestTexture(clubId);
        if (!torso || !tex) return null;
        const { R, h, female, front } = torso.userData.torsoShape;
        const t = opts.t != null ? opts.t : 0.6, size = opts.size || 0.095;
        const [d, w] = torsoAt(female, t);
        const D = d * R, Wd = w * R;
        // posizione sul petto: a metà fra lo sterno e il fianco, sull'ellisse della sezione
        const off = Wd * 0.42;
        const depth = D * Math.sqrt(Math.max(0, 1 - (off / Wd) * (off / Wd))) + 0.004;
        // normale dell'ellisse in quel punto: lo stemma segue la curvatura
        const yaw = Math.atan2(off / (Wd * Wd), depth / (D * D));
        const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.35, roughness: 0.6 });
        const crest = new THREE.Mesh(geo('crestPlane', () => new THREE.PlaneGeometry(1, 1)), mat);
        crest.scale.set(size, size, 1);
        const y = torso.position.y + (t - 0.5) * h;
        // chi guarda +X ha la sinistra verso -Z; chi guarda -Z ha la sinistra verso -X
        if (front === '-z') {
            crest.position.set(-off, y, -depth);
            crest.rotation.set(-0.12, Math.PI + yaw, 0, 'YXZ');
        } else {
            crest.position.set(depth, y, -off);
            crest.rotation.set(-0.12, Math.PI / 2 - yaw, 0, 'YXZ');
        }
        bodyPivot.add(crest);
        return crest;
    }

    // ---------- persona in piedi (bar, operatori, gente nei corridoi): stessa costruzione del pubblico
    // dei palazzetti, poi mani, volto, capelli e corpo modellati. Guarda verso +X locale.
    // opts: { female, top: colore maglia, pants, apron: colore grembiule, cap: colore cappellino, skin }
    function makePerson(opts = {}) {
        const root = new THREE.Group();
        const top = new THREE.MeshStandardMaterial({ color: opts.top != null ? opts.top : 0x334155, roughness: 0.7 });
        const pantsM = colorMat(opts.pants != null ? opts.pants : 0x1e293b, 0.8);
        const skinM = colorMat(opts.skin != null ? opts.skin : 0xd9a98f, 0.6);
        const hairM = colorMat(0x2a1d14, 0.8);
        [-0.11, 0.11].forEach(lz => {
            const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.82, 7), pantsM);
            lg.position.set(0, 0.41, lz);
            root.add(lg);
        });
        const bodyPivot = new THREE.Group();
        bodyPivot.position.set(0, 0.82, 0);
        root.add(bodyPivot);
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.55, 10), top);
        torso.position.y = 0.27;
        bodyPivot.add(torso);
        const headGroup = new THREE.Group();
        headGroup.position.y = 0.69;
        const faceMat = typeof getRandomPhotoFaceMaterial === 'function' ? getRandomPhotoFaceMaterial() : skinM;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), faceMat);
        const hair = new THREE.Mesh(new THREE.SphereGeometry(0.148, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM);
        hair.position.x = -0.015;
        headGroup.add(head, hair);
        bodyPivot.add(headGroup);
        const arm = sz => {
            const ap = new THREE.Group();
            ap.position.set(0, 0.48, sz);
            const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.42, 7), top);
            sl.position.y = -0.21;
            const hd = new THREE.Mesh(new THREE.SphereGeometry(0.05, 7, 7), skinM);
            hd.position.y = -0.44;
            ap.add(sl, hd);
            bodyPivot.add(ap);
            return ap;
        };
        const leftArmPivot = arm(-0.24), rightArmPivot = arm(0.24);
        decorateCrowdMember(root, headGroup, false, { female: opts.female, gear: false });
        // grembiule: telo sul davanti di busto e cosce, con il laccio in vita
        if (opts.apron != null) {
            const ts = torso.userData.torsoShape;
            const R = ts ? ts.R : 0.195;
            const [d] = ts ? torsoAt(ts.female, 0.4) : [0.75];
            const apronM = colorMat(opts.apron, 0.85, THREE.DoubleSide);
            // spicchio di cilindro aperto, centrato sul davanti (+X)
            const apron = new THREE.Mesh(geo('apron', () => new THREE.CylinderGeometry(1, 1.08, 1, 14, 1, true, Math.PI / 2 - 0.9, 1.8)), apronM);
            apron.scale.set(d * R + 0.014, 0.6, R * 0.98);
            apron.position.set(0, 0.04, 0);
            bodyPivot.add(apron);
            const tie = new THREE.Mesh(geo('apronTie', () => new THREE.TorusGeometry(1, 0.012, 4, 24)), apronM);
            tie.scale.set(d * R + 0.016, R * 0.96, 1);
            tie.rotation.x = Math.PI / 2;
            tie.position.y = 0.2;
            bodyPivot.add(tie);
        }
        if (opts.cap != null) {
            const capM = colorMat(opts.cap, 0.7);
            const crown = new THREE.Mesh(geo('capCrown', () => new THREE.SphereGeometry(0.155, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42)), capM);
            crown.position.set(-0.01, 0.03, 0);
            const visor = new THREE.Mesh(geo('capVisor', () => new THREE.CylinderGeometry(0.11, 0.11, 0.012, 14, 1, false, 0, Math.PI)), capM);
            visor.scale.set(1, 1, 0.75);
            visor.position.set(0.1, 0.035, 0);
            visor.rotation.z = -0.12;
            headGroup.add(crown, visor);
        }
        return { mesh: root, bodyPivot, headGroup, leftArmPivot, rightArmPivot, baseY: 0, phase: Math.random() * Math.PI * 2, standing: true };
    }

    // Animazione della bandierina: il braccio la tiene alta e l'asta resta quasi verticale
    function updateCrowdFlag(fan, time, cheering) {
        const fp = fan.mesh.userData.flagPivot;
        if (!fp || fan.isTimekeeper) return;
        const arm = fan.rightArmPivot;
        if (!cheering) {
            arm.rotation.z = 0.95 + Math.sin(time * 2.1 + fan.phase) * 0.18;
            arm.rotation.x = -0.15;
        }
        const sway = Math.sin(time * (cheering ? 9 : 2.4) + fan.phase * 1.7);
        fp.rotation.z = -arm.rotation.z + sway * (cheering ? 0.5 : 0.18);
        fp.userData.cloth.rotation.x = sway * 0.25;
    }

    window.HIL_PEOPLE = { playerTraits, traitsOf, findPlayerInfo, applySkaterLook, decorateCrowdMember, updateCrowdFlag, makeHand, makeHeadGeometry, upgradeBody, addChestCrest, makePerson };
})();
