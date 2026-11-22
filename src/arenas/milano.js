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

        // ---------- 10. Rino, la mascotte: in piedi a bordo pista dietro la balaustra, lato tribuna
        buildRinoMascot(targetGroup, preset);
    }

    // =====================================================================
    // RINO — costume da rinoceronte grigio con casco da hockey blu (fascia rossa), vestito con la
    // maglia blu navy dell'HC Milano (assets/jerseys/milano_2.png: Quanta, rinoceronte, tricolore) e
    // calzoni da hockey blu con le bande rosso-bianche. Guarda verso la pista (+x locale).
    // Si registra in arenaMascot: index.html lo inquadra all'inizio di ogni partita.
    // =====================================================================
    function buildRinoMascot(targetGroup, preset) {
        const felt = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 });
        const greyMat = felt(0x8e8d87);
        const greyDarkMat = felt(0x6f6e69);
        const hornMat = new THREE.MeshStandardMaterial({ color: 0xece7da, roughness: 0.7 });
        const helmetMat = new THREE.MeshStandardMaterial({ color: 0x1f3fc4, roughness: 0.35, metalness: 0.1 });
        const redMat = new THREE.MeshStandardMaterial({ color: 0xd3262e, roughness: 0.45 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf4f5f7, roughness: 0.5 });
        const darkMat = new THREE.MeshBasicMaterial({ color: 0x1a0d0e });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1e3fd8, roughness: 0.2, metalness: 0.1 });
        const pantsMat = felt(0x1b2f7a);
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.6 });
        // maglia e maniche dalla foto della divisa blu (stesse texture dei giocatori: davanti dalla foto,
        // sulla schiena nome e numero). Ripiego a tinta unita se lo script principale non le offre.
        const hasKit = typeof getPlayerJerseyMaterial === 'function' && typeof getKitSleeveMaterial === 'function';
        const jerseyMat = hasKit ? getPlayerJerseyMaterial('milano', 'navy', '00', 'RINO') : felt(0x0f2557);
        const sleeveMat = hasKit ? getKitSleeveMaterial('milano', 'navy') : felt(0x0f2557);

        // calzoni da hockey: blu navy, banda rossa e filetti bianchi sui fianchi (u = 0 / 0.5 → lati)
        const pcv = document.createElement('canvas');
        pcv.width = 256; pcv.height = 128;
        const pg = pcv.getContext('2d');
        pg.fillStyle = '#13265f'; pg.fillRect(0, 0, 256, 128);
        [0, 128, 256].forEach(x => {
            pg.fillStyle = '#ffffff'; pg.fillRect(x - 14, 0, 28, 128);
            pg.fillStyle = '#d3262e'; pg.fillRect(x - 10, 0, 20, 128);
        });
        pg.fillStyle = '#d3262e'; pg.fillRect(0, 0, 256, 10);          // cintura
        pg.fillStyle = '#ffffff'; pg.fillRect(0, 118, 256, 4);         // orlo
        const pantsTex = new THREE.CanvasTexture(pcv);
        if (THREE.SRGBColorSpace) pantsTex.colorSpace = THREE.SRGBColorSpace;
        const hockeyPantsMat = new THREE.MeshStandardMaterial({ map: pantsTex, roughness: 0.85 });
        const gloveCuffMat = new THREE.MeshStandardMaterial({ color: 0xd3262e, roughness: 0.6 });

        const rino = new THREE.Group();
        const add = (parent, geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => {
            const m = new THREE.Mesh(geo, mat);
            m.position.set(x, y, z);
            m.scale.set(sx, sy, sz);
            if (preset.shadows) m.castShadow = true;
            parent.add(m);
            return m;
        };
        const sph = (w = 20, h = 14) => new THREE.SphereGeometry(1, w, h);

        // gambe e scarpe
        [-0.13, 0.13].forEach(z => {
            add(rino, new THREE.CylinderGeometry(0.1, 0.09, 0.5, 10), pantsMat, 0, 0.3, z);                 // calzettoni
            add(rino, new THREE.CylinderGeometry(0.15, 0.135, 0.34, 14), hockeyPantsMat, 0, 0.66, z);      // calzoni
            add(rino, sph(12, 8), shoeMat, 0.06, 0.06, z, 0.17, 0.08, 0.1);
        });
        add(rino, new THREE.CylinderGeometry(0.3, 0.28, 0.24, 18), hockeyPantsMat, 0, 0.88, 0);

        // busto con la maglia (oscilla col bacino)
        const bodyPivot = new THREE.Group();
        bodyPivot.position.y = 0.9;
        rino.add(bodyPivot);
        add(bodyPivot, new THREE.CylinderGeometry(0.31, 0.28, 0.62, 20), jerseyMat, 0, 0.3, 0);
        add(bodyPivot, sph(), jerseyMat, 0, 0.6, 0, 0.31, 0.12, 0.31);

        // braccia: manica della maglia (con le sue bande al polso), guantone grigio con polsino rosso
        const mkArm = z => {
            const p = new THREE.Group();
            p.position.set(0, 0.55, z);
            add(p, sph(12, 10), sleeveMat, 0, 0, 0, 0.11, 0.11, 0.11);
            add(p, new THREE.CylinderGeometry(0.095, 0.08, 0.5, 12), sleeveMat, 0, -0.25, 0);
            add(p, new THREE.CylinderGeometry(0.075, 0.075, 0.05, 10), gloveCuffMat, 0, -0.5, 0);
            add(p, sph(12, 10), greyMat, 0.01, -0.58, 0, 0.09, 0.1, 0.08);
            bodyPivot.add(p);
            return p;
        };
        const leftArmPivot = mkArm(-0.36), rightArmPivot = mkArm(0.36);

        // testa da rinoceronte con casco
        const headGroup = new THREE.Group();
        headGroup.position.y = 0.62;
        headGroup.scale.setScalar(1.25);   // testone da costume
        bodyPivot.add(headGroup);
        add(headGroup, sph(24, 18), greyMat, 0, 0.32, 0, 0.36, 0.34, 0.33);              // cranio
        add(headGroup, sph(20, 14), greyMat, 0.27, 0.42, 0, 0.27, 0.15, 0.23);           // muso superiore
        add(headGroup, sph(16, 12), greyMat, 0.18, 0.0, 0, 0.25, 0.13, 0.25);            // mandibola
        // bocca spalancata con il bordo rosso (lì dentro c'è chi indossa il costume)
        const mouth = new THREE.Group();
        mouth.position.set(0.37, 0.15, 0);
        mouth.rotation.y = Math.PI / 2;
        headGroup.add(mouth);
        add(mouth, new THREE.CircleGeometry(0.16, 24), darkMat, 0, 0, -0.012, 1, 0.85, 1);
        add(mouth, new THREE.TorusGeometry(0.16, 0.045, 10, 28), redMat, 0, 0, 0, 1, 0.85, 0.45);
        // narici e occhi
        [-0.06, 0.06].forEach(z => add(headGroup, sph(8, 6), darkMat, 0.535, 0.43, z, 0.018, 0.024, 0.018));
        [-1, 1].forEach(s => {
            add(headGroup, sph(14, 10), whiteMat, 0.16, 0.46, s * 0.25, 0.07, 0.075, 0.05);
            add(headGroup, sph(12, 10), eyeMat, 0.2, 0.46, s * 0.28, 0.045, 0.05, 0.03);
            add(headGroup, sph(6, 4), whiteMat, 0.215, 0.48, s * 0.305, 0.012, 0.012, 0.008);
        });
        // corni: quello grande sul muso e il secondo sulla fronte
        const horn1 = add(headGroup, new THREE.ConeGeometry(0.085, 0.36, 14), hornMat, 0.45, 0.64, 0);
        horn1.rotation.z = -0.42;
        const horn2 = add(headGroup, new THREE.ConeGeometry(0.06, 0.2, 12), hornMat, 0.2, 0.72, 0);
        horn2.rotation.z = -0.3;
        // casco blu con la fascia rossa e i riquadri bianchi sui lati
        add(headGroup, new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), helmetMat, -0.07, 0.5, 0, 0.375, 0.245, 0.35);
        add(headGroup, new THREE.TorusGeometry(1, 0.08, 8, 28, Math.PI), redMat, -0.07, 0.5, 0, 0.375, 0.245, 0.35);
        add(headGroup, new THREE.TorusGeometry(1, 0.06, 6, 32), helmetMat, -0.07, 0.5, 0, 0.38, 0.355, 0.36).rotation.x = Math.PI / 2;
        [-1, 1].forEach(s => {
            const patch = add(headGroup, new THREE.PlaneGeometry(0.1, 0.07), whiteMat, 0.1, 0.58, s * 0.295);
            patch.rotation.y = s > 0 ? 0.45 : Math.PI - 0.45;
            // orecchie grigie che spuntano dal casco
            const ear = add(headGroup, new THREE.ConeGeometry(0.07, 0.2, 10), greyDarkMat, -0.12, 0.74, s * 0.24);
            ear.rotation.x = s * 0.55;
        });

        // a bordo pista, tra la balaustra e la tribuna, all'altezza della linea blu
        rino.scale.setScalar(0.95);
        rino.position.set(-19.7, 0, 11.5);
        targetGroup.add(rino);

        let waveBlend = 0;
        arenaMascot = {
            name: 'Rino',
            clubId: 'milano',
            mesh: rino,
            headGroup,
            waving: false,
            update(t, dt) {
                waveBlend += ((this.waving ? 1 : 0) - waveBlend) * Math.min(1, dt * 6);
                const k = waveBlend;
                const idle = Math.sin(t * 1.6);
                const hop = Math.abs(Math.sin(t * 5.2));
                rino.position.y = hop * 0.06 * k;
                bodyPivot.rotation.x = idle * 0.04 * (1 - k) + Math.sin(t * 5.2) * 0.05 * k;
                headGroup.rotation.y = Math.sin(t * 0.8) * 0.25 * (1 - k);
                headGroup.rotation.z = Math.sin(t * 2.6) * 0.1 * k;
                // a riposo braccia lungo i fianchi; quando saluta il destro (z+) va su e sventola
                rightArmPivot.rotation.x = -0.12 - k * (2.55 + Math.sin(t * 8) * 0.35);
                rightArmPivot.rotation.z = 0.05 + idle * 0.05 * (1 - k);
                leftArmPivot.rotation.x = 0.12 + k * 0.5;
                leftArmPivot.rotation.z = -idle * 0.05 * (1 - k) + k * 0.45;
            }
        };
    }

    registerArenaBuilder('milano', buildQuantaClubArchitecture);
})();
