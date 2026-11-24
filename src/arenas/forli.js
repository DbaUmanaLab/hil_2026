// Palazzetto "forli": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, arenaSwayItems, CIT_TEX, ...).
(function () {
    // =====================================================================
    // PATTINODROMO COMUNALE DI FORLÌ — capannone con telaio in acciaio verde,
    // pareti bianche in basso, fascia argentata, pannelli grigi con finestroni e tende,
    // capriate scure con fari tondi, balaustre bianche con bordo blu,
    // tribuna rialzata dietro le panchine (ringhiera verde, panche in legno),
    // tabellone e cronometristi sulla parete lunga opposta.
    // Texture in assets/textures/forli/ (tools/generate_forli_textures.py).
    // =====================================================================
    function buildForliArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/forli/';
        const XW = -27.6, XE = 24.5, HL = 40;   // XE: parete ufficiale (panchine e cronometristi), XW: dietro la tribuna
        const CXH = (XW + XE) / 2;
        const LOW_H = 3.6, BAND_H = 1.2, WALL_TOP = 12.6, CHORD = 12.9, ROOF = 15.0;
        const tmpM = new THREE.Matrix4();
        const greenSteel = new THREE.MeshStandardMaterial({ color: 0x1f4a33, roughness: 0.5, metalness: 0.45 });
        const darkSteel = new THREE.MeshStandardMaterial({ color: 0x222a26, roughness: 0.55, metalness: 0.45 });
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xfffbea });
        const texMat = (file, rx, ry, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ map: loadFileTexture(T + file, { repeat: [rx, ry] }), roughness: 0.85 }, extra));

        // ---------- 1. pareti: quattro lati a tre fasce
        const sides = [
            { len: 2 * HL, x: XW, z: 0, rot: Math.PI / 2 },
            { len: 2 * HL, x: XE, z: 0, rot: -Math.PI / 2 },
            { len: XE - XW, x: CXH, z: -HL, rot: 0 },
            { len: XE - XW, x: CXH, z: HL, rot: Math.PI }
        ];
        const plane = (mat, w, h, x, y, z, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = rot; targetGroup.add(m); return m; };
        sides.forEach(sd => {
            const n = new THREE.Vector3(Math.sin(sd.rot), 0, Math.cos(sd.rot));
            const lower = plane(texMat('wall_lower.jpg', sd.len / 2, LOW_H / 2), sd.len, LOW_H, sd.x, LOW_H / 2, sd.z, sd.rot);
            lower.receiveShadow = preset.shadows;
            const band = plane(texMat('silver_band.jpg', sd.len / 4, 1, { metalness: 0.5, roughness: 0.4 }), sd.len, BAND_H, sd.x + n.x * 0.3, LOW_H + BAND_H / 2, sd.z + n.z * 0.3, sd.rot);
            const ledge = new THREE.Mesh(new THREE.BoxGeometry(sd.rot === 0 || sd.rot === Math.PI ? sd.len : 0.6, 0.08, sd.rot === 0 || sd.rot === Math.PI ? 0.6 : sd.len), new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 0.5, roughness: 0.4 }));
            ledge.position.set(sd.x + n.x * 0.3, LOW_H, sd.z + n.z * 0.3);
            targetGroup.add(ledge);
            plane(texMat('wall_panel.jpg', sd.len / 2, (WALL_TOP - LOW_H - BAND_H) / 2, { normalMap: loadFileTexture(T + 'wall_panel_n.jpg', { repeat: [sd.len / 2, (WALL_TOP - LOW_H - BAND_H) / 2] }) }),
                sd.len, WALL_TOP - LOW_H - BAND_H + 2.6, sd.x, (LOW_H + BAND_H + WALL_TOP + 2.6) / 2, sd.z, sd.rot);
        });

        // ---------- 2. telaio verde: pilastri, correnti, controventi a croce e finestroni
        const winMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'window.jpg'), emissive: 0xffffff, emissiveMap: loadFileTexture(T + 'window.jpg'), emissiveIntensity: 0.55, roughness: 0.3 });
        winMat.userData.sunWindow = true;            // finestra verso l'esterno: di giorno ci entra il sole (index.html)
        const blindMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'blind.jpg'), emissive: 0xfff4d0, emissiveMap: loadFileTexture(T + 'blind.jpg'), emissiveIntensity: 0.45, roughness: 0.8 });
        const beams = [];
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        const longWall = (x, inward) => {
            for (let z = -HL; z <= HL + 0.01; z += 6) beams.push([V(x + inward * 0.2, 0, z), V(x + inward * 0.2, ROOF, z), 0.4]);
            [LOW_H + BAND_H, 9.8, WALL_TOP].forEach(y => beams.push([V(x + inward * 0.15, y, -HL), V(x + inward * 0.15, y, HL), 0.18]));
            let bay = 0;
            for (let z = -HL; z < HL - 0.01; z += 6, bay++) {
                const zc = z + 3;
                if (bay % 2 === 0) {
                    beams.push([V(x + inward * 0.15, LOW_H + BAND_H, z), V(x + inward * 0.15, 9.8, z + 6), 0.1]);
                    beams.push([V(x + inward * 0.15, 9.8, z), V(x + inward * 0.15, LOW_H + BAND_H, z + 6), 0.1]);
                } else {
                    plane(bay % 4 === 1 ? blindMat : winMat, 2.4, 3.6, x + inward * 0.06, 7.7, zc, inward > 0 ? Math.PI / 2 : -Math.PI / 2);
                }
                beams.push([V(x + inward * 0.15, 9.8, z), V(x + inward * 0.15, WALL_TOP, z + 6), 0.09]);
                beams.push([V(x + inward * 0.15, WALL_TOP, z), V(x + inward * 0.15, 9.8, z + 6), 0.09]);
            }
        };
        longWall(XW, 1);
        longWall(XE, -1);
        [-1, 1].forEach(dir => {
            const z = dir * HL - dir * 0.15;
            for (let x = XW; x <= XE + 0.01; x += (XE - XW) / 6) beams.push([V(x, 0, z), V(x, ROOF, z), 0.4]);
            [LOW_H + BAND_H, 9.8, WALL_TOP].forEach(y => beams.push([V(XW, y, z), V(XE, y, z), 0.18]));
            for (let k = 0; k < 6; k++) {
                const x0 = XW + (XE - XW) * k / 6, x1 = XW + (XE - XW) * (k + 1) / 6;
                if (k === 1 || k === 4) plane(k === 1 ? winMat : blindMat, 2.4, 3.6, (x0 + x1) / 2, 7.7, dir * HL - dir * 0.06, dir < 0 ? 0 : Math.PI);
                else { beams.push([V(x0, 9.8, z), V(x1, WALL_TOP, z), 0.09]); beams.push([V(x0, WALL_TOP, z), V(x1, 9.8, z), 0.09]); }
            }
        });
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(beams), greenSteel));

        // ---------- 3. copertura: capriate scure, arcarecci, lamiera
        const truss = [];
        const NP = 26;
        for (let i = 0; i < NP; i++) {
            const x0 = XW + (XE - XW) * i / NP, x1 = XW + (XE - XW) * (i + 1) / NP;
            truss.push([V(x0, CHORD, 0), V(x1, CHORD, 0), 0.16], [V(x0, ROOF - 0.2, 0), V(x1, ROOF - 0.2, 0), 0.18], [V(x0, CHORD, 0), V(x0, ROOF - 0.2, 0), 0.08]);
            truss.push(i % 2 === 0 ? [V(x0, CHORD, 0), V(x1, ROOF - 0.2, 0), 0.07] : [V(x0, ROOF - 0.2, 0), V(x1, CHORD, 0), 0.07]);
        }
        const trussZ = [];
        for (let z = -HL + 6; z <= HL - 5.99; z += 6) trussZ.push(z);
        const trusses = new THREE.InstancedMesh(mergeBeamGeometry(truss), darkSteel, trussZ.length);
        trussZ.forEach((z, i) => { tmpM.makeTranslation(0, 0, z); trusses.setMatrixAt(i, tmpM); });
        trusses.instanceMatrix.needsUpdate = true;
        targetGroup.add(trusses);
        const purl = [];
        for (let x = XW + 3; x < XE; x += 4.3) purl.push([V(x, ROOF - 0.1, -HL), V(x, ROOF - 0.1, HL), 0.14]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(purl), darkSteel));
        const deck = new THREE.Mesh(new THREE.PlaneGeometry(XE - XW, 2 * HL), new THREE.MeshStandardMaterial({
            map: loadFileTexture(VIC_TEX + 'ceiling_deck.jpg', { repeat: [XE - XW, 2 * HL] }), color: 0x4a5566, roughness: 0.7, metalness: 0.3, side: THREE.DoubleSide }));
        deck.rotation.x = Math.PI / 2;
        deck.position.set(CXH, ROOF, 0);
        targetGroup.add(deck);

        // ---------- 4. fari tondi sotto le capriate
        const lampXs = [-17, -8, 1, 10, 19];
        const nL = lampXs.length * trussZ.length;
        const housings = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.42, 0.4, 14), darkSteel, nL);
        const discs = new THREE.InstancedMesh(new THREE.CircleGeometry(0.38, 16).rotateX(Math.PI / 2), lightMat, nL);
        const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
        let li = 0;
        trussZ.forEach(z => lampXs.forEach(x => {
            tmpM.makeTranslation(x, CHORD - 0.3, z); housings.setMatrixAt(li, tmpM);
            tmpM.makeTranslation(x, CHORD - 0.51, z); discs.setMatrixAt(li, tmpM);
            if (!lowQ) {
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff6dc, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(2.6, 2.6, 1);
                spr.position.set(x, CHORD - 0.7, z);
                targetGroup.add(spr);
            }
            li++;
        }));
        housings.instanceMatrix.needsUpdate = true;
        discs.instanceMatrix.needsUpdate = true;
        targetGroup.add(housings, discs);

        // ---------- 5. porte dai telai verdi e uscite di sicurezza
        const exitMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
        const doorGlow = new THREE.MeshBasicMaterial({ color: 0xe8f2e4 });
        const door = (x, z, rot, w = 2.2) => {
            const g = new THREE.Group();
            const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 2.8, 0.16), greenSteel); fr.position.y = 1.4;
            const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.6), doorGlow); gl.position.set(0, 1.3, 0.09);
            const ex = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.06), exitMat); ex.position.set(0, 3.05, 0.09);
            g.add(fr, gl, ex); g.position.set(x, 0, z); g.rotation.y = rot; targetGroup.add(g);
        };
        door(XE - 0.05, -26, -Math.PI / 2);
        door(XE - 0.05, 26, -Math.PI / 2);
        door(XE - 0.05, 32.5, -Math.PI / 2);
        door(XW + 0.05, -32, Math.PI / 2);
        door(12, -HL + 0.05, 0);
        door(-14, HL - 0.05, Math.PI);

        // ---------- 6. striscioni, stendardo "Rossi R. 69", bandiere
        const bMats = {};
        const bMat = f => bMats[f] || (bMats[f] = (() => { const t = loadFileTexture(T + f); return new THREE.MeshStandardMaterial({ map: t, transparent: f.endsWith('.png'), alphaTest: 0.05, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.18, roughness: 0.85, side: THREE.DoubleSide }); })());
        const onW = (f, w, h, z, y) => plane(bMat(f), w, h, XE - 0.38, y, z, -Math.PI / 2);     // parete cronometristi (lato panchine)
        const onE = (f, w, h, z, y) => plane(bMat(f), w, h, XW + 0.38, y, z, Math.PI / 2);      // parete dietro la tribuna
        onW('banners/libertas.jpg', 4.4, 1.1, -12, 4.2);
        onW('banners/fisr100.jpg', 4.0, 1.0, -26, 4.6);
        onW('banners/roday.jpg', 3.2, 0.8, 26, 4.6);
        onW('banners/coppa_u19.jpg', 4.4, 1.1, 12, 4.2);
        onW('banners/campionesse.jpg', 4.4, 1.1, -21, 4.2);
        onW('banners/forli_banner.jpg', 4.4, 1.1, 21, 4.2);
        const rossi = plane(bMat('banners/rossi69.png'), 2.2, 5.1, XE - 0.5, 7.4, 15, -Math.PI / 2);
        rossi.renderOrder = 2;
        onE('banners/adjutor.jpg', 4.0, 1.0, -8, 5.6);
        onE('banners/rizzoli.jpg', 4.0, 1.0, 8, 5.6);
        onE('banners/forli_banner.jpg', 4.4, 1.1, 20, 5.6);
        plane(bMat('banners/forli_banner.jpg'), 5.0, 1.25, -6, 5.6, -HL + 0.38, 0);
        plane(bMat('banners/libertas.jpg'), 4.4, 1.1, 8, 5.6, -HL + 0.38, 0);
        plane(bMat('banners/adjutor.jpg'), 4.0, 1.0, -8, 5.6, HL - 0.38, Math.PI);
        plane(bMat('banners/rizzoli.jpg'), 4.0, 1.0, 8, 5.6, HL - 0.38, Math.PI);
        const flags = ['italia', 'svizzera', 'slovenia', 'regnounito', 'europa', 'italia', 'francia', 'spagna', 'portogallo', 'argentina'];
        flags.forEach((f, i) => {
            const z = -27 + i * 6;
            const pivot = new THREE.Group();
            pivot.position.set(XE - 0.7, 6.9, z);
            const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), bMat('flags/' + f + '.jpg'));
            fl.rotation.y = -Math.PI / 2;
            fl.position.y = -0.55;
            pivot.add(fl);
            targetGroup.add(pivot);
            arenaSwayItems.push({ obj: pivot, amp: 0.04, speed: 0.7 + Math.random() * 0.4, phase: Math.random() * 6 });
        });

        // ---------- 7. reti di protezione dietro le porte
        const netTex = loadFileTexture(CIT_TEX + 'netting.png', { repeat: [24 / 0.12, 4 / 0.12] });
        const netMat = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, depthWrite: false, opacity: 0.5 });
        [-1, 1].forEach(dir => {
            const net = new THREE.Mesh(new THREE.PlaneGeometry(24, 4), netMat);
            net.position.set(0, 4.5, dir * 36.32);
            targetGroup.add(net);
        });

        // ---------- 8. tribuna rialzata di fronte alle panchine: passerella, ringhiera verde, panche in legno, pubblico
        const concrete = new THREE.MeshStandardMaterial({ color: 0x9a9da2, roughness: 0.9 });
        const railMat = new THREE.MeshStandardMaterial({ color: 0x23704a, roughness: 0.45, metalness: 0.4 });
        const woodMat = new THREE.MeshStandardMaterial({ map: getPhotorealisticPBRMaps().woodDiffuse, color: 0xd8a35a, roughness: 0.6 });
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5, metalness: 0.4 });
        const Z0 = -27, Z1 = 27, LEN = Z1 - Z0;
        const walk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, LEN), concrete);
        walk.position.set(-22.5, 0.45, 0);
        targetGroup.add(walk);
        const rails = [];
        [1.45, 1.95].forEach(y => rails.push([V(-21.5, y, Z0), V(-21.5, y, Z1), 0.07]));
        for (let z = Z0; z <= Z1 + 0.01; z += 2.25) rails.push([V(-21.5, 0.9, z), V(-21.5, 1.95, z), 0.07]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rails), railMat));
        const rows = [{ x: -24.2, y: 1.25 }, { x: -25.35, y: 1.65 }, { x: -26.5, y: 2.05 }];
        rows.forEach(rw => {
            const st = new THREE.Mesh(new THREE.BoxGeometry(1.15, rw.y, LEN), concrete);
            st.position.set(rw.x, rw.y / 2, 0);
            st.receiveShadow = preset.shadows;
            targetGroup.add(st);
            const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, LEN - 0.4), woodMat);
            seat.position.set(rw.x + 0.1, rw.y + 0.42, 0);
            const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, LEN - 0.4), woodMat);
            back.position.set(rw.x - 0.18, rw.y + 0.66, 0);
            targetGroup.add(seat, back);
            const fr = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.42, 0.05), frameMat, Math.floor(LEN / 2.4));
            for (let i = 0; i < Math.floor(LEN / 2.4); i++) { tmpM.makeTranslation(rw.x + 0.1, rw.y + 0.21, Z0 + 1 + i * 2.4); fr.setMatrixAt(i, tmpM); }
            fr.instanceMatrix.needsUpdate = true;
            targetGroup.add(fr);
        });
        // spettatori (seduti sulle panche e in piedi lungo la ringhiera), rivolti verso la pista (+x)
        const outfits = [0x16244f, 0xf8fafc, 0x3d8bd1, 0x374151, 0x16244f, 0xb91c1c];
        const jm = outfits.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 }));
        const pantsM = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const handM = new THREE.MeshStandardMaterial({ color: 0xe6b9a2, roughness: 0.6 });
        const hairM = new THREE.MeshStandardMaterial({ color: 0x241a14, roughness: 0.8 });
        const fan = (x, y, z, standing) => {
            const root = new THREE.Group();
            const mat = jm[Math.floor(Math.random() * jm.length)];
            if (standing) {
                [-0.11, 0.11].forEach(lz => { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.82, 7), pantsM); lg.position.set(0, 0.41, lz); root.add(lg); });
            } else {
                [-0.11, 0.11].forEach(lz => {
                    const th = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.072, 0.36, 7), pantsM); th.rotation.z = Math.PI / 2; th.position.set(0.14, 0.36, lz);
                    const cf = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.062, 0.38, 7), pantsM); cf.position.set(0.3, 0.19, lz);
                    root.add(th, cf);
                });
            }
            const bodyPivot = new THREE.Group();
            bodyPivot.position.set(standing ? 0 : -0.04, standing ? 0.82 : 0.38, 0);
            root.add(bodyPivot);
            const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.55, 10), mat); torso.position.y = 0.27; bodyPivot.add(torso);
            const headGroup = new THREE.Group(); headGroup.position.y = 0.69;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), getRandomPhotoFaceMaterial());
            const hair = new THREE.Mesh(new THREE.SphereGeometry(0.148, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM); hair.position.x = -0.015;
            headGroup.add(head, hair); bodyPivot.add(headGroup);
            const arm = sz => { const ap = new THREE.Group(); ap.position.set(0, 0.48, sz); const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.42, 7), mat); sl.position.y = -0.21; const hd = new THREE.Mesh(new THREE.SphereGeometry(0.05, 7, 7), handM); hd.position.y = -0.44; ap.add(sl, hd); bodyPivot.add(ap); return ap; };
            const leftArmPivot = arm(-0.24), rightArmPivot = arm(0.24);
            root.position.set(x, y, z);
            root.rotation.y = Math.atan2(z, 30) * 0.3;
            const childLift = maybeMakeCrowdChild(root, headGroup, !standing);
            targetGroup.add(root);
            crowdMembers.push({ mesh: root, bodyPivot, headGroup, leftArmPivot, rightArmPivot, baseY: y + childLift, phase: Math.random() * Math.PI * 2, standing });
        };
        const keep = preset.crowdKeepRatio * crowdAttendanceScale();   // pubblico in base all'importanza della partita (index.html)
        rows.forEach(rw => { for (let z = Z0 + 0.7; z <= Z1 - 0.7; z += 0.95) if (Math.random() < keep * 0.8) fan(rw.x - 0.02, rw.y, z + (Math.random() - 0.5) * 0.2, false); });
        for (let z = Z0 + 1; z <= Z1 - 1; z += 1.6) if (Math.random() < keep * 0.35) fan(-22.0, 0.9, z, true);

        // ---------- 9. pavimento di servizio attorno alla pista
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(XE - XW, 2 * HL), new THREE.MeshStandardMaterial({ color: 0x8e9196, roughness: 0.85 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(CXH, -0.01, 0);
        targetGroup.add(apron);
    }

    registerArenaBuilder('forli', buildForliArchitecture);
})();
