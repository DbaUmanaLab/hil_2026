// Palazzetto "piacenza": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // PATTINODROMO B. METTI — PIACENZA (casa del Lepis Piacenza). Cupola geodetica allungata:
    // corpo centrale a botte e due absidi a mezzo ellissoide, rivestiti dal telo bianco e sorretti da
    // un reticolo spaziale di travi nere a triangoli (ogni triangolo ha il nodo centrale rientrato,
    // il "motivo a stella" delle foto). Parete bassa con le finestre in policarbonato, fari quadrati
    // sul reticolo, una lunga manica di ventilazione in tessuto, tribuna con le sedute rosse dietro
    // la ringhiera, reti nere dietro le porte, pista in resina terracotta.
    // Texture in assets/textures/piacenza/ (tools/generate_piacenza_textures.py).
    // =====================================================================
    function buildPiacenzaArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/piacenza/';
        const XW = -26.5, XE = 24.5, CX = (XW + XE) / 2, A = (XE - XW) / 2;   // fianchi
        const WH = 3.2, B = 12.0;                                             // parete bassa e freccia della volta
        const HM = 22, E = 19;                                                // metà del corpo a botte, profondità delle absidi
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        const tmpM = new THREE.Matrix4();

        // Superficie: punto della volta per angolo trasversale th (0 = fianco +x, π = fianco -x) e "stazione"
        // longitudinale st = { z, k, cap }: nel corpo k = 1; nelle absidi k = cos ψ e z = ±(HM + E sin ψ).
        const surf = (th, st, inset = 0) => {
            const p = V(CX + A * Math.cos(th) * st.k, WH + B * Math.sin(th) * st.k, st.z);
            if (inset) {
                // normale dell'ellissoide (x/A, y/B, z/E) nel corpo e nelle absidi
                const nx = (p.x - CX) / (A * A), ny = (p.y - WH) / (B * B);
                const nz = st.cap ? (p.z - Math.sign(p.z) * HM) / (E * E) : 0;
                p.addScaledVector(V(nx, ny, nz).normalize(), -inset);
            }
            return p;
        };
        // stazioni: absidi (ψ decrescente) + corpo + absidi
        const stations = [];
        const capN = lowQ ? 6 : 8, bodyN = lowQ ? 14 : 16;
        for (let i = capN; i >= 1; i--) { const ps = (Math.PI / 2) * i / (capN + 0.6); stations.push({ z: -(HM + E * Math.sin(ps)), k: Math.cos(ps), cap: true }); }
        for (let i = 0; i <= bodyN; i++) stations.push({ z: -HM + 2 * HM * i / bodyN, k: 1, cap: false });
        for (let i = 1; i <= capN; i++) { const ps = (Math.PI / 2) * i / (capN + 0.6); stations.push({ z: HM + E * Math.sin(ps), k: Math.cos(ps), cap: true }); }
        // ogni anello ha un numero di nodi proporzionale alla sua lunghezza: triangoli di dimensioni simili
        const NTH = lowQ ? 22 : 26;
        const rings = stations.map(st => {
            const n = Math.max(2, Math.round(NTH * st.k));
            const nodes = [];
            for (let i = 0; i <= n; i++) nodes.push({ t: i / n, p: surf(Math.PI * i / n, st, 0.25), st, th: Math.PI * i / n });
            return nodes;
        });

        // ---------- 1. reticolo geodetico: lati dei triangoli + stella verso il nodo centrale rientrato
        const steelMat = new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.55, metalness: 0.4 });
        const beams = [];
        const tris = [];
        rings.forEach(r => { for (let i = 0; i < r.length - 1; i++) beams.push([r[i].p, r[i + 1].p, 0.09]); });
        for (let k = 0; k < rings.length - 1; k++) {
            const a = rings[k], b = rings[k + 1];
            let i = 0, j = 0;
            beams.push([a[0].p, b[0].p, 0.09]);
            while (i < a.length - 1 || j < b.length - 1) {
                const advA = j >= b.length - 1 || (i < a.length - 1 && a[i + 1].t <= b[j + 1].t);
                if (advA) { tris.push([a[i].p, a[i + 1].p, b[j].p]); i++; }
                else { tris.push([a[i].p, b[j + 1].p, b[j].p]); j++; }
                beams.push([a[i].p, b[j].p, 0.09]);
            }
        }
        if (!lowQ) {
            tris.forEach(([p, q, r]) => {
                const c = p.clone().add(q).add(r).multiplyScalar(1 / 3);
                const n = q.clone().sub(p).cross(r.clone().sub(p)).normalize();
                const out = c.clone().sub(V(CX, WH, Math.max(-HM, Math.min(HM, c.z))));      // dall'asse della volta verso il telo
                if (n.dot(out) < 0) n.negate();
                c.addScaledVector(n, -0.5);                                                    // nodo centrale rientrato
                beams.push([p, c, 0.05], [q, c, 0.05], [r, c, 0.05]);
            });
        }
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(beams), steelMat));

        // ---------- 2. telo bianco (griglia regolare, appena fuori dal reticolo)
        const memTex = loadFileTexture(T + 'membrane.jpg', { wrap: true });
        const membraneMat = new THREE.MeshStandardMaterial({ map: memTex, color: 0xe2e5e8, emissive: 0xdde0e3, emissiveMap: memTex, emissiveIntensity: 0.22, roughness: 0.9, side: THREE.DoubleSide });
        const NT = lowQ ? 28 : 48;
        const mStations = [];
        const capM = lowQ ? 8 : 14, bodyM = lowQ ? 10 : 20;
        for (let i = capM; i >= 1; i--) { const ps = (Math.PI / 2) * i / capM; mStations.push({ z: -(HM + E * Math.sin(ps)), k: Math.max(0.001, Math.cos(ps)), cap: true }); }
        for (let i = 0; i <= bodyM; i++) mStations.push({ z: -HM + 2 * HM * i / bodyM, k: 1, cap: false });
        for (let i = 1; i <= capM; i++) { const ps = (Math.PI / 2) * i / capM; mStations.push({ z: HM + E * Math.sin(ps), k: Math.max(0.001, Math.cos(ps)), cap: true }); }
        const mPos = [], mUv = [], mIdx = [];
        mStations.forEach((st, j) => {
            for (let i = 0; i <= NT; i++) {
                const p = surf(Math.PI * i / NT, st, 0);
                mPos.push(p.x, p.y, p.z);
                mUv.push(i / NT * 8, (p.z + HM + E) / 8);
            }
        });
        for (let j = 0; j < mStations.length - 1; j++) for (let i = 0; i < NT; i++) {
            const a = j * (NT + 1) + i, b = a + NT + 1;
            mIdx.push(a, b, a + 1, b, b + 1, a + 1);
        }
        const memGeo = new THREE.BufferGeometry();
        memGeo.setAttribute('position', new THREE.Float32BufferAttribute(mPos, 3));
        memGeo.setAttribute('uv', new THREE.Float32BufferAttribute(mUv, 2));
        memGeo.setIndex(mIdx);
        memGeo.computeVertexNormals();
        targetGroup.add(new THREE.Mesh(memGeo, membraneMat));

        // ---------- 3. parete bassa lungo il perimetro: zoccolo bianco + fascia di finestre, montanti
        const foot = [];                                            // contorno a "stadio" (in pianta)
        const FS = lowQ ? 10 : 18;
        for (let i = 0; i <= FS; i++) { const ps = Math.PI * i / FS; foot.push(V(CX + A * Math.cos(ps), 0, -(HM + E * Math.sin(ps)))); }   // abside nord: da +x a -x
        foot.push(V(XW, 0, HM));
        for (let i = 0; i <= FS; i++) { const ps = Math.PI + Math.PI * i / FS; foot.push(V(CX + A * Math.cos(ps), 0, HM - E * Math.sin(ps))); }  // abside sud: da -x a +x
        foot.push(V(XE, 0, -HM));
        const strip = (y0, y1, mat, uScale) => {
            const pos = [], uv = [], idx = [];
            let u = 0;
            foot.forEach((p, i) => {
                if (i > 0) u += p.distanceTo(foot[i - 1]);
                pos.push(p.x, y0, p.z, p.x, y1, p.z);
                uv.push(u / uScale, 0, u / uScale, 1);
                if (i < foot.length - 1) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
            });
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
            g.setIndex(idx);
            g.computeVertexNormals();
            targetGroup.add(new THREE.Mesh(g, mat));
        };
        strip(0, 1.1, new THREE.MeshStandardMaterial({ color: 0xe9e8e4, roughness: 0.8, side: THREE.DoubleSide }), 4);
        const winTex = loadFileTexture(T + 'windows.jpg', { wrap: true });
        const winStripMat = new THREE.MeshStandardMaterial({ map: winTex, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0.45, roughness: 0.3, side: THREE.DoubleSide });
        winStripMat.userData.sunWindow = true;            // finestra verso l'esterno: di giorno ci entra il sole (index.html)
        strip(1.1, WH, winStripMat, 4);
        const posts = [];
        foot.forEach((p, i) => {
            posts.push([V(p.x, 0, p.z), V(p.x, WH, p.z), 0.07]);
            if (i > 0) posts.push([V(foot[i - 1].x, WH, foot[i - 1].z), V(p.x, WH, p.z), 0.08], [V(foot[i - 1].x, 1.1, foot[i - 1].z), V(p.x, 1.1, p.z), 0.05]);
        });
        for (let z = -HM + 4; z < HM; z += 4) [XW, XE].forEach(x => posts.push([V(x, 0, z), V(x, WH, z), 0.06]));
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(posts), steelMat));

        // ---------- 4. fari quadrati agganciati al reticolo
        const lampPts = [];
        rings.forEach((r, k) => {
            if (r[0].st.cap || k % 2) return;
            [0.16, 0.34, 0.66, 0.84].forEach(f => lampPts.push(surf(Math.PI * f, r[0].st, 0.9)));
        });
        const lampBox = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.24, 0.34), new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.5 }), lampPts.length);
        const lampFace = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.26, 0.26).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), lampPts.length);
        const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
        lampPts.forEach((p, i) => {
            tmpM.makeTranslation(p.x, p.y, p.z); lampBox.setMatrixAt(i, tmpM);
            tmpM.makeTranslation(p.x, p.y - 0.13, p.z); lampFace.setMatrixAt(i, tmpM);
            if (!lowQ && i % 2 === 0) {
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(1.6, 1.6, 1);
                spr.position.set(p.x, p.y - 0.25, p.z);
                targetGroup.add(spr);
            }
        });
        lampBox.instanceMatrix.needsUpdate = true;
        lampFace.instanceMatrix.needsUpdate = true;
        targetGroup.add(lampBox, lampFace);

        // ---------- 5. manica di ventilazione in tessuto appesa sotto la volta
        const ductMat = new THREE.MeshStandardMaterial({ color: 0xd2d0cc, roughness: 0.95 });
        const ductP = surf(Math.PI * 0.6, { z: 0, k: 1, cap: false }, 2.2);
        const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 40, 16, 1), ductMat);
        duct.rotation.x = Math.PI / 2;
        duct.position.set(ductP.x, ductP.y, -2);
        targetGroup.add(duct);
        const capEnd = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), ductMat);
        capEnd.position.set(ductP.x, ductP.y, 18);
        targetGroup.add(capEnd);
        const hang = [];
        for (let z = -20; z <= 18; z += 4) { const top = surf(Math.PI * 0.6, { z, k: 1, cap: false }, 0.6); hang.push([V(ductP.x, ductP.y + 0.3, z), V(ductP.x, top.y, z), 0.01]); }
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(hang), steelMat));

        // ---------- 6. pavimento attorno alla pista (stessa resina, più scura)
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(XE - XW, 2 * (HM + E)), new THREE.MeshStandardMaterial({ color: 0x7e544b, roughness: 0.7 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(CX, -0.01, 0);
        targetGroup.add(apron);

        // ---------- 7. reti nere dietro le porte
        const netTex = loadFileTexture('assets/textures/kraken_camaiore/net_white.png', { repeat: [1 / 0.12, 1 / 0.12] });   // UV in metri
        const netMat = new THREE.MeshBasicMaterial({ map: netTex, color: 0x141414, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, depthWrite: false });
        [-1, 1].forEach(dir => {
            const zN = dir * 37.4, W2 = 17.2, NY = 1.15, TOP = 4.6;
            const g = new THREE.PlaneGeometry(2 * W2, TOP - NY);
            const uvA = g.attributes.uv;
            for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) * 2 * W2, uvA.getY(i) * (TOP - NY));
            const net = new THREE.Mesh(g, netMat);
            net.position.set(0, (NY + TOP) / 2, zN);
            targetGroup.add(net);
            const np = [[V(-W2, TOP, zN), V(W2, TOP, zN), 0.02]];
            for (let x = -W2; x <= W2 + 0.01; x += 4.3) np.push([V(x, 0, zN), V(x, TOP, zN), 0.05]);
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry(np), steelMat));
        });

        // ---------- 8. striscioni
        const bMats = {};
        const bMat = f => bMats[f] || (bMats[f] = (() => { const t = loadFileTexture(T + f); return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.14, roughness: 0.85, side: THREE.DoubleSide }); })());
        const banner = (f, w, h, x, y, z, rotY) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bMat(f));
            m.position.set(x, y, z); m.rotation.y = rotY; targetGroup.add(m);
        };
        // parete dietro le panchine (+x)
        banner('banner_lepis.jpg', 3.6, 1.8, XE - 0.08, 2.2, -12, -Math.PI / 2);
        banner('banner_lepis.jpg', 3.6, 1.8, XE - 0.08, 2.2, 12, -Math.PI / 2);
        banner('banner_uisp.jpg', 2.4, 0.9, XE - 0.08, 2.1, 19.5, -Math.PI / 2);
        // striscioni gialli sulle absidi, rivolti verso il centro
        [-1, 1].forEach(dir => [-1, 1].forEach(side => {
            const ps = Math.PI / 2 - 0.38;                       // poco a lato del fondo dell'abside
            const x = CX + side * A * Math.cos(ps) * 0.985, z = dir * (HM + E * Math.sin(ps) * 0.985);
            banner('banner_yellow.jpg', 2.8, 1.05, x, 2.3, z, Math.atan2(CX - x, -z));   // rivolto verso il centro
        }));

        // ---------- 9. tribuna (-x): gradoni con le sedute rosse dietro la ringhiera bianca
        const ROWS = 4, DEPTH = 0.8, RISE = 0.42, FX = -21.6, Z0 = -24, Z1 = 24, LEN = Z1 - Z0;
        const stepMat = new THREE.MeshStandardMaterial({ color: 0x8e8f90, roughness: 0.9 });
        const redSeat = new THREE.MeshStandardMaterial({ color: 0xb3202a, roughness: 0.55 });
        for (let r = 0; r < ROWS; r++) {
            const top = RISE * (r + 1), fx = FX - r * DEPTH;
            const st = new THREE.Mesh(new THREE.BoxGeometry(DEPTH, top, LEN), stepMat);
            st.position.set(fx - DEPTH / 2, top / 2, 0);
            targetGroup.add(st);
            const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.38, LEN - 0.4), redSeat);
            seat.position.set(fx - DEPTH + 0.2, top + 0.19, 0);
            const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, LEN - 0.4), redSeat);
            back.position.set(fx - DEPTH + 0.03, top + 0.58, 0);
            targetGroup.add(seat, back);
        }
        const whiteSteel = new THREE.MeshStandardMaterial({ color: 0xeceeef, roughness: 0.4, metalness: 0.4 });
        const RX = -21.3, rail = [];
        rail.push([V(RX, 1.15, Z0), V(RX, 1.15, Z1), 0.035]);
        for (let z = Z0; z <= Z1 + 0.01; z += 2.0) rail.push([V(RX, 0, z), V(RX, 1.15, z), 0.03]);
        [Z0, Z1].forEach(z => rail.push([V(RX, 1.15, z), V(FX - ROWS * DEPTH, RISE * ROWS + 1.0, z), 0.035]));
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rail), whiteSteel));
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(LEN, 0.6), new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.6, side: THREE.DoubleSide }));
        panel.position.set(RX + 0.03, 0.4, 0);
        panel.rotation.y = Math.PI / 2;
        targetGroup.add(panel);

        // spettatori seduti, rivolti verso la pista (+x): tribuna ben riempita, come nelle foto
        const outfits = [0x141416, 0xd61a22, 0xf8fafc, 0x6b7280, 0x1e3a8a, 0x7c2d12, 0x374151, 0xe5e7eb];
        const jm = outfits.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 }));
        const pantsM = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const handM = new THREE.MeshStandardMaterial({ color: 0xc99178, roughness: 0.6 });
        const hairM = new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.8 });
        const fan = (x, y, z) => {
            const root = new THREE.Group();
            const mat = jm[Math.floor(Math.random() * jm.length)];
            [-0.11, 0.11].forEach(lz => {
                const th = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.072, 0.36, 7), pantsM); th.rotation.z = Math.PI / 2; th.position.set(0.14, 0.36, lz);
                const cf = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.062, 0.38, 7), pantsM); cf.position.set(0.3, 0.19, lz);
                root.add(th, cf);
            });
            const bodyPivot = new THREE.Group();
            bodyPivot.position.set(-0.04, 0.38, 0);
            root.add(bodyPivot);
            const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.55, 10), mat); torso.position.y = 0.27; bodyPivot.add(torso);
            const headGroup = new THREE.Group(); headGroup.position.y = 0.69;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), getCrowdHeadPlaceholderMaterial());
            const hair = new THREE.Mesh(new THREE.SphereGeometry(0.148, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM); hair.position.x = -0.015;
            headGroup.add(head, hair); bodyPivot.add(headGroup);
            const arm = sz => { const ap = new THREE.Group(); ap.position.set(0, 0.48, sz); const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.42, 7), mat); sl.position.y = -0.21; const hd = new THREE.Mesh(new THREE.SphereGeometry(0.05, 7, 7), handM); hd.position.y = -0.44; ap.add(sl, hd); bodyPivot.add(ap); return ap; };
            const leftArmPivot = arm(-0.24), rightArmPivot = arm(0.24);
            root.position.set(x, y, z);
            root.rotation.y = Math.atan2(z, 30) * 0.3 + (Math.random() - 0.5) * 0.2;
            const childLift = maybeMakeCrowdChild(root, headGroup, true);
            targetGroup.add(root);
            crowdMembers.push({ mesh: root, bodyPivot, headGroup, leftArmPivot, rightArmPivot, baseY: y + childLift, phase: Math.random() * Math.PI * 2, standing: false });
        };
        const keep = preset.crowdKeepRatio * crowdAttendanceScale();   // pubblico in base all'importanza della partita (index.html)
        for (let r = 0; r < ROWS; r++) {
            const top = RISE * (r + 1), fx = FX - r * DEPTH;
            for (let z = Z0 + 0.6; z <= Z1 - 0.6; z += 0.66) {
                if (Math.random() < keep * (0.8 - r * 0.1)) fan(fx - DEPTH + 0.43, top, z + (Math.random() - 0.5) * 0.12);
            }
        }
    }

    registerArenaBuilder('piacenza', buildPiacenzaArchitecture);
})();
