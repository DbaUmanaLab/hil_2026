// --- src/competition/competition.js ---
// Modalità Competizione: Serie A (attiva) e Coppa Italia (in arrivo).
// Script classico caricato dopo lo script principale di index.html: usa i suoi globali
// (CLUB_ROSTERS, CLUB_RATINGS, ARENA_CATALOG, HOME_CLUB_ARENAS, matchConfig,
//  launchMatchFromCurrentConfig, logoSrcOf, titleSplashScreen, showFunFactLoading, ...).
//
// SERIE A
//  - Regular season: girone unico all'italiana, andata e ritorno; con un numero dispari di
//    squadre ogni giornata una squadra riposa. Niente pareggi: 3 punti alla vittoria nei
//    regolamentari, 2 a quella al supplementare/rigori, 1 alla sconfitta al supplementare/rigori.
//  - Play-off scudetto: prime 8, quarti al meglio delle 3, semifinali e finale al meglio delle 5.
//  - L'utente gioca (o simula) le partite della sua squadra; tutte le altre le simula la CPU.
//  - Salvataggi in localStorage con nome assegnato automaticamente; autosalvataggio a ogni turno.
(function () {
    const SAVE_KEY = 'hil_comp_saves';
    const PLAYOFF_TEAMS = 8;
    const PO_ROUNDS = [
        { id: 'QF', label: 'Quarti di finale', bestOf: 3 },
        { id: 'SF', label: 'Semifinali', bestOf: 5 },
        { id: 'F', label: 'Finale scudetto', bestOf: 5 }
    ];

    let state = null;           // stagione in corso (serializzabile)
    let matchActive = false;    // l'utente sta giocando una partita della competizione
    let pendingFixture = null;  // { kind: 'regular'|'playoff', ref }
    let selectedTeam = null;
    let hubTab = 'table';
    let root = null;

    // ------------------------------------------------------------------ utilità
    const $ = (sel, el) => (el || root).querySelector(sel);
    const club = id => CLUB_ROSTERS[id];
    const clubName = id => (club(id) ? club(id).name : id);
    const logo = id => (typeof logoSrcOf === 'function' ? logoSrcOf(id) : `assets/logos/${id}.png`);
    const ratingOf = id => (typeof CLUB_RATINGS !== 'undefined' && CLUB_RATINGS[id]) || { off: 70, def: 70, goa: 70 };
    const arenaOf = id => (HOME_CLUB_ARENAS[id] || id);
    const arenaTitle = id => { const a = ARENA_CATALOG[arenaOf(id)]; return a ? a.shortTitle : ''; };
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    function seasonLabel() {
        const d = new Date();
        const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
        return `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
    }
    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function poisson(l) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; }
    function serieATeams() { return CLUB_IDS.filter(id => club(id) && club(id).league === 'SERIE A'); }

    // ------------------------------------------------------------------ calendario (metodo del cerchio)
    function buildSchedule(teams) {
        const t = shuffle(teams.slice());
        if (t.length % 2) t.push(null);                  // null = turno di riposo
        const n = t.length, half = n / 2, rounds = [];
        const arr = t.slice();
        for (let r = 0; r < n - 1; r++) {
            const fixtures = []; let bye = null;
            for (let i = 0; i < half; i++) {
                let h = arr[i], a = arr[n - 1 - i];
                if (i === 0 && r % 2) [h, a] = [a, h];    // alterna casa/trasferta della squadra fissa
                else if (i > 0 && i % 2 === 1) [h, a] = [a, h];
                if (h === null || a === null) { bye = h || a; continue; }
                fixtures.push({ home: h, away: a, result: null });
            }
            rounds.push({ fixtures, bye });
            arr.splice(1, 0, arr.pop());                 // rotazione, il primo resta fisso
        }
        const back = rounds.map(r => ({ fixtures: r.fixtures.map(f => ({ home: f.away, away: f.home, result: null })), bye: r.bye }));
        return rounds.concat(back);
    }

    // ------------------------------------------------------------------ simulazione partite CPU
    function strength(id) { const r = ratingOf(id); return { off: r.off, def: r.def * 0.55 + r.goa * 0.45, goa: r.goa }; }
    function simulateMatch(home, away) {
        const H = strength(home), A = strength(away);
        const lamH = 3.0 * Math.pow(H.off / A.def, 2.2) * 1.08;
        const lamA = 3.0 * Math.pow(A.off / H.def, 2.2);
        let hg = poisson(lamH), ag = poisson(lamA);
        if (hg !== ag) return { hg, ag, type: 'REG' };
        const pHome = 1 / (1 + Math.exp(-((H.off + H.def) - (A.off + A.def)) / 12)) + 0.03;
        if (Math.random() < 0.6) {                       // deciso dal golden goal
            if (Math.random() < pHome) hg++; else ag++;
            return { hg, ag, type: 'OT' };
        }
        const so = simulateShootoutScore(home, away);
        return { hg, ag, type: 'SO', soWinner: so.winner, so: [so.home, so.guest] };
    }
    function shooterProb(shooterTeam, goalieTeam) {
        return Math.min(0.62, Math.max(0.22, 0.36 + (ratingOf(shooterTeam).off - ratingOf(goalieTeam).goa) * 0.012));
    }
    function simulateShootoutScore(home, away, withKicks) {
        const pH = shooterProb(home, away), pA = shooterProb(away, home);
        let h = 0, a = 0; const kicks = [];
        for (let i = 0; i < 5; i++) {
            const kh = Math.random() < pH; h += kh; kicks.push({ side: 'home', goal: kh });
            if (h > a + (5 - i - 1) + 1 || a > h + (5 - i - 1)) break;
            const ka = Math.random() < pA; a += ka; kicks.push({ side: 'guest', goal: ka });
            if (h > a + (5 - i - 1) || a > h + (5 - i - 1)) break;
        }
        while (h === a) {                                // a oltranza
            const kh = Math.random() < pH, ka = Math.random() < pA;
            h += kh; a += ka;
            kicks.push({ side: 'home', goal: kh }, { side: 'guest', goal: ka });
        }
        return { home: h, guest: a, winner: h > a ? 'home' : 'away', kicks: withKicks ? kicks : undefined };
    }
    function winnerOf(f) {
        const r = f.result; if (!r) return null;
        if (r.hg > r.ag) return f.home; if (r.ag > r.hg) return f.away;
        return r.soWinner === 'home' ? f.home : f.away;
    }

    // ------------------------------------------------------------------ classifica
    function standings() {
        const rows = {};
        state.teams.forEach(id => { rows[id] = { id, pg: 0, v: 0, vs: 0, ps: 0, p: 0, gf: 0, gs: 0, pts: 0 }; });
        state.rounds.forEach(r => r.fixtures.forEach(f => {
            if (!f.result) return;
            const H = rows[f.home], A = rows[f.away], res = f.result, w = winnerOf(f);
            H.pg++; A.pg++;
            H.gf += res.hg; H.gs += res.ag; A.gf += res.ag; A.gs += res.hg;
            const W = rows[w], L = w === f.home ? A : H;
            if (res.type === 'REG') { W.v++; W.pts += 3; L.p++; }
            else { W.vs++; W.pts += 2; L.ps++; L.pts += 1; }
        }));
        return Object.values(rows).sort((a, b) => b.pts - a.pts || b.v - a.v || (b.gf - b.gs) - (a.gf - a.gs) || b.gf - a.gf || clubName(a.id).localeCompare(clubName(b.id)));
    }

    // ------------------------------------------------------------------ play-off
    function createPlayoffs() {
        const seeds = standings().slice(0, PLAYOFF_TEAMS).map(r => r.id);
        state.playoffs = { seeds, round: 0, series: [], turnNo: 0 };
        const pairs = [[0, 7], [3, 4], [1, 6], [2, 5]];   // tabellone fisso: 1-8 / 4-5 e 2-7 / 3-6
        state.playoffs.series.push(pairs.map(([a, b]) => newSeries(seeds[a], seeds[b], 0)));
        state.phase = 'playoff';
    }
    function newSeries(hi, lo, roundIdx) { return { hi, lo, bestOf: PO_ROUNDS[roundIdx].bestOf, games: [] }; }
    function seriesWins(s) {
        let w = [0, 0];
        s.games.forEach(g => { if (g.result) { const win = winnerOf(g); w[win === s.hi ? 0 : 1]++; } });
        return w;
    }
    function seriesWinner(s) { const w = seriesWins(s), need = Math.ceil(s.bestOf / 2); return w[0] >= need ? s.hi : (w[1] >= need ? s.lo : null); }
    // la gara della serie relativa al turno corrente (anche se già giocata dall'utente)
    function turnGame(s) {
        const g = s.games.find(x => x.turn === state.playoffs.turnNo);
        if (g) return g;
        return seriesWinner(s) ? null : nextSeriesGame(s);
    }
    function seedOf(id) { return state.playoffs ? state.playoffs.seeds.indexOf(id) + 1 : 0; }
    // la prossima gara di una serie: la miglior classificata gioca in casa le gare dispari
    function nextSeriesGame(s) {
        if (seriesWinner(s)) return null;
        // una sola gara per serie e per turno: quella creata nel turno corrente
        const turn = state.playoffs.turnNo;
        let g = s.games.find(x => x.turn === turn) || s.games.find(x => !x.result);
        if (!g) {
            const n = s.games.length + 1;
            g = n % 2 ? { home: s.hi, away: s.lo, result: null, n, turn } : { home: s.lo, away: s.hi, result: null, n, turn };
            s.games.push(g);
        }
        return g;
    }
    function currentPoSeries() { return state.playoffs.series[state.playoffs.round]; }
    function advancePlayoffRoundIfDone() {
        const po = state.playoffs, cur = currentPoSeries();
        if (!cur.every(s => seriesWinner(s))) return;
        const winners = cur.map(seriesWinner);
        if (po.round === PO_ROUNDS.length - 1) {
            state.champion = winners[0];
            state.phase = 'done';
            return;
        }
        const next = [];
        for (let i = 0; i < winners.length; i += 2) {
            const a = winners[i], b = winners[i + 1];
            next.push(seedOf(a) < seedOf(b) ? newSeries(a, b, po.round + 1) : newSeries(b, a, po.round + 1));
        }
        po.round++;
        po.series.push(next);
    }

    // ------------------------------------------------------------------ avanzamento
    function userFixture() {
        if (state.phase === 'regular') {
            const r = state.rounds[state.roundIdx];
            return r ? r.fixtures.find(f => f.home === state.user || f.away === state.user) || null : null;
        }
        if (state.phase === 'playoff') {
            const s = currentPoSeries().find(x => x.hi === state.user || x.lo === state.user);
            return s ? nextSeriesGame(s) : null;
        }
        return null;
    }
    // gioca (simulando) tutto ciò che resta del turno corrente e passa al successivo
    function completeTurn() {
        if (state.phase === 'regular') {
            const r = state.rounds[state.roundIdx];
            r.fixtures.forEach(f => { if (!f.result) f.result = simulateMatch(f.home, f.away); });
            state.lastTurn = { kind: 'regular', idx: state.roundIdx };
            state.roundIdx++;
            if (state.roundIdx >= state.rounds.length) createPlayoffs();
        } else if (state.phase === 'playoff') {
            const roundAtStart = state.playoffs.round;
            const played = [];
            currentPoSeries().forEach((s, si) => {
                const g = turnGame(s);
                if (!g) return;
                if (!g.result) g.result = simulateMatch(g.home, g.away);
                played.push({ si, n: g.n });
            });
            state.lastTurn = { kind: 'playoff', round: roundAtStart, played };
            state.playoffs.turnNo++;
            advancePlayoffRoundIfDone();
        }
        saveCurrent(true);
    }

    // ------------------------------------------------------------------ salvataggi
    function readSaves() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '[]'); } catch (e) { return []; } }
    function writeSaves(list) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
    function progressLabel(s) {
        if (s.phase === 'regular') return `Regular season • giornata ${Math.min(s.roundIdx + 1, s.rounds.length)} di ${s.rounds.length}`;
        if (s.phase === 'playoff') return `Play-off • ${PO_ROUNDS[s.playoffs.round].label}`;
        return `Stagione conclusa • Campione: ${clubName(s.champion)}`;
    }
    function saveCurrent(silent) {
        if (!state) return;
        const list = readSaves();
        const i = list.findIndex(x => x.id === state.id);
        const entry = { id: state.id, name: state.name, savedAt: Date.now(), data: state };
        if (i >= 0) list[i] = entry; else list.unshift(entry);
        const ok = writeSaves(list);
        if (!silent) toast(ok ? 'Partita salvata' : 'Salvataggio non riuscito');
    }
    function autoName(user) {
        const base = `${clubName(user)} • Serie A ${seasonLabel()}`;
        const same = readSaves().filter(s => s.name === base || s.name.startsWith(base + ' #')).length;
        return same ? `${base} #${same + 1}` : base;
    }

    // ------------------------------------------------------------------ interfaccia
    function ensureRoot() {
        if (root) return;
        if (!document.querySelector('link[data-comp-css]')) {
            const l = document.createElement('link');
            l.rel = 'stylesheet'; l.href = 'src/competition/competition.css'; l.dataset.compCss = '1';
            document.head.appendChild(l);
        }
        root = document.createElement('div');
        root.id = 'comp-root';
        root.className = 'cp-hidden';
        root.innerHTML = `<div class="cp-screen cp-hidden" data-screen="select"></div>
            <div class="cp-screen cp-hidden" data-screen="teams"></div>
            <div class="cp-screen cp-hidden" data-screen="hub"></div>`;
        document.body.appendChild(root);
        root.addEventListener('keydown', e => {
            if (e.key !== 'Escape') return;
            const cur = root.querySelector('.cp-screen:not(.cp-hidden)');
            if (!cur) return;
            if (cur.dataset.screen === 'teams') showScreen('select');
            else exitToMenu();
        });
    }
    function showScreen(name) {
        ensureRoot();
        root.classList.remove('cp-hidden');
        root.querySelectorAll('.cp-screen').forEach(s => s.classList.toggle('cp-hidden', s.dataset.screen !== name));
        if (name === 'select') renderSelect();
        if (name === 'teams') renderTeams();
        if (name === 'hub') renderHub();
        const first = root.querySelector(`[data-screen="${name}"] [data-focus]`);
        if (first) first.focus({ preventScroll: true });
    }
    function hideRoot() { if (root) root.classList.add('cp-hidden'); }
    function toast(msg) {
        const t = document.createElement('div');
        t.className = 'cp-toast'; t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2200);
    }
    function exitToMenu() {
        if (state) saveCurrent(true);
        hideRoot();
        // ripristina la squadra controllata preferita delle amichevoli
        try { matchConfig.userTeam = localStorage.getItem('hil_user_team') === 'guest' ? 'guest' : 'home'; } catch (e) {}
        titleSplashScreen.classList.remove('hidden');
    }

    // --- 1. scelta della competizione + partite salvate
    function renderSelect() {
        const el = root.querySelector('[data-screen="select"]');
        const saves = readSaves();
        el.innerHTML = `
            <div class="cp-head">
                <div class="cp-head-titles"><span class="cp-kicker">Modalità torneo</span><span class="cp-title">Competizione</span></div>
                <div class="cp-head-right"><button class="cp-btn" data-act="back">◀ Menu</button></div>
            </div>
            <div class="cp-comp-grid">
                <div class="cp-comp-card" tabindex="0" role="button" data-act="serie-a" data-focus>
                    <div class="cp-comp-logo"><img src="assets/logos/serie_a.png" alt="Serie A"></div>
                    <h3>Campionato di Serie A</h3>
                    <p>${serieATeams().length} squadre • andata e ritorno • play-off scudetto</p>
                </div>
                <div class="cp-comp-card is-locked" aria-disabled="true">
                    <span class="cp-lock">Prossimamente</span>
                    <div class="cp-comp-logo"><img src="assets/logos/coppa_italia.png" alt="Coppa Italia"></div>
                    <h3>Coppa Italia</h3>
                    <p>Eliminazione diretta</p>
                </div>
            </div>
            <div class="cp-panel cp-saves">
                <div class="cp-panel-title"><span>Stagioni salvate</span><b>${saves.length}</b></div>
                <div class="cp-saves-list">${saves.length ? saves.map(s => `
                    <div class="cp-save-row">
                        <img src="${logo(s.data.user)}" alt="">
                        <div style="min-width:0"><div class="n">${esc(s.name)}</div>
                            <div class="s">${esc(progressLabel(s.data))} • ${new Date(s.savedAt).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</div></div>
                        <div class="a"><button class="cp-btn is-small is-primary" data-load="${s.id}">Carica</button><button class="cp-btn is-small is-danger" data-del="${s.id}">Elimina</button></div>
                    </div>`).join('') : '<div class="cp-empty">Nessuna stagione salvata</div>'}</div>
            </div>`;
        el.querySelector('[data-act="back"]').onclick = exitToMenu;
        const sa = el.querySelector('[data-act="serie-a"]');
        sa.onclick = () => { selectedTeam = selectedTeam || serieATeams()[0]; showScreen('teams'); };
        sa.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sa.click(); } };
        el.querySelectorAll('[data-load]').forEach(b => b.onclick = () => {
            const s = readSaves().find(x => x.id === b.dataset.load);
            if (!s) return;
            state = s.data;
            hubTab = state.phase === 'regular' ? 'table' : 'bracket';
            showScreen('hub');
        });
        el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
            if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Conferma'; return; }
            writeSaves(readSaves().filter(x => x.id !== b.dataset.del));
            renderSelect();
        });
    }

    // --- 2. scelta della squadra
    function stars(id) {
        const r = ratingOf(id), avg = (r.off + r.def + r.goa) / 3;
        const n = Math.max(1, Math.min(5, Math.round((avg - 60) / 5)));
        return '★'.repeat(n) + `<i>${'★'.repeat(5 - n)}</i>`;
    }
    function renderTeams() {
        const el = root.querySelector('[data-screen="teams"]');
        const teams = serieATeams();
        if (!teams.includes(selectedTeam)) selectedTeam = teams[0];
        const r = ratingOf(selectedTeam);
        el.innerHTML = `
            <div class="cp-head">
                <img class="cp-head-logo" src="assets/logos/serie_a.png" alt="">
                <div class="cp-head-titles"><span class="cp-kicker">Serie A ${seasonLabel()}</span><span class="cp-title">Scegli la tua squadra</span></div>
                <div class="cp-head-right"><span class="cp-pill">Le altre ${teams.length - 1} squadre sono guidate dalla CPU</span></div>
            </div>
            <div class="cp-team-layout">
                <div class="cp-panel" style="display:flex;flex-direction:column;min-height:0">
                    <div class="cp-panel-title"><span>Squadre partecipanti</span><b>${teams.length}</b></div>
                    <div class="cp-team-grid">${teams.map(id => `
                        <button type="button" class="cp-team-tile${id === selectedTeam ? ' is-active' : ''}" data-team="${id}" ${id === selectedTeam ? 'data-focus' : ''}>
                            <img src="${logo(id)}" alt=""><span>${esc(club(id).shortName || club(id).name)}</span>
                        </button>`).join('')}</div>
                </div>
                <div class="cp-panel cp-team-side">
                    <img class="crest" src="${logo(selectedTeam)}" alt="">
                    <div class="name">${esc(clubName(selectedTeam))}</div>
                    <div class="arena">${esc(arenaTitle(selectedTeam))}</div>
                    <div class="cp-ratings"><div><small>OFF</small><b>${r.off}</b></div><div><small>DEF</small><b>${r.def}</b></div><div><small>GOA</small><b>${r.goa}</b></div></div>
                    <div class="cp-stars">${stars(selectedTeam)}</div>
                </div>
            </div>
            <div class="cp-foot">
                <button class="cp-btn" data-act="back">◀ Competizioni</button>
                <span class="cp-hint">Frecce per scegliere • Invio per iniziare</span>
                <span class="cp-spacer"></span>
                <button class="cp-btn is-primary" data-act="start">Inizia la stagione ▶</button>
            </div>`;
        el.querySelector('[data-act="back"]').onclick = () => showScreen('select');
        el.querySelector('[data-act="start"]').onclick = () => startSeason(selectedTeam);
        el.querySelectorAll('[data-team]').forEach(b => {
            b.onclick = () => { selectedTeam = b.dataset.team; renderTeams(); const f = el.querySelector('[data-focus]'); if (f) f.focus(); };
            b.ondblclick = () => startSeason(b.dataset.team);
            b.onkeydown = e => {
                const i = teams.indexOf(b.dataset.team), cols = window.innerWidth <= 900 ? 2 : 3;
                const mv = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
                if (mv) { e.preventDefault(); selectedTeam = teams[(i + mv + teams.length) % teams.length]; renderTeams(); el.querySelector('[data-focus]').focus(); }
                if (e.key === 'Enter') { e.preventDefault(); startSeason(selectedTeam); }
            };
        });
    }
    function startSeason(user) {
        const teams = serieATeams();
        state = {
            id: 'c' + Date.now().toString(36),
            name: autoName(user),
            comp: 'serie_a',
            season: seasonLabel(),
            user,
            teams,
            rounds: buildSchedule(teams),
            roundIdx: 0,
            phase: 'regular',
            playoffs: null,
            champion: null,
            lastTurn: null
        };
        hubTab = 'table';
        saveCurrent(true);
        showScreen('hub');
        toast('Nuova stagione • salvata come "' + state.name + '"');
    }

    // --- 3. hub della stagione
    function scoreCell(f) {
        if (!f.result) return '<span class="sc tbd">—</span>';
        const r = f.result;
        const tag = r.type === 'OT' ? 'supplementare' : (r.type === 'SO' ? `rigori ${r.so[0]}-${r.so[1]}` : '');
        return `<span class="sc">${r.hg} - ${r.ag}${tag ? `<em>${tag}</em>` : ''}</span>`;
    }
    function resultRow(f) {
        const w = winnerOf(f);
        const cls = id => (w ? (w === id ? 'win' : 'lose') : '');
        const user = f.home === state.user || f.away === state.user;
        return `<div class="cp-res${user ? ' is-user' : ''}">
            <div class="h ${cls(f.home)}"><span>${esc(club(f.home).shortName || clubName(f.home))}</span><img src="${logo(f.home)}" alt=""></div>
            ${scoreCell(f)}
            <div class="a ${cls(f.away)}"><img src="${logo(f.away)}" alt=""><span>${esc(club(f.away).shortName || clubName(f.away))}</span></div>
        </div>`;
    }
    function tableHtml() {
        const rows = standings();
        return `<div class="cp-table-wrap"><table class="cp-table">
            <thead><tr><th>#</th><th class="l">Squadra</th><th>PG</th><th>V</th><th title="Vittorie al supplementare o ai rigori">VS</th><th title="Sconfitte al supplementare o ai rigori">PS</th><th>P</th><th class="hide-sm">GF</th><th class="hide-sm">GS</th><th>DR</th><th>PT</th></tr></thead>
            <tbody>${rows.map((r, i) => `
                <tr class="${r.id === state.user ? 'is-user ' : ''}${i < PLAYOFF_TEAMS ? 'is-po ' : ''}${i === PLAYOFF_TEAMS - 1 ? 'cut' : ''}">
                    <td class="pos">${i + 1}</td>
                    <td class="l"><span class="team"><img src="${logo(r.id)}" alt="">${esc(club(r.id).shortName || clubName(r.id))}</span></td>
                    <td>${r.pg}</td><td>${r.v}</td><td>${r.vs}</td><td>${r.ps}</td><td>${r.p}</td>
                    <td class="hide-sm">${r.gf}</td><td class="hide-sm">${r.gs}</td><td>${r.gf - r.gs > 0 ? '+' : ''}${r.gf - r.gs}</td>
                    <td class="pts">${r.pts}</td>
                </tr>`).join('')}</tbody></table></div>
            <div class="cp-legend"><span><b>■</b> Zona play-off (prime ${PLAYOFF_TEAMS})</span><span>Vittoria 3 pt • al supplementare/rigori 2 pt • sconfitta al supplementare/rigori 1 pt</span></div>`;
    }
    function bracketHtml() {
        if (!state.playoffs) return `<div class="cp-empty" style="margin:auto">Il tabellone dei play-off sarà pronto alla fine della regular season</div>`;
        const po = state.playoffs;
        return `<div class="cp-bracket">${PO_ROUNDS.map((rd, ri) => {
            const list = po.series[ri];
            const slots = ri === 0 ? 4 : (ri === 1 ? 2 : 1);
            let html = `<div class="cp-round"><h4>${rd.label} • al meglio di ${rd.bestOf}</h4>`;
            for (let k = 0; k < slots; k++) {
                const s = list && list[k];
                if (!s) { html += `<div class="cp-series"><div class="tbd">Da definire</div></div>`; continue; }
                const w = seriesWins(s), win = seriesWinner(s);
                const row = (id, n) => `<div class="row${win ? (win === id ? ' won' : ' out') : ''}"><span class="seed">${seedOf(id)}</span><img src="${logo(id)}" alt=""><span>${esc(club(id).shortName || clubName(id))}</span><b>${n}</b></div>`;
                html += `<div class="cp-series${s.hi === state.user || s.lo === state.user ? ' is-user' : ''}">${row(s.hi, w[0])}${row(s.lo, w[1])}</div>`;
            }
            return html + '</div>';
        }).join('')}</div>`;
    }
    function nextMatchHtml() {
        if (state.phase === 'done') {
            return `<div class="cp-rest"><b>Stagione conclusa</b>Campione d'Italia: ${esc(clubName(state.champion))}</div>
                <div class="cp-next-actions"><button class="cp-btn is-primary" data-act="champion">Premiazione ▶</button></div>`;
        }
        const f = userFixture();
        let meta;
        if (state.phase === 'regular') meta = `Giornata ${state.roundIdx + 1} di ${state.rounds.length}`;
        else meta = PO_ROUNDS[state.playoffs.round].label;
        if (!f) {
            let why = 'Turno di riposo';
            if (state.phase === 'playoff') {
                const s = currentPoSeries().find(x => x.hi === state.user || x.lo === state.user);
                if (s && seriesWinner(s) === state.user) why = 'Serie vinta • in attesa';
                else why = state.playoffs.seeds.includes(state.user) ? 'Eliminati dai play-off' : 'Fuori dai play-off';
            }
            return `<div class="cp-next-meta"><span>${meta}</span><span>${esc(clubName(state.user))}</span></div>
                <div class="cp-rest"><b>${why}</b>Le partite di questo turno sono giocate dalla CPU</div>
                <div class="cp-next-actions"><button class="cp-btn is-primary" data-act="sim-turn" data-focus>Simula il turno ▶</button></div>`;
        }
        let extra = '';
        if (state.phase === 'playoff') {
            const s = currentPoSeries().find(x => x.hi === state.user || x.lo === state.user);
            const w = seriesWins(s);
            extra = `Gara ${f.n} • serie ${w[s.hi === state.user ? 0 : 1]}-${w[s.hi === state.user ? 1 : 0]}`;
        }
        const side = (id, lbl) => `<div class="side${id === state.user ? ' is-user' : ''}"><img src="${logo(id)}" alt=""><span>${esc(club(id).shortName || clubName(id))}</span><small>${lbl}</small></div>`;
        return `<div class="cp-next-meta"><span>${meta}</span><span>${extra}</span></div>
            <div class="cp-versus">${side(f.home, 'CASA')}<span class="cp-vs">VS</span>${side(f.away, 'OSPITE')}</div>
            <div class="cp-next-arena">${esc(arenaTitle(f.home))}</div>
            <div class="cp-next-actions">
                <button class="cp-btn is-primary" data-act="play" data-focus>Gioca ▶</button>
                <button class="cp-btn" data-act="sim">Simula partita</button>
            </div>`;
    }
    function lastResultsHtml() {
        const lt = state.lastTurn;
        if (!lt) return { title: 'Risultati', body: '<div class="cp-empty">Nessuna partita giocata</div>' };
        if (lt.kind === 'regular') {
            const r = state.rounds[lt.idx];
            return {
                title: `Risultati • giornata ${lt.idx + 1}`,
                body: r.fixtures.map(resultRow).join('') + (r.bye ? `<div class="cp-res-rest">Riposa: ${esc(clubName(r.bye))}</div>` : '')
            };
        }
        const list = state.playoffs.series[lt.round];
        return {
            title: `Risultati • ${PO_ROUNDS[lt.round].label}`,
            body: lt.played.map(p => { const s = list[p.si]; const g = s.games.find(x => x.n === p.n); return g ? resultRow(g) : ''; }).join('')
        };
    }
    function upcomingHtml() {
        if (state.phase !== 'regular') return '';
        const r = state.rounds[state.roundIdx];
        if (!r) return '';
        const others = r.fixtures.filter(f => f.home !== state.user && f.away !== state.user);
        return `<div class="cp-panel" style="display:flex;flex-direction:column;min-height:0;flex:1">
            <div class="cp-panel-title"><span>Giornata ${state.roundIdx + 1} • altre partite</span></div>
            <div class="cp-results">${others.map(resultRow).join('')}${r.bye ? `<div class="cp-res-rest">Riposa: ${esc(clubName(r.bye))}</div>` : ''}</div></div>`;
    }
    function renderHub() {
        const el = root.querySelector('[data-screen="hub"]');
        const phaseTxt = state.phase === 'regular' ? 'Regular season' : (state.phase === 'playoff' ? 'Play-off scudetto' : 'Stagione conclusa');
        const lr = lastResultsHtml();
        el.innerHTML = `
            <div class="cp-head">
                <img class="cp-head-logo" src="assets/logos/serie_a.png" alt="">
                <div class="cp-head-titles"><span class="cp-kicker">${phaseTxt}</span><span class="cp-title">Serie A ${esc(state.season)}</span></div>
                <div class="cp-head-right">
                    <span class="cp-pill"><img src="${logo(state.user)}" alt="">${esc(clubName(state.user))}</span>
                    <span class="cp-pill">${esc(progressLabel(state).split(' • ').slice(-1)[0])}</span>
                </div>
            </div>
            <div class="cp-hub">
                <div class="cp-panel" style="display:flex;flex-direction:column;min-height:0">
                    <div class="cp-panel-title">
                        <div class="cp-tabs"><button class="cp-tab${hubTab === 'table' ? ' is-active' : ''}" data-tab="table">Classifica</button><button class="cp-tab${hubTab === 'bracket' ? ' is-active' : ''}" data-tab="bracket">Play-off</button></div>
                        <span>${hubTab === 'table' ? 'Regular season' : 'Tabellone'}</span>
                    </div>
                    ${hubTab === 'table' ? tableHtml() : bracketHtml()}
                </div>
                <div class="cp-col">
                    <div class="cp-panel"><div class="cp-panel-title"><span>Prossima partita</span></div><div class="cp-next">${nextMatchHtml()}</div></div>
                    <div class="cp-panel" style="display:flex;flex-direction:column;min-height:0;flex:1">
                        <div class="cp-panel-title"><span>${lr.title}</span></div>
                        <div class="cp-results">${lr.body}</div>
                    </div>
                    ${upcomingHtml()}
                </div>
            </div>
            <div class="cp-foot">
                <button class="cp-btn" data-act="exit">◀ Esci</button>
                <span class="cp-hint">Salvataggio automatico dopo ogni turno • "${esc(state.name)}"</span>
                <span class="cp-spacer"></span>
                <button class="cp-btn" data-act="save">Salva</button>
            </div>`;
        el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { hubTab = b.dataset.tab; renderHub(); });
        el.querySelector('[data-act="exit"]').onclick = exitToMenu;
        el.querySelector('[data-act="save"]').onclick = () => saveCurrent(false);
        const on = (act, fn) => { const b = el.querySelector(`[data-act="${act}"]`); if (b) b.onclick = fn; };
        on('play', playUserMatch);
        on('sim', () => { const f = userFixture(); if (f && !f.result) f.result = simulateMatch(f.home, f.away); finishTurn(); });
        on('sim-turn', finishTurn);
        on('champion', showChampion);
    }
    function finishTurn() {
        const wasRegular = state.phase === 'regular';
        completeTurn();
        if (wasRegular && state.phase === 'playoff') {
            hubTab = 'bracket';
            const pos = standings().findIndex(r => r.id === state.user) + 1;
            toast(`Regular season conclusa • ${clubName(state.user)} ${pos}° ${pos <= PLAYOFF_TEAMS ? '• qualificata ai play-off' : '• fuori dai play-off'}`);
        }
        showScreen('hub');
        if (state.phase === 'done') showChampion();
    }
    function showChampion() {
        const o = document.createElement('div');
        o.className = 'cp-overlay';
        const isUser = state.champion === state.user;
        o.innerHTML = `<div class="cp-panel cp-dialog">
            <span class="cp-kicker">Serie A ${esc(state.season)} • Finale scudetto</span>
            <img class="cp-champ-crest" src="${logo(state.champion)}" alt="">
            <h2>${esc(clubName(state.champion))}<br>Campione d'Italia</h2>
            <p>${isUser ? 'Scudetto! Una stagione da ricordare.' : `${esc(clubName(state.user))} chiude la stagione. Ci si riprova l'anno prossimo!`}</p>
            <div class="cp-next-actions"><button class="cp-btn" data-x="hub">Classifica</button><button class="cp-btn is-primary" data-x="menu">Torna al menu ▶</button></div>
        </div>`;
        document.body.appendChild(o);
        o.querySelector('[data-x="hub"]').onclick = () => o.remove();
        o.querySelector('[data-x="menu"]').onclick = () => { o.remove(); exitToMenu(); };
        if (window.gameAudio && window.gameAudio.playStinger) window.gameAudio.playStinger('victory');
    }

    // ------------------------------------------------------------------ partita dell'utente
    function kitDistance(a, b) {
        const c = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
        const x = c(a), y = c(b);
        return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
    }
    function playUserMatch() {
        const f = userFixture();
        if (!f) return;
        const H = club(f.home), A = club(f.away);
        const homeKit = Object.keys(H.kits)[0];
        const awayKit = Object.keys(A.kits).sort((k1, k2) => kitDistance(A.kits[k2].primary, H.kits[homeKit].primary) - kitDistance(A.kits[k1].primary, H.kits[homeKit].primary))[0];
        matchConfig.homeClub = f.home;
        matchConfig.guestClub = f.away;
        matchConfig.homeKit = homeKit;
        matchConfig.guestKit = awayKit;
        matchConfig.arena = arenaOf(f.home);
        matchConfig.userTeam = f.home === state.user ? 'home' : 'guest';   // non tocca la preferenza salvata
        pendingFixture = f;
        matchActive = true;
        hideRoot();
        const label = state.phase === 'regular' ? `Serie A • Giornata ${state.roundIdx + 1}` : `Serie A • ${PO_ROUNDS[state.playoffs.round].label}`;
        if (typeof showFunFactLoading === 'function') showFunFactLoading(label, launchMatchFromCurrentConfig);
        else launchMatchFromCurrentConfig();
    }
    function onUserMatchFinished(res) {
        matchActive = false;
        if (pendingFixture && !pendingFixture.result) {
            pendingFixture.result = { hg: res.hg, ag: res.ag, type: res.type };
            if (res.type === 'SO') { pendingFixture.result.soWinner = res.soWinner === 'home' ? 'home' : 'away'; pendingFixture.result.so = res.so; }
        }
        pendingFixture = null;
        finishTurn();
    }
    function onUserMatchAbandoned() {
        matchActive = false;
        pendingFixture = null;
        showScreen('hub');
        toast('Partita abbandonata • non è stata conteggiata');
    }

    // ------------------------------------------------------------------ rigori (simulati, mostrati a schermo)
    function runShootout(done) {
        const home = matchConfig.homeClub, guest = matchConfig.guestClub;
        const so = simulateShootoutScore(home, guest, true);
        const o = document.createElement('div');
        o.className = 'cp-overlay';
        const row = (id, side) => `<div class="cp-so-row"><img src="${logo(id)}" alt=""><span>${esc(club(id).shortName || clubName(id))}</span>
            <div class="wrap"><div class="cp-so-kicks" data-side="${side}"></div></div><b data-score="${side}">0</b></div>`;
        o.innerHTML = `<div class="cp-panel cp-dialog">
            <span class="cp-kicker">Parità dopo il supplementare</span>
            <h2>Tiri di rigore</h2>
            <div class="cp-so">${row(home, 'home')}${row(guest, 'guest')}</div>
            <p data-so-msg>Si calcia…</p>
            <div class="cp-next-actions"><button class="cp-btn is-primary" data-x="ok" disabled>Continua ▶</button></div>
        </div>`;
        document.body.appendChild(o);
        const score = { home: 0, guest: 0 };
        let i = 0;
        const step = () => {
            if (i >= so.kicks.length) {
                o.querySelector('[data-so-msg]').textContent = `Vince ai rigori ${clubName(so.winner === 'home' ? home : guest)} (${so.home}-${so.guest})`;
                const btn = o.querySelector('[data-x="ok"]');
                btn.disabled = false; btn.focus();
                btn.onclick = () => { o.remove(); done({ home: so.home, guest: so.guest, winner: so.winner }); };
                return;
            }
            const k = so.kicks[i++];
            const dot = document.createElement('i');
            dot.className = k.goal ? 'g' : 'm';
            dot.textContent = k.goal ? '✓' : '✕';
            o.querySelector(`.cp-so-kicks[data-side="${k.side}"]`).appendChild(dot);
            if (k.goal) { score[k.side]++; o.querySelector(`[data-score="${k.side}"]`).textContent = score[k.side]; }
            if (window.gameAudio) { if (k.goal && window.gameAudio.playGoalHorn) window.gameAudio.playGoalHorn(); }
            setTimeout(step, 750);
        };
        setTimeout(step, 700);
    }

    window.Competition = {
        open() { ensureRoot(); showScreen('select'); },
        isMatchActive: () => matchActive,
        onUserMatchFinished,
        onUserMatchAbandoned,
        runShootout,
        // esposti per i test
        _simulateMatch: simulateMatch,
        _buildSchedule: buildSchedule
    };
})();
