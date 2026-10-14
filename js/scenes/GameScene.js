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
 * Sprint 4: Die Spieler kollidieren NICHT mehr miteinander (keine
 * Räuberleiter). Koop entsteht nur noch über Mechaniken.
 *
 * Darstellung: Jeder Spieler hat einen unsichtbaren Physik-Körper
 * (p.sprite) und eine sichtbare Figur (p.view), die gestaucht/gestreckt
 * werden kann, ohne die Physik zu beeinflussen.
 * ===================================================================== */

// Darstellungsreihenfolge (höher = weiter vorne)
const DEPTH = {
  DECO: 1, DOOR: 4, TERRAIN: 5, MECH: 6, OBJECT: 7, WATER: 8, SHADOW: 9, PLAYER: 10,
  FX: 20, VIGNETTE: 95, HUD: 100
};

// Farben der Farbtasten-Sequenzen
const SEQ_COLORS = { red: 0xe0413a, blue: 0x3a7be0, yellow: 0xf2c230 };

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
    this.backdrop = addBackdrop(this, this.level.sky);

    this.buildLevel();
    this.createPlayers();
    this.setupCollisions();
    this.setupCamera();
    this.createAtmosphere();
    this.createHud();
    this.showLevelIntro();

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
    this.triggers = [];           // Schalter, Hebel, Farbtasten, Sequenzen
    this.targetGroups = {};       // Zeichen → Ziel-Gruppe (Tor, Aufzug, …)
    this.lifts = [];
    this.drawbridges = [];
    this.conveyors = [];
    this.checkpoints = [];
    this.infoSigns = [];
    this.blockSpawns = [];        // schiebbare Kisten & Felsbrocken (werden nach der Karte erzeugt)
    this.goal = null;

    // Ziel-Konfigurationen vereinheitlichen: 'door' → { kind: 'door' }
    this.targetCfg = {};
    Object.entries(this.level.targets || {}).forEach(([ch, t]) => {
      this.targetCfg[ch] = typeof t === 'string' ? { kind: t } : Object.assign({}, t);
    });
    this.createSequences();

    const charAt = (c, r) => (map[r] && map[r][c]) || ' ';
    const cfgOf = ch => this.targetCfg[ch];
    const isTerrain = ch => ch === '#' || ch === 'R' || ch === 'o' || (cfgOf(ch) && cfgOf(ch).kind === 'conveyor');
    const isWater = ch => ch === '~' || (cfgOf(ch) && cfgOf(ch).kind === 'water');
    const terrain = [];           // alle festen Geländekacheln (Kanten-Culling & Licht)
    const hash = (c, r) => ((c * 73856093) ^ (r * 19349663)) >>> 0;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const ch = charAt(c, r);
        if (ch === ' ' || ch === '.') continue;

        const x = c * TILE, y = r * TILE;          // linke obere Ecke der Zelle
        const cx = x + TILE / 2, bottom = y + TILE;  // Mitte / Unterkante

        // --- Mechanik-Zeichen aus der Level-Konfiguration ---------------
        if (this.level.triggers && this.level.triggers[ch]) {
          this.addTrigger(ch, this.level.triggers[ch], cx, bottom);
          continue;
        }
        if (this.boardChars[ch]) {
          this.addSequenceBoard(this.sequences[this.boardChars[ch]], cx, bottom);
          continue;
        }
        if (cfgOf(ch)) {
          const tile = this.addTargetCell(ch, cfgOf(ch), c, r, !isWater(charAt(c, r - 1)));
          if (tile && cfgOf(ch).kind === 'conveyor') terrain.push({ c, r, tile, plain: true });
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
    Object.values(this.targetGroups).forEach(group => {
      if (group.kind === 'lift') this.createLift(group);
      else if (group.kind === 'drawbridge') this.createDrawbridge(group);
      else if (group.kind === 'conveyor') this.createConveyor(group);
      group.bounds = this.cellBounds(group.cells);
      this.applyTargetState(group, false, true);
    });

    this.createBlocks();

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

  /** Bodenschalter, Hebel oder Farbtaste anlegen. */
  addTrigger(ch, cfg, cx, bottom) {
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

    if (cfg.type === 'plate') {
      trigger.texUp = `plate_${trigger.owner || 'any'}_up`;
      trigger.texDown = `plate_${trigger.owner || 'any'}_down`;
      trigger.sprite = this.add.image(cx, bottom, trigger.texUp).setOrigin(0.5, 1).setDepth(DEPTH.OBJECT);
      if (trigger.owner && !HD_ASSETS.tileset) {
        // Initiale über dem Schalter: wer darf drauf? (J = Jessica, S = Simon)
        // – im HD-Tileset steht der Buchstabe schon auf dem Schalter
        this.add.text(cx, bottom - 14, PLAYER_DEFS[trigger.owner - 1].name[0].toUpperCase(), {
          fontFamily: FONT, fontSize: '10px', color: PLAYER_DEFS[trigger.owner - 1].colorCss, stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5, 1).setDepth(DEPTH.OBJECT);
      }
    } else if (cfg.type === 'lever' || cfg.type === 'button') {
      if (cfg.type === 'lever') {
        trigger.sprite = this.add.image(cx, bottom, 'lever_off').setOrigin(0.5, 1).setDepth(DEPTH.OBJECT);
      } else {
        trigger.color = cfg.color;
        trigger.lit = false;
        trigger.sprite = this.add.image(cx, bottom, `btn_${cfg.color}_off`).setOrigin(0.5, 1).setDepth(DEPTH.OBJECT);
        const seq = this.sequences[cfg.group];
        if (seq) { trigger.sequence = seq; seq.buttons.push(trigger); }
      }
      // "↑"-Hinweis, der erscheint, wenn jemand davor steht
      trigger.prompt = this.add.text(cx, bottom - 52, '↑', {
        fontFamily: FONT, fontSize: '14px', color: '#ffffff', stroke: '#000000', strokeThickness: 4
      }).setOrigin(0.5).setDepth(DEPTH.FX).setVisible(false);
      this.tweens.add({ targets: trigger.prompt, y: trigger.prompt.y - 6, duration: 400, yoyo: true, repeat: -1 });
    }
    this.triggers.push(trigger);
  }

  /** Eine Zelle eines Ziels (Tor, Brücke, Wasser, Aufzug, …) registrieren. */
  addTargetCell(ch, cfg, c, r, surface) {
    if (!this.targetGroups[ch]) {
      this.targetGroups[ch] = { char: ch, kind: cfg.kind, cfg, cells: [], tiles: [], active: false, timers: [] };
    }
    const group = this.targetGroups[ch];
    group.cells.push({ c, r });
    const cx = c * TILE + TILE / 2, cy = r * TILE + TILE / 2;

    let tile = null;
    if (cfg.kind === 'water') {
      tile = this.createWaterTile(cx, cy, surface, c);       // Gefahr wie '~', aber abschaltbar
    } else if (cfg.kind === 'door' || cfg.kind === 'bridge') {
      tile = this.gates.create(cx, cy, cfg.kind === 'door' ? 'door' : 'crate')
        .setDepth(cfg.kind === 'door' ? DEPTH.DOOR : DEPTH.TERRAIN);
      if (cfg.color && SEQ_COLORS[cfg.color]) tile.setTint(SEQ_COLORS[cfg.color]);
    } else if (cfg.kind === 'conveyor') {
      tile = this.solids.create(cx, cy, 'conveyorBase').setDepth(DEPTH.TERRAIN);
    }
    if (tile) {
      tile.baseY = cy;
      group.tiles.push(tile);
    }
    return tile;
  }

  cellBounds(cells) {
    const cs = cells.map(c => c.c), rs = cells.map(c => c.r);
    const left = Math.min(...cs) * TILE, top = Math.min(...rs) * TILE;
    return new Phaser.Geom.Rectangle(left, top, (Math.max(...cs) + 1) * TILE - left, (Math.max(...rs) + 1) * TILE - top);
  }

  /** Schiebbare Kisten & Felsbrocken als dynamische Physik-Körper anlegen. */
  createBlocks() {
    this.blocks = this.blockSpawns.map(spawn => {
      const block = this.physics.add.sprite(spawn.x, spawn.y, spawn.texture).setDepth(DEPTH.OBJECT);
      // pushable = false: Spieler können den Block NICHT einfach wegdrücken –
      // ob er sich bewegt, entscheidet updateBlocks() (genug Schieber?)
      block.body.pushable = false;
      block.body.setMaxVelocityY(PHYSICS.MAX_FALL);
      block.setCollideWorldBounds(true);
      block.spawn = spawn;
      block.weight = spawn.weight;
      block.wasOnGround = true;
      block.pushSoundAt = 0;
      block.stuckFrames = 0;
      // "Zu schwer!"-Hinweis über dem Block
      block.label = this.add.text(spawn.x, spawn.y, '', {
        fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#000000', strokeThickness: 3, align: 'center'
      }).setOrigin(0.5, 1).setDepth(DEPTH.FX);
      return block;
    });
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
  // MECHANIKEN BAUEN: Sequenzen, Aufzüge, Zugbrücken, Förderbänder
  // =====================================================================

  /** Farbtasten-Sequenzen anlegen (wirken wie ein Auslöser mit Zielen). */
  createSequences() {
    this.sequences = {};
    this.boardChars = {};
    Object.entries(this.level.sequences || {}).forEach(([id, cfg]) => {
      const seq = {
        id, type: 'sequence', order: cfg.order, targets: cfg.targets || [],
        progress: 0, active: false, buttons: [], lamps: []
      };
      this.sequences[id] = seq;
      this.triggers.push(seq);
      if (cfg.board) this.boardChars[cfg.board] = id;
    });
  }

  /** Tafel mit der gesuchten Reihenfolge (Lämpchen leuchten bei Fortschritt). */
  addSequenceBoard(seq, cx, bottom) {
    this.add.image(cx, bottom, 'seqBoard').setOrigin(0.5, 1).setDepth(DEPTH.DECO + 0.5);
    const n = seq.order.length;
    seq.order.forEach((color, i) => {
      const x = cx + (i - (n - 1) / 2) * 22, y = bottom - 37;
      this.add.text(x, y - 13, String(i + 1), { fontFamily: FONT, fontSize: '6px', color: '#aab4cc' })
        .setOrigin(0.5).setDepth(DEPTH.DECO + 0.6);
      seq.lamps.push(this.add.circle(x, y, 7, SEQ_COLORS[color]).setDepth(DEPTH.DECO + 0.6).setAlpha(0.35));
    });
  }

  /** Aufzug: eine fahrende Plattform aus allen Zellen der Gruppe. */
  createLift(group) {
    const cs = group.cells.map(c => c.c);
    const r = group.cells[0].r;
    const x0 = Math.min(...cs) * TILE, y0 = r * TILE, w = (Math.max(...cs) + 1) * TILE - x0;
    const dx = (group.cfg.dx || 0) * TILE, dy = (group.cfg.dy || 0) * TILE;

    // Gestrichelte Fahrspur, damit man sieht, wohin der Aufzug fährt
    const path = this.add.graphics().setDepth(DEPTH.DECO + 0.4);
    const from = { x: x0 + w / 2, y: y0 + 8 }, to = { x: from.x + dx, y: from.y + dy };
    const len = Math.hypot(dx, dy);
    for (let d = 0; d < len; d += 10) {
      const t = d / len;
      path.fillStyle(0xffffff, 0.35).fillCircle(from.x + dx * t, from.y + dy * t, 1.5);
    }
    path.lineStyle(2, 0xffffff, 0.45).strokeCircle(to.x, to.y, 5).strokeCircle(from.x, from.y, 5);

    const sprite = this.add.tileSprite(x0, y0, w, 16, 'liftTile').setOrigin(0).setDepth(DEPTH.MECH);
    this.physics.add.existing(sprite);
    sprite.body.setAllowGravity(false);
    sprite.body.setImmovable(true);
    sprite.body.pushable = false;

    group.lift = {
      group, sprite, path,
      home: { x: x0, y: y0 }, away: { x: x0 + dx, y: y0 + dy },
      speed: group.cfg.speed || 90, mode: group.cfg.mode || 'hold',
      leg: 'away', wait: 0, moving: false
    };
    this.lifts.push(group.lift);
  }

  /** Zugbrücke: Planke, die um einen Pfosten hochklappt. */
  createDrawbridge(group) {
    const cs = group.cells.map(c => c.c);
    const r = group.cells[0].r;
    const minC = Math.min(...cs), maxC = Math.max(...cs);
    const pivotLeft = (group.cfg.pivot || 'left') === 'left';
    const px = pivotLeft ? minC * TILE : (maxC + 1) * TILE;
    const py = r * TILE + 6;
    const length = (maxC - minC + 1) * TILE;

    const post = this.add.image(px + (pivotLeft ? -6 : 6), r * TILE, 'bridgePost').setOrigin(0.5, 1).setDepth(DEPTH.MECH - 0.1);
    const plank = this.add.tileSprite(px, py, length, 12, 'bridgePlank').setOrigin(pivotLeft ? 0 : 1, 0.5).setDepth(DEPTH.MECH);
    const chain = this.add.graphics().setDepth(DEPTH.MECH + 0.1);
    const hits = group.cells.map(({ c }) => {
      const hit = this.gates.create(c * TILE + TILE / 2, py, 'bridgeHit').setVisible(false);
      hit.body.enable = false;
      return hit;
    });

    group.bridge = {
      group, plank, post, chain, hits, length, pivotLeft,
      pivot: { x: px, y: py },
      postTop: { x: post.x, y: r * TILE - 42 },
      raised: pivotLeft ? -90 : 90
    };
    this.drawbridges.push(group.bridge);
  }

  /** Förderband: Gurt als scrollende Textur über den Maschinen-Kacheln. */
  createConveyor(group) {
    const cs = group.cells.map(c => c.c);
    const r = group.cells[0].r;
    const x0 = Math.min(...cs) * TILE, x1 = (Math.max(...cs) + 1) * TILE;
    const belt = this.add.tileSprite(x0, r * TILE, x1 - x0, 10, 'conveyorBelt').setOrigin(0).setDepth(DEPTH.TERRAIN + 0.3);
    group.conveyor = { group, belt, x0, x1, top: r * TILE, speed: 0 };
    this.conveyors.push(group.conveyor);
  }

  // =====================================================================
  // SPIELER
  // =====================================================================
  createPlayers() {
    this.players = PLAYER_DEFS.map((def, i) => {
      const spawn = this.spawns[def.id] || { x: 64 + i * 48, y: this.worldHeight - 3 * TILE };
      // Unsichtbarer Physik-Körper …
      const sprite = this.physics.add.sprite(spawn.x, spawn.y, def.texture, 0).setVisible(false);
      sprite.body.setSize(14, 28).setOffset(5, 4);
      sprite.body.setMaxVelocityY(PHYSICS.MAX_FALL);
      sprite.setCollideWorldBounds(true);
      // … und die sichtbare Figur (Ursprung an den Füssen für Stauchen/Strecken)
      const view = this.add.sprite(spawn.x, spawn.y + 16, def.texture, 0).setOrigin(0.5, 1).setDepth(DEPTH.PLAYER);
      const shadow = this.add.image(spawn.x, spawn.y + 17, 'shadow').setDepth(DEPTH.SHADOW).setAlpha(0.35);

      return {
        def,
        input: this.inputs[i],
        sprite, view, shadow,
        coyote: 0,           // verbleibende "Coyote Time" in ms
        jumpBuffer: 0,       // gemerkter Sprungwunsch in ms
        checkpoint: { x: spawn.x, y: spawn.y },
        atGoal: false,
        respawning: false,
        sx: 1, sy: 1,        // Stauchen/Strecken der sichtbaren Figur
        onGround: true, wasOnGround: true, prevVy: 0, nextDust: 0, stuckFrames: 0
      };
    });
  }

  setupCollisions() {
    const sprites = this.players.map(p => p.sprite);
    const liftSprites = this.lifts.map(l => l.sprite);
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
      this.respawn(player, 'water');
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

  /** Stimmung: schwebende Staubkörnchen, Glitzern am Edelweiss, Vignette. */
  createAtmosphere() {
    this.add.particles(0, 0, 'mote', {
      x: { min: 0, max: GAME_WIDTH }, y: { min: 0, max: GAME_HEIGHT },
      lifespan: 7000, speedX: { min: -6, max: 6 }, speedY: { min: -10, max: -2 },
      scale: { min: 0.3, max: 0.8 }, alpha: { start: 0.55, end: 0 },
      frequency: 280, quantity: 1, blendMode: 'ADD'
    }).setScrollFactor(0).setDepth(DEPTH.FX - 1);

    this.time.addEvent({
      delay: 700, loop: true,
      callback: () => {
        const flowers = this.flowers.getChildren().filter(f => f.active && f.body.enable);
        if (!flowers.length) return;
        const f = Phaser.Utils.Array.GetRandom(flowers);
        const s = this.add.image(f.x + Phaser.Math.Between(-8, 8), f.y + Phaser.Math.Between(-8, 4), 'softDot')
          .setDepth(DEPTH.FX).setScale(0.5).setBlendMode('ADD');
        this.tweens.add({ targets: s, y: s.y - 10, alpha: 0, scale: 0.1, duration: 700, onComplete: () => s.destroy() });
      }
    });

    addVignette(this, DEPTH.VIGNETTE);
  }

  // =====================================================================
  // HUD
  // =====================================================================
  createHud() {
    const style = (size, color = '#ffffff') => ({
      fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#000000', strokeThickness: 4
    });
    const hud = obj => obj.setScrollFactor(0).setDepth(DEPTH.HUD);

    // halbtransparente Panels hinter den Texten
    const panels = hud(this.add.graphics());
    panels.fillStyle(0x0b1020, 0.38).fillRoundedRect(8, 8, 470, 70, 10);
    panels.fillStyle(0x0b1020, 0.38).fillRoundedRect(GAME_WIDTH - 178, 32, 170, 30, 10);

    hud(this.add.text(18, 16, `LEVEL ${this.levelIndex + 1}  ${this.level.name}`, style(12)));
    hud(this.add.text(GAME_WIDTH - 16, 12, 'ESC Menü  R Neustart  M Ton', style(8, '#dddddd')).setOrigin(1, 0));

    // Edelweiss-Zähler
    hud(this.add.image(GAME_WIDTH - 150, 47, 'edelweiss').setScale(1.4));
    this.flowerText = hud(this.add.text(GAME_WIDTH - 132, 39, '', style(12)));
    this.updateFlowerText();

    // Status pro Spieler (Controller verbunden? Am Ziel?)
    this.playerHud = this.players.map((p, i) =>
      hud(this.add.text(18, 38 + i * 18, '', style(10, p.def.colorCss))));

    // Hinweisbox unten (Infotafeln – nur in Level 1)
    this.hintBox = hud(this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 44, GAME_WIDTH - 80, 56, 0x10131c, 0.85)
      .setStrokeStyle(2, 0xf7d117)).setVisible(false);
    this.hintText = hud(this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 44, '', {
      fontFamily: FONT, fontSize: '10px', color: '#ffffff', align: 'center',
      wordWrap: { width: GAME_WIDTH - 120 }, lineSpacing: 6
    }).setOrigin(0.5)).setVisible(false);

    // Kurze Meldungen in der Bildschirmmitte ("Tor offen!" usw.)
    this.toastText = hud(this.add.text(GAME_WIDTH / 2, 112, '', style(14, '#f7d117')).setOrigin(0.5).setAlpha(0));
  }

  updateFlowerText() {
    this.flowerText.setText(`${this.collected}/${this.totalEdelweiss}`);
  }

  updateHud() {
    this.players.forEach((p, i) => {
      const pad = p.input.hasPad ? ' [PAD]' : '';
      const status = p.atGoal ? '  ✔ AM ZIEL' : '';
      this.playerHud[i].setText(`${p.def.name.toUpperCase()}${pad}${status}`);
    });
  }

  toast(message, color = '#f7d117') {
    this.toastText.setText(message).setColor(color).setAlpha(1).setScale(0.6);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, scale: 1, duration: 220, ease: 'Back.out' });
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 1800, duration: 400 });
  }

  /** Levelname, Passwort und eine Erinnerung an die Kindheits-Wanderung. */
  showLevelIntro() {
    const banner = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40).setScrollFactor(0).setDepth(DEPTH.HUD + 1);
    const anecdote = this.level.anecdote ? fillNames(this.level.anecdote) : '';
    const h = anecdote ? 176 : 130;
    const bg = this.add.graphics();
    bg.fillStyle(0x0b1020, 0.82).fillRoundedRect(-320, -h / 2, 640, h, 16);
    bg.lineStyle(2, 0xf7d117, 0.9).strokeRoundedRect(-320, -h / 2, 640, h, 16);
    banner.add(bg);
    const top = -h / 2;
    banner.add(this.add.text(0, top + 32, `LEVEL ${this.levelIndex + 1}`, {
      fontFamily: FONT, fontSize: '22px', color: '#f7d117'
    }).setOrigin(0.5));
    banner.add(this.add.text(0, top + 68, this.level.name, { fontFamily: FONT, fontSize: '14px', color: '#ffffff' }).setOrigin(0.5));
    banner.add(this.add.text(0, top + 96, `Passwort: ${this.level.password}`, {
      fontFamily: FONT, fontSize: '9px', color: '#aab4cc'
    }).setOrigin(0.5));
    if (anecdote) {
      banner.add(this.add.text(0, top + 136, `„${anecdote}“`, {
        fontFamily: FONT, fontSize: '9px', color: '#ffe9a8', align: 'center', wordWrap: { width: 560 }, lineSpacing: 6
      }).setOrigin(0.5));
    }
    banner.setAlpha(0).setScale(0.92);
    this.tweens.add({ targets: banner, alpha: 1, scale: 1, duration: 350, ease: 'Back.out' });
    this.tweens.add({ targets: banner, alpha: 0, delay: anecdote ? 4200 : 2600, duration: 500, onComplete: () => banner.destroy() });
    Sfx.play(this, 'levelStart');
  }

  // =====================================================================
  // UPDATE-SCHLEIFE
  // =====================================================================
  update(time, delta) {
    this.inputs.forEach(i => i.update());

    if (!this.completed) {
      this.players.forEach(p => this.updatePlayer(p, time, delta));
      this.limitPlayerSpread();
      this.updateBlocks(time);
      this.updateConveyors(delta);
      this.updateTriggers();
      this.updateTargets();
      this.updateLifts(delta);
      this.resolveStuck();
      this.updateCheckpoints();
      this.updateGoal();
    }

    this.players.forEach(p => {
      if (p.sprite.y > this.worldHeight + 48) this.respawn(p); // aus der Welt gefallen
    });

    this.updateDrawbridgeChains();
    this.updateViews(time, delta);
    this.updateInfoSigns();
    this.updateHud();
    this.updateCameraTarget();
    this.backdrop.update(this.cameras.main, this.worldHeight, delta);
  }

  /** Bewegung, Sprung & Animation eines Spielers. */
  updatePlayer(p, time, delta) {
    const { sprite, input, view } = p;
    const body = sprite.body;
    if (p.respawning) return;

    const onGround = body.blocked.down || body.touching.down;
    p.onGround = onGround;

    // Coyote Time & Jump Buffer → Sprünge fühlen sich fair an
    p.coyote = onGround ? PHYSICS.COYOTE_MS : p.coyote - delta;
    p.jumpBuffer = input.justPressed('jump') ? PHYSICS.JUMP_BUFFER_MS : p.jumpBuffer - delta;

    // Horizontal: sanft auf Zielgeschwindigkeit beschleunigen
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const accel = (onGround ? PHYSICS.ACCEL_GROUND : PHYSICS.ACCEL_AIR) * delta / 1000;
    const diff = dir * PHYSICS.RUN_SPEED - body.velocity.x;
    body.setVelocityX(body.velocity.x + Phaser.Math.Clamp(diff, -accel, accel));

    // Springen (mit Strecken der Figur)
    if (p.jumpBuffer > 0 && p.coyote > 0) {
      body.setVelocityY(-PHYSICS.JUMP_VELOCITY);
      p.jumpBuffer = 0;
      p.coyote = 0;
      p.sx = 0.8; p.sy = 1.22;
      this.puffDust(sprite.x, body.bottom, 4);
      Sfx.play(this, 'jump');
    }
    // Sprungtaste früh losgelassen → niedriger springen
    if (input.justReleased('jump') && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * PHYSICS.JUMP_CUT);
    }

    // Landung: kurz stauchen + Staub
    if (onGround && !p.wasOnGround && p.prevVy > 220) {
      p.sx = 1.25; p.sy = 0.8;
      this.puffDust(sprite.x, body.bottom, 6);
      Sfx.play(this, 'land');
    }
    // Laufstaub
    if (onGround && Math.abs(body.velocity.x) > 150 && time > p.nextDust) {
      this.puffDust(sprite.x - Math.sign(body.velocity.x) * 6, body.bottom, 2);
      p.nextDust = time + 170;
    }
    p.wasOnGround = onGround;
    p.prevVy = body.velocity.y;

    // Blickrichtung & Animation (auf der sichtbaren Figur)
    if (dir !== 0) view.setFlipX(dir < 0);
    if (!onGround) {
      view.anims.stop();
      view.setFrame(charFrame(p.def.texture, body.velocity.y < 0 ? 'jump' : 'fall'));
    } else if (Math.abs(body.velocity.x) > 20) {
      view.anims.play(`${p.def.texture}-walk`, true);
    } else {
      view.anims.stop();
      view.setFrame(charFrame(p.def.texture, 'idle'));
    }
  }

  /** Sichtbare Figuren, Schatten und Stauchen/Strecken nachführen. */
  updateViews(time, delta) {
    const relax = 1 - Math.pow(0.8, delta / 16.67);
    this.players.forEach(p => {
      const b = p.sprite.body;
      p.sx += (1 - p.sx) * relax;
      p.sy += (1 - p.sy) * relax;
      let sy = p.sy;
      if (p.onGround && Math.abs(b.velocity.x) < 20) sy *= 1 + Math.sin(time / 420) * 0.015;   // ruhiges Atmen
      p.view.setPosition(p.sprite.x, p.sprite.y + 16).setScale(p.sx, sy);
      p.shadow.setPosition(p.sprite.x, b.bottom + 1)
        .setAlpha(p.respawning ? 0 : (p.onGround ? 0.35 : 0.12))
        .setScale(p.onGround ? 1 : 0.7, 1);
    });
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
  // KOOP-MECHANIK: Auslöser
  // =====================================================================

  /** Darf dieser Spieler den Auslöser benutzen? */
  canUse(trigger, player) {
    return !trigger.owner || trigger.owner === player.def.id;
  }

  /** Steht ein Spieler direkt vor einem Hebel / einer Farbtaste? */
  isNear(t, p) {
    const b = p.sprite.body;
    return !p.respawning && Math.abs(b.center.x - t.x) < 26 && Math.abs(b.bottom - t.y) < 20;
  }

  updateTriggers() {
    this.triggers.forEach(t => {
      if (t.type === 'plate') {
        // Gedrückt, solange ein berechtigter Spieler – oder bei Schaltern
        // ohne Besitzer auch ein Block – darauf steht
        const onPlate = b => b.right > t.x - 13 && b.left < t.x + 13 && Math.abs(b.bottom - t.y) < 6;
        const pressed =
          this.players.some(p => this.canUse(t, p) && !p.respawning && onPlate(p.sprite.body)) ||
          (!t.owner && this.blocks.some(block => onPlate(block.body)));
        if (pressed !== t.active && !(t.latch && t.active)) {
          t.active = pressed;
          t.sprite.setTexture(pressed ? t.texDown : t.texUp);
          Sfx.play(this, pressed ? 'plateDown' : 'plateUp');
        }
      } else if (t.type === 'lever') {
        // Spieler davor + "Hoch" drücken → Hebel umlegen
        let someoneNear = false;
        this.players.forEach(p => {
          if (!this.isNear(t, p)) return;
          if (!this.canUse(t, p)) {
            if (p.input.justPressed('up')) this.toast(`Nur ${PLAYER_DEFS[t.owner - 1].name}!`, '#ff8080');
            return;
          }
          someoneNear = someoneNear || !t.active;
          if (p.input.justPressed('up')) {
            t.active = t.latch ? true : !t.active;
            t.sprite.setTexture(t.active ? 'lever_on' : 'lever_off');
            Sfx.play(this, 'lever');
            this.toast(t.active ? 'Hebel umgelegt!' : 'Hebel zurückgestellt');
            this.cameras.main.shake(120, 0.004);
          }
        });
        t.prompt.setVisible(someoneNear);
      } else if (t.type === 'button') {
        // Farbtaste: mit "Hoch" drücken – die Reihenfolge entscheidet
        const seq = t.sequence;
        let someoneNear = false;
        this.players.forEach(p => {
          if (!this.isNear(t, p) || !seq || seq.active) return;
          someoneNear = someoneNear || !t.lit;
          if (p.input.justPressed('up')) this.pressSequenceButton(seq, t);
        });
        t.prompt.setVisible(someoneNear);
      }
    });
  }

  pressSequenceButton(seq, btn) {
    if (btn.lit) return;
    if (btn.color === seq.order[seq.progress]) {
      btn.lit = true;
      btn.sprite.setTexture(`btn_${btn.color}_on`);
      const lamp = seq.lamps[seq.progress];
      if (lamp) {
        lamp.setAlpha(1);
        this.tweens.add({ targets: lamp, scale: { from: 1.6, to: 1 }, duration: 250, ease: 'Back.out' });
      }
      Sfx.play(this, `seq${Math.min(seq.progress, 2)}`);
      seq.progress++;
      if (seq.progress >= seq.order.length) {
        seq.active = true;
        Sfx.play(this, 'lever');
        this.toast('Richtige Reihenfolge!', '#7dff9a');
        this.cameras.main.shake(120, 0.004);
      }
    } else {
      seq.progress = 0;
      seq.buttons.forEach(b => { b.lit = false; b.sprite.setTexture(`btn_${b.color}_off`); });
      seq.lamps.forEach(l => l.setAlpha(0.35));
      Sfx.play(this, 'error');
      this.toast('Falsche Reihenfolge!', '#ff8080');
      this.cameras.main.shake(150, 0.006);
    }
  }

  /** Ziele anhand aller Auslöser ein- oder ausschalten. */
  updateTargets() {
    const signal = {};
    this.triggers.forEach(t => {
      if (t.active) t.targets.forEach(ch => { signal[ch] = true; });
    });
    Object.values(this.targetGroups).forEach(group => {
      const wanted = !!signal[group.char];
      if (wanted !== group.active) this.applyTargetState(group, wanted);
    });
  }

  /**
   * Schaltet eine Ziel-Gruppe.
   *   door:       active = offen (kein Kollisionskörper, gleitet nach oben weg)
   *   bridge:     active = Kisten da (fest), sonst nur als "Geist" sichtbar
   *   water:      active = abgelassen
   *   lift:       active = fährt zum Ziel (hold) bzw. pendelt (ferry)
   *   drawbridge: active = heruntergelassen
   *   conveyor:   Geschwindigkeit wechselt zwischen cfg.off und cfg.on
   */
  applyTargetState(group, active, instant = false) {
    group.active = active;

    if (group.kind === 'door') {
      const solid = !active;
      group.tiles.forEach(tile => {
        tile.body.enable = solid;
        const y = solid ? tile.baseY : tile.baseY - group.bounds.height;
        if (instant) tile.y = y;
        else this.tweens.add({ targets: tile, y, duration: solid ? 180 : 450, ease: 'Quad.inOut' });
      });
      if (solid && !instant) this.resolveStuck(true, 'side');
      if (!instant) {
        Sfx.play(this, 'door');
        this.toast(active ? 'Das Tor ist offen!' : 'Das Tor schliesst sich …', active ? '#7dff9a' : '#ffb070');
      }
    } else if (group.kind === 'bridge') {
      group.tiles.forEach((tile, i) => {
        tile.body.enable = active;
        tile.setAlpha(active ? 1 : 0.25);
        if (active && !instant) {
          tile.setScale(0.2);
          this.tweens.add({ targets: tile, scale: 1, duration: 200, delay: i * 30, ease: 'Back.out' });
        }
      });
      if (active && !instant) this.resolveStuck(true);       // niemand darf in einer neuen Kiste stecken
      if (!instant) {
        Sfx.play(this, active ? 'bridge' : 'door');
        if (active) this.toast('Die Kisten stehen bereit!', '#7dff9a');
      }
    } else if (group.kind === 'water') {
      this.applyWaterLevel(group, active, instant);
    } else if (group.kind === 'lift') {
      const lift = group.lift;
      lift.leg = 'away';
      lift.wait = 0;
      lift.path.setAlpha(active ? 1 : 0.6);
    } else if (group.kind === 'drawbridge') {
      this.applyDrawbridge(group.bridge, active, instant);
    } else if (group.kind === 'conveyor') {
      const cv = group.conveyor;
      cv.speed = active ? (group.cfg.on !== undefined ? group.cfg.on : 80) : (group.cfg.off || 0);
      if (!instant) {
        Sfx.play(this, 'conveyor');
        this.toast(cv.speed > 0 ? 'Das Band läuft nach rechts!' : cv.speed < 0 ? 'Das Band läuft nach links!' : 'Das Band steht.', '#7dd8ff');
      }
    }
  }

  /**
   * Wasserstand: active = abgelassen. Das Wasser fliesst Reihe für Reihe
   * von oben ab bzw. steigt von unten wieder an. Wer dann noch auf einem
   * Stein im Bach steht, wird nass (→ Checkpoint).
   */
  applyWaterLevel(group, drained, instant) {
    const ROW_DELAY = 260;
    const rows = [...new Set(group.tiles.map(t => t.baseY))].sort((a, b) => a - b); // oben → unten
    group.timers.forEach(timer => timer.remove());
    group.timers = [];

    rows.forEach((rowY, i) => {
      const order = drained ? i : rows.length - 1 - i;   // ablassen: oben zuerst, füllen: unten zuerst
      const apply = () => group.tiles.filter(t => t.baseY === rowY).forEach(tile => {
        tile.body.enable = !drained;
        if (instant) tile.setAlpha(drained ? 0 : 1);
        else this.tweens.add({ targets: tile, alpha: drained ? 0 : 1, duration: 200 });
      });
      if (instant) apply();
      else group.timers.push(this.time.delayedCall(order * ROW_DELAY, apply));
    });

    if (!instant) {
      Sfx.play(this, drained ? 'waterDown' : 'waterUp');
      this.toast(drained ? 'Der Wasserstand sinkt!' : 'Achtung, das Wasser steigt!', drained ? '#7dd8ff' : '#ffb070');
    }
  }

  /** Zugbrücke senken (fest erst nach dem Aufschlagen) oder hochklappen. */
  applyDrawbridge(br, lowered, instant) {
    this.tweens.killTweensOf(br.plank);
    if (instant) {
      br.plank.setAngle(lowered ? 0 : br.raised);
      br.hits.forEach(h => { h.body.enable = lowered; });
      return;
    }
    if (lowered) {
      Sfx.play(this, 'bridgeDown');
      this.tweens.add({
        targets: br.plank, angle: 0, duration: 900, ease: 'Bounce.out',
        onComplete: () => {
          br.hits.forEach(h => { h.body.enable = true; });
          this.resolveStuck(true);
          Sfx.play(this, 'bridgeThud');
          this.cameras.main.shake(120, 0.004);
        }
      });
      this.toast('Die Brücke senkt sich!', '#7dff9a');
    } else {
      br.hits.forEach(h => { h.body.enable = false; });
      Sfx.play(this, 'bridgeDown');
      this.tweens.add({ targets: br.plank, angle: br.raised, duration: 700, ease: 'Sine.inOut' });
      this.toast('Die Brücke klappt hoch!', '#ffb070');
    }
  }

  updateDrawbridgeChains() {
    this.drawbridges.forEach(br => {
      const a = Phaser.Math.DegToRad(br.plank.angle);
      const dir = br.pivotLeft ? 1 : -1;
      const tipX = br.pivot.x + Math.cos(a) * br.length * dir;
      const tipY = br.pivot.y + Math.sin(a) * br.length * dir;
      br.chain.clear().lineStyle(2, 0x3a3e46, 1).lineBetween(br.postTop.x, br.postTop.y, tipX, tipY);
    });
  }

  // =====================================================================
  // AUFZÜGE & FÖRDERBÄNDER
  // =====================================================================
  updateLifts(delta) {
    this.lifts.forEach(L => {
      const body = L.sprite.body;
      let target;
      if (L.mode === 'ferry' && L.group.active) {
        if (L.wait > 0) { L.wait -= delta; body.setVelocity(0, 0); return; }
        target = L.leg === 'away' ? L.away : L.home;
      } else {
        target = L.group.active ? L.away : L.home;
      }

      const dx = target.x - L.sprite.x, dy = target.y - L.sprite.y;
      const dist = Math.hypot(dx, dy);
      const step = L.speed * delta / 1000;
      if (dist <= Math.max(step, 0.5)) {
        if (dist > 0) body.reset(target.x, target.y);
        body.setVelocity(0, 0);
        if (L.moving) { L.moving = false; Sfx.play(this, 'liftStop'); }
        if (L.mode === 'ferry' && L.group.active) { L.leg = L.leg === 'away' ? 'home' : 'away'; L.wait = 700; }
        return;
      }
      const vx = dx / dist * L.speed, vy = dy / dist * L.speed;
      if (this.liftWouldCrush(L, vy)) { body.setVelocity(0, 0); return; }   // lieber anhalten als einklemmen
      if (!L.moving) { L.moving = true; Sfx.play(this, 'liftStart'); }
      body.setVelocity(vx, vy);
    });
  }

  /** Würde der Aufzug jemanden an die Decke drücken oder von oben einklemmen? */
  liftWouldCrush(L, vy) {
    const lb = L.sprite.body;
    const bodies = this.players.filter(p => !p.respawning).map(p => p.sprite.body).concat(this.blocks.map(b => b.body));
    const overlapX = b => b.right > lb.left + 2 && b.left < lb.right - 2;
    if (vy < 0) return bodies.some(b => overlapX(b) && Math.abs(b.bottom - lb.top) < 4 && b.blocked.up);
    if (vy > 0) return bodies.some(b => overlapX(b) && b.top >= lb.bottom - 4 && b.top <= lb.bottom + 6);
    return false;
  }

  updateConveyors(delta) {
    this.conveyors.forEach(cv => {
      cv.belt.tilePositionX -= cv.speed * delta / 1000;
      if (!cv.speed) return;
      const onBelt = b => b.right > cv.x0 + 2 && b.left < cv.x1 - 2 && Math.abs(b.bottom - cv.top) < 3;
      this.players.forEach(p => {
        const b = p.sprite.body;
        if (!p.respawning && onBelt(b) && (b.blocked.down || b.touching.down)) p.sprite.x += cv.speed * delta / 1000;
      });
      this.blocks.forEach(block => {
        if (onBelt(block.body)) block.body.velocity.x += cv.speed;   // nach updateBlocks() aufaddiert
      });
    });
  }

  // =====================================================================
  // SCHIEBBARE BLÖCKE
  // =====================================================================

  /**
   * Ein Block bewegt sich nur, wenn genug Spieler in dieselbe Richtung
   * schieben. Mehrere Spieler zählen, wenn sie direkt am Block oder
   * dicht hintereinander stehen.
   */
  updateBlocks(time) {
    this.blocks.forEach(block => {
      const bb = block.body;
      const onGround = bb.blocked.down || bb.touching.down;
      let dir = 0, bestCount = 0;

      [-1, 1].forEach(d => {
        const count = this.countPushers(block, d);
        bestCount = Math.max(bestCount, count);
        if (onGround && count >= block.weight) dir = d;
      });

      bb.setVelocityX(dir * BLOCKS.PUSH_SPEED);

      // Schab-Geräusch beim Schieben, "Zu schwer!"-Hinweis wenn zu wenig Schieber
      if (dir !== 0 && time > block.pushSoundAt) {
        Sfx.play(this, 'push');
        block.pushSoundAt = time + 160;
        this.puffDust(block.x - dir * block.displayWidth / 2, bb.bottom, 1);
      }
      const tooHeavy = dir === 0 && bestCount > 0 && bestCount < block.weight;
      block.label.setText(tooHeavy ? 'ZU SCHWER!\nZU ZWEIT!' : '')
        .setPosition(block.x, bb.top - 6);
      if (tooHeavy && !block.wasTooHeavy) Sfx.play(this, 'tooHeavy');
      block.wasTooHeavy = tooHeavy;

      // Aufprall-Rumms nach einem Sturz (z. B. Kiste über die Kante geschubst)
      if (onGround && !block.wasOnGround && block.fallSpeed > 200) {
        Sfx.play(this, 'blockLand');
        this.cameras.main.shake(100, 0.004 * block.weight);
        this.puffDust(block.x, bb.bottom, 8);
      }
      block.wasOnGround = onGround;
      block.fallSpeed = bb.velocity.y;

      // Aus der Welt gefallen → zurück an den Startplatz (und dort freischieben)
      if (block.y > this.worldHeight + 64) {
        bb.reset(block.spawn.x, block.spawn.y);
        this.unstick(bb);
        this.toast('Der Block ist wieder da!', '#ffffff');
      }
    });
  }

  /**
   * Wie viele Spieler schieben den Block in Richtung d? Da die Spieler
   * durcheinander durchlaufen, zählt jeder, der direkt am Block steht
   * oder höchstens eine Körperbreite dahinter.
   */
  countPushers(block, d) {
    const bb = block.body;
    const edge = d > 0 ? bb.left : bb.right;
    return this.players.filter(p => {
      const b = p.sprite.body;
      const pressing = d > 0 ? p.input.right : p.input.left;
      if (!pressing || p.respawning || !(b.blocked.down || b.touching.down)) return false;
      const face = d > 0 ? b.right : b.left;
      const gap = (edge - face) * d;                    // 0 = direkt dran
      const sameHeight = b.bottom > bb.top + 4 && b.top < bb.bottom;
      return sameHeight && gap > -4 && gap <= 18;
    }).length;
  }

  // =====================================================================
  // FESTSTECKEN AUFLÖSEN ("Unstuck")
  // =====================================================================

  /** Gehört dieses Objekt zur festen Geometrie (Gelände, Tore, Kisten, Aufzüge, Blöcke)? */
  isBlocking(go) {
    if (!go || !go.body || !go.body.enable) return false;
    return this.solids.contains(go) || this.gates.contains(go) ||
      (this.liftSprites && this.liftSprites.has(go)) || (this.blocks && this.blocks.includes(go));
  }

  /** Feste Körper, die diesen Körper (leicht verkleinert) überlappen. */
  embedding(body, inset = 3, ox = 0, oy = 0) {
    const hits = this.physics.overlapRect(body.x + inset + ox, body.y + inset + oy,
      body.width - inset * 2, body.height - inset * 2, true, true);
    return hits.filter(h => h !== body && this.isBlocking(h.gameObject));
  }

  /** Nächste freie Position suchen: zuerst nach oben (oder seitlich), dann diagonal. */
  freeOffset(body, prefer = 'up') {
    for (let d = 4; d <= 6 * TILE; d += 4) {
      const up = [[0, -d]], side = [[-d, 0], [d, 0]], diag = [[-d, -d], [d, -d]];
      const order = prefer === 'side' ? side.concat(up, diag) : up.concat(side, diag);
      for (const [ox, oy] of order) {
        const x = body.x + ox, y = body.y + oy;
        if (x < 0 || x + body.width > this.worldWidth || y < 0) continue;
        if (this.embedding(body, 1, ox, oy).length === 0) return { x: ox, y: oy };
      }
    }
    return null;
  }

  /** Körper sanft an die nächste freie Stelle setzen. */
  unstick(body, prefer = 'up') {
    const off = this.freeOffset(body, prefer);
    if (!off) return false;
    const go = body.gameObject;
    body.reset(go.x + off.x, go.y + off.y);
    body.setVelocity(0, 0);
    const player = this.players && this.players.find(p => p.sprite === go);
    if (player) { player.sx = 1.25; player.sy = 0.8; }
    this.puffDust(go.x, body.bottom, 5);
    Sfx.play(this, 'pop');
    return true;
  }

  /**
   * Prüft Spieler & Blöcke. Normal erst nach 2 Frames im Fels (gegen
   * Fehlalarme), mit now=true sofort – z. B. wenn gerade Kisten erschienen.
   */
  resolveStuck(now = false, prefer = 'up') {
    const check = (body, holder) => {
      if (!body.enable) return;
      if (this.embedding(body).length) {
        holder.stuckFrames = (holder.stuckFrames || 0) + 1;
        if (now || holder.stuckFrames >= 2) { this.unstick(body, prefer); holder.stuckFrames = 0; }
      } else {
        holder.stuckFrames = 0;
      }
    };
    this.players.forEach(p => { if (!p.respawning) check(p.sprite.body, p); });
    (this.blocks || []).forEach(block => check(block.body, block));
  }

  // =====================================================================
  // CHECKPOINTS, SAMMELOBJEKTE, RESPAWN
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
    this.tweens.add({
      targets: flower, y: flower.y - 30, alpha: 0, scale: 2, duration: 350, ease: 'Quad.out',
      onComplete: () => flower.destroy()
    });
    for (let i = 0; i < 8; i++) {
      const s = this.add.image(flower.x, flower.y, 'softDot').setDepth(DEPTH.FX).setScale(0.6).setBlendMode('ADD');
      const a = (i / 8) * Math.PI * 2;
      this.tweens.add({ targets: s, x: s.x + Math.cos(a) * 22, y: s.y + Math.sin(a) * 22, alpha: 0, scale: 0.1, duration: 450, onComplete: () => s.destroy() });
    }
    this.collected++;
    this.updateFlowerText();
    Sfx.play(this, 'collect');
  }

  respawn(player, reason = 'fall') {
    if (!player || player.respawning || this.completed) return;
    player.respawning = true;
    const s = player.sprite;
    s.body.setVelocity(0, 0);
    s.body.enable = false;
    if (reason === 'water') {
      Sfx.play(this, 'splash');
      this.splash(s.x, s.y);
    } else {
      Sfx.play(this, 'respawn');
    }
    this.cameras.main.shake(150, 0.006);

    this.tweens.add({
      targets: player.view, alpha: 0, duration: 250,
      onComplete: () => {
        s.setPosition(player.checkpoint.x, player.checkpoint.y);
        s.body.enable = true;
        s.body.reset(player.checkpoint.x, player.checkpoint.y);
        player.respawning = false;
        player.sx = 0.7; player.sy = 1.3;
        // kurz blinken
        this.tweens.add({ targets: player.view, alpha: { from: 0.2, to: 1 }, duration: 120, repeat: 4, yoyo: true,
          onComplete: () => player.view.setAlpha(1) });
      }
    });
  }

  // =====================================================================
  // INFOTAFELN & ZIEL
  // =====================================================================
  updateInfoSigns() {
    let shown = null;
    this.infoSigns.forEach(sign => {
      if (!sign.text) return;
      const near = this.players.some(p => Math.abs(p.sprite.x - sign.x) < 48 && Math.abs(p.sprite.y - sign.y) < 64);
      if (near) shown = sign;
    });
    this.hintBox.setVisible(!!shown);
    this.hintText.setVisible(!!shown);
    if (shown && this.hintText.text !== shown.text) {
      this.hintText.setText(shown.text);
      // Box an die Textlänge anpassen; Unterkante bleibt am Bildschirmrand
      const h = this.hintText.height + 28;
      const cy = GAME_HEIGHT - 16 - h / 2;
      this.hintBox.setSize(GAME_WIDTH - 80, h).setPosition(GAME_WIDTH / 2, cy);
      this.hintText.setY(cy);
    }
  }

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
    this.players.forEach(p => {
      p.sprite.body.setVelocityX(0);
      p.view.anims.stop();
      p.view.setFrame(charFrame(p.def.texture, 'jump'));
      p.sx = 0.8; p.sy = 1.25;
      this.tweens.add({ targets: p.sprite, y: p.sprite.y - 20, duration: 220, yoyo: true, repeat: 2, ease: 'Quad.out' });
    });
    Sfx.play(this, 'win');
    this.toast('GESCHAFFT!', '#7dff9a');
    this.confetti();

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

  // =====================================================================
  // EFFEKTE
  // =====================================================================
  puffDust(x, y, count = 5) {
    for (let i = 0; i < count; i++) {
      const d = this.add.image(x, y - 2, 'softDot').setTint(0xf0e6d0).setDepth(DEPTH.FX)
        .setScale(Phaser.Math.FloatBetween(0.5, 0.9)).setAlpha(0.8);
      this.tweens.add({
        targets: d,
        x: x + Phaser.Math.Between(-16, 16),
        y: y - Phaser.Math.Between(4, 14),
        alpha: 0, scale: 0.2, duration: Phaser.Math.Between(280, 420), ease: 'Quad.out',
        onComplete: () => d.destroy()
      });
    }
  }

  /** Wasserspritzer, wenn jemand nass wird. */
  splash(x, y) {
    for (let i = 0; i < 16; i++) {
      const drop = this.add.image(x, y, 'softDot').setTint(i % 2 ? 0x8fd0ff : 0xffffff).setDepth(DEPTH.FX).setScale(0.6);
      this.tweens.add({
        targets: drop,
        x: x + Phaser.Math.Between(-34, 34),
        y: y - Phaser.Math.Between(20, 64),
        alpha: 0, duration: 450, ease: 'Quad.out',
        onComplete: () => drop.destroy()
      });
    }
  }

  confetti() {
    const colors = [0xd52b1e, 0xffffff, 0xf7d117, 0x3fd06a, 0x1b6ee8];
    const cam = this.cameras.main;
    for (let i = 0; i < 80; i++) {
      const c = this.add.image(
        cam.scrollX + Phaser.Math.Between(0, GAME_WIDTH), cam.scrollY - 10, 'confetti'
      ).setTint(Phaser.Utils.Array.GetRandom(colors)).setDepth(DEPTH.FX).setScale(Phaser.Math.FloatBetween(0.8, 1.4));
      this.tweens.add({
        targets: c,
        y: cam.scrollY + GAME_HEIGHT + 20,
        x: c.x + Phaser.Math.Between(-60, 60),
        angle: Phaser.Math.Between(-360, 360),
        duration: Phaser.Math.Between(1200, 2200),
        delay: Phaser.Math.Between(0, 600),
        onComplete: () => c.destroy()
      });
    }
  }
}
