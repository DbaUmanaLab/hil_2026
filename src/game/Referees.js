// --- src/game/Referees.js ---
// Creazione e aggiornamento dei 2 arbitri F.I.S.R.
// createReferees() dipende da createSkater() (Skater.js)
// updateReferees() dipende da variabili di stato globali passate come gs

export function createReferees(gs) {
    const { scene, referees, createSkater, RINK_WIDTH } = gs;
    referees.forEach(r => scene.remove(r.mesh));
    referees.length = 0;

    [-1, 1].forEach(side => {
        const ref = createSkater('ref', 'ref', 'ref', 'REF', 0, false, '', '');
        ref.side = side;
        ref.mesh.position.set(side * 15.5, 0, side * 6);
        referees.push(ref);
        scene.add(ref.mesh);
    });
}

export function updateReferees(dt, gs) {
    const { referees, puck, clock, gameState, RINK_WIDTH, GOAL_OFFSET_Z,
            setSkaterHockeyReadyPose } = gs;

    referees.forEach(ref => {
        if (gameState === 'goal_celebration') {
            const targetX = -RINK_WIDTH / 2 + 1.15;
            const targetZ = ref.side * 0.95;
            const dx = targetX - ref.mesh.position.x;
            const dz = targetZ - ref.mesh.position.z;
            const dist = Math.hypot(dx, dz);

            if (dist > 0.25) {
                const spd = Math.min(13.5, dist * 4.5);
                ref.velocity.set((dx / dist) * spd, 0, (dz / dist) * spd);
                ref.mesh.position.addScaledVector(ref.velocity, dt);
                ref.rotationY = Math.atan2(-dx, -dz);
                ref.mesh.rotation.y = ref.rotationY;
                ref.walkCycle += dt * 11;
                setSkaterHockeyReadyPose(ref, Math.sin(ref.walkCycle) * 0.5, 0);
            } else {
                ref.velocity.set(0, 0, 0);
                ref.rotationY = Math.PI / 2;
                ref.mesh.rotation.y = ref.rotationY;
                setSkaterHockeyReadyPose(ref, 0, 0);
                const signalWave = Math.sin(clock.getElapsed() * 10 + ref.side) * 0.28;
                ref.rightArmPivot.rotation.set(1.95 - signalWave, 0, -0.18);
                ref.rightElbowPivot.rotation.set(0.2, 0, 0);
                ref.leftArmPivot.rotation.set(0.85, -0.2, 0.15);
            }
            return;
        }

        if (gameState === 'faceoff') {
            const targetX = ref.side === -1 ? -2.3 : 14.5;
            const targetZ = ref.side === -1 ? 0.0 : -8.0;
            const dx = targetX - ref.mesh.position.x;
            const dz = targetZ - ref.mesh.position.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 0.2) {
                ref.mesh.position.x += (dx / dist) * Math.min(dist, 9 * dt);
                ref.mesh.position.z += (dz / dist) * Math.min(dist, 9 * dt);
            }
            ref.rotationY = Math.atan2(-(0 - ref.mesh.position.x), -(0 - ref.mesh.position.z));
            ref.mesh.rotation.y = ref.rotationY;
            setSkaterHockeyReadyPose(ref, 0, 0);
            return;
        }

        const targetX = ref.side === -1 ? -15.4 : 15.2;
        const targetZ = Math.max(-28, Math.min(28, puck.position.z + ref.side * 7));
        const dx = targetX - ref.mesh.position.x;
        const dz = targetZ - ref.mesh.position.z;
        ref.velocity.set(dx * 3.5, 0, dz * 3.2);
        if (ref.velocity.length() > 10.5) ref.velocity.setLength(10.5);

        ref.mesh.position.addScaledVector(ref.velocity, dt);
        const lookAngle = Math.atan2(
            -(puck.position.x - ref.mesh.position.x),
            -(puck.position.z - ref.mesh.position.z)
        );
        ref.rotationY = lookAngle;
        ref.mesh.rotation.y = ref.rotationY;

        const spd = ref.velocity.length();
        if (spd > 0.4) {
            ref.walkCycle += dt * (4 + spd * 0.8);
            setSkaterHockeyReadyPose(ref, Math.sin(ref.walkCycle) * 0.45, 0);
        } else {
            setSkaterHockeyReadyPose(ref, 0, 0);
        }
    });
}
