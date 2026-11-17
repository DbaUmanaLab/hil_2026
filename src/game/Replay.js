// --- src/game/Replay.js ---
// Gestisce la registrazione dei frame, la riproduzione del replay goal
// e la camera di replay.
// Dipende da variabili globali di stato (gs) passate come contesto.

export function recordReplayFrame(gs) {
    const { puck, skaters, replayBuffer, MAX_REPLAY_FRAMES } = gs;
    const snapshot = {
        puck: { x: puck.position.x, y: puck.position.y, z: puck.position.z },
        skaters: skaters.map(s => ({
            x: s.mesh.position.x, y: s.mesh.position.y, z: s.mesh.position.z,
            rotX: s.mesh.rotation.x, rotY: s.mesh.rotation.y,
            hipY: s.hipGroup.position.y,
            bodyRotX: s.bodyPivot.rotation.x,
            bodyRotY: s.bodyPivot.rotation.y,
            bodyRotZ: s.bodyPivot.rotation.z,
            leftLegX: s.leftLegPivot.rotation.x,
            leftLegZ: s.leftLegPivot.rotation.z,
            leftKneeX: s.leftKneePivot.rotation.x,
            rightLegX: s.rightLegPivot.rotation.x,
            rightLegZ: s.rightLegPivot.rotation.z,
            rightKneeX: s.rightKneePivot.rotation.x,
            leftArmX: s.leftArmPivot.rotation.x,
            leftArmZ: s.leftArmPivot.rotation.z,
            leftElbowX: s.leftElbowPivot.rotation.x,
            rightArmX: s.rightArmPivot.rotation.x,
            rightArmZ: s.rightArmPivot.rotation.z,
            rightElbowX: s.rightElbowPivot.rotation.x,
            stickPos: s.stickGroup ? s.stickGroup.position.clone() : null,
            stickQuat: s.stickGroup ? s.stickGroup.quaternion.clone() : null
        }))
    };
    replayBuffer.push(snapshot);
    if (replayBuffer.length > MAX_REPLAY_FRAMES) replayBuffer.shift();
}

export function applyReplayFrame(index, gs) {
    const { puck, skaters, replayFrames, replaySlider, replayTimeLabel } = gs;
    if (!replayFrames.length) return;
    const i = Math.max(0, Math.min(replayFrames.length - 1, Math.floor(index)));
    const frame = replayFrames[i];

    puck.position.set(frame.puck.x, frame.puck.y, frame.puck.z);
    frame.skaters.forEach((st, idx) => {
        const s = skaters[idx];
        if (!s) return;
        s.mesh.position.set(st.x, st.y, st.z);
        s.mesh.rotation.x = st.rotX;
        s.mesh.rotation.y = st.rotY;
        s.hipGroup.position.y = st.hipY;
        s.bodyPivot.rotation.set(st.bodyRotX, st.bodyRotY, st.bodyRotZ);
        s.leftLegPivot.rotation.set(st.leftLegX, 0, st.leftLegZ);
        s.leftKneePivot.rotation.x = st.leftKneeX;
        s.rightLegPivot.rotation.set(st.rightLegX, 0, st.rightLegZ);
        s.rightKneePivot.rotation.x = st.rightKneeX;
        s.leftArmPivot.rotation.set(st.leftArmX, 0.2, st.leftArmZ);
        s.leftElbowPivot.rotation.x = st.leftElbowX;
        s.rightArmPivot.rotation.set(st.rightArmX, -0.2, st.rightArmZ);
        s.rightElbowPivot.rotation.x = st.rightElbowX;
        if (s.stickGroup && st.stickPos && st.stickQuat) {
            s.stickGroup.position.copy(st.stickPos);
            s.stickGroup.quaternion.copy(st.stickQuat);
        }
    });

    if (replaySlider) replaySlider.value = i;
    if (replayTimeLabel) replayTimeLabel.textContent = (i / 60).toFixed(1) + 's';
}

export function startReplay(scoringTeam, gs) {
    gs.replayGoalSide = scoringTeam;
    gs.replayFrames = gs.replayBuffer.slice();
    if (!gs.replayFrames.length) {
        exitReplay(gs);
        return;
    }
    gs.gameState = 'replay';
    gs.replayIndex = 0;
    gs.replayPlaying = true;
    gs.replaySpeed = 0.5;
    gs.replayCameraAngle = 'tv';
    gs.replayOrbitYaw = 0.65;
    gs.replayOrbitPitch = 0.42;
    gs.replayOrbitDist = 12;

    const { replaySlider, replayTotalLabel, replayPlayPauseBtn, actionControlsBar, replayUi } = gs;
    replaySlider.min = 0;
    replaySlider.max = Math.max(0, gs.replayFrames.length - 1);
    replaySlider.value = 0;
    replayTotalLabel.textContent = (gs.replayFrames.length / 60).toFixed(1) + 's';
    replayPlayPauseBtn.textContent = '⏸ Pausa';
    updateReplayButtonsUI(gs);
    actionControlsBar.classList.add('hidden');
    replayUi.classList.remove('hidden');
    applyReplayFrame(0, gs);
}

export function updateReplay(dt, gs) {
    if (!gs.replayFrames.length) return;
    if (gs.replayPlaying) {
        gs.replayIndex += gs.replaySpeed * (dt * 60);
        if (gs.replayIndex >= gs.replayFrames.length) gs.replayIndex = 0;
        else if (gs.replayIndex < 0) gs.replayIndex = gs.replayFrames.length - 1;
    }
    applyReplayFrame(gs.replayIndex, gs);
    updateReplayCamera(gs);
}

export function updateReplayCamera(gs) {
    const { camera, puck, replayGoalSide, replayCameraAngle,
            replayOrbitYaw, replayOrbitPitch, replayOrbitDist, GOAL_OFFSET_Z } = gs;
    const targetGoalZ = (replayGoalSide === 'home') ? -GOAL_OFFSET_Z : GOAL_OFFSET_Z;
    const goalDir = (replayGoalSide === 'home') ? 1 : -1;

    if (replayCameraAngle === 'tv') {
        const desiredPos = new THREE.Vector3(puck.position.x * 0.45 + 11.5, 5.2, puck.position.z + goalDir * 8.5);
        camera.position.lerp(desiredPos, 0.14);
        camera.lookAt(puck.position.x * 0.7, 1.1, (puck.position.z + targetGoalZ) * 0.5);
    } else if (replayCameraAngle === 'goalcam') {
        const desiredPos = new THREE.Vector3(2.6, 1.65, targetGoalZ - goalDir * 2.1);
        camera.position.lerp(desiredPos, 0.2);
        camera.lookAt(puck.position.x, Math.max(0.6, puck.position.y), puck.position.z);
    } else if (replayCameraAngle === 'puck') {
        const desiredPos = new THREE.Vector3(puck.position.x * 0.85, 2.4, puck.position.z + goalDir * 5.2);
        camera.position.lerp(desiredPos, 0.18);
        camera.lookAt(puck.position.x, 0.8, targetGoalZ);
    } else if (replayCameraAngle === 'orbit') {
        const focusX = puck.position.x * 0.5;
        const focusZ = puck.position.z * 0.4 + targetGoalZ * 0.6;
        const camX = focusX + Math.sin(replayOrbitYaw) * Math.cos(replayOrbitPitch) * replayOrbitDist;
        const camY = Math.max(1.2, Math.sin(replayOrbitPitch) * replayOrbitDist + 1.2);
        const camZ = focusZ + Math.cos(replayOrbitYaw) * Math.cos(replayOrbitPitch) * replayOrbitDist;
        camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.2);
        camera.lookAt(focusX, 1.1, focusZ);
    }
}

export function updateReplayButtonsUI(gs) {
    document.querySelectorAll('.replay-speed-btn').forEach(btn => {
        const sp = parseFloat(btn.dataset.speed);
        btn.className = (sp === gs.replaySpeed)
            ? 'replay-speed-btn text-[11px] font-bold px-2 py-1.5 rounded-lg bg-red-600 text-white'
            : 'replay-speed-btn text-[11px] font-bold px-2 py-1.5 rounded-lg text-slate-300';
    });
    document.querySelectorAll('.replay-cam-btn').forEach(btn => {
        btn.className = (btn.dataset.rcam === gs.replayCameraAngle)
            ? 'replay-cam-btn text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950'
            : 'replay-cam-btn text-[11px] font-bold px-2.5 py-1.5 rounded-lg text-slate-300';
    });
}

export function exitReplay(gs) {
    gs.replayUi.classList.add('hidden');
    gs.actionControlsBar.classList.remove('hidden');
    gs.goalCooldown = false;
    gs.startFaceoff();
}
