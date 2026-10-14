/* =====================================================================
 * dialog.js – RPG-artige Dialogbox (wie bei SNES-Spielen)
 *
 *   const box = new DialogBox(scene);
 *   box.play(STORY.intro).then(() => …);     // Zeilen nacheinander zeigen
 *   box.update(inputs);                      // in update() aufrufen
 *
 * Sprung / Start: Text sofort fertig schreiben bzw. nächste Zeile.
 * Sprecher und Porträts kommen aus SPEAKERS (config.js).
 * ===================================================================== */

class DialogBox {
  constructor(scene, { y = GAME_HEIGHT - 86, depth = 200 } = {}) {
    this.scene = scene;
    this.lines = [];
    this.index = -1;
    this.typing = false;
    this.resolve = null;

    const w = GAME_WIDTH - 48, h = 128;
    this.w = w;
    this.h = h;
    this.container = scene.add.container(GAME_WIDTH / 2, y).setScrollFactor(0).setDepth(depth).setVisible(false);

    const frame = scene.add.rectangle(0, 0, w, h, 0x10131c, 0.92).setStrokeStyle(4, 0xf7d117);
    const inner = scene.add.rectangle(0, 0, w - 12, h - 12).setStrokeStyle(2, 0x5a6480);
    this.portraitFrame = scene.add.rectangle(-w / 2 + 58, 0, 80, 80, 0x2a3350).setStrokeStyle(3, 0xffffff);
    this.portrait = scene.add.image(-w / 2 + 58, 0, 'pixel');
    this.nameText = scene.add.text(-w / 2 + 112, -h / 2 + 18, '', {
      fontFamily: FONT, fontSize: '12px', color: '#f7d117'
    });
    this.bodyText = scene.add.text(-w / 2 + 112, -h / 2 + 44, '', {
      fontFamily: FONT, fontSize: '11px', color: '#ffffff', lineSpacing: 10,
      wordWrap: { width: w - 150 }
    });
    this.arrow = scene.add.text(w / 2 - 24, h / 2 - 22, '▼', {
      fontFamily: FONT, fontSize: '10px', color: '#f7d117'
    }).setOrigin(0.5);
    scene.tweens.add({ targets: this.arrow, y: this.arrow.y + 4, duration: 350, yoyo: true, repeat: -1 });

    this.container.add([frame, inner, this.portraitFrame, this.portrait, this.nameText, this.bodyText, this.arrow]);
  }

  /** Spielt eine Liste von Zeilen ab. Liefert ein Promise, das am Ende erfüllt wird. */
  play(lines) {
    this.lines = lines;
    this.index = -1;
    this.container.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.container, alpha: 1, duration: 200 });
    this.next();
    return new Promise(resolve => { this.resolve = resolve; });
  }

  get active() { return this.index >= 0 && this.index < this.lines.length; }

  next() {
    this.index++;
    if (this.index >= this.lines.length) return this.close();

    const line = this.lines[this.index];
    const speaker = SPEAKERS[line.who] || SPEAKERS.narrator;
    const hasPortrait = !!speaker.portrait;
    const textX = -this.w / 2 + (hasPortrait ? 112 : 28);

    this.portrait.setVisible(hasPortrait);
    this.portraitFrame.setVisible(hasPortrait);
    if (hasPortrait) this.portrait.setTexture(speaker.portrait);
    this.nameText.setText(speaker.name).setColor(speaker.color).setX(textX);
    this.bodyText.setX(textX).setY(-this.h / 2 + (speaker.name ? 44 : 30));
    this.bodyText.setWordWrapWidth(this.w - (hasPortrait ? 150 : 60));
    this.bodyText.setColor(line.who === 'narrator' ? '#f7d117' : '#ffffff');

    this.fullText = fillNames(line.text);
    this.shown = 0;
    this.typing = true;
    this.arrow.setVisible(false);
    if (this.typeTimer) this.typeTimer.remove();
    this.typeTimer = this.scene.time.addEvent({
      delay: 30, repeat: this.fullText.length - 1,
      callback: () => {
        this.shown++;
        this.bodyText.setText(this.fullText.slice(0, this.shown));
        if (this.shown % 2 === 0 && this.fullText[this.shown - 1] !== ' ') Sfx.play(this.scene, 'type');
        if (this.shown >= this.fullText.length) this.finishLine();
      }
    });
  }

  finishLine() {
    if (this.typeTimer) this.typeTimer.remove();
    this.typing = false;
    this.bodyText.setText(this.fullText);
    this.arrow.setVisible(true);
  }

  /** Jeden Frame aufrufen – reagiert auf Sprung/Start beider Spieler. */
  update(inputs) {
    if (!this.active) return;
    if (inputs.some(i => i.justPressed('jump') || i.justPressed('start'))) {
      if (this.typing) this.finishLine();
      else { Sfx.play(this.scene, 'select'); this.next(); }
    }
  }

  close() {
    this.index = this.lines.length;
    this.scene.tweens.add({ targets: this.container, alpha: 0, duration: 200, onComplete: () => this.container.setVisible(false) });
    if (this.resolve) { const r = this.resolve; this.resolve = null; r(); }
  }
}
