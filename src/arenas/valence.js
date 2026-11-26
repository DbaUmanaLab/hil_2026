// Palazzetto "valence": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // GYMNASE DENIS MAURIN — VALENCE (Drôme), casa degli Aiglons. Palestra moderna e luminosa: controsoffitto
    // bianco in pannelli fonoassorbenti con i faretti tondi, interrotto da due lunghe lanterne che corrono per
    // tutta la sala, con le capriate reticolari bianche a vista, le vetrate laterali, la lamiera chiara e i
    // lucernari in cima (da qui entra il sole) e i grandi fari tondi. Lato ovest (cronometristi): al piano terra
    // porte vetrate e pannelli traslucidi fra pilastri bianchi, dietro una rete bianca; sopra il ballatoio con la
    // ringhiera bianca, la rete, i canestri e gli striscioni del tifo, e dietro la tribuna a gradoni piena di
    // pubblico. Lato est (panchine) e testate: doghe verticali di legno chiaro sopra uno zoccolo bianco con le
    // porte. Pista azzurra con la riga centrale rosso scuro e i cerchi e le aree di porta arancio-rosse; balaustre
    // bianche col piede giallo, niente vetro.
    // Altezze: controsoffitto a 12,2 m, sopra la telecamera broadcast (11,6 m); con la vista dall'alto (13,2 m)
    // il soffitto si nasconde.
    // Texture in assets/textures/valence/ (tools/generate_valence_textures.py).
    // =====================================================================
    function buildValenceArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/valence/';
        const XW = -28.5, XE = 23, ZL = 40, LX = XE - XW, LEN = 2 * ZL, XC = (XW + XE) / 2;
        const CEIL = 12.2, BASE_H = 3.2;
        const MON = [[-15, -7], [3, 11]], MZ = 36;           // lanterne: fasce in x, lunghe da -36 a +36 in z
        const M_GLASS0 = 12.8, M_GLASS1 = 14.6, M_TOP = 15.0;
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);

        const whiteSteel = new THREE.MeshStandardMaterial({ color: 0xeeeeec, roughness: 0.5, metalness: 0.25, emissive: 0x202020 });
        const greySteel = new THREE.MeshStandardMaterial({ color: 0x9a9ea2, roughness: 0.5, metalness: 0.45 });
        const concrete = new THREE.MeshStandardMaterial({ color: 0xb4b4b0, roughness: 0.9 });
        const tex = (f, rep) => loadFileTexture(T + f, rep ? { repeat: rep } : {});
        const flat = (w, h, mat, x, y, z, ry, parent) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
            m.position.set(x, y, z);
            m.rotation.y = ry || 0;
            (parent || targetGroup).add(m);
            return m;
        };
        const flatH = (w, d, mat, x, y, z, down, parent) => {          // piano orizzontale (soffitto se down)
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
            m.rotation.x = down ? Math.PI / 2 : -Math.PI / 2;
            m.position.set(x, y, z);
            (parent || targetGroup).add(m);
            return m;
        };
        const box = (w, h, d, mat, x, y, z, parent) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            m.position.set(x, y, z);
            (parent || targetGroup).add(m);
            return m;
        };
        const lit = (t, k) => new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: k || 0.12, roughness: 0.8, side: THREE.DoubleSide });
        const plaster = (w, h) => new THREE.MeshStandardMaterial({ map: tex('plaster.jpg', [w / 4, h / 4]), roughness: 0.85, side: THREE.DoubleSide });
        const woodMat = (w, h) => new THREE.MeshStandardMaterial({ map: tex('wood_slats.jpg', [w / 4, h / 4]), roughness: 0.7, side: THREE.DoubleSide });
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: 12.0 };

        // ---------- 1. pavimento attorno alla pista (lo stesso vinile grigio-azzurro della palestra)
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(LX, LEN), new THREE.MeshStandardMaterial({ color: 0x5a6878, roughness: 0.55 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(XC, -0.01, 0);
        targetGroup.add(apron);

        // ---------- 2. controsoffitto bianco con le aperture delle lanterne e i faretti tondi
        const ceilMat = (w, d) => new THREE.MeshStandardMaterial({ map: tex('ceiling.jpg', [w / 2.4, d / 2.4]), roughness: 0.9, emissive: 0x262626, side: THREE.DoubleSide });
        const xs = [XW, MON[0][0], MON[0][1], MON[1][0], MON[1][1], XE];
        for (let i = 0; i < xs.length - 1; i += 2) {                       // fasce piene fra le lanterne
            const w = xs[i + 1] - xs[i];
            flatH(w, LEN, ceilMat(w, LEN), (xs[i] + xs[i + 1]) / 2, CEIL, 0, true, ceilGroup);
        }
        MON.forEach(([x0, x1]) => [-1, 1].forEach(sgn => {                 // testate delle lanterne
            const d = ZL - MZ;
            flatH(x1 - x0, d, ceilMat(x1 - x0, d), (x0 + x1) / 2, CEIL, sgn * (MZ + d / 2), true, ceilGroup);
        }));
        const downlights = [];
        for (let i = 0; i < xs.length - 1; i += 2) {
            for (let x = xs[i] + 1.6; x < xs[i + 1] - 1.0; x += 3.2) for (let z = -ZL + 2; z <= ZL - 2; z += 3.2) downlights.push([x, z]);
        }
        const dlIM = new THREE.InstancedMesh(new THREE.CircleGeometry(0.16, 14).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffcf2 }), downlights.length);
        downlights.forEach(([x, z], i) => { tmpM.makeTranslation(x, CEIL - 0.02, z); dlIM.setMatrixAt(i, tmpM); });
        dlIM.instanceMatrix.needsUpdate = true;
        ceilGroup.add(dlIM);

        // ---------- 3. lanterne: sponde bianche, vetrate laterali, capriate a vista, lamiera e lucernari in cima
        const deckMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'roof_deck.jpg', { wrap: true }), roughness: 0.6, metalness: 0.3, emissive: 0x1c1c1c, side: THREE.DoubleSide });
        const clereMat = lit(loadFileTexture(T + 'clerestory.jpg'), 0.5);
        const skyMat = lit(loadFileTexture(T + 'skylight.jpg'), 0.6);
        skyMat.userData.sunWindow = true;               // il sole del giorno entra dai lucernari (index.html, setupGenericDaylight)
        const truss = [];
        const hiBays = [];
        MON.forEach(([x0, x1]) => {
            const xm = (x0 + x1) / 2, w = x1 - x0;
            [x0, x1].forEach(x => {
                flat(2 * MZ, M_GLASS0 - CEIL, plaster(2 * MZ, 1), x, (CEIL + M_GLASS0) / 2, 0, Math.PI / 2, ceilGroup);
                for (let z = -MZ; z < MZ - 0.01; z += 6) flat(6, M_GLASS1 - M_GLASS0, clereMat, x, (M_GLASS0 + M_GLASS1) / 2, z + 3, Math.PI / 2, ceilGroup);
                flat(2 * MZ, M_TOP - M_GLASS1, plaster(2 * MZ, 1), x, (M_GLASS1 + M_TOP) / 2, 0, Math.PI / 2, ceilGroup);
            });
            [-MZ, MZ].forEach(z => flat(w, M_TOP - CEIL, plaster(w, 3), xm, (CEIL + M_TOP) / 2, z, 0, ceilGroup));
            // in cima: lamiera ai lati e lucernari al centro, a tratti da 6 m (ognuno una "finestra" del tetto)
            flatH(1.6, 2 * MZ, deckMat, x0 + 0.8, M_TOP, 0, true, ceilGroup);
            flatH(1.6, 2 * MZ, deckMat, x1 - 0.8, M_TOP, 0, true, ceilGroup);
            for (let z = -MZ; z < MZ - 0.01; z += 6) flatH(w - 3.2, 6, skyMat, xm, M_TOP + 0.02, z + 3, true, ceilGroup);
            // capriate reticolari bianche ogni 4 m, correnti longitudinali
            for (let z = -MZ + 2; z <= MZ - 1.99; z += 4) {
                truss.push([V(x0, M_GLASS1, z), V(x1, M_GLASS1, z), 0.1], [V(x0, M_GLASS0 + 0.2, z), V(x1, M_GLASS0 + 0.2, z), 0.08]);
                for (let k = 0; k < 6; k++) {
                    const xa = x0 + k * w / 6, xb = xa + w / 6;
                    truss.push(k % 2 ? [V(xa, M_GLASS0 + 0.2, z), V(xb, M_GLASS1, z), 0.04] : [V(xa, M_GLASS1, z), V(xb, M_GLASS0 + 0.2, z), 0.04]);
                }
                hiBays.push([xm, z + 2]);
            }
            [x0 + 0.1, x1 - 0.1].forEach(x => truss.push([V(x, M_GLASS1, -MZ), V(x, M_GLASS1, MZ), 0.08], [V(x, M_GLASS0, -MZ), V(x, M_GLASS0, MZ), 0.08]));
        });
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(truss), whiteSteel));
        // grandi fari tondi appesi sotto le capriate
        const hbBody = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.5, 0.3, 18), greySteel, hiBays.length);
        const hbFace = new THREE.InstancedMesh(new THREE.CircleGeometry(0.4, 18).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffdf6 }), hiBays.length);
        hiBays.forEach(([x, z], i) => {
            tmpM.makeTranslation(x, 13.4, z); hbBody.setMatrixAt(i, tmpM);
            tmpM.makeTranslation(x, 13.24, z); hbFace.setMatrixAt(i, tmpM);
        });
        hbBody.instanceMatrix.needsUpdate = true;
        hbFace.instanceMatrix.needsUpdate = true;
        ceilGroup.add(hbBody, hbFace);

        // ---------- 4. parete est (panchine) e testate: zoccolo bianco con le porte, doghe di legno fino al soffitto
        flat(LEN, BASE_H, plaster(LEN, BASE_H), XE, BASE_H / 2, 0, -Math.PI / 2);
        flat(LEN, CEIL - BASE_H, woodMat(LEN, CEIL - BASE_H), XE, (BASE_H + CEIL) / 2, 0, -Math.PI / 2);
        const doorMat = new THREE.MeshStandardMaterial({ map: tex('door.jpg'), roughness: 0.6 });
        [-34, -30, 30, 34].forEach(z => flat(1.1, 2.2, doorMat, XE - 0.04, 1.1, z, -Math.PI / 2));
        [-1, 1].forEach(sgn => {
            const z = sgn * ZL, ry = sgn > 0 ? Math.PI : 0;
            flat(LX, BASE_H, plaster(LX, BASE_H), XC, BASE_H / 2, z, ry);
            flat(LX, CEIL - BASE_H, woodMat(LX, CEIL - BASE_H), XC, (BASE_H + CEIL) / 2, z, ry);
            [-10, -6, 6, 10].forEach(x => flat(1.1, 2.2, doorMat, x, 1.1, z - sgn * 0.04, ry));
        });
        // canestri sulla parete di legno (tabellone bianco su mensola)
        const backboard = new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.4, side: THREE.DoubleSide });
        const rim = new THREE.MeshStandardMaterial({ color: 0xe0582a, roughness: 0.4, metalness: 0.4 });
        [-14, 14].forEach(z => {
            flat(1.8, 1.05, backboard, XE - 1.2, 3.55, z, -Math.PI / 2);
            const r = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 6, 20), rim);
            r.rotation.x = Math.PI / 2;
            r.position.set(XE - 1.5, 3.05, z);
            targetGroup.add(r);
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry([[V(XE - 0.05, 3.2, z - 0.5), V(XE - 1.2, 3.3, z), 0.04], [V(XE - 0.05, 3.2, z + 0.5), V(XE - 1.2, 3.3, z), 0.04]]), greySteel));
        });
        // stendardi del club e striscione della città (il tabellone lo mette index.html, a z = 0)
        const clubBan = lit(tex('banner_club.jpg'));
        [-9, 9].forEach(z => flat(2.0, 3.2, clubBan, XE - 0.06, 7.0, z, -Math.PI / 2));
        flat(8.6, 1.6, lit(tex('banner_city.jpg')), XC + 6, 6.0, ZL - 0.06, Math.PI);

        // ---------- 5. lato ovest: piano terra con le porte vetrate, ballatoio con la ringhiera, tribuna a gradoni
        const FX = -21.0, GAL_H = 3.4;
        const facade = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'facade.jpg', { repeat: [LEN / 3, 1] }), roughness: 0.5 });
        flat(LEN, GAL_H, facade, FX, GAL_H / 2, 0, Math.PI / 2);
        box(0.3, 0.3, LEN, plaster(LEN, 1), FX - 0.15, GAL_H - 0.15, 0);                        // bordo della soletta
        flatH(1.2, LEN, concrete, FX - 0.6, GAL_H, 0, false);
        // ringhiera bianca del ballatoio
        const RX = FX - 0.12, RH = 1.1;
        const rail = [[V(RX, GAL_H + RH, -ZL), V(RX, GAL_H + RH, ZL), 0.035]];
        for (let y = GAL_H + 0.3; y < GAL_H + RH - 0.05; y += 0.27) rail.push([V(RX, y, -ZL), V(RX, y, ZL), 0.012]);
        for (let z = -ZL; z <= ZL + 0.01; z += 1.6) rail.push([V(RX, GAL_H, z), V(RX, GAL_H + RH, z), 0.025]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rail), whiteSteel));
        // reti bianche: davanti al piano terra e appese sopra la ringhiera
        const netMat = (w, h) => new THREE.MeshBasicMaterial({ map: loadFileTexture(T + 'net.png', { repeat: [w / 1.2, h / 1.2] }), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.6 });
        // (interrotta davanti al tavolo dei cronometristi, che sporge fino a x = -20,1)
        [[-ZL, -4], [4, ZL]].forEach(([z0, z1]) => flat(z1 - z0, 2.9, netMat(z1 - z0, 2.9), -19.75, 0.3 + 1.45, (z0 + z1) / 2, Math.PI / 2));
        flat(LEN, 1.4, netMat(LEN, 1.4), RX + 0.08, GAL_H + RH + 0.1 - 0.7, 0, Math.PI / 2);
        // canestri fissati alla ringhiera del ballatoio, rivolti verso la pista
        [-14, 14].forEach(z => {
            flat(1.8, 1.05, backboard, FX + 0.4, GAL_H + 0.7, z, Math.PI / 2);
            const r = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 6, 20), rim);
            r.rotation.x = Math.PI / 2;
            r.position.set(FX + 0.7, GAL_H + 0.25, z);
            targetGroup.add(r);
        });
        // striscioni del tifo sulla ringhiera
        const kop = lit(tex('banner_kop.jpg'));
        [-25, 24].forEach(z => flat(2.8, 1.4, kop, RX + 0.1, GAL_H + 0.55, z, Math.PI / 2));
        // tribuna a gradoni in cemento chiaro fino alla parete di fondo
        const ST = 8, SD = 0.75, SH = 0.42, TX0 = FX - 1.2;
        const seatSpots = [];
        for (let k = 0; k < ST; k++) {
            const h = (k + 1) * SH, xf = TX0 - k * SD;
            box(SD, h, LEN, concrete, xf - SD / 2, GAL_H + h / 2, 0);
            for (let z = -ZL + 0.6; z <= ZL - 0.6; z += lowQ ? 0.66 : 0.54) seatSpots.push([xf - SD * 0.5, GAL_H + h, z]);
        }
        const TOP_X = TX0 - ST * SD;
        box(TOP_X - XW, GAL_H + ST * SH, LEN, concrete, (TOP_X + XW) / 2, (GAL_H + ST * SH) / 2, 0);
        flat(LEN, CEIL, plaster(LEN, CEIL), XW, CEIL / 2, 0, Math.PI / 2);

        // ---------- 6. pubblico: tribuna fitta, gente in piedi alla ringhiera e al piano terra dietro la rete
        const outfits = [0xd8232a, 0x141416, 0xf8fafc, 0x141416, 0xd8232a, 0x2e62b8, 0x4b5563, 0x9ca3af, 0x6b4226, 0xe5e7eb];
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
        // tribuna: tanta gente, metà in piedi, guardano verso +x (la pista)
        seatSpots.forEach(([x, y, z]) => { if (Math.random() < keep * 0.55 * (1 - Math.abs(z) / 70)) fan(x, y, z, 0, Math.random() < 0.5); });
        // ballatoio: in piedi appoggiati alla ringhiera
        for (let z = -ZL + 1; z <= ZL - 1; z += 0.7) if (Math.random() < keep * 0.38) fan(FX - 0.5, GAL_H, z, 0, false);
        // piano terra, dietro la rete (lontano dal tavolo dei cronometristi)
        for (let z = -34; z <= 34; z += 1.1) if (Math.abs(z) > 5 && Math.random() < keep * 0.12) fan(FX + 0.5, 0, z, 0, false);
        // lato est, oltre le panchine
        for (let z = -34; z <= 34; z += 0.9) if (Math.abs(z) > 17.5 && Math.random() < keep * 0.14) fan(XE - 1.0, 0, z, Math.PI, false);
    }

    registerArenaBuilder('valence', buildValenceArchitecture);
})();
