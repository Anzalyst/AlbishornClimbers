/* =====================================================================
 * WasserScene – Wasser-Marsch!: Feuerwehrübung mit der Wasserspritze
 *
 * Jede Hälfte des Bildschirms gehört einer Spielerin / einem Spieler mit
 * 5 Zielscheiben (gespiegelt, also fair).
 *   HOCH / RUNTER abwechselnd = Druck aufpumpen
 *   LINKS / RECHTS            = zielen
 *   A halten                  = spritzen (verbraucht Druck)
 * Je mehr Druck, desto höher trifft der Strahl – die gestrichelte Markierung
 * zeigt, wo er landen würde. Wer zuerst alle 5 Scheiben umspritzt, gewinnt;
 * sonst nach 45 s, wer mehr umgespritzt hat.
 * ===================================================================== */

const WASSER = {
  groundY: 492,
  pump: 9,                // Druck pro richtigem Pumpstoss
  pumpWrong: 2,
  leak: 4,                // Druckverlust pro Sekunde (ohne Spritzen)
  sprayCost: 16,          // Druckverbrauch pro Sekunde beim Spritzen
  reach: 4.1,             // Strahlhöhe in px pro Druckeinheit
  aimSpeed: 260,
  hitDamage: 2.4,         // Trefferpunkte pro Sekunde (Scheibe hat 1)
  // Zielscheiben relativ zur Hälfte (x 0..480) – für Simon gespiegelt
  targets: [[90, 330], [180, 210], [300, 290], [390, 160], [230, 120]]
};

class WasserScene extends MinigameScene {
  constructor() {
    super('SspWasser');
    this.duration = 45;
  }

  setup() {
    // Übungsplatz: Himmel, Hügel, Rasen, Zaun in der Mitte
    this.addSkyAndMountains(300, [0x8fd0f4, 0xf2f9ff]);
    this.add.tileSprite(0, 300, GAME_WIDTH, GAME_HEIGHT - 300, 'ssp_lawn').setOrigin(0);
    this.add.tileSprite(0, WASSER.groundY, GAME_WIDTH, GAME_HEIGHT - WASSER.groundY, 'ssp_lawnDark').setOrigin(0);
    const g = this.add.graphics();
    g.fillStyle(0x17121f).fillRect(0, 299, GAME_WIDTH, 2.5).fillRect(0, WASSER.groundY - 1, GAME_WIDTH, 2.5);
    for (let y = 110; y < GAME_HEIGHT; y += 40) {
      g.fillStyle(0x17121f).fillRect(GAME_WIDTH / 2 - 21.5, y - 1.5, 43, 8);
      g.fillStyle(0xa0703a).fillRect(GAME_WIDTH / 2 - 20, y, 40, 5);
    }
    g.fillStyle(0x17121f).fillRect(GAME_WIDTH / 2 - 5.5, 90, 11, GAME_HEIGHT - 90);
    g.fillStyle(0x8a5a2b).fillRect(GAME_WIDTH / 2 - 4, 90, 8, GAME_HEIGHT - 90);

    this.jets = this.add.graphics().setDepth(20);
    this.marks = this.add.graphics().setDepth(19);

    this.sides = [1, 2].map(id => {
      const x0 = id === 1 ? 0 : GAME_WIDTH / 2;
      const mirror = x => (id === 1 ? x : GAME_WIDTH / 2 - x);
      const nozzleX = x0 + 240;
      const side = {
        id, x0, nozzleX, pressure: 0, aimX: nozzleX, lastPump: null, spraying: false,
        targets: WASSER.targets.map(([tx, ty]) => {
          const x = x0 + mirror(tx);
          // Scheibenmitte liegt genau auf (x, ty); der Pfosten reicht bis zum Boden
          const sprite = this.add.image(x, ty, 'ssp_target').setOrigin(0.5, 18 / 56).setDepth(5);
          this.add.rectangle(x, (ty + 38 + WASSER.groundY) / 2, 4, WASSER.groundY - ty - 38, 0x6b4220).setDepth(4);
          return { x, y: ty, hp: 1, down: false, sprite };
        }),
        gauge: this.add.graphics().setDepth(30)
      };
      this.add.image(nozzleX + 34, WASSER.groundY, 'ssp_hydrant').setOrigin(0.5, 1).setDepth(6);
      this.addFigure(id, nozzleX - 26, WASSER.groundY, 2).setDepth(7).setFlipX(id === 2);
      side.nozzle = this.add.image(nozzleX, WASSER.groundY - 26, 'ssp_nozzle').setOrigin(0.5, 0.9).setDepth(8);
      this.add.text(nozzleX + 65, WASSER.groundY - 138, 'DRUCK', { fontFamily: FONT, fontSize: '7px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(30);
      return side;
    });
  }

  /** Wo landet der Strahl bei diesem Druck? */
  jetY(pressure) { return WASSER.groundY - 40 - pressure * WASSER.reach; }

  tick(dt) {
    this.sides.forEach(s => {
      const input = this.inputOf(s.id);
      ['up', 'down'].forEach(dir => {
        if (!input.justPressed(dir)) return;
        s.pressure = Math.min(100, s.pressure + (s.lastPump !== dir ? WASSER.pump : WASSER.pumpWrong));
        s.lastPump = dir;
        Sfx.play(this, 'pump');
      });
      const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      s.aimX = Phaser.Math.Clamp(s.aimX + dir * WASSER.aimSpeed * dt, s.x0 + 30, s.x0 + GAME_WIDTH / 2 - 30);

      s.spraying = input.jump && s.pressure > 3;
      if (s.spraying) {
        s.pressure = Math.max(0, s.pressure - WASSER.sprayCost * dt);
        if (Math.random() < 0.25) Sfx.play(this, 'spray');
        const ex = s.aimX, ey = this.jetY(s.pressure);
        s.targets.forEach(t => {
          if (t.down || Math.abs(ex - t.x) > 22 || Math.abs(ey - t.y) > 24) return;
          t.hp -= WASSER.hitDamage * dt;
          if (t.hp <= 0) {
            t.down = true;
            this.score[s.id]++;
            Sfx.play(this, 'targetDown');
            this.popText(t.x, t.y - 30, 'TREFFER!', this.players[s.id - 1].css, 10);
            this.tweens.add({ targets: t.sprite, angle: s.id === 1 ? 90 : -90, y: t.sprite.y + 20, alpha: 0.5, duration: 400, ease: 'Quad.in' });
          }
        });
      } else {
        s.pressure = Math.max(0, s.pressure - WASSER.leak * dt);
      }
    });

    const allDown = this.sides.filter(s => s.targets.every(t => t.down));
    if (allDown.length) this.finish(allDown.length === 2 ? 0 : allDown[0].id);
  }

  timeUp() {
    const [a, b] = this.sides;
    if (this.score[1] !== this.score[2]) return this.finish(this.score[1] > this.score[2] ? 1 : 2);
    // Gleich viele Scheiben: wer die übrigen schon stärker angespritzt hat
    const rest = s => s.targets.reduce((sum, t) => sum + (t.down ? 0 : t.hp), 0);
    const diff = rest(a) - rest(b);
    this.finish(Math.abs(diff) < 0.01 ? 0 : (diff < 0 ? 1 : 2));
  }

  visuals(dt, time) {
    this.jets.clear();
    this.marks.clear();
    this.sides.forEach(s => {
      const ex = s.aimX, ey = this.jetY(s.pressure);
      const nx = s.nozzleX, ny = WASSER.groundY - 52;
      s.nozzle.setAngle(Phaser.Math.RadToDeg(Math.atan2(ex - nx, ny - ey)) * 0.6);
      // Ziel-Markierung (gestrichelter Kreis)
      for (let a = 0; a < 12; a++) {
        if (a % 2) continue;
        const ang = a / 12 * Math.PI * 2 + time / 400;
        this.marks.fillStyle(0xffffff, 0.8).fillCircle(ex + Math.cos(ang) * 12, ey + Math.sin(ang) * 12, 1.5);
      }
      if (s.spraying) {
        // Wasserstrahl als Bogen
        const cx = (nx + ex) / 2, cy = Math.min(ny, ey) - 60;
        const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(nx, ny), new Phaser.Math.Vector2(cx, cy), new Phaser.Math.Vector2(ex, ey));
        this.jets.lineStyle(6, 0x5ab4ff, 0.75); curve.draw(this.jets, 24);
        this.jets.lineStyle(2, 0xe0f4ff, 0.9); curve.draw(this.jets, 24);
        for (let i = 0; i < 5; i++) {
          this.jets.fillStyle(0xbfe6ff, 0.8).fillCircle(ex + Phaser.Math.Between(-10, 10), ey + Phaser.Math.Between(-6, 14), 2);
        }
      }
      // Druckanzeige neben dem Hydranten
      const gx = s.nozzleX + 60, gy = WASSER.groundY - 130;
      s.gauge.clear().fillStyle(0x17121f).fillRoundedRect(gx - 3, gy - 3, 16, 126, 3).fillStyle(0xfff6dc).fillRect(gx, gy, 10, 120)
        .fillStyle(s.pressure > 70 ? 0xd7263d : s.pressure > 35 ? 0xf2c230 : 0x3fd06a).fillRect(gx, gy + 120 - s.pressure * 1.2, 10, s.pressure * 1.2);
    });
  }
}
