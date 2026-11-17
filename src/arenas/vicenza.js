// Palazzetto "vicenza": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, arenaSwayItems, CIT_TEX, ...).
(function () {
    // =====================================================================
    // PALAFERRARIN DI VICENZA — capannone con pareti in blocchi verniciati,
    // pilastri, fascia finestrata, copertura in lamiera su travi reticolari bianche,
    // proiettori LED, tabellone a parete, stendardi e transenne gialle.
    // Texture in assets/textures/vicenza/ (tools/generate_vicenza_textures.py).
    // =====================================================================
    function buildPalaFerrarinArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = VIC_TEX;
        const XW = -27.0, XE = 24.5, HL = 41;               // pareti lunghe (tribuna / panchine) e testate
        const CXH = (XW + XE) / 2, HALF = (XE - XW) / 2;
        const WIN_Y0 = 7.5, WIN_Y1 = 9.5, DECK_BASE = 14.2, DECK_RISE = 1.4, BOTTOM_CHORD = 12.3;
        const deckY = x => DECK_BASE + DECK_RISE * (1 - ((x - CXH) / HALF) ** 2);
        const tmpM = new THREE.Matrix4();

        // ---------- materiali
        const steelWhite = new THREE.MeshStandardMaterial({ color: 0xe9edf0, metalness: 0.3, roughness: 0.45 });
        const darkSteel = new THREE.MeshStandardMaterial({ color: 0x23272d, metalness: 0.5, roughness: 0.45 });
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const wallMatFor = (len, h) => new THREE.MeshStandardMaterial({
            map: loadFileTexture(T + 'wall_block.jpg', { repeat: [len / 2, h / 2] }),
            normalMap: loadFileTexture(T + 'wall_block_n.jpg', { repeat: [len / 2, h / 2] }),
            roughness: 0.9
        });
        const winMatFor = len => new THREE.MeshStandardMaterial({
            map: loadFileTexture(T + 'windows.jpg', { repeat: [len / 6, 1] }),
            emissive: 0xffffff,
            emissiveMap: loadFileTexture(T + 'windows.jpg', { repeat: [len / 6, 1] }),
            emissiveIntensity: 0.35, roughness: 0.15, metalness: 0.4
        });

        // ---------- 1. pareti: blocchi bianchi, fascia finestrata, fascia alta più scura
        function wallPlane(mat, w, h, x, y, z, rotY) {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
            m.position.set(x, y, z);
            m.rotation.y = rotY;
            targetGroup.add(m);
            return m;
        }
        const sides = [
            { len: 2 * HL, x: XW, z: 0, rot: Math.PI / 2 },      // lato tribuna (guarda +x)
            { len: 2 * HL, x: XE, z: 0, rot: -Math.PI / 2 },     // lato panchine (guarda -x)
            { len: XE - XW, x: CXH, z: -HL, rot: 0 },            // testata nord
            { len: XE - XW, x: CXH, z: HL, rot: Math.PI }        // testata sud
        ];
        sides.forEach(sd => {
            const lower = wallPlane(wallMatFor(sd.len, WIN_Y0), sd.len, WIN_Y0, sd.x, WIN_Y0 / 2, sd.z, sd.rot);
            lower.receiveShadow = preset.shadows;
            wallPlane(winMatFor(sd.len), sd.len, WIN_Y1 - WIN_Y0, sd.x, (WIN_Y0 + WIN_Y1) / 2, sd.z, sd.rot);
            const upper = wallPlane(wallMatFor(sd.len, 5), sd.len, DECK_BASE + DECK_RISE - WIN_Y1 + 0.2, sd.x, (WIN_Y1 + DECK_BASE + DECK_RISE + 0.2) / 2, sd.z, sd.rot);
            upper.material.color.set(0xb9bcc0);
        });

        // pilastri ogni 6 m
        const pillarGeo = new THREE.BoxGeometry(0.7, BOTTOM_CHORD, 0.8);
        const pillars = [];
        for (let z = -36; z <= 36; z += 6) { pillars.push([XW + 0.35, z]); pillars.push([XE - 0.35, z]); }
        for (let x = -21; x <= 21; x += 6) { pillars.push([x, -HL + 0.4]); pillars.push([x, HL - 0.4]); }
        const pillarMesh = new THREE.InstancedMesh(pillarGeo, wallMatFor(1, BOTTOM_CHORD), pillars.length);
        pillars.forEach(([x, z], i) => { tmpM.makeTranslation(x, BOTTOM_CHORD / 2, z); pillarMesh.setMatrixAt(i, tmpM); });
        pillarMesh.instanceMatrix.needsUpdate = true;
        targetGroup.add(pillarMesh);
        // davanzale sotto le finestre
        [[XW + 0.2, 0, 0.4, 2 * HL], [XE - 0.2, 0, 0.4, 2 * HL], [CXH, -HL + 0.2, XE - XW, 0.4], [CXH, HL - 0.2, XE - XW, 0.4]].forEach(([x, z, w, d]) => {
            const sill = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), steelWhite);
            sill.position.set(x, WIN_Y0 - 0.07, z);
            targetGroup.add(sill);
        });

        // ---------- 2. copertura in lamiera grecata leggermente centinata
        const nX = 40;
        const dPos = [], dUv = [], dIdx = [];
        for (let j = 0; j <= 1; j++) {
            const z = j === 0 ? -HL : HL;
            for (let i = 0; i <= nX; i++) {
                const x = XW + (XE - XW) * i / nX;
                dPos.push(x, deckY(x), z);
                dUv.push(x, z);
            }
        }
        for (let i = 0; i < nX; i++) dIdx.push(i, i + nX + 1, i + 1, i + 1, i + nX + 1, i + nX + 2);
        const deckGeo = new THREE.BufferGeometry();
        deckGeo.setAttribute('position', new THREE.Float32BufferAttribute(dPos, 3));
        deckGeo.setAttribute('uv', new THREE.Float32BufferAttribute(dUv, 2));
        deckGeo.setIndex(dIdx);
        deckGeo.computeVertexNormals();
        targetGroup.add(new THREE.Mesh(deckGeo, new THREE.MeshStandardMaterial({
            map: loadFileTexture(T + 'ceiling_deck.jpg', { wrap: true }),
            normalMap: loadFileTexture(T + 'ceiling_deck_n.jpg', { wrap: true }),
            roughness: 0.6, metalness: 0.25, side: THREE.DoubleSide
        })));

        // ---------- 3. travi reticolari: 9 trasversali (centinate) + 3 longitudinali
        const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
        const tBeams = [];
        const NP = 24;
        for (let i = 0; i < NP; i++) {
            const x0 = XW + (XE - XW) * i / NP, x1 = XW + (XE - XW) * (i + 1) / NP;
            const t0 = deckY(x0) - 0.25, t1 = deckY(x1) - 0.25;
            tBeams.push([V(x0, BOTTOM_CHORD), V(x1, BOTTOM_CHORD), 0.17]);
            tBeams.push([V(x0, t0), V(x1, t1), 0.19]);
            tBeams.push([V(x0, BOTTOM_CHORD), V(x0, t0), 0.08]);
            tBeams.push(i % 2 === 0 ? [V(x0, BOTTOM_CHORD), V(x1, t1), 0.07] : [V(x0, t0), V(x1, BOTTOM_CHORD), 0.07]);
        }
        const trussZ = [-36, -27, -18, -9, 0, 9, 18, 27, 36];
        const tTruss = new THREE.InstancedMesh(mergeBeamGeometry(tBeams), steelWhite, trussZ.length);
        trussZ.forEach((z, i) => { tmpM.makeTranslation(0, 0, z); tTruss.setMatrixAt(i, tmpM); });
        tTruss.instanceMatrix.needsUpdate = true;
        targetGroup.add(tTruss);

        const lBeams = [];
        const NL = 40, LTOP = BOTTOM_CHORD + 1.2;
        for (let i = 0; i < NL; i++) {
            const z0 = -HL + 2 * HL * i / NL, z1 = -HL + 2 * HL * (i + 1) / NL;
            lBeams.push([V(0, BOTTOM_CHORD + 0.02, z0), V(0, BOTTOM_CHORD + 0.02, z1), 0.12]);
            lBeams.push([V(0, LTOP, z0), V(0, LTOP, z1), 0.12]);
            lBeams.push([V(0, BOTTOM_CHORD, z0), V(0, LTOP, z0), 0.06]);
            lBeams.push(i % 2 === 0 ? [V(0, BOTTOM_CHORD, z0), V(0, LTOP, z1), 0.05] : [V(0, LTOP, z0), V(0, BOTTOM_CHORD, z1), 0.05]);
        }
        const longX = [-14.25, -1.25, 11.75];
        const lTruss = new THREE.InstancedMesh(mergeBeamGeometry(lBeams), steelWhite, longX.length);
        longX.forEach((x, i) => { tmpM.makeTranslation(x, 0, 0); lTruss.setMatrixAt(i, tmpM); });
        lTruss.instanceMatrix.needsUpdate = true;
        targetGroup.add(lTruss);

        // ---------- 4. proiettori LED sotto le travi + alone
        const lampXs = [-20, -12, -4, 4, 12, 20];
        const lampCount = trussZ.length * lampXs.length;
        const housings = new THREE.InstancedMesh(new THREE.BoxGeometry(1.15, 0.16, 0.6), darkSteel, lampCount);
        const lensGeo = new THREE.PlaneGeometry(1.0, 0.46);
        lensGeo.rotateX(Math.PI / 2);
        const lenses = new THREE.InstancedMesh(lensGeo, lightMat, lampCount);
        const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
        let li = 0;
        trussZ.forEach(z => lampXs.forEach(x => {
            const lz = z + (li % 2 === 0 ? 0.6 : -0.6);
            tmpM.makeTranslation(x, BOTTOM_CHORD - 0.22, lz);
            housings.setMatrixAt(li, tmpM);
            tmpM.makeTranslation(x, BOTTOM_CHORD - 0.31, lz);
            lenses.setMatrixAt(li, tmpM);
            if (!lowQ) {
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xf4f8ff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(2.4, 2.4, 1);
                spr.position.set(x, BOTTOM_CHORD - 0.45, lz);
                targetGroup.add(spr);
            }
            li++;
        }));
        housings.instanceMatrix.needsUpdate = true;
        lenses.instanceMatrix.needsUpdate = true;
        targetGroup.add(housings, lenses);

        // altoparlanti / diffusori neri appesi e condotti dell'aria lungo le pareti
        [[-7, -13.5], [6, -13.5], [-7, 13.5], [6, 13.5]].forEach(([x, z]) => {
            const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.55, 16), darkSteel);
            drum.position.set(x, BOTTOM_CHORD - 0.7, z);
            const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), darkSteel);
            rod.position.set(x, BOTTOM_CHORD - 0.2, z);
            targetGroup.add(drum, rod);
        });
        [XW + 1.0, XE - 1.0].forEach(x => {
            const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 2 * HL - 1, 18), new THREE.MeshStandardMaterial({ color: 0xc7ccd2, metalness: 0.6, roughness: 0.35 }));
            duct.rotation.x = Math.PI / 2;
            duct.position.set(x, 11.4, 0);
            targetGroup.add(duct);
        });

        // ---------- 5. porte, tabellone, stendardi e striscioni
        const corridorMat = new THREE.MeshBasicMaterial({ color: 0x3a3f46 });
        const corridorLitMat = new THREE.MeshBasicMaterial({ color: 0xf2efe6 });
        const exitMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
        function addDoor(x, z, rotY, w = 3.2) {
            const g = new THREE.Group();
            const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 3.0, 0.18), darkSteel);
            frame.position.y = 1.5;
            const hole = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.8), corridorMat);
            hole.position.set(0, 1.4, 0.1);
            const back = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.4, 2.2), corridorLitMat);
            back.position.set(w * 0.15, 1.2, 0.11);
            const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.06), exitMat);
            sign.position.set(0, 3.25, 0.1);
            g.add(frame, hole, back, sign);
            g.position.set(x, 0, z);
            g.rotation.y = rotY;
            targetGroup.add(g);
        }
        addDoor(XE - 0.05, 0, -Math.PI / 2);
        addDoor(XE - 0.05, 30, -Math.PI / 2, 1.6);
        addDoor(-16, -HL + 0.05, 0, 1.6);
        addDoor(14, HL - 0.05, Math.PI, 1.6);

        const bannerMats = {};
        function bMat(file) {
            if (!bannerMats[file]) {
                const tex = loadFileTexture(T + file);
                bannerMats[file] = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.18, roughness: 0.85 });
            }
            return bannerMats[file];
        }
        // lato panchine (+x), visto dalla tribuna
        const onEast = (file, w, h, z, y) => wallPlane(bMat(file), w, h, XE - 0.06, y, z, -Math.PI / 2);
        onEast('banners/lifestyle.jpg', 4.3, 1.07, -27, 4.6);
        onEast('banners/bcc.jpg', 4.3, 1.07, -20.5, 5.9);
        onEast('banners/emo.jpg', 4.3, 1.07, -15, 4.4);
        onEast('banners/alma.jpg', 4.3, 1.07, -12.5, 6.0);
        onEast('scoreboard.jpg', 3.9, 2.44, -6, 5.0);
        [[-8.65, 5.7], [-8.65, 4.4], [-3.35, 5.7], [-3.35, 4.4]].forEach(([z, y]) => onEast('banners/mc_square.jpg', 1.1, 1.1, z, y));
        onEast('banners/history.jpg', 5.8, 2.9, 7.5, 5.2);
        onEast('banners/mc.jpg', 4.3, 1.07, 14.5, 4.4);
        onEast('banners/coppa.jpg', 1.7, 3.4, 19.5, 5.4);
        onEast('banners/devil.jpg', 3.6, 3.6, 23.5, 5.3);
        onEast('banners/promopost.jpg', 4.3, 1.07, 33, 4.6);
        // testate
        const onNorth = (file, w, h, x, y) => wallPlane(bMat(file), w, h, x, y, -HL + 0.06, 0);
        const onSouth = (file, w, h, x, y) => wallPlane(bMat(file), w, h, x, y, HL - 0.06, Math.PI);
        onNorth('banners/wildcats.jpg', 4.3, 1.07, -15, 4.6);
        onNorth('banners/mc.jpg', 4.3, 1.07, -9.5, 4.6);
        onNorth('banners/quadro.jpg', 5.6, 1.0, 10.5, 5.4);
        onNorth('banners/tecnoforniture.jpg', 4.3, 1.07, 10.5, 4.0);
        onSouth('banners/verdecasa.jpg', 4.3, 1.07, 12, 4.6);
        onSouth('banners/mc.jpg', 4.3, 1.07, -12, 4.6);
        onSouth('banners/alma.jpg', 4.3, 1.07, -18.5, 5.8);
        // lato tribuna (-x), sopra le gradinate
        const onWest = (file, w, h, z, y) => wallPlane(bMat(file), w, h, XW + 0.06, y, z, Math.PI / 2);
        onWest('banners/mc.jpg', 4.3, 1.07, -14, 5.6);
        onWest('banners/bcc.jpg', 4.3, 1.07, 0, 5.6);
        onWest('banners/emo.jpg', 4.3, 1.07, 14, 5.6);

        // ---------- 6. reti di protezione dietro le porte (lasciando libero il tabellone)
        const netTex = loadFileTexture(CIT_TEX + 'netting.png', { repeat: [12.5 / 0.12, 3 / 0.12] });
        const netMatProt = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, depthWrite: false, opacity: 0.5 });
        [-1, 1].forEach(dir => [-11.75, 11.75].forEach(nx => {
            const net = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 3.0), netMatProt);
            net.position.set(nx, 4.0, dir * 36.32);
            targetGroup.add(net);
        }));

        // ---------- 7. transenne gialle davanti alla tribuna (interrotte al tavolo cronometristi)
        const fenceTex = loadFileTexture(T + 'fence.png', { repeat: [1, 1] });
        const fenceMat = new THREE.MeshStandardMaterial({ map: fenceTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.3 });
        const fenceGeo = new THREE.PlaneGeometry(2.2, 1.1);
        const fenceZs = [];
        for (let z = -25.3; z <= 25.3; z += 2.3) if (Math.abs(z) > 3.6) fenceZs.push(z);
        const fences = new THREE.InstancedMesh(fenceGeo, fenceMat, fenceZs.length);
        const rotQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
        fenceZs.forEach((z, i) => { tmpM.compose(new THREE.Vector3(-19.62, 0.6, z), rotQ, new THREE.Vector3(1, 1, 1)); fences.setMatrixAt(i, tmpM); });
        fences.instanceMatrix.needsUpdate = true;
        targetGroup.add(fences);
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 50.6, 8), new THREE.MeshStandardMaterial({ color: 0x24703c, metalness: 0.4, roughness: 0.4 }));
        rail.rotation.x = Math.PI / 2;
        rail.position.set(-19.62, 1.18, 0);
        targetGroup.add(rail);
    }

    registerArenaBuilder('vicenza', buildPalaFerrarinArchitecture);
})();
