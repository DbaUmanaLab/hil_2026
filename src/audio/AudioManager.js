/**
 * src/audio/AudioManager.js
 *
 * Audio procedurale sintetico — zero file da scaricare.
 * Usa la Web Audio API nativa del browser.
 * Phaser gestisce l'unlock del AudioContext su mobile (tap-to-unlock).
 *
 * Uso:
 *   import { AudioManager } from './audio/AudioManager.js';
 *   const audio = new AudioManager();
 *   audio.init(phaserScene);   // una volta sola
 *   audio.playGoalHorn();
 */

import { MusicEngine } from './MusicEngine.js';

const AUDIO_PREFS_KEY = 'hil_audio_prefs';

export class AudioManager {
    constructor() {
        /** @type {AudioContext|null} */
        this._ctx = null;
        /** @type {GainNode|null} */
        this._masterGain = null;
        /** @type {GainNode|null} */
        this._crowdGain = null;
        /** @type {AudioBufferSourceNode|null} */
        this._crowdLoopNode = null;
        /** @type {AudioBufferSourceNode|null} */
        this._ambientNode = null;
        /** @type {boolean} */
        this._ready = false;
        /** volume master 0-1 */
        this.masterVolume = 0.82;
        /** volume folla separato */
        this.crowdVolume = 0.55;
        /** true se l'utente ha già interagito (mobile unlock) */
        this._unlocked = false;
        /** Buffer pre-generati */
        this._buffers = {};
        /** Coda operazioni da eseguire dopo unlock */
        this._pendingCalls = [];
        /** Musica */
        this.musicVolume = 0.8;
        this._music = null;
        this._musicTrack = null;      // brano di sottofondo desiderato
        this._musicPlayer = null;
        this._stingerPlayer = null;
        /** Colonna sonora MP3 (assets/audio): menu, caricamenti e riprese cinematiche */
        this._bgTracks = ['assets/audio/track_1.mp3', 'assets/audio/track_2.mp3', 'assets/audio/track_3.mp3'];
        this._bgVolume = 0.42;        // sottofondo: sotto la voce degli effetti
        this._bgWant = false;
        this._bgEl = null;
        this._bgGain = null;
        this._bgOrder = null;
        this._bgIdx = -1;
        this._bgPauseT = null;
        /** Effetti registrati (assets/audio effects): sostituiscono i suoni sintetici equivalenti */
        this._fileSfx = {
            crowdNormal: 'assets/audio effects/crowd normal.mp3',
            crowdGoal:   'assets/audio effects/crowd goal.mp3',
            puckHit:     'assets/audio effects/puck hit.mp3',
            whistle:     'assets/audio effects/referee-whistle.mp3'
        };
        this._fileBuffers = {};
        /** Brusio di fondo del pubblico: molto basso e filtrato, non deve disturbare */
        this._crowdBedLevel = 0.065;
        this._crowdBedNode = null;
        this._crowdGoalNode = null;
        /** Preferenze utente (salvate nel browser) */
        this.musicEnabled = true;
        this.sfxEnabled = true;
        this.sfxVolume = 1;
        this.crowdLevel = 1;       // moltiplicatore del pubblico (0-1)
        try {
            const pr = JSON.parse(localStorage.getItem(AUDIO_PREFS_KEY) || '{}');
            if (typeof pr.music === 'boolean') this.musicEnabled = pr.music;
            if (typeof pr.sfx === 'boolean') this.sfxEnabled = pr.sfx;
            if (typeof pr.musicVol === 'number') this.musicVolume = Math.max(0, Math.min(1, pr.musicVol));
            if (typeof pr.sfxVol === 'number') this.sfxVolume = Math.max(0, Math.min(1, pr.sfxVol));
            if (typeof pr.crowdVol === 'number') this.crowdLevel = Math.max(0, Math.min(1, pr.crowdVol));
        } catch (e) {}
    }

    _savePrefs() {
        try {
            localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify({
                music: this.musicEnabled, sfx: this.sfxEnabled,
                musicVol: this.musicVolume, sfxVol: this.sfxVolume, crowdVol: this.crowdLevel
            }));
        } catch (e) {}
    }

    /** Scarica e decodifica gli effetti registrati (in background: fino ad allora restano i sintetici) */
    _loadFileSfx() {
        Object.entries(this._fileSfx).forEach(([name, url]) => {
            fetch(encodeURI(url))
                .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
                .then(ab => new Promise((res, rej) => this._ctx.decodeAudioData(ab, res, rej)))
                .then(buf => {
                    this._fileBuffers[name] = buf;
                    // il brusio era già richiesto con la versione sintetica: passa al file
                    if (name === 'crowdNormal' && this._crowdWanted === 'ambient') this._startCrowdBed();
                })
                .catch(err => console.warn('[AudioManager] effetto non caricato:', url, err));
        });
    }

    /** Riproduce un buffer registrato sul canale effetti */
    _playFile(name, gain = 1, rate = 1, opts = {}) {
        const buf = this._fileBuffers[name];
        if (!this._ready || !buf) return null;
        const src = this._ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = rate;
        const g = this._ctx.createGain();
        g.gain.value = gain;
        src.connect(g);
        g.connect(opts.dest || this._sfxGain);
        const t = this._ctx.currentTime;
        if (opts.duration) {
            // versione breve: sfuma in chiusura per evitare il clic
            g.gain.setValueAtTime(gain, t + Math.max(0, opts.duration - 0.08));
            g.gain.linearRampToValueAtTime(0, t + opts.duration);
            src.start(t, 0, opts.duration + 0.02);
        } else {
            src.start(t);
        }
        return src;
    }

    // ─────────────────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────────────────

    /**
     * Inizializza il sistema audio.
     * @param {Phaser.Scene} phaserScene  Scena Phaser attiva (per unlock mobile)
     */
    init(phaserScene) {
        if (this._ready) return;

        // Crea AudioContext (rinviato fin dopo un gesto utente su iOS/Safari)
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
            console.warn('[AudioManager] Web Audio API non supportata.');
            return;
        }

        this._ctx = new AudioCtx();
        this._masterGain = this._ctx.createGain();
        this._masterGain.gain.value = this.masterVolume;
        this._masterGain.connect(this._ctx.destination);

        // canali separati: effetti (con la folla) e musica
        this._sfxGain = this._ctx.createGain();
        this._sfxGain.gain.value = this.sfxEnabled ? this.sfxVolume : 0;
        this._sfxGain.connect(this._masterGain);
        this._musicGain = this._ctx.createGain();
        this._musicGain.gain.value = this.musicEnabled ? this.musicVolume : 0;
        this._musicGain.connect(this._masterGain);

        this._crowdGain = this._ctx.createGain();
        this._crowdGain.gain.value = 0;          // parte muta, si alza durante il gioco
        this._crowdGain.connect(this._sfxGain);

        // Phaser gestisce l'unlock del AudioContext su mobile
        if (phaserScene && phaserScene.sound) {
            phaserScene.sound.once('unlocked', () => this._onUnlock());
        }

        // Desktop: il context parte spesso già "running"
        if (this._ctx.state === 'running') {
            this._onUnlock();
        } else {
            // Agganciamo anche un listener DOM come fallback
            const unlock = () => {
                if (this._ctx.state === 'suspended') this._ctx.resume();
                this._onUnlock();
                document.removeEventListener('pointerdown', unlock);
                document.removeEventListener('keydown', unlock);
            };
            document.addEventListener('pointerdown', unlock, { once: true });
            document.addEventListener('keydown', unlock, { once: true });
        }
    }

    _onUnlock() {
        if (this._unlocked) return;
        this._unlocked = true;
        if (this._ctx && this._ctx.state === 'suspended') this._ctx.resume();

        // Pre-genera i buffer sintetici (CPU-bound, una volta sola)
        this._generateBuffers();
        this._loadFileSfx();
        this._music = new MusicEngine(this._ctx, this._musicGain);
        this._startRollLoop();
        this._ready = true;
        if (this._musicTrack) { const t = this._musicTrack; this._musicTrack = null; this.setMusicTrack(t); }
        if (this._bgWant) this._bgApply();

        // Svuota la coda di chiamate pendenti
        this._pendingCalls.forEach(fn => fn());
        this._pendingCalls = [];
    }

    /** Esegue fn subito se pronto, altrimenti accoda */
    _whenReady(fn) {
        if (this._ready) fn();
        else this._pendingCalls.push(fn);
    }

    setMasterVolume(v) {
        this.masterVolume = Math.max(0, Math.min(1, v));
        if (this._masterGain) this._masterGain.gain.value = this.masterVolume;
    }

    // ─────────────────────────────────────────────────────────
    // GENERAZIONE BUFFER
    // ─────────────────────────────────────────────────────────

    _generateBuffers() {
        const ctx = this._ctx;
        this._buffers.puckImpact   = this._makePuckImpact(ctx);
        this._buffers.puckSlide    = this._makePuckSlide(ctx);
        this._buffers.stickClash   = this._makeStickClash(ctx);
        this._buffers.whistle      = this._makeWhistle(ctx);
        this._buffers.goalHorn     = this._makeGoalHorn(ctx);
        this._buffers.buzzer       = this._makeBuzzer(ctx);
        this._buffers.crowdCheer   = this._makeCrowdNoise(ctx, 'cheer');
        this._buffers.crowdAmbient = this._makeCrowdNoise(ctx, 'ambient');
        this._buffers.paDing       = this._makePaDing(ctx);
        this._buffers.lineChange   = this._makeLineChangeBip(ctx);
        this._buffers.skateSwish   = this._makeSkateSwish(ctx);
        this._buffers.roll         = this._makeRollLoop(ctx);
        this._buffers.crowdOoh     = this._makeCrowdOoh(ctx);
        this._buffers.save         = this._makeSave(ctx);
        this._buffers.pass         = this._makePass(ctx);
        this._buffers.stickTap     = this._makeStickTap(ctx);
        this._buffers.uiClick      = this._makeUiClick(ctx);
        this._buffers.boardThud    = this._makeBoardThud(ctx);
    }

    // ── ROTOLIO DELLE RUOTE (loop): rombo grave + ticchettio dei giunti ──
    _makeRollLoop(ctx) {
        const dur = 2.0, sr = ctx.sampleRate, len = Math.floor(sr * dur);
        const buf = ctx.createBuffer(2, len, sr);
        for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch);
            let lp = 0, lp2 = 0;
            for (let i = 0; i < len; i++) {
                const t = i / sr, w = Math.random() * 2 - 1;
                lp += (w - lp) * 0.04; lp2 += (lp - lp2) * 0.08;
                const tick = Math.exp(-((t * 7.3 + ch * 0.37) % 1) * 60) * (Math.random() * 2 - 1) * 0.25;
                d[i] = lp2 * 3.2 + w * 0.05 + tick;
            }
        }
        return buf;
    }

    // ── "OOOH" DEL PUBBLICO (tiro parato / occasione) ──
    _makeCrowdOoh(ctx) {
        const dur = 1.6, sr = ctx.sampleRate, len = Math.floor(sr * dur);
        const buf = ctx.createBuffer(2, len, sr);
        for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch);
            let y1 = 0, y2 = 0;
            for (let i = 0; i < len; i++) {
                const t = i / sr;
                const e = Math.pow(Math.sin(Math.PI * Math.min(1, t / dur)), 1.5);
                const f = 520 - 160 * (t / dur) + ch * 25, rr = 0.985;      // formante "o" che scende
                const a1 = 2 * rr * Math.cos(2 * Math.PI * f / sr), a2 = -rr * rr;
                const y = (Math.random() * 2 - 1) * 0.06 + a1 * y1 + a2 * y2;
                y2 = y1; y1 = y;
                d[i] = y * e * 0.9;
            }
        }
        return buf;
    }

    // ── PARATA: colpo sordo su gambali / guantone ──
    _makeSave(ctx) {
        const dur = 0.25, sr = ctx.sampleRate, buf = ctx.createBuffer(1, Math.floor(sr * dur), sr), d = buf.getChannelData(0);
        let lp = 0;
        for (let i = 0; i < d.length; i++) {
            const t = i / sr, w = Math.random() * 2 - 1;
            lp += (w - lp) * 0.12;
            d[i] = Math.exp(-t * 26) * (Math.sin(2 * Math.PI * 95 * t) * 0.7 + lp * 1.4);
        }
        return buf;
    }

    // ── PASSAGGIO: schiocco di lama, più leggero del tiro ──
    _makePass(ctx) {
        const dur = 0.12, sr = ctx.sampleRate, buf = ctx.createBuffer(1, Math.floor(sr * dur), sr), d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) {
            const t = i / sr;
            d[i] = Math.exp(-t * 70) * ((Math.random() * 2 - 1) * 0.4 + Math.sin(2 * Math.PI * 900 * t) * 0.25 + Math.sin(2 * Math.PI * 1400 * t) * 0.12);
        }
        return buf;
    }

    // ── TOCCO DI BASTONE (conduzione del disco) ──
    _makeStickTap(ctx) {
        const dur = 0.05, sr = ctx.sampleRate, buf = ctx.createBuffer(1, Math.floor(sr * dur), sr), d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) {
            const t = i / sr;
            d[i] = Math.exp(-t * 140) * (Math.sin(2 * Math.PI * 1150 * t) * 0.5 + (Math.random() * 2 - 1) * 0.2);
        }
        return buf;
    }

    // ── CLIC DELL'INTERFACCIA ──
    _makeUiClick(ctx) {
        const dur = 0.07, sr = ctx.sampleRate, buf = ctx.createBuffer(1, Math.floor(sr * dur), sr), d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) {
            const t = i / sr, f = 1500 - t * 9000;
            d[i] = Math.exp(-t * 60) * Math.sin(2 * Math.PI * f * t) * 0.35;
        }
        return buf;
    }

    // ── DISCO CONTRO LA BALAUSTRA: tonfo di plastica/legno ──
    _makeBoardThud(ctx) {
        const dur = 0.3, sr = ctx.sampleRate, buf = ctx.createBuffer(1, Math.floor(sr * dur), sr), d = buf.getChannelData(0);
        let lp = 0;
        for (let i = 0; i < d.length; i++) {
            const t = i / sr, w = Math.random() * 2 - 1;
            lp += (w - lp) * 0.2;
            d[i] = Math.exp(-t * 22) * (Math.sin(2 * Math.PI * 140 * t) * 0.5 + Math.sin(2 * Math.PI * 310 * t) * 0.25 * Math.exp(-t * 40) + lp * 0.9);
        }
        return buf;
    }

    // ── DISCO: impatto su balaustra / porta ──────────────────
    _makePuckImpact(ctx) {
        const dur = 0.18;
        const sr  = ctx.sampleRate;
        const buf = ctx.createBuffer(1, Math.floor(sr * dur), sr);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) {
            const t  = i / sr;
            const env = Math.exp(-t * 55);
            // rumore bianco + componente tonale (impatto metallico)
            d[i] = env * (
                (Math.random() * 2 - 1) * 0.65 +
                Math.sin(2 * Math.PI * 420 * t) * 0.22 * Math.exp(-t * 90) +
                Math.sin(2 * Math.PI * 210 * t) * 0.18 * Math.exp(-t * 70)
            );
        }
        return buf;
    }

    // ── DISCO: scivolata sul parquet ─────────────────────────
    _makePuckSlide(ctx) {
        const dur = 0.12;
        const sr  = ctx.sampleRate;
        const buf = ctx.createBuffer(1, Math.floor(sr * dur), sr);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) {
            const t   = i / sr;
            const env = Math.sin(Math.PI * t / dur);
            d[i] = env * (Math.random() * 2 - 1) * 0.08;
        }
        return buf;
    }

    // ── BASTONE: scontro tra bastoni (faceoff / contrasto) ───
    _makeStickClash(ctx) {
        const dur = 0.22;
        const sr  = ctx.sampleRate;
        const buf = ctx.createBuffer(1, Math.floor(sr * dur), sr);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) {
            const t   = i / sr;
            const env = Math.exp(-t * 38);
            d[i] = env * (
                (Math.random() * 2 - 1) * 0.5 +
                Math.sin(2 * Math.PI * 680 * t) * 0.3 * Math.exp(-t * 55) +
                Math.sin(2 * Math.PI * 340 * t) * 0.25 * Math.exp(-t * 45)
            );
        }
        return buf;
    }

    // ── FISCHIO ARBITRO ──────────────────────────────────────
    _makeWhistle(ctx) {
        const dur = 0.75;
        const sr  = ctx.sampleRate;
        const buf = ctx.createBuffer(1, Math.floor(sr * dur), sr);
        const d   = buf.getChannelData(0);
        // Fischio realistico: due toni + vibrato + armoniche
        const baseFreq = 3200;
        for (let i = 0; i < d.length; i++) {
            const t   = i / sr;
            const env = t < 0.08 ? t / 0.08
                      : t < 0.6  ? 1
                      : (dur - t) / (dur - 0.6);
            const vibrato = Math.sin(2 * Math.PI * 7.5 * t) * 55;
            d[i] = env * 0.72 * (
                Math.sin(2 * Math.PI * (baseFreq + vibrato) * t) * 0.6 +
                Math.sin(2 * Math.PI * (baseFreq * 1.5 + vibrato * 0.5) * t) * 0.22 +
                Math.sin(2 * Math.PI * (baseFreq * 2 + vibrato * 0.3) * t) * 0.12
            );
        }
        return buf;
    }

    // ── TROMBA / HORN DA ARENA (GOL) ─────────────────────────
    _makeGoalHorn(ctx) {
        const dur = 1.8;
        const sr  = ctx.sampleRate;
        const buf = ctx.createBuffer(1, Math.floor(sr * dur), sr);
        const d   = buf.getChannelData(0);
        // Horn in Sol: 196 Hz + armoniche sature da arena
        const f0 = 196;
        for (let i = 0; i < d.length; i++) {
            const t   = i / sr;
            const env = t < 0.04 ? t / 0.04
                      : t < 1.5  ? 1.0
                      : (dur - t) / (dur - 1.5);
            // Distorsione leggera per simulare la trombetta elettrica
            let s = (
                Math.sin(2 * Math.PI * f0 * t) * 0.55 +
                Math.sin(2 * Math.PI * f0 * 2 * t) * 0.30 +
                Math.sin(2 * Math.PI * f0 * 3 * t) * 0.15 +
                Math.sin(2 * Math.PI * f0 * 4 * t) * 0.08 +
                Math.sin(2 * Math.PI * f0 * 5 * t) * 0.04
            );
            // Clip morbido (saturazione)
            s = Math.tanh(s * 1.4);
            d[i] = env * s * 0.78;
        }
        return buf;
    }

    // ── BUZZER FINE PERIODO ───────────────────────────────────
    _makeBuzzer(ctx) {
        const dur = 1.2;
        const sr  = ctx.sampleRate;
        const buf = ctx.createBuffer(1, Math.floor(sr * dur), sr);
        const d   = buf.getChannelData(0);
        const f0  = 220;
        for (let i = 0; i < d.length; i++) {
            const t   = i / sr;
            const env = t < 0.02 ? t / 0.02
                      : t < 1.0  ? 1.0
                      : (dur - t) / (dur - 1.0);
            // Buzz: onda quadra approssimata con armoniche dispari
            let s = 0;
            for (let h = 1; h <= 9; h += 2) {
                s += Math.sin(2 * Math.PI * f0 * h * t) / h;
            }
            d[i] = env * s * 0.5;
        }
        return buf;
    }

    // ── RUMORE FOLLA (loop) ───────────────────────────────────
    _makeCrowdNoise(ctx, type) {
        // Genera un buffer lungo 4s con rumore filtrato che simula il brusio/tifo
        const dur  = 4.0;
        const sr   = ctx.sampleRate;
        const len  = Math.floor(sr * dur);
        const buf  = ctx.createBuffer(2, len, sr); // stereo per profondità

        const isCheer = type === 'cheer';

        for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch);
            // Pink noise semplificato: somma di bande di frequenza
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0;
            for (let i = 0; i < len; i++) {
                const white = Math.random() * 2 - 1;
                // Filtro rosa (approssimazione)
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                let pink = (b0 + b1 + b2 + b3 + white * 0.5362) * 0.11;

                if (isCheer) {
                    // Cheer: aggiungi modulazione dell'intensità (ondeggiamento)
                    const t    = i / sr;
                    const wave = 0.75 + 0.25 * Math.sin(2 * Math.PI * 1.1 * t + ch * 0.8);
                    // Punta di intensità ogni ~1.4s (battito di mani)
                    const clap = Math.max(0, Math.sin(2 * Math.PI * 2.8 * t + ch * 0.3));
                    pink *= wave + clap * 0.4;
                } else {
                    // Ambient: più basso e stabile
                    pink *= 0.35;
                    const t = i / sr;
                    pink *= 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.4 * t + ch * 1.2);
                }
                d[i] = pink;
            }
        }
        return buf;
    }

    // ── PA DING (annuncio pre-partita) ────────────────────────
    _makePaDing(ctx) {
        const dur = 1.1;
        const sr  = ctx.sampleRate;
        const buf = ctx.createBuffer(1, Math.floor(sr * dur), sr);
        const d   = buf.getChannelData(0);
        const freqs = [880, 1108, 1320]; // accordo Mi maggiore PA
        for (let i = 0; i < d.length; i++) {
            const t   = i / sr;
            const env = Math.exp(-t * 3.2);
            d[i] = env * freqs.reduce((acc, f, j) => {
                return acc + Math.sin(2 * Math.PI * f * t) * [0.5, 0.35, 0.25][j];
            }, 0);
        }
        return buf;
    }

    // ── BIP CAMBIO LINEA ──────────────────────────────────────
    _makeLineChangeBip(ctx) {
        const dur = 0.09;
        const sr  = ctx.sampleRate;
        const buf = ctx.createBuffer(1, Math.floor(sr * dur), sr);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) {
            const t   = i / sr;
            const env = t < 0.01 ? t / 0.01 : Math.exp(-(t - 0.01) * 55);
            d[i] = env * Math.sin(2 * Math.PI * 1760 * t) * 0.5;
        }
        return buf;
    }

    // ── SWISH PATTINO ─────────────────────────────────────────
    _makeSkateSwish(ctx) {
        const dur = 0.14;
        const sr  = ctx.sampleRate;
        const buf = ctx.createBuffer(1, Math.floor(sr * dur), sr);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) {
            const t   = i / sr;
            const env = Math.sin(Math.PI * t / dur);
            // Rumore filtrato + componente di taglio (swish)
            const noise  = (Math.random() * 2 - 1) * 0.12;
            const tone   = Math.sin(2 * Math.PI * 2200 * t) * 0.04 * Math.exp(-t * 30);
            d[i] = env * (noise + tone);
        }
        return buf;
    }

    // ─────────────────────────────────────────────────────────
    // RIPRODUZIONE
    // ─────────────────────────────────────────────────────────

    /**
     * Riproduce un buffer con gain e detune opzionali.
     * @param {string} name   Chiave in this._buffers
     * @param {number} [gain=1]
     * @param {number} [detune=0]  centesimi
     * @param {boolean} [loop=false]
     * @returns {AudioBufferSourceNode|null}
     */
    _play(name, gain = 1, detune = 0, loop = false) {
        if (!this._ready || !this._ctx || !this._buffers[name]) return null;
        const src = this._ctx.createBufferSource();
        src.buffer = this._buffers[name];
        src.detune.value = detune;
        src.loop = loop;

        const g = this._ctx.createGain();
        g.gain.value = gain;
        src.connect(g);
        g.connect(this._sfxGain);
        src.start();
        return src;
    }

    // ─────────────────────────────────────────────────────────
    // MUSICA
    // ─────────────────────────────────────────────────────────

    /** Brano di sottofondo ('menu', 'anthem' o null per il silenzio) con dissolvenza incrociata. */
    setMusicTrack(name) {
        if (name === this._musicTrack) return;
        this._musicTrack = name;
        if (!this._ready || !this._music) return;
        if (this._musicPlayer) { this._music.stop(this._musicPlayer, 1.4); this._musicPlayer = null; }
        if (name) this._musicPlayer = this._music.play(name, { volume: 1, fadeIn: 1.2 });
    }

    /**
     * Colonna sonora MP3 di sottofondo: true durante titoli, scelte, caricamenti e riprese cinematiche,
     * false durante l'azione. Sfuma in entrata/uscita e riprende il brano dal punto in cui si era fermato;
     * a fine brano passa al successivo (ordine casuale, poi in ciclo).
     */
    setBgMusic(on) {
        on = !!on;
        if (on === this._bgWant) return;
        this._bgWant = on;
        if (this._ready) this._bgApply();
    }

    _bgEnsure() {
        if (this._bgEl || !this._ctx) return;
        const el = new Audio();
        el.preload = 'auto';
        this._bgEl = el;
        this._bgGain = this._ctx.createGain();
        this._bgGain.gain.value = 0;
        this._bgGain.connect(this._musicGain);          // rispetta il volume e il mute della musica
        this._ctx.createMediaElementSource(el).connect(this._bgGain);
        const n = this._bgTracks.length;
        this._bgOrder = [...Array(n).keys()].sort(() => Math.random() - 0.5);
        el.addEventListener('ended', () => this._bgNext());
        el.addEventListener('error', () => setTimeout(() => this._bgNext(), 500));
        this._bgNext(false);
    }

    _bgNext(autoplay = true) {
        if (!this._bgEl) return;
        this._bgIdx = (this._bgIdx + 1) % this._bgOrder.length;
        this._bgEl.src = this._bgTracks[this._bgOrder[this._bgIdx]];
        if (autoplay && this._bgWant) this._bgPlay();
    }

    _bgPlay() {
        const p = this._bgEl.play();
        if (p && p.catch) p.catch(() => {
            // riproduzione bloccata dal browser finché l'utente non interagisce: riprovo al primo gesto
            const retry = () => { if (this._bgWant && this._bgEl.paused) this._bgPlay(); };
            document.addEventListener('pointerdown', retry, { once: true });
            document.addEventListener('keydown', retry, { once: true });
        });
    }

    _bgApply() {
        this._bgEnsure();
        if (!this._bgEl) return;
        const g = this._bgGain.gain, t = this._ctx.currentTime;
        clearTimeout(this._bgPauseT);
        g.cancelScheduledValues(t);
        g.setValueAtTime(g.value, t);
        if (this._bgWant) {
            if (this._bgEl.paused) this._bgPlay();
            g.linearRampToValueAtTime(this._bgVolume, t + 1.4);
        } else {
            g.linearRampToValueAtTime(0, t + 1.2);
            this._bgPauseT = setTimeout(() => { if (!this._bgWant) this._bgEl.pause(); }, 1300);
        }
    }

    /** Stacchetto una tantum sopra il sottofondo (gol, carica, fine periodo, vittoria). */
    playStinger(name, delay = 0) {
        this._whenReady(() => {
            const go = () => {
                if (!this._music) return;
                if (this._stingerPlayer) this._music.stop(this._stingerPlayer, 0.3);
                this._stingerPlayer = this._music.play(name, { volume: name === 'charge' ? 2.6 : (name === 'period' ? 1.8 : 1), fadeIn: 0.02 });
            };
            if (delay > 0) setTimeout(go, delay * 1000); else go();
        });
    }

    setMusicEnabled(on) {
        this.musicEnabled = !!on;
        this._savePrefs();
        if (this._musicGain && this._ctx) this._musicGain.gain.setTargetAtTime(this.musicEnabled ? this.musicVolume : 0, this._ctx.currentTime, 0.15);
    }

    setSfxEnabled(on) {
        this.sfxEnabled = !!on;
        this._savePrefs();
        if (this._sfxGain && this._ctx) this._sfxGain.gain.setTargetAtTime(this.sfxEnabled ? this.sfxVolume : 0, this._ctx.currentTime, 0.1);
    }

    /** Volume musica 0-1 (salvato) */
    setMusicVolume(v) {
        this.musicVolume = Math.max(0, Math.min(1, +v || 0));
        this._savePrefs();
        if (this._musicGain && this._ctx) this._musicGain.gain.setTargetAtTime(this.musicEnabled ? this.musicVolume : 0, this._ctx.currentTime, 0.08);
    }

    /** Volume effetti 0-1 (salvato) */
    setSfxVolume(v) {
        this.sfxVolume = Math.max(0, Math.min(1, +v || 0));
        this._savePrefs();
        if (this._sfxGain && this._ctx) this._sfxGain.gain.setTargetAtTime(this.sfxEnabled ? this.sfxVolume : 0, this._ctx.currentTime, 0.08);
    }

    /** Volume del pubblico 0-1 (salvato), relativo agli effetti */
    setCrowdVolume(v) {
        this.crowdLevel = Math.max(0, Math.min(1, +v || 0));
        this._savePrefs();
        if (this._ctx && this._crowdGain && this._crowdWanted) this._setCrowdIntensity(this._crowdIntensity == null ? 0.42 : this._crowdIntensity, 0.2);
    }

    // ── rotolio dei pattini: loop sempre attivo, volume pilotato dal gioco ──
    _startRollLoop() {
        if (!this._buffers.roll || this._rollNode) return;
        const src = this._ctx.createBufferSource();
        src.buffer = this._buffers.roll; src.loop = true;
        const lp = this._ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
        this._rollGain = this._ctx.createGain(); this._rollGain.gain.value = 0;
        this._rollFilter = lp;
        src.connect(lp).connect(this._rollGain).connect(this._sfxGain);
        src.start();
        this._rollNode = src;
    }

    /** 0 = nessuno pattina, 1 = tutti a tutta velocità */
    setRollIntensity(k) {
        if (!this._rollGain) return;
        const t = this._ctx.currentTime, kk = Math.max(0, Math.min(1, k));
        this._rollGain.gain.setTargetAtTime(kk * 0.32, t, 0.15);
        this._rollFilter.frequency.setTargetAtTime(500 + kk * 1500, t, 0.2);
        this._rollNode.playbackRate.setTargetAtTime(0.8 + kk * 0.5, t, 0.2);
    }

    // ─────────────────────────────────────────────────────────
    // API PUBBLICA — hook da chiamare nei punti chiave del gioco
    // ─────────────────────────────────────────────────────────

    /** Fischio iniziale — arbitro al centro pista */
    playWhistle(short = false) {
        this._whenReady(() => {
            if (this._fileBuffers.whistle) {
                if (short) this._playFile('whistle', 0.62, 1.04, { duration: 0.42 });
                else this._playFile('whistle', 0.7, 1);
                return;
            }
            this._play('whistle', 0.78, short ? 200 : 0);
        });
    }

    /** VIA! — disco sul parquet */
    playFaceoffDrop() {
        this._whenReady(() => {
            this._play('stickClash', 0.72, (Math.random() - 0.5) * 100);
            setTimeout(() => {
                if (!this._playFile('puckHit', 0.45, 0.9 + Math.random() * 0.1)) this._play('puckImpact', 0.55, -200);
            }, 60);
        });
    }

    /** GOL — tromba da arena + esplosione folla */
    playGoalHorn() {
        this._whenReady(() => {
            this._play('goalHorn', 0.90, 0);
            // Folla esplode
            this._setCrowdIntensity(1.0, 0.15);
            setTimeout(() => this._play('goalHorn', 0.65, -1200), 950);
        });
    }

    /** Sirena + buzzer fine periodo */
    playPeriodBuzzer() {
        this._whenReady(() => {
            this._play('buzzer', 0.88);
            setTimeout(() => this._play('buzzer', 0.72, -300), 400);
            this._setCrowdIntensity(0.8, 0.3);
        });
    }

    /** Tiro in porta — impatto disco */
    playPuckHit(power = 0.5) {
        this._whenReady(() => {
            const gain   = 0.3 + power * 0.65;
            const detune = power > 0.75 ? -300 : (Math.random() - 0.5) * 150;
            // tiro forte = colpo più grave; leggera variazione casuale per non ripetere lo stesso suono
            const rate = 1.1 - power * 0.22 + (Math.random() - 0.5) * 0.08;
            if (!this._playFile('puckHit', 0.35 + power * 0.65, rate)) this._play('puckImpact', gain, detune);
            if (power > 0.5) {
                setTimeout(() => this._play('puckSlide', 0.3 * power), 55);
            }
        });
    }

    /** Disco rimbalza sulla balaustra */
    playBoardBounce() {
        this._whenReady(() => {
            this._play('puckImpact', 0.48, (Math.random() - 0.5) * 400);
        });
    }

    /** Cambio linea rapido */
    playLineChange() {
        this._whenReady(() => {
            this._play('lineChange', 0.60, 0);
        });
    }

    /** Pattino sul parquet */
    playSkateSwish(speed = 1) {
        if (!this._ready) return;
        // Throttle: evita flood di suoni
        const now = this._ctx ? this._ctx.currentTime : 0;
        if (!this._lastSkateTime || (now - this._lastSkateTime) > 0.18) {
            this._play('skateSwish', 0.22 * Math.min(1, speed / 8), (Math.random() - 0.5) * 300);
            this._lastSkateTime = now;
        }
    }

    /** Annuncio PA pre-partita (intro squadre) */
    playPaDing() {
        this._whenReady(() => {
            this._play('paDing', 0.65);
        });
    }

    /** Passaggio */
    playPass() {
        this._whenReady(() => {
            if (!this._playFile('puckHit', 0.32, 1.15 + Math.random() * 0.12)) this._play('pass', 0.55, (Math.random() - 0.5) * 200);
        });
    }

    /** Tocco di bastone mentre si conduce il disco (limitato nel tempo) */
    playStickTap() {
        if (!this._ready) return;
        const now = this._ctx.currentTime;
        if (this._lastTap && now - this._lastTap < 0.22) return;
        this._lastTap = now;
        this._play('stickTap', 0.28, (Math.random() - 0.5) * 300);
    }

    /** Parata del portiere: colpo sordo + "ooh" del pubblico */
    playSave() {
        this._whenReady(() => {
            this._play('save', 0.8, (Math.random() - 0.5) * 200);
            this._playFile('puckHit', 0.4, 0.82 + Math.random() * 0.08);
            this.playCrowdOoh(0.6);
        });
    }

    /** Reazione del pubblico a un'occasione */
    playCrowdOoh(gain = 0.6) {
        this._whenReady(() => this._play('crowdOoh', gain, (Math.random() - 0.5) * 150));
    }

    /** Disco contro la balaustra (intensità 0-1, con limite di frequenza) */
    playBoardHit(k = 0.5) {
        if (!this._ready) return;
        const now = this._ctx.currentTime;
        if (this._lastBoard && now - this._lastBoard < 0.08) return;
        this._lastBoard = now;
        this._play('boardThud', 0.25 + k * 0.6, (Math.random() - 0.5) * 300);
    }

    /** Clic dei pulsanti dell'interfaccia */
    playUiClick() {
        if (!this._ready) return;
        this._play('uiClick', 0.5, (Math.random() - 0.5) * 100);
    }

    /** Contrasto/bodycheck */
    playBodycheck() {
        this._whenReady(() => {
            this._play('stickClash', 0.60, (Math.random() - 0.5) * 200);
            setTimeout(() => this._play('puckImpact', 0.45, -500), 35);
        });
    }

    // ─────────────────────────────────────────────────────────
    // FOLLA DINAMICA (loop continuo modulato)
    // ─────────────────────────────────────────────────────────

    /**
     * Avvia il loop di folla in background.
     * @param {'ambient'|'cheer'} type
     */
    startCrowdLoop(type = 'ambient') {
        this._whenReady(() => {
            // Versione registrata: brusio "crowd normal" sempre in sottofondo (basso e ovattato),
            // "crowd goal" come esplosione una tantum sopra il brusio
            if (type === 'cheer' && this._fileBuffers.crowdGoal) {
                this._crowdWanted = 'ambient';
                if (this._fileBuffers.crowdNormal) this._startCrowdBed();
                this._playCrowdGoal();
                return;
            }
            if (type !== 'cheer' && this._fileBuffers.crowdNormal) {
                this._crowdWanted = 'ambient';
                this._startCrowdBed();
                return;
            }
            this._crowdWanted = type;
            this._stopCrowdLoop();
            const bufName = type === 'cheer' ? 'crowdCheer' : 'crowdAmbient';
            if (!this._buffers[bufName]) return;

            const src = this._ctx.createBufferSource();
            src.buffer = this._buffers[bufName];
            src.loop   = true;
            src.connect(this._crowdGain);
            src.start();
            this._crowdLoopNode = src;

            // Fai salire gradualmente
            this._setCrowdIntensity(type === 'cheer' ? 1 : 0.42, 1.2);
        });
    }

    /** Avvia (una volta sola) il loop registrato del pubblico: passa-basso e volume molto contenuto */
    _startCrowdBed() {
        if (this._crowdBedNode) { this._setCrowdIntensity(0.42, 1.5); return; }
        this._stopCrowdLoop();
        const ctx = this._ctx;
        const src = ctx.createBufferSource();
        src.buffer = this._fileBuffers.crowdNormal;
        src.loop = true;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1500;       // ovattato: niente voci in primo piano
        lp.Q.value = 0.5;
        src.connect(lp).connect(this._crowdGain);
        // parte da un punto casuale del file per non ripetere sempre lo stesso inizio
        src.start(ctx.currentTime, Math.random() * Math.max(0, src.buffer.duration - 1));
        this._crowdBedNode = src;
        this._crowdGain.gain.cancelScheduledValues(ctx.currentTime);
        this._crowdGain.gain.setValueAtTime(0, ctx.currentTime);
        this._crowdIntensity = null;
        this._setCrowdIntensity(0.42, 2.5);
    }

    /** Esultanza registrata al gol (una tantum, sopra il brusio) */
    _playCrowdGoal() {
        if (this._crowdGoalNode) { try { this._crowdGoalNode.stop(); } catch (e) {} }
        const g = this._ctx.createGain();
        g.gain.value = 0.62 * this.crowdLevel;
        g.connect(this._sfxGain);
        const src = this._ctx.createBufferSource();
        src.buffer = this._fileBuffers.crowdGoal;
        src.connect(g);
        src.start();
        src.onended = () => { if (this._crowdGoalNode === src) this._crowdGoalNode = null; };
        this._crowdGoalNode = src;
    }

    _stopCrowdLoop() {
        if (this._crowdLoopNode) {
            try { this._crowdLoopNode.stop(); } catch (e) {}
            this._crowdLoopNode = null;
        }
    }

    /** Ferma tutto il pubblico (ritorno al menu) */
    stopCrowd() {
        this._crowdWanted = null;
        this._stopCrowdLoop();
        if (this._crowdBedNode) { try { this._crowdBedNode.stop(); } catch (e) {} this._crowdBedNode = null; }
        if (this._crowdGoalNode) { try { this._crowdGoalNode.stop(); } catch (e) {} this._crowdGoalNode = null; }
        if (this._crowdGain && this._ctx) {
            this._crowdGain.gain.cancelScheduledValues(this._ctx.currentTime);
            this._crowdGain.gain.setValueAtTime(0, this._ctx.currentTime);
        }
        this._crowdIntensity = null;
    }

    /**
     * Modula l'intensità della folla in modo fluido.
     * @param {number} targetGain  0-1
     * @param {number} rampTime    secondi per il ramp
     */
    _setCrowdIntensity(targetGain, rampTime = 0.5) {
        if (!this._ctx || !this._crowdGain) return;
        this._crowdIntensity = targetGain;
        // con il brusio registrato l'intensità resta in una fascia bassa (0,6x – 1,4x del livello di fondo)
        const scaledGain = (this._crowdBedNode
            ? this._crowdBedLevel * (0.6 + 0.8 * Math.max(0, Math.min(1, targetGain)))
            : targetGain * this.crowdVolume) * this.crowdLevel;
        const g = this._crowdGain.gain, t = this._ctx.currentTime;
        g.cancelScheduledValues(t);
        g.setValueAtTime(g.value, t);
        g.linearRampToValueAtTime(scaledGain, t + rampTime);
    }

    /**
     * Fa scendere la folla gradualmente (dopo il gol, replay, ecc.)
     * @param {number} targetGain  0-1
     * @param {number} rampTime    secondi
     */
    setCrowdIntensity(targetGain, rampTime = 1.0) {
        this._whenReady(() => this._setCrowdIntensity(targetGain, rampTime));
    }

    /** Stop completo */
    stopAll() {
        this.stopCrowd();
        if (this._ambientNode) {
            try { this._ambientNode.stop(); } catch (e) {}
            this._ambientNode = null;
        }
        if (this._ctx) {
            this._ctx.suspend();
        }
    }

    /** Resume dopo focus restore */
    resume() {
        if (this._ctx && this._ctx.state === 'suspended') {
            this._ctx.resume();
        }
    }
}

/** Istanza singleton globale */
export const audioManager = new AudioManager();
