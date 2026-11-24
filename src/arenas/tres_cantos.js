// Palazzetto "tres_cantos": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // POLIDEPORTIVO MUNICIPAL LAURA OTER — TRES CANTOS (Madrid), casa dei Kamikazes. Capannone
    // rettangolare alto con la copertura piana su un reticolare spaziale bianco (correnti superiori e
    // inferiori sfalsati, diagonali a piramide), file di lucernari e lampade a campana appese; condotto
    // dell'aria argentato lungo il lato est. Pareti in lamiera grecata bianca, sulle testate tre fasce di
    // vetri colorati (rosa, magenta, giallo, azzurro). Sulla parete lunga ovest il grande murale del
    // palazzetto (colonne colorate, sagome di atleti, stemma di Tres Cantos). Niente tribune: il pubblico
    // guarda in piedi dietro le balaustre. Pista azzurra con le righe rosse.
    // Altezze: le telecamere di gioco (broadcast 11,6 m, dall'alto 13,2 m) restano sotto il reticolare;
    // solo la vista dall'alto col telefono in verticale (15 m) lo supera, e allora il soffitto si nasconde.
    // Texture in assets/textures/tres_cantos/ (tools/generate_tres_cantos_textures.py).
    // =====================================================================
    function buildTresCantosArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/tres_cantos/';
        const XW = -22.5, XE = 24, ZL = 42;                // pareti: ovest (murale), est (panchine), testate
        const XC = (XW + XE) / 2, LX = XE - XW, LEN = 2 * ZL;
        const ROOF = 16.2, TOPC = 15.9, BOTC = 14.3;        // lamiera, corrente superiore e inferiore del reticolare
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);

        // bianco anche visto da sotto (le luci della sala lo illuminano poco): un filo di autoilluminazione
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: 0.45, metalness: 0.3, emissive: 0x3a3d42 });
        const greyMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.7 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x24272c, roughness: 0.5, metalness: 0.3 });
        const tex = (f, rep) => loadFileTexture(T + f, rep ? { repeat: rep } : {});
        const flat = (w, h, mat, x, y, z, ry, parent) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
            m.position.set(x, y, z);
            m.rotation.y = ry || 0;
            (parent || targetGroup).add(m);
            return m;
        };
        const lit = (t, k) => new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: k || 0.15, roughness: 0.8, side: THREE.DoubleSide });
        // vetri e lucernari verso l'esterno: di giorno ci entra il sole (index.html, setupGenericDaylight)
        const winLit = (t, k) => { const m = lit(t, k); m.userData.sunWindow = true; return m; };
        // soffitto (reticolare, lamiera, lampade): nascosto se una telecamera sale sopra il reticolare
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: BOTC - 0.2 };

        // ---------- 1. pavimento attorno alla pista
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(LX, LEN), new THREE.MeshStandardMaterial({ color: 0x86aec4, roughness: 0.65 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(XC, -0.01, 0);
        targetGroup.add(apron);

        // ---------- 2. reticolare spaziale: maglia superiore, maglia inferiore sfalsata di mezza campata, diagonali
        const G = lowQ ? 4.6 : 3.05;
        const nx = Math.floor(LX / G), nz = Math.floor(LEN / G);
        const x0 = XC - nx * G / 2, z0 = -nz * G / 2;
        const beams = [];
        for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
            const x = x0 + i * G, z = z0 + j * G;
            if (i < nx) beams.push([V(x, TOPC, z), V(x + G, TOPC, z), 0.11]);
            if (j < nz) beams.push([V(x, TOPC, z), V(x, TOPC, z + G), 0.11]);
        }
        for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
            const x = x0 + (i + 0.5) * G, z = z0 + (j + 0.5) * G;
            if (i < nx - 1) beams.push([V(x, BOTC, z), V(x + G, BOTC, z), 0.11]);
            if (j < nz - 1) beams.push([V(x, BOTC, z), V(x, BOTC, z + G), 0.11]);
            const h = G / 2;
            [[-h, -h], [h, -h], [-h, h], [h, h]].forEach(([dx, dz]) => beams.push([V(x, BOTC, z), V(x + dx, TOPC, z + dz), 0.07]));
        }
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(beams), frameMat));
        // copertura in lamiera chiara e file di lucernari lungo la sala
        const deck = new THREE.Mesh(new THREE.PlaneGeometry(LX, LEN), new THREE.MeshStandardMaterial({ map: tex('roof_deck.jpg', [LX / 4, LEN / 4]), roughness: 0.75, metalness: 0.25, side: THREE.DoubleSide }));
        deck.rotation.x = Math.PI / 2;
        deck.position.set(XC, ROOF, 0);
        ceilGroup.add(deck);
        const skyMat = winLit(tex('skylight.jpg', [1, LEN / 6]), 0.6);
        [-17, -8, 1, 10, 19].forEach(x => {
            const s = new THREE.Mesh(new THREE.PlaneGeometry(2.6, LEN - 6), skyMat);
            s.rotation.x = Math.PI / 2;
            s.position.set(x, ROOF - 0.03, 0);
            ceilGroup.add(s);
        });

        // ---------- 3. lampade a campana appese al corrente inferiore
        const lampX = [-18, -11, -4, 3, 10, 17];
        const lampZ = [];
        for (let z = -36; z <= 36.01; z += 8) lampZ.push(z);
        const LAMP_Y = BOTC - 0.9;
        const nL = lampX.length * lampZ.length;
        const bell = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.4, 0.4, 14, 1, true), greyMat, nL);
        const face = new THREE.InstancedMesh(new THREE.CircleGeometry(0.38, 16).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfdfbf2, side: THREE.DoubleSide }), nL);
        const cables = [];
        let li = 0;
        lampX.forEach(x => lampZ.forEach(z => {
            tmpM.makeTranslation(x, LAMP_Y, z); bell.setMatrixAt(li, tmpM);
            tmpM.makeTranslation(x, LAMP_Y - 0.19, z); face.setMatrixAt(li, tmpM);
            cables.push([V(x, LAMP_Y + 0.2, z), V(x, BOTC, z), 0.015]);
            li++;
        }));
        bell.instanceMatrix.needsUpdate = true;
        face.instanceMatrix.needsUpdate = true;
        ceilGroup.add(bell, face, new THREE.Mesh(mergeBeamGeometry(cables), darkMat));
        if (!lowQ) {
            const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
            lampX.forEach((x, i) => lampZ.forEach((z, k) => {
                if ((i + k) % 2) return;
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xf6f8ff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(2.4, 2.4, 1);
                spr.position.set(x, LAMP_Y - 0.35, z);
                ceilGroup.add(spr);
            }));
        }
        // condotto dell'aria argentato lungo il lato est, sotto il reticolare
        const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, LEN - 8, lowQ ? 10 : 20), new THREE.MeshStandardMaterial({ color: 0xc4c9ce, roughness: 0.35, metalness: 0.7 }));
        duct.rotation.x = Math.PI / 2;
        duct.position.set(XE - 2.6, BOTC - 0.8, 0);
        ceilGroup.add(duct);
        const hangers = [];
        for (let z = -36; z <= 36.01; z += 6) hangers.push([V(XE - 2.6, BOTC - 0.3, z), V(XE - 2.6, BOTC, z), 0.04]);
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(hangers), darkMat));

        // ---------- 4. pareti in lamiera grecata bianca (fino alla copertura)
        const wallMat = (w, h) => new THREE.MeshStandardMaterial({ map: tex('wall_white.jpg', [w / 4, h / 4]), roughness: 0.8, side: THREE.DoubleSide });
        [[XE, -Math.PI / 2], [XW, Math.PI / 2]].forEach(([x, ry]) => flat(LEN, ROOF, wallMat(LEN, ROOF), x, ROOF / 2, 0, ry));
        [[-ZL, 0], [ZL, Math.PI]].forEach(([z, ry]) => flat(LX, ROOF, wallMat(LX, ROOF), XC, ROOF / 2, z, ry));
        // fasce di vetri colorati sulle testate (la nord ha il tabellone al centro, da index.html)
        const bandMat = winLit(tex('glass_bands.jpg'), 0.45);
        [-1, 1].forEach(sgn => {
            const z = sgn * (ZL - 0.05), ry = sgn < 0 ? 0 : Math.PI;
            [5.2, 7.6, 10.0].forEach((y, k) => flat(36 - k * 4, 1.15, bandMat, XC + 2, y, z, ry));
        });
        // porte di servizio e uscite sulle testate
        [-14, 16].forEach(x => { flat(2.2, 2.6, darkMat, x, 1.3, -ZL + 0.06, 0); flat(2.2, 2.6, darkMat, x, 1.3, ZL - 0.06, Math.PI); });

        // ---------- 5. cartelloni e striscione del club
        const ads = tex('wall_ads.png');
        const adsMat = new THREE.MeshStandardMaterial({ map: ads, transparent: true, alphaTest: 0.1, roughness: 0.75, emissive: 0xffffff, emissiveMap: ads, emissiveIntensity: 0.12, side: THREE.DoubleSide });
        flat(LX - 10, 0.95, adsMat, XC, 3.0, -ZL + 0.08, 0);
        flat(LX - 10, 0.95, adsMat, XC, 3.0, ZL - 0.08, Math.PI);
        flat(LEN - 12, 1.2, adsMat, XE - 0.08, 3.2, 0, -Math.PI / 2);
        flat(7.4, 2.8, lit(tex('banner_club.jpg'), 0.16), XE - 0.1, 7.0, 0, -Math.PI / 2);

        // ---------- 6. murale della parete ovest (segno distintivo del palazzetto): fondo grigio-lavanda,
        // colonne colorate "a equalizzatore", ellissi gialle, sagome di atleti, stemma di Tres Cantos e DEPORTE.
        // tutta la lunghezza della parete (84 m) e, con le proporzioni della texture (8:1), 10,5 m d'altezza da
        // 1 m dal pavimento fin quasi al reticolare; due metà da 4096 px (molte GPU dei telefoni non vanno oltre)
        const MUR_W = LEN, MUR_H = LEN / 8, MUR_Y = 1.0;
        [['mural_a.jpg', MUR_W / 4], ['mural_b.jpg', -MUR_W / 4]].forEach(([f, zc]) => {
            const t = tex(f);
            const m = new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.1, roughness: 0.85 });
            // guarda verso la pista (+x): la sinistra dell'immagine va verso +z
            flat(MUR_W / 2, MUR_H, m, XW + 0.05, MUR_Y + MUR_H / 2, zc, Math.PI / 2);
        });

        // ---------- 7. pubblico in piedi dietro le balaustre (il palazzetto non ha tribune)
        const outfits = [0xd71920, 0x141416, 0xf8fafc, 0x2b2e35, 0xd71920, 0x1e3a8a, 0x4b5563, 0xfacc15, 0x166534];
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
        const jitter = () => (Math.random() - 0.5) * 0.3;
        // lato ovest, davanti al murale (con rotation.y = 0 si guarda verso +x); al centro cronometristi e panche dei puniti
        for (let z = -30; z <= 30; z += 0.75) {
            if (Math.abs(z) < 7.6) continue;
            if (Math.random() < keep * 0.5) fan(-19.7 + jitter(), 0, z + jitter() * 0.6, 0, false);
            if (Math.random() < keep * 0.25) fan(-20.9 + jitter(), 0, z, 0, false);
        }
        // lato est, oltre le panchine
        for (let z = -30; z <= 30; z += 0.8) {
            if (Math.abs(z) < 17.5) continue;
            if (Math.random() < keep * 0.35) fan(19.8 + jitter(), 0, z + jitter() * 0.6, Math.PI, false);
        }
        // dietro le porte, girati verso la pista
        [-1, 1].forEach(sgn => {
            for (let x = -12; x <= 12; x += 0.8) {
                if (Math.random() < keep * 0.25) fan(x + jitter(), 0, sgn * (37.6 + Math.random() * 0.8), sgn > 0 ? Math.PI / 2 : -Math.PI / 2, false);
            }
        });
    }

    registerArenaBuilder('tres_cantos', buildTresCantosArchitecture);
})();
