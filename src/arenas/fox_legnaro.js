// Palazzetto "fox_legnaro": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, arenaSwayItems, CIT_TEX, crowdMembers, ...).
(function () {
    // =====================================================================
    // FOX ARENA — LEGNARO (PD). Volta a botte su archi in legno lamellare con fitti
    // arcarecci in legno e lastre grecate grigio chiaro, lampade tonde appese,
    // testate con telaio in legno e pannelli traslucidi sopra un muretto in blocchi,
    // canestri da basket sulle testate, reti di protezione dietro le porte e negli angoli,
    // balaustre bianche con zoccolo verde (niente vetro), pareti basse bianche con
    // gli striscioni degli sponsor, bandiera nera della FOX e una piccola tribuna
    // con sedute verdi dietro il vetro, sul lato opposto alle panchine.
    // Texture in assets/textures/fox_legnaro/ (tools/generate_fox_legnaro_textures.py).
    // =====================================================================
    function buildFoxLegnaroArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/fox_legnaro/';
        const CX = -1.5, A = 27, B = 15.5, HL = 40, BAY = 5;
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        const ellPoint = th => V(CX + A * Math.cos(th), B * Math.sin(th), 0);
        const ellNormal = th => V(Math.cos(th) / A, Math.sin(th) / B, 0).normalize();
        const insetPoint = (th, d) => ellPoint(th).addScaledVector(ellNormal(th), -d);
        const vaultY = x => B * Math.sqrt(Math.max(0, 1 - ((x - CX) / A) ** 2));

        const woodMat = new THREE.MeshStandardMaterial({
            map: loadFileTexture(CIT_TEX + 'glulam.jpg', { wrap: true }),
            normalMap: loadFileTexture(CIT_TEX + 'glulam_n.jpg', { wrap: true }),
            normalScale: new THREE.Vector2(0.6, 0.6), color: 0xb98e62, roughness: 0.6
        });
        const roofTex = loadFileTexture(T + 'roof_panel.jpg', { wrap: true });
        const roofMat = new THREE.MeshStandardMaterial({
            map: roofTex,
            normalMap: lowQ ? null : loadFileTexture(T + 'roof_panel_n.jpg', { wrap: true }),
            normalScale: new THREE.Vector2(0.5, 0.5),
            color: 0xe4e6e8, emissive: 0xd8dce0, emissiveMap: roofTex, emissiveIntensity: 0.22,
            roughness: 0.7, metalness: 0.15, side: THREE.DoubleSide
        });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.5, metalness: 0.5 });
        const steelMat = new THREE.MeshStandardMaterial({ color: 0xc9ced4, roughness: 0.4, metalness: 0.55 });
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xeceeee, roughness: 0.9, side: THREE.DoubleSide });
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xfffdf2 });

        // ---------- 1. copertura: lastre grecate seguendo la volta
        const nTh = lowQ ? 40 : 72, nZ = lowQ ? 16 : 32;
        const arcLen = [0];
        for (let i = 1; i <= nTh; i++) arcLen.push(arcLen[i - 1] + ellPoint(Math.PI * i / nTh).distanceTo(ellPoint(Math.PI * (i - 1) / nTh)));
        const vPos = [], vUv = [], vIdx = [];
        for (let j = 0; j <= nZ; j++) {
            const z = -HL + 2 * HL * j / nZ;
            for (let i = 0; i <= nTh; i++) {
                const pnt = ellPoint(Math.PI * i / nTh);
                vPos.push(pnt.x, pnt.y, z);
                vUv.push((z + HL) / 2, arcLen[i] / 2);      // lastre da 2 m
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
        targetGroup.add(new THREE.Mesh(vault, roofMat));

        // ---------- 2. archi in legno lamellare + arcarecci fitti in legno
        const archPts = [];
        for (let i = 0; i <= 56; i++) archPts.push(insetPoint(Math.PI * (0.004 + 0.992 * i / 56), 0.42));
        const archGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPts), 80, 0.36, 6, false);
        const archCount = 2 * HL / BAY + 1;
        const arches = new THREE.InstancedMesh(archGeo, woodMat, archCount);
        for (let k = 0; k < archCount; k++) { tmpM.makeTranslation(0, 0, -HL + k * BAY); arches.setMatrixAt(k, tmpM); }
        arches.instanceMatrix.needsUpdate = true;
        targetGroup.add(arches);
        // piede degli archi: plinti in cemento
        const plinthGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
        const plinths = new THREE.InstancedMesh(plinthGeo, new THREE.MeshStandardMaterial({ color: 0xb8babd, roughness: 0.9 }), archCount * 2);
        let pi = 0;
        for (let k = 0; k < archCount; k++) [CX - A + 0.45, CX + A - 0.45].forEach(x => { tmpM.makeTranslation(x, 0.45, -HL + k * BAY); plinths.setMatrixAt(pi++, tmpM); });
        plinths.instanceMatrix.needsUpdate = true;
        targetGroup.add(plinths);
        const purlinCount = lowQ ? 10 : 18;
        for (let q = 0; q < purlinCount; q++) {
            const th = Math.PI * (0.07 + 0.86 * q / (purlinCount - 1)), pnt = insetPoint(th, 0.2), nn = ellNormal(th);
            const purlin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.26, 2 * HL), woodMat);
            purlin.position.set(pnt.x, pnt.y, 0);
            purlin.rotation.z = Math.atan2(nn.x, -nn.y);
            targetGroup.add(purlin);
        }

        // ---------- 3. lampade tonde appese tra gli archi
        const lampTh = [0.3, 0.42, 0.58, 0.7];
        const lampCount = lampTh.length * (archCount - 1);
        const lampBody = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.32, 0.34, 14), darkMat, lampCount);
        const lampFace = new THREE.InstancedMesh(new THREE.CircleGeometry(0.29, 16).rotateX(Math.PI / 2), lightMat, lampCount);
        const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
        let li = 0;
        for (let k = 0; k < archCount - 1; k++) {
            const z = -HL + k * BAY + BAY / 2;
            lampTh.forEach(f => {
                const pnt = insetPoint(Math.PI * f, 1.1);
                tmpM.makeTranslation(pnt.x, pnt.y, z); lampBody.setMatrixAt(li, tmpM);
                tmpM.makeTranslation(pnt.x, pnt.y - 0.18, z); lampFace.setMatrixAt(li, tmpM);
                if (!lowQ) {
                    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff6dc, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
                    spr.scale.set(2.0, 2.0, 1);
                    spr.position.set(pnt.x, pnt.y - 0.3, z);
                    targetGroup.add(spr);
                }
                li++;
            });
        }
        lampBody.instanceMatrix.needsUpdate = true;
        lampFace.instanceMatrix.needsUpdate = true;
        targetGroup.add(lampBody, lampFace);

        // ---------- 4. testate: muretto in blocchi + telaio in legno con pannelli traslucidi
        const endShape = new THREE.Shape();
        endShape.moveTo(CX + A, 0);
        for (let i = 1; i <= 56; i++) { const th = Math.PI * i / 56; endShape.lineTo(CX + A * Math.cos(th), B * Math.sin(th)); }
        endShape.lineTo(CX + A, 0);
        const endGeo = new THREE.ShapeGeometry(endShape, 28);     // UV = coordinate in metri
        const endTex = loadFileTexture(T + 'end_wall.jpg', { repeat: [1 / 2.4, 1 / 1.8] });
        const endMat = new THREE.MeshStandardMaterial({ map: endTex, emissive: 0xbfd4ea, emissiveMap: endTex, emissiveIntensity: 0.35, roughness: 0.6, side: THREE.DoubleSide });
        const blockTex = loadFileTexture(T + 'block_wall.jpg', { repeat: [2 * A / 1.6, 3.0 / 0.8] });
        const blockMat = new THREE.MeshStandardMaterial({ map: blockTex, roughness: 0.92, side: THREE.DoubleSide });
        [-1, 1].forEach(dir => {
            const e = new THREE.Mesh(endGeo, endMat);
            e.position.z = dir * HL;
            targetGroup.add(e);
            const low = new THREE.Mesh(new THREE.PlaneGeometry(2 * A - 1.2, 3.0), blockMat);
            low.position.set(CX, 1.5, dir * (HL - 0.05));
            low.rotation.y = dir > 0 ? Math.PI : 0;
            targetGroup.add(low);
        });

        // ---------- 5. canestri da basket sopra le porte (testate)
        const boardMat = new THREE.MeshStandardMaterial({ color: 0xf6f7f8, transparent: true, opacity: 0.82, roughness: 0.2 });
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xe0561b, roughness: 0.4, metalness: 0.5 });
        const netLineMat = new THREE.MeshBasicMaterial({ color: 0xf2f2f2, wireframe: true, transparent: true, opacity: 0.8 });
        const redLine = new THREE.MeshBasicMaterial({ color: 0xc81e24 });
        [-1, 1].forEach(dir => {
            const zb = dir * (HL - 1.6);
            const g = new THREE.Group();
            const bb = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.05, 0.04), boardMat);
            bb.position.set(0, 3.55, zb);
            g.add(bb);
            const frame = [[0, 4.06, 1.8, 0.05], [0, 3.04, 1.8, 0.05], [-0.88, 3.55, 0.05, 1.05], [0.88, 3.55, 0.05, 1.05],
                [0, 3.6, 0.59, 0.04], [0, 3.2, 0.59, 0.04], [-0.28, 3.4, 0.04, 0.44], [0.28, 3.4, 0.04, 0.44]];
            frame.forEach(([x, y, w, h]) => {
                const l = new THREE.Mesh(new THREE.PlaneGeometry(w, h), redLine);
                l.position.set(x, y, zb - dir * 0.025);
                l.rotation.y = dir > 0 ? Math.PI : 0;
                g.add(l);
            });
            const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.018, 6, 20), rimMat);
            rim.rotation.x = Math.PI / 2;
            rim.position.set(0, 3.05, zb - dir * 0.28);
            const net = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.14, 0.42, 12, 3, true), netLineMat);
            net.position.set(0, 2.84, zb - dir * 0.28);
            g.add(rim, net);
            // braccio di sostegno a parete
            [[-0.6, 3.2], [0.6, 3.2], [-0.6, 3.9], [0.6, 3.9]].forEach(([x, y]) => {
                const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.55), steelMat);
                arm.position.set(x, y, dir * (HL - 0.8));
                g.add(arm);
            });
            targetGroup.add(g);
        });

        // ---------- 6. pareti basse laterali, bianche, con porte e finestre
        const winMat = new THREE.MeshStandardMaterial({ color: 0xbfe0f5, emissive: 0xd9eefb, emissiveIntensity: 0.6, roughness: 0.2 });
        winMat.userData.sunWindow = true;            // finestra verso l'esterno: di giorno ci entra il sole (index.html)
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x8b95a0, roughness: 0.5, metalness: 0.4 });
        [CX - A + 1.0, CX + A - 1.0].forEach(x => {
            const s = x < 0 ? 1 : -1;
            const w = new THREE.Mesh(new THREE.PlaneGeometry(2 * HL, 3.2), wallMat);
            w.position.set(x, 1.6, 0);
            w.rotation.y = s * Math.PI / 2;
            targetGroup.add(w);
            [-30, -4, 22].forEach((z, i) => {
                const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.4), winMat);
                win.position.set(x + s * 0.03, 1.9, z + i * 2);
                win.rotation.y = s * Math.PI / 2;
                targetGroup.add(win);
            });
            const door = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.2), doorMat);
            door.position.set(x + s * 0.03, 1.1, x < 0 ? 31 : -33);
            door.rotation.y = s * Math.PI / 2;
            targetGroup.add(door);
        });

        // ---------- 7. reti di protezione: alte dietro le porte, più basse negli angoli
        const netTex = loadFileTexture(CIT_TEX + 'netting.png', { repeat: [36 / 0.12, 6.4 / 0.12] });
        const netMat = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, depthWrite: false, opacity: 0.55 });
        [-1, 1].forEach(dir => {
            const net = new THREE.Mesh(new THREE.PlaneGeometry(36, 6.4), netMat);
            net.position.set(0, 1.15 + 3.2, dir * 36.4);
            targetGroup.add(net);
            const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 36, 4), steelMat);
            cable.rotation.z = Math.PI / 2;
            cable.position.set(0, 7.55, dir * 36.4);
            targetGroup.add(cable);
        });
        const sideNetTex = loadFileTexture(CIT_TEX + 'netting.png', { repeat: [15 / 0.12, 3.0 / 0.12] });
        const sideNetMat = netMat.clone();
        sideNetMat.map = sideNetTex;
        [-1, 1].forEach(sx => [-1, 1].forEach(sz => {
            const n = new THREE.Mesh(new THREE.PlaneGeometry(15, 3.0), sideNetMat);
            n.position.set(sx * 18.45, 1.15 + 1.5, sz * 27.5);
            n.rotation.y = Math.PI / 2;
            targetGroup.add(n);
        }));

        // ---------- 8. striscioni sponsor e bandiera FOX
        const bMats = {};
        const bMat = f => bMats[f] || (bMats[f] = (() => { const t = loadFileTexture(T + f); return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.16, roughness: 0.85, side: THREE.DoubleSide }); })());
        const wallBanner = (f, w, h, x, y, z, rotY) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bMat(f)); m.position.set(x, y, z); m.rotation.y = rotY; targetGroup.add(m); return m; };
        const XE = CX + A - 1.05, XW = CX - A + 1.05;
        // lato panchine (+x): Alì, Firestop, ZAC, T.S.B., F.lli Pengo
        [['banner_ali.jpg', -26], ['banner_ali.jpg', -21.6], ['banner_firestop.jpg', -6], ['banner_zac.jpg', 8], ['banner_tsb.jpg', 20], ['banner_pengo.jpg', 26]]
            .forEach(([f, z]) => wallBanner(f, 4.0, 1.0, XE, 2.75, z, -Math.PI / 2));
        // lato tribuna (-x), sopra le sedute
        [['banner_fox.jpg', -10], ['banner_conad.jpg', 0], ['banner_pengo.jpg', 10]]
            .forEach(([f, z]) => wallBanner(f, 4.0, 1.0, XW, 2.85, z, Math.PI / 2));
        // testate: CONAD e lo stendardo della FOX
        wallBanner('banner_conad.jpg', 3.2, 0.8, 10, 2.4, -HL + 0.12, 0);
        wallBanner('banner_fox.jpg', 4.0, 1.0, -10, 2.4, HL - 0.12, Math.PI);
        const flagPivot = new THREE.Group();
        flagPivot.position.set(13, 6.6, HL - 0.25);
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), bMat('flag_fox.jpg'));
        flag.position.y = -1.6;
        flag.rotation.y = Math.PI;
        flagPivot.add(flag);
        targetGroup.add(flagPivot);
        arenaSwayItems.push({ obj: flagPivot, amp: 0.03, speed: 0.6 + Math.random() * 0.3, phase: Math.random() * 6 });

        // ---------- 9. pavimento di servizio attorno alla pista
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(2 * A, 2 * HL), new THREE.MeshStandardMaterial({ color: 0x8e9195, roughness: 0.85 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(CX, -0.01, 0);
        targetGroup.add(apron);

        // ---------- 10. piccola tribuna dietro il vetro (lato opposto alle panchine)
        const Z0 = -16, Z1 = 16, LEN = Z1 - Z0;
        const concrete = new THREE.MeshStandardMaterial({ color: 0xa3a6aa, roughness: 0.9 });
        const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xe6f2fa, transparent: true, opacity: 0.2, roughness: 0.06, clearcoat: 0.8, depthWrite: false, side: THREE.DoubleSide });
        const GX = -21.2;                                    // vetro della tribuna
        const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, LEN), wallMat);
        kerb.position.set(GX, 0.45, 0);
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.5, LEN), glassMat);
        glass.position.set(GX, 1.65, 0);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, LEN), darkMat);
        cap.position.set(GX, 2.42, 0);
        targetGroup.add(kerb, glass, cap);
        for (let z = Z0; z <= Z1 + 0.01; z += 2) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.55, 0.06), darkMat);
            post.position.set(GX, 1.65, z);
            targetGroup.add(post);
        }
        const rows = [{ x: -22.1, y: 0.5 }, { x: -23.2, y: 0.9 }, { x: -24.3, y: 1.3 }];
        const seatMat = new THREE.MeshStandardMaterial({ color: 0x3f9b4a, roughness: 0.5 });
        const seatPitch = 0.62;
        const seatsPerRow = Math.floor(LEN / seatPitch);
        const seatGeo = new THREE.BoxGeometry(0.44, 0.06, 0.42);
        const backGeo = new THREE.BoxGeometry(0.05, 0.4, 0.42);
        const seats = new THREE.InstancedMesh(seatGeo, seatMat, rows.length * seatsPerRow);
        const backs = new THREE.InstancedMesh(backGeo, seatMat, rows.length * seatsPerRow);
        let si = 0;
        rows.forEach(rw => {
            const st = new THREE.Mesh(new THREE.BoxGeometry(1.1, rw.y, LEN), concrete);
            st.position.set(rw.x, rw.y / 2, 0);
            targetGroup.add(st);
            for (let k = 0; k < seatsPerRow; k++) {
                const z = Z0 + seatPitch * (k + 0.5);
                tmpM.makeTranslation(rw.x + 0.05, rw.y + 0.42, z); seats.setMatrixAt(si, tmpM);
                tmpM.makeTranslation(rw.x - 0.2, rw.y + 0.64, z); backs.setMatrixAt(si, tmpM);
                si++;
            }
        });
        seats.instanceMatrix.needsUpdate = true;
        backs.instanceMatrix.needsUpdate = true;
        targetGroup.add(seats, backs);

        // spettatori seduti, rivolti verso la pista (+x), con qualche bambino
        const outfits = [0x111114, 0xd01f26, 0xf8fafc, 0x374151, 0x111114, 0xf6c41e, 0x1e3a8a];
        const jm = outfits.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 }));
        const pantsM = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const handM = new THREE.MeshStandardMaterial({ color: 0xc99178, roughness: 0.6 });
        const hairM = new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.8 });
        const fan = (x, y, z) => {
            const root = new THREE.Group();
            const mat = jm[Math.floor(Math.random() * jm.length)];
            [-0.11, 0.11].forEach(lz => {
                const th = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.072, 0.36, 7), pantsM); th.rotation.z = Math.PI / 2; th.position.set(0.14, 0.36, lz);
                const cf = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.062, 0.38, 7), pantsM); cf.position.set(0.3, 0.19, lz);
                root.add(th, cf);
            });
            const bodyPivot = new THREE.Group();
            bodyPivot.position.set(-0.04, 0.38, 0);
            root.add(bodyPivot);
            const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.55, 10), mat); torso.position.y = 0.27; bodyPivot.add(torso);
            const headGroup = new THREE.Group(); headGroup.position.y = 0.69;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), getCrowdHeadPlaceholderMaterial());
            const hair = new THREE.Mesh(new THREE.SphereGeometry(0.148, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM); hair.position.x = -0.015;
            headGroup.add(head, hair); bodyPivot.add(headGroup);
            const arm = sz => { const ap = new THREE.Group(); ap.position.set(0, 0.48, sz); const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.42, 7), mat); sl.position.y = -0.21; const hd = new THREE.Mesh(new THREE.SphereGeometry(0.05, 7, 7), handM); hd.position.y = -0.44; ap.add(sl, hd); bodyPivot.add(ap); return ap; };
            const leftArmPivot = arm(-0.24), rightArmPivot = arm(0.24);
            root.position.set(x, y, z);
            root.rotation.y = Math.atan2(z, 30) * 0.3;
            const childLift = maybeMakeCrowdChild(root, headGroup, true);
            targetGroup.add(root);
            crowdMembers.push({ mesh: root, bodyPivot, headGroup, leftArmPivot, rightArmPivot, baseY: y + childLift, phase: Math.random() * Math.PI * 2, standing: false });
        };
        const keep = preset.crowdKeepRatio * crowdAttendanceScale();   // pubblico in base all'importanza della partita (index.html)
        rows.forEach(rw => {
            for (let k = 0; k < seatsPerRow; k++) if (Math.random() < keep * 0.7) fan(rw.x + 0.02, rw.y, Z0 + seatPitch * (k + 0.5));
        });
    }

    registerArenaBuilder('fox_legnaro', buildFoxLegnaroArchitecture);
})();
