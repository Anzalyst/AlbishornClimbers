/* =====================================================================
 * triggers.js – Register der Auslöser-Typen
 *
 * Jeder Typ ist ein Objekt mit (alle optional):
 *   create(sys, trigger, cfg)   Sprites anlegen (trigger hat schon x, y, owner, targets, latch)
 *   update(sys, trigger, delta) jeden Frame: trigger.active setzen
 *   reset(sys, trigger)         Zeitschalter abgelaufen → wieder "aus" darstellen
 *
 * sys = MechanicsSystem (sys.scene = GameScene). Ein Auslöser wirkt auf
 * alle Ziele in trigger.targets, solange trigger.active true ist.
 * In levels.js: triggers: { P: { type: 'plate', owner: 1, targets: ['D'] } }
 * Mit { timer: 6 } wird jeder Schalter oder Hebel zum Zeitschalter
 * (Ablauf & Anzeige: MechanicsSystem.updateTimer + CountdownDisplay).
 * ===================================================================== */

/**
 * Countdown-Anzeige: Ring mit Restzeit und Sekundenzahl, an mehreren Stellen
 * gleichzeitig (über dem Schalter UND beim Tor). Grün → Gelb → Rot, in den
 * letzten 3 Sekunden pulsiert der Ring.
 */
class CountdownDisplay {
  constructor(scene, points) {
    this.items = points.map(({ x, y }) => ({
      ring: scene.add.graphics().setPosition(x, y).setDepth(DEPTH.FX).setVisible(false),
      label: scene.add.text(x, y + 1, '', {
        fontFamily: FONT, fontSize: '9px', color: '#ffffff', stroke: '#000000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(DEPTH.FX + 0.1).setVisible(false)
    }));
  }

  show(remaining, total) {
    const f = Phaser.Math.Clamp(remaining / total, 0, 1);
    const color = f > 0.5 ? 0x7dff9a : f > 0.25 ? 0xffe14a : 0xff5050;
    const css = f > 0.5 ? '#7dff9a' : f > 0.25 ? '#ffe14a' : '#ff6060';
    const pulse = remaining < 3000 ? 1 + 0.15 * Math.abs(Math.sin(remaining / 160)) : 1;
    const secs = String(Math.ceil(remaining / 1000));
    this.items.forEach(({ ring, label }) => {
      ring.clear()
        .fillStyle(0x0b1020, 0.8).fillCircle(0, 0, 15)
        .lineStyle(4, 0x2a3040, 1).strokeCircle(0, 0, 12)
        .lineStyle(4, color, 1);
      ring.beginPath();
      ring.arc(0, 0, 12, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2, false);
      ring.strokePath();
      ring.setVisible(true).setScale(pulse);
      if (label.text !== secs) label.setText(secs);
      label.setVisible(true).setColor(css).setScale(pulse);
    });
  }

  hide() {
    this.items.forEach(({ ring, label }) => { ring.setVisible(false); label.setVisible(false); });
  }
}

/** Initiale über einem Schalter: wer darf ihn benutzen? (J = Jessica, S = Simon) */
function addOwnerMark(scene, t, x, y) {
  if (!t.owner) return;
  const def = PLAYER_DEFS[t.owner - 1];
  scene.add.text(x, y, def.name[0].toUpperCase(), {
    fontFamily: FONT, fontSize: '10px', color: def.colorCss, stroke: '#000000', strokeThickness: 3
  }).setOrigin(0.5, 1).setDepth(DEPTH.OBJECT);
}

/** "↑"-Hinweis über Hebel und Farbtasten, erscheint, wenn jemand davor steht. */
function addUpPrompt(scene, trigger) {
  trigger.prompt = scene.add.text(trigger.x, trigger.y - 52, '↑', {
    fontFamily: FONT, fontSize: '14px', color: '#ffffff', stroke: '#000000', strokeThickness: 4
  }).setOrigin(0.5).setDepth(DEPTH.FX).setVisible(false);
  scene.tweens.add({ targets: trigger.prompt, y: trigger.prompt.y - 6, duration: 400, yoyo: true, repeat: -1 });
}

const TRIGGER_TYPES = {
  // Bodenschalter: aktiv, solange ein berechtigter Spieler – oder bei
  // Schaltern ohne Besitzer auch ein Block – daraufsteht
  plate: {
    create(sys, t) {
      const scene = sys.scene;
      t.texUp = `plate_${t.owner || 'any'}_up`;
      t.texDown = `plate_${t.owner || 'any'}_down`;
      t.sprite = scene.add.image(t.x, t.y, t.texUp).setOrigin(0.5, 1).setDepth(DEPTH.OBJECT);
      addOwnerMark(scene, t, t.x, t.y - 14);   // Initiale über dem Schalter: wer darf drauf?
    },
    update(sys, t) {
      const scene = sys.scene;
      const onPlate = b => b.right > t.x - 13 && b.left < t.x + 13 && Math.abs(b.bottom - t.y) < 6;
      const pressed =
        scene.players.some(p => sys.canUse(t, p) && !p.respawning && onPlate(p.sprite.body)) ||
        (!t.owner && scene.blocks.some(block => onPlate(block.body)));
      t.held = pressed;   // Zeitschalter: die Uhr läuft erst, wenn niemand mehr draufsteht
      if (pressed !== t.active && !(t.latch && t.active)) {
        t.active = pressed;
        t.sprite.setTexture(pressed ? t.texDown : t.texUp);
        Sfx.play(scene, pressed ? 'plateDown' : 'plateUp');
      }
    },
    reset(sys, t) {
      t.sprite.setTexture(t.texUp);
      Sfx.play(sys.scene, 'plateUp');
    }
  },

  // Hebel: Spieler davor + "Hoch" drücken → umlegen (bleibt standardmässig umgelegt)
  lever: {
    create(sys, t) {
      t.sprite = sys.scene.add.image(t.x, t.y, 'lever_off').setOrigin(0.5, 1).setDepth(DEPTH.OBJECT);
      addUpPrompt(sys.scene, t);
    },
    update(sys, t) {
      const scene = sys.scene;
      let someoneNear = false;
      scene.players.forEach(p => {
        if (!sys.isNear(t, p)) return;
        if (!sys.canUse(t, p)) {
          if (p.input.justPressed('up')) scene.toast(tx(TXT.onlyFor, { name: PLAYER_DEFS[t.owner - 1].name }), '#ff8080');
          return;
        }
        someoneNear = someoneNear || !t.active;
        if (p.input.justPressed('up')) {
          t.active = t.latch ? true : !t.active;
          t.sprite.setTexture(t.active ? 'lever_on' : 'lever_off');
          Sfx.play(scene, 'lever');
          scene.toast(t.active ? TXT.leverOn : TXT.leverOff);
          scene.cameras.main.shake(120, 0.004);
        }
      });
      t.prompt.setVisible(someoneNear);
    },
    reset(sys, t) {
      t.sprite.setTexture('lever_off');
      Sfx.play(sys.scene, 'lever');
    }
  },

  // Farbtaste: mit "Hoch" drücken – die Reihenfolge der Sequenz entscheidet
  // (cfg: { type: 'button', color: 'red'|'blue'|'yellow'|'green', group: 'S', owner })
  button: {
    create(sys, t, cfg) {
      t.color = cfg.color;
      t.lit = false;
      t.sprite = sys.scene.add.image(t.x, t.y, `btn_${cfg.color}_off`).setOrigin(0.5, 1).setDepth(DEPTH.OBJECT);
      addOwnerMark(sys.scene, t, t.x - 17, t.y - 24);
      const seq = sys.sequences[cfg.group];
      if (seq) { t.sequence = seq; seq.buttons.push(t); }
      addUpPrompt(sys.scene, t);
    },
    update(sys, t) {
      const seq = t.sequence;
      let someoneNear = false;
      sys.scene.players.forEach(p => {
        if (!sys.isNear(t, p) || !seq || seq.active) return;
        if (!sys.canUse(t, p)) {
          if (p.input.justPressed('up')) sys.scene.toast(tx(TXT.onlyFor, { name: PLAYER_DEFS[t.owner - 1].name }), '#ff8080');
          return;
        }
        someoneNear = someoneNear || !t.lit;
        if (p.input.justPressed('up')) TRIGGER_TYPES.sequence.press(sys, seq, t);
      });
      t.prompt.setVisible(someoneNear);
    }
  },

  // Waagen-Lämpli: aktiv, solange die Waage der Schale "pan" genau im
  // Gleichgewicht steht (stillstehend, gleich viel Gewicht auf beiden Seiten,
  // je mindestens "min"). (cfg: { type: 'scale', pan: 'c', min: 2, timer: 4 })
  scale: {
    create(sys, t, cfg) {
      t.pan = cfg.pan;
      t.min = cfg.min || 1;
      t.sprite = sys.scene.add.image(t.x, t.y, 'scaleLamp_off').setOrigin(0.5, 1).setDepth(DEPTH.OBJECT);
    },
    /** Beide Schalen der Waage (zuerst die mit den Einstellungen). */
    pair(sys, t) {
      const g = sys.targetGroups[t.pan];
      if (!g) return null;
      const master = g.cfg.partner ? g : Object.values(sys.targetGroups).find(o => o.cfg.partner === t.pan);
      return master && master.pair && master.scale ? master : null;
    },
    update(sys, t) {
      const m = this.pair(sys, t);
      if (!m) return;
      const A = m.pan, B = m.pair.pan;
      const balanced = !m.scale.moving && A.weight === B.weight && A.weight >= t.min &&
        Math.abs(A.sprite.y - A.homeY) < 0.5;
      t.held = balanced;   // Zeitschalter: die Uhr läuft erst, wenn das Gleichgewicht weg ist
      if (balanced && !t.active) {
        t.active = true;
        t.sprite.setTexture('scaleLamp_on');
        Sfx.play(sys.scene, 'perfectBalance');
        sys.scene.toast(TXT.balanced, '#7dff9a');
      } else if (!balanced && t.active && !t.timerMs) {
        this.reset(sys, t);
        t.active = false;
      }
    },
    reset(sys, t) {
      t.sprite.setTexture('scaleLamp_off');
    }
  },

  // Sequenz: wird aus level.sequences angelegt (nicht aus der Karte) und
  // aktiv, sobald alle Farbtasten in der richtigen Reihenfolge gedrückt sind.
  // Optionen: hidden (Tafel zeigt nur "?" – die Reihenfolge steht in einem
  // Rätsel auf der Infotafel), timeLimit (Sekunden ab dem ersten Treffer).
  sequence: {
    /** Tafel mit der gesuchten Reihenfolge (Lämpchen leuchten bei Fortschritt). */
    createBoard(sys, seq, cx, bottom) {
      const scene = sys.scene;
      seq.board = { x: cx, y: bottom };
      scene.add.image(cx, bottom, 'seqBoard').setOrigin(0.5, 1).setDepth(DEPTH.DECO + 0.5);
      const n = seq.order.length;
      const gap = n > 3 ? 18 : 22;
      seq.order.forEach((color, i) => {
        const x = cx + (i - (n - 1) / 2) * gap, y = bottom - 37;
        scene.add.text(x, y - 13, String(i + 1), { fontFamily: FONT, fontSize: '6px', color: '#aab4cc' })
          .setOrigin(0.5).setDepth(DEPTH.DECO + 0.6);
        seq.lamps.push(scene.add.circle(x, y, 7, seq.hidden ? 0x5a6070 : SEQ_COLORS[color]).setDepth(DEPTH.DECO + 0.6).setAlpha(seq.hidden ? 1 : 0.35));
        if (seq.hidden) {
          seq.marks.push(scene.add.text(x, y + 1, '?', { fontFamily: FONT, fontSize: '7px', color: '#ffffff' })
            .setOrigin(0.5).setDepth(DEPTH.DECO + 0.7));
        }
      });
    },

    /** Zeitlimit: Uhr läuft ab dem ersten richtigen Knopf. */
    update(sys, seq, delta) {
      if (!seq.timeLimitMs || seq.active || seq.progress === 0) return;
      const prev = seq.remaining;
      seq.remaining -= delta;
      sys.tickSound(prev, seq.remaining);
      if (seq.remaining > 0) seq.countdown.show(seq.remaining, seq.timeLimitMs);
      else this.reset(sys, seq, TXT.seqTimeout);
    },

    /** Alles zurück auf Anfang (falscher Knopf oder Zeit abgelaufen). */
    reset(sys, seq, message) {
      const scene = sys.scene;
      seq.progress = 0;
      seq.buttons.forEach(b => { b.lit = false; b.sprite.setTexture(`btn_${b.color}_off`); });
      seq.lamps.forEach(l => { if (seq.hidden) l.setFillStyle(0x5a6070); l.setAlpha(seq.hidden ? 1 : 0.35); });
      seq.marks.forEach(m => m.setVisible(true));
      if (seq.countdown) seq.countdown.hide();
      Sfx.play(scene, 'error');
      scene.toast(message, '#ff8080');
      scene.cameras.main.shake(150, 0.006);
    },

    press(sys, seq, btn) {
      const scene = sys.scene;
      if (btn.lit) return;
      if (btn.color === seq.order[seq.progress]) {
        btn.lit = true;
        btn.sprite.setTexture(`btn_${btn.color}_on`);
        const lamp = seq.lamps[seq.progress];
        if (lamp) {
          lamp.setAlpha(1).setFillStyle(SEQ_COLORS[btn.color]);
          if (seq.marks[seq.progress]) seq.marks[seq.progress].setVisible(false);
          scene.tweens.add({ targets: lamp, scale: { from: 1.6, to: 1 }, duration: 250, ease: 'Back.out' });
        }
        Sfx.play(scene, `seq${Math.min(seq.progress, 2)}`);
        if (seq.progress === 0 && seq.timeLimitMs) {
          seq.remaining = seq.timeLimitMs;
          if (!seq.countdown) {
            const points = seq.buttons.map(b => ({ x: b.x, y: b.y - 82 }));
            if (seq.board) points.push({ x: seq.board.x, y: seq.board.y - 76 });
            seq.countdown = new CountdownDisplay(scene, points.concat(sys.countdownPoints(null, seq.targets)));
          }
          scene.toast(tx(TXT.seqClock, { s: seq.timeLimitMs / 1000 }), '#ffe14a');
        }
        seq.progress++;
        if (seq.progress >= seq.order.length) {
          seq.active = true;
          if (seq.countdown) seq.countdown.hide();
          Sfx.play(scene, 'lever');
          scene.toast(TXT.seqRight, '#7dff9a');
          scene.cameras.main.shake(120, 0.004);
        }
      } else {
        this.reset(sys, seq, TXT.seqWrong);
      }
    }
  }
};
