/* =====================================================================
 * obstacles.js – Register der Geschicklichkeits-Hindernisse
 *
 * Anders als die Mechaniken (Schalter → Ziel) laufen Hindernisse immer:
 * Sie verlangen Timing und Präzision statt Nachdenken.
 *
 * Kartenzeichen (fest, Legende in levels.js):
 *   '='  Bröckel-Plattform   wackelt beim Betreten, sackt nach 1 s weg, kommt wieder
 *   '&'  Pendel-Aufhängung   darunter schwingt eine Plattform hin und her
 *   '>'  Baumstamm-Quelle    Stämme treiben nach rechts über das Wasser darunter
 *   '<'  Baumstamm-Quelle    … nach links
 *   '@'  Steinschlag-Höhle   lässt regelmässig Felsbrocken herunterrollen
 *
 * Einstellungen pro Level (optional): obstacles: { '&': { period: 2600 }, '@': { dir: 1 } }
 * – überschreiben die "defaults" des Typs. Listen-Werte (z. B. phase: [0, 1.5])
 * gelten der Reihe nach für das 1., 2., … Hindernis dieses Zeichens (von links).
 *
 * Jeder Typ (alle optional ausser create):
 *   defaults                 Standard-Einstellungen
 *   create(sys, item)        Sprites & Physik anlegen (item: ch, c, r, x, y, cfg, index)
 *   update(sys, item, delta) jeden Frame (auch nach dem Levelende – rein Bewegung)
 *   render(sys, item)        rein optische Nachführung (Seile …)
 *
 * sys = ObstacleSystem (sys.scene = GameScene, sys.time = Spielzeit in ms).
 * ===================================================================== */

const OBSTACLE_CHARS = { '=': 'crumble', '&': 'pendulum', '>': 'logs', '<': 'logs', '@': 'boulders' };

const OBSTACLE_TYPES = {
  // -------------------------------------------------------------------
  // Bröckel-Plattform: idle → (jemand steht drauf) wackeln → wegsacken → nach
  // "respawn" ms wieder da (aber erst, wenn niemand im Weg ist). Nur von oben fest.
  // -------------------------------------------------------------------
  crumble: {
    defaults: { delay: 1000, respawn: 4000 },
    create(sys, it) {
      const scene = sys.scene;
      it.sprite = scene.crumbles.create(it.x, it.y + 6, 'crumbleTile').setDepth(DEPTH.TERRAIN);
      oneWay(it.sprite.body);
      it.state = 'idle';
      it.timer = 0;
    },
    update(sys, it, delta) {
      const scene = sys.scene, s = it.sprite;
      if (it.state === 'idle') {
        if (scene.players.some(p => sys.standsOn(p, s.body))) {
          it.state = 'shaking';
          it.timer = it.cfg.delay;
          Sfx.play(scene, 'crumble');
        }
      } else if (it.state === 'shaking') {
        it.timer -= delta;
        s.x = it.x + (Math.floor(it.timer / 45) % 2 ? 1.5 : -1.5);   // erzittern
        s.setTint(it.timer < it.cfg.delay / 2 ? 0xd8a080 : 0xffffff);
        if (it.timer <= 0) {
          it.state = 'gone';
          it.timer = it.cfg.respawn;
          s.body.enable = false;
          s.x = it.x;
          Sfx.play(scene, 'crumbleFall');
          scene.fx.dust(it.x, it.y + 12, 6);
          scene.tweens.add({ targets: s, y: it.y + 6 + 48, alpha: 0, angle: it.c % 2 ? 12 : -12, duration: 450, ease: 'Quad.in' });
        }
      } else if (it.state === 'gone') {
        it.timer -= delta;
        const blocked = scene.players.some(p => {
          const b = p.sprite.body;
          return b.right > it.x - TILE / 2 && b.left < it.x + TILE / 2 && b.bottom > it.y && b.top < it.y + 14;
        });
        if (it.timer <= 0 && !blocked) {
          it.state = 'idle';
          scene.tweens.killTweensOf(s);
          s.setPosition(it.x, it.y + 6).setAngle(0).setAlpha(0).clearTint();
          s.body.enable = true;
          scene.tweens.add({ targets: s, alpha: 1, duration: 250 });
        }
      }
    }
  },

  // -------------------------------------------------------------------
  // Pendel-Plattform: hängt an zwei Seilen unter der Aufhängung und schwingt
  //   θ(t) = angle · sin(2π t / period + phase)
  // Die Plattform nimmt Mitfahrer mit (ObstacleSystem.carryRiders);
  // wer abspringt, behält den Schwung (Player.airVx).
  // length = Abstand Aufhängung → Plattform-Oberkante (Kacheln), width in Kacheln.
  // -------------------------------------------------------------------
  pendulum: {
    defaults: { length: 4.5, angle: 32, period: 2800, width: 2, phase: 0 },
    create(sys, it) {
      const scene = sys.scene;
      it.pivot = { x: it.x, y: it.y + TILE / 2 };
      it.w = it.cfg.width * TILE;
      it.len = it.cfg.length * TILE;
      it.amp = Phaser.Math.DegToRad(it.cfg.angle);
      scene.add.image(it.pivot.x, it.pivot.y, 'pivotBolt').setDepth(DEPTH.MECH + 0.2);
      it.ropes = scene.add.graphics().setDepth(DEPTH.MECH - 0.1);
      it.sprite = scene.add.tileSprite(0, 0, it.w, 12, 'swingPlank').setOrigin(0).setDepth(DEPTH.MECH);
      scene.movingPlatforms.add(it.sprite);
      it.sprite.body.setAllowGravity(false).setImmovable(true);
      it.sprite.body.pushable = false;
      oneWay(it.sprite.body);
      const p = this.pos(sys, it, sys.time);
      it.sprite.body.reset(p.x, p.y);
    },
    /** Linke obere Ecke der Plattform zur Zeit t. */
    pos(sys, it, t) {
      const theta = it.amp * Math.sin((t / it.cfg.period) * Math.PI * 2 + it.cfg.phase);
      return { x: it.pivot.x + Math.sin(theta) * it.len - it.w / 2, y: it.pivot.y + Math.cos(theta) * it.len };
    },
    update(sys, it, delta) {
      // Geschwindigkeit so setzen, dass die Plattform im nächsten Physik-Schritt
      // genau dort ist, wo das Pendel dann sein soll (korrigiert sich selbst)
      const next = this.pos(sys, it, sys.time + delta);
      const b = it.sprite.body, dt = delta / 1000;
      b.setVelocity((next.x - b.x) / dt, (next.y - b.y) / dt);
      sys.carryRiders(b);
    },
    render(sys, it) {
      const s = it.sprite;
      it.ropes.clear().lineStyle(2, 0xc8a46a, 1)
        .lineBetween(it.pivot.x, it.pivot.y, s.x + 4, s.y + 2)
        .lineBetween(it.pivot.x, it.pivot.y, s.x + it.w - 4, s.y + 2);
    }
  },

  // -------------------------------------------------------------------
  // Treibende Baumstämme: Die Quelle steht in der Luftzeile direkt über dem
  // Wasser. Stämme erscheinen dort alle "interval" ms, treiben mit "speed"
  // px/s bis ans Ende des Wassers (in Fliessrichtung) und gehen dort unter.
  // Beim Levelstart treibt schon eine ganze Reihe auf dem Wasser.
  // -------------------------------------------------------------------
  logs: {
    defaults: { speed: 60, interval: 2600, length: 3 },
    create(sys, it) {
      const { charAt, isWater, isTerrain } = sys.parsed;
      it.dir = it.ch === '>' ? 1 : -1;
      // Fliessstrecke: so weit, wie unter der Quellzeile Wasser liegt
      let end = it.c;
      while (isWater(charAt(end + it.dir, it.r + 1)) && !isTerrain(charAt(end + it.dir, it.r))) end += it.dir;
      it.len = it.cfg.length * TILE;
      it.from = it.dir > 0 ? it.c * TILE : (it.c + 1) * TILE - it.len;          // linke Kante beim Erscheinen
      it.to = it.dir > 0 ? (end + 1) * TILE - it.len : end * TILE;              // linke Kante beim Untergehen
      it.top = (it.r + 1) * TILE - 8;                                          // liegt etwas im Wasser
      it.logs = [];
      it.timer = it.cfg.interval;
      sys.scene.add.image(it.x, it.top + 4, 'reeds').setOrigin(0.5, 1).setDepth(DEPTH.WATER + 0.5);
      sys.scene.add.image(it.dir > 0 ? (end + 1) * TILE : end * TILE, it.top + 4, 'reeds').setOrigin(0.5, 1).setDepth(DEPTH.WATER + 0.5).setFlipX(true);
      // Vorbefüllen: Stämme, die "schon unterwegs" sind
      const gap = it.cfg.speed * it.cfg.interval / 1000;
      for (let d = gap; Math.abs(d) <= Math.abs(it.to - it.from); d += gap) this.spawn(sys, it, it.from + it.dir * d, 1);
    },
    spawn(sys, it, x, alpha = 0) {
      const scene = sys.scene;
      const log = scene.add.tileSprite(x, it.top, it.len, 18, 'logTile').setOrigin(0).setDepth(DEPTH.WATER + 0.2).setAlpha(alpha);
      scene.movingPlatforms.add(log);
      log.body.setAllowGravity(false).setImmovable(true).setSize(it.len, 14).setOffset(0, 2);
      log.body.pushable = false;
      oneWay(log.body);
      log.body.reset(x, it.top);
      log.sinking = 0;
      it.logs.push(log);
    },
    update(sys, it, delta) {
      const scene = sys.scene;
      it.timer -= delta;
      if (it.timer <= 0) { it.timer += it.cfg.interval; this.spawn(sys, it, it.from); }
      it.logs.forEach(log => {
        const b = log.body;
        if (log.sinking) {
          // am Ende der Strecke: Stamm geht unter
          log.sinking += delta;
          b.setVelocity(it.dir * it.cfg.speed * 0.4, 18);
          log.setAlpha(Math.max(0, 1 - log.sinking / 600));
          if (log.sinking > 350) b.enable = false;
          if (log.sinking >= 600) log.destroy();
          return;
        }
        b.setVelocity(it.dir * it.cfg.speed, 0);
        if (log.alpha < 1) log.setAlpha(Math.min(1, log.alpha + delta / 400));
        if ((it.dir > 0 && b.x >= it.to) || (it.dir < 0 && b.x <= it.to)) {
          log.sinking = 1;
          Sfx.play(scene, 'logSink');
        }
        sys.carryRiders(b);
      });
      it.logs = it.logs.filter(l => l.active);
    }
  },

  // -------------------------------------------------------------------
  // Steinschlag: Die Höhle lässt alle "interval" ms einen Felsbrocken los
  // (vorher grollt es "warn" ms lang). Brocken rollen mit "speed" in Richtung
  // "dir" (-1 = links), fallen Stufen hinunter und zerbrechen an Wänden,
  // im Wasser oder ausserhalb der Welt. Wer getroffen wird → Checkpoint.
  // Ausweichen: drüberspringen oder in eine 1 Kachel tiefe Nische ducken.
  // -------------------------------------------------------------------
  boulders: {
    defaults: { dir: -1, speed: 140, interval: 3600, warn: 900, first: 1500 },
    create(sys, it) {
      const scene = sys.scene;
      it.chute = scene.add.image(it.x, it.y + TILE, 'rockChute').setOrigin(0.5, 1).setDepth(DEPTH.DECO + 0.5)
        .setFlipX(it.cfg.dir > 0);
      it.timer = it.cfg.first;
      it.warned = false;
    },
    update(sys, it, delta) {
      const scene = sys.scene;
      it.timer -= delta;
      if (!it.warned && it.timer <= it.cfg.warn) {
        it.warned = true;
        Sfx.play(scene, 'rumble');
        scene.fx.dust(it.x + it.cfg.dir * 10, it.y + TILE - 4, 4);
        scene.tweens.add({ targets: it.chute, x: it.x + 2, duration: 50, yoyo: true, repeat: 5, onComplete: () => it.chute.setX(it.x) });
      }
      if (it.timer <= 0) {
        it.timer += it.cfg.interval;
        it.warned = false;
        const rock = scene.rollers.create(it.x, it.y + TILE - 22, 'rollingRock').setDepth(DEPTH.OBJECT + 0.2);
        rock.body.setSize(40, 40).setOffset(2, 2).setMaxVelocityY(PHYSICS.MAX_FALL);
        rock.dir = it.cfg.dir;
        rock.speed = it.cfg.speed;
      }
    }
  }
};

/** Körper nur von oben fest (wie die Holzplattformen). */
function oneWay(body) {
  body.checkCollision.down = false;
  body.checkCollision.left = false;
  body.checkCollision.right = false;
}
