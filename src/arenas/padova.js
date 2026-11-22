// Palazzetto "padova": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // PALARACITI — IMPIANTO POLIFUNZIONALE FILIPPO RACITI, PADOVA (casa dei Ghosts Padova).
    // Grande sala rettangolare: tetto piano in lamiera grecata sorretto da un reticolo spaziale rosso
    // (due ordini di correnti e aste diagonali a piramide) con i fari tondi sui nodi inferiori.
    // Pareti in pannelli di cemento grigio chiaro con i pilastri; a ovest la tribuna a gradoni gialli e,
    // sopra, la passerella coperta con le ringhiere rosse e i lucernari; a est i condotti rossi
    // dell'aria, la fascia di finestre e i cartelli LOCALI / OSPITI sopra le panchine. Pavimento verde
    // attorno alla pista azzurra, striscioni degli sponsor sulle testate.
    // Texture in assets/textures/padova/ (tools/generate_padova_textures.py).
    // =====================================================================
    function buildPadovaArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/padova/';
        const XW = -34, XE = 26, ZN = -44, ZS = 44, CX = (XW + XE) / 2;
        const YB = 15.2, YT = 17.0;                               // correnti inferiori e superiori del reticolo
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        const std = (c, r, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r }, o || {}));
        const tmpM = new THREE.Matrix4();
        // texture ripetuta in metri senza toccare la texture condivisa in cache: UV scalate
        const meterPlane = (mat, w, h, uw, uh) => {
            const g = new THREE.PlaneGeometry(w, h);
            const uv = g.attributes.uv;
            for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / uw, uv.getY(i) * h / uh);
            return new THREE.Mesh(g, mat);
        };
        const place = (m, x, y, z, rotY) => { m.position.set(x, y, z); m.rotation.y = rotY || 0; targetGroup.add(m); return m; };
        const box = (mat, w, h, d, x, y, z) => place(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z);

        // reticolo, tetto e fari: nascosti se una telecamera sale sopra le correnti inferiori
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: YB - 0.2 };

        // ---------- 1. reticolo spaziale rosso
        const M = lowQ ? 4.5 : 3.0;
        const nx = Math.round((XE - XW) / M), nz = Math.round((ZS - ZN) / M);
        const mx = (XE - XW) / nx, mz = (ZS - ZN) / nz;
        const top = (i, j) => V(XW + i * mx, YT, ZN + j * mz);
        const bot = (i, j) => V(XW + (i + 0.5) * mx, YB, ZN + (j + 0.5) * mz);
        const beams = [];
        for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
            if (i < nx) beams.push([top(i, j), top(i + 1, j), 0.1]);
            if (j < nz) beams.push([top(i, j), top(i, j + 1), 0.1]);
        }
        for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
            const b = bot(i, j);
            if (i < nx - 1) beams.push([b, bot(i + 1, j), 0.12]);
            if (j < nz - 1) beams.push([b, bot(i, j + 1), 0.12]);
            beams.push([b, top(i, j), 0.07], [b, top(i + 1, j), 0.07], [b, top(i, j + 1), 0.07], [b, top(i + 1, j + 1), 0.07]);
        }
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(beams), std(0x9c2a2c, 0.55, { metalness: 0.35 })));

        // ---------- 2. tetto in lamiera grecata (sopra il reticolo)
        const roofMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'roof.jpg', { wrap: true }), color: 0xb8bcc0, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide });
        const roof = meterPlane(roofMat, XE - XW, ZS - ZN, 1.0, 4);
        roof.rotation.x = Math.PI / 2;
        roof.position.set(CX, YT + 0.12, 0);
        ceilGroup.add(roof);

        // ---------- 3. fari tondi sui nodi inferiori (uno sì e uno no)
        const spots = [];
        for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) if ((i + j) % 2 === 0) spots.push(bot(i, j));
        const housing = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.32, 0.22, 14), std(0x3a3c40, 0.5, { metalness: 0.4 }), spots.length);
        const lens = new THREE.InstancedMesh(new THREE.CircleGeometry(0.24, 14).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff4dc, side: THREE.DoubleSide }), spots.length);
        spots.forEach((p, k) => {
            tmpM.makeTranslation(p.x, p.y - 0.18, p.z); housing.setMatrixAt(k, tmpM);
            tmpM.makeTranslation(p.x, p.y - 0.3, p.z); lens.setMatrixAt(k, tmpM);
        });
        ceilGroup.add(housing, lens);
        if (!lowQ) {
            const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
            spots.forEach((p, k) => {
                if (k % 3) return;
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff1d6, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(1.8, 1.8, 1);
                spr.position.set(p.x, p.y - 0.45, p.z);
                ceilGroup.add(spr);
            });
        }

        // ---------- 4. pareti in pannelli di cemento, pilastri
        const concMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'concrete.jpg', { wrap: true }), color: 0xf0f0ec, roughness: 0.85, side: THREE.DoubleSide });
        const HW = YT + 0.2;
        place(meterPlane(concMat, ZS - ZN, HW, 2.5, 1.25), XE, HW / 2, 0, -Math.PI / 2);
        place(meterPlane(concMat, XE - XW, HW, 2.5, 1.25), CX, HW / 2, ZN, 0);
        place(meterPlane(concMat, XE - XW, HW, 2.5, 1.25), CX, HW / 2, ZS, Math.PI);
        // parete ovest: solo sopra la passerella (sotto ci sono tribuna e passerella)
        const GY = 3.36, SY = 6.6;                                    // piano della passerella e soletta che la copre
        place(meterPlane(concMat, ZS - ZN, HW - SY, 2.5, 1.25), XW, (HW + SY) / 2, 0, Math.PI / 2);
        const pil = std(0xd8d8d4, 0.8);
        for (let z = -42; z <= 42.01; z += 6) {
            box(pil, 0.7, HW, 0.8, XE - 0.35, HW / 2, z);
            box(pil, 0.7, HW - SY, 0.8, XW + 0.35, (HW + SY) / 2, z);
        }
        for (let x = XW + 6; x < XE; x += 6) { box(pil, 0.8, HW, 0.7, x, HW / 2, ZN + 0.35); box(pil, 0.8, HW, 0.7, x, HW / 2, ZS - 0.35); }

        // ---------- 5. pavimento verde attorno alla pista
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(XE - XW, ZS - ZN), std(0x2f8a4c, 0.7));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(CX, -0.01, 0);
        targetGroup.add(apron);

        // ---------- 6. tribuna a ovest: gradoni gialli, passerella coperta con le ringhiere rosse
        const ROWS = 8, DEPTH = 0.85, RISE = GY / ROWS, FX = -21.6, Z0 = -32, Z1 = 32, LEN = Z1 - Z0;
        const riser = std(0xcfcfca, 0.85), yellow = std(0xe8c01c, 0.55);
        for (let r = 0; r < ROWS; r++) {
            const h = RISE * (r + 1), fx = FX - r * DEPTH;
            box(riser, DEPTH, h, LEN, fx - DEPTH / 2, h / 2, 0);
            box(yellow, DEPTH * 0.98, 0.07, LEN, fx - DEPTH / 2, h + 0.035, 0);
        }
        const GX0 = FX - ROWS * DEPTH;                                  // bordo della passerella
        box(riser, GX0 - XW, GY, ZS - ZN - 1, (GX0 + XW) / 2, GY / 2, 0);   // piano della passerella (pieno)
        box(std(0xbdbdb8, 0.85), GX0 - XW + 0.4, 0.5, ZS - ZN - 1, (GX0 + XW) / 2 + 0.2, SY + 0.25, 0);   // soletta
        // lucernari traslucidi sotto la soletta e telo verde sul fondo della passerella
        const sky = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'skylight.jpg', { wrap: true }), emissive: 0xe8d4a0, emissiveIntensity: 0.5, roughness: 0.6, side: THREE.DoubleSide });
        sky.userData.sunWindow = true;            // finestra verso l'esterno: di giorno ci entra il sole (index.html)
        const skyP = meterPlane(sky, GX0 - XW, ZS - ZN - 1, 4, 1.5);
        skyP.rotation.x = Math.PI / 2; skyP.position.set((GX0 + XW) / 2, SY - 0.01, 0); targetGroup.add(skyP);
        const greenNet = new THREE.MeshStandardMaterial({ color: 0x4f7a4a, emissive: 0x6f9a62, emissiveIntensity: 0.35, roughness: 0.9, side: THREE.DoubleSide });
        place(new THREE.Mesh(new THREE.PlaneGeometry(ZS - ZN - 1, SY - GY), greenNet), XW + 0.05, (GY + SY) / 2, 0, Math.PI / 2);
        for (let z = -42; z <= 42.01; z += 6) box(pil, 0.6, SY - GY, 0.6, GX0 + 0.3, (GY + SY) / 2, z);
        const redMat = std(0xc81e24, 0.45, { metalness: 0.35 });
        const rails = [[V(GX0 + 0.05, GY + 1.05, -42), V(GX0 + 0.05, GY + 1.05, 42), 0.06], [V(GX0 + 0.05, GY + 0.5, -42), V(GX0 + 0.05, GY + 0.5, 42), 0.04]];
        for (let z = -42; z <= 42.01; z += 2) rails.push([V(GX0 + 0.05, GY, z), V(GX0 + 0.05, GY + 1.05, z), 0.04]);
        // corrimano rossi lungo le scalette della tribuna
        [-16, 0, 16].forEach(z => rails.push([V(FX, 0.9, z), V(GX0, GY + 0.9, z), 0.05]));
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rails), redMat));

        // ---------- 7. lato est: condotti rossi dell'aria, fascia di finestre, spalliere
        const duct = std(0xb82228, 0.5, { metalness: 0.3 });
        box(duct, 1.3, 1.1, 82, XE - 1.0, 11.2, 0);
        [-24, 0, 24].forEach(z => {
            box(duct, 1.1, 4.4, 1.6, XE - 1.0, 8.6, z);
            box(std(0x7a1418, 0.6), 1.12, 0.6, 1.62, XE - 1.0, 6.7, z);     // bocchetta
        });
        const winMat = new THREE.MeshStandardMaterial({ color: 0xcfe0d8, emissive: 0xb6cfc4, emissiveIntensity: 0.5, roughness: 0.3, side: THREE.DoubleSide });
        winMat.userData.sunWindow = true;            // finestra verso l'esterno: di giorno ci entra il sole (index.html)
        place(new THREE.Mesh(new THREE.PlaneGeometry(ZS - ZN - 4, 1.8), winMat), XE - 0.05, 7.6, 0, -Math.PI / 2);
        const mull = [];
        for (let z = -40; z <= 40.01; z += 2.5) mull.push([V(XE - 0.08, 6.7, z), V(XE - 0.08, 8.5, z), 0.07]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(mull), std(0x55585c, 0.5, { metalness: 0.4 })));
        const wood = std(0xc89a5c, 0.6);
        const wallBars = (x, z0, rot) => {
            const bars = [];
            for (let k = 0; k <= 4; k++) { const z = z0 + k * 0.9; bars.push([V(0, 0, z), V(0, 2.6, z), 0.08]); }
            for (let y = 0.3; y <= 2.5; y += 0.16) bars.push([V(0, y, z0), V(0, y, z0 + 3.6), 0.035]);
            const m = new THREE.Mesh(mergeBeamGeometry(bars), wood);
            m.position.set(x, 0, 0); m.rotation.y = rot || 0;
            targetGroup.add(m);
        };
        wallBars(XE - 0.15, 26);
        wallBars(XE - 0.15, -30);

        // ---------- 8. striscioni, cartelli e uscite
        const bMats = {};
        const bMat = f => bMats[f] || (bMats[f] = (() => { const t = loadFileTexture(T + f); return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.12, roughness: 0.85, side: THREE.DoubleSide }); })());
        const banner = (f, w, h, x, y, z, rotY) => place(new THREE.Mesh(new THREE.PlaneGeometry(w, h), bMat(f)), x, y, z, rotY);
        const E = -Math.PI / 2;
        banner('banner_ghosts.jpg', 7.0, 2.0, XE - 0.1, 5.0, 0, E);                  // sopra le panchine
        banner('sign_locali.jpg', 2.4, 0.6, XE - 0.1, 3.3, -9.5, E);
        banner('sign_ospiti.jpg', 2.4, 0.6, XE - 0.1, 3.3, 9.5, E);
        banner('banner_coppa.jpg', 4.2, 1.65, XE - 0.1, 2.6, -21, E);
        banner('banner_coppa.jpg', 4.2, 1.65, XE - 0.1, 2.6, 20, E);
        // testata sud: sponsor (foto della premiazione)
        const S = Math.PI, zs = ZS - 0.1;
        banner('banner_panasonic.jpg', 7.0, 1.6, -11, 4.6, zs, S);
        banner('banner_4clima.jpg', 5.0, 1.55, -11.5, 2.8, zs, S);
        banner('banner_forclima.jpg', 5.6, 1.5, -2, 4.4, zs, S);
        banner('banner_advertendo.jpg', 3.6, 1.05, -4.5, 2.7, zs, S);
        banner('banner_4elettro.jpg', 3.2, 1.36, 8, 4.4, zs, S);
        banner('banner_bedeschi.jpg', 3.4, 0.98, 3, 2.7, zs, S);
        // testata nord: Coppa Italia e i Ghosts ai lati del tabellone
        banner('banner_coppa.jpg', 4.2, 1.65, -12, 2.8, ZN + 0.1, 0);
        banner('banner_coppa.jpg', 4.2, 1.65, 12, 2.8, ZN + 0.1, 0);
        banner('banner_ghosts.jpg', 5.6, 1.6, -9, 7.4, ZN + 0.1, 0);
        // porte d'uscita rosse sulle testate
        const doorMat = std(0xb01c22, 0.5, { metalness: 0.3 });
        [[-20, ZN + 0.06, 0], [20, ZN + 0.06, 0], [-24, ZS - 0.06, S], [18, ZS - 0.06, S]].forEach(([x, z, r]) => {
            const d = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.4, 0.08), doorMat);
            place(d, x, 1.2, z, r);
        });

        // ---------- 9. pubblico: seduto sui gradoni e in piedi sulla passerella
        const outfits = [0x161616, 0xc8102e, 0xf8fafc, 0x6b7280, 0x1e3a8a, 0x7c2d12, 0x374151, 0x5c1a24];
        const jm = outfits.map(c => std(c, 0.65));
        const pantsM = std(0x1e293b, 0.8), handM = std(0xc99178, 0.6), hairM = std(0x2a1d14, 0.8);
        const fan = (x, y, z, seated) => {
            const root = new THREE.Group();
            const mat = jm[Math.floor(Math.random() * jm.length)];
            const bodyPivot = new THREE.Group();
            if (seated) {
                [-0.11, 0.11].forEach(lz => {
                    const th = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.072, 0.36, 7), pantsM); th.rotation.z = Math.PI / 2; th.position.set(0.14, 0.36, lz);
                    const cf = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.062, 0.38, 7), pantsM); cf.position.set(0.3, 0.19, lz);
                    root.add(th, cf);
                });
                bodyPivot.position.set(-0.04, 0.38, 0);
            } else {
                [-0.11, 0.11].forEach(lz => { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.82, 7), pantsM); lg.position.set(0, 0.41, lz); root.add(lg); });
                bodyPivot.position.set(0, 0.82, 0);
            }
            root.add(bodyPivot);
            const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.55, 10), mat); torso.position.y = 0.27; bodyPivot.add(torso);
            const headGroup = new THREE.Group(); headGroup.position.y = 0.69;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), getRandomPhotoFaceMaterial());
            const hair = new THREE.Mesh(new THREE.SphereGeometry(0.148, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM); hair.position.x = -0.015;
            headGroup.add(head, hair); bodyPivot.add(headGroup);
            const arm = sz => { const ap = new THREE.Group(); ap.position.set(0, 0.48, sz); const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.42, 7), mat); sl.position.y = -0.21; const hd = new THREE.Mesh(new THREE.SphereGeometry(0.05, 7, 7), handM); hd.position.y = -0.44; ap.add(sl, hd); bodyPivot.add(ap); return ap; };
            const leftArmPivot = arm(-0.24), rightArmPivot = arm(0.24);
            root.position.set(x, y, z);
            root.rotation.y = Math.atan2(z, 40) * 0.3 + (Math.random() - 0.5) * 0.2;
            const childLift = maybeMakeCrowdChild(root, headGroup, seated);
            targetGroup.add(root);
            crowdMembers.push({ mesh: root, bodyPivot, headGroup, leftArmPivot, rightArmPivot, baseY: y + childLift, phase: Math.random() * Math.PI * 2, standing: !seated });
        };
        const keep = preset.crowdKeepRatio;
        for (let r = 0; r < ROWS; r++) {
            const h = RISE * (r + 1) + 0.07, fx = FX - r * DEPTH;
            for (let z = Z0 + 0.6; z <= Z1 - 0.6; z += 0.66) {
                if ([-16, 0, 16].some(a => Math.abs(z - a) < 0.6)) continue;          // scalette
                if (Math.random() < keep * (0.62 - r * 0.04)) fan(fx - DEPTH + 0.43, h, z + (Math.random() - 0.5) * 0.12, true);
            }
        }
        for (let z = -38; z <= 38; z += 0.8) if (Math.random() < keep * 0.35) fan(GX0 - 0.5 + (Math.random() - 0.5) * 0.3, GY, z + (Math.random() - 0.5) * 0.2, false);
    }

    registerArenaBuilder('padova', buildPadovaArchitecture);
})();
