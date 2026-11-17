// --- src/game/Camera.js ---
// Camera di gioco, tour arena, intro squadre, faceoff e toggleCameraMode.
// Delega a window.gameAPI per retrocompatibilità.

export function updateCamera(gs) {
    if (window.gameAPI) return window.gameAPI.updateCamera();
}

export function toggleCameraMode(gs) {
    if (window.gameAPI) return window.gameAPI.toggleCameraMode();
}

export function startArenaTour(gs) {
    if (window.gameAPI) return window.gameAPI.startArenaTour();
}

export function updateArenaTour(dt, gs) {
    if (window.gameAPI) return window.gameAPI.updateArenaTour(dt);
}

export function startTeamIntro(gs) {
    if (window.gameAPI) return window.gameAPI.startTeamIntro();
}

export function updateIntro(dt, gs) {
    if (window.gameAPI) return window.gameAPI.updateIntro(dt);
}

export function startFaceoff(gs) {
    if (window.gameAPI) return window.gameAPI.startFaceoff();
}

export function updateFaceoff(dt, gs) {
    if (window.gameAPI) return window.gameAPI.updateFaceoff(dt);
}

export function updateStep3ArenaCamera(dt, gs) {
    if (window.gameAPI) return window.gameAPI.updateStep3ArenaCamera(dt);
}
