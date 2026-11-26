// --- src/game/PoseBlend.js ---
// Raccordi fra le pose dei giocatori (e degli arbitri).
// Le pose sono scritte da codice, frame per frame, direttamente sulle articolazioni (busto, gambe,
// ginocchia, braccia, gomiti) da molte funzioni diverse: pattinata, panchina, esultanze, cerimonie...
// Quando si passa da una all'altra il corpo "scattava" in un frame. Qui, una volta per frame e dopo
// tutti gli aggiornamenti, ogni articolazione viene portata dalla posa del frame precedente verso quella
// appena scritta con una molla esponenziale: i cambi grandi (seduto → in piedi, inizio di un'esultanza,
// frenata) si fondono in ~0,3 s, i movimenti piccoli e ciclici (falcata, respiro) restano reattivi.
// La stecca: se segue le mani (updateSkaterStickPose nel frame) si ricalcola sulle mani fuse,
// altrimenti (esultanze che la impugnano a modo loro) si fonde posizione e rotazione.
(function () {
    const JOINTS = ['bodyPivot', 'leftLegPivot', 'leftKneePivot', 'rightLegPivot', 'rightKneePivot',
        'leftArmPivot', 'leftElbowPivot', 'rightArmPivot', 'rightElbowPivot', 'leftSkate', 'rightSkate'];
    const AXES = ['x', 'y', 'z'];
    let frame = 0;

    const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    // velocità della molla (1/s) in base alla distanza dal bersaglio: più lontano = raccordo più morbido
    const rateFor = d => 26 - 17 * smoothstep(0.12, 1.1, d);
    const follow = (cur, tgt, dt, scale) => {
        const d = tgt - cur;
        return cur + d * (1 - Math.exp(-rateFor(Math.abs(d) * (scale || 1)) * dt));
    };

    function snapshot(s, st) {
        st.j = {};
        JOINTS.forEach(n => { const o = s[n]; if (o) st.j[n] = [o.rotation.x, o.rotation.y, o.rotation.z]; });
        st.hip = s.hipGroup ? s.hipGroup.position.y : 0;
        st.legL = s.leftLegPivot ? s.leftLegPivot.position.y : 0;
        st.legR = s.rightLegPivot ? s.rightLegPivot.position.y : 0;
        st.my = s.mesh.position.y;
        st.mrx = s.mesh.rotation.x;
        if (s.stickGroup) { st.sp = s.stickGroup.position.clone(); st.sq = s.stickGroup.quaternion.clone(); }
    }

    function blendSkater(s, dt, updateStick) {
        if (!s || !s.mesh || !s.bodyPivot) return;
        const st = s._pb || (s._pb = {});
        // primo frame, o dopo un salto (replay, pausa, oggetto rimesso in scena), o gesto rapido che non va
        // smussato (tiro: s.poseSnap nel frame): si parte dalla posa attuale
        if (st.frame == null || frame - st.frame > 2 || !s.mesh.visible || s.poseSnap === frame) { snapshot(s, st); st.frame = frame; return; }
        st.frame = frame;
        JOINTS.forEach(n => {
            const o = s[n];
            if (!o) return;
            const p = st.j[n] || (st.j[n] = [o.rotation.x, o.rotation.y, o.rotation.z]);
            AXES.forEach((ax, i) => { p[i] = follow(p[i], o.rotation[ax], dt); o.rotation[ax] = p[i]; });
        });
        // altezze (in metri: pesate ×4 per scegliere la morbidezza) e rotazione del corpo intero (scivolata di pancia)
        if (s.hipGroup) { st.hip = follow(st.hip, s.hipGroup.position.y, dt, 4); s.hipGroup.position.y = st.hip; }
        if (s.leftLegPivot) { st.legL = follow(st.legL, s.leftLegPivot.position.y, dt, 4); s.leftLegPivot.position.y = st.legL; }
        if (s.rightLegPivot) { st.legR = follow(st.legR, s.rightLegPivot.position.y, dt, 4); s.rightLegPivot.position.y = st.legR; }
        st.my = follow(st.my, s.mesh.position.y, dt, 4); s.mesh.position.y = st.my;
        st.mrx = follow(st.mrx, s.mesh.rotation.x, dt); s.mesh.rotation.x = st.mrx;

        if (s.stickGroup) {
            if (s._stickFrame === frame && updateStick) {
                updateStick(s);                              // stecca sulle mani appena fuse
            } else if (st.sp && st.sq) {
                const tq = s.stickGroup.quaternion, tp = s.stickGroup.position;
                const ang = 2 * Math.acos(Math.min(1, Math.abs(st.sq.dot(tq))));
                const k = 1 - Math.exp(-rateFor(Math.max(ang, st.sp.distanceTo(tp) * 4)) * dt);
                st.sq.slerp(tq, k);
                st.sp.lerp(tp, k);
                tq.copy(st.sq);
                tp.copy(st.sp);
            }
            st.sp = (st.sp || s.stickGroup.position.clone()).copy(s.stickGroup.position);
            st.sq = (st.sq || s.stickGroup.quaternion.clone()).copy(s.stickGroup.quaternion);
        }
    }

    window.HIL_POSE = {
        get frame() { return frame; },
        tick() { frame++; },
        // segna che la stecca di s, in questo frame, segue le mani
        stickFollowsHands(s) { s._stickFrame = frame; },
        blendAll(list, dt, updateStick) {
            if (!dt) return;
            list.forEach(s => blendSkater(s, dt, updateStick));
        },
        // la prossima posa si applica senza raccordo (teletrasporti, cambi di scena)
        reset(s) { if (s && s._pb) s._pb.frame = null; }
    };
})();
