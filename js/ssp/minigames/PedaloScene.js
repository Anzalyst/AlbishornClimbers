/* =====================================================================
 * PedaloScene – Pedalo-Power: Rennen über den Sempachersee
 *
 * Jede Spielerin / jeder Spieler hat eine eigene Bahn mit zwei Spuren.
 *   A und B ABWECHSELND drücken = strampeln (zweimal derselbe Knopf bremst)
 *   HOCH / RUNTER = Spur wechseln, um Enten auszuweichen
 * Wer eine Ente rammt, steht kurz still. Wer zuerst im Ziel ist, gewinnt.
 * Nach 60 s gewinnt, wer weiter vorne ist.
 * ===================================================================== */

const PEDALO = {
  startX: 70, finishX: 880,
  lanes: [205, 395],          // Mittellinie der beiden Bahnen (Jessica oben, Simon unten)
  trackOffset: 34,            // Abstand der zwei Spuren von der Mittellinie
  stroke: 16,                 // Tempo-Gewinn pro richtigem Tritt (px/s)
  maxSpeed: 260,
  drag: 1.1,                  // Abbremsen pro Sekunde (Anteil)
  stunTime: 0.8,
  ducks: 6,
  timeLimit: 60
};

class PedaloScene extends MinigameScene {
  constructor() {
    super('SspPedalo');
  }

  setup() {
    this.elapsed = 0;
    this.addSkyAndMountains(110, [0x9fd8f4, 0xeefaff]);

    // See
    const g = this.add.graphics();
    g.fillGradientStyle(0x2ab0c8, 0x2ab0c8, 0x14708c, 0x14708c, 1).fillRect(0, 110, GAME_WIDTH, GAME_HEIGHT - 110);
    this.waves = this.add.graphics();
    // Bojenleine zwischen den Bahnen, Start- und Ziellinie
    for (let x = 20; x < GAME_WIDTH; x += 28) g.fillStyle(x % 56 ? 0xf2c230 : 0xd7263d).fillCircle(x, 300, 4);
    g.fillStyle(0xffffff, 0.5).fillRect(PEDALO.startX + 74, 130, 3, GAME_HEIGHT - 150);   // Startlinie vor den Booten
    for (let y = 130; y < GAME_HEIGHT - 20; y += 16) {
      g.fillStyle(((y - 130) / 16) % 2 ? 0x111111 : 0xffffff).fillRect(PEDALO.finishX + 36, y, 8, 8)
        .fillStyle(((y - 130) / 16) % 2 ? 0xffffff : 0x111111).fillRect(PEDALO.finishX + 44, y, 8, 8);
    }
    this.add.text(PEDALO.finishX + 44, 122, 'ZIEL', { fontFamily: FONT, fontSize: '10px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5, 1);

    // Boote
    this.boats = [1, 2].map(id => {
      const laneY = PEDALO.lanes[id - 1];
      const boat = {
        id, x: PEDALO.startX, track: 0, y: laneY - PEDALO.trackOffset, speed: 0,
        last: null, stun: 0, finishedAt: null,
        hull: this.add.image(0, 0, 'ssp_pedalo').setOrigin(0, 1).setDepth(10),
        wheel: this.add.image(0, 0, 'ssp_wheel').setDepth(11),
        rider: this.addFigure(id, 0, 0, 1.4).setDepth(9)
      };
      return boat;
    });

    // Enten: in jeder Bahn an denselben Stellen (fair), Spur zufällig aber gleich für beide
    this.ducks = [];
    const seg = (PEDALO.finishX - 220) / PEDALO.ducks;
    for (let i = 0; i < PEDALO.ducks; i++) {
      const x = 220 + i * seg + Phaser.Math.Between(10, seg - 30);
      const track = Phaser.Math.Between(0, 1);
      [1, 2].forEach(id => {
        const sprite = this.add.image(x, 0, 'ssp_duck').setOrigin(0.5, 1).setDepth(8).setFlipX(true);
        this.ducks.push({ id, x, track, sprite, hit: false, phase: i * 1.3 });
      });
    }
  }

  tick(dt) {
    this.elapsed += dt;
    this.boats.forEach(b => {
      const input = this.inputOf(b.id);
      if (b.finishedAt === null) {
        if (b.stun > 0) {
          b.stun -= dt;
        } else {
          ['jump', 'action'].forEach(btn => {
            if (!input.justPressed(btn)) return;
            if (b.last !== btn) { b.speed = Math.min(PEDALO.maxSpeed, b.speed + PEDALO.stroke); Sfx.play(this, 'stroke'); }
            else b.speed *= 0.85;             // zweimal derselbe Knopf: Tritt ins Leere
            b.last = btn;
          });
          if (input.justPressed('up') && b.track !== 0) b.track = 0;
          if (input.justPressed('down') && b.track !== 1) b.track = 1;
        }
        b.speed -= b.speed * PEDALO.drag * dt;
        b.x += b.speed * dt;
        if (b.x >= PEDALO.finishX) { b.x = PEDALO.finishX; b.finishedAt = this.elapsed; }
      }
      // Enten rammen?
      this.ducks.forEach(d => {
        if (d.hit || d.id !== b.id || d.track !== b.track) return;
        const front = b.x + 66;
        if (front > d.x - 8 && b.x + 10 < d.x + 8) {
          d.hit = true;
          b.stun = PEDALO.stunTime;
          b.speed = 0;
          Sfx.play(this, 'quack');
          this.popText(d.x, d.sprite.y - 20, 'QUAAK!', '#f2c230', 10);
          this.tweens.add({ targets: d.sprite, y: d.sprite.y - 60, x: d.x + 60, angle: 200, alpha: 0, duration: 600 });
        }
      });
    });

    const done = this.boats.filter(b => b.finishedAt !== null);
    if (done.length) {
      done.sort((a, b) => a.finishedAt - b.finishedAt);
      this.finish(done.length === 2 && done[0].finishedAt === done[1].finishedAt ? 0 : done[0].id);
    } else if (this.elapsed >= PEDALO.timeLimit) {
      const [a, b] = this.boats;
      this.finish(Math.abs(a.x - b.x) < 1 ? 0 : (a.x > b.x ? 1 : 2));
    }
  }

  visuals(dt, time) {
    this.waves.clear().fillStyle(0xffffff, 0.25);
    for (let i = 0; i < 40; i++) {
      const x = (i * 97 + time * 0.02 * (1 + (i % 3))) % GAME_WIDTH, y = 130 + (i * 53) % (GAME_HEIGHT - 150);
      this.waves.fillRect(x, y, 10, 2);
    }
    this.boats.forEach(b => {
      const targetY = PEDALO.lanes[b.id - 1] + (b.track ? PEDALO.trackOffset : -PEDALO.trackOffset);
      b.y += (targetY - b.y) * Math.min(1, dt * 12);
      const bob = Math.sin(time / 300 + b.id) * 1.5;
      b.hull.setPosition(b.x, b.y + 10 + bob);
      b.wheel.setPosition(b.x + 36, b.y + bob - 6).setAngle(b.wheel.angle + b.speed * dt * 3);
      b.rider.setPosition(b.x + 14, b.y + bob - 6).setAlpha(b.stun > 0 ? 0.6 : 1);
    });
    this.ducks.forEach(d => {
      if (d.hit) return;
      const y = PEDALO.lanes[d.id - 1] + (d.track ? PEDALO.trackOffset : -PEDALO.trackOffset) + 10;
      d.sprite.setPosition(d.x + Math.sin(time / 600 + d.phase) * 3, y + Math.sin(time / 250 + d.phase));
    });
  }

  hudValue(id) {
    const b = this.boats[id - 1];
    return `${Math.round((b.x - PEDALO.startX) / (PEDALO.finishX - PEDALO.startX) * 100)}%`;
  }

  hudCenterText() { return 'ZIEL ▶'; }
}
