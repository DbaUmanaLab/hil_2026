// --- src/game/Warmup.js ---
// Riscaldamento durante la presentazione del palazzetto (gameState 'arena_tour'): giocatori di
// entrambe le squadre, in maglietta a maniche corte con lo stemma e pantaloncini, a coppie nella
// propria metà pista si passano il disco avanti e indietro (carica, passaggio, ricezione, palleggio).
// I giocatori della partita in quel momento sono in panchina: questi sono modelli a parte
// (HIL_PEOPLE.makePerson) che vengono tolti quando inizia la presentazione delle squadre.
// Script classico: usa a runtime THREE, scene, camera, matchConfig, CLUB_ROSTERS, puckPhysics,
// getActiveQualityPreset e window.gameAudio dello script principale.
(function () {
    'use strict';

    let state = null;

    function kitColors(clubId, kitId) {
        const club = typeof CLUB_ROSTERS !== 'undefined' && CLUB_ROSTERS[clubId];
        const kit = club && club.kits && (club.kits[kitId] || Object.values(club.kits)[0]);
        const shirt = kit ? kit.primary : 0xdc2626;
        let shorts = kit && kit.pants != null ? kit.pants : 0x111827;
        if (shorts === shirt) shorts = (shirt === 0xffffff ? 0x14235a : 0x111827);
        return { shirt, shorts, socks: shirt };
    }

    function makePlayer(team, clubId, kitId) {
        const c = kitColors(clubId, kitId);
        const p = window.HIL_PEOPLE.makePerson({
            female: false, top: c.shirt, shortSleeves: true, shorts: c.shorts, socks: c.socks,
            skates: true, stick: true, crestClub: clubId, skin: 0xd6a38a
        });
        p.team = team;
        return p;
    }

    function start() {
        stop();
        if (!window.HIL_PEOPLE || !window.HIL_PEOPLE.makePerson || typeof scene === 'undefined') return;
        const lowQ = getActiveQualityPreset().id === 'low';
        const group = new THREE.Group();
        scene.add(group);
        // dischi del riscaldamento a misura reale (quello della partita è ingrandito per vedersi in gioco)
        const pr = 0.055, ph = 0.03;
        const puckGeo = new THREE.CylinderGeometry(pr, pr, ph, 16);
        const puckMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.5 });
        const pairs = [];
        // la squadra di casa difende la porta a +Z: si scalda nella metà +Z, gli ospiti nella metà -Z
        [['home', 1, matchConfig.homeClub, matchConfig.homeKit], ['guest', -1, matchConfig.guestClub, matchConfig.guestKit]].forEach(([team, side, clubId, kitId]) => {
            const rows = lowQ ? [7, 13, 19] : [5.5, 10, 14.5, 19];
            rows.forEach((zr, i) => {
                const z = side * zr + (Math.random() - 0.5) * 0.6;
                const half = 2.7 + Math.random() * 0.8;
                const xc = (i % 2 ? 1.2 : -1.2) + (Math.random() - 0.5) * 0.8;
                const a = makePlayer(team, clubId, kitId), b = makePlayer(team, clubId, kitId);
                a.mesh.position.set(xc - half, a.lift, z);
                b.mesh.position.set(xc + half, b.lift, z);
                a.mesh.rotation.y = 0;            // guarda verso +X, cioè verso il compagno
                b.mesh.rotation.y = Math.PI;
                group.add(a.mesh, b.mesh);
                const puck = new THREE.Mesh(puckGeo, puckMat);
                puck.castShadow = !lowQ;
                group.add(puck);
                [a, b].forEach(p => { p.base = p.mesh.position.clone(); p.swing = 0; p.swingT = -1; });
                pairs.push({
                    players: [a, b], puck, holder: Math.random() < 0.5 ? 0 : 1,
                    phase: 'hold', t: 0, hold: 0.3 + Math.random() * 0.9, travel: 0.6, from: new THREE.Vector3(), to: new THREE.Vector3(),
                    puckY: ph / 2
                });
            });
        });
        state = { group, pairs, time: 0, puckGeo, puckMat };
        update(0);
    }

    // colpo di bastone: carica all'indietro (0..0.28 s), poi passaggio e accompagnamento (0.28..0.5 s)
    function swingAngle(t) {
        if (t < 0) return 0;
        if (t < 0.28) return -0.55 * Math.sin((t / 0.28) * Math.PI / 2);
        if (t < 0.4) return -0.55 + 1.05 * ((t - 0.28) / 0.12);
        if (t < 0.75) return 0.5 * (1 - (t - 0.4) / 0.35);
        return 0;
    }

    function bladePos(p, out) {
        p.stickBlade.getWorldPosition(out);
        return out;
    }

    function update(dt) {
        if (!state) return;
        state.time += dt;
        const T = state.time;
        // 1) pose: piccoli spostamenti sul posto, come chi pattina piano mentre si passa il disco
        state.pairs.forEach(pair => {
            pair.players.forEach(p => {
                p.mesh.position.z = p.base.z + Math.sin(T * 0.6 + p.phase) * 0.35;
                p.mesh.position.x = p.base.x + Math.sin(T * 0.45 + p.phase * 1.7) * 0.25;
                p.bodyPivot.rotation.z = -0.06 + Math.sin(T * 1.3 + p.phase) * 0.03;   // busto un po' in avanti
                if (p.swingT >= 0) p.swingT += dt;
                if (p.swingT > 0.8) p.swingT = -1;
                let yaw = swingAngle(p.swingT);
                if (pair.phase === 'hold' && pair.players[pair.holder] === p && p.swingT < 0) yaw = Math.sin(T * 9 + p.phase) * 0.22;   // palleggio
                p.stickGroup.rotation.y = yaw;
                p.headGroup.rotation.y = Math.sin(T * 0.8 + p.phase) * 0.15;
            });
        });
        state.group.updateMatrixWorld(true);
        // 2) dischi: sulla lama di chi lo tiene, oppure in viaggio verso la lama del compagno
        state.pairs.forEach(pair => {
            pair.t += dt;
            const holder = pair.players[pair.holder], other = pair.players[1 - pair.holder];
            if (pair.phase === 'hold') {
                bladePos(holder, pair.puck.position);
                pair.puck.position.y = pair.puckY;
                // si carica il colpo un po' prima di lasciare partire il disco
                if (pair.t >= pair.hold && holder.swingT < 0) holder.swingT = 0;
                if (holder.swingT >= 0.34) {
                    pair.phase = 'travel'; pair.t = 0;
                    pair.from.copy(pair.puck.position);
                    pair.travel = 0.45 + Math.random() * 0.25;
                    // niente suono: durante il riscaldamento i passaggi sono solo di contorno
                }
            } else {
                // il disco va verso la lama del compagno (che si muove un poco)
                bladePos(other, pair.to);
                const k = Math.min(1, pair.t / pair.travel);
                pair.puck.position.lerpVectors(pair.from, pair.to, k);
                pair.puck.position.y = pair.puckY;
                pair.puck.rotation.y += dt * 12;
                if (k >= 1) {
                    pair.phase = 'hold'; pair.t = 0; pair.holder = 1 - pair.holder;
                    pair.hold = 0.5 + Math.random() * 1.0;
                    other.swingT = 0.62;     // ammortizza la ricezione (coda dell'accompagnamento)
                }
            }
        });
    }

    function stop() {
        if (!state) return;
        if (state.group.parent) state.group.parent.remove(state.group);
        state.puckGeo.dispose();
        state.puckMat.dispose();
        state = null;
    }

    window.HIL_WARMUP = { start, update, stop, isActive: () => !!state };
})();
