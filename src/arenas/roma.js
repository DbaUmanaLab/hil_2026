// Palazzetto "roma": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // PALAMUNICIPIO ROMA XI — casa dei Mammuth Roma. Tensostruttura a cupola geodetica allungata:
    // reticolo di tubi d'acciaio scuri a triangoli con il telo color crema, pareti basse verde scuro
    // tutto intorno, parquet d'acero con le linee di basket, calcetto e pallavolo, balaustre bianche
    // con il vetro, fari e casse appesi alla struttura, tricolore e striscione dei Mammuth in fondo,
    // una porta da calcetto contro la testata e una piccola tribuna con i seggiolini verdi.
    // Texture in assets/textures/roma/ (tools/generate_roma_textures.py).
    // =====================================================================
    function buildRomaArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/roma/';
        // cupola: superellissoide |x/A|^P + |z/B|^P <= 1, alta H sopra le pareti basse (WALL_H)
        const A = 28, B = 46, H = 15, P = 3, WALL_H = 2.6;
        const sgnPow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
        // punto della cupola: rho 0 = sommità, 1 = imposta sulle pareti; phi = angolo attorno
        const dome = (rho, phi) => new THREE.Vector3(
            A * rho * sgnPow(Math.cos(phi), 2 / P),
            WALL_H + H * Math.pow(Math.max(0, 1 - Math.pow(rho, P)), 1 / P),
            B * rho * sgnPow(Math.sin(phi), 2 / P));
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        const steelMat = new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: 0.5, metalness: 0.5 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f1ee, roughness: 0.5 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.5, metalness: 0.3 });
        const lit = (t, k) => new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: k || 0.15, roughness: 0.8, side: THREE.DoubleSide });

        // soffitto (telo, reticolo, fari): nascosto se una telecamera sale sopra la cupola
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: 14.2 };

        // ---------- 1. telo della cupola, più scuro in basso dove c'è la rete nera
        const NR = lowQ ? 18 : 30, NP = lowQ ? 64 : 112;
        const pos = [], uv = [], colArr = [], idx = [];
        const cream = new THREE.Color(0xf3e9d2), dark = new THREE.Color(0x2b2d2a), tmpC = new THREE.Color();
        for (let j = 0; j <= NR; j++) {
            const rho = j / NR;
            for (let i = 0; i <= NP; i++) {
                const phi = (i / NP) * Math.PI * 2;
                const p = dome(rho, phi);
                pos.push(p.x, p.y + 0.05, p.z);
                uv.push(i / NP * 12, rho * 6);
                const k = THREE.MathUtils.smoothstep(rho, 0.8, 0.94);
                tmpC.copy(cream).lerp(dark, k);
                colArr.push(tmpC.r, tmpC.g, tmpC.b);
            }
        }
        for (let j = 0; j < NR; j++) for (let i = 0; i < NP; i++) {
            const a = j * (NP + 1) + i, b = a + NP + 1;
            idx.push(a, b, a + 1, b, b + 1, a + 1);
        }
        const memGeo = new THREE.BufferGeometry();
        memGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        memGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        memGeo.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));
        memGeo.setIndex(idx);
        memGeo.computeVertexNormals();
        const memTex = loadFileTexture(T + 'membrane.jpg', { wrap: true });
        ceilGroup.add(new THREE.Mesh(memGeo, new THREE.MeshStandardMaterial({ map: memTex, vertexColors: true, emissive: 0xf0e2c4, emissiveMap: memTex, emissiveIntensity: 0.32, roughness: 0.9, side: THREE.DoubleSide })));

        // ---------- 2. reticolo geodetico: anelli di nodi (meno nodi verso l'alto) uniti a triangoli
        const rings = [];
        const RINGS = lowQ ? 10 : 17;
        for (let j = 0; j <= RINGS; j++) {
            const rho = 1 - j / RINGS * 0.9;
            const n = Math.max(6, Math.round((lowQ ? 60 : 100) * rho));
            const shift = (j % 2) * 0.5;
            const nodes = [];
            for (let i = 0; i < n; i++) {
                const phi = ((i + shift) / n) * Math.PI * 2;
                nodes.push({ phi, p: dome(rho, phi) });
            }
            rings.push(nodes);
        }
        const top = dome(0, 0);
        const beams = [];
        const seen = new Set();
        const edge = (a, b) => {
            const k = a.p.x.toFixed(2) + a.p.z.toFixed(2) + '|' + b.p.x.toFixed(2) + b.p.z.toFixed(2);
            const k2 = b.p.x.toFixed(2) + b.p.z.toFixed(2) + '|' + a.p.x.toFixed(2) + a.p.z.toFixed(2);
            if (seen.has(k) || seen.has(k2)) return;
            seen.add(k);
            beams.push([a.p, b.p, 0.055]);
        };
        rings.forEach(r => r.forEach((nd, i) => edge(nd, r[(i + 1) % r.length])));
        // "cerniera" tra due anelli: avanza sull'anello che ha il prossimo nodo con angolo minore
        const norm = a => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        for (let j = 0; j < rings.length - 1; j++) {
            const ra = rings[j].slice().sort((p, q) => norm(p.phi) - norm(q.phi));
            const rb = rings[j + 1].slice().sort((p, q) => norm(p.phi) - norm(q.phi));
            let ia = 0, ib = 0;
            edge(ra[0], rb[0]);
            while (ia < ra.length || ib < rb.length) {
                const na = ra[(ia + 1) % ra.length], nb = rb[(ib + 1) % rb.length];
                const aa = ia + 1 < ra.length ? norm(na.phi) : Infinity;
                const ab = ib + 1 < rb.length ? norm(nb.phi) : Infinity;
                if (aa === Infinity && ab === Infinity) { edge(ra[ra.length - 1], rb[0]); edge(ra[0], rb[rb.length - 1]); break; }
                if (aa <= ab) { ia++; edge(ra[ia % ra.length], rb[ib % rb.length]); }
                else { ib++; edge(ra[ia % ra.length], rb[ib % rb.length]); }
            }
        }
        const last = rings[rings.length - 1];
        last.forEach(nd => beams.push([nd.p, top, 0.055]));
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(beams), steelMat));
        // nodi del reticolo
        const allNodes = rings.flat();
        const knots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 6, 5), steelMat, allNodes.length);
        allNodes.forEach((nd, i) => { tmpM.makeTranslation(nd.p.x, nd.p.y, nd.p.z); knots.setMatrixAt(i, tmpM); });
        knots.instanceMatrix.needsUpdate = true;
        ceilGroup.add(knots);

        // ---------- 3. fari e casse appesi alla struttura
        const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
        const lampSpots = [];
        [0.62, 0.42].forEach(rho => { for (let i = 0; i < (rho > 0.5 ? 14 : 8); i++) lampSpots.push(dome(rho, (i + 0.5) / (rho > 0.5 ? 14 : 8) * Math.PI * 2)); });
        const lampBody = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.36, 0.42, 12), darkMat, lampSpots.length);
        const lampFace = new THREE.InstancedMesh(new THREE.CircleGeometry(0.3, 14).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffbea, side: THREE.DoubleSide }), lampSpots.length);
        lampSpots.forEach((p, i) => {
            tmpM.makeTranslation(p.x, p.y - 0.45, p.z); lampBody.setMatrixAt(i, tmpM);
            tmpM.makeTranslation(p.x, p.y - 0.67, p.z); lampFace.setMatrixAt(i, tmpM);
            if (!lowQ && i % 2 === 0) {
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff6dc, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(2.8, 2.8, 1);
                spr.position.set(p.x, p.y - 0.9, p.z);
                ceilGroup.add(spr);
            }
        });
        lampBody.instanceMatrix.needsUpdate = true;
        lampFace.instanceMatrix.needsUpdate = true;
        ceilGroup.add(lampBody, lampFace);
        [[0.8, 0.15], [0.8, 0.85], [0.8, 0.35], [0.8, 0.65]].forEach(([rho, f]) => {
            const p = dome(rho, f * Math.PI * 2);
            const spk = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.3, 0.7), whiteMat);
            spk.position.set(p.x * 0.97, p.y - 1.3, p.z * 0.97);
            spk.lookAt(0, spk.position.y, 0);
            ceilGroup.add(spk);
        });

        // ---------- 4. pareti basse verde scuro lungo l'imposta della cupola
        const wallTex = loadFileTexture(T + 'wall_green.jpg', { wrap: true });
        const wPos = [], wUv = [], wIdx = [];
        const NW = lowQ ? 64 : 128;
        let acc = 0, prev = null;
        for (let i = 0; i <= NW; i++) {
            const p = dome(1, (i / NW) * Math.PI * 2);
            if (prev) acc += p.distanceTo(prev);
            prev = p;
            wPos.push(p.x, 0, p.z, p.x, WALL_H + 0.1, p.z);
            wUv.push(acc / 4, 0, acc / 4, (WALL_H + 0.1) / 4);
            if (i < NW) { const a = i * 2; wIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
        }
        const wallGeo = new THREE.BufferGeometry();
        wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wPos, 3));
        wallGeo.setAttribute('uv', new THREE.Float32BufferAttribute(wUv, 2));
        wallGeo.setIndex(wIdx);
        wallGeo.computeVertexNormals();
        targetGroup.add(new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9, side: THREE.DoubleSide })));

        // ---------- 5. parquet attorno alla pista
        const floorShape = new THREE.Shape();
        for (let i = 0; i <= 96; i++) { const p = dome(1, (i / 96) * Math.PI * 2); i ? floorShape.lineTo(p.x, -p.z) : floorShape.moveTo(p.x, -p.z); }
        const floor = new THREE.Mesh(new THREE.ShapeGeometry(floorShape), new THREE.MeshStandardMaterial({ color: 0xb98f5c, roughness: 0.55 }));
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.01;
        targetGroup.add(floor);

        // ---------- 6. testata -z: tricolore, striscione dei Mammuth, porta da calcetto
        const endZ = -B * 0.93;
        const hang = (w, h, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); targetGroup.add(m); return m; };
        hang(3.6, 2.4, lit(loadFileTexture(T + 'flag_italy.jpg'), 0.12), -4.5, 6.6, endZ + 2.5);   // tricolore a bande verticali
        hang(5.0, 2.5, lit(loadFileTexture(T + 'banner_mammuth.jpg'), 0.15), 1.5, 6.4, endZ + 2.5);
        const cords = [[V(-4.5, 7.8, endZ + 2.5), V(-4.5, 11.5, endZ + 2.5), 0.01], [V(1.5, 7.65, endZ + 2.5), V(1.5, 11.5, endZ + 2.5), 0.01]];
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(cords), darkMat));
        // striscioni appesi alla parete verde sui lati lunghi
        [[-1, -10, 'banner_red.jpg'], [-1, 14, 'banner_white.jpg'], [1, -22, 'banner_white.jpg'], [1, 26, 'banner_red.jpg']].forEach(([side, z, f]) => {
            const xw = side * A * Math.pow(1 - Math.pow(Math.abs(z) / B, P), 1 / P) - side * 0.12;
            const m = hang(4.0, 1.0, lit(loadFileTexture(T + f), 0.15), xw, 1.7, z);
            m.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        });
        // porta da calcetto contro la testata, fuori dalla pista
        const goalZ = endZ + 0.9;
        const gp = [[V(-1.5, 0, goalZ), V(-1.5, 2, goalZ), 0.05], [V(1.5, 0, goalZ), V(1.5, 2, goalZ), 0.05], [V(-1.5, 2, goalZ), V(1.5, 2, goalZ), 0.05]];
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(gp), whiteMat));
        const netTex = loadFileTexture(T + 'net_white.png', { repeat: [1 / 0.12, 1 / 0.12] });
        const netMat = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, depthWrite: false });
        const netBack = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), netMat);
        netBack.geometry.attributes.uv.array.forEach((v, i, arr) => { arr[i] = v * (i % 2 ? 2 : 3); });
        netBack.position.set(0, 1, goalZ - 0.9);
        targetGroup.add(netBack);

        // ---------- 7. piccola tribuna con i seggiolini verdi (lato -x)
        const ZS0 = -16, ZS1 = 16, SLEN = ZS1 - ZS0, X0 = -21.4, STEP_D = 0.9, STEP_H = 0.4, TIERS = 4;
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x9aa1a8, roughness: 0.5, metalness: 0.5 });
        const seatMat = new THREE.MeshStandardMaterial({ color: 0x1f8a4c, roughness: 0.5 });
        const seatCount = Math.floor(SLEN / 0.5) * TIERS;
        const seats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.08, 0.42), seatMat, seatCount);
        const backs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.34, 0.42), seatMat, seatCount);
        let si = 0;
        for (let k = 0; k < TIERS; k++) {
            const h = (k + 1) * STEP_H, xa = X0 - k * STEP_D - STEP_D / 2;
            const deck = new THREE.Mesh(new THREE.BoxGeometry(STEP_D, 0.08, SLEN), frameMat);
            deck.position.set(xa, h, 0);
            targetGroup.add(deck);
            for (let z = ZS0 + 0.25; z < ZS1 - 0.2 && si < seatCount; z += 0.5) {
                tmpM.makeTranslation(xa, h + 0.42, z); seats.setMatrixAt(si, tmpM);
                tmpM.makeTranslation(xa - 0.22, h + 0.62, z); backs.setMatrixAt(si, tmpM);
                si++;
            }
        }
        seats.count = backs.count = si;
        seats.instanceMatrix.needsUpdate = true;
        backs.instanceMatrix.needsUpdate = true;
        targetGroup.add(seats, backs);
        const legs = [];
        for (let z = ZS0; z <= ZS1 + 0.01; z += 4) for (let k = 0; k < TIERS; k++) {
            const xa = X0 - k * STEP_D - STEP_D / 2;
            legs.push([V(xa, 0, z), V(xa, (k + 1) * STEP_H, z), 0.04]);
        }
        legs.push([V(X0 + 0.05, 0.9, ZS0), V(X0 + 0.05, 0.9, ZS1), 0.035]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(legs), frameMat));

        // pubblico sui seggiolini
        const outfits = [0x7a1f2b, 0xf2a516, 0x111827, 0xf8fafc, 0x374151, 0x7a1f2b, 0x1d4ed8, 0x15803d];
        const jm = outfits.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 }));
        const pantsM = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const handM = new THREE.MeshStandardMaterial({ color: 0xc99178, roughness: 0.6 });
        const hairM = new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.8 });
        const fan = (x, y, z) => {
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
            root.rotation.y = Math.atan2(z, 30) * 0.3 + (Math.random() - 0.5) * 0.3;
            const childLift = maybeMakeCrowdChild(root, headGroup, false);
            targetGroup.add(root);
            crowdMembers.push({ mesh: root, bodyPivot, headGroup, leftArmPivot, rightArmPivot, baseY: y + childLift, phase: Math.random() * Math.PI * 2, standing: true });
        };
        const keep = preset.crowdKeepRatio * crowdAttendanceScale();   // pubblico in base all'importanza della partita (index.html)
        for (let k = 0; k < TIERS; k++) {
            const h = (k + 1) * STEP_H + 0.04, x = X0 - k * STEP_D - STEP_D / 2 + 0.1;
            for (let z = ZS0 + 0.5; z <= ZS1 - 0.5; z += 0.75) if (Math.random() < keep * 0.5) fan(x + (Math.random() - 0.5) * 0.15, h, z + (Math.random() - 0.5) * 0.2);
        }
    }

    registerArenaBuilder('roma', buildRomaArchitecture);
})();
