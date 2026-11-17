/**
 * src/audio/MusicEngine.js
 *
 * Musica originale generata in tempo reale con la Web Audio API (nessun file audio).
 * Un piccolo sequencer a sedicesimi pianifica le note in anticipo ("lookahead") su
 * strumenti sintetici: cassa, rullante, charleston, piatti, tom, basso, pad, ottoni,
 * arpeggio, lead e organo da palazzetto.
 *
 * Brani:
 *   menu    — tema principale (La minore, 120 BPM), 16 battute in loop
 *   anthem  — inno epico d'ingresso in campo (Re maggiore, 92 BPM), in loop
 *   goal    — canzone del gol (Mi maggiore, 140 BPM), una volta
 *   charge  — "carica" all'organo, una volta
 *   period  — sigla di fine periodo all'organo, una volta
 *   victory — fanfara finale, una volta
 */

const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);

// ─────────────────────────────────────────────────────────────── strumenti
function makeNoise(ctx) {
    const len = ctx.sampleRate;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
}

function env(g, t, a, peak, d, sustain, rel, end) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sustain), t + a + d);
    g.gain.setValueAtTime(Math.max(0.0001, peak * sustain), end);
    g.gain.exponentialRampToValueAtTime(0.0001, end + rel);
}

const INSTRUMENTS = {
    kick(ctx, out, t, m, dur, v) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
        g.gain.setValueAtTime(0.95 * v, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
        o.connect(g).connect(out);
        o.start(t); o.stop(t + 0.4);
    },
    snare(ctx, out, t, m, dur, v, noise) {
        const n = ctx.createBufferSource(); n.buffer = noise;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.8;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.55 * v, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        n.connect(bp).connect(g).connect(out);
        n.start(t, Math.random() * 0.5); n.stop(t + 0.22);
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = 'triangle'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
        og.gain.setValueAtTime(0.35 * v, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
        o.connect(og).connect(out); o.start(t); o.stop(t + 0.12);
    },
    clap(ctx, out, t, m, dur, v, noise) {
        for (let k = 0; k < 3; k++) {
            const n = ctx.createBufferSource(); n.buffer = noise;
            const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 1.2;
            const g = ctx.createGain(), tk = t + k * 0.012;
            g.gain.setValueAtTime(0.4 * v, tk); g.gain.exponentialRampToValueAtTime(0.0001, tk + (k === 2 ? 0.16 : 0.03));
            n.connect(bp).connect(g).connect(out); n.start(tk, Math.random() * 0.5); n.stop(tk + 0.18);
        }
    },
    hat(ctx, out, t, m, dur, v, noise) {
        const n = ctx.createBufferSource(); n.buffer = noise;
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7500;
        const g = ctx.createGain(), len = m ? 0.16 : 0.045;     // m=1 → charleston aperto
        g.gain.setValueAtTime(0.22 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        n.connect(hp).connect(g).connect(out); n.start(t, Math.random() * 0.5); n.stop(t + len + 0.02);
    },
    crash(ctx, out, t, m, dur, v, noise) {
        const n = ctx.createBufferSource(); n.buffer = noise; n.loop = true;
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4500;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.28 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
        n.connect(hp).connect(g).connect(out); n.start(t); n.stop(t + 1.7);
    },
    tom(ctx, out, t, m, dur, v) {
        const o = ctx.createOscillator(), g = ctx.createGain(), f = midiHz(m);
        o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
        g.gain.setValueAtTime(0.8 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        o.connect(g).connect(out); o.start(t); o.stop(t + 0.62);
    },
    bass(ctx, out, t, m, dur, v) {
        const f = midiHz(m), lp = ctx.createBiquadFilter(), g = ctx.createGain();
        lp.type = 'lowpass'; lp.Q.value = 4;
        lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(320, t + 0.18);
        const a = ctx.createOscillator(); a.type = 'sawtooth'; a.frequency.value = f;
        const b = ctx.createOscillator(); b.type = 'square'; b.frequency.value = f / 2;
        const bg = ctx.createGain(); bg.gain.value = 0.5;
        a.connect(lp); b.connect(bg).connect(lp); lp.connect(g).connect(out);
        env(g, t, 0.005, 0.42 * v, 0.12, 0.7, 0.06, t + dur);
        a.start(t); b.start(t); a.stop(t + dur + 0.1); b.stop(t + dur + 0.1);
    },
    pad(ctx, out, t, m, dur, v) {
        const f = midiHz(m), lp = ctx.createBiquadFilter(), g = ctx.createGain();
        lp.type = 'lowpass'; lp.frequency.value = 1500;
        [-7, 7].forEach(dt => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(lp); o.start(t); o.stop(t + dur + 0.4); });
        lp.connect(g).connect(out);
        env(g, t, 0.08, 0.075 * v, 0.2, 0.85, 0.3, t + dur);
    },
    brass(ctx, out, t, m, dur, v) {
        const f = midiHz(m), lp = ctx.createBiquadFilter(), g = ctx.createGain();
        lp.type = 'lowpass'; lp.Q.value = 1.5;
        lp.frequency.setValueAtTime(700, t); lp.frequency.linearRampToValueAtTime(2600, t + 0.12); lp.frequency.linearRampToValueAtTime(1800, t + 0.4);
        [-10, 0, 10].forEach(dt => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(lp); o.start(t); o.stop(t + dur + 0.3); });
        lp.connect(g).connect(out);
        env(g, t, 0.06, 0.085 * v, 0.25, 0.8, 0.22, t + dur);
    },
    pluck(ctx, out, t, m, dur, v) {
        const f = midiHz(m), lp = ctx.createBiquadFilter(), g = ctx.createGain(), o = ctx.createOscillator();
        o.type = 'square'; o.frequency.value = f;
        lp.type = 'lowpass'; lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.15);
        o.connect(lp).connect(g).connect(out);
        g.gain.setValueAtTime(0.09 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        o.start(t); o.stop(t + 0.22);
    },
    lead(ctx, out, t, m, dur, v) {
        const f = midiHz(m), lp = ctx.createBiquadFilter(), g = ctx.createGain();
        lp.type = 'lowpass'; lp.frequency.value = 3200;
        const vib = ctx.createOscillator(), vg = ctx.createGain();
        vib.frequency.value = 5.5; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(dur, 0.35));
        vib.connect(vg);
        ['square', 'sawtooth'].forEach((tp, i) => { const o = ctx.createOscillator(); o.type = tp; o.frequency.value = f; o.detune.value = i ? 6 : -6; vg.connect(o.frequency); o.connect(lp); o.start(t); o.stop(t + dur + 0.2); });
        lp.connect(g).connect(out);
        vib.start(t); vib.stop(t + dur + 0.2);
        env(g, t, 0.01, 0.1 * v, 0.1, 0.75, 0.12, t + dur);
    },
    organ(ctx, out, t, m, dur, v) {
        const f = midiHz(m), g = ctx.createGain(), trem = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = 6.2; lg.gain.value = 0.18; lfo.connect(lg).connect(trem.gain); trem.gain.value = 0.82;
        [[1, 0.5], [2, 0.32], [3, 0.18], [4, 0.14], [8, 0.06]].forEach(([h, a]) => {
            const o = ctx.createOscillator(), og = ctx.createGain();
            o.frequency.value = f * h; og.gain.value = a;
            o.connect(og).connect(g); o.start(t); o.stop(t + dur + 0.12);
        });
        g.connect(trem).connect(out);
        lfo.start(t); lfo.stop(t + dur + 0.12);
        env(g, t, 0.008, 0.16 * v, 0.05, 0.9, 0.08, t + dur);
    }
};

// ─────────────────────────────────────────────────────────────── composizione
// Un evento: [step (0-15), strumento, nota MIDI, durata in sedicesimi, velocity]
const E = (s, i, m = 0, l = 1, v = 1) => ({ s, i, m, l, v });

function drumsRock(full, fill) {
    const ev = [E(0, 'kick'), E(8, 'kick'), E(4, 'snare'), E(12, 'snare')];
    if (full) ev.push(E(6, 'kick', 0, 1, 0.8), E(10, 'kick', 0, 1, 0.7));
    for (let s = 0; s < 16; s += full ? 1 : 2) ev.push(E(s, 'hat', s === 14 && full ? 1 : 0, 1, s % 4 === 0 ? 1 : 0.6));
    if (fill) ev.push(E(13, 'snare', 0, 1, 0.6), E(14, 'snare', 0, 1, 0.8), E(15, 'snare', 0, 1, 1));
    return ev;
}

function chordEvents(inst, notes, steps, vel = 1) {
    const ev = [];
    steps.forEach(([s, l]) => notes.forEach(n => ev.push(E(s, inst, n, l, vel))));
    return ev;
}

function buildMenu() {
    // Am – F – C – G
    const prog = [
        { bass: 33, pad: [57, 60, 64], arp: [69, 72, 76, 81] },
        { bass: 29, pad: [53, 57, 60], arp: [65, 69, 72, 77] },
        { bass: 36, pad: [55, 60, 64], arp: [67, 72, 76, 79] },
        { bass: 31, pad: [55, 59, 62], arp: [67, 71, 74, 79] }
    ];
    const melody = [
        [[0, 69, 2], [2, 72, 2], [4, 76, 4], [8, 74, 2], [10, 72, 2], [12, 69, 4]],
        [[0, 72, 4], [4, 69, 2], [6, 72, 2], [8, 77, 6], [14, 76, 2]],
        [[0, 76, 4], [4, 74, 2], [6, 72, 2], [8, 67, 4], [12, 72, 4]],
        [[0, 74, 6], [6, 71, 2], [8, 74, 2], [10, 79, 4], [14, 76, 2]]
    ];
    const melody2 = melody.map((bar, i) => i === 3 ? [[0, 74, 4], [4, 76, 2], [6, 79, 2], [8, 81, 8]] : bar);
    const bars = [];
    for (let b = 0; b < 16; b++) {
        const c = prog[b % 4], sec = Math.floor(b / 4);
        const ev = [];
        ev.push(...chordEvents('pad', c.pad, [[0, 16]], sec === 0 ? 0.8 : 1));
        if (sec === 0) {
            ev.push(E(0, 'kick'), E(8, 'kick'), ...[0, 4, 8, 12].map(s => E(s, 'hat', 0, 1, 0.5)));
            ev.push(E(0, 'bass', c.bass, 8), E(8, 'bass', c.bass, 8));
            if (b === 3) ev.push(E(12, 'snare', 0, 1, 0.5), E(14, 'snare', 0, 1, 0.7), E(15, 'snare'));
        } else {
            ev.push(...drumsRock(sec >= 2, b % 4 === 3));
            for (let s = 0; s < 16; s += 2) ev.push(E(s, 'bass', c.bass + (s === 6 || s === 14 ? 12 : 0), 2, s % 4 === 0 ? 1 : 0.8));
            if (sec === 1) for (let s = 0; s < 16; s++) ev.push(E(s, 'pluck', c.arp[s % 4], 1, s % 4 === 0 ? 1 : 0.7));
            if (sec >= 2) (sec === 2 ? melody : melody2)[b % 4].forEach(([s, m, l]) => ev.push(E(s, 'lead', m, l)));
            if (sec >= 2) ev.push(...chordEvents('brass', c.pad.map(n => n - 12), [[0, 3], [6, 2], [10, 6]], 0.7));
        }
        if (b % 4 === 0 && b > 0) ev.push(E(0, 'crash'));
        bars.push(ev);
    }
    return { bpm: 120, bars, loop: true };
}

function buildAnthem() {
    // D – A – Bm – G
    const prog = [
        { bass: 38, ch: [62, 66, 69] }, { bass: 33, ch: [61, 64, 69] },
        { bass: 35, ch: [62, 66, 71] }, { bass: 31, ch: [62, 67, 71] }
    ];
    const mel = [
        [[0, 74, 6], [6, 76, 2], [8, 78, 8]],
        [[0, 76, 4], [4, 73, 4], [8, 69, 8]],
        [[0, 71, 4], [4, 74, 4], [8, 78, 6], [14, 76, 2]],
        [[0, 74, 8], [8, 71, 4], [12, 67, 4]],
        [[0, 78, 6], [6, 81, 2], [8, 81, 8]],
        [[0, 76, 4], [4, 78, 4], [8, 76, 8]],
        [[0, 74, 4], [4, 76, 4], [8, 78, 8]],
        [[0, 79, 8], [8, 78, 4], [12, 74, 4]]
    ];
    const bars = [];
    for (let b = 0; b < 10; b++) {
        const ev = [];
        if (b < 2) {   // introduzione: rullo di tom e ottoni che crescono
            const c = prog[b === 0 ? 0 : 1];
            ev.push(...chordEvents('brass', c.ch.map(n => n - 12), [[0, 16]], 0.6 + b * 0.3));
            ev.push(E(0, 'bass', c.bass, 16));
            for (let s = 0; s < 16; s += b === 0 ? 4 : 2) ev.push(E(s, 'tom', b === 0 ? 45 : 48, 1, 0.6 + s / 30));
            if (b === 1) ev.push(E(12, 'snare', 0, 1, 0.7), E(13, 'snare', 0, 1, 0.8), E(14, 'snare', 0, 1, 0.9), E(15, 'snare'));
        } else {
            const i = b - 2, c = prog[i % 4];
            ev.push(...chordEvents('brass', c.ch.map(n => n - 12), [[0, 6], [6, 2], [8, 8]]));
            ev.push(...chordEvents('pad', c.ch, [[0, 16]], 0.9));
            ev.push(E(0, 'bass', c.bass, 6), E(6, 'bass', c.bass, 2), E(8, 'bass', c.bass, 8));
            ev.push(E(0, 'kick'), E(6, 'kick', 0, 1, 0.8), E(8, 'kick'), E(4, 'snare'), E(12, 'snare'), E(4, 'clap', 0, 1, 0.6), E(12, 'clap', 0, 1, 0.6));
            ev.push(E(0, 'tom', 43, 1, 0.8), E(10, 'tom', 47, 1, 0.6), E(14, 'tom', 45, 1, 0.7));
            for (let s = 2; s < 16; s += 4) ev.push(E(s, 'hat', 0, 1, 0.5));
            mel[i].forEach(([s, m, l]) => ev.push(E(s, 'lead', m, l, 1)));
            if (i % 4 === 0) ev.push(E(0, 'crash'));
        }
        bars.push(ev);
    }
    return { bpm: 92, bars, loop: true, loopStart: 2 };
}

function buildGoal() {
    // E – A – B – A, quattro quarti in cassa dritta con organo e coro di "ooh"
    const prog = [{ b: 40, ch: [64, 68, 71] }, { b: 45, ch: [64, 69, 73] }, { b: 47, ch: [66, 71, 75] }, { b: 45, ch: [64, 69, 73] }];
    const riff = [[0, 76, 2], [2, 76, 2], [4, 80, 2], [6, 83, 4], [10, 80, 2], [12, 83, 4]];
    const bars = [];
    for (let b = 0; b < 8; b++) {
        const c = prog[b % 4], ev = [];
        [0, 4, 8, 12].forEach(s => ev.push(E(s, 'kick')));
        [4, 12].forEach(s => ev.push(E(s, 'clap'), E(s, 'snare', 0, 1, 0.6)));
        for (let s = 2; s < 16; s += 4) ev.push(E(s, 'hat', 1, 1, 0.6));
        ev.push(...chordEvents('organ', c.ch, [[0, 3], [4, 3], [8, 3], [12, 3]], 0.8));
        for (let s = 0; s < 16; s += 2) ev.push(E(s, 'bass', c.b - 12 + (s % 4 === 2 ? 12 : 0), 2));
        if (b % 2 === 0) riff.forEach(([s, m, l]) => ev.push(E(s, 'lead', m, l)));
        if (b % 4 === 0) ev.push(E(0, 'crash'));
        if (b === 7) ev.push(E(14, 'snare'), E(15, 'snare'));
        bars.push(ev);
    }
    bars.push([E(0, 'crash'), E(0, 'kick'), ...chordEvents('organ', [64, 68, 71, 76], [[0, 12]]), E(0, 'bass', 28, 12)]);
    return { bpm: 140, bars, loop: false };
}

function buildCharge() {
    // la classica "carica" da palazzetto all'organo: sol – do – mi – SOL ... mi – SOL
    const n = [[0, 67, 2], [2, 72, 2], [4, 76, 2], [6, 79, 5], [11, 76, 2], [13, 79, 6]];
    const ev = n.map(([s, m, l]) => E(s, 'organ', m, l));
    const bar0 = ev.filter(e => e.s < 16), bar1 = ev.filter(e => e.s >= 16).map(e => ({ ...e, s: e.s - 16 }));
    bar1.push(E(4, 'clap'), E(8, 'clap'), E(12, 'clap'));
    return { bpm: 132, bars: [bar0, bar1], loop: false };
}

function buildPeriod() {
    const ev = [E(0, 'organ', 72, 2), E(2, 'organ', 76, 2), E(4, 'organ', 79, 2), E(6, 'organ', 84, 6), E(6, 'organ', 76, 6), E(6, 'organ', 79, 6), E(0, 'crash', 0, 1, 0.5)];
    return { bpm: 120, bars: [ev, []], loop: false };
}

function buildVictory() {
    const ch = (n, s, l) => chordEvents('brass', n, [[s, l]]);
    const bars = [
        [E(0, 'crash'), E(0, 'tom', 43), ...ch([60, 64, 67], 0, 4), E(4, 'lead', 72, 2), E(6, 'lead', 76, 2), E(8, 'lead', 79, 6), ...ch([60, 64, 67], 8, 8), E(0, 'bass', 36, 16)],
        [...ch([62, 65, 69], 0, 8), E(0, 'lead', 77, 4), E(4, 'lead', 76, 2), E(6, 'lead', 74, 2), E(8, 'lead', 76, 8), ...ch([60, 64, 67], 8, 8), E(0, 'bass', 41, 8), E(8, 'bass', 36, 8), E(0, 'tom', 45), E(8, 'tom', 43)],
        [E(0, 'crash'), ...ch([60, 64, 67, 72], 0, 16), E(0, 'lead', 84, 16), E(0, 'bass', 36, 16), E(0, 'kick'), E(0, 'tom', 41)]
    ];
    return { bpm: 100, bars, loop: false };
}

export const SONGS = {
    menu: buildMenu(), anthem: buildAnthem(), goal: buildGoal(),
    charge: buildCharge(), period: buildPeriod(), victory: buildVictory()
};

// ─────────────────────────────────────────────────────────────── motore
export class MusicEngine {
    /** @param {BaseAudioContext} ctx  @param {AudioNode} out */
    constructor(ctx, out) {
        this.ctx = ctx;
        this.noise = makeNoise(ctx);
        this.bus = ctx.createGain();
        this.bus.gain.value = 0.5;          // margine: i brani pieni non devono saturare
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16; comp.ratio.value = 3.5; comp.attack.value = 0.01; comp.release.value = 0.2;
        this.bus.connect(comp).connect(out);
        this.players = [];
        this.timer = null;
    }

    /** Pianifica gli eventi di uno step su una destinazione. */
    _scheduleStep(song, bar, step, time, dest) {
        const spb = 60 / song.bpm / 4;
        const evs = song.bars[bar];
        for (let i = 0; i < evs.length; i++) {
            const e = evs[i];
            if (e.s !== step) continue;
            const fn = INSTRUMENTS[e.i];
            if (fn) fn(this.ctx, dest, time, e.m, e.l * spb * 0.95, e.v, this.noise);
        }
    }

    _tick() {
        const now = this.ctx.currentTime, horizon = now + 0.15;
        this.players = this.players.filter(p => {
            if (p.stopped) return now < p.stopAt + 0.1;
            if (p.next < now - 0.25) p.next = now + 0.05;   // scheda in background: riallinea
            const spb = 60 / p.song.bpm / 4;
            while (p.next < horizon) {
                this._scheduleStep(p.song, p.bar, p.step, p.next, p.gain);
                p.next += spb;
                if (++p.step >= 16) {
                    p.step = 0;
                    if (++p.bar >= p.song.bars.length) {
                        if (p.song.loop) p.bar = p.song.loopStart || 0;
                        else { p.stopped = true; p.stopAt = p.next + 1.5; if (p.onEnd) p.onEnd(); break; }
                    }
                }
            }
            return true;
        });
        if (!this.players.length && this.timer) { clearInterval(this.timer); this.timer = null; }
    }

    /** Avvia un brano. Ritorna il player (per fermarlo con stop()). */
    play(name, { volume = 1, fadeIn = 0.6, onEnd = null } = {}) {
        const song = SONGS[name];
        if (!song) return null;
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(volume, t + fadeIn);
        gain.connect(this.bus);
        const p = { name, song, gain, bar: 0, step: 0, next: t + 0.06, stopped: false, onEnd };
        this.players.push(p);
        if (!this.timer) this.timer = setInterval(() => this._tick(), 25);
        this._tick();
        return p;
    }

    stop(p, fade = 1.0) {
        if (!p || p.stopped) return;
        const t = this.ctx.currentTime;
        p.stopped = true;
        p.stopAt = t + fade;
        p.gain.gain.cancelScheduledValues(t);
        p.gain.gain.setValueAtTime(Math.max(0.0001, p.gain.gain.value), t);
        p.gain.gain.exponentialRampToValueAtTime(0.0001, t + fade);
        setTimeout(() => { try { p.gain.disconnect(); } catch (e) {} }, (fade + 0.3) * 1000);
    }

    /** Pianifica un intero brano in un OfflineAudioContext (per i test). */
    renderOffline(name, seconds) {
        const song = SONGS[name], spb = 60 / song.bpm / 4;
        let t = 0.05, bar = 0, step = 0;
        while (t < seconds) {
            this._scheduleStep(song, bar, step, t, this.bus);
            t += spb;
            if (++step >= 16) { step = 0; if (++bar >= song.bars.length) { if (!song.loop) break; bar = song.loopStart || 0; } }
        }
    }
}
