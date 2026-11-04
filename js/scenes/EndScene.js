/* =====================================================================
 * EndScene – Victory-Bildschirm „Danke fürs Spielen!“ (nach dem Abspann)
 *
 * Hintergrund ist das Bild assets/images/endscreen.jpg (die
 * einzige Bilddatei im Spiel, eingebettet über js/generated/endscreen-image.js,
 * damit es auch per Doppelklick / offline lädt). Darüber per Code: fallendes
 * Konfetti, funkelnde Sterne und der Hinweis zum Weitermachen.
 *
 * Das Bild ist 4:3 (720×540) – links und rechts füllt eine abgedunkelte,
 * vergrösserte Kopie den 16:9-Bildschirm.
 *
 * SPRUNG / START / B oder ESC → Hauptmenü
 * ===================================================================== */

const ENDSCREEN = {
  width: 720,
  height: 540,
  title: { x: 118, y: 62, w: 488, h: 38 },   // Lage des Titels im Bild (für das Funkeln)
  confetti: [0xd52b1e, 0xffffff, 0xf7d117, 0x3fd06a, 0x1b6ee8, 0xff7ad9]
};

class EndScene extends Phaser.Scene {
  constructor() {
    super('EndScene');
  }

  create() {
    this.inputs = createPlayerInputs(this);
    this.ready = false;
    this.leaving = false;
    this.cameras.main.setBackgroundColor('#05060a');

    this.input.keyboard.on('keydown-ESC', () => this.leave());
    this.input.keyboard.on('keydown-M', () => Sfx.toggleMute());

    // Die eingebettete Textur wird beim Start asynchron dekodiert – fast
    // immer längst fertig, sonst kurz darauf warten
    if (this.textures.exists('endscreen')) this.build();
    else this.textures.once('addtexture-endscreen', () => this.build());
  }

  build() {
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
    const left = cx - ENDSCREEN.width / 2;

    // Seitenflächen: dasselbe Bild vergrössert und abgedunkelt
    this.add.image(cx, cy, 'endscreen').setDisplaySize(GAME_WIDTH, GAME_WIDTH * 3 / 4).setTint(0x3a4060).setAlpha(0.9);

    // Das eigentliche Bild – fährt sanft heran
    const picture = this.add.image(cx, cy, 'endscreen').setScale(1.06).setAlpha(0);
    this.tweens.add({ targets: picture, alpha: 1, scale: 1, duration: 1400, ease: 'Sine.out' });

    // Goldene Kanten links und rechts
    const frame = this.add.graphics();
    frame.fillStyle(0x17121f).fillRect(left - 5, 0, 5, GAME_HEIGHT).fillRect(left + ENDSCREEN.width, 0, 5, GAME_HEIGHT);

    this.createConfetti();
    this.time.delayedCall(900, () => this.createSparkles(left));

    Sfx.play(this, 'win');
    this.time.delayedCall(700, () => Sfx.play(this, 'collect'));

    // Hinweis zum Weitermachen (auf dunkler Plakette), erst nach einer kurzen Pause
    const plate = Comic.panel(this, cx, GAME_HEIGHT - 24, 240, 30).setDepth(29).setVisible(false);
    this.prompt = this.add.text(cx, GAME_HEIGHT - 24, TXT.endPrompt, {
      fontFamily: FONT, fontSize: '10px', color: '#ffffff', stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(30).setVisible(false);
    this.time.delayedCall(2500, () => {
      this.ready = true;
      plate.setVisible(true);
      this.prompt.setVisible(true);
      this.tweens.add({ targets: this.prompt, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
    });
  }

  /** Bunte Konfetti-Streifen rieseln über den ganzen Bildschirm. */
  createConfetti() {
    this.add.particles(0, -12, 'confetti', {
      x: { min: 0, max: GAME_WIDTH },
      lifespan: 7000,
      speedY: { min: 50, max: 120 },
      speedX: { min: -25, max: 25 },
      rotate: { start: 0, end: 540 },
      scale: { min: 0.7, max: 1.3 },
      tint: ENDSCREEN.confetti,
      frequency: 110,
      quantity: 1
    }).setDepth(20);

    // Zum Auftakt ein grosser Schwall
    const cam = this.cameras.main;
    for (let i = 0; i < 70; i++) {
      const c = this.add.image(Phaser.Math.Between(0, GAME_WIDTH), -10, 'confetti')
        .setTint(Phaser.Utils.Array.GetRandom(ENDSCREEN.confetti)).setDepth(21).setScale(Phaser.Math.FloatBetween(0.8, 1.5));
      this.tweens.add({
        targets: c, y: cam.height + 20, x: c.x + Phaser.Math.Between(-80, 80), angle: Phaser.Math.Between(-540, 540),
        duration: Phaser.Math.Between(1800, 3200), delay: Phaser.Math.Between(0, 900), onComplete: () => c.destroy()
      });
    }
  }

  /** Funkelnde Sterne rund um den Titel und auf den Seitenflächen. */
  createSparkles(left) {
    const t = ENDSCREEN.title;
    const spots = [];
    for (let i = 0; i < 10; i++) {
      spots.push({ x: left + t.x + Phaser.Math.Between(0, t.w), y: t.y + Phaser.Math.Between(-12, t.h + 12) });
    }
    for (let i = 0; i < 8; i++) {
      const side = i % 2 ? left + ENDSCREEN.width + Phaser.Math.Between(20, 100) : Phaser.Math.Between(20, left - 20);
      spots.push({ x: side, y: Phaser.Math.Between(40, GAME_HEIGHT - 60) });
    }
    spots.forEach((p, i) => {
      const star = this.add.image(p.x, p.y, 'spark').setDepth(25).setBlendMode('ADD').setScale(0).setTint(i % 3 ? 0xffffff : 0xfff2a0);
      this.tweens.add({
        targets: star, scale: { from: 0, to: Phaser.Math.FloatBetween(1.6, 2.6) }, alpha: { from: 1, to: 0.2 },
        angle: 90, duration: Phaser.Math.Between(500, 900), yoyo: true, repeat: -1,
        repeatDelay: Phaser.Math.Between(300, 1800), delay: i * 120
      });
    });
  }

  update() {
    this.inputs.forEach(i => i.update());
    if (this.ready && this.inputs.some(i => i.justPressed('jump') || i.justPressed('start') || i.justPressed('back'))) {
      this.leave();
    }
  }

  leave() {
    if (this.leaving || !this.ready) return;
    this.leaving = true;
    Sfx.play(this, 'select');
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MenuScene'));
  }
}
