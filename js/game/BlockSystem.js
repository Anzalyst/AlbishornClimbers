/* =====================================================================
 * BlockSystem.js – Schiebbare Kisten ('k') und Felsbrocken ('K')
 *
 * Ein Block bewegt sich nur, wenn genug Spieler in dieselbe Richtung
 * schieben (Kiste: 1, Felsbrocken: 2 – siehe BLOCKS in config.js).
 *
 *   const blocks = new BlockSystem(scene, spawns);   spawns: [{ x, y, texture, weight }]
 *   blocks.blocks          die Block-Sprites (für Collider, Schalter, Aufzüge)
 *   blocks.update(time)    jeden Frame
 * ===================================================================== */

class BlockSystem {
  constructor(scene, spawns) {
    this.scene = scene;
    this.blocks = spawns.map(spawn => {
      const block = scene.physics.add.sprite(spawn.x, spawn.y, spawn.texture).setDepth(DEPTH.OBJECT);
      // pushable = false: Spieler können den Block NICHT einfach wegdrücken –
      // ob er sich bewegt, entscheidet update() (genug Schieber?)
      block.body.pushable = false;
      block.body.setMaxVelocityY(PHYSICS.MAX_FALL);
      block.setCollideWorldBounds(true);
      block.spawn = spawn;
      block.weight = spawn.weight;
      block.wasOnGround = true;
      block.pushSoundAt = 0;
      block.stuckFrames = 0;
      // "Zu schwer!"-Hinweis über dem Block
      block.label = scene.add.text(spawn.x, spawn.y, '', {
        fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#000000', strokeThickness: 3, align: 'center'
      }).setOrigin(0.5, 1).setDepth(DEPTH.FX);
      return block;
    });
  }

  update(time) {
    const scene = this.scene;
    this.blocks.forEach(block => {
      const bb = block.body;
      const onGround = bb.blocked.down || bb.touching.down;
      let dir = 0, bestCount = 0;

      [-1, 1].forEach(d => {
        const count = this.countPushers(block, d);
        bestCount = Math.max(bestCount, count);
        if (onGround && count >= block.weight) dir = d;
      });

      bb.setVelocityX(dir * BLOCKS.PUSH_SPEED);

      // Schab-Geräusch beim Schieben, "Zu schwer!"-Hinweis wenn zu wenig Schieber
      if (dir !== 0 && time > block.pushSoundAt) {
        Sfx.play(scene, 'push');
        block.pushSoundAt = time + 160;
        scene.fx.dust(block.x - dir * block.displayWidth / 2, bb.bottom, 1);
      }
      const tooHeavy = dir === 0 && bestCount > 0 && bestCount < block.weight;
      block.label.setText(tooHeavy ? TXT.tooHeavy : '')
        .setPosition(block.x, bb.top - 6);
      if (tooHeavy && !block.wasTooHeavy) Sfx.play(scene, 'tooHeavy');
      block.wasTooHeavy = tooHeavy;

      // Aufprall-Rumms nach einem Sturz (z. B. Kiste über die Kante geschubst)
      if (onGround && !block.wasOnGround && block.fallSpeed > 200) {
        Sfx.play(scene, 'blockLand');
        scene.cameras.main.shake(100, 0.004 * block.weight);
        scene.fx.dust(block.x, bb.bottom, 8);
      }
      block.wasOnGround = onGround;
      block.fallSpeed = bb.velocity.y;

      // Aus der Welt gefallen → zurück an den Startplatz (und dort freischieben)
      if (block.y > scene.worldHeight + 64) {
        bb.reset(block.spawn.x, block.spawn.y);
        scene.unstuck.unstick(bb);
        scene.toast(TXT.blockBack, '#ffffff');
      }
    });
  }

  /**
   * Wie viele Spieler schieben den Block in Richtung d? Da die Spieler
   * durcheinander durchlaufen, zählt jeder, der direkt am Block steht
   * oder höchstens eine Körperbreite dahinter.
   */
  countPushers(block, d) {
    const bb = block.body;
    const edge = d > 0 ? bb.left : bb.right;
    return this.scene.players.filter(p => {
      const b = p.sprite.body;
      const pressing = d > 0 ? p.input.right : p.input.left;
      if (!pressing || p.respawning || !(b.blocked.down || b.touching.down)) return false;
      const face = d > 0 ? b.right : b.left;
      const gap = (edge - face) * d;                    // 0 = direkt dran
      const sameHeight = b.bottom > bb.top + 4 && b.top < bb.bottom;
      return sameHeight && gap > -4 && gap <= 18;
    }).length;
  }
}
