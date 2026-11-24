// Palazzetto "castellon": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // PABELLÓN POLIDEPORTIVO MUNICIPAL GAETÀ HUGUET — CASTELLÓ DE LA PLANA, casa dell'Hockey Club Castellón.
    // Volta a botte in telo bianco, liscia, con le cuciture e i cavi che corrono lungo la sala e le piccole luci
    // tonde sui cavi. Pareti lunghe interamente vetrate su uno zoccolo in cemento, con i montanti grigi e i
    // frangisole color terracotta dietro i vetri (di giorno ci entra il sole). Testata nord bianca col mosaico
    // di quadrati rossi, arancio, gialli e verdi, la fascia della scritta e il tabellone; testata sud tutta
    // vetrata fino alla volta, col telaio grigio a griglia.
    // Pista azzurro-petrolio a piastrelle, balaustre bianche col piede rosso, niente vetro né reti.
    // Altezze: imposta della volta a 7,5 m e chiave a 14 m; a x = ±10 (dove arriva la telecamera broadcast a
    // 11,6 m) il telo è a 13,5 m. Solo la vista dall'alto col telefono in verticale (15 m) esce dalla volta.
    // Texture in assets/textures/castellon/ (tools/generate_castellon_textures.py).
    // =====================================================================
    function buildCastellonArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/castellon/';
        const A = 25, ZL = 40, LEN = 2 * ZL;                 // semiampiezza della volta (pareti a x = ±25), testate
        const WH = 7.5, B = 6.5, PLINTH = 0.8;              // imposta, freccia della volta, zoccolo sotto i vetri
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        const ellPoint = (th, inset) => {
            const nx = Math.cos(th) / A, ny = Math.sin(th) / B, nl = Math.hypot(nx, ny);
            return V(A * Math.cos(th) - (inset || 0) * nx / nl, WH + B * Math.sin(th) - (inset || 0) * ny / nl, 0);
        };

        const steelGrey = new THREE.MeshStandardMaterial({ color: 0x686c72, roughness: 0.55, metalness: 0.4 });
        const cableMat = new THREE.MeshStandardMaterial({ color: 0x3a3e42, roughness: 0.6, metalness: 0.3 });
        const tex = (f, rep) => loadFileTexture(T + f, rep ? { repeat: rep } : {});
        const flat = (w, h, mat, x, y, z, ry) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
            m.position.set(x, y, z);
            m.rotation.y = ry || 0;
            targetGroup.add(m);
            return m;
        };
        const lit = (t, k) => new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: k || 0.15, roughness: 0.8, side: THREE.DoubleSide });
        // vetrate verso l'esterno: di giorno ci entra il sole (index.html, setupGenericDaylight)
        const winLit = (t, k) => { const m = lit(t, k); m.userData.sunWindow = true; return m; };
        const ceilGroup = new THREE.Group();
        targetGroup.add(ceilGroup);
        arenaCeilingHide = { group: ceilGroup, y: 13.9 };

        // ---------- 1. pavimento attorno alla pista
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(2 * A, LEN), new THREE.MeshStandardMaterial({ color: 0x9a968c, roughness: 0.7 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.y = -0.01;
        targetGroup.add(apron);

        // ---------- 2. volta a botte in telo bianco (semi-ellisse estrusa lungo la sala), un filo autoilluminata
        const memTex = loadFileTexture(T + 'membrane.jpg', { wrap: true });
        const membraneMat = new THREE.MeshStandardMaterial({ map: memTex, emissive: 0xe8e6de, emissiveMap: memTex, emissiveIntensity: 0.22, roughness: 0.9, side: THREE.DoubleSide });
        const nTh = lowQ ? 36 : 64, nZ = lowQ ? 8 : 16;
        const arcLen = Math.PI * Math.sqrt((A * A + B * B) / 2);       // approssimazione del semiperimetro
        const vPos = [], vUv = [], vIdx = [];
        for (let j = 0; j <= nZ; j++) {
            const z = -ZL + LEN * j / nZ;
            for (let i = 0; i <= nTh; i++) {
                const p = ellPoint(Math.PI * i / nTh);
                vPos.push(p.x, p.y, z);
                vUv.push((z + ZL) / 6, (i / nTh) * arcLen / 4);
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
        // cavi lungo la sala e piccole luci tonde sui cavi
        const cables = [], lights = [];
        const NC = 9;
        for (let k = 1; k < NC; k++) {
            const p = ellPoint(Math.PI * k / NC, 0.06);
            cables.push([V(p.x, p.y, -ZL), V(p.x, p.y, ZL), 0.035]);
            if (k === 1 || k === NC - 1) continue;
            for (let z = -ZL + 5 + (k % 2) * 4; z <= ZL - 4.99; z += 8) {
                const q = ellPoint(Math.PI * k / NC, 0.22);
                lights.push([q.x, q.y, z]);
            }
        }
        ceilGroup.add(new THREE.Mesh(mergeBeamGeometry(cables), cableMat));
        const lampBody = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.2, 0.18, 14), cableMat, lights.length);
        const lampFace = new THREE.InstancedMesh(new THREE.CircleGeometry(0.17, 14).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffdf4, side: THREE.DoubleSide }), lights.length);
        lights.forEach(([x, y, z], i) => {
            tmpM.makeTranslation(x, y, z); lampBody.setMatrixAt(i, tmpM);
            tmpM.makeTranslation(x, y - 0.1, z); lampFace.setMatrixAt(i, tmpM);
        });
        lampBody.instanceMatrix.needsUpdate = true;
        lampFace.instanceMatrix.needsUpdate = true;
        ceilGroup.add(lampBody, lampFace);
        if (!lowQ) {
            const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
            lights.forEach(([x, y, z], i) => {
                if (i % 2) return;
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfffaf0, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(1.8, 1.8, 1);
                spr.position.set(x, y - 0.3, z);
                ceilGroup.add(spr);
            });
        }

        // ---------- 3. pareti lunghe vetrate: zoccolo in cemento, vetri con i frangisole terracotta, pilastri e trave d'imposta
        const plinthMat = new THREE.MeshStandardMaterial({ map: tex('plinth.jpg', [LEN / 4, 1]), roughness: 0.9, side: THREE.DoubleSide });
        const glazeMat = winLit(tex('glazing.jpg', [LEN / 6, 1]), 0.45);
        const GH = WH - PLINTH;
        const posts = [];
        [[A, -Math.PI / 2, -1], [-A, Math.PI / 2, 1]].forEach(([x, ry, inward]) => {
            flat(LEN, PLINTH, plinthMat, x, PLINTH / 2, 0, ry);
            flat(LEN, GH, glazeMat, x, PLINTH + GH / 2, 0, ry);
            posts.push([V(x + inward * 0.25, WH, -ZL), V(x + inward * 0.25, WH, ZL), 0.4]);              // trave d'imposta
            for (let z = -ZL; z <= ZL + 0.01; z += 6) posts.push([V(x + inward * 0.2, 0, z), V(x + inward * 0.2, WH, z), 0.32]);
        });
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(posts), steelGrey));

        // ---------- 4. testate: a nord muro bianco col mosaico di quadrati colorati, a sud grande vetrata a griglia
        const endGeoFrom = (y0, uvOf) => {
            const sh = new THREE.Shape();
            sh.moveTo(-A, y0); sh.lineTo(A, y0); sh.lineTo(A, WH);
            for (let i = 1; i < 48; i++) { const th = Math.PI * i / 48; sh.lineTo(A * Math.cos(th), WH + B * Math.sin(th)); }
            sh.lineTo(-A, WH); sh.lineTo(-A, y0);
            const g = new THREE.ShapeGeometry(sh);
            const gp = g.attributes.position, gu = g.attributes.uv;
            for (let i = 0; i < gp.count; i++) { const [u, v] = uvOf(gp.getX(i), gp.getY(i)); gu.setXY(i, u, v); }
            return g;
        };
        const mosaicTex = loadFileTexture(T + 'end_mosaic.jpg');
        const mosaicMat = new THREE.MeshStandardMaterial({ map: mosaicTex, roughness: 0.85, emissive: 0xffffff, emissiveMap: mosaicTex, emissiveIntensity: 0.08, side: THREE.DoubleSide });
        const north = new THREE.Mesh(endGeoFrom(0, (x, y) => [(x + A) / (2 * A), y / 15]), mosaicMat);
        north.position.z = -ZL;
        targetGroup.add(north);
        // sud: zoccolo in cemento e vetrata dal telaio grigio fino alla volta (UV in metri, lastre 1,33 x 2 m)
        const southGlass = new THREE.Mesh(endGeoFrom(PLINTH, (x, y) => [(x + A) / 4, (y - PLINTH) / 4]), winLit(loadFileTexture(T + 'end_glass.jpg', { wrap: true }), 0.5));
        southGlass.position.z = ZL;
        southGlass.rotation.y = Math.PI;
        targetGroup.add(southGlass);
        flat(2 * A, PLINTH, plinthMat, 0, PLINTH / 2, ZL - 0.02, Math.PI);
        const southFrame = [[V(-A, PLINTH, ZL - 0.08), V(A, PLINTH, ZL - 0.08), 0.18]];
        for (let x = -A + 5; x <= A - 4.99; x += 5) {
            const top = WH + B * Math.sqrt(Math.max(0, 1 - (x / A) * (x / A))) - 0.1;
            southFrame.push([V(x, PLINTH, ZL - 0.12), V(x, top, ZL - 0.12), 0.22]);            // montanti principali
        }
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(southFrame), steelGrey));

        // ---------- 5. pubblico in piedi lungo le vetrate, dietro le balaustre
        const outfits = [0xa8e61d, 0x141416, 0xf8fafc, 0x141416, 0xa8e61d, 0x2e62b8, 0x4b5563, 0xd71f26, 0xf5c518];
        const jm = outfits.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 }));
        const pantsM = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const handM = new THREE.MeshStandardMaterial({ color: 0xc99178, roughness: 0.6 });
        const hairM = new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.8 });
        const fan = (x, y, z, faceAngle) => {
            const root = new THREE.Group();
            const mt = jm[Math.floor(Math.random() * jm.length)];
            const legH = 0.82;
            [-0.11, 0.11].forEach(lz => { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, legH, 7), pantsM); lg.position.set(0, legH / 2, lz); root.add(lg); });
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
            crowdMembers.push({ mesh: root, bodyPivot, headGroup, leftArmPivot, rightArmPivot, baseY: y + childLift, phase: Math.random() * Math.PI * 2, standing: true });
        };
        const keep = preset.crowdKeepRatio;
        // lato ovest (cronometristi): due file, più gente al centro; lato est solo oltre le panchine
        [[-21.6, 0.4], [-22.6, 0.28]].forEach(([x, dens]) => {
            for (let z = -30; z <= 30; z += 0.75) {
                if (Math.random() < keep * dens * (1 - Math.abs(z) / 45)) fan(x + (Math.random() - 0.5) * 0.3, 0, z, 0);
            }
        });
        for (let z = -32; z <= 32; z += 0.9) {
            if (Math.abs(z) < 17.5) continue;
            if (Math.random() < keep * 0.22) fan(23.2, 0, z, Math.PI);
        }
    }

    registerArenaBuilder('castellon', buildCastellonArchitecture);
})();
