/* =====================================================================
 * menuArt.js – Grafiken der Spielauswahl (GameSelectScene)
 *
 * Alles wird in HALBER Auflösung Pixel für Pixel gezeichnet und im Spiel
 * doppelt so gross angezeigt → grober 16-Bit-Look wie Jessica und Simon.
 * Farbverläufe sind mit einem 4×4-Bayer-Raster gedithert (SNES-Stil),
 * Licht kommt immer von oben links.
 *
 *   menuBackdrop   Himmel, Wolkenbank, Berge, Hügel, Tannenwald, Wegweiser,
 *                  Schweizer Fähnchen, Felsen (480×270)
 *   menuCloud0–2   Pixelwolken zum Ziehenlassen
 *   cardAlbis      Kartenbild Albishorn Climbers (160×75)
 *   cardSsp        Kartenbild Super Sempach Party (160×75)
 *   menuFlame      Lagerfeuer, 3 Frames · menuSparkle Glitzer
 *   padIcon1/2     Controller rot/blau · speakerOn/Off Lautsprecher
 * ===================================================================== */

const MenuArt = {
  BAYER: [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5],
  OUTLINE: '#1c1626',

  createAll(scene) {
    this.tex(scene, 'menuBackdrop', 480, 270, p => this.backdrop(p));
    [0, 1, 2].forEach(i => this.tex(scene, `menuCloud${i}`, 72, 26, p => this.cloud(p, 0, 0, 72, 26, i)));
    this.tex(scene, 'cardAlbis', 160, 75, p => this.albisCard(p));
    this.tex(scene, 'cardSsp', 160, 75, p => this.sspCard(p));
    this.tex(scene, 'menuFlame', 24, 12, p => [0, 1, 2].forEach(i => this.flame(p, i * 8, i)), [8, 12, 3]);
    this.tex(scene, 'menuSparkle', 7, 7, p => this.sparkle(p));
    this.tex(scene, 'padIcon1', 18, 10, p => this.pad(p, '#e8463c', '#ff8a7a', '#9a1e1a'));
    this.tex(scene, 'padIcon2', 18, 10, p => this.pad(p, '#3a7ae8', '#8ab8ff', '#1a3a8a'));
    this.tex(scene, 'speakerOn', 12, 10, p => this.speaker(p, false));
    this.tex(scene, 'speakerOff', 12, 10, p => this.speaker(p, true));
  },

  // ---------------------------------------------------------------------
  // Pixel-Puffer
  // ---------------------------------------------------------------------
  /** Textur aus einem Pixel-Puffer; frames = [Breite, Höhe, Anzahl] für Spritesheets. */
  tex(scene, key, w, h, draw, frames) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const p = this.buffer(w, h);
    draw(p);
    const tex = scene.textures.createCanvas(key, w, h);
    const ctx = tex.getContext();
    ctx.putImageData(new ImageData(p.data, w, h), 0, 0);
    if (frames) {
      const [fw, fh, n] = frames;
      for (let i = 0; i < n; i++) tex.add(i, 0, i * fw, 0, fw, fh);
    }
    tex.refresh();
  },

  buffer(w, h) {
    const data = new Uint8ClampedArray(w * h * 4);
    const rgb = {};
    const parse = c => rgb[c] || (rgb[c] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]);
    return {
      w, h, data,
      set(x, y, c) {
        x = Math.round(x); y = Math.round(y);
        if (!c || x < 0 || y < 0 || x >= w || y >= h) return;
        const [r, g, b] = parse(c), i = (y * w + x) * 4;
        data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
      },
      filled(x, y) {
        return x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 0;
      },
      /** Vorhandenes Pixel Richtung Farbe c mischen (a = 0…1), z. B. für Dunst. */
      mix(x, y, c, a) {
        if (!this.filled(x, y)) return;
        const [r, g, b] = parse(c), i = (y * w + x) * 4;
        data[i] += (r - data[i]) * a; data[i + 1] += (g - data[i + 1]) * a; data[i + 2] += (b - data[i + 2]) * a;
      },
      rect(x, y, rw, rh, c) {
        for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) this.set(xx, yy, c);
      }
    };
  },

  /** Bayer-Schwelle: true, wenn an (x, y) der Anteil frac (0…1) die "zweite" Farbe bekommt. */
  dither(x, y, frac) {
    return frac > (this.BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
  },

  /** Reproduzierbarer Zufall 0…1. */
  rnd(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  },

  /** Senkrechter Farbverlauf über mehrere Farben, gedithert. */
  gradient(p, x0, y0, w, h, colors, from = y0, to = y0 + h) {
    for (let y = y0; y < y0 + h; y++) {
      const t = Phaser.Math.Clamp((y - from) / (to - from), 0, 1) * (colors.length - 1);
      const lo = Math.floor(t), frac = t - lo;
      for (let x = x0; x < x0 + w; x++) {
        p.set(x, y, colors[Math.min(colors.length - 1, lo + (this.dither(x, y, frac) ? 1 : 0))]);
      }
    }
  },

  /** Punkt in Dreieck (für Zelt und Fähnchen). */
  inTri(x, y, a, b, c) {
    const s = (p1, p2, p3) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
    const d1 = s([x, y], a, b), d2 = s([x, y], b, c), d3 = s([x, y], c, a);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  },

  /** Polygon füllen (Punkte im Uhrzeigersinn egal), col(x, y) liefert die Farbe. */
  poly(p, pts, col) {
    const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < (xj - xi) * (y + 0.5 - yi) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) p.set(x, y, col(x, y));
      }
    }
  },

  // ---------------------------------------------------------------------
  // Bausteine
  // ---------------------------------------------------------------------
  /**
   * Berg mit Licht- (links) und Schattenseite (rechts vom Grat), zackiger
   * Schneekappe und Felsschichten. c = { lit, shade, dark, snow, snowShade }.
   */
  peak(p, x, top, base, hw, c, seed, snowDepth = 0) {
    for (let y = Math.ceil(top); y <= base; y++) {
      const t = (y - top) / (base - top);
      const spread = hw * Math.pow(t, 0.85);
      const left = x - spread * (1 + 0.12 * this.rnd(seed + y)) - (this.rnd(seed + y * 3) > 0.7 ? 1 : 0);
      const right = x + spread * (1.05 + 0.12 * this.rnd(seed + y * 5));
      const spine = x + (y - top) * 0.28 + (this.rnd(seed + Math.floor(y / 3)) - 0.5) * 2;
      for (let xx = Math.floor(left); xx <= Math.ceil(right); xx++) {
        const lit = xx < spine - (this.dither(xx, y, Math.max(0, Math.min(1, spine - xx))) ? 1 : 0);
        const cap = 1 - Math.min(1, Math.abs(xx - x) / (hw * 0.75));                         // Kappe: Mitte tief, Flanken flach
        const snowLine = top + snowDepth * cap + (this.rnd(seed + xx * 7) - 0.5) * 5;
        let col;
        if (snowDepth > 0 && y < snowLine) col = lit ? c.snow : c.snowShade;
        else {
          col = lit ? c.lit : c.shade;
          // Felsschichten: kurze, schräge dunkle Bänder
          if (((y + Math.floor(xx * 0.5)) % 9 === 0) && this.rnd(seed + Math.floor(xx / 3) * 13 + y * 3) > 0.55) col = c.dark;
        }
        if (xx === Math.floor(left) || xx === Math.ceil(right)) col = lit ? c.lit : c.dark;
        p.set(xx, y, col);
      }
    }
  },

  /** Tanne: Etagen, links beleuchtet, rechts im Schatten, Stamm. */
  fir(p, x, base, h, c) {
    p.rect(x - 1, base - 3, 2, 4, c.trunk || '#4a3020');
    const body = h - 3, tiers = Math.max(3, Math.round(h / 9));
    for (let y = 0; y < body; y++) {
      const tier = Math.floor(y / body * tiers), inTier = (y / body * tiers) % 1;
      const hw = 0.6 + (tier + 1) / tiers * h * 0.26 * (0.5 + 0.5 * inTier);
      const yy = base - 3 - body + y;
      for (let xx = -Math.round(hw); xx <= Math.round(hw); xx++) {
        let col = c.base;
        if (xx < -hw * 0.3) col = c.lit;
        else if (xx > hw * 0.4) col = c.shade;
        if (inTier > 0.8 && Math.abs(xx) > hw * 0.5) col = c.shade;    // Unterkante der Etage
        p.set(x + xx, yy, col);
      }
    }
  },

  /** Pixelwolke aus Kreisen, oben weiss, unten bläulich (gedithert). */
  cloud(p, ox, oy, w, h, seed) {
    const bumps = [];
    for (let i = 0; i < 6; i++) {
      const bx = w * (0.15 + 0.7 * i / 5) + (this.rnd(seed * 10 + i) - 0.5) * 6;
      const r = h * (0.32 + 0.3 * this.rnd(seed * 20 + i)) * (i === 0 || i === 5 ? 0.75 : 1);
      bumps.push([bx, h - 3 - r * 0.7, r]);
    }
    for (let y = 0; y < h - 2; y++) {
      for (let x = 0; x < w; x++) {
        if (!bumps.some(([bx, by, r]) => (x - bx) ** 2 + (y - by) ** 2 <= r * r)) continue;
        const t = y / (h - 3);
        let col = t < 0.45 ? '#ffffff' : t < 0.75 ? '#eaf3fa' : '#c6daec';
        if (t >= 0.38 && t < 0.52 && this.dither(x, y, (t - 0.38) / 0.14)) col = '#eaf3fa';
        if (t >= 0.68 && t < 0.82 && this.dither(x, y, (t - 0.68) / 0.14)) col = '#c6daec';
        p.set(ox + x, oy + y, col);
      }
    }
  },

  /** Wegweiser mit zwei Pfeil-Schildern. */
  signpost(p, x, base) {
    p.rect(x, base - 24, 2, 24, '#6a4220');
    p.rect(x + 1, base - 24, 1, 24, '#4a2c14');
    [[base - 22, 1], [base - 15, -1]].forEach(([y, dir]) => {
      const x0 = dir > 0 ? x - 3 : x - 10, len = 15;
      p.rect(x0, y, len, 5, '#d8a45a');
      p.rect(x0, y, len, 1, '#f0c88a');
      p.rect(x0, y + 4, len, 1, '#8a5a2e');
      const tip = dir > 0 ? x0 + len : x0 - 1;
      p.rect(tip, y + 1, 1, 3, '#d8a45a');
      p.set(tip + dir, y + 2, '#d8a45a');
      p.rect(x0 + 3, y + 2, len - 6, 1, '#8a5a2e');        // "Schrift"
    });
  },

  /** Schweizer Fähnchen an einem Mast. */
  swissFlag(p, x, base, pole = 14) {
    p.rect(x, base - pole, 1, pole, '#c8ccd4');
    p.rect(x + 1, base - pole, 1, pole, '#8a909a');
    p.rect(x + 2, base - pole, 9, 7, '#d8202a');
    p.rect(x + 2, base - pole + 6, 9, 1, '#a8141c');
    p.rect(x + 5, base - pole + 1, 3, 5, '#ffffff');
    p.rect(x + 4, base - pole + 2, 5, 3, '#ffffff');
  },

  /** Felsbrocken am Boden. */
  rock(p, x, base, w, h) {
    for (let y = 0; y < h; y++) {
      const hw = w / 2 * Math.sqrt(1 - ((h - y) / h) ** 2);
      for (let xx = -Math.round(hw); xx <= Math.round(hw); xx++) {
        const col = y < 2 || xx < -hw * 0.4 ? '#b4b8c0' : xx > hw * 0.3 ? '#6a6e78' : '#8e929c';
        p.set(x + xx, base - h + y, col);
      }
    }
  },

  // ---------------------------------------------------------------------
  // Hintergrund der Spielauswahl (480×270, wird 2× angezeigt)
  // ---------------------------------------------------------------------
  backdrop(p) {
    // Himmel: 16-Bit-Verlauf, gedithert
    this.gradient(p, 0, 0, 480, 270, ['#3f7fcf', '#5592da', '#6aa6e2', '#80b8ea', '#98c9f0', '#b2d8f4', '#cbe6f8', '#dff0fa'], 0, 175);
    // Wolkenbank am Horizont (hinter den Bergen)
    [[-10, 92, 90, 34], [70, 100, 80, 30], [150, 96, 70, 30], [300, 98, 90, 32], [380, 90, 110, 36]]
      .forEach(([x, y, w, h], i) => this.cloud(p, x, y, w, h, 7 + i));

    // Ferne Berge (bläulich, mit Schnee)
    const far = { lit: '#9db2d2', shade: '#7488ac', dark: '#62759a', snow: '#f4f8fc', snowShade: '#c4d2e6' };
    [[25, 72, 190, 70], [118, 96, 190, 60], [215, 58, 190, 80], [318, 86, 190, 62], [418, 52, 190, 84], [495, 80, 190, 50]]
      .forEach(([x, top, base, hw], i) => this.peak(p, x, top, base, hw, far, 100 + i * 17, 22));
    // Dunst über den Bergfüssen
    for (let y = 150; y < 192; y++) for (let x = 0; x < 480; x++) p.mix(x, y, '#d6ebf7', (y - 150) / 42 * 0.55);

    // Mittlere Berge: bewaldet, grünblau
    const mid = { lit: '#6f9a78', shade: '#4d7560', dark: '#3f6452', snow: '', snowShade: '' };
    [[70, 128, 215, 85], [190, 140, 215, 70], [300, 124, 215, 90], [440, 132, 215, 80]]
      .forEach(([x, top, base, hw], i) => this.peak(p, x, top, base, hw, mid, 300 + i * 23));
    for (let y = 120; y < 215; y++) {
      for (let x = 0; x < 480; x++) if (p.filled(x, y) && this.rnd(x * 7 + y * 131) > 0.93) p.mix(x, y, '#2f5444', 0.6);   // Wald-Tupfen
    }

    // Hügel mit Wiese
    const hill = x => 186 + 7 * Math.sin(x / 41) + 4 * Math.sin(x / 15 + 1);
    for (let x = 0; x < 480; x++) {
      const top = Math.round(hill(x));
      for (let y = top; y < 270; y++) {
        let col = y - top < 2 ? '#8cc866' : '#5e9c4a';
        if (y - top >= 2 && y - top < 5 && this.dither(x, y, (5 - (y - top)) / 3)) col = '#73b256';
        p.set(x, y, col);
      }
    }
    this.swissFlag(p, 352, Math.round(hill(352)) + 1, 16);

    // Ferne Tannenreihe
    const firFar = { base: '#356a4a', lit: '#478460', shade: '#285640', trunk: '#3a2a1a' };
    for (let x = -4; x < 490; x += 6) this.fir(p, x + Math.round(this.rnd(x) * 3), Math.round(hill(x)) + 8, 12 + Math.round(this.rnd(x + 9) * 9), firFar);

    // Dichter Tannenwald vorne: an den Rändern hoch, in der Mitte tiefer
    const firBack = { base: '#2a5a3a', lit: '#3c7a4a', shade: '#1e4630' };
    const firFront = { base: '#1f4630', lit: '#2f6440', shade: '#15331f' };
    for (let x = -6; x < 490; x += 9) {
      const edge = Math.abs(x - 240) / 240;
      this.fir(p, x + Math.round(this.rnd(x * 3) * 4), 258, 26 + Math.round(edge * 36 + this.rnd(x + 1) * 10), firBack);
    }
    for (let x = -2; x < 490; x += 13) {
      const edge = Math.abs(x - 240) / 240;
      if (edge < 0.35 && this.rnd(x) > 0.4) continue;                   // Mitte etwas lichter (Galerie-Knopf)
      this.fir(p, x + Math.round(this.rnd(x * 5) * 5), 272, 30 + Math.round(edge * 48 + this.rnd(x + 4) * 12), firFront);
    }
    // Waldboden mit Grasbüscheln
    p.rect(0, 262, 480, 8, '#1a3a24');
    for (let x = 0; x < 480; x += 3) if (this.rnd(x * 11) > 0.5) p.rect(x, 260 + Math.round(this.rnd(x) * 2), 1, 2, '#2f6440');

    // Wanderweg-Schild, Felsen, Laubbaum
    this.signpost(p, 104, 264);
    this.rock(p, 66, 264, 16, 7);
    this.rock(p, 412, 265, 20, 8);
    for (let y = 0; y < 22; y++) {
      for (let x = -12; x <= 12; x++) {
        if (x * x + (y - 11) * (y - 11) * 1.2 > 130) continue;
        p.set(448 + x, 236 + y, x < -3 && y < 14 ? '#6ab04a' : x > 4 || y > 15 ? '#2e6a2e' : '#4a8e3a');
      }
    }
    p.rect(447, 257, 3, 7, '#5a3a1e');
  },

  // ---------------------------------------------------------------------
  // Kartenbilder (160×75)
  // ---------------------------------------------------------------------
  albisCard(p) {
    this.gradient(p, 0, 0, 160, 75, ['#5a9ee2', '#74b0e8', '#92c4ee', '#b4d8f4', '#d4ebf8'], 0, 58);
    this.cloud(p, 6, 8, 34, 12, 3);
    this.cloud(p, 58, 3, 28, 10, 5);
    const rock = { lit: '#a8b4c8', shade: '#76849c', dark: '#5e6a82', snow: '#ffffff', snowShade: '#c8d6ea' };
    this.peak(p, 46, 24, 64, 46, rock, 11, 12);
    this.peak(p, 114, 13, 64, 56, rock, 29, 17);
    this.swissFlag(p, 114, 14, 12);
    // Wiese
    for (let x = 0; x < 160; x++) {
      const top = Math.round(57 + 2 * Math.sin(x / 13));
      for (let y = top; y < 75; y++) p.set(x, y, y - top < 2 ? '#8cd064' : (this.dither(x, y, 0.25) ? '#5a9e44' : '#66ac4c'));
      if (this.rnd(x * 3) > 0.8) p.set(x, top + 6 + Math.round(this.rnd(x) * 8), this.rnd(x * 7) > 0.5 ? '#ffffff' : '#f7d117');   // Blüemli
    }
    const fir = { base: '#2a6a3a', lit: '#3e8a4c', shade: '#1e4e2a' };
    [[6, 66, 30], [16, 64, 22], [150, 66, 32], [158, 65, 24]].forEach(([x, b, h]) => this.fir(p, x, b, h, fir));
    this.signpost(p, 134, 68);
  },

  sspCard(p) {
    this.gradient(p, 0, 0, 160, 75, ['#78bcea', '#98ceef', '#bcdff5', '#dcf0fa'], 0, 30);
    this.cloud(p, 92, 2, 36, 12, 4);
    // Ferne Uferhügel mit Bäumchen
    for (let x = 0; x < 160; x++) {
      const top = Math.round(24 + 3 * Math.sin(x / 19) + 2 * Math.sin(x / 7));
      for (let y = top; y < 32; y++) p.set(x, y, y - top < 1 ? '#7ab86a' : '#5a9a5a');
      if (this.rnd(x * 5) > 0.75) p.rect(x, top - 2, 2, 3, '#3e7a48');
    }
    // See mit Wellen
    this.gradient(p, 0, 31, 160, 28, ['#86d4f0', '#52b8e2', '#2f9ed4', '#1f86bc'], 31, 58);
    for (let y = 33; y < 58; y += 3) {
      for (let x = (y * 7) % 11; x < 160; x += 9 + (y % 4)) {
        const len = 2 + Math.round(this.rnd(x + y * 31) * 3);
        p.rect(x, y, len, 1, y < 42 ? '#c8f0fc' : '#7ccff0');
        if (this.rnd(x * y) > 0.7) p.set(x + 1, y - 1, '#ffffff');
      }
    }
    // Ufer: Sandkante und Wiese
    for (let x = 0; x < 160; x++) {
      const top = Math.round(57 + 2 * Math.sin(x / 17 + 2) - (x < 60 ? 2 : 0));
      p.rect(x, top, 1, 2, '#e6cc8e');
      for (let y = top + 2; y < 75; y++) p.set(x, y, y - top < 4 ? '#7cc25a' : (this.dither(x, y, 0.3) ? '#5a9e44' : '#66ac4c'));
    }
    // Schilf links und rechts
    [[2, 14], [118, 40]].forEach(([x0, n]) => {
      for (let i = 0; i < n; i++) {
        const x = x0 + Math.round(this.rnd(i * 17 + x0) * (x0 > 50 ? 40 : 10)), h = 6 + Math.round(this.rnd(i * 3 + x0) * 8);
        const base = 60 + Math.round(this.rnd(i * 5 + x0) * 4);
        p.rect(x, base - h, 1, h, this.rnd(i) > 0.5 ? '#4f8a3a' : '#6aa64a');
        if (this.rnd(i * 9 + x0) > 0.55) p.rect(x, base - h - 2, 1, 3, '#7a4a22');      // Rohrkolben
      }
    });
    // Zelt: Vorderseite im Licht, Seite im Schatten, dunkler Eingang, Abspannleinen
    const apex = [26, 38], back = [44, 35], bl = [8, 66], br = [44, 66], bb = [60, 62];
    this.poly(p, [apex, back, bb, br], (x, y) => ((x + y) % 6 === 0 ? '#8e5624' : '#a8692c'));
    this.poly(p, [apex, br, bl], (x, y) => (y > 58 && this.dither(x, y, (y - 58) / 8) ? '#c88a3c' : '#e2aa58'));
    this.poly(p, [[26, 46], [33, 66], [19, 66]], () => '#2a1a10');
    this.poly(p, [[26, 54], [29, 66], [23, 66]], () => '#5a3418');                         // warmes Licht im Zelt
    for (let i = 0; i <= 18; i++) p.set(26 + i, 38 - i / 6, '#6a3e18');                     // Firststange
    for (let i = 0; i <= 14; i++) p.set(26 - i * 1.28, 38 + i * 2, '#7a4a1e');               // Kante links
    for (let i = 0; i <= 14; i++) p.set(26 + i * 1.28, 38 + i * 2, '#b87a34');               // Kante vorne rechts
    for (let i = 0; i <= 8; i++) p.set(7 - i * 0.6, 50 + i * 2, '#d8c8a0');                  // Abspannleine links
    for (let i = 0; i <= 8; i++) p.set(52 + i * 1.2, 48 + i * 2, '#d8c8a0');                 // Abspannleine rechts
    [[2, 66], [61, 64]].forEach(([x, y]) => p.rect(x, y, 1, 3, '#5a3418'));                  // Heringe
    // Lagerfeuer-Stelle: Steinring, Holz, Glut
    [[66, 66], [69, 67], [73, 67], [76, 66], [65, 64], [77, 64]].forEach(([x, y]) => { p.rect(x, y, 3, 2, '#8e929c'); p.set(x, y, '#c4c8d0'); });
    p.rect(67, 64, 10, 2, '#6a4220'); p.rect(69, 63, 6, 1, '#8a5a2e');
    [[68, 63], [71, 62], [74, 63], [72, 64]].forEach(([x, y]) => p.set(x, y, '#ff8a2a'));
    // Holzsockel für den Pokal
    p.rect(132, 58, 18, 8, '#8a5a2e'); p.rect(132, 58, 18, 1, '#b07a42'); p.rect(132, 65, 18, 1, '#5a3418');
  },

  // ---------------------------------------------------------------------
  // Kleinteile
  // ---------------------------------------------------------------------
  flame(p, ox, i) {
    const shapes = [
      ['...rr...', '..rorr..', '..roor..', '.rooyor.', '.royyor.', 'rooyyoor', 'royyyyor', 'royyyyor', '.ryyyyr.', '..rrrr..'],
      ['....r...', '...ror..', '..rooor.', '..royor.', '.rooyyr.', '.royyyor', 'rooyyyor', 'royyyyor', '.ryyyyr.', '..rrrr..'],
      ['..r.....', '..ror...', '.roor...', '.rooyr.r', '.royyorr', 'rooyyyor', 'royyyyor', 'royyyyor', '.ryyyyr.', '..rrrr..']
    ];
    const col = { r: '#e8461e', o: '#ffa630', y: '#fff27a' };
    shapes[i].forEach((row, y) => [...row].forEach((ch, x) => p.set(ox + x, y + 2, col[ch])));
  },

  sparkle(p) {
    [[3, 0], [3, 1], [3, 5], [3, 6], [0, 3], [1, 3], [5, 3], [6, 3]].forEach(([x, y]) => p.set(x, y, '#fff6c0'));
    p.rect(2, 2, 3, 3, '#fff6c0');
    p.set(3, 3, '#ffffff');
  },

  /** Kleines Gamepad im 8BitDo-Stil: Körper, Steuerkreuz, zwei Knöpfe. */
  pad(p, body, light, dark) {
    const rows = [
      '..oooooooooooooo..',
      '.obbbbbbbbbbbbbbo.',
      'oblllbbbbbbbbbblbo',
      'obbdbbbbbbbbbaabbo',
      'obdddbbbbbbbaabbbo',
      'obbdbbbbbbbbbbbbbo',
      'obbbbbooooooobbbbo',
      '.obbbo.......obbo.',
      '..ooo.........oo..',
      '..................'
    ];
    const col = { o: this.OUTLINE, b: body, l: light, d: dark, a: '#ffffff' };
    rows.forEach((row, y) => [...row].forEach((ch, x) => p.set(x, y, col[ch])));
  },

  /** Lautsprecher mit Schallwellen bzw. rotem X (Ton aus). */
  speaker(p, muted) {
    const rows = [
      '....o.......',
      '...oo.......',
      'oooso.......',
      'osssso......',
      'osssso......',
      'osssso......',
      'oooso.......',
      '...oo.......',
      '....o.......',
      '............'
    ];
    rows.forEach((row, y) => [...row].forEach((ch, x) => p.set(x, y, ch === 'o' ? '#ffffff' : ch === 's' ? '#c8ccd8' : '')));
    if (muted) {
      [[7, 3], [8, 4], [9, 5], [10, 6], [10, 2], [9, 3], [7, 5], [7, 6]].forEach(([x, y]) => p.set(x, y, '#ff5a5a'));
      p.set(8, 5, '#ff5a5a'); p.set(8, 3, '#ff5a5a'); p.set(9, 4, '#ff5a5a');
    } else {
      [[7, 3], [7, 4], [7, 5], [9, 1], [10, 2], [10, 3], [10, 4], [10, 5], [10, 6], [9, 7]].forEach(([x, y]) => p.set(x, y, '#ffffff'));
    }
  }
};
