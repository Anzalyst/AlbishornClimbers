/* =====================================================================
 * IntroScene – zwei Modi:
 *
 *   { mode: 'logo' }   Konsole einschalten → KES-Startlogo → Spielauswahl
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
      else if (this.phase === 'logo' && pressed && this.time.now > this.skippableAt) this.leave('GameSelectScene');
    } else {
      if (this.backdrop) this.backdrop.update(this.cameras.main, GAME_HEIGHT, delta);
      if (this.dialog) this.dialog.update(this.inputs);
    }
  }

  leave(sceneKey, data) {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => startWithLoading(this, sceneKey, data));
  }

  // =====================================================================
  // MODUS 1: KES-STARTLOGO
  // =====================================================================
  createPowerScreen() {
    this.phase = 'off';
    this.cameras.main.setBackgroundColor('#05060a');
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;

    // KES-Konsole als 16-Bit-Pixel-Art (js/menuArt.js), 2× gross; schwebt ganz leicht
    const consoleBox = this.add.container(cx, cy - 40);
    const W = 200 * 2, H = 84 * 2;
    consoleBox.add(this.add.ellipse(0, H / 2 + 6, W * 0.9, 18, 0x000000, 0.6));       // Schatten auf dem "Tisch"
    consoleBox.add(this.add.image(0, 0, 'kesConsole').setScale(2));
    // LEDs über den Knöpfen: Power (rot) glimmt im Standby, die anderen gehen beim Einschalten an
    const ledAt = i => [MenuArt.KES_BUTTONS[i] * 2 - W / 2 + 1, MenuArt.KES_LED_Y * 2 - H / 2 + 1];
    this.leds = [0xff2a2a, 0xffd23a, 0x4af05a, 0x4aa0ff].map((color, i) => {
      const [x, y] = ledAt(i);
      const glow = this.add.circle(x, y, 10, color, 0).setBlendMode(Phaser.BlendModes.ADD);
      const dot = this.add.rectangle(x, y, 4, 4, color).setAlpha(0);
      consoleBox.add([glow, dot]);
      return { glow, dot };
    });
    this.led = this.leds[0].dot;
    this.standby = this.tweens.add({ targets: [this.led, this.leds[0].glow], alpha: { from: 0.15, to: 0.55 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: consoleBox, y: cy - 44, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.powerScreen = consoleBox;

    // "DRÜCK E TASCHTE ZUM IISCHALTE": pulsiert wie bei einem Arcade-Automaten –
    // weiches Ein-/Ausblenden, dazu Farbschimmer Blaugrau → Gelb und ein Hauch Zoom
    this.powerHint = this.add.text(cx, cy + 92, TXT.powerOn, {
      fontFamily: FONT, fontSize: '14px', color: '#aab4cc', stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setAlpha(0.2);                    // Startzustand des Pulsierens (kein Aufblitzen)
    const from = Phaser.Display.Color.HexStringToColor('#aab4cc'), to = Phaser.Display.Color.HexStringToColor('#f7d117');
    this.hintPulse = this.tweens.addCounter({
      from: 0, to: 100, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      onUpdate: tw => {
        const v = tw.getValue();
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, v);
        this.powerHint.setColor(Phaser.Display.Color.RGBToString(c.r, c.g, c.b)).setAlpha(0.2 + 0.8 * v / 100).setScale(1 + 0.04 * v / 100);
      }
    });

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
    // LEDs gehen nacheinander an, der Text leuchtet kurz voll auf
    this.standby.stop();
    this.hintPulse.stop();
    this.powerHint.setAlpha(1).setScale(1).setColor('#ffffff');
    this.leds.forEach(({ glow, dot }, i) => this.time.delayedCall(i * 70, () => { dot.setAlpha(1); glow.setAlpha(0.7); }));
    this.time.delayedCall(380, () => {
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

    this.time.delayedCall(4800, () => this.leave('GameSelectScene'));
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
      for (let y = ground + TILE; y < GAME_HEIGHT; y += TILE) this.add.image(x + TILE / 2, y + TILE / 2, `earth${Math.floor(x / TILE + y / TILE) % 2}`);
    }
    this.add.image(110, ground, 'house').setOrigin(0.5, 1);
    this.add.image(250, ground, 'tree').setOrigin(0.5, 1);
    this.add.image(880, ground, 'tree').setOrigin(0.5, 1);

    // Wegweiser zum Albishorn (mit optimistischer Zeitangabe)
    this.add.image(690, ground, 'goalSign').setOrigin(16 / 140, 1);
    this.add.text(690 - 16 + 60, ground - 110 + 22, TXT.signpost, {
      fontFamily: FONT, fontSize: '8px', color: '#111111'
    }).setOrigin(0.5);

    // Die Familie
    this.actors = {
      kurt: addPerson(this, 'kurt', 350, ground, 2),
      edith: addPerson(this, 'edith', 425, ground, 2),
      jessica: this.add.sprite(540, ground, 'hiker1', 0).setOrigin(0.5, 1).setScale(2).setFlipX(true),
      simon: this.add.sprite(595, ground, 'hiker2', 0).setOrigin(0.5, 1).setScale(2).setFlipX(true)
    };

    this.add.text(GAME_WIDTH - 16, 14, TXT.skipIntro, {
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

  /** Nach dem Dialog: Tante Edith läuft mit Jessica voraus, Onkel Kurt folgt mit Simon. */
  departure() {
    const { kurt, edith, jessica, simon } = this.actors;
    [[edith, 0], [jessica, 0], [simon, 450], [kurt, 450]].forEach(([p, delay]) => {
      if (p.texture.key.startsWith('hiker')) p.setFlipX(false);
      this.time.delayedCall(delay, () => p.play(`${p.texture.key}-walk`));
      this.tweens.add({ targets: p, x: GAME_WIDTH + 80, duration: 2400, delay });
    });
    this.time.delayedCall(2700, () => this.leave('GameScene', { levelIndex: 0 }));
  }
}
