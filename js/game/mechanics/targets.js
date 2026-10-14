/* =====================================================================
 * targets.js – Register der Ziel-Typen (was Auslöser schalten)
 *
 * Jeder Typ ist ein Objekt mit (alle optional):
 *   terrain / water          Zellen zählen als Gelände bzw. Wasser (Kartenaufbau)
 *   cell(sys, group, c, r, surface)   Kachel für eine Kartenzelle anlegen → Sprite
 *   create(sys, group)       nach dem Kartenaufbau: Objekt aus allen Zellen bauen
 *   apply(sys, group, active, instant)  Signal an/aus umsetzen (instant = ohne Animation)
 *   preUpdate(sys, group, delta)  jeden Frame VOR den Auslösern
 *   update(sys, group, delta)     jeden Frame NACH dem Schalten der Ziele
 *   render(sys, group)       rein optisch, läuft auch nach dem Levelende
 *
 * group = { char, kind, cfg, cells: [{c, r}], tiles, active, bounds, timers }
 * In levels.js: targets: { D: 'door', E: { kind: 'lift', dy: -4 } }
 * ===================================================================== */

/** Tor- oder Kisten-Kachel (an/aus schaltbarer Kollisionskörper). */
function addGateTile(sys, group, c, r, texture, depth) {
  const tile = sys.scene.gates.create(c * TILE + TILE / 2, r * TILE + TILE / 2, texture).setDepth(depth);
  if (group.cfg.color && SEQ_COLORS[group.cfg.color]) tile.setTint(SEQ_COLORS[group.cfg.color]);
  return tile;
}

const TARGET_TYPES = {
  // Tor: active = offen (kein Kollisionskörper, gleitet nach oben weg)
  door: {
    cell: (sys, group, c, r) => addGateTile(sys, group, c, r, 'door', DEPTH.DOOR),
    apply(sys, group, active, instant) {
      const scene = sys.scene;
      const solid = !active;
      group.tiles.forEach(tile => {
        tile.body.enable = solid;
        const y = solid ? tile.baseY : tile.baseY - group.bounds.height;
        if (instant) tile.y = y;
        else scene.tweens.add({ targets: tile, y, duration: solid ? 180 : 450, ease: 'Quad.inOut' });
      });
      if (solid && !instant) scene.unstuck.resolve(true, 'side');
      if (!instant) {
        Sfx.play(scene, 'door');
        scene.toast(active ? 'Das Tor ist offen!' : 'Das Tor schliesst sich …', active ? '#7dff9a' : '#ffb070');
      }
    }
  },

  // Kisten-Brücke: active = Kisten da (fest), sonst nur als "Geist" sichtbar
  bridge: {
    cell: (sys, group, c, r) => addGateTile(sys, group, c, r, 'crate', DEPTH.TERRAIN),
    apply(sys, group, active, instant) {
      const scene = sys.scene;
      group.tiles.forEach((tile, i) => {
        tile.body.enable = active;
        tile.setAlpha(active ? 1 : 0.25);
        if (active && !instant) {
          tile.setScale(0.2);
          scene.tweens.add({ targets: tile, scale: 1, duration: 200, delay: i * 30, ease: 'Back.out' });
        }
      });
      if (active && !instant) scene.unstuck.resolve(true);       // niemand darf in einer neuen Kiste stecken
      if (!instant) {
        Sfx.play(scene, active ? 'bridge' : 'door');
        if (active) scene.toast('Die Kisten stehen bereit!', '#7dff9a');
      }
    }
  },

  // Wasser: Gefahr wie '~', aber abschaltbar. active = abgelassen.
  // Das Wasser fliesst Reihe für Reihe von oben ab bzw. steigt von unten
  // wieder an. Wer dann noch auf einem Stein im Bach steht, wird nass.
  water: {
    water: true,
    cell: (sys, group, c, r, surface) => sys.scene.createWaterTile(c * TILE + TILE / 2, r * TILE + TILE / 2, surface, c),
    apply(sys, group, drained, instant) {
      const scene = sys.scene;
      const ROW_DELAY = 260;
      const rows = [...new Set(group.tiles.map(t => t.baseY))].sort((a, b) => a - b); // oben → unten
      group.timers.forEach(timer => timer.remove());
      group.timers = [];

      rows.forEach((rowY, i) => {
        const order = drained ? i : rows.length - 1 - i;   // ablassen: oben zuerst, füllen: unten zuerst
        const apply = () => group.tiles.filter(t => t.baseY === rowY).forEach(tile => {
          tile.body.enable = !drained;
          if (instant) tile.setAlpha(drained ? 0 : 1);
          else scene.tweens.add({ targets: tile, alpha: drained ? 0 : 1, duration: 200 });
        });
        if (instant) apply();
        else group.timers.push(scene.time.delayedCall(order * ROW_DELAY, apply));
      });

      if (!instant) {
        Sfx.play(scene, drained ? 'waterDown' : 'waterUp');
        scene.toast(drained ? 'Der Wasserstand sinkt!' : 'Achtung, das Wasser steigt!', drained ? '#7dd8ff' : '#ffb070');
      }
    }
  },

  // Aufzug: { kind: 'lift', dx, dy, mode: 'hold' | 'ferry', speed }
  // active = fährt zum Ziel (hold) bzw. pendelt (ferry); sonst zurück nach Hause
  lift: {
    create(sys, group) {
      const scene = sys.scene;
      const cs = group.cells.map(c => c.c);
      const r = group.cells[0].r;
      const x0 = Math.min(...cs) * TILE, y0 = r * TILE, w = (Math.max(...cs) + 1) * TILE - x0;
      const dx = (group.cfg.dx || 0) * TILE, dy = (group.cfg.dy || 0) * TILE;

      // Gestrichelte Fahrspur, damit man sieht, wohin der Aufzug fährt
      const path = scene.add.graphics().setDepth(DEPTH.DECO + 0.4);
      const from = { x: x0 + w / 2, y: y0 + 8 }, to = { x: from.x + dx, y: from.y + dy };
      const len = Math.hypot(dx, dy);
      for (let d = 0; d < len; d += 10) {
        const t = d / len;
        path.fillStyle(0xffffff, 0.35).fillCircle(from.x + dx * t, from.y + dy * t, 1.5);
      }
      path.lineStyle(2, 0xffffff, 0.45).strokeCircle(to.x, to.y, 5).strokeCircle(from.x, from.y, 5);

      const sprite = scene.add.tileSprite(x0, y0, w, 16, 'liftTile').setOrigin(0).setDepth(DEPTH.MECH);
      scene.physics.add.existing(sprite);
      sprite.body.setAllowGravity(false);
      sprite.body.setImmovable(true);
      sprite.body.pushable = false;

      group.lift = {
        group, sprite, path,
        home: { x: x0, y: y0 }, away: { x: x0 + dx, y: y0 + dy },
        speed: group.cfg.speed || 90, mode: group.cfg.mode || 'hold',
        leg: 'away', wait: 0, moving: false
      };
    },
    apply(sys, group, active) {
      const lift = group.lift;
      lift.leg = 'away';
      lift.wait = 0;
      lift.path.setAlpha(active ? 1 : 0.6);
    },
    update(sys, group, delta) {
      const scene = sys.scene;
      const L = group.lift;
      const body = L.sprite.body;
      let target;
      if (L.mode === 'ferry' && L.group.active) {
        if (L.wait > 0) { L.wait -= delta; body.setVelocity(0, 0); return; }
        target = L.leg === 'away' ? L.away : L.home;
      } else {
        target = L.group.active ? L.away : L.home;
      }

      const dx = target.x - L.sprite.x, dy = target.y - L.sprite.y;
      const dist = Math.hypot(dx, dy);
      const step = L.speed * delta / 1000;
      if (dist <= Math.max(step, 0.5)) {
        if (dist > 0) body.reset(target.x, target.y);
        body.setVelocity(0, 0);
        if (L.moving) { L.moving = false; Sfx.play(scene, 'liftStop'); }
        if (L.mode === 'ferry' && L.group.active) { L.leg = L.leg === 'away' ? 'home' : 'away'; L.wait = 700; }
        return;
      }
      const vx = dx / dist * L.speed, vy = dy / dist * L.speed;
      if (this.wouldCrush(scene, L, vy)) { body.setVelocity(0, 0); return; }   // lieber anhalten als einklemmen
      if (!L.moving) { L.moving = true; Sfx.play(scene, 'liftStart'); }
      body.setVelocity(vx, vy);
    },
    /** Würde der Aufzug jemanden an die Decke drücken oder von oben einklemmen? */
    wouldCrush(scene, L, vy) {
      const lb = L.sprite.body;
      const bodies = scene.players.filter(p => !p.respawning).map(p => p.sprite.body).concat(scene.blocks.map(b => b.body));
      const overlapX = b => b.right > lb.left + 2 && b.left < lb.right - 2;
      if (vy < 0) return bodies.some(b => overlapX(b) && Math.abs(b.bottom - lb.top) < 4 && b.blocked.up);
      if (vy > 0) return bodies.some(b => overlapX(b) && b.top >= lb.bottom - 4 && b.top <= lb.bottom + 6);
      return false;
    }
  },

  // Zugbrücke: { kind: 'drawbridge', pivot: 'left' | 'right' }
  // active = heruntergelassen (fest erst nach dem Aufschlagen), sonst hochgeklappt
  drawbridge: {
    create(sys, group) {
      const scene = sys.scene;
      const cs = group.cells.map(c => c.c);
      const r = group.cells[0].r;
      const minC = Math.min(...cs), maxC = Math.max(...cs);
      const pivotLeft = (group.cfg.pivot || 'left') === 'left';
      const px = pivotLeft ? minC * TILE : (maxC + 1) * TILE;
      const py = r * TILE + 6;
      const length = (maxC - minC + 1) * TILE;

      const post = scene.add.image(px + (pivotLeft ? -6 : 6), r * TILE, 'bridgePost').setOrigin(0.5, 1).setDepth(DEPTH.MECH - 0.1);
      const plank = scene.add.tileSprite(px, py, length, 12, 'bridgePlank').setOrigin(pivotLeft ? 0 : 1, 0.5).setDepth(DEPTH.MECH);
      const chain = scene.add.graphics().setDepth(DEPTH.MECH + 0.1);
      const hits = group.cells.map(({ c }) => {
        const hit = scene.gates.create(c * TILE + TILE / 2, py, 'bridgeHit').setVisible(false);
        hit.body.enable = false;
        return hit;
      });

      group.bridge = {
        group, plank, post, chain, hits, length, pivotLeft,
        pivot: { x: px, y: py },
        postTop: { x: post.x, y: r * TILE - 42 },
        raised: pivotLeft ? -90 : 90
      };
    },
    apply(sys, group, lowered, instant) {
      const scene = sys.scene;
      const br = group.bridge;
      scene.tweens.killTweensOf(br.plank);
      if (instant) {
        br.plank.setAngle(lowered ? 0 : br.raised);
        br.hits.forEach(h => { h.body.enable = lowered; });
        return;
      }
      if (lowered) {
        Sfx.play(scene, 'bridgeDown');
        scene.tweens.add({
          targets: br.plank, angle: 0, duration: 900, ease: 'Bounce.out',
          onComplete: () => {
            br.hits.forEach(h => { h.body.enable = true; });
            scene.unstuck.resolve(true);
            Sfx.play(scene, 'bridgeThud');
            scene.cameras.main.shake(120, 0.004);
          }
        });
        scene.toast('Die Brücke senkt sich!', '#7dff9a');
      } else {
        br.hits.forEach(h => { h.body.enable = false; });
        Sfx.play(scene, 'bridgeDown');
        scene.tweens.add({ targets: br.plank, angle: br.raised, duration: 700, ease: 'Sine.inOut' });
        scene.toast('Die Brücke klappt hoch!', '#ffb070');
      }
    },
    /** Kette vom Pfosten zur Brückenspitze. */
    render(sys, group) {
      const br = group.bridge;
      const a = Phaser.Math.DegToRad(br.plank.angle);
      const dir = br.pivotLeft ? 1 : -1;
      const tipX = br.pivot.x + Math.cos(a) * br.length * dir;
      const tipY = br.pivot.y + Math.sin(a) * br.length * dir;
      br.chain.clear().lineStyle(2, 0x3a3e46, 1).lineBetween(br.postTop.x, br.postTop.y, tipX, tipY);
    }
  },

  // Förderband: { kind: 'conveyor', off, on } – Geschwindigkeit (px/s, + = rechts)
  // ohne bzw. mit Signal. Die Maschinen-Kacheln sind festes Gelände.
  conveyor: {
    terrain: true,
    cell: (sys, group, c, r) => sys.scene.solids.create(c * TILE + TILE / 2, r * TILE + TILE / 2, 'conveyorBase').setDepth(DEPTH.TERRAIN),
    create(sys, group) {
      const cs = group.cells.map(c => c.c);
      const r = group.cells[0].r;
      const x0 = Math.min(...cs) * TILE, x1 = (Math.max(...cs) + 1) * TILE;
      const belt = sys.scene.add.tileSprite(x0, r * TILE, x1 - x0, 10, 'conveyorBelt').setOrigin(0).setDepth(DEPTH.TERRAIN + 0.3);
      group.conveyor = { group, belt, x0, x1, top: r * TILE, speed: 0 };
    },
    apply(sys, group, active, instant) {
      const cv = group.conveyor;
      cv.speed = active ? (group.cfg.on !== undefined ? group.cfg.on : 80) : (group.cfg.off || 0);
      if (!instant) {
        Sfx.play(sys.scene, 'conveyor');
        sys.scene.toast(cv.speed > 0 ? 'Das Band läuft nach rechts!' : cv.speed < 0 ? 'Das Band läuft nach links!' : 'Das Band steht.', '#7dd8ff');
      }
    },
    /** Gurt scrollen, Spieler und Blöcke auf dem Band mitnehmen (vor den Auslösern). */
    preUpdate(sys, group, delta) {
      const scene = sys.scene;
      const cv = group.conveyor;
      cv.belt.tilePositionX -= cv.speed * delta / 1000;
      if (!cv.speed) return;
      const onBelt = b => b.right > cv.x0 + 2 && b.left < cv.x1 - 2 && Math.abs(b.bottom - cv.top) < 3;
      scene.players.forEach(p => {
        const b = p.sprite.body;
        if (!p.respawning && onBelt(b) && (b.blocked.down || b.touching.down)) p.sprite.x += cv.speed * delta / 1000;
      });
      scene.blocks.forEach(block => {
        if (onBelt(block.body)) block.body.velocity.x += cv.speed;   // nach BlockSystem.update() aufaddiert
      });
    }
  }
};
