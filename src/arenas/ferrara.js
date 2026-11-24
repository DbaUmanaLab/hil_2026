// Palazzetto "ferrara": architettura caricata on demand da index.html (loadArenaModule).
// Script classico: usa THREE e gli helper globali definiti in index.html
// (loadFileTexture, getActiveQualityPreset, CIT_TEX, crowdMembers, mergeBeamGeometry, ...).
(function () {
    // =====================================================================
    // PATTINODROMO GIORGIO BURANI — FERRARA (casa dei Ferrara Warriors). Tensostruttura con archi
    // reticolari grigio scuro che scendono fino a terra, trave reticolare lungo i fianchi, telo
    // bianco-azzurro con i cavi di controvento incrociati, drappi bianchi appesi sotto la volta,
    // lampade a campana su lunghi cavi, testate con la fascia verde e la rete bianca, tribuna a
    // gradoni dietro la ringhiera bianca con lo striscione rosa FERRARA SPORT FESTIVAL,
    // striscioni degli sponsor e pista SportCourt azzurra a piastrelle.
    // Texture in assets/textures/ferrara/ (tools/generate_ferrara_textures.py).
    // =====================================================================
    function buildFerraraArchitecture(targetGroup) {
        const preset = getActiveQualityPreset();
        const lowQ = preset.id === 'low';
        const T = 'assets/textures/ferrara/';
        const XW = -27.5, XE = 24.5, CX = (XW + XE) / 2, A = (XE - XW) / 2;   // fianchi della tensostruttura
        const WH = 5.0, B = 8.6;                                              // altezza dei fianchi e freccia della volta
        const HL = 42, BAY = 6;
        const tmpM = new THREE.Matrix4();
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        const ellPoint = th => V(CX + A * Math.cos(th), WH + B * Math.sin(th), 0);
        const ellNormal = th => V(Math.cos(th) / A, Math.sin(th) / B, 0).normalize();
        const insetPoint = (th, d) => ellPoint(th).addScaledVector(ellNormal(th), -d);
        const vaultY = x => WH + B * Math.sqrt(Math.max(0, 1 - Math.pow((x - CX) / A, 2)));

        const steelMat = new THREE.MeshStandardMaterial({ color: 0x2e3436, roughness: 0.55, metalness: 0.45 });
        const cableMat = new THREE.MeshStandardMaterial({ color: 0x4a5254, roughness: 0.6, metalness: 0.3 });
        const whiteSteel = new THREE.MeshStandardMaterial({ color: 0xe8eaec, roughness: 0.4, metalness: 0.5 });
        const memTex = loadFileTexture(T + 'membrane.jpg', { wrap: true });
        const membraneMat = new THREE.MeshStandardMaterial({ map: memTex, color: 0xd4e6e8, emissive: 0xcfe3e5, emissiveMap: memTex, emissiveIntensity: 0.2, roughness: 0.9, side: THREE.DoubleSide });
        const wallMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'wall.jpg', { repeat: [2 * HL / 4, 1] }), roughness: 0.9, side: THREE.DoubleSide });
        const greenMat = new THREE.MeshStandardMaterial({ color: 0x1f6b3e, roughness: 0.85, side: THREE.DoubleSide });

        // ---------- 1. volta in telo, leggermente tesa verso l'interno tra un arco e l'altro
        const nTh = lowQ ? 36 : 64, nZ = (2 * HL / BAY) * (lowQ ? 3 : 6);
        const vPos = [], vUv = [], vIdx = [];
        for (let j = 0; j <= nZ; j++) {
            const z = -HL + 2 * HL * j / nZ;
            const sag = 0.35 * Math.sin(Math.PI * (((z + HL) / BAY) % 1));
            for (let i = 0; i <= nTh; i++) {
                const th = Math.PI * i / nTh;
                const pnt = insetPoint(th, sag * Math.min(1, Math.sin(th) * 2));
                vPos.push(pnt.x, pnt.y, z);
                vUv.push((z + HL) / 6, i / nTh * 5);
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

        // fianchi verticali in telo grigio chiaro (fino all'imposta della volta)
        [XW, XE].forEach(x => {
            const w = new THREE.Mesh(new THREE.PlaneGeometry(2 * HL, WH), wallMat);
            w.position.set(x, WH / 2, 0);
            w.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
            targetGroup.add(w);
        });

        // ---------- 2. archi reticolari: gambe verticali fino a terra + volta (due correnti e diagonali)
        const D = 0.75;                                       // profondità della trave reticolare
        const path = [];                                      // [punto esterno, punto interno]
        const LEG = lowQ ? 5 : 8;
        for (let i = 0; i <= LEG; i++) { const y = WH * i / LEG; path.push([V(XW + 0.2, y, 0), V(XW + 0.2 + D, y, 0)]); }
        const NSEG = lowQ ? 34 : 56;
        for (let i = 1; i < NSEG; i++) {
            const th = Math.PI * (1 - i / NSEG);
            path.push([insetPoint(th, 0.2), insetPoint(th, 0.2 + D)]);
        }
        for (let i = LEG; i >= 0; i--) { const y = WH * i / LEG; path.push([V(XE - 0.2, y, 0), V(XE - 0.2 - D, y, 0)]); }
        const archBeams = [];
        for (let i = 1; i < path.length; i++) {
            const [o0, i0] = path[i - 1], [o1, i1] = path[i];
            archBeams.push([o0, o1, 0.1], [i0, i1, 0.1], [i % 2 ? o0 : i0, i % 2 ? i1 : o1, 0.05]);
        }
        const archGeo = mergeBeamGeometry(archBeams);
        const archCount = 2 * HL / BAY + 1;
        const arches = new THREE.InstancedMesh(archGeo, steelMat, archCount);
        for (let k = 0; k < archCount; k++) { tmpM.makeTranslation(0, 0, -HL + k * BAY); arches.setMatrixAt(k, tmpM); }
        arches.instanceMatrix.needsUpdate = true;
        targetGroup.add(arches);

        // trave reticolare longitudinale all'imposta della volta, arcarecci e cavi di controvento a X
        const lon = [];
        [XW + 0.6, XE - 0.6].forEach(x => {
            const yT = WH + 0.35, yB = WH - 0.45;
            lon.push([V(x, yT, -HL), V(x, yT, HL), 0.06], [V(x, yB, -HL), V(x, yB, HL), 0.06]);
            for (let z = -HL, i = 0; z < HL - 0.01; z += 1.0, i++) lon.push([V(x, i % 2 ? yT : yB, z), V(x, i % 2 ? yB : yT, z + 1.0), 0.03]);
        });
        [0.25, 0.5, 0.75].forEach(f => {
            const p = insetPoint(Math.PI * f, 0.6);
            lon.push([V(p.x, p.y, -HL), V(p.x, p.y, HL), 0.05]);
        });
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(lon), steelMat));
        const cables = [];
        for (let k = 0; k < archCount - 1; k++) {
            const z0 = -HL + k * BAY, z1 = z0 + BAY;
            [[0.06, 0.5], [0.5, 0.94]].forEach(([fa, fb]) => {
                const a = insetPoint(Math.PI * fa, 0.15), b = insetPoint(Math.PI * fb, 0.15);
                cables.push([V(a.x, a.y, z0), V(b.x, b.y, z1), 0.012], [V(a.x, a.y, z1), V(b.x, b.y, z0), 0.012]);
            });
        }
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(cables), cableMat));

        // ---------- 3. testate: telo chiaro, fascia verde con le finestre, rete bianca dietro le porte
        const endShape = new THREE.Shape();
        endShape.moveTo(XE, 0);
        endShape.lineTo(XE, WH);
        for (let i = 1; i <= 56; i++) { const th = Math.PI * i / 56; endShape.lineTo(CX + A * Math.cos(th), WH + B * Math.sin(th)); }
        endShape.lineTo(XW, 0);
        endShape.lineTo(XE, 0);
        const endGeo = new THREE.ShapeGeometry(endShape, 28);
        const endMat = new THREE.MeshStandardMaterial({ map: loadFileTexture(T + 'membrane.jpg', { repeat: [1 / 6, 1 / 6] }), color: 0xd8e8ea, emissive: 0xcfe0e2, emissiveIntensity: 0.18, roughness: 0.9, side: THREE.DoubleSide });
        const winMat = new THREE.MeshStandardMaterial({ color: 0xcfe6ee, emissive: 0xbfdbe6, emissiveIntensity: 0.5, roughness: 0.2 });
        winMat.userData.sunWindow = true;            // finestra verso l'esterno: di giorno ci entra il sole (index.html)
        const netTex = loadFileTexture('assets/textures/kraken_camaiore/net_white.png', { repeat: [1 / 0.12, 1 / 0.12] });   // UV in metri, maglia 12 cm
        const netMat = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, depthWrite: false, opacity: 0.85 });
        [-1, 1].forEach(dir => {
            const e = new THREE.Mesh(endGeo, endMat);
            e.position.z = dir * HL;
            targetGroup.add(e);
            // fascia verde a tettoia con la fila di finestre sotto
            const band = new THREE.Mesh(new THREE.BoxGeometry(XE - XW - 2, 1.3, 0.6), greenMat);
            band.position.set(CX, 5.4, dir * (HL - 0.4));
            targetGroup.add(band);
            const win = new THREE.Mesh(new THREE.PlaneGeometry(XE - XW - 4, 1.1), winMat);
            win.position.set(CX, 4.15, dir * (HL - 0.05));
            win.rotation.y = dir > 0 ? Math.PI : 0;
            targetGroup.add(win);
            const mull = [];
            for (let x = XW + 2; x <= XE - 2 + 0.01; x += 1.6) mull.push([V(x, 3.6, dir * (HL - 0.08)), V(x, 4.7, dir * (HL - 0.08)), 0.03]);
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry(mull), steelMat));
            // rete bianca appesa dietro la balaustra di fondo
            const zN = dir * 37.4, W2 = 17.2, NY = 1.15, TOP = 4.9;
            const netGeo = new THREE.PlaneGeometry(2 * W2, TOP - NY);
            const uvA = netGeo.attributes.uv;                 // UV in metri (la texture ripete ogni 12 cm)
            for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) * 2 * W2, uvA.getY(i) * (TOP - NY));
            const net = new THREE.Mesh(netGeo, netMat);
            net.position.set(0, (NY + TOP) / 2, zN);
            targetGroup.add(net);
            const posts = [[V(-W2, TOP, zN), V(W2, TOP, zN), 0.025]];
            for (let x = -W2; x <= W2 + 0.01; x += 4.3) posts.push([V(x, 0, zN), V(x, TOP, zN), 0.05]);
            targetGroup.add(new THREE.Mesh(mergeBeamGeometry(posts), whiteSteel));
        });

        // ---------- 4. drappi bianchi appesi sotto la volta (festoni di stoffa)
        const drapeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf4f6f6, emissiveIntensity: 0.45, roughness: 0.95, side: THREE.DoubleSide, transparent: true, opacity: 0.93 });
        const drape = (x0, z0, x1, z1, width, sag) => {
            const NU = lowQ ? 18 : 36, NV = lowQ ? 4 : 8;
            const g = new THREE.PlaneGeometry(1, 1, NU, NV);
            const p = g.attributes.position;
            const P0 = V(x0, vaultY(x0) - 0.9, z0), P1 = V(x1, vaultY(x1) - 0.9, z1);
            const dir = P1.clone().sub(P0).setY(0).normalize();
            const side = V(-dir.z, 0, dir.x);
            for (let i = 0; i < p.count; i++) {
                const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5;
                const pos = P0.clone().lerp(P1, u);
                pos.y -= sag * 4 * u * (1 - u);
                pos.addScaledVector(side, (v - 0.5) * width);
                pos.y -= Math.abs(Math.sin(v * Math.PI * 3)) * 0.25 * (0.3 + 4 * u * (1 - u));   // pieghe
                p.setXYZ(i, pos.x, pos.y, pos.z);
            }
            g.computeVertexNormals();
            targetGroup.add(new THREE.Mesh(g, drapeMat));
        };
        drape(-17, 30, 14, 33, 1.6, 2.2);
        drape(-12, -2, 9, -22, 1.4, 2.6);
        drape(-6, 16, 13, 6, 1.3, 1.8);
        drape(-19, -24, -2, -34, 1.2, 1.6);

        // ---------- 5. lampade a campana su lunghi cavi
        const lampX = [CX - 11, CX - 3, CX + 5, CX + 12];
        const lampZ = [];
        for (let z = -HL + BAY / 2; z < HL; z += BAY) lampZ.push(z);
        const LY = 9.0;
        const nL = lampX.length * lampZ.length;
        const shadeGeo = new THREE.CylinderGeometry(0.07, 0.34, 0.36, 16, 1, true);
        const shade = new THREE.InstancedMesh(shadeGeo, new THREE.MeshStandardMaterial({ color: 0x8d969a, roughness: 0.35, metalness: 0.7, side: THREE.DoubleSide }), nL);
        const bulb = new THREE.InstancedMesh(new THREE.CircleGeometry(0.3, 16).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), nL);
        const cableGeo = new THREE.CylinderGeometry(0.008, 0.008, 1, 4).translate(0, 0.5, 0);
        const cab = new THREE.InstancedMesh(cableGeo, cableMat, nL);
        const glowTex = loadFileTexture(CIT_TEX + 'glow.png');
        const sc = new THREE.Vector3(), q = new THREE.Quaternion();
        let li = 0;
        lampZ.forEach((z, zi) => lampX.forEach((x, xi) => {
            const y = LY + (xi === 0 || xi === lampX.length - 1 ? -0.6 : 0);
            tmpM.makeTranslation(x, y, z); shade.setMatrixAt(li, tmpM);
            tmpM.makeTranslation(x, y - 0.17, z); bulb.setMatrixAt(li, tmpM);
            const len = Math.max(0.2, vaultY(x) - 0.3 - (y + 0.18));
            tmpM.compose(V(x, y + 0.18, z), q, sc.set(1, len, 1)); cab.setMatrixAt(li, tmpM);
            if (!lowQ && (zi + xi) % 2 === 0) {
                const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfffaf0, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
                spr.scale.set(1.8, 1.8, 1);
                spr.position.set(x, y - 0.3, z);
                targetGroup.add(spr);
            }
            li++;
        }));
        [shade, bulb, cab].forEach(m => { m.instanceMatrix.needsUpdate = true; targetGroup.add(m); });

        // ---------- 6. pavimento attorno alla pista
        const apron = new THREE.Mesh(new THREE.PlaneGeometry(XE - XW, 2 * HL), new THREE.MeshStandardMaterial({ color: 0x8f9496, roughness: 0.85 }));
        apron.rotation.x = -Math.PI / 2;
        apron.position.set(CX, -0.01, 0);
        targetGroup.add(apron);

        // ---------- 7. striscioni degli sponsor
        const bMats = {};
        const bMat = f => bMats[f] || (bMats[f] = (() => { const t = loadFileTexture(T + f); return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.14, roughness: 0.85, side: THREE.DoubleSide }); })());
        const banner = (f, w, h, x, y, z, rotY) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bMat(f));
            m.position.set(x, y, z); m.rotation.y = rotY; targetGroup.add(m);
        };
        // parete sopra la tribuna (-x): come nella foto principale
        banner('banner_estensi.jpg', 3.6, 1.8, XW + 0.06, 4.0, -14, Math.PI / 2);
        banner('banner_quadrifoglio.jpg', 3.6, 1.8, XW + 0.06, 4.0, 8, Math.PI / 2);
        banner('banner_silla.jpg', 3.6, 1.8, XW + 0.06, 4.0, 18, Math.PI / 2);
        banner('banner_uisp.jpg', 2.6, 1.0, XW + 0.06, 3.9, -24, Math.PI / 2);
        // parete dietro le panchine (+x)
        banner('banner_warriors.jpg', 4.0, 2.0, XE - 0.06, 3.6, -12, -Math.PI / 2);
        banner('banner_felsina.jpg', 3.6, 1.35, XE - 0.06, 3.6, 0, -Math.PI / 2);
        banner('banner_warriors.jpg', 4.0, 2.0, XE - 0.06, 3.6, 12, -Math.PI / 2);
        banner('banner_ama.jpg', 2.8, 1.05, XE - 0.06, 3.6, 22, -Math.PI / 2);
        // testate, sotto la fascia verde
        [-1, 1].forEach(dir => {
            const z = dir * (HL - 0.7), r = dir > 0 ? Math.PI : 0;
            banner('banner_cibix.jpg', 3.2, 1.6, -4.5, 3.0, z, r);
            banner('banner_fomir.jpg', 2.8, 1.05, 1.0, 2.6, z, r);
            banner('banner_kerakoll.jpg', 2.8, 1.05, 4.4, 2.6, z, r);
            banner(dir < 0 ? 'banner_mast.jpg' : 'banner_ama.jpg', 2.8, 1.05, 9.5, 3.0, z, r);
        });

        // ---------- 8. tribuna a gradoni (-x) dietro la ringhiera con lo striscione rosa
        const ROWS = 5, DEPTH = 0.85, RISE = 0.45, FX = -21.6, Z0 = -26, Z1 = 26, LEN = Z1 - Z0;
        const stepMat = new THREE.MeshStandardMaterial({ color: 0x9a9d9f, roughness: 0.9 });
        const seatMat = new THREE.MeshStandardMaterial({ color: 0x6d7275, roughness: 0.6 });
        for (let r = 0; r < ROWS; r++) {
            const top = RISE * (r + 1), fx = FX - r * DEPTH;
            const st = new THREE.Mesh(new THREE.BoxGeometry(DEPTH, top, LEN), stepMat);
            st.position.set(fx - DEPTH / 2, top / 2, 0);
            targetGroup.add(st);
            const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.38, LEN - 0.4), seatMat);
            seat.position.set(fx - DEPTH + 0.2, top + 0.19, 0);
            targetGroup.add(seat);
        }
        // fianchi e parapetto in alto
        const topY = RISE * ROWS, backX = FX - ROWS * DEPTH;
        const rail = [];
        [Z0, Z1].forEach(z => rail.push([V(FX, 1.1, z), V(backX, topY + 1.1, z), 0.04]));
        for (let z = Z0; z <= Z1 + 0.01; z += 2.6) rail.push([V(backX + 0.1, topY, z), V(backX + 0.1, topY + 1.0, z), 0.035]);
        rail.push([V(backX + 0.1, topY + 1.0, Z0), V(backX + 0.1, topY + 1.0, Z1), 0.035]);
        // ringhiera bianca davanti alla tribuna (corrimano, traverso e montanti)
        const RX = -21.3;
        rail.push([V(RX, 1.1, Z0), V(RX, 1.1, Z1), 0.035], [V(RX, 0.55, Z0), V(RX, 0.55, Z1), 0.025]);
        for (let z = Z0; z <= Z1 + 0.01; z += 2.0) rail.push([V(RX, 0, z), V(RX, 1.1, z), 0.03]);
        targetGroup.add(new THREE.Mesh(mergeBeamGeometry(rail), whiteSteel));
        const fest = loadFileTexture(T + 'banner_festival.jpg', { repeat: [LEN / 6, 1] });
        const festMat = new THREE.MeshStandardMaterial({ map: fest, emissive: 0xffffff, emissiveMap: fest, emissiveIntensity: 0.12, roughness: 0.8, side: THREE.DoubleSide });
        const festB = new THREE.Mesh(new THREE.PlaneGeometry(LEN, 0.75), festMat);
        festB.position.set(RX + 0.05, 0.75, 0);
        festB.rotation.y = Math.PI / 2;
        targetGroup.add(festB);

        // spettatori seduti sui gradoni, rivolti verso la pista (+x): pochi, come nelle foto
        const outfits = [0x1d3f9a, 0x111114, 0xf8fafc, 0x6b7280, 0xf08a1c, 0x1e3a8a, 0x7c2d12, 0x374151];
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
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), getRandomPhotoFaceMaterial());
            const hair = new THREE.Mesh(new THREE.SphereGeometry(0.148, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM); hair.position.x = -0.015;
            headGroup.add(head, hair); bodyPivot.add(headGroup);
            const arm = sz => { const ap = new THREE.Group(); ap.position.set(0, 0.48, sz); const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.42, 7), mat); sl.position.y = -0.21; const hd = new THREE.Mesh(new THREE.SphereGeometry(0.05, 7, 7), handM); hd.position.y = -0.44; ap.add(sl, hd); bodyPivot.add(ap); return ap; };
            const leftArmPivot = arm(-0.24), rightArmPivot = arm(0.24);
            root.position.set(x, y, z);
            root.rotation.y = Math.atan2(z, 30) * 0.3 + (Math.random() - 0.5) * 0.2;
            const childLift = maybeMakeCrowdChild(root, headGroup, true);
            targetGroup.add(root);
            crowdMembers.push({ mesh: root, bodyPivot, headGroup, leftArmPivot, rightArmPivot, baseY: y + childLift, phase: Math.random() * Math.PI * 2, standing: false });
        };
        const keep = preset.crowdKeepRatio * crowdAttendanceScale();   // pubblico in base all'importanza della partita (index.html)
        for (let r = 0; r < ROWS; r++) {
            const top = RISE * (r + 1), fx = FX - r * DEPTH;
            for (let z = Z0 + 0.6; z <= Z1 - 0.6; z += 0.72) {
                if (Math.random() < keep * (0.55 - r * 0.07)) fan(fx - DEPTH + 0.43, top, z + (Math.random() - 0.5) * 0.15);
            }
        }
    }

    registerArenaBuilder('ferrara', buildFerraraArchitecture);
})();
