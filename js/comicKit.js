/* =====================================================================
 * comicKit.js – Werkzeugkasten für den Comic-Stil
 *
 * Alle Grafiken werden weiterhin zur Laufzeit per Canvas gezeichnet, aber
 * als Vektorzeichnung: kräftige Tusche-Konturen, flächige Cel-Schatten,
 * Raster (Halftone) und Schraffuren.
 *
 * Hochauflösung, ohne dass sich etwas am Spiel ändert:
 *   - Die Spiellogik rechnet weiter in 960×540 (GAME_WIDTH/GAME_HEIGHT),
 *     gezeichnet wird aber in doppelter Auflösung (Comic.enableHiRes).
 *   - Texturen haben eine "logische" Grösse (für Sprites und Physik) und
 *     enthalten mehr Pixel (ss = Supersampling): Comic.tex(). Eine 32×32-
 *     Kachel bleibt für Phaser 32×32 gross.
 *
 * Texte: Comic.styleText() stellt jeden scene.add.text() auf die Comic-
 * Schriften um (grosse Titel = Bangers, alles andere = Comic Neue).
 * ===================================================================== */

const Comic = {
  HI_RES: 2,                // Zeichenauflösung gegenüber 960×540
  INK: '#17121f',           // Tusche
  LINE: 1,                  // Standard-Strichstärke (logische Pixel)

  // ---------------------------------------------------------------------
  // Hochauflösende Darstellung
  // ---------------------------------------------------------------------
  /**
   * Zeichenfläche auf 2× vergrössern, Phaser rechnet weiter in 960×540.
   * Das Spiel nutzt keine Framebuffer-Effekte; nur der Bildschirm wird skaliert.
   */
  enableHiRes(game) {
    const renderer = game.renderer, gl = renderer && renderer.gl;
    if (!gl || window.TEST_OPTS) return;                      // Canvas-Renderer und Tests: normale Auflösung
    const k = this.HI_RES, W = game.config.width, H = game.config.height;
    let offscreen = false;
    const bind = gl.bindFramebuffer.bind(gl), viewport = gl.viewport.bind(gl), scissor = gl.scissor.bind(gl);
    gl.bindFramebuffer = (target, fb) => { offscreen = !!fb; bind(target, fb); };
    gl.viewport = (x, y, w, h) => (offscreen ? viewport(x, y, w, h) : viewport(x * k, y * k, w * k, h * k));
    gl.scissor = (x, y, w, h) => (offscreen ? scissor(x, y, w, h) : scissor(x * k, y * k, w * k, h * k));
    Object.defineProperty(gl, 'drawingBufferHeight', { get: () => H });
    game.canvas.width = W * k;
    game.canvas.height = H * k;
    renderer.resize(W, H);
  },

  /** TileSprites füllen ihr Muster aus der Quelle: dort die vollen Pixel benutzen. */
  patchTileSprite() {
    const proto = Phaser.GameObjects.TileSprite.prototype;
    const original = proto.updateTileTexture;
    proto.updateTileTexture = function () {
      const f = this.displayFrame, k = f && f.source.hdScale;
      if (!k || k === 1 || !this.dirty || !this.renderer) return original.call(this);
      const saved = [f.cutX, f.cutY, f.cutWidth, f.cutHeight, this.potWidth, this.potHeight];
      f.cutX *= k; f.cutY *= k; f.cutWidth *= k; f.cutHeight *= k;
      this.potWidth = Phaser.Math.Pow2.GetNext(Math.ceil(f.cutWidth));
      this.potHeight = Phaser.Math.Pow2.GetNext(Math.ceil(f.cutHeight));
      original.call(this);
      [f.cutX, f.cutY, f.cutWidth, f.cutHeight, this.potWidth, this.potHeight] = saved;
    };
  },

  /**
   * Textur mit logischer Grösse w×h und ss-facher Pixeldichte. Der Zeichen-
   * kontext ist schon skaliert: draw(ctx, w, h) zeichnet in logischen Pixeln.
   * opts: { ss = 2, frames: [Breite, Höhe, Anzahl] }
   */
  tex(scene, key, w, h, draw, opts = {}) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const ss = scene.sys.game.renderer.gl ? (opts.ss || this.HI_RES) : 1;   // Canvas-Renderer: normale Auflösung
    const tex = scene.textures.createCanvas(key, Math.ceil(w * ss), Math.ceil(h * ss));
    const ctx = tex.getContext();
    ctx.save();
    ctx.scale(ss, ss);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    draw(ctx, w, h, tex);
    ctx.restore();
    tex.refresh();
    this.clampEdges(scene, tex);
    if (ss !== 1) {
      const source = tex.source[0];
      source.width = w; source.height = h; source.hdScale = ss;
      tex.width = w; tex.height = h;
      tex.frames.__BASE.setSize(w, h);
    }
    if (opts.frames) {
      const [fw, fh, n] = opts.frames;
      for (let i = 0; i < n; i++) tex.add(i, 0, i * fw, 0, fw, fh);
    }
    return tex;
  },

  /**
   * Keine Wiederholung am Rand: WebGL wiederholt Texturen mit 2er-Potenz-Grösse,
   * dann scheint beim Glätten die gegenüberliegende Kante als feine Linie durch.
   * (TileSprites nutzen eine eigene Kopie und kacheln trotzdem.)
   */
  clampEdges(scene, tex) {
    const renderer = scene.sys.game.renderer, gl = renderer.gl, glTex = tex.source[0].glTexture;
    if (!gl || !glTex) return;
    // Wie Phasers eigene Textur-Updates: Einheit 0, gebundene Textur danach wiederherstellen
    gl.activeTexture(gl.TEXTURE0);
    const current = gl.getParameter(gl.TEXTURE_BINDING_2D);
    gl.bindTexture(gl.TEXTURE_2D, glTex.webGLTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, current);
  },

  // ---------------------------------------------------------------------
  // Texte
  // ---------------------------------------------------------------------
  /** Pixelschrift-Grössen der Szenen → gleich hohe Comic-Schrift. */
  fontSize(legacyPx) { return Math.round(legacyPx * 1.5); },

  styleText(style = {}) {
    const legacy = parseFloat(style.fontSize) || 12;
    const title = legacy >= 16;
    const size = this.fontSize(legacy);
    const out = Object.assign({}, style, {
      fontFamily: title ? FONT_TITLE : FONT,
      fontSize: `${size}px`,
      resolution: this.HI_RES,
      lineSpacing: Math.round((style.lineSpacing || 0) * 0.4 - (title ? size * 0.14 : 0))
    });
    // Bangers ist kursiv: Platz lassen, sonst werden Buchstaben rechts abgeschnitten
    if (title) out.padding = { x: Math.max(3, Math.round(size * 0.14)), y: Math.max(2, Math.round(size * 0.06)) };
    return out;
  },

  patchTextFactory() {
    const factory = Phaser.GameObjects.GameObjectFactory.prototype;
    const original = factory.text;
    factory.text = function (x, y, text, style) { return original.call(this, x, y, text, Comic.styleText(style)); };
  },

  // ---------------------------------------------------------------------
  // Pfade
  // ---------------------------------------------------------------------
  /** Reproduzierbarer Zufall 0…1. */
  rnd(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  },

  poly(ctx, pts, close = true) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (close) ctx.closePath();
  },

  /** Weiche, organische Form durch die Punkte (geschlossene Kurve). */
  blob(ctx, pts) {
    ctx.beginPath();
    const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    ctx.moveTo(...mid(pts[n - 1], pts[0]));
    pts.forEach((p, i) => ctx.quadraticCurveTo(p[0], p[1], ...mid(p, pts[(i + 1) % n])));
    ctx.closePath();
  },

  /** Offene, weiche Linie durch die Punkte. */
  curve(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    for (let i = 1; i < pts.length - 1; i++) {
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    }
    ctx.lineTo(...pts[pts.length - 1]);
  },

  rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  ellipse(ctx, x, y, rx, ry, rot = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  },

  /** Zackiger Comic-Stern ("POW!"-Form) bzw. n-zackiger Stern. */
  burst(ctx, cx, cy, ro, ri, n, rot = -Math.PI / 2) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? ri : ro, a = rot + i * Math.PI / n;
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
  },

  // ---------------------------------------------------------------------
  // Tusche & Farbe
  // ---------------------------------------------------------------------
  /** Aktuellen Pfad füllen und mit Tusche umranden. */
  ink(ctx, fill, lw = this.LINE, stroke = this.INK) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  },

  /**
   * Aktuellen Pfad füllen und darin schattieren (shade(ctx) läuft geclippt).
   * Die Kontur kommt zuerst: Der Schatten legt neue Pfade an, danach wäre der
   * Umriss weg. Die Füllung deckt ihre innere Hälfte wieder ab.
   */
  cel(ctx, fill, shade, lw = this.LINE, stroke = this.INK) {
    if (lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw * 1.6; ctx.stroke(); }
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.save();
    ctx.clip();
    shade(ctx);
    ctx.restore();
  },

  line(ctx, pts, lw = this.LINE, color = this.INK) {
    this.poly(ctx, pts, false);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.stroke();
  },

  /** Dicke, runde Linie mit Tusche-Rand (Arme, Beine, Seile …). */
  limb(ctx, pts, width, color, lw = this.LINE) {
    this.poly(ctx, pts, false);
    ctx.strokeStyle = this.INK;
    ctx.lineWidth = width + lw * 2;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  },

  fillRect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  },

  vgrad(ctx, x, y, w, h, stops) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    stops.forEach(([at, color]) => g.addColorStop(at, color));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  },

  radial(ctx, cx, cy, r, stops) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    stops.forEach(([at, color]) => g.addColorStop(at, color));
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  },

  /** Schraffur: parallele Federstriche über die Fläche (am besten geclippt). */
  hatch(ctx, x, y, w, h, gap = 3, color = this.INK, lw = 0.6, slant = 0.6) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let i = -h; i < w + h; i += gap) {
      ctx.moveTo(x + i, y + h);
      ctx.lineTo(x + i + h * slant, y);
    }
    ctx.stroke();
  },

  /**
   * Comic-Raster (Ben-Day-Punkte). size(u, v) liefert den Radius 0…1 für die
   * relative Position in der Fläche, z. B. (u, v) => v für "nach unten dichter".
   */
  halftone(ctx, x, y, w, h, color, gap = 6, size = () => 1) {
    ctx.fillStyle = color;
    ctx.beginPath();
    let row = 0;
    for (let yy = y; yy < y + h; yy += gap * 0.866, row++) {
      for (let xx = x + (row % 2 ? gap / 2 : 0); xx < x + w; xx += gap) {
        const r = size((xx - x) / w, (yy - y) / h) * gap * 0.46;
        if (r > 0.12) { ctx.moveTo(xx + r, yy); ctx.arc(xx, yy, r, 0, Math.PI * 2); }
      }
    }
    ctx.fill();
  },

  // ---------------------------------------------------------------------
  // Tafeln
  // ---------------------------------------------------------------------
  PANEL_STYLES: {
    night: { fill: '#1d2b5c', dots: 'rgba(120,160,255,0.16)', key: '#ffffff' },
    active: { fill: '#1d2b5c', dots: 'rgba(120,160,255,0.16)', key: '#f7d117' },
    caption: { fill: '#ffe14a', dots: 'rgba(240,150,20,0.38)', key: null },
    bubble: { fill: '#ffffff', dots: null, key: null },
    paper: { fill: '#fff6dc', dots: 'rgba(214,160,90,0.28)', key: null }
  },

  /** Comic-Tafel: Tusche-Rand, harter Schlagschatten, Raster. Mitte = (x, y). */
  panelTexture(scene, w, h, style) {
    const key = `comicPanel_${style}_${Math.round(w)}_${Math.round(h)}`;
    if (scene.textures.exists(key)) return key;
    const s = this.PANEL_STYLES[style], m = 7;
    this.tex(scene, key, w + m * 2, h + m * 2, ctx => {
      this.rr(ctx, m + 4, m + 5, w, h, 8);
      ctx.fillStyle = 'rgba(10,8,20,0.55)';
      ctx.fill();
      this.rr(ctx, m, m, w, h, 8);
      this.cel(ctx, s.fill, c => {
        if (s.dots) this.halftone(c, m, m, w, h, s.dots, 7, (u, v) => Math.max(0, v * 1.15 - 0.15));
      }, 3);
      if (s.key) {
        this.rr(ctx, m + 4.5, m + 4.5, w - 9, h - 9, 5);
        ctx.strokeStyle = s.key;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    });
    return key;
  },

  /**
   * Bild mit Tafel. setSelected(true) färbt die Innenlinie gelb,
   * setPanelSize(w, h) passt die Tafel an (z. B. an die Textlänge).
   */
  panel(scene, x, y, w, h, style = 'night') {
    const img = scene.add.image(x, y, this.panelTexture(scene, w, h, style));
    let size = [w, h], current = style;
    const apply = () => img.setTexture(this.panelTexture(scene, size[0], size[1], current));
    img.setSelected = on => { current = on ? 'active' : style; apply(); return img; };
    img.setPanelSize = (pw, ph) => { size = [pw, ph]; apply(); return img; };
    return img;
  },

  /** Sprechblase als Textur (Mitte = Blase, Schwanz unten). Gibt den Schlüssel zurück. */
  bubbleTexture(scene, w, h) {
    const key = `comicBubble_${Math.round(w)}_${Math.round(h)}`;
    if (scene.textures.exists(key)) return key;
    const tail = 16, m = 5;
    this.tex(scene, key, w + m * 2, h + m * 2 + tail * 2, ctx => {
      const cx = w / 2 + m, top = m + tail, bot = top + h;
      ctx.beginPath();
      ctx.ellipse(cx, top + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.moveTo(cx - 12, bot - 3);
      ctx.lineTo(cx + 2, bot + tail - 2);
      ctx.lineTo(cx + 12, bot - 3);
      ctx.closePath();
      this.ink(ctx, null, 3.2);
      ctx.fillStyle = '#ffffff';
      ctx.fill('nonzero');
    });
    return key;
  },

  /** Zackiger Comic-Stern als Textur (hinter Logos und Titeln). Gibt den Schlüssel zurück. */
  burstTexture(scene, key, w, h, fill, edge) {
    if (scene.textures.exists(key)) return key;
    this.tex(scene, key, w, h, ctx => {
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(1, h / w);
      this.burst(ctx, 0, 0, w / 2 - 6, w / 2 - 70, 18);
      ctx.restore();
      this.cel(ctx, fill, c => this.halftone(c, 0, 0, w, h, edge, 12, (u, v) => Math.min(1, Math.hypot(u - 0.5, v - 0.5) * 1.5)), 4);
    });
    return key;
  },

  /** Comic-Raster über eine ganze Fläche legen (für Himmel und Verläufe). */
  addHalftoneSky(scene, depth, y = 0, h = GAME_HEIGHT, alpha = 0.12) {
    const key = 'comicSkyDots';
    if (!scene.textures.exists(key)) {
      this.tex(scene, key, 480, 270, ctx => this.halftone(ctx, 0, 0, 480, 270, '#ffffff', 11, (u, v) => 0.25 + v * 0.75), { ss: 2 });
    }
    return scene.add.image(0, y, key).setOrigin(0).setDisplaySize(GAME_WIDTH, h).setScrollFactor(0).setDepth(depth).setAlpha(alpha);
  }
};

Comic.patchTextFactory();
Comic.patchTileSprite();
