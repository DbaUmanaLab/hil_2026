// --- TEXTURE E MATERIALI PBR PROCEDURALI ---
// THREE.js deve essere disponibile globalmente (window.THREE).
// Importa le funzioni draw* dai loghi per dipingere le texture delle maglie e della pista.

import {
    drawWingedCLogo, drawDevilLogo, drawRhinoLogo, drawViperLogo
} from '../ui/Logos.js';
import { getActiveQualityPreset } from './Quality.js';

// --- NORMAL MAP DA HEIGHT MAP ---

export function createNormalMapFromHeightCanvas(heightCanvas, strength = 2.4, repeatX = 1, repeatY = 1) {
    const w = heightCanvas.width;
    const h = heightCanvas.height;
    const srcCtx = heightCanvas.getContext('2d');
    const src = srcCtx.getImageData(0, 0, w, h).data;

    const normCanvas = document.createElement('canvas');
    normCanvas.width = w;
    normCanvas.height = h;
    const dstCtx = normCanvas.getContext('2d');
    const dstImg = dstCtx.createImageData(w, h);
    const dst = dstImg.data;

    const sampleH = (x, y) => {
        const wx = (x + w) % w;
        const wy = (y + h) % h;
        return src[(wy * w + wx) * 4] / 255;
    };

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const dx = (sampleH(x + 1, y) - sampleH(x - 1, y)) * strength;
            const dy = (sampleH(x, y + 1) - sampleH(x, y - 1)) * strength;
            let nx = -dx, ny = -dy, nz = 1.0;
            const invLen = 1.0 / Math.hypot(nx, ny, nz);
            nx *= invLen; ny *= invLen; nz *= invLen;

            const idx = (y * w + x) * 4;
            dst[idx]     = Math.round((nx * 0.5 + 0.5) * 255);
            dst[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
            dst[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
            dst[idx + 3] = 255;
        }
    }
    dstCtx.putImageData(dstImg, 0, 0);
    const tex = new THREE.CanvasTexture(normCanvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = 8;
    return tex;
}

// --- MAPPE PBR PROCEDURALI (ZERO 404) ---

export function getPhotorealisticPBRMaps() {
    if (window.pbrMapsCache) return window.pbrMapsCache;
    const aniso = getActiveQualityPreset().anisotropy;

    // 1. Fibra di carbonio 3K per bastoni
    const carbonH = document.createElement('canvas');
    carbonH.width = carbonH.height = 128;
    const cCtx = carbonH.getContext('2d');
    cCtx.fillStyle = '#707070';
    cCtx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 8) {
        for (let x = 0; x < 128; x += 8) {
            const diag = ((x + y) / 8) % 2 === 0;
            cCtx.fillStyle = diag ? '#d8d8d8' : '#3a3a3a';
            cCtx.fillRect(x, y, 7, 4);
            cCtx.fillStyle = diag ? '#4a4a4a' : '#c8c8c8';
            cCtx.fillRect(x, y + 4, 7, 4);
        }
    }
    const carbonNormal = createNormalMapFromHeightCanvas(carbonH, 2.2, 4, 16);

    // 2. Legno lamellare
    const woodCanvas = document.createElement('canvas');
    woodCanvas.width = woodCanvas.height = 256;
    const wCtx = woodCanvas.getContext('2d');
    wCtx.fillStyle = '#b97a3d';
    wCtx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y++) {
        const wave = Math.sin(y * 0.14) * 14 + Math.cos(y * 0.05) * 8;
        const s = Math.round(wave);
        wCtx.fillStyle = `rgb(${178 + s},${116 + Math.round(s * 0.7)},${56 + Math.round(s * 0.4)})`;
        wCtx.fillRect(0, y, 256, 1);
    }
    wCtx.strokeStyle = 'rgba(68,32,8,0.35)';
    wCtx.lineWidth = 2;
    for (let p = 0; p < 256; p += 64) {
        wCtx.beginPath(); wCtx.moveTo(0, p); wCtx.lineTo(256, p); wCtx.stroke();
    }
    const woodDiffuse = new THREE.CanvasTexture(woodCanvas);
    woodDiffuse.wrapS = woodDiffuse.wrapT = THREE.RepeatWrapping;
    woodDiffuse.repeat.set(4, 2);
    woodDiffuse.anisotropy = aniso;

    const woodBumpCanvas = document.createElement('canvas');
    woodBumpCanvas.width = woodBumpCanvas.height = 256;
    const wbCtx = woodBumpCanvas.getContext('2d');
    wbCtx.fillStyle = '#888888';
    wbCtx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y++) {
        const g = 128 + Math.round(Math.sin(y * 0.18) * 35);
        wbCtx.fillStyle = `rgb(${g},${g},${g})`;
        wbCtx.fillRect(0, y, 256, 1);
    }
    const woodBump = new THREE.CanvasTexture(woodBumpCanvas);
    woodBump.wrapS = woodBump.wrapT = THREE.RepeatWrapping;
    woodBump.repeat.set(4, 2);
    const woodRough = woodBump;

    // 3. Muratura/gradoni spalti
    const brickCanvas = document.createElement('canvas');
    brickCanvas.width = brickCanvas.height = 256;
    const bCtx = brickCanvas.getContext('2d');
    bCtx.fillStyle = '#a0a0a0';
    bCtx.fillRect(0, 0, 256, 256);
    bCtx.fillStyle = '#505050';
    for (let row = 0; row < 8; row++) {
        const y = row * 32;
        bCtx.fillRect(0, y, 256, 3);
        const offset = (row % 2) * 32;
        for (let col = 0; col < 4; col++) bCtx.fillRect((col * 64 + offset) % 256, y, 3, 32);
    }
    const brickBump = new THREE.CanvasTexture(brickCanvas);
    brickBump.wrapS = brickBump.wrapT = THREE.RepeatWrapping;
    brickBump.repeat.set(6, 3);

    // 4. Micro-rugosità pista SportCourt
    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = roughCanvas.height = 256;
    const rCtx = roughCanvas.getContext('2d');
    rCtx.fillStyle = '#b4b4b4';
    rCtx.fillRect(0, 0, 256, 256);
    rCtx.strokeStyle = '#e2e2e2';
    rCtx.lineWidth = 2;
    for (let i = 0; i < 48; i++) {
        const sx = (i * 53) % 256, sy = (i * 97) % 256;
        rCtx.beginPath();
        rCtx.moveTo(sx, sy);
        rCtx.quadraticCurveTo(sx + 18, sy + 24, sx - 8, sy + 48);
        rCtx.stroke();
    }
    const surfaceRough = new THREE.CanvasTexture(roughCanvas);
    surfaceRough.wrapS = surfaceRough.wrapT = THREE.RepeatWrapping;
    surfaceRough.repeat.set(8, 16);

    // 5. Normal map piastrelle SportCourt
    const tileH = document.createElement('canvas');
    tileH.width = tileH.height = 256;
    const tCtx = tileH.getContext('2d');
    tCtx.fillStyle = '#dcdcdc';
    tCtx.fillRect(0, 0, 256, 256);
    tCtx.strokeStyle = '#383838';
    tCtx.lineWidth = 4;
    for (let g = 0; g <= 256; g += 64) {
        tCtx.beginPath(); tCtx.moveTo(g, 0); tCtx.lineTo(g, 256); tCtx.stroke();
        tCtx.beginPath(); tCtx.moveTo(0, g); tCtx.lineTo(256, g); tCtx.stroke();
    }
    tCtx.fillStyle = '#8e8e8e';
    for (let y = 8; y < 256; y += 16) {
        for (let x = 8; x < 256; x += 16) {
            tCtx.beginPath(); tCtx.arc(x, y, 2.3, 0, Math.PI * 2); tCtx.fill();
        }
    }
    const sportCourtNormal = createNormalMapFromHeightCanvas(tileH, 2.2, 18, 36);

    // 6. Normal map tessuto traforato maglie Air-Knit
    const fabricH = document.createElement('canvas');
    fabricH.width = fabricH.height = 128;
    const fCtx = fabricH.getContext('2d');
    fCtx.fillStyle = '#b8b8b8';
    fCtx.fillRect(0, 0, 128, 128);
    fCtx.fillStyle = '#555555';
    for (let y = 0; y < 128; y += 4) {
        for (let x = (y % 8 === 0 ? 0 : 2); x < 128; x += 4) {
            fCtx.beginPath(); fCtx.arc(x + 1, y + 1, 1.1, 0, Math.PI * 2); fCtx.fill();
        }
    }
    const jerseyNormal = createNormalMapFromHeightCanvas(fabricH, 1.8, 10, 10);

    window.pbrMapsCache = { carbonNormal, woodDiffuse, woodBump, woodRough, brickBump, surfaceRough, sportCourtNormal, jerseyNormal };
    return window.pbrMapsCache;
}

// --- ENVIRONMENT MAP ARENA ---

export function buildArenaEnvironmentMap(ctx) {
    if (ctx.arenaEnvMap || !ctx.renderer) return;
    try {
        const pmrem = new THREE.PMREMGenerator(ctx.renderer);
        pmrem.compileEquirectangularShader();
        const envScene = new THREE.Scene();
        envScene.background = new THREE.Color(0x16243d);
        envScene.add(new THREE.Mesh(
            new THREE.SphereGeometry(40, 24, 16),
            new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.BackSide })
        ));
        [-18, 0, 18].forEach(z => {
            [-10, 0, 10].forEach(x => {
                const strip = new THREE.Mesh(
                    new THREE.PlaneGeometry(4.5, 2.2),
                    new THREE.MeshBasicMaterial({ color: 0xfffbeb, side: THREE.DoubleSide })
                );
                strip.rotation.x = Math.PI / 2;
                strip.position.set(x, 22, z);
                envScene.add(strip);
            });
        });
        const rinkReflect = new THREE.Mesh(
            new THREE.PlaneGeometry(36, 72),
            new THREE.MeshBasicMaterial({ color: 0x7dd3fc })
        );
        rinkReflect.rotation.x = -Math.PI / 2;
        rinkReflect.position.y = -8;
        envScene.add(rinkReflect);

        const renderTarget = pmrem.fromScene(envScene, 0.04);
        ctx.arenaEnvMap = renderTarget.texture;
        ctx.scene.environment = ctx.arenaEnvMap;
        pmrem.dispose();
    } catch (e) {}
}

// --- MATERIALI GIOCATORI ---

export function getRealisticFaceMaterial(variant = 0) {
    const key = 'realisticFaceMat_' + variant;
    if (window[key]) return window[key];

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const skinBases = ['#edc4b0', '#e6b8a2', '#f1ccb9'];
    ctx.fillStyle = skinBases[variant % skinBases.length];
    ctx.fillRect(0, 0, 512, 512);

    const cheekGrad = ctx.createRadialGradient(256, 260, 40, 256, 260, 240);
    cheekGrad.addColorStop(0, 'rgba(225,135,115,0.16)');
    cheekGrad.addColorStop(1, 'rgba(110,68,55,0.24)');
    ctx.fillStyle = cheekGrad;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1800; i++) {
        const px = (i * 97) % 512, py = (i * 193) % 512;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(90,50,40,0.035)';
        ctx.fillRect(px, py, 2, 2);
    }
    ctx.fillStyle = '#181210';
    ctx.fillRect(0, 0, 512, 132);
    ctx.fillRect(0, 128, 132, 210);
    ctx.fillRect(380, 128, 132, 210);
    ctx.fillStyle = '#1c1411';
    ctx.fillRect(188, 204, 52, 10);
    ctx.fillRect(272, 204, 52, 10);
    [216, 296].forEach(ex => {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath(); ctx.ellipse(ex, 230, 16, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2b1910';
        ctx.beginPath(); ctx.arc(ex, 230, 7.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(ex - 2, 227, 2.2, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = 'rgba(170,110,96,0.35)';
    ctx.fillRect(250, 232, 12, 48);
    ctx.fillStyle = '#c4727c';
    ctx.beginPath(); ctx.ellipse(256, 316, 24, 8, 0, 0, Math.PI * 2); ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    window[key] = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.48, metalness: 0.02 });
    return window[key];
}

export function createBannerTexture(title, subtitle, bg, fg) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, 506, 122);
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (subtitle) {
        ctx.font = '900 34px Arial, sans-serif'; ctx.fillText(title, 256, 48);
        ctx.font = 'bold 18px Arial, sans-serif'; ctx.fillText(subtitle, 256, 90);
    } else {
        ctx.font = '900 38px Arial, sans-serif'; ctx.fillText(title, 256, 66);
    }
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 8; return tex;
}

export function getClubJerseyMaterial(clubId, kitId, jerseyNum = '21', playerName = 'LAGO', CLUB_ROSTERS) {
    const baseClubId = (CLUB_ROSTERS[clubId] && CLUB_ROSTERS[clubId].jerseyClubId) || clubId;
    const cacheKey = `jerseyMat_${baseClubId}_${kitId}_${jerseyNum}_${playerName}`;
    if (window[cacheKey]) return window[cacheKey];

    const pbr = getPhotorealisticPBRMaps();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (baseClubId === 'ref') {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = '#09090b';
        for (let x = 0; x < 512; x += 32) ctx.fillRect(x, 0, 16, 512);
        ctx.fillStyle = '#09090b'; ctx.fillRect(88, 125, 80, 44);
        ctx.fillStyle = '#ffffff'; ctx.font = '900 18px Arial, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('F.I.S.R.', 128, 152);
    } else if (baseClubId === 'cittadella') {
        const isRed = kitId === 'red';
        ctx.fillStyle = isRed ? '#dc2626' : '#ffffff'; ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = isRed ? '#172554' : '#dc2626'; ctx.fillRect(0, 0, 512, 105);
        ctx.fillStyle = isRed ? '#ffffff' : '#172554'; ctx.fillRect(0, 105, 512, 14);
        ctx.fillStyle = isRed ? '#ffffff' : '#172554'; ctx.fillRect(0, 395, 512, 12);
        ctx.fillStyle = isRed ? '#172554' : '#dc2626'; ctx.fillRect(0, 407, 512, 72);
        ctx.fillStyle = isRed ? '#ffffff' : '#172554'; ctx.fillRect(0, 479, 512, 33);
        ctx.fillStyle = '#fbbf24';
        for (let x = 16; x < 512; x += 48) {
            ctx.fillRect(x, 424, 24, 38); ctx.fillRect(x, 416, 6, 8);
            ctx.fillRect(x + 9, 416, 6, 8); ctx.fillRect(x + 18, 416, 6, 8);
        }
        drawWingedCLogo(ctx, 128, 225, 1.35);
        ctx.fillStyle = isRed ? '#ffffff' : '#1d4ed8'; ctx.font = 'bold 20px Arial, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('TORNI LUIGI', 128, 325);
        ctx.fillStyle = isRed ? '#ffffff' : '#dc2626'; ctx.font = '900 124px Arial, sans-serif';
        ctx.fillText(jerseyNum, 384, 265);
        ctx.fillStyle = isRed ? '#fde047' : '#172554'; ctx.font = 'bold 26px Arial, sans-serif';
        ctx.fillText(playerName, 384, 165);
    } else if (baseClubId === 'milano') {
        const isNavy = kitId === 'navy';
        ctx.fillStyle = isNavy ? '#0f2557' : '#ffffff'; ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = '#dc2626'; ctx.fillRect(0, 0, 512, 102);
        ctx.fillStyle = isNavy ? '#ffffff' : '#0f2557'; ctx.fillRect(0, 102, 512, 12);
        const zigColor1 = '#dc2626', zigColor2 = isNavy ? '#ffffff' : '#0f2557';
        for (let band = 0; band < 2; band++) {
            const yBase = 408 + band * 34;
            ctx.fillStyle = band === 0 ? zigColor1 : zigColor2;
            ctx.beginPath(); ctx.moveTo(0, yBase);
            for (let zx = 0; zx <= 512; zx += 64) {
                ctx.lineTo(zx + 32, yBase - 14); ctx.lineTo(zx + 64, yBase);
            }
            ctx.lineTo(512, yBase + 22);
            for (let zx = 512; zx >= 0; zx -= 64) {
                ctx.lineTo(zx - 32, yBase + 8); ctx.lineTo(zx - 64, yBase + 22);
            }
            ctx.closePath(); ctx.fill();
        }
        drawRhinoLogo(ctx, 128, 222, 1.85);
        ctx.fillStyle = isNavy ? '#ffffff' : '#0f2557'; ctx.font = '900 20px Arial, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('HOUSE', 128, 326);
        ctx.fillStyle = '#dc2626'; ctx.font = 'bold 13px Arial, sans-serif';
        ctx.fillText('@ QUANTA CLUB', 128, 348);
        ctx.fillStyle = isNavy ? '#ffffff' : '#0f2557'; ctx.font = '900 122px Arial, sans-serif';
        ctx.fillText(jerseyNum, 384, 268);
        ctx.fillStyle = '#dc2626'; ctx.font = 'bold 24px Arial, sans-serif';
        ctx.fillText(playerName, 384, 165);
    } else if (baseClubId === 'asiago') {
        const isWhite = kitId === 'white';
        ctx.fillStyle = isWhite ? '#ffffff' : '#09090b'; ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = '#f97316'; ctx.fillRect(0, 0, 512, 92);
        ctx.fillStyle = isWhite ? '#09090b' : '#ffffff'; ctx.fillRect(0, 92, 512, 20);
        ctx.fillStyle = '#f97316'; ctx.fillRect(0, 112, 512, 10);
        ctx.fillStyle = isWhite ? '#09090b' : '#ffffff'; ctx.fillRect(0, 405, 512, 18);
        ctx.fillStyle = '#f97316'; ctx.fillRect(0, 423, 512, 34);
        ctx.fillStyle = isWhite ? '#09090b' : '#ffffff'; ctx.fillRect(0, 457, 512, 18);
        drawViperLogo(ctx, 128, 248, 2.35);
        ctx.fillStyle = isWhite ? '#09090b' : '#ffffff'; ctx.font = '900 122px Arial, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(jerseyNum, 384, 268);
        ctx.fillStyle = '#f97316'; ctx.font = 'bold 24px Arial, sans-serif';
        ctx.fillText(playerName, 384, 165);
    } else {
        // vicenza (default)
        const isBlack = kitId === 'black';
        ctx.fillStyle = isBlack ? '#09090b' : '#dc2626'; ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = isBlack ? '#dc2626' : '#09090b'; ctx.fillRect(0, 0, 512, 110);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 110, 512, 12);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 415, 512, 24);
        ctx.fillStyle = isBlack ? '#dc2626' : '#09090b'; ctx.fillRect(0, 439, 512, 42);
        ctx.fillStyle = isBlack ? '#09090b' : '#dc2626'; ctx.fillRect(0, 481, 512, 31);
        drawDevilLogo(ctx, 128, 182, 1.15);
        ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#09090b'; ctx.lineWidth = 4;
        ctx.fillRect(58, 250, 140, 115); ctx.strokeRect(58, 250, 140, 115);
        ctx.fillStyle = '#dc2626'; ctx.font = '900 34px Arial, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('MC', 128, 295);
        ctx.fillStyle = '#09090b'; ctx.font = 'bold 22px Arial, sans-serif';
        ctx.fillText('CONTROL', 128, 336);
        ctx.fillStyle = '#ffffff'; ctx.font = '900 124px Arial, sans-serif';
        ctx.fillText(jerseyNum, 384, 265);
        ctx.fillStyle = '#facc15'; ctx.font = 'bold 24px Arial, sans-serif';
        ctx.fillText(playerName, 384, 165);
    }

    ctx.strokeStyle = 'rgba(15,23,42,0.25)'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(256, 115); ctx.lineTo(256, 405); ctx.stroke(); ctx.setLineDash([]);

    const tex = new THREE.CanvasTexture(canvas); tex.anisotropy = 8;
    window[cacheKey] = new THREE.MeshStandardMaterial({
        map: tex, normalMap: pbr.jerseyNormal,
        normalScale: new THREE.Vector2(0.55, 0.55), roughness: 0.62, metalness: 0.04
    });
    return window[cacheKey];
}

export function getClubSleeveMaterial(clubId, kitId, CLUB_ROSTERS) {
    const baseClubId = (CLUB_ROSTERS[clubId] && CLUB_ROSTERS[clubId].jerseyClubId) || clubId;
    const key = `sleeveMat_${baseClubId}_${kitId}`;
    if (window[key]) return window[key];
    const pbr = getPhotorealisticPBRMaps();
    const c = document.createElement('canvas'); c.width = 128; c.height = 256;
    const ctx = c.getContext('2d');

    if (baseClubId === 'ref') {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 128, 256);
        ctx.fillStyle = '#09090b';
        for (let x = 0; x < 128; x += 24) ctx.fillRect(x, 0, 12, 256);
        ctx.fillStyle = '#ea580c'; ctx.fillRect(0, 88, 128, 42);
    } else if (baseClubId === 'cittadella') {
        const isRed = kitId === 'red';
        ctx.fillStyle = isRed ? '#dc2626' : '#ffffff'; ctx.fillRect(0, 0, 128, 256);
        ctx.fillStyle = isRed ? '#172554' : '#dc2626'; ctx.fillRect(0, 0, 128, 72);
        ctx.fillStyle = isRed ? '#ffffff' : '#172554'; ctx.fillRect(0, 72, 128, 14);
        ctx.fillStyle = isRed ? '#172554' : '#dc2626'; ctx.fillRect(0, 152, 128, 28);
    } else if (baseClubId === 'milano') {
        const isNavy = kitId === 'navy';
        ctx.fillStyle = isNavy ? '#0f2557' : '#ffffff'; ctx.fillRect(0, 0, 128, 256);
        ctx.fillStyle = '#dc2626'; ctx.fillRect(0, 0, 128, 72);
        ctx.fillStyle = isNavy ? '#ffffff' : '#0f2557'; ctx.fillRect(0, 72, 128, 14);
        ctx.fillStyle = '#dc2626'; ctx.fillRect(0, 148, 128, 20);
        ctx.fillStyle = isNavy ? '#ffffff' : '#0f2557'; ctx.fillRect(0, 172, 128, 16);
    } else if (baseClubId === 'asiago') {
        const isWhite = kitId === 'white';
        ctx.fillStyle = isWhite ? '#ffffff' : '#09090b'; ctx.fillRect(0, 0, 128, 256);
        ctx.fillStyle = '#f97316'; ctx.fillRect(0, 0, 128, 68);
        ctx.fillStyle = isWhite ? '#09090b' : '#ffffff'; ctx.fillRect(0, 68, 128, 16);
        ctx.fillStyle = '#f97316'; ctx.fillRect(0, 148, 128, 22);
        ctx.fillStyle = isWhite ? '#09090b' : '#ffffff'; ctx.fillRect(0, 174, 128, 14);
    } else {
        const isBlack = kitId === 'black';
        ctx.fillStyle = isBlack ? '#09090b' : '#dc2626'; ctx.fillRect(0, 0, 128, 256);
        ctx.fillStyle = isBlack ? '#dc2626' : '#09090b'; ctx.fillRect(0, 0, 128, 74);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 74, 128, 14);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 150, 128, 26);
    }

    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 8;
    window[key] = new THREE.MeshStandardMaterial({
        map: tex, normalMap: pbr.jerseyNormal,
        normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.62
    });
    return window[key];
}

export function getStickMaterial() {
    if (window.stickMat) return window.stickMat;
    const pbr = getPhotorealisticPBRMaps();
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#141417'; ctx.fillRect(0, 0, 64, 256);
    ctx.fillStyle = '#27272a';
    for (let y = 0; y < 256; y += 8) {
        for (let x = (y % 16 === 0 ? 0 : 4); x < 64; x += 8) ctx.fillRect(x, y, 4, 4);
    }
    ctx.fillStyle = '#f97316';
    for (let y = 20; y < 220; y += 36) ctx.fillRect(0, y, 64, 12);
    const tex = new THREE.CanvasTexture(canvas);
    window.stickMat = new THREE.MeshStandardMaterial({
        map: tex, normalMap: pbr.carbonNormal,
        normalScale: new THREE.Vector2(0.85, 0.85), roughness: 0.28, metalness: 0.55
    });
    return window.stickMat;
}

export function getSockMaterial(clubId, kitId, CLUB_ROSTERS) {
    const baseClubId = (CLUB_ROSTERS[clubId] && CLUB_ROSTERS[clubId].jerseyClubId) || clubId;
    const key = `sockMat_${baseClubId}_${kitId}`;
    if (window[key]) return window[key];
    const pbr = getPhotorealisticPBRMaps();
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (baseClubId === 'cittadella') {
        ctx.fillStyle = kitId === 'red' ? '#172554' : '#dc2626'; ctx.fillRect(0, 0, 64, 128);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 44, 64, 16);
        ctx.fillStyle = kitId === 'red' ? '#dc2626' : '#172554'; ctx.fillRect(0, 66, 64, 14);
    } else if (baseClubId === 'milano') {
        ctx.fillStyle = kitId === 'navy' ? '#0f2557' : '#ffffff'; ctx.fillRect(0, 0, 64, 128);
        ctx.fillStyle = '#dc2626'; ctx.fillRect(0, 42, 64, 16);
        ctx.fillStyle = kitId === 'navy' ? '#ffffff' : '#0f2557'; ctx.fillRect(0, 62, 64, 16);
    } else if (baseClubId === 'asiago') {
        ctx.fillStyle = kitId === 'white' ? '#ffffff' : '#09090b'; ctx.fillRect(0, 0, 64, 128);
        ctx.fillStyle = '#f97316'; ctx.fillRect(0, 42, 64, 16);
        ctx.fillStyle = kitId === 'white' ? '#09090b' : '#ffffff'; ctx.fillRect(0, 62, 64, 16);
    } else {
        ctx.fillStyle = kitId === 'black' ? '#09090b' : '#dc2626'; ctx.fillRect(0, 0, 64, 128);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 44, 64, 16);
        ctx.fillStyle = kitId === 'black' ? '#dc2626' : '#09090b'; ctx.fillRect(0, 66, 64, 14);
    }
    const tex = new THREE.CanvasTexture(canvas);
    window[key] = new THREE.MeshStandardMaterial({
        map: tex, normalMap: pbr.jerseyNormal,
        normalScale: new THREE.Vector2(0.45, 0.45), roughness: 0.65
    });
    return window[key];
}
