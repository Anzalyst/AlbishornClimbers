/* =====================================================================
 * LoadingScene – Ladebildschirm als Dia-Show mit den Familienbildern
 *
 * Erscheint vor jedem Level von Albishorn Climbers (also auch nach jedem
 * bestandenen Level), vor jedem Minispiel der Super Sempach Party und nach
 * dem letzten Minispiel vor der Siegerehrung: ein zufälliges Pixel-Art-
 * Familienbild (4:3, im Dia-Rahmen), darunter die KES-Textbox (schwarz mit
 * gelber Kontur) mit dem Spruch und ein Ladebalken, auf dem Ginny die Katze
 * mitläuft ("LADET..."). Nach LOADING.duration blendet die Szene aus und
 * das Spiel geht weiter; A / Sprung / START / ENTER überspringt sofort.
 *
 *   startWithLoading(scene, key, data)   statt scene.scene.start(key, data)
 *
 * Bilder: js/generated/loading-images.js (tools/embed-images.js),
 * Sprüche: TXT.loadingSlides (texts.js). Die Bildergalerie (GalleryScene)
 * zeigt dieselben Bilder.
 * ===================================================================== */

const LOADING = {
  duration: 4000,      // ms bis zum Ausblenden
  skipAfter: 250,      // ab dann: A / START / ENTER = sofort weiter (kurze Sperre gegen Tasten-Wiederholung)
  fadeIn: 300,
  fadeOut: 400,
  typeMs: 18,          // Schreibmaschinen-Tempo der Textbox (ms pro Zeichen)
  photoW: 512,         // Bildgrösse im Dia-Rahmen (= eingebettete Grösse, 4:3)
  photoH: 384
};

/**
 * Mit Ladebildschirm: Level von Albishorn Climbers, Minispiele der SSP und
 * die Siegerehrung (= nach dem letzten Minispiel). Zwischenstand und Menüs
 * nicht – nach dem Zwischenstand folgt ja gleich der Ladebildschirm vor
 * dem nächsten Minispiel.
 */
function wantsLoading(key) {
  return typeof LOADING_IMAGES !== 'undefined' &&
    (key === 'GameScene' || key === 'SspAwardScene' || (typeof SSP !== 'undefined' && !!SSP.byKey(key)));
}

/** KES-Textbox: schwarz mit gelber Kontur (Ladebildschirm und Bildergalerie). */
function drawKesTextBox(scene, x, y, w, h) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000).fillRect(x, y, w, h);
  g.lineStyle(4, 0xf7d117).strokeRect(x + 2, y + 2, w - 4, h - 4);
  g.lineStyle(2, 0x8a6a10).strokeRect(x + 8, y + 8, w - 16, h - 16);
  return g;
}

/** Szenenwechsel, bei Bedarf über den Ladebildschirm. */
function startWithLoading(scene, key, data) {
  if (wantsLoading(key)) scene.scene.start('LoadingScene', { next: key, data });
  else scene.scene.start(key, data);
}

class LoadingScene extends Phaser.Scene {
  constructor() {
    super('LoadingScene');
  }

  init(data) {
    this.next = data.next;
    this.nextData = data.data;
    this.elapsed = 0;
    this.leaving = false;
    this.slide = LoadingScene.pick();
  }

  /**
   * Nächstes Dia aus dem "Magazin": alle Fotos einmal in zufälliger
   * Reihenfolge, dann neu gemischt – nie zweimal dasselbe direkt hintereinander.
   */
  static pick() {
    const keys = Object.keys(TXT.loadingSlides).filter(k => typeof LOADING_IMAGES !== 'undefined' && LOADING_IMAGES[k]);
    if (!LoadingScene.bag.length) {
      LoadingScene.bag = Phaser.Utils.Array.Shuffle(keys.slice());
      if (LoadingScene.bag.length > 1 && LoadingScene.bag[0] === LoadingScene.last) LoadingScene.bag.push(LoadingScene.bag.shift());
    }
    LoadingScene.last = LoadingScene.bag.shift();
    return LoadingScene.last;
  }

  create() {
    this.inputs = createPlayerInputs(this);
    this.enterPressed = false;
    this.input.keyboard.on('keydown-ENTER', () => { this.enterPressed = true; });
    const cx = GAME_WIDTH / 2;
    this.drawBackground();

    // --- Dia: Foto im Kunststoff-Rahmen, schiebt sich mit "Klack" herein ---
    const pw = LOADING.photoW, ph = LOADING.photoH;
    const border = 10, top = 6;
    this.slideBox = this.add.container(cx, top + border + ph / 2);
    const frame = this.add.graphics();
    const fw = pw + border * 2, fh = ph + border * 2;
    frame.fillStyle(0x000000, 0.45).fillRect(-fw / 2 + 6, -fh / 2 + 6, fw, fh);              // Schatten
    frame.fillStyle(0xe9e4d4).fillRect(-fw / 2, -fh / 2, fw, fh);                            // Rahmen
    frame.fillStyle(0xfffcf0).fillRect(-fw / 2, -fh / 2, fw, 3).fillRect(-fw / 2, -fh / 2, 3, fh);
    frame.fillStyle(0xb8b2a0).fillRect(-fw / 2, fh / 2 - 3, fw, 3).fillRect(fw / 2 - 3, -fh / 2, 3, fh);
    frame.fillStyle(0x8a8474).fillRect(-pw / 2 - 2, -ph / 2 - 2, pw + 4, ph + 4);             // Fenster-Kante
    frame.fillStyle(0x10131c).fillRect(-pw / 2, -ph / 2, pw, ph);
    this.slideBox.add(frame);
    const texKey = `loading_${this.slide}`;
    if (this.textures.exists(texKey)) {
      this.photo = this.add.image(0, 0, texKey).setDisplaySize(pw, ph);
      this.slideBox.add(this.photo);
    }
    // Projektor-Licht: ganz leichtes Flackern über dem Bild
    this.flicker = this.add.rectangle(0, 0, pw, ph, 0xfff4d0, 0);
    this.slideBox.add(this.flicker);
    this.slideBox.y -= GAME_HEIGHT;
    this.tweens.add({
      targets: this.slideBox, y: this.slideBox.y + GAME_HEIGHT, duration: 420, ease: 'Back.easeOut',
      onComplete: () => Sfx.play(this, 'slideClack')
    });

    // --- KES-Textbox mit dem Spruch (Schreibmaschine) ---
    const boxY = top + fh + 8, boxH = 62;
    drawKesTextBox(this, 40, boxY, GAME_WIDTH - 80, boxH);
    this.fullText = TXT.loadingSlides[this.slide];
    this.caption = this.add.text(cx, boxY + boxH / 2, '', {
      fontFamily: FONT, fontSize: '12px', color: '#ffffff', align: 'center', lineSpacing: 10,
      wordWrap: { width: GAME_WIDTH - 140 }
    }).setOrigin(0.5);
    // Endgültigen Umbruch vorab berechnen, damit die Zeilen beim Tippen nicht springen
    this.lines = this.caption.getWrappedText(this.fullText);
    this.caption.setWordWrapWidth(null);

    // --- Ladezeile: Text, Balken mit Ginny, Hinweis zum Abkürzen ---
    const rowY = boxY + boxH + 33;
    this.label = this.add.text(40, rowY, '', { fontFamily: FONT, fontSize: '10px', color: '#f7d117' }).setOrigin(0, 0.5);
    this.bar = { x: 330, y: rowY - 5, w: 420, h: 10 };
    this.barGfx = this.add.graphics();
    this.ginny = this.textures.exists('cat_ginny')
      ? this.add.sprite(this.bar.x, this.bar.y - 1, 'cat_ginny', 1).setOrigin(0.5, 1)
      : null;
    if (this.ginny && this.anims.exists('cat_ginny-walk')) this.ginny.play('cat_ginny-walk');
    this.skipHint = this.add.text(GAME_WIDTH - 40, rowY, TXT.loadingSkip, {
      fontFamily: FONT, fontSize: '8px', color: '#aab4cc'
    }).setOrigin(1, 0.5).setVisible(false);

    this.cameras.main.fadeIn(LOADING.fadeIn, 0, 0, 0);
    this.refresh();
  }

  /** Dunkler "Vorführraum" mit feinem Pixel-Raster. */
  drawBackground() {
    const g = this.add.graphics();
    g.fillStyle(0x10131c).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0x1a2032);
    for (let y = 4; y < GAME_HEIGHT; y += 16) {
      for (let x = (y / 16) % 2 ? 12 : 4; x < GAME_WIDTH; x += 16) g.fillRect(x, y, 2, 2);
    }
  }

  update(time, delta) {
    this.inputs.forEach(i => i.update());
    this.elapsed += delta;
    this.refresh();
    if (this.leaving) return;
    const pressed = this.enterPressed || this.inputs.some(i => i.justPressed('jump') || i.justPressed('start'));
    this.enterPressed = false;
    const skip = this.elapsed >= LOADING.skipAfter && pressed;
    if (skip || this.elapsed >= LOADING.duration) this.leave();
  }

  refresh() {
    const t = this.elapsed;
    // Text tippt sich Zeichen für Zeichen (Zeilen bleiben fest)
    let left = Math.floor(t / LOADING.typeMs);
    this.caption.setText(this.lines.map(line => {
      const part = line.slice(0, Math.max(0, left));
      left -= line.length;
      return part + ' '.repeat(line.length - part.length);   // feste Leerzeichen: Zeilen bleiben zentriert stehen
    }).join('\n'));
    // "LADET..." und "CHILL MAL EN MOMENT..." im Wechsel, Pünktchen laufen
    const dots = '.'.repeat(1 + Math.floor(t / 300) % 3);
    this.label.setText((Math.floor(t / 1500) % 2 ? TXT.loadingChill : TXT.loading) + dots);
    // Balken aus Pixel-Blöcken, Ginny läuft vorne mit
    const p = Phaser.Math.Clamp(t / LOADING.duration, 0, 1);
    const { x, y, w, h } = this.bar;
    const g = this.barGfx.clear();
    g.fillStyle(0xffffff).fillRect(x - 4, y - 4, w + 8, h + 8);
    g.fillStyle(0x000000).fillRect(x - 2, y - 2, w + 4, h + 4);
    const blocks = Math.floor(p * w / 10);
    for (let i = 0; i < blocks; i++) g.fillStyle(i % 2 ? 0x6ad04a : 0x4fb236).fillRect(x + i * 10, y, 8, h);
    if (this.ginny) this.ginny.x = x + Math.max(16, p * w);
    this.skipHint.setVisible(t >= LOADING.skipAfter && Math.floor(t / 400) % 2 === 0);
    this.flicker.setAlpha(0.03 + 0.03 * Math.sin(t / 37) * Math.sin(t / 91));
  }

  leave() {
    this.leaving = true;
    this.cameras.main.fadeOut(LOADING.fadeOut, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this.next, this.nextData));
  }
}
LoadingScene.bag = [];
LoadingScene.last = null;
