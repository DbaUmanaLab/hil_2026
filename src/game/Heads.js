// =====================================================================
// TESTE MODELLATE da MakeHuman (CC0): geometrie e materiali
// Dati generati da tools/generate_heads.py (src/game/HeadModels.js + assets/heads/).
// Ogni variante (sesso, età, etnia, forma del volto) ha la sua pelle; tutte condividono
// indici e UV, quindi sopracciglia, barba e baffi sono maschere comuni (assets/heads/masks_*.png)
// tinte nello shader col colore dei capelli: nessuna texture in più per combinazione.
// Sistema di riferimento: volto verso +X, alto +Y, calotta a y = +radius (come la vecchia sfera).
// =====================================================================
(function () {
    const DATA = window.HIL_HEAD_DATA;
    if (!DATA || typeof THREE === 'undefined') return;

    function decode(b64, Type) {
        const bin = atob(b64);
        const buf = new ArrayBuffer(bin.length);
        const u8 = new Uint8Array(buf);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return new Type(buf);
    }

    const lodCache = {};
    function lodData(lod) {
        if (!lodCache[lod]) {
            const L = DATA.lods[lod];
            const uv16 = decode(L.uv, Uint16Array);
            const uv = new Float32Array(uv16.length);
            for (let i = 0; i < uv16.length; i++) uv[i] = uv16[i] / 65535;
            lodCache[lod] = { index: decode(L.index, Uint16Array), uv: new THREE.BufferAttribute(uv, 2) };
        }
        return lodCache[lod];
    }

    const geoCache = {};
    // radius: raggio della vecchia testa sferica (la calotta resta lì)
    function geometry(variant, radius, lod) {
        const v = DATA.variants[variant] ? variant : 0;
        lod = lod === 'lo' ? 'lo' : 'hi';
        const key = v + '|' + lod + '|' + Math.round(radius * 10000);
        if (geoCache[key]) return geoCache[key];
        const L = lodData(lod), V = DATA.variants[v][lod];
        const p16 = decode(V.pos, Int16Array), n8 = decode(V.nrm, Int8Array);
        const k = DATA.posRange / 32767 * radius;
        const pos = new Float32Array(p16.length), nrm = new Float32Array(n8.length);
        for (let i = 0; i < p16.length; i++) { pos[i] = p16[i] * k; nrm[i] = n8[i] / 127; }
        const g = new THREE.BufferGeometry();
        g.setIndex(new THREE.BufferAttribute(L.index, 1));
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
        g.setAttribute('uv', L.uv);
        g.computeBoundingSphere();
        g.userData.hilHead = { variant: v, radius };
        geoCache[key] = g;
        return g;
    }

    // ---------- cuffia dei capelli (segue il cranio sopra l'attaccatura; stesso sistema della testa)
    const hairCache = {};
    let hairIndex = null;
    function hairGeometry(variant, radius) {
        const v = DATA.variants[variant] ? variant : 0;
        const key = v + '|' + Math.round(radius * 10000);
        if (hairCache[key]) return hairCache[key];
        if (!hairIndex) hairIndex = new THREE.BufferAttribute(decode(DATA.hair.index, Uint16Array), 1);
        const p16 = decode(DATA.variants[v].hair, Int16Array);
        const k = DATA.posRange / 32767 * radius;
        const pos = new Float32Array(p16.length);
        for (let i = 0; i < p16.length; i++) pos[i] = p16[i] * k;
        const g = new THREE.BufferGeometry();
        g.setIndex(hairIndex);
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.computeVertexNormals();
        g.computeBoundingSphere();
        g.userData.hilHair = { variant: v, radius };
        hairCache[key] = g;
        return g;
    }

    // ---------- capelli lunghi delle varianti femminili ('bob' alla mascella, 'long' sulle spalle):
    // sipario che parte dal cranio e cade dritto dal punto più largo della testa, viso libero
    const curtainCache = {};
    let curtainIndex = null;
    function hasLongHair(variant) { return !!(DATA.variants[variant] && DATA.variants[variant].long); }
    function longHairGeometry(variant, radius, style) {
        const V = DATA.variants[variant];
        if (!V || !V.long || !V.long[style]) return null;
        const key = variant + '|' + style + '|' + Math.round(radius * 10000);
        if (curtainCache[key]) return curtainCache[key];
        if (!curtainIndex) curtainIndex = new THREE.BufferAttribute(decode(DATA.hair.curtainIndex, Uint16Array), 1);
        const p16 = decode(V.long[style], Int16Array);
        const k = DATA.hair.curtainRange / 32767 * radius;
        const pos = new Float32Array(p16.length);
        for (let i = 0; i < p16.length; i++) pos[i] = p16[i] * k;
        const g = new THREE.BufferGeometry();
        g.setIndex(curtainIndex);
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.computeVertexNormals();
        g.computeBoundingSphere();
        g.userData.hilHair = { variant, radius, style };
        curtainCache[key] = g;
        return g;
    }

    // ---------- materiali
    const texCache = {};
    function tex(path) {
        if (!texCache[path]) {
            const t = new THREE.TextureLoader().load(path);
            t.anisotropy = 4;
            texCache[path] = t;
        }
        return texCache[path];
    }

    // pesi delle maschere: A = (sopracciglia sottili, folte, barba), B = (baffi, ombra della barba)
    const FACIAL = {
        none: [0, 0, 0, 0],
        stubble: [0, 0, 0, 0.5],
        beard: [0.92, 0, 0, 0.3],
        mustache: [0, 0.95, 0, 0.18],
        full: [0.92, 0.95, 0, 0.3]
    };

    const matCache = {};
    // opts: { brows: 'f'|'m', facial: 'none'|'stubble'|'beard'|'mustache'|'full', hair: 0xRRGGBB }
    function material(variant, opts = {}) {
        const v = DATA.variants[variant] ? variant : 0;
        const brows = opts.brows || (DATA.variants[v].sex === 'f' ? 'f' : 'm');
        const facial = FACIAL[opts.facial] ? opts.facial : 'none';
        const hair = opts.hair != null ? opts.hair : 0x2a1d14;
        const key = [v, brows, facial, hair].join('|');
        if (matCache[key]) return matCache[key];
        const f = FACIAL[facial];
        const mat = new THREE.MeshStandardMaterial({ map: tex(DATA.variants[v].tex), roughness: 0.6, metalness: 0 });
        const hairCol = new THREE.Color(hair);
        // sopracciglia un filo più scure dei capelli (i biondi/grigi restano visibili)
        const browCol = hairCol.clone().multiplyScalar(0.72);
        const uniforms = {
            hilMaskA: { value: tex(DATA.masks[0]) },
            hilMaskB: { value: tex(DATA.masks[1]) },
            hilWA: { value: new THREE.Vector3(brows === 'f' ? 0.95 : 0, brows === 'f' ? 0 : 0.95, f[0]) },
            hilWB: { value: new THREE.Vector3(f[1], f[3], 0) },
            hilHair: { value: hairCol },
            hilBrow: { value: browCol }
        };
        mat.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, uniforms);
            shader.fragmentShader = shader.fragmentShader
                .replace('#include <map_pars_fragment>', `#include <map_pars_fragment>
uniform sampler2D hilMaskA;
uniform sampler2D hilMaskB;
uniform vec3 hilWA;
uniform vec3 hilWB;
uniform vec3 hilHair;
uniform vec3 hilBrow;`)
                .replace('#include <map_fragment>', `#include <map_fragment>
{
    vec3 mA = texture2D(hilMaskA, vMapUv).rgb;
    vec3 mB = texture2D(hilMaskB, vMapUv).rgb;
    float brow = clamp(mA.r * hilWA.x + mA.g * hilWA.y, 0.0, 1.0);
    float hairA = clamp(mA.b * hilWA.z + mB.r * hilWB.x, 0.0, 1.0);
    float stub = mB.g * hilWB.y;
    // barba rasata: la pelle si scurisce verso un grigio freddo, appena tinto dal colore dei peli
    diffuseColor.rgb *= mix(vec3(1.0), vec3(0.6, 0.6, 0.63) + hilHair * 0.35, stub);
    // barba e baffi: il colore dei peli con la grana della maschera e i bordi radi
    float a = smoothstep(0.08, 0.75, hairA);
    vec3 hairShade = hilHair * (0.55 + 0.7 * hairA) + diffuseColor.rgb * 0.12;
    diffuseColor.rgb = mix(diffuseColor.rgb, hairShade, a * 0.92);
    diffuseColor.rgb = mix(diffuseColor.rgb, hilBrow, brow);
}`);
        };
        mat.customProgramCacheKey = () => 'hil-head';
        mat.userData.hilHead = { variant: v, brows, facial, hair };
        matCache[key] = mat;
        return mat;
    }

    // ---------- scelta della variante
    // sex: 'm'|'f'; age: 'young' (giocatori), 'adult' (giovani e mezza età), 'any' (anche anziani);
    // u: numero in [0,1) (casuale o da hash, per scelte stabili)
    const ETH_WEIGHT = { caucasian: 6, african: 1, asian: 1 };
    function pick(sex, age, u) {
        const list = [];
        let tot = 0;
        DATA.variants.forEach((v, i) => {
            if (v.sex !== sex) return;
            if (age === 'young' && v.age !== 'young') return;
            if (age === 'adult' && v.age === 'old') return;
            const w = (ETH_WEIGHT[v.eth] || 1) * (age === 'any' && v.age === 'old' ? 0.6 : 1);
            list.push([i, w]); tot += w;
        });
        let x = (u == null ? Math.random() : u) * tot;
        for (const [i, w] of list) { if ((x -= w) < 0) return i; }
        return list.length ? list[list.length - 1][0] : 0;
    }

    function variantInfo(i) { return DATA.variants[i] || DATA.variants[0]; }
    function findVariant(id) { return Math.max(0, DATA.variants.findIndex(v => v.id === id)); }

    window.HIL_HEADS = { geometry, hairGeometry, longHairGeometry, hasLongHair, material, pick, variantInfo, findVariant, count: DATA.variants.length };
})();
