/* =====================================================================
 * GrillScene – Grill-Meister: BBQ-Challenge
 *
 * Jede Spielerin / jeder Spieler hat einen Grill mit 4 Würsten.
 *   LINKS / RECHTS = Wurst wählen      A = wenden
 * Über jeder Wurst zeigt ein Balken, wie gar die Unterseite ist:
 *   grüner Bereich = PERFEKT (+3), davor GUT (+1) bzw. ROH (0),
 *   roter Bereich = VERKOHLT (-1). Bleibt eine Wurst zu lange liegen,
 *   verbrennt sie ganz (-2). Nach zwei Seiten wird sie serviert und eine
 *   neue kommt auf den Rost. Nach 45 s gewinnt, wer mehr Punkte hat.
 * Beide Grills bekommen dieselbe Abfolge von Garzeiten (fair).
 * ===================================================================== */

const GRILL = {
  slots: [-108, -36, 36, 108],      // x-Versatz der Würste zur Grillmitte
  y: 330,
  perfect: [0.75, 1.0],             // grüner Bereich
  good: 0.5,
  burnAt: 1.45,                     // ab hier verbrennt die Wurst ganz
  respawn: 0.8,                     // s bis zur nächsten Wurst
  rates: 48                         // vorbereitete Garzeiten pro Grillplatz
};

class GrillScene extends MinigameScene {
  constructor() {
    super('SspGrill');
    this.duration = 45;
  }

  setup() {
    // Abendstimmung am Campingplatz
    this.addSkyAndMountains(250, [0x2a3a6a, 0xf5a96b]);
    const g = this.add.graphics();
    g.fillStyle(0x3f7d4a).fillRect(0, 250, GAME_WIDTH, GAME_HEIGHT - 250);
    this.add.image(80, 270, 'ssp_tent').setOrigin(0.5, 1).setScale(0.8);
    this.add.image(880, 275, 'ssp_tent').setOrigin(0.5, 1).setScale(0.9).setFlipX(true);

    // Garzeiten: gleiche Folge für beide Grills (Rate = Garfortschritt pro Sekunde)
    this.rateTable = GRILL.slots.map(() => Array.from({ length: GRILL.rates }, () => Phaser.Math.FloatBetween(0.17, 0.3)));

    this.smoke = this.add.particles(0, 0, 'softDot', {
      lifespan: 1200, speedY: { min: -40, max: -20 }, speedX: { min: -8, max: 8 },
      scale: { start: 0.8, end: 2 }, alpha: { start: 0.5, end: 0 }, tint: 0x555555, emitting: false
    }).setDepth(15);

    this.grills = [1, 2].map(id => {
      const cx = id === 1 ? 240 : 720;
      const gg = this.add.graphics();
      // Feuerschale, Glut, Rost
      gg.fillStyle(0x2c3038).fillRoundedRect(cx - 160, GRILL.y - 4, 320, 70, 14);
      gg.fillStyle(0x4b515c).fillRect(cx - 150, GRILL.y + 66, 8, 70).fillRect(cx + 142, GRILL.y + 66, 8, 70);
      const glow = this.add.graphics();
      for (let x = cx - 145; x <= cx + 145; x += 10) gg.lineStyle(2, 0x9aa0aa).lineBetween(x, GRILL.y - 6, x, GRILL.y + 18);
      gg.lineStyle(3, 0xb8bec8).strokeRect(cx - 150, GRILL.y - 8, 300, 28);
      this.addFigure(id, id === 1 ? cx - 190 : cx + 190, GRILL.y + 120, 2.4).setFlipX(id === 2);
      const grill = {
        id, cx, cursor: id === 1 ? 0 : 3, glow,
        cursorArrow: this.add.text(0, 0, '▼', { fontFamily: FONT, fontSize: '16px', color: this.players[id - 1].css, stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setDepth(40),
        sausages: GRILL.slots.map((dx, slot) => this.newSausage(cx + dx, slot, 0))
      };
      grill.counts = GRILL.slots.map(() => 1);
      return grill;
    });
  }

  newSausage(x, slot, n) {
    const sprite = this.add.image(x, GRILL.y + 4, 'ssp_sausage').setDepth(20);
    const meter = this.add.graphics().setDepth(30);
    return { x, slot, sprite, meter, cook: [0, 0], down: 0, judged: 0, rate: this.rateTable[slot][n % GRILL.rates], gone: false, wait: 0, n };
  }

  tick(dt) {
    this.grills.forEach(gr => {
      const input = this.inputOf(gr.id);
      if (input.justPressed('left')) gr.cursor = Math.max(0, gr.cursor - 1);
      if (input.justPressed('right')) gr.cursor = Math.min(GRILL.slots.length - 1, gr.cursor + 1);

      gr.sausages.forEach((s, i) => {
        if (s.gone) {
          s.wait -= dt;
          if (s.wait <= 0) { gr.sausages[i] = this.newSausage(s.x, s.slot, gr.counts[i]++); }
          return;
        }
        s.cook[s.down] += s.rate * dt;
        if (s.cook[s.down] >= GRILL.burnAt) {
          this.award(gr, s, -2, 'VERBRANNT!', '#ff6a5a');
          this.serve(s, true);
        }
      });

      if (input.justPressed('jump')) {
        const s = gr.sausages[gr.cursor];
        if (s && !s.gone) this.flip(gr, s);
      }
    });
  }

  flip(gr, s) {
    const c = s.cook[s.down];
    if (c > GRILL.perfect[1]) this.award(gr, s, -1, 'VERKOHLT', '#ff8080');
    else if (c >= GRILL.perfect[0]) this.award(gr, s, 3, 'PERFEKT!', '#7dff9a');
    else if (c >= GRILL.good) this.award(gr, s, 1, 'GUT', '#ffffff');
    else this.award(gr, s, 0, 'ROH', '#ffb070');
    Sfx.play(this, 'sizzle');
    s.judged++;
    s.down = 1 - s.down;
    this.tweens.add({ targets: s.sprite, y: s.sprite.y - 26, duration: 140, yoyo: true, ease: 'Quad.out' });
    if (s.judged >= 2) this.serve(s, false);
  }

  award(gr, s, points, text, color) {
    this.score[gr.id] += points;
    if (points >= 3) Sfx.play(this, 'perfect');
    else if (points < 0) Sfx.play(this, 'burnt');
    this.popText(s.x, GRILL.y - 50, text, color, 10);
  }

  /** Wurst vom Rost nehmen (serviert oder verbrannt); neue kommt nach kurzer Pause. */
  serve(s, burnt) {
    s.gone = true;
    s.wait = GRILL.respawn;
    s.meter.destroy();
    this.tweens.add({
      targets: s.sprite, y: s.sprite.y - 80, alpha: 0, angle: burnt ? 0 : 360, duration: 500,
      onComplete: () => s.sprite.destroy()
    });
  }

  /** Farbe einer Seite je nach Garstufe: rosa → braun → schwarz. */
  cookColor(c) {
    const stops = [[0, [255, 190, 180]], [0.6, [214, 130, 80]], [0.9, [160, 82, 40]], [1.2, [70, 40, 25]], [1.5, [25, 20, 18]]];
    let i = 0;
    while (i < stops.length - 2 && c > stops[i + 1][0]) i++;
    const [c0, a] = stops[i], [c1, b] = stops[i + 1];
    const t = Phaser.Math.Clamp((c - c0) / (c1 - c0), 0, 1);
    return Phaser.Display.Color.GetColor(...a.map((v, k) => Math.round(v + (b[k] - v) * t)));
  }

  visuals(dt, time) {
    this.grills.forEach(gr => {
      gr.glow.clear();
      for (let i = 0; i < 6; i++) {
        const x = gr.cx - 130 + i * 52 + Math.sin(time / 200 + i) * 4;
        gr.glow.fillStyle(0xff6a1a, 0.35 + 0.15 * Math.sin(time / 150 + i * 2)).fillCircle(x, GRILL.y + 40, 18);
      }
      gr.cursorArrow.setPosition(gr.cx + GRILL.slots[gr.cursor], GRILL.y - 70 + Math.sin(time / 150) * 3);
      gr.sausages.forEach(s => {
        if (s.gone) return;
        s.sprite.setTint(this.cookColor(s.cook[1 - s.down]));   // sichtbar ist die Oberseite
        const c = s.cook[s.down];
        const bx = s.x - 16, by = GRILL.y - 44, w = 32;
        s.meter.clear().fillStyle(0x10131c, 0.85).fillRect(bx - 2, by - 2, w + 4, 10)
          .fillStyle(0x3fd06a, 0.45).fillRect(bx + w * GRILL.perfect[0] / GRILL.burnAt, by, w * (GRILL.perfect[1] - GRILL.perfect[0]) / GRILL.burnAt, 6)
          .fillStyle(0xd7263d, 0.45).fillRect(bx + w * GRILL.perfect[1] / GRILL.burnAt, by, w * (1 - GRILL.perfect[1] / GRILL.burnAt), 6)
          .fillStyle(c > GRILL.perfect[1] ? 0xff4040 : c >= GRILL.perfect[0] ? 0x7dff9a : 0xffffff)
          .fillRect(bx, by + 1, Math.min(w, w * c / GRILL.burnAt), 4);
        if (c > GRILL.perfect[1] && Math.random() < 0.3) this.smoke.emitParticleAt(s.x + Phaser.Math.Between(-6, 6), GRILL.y - 10);
      });
    });
  }
}
