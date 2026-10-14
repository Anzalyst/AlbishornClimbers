/* =====================================================================
 * BrennesselScene – Brennessel-Alarm!: Slapstick-Fangis
 *
 * Wer den Brennessel-Strauch hält, muss den anderen berühren (+1 Punkt).
 * Dann wechselt der Strauch: Der Getroffene ist dran, ist aber kurz
 * "benommen", damit der andere fliehen kann.
 *   LINKS / RECHTS = laufen     A = springen
 *   B = Schild (Pfannendeckel) – nur auf der Flucht; wehrt einen Treffer ab
 *       und lässt den Fänger kurz taumeln. Danach 2.5 s Abklingzeit.
 * Nach 45 s gewinnt, wer öfter getroffen hat.
 * ===================================================================== */

const NETTLE = {
  groundY: 500,
  platforms: [[230, 400, 220], [730, 400, 220], [480, 300, 240]],   // [Mitte x, Oberkante y, Breite]
  runSpeed: 220, accelGround: 1800, accelAir: 1100, jumpVelocity: 560,
  tagDist: [36, 45],         // Abstand (x, y), ab dem ein Treffer zählt (Figuren sind 1.5× gross)
  freeze: 1.2,              // Fänger nach dem Wechsel kurz benommen
  shieldTime: 0.5, shieldCooldown: 2.5,
  stun: 0.8
};

class BrennesselScene extends MinigameScene {
  constructor() {
    super('SspBrennessel');
    this.duration = 45;
  }

  setup() {
    this.addSkyAndMountains(330, [0x9fd8f4, 0xeefaff]);
    const g = this.add.graphics();
    g.fillStyle(0x5aa046).fillRect(0, 330, GAME_WIDTH, GAME_HEIGHT - 330);
    this.add.image(110, 330, 'ssp_tent').setOrigin(0.5, 1).setScale(0.7);
    this.add.image(850, 330, 'ssp_tent').setOrigin(0.5, 1).setScale(0.7).setFlipX(true);
    g.fillStyle(0x478c37).fillRect(0, NETTLE.groundY, GAME_WIDTH, GAME_HEIGHT - NETTLE.groundY);
    g.fillStyle(0x6cc052).fillRect(0, NETTLE.groundY, GAME_WIDTH, 4);

    // Boden und Holzplattformen (von unten durchspringbar)
    this.solids = [];
    const ground = this.add.rectangle(GAME_WIDTH / 2, NETTLE.groundY + 20, GAME_WIDTH, 40).setVisible(false);
    this.physics.add.existing(ground, true);
    this.solids.push(ground);
    NETTLE.platforms.forEach(([x, y, w]) => {
      g.fillStyle(0x6b4220).fillRect(x - w / 2, y, w, 14).fillStyle(0xb07a3a).fillRect(x - w / 2, y, w, 9).fillStyle(0xd09a55).fillRect(x - w / 2, y, w, 2);
      g.fillStyle(0x6b4220).fillRect(x - w / 2 + 10, y + 14, 6, NETTLE.groundY - y - 14).fillRect(x + w / 2 - 16, y + 14, 6, NETTLE.groundY - y - 14);
      const p = this.add.rectangle(x, y + 7, w, 14).setVisible(false);
      this.physics.add.existing(p, true);
      Object.assign(p.body.checkCollision, { down: false, left: false, right: false });
      this.solids.push(p);
    });

    this.runners = [1, 2].map(id => {
      const tex = this.players[id - 1].texture;
      const sprite = this.physics.add.sprite(id === 1 ? 120 : 840, NETTLE.groundY - 20, tex, charFrame(tex, 'idle'));
      sprite.body.setSize(14, 28).setOffset(5, 4);
      sprite.body.setMaxVelocityY(PHYSICS.MAX_FALL);
      sprite.setCollideWorldBounds(true).setScale(1.5).setDepth(20).setFlipX(id === 2);
      this.physics.add.collider(sprite, this.solids);
      return {
        id, sprite, tex, freeze: 0, stun: 0, invuln: 0, shield: 0, cooldown: 0,
        shieldSprite: this.add.image(0, 0, 'ssp_shield').setDepth(22).setVisible(false)
      };
    });

    this.it = 1;   // Jessica beginnt mit dem Strauch
    this.nettle = this.add.image(0, 0, 'ssp_nettle').setDepth(21).setOrigin(0.5, 0.9);
    this.itMarker = this.add.text(0, 0, '!', { fontFamily: FONT, fontSize: '14px', color: '#ff6a5a', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(30);
  }

  runner(id) { return this.runners[id - 1]; }

  tick(dt) {
    this.runners.forEach(r => {
      const input = this.inputOf(r.id);
      const body = r.sprite.body;
      ['freeze', 'stun', 'invuln', 'shield', 'cooldown'].forEach(k => { r[k] = Math.max(0, r[k] - dt); });
      const onGround = body.blocked.down || body.touching.down;
      const canMove = r.freeze <= 0 && r.stun <= 0;
      const dir = canMove ? (input.right ? 1 : 0) - (input.left ? 1 : 0) : 0;
      const accel = (onGround ? NETTLE.accelGround : NETTLE.accelAir) * dt;
      const diff = dir * NETTLE.runSpeed - body.velocity.x;
      if (r.stun <= 0) body.setVelocityX(body.velocity.x + Phaser.Math.Clamp(diff, -accel, accel));
      if (canMove && onGround && input.justPressed('jump')) { body.setVelocityY(-NETTLE.jumpVelocity); Sfx.play(this, 'jump'); }
      if (canMove && r.id !== this.it && input.justPressed('action') && r.cooldown <= 0) {
        r.shield = NETTLE.shieldTime;
        r.cooldown = NETTLE.shieldCooldown;
        Sfx.play(this, 'select');
      }
      if (dir) r.sprite.setFlipX(dir < 0);
      if (!onGround) { r.sprite.anims.stop(); r.sprite.setFrame(charFrame(r.tex, body.velocity.y < 0 ? 'jump' : 'fall')); }
      else if (Math.abs(body.velocity.x) > 20) r.sprite.anims.play(`${r.tex}-walk`, true);
      else { r.sprite.anims.stop(); r.sprite.setFrame(charFrame(r.tex, 'idle')); }
    });

    // Fangen
    const catcher = this.runner(this.it), target = this.runner(3 - this.it);
    const a = catcher.sprite, b = target.sprite;
    const close = Math.abs(a.x - b.x) < NETTLE.tagDist[0] && Math.abs(a.y - b.y) < NETTLE.tagDist[1];
    if (close && catcher.freeze <= 0 && catcher.stun <= 0 && target.invuln <= 0) {
      const away = Math.sign(a.x - b.x) || 1;
      if (target.shield > 0) {
        catcher.stun = NETTLE.stun;
        a.body.setVelocity(away * 320, -260);
        target.invuln = 0.6;
        Sfx.play(this, 'block');
        this.popText(b.x, b.y - 50, 'ABGEWEHRT!', '#7dd8ff', 10);
      } else {
        this.score[catcher.id]++;
        Sfx.play(this, 'autsch');
        this.popText(b.x, b.y - 50, 'AUTSCH!', '#ff6a5a', 12);
        b.body.setVelocity(-away * 200, -320);
        this.it = target.id;
        target.freeze = NETTLE.freeze;
        target.shield = 0;
        catcher.invuln = NETTLE.freeze + 0.3;
      }
    }
  }

  visuals(dt, time) {
    const holder = this.runner(this.it).sprite;
    const face = holder.flipX ? -1 : 1;
    this.nettle.setPosition(holder.x + face * 16, holder.y + 4).setAngle(face * (20 + Math.sin(time / 120) * 15)).setFlipX(face < 0);
    const frozen = this.runner(this.it).freeze > 0;
    this.itMarker.setPosition(holder.x, holder.y - 30).setText(frozen ? Math.ceil(this.runner(this.it).freeze).toString() : '!');
    this.runners.forEach(r => {
      r.sprite.setAlpha(r.invuln > 0 && Math.floor(time / 80) % 2 ? 0.5 : 1).setAngle(r.stun > 0 ? Math.sin(time / 40) * 15 : 0);
      r.shieldSprite.setVisible(r.shield > 0).setPosition(r.sprite.x + (r.sprite.flipX ? -14 : 14), r.sprite.y);
    });
  }
}
