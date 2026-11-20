// Compatibilità con l'aspetto originale (scene tarate su Three.js r128).
// Va caricato subito dopo src/vendor/three.min.js e prima di qualsiasi materiale.
//
// Dalla r152 Three.js gestisce lo spazio colore (sRGB -> lineare -> sRGB) e dalla r155 usa
// luci fisiche (intensità senza il fattore PI implicito, attenuazione con legge 1/d^decay).
// Colori, texture e luci del gioco sono stati tarati con il vecchio comportamento, quindi:
//  1. disattiviamo la gestione del colore (colori e texture usati così come sono) e ogni
//     WebGLRenderer usa outputColorSpace = THREE.LinearSRGBColorSpace (vedi index.html);
//  2. le intensità delle luci sono moltiplicate per LEGACY_LIGHT_SCALE (= PI), che è
//     esattamente il fattore che le vecchie versioni applicavano da sole;
//  3. le PointLight usano decay = 1 e l'attenuazione lineare della r128,
//     pow(saturate(1 - d / distance), decay), ripristinata qui sotto nello shader.
// Per passare all'illuminazione fisica basta rimuovere questo file e ritarare le luci.
(function () {
    THREE.ColorManagement.enabled = false;

    window.LEGACY_LIGHT_SCALE = Math.PI;

    const physical = /float getDistanceAttenuation\([^)]*\) \{[\s\S]*?return distanceFalloff;\n\}/;
    const legacy =
        'float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {\n' +
        '\tif ( cutoffDistance > 0.0 && decayExponent > 0.0 ) {\n' +
        '\t\treturn pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );\n' +
        '\t}\n' +
        '\treturn 1.0;\n' +
        '}';
    const chunk = THREE.ShaderChunk.lights_pars_begin;
    if (physical.test(chunk)) {
        THREE.ShaderChunk.lights_pars_begin = chunk.replace(physical, legacy);
    } else {
        console.warn('three-compat: getDistanceAttenuation non trovata, attenuazione delle PointLight fisica');
    }
})();
