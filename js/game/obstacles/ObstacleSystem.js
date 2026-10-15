/* =====================================================================
 * ObstacleSystem.js – Geschicklichkeits-Hindernisse (Register: obstacles.js)
 *
 *   beim Kartenaufbau  add(ch, c, r)            (LevelBuilder, Zeichen = > < & @)
 *   nach den Spielern  setupCollisions(players) Collider & Treffer
 *   jeden Frame        update(delta)            Zustände, Erscheinen/Untergehen, rollende Brocken
 *   jeder Physik-Schritt onStep()               bewegte Plattformen + Mitfahrer (1/60 s,
 *                                               unabhängig von der Bildrate des Bildschirms)
 *                      render()                 Seile & Co.
 *
 * Physik-Gruppen auf der Szene:
 *   crumbles         Bröckel-Plattformen (statisch, nur von oben fest)
 *   movingPlatforms  Pendel-Plattformen & Baumstämme (immovable, bewegt per
 *                    Geschwindigkeit im Physik-Schritt; Mitfahrer: carryRiders)
 *   rollers          rollende Felsbrocken
 * ===================================================================== */

class ObstacleSystem {
  constructor(scene, parsed) {
    this.scene = scene;
    this.parsed = parsed;
    this.cfg = parsed.level.obstacles || {};
    this.time = 0;                 // Spielzeit in ms (deterministisch, unabhängig von der Uhr)
    this.stepTime = 0;             // Physik-Zeit in ms (zählt nur echte Physik-Schritte)
    this.stepMs = 1000 / scene.physics.world.fps;
    this.items = [];
    this.counts = {};
    this.platforms = [];           // bewegte Plattformen: { body, lastX }
    scene.crumbles = scene.physics.add.staticGroup();
    scene.movingPlatforms = scene.physics.add.group({ allowGravity: false, immovable: true });
    scene.rollers = scene.physics.add.group();
    // Bewegte Plattformen laufen im Takt der Physik, nicht im Takt der Bilder
    const world = scene.physics.world;
    world.on('worldstep', this.onStep, this);
    scene.events.once('shutdown', () => world.off('worldstep', this.onStep, this));
  }

  /** Bewegte Plattform anmelden (Pendel, Baumstamm): immovable, nur von oben fest. */
  addPlatform(sprite) {
    this.scene.movingPlatforms.add(sprite);
    const b = sprite.body;
    b.setAllowGravity(false).setImmovable(true).setFriction(0, 0);
    b.pushable = false;
    oneWay(b);
    this.platforms.push({ sprite, body: b, lastX: null });
  }

  removePlatform(sprite) {
    this.platforms = this.platforms.filter(p => p.sprite !== sprite);
  }

  /**
   * Nach JEDEM Physik-Schritt (Arcade: fest 1/60 s, auch mehrmals pro Bild):
   * Mitfahrer mitnehmen, dann die Plattformen für den nächsten Schritt einstellen.
   */
  onStep() {
    this.carryRiders();
    this.stepTime += this.stepMs;
    this.items.forEach(it => {
      const type = OBSTACLE_TYPES[it.kind];
      if (type.step) type.step(this, it);
    });
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

  /**
   * Rollende Brocken: konstante Geschwindigkeit, zerbrechen an Wänden.
   * Die Drehung kommt aus der tatsächlich gerollten Strecke (Winkel = Weg / Radius),
   * dazu nicht mitdrehendes Licht, ein Bodenschatten und Staub beim Rollen.
   */
  updateRollers(delta) {
    const scene = this.scene;
    scene.rollers.getChildren().slice().forEach(rock => {
      const b = rock.body;
      const blocked = rock.dir < 0 ? (b.blocked.left || b.touching.left) : (b.blocked.right || b.touching.right);
      if (blocked || rock.y > scene.worldHeight + 64) { this.smash(rock); return; }
      b.setVelocityX(rock.dir * rock.speed);
      const x = b.center.x, y = b.center.y;
      rock.angle += Phaser.Math.RadToDeg((x - rock.lastX) / 21);
      rock.lastX = x;
      rock.shade.setPosition(x, y);
      const grounded = b.blocked.down || b.touching.down;
      rock.shadow.setPosition(x, b.bottom + 1).setAlpha(grounded ? 0.35 : 0);
      if (grounded && this.time > rock.nextDust) {
        scene.fx.dust(x - rock.dir * 16, b.bottom, 1);
        rock.nextDust = this.time + 140;
      }
    });
  }

  smash(rock, splash = false) {
    if (!rock.active) return;
    const scene = this.scene;
    if (splash) scene.fx.splash(rock.x, rock.y);
    else if (rock.y < scene.worldHeight) scene.fx.dust(rock.x, rock.body.bottom, 8);
    if (rock.y < scene.worldHeight) Sfx.play(scene, 'rockSmash');
    if (rock.shade) rock.shade.destroy();
    if (rock.shadow) rock.shadow.destroy();
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
   * Mitfahrer haften an bewegten Plattformen: Wer mit den Füssen an der
   * Oberkante ist (und nicht gerade abspringt), wird um den Weg der Plattform
   * in diesem Schritt verschoben und genau auf die Oberkante gesetzt. Dazu
   * merkt sich der Spieler "steht auf Plattform" (zählt als Boden zum
   * Springen) und deren Tempo (Schwung beim Absprung, Player.airVx).
   */
  carryRiders() {
    const players = this.scene.players || [];
    players.forEach(p => { p.onPlatform = false; p.ridingVx = 0; });
    this.platforms.forEach(pl => {
      const pb = pl.body;
      const dx = pl.lastX === null ? 0 : pb.x - pl.lastX;
      pl.lastX = pb.x;
      if (!pb.enable) return;
      players.forEach(p => {
        const b = p.sprite.body;
        if (p.respawning || !b.enable || p.onPlatform) return;
        const overlapX = b.right > pb.left + 1 && b.left < pb.right - 1;
        const dy = b.bottom - pb.top;
        // Absprung = schneller nach oben als die Plattform (nicht: Plattform schwingt hoch)
        const jumping = b.velocity.y - pb.velocity.y < -60;
        if (!overlapX || dy < -6 || dy > 10 || jumping) return;
        b.position.x += dx;
        b.position.y = pb.top - b.height;
        b.velocity.y = pb.velocity.y;                // fährt im nächsten Schritt gleich mit
        p.onPlatform = true;
        p.ridingVx = pb.velocity.x;
      });
    });
  }

  /** Steht der Spieler gerade oben auf diesem Körper? */
  standsOn(p, body) {
    const b = p.sprite.body;
    return !p.respawning && body.enable && (b.touching.down || b.blocked.down) &&
      Math.abs(b.bottom - body.top) < 4 && b.right > body.left + 1 && b.left < body.right - 1;
  }
}
