// Palazzetto "aranda": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // PABELLÓN CHELVA / PRÍNCIPE DE ASTURIAS — ARANDA DE DUERO (Burgos), casa del CHL Aranda de Duero.
    // Capannone in acciaio a portali bianchi, copertura a due falde in lamiera grigio chiaro con le strisce di
    // lucernari e le lampade a campana appese. Pareti in pannelli sandwich bianchi a fasce orizzontali, la trave
    // giallo-arancio lungo i lati lunghi e i controventi a croce nelle campate di testata. Testata nord: il corpo
    // degli spogliatoi con le finestre e, sopra, la galleria col pubblico e la scala che scende verso est.
    // Lato ovest (cronometristi): tribunetta blu di tre file; lato est (panchine) il passaggio col pubblico in
    // piedi e il filo verde alla base della parete. Pista a piastrelle grigie, balaustre bianche col piede giallo e
    // la rete bianca sopra, più alta dietro le porte; tabellone luminoso sulla parete ovest.
    // Altezze: gronda a 10,5 m e colmo a 14,5 m: a x = ±10 le travi dei portali sono a 12 m, sopra la telecamera
    // broadcast (11,6 m); con la vista dall'alto (13,2 m) il soffitto si nasconde.
    // Texture in assets/textures/aranda/ (tools/generate_aranda_textures.py).
    // =====================================================================
    function buildArandaArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/aranda/';
        const XW = -25, XE = 25, ZL = 41;                  // pareti: ovest (tribunetta), est (panchine), testate
        const LX = XE - XW, LEN = 2 * ZL, HW = LX / 2;
        const EAVE = 10.5, RIDGE = 14.5, RAFTER = 0.8;
        const roofY = x => EAVE + (RIDGE - EAVE) * (1 - Math.abs(x) / HW);
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);

        // bianco anche visto da sotto: un filo di autoilluminazione
        const steelWhite = new THREE.MeshStandardMaterial({ color: 0xe6e9ec, roughness: 0.5, metalness: 0.3, emissive: 0x26292c });
        const orangeMat = new THREE.MeshStandardMaterial({ color: 0xe8a020, roughness: 0.5, metalness: 0.3 });
        const greyMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.6, metalness: 0.4 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.6, metalness: 0.3 });
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
        // lucernari e finestre verso l'esterno: di giorno ci entra il sole (index.html, setupGenericDaylight)
        const winLit = (t, k) => { const m = lit(t, k); m.userData.sunWindow = true; return m; };
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: 13.0 };

        // ---------- 1. pavimento in cemento grigio attorno alla pista, filo verde alla base della parete est
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(LX, LEN), new THREE.MeshStandardMaterial({ color: 0x8e9194, roughness: 0.7 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.y = -0.01;
        targetGroup.add(apron);
        const greenStrip = new THREE.Mesh(new THREE.PlaneGeometry(0.6, LEN - 2), new THREE.MeshStandardMaterial({ color: 0x2f7a3a, roughness: 0.6 }));
        greenStrip.rotation.x = -Math.PI / 2;
        greenStrip.position.set(XE - 0.3, 0.002, 0);
        targetGroup.add(greenStrip);

        // ---------- 2. copertura a due falde: lamiera grigio chiaro, strisce di lucernari, portali e arcarecci
        const slopeLen = Math.hypot(HW, RIDGE - EAVE);
        const deckMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'roof_deck.jpg', { wrap: true }), roughness: 0.65, metalness: 0.25, emissive: 0x2c2e30, side: THREE.DoubleSide });
        [-1, 1].forEach(sgn => {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute([
                sgn * HW, EAVE + 0.05, -ZL, sgn * HW, EAVE + 0.05, ZL, 0, RIDGE + 0.05, ZL, 0, RIDGE + 0.05, -ZL], 3));
            g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, LEN / 4, 0, LEN / 4, slopeLen / 4, 0, slopeLen / 4], 2));
            g.setIndex([0, 1, 2, 0, 2, 3]);
            g.computeVertexNormals();
            ceilGroup.add(new THREE.Mesh(g, deckMat));
        });
        // lucernari: due strisce per falda lungo tutta la sala, appena sotto la lamiera
        const skyMat = winLit(loadFileTexture(T + 'skylight.jpg', { wrap: true }), 0.75);
        const skyPos = [], skyUv = [], skyIdx = [];
        [-1, 1].forEach(sgn => [6, 16].forEach(xa => {
            const xb = xa + 2.4, ya = roofY(xa) + 0.02, yb = roofY(xb) + 0.02;
            for (let z = -ZL + 3; z <= ZL - 5.99; z += 6) {
                const z0 = z + 0.9, z1 = z + 5.1, k = skyPos.length / 3;
                skyPos.push(sgn * xa, ya, z0, sgn * xa, ya, z1, sgn * xb, yb, z1, sgn * xb, yb, z0);
                skyUv.push(0, 0, 1, 0, 1, 1, 0, 1);
                skyIdx.push(k, k + 1, k + 2, k, k + 2, k + 3);
            }
        }));
        const skyGeo = new THREE.BufferGeometry();
        skyGeo.setAttribute('position', new THREE.Float32BufferAttribute(skyPos, 3));
        skyGeo.setAttribute('uv', new THREE.Float32BufferAttribute(skyUv, 2));
        skyGeo.setIndex(skyIdx);
        skyGeo.computeVertexNormals();
        // appena sotto la lamiera (che è a +0,05): il lucernario copre la lamiera vista da sotto
        ceilGroup.add(new THREE.Mesh(skyGeo, skyMat));
        // portali: pilastri sulle pareti lunghe e travi a sezione piena lungo le falde (un pezzo per falda)
        const frameZ = [];
        for (let z = -ZL + 2; z <= ZL - 1.99; z += 6.1) frameZ.push(z);
        const rafterGeo = new THREE.BoxGeometry(slopeLen, RAFTER, 0.24);
        const ang = Math.atan2(RIDGE - EAVE, HW);
        const rafters = new THREE.InstancedMesh(rafterGeo, steelWhite, frameZ.length * 2);
        const q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1);
        let ri = 0;
        frameZ.forEach(z => [-1, 1].forEach(sgn => {
            q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -sgn * ang);
            tmpM.compose(V(sgn * HW / 2, (EAVE + RIDGE) / 2 - RAFTER / 2 - 0.1, z), q, sc);
            rafters.setMatrixAt(ri++, tmpM);
        }));
        rafters.instanceMatrix.needsUpdate = true;
        ceilGroup.add(rafters);
        const colGeo = new THREE.BoxGeometry(0.5, EAVE, 0.3);
        const cols = new THREE.InstancedMesh(colGeo, steelWhite, frameZ.length * 2);
        let ci = 0;
        frameZ.forEach(z => [XW + 0.3, XE - 0.3].forEach(x => { tmpM.makeTranslation(x, EAVE / 2, z); cols.setMatrixAt(ci++, tmpM); }));
        cols.instanceMatrix.needsUpdate = true;
        targetGroup.add(cols);
        const purlins = [];
        for (let k = 1; k < 9; k++) {
            const x = HW * k / 9;
            [-1, 1].forEach(s => purlins.push([V(s * x, roofY(x) - 0.15, -ZL), V(s * x, roofY(x) - 0.15, ZL), 0.12]));
        }
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(purlins), steelWhite));
        // lampade a campana appese, quattro per campata
        const lamps = [];
        for (let k = 0; k < frameZ.length - 1; k++) {
            const z = (frameZ[k] + frameZ[k + 1]) / 2;
            [-12, -4, 4, 12].forEach(x => lamps.push([x, roofY(x) - 1.0, z]));   // a x = ±12 restano sopra gli 11,6 m della broadcast
        }
        const bell = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.36, 0.36, 14, 1, true), greyMat, lamps.length);
        const face = new THREE.InstancedMesh(new THREE.CircleGeometry(0.34, 14).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfdfbf2, side: THREE.DoubleSide }), lamps.length);
        const cables = [];
        lamps.forEach(([x, y, z], i) => {
            tmpM.makeTranslation(x, y, z); bell.setMatrixAt(i, tmpM);
            tmpM.makeTranslation(x, y - 0.17, z); face.setMatrixAt(i, tmpM);
            cables.push([V(x, y + 0.18, z), V(x, roofY(x) - 0.1, z), 0.015]);
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

        // ---------- 3. pareti in pannelli bianchi, trave giallo-arancio e controventi a croce sui lati lunghi
        const panelMat = (w, h) => new THREE.MeshStandardMaterial({ map: tex('wall_panels.jpg', [w / 4, h / 4]), roughness: 0.75, side: THREE.DoubleSide });
        [[XE, -Math.PI / 2, -1], [XW, Math.PI / 2, 1]].forEach(([x, ry, inward]) => {
            flat(LEN, EAVE, panelMat(LEN, EAVE), x, EAVE / 2, 0, ry);
            box(0.3, 0.45, LEN, orangeMat, x + inward * 0.45, 7.6, 0);              // trave giallo-arancio
            const br = [];
            [[frameZ[0], frameZ[1]], [frameZ[frameZ.length - 2], frameZ[frameZ.length - 1]]].forEach(([za, zb]) => {
                br.push([V(x + inward * 0.35, 0.4, za), V(x + inward * 0.35, 7.4, zb), 0.12], [V(x + inward * 0.35, 0.4, zb), V(x + inward * 0.35, 7.4, za), 0.12]);
                br.push([V(x + inward * 0.35, 3.9, za), V(x + inward * 0.35, 3.9, zb), 0.1]);
            });
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry(br), steelWhite));
        });
        // testate a capanna in pannelli bianchi
        const gable = new THREE.Shape();
        gable.moveTo(XW, 0); gable.lineTo(XE, 0); gable.lineTo(XE, EAVE); gable.lineTo(0, RIDGE); gable.lineTo(XW, EAVE); gable.lineTo(XW, 0);
        const gableGeo = new THREE.ShapeGeometry(gable);
        const gp = gableGeo.attributes.position, gu = gableGeo.attributes.uv;
        for (let i = 0; i < gp.count; i++) gu.setXY(i, gp.getX(i) / 4, gp.getY(i) / 4);
        const gableMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'wall_panels.jpg', { wrap: true }), roughness: 0.75, side: THREE.DoubleSide });
        [-ZL, ZL].forEach(z => { const g = new THREE.Mesh(gableGeo, gableMat); g.position.z = z; targetGroup.add(g); });
        // striscione del club sulla testata sud
        flat(5.6, 2.1, lit(tex('banner_club.jpg'), 0.14), 0, 5.2, ZL - 0.05, Math.PI);

        // ---------- 4. testata nord: corpo degli spogliatoi con le finestre, galleria col pubblico, scala verso est
        const GX0 = -12, GX1 = 8, GD = 3.2, GY = 6.2, ZB = -ZL + GD;              // fronte del corpo a z = ZB
        const concreteW = new THREE.MeshStandardMaterial({ color: 0xeceeee, roughness: 0.85 });
        box(GX1 - GX0, GY, GD, concreteW, (GX0 + GX1) / 2, GY / 2, -ZL + GD / 2);
        const winMat = winLit(tex('window.jpg'), 0.35);
        [-7.5, -2.5].forEach(x => flat(2.0, 1.5, winMat, x, 4.3, ZB + 0.02, 0));
        [-9.5, 3.5].forEach(x => flat(1.1, 2.2, darkMat, x, 1.1, ZB + 0.02, 0));
        box(GX1 - GX0, 0.2, 0.3, concreteW, (GX0 + GX1) / 2, GY + 0.1, ZB + 0.1);            // cordolo della galleria
        const gal = [[V(GX0, GY + 1.05, ZB + 0.1), V(GX1, GY + 1.05, ZB + 0.1), 0.05], [V(GX0, GY + 0.55, ZB + 0.1), V(GX1, GY + 0.55, ZB + 0.1), 0.03]];
        for (let x = GX0; x <= GX1 + 0.01; x += 1.25) gal.push([V(x, GY + 0.2, ZB + 0.1), V(x, GY + 1.05, ZB + 0.1), 0.035]);
        // scala che scende dalla galleria verso est, lungo la testata
        const SX1 = GX1 + 6.5, steps = 16, sW = 1.2;
        for (let k = 0; k < steps; k++) {
            const t0 = k / steps;
            const x = GX1 + (SX1 - GX1) * (t0 + 0.5 / steps), y = GY * (1 - t0);
            box((SX1 - GX1) / steps + 0.02, 0.08, sW, greyMat, x, y - 0.04, -ZL + GD - sW / 2);
        }
        gal.push([V(GX1, GY + 1.0, ZB), V(SX1, 1.0, ZB), 0.05]);
        gal.push([V(GX1, GY, ZB - 0.05), V(SX1, 0, ZB - 0.05), 0.12]);                            // cosciale
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(gal), darkMat));

        // ---------- 5. rete bianca sopra le balaustre: 1 m sui lati, 2 m dietro le porte; aperta davanti a panchine e puniti
        const R = cornerRadius + 0.1, hx = rinkWidth / 2 - cornerRadius, hz = rinkLength / 2 - cornerRadius;
        const perim = [];
        const addArc = (cx, cz, a0) => { for (let i = 0; i <= 10; i++) { const a = a0 + (Math.PI / 2) * i / 10; perim.push(V(cx + Math.cos(a) * R, 0, cz + Math.sin(a) * R)); } };
        addArc(hx, hz, 0); addArc(-hx, hz, Math.PI / 2); addArc(-hx, -hz, Math.PI); addArc(hx, -hz, Math.PI * 1.5);
        perim.push(perim[0].clone());
        const curve = new THREE.CatmullRomCurve3(perim, false, 'catmullrom', 0.05);
        const open = p => (p.x > rinkWidth / 2 - 0.5 && Math.abs(p.z) > 3.4 && Math.abs(p.z) < 15.6) ||
            (p.x < -rinkWidth / 2 + 0.5 && Math.abs(p.z) < 7.6);
        const B0 = 1.15, fenceTop = p => B0 + (Math.abs(p.z) > hz + 1.5 ? 2.0 : 1.0);
        const pos = [], uv = [], idx = [], rails = [];
        const nSeg = Math.round(curve.getLength() / 0.5);
        let prev = curve.getPointAt(0), dist = 0;
        for (let i = 1; i <= nSeg; i++) {
            const p = curve.getPointAt(i / nSeg), len = p.distanceTo(prev);
            if (!open(p) && !open(prev)) {
                const top = Math.max(fenceTop(prev), fenceTop(p));
                const k = pos.length / 3;
                pos.push(prev.x, B0, prev.z, p.x, B0, p.z, p.x, top, p.z, prev.x, top, prev.z);
                uv.push(dist / 0.5, 0, (dist + len) / 0.5, 0, (dist + len) / 0.5, (top - B0) / 0.5, dist / 0.5, (top - B0) / 0.5);
                idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
                rails.push([V(prev.x, top, prev.z), V(p.x, top, p.z), 0.045]);
                if (i % 4 === 0) rails.push([V(p.x, B0, p.z), V(p.x, top, p.z), 0.05]);
            }
            dist += len; prev = p;
        }
        const fenceGeo = new THREE.BufferGeometry();
        fenceGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        fenceGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        fenceGeo.setIndex(idx);
        fenceGeo.computeVertexNormals();
        targetGroup.add(new THREE.Mesh(fenceGeo, new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'mesh_white.png', { wrap: true }), transparent: true, alphaTest: 0.3, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide })));
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rails), steelWhite));

        // ---------- 6. tribunetta blu sul lato ovest: tre file lungo il campo
        const ZT = 28, TL = 2 * ZT, X1 = -21.0, D1 = 0.9, STEP = 0.4;
        const blueMat = new THREE.MeshStandardMaterial({ color: 0x1f4fa8, roughness: 0.45 });
        const benchSpots = [];
        for (let k = 0; k < 3; k++) {
            const h = (k + 1) * STEP, xa = X1 - (k + 1) * D1;
            box(D1, h, TL, blueMat, xa + D1 / 2, h / 2, 0);
            benchSpots.push([X1 - k * D1 - 0.15, h]);                            // sul bordo: le gambe scendono sul gradino sotto
        }

        // ---------- 7. pubblico: sulla tribunetta, in galleria e in piedi lungo la parete est
        const outfits = [0x2350b8, 0x141416, 0xf8fafc, 0x141416, 0x2350b8, 0x7a1e34, 0x4b5563, 0xd71f26, 0xf5c518];
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
        // la tribunetta è una panca a gradoni: si siede sul bordo del gradino (seduta a 0,42 m dal piano di sotto)
        benchSpots.forEach(([x, h], k) => {
            for (let z = -ZT + 0.6; z <= ZT - 0.6; z += 0.6) {
                if (Math.random() < keep * (0.42 - k * 0.08) * (1 - Math.abs(z) / 45)) fan(x, h - 0.42 + 0.04, z, 0, true);
            }
        });
        // galleria sopra gli spogliatoi, piena come nelle foto (guarda verso +z)
        for (let x = GX0 + 0.5; x <= GX1 - 0.5; x += 0.55) {
            if (Math.random() < keep * 0.75) fan(x, GY, ZB - 0.5 - Math.random() * 0.4, -Math.PI / 2, false);
            if (Math.random() < keep * 0.35) fan(x + 0.25, GY, ZB - 1.4 - Math.random() * 0.6, -Math.PI / 2, false);
        }
        for (let z = -33; z <= 33; z += 0.9) {
            if (Math.abs(z) < 17.5) continue;
            if (Math.random() < keep * 0.25) fan(XE - 1.2, 0, z, Math.PI, false);
        }
        for (let z = -33; z <= 33; z += 1.2) if (Math.abs(z) > ZT && Math.random() < keep * 0.3) fan(-20.6, 0, z, 0, false);
    }

    registerArenaBuilder('aranda', buildArandaArchitecture);
})();
