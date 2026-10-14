/* =====================================================================
 * Unstuck.js – Feststecken erkennen und auflösen
 *
 * Steckt ein Spieler oder Block in fester Geometrie (z. B. weil gerade ein
 * Tor zugeht, Kisten erscheinen oder eine Zugbrücke aufschlägt), wird er
 * sanft an die nächste freie Stelle geschoben.
 *
 *   scene.unstuck.resolve()            jeden Frame (erst nach 2 Frames im Fels)
 *   scene.unstuck.resolve(true)        sofort – nach dem Erscheinen von Geometrie
 *   scene.unstuck.unstick(body, 'side') einen Körper direkt freischieben
 *
 * Feste Geometrie = Gelände, Tore/Brücken, Aufzüge und schiebbare Blöcke.
 * ===================================================================== */

class Unstuck {
  constructor(scene) {
    this.scene = scene;
  }

  /** Gehört dieses Objekt zur festen Geometrie (Gelände, Tore, Kisten, Aufzüge, Blöcke)? */
  isBlocking(go) {
    const s = this.scene;
    if (!go || !go.body || !go.body.enable) return false;
    return s.solids.contains(go) || s.gates.contains(go) ||
      (s.liftSprites && s.liftSprites.has(go)) || (s.blocks && s.blocks.includes(go));
  }

  /** Feste Körper, die diesen Körper (leicht verkleinert) überlappen. */
  embedding(body, inset = 3, ox = 0, oy = 0) {
    const hits = this.scene.physics.overlapRect(body.x + inset + ox, body.y + inset + oy,
      body.width - inset * 2, body.height - inset * 2, true, true);
    return hits.filter(h => h !== body && this.isBlocking(h.gameObject));
  }

  /** Nächste freie Position suchen: zuerst nach oben (oder seitlich), dann diagonal. */
  freeOffset(body, prefer = 'up') {
    for (let d = 4; d <= 6 * TILE; d += 4) {
      const up = [[0, -d]], side = [[-d, 0], [d, 0]], diag = [[-d, -d], [d, -d]];
      const order = prefer === 'side' ? side.concat(up, diag) : up.concat(side, diag);
      for (const [ox, oy] of order) {
        const x = body.x + ox, y = body.y + oy;
        if (x < 0 || x + body.width > this.scene.worldWidth || y < 0) continue;
        if (this.embedding(body, 1, ox, oy).length === 0) return { x: ox, y: oy };
      }
    }
    return null;
  }

  /** Körper sanft an die nächste freie Stelle setzen. */
  unstick(body, prefer = 'up') {
    const scene = this.scene;
    const off = this.freeOffset(body, prefer);
    if (!off) return false;
    const go = body.gameObject;
    body.reset(go.x + off.x, go.y + off.y);
    body.setVelocity(0, 0);
    const player = scene.players && scene.players.find(p => p.sprite === go);
    if (player) { player.sx = 1.25; player.sy = 0.8; }
    scene.fx.dust(go.x, body.bottom, 5);
    Sfx.play(scene, 'pop');
    return true;
  }

  /**
   * Prüft Spieler & Blöcke. Normal erst nach 2 Frames im Fels (gegen
   * Fehlalarme), mit now=true sofort – z. B. wenn gerade Kisten erschienen.
   */
  resolve(now = false, prefer = 'up') {
    const scene = this.scene;
    const check = (body, holder) => {
      if (!body.enable) return;
      if (this.embedding(body).length) {
        holder.stuckFrames = (holder.stuckFrames || 0) + 1;
        if (now || holder.stuckFrames >= 2) { this.unstick(body, prefer); holder.stuckFrames = 0; }
      } else {
        holder.stuckFrames = 0;
      }
    };
    scene.players.forEach(p => { if (!p.respawning) check(p.sprite.body, p); });
    (scene.blocks || []).forEach(block => check(block.body, block));
  }
}
