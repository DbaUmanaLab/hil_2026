// Palazzetto "rubi": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // PISTA FRANCISCO CALVO (Pavelló Municipal Francisco Calvo) — RUBÍ (Barcellona), casa del Rubí Cent Patins.
    // Copertura piana in lamiera scura su travi reticolari bianche, con le file di lucernari giallo chiaro, le
    // lampade a campana e i grossi condotti dell'aria argentati lungo i lati. Pareti in lamiera grecata chiara su
    // uno zoccolo di blocchi grigio scuro, pilastri bianchi col piede blu, fascia di finestre in alto (di giorno
    // ci entra il sole). Sul lato est (panchine) le due grandi tende arancioni, il tabellone fra le tende e i
    // tabelloni da basket ripiegati verso l'alto. Lato ovest (cronometristi): tribuna rialzata a gradoni in
    // cemento dietro il muretto con la ringhiera. Testata sud: spogliatoi a due piani in blocchi grigi col
    // ballatoio; testata nord con la porta doppia. Pavimento in resina grigia, balaustre basse bianche, reti
    // scure dietro le porte.
    // Altezze: correnti inferiori delle travi a 12,5 m e lampade da 12,1 m in su, sopra la telecamera broadcast
    // (11,6 m); con la vista dall'alto (13,2 m) il soffitto si nasconde.
    // Texture in assets/textures/rubi/ (tools/generate_rubi_textures.py).
    // =====================================================================
    function buildRubiArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/rubi/';
        const XW = -27, XE = 24, ZL = 40;                  // pareti: ovest (tribuna), est (panchine), testate
        const XC = (XW + XE) / 2, LX = XE - XW, LEN = 2 * ZL;
        const ROOF = 14.1, TOPC = 13.9, BOTC = 12.5;        // lamiera, correnti superiore e inferiore
        const PLINTH = 1.8, CL0 = 10.6, CL1 = 12.4;         // zoccolo, fascia di finestre in alto
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);

        // bianco anche visto da sotto, in controluce: un filo di autoilluminazione
        const steelWhite = new THREE.MeshStandardMaterial({ color: 0xe8ebee, roughness: 0.5, metalness: 0.3, emissive: 0x24272a });
        const blueMat = new THREE.MeshStandardMaterial({ color: 0x1d4fa6, roughness: 0.5, metalness: 0.2 });
        const ductMat = new THREE.MeshStandardMaterial({ color: 0xb4b8bc, roughness: 0.35, metalness: 0.75, emissive: 0x202224 });
        const greyMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.6, metalness: 0.4 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.6, metalness: 0.3 });
        const concrete = new THREE.MeshStandardMaterial({ color: 0x9c9a96, roughness: 0.9 });
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
        // finestre e lucernari verso l'esterno: di giorno ci entra il sole (index.html, setupGenericDaylight)
        const winLit = (t, k) => { const m = lit(t, k); m.userData.sunWindow = true; return m; };
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: 12.0 };

        // ---------- 1. pavimento in cemento attorno alla pista
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(LX, LEN), new THREE.MeshStandardMaterial({ color: 0x8a8886, roughness: 0.6 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(XC, -0.01, 0);
        targetGroup.add(apron);

        // ---------- 2. copertura piana: lamiera scura, lucernari, travi reticolari bianche, lampade, condotti
        const deck = new THREE.Mesh(new THREE.PlaneGeometry(LX, LEN), new THREE.MeshStandardMaterial({ map: tex('roof_deck.jpg', [LX / 4, LEN / 4]), roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide }));
        deck.rotation.x = Math.PI / 2;
        deck.position.set(XC, ROOF, 0);
        ceilGroup.add(deck);
        const trussZ = [];
        for (let z = -ZL + 2; z <= ZL - 1.99; z += 6) trussZ.push(z);
        const skyMat = winLit(tex('skylight.jpg'), 0.7);
        for (let k = 0; k < trussZ.length - 1; k++) {
            const z = (trussZ[k] + trussZ[k + 1]) / 2;
            [-17, -9, -1, 7, 15].forEach(x => {
                const s = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 4.0), skyMat);
                s.rotation.x = Math.PI / 2;
                s.position.set(x, ROOF - 0.03, z);
                ceilGroup.add(s);
            });
        }
        const beams = [];
        const nP = 16, dx = LX / nP;
        trussZ.forEach(z => {
            beams.push([V(XW, TOPC, z), V(XE, TOPC, z), 0.16], [V(XW, BOTC, z), V(XE, BOTC, z), 0.14]);
            for (let i = 0; i < nP; i++) {
                const xa = XW + i * dx, xb = xa + dx;
                beams.push([V(xa, BOTC, z), V(xa, TOPC, z), 0.06]);
                beams.push(i % 2 ? [V(xa, BOTC, z), V(xb, TOPC, z), 0.06] : [V(xa, TOPC, z), V(xb, BOTC, z), 0.06]);
            }
        });
        for (let x = XW + 3; x <= XE - 2.99; x += 3.2) beams.push([V(x, TOPC + 0.08, -ZL), V(x, TOPC + 0.08, ZL), 0.12]);   // arcarecci
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(beams), steelWhite));
        // lampade a campana
        const lamps = [];
        for (let k = 0; k < trussZ.length - 1; k++) {
            const z = (trussZ[k] + trussZ[k + 1]) / 2;
            [-19, -12, -5, 2, 9, 16].forEach(x => lamps.push([x, 12.3, z]));
        }
        const bell = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.36, 0.38, 14, 1, true), greyMat, lamps.length);
        const face = new THREE.InstancedMesh(new THREE.CircleGeometry(0.34, 14).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfdfbf2, side: THREE.DoubleSide }), lamps.length);
        const cables = [];
        lamps.forEach(([x, y, z], i) => {
            tmpM.makeTranslation(x, y, z); bell.setMatrixAt(i, tmpM);
            tmpM.makeTranslation(x, y - 0.18, z); face.setMatrixAt(i, tmpM);
            cables.push([V(x, y + 0.19, z), V(x, ROOF - 0.05, z), 0.015]);
        });
        bell.instanceMatrix.needsUpdate = true;
        face.instanceMatrix.needsUpdate = true;
        ceilGroup.add(bell, face, new THREE.Mesh(mergeBeamGeometry(cables), darkMat));
        if (!lowQ) {
            const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
            lamps.forEach(([x, y, z], i) => {
                if (i % 2) return;
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff8ea, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(2.2, 2.2, 1);
                spr.position.set(x, y - 0.35, z);
                ceilGroup.add(spr);
            });
        }
        // condotti dell'aria argentati lungo i due lati lunghi, sotto le travi
        [XW + 3.2, XE - 3.2].forEach(x => {
            const d = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, LEN - 4, lowQ ? 12 : 20, 1, true), ductMat);
            d.rotation.x = Math.PI / 2;
            d.position.set(x, BOTC - 0.4, 0);
            ceilGroup.add(d);
        });

        // ---------- 3. pareti: zoccolo in blocchi, lamiera grecata chiara, fascia di finestre, pilastri bianchi col piede blu
        const plinthMat = (w) => new THREE.MeshStandardMaterial({ map: tex('plinth_block.jpg', [w / 4, PLINTH / 2]), roughness: 0.9, side: THREE.DoubleSide });
        const cladMat = (w, h) => new THREE.MeshStandardMaterial({ map: tex('cladding.jpg', [w / 4, h / 4]), roughness: 0.7, metalness: 0.15, side: THREE.DoubleSide });
        const clereMat = (w) => winLit(tex('clerestory.jpg', [w / 6, 1]), 0.7);
        const wallStack = (len, x, z, ry) => {
            flat(len, PLINTH, plinthMat(len), x, PLINTH / 2, z, ry);
            flat(len, CL0 - PLINTH, cladMat(len, CL0 - PLINTH), x, (CL0 + PLINTH) / 2, z, ry);
            flat(len, CL1 - CL0, clereMat(len), x, (CL0 + CL1) / 2, z, ry);
            flat(len, ROOF - CL1, cladMat(len, ROOF - CL1), x, (ROOF + CL1) / 2, z, ry);
        };
        wallStack(LEN, XE, 0, -Math.PI / 2);
        wallStack(LEN, XW, 0, Math.PI / 2);
        wallStack(LX, XC, -ZL, 0);
        // pilastri a ogni trave sulle pareti lunghe (bianchi, piede blu)
        const colsW = [], colsB = [];
        trussZ.forEach(z => [XW + 0.25, XE - 0.25].forEach(x => { colsW.push([x, z]); colsB.push([x, z]); }));
        const cw = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, ROOF - 1.0, 0.35), steelWhite, colsW.length);
        const cb = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 1.0, 0.4), blueMat, colsB.length);
        colsW.forEach(([x, z], i) => {
            tmpM.makeTranslation(x, 1.0 + (ROOF - 1.0) / 2, z); cw.setMatrixAt(i, tmpM);
            tmpM.makeTranslation(x, 0.5, z); cb.setMatrixAt(i, tmpM);
        });
        cw.instanceMatrix.needsUpdate = true;
        cb.instanceMatrix.needsUpdate = true;
        targetGroup.add(cw, cb);

        // ---------- 4. lato est: tende arancioni, tabellone (da index.html), tabelloni da basket ripiegati
        const curtainMat = new THREE.MeshStandardMaterial({ map: tex('curtain_orange.jpg'), roughness: 0.85, side: THREE.DoubleSide });
        [-11, 11].forEach(z => {
            flat(3.6, 7.4, curtainMat, XE - 0.12, 1.6 + 3.7, z, -Math.PI / 2);
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry([[V(XE - 0.18, 9.05, z - 1.9), V(XE - 0.18, 9.05, z + 1.9), 0.06]]), greyMat));
        });
        const boardGlass = new THREE.MeshPhysicalMaterial({ color: 0xeef4f8, transparent: true, opacity: 0.4, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
        [[XE - 2.6, -1], [XW + 2.6, 1]].forEach(([x, s]) => [-17, 17].forEach(z => {
            const bb = box(0.04, 1.05, 1.8, boardGlass, x, 9.6, z);
            bb.rotation.z = s * 1.1;                                                 // ripiegato verso la parete
            const fr = [[V(x - s * 1.2, 9.0, z), V(x + s * 0.6, BOTC, z), 0.08], [V(x + s * 0.6, BOTC, z), V(x + s * 2.4, BOTC, z), 0.08]];
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry(fr), steelWhite));
        }));
        // testata nord: porta doppia e un cartellone del club
        flat(2.6, 2.6, new THREE.MeshStandardMaterial({ color: 0xb8b6ae, roughness: 0.6, metalness: 0.3 }), -6, 1.3, -ZL + 0.03, 0);
        flat(5.2, 1.95, lit(tex('banner_club.jpg'), 0.14), 6, 3.6, -ZL + 0.04, 0);

        // ---------- 5. testata sud: spogliatoi a due piani in blocchi grigi, ballatoio con la ringhiera e i pilastri
        const BLOCK_TOP = 8.2, BAL_Y = 3.8, BAL_D = 2.0, BX0 = XW, BX1 = XE;
        const blockMat = new THREE.MeshStandardMaterial({ map: tex('block_light.jpg', [LX / 4, BLOCK_TOP / 2]), roughness: 0.9, side: THREE.DoubleSide });
        flat(LX, BLOCK_TOP, blockMat, XC, BLOCK_TOP / 2, ZL, Math.PI);
        flat(LX, CL0 - BLOCK_TOP, cladMat(LX, CL0 - BLOCK_TOP), XC, (CL0 + BLOCK_TOP) / 2, ZL, Math.PI);
        flat(LX, CL1 - CL0, clereMat(LX), XC, (CL0 + CL1) / 2, ZL, Math.PI);
        flat(LX, ROOF - CL1, cladMat(LX, ROOF - CL1), XC, (ROOF + CL1) / 2, ZL, Math.PI);
        box(BX1 - BX0 - 8, 0.28, BAL_D, concrete, XC, BAL_Y - 0.14, ZL - BAL_D / 2);      // ballatoio
        const balFront = ZL - BAL_D;
        const rail = [[V(BX0 + 4, BAL_Y + 1.0, balFront), V(BX1 - 4, BAL_Y + 1.0, balFront), 0.05], [V(BX0 + 4, BAL_Y + 0.5, balFront), V(BX1 - 4, BAL_Y + 0.5, balFront), 0.03]];
        for (let x = BX0 + 4; x <= BX1 - 3.99; x += 1.2) rail.push([V(x, BAL_Y, balFront), V(x, BAL_Y + 1.0, balFront), 0.03]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rail), greyMat));
        const pil = [];
        for (let x = BX0 + 4; x <= BX1 - 3.99; x += 5.4) pil.push([V(x, 0, balFront - 0.1), V(x, BLOCK_TOP, balFront - 0.1), 0.3]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(pil), steelWhite));
        box(BX1 - BX0 - 8, 0.3, BAL_D + 0.2, concrete, XC, BLOCK_TOP - 0.15, ZL - BAL_D / 2 - 0.1);   // pensilina in alto
        [-18, -10, -2, 6, 14].forEach((x, i) => {
            flat(1.0, 2.2, darkMat, x, 1.1, ZL - 0.03, Math.PI);
            flat(1.0, 2.2, i % 2 ? darkMat : greyMat, x + 2, BAL_Y + 1.1, ZL - 0.03, Math.PI);
        });

        // ---------- 6. reti scure dietro le porte
        const NET_H = 5.8;
        const netMat = new THREE.MeshBasicMaterial({ map: loadFileTexture(T + 'net.png', { repeat: [22 / 1.6, NET_H / 1.6] }), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.7 });
        [-1, 1].forEach(sgn => {
            flat(22, NET_H, netMat, 0, 1.15 + NET_H / 2, sgn * 36.2, 0);
            const c = [[V(-11, 1.15 + NET_H, sgn * 36.2), V(11, 1.15 + NET_H, sgn * 36.2), 0.03]];
            [-11, -5.5, 0, 5.5, 11].forEach(x => c.push([V(x, 1.1, sgn * 36.2), V(x, 1.15 + NET_H, sgn * 36.2), 0.05]));
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry(c), greyMat));
        });

        // ---------- 7. tribuna ovest rialzata: muretto con la ringhiera, passaggio in testa e cinque gradoni
        const ZT = 30, TL = 2 * ZT, FRONT = -21.4, WALK_H = 1.6, WALK_D = 1.0, STEP_D = 0.85, STEP_H = 0.42, TIERS = 5;
        box(WALK_D, WALK_H, TL, concrete, FRONT - WALK_D / 2, WALK_H / 2, 0);
        const tierFront = [];
        for (let k = 1; k <= TIERS; k++) {
            const h = WALK_H + k * STEP_H, xf = FRONT - WALK_D - (k - 1) * STEP_D;
            box(STEP_D, h, TL, concrete, xf - STEP_D / 2, h / 2, 0);
            tierFront.push([xf, h]);
        }
        const xBack = FRONT - WALK_D - TIERS * STEP_D;
        box(xBack - XW, WALK_H + TIERS * STEP_H, TL, concrete, (XW + xBack) / 2, (WALK_H + TIERS * STEP_H) / 2, 0);
        [-1, 1].forEach(sgn => box(FRONT - XW, WALK_H + TIERS * STEP_H + 0.1, 0.2, concrete, (FRONT + XW) / 2, (WALK_H + TIERS * STEP_H + 0.1) / 2, sgn * (ZT + 0.1)));
        const trib = [[V(FRONT + 0.05, WALK_H + 1.0, -ZT), V(FRONT + 0.05, WALK_H + 1.0, ZT), 0.06], [V(FRONT + 0.05, WALK_H + 0.5, -ZT), V(FRONT + 0.05, WALK_H + 0.5, ZT), 0.04]];
        for (let z = -ZT; z <= ZT + 0.01; z += 1.6) trib.push([V(FRONT + 0.05, WALK_H, z), V(FRONT + 0.05, WALK_H + 1.0, z), 0.045]);
        // corrimano lungo le scale ai lati della tribuna
        [-1, 1].forEach(sgn => trib.push([V(FRONT - 0.2, WALK_H + 1.0, sgn * (ZT - 0.4)), V(xBack, WALK_H + TIERS * STEP_H + 1.0, sgn * (ZT - 0.4)), 0.05]));
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(trib), greyMat));

        // ---------- 8. pubblico: seduto sui gradoni, alla ringhiera, in piedi sul lato est e in ballatoio
        const outfits = [0x141416, 0xc8a46a, 0xf8fafc, 0x141416, 0x9ca3af, 0x2e62b8, 0x4b5563, 0xd71f26, 0xf5c518];
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
        // seduti sul bordo di ogni gradone, le gambe sul gradino sotto
        tierFront.forEach(([xf, h], k) => {
            for (let z = -ZT + 1.2; z <= ZT - 1.2; z += 0.6) {
                if (Math.random() < keep * (0.38 - k * 0.05) * (1 - Math.abs(z) / 50)) fan(xf - 0.15, h - 0.42 + 0.04, z, 0, true);
            }
        });
        // in piedi alla ringhiera, sul passaggio
        for (let z = -ZT + 1; z <= ZT - 1; z += 0.8) if (Math.random() < keep * 0.22) fan(FRONT - 0.45, WALK_H, z, 0, false);
        for (let z = -33; z <= 33; z += 0.9) {
            if (Math.abs(z) < 17.5) continue;
            if (Math.random() < keep * 0.2) fan(XE - 1.2, 0, z, Math.PI, false);
        }
        // qualcuno affacciato dal ballatoio della testata sud (guarda verso -z)
        for (let x = BX0 + 5; x <= BX1 - 5; x += 0.9) if (Math.random() < keep * 0.2) fan(x, BAL_Y, balFront + 0.5, Math.PI / 2, false);
    }

    registerArenaBuilder('rubi', buildRubiArchitecture);
})();
