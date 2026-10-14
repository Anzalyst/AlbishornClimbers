/* =====================================================================
 * CoopRules.js – Regeln für das gemeinsame Spielen
 *
 *   const coop = new CoopRules(scene);
 *   coop.setupCamera()    Kamera folgt weich dem Mittelpunkt beider Spieler
 *   coop.updateCamera()   jeden Frame
 *   coop.limitSpread()    beide müssen gemeinsam im Bild bleiben
 *   coop.update()         Checkpoints (pro Spieler) und Ziel (BEIDE müssen hin)
 *
 * Erwartet auf der Szene: players, checkpoints, goal, worldWidth/Height
 * und completeLevel().
 * ===================================================================== */

class CoopRules {
  constructor(scene) {
    this.scene = scene;
  }

  setupCamera() {
    const scene = this.scene;
    const cam = scene.cameras.main;
    cam.setBounds(0, 0, scene.worldWidth, scene.worldHeight);
    cam.setRoundPixels(true);

    // Die Kamera folgt weich einem unsichtbaren Punkt zwischen beiden Spielern
    this.camTarget = scene.add.zone(0, 0, 1, 1);
    this.updateCamera();
    cam.startFollow(this.camTarget, true, 0.09, 0.09);
    cam.centerOn(this.camTarget.x, this.camTarget.y);
  }

  updateCamera() {
    const [a, b] = this.scene.players.map(p => p.sprite);
    this.camTarget.setPosition((a.x + b.x) / 2, (a.y + b.y) / 2 - 40);
  }

  /** Beide Spieler müssen gemeinsam im Bild bleiben. */
  limitSpread() {
    const [a, b] = this.scene.players.map(p => p.sprite.body);
    const dx = a.center.x - b.center.x;
    if (Math.abs(dx) < MAX_PLAYER_SPREAD) return;
    const [right, left] = dx > 0 ? [a, b] : [b, a];
    if (right.velocity.x > 0) right.setVelocityX(0);  // nicht weiter auseinander laufen
    if (left.velocity.x < 0) left.setVelocityX(0);
  }

  update() {
    this.updateCheckpoints();
    this.updateGoal();
  }

  /** Jeder Spieler hat seinen eigenen Checkpoint. */
  updateCheckpoints() {
    const scene = this.scene;
    scene.checkpoints.forEach(cp => {
      scene.players.forEach(p => {
        if (cp.reachedBy.has(p.def.id)) return;
        const s = p.sprite;
        if (Math.abs(s.x - cp.x) < 24 && Math.abs(s.y - cp.y) < 40) {
          cp.reachedBy.add(p.def.id);
          p.checkpoint = { x: cp.x, y: cp.y };
          if (cp.sprite.texture.key !== 'flag_on') {
            cp.sprite.setTexture('flag_on');
            scene.tweens.add({ targets: cp.sprite, scaleX: 0.85, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
          }
          Sfx.play(scene, 'checkpoint');
          scene.toast(tx(TXT.checkpoint, { name: p.def.name }), p.def.colorCss);
        }
      });
    });
  }

  updateGoal() {
    const scene = this.scene;
    if (!scene.goal) return;
    scene.players.forEach(p => {
      const wasAtGoal = p.atGoal;
      p.atGoal = Phaser.Geom.Rectangle.Contains(scene.goal.zone, p.sprite.x, p.sprite.y);
      if (p.atGoal && !wasAtGoal && !scene.players.every(q => q.atGoal)) {
        const other = scene.players.find(q => q !== p);
        scene.toast(tx(TXT.waitFor, { name: other.def.name }), p.def.colorCss);
      }
    });

    // Level geschafft erst, wenn BEIDE Spieler am Ziel sind
    if (scene.players.every(p => p.atGoal)) scene.completeLevel();
  }
}
