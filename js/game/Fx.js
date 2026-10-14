/* =====================================================================
 * Fx.js – Rein visuelle Effekte der GameScene
 *
 *   const fx = new Fx(scene);
 *   fx.createAtmosphere(flowers)   Staubkörnchen, Glitzern am Edelweiss, Vignette
 *   fx.dust(x, y, count)           Staubwolke (Sprung, Landung, Schieben)
 *   fx.splash(x, y)                Wasserspritzer
 *   fx.collect(flower)             Edelweiss fliegt weg und funkelt
 *   fx.confetti()                  Konfetti über den ganzen Bildschirm
 * ===================================================================== */

class Fx {
  constructor(scene) {
    this.scene = scene;
  }

  /** Stimmung: schwebende Staubkörnchen, Glitzern am Edelweiss, Vignette. */
  createAtmosphere(flowers) {
    const scene = this.scene;
    scene.add.particles(0, 0, 'mote', {
      x: { min: 0, max: GAME_WIDTH }, y: { min: 0, max: GAME_HEIGHT },
      lifespan: 7000, speedX: { min: -6, max: 6 }, speedY: { min: -10, max: -2 },
      scale: { min: 0.3, max: 0.8 }, alpha: { start: 0.55, end: 0 },
      frequency: 280, quantity: 1, blendMode: 'ADD'
    }).setScrollFactor(0).setDepth(DEPTH.FX - 1);

    scene.time.addEvent({
      delay: 700, loop: true,
      callback: () => {
        const active = flowers.getChildren().filter(f => f.active && f.body.enable);
        if (!active.length) return;
        const f = Phaser.Utils.Array.GetRandom(active);
        const s = scene.add.image(f.x + Phaser.Math.Between(-8, 8), f.y + Phaser.Math.Between(-8, 4), 'softDot')
          .setDepth(DEPTH.FX).setScale(0.5).setBlendMode('ADD');
        scene.tweens.add({ targets: s, y: s.y - 10, alpha: 0, scale: 0.1, duration: 700, onComplete: () => s.destroy() });
      }
    });

    addVignette(scene, DEPTH.VIGNETTE);
  }

  dust(x, y, count = 5) {
    const scene = this.scene;
    for (let i = 0; i < count; i++) {
      const d = scene.add.image(x, y - 2, 'softDot').setTint(0xf0e6d0).setDepth(DEPTH.FX)
        .setScale(Phaser.Math.FloatBetween(0.5, 0.9)).setAlpha(0.8);
      scene.tweens.add({
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
    const scene = this.scene;
    for (let i = 0; i < 16; i++) {
      const drop = scene.add.image(x, y, 'softDot').setTint(i % 2 ? 0x8fd0ff : 0xffffff).setDepth(DEPTH.FX).setScale(0.6);
      scene.tweens.add({
        targets: drop,
        x: x + Phaser.Math.Between(-34, 34),
        y: y - Phaser.Math.Between(20, 64),
        alpha: 0, duration: 450, ease: 'Quad.out',
        onComplete: () => drop.destroy()
      });
    }
  }

  /** Edelweiss fliegt nach oben weg, Funken stieben im Kreis. */
  collect(flower) {
    const scene = this.scene;
    scene.tweens.add({
      targets: flower, y: flower.y - 30, alpha: 0, scale: 2, duration: 350, ease: 'Quad.out',
      onComplete: () => flower.destroy()
    });
    for (let i = 0; i < 8; i++) {
      const s = scene.add.image(flower.x, flower.y, 'softDot').setDepth(DEPTH.FX).setScale(0.6).setBlendMode('ADD');
      const a = (i / 8) * Math.PI * 2;
      scene.tweens.add({ targets: s, x: s.x + Math.cos(a) * 22, y: s.y + Math.sin(a) * 22, alpha: 0, scale: 0.1, duration: 450, onComplete: () => s.destroy() });
    }
  }

  confetti() {
    const scene = this.scene;
    const colors = [0xd52b1e, 0xffffff, 0xf7d117, 0x3fd06a, 0x1b6ee8];
    const cam = scene.cameras.main;
    for (let i = 0; i < 80; i++) {
      const c = scene.add.image(
        cam.scrollX + Phaser.Math.Between(0, GAME_WIDTH), cam.scrollY - 10, 'confetti'
      ).setTint(Phaser.Utils.Array.GetRandom(colors)).setDepth(DEPTH.FX).setScale(Phaser.Math.FloatBetween(0.8, 1.4));
      scene.tweens.add({
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
