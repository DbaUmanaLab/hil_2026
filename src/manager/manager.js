// --- src/manager/manager.js ---
// Hockey Manager: interfaccia della carriera (script classico, dopo manager-core.js).
// Schermate: scelta squadra / carriere salvate, poi l'ufficio del club con le sezioni
// Ufficio • Rosa • Mercato • Sponsor • Infermeria • Competizioni • Finanze • Messaggi.
// Le partite dell'utente si giocano nel motore 3D (o si simulano); il risultato torna qui
// tramite window.Manager.onUserMatchFinished (vedi competitionHost() in index.html).
(function () {
    'use strict';
    const SAVE_KEY = 'hil_mgr_saves';
    const MC = () => window.ManagerCore;
    const E = () => window.Competition.engine;

    let career = null;
    let root = null;
    let tab = 'office';
    let matchActive = false;
    let selectedTeam = null;
    const ui = {
        msgCat: 'all', msgSel: null,
        mkt: { pos: 'all', team: 'all', minOvr: 0, maxFee: 0, sort: 'ovr' },
        comp: 'league', compView: 'table', finRange: 'season'
    };

    // ------------------------------------------------------------------ utilità
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const eur = n => MC().eur(n);
    const logo = id => (typeof logoSrcOf === 'function' ? logoSrcOf(id) : `assets/logos/${id}.png`);
    const short = id => MC().clubShort(id);
    const fullName = p => `${p.first ? p.first + ' ' : ''}${p.name}`;
    const ovrCls = v => (v >= 80 ? 'is-elite' : v >= 72 ? 'is-good' : v >= 64 ? 'is-mid' : 'is-low');
    const ROLE_SHORT = { G: 'P', D: 'D', F: 'A' };
    const ROLE_DETAIL = { G: 'Portiere', D: 'Difensore', C: 'Centro', LW: 'Ala sinistra', RW: 'Ala destra' };
    const CAT_ICON = { gare: '🏒', mercato: '🔁', infortuni: '🩹', sponsor: '🤝', finanze: '💶', tifosi: '📣', club: '🏛️' };
    function toast(t) {
        const d = document.createElement('div');
        d.className = 'cp-toast'; d.textContent = t;
        document.body.appendChild(d);
        setTimeout(() => d.remove(), 2600);
    }
    function overlay(html, bind) {
        const o = document.createElement('div');
        o.className = 'cp-overlay mg-overlay';
        o.innerHTML = `<div class="cp-panel cp-dialog mg-dialog">${html}</div>`;
        document.body.appendChild(o);
        const close = () => o.remove();
        o.addEventListener('click', e => { if (e.target === o) close(); });
        if (bind) bind(o, close);
        const f = o.querySelector('[data-focus]') || o.querySelector('.cp-btn.is-primary') || o.querySelector('button');
        if (f) f.focus({ preventScroll: true });
        return o;
    }

    // ------------------------------------------------------------------ salvataggi
    function readSaves() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '[]'); } catch (e) { return []; } }
    function writeSaves(list) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
    function save(silent) {
        if (!career) return false;
        const list = readSaves();
        const entry = { id: career.id, name: career.name, savedAt: Date.now(), data: career };
        const i = list.findIndex(x => x.id === career.id);
        if (i >= 0) list[i] = entry; else list.unshift(entry);
        const ok = writeSaves(list);
        if (!silent || !ok) toast(ok ? 'Carriera salvata' : 'Salvataggio non riuscito: spazio del browser esaurito');
        return ok;
    }
    function autoName(user) {
        const base = `${MC().clubName(user)} • Carriera`;
        const n = readSaves().filter(s => s.name === base || s.name.startsWith(base + ' #')).length;
        return n ? `${base} #${n + 1}` : base;
    }

    // ------------------------------------------------------------------ radice e navigazione
    function ensureRoot() {
        if (root) return;
        E().ensureCss();
        if (!document.querySelector('link[data-mgr-css]')) {
            const l = document.createElement('link');
            l.rel = 'stylesheet'; l.href = 'src/manager/manager.css'; l.dataset.mgrCss = '1';
            document.head.appendChild(l);
        }
        root = document.createElement('div');
        root.id = 'mgr-root';
        root.className = 'cp-hidden';
        root.innerHTML = '<div class="cp-screen cp-hidden" data-screen="start"></div><div class="cp-screen cp-hidden mg-hub-screen" data-screen="hub"></div>';
        document.body.appendChild(root);
        root.addEventListener('keydown', e => {
            if (e.key !== 'Escape' || document.querySelector('.cp-overlay')) return;
            const cur = root.querySelector('.cp-screen:not(.cp-hidden)');
            if (!cur) return;
            e.preventDefault();
            if (cur.dataset.screen === 'start') exitToMenu();
            else if (tab !== 'office') setTab('office');
        });
        let rt = null;
        window.addEventListener('resize', () => {
            clearTimeout(rt);
            rt = setTimeout(() => { if (career && root && !root.classList.contains('cp-hidden') && tab === 'finance') renderHub(); }, 200);
        });
    }
    function showScreen(name) {
        ensureRoot();
        root.classList.remove('cp-hidden');
        root.querySelectorAll('.cp-screen').forEach(s => s.classList.toggle('cp-hidden', s.dataset.screen !== name));
        if (name === 'start') renderStart();
        if (name === 'hub') renderHub();
        const f = root.querySelector(`[data-screen="${name}"] [data-focus]`);
        if (f) f.focus({ preventScroll: true });
    }
    function exitToMenu() {
        if (career) save(true);
        document.querySelectorAll('.mg-overlay').forEach(o => o.remove());
        career = null;
        MC().restoreWorld();
        if (root) root.classList.add('cp-hidden');
        try { matchConfig.userTeam = localStorage.getItem('hil_user_team') === 'guest' ? 'guest' : 'home'; } catch (e) {}
        titleSplashScreen.classList.remove('hidden');
    }
    function setTab(t) {
        tab = t;
        renderHub();
        const b = root.querySelector(`.mg-nav [data-tab="${t}"]`);
        if (b) b.focus({ preventScroll: true });
    }

    // ------------------------------------------------------------------ 1. scelta della squadra
    function renderStart() {
        const el = root.querySelector('[data-screen="start"]');
        const teams = E().serieATeams();
        if (!teams.includes(selectedTeam)) selectedTeam = teams[0];
        const saves = readSaves();
        const r = CLUB_RATINGS[selectedTeam] || { off: 70, def: 70, goa: 70 };
        const cap = MC().arenaCapacity(selectedTeam);
        const avg = (r.off + r.def + r.goa) / 3;
        const diff = avg >= 80 ? ['Facile', 'Squadra di vertice: si punta allo scudetto'] : avg >= 75 ? ['Media', 'Ambizioni da play-off, bilancio da curare'] : ['Difficile', 'Rosa giovane e palazzetto piccolo: ogni euro conta'];
        el.innerHTML = `
            <div class="cp-head">
                <img class="cp-head-logo" src="assets/logos/game%20badge.png" alt="" onerror="this.style.display='none'">
                <div class="cp-head-titles"><span class="cp-kicker">Hockey Manager • Carriera</span><span class="cp-title">Scegli il tuo club</span></div>
                <div class="cp-head-right"><span class="cp-pill">Budget iniziale ${eur(MC().CFG.START_BUDGET)}</span></div>
            </div>
            <div class="mg-start">
                <div class="cp-panel mg-start-teams">
                    <div class="cp-panel-title"><span>Serie A</span><b>${teams.length} club</b></div>
                    <div class="cp-team-grid" data-pager="y">${teams.map(id => `
                        <button type="button" class="cp-team-tile${id === selectedTeam ? ' is-active' : ''}" data-team="${id}" ${id === selectedTeam ? 'data-focus' : ''}>
                            <img src="${logo(id)}" alt=""><span>${esc(short(id))}</span>
                        </button>`).join('')}</div>
                </div>
                <div class="cp-panel mg-start-side">
                    <img class="crest" src="${logo(selectedTeam)}" alt="">
                    <div class="name">${esc(MC().clubName(selectedTeam))}</div>
                    <div class="arena">${esc(MC().arenaName(selectedTeam))} • ${cap} posti</div>
                    <div class="cp-ratings"><div><small>OFF</small><b>${r.off}</b></div><div><small>DEF</small><b>${r.def}</b></div><div><small>GOA</small><b>${r.goa}</b></div></div>
                    <div class="mg-diff"><b>${diff[0]}</b><span>${diff[1]}</span></div>
                    <div class="mg-facts"><div><small>Affitto palazzetto</small><b>${eur(MC().arenaFee(selectedTeam))}/mese</b></div></div>
                    <button class="cp-btn is-primary" data-act="new">Inizia la carriera ▶</button>
                </div>
                <div class="cp-panel mg-start-saves">
                    <div class="cp-panel-title"><span>Carriere salvate</span><b>${saves.length}</b></div>
                    <div class="cp-saves-list" data-pager="y">${saves.length ? saves.map(s => `
                        <div class="cp-save-row">
                            <img src="${logo(s.data.user)}" alt="">
                            <div style="min-width:0"><div class="n">${esc(s.name)}</div>
                                <div class="s">${s.data.over ? '<em class="mg-bad">Fallita</em> • ' : ''}Stagione ${esc(MC().seasonLabelOf(s.data.seasonYear))} • ${esc(MC().dateLabel(s.data.date))} • ${eur(s.data.balance)}</div></div>
                            <div class="a">${s.data.over ? '' : `<button class="cp-btn is-small is-primary" data-load="${s.id}">Carica</button>`}<button class="cp-btn is-small is-danger" data-del="${s.id}">Elimina</button></div>
                        </div>`).join('') : '<div class="cp-empty">Nessuna carriera salvata</div>'}</div>
                </div>
            </div>
            <div class="cp-foot">
                <button class="cp-btn" data-act="back" data-keyback>◀ Menu</button>
                <span class="cp-hint">Stagioni infinite • Serie A e, a gennaio, la Coppa Italia • niente retrocessioni</span>
            </div>`;
        el.querySelector('[data-act="back"]').onclick = exitToMenu;
        el.querySelector('[data-act="new"]').onclick = () => startCareer(selectedTeam);
        el.querySelectorAll('[data-team]').forEach(b => {
            b.onclick = () => { selectedTeam = b.dataset.team; renderStart(); const f = el.querySelector('[data-focus]'); if (f) f.focus(); };
            b.ondblclick = () => startCareer(b.dataset.team);
        });
        el.querySelectorAll('[data-load]').forEach(b => b.onclick = () => {
            const s = readSaves().find(x => x.id === b.dataset.load);
            if (!s) return;
            career = s.data;
            MC().syncWorld(career);
            tab = 'office';
            showScreen('hub');
        });
        el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
            if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Conferma'; return; }
            writeSaves(readSaves().filter(x => x.id !== b.dataset.del));
            renderStart();
        });
    }
    function startCareer(team) {
        MC().restoreWorld();
        const y = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;
        career = MC().newCareer(team, y);
        career.name = autoName(team);
        tab = 'office';
        save(true);
        showScreen('hub');
        toast(`Carriera salvata come "${career.name}"`);
    }

    // ------------------------------------------------------------------ 2. hub
    const TABS = [
        ['office', 'Ufficio', '🏠'], ['squad', 'Rosa', '👥'], ['market', 'Mercato', '🔁'], ['sponsors', 'Sponsor', '🤝'],
        ['infirmary', 'Infermeria', '🩹'], ['comps', 'Competizioni', '🏆'], ['finance', 'Finanze', '💶'], ['messages', 'Messaggi', '✉️']
    ];
    const unread = () => career.messages.filter(m => !m.read).length;
    const pendingActions = () => career.messages.filter(m => m.act && !m.act.done).length;

    function fansGauge(v, big) {
        const mood = MC().fansMood(v);
        return `<div class="mg-fans${big ? ' is-big' : ''}" title="Gradimento dei tifosi: ${Math.round(v)} su 100">
            <div class="mg-fans-bar"><i style="width:${Math.round(v)}%"></i></div>
            <span><b>${Math.round(v)}</b> ${esc(mood)}</span></div>`;
    }
    function renderHub() {
        if (!career) return;
        const el = root.querySelector('[data-screen="hub"]');
        const c = career;
        const ev = MC().nextEvent(c);
        const low = c.balance < (MC().payroll(c) + MC().arenaFee(c.user)) * 2;
        const n = unread();
        const T = TAB_IMPL[tab] || TAB_IMPL.office;
        el.innerHTML = `
            <div class="cp-head mg-head">
                <img class="mg-crest" src="${logo(c.user)}" alt="">
                <div class="cp-head-titles"><span class="cp-kicker">Hockey Manager • Stagione ${esc(MC().seasonLabelOf(c.seasonYear))}</span><span class="cp-title">${esc(MC().clubName(c.user))}</span></div>
                <div class="cp-head-right mg-status">
                    <span class="cp-pill mg-pill-date">📅 ${esc(MC().dateLabel(c.date, true))}</span>
                    <button type="button" class="cp-pill mg-pill-btn${low ? ' is-alert' : ''}" data-tab="finance" title="Saldo del club">💶 <b>${eur(c.balance)}</b></button>
                    <button type="button" class="cp-pill mg-pill-btn mg-pill-fans" data-tab="office" title="Gradimento dei tifosi">📣 ${fansGauge(c.fans)}</button>
                    <button type="button" class="cp-pill mg-pill-btn" data-tab="messages" title="Messaggi non letti">✉️ <b>${n}</b>${n ? '<i class="mg-dot"></i>' : ''}</button>
                </div>
            </div>
            <div class="mg-body">
                <nav class="mg-nav" aria-label="Sezioni">${TABS.map(([id, label, ic]) => {
                    const badge = id === 'messages' && n ? `<em>${n}</em>` : id === 'infirmary' && MC().teamPlayers(c, c.user).some(p => p.inj) ? `<em>${MC().teamPlayers(c, c.user).filter(p => p.inj).length}</em>` : (id === 'sponsors' && c.sponsors.offers.length ? `<em>${c.sponsors.offers.length}</em>` : (id === 'market' && c.window ? '<em class="is-open">●</em>' : ''));
                    return `<button type="button" class="mg-nav-btn${id === tab ? ' is-active' : ''}" data-tab="${id}"${id === tab ? ' data-focus' : ''}><span class="ic">${ic}</span><span class="lb">${label}</span>${badge}</button>`;
                }).join('')}</nav>
                <section class="mg-content" data-tabview="${tab}">${T.html()}</section>
            </div>
            <div class="cp-foot">
                <button class="cp-btn" data-act="exit">◀ Esci</button>
                <span class="cp-hint">${ev ? `Prossimo: <b>${esc(ev.label)}</b> • ${esc(MC().dateLabel(ev.date))}` : 'Carriera terminata'}</span>
                <span class="cp-spacer"></span>
                <button class="cp-btn" data-act="save">Salva</button>
                ${c.over ? '<button class="cp-btn is-danger" data-act="over">Carriera terminata</button>' : `<button class="cp-btn is-primary" data-act="continue">${ev && MC().userFixture(c, ev) ? 'Vai alla partita ▶' : 'Continua ▶'}</button>`}
            </div>`;
        el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => setTab(b.dataset.tab));
        el.querySelector('[data-act="exit"]').onclick = exitToMenu;
        el.querySelector('[data-act="save"]').onclick = () => save(false);
        const cont = el.querySelector('[data-act="continue"]');
        if (cont) cont.onclick = onContinue;
        const ov = el.querySelector('[data-act="over"]');
        if (ov) ov.onclick = showGameOver;
        if (T.bind) T.bind(el.querySelector('.mg-content'));
    }

    // ------------------------------------------------------------------ avanzamento del calendario
    function onContinue() {
        const c = career;
        if (c.over) { showGameOver(); return; }
        const ev = MC().nextEvent(c);
        if (!ev) return;
        const f = MC().userFixture(c, ev);
        if (f) { showMatchDialog(ev, f); return; }
        runAdvance(null);
    }
    function runAdvance(userResult) {
        const rep = MC().advance(career, userResult);
        save(true);
        showScreen('hub');
        if (rep) showReport(rep);
    }
    function versusHtml(f) {
        const side = (id, lbl) => `<div class="side${id === career.user ? ' is-user' : ''}"><img src="${logo(id)}" alt=""><span>${esc(short(id))}</span><small>${lbl}</small></div>`;
        return `<div class="cp-versus">${side(f.home, 'CASA')}<span class="cp-vs">VS</span>${side(f.away, 'OSPITE')}</div>`;
    }
    function availabilityLine() {
        const inj = MC().teamPlayers(career, career.user).filter(p => p.inj);
        return inj.length ? `Indisponibili: ${inj.map(p => esc(p.name)).join(', ')}` : 'Tutta la rosa a disposizione';
    }
    function showMatchDialog(ev, f) {
        const r = CLUB_RATINGS;
        const opp = f.home === career.user ? f.away : f.home;
        const mine = r[career.user], theirs = r[opp];
        overlay(`
            <span class="cp-kicker">${esc(ev.label)} • ${esc(MC().dateLabel(ev.date, true))}</span>
            ${versusHtml(f)}
            <div class="cp-next-arena">${esc(MC().arenaName(f.home))}${f.home === career.user ? ' • incasso di biglietti e bar' : ''}</div>
            <div class="mg-compare"><span>OFF ${mine.off} • DEF ${mine.def} • GOA ${mine.goa}</span><b>vs</b><span>OFF ${theirs.off} • DEF ${theirs.def} • GOA ${theirs.goa}</span></div>
            <p>${availabilityLine()}</p>
            <div class="cp-next-actions">
                <button class="cp-btn" data-x="close" data-keyback>Annulla</button>
                <button class="cp-btn" data-x="sim">Simula partita</button>
                <button class="cp-btn is-primary" data-x="play" data-focus>Gioca ▶</button>
            </div>`, (o, close) => {
            o.querySelector('[data-x="close"]').onclick = close;
            o.querySelector('[data-x="sim"]').onclick = () => { close(); runAdvance(null); };
            o.querySelector('[data-x="play"]').onclick = () => { close(); playMatch(ev, f); };
        });
    }
    function kitDistance(a, b) {
        const c = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
        const x = c(a), y = c(b);
        return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
    }
    function playMatch(ev, f) {
        MC().syncWorld(career);
        const H = CLUB_ROSTERS[f.home], A = CLUB_ROSTERS[f.away];
        const homeKit = Object.keys(H.kits)[0];
        const awayKit = Object.keys(A.kits).sort((k1, k2) => kitDistance(A.kits[k2].primary, H.kits[homeKit].primary) - kitDistance(A.kits[k1].primary, H.kits[homeKit].primary))[0];
        matchConfig.homeClub = f.home;
        matchConfig.guestClub = f.away;
        matchConfig.homeKit = homeKit;
        matchConfig.guestKit = awayKit;
        matchConfig.arena = HOME_CLUB_ARENAS[f.home] || f.home;
        matchConfig.userTeam = f.home === career.user ? 'home' : 'guest';
        matchActive = true;
        root.classList.add('cp-hidden');
        if (typeof showFunFactLoading === 'function') showFunFactLoading(ev.label, launchMatchFromCurrentConfig);
        else launchMatchFromCurrentConfig();
    }
    function onUserMatchFinished(res) {
        matchActive = false;
        if (!career) return;
        runAdvance(res);
    }
    function onUserMatchAbandoned() {
        matchActive = false;
        showScreen('hub');
        toast('Partita abbandonata • non è stata conteggiata');
    }

    // riepilogo dell'evento appena giocato
    function showReport(rep) {
        if (rep.ev.kind === 'season_end') { showSeasonSummary(); return; }
        if (career.over) { showGameOver(); return; }
        const sums = {};
        rep.money.forEach(m => { sums[m.cat] = (sums[m.cat] || 0) + m.amt; });
        const cats = Object.assign({}, MC().INCOME_CATS, MC().EXPENSE_CATS);
        const delta = rep.balanceAfter - rep.balanceBefore;
        let matchHtml = '';
        if (rep.match) {
            const f = rep.match.fixture, r = f.result;
            const tag = r.type === 'OT' ? 'dopo il supplementare' : r.type === 'SO' ? `ai rigori ${r.so[0]}-${r.so[1]}` : '';
            matchHtml = `<div class="mg-score ${rep.match.won ? 'is-win' : 'is-loss'}">
                <div><img src="${logo(f.home)}" alt=""><span>${esc(short(f.home))}</span></div>
                <b>${r.hg} - ${r.ag}</b>
                <div><img src="${logo(f.away)}" alt=""><span>${esc(short(f.away))}</span></div></div>
                <div class="mg-score-tag">${rep.match.won ? 'Vittoria' : 'Sconfitta'}${tag ? ' ' + tag : ''}${rep.match.people ? ` • ${rep.match.people} spettatori` : ''}</div>`;
        }
        const injured = rep.injuries.map(id => career.players[id]).filter(Boolean);
        const lines = Object.keys(sums).map(k => `<li><span>${esc(cats[k] || k)}</span><b class="${sums[k] >= 0 ? 'mg-pos' : 'mg-neg'}">${sums[k] >= 0 ? '+' : ''}${eur(sums[k])}</b></li>`).join('');
        overlay(`
            <span class="cp-kicker">${esc(rep.ev.label)} • ${esc(MC().dateLabel(rep.ev.date, true))}</span>
            <h2>Riepilogo</h2>
            ${matchHtml}
            <div class="mg-report">
                <div><small>Movimenti</small><ul class="mg-sumlist">${lines || '<li><span>Nessun movimento</span></li>'}</ul>
                    <div class="mg-report-total"><span>Saldo</span><b>${eur(rep.balanceAfter)}</b><em class="${delta >= 0 ? 'mg-pos' : 'mg-neg'}">${delta >= 0 ? '+' : ''}${eur(delta)}</em></div></div>
                <div><small>Tifosi</small>${fansGauge(career.fans, true)}<em class="${rep.fans >= 0 ? 'mg-pos' : 'mg-neg'}">${rep.fans >= 0 ? '+' : ''}${rep.fans.toFixed(1)}</em>
                    ${injured.length ? `<small>Nuovi infortuni</small><ul class="mg-sumlist">${injured.map(p => `<li><span>🩹 ${esc(p.name)}</span><b>${p.inj ? p.inj.days + ' giorni' : ''}</b></li>`).join('')}</ul>` : ''}
                    ${rep.messages.length ? `<small>${rep.messages.length} nuovi messaggi</small>` : ''}</div>
            </div>
            <div class="cp-next-actions">
                ${rep.messages.length ? '<button class="cp-btn" data-x="msgs">Apri messaggi</button>' : ''}
                <button class="cp-btn is-primary" data-x="ok" data-keyback data-focus>Continua ▶</button>
            </div>`, (o, close) => {
            o.querySelector('[data-x="ok"]').onclick = close;
            const m = o.querySelector('[data-x="msgs"]');
            if (m) m.onclick = () => { close(); ui.msgCat = 'all'; ui.msgSel = null; setTab('messages'); };
        });
        if (rep.match && window.gameAudio && rep.match.won && window.gameAudio.playStinger) window.gameAudio.playStinger('victory');
    }
    function showSeasonSummary() {
        const s = career.seasons[career.seasons.length - 1];
        if (!s) return;
        const champ = s.champion === career.user, cupW = s.cupWinner === career.user;
        overlay(`
            <span class="cp-kicker">Stagione ${esc(s.label)} conclusa</span>
            <img class="cp-champ-crest" src="${logo(champ ? career.user : s.champion)}" alt="">
            <h2>${champ ? 'Campioni d\'Italia!' : `Scudetto a ${esc(MC().clubName(s.champion))}`}</h2>
            <div class="mg-facts mg-facts-grid">
                <div><small>Regular season</small><b>${s.pos ? s.pos + '° posto' : '—'}</b></div>
                <div><small>Play-off</small><b>${esc(s.playoff)}</b></div>
                <div><small>Coppa Italia</small><b>${esc(cupW ? 'Vinta' : s.cup)}</b></div>
                <div><small>Bilancio stagione</small><b class="${s.income + s.expense >= 0 ? 'mg-pos' : 'mg-neg'}">${s.income + s.expense >= 0 ? '+' : ''}${eur(s.income + s.expense)}</b></div>
                <div><small>Saldo</small><b>${eur(s.balance)}</b></div>
                <div><small>Tifosi</small><b>${s.fans} • ${esc(MC().fansMood(s.fans))}</b></div>
            </div>
            <p>Si apre il mercato estivo: rinforza la squadra, rinnova gli sponsor e preparati alla stagione ${esc(MC().seasonLabelOf(career.seasonYear))}.</p>
            <div class="cp-next-actions"><button class="cp-btn is-primary" data-x="ok" data-keyback data-focus>Avanti ▶</button></div>`, (o, close) => {
            o.querySelector('[data-x="ok"]').onclick = close;
        });
        if (window.gameAudio && window.gameAudio.playStinger && (champ || cupW)) window.gameAudio.playStinger('victory');
    }
    function showGameOver() {
        const c = career;
        overlay(`
            <span class="cp-kicker">${esc(MC().dateLabel(c.over.date, true))}</span>
            <img class="cp-champ-crest mg-gray" src="${logo(c.user)}" alt="">
            <h2>Fallimento</h2>
            <p>Il saldo è sceso a <b class="mg-neg">${eur(c.over.balance)}</b>: ${esc(MC().clubName(c.user))} non può pagare stipendi e affitto e viene dichiarata fallita. La carriera termina qui.</p>
            <div class="mg-facts mg-facts-grid">
                <div><small>Stagioni completate</small><b>${c.seasons.length}</b></div>
                <div><small>Trofei</small><b>${c.trophies.length}</b></div>
                <div><small>Tifosi</small><b>${Math.round(c.fans)}</b></div>
            </div>
            <div class="cp-next-actions"><button class="cp-btn" data-x="stay" data-keyback>Rivedi i conti</button><button class="cp-btn is-primary" data-x="menu" data-focus>Torna al menu ▶</button></div>`, (o, close) => {
            o.querySelector('[data-x="stay"]').onclick = () => { close(); setTab('finance'); };
            o.querySelector('[data-x="menu"]').onclick = () => { close(); exitToMenu(); };
        });
    }

    // ------------------------------------------------------------------ sezioni
    const TAB_IMPL = {};

    // --- Ufficio
    TAB_IMPL.office = {
        html() {
            const c = career, M = MC();
            const ev = M.nextEvent(c);
            const f = ev ? M.userFixture(c, ev) : null;
            const pos = M.currentRank(c);
            const monthly = M.payroll(c) + M.arenaFee(c.user);
            const injured = M.teamPlayers(c, c.user).filter(p => p.inj).length;
            const offersIn = c.market.incoming.filter(o => o.status === 'open').length;
            const alerts = [];
            if (c.window) alerts.push(`<button type="button" class="mg-alert is-info" data-go="market">🔁 Mercato ${c.window === 'summer' ? 'estivo' : 'di gennaio'} aperto</button>`);
            if (c.sponsors.offers.length) alerts.push(`<button type="button" class="mg-alert" data-go="sponsors">🤝 ${c.sponsors.offers.length} ${c.sponsors.offers.length > 1 ? 'proposte' : 'proposta'} di sponsor</button>`);
            if (offersIn) alerts.push(`<button type="button" class="mg-alert" data-go="market">💼 ${offersIn} ${offersIn > 1 ? 'offerte' : 'offerta'} per i tuoi giocatori</button>`);
            if (injured) alerts.push(`<button type="button" class="mg-alert is-warn" data-go="infirmary">🩹 ${injured} ${injured > 1 ? 'infortunati' : 'infortunato'}</button>`);
            if (c.balance < monthly * 2) alerts.push(`<button type="button" class="mg-alert is-bad" data-go="finance">⚠️ Cassa quasi vuota</button>`);
            const fs = M.freeSlots(c);
            if (fs.main + fs.sec > 0 && !c.sponsors.offers.length) alerts.push(`<button type="button" class="mg-alert is-info" data-go="sponsors">🤝 ${fs.main + fs.sec} spazi sponsor liberi</button>`);
            const next = !ev ? '<div class="cp-rest"><b>Carriera terminata</b></div>' : f
                ? `<div class="cp-next-meta"><span>${esc(ev.label)}</span><span>${esc(M.dateLabel(ev.date, true))}</span></div>${versusHtml(f)}<div class="cp-next-arena">${esc(M.arenaName(f.home))}</div>
                   <div class="cp-next-actions"><button class="cp-btn" data-act="sim">Simula</button><button class="cp-btn is-primary" data-act="play" data-focus>Gioca ▶</button></div>`
                : `<div class="cp-next-meta"><span>${esc(M.dateLabel(ev.date, true))}</span></div><div class="cp-rest"><b>${esc(ev.label)}</b>${esc(eventHint(ev))}</div>
                   <div class="cp-next-actions"><button class="cp-btn is-primary" data-act="go" data-focus>Continua ▶</button></div>`;
            const form = c.form.slice(-5);
            return `<div class="mg-grid mg-office">
                <div class="cp-panel mg-span2"><div class="cp-panel-title"><span>Prossimo impegno</span></div><div class="cp-next">${next}</div></div>
                <div class="cp-panel"><div class="cp-panel-title"><span>Tifosi</span><b>Gradimento</b></div>
                    ${fansGauge(c.fans, true)}
                    <p class="mg-note">${esc(fansNote(c))}</p>
                    <div class="mg-facts"><div><small>Reputazione</small><b>${Math.round(c.rep)}</b></div><div><small>Sponsor fino al livello</small><b>${'★'.repeat(M.maxTier(c.rep))}<i class="mg-dim">${'★'.repeat(5 - M.maxTier(c.rep))}</i></b></div></div>
                </div>
                <div class="cp-panel"><div class="cp-panel-title"><span>Il club</span></div>
                    <div class="mg-kpis">
                        <div><small>Saldo</small><b>${eur(c.balance)}</b></div>
                        <div><small>Spese al mese</small><b>${eur(monthly)}</b></div>
                        <div><small>Sponsor al mese</small><b>${eur(M.sponsorMonthly(c))}</b></div>
                        <div><small>Serie A</small><b>${pos ? pos + '° posto' : '—'}</b></div>
                        <div><small>Rosa</small><b>${M.counts(c, c.user).total} / ${M.CFG.MAX_ROSTER}</b></div>
                        <div><small>Forma</small><b class="mg-form">${form.length ? form.map(x => `<i class="${x === 'W' ? 'w' : 'l'}">${x === 'W' ? 'V' : 'S'}</i>`).join('') : '—'}</b></div>
                    </div>
                </div>
                <div class="cp-panel mg-fill"><div class="cp-panel-title"><span>Da fare</span></div>
                    <div class="mg-alerts">${alerts.length ? alerts.join('') : '<div class="cp-empty">Tutto in ordine</div>'}</div>
                </div>
                <div class="cp-panel mg-fill"><div class="cp-panel-title"><span>Ultimi messaggi</span><b>${unread()} da leggere</b></div>
                    <div class="mg-msglist" data-pager="y">${c.messages.slice(0, 12).map(msgRow).join('') || '<div class="cp-empty">Nessun messaggio</div>'}</div>
                </div>
            </div>`;
        },
        bind(el) {
            const ev = MC().nextEvent(career);
            const on = (a, fn) => { const b = el.querySelector(`[data-act="${a}"]`); if (b) b.onclick = fn; };
            on('play', () => { const f = MC().userFixture(career, ev); if (f) playMatch(ev, f); });
            on('sim', () => runAdvance(null));
            on('go', () => runAdvance(null));
            el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => setTab(b.dataset.go));
            bindMsgRows(el);
        }
    };
    function eventHint(ev) {
        return {
            market: ' • Settimana di trattative: arrivano offerte e proposte di sponsor',
            season_start: ' • Chiude il mercato estivo e parte il campionato',
            winter_open: ' • Si apre il mercato di gennaio',
            winter_close: ' • Ultimo giorno di mercato',
            season_end: ' • Premi, bilanci, rinnovi e ritiri',
            league: ' • Turno di riposo per la tua squadra',
            playoff: ' • La tua squadra non gioca in questo turno',
            cup: ' • La tua squadra non è più in coppa'
        }[ev.kind] || '';
    }
    function fansNote(c) {
        const v = c.fans;
        if (v >= 80) return 'Palazzetto pieno e sponsor in fila: il pubblico è con te.';
        if (v >= 62) return 'Il pubblico apprezza: continua a vincere per riempire gli spalti.';
        if (v >= 45) return 'Tifosi in attesa: servono vittorie per riaccendere l\'entusiasmo.';
        if (v >= 28) return 'Spalti mezzi vuoti: incassi in calo e sponsor più freddi.';
        return 'Contestazione aperta: meno spettatori e sponsor pronti ad andarsene.';
    }

    // --- Rosa
    TAB_IMPL.squad = {
        html() {
            const c = career, M = MC();
            const L = M.lineup(c, c.user);
            const where = {};
            where[L.goalie.id] = 'Titolare';
            L.backups.forEach(p => { where[p.id] = 'Riserva'; });
            L.lines.forEach((l, i) => [l.C, l.LW, l.RW, l.D].forEach(p => { where[p.id] = `Linea ${i + 1}`; }));
            const ps = M.teamPlayers(c, c.user).sort((a, b) => ({ G: 0, D: 1, F: 2 }[a.pos] - { G: 0, D: 1, F: 2 }[b.pos]) || b.ovr - a.ovr);
            const k = M.counts(c, c.user);
            return `<div class="cp-panel mg-fill">
                <div class="cp-panel-title"><span>Rosa • ${k.total}/${M.CFG.MAX_ROSTER} (min ${M.CFG.MIN_ROSTER})</span><b>${k.goalies} portieri • ${k.skaters} di movimento • monte ingaggi ${eur(M.payroll(c))}/mese</b></div>
                <div class="cp-table-wrap" data-pager="y" data-pager-items="tbody tr"><table class="cp-table mg-table">
                    <thead><tr><th>N°</th><th class="l">Giocatore</th><th>Ruolo</th><th>Età</th><th>Val</th><th class="hide-sm">Valore</th><th>Stipendio</th><th class="l">Stato</th><th></th></tr></thead>
                    <tbody>${ps.map(p => `<tr class="${p.inj ? 'is-inj' : ''}">
                        <td class="pos">${esc(p.num)}</td>
                        <td class="l"><b>${esc(p.name)}</b> <small>${esc(p.first)}</small></td>
                        <td title="${esc(ROLE_DETAIL[p.role] || '')}">${ROLE_SHORT[p.pos]}<small>${p.pos === 'F' ? ' ' + p.role : ''}</small></td>
                        <td>${p.age}</td>
                        <td><span class="mg-ovr ${ovrCls(p.ovr)}">${p.ovr}</span></td>
                        <td class="hide-sm">${eur(M.valueOf(p))}</td>
                        <td>${eur(p.salary)}</td>
                        <td class="l">${p.inj ? `<span class="mg-tag is-bad">🩹 ${Math.max(0, M.dDiff(c.date, p.inj.until))} gg</span>` : `<span class="mg-tag">${where[p.id] || 'Riserva'}</span>`}${p.forSale ? ' <span class="mg-tag is-warn">In vendita</span>' : ''}</td>
                        <td class="mg-actions"><button class="cp-btn is-small" data-sale="${p.id}">${p.forSale ? 'Togli' : 'Vendi'}</button><button class="cp-btn is-small is-danger" data-rel="${p.id}" ${c.window ? '' : 'disabled title="Solo a mercato aperto"'}>Svincola</button></td>
                    </tr>`).join('')}</tbody></table></div>
                <div class="cp-legend"><span>Formazione automatica: i migliori sani giocano • "Vendi" mette il giocatore sul mercato e attira offerte • Svincolo: buonuscita di 2 mensilità</span></div>
            </div>`;
        },
        bind(el) {
            el.querySelectorAll('[data-sale]').forEach(b => b.onclick = () => {
                const on = MC().toggleForSale(career, b.dataset.sale);
                toast(on ? 'In vendita: arriveranno offerte durante il mercato' : 'Tolto dal mercato');
                renderHub();
            });
            el.querySelectorAll('[data-rel]').forEach(b => b.onclick = () => {
                const p = career.players[b.dataset.rel];
                confirmDialog(`Svincolare ${fullName(p)}?`, `Buonuscita di ${eur(p.salary * 2)}. Il giocatore diventa svincolato e potrà firmare con altre squadre.`, 'Svincola', () => {
                    const r = MC().releasePlayer(career, p.id);
                    toast(r.msg); save(true); renderHub();
                });
            });
        }
    };
    function confirmDialog(title, text, okLabel, onOk) {
        overlay(`<h2>${esc(title)}</h2><p>${esc(text)}</p>
            <div class="cp-next-actions"><button class="cp-btn" data-x="no" data-keyback data-focus>Annulla</button><button class="cp-btn is-danger" data-x="yes">${esc(okLabel)}</button></div>`, (o, close) => {
            o.querySelector('[data-x="no"]').onclick = close;
            o.querySelector('[data-x="yes"]').onclick = () => { close(); onOk(); };
        });
    }

    // --- Mercato
    const POS_OPTS = [['all', 'Tutti i ruoli'], ['G', 'Portieri'], ['D', 'Difensori'], ['F', 'Attaccanti']];
    const OVR_OPTS = [0, 60, 65, 70, 75, 80];
    const FEE_OPTS = [0, 2000, 5000, 10000, 20000, 40000];
    const SORT_OPTS = [['ovr', 'Valutazione'], ['value', 'Prezzo'], ['age', 'Età']];
    function cycle(list, cur, d) { const i = list.indexOf(cur); return list[(i + d + list.length) % list.length]; }
    TAB_IMPL.market = {
        html() {
            const c = career, M = MC(), f = ui.mkt;
            const teamOpts = ['all', 'fa'].concat(c.teams.filter(t => t !== c.user));
            let list = Object.values(c.players).filter(p => p.team !== c.user);
            if (f.pos !== 'all') list = list.filter(p => p.pos === f.pos);
            if (f.team === 'fa') list = list.filter(p => !p.team);
            else if (f.team !== 'all') list = list.filter(p => p.team === f.team);
            if (f.minOvr) list = list.filter(p => p.ovr >= f.minOvr);
            if (f.maxFee) list = list.filter(p => (p.team ? M.valueOf(p) : 0) <= f.maxFee);
            const sorters = { ovr: (a, b) => b.ovr - a.ovr, value: (a, b) => (a.team ? M.valueOf(a) : 0) - (b.team ? M.valueOf(b) : 0), age: (a, b) => a.age - b.age };
            list.sort(sorters[f.sort]);
            const teamLabel = t => (t === 'all' ? 'Tutte le squadre' : t === 'fa' ? 'Svincolati' : short(t));
            const incoming = c.market.incoming.filter(o => o.status === 'open');
            const winTxt = c.window ? `Mercato ${c.window === 'summer' ? 'estivo' : 'di gennaio'} aperto` : 'Mercato chiuso • riapre a fine stagione e a gennaio';
            const chip = (key, label) => `<button type="button" class="mg-chip" data-f="${key}" data-keynav-own="x" title="Invio o clic per cambiare, ◀ ▶ per scorrere">${esc(label)} <i>▾</i></button>`;
            return `<div class="mg-grid mg-market">
                <div class="cp-panel mg-fill mg-span2">
                    <div class="cp-panel-title"><span>Ricerca giocatori</span><b class="${c.window ? 'mg-pos' : 'mg-dim'}">${winTxt}</b></div>
                    <div class="mg-filters">
                        ${chip('pos', POS_OPTS.find(o => o[0] === f.pos)[1])}
                        ${chip('team', teamLabel(f.team))}
                        ${chip('minOvr', f.minOvr ? `Val ≥ ${f.minOvr}` : 'Qualsiasi valutazione')}
                        ${chip('maxFee', f.maxFee ? `Prezzo ≤ ${eur(f.maxFee)}` : 'Qualsiasi prezzo')}
                        ${chip('sort', 'Ordina: ' + SORT_OPTS.find(o => o[0] === f.sort)[1])}
                        <span class="mg-count">${list.length} risultati</span>
                    </div>
                    <div class="cp-table-wrap" data-pager="y" data-pager-items="tbody tr"><table class="cp-table mg-table">
                        <thead><tr><th class="l">Giocatore</th><th class="l">Squadra</th><th>Ruolo</th><th>Età</th><th>Val</th><th>Valore</th><th class="hide-sm">Stipendio</th><th></th></tr></thead>
                        <tbody>${list.slice(0, 120).map(p => `<tr class="${p.inj ? 'is-inj' : ''}">
                            <td class="l"><b>${esc(p.name)}</b> <small>${esc(p.first)}</small>${p.inj ? ' 🩹' : ''}</td>
                            <td class="l">${p.team ? `<span class="team"><img src="${logo(p.team)}" alt="">${esc(short(p.team))}</span>` : '<span class="mg-tag">Svincolato</span>'}</td>
                            <td>${ROLE_SHORT[p.pos]}</td><td>${p.age}</td>
                            <td><span class="mg-ovr ${ovrCls(p.ovr)}">${p.ovr}</span></td>
                            <td>${p.team ? eur(M.valueOf(p)) : '—'}</td>
                            <td class="hide-sm">${eur(p.salary)}</td>
                            <td><button class="cp-btn is-small is-primary" data-offer="${p.id}">Offerta</button></td>
                        </tr>`).join('')}</tbody></table></div>
                </div>
                <div class="cp-panel mg-fill">
                    <div class="cp-panel-title"><span>Offerte ricevute</span><b>${incoming.length}</b></div>
                    <div class="mg-offers" data-pager="y">${incoming.length ? incoming.map(o => {
                        const p = c.players[o.pid];
                        return p ? `<div class="mg-offer">
                            <img src="${logo(o.buyer)}" alt="">
                            <div><b>${esc(short(o.buyer))}</b> offre <b>${eur(o.fee)}</b><small>per ${esc(fullName(p))} (${p.ovr}) • valore ${eur(M.valueOf(p))} • scade il ${esc(M.dateLabel(o.expires))}</small></div>
                            <div class="a"><button class="cp-btn is-small is-primary" data-inc-yes="${o.id}">Accetta</button><button class="cp-btn is-small" data-inc-no="${o.id}">Rifiuta</button></div>
                        </div>` : '';
                    }).join('') : '<div class="cp-empty">Nessuna offerta. Metti in vendita qualcuno dalla Rosa per attirarne.</div>'}</div>
                    <div class="cp-legend"><span>Rosa: ${M.counts(c, c.user).total} giocatori (min ${M.CFG.MIN_ROSTER}, max ${M.CFG.MAX_ROSTER}) • Saldo ${eur(c.balance)}</span></div>
                </div>
            </div>`;
        },
        bind(el) {
            const f = ui.mkt;
            const teamOpts = ['all', 'fa'].concat(career.teams.filter(t => t !== career.user));
            const step = (key, d) => {
                if (key === 'pos') f.pos = cycle(POS_OPTS.map(o => o[0]), f.pos, d);
                if (key === 'team') f.team = cycle(teamOpts, f.team, d);
                if (key === 'minOvr') f.minOvr = cycle(OVR_OPTS, f.minOvr, d);
                if (key === 'maxFee') f.maxFee = cycle(FEE_OPTS, f.maxFee, d);
                if (key === 'sort') f.sort = cycle(SORT_OPTS.map(o => o[0]), f.sort, d);
                renderHub();
                const b = root.querySelector(`[data-f="${key}"]`);
                if (b) { b.focus({ preventScroll: true }); if (window.UIKit) window.UIKit.focus(b); }
            };
            el.querySelectorAll('[data-f]').forEach(b => {
                b.onclick = () => step(b.dataset.f, 1);
                b.onkeydown = e => {
                    if (e.key === 'ArrowRight') { e.preventDefault(); step(b.dataset.f, 1); }
                    if (e.key === 'ArrowLeft') { e.preventDefault(); step(b.dataset.f, -1); }
                };
            });
            el.querySelectorAll('[data-offer]').forEach(b => b.onclick = () => offerDialog(b.dataset.offer));
            el.querySelectorAll('[data-inc-yes]').forEach(b => b.onclick = () => answer(b.dataset.incYes, true));
            el.querySelectorAll('[data-inc-no]').forEach(b => b.onclick = () => answer(b.dataset.incNo, false));
        }
    };
    function answer(id, yes) {
        const r = MC().answerIncoming(career, id, yes);
        toast(r.msg);
        save(true);
        renderHub();
    }
    function offerDialog(pid) {
        const c = career, M = MC(), p = c.players[pid];
        if (!p) return;
        const block = M.marketBlock(c, p);
        const value = p.team ? M.valueOf(p) : 0;
        const neg = c.market.neg[pid];
        let fee = p.team ? Math.round(value / 500) * 500 : 0;
        let salary = Math.max(50, Math.round(Math.max(p.salary, M.salaryFor(p.ovr)) / 10) * 10);
        overlay(`
            <span class="cp-kicker">${p.team ? `Trattativa con ${esc(M.clubName(p.team))}` : 'Giocatore svincolato'}</span>
            <div class="mg-player-card">
                <img src="${p.team ? logo(p.team) : logo(c.user)}" alt="" class="${p.team ? '' : 'mg-gray'}">
                <div><h2>${esc(fullName(p))}</h2><small>${esc(ROLE_DETAIL[p.role] || M.ROLE_LABEL[p.pos])} • ${p.age} anni${p.inj ? ` • 🩹 ${esc(p.inj.t)}` : ''}</small></div>
                <span class="mg-ovr is-big ${ovrCls(p.ovr)}">${p.ovr}</span>
            </div>
            <div class="mg-facts mg-facts-grid">
                <div><small>Valore stimato</small><b>${p.team ? eur(value) : 'Gratis'}</b></div>
                <div><small>Stipendio attuale</small><b>${eur(p.salary)}/mese</b></div>
                <div><small>Tentativi</small><b>${neg ? neg.tries : 0} / 3</b></div>
            </div>
            ${block ? `<p class="mg-warnbox">${esc(block)}</p>` : `
            <div class="mg-offer-form">
                ${p.team ? `<label><span>Cartellino al club</span><div class="mg-stepper"><button type="button" class="cp-btn is-small" data-st="fee" data-d="-500">−</button><input type="number" min="0" step="500" data-in="fee" value="${fee}" data-keynav-own="y" inputmode="numeric"><button type="button" class="cp-btn is-small" data-st="fee" data-d="500">+</button></div></label>` : ''}
                <label><span>Stipendio mensile</span><div class="mg-stepper"><button type="button" class="cp-btn is-small" data-st="salary" data-d="-20">−</button><input type="number" min="0" step="10" data-in="salary" value="${salary}" data-keynav-own="y" inputmode="numeric"><button type="button" class="cp-btn is-small" data-st="salary" data-d="20">+</button></div></label>
            </div>
            <p class="mg-note" data-out>Saldo disponibile ${eur(c.balance)} • Monte ingaggi attuale ${eur(M.payroll(c))}/mese</p>`}
            <div class="cp-next-actions"><button class="cp-btn" data-x="close" data-keyback>Chiudi</button>${block ? '' : '<button class="cp-btn is-primary" data-x="send" data-focus>Invia offerta ▶</button>'}</div>`, (o, close) => {
            o.querySelector('[data-x="close"]').onclick = close;
            if (block) return;
            const inp = k => o.querySelector(`[data-in="${k}"]`);
            o.querySelectorAll('[data-st]').forEach(b => b.onclick = () => {
                const i = inp(b.dataset.st);
                i.value = Math.max(0, (+i.value || 0) + (+b.dataset.d));
            });
            o.querySelector('[data-x="send"]').onclick = () => {
                fee = inp('fee') ? +inp('fee').value || 0 : 0;
                salary = +inp('salary').value || 0;
                const r = M.makeOffer(c, pid, fee, salary);
                save(true);
                if (r.ok) {
                    close();
                    renderHub();
                    overlay(`<span class="cp-kicker">Mercato</span><h2>Affare fatto!</h2><p>${esc(r.msg)}</p><div class="cp-next-actions"><button class="cp-btn is-primary" data-x="ok" data-keyback data-focus>Ottimo ▶</button></div>`, (o2, c2) => { o2.querySelector('[data-x="ok"]').onclick = c2; });
                    return;
                }
                const out = o.querySelector('[data-out]');
                out.className = 'mg-warnbox';
                out.textContent = r.msg;
                if (r.ask && r.stage === 'club' && inp('fee')) inp('fee').value = r.ask;
                if (r.ask && r.stage === 'player') inp('salary').value = r.ask;
                const t = o.querySelector('.mg-facts-grid div:last-child b');
                if (t) t.textContent = `${(c.market.neg[pid] || { tries: 0 }).tries} / 3`;
                if (r.closed) { o.querySelector('[data-x="send"]').disabled = true; }
                renderHub();
            };
        });
    }

    // --- Sponsor
    TAB_IMPL.sponsors = {
        html() {
            const c = career, M = MC();
            const card = (a, slotLabel) => {
                if (!a) return `<div class="mg-sp is-empty"><span class="mg-sp-slot">${slotLabel}</span><div class="mg-sp-logo">＋</div><b>Spazio libero</b><small>In attesa di proposte</small></div>`;
                const s = M.sponsorById(a.sid);
                return `<div class="mg-sp"><span class="mg-sp-slot">${slotLabel}</span><div class="mg-sp-logo"><img src="${esc(s.logo)}" alt="${esc(s.name)}"></div>
                    <b>${esc(s.name)}</b><small>${esc(s.sector)} • livello ${'★'.repeat(s.tier)}</small>
                    <div class="mg-sp-money">${eur(a.monthly)}<small>/mese</small></div>
                    <small>Fino alla stagione ${esc(M.seasonLabelOf(a.until))} • vittoria +${eur(a.winBonus)} • trofeo +${eur(a.trophyBonus)}</small></div>`;
            };
            const main = c.sponsors.active.find(a => a.slot === 'main');
            const secs = c.sponsors.active.filter(a => a.slot === 'sec');
            const top = M.maxTier(c.rep);
            return `<div class="mg-grid mg-sponsors">
                <div class="cp-panel mg-span2 mg-fill">
                    <div class="cp-panel-title"><span>Contratti attivi</span><b>${eur(M.sponsorMonthly(c))} al mese</b></div>
                    <div class="mg-sp-grid" data-pager="y">${card(main, 'Sponsor di maglia')}${[0, 1, 2, 3].map(i => card(secs[i], 'Secondario')).join('')}</div>
                    <div class="cp-legend"><span>Reputazione ${Math.round(c.rep)}: interessa sponsor fino al livello ${'★'.repeat(top)}. Più vinci (e più i tifosi sono contenti), più grandi sono gli sponsor; con risultati deludenti i grandi marchi possono recedere.</span></div>
                </div>
                <div class="cp-panel mg-fill">
                    <div class="cp-panel-title"><span>Proposte</span><b>${c.sponsors.offers.length}</b></div>
                    <div class="mg-offers" data-pager="y">${c.sponsors.offers.length ? c.sponsors.offers.map(o => {
                        const s = M.sponsorById(o.sid);
                        const free = M.freeSlots(c)[o.slot] > 0;
                        return `<div class="mg-offer mg-sp-offer">
                            <div class="mg-sp-logo is-small"><img src="${esc(s.logo)}" alt=""></div>
                            <div><b>${esc(s.name)}</b> • ${o.slot === 'main' ? 'maglia' : 'secondario'}<small>${eur(o.monthly)}/mese per ${o.seasons} ${o.seasons > 1 ? 'stagioni' : 'stagione'} • scade il ${esc(M.dateLabel(o.expires))}${free ? '' : ' • <em class="mg-neg">spazio occupato</em>'}</small></div>
                            <div class="a"><button class="cp-btn is-small is-primary" data-sp-yes="${o.id}" ${free ? '' : 'disabled'}>Accetta</button><button class="cp-btn is-small" data-sp-no="${o.id}">Rifiuta</button></div>
                        </div>`;
                    }).join('') : '<div class="cp-empty">Nessuna proposta in sospeso: ne arrivano soprattutto durante il mercato.</div>'}</div>
                </div>
            </div>`;
        },
        bind(el) {
            el.querySelectorAll('[data-sp-yes]').forEach(b => b.onclick = () => { const r = MC().acceptSponsor(career, b.dataset.spYes); toast(r.ok ? 'Contratto firmato' : r.msg); save(true); renderHub(); });
            el.querySelectorAll('[data-sp-no]').forEach(b => b.onclick = () => { MC().rejectSponsor(career, b.dataset.spNo); toast('Proposta rifiutata'); save(true); renderHub(); });
        }
    };

    // --- Infermeria
    TAB_IMPL.infirmary = {
        html() {
            const c = career, M = MC();
            const mine = M.teamPlayers(c, c.user);
            const inj = mine.filter(p => p.inj).sort((a, b) => a.inj.until.localeCompare(b.inj.until));
            const hs = mine.filter(p => !p.inj && p.pos !== 'G').length, hg = mine.filter(p => !p.inj && p.pos === 'G').length;
            const others = Object.values(c.players).filter(p => p.team && p.team !== c.user && p.inj).sort((a, b) => a.inj.until.localeCompare(b.inj.until));
            const card = p => {
                const left = Math.max(0, M.dDiff(c.date, p.inj.until));
                const pct = Math.round(100 * (1 - left / Math.max(1, p.inj.days)));
                return `<div class="mg-inj">
                    <div class="mg-inj-head"><b>${esc(fullName(p))}</b><span class="mg-ovr ${ovrCls(p.ovr)}">${p.ovr}</span></div>
                    <small>${esc(M.ROLE_LABEL[p.pos])} • ${esc(p.inj.t)}</small>
                    <div class="mg-inj-bar"><i style="width:${pct}%"></i></div>
                    <small>Rientro previsto ${esc(M.dateLabel(p.inj.until, true))} • ${left} giorni</small>
                </div>`;
            };
            return `<div class="mg-grid mg-infirmary">
                <div class="cp-panel mg-fill">
                    <div class="cp-panel-title"><span>I tuoi infortunati</span><b>${inj.length}</b></div>
                    <div class="mg-avail">
                        <div class="${hg >= 1 ? '' : 'is-bad'}"><small>Portieri sani</small><b>${hg}</b><em>min 1</em></div>
                        <div class="${hs >= 12 ? '' : 'is-bad'}"><small>Giocatori di movimento sani</small><b>${hs}</b><em>min 12 (3 linee)</em></div>
                        <div class="${hs >= 12 && hg >= 1 ? 'is-ok' : 'is-bad'}"><small>Formazione</small><b>${hs >= 12 && hg >= 1 ? 'Completa' : 'Incompleta'}</b><em>${hs >= 12 && hg >= 1 ? 'si può giocare' : 'giocano i giovani'}</em></div>
                    </div>
                    <div class="mg-inj-list" data-pager="y">${inj.length ? inj.map(card).join('') : '<div class="cp-empty">Nessun infortunato: tutta la rosa è a disposizione.</div>'}</div>
                </div>
                <div class="cp-panel mg-fill">
                    <div class="cp-panel-title"><span>Infortunati in Serie A</span><b>${others.length}</b></div>
                    <div class="cp-table-wrap" data-pager="y" data-pager-items="tbody tr"><table class="cp-table mg-table">
                        <thead><tr><th class="l">Giocatore</th><th class="l">Squadra</th><th class="l hide-sm">Infortunio</th><th>Rientro</th></tr></thead>
                        <tbody>${others.map(p => `<tr><td class="l"><b>${esc(p.name)}</b> <span class="mg-ovr ${ovrCls(p.ovr)}">${p.ovr}</span></td><td class="l"><span class="team"><img src="${logo(p.team)}" alt="">${esc(short(p.team))}</span></td><td class="l hide-sm">${esc(p.inj.t)}</td><td>${esc(M.dateLabel(p.inj.until))}</td></tr>`).join('') || '<tr><td colspan="4">Nessuno</td></tr>'}</tbody>
                    </table></div>
                    <div class="cp-legend"><span>Mai più di 2 infortunati per squadra (3 con rosa da 18+): ogni squadra può sempre schierare 3 linee e un portiere.</span></div>
                </div>
            </div>`;
        }
    };

    // --- Competizioni
    TAB_IMPL.comps = {
        html() {
            const c = career, En = E();
            const leagueBody = !c.league ? '<div class="cp-empty" style="margin:auto">Il campionato inizia a settembre</div>'
                : (ui.compView === 'table' ? En.tableHtml(c.league) : En.bracketHtml(c.league));
            const lr = c.league ? En.lastResults(c.league) : null;
            const cupBody = c.cup ? En.cupBracketHtml(c.cup) : '<div class="cp-empty" style="margin:auto">La Coppa Italia si gioca a gennaio, durante la sosta del campionato</div>';
            const hist = c.seasons.slice().reverse();
            return `<div class="mg-grid mg-comps">
                <div class="cp-panel mg-span2 mg-fill">
                    <div class="cp-panel-title"><div class="cp-tabs">
                        <button class="cp-tab${ui.comp === 'league' ? ' is-active' : ''}" data-comp="league">Serie A</button>
                        <button class="cp-tab${ui.comp === 'cup' ? ' is-active' : ''}" data-comp="cup">Coppa Italia</button>
                        ${ui.comp === 'league' && c.league ? `<button class="cp-tab${ui.compView === 'table' ? ' is-active' : ''}" data-view="table">Classifica</button><button class="cp-tab${ui.compView === 'bracket' ? ' is-active' : ''}" data-view="bracket">Play-off</button>` : ''}
                    </div><span>${ui.comp === 'league' ? (c.league ? esc(En.progressLabel(c.league)) : '') : (c.cup ? esc(En.progressLabel(c.cup)) : '')}</span></div>
                    ${ui.comp === 'league' ? leagueBody : cupBody}
                </div>
                <div class="cp-col">
                    <div class="cp-panel mg-fill"><div class="cp-panel-title"><span>${lr ? esc(lr.title) : 'Risultati'}</span></div>
                        <div class="cp-results" data-pager="y">${ui.comp === 'cup' && c.cup ? En.lastResults(c.cup).body : (lr ? lr.body : '<div class="cp-empty">Nessuna partita giocata</div>')}</div></div>
                    <div class="cp-panel mg-fill"><div class="cp-panel-title"><span>Albo della carriera</span><b>${c.trophies.length} trofei</b></div>
                        <div class="mg-hist" data-pager="y">${hist.length ? hist.map(s => `<div class="mg-hist-row"><b>${esc(s.label)}</b><span>${s.pos ? s.pos + '°' : '—'} • PO: ${esc(s.playoff)} • Coppa: ${esc(s.cupWinner === c.user ? 'Vinta' : s.cup)}</span><em class="${s.income + s.expense >= 0 ? 'mg-pos' : 'mg-neg'}">${eur(s.income + s.expense)}</em></div>`).join('') : '<div class="cp-empty">La prima stagione è in corso</div>'}</div></div>
                </div>
            </div>`;
        },
        bind(el) {
            el.querySelectorAll('[data-comp]').forEach(b => b.onclick = () => { ui.comp = b.dataset.comp; renderHub(); });
            el.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { ui.compView = b.dataset.view; renderHub(); });
        }
    };

    // --- Finanze
    TAB_IMPL.finance = {
        html() {
            const c = career, M = MC();
            const season = c.ledger.filter(l => l.s === c.seasonYear);
            const sum = (pred) => season.filter(pred).reduce((a, l) => a + l.amt, 0);
            const inc = sum(l => l.amt > 0), exp = sum(l => l.amt < 0);
            const byCat = (cats) => Object.keys(cats).map(k => ({ k, label: cats[k], v: Math.abs(sum(l => l.cat === k)) })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
            const incs = byCat(M.INCOME_CATS), exps = byCat(M.EXPENSE_CATS);
            const maxV = Math.max(1, ...incs.map(x => x.v), ...exps.map(x => x.v));
            const bars = (list, cls) => list.length ? list.map(x => `<div class="mg-bar ${cls}"><span>${esc(x.label)}</span><div><i style="width:${Math.max(2, 100 * x.v / maxV)}%"></i></div><b>${eur(x.v)}</b></div>`).join('') : '<div class="cp-empty">Nessun movimento</div>';
            const monthlyOut = M.payroll(c) + M.arenaFee(c.user), monthlyIn = M.sponsorMonthly(c);
            const recent = c.ledger.slice().reverse().slice(0, 60);
            const cats = Object.assign({}, M.INCOME_CATS, M.EXPENSE_CATS);
            return `<div class="mg-grid mg-finance">
                <div class="cp-panel mg-span3"><div class="mg-kpis is-row">
                    <div><small>Saldo</small><b class="${c.balance < monthlyOut * 2 ? 'mg-neg' : ''}">${eur(c.balance)}</b></div>
                    <div><small>Entrate stagione</small><b>${eur(inc)}</b></div>
                    <div><small>Uscite stagione</small><b>${eur(-exp)}</b></div>
                    <div><small>Risultato</small><b class="${inc + exp >= 0 ? 'mg-pos' : 'mg-neg'}">${inc + exp >= 0 ? '+' : ''}${eur(inc + exp)}</b></div>
                    <div><small>Fisse al mese</small><b>${eur(monthlyIn - monthlyOut)}</b><em>sponsor ${eur(monthlyIn)} − stipendi ${eur(M.payroll(c))} − palazzetto ${eur(M.arenaFee(c.user))}</em></div>
                </div></div>
                <div class="cp-panel mg-span2 mg-fill">
                    <div class="cp-panel-title"><span>Andamento del saldo</span><div class="cp-tabs"><button class="cp-tab${ui.finRange === 'season' ? ' is-active' : ''}" data-range="season">Stagione</button><button class="cp-tab${ui.finRange === 'all' ? ' is-active' : ''}" data-range="all">Carriera</button></div></div>
                    <div class="mg-chart" data-chart></div>
                    <div class="cp-legend"><span>Il saldo non deve mai andare sotto zero: la linea tratteggiata è il fallimento. Stipendi, palazzetto e sponsor si regolano il 1° di ogni mese.</span></div>
                </div>
                <div class="cp-panel mg-fill">
                    <div class="cp-panel-title"><span>Stagione ${esc(M.seasonLabelOf(c.seasonYear))}</span></div>
                    <small class="mg-sub">Entrate</small>${bars(incs, 'is-in')}
                    <small class="mg-sub">Uscite</small>${bars(exps, 'is-out')}
                </div>
                <div class="cp-panel mg-span3 mg-fill mg-ledger-panel">
                    <div class="cp-panel-title"><span>Ultimi movimenti</span></div>
                    <div class="mg-ledger" data-pager="y">${recent.map(l => `<div class="mg-led"><span>${esc(M.dateLabel(l.d))}</span><span>${esc(cats[l.cat] || l.cat)}</span><span class="n">${esc(l.note)}</span><b class="${l.amt >= 0 ? 'mg-pos' : 'mg-neg'}">${l.amt >= 0 ? '+' : ''}${eur(l.amt)}</b></div>`).join('') || '<div class="cp-empty">Nessun movimento</div>'}</div>
                </div>
            </div>`;
        },
        bind(el) {
            el.querySelectorAll('[data-range]').forEach(b => b.onclick = () => { ui.finRange = b.dataset.range; renderHub(); });
            requestAnimationFrame(() => drawChart(el.querySelector('[data-chart]')));
        }
    };
    // grafico a linea del saldo: una serie, zero come riferimento, mirino con valore al passaggio
    function drawChart(box) {
        if (!box || !career) return;
        const c = career;
        const from = `${c.seasonYear}-07-01`;
        let pts = c.history.filter(h => ui.finRange === 'all' || h.d >= from);
        if (pts.length < 2) pts = c.history.slice(-2);
        if (pts.length === 1) pts = [pts[0], { d: c.date, b: pts[0].b }];
        const W = Math.max(240, box.clientWidth), H = Math.max(140, box.clientHeight);
        const pad = { l: 64, r: 14, t: 12, b: 26 };
        const t0 = +new Date(pts[0].d), t1 = Math.max(t0 + 864e5, +new Date(pts[pts.length - 1].d));
        let lo = Math.min(0, ...pts.map(p => p.b)), hi = Math.max(...pts.map(p => p.b), 1000);
        const span = hi - lo; hi += span * 0.08; if (lo < 0) lo -= span * 0.08;
        const x = t => pad.l + (W - pad.l - pad.r) * ((+new Date(t)) - t0) / (t1 - t0);
        const y = v => pad.t + (H - pad.t - pad.b) * (1 - (v - lo) / (hi - lo));
        const step = niceStep((hi - lo) / 4);
        const ticks = [];
        for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
        const kfmt = v => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)));
        const months = [];
        const d0 = new Date(pts[0].d);
        for (let d = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 1)); +d <= t1; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + (ui.finRange === 'all' ? 3 : 1), 1))) months.push(d.toISOString().slice(0, 10));
        const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.d).toFixed(1)},${y(p.b).toFixed(1)}`).join('');
        const area = `${line}L${x(pts[pts.length - 1].d).toFixed(1)},${y(Math.max(lo, 0)).toFixed(1)}L${x(pts[0].d).toFixed(1)},${y(Math.max(lo, 0)).toFixed(1)}Z`;
        const last = pts[pts.length - 1];
        box.innerHTML = `<svg width="${W}" height="${H}" role="img" aria-label="Andamento del saldo: ultimo valore ${MC().eur(last.b)}">
            ${ticks.map(v => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end" class="ax">€ ${kfmt(v)}</text>`).join('')}
            ${months.map(m => `<text x="${x(m)}" y="${H - 8}" text-anchor="middle" class="ax">${MC().dateLabel(m).split(' ')[1]}${ui.finRange === 'all' ? ' ' + m.slice(2, 4) : ''}</text>`).join('')}
            <line x1="${pad.l}" x2="${W - pad.r}" y1="${y(0)}" y2="${y(0)}" class="zero"/>
            <path d="${area}" class="area"/>
            <path d="${line}" class="line"/>
            <circle cx="${x(last.d)}" cy="${y(last.b)}" r="4.5" class="dot"/>
            <g class="hover" style="display:none"><line class="cross" y1="${pad.t}" y2="${H - pad.b}"/><circle r="5" class="dot"/></g>
            <rect x="${pad.l}" y="${pad.t}" width="${W - pad.l - pad.r}" height="${H - pad.t - pad.b}" fill="transparent" class="hit"/>
        </svg><div class="mg-tip" style="display:none"></div>`;
        const svg = box.querySelector('svg'), g = svg.querySelector('.hover'), tip = box.querySelector('.mg-tip');
        const hit = svg.querySelector('.hit');
        hit.addEventListener('mousemove', e => {
            const r = svg.getBoundingClientRect();
            const mx = e.clientX - r.left;
            let best = pts[0], bd = Infinity;
            pts.forEach(p => { const d = Math.abs(x(p.d) - mx); if (d < bd) { bd = d; best = p; } });
            const px = x(best.d), py = y(best.b);
            g.style.display = '';
            g.querySelector('.cross').setAttribute('x1', px); g.querySelector('.cross').setAttribute('x2', px);
            g.querySelector('circle').setAttribute('cx', px); g.querySelector('circle').setAttribute('cy', py);
            tip.style.display = '';
            tip.innerHTML = `<small>${esc(MC().dateLabel(best.d, true))}</small><b>${MC().eur(best.b)}</b>`;
            tip.style.left = Math.min(W - 150, Math.max(0, px + 10)) + 'px';
            tip.style.top = Math.max(0, py - 48) + 'px';
        });
        hit.addEventListener('mouseleave', () => { g.style.display = 'none'; tip.style.display = 'none'; });
    }
    function niceStep(raw) {
        const p = Math.pow(10, Math.floor(Math.log10(Math.max(1, raw))));
        const n = raw / p;
        return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
    }

    // --- Messaggi
    function msgRow(m) {
        const pending = m.act && !m.act.done;
        return `<button type="button" class="mg-msg${m.read ? '' : ' is-unread'}${ui.msgSel === m.id ? ' is-active' : ''}" data-msg="${m.id}">
            <span class="ic" title="${esc(MC().CAT[m.cat] || '')}">${CAT_ICON[m.cat] || '•'}</span>
            <span class="t"><b>${esc(m.title)}</b><small>${esc(MC().dateLabel(m.d))} • ${esc(MC().CAT[m.cat] || '')}${pending ? ' • <em>risposta richiesta</em>' : ''}</small></span>
        </button>`;
    }
    function bindMsgRows(el) {
        el.querySelectorAll('[data-msg]').forEach(b => b.onclick = () => {
            ui.msgSel = b.dataset.msg;
            const m = career.messages.find(x => x.id === ui.msgSel);
            if (m) m.read = true;
            if (tab !== 'messages') { setTab('messages'); return; }
            renderHub();
            const f = root.querySelector(`[data-msg="${ui.msgSel}"]`);
            if (f) f.focus({ preventScroll: true });
        });
    }
    TAB_IMPL.messages = {
        html() {
            const c = career, M = MC();
            const cats = ['all'].concat(Object.keys(M.CAT));
            const list = c.messages.filter(m => ui.msgCat === 'all' || m.cat === ui.msgCat);
            const sel = c.messages.find(m => m.id === ui.msgSel) || list[0];
            if (sel && !sel.read) sel.read = true;
            if (sel) ui.msgSel = sel.id;
            const cnt = k => c.messages.filter(m => !m.read && (k === 'all' || m.cat === k)).length;
            let actions = '';
            if (sel && sel.act) {
                if (sel.act.done) actions = `<span class="mg-tag">${esc(sel.act.done)}</span>`;
                else if (sel.act.kind === 'sponsor') actions = `<button class="cp-btn is-primary" data-ma="sp-yes">Accetta lo sponsor</button><button class="cp-btn" data-ma="sp-no">Rifiuta</button>`;
                else if (sel.act.kind === 'cpu_offer') actions = `<button class="cp-btn is-primary" data-ma="in-yes">Accetta l'offerta</button><button class="cp-btn" data-ma="in-no">Rifiuta</button>`;
            }
            return `<div class="mg-grid mg-messages">
                <div class="cp-panel mg-fill">
                    <div class="cp-panel-title"><div class="cp-tabs mg-cat-tabs">${cats.map(k => `<button class="cp-tab${ui.msgCat === k ? ' is-active' : ''}" data-cat="${k}" title="${k === 'all' ? 'Tutti' : esc(M.CAT[k])}">${k === 'all' ? 'Tutti' : CAT_ICON[k]}${cnt(k) ? `<sup>${cnt(k)}</sup>` : ''}</button>`).join('')}</div></div>
                    <div class="mg-msglist" data-pager="y">${list.map(msgRow).join('') || '<div class="cp-empty">Nessun messaggio in questa categoria</div>'}</div>
                    <div class="cp-legend"><button class="cp-btn is-small" data-act="readall">Segna tutti come letti</button></div>
                </div>
                <div class="cp-panel mg-span2 mg-fill mg-msg-view">${sel ? `
                    <span class="cp-kicker">${CAT_ICON[sel.cat] || ''} ${esc(M.CAT[sel.cat] || '')} • ${esc(M.dateLabel(sel.d, true))}</span>
                    <h2>${esc(sel.title)}</h2>
                    <p>${esc(sel.body)}</p>
                    ${sel.act && sel.act.kind === 'sponsor' ? sponsorPreview(sel.act.ref) : ''}
                    <div class="cp-next-actions">${actions}</div>` : '<div class="cp-empty" style="margin:auto">Nessun messaggio</div>'}
                </div>
            </div>`;
        },
        bind(el) {
            el.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { ui.msgCat = b.dataset.cat; ui.msgSel = null; renderHub(); });
            bindMsgRows(el);
            const ra = el.querySelector('[data-act="readall"]');
            if (ra) ra.onclick = () => { career.messages.forEach(m => { m.read = true; }); save(true); renderHub(); };
            const sel = career.messages.find(m => m.id === ui.msgSel);
            const on = (a, fn) => { const b = el.querySelector(`[data-ma="${a}"]`); if (b) b.onclick = fn; };
            if (sel && sel.act) {
                on('sp-yes', () => { const r = MC().acceptSponsor(career, sel.act.ref); toast(r.ok ? 'Contratto firmato' : r.msg); save(true); renderHub(); });
                on('sp-no', () => { MC().rejectSponsor(career, sel.act.ref); save(true); renderHub(); });
                on('in-yes', () => answer(sel.act.ref, true));
                on('in-no', () => answer(sel.act.ref, false));
            }
        }
    };
    function sponsorPreview(offerId) {
        const o = career.sponsors.offers.find(x => x.id === offerId);
        if (!o) return '';
        const s = MC().sponsorById(o.sid);
        return `<div class="mg-sp-preview"><div class="mg-sp-logo"><img src="${esc(s.logo)}" alt="${esc(s.name)}"></div><div><b>${esc(s.name)}</b><small>${esc(s.sector)} • livello ${'★'.repeat(s.tier)}</small><b>${eur(o.monthly)}/mese</b></div></div>`;
    }

    window.Manager = {
        open() { ensureRoot(); showScreen('start'); },
        isMatchActive: () => matchActive,
        onUserMatchFinished,
        onUserMatchAbandoned
    };
})();
