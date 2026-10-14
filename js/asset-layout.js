/* =====================================================================
 * asset-layout.js – Aufbau der HD-PNG-Dateien
 *
 * Wird von BEIDEN Seiten benutzt:
 *   - generate-assets.html zeichnet die PNGs genau in diesem Raster
 *   - BootScene.js schneidet die geladenen PNGs mit denselben Angaben
 *     wieder in einzelne Texturen/Frames
 * Wer hier etwas ändert, muss die PNGs neu generieren.
 * ===================================================================== */

// Dateien im Ordner assets/ (Schlüssel = interner Name beim Laden)
const ASSET_FILES = {
  jessica: 'assets/jessica.png',
  simon: 'assets/simon.png',
  sven_family: 'assets/sven_family.png',
  parents: 'assets/parents.png',
  tileset: 'assets/albis_tileset.png',
  parallax: 'assets/parallax_bg.png'
};

// Jessica & Simon: eine Zeile, Frames nebeneinander (24×32, 1:1 – keine Hochskalierung)
const HIKER_SHEET = {
  frameW: 24,
  frameH: 32,
  frames: ['idle', 'run1', 'run2', 'run3', 'run4', 'run5', 'run6', 'jump', 'fall']
};

// Tante Edith (Zeile 0) & Onkel Kurt (Zeile 1), je 4 Frames à 32×48
const PARENTS_SHEET = {
  frameW: 32,
  frameH: 48,
  rows: { edith: 0, kurt: 1 },
  frames: ['idle', 'wave', 'walk1', 'walk2']
};

// Sven mit Kraxe: 4 Frames à 40×48 (Körpermitte bei x = 27), darunter die Tochter (16×26)
const SVEN_SHEET = {
  frameW: 40,
  frameH: 48,
  frames: ['idle', 'wave', 'walk1', 'walk2'],
  daughter: { x: 0, y: 48, w: 16, h: 26 }
};

// Tileset: Name → [x, y, Breite, Höhe] (32er-Raster), frames = waagrecht aufgeteilt
const TILESET_LAYOUT = {
  size: [256, 128],
  tiles: {
    grass0: [0, 0, 32, 32], grass1: [32, 0, 32, 32], grass2: [64, 0, 32, 32],
    earth0: [96, 0, 32, 32], earth1: [128, 0, 32, 32],
    rock: [160, 0, 32, 32], stone: [192, 0, 32, 32], door: [224, 0, 32, 32],
    crate: [0, 32, 32, 32], pushCrate: [32, 32, 32, 32], waterDeep: [64, 32, 32, 32],
    waterTop: [96, 32, 128, 32, 4],
    lever_off: [224, 32, 32, 32],
    lever_on: [0, 64, 32, 32],
    platform: [32, 64, 32, 12], bridgePlank: [64, 64, 32, 12],
    plate_1_up: [96, 64, 32, 10], plate_1_down: [128, 64, 32, 10],
    plate_2_up: [160, 64, 32, 10], plate_2_down: [192, 64, 32, 10],
    plate_any_up: [224, 64, 32, 10], plate_any_down: [0, 96, 32, 10]
  }
};

// Parallax-Hintergrund: Ebenen untereinander
const PARALLAX_LAYOUT = {
  size: [960, 1490],
  layers: {
    skyImage: [0, 0, 960, 540],
    mountainsFar: [0, 540, 960, 260],
    mountains: [0, 800, 960, 300],
    hills: [0, 1100, 960, 220],
    forest: [0, 1320, 960, 170]
  }
};
