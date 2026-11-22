// Palazzetto "rethel": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // GYMNASE ANDRÉ CHAUSSON — RETHEL (08), casa dei Diables Rethelois. Palestra rettangolare:
    // zoccolo chiaro e sopra pareti in doghe verticali di pino divise da pilastri grigi; sul lato
    // panchine (+x) finestre alte e strette fra un pilastro e l'altro, sulla testata +z una grande
    // vetrata a riquadri sugli alberi, sulla testata -z la parete d'arrampicata grigia. Copertura in
    // lamiera grecata grigia su travi in legno lamellare, lucernari e file di lampade a tubo;
    // canestri sollevati sotto il tetto. Lato tribuna (-x): muretto bianco, gradinata con i
    // seggiolini bianchi e corrimano. Cartelloni del club e del territorio sul legno.
    // Texture in assets/textures/rethel/ (tools/generate_rethel_textures.py).
    // =====================================================================
    function buildRethelArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/rethel/';
        const XW = -27.5, XE = 24.5, ZL = 42;              // pareti: ovest (tribuna), est (panchine), testate
        const XC = (XW + XE) / 2, LX = XE - XW, LEN = 2 * ZL;
        const LOW_H = 2.6, EAVE = 9.0, BEAM_Y = 9.4, BEAM_H = 1.1, DECK_Y = BEAM_Y + BEAM_H + 0.02;
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);

        const steelMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.45, metalness: 0.55 });
        const greyMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.7 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.5, metalness: 0.3 });
        const tex = (f, rep) => loadFileTexture(T + f, rep ? { repeat: rep } : {});
        const flat = (w, h, mat, x, y, z, ry) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
            m.position.set(x, y, z);
            m.rotation.y = ry || 0;
            targetGroup.add(m);
            return m;
        };
        const lit = (t, k) => new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: k || 0.15, roughness: 0.8, side: THREE.DoubleSide });
        // finestre verso l'esterno: di giorno ci entra il sole (index.html, setupGenericDaylight)
        const winLit = (t, k) => { const m = lit(t, k); m.userData.sunWindow = true; return m; };
        // soffitto (travi, copertura, lampade): nascosto se una telecamera sale sopra le travi
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: BEAM_Y };

        // ---------- 1. pavimento azzurro attorno alla pista
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(LX, LEN), new THREE.MeshStandardMaterial({ color: 0x7fb4d6, roughness: 0.6 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(XC, -0.01, 0);
        targetGroup.add(apron);

        // ---------- 2. travi trasversali in legno lamellare e copertura in lamiera grecata
        const glulam = tex('glulam.jpg', [LX / 8, 1]);
        const woodBeamMat = new THREE.MeshStandardMaterial({ map: glulam, color: 0xf0d6aa, roughness: 0.6 });
        const beamZ = [];
        for (let z = -39; z <= 39.01; z += 6) beamZ.push(z);
        const beams = new THREE.InstancedMesh(new THREE.BoxGeometry(LX, BEAM_H, 0.3), woodBeamMat, beamZ.length);
        beamZ.forEach((z, k) => { tmpM.makeTranslation(XC, BEAM_Y + BEAM_H / 2, z); beams.setMatrixAt(k, tmpM); });
        beams.instanceMatrix.needsUpdate = true;
        ceilGroup.add(beams);
        const deck = new THREE.Mesh(new THREE.PlaneGeometry(LX, LEN), new THREE.MeshStandardMaterial({ map: tex('roof_deck.jpg', [LX / 8, LEN / 8]), roughness: 0.75, metalness: 0.3, side: THREE.DoubleSide }));
        deck.rotation.x = Math.PI / 2;                  // larghezza lungo x, lunghezza lungo z
        deck.position.set(XC, DECK_Y, 0);
        ceilGroup.add(deck);
        // arcarecci in acciaio sotto la lamiera
        const purl = [];
        [-20, -12, -4, 4, 12, 20].forEach(x => purl.push([V(x, DECK_Y - 0.12, -ZL), V(x, DECK_Y - 0.12, ZL), 0.06]));
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(purl), steelMat));
        // lucernari: due file di lastre chiare fra una trave e l'altra
        const skyMat = new THREE.MeshBasicMaterial({ color: 0xdfe9f3, side: THREE.DoubleSide });
        skyMat.userData.sunWindow = true;
        const skyGeo = new THREE.PlaneGeometry(2.4, 3.2).rotateX(Math.PI / 2);
        [-9, 7].forEach(x => {
            for (let k = 0; k < beamZ.length - 1; k += 2) {
                const s = new THREE.Mesh(skyGeo, skyMat);
                s.position.set(x, DECK_Y - 0.03, (beamZ[k] + beamZ[k + 1]) / 2);
                ceilGroup.add(s);
            }
        });

        // ---------- 3. lampade a tubo appese fra le travi
        const tubeX = [-20, -13, -6, 1, 8, 15];
        const tubeZ = [];
        for (let k = 0; k < beamZ.length - 1; k++) tubeZ.push((beamZ[k] + beamZ[k + 1]) / 2);
        const tubeCount = tubeX.length * tubeZ.length;
        const tubeBody = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.09, 1.5), greyMat, tubeCount);
        const tubeFace = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 1.42).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfdfcf4, side: THREE.DoubleSide }), tubeCount);
        let ti = 0;
        const cables = [];
        tubeX.forEach(x => tubeZ.forEach(z => {
            tmpM.makeTranslation(x, BEAM_Y - 0.6, z); tubeBody.setMatrixAt(ti, tmpM);
            tmpM.makeTranslation(x, BEAM_Y - 0.65, z); tubeFace.setMatrixAt(ti, tmpM);
            cables.push([V(x, BEAM_Y - 0.55, z - 0.6), V(x, DECK_Y, z - 0.6), 0.008], [V(x, BEAM_Y - 0.55, z + 0.6), V(x, DECK_Y, z + 0.6), 0.008]);
            ti++;
        }));
        tubeBody.instanceMatrix.needsUpdate = true;
        tubeFace.instanceMatrix.needsUpdate = true;
        ceilGroup.add(tubeBody, tubeFace, new THREE.Mesh(mergeBeamGeometry(cables), darkMat));
        if (!lowQ) {
            const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
            tubeX.forEach((x, i) => tubeZ.forEach((z, k) => {
                if ((i + k) % 3) return;
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xf4f8ff, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(2.2, 2.2, 1);
                spr.position.set(x, BEAM_Y - 0.8, z);
                ceilGroup.add(spr);
            }));
        }

        // ---------- 4. pareti: zoccolo chiaro, doghe di pino, pilastri grigi, fascia alta in lamiera
        const lowMat = (w) => new THREE.MeshStandardMaterial({ map: tex('wall_low.jpg', [w / 4, 1]), roughness: 0.9, side: THREE.DoubleSide });
        const woodMat = (w, h) => new THREE.MeshStandardMaterial({ map: tex('wood_cladding.jpg', [w / 3.2, h / 3.2]), roughness: 0.75, side: THREE.DoubleSide });
        const bandMat = new THREE.MeshStandardMaterial({ color: 0x9a9ea4, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide });
        const WOOD_H = EAVE - LOW_H;
        // lati lunghi
        [[XE, -Math.PI / 2], [XW, Math.PI / 2]].forEach(([x, ry]) => {
            flat(LEN, LOW_H, lowMat(LEN), x, LOW_H / 2, 0, ry);
            flat(LEN, WOOD_H, woodMat(LEN, WOOD_H), x, LOW_H + WOOD_H / 2, 0, ry);
            flat(LEN, DECK_Y - EAVE + 0.05, bandMat, x, (EAVE + DECK_Y) / 2, 0, ry);
        });
        // testate
        [[-ZL, 0], [ZL, Math.PI]].forEach(([z, ry]) => {
            flat(LX, LOW_H, lowMat(LX), XC, LOW_H / 2, z, ry);
            flat(LX, WOOD_H, woodMat(LX, WOOD_H), XC, LOW_H + WOOD_H / 2, z, ry);
            flat(LX, DECK_Y - EAVE + 0.05, bandMat, XC, (EAVE + DECK_Y) / 2, z, ry);
        });
        // pilastri grigi ogni 6 m sui lati lunghi
        const pil = [];
        beamZ.forEach(z => [XE - 0.2, XW + 0.2].forEach(x => pil.push(z, x)));
        const pillars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, DECK_Y, 0.45), greyMat, pil.length / 2);
        for (let k = 0; k < pil.length; k += 2) { tmpM.makeTranslation(pil[k + 1], DECK_Y / 2, pil[k]); pillars.setMatrixAt(k / 2, tmpM); }
        pillars.instanceMatrix.needsUpdate = true;
        targetGroup.add(pillars);

        // ---------- 5. finestre: alte e strette sul lato panchine, grande vetrata sulla testata +z
        const tallMat = winLit(tex('window_tall.jpg', [1, 1]), 0.3);
        for (let k = 0; k < beamZ.length - 1; k++) {
            const zc = (beamZ[k] + beamZ[k + 1]) / 2;
            [-1.15, 1.15].forEach(dz => flat(1.3, 5.6, tallMat, XE - 0.03, 3.3 + 2.8, zc + dz, -Math.PI / 2));
        }
        const gridMat = winLit(tex('window_grid.jpg', [1, 1]), 0.32);
        flat(26, 5.4, gridMat, -4.5, 3.1 + 2.7, ZL - 0.03, Math.PI);

        // ---------- 6. testata -z: parete d'arrampicata, striscione del club, bandiera (tabellone da index.html)
        const zF = -ZL + 0.06;
        const climb = new THREE.Mesh(new THREE.BoxGeometry(12, 7.2, 0.25), new THREE.MeshStandardMaterial({ map: tex('climbing_wall.jpg', [1, 1]), roughness: 0.8 }));
        climb.position.set(15.5, 4.2, -ZL + 0.15);
        targetGroup.add(climb);
        // materassini blu sotto la parete d'arrampicata
        const mat = new THREE.Mesh(new THREE.BoxGeometry(12, 0.35, 2.2), new THREE.MeshStandardMaterial({ color: 0x1f4fa0, roughness: 0.8 }));
        mat.position.set(15.5, 0.18, -ZL + 1.4);
        targetGroup.add(mat);
        flat(2.6, 5.2, lit(tex('banner_club.jpg'), 0.15), -14, 6.0, zF, 0);
        flat(2.6, 1.7, lit(tex('flag_france.jpg'), 0.12), -20, 7.4, zF, 0);
        // cartelloni sul legno sopra la balaustra (lato panchine e testate)
        const adsTex = tex('wall_ads.png', [LEN / 30, 1]);
        const adsMat = new THREE.MeshStandardMaterial({ map: adsTex, transparent: true, alphaTest: 0.1, roughness: 0.7, emissive: 0xffffff, emissiveMap: adsTex, emissiveIntensity: 0.12, side: THREE.DoubleSide });
        flat(LEN - 4, 0.9, adsMat, XE - 0.06, 3.0, 0, -Math.PI / 2);
        const endAds = tex('wall_ads.png', [LX / 30, 1]);
        const endAdsMat = adsMat.clone(); endAdsMat.map = endAds; endAdsMat.emissiveMap = endAds;
        flat(LX - 14, 0.9, endAdsMat, XC - 6, 3.0, zF + 0.02, 0);

        // ---------- 7. canestri sollevati sotto il tetto (tabelloni col bordo rosso e blu)
        const boardMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.4 });
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xc8202a, roughness: 0.5 });
        const blueMat = new THREE.MeshStandardMaterial({ color: 0x1f4fa0, roughness: 0.5 });
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xe0561b, roughness: 0.4, metalness: 0.4 });
        const hoop = (x, y, z, ry, tilt) => {
            const g = new THREE.Group();
            const frame = new THREE.Mesh(new THREE.BoxGeometry(1.95, 1.2, 0.08), blueMat);
            const bb = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.05, 0.1), boardMat);
            const sq = new THREE.Mesh(new THREE.PlaneGeometry(0.59, 0.45), new THREE.MeshBasicMaterial({ color: 0xc8202a }));
            sq.position.set(0, -0.15, 0.052);
            const sqIn = new THREE.Mesh(new THREE.PlaneGeometry(0.53, 0.39), boardMat);
            sqIn.position.set(0, -0.15, 0.054);
            const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.015, 6, 20), rimMat);
            rim.rotation.x = Math.PI / 2;
            rim.position.set(0, -0.4, 0.28);
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.4), frameMat);
            arm.position.set(0, 0.25, -0.7);
            g.add(frame, bb, sq, sqIn, rim, arm);
            g.position.set(x, y, z);
            g.rotation.order = 'YXZ';
            g.rotation.y = ry;
            g.rotation.x = tilt || 0;
            targetGroup.add(g);
        };
        [-15, 15].forEach(z => { hoop(XE - 1.5, 7.6, z, -Math.PI / 2, -0.5); hoop(XW + 1.5, 7.9, z, Math.PI / 2, -0.5); });
        hoop(XC - 8, 7.2, -ZL + 1.6, 0, -0.4);
        hoop(XC - 2, 7.2, ZL - 1.6, Math.PI, -0.4);

        // ---------- 8. tribuna (-x): muretto bianco, gradinata coi seggiolini bianchi, corrimano
        const ZS0 = -27, ZS1 = 27, SL = ZS1 - ZS0, X0 = -21.4, FRONT_H = 1.3, TIERS = 6, STEP_D = 0.82, STEP_H = 0.38;
        const whiteWall = new THREE.Mesh(new THREE.BoxGeometry(0.25, FRONT_H, SL), new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.8 }));
        whiteWall.position.set(X0, FRONT_H / 2, 0);
        targetGroup.add(whiteWall);
        const concrete = new THREE.MeshStandardMaterial({ color: 0xb6b4ae, roughness: 0.9 });
        const seatGeo = new THREE.BoxGeometry(0.42, 0.32, 0.44);
        const seatMat = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.5 });
        const seatPos = [];
        for (let k = 0; k < TIERS; k++) {
            const h = FRONT_H + k * STEP_H;
            const xa = X0 - 0.12 - k * STEP_D;
            const step = new THREE.Mesh(new THREE.BoxGeometry(STEP_D, h, SL), concrete);
            step.position.set(xa - STEP_D / 2, h / 2, 0);
            targetGroup.add(step);
            for (let z = ZS0 + 0.5; z < ZS1 - 0.4; z += 0.56) seatPos.push([xa - STEP_D * 0.55, h + 0.16, z]);
        }
        const backX = X0 - 0.12 - TIERS * STEP_D;
        const back = new THREE.Mesh(new THREE.BoxGeometry(backX - XW, FRONT_H + TIERS * STEP_H, SL), concrete);
        back.position.set((XW + backX) / 2, (FRONT_H + TIERS * STEP_H) / 2, 0);
        targetGroup.add(back);
        const seats = new THREE.InstancedMesh(seatGeo, seatMat, seatPos.length);
        seatPos.forEach(([x, y, z], i) => { tmpM.makeTranslation(x, y, z); seats.setMatrixAt(i, tmpM); });
        seats.instanceMatrix.needsUpdate = true;
        targetGroup.add(seats);
        const rail = [[V(X0, FRONT_H + 1.0, ZS0), V(X0, FRONT_H + 1.0, ZS1), 0.035], [V(X0, FRONT_H + 0.5, ZS0), V(X0, FRONT_H + 0.5, ZS1), 0.025]];
        for (let z = ZS0; z <= ZS1 + 0.01; z += 2.5) rail.push([V(X0, FRONT_H, z), V(X0, FRONT_H + 1.0, z), 0.025]);
        [ZS0, ZS1].forEach(z => rail.push([V(X0, FRONT_H + 1.0, z), V(backX, FRONT_H + TIERS * STEP_H + 1.0, z), 0.035]));
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rail), steelMat));

        // ---------- 9. pubblico sulla gradinata
        const outfits = [0xc8102e, 0x111114, 0x0b0b0f, 0xf8fafc, 0x374151, 0xc8102e, 0x7c2d12, 0x1d4ed8, 0x166534];
        const jm = outfits.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 }));
        const pantsM = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const handM = new THREE.MeshStandardMaterial({ color: 0xc99178, roughness: 0.6 });
        const hairM = new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.8 });
        const fan = (x, y, z, faceAngle) => {
            const root = new THREE.Group();
            const mt = jm[Math.floor(Math.random() * jm.length)];
            [-0.11, 0.11].forEach(lz => { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.82, 7), pantsM); lg.position.set(0, 0.41, lz); root.add(lg); });
            const bodyPivot = new THREE.Group();
            bodyPivot.position.set(0, 0.82, 0);
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
            crowdMembers.push({ mesh: root, bodyPivot, headGroup, leftArmPivot, rightArmPivot, baseY: y + childLift, phase: Math.random() * Math.PI * 2, standing: true });
        };
        const keep = preset.crowdKeepRatio;
        for (let k = 0; k < TIERS; k++) {
            const h = FRONT_H + k * STEP_H, x = X0 - 0.12 - k * STEP_D - STEP_D * 0.3;
            for (let z = ZS0 + 0.6; z <= ZS1 - 0.6; z += 0.75) if (Math.random() < keep * 0.5) fan(x + (Math.random() - 0.5) * 0.15, h, z + (Math.random() - 0.5) * 0.2, Math.atan2(z, 30) * 0.3);
        }
    }

    registerArenaBuilder('rethel', buildRethelArchitecture);
})();
