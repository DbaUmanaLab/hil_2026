// Palazzetto "cus_verona": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, arenaSwayItems, CIT_TEX, ...).
(function () {
    // =====================================================================
    // PALAHOCKEY CUS VERONA — volta ribassata in telo bianco su archi in legno
    // lamellare, griglia di arcarecci, faretti quadrati, condotto dell'aria in tessuto,
    // pareti basse in telo con montanti, balaustre trasparenti con telaio nero,
    // una sola tribuna (di fronte alle panchine), striscioni sponsor alle pareti.
    // Texture in assets/textures/cus_verona/ (tools/generate_cus_verona_textures.py).
    // =====================================================================
    function buildCusVeronaArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/cus_verona/';
        const CX = -1.5, A = 28, B = 15, HL = 40, BAY = 8;
        const tmpM = new THREE.Matrix4();
        const ellPoint = th => new THREE.Vector3(CX + A * Math.cos(th), B * Math.sin(th), 0);
        const ellNormal = th => new THREE.Vector3(Math.cos(th) / A, Math.sin(th) / B, 0).normalize();
        const insetPoint = (th, d) => ellPoint(th).addScaledVector(ellNormal(th), -d);

        const woodMat = new THREE.MeshStandardMaterial({
            map: loadFileTexture(CIT_TEX + 'glulam.jpg', { wrap: true }),
            normalMap: loadFileTexture(CIT_TEX + 'glulam_n.jpg', { wrap: true }),
            normalScale: new THREE.Vector2(0.6, 0.6), color: 0xd29a5c, roughness: 0.55
        });
        const membraneMat = new THREE.MeshStandardMaterial({
            map: loadFileTexture(T + 'membrane.jpg', { wrap: true }),
            normalMap: loadFileTexture(T + 'membrane_n.jpg', { wrap: true }),
            normalScale: new THREE.Vector2(0.4, 0.4),
            color: 0xe8eaec, emissive: 0xdfe3e8, emissiveMap: loadFileTexture(T + 'membrane.jpg', { wrap: true }), emissiveIntensity: 0.22,
            roughness: 0.9, side: THREE.DoubleSide
        });
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.45, metalness: 0.5 });
        const steelMat = new THREE.MeshStandardMaterial({ color: 0xd8dde3, roughness: 0.4, metalness: 0.5 });
        const blueSteel = new THREE.MeshStandardMaterial({ color: 0x1f4fb5, roughness: 0.45, metalness: 0.4 });
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        // ---------- 1. telo della volta, gonfio tra un arco e l'altro
        const nTh = lowQ ? 36 : 64, nZ = (2 * HL / BAY) * (lowQ ? 4 : 8);
        const vPos = [], vUv = [], vIdx = [];
        for (let j = 0; j <= nZ; j++) {
            const z = -HL + 2 * HL * j / nZ;
            const sag = 0.35 * Math.sin(Math.PI * (((z + HL) / BAY) % 1));
            for (let i = 0; i <= nTh; i++) {
                const th = Math.PI * i / nTh;
                const pnt = insetPoint(th, sag * Math.min(1, Math.sin(th) * 2));
                vPos.push(pnt.x, pnt.y, z);
                vUv.push((z + HL) / 10, i / nTh * 6);
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
        targetGroup.add(new THREE.Mesh(vault, membraneMat));

        // ---------- 2. archi in legno lamellare + griglia di arcarecci
        const archPts = [];
        for (let i = 0; i <= 48; i++) archPts.push(insetPoint(Math.PI * i / 48, 0.32));
        const archGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPts), 64, 0.3, 6, false);
        const archCount = 2 * HL / BAY + 1;
        const arches = new THREE.InstancedMesh(archGeo, woodMat, archCount);
        for (let k = 0; k < archCount; k++) { tmpM.makeTranslation(0, 0, -HL + k * BAY); arches.setMatrixAt(k, tmpM); }
        arches.instanceMatrix.needsUpdate = true;
        targetGroup.add(arches);
        const purlinTh = [0.12, 0.24, 0.36, 0.5, 0.64, 0.76, 0.88];
        purlinTh.forEach(f => {
            const th = Math.PI * f, pnt = insetPoint(th, 0.36), nn = ellNormal(th);
            const purlin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 2 * HL), woodMat);
            purlin.position.set(pnt.x, pnt.y, 0);
            purlin.rotation.z = Math.atan2(nn.x, -nn.y);
            targetGroup.add(purlin);
        });
        // cavi di controvento a croce nei riquadri
        if (!lowQ) {
            const cableMat = new THREE.LineBasicMaterial({ color: 0x8a8f96 });
            const pts = [];
            for (let k = 0; k < archCount - 1; k++) {
                const z0 = -HL + k * BAY, z1 = z0 + BAY;
                for (let q = 0; q < purlinTh.length - 1; q++) {
                    const a = insetPoint(Math.PI * purlinTh[q], 0.4), b = insetPoint(Math.PI * purlinTh[q + 1], 0.4);
                    pts.push(a.x, a.y, z0, b.x, b.y, z1, b.x, b.y, z0, a.x, a.y, z1);
                }
            }
            const cg = new THREE.BufferGeometry();
            cg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
            targetGroup.add(new THREE.LineSegments(cg, cableMat));
        }

        // ---------- 3. faretti quadrati sugli arcarecci
        const lampTh = [0.24, 0.36, 0.5, 0.64, 0.76];
        const lampCount = lampTh.length * (archCount - 1);
        const lampBox = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.1, 0.55), blackMat, lampCount);
        const lampFace = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.46, 0.46).rotateX(Math.PI / 2), lightMat, lampCount);
        const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
        let li = 0;
        for (let k = 0; k < archCount - 1; k++) {
            const z = -HL + k * BAY + BAY / 2;
            lampTh.forEach(f => {
                const pnt = insetPoint(Math.PI * f, 0.62);
                tmpM.makeTranslation(pnt.x, pnt.y, z); lampBox.setMatrixAt(li, tmpM);
                tmpM.makeTranslation(pnt.x, pnt.y - 0.06, z); lampFace.setMatrixAt(li, tmpM);
                if (!lowQ) {
                    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
                    spr.scale.set(2.2, 2.2, 1);
                    spr.position.set(pnt.x, pnt.y - 0.2, z);
                    targetGroup.add(spr);
                }
                li++;
            });
        }
        lampBox.instanceMatrix.needsUpdate = true;
        lampFace.instanceMatrix.needsUpdate = true;
        targetGroup.add(lampBox, lampFace);

        // ---------- 4. condotto dell'aria in tessuto bianco (longitudinale, fuori asse)
        const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2 * HL - 2, lowQ ? 12 : 24), new THREE.MeshStandardMaterial({ color: 0xf4f5f6, roughness: 0.85, emissive: 0xe8eaee, emissiveIntensity: 0.15 }));
        duct.rotation.x = Math.PI / 2;
        const ductX = 5.5;
        duct.position.set(ductX, B * Math.sqrt(1 - ((ductX - CX) / A) ** 2) - 1.6, 0);
        targetGroup.add(duct);

        // ---------- 5. testate verticali in telo, con l'arco di bordo e i tabelloni
        const endShape = new THREE.Shape();
        endShape.moveTo(CX + A, 0);
        for (let i = 1; i <= 48; i++) { const th = Math.PI * i / 48; endShape.lineTo(CX + A * Math.cos(th), B * Math.sin(th)); }
        endShape.lineTo(CX + A, 0);
        const endGeo = new THREE.ShapeGeometry(endShape, 24);
        const endMat = membraneMat.clone();
        endMat.map = loadFileTexture(T + 'membrane.jpg', { repeat: [0.15, 0.15] });
        endMat.emissiveMap = endMat.map;
        [-1, 1].forEach(dir => {
            const e = new THREE.Mesh(endGeo, endMat);
            e.position.z = dir * HL;
            targetGroup.add(e);
        });

        // ---------- 6. pareti basse laterali in telo con montanti bianchi
        const sideWallMat = new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: 0.9, emissive: 0xdfe3e8, emissiveIntensity: 0.12, side: THREE.DoubleSide });
        [CX - A + 0.6, CX + A - 0.6].forEach(x => {
            const w = new THREE.Mesh(new THREE.PlaneGeometry(2 * HL, 3.2), sideWallMat);
            w.position.set(x, 1.6, 0);
            w.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
            targetGroup.add(w);
            for (let z = -HL; z <= HL; z += 4) {
                const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 0.12), steelMat);
                post.position.set(x + (x < 0 ? 0.08 : -0.08), 1.6, z);
                targetGroup.add(post);
            }
        });

        // ---------- 7. telaio nero delle balaustre trasparenti (corrimano, zoccolo, montanti)
        const R = cornerRadius + 0.13, hx = rinkWidth / 2 - cornerRadius, hz = rinkLength / 2 - cornerRadius;
        const perim = [];
        const addArc = (cx, cz, a0) => { for (let i = 0; i <= 10; i++) { const a = a0 + (Math.PI / 2) * i / 10; perim.push(new THREE.Vector3(cx + Math.cos(a) * R, 0, cz + Math.sin(a) * R)); } };
        addArc(hx, hz, 0); addArc(-hx, hz, Math.PI / 2); addArc(-hx, -hz, Math.PI); addArc(hx, -hz, Math.PI * 1.5);
        perim.push(perim[0].clone());
        const railCurve = y => new THREE.CatmullRomCurve3(perim.map(p0 => new THREE.Vector3(p0.x, y, p0.z)), false, 'catmullrom', 0.05);
        targetGroup.add(new THREE.Mesh(new THREE.TubeGeometry(railCurve(1.17), 240, 0.05, 6, false), blackMat));
        targetGroup.add(new THREE.Mesh(new THREE.TubeGeometry(railCurve(0.1), 240, 0.09, 4, false), blackMat));
        const kick = railCurve(0.1);
        const postGeo = new THREE.BoxGeometry(0.07, 1.12, 0.07);
        const total = kick.getLength(), nPosts = Math.round(total / 2.1);
        const posts = new THREE.InstancedMesh(postGeo, blackMat, nPosts);
        for (let i = 0; i < nPosts; i++) { const q = kick.getPointAt(i / nPosts); tmpM.makeTranslation(q.x, 0.6, q.z); posts.setMatrixAt(i, tmpM); }
        posts.instanceMatrix.needsUpdate = true;
        targetGroup.add(posts);
        targetGroup.traverse(o => { if (o.isMesh && o.material === getPolyBoardMat()) { o.castShadow = false; o.receiveShadow = false; } });

        // ---------- 8. reti alte dietro le porte con pali blu
        const netTex = loadFileTexture(CIT_TEX + 'netting.png', { repeat: [24 / 0.12, 3.6 / 0.12] });
        const netMat = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, depthWrite: false, opacity: 0.5 });
        [-1, 1].forEach(dir => {
            const net = new THREE.Mesh(new THREE.PlaneGeometry(24, 3.6), netMat);
            net.position.set(0, 3.0, dir * 36.2);
            targetGroup.add(net);
            for (let x = -12; x <= 12; x += 4) {
                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.8, 8), blueSteel);
                pole.position.set(x, 2.4, dir * 36.25);
                targetGroup.add(pole);
            }
        });

        // ---------- 9. striscioni sponsor alle pareti
        const bMats = {};
        const bMat = f => bMats[f] || (bMats[f] = (() => { const t = loadFileTexture(T + f); return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.18, roughness: 0.85, side: THREE.DoubleSide }); })());
        const wallBanner = (f, w, h, x, y, z, rotY) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bMat(f)); m.position.set(x, y, z); m.rotation.y = rotY; targetGroup.add(m); };
        // lato panchine (+x)
        ['banner_artiskate.jpg', 'banner_alitrans.jpg', 'banner_digital.jpg', 'banner_ecoway.jpg', 'banner_sandrini.jpg', 'banner_cus.jpg'].forEach((f, i) => {
            wallBanner(f, 4.0, 1.0, CX + A - 0.75, 2.2, -25 + i * 10, -Math.PI / 2);
        });
        // testate
        wallBanner('banner_cus.jpg', 5.0, 1.25, 8, 3.2, -HL + 0.1, 0);
        wallBanner('coppa_photo.jpg', 2.4, 1.6, -9, 3.4, -HL + 0.1, 0);
        wallBanner('banner_promopost.jpg', 4.0, 1.0, -12, 2.6, HL - 0.1, Math.PI);
        wallBanner('banner_avelia.jpg', 4.0, 1.0, 12, 2.6, HL - 0.1, Math.PI);
        // ZARDINI sulla balaustra davanti alle panchine
        wallBanner('banner_zardini.jpg', 3.4, 0.6, rinkWidth / 2 - 0.02, 0.6, -12.4, -Math.PI / 2);
        wallBanner('banner_zardini.jpg', 3.4, 0.6, rinkWidth / 2 - 0.02, 0.6, 12.4, -Math.PI / 2);
        // lato tribuna (-x), sopra le gradinate
        ['banner_cus.jpg', 'banner_avelia.jpg', 'banner_promopost.jpg'].forEach((f, i) => wallBanner(f, 4.0, 1.0, CX - A + 0.75, 3.5, -12 + i * 12, Math.PI / 2));

        // ---------- 10. pavimento di servizio attorno alla pista
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(2 * A, 2 * HL), new THREE.MeshStandardMaterial({ color: 0x9a9da1, roughness: 0.85 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(CX, -0.01, 0);
        targetGroup.add(apron);
    }

    registerArenaBuilder('cus_verona', buildCusVeronaArchitecture);
})();
