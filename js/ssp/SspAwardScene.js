/* =====================================================================
 * SspAwardScene – Siegerehrung mit Podest, Pokal und Konfetti
 *
 * Nach der Party (alle 5 Spiele) bzw. nach einem einzeln gewählten
 * Minispiel. Gleichstand → beide stehen oben, der Pokal steht dazwischen.
 * A / START / B / ESC = zurück ins SSP-Menü.
 * ===================================================================== */

class SspAwardScene extends Phaser.Scene {
  constructor() {
    super('SspAwardScene');
  }

  create() {
    this.inputs = createPlayerInputs(this);
    this.ready = false;
    this.leaving = false;
    this.cameras.main.fadeIn(400, 0, 0, 0);
    const cx = GAME_WIDTH / 2;
    const s = SspParty.state || { mode: 'single', wins: { 1: 0, 2: 0 }, results: [] };
    const champ = SspParty.champion();
    this.champion = champ;

    // Abendhimmel über dem See, Lichterkette
    const g = this.add.graphics();
    g.fillGradientStyle(0x1a2350, 0x1a2350, 0xf5a96b, 0xf5a96b, 1).fillRect(0, 0, GAME_WIDTH, 380);
    this.add.tileSprite(0, 380, GAME_WIDTH, GAME_HEIGHT - 380, 'ssp_lake').setOrigin(0).setTint(0x6a7a9a);
    Comic.addHalftoneSky(this, 0, 0, 380);
    const podiums = this.add.graphics();
    for (let i = 0; i < 24; i++) {
      const x = 20 + i * 40, y = 30 + Math.sin(i / 23 * Math.PI) * 30;
      const bulb = this.add.circle(x, y, 4.5, [0xff5a6e, 0xf7d117, 0x7dff9a, 0x5aa2ff][i % 4]).setStrokeStyle(1.5, 0x17121f);
      this.tweens.add({ targets: bulb, alpha: 0.3, duration: 500 + (i % 3) * 200, yoyo: true, repeat: -1, delay: i * 60 });
    }

    this.add.text(cx, 82, 'SIEGEREHRUNG', { fontFamily: FONT, fontSize: '28px', color: '#f7d117', stroke: '#000000', strokeThickness: 7 }).setOrigin(0.5);
    const subject = s.mode === 'party' ? 'DIE SUPER SEMPACH PARTY' : (SSP.byKey(s.order[0]) || { name: '' }).name;
    const headline = champ ? `${sspPlayer(champ).upper} GEWINNT\n${subject}!` : `UNENTSCHIEDEN –\nZWEI SIEGER BEI ${subject}!`;
    this.add.text(cx, 132, headline, {
      fontFamily: FONT, fontSize: '13px', color: champ ? sspPlayer(champ).css : '#ffffff', align: 'center', stroke: '#000000', strokeThickness: 5, lineSpacing: 8
    }).setOrigin(0.5);

    // Podest: 1. Platz in der Mitte, 2. Platz links (bei Gleichstand beide gleich hoch)
    const podium = (x, h, place) => {
      podiums.fillStyle(0xe4e8f0).fillRect(x - 70, 470 - h, 140, h).fillStyle(0xb0b6c0).fillRect(x, 470 - h, 70, h);
      podiums.lineStyle(3.5, 0x17121f).strokeRect(x - 70, 470 - h, 140, h);
      this.add.text(x, 470 - h / 2, String(place), { fontFamily: FONT, fontSize: '28px', color: '#5a606c' }).setOrigin(0.5);
    };
    let spots;
    if (champ) {
      podium(cx, 130, 1); podium(cx - 150, 80, 2);
      spots = [{ id: champ, x: cx, y: 340, winner: true }, { id: 3 - champ, x: cx - 150, y: 390, winner: false }];
    } else {
      podium(cx - 90, 130, 1); podium(cx + 90, 130, 1);
      spots = [{ id: 1, x: cx - 90, y: 340, winner: true }, { id: 2, x: cx + 90, y: 340, winner: true }];
    }
    spots.forEach(({ id, x, y, winner }) => {
      const p = sspPlayer(id);
      const fig = this.add.sprite(x, y, p.texture, charFrame(p.texture, winner ? 'jump' : 'idle')).setOrigin(0.5, 1).setScale(3).setFlipX(id === 2);
      if (winner) this.tweens.add({ targets: fig, y: y - 18, duration: 320, yoyo: true, repeat: -1, ease: 'Quad.out', delay: id * 150 });
      this.add.text(x, 478, p.upper, { fontFamily: FONT, fontSize: '11px', color: p.css, stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5, 0);
    });

    // Pokal: steht neben dem Sieger auf dem Podest (bei Gleichstand zwischen beiden), mit Glanz
    const trophy = champ
      ? this.add.image(cx + 46, 340, 'ssp_trophy').setOrigin(0.5, 1).setScale(1.2)
      : this.add.image(cx, 250, 'ssp_trophy').setScale(1.6);
    this.tweens.add({ targets: trophy, angle: { from: -6, to: 6 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.time.addEvent({
      delay: 400, loop: true, callback: () => {
        const sp = this.add.image(trophy.x + Phaser.Math.Between(-28, 28), trophy.y + Phaser.Math.Between(-36, 10), 'spark').setBlendMode('ADD').setScale(0);
        this.tweens.add({ targets: sp, scale: 2, alpha: 0, angle: 90, duration: 600, onComplete: () => sp.destroy() });
      }
    });

    // Bilanz
    if (s.mode === 'party') {
      this.add.text(cx + 200, 330, `SIEGE\n${sspPlayer(1).upper} ${s.wins[1]}\n${sspPlayer(2).upper} ${s.wins[2]}`, {
        fontFamily: FONT, fontSize: '10px', color: '#ffffff', align: 'center', lineSpacing: 8, stroke: '#000000', strokeThickness: 4
      }).setOrigin(0.5);
    }

    // Konfetti
    this.add.particles(0, -10, 'confetti', {
      x: { min: 0, max: GAME_WIDTH }, lifespan: 6000, speedY: { min: 60, max: 130 }, speedX: { min: -30, max: 30 },
      rotate: { start: 0, end: 540 }, scale: { min: 0.8, max: 1.4 },
      tint: [0xd52b1e, 0xffffff, 0xf7d117, 0x3fd06a, 0x1b6ee8, 0xff7ad9], frequency: 70
    }).setDepth(50);

    Sfx.play(this, 'win');
    this.song = Sfx.melody(this, Sfx.songs.credits, 0.8);
    this.events.once('shutdown', () => { if (this.song) this.song.stop(); });

    this.prompt = this.add.text(cx, GAME_HEIGHT - 12, 'A = SSP-MENÜ', { fontFamily: FONT, fontSize: '9px', color: '#dddddd', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5, 1).setVisible(false).setDepth(60);
    this.time.delayedCall(2000, () => { this.ready = true; this.prompt.setVisible(true); });
    this.input.keyboard.on('keydown-ESC', () => this.leave());
  }

  update() {
    this.inputs.forEach(i => i.update());
    if (this.ready && this.inputs.some(i => i.justPressed('jump') || i.justPressed('start') || i.justPressed('back'))) this.leave();
  }

  leave() {
    if (!this.ready || this.leaving) return;
    this.leaving = true;
    if (this.song) this.song.stop();
    Sfx.play(this, 'select');
    SspParty.fadeTo(this, 'SspMenuScene');
  }
}
