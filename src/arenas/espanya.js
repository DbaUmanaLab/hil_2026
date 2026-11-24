// Palazzetto "espanya": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // POLIESPORTIU JOAN SEGUÍ — PALMA DI MAIORCA, casa dell'Espanya Hockey Club. Capannone a due falde con le
    // capriate reticolari blu scuro e la lamiera chiara, file di luci LED tonde. Parete lunga est in blocchi di
    // pietra beige (marès) con porte, striscioni dello sport municipale e tabellone; sopra, fino alla gronda, la
    // fascia di rete frangivento verde fra i pilastri blu, con qualche vetrata. Testate in intonaco color crema
    // con le finestrelle in alto, la vetrata alta con le tende grigie e le imbottiture blu in basso. Parquet
    // scuro multisport attorno al campo azzurro dell'hockey; recinzione bassa con lo zoccolo in legno e la rete
    // metallica a maglie quadre. Sul lato ovest una piccola tribuna di due file lungo tutto il campo.
    // Altezze: colmo a 16,5 m e gronda a 10 m: le capriate restano sopra le telecamere di gioco (broadcast 11,6 m,
    // dall'alto 13,2 m); solo la vista dall'alto col telefono in verticale (15 m) le supera e il soffitto si nasconde.
    // Texture in assets/textures/espanya/ (tools/generate_espanya_textures.py).
    // =====================================================================
    function buildEspanyaArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/espanya/';
        const XW = -24, XE = 24, ZL = 40;                  // pareti: ovest (tribuna), est (pietra), testate
        const LX = XE - XW, LEN = 2 * ZL, HW = LX / 2;
        const EAVE = 10, RIDGE = 16.5, STONE_H = 4.6;
        const roofY = x => EAVE + (RIDGE - EAVE) * (1 - Math.abs(x) / HW);   // falda (colmo lungo z, a x = 0)
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);

        const steelBlue = new THREE.MeshStandardMaterial({ color: 0x1c2f5a, roughness: 0.5, metalness: 0.35 });
        const greyMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.6, metalness: 0.4 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.6 });
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
        const winLit = (t, k) => { const m = lit(t, k); m.userData.sunWindow = true; return m; };
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: 14.5 };      // solo la vista dall'alto col telefono in verticale (15 m) sale fra le capriate

        // ---------- 1. parquet del palazzetto attorno al campo azzurro
        const parquet = new THREE.Mesh(new THREE.PlaneGeometry(LX, LEN), new THREE.MeshStandardMaterial({ map: tex('parquet.jpg', [LX / 8, LEN / 8]), roughness: 0.42, metalness: 0.05 }));
        parquet.rotation.x = -Math.PI / 2;
        parquet.position.y = -0.01;
        targetGroup.add(parquet);

        // ---------- 2. copertura a due falde: lamiera chiara, capriate reticolari blu scuro, arcarecci, luci tonde
        // lamiera chiara anche vista da sotto (le luci la illuminano poco): un filo di autoilluminazione
        const deckMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'roof_deck.jpg', { wrap: true }), roughness: 0.7, metalness: 0.2, emissive: 0x48463f, side: THREE.DoubleSide });
        // due falde come quadrilateri (dalla gronda al colmo), UV in metri: u lungo la sala, v lungo la falda
        const slopeLen = Math.hypot(HW, RIDGE - EAVE);
        [-1, 1].forEach(sgn => {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute([
                sgn * HW, EAVE + 0.05, -ZL, sgn * HW, EAVE + 0.05, ZL, 0, RIDGE + 0.05, ZL, 0, RIDGE + 0.05, -ZL], 3));
            g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, LEN / 4, 0, LEN / 4, slopeLen / 4, 0, slopeLen / 4], 2));
            g.setIndex([0, 1, 2, 0, 2, 3]);
            g.computeVertexNormals();
            ceilGroup.add(new THREE.Mesh(g, deckMat));
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
                    beams.push([V(xa, roofY(xa) - 0.12, z), V(xb, roofY(xb) - 0.12, z), 0.2]);           // corrente superiore
                    beams.push([V(xa, bottomY(xa), z), V(xb, bottomY(xb), z), 0.16]);  // corrente inferiore
                    beams.push([V(xa, bottomY(xa), z), V(xb, roofY(xb) - 0.12, z), 0.08]);               // diagonali
                    beams.push([V(xb, bottomY(xb), z), V(xb, roofY(xb) - 0.12, z), 0.07]);               // montanti
                }
            }
        });
        // arcarecci lungo le falde e pilastri blu sulle pareti lunghe
        for (let k = 1; k < 8; k++) {
            const x = HW * k / 8;
            [-1, 1].forEach(s => beams.push([V(s * x, roofY(x) - 0.2, -ZL), V(s * x, roofY(x) - 0.2, ZL), 0.08]));
        }
        trussZ.forEach(z => [XW + 0.25, XE - 0.25].forEach(x => beams.push([V(x, 0, z), V(x, EAVE, z), 0.45])));
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(beams), steelBlue));
        // luci LED tonde sotto la lamiera, quattro per falda in ogni campata
        const lights = [];
        for (let k = 0; k < trussZ.length - 1; k++) {
            const z = (trussZ[k] + trussZ[k + 1]) / 2;
            [-17, -10, -4, 4, 10, 17].forEach(x => lights.push([x, roofY(x) - 0.35, z]));
        }
        const ledFace = new THREE.InstancedMesh(new THREE.CircleGeometry(0.32, 18).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffdf6, side: THREE.DoubleSide }), lights.length);
        const ledBody = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.36, 0.36, 0.14, 18), greyMat, lights.length);
        lights.forEach(([x, y, z], i) => {
            tmpM.makeTranslation(x, y - 0.08, z); ledFace.setMatrixAt(i, tmpM);
            tmpM.makeTranslation(x, y, z); ledBody.setMatrixAt(i, tmpM);
        });
        ledFace.instanceMatrix.needsUpdate = true;
        ledBody.instanceMatrix.needsUpdate = true;
        ceilGroup.add(ledFace, ledBody);
        if (!lowQ) {
            const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
            lights.forEach(([x, y, z], i) => {
                if (i % 2) return;
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfffaf0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(2.2, 2.2, 1);
                spr.position.set(x, y - 0.3, z);
                ceilGroup.add(spr);
            });
        }

        // ---------- 3. pareti lunghe: pietra beige in basso, fascia di rete verde fino alla gronda con qualche vetrata
        const stoneMat = (w) => new THREE.MeshStandardMaterial({ map: tex('stone_wall.jpg', [w / 4, STONE_H / 4]), roughness: 0.9, side: THREE.DoubleSide });
        const netBand = new THREE.MeshStandardMaterial({ map: tex('green_net.jpg', [LEN / 6, 1]), roughness: 0.9, side: THREE.DoubleSide });
        const winMat = winLit(tex('high_windows.jpg', [2, 1]), 0.6);
        [[XE, -Math.PI / 2, -1], [XW, Math.PI / 2, 1]].forEach(([x, ry, inward]) => {
            flat(LEN, STONE_H, stoneMat(LEN), x, STONE_H / 2, 0, ry);
            flat(LEN, EAVE - STONE_H, netBand, x, (EAVE + STONE_H) / 2, 0, ry);
            // vetrate chiare fra la rete, verso le testate
            [-31, 30].forEach(z => flat(5.6, EAVE - STONE_H - 0.4, winMat, x + inward * 0.03, (EAVE + STONE_H) / 2, z, ry));
            // copertina sul muro di pietra
            box(0.35, 0.18, LEN, steelBlue, x + inward * 0.18, STONE_H + 0.09, 0);
        });
        // parete est: porte, striscioni dello sport municipale e del club (il tabellone lo mette index.html)
        const xS = XE - 0.04;
        [-30, -18, 18, 30].forEach(z => flat(1.3, 2.3, darkMat, xS, 1.15, z, -Math.PI / 2));
        flat(1.1, 2.3, new THREE.MeshStandardMaterial({ color: 0xe0b9a8, roughness: 0.7 }), xS, 1.15, 0, -Math.PI / 2);
        const sportMat = lit(tex('banner_sport.jpg'), 0.12);
        [-9, 9].forEach(z => flat(2.2, 1.1, sportMat, xS - 0.01, 3.6, z, -Math.PI / 2));
        flat(4.4, 1.65, lit(tex('banner_club.jpg'), 0.14), xS - 0.01, 3.4, -23, -Math.PI / 2);

        // ---------- 4. testate: intonaco crema fino alle falde, finestrelle in alto, vetrata con le tende, imbottiture blu
        const gable = new THREE.Shape();
        gable.moveTo(XW, 0); gable.lineTo(XE, 0); gable.lineTo(XE, EAVE); gable.lineTo(0, RIDGE); gable.lineTo(XW, EAVE); gable.lineTo(XW, 0);
        const gableGeo = new THREE.ShapeGeometry(gable);
        const gp = gableGeo.attributes.position, gu = gableGeo.attributes.uv;
        for (let i = 0; i < gp.count; i++) gu.setXY(i, gp.getX(i) / 4, gp.getY(i) / 4);
        const creamMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'plaster_cream.jpg', { wrap: true }), roughness: 0.9, side: THREE.DoubleSide });
        const padMat = new THREE.MeshStandardMaterial({ color: 0x1f5bc4, roughness: 0.6, side: THREE.DoubleSide });
        const curtainMat = lit(tex('curtain.jpg', [2, 1]), 0.25);
        [[-ZL, 0, 12], [ZL, Math.PI, -12]].forEach(([z, ry, xw]) => {
            const g = new THREE.Mesh(gableGeo, creamMat);
            g.position.z = z;
            targetGroup.add(g);
            const dz = z < 0 ? 0.04 : -0.04;
            flat(6.0, 2.6, winMat, xw, 9.9, z + dz, ry);                          // due file di finestrelle
            flat(4.4, 6.6, curtainMat, xw, 1.5 + 3.3, z + dz, ry);               // vetrata alta con le tende grigie
            flat(28, 1.3, padMat, xw > 0 ? 4 : -4, 0.65, z + dz * 1.5, ry);      // imbottiture blu alla base
        });

        // ---------- 5. recinzione bassa attorno al campo: zoccolo in legno, rete a maglie quadre, corrimano
        const R = cornerRadius + 0.14, hx = rinkWidth / 2 - cornerRadius, hz = rinkLength / 2 - cornerRadius;
        const perim = [];
        const addArc = (cx, cz, a0) => { for (let i = 0; i <= 10; i++) { const a = a0 + (Math.PI / 2) * i / 10; perim.push(V(cx + Math.cos(a) * R, 0, cz + Math.sin(a) * R)); } };
        addArc(hx, hz, 0); addArc(-hx, hz, Math.PI / 2); addArc(-hx, -hz, Math.PI); addArc(hx, -hz, Math.PI * 1.5);
        perim.push(perim[0].clone());
        const curve = new THREE.CatmullRomCurve3(perim, false, 'catmullrom', 0.05);
        // davanti alle panchine e alle panche dei puniti la recinzione non c'è (ci sono le porte delle balaustre)
        const open = q => (q.x > rinkWidth / 2 - 0.5 && Math.abs(q.z) > 3.4 && Math.abs(q.z) < 15.6) ||
            (q.x < -rinkWidth / 2 + 0.5 && Math.abs(q.z) < 7.6);
        const BASE_H = 0.22, TOP_H = 1.14;
        const ribbon = (segs, y0, y1, uScale, vScale) => {
            const pos = [], uv = [], idx = [];
            segs.forEach(([a, b, u0, u1]) => {
                const k = pos.length / 3;
                pos.push(a.x, y0, a.z, b.x, y0, b.z, b.x, y1, b.z, a.x, y1, a.z);
                uv.push(u0 / uScale, 0, u1 / uScale, 0, u1 / uScale, (y1 - y0) / vScale, u0 / uScale, (y1 - y0) / vScale);
                idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
            });
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
            g.setIndex(idx);
            g.computeVertexNormals();
            return g;
        };
        const segs = [], rails = [];
        const nSeg = Math.round(curve.getLength() / 0.5);
        let prev = curve.getPointAt(0), dist = 0;
        for (let i = 1; i <= nSeg; i++) {
            const q = curve.getPointAt(i / nSeg), len = q.distanceTo(prev);
            if (!open(q) && !open(prev)) {
                segs.push([prev, q, dist, dist + len]);
                rails.push([V(prev.x, TOP_H, prev.z), V(q.x, TOP_H, q.z), 0.05]);
                if (i % 5 === 0) rails.push([V(q.x, 0, q.z), V(q.x, TOP_H, q.z), 0.05]);
            }
            dist += len; prev = q;
        }
        // recinzione davanti alla parete di pietra, dietro le panchine
        const fenceX = XE - 1.2;
        for (let z = -ZL + 2; z < ZL - 2.4; z += 2) {
            segs.push([V(fenceX, 0, z), V(fenceX, 0, z + 2), z, z + 2]);
            rails.push([V(fenceX, TOP_H, z), V(fenceX, TOP_H, z + 2), 0.05], [V(fenceX, 0, z), V(fenceX, TOP_H, z), 0.05]);
        }
        const baseTex = loadFileTexture(T + 'fence_base.jpg', { wrap: true });
        targetGroup.add(new THREE.Mesh(ribbon(segs, 0, BASE_H, 4, BASE_H), new THREE.MeshStandardMaterial({ map: baseTex, roughness: 0.6, side: THREE.DoubleSide })));
        const meshTex = loadFileTexture(T + 'mesh_fence.png', { wrap: true });
        targetGroup.add(new THREE.Mesh(ribbon(segs, BASE_H, TOP_H, 0.5, 0.5), new THREE.MeshStandardMaterial({ map: meshTex, transparent: true, alphaTest: 0.3, roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide })));
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rails), greyMat));

        // ---------- 6. piccola tribuna sul lato ovest: due file lungo tutto il campo
        const ZT = 34, TL = 2 * ZT, X1 = -21.2, D1 = 0.95, STEP = 0.45;
        const concrete = new THREE.MeshStandardMaterial({ color: 0xb9b2a4, roughness: 0.9 });
        const benchMat = new THREE.MeshStandardMaterial({ color: 0x2f5fb0, roughness: 0.45 });
        box(D1, 0.12, TL, concrete, X1 - D1 / 2, 0.06, 0);                         // prima fila: a livello del parquet
        box(D1, STEP, TL, concrete, X1 - D1 * 1.5, STEP / 2, 0);                   // seconda fila: un gradino più su
        box(XW - (X1 - 2 * D1), 0.9, TL, concrete, (XW + X1 - 2 * D1) / 2, 0.45, 0);   // passaggio alle spalle
        // panche di plastica blu: seduta e schienale
        [[X1 - 0.35, 0.45], [X1 - D1 - 0.35, STEP + 0.45]].forEach(([x, y]) => {
            box(0.42, 0.06, TL - 1, benchMat, x, y, 0);
            box(0.06, 0.36, TL - 1, benchMat, x - 0.23, y + 0.2, 0);
            for (let z = -ZT + 1; z <= ZT - 1; z += 2) box(0.06, y, 0.06, greyMat, x, y / 2, z);
        });
        // corrimano sul passaggio alto
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry([[V(X1 - 2 * D1, 1.9, -ZT), V(X1 - 2 * D1, 1.9, ZT), 0.05]]), greyMat));

        // ---------- 7. pubblico: seduto sulle due file, qualcuno in piedi lungo la parete di pietra
        const outfits = [0xd71f26, 0xf5c518, 0x2e62b8, 0xf8fafc, 0x141416, 0xd71f26, 0x4b5563, 0x16a34a, 0xec4899];
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
        const keep = preset.crowdKeepRatio;
        // sedute: la panca è a 0,45 m sopra il piano della fila; il tifoso guarda verso +x (la pista)
        [[X1 - 0.3, 0.04, 0.55], [X1 - D1 - 0.3, STEP + 0.04, 0.42]].forEach(([x, y, dens]) => {
            for (let z = -ZT + 0.8; z <= ZT - 0.8; z += 0.62) {
                if (Math.random() < keep * dens * (1 - Math.abs(z) / 60)) fan(x, y, z + (Math.random() - 0.5) * 0.15, 0, true);
            }
        });
        for (let z = -34; z <= 34; z += 0.9) {
            if (Math.abs(z) < 17.5) continue;
            if (Math.random() < keep * 0.25) fan(XE - 0.7, 0, z, Math.PI, false);
        }
    }

    registerArenaBuilder('espanya', buildEspanyaArchitecture);
})();
