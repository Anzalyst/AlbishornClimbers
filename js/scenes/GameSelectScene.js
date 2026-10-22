/* =====================================================================
 * GameSelectScene – Hauptmenü der KES-Konsole: Spielauswahl
 *
 *   ALBISHORN CLIMBERS     → Titelmenü des Jump'n'Runs (MenuScene)
 *   SUPER SEMPACH PARTY    → Menü der Minispiel-Party (SspMenuScene)
 *   BILDERGALLERIE         → Familienbilder mit Sprüchen (GalleryScene)
 * Bedienung: Links/Rechts wählt das Spiel, Runter die Bildergalerie, Hoch
 * zurück zu den Spielen; A / START / ENTER bestätigen, M = Ton an/aus.
 * Aus jedem Spiel führt die Pause → "HAUPTMENÜ" hierher.
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
    this.backdrop = addBackdrop(this, [0x2a3a6a, 0x8ccbf0]);
    this.leaving = false;
    this.cameras.main.fadeIn(300, 0, 0, 0);
    const cx = GAME_WIDTH / 2;

    this.add.text(cx, 50, `${CONSOLE.name} – SPIELAUSWAHL`, { fontFamily: FONT, fontSize: '20px', color: '#f7d117', stroke: '#000000', strokeThickness: 6 }).setOrigin(0.5);

    this.cards = [
      { title: 'ALBISHORN\nCLIMBERS', sub: 'Koop-Jump\'n\'Run', scene: 'MenuScene', draw: (c, g) => this.drawAlbisIcon(c, g) },
      { title: 'SUPER SEMPACH\nPARTY', sub: '5 Camping-Minispiele', scene: 'SspMenuScene', draw: (c, g) => this.drawSspIcon(c, g) }
    ].map((card, i) => {
      const x = cx + (i ? 200 : -200), y = 270;
      const c = this.add.container(x, y);
      const frame = this.add.rectangle(0, 0, 340, 300, 0x10131c, 0.9);
      const g = this.add.graphics();
      c.add([frame, g]);
      card.draw(c, g);
      c.add(this.add.text(0, 70, card.title, { fontFamily: FONT, fontSize: '16px', color: '#ffffff', align: 'center', stroke: '#000000', strokeThickness: 5, lineSpacing: 6 }).setOrigin(0.5));
      c.add(this.add.text(0, 120, card.sub, { fontFamily: FONT, fontSize: '9px', color: '#aab4cc' }).setOrigin(0.5));
      return Object.assign(card, { container: c, frame });
    });

    // Dritter Menüpunkt unter den Karten: Bildergalerie
    this.gallery = this.add.container(cx, 468);
    this.galleryFrame = this.add.rectangle(0, 0, 340, 40, 0x10131c, 0.9);
    this.gallery.add([this.galleryFrame,
      this.add.text(0, 1, TXT.galleryMenu, { fontFamily: FONT, fontSize: '12px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5)]);

    this.enterPressed = false;
    this.input.keyboard.on('keydown-ENTER', () => { this.enterPressed = true; });
    this.footer = this.add.text(cx, GAME_HEIGHT - 20, '', { fontFamily: FONT, fontSize: '9px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5);
    this.input.keyboard.on('keydown-M', () => Sfx.toggleMute());
    this.refresh();
  }

  /** Mini-Bild: Berg mit Schweizerfahne und den beiden Wanderern. */
  drawAlbisIcon(c, g) {
    g.fillStyle(0x8ccbf0).fillRect(-150, -130, 300, 160);
    g.fillStyle(0x6f8db8).fillTriangle(-150, 30, -40, -100, 70, 30);
    g.fillStyle(0x8aa4c8).fillTriangle(-20, 30, 70, -115, 150, 30);
    g.fillStyle(0xffffff).fillTriangle(70, -115, 52, -86, 88, -86);
    g.fillStyle(0x5aa046).fillRect(-150, 10, 300, 20);
    c.add(this.add.image(70, -112, 'flag_on').setOrigin(7 / 32, 1).setScale(0.6));
    c.add(this.add.sprite(-40, 12, 'hiker1', 0).setOrigin(0.5, 1).setScale(2));
    c.add(this.add.sprite(0, 12, 'hiker2', 0).setOrigin(0.5, 1).setScale(2));
  }

  /** Mini-Bild: Zelt am See, Pokal und Pedalo. */
  drawSspIcon(c, g) {
    g.fillStyle(0x9fd8f4).fillRect(-150, -130, 300, 90);
    g.fillStyle(0x2ab0c8).fillRect(-150, -40, 300, 70);
    g.fillStyle(0x5aa046).fillRect(-150, 10, 300, 20);
    c.add(this.add.image(-90, 12, 'ssp_tent').setOrigin(0.5, 1).setScale(0.8));
    c.add(this.add.image(30, -14, 'ssp_pedalo').setOrigin(0.5, 1));
    c.add(this.add.image(100, -70, 'ssp_trophy').setScale(0.9));
    c.add(this.add.image(-10, 0, 'ssp_duck').setOrigin(0.5, 1));
  }

  refresh() {
    this.cards.forEach((card, i) => {
      const on = i === this.selected;
      card.frame.setStrokeStyle(on ? 5 : 2, on ? 0xf7d117 : 0x5a6480);
      this.tweens.killTweensOf(card.container);
      this.tweens.add({ targets: card.container, scale: on ? 1.05 : 0.95, duration: 150 });
    });
    const on = this.selected === 2;
    this.galleryFrame.setStrokeStyle(on ? 4 : 2, on ? 0xf7d117 : 0x5a6480);
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
    this.backdrop.update(this.cameras.main, GAME_HEIGHT, delta);
    const pads = this.inputs.map((inp, i) => `Controller ${i + 1}: ${inp.hasPad ? 'OK' : '–'}`);
    this.footer.setText(`${pads.join('     ')}     ${Sfx.muted ? 'TON AUS (M)' : 'M = TON AUS'}`);
    if (this.leaving) return;

    const any = a => this.inputs.some(i => i.justPressed(a));
    this.move(any);
    const enter = this.enterPressed;
    this.enterPressed = false;
    if (enter || any('jump') || any('start')) {
      this.leaving = true;
      Sfx.play(this, 'select');
      const target = this.selected === 2 ? 'GalleryScene' : this.cards[this.selected].scene;
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(target));
    }
  }
}
