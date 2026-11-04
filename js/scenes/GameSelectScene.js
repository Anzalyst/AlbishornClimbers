/* =====================================================================
 * GameSelectScene – Hauptmenü der KES-Konsole: Spielauswahl
 *
 *   ALBISHORN CLIMBERS     → Titelmenü des Jump'n'Runs (MenuScene)
 *   SUPER SEMPACH PARTY    → Menü der Minispiel-Party (SspMenuScene)
 *   BILDERGALLERIE         → Familienbilder mit Sprüchen (GalleryScene)
 * Bedienung: Links/Rechts wählt das Spiel, Runter die Bildergalerie, Hoch
 * zurück zu den Spielen; A / START / ENTER bestätigen, M = Ton an/aus.
 * Geheim: Hoch, Hoch, Runter, Runter, Links, Rechts, A, B (CHEATS.konami;
 * Tastatur: A = Leertaste/Enter, B = Taste B) → direkt in den Abspann.
 * Aus jedem Spiel führt die Pause → "HAUPTMENÜ" hierher.
 * Grafiken (Landschaft, Kartenbilder, Icons): js/menuArt.js.
 * ===================================================================== */

class GameSelectScene extends Phaser.Scene {
  constructor() {
    super('GameSelectScene');
  }

  init(data) {
    this.selected = (data && data.selected) || 0;   // 0/1 = Spiele, 2 = Bildergalerie
    this.lastCard = this.selected === 1 ? 1 : 0;
  }

  create() {
    this.inputs = createPlayerInputs(this);
    this.leaving = false;
    this.cameras.main.fadeIn(300, 0, 0, 0);
    const cx = GAME_WIDTH / 2;

    // Landschaft (menuArt.js, logisch halbe Grösse → 2×) und ziehende Wolken
    this.add.image(0, 0, 'menuBackdrop').setOrigin(0).setScale(2).setDepth(-100);
    this.clouds = [[60, 30, 0, 0.12], [330, 62, 1, 0.08], [610, 22, 2, 0.1], [860, 70, 0, 0.06], [470, 112, 2, 0.05]]
      .map(([x, y, k, speed]) => Object.assign(this.add.image(x, y, `menuCloud${k}`).setScale(2).setDepth(-90), { speed }));

    this.createTitle(cx);

    this.cards = [
      { title: 'ALBISHORN\nCLIMBERS', sub: 'Koop-Jump\'n\'Run', scene: 'MenuScene', art: 'cardAlbis', draw: c => this.drawAlbisIcon(c) },
      { title: 'SUPER SEMPACH\nPARTY', sub: '5 Camping-Minispiele', scene: 'SspMenuScene', art: 'cardSsp', draw: c => this.drawSspIcon(c) }
    ].map((card, i) => {
      const c = this.add.container(cx + (i ? 210 : -210), 266);
      const frame = Comic.panel(this, 0, 0, 364, 292);
      const pic = this.add.image(0, 4, card.art).setScale(2);
      const picFrame = this.add.rectangle(0, 4, 320, 150).setStrokeStyle(3, 0x17121f);
      c.add([frame, pic, picFrame]);
      card.draw(c);
      c.add(this.add.text(0, -114, card.title, {
        fontFamily: FONT, fontSize: '16px', color: '#ffffff', align: 'center', stroke: '#000000', strokeThickness: 5, lineSpacing: 6
      }).setOrigin(0.5));
      c.add(this.add.text(0, 118, card.sub, { fontFamily: FONT, fontSize: '9px', color: '#dfe6f5' }).setOrigin(0.5));
      return Object.assign(card, { container: c, frame });
    });

    // Dritter Menüpunkt unter den Karten: Bildergalerie – Ginny sitzt daneben und schaut zu
    this.gallery = this.add.container(cx, 462);
    this.galleryFrame = Comic.panel(this, 0, 0, 300, 40);
    this.gallery.add([this.galleryFrame,
      this.add.text(0, 1, TXT.galleryMenu, { fontFamily: FONT, fontSize: '12px', color: '#f7d117', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5)]);
    this.ginny = addGinny(this, cx + 186, 484, 2).setFlipX(true);
    this.time.addEvent({ delay: 2600, loop: true, callback: () => this.ginnyIdle() });

    this.createFooter(cx);

    this.enterPressed = false;
    this.input.keyboard.on('keydown-ENTER', () => { this.enterPressed = true; });
    this.konami = 0;              // wie weit der Geheim-Code schon eingegeben ist
    this.bPressed = false;
    this.input.keyboard.on('keydown-B', () => { this.bPressed = true; });
    this.input.keyboard.on('keydown-M', () => Sfx.toggleMute());
    this.refresh();
  }

  /** "KES – SPIELAUSWAHL" als Comic-Titel: Tiefe, Verlauf, dicke Tusche-Kontur. */
  createTitle(cx) {
    const label = `${CONSOLE.name} – SPIELAUSWAHL`;
    const style = extra => Object.assign({ fontFamily: FONT, fontSize: '30px', align: 'center' }, extra);
    for (let d = 7; d >= 1; d--) {                      // Extrusion nach unten
      this.add.text(cx, 46 + d, label, style({ color: '#17121f', stroke: '#17121f', strokeThickness: 10 }))
        .setOrigin(0.5);
    }
    const title = this.add.text(cx, 46, label, style({ color: '#f7d117', stroke: '#17121f', strokeThickness: 8 })).setOrigin(0.5);
    const grad = title.context.createLinearGradient(0, 0, 0, title.height);
    [[0.2, '#fff6a8'], [0.5, '#f7d117'], [0.85, '#f0961a']].forEach(([at, c]) => grad.addColorStop(at, c));
    title.setFill(grad);
    // Glanzpunkt, der über den Schriftzug wandert
    this.titleShine = this.add.image(cx - title.width / 2, 34, 'menuSparkle').setScale(2).setAlpha(0);
    this.tweens.add({
      targets: this.titleShine, x: cx + title.width / 2, duration: 1400, delay: 600, repeat: -1, repeatDelay: 3200,
      onStart: () => this.titleShine.setAlpha(1), onRepeat: () => this.titleShine.setAlpha(1)
    });
    this.tweens.add({ targets: this.titleShine, alpha: 0, duration: 400, delay: 1600, repeat: -1, repeatDelay: 4200 });
  }

  /** Untere Leiste: Controller als kleine Gamepads, Ton-Status mit Lautsprecher-Symbol. */
  createFooter(cx) {
    const style = { fontFamily: FONT, fontSize: '9px', color: '#ffffff', stroke: '#17121f', strokeThickness: 4 };
    const y = GAME_HEIGHT - 16;
    this.padIcons = [0, 1].map(i => {
      const x = cx - 230 + i * 240;
      this.add.text(x, y, `Controller ${i + 1}:`, style).setOrigin(0, 0.5);
      return this.add.image(x + 150, y, `padIcon${i + 1}`).setScale(2);
    });
    this.soundText = this.add.text(GAME_WIDTH - 16, y, '', style).setOrigin(1, 0.5);
    this.speaker = this.add.image(0, y, 'speakerOn').setScale(2);
  }

  /** Ginny schaut mal zur Galerie, mal ins Publikum – und hüpft ab und zu. */
  ginnyIdle() {
    if (!this.ginny.active) return;
    this.ginny.setFlipX(!this.ginny.flipX);
    if (Math.random() < 0.4) this.tweens.add({ targets: this.ginny, y: this.ginny.y - 8, duration: 160, yoyo: true, ease: 'Quad.out' });
  }

  /**
   * Geheim-Code (CHEATS.konami) mitverfolgen. Gibt true zurück, wenn ein
   * A-Druck zum Code gehört hat (dann startet er kein Spiel).
   */
  feedKonami(any, a, b) {
    const token = ['up', 'down', 'left', 'right'].find(d => any(d)) || (a ? 'a' : b ? 'b' : null);
    if (!token) return false;
    const seq = CHEATS.konami;
    if (token === seq[this.konami]) this.konami++;
    else this.konami = token === seq[0] ? 1 : 0;
    if (this.konami === seq.length) {
      this.konami = 0;
      this.leaving = true;
      Sfx.play(this, 'win');
      this.cheatText = this.add.text(GAME_WIDTH / 2, 100, TXT.konamiCredits, {
        fontFamily: FONT, fontSize: '12px', color: '#ff7ad9', stroke: '#000000', strokeThickness: 4
      }).setOrigin(0.5);
      this.time.delayedCall(700, () => {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('CreditsScene'));
      });
    }
    return token === 'a' && this.konami === seq.indexOf('a') + 1;
  }

  /** Kartenbild Albishorn: Jessica & Simon hüpfen abwechselnd startbereit vor den Bergen. */
  drawAlbisIcon(c) {
    [['hiker1', -112, 0], ['hiker2', -62, 650]].forEach(([key, x, delay]) => {
      const s = this.add.sprite(x, 78, key, 0).setOrigin(0.5, 1).setScale(2);
      c.add(s);
      this.time.addEvent({
        delay: 1300, startAt: 1300 - delay, loop: true, callback: () => {
          s.setFrame(charFrame(key, 'jump'));
          this.tweens.add({ targets: s, y: 64, duration: 220, yoyo: true, ease: 'Quad.out', onComplete: () => s.setFrame(0) });
        }
      });
    });
  }

  /** Kartenbild Sempach: Lagerfeuer mit Funken, schaukelndes Pedalo, Ente, glitzernder Pokal. */
  drawSspIcon(c) {
    const flame = this.add.sprite(-16, 56, 'menuFlame', 0).setOrigin(0.5, 1).setScale(2);
    flame.play('menuFlame');
    const glow = this.add.circle(-16, 52, 16, 0xff9a3a, 0.18);
    this.tweens.add({ targets: glow, alpha: 0.08, scale: 1.2, duration: 380, yoyo: true, repeat: -1 });
    const pedalo = this.add.image(40, 2, 'ssp_pedalo').setScale(0.9);
    const duck = this.add.image(-24, 16, 'ssp_duck');
    this.tweens.add({ targets: pedalo, y: 5, angle: 2, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: duck, y: 19, x: -18, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const trophy = this.add.image(122, 42, 'ssp_trophy').setOrigin(0.5, 1).setScale(0.8);
    c.add([glow, flame, pedalo, duck, trophy]);
    // Funken über dem Feuer
    this.time.addEvent({
      delay: 260, loop: true, callback: () => {
        const e = this.add.image(-16 + Phaser.Math.Between(-6, 6), 40, 'pixel').setScale(0.5).setTint(0xffb040);
        c.add(e);
        this.tweens.add({ targets: e, y: 10, x: e.x + Phaser.Math.Between(-8, 8), alpha: 0, duration: 900, onComplete: () => e.destroy() });
      }
    });
    // Glitzer auf dem Pokal
    const sparkles = [0, 1, 2].map(() => this.add.image(0, 0, 'menuSparkle').setAlpha(0));
    c.add(sparkles);
    sparkles.forEach((sp, i) => this.time.addEvent({
      delay: 700, startAt: i * 230, loop: true, callback: () => {
        sp.setPosition(122 + Phaser.Math.Between(-18, 18), Phaser.Math.Between(-6, 22)).setScale(0.5).setAlpha(1);
        this.tweens.add({ targets: sp, scale: 1.4, alpha: 0, duration: 520 });
      }
    }));
  }

  refresh() {
    this.cards.forEach((card, i) => {
      const on = i === this.selected;
      card.frame.setSelected(on);
      this.tweens.killTweensOf(card.container);
      this.tweens.add({ targets: card.container, scale: on ? 1.05 : 0.95, duration: 150 });
    });
    const on = this.selected === 2;
    this.galleryFrame.setSelected(on);
    this.tweens.killTweensOf(this.gallery);
    this.tweens.add({ targets: this.gallery, scale: on ? 1.05 : 0.95, duration: 150 });
  }

  /** Auswahl bewegen: Links/Rechts zwischen den Spielen, Runter/Hoch zur Galerie und zurück. */
  move(any) {
    let next = this.selected;
    if (this.selected === 2) {
      if (any('up')) next = this.lastCard;
    } else if (any('left') || any('right')) next = 1 - this.selected;
    else if (any('down')) next = 2;
    if (next === this.selected) return;
    this.selected = next;
    if (next < 2) this.lastCard = next;
    Sfx.play(this, 'select');
    this.refresh();
  }

  update(time, delta) {
    this.inputs.forEach(i => i.update());
    this.clouds.forEach(cl => {
      cl.x -= cl.speed * delta / 16;
      if (cl.x < -90) cl.x = GAME_WIDTH + 90;
    });
    // Verbundener Controller: Icon leuchtet; Ton: Lautsprecher mit Wellen bzw. rotem X
    this.padIcons.forEach((icon, i) => icon.setAlpha(this.inputs[i].hasPad ? 1 : 0.4));
    this.soundText.setText(Sfx.muted ? TXT.soundIsOff : TXT.soundOffHint);
    this.speaker.setTexture(Sfx.muted ? 'speakerOff' : 'speakerOn').setX(this.soundText.x - this.soundText.width - 18);
    if (this.leaving) return;

    const any = a => this.inputs.some(i => i.justPressed(a));
    const enter = this.enterPressed, b = this.bPressed;
    this.enterPressed = this.bPressed = false;
    // Geheim-Code: ein gedrücktes A, das zum Code gehört, startet kein Spiel
    const aForCode = this.feedKonami(any, enter || any('jump'), b || any('back'));
    if (this.leaving) return;
    this.move(any);
    if (!aForCode && (enter || any('jump') || any('start'))) {
      this.leaving = true;
      Sfx.play(this, 'select');
      const target = this.selected === 2 ? 'GalleryScene' : this.cards[this.selected].scene;
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(target));
    }
  }
}
