// --- QUALITÀ GRAFICA ADATTIVA ---
// Dipende da: state.js (gfxQuality, renderer, scene, mainDirLight, puckGlowLight,
//              arenaCeilingLights, arenaDustPoints, matchConfig, skaters, gameState)
// e dalle funzioni: buildArenaEnvironmentMap, buildSelectedArena, rebuildMatchTeams,
//                   setControlledPlayer, placeBenchSkatersImmediate (importate da game/Arena.js ecc.)

import { QUALITY_PRESETS } from './QualityPresets.js';
export { QUALITY_PRESETS };

export const gfxQuality = {
    mode: 'auto',   // 'auto' | 'low' | 'medium' | 'high'
    current: 'high',
    deviceLabel: 'Desktop',
    gpuName: '',
    fpsFrames: 0,
    fpsTimer: 0,
    lowFpsStreak: 0,
    crowdFrameToggle: 0
};

export function getActiveQualityPreset() {
    return QUALITY_PRESETS[gfxQuality.current] || QUALITY_PRESETS.medium;
}

export function detectDeviceHardwareProfile() {
    const ua = (navigator.userAgent || '').toLowerCase();
    const isMobile = /android|iphone|ipad|ipod|mobile|tablet|silk|kindle/i.test(ua) ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && Math.min(window.innerWidth, window.innerHeight) < 900);
    const cores   = navigator.hardwareConcurrency || (isMobile ? 4 : 8);
    const ramGB   = navigator.deviceMemory        || (isMobile ? 4 : 8);
    const dpr     = window.devicePixelRatio || 1;
    const shortSidePx = Math.min(
        window.screen.width  || window.innerWidth,
        window.screen.height || window.innerHeight
    ) * dpr;

    let gpuRenderer = '';
    try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl') || probeCanvas.getContext('experimental-webgl');
        if (gl) {
            const ext = gl.getExtension('WEBGL_debug_renderer_info');
            gpuRenderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || '');
        }
    } catch (e) {}

    gfxQuality.gpuName = gpuRenderer;
    const gpuLow = gpuRenderer.toLowerCase();

    const isLowEndGPU = /swiftshader|llvmpipe|software|mali-4|mali-t|mali-g31|mali-g51|mali-g52|adreno\s*\(tm\)\s*[1-4]\d\d|adreno\s*\(tm\)\s*50[0-9]|adreno\s*\(tm\)\s*51[0-2]|adreno\s*\(tm\)\s*610|powervr\s*ge8|powervr\s*rogue\s*ge/i.test(gpuLow);
    const isHighEndMobileGPU = /apple\s*a1[4-9]|apple\s*gpu|apple\s*m[1-5]|adreno\s*\(tm\)\s*(650|660|730|740|750|830)|mali-g7[78]|mali-g71[05]|immortalis/i.test(gpuLow);

    let detected = 'high';
    if (isLowEndGPU) {
        detected = 'low';
    } else if (isMobile) {
        if (ramGB <= 3 || cores <= 4 || shortSidePx <= 760) {
            detected = 'low';
        } else if (isHighEndMobileGPU && ramGB >= 6 && cores >= 6) {
            detected = 'medium';
        } else {
            detected = 'medium';
        }
    } else {
        if (cores <= 2 || ramGB <= 2)         detected = 'low';
        else if (cores <= 4 && ramGB <= 4)     detected = 'medium';
        else                                   detected = 'high';
    }

    gfxQuality.deviceLabel = isMobile ? 'Mobile' : 'Desktop';
    gfxQuality.current = detected;
    updateGraphicsQualityUI();
    return detected;
}

export function updateGraphicsQualityUI() {
    const preset = getActiveQualityPreset();
    const splashBadge = document.getElementById('device-profile-badge');
    if (splashBadge) {
        splashBadge.textContent = `📱 ${gfxQuality.deviceLabel} • Grafica: ${gfxQuality.mode === 'auto' ? `Auto (${preset.label})` : preset.label}`;
    }
    const hudLabel = document.getElementById('gfx-quality-label');
    if (hudLabel) {
        hudLabel.textContent = gfxQuality.mode === 'auto' ? `Auto (${preset.label})` : preset.label;
    }
}

/**
 * Applica il livello di qualità grafica al renderer e alla scena Three.js.
 * @param {string} targetLevel  'low' | 'medium' | 'high'
 * @param {boolean} rebuildSceneAssets  Ricostruisce arena e skater se il livello è cambiato
 * @param {object} ctx  Contesto di gioco: { renderer, scene, mainDirLight, puckGlowLight,
 *                       arenaCeilingLights, arenaDustPoints, arenaEnvMap, matchConfig,
 *                       skaters, gameState, buildArenaEnvironmentMap, buildSelectedArena,
 *                       rebuildMatchTeams, setControlledPlayer, placeBenchSkatersImmediate }
 */
export function applyGraphicsQuality(targetLevel, rebuildSceneAssets = false, ctx = {}) {
    const prevLevel = gfxQuality.current;
    gfxQuality.current = targetLevel;
    const preset = getActiveQualityPreset();
    updateGraphicsQualityUI();

    const { renderer, scene, mainDirLight, puckGlowLight,
            arenaCeilingLights = [], arenaDustPoints,
            matchConfig, skaters = [], gameState,
            buildArenaEnvironmentMap, buildSelectedArena,
            rebuildMatchTeams, setControlledPlayer, placeBenchSkatersImmediate } = ctx;

    if (!renderer || !scene) return;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, preset.pixelRatio));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = preset.shadows;
    if (preset.shadows) {
        renderer.shadowMap.type = preset.id === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    }
    renderer.shadowMap.needsUpdate = true;
    renderer.toneMapping = preset.id === 'low' ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;

    if (mainDirLight) {
        mainDirLight.castShadow = preset.shadows;
        if (preset.shadows && mainDirLight.shadow.mapSize.width !== preset.shadowMapSize) {
            mainDirLight.shadow.mapSize.width  = preset.shadowMapSize;
            mainDirLight.shadow.mapSize.height = preset.shadowMapSize;
            if (mainDirLight.shadow.map) { mainDirLight.shadow.map.dispose(); mainDirLight.shadow.map = null; }
        }
    }
    if (preset.useEnvMap && buildArenaEnvironmentMap) {
        buildArenaEnvironmentMap();
        if (ctx.arenaEnvMap) scene.environment = ctx.arenaEnvMap;
    } else {
        scene.environment = null;
    }
    arenaCeilingLights.forEach((pt, idx) => { pt.visible = idx < preset.arenaLights; });
    if (puckGlowLight) puckGlowLight.visible = preset.puckGlow;
    if (arenaDustPoints) arenaDustPoints.visible = preset.dustCount > 0;

    if (rebuildSceneAssets && prevLevel !== targetLevel && buildSelectedArena) {
        buildSelectedArena(matchConfig.arena);
        if (skaters.length > 0) {
            const savedPositions = skaters.map(s => ({
                pos: s.mesh.position.clone(), rotY: s.rotationY,
                onIce: s.onIce, benchSlot: s.benchSlot, isHuman: s.isHuman
            }));
            rebuildMatchTeams();
            skaters.forEach((s, i) => {
                if (!savedPositions[i]) return;
                s.mesh.position.copy(savedPositions[i].pos);
                s.rotationY = savedPositions[i].rotY;
                s.mesh.rotation.y = s.rotationY;
                s.onIce = savedPositions[i].onIce;
                s.benchSlot = savedPositions[i].benchSlot;
                if (savedPositions[i].isHuman && setControlledPlayer) setControlledPlayer(s);
            });
            if (gameState === 'menu' && placeBenchSkatersImmediate) placeBenchSkatersImmediate();
        }
    }
}

export function monitorRuntimeFPS(dt, ctx = {}) {
    if (gfxQuality.mode !== 'auto' || gfxQuality.current === 'low') return;
    if (ctx.gameState !== 'playing') return;

    gfxQuality.fpsFrames++;
    gfxQuality.fpsTimer += dt;
    if (gfxQuality.fpsTimer >= 1.5) {
        const avgFps = gfxQuality.fpsFrames / gfxQuality.fpsTimer;
        gfxQuality.fpsFrames = 0;
        gfxQuality.fpsTimer  = 0;
        if (avgFps < 32) {
            gfxQuality.lowFpsStreak++;
            if (gfxQuality.lowFpsStreak >= 2) {
                gfxQuality.lowFpsStreak = 0;
                const nextDown = gfxQuality.current === 'high' ? 'medium' : 'low';
                applyGraphicsQuality(nextDown, true, ctx);
                const toast = document.getElementById('gfx-auto-toast');
                if (toast) {
                    toast.textContent = `⚡ Prestazioni ottimizzate: Grafica impostata su ${QUALITY_PRESETS[nextDown].label}`;
                    toast.classList.remove('hidden');
                    setTimeout(() => toast.classList.add('hidden'), 3500);
                }
            }
        } else {
            gfxQuality.lowFpsStreak = 0;
        }
    }
}
