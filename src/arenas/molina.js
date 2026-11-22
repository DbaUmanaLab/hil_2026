// Palazzetto "molina": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // POLIDEPORTIVO CARLOS GARCÍA — LAS PALMAS DE GRAN CANARIA (Molina Sport ACEGC).
    // Capannone con capriate reticolari in acciaio blu scuro e tetto in lamiera grecata con
    // lunghe file di lucernari, proiettori a campana appesi. Pareti color pesca con la fascia
    // arancio-gialla in basso, pilastri blu. Sul lato dei cronometristi tribuna con sedute blu e,
    // sopra, la galleria con la ringhiera blu e le finestre. Sulle testate gli striscioni, i
    // gagliardetti dei club, il tabellone e i canestri sollevati sotto il tetto; reti bianche dietro
    // le porte. Pista in resina azzurra multisport, balaustre bianche con lo zoccolo arancio.
    // Texture in assets/textures/molina/ (tools/generate_molina_textures.py).
    // =====================================================================
    function buildMolinaArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/molina/';
        const XW = 26, ZE = 44;                  // pareti laterali a x = ±XW, testate a z = ±ZE
        const YW = 14, YR = 16;                  // altezza delle pareti, colmo del tetto (sopra le telecamere del tour, ~11 m)
        const BAY = 8;
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        const tmpM = new THREE.Matrix4();
        const roofY = x => YW + (YR - YW) * (1 - Math.abs(x) / XW);   // tetto a due falde

        const steel = new THREE.MeshStandardMaterial({ color: 0x1f2f5c, roughness: 0.5, metalness: 0.5 });
        const blueCol = new THREE.MeshStandardMaterial({ color: 0x23409a, roughness: 0.5, metalness: 0.3 });
        const wallTex = loadFileTexture(T + 'wall.jpg', { wrap: true });
        const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85, side: THREE.DoubleSide });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.5, metalness: 0.3 });
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const glowTex = loadFileTexture(CIT_TEX + 'glow.png');

        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: YW - 0.5 };

        // ---------- 1. pareti: pesca in alto, fascia arancio in basso (UV in metri)
        const wallPlane = (w, h, x, z, ry) => {
            const g = new THREE.PlaneGeometry(w, h);
            const uv = g.attributes.uv;
            for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 6, uv.getY(i));
            const m = new THREE.Mesh(g, wallMat);
            m.position.set(x, h / 2, z);
            m.rotation.y = ry;
            targetGroup.add(m);
            return m;
        };
        wallPlane(2 * ZE, YW, -XW, 0, Math.PI / 2);
        wallPlane(2 * ZE, YW, XW, 0, -Math.PI / 2);
        wallPlane(2 * XW, YW, 0, -ZE, 0);
        wallPlane(2 * XW, YW, 0, ZE, Math.PI);
        // timpani sopra le testate (sotto le falde del tetto)
        const gable = new THREE.Shape();
        gable.moveTo(-XW, YW); gable.lineTo(0, YR + 0.3); gable.lineTo(XW, YW); gable.lineTo(-XW, YW);
        const gMat = new THREE.MeshStandardMaterial({ color: 0xe9b483, roughness: 0.85, side: THREE.DoubleSide });
        [-ZE, ZE].forEach(z => { const m = new THREE.Mesh(new THREE.ShapeGeometry(gable), gMat); m.position.z = z; ceilGroup.add(m); });

        // ---------- 2. tetto in lamiera grecata con le file di lucernari
        const roofTex = loadFileTexture(T + 'roof.jpg', { wrap: true, repeat: [2 * ZE / 2.5, 6] });
        const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, color: 0x9aa4b2, roughness: 0.7, metalness: 0.4, side: THREE.DoubleSide });
        const skyMat = new THREE.MeshBasicMaterial({ color: 0xf2f6fb, side: THREE.DoubleSide });
        skyMat.userData.sunWindow = true;            // finestra verso l'esterno: di giorno ci entra il sole (index.html)
        [-1, 1].forEach(s => {
            const len = Math.hypot(XW, YR - YW);
            const slope = Math.atan2(YR - YW, XW);
            // falda: piano orizzontale inclinato attorno all'asse z (scende verso la parete)
            const roof = new THREE.Mesh(new THREE.PlaneGeometry(len, 2 * ZE).rotateX(-Math.PI / 2).rotateZ(-s * slope), roofMat);
            roof.position.set(s * XW / 2, (YW + YR) / 2 + 0.3, 0);
            ceilGroup.add(roof);
            // lucernari: strisce chiare parallele alla pista, a metà falda
            [0.3, 0.62].forEach(f => {
                const x = s * XW * f;
                const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2 * ZE - 4).rotateX(-Math.PI / 2).rotateZ(-s * slope), skyMat);
                sky.position.set(x, roofY(x) + 0.25, 0);
                ceilGroup.add(sky);
            });
        });

        // ---------- 3. capriate reticolari in acciaio blu e pilastri
        const truss = [];
        const nb = Math.floor((2 * ZE) / BAY);
        for (let k = 0; k <= nb; k++) {
            const z = -ZE + k * BAY;
            const yBot = YW - 1.6;
            truss.push([V(-XW, roofY(-XW), z), V(0, YR, z), 0.26], [V(0, YR, z), V(XW, roofY(XW), z), 0.26]);
            truss.push([V(-XW, yBot, z), V(XW, yBot, z), 0.22]);
            const N = lowQ ? 8 : 14;
            for (let i = 0; i <= N; i++) {
                const x0 = -XW + 2 * XW * i / N, x1 = -XW + 2 * XW * (i + 1) / N;
                truss.push([V(x0, yBot, z), V(x0, roofY(x0), z), 0.1]);
                if (i < N) truss.push([V(x0, yBot, z), V(x1, roofY(x1), z), 0.09]);
            }
        }
        // arcarecci longitudinali
        [-0.8, -0.45, 0, 0.45, 0.8].forEach(f => truss.push([V(f * XW, roofY(f * XW) - 0.15, -ZE), V(f * XW, roofY(f * XW) - 0.15, ZE), 0.14]));
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(truss), steel));
        const cols = [];
        for (let k = 0; k <= nb; k++) [-1, 1].forEach(s => cols.push([V(s * (XW - 0.3), 0, -ZE + k * BAY), V(s * (XW - 0.3), YW, -ZE + k * BAY), 0.5]));
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(cols), blueCol));

        // ---------- 4. proiettori a campana appesi alle capriate
        const lamps = [];
        for (let k = 0; k < nb; k++) [-15, -5, 5, 15].forEach(x => lamps.push(V(x, YW - 2.4, -ZE + k * BAY + BAY / 2)));
        const shade = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.32, 0.5, 0.45, 12, 1, true), darkMat, lamps.length);
        const face = new THREE.InstancedMesh(new THREE.CircleGeometry(0.46, 14).rotateX(Math.PI / 2), lightMat, lamps.length);
        const rods = [];
        lamps.forEach((p, i) => {
            tmpM.makeTranslation(p.x, p.y, p.z); shade.setMatrixAt(i, tmpM);
            tmpM.makeTranslation(p.x, p.y - 0.2, p.z); face.setMatrixAt(i, tmpM);
            rods.push([p, V(p.x, YW - 1.6, p.z), 0.03]);
            if (!lowQ && i % 2 === 0) {
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff6e0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(2.6, 2.6, 1);
                spr.position.set(p.x, p.y - 0.5, p.z);
                ceilGroup.add(spr);
            }
        });
        shade.instanceMatrix.needsUpdate = true; face.instanceMatrix.needsUpdate = true;
        ceilGroup.add(shade, face, new THREE.Mesh(mergeBeamGeometry(rods), darkMat));

        // ---------- 5. tribuna (lato cronometristi, -x): gradoni con sedute blu, galleria sopra
        const concMat = new THREE.MeshStandardMaterial({ color: 0xd9cfc2, roughness: 0.85 });
        const seatMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.5 });
        const seatPos = [];
        [[-30, -7.6], [7.6, 30]].forEach(([z0, z1]) => {
            for (let r = 0; r < 3; r++) {
                const x = -22.2 - r * 1.0, y = 0.35 + r * 0.45;
                const step = new THREE.Mesh(new THREE.BoxGeometry(1.0, y, z1 - z0), concMat);
                step.position.set(x, y / 2, (z0 + z1) / 2);
                targetGroup.add(step);
                for (let z = z0 + 0.4; z < z1 - 0.2; z += 0.55) seatPos.push(V(x + 0.1, y, z));
            }
        });
        const seats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.4, 0.44), seatMat, seatPos.length);
        seatPos.forEach((p, i) => { tmpM.makeTranslation(p.x, p.y + 0.2, p.z); seats.setMatrixAt(i, tmpM); });
        seats.instanceMatrix.needsUpdate = true;
        targetGroup.add(seats);
        // galleria superiore: soletta, ringhiera blu e finestre
        const gallery = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.35, 2 * ZE), concMat);
        gallery.position.set(-XW + 1.7, 4.4, 0);
        targetGroup.add(gallery);
        const rail = [[V(-XW + 3.4, 5.55, -ZE), V(-XW + 3.4, 5.55, ZE), 0.07], [V(-XW + 3.4, 5.0, -ZE), V(-XW + 3.4, 5.0, ZE), 0.05]];
        for (let z = -ZE; z <= ZE; z += 2) rail.push([V(-XW + 3.4, 4.55, z), V(-XW + 3.4, 5.55, z), 0.05]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rail), blueCol));
        const winMat = new THREE.MeshBasicMaterial({ color: 0xeef4fa });
        winMat.userData.sunWindow = true;            // finestra verso l'esterno: di giorno ci entra il sole (index.html)
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x23409a, roughness: 0.5 });
        for (let z = -36; z <= 36; z += 6) {
            const w = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), winMat);
            w.position.set(-XW + 0.05, 6.4, z); w.rotation.y = Math.PI / 2;
            const f = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.3), frameMat);
            f.position.set(-XW + 0.03, 6.4, z); f.rotation.y = Math.PI / 2;
            targetGroup.add(f, w);
        }
        // porte nella fascia bassa sotto la galleria
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x2a2320, roughness: 0.6 });
        [-34, 34].forEach(z => { const d = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.3), doorMat); d.position.set(-XW + 0.06, 1.15, z); d.rotation.y = Math.PI / 2; targetGroup.add(d); });

        // ---------- 6. lato panchine (+x): corridoio con la parete blu scuro e il corrimano
        const navy = new THREE.MeshStandardMaterial({ color: 0x172554, roughness: 0.7 });
        const lowWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.1, 2 * ZE - 8), navy);
        lowWall.position.set(22.6, 0.55, 0);
        targetGroup.add(lowWall);
        const silver = new THREE.MeshStandardMaterial({ color: 0xd8dde3, roughness: 0.3, metalness: 0.6 });
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry([[V(22.6, 1.22, -ZE + 4), V(22.6, 1.22, ZE - 4), 0.09]]), silver));

        // ---------- 7. testate: striscioni, gagliardetti, tabellone, canestri sollevati
        const bMats = {};
        const bMat = f => bMats[f] || (bMats[f] = (() => { const t = loadFileTexture(T + f); return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.14, roughness: 0.85, side: THREE.DoubleSide }); })());
        const hang = (f, w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bMat(f)); m.position.set(x, y, z); m.rotation.y = ry || 0; targetGroup.add(m); };
        // testata sud (+z): grande striscione verde e quello delle Canarie, sotto i gagliardetti
        hang('banner_deportes.jpg', 6.0, 3.0, -2, 7.4, ZE - 0.1, Math.PI);
        hang('banner_canarias.jpg', 5.0, 2.5, 6.5, 7.6, ZE - 0.1, Math.PI);
        hang('banner_molina.jpg', 4.8, 1.8, -10, 7.4, ZE - 0.1, Math.PI);
        for (let i = 0; i < 10; i++) hang(`pennant_${i % 6}.jpg`, 1.6, 2.4, 13 - i * 2.9, 3.8, ZE - 0.12, Math.PI);
        // testata nord (-z): striscioni del club
        hang('banner_molina.jpg', 5.6, 2.1, -9, 6.6, -ZE + 0.1);
        hang('banner_canarias.jpg', 4.4, 2.2, 9, 6.6, -ZE + 0.1);
        // lato panchine, alto sulla parete
        hang('banner_deportes.jpg', 5.0, 2.5, XW - 0.1, 8.2, 10, -Math.PI / 2);
        hang('banner_canarias.jpg', 4.0, 2.0, XW - 0.1, 8.2, -12, -Math.PI / 2);
        // canestri ripiegati sotto il tetto, sulle due testate
        const hoop = [];
        [-1, 1].forEach(s => {
            const z = s * (ZE - 3.5);
            hoop.push([V(-1.2, YW - 1.6, z), V(-1.2, YW - 3.2, z - s * 1.2), 0.06], [V(1.2, YW - 1.6, z), V(1.2, YW - 3.2, z - s * 1.2), 0.06]);
            hoop.push([V(-1.2, YW - 3.2, z - s * 1.2), V(1.2, YW - 3.2, z - s * 1.2), 0.06]);
            const board = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.05, 0.05), new THREE.MeshStandardMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.7 }));
            board.position.set(0, YW - 3.7, z - s * 1.3);
            board.rotation.x = s * 0.5;
            ceilGroup.add(board);
        });
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(hoop), new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4, metalness: 0.5 })));

        // ---------- 8. reti bianche dietro le porte
        const netTex = loadFileTexture(CIT_TEX + 'netting.png', { repeat: [24 / 0.12, 4.5 / 0.12] });
        const netMat = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, depthWrite: false, opacity: 0.55 });
        [-1, 1].forEach(s => {
            const net = new THREE.Mesh(new THREE.PlaneGeometry(24, 4.5), netMat);
            net.position.set(0, 1.15 + 2.25, s * (rinkLength / 2 + 0.3));
            targetGroup.add(net);
        });

        // ---------- 9. pavimento di servizio
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(2 * XW, 2 * ZE), new THREE.MeshStandardMaterial({ color: 0x8fa9bd, roughness: 0.6 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.y = -0.01;
        targetGroup.add(apron);

        // ---------- 10. pubblico in tribuna e in galleria
        const outfits = [0xf5c814, 0x1f4fb5, 0xf8fafc, 0x141416, 0xf5c814, 0xdc2626, 0x4b5563, 0x0ea5e9];
        const jm = outfits.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 }));
        const pantsM = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const handM = new THREE.MeshStandardMaterial({ color: 0xc99178, roughness: 0.6 });
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
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), getRandomPhotoFaceMaterial());
            const hair = new THREE.Mesh(new THREE.SphereGeometry(0.148, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM); hair.position.x = -0.015;
            headGroup.add(head, hair); bodyPivot.add(headGroup);
            const arm = sz => { const ap = new THREE.Group(); ap.position.set(0, 0.48, sz); const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.42, 7), mat); sl.position.y = -0.21; const hd = new THREE.Mesh(new THREE.SphereGeometry(0.05, 7, 7), handM); hd.position.y = -0.44; ap.add(sl, hd); bodyPivot.add(ap); return ap; };
            const leftArmPivot = arm(-0.24), rightArmPivot = arm(0.24);
            root.position.set(x, y, z);
            root.rotation.y = (Math.random() - 0.5) * 0.4;      // 0 = guarda la pista (+x)
            const childLift = maybeMakeCrowdChild(root, headGroup, false);
            targetGroup.add(root);
            crowdMembers.push({ mesh: root, bodyPivot, headGroup, leftArmPivot, rightArmPivot, baseY: y + childLift, phase: Math.random() * Math.PI * 2, standing: true });
        };
        const keep = preset.crowdKeepRatio;
        seatPos.forEach(p => { if (Math.random() < keep * 0.32) fan(p.x - 0.1, p.y, p.z); });
        for (let z = -40; z <= 40; z += 0.9) if (Math.random() < keep * 0.12) fan(-XW + 2.6, 4.58, z);
    }

    registerArenaBuilder('molina', buildMolinaArchitecture);
})();
