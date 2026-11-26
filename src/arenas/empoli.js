// Palazzetto "empoli": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // PALARAMINI — EMPOLI (Flying Donkeys). Tensostruttura a botte su archi in legno lamellare
    // color rame che scendono fino a terra, telo crema tra un arco e l'altro con arcarecci in legno
    // e controventi in acciaio, proiettori fissati sotto gli archi. Testate in telo verde scuro con il
    // telaio di legno a riquadri e il tabellone LOCALI/OSPITI appeso in alto. Pista in resina chiara,
    // balaustre bianche con pannelli trasparenti a telaio metallico, striscione U.I.S.P. e cartelli blu,
    // in fondo le rampe dello skatepark.
    // Texture in assets/textures/empoli/ (tools/generate_empoli_textures.py).
    // =====================================================================
    function buildEmpoliArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/empoli/';
        // volta: semiellisse in x (A semiasse orizzontale, B altezza), archi ogni BAY lungo z
        const A = 25, B = 13.5, HL = 42, BAY = 6;
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        const ellPoint = th => V(A * Math.cos(th), B * Math.sin(th), 0);
        const ellNormal = th => V(Math.cos(th) / A, Math.sin(th) / B, 0).normalize();
        const insetPoint = (th, d) => ellPoint(th).addScaledVector(ellNormal(th), -d);

        const woodMat = new THREE.MeshStandardMaterial({
            map: loadFileTexture(CIT_TEX + 'glulam.jpg', { wrap: true }),
            normalMap: loadFileTexture(CIT_TEX + 'glulam_n.jpg', { wrap: true }),
            normalScale: new THREE.Vector2(0.6, 0.6), color: 0xb86a3c, roughness: 0.55
        });
        const memTex = loadFileTexture(T + 'membrane.jpg', { wrap: true });
        const membraneMat = new THREE.MeshStandardMaterial({
            map: memTex, color: 0xf1e7d0, emissive: 0xefe2c2, emissiveMap: memTex, emissiveIntensity: 0.26,
            roughness: 0.9, side: THREE.DoubleSide
        });
        const greenTex = loadFileTexture(T + 'membrane_green.jpg', { wrap: true, repeat: [6, 3] });
        const greenMat = new THREE.MeshStandardMaterial({ map: greenTex, color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide });
        const steelMat = new THREE.MeshStandardMaterial({ color: 0xb8bec4, roughness: 0.35, metalness: 0.6 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.45, metalness: 0.4 });
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        // soffitto (telo, arcarecci, fari): nascosto se una telecamera sale sopra la volta
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: B - 0.8 };

        // ---------- 1. telo della volta, leggermente gonfio tra un arco e l'altro
        const nTh = lowQ ? 36 : 64, nZ = (2 * HL / BAY) * (lowQ ? 3 : 6);
        const vPos = [], vUv = [], vIdx = [];
        for (let j = 0; j <= nZ; j++) {
            const z = -HL + 2 * HL * j / nZ;
            const sag = 0.3 * Math.sin(Math.PI * (((z + HL) / BAY) % 1));
            for (let i = 0; i <= nTh; i++) {
                const th = Math.PI * i / nTh;
                const pnt = insetPoint(th, -sag * Math.min(1, Math.sin(th) * 3));
                vPos.push(pnt.x, pnt.y, z);
                vUv.push((z + HL) / 8, i / nTh * 7);
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
        ceilGroup.add(new THREE.Mesh(vault, membraneMat));

        // ---------- 2. archi in legno lamellare a sezione rettangolare, fino a terra
        const archPts = [];
        for (let i = 0; i <= 48; i++) archPts.push(insetPoint(Math.PI * i / 48, 0.45));
        const archShape = new THREE.Shape();
        // x della sezione = direzione radiale dell'arco, y = lungo z (ExtrudeGeometry: normale/binormale)
        archShape.moveTo(-0.42, -0.16); archShape.lineTo(0.42, -0.16); archShape.lineTo(0.42, 0.16); archShape.lineTo(-0.42, 0.16); archShape.lineTo(-0.42, -0.16);
        const archGeo = new THREE.ExtrudeGeometry(archShape, { steps: lowQ ? 40 : 80, bevelEnabled: false, extrudePath: new THREE.CatmullRomCurve3(archPts) });
        const archCount = 2 * HL / BAY + 1;
        const arches = new THREE.InstancedMesh(archGeo, woodMat, archCount);
        for (let k = 0; k < archCount; k++) {
            tmpM.makeTranslation(0, 0, -HL + k * BAY + (k === 0 ? 0.25 : (k === archCount - 1 ? -0.25 : 0)));
            arches.setMatrixAt(k, tmpM);
        }
        arches.instanceMatrix.needsUpdate = true;
        targetGroup.add(arches);
        // arcarecci longitudinali in legno
        const purlinTh = [0.1, 0.22, 0.35, 0.5, 0.65, 0.78, 0.9];
        purlinTh.forEach(f => {
            const th = Math.PI * f, pnt = insetPoint(th, 0.5), nn = ellNormal(th);
            const purlin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 2 * HL), woodMat);
            purlin.position.set(pnt.x, pnt.y, 0);
            purlin.rotation.z = Math.atan2(nn.x, -nn.y);
            ceilGroup.add(purlin);
        });
        // controventi in acciaio a croce nei riquadri di testata e al centro
        if (!lowQ) {
            const pts = [];
            [0, 1, archCount / 2 - 1, archCount - 3, archCount - 2].forEach(kf => {
                const k = Math.floor(kf), z0 = -HL + k * BAY, z1 = z0 + BAY;
                for (let q = 0; q < purlinTh.length - 1; q++) {
                    const a = insetPoint(Math.PI * purlinTh[q], 0.55), b = insetPoint(Math.PI * purlinTh[q + 1], 0.55);
                    pts.push(a.x, a.y, z0, b.x, b.y, z1, b.x, b.y, z0, a.x, a.y, z1);
                }
            });
            const cg = new THREE.BufferGeometry();
            cg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
            ceilGroup.add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: 0x8c9198 })));
        }

        // ---------- 3. proiettori rettangolari fissati sotto gli archi, puntati verso la pista
        const lampTh = [0.3, 0.4, 0.6, 0.7];
        const lampArches = [];
        for (let k = 1; k < archCount - 1; k += 2) lampArches.push(k);
        const lampCount = lampTh.length * lampArches.length;
        const lampBox = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.34, 0.5), darkMat, lampCount);
        const lampFace = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.5, 0.38), lightMat, lampCount);
        const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
        const qq = new THREE.Quaternion(), ss = new THREE.Vector3(1, 1, 1), zAxis = V(0, 0, 1);
        let li = 0;
        lampArches.forEach(k => {
            const z = -HL + k * BAY;
            lampTh.forEach(f => {
                const pnt = insetPoint(Math.PI * f, 1.0);
                pnt.z = z;
                const aim = V(-pnt.x * 0.35, -pnt.y, 0).normalize();     // verso il centro pista
                qq.setFromUnitVectors(zAxis, aim);
                tmpM.compose(pnt, qq, ss); lampBox.setMatrixAt(li, tmpM);
                tmpM.compose(pnt.clone().addScaledVector(aim, 0.26), qq, ss); lampFace.setMatrixAt(li, tmpM);
                if (!lowQ) {
                    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xf4f8ff, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
                    spr.scale.set(2.4, 2.4, 1);
                    spr.position.copy(pnt).addScaledVector(aim, 0.5);
                    ceilGroup.add(spr);
                }
                li++;
            });
        });
        lampBox.instanceMatrix.needsUpdate = true;
        lampFace.instanceMatrix.needsUpdate = true;
        ceilGroup.add(lampBox, lampFace);

        // ---------- 4. testate in telo verde scuro con il telaio di legno a riquadri
        const endShape = new THREE.Shape();
        endShape.moveTo(A, 0);
        for (let i = 1; i <= 48; i++) { const th = Math.PI * i / 48; endShape.lineTo(A * Math.cos(th), B * Math.sin(th)); }
        endShape.lineTo(A, 0);
        const endGeo = new THREE.ShapeGeometry(endShape, 24);
        // UV in metri, così la texture del telo non si stira
        const ep = endGeo.attributes.position, eu = endGeo.attributes.uv;
        for (let i = 0; i < ep.count; i++) eu.setXY(i, ep.getX(i) / 8, ep.getY(i) / 8);
        greenTex.repeat.set(1, 1);
        const frame = [];
        [-1, 1].forEach(dir => {
            const zf = dir * HL;
            const e = new THREE.Mesh(endGeo, greenMat);
            e.position.z = zf;
            targetGroup.add(e);
            const zt = zf - dir * 0.2;
            // montanti verticali fino all'arco
            [-18, -12, -6, 0, 6, 12, 18].forEach(x => {
                const yTop = B * Math.sqrt(Math.max(0, 1 - (x / A) ** 2)) - 0.4;
                frame.push([V(x, 0, zt), V(x, yTop, zt), 0.26]);
            });
            // traversi orizzontali
            [3.2, 7.4].forEach(y => {
                const xw = A * Math.sqrt(Math.max(0, 1 - (y / B) ** 2)) - 0.5;
                frame.push([V(-xw, y, zt), V(xw, y, zt), 0.22]);
            });
        });
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(frame), woodMat));

        // ---------- 5. telaio metallico dei pannelli trasparenti sopra le balaustre
        const R = cornerRadius + 0.13, hx = rinkWidth / 2 - cornerRadius, hz = rinkLength / 2 - cornerRadius;
        const perim = [];
        const addArc = (cx, cz, a0) => { for (let i = 0; i <= 10; i++) { const a = a0 + (Math.PI / 2) * i / 10; perim.push(V(cx + Math.cos(a) * R, 0, cz + Math.sin(a) * R)); } };
        addArc(hx, hz, 0); addArc(-hx, hz, Math.PI / 2); addArc(-hx, -hz, Math.PI); addArc(hx, -hz, Math.PI * 1.5);
        perim.push(perim[0].clone());
        const perimCurve = new THREE.CatmullRomCurve3(perim, false, 'catmullrom', 0.05);
        // davanti alle panchine la balaustra è bassa e senza pannelli: lì niente telaio
        const inBench = q => (q.x > rinkWidth / 2 - 0.5 && Math.abs(q.z) > 3.4 && Math.abs(q.z) < 15.6) ||
            (q.x < -rinkWidth / 2 + 0.5 && Math.abs(Math.abs(q.z) - 5) < 0.75);   // porte delle panche puniti
        const nSeg = Math.round(perimCurve.getLength() / 0.5);
        const railBeams = [];
        let prev = perimCurve.getPointAt(0);
        for (let i = 1; i <= nSeg; i++) {
            const q = perimCurve.getPointAt(i / nSeg);
            if (!inBench(q) && !inBench(prev)) {
                railBeams.push([V(prev.x, 2.2, prev.z), V(q.x, 2.2, q.z), 0.06]);
                railBeams.push([V(prev.x, 1.18, prev.z), V(q.x, 1.18, q.z), 0.08]);
            }
            if (i % 4 === 0 && !inBench(q)) railBeams.push([V(q.x, 1.12, q.z), V(q.x, 2.22, q.z), 0.06]);
            prev = q;
        }
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(railBeams), steelMat));

        // ---------- 6. striscioni e cartelli blu
        const bMats = {};
        const bMat = f => bMats[f] || (bMats[f] = (() => { const t = loadFileTexture(T + f); return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.16, roughness: 0.85, side: THREE.DoubleSide }); })());
        const hang = (f, w, h, x, y, z, rotY) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bMat(f)); m.position.set(x, y, z); m.rotation.y = rotY || 0; targetGroup.add(m); };
        const endZ = rinkLength / 2 + 0.2;
        hang('banner_uisp.jpg', 4.4, 1.1, -3.5, 2.95, endZ, Math.PI);
        hang('sign_hockey.jpg', 1.6, 1.0, 5.5, 2.9, endZ, Math.PI);
        hang('sign_hockey.jpg', 1.6, 1.0, -9.5, 2.9, -endZ);
        hang('sign_skate.jpg', 1.6, 1.0, 9.5, 2.9, -endZ);
        hang('banner_donkeys.jpg', 4.4, 1.65, 0, 5.3, -HL + 0.35);
        hang('banner_donkeys.jpg', 4.0, 1.5, -rinkWidth / 2 - 0.2, 2.9, -14, Math.PI / 2);
        hang('banner_uisp.jpg', 4.0, 1.0, -rinkWidth / 2 - 0.2, 2.8, 14, Math.PI / 2);

        // ---------- 7. pavimento di servizio in cemento
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(2 * A, 2 * HL), new THREE.MeshStandardMaterial({ color: 0x8f9296, roughness: 0.85 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.y = -0.01;
        targetGroup.add(apron);

        // ---------- 8. skatepark in fondo (dietro la porta sud): quarter pipe, funbox e pedana con ringhiera
        const rampMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'ramp.jpg'), color: 0xdfe3e6, roughness: 0.45, metalness: 0.35, side: THREE.DoubleSide });
        const qp = (x, z, w, rotY) => {
            // profilo a quarto di cerchio (raggio 1,4 m) estruso sulla larghezza
            const s = new THREE.Shape();
            const r = 1.4;
            s.moveTo(0, 0);
            // curva concava: parte orizzontale a terra e finisce verticale sotto il bordo (coping)
            for (let i = 1; i <= 12; i++) { const a = (Math.PI / 2) * i / 12; s.lineTo(r * Math.sin(a), r - r * Math.cos(a)); }
            s.lineTo(r + 0.6, r); s.lineTo(r + 0.6, 0); s.lineTo(0, 0);
            const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
            g.translate(0, 0, -w / 2);
            const m = new THREE.Mesh(g, rampMat);
            m.position.set(x, 0, z);
            m.rotation.y = rotY;
            targetGroup.add(m);
            const rail = [[V(r + 0.55, r + 1.0, -w / 2), V(r + 0.55, r + 1.0, w / 2), 0.05]];
            for (let t = -w / 2; t <= w / 2 + 0.01; t += w / 3) rail.push([V(r + 0.55, r, t), V(r + 0.55, r + 1.0, t), 0.05]);
            const rm = new THREE.Mesh(mergeBeamGeometry(rail), steelMat);
            rm.position.copy(m.position);
            rm.rotation.y = rotY;
            targetGroup.add(rm);
        };
        qp(-12, 39.6, 3.6, -Math.PI / 2);
        qp(13, 39.6, 3.0, -Math.PI / 2);
        const fb = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 1.6), rampMat);
        fb.position.set(1.5, 0.25, 39.3);
        targetGroup.add(fb);

        // ---------- 9. qualche spettatore in piedi lungo le balaustre (lato -x) e in testata
        const outfits = [0x1c54c4, 0x40a4e8, 0xf8fafc, 0x141416, 0x1c54c4, 0xc81e28, 0x4b5563, 0xf2c94c];
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
        for (let z = -24; z <= 24; z += 0.75) {
            if (Math.abs(z) < 7.6) continue;   // tavolo cronometristi e panche puniti
            if (Math.random() < keep * 0.45) fan(-19.6 + (Math.random() - 0.5) * 0.3, 0, z + (Math.random() - 0.5) * 0.2, 0);
            if (Math.random() < keep * 0.18) fan(-20.6 + (Math.random() - 0.5) * 0.3, 0, z, 0);
        }
    }

    registerArenaBuilder('empoli', buildEmpoliArchitecture);
})();
