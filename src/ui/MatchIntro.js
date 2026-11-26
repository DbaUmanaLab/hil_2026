// --- src/ui/MatchIntro.js ---
// Presentazione della partita (amichevole, partita rapida, rivincita) e scelta del livello di difficoltà.
// Script classico caricato dopo lo script principale di index.html: usa i suoi globali
// (matchConfig, CLUB_ROSTERS, CLUB_RATINGS, ARENA_CATALOG, ROSTER_THEMES, TEAM_DATA, DIFFICULTY_LEVELS,
//  DIFFICULTY_IDS, normDifficulty, getClubLogoSVG, getUserTeam) e _t() di src/i18n/i18n.js.
//
//  - MatchIntro.open({ kind, label, onBack, onPlay(levelId) }): schermata con il palazzetto sullo sfondo, i
//    due loghi e i roster; in basso "Scendi in pista" (con il livello proposto, l'ultimo usato in qualsiasi
//    partita) e il pulsante che apre la scelta del livello. kind: 'friendly' | 'quick' | 'rematch' |
//    'competition' (modalità torneo e Hockey Manager, con label = competizione e turno).
//  - window.pickDifficulty({ title, sub, current, currentTag, onPick(id), onCancel() }): la stessa scelta del
//    livello in una finestra a sé.
// Entrambe sono livelli .cp-overlay di src/ui/uikit.js: frecce, Invio ed Esc funzionano da tastiera,
// controller e telecomando.
(function () {
    'use strict';
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const tr = (s, ...a) => (window._t ? window._t(s, ...a) : s);

    // indicatori del livello (su 5): solo grafici, le tarature vere sono in DIFFICULTY_LEVELS (index.html)
    const METERS = [
        { key: 'speed', label: 'Velocità' },
        { key: 'press', label: 'Aggressività' },
        { key: 'aim', label: 'Precisione al tiro' },
        { key: 'goalie', label: 'Portiere' }
    ];
    const LEVEL_UI = {
        easy: { speed: 2, press: 1, aim: 2, goalie: 2, tag: 'Per iniziare' },
        normal: { speed: 3, press: 3, aim: 3, goalie: 3, tag: 'Equilibrata' },
        hard: { speed: 5, press: 5, aim: 4, goalie: 5, tag: 'Per esperti' }
    };

    function levelCards(current, currentTag) {
        return DIFFICULTY_IDS.map(id => {
            const L = DIFFICULTY_LEVELS[id], U = LEVEL_UI[id];
            const isCur = id === current;
            return `<button type="button" class="mi-lv mi-lv-${id}${isCur ? ' is-current' : ''}" data-lv="${id}"${isCur ? ' data-focus' : ''}>
                <span class="mi-lv-top"><em>${esc(tr(U.tag))}</em>${isCur ? `<i>${esc(currentTag || tr('Ultima scelta'))}</i>` : ''}</span>
                <b>${esc(tr(L.label))}</b>
                <span class="mi-lv-meters">${METERS.map(m => `<span class="mi-meter"><small>${esc(tr(m.label))}</small><span>${[1, 2, 3, 4, 5].map(n => `<i class="${n <= U[m.key] ? 'on' : ''}"></i>`).join('')}</span></span>`).join('')}</span>
                <small class="mi-lv-desc">${esc(tr(L.desc))}</small>
            </button>`;
        }).join('');
    }

    // ------------------------------------------------------------------ scelta del livello
    // sheet: pannello che sale dal basso sopra la presentazione; altrimenti finestra al centro
    function openLevels(opts, sheet) {
        const old = document.querySelector('.mi-levels');
        if (old) old.remove();
        const cur = normDifficulty(opts.current || matchConfig.difficulty);
        const o = document.createElement('div');
        o.className = 'cp-overlay mi-levels' + (sheet ? ' is-sheet' : '');
        o.innerHTML = `<div class="mi-lv-panel" role="dialog" aria-modal="true" aria-label="${esc(tr('Livello di difficoltà'))}" data-fit="12">
            <div class="mi-lv-head">
                <span class="mi-kicker">${esc(opts.sub || tr('Squadra avversaria'))}</span>
                <h2>${esc(opts.title || tr('Scegli la difficoltà'))}</h2>
            </div>
            <div class="mi-lv-list">${levelCards(cur, opts.currentTag)}</div>
            <div class="mi-actions"><button type="button" class="mi-btn" data-lv-cancel data-keyback>◀ ${esc(tr('Indietro'))}</button></div>
        </div>`;
        document.body.appendChild(o);
        requestAnimationFrame(() => o.classList.add('is-in'));
        let done = false;
        const close = () => { done = true; o.classList.remove('is-in'); setTimeout(() => o.remove(), 180); };
        const cancel = () => { if (done) return; close(); if (opts.onCancel) opts.onCancel(); };
        o.addEventListener('click', e => { if (e.target === o) cancel(); });
        o.querySelector('[data-lv-cancel]').onclick = cancel;
        o.querySelectorAll('[data-lv]').forEach(b => {
            b.onclick = () => {
                if (done) return;
                close();
                if (opts.onPick) opts.onPick(b.dataset.lv);
            };
        });
        focusFirst(o);
        return o;
    }
    function focusFirst(root) {
        const f = root.querySelector('[data-focus]');
        if (!f) return;
        if (window.UIKit && window.UIKit.focus) window.UIKit.focus(f);
        else f.focus({ preventScroll: true });
    }
    window.pickDifficulty = opts => openLevels(opts || {}, false);

    // ------------------------------------------------------------------ presentazione della partita
    const KIND = {
        friendly: 'Amichevole',
        quick: 'Partita rapida',
        rematch: 'Rivincita'
    };
    const POS = { C: 'C', LW: 'AS', RW: 'AD', D: 'D' };     // centro, ala sinistra, ala destra, difensore

    function ratingBars(id) {
        const r = (typeof CLUB_RATINGS !== 'undefined' && CLUB_RATINGS[id]) || { off: 70, def: 70, goa: 70 };
        // le valutazioni vanno più o meno da 60 a 90: barra piena a 90
        const pct = v => Math.max(6, Math.min(100, (v - 55) / 35 * 100)).toFixed(0);
        return [['Attacco', r.off], ['Difesa', r.def], ['Portiere', r.goa]].map(([l, v]) =>
            `<span class="mi-rat"><small>${esc(tr(l))}</small><span class="mi-rat-bar"><i style="width:${pct(v)}%"></i></span><b>${v}</b></span>`).join('');
    }
    function playerRow(p, role) {
        if (!p) return '';
        const first = p.first ? esc(p.first.charAt(0)) + '. ' : '';
        return `<li><span class="mi-num">${esc(p.num || '–')}</span><span class="mi-pos">${esc(tr(role))}</span><span class="mi-name" translate="no">${first}${esc(p.name || '')}</span></li>`;
    }
    function rosterHtml(club) {
        const coach = (window.TEAM_DATA && TEAM_DATA.coaches[club.id]) || null;
        const lines = (club.lines || []).slice(0, 3).map((ln, i) => `<div class="mi-line">
                <h5>${esc(tr('Linea {0}', i + 1))}</h5>
                <ul>${ln.map(p => playerRow(p, POS[p.role] || p.role)).join('')}</ul>
            </div>`).join('');
        return `<div class="mi-roster">
            <div class="mi-line is-goalie"><h5>${esc(tr('Portiere'))}</h5><ul>${playerRow(club.goalie, 'P')}</ul></div>
            ${lines}
            ${coach ? `<div class="mi-coach"><small>${esc(tr('Allenatore'))}</small><span translate="no">${esc(coach.first || '')} ${esc(coach.last || '')}</span></div>` : ''}
        </div>`;
    }
    function sideHtml(side) {
        const id = side === 'home' ? matchConfig.homeClub : matchConfig.guestClub;
        const club = CLUB_ROSTERS[id];
        if (!club) return '';
        const league = window.TEAM_DATA ? TEAM_DATA.leagueOf(club.league) : { name: club.league };
        const isUser = getUserTeam() === side;
        return `<section class="mi-side is-${side}${isUser ? ' is-user' : ''}">
            <div class="mi-badge">
                <span class="mi-who">${esc(tr(side === 'home' ? 'Casa' : 'Ospiti'))} • ${esc(isUser ? tr('Tu') : 'CPU')}</span>
                <div class="mi-logo">${getClubLogoSVG(id, 'mi-logo-svg')}</div>
                <h3 translate="no">${esc(club.name)}</h3>
                <span class="mi-league" translate="no">${esc(league.name || club.league)}</span>
            </div>
            <div class="mi-rats">${ratingBars(id)}</div>
            ${rosterHtml(club)}
        </section>`;
    }

    let current = null;
    // pulsante del livello: livello attuale e invito a cambiarlo
    function diffLabel() {
        const L = DIFFICULTY_LEVELS[current.level];
        return `<small>${esc(tr('Difficoltà'))}</small><b><i></i>${esc(tr(L.label))}</b><em>${esc(tr('Cambia'))}</em>`;
    }
    function render() {
        if (!current) return;
        const { el, opts } = current;
        const arena = (typeof ARENA_CATALOG !== 'undefined' && ARENA_CATALOG[matchConfig.arena]) || {};
        const th = id => (typeof ROSTER_THEMES !== 'undefined' && ROSTER_THEMES[id]) || { primary: '#1e293b' };
        el.style.setProperty('--mi-home', th(matchConfig.homeClub).primary);
        el.style.setProperty('--mi-guest', th(matchConfig.guestClub).primary);
        const day = matchConfig.timeOfDay === 'day';
        el.innerHTML = `
            <div class="mi-bg" style="background-image:url('assets/arenas/thumbs/${esc(matchConfig.arena)}.jpg')"></div>
            <div class="mi-shade"></div>
            <div class="mi-wrap" data-fit="10">
                <header class="mi-top">
                    <span class="mi-kicker">${esc(opts.label || tr(KIND[opts.kind] || KIND.friendly))}</span>
                    <div class="mi-arena">
                        <b translate="no">${esc(arena.shortTitle || arena.name || '')}</b>
                        <small>${esc(arena.location || '')}</small>
                    </div>
                    <span class="mi-time">${day ? '☀' : '☾'} ${esc(tr(day ? 'Di giorno' : 'In notturna'))}</span>
                </header>
                <div class="mi-match">
                    ${sideHtml('home')}
                    <div class="mi-vs"><span>VS</span></div>
                    ${sideHtml('guest')}
                </div>
                <footer class="mi-actions">
                    <button type="button" class="mi-btn" data-mi-back data-keyback>◀ ${esc(tr('Indietro'))}</button>
                    <button type="button" class="mi-btn mi-diff mi-diff-${current.level}" data-mi-diff>${diffLabel()}</button>
                    <button type="button" class="mi-btn is-go" data-mi-play data-focus>${esc(tr('Scendi in pista ▶'))}</button>
                </footer>
            </div>`;
        el.querySelector('[data-mi-back]').onclick = () => close(true);
        // si gioca subito con il livello proposto (l'ultimo usato); cambiarlo è facoltativo
        el.querySelector('[data-mi-play]').onclick = () => {
            const o = current && current.opts, lv = current && current.level;
            close(false);
            if (o && o.onPlay) o.onPlay(lv);
        };
        el.querySelector('[data-mi-diff]').onclick = () => openLevels({
            title: tr('Scegli la difficoltà'),
            sub: tr('Livello della squadra avversaria'),
            current: current.level,
            currentTag: tr('Attuale'),
            // scelto il livello si torna alla presentazione, con il fuoco su "Scendi in pista"
            onPick: id => {
                if (!current) return;
                current.level = normDifficulty(id);
                const b = el.querySelector('[data-mi-diff]');
                b.className = `mi-btn mi-diff mi-diff-${current.level}`;
                b.innerHTML = diffLabel();
                focusFirst(el);
            },
            onCancel: () => { const b = el.querySelector('[data-mi-diff]'); if (b && window.UIKit) window.UIKit.focus(b); }
        }, true);
        if (window.UIKit && window.UIKit.fitAll) requestAnimationFrame(() => window.UIKit.fitAll());
        focusFirst(el);
    }
    function close(back) {
        if (!current) return;
        const { el, opts } = current;
        current = null;
        const lv = document.querySelector('.mi-levels');
        if (lv) lv.remove();
        el.classList.remove('is-in');
        setTimeout(() => el.remove(), 220);
        if (back && opts.onBack) opts.onBack();
    }
    function open(opts) {
        if (current) close(false);
        const el = document.createElement('div');
        el.className = 'cp-overlay mi-screen';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        document.body.appendChild(el);
        current = { el, opts: opts || {}, level: normDifficulty(matchConfig.difficulty) };
        render();
        requestAnimationFrame(() => el.classList.add('is-in'));
    }
    // cambio lingua con la schermata aperta: ridisegna (nomi dei livelli, ruoli, etichette)
    window.addEventListener('hil:lang', () => { if (current) render(); });

    window.MatchIntro = { open, close: () => close(false), isOpen: () => !!current };
})();
