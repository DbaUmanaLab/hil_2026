// --- src/game/GoalieMask.js ---
// Maschera del portiere in stile moderno (calotta in fibra con gabbia "cat-eye" cromata):
//  - calotta in un pezzo solo: cresta centrale dalla fronte alla nuca, fronte arrotondata, guance che
//    scendono svasate lungo la mandibola, mento a punta; grande apertura del viso con bordo spesso;
//  - piatto posteriore separato con le cinghie elastiche bianche e le fibbie;
//  - gabbia in acciaio cromato: cornice, barra centrale, due grandi aperture per gli occhi e griglia sotto,
//    fissata con viti ai lati e clip sulla fronte;
//  - grafica ("decal") dipinta sulla calotta: 10 disegni nei colori della squadra (DESIGNS), scelti in modo
//    stabile dal nome del portiere, con prese d'aria e marchio sulla fronte.
// Sistema di riferimento del gruppo testa (headGroup): davanti -Z, alto +Y. Le misure riprendono la vecchia
// maschera (raggio 0,17 con scala ellittica), quindi la testa modellata ci sta dentro come prima.
// Script classico: usa THREE e, se ci sono, TEAM_DATA.rosterThemes per i colori della squadra.
(function () {
    'use strict';
    const MR = 0.17;
    const SC = new THREE.Vector3(0.94, 1.14, 1.12);
    const POS = new THREE.Vector3(0, 0.18, 0.012);
    const PI = Math.PI;
    const FRONT = PI * 1.5;                  // phi del davanti (-Z), come nella SphereGeometry
    const HALF_W = PI * 0.30;                // semiampiezza dell'apertura del viso
    const SIDE = 2.05;                       // la calotta arriva a ±2,05 rad dal davanti (dietro le orecchie)
    const BOTTOM_CHIN = PI * 0.93;

    const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const G = (x, s) => Math.exp(-(x * x) / (s * s));

    // apertura del viso: angoli arrotondati (scende ai lati in alto, sale ai lati in basso)
    const winTop = d => PI * 0.30 + PI * 0.045 * Math.pow(Math.min(1, Math.abs(d) / HALF_W), 4);
    const winBot = d => PI * 0.755 - PI * 0.06 * Math.pow(Math.min(1, Math.abs(d) / HALF_W), 4);
    // bordo inferiore: mento a punta davanti, poi risale lungo la mandibola verso le orecchie
    const thetaMax = d => { const a = Math.abs(d); return BOTTOM_CHIN - PI * 0.11 * smooth(0, 1.25, a) - PI * 0.08 * smooth(1.25, SIDE, a); };

    // raggio (in unità di MR) della calotta nella direzione (theta, d = phi - FRONT)
    function shellR(theta, d) {
        const phi = FRONT + d;
        const nx = -Math.cos(phi) * Math.sin(theta);
        let r = 1;
        r += 0.03 * G(nx, 0.09) * (1 - smooth(PI * 0.5, PI * 0.64, theta));                                 // cresta centrale
        r += 0.022 * G(theta - PI * 0.26, PI * 0.06) * G(d, 0.8);                                              // fronte sopra l'apertura
        r += 0.075 * smooth(PI * 0.55, PI * 0.8, theta) * G(Math.abs(d) - 0.95, 0.55);                         // guance svasate
        r += 0.06 * smooth(PI * 0.74, PI * 0.92, theta) * G(d, 0.42);                                            // mento a punta
        r -= 0.035 * smooth(PI * 0.62, PI * 0.8, theta) * smooth(1.3, SIDE, Math.abs(d));                       // si stringe sotto le orecchie
        return r;
    }
    function pointAt(theta, d, k, out) {
        const phi = FRONT + d, kk = k || 1, r = MR * shellR(theta, d) * kk;
        // mentoniera: sotto l'apertura la calotta scende e avanza a becco fino alla punta del mento
        const cs = smooth(PI * 0.6, PI * 0.93, theta) * G(d, 0.75);
        return (out || new THREE.Vector3()).set(
            -Math.cos(phi) * Math.sin(theta) * r * SC.x,
            Math.cos(theta) * r * SC.y - 0.035 * cs * kk,
            Math.sin(phi) * Math.sin(theta) * r * SC.z - 0.03 * cs * kk
        );
    }

    // ------------------------------------------------------------------ calotta
    const geoCache = {};
    function shellGeometry(low) {
        const key = low ? 'lo' : 'hi';
        if (geoCache[key]) return geoCache[key];
        // colonne: le linee ±HALF_W cadono su colonne della griglia (bordi dell'apertura netti)
        const nOut = low ? 8 : 14, nWin = low ? 12 : 20;
        const ds = [];
        for (let i = 0; i <= nOut; i++) ds.push(-SIDE + (SIDE - HALF_W) * i / nOut);
        for (let i = 1; i <= nWin; i++) ds.push(-HALF_W + 2 * HALF_W * i / nWin);
        for (let i = 1; i <= nOut; i++) ds.push(HALF_W + (SIDE - HALF_W) * i / nOut);
        // righe: sopra l'apertura, all'altezza dell'apertura, sotto fino al bordo inferiore
        const rA = low ? 8 : 12, rB = low ? 6 : 10, rC = low ? 6 : 10;
        const rowsTheta = d => {
            const dw = Math.max(-HALF_W, Math.min(HALF_W, d));
            const t1 = winTop(dw), t2 = winBot(dw), t3 = thetaMax(d);
            const out = [];
            for (let i = 0; i <= rA; i++) out.push(t1 * Math.pow(i / rA, 0.85));
            for (let i = 1; i <= rB; i++) out.push(t1 + (t2 - t1) * i / rB);
            for (let i = 1; i <= rC; i++) out.push(t2 + (t3 - t2) * i / rC);
            return out;
        };
        const nRows = rA + rB + rC;
        const pos = [], uv = [], index = [];
        const v = new THREE.Vector3();
        ds.forEach(d => {
            rowsTheta(d).forEach(th => {
                pointAt(Math.max(th, 1e-4), d, 1, v);
                pos.push(v.x, v.y, v.z);
                uv.push(0.5 + d / (2 * SIDE), 1 - th / PI);
            });
        });
        const W = nRows + 1;
        const inWindowCol = c => ds[c] >= -HALF_W - 1e-6 && ds[c + 1] <= HALF_W + 1e-6;
        for (let c = 0; c < ds.length - 1; c++) {
            for (let r = 0; r < nRows; r++) {
                if (inWindowCol(c) && r >= rA && r < rA + rB) continue;          // apertura del viso
                const a = c * W + r, b = (c + 1) * W + r;
                index.push(a, a + 1, b, b, a + 1, b + 1);
            }
        }
        const g = new THREE.BufferGeometry();
        g.setIndex(index);
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        g.computeVertexNormals();
        geoCache[key] = g;
        return g;
    }
    // piatto posteriore: guscio sulla nuca, un poco sotto le ali della calotta
    function backplateGeometry(low) {
        const key = 'bp' + (low ? 'lo' : 'hi');
        if (geoCache[key]) return geoCache[key];
        const nc = low ? 10 : 16, nr = low ? 6 : 10;
        const d0 = SIDE - 0.25, d1 = 2 * PI - SIDE + 0.25;
        const pos = [], uv = [], index = [];
        const v = new THREE.Vector3();
        for (let c = 0; c <= nc; c++) {
            const d = d0 + (d1 - d0) * c / nc;
            for (let r = 0; r <= nr; r++) {
                const th = PI * 0.2 + PI * 0.5 * r / nr;
                pointAt(th, d, 0.985, v);
                pos.push(v.x, v.y, v.z);
                uv.push(c / nc, 1 - r / nr);
            }
        }
        for (let c = 0; c < nc; c++) for (let r = 0; r < nr; r++) {
            const a = c * (nr + 1) + r, b = (c + 1) * (nr + 1) + r;
            index.push(a, a + 1, b, b, a + 1, b + 1);
        }
        const g = new THREE.BufferGeometry();
        g.setIndex(index);
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        g.computeVertexNormals();
        geoCache[key] = g;
        return g;
    }
    // tubo che segue una linea sulla calotta (bordi, cinghie, barre della gabbia)
    function tubeAlong(params, k, radius, mat, low, closed) {
        const pts = params.map(([th, d, kk]) => pointAt(th, d, kk != null ? kk : k));
        const curve = new THREE.CatmullRomCurve3(pts, !!closed);
        return new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, pts.length * (low ? 2 : 3)), radius, low ? 4 : 6, !!closed), mat);
    }
    const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);

    // ------------------------------------------------------------------ gabbia "cat-eye"
    const cageK = (theta, d) => {
        const dw = Math.max(-HALF_W, Math.min(HALF_W, d));
        const t1 = winTop(dw), t2 = winBot(dw);
        const tt = ((theta - (t1 + t2) / 2) / ((t2 - t1) / 2));
        return 1.012 + 0.095 * Math.max(0, 1 - (d / HALF_W) ** 2) * Math.max(0, 1 - 0.45 * tt * tt);
    };
    function cage(mat, low) {
        const grp = new THREE.Group();
        const bar = (params, r) => grp.add(tubeAlong(params.map(([th, d]) => [th, d, cageK(th, d)]), 1, r, mat, low));
        const H = d => [winTop(d), winBot(d)];
        const at = (f, d) => { const [a, b] = H(d); return a + (b - a) * f; };
        const E = HALF_W - 0.03;
        const FR = 0.005, BR = 0.0034;
        // cornice
        bar(range(-E, E, 16).map(d => [at(0.02, d), d]), FR);
        bar(range(-E, E, 16).map(d => [at(0.98, d), d]), FR);
        [-E, E].forEach(d => bar(range(0.02, 0.98, 10).map(f => [at(f, d), d]), FR));
        // barra centrale
        bar(range(0.02, 0.98, 12).map(f => [at(f, 0), 0]), BR);
        const eyeBot = 0.46;
        [-1, 1].forEach(s => {
            // occhio: dalla cornice alta vicino al centro scende, passa sotto l'occhio e risale verso il lato
            bar([[at(0.02, s * 0.1), s * 0.1], [at(0.2, s * 0.13), s * 0.13], [at(eyeBot - 0.04, s * 0.2), s * 0.2],
                [at(eyeBot, s * 0.42), s * 0.42], [at(eyeBot - 0.03, s * 0.66), s * 0.66], [at(eyeBot - 0.14, s * 0.84), s * 0.84],
                [at(0.18, s * E), s * E]], BR);
            // diagonale esterna sopra lo zigomo
            bar([[at(eyeBot - 0.02, s * 0.62), s * 0.62], [at(eyeBot + 0.12, s * 0.8), s * 0.8], [at(eyeBot + 0.22, s * E), s * E]], BR);
            // griglia sotto gli occhi: verticali
            [0.3, 0.6].forEach(fd => bar(range(eyeBot + 0.01, 0.98, 6).map(f => [at(f, s * fd * HALF_W), s * fd * HALF_W]), BR));
        });
        // griglia sotto gli occhi: orizzontali
        [0.62, 0.8].forEach(f => bar(range(-E, E, 14).map(d => [at(f, d), d]), BR));
        return grp;
    }

    // ------------------------------------------------------------------ decal (10 disegni)
    // Coordinate di disegno sul fianco: sx 0 = davanti (centro della fronte) → 1 = bordo posteriore;
    // sy 0 = sommità → 1 = bordo del mento. Si disegna un fianco e lo si specchia sull'altro.
    function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    const hexToRgb = h => { const n = typeof h === 'number' ? h : parseInt(String(h).replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const rgbStr = (c, a) => a == null ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    const lum = c => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

    const DESIGNS = [
        { id: 'flames', name: 'Fiamme' },
        { id: 'tiger', name: 'Tigre' },
        { id: 'lightning', name: 'Fulmini' },
        { id: 'speed', name: 'Strisce veloci' },
        { id: 'checker', name: 'Scacchi' },
        { id: 'shards', name: 'Schegge' },
        { id: 'wings', name: 'Ali' },
        { id: 'splatter', name: 'Schizzi' },
        { id: 'claws', name: 'Artigli' },
        { id: 'stars', name: 'Stelle' }
    ];

    // disegni: ctx, P(sx, sy) → [x, y] in pixel, k = scala in pixel, colori c1 (principale), c2 (secondario), r casuale fisso
    const PAINT = {
        flames(ctx, P, k, c) {
            // lingue di fuoco che partono dalla mandibola e corrono verso la nuca
            const tongues = [[0.34, 0.9, 0.98, 0.34, 0.07], [0.42, 0.88, 0.99, 0.5, 0.06], [0.5, 0.84, 0.96, 0.64, 0.05], [0.4, 0.78, 0.9, 0.22, 0.05]];
            const layer = (col, grow) => {
                ctx.fillStyle = col;
                tongues.forEach(([x0, y0, x1, y1, w]) => {
                    const ww = w * grow;
                    const a = P(x0, y0 + ww), b = P(x0, y0 - ww), m1 = P((x0 + x1) / 2, (y0 + y1) / 2 - ww * 1.6), m2 = P((x0 + x1) / 2 + 0.05, (y0 + y1) / 2 + ww), t = P(x1, y1);
                    ctx.beginPath(); ctx.moveTo(...a); ctx.quadraticCurveTo(...m2, ...t); ctx.quadraticCurveTo(...m1, ...b); ctx.closePath(); ctx.fill();
                });
            };
            layer(rgbStr(c.c2), 1.6); layer(rgbStr(c.c1), 1.1); layer('rgb(255,196,40)', 0.55);
        },
        tiger(ctx, P, k, c, r) {
            ctx.fillStyle = rgbStr(c.dark);
            for (let i = 0; i < 9; i++) {
                const y = 0.15 + i * 0.075 + (r() - 0.5) * 0.03, len = 0.25 + r() * 0.35, w = 0.025 + r() * 0.02;
                const a = P(1.02, y - w), b = P(1.02, y + w), t = P(1.02 - len, y + (r() - 0.5) * 0.08), m = P(1.02 - len * 0.5, y + w * 0.6 + 0.03);
                ctx.beginPath(); ctx.moveTo(...a); ctx.quadraticCurveTo(...m, ...t); ctx.lineTo(...b); ctx.closePath(); ctx.fill();
            }
            ctx.fillStyle = rgbStr(c.c1, 0.85);
            for (let i = 0; i < 4; i++) {
                const y = 0.2 + i * 0.16 + r() * 0.04, len = 0.18 + r() * 0.2, w = 0.018;
                const a = P(1.02, y - w), b = P(1.02, y + w), t = P(1.02 - len, y + 0.02);
                ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...t); ctx.lineTo(...b); ctx.closePath(); ctx.fill();
            }
        },
        lightning(ctx, P, k, c) {
            const bolt = (pts, w, col) => {
                ctx.strokeStyle = col; ctx.lineWidth = w * k; ctx.lineJoin = 'miter'; ctx.lineCap = 'round';
                ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(...P(x, y)) : ctx.moveTo(...P(x, y)))); ctx.stroke();
            };
            const b1 = [[0.5, 0.15], [0.62, 0.34], [0.56, 0.38], [0.74, 0.58], [0.66, 0.6], [0.92, 0.88]];
            const b2 = [[0.72, 0.1], [0.82, 0.26], [0.77, 0.29], [0.95, 0.46]];
            [b1, b2].forEach(b => { bolt(b, 0.06, rgbStr(c.dark)); bolt(b, 0.035, rgbStr(c.c1)); bolt(b, 0.012, 'rgb(255,240,120)'); });
        },
        speed(ctx, P, k, c) {
            // tre strisce parallele dalla fronte alla nuca
            [[0.2, c.c1], [0.27, c.c2], [0.34, c.c1]].forEach(([y, col], i) => {
                ctx.strokeStyle = rgbStr(col); ctx.lineWidth = (0.045 - i * 0.008) * k; ctx.lineCap = 'butt';
                ctx.beginPath(); ctx.moveTo(...P(0.05, y + 0.02)); ctx.bezierCurveTo(...P(0.45, y - 0.04), ...P(0.75, y + 0.12), ...P(1.03, y + 0.3)); ctx.stroke();
            });
            ctx.fillStyle = rgbStr(c.c2, 0.9);
            ctx.beginPath(); ctx.moveTo(...P(0.55, 0.92)); ctx.quadraticCurveTo(...P(0.8, 0.7), ...P(1.03, 0.62)); ctx.lineTo(...P(1.03, 0.72)); ctx.quadraticCurveTo(...P(0.85, 0.8), ...P(0.62, 0.95)); ctx.closePath(); ctx.fill();
        },
        checker(ctx, P, k, c) {
            const n = 7;
            for (let i = 0; i < n; i++) for (let j = 0; j < 9; j++) {
                if ((i + j) % 2) continue;
                const x = 0.55 + i * 0.07, y = 0.12 + j * 0.085;
                const fade = Math.min(1, (x - 0.5) * 2.2);
                const a = P(x, y), b = P(x + 0.07, y + 0.085);
                ctx.fillStyle = rgbStr(c.dark, fade);
                ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
            }
            ctx.strokeStyle = rgbStr(c.c1); ctx.lineWidth = 0.03 * k;
            ctx.beginPath(); ctx.moveTo(...P(0.5, 0.1)); ctx.lineTo(...P(0.52, 0.9)); ctx.stroke();
        },
        shards(ctx, P, k, c, r) {
            const cols = [c.c1, c.c2, c.dark, mix(c.c1, [255, 255, 255], 0.35)];
            for (let i = 0; i < 26; i++) {
                const x = 0.5 + r() * 0.52, y = 0.08 + r() * 0.85, s = 0.05 + r() * 0.09;
                ctx.fillStyle = rgbStr(cols[i % cols.length], 0.92);
                ctx.beginPath(); ctx.moveTo(...P(x, y)); ctx.lineTo(...P(x + s, y + (r() - 0.5) * s)); ctx.lineTo(...P(x + (r() - 0.3) * s, y + s)); ctx.closePath(); ctx.fill();
            }
        },
        wings(ctx, P, k, c) {
            for (let i = 0; i < 6; i++) {
                const y = 0.22 + i * 0.07, len = 0.38 - i * 0.03;
                const root = P(0.55, y), tip = P(0.55 + len, y + 0.12 + i * 0.02), ctrl = P(0.55 + len * 0.6, y - 0.06);
                ctx.fillStyle = rgbStr(i % 2 ? c.c2 : c.c1);
                ctx.strokeStyle = rgbStr(c.dark); ctx.lineWidth = 0.008 * k;
                ctx.beginPath(); ctx.moveTo(...root); ctx.quadraticCurveTo(...ctrl, ...tip); ctx.quadraticCurveTo(...P(0.55 + len * 0.5, y + 0.08), ...P(0.55, y + 0.05)); ctx.closePath(); ctx.fill(); ctx.stroke();
            }
        },
        splatter(ctx, P, k, c, r) {
            [c.c1, c.c2, c.dark].forEach((col, ci) => {
                ctx.fillStyle = rgbStr(col);
                for (let i = 0; i < 14; i++) {
                    const x = 0.5 + r() * 0.5, y = 0.1 + r() * 0.8, s = (0.012 + r() * (ci ? 0.03 : 0.05)) * k;
                    const [px, py] = P(x, y);
                    ctx.beginPath(); ctx.arc(px, py, s, 0, PI * 2); ctx.fill();
                    for (let j = 0; j < 4; j++) { const a = r() * PI * 2, dd = s * (1.4 + r()); ctx.beginPath(); ctx.arc(px + Math.cos(a) * dd, py + Math.sin(a) * dd, s * 0.25, 0, PI * 2); ctx.fill(); }
                }
            });
        },
        claws(ctx, P, k, c) {
            for (let i = 0; i < 4; i++) {
                const y = 0.28 + i * 0.1;
                const a = P(0.52, y - 0.08), m = P(0.75, y), b = P(1.0, y + 0.14);
                ctx.lineCap = 'round';
                ctx.strokeStyle = rgbStr(c.c1); ctx.lineWidth = 0.05 * k;
                ctx.beginPath(); ctx.moveTo(...a); ctx.quadraticCurveTo(...m, ...b); ctx.stroke();
                ctx.strokeStyle = rgbStr(c.dark); ctx.lineWidth = 0.028 * k;
                ctx.beginPath(); ctx.moveTo(...a); ctx.quadraticCurveTo(...m, ...b); ctx.stroke();
            }
        },
        stars(ctx, P, k, c, r) {
            const star = (x, y, s, col) => {
                const [px, py] = P(x, y); ctx.fillStyle = col; ctx.beginPath();
                for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, rr = (i % 2 ? 0.42 : 1) * s * k; ctx.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr); }
                ctx.closePath(); ctx.fill();
            };
            ctx.fillStyle = rgbStr(c.c2);
            ctx.beginPath(); ctx.moveTo(...P(0.5, 0.55)); ctx.quadraticCurveTo(...P(0.75, 0.45), ...P(1.03, 0.5)); ctx.lineTo(...P(1.03, 0.62)); ctx.quadraticCurveTo(...P(0.75, 0.57), ...P(0.5, 0.67)); ctx.closePath(); ctx.fill();
            for (let i = 0; i < 18; i++) star(0.5 + r() * 0.5, 0.1 + r() * 0.8, 0.012 + r() * 0.03, i % 4 ? 'rgb(255,255,255)' : rgbStr(c.c2));
        }
    };
    // disegni a fondo scuro (colore della squadra); gli altri su calotta bianca come nella foto
    const DARK_BASE = { stars: true, speed: false };

    const texCache = {};
    function decalTexture(design, colors, logo, low) {
        const key = [design, colors.c1.join(), colors.c2.join(), low ? 'l' : 'h', logo ? 'L' : ''].join('|');
        if (texCache[key]) return texCache[key];
        const W = low ? 512 : 1024, H = low ? 256 : 512;
        const cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        const ctx = cv.getContext('2d');
        const base = DARK_BASE[design] ? colors.c1 : [244, 245, 247];
        ctx.fillStyle = rgbStr(base);
        ctx.fillRect(0, 0, W, H);
        // da (sx, sy) del fianco a pixel: metà destra della texture, sy fino al mento
        const P = (sx, sy) => [W / 2 + sx * W / 2, sy * (BOTTOM_CHIN / PI) * H];
        const k = W / 2;
        const draw = () => { const r = rng(design.length * 7919 + 17); PAINT[design](ctx, P, k, colors, r); };
        draw();
        ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); draw(); ctx.restore();
        // cresta centrale (dalla fronte in su) nel colore della squadra
        ctx.fillStyle = rgbStr(colors.c1);
        ctx.fillRect(W / 2 - W * 0.012, 0, W * 0.024, H * 0.255);
        // prese d'aria sui fianchi e sulla sommità
        const vent = (sx, sy, rx, ry) => {
            const [x, y] = P(sx, sy);
            ctx.fillStyle = 'rgb(18,18,22)';
            ctx.beginPath(); ctx.ellipse(x, y, rx * k, ry * k, 0, 0, PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(W - x, y, rx * k, ry * k, 0, 0, PI * 2); ctx.fill();
        };
        vent(0.62, 0.38, 0.022, 0.03); vent(0.74, 0.48, 0.018, 0.026); vent(0.3, 0.12, 0.028, 0.012);
        // marchio sulla fronte, sopra l'apertura (allargato: in alto la calotta è più stretta)
        if (logo && logo.width) {
            const lw = W * 0.2, lh = lw * logo.height / logo.width;
            ctx.drawImage(logo, W / 2 - lw / 2, H * 0.262 - lh / 2, lw, lh);
        }
        const tex = new THREE.CanvasTexture(cv);
        tex.anisotropy = 4;
        texCache[key] = tex;
        return tex;
    }

    function teamColors(clubId) {
        const th = (typeof TEAM_DATA !== 'undefined' && TEAM_DATA.rosterThemes && TEAM_DATA.rosterThemes[clubId]) || { primary: '#1e3a8a', secondary: '#dc2626' };
        let c1 = hexToRgb(th.primary), c2 = hexToRgb(th.secondary);
        // su calotta bianca serve colore: un primario quasi bianco cede il posto al secondario
        if (lum(c1) > 0.85) [c1, c2] = [c2, c1];
        if (lum(c2) > 0.85 || Math.abs(lum(c1) - lum(c2)) < 0.08) c2 = mix(c1, [255, 210, 40], 0.6);
        const dark = lum(c1) < 0.25 ? [15, 15, 18] : mix(c1, [0, 0, 0], 0.65);
        return { c1, c2, dark };
    }
    function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

    // opts: { clubId, name (sceglie il disegno), design (id o indice, facoltativo), logo (canvas/immagine del marchio), low }
    function build(opts = {}) {
        const low = !!opts.low;
        let design = opts.design;
        if (typeof design === 'number') design = DESIGNS[((design % DESIGNS.length) + DESIGNS.length) % DESIGNS.length].id;
        if (!PAINT[design]) design = DESIGNS[hash(String(opts.clubId || '') + '|' + String(opts.name || '')) % DESIGNS.length].id;
        const colors = teamColors(opts.clubId);
        const tex = decalTexture(design, colors, opts.logo || null, low);

        const grp = new THREE.Group();
        grp.position.copy(POS);
        grp.userData.maskDesign = design;
        const shellMat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.3, metalness: 0.05, clearcoat: 0.85, clearcoatRoughness: 0.12 });
        const linerMat = new THREE.MeshStandardMaterial({ color: 0x17171a, roughness: 0.9, side: THREE.BackSide });
        const trimMat = new THREE.MeshStandardMaterial({ color: DARK_BASE[design] ? new THREE.Color(rgbStr(colors.c1)).getHex() : 0xeef0f3, roughness: 0.45 });
        const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.92, roughness: 0.22 });
        const strapMat = new THREE.MeshStandardMaterial({ color: 0xf1f3f5, roughness: 0.85 });

        // maschera modellata (src/game/Helmets.js, "Helmet for Puck" di K31THUZ4D, CC BY 4.0): calotta con le UV
        // "di fianco" come la nostra, quindi la stessa grafica; imbottitura interna e gabbia del modello.
        // Il modello è aperto dietro: piatto posteriore, cinghie e fibbie restano quelli procedurali.
        const H = window.HIL_HELMETS;
        if (H && H.has('goalie')) {
            const lod = low ? 'lo' : 'hi';
            grp.position.set(0, 0, 0);                    // le geometrie del modello sono già nel sistema della testa
            grp.add(new THREE.Mesh(H.geometry('goalie', 'shell', lod), shellMat));
            grp.add(new THREE.Mesh(H.geometry('goalie', 'liner', lod), new THREE.MeshStandardMaterial({ color: 0x17171a, roughness: 0.9 })));
            grp.add(new THREE.Mesh(H.geometry('goalie', 'cage', lod), chromeMat));
            const back = new THREE.Group();
            back.position.copy(POS);
            grp.add(back);
            addBackplate(back, trimMat, linerMat, strapMat, chromeMat, design, colors, low);
            return grp;
        }

        const shellGeo = shellGeometry(low);
        const shell = new THREE.Mesh(shellGeo, shellMat);
        const liner = new THREE.Mesh(shellGeo, linerMat);
        liner.scale.setScalar(0.965);
        // imbottitura interna con il bordo colorato, visibile dall'apertura
        const padRim = tubeAlong(range(-HALF_W + 0.05, HALF_W - 0.05, 14).map(d => [winTop(d) + 0.05, d]), 0.95, 0.0065,
            new THREE.MeshStandardMaterial({ color: new THREE.Color(rgbStr(colors.c2)).getHex(), roughness: 0.8 }), low);
        grp.add(shell, liner, padRim);

        // bordi spessi: apertura del viso e bordo inferiore/posteriore della calotta
        const winEdge = [];
        range(-HALF_W, HALF_W, low ? 12 : 22).forEach(d => winEdge.push([winTop(d), d]));
        range(winTop(HALF_W), winBot(HALF_W), 6).slice(1, -1).forEach(th => winEdge.push([th, HALF_W]));
        range(HALF_W, -HALF_W, low ? 12 : 22).forEach(d => winEdge.push([winBot(d), d]));
        range(winBot(HALF_W), winTop(HALF_W), 6).slice(1, -1).forEach(th => winEdge.push([th, -HALF_W]));
        grp.add(tubeAlong(winEdge, 0.985, 0.0068, trimMat, low, true));
        const outline = [];
        range(0.02, thetaMax(-SIDE), 8).forEach(th => outline.push([th, -SIDE]));
        range(-SIDE, SIDE, low ? 24 : 40).slice(1).forEach(d => outline.push([thetaMax(d), d]));
        range(thetaMax(SIDE), 0.02, 8).slice(1).forEach(th => outline.push([th, SIDE]));
        grp.add(tubeAlong(outline, 0.985, 0.0062, trimMat, low));

        addBackplate(grp, trimMat, linerMat, strapMat, chromeMat, design, colors, low);

        // gabbia cromata con viti ai lati e clip sulla fronte
        grp.add(cage(chromeMat, low));
        const screwGeo = new THREE.CylinderGeometry(0.0075, 0.0075, 0.006, low ? 8 : 12);
        const screw = (th, d) => {
            const p = pointAt(th, d, 1.01), m = new THREE.Mesh(screwGeo, chromeMat);
            m.position.copy(p);
            m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().normalize());
            grp.add(m);
        };
        [-1, 1].forEach(s => {
            screw(winBot(HALF_W) - 0.05, s * (HALF_W + 0.07));
            screw(winBot(HALF_W) - 0.12, s * (HALF_W + 0.07));
            screw(winTop(HALF_W * 0.55) - 0.03, s * HALF_W * 0.55);
        });

        return grp;
    }

    // piatto posteriore in tinta unita, cinghie elastiche e fibbie (solo sul piatto, sotto le ali della calotta)
    function addBackplate(grp, trimMat, linerMat, strapMat, chromeMat, design, colors, low) {
        const backMat = new THREE.MeshPhysicalMaterial({ color: trimMat.color.getHex(), roughness: 0.3, clearcoat: 0.85, clearcoatRoughness: 0.12 });
        grp.add(new THREE.Mesh(backplateGeometry(low), backMat));
        grp.add(new THREE.Mesh(backplateGeometry(low), linerMat));
        const b0 = SIDE - 0.12, b1 = 2 * PI - SIDE + 0.12;
        grp.add(tubeAlong(range(b0, b1, 14).map(d => [PI * 0.58, d]), 1.0, 0.0065, strapMat, low));
        grp.add(tubeAlong(range(b0, b1, 14).map(d => [PI * 0.34, d]), 1.0, 0.006, strapMat, low));
        [b0 + 0.18, b1 - 0.18].forEach(d => {
            const p = pointAt(PI * 0.58, d, 1.005);
            const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.024, 0.028), chromeMat);
            buckle.position.copy(p);
            buckle.rotation.y = Math.atan2(p.x, p.z);            // appoggiata sul piatto
            grp.add(buckle);
        });
    }

    window.HIL_GOALIE_MASK = { build, DESIGNS };
})();
