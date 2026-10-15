/* =====================================================================
 * SspConfig.js – Super Sempach Party: Spieleliste, Party-Ablauf, Sounds
 *
 * Jessica (Spielerin 1) gegen Simon (Spieler 2) in 5 Camping-Minispielen
 * am Sempachersee. Jedes Minispiel ist eine eigene Szene in js/ssp/minigames/
 * und erbt von MinigameScene (Intro, Countdown, HUD, Pause, Ergebnis).
 *
 * Knöpfe in den Minispielen:
 *   A = Sprung (Controller A / Kreuz, Tastatur Leertaste bzw. Enter)
 *   B = Aktion (Controller B / Kreis, Tastatur E bzw. Shift)
 * ===================================================================== */

const SSP = {
  title: 'SUPER SEMPACH PARTY',
  subtitle: 'Das Camping-Duell am Sempachersee',
  keyLegend: 'A = Leertaste / Enter / Pad-A     B = E / Shift / Pad-B',

  // Reihenfolge = Reihenfolge im Party-Modus
  minigames: [
    {
      key: 'SspPedalo', name: 'PEDALO-POWER',
      desc: 'Pedalo-Rennen über den Sempachersee! Wer zuerst am Ziel ist, gewinnt. Achtung, Enten!',
      controls: 'A und B ABWECHSELND = strampeln     HOCH / RUNTER = Spur wechseln (3 Spuren)'
    },
    {
      key: 'SspWasser', name: 'WASSER-MARSCH!',
      desc: 'Feuerwehrübung: Pumpe Druck auf und spritze alle 5 Zielscheiben um. Mehr Druck = höherer Strahl!',
      controls: 'HOCH / RUNTER abwechselnd = pumpen     LINKS / RECHTS = zielen     A halten = spritzen'
    },
    {
      key: 'SspGrill', name: 'GRILL-MEISTER',
      desc: 'Wende die Würste im richtigen Moment: im grünen Bereich gibt es PERFEKT, im roten verkohlen sie!',
      controls: 'LINKS / RECHTS = Wurst wählen     A = wenden'
    },
    {
      key: 'SspRundkurs', name: 'CAMPING-RUNDKURS',
      desc: 'Inline-Rennen um den Campingplatz – 2 Runden. Stosse im Takt ab und spring über Zeltleinen und Stühle!',
      controls: 'LINKS / RECHTS im Takt = abstossen     A = springen'
    },
    {
      key: 'SspBrennessel', name: 'BRENNESSEL-ALARM!',
      desc: 'Fangis mit dem Brennessel-Strauch! Wer ihn hat, muss den anderen treffen. Wer getroffen wird, ist dran.',
      controls: 'LINKS / RECHTS = laufen     A = springen     B = Schild (nur auf der Flucht)'
    }
  ],

  byKey(key) { return this.minigames.find(m => m.key === key); }
};

/* ---------------------------------------------------------------------
 * Party-Ablauf: Party (alle 5 nacheinander) oder einzelnes Minispiel.
 * Nach jedem Spiel: Zwischenstand (Party) bzw. direkt Siegerehrung.
 * ------------------------------------------------------------------- */
const SspParty = {
  state: null,

  startParty(scene) {
    this.state = { mode: 'party', order: SSP.minigames.map(m => m.key), index: 0, wins: { 1: 0, 2: 0 }, results: [] };
    this.go(scene, this.state.order[0]);
  },

  startSingle(scene, key) {
    this.state = { mode: 'single', order: [key], index: 0, wins: { 1: 0, 2: 0 }, results: [] };
    this.go(scene, key);
  },

  /** Ergebnis eines Minispiels merken. winner: 1, 2 oder 0 (unentschieden). */
  record(key, winner, score) {
    if (!this.state) this.state = { mode: 'single', order: [key], index: 0, wins: { 1: 0, 2: 0 }, results: [] };
    this.state.results.push({ key, winner, score: Object.assign({}, score) });
    if (winner) this.state.wins[winner]++;
  },

  /** Nach dem Ergebnis-Banner: nächstes Spiel (über den Zwischenstand) oder Siegerehrung. */
  advance(scene) {
    const s = this.state;
    s.index++;
    const next = s.mode === 'party' && s.index < s.order.length ? 'SspScoreScene' : 'SspAwardScene';
    this.fadeTo(scene, next);
  },

  nextKey() { return this.state && this.state.order[this.state.index]; },

  /** Gesamtsieger: 1, 2 oder 0 (Gleichstand). */
  champion() {
    const w = this.state ? this.state.wins : { 1: 0, 2: 0 };
    return w[1] > w[2] ? 1 : w[2] > w[1] ? 2 : 0;
  },

  go(scene, key) { this.fadeTo(scene, key); },

  fadeTo(scene, key, data) {
    scene.cameras.main.fadeOut(350, 0, 0, 0);
    scene.cameras.main.once('camerafadeoutcomplete', () => startWithLoading(scene, key, data));   // Minispiele: mit Dia-Show
  }
};

/** Name & Farbe eines Spielers (1 = Jessica, 2 = Simon). */
function sspPlayer(id) {
  const def = PLAYER_DEFS[id - 1];
  return { id, name: def.name, upper: def.name.toUpperCase(), color: def.color, css: def.colorCss, texture: def.texture };
}

// Zusätzliche Retro-Sounds für die Minispiele (gleiches Rezept-Format wie sfx.js)
Object.assign(Sfx.presets, {
  quack: [{ from: 520, to: 380, dur: 0.09, type: 'sawtooth', vol: 0.05 }, { from: 480, to: 340, dur: 0.1, type: 'sawtooth', vol: 0.05, delay: 0.11 }],
  stroke: [{ noise: true, dur: 0.05, vol: 0.05, filter: 'bandpass', freq: 900 }],
  pump: [{ from: 180, to: 320, dur: 0.07, type: 'square', vol: 0.04 }],
  spray: [{ noise: true, dur: 0.08, vol: 0.035, filter: 'highpass', freq: 2500 }],
  targetDown: [{ from: 600, to: 200, dur: 0.2, type: 'square', vol: 0.06 }, { noise: true, dur: 0.15, vol: 0.08, freq: 500, delay: 0.15 }],
  sizzle: [{ noise: true, dur: 0.25, vol: 0.06, filter: 'highpass', freq: 3000, freqTo: 1500 }],
  perfect: [{ from: 784, dur: 0.07 }, { from: 1047, dur: 0.12, delay: 0.07, type: 'triangle', vol: 0.08 }],
  burnt: [{ from: 200, to: 90, dur: 0.3, type: 'sawtooth', vol: 0.05 }],
  bonk: [{ noise: true, dur: 0.12, vol: 0.12, freq: 400, freqTo: 120 }, { from: 160, to: 70, dur: 0.18, type: 'sine', vol: 0.08 }],
  autsch: [{ from: 900, to: 300, dur: 0.25, type: 'square', vol: 0.06 }],
  block: [{ from: 1200, dur: 0.05, type: 'square', vol: 0.05 }, { noise: true, dur: 0.1, vol: 0.08, filter: 'highpass', freq: 2000 }],
  countdown: [{ from: 440, dur: 0.12, type: 'square', vol: 0.06 }],
  go: [{ from: 880, dur: 0.3, type: 'square', vol: 0.07 }]
});
