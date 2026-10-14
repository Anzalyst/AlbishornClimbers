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

    this.builder = new LevelBuilder(this);
    this.builder.build(LevelParser.parse(this.level));
    this.createPlayers();
    this.builder.setupCollisions(this.players);
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
  // SPIELER
  // =====================================================================
  createPlayers() {
    this.players = PLAYER_DEFS.map((def, i) => {
      const spawn = this.spawns[def.id] || { x: 64 + i * 48, y: this.worldHeight - 3 * TILE };
      return new Player(this, def, this.inputs[i], spawn);
    });
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
