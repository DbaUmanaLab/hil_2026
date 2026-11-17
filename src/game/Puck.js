// --- src/game/Puck.js ---
// Fisica del disco, rilevamento gol e fisica balaustre.
// Delega a window.gameAPI per retrocompatibilità.

export function updatePuck(dt, gs) {
    if (window.gameAPI) return window.gameAPI.updatePuck(dt);
}

export function handleGoal(scoringTeam, gs) {
    if (window.gameAPI) return window.gameAPI.handleGoal(scoringTeam);
}

/**
 * Fisica balaustre curve: mantiene pos dentro la pista arrotondata.
 * @param {THREE.Vector3} pos
 * @param {THREE.Vector3|null} vel
 * @param {number} radius  raggio dell'oggetto
 * @param {number} bounceFactor
 */
export function constrainToCurvedRink(pos, vel, radius, bounceFactor, gs) {
    const { RINK_WIDTH, RINK_LENGTH, CORNER_RADIUS } = gs;
    const halfW = RINK_WIDTH / 2;
    const halfL = RINK_LENGTH / 2;
    const cxLimit = halfW - CORNER_RADIUS;
    const czLimit = halfL - CORNER_RADIUS;

    if (Math.abs(pos.x) > cxLimit && Math.abs(pos.z) > czLimit) {
        const signX = Math.sign(pos.x);
        const signZ = Math.sign(pos.z);
        const cx = signX * cxLimit;
        const cz = signZ * czLimit;
        const dx = pos.x - cx;
        const dz = pos.z - cz;
        const dist = Math.hypot(dx, dz);
        const maxAllowed = CORNER_RADIUS - radius;

        if (dist > maxAllowed && dist > 0.0001) {
            const nx = dx / dist;
            const nz = dz / dist;
            pos.x = cx + nx * maxAllowed;
            pos.z = cz + nz * maxAllowed;

            if (vel) {
                const vn = vel.x * nx + vel.z * nz;
                if (vn > 0) {
                    vel.x -= (1 + bounceFactor) * vn * nx;
                    vel.z -= (1 + bounceFactor) * vn * nz;
                }
            }
        }
    } else {
        const limitX = halfW - radius;
        const limitZ = halfL - radius;
        if (pos.x > limitX)       { pos.x = limitX;  if (vel && vel.x > 0) vel.x *= -bounceFactor; }
        else if (pos.x < -limitX) { pos.x = -limitX; if (vel && vel.x < 0) vel.x *= -bounceFactor; }
        if (pos.z > limitZ)       { pos.z = limitZ;  if (vel && vel.z > 0) vel.z *= -bounceFactor; }
        else if (pos.z < -limitZ) { pos.z = -limitZ; if (vel && vel.z < 0) vel.z *= -bounceFactor; }
    }
}
