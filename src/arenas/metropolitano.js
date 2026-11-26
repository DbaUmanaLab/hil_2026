// Palazzetto "metropolitano": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // POLIDEPORTIVO MUNICIPAL DE ZORROZA — BILBAO (Bizkaia), casa del Metropolitano Hockey Club. Capannone
    // luminoso con le pareti di policarbonato lattiginoso dal telaio grigio, da una zoccolatura in lamiera fino al
    // tetto. Copertura piana su grandi travi grigie a doppio T, pannelli color miele grecati, file di lucernari
    // fra le travi e fari rettangolari. Lato ovest (cronometristi): vetro sopra le balaustre e la tribuna a
    // quattro gradoni con le panche bianche, il passaggio in alto con la ringhiera. Reti beige dietro le porte,
    // stendardi blu-bianco-rossi del club sulla parete est, tabellone sulla testata nord.
    // Altezze: travi da 13,6 m in su, sopra le telecamere di gioco (broadcast 11,6 m, dall'alto 13,2 m).
    // Texture in assets/textures/metropolitano/ (tools/generate_metropolitano_textures.py).
    // =====================================================================
    function buildMetropolitanoArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/metropolitano/';
        const XW = -27, XE = 24, ZL = 40;                  // pareti: ovest (tribuna), est (panchine), testate
        const XC = (XW + XE) / 2, LX = XE - XW, LEN = 2 * ZL;
        const ROOF = 14.8, BEAM_BOT = 13.6, LOW_H = 2.0;
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);

        // grigio anche visto da sotto, in controluce: un filo di autoilluminazione
        const steelGrey = new THREE.MeshStandardMaterial({ color: 0x6e737a, roughness: 0.55, metalness: 0.35, emissive: 0x1a1c1f });
        const greyMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.6, metalness: 0.4 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x26282c, roughness: 0.6, metalness: 0.3 });
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
        // pareti in policarbonato e lucernari: di giorno ci entra il sole (index.html, setupGenericDaylight)
        const winLit = (t, k) => { const m = lit(t, k); m.userData.sunWindow = true; return m; };
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: BEAM_BOT - 0.3 };

        // ---------- 1. piastrelle grigio scuro attorno alla pista
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(LX, LEN), new THREE.MeshStandardMaterial({ map: tex('apron_tiles.jpg', [LX / 4, LEN / 4]), roughness: 0.6 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(XC, -0.01, 0);
        targetGroup.add(apron);

        // ---------- 2. copertura piana: pannelli color miele, travi grigie a doppio T, lucernari, fari
        const deck = new THREE.Mesh(new THREE.PlaneGeometry(LX, LEN), new THREE.MeshStandardMaterial({ map: tex('roof_deck.jpg', [LX / 4, LEN / 4]), roughness: 0.7, metalness: 0.1, emissive: 0x2a2214, side: THREE.DoubleSide }));
        deck.rotation.x = Math.PI / 2;
        deck.position.set(XC, ROOF, 0);
        ceilGroup.add(deck);
        const beamZ = [];
        for (let z = -ZL + 4; z <= ZL - 3.99; z += 6) beamZ.push(z);
        const webH = ROOF - 0.1 - BEAM_BOT;
        beamZ.forEach(z => {
            box(LX, webH, 0.16, steelGrey, XC, BEAM_BOT + webH / 2, z, ceilGroup);            // anima
            box(LX, 0.08, 0.5, steelGrey, XC, BEAM_BOT + 0.04, z, ceilGroup);                 // ala inferiore
            box(LX, 0.08, 0.5, steelGrey, XC, ROOF - 0.14, z, ceilGroup);                     // ala superiore
        });
        // arcarecci longitudinali sopra le travi
        const purlins = [];
        for (let x = XW + 3; x <= XE - 2.99; x += 4) purlins.push([V(x, ROOF - 0.3, -ZL), V(x, ROOF - 0.3, ZL), 0.22]);
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(purlins), steelGrey));
        // lucernari: tre file, uno per campata
        const skyMat = winLit(tex('skylight.jpg'), 0.7);
        for (let k = 0; k < beamZ.length - 1; k++) {
            const z = (beamZ[k] + beamZ[k + 1]) / 2;
            [-14.5, -1.5, 11.5].forEach(x => {
                const s = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6), skyMat);
                s.rotation.x = Math.PI / 2;
                s.position.set(x, ROOF - 0.03, z);
                ceilGroup.add(s);
            });
        }
        // fari rettangolari appesi sotto le ali inferiori delle travi
        const lights = [];
        beamZ.forEach(z => [-19, -12, -5, 2, 9, 16].forEach(x => lights.push([x, BEAM_BOT - 0.12, z])));
        const ledBody = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.16, 0.5), darkMat, lights.length);
        const ledFace = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.6, 0.42).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffdf6, side: THREE.DoubleSide }), lights.length);
        lights.forEach(([x, y, z], i) => {
            tmpM.makeTranslation(x, y, z); ledBody.setMatrixAt(i, tmpM);
            tmpM.makeTranslation(x, y - 0.085, z); ledFace.setMatrixAt(i, tmpM);
        });
        ledBody.instanceMatrix.needsUpdate = true;
        ledFace.instanceMatrix.needsUpdate = true;
        ceilGroup.add(ledBody, ledFace);
        if (!lowQ) {
            const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
            lights.forEach(([x, y, z], i) => {
                if (i % 2) return;
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfffaf0, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(2.2, 2.2, 1);
                spr.position.set(x, y - 0.3, z);
                ceilGroup.add(spr);
            });
        }

        // ---------- 3. pareti: zoccolatura in lamiera grigia, policarbonato lattiginoso fino al tetto, pilastri grigi
        const lowMat = (w) => new THREE.MeshStandardMaterial({ map: tex('wall_low.jpg', [w / 4, 1]), roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });
        const POLY_H = ROOF - LOW_H;
        const polyMat = (w) => winLit(tex('poly_wall.jpg', [w / 4, POLY_H / 5]), 0.6);
        // pareti lunghe
        [[XE, -Math.PI / 2], [XW, Math.PI / 2]].forEach(([x, ry]) => {
            flat(LEN, LOW_H, lowMat(LEN), x, LOW_H / 2, 0, ry);
            flat(LEN, POLY_H, polyMat(LEN), x, LOW_H + POLY_H / 2, 0, ry);
        });
        // testate
        [[-ZL, 0], [ZL, Math.PI]].forEach(([z, ry]) => {
            const dz = z < 0 ? 0.02 : -0.02;
            flat(LX, LOW_H, lowMat(LX), XC, LOW_H / 2, z + dz, ry);
            flat(LX, POLY_H, polyMat(LX), XC, LOW_H + POLY_H / 2, z, ry);
        });
        // pilastri a ogni trave sulle pareti lunghe, e ogni 6 m sulle testate
        const cols = [];
        beamZ.forEach(z => [XW + 0.25, XE - 0.25].forEach(x => cols.push([x, z])));
        for (let x = XW + 4.5; x <= XE - 4.49; x += 6) [-ZL + 0.25, ZL - 0.25].forEach(z => cols.push([x, z]));
        const colMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, ROOF, 0.4), steelGrey, cols.length);
        cols.forEach(([x, z], i) => { tmpM.makeTranslation(x, ROOF / 2, z); colMesh.setMatrixAt(i, tmpM); });
        colMesh.instanceMatrix.needsUpdate = true;
        targetGroup.add(colMesh);

        // ---------- 4. stendardi del club sulla parete est e striscione sulla testata sud
        const flagMat = lit(tex('banner_flag.jpg'), 0.14);
        [-21, -7, 7, 21].forEach(z => flat(1.6, 3.2, flagMat, XE - 0.06, 6.4, z, -Math.PI / 2));
        flat(5.6, 2.1, lit(tex('banner_club.jpg'), 0.14), XC, 8.4, ZL - 0.06, Math.PI);

        // ---------- 5. reti beige dietro le porte, dalle balaustre fin sotto il tetto
        const NET_H = 5.8;
        const netMat = new THREE.MeshBasicMaterial({ map: loadFileTexture(T + 'net.png', { repeat: [22 / 1.6, NET_H / 1.6] }), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.75 });
        [-1, 1].forEach(sgn => {
            flat(22, NET_H, netMat, 0, 1.15 + NET_H / 2, sgn * 36.2, 0);
            const c = [[V(-11, 1.15 + NET_H, sgn * 36.2), V(11, 1.15 + NET_H, sgn * 36.2), 0.03]];
            [-11, -5.5, 0, 5.5, 11].forEach(x => c.push([V(x, 1.1, sgn * 36.2), V(x, 1.15 + NET_H, sgn * 36.2), 0.05]));
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry(c), greyMat));
        });

        // ---------- 6. vetro sopra le balaustre davanti alla tribuna (-x), con i montanti
        const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xe6f2fa, transparent: true, opacity: 0.2, roughness: 0.06, clearcoat: 0.8, depthWrite: false, side: THREE.DoubleSide });
        const GX = -rinkWidth / 2 - 0.13, G0 = -27.5, G1 = 27.5;
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.0, G1 - G0), glassMat);
        glass.position.set(GX, 1.15 + 0.5, 0);
        targetGroup.add(glass);
        const frame = [[V(GX, 2.15, G0), V(GX, 2.15, G1), 0.04]];
        for (let z = G0; z <= G1 + 0.01; z += 2.5) frame.push([V(GX, 1.15, z), V(GX, 2.15, z), 0.05]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(frame), new THREE.MeshStandardMaterial({ color: 0xc8cdd2, roughness: 0.4, metalness: 0.6 })));

        // ---------- 7. tribuna ovest: quattro gradoni in cemento con le panche bianche, passaggio con la ringhiera
        const ZT = 30, TL = 2 * ZT, X0 = -21.0, D = 1.0, STEP_H = 0.45, TIERS = 4;
        const concrete = new THREE.MeshStandardMaterial({ color: 0xa3a19c, roughness: 0.9 });
        const benchWhite = new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.55 });
        const benchSpots = [];
        for (let k = 0; k < TIERS; k++) {
            const h = (k + 1) * STEP_H, xa = X0 - (k + 1) * D;
            box(D, h, TL, concrete, xa + D / 2, h / 2, 0);
            const bx = X0 - k * D - 0.55;
            box(0.42, 0.06, TL, benchWhite, bx, h + 0.42, 0);                       // seduta
            box(0.2, 0.38, TL, benchWhite, bx - 0.1, h + 0.2, 0);                   // fianco pieno sotto la seduta (arretrato: le gambe ci passano davanti)
            benchSpots.push([bx, h]);
        }
        const topH = TIERS * STEP_H, xBack = X0 - TIERS * D;
        box(xBack - XW, topH, TL + 0.4, concrete, (XW + xBack) / 2, topH / 2, 0);   // passaggio alle spalle
        [-1, 1].forEach(sgn => box(X0 - xBack, topH + 0.1, 0.2, concrete, (X0 + xBack) / 2, (topH + 0.1) / 2, sgn * (ZT + 0.1)));
        const rail = [[V(xBack - 0.15, topH + 1.0, -ZT), V(xBack - 0.15, topH + 1.0, ZT), 0.05]];
        for (let z = -ZT; z <= ZT + 0.01; z += 2) rail.push([V(xBack - 0.15, topH, z), V(xBack - 0.15, topH + 1.0, z), 0.04]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rail), greyMat));

        // ---------- 8. pubblico: sulle panche (guarda verso +x), qualcuno in piedi lungo la parete est
        const outfits = [0x1f3a9e, 0xd62b2b, 0xf8fafc, 0x141416, 0x1f3a9e, 0x4b5563, 0x2e62b8, 0x16a34a, 0x9ca3af];
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
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), getCrowdHeadPlaceholderMaterial());
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
        benchSpots.forEach(([x, h], k) => {
            for (let z = -ZT + 0.6; z <= ZT - 0.6; z += 0.6) {
                // più gente nelle file basse e al centro, come nelle foto
                if (Math.random() < keep * (0.5 - k * 0.07) * (1 - Math.abs(z) / 50)) fan(x, h + 0.04, z + (Math.random() - 0.5) * 0.15, 0, true);
            }
        });
        // in piedi sul passaggio in alto
        for (let z = -ZT + 1; z <= ZT - 1; z += 1.1) {
            if (Math.random() < keep * 0.12) fan(xBack - 0.6, topH, z, 0, false);
        }
        for (let z = -34; z <= 34; z += 0.9) {
            if (Math.abs(z) < 17.5) continue;
            if (Math.random() < keep * 0.18) fan(XE - 1.0, 0, z, Math.PI, false);
        }
    }

    registerArenaBuilder('metropolitano', buildMetropolitanoArchitecture);
})();
