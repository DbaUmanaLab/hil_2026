// --- src/game/Arena.js ---
// Costruisce l'arena 3D selezionata (pista, balaustre, architettura, folla, luci dinamiche,
// porte, tabellone, disco).
// Tutte le funzioni accettano un oggetto contesto `gs` che espone variabili di stato
// e dipendenze (scene, THREE, preset, PBR maps, logo draw functions…).
//
// Le funzioni buildPalaHockeyCittadellaArchitecture, buildPalaFerrarinArchitecture,
// buildQuantaClubArchitecture, buildArenaViaCinqueArchitecture, buildTimekeepersTable,
// buildCittadellaWoodenBar, buildArenaCrowd, buildMilanoCurva rimangono nel file originale
// index.html per il momento — questo modulo le riesporta come facade una volta migrate.
//
// NOTA: in questa prima migrazione il corpo delle funzioni build* complesse
// rimane in index.html (accessibile tramite window.gameAPI). Questo file
// dichiara le interfacce pubbliche e delega a window.gameAPI per retrocompatibilità.

export function buildSelectedArena(arenaId, gs) {
    // Delega all'implementazione in-page finché non viene migrata
    if (window.gameAPI) return window.gameAPI.buildSelectedArena(arenaId);
}

export function createGoalsAndScoreboards(gs) {
    if (window.gameAPI) return window.gameAPI.createGoalsAndScoreboards();
}

export function createPuck(gs) {
    if (window.gameAPI) return window.gameAPI.createPuck();
}

export function createDynamicArenaLights(gs) {
    if (window.gameAPI) return window.gameAPI.createDynamicArenaLights();
}

export function updateScoreboardVisuals(gs) {
    if (window.gameAPI) return window.gameAPI.updateScoreboardVisuals();
}

export function updateDynamicArenaLights(dt, gs) {
    if (window.gameAPI) return window.gameAPI.updateDynamicArenaLights(dt);
}

export function updateCrowd(dt, gs) {
    if (window.gameAPI) return window.gameAPI.updateCrowd(dt);
}

export function spawnSparkParticles(pos, colorHex, count, speedScale, isConfetti, gs) {
    if (window.gameAPI) return window.gameAPI.spawnSparkParticles(pos, colorHex, count, speedScale, isConfetti);
}

export function spawnGoalCelebrationBurst(scoringTeam, gs) {
    if (window.gameAPI) return window.gameAPI.spawnGoalCelebrationBurst(scoringTeam);
}

export function buildArenaEnvironmentMap(gs) {
    if (window.gameAPI) return window.gameAPI.buildArenaEnvironmentMap();
}
