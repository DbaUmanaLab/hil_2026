// Palazzetto "arona": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // PABELLÓN MUNICIPAL DE DEPORTES DE LOS CRISTIANOS — ARONA (Tenerife), casa degli Arona Tenerife
    // Guanches. Copertura piana su un reticolare spaziale giallo con le lampade appese; vetrate alte sotto il
    // tetto sul lato ovest. Lato est (panchine): tribuna rialzata con i seggiolini rossi a guscio, dietro il
    // muretto blu con la ringhiera blu a cerchi e croci; alle spalle il corridoio con le colonne blu.
    // Lato ovest: zoccolatura grigio-lilla con la fascia scura, pareti bianche col filetto blu, otto pannelli
    // acustici verdi a labirinto e al centro il tabellone con lo striscione rosso. Testata nord con la scritta
    // ARONA / DEPORTES, testata sud con le aperture del piano superiore; reti bianche dietro le porte.
    // Altezze: le telecamere di gioco (broadcast 11,6 m, dall'alto 13,2 m) restano sotto il reticolare.
    // Texture in assets/textures/arona/ (tools/generate_arona_textures.py).
    // =====================================================================
    function buildAronaArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/arona/';
        const XW = -22, XE = 29.8, ZL = 39;                // pareti: ovest (pannelli verdi), est (dietro la tribuna), testate
        const XC = (XW + XE) / 2, LX = XE - XW, LEN = 2 * ZL;
        const ROOF = 15.4, TOPC = 15.1, BOTC = 13.6;        // lamiera, corrente superiore e inferiore del reticolare
        const LOW_H = 2.6;                                  // zoccolatura grigio-lilla dietro le balaustre
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);

        // giallo anche visto da sotto: un filo di autoilluminazione
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xf2c418, roughness: 0.45, metalness: 0.25, emissive: 0x4a3a06 });
        const greyMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.7 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x24272c, roughness: 0.5, metalness: 0.3 });
        const blueMat = new THREE.MeshStandardMaterial({ color: 0x1f3f95, roughness: 0.4, metalness: 0.2 });
        const railMat = new THREE.MeshStandardMaterial({ color: 0x2a56b8, roughness: 0.35, metalness: 0.4 });
        const tex = (f, rep) => loadFileTexture(T + f, rep ? { repeat: rep } : {});
        const flat = (w, h, mat, x, y, z, ry, parent) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
            m.position.set(x, y, z);
            m.rotation.y = ry || 0;
            (parent || targetGroup).add(m);
            return m;
        };
        const box = (w, h, d, mat, x, y, z) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            m.position.set(x, y, z);
            targetGroup.add(m);
            return m;
        };
        const lit = (t, k) => new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: k || 0.15, roughness: 0.8, side: THREE.DoubleSide });
        // vetrate e lucernari verso l'esterno: di giorno ci entra il sole (index.html, setupGenericDaylight)
        const winLit = (t, k) => { const m = lit(t, k); m.userData.sunWindow = true; return m; };
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: BOTC - 0.2 };

        // ---------- 1. pavimento attorno alla pista (stesso azzurro, più scuro)
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(LX, LEN), new THREE.MeshStandardMaterial({ color: 0x5f9cc8, roughness: 0.6 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(XC, -0.01, 0);
        targetGroup.add(apron);

        // ---------- 2. reticolare spaziale giallo (maglia superiore, inferiore sfalsata, diagonali a piramide)
        const G = lowQ ? 4.6 : 3.1;
        const nx = Math.floor(LX / G), nz = Math.floor(LEN / G);
        const x0 = XC - nx * G / 2, z0 = -nz * G / 2;
        const beams = [];
        for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
            const x = x0 + i * G, z = z0 + j * G;
            if (i < nx) beams.push([V(x, TOPC, z), V(x + G, TOPC, z), 0.12]);
            if (j < nz) beams.push([V(x, TOPC, z), V(x, TOPC, z + G), 0.12]);
        }
        for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
            const x = x0 + (i + 0.5) * G, z = z0 + (j + 0.5) * G;
            if (i < nx - 1) beams.push([V(x, BOTC, z), V(x + G, BOTC, z), 0.12]);
            if (j < nz - 1) beams.push([V(x, BOTC, z), V(x, BOTC, z + G), 0.12]);
            const h = G / 2;
            [[-h, -h], [h, -h], [-h, h], [h, h]].forEach(([dx, dz]) => beams.push([V(x, BOTC, z), V(x + dx, TOPC, z + dz), 0.08]));
        }
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(beams), frameMat));
        const deck = new THREE.Mesh(new THREE.PlaneGeometry(LX, LEN), new THREE.MeshStandardMaterial({ map: tex('roof_deck.jpg', [LX / 4, LEN / 4]), roughness: 0.75, metalness: 0.2, side: THREE.DoubleSide }));
        deck.rotation.x = Math.PI / 2;
        deck.position.set(XC, ROOF, 0);
        ceilGroup.add(deck);
        const skyMat = winLit(tex('clerestory.jpg', [LEN / 8, 1]), 0.5);
        [-12, 2, 16].forEach(x => {
            const s = new THREE.Mesh(new THREE.PlaneGeometry(2.2, LEN - 8), skyMat);
            s.rotation.x = Math.PI / 2;
            s.position.set(x, ROOF - 0.03, 0);
            ceilGroup.add(s);
        });
        // lampade industriali appese al corrente inferiore
        const lampX = [-16, -9, -2, 5, 12, 19];
        const lampZ = [];
        for (let z = -32; z <= 32.01; z += 8) lampZ.push(z);
        const LAMP_Y = BOTC - 0.8;
        const nL = lampX.length * lampZ.length;
        const bell = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.42, 0.42, 14, 1, true), greyMat, nL);
        const face = new THREE.InstancedMesh(new THREE.CircleGeometry(0.4, 16).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfdfbf2, side: THREE.DoubleSide }), nL);
        const cables = [];
        let li = 0;
        lampX.forEach(x => lampZ.forEach(z => {
            tmpM.makeTranslation(x, LAMP_Y, z); bell.setMatrixAt(li, tmpM);
            tmpM.makeTranslation(x, LAMP_Y - 0.2, z); face.setMatrixAt(li, tmpM);
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
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff8ea, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(2.4, 2.4, 1);
                spr.position.set(x, LAMP_Y - 0.35, z);
                ceilGroup.add(spr);
            }));
        }

        // ---------- 3. pareti: zoccolatura grigio-lilla con la fascia scura, intonaco bianco, filetto blu
        const whiteMat = (w, h) => new THREE.MeshStandardMaterial({ map: tex('wall_white.jpg', [w / 4, h / 4]), roughness: 0.85, side: THREE.DoubleSide });
        const lowMat = (w) => new THREE.MeshStandardMaterial({ map: tex('wall_low.jpg', [w / 4, 1]), roughness: 0.8, side: THREE.DoubleSide });
        const navyLine = new THREE.MeshStandardMaterial({ color: 0x14285e, roughness: 0.6, side: THREE.DoubleSide });
        const charcoal = new THREE.MeshStandardMaterial({ color: 0x2c2e34, roughness: 0.7, side: THREE.DoubleSide });
        const CLER0 = 12.4;                                  // vetrate alte sul lato ovest, fino al tetto
        // ovest
        flat(LEN, LOW_H, lowMat(LEN), XW + 0.02, LOW_H / 2, 0, Math.PI / 2);
        flat(LEN, 0.3, charcoal, XW + 0.03, LOW_H + 0.15, 0, Math.PI / 2);
        flat(LEN, CLER0 - LOW_H - 0.3, whiteMat(LEN, CLER0), XW, (CLER0 + LOW_H + 0.3) / 2, 0, Math.PI / 2);
        flat(LEN, 0.14, navyLine, XW + 0.03, CLER0 - 0.25, 0, Math.PI / 2);
        flat(LEN - 2, ROOF - CLER0, winLit(tex('clerestory.jpg', [LEN / 4, 1]), 0.55), XW + 0.02, (ROOF + CLER0) / 2, 0, Math.PI / 2);
        // testate
        [[-ZL, 0], [ZL, Math.PI]].forEach(([z, ry]) => {
            const dz = z < 0 ? 0.02 : -0.02;
            flat(LX, LOW_H, lowMat(LX), XC, LOW_H / 2, z + dz, ry);
            flat(LX, 0.3, charcoal, XC, LOW_H + 0.15, z + dz * 1.5, ry);
            flat(LX, ROOF - LOW_H - 0.3, whiteMat(LX, ROOF), XC, (ROOF + LOW_H + 0.3) / 2, z, ry);
            flat(LX, 0.14, navyLine, XC, CLER0 - 0.25, z + dz * 1.5, ry);
        });
        // est, sopra il corridoio della tribuna (la parete di fondo del corridoio è più indietro)
        const TRIB_BACK = 26.4, CORR_TOP = 7.5;
        flat(LEN, ROOF - CORR_TOP, whiteMat(LEN, ROOF), TRIB_BACK, (ROOF + CORR_TOP) / 2, 0, -Math.PI / 2);
        flat(LEN, 0.14, navyLine, TRIB_BACK - 0.03, CLER0 - 0.25, 0, -Math.PI / 2);
        flat(LEN, 0.22, navyLine, TRIB_BACK - 0.03, CORR_TOP + 0.11, 0, -Math.PI / 2);

        // ---------- 4. lato ovest: pannelli acustici verdi, tabellone (da index.html) e striscione rosso
        const greenA = new THREE.MeshStandardMaterial({ map: tex('green_panel_a.jpg'), roughness: 0.8 });
        const greenB = new THREE.MeshStandardMaterial({ map: tex('green_panel_b.jpg'), roughness: 0.8 });
        [6.8, 14.2, 21.6, 29.0].forEach((zc, k) => [-1, 1].forEach(sgn => {
            flat(6.4, 2.2, (k + (sgn > 0 ? 1 : 0)) % 2 ? greenA : greenB, XW + 0.06, 7.5, sgn * zc, Math.PI / 2);
        }));
        flat(1.1, 3.2, lit(tex('banner_red.jpg'), 0.12), XW + 0.06, 4.3, 0, Math.PI / 2);

        // ---------- 5. testata nord: ARONA / DEPORTES e il canestro alzato; testata sud: aperture del piano superiore
        const signMat = new THREE.MeshStandardMaterial({ map: tex('sign_arona.png'), transparent: true, alphaTest: 0.2, roughness: 0.7 });
        flat(13, 3.25, signMat, 0, 5.4, -ZL + 0.05, 0);
        const backboard = box(1.8, 1.05, 0.04, new THREE.MeshPhysicalMaterial({ color: 0xeef4f8, transparent: true, opacity: 0.45, roughness: 0.1 }), 0, 10.2, -ZL + 1.4);
        backboard.material.depthWrite = false;
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 6, 20), new THREE.MeshStandardMaterial({ color: 0xe5591a, roughness: 0.5 }));
        hoop.rotation.x = Math.PI / 2;
        hoop.position.set(0, 9.75, -ZL + 1.7);
        targetGroup.add(hoop);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry([[V(-0.6, 10.7, -ZL + 1.4), V(-0.6, BOTC, -ZL + 1.4), 0.06], [V(0.6, 10.7, -ZL + 1.4), V(0.6, BOTC, -ZL + 1.4), 0.06]]), darkMat));
        // sud: finestre scure e l'affaccio del piano superiore con la ringhiera
        const zS = ZL - 0.04;
        [[-15, 2.6], [12, 1.8], [17, 1.2]].forEach(([x, w]) => flat(w, 1.0, darkMat, x, 5.4, zS, Math.PI));
        flat(11, 2.2, new THREE.MeshStandardMaterial({ color: 0x9aa2aa, roughness: 0.8 }), -3, 5.3, zS, Math.PI);
        const gal = [[V(-8.5, 5.0, zS - 0.08), V(2.5, 5.0, zS - 0.08), 0.05], [V(-8.5, 4.3, zS - 0.08), V(2.5, 4.3, zS - 0.08), 0.04]];
        for (let x = -8.5; x <= 2.51; x += 1.1) gal.push([V(x, 4.2, zS - 0.08), V(x, 5.0, zS - 0.08), 0.03]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(gal), railMat));
        flat(6.4, 2.4, lit(tex('banner_club.jpg'), 0.15), 12, 9.0, zS - 0.02, Math.PI);

        // ---------- 6. reti bianche dietro le porte
        const netMat = new THREE.MeshBasicMaterial({ map: loadFileTexture(T + 'net.png', { repeat: [20 / 1.6, 3.4 / 1.6] }), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.7 });
        [-1, 1].forEach(sgn => {
            flat(20, 3.4, netMat, 0, 1.2 + 1.7, sgn * 36.15, 0);
            const c = [[V(-10, 4.6, sgn * 36.15), V(10, 4.6, sgn * 36.15), 0.03]];
            [-10, -5, 0, 5, 10].forEach(x => c.push([V(x, 1.1, sgn * 36.15), V(x, 4.6, sgn * 36.15), 0.05]));
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry(c), greyMat));
        });

        // ---------- 7. tribuna (est) dietro il muretto blu delle panchine: gradoni e seggiolini rossi a guscio
        const PAR_X = 21.15, PAR_H = 2.5, ZT0 = -33, ZT1 = 33, TL = ZT1 - ZT0;
        box(0.22, PAR_H, TL, blueMat, PAR_X, PAR_H / 2, 0);                         // muretto blu (dietro le panchine)
        box(0.34, 0.08, TL, blueMat, PAR_X + 0.06, PAR_H + 0.04, 0);               // copertina
        // ringhiera blu: correnti, montanti e, in ogni campata, un cerchio con la croce
        const RAIL_Y0 = PAR_H + 0.08, RAIL_Y1 = PAR_H + 1.05, PANEL = 1.3;
        const railBeams = [[V(PAR_X, RAIL_Y1, ZT0), V(PAR_X, RAIL_Y1, ZT1), 0.06], [V(PAR_X, RAIL_Y0 + 0.08, ZT0), V(PAR_X, RAIL_Y0 + 0.08, ZT1), 0.04]];
        const ringZ = [];
        for (let z = ZT0; z <= ZT1 + 0.01; z += PANEL) {
            railBeams.push([V(PAR_X, RAIL_Y0, z), V(PAR_X, RAIL_Y1, z), 0.045]);
            if (z + PANEL <= ZT1 + 0.01) {
                const zc = z + PANEL / 2, r = 0.34, yc = (RAIL_Y0 + RAIL_Y1) / 2;
                ringZ.push(zc);
                railBeams.push([V(PAR_X, yc - r * 0.7, zc - r * 0.7), V(PAR_X, yc + r * 0.7, zc + r * 0.7), 0.02]);
                railBeams.push([V(PAR_X, yc - r * 0.7, zc + r * 0.7), V(PAR_X, yc + r * 0.7, zc - r * 0.7), 0.02]);
            }
        }
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(railBeams), railMat));
        const rings = new THREE.InstancedMesh(new THREE.TorusGeometry(0.34, 0.018, 5, lowQ ? 16 : 24).rotateY(Math.PI / 2), railMat, ringZ.length);
        ringZ.forEach((zc, i) => { tmpM.makeTranslation(PAR_X, (RAIL_Y0 + RAIL_Y1) / 2, zc); rings.setMatrixAt(i, tmpM); });
        rings.instanceMatrix.needsUpdate = true;
        targetGroup.add(rings);
        // gradoni in cemento chiaro con la pedata color sabbia
        const TIERS = 6, STEP_D = 0.85, STEP_H = 0.42, BASE = 2.0, X0 = PAR_X + 0.12;
        const concrete = new THREE.MeshStandardMaterial({ color: 0xa9a49a, roughness: 0.9 });
        const tread = new THREE.MeshStandardMaterial({ color: 0xcdb48a, roughness: 0.8 });
        for (let k = 0; k < TIERS; k++) {
            const h = BASE + k * STEP_H, xa = X0 + k * STEP_D;
            box(STEP_D, h, TL, concrete, xa + STEP_D / 2, h / 2, 0);
            box(STEP_D, 0.03, TL, tread, xa + STEP_D / 2, h + 0.015, 0);
        }
        // seggiolini rossi a guscio: seduta e schienale (due InstancedMesh con le stesse posizioni)
        const SEAT_P = lowQ ? 0.62 : 0.52, aisles = [-22, -11, 0, 11, 22];
        const seatSpots = [];
        for (let k = 0; k < TIERS; k++) {
            const h = BASE + k * STEP_H, xs = X0 + k * STEP_D + 0.36;
            for (let z = ZT0 + 0.5; z <= ZT1 - 0.5; z += SEAT_P) {
                if (aisles.some(a => Math.abs(z - a) < 0.6)) continue;
                seatSpots.push([xs, h, z]);
            }
        }
        const redPlastic = new THREE.MeshStandardMaterial({ color: 0xdc2020, roughness: 0.28, metalness: 0.05 });
        const seatPan = new THREE.BoxGeometry(0.42, 0.07, 0.44).translate(0, 0.42, 0);
        const seatBack = new THREE.BoxGeometry(0.07, 0.42, 0.44).rotateZ(-0.2).translate(0.24, 0.66, 0);
        const seatLip = new THREE.BoxGeometry(0.06, 0.08, 0.44).translate(-0.2, 0.45, 0);
        const pans = new THREE.InstancedMesh(seatPan, redPlastic, seatSpots.length);
        const backs = new THREE.InstancedMesh(seatBack, redPlastic, seatSpots.length);
        const lips = new THREE.InstancedMesh(seatLip, redPlastic, seatSpots.length);
        seatSpots.forEach(([x, y, z], i) => {
            tmpM.makeTranslation(x, y, z);
            pans.setMatrixAt(i, tmpM); backs.setMatrixAt(i, tmpM); lips.setMatrixAt(i, tmpM);
        });
        [pans, backs, lips].forEach(m => { m.instanceMatrix.needsUpdate = true; targetGroup.add(m); });
        // corridoio alle spalle della tribuna: pavimento, soffitto, colonne blu e finestre sul fondo
        const corrY = BASE + TIERS * STEP_H;
        box(XE - TRIB_BACK, corrY, LEN, concrete, (TRIB_BACK + XE) / 2, corrY / 2, 0);
        box(XE - TRIB_BACK, 0.04, LEN, new THREE.MeshStandardMaterial({ color: 0x8a8580, roughness: 0.35, metalness: 0.1 }), (TRIB_BACK + XE) / 2, corrY + 0.02, 0);
        const soffit = new THREE.Mesh(new THREE.PlaneGeometry(XE - TRIB_BACK, LEN), new THREE.MeshStandardMaterial({ color: 0xeef0f0, roughness: 0.9, side: THREE.DoubleSide }));
        soffit.rotation.x = Math.PI / 2;
        soffit.position.set((TRIB_BACK + XE) / 2, CORR_TOP, 0);
        targetGroup.add(soffit);
        flat(LEN, CORR_TOP - corrY, whiteMat(LEN, CORR_TOP - corrY), XE, (CORR_TOP + corrY) / 2, 0, -Math.PI / 2);
        flat(LEN - 8, 2.2, winLit(tex('clerestory.jpg', [LEN / 4, 1]), 0.45), XE - 0.03, corrY + 1.6, 0, -Math.PI / 2);
        const cols = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, CORR_TOP - corrY, 0.45), blueMat, 10);
        for (let i = 0; i < 10; i++) { tmpM.makeTranslation(TRIB_BACK + 0.4, (CORR_TOP + corrY) / 2, -31.5 + i * 7); cols.setMatrixAt(i, tmpM); }
        cols.instanceMatrix.needsUpdate = true;
        targetGroup.add(cols);
        // chiusura sotto la tribuna, fra il muretto e la parete est, verso le testate
        [-1, 1].forEach(sgn => box(XE - PAR_X, corrY, 0.2, concrete, (PAR_X + XE) / 2, corrY / 2, sgn * (ZT1 + 0.1)));

        // ---------- 8. pubblico seduto sui seggiolini (guarda verso -x)
        const outfits = [0x1f6fd1, 0x6ec4f0, 0xf8fafc, 0x141416, 0x1f6fd1, 0xfacc15, 0x4b5563, 0xdc2626, 0x166534];
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
        seatSpots.forEach(([x, y, z], i) => {
            const k = Math.round((y - BASE) / STEP_H);
            // più gente nelle file basse e al centro, come nelle foto (tribuna mai piena)
            if (Math.random() < keep * (0.32 - k * 0.03) * (1 - Math.abs(z) / 55)) fan(x + 0.05, y + 0.04, z, Math.PI, true);
        });
    }

    registerArenaBuilder('arona', buildAronaArchitecture);
})();
