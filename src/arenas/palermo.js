// Palazzetto "palermo": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // CENTRO SPORTIVO DOPOLAVORO FERROVIARIO "I CICLOPI" (PALERMO) — casa della Phoenix Hockey Palermo.
    // Pista ALL'APERTO (in ARENA_FILE_TEX ha outdoor: true): resina chiara rosata, balaustre basse bianche col piede
    // giallo, in parte con i pannelli di rete grigia. Dietro le panchine (lato est) il padiglione vetrato del bar con
    // gli infissi bianchi, la fascia di vetri alta, il fregio a triangoli e il bordo di coppi; accanto la pensilina
    // verde scuro su pali sottili, il muro in blocchetti con la siepe e la recinzione alta in rete verde. Tutto attorno
    // i condomini alti bianchi, color crema e ocra coi balconi, i lampioni, le torri faro e gli alberi (ficus e pini).
    // Pubblico in piedi lungo la ringhiera sul lato ovest.
    // Texture in assets/textures/palermo/ (tools/generate_palermo_textures.py).
    // =====================================================================
    function buildPalermoArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/palermo/';
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        const tmpM = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
        const std = (color, rough = 0.8, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: rough }, extra || {}));
        const box = (mat, w, h, d, x, y, z, ry = 0) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            m.position.set(x, y, z); m.rotation.y = ry; targetGroup.add(m); return m;
        };
        const beams = (list, mat) => targetGroup.add(new THREE.Mesh(mergeBeamGeometry(list), mat));
        const rnd = (a, b) => a + Math.random() * (b - a);

        // ---------- 1. cielo terso del sud (sfera senza nebbia)
        const skyC = document.createElement('canvas');
        skyC.width = 4; skyC.height = 512;
        const sg = skyC.getContext('2d');
        const grad = sg.createLinearGradient(0, 0, 0, 512);
        grad.addColorStop(0.0, '#2c6cc4');
        grad.addColorStop(0.3, '#5a9ade');
        grad.addColorStop(0.47, '#b6d4ee');
        grad.addColorStop(0.5, '#e6eef2');
        grad.addColorStop(0.53, '#d8d4cc');
        grad.addColorStop(1.0, '#c4beb2');
        sg.fillStyle = grad; sg.fillRect(0, 0, 4, 512);
        const sky = new THREE.Mesh(new THREE.SphereGeometry(280, 32, 16), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(skyC), side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
        sky.position.y = -10;
        sky.renderOrder = -10;
        targetGroup.add(sky);

        // ---------- 2. terreno: asfalto delle strade, piazzale chiaro attorno alla pista
        const ground = new THREE.Mesh(new THREE.CircleGeometry(270, 48), std(0x6a6966, 0.95));
        ground.rotation.x = -Math.PI / 2; ground.position.y = -0.04;
        targetGroup.add(ground);
        const pav = new THREE.Mesh(new THREE.PlaneGeometry(66, 96), std(0xb4aca4, 0.92));
        pav.rotation.x = -Math.PI / 2; pav.position.set(2, -0.02, 0);
        targetGroup.add(pav);

        // ---------- 3. recinzione alta in rete verde (testate e lato est oltre la pensilina), ringhiera a ovest
        const meshTex = loadFileTexture('assets/textures/kraken_camaiore/net_white.png', { wrap: true });
        const greenNet = new THREE.MeshBasicMaterial({ map: meshTex, color: 0x3d7a4c, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide, depthWrite: false, opacity: 0.7 });
        const postMat = std(0x2f5a3a, 0.6, { metalness: 0.4 });
        const metreUV = (g, w, h, cell) => {
            const uv = g.attributes.uv;
            for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / cell, uv.getY(i) * h / cell);
            return g;
        };
        const fence = (x0, z0, x1, z1, H) => {
            const len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0);
            const m = new THREE.Mesh(metreUV(new THREE.PlaneGeometry(len, H), len, H, 0.08), greenNet);
            m.position.set((x0 + x1) / 2, H / 2, (z0 + z1) / 2); m.rotation.y = ry; targetGroup.add(m);
            const pl = [[V(x0, H, z0), V(x1, H, z1), 0.04], [V(x0, H * 0.5, z0), V(x1, H * 0.5, z1), 0.03]];
            const n = Math.max(1, Math.round(len / 3));
            for (let i = 0; i <= n; i++) { const t = i / n; pl.push([V(x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t), V(x0 + (x1 - x0) * t, H + 0.05, z0 + (z1 - z0) * t), 0.06]); }
            beams(pl, postMat);
        };
        const FX = 22.4, FZ = 40.6, WX = -25.5;
        fence(WX, -FZ, FX, -FZ, 6.5);              // nord
        fence(WX, FZ, FX, FZ, 6.5);                // sud
        fence(FX + 9, 22, FX + 9, FZ, 6.5);        // est, dietro la pensilina e fino all'angolo
        fence(FX, FZ, FX + 9, FZ, 6.5);
        fence(FX, -FZ, FX + 9, -FZ, 6.5);
        fence(FX + 9, -FZ, FX + 9, -25, 6.5);
        fence(WX, -FZ, WX, FZ, 3.2);               // ovest, dietro il pubblico (più bassa)
        const railMat = std(0xc8ccce, 0.4, { metalness: 0.6 });
        const RX = -21.6, rail = [[V(RX, 1.1, -26), V(RX, 1.1, 26), 0.035], [V(RX, 0.55, -26), V(RX, 0.55, 26), 0.025]];
        for (let z = -26; z <= 26.01; z += 2) rail.push([V(RX, 0, z), V(RX, 1.1, z), 0.035]);
        beams(rail, railMat);

        // ---------- 4. padiglione vetrato del bar (est, dietro le panchine): vetrate scure, infissi bianchi,
        // fascia di vetri alta, fregio a triangoli e bordo in coppi
        const PX0 = 24.2, PD = 7.5, PZ0 = -24, PZ1 = 8, PH = 4.4;
        const glass = std(0x7d8e9c, 0.1, { metalness: 0.35 });          // vetri chiari che riflettono il cielo
        const white = std(0xeef0f0, 0.45, { metalness: 0.15 });
        box(std(0xdcdad4, 0.9), PD, PH, PZ1 - PZ0, PX0 + PD / 2 + 0.05, PH / 2, (PZ0 + PZ1) / 2);   // volume interno
        const gl = new THREE.Mesh(new THREE.PlaneGeometry(PZ1 - PZ0, PH - 0.3), glass);
        gl.rotation.y = -Math.PI / 2; gl.position.set(PX0 - 0.02, 0.15 + (PH - 0.3) / 2, (PZ0 + PZ1) / 2);
        targetGroup.add(gl);
        [PZ0, PZ1].forEach(z => {                                 // vetrate sui fianchi
            const g2 = new THREE.Mesh(new THREE.PlaneGeometry(PD, PH - 0.3), glass);
            g2.position.set(PX0 + PD / 2, 0.15 + (PH - 0.3) / 2, z + (z === PZ0 ? -0.02 : 0.02));
            if (z === PZ0) g2.rotation.y = Math.PI;
            targetGroup.add(g2);
        });
        const fr = [];
        const fx = PX0 - 0.06;
        const mullions = Math.round((PZ1 - PZ0) / 2.6);
        for (let i = 0; i <= mullions; i++) {
            const z = PZ0 + (PZ1 - PZ0) * i / mullions;
            fr.push([V(fx, 0, z), V(fx, PH, z), 0.13]);
            if (i < mullions) fr.push([V(fx, 0, z + 1.3), V(fx, PH - 1.25, z + 1.3), 0.06]);   // montante intermedio
        }
        [0.12, PH - 1.25, PH - 0.62, PH].forEach(y => fr.push([V(fx, y, PZ0), V(fx, y, PZ1), y === PH - 0.62 ? 0.06 : 0.14]));
        [PZ0, PZ1].forEach(z => {
            const zz = z + (z === PZ0 ? -0.06 : 0.06);
            fr.push([V(PX0, PH - 1.25, zz), V(PX0 + PD, PH - 1.25, zz), 0.1], [V(PX0 + PD, 0, zz), V(PX0 + PD, PH, zz), 0.13]);
        });
        // fregio a triangoli sotto la gronda (sulla parte verso la pensilina)
        for (let z = PZ1 - 12; z < PZ1 - 0.01; z += 1.2) {
            fr.push([V(fx - 0.04, PH - 0.62, z), V(fx - 0.04, PH - 0.05, z + 0.6), 0.04], [V(fx - 0.04, PH - 0.05, z + 0.6), V(fx - 0.04, PH - 0.62, z + 1.2), 0.04]);
        }
        beams(fr, white);
        const roofSlab = box(std(0xd8d8d4, 0.85), PD + 1.0, 0.22, PZ1 - PZ0 + 1.0, PX0 + PD / 2 - 0.3, PH + 0.11, (PZ0 + PZ1) / 2);
        roofSlab.castShadow = !lowQ;
        // bordo di coppi rossi lungo la gronda
        const tileMat = std(0xa04a34, 0.8);
        const eave = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, PZ1 - PZ0 + 1.0, 8, 1, false, 0, Math.PI), tileMat);
        eave.rotation.x = Math.PI / 2; eave.position.set(PX0 - 0.8, PH + 0.24, (PZ0 + PZ1) / 2);
        targetGroup.add(eave);
        // tavolini e sedie dentro, appena visibili dietro i vetri
        const tabM = std(0xf2f2ee, 0.6);
        for (let z = PZ0 + 2.5; z < PZ1 - 1; z += 4) {
            box(tabM, 0.8, 0.05, 0.8, PX0 + 2.2, 0.75, z);
            box(std(0x9a9a9a, 0.5, { metalness: 0.5 }), 0.06, 0.75, 0.06, PX0 + 2.2, 0.375, z);
        }

        // ---------- 5. pensilina verde scuro su pali sottili (accanto al bar), muro in blocchetti e siepe
        const CX0 = PX0 + 0.4, CZ0 = PZ1 + 0.4, CZ1 = 22, CD = 6.5;
        const canopyMat = std(0x2d4a3a, 0.6, { metalness: 0.35, side: THREE.DoubleSide });
        const can = new THREE.Mesh(new THREE.BoxGeometry(CD, 0.08, CZ1 - CZ0), canopyMat);
        can.position.set(CX0 + CD / 2, 3.55, (CZ0 + CZ1) / 2);
        can.rotation.z = -0.07;                                    // falda appena inclinata verso l'esterno
        targetGroup.add(can);
        const cp = [];
        [CZ0 + 0.2, (CZ0 + CZ1) / 2, CZ1 - 0.2].forEach(z => {
            cp.push([V(CX0 + 0.1, 0, z), V(CX0 + 0.1, 3.75, z), 0.08], [V(CX0 + CD - 0.2, 0, z), V(CX0 + CD - 0.2, 3.3, z), 0.08]);
        });
        cp.push([V(CX0 + 0.1, 3.72, CZ0), V(CX0 + 0.1, 3.72, CZ1), 0.1]);
        beams(cp, std(0x24382c, 0.5, { metalness: 0.5 }));
        const wallMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'blocks.jpg', { repeat: [(CZ1 - CZ0) / 4, 1] }), roughness: 0.95 });
        box(wallMat, 0.3, 2.4, CZ1 - CZ0, CX0 + CD + 1.0, 1.2, (CZ0 + CZ1) / 2);
        const hedgeMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'hedge.jpg', { repeat: [(CZ1 - CZ0) / 3, 1] }), roughness: 1.0 });
        box(hedgeMat, 0.9, 1.6, CZ1 - CZ0 - 1, CX0 + CD + 0.3, 0.8, (CZ0 + CZ1) / 2);

        // ---------- 6. torri faro e lampioni
        const galv = std(0xbcc1c5, 0.35, { metalness: 0.75 });
        const headMat = std(0x2a2c30, 0.5, { metalness: 0.4 });
        const lensMat = new THREE.MeshBasicMaterial({ color: 0xfff6e0 });
        [[FX + 0.9, 1], [WX - 0.6, -1]].forEach(([x, side]) => [-30, 0, 30].forEach(z => {
            const H = 13;
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.15, H, 10), galv);
            pole.position.set(x, H / 2, z); targetGroup.add(pole);
            const head = new THREE.Group();
            head.position.set(x - side * 0.4, H + 0.1, z);
            head.rotation.z = side * 0.55;
            const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.7, 0.85), headMat);
            const l = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.72), lensMat);
            l.rotation.y = -side * Math.PI / 2; l.position.x = -side * 0.15;
            head.add(b, l);
            targetGroup.add(head);
        }));
        const lamps = [];
        for (let z = -60; z <= 60; z += 24) lamps.push([-38, z]);
        for (let x = -20; x <= 40; x += 24) lamps.push([x, -50], [x, 52]);
        lamps.forEach(([x, z]) => {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 9, 8), galv);
            pole.position.set(x, 4.5, z); targetGroup.add(pole);
            box(headMat, 0.6, 0.14, 0.3, x, 9, z);
        });

        // ---------- 7. condomini alti attorno (7-9 piani, tetti piani col parapetto)
        const flats = (x, z, w, d, floors, tex, ry = 0) => {
            const H = floors * 3.0;
            const front = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + tex, { repeat: [Math.max(1, Math.round(w / 12)), floors / 4] }), roughness: 0.9 });
            const side = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + tex, { repeat: [Math.max(1, Math.round(d / 12)), floors / 4] }), roughness: 0.9 });
            const top = std(0xcfcac0, 0.95);
            const b = new THREE.Mesh(new THREE.BoxGeometry(d, H, w), [front, front, top, top, side, side]);
            b.position.set(x, H / 2, z); b.rotation.y = ry; targetGroup.add(b);
            const par = new THREE.Mesh(new THREE.BoxGeometry(d + 0.2, 0.9, w + 0.2), top);
            par.position.set(x, H + 0.45, z); par.rotation.y = ry; targetGroup.add(par);
            // locali tecnici e antenne sul tetto
            box(top, Math.min(4, d * 0.3), 2.2, Math.min(5, w * 0.3), x + rnd(-d / 4, d / 4), H + 1.1, z + rnd(-w / 4, w / 4), ry);
            if (Math.random() < 0.7) beams([[V(x, H, z + w / 4), V(x, H + 3.5, z + w / 4), 0.05]], galv);
        };
        // est, dietro il bar e la pensilina (quelli della foto)
        flats(48, -26, 22, 14, 8, 'flats_white.jpg');
        flats(46, 0, 18, 14, 9, 'flats_cream.jpg');
        flats(49, 24, 20, 14, 8, 'flats_white.jpg');
        flats(44, 50, 16, 12, 7, 'flats_ochre.jpg');
        // nord e sud
        flats(-14, -66, 26, 14, 7, 'flats_cream.jpg');
        flats(16, -64, 22, 14, 9, 'flats_ochre.jpg');
        flats(40, -60, 16, 12, 8, 'flats_white.jpg');
        flats(-10, 66, 24, 14, 8, 'flats_white.jpg');
        flats(20, 70, 22, 14, 7, 'flats_cream.jpg');
        // ovest, oltre la strada
        flats(-60, -30, 24, 14, 7, 'flats_ochre.jpg');
        flats(-62, 4, 22, 14, 8, 'flats_white.jpg');
        flats(-58, 36, 22, 14, 9, 'flats_cream.jpg');

        // ---------- 8. alberi: ficus a chioma larga (nord-est e ovest) e qualche pino domestico
        const treePos = [];
        for (let i = 0; i < (lowQ ? 6 : 10); i++) treePos.push([rnd(-24, 20), rnd(-50, -44)]);
        for (let i = 0; i < (lowQ ? 6 : 10); i++) treePos.push([rnd(-34, -28), rnd(-36, 40)]);
        for (let i = 0; i < (lowQ ? 4 : 7); i++) treePos.push([rnd(-24, 20), rnd(45, 52)]);
        const BL = 6;
        const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.42, 3.2, 7), std(0x5a5046, 0.95), treePos.length);
        const blobs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.7, 1), std(0x2f4f2c, 0.95, { flatShading: true }), treePos.length * BL);
        let bi = 0;
        treePos.forEach(([x, z], i) => {
            const s = rnd(0.9, 1.4);
            q.setFromEuler(new THREE.Euler(rnd(-0.1, 0.1), rnd(0, 6.3), rnd(-0.1, 0.1)));
            tmpM.compose(V(x, 1.6 * s, z), q, sc.set(s, s, s)); trunks.setMatrixAt(i, tmpM);
            for (let k = 0; k < BL; k++) {
                const a = k / BL * Math.PI * 2 + rnd(0, 1), bs = s * rnd(0.9, 1.3);
                tmpM.compose(V(x + Math.cos(a) * 1.8 * s, (3.8 + rnd(-0.3, 1.2)) * s, z + Math.sin(a) * 1.8 * s), q, sc.set(bs * 1.25, bs * 0.8, bs * 1.25));
                blobs.setMatrixAt(bi++, tmpM);
            }
        });
        trunks.instanceMatrix.needsUpdate = true;
        blobs.instanceMatrix.needsUpdate = true;
        targetGroup.add(trunks, blobs);
        [[-40, -48], [-44, 20], [34, -46], [36, 46]].forEach(([x, z]) => {
            const t = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 10, 7), std(0x6a5040, 0.9)); t.position.set(x, 5, z); targetGroup.add(t);
            const c = new THREE.Mesh(new THREE.SphereGeometry(4, 10, 8), std(0x2c4a2a, 0.95, { flatShading: true })); c.scale.set(1.25, 0.45, 1.25); c.position.set(x, 10.6, z); targetGroup.add(c);
        });

        // ---------- 9. pubblico in piedi lungo la ringhiera (ovest), rivolto verso la pista (+x)
        const outfits = [0xf8fafc, 0xe86ca6, 0x141416, 0x6b7280, 0x2563eb, 0xf6c4dc, 0xe5e7eb, 0x1e3a5f];
        const jm = outfits.map(c => std(c, 0.65));
        const pantsM = std(0x1e293b, 0.8), handM = std(0xc99178, 0.6), hairM = std(0x1f1610, 0.8);
        const fan = (x, y, z) => {
            const root = new THREE.Group();
            const mat = jm[Math.floor(Math.random() * jm.length)];
            [-0.11, 0.11].forEach(lz => { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.82, 7), pantsM); lg.position.set(0, 0.41, lz); root.add(lg); });
            const bodyPivot = new THREE.Group();
            bodyPivot.position.set(0, 0.82, 0);
            root.add(bodyPivot);
            const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.55, 10), mat); torso.position.y = 0.27; bodyPivot.add(torso);
            const headGroup = new THREE.Group(); headGroup.position.y = 0.69;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), getCrowdHeadPlaceholderMaterial());
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
        const keep = preset.crowdKeepRatio * crowdAttendanceScale();
        [RX - 0.5, RX - 1.4, RX - 2.3].forEach((x, row) => {
            for (let z = -25; z <= 25; z += 0.7) if (Math.random() < keep * (0.6 - row * 0.15)) fan(x + (Math.random() - 0.5) * 0.25, 0, z + (Math.random() - 0.5) * 0.2);
        });

        // ---------- 10. sostegni del tabellone, davanti alla recinzione nord
        beams([[V(-1.8, 0, -FZ + 0.3), V(-1.8, 5.6, -FZ + 0.3), 0.07], [V(1.8, 0, -FZ + 0.3), V(1.8, 5.6, -FZ + 0.3), 0.07]], galv);
    }

    registerArenaBuilder('palermo', buildPalermoArchitecture);
})();
