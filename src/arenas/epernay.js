// Palazzetto "epernay": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // GYMNASE HENRI-VIET — ÉPERNAY (Marne), casa dei Bombardiers d'Épernay. Grande palestra con il controsoffitto
    // a pannelli gialli e verde petrolio a bande diagonali, a due falde basse, e le lunghe file di plafoniere
    // fluorescenti. Lato ovest (cronometristi): parete gialla con i controventi verdi dipinti a zig-zag, i pilastri
    // verde brillante, la fascia continua di finestre traslucide in alto (da qui entra il sole), i climatizzatori e
    // il tabellone; davanti, per tutta la lunghezza della pista, la tribuna a gradoni in doghe di legno chiaro su
    // telaio d'acciaio con la ringhiera in cima. Lato est (panchine) e testate verde scuro, con la fascia di
    // finestre alta, le tende divisorie raccolte e gli armadietti in legno; sulla testata sud gli stendardi bianchi
    // del club. Reti bianche raccolte appese sopra la tribuna. Pista a piastrelle azzurre con la riga centrale
    // rossa e le aree di porta arancioni, balaustre bianche con la ringhiera in tubo sui piedi rossi, niente vetro.
    // Altezze: controsoffitto da 12,4 m (gronda) a 13,6 m (colmo) e plafoniere a 12,1 m, sopra la telecamera
    // broadcast (11,6 m); con la vista dall'alto (13,2 m) il soffitto si nasconde.
    // Texture in assets/textures/epernay/ (tools/generate_epernay_textures.py).
    // =====================================================================
    function buildEpernayArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/epernay/';
        // sala più profonda sul lato ovest, dove c'è la tribuna dietro il tavolo dei cronometristi
        const XW = -25.5, XE = 23, ZL = 40, LX = XE - XW, LEN = 2 * ZL, XC = (XW + XE) / 2;
        const EAVE = 12.4, RIDGE = 13.6, WIN_B = 8.2, WIN_T = 11.4;
        const roofY = x => EAVE + (RIDGE - EAVE) * (1 - Math.abs(x - XC) / (LX / 2));
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);

        const limeSteel = new THREE.MeshStandardMaterial({ color: 0x5cae2e, roughness: 0.5, metalness: 0.3, emissive: 0x10220a });
        const greenPaint = new THREE.MeshStandardMaterial({ color: 0x1f6e3a, roughness: 0.75, side: THREE.DoubleSide });
        const greyMat = new THREE.MeshStandardMaterial({ color: 0x9a9ea4, roughness: 0.6, metalness: 0.4 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x26282c, roughness: 0.6, metalness: 0.3 });
        const plywood = new THREE.MeshStandardMaterial({ color: 0xc8a26a, roughness: 0.8 });
        const doorMat = new THREE.MeshStandardMaterial({ color: 0xd8c25a, roughness: 0.6 });
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
        // vetrate verso l'esterno: di giorno ci entra il sole (index.html, setupGenericDaylight)
        const winLit = (t, k) => { const m = lit(t, k); m.userData.sunWindow = true; return m; };
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: 12.0 };

        // ---------- 1. pavimento attorno alla pista: blu palestra, beige sotto la tribuna
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(LX, LEN), new THREE.MeshStandardMaterial({ color: 0x46698c, roughness: 0.6 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(XC, -0.01, 0);
        targetGroup.add(apron);
        const beige = new THREE.Mesh(new THREE.PlaneGeometry(-18.6 - XW, LEN), new THREE.MeshStandardMaterial({ color: 0xb8975a, roughness: 0.75 }));
        beige.rotation.x = -Math.PI / 2;
        beige.position.set((XW - 18.6) / 2, -0.005, 0);
        targetGroup.add(beige);

        // ---------- 2. controsoffitto a pannelli gialli e verde petrolio, a due falde, con le plafoniere
        const ceilMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'ceiling.jpg', { wrap: true }), roughness: 0.85, emissive: 0x2a2a14, side: THREE.DoubleSide });
        const quad = (pts, uvs, mat, parent) => {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
            g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            g.setIndex([0, 1, 2, 0, 2, 3]);
            g.computeVertexNormals();
            (parent || ceilGroup).add(new THREE.Mesh(g, mat));
        };
        const sl = Math.hypot(LX / 2, RIDGE - EAVE), TP = 7.2;   // la texture copre 7,2 m (6 pannelli)
        [XW, XE].forEach(xe => quad([xe, EAVE, -ZL, xe, EAVE, ZL, XC, RIDGE, ZL, XC, RIDGE, -ZL],
            [0, 0, LEN / TP, 0, LEN / TP, sl / TP, 0, sl / TP], ceilMat));
        // travi verdi sotto il controsoffitto (portali) e catene trasversali
        const beams = [];
        for (let z = -ZL + 4; z <= ZL - 3.99; z += 6) {
            beams.push([V(XW + 0.3, roofY(XW) - 0.25, z), V(XC, RIDGE - 0.25, z), 0.22], [V(XC, RIDGE - 0.25, z), V(XE - 0.3, roofY(XE) - 0.25, z), 0.22]);
            beams.push([V(XW + 0.3, EAVE - 0.4, z), V(XE - 0.3, EAVE - 0.4, z), 0.03]);
        }
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(beams), limeSteel));
        // plafoniere fluorescenti in lunghe file lungo la sala
        const stripFace = new THREE.MeshBasicMaterial({ color: 0xfffdf2, side: THREE.DoubleSide });
        const stripBody = new THREE.MeshStandardMaterial({ color: 0xd8dcdc, roughness: 0.5, metalness: 0.3 });
        const hangers = [];
        [-15, -7, 7, 15].forEach(x => {
            const y = roofY(x) - 0.55;
            box(0.36, 0.12, LEN - 8, stripBody, x, y, 0, ceilGroup);
            const f = new THREE.Mesh(new THREE.PlaneGeometry(0.26, LEN - 8.4), stripFace);
            f.rotation.x = Math.PI / 2;
            f.position.set(x, y - 0.065, 0);
            ceilGroup.add(f);
            for (let z = -ZL + 6; z <= ZL - 6; z += 8) hangers.push([V(x, y + 0.06, z), V(x, roofY(x), z), 0.012]);
        });
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(hangers), darkMat));
        // (niente canestri ripiegati al soffitto: starebbero davanti alla telecamera broadcast)

        // ---------- 3. parete ovest: gialla coi controventi verdi a zig-zag, finestre traslucide in alto
        const pillarZ = [];
        for (let z = -ZL; z <= ZL + 0.01; z += 8) pillarZ.push(z);
        const yellowMat = new THREE.MeshStandardMaterial({ map: tex('wall_yellow.jpg', [LEN / 4, WIN_B / 4]), roughness: 0.8, side: THREE.DoubleSide });
        flat(LEN, WIN_B, yellowMat, XW, WIN_B / 2, 0, Math.PI / 2);
        // fascia di finestre spezzata in vetrate da 8 m (una per campata): una fascia unica lunga 80 m verrebbe
        // presa per un lucernario dal giorno generico (setupGenericDaylight) e il sole non entrerebbe dalla parete
        const winBand = (x, ry, k) => {
            const m = winLit(loadFileTexture(T + 'window_band.jpg'), k);
            for (let z = -ZL; z < ZL - 0.01; z += 8) flat(8, WIN_T - WIN_B, m, x, (WIN_B + WIN_T) / 2, z + 4, ry);
        };
        winBand(XW, Math.PI / 2, 0.55);
        flat(LEN, EAVE - WIN_T + 0.2, greenPaint, XW, (WIN_T + EAVE + 0.2) / 2, 0, Math.PI / 2);
        // fasce verdi dipinte: in ogni campata una diagonale, alternate in modo da formare V e Λ
        for (let k = 0; k < pillarZ.length - 1; k++) {
            const z0 = pillarZ[k], z1 = pillarZ[k + 1];
            const y0 = 0.6, y1 = WIN_B - 0.3, len = Math.hypot(z1 - z0, y1 - y0);
            const st = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.55), greenPaint);
            st.position.set(XW + 0.03, (y0 + y1) / 2, (z0 + z1) / 2);
            st.rotation.y = Math.PI / 2;
            st.rotateZ((k % 2 ? 1 : -1) * Math.atan2(y1 - y0, z1 - z0));
            targetGroup.add(st);
        }
        // climatizzatori grigi sopra la tribuna (il tabellone lo mette index.html, a z = 2)
        const acGrill = new THREE.MeshStandardMaterial({ color: 0x55585c, roughness: 0.7 });
        [-28, -12, 18].forEach(z => {
            box(0.5, 1.0, 1.6, greyMat, XW + 0.3, 7.0, z);
            flat(1.4, 0.8, acGrill, XW + 0.56, 7.0, z, Math.PI / 2);
        });
        flat(5.2, 1.95, lit(tex('banner_club.jpg'), 0.15), XW + 0.05, 6.4, -20, Math.PI / 2);

        // ---------- 4. parete est (panchine) e testate: verde scuro, finestre alte, tende e armadietti
        const greenWall = (w, h) => new THREE.MeshStandardMaterial({ map: tex('wall_green.jpg', [w / 4, h / 4]), roughness: 0.8, side: THREE.DoubleSide });
        flat(LEN, WIN_B, greenWall(LEN, WIN_B), XE, WIN_B / 2, 0, -Math.PI / 2);
        winBand(XE, -Math.PI / 2, 0.5);
        flat(LEN, EAVE - WIN_T + 0.2, greenPaint, XE, (WIN_T + EAVE + 0.2) / 2, 0, -Math.PI / 2);
        [-36, 36].forEach(z => flat(1.6, 2.4, doorMat, XE - 0.04, 1.2, z, -Math.PI / 2));
        // tende divisorie verdi raccolte ai pilastri
        const curtainMat = new THREE.MeshStandardMaterial({ map: tex('curtain.jpg', [2, 1]), roughness: 0.9 });
        [-16, 16].forEach(z => {
            const c = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, WIN_T - 0.4, 14, 1, true), curtainMat);
            c.position.set(XE - 0.7, (WIN_T - 0.4) / 2 + 0.4, z);
            targetGroup.add(c);
        });
        // pilastri verde brillante su entrambi i lati e correnti delle finestre
        const pil = [];
        pillarZ.forEach(z => {
            pil.push([V(XE - 0.2, 0, z), V(XE - 0.2, EAVE, z), 0.3]);
            pil.push([V(XW + 0.2, 0, z), V(XW + 0.2, EAVE, z), 0.3]);
        });
        [XW + 0.12, XE - 0.12].forEach(x => pil.push([V(x, WIN_B, -ZL), V(x, WIN_B, ZL), 0.12], [V(x, WIN_T, -ZL), V(x, WIN_T, ZL), 0.12]));
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(pil), limeSteel));
        // testate a capanna
        const gable = new THREE.Shape();
        gable.moveTo(XW, 0); gable.lineTo(XE, 0); gable.lineTo(XE, EAVE); gable.lineTo(XC, RIDGE); gable.lineTo(XW, EAVE); gable.lineTo(XW, 0);
        const gableGeo = new THREE.ShapeGeometry(gable);
        const gp = gableGeo.attributes.position, gu = gableGeo.attributes.uv;
        for (let i = 0; i < gp.count; i++) gu.setXY(i, gp.getX(i) / 4, gp.getY(i) / 4);
        const endMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'wall_green.jpg', { wrap: true }), roughness: 0.8, side: THREE.DoubleSide });
        [-1, 1].forEach(sgn => {
            const e = new THREE.Mesh(gableGeo, endMat);
            e.position.z = sgn * ZL;
            targetGroup.add(e);
        });
        // armadietti in legno contro le testate
        const lockerMat = new THREE.MeshStandardMaterial({ map: tex('lockers.jpg'), roughness: 0.7 });
        const lockerSide = new THREE.MeshStandardMaterial({ color: 0x9a6e42, roughness: 0.7 });
        [-1, 1].forEach(sgn => {
            for (let x = -22; x <= 20.01; x += 2.05) {
                if (sgn > 0 && x > 4 && x < 9) continue;   // porta della testata sud
                const lk = new THREE.Mesh(new THREE.BoxGeometry(2, 2.2, 0.55), [lockerSide, lockerSide, lockerSide, lockerSide, sgn < 0 ? lockerMat : lockerSide, sgn > 0 ? lockerMat : lockerSide]);
                lk.position.set(x, 1.1, sgn * (ZL - 0.3));
                lk.rotation.y = sgn > 0 ? Math.PI : 0;
                targetGroup.add(lk);
            }
        });
        flat(3.2, 2.6, doorMat, 6.5, 1.3, ZL - 0.04, Math.PI);
        // testata sud: fila di stendardi bianchi del club; testata nord: striscione della città
        const pennMat = new THREE.MeshStandardMaterial({ map: tex('pennant.png'), transparent: true, alphaTest: 0.3, roughness: 0.85, side: THREE.DoubleSide });
        for (let k = 0; k < 7; k++) flat(1.0, 2.4, pennMat, -9 + k * 1.4, 7.0, ZL - 0.05, Math.PI);
        flat(16, 2.0, lit(tex('banner_city.jpg'), 0.15), XC, 6.6, -ZL + 0.05, 0);

        // ---------- 5. reti bianche: dietro le porte (dalle balaustre in su) e tende a rete raccolte sopra la tribuna
        const NET_H = 5.2;
        const netMat = new THREE.MeshBasicMaterial({ map: loadFileTexture(T + 'net.png', { repeat: [20 / 1.6, NET_H / 1.6] }), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.55 });
        [-1, 1].forEach(sgn => {
            flat(20, NET_H, netMat, 0, 1.15 + NET_H / 2, sgn * 36.2, 0);
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry([[V(-10, 1.15 + NET_H, sgn * 36.2), V(10, 1.15 + NET_H, sgn * 36.2), 0.03], [V(-10, 1.15 + NET_H, sgn * 36.2), V(-10, roofY(-10) - 0.3, sgn * 36.2), 0.01], [V(10, 1.15 + NET_H, sgn * 36.2), V(10, roofY(10) - 0.3, sgn * 36.2), 0.01]]), darkMat));
        });
        const bunchMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'net.png', { repeat: [3, 4] }), transparent: true, alphaTest: 0.15, side: THREE.DoubleSide, color: 0xf2ecdc, roughness: 0.9 });
        [-26, -18, 18, 26].forEach(z => {
            for (let k = 0; k < 3; k++) {
                const c = new THREE.Mesh(new THREE.ConeGeometry(0.5, 4.5, 10, 1, true), bunchMat);
                c.rotation.x = Math.PI;
                c.position.set(-22.4 + k * 0.5, roofY(-22) - 2.8 - k * 0.3, z + (k - 1) * 0.7);
                ceilGroup.add(c);
            }
        });

        // ---------- 6. ringhiera in tubo sui piedi rossi lungo la balaustra ovest, materiale agli angoli
        const railX = -18.75, railH = 1.3;
        const rail = [[V(railX, railH, -34), V(railX, railH, -4), 0.03], [V(railX, railH, 4), V(railX, railH, 34), 0.03]];
        const feet = [];
        for (let z = -34; z <= 34.01; z += 2) {
            if (Math.abs(z) < 4) continue;   // tavolo dei cronometristi
            rail.push([V(railX, 0.12, z), V(railX, railH, z), 0.025]);
            feet.push(z);
        }
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rail), greyMat));
        const footIM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.14, 0.5), new THREE.MeshStandardMaterial({ color: 0xc8202a, roughness: 0.6 }), feet.length);
        feet.forEach((z, i) => { tmpM.makeTranslation(railX - 0.1, 0.07, z); footIM.setMatrixAt(i, tmpM); });
        footIM.instanceMatrix.needsUpdate = true;
        targetGroup.add(footIM);
        const matBlue = new THREE.MeshStandardMaterial({ color: 0x2850a8, roughness: 0.8 });
        const redCrate = new THREE.MeshStandardMaterial({ color: 0xb81e26, roughness: 0.6 });
        [-1, 1].forEach(sgn => {
            const z0 = sgn * 37.6;
            box(1.6, 0.9, 1.2, plywood, -23.4, 0.45, z0);
            box(1.0, 0.3, 2.0, matBlue, -21.4, 0.15, z0);
            box(0.8, 0.45, 0.6, redCrate, -19.8, 0.22, z0 - 0.4 * sgn);
        });

        // ---------- 7. tribuna a gradoni in doghe di legno chiaro su telaio d'acciaio, lungo tutto il lato ovest
        const slatWood = new THREE.MeshStandardMaterial({ color: 0xc9a46c, roughness: 0.65 });
        const frameGrey = new THREE.MeshStandardMaterial({ color: 0x6a6e74, roughness: 0.5, metalness: 0.5 });
        const underDark = new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.9, side: THREE.DoubleSide });
        const seatSpots = [];
        const ST = 6, SD = 0.65, SH = 0.45, XB = XW + 0.4;    // 6 gradoni, l'ultimo contro la parete gialla
        const xTier = k => XB + (ST - k - 0.5) * SD;          // centro del gradone k (0 = in basso, verso la pista)
        const TZ = 34, topH = ST * SH;
        const frame = [];
        for (let k = 0; k < ST; k++) {
            const h = (k + 1) * SH, xc = xTier(k);
            // tre doghe per gradone, con le fessure in mezzo, e la fascia frontale
            for (let s = 0; s < 3; s++) box(SD / 3 - 0.04, 0.05, 2 * TZ, slatWood, xc - SD / 2 + (s + 0.5) * SD / 3, h - 0.025, 0);
            box(0.03, 0.14, 2 * TZ, slatWood, xc + SD / 2 - 0.015, h - 0.1, 0);
            for (let z = -TZ + 0.4; z <= TZ - 0.4; z += lowQ ? 0.62 : 0.52) seatSpots.push([xc + SD * 0.05, h, z]);
        }
        // telaio: cosciali inclinati e montanti ogni 4 m circa
        for (let z = -TZ + 0.1; z <= TZ; z += (2 * TZ - 0.2) / 17) {
            frame.push([V(xTier(0) + SD / 2, 0, z), V(XB, topH - 0.05, z), 0.06]);
            for (let k = 0; k < ST; k++) frame.push([V(xTier(k) - SD / 2 + 0.05, 0, z), V(xTier(k) - SD / 2 + 0.05, (k + 1) * SH - 0.05, z), 0.035]);
        }
        // ringhiera in cima (contro la parete) e sui due fianchi
        frame.push([V(XB + 0.1, topH + 1.0, -TZ), V(XB + 0.1, topH + 1.0, TZ), 0.03]);
        for (let z = -TZ; z <= TZ + 0.01; z += 2) frame.push([V(XB + 0.1, topH, z), V(XB + 0.1, topH + 1.0, z), 0.025]);
        [-TZ, TZ].forEach(z => frame.push([V(xTier(0) + SD / 2, SH + 0.9, z), V(XB + 0.1, topH + 1.0, z), 0.03], [V(xTier(0) + SD / 2, SH, z), V(xTier(0) + SD / 2, SH + 0.9, z), 0.03]));
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(frame), frameGrey));
        // fondo scuro sotto i gradoni (si vede fra le doghe e dai fianchi)
        flat(2 * TZ, topH, underDark, XB - 0.01, topH / 2, 0, Math.PI / 2);
        [-TZ, TZ].forEach(z => {
            const sh = new THREE.Shape();
            sh.moveTo(0, 0); sh.lineTo(ST * SD, 0); sh.lineTo(ST * SD, SH); sh.lineTo(0, topH); sh.lineTo(0, 0);
            const side = new THREE.Mesh(new THREE.ShapeGeometry(sh), underDark);
            side.position.set(XB, 0, z);
            targetGroup.add(side);
        });

        // ---------- 8. pubblico: tribuna ovest, in piedi alla ringhiera in tubo e lungo la parete est
        const outfits = [0x62b83a, 0x141416, 0xf8fafc, 0x141416, 0x62b83a, 0x2e7d4a, 0x4b5563, 0x2e62b8, 0x9ca3af, 0xd8c25a];
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
        // tribuna: seduti sui gradoni, guardano verso +x (la pista); più gente verso il centro
        seatSpots.forEach(([x, y, z]) => { if (Math.random() < keep * 0.5 * (1 - Math.abs(z) / 60)) fan(x, y + 0.02, z, 0, true); });
        // in piedi dietro la ringhiera in tubo, lontano dal tavolo
        for (let z = -32; z <= 32; z += 0.9) {
            if (Math.abs(z) < 5) continue;
            if (Math.random() < keep * 0.14) fan(railX - 0.8, 0, z, 0, false);
        }
        // in piedi lungo la parete est, oltre le panchine
        for (let z = -34; z <= 34; z += 0.9) {
            if (Math.abs(z) < 17.5) continue;
            if (Math.random() < keep * 0.18) fan(XE - 1.0, 0, z, Math.PI, false);
        }
    }

    registerArenaBuilder('epernay', buildEpernayArchitecture);
})();
