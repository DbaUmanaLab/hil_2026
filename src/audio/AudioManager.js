/**
 * src/audio/AudioManager.js
 *
 * Audio del gioco basato SOLO sui file dell'utente:
 *   - musica:  assets/audio/track_*.mp3        (playlist per contesto: menu, competizione, partita)
 *   - effetti: assets/audio effects/*.mp3       (pubblico, esultanza al gol, colpo del disco, fischietto)
 * In partita nessun suono sintetizzato: gli eventi senza un file dedicato riusano il file più vicino
 * (es. balaustra = colpo del disco più grave) oppure restano muti (pattini, annunci).
 * Unica eccezione i suoni dei menu (playUiSound), brevi e sintetizzati.
 *
 * Phaser gestisce l'unlock del AudioContext su mobile (tap-to-unlock).
 */

const AUDIO_PREFS_KEY = 'hil_audio_prefs';
const T = n => `assets/audio/track_${n}.mp3`;

/** Colonna sonora per contesto. track_5 non è usata: è identica a track_3. */
const BG_PLAYLISTS = {
    menu:        [T(1), T(2), T(3)],   // titoli, scelte squadre/maglie/palazzetto, caricamenti
    competition: [T(4)],               // schermate di Serie A e Coppa Italia
    match:       [T(6)]                // presentazione, riprese cinematiche, replay, pausa, statistiche
};

export class AudioManager {
    constructor() {
        this._ctx = null;
        this._masterGain = null;
        this._sfxGain = null;
        this._musicGain = null;
        this._crowdGain = null;
        this._ready = false;
        this._unlocked = false;
        this._pendingCalls = [];
        this.masterVolume = 0.82;

        /** Colonna sonora */
        this._bgVolume = 0.26;           // sottofondo: basso, per sentire bene i suoni dei menu e gli effetti
        this._bgWant = false;
        this._bgContext = 'menu';
        this._bgEl = null;
        this._bgGain = null;
        this._bgIdx = {};                // posizione nella playlist di ogni contesto
        this._bgPlaying = null;          // contesto della traccia caricata
        this._bgPauseT = null;
        this._bgSwapT = null;

        /** Effetti registrati */
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
        this._crowdGoalAt = 0;
        this._crowdWanted = null;
        this._crowdIntensity = null;

        /** Preferenze utente (salvate nel browser) */
        this.musicEnabled = true;
        this.sfxEnabled = true;
        this.musicVolume = 0.8;
        this.sfxVolume = 1;
        this.crowdLevel = 1;
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

    // ─────────────────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────────────────

    init(phaserScene) {
        if (this._ctx) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) { console.warn('[AudioManager] Web Audio API non supportata.'); return; }

        this._ctx = new AudioCtx();
        this._masterGain = this._ctx.createGain();
        this._masterGain.gain.value = this.masterVolume;
        this._masterGain.connect(this._ctx.destination);
        this._sfxGain = this._ctx.createGain();
        this._sfxGain.gain.value = this.sfxEnabled ? this.sfxVolume : 0;
        this._sfxGain.connect(this._masterGain);
        this._musicGain = this._ctx.createGain();
        this._musicGain.gain.value = this.musicEnabled ? this.musicVolume : 0;
        this._musicGain.connect(this._masterGain);
        this._crowdGain = this._ctx.createGain();
        this._crowdGain.gain.value = 0;
        this._crowdGain.connect(this._sfxGain);

        if (phaserScene && phaserScene.sound) phaserScene.sound.once('unlocked', () => this._onUnlock());
        if (this._ctx.state === 'running') {
            this._onUnlock();
        } else {
            // l'utente ha già interagito prima del 'load' (es. tasto o clic sulla schermata iniziale):
            // il browser consente già di avviare l'audio, senza aspettare un nuovo gesto
            if (navigator.userActivation && navigator.userActivation.hasBeenActive) {
                this._ctx.resume().then(() => { if (this._ctx.state === 'running') this._onUnlock(); }).catch(() => {});
            }
            this._onUserGesture(() => {
                if (this._ctx.state === 'suspended') this._ctx.resume();
                this._onUnlock();
            });
        }
    }

    /**
     * Esegue fn al primo gesto dell'utente. Ascolta sulla window in cattura e anche keyup/click:
     * la navigazione da tastiera dei menu (src/ui/uikit.js) ferma i keydown di frecce/Invio/Esc con
     * stopImmediatePropagation, quindi un semplice keydown su document non arrivava mai e con la
     * tastiera la musica non partiva. Il keyup cade comunque nell'attivazione transitoria del keydown.
     */
    _onUserGesture(fn) {
        const EVENTS = ['pointerdown', 'keydown', 'keyup', 'touchend', 'click'];
        const handler = () => {
            EVENTS.forEach(ev => window.removeEventListener(ev, handler, true));
            fn();
        };
        EVENTS.forEach(ev => window.addEventListener(ev, handler, true));
    }

    _onUnlock() {
        if (this._unlocked) return;
        this._unlocked = true;
        if (this._ctx && this._ctx.state === 'suspended') this._ctx.resume();
        this._loadFileSfx();
        this._ready = true;
        if (this._bgWant) this._bgApply();
        this._pendingCalls.forEach(fn => fn());
        this._pendingCalls = [];
    }

    _whenReady(fn) {
        if (this._ready) fn();
        else this._pendingCalls.push(fn);
    }

    setMasterVolume(v) {
        this.masterVolume = Math.max(0, Math.min(1, v));
        if (this._masterGain) this._masterGain.gain.value = this.masterVolume;
    }

    // ─────────────────────────────────────────────────────────
    // EFFETTI REGISTRATI
    // ─────────────────────────────────────────────────────────

    _loadFileSfx() {
        Object.entries(this._fileSfx).forEach(([name, url]) => {
            fetch(encodeURI(url))
                .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
                .then(ab => new Promise((res, rej) => this._ctx.decodeAudioData(ab, res, rej)))
                .then(buf => {
                    this._fileBuffers[name] = buf;
                    // il brusio era già stato richiesto prima che il file fosse pronto
                    if (name === 'crowdNormal' && this._crowdWanted === 'ambient') this._startCrowdBed();
                })
                .catch(err => console.warn('[AudioManager] effetto non caricato:', url, err));
        });
    }

    /** Riproduce un effetto registrato. rate < 1 = più grave, opts.duration = versione breve sfumata. */
    _playFile(name, gain = 1, rate = 1, opts = {}) {
        const buf = this._fileBuffers[name];
        if (!this._ready || !buf) return null;
        const src = this._ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = rate;
        const g = this._ctx.createGain();
        g.gain.value = gain;
        let out = g;
        if (opts.lowpass) {
            const lp = this._ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = opts.lowpass;
            g.connect(lp);
            out = lp;
        }
        src.connect(g);
        out.connect(opts.dest || this._sfxGain);
        const t = this._ctx.currentTime + (opts.delay || 0);
        if (opts.duration) {
            g.gain.setValueAtTime(gain, t + Math.max(0, opts.duration - 0.08));
            g.gain.linearRampToValueAtTime(0, t + opts.duration);
            src.start(t, 0, opts.duration + 0.02);
        } else {
            src.start(t);
        }
        return src;
    }

    // ─────────────────────────────────────────────────────────
    // COLONNA SONORA (MP3 dell'utente)
    // ─────────────────────────────────────────────────────────

    /**
     * true durante titoli, scelte, caricamenti e riprese cinematiche, false durante l'azione.
     * Sfuma in entrata/uscita e riprende il brano dal punto in cui si era fermato.
     */
    setBgMusic(on) {
        on = !!on;
        if (on === this._bgWant) return;
        this._bgWant = on;
        if (this._ready) this._bgApply();
    }

    /** Playlist da usare: 'menu', 'competition' o 'match'. Il cambio avviene con una dissolvenza. */
    setBgContext(name) {
        if (!BG_PLAYLISTS[name] || name === this._bgContext) return;
        this._bgContext = name;
        if (!this._ready || !this._bgEl || !this._bgWant) return;
        // dissolvenza in uscita, poi brano del nuovo contesto
        const g = this._bgGain.gain, t = this._ctx.currentTime;
        g.cancelScheduledValues(t);
        g.setValueAtTime(g.value, t);
        g.linearRampToValueAtTime(0, t + 0.8);
        clearTimeout(this._bgSwapT);
        this._bgSwapT = setTimeout(() => {
            if (this._bgPlaying !== this._bgContext) this._bgLoad(this._bgContext, false);
            this._bgApply();
        }, 850);
    }

    /** Compatibilità: i vecchi brani generati non esistono più */
    setMusicTrack() {}

    _bgEnsure() {
        if (this._bgEl || !this._ctx) return;
        const el = new Audio();
        el.preload = 'auto';
        this._bgEl = el;
        this._bgGain = this._ctx.createGain();
        this._bgGain.gain.value = 0;
        this._bgGain.connect(this._musicGain);          // rispetta volume e mute della musica
        this._ctx.createMediaElementSource(el).connect(this._bgGain);
        el.addEventListener('ended', () => this._bgLoad(this._bgContext, true, true));
        el.addEventListener('error', () => setTimeout(() => this._bgLoad(this._bgContext, true, true), 500));
        this._bgLoad(this._bgContext, false);
    }

    /** Carica il brano corrente (o il successivo) della playlist del contesto */
    _bgLoad(ctxName, autoplay, advance = false) {
        if (!this._bgEl) return;
        const list = BG_PLAYLISTS[ctxName];
        if (this._bgIdx[ctxName] == null) this._bgIdx[ctxName] = Math.floor(Math.random() * list.length);
        else if (advance || this._bgPlaying === ctxName) this._bgIdx[ctxName] = (this._bgIdx[ctxName] + 1) % list.length;
        this._bgEl.src = list[this._bgIdx[ctxName]];
        this._bgPlaying = ctxName;
        if (autoplay && this._bgWant) this._bgPlay();
    }

    _bgPlay() {
        const p = this._bgEl.play();
        if (p && p.catch) p.catch(() => {
            this._onUserGesture(() => { if (this._bgWant && this._bgEl.paused) this._bgPlay(); });
        });
    }

    _bgApply() {
        this._bgEnsure();
        if (!this._bgEl) return;
        if (this._bgWant && this._bgPlaying !== this._bgContext) this._bgLoad(this._bgContext, false);
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

    /**
     * Momenti forti (gol, fine periodo, vittoria): niente stacchetti generati, si usa il pubblico registrato.
     */
    playStinger(name, delay = 0) {
        this._whenReady(() => {
            const go = () => {
                if (name === 'victory') { this._playCrowdGoal(0.55); this._setCrowdIntensity(1, 0.4); }
                else if (name === 'charge') this._crowdSwell(0.85, 2.2);
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

    setMusicVolume(v) {
        this.musicVolume = Math.max(0, Math.min(1, +v || 0));
        this._savePrefs();
        if (this._musicGain && this._ctx) this._musicGain.gain.setTargetAtTime(this.musicEnabled ? this.musicVolume : 0, this._ctx.currentTime, 0.08);
    }

    setSfxVolume(v) {
        this.sfxVolume = Math.max(0, Math.min(1, +v || 0));
        this._savePrefs();
        if (this._sfxGain && this._ctx) this._sfxGain.gain.setTargetAtTime(this.sfxEnabled ? this.sfxVolume : 0, this._ctx.currentTime, 0.08);
    }

    setCrowdVolume(v) {
        this.crowdLevel = Math.max(0, Math.min(1, +v || 0));
        this._savePrefs();
        if (this._ctx && this._crowdGain && this._crowdWanted) this._setCrowdIntensity(this._crowdIntensity == null ? 0.42 : this._crowdIntensity, 0.2);
    }

    /** Il rotolio dei pattini era sintetico: non c'è un file, resta muto */
    setRollIntensity() {}

    // ─────────────────────────────────────────────────────────
    // API PUBBLICA — eventi del gioco, tutti sui file registrati
    // ─────────────────────────────────────────────────────────

    /** Fischietto dell'arbitro (breve per ingaggi e interruzioni) */
    playWhistle(short = false) {
        this._whenReady(() => {
            if (short) this._playFile('whistle', 0.62, 1.04, { duration: 0.42 });
            else this._playFile('whistle', 0.7, 1);
        });
    }

    /** Ingaggio: il disco cade e i bastoni si incrociano */
    playFaceoffDrop() {
        this._whenReady(() => {
            this._playFile('puckHit', 0.3, 1.25, { duration: 0.3 });
            this._playFile('puckHit', 0.45, 0.9 + Math.random() * 0.1, { delay: 0.06 });
        });
    }

    /** Gol: esultanza registrata del pubblico */
    playGoalHorn() {
        this._whenReady(() => {
            this._playCrowdGoal();
            this._setCrowdIntensity(1.0, 0.15);
        });
    }

    /** Fine periodo: fischio lungo dell'arbitro */
    playPeriodBuzzer() {
        this._whenReady(() => {
            this._playFile('whistle', 0.75, 0.96);
            this._setCrowdIntensity(0.8, 0.3);
        });
    }

    /** Tiro: colpo del disco, più grave e forte quanto più è potente */
    playPuckHit(power = 0.5) {
        this._whenReady(() => {
            const rate = 1.1 - power * 0.22 + (Math.random() - 0.5) * 0.08;
            this._playFile('puckHit', 0.35 + power * 0.65, rate);
        });
    }

    /** Disco contro la balaustra: colpo del disco grave e ovattato */
    playBoardBounce() { this.playBoardHit(0.6); }

    playBoardHit(k = 0.5) {
        if (!this._ready) return;
        const now = this._ctx.currentTime;
        if (this._lastBoard && now - this._lastBoard < 0.08) return;
        this._lastBoard = now;
        this._playFile('puckHit', 0.25 + k * 0.55, 0.62 + Math.random() * 0.08, { lowpass: 1400 });
    }

    /** Cambio linea: nessun file dedicato */
    playLineChange() {}

    /** Pattini: nessun file dedicato */
    playSkateSwish() {}

    /** Annuncio dello speaker: nessun file dedicato */
    playPaDing() {}

    /** Passaggio: colpo del disco leggero */
    playPass() {
        this._whenReady(() => {
            this._playFile('puckHit', 0.32, 1.15 + Math.random() * 0.12);
        });
    }

    /** Tocco di bastone mentre si conduce il disco: colpo del disco molto leggero */
    playStickTap() {
        if (!this._ready) return;
        const now = this._ctx.currentTime;
        if (this._lastTap && now - this._lastTap < 0.22) return;
        this._lastTap = now;
        this._playFile('puckHit', 0.1, 1.35 + Math.random() * 0.15, { duration: 0.15 });
    }

    /** Parata: colpo sordo sul portiere + il pubblico che si alza */
    playSave() {
        this._whenReady(() => {
            this._playFile('puckHit', 0.45, 0.78 + Math.random() * 0.08, { lowpass: 2200 });
            this._crowdSwell(0.8, 1.6);
        });
    }

    /** Occasione: il brusio registrato del pubblico sale per un attimo */
    playCrowdOoh(gain = 0.6) {
        this._whenReady(() => this._crowdSwell(0.55 + gain * 0.4, 1.4));
    }

    /** Compatibilità: clic generico dell'interfaccia */
    playUiClick() { this.playUiSound('select'); }

    /**
     * Suoni dei menu, sintetizzati (brevissimi, passano dal volume effetti):
     *  - 'move'    frecce e spostamento del fuoco da tastiera: tic acuto e leggero
     *  - 'select'  pulsanti che cambiano un valore restando nella schermata: clic medio
     *  - 'confirm' pulsanti che portano a un'altra sezione: colpo pieno e grave
     *  - 'back'    tornare indietro / chiudere: colpo grave che scende
     */
    playUiSound(kind = 'select') {
        if (!this._ready || !this._ctx || !this.sfxEnabled) return;
        const now = this._ctx.currentTime;
        // un solo suono per gesto (es. clic su un elemento dentro una tessera)
        if (this._uiLastT && now - this._uiLastT < 0.035) return;
        this._uiLastT = now;
        const ctx = this._ctx, out = this._sfxGain;
        const tone = (type, f0, f1, dur, gain, delay = 0, lp = 0) => {
            const t = now + delay;
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = type;
            o.frequency.setValueAtTime(f0, t);
            o.frequency.exponentialRampToValueAtTime(f1, t + dur);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g);
            if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; g.connect(f); f.connect(out); }
            else g.connect(out);
            o.start(t); o.stop(t + dur + 0.02);
        };
        const tick = (gain, freq, dur = 0.02) => {
            // transiente di rumore filtrato: dà il "clic" fisico al suono
            if (!this._uiNoise) {
                const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
                const d = b.getChannelData(0);
                for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
                this._uiNoise = b;
            }
            const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
            s.buffer = this._uiNoise;
            f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
            g.gain.setValueAtTime(gain, now);
            g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
            s.connect(f); f.connect(g); g.connect(out);
            s.start(now); s.stop(now + dur + 0.01);
        };
        if (kind === 'move') {
            tone('triangle', 2100, 2600, 0.045, 0.16);
            tick(0.05, 5000, 0.012);
        } else if (kind === 'confirm') {
            tone('sine', 150, 62, 0.22, 0.55);                 // tonfo grave
            tone('triangle', 520, 300, 0.12, 0.22, 0, 2400);   // corpo
            tone('triangle', 784, 784, 0.16, 0.12, 0.05, 3000); // piccola conferma tonale
            tick(0.22, 1400, 0.04);
        } else if (kind === 'back') {
            tone('sine', 130, 58, 0.2, 0.5);
            tone('triangle', 440, 330, 0.09, 0.16, 0, 2000);
            tone('triangle', 330, 247, 0.12, 0.12, 0.06, 2000);
            tick(0.18, 1100, 0.035);
        } else {
            tone('triangle', 1150, 980, 0.06, 0.2);
            tick(0.1, 2600, 0.02);
        }
    }

    /** Carica: impatto sordo (colpo del disco molto grave e filtrato) */
    playBodycheck() {
        this._whenReady(() => {
            this._playFile('puckHit', 0.5, 0.5 + Math.random() * 0.06, { lowpass: 900 });
        });
    }

    // ─────────────────────────────────────────────────────────
    // PUBBLICO (crowd normal in loop + crowd goal una tantum)
    // ─────────────────────────────────────────────────────────

    startCrowdLoop(type = 'ambient') {
        this._whenReady(() => {
            this._crowdWanted = 'ambient';
            if (this._fileBuffers.crowdNormal) this._startCrowdBed();
            if (type === 'cheer') this._playCrowdGoal();
        });
    }

    _startCrowdBed() {
        if (this._crowdBedNode) { this._setCrowdIntensity(0.42, 1.5); return; }
        const ctx = this._ctx;
        const src = ctx.createBufferSource();
        src.buffer = this._fileBuffers.crowdNormal;
        src.loop = true;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1500;       // ovattato: niente voci in primo piano
        lp.Q.value = 0.5;
        src.connect(lp).connect(this._crowdGain);
        src.start(ctx.currentTime, Math.random() * Math.max(0, src.buffer.duration - 1));
        this._crowdBedNode = src;
        this._crowdGain.gain.cancelScheduledValues(ctx.currentTime);
        this._crowdGain.gain.setValueAtTime(0, ctx.currentTime);
        this._crowdIntensity = null;
        this._setCrowdIntensity(0.42, 2.5);
    }

    /** Esultanza registrata (una sola alla volta: gol e "cheer" chiamati insieme non si sovrappongono) */
    _playCrowdGoal(level = 0.62) {
        if (!this._fileBuffers.crowdGoal) return;
        const now = this._ctx.currentTime;
        if (this._crowdGoalNode && now - this._crowdGoalAt < 1.5) return;
        if (this._crowdGoalNode) { try { this._crowdGoalNode.stop(); } catch (e) {} }
        const g = this._ctx.createGain();
        g.gain.value = level * this.crowdLevel;
        g.connect(this._sfxGain);
        const src = this._ctx.createBufferSource();
        src.buffer = this._fileBuffers.crowdGoal;
        src.connect(g);
        src.start();
        src.onended = () => { if (this._crowdGoalNode === src) this._crowdGoalNode = null; };
        this._crowdGoalNode = src;
        this._crowdGoalAt = now;
    }

    /** Il brusio sale fino a `peak` e torna al livello precedente dopo `hold` secondi */
    _crowdSwell(peak, hold) {
        if (!this._crowdBedNode) return;
        // livello a cui tornare: quello di prima del primo rialzo (rialzi ravvicinati non si accumulano)
        if (this._swellBase == null) this._swellBase = this._crowdIntensity == null ? 0.42 : this._crowdIntensity;
        const back = this._swellBase;
        this._setCrowdIntensity(Math.max(back, peak), 0.25);
        clearTimeout(this._swellT);
        this._swellT = setTimeout(() => { this._swellBase = null; this._setCrowdIntensity(back, 1.2); }, hold * 1000);
    }

    stopCrowd() {
        this._crowdWanted = null;
        clearTimeout(this._swellT);
        this._swellBase = null;
        if (this._crowdBedNode) { try { this._crowdBedNode.stop(); } catch (e) {} this._crowdBedNode = null; }
        if (this._crowdGoalNode) { try { this._crowdGoalNode.stop(); } catch (e) {} this._crowdGoalNode = null; }
        if (this._crowdGain && this._ctx) {
            this._crowdGain.gain.cancelScheduledValues(this._ctx.currentTime);
            this._crowdGain.gain.setValueAtTime(0, this._ctx.currentTime);
        }
        this._crowdIntensity = null;
    }

    /** Intensità del pubblico 0-1: resta in una fascia bassa (0,6x – 1,4x del livello di fondo) */
    _setCrowdIntensity(targetGain, rampTime = 0.5) {
        if (!this._ctx || !this._crowdGain) return;
        this._crowdIntensity = targetGain;
        const scaled = this._crowdBedLevel * (0.6 + 0.8 * Math.max(0, Math.min(1, targetGain))) * this.crowdLevel;
        const g = this._crowdGain.gain, t = this._ctx.currentTime;
        g.cancelScheduledValues(t);
        g.setValueAtTime(g.value, t);
        g.linearRampToValueAtTime(scaled, t + rampTime);
    }

    setCrowdIntensity(targetGain, rampTime = 1.0) {
        this._whenReady(() => this._setCrowdIntensity(targetGain, rampTime));
    }

    stopAll() {
        this.stopCrowd();
        if (this._ctx) this._ctx.suspend();
    }

    resume() {
        if (this._ctx && this._ctx.state === 'suspended') this._ctx.resume();
    }

    /** App in background (tasto Home della TV, cambio scheda): silenzia tutto senza fermare i loop. */
    suspend() {
        if (this._ctx && this._ctx.state === 'running') this._ctx.suspend();
    }
}

/** Istanza singleton globale */
export const audioManager = new AudioManager();
