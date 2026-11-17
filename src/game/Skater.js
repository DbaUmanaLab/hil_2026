// --- src/game/Skater.js ---
// Creazione e aggiornamento degli skater (giocatori su pista).
// Delega all'implementazione in-page tramite window.gameAPI.
// Questo pattern di facade permette di migrare le funzioni pezzo per pezzo
// senza rompere il funzionamento del gioco.

export function createSkater(clubId, kitId, teamSide, role, lineIndex, isGoalie, jerseyNum, playerName) {
    if (window.gameAPI) return window.gameAPI.createSkater(clubId, kitId, teamSide, role, lineIndex, isGoalie, jerseyNum, playerName);
}

export function rebuildMatchTeams(gs) {
    if (window.gameAPI) return window.gameAPI.rebuildMatchTeams();
}

export function updateSkaters(dt, gs) {
    if (window.gameAPI) return window.gameAPI.updateSkaters(dt);
}

export function updateSkaterStickPose(s) {
    if (window.gameAPI) return window.gameAPI.updateSkaterStickPose(s);
}

export function applyGoalCelebrationPose(s, t, isScorer) {
    if (window.gameAPI) return window.gameAPI.applyGoalCelebrationPose(s, t, isScorer);
}

export function setSkaterHockeyReadyPose(s, swing, lean) {
    if (window.gameAPI) return window.gameAPI.setSkaterHockeyReadyPose(s, swing, lean);
}

export function setControlledPlayer(s, gs) {
    if (window.gameAPI) return window.gameAPI.setControlledPlayer(s);
}

export function placeBenchSkatersImmediate(gs) {
    if (window.gameAPI) return window.gameAPI.placeBenchSkatersImmediate();
}

export function getBenchSeatPosition(teamSide, slotIdx) {
    if (window.gameAPI) return window.gameAPI.getBenchSeatPosition(teamSide, slotIdx);
}

export function updateLineHUD(gs) {
    if (window.gameAPI) return window.gameAPI.updateLineHUD();
}

export function updateStaminaAndGuestLines(dt, gs) {
    if (window.gameAPI) return window.gameAPI.updateStaminaAndGuestLines(dt);
}

export function updatePuckCarrierUI(dt, gs) {
    if (window.gameAPI) return window.gameAPI.updatePuckCarrierUI(dt);
}

export function checkInteractions(dt, gs) {
    if (window.gameAPI) return window.gameAPI.checkInteractions(dt);
}
