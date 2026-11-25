// --- src/i18n/i18n.js ---
// Lingue dell'interfaccia: italiano (lingua di partenza, quella scritta nel codice) e inglese.
// Script classico caricato nell'<head> prima di tutto il resto; i dizionari sono in src/i18n/en/*.js.
//
// COME FUNZIONA
//  - Il testo italiano resta nel codice e fa da chiave: src/i18n/en/*.js associa a ogni frase italiana
//    la traduzione inglese (I18N.add('en', { 'Torna al menu': 'Back to menu', ... })).
//  - Testi fissi (markup, textContent, innerHTML senza parti variabili): li traduce da solo un
//    MutationObserver su tutta la pagina, anche quando il codice li aggiunge dopo. Confronta il testo
//    di ogni nodo (spazi compattati) con le voci del dizionario; vale anche per title, aria-label,
//    placeholder, alt e data-tag. Gli elementi con translate="no" (o dentro uno) restano come sono.
//  - Testi con parti variabili: _t('Casa • {0}', nome) oppure _t('Gol di {name}', { name }).
//    In italiano _t() si limita a sostituire i segnaposto.
//  - Testi disegnati su canvas o letti dal codice: sempre con _t().
//  - Cambio lingua: I18N.setLang('en') ritraduce subito la pagina (anche all'indietro, verso l'italiano)
//    e manda l'evento 'hil:lang' sulla finestra, per le schermate che vanno ridisegnate.
//
// Lingua al primo avvio: quella del dispositivo (italiano se inizia per "it", altrimenti inglese),
// poi quella scelta nelle opzioni (localStorage 'hil_lang').
(function () {
    'use strict';
    const STORE = 'hil_lang';
    const LANGS = ['it', 'en'];
    const ATTRS = ['title', 'aria-label', 'placeholder', 'alt', 'data-tag'];
    const norm = s => String(s).replace(/\s+/g, ' ').trim();

    function detect() {
        try {
            const s = localStorage.getItem(STORE);
            if (LANGS.includes(s)) return { lang: s, stored: true };
        } catch (e) {}
        const list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'it']);
        const first = String(list[0] || 'it').toLowerCase();
        return { lang: first.startsWith('it') ? 'it' : 'en', stored: false };
    }
    const det = detect();
    let lang = det.lang;
    const firstRun = !det.stored;
    const toEn = new Map();          // italiano (normalizzato) -> inglese
    const toIt = new Map();          // inglese (normalizzato) -> italiano, per tornare indietro

    function add(code, entries) {
        if (code !== 'en') return;
        Object.keys(entries).forEach(k => {
            const it = norm(k), en = entries[k];
            if (!it || typeof en !== 'string') return;
            toEn.set(it, en);
            const ne = norm(en);
            if (ne && !toIt.has(ne)) toIt.set(ne, k);
        });
    }

    function fill(s, args) {
        if (!args.length) return s;
        const named = args.length === 1 && args[0] && typeof args[0] === 'object';
        return s.replace(/\{(\w+)\}/g, (m, k) => {
            const v = named ? args[0][k] : args[+k];
            return v === undefined || v === null ? m : String(v);
        });
    }
    // t('frase italiana con {0}', valore) → frase nella lingua attiva
    function t(it, ...args) {
        let s = String(it);
        if (lang === 'en') {
            const en = toEn.get(norm(s));
            if (en !== undefined) s = en;
        }
        return fill(s, args);
    }
    // ordinale: 1° / 1st, 2° / 2nd, 3° / 3rd, 11° / 11th ...
    function ord(n) {
        n = Math.round(+n);
        if (lang !== 'en') return n + '°';
        const t10 = n % 10, t100 = n % 100;
        return n + (t100 >= 11 && t100 <= 13 ? 'th' : t10 === 1 ? 'st' : t10 === 2 ? 'nd' : t10 === 3 ? 'rd' : 'th');
    }
    // valore da un oggetto { it, en } (dati scritti già nelle due lingue)
    function pick(o) { return o && typeof o === 'object' ? (o[lang] !== undefined ? o[lang] : o.it) : o; }

    // ------------------------------------------------------------------ traduzione della pagina
    function lookup(text) {
        const k = norm(text);
        if (!k || k.length < 2) return null;
        if (lang === 'en') return toEn.has(k) ? toEn.get(k) : null;
        return toIt.has(k) ? toIt.get(k) : null;
    }
    function skip(el) {
        for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
            const tag = e.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'CODE') return true;
            if (e.getAttribute('translate') === 'no') return true;
        }
        return false;
    }
    let busy = false;
    function doText(node) {
        const v = node.nodeValue;
        if (!v || !/[A-Za-zÀ-ÿ]/.test(v)) return;
        if (skip(node.parentElement)) return;
        const tr = lookup(v);
        if (tr === null || norm(tr) === norm(v)) return;
        const lead = v.match(/^\s*/)[0], trail = v.match(/\s*$/)[0];
        node.nodeValue = lead + tr + trail;
    }
    function doAttrs(el) {
        for (let i = 0; i < ATTRS.length; i++) {
            const a = ATTRS[i];
            const v = el.getAttribute(a);
            if (!v) continue;
            const tr = lookup(v);
            if (tr !== null && tr !== v) el.setAttribute(a, tr);
        }
    }
    function walk(root) {
        if (!root) return;
        if (root.nodeType === 3) { doText(root); return; }
        if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
        if (root.nodeType === 1) {
            if (skip(root)) return;
            doAttrs(root);
        }
        const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode: n => (n.nodeType === 1 && (n.tagName === 'SCRIPT' || n.tagName === 'STYLE' || n.getAttribute('translate') === 'no'))
                ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
        });
        let n;
        while ((n = tw.nextNode())) {
            if (n.nodeType === 3) doText(n); else doAttrs(n);
        }
    }
    function translatePage() {
        busy = true;
        try {
            walk(document.documentElement);
            document.title = t('HIL 2026 - Hockey in line');
        } finally { busy = false; }
    }
    let observer = null;
    function start() {
        if (observer) return;
        document.documentElement.lang = lang;
        observer = new MutationObserver(list => {
            if (busy) return;
            busy = true;
            try {
                for (let i = 0; i < list.length; i++) {
                    const m = list[i];
                    if (m.type === 'characterData') doText(m.target);
                    else if (m.type === 'attributes') { if (m.target.nodeType === 1 && !skip(m.target)) doAttrs(m.target); }
                    else for (let j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
                }
            } finally { busy = false; }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
        // quello che il parser ha già inserito prima dell'avvio
        translatePage();
    }

    function setLang(l) {
        if (!LANGS.includes(l)) return;
        try { localStorage.setItem(STORE, l); } catch (e) {}
        if (l === lang) return;
        lang = l;
        document.documentElement.lang = l;
        translatePage();
        window.dispatchEvent(new CustomEvent('hil:lang', { detail: { lang: l } }));
    }

    window.I18N = {
        get lang() { return lang; },
        get locale() { return lang === 'en' ? 'en-GB' : 'it-IT'; },   // per toLocaleDateString / toLocaleString
        ord,
        firstRun,                      // true se la lingua è stata appena rilevata dal dispositivo
        langs: LANGS,
        add, t, pick, setLang, start,
        translate: walk,               // ritraduce un pezzo di pagina (di solito non serve: c'è l'osservatore)
        has: it => toEn.has(norm(it))
    };
    // scorciatoia globale (nel codice "t" è spesso una variabile locale: per questo _t)
    window._t = t;
})();
