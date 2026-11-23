// --- src/input/Gamepad.js ---
// Controller (gamepad) e telecomando: tutto viene tradotto nei tasti che il gioco già conosce,
// così menu (src/ui/uikit.js), partita, pausa, replay e tasti riassegnati funzionano senza
// codice a parte.
//
// Due sorgenti:
//  - Gamepad API del browser (PC, Chrome): letta a ogni fotogramma.
//  - App Android (MainActivity.java): i pulsanti del controller arrivano già decodificati con
//    HILPad.native(nome, premuto) e la levetta con HILPad.nativeAxes(x, y). Quando arriva il
//    primo evento nativo la Gamepad API viene ignorata, per non contare due volte lo stesso tasto.
//
// Mappa (layout Xbox; su PlayStation: A = ✕, B = ○, X = □, Y = △):
//   partita : levetta/croce = movimento, A = tiro (tenuto = tiro caricato) e ingaggio, X = passaggio,
//             B = carica, Y / RB = linea successiva, LB / Select = telecamera, Start = pausa
//   menu    : levetta/croce = sposta la selezione, A = conferma, B = indietro, Start = conferma
//   replay  : ◀ ▶ = scorri, A = play/pausa, LB/RB = telecamera, B / Start = esci
// Script classico: legge a runtime gameState, gamePaused, settingsOpen, keyBindings, PAUSABLE_STATES.
(function () {
    'use strict';

    const BTN = { 0: 'a', 1: 'b', 2: 'x', 3: 'y', 4: 'lb', 5: 'rb', 8: 'select', 9: 'start', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
    const VALID = new Set([...Object.values(BTN), 'pause']);     // 'pause': Play/Pausa del telecomando
    const DEAD = 0.45;
    const REPEAT_DELAY = 420, REPEAT_EVERY = 140;      // ms, ripetizione delle frecce tenute nei menu

    let nativeActive = false;
    const nativeBtn = {};                               // pulsanti dal lato Android
    let nativeAx = { x: 0, y: 0 };
    const prev = {};                                    // stato al fotogramma precedente
    const sent = {};                                    // per ogni pulsante: { key, code } inviato al keydown
    const repeatAt = {};

    // variabili dello script principale (let globali, non proprietà di window)
    const G = name => { try { return (0, eval)(name); } catch (e) { return undefined; } };

    function context() {
        if (window.disclaimerOpen || window.perfBenchOpen) return 'none';
        if (G('settingsOpen')) return 'menu';
        const ts = document.getElementById('title-splash-screen');
        if (ts && !ts.classList.contains('hidden')) return 'menu';
        const gs = G('gameState');
        if (gs === 'replay') return 'replay';
        const states = G('PAUSABLE_STATES');
        if (!G('gamePaused') && states && states.has(gs)) return 'game';
        return 'menu';
    }

    function codeToKey(code) {
        if (!code) return '';
        if (/^Arrow/.test(code) || code === 'Escape' || code === 'Enter') return code;
        if (code === 'Space') return ' ';
        if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
        if (/^Digit\d$/.test(code)) return code.slice(5);
        return code;
    }
    const KEYCODES = { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, Enter: 13, Escape: 27, ' ': 32 };
    function fire(type, key, code, repeat) {
        const target = (document.activeElement && document.activeElement !== document.body) ? document.activeElement : document.body;
        const kc = KEYCODES[key] || (key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0);
        target.dispatchEvent(new KeyboardEvent(type, { key, code, keyCode: kc, which: kc, repeat: !!repeat, bubbles: true, cancelable: true }));
    }
    function binding(action) {
        const kb = G('keyBindings') || {};
        const code = kb[action];
        return code ? { key: codeToKey(code), code } : null;
    }
    const ARROW = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

    // tasto da mandare per un pulsante, nel contesto attuale
    function keyFor(btn, ctx) {
        if (ctx === 'game') {
            if (ARROW[btn]) return binding(btn);
            switch (btn) {
                case 'a': return binding('shoot');
                case 'x': return binding('pass');
                case 'b': return binding('check');
                case 'y': case 'rb': return binding('lineNext');
                case 'lb': case 'select': return binding('camera');
                case 'start': case 'pause': return { key: 'Escape', code: 'Escape' };
            }
            return null;
        }
        if (ctx === 'replay') {
            if (btn === 'left' || btn === 'right') return { key: ARROW[btn], code: ARROW[btn] };
            switch (btn) {
                case 'a': case 'pause': return { key: ' ', code: 'Space' };
                case 'lb': case 'rb': case 'select': case 'x': case 'y': return { key: 'v', code: 'KeyV' };
                case 'b': case 'start': return { key: 'Escape', code: 'Escape' };
            }
            return null;
        }
        if (ctx === 'menu') {
            if (ARROW[btn]) return { key: ARROW[btn], code: ARROW[btn] };
            switch (btn) {
                case 'a': case 'start': return { key: 'Enter', code: 'Enter' };
                case 'b': return { key: 'Escape', code: 'Escape' };
            }
        }
        return null;
    }

    function press(btn, now) {
        const ctx = context();
        const k = keyFor(btn, ctx);
        if (!k) return;
        sent[btn] = { ...k, ctx };
        fire('keydown', k.key, k.code, false);
        repeatAt[btn] = now + REPEAT_DELAY;
    }
    function release(btn) {
        const k = sent[btn];
        if (!k) return;
        delete sent[btn];
        fire('keyup', k.key, k.code, false);
    }
    function hold(btn, now) {
        // nei menu le frecce tenute ripetono lo spostamento
        const k = sent[btn];
        if (!k || k.ctx === 'game' || !ARROW[btn] || now < repeatAt[btn]) return;
        repeatAt[btn] = now + REPEAT_EVERY;
        fire('keydown', k.key, k.code, true);
    }

    function readBrowserPads(state) {
        if (!navigator.getGamepads) return false;
        let pads;
        try { pads = navigator.getGamepads(); } catch (e) { return false; }
        let any = false;
        for (const p of pads || []) {
            if (!p || !p.connected) continue;
            any = true;
            p.buttons.forEach((b, i) => { const n = BTN[i]; if (n && (b.pressed || b.value > 0.5)) state[n] = true; });
            const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
            if (ay < -DEAD) state.up = true;
            if (ay > DEAD) state.down = true;
            if (ax < -DEAD) state.left = true;
            if (ax > DEAD) state.right = true;
        }
        return any;
    }

    // confronta lo stato nuovo con il precedente: pressioni, rilasci e ripetizioni
    function apply(state, now) {
        const names = new Set([...Object.keys(state), ...Object.keys(prev)]);
        names.forEach(n => {
            const on = !!state[n], was = !!prev[n];
            if (on && !was) press(n, now);
            else if (!on && was) release(n);
            else if (on) hold(n, now);
            prev[n] = on;
        });
    }
    function nativeState() {
        const state = {};
        Object.keys(nativeBtn).forEach(n => { if (nativeBtn[n]) state[n] = true; });
        if (nativeAx.y < -DEAD) state.up = true;
        if (nativeAx.y > DEAD) state.down = true;
        if (nativeAx.x < -DEAD) state.left = true;
        if (nativeAx.x > DEAD) state.right = true;
        return state;
    }

    function frame(now) {
        if (nativeActive) apply(nativeState(), now);     // qui solo le ripetizioni: i cambi arrivano subito
        else {
            const state = {};
            readBrowserPads(state);
            apply(state, now);
        }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // controller in uso: gli aiuti a schermo mostrano i suoi tasti (classe has-pad, index.html)
    function markPad() {
        nativeActive = true;
        document.documentElement.classList.add('has-pad');
    }

    // ponte con l'app Android
    window.HILPad = {
        // dall'app Android: gestiti subito, senza aspettare il prossimo fotogramma
        native(name, down) {
            // 'pause' arriva anche dal tasto Play/Pausa del telecomando: non è un controller
            if (name === 'pause') nativeActive = true; else markPad();
            if (!VALID.has(name)) return;
            nativeBtn[name] = !!down;
            apply(nativeState(), performance.now());
        },
        nativeAxes(x, y) {
            markPad();
            nativeAx = { x: +x || 0, y: +y || 0 };
            apply(nativeState(), performance.now());
        },
        // per l'interfaccia (es. suggerimenti a schermo): c'è un controller collegato?
        connected() {
            if (nativeActive) return true;
            try { return Array.from(navigator.getGamepads ? navigator.getGamepads() : []).some(p => p && p.connected); } catch (e) { return false; }
        }
    };
    window.addEventListener('gamepadconnected', () => { document.documentElement.classList.add('has-pad'); });
    // controller scollegato (browser): tornano gli aiuti della tastiera, se non ne resta collegato un altro
    window.addEventListener('gamepaddisconnected', () => {
        if (!nativeActive && !window.HILPad.connected()) document.documentElement.classList.remove('has-pad');
    });
})();
