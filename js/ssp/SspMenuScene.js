/* =====================================================================
 * SspMenuScene – Titel & Menü der Super Sempach Party
 *
 *   PARTY: ALLE 5 SPIELE   → alle Minispiele nacheinander, dann Siegerehrung
 *   MINISPIEL WÄHLEN       → ein Spiel frei wählen, danach Siegerehrung
 *   HAUPTMENÜ              → zurück zur Spielauswahl
 * Bedienung: Hoch/Runter wählen, A / START bestätigen, B / ESC zurück.
 * ===================================================================== */

class SspMenuScene extends Phaser.Scene {
  constructor() {
    super('SspMenuScene');
  }

  create() {
    this.inputs = createPlayerInputs(this);
    this.mode = 'main';          // 'main' | 'pick'
    this.selected = 0;
    this.leaving = false;
    this.cameras.main.fadeIn(300, 0, 0, 0);
    const cx = GAME_WIDTH / 2;

    // See-Kulisse
    const g = this.add.graphics();
    g.fillGradientStyle(0x8fd0f4, 0x8fd0f4, 0xf2f9ff, 0xf2f9ff, 1).fillRect(0, 0, GAME_WIDTH, 260);
    Comic.addHalftoneSky(this, 0, 0, 260);
    this.add.tileSprite(0, 110, GAME_WIDTH, 260, 'mountainsFar').setOrigin(0).setScale(1, 0.6);
    this.add.tileSprite(0, 260, GAME_WIDTH, GAME_HEIGHT - 260, 'ssp_lake').setOrigin(0);
    const shore = this.add.graphics();
    [[0, 170], [790, 170]].forEach(([x, w]) => {
      shore.fillStyle(0x5aa046).fillRoundedRect(x - 8, 290, w + 16, 16, 7);
      shore.lineStyle(2.5, 0x17121f).strokeRoundedRect(x - 8, 290, w + 16, 16, 7);
    });
    this.add.image(90, 300, 'ssp_tent').setOrigin(0.5, 1);
    this.add.image(870, 300, 'ssp_tent').setOrigin(0.5, 1).setFlipX(true);

    const title = this.add.text(cx, 64, 'SUPER SEMPACH\nPARTY', {
      fontFamily: FONT, fontSize: '36px', color: '#f7d117', align: 'center', stroke: '#17121f', strokeThickness: 9, lineSpacing: 8
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, y: 70, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.add.text(cx, 134, SSP.subtitle, { fontFamily: FONT, fontSize: '10px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5);

    // Jessica VS Simon
    [1, 2].forEach(id => {
      const p = sspPlayer(id), x = id === 1 ? 150 : GAME_WIDTH - 150;
      this.add.sprite(x, 470, p.texture, 0).setScale(3).setOrigin(0.5, 1).setFlipX(id === 2).play(`${p.texture}-walk`);
      this.add.text(x, 490, p.upper, { fontFamily: FONT, fontSize: '12px', color: p.css, stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5, 0);
    });
    this.add.text(cx, 500, 'VS', { fontFamily: FONT, fontSize: '20px', color: '#ffffff', stroke: '#000000', strokeThickness: 5 }).setOrigin(0.5).setAlpha(0.8);

    this.panel = Comic.panel(this, cx, 300, 460, 220);
    this.itemTexts = [];
    this.arrow = this.add.text(0, 0, '▶', { fontFamily: FONT, fontSize: '14px', color: '#f7d117' }).setOrigin(0.5);
    this.descText = this.add.text(cx, 425, '', {
      fontFamily: FONT, fontSize: '8px', color: '#ffffff', align: 'center', wordWrap: { width: 520 }, lineSpacing: 5, stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5, 0);
    this.add.text(cx, GAME_HEIGHT - 10, 'A = OK   B = ZURÜCK', { fontFamily: FONT, fontSize: '8px', color: '#dddddd', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5, 1);

    this.input.keyboard.on('keydown-ESC', () => this.back());
    this.input.keyboard.on('keydown-M', () => Sfx.toggleMute());
    this.buildItems();
  }

  items() {
    if (this.mode === 'main') {
      return [
        { label: 'PARTY: ALLE 5 SPIELE', desc: 'Alle fünf Minispiele nacheinander – wer die meisten gewinnt, holt den Pokal!', run: () => this.go(() => SspParty.startParty(this)) },
        { label: 'MINISPIEL WÄHLEN', desc: 'Ein einzelnes Minispiel frei auswählen.', run: () => { this.mode = 'pick'; this.selected = 0; this.buildItems(); } },
        { label: 'HAUPTMENÜ', desc: 'Zurück zur Spielauswahl.', run: () => this.go(() => SspParty.fadeTo(this, 'GameSelectScene')) }
      ];
    }
    return SSP.minigames.map(m => ({ label: m.name, desc: m.desc, run: () => this.go(() => SspParty.startSingle(this, m.key)) }))
      .concat([{ label: 'ZURÜCK', desc: '', run: () => this.back() }]);
  }

  buildItems() {
    this.itemTexts.forEach(t => t.destroy());
    const list = this.items();
    const step = this.mode === 'main' ? 44 : 30;
    const y0 = 300 - (list.length - 1) * step / 2;
    this.itemTexts = list.map((it, i) => this.add.text(GAME_WIDTH / 2, y0 + i * step, it.label, {
      fontFamily: FONT, fontSize: this.mode === 'main' ? '14px' : '12px', color: '#ffffff', stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5));
    this.refresh();
  }

  refresh() {
    const list = this.items();
    this.itemTexts.forEach((t, i) => t.setColor(i === this.selected ? '#f7d117' : '#ffffff'));
    const sel = this.itemTexts[this.selected];
    this.arrow.setPosition(sel.x - sel.width / 2 - 22, sel.y);
    this.descText.setText(list[this.selected].desc);
  }

  update() {
    this.inputs.forEach(i => i.update());
    if (this.leaving) return;
    const any = a => this.inputs.some(i => i.justPressed(a));
    const n = this.itemTexts.length;
    if (any('up') || any('down')) {
      this.selected = (this.selected + (any('down') ? 1 : n - 1)) % n;
      Sfx.play(this, 'select');
      this.refresh();
    }
    if (any('jump') || any('start')) { Sfx.play(this, 'select'); this.items()[this.selected].run(); }
    else if (any('back')) this.back();
  }

  back() {
    if (this.leaving) return;
    if (this.mode === 'pick') { this.mode = 'main'; this.selected = 1; this.buildItems(); }
    else this.go(() => SspParty.fadeTo(this, 'GameSelectScene'));
  }

  go(fn) {
    if (this.leaving) return;
    this.leaving = true;
    fn();
  }
}
