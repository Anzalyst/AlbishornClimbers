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
  // Tante Edith & Onkel Kurt sind Svens Eltern (und Hannahs Grosseltern)
  aunt:    'Tante Edith',
  uncle:   'Onkel Kurt',
  partner: 'Angi',         // Svens Frau
  daughter: 'Hannah',      // Svens Tochter, reist in der Kraxe mit
  cat:     'Ginny'         // die getigerte Familienkatze
};

/**
 * Platzhalter in Texten (Infotafeln, Dialoge) durch Namen ersetzen:
 *   {P1} {P2} {COUSIN} {AUNT} {UNCLE} {PARENTS} {PARTNER} {DAUGHTER} {CAT}
 */
const NAME_TOKENS = {
  P1: CAST.player1.first,
  P2: CAST.player2.first,
  COUSIN: CAST.cousin.first,
  AUNT: CAST.aunt,
  UNCLE: CAST.uncle,
  PARENTS: `${CAST.aunt} & ${CAST.uncle}`,
  PARTNER: CAST.partner,
  DAUGHTER: CAST.daughter,
  CAT: CAST.cat
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
  sven:     { name: CAST.cousin.first, portrait: 'portrait_sven', color: '#f7d117' },
  angi:     { name: CAST.partner, portrait: 'portrait_angi', color: '#ff9ad0' }
};

// Alle Dialoge auf Züritüütsch. Tante Edith & Onkel Kurt sind Svens Eltern –
// sie wandern mit Jessica & Simon los; Edith geht mit Jessica voraus.
const STORY = {
  // Vor Level 1 (nach "Spiil starte")
  intro: [
    { who: 'narrator', text: 'Ebertswil, vor vilne, vilne Jahr …' },
    { who: 'kurt', text: 'So, Chind! Schue binde – hüt wanderet mir ufs Albishorn!' },
    { who: 'simon', text: 'Mues das sii? Det ufe isch es doch so stotzig …' },
    { who: 'edith', text: 'Kei Angscht, es isch nüme wiit!' },
    { who: 'jessica', text: 'Tante Edith, mir sind jo no nöd emal losgloffe!' },
    { who: 'kurt', text: 'Obe gits e Glace. Und eue Cousin {COUSIN} wartet au scho!' },
    { who: 'edith', text: 'Chumm, {P1} – mir zwöi laufed voruus!' },
    { who: 'narrator', text: 'Hilf {P1} und {P2} ufs Albishorn ufe. Elei schafft’s keine – nume zäme!' }
  ],

  // Gipfel: Jessica & Simon treffen Sven, Angi, Hannah & Ginny am Aussichtsturm
  summit: [
    { who: 'sven', text: 'Henders au scho gschafft ihr alte Seck?!? Alles gueti zum 30. Geburtstag =)' },
    { who: 'angi', text: 'D {DAUGHTER} und d {CAT} händ scho ganz ungeduldig uf eu gwartet!' },
    { who: 'edith', text: 'Gsehnd er? Ich ha doch gseit, es isch nüme wiit!' }
  ]
};

// --- Geburtstags-Finale ----------------------------------------------------
const BIRTHDAY = {
  names: [CAST.player1.first, CAST.player2.first],
  age: 30,
  secretCode: ['sven', 'angi', 'hannah', 'ginny'],   // Passwort (Svens Familie) → direkt zur Geburtstagsfeier
  message: [
    'Vor vilne Jahr händ ihr dä Wäg ghasst.',
    'Hüt händ ihr ne zäme packt –',
    'Schalter für Schalter, Hebel für Hebel.',
    '',
    'Uf di nächschte 30 Jahr volle Gipfel,',
    'Abentüür und Teamwork!',
    '',
    'Und kei Angscht: Ab jetzt gaht’s nume no abe.'
  ]
};

// =====================================================================
// ABSPANN (CreditsScene) – von oben nach unten
// =====================================================================
const CREDITS = [
  { title: 'Es Spiil zum 30. Geburtstag vo', names: [`${CAST.player1.first} & ${CAST.player2.first}`] },
  { title: 'Spiilidee & Gschicht', names: [CAST.cousin.full] },
  { title: 'Di schwer prüefte Hauptdarsteller', names: [`${CAST.player1.full} & ${CAST.player2.full}`] },
  { title: 'Reiseleitig & Wandermotivation', names: [`${CAST.aunt} & ${CAST.uncle}`] },
  { title: 'Gipfel-Empfangskomitee', names: [`${CAST.cousin.first} & ${CAST.partner}`, `${CAST.daughter} (i de Chraxe) & ${CAST.cat} (d Chatz)`] },
  { title: 'System Engine', names: [`${CONSOLE.name} / Phaser 3 & Claude AI`] },
  { title: '', names: ['Merci fürs Mitwandere!', '', 'HAPPY BIRTHDAY!'] }
];

// --- Passwort-System ------------------------------------------------------
// Ein Passwort besteht aus 4 Avataren (Köpfe der Familie, Textur
// "avatar_<key>", erzeugt in der BootScene), z. B. Edith – Jessica – Sven –
// Ginny. Die Codes stehen bei den Levels in levels.js (Feld "password").
// Reihenfolge = Reihenfolge beim Durchschalten mit Hoch/Runter (Taste 1–9).
const AVATARS = [
  { key: 'edith', name: 'EDITH' },
  { key: 'kurt', name: 'KURT' },
  { key: 'sven', name: 'SVEN' },
  { key: 'jessica', name: 'JESSICA' },
  { key: 'simon', name: 'SIMON' },
  { key: 'angi', name: 'ANGI' },
  { key: 'peter', name: 'PETER' },
  { key: 'hannah', name: 'HANNAH' },
  { key: 'ginny', name: 'GINNY' }
];

// Geheim-Codes: direkt in den Abspann (mit Gedenk-Zeile und Dankesbild)
const CHEATS = {
  credits: ['ginny', 'ginny', 'ginny', 'ginny'],                          // Passwort-Eingabe
  konami: ['up', 'up', 'down', 'down', 'left', 'right', 'a', 'b']          // Spielauswahl (Controller/Tastatur)
};

const Passwords = {
  /** Gleiche Avatar-Folge? */
  same(a, b) {
    return !!a && !!b && a.length === b.length && a.every((k, i) => k === b[i]);
  },
  /** Liefert den Level-Index (0-basiert) zu einem Code – oder -1. */
  findLevel(code) {
    return LEVELS.findIndex(l => this.same(l.password, code));
  },
  /** Code für einen Level-Index. */
  forLevel(index) {
    return LEVELS[index] ? LEVELS[index].password : null;
  },
  /** Avatar-Eintrag zu einem Schlüssel. */
  avatar(key) {
    return AVATARS.find(a => a.key === key);
  },
  /** Lesbare Form, z. B. "EDITH · JESSICA · SVEN · GINNY". */
  label(code) {
    return code.map(k => this.avatar(k).name).join(' · ');
  }
};
