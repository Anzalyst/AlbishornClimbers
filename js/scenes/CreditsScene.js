/* =====================================================================
 * CreditsScene – Abspann
 *
 * Die Einträge aus CREDITS (config.js) rollen von unten nach oben über
 * den Nachthimmel; unten wandert die ganze Familie vorbei. Vor dem "ÄNDI"
 * folgt ein hervorgehobener Abschnitt in Erinnerung an Kurt & Peter.
 *   Sprung (gedrückt halten) = schneller   ESC / Sprung am Ende = weiter zur EndScene
 * ===================================================================== */

class CreditsScene extends Phaser.Scene {
  constructor() {
    super('CreditsScene');
  }

  create() {
    this.inputs = createPlayerInputs(this);
    this.leaving = false;
    this.finished = false;
    this.cameras.main.fadeIn(800, 0, 0, 0);

    this.createNightSky();
    this.createParade();
    this.createRoll();

    this.song = null;
    this.playMusic();
    this.events.once('shutdown', () => { if (this.song) this.song.stop(); });
    this.input.keyboard.on('keydown-ESC', () => this.leave());
    this.input.keyboard.on('keydown-M', () => Sfx.toggleMute());
  }

  createNightSky() {
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x05061a, 0x05061a, 0x2a1f55, 0x2a1f55, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    for (let i = 0; i < 90; i++) {
      const star = this.add.image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, 420), 'pixel')
        .setScale(Phaser.Math.FloatBetween(0.25, 0.6));
      this.tweens.add({ targets: star, alpha: { from: 1, to: 0.15 }, duration: Phaser.Math.Between(700, 2000), yoyo: true, repeat: -1 });
    }
    this.add.tileSprite(0, GAME_HEIGHT - 260, GAME_WIDTH, 300, 'mountains').setOrigin(0).setTint(0x3a3f6a);
    // Hügel & Wiese liegen VOR dem Abspann-Text: Er taucht hinter den Hügeln auf
    this.add.tileSprite(0, GAME_HEIGHT - 150, GAME_WIDTH, 220, 'hills').setOrigin(0).setTint(0x1f3a2a).setDepth(22);
    this.add.tileSprite(0, GAME_HEIGHT - 60, GAME_WIDTH, 60, 'ssp_lawn').setOrigin(0).setTint(0x3a5a44).setDepth(23);
  }

  /** Jessica, Simon, Sven, Tante Edith & Onkel Kurt wandern vorbei. */
  createParade() {
    const ground = GAME_HEIGHT - 58, scale = 1.5;
    const kid = key => this.add.sprite(0, ground, key, 0).setOrigin(0.5, 1).setScale(scale).setDepth(25);

    // Die ganze Familie: Jessica & Simon, Katze Ginny, Sven mit Hannah in der
    // Kraxe (sie wippt bei jedem Schritt mit), Angi, Tante Edith & Onkel Kurt
    this.svenGroup = addSvenWithDaughter(this, 0, ground, scale, 25).setBob(1, 2);
    const walkers = [
      [kid('hiker1'), 0], [kid('hiker2'), 46],
      [addGinny(this, 0, ground, scale).setDepth(25), 92],
      [this.svenGroup.sven, 140],
      [addPerson(this, 'angi', 0, ground, scale).setDepth(25), 196],
      [addPerson(this, 'edith', 0, ground, scale).setDepth(25), 252],
      [addPerson(this, 'kurt', 0, ground, scale).setDepth(25), 304]
    ];
    this.parade = walkers.map(([sprite, offset]) => {
      sprite.x = -60 - offset;
      sprite.play(`${sprite.texture.key}-walk`);
      return sprite;
    });
  }

  createRoll() {
    const cx = GAME_WIDTH / 2;
    this.roll = this.add.container(0, GAME_HEIGHT - 120).setDepth(20);
    let y = 0;

    const logo = this.add.text(cx, y, 'ALBISHORN\nCLIMBERS', {
      fontFamily: FONT, fontSize: '32px', color: '#f7d117', align: 'center', lineSpacing: 8,
      stroke: '#17121f', strokeThickness: 8
    }).setOrigin(0.5, 0);
    this.roll.add(logo);
    y += logo.height + 90;

    CREDITS.forEach(entry => {
      if (entry.title) {
        const t = this.add.text(cx, y, fillNames(entry.title).toUpperCase(), {
          fontFamily: FONT, fontSize: '11px', color: '#f7d117', align: 'center'
        }).setOrigin(0.5, 0);
        this.roll.add(t);
        y += 30;
      }
      entry.names.forEach(name => {
        const n = this.add.text(cx, y, fillNames(name), {
          fontFamily: FONT, fontSize: '16px', color: '#ffffff', align: 'center'
        }).setOrigin(0.5, 0);
        this.roll.add(n);
        y += 30;
      });
      y += 70;
    });

    y = this.addMemorial(y);

    // Zum Schluss: KES-Logo und "ENDE" – bleibt in der Bildmitte stehen
    const end = this.add.text(cx, y + 40, TXT.creditsEnd, {
      fontFamily: FONT, fontSize: '28px', color: '#ffffff'
    }).setOrigin(0.5);
    const kes = this.add.text(cx, y + 100, `${CONSOLE.name} · ${CONSOLE.fullName}`, {
      fontFamily: FONT, fontSize: '9px', color: '#aab4cc'
    }).setOrigin(0.5);
    this.roll.add([end, kes]);
    this.rollStopY = -(y + 40) + GAME_HEIGHT / 2 - 60;   // "ENDE" landet etwas über der Mitte

    this.prompt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 16, TXT.creditsPrompt, {
      fontFamily: FONT, fontSize: '9px', color: '#dddddd'
    }).setOrigin(0.5, 1).setDepth(30).setVisible(false);
  }

  /**
   * Gedenk-Abschnitt im Lauftext: "In liebevoller Erinnerig an" / KURT & PETER
   * (gross, golden, zwischen zwei Edelweiss) / "Ihr sind immer Teil vo üsem
   * Abentüür!" – mit ruhigem Abstand davor und danach. Gibt das neue y zurück.
   */
  addMemorial(y) {
    const cx = GAME_WIDTH / 2;
    const [intro, names, outro] = TXT.memorialRoll;
    y += 40;
    const parts = [
      this.add.text(cx, y, intro, { fontFamily: FONT, fontSize: '12px', color: '#c8d0e8', align: 'center' }).setOrigin(0.5, 0),
      this.add.text(cx, y + 34, names, {
        fontFamily: FONT, fontSize: '22px', color: '#f7d117', align: 'center', stroke: '#17121f', strokeThickness: 6
      }).setOrigin(0.5, 0),
      this.add.text(cx, y + 84, outro, { fontFamily: FONT, fontSize: '12px', color: '#ffffff', align: 'center' }).setOrigin(0.5, 0)
    ];
    this.memorialTexts = parts;
    const half = parts[1].width / 2 + 34;
    [-half, half].forEach(dx => parts.push(this.add.image(cx + dx, y + 45, 'edelweiss').setScale(2)));
    this.roll.add(parts);
    return y + 84 + 30 + 110;
  }

  playMusic() {
    if (this.leaving) return;
    this.song = Sfx.melody(this, Sfx.songs.credits, 0.3);
    this.time.delayedCall(this.song.duration * 1000 + 300, () => this.playMusic());
  }

  update(time, delta) {
    this.inputs.forEach(i => i.update());

    // Wanderer laufen von links nach rechts und kommen immer wieder
    this.parade.forEach(s => {
      s.x += 50 * delta / 1000;
      if (s.x > GAME_WIDTH + 320) s.x -= GAME_WIDTH + 400;
    });
    this.svenGroup.update(time);

    if (!this.finished) {
      const fast = this.inputs.some(i => i.jump);
      this.roll.y -= (fast ? 180 : 38) * delta / 1000;
      if (this.roll.y <= this.rollStopY) {
        this.roll.y = this.rollStopY;
        this.finished = true;
        Sfx.play(this, 'win');
        this.time.delayedCall(800, () => this.prompt.setVisible(true));
      }
    } else if (this.prompt.visible && this.inputs.some(i => i.justPressed('jump') || i.justPressed('start'))) {
      this.leave();
    }
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    if (this.song) this.song.stop();
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('EndScene'));
  }
}
