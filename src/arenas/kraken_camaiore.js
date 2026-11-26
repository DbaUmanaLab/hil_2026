// Palazzetto "kraken_camaiore": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // PARDINI SPORTING CENTER — CAMAIORE (LU). Tensostruttura a botte "Copriscopri":
    // archi reticolari in acciaio zincato con telo bianco traslucido teso tra uno e l'altro,
    // testate e pareti basse in telo verde scuro, trave reticolare lungo i fianchi,
    // fari a LED e casse sugli archi, reti bianche curve dietro le porte, balaustre avorio
    // con zoccolo senape, parquet multisport e una passerella rialzata per il pubblico in piedi.
    // Texture in assets/textures/kraken_camaiore/ (tools/generate_kraken_camaiore_textures.py).
    // =====================================================================
    function buildKrakenCamaioreArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/kraken_camaiore/';
        const CX = -1.5, A = 26.5, B = 15.5, HL = 40, BAY = 5;
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        const ellPoint = th => V(CX + A * Math.cos(th), B * Math.sin(th), 0);
        const ellNormal = th => V(Math.cos(th) / A, Math.sin(th) / B, 0).normalize();
        const insetPoint = (th, d) => ellPoint(th).addScaledVector(ellNormal(th), -d);

        const steelMat = new THREE.MeshStandardMaterial({ color: 0xc4c9ce, roughness: 0.4, metalness: 0.6 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.5, metalness: 0.3 });
        const whiteTex = loadFileTexture(T + 'membrane_white.jpg', { wrap: true });
        const membraneMat = new THREE.MeshStandardMaterial({ map: whiteTex, color: 0xf2f3f4, emissive: 0xf4f6f8, emissiveMap: whiteTex, emissiveIntensity: 0.55, roughness: 0.9, side: THREE.DoubleSide });
        const greenTex = loadFileTexture(T + 'membrane_green.jpg', { wrap: true });
        const greenMat = new THREE.MeshStandardMaterial({ map: greenTex, roughness: 0.92, side: THREE.DoubleSide });

        // ---------- 1. telo bianco traslucido, leggermente teso verso l'interno tra gli archi
        const nTh = lowQ ? 36 : 64, nZ = (2 * HL / BAY) * (lowQ ? 3 : 6);
        const vPos = [], vUv = [], vIdx = [];
        for (let j = 0; j <= nZ; j++) {
            const z = -HL + 2 * HL * j / nZ;
            const sag = 0.3 * Math.sin(Math.PI * (((z + HL) / BAY) % 1));
            for (let i = 0; i <= nTh; i++) {
                const th = Math.PI * i / nTh;
                const pnt = insetPoint(th, sag * Math.min(1, Math.sin(th) * 2));
                vPos.push(pnt.x, pnt.y, z);
                vUv.push((z + HL) / 8, i / nTh * 6);
            }
        }
        for (let j = 0; j < nZ; j++) for (let i = 0; i < nTh; i++) {
            const a = j * (nTh + 1) + i, b = a + nTh + 1;
            vIdx.push(a, b, a + 1, b, b + 1, a + 1);
        }
        const vault = new THREE.BufferGeometry();
        vault.setAttribute('position', new THREE.Float32BufferAttribute(vPos, 3));
        vault.setAttribute('uv', new THREE.Float32BufferAttribute(vUv, 2));
        vault.setIndex(vIdx);
        vault.computeVertexNormals();
        targetGroup.add(new THREE.Mesh(vault, membraneMat));

        // ---------- 2. archi reticolari in acciaio (due correnti + diagonali a zig-zag)
        const archBeams = [];
        const NSEG = lowQ ? 36 : 60;
        let prevO = null, prevI = null;
        for (let i = 0; i <= NSEG; i++) {
            const th = Math.PI * (0.01 + 0.98 * i / NSEG);
            const o = insetPoint(th, 0.35), inn = insetPoint(th, 1.05);
            if (prevO) {
                archBeams.push([prevO, o, 0.09], [prevI, inn, 0.08]);
                archBeams.push([i % 2 ? prevO : prevI, i % 2 ? inn : o, 0.04]);
            }
            prevO = o; prevI = inn;
        }
        const archGeo = mergeBeamGeometry(archBeams);
        const archCount = 2 * HL / BAY + 1;
        const arches = new THREE.InstancedMesh(archGeo, steelMat, archCount);
        for (let k = 0; k < archCount; k++) { tmpM.makeTranslation(0, 0, -HL + k * BAY); arches.setMatrixAt(k, tmpM); }
        arches.instanceMatrix.needsUpdate = true;
        targetGroup.add(arches);
        // arcarecci tubolari e controventi a croce
        const purl = [];
        [0.16, 0.3, 0.42, 0.5, 0.58, 0.7, 0.84].forEach(f => {
            const p = insetPoint(Math.PI * f, 0.55);
            purl.push([V(p.x, p.y, -HL), V(p.x, p.y, HL), 0.05]);
        });
        if (!lowQ) {
            const brTh = [0.16, 0.3, 0.42, 0.58, 0.7, 0.84];
            for (let k = 0; k < archCount - 1; k += 2) {
                const z0 = -HL + k * BAY, z1 = z0 + BAY;
                for (let q = 0; q < brTh.length - 1; q++) {
                    const a = insetPoint(Math.PI * brTh[q], 0.5), b = insetPoint(Math.PI * brTh[q + 1], 0.5);
                    purl.push([V(a.x, a.y, z0), V(b.x, b.y, z1), 0.015], [V(b.x, b.y, z0), V(a.x, a.y, z1), 0.015]);
                }
            }
        }
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(purl), steelMat));

        // ---------- 3. pareti basse in telo verde e trave reticolare lungo i fianchi
        const SIDE_H = 3.6;
        [CX - A + 1.2, CX + A - 1.2].forEach(x => {
            const s = x < 0 ? 1 : -1;
            const curtain = new THREE.Mesh(new THREE.PlaneGeometry(2 * HL, SIDE_H), greenMat.clone());
            curtain.material.map = loadFileTexture(T + 'membrane_green.jpg', { repeat: [2 * HL / 3, 1] });
            curtain.position.set(x, SIDE_H / 2, 0);
            curtain.rotation.y = s * Math.PI / 2;
            targetGroup.add(curtain);
            const tb = [], yT = SIDE_H + 1.0, yB = SIDE_H + 0.2, xi = x + s * 0.3;
            tb.push([V(xi, yT, -HL), V(xi, yT, HL), 0.06], [V(xi, yB, -HL), V(xi, yB, HL), 0.06]);
            for (let z = -HL, i = 0; z < HL; z += 1.0, i++) tb.push([V(xi, i % 2 ? yT : yB, z), V(xi, i % 2 ? yB : yT, z + 1.0), 0.03]);
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry(tb), steelMat));
        });

        // ---------- 4. testate in telo verde con il cartello COPRISCOPRI
        const endShape = new THREE.Shape();
        endShape.moveTo(CX + A, 0);
        for (let i = 1; i <= 56; i++) { const th = Math.PI * i / 56; endShape.lineTo(CX + A * Math.cos(th), B * Math.sin(th)); }
        endShape.lineTo(CX + A, 0);
        const endGeo = new THREE.ShapeGeometry(endShape, 28);
        const endMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'membrane_green.jpg', { repeat: [1 / 3, 1 / 3] }), roughness: 0.92, side: THREE.DoubleSide });
        const signMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'sign_copriscopri.jpg'), roughness: 0.6 });
        [-1, 1].forEach(dir => {
            const e = new THREE.Mesh(endGeo, endMat);
            e.position.z = dir * HL;
            targetGroup.add(e);
            const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), signMat);
            sg.position.set(CX, B - 2.6, dir * (HL - 0.05));
            sg.rotation.y = dir > 0 ? Math.PI : 0;
            targetGroup.add(sg);
        });

        // ---------- 5. fari a LED e casse acustiche sugli archi
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
        const lampTh = [0.32, 0.68];
        const lampCount = lampTh.length * archCount;
        const lampBox = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.14, 0.4), darkMat, lampCount);
        const lampFace = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.32, 0.32).rotateX(Math.PI / 2), lightMat, lampCount);
        let li = 0;
        for (let k = 0; k < archCount; k++) {
            const z = -HL + k * BAY;
            lampTh.forEach(f => {
                const p = insetPoint(Math.PI * f, 1.25);
                tmpM.makeTranslation(p.x, p.y, z); lampBox.setMatrixAt(li, tmpM);
                tmpM.makeTranslation(p.x, p.y - 0.08, z); lampFace.setMatrixAt(li, tmpM);
                if (!lowQ && k % 2 === 0) {
                    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
                    spr.scale.set(2.2, 2.2, 1);
                    spr.position.set(p.x, p.y - 0.25, z);
                    targetGroup.add(spr);
                }
                li++;
            });
        }
        lampBox.instanceMatrix.needsUpdate = true;
        lampFace.instanceMatrix.needsUpdate = true;
        targetGroup.add(lampBox, lampFace);
        const spkPos = [];
        for (let k = 2; k < archCount - 1; k += 4) [0.12, 0.88].forEach(f => spkPos.push([insetPoint(Math.PI * f, 1.3), -HL + k * BAY]));
        const spk = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, 0.7, 0.45), darkMat, spkPos.length);
        spkPos.forEach(([p, z], i) => { tmpM.makeTranslation(p.x, p.y - 0.5, z); spk.setMatrixAt(i, tmpM); });
        spk.instanceMatrix.needsUpdate = true;
        targetGroup.add(spk);

        // ---------- 6. reti bianche curve dietro le porte (montanti in acciaio, bordo superiore curvo)
        const netTex = loadFileTexture(T + 'net_white.png', { repeat: [1 / 0.12, 1 / 0.12] });   // UV in metri, maglia 12 cm
        const netMat = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, depthWrite: false, opacity: 0.9 });
        [-1, 1].forEach(dir => {
            const zN = dir * 37.4, W2 = 13, NY = 1.15;
            const pos = [], uv = [], idx = [];
            const NX = 26;
            for (let i = 0; i <= NX; i++) {
                const x = -W2 + 2 * W2 * i / NX, t = x / W2;
                const top = 4.6 + 0.9 * t * t;              // bordo più alto ai lati, come nelle foto
                const zz = zN + dir * 0.6 * (1 - t * t);    // leggera curvatura verso l'esterno
                pos.push(x, NY, zz, x, top, zz);
                uv.push(x + W2, 0, x + W2, top - NY);
                if (i < NX) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
            }
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
            g.setIndex(idx);
            targetGroup.add(new THREE.Mesh(g, netMat));
            const posts = [];
            for (let x = -W2; x <= W2 + 0.01; x += 2.6) {
                const t = x / W2, zz = zN + dir * 0.6 * (1 - t * t);
                posts.push([V(x, 0, zz), V(x, 4.6 + 0.9 * t * t, zz), 0.06]);
            }
            posts.push([V(-W2, 1.15, zN), V(W2, 1.15, zN), 0.04]);
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry(posts), steelMat));
        });

        // ---------- 7. striscioni
        const bMats = {};
        const bMat = f => bMats[f] || (bMats[f] = (() => { const t = loadFileTexture(T + f); return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.16, roughness: 0.85, side: THREE.DoubleSide }); })());
        const XE = CX + A - 1.25, XW = CX - A + 1.25;
        [['banner_kraken.jpg', -14], ['banner_phoneisland.jpg', 0], ['banner_kraken.jpg', 14]].forEach(([f, z]) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 1.0), bMat(f));
            m.position.set(XE, 2.6, z); m.rotation.y = -Math.PI / 2; targetGroup.add(m);
        });
        [['banner_phoneisland.jpg', -12], ['banner_kraken.jpg', 12]].forEach(([f, z]) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 1.0), bMat(f));
            m.position.set(XW, 2.8, z); m.rotation.y = Math.PI / 2; targetGroup.add(m);
        });

        // ---------- 8. pavimento in cemento attorno alla pista
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(2 * A, 2 * HL), new THREE.MeshStandardMaterial({ color: 0x9c9d9a, roughness: 0.85 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(CX, -0.01, 0);
        targetGroup.add(apron);

        // ---------- 9. passerella rialzata con parapetto bianco e pubblico in piedi (-x)
        const Z0 = -24, Z1 = 24, LEN = Z1 - Z0, PX0 = -21.2, PX1 = -24.2, PH = 0.9;
        const concrete = new THREE.MeshStandardMaterial({ color: 0xa9aaa7, roughness: 0.9 });
        const deck = new THREE.Mesh(new THREE.BoxGeometry(PX0 - PX1, PH, LEN), concrete);
        deck.position.set((PX0 + PX1) / 2, PH / 2, 0);
        targetGroup.add(deck);
        const panelMat = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.5, side: THREE.DoubleSide });
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(LEN, 1.0), panelMat);
        panel.position.set(PX0 + 0.02, PH + 0.55, 0);
        panel.rotation.y = Math.PI / 2;
        targetGroup.add(panel);
        const frame = [[V(PX0, PH + 1.08, Z0), V(PX0, PH + 1.08, Z1), 0.05], [V(PX0, PH + 0.05, Z0), V(PX0, PH + 0.05, Z1), 0.05]];
        for (let z = Z0; z <= Z1 + 0.01; z += 2.0) frame.push([V(PX0, PH, z), V(PX0, PH + 1.1, z), 0.05], [V(PX0, PH + 0.6, z), V(PX0 - 0.45, PH, z), 0.03]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(frame), steelMat));
        const kick = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, LEN), new THREE.MeshStandardMaterial({ color: 0xa0522d, roughness: 0.7 }));
        kick.position.set(PX0 + 0.05, PH + 0.06, 0);
        targetGroup.add(kick);

        const outfits = [0x1a1f5c, 0x78bee4, 0xf8fafc, 0x374151, 0xe23478, 0x1a1f5c, 0x111114, 0xb45309];
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
        [PX0 - 0.55, PX0 - 1.5].forEach((x, row) => {
            for (let z = Z0 + 0.6; z <= Z1 - 0.6; z += 0.7) if (Math.random() < keep * (0.6 - row * 0.2)) fan(x + (Math.random() - 0.5) * 0.25, PH, z + (Math.random() - 0.5) * 0.2);
        });
    }

    registerArenaBuilder('kraken_camaiore', buildKrakenCamaioreArchitecture);
})();
