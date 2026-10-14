/* =====================================================================
 * input.js – Vereinheitlichte Steuerung pro Spieler
 *
 * Kombiniert Tastatur UND HTML5 Gamepad API. Der Rest des Spiels fragt
 * nur noch z. B. `input.left` oder `input.justPressed('jump')` ab und muss
 * nicht wissen, woher die Eingabe kommt.
 *
 * Gamepad (Standard-Mapping, z. B. Xbox / PlayStation / 8BitDo):
 *   Linker Stick oder D-Pad = Bewegung, Button 0 (A / Kreuz) = Sprung,
 *   Stick/D-Pad hoch = Hebel, Button 9 (Start / Options) = Bestätigen bzw.
 *   Pause im Level, Button 1 (B / Kreis) = Zurück.
 *
 * Zuordnung: Spieler 1 bekommt den ersten verbundenen Controller, Spieler 2
 * den zweiten – unabhängig davon, in welchem Browser-Slot sie stecken
 * (Linux vergibt nach dem Neu-Verbinden gern Slot 1, 2 …). Controller mit
 * Standard-Mapping haben dabei Vorrang vor sonstigen "Joystick"-Geräten.
 *
 * Hinweis: Browser melden einen Controller erst, nachdem einmal eine
 * Taste auf ihm gedrückt wurde.
 * ===================================================================== */

const PAD_DEADZONE = 0.35;
const PAD_BUTTON = { A: 0, B: 1, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
// action = zweiter Knopf (Controller B / Kreis, Tastatur E bzw. Shift) – z. B. für
// A/B-Wechseln oder den Schild in den Sempach-Minispielen
const INPUT_ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'action', 'start', 'back'];

class PlayerInput {
  /**
   * @param {Phaser.Scene} scene   Szene, deren Tastatur genutzt wird
   * @param {object} def           Eintrag aus PLAYER_DEFS (keys + padIndex)
   */
  constructor(scene, def) {
    this.padIndex = def.padIndex;
    this.keys = scene.input.keyboard.addKeys(def.keys);   // { left: Key, ... }

    // Sehr kurze Tipper (drücken + loslassen innerhalb eines Frames) würden
    // beim reinen Abfragen verloren gehen → Tastendrücke als Ereignis merken.
    this.tapped = {};
    Object.entries(this.keys).forEach(([action, key]) => {
      key.on('down', () => { this.tapped[action] = true; });
    });

    this.state = {};
    this.prev = {};
    INPUT_ACTIONS.forEach(a => { this.state[a] = false; this.prev[a] = false; });

    // Bereits gehaltene Controller-Tasten (z. B. aus der vorherigen Szene)
    // sollen nicht sofort als "neu gedrückt" zählen.
    this.resync();
  }

  /** Liefert das Gamepad dieses Spielers oder null. */
  getPad() {
    return connectedPads()[this.padIndex] || null;
  }

  /**
   * Aktuellen Zustand als "schon gehalten" übernehmen – z. B. nach einer
   * Pause, damit der Knopf, mit dem man weiterspielt, keinen Sprung auslöst.
   */
  resync() {
    this.update();
    INPUT_ACTIONS.forEach(a => { this.prev[a] = this.state[a]; });
  }

  /** Einmal pro Frame aufrufen (am Anfang von update()). */
  update() {
    INPUT_ACTIONS.forEach(a => { this.prev[a] = this.state[a]; });

    const k = this.keys;
    const held = action => !!k[action] && (k[action].isDown || !!this.tapped[action]);
    let left = held('left'), right = held('right');
    let up = held('up'), down = held('down');
    let jump = held('jump'), action = held('action');
    this.tapped = {};
    let start = false, back = false;   // nur per Gamepad (Tastatur: ESC in den Szenen)

    const pad = this.getPad();
    if (pad) {
      const btn = i => !!(pad.buttons[i] && pad.buttons[i].pressed);
      const ax = pad.axes[0] || 0;
      const ay = pad.axes[1] || 0;
      left = left || ax < -PAD_DEADZONE || btn(PAD_BUTTON.LEFT);
      right = right || ax > PAD_DEADZONE || btn(PAD_BUTTON.RIGHT);
      up = up || ay < -PAD_DEADZONE || btn(PAD_BUTTON.UP);
      down = down || ay > PAD_DEADZONE || btn(PAD_BUTTON.DOWN);
      jump = jump || btn(PAD_BUTTON.A);
      action = action || btn(PAD_BUTTON.B);
      start = btn(PAD_BUTTON.START);
      back = btn(PAD_BUTTON.B);
    }

    Object.assign(this.state, { left, right, up, down, jump, action, start, back });
  }

  get left() { return this.state.left; }
  get right() { return this.state.right; }
  get up() { return this.state.up; }
  get down() { return this.state.down; }
  get jump() { return this.state.jump; }
  get action() { return this.state.action; }

  /** true nur im ersten Frame, in dem die Aktion gedrückt wird. */
  justPressed(action) { return this.state[action] && !this.prev[action]; }

  /** true nur im ersten Frame, in dem die Aktion losgelassen wird. */
  justReleased(action) { return !this.state[action] && this.prev[action]; }

  /** Ist ein Controller für diesen Spieler verbunden? */
  get hasPad() { return !!this.getPad(); }
}

/**
 * Alle verbundenen Controller in fester Reihenfolge: zuerst die mit
 * Standard-Mapping (Xbox, PlayStation, 8BitDo …), dann sonstige Geräte,
 * jeweils nach Browser-Slot sortiert. Lücken im Browser-Array entfallen.
 */
function connectedPads() {
  if (!navigator.getGamepads) return [];
  const pads = Array.from(navigator.getGamepads() || []).filter(p => p && p.connected);
  return pads.filter(p => p.mapping === 'standard').concat(pads.filter(p => p.mapping !== 'standard'));
}

/** Erstellt die Eingaben für beide Spieler einer Szene. */
function createPlayerInputs(scene) {
  return PLAYER_DEFS.map(def => new PlayerInput(scene, def));
}
