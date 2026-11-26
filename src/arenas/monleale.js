// Palazzetto "monleale": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // PALAHOCKEY DI MONLEALE — casa della Sportleale Monleale. Tensostruttura in telo bianco-crema
    // ad arco acuto: archi in acciaio grigio che partono dalla cima delle pareti basse e salgono
    // fino al colmo, arcarecci sottili lungo la volta e due file di lampade tonde a metà falda.
    // Pareti basse in pannelli grigi con i teli pubblicitari appesi, condotto dell'aria lungo la
    // parete ovest, porte di servizio sulle testate. Pista a piastrelle azzurre con la riga centrale
    // e i cerchi rossi, balaustre bianche con lo zoccolo in legno e, sopra, la rete bianca sorretta
    // dai paletti grigi. Il pubblico guarda in piedi lungo il lato ovest.
    // Texture in assets/textures/monleale/ (tools/generate_monleale_textures.py).
    // =====================================================================
    function buildMonlealeArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/monleale/';
        // sezione trasversale: pareti fino a EAVE, poi la volta ad arco acuto fino al colmo RIDGE.
        // y(u) = EAVE + (RIDGE - EAVE) * (1 - u)^0.4, u = |x| / HW: verticale alla gronda, a punta al colmo.
        // Volta alta e piena perché le telecamere di gioco (laterale fino a x = 17,5 m e y = 10,5 m,
        // broadcast a y = 11,6 m, dall'alto a y = 13-15 m) restino sempre dentro il telo
        const HW = 25, EAVE = 4.5, RIDGE = 16.5, HL = 42, BAY = 6;
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        const roofY = u => EAVE + (RIDGE - EAVE) * Math.pow(Math.max(0, 1 - u), 0.4);
        // punto della volta per s in [-1, 1] (da ovest a est), rientrato di d verso l'interno
        const roofPt = (s, d) => {
            const u = Math.min(1, Math.abs(s));
            const x = Math.sign(s) * u * HW, y = roofY(u);
            // normale approssimata dalla derivata
            const e = 0.002, u2 = Math.max(0, u - e);
            const dx = (u - u2) * HW, dy = roofY(u) - roofY(u2);
            const nl = Math.hypot(dx, dy) || 1;
            // normale esterna (verso l'alto e fuori); al colmo, dove la volta fa punta, verticale
            const nx = u < 0.004 ? 0 : Math.sign(s) * (-dy) / nl, ny = u < 0.004 ? 1 : dx / nl;
            return V(x - nx * (d || 0), y - ny * (d || 0), 0);
        };

        const memTex = loadFileTexture(T + 'membrane.jpg', { wrap: true });
        const membraneMat = new THREE.MeshStandardMaterial({
            map: memTex, color: 0xf6f1e4, emissive: 0xf2ead6, emissiveMap: memTex, emissiveIntensity: 0.24,
            roughness: 0.9, side: THREE.DoubleSide
        });
        const steelMat = new THREE.MeshStandardMaterial({ color: 0xaeb3b9, roughness: 0.45, metalness: 0.5 });
        const purlinMat = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: 0.5, metalness: 0.4 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2d32, roughness: 0.5, metalness: 0.3 });
        const greyWall = (w, h) => new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'wall_grey.jpg', { repeat: [w / 4, h / 4] }), roughness: 0.85, side: THREE.DoubleSide });
        const flat = (w, h, mat, x, y, z, ry) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
            m.position.set(x, y, z);
            m.rotation.y = ry || 0;
            targetGroup.add(m);
            return m;
        };
        const lit = (f, k) => { const t = loadFileTexture(T + f); return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: k || 0.14, roughness: 0.85, side: THREE.DoubleSide }); };

        // soffitto (telo, archi, lampade): nascosto se una telecamera sale sopra la volta
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: RIDGE - 0.5 };     // solo se una camera esce dal colmo

        // ---------- 1. telo della volta, appena gonfio fra un arco e l'altro
        const nS = lowQ ? 40 : 72, nZ = (2 * HL / BAY) * (lowQ ? 3 : 6);
        const vPos = [], vUv = [], vIdx = [];
        const sArc = [0];
        for (let i = 1; i <= nS; i++) {
            const a = roofPt(-1 + 2 * (i - 1) / nS, 0), b = roofPt(-1 + 2 * i / nS, 0);
            sArc.push(sArc[i - 1] + a.distanceTo(b));
        }
        for (let j = 0; j <= nZ; j++) {
            const z = -HL + 2 * HL * j / nZ;
            const sag = 0.28 * Math.sin(Math.PI * (((z + HL) / BAY) % 1));
            for (let i = 0; i <= nS; i++) {
                const s = -1 + 2 * i / nS;
                // il telo si gonfia verso l'esterno, ma non sulla linea di gronda
                const p = roofPt(s, -sag * Math.min(1, (1 - Math.abs(s)) * 6));
                vPos.push(p.x, p.y, z);
                vUv.push((z + HL) / 8, sArc[i] / 8);
            }
        }
        for (let j = 0; j < nZ; j++) for (let i = 0; i < nS; i++) {
            const a = j * (nS + 1) + i, b = a + nS + 1;
            vIdx.push(a, b, a + 1, b, b + 1, a + 1);
        }
        const vault = new THREE.BufferGeometry();
        vault.setAttribute('position', new THREE.Float32BufferAttribute(vPos, 3));
        vault.setAttribute('uv', new THREE.Float32BufferAttribute(vUv, 2));
        vault.setIndex(vIdx);
        vault.computeVertexNormals();
        ceilGroup.add(new THREE.Mesh(vault, membraneMat));

        // ---------- 2. archi in acciaio (travi reticolari viste dal basso: corrente scatolare) e arcarecci
        const archZ = [];
        for (let z = -HL; z <= HL + 0.01; z += BAY) archZ.push(Math.max(-HL + 0.3, Math.min(HL - 0.3, z)));
        const beams = [];
        const nA = lowQ ? 24 : 40;
        archZ.forEach(z => {
            for (let i = 0; i < nA; i++) {
                const a = roofPt(-1 + 2 * i / nA, 0.28), b = roofPt(-1 + 2 * (i + 1) / nA, 0.28);
                a.z = b.z = z;
                beams.push([a, b, 0.22]);
            }
            // piedritti corti sulle pareti fino al pavimento (dentro le pareti grigie si vedono appena)
            [-1, 1].forEach(sg => beams.push([V(sg * (HW - 0.3), 0, z), V(sg * (HW - 0.3), EAVE, z), 0.3]));
        });
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(beams), steelMat));
        const purl = [];
        [-0.85, -0.6, -0.35, -0.12, 0.12, 0.35, 0.6, 0.85].forEach(s => {
            const p = roofPt(s, 0.36);
            purl.push([V(p.x, p.y, -HL), V(p.x, p.y, HL), 0.06]);
        });
        purl.push([V(0, RIDGE - 0.4, -HL), V(0, RIDGE - 0.4, HL), 0.1]);
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(purl), purlinMat));

        // ---------- 3. lampade tonde: due file a metà falda, una per campata
        const lampS = [-0.5, 0.5];
        const lampZ = [];
        for (let k = 0; k < archZ.length - 1; k++) lampZ.push((archZ[k] + archZ[k + 1]) / 2);
        const nL = lampS.length * lampZ.length;
        const lampHousing = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.34, 0.4, 0.22, 16), darkMat, nL);
        const lampFace = new THREE.InstancedMesh(new THREE.CircleGeometry(0.36, 18).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffbf0, side: THREE.DoubleSide }), nL);
        const cables = [];
        const glowTex = lowQ ? null : loadFileTexture(CIT_TEX + 'glow.png');
        let li = 0;
        lampS.forEach(s => lampZ.forEach(z => {
            const top = roofPt(s, 0.3);
            const y = top.y - 1.1;
            tmpM.makeTranslation(top.x, y, z); lampHousing.setMatrixAt(li, tmpM);
            tmpM.makeTranslation(top.x, y - 0.12, z); lampFace.setMatrixAt(li, tmpM);
            cables.push([V(top.x, y + 0.1, z), V(top.x, top.y, z), 0.02]);
            if (glowTex) {
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff6e2, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(2.8, 2.8, 1);
                spr.position.set(top.x, y - 0.3, z);
                ceilGroup.add(spr);
            }
            li++;
        }));
        lampHousing.instanceMatrix.needsUpdate = true;
        lampFace.instanceMatrix.needsUpdate = true;
        ceilGroup.add(lampHousing, lampFace, new THREE.Mesh(mergeBeamGeometry(cables), darkMat));

        // ---------- 4. pareti basse grigie e testate (sotto grigie, sopra il telo che chiude la volta)
        [[HW, -Math.PI / 2], [-HW, Math.PI / 2]].forEach(([x, ry]) => flat(2 * HL, EAVE, greyWall(2 * HL, EAVE), x, EAVE / 2, 0, ry));
        const gable = new THREE.Shape();
        gable.moveTo(-HW, EAVE);
        for (let i = 0; i <= nS; i++) { const p = roofPt(-1 + 2 * i / nS, 0); gable.lineTo(p.x, p.y); }
        gable.lineTo(-HW, EAVE);
        const gableGeo = new THREE.ShapeGeometry(gable, 24);
        const gp = gableGeo.attributes.position, gu = gableGeo.attributes.uv;
        for (let i = 0; i < gp.count; i++) gu.setXY(i, gp.getX(i) / 8, gp.getY(i) / 8);     // UV in metri
        [[-HL, 0], [HL, Math.PI]].forEach(([z, ry]) => {
            flat(2 * HW, EAVE, greyWall(2 * HW, EAVE), 0, EAVE / 2, z, ry);
            const g = new THREE.Mesh(gableGeo, membraneMat);
            g.position.z = z;
            targetGroup.add(g);
            // porte di servizio scure
            const dir = z < 0 ? 1 : -1;
            [-13, 15].forEach(x => flat(2.0, 2.4, darkMat, x * dir, 1.2, z + dir * 0.03, ry));
            // montanti in acciaio della testata
            const posts = [];
            [-16, -8, 0, 8, 16].forEach(x => posts.push([V(x, EAVE, z + dir * 0.15), V(x, roofY(Math.abs(x) / HW) - 0.2, z + dir * 0.15), 0.22]));
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry(posts), steelMat));
        });

        // ---------- 5. teli pubblicitari sulle pareti, striscione del club, condotto dell'aria, condizionatore
        const ads = loadFileTexture(T + 'wall_ads.png', { repeat: [1, 1] });
        const adsMat = new THREE.MeshStandardMaterial({ map: ads, transparent: true, alphaTest: 0.1, roughness: 0.8, emissive: 0xffffff, emissiveMap: ads, emissiveIntensity: 0.12, side: THREE.DoubleSide });
        flat(30, 1.9, adsMat, 0, 2.8, -HL + 0.06, 0);
        flat(30, 1.9, adsMat, 0, 2.8, HL - 0.06, Math.PI);
        flat(40, 2.5, adsMat, HW - 0.06, 2.4, 0, -Math.PI / 2);
        flat(6.4, 2.4, lit('banner_club.jpg', 0.16), 0, 5.6, HL - 0.08, Math.PI);
        const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 64, lowQ ? 10 : 18), new THREE.MeshStandardMaterial({ color: 0xb6babd, roughness: 0.4, metalness: 0.6 }));
        duct.rotation.x = Math.PI / 2;
        duct.position.set(-HW + 0.7, EAVE - 0.4, 0);
        targetGroup.add(duct);
        const ac = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.3), new THREE.MeshStandardMaterial({ color: 0xe8e8e4, roughness: 0.6 }));
        ac.position.set(9, 3.0, -HL + 0.2);
        targetGroup.add(ac);

        // ---------- 6. rete bianca sopra le balaustre, sorretta da paletti grigi e da un cavo in cima
        const R = cornerRadius + 0.12, hx = rinkWidth / 2 - cornerRadius, hz = rinkLength / 2 - cornerRadius;
        const perim = [];
        const addArc = (cx, cz, a0) => { for (let i = 0; i <= 10; i++) { const a = a0 + (Math.PI / 2) * i / 10; perim.push(V(cx + Math.cos(a) * R, 0, cz + Math.sin(a) * R)); } };
        addArc(hx, hz, 0); addArc(-hx, hz, Math.PI / 2); addArc(-hx, -hz, Math.PI); addArc(hx, -hz, Math.PI * 1.5);
        perim.push(perim[0].clone());
        const perimCurve = new THREE.CatmullRomCurve3(perim, false, 'catmullrom', 0.05);
        // davanti alle panchine e alle panche dei puniti la rete non c'è
        const open = q => (q.x > rinkWidth / 2 - 0.5 && Math.abs(q.z) > 3.4 && Math.abs(q.z) < 15.6) ||
            (q.x < -rinkWidth / 2 + 0.5 && Math.abs(q.z) < 7.6);
        const NET_Y0 = 1.22, NET_Y1 = 3.6;
        const nSeg = Math.round(perimCurve.getLength() / 0.5);
        const nPos = [], nUv = [], nIdx = [];
        const postBeams = [];
        let prev = perimCurve.getPointAt(0), dist = 0;
        for (let i = 1; i <= nSeg; i++) {
            const q = perimCurve.getPointAt(i / nSeg);
            const len = q.distanceTo(prev);
            if (!open(q) && !open(prev)) {
                const b = nPos.length / 3;
                nPos.push(prev.x, NET_Y0, prev.z, q.x, NET_Y0, q.z, q.x, NET_Y1, q.z, prev.x, NET_Y1, prev.z);
                nUv.push(dist / 1.6, 0, (dist + len) / 1.6, 0, (dist + len) / 1.6, (NET_Y1 - NET_Y0) / 1.6, dist / 1.6, (NET_Y1 - NET_Y0) / 1.6);
                nIdx.push(b, b + 1, b + 2, b, b + 2, b + 3);
                postBeams.push([V(prev.x, NET_Y1, prev.z), V(q.x, NET_Y1, q.z), 0.025]);
                if (i % 8 === 0) postBeams.push([V(q.x, 1.1, q.z), V(q.x, NET_Y1 + 0.05, q.z), 0.07]);
            }
            dist += len;
            prev = q;
        }
        const netGeo = new THREE.BufferGeometry();
        netGeo.setAttribute('position', new THREE.Float32BufferAttribute(nPos, 3));
        netGeo.setAttribute('uv', new THREE.Float32BufferAttribute(nUv, 2));
        netGeo.setIndex(nIdx);
        netGeo.computeVertexNormals();
        const netTex = loadFileTexture(T + 'net.png', { wrap: true });
        targetGroup.add(new THREE.Mesh(netGeo, new THREE.MeshBasicMaterial({ map: netTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.75 })));
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(postBeams), steelMat));

        // ---------- 7. pavimento di servizio in cemento attorno alla pista
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(2 * HW, 2 * HL), new THREE.MeshStandardMaterial({ color: 0x9a968e, roughness: 0.85 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.y = -0.01;
        targetGroup.add(apron);

        // ---------- 8. pubblico in piedi lungo la balaustra ovest (dietro la rete) e in testata
        const outfits = [0xf26a1b, 0x1c286e, 0xf8fafc, 0x141416, 0x4ab4e6, 0xf26a1b, 0x4b5563, 0x7f1d1d, 0x166534];
        const jm = outfits.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 }));
        const pantsM = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const handM = new THREE.MeshStandardMaterial({ color: 0xc99178, roughness: 0.6 });
        const hairM = new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.8 });
        const fan = (x, y, z, faceY) => {
            const root = new THREE.Group();
            const mat = jm[Math.floor(Math.random() * jm.length)];
            [-0.11, 0.11].forEach(lz => { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.82, 7), pantsM); lg.position.set(0, 0.41, lz); root.add(lg); });
            const bodyPivot = new THREE.Group();
            bodyPivot.position.set(0, 0.82, 0);
            root.add(bodyPivot);
            const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.55, 10), mat); torso.position.y = 0.27; bodyPivot.add(torso);
            const headGroup = new THREE.Group(); headGroup.position.y = 0.69;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), getCrowdHeadPlaceholderMaterial());
            const hair = new THREE.Mesh(new THREE.SphereGeometry(0.148, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM); hair.position.x = -0.015;
            headGroup.add(head, hair); bodyPivot.add(headGroup);
            const arm = sz => { const ap = new THREE.Group(); ap.position.set(0, 0.48, sz); const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.42, 7), mat); sl.position.y = -0.21; const hd = new THREE.Mesh(new THREE.SphereGeometry(0.05, 7, 7), handM); hd.position.y = -0.44; ap.add(sl, hd); bodyPivot.add(ap); return ap; };
            const leftArmPivot = arm(-0.24), rightArmPivot = arm(0.24);
            root.position.set(x, y, z);
            root.rotation.y = faceY + (Math.random() - 0.5) * 0.4;
            const childLift = maybeMakeCrowdChild(root, headGroup, false);
            targetGroup.add(root);
            crowdMembers.push({ mesh: root, bodyPivot, headGroup, leftArmPivot, rightArmPivot, baseY: y + childLift, phase: Math.random() * Math.PI * 2, standing: true });
        };
        const keep = preset.crowdKeepRatio * crowdAttendanceScale();   // pubblico in base all'importanza della partita (index.html)
        // con rotation.y = 0 il tifoso guarda verso +x (la pista); al centro c'è il tavolo cronometristi
        for (let z = -26; z <= 26; z += 0.75) {
            if (Math.abs(z) < 7.6) continue;
            if (Math.random() < keep * 0.5) fan(-19.7 + (Math.random() - 0.5) * 0.3, 0, z + (Math.random() - 0.5) * 0.2, 0);
            if (Math.random() < keep * 0.22) fan(-20.8 + (Math.random() - 0.5) * 0.3, 0, z, 0);
        }
        // qualcuno dietro la porta sud, girato verso la pista (-z)
        for (let x = -10; x <= 10; x += 0.8) {
            if (Math.random() < keep * 0.25) fan(x + (Math.random() - 0.5) * 0.3, 0, 37.6 + Math.random() * 0.6, Math.PI / 2);
        }
    }

    registerArenaBuilder('monleale', buildMonlealeArchitecture);
})();
