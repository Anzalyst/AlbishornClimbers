/* =====================================================================
 * GalleryScene – Bildergalerie im Hauptmenü der KES-Konsole
 *
 * Zeigt die Familienbilder der Ladebildschirme gross im Dia-Rahmen, darunter
 * den passenden Spruch in der KES-Textbox. Bedienung: Links/Rechts blättern
 * (am Ende geht's wieder von vorne los), B / ESC = zurück zur Spielauswahl.
 *
 * Bilder: LOADING_IMAGES (js/generated/loading-images.js), Sprüche und
 * Reihenfolge: TXT.loadingSlides (texts.js). Als letztes, ehrendes Bild
 * folgt das Gedenkbild für Kurt & Peter (TXT.memorial).
 * ===================================================================== */

class GalleryScene extends Phaser.Scene {
  constructor() {
    super('GalleryScene');
  }

  init(data) {
    this.index = (data && data.index) || 0;
    this.leaving = false;
  }

  create() {
    this.inputs = createPlayerInputs(this);
    this.keys = GalleryScene.slides();
    const cx = GAME_WIDTH / 2;
    this.add.graphics().fillStyle(0x10131c).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add.text(cx, 18, TXT.galleryMenu, { fontFamily: FONT, fontSize: '14px', color: '#f7d117', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5);

    // Dia-Rahmen wie im Ladebildschirm
    const pw = LOADING.photoW, ph = LOADING.photoH, border = 8;
    const fw = pw + border * 2, fh = ph + border * 2, top = 34;
    const frame = this.add.graphics();
    frame.fillStyle(0xe9e4d4).fillRect(cx - fw / 2, top, fw, fh);
    frame.fillStyle(0x8a8474).fillRect(cx - pw / 2 - 2, top + border - 2, pw + 4, ph + 4);
    frame.fillStyle(0x10131c).fillRect(cx - pw / 2, top + border, pw, ph);
    this.photo = this.add.image(cx, top + border + ph / 2, '__DEFAULT');

    // Blätter-Pfeile links und rechts vom Bild
    const arrowStyle = { fontFamily: FONT, fontSize: '28px', color: '#f7d117', stroke: '#000000', strokeThickness: 5 };
    this.arrows = [
      this.add.text(cx - fw / 2 - 40, top + fh / 2, '<', arrowStyle).setOrigin(0.5),
      this.add.text(cx + fw / 2 + 40, top + fh / 2, '>', arrowStyle).setOrigin(0.5)
    ];
    this.arrows.forEach((a, i) => this.tweens.add({ targets: a, x: a.x + (i ? 6 : -6), duration: 400, yoyo: true, repeat: -1 }));
    this.counter = this.add.text(cx + fw / 2 + 40, top + fh / 2 + 40, '', { fontFamily: FONT, fontSize: '8px', color: '#aab4cc', align: 'center' }).setOrigin(0.5);

    // Spruch in der KES-Textbox
    const boxY = top + fh + 6, boxH = 58;
    drawKesTextBox(this, 40, boxY, GAME_WIDTH - 80, boxH);
    this.caption = this.add.text(cx, boxY + boxH / 2, '', {
      fontFamily: FONT, fontSize: '12px', color: '#ffffff', align: 'center', lineSpacing: 10,
      wordWrap: { width: GAME_WIDTH - 140 }
    }).setOrigin(0.5);

    this.add.text(cx, GAME_HEIGHT - 10, TXT.galleryPrompt, { fontFamily: FONT, fontSize: '8px', color: '#aab4cc' }).setOrigin(0.5, 1);

    this.input.keyboard.on('keydown-ESC', () => this.leave());
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.show(this.index);
  }

  /** Alle Bilder, die eingebettet sind – in der Reihenfolge von TXT.loadingSlides, zum Schluss das Gedenkbild. */
  static slides() {
    return Object.keys(TXT.loadingSlides).concat('erinnerung')
      .filter(k => typeof LOADING_IMAGES !== 'undefined' && LOADING_IMAGES[k]);
  }

  /** Bildunterschrift: Spruch bzw. Gedenktext. */
  static caption(key) {
    return key === 'erinnerung' ? TXT.memorial : TXT.loadingSlides[key];
  }

  /** Bild Nummer i zeigen (läuft an den Enden rundherum). */
  show(i) {
    const n = this.keys.length;
    if (!n) return;
    this.index = ((i % n) + n) % n;
    this.slide = this.keys[this.index];
    this.photo.setTexture(`loading_${this.slide}`).setDisplaySize(LOADING.photoW, LOADING.photoH);
    this.caption.setText(GalleryScene.caption(this.slide));
    this.counter.setText(tx(TXT.galleryCount, { n: this.index + 1, all: n }).replace(' ', '\n'));
  }

  update() {
    this.inputs.forEach(i => i.update());
    if (this.leaving) return;
    const any = a => this.inputs.some(i => i.justPressed(a));
    if (any('back')) { this.leave(); return; }
    const dir = (any('right') ? 1 : 0) - (any('left') ? 1 : 0);
    if (dir) {
      Sfx.play(this, 'select');
      this.show(this.index + dir);
    }
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    Sfx.play(this, 'select');
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameSelectScene', { selected: 2 }));
  }
}
