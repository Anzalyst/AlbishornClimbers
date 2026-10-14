/* =====================================================================
 * VictoryScene – Level geschafft!
 * Zeigt gesammelte Edelweiss und das Passwort für das nächste Level.
 * (Nach dem letzten Level startet stattdessen die FinaleScene.)
 * ===================================================================== */

class VictoryScene extends Phaser.Scene {
  constructor() {
    super('VictoryScene');
  }

  init(data) {
    this.levelIndex = data.levelIndex || 0;
    this.collected = data.collected || 0;
    this.total = data.total || 0;
    this.leaving = false;
  }

  create() {
    this.inputs = createPlayerInputs(this);
    this.backdrop = addBackdrop(this, [0x2a3a6a, 0xf5a96b]);   // Abendstimmung
    this.cameras.main.fadeIn(400, 0, 0, 0);

    const cx = GAME_WIDTH / 2;
    const text = (y, str, size, color = '#ffffff') => this.add.text(cx, y, str, {
      fontFamily: FONT, fontSize: `${size}px`, color, align: 'center',
      stroke: '#000000', strokeThickness: 5, lineSpacing: 10
    }).setOrigin(0.5);

    text(80, 'LEVEL GESCHAFFT!', 28, '#f7d117');
    text(130, LEVELS[this.levelIndex].name, 14);

    // Edelweiss-Ausbeute
    this.add.image(cx - 80, 185, 'edelweiss').setScale(2);
    this.add.text(cx - 52, 185, `${this.collected} / ${this.total}`, {
      fontFamily: FONT, fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 5
    }).setOrigin(0, 0.5);
    if (this.total > 0 && this.collected === this.total) text(215, 'ALLE GEFUNDEN!', 9, '#7dff9a');

    this.showPassword(cx);

    // Die beiden Wanderer jubeln
    [['hiker1', cx - 120], ['hiker2', cx + 120]].forEach(([key, x], i) => {
      const s = this.add.sprite(x, GAME_HEIGHT - 120, key, charFrame(key, 'jump')).setScale(3).setFlipX(i === 1);
      this.tweens.add({ targets: s, y: s.y - 30, duration: 350, yoyo: true, repeat: -1, ease: 'Quad.out', delay: i * 175 });
    });

    const prompt = text(GAME_HEIGHT - 40, 'SPRUNG = WEITER   ESC / B = MENÜ', 11, '#aab4cc');
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });

    this.input.keyboard.once('keydown-ESC', () => this.leave('MenuScene'));

    // Erst nach kurzer Pause Eingaben annehmen (kein versehentliches Wegdrücken)
    this.ready = false;
    this.time.delayedCall(800, () => { this.ready = true; });
  }

  /** Passwort für das nächste Level in vier SNES-artigen Kästchen. */
  showPassword(cx) {
    const code = Passwords.forLevel(this.levelIndex + 1);
    this.add.text(cx, 245, `PASSWORT FÜR LEVEL ${this.levelIndex + 2}`, {
      fontFamily: FONT, fontSize: '12px', color: '#ffffff', stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5);
    code.split('').forEach((digit, i) => {
      const x = cx + (i - 1.5) * 70;
      this.add.rectangle(x, 300, 56, 64, 0x10131c, 0.9).setStrokeStyle(3, 0xf7d117);
      this.add.text(x, 302, digit, { fontFamily: FONT, fontSize: '28px', color: '#f7d117' }).setOrigin(0.5);
    });
    this.add.text(cx, 348, 'Gut aufschreiben!', {
      fontFamily: FONT, fontSize: '9px', color: '#dddddd', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5);
  }

  update(time, delta) {
    this.inputs.forEach(i => i.update());
    this.backdrop.update(this.cameras.main, GAME_HEIGHT, delta);
    if (!this.ready) return;

    if (this.inputs.some(i => i.justPressed('jump') || i.justPressed('start'))) {
      this.leave('GameScene', { levelIndex: this.levelIndex + 1 });
    } else if (this.inputs.some(i => i.justPressed('back'))) {
      this.leave('MenuScene');   // Controller: B = wie ESC
    }
  }

  leave(sceneKey, data) {
    if (this.leaving) return;
    this.leaving = true;
    Sfx.play(this, 'select');
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(sceneKey, data));
  }
}
