/* =====================================================================
 * GameScene – Das eigentliche Gameplay
 *
 * Ablauf:
 *   create()  → Level aus ASCII-Karte bauen, Spieler erzeugen, Kollisionen,
 *               Kamera und HUD einrichten
 *   update()  → Eingaben lesen, Spieler bewegen, Mechaniken (Schalter,
 *               Hebel, Farbtasten, Aufzüge, Brücken, Förderbänder) auswerten,
 *               Feststecken auflösen, Checkpoints, Gefahren und Ziel prüfen
 *
 * Die Spieler kollidieren NICHT miteinander und können nicht
 * aufeinander stehen. Koop entsteht nur über Mechaniken.
 *
 * Module in js/game/: Player, Fx, Hud, Unstuck, BlockSystem und die
 * Mechaniken (mechanics/: MechanicsSystem + Register triggers.js/targets.js).
 * ===================================================================== */

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  /** Wird beim Start der Szene mit { levelIndex } aufgerufen. */
  init(data) {
    this.levelIndex = Phaser.Math.Clamp(data.levelIndex || 0, 0, LEVELS.length - 1);
    this.level = LEVELS[this.levelIndex];
    this.completed = false;
    this.collected = 0;
    this.totalEdelweiss = 0;
  }

  create() {
    this.inputs = createPlayerInputs(this);
    this.fx = new Fx(this);
    this.unstuck = new Unstuck(this);
    this.backdrop = addBackdrop(this, this.level.sky);

    this.buildLevel();
    this.createPlayers();
    this.setupCollisions();
    this.setupCamera();
    this.fx.createAtmosphere(this.flowers);
    this.hud = new Hud(this, this.levelIndex, this.level);
    this.hud.setFlowers(this.collected, this.totalEdelweiss);
    this.hud.showLevelIntro();

    // Globale Tasten: ESC = Menü, R = Level neu starten, M = Ton an/aus
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('MenuScene'));
    this.input.keyboard.on('keydown-R', () => this.scene.restart({ levelIndex: this.levelIndex }));
    this.input.keyboard.on('keydown-M', () => this.toast(Sfx.toggleMute() ? 'Ton aus' : 'Ton an', '#ffffff'));
  }

  // =====================================================================
  // LEVEL AUFBAUEN
  // =====================================================================
  buildLevel() {
    const map = this.level.map;
    this.rows = map.length;
    this.cols = Math.max(...map.map(r => r.length));
    this.worldWidth = this.cols * TILE;
    this.worldHeight = this.rows * TILE;

    // Physik-Gruppen
    this.solids = this.physics.add.staticGroup();     // Erde, Fels, Bachsteine, Förderbänder
    this.oneWays = this.physics.add.staticGroup();    // Holzplattformen
    this.gates = this.physics.add.staticGroup();      // Tore, Kisten-Brücken, Zugbrücken (an/aus)
    this.water = this.physics.add.staticGroup();      // Gefahren
    this.flowers = this.physics.add.staticGroup();    // Edelweiss

    // Logische Objekte
    this.spawns = {};             // { 1: {x,y}, 2: {x,y} }
    this.checkpoints = [];
    this.infoSigns = [];
    this.blockSpawns = [];        // schiebbare Kisten & Felsbrocken (werden nach der Karte erzeugt)
    this.goal = null;

    // Schalter, Hebel, Farbtasten & ihre Ziele (js/game/mechanics/)
    this.mechanics = new MechanicsSystem(this, this.level);
    const mech = this.mechanics;

    const charAt = (c, r) => (map[r] && map[r][c]) || ' ';
    const isTerrain = ch => ch === '#' || ch === 'R' || ch === 'o' || mech.isTerrain(ch);
    const isWater = ch => ch === '~' || mech.isWater(ch);
    const terrain = [];           // alle festen Geländekacheln (Kanten-Culling & Licht)
    const hash = (c, r) => ((c * 73856093) ^ (r * 19349663)) >>> 0;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const ch = charAt(c, r);
        if (ch === ' ' || ch === '.') continue;

        const x = c * TILE, y = r * TILE;          // linke obere Ecke der Zelle
        const cx = x + TILE / 2, bottom = y + TILE;  // Mitte / Unterkante

        // --- Mechanik-Zeichen aus der Level-Konfiguration ---------------
        if (mech.isTrigger(ch)) {
          mech.addTrigger(ch, cx, bottom);
          continue;
        }
        if (mech.isBoard(ch)) {
          mech.addSequenceBoard(ch, cx, bottom);
          continue;
        }
        if (mech.isTarget(ch)) {
          const tile = mech.addTargetCell(ch, c, r, !isWater(charAt(c, r - 1)));
          if (tile && mech.isTerrain(ch)) terrain.push({ c, r, tile, plain: true });
          continue;
        }

        // --- Standard-Zeichen -------------------------------------------
        switch (ch) {
          case '#': {
            // Gras nur, wenn oben wirklich Luft ist (nicht unter Band, Stein oder Wasser)
            const above = charAt(c, r - 1);
            const surface = !isTerrain(above) && !isWater(above);
            const tex = surface ? `grass${hash(c, r) % 3}` : `earth${hash(c, r) % 2}`;
            terrain.push({ c, r, tile: this.solids.create(cx, y + TILE / 2, tex).setDepth(DEPTH.TERRAIN) });
            break;
          }
          case 'R':
            terrain.push({ c, r, tile: this.solids.create(cx, y + TILE / 2, 'rock').setDepth(DEPTH.TERRAIN) });
            break;
          case 'o':
            terrain.push({ c, r, tile: this.solids.create(cx, y + TILE / 2, 'stone').setDepth(DEPTH.TERRAIN) });
            break;
          case '-': {
            this.add.image(cx, y + 18, 'platformShadow').setDepth(DEPTH.TERRAIN - 0.2);
            const p = this.oneWays.create(cx, y + 6, 'platform').setDepth(DEPTH.TERRAIN);
            // Nur von oben fest: von unten und seitlich kann man durch
            p.body.checkCollision.down = false;
            p.body.checkCollision.left = false;
            p.body.checkCollision.right = false;
            break;
          }
          case '~':
            this.createWaterTile(cx, y + TILE / 2, !isWater(charAt(c, r - 1)), c);
            break;
          case '1':
          case '2':
            this.spawns[ch] = { x: cx, y: bottom - 16 };
            break;
          case 'F': {
            const flag = this.add.image(cx, bottom, 'flag_off').setOrigin(0.5, 1).setDepth(DEPTH.OBJECT);
            this.checkpoints.push({ x: cx, y: bottom - 16, sprite: flag, reachedBy: new Set() });
            break;
          }
          case '*': {
            const f = this.flowers.create(cx, y + TILE / 2, 'edelweiss').setDepth(DEPTH.OBJECT);
            this.tweens.add({ targets: f, y: f.y - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: c * 40 });
            this.totalEdelweiss++;
            break;
          }
          case 'i': {
            const s = this.add.image(cx, bottom, 'infoSign').setOrigin(0.5, 1).setDepth(DEPTH.DECO);
            this.infoSigns.push({ x: cx, y: bottom, sprite: s, text: '' });
            break;
          }
          case 'G':
            this.createGoal(cx, bottom);
            break;
          case 'H':
            this.add.image(cx, bottom, 'house').setOrigin(0.5, 1).setDepth(DEPTH.DECO);
            break;
          case 'T':
            this.add.image(cx, bottom, 'tree').setOrigin(0.5, 1).setDepth(DEPTH.DECO);
            break;
          case 'A':
            addRestaurant(this, cx, bottom, DEPTH.DECO, 0.8);
            break;
          case 'k':   // Kiste: Mitte der Zelle
            this.blockSpawns.push({ x: cx, y: y + TILE / 2, texture: 'pushCrate', weight: BLOCKS.CRATE_WEIGHT });
            break;
          case 'K':   // Felsbrocken 2×2: Zeichen markiert die linke untere Zelle
            this.blockSpawns.push({ x: x + TILE, y: bottom - TILE, texture: 'boulder', weight: BLOCKS.BOULDER_WEIGHT });
            break;
          default:
            console.warn(`Unbekanntes Kartenzeichen "${ch}" in Zeile ${r}, Spalte ${c}`);
        }
      }
    }

    this.styleTerrain(terrain, charAt, isTerrain, hash);

    // Infotafeln von links nach rechts mit den Hinweisen aus dem Level belegen
    this.infoSigns.sort((a, b) => a.x - b.x);
    this.infoSigns.forEach((s, i) => { s.text = fillNames((this.level.hints || [])[i] || ''); });

    // Mechaniken fertig bauen und in den Startzustand setzen
    mech.finish();

    this.blockSystem = new BlockSystem(this, this.blockSpawns);
    this.blocks = this.blockSystem.blocks;

    // Weltgrenzen: links/rechts/oben fest, unten offen (man kann herunterfallen)
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.physics.world.setBoundsCollision(true, true, true, false);
  }

  /**
   * Gelände-Feinschliff:
   *  - innere Kanten ohne Kollision (sonst bleibt man an Wandfugen hängen)
   *  - Licht: je tiefer unter der Oberfläche, desto dunkler
   *  - Seitenschatten, überhängendes Gras und Grasbüschel an freien Kanten
   */
  styleTerrain(terrain, charAt, isTerrain, hash) {
    const lit = Phaser.Display.Color.ValueToColor(0xffffff);
    const dark = Phaser.Display.Color.ValueToColor(0x8e92a8);
    terrain.forEach(({ c, r, tile, plain }) => {
      const cc = tile.body.checkCollision;
      cc.up = !isTerrain(charAt(c, r - 1));
      cc.down = !isTerrain(charAt(c, r + 1));
      cc.left = !isTerrain(charAt(c - 1, r));
      cc.right = !isTerrain(charAt(c + 1, r));
      if (plain) return;

      let depth = 0;
      while (depth < 10 && isTerrain(charAt(c, r - depth - 1))) depth++;
      const mix = Phaser.Display.Color.Interpolate.ColorWithColor(lit, dark, 100, depth * 10);   // sanft, ohne harte Stufen
      const tint = Phaser.Display.Color.GetColor(mix.r, mix.g, mix.b);
      tile.setTint(tint);

      const left = tile.x - TILE / 2, right = tile.x + TILE / 2, top = tile.y - TILE / 2;
      const isGrass = tile.texture.key.startsWith('grass');
      if (cc.left) {
        this.add.image(tile.x, tile.y, 'shadeL').setDepth(DEPTH.TERRAIN + 0.1);
        if (isGrass) this.add.image(left + 1, top, 'grassLip').setOrigin(1, 0).setFlipX(true).setDepth(DEPTH.TERRAIN + 0.2);
      }
      if (cc.right) {
        this.add.image(tile.x, tile.y, 'shadeR').setDepth(DEPTH.TERRAIN + 0.1);
        if (isGrass) this.add.image(right - 1, top, 'grassLip').setOrigin(0, 0).setDepth(DEPTH.TERRAIN + 0.2);
      }
      if (isGrass && hash(c, r) % 4 === 0) {
        const tuft = this.add.image(tile.x + (hash(c, r) % 13) - 6, top + 1, 'tuft').setOrigin(0.5, 1)
          .setDepth(DEPTH.TERRAIN + 0.3);
        this.tweens.add({ targets: tuft, angle: { from: -5, to: 5 }, duration: 1400 + (hash(c, r) % 900), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      }
    });
  }

  /** Wasserkachel: an der Oberfläche animierte Wellen, darunter tiefes Wasser. */
  createWaterTile(cx, cy, surface, c) {
    const w = surface
      ? this.water.create(cx, cy, 'waterTop', 0).setDepth(DEPTH.WATER)
      : this.water.create(cx, cy, 'waterDeep').setDepth(DEPTH.WATER);
    if (surface) {
      w.play({ key: 'water-wave', startFrame: c % 4 });
      w.body.setSize(TILE, TILE - 10).setOffset(0, 10);   // erst "nass", wenn man eintaucht
    }
    return w;
  }

  createGoal(cx, bottom) {
    // Pfosten des Wegweisers steht auf der Zelle, das Schild zeigt nach rechts
    const sign = this.add.image(cx, bottom, 'goalSign').setOrigin(16 / 140, 1).setDepth(DEPTH.DECO);
    const boardX = sign.x - 16 + 60, boardY = bottom - 110 + 22;
    this.add.text(boardX, boardY, 'Albishorn', {
      fontFamily: FONT, fontSize: '10px', color: '#111111'
    }).setOrigin(0.5).setDepth(DEPTH.DECO);
    const zielText = this.add.text(boardX, boardY - 30, 'ZIEL', {
      fontFamily: FONT, fontSize: '12px', color: '#ffffff', stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(DEPTH.DECO);
    this.tweens.add({ targets: zielText, y: zielText.y - 4, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // Zielbereich: rund um den Wegweiser
    this.goal = { zone: new Phaser.Geom.Rectangle(cx - 40, bottom - 96, 150, 96) };
  }

  // =====================================================================
  // SPIELER
  // =====================================================================
  createPlayers() {
    this.players = PLAYER_DEFS.map((def, i) => {
      const spawn = this.spawns[def.id] || { x: 64 + i * 48, y: this.worldHeight - 3 * TILE };
      return new Player(this, def, this.inputs[i], spawn);
    });
  }

  setupCollisions() {
    const sprites = this.players.map(p => p.sprite);
    const liftSprites = this.mechanics.liftSprites();
    this.liftSprites = new Set(liftSprites);

    this.physics.add.collider(sprites, this.solids);
    this.physics.add.collider(sprites, this.oneWays);
    this.physics.add.collider(sprites, this.gates);
    this.physics.add.collider(sprites, liftSprites);
    // Sprint 4: KEIN Collider zwischen den Spielern – sie laufen durcheinander durch.

    // Edelweiss einsammeln
    this.physics.add.overlap(sprites, this.flowers, (sprite, flower) => this.collectFlower(flower));

    // Wasser = zurück zum Checkpoint
    this.physics.add.overlap(sprites, this.water, sprite => {
      const player = this.players.find(p => p.sprite === sprite);
      if (player) player.respawn('water');
    });

    // Schiebbare Blöcke: liegen auf Gelände, Spieler stehen auf ihnen
    this.physics.add.collider(this.blocks, this.solids);
    this.physics.add.collider(this.blocks, this.oneWays);
    this.physics.add.collider(this.blocks, this.gates);
    this.physics.add.collider(this.blocks, this.blocks);
    this.physics.add.collider(this.blocks, liftSprites);
    this.physics.add.collider(sprites, this.blocks);
  }

  setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.worldWidth, this.worldHeight);
    cam.setRoundPixels(true);

    // Die Kamera folgt weich einem unsichtbaren Punkt zwischen beiden Spielern
    this.camTarget = this.add.zone(0, 0, 1, 1);
    this.updateCameraTarget();
    cam.startFollow(this.camTarget, true, 0.09, 0.09);
    cam.centerOn(this.camTarget.x, this.camTarget.y);
  }

  updateCameraTarget() {
    const [a, b] = this.players.map(p => p.sprite);
    this.camTarget.setPosition((a.x + b.x) / 2, (a.y + b.y) / 2 - 40);
  }

  // =====================================================================
  // HUD
  // =====================================================================
  /** Kurze Meldung in der Bildmitte (für alle Systeme der Szene). */
  toast(message, color) {
    this.hud.toast(message, color);
  }

  // =====================================================================
  // UPDATE-SCHLEIFE
  // =====================================================================
  update(time, delta) {
    this.inputs.forEach(i => i.update());

    if (!this.completed) {
      this.players.forEach(p => p.update(time, delta));
      this.limitPlayerSpread();
      this.blockSystem.update(time);
      this.mechanics.update(delta);
      this.unstuck.resolve();
      this.updateCheckpoints();
      this.updateGoal();
    }

    this.players.forEach(p => {
      if (p.sprite.y > this.worldHeight + 48) p.respawn(); // aus der Welt gefallen
    });

    this.mechanics.render();
    this.players.forEach(p => p.updateView(time, delta));
    this.hud.updateInfoSigns(this.infoSigns, this.players);
    this.hud.update(this.players);
    this.updateCameraTarget();
    this.backdrop.update(this.cameras.main, this.worldHeight, delta);
  }

  /** Beide Spieler müssen gemeinsam im Bild bleiben. */
  limitPlayerSpread() {
    const [a, b] = this.players.map(p => p.sprite.body);
    const dx = a.center.x - b.center.x;
    if (Math.abs(dx) < MAX_PLAYER_SPREAD) return;
    const [right, left] = dx > 0 ? [a, b] : [b, a];
    if (right.velocity.x > 0) right.setVelocityX(0);  // nicht weiter auseinander laufen
    if (left.velocity.x < 0) left.setVelocityX(0);
  }

  // =====================================================================
  // CHECKPOINTS & SAMMELOBJEKTE
  // =====================================================================
  updateCheckpoints() {
    this.checkpoints.forEach(cp => {
      this.players.forEach(p => {
        if (cp.reachedBy.has(p.def.id)) return;
        const s = p.sprite;
        if (Math.abs(s.x - cp.x) < 24 && Math.abs(s.y - cp.y) < 40) {
          cp.reachedBy.add(p.def.id);
          p.checkpoint = { x: cp.x, y: cp.y };
          if (cp.sprite.texture.key !== 'flag_on') {
            cp.sprite.setTexture('flag_on');
            this.tweens.add({ targets: cp.sprite, scaleX: 0.85, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
          }
          Sfx.play(this, 'checkpoint');
          this.toast(`Checkpoint für ${p.def.name}!`, p.def.colorCss);
        }
      });
    });
  }

  collectFlower(flower) {
    if (!flower.active || !flower.body.enable) return;
    this.tweens.killTweensOf(flower);
    flower.body.enable = false;
    this.fx.collect(flower);
    this.collected++;
    this.hud.setFlowers(this.collected, this.totalEdelweiss);
    Sfx.play(this, 'collect');
  }

  // =====================================================================
  // ZIEL
  // =====================================================================
  updateGoal() {
    if (!this.goal) return;
    this.players.forEach(p => {
      const wasAtGoal = p.atGoal;
      p.atGoal = Phaser.Geom.Rectangle.Contains(this.goal.zone, p.sprite.x, p.sprite.y);
      if (p.atGoal && !wasAtGoal && !this.players.every(q => q.atGoal)) {
        const other = this.players.find(q => q !== p);
        this.toast(`Warte auf ${other.def.name}!`, p.def.colorCss);
      }
    });

    // Level geschafft erst, wenn BEIDE Spieler am Ziel sind
    if (this.players.every(p => p.atGoal)) this.completeLevel();
  }

  completeLevel() {
    this.completed = true;
    this.players.forEach(p => p.celebrate());
    Sfx.play(this, 'win');
    this.toast('GESCHAFFT!', '#7dff9a');
    this.fx.confetti();

    // Edelweiss-Ergebnis merken (bestes Ergebnis pro Level) – fürs Finale
    const results = this.registry.get('edelweiss') || {};
    const prev = results[this.levelIndex];
    if (!prev || prev.collected < this.collected) {
      results[this.levelIndex] = { collected: this.collected, total: this.totalEdelweiss };
    }
    this.registry.set('edelweiss', results);

    // Nach dem letzten Level geht es direkt zur Geburtstagsfeier
    const isLast = this.levelIndex >= LEVELS.length - 1;
    this.time.delayedCall(2200, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(isLast ? 'FinaleScene' : 'VictoryScene', {
          levelIndex: this.levelIndex,
          collected: this.collected,
          total: this.totalEdelweiss
        });
      });
    });
  }
}
