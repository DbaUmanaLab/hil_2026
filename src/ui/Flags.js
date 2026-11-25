// --- src/ui/Flags.js ---
// Bandiere delle nazioni disegnate in SVG (nessuna immagine da caricare) per i menu e le
// sovrimpressioni: nazionalità dei giocatori e nazione delle squadre.
// Codici ISO 3166-1 alpha-2 (IT, FR, ES, ...). Uso: HIL_FLAGS.html('IT') -> <span class="hil-flag">...</span>
(function () {
    'use strict';
    const W = 30, H = 20;
    const rect = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
    const vert = cs => cs.map((c, i) => rect(i * W / cs.length, 0, W / cs.length + 0.05, H, c)).join('');
    const horiz = (cs, weights) => {
        const ws = weights || cs.map(() => 1);
        const tot = ws.reduce((a, b) => a + b, 0);
        let y = 0;
        return cs.map((c, i) => { const h = H * ws[i] / tot; const r = rect(0, y, W, h + 0.05, c); y += h; return r; }).join('');
    };
    const nordic = (bg, cross, inner) => rect(0, 0, W, H, bg) + rect(8, 0, 5, H, cross) + rect(0, 7.5, W, 5, cross)
        + (inner ? rect(9.25, 0, 2.5, H, inner) + rect(0, 8.75, W, 2.5, inner) : '');
    const star = (cx, cy, r, c) => {
        const pts = [];
        for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.4 : r;
            pts.push((cx + Math.cos(a) * rr).toFixed(2) + ',' + (cy + Math.sin(a) * rr).toFixed(2));
        }
        return `<polygon points="${pts.join(' ')}" fill="${c}"/>`;
    };

    const FLAGS = {
        IT: { name: 'Italia', svg: () => vert(['#009246', '#ffffff', '#ce2b37']) },
        FR: { name: 'Francia', svg: () => vert(['#0055a4', '#ffffff', '#ef4135']) },
        ES: { name: 'Spagna', svg: () => horiz(['#aa151b', '#f1bf00', '#aa151b'], [1, 2, 1]) + rect(6, 7.5, 3.5, 5, '#aa151b') },
        PT: { name: 'Portogallo', svg: () => rect(0, 0, W, H, '#da291c') + rect(0, 0, 12, H, '#046a38') + '<circle cx="12" cy="10" r="4" fill="#ffe900"/><circle cx="12" cy="10" r="2.4" fill="#da291c"/>' },
        CH: { name: 'Svizzera', svg: () => rect(0, 0, W, H, '#da291c') + rect(13, 4, 4, 12, '#fff') + rect(9, 8, 12, 4, '#fff') },
        DE: { name: 'Germania', svg: () => horiz(['#000000', '#dd0000', '#ffce00']) },
        AT: { name: 'Austria', svg: () => horiz(['#ed2939', '#ffffff', '#ed2939']) },
        NL: { name: 'Paesi Bassi', svg: () => horiz(['#ae1c28', '#ffffff', '#21468b']) },
        BE: { name: 'Belgio', svg: () => vert(['#000000', '#fdda24', '#ef3340']) },
        IE: { name: 'Irlanda', svg: () => vert(['#169b62', '#ffffff', '#ff883e']) },
        GB: { name: 'Regno Unito', svg: () => rect(0, 0, W, H, '#012169')
            + '<path d="M0,0L30,20M30,0L0,20" stroke="#fff" stroke-width="4"/><path d="M0,0L30,20M30,0L0,20" stroke="#c8102e" stroke-width="1.5"/>'
            + rect(12, 0, 6, H, '#fff') + rect(0, 7, W, 6, '#fff') + rect(13.25, 0, 3.5, H, '#c8102e') + rect(0, 8.25, W, 3.5, '#c8102e') },
        SE: { name: 'Svezia', svg: () => nordic('#006aa7', '#fecc00') },
        FI: { name: 'Finlandia', svg: () => nordic('#ffffff', '#002f6c') },
        DK: { name: 'Danimarca', svg: () => nordic('#c8102e', '#ffffff') },
        NO: { name: 'Norvegia', svg: () => nordic('#ba0c2f', '#ffffff', '#00205b') },
        PL: { name: 'Polonia', svg: () => horiz(['#ffffff', '#dc143c']) },
        CZ: { name: 'Repubblica Ceca', svg: () => horiz(['#ffffff', '#d7141a']) + '<polygon points="0,0 15,10 0,20" fill="#11457e"/>' },
        SK: { name: 'Slovacchia', svg: () => horiz(['#ffffff', '#0b4ea2', '#ee1c25']) },
        SI: { name: 'Slovenia', svg: () => horiz(['#ffffff', '#0000ff', '#ff0000']) },
        HR: { name: 'Croazia', svg: () => horiz(['#ff0000', '#ffffff', '#171796']) },
        HU: { name: 'Ungheria', svg: () => horiz(['#ce2939', '#ffffff', '#477050']) },
        ZA: { name: 'Sudafrica', svg: () => rect(0, 0, W, H / 2, '#e03c31') + rect(0, H / 2, W, H / 2, '#001489')
            + `<polygon points="0,0 ${W * 0.2},0 ${W * 0.53},${H * 0.375} ${W},${H * 0.375} ${W},${H * 0.625} ${W * 0.53},${H * 0.625} ${W * 0.2},${H} 0,${H}" fill="#ffffff"/>`
            + `<polygon points="0,${H * 0.075} ${W * 0.14},${H * 0.075} ${W * 0.49},${H * 0.45} ${W},${H * 0.45} ${W},${H * 0.55} ${W * 0.49},${H * 0.55} ${W * 0.14},${H * 0.925} 0,${H * 0.925}" fill="#007749"/>`
            + `<polygon points="0,${H * 0.175} ${W * 0.3},${H / 2} 0,${H * 0.825}" fill="#ffb81c"/>`
            + `<polygon points="0,${H * 0.25} ${W * 0.23},${H / 2} 0,${H * 0.75}" fill="#000000"/>` },
        RO: { name: 'Romania', svg: () => vert(['#002b7f', '#fcd116', '#ce1126']) },
        RU: { name: 'Russia', svg: () => horiz(['#ffffff', '#0039a6', '#d52b1e']) },
        UA: { name: 'Ucraina', svg: () => horiz(['#0057b7', '#ffd700']) },
        US: { name: 'Stati Uniti', svg: () => horiz(Array.from({ length: 13 }, (_, i) => i % 2 ? '#ffffff' : '#b22234')) + rect(0, 0, 12, 10.77, '#3c3b6e') },
        CA: { name: 'Canada', svg: () => rect(0, 0, W, H, '#fff') + rect(0, 0, 7.5, H, '#d80621') + rect(22.5, 0, 7.5, H, '#d80621')
            + '<path d="M15,4l1.2,2.4 1.6-.6-.5,3.4 2-1.6.6,1.3 1.8-.3-.7,2.2.8.5-3.4,2.6.4,1.3-3.2-.4V17.5h-1.2V14.6l-3.2.4.4-1.3-3.4-2.6.8-.5-.7-2.2 1.8.3.6-1.3 2,1.6-.5-3.4 1.6.6z" fill="#d80621"/>' },
        MX: { name: 'Messico', svg: () => vert(['#006847', '#ffffff', '#ce1126']) + '<circle cx="15" cy="10" r="2.2" fill="#8c5a2b"/>' },
        AR: { name: 'Argentina', svg: () => horiz(['#74acdf', '#ffffff', '#74acdf']) + '<circle cx="15" cy="10" r="2" fill="#f6b40e"/>' },
        BR: { name: 'Brasile', svg: () => rect(0, 0, W, H, '#009c3b') + '<polygon points="15,2.5 27,10 15,17.5 3,10" fill="#ffdf00"/><circle cx="15" cy="10" r="4.2" fill="#002776"/>' },
        CL: { name: 'Cile', svg: () => horiz(['#ffffff', '#d52b1e']) + rect(0, 0, 10, 10, '#0039a6') + star(5, 5, 2.8, '#ffffff') },
        CO: { name: 'Colombia', svg: () => horiz(['#fcd116', '#003893', '#ce1126'], [2, 1, 1]) },
        VE: { name: 'Venezuela', svg: () => horiz(['#ffcc00', '#00247d', '#cf142b']) },
        AU: { name: 'Australia', svg: () => rect(0, 0, W, H, '#012169') + star(22, 12, 2.4, '#fff') + star(8, 15, 2.6, '#fff')
            + '<g transform="scale(.5)">' + rect(12, 0, 6, H, '#fff') + rect(0, 7, W, 6, '#fff') + rect(13.25, 0, 3.5, H, '#c8102e') + rect(0, 8.25, W, 3.5, '#c8102e') + '</g>' },
        JP: { name: 'Giappone', svg: () => rect(0, 0, W, H, '#ffffff') + '<circle cx="15" cy="10" r="6" fill="#bc002d"/>' },
        CN: { name: 'Cina', svg: () => rect(0, 0, W, H, '#de2910') + star(5, 5, 3, '#ffde00') + star(10, 2, 1, '#ffde00') + star(12, 4, 1, '#ffde00') + star(12, 7, 1, '#ffde00') + star(10, 9, 1, '#ffde00') },
        // Taipei Cinese: bandiera usata nelle competizioni sportive (fiore di pruno con sole e anelli, semplificata)
        TW: { name: 'Taipei Cinese', svg: () => rect(0, 0, W, H, '#ffffff')
            + [0, 1, 2, 3, 4].map(i => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return `<circle cx="${(15 + Math.cos(a) * 3.6).toFixed(2)}" cy="${(8 + Math.sin(a) * 3.6).toFixed(2)}" r="2.6" fill="#ce1126"/>`; }).join('')
            + '<circle cx="15" cy="8" r="2.6" fill="#002d7f"/><circle cx="15" cy="8" r="1.3" fill="#ffffff"/>'
            + ['#0081c8', '#000000', '#ee334e'].map((c, i) => `<circle cx="${11.5 + i * 3.5}" cy="15.5" r="1.5" fill="none" stroke="${c}" stroke-width="0.6"/>`).join('')
            + ['#fcb131', '#00a651'].map((c, i) => `<circle cx="${13.25 + i * 3.5}" cy="16.8" r="1.5" fill="none" stroke="${c}" stroke-width="0.6"/>`).join('') },
        KR: { name: 'Corea del Sud', svg: () => rect(0, 0, W, H, '#ffffff')
            + '<path d="M11,10a4,4 0 0 1 8,0a2,2 0 0 1-4,0a2,2 0 0 0-4,0z" fill="#cd2e3a"/><path d="M11,10a2,2 0 0 0 4,0a2,2 0 0 1 4,0a4,4 0 0 1-8,0z" fill="#0047a0"/>'
            + '<g fill="#000">' + [[5.5, 4.5, -0.59], [24.5, 4.5, 0.59], [5.5, 15.5, 0.59], [24.5, 15.5, -0.59]].map(([x, y, a]) =>
                `<g transform="translate(${x} ${y}) rotate(${(a * 180 / Math.PI).toFixed(1)})"><rect x="-2.5" y="-1.6" width="5" height="0.7"/><rect x="-2.5" y="-0.35" width="5" height="0.7"/><rect x="-2.5" y="0.9" width="5" height="0.7"/></g>`).join('') + '</g>' },
        IR: { name: 'Iran', svg: () => horiz(['#239f40', '#ffffff', '#da0000']) + '<circle cx="15" cy="10" r="2.1" fill="none" stroke="#da0000" stroke-width="0.9"/><rect x="14.6" y="7.6" width="0.8" height="4.8" fill="#da0000"/>' },
        SM: { name: 'San Marino', svg: () => horiz(['#ffffff', '#5eb6e4']) },
        AD: { name: 'Andorra', svg: () => vert(['#10069f', '#fedf00', '#d50032']) },
        MC: { name: 'Monaco', svg: () => horiz(['#ce1126', '#ffffff']) },
        LU: { name: 'Lussemburgo', svg: () => horiz(['#ed2939', '#ffffff', '#00a1de']) }
    };

    const cache = {};
    function svg(code) {
        const c = String(code || '').toUpperCase();
        if (!FLAGS[c]) return '';
        if (!cache[c]) cache[c] = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${FLAGS[c].svg()}</svg>`;
        return cache[c];
    }
    // nome in italiano (chiave del dizionario: vedi src/i18n/en/data.js)
    function itName(code) {
        const f = FLAGS[String(code || '').toUpperCase()];
        return f ? f.name : String(code || '');
    }
    // nome nella lingua attiva (per i testi composti, es. "Francia • Club")
    function name(code) {
        const n = itName(code);
        return window._t ? window._t(n) : n;
    }
    // <span> con la bandiera; size: altezza CSS (default 0.8em)
    // title/aria-label restano in italiano: li traduce l'osservatore della pagina (anche al cambio lingua)
    function html(code, extraClass, size) {
        const s = svg(code);
        if (!s) return '';
        const n = itName(code);
        const style = size ? ` style="height:${size}"` : '';
        return `<span class="hil-flag${extraClass ? ' ' + extraClass : ''}" title="${n}" role="img" aria-label="${n}"${style}>${s}</span>`;
    }

    const css = document.createElement('style');
    css.textContent = '.hil-flag{display:inline-block;height:.8em;aspect-ratio:3/2;vertical-align:-.06em;border-radius:2px;overflow:hidden;'
        + 'box-shadow:0 0 0 1px rgba(0,0,0,.28),0 1px 3px rgba(0,0,0,.35);flex:none;line-height:0}'
        + '.hil-flag svg{display:block;width:100%;height:100%}';
    (document.head || document.documentElement).appendChild(css);

    window.HIL_FLAGS = { svg, html, name, has: code => !!FLAGS[String(code || '').toUpperCase()], codes: Object.keys(FLAGS) };
})();
