// Palazzetto "edera_trieste": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, arenaSwayItems, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // PATTINODROMO EDERA — TRIESTE. Capannone basso con copertura reticolare in acciaio
    // grigio, pareti in intonaco azzurro con finestre a nastro dal telaio verde,
    // reti di protezione scure appese al tetto, grande vetrata sugli alberi dietro la
    // tribunetta in legno con le ringhiere arancioni, vetro sopra la balaustra davanti
    // alla tribuna, balaustre bianche con zoccolo blu, bandiere italiana e slovena,
    // striscioni ZKB e ZSŠDI. Il tetto basso si nasconde quando la camera sale sopra.
    // Texture in assets/textures/edera_trieste/ (tools/generate_edera_trieste_textures.py).
    // =====================================================================
    function buildEderaTriesteArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/edera_trieste/';
        // pareti alte 8 m; copertura reticolare a due falde: gronda a 9 m, colmo a 15,5 m
        // (abbastanza alta da tenere dentro le telecamere di gioco)
        const XW = -29.0, XE = 23.5, HL = 39.5, WALL_H = 8.0, EAVE = 9.0, RIDGE = 15.5;
        const CX = (XW + XE) / 2, LX = XE - XW;
        const roofY = x => EAVE + (RIDGE - EAVE) * (1 - Math.abs(x - CX) / (LX / 2));
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        const steelMat = new THREE.MeshStandardMaterial({ color: 0x8e959c, roughness: 0.45, metalness: 0.55 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.5, metalness: 0.3 });
        const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf07a22, roughness: 0.45, metalness: 0.35 });
        const texMat = (file, rx, ry, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ map: loadFileTexture(T + file, { repeat: [rx, ry] }), roughness: 0.88, side: THREE.DoubleSide }, extra));
        const plane = (mat, w, h, x, y, z, rotY) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = rotY; targetGroup.add(m); return m; };

        // ---------- 1. pareti
        const wallMat = texMat('wall_blue.jpg', 1, 1);
        // lato panchine (+x): intonaco, fascia di finestre a nastro, intonaco
        plane(texMat('wall_blue.jpg', 2 * HL / 4, 5.6 / 4), 2 * HL, 5.6, XE, 2.8, 0, -Math.PI / 2);
        const winTex = texMat('ribbon_window.jpg', 2 * HL / 2.4, 1, { emissive: 0xe6f2fa, emissiveIntensity: 0.55 });
        winTex.emissiveMap = winTex.map;
        plane(winTex, 2 * HL, 1.8, XE, 6.5, 0, -Math.PI / 2);
        plane(texMat('wall_blue.jpg', 2 * HL / 4, 0.6 / 4), 2 * HL, 0.6, XE, 7.7, 0, -Math.PI / 2);
        // lato tribuna (-x): vetrata a tutta altezza sugli alberi
        const facade = texMat('facade_glass.jpg', 2 * HL / 3, WALL_H / 3, { emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.25 });
        facade.emissiveMap = facade.map;
        plane(facade, 2 * HL, WALL_H, XW, WALL_H / 2, 0, Math.PI / 2);
        // testate in intonaco azzurro
        [-1, 1].forEach(dir => plane(texMat('wall_blue.jpg', LX / 4, WALL_H / 4), LX, WALL_H, CX, WALL_H / 2, dir * HL, dir > 0 ? Math.PI : 0));
        void wallMat;

        // porte d'uscita con il cartello verde, estintori
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x2f5b45, roughness: 0.5, metalness: 0.3 });
        const doorGlass = new THREE.MeshStandardMaterial({ color: 0xcfe3ee, emissive: 0xbcd8e8, emissiveIntensity: 0.4, roughness: 0.2 });
        const exitMat = new THREE.MeshBasicMaterial({ map: loadFileTexture(T + 'exit_sign.jpg') });
        const redSign = new THREE.MeshBasicMaterial({ color: 0xd92b2b });
        const door = (x, z, rotY, nx, nz) => {
            plane(doorMat, 2.2, 2.5, x + nx * 0.02, 1.25, z + nz * 0.02, rotY);
            plane(doorGlass, 1.8, 2.1, x + nx * 0.03, 1.2, z + nz * 0.03, rotY);
            plane(exitMat, 0.5, 0.25, x + nx * 0.03, 2.8, z + nz * 0.03, rotY);
        };
        door(-6, -HL, 0, 0, 1);
        door(9, HL, Math.PI, 0, -1);
        door(XE, -28, -Math.PI / 2, -1, 0);
        [[-12, -HL, 0, 0, 1], [14, HL, Math.PI, 0, -1], [XE, 12, -Math.PI / 2, -1, 0]].forEach(([x, z, r, nx, nz]) => {
            plane(redSign, 0.3, 0.45, x + nx * 0.03, 2.1, z + nz * 0.03, r);
            const ext = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.55, 10), redSign);
            ext.position.set(x + nx * 0.15, 0.6, z + nz * 0.15);
            targetGroup.add(ext);
        });

        // ---------- 2. pilastri in acciaio lungo le pareti
        const colGeo = new THREE.BoxGeometry(0.34, WALL_H + 1.4, 0.42);
        const colPos = [];
        for (let z = -HL; z <= HL + 0.01; z += 8) { colPos.push([XE - 0.25, z], [XW + 0.25, z]); }
        for (let x = XW + 8; x < XE - 2; x += 8) { colPos.push([x, -HL + 0.25], [x, HL - 0.25]); }
        const cols = new THREE.InstancedMesh(colGeo, steelMat, colPos.length);
        colPos.forEach(([x, z], i) => { tmpM.makeTranslation(x, (WALL_H + 1.4) / 2, z); cols.setMatrixAt(i, tmpM); });
        cols.instanceMatrix.needsUpdate = true;
        targetGroup.add(cols);

        // ---------- 3. copertura reticolare a due falde
        // fascia d'intonaco tra la cima delle pareti e la gronda, timpani sulle testate
        [[XE, -Math.PI / 2], [XW, Math.PI / 2]].forEach(([x, r]) => plane(texMat('wall_blue.jpg', 2 * HL / 4, (EAVE - WALL_H) / 4), 2 * HL, EAVE - WALL_H, x, (WALL_H + EAVE) / 2, 0, r));
        const gable = new THREE.Shape();
        gable.moveTo(XW, WALL_H); gable.lineTo(XE, WALL_H); gable.lineTo(XE, EAVE); gable.lineTo(CX, RIDGE); gable.lineTo(XW, EAVE); gable.lineTo(XW, WALL_H);
        const gableTex = loadFileTexture(T + 'wall_blue.jpg', { repeat: [0.25, 0.25] });
        const gableMat = new THREE.MeshStandardMaterial({ map: gableTex, roughness: 0.88, side: THREE.DoubleSide });
        [-1, 1].forEach(dir => { const g = new THREE.Mesh(new THREE.ShapeGeometry(gable), gableMat); g.position.z = dir * HL; targetGroup.add(g); });
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0xd9dde0, emissive: 0xc9ced3, emissiveIntensity: 0.25, roughness: 0.85, side: THREE.DoubleSide });
        const quad = (a, b, c, d) => {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...d], 3));
            g.setIndex([0, 1, 2, 0, 2, 3]);
            g.computeVertexNormals();
            return new THREE.Mesh(g, roofMat);
        };
        ceilGroup.add(quad([XW, EAVE, -HL], [CX, RIDGE, -HL], [CX, RIDGE, HL], [XW, EAVE, HL]));
        ceilGroup.add(quad([CX, RIDGE, -HL], [XE, EAVE, -HL], [XE, EAVE, HL], [CX, RIDGE, HL]));
        const GRID = 3.0;
        const yB = x => roofY(x) - 1.3, yT = x => roofY(x) - 0.2;
        const beams = [];
        const xs = [], zs = [];
        for (let x = XW + 1.25; x <= XE - 1.25 + 0.01; x += GRID) xs.push(x);
        for (let z = -HL + 1.25; z <= HL - 1.25 + 0.01; z += GRID) zs.push(z);
        xs.forEach(x => beams.push([V(x, yB(x), zs[0]), V(x, yB(x), zs[zs.length - 1]), 0.09]));
        zs.forEach(z => { for (let i = 0; i < xs.length - 1; i++) beams.push([V(xs[i], yB(xs[i]), z), V(xs[i + 1], yB(xs[i + 1]), z), 0.09]); });
        const tx = xs.slice(0, -1).map(x => x + GRID / 2);
        tx.forEach(x => beams.push([V(x, yT(x), zs[0]), V(x, yT(x), zs[zs.length - 1]), 0.08]));
        for (let j = 0; j < zs.length - 1; j++) for (let i = 0; i < tx.length - 1; i++) {
            const z = zs[j] + GRID / 2;
            beams.push([V(tx[i], yT(tx[i]), z), V(tx[i + 1], yT(tx[i + 1]), z), 0.08]);
        }
        if (!lowQ) {
            for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
                const top = V(tx[i], yT(tx[i]), zs[j] + GRID / 2);
                [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b]) => beams.push([V(xs[i + a], yB(xs[i + a]), zs[j + b]), top, 0.05]));
            }
        }
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(beams), steelMat));
        const YB = EAVE;   // quota di riferimento per le reti appese
        // plafoniere a LED appese al reticolo
        const lampMat = new THREE.MeshBasicMaterial({ color: 0xfffdf2, side: THREE.DoubleSide });
        const lampSpots = [];
        for (let i = 1; i < xs.length - 1; i += 3) for (let j = 1; j < zs.length - 1; j += 3) lampSpots.push([xs[i] + GRID / 2, zs[j] + GRID / 2]);
        const housing = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.12, 0.5), darkMat, lampSpots.length);
        const lens = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.1, 0.4).rotateX(Math.PI / 2), lampMat, lampSpots.length);
        const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
        lampSpots.forEach(([x, z], i) => {
            const ly = yB(x) - 0.5;
            tmpM.makeTranslation(x, ly, z); housing.setMatrixAt(i, tmpM);
            tmpM.makeTranslation(x, ly - 0.07, z); lens.setMatrixAt(i, tmpM);
            if (!lowQ) {
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfffbe8, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(2.4, 1.6, 1);
                spr.position.set(x, ly - 0.2, z);
                ceilGroup.add(spr);
            }
        });
        housing.instanceMatrix.needsUpdate = true;
        lens.instanceMatrix.needsUpdate = true;
        ceilGroup.add(housing, lens);
        void YB;
        // solo se una camera esce dal colmo il tetto si nasconde
        arenaCeilingHide = { group: ceilGroup, y: RIDGE - 0.4 };

        // ---------- 4. reti di protezione scure appese al tetto
        const netMat = (w, h) => new THREE.MeshBasicMaterial({ map: loadFileTexture(CIT_TEX + 'netting.png', { repeat: [w / 0.12, h / 0.12] }), transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, depthWrite: false, opacity: 0.6 });
        [-1, 1].forEach(dir => {
            const n = new THREE.Mesh(new THREE.PlaneGeometry(36.5, WALL_H - 1.15), netMat(36.5, WALL_H - 1.15));
            n.position.set(0, 1.15 + (WALL_H - 1.15) / 2, dir * 36.6);
            targetGroup.add(n);
        });
        const sideNet = new THREE.Mesh(new THREE.PlaneGeometry(2 * HL - 1, WALL_H - 2.6), netMat(2 * HL - 1, WALL_H - 2.6));
        sideNet.position.set(22.4, 2.6 + (WALL_H - 2.6) / 2, 0);
        sideNet.rotation.y = Math.PI / 2;
        targetGroup.add(sideNet);
        // reti d'angolo verso la tribuna
        [-1, 1].forEach(dir => {
            const n = new THREE.Mesh(new THREE.PlaneGeometry(9, WALL_H - 1.15), netMat(9, WALL_H - 1.15));
            n.position.set(-22.6, 1.15 + (WALL_H - 1.15) / 2, dir * 32);
            n.rotation.y = Math.PI / 2;
            targetGroup.add(n);
        });

        // ---------- 5. bandiere, striscioni, casse acustiche (lato panchine)
        const bMats = {};
        const bMat = path => bMats[path] || (bMats[path] = (() => { const t = loadFileTexture(path); return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.16, roughness: 0.85, side: THREE.DoubleSide }); })());
        [['assets/textures/forli/flags/italia.jpg', -1.4], ['assets/textures/forli/flags/slovenia.jpg', 1.4]].forEach(([f, z]) => {
            const pivot = new THREE.Group();
            pivot.position.set(XE - 0.6, 7.6, z);
            const fl = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.47), bMat(f));
            fl.rotation.y = -Math.PI / 2;               // rivolta verso la pista
            fl.position.y = -0.75;                      // appesa per il lato superiore
            pivot.add(fl);
            targetGroup.add(pivot);
            arenaSwayItems.push({ obj: pivot, amp: 0.025, speed: 0.5 + Math.random() * 0.3, phase: Math.random() * 6 });
        });
        [['banner_zkb.jpg', -16], ['banner_zssdi.jpg', -10], ['banner_zkb.jpg', 16], ['banner_edera.jpg', 22]].forEach(([f, z]) => plane(bMat(T + f), 4.0, 1.0, XE - 0.05, 4.6, z, -Math.PI / 2));
        plane(bMat(T + 'banner_edera.jpg'), 4.0, 1.0, 6, 4.2, -HL + 0.05, 0);
        const spk = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 1.0, 0.9), darkMat, 3);
        [-22, 4, 26].forEach((z, i) => { tmpM.makeTranslation(XE - 0.5, 5.4, z); spk.setMatrixAt(i, tmpM); });
        spk.instanceMatrix.needsUpdate = true;
        targetGroup.add(spk);

        // ---------- 6. vetro sopra la balaustra davanti alla tribuna (-x)
        const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xe6f2fa, transparent: true, opacity: 0.2, roughness: 0.06, clearcoat: 0.8, depthWrite: false, side: THREE.DoubleSide });
        const GX = -rinkWidth / 2 - 0.13, G0 = -27.5, G1 = 27.5;
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.0, G1 - G0), glassMat);
        glass.position.set(GX, 1.15 + 0.5, 0);
        targetGroup.add(glass);
        const frame = [[V(GX, 2.15, G0), V(GX, 2.15, G1), 0.05]];
        for (let z = G0; z <= G1 + 0.01; z += 2.0) frame.push([V(GX, 1.15, z), V(GX, 2.15, z), 0.04]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(frame), new THREE.MeshStandardMaterial({ color: 0xc8cdd2, roughness: 0.4, metalness: 0.6 })));

        // ---------- 7. tribunetta in legno con le ringhiere arancioni
        const Z0 = -20, Z1 = 20, LEN = Z1 - Z0;
        const concrete = new THREE.MeshStandardMaterial({ color: 0xb0b4b8, roughness: 0.9 });
        const woodMat = new THREE.MeshStandardMaterial({ map: getPhotorealisticPBRMaps().woodDiffuse, color: 0xc98a4a, roughness: 0.6 });
        const rows = [{ x: -21.6, y: 0.45 }, { x: -22.85, y: 0.9 }, { x: -24.1, y: 1.35 }, { x: -25.35, y: 1.8 }, { x: -26.6, y: 2.25 }];
        rows.forEach(rw => {
            const st = new THREE.Mesh(new THREE.BoxGeometry(1.25, rw.y, LEN), concrete);
            st.position.set(rw.x, rw.y / 2, 0);
            targetGroup.add(st);
            const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, LEN - 0.3), woodMat);
            seat.position.set(rw.x + 0.05, rw.y + 0.42, 0);
            const riser = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, LEN - 0.3), woodMat);
            riser.position.set(rw.x + 0.28, rw.y + 0.2, 0);
            targetGroup.add(seat, riser);
        });
        const back = rows[rows.length - 1];
        const rails = [];
        const topY = back.y + 1.1, bx = back.x - 0.55;
        [topY, topY - 0.5].forEach(y => rails.push([V(bx, y, Z0), V(bx, y, Z1), 0.06]));
        for (let z = Z0; z <= Z1 + 0.01; z += 2.0) rails.push([V(bx, back.y, z), V(bx, topY, z), 0.05]);
        [Z0, Z1].forEach(z => {                              // ringhiere laterali che scendono a gradoni
            rows.forEach((rw, i) => {
                const nx = i + 1 < rows.length ? rows[i + 1].x : rw.x - 0.62;
                rails.push([V(rw.x + 0.62, rw.y + 1.0, z), V(nx + 0.62, (i + 1 < rows.length ? rows[i + 1].y : rw.y) + 1.0, z), 0.05]);
                rails.push([V(rw.x + 0.62, rw.y, z), V(rw.x + 0.62, rw.y + 1.0, z), 0.04]);
            });
        });
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rails), orangeMat));
        const front = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, LEN), concrete);
        front.position.set(-20.9, 0.225, 0);
        targetGroup.add(front);

        // spettatori seduti, rivolti verso la pista (+x), con qualche bambino
        const outfits = [0x111114, 0xd7262e, 0xf8fafc, 0x374151, 0x1d7a3a, 0x7c3aed, 0x1e3a8a, 0xb45309];
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
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), getRandomPhotoFaceMaterial());
            const hair = new THREE.Mesh(new THREE.SphereGeometry(0.148, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM); hair.position.x = -0.015;
            headGroup.add(head, hair); bodyPivot.add(headGroup);
            const arm = sz => { const ap = new THREE.Group(); ap.position.set(0, 0.48, sz); const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.42, 7), mat); sl.position.y = -0.21; const hd = new THREE.Mesh(new THREE.SphereGeometry(0.05, 7, 7), handM); hd.position.y = -0.44; ap.add(sl, hd); bodyPivot.add(ap); return ap; };
            const leftArmPivot = arm(-0.24), rightArmPivot = arm(0.24);
            root.position.set(x, y, z);
            root.rotation.y = Math.atan2(z, 30) * 0.3;
            const childLift = maybeMakeCrowdChild(root, headGroup, true);
            targetGroup.add(root);
            crowdMembers.push({ mesh: root, bodyPivot, headGroup, leftArmPivot, rightArmPivot, baseY: y + childLift, phase: Math.random() * Math.PI * 2, standing: false });
        };
        const keep = preset.crowdKeepRatio;
        rows.forEach(rw => {
            for (let z = Z0 + 0.6; z <= Z1 - 0.6; z += 0.85) if (Math.random() < keep * 0.45) fan(rw.x + 0.02, rw.y, z + (Math.random() - 0.5) * 0.2);
        });

        // ---------- 8. pavimento di servizio attorno alla pista
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(LX, 2 * HL), new THREE.MeshStandardMaterial({ color: 0x8fa3b2, roughness: 0.85 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(CX, -0.01, 0);
        targetGroup.add(apron);
    }

    registerArenaBuilder('edera_trieste', buildEderaTriesteArchitecture);
})();
