/* =====================================================================
 * SspScoreScene – Zwischenstand im Party-Modus
 *
 * Zeigt nach jedem Minispiel, wer welches Spiel gewonnen hat, die Sterne
 * (= gewonnene Spiele) und das nächste Minispiel.
 * A / START = weiter, B / ESC = SSP-Menü (Party abbrechen).
 * ===================================================================== */

class SspScoreScene extends Phaser.Scene {
  constructor() {
    super('SspScoreScene');
  }

  create() {
    this.inputs = createPlayerInputs(this);
    this.leaving = false;
    this.ready = false;
    this.cameras.main.fadeIn(300, 0, 0, 0);
    const cx = GAME_WIDTH / 2, s = SspParty.state;

    const g = this.add.graphics();
    g.fillGradientStyle(0x14506c, 0x14506c, 0x0b1020, 0x0b1020, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.add.text(cx, 40, 'ZWISCHENSTAND', { fontFamily: FONT, fontSize: '24px', color: '#f7d117', stroke: '#000000', strokeThickness: 6 }).setOrigin(0.5);

    // Sterne pro Spieler
    [1, 2].forEach(id => {
      const p = sspPlayer(id), x = id === 1 ? 170 : GAME_WIDTH - 170;
      this.add.sprite(x, 250, p.texture, charFrame(p.texture, s.wins[id] >= s.wins[3 - id] ? 'jump' : 'idle')).setScale(3).setOrigin(0.5, 1).setFlipX(id === 2);
      this.add.text(x, 262, p.upper, { fontFamily: FONT, fontSize: '12px', color: p.css, stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5, 0);
      for (let i = 0; i < s.wins[id]; i++) {
        const star = this.add.image(x - (s.wins[id] - 1) * 12 + i * 24, 300, 'ssp_star').setScale(1.3);
        this.tweens.add({ targets: star, scale: 1.6, duration: 500, yoyo: true, repeat: -1, delay: i * 100 });
      }
      this.add.text(x, 330, `${s.wins[id]} ${s.wins[id] === 1 ? 'SIEG' : 'SIEGE'}`, { fontFamily: FONT, fontSize: '10px', color: '#ffffff' }).setOrigin(0.5, 0);
    });

    // Gespielte Minispiele
    s.results.forEach((r, i) => {
      const m = SSP.byKey(r.key), y = 100 + i * 28;
      const w = r.winner ? sspPlayer(r.winner) : null;
      this.add.text(cx - 10, y, m.name, { fontFamily: FONT, fontSize: '9px', color: '#ffffff' }).setOrigin(1, 0.5);
      this.add.text(cx + 10, y, w ? w.upper : 'UNENTSCHIEDEN', { fontFamily: FONT, fontSize: '9px', color: w ? w.css : '#aab4cc' }).setOrigin(0, 0.5);
    });

    const next = SSP.byKey(SspParty.nextKey());
    this.add.text(cx, 400, `SPIEL ${s.index + 1} VON ${s.order.length}`, { fontFamily: FONT, fontSize: '10px', color: '#aab4cc' }).setOrigin(0.5);
    this.add.text(cx, 430, next.name, { fontFamily: FONT, fontSize: '20px', color: '#7dd8ff', stroke: '#000000', strokeThickness: 5 }).setOrigin(0.5);
    this.prompt = this.add.text(cx, GAME_HEIGHT - 30, 'A = WEITER   B = SSP-MENÜ', { fontFamily: FONT, fontSize: '10px', color: '#dddddd' }).setOrigin(0.5).setVisible(false);
    this.time.delayedCall(800, () => { this.ready = true; this.prompt.setVisible(true); });

    this.input.keyboard.on('keydown-ESC', () => this.leave('SspMenuScene'));
  }

  update() {
    this.inputs.forEach(i => i.update());
    if (!this.ready || this.leaving) return;
    if (this.inputs.some(i => i.justPressed('jump') || i.justPressed('start'))) this.leave(SspParty.nextKey());
    else if (this.inputs.some(i => i.justPressed('back'))) this.leave('SspMenuScene');
  }

  leave(key) {
    if (this.leaving) return;
    this.leaving = true;
    Sfx.play(this, 'select');
    SspParty.fadeTo(this, key);
  }
}
