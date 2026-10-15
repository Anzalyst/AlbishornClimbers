/* =====================================================================
 * GameScene – Das eigentliche Gameplay (nur noch Orchestrierung)
 *
 * Die Szene erzeugt die Module aus js/game/ und legt die Reihenfolge fest,
 * in der sie pro Frame laufen. Die Logik selbst steckt in den Modulen:
 *
 *   LevelParser   ASCII-Karte → Datenobjekt (prüft die Leveldaten)
 *   LevelBuilder  Datenobjekt → Gelände, Wasser, Deko, Collider
 *   Player        Spielfigur: Bewegung, Sprung, Animation, Respawn
 *   BlockSystem   schiebbare Kisten & Felsbrocken
 *   mechanics/    MechanicsSystem + Register TRIGGER_TYPES / TARGET_TYPES
 *   obstacles/    ObstacleSystem + Register OBSTACLE_TYPES (Pendel, Stämme …)
 *   Unstuck       Feststecken erkennen & freischieben
 *   CoopRules     Kamera, Abstand, Checkpoints, Ziel
 *   Hud / Fx      Anzeigen / visuelle Effekte
 *
 * Die Spieler kollidieren NICHT miteinander und können nicht
 * aufeinander stehen. Koop entsteht nur über Mechaniken.
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
    this.coop = new CoopRules(this);
    this.backdrop = addBackdrop(this, this.level.sky);

    this.builder = new LevelBuilder(this);
    this.builder.build(LevelParser.parse(this.level));
    this.createPlayers();
    this.builder.setupCollisions(this.players);
    this.coop.setupCamera();
    this.fx.createAtmosphere(this.flowers);
    this.hud = new Hud(this, this.levelIndex, this.level);
    this.hud.setFlowers(this.collected, this.totalEdelweiss);
    this.hud.showLevelIntro();

    // Globale Tasten: ESC / P = Pause, R = Level neu starten, M = Ton an/aus
    // (am Controller: START öffnet das Pausenmenü mit denselben Funktionen)
    this.input.keyboard.on('keydown-ESC', () => this.openPause());
    this.input.keyboard.on('keydown-P', () => this.openPause());
    this.input.keyboard.on('keydown-R', () => this.scene.restart({ levelIndex: this.levelIndex }));
    this.input.keyboard.on('keydown-M', () => this.toast(Sfx.toggleMute() ? TXT.soundOff : TXT.soundOn, '#ffffff'));
  }

  createPlayers() {
    this.players = PLAYER_DEFS.map((def, i) => {
      const spawn = this.spawns[def.id] || { x: 64 + i * 48, y: this.worldHeight - 3 * TILE };
      return new Player(this, def, this.inputs[i], spawn);
    });
  }

  // =====================================================================
  // UPDATE-SCHLEIFE – die Reihenfolge ist wichtig für die Physik:
  // Spieler → Abstand → Blöcke → Mechaniken (Förderband addiert auf die
  // Block-Geschwindigkeit, Aufzüge fahren nach dem Schalten) → Freischieben
  // =====================================================================
  update(time, delta) {
    this.inputs.forEach(i => i.update());
    if (this.inputs.some(i => i.justPressed('start'))) { this.openPause(); return; }

    if (!this.completed) {
      this.players.forEach(p => p.update(time, delta));
      this.coop.limitSpread();
      this.blockSystem.update(time);
      this.mechanics.update(delta);
      this.unstuck.resolve();
      this.coop.update();
    }

    this.players.forEach(p => {
      if (p.sprite.y > this.worldHeight + 48) p.respawn(); // aus der Welt gefallen
    });

    // Hindernisse bewegen sich immer (auch beim Jubeln am Ziel)
    this.obstacles.update(delta);
    this.mechanics.render();
    this.obstacles.render();
    this.players.forEach(p => p.updateView(time, delta));
    this.hud.updateInfoSigns(this.infoSigns, this.players);
    this.hud.update(this.players);
    this.coop.updateCamera();
    this.backdrop.update(this.cameras.main, this.worldHeight, delta);
  }

  // =====================================================================
  // EREIGNISSE (von den Modulen aufgerufen)
  // =====================================================================

  /** Pausenmenü öffnen (START am Controller, ESC / P auf der Tastatur). */
  openPause() {
    if (this.completed || this.scene.isPaused()) return;
    Sfx.play(this, 'select');
    this.scene.pause();
    this.scene.launch('PauseScene', { parent: this.scene.key, restart: { levelIndex: this.levelIndex }, labels: TXT.pause });
  }

  /** Von der PauseScene aufgerufen. */
  resumeFromPause() {
    this.scene.resume();
    this.inputs.forEach(i => i.resync());   // der "Weiter"-Knopf soll keinen Sprung auslösen
  }

  /** Kurze Meldung in der Bildmitte. */
  toast(message, color) {
    this.hud.toast(message, color);
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

  /** Beide Spieler sind am Ziel. */
  completeLevel() {
    this.completed = true;
    this.players.forEach(p => p.celebrate());
    Sfx.play(this, 'win');
    this.toast(TXT.levelDone, '#7dff9a');
    this.fx.confetti();

    // Edelweiss-Ergebnis merken (bestes Ergebnis pro Level) – fürs Finale
    const results = this.registry.get('edelweiss') || {};
    const prev = results[this.levelIndex];
    if (!prev || prev.collected < this.collected) {
      results[this.levelIndex] = { collected: this.collected, total: this.totalEdelweiss };
    }
    this.registry.set('edelweiss', results);

    // Nach dem letzten Level der Geschichte geht es direkt zur Geburtstagsfeier
    // (die Chopfnuss-Bonuslevel danach laufen über den Victory-Bildschirm)
    const isLast = this.levelIndex === STORY_LEVELS - 1;
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
