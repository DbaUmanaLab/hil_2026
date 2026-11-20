// Palazzetto "cittadella": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, arenaSwayItems, CIT_TEX, ...).
(function () {
    function buildPalaHockeyCittadellaArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';

        // Volta: semiellisse centrata in CX, semiassi A (orizzontale) e B (altezza), lunga 2*HL
        const CX = -1.5, A = 25.5, B = 17.0, HL = 40, BAY = 5;
        const ellPoint = th => new THREE.Vector3(CX + A * Math.cos(th), B * Math.sin(th), 0);
        const ellNormal = th => new THREE.Vector3(Math.cos(th) / A, Math.sin(th) / B, 0).normalize();
        const insetPoint = (th, d) => ellPoint(th).addScaledVector(ellNormal(th), -d);
        const thetaAtHeight = (y, side) => { const a = Math.asin(Math.min(1, y / B)); return side > 0 ? a : Math.PI - a; };

        // ---------- materiali
        const woodMat = new THREE.MeshStandardMaterial({
            map: loadFileTexture(CIT_TEX + 'glulam.jpg', { wrap: true }),
            normalMap: loadFileTexture(CIT_TEX + 'glulam_n.jpg', { wrap: true }),
            normalScale: new THREE.Vector2(0.7, 0.7),
            color: 0xc4834a,
            roughness: 0.58, metalness: 0.0
        });
        const membraneMat = new THREE.MeshStandardMaterial({
            map: loadFileTexture(CIT_TEX + 'membrane.jpg', { wrap: true }),
            normalMap: loadFileTexture(CIT_TEX + 'membrane_n.jpg', { wrap: true }),
            normalScale: new THREE.Vector2(0.55, 0.55),
            color: 0xeedfc4,
            emissive: 0xffe9c8,
            emissiveMap: loadFileTexture(CIT_TEX + 'membrane.jpg', { wrap: true }),
            emissiveIntensity: 0.2,
            roughness: 0.88, side: THREE.DoubleSide
        });
        const wallMat = new THREE.MeshStandardMaterial({
            map: loadFileTexture(CIT_TEX + 'wall_maroon.jpg', { repeat: [80, 3.2] }),
            normalMap: loadFileTexture(CIT_TEX + 'wall_maroon_n.jpg', { repeat: [80, 3.2] }),
            roughness: 0.55, metalness: 0.35
        });
        const endWallMat = new THREE.MeshStandardMaterial({
            map: loadFileTexture(CIT_TEX + 'wall_maroon.jpg', { repeat: [51, 3.2] }),
            normalMap: loadFileTexture(CIT_TEX + 'wall_maroon_n.jpg', { repeat: [51, 3.2] }),
            roughness: 0.55, metalness: 0.35
        });
        const steelMat = new THREE.MeshStandardMaterial({ color: 0x3f454e, metalness: 0.7, roughness: 0.35 });
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff7e6 });
        const corridorMat = new THREE.MeshBasicMaterial({ color: 0xfdf3dc });

        // ---------- 1. telo della volta, con leggero "cuscino" tra un arco e l'altro
        const nTh = lowQ ? 40 : 72, nZ = (2 * HL / BAY) * (lowQ ? 4 : 8);
        const vPos = [], vUv = [], vIdx = [];
        for (let j = 0; j <= nZ; j++) {
            const z = -HL + (2 * HL * j) / nZ;
            const bayFrac = ((z + HL) / BAY) % 1;
            const sag = 0.42 * Math.sin(Math.PI * bayFrac);
            for (let i = 0; i <= nTh; i++) {
                const th = (Math.PI * i) / nTh;
                const s2 = sag * Math.min(1, Math.sin(th) * 1.8);
                const pnt = insetPoint(th, s2);
                vPos.push(pnt.x, pnt.y, z);
                vUv.push((z + HL) / BAY, (i / nTh) * 13.6);
            }
        }
        for (let j = 0; j < nZ; j++) {
            for (let i = 0; i < nTh; i++) {
                const a = j * (nTh + 1) + i, b = a + nTh + 1;
                vIdx.push(a, b, a + 1, b, b + 1, a + 1);
            }
        }
        const vaultGeo = new THREE.BufferGeometry();
        vaultGeo.setAttribute('position', new THREE.Float32BufferAttribute(vPos, 3));
        vaultGeo.setAttribute('uv', new THREE.Float32BufferAttribute(vUv, 2));
        vaultGeo.setIndex(vIdx);
        vaultGeo.computeVertexNormals();
        targetGroup.add(new THREE.Mesh(vaultGeo, membraneMat));

        // ---------- 2. archi in legno lamellare a sezione rettangolare (instanced)
        function buildArchGeometry(depth, width, inset) {
            const n = lowQ ? 36 : 64;
            const pos = [], nor = [], uv = [], idx = [];
            const P = [], N = [], L = [0];
            for (let i = 0; i <= n; i++) {
                const th = (Math.PI * i) / n;
                P.push(insetPoint(th, inset + depth / 2));
                N.push(ellNormal(th));
                if (i > 0) L.push(L[i - 1] + P[i].distanceTo(P[i - 1]));
            }
            const Z = new THREE.Vector3(0, 0, 1);
            const faces = [
                { a: (i) => P[i].clone().addScaledVector(N[i], -depth / 2).addScaledVector(Z, -width / 2), b: (i) => P[i].clone().addScaledVector(N[i], -depth / 2).addScaledVector(Z, width / 2), n: (i) => N[i].clone().negate() },
                { a: (i) => P[i].clone().addScaledVector(N[i], depth / 2).addScaledVector(Z, width / 2), b: (i) => P[i].clone().addScaledVector(N[i], depth / 2).addScaledVector(Z, -width / 2), n: (i) => N[i].clone() },
                { a: (i) => P[i].clone().addScaledVector(N[i], -depth / 2).addScaledVector(Z, width / 2), b: (i) => P[i].clone().addScaledVector(N[i], depth / 2).addScaledVector(Z, width / 2), n: () => Z.clone() },
                { a: (i) => P[i].clone().addScaledVector(N[i], depth / 2).addScaledVector(Z, -width / 2), b: (i) => P[i].clone().addScaledVector(N[i], -depth / 2).addScaledVector(Z, -width / 2), n: () => Z.clone().negate() }
            ];
            faces.forEach(f => {
                const base = pos.length / 3;
                for (let i = 0; i <= n; i++) {
                    const va = f.a(i), vb = f.b(i), nn = f.n(i);
                    pos.push(va.x, va.y, va.z, vb.x, vb.y, vb.z);
                    nor.push(nn.x, nn.y, nn.z, nn.x, nn.y, nn.z);
                    uv.push(L[i] / 4, 0, L[i] / 4, 1);
                }
                for (let i = 0; i < n; i++) {
                    const a = base + i * 2;
                    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
                }
            });
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
            g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
            g.setIndex(idx);
            return g;
        }
        const archCount = 2 * HL / BAY + 1;
        const arches = new THREE.InstancedMesh(buildArchGeometry(0.95, 0.26, 0.12), woodMat, archCount);
        const tmpM = new THREE.Matrix4();
        for (let k = 0; k < archCount; k++) {
            tmpM.makeTranslation(0, 0, -HL + k * BAY + (k === 0 ? 0.3 : (k === archCount - 1 ? -0.3 : 0)));
            arches.setMatrixAt(k, tmpM);
        }
        arches.instanceMatrix.needsUpdate = true;
        targetGroup.add(arches);

        // ---------- 3. arcarecci longitudinali
        [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8].forEach(f => {
            const th = Math.PI * f;
            const pnt = insetPoint(th, 0.64);
            const nn = ellNormal(th);
            const purlin = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.17, 2 * HL - 0.6), woodMat);
            purlin.position.set(pnt.x, pnt.y, 0);
            purlin.rotation.z = Math.atan2(nn.x, -nn.y);
            targetGroup.add(purlin);
        });

        // ---------- 4. pareti grecate bordeaux sui lati lunghi e in testata
        const WALL_H = 3.2;
        [-26.2, 23.0].forEach(wx => {
            const w = new THREE.Mesh(new THREE.BoxGeometry(0.3, WALL_H, 2 * HL), wallMat);
            w.position.set(wx, WALL_H / 2, 0);
            w.receiveShadow = preset.shadows;
            targetGroup.add(w);
            const cap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 2 * HL), steelMat);
            cap.position.set(wx, WALL_H + 0.04, 0);
            targetGroup.add(cap);
        });

        // porte di servizio illuminate (con insegna USCITA) e finestre alte sul lato panchine
        const exitMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
        function addDoor(x, z, facing) {
            const g = new THREE.Group();
            const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 0.2), steelMat);
            frame.position.y = 1.3;
            const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.35), corridorMat);
            glow.position.set(0, 1.2, 0.11);
            const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.08), exitMat);
            sign.position.set(0, 2.85, 0.12);
            g.add(frame, glow, sign);
            g.position.set(x, 0, z);
            g.rotation.y = facing;
            targetGroup.add(g);
        }
        addDoor(22.82, -27, -Math.PI / 2);
        addDoor(22.82, 27, -Math.PI / 2);
        addDoor(-14, -HL + 0.2, 0);
        addDoor(9, HL - 0.2, Math.PI);
        const winMat = new THREE.MeshBasicMaterial({ color: 0xeaf4ff });
        for (let z = -35; z <= 35; z += 10) {
            const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.7), winMat);
            win.rotation.y = -Math.PI / 2;
            win.position.set(22.84, 2.65, z);
            targetGroup.add(win);
        }

        // ---------- 5. testate: parete bassa, telo semiellittico, montanti in legno
        const endShape = new THREE.Shape();
        endShape.moveTo(CX + A, 0);
        for (let i = 1; i <= 48; i++) {
            const th = (Math.PI * i) / 48;
            endShape.lineTo(CX + A * Math.cos(th), B * Math.sin(th));
        }
        endShape.lineTo(CX + A, 0);
        const endGeo = new THREE.ShapeGeometry(endShape, 24);
        const endMembraneMat = membraneMat.clone();
        endMembraneMat.map = loadFileTexture(CIT_TEX + 'membrane.jpg', { repeat: [0.2, 0.2] });
        endMembraneMat.emissiveMap = endMembraneMat.map;
        endMembraneMat.normalMap = loadFileTexture(CIT_TEX + 'membrane_n.jpg', { repeat: [0.2, 0.2] });
        [-1, 1].forEach(dir => {
            const ez = dir * HL;
            const endMembrane = new THREE.Mesh(endGeo, endMembraneMat);
            endMembrane.position.z = ez;
            targetGroup.add(endMembrane);

            const lowWall = new THREE.Mesh(new THREE.BoxGeometry(2 * A, WALL_H, 0.3), endWallMat);
            lowWall.position.set(CX, WALL_H / 2, ez - dir * 0.15);
            targetGroup.add(lowWall);

            for (let dx = -20; dx <= 20; dx += 5) {
                const topY = B * Math.sqrt(Math.max(0, 1 - (dx / A) ** 2)) - 0.6;
                if (topY <= WALL_H) continue;
                const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.22, topY - WALL_H, 0.45), woodMat);
                mullion.position.set(CX + dx, (topY + WALL_H) / 2, ez - dir * 0.5);
                targetGroup.add(mullion);
            }
            const transom = new THREE.Mesh(new THREE.BoxGeometry(2 * A - 3, 0.24, 0.4), woodMat);
            transom.position.set(CX, WALL_H + 0.1, ez - dir * 0.5);
            targetGroup.add(transom);
        });

        // ---------- 6. corpi illuminanti: strisce continue sui fianchi + proiettori sugli archi
        const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
        [0.1, 0.9].forEach(f => {
            const th = Math.PI * f;
            const pnt = insetPoint(th, 0.55);
            const nn = ellNormal(th);
            const strip = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 2 * HL - 2), lightMat);
            strip.position.set(pnt.x, pnt.y, 0);
            strip.rotation.z = Math.atan2(nn.x, -nn.y);
            targetGroup.add(strip);
            if (!lowQ) {
                const halo = new THREE.Mesh(
                    new THREE.PlaneGeometry(2 * HL - 2, 2.4),
                    new THREE.MeshBasicMaterial({ map: createGlowBandTexture(), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
                );
                halo.position.copy(pnt).addScaledVector(nn, -0.08);
                const hIn = nn.clone().negate();
                const hZ = new THREE.Vector3(0, 0, 1);
                const hUp = new THREE.Vector3().crossVectors(hIn, hZ);
                halo.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(hZ, hUp, hIn));
                targetGroup.add(halo);
            }
        });
        const housingGeo = new THREE.CylinderGeometry(0.34, 0.26, 0.32, 16);
        const lensGeo = new THREE.CircleGeometry(0.24, 16);
        for (let k = 1; k < archCount - 1; k += 2) {
            [0.38, 0.62].forEach(f => {
                const th = Math.PI * f;
                const pnt = insetPoint(th, 1.25);
                const z = -HL + k * BAY;
                const housing = new THREE.Mesh(housingGeo, steelMat);
                housing.position.set(pnt.x, pnt.y, z);
                targetGroup.add(housing);
                const lens = new THREE.Mesh(lensGeo, lightMat);
                lens.rotation.x = Math.PI / 2;
                lens.position.set(pnt.x, pnt.y - 0.17, z);
                targetGroup.add(lens);
                if (!lowQ) {
                    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff1d0, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
                    spr.scale.set(2.6, 2.6, 1);
                    spr.position.set(pnt.x, pnt.y - 0.3, z);
                    targetGroup.add(spr);
                }
            });
        }

        // ---------- 7. striscioni sponsor appesi al telo (seguono la curvatura)
        const bannerMats = {};
        function bannerMat(name) {
            if (!bannerMats[name]) {
                const tex = loadFileTexture(CIT_TEX + 'banners/' + name + (name === 'emblem' ? '.png' : '.jpg'));
                bannerMats[name] = new THREE.MeshStandardMaterial({
                    map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.2,
                    roughness: 0.85, transparent: name === 'emblem'
                });
            }
            return bannerMats[name];
        }
        const bannerGeo = new THREE.PlaneGeometry(4.3, 1.075);
        function hangOnVault(name, z, y, side) {
            const th = thetaAtHeight(y, side);
            const nn = ellNormal(th);
            const inward = nn.clone().negate();
            const up = new THREE.Vector3(-inward.y, inward.x, 0);
            if (up.y < 0) up.negate();
            const right = new THREE.Vector3().crossVectors(up, inward);
            const m = new THREE.Mesh(bannerGeo, bannerMat(name));
            m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, inward));
            m.position.copy(insetPoint(th, 0.58));
            m.position.z = z;
            targetGroup.add(m);
        }
        const sponsorsStands = ['promec', 'diprint', 'forese', 'studiomarcon', 'dafranco', 'celenit', 'berto', 'cortal'];
        const sponsorsBench = ['edilnova', 'xausa', 'torni', 'spazio', 'vetrocar', 'sariv', 'promec', 'forese'];
        for (let k = 0; k < 2 * HL / BAY; k++) {
            const z = -HL + BAY * (k + 0.5);
            hangOnVault(sponsorsStands[k % sponsorsStands.length], z, 6.9, -1);
            if (!lowQ && k % 2 === 1) hangOnVault(sponsorsStands[(k + 3) % sponsorsStands.length], z, 9.5, -1);
            if (k !== 7 && k !== 8) hangOnVault(sponsorsBench[k % sponsorsBench.length], z, 6.9, 1);
        }

        // testate: striscioni e stendardo del club (lontani dai tabelloni centrali)
        function endPlane(name, w, h, x, y, dir) {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bannerMat(name));
            m.position.set(x, y, dir * (HL - 0.75));
            if (dir > 0) m.rotation.y = Math.PI;
            targetGroup.add(m);
        }
        endPlane('sempre', 10.5, 1.64, CX + 1.5, 13.4, -1);
        endPlane('rollerblade', 4.4, 1.1, CX - 15.5, 6.6, -1);

        // drappo con lo stemma dei Carraresi dietro la porta nord (lato casetta bar),
        // tra due tende bordeaux, con il festone di bandierine tricolori davanti
        {
            const dz = -(HL - 0.45);
            const drapeTex = loadFileTexture(CIT_TEX + 'banners/carraresi.png');
            const drape = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 6.3),
                new THREE.MeshStandardMaterial({ map: drapeTex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, roughness: 0.9, emissive: 0xffffff, emissiveMap: drapeTex, emissiveIntensity: 0.2 }));
            drape.position.set(1.0, 8.4, dz + 0.05);
            targetGroup.add(drape);
            const curTex = loadFileTexture(CIT_TEX + 'banners/curtain.png');
            const curMat = new THREE.MeshStandardMaterial({ map: curTex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, roughness: 0.85, emissive: 0x4a0c12, emissiveIntensity: 0.25 });
            [-1, 1].forEach(sd => {
                const cur = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 6.6), curMat);
                cur.position.set(1.0 + sd * 2.65, 8.6, dz);
                if (sd > 0) cur.scale.x = -1;
                targetGroup.add(cur);
            });
            const valance = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.35, 0.12), new THREE.MeshStandardMaterial({ color: 0x7a1520, roughness: 0.8 }));
            valance.position.set(1.0, 11.95, dz);
            targetGroup.add(valance);
            // festone di bandierine italiane
            const flagTex = loadFileTexture(CIT_TEX + 'flag_italia.jpg');
            const flagMat = new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.9, emissive: 0xffffff, emissiveMap: flagTex, emissiveIntensity: 0.15 });
            const flagGeo = new THREE.PlaneGeometry(0.62, 0.42);
            const x0 = -8.5, x1 = 10.5, yTop = 5.9, sag = 0.7, n = 16;
            const pts = [];
            for (let i = 0; i <= n; i++) {
                const t = i / n, x = x0 + (x1 - x0) * t, y = yTop - sag * Math.sin(Math.PI * t);
                pts.push(new THREE.Vector3(x, y, dz + 0.9));
                if (i < n) {
                    const f = new THREE.Mesh(flagGeo, flagMat);
                    const tm = (i + 0.5) / n;
                    f.position.set(x0 + (x1 - x0) * tm, yTop - sag * Math.sin(Math.PI * tm) - 0.24, dz + 0.9);
                    targetGroup.add(f);
                }
            }
            targetGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x333333 })));
        }
        endPlane('spazio', 4.4, 1.1, CX + 13.5, 6.6, -1);
        endPlane('lottando', 6.6, 1.65, CX - 11.5, 6.0, 1);
        endPlane('emblem', 3.2, 4.8, CX + 13.5, 7.4, 1);
        endPlane('dafranco', 4.4, 1.1, CX + 1.5, 10.6, 1);

        // ---------- 8. bandiere appese alla volta (Italia e Veneto) con leggero ondeggiare
        function hangFlag(file, w, h, x, z) {
            const topY = B * Math.sqrt(1 - ((x - CX) / A) ** 2) - 1.7;
            const pivot = new THREE.Group();
            pivot.position.set(x, topY, z);
            const tex = loadFileTexture(CIT_TEX + file);
            const flag = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
                new THREE.MeshStandardMaterial({ map: tex, transparent: file.endsWith('.png'), side: THREE.DoubleSide, roughness: 0.9, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.15 }));
            flag.rotation.y = Math.PI / 2;
            flag.position.y = -h / 2;
            const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.6, 4), steelMat);
            wire.position.y = 0.8;
            pivot.add(flag, wire);
            targetGroup.add(pivot);
            arenaSwayItems.push({ obj: pivot, amp: 0.035, speed: 0.6 + Math.random() * 0.3, phase: Math.random() * 6 });
        }
        hangFlag('flag_italia.jpg', 3.3, 2.2, -13, -3);
        hangFlag('flag_veneto.png', 3.3, 2.06, -13, 3);

        // ---------- 9. pennoni bianchi con lo stemma lungo il lato panchine
        const pennantTex = loadFileTexture(CIT_TEX + 'pennant.png');
        const pennantMat = new THREE.MeshStandardMaterial({ map: pennantTex, transparent: true, side: THREE.DoubleSide, roughness: 0.85, emissive: 0xffffff, emissiveMap: pennantTex, emissiveIntensity: 0.15 });
        const pennantGeo = new THREE.PlaneGeometry(0.78, 1.17);
        const poleGeo = new THREE.CylinderGeometry(0.028, 0.028, 5.0, 6);
        const barGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.86, 6);
        for (let z = -32.5; z <= 32.5; z += 5) {
            const pole = new THREE.Mesh(poleGeo, steelMat);
            pole.position.set(22.35, 2.5, z);
            const bar = new THREE.Mesh(barGeo, steelMat);
            bar.rotation.x = Math.PI / 2;
            bar.position.set(22.3, 4.95, z - 0.43);
            const pivot = new THREE.Group();
            pivot.position.set(22.28, 4.93, z - 0.43);
            const flag = new THREE.Mesh(pennantGeo, pennantMat);
            flag.rotation.y = -Math.PI / 2;
            flag.position.set(0, -0.6, 0);
            pivot.add(flag);
            targetGroup.add(pole, bar, pivot);
            arenaSwayItems.push({ obj: pivot, amp: 0.05, speed: 0.9 + Math.random() * 0.4, phase: Math.random() * 6 });
        }

        // ---------- 10. rete di protezione dietro le porte (lasciando libero il tabellone)
        const netTex = loadFileTexture(CIT_TEX + 'netting.png', { repeat: [12.5 / 0.12, 4 / 0.12] });
        const netMatProt = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, depthWrite: false, opacity: 0.55 });
        [-1, 1].forEach(dir => {
            [-11.75, 11.75].forEach(nx => {
                const net = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 4.0), netMatProt);
                net.position.set(nx, 4.5, dir * 36.32);
                targetGroup.add(net);
            });
            [-18, -5.5, 5.5, 18].forEach(px => {
                const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 4.2, 8), steelMat);
                post.position.set(px, 4.6, dir * 36.32);
                targetGroup.add(post);
            });
        });

        // ---------- 11. montanti dei vetri (lato tribuna e fondi)
        const postPositions = [];
        for (let z = -28.5; z <= 28.51; z += 2.375) postPositions.push([-18.13, 1.15, z, 1.05]);
        [-1, 1].forEach(dir => { for (let x = -10.5; x <= 10.51; x += 2.1) postPositions.push([x, 1.15, dir * 36.13, 1.35]); });
        const glassPosts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 1, 0.06), steelMat, postPositions.length);
        postPositions.forEach(([x, y, z, h], i) => {
            tmpM.makeScale(1, h, 1).setPosition(x, y + h / 2, z);
            glassPosts.setMatrixAt(i, tmpM);
        });
        glassPosts.instanceMatrix.needsUpdate = true;
        targetGroup.add(glassPosts);

        buildCittadellaWoodenBar(targetGroup);
        buildCittadellaTvTower(targetGroup);
    }

    // Banda luminosa sfumata (alone delle strisce LED)
    let glowBandTex = null;
    function createGlowBandTexture() {
        if (glowBandTex) return glowBandTex;
        const c = document.createElement('canvas');
        c.width = 4; c.height = 64;
        const ctx = c.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, 0, 64);
        g.addColorStop(0, 'rgba(255,244,214,0)');
        g.addColorStop(0.5, 'rgba(255,244,214,1)');
        g.addColorStop(1, 'rgba(255,244,214,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 4, 64);
        glowBandTex = new THREE.CanvasTexture(c);
        return glowBandTex;
    }

    // --- CASETTA DI LEGNO (BAR) SULL'ANGOLO DESTRO DELLA TRIBUNA DEL PALAHOCKEY DI CITTADELLA ---
    function buildCittadellaWoodenBar(targetGroup) {
        const pbr = getPhotorealisticPBRMaps();
        const timberWallMat = new THREE.MeshStandardMaterial({
            map: pbr.woodDiffuse,
            bumpMap: pbr.woodBump,
            bumpScale: 0.025,
            roughnessMap: pbr.woodRough,
            color: 0xb45309,
            roughness: 0.62
        });
        const darkBeamMat = new THREE.MeshStandardMaterial({
            map: pbr.woodDiffuse,
            color: 0x5c2d0c,
            roughness: 0.7
        });
        const roofShingleMat = new THREE.MeshStandardMaterial({
            color: 0x3f2305,
            roughness: 0.82
        });
        const interiorGlowMat = new THREE.MeshStandardMaterial({
            color: 0xfef3c7,
            emissive: 0xfde047,
            emissiveIntensity: 0.48,
            roughness: 0.4
        });

        const barGroup = new THREE.Group();
        barGroup.position.set(-21.6, 0, -31.2);

        const cabinW = 4.4;
        const cabinD = 5.2;
        const wallH = 2.75;

        const baseDeck = new THREE.Mesh(new THREE.BoxGeometry(cabinW + 0.4, 0.16, cabinD + 0.4), darkBeamMat);
        baseDeck.position.y = 0.08;
        barGroup.add(baseDeck);

        const backWall = new THREE.Mesh(new THREE.BoxGeometry(0.18, wallH, cabinD), timberWallMat);
        backWall.position.set(-cabinW / 2 + 0.09, wallH / 2 + 0.16, 0);
        backWall.castShadow = true;
        barGroup.add(backWall);

        const northWall = new THREE.Mesh(new THREE.BoxGeometry(cabinW, wallH, 0.18), timberWallMat);
        northWall.position.set(0, wallH / 2 + 0.16, -cabinD / 2 + 0.09);
        barGroup.add(northWall);

        const southLowerWall = new THREE.Mesh(new THREE.BoxGeometry(cabinW, 1.05, 0.18), timberWallMat);
        southLowerWall.position.set(0, 0.525 + 0.16, cabinD / 2 - 0.09);
        const southCounter = new THREE.Mesh(new THREE.BoxGeometry(cabinW + 0.15, 0.09, 0.52), darkBeamMat);
        southCounter.position.set(0, 1.08 + 0.16, cabinD / 2 + 0.05);
        barGroup.add(southLowerWall, southCounter);

        const frontLowerWall = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.05, cabinD), timberWallMat);
        frontLowerWall.position.set(cabinW / 2 - 0.09, 0.525 + 0.16, 0);
        const frontCounter = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.09, cabinD + 0.15), darkBeamMat);
        frontCounter.position.set(cabinW / 2 + 0.05, 1.08 + 0.16, 0);
        barGroup.add(frontLowerWall, frontCounter);

        [
            [-cabinW / 2 + 0.1, -cabinD / 2 + 0.1],
            [cabinW / 2 - 0.1, -cabinD / 2 + 0.1],
            [-cabinW / 2 + 0.1, cabinD / 2 - 0.1],
            [cabinW / 2 - 0.1, cabinD / 2 - 0.1]
        ].forEach(([px, pz]) => {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, wallH, 0.22), darkBeamMat);
            post.position.set(px, wallH / 2 + 0.16, pz);
            barGroup.add(post);
        });

        const innerBack = new THREE.Mesh(new THREE.PlaneGeometry(cabinD - 0.4, wallH - 0.2), interiorGlowMat);
        innerBack.rotation.y = Math.PI / 2;
        innerBack.position.set(-cabinW / 2 + 0.2, wallH / 2 + 0.16, 0);
        barGroup.add(innerBack);

        const backCounter = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.95, cabinD - 0.6), darkBeamMat);
        backCounter.position.set(-cabinW / 2 + 0.55, 0.63, 0);
        const espressoMachine = new THREE.Mesh(
            new THREE.BoxGeometry(0.45, 0.42, 0.68),
            new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.6, roughness: 0.25 })
        );
        espressoMachine.position.set(-cabinW / 2 + 0.55, 1.32, -0.75);
        barGroup.add(backCounter, espressoMachine);

        const leftSlope = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.16, cabinD + 0.7), roofShingleMat);
        leftSlope.position.set(-1.18, wallH + 0.62, 0);
        leftSlope.rotation.z = 0.42;

        const rightSlope = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.16, cabinD + 0.7), roofShingleMat);
        rightSlope.position.set(1.18, wallH + 0.62, 0);
        rightSlope.rotation.z = -0.42;

        const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, cabinD + 0.8), darkBeamMat);
        ridgeBeam.position.set(0, wallH + 1.16, 0);
        barGroup.add(leftSlope, rightSlope, ridgeBeam);

        const barSignTex = createBannerTexture('BAR PALAHOCKEY', 'CAFFÈ • PANINI • BIBITE', '#451a03', '#fde047');
        const frontSign = new THREE.Mesh(
            new THREE.PlaneGeometry(3.4, 0.68),
            new THREE.MeshBasicMaterial({ map: barSignTex, side: THREE.DoubleSide })
        );
        frontSign.rotation.y = Math.PI / 2;
        frontSign.position.set(cabinW / 2 + 0.04, wallH - 0.18, 0);

        const southSign = new THREE.Mesh(
            new THREE.PlaneGeometry(3.0, 0.62),
            new THREE.MeshBasicMaterial({ map: barSignTex, side: THREE.DoubleSide })
        );
        southSign.position.set(0, wallH - 0.18, cabinD / 2 + 0.04);
        barGroup.add(frontSign, southSign);

        addBarSheets(barGroup, cabinW, cabinD);
        addBarPeople(targetGroup, barGroup, cabinW, cabinD);
        targetGroup.add(barGroup);
    }


    // --- TORRE DELLE RIPRESE TV IN MEZZO ALLA TRIBUNA ---
    // Ponteggio in tubi d'acciaio appoggiato sulle due file più alte, al centro della tribuna
    // (dove la volta è abbastanza alta), con scala alla marinara, piano di lavoro con parapetto,
    // telecamera su treppiede e operatore. Le file e la posizione sono quelle del pubblico di index.html
    // (rowX = -rinkWidth/2 - 2.35 - row*1.25, rowY = 0.55*(row+1)); lì gli spettatori non vengono messi.
    function buildCittadellaTvTower(targetGroup) {
        const lowQ = getActiveQualityPreset().id === 'low';
        const rowX = row => -rinkWidth / 2 - 2.35 - row * 1.25;
        const rowTop = row => 0.55 * (row + 1);
        const cx = (rowX(2) + rowX(3)) / 2, cz = CIT_TV_TOWER_Z;
        const S = 0.85;                               // metà lato del ponteggio
        const deckY = 5.0;
        const tubeMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.75, roughness: 0.35 });
        const boardMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3e, roughness: 0.8 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5, metalness: 0.3 });

        const tower = new THREE.Group();
        tower.position.set(cx, 0, cz);
        targetGroup.add(tower);

        // tubi: un'unica InstancedMesh (un cilindro unitario orientato da un punto all'altro)
        const tubes = [];
        const tube = (a, b, r = 0.024) => tubes.push([a, b, r]);
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        // montanti: quelli verso la pista poggiano sulla fila 3, quelli dietro sulla fila 4
        const legBase = x => (x > 0 ? rowTop(2) : rowTop(3));
        const corners = [[S, S], [S, -S], [-S, S], [-S, -S]];
        corners.forEach(([x, z]) => tube(V(x, legBase(x), z), V(x, deckY + 1.05, z), 0.028));
        // correnti orizzontali ogni metro e diagonali alternate sui quattro lati
        const levels = [];
        for (let y = rowTop(3) + 0.25; y < deckY - 0.1; y += 0.95) levels.push(y);
        levels.push(deckY);
        levels.forEach((y, i) => {
            tube(V(S, y, S), V(S, y, -S)); tube(V(-S, y, S), V(-S, y, -S));
            tube(V(S, y, S), V(-S, y, S)); tube(V(S, y, -S), V(-S, y, -S));
            if (i < levels.length - 1) {
                const y2 = levels[i + 1], f = i % 2 ? 1 : -1;
                tube(V(S, y, f * S), V(S, y2, -f * S), 0.018);
                tube(V(-S, y, -f * S), V(-S, y2, f * S), 0.018);
                tube(V(f * S, y, S), V(-f * S, y2, S), 0.018);
                tube(V(-f * S, y, -S), V(f * S, y2, -S), 0.018);
            }
        });
        // parapetto: corrente a metà e in alto
        [0.5, 1.0].forEach(h => {
            const y = deckY + h;
            tube(V(S, y, S), V(S, y, -S)); tube(V(-S, y, S), V(-S, y, -S));
            tube(V(S, y, S), V(-S, y, S)); tube(V(S, y, -S), V(-S, y, -S));
        });
        // scala alla marinara sul lato -Z (verso il fondo con la casetta)
        const lz = -S - 0.12, lx0 = -0.2, lx1 = 0.2;
        tube(V(lx0, rowTop(3), lz), V(lx0, deckY + 1.0, lz), 0.018);
        tube(V(lx1, rowTop(3), lz), V(lx1, deckY + 1.0, lz), 0.018);
        for (let y = rowTop(3) + 0.3; y < deckY; y += 0.3) tube(V(lx0, y, lz), V(lx1, y, lz), 0.013);

        const unit = new THREE.CylinderGeometry(1, 1, 1, lowQ ? 6 : 8, 1);
        const inst = new THREE.InstancedMesh(unit, tubeMat, tubes.length);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0), dir = V(0, 0, 0), mid = V(0, 0, 0), sc = V(1, 1, 1);
        tubes.forEach(([a, b, r], i) => {
            dir.subVectors(b, a); const len = dir.length(); dir.normalize();
            q.setFromUnitVectors(up, dir);
            mid.addVectors(a, b).multiplyScalar(0.5);
            sc.set(r, len, r);
            m.compose(mid, q, sc);
            inst.setMatrixAt(i, m);
        });
        inst.instanceMatrix.needsUpdate = true;
        inst.castShadow = true;
        tower.add(inst);

        // piano di lavoro con le tavole fermapiede
        const deck = new THREE.Mesh(new THREE.BoxGeometry(2 * S + 0.1, 0.05, 2 * S + 0.1), boardMat);
        deck.position.y = deckY + 0.025;
        tower.add(deck);
        [[0, S], [0, -S]].forEach(([x, z]) => {
            const tb = new THREE.Mesh(new THREE.BoxGeometry(2 * S, 0.15, 0.025), boardMat);
            tb.position.set(x, deckY + 0.1, z);
            tower.add(tb);
        });
        [[S, 0], [-S, 0]].forEach(([x, z]) => {
            const tb = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.15, 2 * S), boardMat);
            tb.position.set(x, deckY + 0.1, z);
            tower.add(tb);
        });
        // piedini a vite sotto i montanti
        corners.forEach(([x, z]) => {
            const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.16), darkMat);
            foot.position.set(x, legBase(x) + 0.01, z);
            tower.add(foot);
        });

        // telecamera su treppiede, puntata verso il centro della pista
        const cam = new THREE.Group();
        cam.position.set(0.25, deckY + 0.05, 0);
        tower.add(cam);
        for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2 + 0.3;
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 6), darkMat);
            leg.position.set(Math.cos(a) * 0.17, 0.62, Math.sin(a) * 0.17);
            leg.rotation.set(Math.sin(a) * 0.26, 0, -Math.cos(a) * 0.26);
            cam.add(leg);
        }
        const headY = 1.28;
        const fluid = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.09, 12), darkMat);
        fluid.position.y = headY;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.15), darkMat);
        body.position.set(0.03, headY + 0.15, 0);
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.32, 14), darkMat);
        lens.rotation.z = -Math.PI / 2;
        lens.position.set(0.38, headY + 0.15, 0);
        const hood = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.17), darkMat);
        hood.position.set(0.56, headY + 0.15, 0);
        const vf = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.12), darkMat);
        vf.position.set(-0.08, headY + 0.29, -0.04);
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), darkMat);
        handle.rotation.z = Math.PI / 2 - 0.35;
        handle.position.set(-0.36, headY + 0.08, 0.06);
        const tally = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
        tally.position.set(0.2, headY + 0.27, 0);
        cam.add(fluid, body, lens, hood, vf, handle, tally);

        // operatore dietro la camera
        if (window.HIL_PEOPLE) {
            const op = window.HIL_PEOPLE.makePerson({ top: 0x111827, pants: 0x1f2937, female: false, cap: 0x111827 });
            op.mesh.position.set(-0.45, deckY + 0.05, 0.05);
            op.rightArmPivot.rotation.z = 0.75;    // mano sul manico della testa fluida
            op.leftArmPivot.rotation.z = 0.35;
            op.headGroup.rotation.z = -0.08;
            tower.add(op.mesh);
        }
    }

    // --- FOGLI ATTACCATI ALLA CASETTA: listino, panini, locandina della squadra, avvisi ---
    function citSheetTexture(kind) {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 362;
        const g = c.getContext('2d');
        const paper = { menu: '#fffdf6', panini: '#fffbe8', poster: '#ffffff', notice: '#fef9c3', torneo: '#e0f2fe' }[kind] || '#fff';
        g.fillStyle = paper; g.fillRect(0, 0, 256, 362);
        g.textAlign = 'center';
        const line = (txt, y, size, color = '#1c1917', weight = '700', font = 'Arial') => {
            g.fillStyle = color; g.font = `${weight} ${size}px ${font}`; g.fillText(txt, 128, y);
        };
        const row = (a, b, y) => {
            g.fillStyle = '#292524'; g.font = '600 19px Arial';
            g.textAlign = 'left'; g.fillText(a, 22, y);
            g.textAlign = 'right'; g.fillText(b, 234, y);
            g.textAlign = 'center';
            g.strokeStyle = 'rgba(0,0,0,0.15)'; g.setLineDash([2, 4]); g.beginPath(); g.moveTo(22, y + 7); g.lineTo(234, y + 7); g.stroke(); g.setLineDash([]);
        };
        if (kind === 'menu') {
            line('LISTINO PREZZI', 46, 26, '#7c2d12', '900');
            [['Caffè', '1,20 €'], ['Caffè corretto', '1,80 €'], ['Cappuccino', '1,50 €'], ['Tè caldo', '1,50 €'], ['Acqua 0,5 l', '1,00 €'],
             ['Bibite', '2,50 €'], ['Birra', '3,50 €'], ['Spritz', '4,00 €'], ['Patatine', '1,50 €']].forEach(([a, b], i) => row(a, b, 92 + i * 29));
        } else if (kind === 'panini') {
            line('PANINI', 58, 40, '#b45309', '900');
            line('& TOAST', 92, 24, '#b45309', '800');
            [['Porchetta', '4,50 €'], ['Salame', '4,00 €'], ['Cotto e formaggio', '4,00 €'], ['Toast', '3,50 €'], ['Piadina', '4,50 €']]
                .forEach(([a, b], i) => row(a, b, 142 + i * 34));
            line('chiedere al banco ☺', 336, 17, '#57534e', 'italic 600');
        } else if (kind === 'poster') {
            g.fillStyle = '#b91c1c'; g.fillRect(0, 0, 256, 120);
            line('FORZA', 52, 34, '#fff', '900');
            line('CITTADELLA', 98, 34, '#fff', '900');
            line('HOCKEY IN LINE', 150, 20, '#b91c1c', '800');
            line('SERIE A', 176, 18, '#1e3a8a', '800');
            line('PROSSIMA PARTITA', 226, 18, '#1c1917', '800');
            line('SABATO ORE 20:45', 256, 22, '#b91c1c', '900');
            line('PALAHOCKEY', 290, 18, '#1c1917', '700');
            line('ingresso libero', 322, 16, '#57534e', 'italic 600');
        } else if (kind === 'notice') {
            line('SI ACCETTANO', 90, 26, '#1c1917', '800', 'Comic Sans MS');
            line('CARTE', 140, 40, '#15803d', '900', 'Comic Sans MS');
            line('E SATISPAY', 188, 28, '#dc2626', '800', 'Comic Sans MS');
            line('grazie! ☺', 262, 24, '#1c1917', '600', 'Comic Sans MS');
        } else {
            line('TORNEO', 64, 34, '#1e3a8a', '900');
            line('GIOVANILE', 104, 30, '#1e3a8a', '900');
            line('U12 • U14 • U16', 150, 20, '#0369a1', '700');
            line('iscrizioni al bar', 210, 20, '#1c1917', '600');
            line('o in segreteria', 238, 20, '#1c1917', '600');
            g.fillStyle = '#1e3a8a'; g.fillRect(0, 312, 256, 50);
            line('HC CITTADELLA', 345, 22, '#fff', '800');
        }
        // nastro adesivo sugli angoli in alto
        g.fillStyle = 'rgba(235,225,200,0.75)';
        [[18, 12, -0.5], [238, 12, 0.5]].forEach(([x, y, a]) => { g.save(); g.translate(x, y); g.rotate(a); g.fillRect(-24, -8, 48, 16); g.restore(); });
        const tex = new THREE.CanvasTexture(c);
        tex.anisotropy = 4;
        return tex;
    }

    function addBarSheets(barGroup, cabinW, cabinD) {
        const sheet = (kind, w) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 1.414), new THREE.MeshStandardMaterial({ map: citSheetTexture(kind), roughness: 0.9, side: THREE.DoubleSide }));
            return m;
        };
        // sotto il bancone verso la pista (+X)
        [['menu', -1.55, 0.72, 0.04], ['poster', -0.35, 0.7, -0.05], ['notice', 0.75, 0.74, 0.07], ['panini', 1.75, 0.7, -0.03]].forEach(([k, z, y, tilt]) => {
            const s = sheet(k, 0.34);
            s.rotation.set(0, Math.PI / 2, tilt);
            s.position.set(cabinW / 2 + 0.006, y, z);
            barGroup.add(s);
        });
        // sotto il bancone verso la tribuna (+Z)
        [['torneo', -1.3, 0.72, 0.05], ['menu', 0.2, 0.7, -0.03], ['poster', 1.45, 0.72, 0.04]].forEach(([k, x, y, tilt]) => {
            const s = sheet(k, 0.34);
            s.rotation.set(0, 0, tilt);
            s.position.set(x, y, cabinD / 2 + 0.006);
            barGroup.add(s);
        });
        // dentro, sopra il retrobanco: listino grande
        const big = sheet('menu', 0.55);
        big.rotation.set(0, Math.PI / 2, 0);
        big.position.set(-cabinW / 2 + 0.215, 1.95, 1.2);
        barGroup.add(big);
    }

    // --- DUE RAGAZZE AL BANCO E UN PO' DI GENTE FUORI DALLA CASETTA ---
    function addBarPeople(targetGroup, barGroup, cabinW, cabinD) {
        const P = window.HIL_PEOPLE;
        if (!P || !P.makePerson) return;
        // bariste: maglietta gialla, grembiule marrone; una al banco verso la pista, una verso la tribuna
        const g1 = P.makePerson({ female: true, top: 0xfacc15, pants: 0x1f2937, apron: 0x7c2d12 });
        g1.mesh.position.set(cabinW / 2 - 0.62, 0.16, -0.7);
        g1.rightArmPivot.rotation.z = 0.55;     // porge il caffè sul bancone
        barGroup.add(g1.mesh);
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.07, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
        cup.position.set(cabinW / 2 + 0.05, 1.29 + 0.035, -0.55);
        barGroup.add(cup);
        const g2 = P.makePerson({ female: true, top: 0xfacc15, pants: 0x111827, apron: 0x7c2d12, cap: 0x7c2d12 });
        g2.mesh.position.set(0.55, 0.16, cabinD / 2 - 0.62);
        g2.mesh.rotation.y = -Math.PI / 2;    // guarda verso +Z
        g2.leftArmPivot.rotation.z = 0.4;
        barGroup.add(g2.mesh);

        // clienti: in fila al banco verso la tribuna, uno al banco verso la pista, due che chiacchierano
        const bx = barGroup.position.x, bz = barGroup.position.z;
        const outside = [
            [bx + 0.3, bz + cabinD / 2 + 0.75, Math.PI / 2],         // al banco (+Z), guarda verso -Z
            [bx - 0.1, bz + cabinD / 2 + 1.5, Math.PI / 2 + 0.2],
            [bx + 0.4, bz + cabinD / 2 + 2.2, Math.PI / 2 - 0.15],
            [bx + cabinW / 2 + 0.62, bz - 0.6, Math.PI],             // al banco verso la pista, guarda verso -X
            [bx + cabinW / 2 + 0.55, bz + cabinD / 2 + 0.9, -2.23],  // chiacchierano
            [bx + cabinW / 2 + 0.05, bz + cabinD / 2 + 1.55, 0.91]
        ];
        const tops = [0xb91c1c, 0x1e293b, 0xf8fafc, 0x0f766e, 0x7c3aed, 0x334155];
        outside.forEach(([x, z, ry], i) => {
            const p = P.makePerson({ top: tops[i % tops.length], female: i % 2 === 1 });
            p.mesh.position.set(x, 0, z);
            p.mesh.rotation.y = ry;
            targetGroup.add(p.mesh);
            if (typeof crowdMembers !== 'undefined') crowdMembers.push(p);   // esultano anche loro ai gol
        });
    }

    registerArenaBuilder('cittadella', buildPalaHockeyCittadellaArchitecture);
})();
