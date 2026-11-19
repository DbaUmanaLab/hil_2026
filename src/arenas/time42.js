// Palazzetto "time42": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // 2SKATE ARENA — BERGAMO (Time 4.2). Capannone moderno con travi curve in legno lamellare chiaro
    // che attraversano la sala, soffitto in pannelli OSB con riquadri fonoassorbenti grigi, lampade
    // tonde a sospensione e faretti. Sui lati lunghi vetrate continue dai telai neri con gli alberi
    // fuori, colonne tonde bianche, puntoni inclinati in legno, condotte dell'aria in acciaio.
    // Testate in pannelli grigi con le porte, lo striscione TIME 4.2 e quello della Copa Mass;
    // rete bianca sopra la balaustra di fondo con gli striscioni delle scuole. Pavimento in cemento
    // lucidato, balaustre bianche con la fascia gialla, corridoio del pubblico con il corrimano blu.
    // Texture in assets/textures/time42/ (tools/generate_time42_textures.py).
    // =====================================================================
    function buildTime42Architecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/time42/';
        const XW = 25, ZE = 41;                 // pareti laterali a x = ±XW, testate a z = ±ZE
        // intradosso delle travi all'imposta e in chiave: la pista del gioco è ~1,8 volte quella vera,
        // quindi anche la sala è scalata (e resta sopra le telecamere del tour, che salgono a ~11 m)
        const Y0 = 10, Y1 = 14;
        const BAY = 6.5, NB = 13;               // travi a z = -39 ... +39
        const yC = x => Y0 + (Y1 - Y0) * (1 - (x / XW) ** 2);   // quota del soffitto
        const slope = x => -2 * (Y1 - Y0) * x / (XW * XW);
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        const beamZ = k => -BAY * (NB - 1) / 2 + k * BAY;

        const woodMat = new THREE.MeshStandardMaterial({
            map: loadFileTexture(CIT_TEX + 'glulam.jpg', { wrap: true }),
            normalMap: loadFileTexture(CIT_TEX + 'glulam_n.jpg', { wrap: true }),
            normalScale: new THREE.Vector2(0.5, 0.5), color: 0xf6e2c2, roughness: 0.6
        });
        const osbTex = loadFileTexture(T + 'osb.jpg', { wrap: true });
        const osbMat = new THREE.MeshStandardMaterial({ map: osbTex, color: 0xffffff, emissive: 0x6a4a28, emissiveMap: osbTex, emissiveIntensity: 0.35, roughness: 0.85, side: THREE.DoubleSide });
        const acMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'acoustic.jpg'), emissive: 0x9a9a96, emissiveIntensity: 0.3, roughness: 0.95, side: THREE.DoubleSide });
        const wallTex = loadFileTexture(T + 'wall_grey.jpg', { wrap: true });
        const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85, side: THREE.DoubleSide });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf2f2ef, roughness: 0.6 });
        const steelMat = new THREE.MeshStandardMaterial({ color: 0xc4c8cc, roughness: 0.3, metalness: 0.7 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x1d1f23, roughness: 0.5, metalness: 0.3 });
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
        const glow = (p, s, o) => {
            if (lowQ) return;
            const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfffaf0, transparent: true, opacity: o || 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
            spr.scale.set(s, s, 1);
            spr.position.copy(p);
            ceilGroup.add(spr);
        };

        // soffitto (pannelli, lampade): nascosto se una telecamera sale sopra il tetto
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: Y1 - 0.6 };

        // ---------- 1. soffitto curvo in pannelli OSB
        const NX = lowQ ? 24 : 48;
        const cPos = [], cUv = [], cIdx = [];
        [-ZE, ZE].forEach(z => {
            for (let i = 0; i <= NX; i++) {
                const x = -XW + 2 * XW * i / NX;
                cPos.push(x, yC(x) + 0.5, z);
                cUv.push(x / 2.4, z / 2.4);
            }
        });
        for (let i = 0; i < NX; i++) cIdx.push(i, i + 1, NX + 1 + i, i + 1, NX + 2 + i, NX + 1 + i);
        const ceilGeo = new THREE.BufferGeometry();
        ceilGeo.setAttribute('position', new THREE.Float32BufferAttribute(cPos, 3));
        ceilGeo.setAttribute('uv', new THREE.Float32BufferAttribute(cUv, 2));
        ceilGeo.setIndex(cIdx);
        ceilGeo.computeVertexNormals();
        ceilGroup.add(new THREE.Mesh(ceilGeo, osbMat));

        // ---------- 2. riquadri fonoassorbenti grigi, una fila per campata
        const panX = [-17, -8.5, 0, 8.5, 17];
        const panels = new THREE.InstancedMesh(new THREE.BoxGeometry(5.6, 0.05, 3.8), acMat, panX.length * (NB - 1));
        const q = new THREE.Quaternion(), e = new THREE.Euler(), one = V(1, 1, 1);
        let pi = 0;
        for (let k = 0; k < NB - 1; k++) {
            const z = beamZ(k) + BAY / 2;
            panX.forEach(x => {
                q.setFromEuler(e.set(0, 0, Math.atan(slope(x))));
                tmpM.compose(V(x, yC(x) + 0.44, z), q, one);
                panels.setMatrixAt(pi++, tmpM);
            });
        }
        panels.instanceMatrix.needsUpdate = true;
        ceilGroup.add(panels);

        // ---------- 3. travi curve in legno lamellare (sezione alta e stretta) e colonne/puntoni
        const beamPts = [];
        for (let i = 0; i <= 32; i++) { const x = -XW + 2 * XW * i / 32; beamPts.push(V(x, yC(x), 0)); }
        const beamShape = new THREE.Shape();
        // x della sezione = normale della curva (in verticale), y = lungo z (binormale)
        beamShape.moveTo(-0.5, -0.18); beamShape.lineTo(0.5, -0.18); beamShape.lineTo(0.5, 0.18); beamShape.lineTo(-0.5, 0.18); beamShape.lineTo(-0.5, -0.18);
        const beamGeo = new THREE.ExtrudeGeometry(beamShape, { steps: lowQ ? 24 : 48, bevelEnabled: false, extrudePath: new THREE.CatmullRomCurve3(beamPts) });
        const beams = new THREE.InstancedMesh(beamGeo, woodMat, NB);
        for (let k = 0; k < NB; k++) { tmpM.makeTranslation(0, 0, beamZ(k)); beams.setMatrixAt(k, tmpM); }
        beams.instanceMatrix.needsUpdate = true;
        targetGroup.add(beams);
        // colonne tonde bianche sotto le travi, puntoni inclinati in legno verso l'interno
        const colGeo = new THREE.CylinderGeometry(0.3, 0.3, Y0, 16);
        const cols = new THREE.InstancedMesh(colGeo, whiteMat, NB * 2);
        const struts = [];
        let ci = 0;
        for (let k = 0; k < NB; k++) {
            const z = beamZ(k);
            [-1, 1].forEach(s => {
                tmpM.makeTranslation(s * (XW - 1.0), Y0 / 2, z);
                cols.setMatrixAt(ci++, tmpM);
                struts.push([V(s * (XW - 1.2), 0.6, z), V(s * (XW - 4.6), yC(XW - 4.6) - 0.5, z), 0.3]);
            });
        }
        cols.instanceMatrix.needsUpdate = true;
        targetGroup.add(cols);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(struts), woodMat));

        // ---------- 4. lampade tonde a sospensione e faretti a incasso
        const pendX = [-10, 0, 10], spotX = [-17, -4.5, 4.5, 17];
        const nPend = pendX.length * (NB - 1), nSpot = spotX.length * NB;
        const pendBody = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 20), darkMat, nPend);
        const pendFace = new THREE.InstancedMesh(new THREE.CircleGeometry(0.36, 20).rotateX(Math.PI / 2), lightMat, nPend);
        const spotFace = new THREE.InstancedMesh(new THREE.CircleGeometry(0.16, 12).rotateX(Math.PI / 2), lightMat, nSpot);
        const rods = [];
        let li = 0;
        for (let k = 0; k < NB - 1; k++) {
            const z = beamZ(k) + BAY / 2 + 1.8;
            pendX.forEach(x => {
                const y = yC(x) - 1.0;
                tmpM.makeTranslation(x, y, z); pendBody.setMatrixAt(li, tmpM);
                tmpM.makeTranslation(x, y - 0.05, z); pendFace.setMatrixAt(li, tmpM);
                rods.push([V(x, y, z), V(x, yC(x) + 0.45, z), 0.02]);
                if (k % 2 === 0) glow(V(x, y - 0.25, z), 2.4, 0.55);
                li++;
            });
        }
        let si = 0;
        for (let k = 0; k < NB; k++) {
            const z = beamZ(k) + BAY / 2;
            spotX.forEach(x => {
                tmpM.makeTranslation(x, yC(x) + 0.4, z - 1.9);
                spotFace.setMatrixAt(si++, k < NB - 1 ? tmpM : tmpM.makeScale(0, 0, 0));
            });
        }
        [pendBody, pendFace, spotFace].forEach(m => { m.instanceMatrix.needsUpdate = true; ceilGroup.add(m); });
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(rods), darkMat));

        // ---------- 5. vetrate continue sui lati lunghi, parete grigia sopra
        const winTex = loadFileTexture(T + 'window.jpg', { repeat: [2 * ZE / 3, 1] });
        const winMat = new THREE.MeshStandardMaterial({ map: winTex, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.1, side: THREE.DoubleSide });
        const WH = 7.5;
        [-1, 1].forEach(s => {
            const w = new THREE.Mesh(new THREE.PlaneGeometry(2 * ZE, WH), winMat);
            w.position.set(s * XW, 0.3 + WH / 2, 0);
            w.rotation.y = -s * Math.PI / 2;
            targetGroup.add(w);
            const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 2 * ZE), wallMat);
            plinth.position.set(s * XW, 0.15, 0);
            targetGroup.add(plinth);
            const upper = new THREE.Mesh(new THREE.PlaneGeometry(2 * ZE, Y0 + 0.6 - (0.3 + WH)), wallMat);
            upper.position.set(s * XW, (0.3 + WH + Y0 + 0.6) / 2, 0);
            upper.rotation.y = -s * Math.PI / 2;
            targetGroup.add(upper);
            // condotta dell'aria in acciaio lungo il lato, con i climatizzatori sulle colonne
            const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 2 * ZE - 2, lowQ ? 10 : 20), steelMat);
            duct.rotation.x = Math.PI / 2;
            duct.position.set(s * (XW - 2.2), 8.2, 0);
            targetGroup.add(duct);
            for (let k = 1; k < NB - 1; k += 3) {
                const ac = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 1.1), whiteMat);
                ac.position.set(s * (XW - 1.5), 6.0, beamZ(k));
                targetGroup.add(ac);
            }
        });

        // ---------- 6. testate in pannelli grigi con porte e striscioni
        const endShape = new THREE.Shape();
        endShape.moveTo(-XW, 0); endShape.lineTo(XW, 0);
        for (let i = 0; i <= 32; i++) { const x = XW - 2 * XW * i / 32; endShape.lineTo(x, yC(x) + 0.5); }
        const endGeo = new THREE.ShapeGeometry(endShape, 16);
        const ep = endGeo.attributes.position, eu = endGeo.attributes.uv;
        for (let i = 0; i < ep.count; i++) eu.setXY(i, ep.getX(i) / 6, ep.getY(i) / 6);
        const doorMat = new THREE.MeshStandardMaterial({ color: 0xd8dadc, roughness: 0.5, metalness: 0.2 });
        const bMats = {};
        const bMat = f => bMats[f] || (bMats[f] = (() => { const t = loadFileTexture(T + f); return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.16, roughness: 0.85, side: THREE.DoubleSide }); })());
        const hang = (f, w, h, x, y, z, rotY) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bMat(f)); m.position.set(x, y, z); m.rotation.y = rotY || 0; targetGroup.add(m); };
        [-1, 1].forEach(dir => {
            const wall = new THREE.Mesh(endGeo, wallMat);
            wall.position.z = dir * ZE;
            targetGroup.add(wall);
            [-15, -6, 6, 15].forEach(x => {
                const d = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.3, 0.08), doorMat);
                d.position.set(x, 1.15, dir * (ZE - 0.05));
                targetGroup.add(d);
            });
        });
        hang('banner_time42.jpg', 8.0, 3.2, -6, 4.4, -ZE + 0.12);
        hang('banner_copamass.jpg', 2.6, 3.25, 7.5, 4.4, -ZE + 0.12);
        hang('banner_copamass.jpg', 2.4, 3.0, -XW + 0.12, 9.0, 10, Math.PI / 2);

        // ---------- 7. rete bianca sopra la balaustra di fondo con gli striscioni delle scuole
        const netTex = loadFileTexture(T + 'net_white.png', { repeat: [36 / 0.1, 3.4 / 0.1] });
        const netMat = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, depthWrite: false, opacity: 0.8 });
        const NZ = rinkLength / 2 + 0.25;
        const net = new THREE.Mesh(new THREE.PlaneGeometry(rinkWidth - 2 * cornerRadius + 4, 3.4), netMat);
        net.position.set(0, 1.15 + 1.7, NZ);
        targetGroup.add(net);
        const netBar = [[V(-12.5, 4.55, NZ), V(12.5, 4.55, NZ), 0.06]];
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(netBar), steelMat));
        hang('banner_scuola.jpg', 2.8, 1.4, -5.5, 2.6, NZ + 0.05, Math.PI);
        hang('banner_movimento.jpg', 2.8, 1.4, -2.2, 2.6, NZ + 0.05, Math.PI);

        // ---------- 8. corridoio del pubblico (lato -x): corrimano blu sulla balaustra, gradone con panca
        const blueMat = new THREE.MeshStandardMaterial({ color: 0x1d4fb8, roughness: 0.4, metalness: 0.3 });
        const railX = -rinkWidth / 2 - 0.13;
        const zr = rinkLength / 2 - cornerRadius;
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry([[V(railX, 1.24, -zr), V(railX, 1.24, zr), 0.08]]), blueMat));
        const posts = [];
        for (let z = -zr; z <= zr + 0.01; z += 2.5) posts.push([V(railX, 1.1, z), V(railX, 1.24, z), 0.06]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(posts), steelMat));
        const concMat = new THREE.MeshStandardMaterial({ color: 0xc9cbcc, roughness: 0.8 });
        const benchWood = new THREE.MeshStandardMaterial({ map: loadFileTexture(CIT_TEX + 'glulam.jpg', { wrap: true }), color: 0xd9a868, roughness: 0.6 });
        [[-24, -5], [5, 24]].forEach(([z0, z1]) => {
            const step = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, z1 - z0), concMat);
            step.position.set(-22.6, 0.225, (z0 + z1) / 2);
            targetGroup.add(step);
            const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, z1 - z0 - 0.6), benchWood);
            seat.position.set(-22.4, 0.48, (z0 + z1) / 2);
            targetGroup.add(seat);
        });

        // ---------- 9. pavimento di servizio in cemento lucidato
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(2 * XW, 2 * ZE), new THREE.MeshStandardMaterial({ color: 0xb2b4b6, roughness: 0.3, metalness: 0.05 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.y = -0.01;
        targetGroup.add(apron);

        // ---------- 10. pubblico in piedi lungo il corridoio (genitori, compagni di squadra)
        const outfits = [0x141416, 0xf6c400, 0x38bad6, 0xf8fafc, 0x141416, 0x92c23a, 0x4b5563, 0xac60a6];
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
            root.rotation.y = (Math.random() - 0.5) * 0.4;      // 0 = guarda verso la pista (+x)
            const childLift = maybeMakeCrowdChild(root, headGroup, false);
            targetGroup.add(root);
            crowdMembers.push({ mesh: root, bodyPivot, headGroup, leftArmPivot, rightArmPivot, baseY: y + childLift, phase: Math.random() * Math.PI * 2, standing: true });
        };
        const keep = preset.crowdKeepRatio;
        for (let z = -26; z <= 26; z += 0.75) {
            if (Math.abs(z) < 4.5) continue;                     // tavolo cronometristi
            if (Math.random() < keep * 0.4) fan(-19.6 + (Math.random() - 0.5) * 0.3, 0, z + (Math.random() - 0.5) * 0.2);
            if (Math.random() < keep * 0.22) fan(-22.6 + (Math.random() - 0.5) * 0.2, 0.45, z);
        }
    }

    registerArenaBuilder('time42', buildTime42Architecture);
})();
