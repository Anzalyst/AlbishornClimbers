/* =====================================================================
 * LevelBuilder.js – Datenobjekt aus dem LevelParser → Phaser-Objekte
 *
 *   const builder = new LevelBuilder(scene);
 *   builder.build(LevelParser.parse(level));   Gelände, Wasser, Deko, Mechaniken, Blöcke
 *   builder.setupCollisions(players);          Collider & Overlaps (nach den Spielern)
 *
 * Legt auf der Szene an:
 *   Physik-Gruppen  solids, oneWays, gates, water, flowers
 *   Logik           spawns, checkpoints, infoSigns, goal, totalEdelweiss,
 *                   mechanics (MechanicsSystem), blockSystem/blocks, liftSprites
 *   Welt            rows, cols, worldWidth, worldHeight
 *
 * Wird später eine Phaser-Tilemap eingeführt, ändert sich nur diese Datei.
 * ===================================================================== */

/** Wasserkachel: an der Oberfläche animierte Wellen, darunter tiefes Wasser. */
function addWaterTile(scene, cx, cy, surface, c) {
  const w = surface
    ? scene.water.create(cx, cy, 'waterTop', 0).setDepth(DEPTH.WATER)
    : scene.water.create(cx, cy, 'waterDeep').setDepth(DEPTH.WATER);
  if (surface) {
    w.play({ key: 'water-wave', startFrame: c % 4 });
    w.body.setSize(TILE, TILE - 10).setOffset(0, 10);   // erst "nass", wenn man eintaucht
  }
  return w;
}

class LevelBuilder {
  constructor(scene) {
    this.scene = scene;
  }

  build(parsed) {
    const scene = this.scene;
    const { charAt, isTerrain, isWater } = parsed;
    parsed.warnings.forEach(w => console.warn(w));

    scene.rows = parsed.rows;
    scene.cols = parsed.cols;
    scene.worldWidth = parsed.cols * TILE;
    scene.worldHeight = parsed.rows * TILE;

    // Physik-Gruppen
    scene.solids = scene.physics.add.staticGroup();     // Erde, Fels, Bachsteine, Förderbänder
    scene.oneWays = scene.physics.add.staticGroup();    // Holzplattformen
    scene.gates = scene.physics.add.staticGroup();      // Tore, Kisten-Brücken, Zugbrücken (an/aus)
    scene.water = scene.physics.add.staticGroup();      // Gefahren
    scene.flowers = scene.physics.add.staticGroup();    // Edelweiss

    // Logische Objekte
    scene.spawns = {};             // { 1: {x,y}, 2: {x,y} }
    scene.checkpoints = [];
    scene.infoSigns = [];
    scene.goal = null;
    const blockSpawns = [];        // schiebbare Kisten & Felsbrocken (werden nach der Karte erzeugt)

    // Schalter, Hebel, Farbtasten & ihre Ziele (js/game/mechanics/)
    scene.mechanics = new MechanicsSystem(scene, parsed.level);
    const mech = scene.mechanics;

    const terrain = [];            // alle festen Geländekacheln (Kanten-Culling & Licht)
    const hash = (c, r) => ((c * 73856093) ^ (r * 19349663)) >>> 0;

    parsed.cells.forEach(({ c, r, ch, kind }) => {
      const x = c * TILE, y = r * TILE;            // linke obere Ecke der Zelle
      const cx = x + TILE / 2, bottom = y + TILE;  // Mitte / Unterkante

      switch (kind) {
        // --- Mechanik-Zeichen aus der Level-Konfiguration ---------------
        case 'trigger':
          mech.addTrigger(ch, cx, bottom);
          break;
        case 'board':
          mech.addSequenceBoard(ch, cx, bottom);
          break;
        case 'target': {
          const tile = mech.addTargetCell(ch, c, r, !isWater(charAt(c, r - 1)));
          if (tile && isTerrain(ch)) terrain.push({ c, r, tile, plain: true });
          break;
        }

        // --- Standard-Zeichen -------------------------------------------
        case 'terrain': {
          let tex = ch === 'R' ? 'rock' : 'stone';
          if (ch === '#') {
            // Gras nur, wenn oben wirklich Luft ist (nicht unter Band, Stein oder Wasser)
            const above = charAt(c, r - 1);
            const surface = !isTerrain(above) && !isWater(above);
            tex = surface ? `grass${hash(c, r) % 3}` : `earth${hash(c, r) % 2}`;
          }
          terrain.push({ c, r, tile: scene.solids.create(cx, y + TILE / 2, tex).setDepth(DEPTH.TERRAIN) });
          break;
        }
        case 'platform': {
          scene.add.image(cx, y + 18, 'platformShadow').setDepth(DEPTH.TERRAIN - 0.2);
          const p = scene.oneWays.create(cx, y + 6, 'platform').setDepth(DEPTH.TERRAIN);
          // Nur von oben fest: von unten und seitlich kann man durch
          p.body.checkCollision.down = false;
          p.body.checkCollision.left = false;
          p.body.checkCollision.right = false;
          break;
        }
        case 'water':
          addWaterTile(scene, cx, y + TILE / 2, !isWater(charAt(c, r - 1)), c);
          break;
        case 'spawn':
          scene.spawns[ch] = { x: cx, y: bottom - 16 };
          break;
        case 'checkpoint': {
          const flag = scene.add.image(cx, bottom, 'flag_off').setOrigin(0.5, 1).setDepth(DEPTH.OBJECT);
          scene.checkpoints.push({ x: cx, y: bottom - 16, sprite: flag, reachedBy: new Set() });
          break;
        }
        case 'collectible': {
          const f = scene.flowers.create(cx, y + TILE / 2, 'edelweiss').setDepth(DEPTH.OBJECT);
          scene.tweens.add({ targets: f, y: f.y - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: c * 40 });
          scene.totalEdelweiss++;
          break;
        }
        case 'sign': {
          const s = scene.add.image(cx, bottom, 'infoSign').setOrigin(0.5, 1).setDepth(DEPTH.DECO);
          scene.infoSigns.push({ x: cx, y: bottom, sprite: s, text: '' });
          break;
        }
        case 'goal':
          this.createGoal(cx, bottom);
          break;
        case 'deco':
          if (ch === 'H') scene.add.image(cx, bottom, 'house').setOrigin(0.5, 1).setDepth(DEPTH.DECO);
          else if (ch === 'T') scene.add.image(cx, bottom, 'tree').setOrigin(0.5, 1).setDepth(DEPTH.DECO);
          else if (ch === 'A') addRestaurant(scene, cx, bottom, DEPTH.DECO, 0.8);
          break;
        case 'block':
          if (ch === 'k') {
            // Kiste: Mitte der Zelle
            blockSpawns.push({ x: cx, y: y + TILE / 2, texture: 'pushCrate', weight: BLOCKS.CRATE_WEIGHT });
          } else {
            // Felsbrocken 2×2: Zeichen markiert die linke untere Zelle
            blockSpawns.push({ x: x + TILE, y: bottom - TILE, texture: 'boulder', weight: BLOCKS.BOULDER_WEIGHT });
          }
          break;
      }
    });

    this.styleTerrain(terrain, charAt, isTerrain, hash);

    // Infotafeln von links nach rechts mit den Hinweisen aus dem Level belegen
    scene.infoSigns.sort((a, b) => a.x - b.x);
    scene.infoSigns.forEach((s, i) => { s.text = fillNames((parsed.level.hints || [])[i] || ''); });

    // Mechaniken fertig bauen und in den Startzustand setzen
    mech.finish();

    scene.blockSystem = new BlockSystem(scene, blockSpawns);
    scene.blocks = scene.blockSystem.blocks;

    // Weltgrenzen: links/rechts/oben fest, unten offen (man kann herunterfallen)
    scene.physics.world.setBounds(0, 0, scene.worldWidth, scene.worldHeight);
    scene.physics.world.setBoundsCollision(true, true, true, false);
  }

  /**
   * Gelände-Feinschliff:
   *  - innere Kanten ohne Kollision (sonst bleibt man an Wandfugen hängen)
   *  - Licht: je tiefer unter der Oberfläche, desto dunkler
   *  - Seitenschatten, überhängendes Gras und Grasbüschel an freien Kanten
   */
  styleTerrain(terrain, charAt, isTerrain, hash) {
    const scene = this.scene;
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
        scene.add.image(tile.x, tile.y, 'shadeL').setDepth(DEPTH.TERRAIN + 0.1);
        if (isGrass) scene.add.image(left + 1, top, 'grassLip').setOrigin(1, 0).setFlipX(true).setDepth(DEPTH.TERRAIN + 0.2);
      }
      if (cc.right) {
        scene.add.image(tile.x, tile.y, 'shadeR').setDepth(DEPTH.TERRAIN + 0.1);
        if (isGrass) scene.add.image(right - 1, top, 'grassLip').setOrigin(0, 0).setDepth(DEPTH.TERRAIN + 0.2);
      }
      if (isGrass && hash(c, r) % 4 === 0) {
        const tuft = scene.add.image(tile.x + (hash(c, r) % 13) - 6, top + 1, 'tuft').setOrigin(0.5, 1)
          .setDepth(DEPTH.TERRAIN + 0.3);
        scene.tweens.add({ targets: tuft, angle: { from: -5, to: 5 }, duration: 1400 + (hash(c, r) % 900), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      }
    });
  }

  /** Ziel: gelber Wanderwegweiser "Albishorn" mit Zielbereich drumherum. */
  createGoal(cx, bottom) {
    const scene = this.scene;
    // Pfosten des Wegweisers steht auf der Zelle, das Schild zeigt nach rechts
    const sign = scene.add.image(cx, bottom, 'goalSign').setOrigin(16 / 140, 1).setDepth(DEPTH.DECO);
    const boardX = sign.x - 16 + 60, boardY = bottom - 110 + 22;
    scene.add.text(boardX, boardY, TXT.goalBoard, {
      fontFamily: FONT, fontSize: '10px', color: '#111111'
    }).setOrigin(0.5).setDepth(DEPTH.DECO);
    const zielText = scene.add.text(boardX, boardY - 30, TXT.goalSign, {
      fontFamily: FONT, fontSize: '12px', color: '#ffffff', stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(DEPTH.DECO);
    scene.tweens.add({ targets: zielText, y: zielText.y - 4, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // Zielbereich: rund um den Wegweiser
    scene.goal = { zone: new Phaser.Geom.Rectangle(cx - 40, bottom - 96, 150, 96) };
  }

  /** Collider & Overlaps – nach dem Erzeugen der Spieler aufrufen. */
  setupCollisions(players) {
    const scene = this.scene;
    const physics = scene.physics;
    const sprites = players.map(p => p.sprite);
    const liftSprites = scene.mechanics.liftSprites();
    scene.liftSprites = new Set(liftSprites);

    physics.add.collider(sprites, scene.solids);
    physics.add.collider(sprites, scene.oneWays);
    physics.add.collider(sprites, scene.gates);
    physics.add.collider(sprites, liftSprites);
    // KEIN Collider zwischen den Spielern – sie laufen durcheinander durch.

    // Edelweiss einsammeln
    physics.add.overlap(sprites, scene.flowers, (sprite, flower) => scene.collectFlower(flower));

    // Wasser = zurück zum Checkpoint
    physics.add.overlap(sprites, scene.water, sprite => {
      const player = players.find(p => p.sprite === sprite);
      if (player) player.respawn('water');
    });

    // Schiebbare Blöcke: liegen auf Gelände, Spieler stehen auf ihnen
    physics.add.collider(scene.blocks, scene.solids);
    physics.add.collider(scene.blocks, scene.oneWays);
    physics.add.collider(scene.blocks, scene.gates);
    physics.add.collider(scene.blocks, scene.blocks);
    physics.add.collider(scene.blocks, liftSprites);
    physics.add.collider(sprites, scene.blocks);
  }
}
