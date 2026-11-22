// Profondità di campo per i primi piani (solo grafica alta).
// Script classico: usa THREE (src/vendor/three.min.js). Uso da index.html:
//   HIL_DOF.render(renderer, scene, camera, focusPoint)
// La scena viene disegnata in una render target con la profondità; un passaggio a schermo intero
// sfoca i pixel lontani dal piano di fuoco (quello del punto inquadrato), come l'obiettivo di una
// telecamera da vicino. La sfocatura è un disco di campioni pesati: un pixel prende colore solo
// dai vicini abbastanza sfocati da arrivare fin lì, così il soggetto a fuoco non sbava sullo sfondo.
// Tone mapping e spazio colore vengono applicati qui (la render target resta lineare).
(function () {
    let rt = null, mat = null, quad = null, passScene = null, passCam = null, failed = false;
    const size = { x: 0, y: 0 };
    const tmpV = new THREE.Vector3(), tmpDir = new THREE.Vector3();
    let amount = 0;             // 0..1: entra e esce in dissolvenza

    const VERT = `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
    const FRAG = `
        #include <packing>
        uniform sampler2D tColor;
        uniform sampler2D tDepth;
        uniform float cameraNear, cameraFar, focusDist, strength, maxR, amount;
        uniform vec2 texel;
        varying vec2 vUv;
        float viewZ(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar); }
        // raggio di sfocatura 0..1 dalla distanza dal piano di fuoco (in proporzione alla distanza)
        float coc(float z) { return clamp(abs(z - focusDist) / max(z, 0.05) * strength, 0.0, 1.0) * amount; }
        void main() {
            vec4 c0 = texture2D(tColor, vUv);
            float cc = coc(viewZ(vUv));
            vec3 acc = c0.rgb;
            float wsum = 1.0;
            if (cc > 0.02) {
                for (int i = 1; i < 36; i++) {
                    float fi = float(i);
                    float r = sqrt(fi / 36.0);
                    float a = fi * 2.39996323;
                    vec2 uv = vUv + vec2(cos(a), sin(a)) * r * maxR * texel;
                    float sc = coc(viewZ(uv));
                    float w = clamp((min(sc, cc) - r) * 6.0 + 1.0, 0.0, 1.0);
                    acc += texture2D(tColor, uv).rgb * w;
                    wsum += w;
                }
            }
            gl_FragColor = vec4(acc / wsum, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
        }`;

    function ensure(renderer) {
        renderer.getDrawingBufferSize(tmpV);
        const w = Math.max(1, Math.floor(tmpV.x)), h = Math.max(1, Math.floor(tmpV.y));
        if (!rt) {
            rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4, depthBuffer: true });
            rt.depthTexture = new THREE.DepthTexture(w, h);
            rt.depthTexture.type = THREE.UnsignedIntType;
            mat = new THREE.ShaderMaterial({
                uniforms: {
                    tColor: { value: rt.texture }, tDepth: { value: rt.depthTexture },
                    cameraNear: { value: 0.1 }, cameraFar: { value: 1000 }, focusDist: { value: 3 },
                    strength: { value: 1.4 }, maxR: { value: 6 }, amount: { value: 1 }, texel: { value: new THREE.Vector2(1 / w, 1 / h) }
                },
                vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false
            });
            quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
            quad.frustumCulled = false;
            passScene = new THREE.Scene();
            passScene.add(quad);
            passCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        }
        if (size.x !== w || size.y !== h) {
            rt.setSize(w, h);
            mat.uniforms.texel.value.set(1 / w, 1 / h);
            size.x = w; size.y = h;
        }
        // sfocatura massima: circa lo 0,6% dell'altezza dell'immagine (leggera, come un'ottica aperta)
        mat.uniforms.maxR.value = Math.max(3, h * 0.0062);
    }

    // focusPoint: Vector3 da tenere a fuoco, oppure null (niente sfocatura). Ritorna false se non ha disegnato.
    function render(renderer, scene, camera, focusPoint, dt) {
        amount = focusPoint ? Math.min(1, amount + (dt || 0.016) * 4) : 0;
        if (!focusPoint || failed || !camera.isPerspectiveCamera) return false;
        try {
            ensure(renderer);
            camera.getWorldDirection(tmpDir);
            const f = tmpV.copy(focusPoint).sub(camera.position).dot(tmpDir);
            const u = mat.uniforms;
            u.focusDist.value = Math.max(0.3, f);
            u.cameraNear.value = camera.near;
            u.cameraFar.value = camera.far;
            u.amount.value = amount;
            const prev = renderer.getRenderTarget();
            renderer.setRenderTarget(rt);
            renderer.render(scene, camera);
            renderer.setRenderTarget(prev);
            renderer.render(passScene, passCam);
            stats.frames++;
            return true;
        } catch (e) {
            failed = true;
            console.warn('Profondità di campo disattivata:', e);
            return false;
        }
    }

    const stats = { frames: 0 };
    window.HIL_DOF = { render, stats };
})();
