// --- src/game/People.js ---
// Varietà delle persone in palazzetto:
//  - pubblico: uomini e donne, capelli di colori e tagli diversi, qualche calvo, barba/baffi;
//    il 10% tifa per gli ospiti, il resto per la squadra di casa; alcuni indossano la maglia o la
//    felpa (colore + logo) della squadra, altri sventolano una bandierina con i suoi colori;
//  - giocatori: altezza e peso diversi, qualcuno con barba e/o baffi, nazionalità.
// Script classico: usa a runtime THREE, TEAM_DATA, CLUB_ROSTERS e matchConfig dello script principale
// di index.html, e le teste modellate di src/game/Heads.js (window.HIL_HEADS).
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

    // ---------- barba e baffi (le teste sono in src/game/Heads.js)
    const FACIAL_HAIR = ['beard', 'mustache', 'full'];
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
        // volto: variante della testa modellata (pelle, forma), colore di capelli e sopracciglia;
        // chi non ha barba né baffi a volte ha la barba di qualche giorno
        const fi = r();
        const head = window.HIL_HEADS ? window.HIL_HEADS.pick(female ? 'f' : 'm', 'young', fi) : 0;
        const hair = pickWeighted(HAIR_COLORS_YOUNG, r());
        const stubble = !female && r() < 0.3;
        return { nat: String(info.nat || country).toUpperCase(), female, height, weight, facialHair, head, hair, stubble };
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
        if (sk.headMesh) {
            const facial = sk.isGoalie ? 'none' : t.facialHair !== 'none' ? t.facialHair : (t.stubble ? 'stubble' : 'none');
            applyHead(sk.headMesh, { variant: t.head, facial, hair: t.hair });
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
    // Teste MakeHuman (src/game/Heads.js): una variante per sesso, età, etnia e forma del volto,
    // con la sua pelle; barba, baffi e sopracciglia tinti col colore dei capelli. Stesso sistema di
    // riferimento della vecchia sfera (volto verso +X, calotta a y = +raggio), quindi chi costruisce
    // i personaggi crea una testa qualsiasi del raggio voluto e poi chiama applyHead().
    // =====================================================================
    const HEADS = () => window.HIL_HEADS;

    // pubblico: dettaglio ridotto tranne che con la grafica al massimo; tutti ridotti con la grafica bassa
    function headLod(crowd) {
        const id = typeof getActiveQualityPreset === 'function' ? getActiveQualityPreset().id : 'medium';
        if (id === 'low') return 'lo';
        return crowd && id !== 'high' ? 'lo' : 'hi';
    }

    function headRadius(head) {
        if (!head.userData.headRadius) {
            const g = head.geometry;
            head.userData.headRadius = (g && g.userData.hilHead && g.userData.hilHead.radius) || (g && g.parameters && g.parameters.radius) || 0.14;
        }
        return head.userData.headRadius;
    }

    // tono della pelle della variante (collo, mani, braccia e gambe scoperte)
    function skinMaterial(variant) {
        return colorMat(HEADS().variantInfo(variant).skin, 0.6);
    }

    // Dà alla testa la geometria e il materiale di una variante. Restituisce la variante (o null).
    // opts: { variant (se manca si sceglie con female/age/u), female, age: 'young'|'adult'|'any', u,
    //         facial: 'none'|'stubble'|'beard'|'mustache'|'full', hair: colore dei capelli, crowd }
    // head.userData.skinMat (facoltativo): materiale della pelle del personaggio, intonato al volto.
    function applyHead(head, opts = {}) {
        if (!head || !HEADS()) return null;
        const H = HEADS();
        const v = opts.variant != null ? opts.variant : H.pick(opts.female ? 'f' : 'm', opts.age || 'adult', opts.u);
        const old = head.geometry;
        head.geometry = H.geometry(v, headRadius(head), headLod(opts.crowd));
        if (old && old !== head.geometry && !(old.userData && old.userData.hilHead)) old.dispose();
        head.material = H.material(v, { facial: opts.facial || 'none', hair: opts.hair });
        head.userData.headVariant = v;
        if (head.userData.skinMat) head.userData.skinMat.color.setHex(H.variantInfo(v).skin);
        return v;
    }

    // Calotte dei capelli, cappellini e cuffie erano pensati per la vecchia sfera, con gli occhi molto
    // più in alto di una testa vera: le calotte sferiche (spicchio che parte dall'alto e scende poco
    // sotto l'equatore) diventano la cuffia di capelli della variante, con l'attaccatura sopra fronte e
    // orecchie; gli altri oggetti (cappellini, capelli lunghi, frangia dei calvi) si stringono ai lati
    // sul cranio. Una volta sola per oggetto.
    function isHairCap(o) {
        const p = o.isMesh && o.geometry && o.geometry.type === 'SphereGeometry' && o.geometry.parameters;
        return !!p && p.thetaStart === 0 && p.phiLength > 6.2 && p.thetaLength > 0.45 * Math.PI && p.thetaLength < 0.7 * Math.PI;
    }
    function fitToSkull(head, objs) {
        if (!head || head.userData.headVariant == null || !HEADS()) return;
        const v = head.userData.headVariant;
        const sk = HEADS().variantInfo(v).skull;   // [semi-profondità, calotta, semi-larghezza, centro]
        const k = clamp(sk[2] + 0.1, 0.8, 1);
        // asse laterale della testa nel suo gruppo: Z se non è ruotata, X se è girata di 90°
        const lat = new THREE.Vector3(0, 0, 1).applyQuaternion(head.quaternion);
        const ax = Math.abs(lat.x) > Math.abs(lat.z) ? 'x' : 'z';
        objs.forEach(o => {
            if (!o || o === head || o.userData.skullFit) return;
            o.userData.skullFit = true;
            if (isHairCap(o)) {
                o.geometry = HEADS().hairGeometry(v, headRadius(head));   // la sfera può essere condivisa: non si libera
                o.position.copy(head.position);
                o.quaternion.copy(head.quaternion);
                o.scale.copy(head.scale);
                return;
            }
            o.scale[ax] *= k;
            o.position[ax] *= k;
        });
    }
    // Geometria della testa di riferimento (prima di applyHead): uomo, o donna, giovane
    function makeHeadGeometry(radius, female) {
        if (!HEADS()) return new THREE.SphereGeometry(radius, 16, 12);
        return HEADS().geometry(HEADS().pick(female ? 'f' : 'm', 'young', 0), radius, headLod(false));
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
    // Capelli lunghi delle donne: 'long' (sulle spalle) e 'bob' (alla mascella) sono il "sipario" della
    // variante (src/game/Heads.js), che cade dal cranio e lascia libero il viso; 'ponytail' è una coda
    // dietro la nuca sopra la cuffia.
    function addLongHair(head, headGroup, hairMat, style) {
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
        const g = head.userData.headVariant != null && HEADS()
            ? HEADS().longHairGeometry(head.userData.headVariant, headRadius(head), style) : null;
        if (!g) return;
        const m = new THREE.Mesh(g, colorMat(hairMat.color.getHex(), 0.8, THREE.DoubleSide));
        m.position.copy(head.position);
        m.quaternion.copy(head.quaternion);
        m.scale.copy(head.scale);
        m.userData.skullFit = true;          // segue già il cranio: fitToSkull non lo stringe
        headGroup.add(m);
    }

    function pickHairColor(female, adult, r) {
        const palette = adult ? HAIR_COLORS : HAIR_COLORS_YOUNG;
        return pickWeighted(female ? palette.filter(c => c[0] !== 0xd8d6d0) : palette, r());
    }

    function styleHair(head, hair, headGroup, female, adult, r, color) {
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
        if (female) addLongHair(head, headGroup, hairMat, pickWeighted([['long', 55], ['ponytail', 15], ['bob', 30]], r()));
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
    // opts (facoltativo): { female: true/false (forza il sesso), gear: false (niente maglia/felpa/bandierina),
    //                      shoes: false (niente scarpe, per chi mette i pattini) }
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

        // volto: testa modellata (anche anziani tra gli adulti), barba/baffi e colore dei capelli
        const hairColor = pickHairColor(female, adult, r);
        let facial = 'none';
        if (!female && adult) {
            const f = r();
            facial = f < 0.22 ? FACIAL_HAIR[Math.floor(r() * FACIAL_HAIR.length)] : f < 0.42 ? 'stubble' : 'none';
        }
        const variant = applyHead(head, { female, age: adult ? 'any' : 'young', facial, hair: hairColor, crowd: true });
        const skinMat = variant != null ? skinMaterial(variant) : null;
        root.userData.skinMat = skinMat;

        // mani con le dita e corpo modellato al posto dei cilindri (collo e mani del colore del volto)
        arms.forEach(a => {
            const hand = replaceSphereHand(a, a.position.z > 0 ? 1 : -1, 'relaxed', '+x');
            if (hand && skinMat) hand.material = skinMat;
        });
        const handMesh = arms.length && arms[0].children.find(c => c.userData && c.userData.isHand);
        upgradeBody(root, bodyPivot, arms, { female, front: '+x', skinMat: skinMat || (handMesh ? handMesh.material : null), random: r, shoes: opts.shoes });

        styleHair(head, hair, headGroup, female, adult, r, hairColor);
        fitToSkull(head, headGroup.children);

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
        if (opts.center) {
            // stemma grande al centro del petto: il piano è piegato sulla sagoma del busto (niente bordi sospesi)
            const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.35, roughness: 0.6 });
            const key = ['crestC', mm(R), mm(h), mm(size), mm(t), female ? 'f' : 'm', front].join('_');
            const g = geo(key, () => {
                const pg = new THREE.PlaneGeometry(size, size, 12, 8);
                const p = pg.attributes.position;
                for (let i = 0; i < p.count; i++) {
                    const u = p.getX(i), v = p.getY(i);
                    const [dd, ww] = torsoAt(female, t + v / h);
                    const Wd = ww * R, Dd = dd * R;
                    const depth = Dd * Math.sqrt(Math.max(0, 1 - (u / Wd) * (u / Wd))) + 0.005;
                    // chi guarda +X ha la sinistra verso -Z (la destra dell'immagine va verso -Z);
                    // chi guarda -Z ha la sinistra verso -X
                    if (front === '-z') p.setXYZ(i, -u, v, -depth);
                    else p.setXYZ(i, depth, v, -u);
                }
                pg.computeVertexNormals();
                return pg;
            });
            const crest = new THREE.Mesh(g, mat);
            crest.position.y = torso.position.y + (t - 0.5) * h;
            bodyPivot.add(crest);
            return crest;
        }
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
    // opts: { female, top: colore maglia, pants, apron: colore grembiule, cap: colore cappellino, skin,
    //         shortSleeves, shorts: colore dei pantaloncini (gambe scoperte), socks: colore dei calzettoni,
    //         skates (pattini in linea: chi li usa va alzato di SKATE_LIFT), stick (bastone tenuto davanti),
    //         crestClub: stemma della squadra sul petto }
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
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), skinM);   // diventa una testa modellata
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
        decorateCrowdMember(root, headGroup, false, { female: opts.female, gear: false, shoes: opts.skates ? false : undefined });
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
            fitToSkull(head, [crown, visor]);
        }
        const skin = root.userData.skinMat || skinM;   // pelle del volto (braccia e gambe scoperte)
        const out = { mesh: root, bodyPivot, headGroup, leftArmPivot, rightArmPivot, baseY: 0, phase: Math.random() * Math.PI * 2, standing: true };

        // maniche corte (senza bastone): il braccio diventa pelle, la manica modellata copre spalla e metà braccio
        if (opts.shortSleeves && !opts.stick) {
            [leftArmPivot, rightArmPivot].forEach(ap => {
                const arm = ap.children.find(c => c.isMesh && !c.userData.isHand && c.material === top);
                if (arm) arm.material = skin;
                ap.add(new THREE.Mesh(sleeveGeometry(), top));
            });
        }
        // pantaloncini e calzettoni modellati sulla gamba (niente tubi): le gambe diventano pelle
        const legs = root.children.filter(c => c.isMesh && c.material === pantsM);
        if (opts.shorts != null) {
            const shortsM = colorMat(opts.shorts, 0.75);
            const socksM = colorMat(opts.socks != null ? opts.socks : opts.shorts, 0.8);
            legs.forEach(leg => { leg.material = skin; });
            const spots = legs.map(l => [l.position.x, l.position.z]);
            const key = spots.map(p => p.map(mm).join(',')).join(';') + (bodyDetail().low ? '_lo' : '_hi');
            root.add(new THREE.Mesh(geo('wuShorts_' + key, () => shortsGeometry(spots)), shortsM));
            root.add(new THREE.Mesh(geo('wuSocks_' + key, () => socksGeometry(spots)), socksM));
        }
        // pattini in linea come quelli dei giocatori in partita: scarpetta arrotondata con punta, collarino,
        // linguetta, telaio e quattro ruote (le ruote toccano y = -SKATE_LIFT). Un mesh per materiale.
        if (opts.skates) {
            const spots = legs.map(l => [l.position.x, l.position.z]);
            const key = 'skates2_' + spots.map(p => p.map(mm).join(',')).join(';') + (bodyDetail().low ? '_lo' : '_hi');
            const parts = geo(key, () => skateGeometries(spots));
            root.add(new THREE.Mesh(parts.boot, colorMat(0x141416, 0.35)), new THREE.Mesh(parts.tongue, colorMat(0xf1f1f1, 0.6)),
                new THREE.Mesh(parts.chassis, CHASSIS_MAT()), new THREE.Mesh(parts.wheels, colorMat(0xf5c518, 0.35)));
        }
        // bastone impugnato a due mani: braccia con gomito e guanti da hockey (al posto delle mani), che
        // a ogni fotogramma (updateGrip) si chiudono sull'asta qualunque sia la rotazione del bastone.
        // stickGroup ruota attorno alla mano alta (rotation.y = colpo laterale), stickBlade è il punto
        // della lama dove sta il disco.
        if (opts.stick) {
            const gloveM = colorMat(opts.gloves != null ? opts.gloves : 0x111114, 0.5);
            const trimM = colorMat(opts.gloves === 0xffffff ? 0x14235a : 0xffffff, 0.5);
            const arms = [leftArmPivot, rightArmPivot].map((ap, i) => buildAthleteArm(ap, i ? 1 : -1, top, skin, gloveM, trimM));
            const stick = new THREE.Group();
            stick.rotation.order = 'YXZ';
            stick.position.set(STICK.px, STICK.py, STICK.pz);       // mano alta
            const tilt = new THREE.Group();
            tilt.rotation.order = 'ZYX';
            tilt.rotation.set(STICK.tx, 0, STICK.tz);               // l'asta scende in avanti e verso destra
            stick.add(tilt);
            // lunghezza dell'asta perché il tallone della lama arrivi al pavimento
            const dir = new THREE.Vector3(0, -1, 0).applyEuler(tilt.rotation);
            const shaftLen = (STICK.py - (-SKATE_LIFT + 0.03)) / -dir.y;
            // stessa grafica delle stecche dei giocatori (marchio inventato, index.html), se disponibile
            const stickModel = ['nexa', 'vortex', 'apex'][Math.floor(Math.random() * 3)];
            const shaftMat = typeof getStickBrandMaterial === 'function' ? getStickBrandMaterial(stickModel) : colorMat(0x1f2937, 0.4);
            const shaft = new THREE.Mesh(geo('wuShaft_' + mm(shaftLen), () => new THREE.BoxGeometry(0.03, shaftLen + 0.09, 0.042)), shaftMat);
            shaft.position.y = -shaftLen / 2 + 0.045;
            const knob = new THREE.Mesh(geo('wuKnob', () => roundedBox(0.036, 0.07, 0.048, 0.01)), colorMat(0xf2f2f2, 0.9));
            knob.position.y = 0.07;
            tilt.add(shaft, knob);
            // lama piatta sul pavimento: dal tallone (fondo dell'asta) verso destra e un po' in avanti,
            // faccia di diritto verso il davanti; nastro sulla metà centrale
            const heel = dir.clone().multiplyScalar(shaftLen);
            const bDir = new THREE.Vector3(0.45, 0, 0.89);              // verso della punta della lama
            const bFace = new THREE.Vector3(0.89, 0, -0.45);            // faccia di diritto
            const bladeYaw = Math.atan2(-bDir.z, bDir.x);
            const bladeY = -SKATE_LIFT + 0.04 - STICK.py;                   // nel sistema del bastone (perno alla mano alta)
            const blade = new THREE.Mesh(geo('wuBlade2', () => {
                const g = roundedBox(0.3, 0.075, 0.016, 0.006);
                const p = g.attributes.position;                        // lama curva verso la faccia di diritto
                for (let i = 0; i < p.count; i++) { const t = (p.getX(i) + 0.15) / 0.3; p.setZ(i, p.getZ(i) - t * t * 0.035); }
                g.computeVertexNormals();
                return g;
            }), colorMat(0x0c0c0e, 0.35));
            blade.rotation.y = bladeYaw;
            blade.position.set(heel.x + bDir.x * 0.14, bladeY, heel.z + bDir.z * 0.14);
            const tape = new THREE.Mesh(geo('wuTape', () => roundedBox(0.15, 0.079, 0.022, 0.006)), colorMat(Math.random() < 0.5 ? 0xf4f4f4 : 0x1a1a1d, 0.95));
            tape.rotation.y = bladeYaw;
            tape.position.set(heel.x + bDir.x * 0.16 + bFace.x * 0.004, bladeY, heel.z + bDir.z * 0.16 + bFace.z * 0.004);
            const tip = new THREE.Object3D();
            tip.position.set(heel.x + bDir.x * 0.15 + bFace.x * 0.05, bladeY - 0.02, heel.z + bDir.z * 0.15 + bFace.z * 0.05);
            stick.add(blade, tape, tip);
            root.add(stick);
            out.stickGroup = stick;
            out.stickBlade = tip;
            // impugnature sull'asta (nel sistema dell'asta): mano sinistra in cima, destra più in basso
            const grips = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -STICK.gap, 0)];
            const gw = new THREE.Vector3();
            out.updateGrip = () => {
                root.updateWorldMatrix(true, true);
                arms.forEach((arm, i) => {
                    tilt.localToWorld(gw.copy(grips[i]));
                    solveArm(arm, gw, root);
                });
            };
            out.updateGrip();
        }
        if (opts.crestClub) addChestCrest(bodyPivot, opts.crestClub, opts.crestSize ? { t: 0.69, size: opts.crestSize, center: true } : { t: 0.62, size: 0.1 });
        out.lift = opts.skates ? SKATE_LIFT : 0;
        return out;
    }
    const SKATE_LIFT = 0.1;
    // bastone dei giocatori in riscaldamento (sistema della persona, guarda +X, destra = +Z): mano alta,
    // inclinazione dell'asta e distanza fra le mani, scelte perché le braccia ci arrivino per tutto il
    // movimento del colpo (busto piegato in avanti di ~0.2 rad)
    const STICK = { px: 0.2, py: 1.0, pz: 0.12, tx: -0.25, tz: 0.38, gap: 0.27 };
    const ARM_UPPER = 0.28, ARM_LOWER = 0.3;      // spalla-gomito, gomito-centro del guanto

    let chassisMat = null;
    const CHASSIS_MAT = () => chassisMat || (chassisMat = new THREE.MeshStandardMaterial({ color: 0xd9dde2, metalness: 0.75, roughness: 0.25 }));

    // parallelepipedo arrotondato (quello dei giocatori se disponibile), sempre una copia propria
    function roundedBox(w, h, d, r) {
        return typeof createRoundedBoxGeometry === 'function' ? createRoundedBoxGeometry(w, h, d, r).clone() : new THREE.BoxGeometry(w, h, d);
    }
    // copia non indicizzata -> indicizzata per mergeParts (che vuole posizioni, normali e indici)
    function indexed(g) {
        if (g.index) return g;
        const n = g.attributes.position.count, idx = [];
        for (let i = 0; i < n; i++) idx.push(i);
        g.setIndex(idx);
        return g;
    }

    // manica corta modellata: segue spalla e bicipite, orlo chiuso (dal basso si vede la stoffa)
    function sleeveGeometry() {
        const D = bodyDetail();
        return geo('sleeve2' + (D.low ? '_lo' : '_hi'), () => ellipticLathe([
            [-0.16, 0.062, 0.066], [-0.12, 0.064, 0.068], [-0.05, 0.068, 0.072], [0.0, 0.069, 0.072], [0.035, 0.06, 0.064], [0.06, 0.04, 0.045]
        ], Math.max(10, D.seg - 4), D.sm, '+x', true, true));
    }

    // pantaloncini: bacino unico che copre le due anche e due gambe svasate sulle cosce (gamba alta 0.82, piedi a y = 0)
    function shortsGeometry(spots) {
        const D = bodyDetail(), seg = Math.max(10, D.seg - 4);
        const parts = [ellipticLathe([
            [0.69, 0.128, 0.2], [0.74, 0.142, 0.222], [0.79, 0.148, 0.222], [0.83, 0.143, 0.2], [0.86, 0.134, 0.178]
        ], D.seg, D.sm, '+x', true, true)];
        spots.forEach(([x, z]) => {
            const g = ellipticLathe([[0.5, 0.104, 0.108], [0.56, 0.104, 0.108], [0.66, 0.106, 0.11], [0.76, 0.104, 0.108]], seg, 0, '+x', true, true);
            g.translate(x, 0, z);
            parts.push(g);
        });
        return mergeParts(parts);
    }

    // calzettoni aderenti dalla caviglia a sotto il ginocchio (seguono il profilo di standingLegGeometry)
    function socksGeometry(spots) {
        const D = bodyDetail(), seg = Math.max(10, D.seg - 6);
        return mergeParts(spots.map(([x, z]) => {
            const g = ellipticLathe([
                [0.02, 0.047, 0.049], [0.06, 0.051, 0.053], [0.16, 0.067, 0.07], [0.25, 0.066, 0.069], [0.36, 0.059, 0.062], [0.42, 0.062, 0.065], [0.45, 0.066, 0.069]
            ], seg, D.sm, '+x', true, true);
            g.translate(x, 0, z);
            return g;
        }));
    }

    // pattini dei giocatori in partita, girati verso +X: { boot, tongue, chassis, wheels }
    function skateGeometries(spots) {
        const D = bodyDetail(), L = -SKATE_LIFT;
        const boot = [], tongue = [], chassis = [], wheels = [];
        spots.forEach(([x, z]) => {
            const up = indexed(roundedBox(0.26, 0.13, 0.105, 0.035)); up.translate(x + 0.03, L + 0.155, z); boot.push(up);
            const toe = new THREE.SphereGeometry(0.055, D.low ? 10 : 14, D.low ? 6 : 10); toe.scale(1.35, 0.75, 0.95); toe.translate(x + 0.155, L + 0.13, z); boot.push(toe);
            const cuff = ellipticLathe([[0.0, 0.078, 0.074], [0.05, 0.082, 0.078], [0.08, 0.08, 0.076]], D.low ? 10 : 14, 0, '+x', true, true);
            cuff.translate(x + 0.01, L + 0.21, z); boot.push(cuff);
            const tg = indexed(roundedBox(0.03, 0.11, 0.07, 0.012)); tg.rotateZ(-0.28); tg.translate(x + 0.085, L + 0.23, z); tongue.push(tg);
            const ch = indexed(roundedBox(0.3, 0.05, 0.03, 0.012)); ch.translate(x + 0.035, L + 0.065, z); chassis.push(ch);
            [-0.077, 0.0, 0.077, 0.152].forEach(dx => {
                const w = new THREE.CylinderGeometry(0.036, 0.036, 0.022, D.low ? 10 : 16); w.rotateX(Math.PI / 2); w.translate(x + dx - 0.005, L + 0.036, z); wheels.push(w);
            });
        });
        return { boot: mergeParts(boot), tongue: mergeParts(tongue), chassis: mergeParts(chassis), wheels: mergeParts(wheels) };
    }

    // Braccio da atleta con gomito, al posto di quello del pubblico: spalla e manica corta della maglia,
    // braccio e avambraccio nudi, guanto da hockey (polsino, dorso imbottito, dita a rullo, fasce).
    // Il centro del guanto è a ARM_LOWER sotto il gomito: è il punto che si chiude sull'asta.
    function buildAthleteArm(ap, side, topM, skinM, gloveM, trimM) {
        while (ap.children.length) ap.remove(ap.children[0]);   // geometrie condivise: niente dispose
        ap.rotation.set(0, 0, 0);
        const D = bodyDetail(), seg = Math.max(10, D.seg - 6);
        const shoulder = new THREE.Mesh(geo('wuShoulder' + D.seg, () => new THREE.SphereGeometry(0.066, seg, Math.max(6, seg >> 1))), topM);
        shoulder.scale.set(1, 0.9, 1.0);
        const upper = new THREE.Mesh(geo('wuUpper' + D.seg, () => ellipticLathe([
            [-ARM_UPPER - 0.01, 0.04, 0.043], [-0.24, 0.045, 0.048], [-0.17, 0.051, 0.055], [-0.09, 0.057, 0.061], [-0.02, 0.061, 0.064], [0.03, 0.05, 0.054]
        ], seg, D.sm, '+x', true, true)), skinM);
        const sleeve = new THREE.Mesh(sleeveGeometry(), topM);
        ap.add(shoulder, upper, sleeve);
        const elbow = new THREE.Group();
        elbow.position.y = -ARM_UPPER;
        ap.add(elbow);
        const joint = new THREE.Mesh(geo('wuElbow' + D.seg, () => new THREE.SphereGeometry(0.042, seg, Math.max(6, seg >> 1))), skinM);
        const fore = new THREE.Mesh(geo('wuFore' + D.seg, () => ellipticLathe([
            [-0.2, 0.031, 0.036], [-0.14, 0.036, 0.042], [-0.07, 0.042, 0.048], [-0.01, 0.043, 0.047], [0.02, 0.04, 0.043]
        ], seg, D.sm, '+x', true, true)), skinM);
        const glove = new THREE.Mesh(geo('wuGlove' + D.seg, () => {
            const cuff = ellipticLathe([[-0.255, 0.058, 0.062], [-0.215, 0.064, 0.068], [-0.17, 0.067, 0.071], [-0.16, 0.06, 0.064]], seg, 0, '+x', true, true);
            const back = indexed(roundedBox(0.11, 0.125, 0.105, 0.035)); back.translate(-0.005, -ARM_LOWER, 0);
            const roll = new THREE.CapsuleGeometry(0.036, 0.045, 3, D.low ? 8 : 12); roll.rotateX(Math.PI / 2); roll.translate(0.03, -ARM_LOWER - 0.055, 0);
            const thumb = new THREE.CapsuleGeometry(0.02, 0.04, 2, 8); thumb.rotateZ(0.7); thumb.translate(0.05, -ARM_LOWER + 0.03, 0);
            return mergeParts([cuff, back, roll, thumb]);
        }), gloveM);
        const trim = new THREE.Mesh(geo('wuGloveTrim', () => mergeParts([-0.2, -0.235].map(y => {
            const t = new THREE.TorusGeometry(1, 0.13, 4, 16); t.scale(0.066, 0.07, 0.066); t.rotateX(Math.PI / 2); t.translate(0, y, 0);
            return t;
        }))), trimM);
        elbow.add(joint, fore, glove, trim);
        return { pivot: ap, elbow, side, upper: ARM_UPPER, lower: ARM_LOWER };
    }

    // IK a due ossa: il centro del guanto va sul punto target (mondo), il gomito piega verso l'esterno
    // e in basso dietro. Le ossa puntano lungo il loro -Y locale.
    const _S = new THREE.Vector3(), _E = new THREE.Vector3(), _T = new THREE.Vector3(), _dir = new THREE.Vector3(),
        _pole = new THREE.Vector3(), _q = new THREE.Quaternion(), _DOWN = new THREE.Vector3(0, -1, 0);
    function aimBone(pivot, from, to) {
        _dir.subVectors(to, from).normalize();
        pivot.parent.getWorldQuaternion(_q).invert();
        _dir.applyQuaternion(_q);
        pivot.quaternion.setFromUnitVectors(_DOWN, _dir);
        pivot.updateMatrixWorld(true);
    }
    function solveArm(arm, target, root) {
        const a = arm.upper, b = arm.lower;
        arm.pivot.getWorldPosition(_S);
        _T.subVectors(target, _S);
        const d = clamp(_T.length(), Math.abs(a - b) + 0.02, a + b - 0.002);
        _T.normalize();
        const x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
        _pole.set(-0.35, -0.45, arm.side).applyQuaternion(root.getWorldQuaternion(_q));
        _pole.addScaledVector(_T, -_pole.dot(_T)).normalize();
        _E.copy(_S).addScaledVector(_T, x).addScaledVector(_pole, h);
        const hand = _T.multiplyScalar(d).add(_S);              // target raggiungibile (sulla stessa retta)
        aimBone(arm.pivot, _S, _E);
        aimBone(arm.elbow, _E, hand);
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

    window.HIL_PEOPLE = { playerTraits, traitsOf, findPlayerInfo, applySkaterLook, decorateCrowdMember, updateCrowdFlag, makeHand, makeHeadGeometry, applyHead, fitToSkull, skinMaterial, upgradeBody, addChestCrest, makePerson, SKATE_LIFT };
})();
