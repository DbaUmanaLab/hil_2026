// Palazzetto "kemarin": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // PISTA DI CAMPOMARINO (CB) — casa del Kemarin Hockey. Pista ALL'APERTO (in ARENA_FILE_TEX ha
    // outdoor: true, che schiarisce sfondo e foschia): cemento lisciato a lastre con le righe azzurre,
    // balaustre basse e scure coperte di striscioni, recinzione con il telo frangivento verde scuro e la
    // rete metallica, una grande rete paravento verde sulla testata sud, torri faro. Attorno: la chiesa
    // bianca con i due campanili cilindrici e la corona di lamelle scure con la croce (testata nord),
    // i condomini in mattoni e intonaco con i tetti in coppi (lato est), gli ulivi e, in lontananza,
    // la cupola blu del palazzetto vicino (ovest). Pubblico in piedi lungo la ringhiera (lato ovest).
    // Texture in assets/textures/kemarin/ (tools/generate_kemarin_textures.py).
    // =====================================================================
    function buildKemarinArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/kemarin/';
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        const tmpM = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
        const std = (color, rough = 0.8, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: rough }, extra || {}));
        const box = (mat, w, h, d, x, y, z, ry = 0) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            m.position.set(x, y, z); m.rotation.y = ry; targetGroup.add(m); return m;
        };

        // ---------- 1. cielo (sfera senza nebbia) con il gradiente di fine pomeriggio delle foto
        const skyC = document.createElement('canvas');
        skyC.width = 4; skyC.height = 512;
        const sg = skyC.getContext('2d');
        const grad = sg.createLinearGradient(0, 0, 0, 512);
        grad.addColorStop(0.0, '#2f62b0');
        grad.addColorStop(0.32, '#5f95d6');
        grad.addColorStop(0.47, '#a9c8e6');
        grad.addColorStop(0.5, '#efdcc2');      // orizzonte caldo
        grad.addColorStop(0.53, '#d9d2c4');
        grad.addColorStop(1.0, '#c8c2b4');
        sg.fillStyle = grad; sg.fillRect(0, 0, 4, 512);
        const skyTex = new THREE.CanvasTexture(skyC);
        const sky = new THREE.Mesh(new THREE.SphereGeometry(280, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
        sky.position.y = -10;
        sky.renderOrder = -10;
        targetGroup.add(sky);

        // ---------- 2. terreno: prato secco tutto attorno, piazzale in cemento attorno alla pista
        const ground = new THREE.Mesh(new THREE.CircleGeometry(270, 48), std(0xa39a72, 1.0));
        ground.rotation.x = -Math.PI / 2; ground.position.y = -0.04;
        targetGroup.add(ground);
        const pav = new THREE.Mesh(new THREE.PlaneGeometry(62, 104), std(0x9b9a95, 0.95));
        pav.rotation.x = -Math.PI / 2; pav.position.set(-2, -0.02, -4);
        targetGroup.add(pav);
        const road = new THREE.Mesh(new THREE.PlaneGeometry(10, 240), std(0x55575a, 0.9));
        road.rotation.x = -Math.PI / 2; road.position.set(-58, -0.03, 0);
        targetGroup.add(road);

        // ---------- 3. recinzione: pali ocra, telo frangivento verde scuro in basso, rete metallica sopra
        const postMat = std(0x8f7a3e, 0.7, { metalness: 0.3 });
        const windTex = loadFileTexture(T + 'windscreen.jpg', { wrap: true });
        const windMat = new THREE.MeshStandardMaterial({ map: windTex, roughness: 0.95, side: THREE.DoubleSide });
        const meshTex = loadFileTexture('assets/textures/kraken_camaiore/net_white.png', { wrap: true });
        const chainMat = new THREE.MeshBasicMaterial({ map: meshTex, color: 0x8d9294, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, depthWrite: false, opacity: 0.7 });
        const metreUV = (g, w, h, cell) => {                      // UV in metri: la texture ripete ogni "cell"
            const uv = g.attributes.uv;
            for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / cell, uv.getY(i) * h / cell);
            return g;
        };
        const FH = 4.2, WSH = 1.8;
        const fence = (x0, z0, x1, z1) => {
            const len = Math.hypot(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, ry = Math.atan2(-(z1 - z0), x1 - x0);
            const w = new THREE.Mesh(metreUV(new THREE.PlaneGeometry(len, WSH), len, WSH, 2), windMat);
            w.position.set(cx, WSH / 2, cz); w.rotation.y = ry; targetGroup.add(w);
            const c = new THREE.Mesh(metreUV(new THREE.PlaneGeometry(len, FH - WSH), len, FH - WSH, 0.08), chainMat);
            c.position.set(cx, (FH + WSH) / 2, cz); c.rotation.y = ry; targetGroup.add(c);
            const bm = [[V(x0, FH, z0), V(x1, FH, z1), 0.035]];
            const n = Math.max(1, Math.round(len / 3));
            for (let i = 0; i <= n; i++) {
                const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
                bm.push([V(x, 0, z), V(x, FH + 0.1, z), 0.06]);
            }
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry(bm), postMat));
        };
        const FX = 22.2, FZ = 40.2, WX = -26.5;
        fence(-FX + 0.1, -FZ, FX, -FZ);          // nord, davanti alla chiesa
        fence(FX, -FZ, FX, FZ);                  // est, verso i condomini
        fence(WX, FZ, FX, FZ);                   // sud
        fence(WX, -FZ + 6, WX, FZ);              // ovest, dietro il pubblico
        fence(WX, -FZ + 6, -FX + 0.1, -FZ);      // raccordo nord-ovest
        // ringhiera bassa davanti al pubblico (lato ovest), a ridosso della balaustra
        const railMat = std(0xc8ccce, 0.4, { metalness: 0.6 });
        const RX = -21.7, rail = [[V(RX, 1.15, -24), V(RX, 1.15, 24), 0.03], [V(RX, 0.6, -24), V(RX, 0.6, 24), 0.025]];
        for (let z = -24; z <= 24.01; z += 2) rail.push([V(RX, 0, z), V(RX, 1.15, z), 0.03]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rail), railMat));

        // ---------- 4. grande rete paravento verde sulla testata sud (e sul primo tratto del lato est)
        const greenNet = new THREE.MeshBasicMaterial({ map: meshTex, color: 0x2f7a46, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide, depthWrite: false, opacity: 0.55 });
        const NETH = 11.5;
        const bigNet = (x0, z0, x1, z1) => {
            const len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0);
            const m = new THREE.Mesh(metreUV(new THREE.PlaneGeometry(len, NETH - FH), len, NETH - FH, 0.12), greenNet);
            m.position.set((x0 + x1) / 2, (NETH + FH) / 2, (z0 + z1) / 2); m.rotation.y = ry; targetGroup.add(m);
            const pl = [[V(x0, NETH, z0), V(x1, NETH, z1), 0.02]];
            const n = Math.max(1, Math.round(len / 8));
            for (let i = 0; i <= n; i++) { const t = i / n; pl.push([V(x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t), V(x0 + (x1 - x0) * t, NETH + 0.2, z0 + (z1 - z0) * t), 0.09]); }
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry(pl), std(0x3a4a3e, 0.6, { metalness: 0.4 })));
        };
        bigNet(-22, FZ + 0.1, FX, FZ + 0.1);
        bigNet(FX + 0.1, 26, FX + 0.1, FZ);

        // ---------- 5. torri faro (pali zincati alti con i proiettori puntati verso la pista)
        const galv = std(0xbcc1c5, 0.35, { metalness: 0.75 });
        const headMat = std(0x2a2c30, 0.5, { metalness: 0.4 });
        const lensMat = new THREE.MeshBasicMaterial({ color: 0xfff6e0 });
        const masts = [];
        [[FX + 1.2, 1], [WX - 0.8, -1]].forEach(([x, side]) => [-27, 0, 27].forEach(z => masts.push([x, z, side])));
        masts.forEach(([x, z, side]) => {
            const H = 14;
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, H, 10), galv);
            pole.position.set(x, H / 2, z); targetGroup.add(pole);
            const head = new THREE.Group();
            head.position.set(x - side * 0.4, H + 0.1, z);
            head.rotation.z = side * 0.55;                        // inclinato verso la pista
            const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.75, 0.9), headMat);
            const l = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.78), lensMat);
            l.rotation.y = -side * Math.PI / 2; l.position.x = -side * 0.15;
            head.add(b, l);
            targetGroup.add(head);
        });

        // lampioni stradali con il braccio ricurvo, lungo la strada (ovest) e a sud
        const lampPts = [];
        for (let z = -60; z <= 60; z += 20) lampPts.push([-53, z, 1]);
        for (let x = -40; x <= 20; x += 20) lampPts.push([x, 52, 0]);
        lampPts.forEach(([x, z, dirX]) => {
            const H = 8;
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, H, 8), galv);
            pole.position.set(x, H / 2, z); targetGroup.add(pole);
            const arm = new THREE.Mesh(new THREE.BoxGeometry(dirX ? 1.4 : 0.08, 0.08, dirX ? 0.08 : 1.4), galv);
            arm.position.set(x + (dirX ? -0.7 : 0), H, z + (dirX ? 0 : 0.7)); targetGroup.add(arm);
            const lh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.25), headMat);
            lh.position.set(x + (dirX ? -1.4 : 0), H - 0.05, z + (dirX ? 0 : 1.4)); targetGroup.add(lh);
        });

        // ---------- 6. la chiesa bianca a nord: blocco a tre piani, campanili cilindrici e corona di lamelle
        const facTex = loadFileTexture(T + 'church_facade.jpg', { repeat: [2, 1] });
        const facMat = new THREE.MeshStandardMaterial({ map: facTex, roughness: 0.9 });
        const plaster = std(0xe8e8e4, 0.9);
        const CH = 9.2, CZ = -52, CL = 54, CD = 12, CXc = -4;
        const church = new THREE.Mesh(new THREE.BoxGeometry(CL, CH, CD), [plaster, plaster, plaster, plaster, facMat, facMat]);
        church.position.set(CXc, CH / 2, CZ); targetGroup.add(church);
        box(plaster, CL + 0.3, 0.5, CD + 0.3, CXc, CH + 0.25, CZ);                  // parapetto del tetto
        box(std(0x8e8e8a, 0.9), CL - 1, 0.1, CD - 1, CXc, CH + 0.05, CZ);
        // ingresso con il portico a pilastri (angolo ovest)
        box(plaster, 3.2, 3.0, 1.6, CXc - CL / 2 + 3.2, 1.5, CZ + CD / 2 + 0.8);
        box(std(0xcf9c5a, 0.6), 1.6, 2.4, 0.1, CXc - CL / 2 + 3.2, 1.2, CZ + CD / 2 + 1.62);
        // campanili: cilindri aperti con il vano delle campane
        const towerMat = std(0xe2ded6, 0.85, { side: THREE.DoubleSide });
        const bellMat = std(0x5a4a32, 0.4, { metalness: 0.6 });
        [CXc - 6, CXc + 8].forEach((tx, i) => {
            const tz = CZ - 1.5, R = 2.4, TH = 3.8, y0 = CH + 0.5;
            const lower = new THREE.Mesh(new THREE.CylinderGeometry(R, R, TH * 0.45, 24), towerMat);
            lower.position.set(tx, y0 + TH * 0.225, tz); targetGroup.add(lower);
            const upper = new THREE.Mesh(new THREE.CylinderGeometry(R, R, TH * 0.55, 24, 1, true, Math.PI * (i ? 0.15 : 0.65), Math.PI * 1.2), towerMat);
            upper.position.set(tx, y0 + TH * 0.725, tz); targetGroup.add(upper);
            const top = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.15, R + 0.15, 0.35, 24), towerMat);
            top.position.set(tx, y0 + TH, tz); targetGroup.add(top);
            [-0.6, 0.6].forEach(bx => {
                const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.4, 0.55, 12), bellMat);
                bell.position.set(tx + bx, y0 + TH * 0.62, tz + 0.3); targetGroup.add(bell);
            });
        });
        // corona di lamelle scure ricurve con la croce in cima, tra i due campanili
        const finMat = std(0x4a2e1e, 0.6, { metalness: 0.3 });
        const crownX = CXc + 1, crownZ = CZ - 1.5, cy0 = CH + 0.4, NF = lowQ ? 12 : 18;
        const fins = [];
        for (let i = 0; i < NF; i++) {
            const a = (i / NF) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
            const pts = [[1.9, 0], [1.4, 0.9], [1.0, 2.2], [0.8, 3.6], [0.7, 5.2]];
            for (let k = 0; k < pts.length - 1; k++) {
                const [r0, h0] = pts[k], [r1, h1] = pts[k + 1];
                fins.push([V(crownX + ca * r0, cy0 + h0, crownZ + sa * r0), V(crownX + ca * r1, cy0 + h1, crownZ + sa * r1), 0.16]);
            }
        }
        fins.push([V(crownX, cy0 + 5.2, crownZ), V(crownX, cy0 + 7.2, crownZ), 0.08], [V(crownX - 0.5, cy0 + 6.6, crownZ), V(crownX + 0.5, cy0 + 6.6, crownZ), 0.07]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(fins), finMat));
        // gazebo nero accanto alla chiesa
        const gz = new THREE.Group();
        gz.position.set(15, 0, -42.6);
        const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.3, 0.8, 4), std(0x1c1d20, 0.9));
        canopy.rotation.y = Math.PI / 4; canopy.position.y = 2.7; gz.add(canopy);
        [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), std(0x2a2a2a, 0.5)); l.position.set(x, 1.2, z); gz.add(l); });
        targetGroup.add(gz);

        // ---------- 7. condomini a est (mattoni e intonaco beige, tetti a padiglione in coppi)
        const roofMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'roof_tiles.jpg', { repeat: [3, 2] }), roughness: 0.9 });
        const flat = (x, z, w, d, floors, tex) => {
            const H = floors * 3.0;
            const ft = loadFileTexture(T + tex, { repeat: [Math.max(1, Math.round(w / 15)), floors / 4] });
            const fs = loadFileTexture(T + tex, { repeat: [Math.max(1, Math.round(d / 15)), floors / 4] });
            const mFront = new THREE.MeshStandardMaterial({ map: ft, roughness: 0.9 });
            const mSide = new THREE.MeshStandardMaterial({ map: fs, roughness: 0.9 });
            const roofCap = std(0xd8d2c6, 0.9);
            const b = new THREE.Mesh(new THREE.BoxGeometry(d, H, w), [mFront, mFront, roofCap, roofCap, mSide, mSide]);
            b.position.set(x, H / 2, z); targetGroup.add(b);
            const r = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), roofMat);
            r.rotation.y = Math.PI / 4;
            r.scale.set(d * 0.74, 2.2, w * 0.74);
            r.position.set(x, H + 1.1, z); targetGroup.add(r);
        };
        flat(40, -34, 16, 12, 4, 'flats_brick.jpg');
        flat(38, -10, 18, 12, 3, 'flats_beige.jpg');
        flat(41, 14, 16, 12, 4, 'flats_brick.jpg');
        flat(39, 38, 14, 12, 3, 'flats_beige.jpg');
        flat(16, -78, 22, 12, 4, 'flats_brick.jpg');           // dietro la chiesa
        flat(-20, -80, 18, 12, 3, 'flats_beige.jpg');
        flat(-62, -40, 14, 12, 3, 'flats_beige.jpg');          // oltre la strada, a ovest

        // ---------- 8. ulivi (tronchi contorti e chiome a ciuffi) a ovest e a sud
        const olivePos = [];
        const rnd = (a, b) => a + Math.random() * (b - a);
        for (let i = 0; i < (lowQ ? 16 : 30); i++) olivePos.push([rnd(-50, -30), rnd(-38, 46)]);
        for (let i = 0; i < (lowQ ? 8 : 16); i++) olivePos.push([rnd(-28, 30), rnd(48, 66)]);
        for (let i = 0; i < (lowQ ? 6 : 10); i++) olivePos.push([rnd(-70, -60), rnd(-20, 70)]);
        const BL = 5;
        const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.4, 2.6, 7), std(0x5e5548, 0.95), olivePos.length);
        const blobs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.5, 1), std(0x56653f, 0.95, { flatShading: true }), olivePos.length * BL);
        let bi = 0;
        olivePos.forEach(([x, z], i) => {
            const s = rnd(0.8, 1.3);
            q.setFromEuler(new THREE.Euler(rnd(-0.15, 0.15), rnd(0, 6.3), rnd(-0.15, 0.15)));
            tmpM.compose(V(x, 1.3 * s, z), q, sc.set(s, s, s)); trunks.setMatrixAt(i, tmpM);
            for (let k = 0; k < BL; k++) {
                const a = k / BL * Math.PI * 2 + rnd(0, 1);
                const bs = s * rnd(0.8, 1.25);
                tmpM.compose(V(x + Math.cos(a) * 1.5 * s, (3.0 + rnd(-0.3, 0.8)) * s, z + Math.sin(a) * 1.5 * s), q, sc.set(bs * 1.2, bs * 0.75, bs * 1.2));
                blobs.setMatrixAt(bi++, tmpM);
            }
        });
        trunks.instanceMatrix.needsUpdate = true;
        blobs.instanceMatrix.needsUpdate = true;
        targetGroup.add(trunks, blobs);
        // qualche pino marittimo alto dietro la chiesa (come nelle foto)
        [[-36, -48], [-40, -58], [28, -60]].forEach(([x, z]) => {
            const t = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 8, 7), std(0x5b4636, 0.9)); t.position.set(x, 4, z); targetGroup.add(t);
            const c = new THREE.Mesh(new THREE.SphereGeometry(3.6, 10, 8), std(0x2f4a2a, 0.95, { flatShading: true })); c.scale.set(1.2, 0.55, 1.2); c.position.set(x, 8.6, z); targetGroup.add(c);
        });

        // ---------- 9. la cupola blu del palazzetto vicino, oltre gli ulivi (sud-ovest)
        const dome = new THREE.Mesh(new THREE.SphereGeometry(30, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), std(0x3b84a6, 0.35, { metalness: 0.35 }));
        dome.scale.set(1, 0.42, 1);
        dome.position.set(-92, 0, 58);
        targetGroup.add(dome);
        const ribs = [];
        for (let i = 0; i < 24; i++) {
            const a = i / 24 * Math.PI * 2;
            let prev = null;
            for (let k = 0; k <= 8; k++) {
                const t = k / 8 * Math.PI / 2;
                const p = V(-92 + Math.cos(a) * Math.cos(t) * 30.1, Math.sin(t) * 30.1 * 0.42, 58 + Math.sin(a) * Math.cos(t) * 30.1);
                if (prev) ribs.push([prev, p, 0.12]);
                prev = p;
            }
        }
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(ribs), std(0x6aa9c4, 0.4, { metalness: 0.5 })));
        box(std(0xe6e6e2, 0.9), 64, 2.2, 0.3, -92, 1.1, 58 + 29.7);                  // zoccolo bianco visibile

        // ---------- 10. pubblico in piedi lungo la ringhiera (ovest), rivolto verso la pista (+x)
        const outfits = [0xf8fafc, 0x14244a, 0xc99a2e, 0x6b7280, 0x111114, 0x2563eb, 0xb45309, 0xe5e7eb];
        const jm = outfits.map(c => std(c, 0.65));
        const pantsM = std(0x1e293b, 0.8), handM = std(0xc99178, 0.6), hairM = std(0x2a1d14, 0.8);
        const fan = (x, y, z) => {
            const root = new THREE.Group();
            const mat = jm[Math.floor(Math.random() * jm.length)];
            [-0.11, 0.11].forEach(lz => { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.82, 7), pantsM); lg.position.set(0, 0.41, lz); root.add(lg); });
            const bodyPivot = new THREE.Group();
            bodyPivot.position.set(0, 0.82, 0);
            root.add(bodyPivot);
            const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.55, 10), mat); torso.position.y = 0.27; bodyPivot.add(torso);
            const headGroup = new THREE.Group(); headGroup.position.y = 0.69;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), getRandomPhotoFaceMaterial());
            const hair = new THREE.Mesh(new THREE.SphereGeometry(0.148, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM); hair.position.x = -0.015;
            headGroup.add(head, hair); bodyPivot.add(headGroup);
            const arm = sz => { const ap = new THREE.Group(); ap.position.set(0, 0.48, sz); const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.42, 7), mat); sl.position.y = -0.21; const hd = new THREE.Mesh(new THREE.SphereGeometry(0.05, 7, 7), handM); hd.position.y = -0.44; ap.add(sl, hd); bodyPivot.add(ap); return ap; };
            const leftArmPivot = arm(-0.24), rightArmPivot = arm(0.24);
            root.position.set(x, y, z);
            root.rotation.y = Math.atan2(z, 30) * 0.3 + (Math.random() - 0.5) * 0.3;
            const childLift = maybeMakeCrowdChild(root, headGroup, false);
            targetGroup.add(root);
            crowdMembers.push({ mesh: root, bodyPivot, headGroup, leftArmPivot, rightArmPivot, baseY: y + childLift, phase: Math.random() * Math.PI * 2, standing: true });
        };
        const keep = preset.crowdKeepRatio * crowdAttendanceScale();   // pubblico in base all'importanza della partita (index.html)
        [RX - 0.5, RX - 1.4, RX - 2.3].forEach((x, row) => {
            for (let z = -23; z <= 23; z += 0.7) if (Math.random() < keep * (0.6 - row * 0.15)) fan(x + (Math.random() - 0.5) * 0.25, 0, z + (Math.random() - 0.5) * 0.2);
        });

        // ---------- 11. sostegni del tabellone, montato sulla recinzione nord
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry([[V(-1.8, 0, -FZ - 0.25), V(-1.8, 5.6, -FZ - 0.25), 0.07], [V(1.8, 0, -FZ - 0.25), V(1.8, 5.6, -FZ - 0.25), 0.07]]), galv));
    }

    registerArenaBuilder('kemarin', buildKemarinArchitecture);
})();
