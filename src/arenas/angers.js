// Palazzetto "angers": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // SALLE CLAUDE DEBUSSY — ANGERS (Maine-et-Loire), casa degli Hawks d'Angers. Tetto a capanna in lamiera chiara
    // su travi in legno lamellare scuro che, alle due pareti lunghe, scendono in grandi archi curvi; sotto le
    // travi i tiranti e i puntoni in acciaio zincato e tre lunghe file di luci lineari lungo la sala. Pareti
    // lunghe con le vetrate alte a riquadri (di giorno ci entra il sole): sul lato est (panchine) sopra la parete
    // in compensato color miele, con gli stendardi blu del club (numeri ritirati 15, 27 e 6 e i titoli), il
    // tabellone e il tricolore; sul lato ovest (cronometristi) sopra lo zoccolo grigio, davanti alla tribunetta
    // con i seggiolini arancioni. Testate in intonaco chiaro col compensato in basso, la porta da pallamano
    // sollevata e il canestro. Pavimento azzurro con la riga centrale rossa larghissima; le balaustre sono in
    // compensato col piede giallo come le pareti.
    // Altezze: gronde a 10 m e colmo a 15,5 m; a x = ±10 le travi sono a 12,3 m e le luci lineari a 12 m,
    // sopra la telecamera broadcast (11,6 m); con la vista dall'alto (13,2 m) il soffitto si nasconde.
    // Texture in assets/textures/angers/ (tools/generate_angers_textures.py).
    // =====================================================================
    function buildAngersArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/angers/';
        const XW = -25, XE = 24, ZL = 40;                  // pareti: ovest (tribunetta), est (panchine), testate
        const XC = (XW + XE) / 2, LX = XE - XW, LEN = 2 * ZL, HW = LX / 2;
        const EAVE = 10, RIDGE = 15.5, RAFTER = 0.8, PLY_H = 3.2, GREY_H = 2.6;
        const roofY = x => EAVE + (RIDGE - EAVE) * (1 - Math.abs(x - XC) / HW);
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);

        const woodTex = loadFileTexture(T + 'glulam.jpg', { wrap: true });
        const woodPlain = new THREE.MeshStandardMaterial({ color: 0x6e4226, roughness: 0.6, emissive: 0x1a0e06 });
        const zinc = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.4, metalness: 0.7, emissive: 0x1c1e20 });
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
        // vetrate verso l'esterno: di giorno ci entra il sole (index.html, setupGenericDaylight)
        const winLit = (t, k) => { const m = lit(t, k); m.userData.sunWindow = true; return m; };
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: 11.9 };

        // ---------- 1. pavimento attorno alla pista (stesso azzurro, più scuro)
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(LX, LEN), new THREE.MeshStandardMaterial({ color: 0x6f9fc0, roughness: 0.6 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(XC, -0.01, 0);
        targetGroup.add(apron);

        // ---------- 2. copertura: lamiera chiara, travi lamellari dritte, archi curvi alle pareti, acciaio zincato, luci lineari
        const deckMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'roof_deck.jpg', { wrap: true }), roughness: 0.6, metalness: 0.2, emissive: 0x2c3034, side: THREE.DoubleSide });
        const slopeLen = Math.hypot(HW, RIDGE - EAVE);
        [-1, 1].forEach(sgn => {
            const xo = XC + sgn * HW, g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute([
                xo, EAVE + 0.05, -ZL, xo, EAVE + 0.05, ZL, XC, RIDGE + 0.05, ZL, XC, RIDGE + 0.05, -ZL], 3));
            g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, LEN / 4, 0, LEN / 4, slopeLen / 4, 0, slopeLen / 4], 2));
            g.setIndex([0, 1, 2, 0, 2, 3]);
            g.computeVertexNormals();
            ceilGroup.add(new THREE.Mesh(g, deckMat));
        });
        const frameZ = [];
        for (let z = -ZL + 2.5; z <= ZL - 2.49; z += 6) frameZ.push(z);
        // travi dritte: dalla fine dell'arco al colmo, una per falda
        const KNEE = 5.0;                                          // l'arco occupa i primi 5 m dalla parete
        [[XW + KNEE, XC], [XC, XE - KNEE]].forEach(([x0, x1]) => {
            const len = Math.hypot(x1 - x0, roofY(x1) - roofY(x0)), ang = Math.atan2(roofY(x1) - roofY(x0), x1 - x0);
            const t = woodTex.clone(); t.needsUpdate = true; t.repeat.set(len / 4, 1);
            const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(len, RAFTER, 0.24), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, emissive: 0x1a0e06 }), frameZ.length);
            const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), ang), sc = new THREE.Vector3(1, 1, 1);
            const c = V((x0 + x1) / 2, (roofY(x0) + roofY(x1)) / 2 - RAFTER / 2 - 0.05, 0);
            frameZ.forEach((z, i) => { tmpM.compose(V(c.x, c.y, z), q, sc); inst.setMatrixAt(i, tmpM); });
            inst.instanceMatrix.needsUpdate = true;
            ceilGroup.add(inst);
        });
        // archi curvi: dalla parete (a 4,5 m da terra) all'attacco della trave, sui due lati
        const arcBeams = [], steel = [];
        [[XW, 1], [XE, -1]].forEach(([xw, s]) => {
            const xk = xw + s * KNEE;
            const A0 = V(xw + s * 0.35, 4.5, 0), A1 = V(xk, roofY(xk) - RAFTER / 2 - 0.05, 0), AC = V(xw + s * 0.5, roofY(xk) - 0.4, 0);
            const p = t => V((1 - t) * (1 - t) * A0.x + 2 * (1 - t) * t * AC.x + t * t * A1.x, (1 - t) * (1 - t) * A0.y + 2 * (1 - t) * t * AC.y + t * t * A1.y, 0);
            const N = lowQ ? 8 : 16;
            for (let i = 0; i < N; i++) arcBeams.push([p(i / N), p((i + 1) / N), 0.6]);
            // puntone zincato: dal fianco dell'arco a metà falda, sotto la trave
            const xm = xw + s * 13;
            steel.push([p(0.55), V(xm, roofY(xm) - RAFTER - 0.1, 0), 0.12]);
            steel.push([V(xk + s * 1.5, roofY(xk + s * 1.5) - RAFTER - 0.05, 0), V(xm, roofY(xm) - RAFTER - 0.1, 0), 0.08]);
        });
        const archGeo = mergeBeamGeometry(arcBeams), steelGeo = mergeBeamGeometry(steel);
        const arcs = new THREE.InstancedMesh(archGeo, woodPlain, frameZ.length);
        const ties = new THREE.InstancedMesh(steelGeo, zinc, frameZ.length);
        frameZ.forEach((z, i) => { tmpM.makeTranslation(0, 0, z); arcs.setMatrixAt(i, tmpM); ties.setMatrixAt(i, tmpM); });
        arcs.instanceMatrix.needsUpdate = true;
        ties.instanceMatrix.needsUpdate = true;
        ceilGroup.add(arcs, ties);
        // arcarecci in legno e controventi zincati a croce nelle campate di testata
        const purl = [], brace = [];
        for (let k = 1; k < 8; k++) [-1, 1].forEach(s => { const x = XC + s * HW * k / 8; purl.push([V(x, roofY(x) - 0.18, -ZL), V(x, roofY(x) - 0.18, ZL), 0.18]); });
        [[frameZ[0], frameZ[1]], [frameZ[frameZ.length - 2], frameZ[frameZ.length - 1]]].forEach(([za, zb]) => [-1, 1].forEach(s => {
            const xa = XC + s * 3, xb = XC + s * 17;
            brace.push([V(xa, roofY(xa) - RAFTER - 0.1, za), V(xb, roofY(xb) - RAFTER - 0.1, zb), 0.07], [V(xa, roofY(xa) - RAFTER - 0.1, zb), V(xb, roofY(xb) - RAFTER - 0.1, za), 0.07]);
        }));
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(purl), woodPlain), new THREE.Mesh(mergeBeamGeometry(brace), zinc));
        // tre lunghe file di luci lineari lungo la sala, appese sotto le travi
        const stripFace = new THREE.MeshBasicMaterial({ color: 0xfffbea, side: THREE.DoubleSide });
        const hangers = [];
        [XC - 9, XC, XC + 9].forEach(x => {
            const y = roofY(x) - RAFTER - 0.45;
            box(0.36, 0.1, LEN - 8, greyMat, x, y + 0.05, 0, ceilGroup);
            const f = new THREE.Mesh(new THREE.PlaneGeometry(0.28, LEN - 8.2), stripFace);
            f.rotation.x = Math.PI / 2;
            f.position.set(x, y - 0.005, 0);
            ceilGroup.add(f);
            frameZ.forEach(z => hangers.push([V(x, y + 0.1, z), V(x, roofY(x) - RAFTER, z), 0.015]));
            if (!lowQ) {
                const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
                for (let z = -ZL + 6; z <= ZL - 6; z += 4) {
                    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfffaf0, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
                    spr.scale.set(1.8, 1.8, 1);
                    spr.position.set(x, y - 0.2, z);
                    ceilGroup.add(spr);
                }
            }
        });
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(hangers), darkMat));

        // ---------- 3. pareti lunghe: compensato (est) o zoccolo grigio (ovest), vetrate alte fino alla gronda
        const plyMat = (w, h) => new THREE.MeshStandardMaterial({ map: tex('plywood.jpg', [w / 4, h / 3]), roughness: 0.7, side: THREE.DoubleSide });
        const glazeMat = (w, h) => winLit(tex('glazing.jpg', [w / 6, h / 6]), 0.6);
        flat(LEN, PLY_H, plyMat(LEN, PLY_H), XE, PLY_H / 2, 0, -Math.PI / 2);
        flat(LEN, EAVE - PLY_H, glazeMat(LEN, EAVE - PLY_H), XE, (EAVE + PLY_H) / 2, 0, -Math.PI / 2);
        flat(LEN, GREY_H, new THREE.MeshStandardMaterial({ map: tex('wall_grey.jpg', [LEN / 4, 1]), roughness: 0.8, side: THREE.DoubleSide }), XW, GREY_H / 2, 0, Math.PI / 2);
        flat(LEN, EAVE - GREY_H, glazeMat(LEN, EAVE - GREY_H), XW, (EAVE + GREY_H) / 2, 0, Math.PI / 2);
        [[XE - 0.15, PLY_H], [XW + 0.15, GREY_H]].forEach(([x, y]) => box(0.3, 0.14, LEN, greyMat, x, y + 0.07, 0));   // copertina
        // est: striscione della città, stendardi del club, tricolore (il tabellone lo mette index.html)
        flat(5.6, 1.4, lit(tex('banner_city.jpg'), 0.12), XE - 0.04, 2.3, 4, -Math.PI / 2);
        const penTex = loadFileTexture(T + 'pennants.png');
        const penMat = new THREE.MeshStandardMaterial({ map: penTex, transparent: true, alphaTest: 0.2, roughness: 0.8, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: penTex, emissiveIntensity: 0.1 });
        const SHEET_W = 1460, SHEET_H = 600;
        const pennant = (i, hPx, w, x, y, z) => {
            const h = w * hPx / 200;
            const g = new THREE.PlaneGeometry(w, h);
            const u0 = i * 210 / SHEET_W, u1 = (i * 210 + 200) / SHEET_W, v0 = 1 - hPx / SHEET_H;
            const uv = g.attributes.uv;
            for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) ? u1 : u0, uv.getY(k) ? 1 : v0);
            const m = new THREE.Mesh(g, penMat);
            m.position.set(x, y - h / 2, z);
            m.rotation.y = -Math.PI / 2;
            targetGroup.add(m);
        };
        const XP = XE - 0.6;
        pennant(0, 600, 1.6, XP, 9.6, -12);                         // stendardo del club
        pennant(1, 400, 1.3, XP, 9.4, -9);                          // titoli
        pennant(2, 400, 1.3, XP, 9.4, -6.6);
        pennant(3, 400, 1.3, XP, 9.4, -4.2);
        pennant(4, 330, 1.3, XP, 6.6, -9);                          // numeri ritirati, sotto
        pennant(5, 330, 1.3, XP, 6.6, -6.6);
        pennant(6, 330, 1.3, XP, 6.6, -4.2);
        flat(4.2, 2.8, new THREE.MeshStandardMaterial({ map: tex('flag_fr.jpg'), roughness: 0.85, side: THREE.DoubleSide }), XP, 7.6, 10, -Math.PI / 2);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry([[V(XP + 0.05, 9.05, -13), V(XP + 0.05, 9.05, 12.4), 0.04], [V(XP + 0.05, 9.65, -13), V(XP + 0.05, 9.65, -3.4), 0.04]]), darkMat));

        // ---------- 4. testate: compensato in basso, intonaco fino alla capanna, porta da pallamano sollevata, canestro
        const gable = new THREE.Shape();
        gable.moveTo(XW, PLY_H); gable.lineTo(XE, PLY_H); gable.lineTo(XE, EAVE); gable.lineTo(XC, RIDGE); gable.lineTo(XW, EAVE); gable.lineTo(XW, PLY_H);
        const gableGeo = new THREE.ShapeGeometry(gable);
        const gp = gableGeo.attributes.position, gu = gableGeo.attributes.uv;
        for (let i = 0; i < gp.count; i++) gu.setXY(i, gp.getX(i) / 4, gp.getY(i) / 4);
        const plasterMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'plaster.jpg', { wrap: true }), roughness: 0.9, side: THREE.DoubleSide });
        const goalRed = new THREE.MeshStandardMaterial({ color: 0xd62020, roughness: 0.5 });
        const hbNet = new THREE.MeshBasicMaterial({ map: loadFileTexture(T + 'net.png', { repeat: [3 / 0.8, 2 / 0.8] }), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.8 });
        [[-ZL, 0, 1], [ZL, Math.PI, -1]].forEach(([z, ry, s]) => {
            const g = new THREE.Mesh(gableGeo, plasterMat); g.position.z = z; targetGroup.add(g);
            flat(LX, PLY_H, plyMat(LX, PLY_H), XC, PLY_H / 2, z + s * 0.02, ry);
            // porta da pallamano sollevata contro la parete, con la sbarra bianca
            const gz = z + s * 0.4;
            flat(3, 2, hbNet, XC - 6, 6.0, gz, ry);
            const posts = [[V(XC - 7.5, 5, gz), V(XC - 7.5, 7, gz), 0.08], [V(XC - 4.5, 5, gz), V(XC - 4.5, 7, gz), 0.08], [V(XC - 7.5, 7, gz), V(XC - 4.5, 7, gz), 0.08]];
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry(posts), goalRed));
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry([[V(XC - 12, 6.4, z + s * 0.15), V(XC + 2, 6.4, z + s * 0.15), 0.12], [V(XC - 12, 4.6, z + s * 0.15), V(XC + 2, 4.6, z + s * 0.15), 0.12]]), new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.5 })));
            // canestro fisso al centro
            box(1.8, 1.05, 0.04, new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.6 }), XC + 6, 4.6, z + s * 1.2);
            const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 6, 20), new THREE.MeshStandardMaterial({ color: 0xe5591a, roughness: 0.5 }));
            hoop.rotation.x = Math.PI / 2;
            hoop.position.set(XC + 6, 4.15, z + s * 1.5);
            targetGroup.add(hoop);
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry([[V(XC + 5.5, 4.6, z + s * 1.2), V(XC + 5.5, 4.6, z), 0.06], [V(XC + 6.5, 4.6, z + s * 1.2), V(XC + 6.5, 4.6, z), 0.06]]), darkMat));
        });
        flat(5.2, 1.95, lit(tex('banner_club.jpg'), 0.14), XC + 12, 5.4, ZL - 0.05, Math.PI);

        // ---------- 5. reti scure dietro le porte dell'hockey
        const NET_H = 4.8;
        const netMat = new THREE.MeshBasicMaterial({ map: loadFileTexture(T + 'net.png', { repeat: [22 / 1.6, NET_H / 1.6] }), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.7 });
        [-1, 1].forEach(sgn => {
            flat(22, NET_H, netMat, 0, 1.15 + NET_H / 2, sgn * 36.2, 0);
            const c = [[V(-11, 1.15 + NET_H, sgn * 36.2), V(11, 1.15 + NET_H, sgn * 36.2), 0.03]];
            [-11, -5.5, 0, 5.5, 11].forEach(x => c.push([V(x, 1.1, sgn * 36.2), V(x, 1.15 + NET_H, sgn * 36.2), 0.05]));
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry(c), greyMat));
        });

        // ---------- 6. tribunetta ovest: tre file di seggiolini arancioni su gradoni, con la scaletta
        const ZT = 24, TL = 2 * ZT, X0 = -21.3, D = 0.85, STEP_H = 0.4, TIERS = 3;
        const seatSpots = [];
        for (let k = 0; k < TIERS; k++) {
            const h = (k + 1) * STEP_H, xa = X0 - (k + 1) * D;
            box(D, h, TL, concrete, xa + D / 2, h / 2, 0);
            for (let z = -ZT + 0.5; z <= ZT - 0.5; z += lowQ ? 0.6 : 0.5) if (Math.abs(z) > 0.6) seatSpots.push([xa + D * 0.6, h, z]);
        }
        const orange = new THREE.MeshStandardMaterial({ color: 0xe8701e, roughness: 0.35 });
        const seatPan = new THREE.BoxGeometry(0.42, 0.07, 0.44).translate(0, 0.42, 0);
        const seatBack = new THREE.BoxGeometry(0.07, 0.4, 0.44).rotateZ(0.2).translate(-0.24, 0.65, 0);
        const pans = new THREE.InstancedMesh(seatPan, orange, seatSpots.length), backs = new THREE.InstancedMesh(seatBack, orange, seatSpots.length);
        seatSpots.forEach(([x, y, z], i) => { tmpM.makeTranslation(x, y, z); pans.setMatrixAt(i, tmpM); backs.setMatrixAt(i, tmpM); });
        pans.instanceMatrix.needsUpdate = true;
        backs.instanceMatrix.needsUpdate = true;
        targetGroup.add(pans, backs);
        const rail = [[V(X0 + 0.05, 1.0, -ZT), V(X0 + 0.05, 1.0, ZT), 0.05]];
        for (let z = -ZT; z <= ZT + 0.01; z += 2) rail.push([V(X0 + 0.05, 0, z), V(X0 + 0.05, 1.0, z), 0.04]);
        [-1, 1].forEach(sgn => rail.push([V(X0, 1.0, sgn * (ZT + 0.3)), V(X0 - TIERS * D, TIERS * STEP_H + 1.0, sgn * (ZT + 0.3)), 0.04]));
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rail), darkMat));

        // ---------- 7. pubblico: sui seggiolini e in piedi lungo il lato est, oltre le panchine
        const outfits = [0x1b2a6b, 0xe02b36, 0xf8fafc, 0x141416, 0x1b2a6b, 0x40bdec, 0x4b5563, 0xe02b36, 0x9ca3af];
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
        seatSpots.forEach(([x, y, z]) => {
            const k = Math.round(y / STEP_H) - 1;
            if (Math.random() < keep * (0.42 - k * 0.07) * (1 - Math.abs(z) / 45)) fan(x - 0.05, y + 0.04, z, 0, true);
        });
        for (let z = -33; z <= 33; z += 0.9) {
            if (Math.abs(z) < 17.5) continue;
            if (Math.random() < keep * 0.2) fan(XE - 1.0, 0, z, Math.PI, false);
        }
    }

    registerArenaBuilder('angers', buildAngersArchitecture);
})();
