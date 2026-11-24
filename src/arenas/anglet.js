// Palazzetto "anglet": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // SALLE DU PIGNADA (Salle Le Pignada) — ANGLET (Pays Basque), casa dell'Artzak d'Anglet. Tetto a capanna su
    // travi in legno lamellare chiaro, lamiera azzurro-grigia fra le travi, qualche lucernario e i faretti tondi;
    // dal lato della tribuna le travi proseguono in archi curvi che scendono sulla parete ovest. Parete est bianca
    // con la fascia grigia in basso, la fila di cartelloni, il tabellone, i canestri ripiegati e le finestre in
    // alto. Testata nord con gli stendardi verdi dei titoli del club e l'insegna VILLE D'ANGLET – Salle Le Pignada.
    // Lato ovest (cronometristi): i locali del club coi telai rossi e, sopra, la tribuna a gradoni con le
    // ringhiere bianche. Pavimento sportivo azzurro, balaustre bianche col piede giallo, niente vetro.
    // Altezze: gronde a 11 m e colmo a 15,5 m (spostato verso ovest): a x = ±10 le travi sono sopra i 12 m,
    // sopra la telecamera broadcast (11,6 m); con la vista dall'alto (13,2 m) il soffitto si nasconde.
    // Texture in assets/textures/anglet/ (tools/generate_anglet_textures.py).
    // =====================================================================
    function buildAngletArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/anglet/';
        const XW = -27, XE = 22, ZL = 39.5, XR = -3;        // pareti ovest (dietro la tribuna) ed est, testate, colmo
        const LX = XE - XW, LEN = 2 * ZL, XC = (XW + XE) / 2;
        const EAVE = 11, RIDGE = 15.5, GREY_H = 3.0, RAFTER = 0.9;
        const roofY = x => x >= XR ? RIDGE - (RIDGE - EAVE) * (x - XR) / (XE - XR) : RIDGE - (RIDGE - EAVE) * (XR - x) / (XR - XW);
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);

        const woodTex = loadFileTexture(T + 'glulam.jpg', { wrap: true });
        const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.6, emissive: 0x2a1c0e });
        const woodPlain = new THREE.MeshStandardMaterial({ color: 0xb8864f, roughness: 0.65, emissive: 0x24180c });
        const whiteRail = new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: 0.4, metalness: 0.3 });
        const greyMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.6, metalness: 0.4 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.6, metalness: 0.3 });
        const concrete = new THREE.MeshStandardMaterial({ color: 0xa6a49f, roughness: 0.9 });
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
        arenaCeilingHide = { group: ceilGroup, y: 12.6 };

        // ---------- 1. pavimento attorno alla pista (stesso azzurro, più scuro)
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(LX, LEN), new THREE.MeshStandardMaterial({ color: 0x5f9fcc, roughness: 0.6 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(XC, -0.01, 0);
        targetGroup.add(apron);

        // ---------- 2. copertura: lamiera azzurro-grigia sulle due falde, travi lamellari, arcarecci, lucernari, faretti
        const deckMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'roof_deck.jpg', { wrap: true }), roughness: 0.6, metalness: 0.25, emissive: 0x1e2830, side: THREE.DoubleSide });
        const slope = (xa, xb) => {
            const la = Math.abs(xa - XR), lb = Math.abs(xb - XR);
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute([
                xa, roofY(xa) + 0.05, -ZL, xa, roofY(xa) + 0.05, ZL, xb, roofY(xb) + 0.05, ZL, xb, roofY(xb) + 0.05, -ZL], 3));
            g.setAttribute('uv', new THREE.Float32BufferAttribute([0, la / 4, LEN / 4, la / 4, LEN / 4, lb / 4, 0, lb / 4], 2));
            g.setIndex([0, 1, 2, 0, 2, 3]);
            g.computeVertexNormals();
            ceilGroup.add(new THREE.Mesh(g, deckMat));
        };
        slope(XE, XR);
        slope(XW, XR);
        const frameZ = [];
        for (let z = -ZL + 2.5; z <= ZL - 2.49; z += 6) frameZ.push(z);
        // travi lamellari: una per falda, a sezione piena (box ruotato), venature lungo la trave
        const makeRafters = (x0, x1) => {
            const len = Math.hypot(x1 - x0, roofY(x1) - roofY(x0)), ang = Math.atan2(roofY(x1) - roofY(x0), x1 - x0);
            const geo = new THREE.BoxGeometry(len, RAFTER, 0.22);
            const t = woodTex.clone(); t.needsUpdate = true; t.repeat.set(len / 4, 1);
            const inst = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, emissive: 0x2a1c0e }), frameZ.length);
            const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), ang), sc = new THREE.Vector3(1, 1, 1);
            const cx = (x0 + x1) / 2, cy = (roofY(x0) + roofY(x1)) / 2 - RAFTER / 2 - 0.05;
            frameZ.forEach((z, i) => { tmpM.compose(V(cx, cy, z), q, sc); inst.setMatrixAt(i, tmpM); });
            inst.instanceMatrix.needsUpdate = true;
            ceilGroup.add(inst);
        };
        makeRafters(XR, XE - 0.3);
        makeRafters(XW + 4, XR);
        // sul lato ovest la trave prosegue in un arco che scende fin sopra la tribuna
        const arcBeams = [];
        const A0 = V(XW + 4, roofY(XW + 4) - RAFTER / 2, 0), A1 = V(XW + 0.45, 5.6, 0), AC = V(XW + 0.6, roofY(XW + 4) - 0.2, 0);
        const N = lowQ ? 8 : 14;
        for (let i = 0; i < N; i++) {
            const p = (t) => V((1 - t) * (1 - t) * A0.x + 2 * (1 - t) * t * AC.x + t * t * A1.x, (1 - t) * (1 - t) * A0.y + 2 * (1 - t) * t * AC.y + t * t * A1.y, 0);
            arcBeams.push([p(i / N), p((i + 1) / N), 0.55]);
        }
        const arcGeo = mergeBeamGeometry(arcBeams);
        const arcs = new THREE.InstancedMesh(arcGeo, woodPlain, frameZ.length);
        frameZ.forEach((z, i) => { tmpM.makeTranslation(0, 0, z); arcs.setMatrixAt(i, tmpM); });
        arcs.instanceMatrix.needsUpdate = true;
        ceilGroup.add(arcs);
        // arcarecci in legno lungo la sala
        const purl = [];
        [XW + 6, XW + 11, XW + 16, XR - 1.5, XR + 3, XR + 8, XR + 13, XR + 18, XE - 2].forEach(x => purl.push([V(x, roofY(x) - 0.2, -ZL), V(x, roofY(x) - 0.2, ZL), 0.2]));
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(purl), woodPlain));
        // lucernari piccoli sulla falda est
        const skyMat = winLit(tex('window.jpg'), 0.8);
        const skyPos = [], skyUv = [], skyIdx = [];
        for (let k = 0; k < frameZ.length - 1; k += 2) {
            const z = (frameZ[k] + frameZ[k + 1]) / 2, xa = XR + 8.3, xb = XR + 9.7, n = skyPos.length / 3;
            skyPos.push(xa, roofY(xa) + 0.02, z - 0.7, xa, roofY(xa) + 0.02, z + 0.7, xb, roofY(xb) + 0.02, z + 0.7, xb, roofY(xb) + 0.02, z - 0.7);
            skyUv.push(0, 0, 1, 0, 1, 1, 0, 1);
            skyIdx.push(n, n + 1, n + 2, n, n + 2, n + 3);
        }
        const skyGeo = new THREE.BufferGeometry();
        skyGeo.setAttribute('position', new THREE.Float32BufferAttribute(skyPos, 3));
        skyGeo.setAttribute('uv', new THREE.Float32BufferAttribute(skyUv, 2));
        skyGeo.setIndex(skyIdx);
        skyGeo.computeVertexNormals();
        ceilGroup.add(new THREE.Mesh(skyGeo, skyMat));                             // appena sotto la lamiera (a +0,05)
        // faretti tondi fra le travi
        const lamps = [];
        for (let k = 0; k < frameZ.length - 1; k++) {
            const z = (frameZ[k] + frameZ[k + 1]) / 2;
            [-14, -6, 2, 10].forEach(x => lamps.push([x, roofY(x) - 0.7, z]));
        }
        const body = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.26, 0.24, 14), darkMat, lamps.length);
        const face = new THREE.InstancedMesh(new THREE.CircleGeometry(0.22, 14).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffdf4, side: THREE.DoubleSide }), lamps.length);
        const cables = [];
        lamps.forEach(([x, y, z], i) => {
            tmpM.makeTranslation(x, y, z); body.setMatrixAt(i, tmpM);
            tmpM.makeTranslation(x, y - 0.13, z); face.setMatrixAt(i, tmpM);
            cables.push([V(x, y + 0.12, z), V(x, roofY(x) - 0.05, z), 0.015]);
        });
        body.instanceMatrix.needsUpdate = true;
        face.instanceMatrix.needsUpdate = true;
        ceilGroup.add(body, face, new THREE.Mesh(mergeBeamGeometry(cables), darkMat));
        if (!lowQ) {
            const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
            lamps.forEach(([x, y, z], i) => {
                if (i % 2) return;
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff8ea, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(2.0, 2.0, 1);
                spr.position.set(x, y - 0.3, z);
                ceilGroup.add(spr);
            });
        }

        // ---------- 3. pareti: fascia grigia in basso, intonaco bianco, finestre in alto
        const whiteMat = (w, h) => new THREE.MeshStandardMaterial({ map: tex('wall_white.jpg', [w / 4, h / 4]), roughness: 0.85, side: THREE.DoubleSide });
        const greyMat2 = (w) => new THREE.MeshStandardMaterial({ map: tex('wall_grey.jpg', [w / 4, GREY_H / 2]), roughness: 0.8, side: THREE.DoubleSide });
        const winMat = winLit(tex('window.jpg'), 0.55);
        // est
        flat(LEN, GREY_H, greyMat2(LEN), XE, GREY_H / 2, 0, -Math.PI / 2);
        flat(LEN, EAVE - GREY_H, whiteMat(LEN, EAVE - GREY_H), XE, (EAVE + GREY_H) / 2, 0, -Math.PI / 2);
        for (let z = -26; z <= 26.01; z += 6.5) flat(2.4, 1.6, winMat, XE - 0.03, 8.4, z, -Math.PI / 2);
        const adMat = new THREE.MeshStandardMaterial({ map: tex('ad_panels.png'), transparent: true, alphaTest: 0.2, roughness: 0.7 });
        flat(40, 2.4, adMat, XE - 0.04, 4.7, 0, -Math.PI / 2);
        // ovest: dietro la tribuna, fino alla gronda, con le finestre sopra l'ultima fila
        flat(LEN, EAVE, whiteMat(LEN, EAVE), XW, EAVE / 2, 0, Math.PI / 2);
        for (let z = -27; z <= 27.01; z += 6) flat(3.0, 1.8, winMat, XW + 0.03, 7.6, z, Math.PI / 2);
        // testate a capanna (colmo spostato verso ovest)
        const gable = new THREE.Shape();
        gable.moveTo(XW, 0); gable.lineTo(XE, 0); gable.lineTo(XE, EAVE); gable.lineTo(XR, RIDGE); gable.lineTo(XW, EAVE); gable.lineTo(XW, 0);
        const gableGeo = new THREE.ShapeGeometry(gable);
        const gp = gableGeo.attributes.position, gu = gableGeo.attributes.uv;
        for (let i = 0; i < gp.count; i++) gu.setXY(i, gp.getX(i) / 4, gp.getY(i) / 4);
        const gableMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'wall_white.jpg', { wrap: true }), roughness: 0.85, side: THREE.DoubleSide });
        [-ZL, ZL].forEach(z => {
            const g = new THREE.Mesh(gableGeo, gableMat); g.position.z = z; targetGroup.add(g);
            flat(LX, GREY_H, greyMat2(LX), XC, GREY_H / 2, z + (z < 0 ? 0.02 : -0.02), z < 0 ? 0 : Math.PI);
        });
        // nord: stendardi verdi dei titoli, insegna VILLE D'ANGLET – Salle Le Pignada, canestro fisso
        flat(9.6, 3.0, new THREE.MeshStandardMaterial({ map: tex('pennants.png'), transparent: true, alphaTest: 0.2, roughness: 0.8 }), XR, 10.2, -ZL + 0.05, 0);
        flat(3.2, 1.0, lit(tex('sign_pignada.jpg'), 0.12), XR, 7.6, -ZL + 0.05, 0);
        const backboard = box(1.8, 1.05, 0.04, new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.6 }), XR, 5.0, -ZL + 1.2);
        backboard.material.side = THREE.DoubleSide;
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 6, 20), new THREE.MeshStandardMaterial({ color: 0xe5591a, roughness: 0.5 }));
        hoop.rotation.x = Math.PI / 2;
        hoop.position.set(XR, 4.55, -ZL + 1.5);
        targetGroup.add(hoop);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry([[V(XR - 0.5, 5.0, -ZL + 1.2), V(XR - 0.5, 5.0, -ZL), 0.06], [V(XR + 0.5, 5.0, -ZL + 1.2), V(XR + 0.5, 5.0, -ZL), 0.06]]), darkMat));
        // sud: striscione del club e due finestre
        flat(5.2, 1.95, lit(tex('banner_club.jpg'), 0.14), XR, 6.2, ZL - 0.05, Math.PI);
        [-14, 10].forEach(x => flat(2.4, 1.6, winMat, x, 8.6, ZL - 0.03, Math.PI));
        // est: canestri ripiegati verso la parete
        [-14, 14].forEach(z => {
            const bb = box(0.04, 1.05, 1.8, new THREE.MeshPhysicalMaterial({ color: 0xeef4f8, transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide }), XE - 1.6, 7.2, z);
            bb.rotation.z = -1.1;
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry([[V(XE - 0.1, 6.4, z), V(XE - 1.4, 6.9, z), 0.08], [V(XE - 0.1, 9.6, z), V(XE - 1.9, 7.6, z), 0.06]]), darkMat));
        });

        // ---------- 4. lato ovest: locali del club coi telai rossi e, sopra, la tribuna con le ringhiere bianche
        const ZT = 30, TL = 2 * ZT, FRONT = -21.0, ROOM_H = 3.0, STEP_D = 0.8, STEP_H = 0.42, TIERS = 6;
        box(0.6, ROOM_H, TL, concrete, FRONT - 0.3, ROOM_H / 2, 0);
        flat(TL, ROOM_H, new THREE.MeshStandardMaterial({ map: tex('club_front.jpg', [TL / 40, 1]), roughness: 0.8 }), FRONT + 0.01, ROOM_H / 2, 0, Math.PI / 2);
        const tierFront = [];
        for (let k = 1; k <= TIERS; k++) {
            const h = ROOM_H + k * STEP_H, xf = FRONT - 0.6 - (k - 1) * STEP_D;
            box(STEP_D, h, TL, concrete, xf - STEP_D / 2, h / 2, 0);
            tierFront.push([xf, h]);
        }
        const xBack = FRONT - 0.6 - TIERS * STEP_D, topH = ROOM_H + TIERS * STEP_H;
        box(xBack - XW, topH, TL, concrete, (XW + xBack) / 2, topH / 2, 0);
        [-1, 1].forEach(sgn => box(FRONT - XW, topH + 0.1, 0.2, concrete, (FRONT + XW) / 2, (topH + 0.1) / 2, sgn * (ZT + 0.1)));
        const rails = [];
        const railAt = (x, y0) => {
            rails.push([V(x, y0 + 1.0, -ZT), V(x, y0 + 1.0, ZT), 0.06], [V(x, y0 + 0.5, -ZT), V(x, y0 + 0.5, ZT), 0.035]);
            for (let z = -ZT; z <= ZT + 0.01; z += 2.0) rails.push([V(x, y0, z), V(x, y0 + 1.0, z), 0.05]);
        };
        railAt(FRONT - 0.1, ROOM_H);                                               // davanti, sopra i locali
        railAt(tierFront[3][0] + 0.3, tierFront[2][1]);                            // a metà tribuna, come nelle foto (dietro chi siede in terza fila)
        // corrimano lungo le scale ai lati
        [-1, 1].forEach(sgn => rails.push([V(FRONT - 0.3, ROOM_H + 1.0, sgn * (ZT - 0.5)), V(xBack, topH + 1.0, sgn * (ZT - 0.5)), 0.05]));
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rails), whiteRail));

        // ---------- 5. pubblico: in tribuna (seduto sul bordo dei gradoni) e qualcuno in piedi alla ringhiera
        const outfits = [0x14583a, 0xd32f2f, 0xf8fafc, 0x141416, 0x14583a, 0x2e62b8, 0x4b5563, 0xf5c518, 0x9ca3af];
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
        tierFront.forEach(([xf, h], k) => {
            for (let z = -ZT + 1.2; z <= ZT - 1.2; z += 0.6) {
                if (Math.random() < keep * (0.42 - k * 0.05) * (1 - Math.abs(z) / 50)) fan(xf - 0.15, h - STEP_H + 0.04, z, 0, true);
            }
        });
        // in piedi sul primo gradone, alla ringhiera sopra i locali
        for (let z = -ZT + 1; z <= ZT - 1; z += 0.8) if (Math.random() < keep * 0.15) fan(FRONT - 0.35, ROOM_H, z, 0, false);
    }

    registerArenaBuilder('anglet', buildAngletArchitecture);
})();
