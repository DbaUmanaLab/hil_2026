// Palazzetto "riccione": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // PATTINODROMO COMUNALE — RICCIONE (RN), casa dei Corsari Riccione. Copertura a capanna su capriate in legno
    // lamellare chiaro (catena, puntoni, monaco e saette) con gli arcarecci e il tavolato di perline, lampade a
    // campana appese e faretti tondi, un lucernario sul colmo verso sud. Pareti bianche col bordo blu della gronda,
    // finestre a nastro in alto (con le tende beige sul lato delle panchine), aerotermi e casse. Pavimento in cemento
    // lucidato beige-grigio con le righe sottili; balaustre trasparenti col telaio in alluminio e il corrimano color
    // crema, reti bianche dietro le porte. Lato ovest: tribunetta rialzata coi seggiolini neri e la ringhiera;
    // testata nord con la bandiera dei Corsari, sud con l'insegna del pattinodromo.
    // Altezze: gronda e catene delle capriate a 12,2 m, colmo a 15,6 m (sopra la telecamera broadcast, 11,6 m).
    // Texture in assets/textures/riccione/ (tools/generate_riccione_textures.py).
    // =====================================================================
    function buildRiccioneArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/riccione/';
        const XW = -25.4, XE = 23.6, ZL = 40.5, XR = (XW + XE) / 2;
        const LX = XE - XW, LEN = 2 * ZL;
        const EAVE = 12.2, RIDGE = 15.6;
        const roofY = x => EAVE + (RIDGE - EAVE) * (1 - Math.abs(x - XR) / (LX / 2));
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        const tmpM = new THREE.Matrix4();
        const std = (c, r, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r }, o || {}));
        const tex = (f, rep) => loadFileTexture(T + f, rep ? { repeat: rep } : {});
        const flat = (w, h, mat, x, y, z, ry, parent) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
            m.position.set(x, y, z); m.rotation.y = ry || 0;
            (parent || targetGroup).add(m); return m;
        };
        const box = (w, h, d, mat, x, y, z, parent) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            m.position.set(x, y, z); (parent || targetGroup).add(m); return m;
        };
        const lit = (t, k) => new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: k || 0.12, roughness: 0.8, side: THREE.DoubleSide });
        const winLit = (t, k) => { const m = lit(t, k); m.userData.sunWindow = true; return m; };   // il sole entra di qui
        const woodTex = loadFileTexture(T + 'glulam.jpg', { wrap: true });
        const woodPlain = std(0xa8692f, 0.62, { emissive: 0x1c1008 });
        const alu = std(0xb8bcc0, 0.35, { metalness: 0.7 });
        const darkMat = std(0x26282c, 0.6, { metalness: 0.3 });
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: EAVE - 0.3 };

        // ---------- 1. pavimento attorno alla pista (stesso cemento lucidato)
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(LX, LEN), std(0xc4beb2, 0.35, { metalness: 0.05 }));
        apron.rotation.x = -Math.PI / 2; apron.position.set(XR, -0.01, 0);
        targetGroup.add(apron);

        // ---------- 2. copertura: tavolato di perline sulle due falde, capriate lamellari, arcarecci, lucernario
        const plankMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'planks.jpg', { wrap: true }), roughness: 0.7, emissive: 0x160e06, side: THREE.DoubleSide });
        const slope = (xa, xb) => {
            const la = Math.abs(xa - XR), lb = Math.abs(xb - XR), k = Math.hypot(1, (RIDGE - EAVE) / (LX / 2));
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute([
                xa, roofY(xa) + 0.05, -ZL, xa, roofY(xa) + 0.05, ZL, xb, roofY(xb) + 0.05, ZL, xb, roofY(xb) + 0.05, -ZL], 3));
            g.setAttribute('uv', new THREE.Float32BufferAttribute([0, la * k / 4, LEN / 4, la * k / 4, LEN / 4, lb * k / 4, 0, lb * k / 4], 2));
            g.setIndex([0, 1, 2, 0, 2, 3]);
            g.computeVertexNormals();
            ceilGroup.add(new THREE.Mesh(g, plankMat));
        };
        slope(XE, XR);
        slope(XW, XR);
        // capriate ogni 6 m: catena (trave piena con la texture), puntoni, monaco, saette e montanti
        const frameZ = [];
        for (let z = -ZL + 4.5; z <= ZL - 4.49; z += 6) frameZ.push(z);
        const TIE_H = 0.75, TIE_Y = EAVE - TIE_H / 2;
        const tieTex = woodTex.clone(); tieTex.needsUpdate = true; tieTex.repeat.set(LX / 4, 1);
        const ties = new THREE.InstancedMesh(new THREE.BoxGeometry(LX, TIE_H, 0.26), new THREE.MeshStandardMaterial({ map: tieTex, roughness: 0.6, emissive: 0x1c1008 }), frameZ.length);
        frameZ.forEach((z, i) => { tmpM.makeTranslation(XR, TIE_Y, z); ties.setMatrixAt(i, tmpM); });
        ties.instanceMatrix.needsUpdate = true;
        ceilGroup.add(ties);
        const H2 = LX / 2, top = EAVE;
        const truss = [
            [V(XW, top, 0), V(XR, RIDGE - 0.15, 0), 0.34], [V(XE, top, 0), V(XR, RIDGE - 0.15, 0), 0.34],   // puntoni
            [V(XR, top, 0), V(XR, RIDGE - 0.2, 0), 0.26]                                                   // monaco
        ];
        [-1, 1].forEach(s => {
            const xm = XR + s * H2 * 0.5, xq = XR + s * H2 * 0.25, xo = XR + s * H2 * 0.75;
            truss.push([V(XR, top, 0), V(xm, roofY(xm) - 0.25, 0), 0.22]);                                // saetta lunga
            truss.push([V(xm, top, 0), V(xm, roofY(xm) - 0.25, 0), 0.18]);                                // montante
            truss.push([V(xm, top, 0), V(xo, roofY(xo) - 0.25, 0), 0.18]);
            truss.push([V(xq, top, 0), V(xq, roofY(xq) - 0.25, 0), 0.16]);
        });
        const trussGeo = mergeBeamGeometry(truss);
        const trusses = new THREE.InstancedMesh(trussGeo, woodPlain, frameZ.length);
        frameZ.forEach((z, i) => { tmpM.makeTranslation(0, 0, z); trusses.setMatrixAt(i, tmpM); });
        trusses.instanceMatrix.needsUpdate = true;
        ceilGroup.add(trusses);
        // arcarecci lungo la sala e trave di colmo
        const purl = [[V(XR, RIDGE - 0.2, -ZL), V(XR, RIDGE - 0.2, ZL), 0.3]];
        for (let k = 1; k <= 6; k++) [-1, 1].forEach(s => { const x = XR + s * H2 * k / 7; purl.push([V(x, roofY(x) - 0.12, -ZL), V(x, roofY(x) - 0.12, ZL), 0.2]); });
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(purl), woodPlain));
        // lucernario sul colmo, verso la testata sud (come nelle foto)
        const skyMat = winLit(tex('skylight.jpg'), 0.9);
        [-1, 1].forEach(s => {
            const xa = XR + s * 0.4, xb = XR + s * 3.2;
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute([xa, roofY(xa) + 0.02, 22, xa, roofY(xa) + 0.02, 34, xb, roofY(xb) + 0.02, 34, xb, roofY(xb) + 0.02, 22], 3));
            g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 3, 0, 3, 1, 0, 1], 2));
            g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals();
            ceilGroup.add(new THREE.Mesh(g, skyMat));
        });
        // lampade a campana appese (tre file) e faretti tondi nel tavolato
        const bells = [], spots = [];
        for (let k = 0; k < frameZ.length - 1; k++) {
            const z = (frameZ[k] + frameZ[k + 1]) / 2;
            [XR - 12, XR, XR + 12].forEach(x => bells.push([x, EAVE - 1.0, z]));
            [XR - 6, XR + 6, XR - 18, XR + 18].forEach(x => spots.push([x, roofY(x) - 0.04, z]));
        }
        const bellBody = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.42, 0.5, 16, 1, true), std(0x1e2024, 0.5, { metalness: 0.5, side: THREE.DoubleSide }), bells.length);
        const bellFace = new THREE.InstancedMesh(new THREE.CircleGeometry(0.4, 16).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffdf4, side: THREE.DoubleSide }), bells.length);
        const cables = [];
        bells.forEach(([x, y, z], i) => {
            tmpM.makeTranslation(x, y, z); bellBody.setMatrixAt(i, tmpM);
            tmpM.makeTranslation(x, y - 0.24, z); bellFace.setMatrixAt(i, tmpM);
            cables.push([V(x, y + 0.25, z), V(x, roofY(x), z), 0.015]);
        });
        const spotFace = new THREE.InstancedMesh(new THREE.CircleGeometry(0.2, 12).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffaf0, side: THREE.DoubleSide }), spots.length);
        spots.forEach(([x, y, z], i) => { tmpM.makeTranslation(x, y, z); spotFace.setMatrixAt(i, tmpM); });
        [bellBody, bellFace, spotFace].forEach(m => { m.instanceMatrix.needsUpdate = true; ceilGroup.add(m); });
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(cables), darkMat));
        if (!lowQ) {
            const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
            bells.forEach(([x, y, z]) => {
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff6e6, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(2.4, 2.4, 1); spr.position.set(x, y - 0.4, z);
                ceilGroup.add(spr);
            });
        }

        // ---------- 3. pareti bianche, bordo blu della gronda, finestre a nastro, pilastri, aerotermi e casse
        const whiteMat = (w, h) => new THREE.MeshStandardMaterial({ map: tex('wall_white.jpg', [w / 4, h / 4]), roughness: 0.85, side: THREE.DoubleSide });
        const blueTrim = std(0x2b5fb4, 0.5, { metalness: 0.2 });
        const winMat = winLit(tex('windows.jpg'), 0.5);
        const curtainMat = winLit(tex('windows_curtain.jpg'), 0.35);
        flat(LEN, EAVE, whiteMat(LEN, EAVE), XE, EAVE / 2, 0, -Math.PI / 2);                 // est (panchine)
        flat(LEN, EAVE, whiteMat(LEN, EAVE), XW, EAVE / 2, 0, Math.PI / 2);                  // ovest (tribuna)
        const pillarMat = whiteMat(0.7, EAVE);                                                // uno solo per tutti i pilastri
        [[XE - 0.12, 1], [XW + 0.12, -1]].forEach(([x, s]) => {
            box(0.24, 0.32, LEN, blueTrim, x, EAVE - 0.16, 0);                                 // gronda blu
            for (let z = -ZL + 6; z <= ZL - 5.99; z += 12) box(0.5, EAVE, 0.7, pillarMat, x - s * 0.13, EAVE / 2, z);   // pilastri
        });
        for (let z = -ZL + 12; z <= ZL - 11.99; z += 12) {
            flat(10.4, 1.9, curtainMat, XE - 0.04, 8.6, z - 6, -Math.PI / 2);                 // est: tende beige tirate
            flat(10.4, 1.9, winMat, XW + 0.04, 8.6, z - 6, Math.PI / 2);                       // ovest: vetri chiari
        }
        flat(10.4, 1.9, curtainMat, XE - 0.04, 8.6, ZL - 6, -Math.PI / 2);
        flat(10.4, 1.9, winMat, XW + 0.04, 8.6, ZL - 6, Math.PI / 2);
        // aerotermi in alto e casse acustiche
        const heaterMat = std(0xe8e8e4, 0.5, { metalness: 0.3 }), grill = std(0x9a9ea2, 0.5, { metalness: 0.5 });
        [-27, -3, 21].forEach(z => [[XE, -1], [XW, 1]].forEach(([x, s]) => {
            box(0.7, 0.9, 1.2, heaterMat, x + s * 0.4, 10.6, z);
            box(0.02, 0.6, 0.9, grill, x + s * 0.76, 10.6, z);
        }));
        [-18, 6, 30].forEach(z => [[XE, -1], [XW, 1]].forEach(([x, s]) => box(0.35, 0.55, 0.38, darkMat, x + s * 0.25, 5.4, z)));
        // striscioni: 30 anni del club (est), striscione rosso-nero (ovest, sopra la tribuna)
        flat(3.6, 2.56, lit(tex('banner_30.jpg'), 0.12), XE - 0.06, 5.0, -24, -Math.PI / 2);
        flat(7.0, 1.8, lit(tex('banner_club.jpg'), 0.12), XW + 0.06, 5.6, 0, Math.PI / 2);
        // testate a capanna: bandiera dei Corsari (nord), insegna del pattinodromo (sud), finestre e porte
        const gable = new THREE.Shape();
        gable.moveTo(XW, 0); gable.lineTo(XE, 0); gable.lineTo(XE, EAVE); gable.lineTo(XR, RIDGE); gable.lineTo(XW, EAVE); gable.lineTo(XW, 0);
        const gableGeo = new THREE.ShapeGeometry(gable);
        const gp = gableGeo.attributes.position, gu = gableGeo.attributes.uv;
        for (let i = 0; i < gp.count; i++) gu.setXY(i, gp.getX(i) / 4, gp.getY(i) / 4);
        const gableMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'wall_white.jpg', { wrap: true }), roughness: 0.85, side: THREE.DoubleSide });
        const doorMat = std(0x8a9096, 0.4, { metalness: 0.5 }), doorGlass = std(0x5e6a74, 0.15, { metalness: 0.4 });
        [-ZL, ZL].forEach(z => {
            const g = new THREE.Mesh(gableGeo, gableMat); g.position.z = z; targetGroup.add(g);
            const dz = z < 0 ? 0.05 : -0.05, ry = z < 0 ? 0 : Math.PI;
            [XR - 13, XR + 13].forEach(x => flat(8.0, 1.6, winMat, x, 9.0, z + dz, ry));
            // porta a due ante col sopraluce
            box(2.4, 2.6, 0.12, doorMat, XR + 6, 1.3, z + dz);
            [-0.55, 0.55].forEach(dx => box(0.8, 1.4, 0.14, doorGlass, XR + 6 + dx, 1.6, z + dz));
            box(0.5, 0.18, 0.06, std(0x2f9e4a, 0.5, { emissive: 0x1f8a3a, emissiveIntensity: 0.6 }), XR + 6, 2.9, z + dz * 1.4);   // uscita di sicurezza
        });
        flat(4.0, 4.75, lit(tex('flag_corsari.jpg'), 0.1), XR, 6.4, -ZL + 0.08, 0);
        flat(6.0, 1.3, lit(tex('sign_city.jpg'), 0.12), XR - 8, 6.2, ZL - 0.08, Math.PI);
        flat(4.0, 4.75, lit(tex('flag_corsari.jpg'), 0.1), XR + 8, 6.0, ZL - 0.08, Math.PI);

        // ---------- 4. balaustre: telaio in alluminio (zoccolo, montanti) e corrimano color crema; reti dietro le porte
        const R = cornerRadius + 0.04, hx = rinkWidth / 2 - cornerRadius, hz = rinkLength / 2 - cornerRadius;
        const perim = [];
        const addArc = (cx, cz, a0) => { for (let i = 0; i <= 10; i++) { const a = a0 + (Math.PI / 2) * i / 10; perim.push(V(cx + Math.cos(a) * R, 0, cz + Math.sin(a) * R)); } };
        addArc(hx, hz, 0); addArc(-hx, hz, Math.PI / 2); addArc(-hx, -hz, Math.PI); addArc(hx, -hz, Math.PI * 1.5);
        perim.push(perim[0].clone());
        const curve = new THREE.CatmullRomCurve3(perim, false, 'catmullrom', 0.05);
        const open = q => (q.x > rinkWidth / 2 - 0.5 && Math.abs(q.z) > 3.4 && Math.abs(q.z) < 15.6) || (q.x < -rinkWidth / 2 + 0.5 && Math.abs(q.z) < 7.6);
        const TOP = boardHeightOf();
        const rail = [], posts = [], kick = [];
        const nSeg = Math.round(curve.getLength() / 0.5);
        let prev = curve.getPointAt(0);
        for (let i = 1; i <= nSeg; i++) {
            const q = curve.getPointAt(i / nSeg);
            if (!open(q) && !open(prev)) {
                rail.push([V(prev.x, TOP, prev.z), V(q.x, TOP, q.z), 0.11]);
                kick.push([V(prev.x, 0.1, prev.z), V(q.x, 0.1, q.z), 0.2]);
                if (i % 4 === 0) posts.push([V(q.x, 0, q.z), V(q.x, TOP, q.z), 0.06]);
            }
            prev = q;
        }
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rail), std(0xece2c8, 0.5)));        // corrimano crema
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(posts.concat(kick)), alu));
        const netTex = loadFileTexture('assets/textures/kraken_camaiore/net_white.png', { wrap: true });
        const netMat = new THREE.MeshBasicMaterial({ map: netTex, color: 0xe8e8e4, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, depthWrite: false, opacity: 0.75 });
        [-1, 1].forEach(s => {
            const w = 2 * hx + 4, h = 3.4;
            const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
            for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 0.1, uv.getY(i) * h / 0.1);
            const net = new THREE.Mesh(g, netMat);
            net.position.set(0, TOP + h / 2, s * (rinkLength / 2 + 0.05));
            targetGroup.add(net);
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry([[V(-w / 2, TOP + h, s * (rinkLength / 2 + 0.05)), V(w / 2, TOP + h, s * (rinkLength / 2 + 0.05)), 0.03]]), alu));
        });

        // ---------- 5. tribunetta rialzata sul lato ovest: gradoni, seggiolini neri, ringhiera e scale
        const ZT = 17, STEP_D = 0.85, STEP_H = 0.42, ROWS = 4, X0 = -rinkWidth / 2 - 3.6, Y0 = 1.0;
        const concrete = std(0xb8b4ac, 0.9);
        const rowsAt = [];
        for (let k = 0; k < ROWS; k++) {
            const xf = X0 - k * STEP_D, h = Y0 + k * STEP_H;
            box(STEP_D, h, 2 * ZT, concrete, xf - STEP_D / 2, h / 2, 0);
            rowsAt.push([xf, h]);
        }
        const xBack = X0 - ROWS * STEP_D;
        if (xBack > XW) box(xBack - XW, Y0 + ROWS * STEP_H, 2 * ZT, concrete, (xBack + XW) / 2, (Y0 + ROWS * STEP_H) / 2, 0);
        const seatPos = [];
        rowsAt.forEach(([xf, h]) => { for (let z = -ZT + 0.6; z <= ZT - 0.6; z += 0.55) seatPos.push([xf - STEP_D * 0.55, h, z]); });
        const seats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.06, 0.44), std(0x18191c, 0.6), seatPos.length);
        const backs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.4, 0.44), std(0x18191c, 0.6), seatPos.length);
        seatPos.forEach(([x, y, z], i) => {
            tmpM.makeTranslation(x, y + 0.44, z); seats.setMatrixAt(i, tmpM);
            tmpM.makeTranslation(x - 0.22, y + 0.66, z); backs.setMatrixAt(i, tmpM);
        });
        seats.instanceMatrix.needsUpdate = true; backs.instanceMatrix.needsUpdate = true;
        targetGroup.add(seats, backs);
        const rails = [[V(X0 + 0.05, Y0 + 1.0, -ZT), V(X0 + 0.05, Y0 + 1.0, ZT), 0.05], [V(X0 + 0.05, Y0 + 0.5, -ZT), V(X0 + 0.05, Y0 + 0.5, ZT), 0.03]];
        for (let z = -ZT; z <= ZT + 0.01; z += 2) rails.push([V(X0 + 0.05, Y0, z), V(X0 + 0.05, Y0 + 1.0, z), 0.04]);
        [-1, 1].forEach(s => rails.push([V(X0 + 0.6, 1.0, s * (ZT + 0.3)), V(xBack, Y0 + ROWS * STEP_H + 1.0, s * (ZT + 0.3)), 0.045], [V(X0 + 0.6, 0, s * (ZT + 0.3)), V(X0 + 0.6, 1.0, s * (ZT + 0.3)), 0.045]));
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rails), alu));
        // panche gialle sui telai blu lungo la parete delle panchine (spogliatoio aperto, come nelle foto)
        const benchWood = std(0xd9a84a, 0.6), benchFrame = std(0x24409a, 0.5, { metalness: 0.4 });
        [[-34, -20], [22, 34]].forEach(([z0, z1]) => {
            box(0.4, 0.05, z1 - z0, benchWood, XE - 0.5, 0.46, (z0 + z1) / 2);
            box(0.05, 0.3, z1 - z0, benchWood, XE - 0.28, 0.85, (z0 + z1) / 2);
            const fr = [];
            for (let z = z0; z <= z1 + 0.01; z += 2) fr.push([V(XE - 0.65, 0, z), V(XE - 0.65, 0.46, z), 0.04], [V(XE - 0.28, 0, z), V(XE - 0.28, 1.0, z), 0.04]);
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry(fr), benchFrame));
        });

        // ---------- 6. pubblico: seduto in tribuna e qualcuno in piedi lungo le balaustre
        const outfits = [0x141416, 0xc41e2e, 0xf8fafc, 0x141416, 0x2e62b8, 0x4b5563, 0xe5e7eb, 0x7f1d1d, 0x9ca3af];
        const jm = outfits.map(c => std(c, 0.65));
        const pantsM = std(0x1e293b, 0.8), handM = std(0xc99178, 0.6), hairM = std(0x2a1d14, 0.8);
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
        rowsAt.forEach(([xf, h], k) => {
            for (let z = -ZT + 0.6; z <= ZT - 0.6; z += 0.55) if (Math.random() < keep * (0.55 - k * 0.07)) fan(xf - STEP_D * 0.55 + 0.05, h, z, 0, true);
        });
        // in piedi dietro le balaustre delle testate e del lato ovest, fuori dalla tribuna
        for (let z = -34; z <= 34; z += 0.9) {
            if (Math.abs(z) < ZT + 1.5) continue;
            if (Math.random() < keep * 0.22) fan(-rinkWidth / 2 - 1.2 - Math.random() * 1.2, 0, z, 0, false);
        }
    }
    function boardHeightOf() { return 1.15; }                 // altezza delle balaustre del gioco (index.html, boardHeight)

    registerArenaBuilder('riccione', buildRiccioneArchitecture);
})();
