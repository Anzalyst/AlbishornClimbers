/* =====================================================================
 * art.js – Gelände, Objekte, Mechaniken und Hintergründe im Comic-Stil
 *
 * Tusche-Konturen, flächige Schatten, Schraffur und Raster (siehe
 * comicKit.js). Alle Texturen behalten ihre logische Grösse, Physik und
 * Level hängen davon ab. Art.createAll() läuft in der BootScene.
 * ===================================================================== */

const Art = {
  // ---------------------------------------------------------------------
  // Helfer
  // ---------------------------------------------------------------------
  /** Textur zeichnen (Zeichenkontext in logischen Pixeln, siehe Comic.tex). */
  canvas(scene, key, w, h, draw, opts) { return Comic.tex(scene, key, w, h, draw, opts); },

  /** Deterministischer Zufall – Kacheln sehen bei jedem Start gleich aus. */
  rng(seed) {
    let s = seed % 233280;
    return () => (s = (s * 9301 + 49297) % 233280) / 233280;
  },

  rect: (ctx, x, y, w, h, color) => Comic.fillRect(ctx, x, y, w, h, color),
  vgrad: (ctx, x, y, w, h, stops) => Comic.vgrad(ctx, x, y, w, h, stops),
  radial: (ctx, cx, cy, r, stops) => Comic.radial(ctx, cx, cy, r, stops),

  createAll(scene) {
    this.terrain(scene);
    this.water(scene);
    this.objects(scene);
    this.mechanisms(scene);
    this.backgrounds(scene);
    this.effects(scene);
  },

  /** Tanne mit gezackten Astetagen (Deko und Hintergründe). */
  fir(ctx, x, base, h, w, c = {}) {
    const C = Comic, lit = c.lit || '#3d9150', mid = c.mid || '#2a7240', dark = c.dark || '#1b5230';
    const lw = c.lw === undefined ? 1.2 : c.lw;
    const trunkH = h * 0.17;
    C.rr(ctx, x - w * 0.08, base - trunkH - 1, w * 0.16, trunkH + 1, 0.5);
    if (lw) C.ink(ctx, '#5a3a1c', lw * 0.8); else { ctx.fillStyle = dark; ctx.fill(); }
    const tiers = 4, body = h - trunkH;
    for (let t = tiers - 1; t >= 0; t--) {
      const top = base - h + (t / tiers) * body * 0.72;
      const bot = base - trunkH - (1 - (t + 1) / tiers) * body * 0.72 * 0.6;
      const hw = w / 2 * (0.4 + 0.6 * (t + 1) / tiers);
      const hh = bot - top;
      const pts = [[x, top], [x + hw * 0.56, top + hh * 0.64], [x + hw * 0.44, top + hh * 0.62], [x + hw, bot], [x + hw * 0.52, bot - hh * 0.06], [x, bot + 0.6],
        [x - hw * 0.52, bot - hh * 0.06], [x - hw, bot], [x - hw * 0.44, top + hh * 0.62], [x - hw * 0.56, top + hh * 0.64]];
      C.poly(ctx, pts);
      C.cel(ctx, mid, s => {
        C.poly(s, [[x + hw * 0.1, top], [x + hw * 1.2, bot + 1], [x + hw * 0.2, bot + 1]]); s.fillStyle = lit; s.fill();
        C.poly(s, [[x - hw * 0.1, top], [x - hw * 1.2, bot + 1], [x - hw * 0.34, bot + 1]]); s.fillStyle = dark; s.fill();
      }, lw);
    }
  },

  // ---------------------------------------------------------------------
  // Gelände
  // ---------------------------------------------------------------------
  /** Erde: warme Fläche, Schraffur-Flecken, Steinchen mit Tusche-Kontur. */
  soil(ctx, rnd, top = 0) {
    const C = Comic;
    C.fillRect(ctx, 0, top, TILE, TILE - top, '#8a5e3c');
    // Dunklere Flecken mit Federstrichen
    for (let i = 0; i < 3; i++) {
      const x = 3 + rnd() * 22, y = top + 2 + rnd() * Math.max(1, TILE - top - 10), w = 6 + rnd() * 5, h = 3 + rnd() * 3;
      ctx.save();
      C.ellipse(ctx, x + w / 2, y + h / 2, w / 2, h / 2);
      ctx.fillStyle = '#7a5032'; ctx.fill();
      ctx.clip();
      C.hatch(ctx, x, y, w, h, 1.5, 'rgba(50,28,12,0.55)', 0.4);
      ctx.restore();
    }
    // Steinchen: Licht oben, Tusche rundum
    for (let i = 0; i < 3; i++) {
      const w = 2.2 + rnd() * 2.2, h = 1.4 + rnd() * 1.2;
      const x = 4 + rnd() * (TILE - 8), y = top + 3 + rnd() * Math.max(1, TILE - top - 6);
      C.ellipse(ctx, x, y, w, h, (rnd() - 0.5) * 0.6);
      C.cel(ctx, '#b18c64', c => C.fillRect(c, x - w, y, w * 2, h, '#8f6c48'), 0.55, '#3a2412');
    }
    // Wurzel-Häkchen
    for (let i = 0; i < 2; i++) {
      const x = 3 + rnd() * 24, y = top + 3 + rnd() * Math.max(1, TILE - top - 6);
      C.curve(ctx, [[x, y], [x + 1.6, y + 1.2], [x + 3, y + 0.6]]);
      ctx.strokeStyle = 'rgba(40,22,10,0.7)'; ctx.lineWidth = 0.55; ctx.stroke();
    }
  },

  /** Periodische Graskante (wiederholt sich pro Kachel, damit die Kacheln nahtlos sind). */
  grassEdge(x, seed) {
    const t = x / TILE * Math.PI * 2;
    return 9 + Math.sin(t * 2 + seed) * 1.6 + Math.sin(t * 5 + seed * 2) * 1.1 + Math.sin(t * 9 + seed * 3) * 0.6;
  },

  terrain(scene) {
    const C = Comic;
    // Erde (2 Varianten)
    [11, 23].forEach((seed, i) => this.canvas(scene, `earth${i}`, TILE, TILE, ctx => this.soil(ctx, this.rng(seed))));

    // Erde mit Grasdecke (3 Varianten, eine mit Blümchen)
    [5, 17, 29].forEach((seed, i) => this.canvas(scene, `grass${i}`, TILE, TILE, ctx => {
      const rnd = this.rng(seed);
      this.soil(ctx, rnd, 5);
      const edge = [];
      for (let x = 0; x <= TILE; x += 1) edge.push([x, this.grassEdge(x, seed)]);
      // Grasdecke: heller Streifen oben, Tusche an der Unterkante
      C.poly(ctx, [[0, 0], [TILE, 0], ...edge.slice().reverse()]);
      ctx.save();
      ctx.fillStyle = '#62b548'; ctx.fill();
      ctx.clip();
      C.fillRect(ctx, 0, 0, TILE, 4.2, '#93dd6c');
      for (let k = 0; k < 7; k++) {
        const x = rnd() * TILE, y = 4 + rnd() * 3;
        C.curve(ctx, [[x, y + 2.4], [x + 0.4, y + 1], [x + 1.2, y]]);
        ctx.strokeStyle = '#3f8c33'; ctx.lineWidth = 0.65; ctx.stroke();
      }
      ctx.restore();
      C.poly(ctx, edge, false);
      ctx.strokeStyle = C.INK; ctx.lineWidth = 1.05; ctx.lineCap = 'butt'; ctx.stroke(); ctx.lineCap = 'round';
      C.fillRect(ctx, 0, 0, TILE, 0.9, C.INK);                    // Tusche-Linie auf der Oberkante
      if (i === 2) {
        [[6, '#ffffff'], [19, '#ffd84a'], [26, '#ff9ac8']].forEach(([x, col]) => {
          C.burst(ctx, x, 3.6, 2, 1, 5);
          C.ink(ctx, col, 0.4);
          C.ellipse(ctx, x, 3.6, 0.6, 0.6); ctx.fillStyle = '#f2a020'; ctx.fill();
        });
      }
    }));

    // Fels: kantige Platten mit Tusche-Fugen, Schraffur und etwas Moos
    this.canvas(scene, 'rock', TILE, TILE, ctx => {
      C.fillRect(ctx, 0, 0, TILE, TILE, '#3c3d46');
      const slabs = [[[0.6, 0.6], [15, 0.6], [14, 13], [0.6, 14.5]], [[16, 0.6], [31.4, 0.6], [31.4, 10], [15, 11.6]],
        [[15, 12.6], [31.4, 11], [31.4, 22], [20, 23.4], [14.6, 20]], [[0.6, 15.6], [13.6, 14.2], [13.6, 21], [10, 31.4], [0.6, 31.4]],
        [[11, 31.4], [14.8, 21.4], [19.6, 24.6], [31.4, 23.2], [31.4, 31.4]]];
      slabs.forEach((pts, i) => {
        C.poly(ctx, pts);
        C.cel(ctx, i % 2 ? '#8e929c' : '#9ca0aa', c => {
          const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
          const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
          C.fillRect(c, x0, y1 - (y1 - y0) * 0.38, x1 - x0, (y1 - y0) * 0.4, '#70747e');
          C.fillRect(c, x0, y0, x1 - x0, 1.4, '#c0c4cc');
          C.hatch(c, x0, y1 - (y1 - y0) * 0.36, x1 - x0, (y1 - y0) * 0.36, 2.2, 'rgba(23,18,31,0.42)', 0.45);
        }, 0);
      });
      [[6, 4.5, 3.2, 1.4], [24, 16.4, 2.4, 1.2]].forEach(([x, y, a, b]) => {
        C.ellipse(ctx, x, y, a, b); C.ink(ctx, '#6f9a44', 0.45);
      });
    });

    // Bachstein, nass glänzend
    this.canvas(scene, 'stone', TILE, TILE, ctx => {
      C.fillRect(ctx, 0, 2, TILE, TILE, '#3c3d46');
      C.blob(ctx, [[-2, 4], [8, 1.4], [24, 1.4], [34, 4], [34, 34], [-2, 34]]);
      C.cel(ctx, '#8d929c', c => {
        C.fillRect(c, 0, 19, TILE, 14, '#6c707a');
        C.hatch(c, 0, 20, TILE, 12, 2.6, 'rgba(23,18,31,0.42)', 0.5);
        C.ellipse(c, 11, 6.5, 6, 1.6, -0.1); c.fillStyle = '#e0e4ea'; c.fill();
        C.ellipse(c, 24, 7, 4, 1.8); c.fillStyle = '#5f8f4a'; c.fill();
      }, 1);
    });

    // Tusche-Kanten an freien Seiten: dunkler Rand plus Raster-Schatten
    this.canvas(scene, 'shadeL', TILE, TILE, ctx => {
      C.halftone(ctx, 0, 0, 7, TILE, 'rgba(23,18,31,0.42)', 2.4, u => 1 - u);
      C.fillRect(ctx, 0, 0, 1.1, TILE, C.INK);
    });
    this.canvas(scene, 'shadeR', TILE, TILE, ctx => {
      C.halftone(ctx, TILE - 7, 0, 7, TILE, 'rgba(23,18,31,0.42)', 2.4, u => u);
      C.fillRect(ctx, TILE - 1.1, 0, 1.1, TILE, C.INK);
    });
    this.canvas(scene, 'grassLip', 6, 12, ctx => {
      C.blob(ctx, [[-1, -1], [6, -1], [5.6, 5], [4.4, 9.6], [3, 11], [1.8, 7], [0.6, 4.6]]);
      C.cel(ctx, '#62b548', c => C.fillRect(c, 0, 0, 6, 4, '#93dd6c'), 0.8);
    }, { ss: 3 });
    // Grasbüschel als Deko auf der Oberfläche
    this.canvas(scene, 'tuft', 10, 8, ctx => {
      [[1.4, 3, -1], [3.6, 1, -0.5], [5.4, 0.2, 0.4], [7.8, 2, 1]].forEach(([x, top, lean]) => {
        C.curve(ctx, [[x, 8], [x, (8 + top) / 2], [x + lean, top]]);
        ctx.strokeStyle = C.INK; ctx.lineWidth = 1.5; ctx.stroke();
        C.curve(ctx, [[x, 8], [x, (8 + top) / 2], [x + lean, top]]);
        ctx.strokeStyle = '#7ccc58'; ctx.lineWidth = 0.75; ctx.stroke();
      });
    }, { ss: 3 });

    // Holzplattform: Brett mit Maserung, Tusche-Kontur, Metallwinkel
    this.canvas(scene, 'platform', TILE, 12, ctx => this.plank(ctx, TILE, 11, '#d39a5a', '#9b6634'));
    this.canvas(scene, 'platformShadow', TILE, 12, ctx => {
      C.halftone(ctx, 0, 0, TILE, 12, 'rgba(23,18,31,0.34)', 3, (u, v) => 1 - v);
    });
  },

  /** Holzbrett (kachelbar in x): Maserung, Astloch, oben Licht, unten Schatten. */
  plank(ctx, w, h, base, dark, seam = true) {
    const C = Comic;
    C.fillRect(ctx, 0, 0.6, w, h - 1, base);
    C.fillRect(ctx, 0, h * 0.62, w, h * 0.38, dark);
    C.fillRect(ctx, 0, 0.6, w, 1.2, 'rgba(255,240,205,0.7)');
    ctx.strokeStyle = 'rgba(60,32,12,0.6)'; ctx.lineWidth = 0.55;
    Comic.curve(ctx, [[2, h * 0.34], [9, h * 0.26], [15, h * 0.4]]); ctx.stroke();
    Comic.curve(ctx, [[18, h * 0.62], [24, h * 0.5], [w - 2, h * 0.66]]); ctx.stroke();
    C.ellipse(ctx, 22, h * 0.32, 1.7, 0.95);
    ctx.stroke();
    C.fillRect(ctx, 0, 0, w, 0.9, C.INK);
    C.fillRect(ctx, 0, h - 1, w, 1, C.INK);
    if (seam) C.fillRect(ctx, w - 0.7, 0, 0.7, h, C.INK);
  },

  // ---------------------------------------------------------------------
  // Wasser: Oberfläche mit 4 Wellen-Frames, darunter tiefes Wasser
  // ---------------------------------------------------------------------
  water(scene) {
    const C = Comic, FRAMES = 4;
    const tex = this.canvas(scene, 'waterTop', TILE * FRAMES, TILE, ctx => {
      for (let f = 0; f < FRAMES; f++) {
        ctx.save();
        ctx.translate(f * TILE, 0);
        ctx.beginPath(); ctx.rect(0, 0, TILE, TILE); ctx.clip();
        C.fillRect(ctx, 0, 0, TILE, TILE, 'rgba(60,150,226,0.86)');
        C.halftone(ctx, 0, 8, TILE, 24, 'rgba(20,70,160,0.5)', 4, (u, v) => v);
        const wave = x => 3.6 + Math.sin((x / TILE) * Math.PI * 2 * 2 + (f / FRAMES) * Math.PI * 2) * 1.5;
        const pts = [];
        for (let x = 0; x <= TILE; x += 1) pts.push([x, wave(x)]);
        C.poly(ctx, [[0, 0], [TILE, 0], ...pts.slice().reverse()]);
        ctx.fillStyle = 'rgba(190,232,255,0.55)'; ctx.fill();
        C.poly(ctx, pts, false);
        ctx.lineCap = 'butt';
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.lineCap = 'round';
        const sx = (f * 7) % TILE;
        C.curve(ctx, [[sx + 2, 12], [sx + 5, 10.8], [sx + 8, 12]]);
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 0.9; ctx.stroke();
        C.curve(ctx, [[(sx + 15) % 26, 20], [(sx + 15) % 26 + 3, 18.8], [(sx + 15) % 26 + 6, 20]]);
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.stroke();
        ctx.restore();
      }
    });
    for (let f = 0; f < FRAMES; f++) tex.add(f, 0, f * TILE, 0, TILE, TILE);
    this.canvas(scene, 'waterDeep', TILE, TILE, ctx => {
      C.fillRect(ctx, 0, 0, TILE, TILE, 'rgba(32,92,186,0.92)');
      C.halftone(ctx, 0, 0, TILE, TILE, 'rgba(14,50,130,0.55)', 4, () => 0.75);
      C.curve(ctx, [[5, 9], [8, 8], [11, 9]]);
      ctx.strokeStyle = 'rgba(180,225,255,0.4)'; ctx.lineWidth = 0.9; ctx.stroke();
      C.curve(ctx, [[19, 22], [22, 21], [26, 22]]);
      ctx.stroke();
    });
    if (!scene.anims.exists('water-wave')) {
      scene.anims.create({
        key: 'water-wave',
        frames: [0, 1, 2, 3].map(frame => ({ key: 'waterTop', frame })),
        frameRate: 5, repeat: -1
      });
    }
  },

  // ---------------------------------------------------------------------
  // Objekte: Tor, Kisten, Felsbrocken
  // ---------------------------------------------------------------------
  woodCrate(ctx, arrows) {
    const C = Comic;
    C.rr(ctx, 0.7, 0.7, TILE - 1.4, TILE - 1.4, 1.5);
    C.cel(ctx, '#cf9a5c', c => {
      [[9, 0], [16, 1], [23, 0]].forEach(([y]) => C.line(c, [[0, y], [TILE, y]], 0.6, 'rgba(60,32,12,0.7)'));
      C.fillRect(c, 0, 18, TILE, 14, 'rgba(110,62,24,0.4)');
      // Diagonalstrebe
      C.poly(c, [[3, 7], [7, 3], [29, 25], [25, 29]]); C.ink(c, '#b57c42', 0.75);
      C.hatch(c, 18, 20, 12, 10, 2, 'rgba(50,26,10,0.45)', 0.45);
      // Rahmen
      [[0, 0, TILE, 4], [0, TILE - 4, TILE, 4], [0, 0, 4, TILE], [TILE - 4, 0, 4, TILE]].forEach(([x, y, w, h]) => {
        C.rr(c, x, y, w, h, 0); C.ink(c, '#e0b074', 0.75);
      });
    }, 1.4);
    [[3.4, 3.4], [28.6, 3.4], [3.4, 28.6], [28.6, 28.6]].forEach(([x, y]) => {
      C.ellipse(ctx, x, y, 1.4, 1.4); C.ink(ctx, '#9aa0aa', 0.6);
    });
    if (arrows) {
      // Pfeile nach links und rechts: Kiste lässt sich schieben
      C.poly(ctx, [[6.5, 16], [11.5, 11.5], [11.5, 14.2], [20.5, 14.2], [20.5, 11.5], [25.5, 16], [20.5, 20.5], [20.5, 17.8], [11.5, 17.8], [11.5, 20.5]]);
      C.ink(ctx, '#fff2c8', 0.9);
    }
  },

  /** Felsbrocken (44×44): unregelmässiger Umriss, Facetten, Risse, Moos – so sieht man das Rollen. */
  rockBody(ctx) {
    const C = Comic;
    const radii = [20, 19, 21, 18, 20, 21, 19, 20, 18, 21, 20, 19];
    const pt = (i, k = 1) => {
      const a = (i / radii.length) * Math.PI * 2;
      return [22 + Math.cos(a) * radii[i % radii.length] * k, 22 + Math.sin(a) * radii[i % radii.length] * k];
    };
    C.poly(ctx, radii.map((_, i) => pt(i)));
    C.cel(ctx, '#8a8176', c => {
      [[0, 2, '#9c9386'], [3, 5, '#6f675c'], [6, 8, '#958c7e'], [9, 11, '#655e54']].forEach(([a, b, col]) => {
        c.beginPath(); c.moveTo(22, 22);
        for (let i = a; i <= b; i++) c.lineTo(...pt(i, 1.05));
        c.closePath(); c.fillStyle = col; c.fill();
      });
      C.hatch(c, 26, 26, 18, 18, 2.4, 'rgba(23,18,31,0.4)', 0.5);
    }, 1.7);
    // Risse
    ctx.strokeStyle = C.INK; ctx.lineWidth = 1.05;
    ctx.beginPath();
    ctx.moveTo(8, 16); ctx.lineTo(17, 21); ctx.lineTo(14, 31); ctx.lineTo(19, 37);
    ctx.moveTo(26, 6); ctx.lineTo(29, 15); ctx.lineTo(38, 19); ctx.moveTo(29, 15); ctx.lineTo(27, 24);
    ctx.moveTo(30, 33); ctx.lineTo(36, 30);
    ctx.stroke();
    // Moos & Flechten
    C.ellipse(ctx, 13, 9, 5, 3, -0.5); C.ink(ctx, '#578a38', 0.7);
    C.ellipse(ctx, 12, 8, 2.5, 1.5, -0.5); ctx.fillStyle = '#7fb04e'; ctx.fill();
    [[33, 36], [9, 27], [24, 34]].forEach(([x, y]) => { C.ellipse(ctx, x, y, 1.3, 1.1); C.ink(ctx, '#c8c070', 0.4); });
  },

  /** Licht oben links, Raster-Schatten unten rechts (dreht nicht mit dem Brocken mit). */
  rockLight(ctx) {
    const C = Comic;
    ctx.save();
    C.ellipse(ctx, 22, 22, 18.5, 18.5); ctx.clip();
    C.halftone(ctx, 4, 4, 36, 36, 'rgba(15,12,22,0.62)', 3, (u, v) => Math.max(0, (u + v) * 0.85 - 0.72));
    ctx.restore();
    C.ellipse(ctx, 14, 12, 4.6, 2.4, -0.6); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
    C.curve(ctx, [[7, 22], [8, 14], [14, 7.5]]);
    ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 1.4; ctx.stroke();
  },

  objects(scene) {
    const C = Comic;
    this.canvas(scene, 'crate', TILE, TILE, ctx => this.woodCrate(ctx, false));
    this.canvas(scene, 'pushCrate', TILE, TILE, ctx => this.woodCrate(ctx, true));

    // Schiebbarer Felsbrocken (2×2 Kacheln): Design des Steinschlag-Brockens,
    // vergrössert. Er rollt beim Schieben → Licht & Schatten als eigenes,
    // nicht mitdrehendes Bild ('boulderShade', siehe BlockSystem)
    const rockScale = TILE * 2 / 44;
    this.canvas(scene, 'boulder', TILE * 2, TILE * 2, ctx => { ctx.scale(rockScale, rockScale); this.rockBody(ctx); });
    this.canvas(scene, 'boulderShade', TILE * 2, TILE * 2, ctx => { ctx.scale(rockScale, rockScale); this.rockLight(ctx); });

    // Tor: Holzbohlen mit Eisenbändern und Nieten
    this.canvas(scene, 'door', TILE, TILE, ctx => {
      C.fillRect(ctx, 0, 0, TILE, TILE, '#7a4f2a');
      [0, 8, 16, 24].forEach((x, i) => {
        C.fillRect(ctx, x, 0, 8, TILE, i % 2 ? '#84572f' : '#704725');
        C.fillRect(ctx, x + 5.6, 0, 2.4, TILE, 'rgba(23,18,31,0.25)');
        C.fillRect(ctx, x, 0, 1, TILE, C.INK);
      });
      [5, 21].forEach(y => {
        C.rr(ctx, -2, y, TILE + 4, 5.6, 0);
        C.cel(ctx, '#70747e', c => C.fillRect(c, 0, y, TILE, 1.6, '#b4b8c2'), 0.9);
        [3, 13, 23].forEach(x => { C.ellipse(ctx, x + 1, y + 2.8, 1.2, 1.2); C.ink(ctx, '#c4cad4', 0.5); });
      });
    });
  },

  // ---------------------------------------------------------------------
  // Mechaniken
  // ---------------------------------------------------------------------
  mechanisms(scene) {
    const C = Comic;
    // Aufzug-Plattform: Metall mit Warnstreifen
    this.canvas(scene, 'liftTile', TILE, 16, ctx => {
      C.fillRect(ctx, 0, 0, TILE, 12, '#b4b9c2');
      C.fillRect(ctx, 0, 0, TILE, 1.8, '#eef1f5');
      C.fillRect(ctx, 0, 7, TILE, 5, '#878d98');
      C.fillRect(ctx, 0, 0, TILE, 0.9, C.INK);
      [[4, 5], [28, 5]].forEach(([x, y]) => { C.ellipse(ctx, x, y, 1.4, 1.4); C.ink(ctx, '#e8ebf0', 0.6); });
      C.fillRect(ctx, 0, 11.4, TILE, 4.6, '#1c1e24');
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 12, TILE, 3.2); ctx.clip();
      ctx.fillStyle = '#f2c230';
      for (let x = -8; x < TILE; x += 8) { C.poly(ctx, [[x, 16], [x + 4, 16], [x + 8, 12], [x + 4, 12]]); ctx.fill(); }
      ctx.restore();
      C.fillRect(ctx, 0, 15.2, TILE, 0.8, C.INK);
    });

    // Förderband: Maschine + laufender Gurt (als TileSprite gescrollt)
    this.canvas(scene, 'conveyorBase', TILE, TILE, ctx => {
      C.fillRect(ctx, 0, 0, TILE, TILE, '#454a55');
      C.fillRect(ctx, 0, 0, 7, TILE, '#333741');
      C.hatch(ctx, 0, 22, TILE, 10, 2.6, 'rgba(10,8,16,0.4)', 0.5);
      C.ellipse(ctx, 16, 20, 9, 9);
      C.cel(ctx, '#7a818e', c => { C.fillRect(c, 7, 21, 18, 9, '#5a606c'); }, 1.2);
      ctx.strokeStyle = C.INK; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let a = 0; a < 6; a++) {
        const ang = (a / 6) * Math.PI * 2;
        ctx.moveTo(16 + Math.cos(ang) * 3, 20 + Math.sin(ang) * 3);
        ctx.lineTo(16 + Math.cos(ang) * 8, 20 + Math.sin(ang) * 8);
      }
      ctx.stroke();
      C.ellipse(ctx, 16, 20, 2.8, 2.8); C.ink(ctx, '#2c3038', 0.9);
      [[3, 12], [29, 12], [3, 29], [29, 29]].forEach(([x, y]) => { C.ellipse(ctx, x, y, 1.1, 1.1); C.ink(ctx, '#a8afba', 0.5); });
      C.fillRect(ctx, 0, 0, TILE, 1, C.INK);
    });
    this.canvas(scene, 'conveyorBelt', TILE, 10, ctx => {
      C.fillRect(ctx, 0, 0, TILE, 10, '#30343c');
      C.fillRect(ctx, 0, 0, TILE, 1.4, '#7a808c');
      C.fillRect(ctx, 0, 7, TILE, 3, '#1e2026');
      [2, 18].forEach(x => {
        C.poly(ctx, [[x, 2.2], [x + 3.4, 2.2], [x + 7, 5], [x + 3.4, 7.8], [x, 7.8], [x + 3.6, 5]]);
        C.ink(ctx, '#f2c230', 0);
      });
      C.fillRect(ctx, 0, 9.2, TILE, 0.8, C.INK);
    });

    // Zugbrücke: Planke, Pfosten mit Umlenkrolle, unsichtbarer Kollisionsklotz
    this.canvas(scene, 'bridgePlank', TILE, 12, ctx => {
      this.plank(ctx, TILE, 12, '#c48e52', '#8e5c2e');
      [[6, 2], [22, 2]].forEach(([x, y]) => {
        C.rr(ctx, x, y, 3.4, 8, 0.6);
        C.cel(ctx, '#d8c08a', c => {
          c.strokeStyle = 'rgba(90,60,20,0.8)'; c.lineWidth = 0.45;
          c.beginPath(); [4, 6, 8].forEach(yy => { c.moveTo(x, yy); c.lineTo(x + 3.4, yy - 0.8); }); c.stroke();
        }, 0.7);
      });
    });
    this.canvas(scene, 'bridgePost', 14, 48, ctx => {
      C.rr(ctx, 4, 6, 6, 41.4, 0.8);
      C.cel(ctx, '#8e5c2e', c => C.fillRect(c, 4, 6, 2, 42, '#5a391d'), 1);
      C.ellipse(ctx, 7, 6.4, 5.8, 5.8);
      C.cel(ctx, '#7c828e', c => { C.fillRect(c, 1, 8, 12, 6, '#585e6a'); }, 1);
      C.ellipse(ctx, 7, 6.4, 1.9, 1.9); C.ink(ctx, '#d4d8e0', 0.7);
    }, { ss: 3 });
    this.canvas(scene, 'bridgeHit', TILE, 12, () => {});

    // Farbtasten (Wandpanel auf Pfosten), je Farbe aus/an
    const colors = { red: ['#c8322c', '#ff6a5a'], blue: ['#2c62c8', '#6aa4ff'], yellow: ['#d6a41c', '#ffe066'], green: ['#2a8a36', '#6af07a'] };
    Object.entries(colors).forEach(([name, [dark, light]]) => {
      [false, true].forEach(on => {
        this.canvas(scene, `btn_${name}_${on ? 'on' : 'off'}`, 28, 44, ctx => {
          C.limb(ctx, [[14, 21], [14, 43.6]], 2.8, '#70747e', 0.9);
          if (on) {
            C.burst(ctx, 14, 12, 14, 9.5, 11);
            ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
          }
          C.rr(ctx, 3, 2, 22, 20, 2.4);
          C.cel(ctx, '#565c68', c => { C.fillRect(c, 3, 2, 22, 2, '#8a919c'); C.fillRect(c, 3, 15, 22, 7, '#3b404a'); }, 1.2);
          C.ellipse(ctx, 14, 12, 7, 7);
          C.cel(ctx, on ? light : dark, c => {
            C.ellipse(c, 13, 14.5, 7, 5.4); c.fillStyle = 'rgba(0,0,0,0.2)'; c.fill();
            C.ellipse(c, 11.6, 9.4, 2.4, 1.4, -0.5); c.fillStyle = 'rgba(255,255,255,0.8)'; c.fill();
          }, 1.1);
        });
      });
    });

    // --- Hindernisse (js/game/obstacles/) ---------------------------------
    // Bröckel-Plattform: rissige Steinplatte
    this.canvas(scene, 'crumbleTile', TILE, 12, ctx => {
      C.fillRect(ctx, 0, 0.5, TILE, 11, '#c9b49a');
      C.fillRect(ctx, 0, 7, TILE, 5, '#967e62');
      C.fillRect(ctx, 0, 0.6, TILE, 1.2, '#efe2cc');
      ctx.strokeStyle = C.INK; ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(9, 0); ctx.lineTo(12, 6); ctx.lineTo(10, 12); ctx.moveTo(12, 6); ctx.lineTo(17, 7);
      ctx.moveTo(23, 0); ctx.lineTo(21, 5); ctx.lineTo(25, 12);
      ctx.stroke();
      [[4, 4.5], [28, 8], [16, 3.5]].forEach(([x, y]) => { C.ellipse(ctx, x, y, 1.2, 0.8); C.ink(ctx, '#7a664e', 0.4); });
      C.fillRect(ctx, 0, 0, TILE, 0.9, C.INK);
      C.fillRect(ctx, 0, 11.1, TILE, 0.9, C.INK);
    });
    // Pendel: Schaukelbrett und Aufhängung
    this.canvas(scene, 'swingPlank', TILE, 12, ctx => this.plank(ctx, TILE, 12, '#d49a5a', '#94602e'));
    this.canvas(scene, 'pivotBolt', 14, 14, ctx => {
      C.ellipse(ctx, 7, 7, 6.2, 6.2);
      C.cel(ctx, '#9aa0aa', c => C.fillRect(c, 0, 8, 14, 6, '#6c727e'), 1.2);
      C.ellipse(ctx, 7, 7, 2.2, 2.2); C.ink(ctx, '#2c3038', 0.8);
    }, { ss: 3 });
    // Baumstamm (wird als TileSprite gekachelt) und Schilf am Ufer
    this.canvas(scene, 'logTile', TILE, 18, ctx => {
      C.fillRect(ctx, 0, 0, TILE, 18, '#946232');
      C.fillRect(ctx, 0, 9.5, TILE, 8.5, '#6a4220');
      C.fillRect(ctx, 0, 1, TILE, 1.6, '#c8945a');
      ctx.strokeStyle = 'rgba(30,14,4,0.75)'; ctx.lineWidth = 0.7;
      [[[2, 6], [8, 5], [14, 6.4]], [[17, 10], [22, 9.2], [29, 10.4]], [[8, 13], [12, 12.4], [16, 13.2]]].forEach(p => { C.curve(ctx, p); ctx.stroke(); });
      C.ellipse(ctx, 25, 5.8, 2.5, 1.7); C.ink(ctx, '#6a4220', 0.7);
      C.fillRect(ctx, 0, 0, TILE, 0.9, C.INK);
      C.fillRect(ctx, 0, 15.6, TILE, 0.9, C.INK);
      C.fillRect(ctx, 0, 16.5, TILE, 1.5, 'rgba(255,255,255,0.65)');   // Wasserlinie
    });
    this.canvas(scene, 'reeds', 28, 30, ctx => {
      [[4, 6], [9, 0], [14, 3], [19, 8], [24, 2]].forEach(([x, top]) => {
        C.limb(ctx, [[x, 30], [x + 0.5, top + 7]], 1.2, '#4f8c34', 0.6);
        C.rr(ctx, x - 1.4, top + 0.4, 3.6, 7.6, 1.6);
        C.ink(ctx, '#7a4e26', 0.7);
      });
      C.curve(ctx, [[2, 30], [0.8, 20], [-0.4, 14]]); ctx.strokeStyle = '#3f7a2a'; ctx.lineWidth = 0.9; ctx.stroke();
      C.curve(ctx, [[26, 30], [27, 22], [28, 17]]); ctx.stroke();
    });
    // Steinschlag: Höhle im Fels und rollender Brocken
    this.canvas(scene, 'rockChute', 56, 52, ctx => {
      ctx.beginPath(); ctx.ellipse(28, 34, 27, 32, 0, Math.PI, 0); ctx.lineTo(55, 52); ctx.lineTo(1, 52); ctx.closePath();
      C.cel(ctx, '#8e929c', c => {
        C.fillRect(c, 0, 0, 14, 52, '#70747e');
        C.hatch(c, 0, 8, 12, 44, 2.4, 'rgba(23,18,31,0.4)', 0.5);
      }, 1.5);
      [[8, 28, 5, 2.4], [46, 20, 4.4, 2.2], [20, 10, 4, 2], [36, 9, 4, 2]].forEach(([x, y, a, b]) => {
        C.ellipse(ctx, x, y, a, b); C.ink(ctx, '#a8acb6', 0.8);
      });
      ctx.beginPath(); ctx.ellipse(28, 40, 17, 22, 0, Math.PI, 0); ctx.lineTo(45, 52); ctx.lineTo(11, 52); ctx.closePath();
      C.ink(ctx, '#14161c', 1.2);
    });
    // Rollender Felsbrocken (Zeichnung: rockBody). Licht & Schatten kommen aus
    // 'rockShade', das NICHT mitdreht (Licht bleibt oben links → plastisch).
    this.canvas(scene, 'rollingRock', 44, 44, ctx => this.rockBody(ctx));
    this.canvas(scene, 'rockShade', 44, 44, ctx => this.rockLight(ctx));
    this.canvas(scene, 'rockShadow', 40, 10, ctx => {
      C.ellipse(ctx, 20, 5, 19, 4); ctx.fillStyle = 'rgba(0,0,0,1)'; ctx.fill();
    });

    // Waagschale: Holzbrett mit Metallkante und Ösen für die Seile
    this.canvas(scene, 'scalePan', TILE, 16, ctx => {
      C.fillRect(ctx, 0, 0, TILE, 2.2, '#c4cad4');
      C.fillRect(ctx, 0, 0, TILE, 0.8, C.INK);
      C.fillRect(ctx, 0, 2, TILE, 9.4, '#c48e52');
      C.fillRect(ctx, 0, 7, TILE, 4.4, '#8e5c2e');
      C.fillRect(ctx, 0, 2, TILE, 0.7, C.INK);
      C.fillRect(ctx, TILE - 0.7, 2, 0.7, 9, C.INK);
      C.fillRect(ctx, 0, 11, TILE, 5, '#7c828e');
      C.fillRect(ctx, 0, 11, TILE, 0.8, C.INK);
      C.fillRect(ctx, 0, 15.2, TILE, 0.8, C.INK);
      [[4, 6], [28, 6]].forEach(([x, y]) => { C.ellipse(ctx, x, y, 1.3, 1.3); C.ink(ctx, '#3a3e46', 0.5); });
    });
    // Sandsack (Ballast für die Waage)
    this.canvas(scene, 'sandbag', 24, 24, ctx => {
      C.blob(ctx, [[8, 2.5], [16, 2.5], [23, 13], [23.4, 23.4], [0.6, 23.4], [1, 13]]);
      C.cel(ctx, '#c8a46a', c => {
        C.fillRect(c, 0, 0, 8, 24, '#a08048');
        C.fillRect(c, 0, 19, 24, 5, '#8a6a3a');
        C.hatch(c, 0, 16, 24, 8, 2, 'rgba(50,30,10,0.4)', 0.5);
      }, 1.2);
      C.rr(ctx, 8.4, 0.6, 7.2, 4, 1); C.ink(ctx, '#6b4a2a', 1);
      C.rr(ctx, 6, 9, 12, 8, 1); C.ink(ctx, '#ecdeb8', 0.8);
    }, { ss: 3 });
    // Waagen-Lämpli: Pfosten mit Lampe und kleinem Waage-Symbol, aus/an
    [false, true].forEach(on => {
      this.canvas(scene, `scaleLamp_${on ? 'on' : 'off'}`, 28, 48, ctx => {
        C.limb(ctx, [[14, 22], [14, 47.6]], 2.8, '#70747e', 0.9);
        if (on) {
          C.burst(ctx, 14, 12, 14, 10, 11);
          ctx.fillStyle = 'rgba(160,255,170,0.7)'; ctx.fill();
        }
        C.rr(ctx, 4, 2, 20, 20, 2.4);
        C.cel(ctx, '#565c68', c => C.fillRect(c, 4, 15, 20, 7, '#3b404a'), 1.2);
        C.ellipse(ctx, 14, 12, 7, 7);
        C.ink(ctx, on ? '#7dff9a' : '#2a4a30', 1.1);
        // Waage-Symbol auf der Lampe
        C.line(ctx, [[14, 8], [14, 16]], 1.1);
        C.line(ctx, [[9, 9.6], [19, 9.6]], 0.9);
        C.line(ctx, [[11.4, 16.2], [16.6, 16.2]], 1.1);
        [9, 19].forEach(x => { ctx.beginPath(); ctx.arc(x, 10.6, 1.8, 0, Math.PI); ctx.fillStyle = C.INK; ctx.fill(); });
      });
    });
    // Stoppuhr-Symbol für Zeitschalter
    this.canvas(scene, 'stopwatch', 14, 16, ctx => {
      C.rr(ctx, 5, 0.5, 4, 2.4, 0.6); C.ink(ctx, '#c4cad4', 0.7);
      C.ellipse(ctx, 7, 9.5, 5.6, 5.6);
      C.cel(ctx, '#ffe14a', c => C.halftone(c, 1, 8, 12, 8, '#e09a10', 2, (u, v) => v), 1.2);
      C.line(ctx, [[7, 9.5], [7, 5.6]], 1);
      C.line(ctx, [[7, 9.5], [9.6, 10.6]], 1, '#d7263d');
    }, { ss: 3 });

    // Tafel für die Reihenfolge (Lämpchen zeichnet die GameScene darauf)
    this.canvas(scene, 'seqBoard', 84, 56, ctx => {
      C.rr(ctx, 38, 34, 8, 21.5, 1); C.cel(ctx, '#8e5c2e', c => C.fillRect(c, 38, 34, 3, 22, '#5a391d'), 1.1);
      C.rr(ctx, 0.8, 0.8, 82.4, 37.4, 2);
      C.ink(ctx, '#7a4f2a', 1.4);
      C.rr(ctx, 4, 4, 76, 31, 1);
      C.cel(ctx, '#2c3a2e', c => C.halftone(c, 4, 4, 76, 31, 'rgba(255,255,255,0.05)', 3), 1);
    });
  },

  // ---------------------------------------------------------------------
  // Hintergründe: Bergketten, Hügel, Wald, Wolken, Sonne
  // ---------------------------------------------------------------------
  ridgePoints(w, base, waves, step = 2) {
    const pts = [];
    for (let x = 0; x <= w; x += step) {
      let y = base;
      waves.forEach(([amp, periods, phase]) => { y -= amp * Math.sin((x / w) * Math.PI * 2 * periods + phase); });
      pts.push([x, y]);
    }
    return pts;
  },

  ridgePath(ctx, w, h, pts) {
    ctx.beginPath();
    ctx.moveTo(0, h);
    pts.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(w, h);
    ctx.closePath();
  },

  /**
   * Berge: kantiger Grat, Schattenseiten als scharfe Flächen, Schnee mit
   * gezackter Kante, Felsschraffur. Kachelbar in x (ganzzahlige Wellen).
   */
  mountainLayer(scene, key, h, { base, waves, fill, shadow, snowLine, ink, inkW, hatch }) {
    const C = Comic, w = GAME_WIDTH;
    this.canvas(scene, key, w, h, ctx => {
      // Grat aus wenigen, kantigen Punkten: Spitzen statt Sinuswellen
      const coarse = this.ridgePoints(w, base, waves, 40).map(([x, y], i, all) => {
        const edge = i === 0 || i === all.length - 1;
        return [x, y + (edge ? 0 : (Comic.rnd(i * 3.7 + base) - 0.5) * 12)];
      });
      coarse[coarse.length - 1][1] = coarse[0][1];
      this.ridgePath(ctx, w, h, coarse);
      ctx.save();
      ctx.fillStyle = fill; ctx.fill();
      ctx.clip();
      // Schattenseiten: von jeder Spitze fällt eine dunkle Flanke nach unten links
      const peaks = coarse.filter((p, i) => i > 0 && i < coarse.length - 1 && p[1] < coarse[i - 1][1] && p[1] < coarse[i + 1][1]);
      peaks.forEach(([px, py], i) => {
        const wid = 66 + Comic.rnd(i + base) * 40, drop = h - py;
        C.poly(ctx, [[px, py], [px - wid * 0.4, py + drop * 0.34], [px - wid * 0.22, py + drop * 0.5], [px - wid, h + 4], [px + wid * 0.12, h + 4], [px - wid * 0.06, py + drop * 0.42], [px + wid * 0.1, py + drop * 0.22]]);
        ctx.fillStyle = shadow; ctx.fill();
        if (hatch) {
          ctx.save();
          ctx.clip();
          C.hatch(ctx, px - wid, py, wid * 1.2, drop, 6, hatch, 0.8, 0.5);
          ctx.restore();
        }
      });
      // Schnee mit gezackter Unterkante
      if (snowLine !== undefined) {
        const zig = [];
        for (let x = 0; x <= w; x += 13) zig.push([x, snowLine + (Math.floor(x / 13) % 2 ? 11 : -6) + Comic.rnd(x) * 7]);
        C.poly(ctx, [[0, -10], [w, -10], ...zig.reverse()]);
        ctx.fillStyle = '#f7fafe'; ctx.fill();
        peaks.forEach(([px, py], i) => {
          const wid = 44 + Comic.rnd(i + base) * 20;
          C.poly(ctx, [[px, py], [px - wid * 0.7, snowLine + 12], [px - wid * 0.1, snowLine + 12]]);
          ctx.fillStyle = 'rgba(160,185,220,0.75)'; ctx.fill();
        });
        C.poly(ctx, zig, false);
        ctx.strokeStyle = ink; ctx.lineWidth = inkW * 0.6; ctx.stroke();
      }
      ctx.restore();
      // Tusche-Kontur nur auf dem Grat
      C.poly(ctx, coarse, false);
      ctx.strokeStyle = ink; ctx.lineWidth = inkW; ctx.stroke();
      ctx.clearRect(0, h - 1, w, 1);    // TileSprite: Unterkante darf nicht oben durchscheinen
    });
  },

  backgrounds(scene) {
    const C = Comic;
    this.mountainLayer(scene, 'mountainsFar', 260, {
      base: 150, waves: [[50, 2, 1.1], [30, 5, 0.3], [12, 11, 2.0]],
      fill: '#b6c9e2', shadow: '#94aace', snowLine: 106, ink: '#5f7398', inkW: 1.1, hatch: null
    });
    this.mountainLayer(scene, 'mountains', 300, {
      base: 170, waves: [[60, 3, 0.4], [35, 7, 1.3], [15, 13, 2.1]],
      fill: '#86a2c8', shadow: '#5f7ba6', snowLine: 112, ink: '#2c3a58', inkW: 1.6, hatch: 'rgba(30,42,70,0.35)'
    });

    // Hügel mit Baumgruppen auf dem Grat
    this.canvas(scene, 'hills', GAME_WIDTH, 220, ctx => {
      const rnd = this.rng(7);
      const draw = (base, waves, fill, dark, ink, lw) => {
        const pts = this.ridgePoints(GAME_WIDTH, base, waves);
        this.ridgePath(ctx, GAME_WIDTH, 220, pts);
        ctx.save();
        ctx.fillStyle = fill; ctx.fill();
        ctx.clip();
        C.halftone(ctx, 0, base - 10, GAME_WIDTH, 220 - base + 10, dark, 7, (u, v) => Math.min(1, v * 1.1));
        ctx.restore();
        C.poly(ctx, pts, false);
        ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.stroke();
        return pts;
      };
      const back = draw(110, [[30, 2, 0.8], [18, 5, 2.4]], '#80c566', 'rgba(50,120,60,0.45)', '#2a5a30', 1.5);
      for (let i = 0; i < back.length; i += 9) {
        if (rnd() < 0.45) {
          const [x, y] = back[i], s = 12 + rnd() * 9;
          this.fir(ctx, x, y + 2, s * 1.5, s * 0.92, { lit: '#54a35c', mid: '#3f8a4a', dark: '#2c6c3a', lw: 0.7 });
        }
      }
      draw(150, [[25, 3, 1.7], [12, 7, 0.5]], '#62ae50', 'rgba(30,90,44,0.45)', '#1f4a28', 1.8);
      ctx.clearRect(0, 219, GAME_WIDTH, 1);
    });

    // Tannenwald im Vordergrund: viele einzelne, gezeichnete Tannen
    this.canvas(scene, 'forest', GAME_WIDTH, 170, ctx => {
      const rnd = this.rng(19);
      C.fillRect(ctx, 0, 118, GAME_WIDTH, 52, '#2a5a36');
      C.halftone(ctx, 0, 118, GAME_WIDTH, 52, 'rgba(12,44,24,0.55)', 6, (u, v) => v);
      const row = (step, minH, varH, c) => {
        for (let x = -10; x < GAME_WIDTH + 10; x += step + rnd() * step * 0.6) {
          const hgt = minH + rnd() * varH;
          // Über die Bildkante zeichnen, damit die Kachelung nahtlos bleibt
          [x, x + GAME_WIDTH, x - GAME_WIDTH].forEach(px => this.fir(ctx, px, 128, hgt, hgt * 0.6, c));
        }
      };
      row(26, 52, 34, { lit: '#478a55', mid: '#3a7a4a', dark: '#2c6340', lw: 0.8 });
      row(18, 38, 34, { lit: '#387a48', mid: '#2c683c', dark: '#1e5230', lw: 1 });
      ctx.clearRect(0, 169, GAME_WIDTH, 1);
    });

    // Comic-Wolke: runde Bäusche, Tusche-Kontur, blauer Schatten mit Raster
    this.canvas(scene, 'cloud', 160, 70, ctx => {
      const bumps = [[34, 44, 17], [58, 34, 21], [90, 28, 25], [120, 40, 19], [76, 48, 18], [104, 49, 16], [50, 48, 14]];
      ctx.fillStyle = '#ffffff';
      bumps.forEach(([x, y, r]) => { C.ellipse(ctx, x, y, r, r); ctx.fill(); });
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      C.fillRect(ctx, 0, 54, 160, 16, '#c6daf0');
      C.halftone(ctx, 0, 38, 160, 18, 'rgba(120,160,215,0.6)', 4.4, (u, v) => v);
      // Umriss hinter der Fläche: bleibt nur aussen stehen
      ctx.globalCompositeOperation = 'destination-over';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#3c5478';
      bumps.forEach(([x, y, r]) => { C.ellipse(ctx, x, y, r, r); ctx.stroke(); });
      ctx.restore();
    });

    // Sonne: Glühen plus zackiger Strahlenkranz
    this.canvas(scene, 'sunGlow', 400, 400, ctx => {
      this.radial(ctx, 200, 200, 200, [[0, 'rgba(255,250,225,0.9)'], [0.15, 'rgba(255,240,200,0.55)'], [1, 'rgba(255,240,200,0)']]);
      C.burst(ctx, 200, 200, 72, 44, 14);
      ctx.fillStyle = 'rgba(255,240,170,0.55)'; ctx.fill();
      C.ellipse(ctx, 200, 200, 36, 36);
      ctx.fillStyle = 'rgba(255,250,215,1)'; ctx.fill();
    }, { ss: 1 });
    this.canvas(scene, 'haze', GAME_WIDTH, 140, ctx => {
      this.vgrad(ctx, 0, 0, GAME_WIDTH, 140, [[0, 'rgba(255,255,255,0)'], [0.6, 'rgba(240,246,255,0.32)'], [1, 'rgba(240,246,255,0)']]);
    }, { ss: 1 });
  },

  // ---------------------------------------------------------------------
  // Effekte: Vignette, Schatten, Staubkörnchen
  // ---------------------------------------------------------------------
  effects(scene) {
    const C = Comic;
    this.canvas(scene, 'vignette', GAME_WIDTH, GAME_HEIGHT, ctx => {
      const g = ctx.createRadialGradient(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_HEIGHT * 0.5, GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH * 0.72);
      g.addColorStop(0, 'rgba(10,14,30,0)');
      g.addColorStop(1, 'rgba(10,14,30,0.3)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }, { ss: 1 });
    this.canvas(scene, 'shadow', 28, 8, ctx => {
      C.ellipse(ctx, 14, 4, 13, 3.4);
      ctx.fillStyle = 'rgba(10,10,20,0.75)'; ctx.fill();
    });
    this.canvas(scene, 'mote', 8, 8, ctx => {
      this.radial(ctx, 4, 4, 4, [[0, 'rgba(255,255,240,1)'], [1, 'rgba(255,255,240,0)']]);
    });
    // Comic-Wölkchen für Staub und Spritzer (wird eingefärbt)
    this.canvas(scene, 'softDot', 10, 10, ctx => {
      C.ellipse(ctx, 5, 5, 4, 4);
      C.ink(ctx, '#ffffff', 0.9, 'rgba(23,18,31,0.7)');
    }, { ss: 3 });
  }
};

/* ---------------------------------------------------------------------
 * Gemeinsamer Hintergrund (Himmel, Sonne, Wolken, Bergketten, Hügel,
 * Wald) mit sanftem Parallax – für Menü, Spiel und Zwischenbildschirme.
 * Gibt { update(camera, worldHeight, delta) } zurück.
 * ------------------------------------------------------------------- */
function addBackdrop(scene, skyColors = [0x8ccbf0, 0xe4f3fb], { forest = true } = {}) {
  // Himmel: Verlauf in den Level-Farben, darüber das Comic-Raster
  const sky = scene.add.graphics().setScrollFactor(0).setDepth(-100);
  sky.fillGradientStyle(skyColors[0], skyColors[0], skyColors[1], skyColors[1], 1);
  sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  Comic.addHalftoneSky(scene, -99.5);

  const sun = scene.add.image(GAME_WIDTH * 0.8, 70, 'sunGlow').setScrollFactor(0).setDepth(-99)
    .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.4);
  scene.tweens.add({ targets: sun, alpha: 0.3, scale: 1.06, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

  const clouds = [];
  for (let i = 0; i < 6; i++) {
    clouds.push(scene.add.image(i * 190 + 40, 40 + (i % 3) * 38, 'cloud').setScrollFactor(0).setDepth(-97)
      .setAlpha(0.55 + (i % 2) * 0.3).setScale(0.55 + (i % 3) * 0.25));
  }

  const layer = (key, y, h, depth, factor, climb) => {
    const ts = scene.add.tileSprite(0, y, GAME_WIDTH, h, key).setOrigin(0).setScrollFactor(0).setDepth(depth);
    return { ts, baseY: y, factor, climb };
  };
  const layers = [
    layer('mountainsFar', GAME_HEIGHT - 330, 260, -95, 0.05, 0.04),
    layer('mountains', GAME_HEIGHT - 300, 300, -92, 0.13, 0.08),
    layer('hills', GAME_HEIGHT - 200, 220, -85, 0.3, 0.18)
  ];
  if (forest) layers.push(layer('forest', GAME_HEIGHT - 150, 170, -80, 0.5, 0.3));
  const haze = scene.add.image(0, GAME_HEIGHT - 250, 'haze').setOrigin(0).setScrollFactor(0).setDepth(-93);

  return {
    update(cam, worldHeight, delta = 16) {
      const climb = Math.max(0, worldHeight - GAME_HEIGHT - cam.scrollY);   // wie weit nach oben geschaut
      layers.forEach(l => {
        l.ts.tilePositionX = cam.scrollX * l.factor;
        l.ts.y = l.baseY + climb * l.climb;
      });
      haze.y = GAME_HEIGHT - 250 + climb * 0.06;
      clouds.forEach((c, i) => {
        c.x -= (0.08 + i * 0.025) * delta / 16;
        if (c.x < -100) c.x = GAME_WIDTH + 100;
      });
    }
  };
}

/** Dunkler Rand ums Bild – lenkt den Blick in die Mitte. */
function addVignette(scene, depth = 90) {
  return scene.add.image(0, 0, 'vignette').setOrigin(0).setScrollFactor(0).setDepth(depth);
}
