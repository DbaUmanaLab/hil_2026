// Palazzetto "vierzon": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // SALLE ENTREPOSE — VIERZON (Cher), casa dei Prédateurs de Vierzon. Vecchio capannone industriale: pareti in
    // mattoni a vista imbiancati e consumati, con le colature; lungo le pareti grandi murales in stile graffiti
    // (pupazzi colorati con gli occhioni, uccellini, mostri, lingue di fuoco, lettere a bolla). Pilastri reticolari
    // in acciaio scuro con la trave reticolare che corre lungo le pareti lunghe, capriate scure e copertura in
    // lamiera grigia con i lucernari (da qui entra il sole), file di fari tondi a LED. Sulla testata sud la vecchia
    // carroponte gialla, la serranda industriale e la cabina bianca sul soppalco con la ringhiera rossa.
    // Lato ovest (cronometristi): gradoni in cemento dietro le lastre di plexiglas, il tabellone e lo striscione
    // del club sopra il faccione giallo del murale. Lato est (panchine): tribunetta in legno dipinta di rosso con la
    // ringhiera rossa, gli striscioni appesi alla trave, la bandiera francese e il motto della città.
    // Pista a piastrelle grigio chiaro con le righe rosse; balaustre bianche col piede giallo e il bordo blu.
    // Altezze: correnti inferiori delle capriate a 12,4 m e fari a 12,1 m, sopra la telecamera broadcast
    // (11,6 m); con la vista dall'alto (13,2 m) il soffitto si nasconde.
    // Texture in assets/textures/vierzon/ (tools/generate_vierzon_textures.py).
    // =====================================================================
    function buildVierzonArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/vierzon/';
        const XW = -27.5, XE = 26, ZL = 42, LX = XE - XW, LEN = 2 * ZL, XC = (XW + XE) / 2;
        const WALL_H = 12.6, BOT = 12.4, EAVE = 13.0, RIDGE = 15.6;
        const roofY = x => EAVE + (RIDGE - EAVE) * (1 - Math.abs(x - XC) / (LX / 2));
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);

        const darkSteel = new THREE.MeshStandardMaterial({ color: 0x4a4e54, roughness: 0.55, metalness: 0.45 });
        const ochreSteel = new THREE.MeshStandardMaterial({ color: 0xb48a2c, roughness: 0.55, metalness: 0.35 });
        const redPaint = new THREE.MeshStandardMaterial({ color: 0xc8342a, roughness: 0.5, metalness: 0.2 });
        const greyMat = new THREE.MeshStandardMaterial({ color: 0x9a9ea4, roughness: 0.6, metalness: 0.4 });
        const concrete = new THREE.MeshStandardMaterial({ color: 0x8e8c88, roughness: 0.92 });
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
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: 12.0 };

        // ---------- 1. pavimento attorno alla pista (cemento grigio)
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(LX, LEN), new THREE.MeshStandardMaterial({ color: 0x6e6e6c, roughness: 0.85 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(XC, -0.01, 0);
        targetGroup.add(apron);

        // ---------- 2. pareti in mattoni a vista su tutti i lati
        const brickMat = (w, h) => {
            const m = new THREE.MeshStandardMaterial({ map: tex('brick.jpg', [w / 4, h / 4]), roughness: 0.92, side: THREE.DoubleSide });
            if (!lowQ) { m.normalMap = tex('brick_normal.jpg', [w / 4, h / 4]); m.normalScale = new THREE.Vector2(0.6, 0.6); }
            return m;
        };
        flat(LEN, WALL_H, brickMat(LEN, WALL_H), XW, WALL_H / 2, 0, Math.PI / 2);
        flat(LEN, WALL_H, brickMat(LEN, WALL_H), XE, WALL_H / 2, 0, -Math.PI / 2);
        const gable = new THREE.Shape();
        gable.moveTo(XW, 0); gable.lineTo(XE, 0); gable.lineTo(XE, EAVE); gable.lineTo(XC, RIDGE); gable.lineTo(XW, EAVE); gable.lineTo(XW, 0);
        const gableGeo = new THREE.ShapeGeometry(gable);
        const gp = gableGeo.attributes.position, gu = gableGeo.attributes.uv;
        for (let i = 0; i < gp.count; i++) gu.setXY(i, gp.getX(i) / 4, gp.getY(i) / 4);
        const endMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'brick.jpg', { wrap: true }), roughness: 0.92, side: THREE.DoubleSide });
        if (!lowQ) { endMat.normalMap = loadFileTexture(T + 'brick_normal.jpg', { wrap: true }); endMat.normalScale = new THREE.Vector2(0.6, 0.6); }
        [-1, 1].forEach(sgn => {
            const e = new THREE.Mesh(gableGeo, endMat);
            e.position.z = sgn * ZL;
            targetGroup.add(e);
        });

        // ---------- 3. murales (pannelli da 16 x 3 m dipinti sui mattoni)
        const muralMats = {};
        const muralMat = f => muralMats[f] || (muralMats[f] = new THREE.MeshStandardMaterial({ map: tex(f), roughness: 0.9 }));
        // ovest, dietro i gradoni: il faccione giallo cade dietro il tavolo dei cronometristi
        [['mural_a.jpg', -32], ['mural_c.jpg', -16], ['mural_b.jpg', 0], ['mural_a.jpg', 16], ['mural_c.jpg', 32]].forEach(([f, z]) => {
            const w = Math.min(16, ZL - 1 - Math.abs(z) + 8);
            const m = flat(w, 3.6, muralMat(f), XW + 0.03, 4.5, z, Math.PI / 2);
            if (w < 16) { m.material = m.material.clone(); m.material.map = m.material.map.clone(); m.material.map.repeat.set(w / 16, 1); m.material.map.needsUpdate = true; }
        });
        // est, sopra la tribunetta rossa
        [['mural_b.jpg', -26], ['mural_c.jpg', -9], ['mural_a.jpg', 24]].forEach(([f, z]) => flat(16, 3.6, muralMat(f), XE - 0.03, 4.5, z, -Math.PI / 2));
        // testate: murale nord e quello sotto il soppalco a sud
        flat(16, 3.6, muralMat('mural_c.jpg'), XC - 4, 3.8, -ZL + 0.03, 0);
        flat(14, 3, muralMat('mural_b.jpg'), 12, 1.6, ZL - 0.03, Math.PI);

        // ---------- 4. copertura: lamiera scura, lucernari lungo il colmo, capriate e fari tondi a LED
        const deckMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'roof_deck.jpg', { wrap: true }), roughness: 0.6, metalness: 0.35, emissive: 0x101216, side: THREE.DoubleSide });
        const quad = (pts, uvs, mat, parent) => {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
            g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            g.setIndex([0, 1, 2, 0, 2, 3]);
            g.computeVertexNormals();
            const m = new THREE.Mesh(g, mat);
            (parent || ceilGroup).add(m);
            return m;
        };
        const sl = Math.hypot(LX / 2, RIDGE - EAVE);
        [XW, XE].forEach(xe => quad([xe, EAVE, -ZL, xe, EAVE, ZL, XC, RIDGE, ZL, XC, RIDGE, -ZL], [0, 0, LEN / 4, 0, LEN / 4, sl / 4, 0, sl / 4], deckMat));
        // lastre traslucide: due file sulle falde, a pannelli da 4 m (di giorno ci entra il sole)
        const skyMat = lit(loadFileTexture(T + 'skylight.jpg'), 0.55);
        skyMat.userData.sunWindow = true;
        [-1, 1].forEach(s => {
            const xa = XC + s * 4.5, xb = XC + s * 7.5;
            for (let z = -ZL + 5; z < ZL - 5; z += 5.6) {
                quad([xa, roofY(xa) - 0.06, z, xa, roofY(xa) - 0.06, z + 4, xb, roofY(xb) - 0.06, z + 4, xb, roofY(xb) - 0.06, z], [0, 0, 1, 0, 1, 1, 0, 1], skyMat);
            }
        });
        // capriate ogni 7 m: corrente superiore lungo la falda, inferiore a 12,4 m, montanti e diagonali
        const beams = [];
        const trussZ = [];
        for (let z = -ZL + 3.5; z <= ZL - 3.49; z += 7) trussZ.push(z);
        const nP = 16, dxp = LX / nP;
        trussZ.forEach(z => {
            for (let i = 0; i < nP; i++) {
                const xa = XW + i * dxp, xb = xa + dxp;
                beams.push([V(xa, roofY(xa) - 0.12, z), V(xb, roofY(xb) - 0.12, z), 0.14]);
                beams.push([V(xa, BOT, z), V(xb, BOT, z), 0.12]);
                beams.push([V(xa, BOT, z), V(xa, roofY(xa) - 0.12, z), 0.05]);
                beams.push(i % 2 ? [V(xa, BOT, z), V(xb, roofY(xb) - 0.12, z), 0.05] : [V(xa, roofY(xa) - 0.12, z), V(xb, BOT, z), 0.05]);
            }
        });
        // arcarecci longitudinali e controventi a croce nelle campate di testa
        for (let i = 1; i < nP; i += 2) {
            const x = XW + i * dxp;
            beams.push([V(x, roofY(x) - 0.2, -ZL), V(x, roofY(x) - 0.2, ZL), 0.06]);
        }
        [-1, 1].forEach(sgn => {
            const z0 = sgn * trussZ[trussZ.length - 1], z1 = sgn * ZL;
            beams.push([V(XW, BOT, z0), V(XC, RIDGE - 0.2, z1), 0.03], [V(XE, BOT, z0), V(XC, RIDGE - 0.2, z1), 0.03]);
        });
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(beams), darkSteel));
        // fari tondi a LED appesi sotto le capriate
        const ledFace = new THREE.MeshBasicMaterial({ color: 0xfffcf0 });
        const ledBody = new THREE.MeshStandardMaterial({ color: 0x2c2e32, roughness: 0.5, metalness: 0.5 });
        const ledSpots = [];
        [-15, -5.5, 5.5, 15].forEach(x => trussZ.forEach((tz, k) => { if (k < trussZ.length - 1) ledSpots.push([x, (tz + trussZ[k + 1]) / 2]); }));
        const bodyIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.32, 0.38, 0.22, 16), ledBody, ledSpots.length);
        const faceIM = new THREE.InstancedMesh(new THREE.CircleGeometry(0.3, 18).rotateX(Math.PI / 2), ledFace, ledSpots.length);
        const hang = [];
        ledSpots.forEach(([x, z], i) => {
            tmpM.makeTranslation(x, 12.15, z); bodyIM.setMatrixAt(i, tmpM);
            tmpM.makeTranslation(x, 12.03, z); faceIM.setMatrixAt(i, tmpM);
            hang.push([V(x, 12.25, z), V(x, BOT, z), 0.015]);
        });
        bodyIM.instanceMatrix.needsUpdate = true;
        faceIM.instanceMatrix.needsUpdate = true;
        ceilGroup.add(bodyIM, faceIM, new THREE.Mesh(mergeBeamGeometry(hang), darkSteel));

        // ---------- 5. pilastri reticolari lungo le pareti lunghe e trave reticolare a 9-10 m
        const lattice = [];
        const tower = (x, z, inw, h) => {
            const x2 = x + inw * 0.55;
            lattice.push([V(x, 0, z - 0.25), V(x, h, z - 0.25), 0.06], [V(x, 0, z + 0.25), V(x, h, z + 0.25), 0.06],
                [V(x2, 0, z - 0.25), V(x2, h, z - 0.25), 0.06], [V(x2, 0, z + 0.25), V(x2, h, z + 0.25), 0.06]);
            for (let y = 0; y < h - 0.01; y += 0.9) {
                lattice.push([V(x2, y, z - 0.25), V(x2, y + 0.9, z + 0.25), 0.025], [V(x2, y + 0.9, z + 0.25), V(x2, y + 0.9, z - 0.25), 0.02]);
                lattice.push([V(x, y, z + 0.25), V(x2, y + 0.9, z + 0.25), 0.02], [V(x, y, z - 0.25), V(x2, y + 0.9, z - 0.25), 0.02]);
            }
        };
        const girder = (x, y0, y1) => {
            lattice.push([V(x, y0, -ZL), V(x, y0, ZL), 0.07], [V(x, y1, -ZL), V(x, y1, ZL), 0.07]);
            for (let z = -ZL; z < ZL - 0.01; z += 1.2) lattice.push([V(x, y0, z), V(x, y1, z + 1.2), 0.025], [V(x, y0, z), V(x, y1, z), 0.02]);
        };
        for (let z = -ZL + 3.5; z <= ZL - 3.49; z += 7) {
            tower(XW + 0.15, z, 1, BOT);
            tower(XE - 0.15, z, -1, BOT);
        }
        girder(XW + 0.5, 9.2, 10.2);
        girder(XE - 0.5, 9.2, 10.2);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(lattice), darkSteel));
        // vecchia carroponte gialla sulla testata sud: trave reticolare trasversale con le diagonali
        const ochre = [];
        const zc = ZL - 4.5;
        [zc - 0.5, zc + 0.5].forEach(z => {
            ochre.push([V(XW + 0.6, 9.6, z), V(XE - 0.6, 9.6, z), 0.09], [V(XW + 0.6, 11.2, z), V(XE - 0.6, 11.2, z), 0.09]);
            for (let x = XW + 0.6; x < XE - 0.6 - 0.01; x += 1.6) ochre.push([V(x, 9.6, z), V(x + 1.6, 11.2, z), 0.035], [V(x, 9.6, z), V(x, 11.2, z), 0.03]);
        });
        [XW + 0.6, XE - 0.6].forEach(x => ochre.push([V(x, 9.6, zc - 0.5), V(x, 9.6, zc + 0.5), 0.08], [V(x, 7.2, ZL - 0.2), V(x, 9.6, zc), 0.07]));
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(ochre), ochreSteel));

        // ---------- 6. testata sud: serranda industriale e cabina bianca sul soppalco con la ringhiera rossa
        flat(9, 6.5, new THREE.MeshStandardMaterial({ map: tex('shutter.jpg', [1, 1.3]), roughness: 0.6, metalness: 0.3 }), -14, 3.25, ZL - 0.05, Math.PI);
        box(9.4, 0.35, 0.4, darkSteel, -14, 6.6, ZL - 0.25);
        const MZ_Y = 4.2, MX0 = 6, MX1 = 20, MZ0 = ZL - 4.2;
        box(MX1 - MX0, 0.25, ZL - MZ0, concrete, (MX0 + MX1) / 2, MZ_Y - 0.12, (MZ0 + ZL) / 2);
        const mzSteel = [];
        [MX0 + 0.2, (MX0 + MX1) / 2, MX1 - 0.2].forEach(x => mzSteel.push([V(x, 0, MZ0 + 0.2), V(x, MZ_Y, MZ0 + 0.2), 0.1]));
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(mzSteel), darkSteel));
        const cabinW = new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.7 });
        box(6, 3, 3.2, cabinW, MX1 - 3.4, MZ_Y + 1.5, ZL - 1.7);
        const winM = new THREE.MeshStandardMaterial({ color: 0x3c4650, roughness: 0.2, metalness: 0.3, emissive: 0x1a2028 });
        for (let k = 0; k < 4; k++) flat(1.0, 1.2, winM, MX1 - 5.8 + k * 1.4, MZ_Y + 1.8, ZL - 3.32, Math.PI);
        flat(1.0, 2.1, new THREE.MeshStandardMaterial({ color: 0xd8b070, roughness: 0.6 }), MX1 - 6.6, MZ_Y + 1.05, ZL - 2.0, Math.PI / 2);
        const rr = [[V(MX0, MZ_Y + 1.05, MZ0), V(MX1, MZ_Y + 1.05, MZ0), 0.05], [V(MX0, MZ_Y + 0.55, MZ0), V(MX1, MZ_Y + 0.55, MZ0), 0.035], [V(MX0, MZ_Y + 1.05, MZ0), V(MX0, MZ_Y + 1.05, ZL), 0.05]];
        for (let x = MX0; x <= MX1 + 0.01; x += 1.4) rr.push([V(x, MZ_Y, MZ0), V(x, MZ_Y + 1.05, MZ0), 0.035]);
        // scala d'accesso con il corrimano rosso
        for (let k = 0; k < 14; k++) box(1.1, 0.06, 0.3, greyMat, MX0 - 0.7, (k + 1) * MZ_Y / 14, ZL - 0.4 - k * 0.3);
        rr.push([V(MX0 - 1.25, 1.0, ZL - 0.4), V(MX0 - 1.25, MZ_Y + 1.0, ZL - 4.3), 0.04], [V(MX0 - 0.15, 1.0, ZL - 0.4), V(MX0 - 0.15, MZ_Y + 1.0, ZL - 4.3), 0.04]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rr), redPaint));

        // ---------- 7. lato ovest: lastre di plexiglas sopra la pista e gradoni in cemento con la ringhiera
        const plexi = new THREE.MeshPhysicalMaterial({ color: 0xe4eef2, transparent: true, opacity: 0.18, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
        const PX = -20.7, PH = 2.6;
        const plexiPosts = [];
        [[-35.5, -4.2], [4.2, 35.5]].forEach(([z0, z1]) => {
            flat(z1 - z0, PH, plexi, PX, PH / 2, (z0 + z1) / 2, Math.PI / 2);
            for (let z = z0; z <= z1 + 0.01; z += (z1 - z0) / Math.round((z1 - z0) / 2)) plexiPosts.push([V(PX, 0, z), V(PX, PH, z), 0.03]);
            plexiPosts.push([V(PX, PH, z0), V(PX, PH, z1), 0.03]);
        });
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(plexiPosts), darkSteel));
        const TS = 4, TD = 0.8, TH = 0.42, TX0 = -21.2;      // gradoni da 42 cm verso la parete, poi il ripiano
        const terraceSpots = [];
        for (let k = 0; k < TS; k++) {
            const h = (k + 1) * TH, xf = TX0 - k * TD;
            box(TD, h, 2 * 36, concrete, xf - TD / 2, h / 2, 0);
            for (let z = -35.4; z <= 35.4; z += lowQ ? 0.7 : 0.58) if (Math.abs(z) > 3.4 || k > 1) terraceSpots.push([xf - TD * 0.5, h, z]);
        }
        const TOP_X = TX0 - TS * TD, TOP_H = TS * TH;
        box(TOP_X - XW, TOP_H, 2 * 36, concrete, (XW + TOP_X) / 2, TOP_H / 2, 0);
        const tRail = [[V(TOP_X + 0.1, TOP_H + 1.0, -36), V(TOP_X + 0.1, TOP_H + 1.0, 36), 0.035]];
        for (let z = -36; z <= 36.01; z += 2) tRail.push([V(TOP_X + 0.1, TOP_H, z), V(TOP_X + 0.1, TOP_H + 1.0, z), 0.025]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(tRail), greyMat));
        // striscione del club sotto il tabellone (il tabellone lo mette index.html, a z = 0)
        flat(5.2, 1.5, lit(tex('banner_club.jpg')), XW + 0.06, 6.5, 0, Math.PI / 2);

        // ---------- 8. lato est: tribunetta in legno dipinta di rosso con la ringhiera rossa
        const redWood = new THREE.MeshStandardMaterial({ color: 0xb8402e, roughness: 0.7 });
        const redWoodDark = new THREE.MeshStandardMaterial({ color: 0x8e2e22, roughness: 0.75 });
        const BS = 4, BD = 0.85, BH = 0.45, BX0 = 21.8;
        const benchSpots = [];
        for (let k = 0; k < BS; k++) {
            const h = (k + 1) * BH, xf = BX0 + k * BD;
            box(BD, 0.06, 2 * 34, redWood, xf + BD / 2, h - 0.03, 0);
            box(0.04, BH, 2 * 34, redWoodDark, xf + 0.02, h - BH / 2, 0);
            for (let z = -33.6; z <= 33.6; z += lowQ ? 0.62 : 0.52) benchSpots.push([xf + BD * 0.5, h, z]);
        }
        const bTop = BS * BH, bBack = BX0 + BS * BD;
        box(XE - bBack, bTop, 2 * 34, redWoodDark, (bBack + XE) / 2, bTop / 2, 0);
        const bRail = [[V(BX0 + 0.1, BH + 1.0, -34), V(BX0 + 0.1, BH + 1.0, -16), 0.045], [V(BX0 + 0.1, BH + 1.0, 16), V(BX0 + 0.1, BH + 1.0, 34), 0.045]];
        [-34, 34].forEach(z => bRail.push([V(BX0, BH + 1.0, z), V(bBack, bTop + 1.0, z), 0.045], [V(BX0, BH, z), V(BX0, BH + 1.0, z), 0.04]));
        for (let z = -34; z <= 34.01; z += 2) if (Math.abs(z) >= 16) bRail.push([V(BX0 + 0.1, BH, z), V(BX0 + 0.1, BH + 1.0, z), 0.035]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(bRail), redPaint));

        // ---------- 9. striscioni appesi alla trave reticolare, bandiera francese e motto della città
        const bannerMats = [1, 2, 3, 4, 5].map(k => lit(tex(`banner_${k}.jpg`)));
        [[XE - 0.6, -Math.PI / 2, [-30, -17, -4, 9, 22]], [XW + 0.6, Math.PI / 2, [-30, -18, 18, 30]]].forEach(([x, ry, zs], si) => {
            zs.forEach((z, k) => flat(3.6, 1.12, bannerMats[(k + si * 2) % 5], x, 8.5, z, ry));
        });
        const flag = flat(3.2, 2.1, new THREE.MeshStandardMaterial({ map: tex('flag_france.jpg'), roughness: 0.85, side: THREE.DoubleSide }), XE - 0.7, 7.8, 31, -Math.PI / 2);
        flag.rotation.z = 0.04;
        flat(7.2, 1.8, lit(tex('banner_motto.jpg')), XE - 0.05, 6.4, 33, -Math.PI / 2);

        // ---------- 10. plexiglas dietro le porte, sopra le balaustre
        const goalPlexi = [];
        [-1, 1].forEach(sgn => {
            flat(22, 2.2, plexi, 0, 1.15 + 1.1, sgn * 36.15, 0);
            for (let x = -11; x <= 11.01; x += 2.2) goalPlexi.push([V(x, 1.15, sgn * 36.15), V(x, 3.35, sgn * 36.15), 0.025]);
            goalPlexi.push([V(-11, 3.35, sgn * 36.15), V(11, 3.35, sgn * 36.15), 0.025]);
        });
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(goalPlexi), darkSteel));

        // ---------- 11. pubblico: gradoni ovest, tribunetta rossa est, ringhiera del soppalco
        const outfits = [0xd81e2a, 0x141416, 0xf8fafc, 0x141416, 0xd81e2a, 0xe0197a, 0x4b5563, 0x2e62b8, 0x9ca3af, 0x6b4226];
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
        // gradoni ovest: in piedi o seduti sul cemento, guardano verso +x
        terraceSpots.forEach(([x, y, z]) => { if (Math.random() < keep * 0.4 * (1 - Math.abs(z) / 70)) fan(x, y, z, 0, Math.random() < 0.55); });
        for (let z = -35; z <= 35; z += 0.8) if (Math.random() < keep * 0.22) fan(TOP_X - 0.5, TOP_H, z, 0, false);
        // tribunetta rossa est: seduti, guardano verso -x
        benchSpots.forEach(([x, y, z]) => { if (Math.random() < keep * 0.42 * (1 - Math.abs(z) / 70)) fan(x, y + 0.02, z, Math.PI, true); });
        // soppalco sud: qualcuno alla ringhiera
        for (let x = MX0 + 0.6; x <= MX1 - 7; x += 0.9) if (Math.random() < keep * 0.5) fan(x, MZ_Y, MZ0 + 0.5, Math.PI / 2, false);   // guardano verso -z
    }

    registerArenaBuilder('vierzon', buildVierzonArchitecture);
})();
