/* =====================================================================
 * Player.js – Eine Spielfigur (Jessica oder Simon)
 *
 * Jeder Spieler hat einen unsichtbaren Physik-Körper (sprite) und eine
 * sichtbare Figur (view), die gestaucht/gestreckt werden kann, ohne die
 * Physik zu beeinflussen. Dazu kommt ein Schatten unter den Füssen.
 *
 *   const p = new Player(scene, PLAYER_DEFS[0], input, { x, y });
 *   p.update(time, delta)       Bewegung, Sprung, Animation (vor der Physik)
 *   p.updateView(time, delta)   Figur & Schatten nachführen (nach allem anderen)
 *   p.respawn('water')          zurück zum letzten Checkpoint
 *   p.celebrate()               Jubelsprung am Levelende
 * ===================================================================== */

class Player {
  constructor(scene, def, input, spawn) {
    this.scene = scene;
    this.def = def;
    this.input = input;

    // Unsichtbarer Physik-Körper …
    this.sprite = scene.physics.add.sprite(spawn.x, spawn.y, def.texture, 0).setVisible(false);
    this.sprite.body.setSize(14, 28).setOffset(5, 4);
    this.sprite.body.setMaxVelocityY(PHYSICS.MAX_FALL);
    this.sprite.setCollideWorldBounds(true);
    // … und die sichtbare Figur (Ursprung an den Füssen für Stauchen/Strecken)
    this.view = scene.add.sprite(spawn.x, spawn.y + 16, def.texture, 0).setOrigin(0.5, 1).setDepth(DEPTH.PLAYER);
    this.shadow = scene.add.image(spawn.x, spawn.y + 17, 'shadow').setDepth(DEPTH.SHADOW).setAlpha(0.35);

    this.coyote = 0;           // verbleibende "Coyote Time" in ms
    this.jumpBuffer = 0;       // gemerkter Sprungwunsch in ms
    this.checkpoint = { x: spawn.x, y: spawn.y };
    this.atGoal = false;
    this.respawning = false;
    this.sx = 1;               // Stauchen/Strecken der sichtbaren Figur
    this.sy = 1;
    this.onGround = true;
    this.wasOnGround = true;
    this.prevVy = 0;
    this.nextDust = 0;
    this.stuckFrames = 0;
    this.ridingVx = 0;         // Tempo der bewegten Plattform unter den Füssen (setzt das ObstacleSystem)
    this.onPlatform = false;   // steht auf Pendel/Baumstamm (zählt als Boden, setzt das ObstacleSystem)
    this.airVx = 0;            // mitgenommener Schwung in der Luft (Pendel, Baumstamm)
  }

  /** Bewegung, Sprung & Animation. */
  update(time, delta) {
    const { sprite, input, view, scene } = this;
    const body = sprite.body;
    if (this.respawning) return;

    const onGround = body.blocked.down || body.touching.down || this.onPlatform;
    this.onGround = onGround;

    // Schwung von bewegten Plattformen: am Boden merken, in der Luft mitnehmen
    const riding = this.ridingVx;
    if (onGround || body.blocked.left || body.blocked.right) this.airVx = onGround ? riding : 0;
    else if (this.airVx) sprite.x += this.airVx * delta / 1000;

    // Coyote Time & Jump Buffer → Sprünge fühlen sich fair an
    this.coyote = onGround ? PHYSICS.COYOTE_MS : this.coyote - delta;
    this.jumpBuffer = input.justPressed('jump') ? PHYSICS.JUMP_BUFFER_MS : this.jumpBuffer - delta;

    // Horizontal: sanft auf Zielgeschwindigkeit beschleunigen
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const accel = (onGround ? PHYSICS.ACCEL_GROUND : PHYSICS.ACCEL_AIR) * delta / 1000;
    const diff = dir * PHYSICS.RUN_SPEED - body.velocity.x;
    body.setVelocityX(body.velocity.x + Phaser.Math.Clamp(diff, -accel, accel));

    // Springen (mit Strecken der Figur)
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      body.setVelocityY(-PHYSICS.JUMP_VELOCITY);
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.sx = 0.8; this.sy = 1.22;
      scene.fx.dust(sprite.x, body.bottom, 4);
      Sfx.play(scene, 'jump');
    }
    // Sprungtaste früh losgelassen → niedriger springen
    if (input.justReleased('jump') && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * PHYSICS.JUMP_CUT);
    }

    // Landung: kurz stauchen + Staub
    if (onGround && !this.wasOnGround && this.prevVy > 220) {
      this.sx = 1.25; this.sy = 0.8;
      scene.fx.dust(sprite.x, body.bottom, 6);
      Sfx.play(scene, 'land');
    }
    // Laufstaub
    if (onGround && Math.abs(body.velocity.x) > 150 && time > this.nextDust) {
      scene.fx.dust(sprite.x - Math.sign(body.velocity.x) * 6, body.bottom, 2);
      this.nextDust = time + 170;
    }
    this.wasOnGround = onGround;
    this.prevVy = body.velocity.y;

    // Blickrichtung & Animation (auf der sichtbaren Figur)
    if (dir !== 0) view.setFlipX(dir < 0);
    if (!onGround) {
      view.anims.stop();
      view.setFrame(charFrame(this.def.texture, body.velocity.y < 0 ? 'jump' : 'fall'));
    } else if (Math.abs(body.velocity.x) > 20) {
      view.anims.play(`${this.def.texture}-walk`, true);
    } else {
      view.anims.stop();
      view.setFrame(charFrame(this.def.texture, 'idle'));
    }
  }

  /** Sichtbare Figur, Schatten und Stauchen/Strecken nachführen. */
  updateView(time, delta) {
    const relax = 1 - Math.pow(0.8, delta / 16.67);
    const b = this.sprite.body;
    this.sx += (1 - this.sx) * relax;
    this.sy += (1 - this.sy) * relax;
    let sy = this.sy;
    if (this.onGround && Math.abs(b.velocity.x) < 20) sy *= 1 + Math.sin(time / 420) * 0.015;   // ruhiges Atmen
    this.view.setPosition(this.sprite.x, this.sprite.y + 16).setScale(this.sx, sy);
    this.shadow.setPosition(this.sprite.x, b.bottom + 1)
      .setAlpha(this.respawning ? 0 : (this.onGround ? 0.35 : 0.12))
      .setScale(this.onGround ? 1 : 0.7, 1);
  }

  /** Zurück zum letzten Checkpoint ('water' = mit Spritzer, sonst Absturz). */
  respawn(reason = 'fall') {
    const scene = this.scene;
    if (this.respawning || scene.completed) return;
    this.respawning = true;
    const s = this.sprite;
    s.body.setVelocity(0, 0);
    s.body.enable = false;
    if (reason === 'water') {
      Sfx.play(scene, 'splash');
      scene.fx.splash(s.x, s.y);
    } else {
      Sfx.play(scene, 'respawn');
    }
    scene.cameras.main.shake(150, 0.006);

    scene.tweens.add({
      targets: this.view, alpha: 0, duration: 250,
      onComplete: () => {
        s.setPosition(this.checkpoint.x, this.checkpoint.y);
        s.body.enable = true;
        s.body.reset(this.checkpoint.x, this.checkpoint.y);
        this.respawning = false;
        this.sx = 0.7; this.sy = 1.3;
        // kurz blinken
        scene.tweens.add({ targets: this.view, alpha: { from: 0.2, to: 1 }, duration: 120, repeat: 4, yoyo: true,
          onComplete: () => this.view.setAlpha(1) });
      }
    });
  }

  /** Jubelsprung, wenn beide am Ziel sind. */
  celebrate() {
    this.sprite.body.setVelocityX(0);
    this.view.anims.stop();
    this.view.setFrame(charFrame(this.def.texture, 'jump'));
    this.sx = 0.8; this.sy = 1.25;
    this.scene.tweens.add({ targets: this.sprite, y: this.sprite.y - 20, duration: 220, yoyo: true, repeat: 2, ease: 'Quad.out' });
  }
}
