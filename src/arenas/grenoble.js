// Palazzetto "grenoble": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // HALLE CLEMENCEAU — GRENOBLE (Isère), casa degli Yétis de Grenoble. Grande sala coperta da una volta in
    // legno scuro su archi lamellari che scendono fino a terra, con le file di fari appesi. Lato ovest
    // (cronometristi): la grande tribuna in cemento con le panche di legno scuro, le scale e, in alto, la
    // passerella con i fari; davanti, le transenne metalliche. Lato est (panchine): tende arancioni davanti alle
    // vetrate e la cabina bianca della regia sollevata. Testata nord con la casetta in legno vetrata del club e il
    // tabellone, testata sud con le tende e lo striscione del club. Pista azzurro chiaro con le aree di porta
    // arancio-rosse e gli stemmi del club, balaustre bianche col bordo giallo, niente vetro.
    // Altezze: volta a 19 m in chiave e a 16,6 m sopra x = ±10: le telecamere di gioco restano ben sotto.
    // Texture in assets/textures/grenoble/ (tools/generate_grenoble_textures.py).
    // =====================================================================
    function buildGrenobleArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/grenoble/';
        const XC = -7, A = 33, B = 17, Y0 = 2, WALL = 31;   // volta: semi-ellisse centrata in XC, pareti a XC ± 31
        const XW = XC - WALL, XE = XC + WALL, ZL = 42, LEN = 2 * ZL;
        const vaultY = x => Y0 + B * Math.sqrt(Math.max(0, 1 - Math.pow((x - XC) / A, 2)));
        const WALL_H = vaultY(XE);                         // ≈ 7,8 m: dove la volta incontra le pareti
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);

        const glulam = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'glulam.jpg', { wrap: true }), roughness: 0.6, emissive: 0x1c1006 });
        const greyMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.5, metalness: 0.5 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x26282c, roughness: 0.6, metalness: 0.3 });
        const concrete = new THREE.MeshStandardMaterial({ color: 0x8e8b86, roughness: 0.9 });
        const tex = (f, rep) => loadFileTexture(T + f, rep ? { repeat: rep } : {});
        const flat = (w, h, mat, x, y, z, ry, parent) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
            m.position.set(x, y, z);
            m.rotation.y = ry || 0;
            (parent || targetGroup).add(m);
            return m;
        };
        const box = (w, h, d, mat, x, y, z, parent) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            m.position.set(x, y, z);
            (parent || targetGroup).add(m);
            return m;
        };
        const lit = (t, k) => new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: k || 0.15, roughness: 0.8, side: THREE.DoubleSide });
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: 15.4 };

        // ---------- 1. pavimento in cemento grigio attorno alla pista
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(XE - XW, LEN), new THREE.MeshStandardMaterial({ color: 0x77787a, roughness: 0.75 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(XC, -0.01, 0);
        targetGroup.add(apron);

        // ---------- 2. volta in legno scuro (semi-ellisse estrusa lungo la sala) e archi lamellari
        const th0 = Math.acos(WALL / A), th1 = Math.PI - th0;
        const ell = (th, inset) => {
            const nx = Math.cos(th) / A, ny = Math.sin(th) / B, nl = Math.hypot(nx, ny);
            return V(XC + A * Math.cos(th) - (inset || 0) * nx / nl, Y0 + B * Math.sin(th) - (inset || 0) * ny / nl, 0);
        };
        const nTh = lowQ ? 32 : 56, nZ = lowQ ? 6 : 12;
        const arcLen = (th1 - th0) * Math.sqrt((A * A + B * B) / 2);
        const vPos = [], vUv = [], vIdx = [];
        for (let j = 0; j <= nZ; j++) {
            const z = -ZL + LEN * j / nZ;
            for (let i = 0; i <= nTh; i++) {
                const p = ell(th0 + (th1 - th0) * i / nTh);
                vPos.push(p.x, p.y, z);
                vUv.push((z + ZL) / 6, (i / nTh) * arcLen / 4);
            }
        }
        for (let j = 0; j < nZ; j++) for (let i = 0; i < nTh; i++) {
            const a = j * (nTh + 1) + i, b = a + nTh + 1;
            vIdx.push(a, b, a + 1, b, b + 1, a + 1);
        }
        const vault = new THREE.BufferGeometry();
        vault.setAttribute('position', new THREE.Float32BufferAttribute(vPos, 3));
        vault.setAttribute('uv', new THREE.Float32BufferAttribute(vUv, 2));
        vault.setIndex(vIdx);
        vault.computeVertexNormals();
        const vaultTex = loadFileTexture(T + 'vault_wood.jpg', { wrap: true });
        ceilGroup.add(new THREE.Mesh(vault, new THREE.MeshStandardMaterial({ map: vaultTex, roughness: 0.75, emissive: 0x24160c, emissiveMap: vaultTex, emissiveIntensity: 0.6, side: THREE.DoubleSide })));
        // archi: nervatura lungo la volta e gambe inclinate fino a terra, ogni 8 m
        const rib = [];
        const NR = lowQ ? 20 : 36;
        for (let i = 0; i < NR; i++) {
            const a0 = th0 + (th1 - th0) * i / NR, a1 = th0 + (th1 - th0) * (i + 1) / NR;
            rib.push([ell(a0, 0.45), ell(a1, 0.45), 0.7]);
        }
        [-1, 1].forEach(s => rib.push([ell(s > 0 ? th0 : th1, 0.45), V(XC + s * (WALL - 2.2), 0, 0), 0.75]));
        const ribGeo = mergeBeamGeometry(rib);
        const archZ = [];
        for (let z = -ZL + 2; z <= ZL - 1.99; z += 8) archZ.push(z);
        const ribs = new THREE.InstancedMesh(ribGeo, glulam, archZ.length);
        archZ.forEach((z, i) => { tmpM.makeTranslation(0, 0, z); ribs.setMatrixAt(i, tmpM); });
        ribs.instanceMatrix.needsUpdate = true;
        ceilGroup.add(ribs);
        // fari a scatola appesi alla volta, a file lungo la sala
        const lamps = [];
        for (let k = 0; k < archZ.length - 1; k++) {
            const z = (archZ[k] + archZ[k + 1]) / 2;
            [-16, -8, 0, 8, 16].forEach(dx => lamps.push([XC + dx + 2, vaultY(XC + dx + 2) - 1.6, z]));
        }
        const body = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.4, 0.7), darkMat, lamps.length);
        const face = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.55, 0.55).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffcf2, side: THREE.DoubleSide }), lamps.length);
        const cables = [];
        lamps.forEach(([x, y, z], i) => {
            tmpM.makeTranslation(x, y, z); body.setMatrixAt(i, tmpM);
            tmpM.makeTranslation(x, y - 0.21, z); face.setMatrixAt(i, tmpM);
            cables.push([V(x - 0.3, y + 0.2, z), V(x - 0.3, vaultY(x) - 0.1, z), 0.015], [V(x + 0.3, y + 0.2, z), V(x + 0.3, vaultY(x) - 0.1, z), 0.015]);
        });
        body.instanceMatrix.needsUpdate = true;
        face.instanceMatrix.needsUpdate = true;
        ceilGroup.add(body, face, new THREE.Mesh(mergeBeamGeometry(cables), darkMat));
        if (!lowQ) {
            const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
            lamps.forEach(([x, y, z], i) => {
                if (i % 2) return;
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff8ea, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(2.6, 2.6, 1);
                spr.position.set(x, y - 0.45, z);
                ceilGroup.add(spr);
            });
        }

        // ---------- 3. pareti lunghe: tende arancioni (est) e muro dietro la tribuna (ovest)
        const curtainMat = (w, h) => new THREE.MeshStandardMaterial({ map: tex('curtain.jpg', [w / 3, h / 7]), roughness: 0.85, side: THREE.DoubleSide, emissive: 0x2a1004 });
        flat(LEN, WALL_H, curtainMat(LEN, WALL_H), XE, WALL_H / 2, 0, -Math.PI / 2);
        flat(LEN, WALL_H, new THREE.MeshStandardMaterial({ map: tex('vault_wood.jpg', [LEN / 6, WALL_H / 4]), roughness: 0.8, side: THREE.DoubleSide }), XW, WALL_H / 2, 0, Math.PI / 2);
        // cabina bianca della regia sul lato est, sollevata su due pilastri
        const BX = XE - 1.6, BZ = 6;
        box(2.4, 2.4, 6, new THREE.MeshStandardMaterial({ color: 0xeceeee, roughness: 0.7 }), BX, 4.6, BZ);
        flat(6, 2.4, lit(tex('booth.jpg'), 0.18), BX - 1.21, 4.6, BZ, -Math.PI / 2);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry([[V(BX, 0, BZ - 2.6), V(BX, 3.4, BZ - 2.6), 0.25], [V(BX, 0, BZ + 2.6), V(BX, 3.4, BZ + 2.6), 0.25]]), greyMat));

        // ---------- 4. testate: tende in basso, legno scuro fino alla volta; casetta del club e striscione
        const endShape = (y0, y1) => {
            const sh = new THREE.Shape();
            const top = x => Math.min(y1, vaultY(x));
            sh.moveTo(XW, y0); sh.lineTo(XE, y0);
            for (let i = 0; i <= 48; i++) { const x = XE - (XE - XW) * i / 48; sh.lineTo(x, Math.max(y0, top(x))); }
            sh.lineTo(XW, y0);
            const g = new THREE.ShapeGeometry(sh);
            const gp = g.attributes.position, gu = g.attributes.uv;
            for (let i = 0; i < gp.count; i++) gu.setXY(i, (gp.getX(i) - XW) / 3, (gp.getY(i) - y0) / 7);
            return g;
        };
        const curtainWrap = loadFileTexture(T + 'curtain.jpg', { wrap: true });
        const endLow = endShape(0, 7.0), endHigh = endShape(7.0, 30);
        const ehp = endHigh.attributes.position, ehu = endHigh.attributes.uv;
        for (let i = 0; i < ehp.count; i++) ehu.setXY(i, ehp.getX(i) / 4, ehp.getY(i) / 4);
        const endWoodMat = new THREE.MeshStandardMaterial({ map: vaultTex, roughness: 0.8, side: THREE.DoubleSide, emissive: 0x1c1008, emissiveMap: vaultTex, emissiveIntensity: 0.4 });
        const endCurtMat = new THREE.MeshStandardMaterial({ map: curtainWrap, roughness: 0.85, side: THREE.DoubleSide, emissive: 0x2a1004 });
        [-ZL, ZL].forEach(z => {
            const lo = new THREE.Mesh(endLow, endCurtMat); lo.position.z = z; targetGroup.add(lo);
            const hi = new THREE.Mesh(endHigh, endWoodMat); hi.position.z = z; targetGroup.add(hi);
        });
        // casetta in legno vetrata del club (testata nord, verso ovest), a due piani col portico
        const CH_X0 = XC - 24, CH_X1 = XC - 4, CH_D = 3.2, CH_H = 7.0;
        const chMat = new THREE.MeshStandardMaterial({ map: tex('club_house.jpg'), roughness: 0.7 });
        box(CH_X1 - CH_X0, 0.3, CH_D, new THREE.MeshStandardMaterial({ color: 0x8a5a30, roughness: 0.7 }), (CH_X0 + CH_X1) / 2, CH_H + 0.15, -ZL + CH_D / 2);
        flat(CH_X1 - CH_X0, CH_H, chMat, (CH_X0 + CH_X1) / 2, CH_H / 2, -ZL + CH_D, 0);
        [CH_X0, CH_X1].forEach(x => flat(CH_D, CH_H, new THREE.MeshStandardMaterial({ color: 0xa8743e, roughness: 0.7, side: THREE.DoubleSide }), x, CH_H / 2, -ZL + CH_D / 2, Math.PI / 2));
        // striscione del club sulla testata sud
        flat(6.2, 2.3, lit(tex('banner_club.jpg'), 0.15), XC + 6, 8.6, ZL - 0.06, Math.PI);

        // ---------- 5. grande tribuna ovest: gradoni in cemento, panche in legno scuro, scale, passerella in alto
        const ZT = 34, TL = 2 * ZT, X0 = -22.4, D = 0.82, STEP_H = 0.42, TIERS = lowQ ? 12 : 15, BASE = 0.6;
        const benchMat = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.7 });
        box(0.25, BASE + 0.9, TL, concrete, X0 + 0.12, (BASE + 0.9) / 2, 0);                        // muretto davanti
        const rows = [];
        for (let k = 0; k < TIERS; k++) {
            const h = BASE + k * STEP_H, xf = X0 - k * D;
            box(D, h, TL, concrete, xf - D / 2, h / 2, 0);
            box(0.36, 0.06, TL - 1, benchMat, xf - D + 0.3, h + 0.42, 0);                           // panca
            rows.push([xf - D + 0.3, h]);
        }
        const xBack = X0 - TIERS * D, topH = BASE + TIERS * STEP_H;
        if (xBack > XW) box(xBack - XW, topH, TL, concrete, (XW + xBack) / 2, topH / 2, 0);
        [-1, 1].forEach(sgn => box(X0 - XW, topH + 0.1, 0.25, concrete, (X0 + XW) / 2, (topH + 0.1) / 2, sgn * (ZT + 0.12)));
        // scale chiare fra i settori, ringhiere gialle
        const stairs = [-17, 0, 17], rails = [];
        const stairMat = new THREE.MeshStandardMaterial({ color: 0xc8c4bc, roughness: 0.8 });
        stairs.forEach(z => {
            for (let k = 0; k < TIERS; k++) box(D, 0.05, 1.1, stairMat, X0 - k * D - D / 2, BASE + k * STEP_H + 0.02, z);
            [-0.6, 0.6].forEach(dz => rails.push([V(X0, BASE + 1.0, z + dz), V(xBack, topH + 1.0, z + dz), 0.04]));
        });
        rails.push([V(X0 + 0.12, BASE + 1.85, -ZT), V(X0 + 0.12, BASE + 1.85, ZT), 0.05]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rails), new THREE.MeshStandardMaterial({ color: 0xd8b234, roughness: 0.5, metalness: 0.4 })));
        // passerella in alto con la fila di fari puntati sulla pista
        const catY = Math.min(topH + 3.2, vaultY(xBack + 1) - 1.0);
        box(1.2, 0.18, TL + 4, greyMat, xBack + 1.2, catY, 0, ceilGroup);
        const catRail = [[V(xBack + 1.8, catY + 1.0, -ZT - 2), V(xBack + 1.8, catY + 1.0, ZT + 2), 0.04]];
        for (let z = -ZT - 2; z <= ZT + 2; z += 3) catRail.push([V(xBack + 1.8, catY, z), V(xBack + 1.8, catY + 1.0, z), 0.035]);
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(catRail), darkMat));
        const spots = [];
        for (let z = -ZT; z <= ZT; z += 4) spots.push([xBack + 1.9, catY + 0.3, z]);
        const spotM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), darkMat, spots.length);
        const spotF = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.3, 0.22).rotateY(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffcf0, side: THREE.DoubleSide }), spots.length);
        spots.forEach(([x, y, z], i) => { tmpM.makeTranslation(x, y, z); spotM.setMatrixAt(i, tmpM); tmpM.makeTranslation(x + 0.21, y, z); spotF.setMatrixAt(i, tmpM); });
        spotM.instanceMatrix.needsUpdate = true;
        spotF.instanceMatrix.needsUpdate = true;
        ceilGroup.add(spotM, spotF);

        // ---------- 6. transenne metalliche: davanti alla tribuna e dietro le porte
        const fence = [];
        const fenceRun = (x0, z0, x1, z1) => {
            const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 2.3));
            for (let i = 0; i < n; i++) {
                const a = i / n, b = (i + 1) / n - 0.02;
                const pa = V(x0 + (x1 - x0) * a, 0, z0 + (z1 - z0) * a), pb = V(x0 + (x1 - x0) * b, 0, z0 + (z1 - z0) * b);
                fence.push([pa.clone().setY(1.1), pb.clone().setY(1.1), 0.04], [pa.clone().setY(0.15), pb.clone().setY(0.15), 0.035]);
                fence.push([pa, pa.clone().setY(1.1), 0.04], [pb, pb.clone().setY(1.1), 0.04]);
                for (let k = 1; k < 8; k++) { const t = k / 8, q = pa.clone().lerp(pb, t); fence.push([q.clone().setY(0.15), q.clone().setY(1.1), 0.015]); }
            }
        };
        fenceRun(-21.2, -ZT, -21.2, -3);
        fenceRun(-21.2, 3, -21.2, ZT);
        [-1, 1].forEach(s => fenceRun(-16, s * 38.6, 16, s * 38.6));
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(fence), greyMat));

        // ---------- 7. pubblico: sulla grande tribuna, qualcuno alle transenne e davanti alle tende
        const outfits = [0x2446a6, 0xe0302f, 0xf8fafc, 0x141416, 0x2446a6, 0x14204a, 0x4b5563, 0xe0302f, 0x9ca3af];
        const jm = outfits.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 }));
        const pantsM = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const handM = new THREE.MeshStandardMaterial({ color: 0xc99178, roughness: 0.6 });
        const hairM = new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.8 });
        const fan = (x, y, z, faceAngle, sitting) => {
            const root = new THREE.Group();
            const mt = jm[Math.floor(Math.random() * jm.length)];
            const legH = sitting ? 0.42 : 0.82;
            [-0.11, 0.11].forEach(lz => { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, legH, 7), pantsM); lg.position.set(sitting ? 0.18 : 0, legH / 2, lz); root.add(lg); });
            const bodyPivot = new THREE.Group();
            bodyPivot.position.set(0, legH, 0);
            root.add(bodyPivot);
            const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.55, 10), mt); torso.position.y = 0.27; bodyPivot.add(torso);
            const headGroup = new THREE.Group(); headGroup.position.y = 0.69;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), getRandomPhotoFaceMaterial());
            const hair = new THREE.Mesh(new THREE.SphereGeometry(0.148, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM); hair.position.x = -0.015;
            headGroup.add(head, hair); bodyPivot.add(headGroup);
            const arm = sz => { const ap = new THREE.Group(); ap.position.set(0, 0.48, sz); const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.42, 7), mt); sl.position.y = -0.21; const hd = new THREE.Mesh(new THREE.SphereGeometry(0.05, 7, 7), handM); hd.position.y = -0.44; ap.add(sl, hd); bodyPivot.add(ap); return ap; };
            const leftArmPivot = arm(-0.24), rightArmPivot = arm(0.24);
            root.position.set(x, y, z);
            root.rotation.y = faceAngle + (Math.random() - 0.5) * 0.3;
            const childLift = maybeMakeCrowdChild(root, headGroup, false);
            targetGroup.add(root);
            crowdMembers.push({ mesh: root, bodyPivot, headGroup, leftArmPivot, rightArmPivot, baseY: y + childLift, phase: Math.random() * Math.PI * 2, standing: !sitting });
        };
        const keep = preset.crowdKeepRatio * crowdAttendanceScale();   // pubblico in base all'importanza della partita (index.html)
        // la tribuna è enorme per l'hockey in-line: piena solo nelle grandi occasioni, si riempie dal basso
        rows.forEach(([x, h], k) => {
            for (let z = -ZT + 0.6; z <= ZT - 0.6; z += 0.6) {
                if (stairs.some(s => Math.abs(z - s) < 0.8)) continue;
                if (Math.random() < keep * (0.3 - k * 0.012) * (1 - Math.abs(z) / 60)) fan(x - 0.05, h + 0.04, z, 0, true);
            }
        });
        for (let z = -ZT + 1; z <= ZT - 1; z += 0.8) {
            if (Math.abs(z) < 3.5) continue;
            if (Math.random() < keep * 0.12) fan(-21.7, 0, z, 0, false);              // alle transenne
        }
        for (let z = -34; z <= 34; z += 0.9) {
            if (Math.abs(z) < 17.5 || Math.abs(z - BZ) < 3) continue;
            if (Math.random() < keep * 0.2) fan(XE - 1.2, 0, z, Math.PI, false);       // davanti alle tende, oltre le panchine
        }
    }

    registerArenaBuilder('grenoble', buildGrenobleArchitecture);
})();
