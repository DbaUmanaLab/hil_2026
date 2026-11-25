// Palazzetto "metz": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // GYMNASE RENÉ AVIEZ — PONT-DE-METZ (Somme), alle porte di Amiens, casa dei Green Falcons. Capannone moderno
    // in acciaio: portali in profilati grigi, copertura in lamiera scura con il grande lucernario a volta in
    // policarbonato lungo il colmo e le plafoniere LED rettangolari. Pareti in lamiera grecata grigio chiaro con i
    // controventi, zoccolo in blocchi grigi e fascia continua di pannelli traslucidi in alto (da lì e dal lucernario
    // entra il sole). Reti nere di protezione tutt'attorno alla pista, telo frangivista nero dietro le porte.
    // Lato ovest (cronometristi): tribuna a gradoni in cemento con le panche di legno, dietro la rete, e gli
    // stendardi del club sulla parete. Lato est (panchine): porte verdi, buvette e club house nello zoccolo, il
    // tabellone col lungo striscione verde, la maglia incorniciata e la bandiera francese. Sulle testate il grande
    // telo verde con lo stemma. Pista a piastrelle grigie con la riga centrale e le aree di porta verdi, i cerchi
    // rossi e lo stemma al centro; balaustre verdi col piede giallo, nere e consumate dietro le porte.
    // Altezze: portali a 12,3 m alle pareti e plafoniere a 12,1 m, sopra la telecamera broadcast (11,6 m); con la
    // vista dall'alto (13,2 m) il soffitto si nasconde.
    // Texture in assets/textures/metz/ (tools/generate_metz_textures.py).
    // =====================================================================
    function buildMetzArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/metz/';
        const XW = -26, XE = 24, ZL = 40, LX = XE - XW, LEN = 2 * ZL, XC = (XW + XE) / 2;
        const EAVE = 12.3, RIDGE = 13.8, VAULT = 3.6;          // lucernario a volta largo 7,2 m sul colmo
        const BASE_H = 3.0, WIN_B = 7.0, WIN_T = 9.6;
        const roofY = x => EAVE + (RIDGE - EAVE) * (1 - Math.abs(x - XC) / (LX / 2));
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);

        const steel = new THREE.MeshStandardMaterial({ color: 0x80868c, roughness: 0.5, metalness: 0.45 });
        const darkSteel = new THREE.MeshStandardMaterial({ color: 0x3a3e44, roughness: 0.55, metalness: 0.4 });
        const concrete = new THREE.MeshStandardMaterial({ color: 0x9a9894, roughness: 0.92 });
        const wood = new THREE.MeshStandardMaterial({ color: 0xb48a58, roughness: 0.65 });
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
        const lit = (t, k) => new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: k || 0.12, roughness: 0.8, side: THREE.DoubleSide });
        // vetrate verso l'esterno: di giorno ci entra il sole (index.html, setupGenericDaylight)
        const winLit = (t, k) => { const m = lit(t, k); m.userData.sunWindow = true; return m; };
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: 12.0 };

        // ---------- 1. pavimento attorno alla pista (cemento grigio scuro)
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(LX, LEN), new THREE.MeshStandardMaterial({ color: 0x5c5e60, roughness: 0.85 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(XC, -0.01, 0);
        targetGroup.add(apron);

        // ---------- 2. pareti lunghe: zoccolo in blocchi, lamiera grecata, fascia di pannelli traslucidi
        const clad = (w, h) => new THREE.MeshStandardMaterial({ map: tex('cladding.jpg', [w / 4, h / 4]), roughness: 0.6, metalness: 0.25, side: THREE.DoubleSide });
        const block = (w, h) => new THREE.MeshStandardMaterial({ map: tex('block_wall.jpg', [w / 4, h / 4]), roughness: 0.9, side: THREE.DoubleSide });
        const winMat = winLit(loadFileTexture(T + 'window_band.jpg'), 0.6);
        const bayZ = [];
        for (let z = -ZL; z < ZL - 0.01; z += 6) bayZ.push(z);   // campate da 6 m (l'ultima più corta)
        [[XW, Math.PI / 2], [XE, -Math.PI / 2]].forEach(([x, ry]) => {
            flat(LEN, BASE_H, block(LEN, BASE_H), x, BASE_H / 2, 0, ry);
            flat(LEN, WIN_B - BASE_H, clad(LEN, WIN_B - BASE_H), x, (BASE_H + WIN_B) / 2, 0, ry);
            flat(LEN, EAVE - WIN_T, clad(LEN, EAVE - WIN_T), x, (WIN_T + EAVE) / 2, 0, ry);
            // pannelli traslucidi a campate: una fascia unica verrebbe presa per un lucernario dal giorno generico
            bayZ.forEach(z0 => { const w = Math.min(6, ZL - z0); flat(w, WIN_T - WIN_B, winMat, x, (WIN_B + WIN_T) / 2, z0 + w / 2, ry); });
        });
        // testate: zoccolo in blocchi e lamiera fino alla copertura
        const gable = new THREE.Shape();
        gable.moveTo(XW, BASE_H); gable.lineTo(XE, BASE_H); gable.lineTo(XE, EAVE); gable.lineTo(XC, RIDGE + 1.6); gable.lineTo(XW, EAVE); gable.lineTo(XW, BASE_H);
        const gableGeo = new THREE.ShapeGeometry(gable);
        const gp = gableGeo.attributes.position, gu = gableGeo.attributes.uv;
        for (let i = 0; i < gp.count; i++) gu.setXY(i, gp.getX(i) / 4, gp.getY(i) / 4);
        const endMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'cladding.jpg', { wrap: true }), roughness: 0.6, metalness: 0.25, side: THREE.DoubleSide });
        [-1, 1].forEach(sgn => {
            const e = new THREE.Mesh(gableGeo, endMat);
            e.position.z = sgn * ZL;
            targetGroup.add(e);
            flat(LX, BASE_H, block(LX, BASE_H), XC, BASE_H / 2, sgn * ZL, 0);
        });
        // pilastri in acciaio, correnti e controventi a V nella lamiera
        const frame = [];
        for (let z = -ZL; z <= ZL + 0.01; z += 6) {
            [[XW + 0.2, 1], [XE - 0.2, -1]].forEach(([x]) => frame.push([V(x, 0, z), V(x, EAVE, z), 0.18]));
        }
        [XW + 0.15, XE - 0.15].forEach(x => {
            frame.push([V(x, BASE_H, -ZL), V(x, BASE_H, ZL), 0.08], [V(x, WIN_B, -ZL), V(x, WIN_B, ZL), 0.1], [V(x, WIN_T, -ZL), V(x, WIN_T, ZL), 0.1]);
            for (let z = -ZL; z < ZL - 0.01; z += 6) {
                const zm = z + 3;
                frame.push([V(x, BASE_H + 0.1, z + 0.2), V(x, WIN_B - 0.1, zm), 0.05], [V(x, WIN_B - 0.1, zm), V(x, BASE_H + 0.1, z + 5.8), 0.05]);
            }
        });
        [-1, 1].forEach(sgn => {
            const z = sgn * (ZL - 0.15);
            for (let x = XW; x < XE - 0.01; x += 6.25) frame.push([V(x, 0, z), V(x, roofY(x), z), 0.14], [V(x, BASE_H, z), V(x + 6.25, Math.min(roofY(x + 6.25), 9.5), z), 0.04]);
            frame.push([V(XW, BASE_H, z), V(XE, BASE_H, z), 0.08]);
        });
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(frame), steel));

        // ---------- 3. copertura: lamiera scura, portali, lucernario a volta in policarbonato, plafoniere LED
        const deckMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'roof_deck.jpg', { wrap: true }), roughness: 0.6, metalness: 0.35, emissive: 0x0e1014, side: THREE.DoubleSide });
        const quad = (pts, uvs, mat) => {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
            g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            g.setIndex([0, 1, 2, 0, 2, 3]);
            g.computeVertexNormals();
            ceilGroup.add(new THREE.Mesh(g, mat));
        };
        [[XW, XC - VAULT], [XE, XC + VAULT]].forEach(([xe, xv]) => {
            const sl = Math.hypot(xe - xv, roofY(xv) - EAVE);
            quad([xe, EAVE + 0.3, -ZL, xe, EAVE + 0.3, ZL, xv, roofY(xv) + 0.3, ZL, xv, roofY(xv) + 0.3, -ZL], [0, 0, LEN / 4, 0, LEN / 4, sl / 4, 0, sl / 4], deckMat);
        });
        // volta del lucernario a tratti da 6 m (ognuno è una "finestra" sul tetto per il sole del giorno)
        const skyMat = lit(loadFileTexture(T + 'skylight.jpg'), 0.6);
        skyMat.userData.sunWindow = true;
        const vy = roofY(XC - VAULT) + 0.3;
        for (let z = -ZL + 2; z < ZL - 2 - 0.01; z += 6) {
            const len = Math.min(6, ZL - 2 - z);
            const vault = new THREE.Mesh(new THREE.CylinderGeometry(VAULT, VAULT, len, 20, 1, true, -Math.PI / 2, Math.PI), skyMat);
            vault.rotation.x = -Math.PI / 2;        // l'arco (z locale >= 0) va verso l'alto
            vault.scale.set(1, 1, 0.42);            // dopo la rotazione la scala z schiaccia l'arco in altezza
            vault.position.set(XC, vy, z + len / 2);
            ceilGroup.add(vault);
        }
        // tamponamenti in lamiera alle due estremità della volta
        [-1, 1].forEach(sgn => {
            const cap = new THREE.Mesh(new THREE.CircleGeometry(VAULT, 20, 0, Math.PI), deckMat);
            cap.scale.set(1, 0.42, 1);
            cap.position.set(XC, vy, sgn * (ZL - 2));
            ceilGroup.add(cap);
            quad([XC - VAULT, vy, sgn * (ZL - 2), XC + VAULT, vy, sgn * (ZL - 2), XC + VAULT, vy, sgn * ZL, XC - VAULT, vy, sgn * ZL], [0, 0, 1, 0, 1, 0.5, 0, 0.5], deckMat);
        });
        // portali in profilati grigi ogni 6 m, arcarecci e telaio del lucernario
        const roof = [];
        for (let z = -ZL + 2; z <= ZL - 1.99; z += 6) {
            roof.push([V(XW + 0.2, EAVE, z), V(XC - VAULT, roofY(XC - VAULT), z), 0.26], [V(XC + VAULT, roofY(XC + VAULT), z), V(XE - 0.2, EAVE, z), 0.26]);
            roof.push([V(XC - VAULT, roofY(XC - VAULT), z), V(XC + VAULT, roofY(XC + VAULT), z), 0.18]);
            for (let k = 0; k <= 10; k++) {                // costola dell'arco del lucernario
                const a0 = Math.PI * k / 10, a1 = Math.PI * (k + 1) / 10;
                if (k < 10) roof.push([V(XC - VAULT * Math.cos(a0), vy + VAULT * 0.42 * Math.sin(a0), z), V(XC - VAULT * Math.cos(a1), vy + VAULT * 0.42 * Math.sin(a1), z), 0.05]);
            }
        }
        for (let i = 1; i < 8; i++) {
            const xa = XW + (XC - VAULT - XW) * i / 8, xb = XC + VAULT + (XE - XC - VAULT) * i / 8;
            roof.push([V(xa, roofY(xa) + 0.12, -ZL), V(xa, roofY(xa) + 0.12, ZL), 0.07], [V(xb, roofY(xb) + 0.12, -ZL), V(xb, roofY(xb) + 0.12, ZL), 0.07]);
        }
        [XC - VAULT, XC + VAULT].forEach(x => roof.push([V(x, vy, -ZL + 2), V(x, vy, ZL - 2), 0.12]));
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(roof), steel));
        // plafoniere LED rettangolari appese ai portali
        const ledSpots = [];
        [-17, -9, 7, 15].forEach(x => { for (let z = -ZL + 5; z <= ZL - 4.99; z += 6) ledSpots.push([x, z]); });
        const ledBody = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.08, 0.6), darkSteel, ledSpots.length);
        const ledFace = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.1, 0.5).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffdf4 }), ledSpots.length);
        const ledHang = [];
        ledSpots.forEach(([x, z], i) => {
            const y = 12.15;
            tmpM.makeTranslation(x, y, z); ledBody.setMatrixAt(i, tmpM);
            tmpM.makeTranslation(x, y - 0.045, z); ledFace.setMatrixAt(i, tmpM);
            ledHang.push([V(x, y, z), V(x, roofY(x) + 0.2, z), 0.012]);
        });
        ledBody.instanceMatrix.needsUpdate = true;
        ledFace.instanceMatrix.needsUpdate = true;
        ceilGroup.add(ledBody, ledFace, new THREE.Mesh(mergeBeamGeometry(ledHang), darkSteel));

        // ---------- 4. reti nere tutt'attorno alla pista (sopra le balaustre) e telo frangivista dietro le porte
        const NET_TOP = 4.6;
        const netMat = (w, h) => new THREE.MeshBasicMaterial({ map: loadFileTexture(T + 'net.png', { repeat: [w / 1.4, h / 1.4] }), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.6 });
        const posts = [];
        const netRun = (x0, z0, x1, z1) => {
            const w = Math.hypot(x1 - x0, z1 - z0), h = NET_TOP - 1.15;
            const m = flat(w, h, netMat(w, h), (x0 + x1) / 2, 1.15 + h / 2, (z0 + z1) / 2, Math.abs(x1 - x0) < 0.01 ? Math.PI / 2 : 0);
            const n = Math.max(1, Math.round(w / 4));
            for (let k = 0; k <= n; k++) {
                const x = x0 + (x1 - x0) * k / n, z = z0 + (z1 - z0) * k / n;
                posts.push([V(x, 1.15, z), V(x, NET_TOP + 0.1, z), 0.04]);
            }
            posts.push([V(x0, NET_TOP, z0), V(x1, NET_TOP, z1), 0.012]);
            return m;
        };
        const NX = 18.25, NZ = 36.2;
        netRun(-NX, -34, -NX, -4); netRun(-NX, 4, -NX, 34);              // ovest, interrotta davanti al tavolo
        netRun(NX, -34, NX, -16); netRun(NX, 16, NX, 34);                // est, non sopra le panchine
        [-1, 1].forEach(sgn => netRun(-14, sgn * NZ, 14, sgn * NZ));
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(posts), darkSteel));
        const windMat = new THREE.MeshStandardMaterial({ map: tex('windscreen.jpg', [6, 1]), roughness: 0.95, side: THREE.DoubleSide });
        [-1, 1].forEach(sgn => flat(24, 1.5, windMat, 0, 1.15 + 0.75, sgn * (NZ + 0.03), 0));

        // ---------- 5. testate: grande telo verde con lo stemma; striscione della città a nord
        const shieldMat = lit(tex('banner_shield.jpg'), 0.1);
        flat(6.2, 5.0, shieldMat, XC + 2, 7.2, ZL - 0.06, Math.PI);
        flat(6.2, 5.0, shieldMat, XC - 2, 7.2, -ZL + 0.06, 0);
        flat(9.4, 2.0, lit(tex('banner_city.jpg')), XC + 12, 5.2, -ZL + 0.06, 0);

        // ---------- 6. lato est: club house nello zoccolo, tabellone, striscione verde, maglia, bandiera
        const doorMat = new THREE.MeshStandardMaterial({ map: tex('door_green.jpg'), roughness: 0.6 });
        [-32, -24, 24, 31].forEach(z => flat(1.2, 2.3, doorMat, XE - 0.04, 1.15, z, -Math.PI / 2));
        flat(4.2, 2.1, new THREE.MeshStandardMaterial({ map: tex('buvette.jpg'), roughness: 0.5 }), XE - 0.04, 1.45, -36.5, -Math.PI / 2);
        const glassDark = new THREE.MeshStandardMaterial({ color: 0x3c4650, roughness: 0.2, metalness: 0.3, emissive: 0x161c22 });
        [28, 34].forEach(z => flat(3.0, 1.4, glassDark, XE - 0.04, 1.7, z, -Math.PI / 2));
        flat(4.6, 1.5, lit(tex('banner_house.jpg')), XE - 0.05, 3.9, 27.5, -Math.PI / 2);
        // il tabellone lo mette index.html (z = -16); sotto, lo striscione verde lungo
        flat(15, 2.2, lit(tex('banner_long.jpg')), XE - 0.06, 4.4, -16, -Math.PI / 2);
        flat(1.3, 1.3, new THREE.MeshStandardMaterial({ map: tex('jersey_frame.jpg'), roughness: 0.5 }), XE - 0.06, 5.4, 6, -Math.PI / 2);
        const flag = flat(3.0, 2.0, new THREE.MeshStandardMaterial({ map: tex('flag_france.jpg'), roughness: 0.85, side: THREE.DoubleSide }), XE - 0.35, WIN_B + 1.1, 14, -Math.PI / 2);
        flag.rotation.z = 0.03;

        // ---------- 7. lato ovest: tribuna a gradoni in cemento con le panche di legno, stendardi sulla parete
        const TS = 5, TD = 0.8, TH = 0.45, TX0 = -20.6, TZ = 30;
        const seatSpots = [];
        for (let k = 0; k < TS; k++) {
            const h = (k + 1) * TH, xf = TX0 - k * TD;
            box(TD, h, 2 * TZ, concrete, xf - TD / 2, h / 2, 0);
            box(0.34, 0.05, 2 * TZ, wood, xf - TD * 0.62, h + 0.4, 0);            // panca di legno
            for (let z = -TZ + 0.4; z <= TZ - 0.4; z += lowQ ? 0.62 : 0.52) seatSpots.push([xf - TD * 0.62, h, z]);
        }
        const benchLegs = [];
        for (let k = 0; k < TS; k++) for (let z = -TZ + 1; z <= TZ - 0.99; z += 2.5) benchLegs.push([V(TX0 - k * TD - TD * 0.62, (k + 1) * TH, z), V(TX0 - k * TD - TD * 0.62, (k + 1) * TH + 0.4, z), 0.03]);
        const TOP_X = TX0 - TS * TD, TOP_H = TS * TH;
        box(TOP_X - XW, TOP_H, 2 * TZ, concrete, (XW + TOP_X) / 2, TOP_H / 2, 0);
        const rails = [[V(TOP_X + 0.1, TOP_H + 1.0, -TZ), V(TOP_X + 0.1, TOP_H + 1.0, TZ), 0.03]];
        for (let z = -TZ; z <= TZ + 0.01; z += 2) rails.push([V(TOP_X + 0.1, TOP_H, z), V(TOP_X + 0.1, TOP_H + 1.0, z), 0.022]);
        [-TZ, TZ].forEach(z => rails.push([V(TX0, TH + 1.0, z), V(TOP_X, TOP_H + 1.0, z), 0.03], [V(TX0, TH, z), V(TX0, TH + 1.0, z), 0.03]));
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(benchLegs.concat(rails)), steel));
        [-18, -6, 6, 18].forEach(z => flat(3.0, 2.4, shieldMat, XW + 0.06, 5.0, z, Math.PI / 2));

        // ---------- 8. pubblico: tribuna ovest, in piedi lungo la rete est e alla buvette
        const outfits = [0x2aa84a, 0x141416, 0xf8fafc, 0x141416, 0x2aa84a, 0x1f4d36, 0x4b5563, 0x2e62b8, 0x9ca3af, 0xd94f8a];
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
        // tribuna: seduti sulle panche, guardano verso +x (la pista)
        seatSpots.forEach(([x, y, z]) => { if (Math.random() < keep * 0.48 * (1 - Math.abs(z) / 60)) fan(x, y, z, 0, true); });
        for (let z = -TZ + 1; z <= TZ - 1; z += 0.8) if (Math.random() < keep * 0.2) fan(TOP_X - 0.5, TOP_H, z, 0, false);
        // in piedi dietro la rete est, oltre le panchine (guardano verso -x)
        for (let z = -34; z <= 34; z += 0.9) {
            if (Math.abs(z) < 17.5) continue;
            if (Math.random() < keep * 0.2) fan(XE - 1.6, 0, z, Math.PI, false);
        }
    }

    registerArenaBuilder('metz', buildMetzArchitecture);
})();
