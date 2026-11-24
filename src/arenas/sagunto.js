// Palazzetto "sagunto": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // PABELLÓN POLIDEPORTIVO INTERNÚCLEOS — SAGUNTO (Valencia), casa degli Alas de Sagunto. Capannone luminoso
    // a due falde (colmo lungo la pista) con le capriate reticolari bianche e le file di fari appesi; al centro
    // la fascia di lastre traslucide bianche, ai lati le lastre azzurre. Pareti in blocchi di cemento grigio-beige
    // fino a 2,6 m, sopra pannelli di policarbonato traslucido con i montanti bianchi fino alla gronda (di giorno
    // ci entra il sole). Sul lato est (panchine) il telo frangivento blu davanti al muro e il tabellone in alto;
    // telo blu anche sulla testata nord. Reti scure dietro le porte. Sul lato ovest (cronometristi) la tribuna con
    // cinque file di seggiolini blu dietro la recinzione bassa a rete metallica.
    // Altezze: gronda a 10 m e colmo a 16,5 m come all'Espanya: le capriate restano sopra le telecamere di gioco
    // (broadcast 11,6 m, dall'alto 13,2 m); solo la vista dall'alto col telefono in verticale (15 m) le supera.
    // Texture in assets/textures/sagunto/ (tools/generate_sagunto_textures.py).
    // =====================================================================
    function buildSaguntoArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/sagunto/';
        const XW = -26, XE = 26, ZL = 40;                  // pareti: ovest (tribuna), est (panchine), testate
        const LX = XE - XW, LEN = 2 * ZL, HW = LX / 2;
        const EAVE = 10, RIDGE = 16.5, BLOCK_H = 2.6, LIGHT_HW = 9;   // fascia traslucida centrale: |x| < 9
        const roofY = x => EAVE + (RIDGE - EAVE) * (1 - Math.abs(x) / HW);   // falda (colmo lungo z, a x = 0)
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);

        // bianco anche visto da sotto, in controluce: un filo di autoilluminazione
        const steelWhite = new THREE.MeshStandardMaterial({ color: 0xe9eef2, roughness: 0.5, metalness: 0.3, emissive: 0x2e3236 });
        const greyMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.6, metalness: 0.4 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x26282c, roughness: 0.6, metalness: 0.3 });
        const tex = (f, rep) => loadFileTexture(T + f, rep ? { repeat: rep } : {});
        const flat = (w, h, mat, x, y, z, ry, parent) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
            m.position.set(x, y, z);
            m.rotation.y = ry || 0;
            (parent || targetGroup).add(m);
            return m;
        };
        const box = (w, h, d, mat, x, y, z) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            m.position.set(x, y, z);
            targetGroup.add(m);
            return m;
        };
        const lit = (t, k) => new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: k || 0.15, roughness: 0.8, side: THREE.DoubleSide });
        // pareti e lastre traslucide verso l'esterno: di giorno ci entra il sole (index.html, setupGenericDaylight)
        const winLit = (t, k) => { const m = lit(t, k); m.userData.sunWindow = true; return m; };
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: 14.5 };      // solo la vista dall'alto col telefono in verticale (15 m) sale fra le capriate

        // ---------- 1. pavimento in cemento grigio attorno alla pista
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(LX, LEN), new THREE.MeshStandardMaterial({ color: 0x8c8e8e, roughness: 0.75 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.y = -0.01;
        targetGroup.add(apron);

        // ---------- 2. copertura a due falde: lastre azzurre ai lati, fascia traslucida al colmo, capriate bianche
        // falda come quadrilatero fra due ascisse (UV in metri: u lungo la sala, v lungo la falda)
        const slopeQuad = (xa, xb, mat) => {
            const la = Math.hypot(xa, roofY(xa) - RIDGE), lb = Math.hypot(xb, roofY(xb) - RIDGE);
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute([
                xa, roofY(xa) + 0.05, -ZL, xa, roofY(xa) + 0.05, ZL, xb, roofY(xb) + 0.05, ZL, xb, roofY(xb) + 0.05, -ZL], 3));
            g.setAttribute('uv', new THREE.Float32BufferAttribute([0, la / 4, LEN / 4, la / 4, LEN / 4, lb / 4, 0, lb / 4], 2));
            g.setIndex([0, 1, 2, 0, 2, 3]);
            g.computeVertexNormals();
            ceilGroup.add(new THREE.Mesh(g, mat));
        };
        const blueRoof = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'roof_blue.jpg', { wrap: true }), roughness: 0.6, metalness: 0.1, emissive: 0x1a3048, side: THREE.DoubleSide });
        const lightRoof = winLit(loadFileTexture(T + 'roof_light.jpg', { wrap: true }), 0.65);
        [-1, 1].forEach(s => {
            slopeQuad(s * HW, s * LIGHT_HW, blueRoof);
            slopeQuad(s * LIGHT_HW, 0, lightRoof);
        });
        const trussZ = [];
        for (let z = -ZL + 2; z <= ZL - 1.99; z += 6) trussZ.push(z);
        const beams = [];
        const bottomY = x => roofY(x) - 0.9 - 0.3 * (1 - Math.abs(x) / HW);       // corrente inferiore: più basso al colmo
        trussZ.forEach(z => {
            const n = 12;
            for (let s = -1; s <= 1; s += 2) {
                for (let i = 0; i < n; i++) {
                    const xa = s * HW * i / n, xb = s * HW * (i + 1) / n;
                    beams.push([V(xa, roofY(xa) - 0.12, z), V(xb, roofY(xb) - 0.12, z), 0.18]);           // corrente superiore
                    beams.push([V(xa, bottomY(xa), z), V(xb, bottomY(xb), z), 0.15]);                    // corrente inferiore
                    beams.push([V(xa, bottomY(xa), z), V(xb, roofY(xb) - 0.12, z), 0.07]);               // diagonali
                    beams.push([V(xb, bottomY(xb), z), V(xb, roofY(xb) - 0.12, z), 0.06]);               // montanti
                }
            }
        });
        // arcarecci lungo le falde, controventi a croce nelle campate di testata, pilastri bianchi sulle pareti lunghe
        for (let k = 1; k < 8; k++) {
            const x = HW * k / 8;
            [-1, 1].forEach(s => beams.push([V(s * x, roofY(x) - 0.2, -ZL), V(s * x, roofY(x) - 0.2, ZL), 0.08]));
        }
        beams.push([V(0, RIDGE - 0.2, -ZL), V(0, RIDGE - 0.2, ZL), 0.1]);
        [[trussZ[0], trussZ[1]], [trussZ[trussZ.length - 2], trussZ[trussZ.length - 1]]].forEach(([za, zb]) => [-1, 1].forEach(s => {
            const xa = s * HW * 0.25, xb = s * HW * 0.75;
            beams.push([V(xa, roofY(xa) - 0.25, za), V(xb, roofY(xb) - 0.25, zb), 0.05], [V(xa, roofY(xa) - 0.25, zb), V(xb, roofY(xb) - 0.25, za), 0.05]);
        }));
        trussZ.forEach(z => [XW + 0.25, XE - 0.25].forEach(x => beams.push([V(x, 0, z), V(x, EAVE, z), 0.4])));
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(beams), steelWhite));
        // fari rettangolari appesi sotto le capriate (corpo scuro, faccia luminosa)
        const lights = [];
        for (let k = 0; k < trussZ.length - 1; k++) {
            const z = (trussZ[k] + trussZ[k + 1]) / 2;
            [-18, -11, -4, 4, 11, 18].forEach(x => lights.push([x, bottomY(x) - 0.25, z]));
        }
        const ledBody = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.16, 0.45), darkMat, lights.length);
        const ledFace = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.52, 0.38).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffdf6, side: THREE.DoubleSide }), lights.length);
        const hangers = [];
        lights.forEach(([x, y, z], i) => {
            tmpM.makeTranslation(x, y, z); ledBody.setMatrixAt(i, tmpM);
            tmpM.makeTranslation(x, y - 0.085, z); ledFace.setMatrixAt(i, tmpM);
            hangers.push([V(x, y + 0.08, z), V(x, roofY(x) - 0.3, z), 0.015]);
        });
        ledBody.instanceMatrix.needsUpdate = true;
        ledFace.instanceMatrix.needsUpdate = true;
        ceilGroup.add(ledBody, ledFace, new THREE.Mesh(mergeBeamGeometry(hangers), darkMat));
        if (!lowQ) {
            const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
            lights.forEach(([x, y, z], i) => {
                if (i % 2) return;
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfffaf0, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(2.2, 2.2, 1);
                spr.position.set(x, y - 0.3, z);
                ceilGroup.add(spr);
            });
        }

        // ---------- 3. pareti lunghe: blocchi di cemento in basso, policarbonato traslucido fino alla gronda
        const blockMat = (w) => new THREE.MeshStandardMaterial({ map: tex('block_wall.jpg', [w / 4, 1]), roughness: 0.9, side: THREE.DoubleSide });
        const polyMat = (w, h) => winLit(tex('poly_wall.jpg', [w / 4, h / 4]), 0.55);
        const POLY_H = EAVE - BLOCK_H;
        [[XE, -Math.PI / 2, -1], [XW, Math.PI / 2, 1]].forEach(([x, ry, inward]) => {
            flat(LEN, BLOCK_H, blockMat(LEN), x, BLOCK_H / 2, 0, ry);
            flat(LEN, POLY_H, polyMat(LEN, POLY_H), x, BLOCK_H + POLY_H / 2, 0, ry);
            box(0.3, 0.16, LEN, steelWhite, x + inward * 0.15, BLOCK_H + 0.08, 0);       // copertina sul muro
            box(0.12, 0.12, LEN, steelWhite, x + inward * 0.06, EAVE - 0.06, 0);         // trave di gronda
        });
        // telo frangivento blu davanti al muro est, con i pali; striscione del club
        const windMat = new THREE.MeshStandardMaterial({ map: tex('windscreen.jpg', [LEN / 4, 1]), roughness: 0.9, side: THREE.DoubleSide });
        flat(LEN - 6, 2.0, windMat, XE - 0.5, 1.4, 0, -Math.PI / 2);
        const posts = [];
        for (let z = -ZL + 3; z <= ZL - 3 + 0.01; z += 3.7) posts.push([V(XE - 0.55, 0, z), V(XE - 0.55, 2.45, z), 0.05]);
        posts.push([V(XE - 0.55, 2.42, -ZL + 3), V(XE - 0.55, 2.42, ZL - 3), 0.04]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(posts), greyMat));
        flat(4.4, 1.65, lit(tex('banner_club.jpg'), 0.14), XE - 0.06, 4.6, -16, -Math.PI / 2);

        // ---------- 4. testate: blocchi in basso, policarbonato fino alle falde (montanti bianchi), telo blu a nord
        const gable = new THREE.Shape();
        gable.moveTo(XW, BLOCK_H); gable.lineTo(XE, BLOCK_H); gable.lineTo(XE, EAVE); gable.lineTo(0, RIDGE); gable.lineTo(XW, EAVE); gable.lineTo(XW, BLOCK_H);
        const gableGeo = new THREE.ShapeGeometry(gable);
        const gp = gableGeo.attributes.position, gu = gableGeo.attributes.uv;
        for (let i = 0; i < gp.count; i++) gu.setXY(i, gp.getX(i) / 4, gp.getY(i) / 4);
        const gableMat = winLit(loadFileTexture(T + 'poly_wall.jpg', { wrap: true }), 0.55);
        const mull = [];
        [[-ZL, 0], [ZL, Math.PI]].forEach(([z, ry]) => {
            const g = new THREE.Mesh(gableGeo, gableMat);
            g.position.z = z;
            targetGroup.add(g);
            const dz = z < 0 ? 0.02 : -0.02;
            flat(LX, BLOCK_H, blockMat(LX), 0, BLOCK_H / 2, z + dz, ry);
            for (let x = XW + 4; x <= XE - 3.99; x += 4) mull.push([V(x, BLOCK_H, z + dz * 6), V(x, roofY(x) - 0.1, z + dz * 6), 0.14]);
            mull.push([V(XW, EAVE - 0.1, z + dz * 6), V(0, RIDGE - 0.1, z + dz * 6), 0.16], [V(XE, EAVE - 0.1, z + dz * 6), V(0, RIDGE - 0.1, z + dz * 6), 0.16]);
            mull.push([V(XW, BLOCK_H + 0.08, z + dz * 6), V(XE, BLOCK_H + 0.08, z + dz * 6), 0.16]);
        });
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(mull), steelWhite));
        flat(LX - 10, 2.0, windMat, 3, 1.4, -ZL + 0.5, 0);

        // ---------- 5. reti scure dietro le porte, dalle balaustre fin sotto le capriate
        const netMat = new THREE.MeshBasicMaterial({ map: loadFileTexture(T + 'net.png', { repeat: [22 / 1.6, 5.2 / 1.6] }), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.75 });
        [-1, 1].forEach(sgn => {
            flat(22, 5.2, netMat, 0, 1.15 + 2.6, sgn * 36.2, 0);
            const c = [[V(-11, 6.35, sgn * 36.2), V(11, 6.35, sgn * 36.2), 0.03]];
            [-11, -5.5, 0, 5.5, 11].forEach(x => c.push([V(x, 1.1, sgn * 36.2), V(x, 6.35, sgn * 36.2), 0.05]));
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry(c), greyMat));
        });

        // ---------- 6. tribuna ovest: recinzione bassa a rete, gradoni in cemento e cinque file di seggiolini blu
        const ZT = 33, TL = 2 * ZT, FENCE_X = -21.3;
        const meshMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'mesh_fence.png', { repeat: [TL / 0.5, 1.1 / 0.5] }), transparent: true, alphaTest: 0.3, roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide });
        flat(TL, 1.1, meshMat, FENCE_X, 0.15 + 0.55, 0, Math.PI / 2);
        const fence = [[V(FENCE_X, 1.25, -ZT), V(FENCE_X, 1.25, ZT), 0.06], [V(FENCE_X, 0.15, -ZT), V(FENCE_X, 0.15, ZT), 0.05]];
        for (let z = -ZT; z <= ZT + 0.01; z += 2) fence.push([V(FENCE_X, 0, z), V(FENCE_X, 1.25, z), 0.05]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(fence), greyMat));
        const TIERS = 5, STEP_D = 0.8, STEP_H = 0.4, BASE = 0.3, X0 = FENCE_X - 0.5;   // ultima fila a -25,8 m, parete a -26
        const concrete = new THREE.MeshStandardMaterial({ color: 0x9e9a92, roughness: 0.9 });
        for (let k = 0; k < TIERS; k++) {
            const h = BASE + k * STEP_H, xa = X0 - (k + 1) * STEP_D;
            box(STEP_D, h, TL, concrete, xa + STEP_D / 2, h / 2, 0);
        }
        const backTop = BASE + TIERS * STEP_H;
        box(X0 - TIERS * STEP_D - XW, backTop, TL, concrete, (XW + X0 - TIERS * STEP_D) / 2, backTop / 2, 0);   // passaggio alle spalle
        [-1, 1].forEach(sgn => box(X0 - XW, backTop, 0.2, concrete, (X0 + XW) / 2, backTop / 2, sgn * (ZT + 0.1)));
        // seggiolini blu a guscio rivolti verso la pista (+x): seduta, schienale e bordo
        const SEAT_P = lowQ ? 0.6 : 0.5, aisles = [-22, -11, 0, 11, 22];
        const seatSpots = [];
        for (let k = 0; k < TIERS; k++) {
            const h = BASE + k * STEP_H, xs = X0 - (k + 1) * STEP_D + 0.42;
            for (let z = -ZT + 0.5; z <= ZT - 0.5; z += SEAT_P) {
                if (aisles.some(a => Math.abs(z - a) < 0.6)) continue;
                seatSpots.push([xs, h, z]);
            }
        }
        const bluePlastic = new THREE.MeshStandardMaterial({ color: 0x1f63c8, roughness: 0.3, metalness: 0.05 });
        const seatPan = new THREE.BoxGeometry(0.42, 0.07, 0.44).translate(0, 0.42, 0);
        const seatBack = new THREE.BoxGeometry(0.07, 0.42, 0.44).rotateZ(0.2).translate(-0.24, 0.66, 0);
        const seatLip = new THREE.BoxGeometry(0.06, 0.08, 0.44).translate(0.2, 0.45, 0);
        const pans = new THREE.InstancedMesh(seatPan, bluePlastic, seatSpots.length);
        const backs = new THREE.InstancedMesh(seatBack, bluePlastic, seatSpots.length);
        const lips = new THREE.InstancedMesh(seatLip, bluePlastic, seatSpots.length);
        seatSpots.forEach(([x, y, z], i) => {
            tmpM.makeTranslation(x, y, z);
            pans.setMatrixAt(i, tmpM); backs.setMatrixAt(i, tmpM); lips.setMatrixAt(i, tmpM);
        });
        [pans, backs, lips].forEach(m => { m.instanceMatrix.needsUpdate = true; targetGroup.add(m); });

        // ---------- 7. pubblico: seduto sui seggiolini, qualcuno in piedi lungo il telo blu dietro le panchine
        const outfits = [0x86d81f, 0x141416, 0xf8fafc, 0x141416, 0x86d81f, 0x2e62b8, 0x4b5563, 0xd71f26, 0xf5c518];
        const jm = outfits.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 }));
        const pantsM = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const handM = new THREE.MeshStandardMaterial({ color: 0xc99178, roughness: 0.6 });
        const hairM = new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.8 });
        const fan = (x, y, z, faceAngle, sitting) => {
            const root = new THREE.Group();
            const mt = jm[Math.floor(Math.random() * jm.length)];
            const legH = sitting ? 0.42 : 0.82;
            [-0.11, 0.11].forEach(lz => { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, legH, 7), pantsM); lg.position.set(sitting ? 0.18 : 0, legH / 2, lz); root.add(lg); });
            const bodyPivot = new THREE.Group();
            bodyPivot.position.set(0, legH, 0);
            root.add(bodyPivot);
            const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.55, 10), mt); torso.position.y = 0.27; bodyPivot.add(torso);
            const headGroup = new THREE.Group(); headGroup.position.y = 0.69;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), getRandomPhotoFaceMaterial());
            const hair = new THREE.Mesh(new THREE.SphereGeometry(0.148, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM); hair.position.x = -0.015;
            headGroup.add(head, hair); bodyPivot.add(headGroup);
            const arm = sz => { const ap = new THREE.Group(); ap.position.set(0, 0.48, sz); const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.42, 7), mt); sl.position.y = -0.21; const hd = new THREE.Mesh(new THREE.SphereGeometry(0.05, 7, 7), handM); hd.position.y = -0.44; ap.add(sl, hd); bodyPivot.add(ap); return ap; };
            const leftArmPivot = arm(-0.24), rightArmPivot = arm(0.24);
            root.position.set(x, y, z);
            root.rotation.y = faceAngle + (Math.random() - 0.5) * 0.3;
            const childLift = maybeMakeCrowdChild(root, headGroup, false);
            targetGroup.add(root);
            crowdMembers.push({ mesh: root, bodyPivot, headGroup, leftArmPivot, rightArmPivot, baseY: y + childLift, phase: Math.random() * Math.PI * 2, standing: !sitting });
        };
        const keep = preset.crowdKeepRatio * crowdAttendanceScale();   // pubblico in base all'importanza della partita (index.html)
        seatSpots.forEach(([x, y, z]) => {
            const k = Math.round((y - BASE) / STEP_H);
            // più gente nelle file basse e al centro (tribuna mai piena)
            if (Math.random() < keep * (0.4 - k * 0.05) * (1 - Math.abs(z) / 55)) fan(x - 0.05, y + 0.04, z, 0, true);
        });
        for (let z = -34; z <= 34; z += 0.9) {
            if (Math.abs(z) < 17.5) continue;
            if (Math.random() < keep * 0.22) fan(XE - 1.2, 0, z, Math.PI, false);
        }
    }

    registerArenaBuilder('sagunto', buildSaguntoArchitecture);
})();
