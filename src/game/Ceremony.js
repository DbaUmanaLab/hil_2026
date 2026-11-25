// --- src/game/Ceremony.js ---
// Fine periodo e fine partita "in pista" (script classico, dopo lo script principale di index.html:
// usa i suoi globali skaters, camera, clock, gameState, matchStats, scoreHome/scoreGuest, ...).
//
//  PAUSA TRA I PERIODI ('period_break'): la telecamera resta nel palazzetto con una ripresa lenta
//  dalla balaustra, i giocatori rientrano verso le panchine e un pannello compatto in basso
//  riassume il periodo appena giocato (gol, tiri, parate, marcatori). "Inizia" fa ripartire il gioco.
//
//  FINE PARTITA ('postgame'): la squadra vincente festeggia davanti al proprio portiere (salti,
//  bastoni al cielo, coriandoli nei colori sociali, panchina in festa), gli sconfitti rientrano a
//  testa bassa. La telecamera gira attorno alla festa, poi inquadra l'MVP con la sua scheda.
//  "Statistiche" apre il riepilogo finale (openMatchStatsModal), che mostra anche l'MVP.
(function () {
    'use strict';
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const ease = k => k * k * (3 - 2 * k);

    // ------------------------------------------------------------------ interfaccia (DOM + stile)
    let ui = null;
    function ensureUi() {
        if (ui) return ui;
        const l = document.createElement('link');
        l.rel = 'stylesheet'; l.href = 'src/game/ceremony.css';
        document.head.appendChild(l);
        const pb = document.createElement('div');
        pb.id = 'pb-panel';
        pb.className = 'cm-hidden';
        const pg = document.createElement('div');
        pg.id = 'pg-overlay';
        pg.className = 'cm-hidden';
        document.body.append(pb, pg);
        ui = { pb, pg };
        return ui;
    }
    function clubOf(side) { return CLUB_ROSTERS[side === 'home' ? matchConfig.homeClub : matchConfig.guestClub]; }
    function colorsOf(side) {
        const c = getMatchTeamColors();
        return side === 'home' ? [c.home, c.home2] : [c.guestBar, c.guest2];
    }

    // ------------------------------------------------------------------ statistiche del periodo
    // istantanea delle statistiche all'inizio del periodo in corso (si azzera a ogni nuova partita)
    let snap = null;
    function snapshotNow() {
        return { ref: matchStats, homeShots: matchStats.homeShots, guestShots: matchStats.guestShots, homeSaves: matchStats.homeSaves, guestSaves: matchStats.guestSaves };
    }
    function periodStats() {
        if (!snap || snap.ref !== matchStats) snap = { ref: matchStats, homeShots: 0, guestShots: 0, homeSaves: 0, guestSaves: 0 };
        const goals = matchStats.scorers.filter(s => s.period === currentPeriod);
        const hg = goals.filter(s => s.team === 'home').length, gg = goals.length - hg;
        return {
            goals, hg, gg,
            hs: Math.max(hg, matchStats.homeShots - snap.homeShots), gs: Math.max(gg, matchStats.guestShots - snap.guestShots),
            hv: matchStats.homeSaves - snap.homeSaves, gv: matchStats.guestSaves - snap.guestSaves
        };
    }

    // ------------------------------------------------------------------ MVP
    let mvp = null;   // { side, skater, num, name, line, isGoalie }
    function computeMvp(winner) {
        const sides = winner ? [winner] : ['home', 'guest'];
        const cands = [];
        const winGoalIdx = winner ? Math.min(scoreHome, scoreGuest) : -1;   // la rete decisiva è la (perdente+1)-esima del vincitore
        sides.forEach(side => {
            const goals = matchStats.scorers.filter(s => s.team === side);
            const by = {};
            goals.forEach((g, i) => {
                const k = g.num + '|' + g.name;
                if (!by[k]) by[k] = { num: g.num, name: g.name, goals: 0, gwg: false, last: 0 };
                by[k].goals++;
                by[k].last = matchStats.scorers.indexOf(g);
                if (side === winner && i === winGoalIdx) by[k].gwg = true;
            });
            Object.values(by).forEach(p => {
                const sk = skaters.find(s => s.team === side && !s.isGoalie && String(s.jerseyNum) === String(p.num) && skaterFullName(s) === p.name)
                    || skaters.find(s => s.team === side && !s.isGoalie && String(s.jerseyNum) === String(p.num));
                cands.push({
                    side, skater: sk, num: p.num, name: p.name, isGoalie: false,
                    score: p.goals * 3 + (p.gwg ? 1.5 : 0) + p.last * 0.01,
                    line: (p.goals === 1 ? _t('1 gol') : _t('{0} gol', p.goals)) + (p.gwg ? ' • ' + _t('rete decisiva') : '')
                });
            });
            const gk = skaters.find(s => s.team === side && s.isGoalie);
            if (gk) {
                const saves = side === 'home' ? matchStats.homeSaves : matchStats.guestSaves;
                const against = side === 'home' ? scoreGuest : scoreHome;
                cands.push({
                    side, skater: gk, num: gk.jerseyNum, name: skaterFullName(gk), isGoalie: true,
                    score: saves * 0.3 - against * 0.8 + (against === 0 ? 3 : 0),
                    line: `${saves === 1 ? _t('1 parata') : _t('{0} parate', saves)} • ${against === 0 ? _t('porta inviolata') : (against === 1 ? _t('1 gol subito') : _t('{0} gol subiti', against))}`
                });
            }
        });
        cands.sort((a, b) => b.score - a.score);
        return cands[0] || null;
    }
    function mvpHtml() {
        if (!mvp) return '';
        const club = clubOf(mvp.side);
        return `<b>MVP</b> #${esc(mvp.num)} ${esc(mvp.name)} (${esc(club.shortName || club.name)}) • ${esc(mvp.line)}`;
    }

    // ------------------------------------------------------------------ movimento dei giocatori
    function glideTo(s, tx, tz, speed, dt, idle) {
        const dx = tx - s.mesh.position.x, dz = tz - s.mesh.position.z;
        const d = Math.hypot(dx, dz);
        s.mesh.rotation.z = 0;
        if (d > 0.35) {
            const v = Math.min(speed, d * 1.6);
            s.mesh.position.x += dx / d * v * dt;
            s.mesh.position.z += dz / d * v * dt;
            s.rotationY = Math.atan2(-dx, -dz);
            s.mesh.rotation.y = s.rotationY;
            s._cmStride = (s._cmStride || 0) + dt * v * 1.6;
            setSkaterHockeyReadyPose(s, Math.sin(s._cmStride) * Math.min(1, v / 4), 0);
            return false;
        }
        if (idle) idle(); else setSkaterHockeyReadyPose(s, 0, 0);
        return true;
    }
    const ownGoalZ = side => -aiAttackDir(side) * goalOffsetZ;     // la porta difesa dalla squadra
    function benchDoor(side) { const p = getBenchSeatPosition(side, 3); return { x: rinkWidth / 2 - 1.6, z: p.z }; }

    // ------------------------------------------------------------------ telecamera
    let cam = null;     // { from: Vector3, look: Vector3, t }
    function camBlend(pos, look, dt, rate) {
        const k = 1 - Math.exp(-dt * (rate || 1.6));
        camera.position.lerp(pos, k);
        cam.look.lerp(look, k);
        camera.lookAt(cam.look);
    }
    function initCam() {
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        cam = { look: camera.position.clone().addScaledVector(dir, 12), t: 0 };
    }

    // ================================================================== PAUSA TRA I PERIODI
    let pb = null;
    function startPeriodBreak() {
        ensureUi();
        gameState = 'period_break';
        if (window.gameAudio) { window.gameAudio.playStinger('period'); window.gameAudio.setCrowdIntensity(0.3); }
        const goingToOvertime = currentPeriod >= TOTAL_PERIODS;
        pb = { t: 0, t0: performance.now(), goingToOvertime };
        initCam();
        renderPeriodPanel();
        ui.pb.classList.remove('cm-hidden');
        requestAnimationFrame(() => { const b = ui.pb.querySelector('[data-pb-go]'); if (b) b.focus({ preventScroll: true }); });
    }
    function renderPeriodPanel() {
        const H = clubOf('home'), G = clubOf('guest');
        const col = getMatchTeamColors();
        const st = periodStats();
        const row = (label, h, g, th, tg) => {
            const tot = h + g, hp = tot ? Math.round(h / tot * 100) : 50;
            return `<div class="pb-row"><b>${h}</b><div class="pb-mid"><span>${label}</span><div class="pb-bar"><i style="width:${hp}%;background:${col.home}"></i><i style="width:${100 - hp}%;background:${col.guestBar}"></i></div><small>${_t('totale {0} - {1}', th, tg)}</small></div><b>${g}</b></div>`;
        };
        const ord = n => (n > TOTAL_PERIODS ? _t('supplementare') : _t('{0} periodo', I18N.ord(n)));
        const scorers = st.goals.length
            ? st.goals.map(s => `<span class="pb-sc" style="--c:${s.team === 'home' ? col.home : col.guestBar}">${esc(s.timeStr)} • #${esc(s.num)} ${esc(s.name)}</span>`).join('')
            : '<span class="pb-none">Nessun gol nel periodo</span>';
        ui.pb.innerHTML = `
            <div class="pb-card" style="--home:${col.home};--guest:${col.guestBar}">
                <div class="pb-head"><span>${pb.goingToOvertime ? 'Parità al termine dei tempi regolamentari' : _t('Fine {0}', ord(currentPeriod))}</span><em>Riepilogo del periodo</em></div>
                <div class="pb-score">
                    <div class="pb-team">${getClubLogoSVG(H.id, 'pb-logo')}<span>${esc(H.shortName || H.name)}</span></div>
                    <div class="pb-nums">${scoreHome}<i>-</i>${scoreGuest}</div>
                    <div class="pb-team is-guest"><span>${esc(G.shortName || G.name)}</span>${getClubLogoSVG(G.id, 'pb-logo')}</div>
                </div>
                <div class="pb-stats">
                    ${row('Gol', st.hg, st.gg, scoreHome, scoreGuest)}
                    ${row('Tiri in porta', st.hs, st.gs, Math.max(scoreHome, matchStats.homeShots), Math.max(scoreGuest, matchStats.guestShots))}
                    ${row('Parate', st.hv, st.gv, matchStats.homeSaves, matchStats.guestSaves)}
                </div>
                <div class="pb-scorers">${scorers}</div>
                <div class="pb-actions"><button type="button" class="pb-btn" data-pb-go data-focus>${pb.goingToOvertime ? 'Supplementare • golden goal ▶' : _t('Inizia il {0} periodo ▶', I18N.ord(currentPeriod + 1))}</button></div>
            </div>`;
        ui.pb.querySelector('[data-pb-go]').onclick = endPeriodBreak;
    }
    function updatePeriodBreak(dt) {
        if (!pb) return;
        pb.t = (performance.now() - pb.t0) / 1000;     // tempo reale: la regia non rallenta se calano gli fps
        // giocatori: chi è in pista rientra verso la propria panchina, i portieri tornano in porta
        skaters.forEach(s => {
            if (!s.isGoalie && !s.onIce) {
                setSkaterBenchPose(s, false);
                return;
            }
            if (s.isGoalie) { glideTo(s, 0, ownGoalZ(s.team) * 0.97, 3, dt); return; }
            const door = benchDoor(s.team);
            const slot = s.lineIndex != null ? s.lineIndex : 0;
            glideTo(s, door.x - (slot % 2) * 1.1, door.z + ((s._cmSeed = s._cmSeed || Math.random()) - 0.5) * 3.2, 4.2, dt);
        });
        referees.forEach(r => { glideTo(r, -rinkWidth / 2 + 1.6, r.side * 1.2, 3, dt); });
        if (typeof updateCrowd === 'function') updateCrowd(dt);
        if (typeof updateBenchStaff === 'function') updateBenchStaff(dt);
        // ripresa lenta dalla balaustra opposta alle panchine, avanti e indietro lungo la pista
        const ph = Math.sin(pb.t * 0.12);
        const z = ph * 16;
        camBlend(V(-16.5, 9.5, z + 9), V(2, 0.4, z * 0.7), dt, pb.t < 2.5 ? 1.2 : 2.2);
    }
    function endPeriodBreak() {
        if (!pb) return;
        pb = null;
        ui.pb.classList.add('cm-hidden');
        snap = snapshotNow();
        currentPeriod++;
        gameTime = currentPeriod > TOTAL_PERIODS ? OVERTIME_DURATION_SECONDS : PERIOD_DURATION_SECONDS;
        updateScoreboardVisuals();
        startFaceoff();
    }

    // ================================================================== FESTA DI FINE PARTITA
    let pg = null;
    function startPostMatch() {
        ensureUi();
        let winner = scoreHome > scoreGuest ? 'home' : (scoreGuest > scoreHome ? 'guest' : null);
        if (!winner && matchShootout) winner = matchShootout.winner === 'home' ? 'home' : 'guest';
        mvp = computeMvp(winner);
        gameState = 'postgame';
        replayGoalSide = winner || 'home';            // la panchina del vincitore esulta (updateBenchStaff)
        currentGoalCelebration = GOAL_CELEBRATIONS.find(c => c.id === 'fist_pump') || currentGoalCelebration;
        const gz = winner ? ownGoalZ(winner) : 0;
        const gather = V(0, 0, winner ? gz * 0.62 : 0);   // davanti al portiere vincitore
        pg = { t: 0, t0: performance.now(), winner, gather, confetti: 0, mvpShown: false, slots: new Map() };
        // posti attorno al punto di raccolta: l'MVP davanti, gli altri a cerchio
        const team = winner ? skaters.filter(s => s.team === winner) : [];
        const others = team.filter(s => !mvp || s !== mvp.skater);
        // come in una foto di squadra: compagni a semicerchio verso la propria porta, MVP davanti
        const back = Math.sign(gz || 1);
        others.forEach((s, i) => {
            const a = Math.PI * (0.08 + 0.84 * (i / Math.max(1, others.length - 1)));
            const r = 2.4 + (i % 2) * 1.2;
            pg.slots.set(s, V(gather.x + Math.cos(a) * r * 1.3, 0, gather.z + back * Math.sin(a) * r * 0.7));
        });
        if (mvp && mvp.skater) pg.slots.set(mvp.skater, V(gather.x, 0, gather.z - back * 1.6));
        if (puck) puck.position.set(0, -2, 0);         // il disco sparisce
        initCam();
        if (window.gameAudio) {
            window.gameAudio.playGoalHorn();
            window.gameAudio.playStinger('victory', 0.6);
        }
        renderPostOverlay();
        ui.pg.classList.remove('cm-hidden');
        requestAnimationFrame(() => { const b = ui.pg.querySelector('[data-pg-go]'); if (b) b.focus({ preventScroll: true }); });
    }
    function resultNote() {
        if (matchShootout) return _t('ai rigori {0}-{1}', matchShootout.home, matchShootout.guest);
        if (currentPeriod > TOTAL_PERIODS) return _t('dopo il supplementare');
        return '';
    }
    function renderPostOverlay() {
        const W = pg.winner ? clubOf(pg.winner) : null;
        const H = clubOf('home'), G = clubOf('guest');
        const [c1] = pg.winner ? colorsOf(pg.winner) : ['#f6b511'];
        const note = resultNote();
        const mc = mvp ? clubOf(mvp.side) : null;
        ui.pg.innerHTML = `
            <div class="pg-banner" style="--c:${c1}">
                ${W ? getClubLogoSVG(W.id, 'pg-logo') : ''}
                <div><span>${W ? 'Vittoria' : 'Pareggio'}</span><b>${esc(W ? W.name : `${H.shortName || H.name} - ${G.shortName || G.name}`)}</b>
                <em>${esc(H.shortName || H.name)} ${scoreHome} - ${scoreGuest} ${esc(G.shortName || G.name)}${note ? ' • ' + esc(note) : ''}</em></div>
            </div>
            ${mvp ? `<div class="pg-mvp" style="--c:${colorsOf(mvp.side)[0]}">
                <div class="pg-mvp-tag">MVP<small>della partita</small></div>
                ${getClubLogoSVG(mc.id, 'pg-mvp-logo')}
                <div class="pg-mvp-txt"><b><i>#${esc(mvp.num)}</i> ${esc(mvp.name)}</b><span>${esc(mc.shortName || mc.name)} • ${mvp.isGoalie ? _t('portiere') : _t('giocatore di movimento')}</span><em>${esc(mvp.line)}</em></div>
            </div>` : ''}
            <div class="pg-actions"><button type="button" class="pb-btn" data-pg-go data-focus>Statistiche finali ▶</button></div>`;
        ui.pg.querySelector('[data-pg-go]').onclick = endPostMatch;
    }
    function updatePostMatch(dt) {
        if (!pg) return;
        pg.t = (performance.now() - pg.t0) / 1000;
        const t = clock.getElapsed();
        const W = pg.winner;
        skaters.forEach(s => {
            s.mesh.rotation.z = 0;
            if (W && s.team === W) {
                const slot = pg.slots.get(s);
                // primo piano: l'MVP è già al suo posto e guarda la telecamera
                if (mvp && s === mvp.skater && pg.t > 4.5) s.mesh.position.lerp(V(slot.x, s.mesh.position.y, slot.z), Math.min(1, dt * 4));
                const arrived = glideTo(s, slot.x, slot.z, s.onIce || s.isGoalie ? 6.5 : 7.5, dt, () => {
                    // tutti guardano il centro della festa, l'MVP guarda la telecamera
                    const isMvp = mvp && s === mvp.skater;
                    const lx = isMvp ? camera.position.x : pg.gather.x, lz = isMvp ? camera.position.z : pg.gather.z;
                    s.rotationY = Math.atan2(-(lx - s.mesh.position.x), -(lz - s.mesh.position.z));
                    s.mesh.rotation.y = s.rotationY;
                    applyGoalCelebrationPose(s, t + (s._cmSeed = s._cmSeed || Math.random() * 3), isMvp);
                });
                void arrived;
            } else if (!s.isGoalie && !s.onIce) {
                setSkaterBenchPose(s, false);
            } else {
                // sconfitti: rientro lento, testa bassa
                const door = W ? benchDoor(s.team) : benchDoor(s.team);
                const tx = s.isGoalie ? 0 : door.x - ((s.lineIndex || 0) % 2) * 1.2;
                const tz = s.isGoalie ? ownGoalZ(s.team) * 0.95 : door.z + ((s._cmSeed = s._cmSeed || Math.random()) - 0.5) * 3;
                glideTo(s, tx, tz, 2.2, dt, () => {
                    setSkaterHockeyReadyPose(s, 0, 0);
                    s.bodyPivot.rotation.x = W ? 0.38 : 0.1;
                });
                if (W) s.bodyPivot.rotation.x = Math.max(s.bodyPivot.rotation.x, 0.3);
            }
        });
        referees.forEach(r => glideTo(r, -rinkWidth / 2 + 1.6, r.side * 1.2, 3, dt));
        if (typeof updateCrowd === 'function') updateCrowd(dt);
        if (typeof updateBenchStaff === 'function') updateBenchStaff(dt);
        // coriandoli nei colori del vincitore
        if (W) {
            pg.confetti -= dt;
            if (pg.confetti <= 0 && pg.t < 14) {
                pg.confetti = 0.45;
                const cols = colorsOf(W).concat(['#ffffff', '#f6b511']).map(c => parseInt(String(c).replace('#', ''), 16));
                const p = pg.gather.clone().add(V((Math.random() - 0.5) * 7, 5 + Math.random() * 2, (Math.random() - 0.5) * 6));
                cols.forEach(c => spawnSparkParticles(p, c, 10, 5.5, true));
            }
        }
        if (typeof updateVfxParticles === 'function') updateVfxParticles(dt);
        // telecamera: giro attorno alla festa, poi primo piano dell'MVP
        const focusSk = mvp && mvp.skater;
        if (pg.t < 5.5 || !focusSk) {
            const a = 0.6 + pg.t * 0.32;
            const c = pg.gather;
            camBlend(V(c.x + Math.cos(a) * 10, 4.8 - Math.min(1.2, pg.t * 0.2), c.z + Math.sin(a) * 8), V(c.x, 1.1, c.z), dt, pg.t < 1.5 ? 1.4 : 2);
        } else {
            const p = focusSk.mesh.position;
            const slot = pg.slots.get(focusSk) || p;
            const away = Math.sign(slot.z - pg.gather.z) || 1;      // telecamera dal lato opposto alla festa
            const a = (pg.t - 5.5) * 0.12;
            camBlend(V(p.x + Math.sin(a) * 2.2, 2.1, p.z + away * 4.2), V(p.x, 1.35, p.z + away * 0.4), dt, 1.5);
            if (!pg.mvpShown) { pg.mvpShown = true; const m = ui.pg.querySelector('.pg-mvp'); if (m) m.classList.add('is-on'); }
        }
        if (!pg.mvpShown && !focusSk && pg.t > 3) { pg.mvpShown = true; const m = ui.pg.querySelector('.pg-mvp'); if (m) m.classList.add('is-on'); }
    }
    function endPostMatch() {
        if (!pg) return;
        ui.pg.classList.add('cm-hidden');
        // la festa continua dietro al riepilogo finale
        openMatchStatsModal(true);
    }
    // la festa si chiude quando si esce dalla partita (menu, rivincita, competizione)
    function reset() {
        pg = null; pb = null; cam = null;
        if (ui) { ui.pb.classList.add('cm-hidden'); ui.pg.classList.add('cm-hidden'); }
    }

    window.Ceremony = {
        startPeriodBreak, updatePeriodBreak, startPostMatch, updatePostMatch, reset,
        mvpHtml: () => mvpHtml(),
        getMvp: () => mvp,
        clearMvp: () => { mvp = null; snap = null; },
        isOverlayOpen: () => !!ui && (!ui.pb.classList.contains('cm-hidden') || !ui.pg.classList.contains('cm-hidden'))
    };
})();
