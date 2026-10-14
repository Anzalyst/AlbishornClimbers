/* =====================================================================
 * IntroScene – zwei Modi:
 *
 *   { mode: 'logo' }   Konsole einschalten → KES-Startlogo → Menü
 *                      (Der Tastendruck zum Einschalten erlaubt dem
 *                       Browser auch gleich, Ton abzuspielen.)
 *   { mode: 'story' }  Ebertswil: Tante Edith & Onkel Kurt schicken
 *                      Jessica & Simon los → Level 1
 *
 * Texte: CONSOLE und STORY.intro in config.js
 * ===================================================================== */

class IntroScene extends Phaser.Scene {
  constructor() {
    super('IntroScene');
  }

  init(data) {
    this.mode = data.mode || 'logo';
    this.leaving = false;
  }

  create() {
    this.inputs = createPlayerInputs(this);
    if (this.mode === 'logo') this.createPowerScreen();
    else this.createStory();
  }

  update(time, delta) {
    this.inputs.forEach(i => i.update());
    const pressed = this.inputs.some(i => i.justPressed('jump') || i.justPressed('start'));

    if (this.mode === 'logo') {
      if (this.phase === 'off' && pressed) this.powerOn();
      else if (this.phase === 'logo' && pressed && this.time.now > this.skippableAt) this.leave('MenuScene');
    } else {
      if (this.backdrop) this.backdrop.update(this.cameras.main, GAME_HEIGHT, delta);
      if (this.dialog) this.dialog.update(this.inputs);
    }
  }

  leave(sceneKey, data) {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(sceneKey, data));
  }

  // =====================================================================
  // MODUS 1: KES-STARTLOGO
  // =====================================================================
  createPowerScreen() {
    this.phase = 'off';
    this.cameras.main.setBackgroundColor('#05060a');
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;

    // Kleine Konsole mit roter Power-LED
    const consoleBox = this.add.container(cx, cy - 20);
    consoleBox.add(this.add.rectangle(0, 0, 220, 70, 0xb8bcc8).setStrokeStyle(4, 0x6a6e7a));
    consoleBox.add(this.add.rectangle(0, -10, 120, 14, 0x3a3e4a));                 // Modulschacht
    consoleBox.add(this.add.text(-90, 14, CONSOLE.name, { fontFamily: FONT, fontSize: '12px', color: '#3a3e4a' }));
    this.led = this.add.circle(80, 20, 5, 0x551111);
    consoleBox.add(this.led);
    [[-50, 0xd52b1e], [-30, 0xf7d117], [-10, 0x3fd06a], [10, 0x1b6ee8]].forEach(([x, c]) =>
      consoleBox.add(this.add.circle(x + 40, 20, 4, c)));
    this.powerScreen = consoleBox;

    this.powerHint = this.add.text(cx, cy + 70, 'DRÜCKE EINE TASTE ZUM EINSCHALTEN', {
      fontFamily: FONT, fontSize: '11px', color: '#aab4cc'
    }).setOrigin(0.5);
    this.tweens.add({ targets: this.powerHint, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });

    // Tastatur oder Mausklick schaltet ebenfalls ein
    this.input.keyboard.once('keydown', () => this.powerOn());
    this.input.once('pointerdown', () => this.powerOn());
  }

  powerOn() {
    if (this.phase !== 'off') return;
    this.phase = 'starting';
    // Ton freischalten: Browser erlauben Audio erst nach einer Nutzer-Geste.
    // Ein Tastendruck zählt immer, ein Controller-Knopf nicht in jedem Browser
    // (Konsolen-Betrieb: Chromium mit --autoplay-policy=no-user-gesture-required).
    const ctx = this.sound && this.sound.context;
    if (ctx && ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(() => {});
    this.led.setFillStyle(0xff2a2a);
    this.time.delayedCall(250, () => {
      this.powerScreen.destroy();
      this.powerHint.destroy();
      this.cameras.main.flash(300, 255, 255, 255);
      this.showLogo();
    });
  }

  showLogo() {
    this.phase = 'logo';
    this.skippableAt = this.time.now + 600;
    this.cameras.main.setBackgroundColor('#10131c');
    const cx = GAME_WIDTH / 2;

    // Kurz warten, bis der Browser den Ton freigegeben hat
    this.time.delayedCall(120, () => Sfx.play(this, 'kesBoot'));

    // "K E S" – Buchstaben fallen nacheinander herein
    const colors = ['#ff5a6e', '#f7d117', '#5aa2ff'];
    CONSOLE.name.split('').forEach((letter, i) => {
      const t = this.add.text(cx + (i - 1) * 120, -80, letter, {
        fontFamily: FONT, fontSize: '110px', color: colors[i % colors.length],
        stroke: '#ffffff', strokeThickness: 6
      }).setOrigin(0.5);
      t.setShadow(8, 8, '#000000', 0, false, true);
      this.tweens.add({ targets: t, y: 200, duration: 600, delay: 120 + i * 140, ease: 'Bounce.out' });
    });

    // Vier farbige Knöpfe, wie auf einem Controller
    [0xd52b1e, 0xf7d117, 0x3fd06a, 0x1b6ee8].forEach((c, i) => {
      const dot = this.add.circle(cx - 75 + i * 50, 300, 14, c).setScale(0);
      this.tweens.add({ targets: dot, scale: 1, duration: 250, delay: 800 + i * 110, ease: 'Back.out' });
    });

    const full = this.add.text(cx, 350, CONSOLE.fullName.toUpperCase(), {
      fontFamily: FONT, fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: full, alpha: 1, duration: 500, delay: 1300 });

    const license = this.add.text(cx, GAME_HEIGHT - 50, CONSOLE.license, {
      fontFamily: FONT, fontSize: '10px', color: '#aab4cc'
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: license, alpha: 1, duration: 600, delay: 1800 });

    this.time.delayedCall(4800, () => this.leave('MenuScene'));
  }

  // =====================================================================
  // MODUS 2: STORY-INTRO IN EBERTSWIL
  // =====================================================================
  createStory() {
    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.backdrop = addBackdrop(this, LEVELS[0].sky);
    const ground = 372;

    // Dorfwiese
    for (let x = 0; x < GAME_WIDTH; x += TILE) {
      this.add.image(x + TILE / 2, ground + TILE / 2, `grass${(x / TILE) % 3}`);
      for (let y = ground + TILE; y < GAME_HEIGHT; y += TILE) this.add.image(x + TILE / 2, y + TILE / 2, `earth${(x / TILE + y / TILE) % 2}`);
    }
    this.add.image(110, ground, 'house').setOrigin(0.5, 1);
    this.add.image(250, ground, 'tree').setOrigin(0.5, 1);
    this.add.image(880, ground, 'tree').setOrigin(0.5, 1);

    // Wegweiser zum Albishorn (mit optimistischer Zeitangabe)
    this.add.image(690, ground, 'goalSign').setOrigin(16 / 140, 1);
    this.add.text(690 - 16 + 60, ground - 110 + 22, 'Albishorn 1h30', {
      fontFamily: FONT, fontSize: '8px', color: '#111111'
    }).setOrigin(0.5);

    // Die Familie
    this.actors = {
      kurt: addPerson(this, 'kurt', 350, ground, 2),
      edith: addPerson(this, 'edith', 425, ground, 2),
      jessica: this.add.sprite(540, ground, 'hiker1', 0).setOrigin(0.5, 1).setScale(2).setFlipX(true),
      simon: this.add.sprite(595, ground, 'hiker2', 0).setOrigin(0.5, 1).setScale(2).setFlipX(true)
    };

    this.add.text(GAME_WIDTH - 16, 14, 'ESC = ÜBERSPRINGEN', {
      fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#000000', strokeThickness: 3
    }).setOrigin(1, 0);
    this.input.keyboard.once('keydown-ESC', () => this.leave('GameScene', { levelIndex: 0 }));

    // Wer spricht, hüpft kurz
    const lines = STORY.intro.map(line => ({ ...line }));
    this.dialog = new DialogBox(this);
    const origNext = this.dialog.next.bind(this.dialog);
    this.dialog.next = () => {
      origNext();
      const line = lines[this.dialog.index];
      const actor = line && this.actors[line.who];
      if (actor) this.tweens.add({ targets: actor, y: actor.y - 10, duration: 120, yoyo: true });
    };

    this.time.delayedCall(700, () => {
      this.dialog.play(lines).then(() => this.departure());
    });
  }

  /** Nach dem Dialog: Kinder laufen los, Eltern winken. */
  departure() {
    const { kurt, edith, jessica, simon } = this.actors;
    [kurt, edith].forEach((p, i) => {
      this.time.addEvent({ delay: 250, repeat: 12, callback: () => p.setFrame(Number(p.frame.name) === 1 ? 0 : 1), startAt: i * 120 });
    });
    [jessica, simon].forEach((kid, i) => {
      kid.setFlipX(false).play(`${kid.texture.key}-walk`);
      this.tweens.add({ targets: kid, x: GAME_WIDTH + 60, duration: 2200, delay: i * 200 });
    });
    this.time.delayedCall(2300, () => this.leave('GameScene', { levelIndex: 0 }));
  }
}
