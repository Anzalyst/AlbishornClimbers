/* =====================================================================
 * triggers.js – Register der Auslöser-Typen
 *
 * Jeder Typ ist ein Objekt mit (alle optional):
 *   create(sys, trigger, cfg)   Sprites anlegen (trigger hat schon x, y, owner, targets, latch)
 *   update(sys, trigger)        jeden Frame: trigger.active setzen
 *
 * sys = MechanicsSystem (sys.scene = GameScene). Ein Auslöser wirkt auf
 * alle Ziele in trigger.targets, solange trigger.active true ist.
 * In levels.js: triggers: { P: { type: 'plate', owner: 1, targets: ['D'] } }
 * ===================================================================== */

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
      if (t.owner) {
        // Initiale über dem Schalter: wer darf drauf? (J = Jessica, S = Simon)
        scene.add.text(t.x, t.y - 14, PLAYER_DEFS[t.owner - 1].name[0].toUpperCase(), {
          fontFamily: FONT, fontSize: '10px', color: PLAYER_DEFS[t.owner - 1].colorCss, stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5, 1).setDepth(DEPTH.OBJECT);
      }
    },
    update(sys, t) {
      const scene = sys.scene;
      const onPlate = b => b.right > t.x - 13 && b.left < t.x + 13 && Math.abs(b.bottom - t.y) < 6;
      const pressed =
        scene.players.some(p => sys.canUse(t, p) && !p.respawning && onPlate(p.sprite.body)) ||
        (!t.owner && scene.blocks.some(block => onPlate(block.body)));
      if (pressed !== t.active && !(t.latch && t.active)) {
        t.active = pressed;
        t.sprite.setTexture(pressed ? t.texDown : t.texUp);
        Sfx.play(scene, pressed ? 'plateDown' : 'plateUp');
      }
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
    }
  },

  // Farbtaste: mit "Hoch" drücken – die Reihenfolge der Sequenz entscheidet
  // (cfg: { type: 'button', color: 'red'|'blue'|'yellow', group: 'S' })
  button: {
    create(sys, t, cfg) {
      t.color = cfg.color;
      t.lit = false;
      t.sprite = sys.scene.add.image(t.x, t.y, `btn_${cfg.color}_off`).setOrigin(0.5, 1).setDepth(DEPTH.OBJECT);
      const seq = sys.sequences[cfg.group];
      if (seq) { t.sequence = seq; seq.buttons.push(t); }
      addUpPrompt(sys.scene, t);
    },
    update(sys, t) {
      const seq = t.sequence;
      let someoneNear = false;
      sys.scene.players.forEach(p => {
        if (!sys.isNear(t, p) || !seq || seq.active) return;
        someoneNear = someoneNear || !t.lit;
        if (p.input.justPressed('up')) TRIGGER_TYPES.sequence.press(sys, seq, t);
      });
      t.prompt.setVisible(someoneNear);
    }
  },

  // Sequenz: wird aus level.sequences angelegt (nicht aus der Karte) und
  // aktiv, sobald alle Farbtasten in der richtigen Reihenfolge gedrückt sind
  sequence: {
    /** Tafel mit der gesuchten Reihenfolge (Lämpchen leuchten bei Fortschritt). */
    createBoard(sys, seq, cx, bottom) {
      const scene = sys.scene;
      scene.add.image(cx, bottom, 'seqBoard').setOrigin(0.5, 1).setDepth(DEPTH.DECO + 0.5);
      const n = seq.order.length;
      seq.order.forEach((color, i) => {
        const x = cx + (i - (n - 1) / 2) * 22, y = bottom - 37;
        scene.add.text(x, y - 13, String(i + 1), { fontFamily: FONT, fontSize: '6px', color: '#aab4cc' })
          .setOrigin(0.5).setDepth(DEPTH.DECO + 0.6);
        seq.lamps.push(scene.add.circle(x, y, 7, SEQ_COLORS[color]).setDepth(DEPTH.DECO + 0.6).setAlpha(0.35));
      });
    },

    press(sys, seq, btn) {
      const scene = sys.scene;
      if (btn.lit) return;
      if (btn.color === seq.order[seq.progress]) {
        btn.lit = true;
        btn.sprite.setTexture(`btn_${btn.color}_on`);
        const lamp = seq.lamps[seq.progress];
        if (lamp) {
          lamp.setAlpha(1);
          scene.tweens.add({ targets: lamp, scale: { from: 1.6, to: 1 }, duration: 250, ease: 'Back.out' });
        }
        Sfx.play(scene, `seq${Math.min(seq.progress, 2)}`);
        seq.progress++;
        if (seq.progress >= seq.order.length) {
          seq.active = true;
          Sfx.play(scene, 'lever');
          scene.toast(TXT.seqRight, '#7dff9a');
          scene.cameras.main.shake(120, 0.004);
        }
      } else {
        seq.progress = 0;
        seq.buttons.forEach(b => { b.lit = false; b.sprite.setTexture(`btn_${b.color}_off`); });
        seq.lamps.forEach(l => l.setAlpha(0.35));
        Sfx.play(scene, 'error');
        scene.toast(TXT.seqWrong, '#ff8080');
        scene.cameras.main.shake(150, 0.006);
      }
    }
  }
};
