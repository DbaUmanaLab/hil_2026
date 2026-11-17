// --- src/ui/HUD.js ---
// Gestione HUD di gioco, schermate pre-partita (3 step), distinta lineup,
// statistiche fine periodo e lancio partita.
// Delega a window.gameAPI per retrocompatibilità.

export function applyMatchConfigToHUD(gs) {
    if (window.gameAPI) return window.gameAPI.applyMatchConfigToHUD();
}

export function renderClubLineupCardHTML(clubCfg) {
    if (window.gameAPI) return window.gameAPI.renderClubLineupCardHTML(clubCfg);
}

export function showPreMatchLineupScreen(gs) {
    if (window.gameAPI) return window.gameAPI.showPreMatchLineupScreen();
}

export function updateLineupLoadingScreen(dt, gs) {
    if (window.gameAPI) return window.gameAPI.updateLineupLoadingScreen(dt);
}

export function handleEndOfPeriod(gs) {
    if (window.gameAPI) return window.gameAPI.handleEndOfPeriod();
}

export function openMatchStatsModal(isFinal, gs) {
    if (window.gameAPI) return window.gameAPI.openMatchStatsModal(isFinal);
}

export function launchMatchFromCurrentConfig(gs) {
    if (window.gameAPI) return window.gameAPI.launchMatchFromCurrentConfig();
}

export function setPreMatchStep(stepNum, gs) {
    if (window.gameAPI) return window.gameAPI.setPreMatchStep(stepNum);
}

export function renderStep1Teams(gs) {
    if (window.gameAPI) return window.gameAPI.renderStep1Teams();
}

export function renderStep2Kits(gs) {
    if (window.gameAPI) return window.gameAPI.renderStep2Kits();
}

export function renderStep3Arena(gs) {
    if (window.gameAPI) return window.gameAPI.renderStep3Arena();
}

export function selectArena(arenaId, gs) {
    if (window.gameAPI) return window.gameAPI.selectArena(arenaId);
}
