// Palazzetto "villeneuve": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // GYMNASE FERNAND SCHWARTZ — VILLENEUVE-LA-GARENNE (92). Palestra rettangolare con travi
    // trasversali in legno lamellare leggermente centinate e copertura in pannelli blu ardesia
    // (qualche lastra traslucida), file di fari tondi appesi. Lato tribuna (-x): gradoni in
    // cemento con panche di legno e corrimano arancione, sopra la galleria vetrata con i montanti
    // gialli e in fondo il bar dei Fous du Bitume. Lato panchine (+x): blocchi di cemento con le
    // porte gialle e finestroni. Testate in pannelli beige con controventi in acciaio, canestri,
    // bandiere francese e ceca, striscioni del club. Fascia pubblicitaria scura tutto intorno.
    // Texture in assets/textures/villeneuve/ (tools/generate_villeneuve_textures.py).
    // =====================================================================
    function buildVilleneuveArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/villeneuve/';
        const XW = -27.5, XE = 24.5, ZL = 42;              // pareti: ovest (tribuna), est (panchine), testate
        const XC = (XW + XE) / 2, HALF = (XE - XW) / 2;
        const BEAM_H = 0.9;
        // intradosso centinato delle travi: 12,6 m alle pareti, 15 m al centro (sopra le telecamere alte)
        const yb = x => 12.6 + 2.4 * (1 - Math.pow((x - XC) / HALF, 2));
        const yt = x => yb(x) + BEAM_H;
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);

        const steelMat = new THREE.MeshStandardMaterial({ color: 0x8b9199, roughness: 0.45, metalness: 0.6 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.5, metalness: 0.3 });
        const tex = (f, rep) => loadFileTexture(T + f, rep ? { repeat: rep } : {});
        const flat = (w, h, mat, x, y, z, ry) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
            m.position.set(x, y, z);
            m.rotation.y = ry || 0;
            targetGroup.add(m);
            return m;
        };
        // soffitto (travi, copertura, fari): nascosto se una telecamera sale sopra le travi
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: 14.2 };
        const lit = (t, k) => new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: k || 0.15, roughness: 0.8, side: THREE.DoubleSide });

        // ---------- 1. pavimento sportivo azzurro attorno alla pista
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(XE - XW, 2 * ZL), new THREE.MeshStandardMaterial({ color: 0x6188ba, roughness: 0.6 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(XC, -0.01, 0);
        targetGroup.add(apron);

        // ---------- 2. travi trasversali in legno lamellare (profilo centinato estruso)
        const beamShape = new THREE.Shape();
        const NB = 32;
        for (let i = 0; i <= NB; i++) { const x = XW + (XE - XW) * i / NB; i ? beamShape.lineTo(x, yb(x)) : beamShape.moveTo(x, yb(x)); }
        for (let i = NB; i >= 0; i--) { const x = XW + (XE - XW) * i / NB; beamShape.lineTo(x, yt(x)); }
        const beamGeo = new THREE.ExtrudeGeometry(beamShape, { depth: 0.32, bevelEnabled: false, curveSegments: 1 });
        beamGeo.translate(0, 0, -0.16);
        const glulam = tex('glulam.jpg', [0.25, 1.1]);
        const woodMat = new THREE.MeshStandardMaterial({ map: glulam, color: 0xf2dcb4, roughness: 0.6 });
        const beamZ = [];
        for (let z = -39; z <= 39.01; z += 6) beamZ.push(z);
        const beams = new THREE.InstancedMesh(beamGeo, woodMat, beamZ.length);
        beamZ.forEach((z, k) => { tmpM.makeTranslation(0, 0, z); beams.setMatrixAt(k, tmpM); });
        beams.instanceMatrix.needsUpdate = true;
        ceilGroup.add(beams);

        // ---------- 3. copertura in pannelli blu ardesia appoggiata sulle travi
        const NX = lowQ ? 20 : 40;
        const rPos = [], rUv = [], rIdx = [];
        for (let j = 0; j <= 1; j++) {
            const z = -ZL + 2 * ZL * j;
            for (let i = 0; i <= NX; i++) {
                const x = XW + (XE - XW) * i / NX;
                rPos.push(x, yt(x) + 0.02, z);
                rUv.push(z / 8, x / 10);
            }
        }
        for (let i = 0; i < NX; i++) rIdx.push(i, i + NX + 1, i + 1, i + 1, i + NX + 1, i + NX + 2);
        const roofGeo = new THREE.BufferGeometry();
        roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(rPos, 3));
        roofGeo.setAttribute('uv', new THREE.Float32BufferAttribute(rUv, 2));
        roofGeo.setIndex(rIdx);
        roofGeo.computeVertexNormals();
        ceilGroup.add(new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ map: tex('roof_panels.jpg', [1, 1]), roughness: 0.85, side: THREE.DoubleSide })));
        // arcarecci in acciaio sotto i pannelli
        const purl = [];
        [-22, -14, -6, 2, 10, 18].forEach(x => purl.push([V(x, yt(x) - 0.08, -ZL), V(x, yt(x) - 0.08, ZL), 0.06]));
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(purl), steelMat));

        // ---------- 4. pareti lunghe
        const LEN = 2 * ZL;
        const block = h => new THREE.MeshStandardMaterial({ map: tex('blockwall.jpg', [LEN / 3.2, h / 3.2]), roughness: 0.9 });
        const beige = (w, h) => new THREE.MeshStandardMaterial({ map: tex('end_panels.jpg', [w / 6, h / 6]), roughness: 0.85, side: THREE.DoubleSide });
        const adsMat = lit(tex('ads_strip.jpg', [LEN / 32, 1]), 0.12);
        // ovest (tribuna): blocchi, fascia, galleria vetrata con montanti gialli, fascia beige
        flat(LEN, 3.0, block(3.0), XW, 1.5, 0, Math.PI / 2);
        flat(LEN, 0.8, adsMat, XW + 0.03, 3.4, 0, Math.PI / 2);
        flat(LEN, 5.0, lit(tex('gallery_glass.jpg', [LEN / 8, 2.5]), 0.35), XW, 6.3, 0, Math.PI / 2);
        flat(LEN, 1.4, beige(LEN, 1.4), XW, 9.5, 0, Math.PI / 2);
        // finestre verso l'esterno: di giorno ci entra il sole (index.html)
        const winLit = (t, k) => { const m = lit(t, k); m.userData.sunWindow = true; return m; };
        flat(LEN, 2.2, winLit(tex('windows_day.jpg', [LEN / 8, 1.1]), 0.25), XW, 11.3, 0, Math.PI / 2);   // finestre alte
        flat(LEN, yt(XW) - 12.4 + 0.1, beige(LEN, yt(XW) - 12.4), XW, (12.4 + yt(XW) + 0.1) / 2, 0, Math.PI / 2);
        // est (panchine): blocchi con porte gialle, fascia, finestroni
        flat(LEN, 3.2, block(3.2), XE, 1.6, 0, -Math.PI / 2);
        flat(LEN, 0.8, adsMat, XE - 0.03, 3.6, 0, -Math.PI / 2);
        flat(LEN, 7.0, winLit(tex('windows_day.jpg', [LEN / 8, 3.5]), 0.25), XE, 7.5, 0, -Math.PI / 2);   // finestroni alti
        flat(LEN, yt(XE) - 11.0 + 0.1, beige(LEN, yt(XE) - 11.0), XE, (11.0 + yt(XE) + 0.1) / 2, 0, -Math.PI / 2);
        const doorMat = new THREE.MeshStandardMaterial({ color: 0xe9c21f, roughness: 0.5 });
        [-30, -10, 10, 30].forEach(z => {
            const d = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 1.9), doorMat);
            d.position.set(XE - 0.04, 1.1, z);
            targetGroup.add(d);
        });

        // ---------- 5. testate in pannelli beige (sagoma della copertura) con controventi
        const endShape = new THREE.Shape();
        endShape.moveTo(XW, 0);
        endShape.lineTo(XE, 0);
        for (let i = NB; i >= 0; i--) { const x = XW + (XE - XW) * i / NB; endShape.lineTo(x, yt(x) + 0.05); }
        const endGeo = new THREE.ShapeGeometry(endShape, 16);
        const endMat = new THREE.MeshStandardMaterial({ map: tex('end_panels.jpg', [1 / 6, 1 / 6]), roughness: 0.85, side: THREE.DoubleSide });
        const brace = [];
        [-1, 1].forEach(dir => {
            const e = new THREE.Mesh(endGeo, endMat);
            e.position.z = dir * ZL;
            targetGroup.add(e);
            const ads = flat(XE - XW, 0.8, adsMat, XC, 3.2, dir * (ZL - 0.03), dir > 0 ? Math.PI : 0);
            void ads;
            const zb = dir * (ZL - 0.12);
            [[XW + 0.6, XW + 5.4], [XE - 5.4, XE - 0.6]].forEach(([a, b]) => {
                brace.push([V(a, 4.4, zb), V(b, yb(b) - 0.2, zb), 0.07], [V(b, 4.4, zb), V(a, yb(a) - 0.2, zb), 0.07]);
                brace.push([V(a, 4.4, zb), V(b, 4.4, zb), 0.06]);
            });
        });
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(brace), steelMat));

        // ---------- 6. canestri (tabelloni bianchi con il ferro arancione)
        const boardMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.4 });
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xe0561b, roughness: 0.4, metalness: 0.4 });
        const hoop = (x, y, z, ry) => {
            const g = new THREE.Group();
            const bb = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.05, 0.05), boardMat);
            const sq = new THREE.Mesh(new THREE.PlaneGeometry(0.59, 0.45), new THREE.MeshBasicMaterial({ color: 0x222222 }));
            sq.position.set(0, -0.15, 0.027);
            const sqIn = new THREE.Mesh(new THREE.PlaneGeometry(0.53, 0.39), boardMat);
            sqIn.position.set(0, -0.15, 0.029);
            const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.015, 6, 20), rimMat);
            rim.rotation.x = Math.PI / 2;
            rim.position.set(0, -0.4, 0.28);
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.1), steelMat);
            arm.position.set(0, 0.2, -0.55);
            g.add(bb, sq, sqIn, rim, arm);
            g.position.set(x, y, z);
            g.rotation.y = ry;
            targetGroup.add(g);
        };
        hoop(XC, 4.3, -ZL + 1.1, 0);
        hoop(XC, 4.3, ZL - 1.1, Math.PI);
        [-14, 14].forEach(z => { hoop(XE - 1.1, 5.2, z, -Math.PI / 2); hoop(XW + 1.1, 9.6, z, Math.PI / 2); });

        // ---------- 7. testata -z: bandiere, striscioni del club (il tabellone lo posiziona index.html)
        const zF = -ZL + 0.08;
        flat(2.6, 1.7, lit(tex('flag_france.jpg'), 0.12), -15, 8.2, zF, 0);
        flat(2.6, 1.7, lit(tex('flag_czech.jpg'), 0.12), 17.5, 8.2, zF, 0);
        flat(2.6, 5.2, lit(tex('banner_club.jpg'), 0.15), XC, 7.4, zF, 0);
        flat(1.7, 3.4, lit(tex('banner_white.jpg'), 0.15), XC - 4.2, 7.6, zF, 0);
        flat(1.7, 3.4, lit(tex('banner_white.jpg'), 0.15), XE - 11.5, 7.6, zF, 0);
        // stendardi verticali sui finestroni (lato panchine)
        [-22, 22].forEach(z => flat(1.4, 3.6, lit(tex('banner_club.jpg'), 0.15), XE - 0.06, 6.6, z, -Math.PI / 2));

        // ---------- 8. fari tondi appesi tra le travi
        const lampX = [-17, -7, 3, 13];
        const lampZ = [];
        for (let z = -36; z <= 36.01; z += 6) lampZ.push(z);
        const lampCount = lampX.length * lampZ.length;
        const lampBody = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.32, 0.4, 0.3, 14), darkMat, lampCount);
        const lampFace = new THREE.InstancedMesh(new THREE.CircleGeometry(0.34, 16).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffbea, side: THREE.DoubleSide }), lampCount);
        const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
        let li = 0;
        lampX.forEach(x => lampZ.forEach((z, k) => {
            const y = yb(x) - 0.7;
            tmpM.makeTranslation(x, y, z); lampBody.setMatrixAt(li, tmpM);
            tmpM.makeTranslation(x, y - 0.16, z); lampFace.setMatrixAt(li, tmpM);
            if (!lowQ && k % 2 === 0) {
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff4d6, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(2.6, 2.6, 1);
                spr.position.set(x, y - 0.35, z);
                ceilGroup.add(spr);
            }
            li++;
        }));
        lampBody.instanceMatrix.needsUpdate = true;
        lampFace.instanceMatrix.needsUpdate = true;
        ceilGroup.add(lampBody, lampFace);
        const cables = [];
        lampX.forEach(x => lampZ.forEach(z => cables.push([V(x, yb(x) - 0.55, z), V(x, yb(x), z), 0.01])));
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(cables), darkMat));

        // ---------- 9. tribuna: gradoni in cemento, panche di legno, corrimano arancione
        const ZS0 = -26, ZS1 = 22, SL = ZS1 - ZS0, TIERS = 4, STEP_D = 1.05, STEP_H = 0.42, X0 = -21.4;
        const concrete = new THREE.MeshStandardMaterial({ color: 0xa3a39f, roughness: 0.9 });
        const plankMat = new THREE.MeshStandardMaterial({ map: glulam, color: 0xc89a62, roughness: 0.7 });
        for (let k = 0; k < TIERS; k++) {
            const h = (k + 1) * STEP_H;
            const xa = X0 - k * STEP_D;
            const step = new THREE.Mesh(new THREE.BoxGeometry(STEP_D, h, SL), concrete);
            step.position.set(xa - STEP_D / 2, h / 2, (ZS0 + ZS1) / 2);
            targetGroup.add(step);
            [0.22, 0.42].forEach(off => {
                const pl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, SL), plankMat);
                pl.position.set(xa - STEP_D + off + 0.25, h + 0.42, (ZS0 + ZS1) / 2);
                targetGroup.add(pl);
            });
            const legs = [];
            for (let z = ZS0 + 1; z < ZS1; z += 2.4) legs.push([V(xa - STEP_D + 0.57, h, z), V(xa - STEP_D + 0.57, h + 0.4, z), 0.03]);
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry(legs), steelMat));
        }
        // riempimento dietro i gradoni fino alla parete
        const back = new THREE.Mesh(new THREE.BoxGeometry(X0 - TIERS * STEP_D - XW, TIERS * STEP_H, SL), concrete);
        back.position.set((XW + X0 - TIERS * STEP_D) / 2, TIERS * STEP_H / 2, (ZS0 + ZS1) / 2);
        targetGroup.add(back);
        const railMat = new THREE.MeshStandardMaterial({ color: 0xd9702a, roughness: 0.6 });
        const rail = [[V(X0 + 0.1, 1.0, ZS0), V(X0 + 0.1, 1.0, ZS1), 0.045]];
        const railPosts = [];
        for (let z = ZS0; z <= ZS1 + 0.01; z += 3) railPosts.push([V(X0 + 0.1, 0, z), V(X0 + 0.1, 1.0, z), 0.03]);
        // corrimano della scala in fondo alla tribuna, verso il bar
        rail.push([V(X0 + 0.1, 1.0, ZS1), V(X0 - TIERS * STEP_D, 1.0 + TIERS * STEP_H, ZS1), 0.045]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rail), railMat), new THREE.Mesh(mergeBeamGeometry(railPosts), steelMat));

        // ---------- 10. bar dei Fous du Bitume in fondo alla tribuna
        const BZ0 = 24.5, BZ1 = 36.5, BX = XW + 3.4, BH = 3.1;
        const kiosk = new THREE.Mesh(new THREE.BoxGeometry(BX - XW, BH, BZ1 - BZ0), new THREE.MeshStandardMaterial({ color: 0x1a2646, roughness: 0.7 }));
        kiosk.position.set((XW + BX) / 2, BH / 2, (BZ0 + BZ1) / 2);
        targetGroup.add(kiosk);
        flat(BZ1 - BZ0, BH, lit(tex('bar_wall.jpg'), 0.35), BX + 0.02, BH / 2, (BZ0 + BZ1) / 2, Math.PI / 2);
        const counter = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 7), new THREE.MeshStandardMaterial({ color: 0x223259, roughness: 0.6 }));
        counter.position.set(BX + 1.4, 0.55, (BZ0 + BZ1) / 2);
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.06, 7.2), new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: 0.4 }));
        top.position.set(BX + 1.4, 1.13, (BZ0 + BZ1) / 2);
        targetGroup.add(counter, top);

        // ---------- 11. pubblico sui gradoni e al bar
        const outfits = [0x38b6e8, 0x182a50, 0x0b0b0f, 0xf8fafc, 0x374151, 0x38b6e8, 0x7c2d12, 0x1d4ed8];
        const jm = outfits.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 }));
        const pantsM = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const handM = new THREE.MeshStandardMaterial({ color: 0xc99178, roughness: 0.6 });
        const hairM = new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.8 });
        const fan = (x, y, z, faceAngle) => {
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
            root.rotation.y = faceAngle + (Math.random() - 0.5) * 0.3;
            const childLift = maybeMakeCrowdChild(root, headGroup, false);
            targetGroup.add(root);
            crowdMembers.push({ mesh: root, bodyPivot, headGroup, leftArmPivot, rightArmPivot, baseY: y + childLift, phase: Math.random() * Math.PI * 2, standing: true });
        };
        const keep = preset.crowdKeepRatio;
        for (let k = 0; k < TIERS; k++) {
            const h = (k + 1) * STEP_H, x = X0 - k * STEP_D - STEP_D * 0.45;
            for (let z = ZS0 + 0.6; z <= ZS1 - 0.6; z += 0.75) if (Math.random() < keep * 0.55) fan(x + (Math.random() - 0.5) * 0.2, h, z + (Math.random() - 0.5) * 0.2, Math.atan2(z, 30) * 0.3);
        }
        for (let i = 0; i < 5; i++) if (Math.random() < keep) fan(BX + 2.3 + Math.random() * 0.8, 0, BZ0 + 1.5 + i * 2.1, -Math.PI);
    }

    registerArenaBuilder('villeneuve', buildVilleneuveArchitecture);
})();
