// --- src/competition/wse.js ---
// WSE European League: torneo continentale per club di World Skate Europe (4 giorni, sede unica).
// Script classico caricato dopo competition.js: usa window.Competition.engine (simulazione, righe dei
// risultati) e i globali di index.html (CLUB_ROSTERS, CLUB_RATINGS, CLUB_IDS, TEAM_DATA, ARENA_CATALOG,
// HOME_CLUB_ARENAS, logoSrcOf). Lo usano la modalità torneo (competition.js) e Hockey Manager.
//
// REGOLAMENTO (adattato ai club presenti nel gioco: Italia, Francia e Spagna)
//  - Partecipanti: campioni nazionali e 2ª/3ª classificate (o vincitrici della coppa nazionale) delle
//    federazioni, la detentrice del trofeo e il club ospitante. Le federazioni estere confermano 2 o 3
//    iscrizioni: con almeno 10 squadre si arriva a 12 (con le 4ª classificate), altrimenti si scende a 8.
//  - Sede: un impianto estratto a caso fra tutti quelli del gioco; il club di casa (se c'è) partecipa.
//  - Fase a gironi (giovedì-venerdì): 2 o 3 gironi all'italiana da 4, sola andata, sorteggio a fasce
//    evitando quando possibile due squadre della stessa nazione nello stesso girone.
//    Punti: 3 vittoria nei regolamentari, 2 al supplementare/rigori, 1 sconfitta al supplementare/rigori.
//  - Eliminazione diretta (sabato-domenica), gare secche con supplementare a golden goal e rigori:
//      12 squadre: le prime due di ogni girone e le due migliori terze ai quarti (1-8, 4-5, 2-7, 3-6,
//      evitando le rivincite del girone), poi semifinali, finale 3°-4° e finalissima; chi perde i quarti
//      gioca per il 5°-8° posto, le altre quattro per il 9°-12°.
//      8 squadre: 1ª A - 2ª B e 1ª B - 2ª A in semifinale; 3ª e 4ª giocano per il 5°-8° posto.
(function () {
    const NAME = 'WSE European League';
    const SHORT = 'European League';
    const LOGO = 'assets/logos/wse_logo.png';
    const FEDS = [
        { id: 'IT', name: 'Italia', leagues: ['SERIE A'], champ: "Campione d'Italia" },
        { id: 'FR', name: 'Francia', leagues: ['LIGUE ELITE'], champ: 'Campione di Francia' },
        { id: 'ES', name: 'Spagna', leagues: ['RFEP'], champ: 'Campione di Spagna' }
    ];
    const HOST_LEAGUES = ['SERIE A', 'SERIE B', 'LIGUE ELITE', 'RFEP'];
    const SUNSET_JUNE = 21.0;            // si gioca a giugno: luce del giorno fino a sera
    const GAP = 1.25;                    // ore fra una partita e la successiva nello stesso impianto

    const ENG = () => window.Competition.engine;
    const club = id => CLUB_ROSTERS[id];
    const clubName = id => (club(id) ? club(id).name : id);
    const short = id => (club(id) ? club(id).shortName || club(id).name : id);
    const logo = id => (typeof logoSrcOf === 'function' ? logoSrcOf(id) : `assets/logos/${id}.png`);
    const ratingOf = id => (typeof CLUB_RATINGS !== 'undefined' && CLUB_RATINGS[id]) || { off: 70, def: 70, goa: 70 };
    const avg = id => { const r = ratingOf(id); return (r.off + r.def + r.goa) / 3; };
    const fedOf = id => (TEAM_DATA.countries && TEAM_DATA.countries[id]) || 'IT';
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const tr = (s, ...a) => (typeof _t === 'function' ? _t(s, ...a) : s);
    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

    // ------------------------------------------------------------------ partecipanti
    function fedTeams(fid) {
        const f = FEDS.find(x => x.id === fid);
        return f ? CLUB_IDS.filter(id => club(id) && f.leagues.includes(club(id).league)) : [];
    }
    // squadre che possono giocarla (scelta della squadra nella modalità torneo)
    function eligibleTeams() { return FEDS.reduce((a, f) => a.concat(fedTeams(f.id)), []); }
    // classifica nazionale "stimata" dal rating (con un po' di caso): per le federazioni senza campionato simulato
    function ratingRanking(fid) {
        return fedTeams(fid).map(id => ({ id, v: avg(id) + (Math.random() - 0.5) * 8 })).sort((a, b) => b.v - a.v).map(x => x.id);
    }
    // sede: impianto a caso fra tutti quelli del gioco; club ospitante = chi ci gioca in casa (prima la Serie A)
    function drawVenue() {
        const ids = Object.keys(ARENA_CATALOG);
        const venue = ids[Math.floor(Math.random() * ids.length)];
        const homeClubs = CLUB_IDS.filter(id => club(id) && HOST_LEAGUES.includes(club(id).league) && (HOME_CLUB_ARENAS[id] || id) === venue)
            .sort((a, b) => HOST_LEAGUES.indexOf(club(a).league) - HOST_LEAGUES.indexOf(club(b).league) || avg(b) - avg(a));
        return { venue, host: homeClubs[0] || null };
    }
    // opts: { national: { IT: [...], FR: [...], ES: [...] } classifiche finali (campione per primo),
    //         cupWinner (vincitrice della Coppa Italia), holder, host, user, forceUser (modalità torneo) }
    // → [{ id, r: 'champ'|'2nd'|'3rd'|'cup'|'pos'|'holder'|'host'|'wild', fed, pos }]
    function buildEntries(opts) {
        const nat = opts.national || {};
        const list = [];
        const has = id => list.some(e => e.id === id);
        const add = (id, r, extra) => { if (id && club(id) && !has(id)) list.push(Object.assign({ id, r, fed: fedOf(id) }, extra || {})); };
        add(opts.holder, 'holder');
        add(opts.host, 'host');
        // le federazioni estere confermano 2 o 3 iscrizioni; l'Italia sempre 3
        const confirm = { IT: 3 };
        FEDS.forEach(f => { if (confirm[f.id] == null) confirm[f.id] = Math.random() < 0.6 ? 3 : 2; });
        FEDS.forEach(f => add((nat[f.id] || [])[0], 'champ'));
        FEDS.forEach(f => add((nat[f.id] || [])[1], '2nd'));
        FEDS.forEach(f => {
            if (confirm[f.id] < 3) return;
            if (f.id === 'IT' && opts.cupWinner && !has(opts.cupWinner)) add(opts.cupWinner, 'cup');
            else add((nat[f.id] || []).find(id => !has(id)), '3rd');
        });
        if (opts.forceUser && opts.user && !has(opts.user)) list.push({ id: opts.user, r: 'wild', fed: fedOf(opts.user), keep: true });
        const user = list.find(e => e.id === opts.user);
        if (user && opts.forceUser) user.keep = true;
        const target = list.length >= 10 ? 12 : 8;
        // ripescaggi dalle classifiche nazionali (4ª, 5ª...) a turno fra le federazioni
        for (let guard = 0; list.length < target && guard < 60; guard++) {
            const f = FEDS[guard % FEDS.length];
            const ranked = nat[f.id] || [];
            const k = ranked.findIndex(id => !has(id));
            if (k >= 0) list.push({ id: ranked[k], r: 'pos', fed: f.id, pos: k + 1 });
        }
        // troppe iscritte: fuori le ultime ammesse (mai la squadra dell'utente in modalità torneo)
        for (let i = list.length - 1; list.length > target && i >= 0; i--) if (!list[i].keep) list.splice(i, 1);
        return list.slice(0, target);
    }
    // motivo dell'ammissione come [chiave, ...argomenti] (testi annidati = array): Hockey Manager lo salva
    // nei messaggi e lo traduce quando li mostra
    function reasonKey(e) {
        const f = FEDS.find(x => x.id === e.fed) || FEDS[0];
        switch (e.r) {
            case 'champ': return [f.champ];
            case '2nd': return ['2ª classificata • {0}', [f.name]];
            case '3rd': return ['3ª classificata • {0}', [f.name]];
            case 'pos': return ['{0}ª classificata • {1}', e.pos, [f.name]];
            case 'cup': return ['Vincitrice della Coppa Italia'];
            case 'holder': return ['Detentrice del trofeo'];
            case 'host': return ['Club ospitante'];
            default: return ['Wild card'];
        }
    }
    const keyText = k => tr(k[0], ...k.slice(1).map(a => (Array.isArray(a) ? keyText(a) : a)));
    const reasonLabel = e => (e && e.r ? keyText(reasonKey(e)) : '');

    // ------------------------------------------------------------------ sorteggio dei gironi
    function drawGroups(ids) {
        const g = ids.length / 4;
        const sorted = ids.slice().sort((a, b) => avg(b) - avg(a));
        const pots = [0, 1, 2, 3].map(p => sorted.slice(p * g, p * g + g));
        let best = null, bestCost = Infinity;
        for (let attempt = 0; attempt < 120 && bestCost > 0; attempt++) {
            const groups = Array.from({ length: g }, () => []);
            pots.forEach(pot => shuffle(pot.slice()).forEach((id, i) => groups[i].push(id)));
            let cost = 0;
            groups.forEach(gr => gr.forEach((a, i) => gr.slice(i + 1).forEach(b => { if (fedOf(a) === fedOf(b)) cost++; })));
            if (cost < bestCost) { best = groups; bestCost = cost; }
        }
        return best;
    }
    // 4 squadre: 3 giornate da 2 partite (la testa di serie è la prima)
    const GROUP_ROUNDS = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[3, 0], [1, 2]]];

    // ------------------------------------------------------------------ calendario: turni e tabellone
    // d = giorno della settimana (4 giovedì ... 0 domenica), start = ora della prima partita del turno
    const TURNS = {
        12: [{ d: 4, g: 0, start: 9.5 }, { d: 4, g: 1, start: 16.75 }, { d: 5, g: 2, start: 10 }, { d: 6, k: 0, start: 9.5 }, { d: 6, k: 1, start: 16.5 }, { d: 0, k: 2, start: 11 }],
        8: [{ d: 4, g: 0, start: 11 }, { d: 4, g: 1, start: 17 }, { d: 5, g: 2, start: 15 }, { d: 6, k: 0, start: 14 }, { d: 0, k: 1, start: 11 }]
    };
    // partite a eliminazione diretta: a/b = ['S', i] testa di serie, ['O', i] fuori dai quarti,
    // ['W'|'L', id] vincente/perdente di una gara precedente. Nell'ultimo turno la finale chiude il programma.
    const KO = {
        12: [
            [{ id: 'QF1', t: 'QF', a: ['S', 0], b: ['S', 7] }, { id: 'QF2', t: 'QF', a: ['S', 3], b: ['S', 4] },
             { id: 'QF3', t: 'QF', a: ['S', 1], b: ['S', 6] }, { id: 'QF4', t: 'QF', a: ['S', 2], b: ['S', 5] },
             { id: 'P9A', t: 'P9S', a: ['O', 0], b: ['O', 3] }, { id: 'P9B', t: 'P9S', a: ['O', 1], b: ['O', 2] }],
            [{ id: 'P11', t: 'P11', a: ['L', 'P9A'], b: ['L', 'P9B'] }, { id: 'P9', t: 'P9', a: ['W', 'P9A'], b: ['W', 'P9B'] },
             { id: 'P5A', t: 'P5S', a: ['L', 'QF1'], b: ['L', 'QF2'] }, { id: 'P5B', t: 'P5S', a: ['L', 'QF3'], b: ['L', 'QF4'] },
             { id: 'SF1', t: 'SF', a: ['W', 'QF1'], b: ['W', 'QF2'] }, { id: 'SF2', t: 'SF', a: ['W', 'QF3'], b: ['W', 'QF4'] }],
            [{ id: 'P7', t: 'P7', a: ['L', 'P5A'], b: ['L', 'P5B'] }, { id: 'P5', t: 'P5', a: ['W', 'P5A'], b: ['W', 'P5B'] },
             { id: 'P3', t: 'P3', a: ['L', 'SF1'], b: ['L', 'SF2'] }, { id: 'F', t: 'F', a: ['W', 'SF1'], b: ['W', 'SF2'] }]
        ],
        8: [
            [{ id: 'P5A', t: 'P5S', a: ['S', 4], b: ['S', 7] }, { id: 'P5B', t: 'P5S', a: ['S', 5], b: ['S', 6] },
             { id: 'SF1', t: 'SF', a: ['S', 0], b: ['S', 3] }, { id: 'SF2', t: 'SF', a: ['S', 1], b: ['S', 2] }],
            [{ id: 'P7', t: 'P7', a: ['L', 'P5A'], b: ['L', 'P5B'] }, { id: 'P5', t: 'P5', a: ['W', 'P5A'], b: ['W', 'P5B'] },
             { id: 'P3', t: 'P3', a: ['L', 'SF1'], b: ['L', 'SF2'] }, { id: 'F', t: 'F', a: ['W', 'SF1'], b: ['W', 'SF2'] }]
        ]
    };
    // posti assegnati dalle finali: [vincente, perdente]
    const PLACES = { F: [1, 2], P3: [3, 4], P5: [5, 6], P7: [7, 8], P9: [9, 10], P11: [11, 12] };
    const GAME_LABEL = {
        QF: 'Quarti di finale', SF: 'Semifinale', F: 'Finale', P3: 'Finale 3°-4° posto',
        P5S: 'Semifinale 5°-8° posto', P5: 'Finale 5°-6° posto', P7: 'Finale 7°-8° posto',
        P9S: 'Semifinale 9°-12° posto', P9: 'Finale 9°-10° posto', P11: 'Finale 11°-12° posto'
    };
    const KO_ORDER = { QF: 0, SF: 0, F: 0, P3: 1, P5S: 2, P5: 2, P7: 3, P9S: 4, P9: 4, P11: 5 };
    const STAGE_LABEL = { 12: ['Quarti di finale', 'Semifinali', 'Finali'], 8: ['Semifinali', 'Finali'] };
    const WEEKDAY = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

    // ------------------------------------------------------------------ creazione
    // opts: { user, season, entries (buildEntries), venue, host, holder, start (data del giovedì, facoltativa) }
    function create(opts) {
        const ids = opts.entries.map(e => e.id);
        const groups = drawGroups(ids).map((teams, gi) => {
            const games = [];
            GROUP_ROUNDS.forEach((pairs, gr) => pairs.forEach(([a, b]) => games.push({ home: teams[a], away: teams[b], result: null, gr, grp: gi })));
            return { id: 'ABC'[gi], teams, games };
        });
        return {
            comp: 'wse', season: opts.season, user: opts.user || null,
            venue: opts.venue, host: opts.host || null, holder: opts.holder || null, start: opts.start || null,
            entries: opts.entries, teams: ids, format: ids.length, groups,
            turn: 0, phase: 'groups', ko: { seeds: null, out: null, stages: [] },
            champion: null, runnerUp: null, ranking: null, lastTurn: null
        };
    }

    // ------------------------------------------------------------------ classifiche dei gironi
    const winnerOf = f => ENG().winnerOf(f);
    function groupTable(s, gi) {
        const g = s.groups[gi];
        const rows = {};
        g.teams.forEach(id => { rows[id] = { id, pg: 0, v: 0, vs: 0, ps: 0, p: 0, gf: 0, gs: 0, pts: 0, grp: gi }; });
        g.games.forEach(f => {
            if (!f.result) return;
            const H = rows[f.home], A = rows[f.away], r = f.result, w = winnerOf(f);
            H.pg++; A.pg++;
            H.gf += r.hg; H.gs += r.ag; A.gf += r.ag; A.gs += r.hg;
            const W = rows[w], L = w === f.home ? A : H;
            if (r.type === 'REG') { W.v++; W.pts += 3; L.p++; }
            else { W.vs++; W.pts += 2; L.ps++; L.pts += 1; }
        });
        // a pari punti: scontro diretto (fra due), poi differenza reti, reti fatte, vittorie
        const h2h = (a, b) => { const f = g.games.find(x => x.result && ((x.home === a.id && x.away === b.id) || (x.home === b.id && x.away === a.id))); return f ? (winnerOf(f) === a.id ? -1 : 1) : 0; };
        return Object.values(rows).sort((a, b) => b.pts - a.pts || h2h(a, b) || (b.gf - b.gs) - (a.gf - a.gs) || b.gf - a.gf || b.v - a.v || clubName(a.id).localeCompare(clubName(b.id)));
    }
    // confronto fra squadre di gironi diversi (stesso numero di partite)
    const cross = (a, b) => b.pts - a.pts || (b.gf - b.gs) - (a.gf - a.gs) || b.gf - a.gf || b.v - a.v;

    // ------------------------------------------------------------------ eliminazione diretta
    function seedKo(s) {
        const tables = s.groups.map((g, gi) => groupTable(s, gi));
        if (s.format === 8) {
            const [A, B] = tables;
            s.ko.seeds = [A[0].id, B[0].id, A[1].id, B[1].id, A[2].id, B[2].id, A[3].id, B[3].id];
            s.ko.out = [];
            return;
        }
        const byPos = p => tables.map(t => t[p]).sort(cross);
        const W = byPos(0), R = byPos(1), T = byPos(2), Fo = byPos(3);
        const grpOf = row => row.grp;
        // quarti 1-8, 4-5, 2-7, 3-6: si cerca la disposizione delle seconde e delle terze senza rivincite del girone
        const perms3 = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
        let best = null, bestCost = Infinity;
        perms3.forEach(pr => [[0, 1], [1, 0]].forEach(pt => {
            const seeds = [W[0], W[1], W[2], R[pr[0]], R[pr[1]], R[pr[2]], T[pt[0]], T[pt[1]]];
            const cost = [[0, 7], [3, 4], [1, 6], [2, 5]].reduce((c, [a, b]) => c + (grpOf(seeds[a]) === grpOf(seeds[b]) ? 1 : 0), 0);
            if (cost < bestCost) { bestCost = cost; best = seeds; }
        }));
        s.ko.seeds = best.map(r => r.id);
        s.ko.out = [T[2]].concat(Fo).map(r => r.id);
    }
    function koGame(s, id) {
        for (const st of s.ko.stages) { const g = st.find(x => x.id === id); if (g) return g; }
        return null;
    }
    function srcTeam(s, src) {
        const [k, v] = src;
        if (k === 'S') return s.ko.seeds[v];
        if (k === 'O') return s.ko.out[v];
        const g = koGame(s, v), w = g && winnerOf(g);
        if (!w) return null;
        return k === 'W' ? w : (w === g.home ? g.away : g.home);
    }
    function buildStage(s, k) {
        if (k === 0) seedKo(s);
        s.ko.stages[k] = KO[s.format][k].map(g => ({ id: g.id, t: g.t, home: srcTeam(s, g.a), away: srcTeam(s, g.b), result: null }));
    }
    function finish(s) {
        const rank = [];
        s.ko.stages.forEach(st => st.forEach(g => {
            const pl = PLACES[g.t];
            if (!pl) return;
            const w = winnerOf(g);
            rank[pl[0] - 1] = w;
            rank[pl[1] - 1] = w === g.home ? g.away : g.home;
        }));
        s.ranking = rank;
        s.champion = rank[0];
        s.runnerUp = rank[1];
        s.phase = 'done';
    }

    // ------------------------------------------------------------------ turni
    const curTurn = s => TURNS[s.format][s.turn] || null;
    function turnGames(s, t) {
        t = t || curTurn(s);
        if (!t) return [];
        if (t.g != null) return s.groups.reduce((a, g) => a.concat(g.games.filter(f => f.gr === t.g)), []);
        return (s.ko.stages[t.k] || []).slice();
    }
    function userFixture(s) {
        if (!s.user || s.phase === 'done') return null;
        return turnGames(s).find(f => !f.result && (f.home === s.user || f.away === s.user)) || null;
    }
    function turnFixtures(s) { return s.phase === 'done' ? [] : turnGames(s); }
    function completeTurn(s) {
        const t = curTurn(s);
        if (!t || s.phase === 'done') return;
        turnGames(s, t).forEach(f => { if (!f.result) f.result = ENG().simulateMatch(f.home, f.away, true); });
        s.lastTurn = s.turn;
        s.turn++;
        if (t.g === 2) { buildStage(s, 0); s.phase = 'ko'; }
        else if (t.k != null) {
            if (t.k + 1 < KO[s.format].length) buildStage(s, t.k + 1);
            else finish(s);
        }
    }
    function simulateAll(s) { for (let guard = 0; s.phase !== 'done' && guard < 20; guard++) completeTurn(s); }
    // la gara e il turno a cui appartiene
    function turnOfGame(s, f) {
        if (f.gr != null) return f.gr;
        const k = s.ko.stages.findIndex(st => st.includes(f));
        return k >= 0 ? 3 + k : s.turn;
    }
    // giorni dall'inizio (giovedì) del turno corrente: per il calendario di Hockey Manager
    const dayOffset = (s, ti) => { const t = TURNS[s.format][ti == null ? s.turn : ti]; return t ? (t.d - 4 + 7) % 7 : 3; };

    // ------------------------------------------------------------------ orari
    function kickoff(s, f) {
        const ti = turnOfGame(s, f), t = TURNS[s.format][ti] || TURNS[s.format][0];
        const games = turnGames(s, t);
        const idx = Math.max(0, games.indexOf(f));
        const hour = t.start + idx * GAP;
        const hh = Math.floor(hour), mm = Math.round((hour - hh) * 60);
        const time = `${hh}:${String(mm).padStart(2, '0')}`;
        const daytime = hour + 0.75 < SUNSET_JUNE;
        const day = tr(WEEKDAY[t.d]).slice(0, 3);
        return { weekday: t.d, dayName: WEEKDAY[t.d], hour, time, label: `${day} ${time}`, daytime, icon: daytime ? '☀' : '☾' };
    }

    // ------------------------------------------------------------------ etichette
    // in italiano (Hockey Manager le salva nel calendario): tradurre dove si mostrano
    function stageName(s) {
        const t = curTurn(s);
        if (s.phase === 'done' || !t) return 'Torneo concluso';
        if (t.g != null) return `Fase a gironi • Giornata ${t.g + 1} di 3`;
        return STAGE_LABEL[s.format][t.k];
    }
    const turnLabel = s => `${NAME} • ${stageName(s)}`;
    function progressLabel(s) {
        if (s.phase === 'done') return tr('European League conclusa • Campione: {0}', clubName(s.champion));
        const t = curTurn(s);
        if (t.g != null) return tr('European League • Fase a gironi, giornata {0} di 3', t.g + 1);
        return `${SHORT} • ${tr(STAGE_LABEL[s.format][t.k])}`;
    }
    // descrizione della gara (girone o turno del tabellone)
    function gameLabel(s, f) {
        if (f.gr != null) return tr('Girone {0} • giornata {1}', s.groups[f.grp].id, f.gr + 1);
        return tr(GAME_LABEL[f.t] || '');
    }
    const groupOfTeam = (s, id) => s.groups.findIndex(g => g.teams.includes(id));
    // posto finale di una squadra appena giocata la sua ultima gara (le 9ª-12ª finiscono il sabato)
    function finalPlace(s, id) {
        if (s.ranking) return s.ranking.indexOf(id) + 1;
        for (const st of s.ko.stages) for (const g of st) {
            const pl = PLACES[g.t];
            if (!pl || !g.result || (g.home !== id && g.away !== id)) continue;
            return winnerOf(g) === id ? pl[0] : pl[1];
        }
        return 0;
    }
    // titolo del turno corrente, tradotto (per l'interfaccia)
    function stageTitle(s) {
        const t = curTurn(s);
        if (s.phase === 'done' || !t) return tr('Torneo concluso');
        return t.g != null ? tr('Fase a gironi') : tr(STAGE_LABEL[s.format][t.k]);
    }
    const placeOf = (s, id) => (s.ranking ? s.ranking.indexOf(id) + 1 : 0);
    const venueTitle = s => { const a = ARENA_CATALOG[s.venue]; return a ? a.shortTitle : s.venue; };
    const venueCity = s => { const a = ARENA_CATALOG[s.venue]; return a && a.location ? a.location.split(' • ')[0] : ''; };

    // ------------------------------------------------------------------ contesto per la telecronaca
    function formOf(s, id, n = 5) {
        const games = [];
        s.groups.forEach(g => g.games.forEach(f => games.push(f)));
        s.ko.stages.forEach(st => st.forEach(f => games.push(f)));
        return games.filter(f => f.result && (f.home === id || f.away === id)).map(f => (winnerOf(f) === id ? 'W' : 'L')).slice(-n);
    }
    function matchContext(s, home, away) {
        const all = [];
        s.groups.forEach(g => g.games.forEach(f => all.push(f)));
        s.ko.stages.forEach(st => st.forEach(f => all.push(f)));
        const f = all.find(x => !x.result && x.home === home && x.away === away) || all.find(x => x.home === home && x.away === away);
        const ctx = { kind: 'euro', league: 'WSE', leagueName: NAME, user: s.user, teams: {} };
        if (f && f.gr != null) {
            ctx.stage = 'G';
            ctx.group = s.groups[f.grp].id;
            ctx.round = f.gr + 1;
            ctx.rounds = 3;
            const table = groupTable(s, f.grp);
            ctx.total = table.length;
            [home, away].forEach(id => {
                const i = table.findIndex(r => r.id === id), r = table[i];
                ctx.teams[id] = Object.assign({ form: formOf(s, id) }, r && r.pg ? { pos: i + 1, pts: r.pts, pg: r.pg } : {});
            });
        } else {
            ctx.stage = f ? f.t : 'F';
            const pl = f && PLACES[f.t];
            if (pl) ctx.place = pl[0];
            else if (f && (f.t === 'P5S' || f.t === 'P9S')) ctx.placeSemi = f.t === 'P5S' ? 5 : 9;   // semifinali dei piazzamenti
            [home, away].forEach(id => { ctx.teams[id] = { form: formOf(s, id) }; });
        }
        return ctx;
    }

    // ------------------------------------------------------------------ HTML (stili di competition.css)
    const resultRow = (s, f) => ENG().resultRow(s, f);
    // sigle di classifica come in competition.js ('V (classifica)' nel dizionario, in italiano resta la sigla)
    const abbr = it => { const k = it + ' (classifica)', v = tr(k); return esc(v === k ? it : v); };
    function groupsHtml(s) {
        const nQ = 2;                                   // le prime due passano sempre
        const thirds = s.format === 12 && s.ko.seeds ? s.ko.seeds.slice(6) : [];
        const cards = s.groups.map((g, gi) => {
            const rows = groupTable(s, gi);
            return `<div class="wse-group"><h5>${esc(tr('Girone {0}', g.id))}</h5><table class="cp-table wse-table">
                <thead><tr><th>#</th><th class="l">Squadra</th><th translate="no">${abbr('PG')}</th><th translate="no">${abbr('V')}</th><th translate="no" title="${esc(tr('Vittorie al supplementare o ai rigori'))}">${abbr('VS')}</th><th translate="no" title="${esc(tr('Sconfitte al supplementare o ai rigori'))}">${abbr('PS')}</th><th translate="no">${abbr('P')}</th><th translate="no">${abbr('DR')}</th><th translate="no">${abbr('PT')}</th></tr></thead>
                <tbody>${rows.map((r, i) => `<tr class="${r.id === s.user ? 'is-user ' : ''}${i < nQ || thirds.includes(r.id) ? 'is-po ' : ''}${i === nQ - 1 ? 'cut' : ''}">
                    <td class="pos">${i + 1}</td>
                    <td class="l"><span class="team" title="${esc(reasonLabel(s.entries.find(e => e.id === r.id) || {}))}"><img src="${logo(r.id)}" alt="">${esc(short(r.id))}</span></td>
                    <td>${r.pg}</td><td>${r.v}</td><td>${r.vs}</td><td>${r.ps}</td><td>${r.p}</td><td>${r.gf - r.gs > 0 ? '+' : ''}${r.gf - r.gs}</td><td class="pts">${r.pts}</td>
                </tr>`).join('')}</tbody></table></div>`;
        }).join('');
        const legend = s.format === 8
            ? tr('Prime due in semifinale (1ª A - 2ª B, 1ª B - 2ª A) • 3ª e 4ª giocano per il 5°-8° posto')
            : tr('Prime due e le due migliori terze ai quarti • le altre giocano per il 9°-12° posto');
        return `<div class="wse-groups g${s.groups.length}" data-pager="y" data-pager-items=".wse-group">${cards}</div>
            <div class="cp-legend"><span><b>■</b> ${esc(legend)}</span><span>${esc(tr('Vittoria 3 pt • al supplementare/rigori 2 pt • sconfitta al supplementare/rigori 1 pt'))}</span></div>`;
    }
    function koGameHtml(s, g, spec) {
        const label = `<div class="wse-gl">${esc(tr(GAME_LABEL[spec.t]))}</div>`;
        if (!g || !g.home || !g.away) return `<div class="cp-series">${label}<div class="tbd">${esc(tr('Da definire'))}</div></div>`;
        const w = winnerOf(g), r = g.result;
        const goals = id => (r ? (id === g.home ? r.hg : r.ag) : '');
        const row = id => `<div class="row${w ? (w === id ? ' won' : ' out') : ''}"><span class="seed">${esc(s.groups[groupOfTeam(s, id)].id)}</span><img src="${logo(id)}" alt=""><span>${esc(short(id))}</span><b>${goals(id)}</b></div>`;
        const tag = r && r.type !== 'REG' ? `<div class="cp-tag">${r.type === 'OT' ? esc(tr('dopo supplementare')) : esc(tr('rigori {0}-{1}', r.so[0], r.so[1]))}</div>` : '';
        return `<div class="cp-series${g.home === s.user || g.away === s.user ? ' is-user' : ''}${spec.t === 'F' ? ' wse-final' : ''}">${label}${row(g.home)}${row(g.away)}${tag}</div>`;
    }
    function koHtml(s) {
        const spec = KO[s.format];
        const cols = spec.map((st, k) => {
            const games = s.ko.stages[k];
            const t = TURNS[s.format].find(x => x.k === k);
            // prima le gare per il titolo, poi i piazzamenti in ordine (3°, 5°, 7°, 9°, 11° posto)
            const order = st.map((sp, i) => ({ sp, i })).sort((a, b) => (KO_ORDER[a.sp.t] - KO_ORDER[b.sp.t]) || a.i - b.i);
            return `<div class="cp-round"><h4>${esc(tr(STAGE_LABEL[s.format][k]))} • ${esc(tr(WEEKDAY[t.d]))}</h4><div class="cp-round-body">${order.map(o => koGameHtml(s, games && games[o.i], o.sp)).join('')}</div></div>`;
        }).join('');
        const rank = s.ranking ? `<div class="cp-round wse-rank"><h4>${esc(tr('Classifica finale'))}</h4><div class="cp-round-body">${s.ranking.map((id, i) => `<div class="cp-series${id === s.user ? ' is-user' : ''}"><div class="row${i === 0 ? ' won' : ''}"><span class="seed">${i + 1}</span><img src="${logo(id)}" alt=""><span>${esc(short(id))}</span><b>${i === 0 ? '🏆' : ''}</b></div></div>`).join('')}</div></div>` : '';
        return `<div class="cp-bracket wse-bracket c${spec.length + (rank ? 1 : 0)}" data-pager="x" data-pager-items=".cp-round">${cols}${rank}</div>`;
    }
    function entriesHtml(s) {
        return `<div class="cp-results wse-entries" data-pager="y">${s.entries.map(e => `<div class="cp-save-row${e.id === s.user ? ' is-user' : ''}">
            <img src="${logo(e.id)}" alt=""><div style="min-width:0"><div class="n">${esc(clubName(e.id))}</div><div class="s">${esc(reasonLabel(e))} • ${esc(tr('Girone {0}', s.groups[groupOfTeam(s, e.id)].id))}</div></div></div>`).join('')}</div>`;
    }
    function turnHeader(s, f, prev) {
        const head = f.gr != null ? tr('Girone {0}', s.groups[f.grp].id) : tr(GAME_LABEL[f.t]);
        return head === prev ? '' : `<div class="cp-res-rest">${esc(head)}</div>`;
    }
    function gamesHtml(s, games) {
        let prev = null;
        return games.map(f => { const h = turnHeader(s, f, prev); prev = f.gr != null ? tr('Girone {0}', s.groups[f.grp].id) : tr(GAME_LABEL[f.t]); return h + resultRow(s, f); }).join('');
    }
    function lastResults(s) {
        if (s.lastTurn == null) return { title: tr('Risultati'), body: `<div class="cp-empty">${esc(tr('Nessuna partita giocata'))}</div>` };
        const t = TURNS[s.format][s.lastTurn];
        const stage = t.g != null ? tr('Giornata {0} di {1}', t.g + 1, 3) : tr(STAGE_LABEL[s.format][t.k]);
        return { title: tr('Risultati • {0}', stage), tab: stage, body: gamesHtml(s, turnGames(s, t)) };
    }
    function upcoming(s) {
        if (s.phase === 'done') return null;
        const games = turnGames(s).filter(f => !f.result && f.home !== s.user && f.away !== s.user);
        if (!games.length) return null;
        const t = curTurn(s);
        return { title: t.g != null ? tr('Giornata {0} di {1}', t.g + 1, 3) : tr(STAGE_LABEL[s.format][t.k]), body: gamesHtml(s, games) };
    }

    window.WSE = {
        NAME, SHORT, LOGO, FEDS, GAME_LABEL, PLACES, WEEKDAY,
        eligibleTeams, fedTeams, ratingRanking, drawVenue, buildEntries, reasonLabel, reasonKey, create,
        groupTable, groupOfTeam, placeOf, finalPlace, stageTitle, userFixture, turnFixtures, completeTurn, simulateAll, dayOffset,
        kickoff, turnLabel, stageName, progressLabel, gameLabel, venueTitle, venueCity, matchContext, formOf,
        groupsHtml, koHtml, entriesHtml, lastResults, upcoming,
        // la gara della squadra nel tabellone (per i messaggi della carriera)
        koGameOf: (s, id, k) => (s.ko.stages[k] || []).find(g => g.home === id || g.away === id) || null,
        stagesCount: s => KO[s.format].length
    };
})();
