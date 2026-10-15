/* =====================================================================
 * sfx.js – Retro-Soundeffekte & Jingles, live per Web Audio erzeugt
 * (keine Audiodateien nötig).
 *
 *   Sfx.play(scene, 'jump')            einzelner Effekt
 *   Sfx.melody(scene, Sfx.songs.x)     kleine Melodie
 *   Sfx.toggleMute()                   Taste M in Menü & Spiel
 *
 * Ein Rezept ist eine Liste von Bausteinen:
 *   { from, to, dur, type, vol, delay }   Ton mit Tonhöhen-Rampe (Hz)
 *   { noise: true, dur, vol, delay, filter, freq, freqTo }
 *                                         gefiltertes Rauschen (Wasser, Steine …)
 * ===================================================================== */

const Sfx = {
  muted: false,
  _noiseBuffer: null,

  /** Ein Ton mit Tonhöhen-Rampe. */
  tone(ctx, { from, to = from, dur = 0.1, type = 'square', vol = 0.07, delay = 0 }, out = ctx.destination) {
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(out);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  },

  /** Gefiltertes weisses Rauschen (Plätschern, Rumpeln, Explosionen). */
  noise(ctx, { dur = 0.2, vol = 0.1, delay = 0, filter = 'lowpass', freq = 800, freqTo = freq }) {
    if (!this._noiseBuffer) {
      const len = ctx.sampleRate;   // 1 Sekunde Rauschen, wird wiederverwendet
      this._noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this._noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const biquad = ctx.createBiquadFilter();
    biquad.type = filter;
    biquad.frequency.setValueAtTime(freq, t0);
    biquad.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), t0 + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(biquad).connect(gain).connect(ctx.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  },

  // Sound-Rezepte
  presets: {
    // Bewegung
    jump:       [{ from: 300, to: 640, dur: 0.11, vol: 0.045 }],
    land:       [{ noise: true, dur: 0.06, vol: 0.05, freq: 600 }],

    // Edelweiss: kleines, glitzerndes Arpeggio
    collect: [
      { from: 1047, dur: 0.06, vol: 0.05 }, { from: 1319, dur: 0.06, vol: 0.05, delay: 0.06 },
      { from: 1568, dur: 0.06, vol: 0.05, delay: 0.12 }, { from: 2093, dur: 0.18, vol: 0.04, delay: 0.18, type: 'triangle' }
    ],

    // Schalter: "klack" + zwei Töne nach oben (drücken) bzw. unten (loslassen)
    plateDown: [
      { noise: true, dur: 0.05, vol: 0.08, freq: 1200 },
      { from: 392, dur: 0.07, vol: 0.06, delay: 0.03 }, { from: 523, dur: 0.1, vol: 0.06, delay: 0.1 }
    ],
    plateUp: [
      { noise: true, dur: 0.04, vol: 0.06, freq: 1500 },
      { from: 523, dur: 0.07, vol: 0.05, delay: 0.03 }, { from: 392, dur: 0.1, vol: 0.05, delay: 0.1 }
    ],

    // Hebel: Ratsch + kleine Fanfare "ta-da-daa"
    lever: [
      { noise: true, dur: 0.12, vol: 0.08, filter: 'bandpass', freq: 2000, freqTo: 600 },
      { from: 523, dur: 0.08, delay: 0.1 }, { from: 659, dur: 0.08, delay: 0.18 },
      { from: 784, dur: 0.22, delay: 0.26, type: 'triangle', vol: 0.08 }
    ],

    // Tor: tiefes Rumpeln
    door: [
      { from: 110, to: 55, dur: 0.4, type: 'sawtooth', vol: 0.04 },
      { noise: true, dur: 0.4, vol: 0.08, freq: 300, freqTo: 120 }
    ],
    // Kisten-Brücke erscheint: "plopp-plopp"
    bridge: [{ from: 330, to: 660, dur: 0.06 }, { from: 440, to: 880, dur: 0.08, delay: 0.08 }],

    // Wasser fliesst ab / läuft wieder voll
    waterDown: [
      { noise: true, dur: 0.9, vol: 0.09, freq: 2200, freqTo: 250 },
      { from: 880, to: 220, dur: 0.6, type: 'sine', vol: 0.05 }
    ],
    waterUp: [
      { noise: true, dur: 0.9, vol: 0.09, freq: 250, freqTo: 2000 },
      { from: 220, to: 660, dur: 0.6, type: 'sine', vol: 0.05 }
    ],
    splash: [
      { noise: true, dur: 0.35, vol: 0.14, filter: 'highpass', freq: 800, freqTo: 3000 },
      { from: 500, to: 150, dur: 0.25, type: 'sine', vol: 0.06 }
    ],

    // Block schieben: kurzes Schaben (wird beim Schieben wiederholt)
    push: [{ noise: true, dur: 0.12, vol: 0.05, freq: 350, freqTo: 200 }],
    blockLand: [{ noise: true, dur: 0.2, vol: 0.14, freq: 260, freqTo: 80 }, { from: 90, to: 50, dur: 0.15, vol: 0.06 }],
    tooHeavy: [{ from: 180, to: 150, dur: 0.12, vol: 0.04 }],

    // Sprint 4: Farbtasten (aufsteigende Töne je Schritt), Aufzug, Band, Zugbrücke
    seq0: [{ noise: true, dur: 0.04, vol: 0.06, freq: 1800 }, { from: 523, dur: 0.12, type: 'triangle', vol: 0.09 }],
    seq1: [{ noise: true, dur: 0.04, vol: 0.06, freq: 1800 }, { from: 659, dur: 0.12, type: 'triangle', vol: 0.09 }],
    seq2: [{ noise: true, dur: 0.04, vol: 0.06, freq: 1800 }, { from: 784, dur: 0.12, type: 'triangle', vol: 0.09 }],
    liftStart: [{ from: 90, to: 140, dur: 0.25, type: 'sawtooth', vol: 0.03 }, { noise: true, dur: 0.2, vol: 0.04, freq: 400 }],
    liftStop: [{ noise: true, dur: 0.1, vol: 0.07, freq: 500, freqTo: 150 }, { from: 140, to: 90, dur: 0.1, type: 'square', vol: 0.03 }],
    conveyor: [{ from: 120, to: 240, dur: 0.3, type: 'sawtooth', vol: 0.03 }, { noise: true, dur: 0.3, vol: 0.05, filter: 'bandpass', freq: 900 }],
    bridgeDown: [{ noise: true, dur: 0.5, vol: 0.06, filter: 'bandpass', freq: 600, freqTo: 300 }, { from: 220, to: 110, dur: 0.5, type: 'triangle', vol: 0.05 }],
    // Hindernisse: Bröckeln, Steinschlag, Baumstamm geht unter
    crumble:     [{ noise: true, dur: 0.5, vol: 0.05, filter: 'bandpass', freq: 900, freqTo: 500 }],
    crumbleFall: [{ noise: true, dur: 0.35, vol: 0.1, freq: 400, freqTo: 120 }],
    rumble:      [{ noise: true, dur: 0.8, vol: 0.08, freq: 180, freqTo: 90 }, { from: 60, to: 45, dur: 0.7, type: 'sawtooth', vol: 0.03 }],
    rockSmash:   [{ noise: true, dur: 0.3, vol: 0.12, freq: 500, freqTo: 100 }],
    boulderHit:  [{ noise: true, dur: 0.15, vol: 0.14, freq: 300, freqTo: 100 }, { from: 220, to: 80, dur: 0.25, type: 'square', vol: 0.06 }],
    logSink:     [{ noise: true, dur: 0.4, vol: 0.05, filter: 'highpass', freq: 900, freqTo: 400 }],
    // Rätsel-Mechaniken: Zeitschalter-Ticken, Zeit abgelaufen, Waage, Sandsack
    tick:       [{ from: 1400, dur: 0.03, type: 'square', vol: 0.035 }],
    tickFast:   [{ from: 2100, dur: 0.03, type: 'square', vol: 0.05 }],
    timeUp:     [{ from: 660, to: 220, dur: 0.3, type: 'square', vol: 0.06 }, { noise: true, dur: 0.15, vol: 0.06, freq: 500, delay: 0.25 }],
    scaleCreak: [{ from: 180, to: 120, dur: 0.3, type: 'sawtooth', vol: 0.025 }, { noise: true, dur: 0.25, vol: 0.03, filter: 'bandpass', freq: 700 }],
    perfectBalance: [{ from: 659, dur: 0.08, type: 'triangle', vol: 0.07 }, { from: 988, dur: 0.18, delay: 0.08, type: 'triangle', vol: 0.07 }],
    ballast:    [{ noise: true, dur: 0.4, vol: 0.05, filter: 'bandpass', freq: 500, freqTo: 250 }, { from: 140, to: 90, dur: 0.3, type: 'triangle', vol: 0.05 }],
    bridgeThud: [{ noise: true, dur: 0.25, vol: 0.16, freq: 300, freqTo: 80 }, { from: 100, to: 50, dur: 0.2, type: 'sine', vol: 0.1 }],

    checkpoint: [{ from: 660, dur: 0.08 }, { from: 880, dur: 0.08, delay: 0.08 }, { from: 1100, dur: 0.14, delay: 0.16 }],
    respawn:  [{ from: 700, to: 120, dur: 0.35, type: 'triangle', vol: 0.12 }],
    select:   [{ from: 660, dur: 0.05, vol: 0.05 }],
    slideClack: [{ noise: true, dur: 0.06, vol: 0.12, filter: 'highpass', freq: 1800 }, { from: 140, to: 70, dur: 0.08, type: 'square', vol: 0.05, delay: 0.02 },
      { noise: true, dur: 0.05, vol: 0.08, filter: 'bandpass', freq: 900, delay: 0.12 }],
    error:    [{ from: 160, dur: 0.12 }, { from: 120, dur: 0.2, delay: 0.12 }],
    levelStart: [
      { from: 392, dur: 0.1 }, { from: 523, dur: 0.1, delay: 0.1 }, { from: 659, dur: 0.1, delay: 0.2 },
      { from: 784, dur: 0.1, delay: 0.3 }, { from: 659, dur: 0.1, delay: 0.4 }, { from: 784, dur: 0.3, delay: 0.5, type: 'triangle', vol: 0.09 }
    ],
    win: [
      { from: 523, dur: 0.12 }, { from: 659, dur: 0.12, delay: 0.12 },
      { from: 784, dur: 0.12, delay: 0.24 }, { from: 1047, dur: 0.4, delay: 0.36 }
    ],

    // KES-Konsole einschalten: Funkel-Arpeggio + warmer Akkord
    kesBoot: [
      { from: 523, dur: 0.07, vol: 0.05 }, { from: 659, dur: 0.07, vol: 0.05, delay: 0.07 },
      { from: 784, dur: 0.07, vol: 0.05, delay: 0.14 }, { from: 1047, dur: 0.07, vol: 0.05, delay: 0.21 },
      { from: 1319, dur: 0.07, vol: 0.05, delay: 0.28 }, { from: 1568, dur: 0.1, vol: 0.04, delay: 0.35 },
      { from: 523, dur: 1.4, type: 'triangle', vol: 0.09, delay: 0.5 },
      { from: 659, dur: 1.4, type: 'triangle', vol: 0.07, delay: 0.5 },
      { from: 784, dur: 1.4, type: 'triangle', vol: 0.07, delay: 0.5 },
      { from: 1047, dur: 1.4, type: 'sine', vol: 0.05, delay: 0.5 }
    ],

    // Finale
    type:    [{ from: 1400, dur: 0.02, vol: 0.02 }],
    pop:     [{ noise: true, dur: 0.08, vol: 0.08, filter: 'highpass', freq: 2000 }],
    rocket:  [{ noise: true, dur: 0.6, vol: 0.04, filter: 'highpass', freq: 1500, freqTo: 6000 }],
    boom:    [{ noise: true, dur: 0.7, vol: 0.18, freq: 1200, freqTo: 80 }, { from: 120, to: 40, dur: 0.4, type: 'sine', vol: 0.1 }]
  },

  // Melodien: [Note, Länge in Schlägen]; 'R' = Pause
  songs: {
    // Gemütliche Wandermelodie für den Abspann
    credits: {
      bpm: 112,
      notes: [
        ['C5', 1], ['E5', 1], ['G5', 1], ['E5', 1], ['F5', 1], ['A5', 1], ['G5', 2],
        ['E5', 1], ['G5', 1], ['C6', 1], ['G5', 1], ['A5', 1], ['G5', 1], ['E5', 2],
        ['D5', 1], ['F5', 1], ['E5', 1], ['C5', 1], ['D5', 1], ['G4', 1], ['C5', 2],
        ['A4', 1], ['C5', 1], ['F5', 1], ['E5', 1], ['D5', 1], ['B4', 1], ['C5', 2], ['R', 2]
      ]
    },
    happyBirthday: {
      bpm: 150,
      notes: [
        ['G4', 0.75], ['G4', 0.25], ['A4', 1], ['G4', 1], ['C5', 1], ['B4', 2],
        ['G4', 0.75], ['G4', 0.25], ['A4', 1], ['G4', 1], ['D5', 1], ['C5', 2],
        ['G4', 0.75], ['G4', 0.25], ['G5', 1], ['E5', 1], ['C5', 1], ['B4', 1], ['A4', 2],
        ['F5', 0.75], ['F5', 0.25], ['E5', 1], ['C5', 1], ['D5', 1], ['C5', 3]
      ]
    }
  },

  /** Notenname (z. B. "A4", "C#5") → Frequenz in Hz. */
  noteFreq(name) {
    const m = /^([A-G])(#?)(\d)$/.exec(name);
    const semis = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) - 4) * 12;
    return 440 * Math.pow(2, semis / 12);
  },

  /** Liefert den AudioContext, falls Ton gerade erlaubt ist. */
  context(scene) {
    const ctx = scene.sound && scene.sound.context;
    return !this.muted && ctx && ctx.state === 'running' ? ctx : null;
  },

  play(scene, name) {
    const ctx = this.context(scene);
    const recipe = this.presets[name];
    if (!ctx || !recipe) return;
    recipe.forEach(part => (part.noise ? this.noise(ctx, part) : this.tone(ctx, part)));
  },

  /**
   * Spielt eine Melodie (mit Bass-Begleitung).
   * Gibt { duration, stop() } zurück – stop() bricht die Melodie ab.
   */
  melody(scene, song, startDelay = 0) {
    const beat = 60 / song.bpm;
    let t = startDelay;
    const ctx = this.context(scene);
    const bus = ctx ? ctx.createGain() : null;   // eigene Leitung, damit man sie abklemmen kann
    if (bus) bus.connect(ctx.destination);
    song.notes.forEach(([note, beats]) => {
      if (bus && note !== 'R') {
        const f = this.noteFreq(note);
        this.tone(ctx, { from: f, dur: beats * beat * 0.9, type: 'square', vol: 0.06, delay: t }, bus);
        this.tone(ctx, { from: f / 2, dur: beats * beat * 0.9, type: 'triangle', vol: 0.05, delay: t }, bus);
      }
      t += beats * beat;
    });
    return { duration: t - startDelay, stop: () => { if (bus) bus.disconnect(); } };
  },

  toggleMute() {
    this.muted = !this.muted;
    try { localStorage.setItem('albishorn-muted', this.muted ? '1' : '0'); } catch (e) { /* egal */ }
    return this.muted;
  }
};

// Stummschaltung aus dem letzten Besuch übernehmen
try { Sfx.muted = localStorage.getItem('albishorn-muted') === '1'; } catch (e) { /* egal */ }
