// Palazzetto "novi": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // PATTINODROMO COMUNALE "G. PARODI" — NOVI LIGURE (Novi Hockey). Pallone pressostatico
    // allungato color crema che scende fino a terra, trattenuto da una rete di cavi scuri a triangoli
    // con gli anelli ai nodi; file di fari tondi incassati nel telo. Pista SportCourt verde acqua con
    // la fascia blu fuori dal campo, balaustre bianche a pannelli con la rete nera sopra, striscioni
    // del Novi Hockey, un gazebo bianco e il corridoio con la ringhiera nera da cui guarda il pubblico.
    // Texture in assets/textures/novi/ (tools/generate_novi_textures.py).
    // =====================================================================
    function buildNoviArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/novi/';
        // cupola: superellissoide |x/A|^P + |z/B|^P <= 1, alta H, che parte da un cordolo basso
        const A = 29, B = 48, H = 16, P = 2.6, BASE = 0.6;
        const sgnPow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
        const dome = (rho, phi) => new THREE.Vector3(
            A * rho * sgnPow(Math.cos(phi), 2 / P),
            BASE + H * Math.pow(Math.max(0, 1 - Math.pow(rho, P)), 1 / P),
            B * rho * sgnPow(Math.sin(phi), 2 / P));
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        const cableMat = new THREE.MeshStandardMaterial({ color: 0x2b2a26, roughness: 0.6, metalness: 0.3 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.5, metalness: 0.3 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.6 });
        const lit = (t, k) => new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: k || 0.15, roughness: 0.8, side: THREE.DoubleSide });

        // soffitto (telo, cavi, fari): nascosto se una telecamera sale sopra la cupola
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: 14.2 };

        // ---------- 1. telo color crema, un po' più scuro e sporco vicino a terra
        const NR = lowQ ? 20 : 34, NP = lowQ ? 64 : 112;
        const pos = [], uv = [], colArr = [], idx = [];
        const cream = new THREE.Color(0xf5ebd6), low = new THREE.Color(0xc9b99a), tmpC = new THREE.Color();
        for (let j = 0; j <= NR; j++) {
            const rho = j / NR;
            for (let i = 0; i <= NP; i++) {
                const p = dome(rho, (i / NP) * Math.PI * 2);
                pos.push(p.x, p.y + 0.05, p.z);
                uv.push(i / NP * 14, rho * 7);
                tmpC.copy(cream).lerp(low, THREE.MathUtils.smoothstep(rho, 0.82, 1));
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
        ceilGroup.add(new THREE.Mesh(memGeo, new THREE.MeshStandardMaterial({ map: memTex, vertexColors: true, emissive: 0xf3e4c4, emissiveMap: memTex, emissiveIntensity: 0.34, roughness: 0.9, side: THREE.DoubleSide })));

        // ---------- 2. rete di cavi a triangoli con gli anelli ai nodi
        const rings = [];
        const RINGS = lowQ ? 9 : 14;
        for (let j = 0; j <= RINGS; j++) {
            const rho = 0.99 - j / RINGS * 0.9;
            const n = Math.max(6, Math.round((lowQ ? 52 : 80) * rho));
            const shift = (j % 2) * 0.5;
            const nodes = [];
            for (let i = 0; i < n; i++) {
                const phi = ((i + shift) / n) * Math.PI * 2;
                nodes.push({ phi, p: dome(rho, phi) });
            }
            rings.push(nodes);
        }
        const top = dome(0, 0);
        const cables = [];
        rings.forEach(r => r.forEach((nd, i) => cables.push([nd.p, r[(i + 1) % r.length].p, 0.03])));
        const norm = a => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        for (let j = 0; j < rings.length - 1; j++) {
            const ra = rings[j], rb = rings[j + 1];
            ra.forEach(nd => {
                // ogni nodo si lega ai due nodi più vicini dell'anello sopra: maglie triangolari
                const near = rb.map(q => ({ q, d: Math.abs(norm(q.phi - nd.phi + Math.PI) - Math.PI) })).sort((a, b) => a.d - b.d).slice(0, 2);
                near.forEach(({ q }) => cables.push([nd.p, q.p, 0.03]));
            });
        }
        rings[rings.length - 1].forEach(nd => cables.push([nd.p, top, 0.03]));
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(cables), cableMat));
        const allNodes = rings.flat();
        const knots = new THREE.InstancedMesh(new THREE.TorusGeometry(0.22, 0.07, 6, 12), cableMat, allNodes.length);
        const q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 0, 1);
        allNodes.forEach((nd, i) => {
            const nrm = V(nd.p.x / (A * A), (nd.p.y - BASE) / (H * H), nd.p.z / (B * B)).normalize();
            q.setFromUnitVectors(up, nrm);
            tmpM.compose(nd.p, q, sc);
            knots.setMatrixAt(i, tmpM);
        });
        knots.instanceMatrix.needsUpdate = true;
        ceilGroup.add(knots);

        // ---------- 3. fari tondi incassati nel telo (tanti, in file regolari)
        const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
        const spots = [];
        [0.28, 0.45, 0.6, 0.74].forEach(rho => {
            const n = Math.round(rho * (lowQ ? 24 : 40));
            for (let i = 0; i < n; i++) spots.push(dome(rho, (i + 0.5) / n * Math.PI * 2));
        });
        const lampRim = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 14), darkMat, spots.length);
        const lampFace = new THREE.InstancedMesh(new THREE.CircleGeometry(0.24, 14).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffbea, side: THREE.DoubleSide }), spots.length);
        spots.forEach((p, i) => {
            tmpM.makeTranslation(p.x, p.y - 0.08, p.z); lampRim.setMatrixAt(i, tmpM);
            tmpM.makeTranslation(p.x, p.y - 0.15, p.z); lampFace.setMatrixAt(i, tmpM);
            if (!lowQ && i % 3 === 0) {
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff6dc, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(2.2, 2.2, 1);
                spr.position.set(p.x, p.y - 0.4, p.z);
                ceilGroup.add(spr);
            }
        });
        lampRim.instanceMatrix.needsUpdate = true;
        lampFace.instanceMatrix.needsUpdate = true;
        ceilGroup.add(lampRim, lampFace);

        // ---------- 4. pavimento: fascia blu attorno alla pista, poi cemento fino al telo
        const floorShape = new THREE.Shape();
        for (let i = 0; i <= 96; i++) { const p = dome(1, (i / 96) * Math.PI * 2); i ? floorShape.lineTo(p.x, -p.z) : floorShape.moveTo(p.x, -p.z); }
        const floor = new THREE.Mesh(new THREE.ShapeGeometry(floorShape), new THREE.MeshStandardMaterial({ color: 0x9a9a94, roughness: 0.85 }));
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.02;
        targetGroup.add(floor);
        const blue = new THREE.Mesh(new THREE.PlaneGeometry(42, 80), new THREE.MeshStandardMaterial({ color: 0x2f5aa8, roughness: 0.6 }));
        blue.rotation.x = -Math.PI / 2;
        blue.position.y = -0.012;
        targetGroup.add(blue);
        // cordolo del pallone
        const curb = [];
        for (let i = 0; i < 96; i++) curb.push([dome(1, i / 96 * Math.PI * 2).setY(0.3), dome(1, (i + 1) / 96 * Math.PI * 2).setY(0.3), 0.3]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(curb), new THREE.MeshStandardMaterial({ color: 0x8a8a84, roughness: 0.9 })));

        // ---------- 5. rete nera sopra le balaustre, tutto intorno alla pista (montanti neri)
        const netTex = loadFileTexture(T + 'net_black.png', { repeat: [1, 1] });
        const netMat = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, depthWrite: false, opacity: 0.85 });
        const NY0 = 1.2, NY1 = 3.4, HW = 18.6, HLN = 36.6, CRN = 8.0;
        const outlinePts = [];
        const cx = HW - CRN, cz = HLN - CRN;
        const addArc = (ox, oz, a0) => { for (let i = 0; i <= 8; i++) { const a = a0 + i / 8 * Math.PI / 2; outlinePts.push([ox + Math.cos(a) * CRN, oz + Math.sin(a) * CRN]); } };
        addArc(cx, cz, 0); addArc(-cx, cz, Math.PI / 2); addArc(-cx, -cz, Math.PI); addArc(cx, -cz, Math.PI * 1.5);
        outlinePts.push(outlinePts[0]);
        const nPos = [], nUv = [], nIdx = [];
        let acc = 0;
        outlinePts.forEach(([x, z], i) => {
            if (i) acc += Math.hypot(x - outlinePts[i - 1][0], z - outlinePts[i - 1][1]);
            nPos.push(x, NY0, z, x, NY1, z);
            nUv.push(acc / 0.1, 0, acc / 0.1, (NY1 - NY0) / 0.1);
            if (i < outlinePts.length - 1) { const a = i * 2; nIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
        });
        const nGeo = new THREE.BufferGeometry();
        nGeo.setAttribute('position', new THREE.Float32BufferAttribute(nPos, 3));
        nGeo.setAttribute('uv', new THREE.Float32BufferAttribute(nUv, 2));
        nGeo.setIndex(nIdx);
        netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping;
        targetGroup.add(new THREE.Mesh(nGeo, netMat));
        const posts = [];
        outlinePts.forEach(([x, z], i) => { if (i % 3 === 0) posts.push([V(x, NY0, z), V(x, NY1, z), 0.04]); });
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(posts), darkMat));

        // ---------- 6. striscioni del Novi Hockey appesi alla rete, in fondo e sui lati
        const bNovi = lit(loadFileTexture(T + 'banner_novi.jpg'), 0.15), bClub = lit(loadFileTexture(T + 'banner_club.jpg'), 0.15);
        const hang = (w, h, mat, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = ry || 0; targetGroup.add(m); };
        hang(4.2, 1.6, bNovi, 5.5, 2.3, -HLN - 0.05);
        hang(4.0, 1.0, bClub, -5.5, 2.2, -HLN - 0.05);
        hang(4.2, 1.6, bNovi, 0, 2.3, HLN + 0.05, Math.PI);
        hang(4.0, 1.0, bClub, -HW - 0.05, 2.2, 12, Math.PI / 2);

        // ---------- 7. gazebo bianco e tavoli del bar sul corridoio (lato -x)
        const gz = new THREE.Group();
        const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.1, 4, 1), whiteMat);
        roof.rotation.y = Math.PI / 4;
        roof.position.y = 2.75;
        gz.add(roof);
        const legs = [];
        [[-1.7, -1.7], [1.7, -1.7], [-1.7, 1.7], [1.7, 1.7]].forEach(([x, z]) => legs.push([V(x, 0, z), V(x, 2.2, z), 0.04]));
        gz.add(new THREE.Mesh(mergeBeamGeometry(legs), whiteMat));
        gz.position.set(-23, 0, -30);
        targetGroup.add(gz);
        const tableMat = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.6 });
        const chairMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5 });
        [[-23.5, -20], [-23.5, -14], [-24, 20]].forEach(([x, z]) => {
            const t = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 1.8), tableMat);
            t.position.set(x, 0.75, z);
            targetGroup.add(t);
            [-0.6, 0.6].forEach(dz => { const c = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.42), chairMat); c.position.set(x - 0.7, 0.23, z + dz); targetGroup.add(c); });
        });

        // ---------- 8. corridoio con la ringhiera nera e il pubblico in piedi (lato -x)
        const X0 = -20.6, Z0 = -24, Z1 = 24;
        const rail = [[V(X0, 1.1, Z0), V(X0, 1.1, Z1), 0.04], [V(X0, 0.55, Z0), V(X0, 0.55, Z1), 0.03]];
        for (let z = Z0; z <= Z1 + 0.01; z += 2) rail.push([V(X0, 0, z), V(X0, 1.1, z), 0.035]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rail), darkMat));
        const outfits = [0xc81e28, 0x141416, 0xf8fafc, 0x374151, 0xc81e28, 0x1d4ed8, 0xf2c94c, 0x15803d];
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
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), getRandomPhotoFaceMaterial());
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
        const keep = preset.crowdKeepRatio;
        [X0 - 0.5, X0 - 1.4].forEach((x, row) => {
            for (let z = Z0 + 0.6; z <= Z1 - 0.6; z += 0.7) if (Math.random() < keep * (0.5 - row * 0.15)) fan(x + (Math.random() - 0.5) * 0.25, 0, z + (Math.random() - 0.5) * 0.2);
        });
    }

    registerArenaBuilder('novi', buildNoviArchitecture);
})();
