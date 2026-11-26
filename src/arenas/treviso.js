// Palazzetto "treviso": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // PATTINODROMO DELLE ACQUETTE — TREVISO (Sporting Treviso). Tensostruttura a botte:
    // reticolo d'acciaio grigio a triangoli con il telo bianco, impostato su pilastri in cemento
    // con le vetrate verde scuro in mezzo. Pista in cemento lucidato grigio chiaro, balaustre bianche
    // con lo zoccolo verde e gli striscioni, testate in pannelli grigi con il grigliato alto,
    // bandiere tricolori appese alla struttura, fari tondi e casse, reti dietro le porte.
    // Texture in assets/textures/treviso/ (tools/generate_treviso_textures.py).
    // =====================================================================
    function buildTrevisoArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/treviso/';
        const CX = -1.5, A = 26.5, SPRING = 4.2, RISE = 12.2, HL = 42;
        // sezione della volta: semiellisse impostata a SPRING, th 0 = lato +x, PI = lato -x
        const arch = th => new THREE.Vector3(CX + A * Math.cos(th), SPRING + RISE * Math.sin(th), 0);
        const archN = th => new THREE.Vector3(Math.cos(th) / A, Math.sin(th) / RISE, 0).normalize();
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        const steelMat = new THREE.MeshStandardMaterial({ color: 0x8e959c, roughness: 0.4, metalness: 0.6 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.5, metalness: 0.3 });
        const lit = (t, k) => new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: k || 0.15, roughness: 0.8, side: THREE.DoubleSide });

        // soffitto (telo, reticolo, fari, bandiere): nascosto se una telecamera sale sopra la volta
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: 14.2 };

        // ---------- 1. telo bianco della volta
        const NTH = lowQ ? 36 : 64;
        const vPos = [], vUv = [], vIdx = [];
        for (let j = 0; j <= 1; j++) {
            const z = -HL + 2 * HL * j;
            for (let i = 0; i <= NTH; i++) {
                const p = arch(Math.PI * i / NTH).addScaledVector(archN(Math.PI * i / NTH), 0.25);
                vPos.push(p.x, p.y, z);
                vUv.push(z / 8, i / NTH * 6);
            }
        }
        for (let i = 0; i < NTH; i++) vIdx.push(i, i + NTH + 1, i + 1, i + 1, i + NTH + 1, i + NTH + 2);
        const vault = new THREE.BufferGeometry();
        vault.setAttribute('position', new THREE.Float32BufferAttribute(vPos, 3));
        vault.setAttribute('uv', new THREE.Float32BufferAttribute(vUv, 2));
        vault.setIndex(vIdx);
        vault.computeVertexNormals();
        const memTex = loadFileTexture(T + 'membrane.jpg', { wrap: true });
        ceilGroup.add(new THREE.Mesh(vault, new THREE.MeshStandardMaterial({ map: memTex, color: 0xd9dcdf, emissive: 0xe8ecf0, emissiveMap: memTex, emissiveIntensity: 0.22, roughness: 0.9, side: THREE.DoubleSide })));

        // ---------- 2. reticolo a triangoli: file di nodi lungo la volta, sfalsate di mezzo passo
        const ROWS = lowQ ? 14 : 20, D = lowQ ? 4.2 : 3.0;
        const rows = [];
        for (let k = 0; k <= ROWS; k++) {
            const th = Math.PI * (0.02 + 0.96 * k / ROWS);
            const base = arch(th);
            const nodes = [];
            const off = (k % 2) * D / 2;
            for (let z = -HL + off; z <= HL + 0.01; z += D) nodes.push(V(base.x, base.y, z));
            rows.push(nodes);
        }
        const beams = [];
        rows.forEach(r => { for (let i = 0; i < r.length - 1; i++) beams.push([r[i], r[i + 1], 0.05]); });
        for (let k = 0; k < rows.length - 1; k++) {
            const a = rows[k], b = rows[k + 1];
            a.forEach(p => b.forEach(q => { if (Math.abs(p.z - q.z) < D * 0.6) beams.push([p, q, 0.04]); }));
        }
        // archi trasversali principali ogni 3 campate
        for (let z = -HL; z <= HL + 0.01; z += D * 3) {
            let prev = null;
            for (let i = 0; i <= 28; i++) {
                const p = arch(Math.PI * (0.02 + 0.96 * i / 28)); p.z = z;
                if (prev) beams.push([prev, p, 0.08]);
                prev = p;
            }
        }
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(beams), steelMat));

        // ---------- 3. fari tondi su due file, casse e bandiere tricolori appese
        const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
        const spots = [];
        [0.36, 0.64].forEach(f => { for (let z = -36; z <= 36.01; z += 6) spots.push(arch(Math.PI * f).add(V(0, -0.5, z))); });
        const lampBody = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.38, 0.3, 12), darkMat, spots.length);
        const lampFace = new THREE.InstancedMesh(new THREE.CircleGeometry(0.32, 14).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffdf4, side: THREE.DoubleSide }), spots.length);
        spots.forEach((p, i) => {
            tmpM.makeTranslation(p.x, p.y, p.z); lampBody.setMatrixAt(i, tmpM);
            tmpM.makeTranslation(p.x, p.y - 0.16, p.z); lampFace.setMatrixAt(i, tmpM);
            if (!lowQ && i % 2 === 0) {
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xf8fbff, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(2.6, 2.6, 1);
                spr.position.set(p.x, p.y - 0.4, p.z);
                ceilGroup.add(spr);
            }
        });
        lampBody.instanceMatrix.needsUpdate = true;
        lampFace.instanceMatrix.needsUpdate = true;
        ceilGroup.add(lampBody, lampFace);
        [0.2, 0.8].forEach(f => [-24, 0, 24].forEach(z => {
            const p = arch(Math.PI * f);
            const spk = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.6), darkMat);
            spk.position.set(p.x - Math.sign(p.x - CX) * 0.6, p.y - 0.9, z);
            ceilGroup.add(spk);
        }));
        const flagMat = lit(loadFileTexture(T + 'flag_italy.jpg'), 0.12);
        [0.17, 0.83].forEach(f => { for (let z = -30; z <= 30.01; z += 10) {
            const p = arch(Math.PI * f);
            const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.5), flagMat);
            fl.position.set(p.x - Math.sign(p.x - CX) * 0.9, p.y - 1.6, z);
            fl.rotation.y = Math.PI / 2;
            ceilGroup.add(fl);
        } });

        // ---------- 4. fianchi: pilastri in cemento con le vetrate verdi
        const concreteMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'concrete.jpg', { wrap: true }), roughness: 0.85 });
        const glassMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'glass_green.jpg', { repeat: [2 * HL / 6, 1] }), roughness: 0.3, metalness: 0.2, side: THREE.DoubleSide });
        glassMat.userData.sunWindow = true;            // finestra verso l'esterno: di giorno ci entra il sole (index.html)
        [arch(0).x, arch(Math.PI).x].forEach(x => {
            const s = x > CX ? -1 : 1;
            const g = new THREE.Mesh(new THREE.PlaneGeometry(2 * HL, SPRING), glassMat);
            g.position.set(x + s * 0.05, SPRING / 2, 0);
            g.rotation.y = s * Math.PI / 2;
            targetGroup.add(g);
            const pil = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, SPRING, 0.7), concreteMat, Math.floor(2 * HL / 6) + 1);
            let n = 0;
            for (let z = -HL; z <= HL + 0.01; z += 6) { tmpM.makeTranslation(x + s * 0.35, SPRING / 2, z); pil.setMatrixAt(n++, tmpM); }
            pil.count = n;
            pil.instanceMatrix.needsUpdate = true;
            targetGroup.add(pil);
            const beam = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 2 * HL), concreteMat);
            beam.position.set(x + s * 0.3, SPRING - 0.25, 0);
            targetGroup.add(beam);
        });

        // ---------- 5. testate: pannelli grigi con il grigliato alto (sagoma della volta)
        const endShape = new THREE.Shape();
        endShape.moveTo(arch(0).x, 0);
        endShape.lineTo(arch(0).x, SPRING);
        for (let i = 1; i <= 48; i++) { const p = arch(Math.PI * i / 48); endShape.lineTo(p.x, p.y + 0.25); }
        endShape.lineTo(arch(Math.PI).x, 0);
        const endGeo = new THREE.ShapeGeometry(endShape, 24);
        // UV in metri sulla testata: la texture copre tutta la sagoma
        const uvA = endGeo.attributes.uv, posA = endGeo.attributes.position;
        for (let i = 0; i < uvA.count; i++) uvA.setXY(i, (posA.getX(i) - (CX - A)) / (2 * A), posA.getY(i) / (SPRING + RISE));
        const endMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'end_wall.jpg'), roughness: 0.85, side: THREE.DoubleSide });
        [-1, 1].forEach(dir => { const e = new THREE.Mesh(endGeo, endMat); e.position.z = dir * HL; targetGroup.add(e); });
        // grande striscione sulla testata -z e striscione del club su quella +z
        const ban = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), lit(loadFileTexture(T + 'banner_end.jpg'), 0.18));
        ban.position.set(CX + 3, 3.4, -HL + 0.1);
        targetGroup.add(ban);
        const cb = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), lit(loadFileTexture(T + 'banner_club.jpg'), 0.18));
        cb.position.set(CX, 3.4, HL - 0.1);
        cb.rotation.y = Math.PI;
        targetGroup.add(cb);

        // ---------- 6. pavimento in cemento attorno alla pista
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(2 * A, 2 * HL), new THREE.MeshStandardMaterial({ color: 0xbfc3c5, roughness: 0.35, metalness: 0.05 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(CX, -0.01, 0);
        targetGroup.add(apron);

        // ---------- 7. reti dietro le porte con i montanti verdi
        const greenMat = new THREE.MeshStandardMaterial({ color: 0x15964a, roughness: 0.5 });
        const netTex = loadFileTexture(T + 'net_white.png', { repeat: [1 / 0.12, 1 / 0.12] });
        const netMat = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, depthWrite: false, opacity: 0.85 });
        [-1, 1].forEach(dir => {
            const zN = dir * 37.4, W2 = 12, NY = 1.15, TOP = 6;
            const g = new THREE.PlaneGeometry(2 * W2, TOP - NY);
            const uv = g.attributes.uv;
            for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2 * W2, uv.getY(i) * (TOP - NY));
            const net = new THREE.Mesh(g, netMat);
            net.position.set(0, (NY + TOP) / 2, zN);
            targetGroup.add(net);
            const posts = [];
            for (let x = -W2; x <= W2 + 0.01; x += 4) posts.push([V(x, 0, zN), V(x, TOP, zN), 0.07]);
            posts.push([V(-W2, TOP, zN), V(W2, TOP, zN), 0.04]);
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry(posts), greenMat));
        });

        // ---------- 8. pubblico in piedi dietro la ringhiera (lato -x)
        const X0 = -21.0, Z0 = -22, Z1 = 22;
        const rail = [[V(X0, 1.1, Z0), V(X0, 1.1, Z1), 0.04], [V(X0, 0.55, Z0), V(X0, 0.55, Z1), 0.03]];
        for (let z = Z0; z <= Z1 + 0.01; z += 2) rail.push([V(X0, 0, z), V(X0, 1.1, z), 0.035]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rail), darkMat));
        const outfits = [0x1c48aa, 0xf6d61e, 0xf8fafc, 0x111827, 0x374151, 0x1c48aa, 0xb91c1c, 0x15803d];
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
        [X0 - 0.5, X0 - 1.4, X0 - 2.3].forEach((x, row) => {
            for (let z = Z0 + 0.6; z <= Z1 - 0.6; z += 0.7) if (Math.random() < keep * (0.55 - row * 0.15)) fan(x + (Math.random() - 0.5) * 0.25, 0, z + (Math.random() - 0.5) * 0.2);
        });
    }

    registerArenaBuilder('treviso', buildTrevisoArchitecture);
})();
