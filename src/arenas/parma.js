// Palazzetto "parma": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // PALAGUFI — PALAPATTINAGGIO GIUSEPPE AVANZINI, SORAGNA (casa dei Gufi Parma). Volta a botte:
    // archi a sesto ribassato in legno lamellare ogni 5 m, arcarecci in legno tra un arco e l'altro,
    // tiranti incrociati, telo color crema; testate chiuse da teli verde scuro, zoccolo laterale verde con
    // le porte illuminate e gli striscioni. Manica di ventilazione grigia lungo la volta, fari LED piatti
    // sugli arcarecci, casse acustiche nere sugli archi. Balaustre trasparenti con il corrimano bianco e lo
    // zoccolo arancione, porte da calcetto dietro le testate, pubblico in piedi a ovest.
    // Texture in assets/textures/parma/ (tools/generate_parma_textures.py).
    // =====================================================================
    function buildParmaArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/parma/';
        const CX = -1, A = 25, B = 17, ZE = 44;                // asse, semiapertura e altezza della volta, testate
        const D = 0.9, WA = 0.32;                               // altezza e spessore della sezione degli archi
        const WALL = 3.2;                                       // zoccolo verde sui fianchi
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        const ell = (th, inset) => V(CX + (A - inset) * Math.cos(th), (B - inset) * Math.sin(th), 0);
        const std = (c, r, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r }, o || {}));
        const tmpM = new THREE.Matrix4();
        const th0 = Math.asin(WALL / B);                        // angolo dove il telo incontra lo zoccolo
        const archZ = [];
        for (let z = -42.5; z <= 42.51; z += 5) archZ.push(z);

        // ---------- 1. archi in legno lamellare (intradosso + fianchi, l'estradosso è coperto dal telo)
        const NA = lowQ ? 28 : 48;
        const pos = [], uv = [], idx = [];
        const quad = (a, b, c, d, u0, u1, v0, v1) => {
            const n = pos.length / 3;
            [a, b, c, d].forEach(p => pos.push(p.x, p.y, p.z));
            uv.push(u0, v0, u1, v0, u0, v1, u1, v1);
            idx.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
        };
        archZ.forEach(z => {
            let u = 0;
            for (let i = 0; i < NA; i++) {
                const ta = Math.PI * i / NA, tb = Math.PI * (i + 1) / NA;
                const oa = ell(ta, 0), ob = ell(tb, 0), ia = ell(ta, D), ib = ell(tb, D);
                const du = ia.distanceTo(ib) / 2;
                const zs = [z - WA / 2, z + WA / 2];
                quad(V(ia.x, ia.y, zs[0]), V(ib.x, ib.y, zs[0]), V(ia.x, ia.y, zs[1]), V(ib.x, ib.y, zs[1]), u, u + du, 0, 0.25);   // intradosso
                quad(V(oa.x, oa.y, zs[0]), V(ob.x, ob.y, zs[0]), V(ia.x, ia.y, zs[0]), V(ib.x, ib.y, zs[0]), u, u + du, 0, 1);      // fianco
                quad(V(ia.x, ia.y, zs[1]), V(ib.x, ib.y, zs[1]), V(oa.x, oa.y, zs[1]), V(ob.x, ob.y, zs[1]), u, u + du, 0, 1);      // fianco
                u += du;
            }
        });
        const archGeo = new THREE.BufferGeometry();
        archGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        archGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        archGeo.setIndex(idx);
        archGeo.computeVertexNormals();
        const woodMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'glulam.jpg', { wrap: true }), color: 0xd9a070, roughness: 0.65, side: THREE.DoubleSide });
        targetGroup.add(new THREE.Mesh(archGeo, woodMat));

        // ---------- 2. telo color crema (dal bordo dello zoccolo fino al colmo), appena fuori dagli archi
        const memTex = loadFileTexture(T + 'membrane.jpg', { wrap: true });
        const memMat = new THREE.MeshStandardMaterial({ map: memTex, color: 0xf4dcb6, emissive: 0xf0c892, emissiveMap: memTex, emissiveIntensity: 0.36, roughness: 0.9, side: THREE.DoubleSide });
        const NM = lowQ ? 32 : 56;
        const mp = [], mu = [], mi = [];
        for (let j = 0; j <= 1; j++) for (let i = 0; i <= NM; i++) {
            const th = th0 + (Math.PI - 2 * th0) * i / NM;
            const p = ell(th, -0.05);
            mp.push(p.x, p.y, j ? ZE : -ZE);
            mu.push(i / NM * 14, j ? 2 * ZE / 5 : 0);              // un telo per campata (5 m)
        }
        for (let i = 0; i < NM; i++) mi.push(i, i + NM + 1, i + 1, i + 1, i + NM + 1, i + NM + 2);
        const memGeo = new THREE.BufferGeometry();
        memGeo.setAttribute('position', new THREE.Float32BufferAttribute(mp, 3));
        memGeo.setAttribute('uv', new THREE.Float32BufferAttribute(mu, 2));
        memGeo.setIndex(mi);
        memGeo.computeVertexNormals();
        targetGroup.add(new THREE.Mesh(memGeo, memMat));

        // ---------- 3. arcarecci tra gli archi e tiranti incrociati
        const NP = 10;
        const purlTh = [];
        for (let k = 0; k <= NP; k++) purlTh.push(th0 + 0.05 + (Math.PI - 2 * th0 - 0.1) * k / NP);
        const purl = [];
        purlTh.forEach(th => { const p = ell(th, 0.3); purl.push([V(p.x, p.y, -ZE), V(p.x, p.y, ZE), 0.2]); });
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(purl), woodMat));
        const cables = [];
        for (let i = 0; i < archZ.length - 1; i += 1) {
            for (let k = (i % 2); k < NP - 1; k += 3) {
                const a = ell(purlTh[k], 0.25), b = ell(purlTh[k + 2], 0.25);
                cables.push([V(a.x, a.y, archZ[i]), V(b.x, b.y, archZ[i + 1]), 0.02], [V(b.x, b.y, archZ[i]), V(a.x, a.y, archZ[i + 1]), 0.02]);
            }
        }
        const darkSteel = std(0x3c3c3e, 0.5, { metalness: 0.5 });
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(cables), darkSteel));

        // ---------- 4. fari LED piatti sugli arcarecci + casse acustiche sugli archi
        const leds = [];
        for (let i = 0; i < archZ.length - 1; i++) {
            const z = (archZ[i] + archZ[i + 1]) / 2;
            [2, 4, 6, 8].forEach(k => { const p = ell(purlTh[k], 0.48); leds.push(V(p.x, p.y, z + (k % 4 ? 1.2 : -1.2))); });
        }
        const ledBox = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.12, 0.4), std(0x2a2c30, 0.5), leds.length);
        const ledFace = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.45, 0.3).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xeef6ff, side: THREE.DoubleSide }), leds.length);
        leds.forEach((p, i) => {
            tmpM.makeTranslation(p.x, p.y, p.z); ledBox.setMatrixAt(i, tmpM);
            tmpM.makeTranslation(p.x, p.y - 0.07, p.z); ledFace.setMatrixAt(i, tmpM);
        });
        targetGroup.add(ledBox, ledFace);
        if (!lowQ) {
            const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
            leds.forEach((p, i) => {
                if (i % 2) return;
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xdfeeff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(1.6, 1.6, 1);
                spr.position.set(p.x, p.y - 0.2, p.z);
                targetGroup.add(spr);
            });
        }
        const spk = std(0x141416, 0.6);
        archZ.forEach((z, i) => {
            if (i % 3 !== 1) return;
            [0.32, Math.PI - 0.32].forEach(th => {
                const p = ell(th, D + 0.25);
                const s = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 0.45), spk);
                s.position.set(p.x, p.y, z + 0.4);
                s.rotation.y = th < 1 ? 0.5 : -0.5;
                targetGroup.add(s);
            });
        });

        // ---------- 5. manica di ventilazione grigia lungo la volta
        const ductX = CX + 2.5, ductY = ell(Math.acos(2.5 / A), 0).y - 1.0;
        const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 82, 16, 1), std(0xb6b9ba, 0.95));
        duct.rotation.x = Math.PI / 2;
        duct.position.set(ductX, ductY, 0);
        targetGroup.add(duct);
        const hang = [];
        for (let z = -40; z <= 40; z += 5) hang.push([V(ductX, ductY + 0.45, z), V(ductX, ductY + 1.5, z), 0.012]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(hang), darkSteel));

        // ---------- 6. teli verdi: zoccolo laterale e testate
        const greenTex = loadFileTexture(T + 'green.jpg', { wrap: true });
        const greenMat = new THREE.MeshStandardMaterial({ map: greenTex, color: 0xb8ccbe, roughness: 0.9, side: THREE.DoubleSide });
        const xWall = A * Math.cos(th0) - 0.06;
        [CX - xWall, CX + xWall].forEach(x => {
            const g = new THREE.PlaneGeometry(2 * ZE, WALL);
            const u = g.attributes.uv;
            for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * 2 * ZE / 4, u.getY(i) * WALL / 4);
            const m = new THREE.Mesh(g, greenMat);
            m.position.set(x, WALL / 2, 0);
            m.rotation.y = Math.PI / 2;
            targetGroup.add(m);
        });
        [-ZE, ZE].forEach(z => {
            const shape = new THREE.Shape();
            shape.moveTo(CX + A, 0);
            for (let i = 1; i <= 40; i++) { const p = ell(Math.PI * i / 40, 0); shape.lineTo(p.x, p.y); }
            shape.lineTo(CX + A, 0);
            const g = new THREE.ShapeGeometry(shape, 24);
            const u = g.attributes.uv, pa = g.attributes.position;
            for (let i = 0; i < u.count; i++) u.setXY(i, pa.getX(i) / 4, pa.getY(i) / 4);
            const m = new THREE.Mesh(g, greenMat);
            m.position.z = z;
            targetGroup.add(m);
        });
        // porte con i vetri illuminati: in mezzo alle testate e lungo i fianchi
        const doorFrame = std(0xd8dadc, 0.5, { metalness: 0.3 });
        const doorGlass = new THREE.MeshBasicMaterial({ color: 0xf2e2a0 });
        const door = (x, z, rotY) => {
            const g = new THREE.Group();
            const f = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.5, 0.12), doorFrame); f.position.y = 1.25;
            const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), doorGlass); gl.position.set(0, 1.2, 0.07);
            g.add(f, gl);
            g.position.set(x, 0, z); g.rotation.y = rotY;
            targetGroup.add(g);
        };
        door(0, -ZE + 0.08, 0);
        door(0, ZE - 0.08, Math.PI);
        [-33, 33].forEach(z => { door(CX - xWall + 0.08, z, Math.PI / 2); door(CX + xWall - 0.08, z, -Math.PI / 2); });

        // ---------- 7. pavimento attorno alla pista (stesso cemento)
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(2 * A, 2 * ZE), std(0x6f7c7b, 0.85));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(CX, -0.01, 0);
        targetGroup.add(apron);

        // ---------- 8. telaio delle balaustre trasparenti: corrimano e montanti bianchi, zoccolo arancione
        const white = std(0xeeeeec, 0.4, { metalness: 0.3 });
        const R = cornerRadius + 0.13, hx = rinkWidth / 2 - cornerRadius, hz = rinkLength / 2 - cornerRadius;
        const perim = [];
        const addArc = (cx, cz, a0) => { for (let i = 0; i <= 10; i++) { const a = a0 + (Math.PI / 2) * i / 10; perim.push(V(cx + Math.cos(a) * R, 0, cz + Math.sin(a) * R)); } };
        addArc(hx, hz, 0); addArc(-hx, hz, Math.PI / 2); addArc(-hx, -hz, Math.PI); addArc(hx, -hz, Math.PI * 1.5);
        perim.push(perim[0].clone());
        const railCurve = y => new THREE.CatmullRomCurve3(perim.map(p0 => V(p0.x, y, p0.z)), false, 'catmullrom', 0.05);
        targetGroup.add(new THREE.Mesh(new THREE.TubeGeometry(railCurve(1.17), 240, 0.045, 8, false), white));
        targetGroup.add(new THREE.Mesh(new THREE.TubeGeometry(railCurve(0.62), 240, 0.025, 6, false), white));
        targetGroup.add(new THREE.Mesh(new THREE.TubeGeometry(railCurve(0.1), 240, 0.1, 4, false), std(0xb85a2c, 0.7)));
        const kick = railCurve(0.1);
        const nPosts = Math.round(kick.getLength() / 2.1);
        const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 1.12, 8), white, nPosts);
        for (let i = 0; i < nPosts; i++) { const q = kick.getPointAt(i / nPosts); tmpM.makeTranslation(q.x, 0.6, q.z); posts.setMatrixAt(i, tmpM); }
        posts.instanceMatrix.needsUpdate = true;
        targetGroup.add(posts);
        targetGroup.traverse(o => { if (o.isMesh && o.material === getPolyBoardMat()) { o.castShadow = false; o.receiveShadow = false; } });
        // ringhiera bianca davanti al pubblico (-x)
        const rail = [[V(-21.4, 1.05, -30), V(-21.4, 1.05, 30), 0.05], [V(-21.4, 0.55, -30), V(-21.4, 0.55, 30), 0.03]];
        for (let z = -30; z <= 30.01; z += 2.5) rail.push([V(-21.4, 0, z), V(-21.4, 1.05, z), 0.04]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rail), white));

        // ---------- 9. porte da calcetto bianche dietro le testate
        [-1, 1].forEach(s => {
            const z = s * 37.4, gp = [];
            gp.push([V(-1.5, 0, z), V(-1.5, 2, z), 0.08], [V(1.5, 0, z), V(1.5, 2, z), 0.08], [V(-1.5, 2, z), V(1.5, 2, z), 0.08]);
            gp.push([V(-1.5, 2, z), V(-1.5, 0, z + s * 0.9), 0.04], [V(1.5, 2, z), V(1.5, 0, z + s * 0.9), 0.04]);
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry(gp), white));
        });

        // ---------- 10. striscioni (nomi leggibili nelle foto)
        const bMats = {};
        const bMat = f => bMats[f] || (bMats[f] = (() => { const t = loadFileTexture(T + f); return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.12, roughness: 0.85, side: THREE.DoubleSide }); })());
        const banner = (f, w, h, x, y, z, rotY) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bMat(f)); m.position.set(x, y, z); m.rotation.y = rotY; targetGroup.add(m); };
        const xe = CX + xWall - 0.1, xw = CX - xWall + 0.1;
        banner('banner_carwrap.jpg', 3.6, 1.35, xe, 2.2, -14, -Math.PI / 2);      // zoccolo dietro le panchine
        banner('banner_arteplast.jpg', 4.0, 1.4, xe, 2.2, 0, -Math.PI / 2);
        banner('banner_cerchio.jpg', 3.4, 1.3, xe, 2.2, 14, -Math.PI / 2);
        banner('banner_conad.jpg', 2.6, 1.0, xe, 2.3, 24, -Math.PI / 2);
        banner('banner_cerchio.jpg', 3.4, 1.3, xw, 2.2, -16, Math.PI / 2);
        banner('banner_conad.jpg', 2.6, 1.0, xw, 2.3, 16, Math.PI / 2);
        // appesi agli arcarecci, sul telo
        const gp = ell(Math.acos(18.5 / A), 0.6);
        banner('banner_gufi.jpg', 2.4, 2.6, CX + 18.5, gp.y - 1.6, 0, -Math.PI / 2);
        banner('banner_avanzini.jpg', 4.2, 1.65, CX - 18.5, gp.y - 1.3, 10, Math.PI / 2);

        // ---------- 11. pubblico in piedi dietro la ringhiera (-x), rivolto verso la pista
        const outfits = [0x1e2c8c, 0xf2de1c, 0xf8fafc, 0x6b7280, 0x111114, 0x7c2d12, 0x374151, 0xc81e1e];
        const jm = outfits.map(c => std(c, 0.65));
        const pantsM = std(0x1e293b, 0.8), handM = std(0xc99178, 0.6), hairM = std(0x2a1d14, 0.8);
        const fan = (x, y, z) => {
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
            root.rotation.y = Math.atan2(z, 40) * 0.3 + (Math.random() - 0.5) * 0.3;
            const childLift = maybeMakeCrowdChild(root, headGroup, false);
            targetGroup.add(root);
            crowdMembers.push({ mesh: root, bodyPivot, headGroup, leftArmPivot, rightArmPivot, baseY: y + childLift, phase: Math.random() * Math.PI * 2, standing: true });
        };
        const keep = preset.crowdKeepRatio * crowdAttendanceScale();   // pubblico in base all'importanza della partita (index.html)
        [-22.0, -22.9, -23.8].forEach((x, row) => {
            for (let z = -28; z <= 28; z += 0.7) if (Math.random() < keep * (0.55 - row * 0.15)) fan(x + (Math.random() - 0.5) * 0.25, 0, z + (Math.random() - 0.5) * 0.2);
        });
    }

    registerArenaBuilder('parma', buildParmaArchitecture);
})();
