// Palazzetto "asiago": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, arenaSwayItems, CIT_TEX, ...).
(function () {
    // =====================================================================
    // ARENA DI ASIAGO (Asiago Vipers) — soffitto basso in cemento bianco con travi
    // trasversali e fari rettangolari, pista SportCourt azzurra con linee rosse,
    // balaustre bianche con la fascia CECCATO AUTOMOBILI e battiscopa giallo,
    // parete lunga con gli stendardi dei trofei arancioneri, vetrate verdi,
    // galleria del bar dietro una porta con il pubblico in piedi dietro il vetro,
    // rete fino al soffitto con gli striscioni dei tifosi, tabellone tra le fasce rosse.
    // Texture in assets/textures/asiago/ (tools/generate_asiago_textures.py).
    // =====================================================================
    function buildAsiagoVipersArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/asiago/';
        const XW = -21.6, XE = 22.4, ZN = -41.0, ZG = -38.0, ZS = 38.6, CEIL = 5.2;
        const CX = (XW + XE) / 2, LX = XE - XW, LZ = ZS - ZN, CZ = (ZS + ZN) / 2;
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        const texMat = (file, rx, ry, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ map: loadFileTexture(T + file, { repeat: [rx, ry] }), roughness: 0.9 }, extra));
        const plane = (mat, w, h, x, y, z, rot, parent = targetGroup) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = rot; parent.add(m); return m; };
        const box = (mat, w, h, d, x, y, z, parent = targetGroup) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m; };
        const greenFrame = new THREE.MeshStandardMaterial({ color: 0x1f6b3e, roughness: 0.5, metalness: 0.3 });
        const greyMetal = new THREE.MeshStandardMaterial({ color: 0x9aa1a8, roughness: 0.45, metalness: 0.6 });
        const redPaint = new THREE.MeshStandardMaterial({ color: 0xd42a2e, roughness: 0.7 });

        // ---------- 1. pareti bianche
        const wallMat = (len, h) => texMat('wall_white.jpg', len / 2, h / 2);
        // le pareti salgono oltre il soffitto: dalle telecamere alte (soffitto nascosto) l'impianto resta chiuso
        const WH = 16;
        plane(wallMat(LZ, WH), LZ, WH, XW, WH / 2, CZ, Math.PI / 2).receiveShadow = preset.shadows;
        plane(wallMat(LZ, WH), LZ, WH, XE, WH / 2, CZ, -Math.PI / 2).receiveShadow = preset.shadows;
        plane(wallMat(LX, WH), LX, WH, CX, WH / 2, ZS, Math.PI);
        // fondo della galleria del bar
        plane(new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'gallery_back.jpg', { repeat: [3, 1] }), emissive: 0xffffff, emissiveMap: loadFileTexture(T + 'gallery_back.jpg', { repeat: [3, 1] }), emissiveIntensity: 0.35, roughness: 0.8 }),
            LX, 2.7, CX, 1.35, ZN, 0);

        // ---------- 2. parete lunga (-x): corrimano e stendardi dei trofei
        box(greyMetal, 0.08, 0.08, LZ - 2, XW + 0.12, 2.25, CZ);
        box(greyMetal, 0.06, 0.06, 62, XW + 0.16, 4.58, -1);
        const pennants = 16;
        for (let i = 0; i < pennants; i++) {
            const z = -30 + i * (60 / (pennants - 1));
            const t = loadFileTexture(T + 'banners/pennant_' + String(i).padStart(2, '0') + '.png');
            const mat = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.1, roughness: 0.85, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.12, side: THREE.DoubleSide });
            const pivot = new THREE.Group();
            pivot.position.set(XW + 0.22, 4.55, z);
            const p = plane(mat, 0.86, 2.36, 0, -1.18, 0, Math.PI / 2, pivot);
            p.renderOrder = 2;
            targetGroup.add(pivot);
            arenaSwayItems.push({ obj: pivot, amp: 0.012, speed: 0.5 + Math.random() * 0.3, phase: Math.random() * 6 });
        }
        // portone sezionale da garage accanto alla galleria del pubblico
        const gdTex = loadFileTexture(T + 'garage_door.jpg');
        plane(new THREE.MeshStandardMaterial({ map: gdTex, roughness: 0.55, metalness: 0.25 }), 3.6, 3.4, XW + 0.06, 1.7, -34.2, Math.PI / 2);
        box(greyMetal, 0.16, 0.12, 3.9, XW + 0.08, 3.46, -34.2);
        [-1, 1].forEach(k => box(greyMetal, 0.14, 3.4, 0.12, XW + 0.08, 1.7, -34.2 + k * 1.86));
        box(new THREE.MeshStandardMaterial({ color: 0x3d4148, roughness: 0.7 }), 0.5, 0.5, 4.0, XW + 0.3, 3.85, -34.2);   // cassonetto del motore
        // fasce rosse verticali sulla testata (+z) che incorniciano il tabellone
        [-5.4, 5.4].forEach(x => box(redPaint, 0.75, CEIL, 0.04, x, CEIL / 2, ZS - 0.03));
        box(redPaint, LX, 0.5, 0.04, CX, 2.0, ZS - 0.03);
        const vw = loadFileTexture(T + 'banners/vipers_wall.jpg');
        plane(new THREE.MeshStandardMaterial({ map: vw, emissive: 0xffffff, emissiveMap: vw, emissiveIntensity: 0.15, roughness: 0.85 }), 3.3, 2.2, -12.5, 3.45, ZS - 0.06, Math.PI);
        const fv = loadFileTexture(T + 'banners/fan_vipers.png');
        plane(new THREE.MeshStandardMaterial({ map: fv, transparent: true, alphaTest: 0.1, roughness: 0.9, side: THREE.DoubleSide }), 4.2, 1.23, 12.5, 3.45, ZS - 0.06, Math.PI);
        // cassa audio appesa
        box(new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.6 }), 0.5, 0.75, 0.45, 9.5, 4.2, ZG + 0.6);

        // ---------- 3. lato panchine (+x): grandi vetrate con telai verdi
        const winSide = loadFileTexture(T + 'window_side.jpg');
        const winSideMat = new THREE.MeshStandardMaterial({ map: winSide, emissive: 0xffffff, emissiveMap: winSide, emissiveIntensity: 0.4, roughness: 0.25 });
        for (let z = -30; z <= 30.01; z += 6) plane(winSideMat, 5.2, 2.6, XE - 0.05, 3.4, z, -Math.PI / 2);
        box(greenFrame, 0.12, 0.14, 62, XE - 0.08, 2.08, 0);
        box(greenFrame, 0.12, 0.14, 62, XE - 0.08, 4.72, 0);

        // ---------- 4. testata della galleria (-z): muretto + vetro, pubblico in piedi, vetrate del bar sopra, rete fino al soffitto
        const gallery = new THREE.Mesh(new THREE.BoxGeometry(LX, 0.4, ZG - ZN), new THREE.MeshStandardMaterial({ color: 0x6b6460, roughness: 0.9 }));
        gallery.position.set(CX, 0.2, (ZG + ZN) / 2);
        targetGroup.add(gallery);
        box(new THREE.MeshStandardMaterial({ color: 0xe8e8e4, roughness: 0.9 }), LX, 0.3, ZG - ZN, CX, 2.85, (ZG + ZN) / 2);   // solaio del piano superiore
        plane(wallMat(LX, 1.1), LX, 1.1, CX, 0.55, ZG, 0);
        const glassMatG = new THREE.MeshStandardMaterial({ color: 0xdfeff7, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1, depthWrite: false });
        plane(glassMatG, LX, 1.6, CX, 1.9, ZG, 0);
        const posts = [];
        for (let x = XW + 1; x <= XE - 0.99; x += 1.6) posts.push([V(x, 1.1, ZG), V(x, 2.7, ZG), 0.06]);
        posts.push([V(XW, 2.7, ZG), V(XE, 2.7, ZG), 0.08], [V(XW, 1.1, ZG), V(XE, 1.1, ZG), 0.06]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(posts), greyMetal));
        plane(wallMat(LX, WH - 2.7), LX, WH - 2.7, CX, (WH + 2.7) / 2, ZG - 0.02, 0);
        const winBar = loadFileTexture(T + 'window_bar.jpg');
        const winBarMat = new THREE.MeshStandardMaterial({ map: winBar, emissive: 0xffffff, emissiveMap: winBar, emissiveIntensity: 0.55, roughness: 0.3 });
        [-13.5, -6.75, 0, 6.75, 13.5].forEach(x => plane(winBarMat, 6.2, 1.85, x, 3.88, ZG + 0.01, 0));
        const netTex = loadFileTexture(CIT_TEX + 'netting.png', { repeat: [LX / 0.12, (CEIL - 1.2) / 0.12] });
        const netMat = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, depthWrite: false, opacity: 0.55 });
        const bigNet = new THREE.Mesh(new THREE.PlaneGeometry(LX - 1, CEIL - 1.2), netMat);
        bigNet.position.set(CX, 1.2 + (CEIL - 1.2) / 2, ZG + 0.35);
        targetGroup.add(bigNet);
        // striscioni dei tifosi legati alla rete
        const fanMat = f => { const t = loadFileTexture(T + 'banners/' + f); return new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.1, roughness: 0.95, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.1, side: THREE.DoubleSide }); };
        const zio = plane(fanMat('fan_zio.png'), 3.5, 2.2, -6.6, 3.75, ZG + 0.42, 0);
        zio.rotation.z = 0.02;
        const fed = plane(fanMat('fan_federazione.png'), 3.8, 2.4, -2.2, 3.65, ZG + 0.42, 0);
        fed.rotation.z = -0.025;
        // rete standard dietro la porta opposta
        const netTex2 = loadFileTexture(CIT_TEX + 'netting.png', { repeat: [24 / 0.12, 2.6 / 0.12] });
        const net2 = new THREE.Mesh(new THREE.PlaneGeometry(24, 2.6), new THREE.MeshBasicMaterial({ map: netTex2, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, depthWrite: false, opacity: 0.5 }));
        net2.position.set(0, 3.6, 36.32);
        targetGroup.add(net2);

        // pubblico in piedi dietro il vetro, rivolto verso la pista (+z)
        const outfits = [0xf26b11, 0x111114, 0xf8fafc, 0x374151, 0xf26b11, 0x1e3a8a, 0x7c2d12];
        const jm = outfits.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 }));
        const pantsM = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const handM = new THREE.MeshStandardMaterial({ color: 0xe6b9a2, roughness: 0.6 });
        const hairM = new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.8 });
        const fan = (x, y, z) => {
            const root = new THREE.Group();
            const mat = jm[Math.floor(Math.random() * jm.length)];
            [-0.11, 0.11].forEach(lz => { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.82, 7), pantsM); lg.position.set(0, 0.41, lz); root.add(lg); });
            const bodyPivot = new THREE.Group();
            bodyPivot.position.set(0, 0.82, 0);
            root.add(bodyPivot);
            const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.55, 10), mat); torso.position.y = 0.27; bodyPivot.add(torso);
            const headGroup = new THREE.Group(); headGroup.position.y = 0.69;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), getRealisticFaceMaterial(Math.floor(Math.random() * 3)));
            const hair = new THREE.Mesh(new THREE.SphereGeometry(0.148, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM); hair.position.x = -0.015;
            headGroup.add(head, hair); bodyPivot.add(headGroup);
            const arm = sz => { const ap = new THREE.Group(); ap.position.set(0, 0.48, sz); const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.42, 7), mat); sl.position.y = -0.21; const hd = new THREE.Mesh(new THREE.SphereGeometry(0.05, 7, 7), handM); hd.position.y = -0.44; ap.add(sl, hd); bodyPivot.add(ap); return ap; };
            const leftArmPivot = arm(-0.24), rightArmPivot = arm(0.24);
            root.position.set(x, y, z);
            root.rotation.y = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
            targetGroup.add(root);
            crowdMembers.push({ mesh: root, bodyPivot, headGroup, leftArmPivot, rightArmPivot, baseY: y, phase: Math.random() * Math.PI * 2, standing: true });
        };
        const keep = preset.crowdKeepRatio;
        [ZG - 0.55, ZG - 1.35, ZG - 2.15].forEach((z, row) => {
            for (let x = XW + 1.2; x <= XE - 1.2; x += 0.62) if (Math.random() < keep * (0.85 - row * 0.2)) fan(x + (Math.random() - 0.5) * 0.25, 0.4, z + (Math.random() - 0.5) * 0.2);
        });

        // ---------- 5. soffitto basso: lastra, travi trasversali, fari rettangolari e faretti incassati
        // (si nasconde quando la telecamera sale sopra il soffitto, come nelle riprese dall'alto)
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        const slab = plane(texMat('ceiling.jpg', LX / 4, LZ / 4, { side: THREE.DoubleSide, color: 0xc4e2f0 }), LX, LZ, CX, CEIL, CZ, 0, ceilGroup);
        slab.rotation.x = Math.PI / 2;
        const beamZ = [];
        for (let z = ZN + 1.6; z < ZS - 0.5; z += 2.6) beamZ.push(z);
        const beams = new THREE.InstancedMesh(new THREE.BoxGeometry(LX, 0.5, 0.34), new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'ceiling.jpg', { repeat: [LX / 4, 1] }), color: 0xd2eaf5, roughness: 0.9 }), beamZ.length);
        beamZ.forEach((z, i) => { tmpM.makeTranslation(CX, CEIL - 0.25, z); beams.setMatrixAt(i, tmpM); });
        beams.instanceMatrix.needsUpdate = true;
        ceilGroup.add(beams);
        const lampX = [-13.5, -4.5, 4.5, 13.5];
        const lamps = [];
        beamZ.forEach((z, i) => { if (i % 2 === 0) lampX.forEach((x, k) => lamps.push([x + ((i / 2) % 2 ? 2.2 : 0) * (k % 2 ? -1 : 1), z])); });
        const housing = new THREE.InstancedMesh(new THREE.BoxGeometry(0.95, 0.16, 0.55), new THREE.MeshStandardMaterial({ color: 0x8b9096, roughness: 0.4, metalness: 0.6 }), lamps.length);
        const lens = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.85, 0.45).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffdf0, side: THREE.DoubleSide }), lamps.length);
        const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
        lamps.forEach(([x, z], i) => {
            tmpM.makeTranslation(x, CEIL - 0.42, z + 1.3); housing.setMatrixAt(i, tmpM);
            tmpM.makeTranslation(x, CEIL - 0.505, z + 1.3); lens.setMatrixAt(i, tmpM);
            if (!lowQ) {
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfffbe8, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(2.2, 1.6, 1);
                spr.position.set(x, CEIL - 0.62, z + 1.3);
                ceilGroup.add(spr);
            }
        });
        housing.instanceMatrix.needsUpdate = true;
        lens.instanceMatrix.needsUpdate = true;
        ceilGroup.add(housing, lens);
        const hangers = [];
        lamps.forEach(([x, z]) => { hangers.push([V(x - 0.35, CEIL, z + 1.3), V(x - 0.35, CEIL - 0.36, z + 1.3), 0.03], [V(x + 0.35, CEIL, z + 1.3), V(x + 0.35, CEIL - 0.36, z + 1.3), 0.03]); });
        lampX.forEach(x => hangers.push([V(x, CEIL - 0.04, ZN + 1), V(x, CEIL - 0.04, ZS - 1), 0.05]));   // canaline dei cavi
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(hangers), greyMetal));
        const downs = [];
        beamZ.forEach((z, i) => { if (i % 2 === 1) [-16, -8, 0, 8, 16].forEach(x => downs.push([x, z + 1.3])); });
        const downMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(0.16, 14).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), downs.length);
        downs.forEach(([x, z], i) => { tmpM.makeTranslation(x, CEIL - 0.01, z); downMesh.setMatrixAt(i, tmpM); });
        downMesh.instanceMatrix.needsUpdate = true;
        ceilGroup.add(downMesh);
        arenaCeilingHide = { group: ceilGroup, y: CEIL - 0.4 };

        // ---------- 6. pavimento di servizio attorno alla pista
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(LX, LZ), new THREE.MeshStandardMaterial({ color: 0x8d9196, roughness: 0.85 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(CX, -0.01, CZ);
        targetGroup.add(apron);
    }

    registerArenaBuilder('asiago', buildAsiagoVipersArchitecture);
})();
