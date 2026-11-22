// Palazzetto "valladolid": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // POLIDEPORTIVO CANTERAC — VALLADOLID, casa del CPLV Hockey Valladolid. Capannone a campata
    // unica: archi in acciaio grigio chiaro a sezione scatolare (spalle curve, sommità piatta) su
    // pilastri bianchi, copertura scura in lamiera con lunghe file di lucernari e lampade tonde
    // appese. Pareti blu in basso e pannelli bianchi sopra, fascia di policarbonato sotto la
    // gronda. Lato tribuna (-x): gradinata con le panche blu e le scale gialle, stemmi del club
    // sulla parete; reti di protezione alte dietro le porte; ventilatore da parete sulla testata.
    // Texture in assets/textures/valladolid/ (tools/generate_valladolid_textures.py).
    // =====================================================================
    function buildValladolidArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/valladolid/';
        const XW = -31, XE = 24.5, ZL = 42;                // pareti: ovest (tribuna), est (panchine), testate
        const XC = (XW + XE) / 2, LX = XE - XW, LEN = 2 * ZL;
        const BLUE_H = 3.6, EAVE = 7.4, R = 5.0, ARCH_T = 0.75;
        const TOP = EAVE + R;                              // intradosso degli archi nella parte piatta
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);

        const archMat = new THREE.MeshStandardMaterial({ color: 0xd4d8dc, roughness: 0.55, metalness: 0.35 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xeeeeec, roughness: 0.7 });
        const greyMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.7 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.5, metalness: 0.3 });
        const tex = (f, rep) => loadFileTexture(T + f, rep ? { repeat: rep } : {});
        const flat = (w, h, mat, x, y, z, ry, parent) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
            m.position.set(x, y, z);
            m.rotation.y = ry || 0;
            (parent || targetGroup).add(m);
            return m;
        };
        const lit = (t, k) => new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: k || 0.15, roughness: 0.8, side: THREE.DoubleSide });
        // vetrate e lucernari verso l'esterno: di giorno ci entra il sole (index.html, setupGenericDaylight)
        const winLit = (t, k) => { const m = lit(t, k); m.userData.sunWindow = true; return m; };
        // soffitto (archi, copertura, lampade): nascosto se una telecamera sale sopra gli archi
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: EAVE + 1.2 };

        // profilo trasversale della copertura: spalle a quarto di cerchio, sommità piatta;
        // l'intradosso degli archi parte dal filo interno dei pilastri (0,6 m dalla parete)
        const profile = (off) => {
            const pts = [];
            const r = R + off;
            for (let k = 0; k <= 10; k++) { const a = Math.PI - k / 10 * Math.PI / 2; pts.push([XW + 0.6 + R + r * Math.cos(a), EAVE + r * Math.sin(a)]); }
            for (let k = 0; k <= 10; k++) { const a = Math.PI / 2 - k / 10 * Math.PI / 2; pts.push([XE - 0.6 - R + r * Math.cos(a), EAVE + r * Math.sin(a)]); }
            return pts;
        };

        // ---------- 1. pavimento attorno alla pista (stesse piastrelle, più scure)
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(LX, LEN), new THREE.MeshStandardMaterial({ color: 0x6fa6c8, roughness: 0.6 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(XC, -0.01, 0);
        targetGroup.add(apron);

        // ---------- 2. archi in acciaio a sezione scatolare su pilastri bianchi
        const archZ = [];
        for (let z = -40; z <= 40.01; z += 8) archZ.push(z);
        const prof = profile(ARCH_T / 2);
        const archBeams = [];
        archZ.forEach(z => {
            for (let k = 0; k < prof.length - 1; k++) archBeams.push([V(prof[k][0], prof[k][1], z), V(prof[k + 1][0], prof[k + 1][1], z), ARCH_T]);
        });
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(archBeams), archMat));
        const cols = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, EAVE, 0.8), whiteMat, archZ.length * 2);
        archZ.forEach((z, i) => {
            tmpM.makeTranslation(XW + 0.32, EAVE / 2, z); cols.setMatrixAt(2 * i, tmpM);
            tmpM.makeTranslation(XE - 0.32, EAVE / 2, z); cols.setMatrixAt(2 * i + 1, tmpM);
        });
        cols.instanceMatrix.needsUpdate = true;
        targetGroup.add(cols);

        // ---------- 3. copertura scura che segue il profilo degli archi
        const deckProf = profile(ARCH_T + 0.05);
        const deckGeo = new THREE.BufferGeometry();
        {
            const pos = [], uv = [], idx = [];
            let s = 0;
            deckProf.forEach((p, k) => {
                if (k) s += Math.hypot(p[0] - deckProf[k - 1][0], p[1] - deckProf[k - 1][1]);
                pos.push(p[0], p[1], -ZL, p[0], p[1], ZL);
                uv.push(s / 4, 0, s / 4, LEN / 4);
            });
            for (let k = 0; k < deckProf.length - 1; k++) { const a = 2 * k; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
            deckGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            deckGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
            deckGeo.setIndex(idx);
            deckGeo.computeVertexNormals();
        }
        const DECK_TOP = TOP + ARCH_T + 0.05;
        ceilGroup.add(new THREE.Mesh(deckGeo, new THREE.MeshStandardMaterial({ map: tex('roof_deck.jpg', [1, 1]), roughness: 0.8, metalness: 0.3, side: THREE.DoubleSide })));
        // arcarecci longitudinali sotto la lamiera
        const purl = [];
        deckProf.forEach((p, k) => { if (k % 3 === 1) purl.push([V(p[0], p[1] - 0.12, -ZL), V(p[0], p[1] - 0.12, ZL), 0.08]); });
        [-14, -7, 0, 7].forEach(x => purl.push([V(x, DECK_TOP - 0.12, -ZL), V(x, DECK_TOP - 0.12, ZL), 0.08]));
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(purl), greyMat));
        // lucernari: quattro file di lastre chiare fra un arco e l'altro, nella parte piatta
        const skyMat = winLit(tex('skylight.jpg'), 0.55);
        const skyGeo = new THREE.PlaneGeometry(1.6, 6.2).rotateX(Math.PI / 2);
        [-15.5, -8.5, -1.5, 5.5, 12.5].forEach(x => {
            for (let k = 0; k < archZ.length - 1; k++) {
                const s = new THREE.Mesh(skyGeo, skyMat);
                s.position.set(x, DECK_TOP - 0.04, (archZ[k] + archZ[k + 1]) / 2);
                ceilGroup.add(s);
            }
        });

        // ---------- 4. lampade tonde appese (campane industriali)
        const lampX = [-19, -12, -5, 2, 9, 16];
        const lampZ = [];
        for (let k = 0; k < archZ.length - 1; k++) lampZ.push((archZ[k] + archZ[k + 1]) / 2);
        const LAMP_Y = TOP - 1.6;
        const nL = lampX.length * lampZ.length;
        const bell = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.42, 0.42, 14, 1, true), greyMat, nL);
        const face = new THREE.InstancedMesh(new THREE.CircleGeometry(0.4, 16).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfdfbf2, side: THREE.DoubleSide }), nL);
        const cables = [];
        let li = 0;
        lampX.forEach(x => lampZ.forEach(z => {
            tmpM.makeTranslation(x, LAMP_Y, z); bell.setMatrixAt(li, tmpM);
            tmpM.makeTranslation(x, LAMP_Y - 0.2, z); face.setMatrixAt(li, tmpM);
            cables.push([V(x, LAMP_Y + 0.2, z), V(x, DECK_TOP, z), 0.015]);
            li++;
        }));
        bell.instanceMatrix.needsUpdate = true;
        face.instanceMatrix.needsUpdate = true;
        ceilGroup.add(bell, face, new THREE.Mesh(mergeBeamGeometry(cables), darkMat));
        if (!lowQ) {
            const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
            lampX.forEach((x, i) => lampZ.forEach((z, k) => {
                if ((i + k) % 2) return;
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff6e6, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(2.4, 2.4, 1);
                spr.position.set(x, LAMP_Y - 0.35, z);
                ceilGroup.add(spr);
            }));
        }
        // casse audio appese agli archi
        const spk = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.7, 0.45), darkMat, 4);
        [[-6, -24], [6, -24], [-6, 24], [6, 24]].forEach(([x, z], i) => { tmpM.makeTranslation(x, TOP - 0.7, z); spk.setMatrixAt(i, tmpM); });
        spk.instanceMatrix.needsUpdate = true;
        ceilGroup.add(spk);

        // ---------- 5. pareti: blu in basso, pannelli bianchi sopra, fascia di policarbonato sotto la gronda
        const blueMat = (w) => new THREE.MeshStandardMaterial({ map: tex('wall_blue.jpg', [w / 3.6, 1]), roughness: 0.75, side: THREE.DoubleSide });
        const whiteWall = (w, h) => new THREE.MeshStandardMaterial({ map: tex('wall_white.jpg', [w / 4, h / 4]), roughness: 0.8, side: THREE.DoubleSide });
        const POLY_H = 1.4, WH_H = EAVE - BLUE_H - POLY_H;
        const polyMat = winLit(tex('poly_band.jpg', [LEN / 4, 1]), 0.35);
        [[XE, -Math.PI / 2], [XW, Math.PI / 2]].forEach(([x, ry]) => {
            flat(LEN, BLUE_H, blueMat(LEN), x, BLUE_H / 2, 0, ry);
            flat(LEN, WH_H, whiteWall(LEN, WH_H), x, BLUE_H + WH_H / 2, 0, ry);
            flat(LEN - 2, POLY_H, polyMat, x + (x > 0 ? -0.02 : 0.02), EAVE - POLY_H / 2, 0, ry);
        });
        // testate: blu in basso, sopra un timpano bianco che chiude il profilo della copertura
        const gable = new THREE.Shape();
        gable.moveTo(XW, BLUE_H);
        gable.lineTo(XW, EAVE);
        profile(ARCH_T + 0.05).forEach(p => gable.lineTo(p[0], p[1]));
        gable.lineTo(XE, EAVE);
        gable.lineTo(XE, BLUE_H);
        gable.lineTo(XW, BLUE_H);
        const gableGeo = new THREE.ShapeGeometry(gable);
        const gableMat = new THREE.MeshStandardMaterial({ map: tex('wall_white.jpg', [0.25, 0.25]), roughness: 0.8, side: THREE.DoubleSide });
        [[-ZL, 0], [ZL, Math.PI]].forEach(([z, ry]) => {
            flat(LX, BLUE_H, blueMat(LX), XC, BLUE_H / 2, z, ry);
            const g = new THREE.Mesh(gableGeo, gableMat);
            g.position.z = z;
            targetGroup.add(g);
        });

        // ---------- 6. testata -z: ventilatore, striscione del club, bandiera spagnola (tabellone da index.html)
        const zF = -ZL + 0.06;
        const fanTex = tex('wall_fan.png');
        flat(2.4, 2.4, new THREE.MeshStandardMaterial({ map: fanTex, transparent: true, alphaTest: 0.2, roughness: 0.6, metalness: 0.4 }), -21, 5.2, zF, 0);
        flat(7.2, 2.7, lit(tex('banner_club.jpg'), 0.15), 12, 6.0, zF, 0);
        flat(2.7, 1.8, lit(tex('flag_spain.jpg'), 0.12), 19.5, 6.2, zF, 0);
        // porte di servizio scure ai lati della testata
        [-14, 17].forEach(x => flat(2.2, 2.6, darkMat, x, 1.3, zF + 0.01, 0));
        // cartelloni sopra la balaustra sulle testate
        const endAds = tex('wall_ads.png', [LX / 30, 1]);
        const endAdsMat = new THREE.MeshStandardMaterial({ map: endAds, transparent: true, alphaTest: 0.1, roughness: 0.7, emissive: 0xffffff, emissiveMap: endAds, emissiveIntensity: 0.12, side: THREE.DoubleSide });
        flat(LX - 8, 0.9, endAdsMat, XC, 2.9, zF + 0.02, 0);
        flat(LX - 8, 0.9, endAdsMat, XC, 2.9, ZL - 0.08, Math.PI);
        // ventilatore anche sulla testata opposta
        flat(2.4, 2.4, new THREE.MeshStandardMaterial({ map: fanTex, transparent: true, alphaTest: 0.2, roughness: 0.6, metalness: 0.4 }), 15, 5.2, ZL - 0.06, Math.PI);

        // ---------- 7. reti di protezione alte dietro le porte (dalla balaustra fin sotto la gronda)
        const netTex = loadFileTexture(T + 'net.png', { repeat: [36 / 1.6, 5.5 / 1.6] });
        const netMat = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.7 });
        [-1, 1].forEach(sgn => {
            flat(36, 5.5, netMat, 0, 1.25 + 2.75, sgn * 36.4, 0);
            // cavi che reggono la rete
            const c = [[V(-18, 6.75, sgn * 36.4), V(18, 6.75, sgn * 36.4), 0.03]];
            [-18, -6, 6, 18].forEach(x => c.push([V(x, 1.2, sgn * 36.4), V(x, 6.75, sgn * 36.4), 0.05]));
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry(c), greyMat));
        });

        // ---------- 8. tribuna (-x): gradinata con le panche blu e le scale gialle
        const ZS0 = -30, ZS1 = 30, SL = ZS1 - ZS0, X0 = -20.6, FRONT_H = 0.9, TIERS = 11, STEP_D = 0.8, STEP_H = 0.4;
        const front = new THREE.Mesh(new THREE.BoxGeometry(0.25, FRONT_H, SL), new THREE.MeshStandardMaterial({ color: 0xdedfe0, roughness: 0.8 }));
        front.position.set(X0, FRONT_H / 2, 0);
        targetGroup.add(front);
        const concrete = new THREE.MeshStandardMaterial({ color: 0x9a9c9e, roughness: 0.9 });
        const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf2bf1c, roughness: 0.6 });
        const benchMat = new THREE.MeshStandardMaterial({ color: 0x2a62c8, roughness: 0.45 });
        // scale gialle: blocchi di panche fra una scala e l'altra
        const stairs = [-20, -6.5, 6.5, 20];
        const STAIR_W = 1.3;
        const benchSeg = [];
        const edges = [ZS0 + 0.2, ...stairs.flatMap(z => [z - STAIR_W / 2, z + STAIR_W / 2]), ZS1 - 0.2];
        for (let k = 0; k < edges.length; k += 2) benchSeg.push([edges[k], edges[k + 1]]);
        const benchGeo = new THREE.BoxGeometry(0.4, 0.12, 1);
        const benchBackGeo = new THREE.BoxGeometry(0.06, 0.28, 1);
        const nB = TIERS * benchSeg.length;
        const benches = new THREE.InstancedMesh(benchGeo, benchMat, nB);
        const backs = new THREE.InstancedMesh(benchBackGeo, benchMat, nB);
        const sc = new THREE.Vector3(), qq = new THREE.Quaternion(), pp = new THREE.Vector3();
        let bi = 0;
        for (let k = 0; k < TIERS; k++) {
            const h = FRONT_H + k * STEP_H;
            const xa = X0 - 0.12 - k * STEP_D;
            const step = new THREE.Mesh(new THREE.BoxGeometry(STEP_D, h, SL), concrete);
            step.position.set(xa - STEP_D / 2, h / 2, 0);
            targetGroup.add(step);
            benchSeg.forEach(([z0, z1]) => {
                const len = z1 - z0, zc = (z0 + z1) / 2;
                tmpM.compose(pp.set(xa - STEP_D * 0.45, h + 0.36, zc), qq, sc.set(1, 1, len)); benches.setMatrixAt(bi, tmpM);
                tmpM.compose(pp.set(xa - STEP_D * 0.78, h + 0.56, zc), qq, sc.set(1, 1, len)); backs.setMatrixAt(bi, tmpM);
                bi++;
            });
            // gambe delle panche: un blocco sotto ogni segmento
        }
        benches.instanceMatrix.needsUpdate = true;
        backs.instanceMatrix.needsUpdate = true;
        targetGroup.add(benches, backs);
        const legs = [];
        for (let k = 0; k < TIERS; k++) {
            const h = FRONT_H + k * STEP_H, xa = X0 - 0.12 - k * STEP_D - STEP_D * 0.45;
            benchSeg.forEach(([z0, z1]) => { for (let z = z0 + 0.4; z < z1; z += 2.2) legs.push([V(xa, h, z), V(xa, h + 0.32, z), 0.05]); });
        }
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(legs), darkMat));
        // scale gialle
        stairs.forEach(z => {
            for (let k = 0; k < TIERS; k++) {
                const h = FRONT_H + k * STEP_H;
                const xa = X0 - 0.12 - k * STEP_D;
                const s = new THREE.Mesh(new THREE.BoxGeometry(STEP_D, 0.04, STAIR_W), yellowMat);
                s.position.set(xa - STEP_D / 2, h + 0.02, z);
                targetGroup.add(s);
            }
        });
        const topH = FRONT_H + TIERS * STEP_H;
        const backX = X0 - 0.12 - TIERS * STEP_D;
        const backFill = new THREE.Mesh(new THREE.BoxGeometry(backX - XW, topH, SL), concrete);
        backFill.position.set((XW + backX) / 2, topH / 2, 0);
        targetGroup.add(backFill);
        // corrimano davanti e sui lati della gradinata
        const rail = [[V(X0, FRONT_H + 1.0, ZS0), V(X0, FRONT_H + 1.0, ZS1), 0.04]];
        for (let z = ZS0; z <= ZS1 + 0.01; z += 3) rail.push([V(X0, FRONT_H, z), V(X0, FRONT_H + 1.0, z), 0.03]);
        [ZS0, ZS1].forEach(z => rail.push([V(X0, FRONT_H + 1.0, z), V(backX, topH + 1.0, z), 0.04]));
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rail), new THREE.MeshStandardMaterial({ color: 0x4a6fa8, roughness: 0.5, metalness: 0.4 })));
        // stemmi tondi del club e cartelloni sulla parete sopra la tribuna
        const crestMat = new THREE.MeshStandardMaterial({ map: tex('crest_round.png'), transparent: true, alphaTest: 0.2, roughness: 0.6, emissive: 0xffffff, emissiveMap: tex('crest_round.png'), emissiveIntensity: 0.1 });
        [-12, 12].forEach(z => flat(2.4, 2.4, crestMat, XW + 0.06, topH + 3.2, z, Math.PI / 2));
        const sideAds = tex('wall_ads.png', [LEN / 34, 1]);
        const sideAdsMat = endAdsMat.clone(); sideAdsMat.map = sideAds; sideAdsMat.emissiveMap = sideAds;
        flat(LEN - 8, 0.9, sideAdsMat, XE - 0.06, 2.9, 0, -Math.PI / 2);

        // ---------- 9. pubblico sulla gradinata
        const outfits = [0x1e88e5, 0x2b2e35, 0x1c1e24, 0xf8fafc, 0x374151, 0x1e88e5, 0x6e2a6e, 0xb91c1c, 0x166534];
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
        const keep = preset.crowdKeepRatio;
        const onStair = z => stairs.some(s => Math.abs(z - s) < STAIR_W / 2 + 0.2);
        for (let k = 0; k < TIERS; k++) {
            const h = FRONT_H + k * STEP_H, x = X0 - 0.12 - k * STEP_D - STEP_D * 0.4;
            // più gente nelle file basse e al centro
            const dens = keep * (0.55 - k * 0.025);
            for (let z = ZS0 + 0.6; z <= ZS1 - 0.6; z += 0.7) {
                if (onStair(z)) continue;
                if (Math.random() < dens * (1 - Math.abs(z) / 60)) {
                    const sit = Math.random() < 0.55;
                    fan(x + (Math.random() - 0.5) * 0.12, sit ? h + 0.0 : h, z + (Math.random() - 0.5) * 0.2, Math.atan2(z, 30) * 0.3, sit);
                }
            }
        }
    }

    registerArenaBuilder('valladolid', buildValladolidArchitecture);
})();
