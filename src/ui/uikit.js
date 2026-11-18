// --- src/ui/uikit.js ---
// Strumenti di interfaccia comuni a tutte le schermate (script classico, dopo lo script principale):
//
//  1. PAGINATORE  [data-pager="y"|"x"]: al posto delle barre di scorrimento mostra solo gli
//     elementi che entrano nel contenitore e aggiunge le frecce ▲▼ / ◀▶ con "pagina N di M".
//     Opzionale [data-pager-items="selettore"] per scegliere gli elementi da impaginare.
//  2. ADATTAMENTO  [data-fit]: una finestra più grande dello schermo viene rimpicciolita
//     (CSS zoom) quanto basta per entrare senza scroll. [data-fit="16"] = margine in px.
//  3. NAVIGAZIONE DA TASTIERA: nelle schermate di menu le frecce spostano il fuoco sul
//     controllo più vicino nella direzione premuta, Invio/Spazio lo attivano, Esc torna
//     indietro ([data-keyback]). Arrivati al bordo di una lista impaginata, la freccia
//     gira pagina. [data-focus] indica il controllo da selezionare per primo,
//     [data-keynav-own="x"|"y"|"xy"] lascia all'elemento la gestione di quelle frecce.
(function () {
    'use strict';

    const isVisible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';

    // =====================================================================
    // 1. PAGINATORE
    // =====================================================================
    const pagers = new Set();

    class Pager {
        constructor(container) {
            this.c = container;
            this.mode = container.dataset.pager;
            this.axis = this.mode === 'x' ? 'x' : 'y';
            this.page = 0;
            if (this.mode === 'auto') this.axis = 'y';
            this.pages = [[]];
            this.sig = '';
            container.classList.add('uk-paged');
            container._ukPager = this;
            const bar = document.createElement('div');
            bar.className = 'uk-pager is-' + this.axis;
            bar.innerHTML = `<button type="button" class="uk-pg-btn" data-pg="-1" aria-label="Pagina precedente">${this.axis === 'x' ? '◀' : '▲'}</button>
                <span class="uk-pg-label"></span>
                <button type="button" class="uk-pg-btn" data-pg="1" aria-label="Pagina successiva">${this.axis === 'x' ? '▶' : '▼'}</button>`;
            bar.addEventListener('click', e => {
                const b = e.target.closest('[data-pg]');
                if (b) { this.go(+b.dataset.pg); }
            });
            const where = container.dataset.pagerBar;
            if (where === 'inside') container.appendChild(bar);
            else container.insertAdjacentElement('afterend', bar);
            this.bar = bar;
            this.refresh(true);
        }
        items() {
            const sel = this.c.dataset.pagerItems;
            const list = sel ? Array.from(this.c.querySelectorAll(sel)) : Array.from(this.c.children);
            return list.filter(el => el !== this.bar && !el.classList.contains('uk-pager'));
        }
        // raggruppa gli elementi in righe (o colonne) e riempie le pagine finché c'è spazio
        refresh(force) {
            if (!this.c.isConnected) { this.destroy(); return; }
            if (!isVisible(this.c)) return;
            const items = this.items();
            const cr = this.c.getBoundingClientRect();
            const sig = `${Math.round(cr.width)}x${Math.round(cr.height)}|${items.length}`;
            if (!force && sig === this.sig) return;
            const keepFirst = this.pages[this.page] && this.pages[this.page][0];
            items.forEach(el => { el.style.display = ''; });
            if (this.mode === 'auto') this.setAxis(/row/.test(getComputedStyle(this.c).flexDirection) && getComputedStyle(this.c).display.includes('flex') ? 'x' : 'y');
            const y = this.axis === 'y';
            const cs = getComputedStyle(this.c);
            const padEnd = parseFloat(y ? cs.paddingBottom : cs.paddingRight) || 0;
            const rects = items.map(el => el.getBoundingClientRect());
            const rows = [];
            items.forEach((el, i) => {
                const r = rects[i];
                const start = y ? r.top : r.left, end = y ? r.bottom : r.right;
                if (r.width === 0 && r.height === 0) return;
                let row = rows.find(rw => Math.abs(rw.start - start) < 3);
                if (!row) { row = { start, end, els: [] }; rows.push(row); }
                row.end = Math.max(row.end, end);
                row.els.push(el);
            });
            rows.sort((a, b) => a.start - b.start);
            const pages = [];
            if (rows.length) {
                const avail = (y ? cr.bottom : cr.right) - padEnd - rows[0].start;
                let s = 0;
                while (s < rows.length) {
                    let e = s, acc = 0;
                    while (e < rows.length) {
                        const need = acc + (rows[e].end - rows[e].start);
                        if (need > avail + 1 && e > s) break;
                        acc += e + 1 < rows.length ? rows[e + 1].start - rows[e].start : 0;
                        e++;
                    }
                    pages.push(rows.slice(s, e).flatMap(r => r.els));
                    s = e;
                }
            }
            this.pages = pages.length ? pages : [[]];
            // resta sulla pagina che conteneva il primo elemento visibile
            let p = keepFirst ? this.pages.findIndex(pg => pg.includes(keepFirst)) : this.page;
            this.page = Math.max(0, Math.min(this.pages.length - 1, p < 0 ? this.page : p));
            this.apply();
            const cr2 = this.c.getBoundingClientRect();
            this.sig = `${Math.round(cr2.width)}x${Math.round(cr2.height)}|${items.length}`;
        }
        apply() {
            const show = new Set(this.pages[this.page]);
            this.items().forEach(el => { el.style.display = show.has(el) ? '' : 'none'; });
            const n = this.pages.length;
            this.bar.classList.toggle('is-off', n <= 1);
            this.bar.querySelector('.uk-pg-label').textContent = `${this.page + 1} / ${n}`;
            this.bar.querySelector('[data-pg="-1"]').disabled = this.page === 0;
            this.bar.querySelector('[data-pg="1"]').disabled = this.page >= n - 1;
        }
        setAxis(a) {
            if (a === this.axis) return;
            this.axis = a;
            this.bar.className = 'uk-pager is-' + a;
            this.bar.querySelector('[data-pg="-1"]').textContent = a === 'x' ? '◀' : '▲';
            this.bar.querySelector('[data-pg="1"]').textContent = a === 'x' ? '▶' : '▼';
        }
        canGo(d) { const p = this.page + d; return p >= 0 && p < this.pages.length; }
        go(d) {
            if (!this.canGo(d)) return false;
            this.page += d;
            this.apply();
            return true;
        }
        showItem(el) {
            const i = this.pages.findIndex(pg => pg.some(it => it === el || it.contains(el)));
            if (i >= 0 && i !== this.page) { this.page = i; this.apply(); }
        }
        destroy() { pagers.delete(this); if (this.bar && this.bar.isConnected) this.bar.remove(); }
    }

    function scanPagers(root) {
        (root || document).querySelectorAll('[data-pager]').forEach(c => {
            if (!c._ukPager) pagers.add(new Pager(c));
        });
    }

    // =====================================================================
    // 2. ADATTAMENTO ALLO SCHERMO
    // =====================================================================
    function fitAll() {
        document.querySelectorAll('[data-fit]').forEach(el => {
            if (!isVisible(el)) return;
            const parent = el.parentElement;
            const pad = parseFloat(el.dataset.fit) || 0;
            const pcs = getComputedStyle(parent);
            const availH = parent.clientHeight - (parseFloat(pcs.paddingTop) || 0) - (parseFloat(pcs.paddingBottom) || 0) - pad * 2;
            const availW = parent.clientWidth - (parseFloat(pcs.paddingLeft) || 0) - (parseFloat(pcs.paddingRight) || 0) - pad * 2;
            const prev = el.style.zoom;
            el.style.zoom = '';
            const h = el.offsetHeight, w = el.offsetWidth;
            let z = Math.min(1, availH / h, availW / w);
            if (!isFinite(z) || z <= 0) z = 1;
            z = Math.max(0.45, Math.floor(z * 100) / 100);
            el.style.zoom = z < 1 ? String(z) : '';
            if (prev !== el.style.zoom) pagers.forEach(p => { if (el.contains(p.c)) p.sig = ''; });
        });
    }

    // ciclo leggero: impagina ciò che è comparso, ricalcola dopo ridimensionamenti
    let lastScan = 0;
    function tick() {
        const now = performance.now();
        if (now - lastScan > 250) {
            lastScan = now;
            scanPagers();
            fitAll();
            pagers.forEach(p => p.refresh(false));
        }
        requestAnimationFrame(tick);
    }
    window.addEventListener('resize', () => { fitAll(); pagers.forEach(p => p.refresh(true)); });

    // =====================================================================
    // 3. NAVIGAZIONE DA TASTIERA
    // =====================================================================
    // livelli in ordine di priorità: vince il primo visibile
    const LAYERS = [
        { sel: '.cp-overlay' },
        { sel: '#match-stats-modal' },
        { sel: '#pg-overlay' },
        { sel: '#pb-panel' },
        { sel: '#pz-content', when: () => typeof gamePaused !== 'undefined' && gamePaused && typeof pausePage !== 'undefined' && !!pausePage, ownEsc: true },
        { sel: '#comp-root', ownEsc: true },
        { sel: '#mgr-root', ownEsc: true },
        { sel: '#start-screen' }
    ];
    const FOCUSABLE = 'button, [role="button"], a[href], input, select, [tabindex="0"]';

    function activeLayer() {
        if (typeof keyRebindAction !== 'undefined' && keyRebindAction) return null;
        const ff = document.getElementById('funfact-loader');
        if (ff && !ff.classList.contains('ff-hidden')) return null;
        for (const L of LAYERS) {
            if (L.when && !L.when()) continue;
            const els = Array.from(document.querySelectorAll(L.sel)).filter(el => isVisible(el) && !el.classList.contains('hidden') && !el.classList.contains('cp-hidden'));
            if (els.length) return { el: els[els.length - 1], cfg: L };
        }
        return null;
    }
    function focusables(layer) {
        return Array.from(layer.querySelectorAll(FOCUSABLE)).filter(el => {
            if (el.disabled || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('is-disabled') || el.classList.contains('is-locked')) return false;
            if (el.tabIndex < 0 && !el.matches('button, input, select, a[href]')) return false;
            if (el.closest('[aria-hidden="true"], .hidden, .uk-pager.is-off')) return false;
            if (!isVisible(el)) return false;
            const r = el.getBoundingClientRect();
            if (r.width < 2 || r.height < 2) return false;
            const pe = getComputedStyle(el).pointerEvents;
            return pe !== 'none';
        });
    }
    function initialFocus(layer, list) {
        const pick = sel => list.find(el => el.matches(sel));
        return pick('[data-focus]') || pick('.is-primary, .is-go') || list[0];
    }
    let ringEl = null;
    function setFocus(el) {
        if (!el) return;
        const pg = el.closest('.uk-paged');
        if (pg && pg._ukPager) pg._ukPager.showItem(el);
        try { el.focus({ preventScroll: true, focusVisible: true }); } catch (e) { el.focus(); }
        if (ringEl && ringEl !== el) ringEl.classList.remove('uk-focus');
        el.classList.add('uk-focus');
        ringEl = el;
    }
    // l'anello compare solo quando si usa la tastiera
    let kbMode = false;
    document.addEventListener('pointerdown', () => { kbMode = false; if (ringEl) { ringEl.classList.remove('uk-focus'); ringEl = null; } }, true);
    window.addEventListener('keydown', () => { kbMode = true; }, true);

    const DIRS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    function center(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    // candidato migliore nella direzione: vicino lungo l'asse, allineato sull'asse ortogonale
    function bestInDirection(from, list, dir) {
        const fr = from.getBoundingClientRect(), fc = center(fr);
        let best = null, bestScore = Infinity;
        for (const el of list) {
            if (el === from || el.contains(from) || from.contains(el)) continue;
            const r = el.getBoundingClientRect(), c = center(r);
            const dx = c.x - fc.x, dy = c.y - fc.y;
            const main = dir[0] ? dx * dir[0] : dy * dir[1];
            if (main <= 2) continue;
            // sovrapposizione sull'asse ortogonale: favorisce gli elementi "in linea"
            const overlap = dir[0]
                ? Math.min(r.bottom, fr.bottom) - Math.max(r.top, fr.top)
                : Math.min(r.right, fr.right) - Math.max(r.left, fr.left);
            const edge = dir[0]
                ? (dir[0] > 0 ? r.left - fr.right : fr.left - r.right)
                : (dir[1] > 0 ? r.top - fr.bottom : fr.top - r.bottom);
            const ortho = dir[0] ? Math.abs(dy) : Math.abs(dx);
            const score = Math.max(0, edge) + (overlap > 0 ? 0 : ortho * 2.2) + main * 0.1;
            if (score < bestScore) { bestScore = score; best = el; }
        }
        return best;
    }

    function onKey(e) {
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        const k = e.key;
        const isArrow = k in DIRS, isEnter = k === 'Enter' || k === ' ', isEsc = k === 'Escape';
        if (!isArrow && !isEnter && !isEsc) return;
        const L = activeLayer();
        if (!L) return;
        const layer = L.el;
        const list = focusables(layer);
        let cur = document.activeElement;
        const inLayer = cur && layer.contains(cur) && list.includes(cur);

        if (isEsc) {
            if (L.cfg.ownEsc) return;
            const back = list.filter(el => el.matches('[data-keyback]')).pop();   // il più specifico è l'ultimo
            if (back) { e.preventDefault(); e.stopImmediatePropagation(); back.click(); }
            return;
        }
        if (!inLayer) {
            const first = initialFocus(layer, list);
            if (!first) return;
            e.preventDefault(); e.stopImmediatePropagation();
            setFocus(first);
            return;
        }
        if (isEnter) {
            e.stopImmediatePropagation();          // il gioco non deve ricevere il tasto
            if (cur.matches('input[type="range"]')) { e.preventDefault(); return; }
            if (!cur.matches('button, a[href], input, select')) { e.preventDefault(); cur.click(); }
            else if (k === ' ' && cur.matches('a[href]')) { e.preventDefault(); cur.click(); }
            return;
        }
        // frecce
        const dir = DIRS[k];
        const own = cur.dataset.keynavOwn || '';
        if ((dir[0] && own.includes('x')) || (dir[1] && own.includes('y'))) return;   // la gestisce l'elemento stesso
        if (cur.matches('input[type="range"]') && dir[0]) { e.stopImmediatePropagation(); return; }   // regolazione nativa
        e.preventDefault(); e.stopImmediatePropagation();
        // lista impaginata: al bordo, nella direzione dell'impaginazione, si gira pagina
        const pg = cur.closest('.uk-paged');
        if (pg && pg._ukPager) {
            const P = pg._ukPager;
            const along = (P.axis === 'y' && dir[1]) || (P.axis === 'x' && dir[0]);
            const inside = list.filter(el => pg.contains(el));
            const nextInside = bestInDirection(cur, inside, dir);
            if (along && !nextInside && P.canGo(dir[0] || dir[1])) {
                P.go(dir[0] || dir[1]);
                const fresh = focusables(layer).filter(el => pg.contains(el));
                const target = (dir[0] || dir[1]) > 0 ? fresh[0] : fresh[fresh.length - 1];
                if (target) setFocus(target);
                return;
            }
        }
        const next = bestInDirection(cur, list, dir);
        if (next) setFocus(next);
    }
    window.addEventListener('keydown', onKey, true);
    // un clic con il mouse sposta anche il riferimento della tastiera
    document.addEventListener('focusin', e => {
        if (ringEl && e.target !== ringEl) { ringEl.classList.remove('uk-focus'); ringEl = null; }
        if (kbMode && e.target instanceof Element && e.target !== document.body) { e.target.classList.add('uk-focus'); ringEl = e.target; }
    });
    document.addEventListener('focusout', e => { if (e.target === ringEl) { ringEl.classList.remove('uk-focus'); ringEl = null; } });

    window.UIKit = { scanPagers, fitAll, refreshPagers: () => pagers.forEach(p => p.refresh(true)), focus: setFocus };
    requestAnimationFrame(tick);
})();
