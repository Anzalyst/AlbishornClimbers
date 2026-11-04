/* =====================================================================
 * menuArt.js – Grafiken der Spielauswahl (GameSelectScene) im Comic-Stil
 *
 * Gezeichnet in logisch halber Grösse und im Spiel 2× angezeigt; die
 * Pixeldichte (ss) ist entsprechend höher, die Linien bleiben scharf.
 * Licht kommt immer von oben links.
 *
 *   menuBackdrop   Himmel, Wolkenbank, Berge, Hügel, Tannenwald, Wegweiser,
 *                  Schweizer Fähnchen, Felsen (480×270)
 *   menuCloud0–2   Wolken zum Ziehenlassen
 *   cardAlbis      Kartenbild Albishorn Climbers (160×75)
 *   cardSsp        Kartenbild Super Sempach Party (160×75)
 *   menuFlame      Lagerfeuer, 3 Frames · menuSparkle Glitzer
 *   padIcon1/2     Controller rot/blau · speakerOn/Off Lautsprecher
 *   kesConsole     die KES-Konsole für den Einschalt-Bildschirm (IntroScene)
 * ===================================================================== */

const MenuArt = {
  SS: 4,

  createAll(scene) {
    const tex = (key, w, h, draw, frames) => Comic.tex(scene, key, w, h, draw, { ss: this.SS, frames });
    tex('menuBackdrop', 480, 270, ctx => this.backdrop(ctx));
    [0, 1, 2].forEach(i => tex(`menuCloud${i}`, 72, 26, ctx => this.cloud(ctx, 1, 1, 70, 24, i)));
    tex('cardAlbis', 160, 75, ctx => this.albisCard(ctx));
    tex('cardSsp', 160, 75, ctx => this.sspCard(ctx));
    tex('menuFlame', 24, 12, ctx => [0, 1, 2].forEach(i => this.flame(ctx, i * 8, i)), [8, 12, 3]);
    tex('menuSparkle', 7, 7, ctx => { Comic.burst(ctx, 3.5, 3.5, 3.4, 0.9, 4); ctx.fillStyle = '#fff6c0'; ctx.fill(); });
    tex('padIcon1', 18, 10, ctx => this.pad(ctx, '#e8463c', '#ff8a7a', '#9a1e1a'));
    tex('padIcon2', 18, 10, ctx => this.pad(ctx, '#3a7ae8', '#8ab8ff', '#1a3a8a'));
    tex('speakerOn', 12, 10, ctx => this.speaker(ctx, false));
    tex('speakerOff', 12, 10, ctx => this.speaker(ctx, true));
  },

  /** Die Konsole trägt ein Schriftlogo: erst zeichnen, wenn die Comic-Schrift geladen ist (BootScene). */
  createConsole(scene) {
    Comic.tex(scene, 'kesConsole', 200, 84, ctx => this.kesConsole(ctx), { ss: this.SS });
  },

  rnd: n => Comic.rnd(n),

  // ---------------------------------------------------------------------
  // Bausteine
  // ---------------------------------------------------------------------
  /** Berg: kantige Flanken, Schattenseite rechts vom Grat, gezackte Schneekappe. */
  peak(ctx, x, top, base, hw, c, seed, snow = 0) {
    const C = Comic, r = i => this.rnd(seed + i);
    const left = [[x - hw * 0.3, top + (base - top) * 0.3 + r(1) * 3], [x - hw * 0.56, top + (base - top) * 0.56 + r(2) * 4], [x - hw, base]];
    const right = [[x + hw * 0.26, top + (base - top) * 0.26 + r(3) * 3], [x + hw * 0.6, top + (base - top) * 0.6 + r(4) * 4], [x + hw * 1.04, base]];
    const outline = [[x, top], ...right, ...left.slice().reverse()];
    C.poly(ctx, outline);
    C.cel(ctx, c.lit, s => {
      // Schattenseite: zackig vom Gipfel nach unten
      C.poly(s, [[x, top], [x + 3, top + (base - top) * 0.28], [x - 2, top + (base - top) * 0.46], [x + 5, top + (base - top) * 0.72], [x + 1, base + 2], [x + hw * 1.2, base + 2], [x + hw, top]]);
      s.fillStyle = c.shade; s.fill();
      if (c.hatch) { s.save(); s.clip(); C.hatch(s, x, top, hw * 1.1, base - top, 2.6, c.hatch, 0.35, 0.5); s.restore(); }
      if (snow) {
        const y0 = top + snow, zig = [];
        const n = 9;
        for (let i = 0; i <= n; i++) zig.push([x - hw * 0.72 + hw * 1.44 * i / n, y0 + (i % 2 ? 4.5 : -3) + r(i + 9) * 2 - Math.abs(i - n / 2) * 1.1]);
        C.poly(s, [[x - hw, top - 2], [x + hw, top - 2], ...zig.reverse()]);
        s.fillStyle = c.snow; s.fill();
        C.poly(s, [[x, top], [x + hw, top], [x + hw, y0 + 4], [x + 2.4, y0 + 4], [x - 1, top + snow * 0.5]]);
        s.fillStyle = c.snowShade; s.fill();
      }
    }, c.lw);
  },

  /** Wolke aus Bäuschen mit Kontur und blauem Raster-Schatten. */
  cloud(ctx, ox, oy, w, h, seed) {
    const C = Comic, bumps = [];
    for (let i = 0; i < 6; i++) {
      const bx = ox + w * (0.16 + 0.68 * i / 5) + (this.rnd(seed * 10 + i) - 0.5) * 5;
      const r = h * (0.28 + 0.26 * this.rnd(seed * 20 + i)) * (i === 0 || i === 5 ? 0.78 : 1);
      bumps.push([bx, oy + h - r * 1.02, r]);
    }
    // Umriss zuerst, Fläche darüber: So bleibt nur die äussere Kontur stehen.
    // Der Schatten bleibt per Clip in der Wolke (der Hintergrund ist schon deckend).
    ctx.strokeStyle = '#4a6488'; ctx.lineWidth = 1.1;
    bumps.forEach(([x, y, r]) => { C.ellipse(ctx, x, y, r, r); ctx.stroke(); });
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    bumps.forEach(([x, y, r]) => { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); });
    ctx.fill();
    ctx.save();
    ctx.clip();
    C.fillRect(ctx, ox, oy + h * 0.72, w, h, '#d4e4f4');
    C.halftone(ctx, ox, oy + h * 0.4, w, h * 0.42, 'rgba(130,170,220,0.6)', 2.1, (u, v) => v);
    ctx.restore();
  },

  /** Wegweiser mit zwei Pfeil-Schildern. */
  signpost(ctx, x, base) {
    const C = Comic;
    C.rr(ctx, x - 0.2, base - 25, 2.6, 25, 0.4);
    C.cel(ctx, '#7a4c26', c => C.fillRect(c, x - 0.2, base - 25, 1, 25, '#53311a'), 0.55);
    [[base - 22, 1], [base - 15, -1]].forEach(([y, dir]) => {
      const x0 = dir > 0 ? x - 3 : x - 11, len = 15, tip = dir > 0 ? x0 + len + 3 : x0 - 3;
      const pts = dir > 0 ? [[x0, y], [x0 + len, y], [tip, y + 2.6], [x0 + len, y + 5.2], [x0, y + 5.2]] : [[x0 + len, y], [x0, y], [tip, y + 2.6], [x0, y + 5.2], [x0 + len, y + 5.2]];
      C.poly(ctx, pts);
      C.cel(ctx, '#e0ae66', c => {
        C.fillRect(c, x0 - 4, y + 3, len + 8, 3, '#b07c40');
        C.fillRect(c, x0 + 3, y + 2.2, len - 6, 0.7, '#6a4220');
      }, 0.55);
    });
  },

  /** Schweizer Fähnchen an einem Mast. */
  swissFlag(ctx, x, base, pole = 14) {
    const C = Comic, y = base - pole;
    C.limb(ctx, [[x, y], [x, base]], 0.9, '#dfe2e8', 0.4);
    C.poly(ctx, [[x + 0.8, y + 0.2], [x + 5, y - 0.4], [x + 11, y + 0.6], [x + 11, y + 7.4], [x + 5, y + 6.6], [x + 0.8, y + 7.2]]);
    C.cel(ctx, '#d8202a', c => C.fillRect(c, x + 6, y - 1, 2, 9, 'rgba(0,0,0,0.16)'), 0.5);
    C.fillRect(ctx, x + 5, y + 1.8, 2.2, 3.8, '#ffffff');
    C.fillRect(ctx, x + 4, y + 2.8, 4.2, 1.8, '#ffffff');
  },

  /** Felsbrocken am Boden. */
  rock(ctx, x, base, w, h) {
    const C = Comic;
    C.blob(ctx, [[x - w / 2, base + 0.5], [x - w * 0.44, base - h * 0.7], [x - w * 0.1, base - h * 1.1], [x + w * 0.4, base - h * 0.8], [x + w * 0.52, base + 0.5]]);
    C.cel(ctx, '#a4a8b2', c => {
      C.fillRect(c, x, base - h, w, h + 1, '#747882');
      C.hatch(c, x, base - h, w, h + 1, 1.5, 'rgba(23,18,31,0.45)', 0.3);
    }, 0.6);
  },

  // ---------------------------------------------------------------------
  // Hintergrund der Spielauswahl (480×270, wird 2× angezeigt)
  // ---------------------------------------------------------------------
  backdrop(ctx) {
    const C = Comic;
    C.vgrad(ctx, 0, 0, 480, 180, [[0, '#3f7fcf'], [0.45, '#7ab4e8'], [1, '#dcf0fa']]);
    C.fillRect(ctx, 0, 180, 480, 90, '#dcf0fa');
    C.halftone(ctx, 0, 0, 480, 130, 'rgba(255,255,255,0.26)', 6, (u, v) => 0.2 + v * 0.8);
    // Wolkenbank am Horizont (hinter den Bergen)
    [[-10, 92, 90, 34], [70, 100, 80, 30], [150, 96, 70, 30], [300, 98, 90, 32], [380, 90, 110, 36]]
      .forEach(([x, y, w, h], i) => this.cloud(ctx, x, y, w, h, 7 + i));

    // Ferne Berge (bläulich, mit Schnee)
    const far = { lit: '#a8bcda', shade: '#7c90b4', snow: '#f8fbfe', snowShade: '#c8d6ea', hatch: 'rgba(50,70,110,0.4)', lw: 0.7 };
    [[25, 72, 190, 70], [118, 96, 190, 60], [215, 58, 190, 80], [318, 86, 190, 62], [418, 52, 190, 84], [495, 80, 190, 50]]
      .forEach(([x, top, base, hw], i) => this.peak(ctx, x, top, base, hw, far, 100 + i * 17, 21));
    // Dunst über den Bergfüssen
    C.vgrad(ctx, 0, 150, 480, 42, [[0, 'rgba(214,235,247,0)'], [1, 'rgba(214,235,247,0.6)']]);

    // Mittlere Berge: bewaldet, grünblau
    const mid = { lit: '#76a27e', shade: '#517a64', hatch: 'rgba(25,60,50,0.5)', lw: 0.8 };
    [[70, 128, 215, 85], [190, 140, 215, 70], [300, 124, 215, 90], [440, 132, 215, 80]]
      .forEach(([x, top, base, hw], i) => this.peak(ctx, x, top, base, hw, mid, 300 + i * 23));

    // Hügel mit Wiese
    const hill = x => 186 + 7 * Math.sin(x / 41) + 4 * Math.sin(x / 15 + 1);
    const pts = [];
    for (let x = 0; x <= 480; x += 2) pts.push([x, hill(x)]);
    C.poly(ctx, [[0, 271], ...pts, [480, 271]]);
    C.cel(ctx, '#6cae52', s => {
      C.fillRect(s, 0, 170, 480, 22, '#94d06c');
      C.halftone(s, 0, 190, 480, 80, 'rgba(40,110,60,0.5)', 3.4, (u, v) => v);
    }, 0.9);
    this.swissFlag(ctx, 352, Math.round(hill(352)) + 1, 16);

    const fir = (x, base, h, c) => Art.fir(ctx, x, base, h, h * 0.62, c);
    // Ferne Tannenreihe
    const firFar = { lit: '#50906a', mid: '#3d7a56', dark: '#2c6246', lw: 0.45 };
    for (let x = -4; x < 490; x += 6) fir(x + this.rnd(x) * 3, hill(x) + 8, 14 + this.rnd(x + 9) * 9, firFar);

    // Dichter Tannenwald vorne: an den Rändern hoch, in der Mitte tiefer
    const firBack = { lit: '#3f7f50', mid: '#2e6a40', dark: '#205232', lw: 0.55 };
    const firFront = { lit: '#316a44', mid: '#224f32', dark: '#163a24', lw: 0.65 };
    for (let x = -6; x < 490; x += 9) {
      const edge = Math.abs(x - 240) / 240;
      fir(x + this.rnd(x * 3) * 4, 258, 30 + edge * 38 + this.rnd(x + 1) * 10, firBack);
    }
    for (let x = -2; x < 490; x += 13) {
      const edge = Math.abs(x - 240) / 240;
      if (edge < 0.35 && this.rnd(x) > 0.4) continue;                   // Mitte etwas lichter (Galerie-Knopf)
      fir(x + this.rnd(x * 5) * 5, 272, 34 + edge * 50 + this.rnd(x + 4) * 12, firFront);
    }
    // Waldboden mit Grasbüscheln
    C.fillRect(ctx, 0, 262, 480, 8, '#1a3a24');
    ctx.strokeStyle = '#3a7a4a'; ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let x = 0; x < 480; x += 3) if (this.rnd(x * 11) > 0.5) { ctx.moveTo(x, 263); ctx.lineTo(x + this.rnd(x) - 0.5, 260 + this.rnd(x) * 2); }
    ctx.stroke();

    // Wanderweg-Schild, Felsen, Laubbaum
    this.signpost(ctx, 104, 264);
    this.rock(ctx, 66, 264, 16, 7);
    this.rock(ctx, 412, 265, 20, 8);
    C.rr(ctx, 446.6, 254, 3.4, 10, 0.5);
    C.ink(ctx, '#5a3a1e', 0.55);
    C.blob(ctx, [[434, 248], [438, 236], [449, 232], [461, 237], [463, 249], [455, 257], [441, 257]]);
    C.cel(ctx, '#4a8e3a', s => {
      C.ellipse(s, 442, 240, 10, 8); s.fillStyle = '#6ab04a'; s.fill();
      C.ellipse(s, 456, 254, 12, 8); s.fillStyle = '#2e6a2e'; s.fill();
      C.halftone(s, 432, 232, 34, 26, 'rgba(20,70,30,0.4)', 2.4, (u, v) => (u + v) / 2);
    }, 0.7);
  },

  // ---------------------------------------------------------------------
  // Kartenbilder (160×75)
  // ---------------------------------------------------------------------
  albisCard(ctx) {
    const C = Comic;
    C.vgrad(ctx, 0, 0, 160, 60, [[0, '#5a9ee2'], [1, '#d4ebf8']]);
    C.halftone(ctx, 0, 0, 160, 40, 'rgba(255,255,255,0.3)', 4, (u, v) => 0.2 + v * 0.8);
    this.cloud(ctx, 6, 6, 34, 13, 3);
    this.cloud(ctx, 58, 2, 28, 11, 5);
    const rock = { lit: '#b4c0d4', shade: '#7c8aa2', snow: '#ffffff', snowShade: '#c8d6ea', hatch: 'rgba(40,55,85,0.5)', lw: 0.8 };
    this.peak(ctx, 46, 24, 64, 46, rock, 11, 12);
    this.peak(ctx, 114, 13, 64, 56, rock, 29, 17);
    this.swissFlag(ctx, 114, 14, 12);
    // Wiese mit Blüemli
    const pts = [];
    for (let x = 0; x <= 160; x += 2) pts.push([x, 57 + 2 * Math.sin(x / 13)]);
    C.poly(ctx, [[-1, 76], ...pts, [161, 76]]);
    C.cel(ctx, '#68ae4e', s => {
      C.fillRect(s, 0, 52, 160, 8, '#94d868');
      C.halftone(s, 0, 60, 160, 15, 'rgba(40,110,50,0.4)', 2.4, (u, v) => v);
    }, 0.7);
    for (let x = 2; x < 160; x += 3) {
      if (this.rnd(x * 3) <= 0.7) continue;
      C.burst(ctx, x, 62 + this.rnd(x) * 10, 1.1, 0.5, 5);
      C.ink(ctx, this.rnd(x * 7) > 0.5 ? '#ffffff' : '#f7d117', 0.2);
    }
    const fir = { lit: '#3e8a4c', mid: '#2a6a3a', dark: '#1e4e2a', lw: 0.55 };
    [[6, 66, 30], [16, 64, 22], [150, 66, 32], [158, 65, 24]].forEach(([x, b, h]) => Art.fir(ctx, x, b, h, h * 0.62, fir));
    this.signpost(ctx, 134, 68);
  },

  sspCard(ctx) {
    const C = Comic;
    C.vgrad(ctx, 0, 0, 160, 30, [[0, '#78bcea'], [1, '#dcf0fa']]);
    this.cloud(ctx, 92, 1, 36, 13, 4);
    // Ferne Uferhügel mit Bäumchen
    const top = x => 24 + 3 * Math.sin(x / 19) + 2 * Math.sin(x / 7);
    for (let x = 2; x < 160; x += 5) {
      if (this.rnd(x * 5) > 0.45) { C.ellipse(ctx, x, top(x) - 1, 2.6, 3); C.ink(ctx, '#3e7a48', 0.35); }
    }
    const hill = [];
    for (let x = 0; x <= 160; x += 2) hill.push([x, top(x)]);
    C.poly(ctx, [[-1, 34], ...hill, [161, 34]]);
    C.ink(ctx, '#6aaa62', 0.55);
    // See mit Wellen
    C.vgrad(ctx, 0, 31, 160, 28, [[0, '#86d4f0'], [1, '#1f86bc']]);
    C.halftone(ctx, 0, 40, 160, 20, 'rgba(10,90,140,0.4)', 2.6, (u, v) => v);
    ctx.lineWidth = 0.6;
    for (let y = 34; y < 58; y += 4) {
      for (let x = (y * 7) % 11; x < 160; x += 12 + (y % 4)) {
        const len = 3 + this.rnd(x + y * 31) * 3;
        C.curve(ctx, [[x, y], [x + len / 2, y - 1], [x + len, y]]);
        ctx.strokeStyle = y < 44 ? '#e4f8ff' : '#a6e0f6'; ctx.stroke();
      }
    }
    // Ufer: Sandkante und Wiese
    const shore = [];
    for (let x = 0; x <= 160; x += 2) shore.push([x, 57 + 2 * Math.sin(x / 17 + 2) - (x < 60 ? 2 : 0)]);
    C.poly(ctx, [[-1, 76], ...shore, [161, 76]]);
    C.cel(ctx, '#e6cc8e', s => {
      C.poly(s, [[0, 76], ...shore.map(([x, y]) => [x, y + 2.4]), [160, 76]]);
      s.fillStyle = '#70b552'; s.fill();
      C.halftone(s, 0, 62, 160, 14, 'rgba(40,110,50,0.4)', 2.4, (u, v) => v);
    }, 0.7);
    // Schilf links und rechts
    [[2, 12], [118, 26]].forEach(([x0, n]) => {
      for (let i = 0; i < n; i++) {
        const x = x0 + this.rnd(i * 17 + x0) * (x0 > 50 ? 40 : 10), h = 6 + this.rnd(i * 3 + x0) * 8;
        const base = 60 + this.rnd(i * 5 + x0) * 4;
        C.line(ctx, [[x, base], [x + 0.3, base - h]], 0.7, this.rnd(i) > 0.5 ? '#4f8a3a' : '#6aa64a');
        if (this.rnd(i * 9 + x0) > 0.55) { C.rr(ctx, x - 0.5, base - h - 3, 1.3, 3.4, 0.5); C.ink(ctx, '#7a4a22', 0.2); }
      }
    });
    // Zelt: Vorderseite im Licht, Seite im Schatten, dunkler Eingang, Abspannleinen
    C.line(ctx, [[8, 46], [1, 66]], 0.35, '#efe0b8');
    C.line(ctx, [[52, 46], [62, 64]], 0.35, '#efe0b8');
    C.poly(ctx, [[26, 38], [44, 35], [60, 62], [44, 66]]);
    C.cel(ctx, '#a8692c', s => C.hatch(s, 26, 35, 34, 31, 2.2, 'rgba(50,25,8,0.45)', 0.35), 0.8);
    C.poly(ctx, [[26, 38], [44, 66], [8, 66]]);
    C.cel(ctx, '#e2aa58', s => {
      C.halftone(s, 8, 50, 36, 16, 'rgba(170,100,30,0.55)', 2.2, (u, v) => v);
      C.poly(s, [[26, 46], [33, 66], [19, 66]]); s.fillStyle = '#2a1a10'; s.fill();
      C.poly(s, [[26, 54], [29, 66], [23, 66]]); s.fillStyle = '#7a4a22'; s.fill();
    }, 0.8);
    // Lagerfeuer-Stelle: Steinring, Holz
    [[66, 66], [69, 67], [73, 67], [76, 66], [65, 64], [77, 64]].forEach(([x, y]) => {
      C.ellipse(ctx, x + 1.4, y + 1, 1.7, 1.1); C.ink(ctx, '#a0a4ae', 0.35);
    });
    C.limb(ctx, [[67, 65.4], [76, 64]], 1.2, '#6a4220', 0.3);
    C.limb(ctx, [[68, 63.6], [76, 65.6]], 1.2, '#8a5a2e', 0.3);
    // Holzsockel für den Pokal
    C.rr(ctx, 132, 58, 18, 8, 0.8);
    C.cel(ctx, '#8a5a2e', s => { C.fillRect(s, 132, 58, 18, 1.2, '#c08a50'); C.fillRect(s, 132, 63, 18, 3, '#5a3418'); }, 0.6);
  },

  // ---------------------------------------------------------------------
  // Kleinteile
  // ---------------------------------------------------------------------
  flame(ctx, ox, i) {
    const C = Comic;
    const lean = [0, 0.8, -0.8][i], tip = [1, 0.4, 0.8][i];
    const shape = (s, dy) => [[ox + 4 + lean * 1.6 * s, 2 + tip + dy], [ox + 6.6 * 1 - (1 - s) * 2.2, 6.4 + dy * 0.4], [ox + 6 - (1 - s) * 1.5, 10.6], [ox + 2 + (1 - s) * 1.5, 10.6], [ox + 1.4 + (1 - s) * 2.2, 6.4 + dy * 0.4]];
    C.blob(ctx, shape(1, 0)); C.ink(ctx, '#e8461e', 0.5);
    C.blob(ctx, shape(0.72, 2)); ctx.fillStyle = '#ffa630'; ctx.fill();
    C.blob(ctx, shape(0.42, 4)); ctx.fillStyle = '#fff27a'; ctx.fill();
  },

  /** Kleines Gamepad: Körper, Griffe, Steuerkreuz, zwei Knöpfe. */
  pad(ctx, body, light, dark) {
    const C = Comic;
    C.blob(ctx, [[1, 3], [5, 0.8], [13, 0.8], [17, 3], [17.4, 8.4], [14, 9], [11.5, 6.2], [6.5, 6.2], [4, 9], [0.6, 8.4]]);
    C.cel(ctx, body, s => {
      C.fillRect(s, 0, 0, 18, 2, light);
      C.fillRect(s, 0, 6, 18, 4, dark);
    }, 0.6);
    C.fillRect(ctx, 4, 2.2, 1.2, 3.6, dark);
    C.fillRect(ctx, 2.8, 3.4, 3.6, 1.2, dark);
    [[12.4, 4.4], [14.6, 3.2]].forEach(([x, y]) => { C.ellipse(ctx, x, y, 0.9, 0.9); C.ink(ctx, '#ffffff', 0.25); });
  },

  /** Lautsprecher mit Schallwellen bzw. rotem X (Ton aus). */
  speaker(ctx, muted) {
    const C = Comic;
    C.poly(ctx, [[0.8, 3.4], [2.8, 3.4], [5.4, 0.8], [5.4, 9], [2.8, 6.4], [0.8, 6.4]]);
    C.ink(ctx, '#ffffff', 0.6);
    ctx.lineWidth = 0.9;
    if (muted) {
      ctx.strokeStyle = '#ff4a4a';
      ctx.beginPath(); ctx.moveTo(7, 3); ctx.lineTo(10.6, 6.8); ctx.moveTo(10.6, 3); ctx.lineTo(7, 6.8); ctx.stroke();
    } else {
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(5.4, 4.9, 2.6, -0.7, 0.7); ctx.stroke();
      ctx.beginPath(); ctx.arc(5.4, 4.9, 5, -0.7, 0.7); ctx.stroke();
    }
  },

  /** Position der LED-Pünktchen über den sechs Knöpfen (für die Leuchten in der IntroScene). */
  KES_BUTTONS: [116, 128, 140, 152, 164, 176],
  KES_LED_Y: 45,

  /**
   * KES-Konsole (200×84, wird 2× angezeigt): Deckel mit Scharnier, eingelassener
   * Modulschacht mit Führungen und Pfeil, Lüftungsschlitze, kursives KES-Logo,
   * sechs farbige Knöpfe, Vorderseite mit Controller-Ports und Strombuchse.
   */
  kesConsole(ctx) {
    const C = Comic;
    // Scharnier-Leiste hinten
    C.rr(ctx, 48, 1, 104, 8, 1);
    C.cel(ctx, '#cfcfd5', s => C.fillRect(s, 48, 1, 104, 1.4, '#f2f2f6'), 0.9);
    // Vorderseite
    C.rr(ctx, 8, 56, 184, 26.6, 3);
    C.cel(ctx, '#a2a2aa', s => {
      C.fillRect(s, 8, 76, 184, 8, '#7c7c84');
      C.hatch(s, 8, 76, 184, 8, 2.4, 'rgba(23,18,31,0.4)', 0.4);
    }, 1.2);
    C.line(ctx, [[10, 71], [190, 71]], 0.5, '#6c6c76');
    C.rr(ctx, 90, 65.6, 20, 2.4, 0.6); C.ink(ctx, '#4c4c56', 0.4);
    [56, 112].forEach(x => { C.rr(ctx, x, 73, 32, 5, 1.2); C.ink(ctx, '#24222c', 0.8, '#6c6c76'); });   // Controller-Ports
    ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 0.7;
    ctx.beginPath();
    [[14, 50], [148, 162]].forEach(([a, b]) => { for (let x = a; x <= b; x += 2) { ctx.moveTo(x, 77); ctx.lineTo(x, 81); } });
    ctx.stroke();
    C.rr(ctx, 168, 65, 12, 11, 1);                                          // Strombuchse
    C.cel(ctx, '#5a3a28', s => C.fillRect(s, 168, 65, 12, 1.2, '#7a5440'), 0.7);
    C.rr(ctx, 172, 68, 4, 5, 0.6); C.ink(ctx, '#140c08', 0.3);
    // Deckel (Oberseite)
    C.rr(ctx, 6, 6, 188, 57.6, 7);
    C.cel(ctx, '#c9c9cf', s => {
      C.fillRect(s, 6, 6, 188, 2, '#eeeef2');
      C.fillRect(s, 6, 6, 2, 60, '#dedee4');
      C.fillRect(s, 192, 6, 2, 60, '#a4a4ac');
      C.halftone(s, 6, 44, 188, 20, 'rgba(90,90,105,0.32)', 3, (u, v) => v);
    }, 1.3);
    // Lüftungsschlitze links und rechts
    ctx.lineWidth = 0.9;
    for (let y = 12; y <= 44; y += 3) {
      [9, 186].forEach(x => {
        C.line(ctx, [[x, y], [x + 5, y]], 0.9, '#4a4a54');
        C.line(ctx, [[x, y + 1], [x + 5, y + 1]], 0.4, '#e4e4ea');
      });
    }
    // Eingelassene Mulde für das Modul
    C.rr(ctx, 26, 11, 148, 35, 5);
    C.cel(ctx, '#adadb5', s => {
      C.fillRect(s, 26, 11, 148, 2, '#7c7c86');
      C.fillRect(s, 26, 11, 2, 35, '#868690');
      C.fillRect(s, 172, 11, 2, 35, '#dcdce2');
      C.fillRect(s, 26, 44, 148, 2, '#dcdce2');
    }, 0.7);
    // Modulschacht
    C.rr(ctx, 43, 18, 114, 19, 3);
    C.cel(ctx, '#2c2a34', s => {
      C.fillRect(s, 43, 18, 114, 3, '#14121a');
      C.fillRect(s, 43, 33, 114, 4, '#3e3c48');
    }, 1.1, '#8e8e98');
    [62, 136].forEach(x => { C.rr(ctx, x, 21, 2.4, 12, 0.5); C.ink(ctx, '#7c7c86', 0.25); });
    C.poly(ctx, [[96.5, 28.5], [103.5, 28.5], [100, 32.6]]);                 // Pfeil nach unten
    ctx.fillStyle = '#5e5c6a'; ctx.fill();
    // KES-Logo: kräftige Comic-Lettern, kursiv, mit Schlagschatten
    ctx.save();
    ctx.font = `17px ${FONT_TITLE}`;
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#7e7e88'; ctx.fillText('KES', 22, 47.4);
    ctx.strokeStyle = '#f4f4f8'; ctx.strokeText('KES', 20.4, 46);
    ctx.fillStyle = '#2a2832'; ctx.fillText('KES', 20.4, 46);
    ctx.restore();
    // Sechs Knöpfe
    const btn = [['#d8322a', '#8a1612'], ['#f0b818', '#a87410'], ['#38b838', '#1e6e1e'], ['#2a6ee0', '#183e8a'], ['#5a3a28', '#3a2418'], ['#5a3a28', '#3a2418']];
    this.KES_BUTTONS.forEach((cx, i) => {
      const [base, dark] = btn[i];
      C.ellipse(ctx, cx + 0.5, 54.5, 4.2, 4.2);
      C.cel(ctx, base, s => {
        C.ellipse(s, cx + 1, 56.4, 4.2, 3.2); s.fillStyle = dark; s.fill();
        C.ellipse(s, cx - 1, 52.8, 1.5, 1); s.fillStyle = '#ffffff'; s.fill();
      }, 0.65);
      C.ellipse(ctx, cx + 0.5, this.KES_LED_Y + 0.5, 0.9, 0.9); C.ink(ctx, dark, 0.3);   // LED (aus)
    });
    // Abnutzung: ein paar Kratzer
    ctx.strokeStyle = 'rgba(70,70,80,0.45)'; ctx.lineWidth = 0.3;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const x = 10 + this.rnd(i * 3.3) * 180, y = 8 + this.rnd(i * 7.7) * 54;
      if (x > 24 && x < 176 && y > 9 && y < 47) continue;
      ctx.moveTo(x, y); ctx.lineTo(x + 1 + this.rnd(i) * 3, y + this.rnd(i * 2) * 1.4);
    }
    ctx.stroke();
  }
};
