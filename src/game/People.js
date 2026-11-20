// --- src/game/People.js ---
// Varietà delle persone in palazzetto:
//  - pubblico: uomini e donne, capelli di colori e tagli diversi, qualche calvo, barba/baffi;
//    il 10% tifa per gli ospiti, il resto per la squadra di casa; alcuni indossano la maglia o la
//    felpa (colore + logo) della squadra, altri sventolano una bandierina con i suoi colori;
//  - giocatori: altezza e peso diversi, qualcuno con barba e/o baffi, nazionalità.
// Script classico: usa a runtime THREE, TEAM_DATA, CLUB_ROSTERS, matchConfig e
// getFaceMaterialFromFile dello script principale di index.html.
(function () {
    'use strict';

    // ---------- casualità deterministica (stesso giocatore = stesso aspetto a ogni partita)
    function hash(str) {
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
        return h >>> 0;
    }
    function rng(seed) {
        let a = seed >>> 0;
        return () => {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    function pickWeighted(list, r) {
        const tot = list.reduce((s, it) => s + it[1], 0);
        let x = r * tot;
        for (const it of list) { if ((x -= it[1]) < 0) return it[0]; }
        return list[list.length - 1][0];
    }

    // ---------- volti fotografici e loro varianti (tools/generate_face_variants.py)
    const FACE_COUNT = 3;
    const FEMALE_FACES = [1, 3];
    const FACIAL_HAIR = ['beard', 'mustache', 'full'];
    const faceFile = (n, variant) => `assets/players/player_face_${n}${variant ? '_' + variant : ''}.jpg`;
    function normFacialHair(v) {
        v = String(v || '').toLowerCase();
        if (v === 'both' || v === 'entrambi' || v === 'full') return 'full';
        if (v === 'beard' || v === 'barba') return 'beard';
        if (v === 'mustache' || v === 'moustache' || v === 'baffi') return 'mustache';
        return 'none';
    }

    // =====================================================================
    // GIOCATORI
    // =====================================================================
    function findPlayerInfo(clubId, num, name) {
        const club = window.CLUB_ROSTERS ? CLUB_ROSTERS[clubId] : (TEAM_DATA.rosters[clubId]);
        if (!club) return null;
        const all = [club.goalie, ...(club.backupGoalies || []), ...[].concat(...(club.lines || [])), ...(club.reserves || [])].filter(Boolean);
        return all.find(p => String(p.num) === String(num) && p.name === name) || all.find(p => p.name === name) || null;
    }

    // Tratti di un giocatore: i campi facoltativi di teams.json (nat, gender, height, weight, facialHair)
    // hanno la precedenza; quelli mancanti sono generati in modo stabile dal nome.
    const isFemale = g => /^(f|female|donna|femmina)$/i.test(String(g || ''));
    function playerTraits(clubId, info, isGoalie) {
        info = info || {};
        const r = rng(hash(`${clubId}|${info.num || ''}|${info.name || ''}|${info.first || ''}`));
        const country = (TEAM_DATA.countries && TEAM_DATA.countries[clubId]) || 'IT';
        const female = isFemale(info.gender);
        const height = +info.height || Math.round(female
            ? 156 + (r() + r() + r()) / 3 * 22 + (isGoalie ? 2 : 0)                                         // 156–178 cm
            : 167 + (r() + r() + r()) / 3 * 27 + (isGoalie ? 2 : 0));                                        // 167–196 cm, media ~181
        const bmi = (female ? 20 : 21.5) + (r() + r()) / 2 * 5.5;
        const weight = +info.weight || Math.round(bmi * Math.pow(height / 100, 2));
        const fr = r();
        const facialHair = female ? 'none' : info.facialHair != null ? normFacialHair(info.facialHair)
            : (fr < 0.06 ? 'beard' : fr < 0.11 ? 'mustache' : fr < 0.17 ? 'full' : 'none');               // pochi: ~17%
        const fi = r();
        const face = female ? FEMALE_FACES[Math.floor(fi * FEMALE_FACES.length)] : 1 + Math.floor(fi * FACE_COUNT);
        return { nat: String(info.nat || country).toUpperCase(), female, height, weight, facialHair, face };
    }

    function traitsOf(clubId, num, name, isGoalie) {
        return playerTraits(clubId, findPlayerInfo(clubId, num, name), isGoalie);
    }

    // Applica altezza, corporatura e volto al modello creato da createSkater()
    function applySkaterLook(sk) {
        if (!sk || sk.isRef || !sk.mesh) return;
        const t = traitsOf(sk.clubId, sk.jerseyNum, sk.playerName, sk.isGoalie);
        sk.traits = t;
        sk.nationality = t.nat;
        // altezza: tutto il modello in scala (piedi a terra, stecca compresa)
        const h = clamp(t.height / 181, 0.86, 1.1);
        sk.mesh.scale.setScalar(h);
        // peso: busto, braghe e cosce più o meno larghi a parità di altezza
        const bmi = t.weight / Math.pow(t.height / 100, 2);
        const w = clamp(Math.sqrt(bmi / 24), 0.88, 1.15);
        const wl = 1 + (w - 1) * 0.7;
        if (sk.torsoMesh) sk.torsoMesh.scale.set(w, 1, 1 + (w - 1) * 0.85);
        if (sk.shortsMesh) sk.shortsMesh.scale.set(w, 1, w);
        [sk.leftLegPivot, sk.rightLegPivot].forEach(lp => { if (lp && lp.children[0]) lp.children[0].scale.set(wl, 1, wl); });
        [sk.leftArmPivot, sk.rightArmPivot].forEach(ap => {
            if (!ap) return;
            if (ap.userData.baseX == null) ap.userData.baseX = ap.position.x;
            ap.position.x = ap.userData.baseX * (1 + (w - 1) * 0.9);
        });
        // volto (il portiere ha la maschera: niente barba)
        if (sk.headMesh && typeof getFaceMaterialFromFile === 'function') {
            const variant = t.female ? 'female' : (sk.isGoalie || t.facialHair === 'none' ? '' : t.facialHair);
            sk.headMesh.material = getFaceMaterialFromFile(faceFile(t.face, variant));
        }
    }

    // =====================================================================
    // PUBBLICO
    // =====================================================================
    const GUEST_FAN_RATIO = 0.1;
    const FEMALE_RATIO = 0.42;
    const HAIR_COLORS = [
        [0x15100d, 20], [0x2a1d14, 30], [0x4a3020, 18], [0x7a5532, 10],
        [0xc9a464, 9], [0x8e3b1c, 5], [0x8d8d8d, 6], [0xd8d6d0, 2]
    ];
    const HAIR_COLORS_YOUNG = HAIR_COLORS.filter(c => c[0] !== 0x8d8d8d && c[0] !== 0xd8d6d0);

    const matCache = {};
    function colorMat(hex, roughness = 0.8, side) {
        const key = hex + '|' + roughness + '|' + (side || 0);
        if (!matCache[key]) matCache[key] = new THREE.MeshStandardMaterial({ color: hex, roughness, side: side || THREE.FrontSide });
        return matCache[key];
    }
    const geoCache = {};
    function geo(key, make) { return geoCache[key] || (geoCache[key] = make()); }

    // ---------- materiali dei tifosi di una squadra (maglia, felpa, bandierina), in cache per club
    const gearCache = {};
    const hexStr = v => (typeof v === 'number' ? '#' + v.toString(16).padStart(6, '0') : v);
    function lum(hex) {
        const n = parseInt(String(hex).replace('#', ''), 16);
        return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    }
    function logoImage(clubId) {
        const file = TEAM_DATA.logos && TEAM_DATA.logos[clubId];
        if (!file) return null;
        const img = new Image();
        img.src = 'assets/logos/' + file;
        return img;
    }
    // canvas -> texture; il logo viene disegnato appena l'immagine è pronta
    function canvasTexture(w, h, drawBase, logo, logoBoxes) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        drawBase(ctx, w, h);
        const tex = new THREE.CanvasTexture(c);
        tex.anisotropy = 4;
        const drawLogo = () => {
            logoBoxes.forEach(([cx, cy, size]) => {
                const k = Math.min(size / logo.naturalWidth, size / logo.naturalHeight);
                const lw = logo.naturalWidth * k, lh = logo.naturalHeight * k;
                ctx.drawImage(logo, cx - lw / 2, cy - lh / 2, lw, lh);
            });
            tex.needsUpdate = true;
        };
        if (logo && logoBoxes && logoBoxes.length) {
            if (logo.complete && logo.naturalWidth) drawLogo();
            else logo.addEventListener('load', drawLogo, { once: true });
        }
        return tex;
    }

    function fanGear(clubId) {
        if (gearCache[clubId]) return gearCache[clubId];
        const theme = (TEAM_DATA.rosterThemes && TEAM_DATA.rosterThemes[clubId]) || { primary: '#1e293b', secondary: '#f8fafc' };
        const club = (window.CLUB_ROSTERS && CLUB_ROSTERS[clubId]) || TEAM_DATA.rosters[clubId] || {};
        let primary = hexStr(theme.primary), secondary = hexStr(theme.secondary);
        // se i due colori sono quasi uguali il secondo diventa bianco o nero
        if (Math.abs(lum(primary) - lum(secondary)) < 0.18) secondary = lum(primary) > 0.5 ? '#111111' : '#ffffff';
        const ink = lum(primary) > 0.55 ? '#111111' : '#ffffff';
        const logo = logoImage(clubId);
        // Sul cilindro del busto u = 0.25 è il davanti (+X locale), u = 0.75 la schiena.
        const nums = [];
        ((club.lines && club.lines[0]) || []).forEach(p => p && p.num && nums.push(String(p.num)));
        if (!nums.length) nums.push('10');
        const jerseys = nums.slice(0, 4).map(num => new THREE.MeshStandardMaterial({
            roughness: 0.62,
            map: canvasTexture(512, 256, (ctx, W, H) => {
                ctx.fillStyle = primary; ctx.fillRect(0, 0, W, H);
                ctx.fillStyle = secondary; ctx.fillRect(0, 0, W, 34);             // spalle
                ctx.fillRect(0, 196, W, 14); ctx.fillRect(0, 220, W, 8);          // righe in fondo
                ctx.font = '900 112px Arial, sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.lineWidth = 8; ctx.strokeStyle = ink === '#ffffff' ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.7)';
                ctx.strokeText(num, W * 0.75, 118);
                ctx.fillStyle = secondary; ctx.fillText(num, W * 0.75, 118);       // numero sulla schiena
            }, logo, [[128, 110, 84]])
        }));
        const hoodies = [primary, secondary].map(col => {
            const dark = lum(col) < 0.5;
            return {
                body: new THREE.MeshStandardMaterial({
                    roughness: 0.88,
                    map: canvasTexture(512, 256, (ctx, W, H) => {
                        ctx.fillStyle = col; ctx.fillRect(0, 0, W, H);
                        ctx.fillStyle = dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.12)';
                        ctx.fillRect(58, 168, 140, 58);                                // tascone
                        ctx.fillStyle = dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.16)';
                        ctx.fillRect(0, 232, W, 24);                                   // polsino in fondo
                    }, logo, [[128, 96, 120]])
                }),
                plain: colorMat(parseInt(col.slice(1), 16), 0.88),
                string: colorMat(dark ? 0xf1f5f9 : 0x1f2937, 0.7)
            };
        });
        const flagMat = new THREE.MeshStandardMaterial({
            roughness: 0.85, side: THREE.DoubleSide,
            map: canvasTexture(256, 160, (ctx, W, H) => {
                ctx.fillStyle = primary; ctx.fillRect(0, 0, W, H / 2);
                ctx.fillStyle = secondary; ctx.fillRect(0, H / 2, W, H / 2);
            }, logo, [[128, 80, 112]])
        });
        gearCache[clubId] = { primary, secondary, jerseys, jerseySleeve: colorMat(parseInt(primary.slice(1), 16), 0.62), hoodies, flagMat };
        return gearCache[clubId];
    }

    // ---------- capelli
    function addLongHair(headGroup, hairMat, style, r) {
        const R = 0.15;
        // fronte libera: davanti = +X (θ = π/2 sul cilindro)
        const gap = 0.95, start = Math.PI / 2 + gap, len = Math.PI * 2 - gap * 2;
        if (style === 'ponytail') {
            const tail = new THREE.Mesh(geo('pony', () => new THREE.SphereGeometry(0.07, 10, 8)), hairMat);
            tail.scale.set(0.75, 1.9, 0.75);
            tail.position.set(-0.17, -0.04, 0);
            tail.rotation.z = -0.35;
            const tie = new THREE.Mesh(geo('ponytie', () => new THREE.SphereGeometry(0.035, 8, 6)), hairMat);
            tie.position.set(-0.145, 0.06, 0);
            headGroup.add(tail, tie);
            return;
        }
        const long = style === 'long';
        const h = long ? 0.34 + r * 0.08 : 0.2;
        const key = 'hair_' + style + '_' + Math.round(h * 100);
        const g = geo(key, () => new THREE.CylinderGeometry(R, R + (long ? 0.03 : 0.012), h, 14, 1, true, start, len));
        const m = new THREE.Mesh(g, colorMat(hairMat.color.getHex(), 0.8, THREE.DoubleSide));
        m.position.set(-0.012, 0.03 - h / 2, 0);
        headGroup.add(m);
    }

    function styleHair(head, hair, headGroup, female, adult, r) {
        const palette = adult ? HAIR_COLORS : HAIR_COLORS_YOUNG;
        let color = pickWeighted(female ? palette.filter(c => c[0] !== 0xd8d6d0) : palette, r());
        const hairMat = colorMat(color, 0.8);
        if (!hair) return;
        if (!female && adult && r() < 0.08) {
            // calvo: niente calotta; a volte resta la corona di capelli su nuca e tempie
            hair.visible = false;
            if (r() < 0.6) {
                const fringe = new THREE.Mesh(geo('fringe', () => new THREE.SphereGeometry(0.149, 14, 5, -1.9, 3.8, Math.PI * 0.44, Math.PI * 0.17)),
                    colorMat(r() < 0.5 ? 0x8d8d8d : color, 0.85));
                headGroup.add(fringe);
            }
            return;
        }
        hair.material = hairMat;
        if (female) addLongHair(headGroup, hairMat, pickWeighted([['long', 50], ['ponytail', 25], ['bob', 25]], r()), r());
    }

    // ---------- abbigliamento
    function dressFan(bodyPivot, torso, arms, clubId, kind, r) {
        const gear = fanGear(clubId);
        if (kind === 'jersey') {
            torso.material = gear.jerseys[Math.floor(r() * gear.jerseys.length)];
            arms.forEach(a => { const sl = a.children.find(c => c.isMesh); if (sl) sl.material = gear.jerseySleeve; });
        } else if (kind === 'hoodie') {
            const hd = gear.hoodies[r() < 0.72 ? 0 : 1];
            torso.material = hd.body;
            arms.forEach(a => { const sl = a.children.find(c => c.isMesh); if (sl) sl.material = hd.plain; });
            // cappuccio sulla schiena e cordini sul petto
            const hood = new THREE.Mesh(geo('hood', () => new THREE.SphereGeometry(0.12, 12, 8)), hd.plain);
            hood.scale.set(0.62, 0.55, 1.2);
            hood.position.set(-0.13, 0.55, 0);
            bodyPivot.add(hood);
            [-0.045, 0.045].forEach(z => {
                const s = new THREE.Mesh(geo('cord', () => new THREE.CylinderGeometry(0.006, 0.006, 0.14, 5)), hd.string);
                s.position.set(0.2, 0.45, z);
                bodyPivot.add(s);
            });
        }
    }

    function addFlag(arm, clubId) {
        const gear = fanGear(clubId);
        const pivot = new THREE.Group();
        pivot.position.set(0, -0.44, 0);                       // nella mano
        const stick = new THREE.Mesh(geo('flagstick', () => new THREE.CylinderGeometry(0.008, 0.008, 0.62, 5)), colorMat(0x3f3a35, 0.6));
        stick.position.y = 0.22;
        const cloth = new THREE.Mesh(geo('flagcloth', () => new THREE.PlaneGeometry(0.36, 0.23, 4, 1)), gear.flagMat);
        cloth.rotation.y = Math.PI / 2;                        // rivolta verso la pista (+X locale)
        cloth.position.set(0, 0.41, 0.185);
        pivot.add(stick, cloth);
        pivot.userData.cloth = cloth;
        arm.add(pivot);
        return pivot;
    }

    // Chiamata per ogni tifoso subito dopo maybeMakeCrowdChild(): headGroup è figlio di bodyPivot,
    // la testa è il primo figlio di headGroup e la calotta dei capelli il secondo; il busto è il primo
    // mesh di bodyPivot e le braccia sono i gruppi di bodyPivot (quello con z > 0 è il destro).
    function decorateCrowdMember(root, headGroup, isChild) {
        const bodyPivot = headGroup && headGroup.parent;
        if (!bodyPivot || typeof matchConfig === 'undefined') return;
        const r = Math.random;
        const head = headGroup.children[0], hair = headGroup.children[1];
        const torso = bodyPivot.children.find(c => c.isMesh);
        const arms = bodyPivot.children.filter(c => c.isGroup && c !== headGroup);
        const rightArm = arms.find(a => a.position.z > 0);
        const adult = !isChild;
        const female = r() < FEMALE_RATIO;
        root.userData.female = female;

        // volto
        if (head && typeof getFaceMaterialFromFile === 'function') {
            let file;
            if (female) file = faceFile(FEMALE_FACES[Math.floor(r() * FEMALE_FACES.length)], 'female');
            else {
                const n = 1 + Math.floor(r() * FACE_COUNT);
                file = faceFile(n, adult && r() < 0.22 ? FACIAL_HAIR[Math.floor(r() * FACIAL_HAIR.length)] : '');
            }
            head.material = getFaceMaterialFromFile(file);
        }
        styleHair(head, hair, headGroup, female, adult, r);

        // corporatura: le donne un filo più minute
        if (female && torso) {
            torso.scale.set(0.9, 0.97, 0.92);
            arms.forEach(a => { a.position.z *= 0.92; });
        }

        // tifo: 10% ospiti, il resto casa
        const guest = r() < GUEST_FAN_RATIO;
        const clubId = guest ? matchConfig.guestClub : matchConfig.homeClub;
        if (!clubId || !TEAM_DATA.rosterThemes[clubId]) return;
        root.userData.fanOf = guest ? 'guest' : 'home';
        const gearChance = guest ? 0.75 : 0.42;   // gli ospiti in trasferta si fanno riconoscere
        const g = r();
        if (torso) {
            if (g < gearChance * 0.5) dressFan(bodyPivot, torso, arms, clubId, 'jersey', r);
            else if (g < gearChance) dressFan(bodyPivot, torso, arms, clubId, 'hoodie', r);
        }
        if (rightArm && r() < (guest ? 0.3 : 0.15)) root.userData.flagPivot = addFlag(rightArm, clubId);
    }

    // Animazione della bandierina: il braccio la tiene alta e l'asta resta quasi verticale
    function updateCrowdFlag(fan, time, cheering) {
        const fp = fan.mesh.userData.flagPivot;
        if (!fp || fan.isTimekeeper) return;
        const arm = fan.rightArmPivot;
        if (!cheering) {
            arm.rotation.z = 0.95 + Math.sin(time * 2.1 + fan.phase) * 0.18;
            arm.rotation.x = -0.15;
        }
        const sway = Math.sin(time * (cheering ? 9 : 2.4) + fan.phase * 1.7);
        fp.rotation.z = -arm.rotation.z + sway * (cheering ? 0.5 : 0.18);
        fp.userData.cloth.rotation.x = sway * 0.25;
    }

    window.HIL_PEOPLE = { playerTraits, traitsOf, findPlayerInfo, applySkaterLook, decorateCrowdMember, updateCrowdFlag };
})();
