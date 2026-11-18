// --- src/data/teams-loader.js ---
// Carica src/data/teams.json (squadre e leghe) PRIMA dello script principale di index.html e
// prepara window.TEAM_DATA con le strutture che il gioco usa da sempre (CLUB_ROSTERS, CLUB_RATINGS, ...).
//
// La lettura è sincrona di proposito: lo script principale usa i dati delle squadre già mentre
// viene interpretato. Serve che il gioco sia servito via http (npm start), come già per i moduli.
//
// Per aggiungere o modificare una squadra basta src/data/teams.json: vedi src/data/README-teams.md.
(function () {
    'use strict';
    const URL = 'src/data/teams.json';
    let data = null;
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', URL, false);
        xhr.send(null);
        if ((xhr.status === 200 || xhr.status === 0) && xhr.responseText) data = JSON.parse(xhr.responseText);
    } catch (e) {
        console.error('[squadre] ' + URL + ' non leggibile:', e);
    }
    if (!data || !Array.isArray(data.teams) || !data.teams.length) {
        document.addEventListener('DOMContentLoaded', () => {
            const d = document.createElement('div');
            d.style.cssText = 'position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:#0b1020;color:#fff;font:16px system-ui;padding:24px;text-align:center';
            d.textContent = 'Impossibile caricare ' + URL + ': controlla che il file esista, che sia JSON valido e che il gioco sia aperto tramite "npm start".';
            document.body.appendChild(d);
        });
        data = { leagues: [], teams: [] };
    }

    const hex = v => (typeof v === 'string' ? parseInt(v.replace('#', ''), 16) : v);
    const T = {
        leagues: data.leagues || [],
        ids: [], rosters: {}, ratings: {}, homeArenas: {}, logos: {}, jerseys: {},
        pngLogoClubs: new Set(), abbr: {}, coaches: {}, rosterThemes: {}, staffColors: {}
    };
    data.teams.forEach(t => {
        const kits = {};
        Object.keys(t.kits || {}).forEach(k => {
            const v = t.kits[k];
            kits[k] = { id: k, label: v.label, primary: hex(v.primary), pants: hex(v.pants), helmet: hex(v.helmet), glove: hex(v.glove) };
        });
        T.ids.push(t.id);
        T.rosters[t.id] = {
            id: t.id, league: t.league, jerseyClubId: t.jerseyClubId || t.id, name: t.name, shortName: t.shortName || t.name,
            goalie: t.goalie, backupGoalies: t.backupGoalies || [], lines: t.lines, reserves: t.reserves || [], kits
        };
        T.ratings[t.id] = Object.assign({ off: 70, def: 70, goa: 70 }, t.ratings);
        T.homeArenas[t.id] = t.homeArena || 'cittadella';
        T.logos[t.id] = t.logo || (t.id + '.png');
        if (t.jerseys && t.jerseys.length) T.jerseys[t.id] = t.jerseys;
        if (t.logoOnScoreboard !== 'drawn') T.pngLogoClubs.add(t.id);
        T.abbr[t.id] = t.abbr || t.id.slice(0, 3).toUpperCase();
        if (t.coach) T.coaches[t.id] = t.coach;
        const c = t.colors || {};
        T.rosterThemes[t.id] = {
            photo: (t.rosterScreen && t.rosterScreen.photo) || 'cittadella.jpg',
            focus: (t.rosterScreen && t.rosterScreen.focus) || '50% 35%',
            primary: c.primary || '#1e293b', secondary: c.secondary || '#0b0b0f'
        };
        T.staffColors[t.id] = { primary: hex(c.staffJacket || '#09090b'), secondary: hex(c.coachJacket || '#dc2626') };
    });
    T.leagueOf = id => T.leagues.find(l => l.id === id) || { id, name: id, federation: 'FISR', badge: id, rosterLabel: id };
    window.TEAM_DATA = T;
})();
