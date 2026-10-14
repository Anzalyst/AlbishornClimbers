/* =====================================================================
 * MechanicsSystem.js – Herzstück des Koop-Designs
 *
 * Auslöser (Schalter, Hebel, Farbtasten-Sequenzen) senden Signale an
 * Ziel-Gruppen (Tor, Brücke, Wasser, Aufzug, Zugbrücke, Förderband).
 * Ein Ziel ist aktiv, sobald MINDESTENS EIN Auslöser mit diesem Ziel aktiv ist.
 *
 * Das Verhalten der einzelnen Typen steht in den Registern
 *   TRIGGER_TYPES (triggers.js) und TARGET_TYPES (targets.js).
 * Ein neuer Mechanik-Typ = ein neuer Eintrag dort; dieses System und die
 * GameScene bleiben unverändert.
 *
 * Ablauf:
 *   beim Kartenaufbau  addTrigger / addSequenceBoard / addTargetCell (LevelBuilder)
 *   danach             finish()      Ziele fertig bauen, Startzustand setzen
 *   jeden Frame        update(delta) Förderbänder → Auslöser → Ziele → Aufzüge
 *                      render()      rein optische Nachführung (z. B. Ketten)
 * ===================================================================== */

class MechanicsSystem {
  constructor(scene, level) {
    this.scene = scene;
    this.triggerCfg = level.triggers || {};
    this.triggers = [];           // Schalter, Hebel, Farbtasten, Sequenzen
    this.targetGroups = {};       // Zeichen → Ziel-Gruppe (Tor, Aufzug, …)

    // Ziel-Konfigurationen vereinheitlichen: 'door' → { kind: 'door' }
    this.targetCfg = {};
    Object.entries(level.targets || {}).forEach(([ch, t]) => {
      this.targetCfg[ch] = typeof t === 'string' ? { kind: t } : Object.assign({}, t);
    });

    // Farbtasten-Sequenzen wirken wie ein Auslöser mit Zielen
    this.sequences = {};
    this.boardChars = {};
    Object.entries(level.sequences || {}).forEach(([id, cfg]) => {
      const seq = {
        id, type: 'sequence', order: cfg.order, targets: cfg.targets || [],
        progress: 0, active: false, buttons: [], lamps: []
      };
      this.sequences[id] = seq;
      this.triggers.push(seq);
      if (cfg.board) this.boardChars[cfg.board] = id;
    });
  }

  // ---------------------------------------------------------------------
  // Aufbau
  // ---------------------------------------------------------------------
  /** Bodenschalter, Hebel oder Farbtaste anlegen. */
  addTrigger(ch, cx, bottom) {
    const cfg = this.triggerCfg[ch];
    const trigger = {
      char: ch,
      type: cfg.type,
      owner: cfg.owner || null,
      targets: cfg.targets || [],
      latch: cfg.type === 'lever' ? cfg.latch !== false : !!cfg.latch, // Hebel bleiben standardmässig umgelegt
      x: cx,
      y: bottom,
      active: false
    };
    const type = TRIGGER_TYPES[cfg.type];
    if (type && type.create) type.create(this, trigger, cfg);
    else if (!type) console.warn(`Unbekannter Auslöser-Typ "${cfg.type}" (Zeichen "${ch}")`);
    this.triggers.push(trigger);
  }

  /** Tafel mit der gesuchten Reihenfolge einer Sequenz. */
  addSequenceBoard(ch, cx, bottom) {
    TRIGGER_TYPES.sequence.createBoard(this, this.sequences[this.boardChars[ch]], cx, bottom);
  }

  /** Eine Zelle eines Ziels registrieren. Liefert die Kachel (falls der Typ eine hat). */
  addTargetCell(ch, c, r, surface) {
    const cfg = this.targetCfg[ch];
    if (!this.targetGroups[ch]) {
      this.targetGroups[ch] = { char: ch, kind: cfg.kind, cfg, cells: [], tiles: [], active: false, timers: [] };
    }
    const group = this.targetGroups[ch];
    group.cells.push({ c, r });
    const type = TARGET_TYPES[cfg.kind] || {};
    const tile = type.cell ? type.cell(this, group, c, r, surface) : null;
    if (tile) {
      tile.baseY = r * TILE + TILE / 2;
      group.tiles.push(tile);
    }
    return tile;
  }

  /** Ziele fertig bauen (Aufzug, Zugbrücke, Band …) und in den Startzustand setzen. */
  finish() {
    this.forEachGroup((type, group) => {
      if (type.create) type.create(this, group);
      group.bounds = this.cellBounds(group.cells);
      this.apply(group, false, true);
    });
  }

  cellBounds(cells) {
    const cs = cells.map(c => c.c), rs = cells.map(c => c.r);
    const left = Math.min(...cs) * TILE, top = Math.min(...rs) * TILE;
    return new Phaser.Geom.Rectangle(left, top, (Math.max(...cs) + 1) * TILE - left, (Math.max(...rs) + 1) * TILE - top);
  }

  /** Die Aufzug-Plattformen (für die Collider der Szene). */
  liftSprites() {
    return Object.values(this.targetGroups).filter(g => g.lift).map(g => g.lift.sprite);
  }

  // ---------------------------------------------------------------------
  // Pro Frame
  // ---------------------------------------------------------------------
  update(delta) {
    this.forEachGroup((type, group) => { if (type.preUpdate) type.preUpdate(this, group, delta); });
    this.triggers.forEach(t => {
      const type = TRIGGER_TYPES[t.type];
      if (type && type.update) type.update(this, t);
    });
    this.updateTargets();
    this.forEachGroup((type, group) => { if (type.update) type.update(this, group, delta); });
  }

  /** Rein optische Nachführung, läuft auch nach dem Levelende weiter. */
  render() {
    this.forEachGroup((type, group) => { if (type.render) type.render(this, group); });
  }

  /** Ziele anhand aller Auslöser ein- oder ausschalten. */
  updateTargets() {
    const signal = {};
    this.triggers.forEach(t => {
      if (t.active) t.targets.forEach(ch => { signal[ch] = true; });
    });
    Object.values(this.targetGroups).forEach(group => {
      const wanted = !!signal[group.char];
      if (wanted !== group.active) this.apply(group, wanted);
    });
  }

  /** Schaltet eine Ziel-Gruppe (Bedeutung von "active" je Typ: siehe targets.js). */
  apply(group, active, instant = false) {
    group.active = active;
    const type = TARGET_TYPES[group.kind];
    if (type && type.apply) type.apply(this, group, active, instant);
  }

  forEachGroup(fn) {
    Object.values(this.targetGroups).forEach(group => fn(TARGET_TYPES[group.kind] || {}, group));
  }

  // ---------------------------------------------------------------------
  // Helfer für die Typen
  // ---------------------------------------------------------------------
  /** Darf dieser Spieler den Auslöser benutzen? */
  canUse(trigger, player) {
    return !trigger.owner || trigger.owner === player.def.id;
  }

  /** Steht ein Spieler direkt vor einem Hebel / einer Farbtaste? */
  isNear(t, p) {
    const b = p.sprite.body;
    return !p.respawning && Math.abs(b.center.x - t.x) < 26 && Math.abs(b.bottom - t.y) < 20;
  }
}
