/* =====================================================================
 * FinaleScene – Die grosse Geburtstagsfeier auf dem Albishorn
 *
 * Erscheint nach Level 5 (oder mit dem Geheim-Passwort aus BIRTHDAY).
 * Ablauf: Jessica & Simon kommen mit Tante Edith & Onkel Kurt am
 * Aussichtsturm an. Dort warten Sven, Angi, Hannah (in der Kraxe) und
 * Katze Ginny (STORY.summit in config.js) – danach startet die Party:
 *   - Abendhimmel mit Sternen, Alpenglühen und Zürichsee
 *   - Restaurant Albishorn mit Aussichtsturm & Lichterkette
 *   - Feuerwerk (manche Raketen schreiben eine "30" in den Himmel)
 *   - Konfetti, Ballons, Partyhütchen und "Happy Birthday" als Chiptune
 *   - Persönliche Glückwunsch-Nachricht aus BIRTHDAY in config.js
 * ===================================================================== */

const FINALE_COLORS = [0xd52b1e, 0xffffff, 0xf7d117, 0x3fd06a, 0x5aa2ff, 0xff7ad9];

// Pixel-Ziffern (3×5) für die "30" am Himmel
const SKY_DIGITS = {
  3: ['111', '001', '111', '001', '111'],
  0: ['111', '101', '101', '101', '111']
};

class FinaleScene extends Phaser.Scene {
  constructor() {
    super('FinaleScene');
  }

  create() {
    this.inputs = createPlayerInputs(this);
    this.ready = false;
    this.leaving = false;
    this.rocketCount = 0;
    this.cameras.main.fadeIn(800, 0, 0, 0);

    this.createSky();
    this.createLandscape();
    this.createCast();

    // Ablauf: Jessica & Simon kommen am Turm an → Sven begrüsst sie → Party!
    this.dialog = new DialogBox(this, { y: 90 });
    this.arrive().then(() => this.dialog.play(STORY.summit)).then(() => this.startCelebration());

    this.input.keyboard.on('keydown-ESC', () => this.leave());
    this.input.keyboard.on('keydown-M', () => Sfx.toggleMute());
    this.events.once('shutdown', () => { if (this.song) this.song.stop(); });
  }

  // ---------------------------------------------------------------------
  // Hintergrund: Abendhimmel, Sterne, Alpen, Zürichsee
  // ---------------------------------------------------------------------
  createSky() {
    const sky = this.add.graphics().setDepth(-100);
    sky.fillGradientStyle(0x0b1035, 0x0b1035, 0x4a2f78, 0x4a2f78, 1).fillRect(0, 0, GAME_WIDTH, 220);
    sky.fillGradientStyle(0x4a2f78, 0x4a2f78, 0xf08a5a, 0xf08a5a, 1).fillRect(0, 220, GAME_WIDTH, 200);

    for (let i = 0; i < 70; i++) {
      const star = this.add.image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, 230), 'pixel')
        .setScale(Phaser.Math.FloatBetween(0.3, 0.7)).setDepth(-99);
      this.tweens.add({
        targets: star, alpha: { from: 1, to: 0.2 },
        duration: Phaser.Math.Between(600, 1800), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500)
      });
    }
  }

  createLandscape() {
    // Alpen mit Alpenglühen
    this.add.tileSprite(0, 150, GAME_WIDTH, 300, 'mountains').setOrigin(0).setTint(0xd8a8c8).setDepth(-90);

    // Zürichsee mit Glitzern
    this.add.rectangle(GAME_WIDTH / 2, 392, GAME_WIDTH, 40, 0x3a6fb0).setDepth(-85);
    for (let i = 0; i < 18; i++) {
      const glint = this.add.rectangle(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(378, 406),
        Phaser.Math.Between(8, 24), 2, 0xffd9a0).setDepth(-84);
      this.tweens.add({ targets: glint, alpha: { from: 0.9, to: 0.1 }, duration: Phaser.Math.Between(500, 1200), yoyo: true, repeat: -1 });
    }

    // Dunkle Hügel am anderen Seeufer
    this.add.tileSprite(0, 330, GAME_WIDTH, 220, 'hills').setOrigin(0).setTint(0x557755).setDepth(-80);

    // Gipfelwiese im Vordergrund
    const hill = this.add.graphics().setDepth(-10);
    hill.fillStyle(0x3b8f2c);
    hill.fillPoints([
      { x: 0, y: 480 }, { x: 200, y: 466 }, { x: 420, y: 470 }, { x: 640, y: 462 },
      { x: 960, y: 478 }, { x: 960, y: 540 }, { x: 0, y: 540 }
    ], true);
    hill.fillStyle(0x4caf3a).fillRect(0, 486, GAME_WIDTH, 4);

    // Restaurant Albishorn + Aussichtsturm (Turm steht rechts davon)
    addRestaurant(this, 170, 474, 0, 1);
    this.createFairyLights(30, 345, 330, 240);
  }

  /** Blinkende Lichterkette vom Restaurantdach zum Turm. */
  createFairyLights(x1, y1, x2, y2) {
    const n = 22;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = Phaser.Math.Linear(x1, x2, t);
      const y = Phaser.Math.Linear(y1, y2, t) + Math.sin(t * Math.PI) * 30;   // durchhängende Schnur
      const bulb = this.add.circle(x, y, 3, FINALE_COLORS[i % FINALE_COLORS.length]).setDepth(1);
      this.tweens.add({ targets: bulb, alpha: { from: 1, to: 0.25 }, duration: 400, yoyo: true, repeat: -1, delay: (i % 3) * 400 });
    }
  }

  // ---------------------------------------------------------------------
  // Sven wartet am Aussichtsturm, Jessica & Simon kommen den Weg herauf
  // ---------------------------------------------------------------------
  createCast() {
    const ground = 468;
    // Am Turm warten: Angi, Sven mit Hannah in der Kraxe und Katze Ginny
    this.angi = addPerson(this, 'angi', 345, ground, 2).setDepth(5);
    this.svenGroup = addSvenWithDaughter(this, 410, ground, 2, 5);
    this.sven = this.svenGroup.sven;
    this.ginny = addGinny(this, 455, ground + 4, 2).setDepth(7);
    // Den Weg herauf: Jessica & Simon mit Tante Edith & Onkel Kurt
    this.jessica = this.add.sprite(GAME_WIDTH + 40, ground, 'hiker1', 0).setOrigin(0.5, 1).setScale(2).setFlipX(true).setDepth(5);
    this.simon = this.add.sprite(GAME_WIDTH + 110, ground, 'hiker2', 0).setOrigin(0.5, 1).setScale(2).setFlipX(true).setDepth(5);
    this.edith = addPerson(this, 'edith', GAME_WIDTH + 190, ground, 2).setDepth(4);
    this.kurt = addPerson(this, 'kurt', GAME_WIDTH + 260, ground, 2).setDepth(4);
    this.celebrants = [];
  }

  /** Die Wanderer laufen zum Turm, Sven & Angi winken. Liefert ein Promise. */
  arrive() {
    const wavers = [this.sven, this.angi];
    const wave = this.time.addEvent({
      delay: 280, loop: true,
      callback: () => wavers.forEach(p => p.setFrame(Number(p.frame.name) === 1 ? 0 : 1))
    });
    const walkers = [[this.jessica, 500], [this.simon, 570], [this.edith, 650], [this.kurt, 718]];
    let arrived = 0;
    return new Promise(resolve => {
      walkers.forEach(([p, x], i) => {
        p.play(`${p.texture.key}-walk`);
        this.tweens.add({
          targets: p, x, duration: 2600 + i * 300, delay: 600, ease: 'Linear',
          onComplete: () => {
            p.anims.stop();
            p.setFrame(0);
            if (++arrived === walkers.length) {
              wave.remove();
              wavers.forEach(w => w.setFrame(0));
              this.time.delayedCall(400, resolve);
            }
          }
        });
      });
    });
  }

  /** Nach Svens Gruss: Konfetti, Feuerwerk, Texte, Musik. */
  startCelebration() {
    this.cameras.main.flash(250, 255, 255, 255);
    Sfx.play(this, 'boom');

    // Die ganze Familie hüpft mit Partyhütchen
    const family = [this.angi, this.sven, this.jessica, this.simon, this.edith, this.kurt];
    this.celebrants = family.map((sprite, i) => {
      const isHiker = sprite.texture.key.startsWith('hiker');
      if (isHiker) sprite.setFrame(charFrame(sprite.texture.key, 'jump'));
      const hat = this.add.image(sprite.x, 0, 'partyHat').setScale(1.5).setOrigin(0.5, 1).setDepth(6)
        .setAngle(i % 2 ? 12 : -12);
      this.tweens.add({ targets: sprite, y: sprite.y - 40, duration: 380, yoyo: true, repeat: -1, ease: 'Quad.out', delay: i * 130 });
      const isSven = sprite === this.sven;
      return { sprite, hat, headOffset: isHiker ? 58 : isSven ? 92 : 94, dx: isSven ? -2 : 0 };
    });
    // Ginny macht kleine Freudensprünge
    this.tweens.add({ targets: this.ginny, y: this.ginny.y - 16, duration: 260, yoyo: true, repeat: -1, ease: 'Quad.out', repeatDelay: 400 });
    // Die Tochter wippt fröhlich mit – mit eigenem Mini-Hütchen
    this.svenGroup.setBob(2.2, 2.6).addHat();
    this.time.addEvent({ delay: 300, loop: true, callback: () => [this.sven, this.angi].forEach(p => p.setFrame(Number(p.frame.name) === 1 ? 0 : 1)) });

    this.createTexts();
    this.time.addEvent({ delay: 900, loop: true, callback: () => this.launchRocket() });
    this.time.addEvent({ delay: 1400, loop: true, callback: () => this.releaseBalloon() });
    this.playBirthdaySong();
    this.time.delayedCall(4000, () => {
      this.ready = true;
      this.prompt.setVisible(true);
    });

    // Konfetti-Regen über den ganzen Bildschirm
    this.add.particles(0, -10, 'confetti', {
      x: { min: 0, max: GAME_WIDTH },
      speedY: { min: 60, max: 130 },
      speedX: { min: -40, max: 40 },
      rotate: { start: 0, end: 540 },
      scaleX: { start: 1, end: 0.2, ease: 'Sine.inOut' },   // "Flattern"
      lifespan: 6500,
      frequency: 70,
      quantity: 2,
      tint: FINALE_COLORS
    }).setDepth(30);
  }

  // ---------------------------------------------------------------------
  // Texte: Titel, Namen, Nachricht (Schreibmaschinen-Effekt)
  // ---------------------------------------------------------------------
  createTexts() {
    const cx = GAME_WIDTH / 2;

    this.title = this.add.text(cx, 46, TXT.finaleTitle, {
      fontFamily: FONT, fontSize: '36px', color: '#f7d117', stroke: '#2a1040', strokeThickness: 8
    }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: this.title, scale: 1.08, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // Regenbogen-Farbwechsel
    let hue = 0;
    this.time.addEvent({
      delay: 60, loop: true,
      callback: () => {
        hue = (hue + 0.02) % 1;
        this.title.setColor(this.hsvCss(hue));
      }
    });

    this.add.text(cx, 96, this.greetingLine(), {
      fontFamily: FONT, fontSize: '13px', color: '#ffffff', stroke: '#000000', strokeThickness: 4, align: 'center'
    }).setOrigin(0.5).setDepth(40);

    // Riesige "30" – wandert danach als Plakette nach oben rechts
    const age = this.add.text(640, 250, String(BIRTHDAY.age), {
      fontFamily: FONT, fontSize: '120px', color: '#f7d117', stroke: '#5b2d1a', strokeThickness: 12
    }).setOrigin(0.5).setDepth(41).setScale(0);
    this.tweens.add({ targets: age, scale: 1, duration: 900, ease: 'Back.out', delay: 400 });
    this.tweens.add({
      targets: age, x: 880, y: 150, scale: 0.4, angle: 12, duration: 700, ease: 'Quad.inOut', delay: 3000,
      onComplete: () => this.tweens.add({ targets: age, angle: -12, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
    });

    // Nachricht in einer Tafel
    this.panel = this.add.rectangle(650, 258, 570, 196, 0x10131c, 0.8).setStrokeStyle(3, 0xf7d117).setDepth(39).setAlpha(0);
    this.message = this.add.text(650, 258, '', {
      fontFamily: FONT, fontSize: '10px', color: '#ffffff', align: 'center', lineSpacing: 8
    }).setOrigin(0.5).setDepth(40);
    this.time.delayedCall(3300, () => {
      this.tweens.add({ targets: this.panel, alpha: 1, duration: 400 });
      this.typeMessage(BIRTHDAY.message.join('\n'));
    });

    // Edelweiss-Bilanz aller gespielten Level
    const results = Object.values(this.registry.get('edelweiss') || {});
    if (results.length) {
      const got = results.reduce((s, r) => s + r.collected, 0);
      const all = results.reduce((s, r) => s + r.total, 0);
      this.add.image(cx - 150, 512, 'edelweiss').setScale(1.4).setDepth(40);
      this.add.text(cx - 132, 512, tx(TXT.finaleEdelweiss, { got, all }), {
        fontFamily: FONT, fontSize: '10px', color: '#ffffff', stroke: '#000000', strokeThickness: 4
      }).setOrigin(0, 0.5).setDepth(40);
    }

    this.prompt = this.add.text(GAME_WIDTH - 16, GAME_HEIGHT - 12, TXT.finalePrompt, {
      fontFamily: FONT, fontSize: '9px', color: '#dddddd', stroke: '#000000', strokeThickness: 3
    }).setOrigin(1, 1).setDepth(40).setVisible(false);
  }

  greetingLine() {
    const names = BIRTHDAY.names.map(n => n.trim()).filter(Boolean);
    const who = names.length >= 2 ? `${names[0]} & ${names[1]}`
      : names.length === 1 ? names[0] : TXT.finaleGreetingFallback;
    return tx(TXT.finaleGreeting, { age: BIRTHDAY.age, who });
  }

  hsvCss(h) {
    const c = Phaser.Display.Color.HSVToRGB(h, 0.55, 1);
    return Phaser.Display.Color.RGBToString(c.r, c.g, c.b);
  }

  typeMessage(full) {
    let i = 0;
    this.time.addEvent({
      delay: 38, repeat: full.length - 1,
      callback: () => {
        i++;
        this.message.setText(full.slice(0, i));
        if (i % 3 === 0 && full[i - 1] !== ' ') Sfx.play(this, 'type');
      }
    });
  }

  // ---------------------------------------------------------------------
  // Feuerwerk
  // ---------------------------------------------------------------------
  launchRocket() {
    this.rocketCount++;
    const x = Phaser.Math.Between(380, GAME_WIDTH - 60);
    const targetY = Phaser.Math.Between(60, 170);
    const color = Phaser.Utils.Array.GetRandom(FINALE_COLORS);
    const shape = this.rocketCount % 5 === 0 ? 'thirty' : this.rocketCount % 7 === 0 ? 'swiss' : 'burst';

    const rocket = this.add.image(x, 470, 'spark').setTint(0xffd77a).setDepth(20);
    const trail = this.add.particles(0, 0, 'pixel', {
      follow: rocket, lifespan: 350, speed: { min: 5, max: 25 }, scale: { start: 0.7, end: 0 },
      alpha: { start: 1, end: 0 }, frequency: 25, tint: 0xffd77a
    }).setDepth(19);
    Sfx.play(this, 'rocket');

    this.tweens.add({
      targets: rocket, y: targetY, x: x + Phaser.Math.Between(-30, 30), duration: 900, ease: 'Quad.out',
      onComplete: () => {
        trail.stop();
        this.time.delayedCall(400, () => trail.destroy());
        rocket.destroy();
        Sfx.play(this, 'boom');
        if (shape === 'thirty') this.explodeAsText(rocket.x, rocket.y, color);
        else if (shape === 'swiss') this.explodeAsSwissCross(rocket.x, rocket.y);
        else this.explodeBurst(rocket.x, rocket.y, color);
      }
    });
  }

  explodeBurst(x, y, color) {
    const burst = this.add.particles(x, y, 'spark', {
      speed: { min: 60, max: 230 }, angle: { min: 0, max: 360 }, gravityY: 140,
      lifespan: 1300, alpha: { start: 1, end: 0 }, scale: { start: 1.2, end: 0.2 },
      tint: [color, 0xffffff], emitting: false
    }).setDepth(20);
    burst.explode(50);
    this.time.delayedCall(1500, () => burst.destroy());
  }

  /** Funken fliegen an Zielpunkte → zeichnet Formen in den Himmel. */
  sparksToPoints(x, y, points, color) {
    points.forEach(([px, py], i) => {
      const s = this.add.image(x, y, 'spark').setTint(color).setDepth(20).setScale(1.3);
      this.tweens.add({
        targets: s, x: px, y: py, duration: 500, ease: 'Cubic.out',
        onComplete: () => this.tweens.add({
          targets: s, y: py + 30, alpha: 0, duration: 1400, delay: 500 + (i % 4) * 40, onComplete: () => s.destroy()
        })
      });
    });
    this.explodeBurst(x, y, 0xffffff);
  }

  /** Schreibt die Zahl (z. B. "30") mit Funken in den Himmel. */
  explodeAsText(x, y, color) {
    const digits = String(BIRTHDAY.age).split('');
    const cell = 12, gap = 16;
    const width = digits.length * 3 * cell + (digits.length - 1) * gap;
    const cxStart = Phaser.Math.Clamp(x, width / 2 + 20, GAME_WIDTH - width / 2 - 20) - width / 2;
    const points = [];
    digits.forEach((d, di) => {
      (SKY_DIGITS[d] || SKY_DIGITS[0]).forEach((row, ry) => {
        [...row].forEach((on, rx) => {
          if (on === '1') points.push([cxStart + di * (3 * cell + gap) + rx * cell, y - 24 + ry * cell]);
        });
      });
    });
    this.sparksToPoints(x, y, points, color);
  }

  explodeAsSwissCross(x, y) {
    const points = [];
    for (let i = -2; i <= 2; i++) {
      points.push([x + i * 12, y]);
      if (i !== 0) points.push([x, y + i * 12]);
    }
    this.sparksToPoints(x, y, points, 0xff3b30);
  }

  releaseBalloon() {
    const b = this.add.image(Phaser.Math.Between(20, GAME_WIDTH - 20), GAME_HEIGHT + 60, 'balloon')
      .setTint(Phaser.Utils.Array.GetRandom(FINALE_COLORS)).setDepth(25);
    this.tweens.add({ targets: b, y: -80, duration: Phaser.Math.Between(7000, 10000), onComplete: () => b.destroy() });
    this.tweens.add({ targets: b, x: b.x + Phaser.Math.Between(-40, 40), angle: { from: -8, to: 8 },
      duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  playBirthdaySong() {
    this.song = Sfx.melody(this, Sfx.songs.happyBirthday, 0.6);
    this.time.delayedCall((this.song.duration + 3) * 1000, () => { if (!this.leaving) this.playBirthdaySong(); });
  }

  // ---------------------------------------------------------------------
  update() {
    this.inputs.forEach(i => i.update());
    this.dialog.update(this.inputs);
    // Hütchen sitzen auf den hüpfenden Köpfen
    this.celebrants.forEach(({ sprite, hat, headOffset, dx }) =>
      hat.setPosition(sprite.x + dx + (sprite.flipX ? -2 : 2), sprite.y - headOffset));
    this.svenGroup.update(this.time.now);

    if (this.ready && this.inputs.some(i => i.justPressed('jump') || i.justPressed('start'))) this.leave();
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    if (this.song) this.song.stop();   // bereits eingeplante Töne verstummen lassen
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('CreditsScene'));
  }
}
