/* =====================================================================
 * config.js – Zentrale Einstellungen für "Albishorn Climbers"
 * Alles, was man zum Feintuning anfassen möchte, steht hier:
 * Physik, Steuerung, Namen, Dialoge, Abspann.
 * ===================================================================== */

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;
const TILE = 32;                 // Kachelgrösse in Pixeln

// Schriftart für alle Texte (wird in index.html von Google Fonts geladen)
const FONT = '"Press Start 2P", monospace';

// --- Spielphysik ----------------------------------------------------------
// Sprunghöhe ≈ JUMP_VELOCITY² / (2 · GRAVITY) ≈ 112 px ≈ 3.5 Kacheln.
// Wände mit 4+ Kacheln Höhe schafft man nur über eine Mechanik (Aufzug,
// Kiste, Brücke …) – die Spieler können nicht aufeinander stehen.
const PHYSICS = {
  GRAVITY: 1400,
  RUN_SPEED: 200,          // maximale Laufgeschwindigkeit
  ACCEL_GROUND: 1800,      // wie schnell man am Boden beschleunigt/bremst
  ACCEL_AIR: 1100,         // Luftsteuerung (etwas träger)
  JUMP_VELOCITY: 560,
  JUMP_CUT: 0.45,          // Sprungtaste früh loslassen = kleinerer Sprung
  MAX_FALL: 720,
  COYOTE_MS: 90,           // kurz nach Kante verlassen darf man noch springen
  JUMP_BUFFER_MS: 120      // Sprung kurz VOR der Landung gedrückt zählt trotzdem
};

// Schiebbare Blöcke ('k' = Kiste, 'K' = Felsbrocken)
const BLOCKS = {
  PUSH_SPEED: 70,          // so schnell rutscht ein geschobener Block
  CRATE_WEIGHT: 1,         // so viele Spieler braucht eine Kiste
  BOULDER_WEIGHT: 2        // … und ein Felsbrocken
};

// Wie weit dürfen sich die Spieler horizontal voneinander entfernen?
// (Damit beide immer gemeinsam im Bild sind – wie bei SNES-Koop-Spielen.)
const MAX_PLAYER_SPREAD = GAME_WIDTH - 96;

// =====================================================================
// PERSONEN
// =====================================================================
const CAST = {
  player1: { first: 'Jessica', full: 'Jessica Kistler', born: 'Kammer', role: 'Cousine' },
  player2: { first: 'Simon', full: 'Simon Kammer', role: 'Cousin' },
  cousin:  { first: 'Sven', full: 'Sven Kammer', role: 'der absolute Lieblingscousin' },
  aunt:    'Tante Edith',
  uncle:   'Onkel Kurt'
};

/**
 * Platzhalter in Texten (Infotafeln, Dialoge) durch Namen ersetzen:
 *   {P1} {P2} {COUSIN} {AUNT} {UNCLE} {PARENTS}
 */
const NAME_TOKENS = {
  P1: CAST.player1.first,
  P2: CAST.player2.first,
  COUSIN: CAST.cousin.first,
  AUNT: CAST.aunt,
  UNCLE: CAST.uncle,
  PARENTS: `${CAST.aunt} & ${CAST.uncle}`
};
function fillNames(text) {
  return String(text).replace(/\{(\w+)\}/g, (match, key) => (key in NAME_TOKENS ? NAME_TOKENS[key] : match));
}

// --- Spieler-Definitionen ------------------------------------------------
// Tastenbelegung + Gamepad-Index (0 = Controller 1, 1 = Controller 2)
const PLAYER_DEFS = [
  {
    id: 1,
    name: CAST.player1.first,
    color: 0x1b6ee8,       // blau – wie Jessicas Rucksack
    colorCss: '#5aa2ff',
    texture: 'hiker1',
    keys: { left: 'A', right: 'D', up: 'W', down: 'S', jump: 'SPACE', action: 'E' },
    padIndex: 0
  },
  {
    id: 2,
    name: CAST.player2.first,
    color: 0xd7263d,       // rot – wie Simons Rucksack
    colorCss: '#ff5a6e',
    texture: 'hiker2',
    keys: { left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN', jump: 'ENTER', action: 'SHIFT' },
    padIndex: 1
  }
];

// =====================================================================
// KONSOLEN-BRANDING (Startlogo in der IntroScene)
// =====================================================================
const CONSOLE = {
  name: 'KES',
  fullName: 'Kammer Entertainment Systems',
  license: 'Licensed by Lieblingscousin (1996–2026)'
};

// =====================================================================
// DIALOGE
// Sprecher → Name, Porträt-Textur (aus der BootScene) und Namensfarbe.
// Zeilen: { who: 'kurt', text: '…' } – Platzhalter wie {P1} sind erlaubt.
// =====================================================================
const SPEAKERS = {
  narrator: { name: '', portrait: null, color: '#f7d117' },
  jessica:  { name: CAST.player1.first, portrait: 'portrait_hiker1', color: '#5aa2ff' },
  simon:    { name: CAST.player2.first, portrait: 'portrait_hiker2', color: '#ff5a6e' },
  edith:    { name: CAST.aunt, portrait: 'portrait_edith', color: '#7dff9a' },
  kurt:     { name: CAST.uncle, portrait: 'portrait_kurt', color: '#ffb070' },
  sven:     { name: CAST.cousin.first, portrait: 'portrait_sven', color: '#f7d117' }
};

const STORY = {
  // Vor Level 1 (nach "Spiel starten")
  intro: [
    { who: 'narrator', text: 'Ebertswil, vor vielen, vielen Jahren …' },
    { who: 'kurt', text: 'So, Kinder! Schuhe binden – heute wandern wir aufs Albishorn!' },
    { who: 'simon', text: 'Muss das sein? Da ist es doch so steil …' },
    { who: 'edith', text: 'Keine Sorge, es ist nicht mehr weit!' },
    { who: 'jessica', text: 'Mama, wir sind noch nicht mal losgelaufen.' },
    { who: 'kurt', text: 'Oben gibt es eine Glace. Und euer Cousin {COUSIN} wartet auch schon!' },
    { who: 'narrator', text: 'Hilf {P1} und {P2} hinauf aufs Albishorn. Allein schafft es keiner – nur zusammen!' }
  ],

  // Gipfel: Jessica & Simon treffen Sven am Aussichtsturm
  summit: [
    { who: 'sven', text: 'Henders au scho gschafft ihr alte Seck?!? Alles gueti zum 30. Geburtstag =)' }
  ]
};

// --- Geburtstags-Finale ----------------------------------------------------
const BIRTHDAY = {
  names: [CAST.player1.first, CAST.player2.first],
  age: 30,
  secretCode: '3030',      // Passwort, das direkt zur Geburtstagsfeier springt
  message: [
    'Vor vielen Jahren habt ihr diesen Weg gehasst.',
    'Heute habt ihr ihn gemeinsam bezwungen –',
    'Schalter für Schalter, Hebel für Hebel.',
    '',
    'Auf die nächsten 30 Jahre voller Gipfel,',
    'Abenteuer und Teamwork!',
    '',
    'Und keine Sorge: Ab hier geht es nur noch bergab.'
  ]
};

// =====================================================================
// ABSPANN (CreditsScene) – von oben nach unten
// =====================================================================
const CREDITS = [
  { title: 'Ein Spiel zum 30. Geburtstag von', names: [`${CAST.player1.first} & ${CAST.player2.first}`] },
  { title: 'Game Design & Story', names: [CAST.cousin.full] },
  { title: 'Die leidgeprüften Hauptdarsteller', names: [`${CAST.player1.full} & ${CAST.player2.full}`] },
  { title: 'Reiseleitung & Wandermotivation', names: [`${CAST.aunt} & ${CAST.uncle}`] },
  { title: 'System Engine', names: [`${CONSOLE.name} / Phaser 3 & Claude AI`] },
  { title: '', names: ['Danke fürs Mitwandern!', '', 'HAPPY BIRTHDAY!'] }
];

// --- Passwort-System ------------------------------------------------------
// Jedes Level hat einen 4-stelligen Code. Die Codes stehen bei den Levels
// in levels.js (Feld "password"). Hier nur die Helferfunktionen.
const Passwords = {
  /** Liefert den Level-Index (0-basiert) zu einem Code – oder -1. */
  findLevel(code) {
    return LEVELS.findIndex(l => l.password === code);
  },
  /** Code für einen Level-Index. */
  forLevel(index) {
    return LEVELS[index] ? LEVELS[index].password : null;
  }
};
