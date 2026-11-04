/* =====================================================================
 * RundkursScene – Camping-Rundkurs: Inline-Skate-Rennen (2 Runden)
 *
 * Zwei Bahnen übereinander (Jessica oben, Simon unten), die Welt scrollt.
 *   LINKS / RECHTS abwechselnd im Takt = abstossen
 *     – im grünen Takt-Fenster gibt es vollen Schwung, zu hastig nur wenig
 *   A = springen (über Zeltleinen und Campingstühle)
 * Hindernisse sind knallig gefärbt, flackernd umrandet und haben rot-weisse
 * Warnstreifen; ein Warndreieck am rechten Rand kündigt sie früh an, und
 * "SPRING!" zeigt den richtigen Moment. Wer ein Hindernis berührt, stürzt kurz. Oben zeigt eine Karte des
 * Campingplatzes, wer vorne liegt. Zuerst nach 2 Runden im Ziel gewinnt.
 * ===================================================================== */

const RUNDKURS = {
  lap: 2400, laps: 2,
  skaterX: 150,               // weiter links = mehr Vorausblick
  warnAhead: 500,             // so weit hinter dem rechten Rand wird schon gewarnt (px)
  jumpHint: [40, 120],        // Abstand zum Hindernis, in dem "SPRING!" erscheint
  groundY: [262, 488],        // Bodenlinie der beiden Bahnen
  push: 70, pushRushed: 22, pushSame: 12,
  rhythm: [0.32, 0.75],       // ideales Takt-Fenster zwischen zwei Abstössen (s)
  maxSpeed: 330,
  jumpVelocity: 430, gravity: 1300,
  stunTime: 1.0,
  timeLimit: 75
};

class RundkursScene extends MinigameScene {
  constructor() {
    super('SspRundkurs');
  }

  setup() {
    this.elapsed = 0;
    const total = RUNDKURS.lap * RUNDKURS.laps;
    this.addSkyAndMountains(120, [0x9fd8f4, 0xeefaff]);

    // Hindernisse: gleiche Abfolge auf beiden Bahnen (fair)
    this.course = [];
    for (let d = 500; d < total - 200; d += Phaser.Math.Between(260, 420)) {
      this.course.push({ d, type: Math.random() < 0.5 ? 'rope' : 'chair' });
    }

    this.lanes = [1, 2].map(id => {
      const gy = RUNDKURS.groundY[id - 1];
      const top = gy - 150;
      this.add.tileSprite(0, top, GAME_WIDTH, 150, 'ssp_lawn').setOrigin(0);
      this.add.tileSprite(0, gy, GAME_WIDTH, 18, 'ssp_road').setOrigin(0);    // Asphaltweg
      // Wiese bis zur nächsten Bahn bzw. bis zum Bildrand
      const below = id === 1 ? RUNDKURS.groundY[1] - 150 : GAME_HEIGHT;
      this.add.tileSprite(0, gy + 18, GAME_WIDTH, below - gy - 18, 'ssp_lawnDark').setOrigin(0);
      // Zelte im Hintergrund gedämpft, damit die Hindernisse hervorstechen
      const deco = this.add.tileSprite(0, gy - 4, GAME_WIDTH, 60, 'ssp_tent').setOrigin(0, 1).setAlpha(0.45).setTint(0xb8c8b8);
      const stripe = this.add.graphics();
      const lane = {
        id, gy, pos: 0, speed: 0, y: 0, vy: 0, stun: 0, lastPush: null, lastPushAt: -9, finishedAt: null,
        deco, stripe,
        skater: this.addFigure(id, RUNDKURS.skaterX, gy, 2).setDepth(20),
        skates: this.add.image(RUNDKURS.skaterX, gy, 'ssp_skates').setOrigin(0.5, 1).setDepth(21),
        rhythmBar: this.add.graphics().setDepth(25),
        warn: this.add.graphics().setDepth(14),
        warnIcon: this.add.graphics().setDepth(26),
        warnText: this.add.text(GAME_WIDTH - 26, gy - 66, '!', { fontFamily: FONT, fontSize: '14px', color: '#111111' }).setOrigin(0.5).setDepth(27),
        jumpText: this.add.text(RUNDKURS.skaterX, gy - 92, 'SPRING!', { fontFamily: FONT, fontSize: '12px', color: '#ffe14a', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setDepth(27).setVisible(false),
        obstacles: this.course.map(o => ({ ...o, hit: false, sprite: this.add.image(-100, gy + 2, o.type === 'rope' ? 'ssp_rope' : 'ssp_chair').setOrigin(0.5, 1).setDepth(15) })),
        finishLine: this.add.rectangle(-100, gy - 40, 10, 80, 0xffffff).setDepth(14)
      };
      return lane;
    });

    // Karte des Campingplatzes (oben Mitte): Oval mit zwei Punkten
    this.map = this.add.graphics().setDepth(90);
  }

  tick(dt) {
    this.elapsed += dt;
    const total = RUNDKURS.lap * RUNDKURS.laps;
    this.lanes.forEach(l => {
      const input = this.inputOf(l.id);
      if (l.finishedAt === null) {
        if (l.stun > 0) {
          l.stun -= dt;
        } else {
          ['left', 'right'].forEach(dir => {
            if (!input.justPressed(dir)) return;
            const gap = this.elapsed - l.lastPushAt;
            let boost = RUNDKURS.push;
            if (l.lastPush === dir) boost = RUNDKURS.pushSame;
            else if (gap < RUNDKURS.rhythm[0]) boost = RUNDKURS.pushRushed;
            l.speed = Math.min(RUNDKURS.maxSpeed, l.speed + boost);
            l.lastPush = dir;
            l.lastPushAt = this.elapsed;
            Sfx.play(this, 'stroke');
          });
          if (input.justPressed('jump') && l.y === 0) { l.vy = -RUNDKURS.jumpVelocity; Sfx.play(this, 'jump'); }
        }
        l.speed = Math.max(0, l.speed - (20 + l.speed * 0.3) * dt);
        l.pos += l.speed * dt;
        if (l.pos >= total) { l.pos = total; l.finishedAt = this.elapsed; }
      }
      // Springen / Landen
      if (l.y < 0 || l.vy < 0) {
        l.vy += RUNDKURS.gravity * dt;
        l.y = Math.min(0, l.y + l.vy * dt);
        if (l.y === 0) l.vy = 0;
      }
      // Hindernisse: getroffen, wenn auf gleicher Höhe und nicht hoch genug gesprungen
      l.obstacles.forEach(o => {
        if (o.hit || Math.abs(o.d - l.pos) > 14) return;
        const height = o.type === 'rope' ? 16 : 32;
        if (-l.y < height) {
          o.hit = true;
          l.stun = RUNDKURS.stunTime;
          l.speed = 0;
          Sfx.play(this, 'bonk');
          this.popText(RUNDKURS.skaterX, l.gy - 70, 'AUTSCH!', '#ff8080', 10);
          this.tweens.add({ targets: [l.skater, l.skates], angle: { from: 0, to: 360 }, duration: 500 });
        }
      });
    });

    const done = this.lanes.filter(l => l.finishedAt !== null).sort((a, b) => a.finishedAt - b.finishedAt);
    if (done.length) this.finish(done.length === 2 && done[0].finishedAt === done[1].finishedAt ? 0 : done[0].id);
    else if (this.elapsed >= RUNDKURS.timeLimit) {
      const [a, b] = this.lanes;
      this.finish(Math.abs(a.pos - b.pos) < 1 ? 0 : (a.pos > b.pos ? 1 : 2));
    }
  }

  visuals(dt, time) {
    const total = RUNDKURS.lap * RUNDKURS.laps;
    this.lanes.forEach(l => {
      l.deco.tilePositionX = l.pos * 0.5;
      l.stripe.clear().fillStyle(0xffffff, 0.8);
      for (let x = -((l.pos) % 60); x < GAME_WIDTH; x += 60) l.stripe.fillRect(x, l.gy + 8, 26, 3);
      const lean = l.stun > 0 ? 0 : Math.min(12, l.speed / 25);
      if (l.stun <= 0) { l.skater.setAngle(lean); l.skates.setAngle(0); }
      l.skater.setY(l.gy + l.y - 6);
      l.skates.setY(l.gy + l.y);
      // Hindernisse: flackernde gelbe Umrandung + rot-weisse Warnstreifen am Boden
      const flash = 0.55 + 0.45 * Math.sin(time / 90);
      l.warn.clear();
      l.obstacles.forEach(o => {
        const x = RUNDKURS.skaterX + (o.d - l.pos);
        const visible = x > -40 && x < GAME_WIDTH + 40;
        o.sprite.setX(x).setVisible(visible).setAlpha(o.hit ? 0.35 : 1);
        if (!visible || o.hit) return;
        const w = o.sprite.width, h = o.sprite.height;
        for (let i = 0; i < 6; i++) l.warn.fillStyle(i % 2 ? 0xffffff : 0xff2a2a).fillRect(x - 30 + i * 10, l.gy + 1, 10, 6);
        l.warn.lineStyle(3, 0xffe14a, flash).strokeRect(x - w / 2 - 4, l.gy - h - 2, w + 8, h + 4);
      });
      // Vorwarnung: nächstes Hindernis noch ausserhalb des Bildes → blinkendes Dreieck rechts
      const next = l.obstacles.find(o => !o.hit && o.d > l.pos);
      const nx = next ? RUNDKURS.skaterX + (next.d - l.pos) : Infinity;
      const announce = nx > GAME_WIDTH - 20 && nx < GAME_WIDTH + RUNDKURS.warnAhead;
      const blink = Math.floor(time / 180) % 2 === 0;
      l.warnIcon.clear();
      if (announce && blink) {
        l.warnIcon.fillStyle(0x111111).fillTriangle(GAME_WIDTH - 26, l.gy - 92, GAME_WIDTH - 50, l.gy - 50, GAME_WIDTH - 2, l.gy - 50)
          .fillStyle(0xffe14a).fillTriangle(GAME_WIDTH - 26, l.gy - 86, GAME_WIDTH - 45, l.gy - 53, GAME_WIDTH - 7, l.gy - 53);
      }
      l.warnText.setVisible(announce && blink);
      // "SPRING!" im richtigen Moment
      const gap = nx - RUNDKURS.skaterX;
      l.jumpText.setVisible(l.stun <= 0 && l.y === 0 && gap > RUNDKURS.jumpHint[0] && gap < RUNDKURS.jumpHint[1] && blink);
      l.finishLine.setX(RUNDKURS.skaterX + (total - l.pos) + 10);
      // Takt-Anzeige: füllt sich nach dem letzten Abstoss, grün im idealen Fenster
      const since = this.elapsed - l.lastPushAt;
      const frac = Math.min(1, since / RUNDKURS.rhythm[1]);
      const inWindow = since >= RUNDKURS.rhythm[0];
      l.rhythmBar.clear().fillStyle(0x17121f).fillRoundedRect(RUNDKURS.skaterX - 27, l.gy + 21, 54, 10, 3)
        .fillStyle(inWindow ? 0x3fd06a : 0xf2c230).fillRect(RUNDKURS.skaterX - 25, l.gy + 23, 50 * frac, 6);
    });

    // Karte
    const cx = GAME_WIDTH / 2, cy = 76, rx = 70, ry = 22;
    this.map.clear().fillStyle(0x17121f).fillRoundedRect(cx - 92, cy - 36, 184, 72, 10)
      .fillStyle(0x1d2b5c).fillRoundedRect(cx - 89, cy - 33, 178, 66, 8)
      .lineStyle(9, 0x17121f).strokeEllipse(cx, cy, rx * 2, ry * 2)
      .lineStyle(6, 0xc4cad4).strokeEllipse(cx, cy, rx * 2, ry * 2)
      .fillStyle(0xffffff).fillRect(cx - 2, cy + ry - 5, 4, 10);
    this.lanes.forEach(l => {
      const a = Math.PI / 2 + (l.pos % RUNDKURS.lap) / RUNDKURS.lap * Math.PI * 2;
      this.map.fillStyle(0x17121f).fillCircle(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 7.5);
      this.map.fillStyle(0x17121f).fillCircle(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 7.5);
      this.map.fillStyle(this.players[l.id - 1].color).fillCircle(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 6);
    });
  }

  hudValue(id) {
    const l = this.lanes[id - 1];
    return `RUNDE ${Math.min(RUNDKURS.laps, Math.floor(l.pos / RUNDKURS.lap) + 1)}/${RUNDKURS.laps}`;
  }
}
