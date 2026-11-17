// Palazzetto "milano": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, arenaSwayItems, CIT_TEX, ...).
(function () {
    // =====================================================================
    // QUANTA CLUB ARENA (MILANO) — pallone pressostatico con testate a cupola,
    // lampade appese a cavi a festone, tribuna rialzata alle spalle delle panchine,
    // gradinata bassa sul lato opposto con gli stendardi degli scudetti HCM.
    // Texture in assets/textures/milano/ (tools/generate_milano_textures.py).
    // =====================================================================
    function buildQuantaClubArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/milano/';
        const CX = 0, A = 31, B = 15, HL = 37, C = 7.5;
        const tmpM = new THREE.Matrix4();
        const domeY = x => B * Math.sqrt(Math.max(0, 1 - ((x - CX) / A) ** 2));
        const capZ = (x, y) => HL + C * Math.sqrt(Math.max(0, 1 - ((x - CX) / A) ** 2 - (y / B) ** 2));

        const membraneMat = new THREE.MeshStandardMaterial({
            map: loadFileTexture(T + 'membrane.jpg', { wrap: true }),
            normalMap: loadFileTexture(T + 'membrane_n.jpg', { wrap: true }),
            normalScale: new THREE.Vector2(0.5, 0.5),
            color: 0xcdd2d8, emissive: 0xbfc5ce, emissiveMap: loadFileTexture(T + 'membrane.jpg', { wrap: true }), emissiveIntensity: 0.22,
            roughness: 0.92, side: THREE.DoubleSide
        });
        const cableMat = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.6, metalness: 0.4 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x23262c, roughness: 0.7, metalness: 0.3 });

        // ---------- 1. volta del pallone (tratto rettilineo)
        const nTh = lowQ ? 36 : 64, nZ = lowQ ? 12 : 24;
        const pos = [], uv = [], idx = [];
        for (let j = 0; j <= nZ; j++) {
            const z = -HL + 2 * HL * j / nZ;
            for (let i = 0; i <= nTh; i++) {
                const th = Math.PI * i / nTh;
                pos.push(CX + A * Math.cos(th), B * Math.sin(th), z);
                uv.push((z + HL) / 8, i / nTh * 10);
            }
        }
        for (let j = 0; j < nZ; j++) for (let i = 0; i < nTh; i++) {
            const a = j * (nTh + 1) + i, b = a + nTh + 1;
            idx.push(a, b, a + 1, b, b + 1, a + 1);
        }
        const vault = new THREE.BufferGeometry();
        vault.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        vault.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        vault.setIndex(idx);
        vault.computeVertexNormals();
        targetGroup.add(new THREE.Mesh(vault, membraneMat));

        // ---------- 2. testate a cupola (mezzi ellissoidi)
        [-1, 1].forEach(dir => {
            const cap = new THREE.Mesh(new THREE.SphereGeometry(1, lowQ ? 24 : 40, lowQ ? 10 : 18, dir > 0 ? 0 : Math.PI, Math.PI, 0, Math.PI / 2), membraneMat);
            cap.scale.set(A, B, C);
            cap.position.set(CX, 0, dir * HL);
            targetGroup.add(cap);
        });

        // ---------- 3. cavi di rinforzo sul telo (archi trasversali)
        if (!lowQ) {
            for (let z = -HL; z <= HL; z += 9.25) {
                const pts = [];
                for (let i = 0; i <= 32; i++) { const th = Math.PI * i / 32; pts.push(new THREE.Vector3(CX + (A - 0.06) * Math.cos(th), (B - 0.06) * Math.sin(th), z)); }
                targetGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.035, 5, false), cableMat));
            }
        }

        // ---------- 4. lampade appese a cavi a festone
        const lampXs = [-18, -9, 0, 9, 18];
        const lampZs = [];
        for (let z = -28.875; z <= 28.9; z += 8.25) lampZs.push(z);
        const lampCount = lampXs.length * lampZs.length;
        const housings = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.3, 0.26, 12), darkMat, lampCount);
        const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff6dc }), lampCount);
        const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
        let li = 0;
        lampXs.forEach(x => {
            const hang = domeY(x) - 1.3;
            // cavo che scende a festone tra una lampada e l'altra
            const pts = [];
            for (let z = -HL; z <= HL + 0.01; z += 0.75) {
                const near = lampZs.reduce((b, lz) => Math.abs(lz - z) < Math.abs(b - z) ? lz : b, lampZs[0]);
                const k = Math.min(1, Math.abs(z - near) / 4.1);
                pts.push(new THREE.Vector3(x, hang + 0.15 - Math.sin(k * Math.PI) * 0.9 + (z < lampZs[0] || z > lampZs[lampZs.length - 1] ? 1.6 * Math.min(1, Math.abs(z - near) / 4) : 0), z));
            }
            targetGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 0.025, 4, false), cableMat));
            lampZs.forEach(z => {
                tmpM.makeTranslation(x, hang, z); housings.setMatrixAt(li, tmpM);
                tmpM.makeTranslation(x, hang - 0.12, z); bulbs.setMatrixAt(li, tmpM);
                if (!lowQ) {
                    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff1d0, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }));
                    spr.scale.set(2.8, 2.8, 1);
                    spr.position.set(x, hang - 0.25, z);
                    targetGroup.add(spr);
                }
                li++;
            });
        });
        housings.instanceMatrix.needsUpdate = true;
        bulbs.instanceMatrix.needsUpdate = true;
        targetGroup.add(housings, bulbs);

        // ---------- 5. tribuna rialzata sul lato lungo opposto alle panchine (lato -x), dietro il tavolo cronometristi
        const concreteMat = new THREE.MeshStandardMaterial({ color: 0x8d8f93, roughness: 0.9 });
        const seatMat = new THREE.MeshStandardMaterial({ color: 0x3b4252, roughness: 0.7 });
        const railMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.6, roughness: 0.3 });
        const TRIB_Z0 = -16.5, TRIB_Z1 = 16.5, TRIB_LEN = TRIB_Z1 - TRIB_Z0;
        const rowsX = [-22.4, -23.55, -24.7, -25.85, -27.0];
        rowsX.forEach((rx, r) => {
            const ry = 1.55 + r * 0.55;
            const step = new THREE.Mesh(new THREE.BoxGeometry(1.15, ry, TRIB_LEN), concreteMat);
            step.position.set(rx, ry / 2, 0);
            step.receiveShadow = preset.shadows;
            targetGroup.add(step);
            const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, TRIB_LEN - 0.4), seatMat);
            seat.position.set(rx - 0.15, ry + 0.34, 0);
            targetGroup.add(seat);
        });
        const tRail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, TRIB_LEN, 8), railMat);
        tRail.rotation.x = Math.PI / 2;
        tRail.position.set(-21.85, 2.6, 0);
        targetGroup.add(tRail);
        for (let z = TRIB_Z0; z <= TRIB_Z1 + 0.01; z += 2.2) {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.05, 6), railMat);
            post.position.set(-21.85, 2.08, z);
            targetGroup.add(post);
        }
        // scale laterali
        [TRIB_Z0 - 0.9, TRIB_Z1 + 0.9].forEach(z => {
            for (let r = 0; r < 5; r++) {
                const st = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.55 + r * 0.55, 1.6), concreteMat);
                st.position.set(rowsX[r], (1.55 + r * 0.55) / 2, z);
                targetGroup.add(st);
            }
        });

        const keep = preset.crowdKeepRatio;
        const fanStyles = [0xc8102e, 0xf8fafc, 0x14235a, 0x1f2937, 0xc8102e, 0x2563eb];
        const pantsMatF = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const handMatF = new THREE.MeshStandardMaterial({ color: 0xe6b9a2, roughness: 0.6 });
        const hairMatF = new THREE.MeshStandardMaterial({ color: 0x1c1410, roughness: 0.8 });
        const jacketMats = fanStyles.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 }));
        const addFan = (fx, fy, fz, rotY) => {
                const fan = new THREE.Group();
                [-0.11, 0.11].forEach(lz => {
                    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.072, 0.36, 7), pantsMatF);
                    thigh.rotation.z = Math.PI / 2; thigh.position.set(0.14, 0.36, lz);
                    const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.062, 0.38, 7), pantsMatF);
                    calf.position.set(0.3, 0.19, lz);
                    fan.add(thigh, calf);
                });
                const bodyPivot = new THREE.Group();
                bodyPivot.position.set(-0.04, 0.38, 0);
                fan.add(bodyPivot);
                const jm = jacketMats[Math.floor(Math.random() * jacketMats.length)];
                const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.54, 10), jm);
                torso.position.y = 0.27;
                bodyPivot.add(torso);
                const headGroup = new THREE.Group();
                headGroup.position.y = 0.68;
                const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), getRandomPhotoFaceMaterial());
                const hair = new THREE.Mesh(new THREE.SphereGeometry(0.148, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMatF);
                hair.position.x = -0.015;
                headGroup.add(head, hair);
                bodyPivot.add(headGroup);
                const mkArm = sz => {
                    const ap = new THREE.Group();
                    ap.position.set(0, 0.48, sz);
                    const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.42, 7), jm);
                    sl.position.y = -0.21;
                    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.05, 7, 7), handMatF);
                    hd.position.y = -0.44;
                    ap.add(sl, hd);
                    bodyPivot.add(ap);
                    return ap;
                };
                const leftArmPivot = mkArm(-0.24), rightArmPivot = mkArm(0.24);
                fan.position.set(fx, fy, fz);
                fan.rotation.y = rotY;
                const childLift = maybeMakeCrowdChild(fan, headGroup, true);
                targetGroup.add(fan);
                crowdMembers.push({ mesh: fan, bodyPivot, headGroup, leftArmPivot, rightArmPivot, baseY: fy + childLift, phase: Math.random() * Math.PI * 2, standing: false });
        };
        rowsX.forEach((rx, r) => {
            const ry = 1.55 + r * 0.55;
            for (let z = TRIB_Z0 + 0.6; z <= TRIB_Z1 - 0.6; z += 0.95) {
                if (Math.random() > keep) continue;
                addFan(rx - 0.12, ry, z + (Math.random() - 0.5) * 0.25, -Math.atan2(z, 22) * 0.3);   // guardano la pista (+x)
            }
        });

        // ---------- 5b. curva dietro la porta nord, con lo striscione "UMBERTO PRESIDENTE PER SEMPRE"
        const CURVA_X0 = -10.5, CURVA_X1 = 10.5, CURVA_W = CURVA_X1 - CURVA_X0;
        const curvaRows = [-37.35, -38.45, -39.55, -40.65, -41.75];
        curvaRows.forEach((rz, r) => {
            const ry = 0.95 + r * 0.5;
            const step = new THREE.Mesh(new THREE.BoxGeometry(CURVA_W, ry, 1.1), concreteMat);
            step.position.set(0, ry / 2, rz);
            step.receiveShadow = preset.shadows;
            targetGroup.add(step);
            const seat = new THREE.Mesh(new THREE.BoxGeometry(CURVA_W - 0.4, 0.08, 0.38), seatMat);
            seat.position.set(0, ry + 0.34, rz - 0.15);
            targetGroup.add(seat);
            for (let x = CURVA_X0 + 0.6; x <= CURVA_X1 - 0.6; x += 0.9) {
                if (Math.random() > Math.min(1, keep + 0.1)) continue;
                addFan(x + (Math.random() - 0.5) * 0.2, ry, rz - 0.1, -Math.PI / 2 + Math.atan2(x, 30) * 0.4);   // guardano la pista (+z)
            }
        });
        [CURVA_X0 - 0.8, CURVA_X1 + 0.8].forEach(x => {
            for (let r = 0; r < 5; r++) {
                const st = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.95 + r * 0.5, 1.1), concreteMat);
                st.position.set(x, (0.95 + r * 0.5) / 2, curvaRows[r]);
                targetGroup.add(st);
            }
        });
        const cRail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, CURVA_W + 3, 8), railMat);
        cRail.rotation.z = Math.PI / 2;
        cRail.position.set(0, 2.05, -36.8);
        targetGroup.add(cRail);
        for (let x = CURVA_X0 - 1.5; x <= CURVA_X1 + 1.51; x += 2.25) {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6), railMat);
            post.position.set(x, 1.55, -36.8);
            targetGroup.add(post);
        }

        // ---------- 6. stendardi degli scudetti HCM sopra la gradinata opposta (lato -x)
        const atlas = loadFileTexture(T + 'pennants.png');
        const penMat = new THREE.MeshStandardMaterial({ map: atlas, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, roughness: 0.85, emissive: 0xffffff, emissiveMap: atlas, emissiveIntensity: 0.2 });
        const N_ATLAS = 16;
        const penCable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 52, 4), cableMat);
        penCable.rotation.x = Math.PI / 2;
        penCable.position.set(22.3, 5.6, 0);
        targetGroup.add(penCable);
        let pi = 0;
        for (let z = -25; z <= 25.01; z += 1.62, pi++) {
            const g = new THREE.PlaneGeometry(0.82, 2.05);
            const cell = pi % N_ATLAS, uvA = g.attributes.uv;
            for (let k = 0; k < uvA.count; k++) uvA.setX(k, (cell + uvA.getX(k)) / N_ATLAS);
            const pivot = new THREE.Group();
            pivot.position.set(22.3, 5.55, z);
            const pen = new THREE.Mesh(g, penMat);
            pen.rotation.y = -Math.PI / 2;
            pen.position.y = -1.03;
            pivot.add(pen);
            targetGroup.add(pivot);
            arenaSwayItems.push({ obj: pivot, amp: 0.03, speed: 0.7 + Math.random() * 0.4, phase: Math.random() * 6 });
        }

        // ---------- 7. striscioni, aperture ad arco e bandiere
        const bannerMats = {};
        const bMat = file => {
            if (!bannerMats[file]) {
                const tex = loadFileTexture(T + file);
                bannerMats[file] = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.2, roughness: 0.85, side: THREE.DoubleSide });
            }
            return bannerMats[file];
        };
        const um1 = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.75), bMat('umberto.jpg'));
        um1.position.set(0, 6.6, -(Math.min(capZ(-7, 7.5), capZ(7, 7.5)) - 0.3));
        targetGroup.add(um1);
        // bandiere appese alla ringhiera della curva
        [['flag_italia.jpg', -6], ['flag_hcm.jpg', -2.5], ['flag_hcm.jpg', 3.5], ['flag_italia.jpg', 7]].forEach(([f, x]) => {
            const fl = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.25), bMat(f));
            fl.position.set(x, 1.45, -36.72);
            targetGroup.add(fl);
        });
        const cv = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.25), bMat('curva.jpg'));
        cv.position.set(-12.5, 2.9, Math.min(capZ(-17.5, 3.55), capZ(-7.5, 3.55)) - 0.3);
        cv.rotation.y = Math.PI;
        targetGroup.add(cv);
        [['banner_lauretana.jpg', -28], ['banner_joma.jpg', 28]].forEach(([f, z]) => {
            const b = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), bMat(f));
            b.position.set(22.3, 4.0, z);
            b.rotation.y = -Math.PI / 2;
            targetGroup.add(b);
        });
        // due aperture ad arco nella testata sud (ingressi), con luce di emergenza
        const archShape = new THREE.Shape();
        archShape.moveTo(-1.5, 0); archShape.lineTo(-1.5, 1.8); archShape.absarc(0, 1.8, 1.5, Math.PI, 0, true); archShape.lineTo(1.5, 0); archShape.lineTo(-1.5, 0);
        const archGeo = new THREE.ShapeGeometry(archShape, 16);
        const archMat = new THREE.MeshBasicMaterial({ color: 0x2c2f34 });
        const exitMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });
        [-11, 11].forEach(x => {
            const z = capZ(x, 1.6) - 0.12;
            const arch = new THREE.Mesh(archGeo, archMat);
            arch.position.set(x, 0, z);
            arch.rotation.y = Math.PI;
            const lightBox = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.22), exitMat);
            lightBox.position.set(x, 2.3, z - 0.02);
            lightBox.rotation.y = Math.PI;
            targetGroup.add(arch, lightBox);
        });
        // bandiere agli angoli della tribuna
        const hangFlag = (file, x, y, z, rotY) => {
            const pivot = new THREE.Group();
            pivot.position.set(x, y, z);
            const fm = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), bMat(file));
            fm.position.y = -0.8;
            fm.rotation.y = rotY;
            pivot.add(fm);
            targetGroup.add(pivot);
            arenaSwayItems.push({ obj: pivot, amp: 0.04, speed: 0.8, phase: Math.random() * 6 });
        };
        hangFlag('flag_italia.jpg', -26.6, 6.4, -12, Math.PI / 2);
        hangFlag('flag_hcm.jpg', -26.6, 6.4, -2, Math.PI / 2);
        hangFlag('flag_hcm.jpg', -26.6, 6.4, 14, Math.PI / 2);
        hangFlag('flag_italia.jpg', 22.3, 5.4, 30.5, -Math.PI / 2);

        // ---------- 8. reti di protezione dietro le porte (lasciando libero il tabellone)
        const netTex = loadFileTexture(CIT_TEX + 'netting.png', { repeat: [12.5 / 0.12, 3.5 / 0.12] });
        const netMatProt = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, depthWrite: false, opacity: 0.55 });
        [-1, 1].forEach(dir => [-11.75, 11.75].forEach(nx => {
            const net = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 3.5), netMatProt);
            net.position.set(nx, 4.2, dir * 36.32);
            targetGroup.add(net);
        }));

        // ---------- 9. pavimento di servizio tra balaustre e tribune (gomma scura)
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(2 * A, 2 * (HL + C)), new THREE.MeshStandardMaterial({ color: 0x3d4148, roughness: 0.95 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(CX, -0.01, 0);
        targetGroup.add(apron);
    }

    registerArenaBuilder('milano', buildQuantaClubArchitecture);
})();
