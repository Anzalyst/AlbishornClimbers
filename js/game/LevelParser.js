/* =====================================================================
 * LevelParser.js – ASCII-Karte → reines Datenobjekt (ohne Phaser)
 *
 *   const parsed = LevelParser.parse(LEVELS[0]);
 *   parsed.cells      alle belegten Zellen in Lesereihenfolge (Zeile für Zeile):
 *                     { c, r, ch, kind }   kind = 'trigger' | 'board' | 'target' |
 *                     'terrain' | 'platform' | 'water' | 'spawn' | 'checkpoint' |
 *                     'collectible' | 'sign' | 'goal' | 'deco' | 'block' | 'unknown'
 *   parsed.charAt(c, r), parsed.isTerrain(ch), parsed.isWater(ch)
 *   parsed.warnings   verständliche Hinweise auf Fehler in den Leveldaten
 *
 * Läuft auch in Node (tools/test-levels.js) – so lassen sich alle Level
 * ohne Browser prüfen. Legende der Zeichen: siehe Kopf von levels.js.
 * ===================================================================== */

const LevelParser = {
  COLORS: ['red', 'blue', 'yellow', 'green'],

  // Standard-Zeichen → Art der Zelle
  CHAR_KINDS: {
    '#': 'terrain', 'R': 'terrain', 'o': 'terrain',
    '-': 'platform', '~': 'water',
    '1': 'spawn', '2': 'spawn',
    'F': 'checkpoint', '*': 'collectible', 'i': 'sign', 'G': 'goal',
    'H': 'deco', 'T': 'deco', 'A': 'deco',
    'k': 'block', 'K': 'block'
  },

  /**
   * @param {object} level        Eintrag aus LEVELS
   * @param {object} targetTypes  Register der Ziel-Typen (Standard: TARGET_TYPES)
   */
  parse(level, targetTypes = (typeof TARGET_TYPES !== 'undefined' ? TARGET_TYPES : {})) {
    const map = level.map;
    const rows = map.length;
    const cols = Math.max(...map.map(r => r.length));
    const triggers = level.triggers || {};
    const targets = level.targets || {};
    const sequences = level.sequences || {};
    const warnings = [];
    const COLORS = this.COLORS;

    const kindOf = ch => (typeof targets[ch] === 'string' ? targets[ch] : targets[ch] && targets[ch].kind);
    const boards = {};
    Object.values(sequences).forEach(s => { if (s.board) boards[s.board] = true; });

    const charAt = (c, r) => (map[r] && map[r][c]) || ' ';
    const targetFlag = (ch, flag) => !!(targets[ch] && targetTypes[kindOf(ch)] && targetTypes[kindOf(ch)][flag]);
    const isTerrain = ch => ch === '#' || ch === 'R' || ch === 'o' || targetFlag(ch, 'terrain');
    const isWater = ch => ch === '~' || targetFlag(ch, 'water');

    // Zellen klassifizieren (Vorrang: Auslöser > Sequenz-Tafel > Ziel > Standard-Zeichen)
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ch = charAt(c, r);
        if (ch === ' ' || ch === '.') continue;
        let kind;
        if (triggers[ch]) kind = 'trigger';
        else if (boards[ch]) kind = 'board';
        else if (targets[ch]) kind = 'target';
        else kind = this.CHAR_KINDS[ch] || 'unknown';
        if (kind === 'unknown') warnings.push(`Unbekanntes Kartenzeichen "${ch}" in Zeile ${r}, Spalte ${c}`);
        cells.push({ c, r, ch, kind });
      }
    }

    // Plausibilität der Leveldaten
    const used = new Set(cells.map(cell => cell.ch));
    const name = level.name || '?';
    ['1', '2'].forEach(s => { if (!used.has(s)) warnings.push(`${name}: Startpunkt "${s}" fehlt (Ersatz-Startpunkt wird benutzt)`); });
    if (!used.has('G')) warnings.push(`${name}: Ziel "G" fehlt – das Level ist nicht abschliessbar`);
    Object.entries(triggers).forEach(([ch, t]) => {
      if (!used.has(ch)) warnings.push(`${name}: Auslöser "${ch}" ist definiert, steht aber nicht in der Karte`);
      (t.targets || []).forEach(tch => { if (!targets[tch]) warnings.push(`${name}: Auslöser "${ch}" verweist auf unbekanntes Ziel "${tch}"`); });
      if (t.type === 'button' && !sequences[t.group]) warnings.push(`${name}: Farbtaste "${ch}" gehört zu unbekannter Sequenz "${t.group}"`);
      if (t.type === 'button' && !COLORS.includes(t.color)) warnings.push(`${name}: Farbtaste "${ch}" hat unbekannte Farbe "${t.color}"`);
      if (t.type === 'scale' && kindOf(t.pan) !== 'balance') warnings.push(`${name}: Waagen-Lämpli "${ch}" verweist auf "${t.pan}" – das ist keine Waagschale`);
      if (t.timer !== undefined && !(t.timer > 0)) warnings.push(`${name}: Auslöser "${ch}" hat ungültigen timer "${t.timer}"`);
    });
    Object.entries(sequences).forEach(([id, s]) => {
      (s.targets || []).forEach(tch => { if (!targets[tch]) warnings.push(`${name}: Sequenz "${id}" verweist auf unbekanntes Ziel "${tch}"`); });
      s.order.forEach(color => {
        const ok = Object.values(triggers).some(t => t.type === 'button' && t.group === id && t.color === color);
        if (!ok) warnings.push(`${name}: Sequenz "${id}" braucht eine Farbtaste "${color}", die es nicht gibt`);
      });
    });
    // UND-Ziele brauchen Auslöser, Waagen eine Partnerschale
    const feeds = ch => Object.values(triggers).some(t => (t.targets || []).includes(ch)) ||
      Object.values(sequences).some(s => (s.targets || []).includes(ch));
    Object.entries(targets).forEach(([ch, t]) => {
      if (t.all && !feeds(ch)) warnings.push(`${name}: UND-Ziel "${ch}" hat keine Auslöser`);
      if (kindOf(ch) === 'balance' && t.partner && kindOf(t.partner) !== 'balance') {
        warnings.push(`${name}: Waage "${ch}" – Partnerschale "${t.partner}" fehlt oder ist keine Waage`);
      }
    });
    const partners = Object.values(targets).map(t => t.partner).filter(Boolean);
    Object.entries(targets).forEach(([ch, t]) => {
      if (kindOf(ch) === 'balance' && !t.partner && !partners.includes(ch)) warnings.push(`${name}: Waagschale "${ch}" hat keinen Partner`);
    });
    Object.keys(targets).forEach(ch => {
      if (!targetTypes[kindOf(ch)]) warnings.push(`${name}: Ziel "${ch}" hat unbekannten Typ "${kindOf(ch)}"`);
      if (!used.has(ch)) warnings.push(`${name}: Ziel "${ch}" ist definiert, steht aber nicht in der Karte`);
    });

    return { level, map, rows, cols, cells, charAt, isTerrain, isWater, warnings };
  }
};
