/* =====================================================================
 * ObstacleSystem.js – Geschicklichkeits-Hindernisse (Register: obstacles.js)
 *
 *   beim Kartenaufbau  add(ch, c, r)            (LevelBuilder, Zeichen = > < & @)
 *   nach den Spielern  setupCollisions(players) Collider & Treffer
 *   jeden Frame        update(delta)            Bewegung, Zustände, rollende Brocken
 *                      render()                 Seile & Co.
 *
 * Physik-Gruppen auf der Szene:
 *   crumbles         Bröckel-Plattformen (statisch, nur von oben fest)
 *   movingPlatforms  Pendel-Plattformen & Baumstämme (immovable, bewegt per
 *                    Geschwindigkeit; Mitfahrer verschiebt carryRiders)
 *   rollers          rollende Felsbrocken
 * ===================================================================== */

class ObstacleSystem {
  constructor(scene, parsed) {
    this.scene = scene;
    this.parsed = parsed;
    this.cfg = parsed.level.obstacles || {};
    this.time = 0;                 // Spielzeit in ms (deterministisch, unabhängig von der Uhr)
    this.items = [];
    this.counts = {};
    scene.crumbles = scene.physics.add.staticGroup();
    scene.movingPlatforms = scene.physics.add.group({ allowGravity: false, immovable: true });
    scene.rollers = scene.physics.add.group();
  }

  /** Hindernis für ein Kartenzeichen anlegen. */
  add(ch, c, r) {
    const kind = OBSTACLE_CHARS[ch];
    const type = OBSTACLE_TYPES[kind];
    const index = this.counts[ch] || 0;
    this.counts[ch] = index + 1;
    // Einstellungen: Standard ← Level; Listen gelten pro Hindernis der Reihe nach
    const cfg = Object.assign({}, type.defaults);
    Object.entries(this.cfg[ch] || {}).forEach(([k, v]) => {
      cfg[k] = Array.isArray(v) ? v[Math.min(index, v.length - 1)] : v;
    });
    const item = { ch, kind, c, r, x: c * TILE + TILE / 2, y: r * TILE, cfg, index };
    type.create(this, item);
    this.items.push(item);
  }

  setupCollisions(players) {
    const scene = this.scene, physics = scene.physics;
    const sprites = players.map(p => p.sprite);
    physics.add.collider(sprites, scene.crumbles);
    physics.add.collider(sprites, scene.movingPlatforms);
    physics.add.collider(scene.blocks, scene.crumbles);

    // Felsbrocken rollen über Gelände, Tore, Plattformen, Aufzüge und Blöcke
    [scene.solids, scene.gates, scene.oneWays, scene.blocks, scene.crumbles].forEach(g => physics.add.collider(scene.rollers, g));
    physics.add.collider(scene.rollers, scene.mechanics.liftSprites());
    physics.add.overlap(scene.rollers, scene.water, rock => this.smash(rock, true));
    physics.add.overlap(sprites, scene.rollers, sprite => {
      const player = players.find(p => p.sprite === sprite);
      if (player) this.hit(player);
    });
  }

  update(delta) {
    this.time += delta;
    this.items.forEach(it => {
      const type = OBSTACLE_TYPES[it.kind];
      if (type.update) type.update(this, it, delta);
    });
    this.updateRollers(delta);
  }

  render() {
    this.items.forEach(it => {
      const type = OBSTACLE_TYPES[it.kind];
      if (type.render) type.render(this, it);
    });
  }

  /** Rollende Brocken: konstante Geschwindigkeit, drehen sich, zerbrechen an Wänden. */
  updateRollers(delta) {
    this.scene.rollers.getChildren().slice().forEach(rock => {
      const b = rock.body;
      const blocked = rock.dir < 0 ? (b.blocked.left || b.touching.left) : (b.blocked.right || b.touching.right);
      if (blocked || rock.y > this.scene.worldHeight + 64) { this.smash(rock); return; }
      b.setVelocityX(rock.dir * rock.speed);
      rock.angle += rock.dir * rock.speed * (delta / 1000) * (180 / Math.PI) / 21;
    });
  }

  smash(rock, splash = false) {
    if (!rock.active) return;
    const scene = this.scene;
    if (splash) scene.fx.splash(rock.x, rock.y);
    else if (rock.y < scene.worldHeight) scene.fx.dust(rock.x, rock.body.bottom, 8);
    if (rock.y < scene.worldHeight) Sfx.play(scene, 'rockSmash');
    rock.destroy();
  }

  /** Ein Felsbrocken hat einen Spieler erwischt → zurück zum Checkpoint. */
  hit(player) {
    if (player.respawning || this.scene.completed) return;
    Sfx.play(this.scene, 'boulderHit');
    this.scene.toast(TXT.boulderHit, '#ff8080');
    player.respawn('fall');
  }

  /**
   * Mitfahrer mitnehmen: Wer oben steht, wird um die Strecke verschoben, die die
   * Plattform im letzten Physik-Schritt zurückgelegt hat, und merkt sich deren
   * Tempo (Schwung beim Absprung, siehe Player.airVx).
   */
  carryRiders(body) {
    const dx = body.deltaX();
    this.scene.players.forEach(p => {
      if (!this.standsOn(p, body)) return;
      p.sprite.x += dx;
      p.ridingVx = body.velocity.x;
    });
  }

  /** Steht der Spieler gerade oben auf diesem Körper? */
  standsOn(p, body) {
    const b = p.sprite.body;
    return !p.respawning && body.enable && (b.touching.down || b.blocked.down) &&
      Math.abs(b.bottom - body.top) < 4 && b.right > body.left + 1 && b.left < body.right - 1;
  }
}
