// Genera src/vendor/three.min.js: Three.js (da node_modules) in un bundle IIFE che
// definisce la variabile globale THREE, come il vecchio build/three.min.js.
// Serve perché dalla r160 Three.js è distribuito solo come ES module, mentre index.html
// e gli script in src/ sono script classici che usano THREE in modo sincrono.
//
// Uso:  npm run build:three   (dopo aver cambiato la versione di "three" in package.json)
import { build } from 'esbuild';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(path.join(root, 'node_modules/three/package.json'), 'utf8'));

await build({
    stdin: { contents: "export * from 'three';", resolveDir: root },
    bundle: true,
    format: 'iife',
    globalName: 'THREE',
    minify: true,
    target: 'es2020',
    legalComments: 'none',
    banner: { js: `/* three.js ${version} - MIT License - https://threejs.org - generato da tools/build_three.mjs */` },
    outfile: path.join(root, 'src/vendor/three.min.js'),
    logLevel: 'info'
});
