// --- src/audio/Commentary.js ---
// Telecronaca della partita: voce sintetica (Web Speech API nel browser, TextToSpeech nativo
// nell'APK Android tramite window.HILNativeTTS) e sottotitoli in sovrimpressione.
//
// Script classico caricato dopo lo script principale di index.html: legge i suoi globali
// (gameState, gamePaused, skaters, puck, currentPuckCarrier, matchConfig, matchStats, ...).
// Il gioco gli segnala gli eventi puntuali con Commentary.event(tipo, dati) (tiro, parata, gol,
// passaggio, carica, palo, ...); tutto il resto (intro, inizio/fine periodo, rigori, possesso,
// contropiede, recuperi, momenti di calma) lo ricava da sé osservando lo stato ogni 150 ms.
//
// Le frasi stanno in src/audio/commentaryPhrases.js (italiano e inglese, molte varianti).
// Preferenze in localStorage ('hil_commentary'): attiva, lingua, volume, sottotitoli, loquacità, voce.
(function () {
    'use strict';

    const PREFS_KEY = 'hil_commentary';
    const P = () => window.COMMENTARY_PHRASES || { it: {}, en: {}, terms: { it: {}, en: {} } };

    // ================================================================== preferenze
    const settings = { enabled: true, lang: 'it', volume: 0.9, captions: true, chatter: 1, voice: { it: '', en: '' } };
    try {
        const s = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
        if (typeof s.enabled === 'boolean') settings.enabled = s.enabled;
        if (s.lang === 'it' || s.lang === 'en') settings.lang = s.lang;
        if (typeof s.volume === 'number') settings.volume = Math.max(0, Math.min(1, s.volume));
        if (typeof s.captions === 'boolean') settings.captions = s.captions;
        if ([0, 1, 2].includes(s.chatter)) settings.chatter = s.chatter;
        if (s.voice && typeof s.voice === 'object') settings.voice = Object.assign(settings.voice, s.voice);
    } catch (e) { /* preferenze di default */ }
    function savePrefs() {
        try { localStorage.setItem(PREFS_KEY, JSON.stringify(settings)); } catch (e) { /* storage non disponibile */ }
    }

    // ================================================================== utilità
    const now = () => performance.now() / 1000;
    const rnd = a => a[Math.floor(Math.random() * a.length)];
    const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
    const G = name => { try { return window.eval(name); } catch (e) { return undefined; } };   // globali let/const dello script principale
    // "LAGO" -> "Lago", "DE ROSSI" -> "De Rossi", "CUS VERONA" -> "Cus Verona"; sigle senza vocali restano maiuscole (HP, HC)
    function nice(s) {
        return String(s || '').trim().split(/\s+/).map(w => {
            if (w.length <= 3 && !/[aeiouyàèéìòù]/i.test(w)) return w.toUpperCase();
            return w.toLowerCase().replace(/(^|['\-.])(\S)/g, (m, a, b) => a + b.toUpperCase());
        }).join(' ');
    }
    function teamId(side) { const mc = G('matchConfig'); return mc ? (side === 'home' ? mc.homeClub : mc.guestClub) : null; }
    function club(side) { const R = G('CLUB_ROSTERS'); return R ? R[teamId(side)] : null; }
    function teamName(side) { const c = club(side); return c ? nice(c.shortName || c.name) : (side === 'home' ? 'Casa' : 'Ospiti'); }
    const other = side => (side === 'home' ? 'guest' : 'home');
    // scheda del giocatore in teams.json (per il genere)
    function rosterInfo(sk) {
        const c = sk && club(sk.team);
        if (!c) return null;
        const all = [c.goalie].concat(c.backupGoalies || [], ...(c.lines || []), c.reserves || []).filter(Boolean);
        return all.find(p => String(p.num) === String(sk.jerseyNum) && p.name === sk.playerName) || null;
    }
    const isFemale = sk => { const r = rosterInfo(sk); return !!(r && String(r.gender || '').toUpperCase() === 'F'); };
    function playerVars(sk, prefix = '') {
        if (!sk) return {};
        const f = isFemale(sk);
        const v = {};
        v[prefix + 'p'] = nice(sk.playerName);
        v[prefix + 'pf'] = nice([sk.firstName, sk.playerName].filter(Boolean).join(' '));
        v[prefix + 'n'] = sk.jerseyNum;
        if (!prefix) {
            v.t = teamName(sk.team); v.opp = teamName(other(sk.team));
            v.o = f ? 'a' : 'o'; v.lo = f ? 'la' : 'lo'; v.e = f ? 'essa' : 'e'; v.his = f ? 'her' : 'his'; v.him = f ? 'her' : 'him';
        }
        return v;
    }
    function goalieOf(side) { const S = G('skaters') || []; return S.find(s => s.team === side && s.isGoalie) || null; }
    function scoreVars() {
        const T = P().terms[settings.lang] || {};
        const h = G('scoreHome') || 0, g = G('scoreGuest') || 0;
        const lead = h > g ? 'home' : (g > h ? 'guest' : null);
        const hi = Math.max(h, g), lo = Math.min(h, g);
        // {score}: "2 a 1" (prima chi conduce) per le frasi che nominano già la squadra;
        // {scoreFull}: "2 a 1 per Cittadella" per quelle che non la nominano
        const score = lead ? (T.score ? T.score(hi, lo) : hi + '-' + lo) : (T.tie ? T.tie(h) : h + '-' + g);
        const scoreFull = lead ? `${score} ${settings.lang === 'it' ? 'per' : 'for'} ${teamName(lead)}` : score;
        return { sh: h, sg: g, home: teamName('home'), guest: teamName('guest'), lead: lead ? teamName(lead) : '', score, scoreFull };
    }
    function fill(tpl, vars) {
        return tpl.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : ''))
            .replace(/\s+([,.!?:])/g, '$1').replace(/\s{2,}/g, ' ').trim();
    }
    // un segnaposto con valore null esclude le varianti che lo usano (es. la città se è già nel nome del palazzetto)
    function usable(tpl, vars) {
        return !(tpl.match(/\{(\w+)\}/g) || []).some(m => vars[m.slice(1, -1)] === null);
    }

    // anti-ripetizione: per ogni chiave ricorda le ultime varianti usate
    const recent = {};
    function phrase(key, vars) {
        const bank = P()[settings.lang] || {};
        const list = bank[key] || (P().it || {})[key];
        if (!list || !list.length) return '';
        vars = vars || {};
        const used = recent[settings.lang + key] || (recent[settings.lang + key] = []);
        let ok = list.map((t, i) => i).filter(i => usable(list[i], vars));
        if (!ok.length) ok = list.map((t, i) => i);
        let cands = ok.filter(i => !used.includes(i));
        if (!cands.length) { used.length = 0; cands = ok; }
        const i = rnd(cands);
        used.push(i);
        while (used.length > Math.max(1, Math.floor(list.length * 0.6))) used.shift();
        return fill(list[i], vars || {});
    }
    const has = key => !!((P()[settings.lang] || {})[key] || []).length;

    // ================================================================== voce
    const synth = window.speechSynthesis || null;
    const native = () => {
        const n = window.HILNativeTTS;
        try { return n && typeof n.speak === 'function' && n.available() ? n : null; } catch (e) { return null; }
    };
    let voices = [];
    function loadVoices() { if (synth) try { voices = synth.getVoices() || []; } catch (e) { voices = []; } }
    if (synth) { loadVoices(); try { synth.addEventListener('voiceschanged', loadVoices); } catch (e) { synth.onvoiceschanged = loadVoices; } }
    const LANG_TAG = { it: 'it-IT', en: 'en-GB' };
    // voci maschili note (il telecronista "classico"), poi le più naturali
    const PREFERRED = {
        it: [/diego/i, /giuseppe/i, /benigno/i, /cosimo/i, /luca/i, /paolo/i, /\bitalian.*male/i, /google italiano/i, /isabella/i, /elsa/i],
        en: [/ryan/i, /guy\b/i, /george/i, /daniel/i, /thomas/i, /christopher/i, /eric/i, /david/i, /google uk english male/i, /mark/i, /alex/i]
    };
    function voicesFor(lang) {
        return voices.filter(v => (v.lang || '').toLowerCase().replace('_', '-').startsWith(lang));
    }
    function pickVoice(lang) {
        const list = voicesFor(lang);
        if (!list.length) return null;
        const chosen = settings.voice[lang] && list.find(v => v.name === settings.voice[lang]);
        if (chosen) return chosen;
        const score = v => {
            let s = 0;
            const i = PREFERRED[lang].findIndex(r => r.test(v.name));
            if (i >= 0) s += 40 - i * 2;
            if (/natural|online|neural|premium|enhanced/i.test(v.name)) s += 25;
            if ((v.lang || '').toLowerCase().replace('_', '-') === LANG_TAG[lang].toLowerCase()) s += 6;
            if (lang === 'en' && /en-us/i.test(v.lang)) s += 3;
            return s;
        };
        return list.slice().sort((a, b) => score(b) - score(a))[0];
    }
    function voiceAvailable() { return !!native() || (!!synth && voicesFor(settings.lang).length > 0); }

    // ================================================================== sottotitoli
    let capEl = null, capTxt = null, capHide = 0;
    function ensureCaption() {
        if (capEl) return;
        const css = document.createElement('style');
        css.textContent = `
#cmt-cap{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 22px);transform:translate(-50%,12px);z-index:16;max-width:min(760px,calc(100vw - 32px));display:flex;align-items:stretch;gap:0;font-family:'Oswald','Arial Narrow',sans-serif;color:#fff;opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;filter:drop-shadow(0 6px 18px rgba(0,0,0,.45))}
#cmt-cap.is-on{opacity:1;transform:translate(-50%,0)}
#cmt-cap .cmt-tag{display:flex;align-items:center;gap:6px;padding:6px 10px;background:var(--bx-gold,#f6b511);color:#0b1020;font-weight:700;font-size:11px;letter-spacing:.16em;text-transform:uppercase;border-radius:4px 0 0 4px;white-space:nowrap}
#cmt-cap .cmt-tag svg{width:14px;height:14px}
#cmt-cap .cmt-txt{padding:7px 14px;background:rgba(8,12,24,.86);border:1px solid rgba(255,255,255,.12);border-left:0;border-radius:0 4px 4px 0;font-size:16px;letter-spacing:.03em;line-height:1.3}
#cmt-cap.is-hot .cmt-tag{background:#ef4444;color:#fff}
#cmt-cap.is-hot .cmt-txt{font-weight:700;font-size:18px;text-transform:uppercase;letter-spacing:.06em}
#cmt-cap.is-calm .cmt-txt{font-style:italic;color:#dbe4f3}
@media (pointer:coarse){#cmt-cap{bottom:calc(env(safe-area-inset-bottom,0px) + 150px)}#cmt-cap .cmt-txt{font-size:14px}#cmt-cap.is-hot .cmt-txt{font-size:15px}}
@media (max-width:560px){#cmt-cap .cmt-tag span{display:none}}`;
        document.head.appendChild(css);
        capEl = document.createElement('div');
        capEl.id = 'cmt-cap';
        capEl.setAttribute('aria-live', 'polite');
        capEl.innerHTML = '<div class="cmt-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg><span></span></div><div class="cmt-txt"></div>';
        capTxt = capEl.querySelector('.cmt-txt');
        document.body.appendChild(capEl);
    }
    function showCaption(item) {
        if (!settings.captions) return;
        ensureCaption();
        clearTimeout(capHide);
        capEl.querySelector('.cmt-tag span').textContent = settings.lang === 'it' ? 'Telecronaca' : 'Commentary';
        capTxt.textContent = item.text;
        capEl.classList.toggle('is-hot', item.mood === 'hot');
        capEl.classList.toggle('is-calm', item.mood === 'calm');
        capEl.classList.add('is-on');
    }
    function hideCaption(delay = 1100) {
        if (!capEl) return;
        clearTimeout(capHide);
        capHide = setTimeout(() => capEl.classList.remove('is-on'), delay);
    }

    // ================================================================== coda di parlato
    // item: { text, prio (0 colore .. 3 gol), ttl (s), tag, mood: 'hot'|'calm'|'' , t }
    const queue = [];
    let current = null;          // item in riproduzione
    let speakId = 0;
    let lastEnd = 0;             // quando si è smesso di parlare (per le pause)
    const MOOD = { hot: { rate: 1.14, pitch: 1.12 }, calm: { rate: 0.98, pitch: 0.98 }, '': { rate: 1.06, pitch: 1.0 } };

    function enqueue(text, opts = {}) {
        if (!settings.enabled || !text) return null;
        const item = { text, prio: opts.prio || 0, ttl: opts.ttl === undefined ? 3 : opts.ttl, tag: opts.tag || '', mood: opts.mood || '', t: now() };
        if (item.prio >= 3) {                                   // gol e fine partita: si interrompe tutto
            for (let i = queue.length - 1; i >= 0; i--) if (queue[i].prio < 3) queue.splice(i, 1);
            if (current && current.prio < 3) interrupt();
        } else if (current && item.prio >= 2 && current.prio < item.prio && (current.prio < 2 || opts.cut)) {
            interrupt();                                       // l'azione ha la precedenza su chiacchiere e aneddoti
        }
        if (opts.front) queue.unshift(item); else queue.push(item);
        // la coda resta corta (la presentazione a parte): si butta la cosa meno importante e più vecchia
        while (queue.filter(q => q.tag !== 'intro').length > 4) {
            let k = -1;
            queue.forEach((q, i) => { if (q.tag !== 'intro' && (k < 0 || q.prio < queue[k].prio)) k = i; });
            queue.splice(k, 1);
        }
        pump();
        return item;
    }
    function dropTag(tag) { for (let i = queue.length - 1; i >= 0; i--) if (queue[i].tag === tag) queue.splice(i, 1); }
    function isBusy() { return !!current || queue.length > 0; }
    function interrupt() {
        current = null;
        speakId++;
        if (native()) try { native().stop(); } catch (e) { /* */ }
        if (synth) try { synth.cancel(); } catch (e) { /* */ }
    }
    function stopAll() {
        queue.length = 0;
        interrupt();
        hideCaption(0);
    }
    let pumpLock = false;
    function pump() {
        if (current || pumpLock || !settings.enabled) return;
        const t = now();
        while (queue.length && t - queue[0].t > queue[0].ttl) queue.shift();     // notizie ormai vecchie
        if (!queue.length) return;
        const item = queue.shift();
        current = item;
        item.started = t;
        const id = ++speakId;
        item.id = id;
        showCaption(item);
        const done = () => { if (current && current.id === id) finish(); };
        // durata stimata: rete di sicurezza se il motore non avvisa la fine (succede su alcuni browser)
        item.maxEnd = t + 1.2 + item.text.length / (13 * (MOOD[item.mood] || MOOD['']).rate);
        const m = MOOD[item.mood] || MOOD[''];
        const nat = native();
        if (nat) {
            try { nat.speak(String(id), item.text, LANG_TAG[settings.lang], m.rate, m.pitch, settings.volume); return; } catch (e) { /* passa al web */ }
        }
        if (!synth || !voicesFor(settings.lang).length || settings.volume <= 0) {
            item.captionOnly = true;                            // niente voce: solo sottotitolo, per il tempo di lettura
            item.maxEnd = t + 0.6 + item.text.length / 17;
            return;
        }
        try {
            const u = new SpeechSynthesisUtterance(item.text);
            const v = pickVoice(settings.lang);
            if (v) u.voice = v;
            u.lang = v ? v.lang : LANG_TAG[settings.lang];
            u.rate = m.rate; u.pitch = m.pitch; u.volume = settings.volume;
            u.onend = done;
            u.onerror = done;
            // Chrome: dopo cancel() uno speak immediato a volte si perde
            pumpLock = true;
            setTimeout(() => {
                pumpLock = false;
                if (!current || current.id !== id) return;
                try { if (synth.paused) synth.resume(); synth.speak(u); } catch (e) { done(); }
            }, 40);
        } catch (e) { item.captionOnly = true; }
    }
    function finish() {
        current = null;
        lastEnd = now();
        hideCaption(queue.length ? 300 : 1100);
        pump();
    }
    // callback del TextToSpeech nativo (Android)
    function nativeEvent(id, kind) {
        if (!current || String(current.id) !== String(id)) return;
        if (kind === 'end') finish();
        else if (kind === 'error') current.captionOnly = true;     // resta il sottotitolo per il tempo di lettura
    }

    // ================================================================== dati della partita
    let M = null;    // contesto della partita in corso (costruito all'intro)
    function buildMatch() {
        const A = G('ARENA_CATALOG') || {};
        const mc = G('matchConfig') || {};
        const arena = A[mc.arena] || {};
        const host = G('competitionHost') ? G('competitionHost')() : null;
        let ctx = null;
        try { ctx = host && host.matchContext ? host.matchContext() : null; } catch (e) { ctx = null; }
        const R = G('CLUB_RATINGS') || {};
        const arenaName = arena.shortTitle || nice(arena.name || '');
        const city = String(arena.location || '').split('•')[0].replace(/\(.*?\)/g, '').trim();
        M = {
            arena: arenaName,
            arenaFull: arenaName,
            // la città solo se non è già nel nome del palazzetto ("PalaHockey Cittadella di Cittadella")
            city: city && !arenaName.toLowerCase().includes(city.toLowerCase()) ? city : null,
            cap: parseInt(String(arena.capacity || '').replace(/\D/g, ''), 10) || 0,
            roof: arena.roof ? String(arena.roof).toLowerCase() : '',
            surface: arena.surface ? String(arena.surface).toLowerCase() : '',
            ctx,
            ratings: { home: R[mc.homeClub] || { off: 70, def: 70, goa: 70 }, guest: R[mc.guestClub] || { off: 70, def: 70, goa: 70 } },
            facts: [], factsUsed: new Set(),
            goalsBy: {}, maxDeficit: { home: 0, guest: 0 },
            lastMinuteSaid: {}, periodSaid: {}, finalSaid: false
        };
        M.facts = buildFacts();
        return M;
    }
    function topPlayers(side, n = 1) {
        const c = club(side);
        if (!c) return [];
        const list = [].concat(...(c.lines || [])).filter((p, i, a) => a.findIndex(q => q.num === p.num && q.name === p.name) === i);
        return list.slice().sort((a, b) => (b.pts || 0) - (a.pts || 0) || (b.g || 0) - (a.g || 0)).slice(0, n);
    }
    function infoVars(p, side) {
        return {
            pf: nice([p.first, p.name].filter(Boolean).join(' ')), p: nice(p.name), n: p.num, g: p.g || 0, pts: p.pts || 0,
            t: teamName(side), opp: teamName(other(side)), o: String(p.gender || '').toUpperCase() === 'F' ? 'a' : 'o'
        };
    }
    function ordVars(pos) {
        const T = P().terms[settings.lang] || {};
        const o = (T.ord || [])[pos - 1] || pos + '°';
        const of = (T.ordf || T.ord || [])[pos - 1] || pos + 'ª';
        return { ord: o, ordf: of };
    }
    function coachName(side) {
        const C = (G('TEAM_DATA') || {}).coaches || {};
        const c = C[teamId(side)];
        return c ? [c.first, c.last].filter(Boolean).join(' ') : '';
    }
    function streak(form) {
        if (!form || !form.length) return { kind: null, k: 0 };
        const last = form[form.length - 1];
        let k = 0;
        for (let i = form.length - 1; i >= 0 && form[i] === last; i--) k++;
        return { kind: last, k };
    }

    // aneddoti per i momenti di calma: funzioni che restituiscono [chiave, variabili] (o null se non applicabili)
    function buildFacts() {
        const f = [];
        const lang = settings.lang;
        ['home', 'guest'].forEach(side => {
            const tp = topPlayers(side, 2);
            tp.forEach(p => { if ((p.pts || 0) > 0) f.push({ id: 'top' + side + p.num, fn: () => ['fact.topScorer', infoVars(p, side)] }); });
            const coach = coachName(side);
            if (coach) f.push({ id: 'coach' + side, fn: () => ['fact.coach', { t: teamName(side), coach }] });
            const r = M.ratings[side], ro = M.ratings[other(side)];
            if (r.off >= 80 && r.off >= ro.off) f.push({ id: 'att' + side, fn: () => ['fact.attack', { t: teamName(side) }] });
            if (r.def >= 80 && r.def >= ro.def) f.push({ id: 'def' + side, fn: () => ['fact.defense', { t: teamName(side) }] });
            if (r.goa >= 80) f.push({ id: 'goa' + side, fn: () => { const g = goalieOf(side); return g ? ['fact.goalie', Object.assign(playerVars(g), { g: nice(g.playerName) })] : null; } });
            const c = club(side);
            const lg = c && (P().terms[lang].league || {})[c.league];
            if (lg && c.league !== teamId(side)) f.push({ id: 'lg' + side, fn: () => (M.ctx ? null : ['fact.league', { t: teamName(side), league: lg }]) });
            const ct = M.ctx && M.ctx.teams && M.ctx.teams[teamId(side)];
            if (ct && ct.pos) f.push({ id: 'st' + side, fn: () => ['fact.standing', Object.assign({ t: teamName(side), pts: ct.pts }, ordVars(ct.pos))] });
            const sk = ct && streak(ct.form);
            if (sk && sk.kind === 'W' && sk.k >= 3) f.push({ id: 'sk' + side, fn: () => ['fact.streak', { t: teamName(side), k: sk.k }] });
        });
        if (M.cap) f.push({ id: 'cap', fn: () => ['fact.capacity', { arena: M.arenaFull, cap: M.cap }] });
        if (lang === 'it' && M.roof) f.push({ id: 'roof', fn: () => ['fact.roof', { arena: M.arenaFull, roof: M.roof }] });
        if (lang === 'it' && M.surface) f.push({ id: 'surf', fn: () => ['fact.surface', { surface: M.surface }] });
        // regole e curiosità generali sull'in-line
        ((P()[lang] || {})['fact.inline'] || []).forEach((t, i) => f.push({ id: 'inl' + i, raw: t }));
        // "Lo sapevi che?" (solo in italiano): prima quelli che citano le squadre in campo
        if (lang === 'it' && Array.isArray(window.FUN_FACTS)) {
            const words = ['home', 'guest'].map(s => (club(s) ? String(club(s).shortName || club(s).name) : '').split(/\s+/)[0].toLowerCase()).filter(w => w.length > 3);
            window.FUN_FACTS.forEach((ff, i) => {
                const txt = shortFact(ff.text);
                if (!txt) return;
                const hit = words.some(w => (ff.title + ' ' + ff.text).toLowerCase().includes(w));
                f.push({ id: 'ff' + i, weight: hit ? 3 : 0.6, fn: () => ['fact.funfact', { fact: txt }] });
            });
        }
        return f;
    }
    // prime frasi di un aneddoto lungo, quanto basta per non superare ~260 caratteri
    function shortFact(text) {
        const s = String(text || '').replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+(\s|$)/g) || [];
        let out = '';
        for (const part of s) {
            if ((out + part).length > 260 && out) break;
            out += part;
        }
        return out.trim();
    }
    // statistiche della partita in corso, calcolate al momento
    function liveFact() {
        const st = G('matchStats') || {};
        const opts = [];
        const sh = st.homeShots || 0, sg = st.guestShots || 0;
        if (sh + sg >= 6 && Math.abs(sh - sg) >= 3) {
            const side = sh > sg ? 'home' : 'guest';
            opts.push(['fact.shots', { t: teamName(side), opp: teamName(other(side)), a: Math.max(sh, sg), b: Math.min(sh, sg) }]);
        }
        ['home', 'guest'].forEach(side => {
            const k = side === 'home' ? st.homeSaves : st.guestSaves;
            const g = goalieOf(side);
            if (g && k >= 5) opts.push(['fact.saves', Object.assign(playerVars(g), { g: nice(g.playerName), k })]);
        });
        const fh = st.homeFaceoffs || 0, fg = st.guestFaceoffs || 0;
        if (fh + fg >= 5 && Math.abs(fh - fg) >= 3) {
            const side = fh > fg ? 'home' : 'guest';
            opts.push(['fact.faceoffs', { t: teamName(side), a: Math.max(fh, fg), b: Math.min(fh, fg) }]);
        }
        Object.values(M.goalsBy).forEach(g => { if (g.k >= 2) opts.push(['fact.scorer', { pf: g.pf, k: g.k }]); });
        const sv = scoreVars();
        if (sv.sh + sv.sg === 0) opts.push(['fact.scoreless', {}]);
        else opts.push(['fact.score', sv]);
        const gt = G('gameTime') || 0;
        if (gt > 120) opts.push(['fact.time', { min: Math.round(gt / 60) }]);
        return opts.length ? rnd(opts) : null;
    }
    function nextFact() {
        if (!M) return null;
        // un aneddoto "da archivio" o una statistica della partita, alternando
        if (Math.random() < 0.4) { const lf = liveFact(); if (lf) return lf; }
        const pool = M.facts.filter(x => !M.factsUsed.has(x.id));
        if (!pool.length) { const lf = liveFact(); return lf; }
        let tot = pool.reduce((a, x) => a + (x.weight || 1), 0), r = Math.random() * tot;
        let pick = pool[0];
        for (const x of pool) { r -= (x.weight || 1); if (r <= 0) { pick = x; break; } }
        M.factsUsed.add(pick.id);
        if (pick.raw) return ['__raw', { text: pick.raw }];
        const res = pick.fn();
        return res || nextFact();
    }

    // ================================================================== presentazione della partita
    function introScript() {
        const lines = [];
        const add = (key, vars) => { const t = phrase(key, vars); if (t) lines.push(t); };
        const chat = settings.chatter;
        add('intro.welcome', { arena: M.arena, city: M.city });
        if (M.cap && chat >= 1 && Math.random() < 0.6) add('intro.capacity', { cap: M.cap });
        const sv = scoreVars();
        add('intro.match', { home: sv.home, guest: sv.guest });
        const ctx = M.ctx;
        const T = P().terms[settings.lang] || {};
        if (!ctx) {
            add('intro.friendly', {});
        } else {
            const comp = (T.comp || {})[ctx.league] || ctx.leagueName || '';
            if (ctx.kind === 'cup') {
                if (ctx.roundId === 'F') add('intro.cupFinal', {});
                else add('intro.cup', { stage: (T.stage || {})['C' + ctx.roundId] || '' });
            } else if (ctx.kind === 'playoff') {
                if (ctx.roundId === 'F') add('intro.final', { stage: (T.stage || {})[ctx.league === 'SERIE B' ? 'FB' : 'FA'] || '' });
                else add('intro.playoff', { comp, stage: (T.stage || {})[ctx.roundId] || '' });
                const s = ctx.series;
                if (s) {
                    const a = s.wins[teamId('home')] || 0, b = s.wins[teamId('guest')] || 0;
                    if (a + b === 0) add('intro.seriesStart', {});
                    else if (a === b) add('intro.seriesTied', { a, gn: s.game });
                    else { const side = a > b ? 'home' : 'guest'; add('intro.series', { t: teamName(side), opp: teamName(other(side)), a: Math.max(a, b), b: Math.min(a, b), gn: s.game }); }
                }
            } else {
                add('intro.league', { comp, round: ctx.round, rounds: ctx.rounds });
            }
            // classifica e forma (nella regular season)
            ['home', 'guest'].forEach(side => {
                const ct = ctx.teams && ctx.teams[teamId(side)];
                if (!ct) return;
                const t = teamName(side);
                if (ctx.kind === 'league' && ct.pos && ct.pg > 0) {
                    if (ct.pos === 1) add('intro.leader', { t, pts: ct.pts });
                    else if (ct.pos === ctx.total && ctx.total > 3) add('intro.last', { t });
                    else if (chat >= 1) add('intro.standing', Object.assign({ t, pts: ct.pts }, ordVars(ct.pos)));
                }
                const sk = streak(ct.form);
                if (sk.kind === 'W' && sk.k >= 2) add('intro.winStreak', { t, k: sk.k });
                else if (sk.kind === 'L' && sk.k >= 3) add('intro.loseStreak', { t, k: sk.k });
                else if (chat >= 2 && ct.form && ct.form.length >= 4) add('intro.form', { t, w: ct.form.filter(x => x === 'W').length, k: ct.form.length });
            });
        }
        // favorita sulla carta
        const rv = s => (M.ratings[s].off + M.ratings[s].def + M.ratings[s].goa) / 3;
        const d = rv('home') - rv('guest');
        if (Math.abs(d) >= 4) { const side = d > 0 ? 'home' : 'guest'; add('intro.favorite', { t: teamName(side), opp: teamName(other(side)) }); }
        else if (chat >= 1) add('intro.balanced', {});
        // giocatori da seguire
        ['home', 'guest'].forEach(side => {
            const p = topPlayers(side, 1)[0];
            if (!p) return;
            add((p.pts || 0) > 0 ? 'intro.topPlayer' : 'intro.topPlayerNoStats', infoVars(p, side));
        });
        const gh = goalieOf('home'), gg = goalieOf('guest');
        if (gh && gg) add('intro.goalies', { gh: nice([gh.firstName, gh.playerName].join(' ')), gg: nice([gg.firstName, gg.playerName].join(' ')), home: sv.home, guest: sv.guest });
        const ch = coachName('home'), cg = coachName('guest');
        if (chat >= 1 && ch && cg) add('intro.coaches', { ch, cg, home: sv.home, guest: sv.guest });
        const refs = G('referees') || [];
        if (chat >= 2 && refs[0] && refs[0].fullName) add('intro.referee', { ref: refs[0].fullName });
        add('intro.ready', {});
        return lines;
    }
    function startIntro() {
        stopAll();
        buildMatch();
        introScript().forEach((t, i) => enqueue(t, { prio: 1, ttl: 120, tag: 'intro', mood: i === 0 ? '' : 'calm' }));
    }

    // ================================================================== eventi dal gioco
    const cool = {};
    const ready = (k, sec) => { const t = now(); if (cool[k] && t - cool[k] < sec) return false; cool[k] = t; return true; };
    let lastShot = null;          // { s, team, t, power }
    let passChain = { team: null, n: 0, t: 0 };
    let lastRelease = 0;          // tiro o passaggio appena partito (per non scambiarlo per un recupero)
    const chatterK = () => [1.8, 1, 0.65][settings.chatter];

    function onEvent(type, d) {
        if (!settings.enabled || !M) return;
        const st = G('gameState');
        const t = now();
        switch (type) {
            case 'shot': {
                const s = d.shooter;
                if (!s) return;
                lastShot = { s, team: s.team, t, power: d.power || 0 };
                lastRelease = t;
                passChain = { team: null, n: 0, t: 0 };
                if (!ready('shot', 1.1)) return;
                let key = 'shot.generic';
                const lp = G('lastPassInfo');
                if (d.oneTimer && lp && lp.from && lp.from.team === s.team && lp.from !== s) key = 'shot.onetimer';
                else if ((d.power || 0) > 0.78) key = 'shot.power';
                else if (d.dist > 17) key = 'shot.long';
                else if (d.dist < 6.5) key = 'shot.close';
                const v = playerVars(s);
                if (key === 'shot.onetimer') v.p2 = nice(lp.from.playerName);
                // non si accodano tiri dietro altri tiri: o si dice subito, o niente
                if (current && current.tag === 'shot') return;
                dropTag('poss');
                enqueue(phrase(key, v), { prio: 2, ttl: 0.9, tag: 'shot', mood: key === 'shot.power' || key === 'shot.onetimer' ? 'hot' : '' });
                break;
            }
            case 'pass': {
                const s = d.from;
                if (!s) return;
                lastRelease = t;
                if (passChain.team === s.team && t - passChain.t < 5) passChain.n++;
                else passChain = { team: s.team, n: 1, t };
                passChain.t = t;
                if (passChain.n >= 4 && !isBusy() && ready('combo', 22 * chatterK())) {
                    enqueue(phrase('pass.combo', { t: teamName(s.team) }), { prio: 1, ttl: 1.5, tag: 'combo' });
                    passChain.n = 0;
                }
                break;
            }
            case 'save': {
                const g = d.goalie;
                if (!g || !lastShot || lastShot.team === g.team || t - lastShot.t > 2.2) return;
                const v = Object.assign(playerVars(g), { g: nice(g.playerName) });
                const big = (d.speed || 0) > 24 || lastShot.power > 0.8 || Math.random() < 0.18;
                lastShot = null;
                if (!ready('save', 1.0)) return;
                enqueue(phrase(big ? 'save.big' : 'save.generic', v), { prio: 2, ttl: 2.2, tag: 'save', mood: big ? 'hot' : '' });
                break;
            }
            case 'post': {
                if (!lastShot || t - lastShot.t > 2.5 || !ready('post', 2.5)) return;
                const g = goalieOf(d.side > 0 ? 'home' : 'guest');      // porta a z positiva: quella di casa
                dropTag('shot');
                enqueue(phrase('post', { g: g ? nice(g.playerName) : '' }), { prio: 2.5, ttl: 1.4, tag: 'post', mood: 'hot', cut: true });
                break;
            }
            case 'goal': goalCall(d); break;
            case 'hit': {
                const { checker, victim } = d;
                if (!checker || !victim || st !== 'playing') return;
                if ((d.speed || 0) < 6.5 && Math.random() < 0.6) return;
                if (isBusy() || !ready('hit', 11 * chatterK())) return;
                const v = Object.assign(playerVars(checker), { v: nice(victim.playerName) });
                enqueue(phrase('hit', v), { prio: 1, ttl: 1.2, tag: 'hit' });
                break;
            }
            case 'faceoff': {
                const s = d.skater;
                if (!s || !M) return;
                if (M.pendingPeriodStart) { M.pendingPeriodStart = false; return; }    // il via del periodo è già commentato
                if (isBusy() || Math.random() > 0.45 * (settings.chatter + 0.5) || !ready('faceoff', 12)) return;
                enqueue(phrase('faceoff.win', playerVars(s)), { prio: 1, ttl: 1.3, tag: 'faceoff' });
                break;
            }
            case 'lineChange': {
                if (st !== 'playing' || isBusy() || settings.chatter === 0 || !ready('line' + d.team, 25)) return;
                const T = P().terms[settings.lang] || {};
                enqueue(phrase('lineChange', { t: teamName(d.team), line: (T.line || [])[d.line] || d.line + 1 }), { prio: 0, ttl: 2, tag: 'line', mood: 'calm' });
                break;
            }
            case 'penaltyEnd': {
                if (d.reason === 'goal' || !ready('pend' + d.team, 4)) return;
                enqueue(phrase('penalty.end', { t: teamName(d.team) }), { prio: 1, ttl: 3, tag: 'pend' });
                break;
            }
            default: break;
        }
    }

    function goalCall(d) {
        const side = d.team;
        const s = d.scorer;
        const sv = scoreVars();
        const mine = side === 'home' ? sv.sh : sv.sg, theirs = side === 'home' ? sv.sg : sv.sh;
        const before = mine - 1 - theirs;                    // differenza reti prima di questo gol
        // per riconoscere le rimonte: il massimo svantaggio patito da ciascuna squadra
        M.maxDeficit[other(side)] = Math.max(M.maxDeficit[other(side)], mine - theirs);
        const v = Object.assign({}, s ? playerVars(s) : { t: teamName(side), opp: teamName(other(side)), p: teamName(side), pf: teamName(side), n: '' }, { score: sv.score, t: teamName(side) });
        const key = s ? side + '|' + s.jerseyNum + '|' + s.playerName : null;
        if (key) M.goalsBy[key] = { pf: v.pf, k: ((M.goalsBy[key] || {}).k || 0) + 1 };
        const k = key ? M.goalsBy[key].k : 1;
        lastShot = null;
        // 1) l'urlo + il marcatore
        const call = phrase('goal.call', v) + ' ' + phrase(s ? 'goal.scorer' : 'goal.goahead', v);
        enqueue(call, { prio: 3, ttl: 6, tag: 'goal', mood: 'hot' });
        // 2) la situazione
        const parts = [];
        if (d.golden) parts.push(phrase('goal.golden', v));
        else {
            if (mine === theirs) parts.push(phrase('goal.equalizer', v));
            else if (mine > theirs) {
                if (before === 0 && M.maxDeficit[side] >= 2) parts.push(phrase('goal.comeback', v));
                else if (before === 0 && mine === 1 && theirs === 0) parts.push(phrase('goal.first', v));
                else if (before === 0) parts.push(phrase('goal.goahead', v));
                else parts.push(phrase('goal.extend', v));
            } else parts.push(phrase('goal.closer', v));
            if (d.sit === 'PP') parts.push(phrase('goal.pp', v));
            else if (d.sit === 'PK') parts.push(phrase('goal.pk', v));
            if (k === 2) parts.push(phrase('goal.brace', v));
            else if (k === 3) parts.push(phrase('goal.hattrick', v));
            const gt = G('gameTime') || 999, per = G('currentPeriod') || 1, tot = G('TOTAL_PERIODS') || 2;
            if (per === tot && gt <= 45) parts.push(phrase('goal.late', v));
        }
        enqueue(parts.filter(Boolean).join(' '), { prio: 3, ttl: 9, tag: 'goal2', mood: 'hot' });
    }

    // ================================================================== osservazione dello stato
    let lastState = null, wasPaused = false;
    let poss = { s: null, team: null, t: 0, lastSeen: 0, said: 0 };
    let lastBreakaway = 0;
    function onStateChange(from, to) {
        if (!settings.enabled) return;
        if (to === 'menu' || to === 'lineup_loading') { stopAll(); if (to === 'menu') M = null; return; }
        if (to === 'logo_intro') { startIntro(); return; }
        if (!M && ['arena_tour', 'intro', 'faceoff', 'cutaway', 'playing'].includes(to)) buildMatch();
        if (!M) return;
        const per = G('currentPeriod') || 1, tot = G('TOTAL_PERIODS') || 2;
        if (to === 'faceoff' || to === 'cutaway') {
            const gt = G('gameTime'), full = per > tot ? G('OVERTIME_DURATION_SECONDS') : G('PERIOD_DURATION_SECONDS');
            if (gt === full && !M.periodSaid[per]) {
                M.periodSaid[per] = true;
                M.pendingPeriodStart = true;
                const sv = scoreVars();
                const key = per > tot ? 'period.startOT' : (per === 1 ? 'period.start1' : 'period.start2');
                // al primo periodo si accoda alla presentazione invece di interromperla
                enqueue(phrase(key, sv), { prio: per === 1 ? 1 : 2, ttl: per === 1 ? 25 : 8, tag: 'period', mood: per > tot ? 'hot' : '' });
            }
        }
        if (to === 'playing' && from !== 'playing') {
            dropTag('intro');                                   // la presentazione non serve più a disco in gioco
            if (current && current.tag === 'intro' && current.prio < 2) interrupt();
        }
        if (to === 'penalty_call') {
            const pc = G('penaltyCall');
            if (pc && pc.s) {
                const T = P().terms[settings.lang] || {};
                const v = Object.assign(playerVars(pc.s), { type: (T.penalty || {})[pc.type] || String(pc.type || '').toLowerCase() });
                const txt = phrase(pc.kind === 'expulsion' ? 'penalty.expulsion' : 'penalty.minor', v) + ' ' + phrase('penalty.pp', v);
                enqueue(txt, { prio: 2, ttl: 4, tag: 'penalty', cut: true });
            }
        }
        if (to === 'goalie_freeze') {
            const gf = G('goalieFreeze');
            if (gf && gf.g) {
                const recentSave = queue.some(q => q.tag === 'save');
                dropTag('save');
                if (recentSave || (current && current.tag === 'save') || ready('freeze', 6)) {
                    enqueue(phrase('save.freeze', Object.assign(playerVars(gf.g), { g: nice(gf.g.playerName) })), { prio: 2, ttl: 2.5, tag: 'freeze' });
                }
            }
        }
        if (to === 'replay' && from !== 'replay' && settings.chatter >= 1) {
            enqueue(phrase('replay', {}), { prio: 1, ttl: 6, tag: 'replay', mood: 'calm' });
        }
        if (to === 'period_break') {
            const sv = scoreVars();
            const st = G('matchStats') || {};
            const toOT = per >= tot;
            enqueue(phrase(toOT ? 'period.endOT' : 'period.end1', sv), { prio: 2, ttl: 8, tag: 'pend' });
            const a = st.homeShots || 0, b = st.guestShots || 0;
            if (settings.chatter >= 1 && a + b > 0) enqueue(phrase('period.shots', Object.assign({}, sv, { a, b, lead: teamName(a >= b ? 'home' : 'guest') })), { prio: 1, ttl: 20, tag: 'pbreak', mood: 'calm' });
            // durante la pausa: un paio di aneddoti
            for (let i = 0; i < settings.chatter; i++) { const f = nextFact(); if (f) enqueue(f[0] === '__raw' ? f[1].text : phrase(f[0], f[1]), { prio: 0, ttl: 40, tag: 'fact', mood: 'calm' }); }
        }
        if (to === 'postgame' && !M.finalSaid) {
            M.finalSaid = true;
            finalCall();
        }
        if (from === 'period_break' && to !== 'period_break') { dropTag('fact'); dropTag('pbreak'); }
    }
    function finalCall() {
        const sv = scoreVars();
        const so = G('matchShootout');
        const per = G('currentPeriod') || 1, tot = G('TOTAL_PERIODS') || 2;
        let w = sv.sh > sv.sg ? 'home' : (sv.sg > sv.sh ? 'guest' : null);
        if (!w && so) w = so.winner === 'home' ? 'home' : 'guest';
        const v = Object.assign({}, sv, w ? { w: teamName(w), l: teamName(other(w)) } : {});
        const parts = [];
        if (!w) parts.push(phrase('final.draw', v));
        else if (so) parts.push(phrase('final.winSO', v));
        else if (per > tot) parts.push(phrase('final.winOT', v));
        else parts.push(phrase('final.win', v));
        enqueue(parts.join(' '), { prio: 3, ttl: 12, tag: 'final', mood: 'hot' });
        const mvp = window.Ceremony && window.Ceremony.getMvp ? window.Ceremony.getMvp() : null;
        if (mvp && mvp.name) enqueue(phrase('final.mvp', { pf: nice(mvp.name) }), { prio: 2, ttl: 20, tag: 'final2' });
        enqueue(phrase('final.bye', {}), { prio: 1, ttl: 30, tag: 'final3', mood: 'calm' });
    }

    // gioco in corso: possesso, recuperi, contropiede, ultimo minuto, aneddoti nelle fasi tranquille
    function livePlay() {
        const t = now();
        const carrier = (G('carrierHoldTimer') || 0) > 0 ? G('currentPuckCarrier') : null;
        const pk = G('puck');
        const goalZ = G('goalOffsetZ') || 20;
        if (carrier && !carrier.isGoalie) {
            if (poss.s !== carrier) {
                // cambio di squadra senza un tiro/passaggio appena partito: recupero
                if (poss.team && poss.team !== carrier.team && t - poss.lastSeen < 1.2 && t - lastRelease > 0.7 && t - poss.t > 0.8) {
                    passChain = { team: null, n: 0, t: 0 };
                    if (!isBusy() && ready('steal', 10 * chatterK())) enqueue(phrase('steal', playerVars(carrier)), { prio: 1, ttl: 1.1, tag: 'steal' });
                }
                poss = { s: carrier, team: carrier.team, t, lastSeen: t, said: poss.s && poss.s.team === carrier.team ? poss.said : 0 };
            }
            poss.lastSeen = t;
            // contropiede: verso la porta avversaria con nessun difensore tra sé e il portiere
            const dir = carrier.team === 'home' ? -1 : 1;
            const z = carrier.mesh.position.z, x = carrier.mesh.position.x;
            const toGoal = (dir * goalZ - z) * dir;            // distanza dalla porta avversaria, positiva se davanti
            const speedTo = carrier.velocity ? carrier.velocity.z * dir : 0;
            if (toGoal < 17 && toGoal > 3 && speedTo > 5 && t - lastBreakaway > 14) {
                const S = G('skaters') || [];
                const defenders = S.filter(o => o.team !== carrier.team && o.onIce && !o.isGoalie && (o.mesh.position.z - z) * dir > -0.5 && Math.hypot(o.mesh.position.x - x, o.mesh.position.z - z) < 9);
                if (!defenders.length) {
                    lastBreakaway = t;
                    dropTag('poss'); dropTag('fact');
                    enqueue(phrase('breakaway', playerVars(carrier)), { prio: 2, ttl: 1.2, tag: 'breakaway', mood: 'hot' });
                }
            }
            // chiacchiera sul possesso quando non succede niente da qualche secondo
            const quiet = t - Math.max(lastEnd, poss.said);
            if (!poss.spoken && !isBusy() && settings.chatter > 0 && t - poss.t > 0.9 && quiet > [99, 6.5, 4][settings.chatter] && Math.random() < 0.5) {
                poss.said = t;
                poss.spoken = true;                            // una volta per portatore: niente "Pace... Pace... Pace"
                const attacking = dir * z > goalZ * 0.25;
                const defending = dir * z < -goalZ * 0.35;
                const key = attacking ? 'possession.attack' : (defending ? 'possession.defense' : 'possession.carry');
                enqueue(phrase(key, playerVars(carrier)), { prio: 0, ttl: 0.8, tag: 'poss' });
            }
        } else if (carrier && carrier.isGoalie) {
            // il portiere ha il disco: chi lo raccoglie dopo è un compagno, non un "recupero"
            if (poss.s !== carrier) poss = { s: carrier, team: carrier.team, t, lastSeen: t, said: poss.said };
            poss.lastSeen = t;
        }

        // ultimo minuto del periodo
        const gt = G('gameTime'), per = G('currentPeriod') || 1, tot = G('TOTAL_PERIODS') || 2;
        if (gt === 60 && !M.lastMinuteSaid[per] && per <= tot) {
            M.lastMinuteSaid[per] = true;
            const sv = scoreVars();
            const close = per === tot && Math.abs(sv.sh - sv.sg) <= 1;
            enqueue(phrase(close ? 'period.lastMinuteClose' : 'period.lastMinute', sv), { prio: 2, ttl: 3, tag: 'lastmin', mood: close ? 'hot' : '' });
        }

        // momento tranquillo: aneddoto o statistica
        const idleGap = [40, 17, 11][settings.chatter];
        const calm = !lastShot || t - lastShot.t > 5;
        const deep = pk ? Math.abs(pk.position.z) > goalZ * 0.6 : false;            // vicino a una porta: meglio non distrarsi
        if (calm && !deep && !isBusy() && t - lastEnd > idleGap && t - (cool.fact || 0) > idleGap) {
            cool.fact = t;
            const f = nextFact();
            if (f) enqueue(f[0] === '__raw' ? f[1].text : phrase(f[0], f[1]), { prio: 0, ttl: 1.5, tag: 'fact', mood: 'calm' });
        }
    }

    function tick() {
        const t = now();
        const st = G('gameState');
        if (st === undefined) return;
        const previewing = current && current.tag === 'preview';
        if (!settings.enabled) { if ((current || queue.length) && !previewing) stopAll(); lastState = st; if (previewing && t > current.maxEnd + 4) finish(); return; }
        const paused = !!G('gamePaused');
        if (paused) {
            if (!wasPaused) { wasPaused = true; stopAll(); }
            return;
        }
        if (wasPaused) { wasPaused = false; lastEnd = t; }
        if (st !== lastState) { const prev = lastState; lastState = st; onStateChange(prev, st); }
        if (st === 'playing' && M) livePlay();
        // rete di sicurezza: fine del parlato non segnalata, o solo sottotitoli
        if (current && t > current.maxEnd + (current.captionOnly ? 0 : 4)) {
            if (!current.captionOnly && synth) try { synth.cancel(); } catch (e) { /* */ }
            finish();
        }
        if (!current) pump();
    }
    setInterval(tick, 150);
    // Chrome desktop interrompe le frasi lunghe dopo ~15 s se non si "sveglia" il motore
    setInterval(() => { if (synth && current && !current.captionOnly && synth.speaking && !synth.paused) { try { synth.pause(); synth.resume(); } catch (e) { /* */ } } }, 10000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopAll(); });

    // ================================================================== API pubblica
    window.Commentary = {
        event: (type, data) => { try { onEvent(type, data || {}); } catch (e) { console.warn('[telecronaca]', e); } },
        settings,
        setEnabled(on) { settings.enabled = !!on; savePrefs(); if (!on) stopAll(); else if (!M && G('gameState') !== 'menu') buildMatch(); },
        setLang(l) {
            if (l !== 'it' && l !== 'en') return;
            settings.lang = l; savePrefs(); stopAll();
            if (M) M.facts = buildFacts();
        },
        setVolume(v) { settings.volume = Math.max(0, Math.min(1, +v || 0)); savePrefs(); },
        setCaptions(on) { settings.captions = !!on; savePrefs(); if (!on) hideCaption(0); },
        setChatter(n) { if ([0, 1, 2].includes(+n)) { settings.chatter = +n; savePrefs(); } },
        // voci disponibili per la lingua scelta (vuoto su Android: usa il motore di sistema)
        voices: () => voicesFor(settings.lang).map(v => v.name),
        currentVoice: () => { if (native()) return settings.lang === 'it' ? 'Voce di sistema' : 'System voice'; const v = pickVoice(settings.lang); return v ? v.name : ''; },
        cycleVoice() {
            const list = voicesFor(settings.lang);
            if (!list.length) return '';
            const cur = pickVoice(settings.lang);
            const i = list.indexOf(cur);
            settings.voice[settings.lang] = list[(i + 1) % list.length].name;
            savePrefs();
            return settings.voice[settings.lang];
        },
        voiceAvailable,
        // anteprima dalle opzioni
        preview() {
            const was = settings.enabled;
            settings.enabled = true;
            stopAll();
            const sample = settings.lang === 'it'
                ? rnd(['Tira Lago! Parata di Bortoli!', 'GOOOL! Lo firma Baldan, numero 10!', 'Buonasera a tutti e benvenuti al PalaHockey!'])
                : rnd(['Lago shoots! Saved by Bortoli!', 'GOAL! It\'s Baldan, number 10!', 'Good evening and welcome to the rink!']);
            enqueue(sample, { prio: 3, ttl: 5, tag: 'preview', mood: sample.includes('GO') ? 'hot' : '' });
            settings.enabled = was;
        },
        stop: stopAll,
        _nativeEvent: nativeEvent
    };
})();
