// --- src/manager/manager-core.js ---
// Hockey Manager: logica della carriera, senza DOM (testabile anche fuori dal browser).
// Script classico caricato dopo lo script principale e dopo competition.js: usa i globali
// CLUB_ROSTERS, CLUB_RATINGS, ARENA_CATALOG, HOME_CLUB_ARENAS, window.SPONSORS e
// window.Competition.engine (calendario, simulazioni, play-off e Coppa Italia).
//
// Una carriera è un unico oggetto serializzabile (salvato in localStorage dall'interfaccia):
//  - rose di tutte le squadre di Serie A + svincolati, con valutazione, età, stipendio, infortuni
//  - due divisioni: Serie A e Serie B. A fine stagione l'ultima di A retrocede e la vincente dei
//    play-off di B sale. Si gioca il campionato della propria divisione; l'altro va avanti in parallelo
//  - stagione: estate (mercato) → andata → gennaio (Coppa Italia + mercato) → ritorno → play-off → fine
//  - economia: saldo, movimenti per categoria, storico del saldo; fallimento se il saldo va sotto zero
//  - tifosi (gradimento 0-100), reputazione (decide gli sponsor), messaggi
(function () {
    'use strict';
    const G = typeof window !== 'undefined' ? window : globalThis;

    // ------------------------------------------------------------------ parametri di gioco
    const CFG = {
        START_BUDGET: 100000,
        MIN_ROSTER: 14, MAX_ROSTER: 20, MIN_SKATERS: 12, MIN_GOALIES: 1,
        SLOTS: { main: 1, sec: 4 },                 // sponsor: 1 di maglia + 4 secondari
        TIER_BASE: [0, 50, 85, 130, 185, 250],      // €/mese per livello di sponsor (1..5), Serie A
        MAIN_MULT: 1.8,
        // per divisione: biglietto e bar a spettatore, peso di stipendi / palazzetto / sponsor rispetto alla A
        DIV: {
            A: { name: 'Serie A', league: 'SERIE A', ticket: 3.5, bar: 1.5, salary: 1, arena: 1, sponsor: 1 },
            B: { name: 'Serie B', league: 'SERIE B', ticket: 2.5, bar: 1, salary: 0.6, arena: 0.6, sponsor: 0.6 }
        },
        PRIZES: {
            A: { final: 2500, win: 5000, label: 'scudetto' },
            B: { final: 1200, win: 2500, label: 'promozione' },
            cupFinal: 1200, cupWin: 2500
        },
        INJ_P: 0.12,                                // probabilità di infortunio per squadra e partita
        MAX_MESSAGES: 250
    };
    const LINE_W = [0.42, 0.33, 0.25];
    const ROLE_LABEL = { G: 'Portiere', D: 'Difensore', F: 'Attaccante' };
    const CAT = {
        gare: 'Partite', mercato: 'Mercato', infortuni: 'Infermeria', sponsor: 'Sponsor',
        finanze: 'Finanze', tifosi: 'Tifosi', club: 'Società'
    };
    const INJURIES = [
        { t: 'Contusione alla coscia', d: [5, 12], w: 5 },
        { t: 'Mal di schiena', d: [4, 10], w: 4 },
        { t: 'Trauma cranico lieve', d: [7, 14], w: 2 },
        { t: 'Distorsione alla caviglia', d: [10, 25], w: 4 },
        { t: "Stiramento all'inguine", d: [12, 28], w: 3 },
        { t: 'Lussazione alla spalla', d: [25, 45], w: 1.5 },
        { t: 'Frattura al polso', d: [35, 60], w: 1 },
        { t: 'Lesione al ginocchio', d: [30, 70], w: 0.8 }
    ];
    const FIRST = ['Marco', 'Luca', 'Matteo', 'Andrea', 'Alessandro', 'Davide', 'Riccardo', 'Tommaso', 'Nicola', 'Federico',
        'Giacomo', 'Filippo', 'Edoardo', 'Lorenzo', 'Pietro', 'Simone', 'Samuele', 'Gabriele', 'Michele', 'Alberto',
        'Enrico', 'Stefano', 'Mattia', 'Elia', 'Leonardo', 'Francesco', 'Diego', 'Jacopo', 'Manuel', 'Kevin'];
    const LAST = ['BORDIN', 'CAVALLIN', 'DE ZEN', 'FACCHIN', 'GALLO', 'MARCHIORI', 'NARDI', 'ORSO', 'PIVA', 'QUAGLIA',
        'RIZZATO', 'SANTIN', 'TOSO', 'URBAN', 'VALLE', 'ZAMBON', 'BALLAN', 'CERON', 'DONA', 'FERRO', 'GIACON', 'LUISE',
        'MENEGON', 'NALIN', 'PERIN', 'ROSSATO', 'SCHIAVON', 'TREVISIOL', 'VIANELLO', 'ZILIO', 'BEGGIO', 'CHINELLO',
        'DAL MOLIN', 'FAVERO', 'GUERRA', 'LORENZON', 'MILAN', 'NOVELLO', 'PASQUALIN', 'ROSSI', 'SALVADOR', 'TONIOLO'];

    // ------------------------------------------------------------------ utilità
    const rnd = (a, b) => a + Math.random() * (b - a);
    const rint = (a, b) => Math.floor(rnd(a, b + 1));
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const round = (v, s) => Math.round(v / s) * s;
    const byOvr = (a, b) => b.ovr - a.ovr;
    function weighted(list, w) {
        const tot = list.reduce((s, x) => s + w(x), 0);
        let r = Math.random() * tot;
        for (const x of list) { r -= w(x); if (r <= 0) return x; }
        return list[list.length - 1];
    }
    function eur(n) {
        const v = Math.round(n);
        return (v < 0 ? '-' : '') + '€ ' + String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    // date come 'AAAA-MM-GG'
    const dParse = s => new Date(s + 'T12:00:00Z');
    const dFmt = d => d.toISOString().slice(0, 10);
    const dAdd = (s, n) => dFmt(new Date(dParse(s).getTime() + n * 864e5));
    const dDiff = (a, b) => Math.round((dParse(b) - dParse(a)) / 864e5);
    const dMax = (a, b) => (a > b ? a : b);
    const ymd = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    const MONTHS_S = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
    const DAYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
    function dateLabel(s, long) {
        const d = dParse(s);
        const m = d.getUTCMonth();
        return long ? `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[m]} ${d.getUTCFullYear()}` : `${d.getUTCDate()} ${MONTHS_S[m]}`;
    }
    const seasonLabelOf = y => `${y}/${String((y + 1) % 100).padStart(2, '0')}`;

    const engine = () => G.Competition.engine;
    const rosters = () => G.CLUB_ROSTERS || (typeof CLUB_ROSTERS !== 'undefined' ? CLUB_ROSTERS : {});
    const ratingsTable = () => (typeof CLUB_RATINGS !== 'undefined' ? CLUB_RATINGS : G.CLUB_RATINGS);
    const sponsorsCatalog = () => G.SPONSORS || [];
    const sponsorById = id => sponsorsCatalog().find(s => s.id === id);
    const clubName = id => (rosters()[id] ? rosters()[id].name : id);
    const clubShort = id => (rosters()[id] ? rosters()[id].shortName || rosters()[id].name : id);

    // copia intatta di rose e rating: la carriera li sovrascrive e li ripristina all'uscita
    const PRISTINE = {
        rosters: JSON.parse(JSON.stringify(rosters())),
        ratings: JSON.parse(JSON.stringify(ratingsTable() || {}))
    };
    function restoreWorld() {
        const R = rosters(), T = ratingsTable();
        Object.keys(PRISTINE.rosters).forEach(id => {
            if (!R[id]) return;
            ['goalie', 'backupGoalies', 'lines', 'reserves', 'league'].forEach(k => {
                if (PRISTINE.rosters[id][k] !== undefined) R[id][k] = JSON.parse(JSON.stringify(PRISTINE.rosters[id][k]));
            });
        });
        Object.keys(PRISTINE.ratings).forEach(id => { T[id] = Object.assign({}, PRISTINE.ratings[id]); });
    }

    function arenaCapacity(team) {
        const arenas = typeof ARENA_CATALOG !== 'undefined' ? ARENA_CATALOG : G.ARENA_CATALOG;
        const homes = typeof HOME_CLUB_ARENAS !== 'undefined' ? HOME_CLUB_ARENAS : G.HOME_CLUB_ARENAS;
        const a = arenas && arenas[(homes && homes[team]) || team];
        const n = a ? parseInt(String(a.capacity).replace(/\./g, ''), 10) : 400;
        return isFinite(n) && n > 0 ? n : 400;
    }
    function arenaName(team) {
        const arenas = typeof ARENA_CATALOG !== 'undefined' ? ARENA_CATALOG : G.ARENA_CATALOG;
        const homes = typeof HOME_CLUB_ARENAS !== 'undefined' ? HOME_CLUB_ARENAS : G.HOME_CLUB_ARENAS;
        const a = arenas && arenas[(homes && homes[team]) || team];
        return a ? a.shortTitle : '';
    }
    // divisione di una squadra nella carriera ('A' o 'B')
    const divOf = (c, team) => (c.div && c.div.B && c.div.B.includes(team) ? 'B' : 'A');
    const userDiv = c => divOf(c, c.user);
    const divTeams = (c, d) => (c.div ? c.div[d] : c.teams);
    // affitto del palazzetto a settimana: 50-100 € in Serie A secondo la capienza, meno in B
    function arenaFee(team, c) {
        const k = clamp((arenaCapacity(team) - 150) / (1100 - 150), 0, 1);
        const d = c ? divOf(c, team) : 'A';
        return Math.round((50 + 50 * k) * CFG.DIV[d].arena);
    }
    const arenaMonthly = c => Math.round(arenaFee(c.user, c) * 52 / 12);
    const monthlyCosts = c => payroll(c) + arenaMonthly(c);

    // ------------------------------------------------------------------ giocatori
    // stipendio mensile e valore di mercato in funzione della valutazione (ovr) e dell'età
    // in Serie A un giocatore prende in media circa 100 € al mese; i campioni molto di più, in B meno
    const salaryFor = (ovr, div) => Math.max(10, round((12 + Math.pow(Math.max(0, ovr - 55), 2) * 0.245 + Math.pow(Math.max(0, ovr - 78), 2) * 1.0) * CFG.DIV[div || 'A'].salary, 5));
    function ageFactor(age) { return age <= 21 ? 1.3 : age <= 25 ? 1.15 : age <= 29 ? 1 : age <= 32 ? 0.8 : 0.55; }
    const valueOf = p => Math.max(100, round(Math.pow(Math.max(0, p.ovr - 50), 2) * 4 * ageFactor(p.age), 100));

    function newPlayer(c, o) {
        const id = 'p' + (c.nextPid++);
        const p = Object.assign({ id, first: pick(FIRST), name: pick(LAST), num: '', pos: 'F', role: 'C', ovr: 60, age: 24, salary: 0, team: null, inj: null, forSale: false, gp: 0, w: 0 }, o);
        p.ovr = clamp(Math.round(p.ovr), 40, 95);
        if (!p.salary) p.salary = round(salaryFor(p.ovr, p.team ? divOf(c, p.team) : 'A') * rnd(0.9, 1.1), 5);
        c.players[id] = p;
        return p;
    }
    function genFreeAgent(c, kind) {
        const goalie = Math.random() < 0.2;
        const youth = kind === 'youth' || (kind !== 'vet' && Math.random() < 0.5);
        const pos = goalie ? 'G' : (Math.random() < 0.35 ? 'D' : 'F');
        const role = pos === 'G' ? 'G' : pos === 'D' ? 'D' : pick(['C', 'LW', 'RW']);
        return newPlayer(c, {
            pos, role,
            ovr: youth ? rint(52, 67) : rint(58, 75),
            age: youth ? rint(18, 22) : rint(26, 34),
            team: null
        });
    }
    function teamPlayers(c, team) { return Object.values(c.players).filter(p => p.team === team); }
    function freeAgents(c) { return Object.values(c.players).filter(p => p.team === null); }
    function freeNumber(c, team, wanted) {
        const used = new Set(teamPlayers(c, team).map(p => p.num));
        if (wanted && !used.has(wanted)) return wanted;
        const prefs = [];
        for (let n = 2; n <= 99; n++) prefs.push(String(n));
        return prefs.find(n => !used.has(n)) || '0';
    }
    function counts(c, team) {
        const ps = teamPlayers(c, team);
        return { total: ps.length, goalies: ps.filter(p => p.pos === 'G').length, skaters: ps.filter(p => p.pos !== 'G').length };
    }
    // una squadra può privarsi del giocatore senza scendere sotto i minimi?
    // (contando anche gli infortunati: deve restare una formazione completa di giocatori sani)
    function canRemove(c, p) {
        if (!p.team) return true;
        const k = counts(c, p.team);
        if (k.total - 1 < CFG.MIN_ROSTER) return false;
        if (p.pos === 'G' ? k.goalies - 1 < CFG.MIN_GOALIES : k.skaters - 1 < CFG.MIN_SKATERS) return false;
        if (p.inj) return true;
        const healthy = teamPlayers(c, p.team).filter(x => !x.inj && (p.pos === 'G' ? x.pos === 'G' : x.pos !== 'G'));
        return p.pos === 'G' ? healthy.length - 1 >= CFG.MIN_GOALIES : healthy.length - 1 >= CFG.MIN_SKATERS;
    }

    // rose iniziali: i giocatori reali della configurazione, con valutazioni coerenti coi rating del club
    function seedTeam(c, team) {
        const R = PRISTINE.rosters[team], r = PRISTINE.ratings[team] || { off: 70, def: 70, goa: 70 };
        const age = (a, b) => rint(a, b);
        newPlayer(c, { first: R.goalie.first || '', name: R.goalie.name, num: R.goalie.num, pos: 'G', role: 'G', ovr: r.goa + rint(-1, 1), age: age(21, 33), team });
        (R.backupGoalies || []).forEach(g => newPlayer(c, { first: g.first || '', name: g.name, num: g.num, pos: 'G', role: 'G', ovr: r.goa - rint(6, 11), age: age(18, 30), team }));
        const off = [3, 0, -4];
        const seen = new Set();
        R.lines.forEach((line, li) => line.forEach(pl => {
            const key = pl.num + '|' + pl.name + '|' + (pl.first || '');
            if (seen.has(key)) return;
            seen.add(key);
            const isD = pl.role === 'D';
            newPlayer(c, {
                first: pl.first || '', name: pl.name, num: pl.num, pos: isD ? 'D' : 'F', role: pl.role,
                ovr: (isD ? r.def : r.off) + off[li] + rint(-2, 2), age: age(li === 0 ? 23 : 19, li === 0 ? 32 : 31), team
            });
        }));
        (R.reserves || []).forEach(pl => {
            const isD = Math.random() < 0.35;
            newPlayer(c, {
                first: pl.first || '', name: pl.name, num: pl.num, pos: isD ? 'D' : 'F', role: isD ? 'D' : pick(['C', 'LW', 'RW']),
                ovr: (r.off + r.def) / 2 - 8 + rint(-3, 3), age: age(18, 24), team
            });
        });
    }

    // ------------------------------------------------------------------ formazione e rating
    function placeholder(pos) {
        return { id: 'tmp' + pos + Math.random().toString(36).slice(2, 6), first: '', name: 'GIOVANE', num: '99', pos, role: pos === 'G' ? 'G' : pos, ovr: 48, age: 17, temp: true };
    }
    // formazione automatica: il miglior portiere sano, 3 linee da C/LW/RW + D, il resto in riserva
    function lineup(c, team) {
        const healthy = teamPlayers(c, team).filter(p => !p.inj).sort(byOvr);
        const gs = healthy.filter(p => p.pos === 'G');
        const pool = { F: healthy.filter(p => p.pos === 'F'), D: healthy.filter(p => p.pos === 'D') };
        const take = pref => {
            const alt = pref === 'F' ? 'D' : 'F';
            return (pool[pref].length ? pool[pref] : pool[alt]).shift() || placeholder(pref);
        };
        const lines = [0, 1, 2].map(() => {
            const fw = [take('F'), take('F'), take('F')];
            const d = take('D');
            const slot = {};
            ['C', 'LW', 'RW'].forEach(role => {
                const i = fw.findIndex(p => p.role === role);
                if (i >= 0) slot[role] = fw.splice(i, 1)[0];
            });
            ['C', 'LW', 'RW'].forEach(role => { if (!slot[role]) slot[role] = fw.shift(); });
            return { C: slot.C, LW: slot.LW, RW: slot.RW, D: d };
        });
        return { goalie: gs[0] || placeholder('G'), backups: gs.slice(1), lines, reserves: pool.F.concat(pool.D) };
    }
    function ratingsOf(c, team) {
        const L = lineup(c, team);
        let off = 0, def = 0;
        L.lines.forEach((l, i) => { off += LINE_W[i] * (l.C.ovr + l.LW.ovr + l.RW.ovr) / 3; def += LINE_W[i] * l.D.ovr; });
        return { off: Math.round(off), def: Math.round(def), goa: Math.round(L.goalie.ovr) };
    }
    const strengthOf = r => (r.off + r.def + r.goa) / 3;
    function teamStrength(c, team) { return strengthOf(ratingsOf(c, team)); }

    // scrive rating e rose della carriera nei globali usati da simulazioni e partita 3D
    function syncWorld(c) {
        const T = ratingsTable(), R = rosters();
        c.teams.forEach(team => {
            T[team] = ratingsOf(c, team);
            if (!R[team]) return;
            if (c.div) R[team].league = CFG.DIV[divOf(c, team)].league;
            const L = lineup(c, team);
            const entry = (p, role) => ({ role, num: p.num, name: p.name, first: p.first, g: p.g || 0, a: p.a || 0, pts: (p.g || 0) + (p.a || 0) });
            R[team].goalie = { num: L.goalie.num, name: L.goalie.name, first: L.goalie.first };
            R[team].backupGoalies = L.backups.map(p => ({ num: p.num, name: p.name, first: p.first }));
            R[team].lines = L.lines.map(l => [entry(l.C, 'C'), entry(l.LW, 'LW'), entry(l.RW, 'RW'), entry(l.D, 'D')]);
            R[team].reserves = L.reserves.map(p => ({ num: p.num, name: p.name, first: p.first }));
        });
    }

    // ------------------------------------------------------------------ messaggi e movimenti
    function msg(c, cat, title, body, act) {
        const m = { id: 'm' + (c.nextMid++), d: c.date, cat, title, body, read: false };
        if (act) m.act = act;
        c.messages.unshift(m);
        if (c.messages.length > CFG.MAX_MESSAGES) {
            // si scartano prima i messaggi più vecchi già letti e senza azioni in sospeso
            for (let i = c.messages.length - 1; i >= 0 && c.messages.length > CFG.MAX_MESSAGES; i--) {
                if (c.messages[i].read && !c.messages[i].act) c.messages.splice(i, 1);
            }
            c.messages.length = Math.min(c.messages.length, CFG.MAX_MESSAGES);
        }
        c.report && c.report.messages.push(m);
        return m;
    }
    const INCOME_CATS = { biglietti: 'Biglietti', bar: 'Bar del palazzetto', sponsor: 'Sponsor', premi: 'Premi competizioni', cessioni: 'Cessioni giocatori', bonus: 'Bonus sponsor' };
    const EXPENSE_CATS = { stipendi: 'Stipendi giocatori', palazzetto: 'Affitto palazzetto', acquisti: 'Acquisti giocatori', buonuscite: 'Buonuscite' };
    function money(c, cat, amt, note) {
        if (!amt) return;
        c.balance += amt;
        c.ledger.push({ d: c.date, s: c.seasonYear, cat, amt: Math.round(amt), note: note || '' });
        if (c.report) c.report.money.push({ cat, amt: Math.round(amt), note: note || '' });
    }
    function pushHistory(c) {
        const last = c.history[c.history.length - 1];
        if (last && last.d === c.date) last.b = Math.round(c.balance);
        else c.history.push({ d: c.date, b: Math.round(c.balance) });
    }
    const payroll = c => teamPlayers(c, c.user).reduce((s, p) => s + p.salary, 0);
    const sponsorMonthly = c => c.sponsors.active.reduce((s, x) => s + x.monthly, 0);

    // pagamenti del primo del mese (stipendi, palazzetto, rate degli sponsor) tra due date
    function settleMonths(c, from, to) {
        let d = dParse(from);
        let y = d.getUTCFullYear(), m = d.getUTCMonth() + 1;    // mese successivo a 'from'
        if (!(to >= from)) return;
        for (let guard = 0; guard < 36; guard++) {
            if (m > 11) { m = 0; y++; }
            const first = ymd(y, m + 1, 1);
            if (first > to) break;
            if (first > from) {
                const saved = c.date;
                c.date = first;
                const mon = MONTHS[m];
                c.sponsors.active.forEach(s => money(c, 'sponsor', s.monthly, `${sponsorById(s.sid) ? sponsorById(s.sid).name : 'Sponsor'} • ${mon}`));
                money(c, 'stipendi', -payroll(c), `Stipendi di ${mon}`);
                pushHistory(c);
                c.date = saved;
            }
            m++;
        }
        // affitto del palazzetto: ogni lunedì tra le due date, sommato in un unico movimento
        let weeks = 0, firstMon = null;
        for (let d2 = dAdd(from, 1); d2 <= to; d2 = dAdd(d2, 1)) if (dParse(d2).getUTCDay() === 1) { weeks++; if (!firstMon) firstMon = d2; }
        if (weeks) {
            const saved = c.date;
            c.date = to;
            money(c, 'palazzetto', -arenaFee(c.user, c) * weeks, `${arenaName(c.user) || 'Palazzetto'} • ${weeks} ${weeks > 1 ? 'settimane' : 'settimana'}`);
            c.date = saved;
        }
    }

    // ------------------------------------------------------------------ tifosi e reputazione
    function fansMood(v) {
        return v >= 80 ? 'Entusiasti' : v >= 62 ? 'Soddisfatti' : v >= 45 ? 'Tiepidi' : v >= 28 ? 'Delusi' : 'In rivolta';
    }
    function addFans(c, delta, why) {
        const before = c.fans;
        c.fans = clamp(c.fans + delta, 0, 100);
        if (c.report) c.report.fans += c.fans - before;
        if (why && Math.abs(delta) >= 4) msg(c, 'tifosi', delta > 0 ? 'Tifosi in festa' : 'Tifosi scontenti', `${why} Gradimento ${Math.round(before)} → ${Math.round(c.fans)}.`);
    }
    // posizione attesa per rating, posizione reale: base della reputazione
    function expectedRank(c) {
        return divTeams(c, userDiv(c)).slice().sort((a, b) => teamStrength(c, b) - teamStrength(c, a)).indexOf(c.user) + 1;
    }
    function currentRank(c) {
        if (!c.league) return null;
        const t = engine().standings(c.league);
        if (!t.some(r => r.pg > 0)) return null;
        return t.findIndex(r => r.id === c.user) + 1;
    }
    function updateReputation(c) {
        const n = Math.max(2, divTeams(c, userDiv(c)).length);
        const exp = expectedRank(c);
        const pos = currentRank(c) || c.lastRank || exp;
        const abs = 100 * (n - pos) / (n - 1);
        const rel = clamp(50 + (exp - pos) * 10, 0, 100);
        const recent = c.trophies.filter(t => t.season >= c.seasonYear - 1).length;
        const target = clamp(0.45 * c.fans + 0.55 * (0.4 * abs + 0.6 * rel) + Math.min(24, recent * 12), 0, 100);
        c.rep = c.rep == null ? target : c.rep + (target - c.rep) * 0.35;
    }

    // ------------------------------------------------------------------ sponsor
    const maxTier = rep => clamp(1 + Math.floor(rep / 20), 1, 5);
    const minRepFor = tier => (tier - 1) * 20 - 12;
    function freeSlots(c) {
        const main = c.sponsors.active.filter(s => s.slot === 'main').length;
        const sec = c.sponsors.active.filter(s => s.slot === 'sec').length;
        return { main: CFG.SLOTS.main - main, sec: CFG.SLOTS.sec - sec };
    }
    function sponsorAmount(c, tier, slot) {
        return round(CFG.TIER_BASE[tier] * CFG.DIV[userDiv(c)].sponsor * (slot === 'main' ? CFG.MAIN_MULT : 1) * (0.7 + c.rep / 100 * 0.5) * rnd(0.9, 1.1), 10);
    }
    function sponsorOffer(c, forcedSlot, sid, quiet) {
        const free = freeSlots(c);
        const pending = c.sponsors.offers;
        const pendingMain = pending.filter(o => o.slot === 'main').length;
        let slot = forcedSlot || (free.main > pendingMain && Math.random() < 0.45 ? 'main' : 'sec');
        if (slot === 'main' && free.main - pendingMain <= 0) slot = 'sec';
        if (slot === 'sec' && free.sec - pending.filter(o => o.slot === 'sec').length <= 0) return null;
        const busy = new Set(c.sponsors.active.map(s => s.sid).concat(pending.map(o => o.sid)));
        let s = sid ? sponsorById(sid) : null;
        if (!s) {
            const top = maxTier(c.rep);
            const cand = sponsorsCatalog().filter(x => !busy.has(x.id) && x.tier <= top && x.tier >= Math.max(1, top - 2));
            if (!cand.length) return null;
            s = weighted(cand, x => (x.tier === top ? 3 : x.tier === top - 1 ? 2 : 1) * (slot === 'main' ? x.tier : 1));
        }
        const o = {
            id: 'o' + (c.nextMid++), sid: s.id, slot,
            monthly: sponsorAmount(c, s.tier, slot),
            seasons: rint(1, 3),
            winBonus: s.tier * 40 * (slot === 'main' ? 2 : 1),
            trophyBonus: s.tier * 500 * (slot === 'main' ? 2 : 1),
            expires: dAdd(c.date, 30)
        };
        pending.push(o);
        if (!quiet) {
            msg(c, 'sponsor', `Proposta da ${s.name}`,
                `${s.name} (${s.sector}) vuole diventare ${slot === 'main' ? 'sponsor di maglia' : 'sponsor secondario'}: ${eur(o.monthly)} al mese per ${o.seasons} ${o.seasons > 1 ? 'stagioni' : 'stagione'}, ${eur(o.winBonus)} per ogni vittoria e ${eur(o.trophyBonus)} per ogni trofeo. Valida fino al ${dateLabel(o.expires)}.`,
                { kind: 'sponsor', ref: o.id });
        }
        return o;
    }
    function acceptSponsor(c, offerId) {
        const i = c.sponsors.offers.findIndex(o => o.id === offerId);
        if (i < 0) return { ok: false, msg: 'Proposta non più disponibile' };
        const o = c.sponsors.offers[i];
        if (freeSlots(c)[o.slot] <= 0) return { ok: false, msg: o.slot === 'main' ? 'Hai già uno sponsor di maglia' : 'Tutti gli spazi per sponsor secondari sono occupati' };
        c.sponsors.offers.splice(i, 1);
        c.sponsors.active.push({ sid: o.sid, slot: o.slot, monthly: o.monthly, winBonus: o.winBonus, trophyBonus: o.trophyBonus, until: c.seasonYear + o.seasons - 1, since: c.date });
        closeAction(c, 'sponsor', o.id, 'Accettata');
        const s = sponsorById(o.sid);
        msg(c, 'sponsor', `Firmato con ${s.name}`, `Contratto ${o.slot === 'main' ? 'di maglia' : 'secondario'} da ${eur(o.monthly)} al mese. La prima rata arriva il primo del mese.`);
        return { ok: true };
    }
    function rejectSponsor(c, offerId) {
        const i = c.sponsors.offers.findIndex(o => o.id === offerId);
        if (i >= 0) c.sponsors.offers.splice(i, 1);
        closeAction(c, 'sponsor', offerId, 'Rifiutata');
        return { ok: true };
    }
    function sponsorsTick(c, eventKind) {
        // proposte scadute
        c.sponsors.offers = c.sponsors.offers.filter(o => {
            if (o.expires >= c.date) return true;
            closeAction(c, 'sponsor', o.id, 'Scaduta');
            return false;
        });
        // risultati deludenti: chi ha un livello troppo alto per la reputazione attuale può recedere
        c.sponsors.active = c.sponsors.active.filter(a => {
            const s = sponsorById(a.sid);
            if (!s || c.rep >= minRepFor(s.tier) || Math.random() > 0.07) return true;
            msg(c, 'sponsor', `${s.name} recede dal contratto`, `Per i risultati deludenti (reputazione ${Math.round(c.rep)}) ${s.name} interrompe la sponsorizzazione da ${eur(a.monthly)} al mese.`);
            return false;
        });
        const free = freeSlots(c);
        if (free.main + free.sec <= 0 || c.sponsors.offers.length >= 4) return;
        const p = (eventKind === 'market' ? 0.5 : 0.2) + (free.main > 0 ? 0.1 : 0);
        if (Math.random() < p) sponsorOffer(c);
    }

    // ------------------------------------------------------------------ infortuni
    function injuryTick(c) {
        Object.values(c.players).forEach(p => {
            if (!p.inj || p.inj.until > c.date) return;
            p.inj = null;
            if (p.team === c.user) msg(c, 'infortuni', `${p.name} è di nuovo disponibile`, `${p.first} ${p.name} ha recuperato ed è tornato ad allenarsi con il gruppo.`);
        });
    }
    function maybeInjure(c, team) {
        if (Math.random() > CFG.INJ_P) return null;
        const ps = teamPlayers(c, team);
        const injured = ps.filter(p => p.inj).length;
        if (injured >= (ps.length >= 18 ? 3 : 2)) return null;           // mai troppi infortunati insieme
        const healthy = ps.filter(p => !p.inj);
        const hs = healthy.filter(p => p.pos !== 'G').length, hg = healthy.filter(p => p.pos === 'G').length;
        const cand = healthy.filter(p => (p.pos === 'G' ? hg - 1 >= 1 : hs - 1 >= CFG.MIN_SKATERS));
        if (!cand.length) return null;
        const L = lineup(c, team);
        const onIce = new Set([L.goalie.id].concat(...L.lines.map(l => [l.C.id, l.LW.id, l.RW.id, l.D.id])));
        const p = weighted(cand, x => (onIce.has(x.id) ? 3 : 0.4) * (x.pos === 'G' ? 0.35 : 1));
        const t = weighted(INJURIES, x => x.w);
        const days = rint(t.d[0], t.d[1]);
        p.inj = { t: t.t, days, since: c.date, until: dAdd(c.date, days) };
        if (team === c.user) {
            msg(c, 'infortuni', `Infortunio: ${p.name}`, `${p.first} ${p.name} (${ROLE_LABEL[p.pos]}) • ${t.t}. Prognosi ${days} giorni, rientro previsto il ${dateLabel(p.inj.until)}.`);
            if (c.report) c.report.injuries.push(p.id);
        }
        return p;
    }

    // ------------------------------------------------------------------ mercato
    function windowOpen(c) { return !!c.window; }
    function negotiation(c, pid) {
        if (!c.market.neg[pid]) c.market.neg[pid] = { tries: 0, club: rnd(0.92, 1.12), player: rnd(0.95, 1.1), closed: false };
        return c.market.neg[pid];
    }
    function clubAsk(c, p) {
        if (!p.team) return 0;
        const ps = teamPlayers(c, p.team).sort(byOvr);
        const rank = ps.indexOf(p);
        let k = rank < 4 ? 1.35 : rank < 8 ? 1.15 : 1;
        if (ps.length >= 18) k *= 0.9;
        return round(valueOf(p) * k * negotiation(c, p.id).club, 500);
    }
    function playerAsk(c, p) {
        const ud = userDiv(c);
        let base = p.team ? Math.max(p.salary * 1.05, salaryFor(p.ovr, ud)) : salaryFor(p.ovr, ud);
        if (p.team && teamStrength(c, p.team) > teamStrength(c, c.user) + 3) base *= 1.15;
        if (p.team && ud === 'B' && divOf(c, p.team) === 'A') base *= 1.2;    // scendere di categoria costa
        return Math.max(10, round(base * negotiation(c, p.id).player, 5));
    }
    function marketBlock(c, p) {
        if (!windowOpen(c)) return 'Il mercato è chiuso: riapre a fine stagione e a gennaio.';
        if (p.team === c.user) return 'Il giocatore è già nella tua rosa.';
        if (counts(c, c.user).total >= CFG.MAX_ROSTER) return `Rosa al completo (${CFG.MAX_ROSTER} giocatori): prima cedi o svincola qualcuno.`;
        if (negotiation(c, p.id).closed) return 'Trattativa chiusa: il club non vuole più sentirne parlare fino alla prossima sessione.';
        if (p.team && !canRemove(c, p)) return `${clubName(p.team)} non può privarsene: rosa al minimo.`;
        return null;
    }
    function transfer(c, p, to, fee) {
        const from = p.team;
        if (to) p.num = freeNumber(c, to, p.num);
        p.team = to;
        p.forSale = false;
        p.joined = c.date;
        return from;
    }
    function topRank(c, team, p) { return teamPlayers(c, team).sort(byOvr).indexOf(p); }
    // offerta dell'utente: prima il club (cartellino), poi il giocatore (stipendio)
    function makeOffer(c, pid, fee, salary) {
        const p = c.players[pid];
        if (!p) return { ok: false, msg: 'Giocatore non trovato' };
        const block = marketBlock(c, p);
        if (block) return { ok: false, msg: block };
        fee = Math.max(0, Math.round(fee || 0)); salary = Math.max(0, Math.round(salary || 0));
        if (fee > c.balance) return { ok: false, msg: `Saldo insufficiente: disponibili ${eur(c.balance)}.` };
        const neg = negotiation(c, pid);
        const from = p.team;
        const fail = (stage, text, ask) => {
            neg.tries++;
            if (neg.tries >= 3) { neg.closed = true; text += ' La trattativa è chiusa.'; }
            msg(c, 'mercato', `Offerta per ${p.name}: ${stage === 'club' ? 'il club dice no' : 'il giocatore dice no'}`, text);
            return { ok: false, stage, msg: text, ask, closed: neg.closed };
        };
        if (from) {
            const ask = clubAsk(c, p);
            if (fee < ask) {
                if (fee >= ask * 0.8) return fail('club', `${clubName(from)} rifiuta ${eur(fee)} per ${p.name}, ma tratterebbe a partire da ${eur(ask)}.`, ask);
                return fail('club', `${clubName(from)} giudica l'offerta di ${eur(fee)} per ${p.name} troppo bassa.`, null);
            }
        }
        const pask = playerAsk(c, p);
        if (salary < pask) return fail('player', `${p.first} ${p.name} rifiuta uno stipendio di ${eur(salary)} al mese: ne chiede almeno ${eur(pask)}.`, pask);
        // affare fatto
        transfer(c, p, c.user);
        p.salary = salary;
        if (fee) money(c, 'acquisti', -fee, `${p.name} da ${clubShort(from)}`);
        const rk = topRank(c, c.user, p);
        msg(c, 'mercato', `Ufficiale: ${p.name} è un nuovo giocatore`, `${p.first} ${p.name} (${ROLE_LABEL[p.pos]}, ${p.ovr}) arriva ${from ? `da ${clubName(from)} per ${eur(fee)}` : 'da svincolato'}. Stipendio ${eur(salary)} al mese, maglia n° ${p.num}.`);
        if (rk === 0) addFans(c, 5, `Colpo di mercato: arriva ${p.name}!`);
        else if (rk < 3) addFans(c, 3, null);
        delete c.market.neg[pid];
        return { ok: true, msg: `${p.name} è tuo! Maglia n° ${p.num}.` };
    }
    function releasePlayer(c, pid) {
        const p = c.players[pid];
        if (!p || p.team !== c.user) return { ok: false, msg: 'Giocatore non in rosa' };
        if (!windowOpen(c)) return { ok: false, msg: 'Si può svincolare solo durante il mercato.' };
        if (!canRemove(c, p)) return { ok: false, msg: `Non puoi scendere sotto ${CFG.MIN_ROSTER} giocatori (almeno ${CFG.MIN_SKATERS} di movimento e ${CFG.MIN_GOALIES} portiere).` };
        const cost = p.salary * 2;
        if (cost > c.balance) return { ok: false, msg: 'Saldo insufficiente per la buonuscita.' };
        const rk = topRank(c, c.user, p);
        transfer(c, p, null);
        money(c, 'buonuscite', -cost, `Svincolo di ${p.name}`);
        msg(c, 'mercato', `${p.name} svincolato`, `Contratto risolto con ${p.first} ${p.name}: buonuscita di ${eur(cost)} (due mensilità).`);
        if (rk < 3) addFans(c, -4, null);
        return { ok: true, msg: `${p.name} svincolato (${eur(cost)} di buonuscita)` };
    }
    function toggleForSale(c, pid) {
        const p = c.players[pid];
        if (!p || p.team !== c.user) return false;
        p.forSale = !p.forSale;
        return p.forSale;
    }
    // offerte delle altre squadre per i giocatori dell'utente
    function cpuOffersToUser(c) {
        const open = c.market.incoming.filter(o => o.status === 'open');
        if (open.length >= 3) return;
        const listed = teamPlayers(c, c.user).filter(p => p.forSale);
        let n = (Math.random() < 0.45 ? 1 : 0) + (listed.length && Math.random() < 0.65 ? 1 : 0);
        while (n-- > 0) {
            const cand = teamPlayers(c, c.user).filter(p => canRemove(c, p) && !open.some(o => o.pid === p.id));
            if (!cand.length) return;
            const p = weighted(cand, x => (x.forSale ? 6 : 1) * Math.max(1, x.ovr - 55));
            const buyers = c.teams.filter(t => t !== c.user && counts(c, t).total < CFG.MAX_ROSTER);
            if (!buyers.length) return;
            const buyer = weighted(buyers, t => {
                const weakest = teamPlayers(c, t).filter(x => x.pos === p.pos).sort(byOvr).slice(0, p.pos === 'G' ? 1 : p.pos === 'D' ? 3 : 9).pop();
                return weakest && p.ovr > weakest.ovr ? 3 : 1;
            });
            const fee = round(valueOf(p) * (p.forSale ? rnd(0.85, 1.05) : rnd(0.95, 1.3)), 500);
            const o = { id: 'x' + (c.nextMid++), pid: p.id, buyer, fee, expires: dAdd(c.date, 21), status: 'open' };
            c.market.incoming.push(o);
            open.push(o);
            msg(c, 'mercato', `Offerta di ${clubShort(buyer)} per ${p.name}`,
                `${clubName(buyer)} offre ${eur(fee)} per il cartellino di ${p.first} ${p.name} (${ROLE_LABEL[p.pos]}, ${p.ovr}, valore stimato ${eur(valueOf(p))}). Offerta valida fino al ${dateLabel(o.expires)}.`,
                { kind: 'cpu_offer', ref: o.id });
        }
    }
    function answerIncoming(c, offerId, accept) {
        const o = c.market.incoming.find(x => x.id === offerId);
        if (!o || o.status !== 'open') return { ok: false, msg: 'Offerta non più valida' };
        const p = c.players[o.pid];
        if (!accept) {
            o.status = 'rejected';
            closeAction(c, 'cpu_offer', o.id, 'Rifiutata');
            return { ok: true, msg: 'Offerta rifiutata' };
        }
        if (!windowOpen(c)) return { ok: false, msg: 'Il mercato è chiuso' };
        if (!p || p.team !== c.user) { o.status = 'void'; closeAction(c, 'cpu_offer', o.id, 'Decaduta'); return { ok: false, msg: 'Il giocatore non è più in rosa' }; }
        if (!canRemove(c, p)) return { ok: false, msg: `Non puoi scendere sotto ${CFG.MIN_ROSTER} giocatori (almeno ${CFG.MIN_SKATERS} di movimento e ${CFG.MIN_GOALIES} portiere).` };
        if (counts(c, o.buyer).total >= CFG.MAX_ROSTER) { o.status = 'void'; closeAction(c, 'cpu_offer', o.id, 'Decaduta'); return { ok: false, msg: `${clubName(o.buyer)} ha la rosa al completo` }; }
        const rk = topRank(c, c.user, p);
        o.status = 'accepted';
        transfer(c, p, o.buyer);
        p.salary = Math.max(p.salary, salaryFor(p.ovr, divOf(c, o.buyer)));
        money(c, 'cessioni', o.fee, `${p.name} a ${clubShort(o.buyer)}`);
        closeAction(c, 'cpu_offer', o.id, 'Accettata');
        msg(c, 'mercato', `Ceduto ${p.name}`, `${p.first} ${p.name} passa a ${clubName(o.buyer)} per ${eur(o.fee)}.`);
        if (rk === 0) addFans(c, -8, `I tifosi non perdonano la cessione di ${p.name}, il migliore della squadra.`);
        else if (rk < 3) addFans(c, -4, null);
        // le altre offerte per lo stesso giocatore decadono
        c.market.incoming.filter(x => x.pid === p.id && x.status === 'open').forEach(x => { x.status = 'void'; closeAction(c, 'cpu_offer', x.id, 'Decaduta'); });
        return { ok: true, msg: `${p.name} ceduto a ${clubShort(o.buyer)} per ${eur(o.fee)}` };
    }
    function closeAction(c, kind, ref, label) {
        c.messages.forEach(m => { if (m.act && m.act.kind === kind && m.act.ref === ref) { m.act.done = label; } });
    }
    // movimenti tra squadre della CPU: tengono le rose tra i minimi e i massimi
    function aiMarket(c, news) {
        const fa = () => freeAgents(c).sort(byOvr);
        c.teams.filter(t => t !== c.user).forEach(t => {
            let k = counts(c, t);
            // portiere di riserva e minimi di rosa
            while (k.total < CFG.MAX_ROSTER && (k.total < CFG.MIN_ROSTER + 1 || k.goalies < 2 || k.skaters < CFG.MIN_SKATERS + 1)) {
                const need = k.goalies < 2 ? 'G' : (k.skaters < CFG.MIN_SKATERS + 1 ? 'S' : null);
                let p = fa().find(x => (need === 'G' ? x.pos === 'G' : need === 'S' ? x.pos !== 'G' : true));
                if (!p && need === 'G') p = newPlayer(c, { pos: 'G', role: 'G', ovr: rint(56, 68), age: rint(19, 32), team: null });
                if (!p) break;
                transfer(c, p, t); p.salary = salaryFor(p.ovr, divOf(c, t));
                if (news && p.ovr >= 66) msg(c, 'mercato', 'Notizie di mercato', `${clubName(t)} ingaggia lo svincolato ${p.first} ${p.name} (${ROLE_LABEL[p.pos]}, ${p.ovr}).`);
                k = counts(c, t);
            }
            while (k.total > CFG.MAX_ROSTER - 1) {
                const worst = teamPlayers(c, t).filter(p => canRemove(c, p)).sort(byOvr).pop();
                if (!worst) break;
                transfer(c, worst, null);
                k = counts(c, t);
            }
            if (!news) return;
            // rinforzo: uno svincolato migliore dell'ultimo titolare del suo reparto
            if (Math.random() < 0.15 && k.total < CFG.MAX_ROSTER) {
                const pos = pick(['F', 'F', 'D', 'G']);
                const starters = teamPlayers(c, t).filter(p => p.pos === pos).sort(byOvr).slice(0, pos === 'G' ? 1 : pos === 'D' ? 3 : 9);
                const weakest = starters[starters.length - 1];
                const p = fa().find(x => x.pos === pos && (!weakest || x.ovr > weakest.ovr + 1));
                if (p) {
                    transfer(c, p, t); p.salary = salaryFor(p.ovr, divOf(c, t));
                    msg(c, 'mercato', 'Notizie di mercato', `${clubName(t)} ingaggia lo svincolato ${p.first} ${p.name} (${ROLE_LABEL[p.pos]}, ${p.ovr}).`);
                }
            }
            // acquisto da un'altra squadra della CPU
            if (Math.random() < 0.12 && counts(c, t).total < CFG.MAX_ROSTER) {
                const pos = pick(['F', 'F', 'D']);
                const starters = teamPlayers(c, t).filter(p => p.pos === pos).sort(byOvr).slice(0, pos === 'D' ? 3 : 9);
                const weakest = starters[starters.length - 1];
                const cand = Object.values(c.players).filter(p => p.team && p.team !== t && p.team !== c.user && p.pos === pos
                    && (!weakest || p.ovr > weakest.ovr + 2) && counts(c, p.team).total > CFG.MIN_ROSTER + 1 && canRemove(c, p));
                if (cand.length) {
                    const p = weighted(cand, x => 1 / valueOf(x));
                    const from = p.team, fee = round(valueOf(p) * rnd(1, 1.2), 500);
                    transfer(c, p, t);
                    msg(c, 'mercato', 'Notizie di mercato', `${p.first} ${p.name} (${ROLE_LABEL[p.pos]}, ${p.ovr}) passa da ${clubName(from)} a ${clubName(t)} per ${eur(fee)}.`);
                }
            }
        });
    }
    function refillFreeAgents(c, target) {
        let n = freeAgents(c).length;
        while (n++ < target) genFreeAgent(c);
        // sempre qualche portiere disponibile: nessuna squadra deve restare senza
        let g = freeAgents(c).filter(p => p.pos === 'G').length;
        while (g++ < 4) newPlayer(c, { pos: 'G', role: 'G', ovr: rint(56, 70), age: rint(19, 32), team: null });
    }
    // nessuna squadra deve restare con troppi pochi atleti: l'utente pesca dalle giovanili
    function ensureMinRoster(c) {
        aiMarket(c, false);
        let k = counts(c, c.user);
        for (let guard = 0; guard < 30 && (k.total < CFG.MIN_ROSTER || k.goalies < CFG.MIN_GOALIES || k.skaters < CFG.MIN_SKATERS); guard++) {
            const pos = k.goalies < CFG.MIN_GOALIES ? 'G' : (Math.random() < 0.35 ? 'D' : 'F');
            const p = newPlayer(c, { pos, role: pos === 'G' ? 'G' : pos === 'D' ? 'D' : pick(['C', 'LW', 'RW']), ovr: rint(50, 58), age: rint(17, 19), team: c.user, salary: 15 });
            p.num = freeNumber(c, c.user);
            msg(c, 'club', `Dalle giovanili: ${p.name}`, `La rosa era sotto il minimo: ${p.first} ${p.name} (${ROLE_LABEL[p.pos]}, ${p.age} anni, ${p.ovr}) viene aggregato alla prima squadra con uno stipendio di ${eur(p.salary)} al mese.`);
            k = counts(c, c.user);
        }
    }
    function openWindow(c, kind) {
        c.window = kind;
        c.market.neg = {};
        msg(c, 'mercato', kind === 'summer' ? 'Si apre il mercato estivo' : 'Si apre il mercato di gennaio',
            kind === 'summer'
                ? 'Sessione aperta fino all\'inizio della stagione: cerca rinforzi, cedi chi non serve e tieni d\'occhio le offerte.'
                : 'Sessione di riparazione aperta durante la Coppa Italia: chiude con l\'inizio del girone di ritorno.');
    }
    function closeWindow(c) {
        c.window = null;
        c.market.incoming.filter(o => o.status === 'open').forEach(o => { o.status = 'expired'; closeAction(c, 'cpu_offer', o.id, 'Scaduta'); });
        ensureMinRoster(c);
        msg(c, 'mercato', 'Mercato chiuso', `La sessione di mercato è terminata. La tua rosa: ${counts(c, c.user).total} giocatori.`);
    }
    function marketTick(c) {
        c.market.incoming.forEach(o => {
            if (o.status === 'open' && o.expires < c.date) { o.status = 'expired'; closeAction(c, 'cpu_offer', o.id, 'Scaduta'); }
        });
        if (!windowOpen(c)) return;
        cpuOffersToUser(c);
        aiMarket(c, true);
    }

    // ------------------------------------------------------------------ calendario della stagione
    // y = anno di inizio della stagione (2026 → stagione 2026/27)
    function dates(y) {
        return {
            summer: [ymd(y, 7, 15), ymd(y, 8, 5), ymd(y, 8, 26)],
            start: ymd(y, 9, 8),
            first: (i, n) => dAdd(ymd(y, 9, 20), Math.floor(i * 88 / Math.max(1, n - 1))),
            winterOpen: ymd(y + 1, 1, 3),
            cup: [ymd(y + 1, 1, 10), ymd(y + 1, 1, 17), ymd(y + 1, 1, 31)],
            winterClose: ymd(y + 1, 2, 2),
            second: (i, n) => dAdd(ymd(y + 1, 2, 8), Math.floor(i * 80 / Math.max(1, n - 1))),
            playoff: n => dAdd(ymd(y + 1, 5, 2), 4 * n),
            end: ymd(y + 1, 6, 14)
        };
    }
    const halfRounds = c => Math.ceil(c.league.rounds.length / 2);
    function nextEvent(c) {
        if (c.over) return null;
        const D = dates(c.seasonYear);
        const at = d => dMax(d, c.date);
        switch (c.stage) {
            case 'summer':
                return c.summerWeek < D.summer.length
                    ? { kind: 'market', date: at(D.summer[c.summerWeek]), label: 'Settimana di mercato estivo' }
                    : { kind: 'season_start', date: at(D.start), label: `Inizio della stagione ${seasonLabelOf(c.seasonYear)}` };
            case 'first_half':
                return c.league.roundIdx < halfRounds(c)
                    ? { kind: 'league', comp: 'league', date: at(D.first(c.league.roundIdx, halfRounds(c))), label: engine().turnLabel(c.league) }
                    : { kind: 'winter_open', date: at(D.winterOpen), label: 'Sosta invernale • sorteggio della Coppa Italia' };
            case 'winter':
                return c.cup && c.cup.phase === 'cup'
                    ? { kind: 'cup', comp: 'cup', date: at(D.cup[c.cup.cup.round]), label: engine().turnLabel(c.cup) }
                    : { kind: 'winter_close', date: at(D.winterClose), label: 'Chiusura del mercato di gennaio' };
            case 'second_half':
                return { kind: 'league', comp: 'league', date: at(D.second(c.league.roundIdx - halfRounds(c), c.league.rounds.length - halfRounds(c))), label: engine().turnLabel(c.league) };
            case 'playoff':
                return c.league.phase === 'playoff'
                    ? { kind: 'playoff', comp: 'league', date: at(D.playoff(c.league.playoffs.turnNo)), label: engine().turnLabel(c.league) }
                    : { kind: 'season_end', date: at(D.end), label: `Fine della stagione ${seasonLabelOf(c.seasonYear)}` };
        }
        return null;
    }
    function compOf(c, ev) { return ev && ev.comp === 'cup' ? c.cup : (ev && ev.comp === 'league' ? c.league : null); }
    function userFixture(c, ev) {
        ev = ev || nextEvent(c);
        const s = compOf(c, ev);
        return s ? engine().userFixture(s) : null;
    }

    // ------------------------------------------------------------------ partite del turno
    function resultScore(f, team) {
        const w = engine().winnerOf(f);
        const reg = f.result.type === 'REG';
        return w === team ? (reg ? 1 : 0.7) : (reg ? 0 : 0.35);
    }
    function expectedScore(c, team, opp, home) {
        const a = strengthOf(ratingsOf(c, team)), b = strengthOf(ratingsOf(c, opp));
        return clamp(1 / (1 + Math.exp(-(a - b) / 5)) + (home ? 0.04 : -0.04), 0.05, 0.95);
    }
    function homeGate(c, f, ev, big) {
        const cap = arenaCapacity(c.user);
        const oppStrength = teamStrength(c, f.away);
        const fill = clamp(0.2 + 0.55 * c.fans / 100 + (big ? 0.15 : 0) + (ev.kind !== 'league' ? 0.1 : 0) + clamp((oppStrength - 70) / 100, -0.05, 0.1) + rnd(-0.05, 0.05), 0.12, 1);
        const people = Math.round(cap * fill);
        const D = CFG.DIV[userDiv(c)];
        money(c, 'biglietti', people * D.ticket, `${people} spettatori vs ${clubShort(f.away)}`);
        money(c, 'bar', Math.round(people * D.bar * rnd(0.85, 1.15)), `Bar • ${clubShort(f.away)}`);
        return people;
    }
    function applyTurn(c, ev, userResult) {
        const s = compOf(c, ev);
        const E = engine();
        const before = { phase: s.phase, poRound: s.playoffs ? s.playoffs.round : null };
        const uf = E.userFixture(s);
        if (uf && userResult && !uf.result) {
            uf.result = { hg: userResult.hg, ag: userResult.ag, type: userResult.type };
            if (userResult.type === 'SO') { uf.result.soWinner = userResult.soWinner === 'home' ? 'home' : 'away'; uf.result.so = userResult.so; }
        }
        const fixtures = E.turnFixtures(s);
        const regBefore = s.phase === 'regular';
        E.completeTurn(s);
        // infortuni per entrambe le squadre di ogni gara giocata
        fixtures.forEach(f => { if (f.result) { maybeInjure(c, f.home); maybeInjure(c, f.away); } });
        // la gara dell'utente: incasso, tifosi, bonus sponsor
        if (uf && uf.result) {
            const home = uf.home === c.user, opp = home ? uf.away : uf.home;
            const big = ev.kind === 'playoff' && before.poRound === E.poRounds(s).length - 1 || (ev.kind === 'cup' && s.cup.rounds.length === E.CUP_ROUNDS.length && uf === s.cup.rounds[E.CUP_ROUNDS.length - 1][0]);
            const people = home ? homeGate(c, uf, ev, big) : 0;
            const sc = resultScore(uf, c.user), exp = expectedScore(c, c.user, opp, home);
            const won = sc >= 0.5;
            const imp = ev.kind === 'playoff' ? 1.4 : ev.kind === 'cup' ? 1.3 : 1;
            c.form.push(won ? 'W' : 'L');
            if (c.form.length > 10) c.form.shift();
            const streak = c.form.slice(-3);
            let delta = ((sc - exp) * 9 + (won ? 1 : -1.2)) * imp;
            if (streak.length === 3 && streak.every(x => x === 'W')) delta += 1;
            if (streak.length === 3 && streak.every(x => x === 'L')) delta -= 1.5;
            addFans(c, delta, null);
            if (won) c.sponsors.active.forEach(a => money(c, 'bonus', a.winBonus, `Bonus vittoria • ${sponsorById(a.sid) ? sponsorById(a.sid).name : ''}`));
            c.report.match = { fixture: JSON.parse(JSON.stringify(uf)), home, opp, won, people, comp: ev.kind };
            const g = home ? uf.result.hg : uf.result.ag, ga = home ? uf.result.ag : uf.result.hg;
            const tag = uf.result.type === 'OT' ? ' (supplementare)' : uf.result.type === 'SO' ? ` (rigori ${home ? uf.result.so[0] : uf.result.so[1]}-${home ? uf.result.so[1] : uf.result.so[0]})` : '';
            msg(c, 'gare', `${ev.label}: ${won ? 'vittoria' : 'sconfitta'} ${g}-${ga}${tag}`,
                `${clubName(uf.home)} - ${clubName(uf.away)} ${uf.result.hg}-${uf.result.ag}${tag}.${people ? ` Spettatori: ${people}.` : ''}`);
        }
        // fine della regular season
        if (regBefore && s.phase === 'playoff') {
            const pos = E.standings(s).findIndex(r => r.id === c.user) + 1;
            c.lastRank = pos;
            c.season.regularPos = pos;
            const nPo = E.playoffTeams(s), nT = s.teams.length;
            if (pos > nPo) addFans(c, -6, `Stagione regolare chiusa al ${pos}° posto: niente play-off.`);
            msg(c, 'gare', 'Regular season conclusa', `${clubName(c.user)} chiude al ${pos}° posto${pos <= nPo ? ` e si qualifica ai play-off ${userDiv(c) === 'A' ? 'scudetto' : 'promozione'}.` : '.'}${userDiv(c) === 'A' && pos === nT ? ' Ultimo posto: a fine stagione si retrocede in Serie B.' : ''}`);
        }
        if (ev.kind === 'playoff') trackPlayoffs(c, s, before);
        if (ev.kind === 'cup') trackCup(c, s);
        if (ev.comp === 'league') advanceOther(c);
    }
    // l'altra divisione avanza in proporzione: finisce la regular season quando la finisce l'utente
    function advanceOther(c, all) {
        const o = c.other, s = c.league, E = engine();
        if (!o) return;
        const step = () => { const fx = E.turnFixtures(o); E.completeTurn(o); fx.forEach(f => { if (f.result) { maybeInjure(c, f.home); maybeInjure(c, f.away); } }); };
        let guard = 0;
        if (all) { while (o.phase !== 'done' && guard++ < 400) step(); return; }
        if (o.phase === 'regular') {
            const target = s.phase === 'regular' ? Math.ceil(o.rounds.length * s.roundIdx / s.rounds.length) : o.rounds.length;
            while (o.phase === 'regular' && o.roundIdx < target && guard++ < 60) step();
        } else if (o.phase === 'playoff' && s.phase !== 'regular') step();
    }
    // promozione e retrocessione a fine stagione
    function promoteRelegate(c) {
        const E = engine();
        if (!c.other || !c.div || !c.div.B.length) return;
        advanceOther(c, true);
        const A = userDiv(c) === 'A' ? c.league : c.other, B = userDiv(c) === 'A' ? c.other : c.league;
        const down = E.standings(A).slice(-1)[0].id, up = B.champion;
        if (!down || !up) return;
        c.div.A = c.div.A.filter(t => t !== down).concat([up]);
        c.div.B = c.div.B.filter(t => t !== up).concat([down]);
        c.season.moved = down === c.user ? 'Retrocessa in Serie B' : (up === c.user ? 'Promossa in Serie A' : null);
        msg(c, 'gare', 'Promozione e retrocessione', `${clubName(up)} vince la Serie B e sale in Serie A. ${clubName(down)}, ultima in Serie A, retrocede in Serie B.`);
        if (down === c.user) {
            addFans(c, -12, 'Retrocessione: i tifosi sono furiosi.');
            msg(c, 'club', 'Retrocessi in Serie B', 'La prossima stagione si gioca in Serie B: incassi, sponsor e ingaggi più bassi. Obiettivo: tornare subito in Serie A vincendo i play-off.');
        } else if (up === c.user) {
            addFans(c, 12, 'Promozione in Serie A!');
            msg(c, 'club', 'Promossi in Serie A', 'La prossima stagione si gioca in Serie A: più pubblico e sponsor più ricchi, ma anche avversari più forti e ingaggi più alti.');
        }
    }
    function trackPlayoffs(c, s, before) {
        const E = engine();
        const PO_STAGE = E.poRounds(s).map(r => r.label);
        const PZ = CFG.PRIZES[userDiv(c)];
        const po = s.playoffs;
        const inPo = po.seeds.includes(c.user);
        if (!inPo) return;
        // eliminazione nel turno appena chiuso
        const roundJustPlayed = before.poRound;
        const ser = po.series[roundJustPlayed].find(x => x.hi === c.user || x.lo === c.user);
        if (ser && E.seriesWinner(s, ser) && !c.season['po' + roundJustPlayed]) {
            c.season['po' + roundJustPlayed] = true;
            const won = E.seriesWinner(s, ser) === c.user;
            const w = E.seriesWins(s, ser);
            const mine = ser.hi === c.user ? w : [w[1], w[0]];
            if (roundJustPlayed === PO_STAGE.length - 1) {
                money(c, 'premi', PZ.final, `Finale ${PZ.label} disputata`);
                if (won) {
                    money(c, 'premi', PZ.win, userDiv(c) === 'A' ? 'Scudetto' : 'Serie B vinta');
                    c.trophies.push({ season: c.seasonYear, comp: userDiv(c) === 'A' ? 'serie_a' : 'serie_b' });
                    c.sponsors.active.forEach(a => money(c, 'bonus', a.trophyBonus, `Bonus trofeo • ${sponsorById(a.sid) ? sponsorById(a.sid).name : ''}`));
                    addFans(c, 14, userDiv(c) === 'A' ? 'Campioni d\'Italia!' : 'Serie B vinta: si sale in Serie A!');
                    c.season.playoff = 'Campione';
                } else {
                    addFans(c, 4, null);
                    c.season.playoff = 'Finale';
                }
                msg(c, 'finanze', `Premio finale ${PZ.label}`, `Finale disputata: ${eur(PZ.final)}${won ? ` + ${eur(PZ.win)} per la vittoria` : ''}.`);
            } else if (won) {
                msg(c, 'gare', `Play-off: passaggio del turno`, `${PO_STAGE[roundJustPlayed]} vinti ${mine[0]}-${mine[1]}.`);
            } else {
                c.season.playoff = PO_STAGE[roundJustPlayed];
                if (roundJustPlayed === 0) addFans(c, -2, null);
                msg(c, 'gare', 'Eliminati dai play-off', `${PO_STAGE[roundJustPlayed]} persi ${mine[0]}-${mine[1]}.`);
            }
        }
    }
    function trackCup(c, s) {
        const E = engine();
        const cup = s.cup;
        const lastIdx = s.phase === 'done' ? cup.rounds.length - 1 : cup.round - 1;
        const g = cup.rounds[lastIdx].find(x => x.home === c.user || x.away === c.user);
        if (!g || c.season['cup' + lastIdx]) return;
        c.season['cup' + lastIdx] = true;
        const won = E.winnerOf(g) === c.user;
        if (lastIdx === E.CUP_ROUNDS.length - 1) {
            money(c, 'premi', CFG.PRIZES.cupFinal, 'Finale di Coppa Italia disputata');
            if (won) {
                money(c, 'premi', CFG.PRIZES.cupWin, 'Coppa Italia vinta');
                c.trophies.push({ season: c.seasonYear, comp: 'coppa_italia' });
                c.sponsors.active.forEach(a => money(c, 'bonus', a.trophyBonus, `Bonus trofeo • ${sponsorById(a.sid) ? sponsorById(a.sid).name : ''}`));
                addFans(c, 9, 'La Coppa Italia è nostra!');
            } else addFans(c, 3, null);
            c.season.cup = won ? 'Vinta' : 'Finale';
            msg(c, 'finanze', 'Premio Coppa Italia', `Finale disputata: ${eur(CFG.PRIZES.cupFinal)}${won ? ` + ${eur(CFG.PRIZES.cupWin)} per la vittoria` : ''}.`);
        } else if (!won) {
            c.season.cup = E.CUP_ROUNDS[lastIdx].label;
            msg(c, 'gare', 'Fuori dalla Coppa Italia', `Eliminati ai ${E.CUP_ROUNDS[lastIdx].label.toLowerCase()}.`);
        }
    }

    // ------------------------------------------------------------------ fine stagione
    function progressPlayers(c) {
        Object.values(c.players).forEach(p => {
            p.age++;
            const d = p.age <= 21 ? rint(1, 4) : p.age <= 26 ? rint(0, 2) : p.age <= 30 ? rint(-1, 1) : p.age <= 33 ? rint(-3, 0) : rint(-5, -1);
            p.ovr = clamp(p.ovr + d, 40, 95);
            p.inj = null;
        });
        // ritiri
        Object.values(c.players).forEach(p => {
            const prob = p.age >= 35 ? 0.3 + (p.age - 35) * 0.2 : p.age === 34 ? 0.1 : 0;
            if (Math.random() >= prob) return;
            if (p.team === c.user) msg(c, 'club', `${p.name} si ritira`, `${p.first} ${p.name} appende i pattini al chiodo a ${p.age} anni. Grazie di tutto!`);
            delete c.players[p.id];
        });
    }
    function endSeason(c) {
        const E = engine();
        const s = c.season;
        const divBefore = userDiv(c);
        promoteRelegate(c);
        const inc = c.ledger.filter(l => l.s === c.seasonYear && l.amt > 0).reduce((a, l) => a + l.amt, 0);
        const exp = c.ledger.filter(l => l.s === c.seasonYear && l.amt < 0).reduce((a, l) => a + l.amt, 0);
        c.seasons.push({
            season: c.seasonYear, label: seasonLabelOf(c.seasonYear),
            pos: s.regularPos || null,
            div: divBefore, divName: CFG.DIV[divBefore].name, moved: s.moved || null,
            playoff: s.playoff || (s.regularPos && s.regularPos <= E.playoffTeams(c.league) ? '—' : 'Non qualificata'),
            cup: s.cup || (c.cup && c.cup.teams.includes(c.user) ? '—' : 'Non qualificata'),
            champion: c.league.champion, cupWinner: c.cup ? c.cup.champion : null,
            income: inc, expense: exp, balance: Math.round(c.balance), fans: Math.round(c.fans)
        });
        // sponsor in scadenza: rinnovo proposto se la reputazione lo consente
        const expired = c.sponsors.active.filter(a => a.until <= c.seasonYear);
        c.sponsors.active = c.sponsors.active.filter(a => a.until > c.seasonYear);
        expired.forEach(a => {
            const sp = sponsorById(a.sid);
            if (sp && c.rep >= minRepFor(sp.tier)) {
                msg(c, 'sponsor', `Contratto scaduto: ${sp.name}`, `${sp.name} è soddisfatto della collaborazione e propone il rinnovo.`);
                sponsorOffer(c, a.slot, a.sid, false);
            } else if (sp) {
                msg(c, 'sponsor', `Contratto scaduto: ${sp.name}`, `${sp.name} non rinnova la sponsorizzazione.`);
            }
        });
        progressPlayers(c);
        refillFreeAgents(c, 26);
        ensureMinRoster(c);
        c.seasonYear++;
        c.stage = 'summer';
        c.summerWeek = 0;
        c.ledger = c.ledger.filter(l => l.s >= c.seasonYear - 1);
        openWindow(c, 'summer');
        msg(c, 'club', `Stagione ${seasonLabelOf(c.seasonYear - 1)} archiviata`, `Saldo ${eur(c.balance)} • tifosi ${fansMood(c.fans).toLowerCase()} (${Math.round(c.fans)}). Si prepara la stagione ${seasonLabelOf(c.seasonYear)}.`);
        for (let i = 0; i < 2; i++) sponsorOffer(c);
    }

    // campionato della propria divisione e quello dell'altra (senza l'utente)
    function startLeagues(c) {
        const E = engine(), ud = userDiv(c), od = ud === 'A' ? 'B' : 'A';
        const season = seasonLabelOf(c.seasonYear);
        c.league = E.newLeague(c.user, season, CFG.DIV[ud].league, c.div[ud].slice());
        c.other = c.div[od].length >= 2 ? E.newLeague(null, season, CFG.DIV[od].league, c.div[od].slice()) : null;
        [c.league, c.other].forEach(l => { if (!l) return; l.relegate = l.league === 'SERIE A' && c.div.B.length ? 1 : 0; l.promote = l.league === 'SERIE B'; });
    }
    // carriere salvate prima della Serie B: si aggiunge la seconda divisione
    function migrate(c) {
        if (c.div) return c;
        const B = engine().leagueTeams('SERIE B').filter(t => !c.teams.includes(t));
        c.div = { A: c.teams.slice(), B };
        B.forEach(t => seedTeam(c, t));
        c.teams = c.teams.concat(B);
        c.other = null;
        syncWorld(c);
        ensureMinRoster(c);
        return c;
    }

    // ------------------------------------------------------------------ avanzamento
    // esegue il prossimo evento del calendario; userResult = esito della partita giocata in 3D
    function advance(c, userResult) {
        const ev = nextEvent(c);
        if (!ev) return null;
        c.report = { ev, money: [], messages: [], injuries: [], fans: 0, balanceBefore: c.balance, match: null };
        settleMonths(c, c.date, ev.date);
        c.date = ev.date;
        injuryTick(c);
        switch (ev.kind) {
            case 'market':
                c.summerWeek++;
                break;
            case 'season_start':
                closeWindow(c);
                startLeagues(c);
                c.cup = null;
                c.season = {};
                c.form = [];
                c.stage = 'first_half';
                msg(c, 'gare', `Al via la ${CFG.DIV[userDiv(c)].name} ${seasonLabelOf(c.seasonYear)}`, userDiv(c) === 'A'
                    ? `Girone all'italiana con andata e ritorno (${c.league.rounds.length} giornate), poi i play-off scudetto per le prime ${engine().playoffTeams(c.league)}. L'ultima retrocede in Serie B. A gennaio la Coppa Italia.`
                    : `Girone all'italiana con andata e ritorno (${c.league.rounds.length} giornate), poi i play-off promozione per le prime ${engine().playoffTeams(c.league)}: chi li vince sale in Serie A.`);
                break;
            case 'league':
            case 'playoff':
                applyTurn(c, ev, userResult);
                if (c.stage === 'first_half' || c.stage === 'second_half') {
                    if (c.league.phase === 'playoff') c.stage = 'playoff';
                }
                break;
            case 'winter_open':
                c.stage = 'winter';
                c.cup = engine().newCup(c.user, seasonLabelOf(c.seasonYear));
                openWindow(c, 'winter');
                msg(c, 'gare', 'Sorteggio della Coppa Italia', c.cup.teams.includes(c.user)
                    ? `Tabellone a gare secche con le migliori ${c.cup.teams.length} squadre. Ai quarti: ${(() => { const f = c.cup.cup.rounds[0].find(x => x.home === c.user || x.away === c.user); return f ? `${clubName(f.home)} - ${clubName(f.away)}` : '—'; })()}.`
                    : `La Coppa Italia è riservata alle squadre di Serie A: quest'anno ${clubName(c.user)} la guarda da fuori.`);
                break;
            case 'cup':
                applyTurn(c, ev, userResult);
                break;
            case 'winter_close':
                closeWindow(c);
                c.stage = 'second_half';
                break;
            case 'season_end':
                endSeason(c);
                break;
        }
        marketTick(c);
        sponsorsTick(c, ev.kind);
        c.fans += (52 - c.fans) * 0.025;
        updateReputation(c);
        syncWorld(c);
        pushHistory(c);
        if (c.balance < 0) {
            c.over = { date: c.date, balance: Math.round(c.balance) };
            msg(c, 'finanze', 'Fallimento', `Il saldo è sceso a ${eur(c.balance)}: la società non può far fronte ai debiti e viene dichiarata fallita.`);
        } else if (c.balance < monthlyCosts(c) * 2 && !c.warnedLow) {
            c.warnedLow = true;
            msg(c, 'finanze', 'Allarme cassa', `Restano ${eur(c.balance)}: bastano per meno di due mesi di spese (${eur(monthlyCosts(c))} al mese). Se il saldo va sotto zero la società fallisce.`);
        } else if (c.balance > monthlyCosts(c) * 4) c.warnedLow = false;
        const rep = c.report;
        rep.balanceAfter = c.balance;
        c.report = null;
        return rep;
    }

    // ------------------------------------------------------------------ nuova carriera
    function newCareer(user, year) {
        const E = engine();
        const div = { A: E.leagueTeams('SERIE A'), B: E.leagueTeams('SERIE B') };
        const teams = div.A.concat(div.B);
        const c = {
            v: 2, id: 'm' + Date.now().toString(36), name: '', createdAt: Date.now(),
            user, teams, div, other: null,
            seasonYear: year, date: ymd(year, 7, 1), stage: 'summer', summerWeek: 0,
            balance: CFG.START_BUDGET, fans: 58, rep: null, lastRank: null, form: [],
            players: {}, nextPid: 1, nextMid: 1,
            league: null, cup: null, season: {}, seasons: [], trophies: [],
            window: null, market: { neg: {}, incoming: [] },
            sponsors: { active: [], offers: [] },
            messages: [], ledger: [], history: [],
            over: null, warnedLow: false, report: null
        };
        teams.forEach(t => seedTeam(c, t));
        // rose troppo lunghe: i meno quotati partono svincolati
        teams.forEach(t => {
            while (counts(c, t).total > CFG.MAX_ROSTER) {
                const worst = teamPlayers(c, t).filter(p => canRemove(c, p)).sort(byOvr).pop();
                if (!worst) break;
                transfer(c, worst, null);
            }
        });
        refillFreeAgents(c, 26);
        ensureMinRoster(c);          // le rose corte (es. Serie B) si completano con gli svincolati
        updateReputation(c);
        syncWorld(c);
        openWindow(c, 'summer');
        msg(c, 'club', `Benvenuto alla guida di ${clubName(user)}`,
            `Il presidente ti affida la squadra con un budget di ${eur(CFG.START_BUDGET)}. Ogni mese paghi gli stipendi (${eur(payroll(c))}) e ogni settimana l'affitto del palazzetto (${eur(arenaFee(user, c))}). Si parte in ${CFG.DIV[userDiv(c)].name}: l'ultima di Serie A retrocede, la vincente dei play-off di Serie B sale. Biglietti, bar, sponsor e premi portano entrate. Se il saldo va sotto zero la società fallisce.`);
        sponsorOffer(c, 'main');
        sponsorOffer(c, 'sec');
        sponsorOffer(c, 'sec');
        settleMonths(c, dAdd(c.date, -1), c.date);   // le spese di luglio
        pushHistory(c);
        return c;
    }

    G.ManagerCore = {
        CFG, CAT, ROLE_LABEL, INCOME_CATS, EXPENSE_CATS,
        newCareer, advance, nextEvent, userFixture, syncWorld, restoreWorld, migrate, divOf, userDiv,
        lineup, ratingsOf, teamStrength, teamPlayers, freeAgents, counts, canRemove,
        valueOf, salaryFor, clubAsk, playerAsk, marketBlock, makeOffer, releasePlayer, toggleForSale, answerIncoming,
        acceptSponsor, rejectSponsor, freeSlots, sponsorById, maxTier,
        payroll, sponsorMonthly, arenaFee, arenaMonthly, monthlyCosts, arenaCapacity, arenaName,
        fansMood, expectedRank, currentRank, windowOpen, negotiation,
        eur, dateLabel, seasonLabelOf, dAdd, dDiff, clubName, clubShort
    };
})();
