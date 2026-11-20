// Palazzetto "torre_pellice": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // PISTA DEL FILATOIO — TORRE PELLICE (casa dell'Old Style Torre Pellice). Capannone a due falde
    // con le capriate in legno lamellare (corrente inferiore, puntoni e aste diagonali), arcarecci
    // in legno e soffitto a pannelli bianchi; plafoniere a tubo e lampade a campana appese sotto.
    // Pareti in pannelli OSB con una fascia di finestre in alto, reti beige tutto attorno alla pista,
    // teloni bianchi con le cinghie nere a X dietro la porta sud, pubblico in piedi dietro la rete e
    // sulla balconata in legno a ovest. Pavimento a piastrelle grigio chiaro (texture del pavimento).
    // Texture in assets/textures/torre_pellice/ (tools/generate_torre_pellice_textures.py).
    // =====================================================================
    function buildTorrePelliceArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/torre_pellice/';
        const XW = -31, XE = 24.5, CX = (XW + XE) / 2, ZN = -44, ZS = 44;
        const EAVE = 6.4, RIDGE = 9.8;                         // gronda e colmo (colmo lungo z, a x = CX)
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        const roofY = x => EAVE + (RIDGE - EAVE) * (1 - Math.abs(x - CX) / ((XE - XW) / 2));
        const std = (c, r, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r }, o || {}));
        const plane = (mat, w, h, x, y, z, rotY) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = rotY || 0; targetGroup.add(m); return m; };
        // texture ripetuta in metri senza toccare la texture condivisa in cache: UV scalate
        const meterPlane = (mat, w, h, uw, uh) => {
            const g = new THREE.PlaneGeometry(w, h);
            const uv = g.attributes.uv;
            for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / uw, uv.getY(i) * h / uh);
            return new THREE.Mesh(g, mat);
        };

        // ---------- 1. capriate in legno lamellare ogni 6 m + arcarecci
        const lamTex = loadFileTexture(T + 'glulam.jpg', { wrap: true });
        const woodMat = new THREE.MeshStandardMaterial({ map: lamTex, color: 0xa47458, roughness: 0.7 });
        const beams = [];
        const trussZ = [];
        for (let z = -42; z <= 42.01; z += 6) trussZ.push(z);
        trussZ.forEach(z => {
            // puntoni (doppio ordine = trave alta) e corrente inferiore
            [0, -0.32].forEach(dy => {
                beams.push([V(XW, EAVE + dy, z), V(CX, RIDGE + dy, z), 0.3]);
                beams.push([V(CX, RIDGE + dy, z), V(XE, EAVE + dy, z), 0.3]);
            });
            beams.push([V(XW, EAVE - 0.4, z), V(XE, EAVE - 0.4, z), 0.28]);
            // aste della capriata: montanti e diagonali
            const n = 4;
            for (let i = 1; i < n; i++) {
                const x = XW + (XE - XW) * i / n;
                beams.push([V(x, EAVE - 0.4, z), V(x, roofY(x) - 0.3, z), 0.18]);
            }
        });
        // arcarecci longitudinali appoggiati sulle capriate
        for (let k = 0; k <= 10; k++) {
            const x = XW + (XE - XW) * k / 10;
            beams.push([V(x, roofY(x) + 0.12, ZN), V(x, roofY(x) + 0.12, ZS), 0.16]);
        }
        // pilastri lungo le pareti lunghe
        trussZ.forEach(z => [XW + 0.25, XE - 0.25].forEach(x => beams.push([V(x, 0, z), V(x, EAVE, z), 0.4])));
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(beams), woodMat));

        // ---------- 2. soffitto a pannelli bianchi sulle due falde
        const ceilTex = loadFileTexture(T + 'ceiling.jpg', { wrap: true });
        const ceilMat = new THREE.MeshStandardMaterial({ map: ceilTex, color: 0xf2f2ee, roughness: 0.9, side: THREE.DoubleSide, emissive: 0x2a2a28 });
        [[XW, CX], [CX, XE]].forEach(([xa, xb]) => {
            const ya = roofY(xa) + 0.22, yb = roofY(xb) + 0.22;
            const len = Math.hypot(xb - xa, yb - ya), L = ZS - ZN;
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute([xa, ya, ZN, xb, yb, ZN, xa, ya, ZS, xb, yb, ZS], 3));
            g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, len / 1.2, 0, 0, L / 1.2, len / 1.2, L / 1.2], 2));
            g.setIndex([0, 2, 1, 1, 2, 3]);
            g.computeVertexNormals();
            targetGroup.add(new THREE.Mesh(g, ceilMat));
        });

        // ---------- 3. pareti in pannelli OSB, fascia di finestre in alto, timpani
        const osbTex = loadFileTexture(T + 'osb.jpg', { wrap: true });
        const osbMat = new THREE.MeshStandardMaterial({ map: osbTex, color: 0xe2cfb2, roughness: 0.85, side: THREE.DoubleSide });
        const WINY = 4.6;
        const winMat = new THREE.MeshStandardMaterial({ color: 0xdfe8ee, emissive: 0xc8d6e0, emissiveIntensity: 0.55, roughness: 0.3, side: THREE.DoubleSide });
        [[XE, -Math.PI / 2], [XW, Math.PI / 2]].forEach(([x, rot]) => {
            const w = meterPlane(osbMat, ZS - ZN, WINY, 2.44, 1.22);
            w.position.set(x, WINY / 2, 0); w.rotation.y = rot; targetGroup.add(w);
            plane(winMat, ZS - ZN, EAVE - WINY, x, (WINY + EAVE) / 2, 0, rot);
        });
        const mull = [];
        for (let z = ZN; z <= ZS + 0.01; z += 2) [XE - 0.05, XW + 0.05].forEach(x => mull.push([V(x, WINY, z), V(x, EAVE, z), 0.08]));
        [XE - 0.05, XW + 0.05].forEach(x => mull.push([V(x, WINY, ZN), V(x, WINY, ZS), 0.1]));
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(mull), std(0x5a5f64, 0.5, { metalness: 0.4 })));
        // pareti di testata con il timpano
        [ZN, ZS].forEach(z => {
            const shape = new THREE.Shape();
            shape.moveTo(XW, 0); shape.lineTo(XE, 0); shape.lineTo(XE, EAVE); shape.lineTo(CX, RIDGE + 0.3); shape.lineTo(XW, EAVE); shape.lineTo(XW, 0);
            const g = new THREE.ShapeGeometry(shape);
            const uv = g.attributes.uv, pa = g.attributes.position;
            for (let i = 0; i < uv.count; i++) uv.setXY(i, pa.getX(i) / 2.44, pa.getY(i) / 1.22);
            const m = new THREE.Mesh(g, osbMat);
            m.position.z = z;
            targetGroup.add(m);
        });

        // ---------- 4. pavimento attorno alla pista
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(XE - XW, ZS - ZN), std(0x8e8f8c, 0.85));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(CX, -0.01, 0);
        targetGroup.add(apron);

        // ---------- 5. reti beige attorno alla pista, con i pali grigi
        const netTex = loadFileTexture('assets/textures/kraken_camaiore/net_white.png', { repeat: [1 / 0.1, 1 / 0.1] });
        const netMat = new THREE.MeshBasicMaterial({ map: netTex, color: 0xa89a78, transparent: true, opacity: 1.0, alphaTest: 0.1, side: THREE.DoubleSide, depthWrite: false });
        const steel = std(0x8a8d90, 0.5, { metalness: 0.5 });
        const posts = [];
        const NET_TOP = 5.4;
        const netPanel = (w, y0, y1, x, z, rotY) => {
            const m = meterPlane(netMat, w, y1 - y0, 1, 1);
            m.position.set(x, (y0 + y1) / 2, z); m.rotation.y = rotY; targetGroup.add(m);
        };
        [-1, 1].forEach(dir => {                                // testate, subito dietro le balaustre
            const zN = dir * 36.6;
            netPanel(34.4, 1.15, NET_TOP, 0, zN, 0);
            for (let x = -17.2; x <= 17.21; x += 4.3) posts.push([V(x, 0, zN + dir * 0.2), V(x, NET_TOP, zN + dir * 0.2), 0.06]);
            posts.push([V(-17.2, NET_TOP, zN), V(17.2, NET_TOP, zN), 0.03]);
        });
        [[-21.2, Math.PI / 2], [21.6, -Math.PI / 2]].forEach(([x, rot]) => {   // fianchi: dietro panchine e cronometristi
            netPanel(73.2, x < 0 ? 1.15 : 2.6, NET_TOP, x, 0, rot);
            for (let z = -36; z <= 36.01; z += 4) posts.push([V(x, 0, z), V(x, NET_TOP, z), 0.06]);
            posts.push([V(x, NET_TOP, -36.6), V(x, NET_TOP, 36.6), 0.03]);
        });
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(posts), steel));
        // parapetto basso (-x) davanti al pubblico in piedi
        const lowWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.15, 72), std(0xdedcd6, 0.8));
        lowWall.position.set(-21.2, 0.575, 0);
        targetGroup.add(lowWall);

        // ---------- 6. teloni bianchi con le cinghie nere a X dietro la porta sud (e in parte a nord)
        const tarpTex = loadFileTexture(T + 'tarp.jpg', { wrap: true });
        const tarpMat = new THREE.MeshStandardMaterial({ map: tarpTex, color: 0xf0ede4, roughness: 0.9, side: THREE.DoubleSide });
        const tS = meterPlane(tarpMat, 36, 4.2, 3, 4.2);
        tS.position.set(0, 3.25, 38.4); targetGroup.add(tS);
        const tN = meterPlane(tarpMat, 12, 4.2, 3, 4.2);
        tN.position.set(-12, 3.25, -40.5); targetGroup.add(tN);
        const tarpBar = [[V(-18, 5.4, 38.4), V(18, 5.4, 38.4), 0.06], [V(-18, 5.4, -40.5), V(-6, 5.4, -40.5), 0.06]];
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(tarpBar), steel));

        // ---------- 7. luci: plafoniere a tubo e lampade a campana
        const tubeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const housing = std(0x6b6e72, 0.5, { metalness: 0.4 });
        const tubes = [], bells = [];
        for (let i = 0; i < trussZ.length - 1; i++) {
            const z = (trussZ[i] + trussZ[i + 1]) / 2;
            [-12, -3, 6, 15].forEach(x => tubes.push(V(x, roofY(x) - 0.45, z)));
            if (!lowQ) [-17, 1.5, 19].forEach(x => bells.push(V(x, roofY(x) - 1.1, trussZ[i] + 1.5)));
        }
        const tubeM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.1, 1.6), tubeMat, tubes.length);
        const tubeH = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.08, 1.7), housing, tubes.length);
        const tmpM = new THREE.Matrix4();
        tubes.forEach((p, i) => { tmpM.makeTranslation(p.x, p.y, p.z); tubeM.setMatrixAt(i, tmpM); tmpM.makeTranslation(p.x, p.y + 0.08, p.z); tubeH.setMatrixAt(i, tmpM); });
        targetGroup.add(tubeM, tubeH);
        if (bells.length) {
            const bellM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.32, 0.4, 12, 1, true), std(0x9a9da0, 0.45, { metalness: 0.5, side: THREE.DoubleSide }), bells.length);
            const bulb = new THREE.InstancedMesh(new THREE.CircleGeometry(0.28, 12).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff6e0, side: THREE.DoubleSide }), bells.length);
            bells.forEach((p, i) => { tmpM.makeTranslation(p.x, p.y, p.z); bellM.setMatrixAt(i, tmpM); tmpM.makeTranslation(p.x, p.y - 0.19, p.z); bulb.setMatrixAt(i, tmpM); });
            targetGroup.add(bellM, bulb);
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry(bells.map(p => [V(p.x, p.y + 0.2, p.z), V(p.x, roofY(p.x), p.z), 0.015])), housing));
        }
        if (!lowQ) {
            const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
            tubes.forEach((p, i) => {
                if (i % 3) return;
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(2.2, 2.2, 1);
                spr.position.set(p.x, p.y - 0.15, p.z);
                targetGroup.add(spr);
            });
        }

        // ---------- 8. striscioni (nomi leggibili nelle foto)
        const bMats = {};
        const bMat = f => bMats[f] || (bMats[f] = (() => { const t = loadFileTexture(T + f); return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.12, roughness: 0.85, side: THREE.DoubleSide }); })());
        const banner = (f, w, h, x, y, z, rotY) => plane(bMat(f), w, h, x, y, z, rotY);
        banner('banner_blancio.jpg', 4.6, 2.0, -8.5, 2.7, 38.3, Math.PI);       // sui teloni a sud
        banner('banner_novasiria.jpg', 3.2, 1.2, -3.0, 3.2, 38.3, Math.PI);
        banner('banner_valmora.jpg', 3.0, 1.1, 2.0, 3.1, -36.75, 0);           // sulla rete nord
        banner('banner_giordan.jpg', 4.4, 1.6, XE - 0.06, 3.4, -12, -Math.PI / 2);  // parete dietro le panchine
        banner('banner_canton.jpg', 4.0, 1.5, XE - 0.06, 3.4, 10, -Math.PI / 2);
        banner('banner_oldstyle.jpg', 4.4, 1.9, XE - 0.06, 3.3, -26, -Math.PI / 2);

        // ---------- 9. balconata in legno (-x): soletta, montanti e corrimano, vetri
        const GX0 = -25.2, GY = 3.0, GZ0 = -26, GZ1 = 26;
        const slab = new THREE.Mesh(new THREE.BoxGeometry(GX0 - XW, 0.3, GZ1 - GZ0), std(0x9c9a94, 0.85));
        slab.position.set((GX0 + XW) / 2, GY - 0.15, 0);
        targetGroup.add(slab);
        const under = meterPlane(osbMat, GZ1 - GZ0, GY - 0.3, 2.44, 1.22);       // parete sotto la balconata
        under.position.set(GX0 - 0.6, (GY - 0.3) / 2, 0); under.rotation.y = Math.PI / 2; targetGroup.add(under);
        const gw = [];
        for (let z = GZ0; z <= GZ1 + 0.01; z += 3.25) gw.push([V(GX0, 0, z), V(GX0, GY + 1.2, z), 0.22]);
        gw.push([V(GX0, GY + 1.1, GZ0), V(GX0, GY + 1.1, GZ1), 0.16], [V(GX0, GY + 0.1, GZ0), V(GX0, GY + 0.1, GZ1), 0.2]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(gw), woodMat));
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(GZ1 - GZ0, 0.9), new THREE.MeshBasicMaterial({ color: 0xcfe4ee, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
        glass.position.set(GX0 + 0.05, GY + 0.6, 0); glass.rotation.y = Math.PI / 2;
        targetGroup.add(glass);

        // ---------- 10. pubblico: in piedi dietro la rete (-x), sulla balconata e dietro la porta nord
        const outfits = [0x161616, 0xecc01c, 0xf8fafc, 0x6b7280, 0x1e3a8a, 0x7c2d12, 0x374151, 0xc81e1e];
        const jm = outfits.map(c => std(c, 0.65));
        const pantsM = std(0x1e293b, 0.8), handM = std(0xc99178, 0.6), hairM = std(0x2a1d14, 0.8);
        const fan = (x, y, z, rotY) => {
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
            root.rotation.y = rotY + (Math.random() - 0.5) * 0.3;
            const childLift = maybeMakeCrowdChild(root, headGroup, false);
            targetGroup.add(root);
            crowdMembers.push({ mesh: root, bodyPivot, headGroup, leftArmPivot, rightArmPivot, baseY: y + childLift, phase: Math.random() * Math.PI * 2, standing: true });
        };
        const keep = preset.crowdKeepRatio;
        const jit = () => (Math.random() - 0.5) * 0.2;
        [-21.8, -22.7].forEach((x, row) => {                     // a bordo pista, dietro la rete
            for (let z = -32; z <= 32; z += 0.75) if (Math.random() < keep * (0.45 - row * 0.15)) fan(x + jit(), 0, z + jit(), Math.atan2(z, 40) * 0.3);
        });
        [GX0 - 0.6, GX0 - 1.5].forEach((x, row) => {             // balconata
            for (let z = GZ0 + 0.8; z <= GZ1 - 0.8; z += 0.7) if (Math.random() < keep * (0.6 - row * 0.2)) fan(x + jit(), GY, z + jit(), Math.atan2(z, 40) * 0.3);
        });
        for (let x = -15; x <= 15; x += 0.8) if (Math.random() < keep * 0.35) fan(x + jit(), 0, -38.4 + jit(), -Math.PI / 2);   // dietro la porta nord

        // ---------- 11. sostegni del tabellone, appeso alla capriata nord
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry([[V(-1.6, 6.4, -39.5), V(-1.6, roofY(-1.6), -39.5), 0.03], [V(1.6, 6.4, -39.5), V(1.6, roofY(1.6), -39.5), 0.03]]), housing));
    }

    registerArenaBuilder('torre_pellice', buildTorrePelliceArchitecture);
})();
