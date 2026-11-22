// --- src/competition/competition.js ---
// Modalità Competizione: Serie A, Serie B e Coppa Italia.
// Script classico caricato dopo lo script principale di index.html: usa i suoi globali
// (CLUB_ROSTERS, CLUB_RATINGS, ARENA_CATALOG, HOME_CLUB_ARENAS, matchConfig,
//  launchMatchFromCurrentConfig, logoSrcOf, titleSplashScreen, showFunFactLoading, ...).
//
// SERIE A
//  - Regular season: girone unico all'italiana, andata e ritorno; con un numero dispari di
//    squadre ogni giornata una squadra riposa. Niente pareggi: 3 punti alla vittoria nei
//    regolamentari, 2 a quella al supplementare/rigori, 1 alla sconfitta al supplementare/rigori.
//  - Play-off: con almeno 8 squadre quarti (al meglio delle 3), semifinali e finale (al meglio delle 5);
//    con 4-7 squadre semifinali al meglio delle 3 e finale al meglio delle 5 (es. Serie B).
//
// COPPA ITALIA
//  - 8 squadre: quella dell'utente più le 7 migliori per rating; sorteggio libero.
//  - Tabellone a gare secche: quarti, semifinali e finale 1°-2° posto (stesse regole senza
//    pareggio: supplementare a golden goal e rigori). Gioca in casa la prima sorteggiata.
//
//  - L'utente gioca (o simula) le partite della sua squadra; tutte le altre le simula la CPU.
//  - Salvataggi in localStorage con nome assegnato automaticamente; autosalvataggio a ogni turno.
(function () {
    const SAVE_KEY = 'hil_comp_saves';
    // campionati a girone: nomi, loghi e titoli
    const LEAGUES = {
        'SERIE A': { comp: 'serie_a', name: 'Serie A', logo: 'assets/logos/serie_a.png', final: 'Finale scudetto', po: 'Play-off scudetto', champ: "Campione d'Italia", title: "Campione d'Italia" },
        'SERIE B': { comp: 'serie_b', name: 'Serie B', logo: 'assets/logos/serie_b.png', final: 'Finale promozione', po: 'Play-off promozione', champ: 'Campione di Serie B', title: 'Campione di Serie B • promossa in Serie A' }
    };
    const leagueOf = s => (s && s.league) || 'SERIE A';         // le stagioni salvate prima della Serie B sono di Serie A
    const L = s => LEAGUES[leagueOf(s)] || LEAGUES['SERIE A'];
    // turni dei play-off in base al numero di squadre del girone
    function poRounds(s) {
        s = s || state;
        const n = s && s.teams ? s.teams.length : 8, fin = L(s).final;
        if (n >= 8) return [{ id: 'QF', label: 'Quarti di finale', bestOf: 3 }, { id: 'SF', label: 'Semifinali', bestOf: 5 }, { id: 'F', label: fin, bestOf: 5 }];
        if (n >= 4) return [{ id: 'SF', label: 'Semifinali', bestOf: 3 }, { id: 'F', label: fin, bestOf: 5 }];
        return [{ id: 'F', label: fin, bestOf: 3 }];
    }
    const playoffTeams = s => Math.pow(2, poRounds(s).length);
    const CUP_TEAMS = 8;
    const CUP_ROUNDS = [
        { id: 'QF', label: 'Quarti di finale' },
        { id: 'SF', label: 'Semifinali' },
        { id: 'F', label: 'Finale 1°-2° posto' }
    ];
    // competizioni mostrate nel carosello di scelta
    const COMPS = [
        {
            id: 'serie_a', league: 'SERIE A', name: 'Campionato di Serie A', short: 'Serie A', logo: 'assets/logos/serie_a.png', active: true,
            desc: 'Girone unico all\'italiana con andata e ritorno, poi i play-off scudetto a serie.',
            facts: () => leagueFacts('SERIE A')
        },
        {
            id: 'serie_b', league: 'SERIE B', name: 'Campionato di Serie B', short: 'Serie B', logo: 'assets/logos/serie_b.png', active: true,
            desc: 'Girone all\'italiana con andata e ritorno, poi i play-off promozione: semifinali e finale a serie.',
            facts: () => leagueFacts('SERIE B')
        },
        {
            id: 'coppa_italia', name: 'Coppa Italia', short: 'Coppa Italia', logo: 'assets/logos/coppa_italia.png', active: true,
            desc: 'Tabellone a eliminazione diretta in gara secca: quarti, semifinali e finale 1°-2° posto.',
            facts: () => [[String(CUP_TEAMS), 'Squadre'], ['3', 'Turni'], ['Secca', 'Gara']]
        },
        {
            // campionato francese: si sblocca quando in configurazione ci sono abbastanza squadre della lega
            id: 'ligue_elite', name: 'Ligue Élite (Francia)', short: 'Ligue Élite', logo: 'assets/logos/ligue_elite_france.png', active: false,
            desc: 'Il massimo campionato francese di roller hockey (FFRS). Per ora c\'è solo FDB Villeneuve: si giocherà quando arriveranno le altre squadre francesi.',
            facts: () => [[String(CLUB_IDS.filter(id => club(id) && club(id).league === 'LIGUE ELITE').length), 'Squadre'], ['FFRS', 'Federazione'], ['Francia', 'Paese']]
        },
        {
            // campionato spagnolo: non ancora giocabile, per ora c'è solo il Molina Sport ACEGC
            id: 'liga_rfep', name: 'Liga Élite RFEP (Spagna)', short: 'Liga Élite', logo: 'assets/logos/rfep.png', active: false,
            desc: 'Il massimo campionato spagnolo di hockey in linea (Real Federación Española de Patinaje). Per ora c\'è solo il Molina Sport ACEGC di Las Palmas de Gran Canaria: si giocherà quando arriveranno le altre squadre spagnole.',
            facts: () => [[String(CLUB_IDS.filter(id => club(id) && club(id).league === 'RFEP').length), 'Squadre'], ['RFEP', 'Federazione'], ['Spagna', 'Paese']]
        }
    ];
    let compIdx = 0;
    const isCup = () => state && state.comp === 'coppa_italia';
    const compOf = id => COMPS.find(c => c.id === id) || COMPS[0];

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
    function leagueTeams(lg) { return CLUB_IDS.filter(id => club(id) && club(id).league === lg); }
    function serieATeams() { return leagueTeams('SERIE A'); }
    function leagueFacts(lg) {
        const n = leagueTeams(lg).length;
        return [[String(n), 'Squadre'], [String((n - (n % 2 ? 0 : 1)) * 2), 'Giornate'], ['Top ' + playoffTeams({ teams: leagueTeams(lg), league: lg }), 'Play-off']];
    }

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
        const nPo = playoffTeams();
        const seeds = standings().slice(0, nPo).map(r => r.id);
        state.playoffs = { seeds, round: 0, series: [], turnNo: 0 };
        // tabellone fisso: 1-8 / 4-5 e 2-7 / 3-6 (con 4 squadre 1-4 / 2-3)
        const pairs = nPo === 8 ? [[0, 7], [3, 4], [1, 6], [2, 5]] : (nPo === 4 ? [[0, 3], [1, 2]] : [[0, 1]]);
        state.playoffs.series.push(pairs.map(([a, b]) => newSeries(seeds[a], seeds[b], 0)));
        state.phase = 'playoff';
    }
    function newSeries(hi, lo, roundIdx) { return { hi, lo, bestOf: poRounds()[roundIdx].bestOf, games: [] }; }
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
        if (po.round === poRounds().length - 1) {
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

    // ------------------------------------------------------------------ Coppa Italia
    function avgRating(id) { const r = ratingOf(id); return (r.off + r.def + r.goa) / 3; }
    // l'utente più le migliori di Serie A per rating (se l'utente non è in Serie A: le migliori 8)
    function cupParticipants(user) {
        const inA = user && serieATeams().includes(user);
        const others = serieATeams().filter(id => id !== user).sort((a, b) => avgRating(b) - avgRating(a));
        return inA ? [user].concat(others.slice(0, CUP_TEAMS - 1)) : others.slice(0, CUP_TEAMS);
    }
    function createCup(user) {
        const teams = shuffle(cupParticipants(user));     // sorteggio libero
        const qf = [];
        for (let i = 0; i < teams.length; i += 2) qf.push({ home: teams[i], away: teams[i + 1], result: null });
        return { teams: teams.slice(), round: 0, rounds: [qf] };
    }
    function cupRoundLabel(i) { return CUP_ROUNDS[i] ? CUP_ROUNDS[i].label : ''; }
    function completeCupTurn() {
        const cup = state.cup, games = cup.rounds[cup.round];
        games.forEach(g => { if (!g.result) g.result = simulateMatch(g.home, g.away); });
        state.lastTurn = { kind: 'cup', round: cup.round };
        const winners = games.map(winnerOf);
        if (cup.round === CUP_ROUNDS.length - 1) {
            state.champion = winners[0];
            state.runnerUp = games[0].home === winners[0] ? games[0].away : games[0].home;
            state.phase = 'done';
            return;
        }
        const next = [];
        for (let i = 0; i < winners.length; i += 2) next.push({ home: winners[i], away: winners[i + 1], result: null });
        cup.round++;
        cup.rounds.push(next);
    }

    // ------------------------------------------------------------------ avanzamento
    function userFixture() {
        if (isCup()) {
            if (state.phase !== 'cup') return null;
            return state.cup.rounds[state.cup.round].find(f => !f.result && (f.home === state.user || f.away === state.user)) || null;
        }
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
        if (isCup()) {
            if (state.phase === 'cup') completeCupTurn();
        } else if (state.phase === 'regular') {
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
        if (s.comp === 'coppa_italia') {
            if (s.phase === 'cup') return `Coppa Italia • ${cupRoundLabel(s.cup.round)}`;
            return `Coppa conclusa • Vincitrice: ${clubName(s.champion)}`;
        }
        if (s.phase === 'regular') return `Regular season • giornata ${Math.min(s.roundIdx + 1, s.rounds.length)} di ${s.rounds.length}`;
        if (s.phase === 'playoff') return `Play-off • ${poRounds(s)[s.playoffs.round].label}`;
        return `Stagione conclusa • Campione: ${clubName(s.champion)}`;
    }
    function saveCurrent(silent) {
        if (!state || embedded) return;
        const list = readSaves();
        const i = list.findIndex(x => x.id === state.id);
        const entry = { id: state.id, name: state.name, savedAt: Date.now(), data: state };
        if (i >= 0) list[i] = entry; else list.unshift(entry);
        const ok = writeSaves(list);
        if (!silent) toast(ok ? 'Partita salvata' : 'Salvataggio non riuscito');
    }
    function autoName(user, compId) {
        const base = `${clubName(user)} • ${compOf(compId).short} ${seasonLabel()}`;
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
        if (name === 'hub') { renderHub(); setupHubSwitcher(); }
        const first = root.querySelector(`[data-screen="${name}"] [data-focus]`);
        if (first) first.focus({ preventScroll: true });
    }
    // Schermi piccoli: un riquadro dell'hub alla volta, con il selettore ◀ nome ▶ (niente colonna da scorrere)
    let hubPanelIdx = 1;    // 0 = classifica/tabellone, 1 = prossima partita (si parte da qui)
    const compactMq = window.matchMedia('(max-width: 900px), (max-height: 560px)');
    function setupHubSwitcher() {
        const hub = root && root.querySelector('[data-screen="hub"] .cp-hub');
        if (!hub) return;
        const panels = Array.from(hub.querySelectorAll(':scope > .cp-panel, :scope > .cp-col > .cp-panel'));
        let bar = hub.parentElement.querySelector('.cp-switch');
        if (!compactMq.matches) {
            hub.classList.remove('is-compact');
            panels.forEach(p => p.classList.remove('is-current'));
            if (bar) bar.remove();
            return;
        }
        hub.classList.add('is-compact');
        hubPanelIdx = Math.max(0, Math.min(panels.length - 1, hubPanelIdx));
        if (!bar) {
            bar = document.createElement('div');
            bar.className = 'cp-switch';
            bar.innerHTML = '<button type="button" class="cp-arrow is-small" data-sw="-1" aria-label="Riquadro precedente">&#9664;</button><div class="cp-switch-label"></div><button type="button" class="cp-arrow is-small" data-sw="1" aria-label="Riquadro successivo">&#9654;</button>';
            hub.insertAdjacentElement('beforebegin', bar);
            bar.addEventListener('click', e => {
                const b = e.target.closest('[data-sw]');
                if (!b) return;
                hubPanelIdx = (hubPanelIdx + (+b.dataset.sw) + panels.length) % panels.length;
                setupHubSwitcher();
            });
        }
        panels.forEach((p, i) => p.classList.toggle('is-current', i === hubPanelIdx));
        bar.querySelector('.cp-switch-label').innerHTML = `<b>${esc(panels[hubPanelIdx].dataset.label || '')}</b><span>${panels.map((p, i) => `<i class="${i === hubPanelIdx ? 'on' : ''}"></i>`).join('')}</span>`;
    }
    compactMq.addEventListener('change', () => { if (root && !root.classList.contains('cp-hidden')) setupHubSwitcher(); });
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
        const c = COMPS[compIdx];
        el.innerHTML = `
            <div class="cp-head">
                <div class="cp-head-titles"><span class="cp-kicker">Modalità torneo</span><span class="cp-title">Scegli la competizione</span></div>
                <div class="cp-head-right"><button class="cp-btn" data-act="back">◀ Menu</button></div>
            </div>
            <div class="cp-carousel">
                <div class="cp-car-row">
                    <button type="button" class="cp-arrow" data-dir="-1" aria-label="Competizione precedente">&#9664;</button>
                    <div class="cp-car-disc${c.active ? '' : ' is-locked'}" data-act="pick" role="button" tabindex="0" data-focus data-keynav-own="x" aria-label="${esc(c.name)}">
                        <img src="${c.logo}" alt="${esc(c.name)}">
                        ${c.active ? '' : '<span class="cp-lock">Prossimamente</span>'}
                    </div>
                    <button type="button" class="cp-arrow" data-dir="1" aria-label="Competizione successiva">&#9654;</button>
                </div>
                <div class="cp-car-label">
                    <button type="button" class="cp-mini-arrow" data-dir="-1" aria-hidden="true" tabindex="-1">&#9664;</button>
                    <div><small>Competizione ${compIdx + 1} di ${COMPS.length}</small><b>${esc(c.name)}</b></div>
                    <button type="button" class="cp-mini-arrow" data-dir="1" aria-hidden="true" tabindex="-1">&#9654;</button>
                </div>
                <p class="cp-car-desc">${esc(c.desc)}</p>
                <div class="cp-car-facts">${c.facts().map(([v, l]) => `<div class="cp-fact"><b>${esc(v)}</b><small>${esc(l)}</small></div>`).join('')}</div>
                <div class="cp-car-dots">${COMPS.map((x, i) => `<i class="${i === compIdx ? 'on' : ''}"></i>`).join('')}</div>
                <button class="cp-btn is-primary" data-act="pick-btn"${c.active ? '' : ' disabled'}>Scegli la squadra ▶</button>
            </div>
            <div class="cp-panel cp-saves">
                <div class="cp-panel-title"><span>Stagioni salvate</span><b>${saves.length}</b></div>
                <div class="cp-saves-list" data-pager="y">${saves.length ? saves.map(s => `
                    <div class="cp-save-row">
                        <img src="${logo(s.data.user)}" alt="">
                        <div style="min-width:0"><div class="n">${esc(s.name)}</div>
                            <div class="s">${esc(progressLabel(s.data))} • ${new Date(s.savedAt).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</div></div>
                        <div class="a"><button class="cp-btn is-small is-primary" data-load="${s.id}">Carica</button><button class="cp-btn is-small is-danger" data-del="${s.id}">Elimina</button></div>
                    </div>`).join('') : '<div class="cp-empty">Nessuna stagione salvata</div>'}</div>
            </div>`;
        el.querySelector('[data-act="back"]').onclick = exitToMenu;
        const pick = () => { if (!COMPS[compIdx].active) return; const t = compTeams(COMPS[compIdx]); if (!t.includes(selectedTeam)) selectedTeam = t[0]; showScreen('teams'); };
        const move = d => {
            compIdx = (compIdx + d + COMPS.length) % COMPS.length;
            renderSelect();
            const disc = el.querySelector('[data-act="pick"]');
            disc.classList.add(d > 0 ? 'from-right' : 'from-left');
            disc.focus({ preventScroll: true });
        };
        el.querySelectorAll('[data-dir]').forEach(b => b.onclick = () => move(+b.dataset.dir));
        const disc = el.querySelector('[data-act="pick"]');
        disc.onclick = pick;
        el.querySelector('[data-act="pick-btn"]').onclick = pick;
        disc.onkeydown = e => {
            if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
            if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
        };
        el.querySelectorAll('[data-load]').forEach(b => b.onclick = () => {
            const s = readSaves().find(x => x.id === b.dataset.load);
            if (!s) return;
            state = s.data;
            hubTab = state.comp === 'coppa_italia' ? 'bracket' : (state.phase === 'regular' ? 'table' : 'bracket');
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
    // squadre selezionabili: quelle del girone, oppure di Serie A per la coppa
    function compTeams(comp) { return comp.league ? leagueTeams(comp.league) : serieATeams(); }
    function renderTeams() {
        const el = root.querySelector('[data-screen="teams"]');
        const teams = compTeams(COMPS[compIdx]);
        if (!teams.includes(selectedTeam)) selectedTeam = teams[0];
        const r = ratingOf(selectedTeam);
        const comp = COMPS[compIdx];
        const cpuNote = comp.id === 'coppa_italia'
            ? `In coppa con le ${CUP_TEAMS - 1} squadre col rating più alto • sorteggio libero`
            : `Le altre ${teams.length - 1} squadre sono guidate dalla CPU`;
        el.innerHTML = `
            <div class="cp-head">
                <img class="cp-head-logo" src="${comp.logo}" alt="">
                <div class="cp-head-titles"><span class="cp-kicker">${esc(comp.short)} ${seasonLabel()}</span><span class="cp-title">Scegli la tua squadra</span></div>
                <div class="cp-head-right"><span class="cp-pill">${cpuNote}</span></div>
            </div>
            <div class="cp-team-layout">
                <div class="cp-panel" style="display:flex;flex-direction:column;min-height:0">
                    <div class="cp-panel-title"><span>Squadre partecipanti</span><b>${teams.length}</b></div>
                    <div class="cp-team-grid" data-pager="y">${teams.map(id => `
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
                <button class="cp-btn is-primary" data-act="start">${comp.id === 'coppa_italia' ? 'Sorteggio del tabellone ▶' : 'Inizia la stagione ▶'}</button>
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
        const comp = COMPS[compIdx];
        if (comp.id === 'coppa_italia') { startCup(user); return; }
        const teams = leagueTeams(comp.league);
        state = {
            id: 'c' + Date.now().toString(36),
            name: autoName(user, comp.id),
            comp: comp.id,
            league: comp.league,
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
    function startCup(user) {
        const cup = createCup(user);
        state = {
            id: 'c' + Date.now().toString(36),
            name: autoName(user, 'coppa_italia'),
            comp: 'coppa_italia',
            season: seasonLabel(),
            user,
            teams: cup.teams,
            cup,
            phase: 'cup',
            champion: null,
            runnerUp: null,
            lastTurn: null
        };
        hubTab = 'bracket';
        saveCurrent(true);
        showScreen('hub');
        toast('Sorteggio fatto • salvata come "' + state.name + '"');
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
        const nPo = playoffTeams();
        return `<div class="cp-table-wrap" data-pager="y" data-pager-items="tbody tr"><table class="cp-table">
            <thead><tr><th>#</th><th class="l">Squadra</th><th>PG</th><th>V</th><th title="Vittorie al supplementare o ai rigori">VS</th><th title="Sconfitte al supplementare o ai rigori">PS</th><th>P</th><th class="hide-sm">GF</th><th class="hide-sm">GS</th><th>DR</th><th>PT</th></tr></thead>
            <tbody>${rows.map((r, i) => `
                <tr class="${r.id === state.user ? 'is-user ' : ''}${i < nPo ? 'is-po ' : ''}${i === nPo - 1 ? 'cut ' : ''}${state.relegate && i >= rows.length - state.relegate ? 'is-rel' : ''}">
                    <td class="pos">${i + 1}</td>
                    <td class="l"><span class="team"><img src="${logo(r.id)}" alt="">${esc(club(r.id).shortName || clubName(r.id))}</span></td>
                    <td>${r.pg}</td><td>${r.v}</td><td>${r.vs}</td><td>${r.ps}</td><td>${r.p}</td>
                    <td class="hide-sm">${r.gf}</td><td class="hide-sm">${r.gs}</td><td>${r.gf - r.gs > 0 ? '+' : ''}${r.gf - r.gs}</td>
                    <td class="pts">${r.pts}</td>
                </tr>`).join('')}</tbody></table></div>
            <div class="cp-legend"><span><b>■</b> Zona play-off (prime ${nPo})</span>${state.relegate ? `<span><b class="rel">■</b> Retrocessione in Serie B</span>` : ''}${state.promote ? `<span>La vincente dei play-off sale in Serie A</span>` : ''}<span>Vittoria 3 pt • al supplementare/rigori 2 pt • sconfitta al supplementare/rigori 1 pt</span></div>`;
    }
    function bracketHtml() {
        if (!state.playoffs) return `<div class="cp-empty" style="margin:auto">Il tabellone dei play-off sarà pronto alla fine della regular season</div>`;
        const po = state.playoffs;
        const rounds = poRounds();
        return `<div class="cp-bracket" data-pager="x" data-pager-items=".cp-round">${rounds.map((rd, ri) => {
            const list = po.series[ri];
            const slots = Math.pow(2, rounds.length - 1 - ri);
            let html = `<div class="cp-round"><h4>${rd.label} • al meglio di ${rd.bestOf}</h4><div class="cp-round-body">`;
            for (let k = 0; k < slots; k++) {
                const s = list && list[k];
                if (!s) { html += `<div class="cp-series"><div class="tbd">Da definire</div></div>`; continue; }
                const w = seriesWins(s), win = seriesWinner(s);
                const row = (id, n) => `<div class="row${win ? (win === id ? ' won' : ' out') : ''}"><span class="seed">${seedOf(id)}</span><img src="${logo(id)}" alt=""><span>${esc(club(id).shortName || clubName(id))}</span><b>${n}</b></div>`;
                html += `<div class="cp-series${s.hi === state.user || s.lo === state.user ? ' is-user' : ''}">${row(s.hi, w[0])}${row(s.lo, w[1])}</div>`;
            }
            return html + '</div></div>';
        }).join('')}</div>`;
    }
    function nextMatchHtml() {
        if (state.phase === 'done') {
            return `<div class="cp-rest"><b>Stagione conclusa</b>${esc(L(state).champ)}: ${esc(clubName(state.champion))}</div>
                <div class="cp-next-actions"><button class="cp-btn is-primary" data-act="champion">Premiazione ▶</button></div>`;
        }
        const f = userFixture();
        let meta;
        if (state.phase === 'regular') meta = `Giornata ${state.roundIdx + 1} di ${state.rounds.length}`;
        else meta = poRounds()[state.playoffs.round].label;
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
            <div class="cp-next-arena">${esc(arenaTitle(f.home))} • ${esc(kickoffText(fixtureKickoff(f)))}</div>
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
            title: `Risultati • ${poRounds()[lt.round].label}`,
            body: lt.played.map(p => { const s = list[p.si]; const g = s.games.find(x => x.n === p.n); return g ? resultRow(g) : ''; }).join('')
        };
    }
    // partite della giornata in corso (escluse quelle della squadra dell'utente)
    function upcomingBody() {
        if (state.phase !== 'regular') return null;
        const r = state.rounds[state.roundIdx];
        if (!r) return null;
        const others = r.fixtures.filter(f => f.home !== state.user && f.away !== state.user);
        return { title: `Giornata ${state.roundIdx + 1}`, body: others.map(resultRow).join('') + (r.bye ? `<div class="cp-res-rest">Riposa: ${esc(clubName(r.bye))}</div>` : '') };
    }
    let resTab = 'last';   // riquadro risultati: 'last' = ultimo turno giocato, 'next' = giornata in corso
    function renderHub() {
        if (isCup()) { renderCupHub(); return; }
        const el = root.querySelector('[data-screen="hub"]');
        const phaseTxt = state.phase === 'regular' ? 'Regular season' : (state.phase === 'playoff' ? L(state).po : 'Stagione conclusa');
        const lr = lastResultsHtml();
        const up = upcomingBody();
        if (!up) resTab = 'last';
        el.innerHTML = `
            <div class="cp-head">
                <img class="cp-head-logo" src="${L(state).logo}" alt="">
                <div class="cp-head-titles"><span class="cp-kicker">${phaseTxt}</span><span class="cp-title">${L(state).name} ${esc(state.season)}</span></div>
                <div class="cp-head-right">
                    <span class="cp-pill"><img src="${logo(state.user)}" alt="">${esc(clubName(state.user))}</span>
                    <span class="cp-pill">${esc(progressLabel(state).split(' • ').slice(-1)[0])}</span>
                </div>
            </div>
            <div class="cp-hub">
                <div class="cp-panel" data-label="${hubTab === 'table' ? 'Classifica' : 'Play-off'}" style="display:flex;flex-direction:column;min-height:0">
                    <div class="cp-panel-title">
                        <div class="cp-tabs"><button class="cp-tab${hubTab === 'table' ? ' is-active' : ''}" data-tab="table">Classifica</button><button class="cp-tab${hubTab === 'bracket' ? ' is-active' : ''}" data-tab="bracket">Play-off</button></div>
                        <span>${hubTab === 'table' ? 'Regular season' : 'Tabellone'}</span>
                    </div>
                    ${hubTab === 'table' ? tableHtml() : bracketHtml()}
                </div>
                <div class="cp-col">
                    <div class="cp-panel" data-label="Prossima partita"><div class="cp-panel-title"><span>Prossima partita</span></div><div class="cp-next">${nextMatchHtml()}</div></div>
                    <div class="cp-panel" data-label="Risultati" style="display:flex;flex-direction:column;min-height:0;flex:1">
                        <div class="cp-panel-title">${up ? `<div class="cp-tabs"><button class="cp-tab${resTab === 'last' ? ' is-active' : ''}" data-res="last">${esc(lr.title.replace('Risultati • ', ''))}</button><button class="cp-tab${resTab === 'next' ? ' is-active' : ''}" data-res="next">${esc(up.title)}</button></div><span>${resTab === 'next' ? 'Da giocare' : 'Risultati'}</span>` : `<span>${lr.title}</span>`}</div>
                        <div class="cp-results" data-pager="y">${up && resTab === 'next' ? up.body : lr.body}</div>
                    </div>
                </div>
            </div>
            <div class="cp-foot">
                <button class="cp-btn" data-act="exit">◀ Esci</button>
                <span class="cp-hint">Salvataggio automatico dopo ogni turno • "${esc(state.name)}"</span>
                <span class="cp-spacer"></span>
                <button class="cp-btn" data-act="save">Salva</button>
            </div>`;
        el.querySelectorAll('[data-res]').forEach(b => b.onclick = () => { resTab = b.dataset.res; renderHub(); setupHubSwitcher(); const t = el.querySelector(`[data-res="${resTab}"]`); if (t) t.focus({ preventScroll: true }); });
        el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { hubTab = b.dataset.tab; renderHub(); setupHubSwitcher(); const t = el.querySelector(`[data-tab="${hubTab}"]`); if (t) t.focus({ preventScroll: true }); });
        el.querySelector('[data-act="exit"]').onclick = exitToMenu;
        el.querySelector('[data-act="save"]').onclick = () => saveCurrent(false);
        const on = (act, fn) => { const b = el.querySelector(`[data-act="${act}"]`); if (b) b.onclick = fn; };
        on('play', playUserMatch);
        on('sim', () => { const f = userFixture(); if (f && !f.result) f.result = simulateMatch(f.home, f.away); finishTurn(); });
        on('sim-turn', finishTurn);
        on('champion', showChampion);
    }
    // --- 3b. hub della Coppa Italia: tabellone a gare secche
    function cupBracketHtml() {
        const cup = state.cup;
        const slotsPerRound = [4, 2, 1];
        return `<div class="cp-bracket cp-cup-bracket" data-pager="x" data-pager-items=".cp-round">${CUP_ROUNDS.map((rd, ri) => {
            const games = cup.rounds[ri];
            let html = `<div class="cp-round"><h4>${rd.label}</h4><div class="cp-round-body">`;
            for (let k = 0; k < slotsPerRound[ri]; k++) {
                const g = games && games[k];
                if (!g) { html += `<div class="cp-series"><div class="tbd">Da definire</div></div>`; continue; }
                const w = winnerOf(g), r = g.result;
                const goals = id => (r ? (id === g.home ? r.hg : r.ag) : '');
                const row = id => `<div class="row${w ? (w === id ? ' won' : ' out') : ''}"><span class="seed">${id === g.home ? 'C' : 'O'}</span><img src="${logo(id)}" alt=""><span>${esc(club(id).shortName || clubName(id))}</span><b>${goals(id)}</b></div>`;
                const tag = r && r.type !== 'REG' ? `<div class="cp-tag">${r.type === 'OT' ? 'dopo supplementare' : `rigori ${r.so[0]}-${r.so[1]}`}</div>` : '';
                html += `<div class="cp-series${g.home === state.user || g.away === state.user ? ' is-user' : ''}">${row(g.home)}${row(g.away)}${tag}</div>`;
            }
            if (ri === CUP_ROUNDS.length - 1) {
                html += state.champion
                    ? `<div class="cp-cup-podium"><div><span>1°</span><img src="${logo(state.champion)}" alt=""><b>${esc(club(state.champion).shortName || clubName(state.champion))}</b></div>
                        <div><span>2°</span><img src="${logo(state.runnerUp)}" alt=""><b>${esc(club(state.runnerUp).shortName || clubName(state.runnerUp))}</b></div></div>`
                    : `<div class="cp-cup-trophy"><img src="${compOf('coppa_italia').logo}" alt=""></div>`;
            }
            return html + '</div></div>';
        }).join('')}</div>`;
    }
    function cupNextHtml() {
        if (state.phase === 'done') {
            return `<div class="cp-rest"><b>Coppa assegnata</b>Vince ${esc(clubName(state.champion))}</div>
                <div class="cp-next-actions"><button class="cp-btn is-primary" data-act="champion">Premiazione ▶</button></div>`;
        }
        const meta = cupRoundLabel(state.cup.round);
        const f = userFixture();
        if (!f) {
            return `<div class="cp-next-meta"><span>${meta}</span><span>${esc(clubName(state.user))}</span></div>
                <div class="cp-rest"><b>Eliminati dalla coppa</b>Le partite di questo turno sono giocate dalla CPU</div>
                <div class="cp-next-actions"><button class="cp-btn is-primary" data-act="sim-turn" data-focus>Simula il turno ▶</button></div>`;
        }
        const side = (id, lbl) => `<div class="side${id === state.user ? ' is-user' : ''}"><img src="${logo(id)}" alt=""><span>${esc(club(id).shortName || clubName(id))}</span><small>${lbl}</small></div>`;
        return `<div class="cp-next-meta"><span>${meta}</span><span>Gara secca</span></div>
            <div class="cp-versus">${side(f.home, 'CASA')}<span class="cp-vs">VS</span>${side(f.away, 'OSPITE')}</div>
            <div class="cp-next-arena">${esc(arenaTitle(f.home))} • ${esc(kickoffText(fixtureKickoff(f)))}</div>
            <div class="cp-next-actions">
                <button class="cp-btn is-primary" data-act="play" data-focus>Gioca ▶</button>
                <button class="cp-btn" data-act="sim">Simula partita</button>
            </div>`;
    }
    function renderCupHub() {
        const el = root.querySelector('[data-screen="hub"]');
        const lt = state.lastTurn;
        const res = lt ? state.cup.rounds[lt.round].map(resultRow).join('') : '<div class="cp-empty">Nessuna partita giocata</div>';
        const alive = state.phase === 'done' ? (state.champion === state.user) : !!userFixture();
        el.innerHTML = `
            <div class="cp-head">
                <img class="cp-head-logo" src="${compOf('coppa_italia').logo}" alt="">
                <div class="cp-head-titles"><span class="cp-kicker">${state.phase === 'done' ? 'Coppa conclusa' : 'Eliminazione diretta • gare secche'}</span><span class="cp-title">Coppa Italia ${esc(state.season)}</span></div>
                <div class="cp-head-right">
                    <span class="cp-pill"><img src="${logo(state.user)}" alt="">${esc(clubName(state.user))}</span>
                    <span class="cp-pill">${state.phase === 'done' ? 'Finale giocata' : esc(cupRoundLabel(state.cup.round))}${alive || state.phase === 'done' ? '' : ' • eliminati'}</span>
                </div>
            </div>
            <div class="cp-hub">
                <div class="cp-panel" data-label="Tabellone" style="display:flex;flex-direction:column;min-height:0">
                    <div class="cp-panel-title"><span>Tabellone</span><b>${state.cup.teams.length} squadre</b></div>
                    ${cupBracketHtml()}
                </div>
                <div class="cp-col">
                    <div class="cp-panel" data-label="Prossima partita"><div class="cp-panel-title"><span>Prossima partita</span></div><div class="cp-next">${cupNextHtml()}</div></div>
                    <div class="cp-panel" data-label="Risultati" style="display:flex;flex-direction:column;min-height:0;flex:1">
                        <div class="cp-panel-title"><span>${lt ? 'Risultati • ' + cupRoundLabel(lt.round) : 'Risultati'}</span></div>
                        <div class="cp-results" data-pager="y">${res}</div>
                    </div>
                </div>
            </div>
            <div class="cp-foot">
                <button class="cp-btn" data-act="exit">◀ Esci</button>
                <span class="cp-hint">Salvataggio automatico dopo ogni turno • "${esc(state.name)}"</span>
                <span class="cp-spacer"></span>
                <button class="cp-btn" data-act="save">Salva</button>
            </div>`;
        el.querySelector('[data-act="exit"]').onclick = exitToMenu;
        el.querySelector('[data-act="save"]').onclick = () => saveCurrent(false);
        const on = (act, fn) => { const b = el.querySelector(`[data-act="${act}"]`); if (b) b.onclick = fn; };
        on('play', playUserMatch);
        on('sim', () => { const f = userFixture(); if (f && !f.result) f.result = simulateMatch(f.home, f.away); finishTurn(); });
        on('sim-turn', finishTurn);
        on('champion', showChampion);
    }

    function finishTurn() {
        const wasCupAlive = isCup() && !!userFixture();
        const wasRegular = state.phase === 'regular';
        completeTurn();
        if (wasRegular && state.phase === 'playoff') {
            hubTab = 'bracket';
            const pos = standings().findIndex(r => r.id === state.user) + 1;
            toast(`Regular season conclusa • ${clubName(state.user)} ${pos}° ${pos <= playoffTeams() ? '• qualificata ai play-off' : '• fuori dai play-off'}`);
        }
        if (wasCupAlive && state.phase !== 'done') {
            const won = state.cup.rounds[state.cup.round - 1].some(g => winnerOf(g) === state.user);
            toast(won ? `Passaggio del turno • ${clubName(state.user)} in ${cupRoundLabel(state.cup.round).toLowerCase()}` : `${clubName(state.user)} eliminata dalla coppa`);
        }
        showScreen('hub');
        if (state.phase === 'done') showChampion();
    }
    function showChampion() {
        const o = document.createElement('div');
        o.className = 'cp-overlay';
        const isUser = state.champion === state.user;
        const cup = isCup();
        const msg = cup
            ? (isUser ? 'La Coppa Italia è vostra! Gara secca dopo gara secca, fino in fondo.'
                : (state.runnerUp === state.user ? `${esc(clubName(state.user))} chiude al 2° posto: finale persa, ma che cammino!` : `${esc(clubName(state.user))} esce dalla coppa. Ci si riprova l'anno prossimo!`))
            : (isUser ? 'Scudetto! Una stagione da ricordare.' : `${esc(clubName(state.user))} chiude la stagione. Ci si riprova l'anno prossimo!`);
        o.innerHTML = `<div class="cp-panel cp-dialog">
            <span class="cp-kicker">${cup ? `Coppa Italia ${esc(state.season)} • Finale 1°-2° posto` : `${L(state).name} ${esc(state.season)} • ${L(state).final}`}</span>
            <img class="cp-champ-crest" src="${logo(state.champion)}" alt="">
            <h2>${esc(clubName(state.champion))}<br>${cup ? 'Vince la Coppa Italia' : esc(L(state).title)}</h2>
            ${cup ? `<p>2° posto: ${esc(clubName(state.runnerUp))}</p>` : ''}
            <p>${msg}</p>
            <div class="cp-next-actions"><button class="cp-btn" data-x="hub">${cup ? 'Tabellone' : 'Classifica'}</button><button class="cp-btn is-primary" data-x="menu">Torna al menu ▶</button></div>
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
        const ko = fixtureKickoff(f);
        matchConfig.timeOfDay = ko.daytime ? 'day' : 'night';      // partita pomeridiana o serale
        const label = isCup() ? `Coppa Italia • ${cupRoundLabel(state.cup.round)}`
            : (state.phase === 'regular' ? `${L(state).name} • Giornata ${state.roundIdx + 1}` : `${L(state).name} • ${poRounds()[state.playoffs.round].label}`);
        // la schermata della competizione si chiude quando il caricamento la copre (niente palazzetto nella dissolvenza)
        if (typeof showFunFactLoading === 'function') showFunFactLoading(`${label} • ${ko.label}`, launchMatchFromCurrentConfig, hideRoot);
        else { hideRoot(); launchMatchFromCurrentConfig(); }
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

    // ------------------------------------------------------------------ motore riusabile (Hockey Manager)
    // Esegue le funzioni qui sopra su uno stato esterno (una Serie A o una Coppa Italia della carriera)
    // senza toccare la stagione della modalità torneo e senza salvarla.
    let embedded = 0;
    function onState(s, fn) {
        return (...args) => {
            const prev = state;
            state = s; embedded++;
            try { return fn(...args); } finally { embedded--; state = prev; }
        };
    }
    // le gare che si giocano nel turno corrente (riferimenti: dopo completeTurn hanno il risultato)
    function turnFixtures() {
        if (isCup()) return state.phase === 'cup' ? state.cup.rounds[state.cup.round].slice() : [];
        if (state.phase === 'regular') { const r = state.rounds[state.roundIdx]; return r ? r.fixtures.slice() : []; }
        if (state.phase === 'playoff') return currentPoSeries().map(turnGame).filter(Boolean);
        return [];
    }
    // finalista sconfitto della Serie A (null finché la finale non è decisa)
    function leagueRunnerUp() {
        if (!state.playoffs || state.phase !== 'done') return null;
        const f = state.playoffs.series[poRounds().length - 1][0];
        return f.hi === state.champion ? f.lo : f.hi;
    }
    function leagueFinalists() {
        const po = state.playoffs;
        if (!po || po.round !== poRounds().length - 1 || !po.series[po.round]) return [];
        const f = po.series[po.round][0];
        return [f.hi, f.lo];
    }
    // ------------------------------------------------------------------ orario delle partite
    // Ogni partita ha un orario stabile (dipende da squadre e turno): sabato sera per lo più, poi sabato
    // pomeriggio, domenica e qualche infrasettimanale. Si gioca "di giorno" se la partita finisce prima del
    // tramonto del mese (ora legale compresa): decide la luce in pista (matchConfig.timeOfDay).
    const SUNSET = [17.1, 17.7, 18.3, 20.0, 20.5, 21.0, 21.0, 20.4, 19.5, 18.6, 17.0, 16.7];   // gen..dic, Italia
    const KICKOFF_SLOTS = {
        6: [[20.75, 4], [18, 2], [16, 2], [20.5, 1]],          // sabato: [ora, peso]
        0: [[15.5, 2], [17, 1], [18, 2]],                     // domenica
        other: [[20.75, 3], [21, 1]]                          // infrasettimanale
    };
    const WEEKDAY = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    function hashKey(str) {
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
        return h;
    }
    // month 0..11; weekday 0 (dom) ..6 (sab), o null per sceglierlo (competizioni senza calendario)
    function kickoff(key, month, weekday) {
        const h = hashKey(String(key));
        if (weekday == null) weekday = [6, 6, 6, 6, 0, 0, 5][h % 7];
        const slots = KICKOFF_SLOTS[weekday] || KICKOFF_SLOTS.other;
        let r = (h >>> 8) % slots.reduce((a, sl) => a + sl[1], 0), hour = slots[0][0];
        for (const [hh, w] of slots) { if (r < w) { hour = hh; break; } r -= w; }
        const hh = Math.floor(hour), mm = Math.round((hour - hh) * 60);
        const time = `${hh}:${String(mm).padStart(2, '0')}`;
        const daytime = hour + 0.75 < SUNSET[((month % 12) + 12) % 12];
        return { weekday, dayName: WEEKDAY[weekday], hour, time, label: `${WEEKDAY[weekday]} ${time}`, daytime, icon: daytime ? '☀' : '☾' };
    }
    // competizione senza calendario: mese stimato dalla fase (campionato ottobre-marzo, play-off aprile-maggio, coppa gennaio)
    function fixtureMonth() {
        if (isCup()) return 0;
        if (state.phase === 'playoff') return state.playoffs.round === 0 ? 3 : 4;
        const fr = state.roundIdx / Math.max(1, state.rounds.length);
        return [9, 10, 11, 0, 1, 2][Math.min(5, Math.floor(fr * 6))];
    }
    function fixtureKickoff(f) {
        return kickoff([state.comp, state.season, f.home, f.away, f.n || '', isCup() ? state.cup.round : state.roundIdx].join('|'), fixtureMonth(), null);
    }
    const kickoffText = ko => `${ko.icon} ${ko.label}`;

    // ------------------------------------------------------------------ contesto per la telecronaca
    // risultati di una squadra in ordine di gioco ('W'/'L'), ultime n
    function formOf(id, n = 5) {
        const games = [];
        if (isCup()) state.cup.rounds.forEach(r => r.forEach(f => games.push(f)));
        else {
            (state.rounds || []).forEach(r => r.fixtures.forEach(f => games.push(f)));
            if (state.playoffs) state.playoffs.series.forEach(rs => rs.forEach(s => s.games.forEach(g => games.push(g))));
        }
        return games.filter(f => f.result && (f.home === id || f.away === id)).map(f => (winnerOf(f) === id ? 'W' : 'L')).slice(-n);
    }
    function matchContext(home, away) {
        const ctx = { league: leagueOf(state), leagueName: L(state).name, user: state.user, teams: {} };
        if (isCup()) {
            ctx.kind = 'cup';
            ctx.roundId = (CUP_ROUNDS[state.cup.round] || {}).id || '';
        } else if (state.phase === 'playoff') {
            const r = poRounds()[state.playoffs.round];
            ctx.kind = 'playoff';
            ctx.roundId = r.id;
            const ser = currentPoSeries().find(x => (x.hi === home && x.lo === away) || (x.hi === away && x.lo === home));
            if (ser) {
                const w = seriesWins(ser);
                ctx.series = { wins: { [ser.hi]: w[0], [ser.lo]: w[1] }, game: w[0] + w[1] + 1, bestOf: ser.bestOf };
            }
        } else {
            ctx.kind = 'league';
            ctx.round = state.roundIdx + 1;
            ctx.rounds = state.rounds.length;
        }
        const table = isCup() ? [] : standings();
        ctx.total = table.length;
        [home, away].forEach(id => {
            const i = table.findIndex(r => r.id === id);
            const r = table[i];
            ctx.teams[id] = Object.assign({ form: formOf(id) }, r ? { pos: i + 1, pts: r.pts, pg: r.pg, gf: r.gf, gs: r.gs } : {});
        });
        return ctx;
    }

    function turnLabel() {
        if (isCup()) return state.phase === 'cup' ? `Coppa Italia • ${cupRoundLabel(state.cup.round)}` : 'Coppa Italia';
        if (state.phase === 'regular') return `${L(state).name} • Giornata ${state.roundIdx + 1} di ${state.rounds.length}`;
        if (state.phase === 'playoff') return `${L(state).name} • ${poRounds()[state.playoffs.round].label}`;
        return L(state).name;
    }
    const engine = {
        CUP_ROUNDS, LEAGUES, CUP_LOGO: compOf('coppa_italia').logo,
        poRounds: s => poRounds(s), playoffTeams: s => playoffTeams(s),
        leagueName: s => L(s).name, leagueLogo: s => L(s).logo,
        serieATeams, leagueTeams,
        // girone all'italiana: 'SERIE A' o 'SERIE B'; user può non farne parte (null)
        newLeague(user, season, league, teams) {
            league = league || 'SERIE A';
            teams = teams || leagueTeams(league);
            return { comp: L({ league }).comp, league, season, user, teams, rounds: buildSchedule(teams), roundIdx: 0, phase: 'regular', playoffs: null, champion: null, lastTurn: null };
        },
        newCup(user, season) {
            const cup = createCup(user);
            return { comp: 'coppa_italia', season, user, teams: cup.teams, cup, phase: 'cup', champion: null, runnerUp: null, lastTurn: null };
        },
        simulateMatch, winnerOf,
        userFixture: s => onState(s, userFixture)(),
        turnFixtures: s => onState(s, turnFixtures)(),
        completeTurn: s => onState(s, completeTurn)(),
        standings: s => onState(s, standings)(),
        seriesFor: (s, id) => onState(s, () => state.playoffs ? currentPoSeries().find(x => x.hi === id || x.lo === id) || null : null)(),
        seriesWins: (s, ser) => onState(s, seriesWins)(ser),
        seriesWinner: (s, ser) => onState(s, seriesWinner)(ser),
        leagueRunnerUp: s => onState(s, leagueRunnerUp)(),
        leagueFinalists: s => onState(s, leagueFinalists)(),
        turnLabel: s => onState(s, turnLabel)(),
        kickoff,
        matchContext: (s, home, away) => onState(s, matchContext)(home, away),
        progressLabel: s => progressLabel(s),
        // HTML già stilizzato da competition.css
        tableHtml: s => onState(s, tableHtml)(),
        bracketHtml: s => onState(s, bracketHtml)(),
        cupBracketHtml: s => onState(s, cupBracketHtml)(),
        resultRow: (s, f) => onState(s, resultRow)(f),
        lastResults: s => onState(s, () => isCup()
            ? (state.lastTurn ? { title: 'Risultati • ' + cupRoundLabel(state.lastTurn.round), body: state.cup.rounds[state.lastTurn.round].map(resultRow).join('') } : { title: 'Risultati', body: '<div class="cp-empty">Nessuna partita giocata</div>' })
            : lastResultsHtml())(),
        ensureCss() {
            if (document.querySelector('link[data-comp-css]')) return;
            const l = document.createElement('link');
            l.rel = 'stylesheet'; l.href = 'src/competition/competition.css'; l.dataset.compCss = '1';
            document.head.appendChild(l);
        }
    };

    window.Competition = {
        engine,
        open() { ensureRoot(); showScreen('select'); },
        isMatchActive: () => matchActive,
        // classifica, forma e serie della partita in corso (per la telecronaca)
        matchContext: () => (matchActive && state && pendingFixture ? matchContext(pendingFixture.home, pendingFixture.away) : null),
        onUserMatchFinished,
        onUserMatchAbandoned,
        runShootout,
        // esposti per i test
        _simulateMatch: simulateMatch,
        _buildSchedule: buildSchedule
    };
})();
