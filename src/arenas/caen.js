// Palazzetto "caen": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // HALLE DES GRANGES — CAEN (Calvados), casa dei Conquérants de Caen. Capannone con le capriate reticolari
    // bianche e la lamiera grigio-azzurra, al colmo una lanterna vetrata che corre lungo tutta la sala; lunghe
    // file di lampade lineari. Pareti in blocchi verniciati di bianco con le finestre in legno in alto e le porte
    // rosse; sulla parete est la bandiera della Normandia, la scritta "Les Conquérants" e il tabellone. Testata
    // nord color pesca con le due finestre ad arco, lo striscione rosso CAEN e una piccola tribuna coi seggiolini
    // rossi; lato ovest (cronometristi) il ballatoio rialzato con le panche di legno e la ringhiera. Reti scure
    // dietro le porte. Pavimento azzurro con le righe rosse e nere, balaustre basse bianche, niente vetro.
    // Altezze: correnti inferiori delle capriate a 12,2 m e lampade a 12 m, sopra la telecamera broadcast
    // (11,6 m); con la vista dall'alto (13,2 m) il soffitto si nasconde.
    // Texture in assets/textures/caen/ (tools/generate_caen_textures.py).
    // =====================================================================
    function buildCaenArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/caen/';
        const XW = -24, XE = 24, ZL = 40, LX = XE - XW, LEN = 2 * ZL;
        const WALL_H = 10.5, BOT = 12.2, EAVE_TOP = 13.2, TOP = 14.6, LANT = 6, LANT_H = 16.4;   // capriate e lanterna (|x| < 6)
        const roofY = x => Math.abs(x) <= LANT ? TOP : EAVE_TOP + (TOP - EAVE_TOP) * (1 - (Math.abs(x) - LANT) / (LX / 2 - LANT));
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);

        const steelWhite = new THREE.MeshStandardMaterial({ color: 0xeceeee, roughness: 0.5, metalness: 0.3, emissive: 0x26282a });
        const greyMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.6, metalness: 0.4 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x26282c, roughness: 0.6, metalness: 0.3 });
        const redDoor = new THREE.MeshStandardMaterial({ color: 0xc41e24, roughness: 0.5 });
        const wood = new THREE.MeshStandardMaterial({ color: 0x9a6a3e, roughness: 0.65 });
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

        // ---------- 1. pavimento attorno alla pista (stesso azzurro, più scuro)
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(LX, LEN), new THREE.MeshStandardMaterial({ color: 0x4f86b0, roughness: 0.6 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.y = -0.01;
        targetGroup.add(apron);

        // ---------- 2. copertura: lamiera sulle falde basse, lanterna vetrata al colmo, capriate reticolari bianche
        const deckMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'roof_deck.jpg', { wrap: true }), roughness: 0.6, metalness: 0.25, emissive: 0x18202a, side: THREE.DoubleSide });
        const quad = (pts, uvs, mat) => {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
            g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            g.setIndex([0, 1, 2, 0, 2, 3]);
            g.computeVertexNormals();
            ceilGroup.add(new THREE.Mesh(g, mat));
        };
        const sl = Math.hypot(LX / 2 - LANT, TOP - EAVE_TOP);
        [-1, 1].forEach(s => {
            quad([s * LX / 2, EAVE_TOP + 0.05, -ZL, s * LX / 2, EAVE_TOP + 0.05, ZL, s * LANT, TOP + 0.05, ZL, s * LANT, TOP + 0.05, -ZL],
                [0, 0, LEN / 4, 0, LEN / 4, sl / 4, 0, sl / 4], deckMat);
            // fianchi vetrati della lanterna
            const sky = winLit(loadFileTexture(T + 'skylight.jpg', { wrap: true }), 0.7);
            quad([s * LANT, TOP, -ZL, s * LANT, TOP, ZL, s * LANT, LANT_H, ZL, s * LANT, LANT_H, -ZL], [0, 0, LEN / 4, 0, LEN / 4, 1, 0, 1], sky);
        });
        const lanternTop = winLit(loadFileTexture(T + 'skylight.jpg', { wrap: true }), 0.6);
        quad([-LANT, LANT_H, -ZL, -LANT, LANT_H, ZL, LANT, LANT_H, ZL, LANT, LANT_H, -ZL], [0, 0, LEN / 4, 0, LEN / 4, 2 * LANT / 4, 0, 2 * LANT / 4], lanternTop);
        const trussZ = [];
        for (let z = -ZL + 2; z <= ZL - 1.99; z += 6) trussZ.push(z);
        const beams = [];
        const nP = 16, dxp = LX / nP;
        trussZ.forEach(z => {
            for (let i = 0; i < nP; i++) {
                const xa = XW + i * dxp, xb = xa + dxp;
                beams.push([V(xa, roofY(xa) - 0.1, z), V(xb, roofY(xb) - 0.1, z), 0.16]);         // corrente superiore
                beams.push([V(xa, BOT, z), V(xb, BOT, z), 0.14]);                                // corrente inferiore
                beams.push([V(xa, BOT, z), V(xa, roofY(xa) - 0.1, z), 0.06]);
                beams.push(i % 2 ? [V(xa, BOT, z), V(xb, roofY(xb) - 0.1, z), 0.06] : [V(xa, roofY(xa) - 0.1, z), V(xb, BOT, z), 0.06]);
            }
            // telaio della lanterna sopra la capriata
            beams.push([V(-LANT, TOP, z), V(-LANT, LANT_H, z), 0.12], [V(LANT, TOP, z), V(LANT, LANT_H, z), 0.12], [V(-LANT, LANT_H - 0.1, z), V(LANT, LANT_H - 0.1, z), 0.12]);
            // mensole sui pilastri delle pareti
            [XW, XE].forEach(x => beams.push([V(x + Math.sign(-x) * 0.2, WALL_H, z), V(x + Math.sign(-x) * 0.2, roofY(x), z), 0.3]));
        });
        // travi reticolari longitudinali sotto le capriate, in mezzo e ai lati della lanterna
        [-LANT, LANT].forEach(x => {
            beams.push([V(x, BOT, -ZL), V(x, BOT, ZL), 0.12], [V(x, BOT + 1.2, -ZL), V(x, BOT + 1.2, ZL), 0.1]);
            for (let z = -ZL; z < ZL; z += 3) beams.push([V(x, BOT, z), V(x, BOT + 1.2, z + 3), 0.05]);
        });
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(beams), steelWhite));
        // lunghe file di lampade lineari (corpo bianco, faccia luminosa) appese alle capriate
        const stripFace = new THREE.MeshBasicMaterial({ color: 0xfffbea, side: THREE.DoubleSide });
        const stripBody = new THREE.MeshStandardMaterial({ color: 0x8eb4d8, roughness: 0.5, metalness: 0.3 });
        const hangers = [];
        [-14, -6, 6, 14].forEach(x => {
            for (let k = 0; k < trussZ.length - 1; k++) {
                const z = (trussZ[k] + trussZ[k + 1]) / 2;
                box(0.5, 0.12, 5.0, stripBody, x, 12.0, z, ceilGroup);
                const f = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 4.8), stripFace);
                f.rotation.x = Math.PI / 2;
                f.position.set(x, 11.935, z);
                ceilGroup.add(f);
                hangers.push([V(x, 12.06, z - 2), V(x, BOT, z - 2), 0.015], [V(x, 12.06, z + 2), V(x, BOT, z + 2), 0.015]);
            }
        });
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(hangers), darkMat));

        // ---------- 3. pareti: blocchi bianchi fino alla gronda, finestre in legno in alto, porte rosse in basso
        const whiteMat = (w, h) => new THREE.MeshStandardMaterial({ map: tex('wall_white.jpg', [w / 4, h / 4]), roughness: 0.8, side: THREE.DoubleSide });
        const winMat = winLit(tex('window_wood.jpg'), 0.35);
        [[XE, -Math.PI / 2, -1], [XW, Math.PI / 2, 1]].forEach(([x, ry, inw]) => {
            flat(LEN, EAVE_TOP, whiteMat(LEN, EAVE_TOP), x, EAVE_TOP / 2, 0, ry);
            for (let z = -30; z <= 30.01; z += 7.5) flat(1.6, 1.3, winMat, x + inw * 0.03, 7.4, z, ry);
            [-26, -12, 22].forEach(z => flat(1.4, 2.4, redDoor, x + inw * 0.03, 1.2, z, ry));
        });
        // testate: nord color pesca con le finestre ad arco, sud in blocchi bianchi; frontone fino alla copertura
        const gable = new THREE.Shape();
        gable.moveTo(XW, 0); gable.lineTo(XE, 0); gable.lineTo(XE, EAVE_TOP); gable.lineTo(LANT, TOP); gable.lineTo(LANT, LANT_H); gable.lineTo(-LANT, LANT_H); gable.lineTo(-LANT, TOP); gable.lineTo(XW, EAVE_TOP); gable.lineTo(XW, 0);
        const gableGeo = new THREE.ShapeGeometry(gable);
        const gp = gableGeo.attributes.position, gu = gableGeo.attributes.uv;
        for (let i = 0; i < gp.count; i++) gu.setXY(i, gp.getX(i) / 4, gp.getY(i) / 4);
        const north = new THREE.Mesh(gableGeo, new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'wall_peach.jpg', { wrap: true }), roughness: 0.85, side: THREE.DoubleSide }));
        north.position.z = -ZL;
        targetGroup.add(north);
        const south = new THREE.Mesh(gableGeo, new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'wall_white.jpg', { wrap: true }), roughness: 0.8, side: THREE.DoubleSide }));
        south.position.z = ZL;
        targetGroup.add(south);
        const archMat = new THREE.MeshStandardMaterial({ map: tex('window_arch.png'), transparent: true, alphaTest: 0.3, roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.55 });
        archMat.emissiveMap = archMat.map;
        archMat.userData.sunWindow = true;
        [-3.2, 3.2].forEach(x => flat(5.6, 4.2, archMat, x, 9.2, -ZL + 0.04, 0));
        flat(22, 1.8, lit(tex('banner_city.jpg'), 0.15), 0, 5.4, -ZL + 0.05, 0);
        [-16, -12.5, 14].forEach(x => flat(1.6, 2.4, redDoor, x, 1.2, -ZL + 0.04, 0));
        // sud: grande porta rossa scorrevole e striscione del club
        flat(5.5, 4.2, redDoor, -6, 2.1, ZL - 0.04, Math.PI);
        flat(5.2, 1.95, lit(tex('banner_club.jpg'), 0.15), 10, 5.6, ZL - 0.05, Math.PI);
        // est: bandiera della Normandia, scritta "Les Conquérants" (il tabellone lo mette index.html)
        const flag = flat(3.6, 2.5, new THREE.MeshStandardMaterial({ map: tex('flag_normandie.jpg'), roughness: 0.85, side: THREE.DoubleSide }), XE - 0.6, 6.4, 12, -Math.PI / 2);
        flag.rotation.z = 0.06;
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry([[V(XE - 0.05, 7.6, 10.4), V(XE - 0.6, 7.7, 13.9), 0.04]]), darkMat));
        flat(6, 2, new THREE.MeshStandardMaterial({ map: tex('mural.png'), transparent: true, alphaTest: 0.2, roughness: 0.85 }), XE - 0.05, 5.0, -16, -Math.PI / 2);

        // ---------- 4. reti scure dietro le porte, dalle balaustre fin sotto le capriate
        const NET_H = 6.2;
        const netMat = new THREE.MeshBasicMaterial({ map: loadFileTexture(T + 'net.png', { repeat: [24 / 1.6, NET_H / 1.6] }), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.7 });
        [-1, 1].forEach(sgn => {
            flat(24, NET_H, netMat, 0, 1.15 + NET_H / 2, sgn * 36.2, 0);
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry([[V(-12, 1.15 + NET_H, sgn * 36.2), V(12, 1.15 + NET_H, sgn * 36.2), 0.03]]), darkMat));
        });

        // ---------- 5. tribunetta coi seggiolini rossi sotto la testata nord e ballatoio con le panche a ovest
        const concrete = new THREE.MeshStandardMaterial({ color: 0xa29e96, roughness: 0.9 });
        const redSeat = new THREE.MeshStandardMaterial({ color: 0xc8202a, roughness: 0.35 });
        const seatSpots = [];
        const NZ0 = -37.2, NT = 4, ND = 0.7, NH = 0.4, NW = 22;   // ultima fila contro la testata (z = -40)
        for (let k = 0; k < NT; k++) {
            const h = (k + 1) * NH, zf = NZ0 - k * ND;
            box(NW, h, ND, k % 2 ? wood : concrete, 0, h / 2, zf - ND / 2);
            for (let x = -NW / 2 + 0.5; x <= NW / 2 - 0.5; x += lowQ ? 0.62 : 0.52) seatSpots.push([x, h, zf - ND * 0.55]);
        }
        const seatPan = new THREE.BoxGeometry(0.44, 0.07, 0.42).translate(0, 0.42, 0);
        const seatBack = new THREE.BoxGeometry(0.44, 0.38, 0.07).rotateX(-0.18).translate(0, 0.64, -0.22);
        const pans = new THREE.InstancedMesh(seatPan, redSeat, seatSpots.length), backs = new THREE.InstancedMesh(seatBack, redSeat, seatSpots.length);
        seatSpots.forEach(([x, y, z], i) => { tmpM.makeTranslation(x, y, z); pans.setMatrixAt(i, tmpM); backs.setMatrixAt(i, tmpM); });
        pans.instanceMatrix.needsUpdate = true;
        backs.instanceMatrix.needsUpdate = true;
        targetGroup.add(pans, backs);
        // ballatoio ovest: piano rialzato con la ringhiera e le panche di legno contro il muro
        const GAL_X = -21.4, GAL_H = 0.9, ZG = 32;
        box(GAL_X - XW, GAL_H, 2 * ZG, concrete, (XW + GAL_X) / 2, GAL_H / 2, 0);
        const benchSpots = [];
        for (let z = -ZG + 1; z <= ZG - 1; z += 4) {
            box(0.4, 0.06, 3.2, wood, XW + 0.6, GAL_H + 0.42, z + 1.6);
            for (let dz = 0.3; dz < 3.2; dz += 0.6) benchSpots.push([XW + 0.6, z + dz]);
        }
        const rail = [[V(GAL_X, GAL_H + 1.0, -ZG), V(GAL_X, GAL_H + 1.0, ZG), 0.05]];
        for (let z = -ZG; z <= ZG + 0.01; z += 2) rail.push([V(GAL_X, GAL_H, z), V(GAL_X, GAL_H + 1.0, z), 0.04]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rail), new THREE.MeshStandardMaterial({ color: 0x9a6a3e, roughness: 0.6, metalness: 0.2 })));

        // ---------- 6. pubblico: tribunetta nord, panche e ringhiera del ballatoio, in piedi lungo la parete est
        const outfits = [0xe0262b, 0x141416, 0xf8fafc, 0x141416, 0xe0262b, 0xd9b45a, 0x4b5563, 0x2e62b8, 0x9ca3af];
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
        // tribunetta nord: guardano verso +z (la pista)
        seatSpots.forEach(([x, y, z]) => { if (Math.random() < keep * 0.4) fan(x, y + 0.04, z + 0.05, -Math.PI / 2, true); });
        // panche del ballatoio (guardano verso +x) e gente in piedi alla ringhiera
        benchSpots.forEach(([x, z]) => { if (Math.random() < keep * 0.34 * (1 - Math.abs(z) / 50)) fan(x - 0.05, GAL_H + 0.04, z, 0, true); });
        for (let z = -ZG + 1; z <= ZG - 1; z += 0.8) if (Math.random() < keep * 0.24) fan(GAL_X - 0.4, GAL_H, z, 0, false);
        for (let z = -34; z <= 34; z += 0.9) {
            if (Math.abs(z) < 17.5) continue;
            if (Math.random() < keep * 0.2) fan(XE - 1.0, 0, z, Math.PI, false);
        }
    }

    registerArenaBuilder('caen', buildCaenArchitecture);
})();
