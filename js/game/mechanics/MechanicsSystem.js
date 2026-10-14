/* =====================================================================
 * MechanicsSystem.js – Herzstück des Koop-Designs
 *
 * Auslöser (Schalter, Hebel, Farbtasten-Sequenzen) senden Signale an
 * Ziel-Gruppen (Tor, Brücke, Wasser, Aufzug, Zugbrücke, Förderband).
 * Ein Ziel ist aktiv, sobald MINDESTENS EIN Auslöser mit diesem Ziel aktiv ist –
 * oder, mit { all: true } am Ziel, erst wenn ALLE seine Auslöser aktiv sind.
 *
 * Zeitschalter: Auslöser mit { timer: Sekunden } bleiben nach dem Betätigen
 * (bzw. nach dem Verlassen des Bodenschalters) nur so lange aktiv. Ein Ring
 * mit Sekunden-Anzeige über Schalter und Ziel zählt herunter, dazu tickt es.
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
        progress: 0, active: false, buttons: [], lamps: [], marks: [],
        hidden: !!cfg.hidden,                         // Tafel verrät die Farben nicht (Rätsel!)
        timeLimitMs: (cfg.timeLimit || 0) * 1000,     // ab dem ersten Treffer läuft die Uhr
        remaining: 0, board: null, countdown: null
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
      latch: cfg.type === 'lever' ? cfg.latch !== false : !!cfg.latch || !!cfg.timer, // Hebel bleiben standardmässig umgelegt
      timerMs: (cfg.timer || 0) * 1000,   // Zeitschalter: so lange bleibt er aktiv
      remaining: 0,
      timing: false,
      held: false,                        // Bodenschalter: steht gerade jemand drauf?
      x: cx,
      y: bottom,
      active: false
    };
    const type = TRIGGER_TYPES[cfg.type];
    if (type && type.create) type.create(this, trigger, cfg);
    else if (!type) console.warn(`Unbekannter Auslöser-Typ "${cfg.type}" (Zeichen "${ch}")`);
    if (trigger.timerMs) {
      // Stoppuhr-Symbol: dieser Schalter wirkt nur auf Zeit
      this.scene.add.image(cx + 17, bottom - 22, 'stopwatch').setDepth(DEPTH.OBJECT + 0.1);
    }
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

  /** Bewegliche Plattformen: Aufzüge und Waagschalen (für die Collider der Szene). */
  liftSprites() {
    return Object.values(this.targetGroups).filter(g => g.lift || g.pan).map(g => (g.lift || g.pan).sprite);
  }

  // ---------------------------------------------------------------------
  // Pro Frame
  // ---------------------------------------------------------------------
  update(delta) {
    this.forEachGroup((type, group) => { if (type.preUpdate) type.preUpdate(this, group, delta); });
    this.triggers.forEach(t => {
      const type = TRIGGER_TYPES[t.type];
      if (type && type.update) type.update(this, t, delta);
      if (t.timerMs) this.updateTimer(t, delta);
    });
    this.updateTargets();
    this.forEachGroup((type, group) => { if (type.update) type.update(this, group, delta); });
  }

  /** Rein optische Nachführung, läuft auch nach dem Levelende weiter. */
  render() {
    this.forEachGroup((type, group) => { if (type.render) type.render(this, group); });
  }

  /**
   * Zeitschalter: Uhr starten, herunterzählen (Bodenschalter erst nach dem
   * Verlassen), ticken und am Ende den Schalter zurückstellen.
   */
  updateTimer(t, delta) {
    if (t.active && !t.timing) {
      t.timing = true;
      t.remaining = t.timerMs;
      if (!t.countdown) t.countdown = new CountdownDisplay(this.scene, this.countdownPoints(t, t.targets));
    }
    if (!t.timing) return;
    const prev = t.remaining;
    t.remaining = t.held ? t.timerMs : t.remaining - delta;
    this.tickSound(prev, t.remaining);
    if (t.remaining > 0) {
      t.countdown.show(t.remaining, t.timerMs);
      return;
    }
    t.timing = false;
    t.active = false;
    t.countdown.hide();
    const type = TRIGGER_TYPES[t.type];
    if (type && type.reset) type.reset(this, t);
    Sfx.play(this.scene, 'timeUp');
    this.scene.toast(TXT.timeUp, '#ff8080');
  }

  /** Ticken: jede Sekunde, in den letzten 3 Sekunden doppelt so schnell und heller. */
  tickSound(prev, remaining) {
    if (remaining <= 0 || remaining >= prev) return;
    const fast = remaining <= 3000;
    const stepMs = fast ? 500 : 1000;
    if (Math.floor(prev / stepMs) !== Math.floor(remaining / stepMs)) Sfx.play(this.scene, fast ? 'tickFast' : 'tick');
  }

  /** Wo die Countdown-Ringe stehen: über dem Auslöser und bei jedem Ziel. */
  countdownPoints(origin, targetChars) {
    const points = origin ? [{ x: origin.x, y: origin.y - 82 }] : [];   // über dem "↑"-Hinweis
    targetChars.forEach(ch => {
      const g = this.targetGroups[ch];
      if (!g || !g.bounds) return;
      // Tor: mitten in der Toröffnung, sonst knapp darüber
      points.push(g.kind === 'door'
        ? { x: g.bounds.centerX, y: g.bounds.centerY }
        : { x: g.bounds.centerX, y: g.bounds.top - 22 });
    });
    return points;
  }

  /** Ziele anhand aller Auslöser ein- oder ausschalten. */
  updateTargets() {
    const signal = {}, count = {}, total = {};
    this.triggers.forEach(t => {
      t.targets.forEach(ch => {
        total[ch] = (total[ch] || 0) + 1;
        if (t.active) { signal[ch] = true; count[ch] = (count[ch] || 0) + 1; }
      });
    });
    Object.values(this.targetGroups).forEach(group => {
      const ch = group.char;
      let wanted = !!signal[ch];
      if (group.cfg.all) {
        // UND-Ziel: alle Auslöser gleichzeitig – Zwischenstand melden
        const n = count[ch] || 0;
        wanted = total[ch] > 0 && n === total[ch];
        if (n !== (group.partial || 0)) {
          if (n > 0 && n < total[ch]) this.scene.toast(tx(TXT.andPartial, { n, m: total[ch] }), '#ffe14a');
          group.partial = n;
        }
      }
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
