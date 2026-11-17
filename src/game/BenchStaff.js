// --- src/game/BenchStaff.js ---
// Allenatori e attrezzisti 3D in panchina.
// Delega a window.gameAPI (implementazione in-page).

export function createBenchStaff(gs) {
    if (window.gameAPI) return window.gameAPI.createBenchStaff();
}

export function updateBenchStaff(dt, gs) {
    if (window.gameAPI) return window.gameAPI.updateBenchStaff(dt);
}
