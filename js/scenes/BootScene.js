/* =====================================================================
 * BootScene – Initialisierung & Assets
 *
 * Alle Grafiken werden zur Laufzeit per Code im Comic-Stil gezeichnet (Canvas,
 * siehe comicKit.js) – Bilddateien gibt es nur für die Familienbilder.
 * Die Figuren entstehen in figures.js, Gelände, Objekte, Mechaniken und
 * Hintergründe in art.js, Menü und Sempach-Party in menuArt.js und sspArt.js.
 * ===================================================================== */

class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Lade …', {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffffff'
    }).setOrigin(0.5);

    Figures.createAll(this);      // die ganze Familie (js/figures.js)
    this.createObjectTextures();
    this.createDecoTextures();
    Art.createAll(this);          // Gelände, Mechaniken & Hintergründe (art.js)
    SspArt.createAll(this);       // Grafiken der Super Sempach Party (js/ssp/sspArt.js)
    MenuArt.createAll(this);      // Spielauswahl: Landschaft, Kartenbilder, Icons (js/menuArt.js)
    // Einzige Bilddatei: Victory-Bild der EndScene (eingebettet, siehe tools/embed-images.js)
    if (typeof ENDSCREEN_IMAGE !== 'undefined') this.textures.addBase64('endscreen', ENDSCREEN_IMAGE);
    // Familienbilder für Ladebildschirme und Bildergalerie (eingebettet, siehe tools/embed-images.js)
    if (typeof LOADING_IMAGES !== 'undefined') {
      Object.entries(LOADING_IMAGES).forEach(([key, data]) => this.textures.addBase64('loading_' + key, data));
    }
    this.createAnimations();

    // Auf die Comic-Schriften warten (max. 1.5 s, sonst Fallback-Schrift),
    // dann "Konsole einschalten" (KES-Startlogo)
    const go = () => {
      MenuArt.createConsole(this);
      this.scene.start('IntroScene', { mode: 'logo' });
    };
    if (document.fonts && document.fonts.load) {
      Promise.race([
        Promise.all([document.fonts.load('16px "Comic Neue"'), document.fonts.load('16px "Bangers"')]),
        new Promise(resolve => setTimeout(resolve, 1500))
      ]).then(go, go);
    } else {
      go();
    }
  }

  createAnimations() {
    // Gehen der Erwachsenen: Frames 2/3 = Schritt, 0 = Beine zusammen
    this.anims.create({ key: 'menuFlame', frames: [0, 1, 2, 1].map(frame => ({ key: 'menuFlame', frame })), frameRate: 8, repeat: -1 });
    Object.keys(PEOPLE).forEach(name => {
      const key = `person_${name}`;
      this.anims.create({
        key: `${key}-walk`,
        frames: [{ key, frame: 2 }, { key, frame: 0 }, { key, frame: 3 }, { key, frame: 0 }],
        frameRate: 8,
        repeat: -1
      });
    });
    this.anims.create({
      key: 'cat_ginny-walk', frames: [{ key: 'cat_ginny', frame: 1 }, { key: 'cat_ginny', frame: 2 }], frameRate: 8, repeat: -1
    });
    ['hiker1', 'hiker2'].forEach(key => {
      this.anims.create({
        key: `${key}-walk`,
        frames: CHAR_FRAMES[key].run.map(frame => ({ key, frame })),
        frameRate: CHAR_FRAMES[key].runRate,
        repeat: -1
      });
    });
  }


  // ---------------------------------------------------------------------
  // Interaktive Objekte
  // ---------------------------------------------------------------------
  createObjectTextures() {
    const C = Comic;
    const tex = (key, w, h, draw, opts) => C.tex(this, key, w, h, draw, opts);
    const css = n => `#${n.toString(16).padStart(6, '0')}`;

    // Bodenschalter: eine Variante pro Besitzer (1, 2, beide) × (oben, gedrückt)
    // Schalter in der Farbe des Spielers, der sie benutzen darf (gelb = beide)
    const plateColors = { 1: PLAYER_DEFS[0].color, 2: PLAYER_DEFS[1].color, any: 0xf2b632 };
    Object.entries(plateColors).forEach(([owner, color]) => {
      [false, true].forEach(pressed => {
        tex(`plate_${owner}_${pressed ? 'down' : 'up'}`, TILE, 10, ctx => {
          const h = pressed ? 2.4 : 5;
          C.rr(ctx, 3.5, 5.6 - h, TILE - 7, h + 2.4, 1.6);
          C.cel(ctx, css(color), c => {
            C.fillRect(c, 3, 6 - h, TILE - 6, 1.3, 'rgba(255,255,255,0.65)');
            C.fillRect(c, 3, 6.6, TILE - 6, 2, 'rgba(0,0,0,0.3)');
          }, 1);
          C.rr(ctx, 0.6, 6, TILE - 1.2, 3.5, 1);
          C.cel(ctx, '#70747e', c => C.fillRect(c, 0, 6, TILE, 1, '#a4a8b2'), 1);
          [4, TILE - 4].forEach(x => { C.ellipse(ctx, x, 7.8, 0.7, 0.7); ctx.fillStyle = C.INK; ctx.fill(); });
        });
      });
    });

    // Hebel aus / an
    [false, true].forEach(on => {
      tex(on ? 'lever_on' : 'lever_off', TILE, TILE, ctx => {
        const tip = on ? [25.5, 8] : [6.5, 8];
        C.limb(ctx, [[16, 25], tip], 2.6, '#8a8e98');
        C.line(ctx, [[15.6, 24], [tip[0] - 0.4, tip[1] + 1]], 0.7, '#c9ccd4');
        C.ellipse(ctx, tip[0], tip[1], 4.6, 4.6);
        C.cel(ctx, on ? '#3fd06a' : '#e0313f', c => {
          C.ellipse(c, tip[0] - 1, tip[1] + 1.4, 4.4, 3.6); c.fillStyle = on ? '#22984a' : '#a81828'; c.fill();
          C.ellipse(c, tip[0] + 1.3, tip[1] - 1.5, 1.4, 1); c.fillStyle = '#ffffff'; c.fill();
        }, 1);
        C.blob(ctx, [[5, 31.4], [7, 23], [16, 21], [25, 23], [27, 31.4]]);
        C.cel(ctx, '#70747e', c => {
          C.fillRect(c, 4, 20, 8, 12, '#555962');
          C.hatch(c, 4, 25, 24, 7, 2.4, 'rgba(23,18,31,0.5)', 0.5);
        }, 1);
      });
    });

    // Ziel: gelber Schweizer Wanderwegweiser
    tex('goalSign', 140, 110, ctx => {
      C.rr(ctx, 12, 20, 8, 89.5, 1.5);
      C.cel(ctx, '#7a4c26', c => {
        C.fillRect(c, 12, 20, 3, 90, '#53311a');
        C.line(c, [[17, 40], [16.5, 62]], 0.6, '#53311a');
        C.line(c, [[18, 72], [17.5, 96]], 0.6, '#53311a');
      }, 1.4);
      C.poly(ctx, [[1.5, 7], [115, 7], [137, 22], [115, 37], [1.5, 37]]);
      C.cel(ctx, '#f7d117', c => {
        C.halftone(c, 1, 7, 136, 30, '#e09a10', 5, (u, v) => Math.max(0, v - 0.35) * 1.5);
        C.fillRect(c, 1, 7, 136, 2, '#fff1a0');
      }, 2);
      [[6, 12], [6, 32]].forEach(([x, y]) => { C.ellipse(ctx, x, y, 1.1, 1.1); ctx.fillStyle = C.INK; ctx.fill(); });
    });

    // Infotafel
    tex('infoSign', TILE, 44, ctx => {
      C.rr(ctx, 13.5, 20, 5, 23.5, 1);
      C.ink(ctx, '#7a4c26', 1);
      C.rr(ctx, 1.5, 1, 29, 24, 3);
      C.cel(ctx, '#1b5fbf', c => {
        C.halftone(c, 1, 1, 30, 24, '#0f3f8c', 4, (u, v) => v);
      }, 1.3);
      C.rr(ctx, 3.6, 3, 24.8, 20, 1.6);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
      C.ellipse(ctx, 16, 7.8, 1.9, 1.9); C.ink(ctx, '#ffffff', 0);
      C.rr(ctx, 14.2, 10.8, 3.6, 9, 1); C.ink(ctx, '#ffffff', 0);
    });

    // Checkpoint-Fahne (grau = noch nicht erreicht, Schweizerfahne = erreicht)
    [false, true].forEach(on => {
      tex(on ? 'flag_on' : 'flag_off', TILE, 64, ctx => {
        const fy = on ? 8 : 38;
        C.limb(ctx, [[7, 5], [7, 63.5]], 1.9, '#dfe2e8', 0.8);
        C.ellipse(ctx, 7, 4.2, 2.6, 2.6);
        C.ink(ctx, '#ffd34d', 0.8);
        const wave = [[8.2, fy], [14, fy - 1.2], [20, fy + 1], [26, fy - 0.6], [30.5, fy + 0.8], [30.5, fy + 20.8], [26, fy + 19.4], [20, fy + 21], [14, fy + 18.8], [8.2, fy + 20]];
        C.poly(ctx, wave);
        C.cel(ctx, on ? '#dc2d20' : '#8e9098', c => {
          C.fillRect(c, 8, fy - 2, 3, 26, 'rgba(0,0,0,0.22)');
          C.fillRect(c, 19, fy - 2, 3, 26, 'rgba(0,0,0,0.14)');
        }, 1.1);
        C.poly(ctx, [[17.5, fy + 4], [21.5, fy + 4], [21.5, fy + 8], [25.5, fy + 8], [25.5, fy + 12], [21.5, fy + 12], [21.5, fy + 16], [17.5, fy + 16], [17.5, fy + 12], [13.5, fy + 12], [13.5, fy + 8], [17.5, fy + 8]]);
        C.ink(ctx, '#ffffff', 0);
      });
    });

    // Edelweiss (Sammelobjekt): filzige Sternblüte mit gelber Mitte
    tex('edelweiss', 16, 16, ctx => {
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + i * Math.PI * 2 / 7;
        ctx.save();
        ctx.translate(8, 8);
        ctx.rotate(a);
        C.blob(ctx, [[1, -1.5], [5, -1.7], [7.4, 0], [5, 1.7], [1, 1.5]]);
        C.cel(ctx, '#ffffff', c => { C.fillRect(c, 1, 0.5, 7, 2, '#cfd8e0'); }, 0.55);
        ctx.restore();
      }
      C.ellipse(ctx, 8, 8, 2.5, 2.5);
      C.cel(ctx, '#f2c230', c => C.halftone(c, 5, 5, 6, 6, '#a87a10', 1.5), 0.55);
    }, { ss: 4 });

    // Rundes Pünktchen für Partikel (Staub, Funken, Sterne)
    tex('pixel', 4, 4, ctx => { C.ellipse(ctx, 2, 2, 1.9, 1.9); ctx.fillStyle = '#ffffff'; ctx.fill(); }, { ss: 4 });
    // Konfetti-Streifen (gewellt, wird eingefärbt) & vierzackiger Comic-Funke
    tex('confetti', 4, 8, ctx => {
      C.blob(ctx, [[0.4, 0.4], [3.6, 0.8], [3, 4], [3.6, 7.6], [0.4, 7.2], [1, 4]]);
      C.ink(ctx, '#ffffff', 0.4, 'rgba(23,18,31,0.55)');
    }, { ss: 4 });
    tex('spark', 6, 6, ctx => { C.burst(ctx, 3, 3, 3, 0.8, 4); ctx.fillStyle = '#ffffff'; ctx.fill(); }, { ss: 4 });

    // Partyhütchen & Ballon fürs Finale
    tex('partyHat', 16, 18, ctx => {
      C.poly(ctx, [[8, 2], [14.8, 17], [1.2, 17]]);
      C.cel(ctx, '#f7d117', c => {
        C.fillRect(c, 0, 0, 7, 18, '#d8a810');
        c.strokeStyle = '#d52b1e'; c.lineWidth = 1.7;
        [6, 10.5, 15].forEach(y => { c.beginPath(); c.moveTo(0, y + 2); c.lineTo(16, y - 2); c.stroke(); });
      }, 0.9);
      C.ellipse(ctx, 8, 2, 1.8, 1.8); C.ink(ctx, '#ffffff', 0.8);
    }, { ss: 4 });
    tex('balloon', 24, 56, ctx => {
      C.curve(ctx, [[12, 30], [14, 38], [10.5, 46], [12.5, 55.5]]);
      ctx.strokeStyle = C.INK; ctx.lineWidth = 0.7; ctx.stroke();
      C.poly(ctx, [[9.8, 27.6], [14.2, 27.6], [12.6, 30.6], [11.4, 30.6]]);
      C.ink(ctx, '#ffffff', 1);
      C.blob(ctx, [[12, 0], [24, 3], [24.4, 18], [12, 32], [-0.4, 18], [0, 3]]);
      C.cel(ctx, '#ffffff', c => {
        C.blob(c, [[-1, 8], [8, 22], [20, 24], [12, 33], [-1, 22]]); c.fillStyle = 'rgba(0,0,0,0.2)'; c.fill();
        C.ellipse(c, 16.5, 8, 2.1, 3.6, 0.4); c.fillStyle = 'rgba(255,255,255,0.95)'; c.fill();
      }, 1.2);
    });
  }

  // ---------------------------------------------------------------------
  // Deko & Hintergrund
  // ---------------------------------------------------------------------
  /** Holzfassade: Bretter mit Maserung und Schatten unter dem Dach. */
  drawTimber(ctx, x, y, w, h, gap, base, dark) {
    const C = Comic;
    C.fillRect(ctx, x, y, w, h, base);
    ctx.strokeStyle = dark; ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let yy = y + gap; yy < y + h; yy += gap) { ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(40,20,8,0.4)'; ctx.lineWidth = 0.45;
    ctx.beginPath();
    for (let i = 0; i < w / 5; i++) {
      const xx = x + C.rnd(i * 3.1) * w, yy = y + Math.floor(C.rnd(i * 5.7) * h / gap) * gap + gap * 0.5;
      ctx.moveTo(xx, yy); ctx.lineTo(Math.min(x + w, xx + 3 + C.rnd(i) * 6), yy);
    }
    ctx.stroke();
  }

  /** Fenster mit Sprossen, optional Läden und Blumenkasten. */
  drawWindow(ctx, x, y, w, h, { glass = '#8fd0ff', shutter = null, flowers = false } = {}) {
    const C = Comic;
    if (shutter) {
      [x - 5.5, x + w + 0.5].forEach(sx => {
        C.rr(ctx, sx, y, 5, h, 0.6);
        C.cel(ctx, shutter, c => {
          c.strokeStyle = 'rgba(23,18,31,0.5)'; c.lineWidth = 0.55;
          c.beginPath();
          for (let yy = y + 2; yy < y + h; yy += 2) { c.moveTo(sx, yy); c.lineTo(sx + 5, yy); }
          c.stroke();
        }, 0.8);
      });
    }
    C.rr(ctx, x, y, w, h, 0.6);
    C.cel(ctx, glass, c => {
      c.fillStyle = 'rgba(255,255,255,0.65)';
      C.poly(c, [[x + w * 0.1, y + h], [x + w * 0.55, y], [x + w * 0.85, y], [x + w * 0.4, y + h]]); c.fill();
    }, 1);
    ctx.strokeStyle = '#fbf6e8'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
    C.rr(ctx, x, y, w, h, 0.6); ctx.strokeStyle = C.INK; ctx.lineWidth = 1; ctx.stroke();
    if (flowers) {
      C.rr(ctx, x - 3, y + h + 0.4, w + 6, 3.2, 0.6);
      C.ink(ctx, '#7a4c26', 0.8);
      for (let i = 0; i <= (w + 6) / 3; i++) {
        const fx = x - 3 + i * 3 + 0.4, fy = y + h - 0.6 + (i % 2) * 0.8;
        C.ellipse(ctx, fx, fy + 0.8, 1.6, 1.4); ctx.fillStyle = '#3b8f2c'; ctx.fill();
        C.ellipse(ctx, fx, fy, 1.15, 1.15); C.ink(ctx, i % 3 ? '#e8283c' : '#ff6a7a', 0.45);
      }
    }
  }

  /** Satteldach mit Ziegelreihen, Schatten und Dachrand. */
  drawRoof(ctx, cx, top, halfW, bottom, base, dark) {
    const C = Comic;
    C.poly(ctx, [[cx, top], [cx + halfW, bottom], [cx - halfW, bottom]]);
    C.cel(ctx, base, c => {
      C.poly(c, [[cx, top], [cx - halfW, bottom], [cx - halfW * 0.25, bottom]]); c.fillStyle = dark; c.fill();
      c.strokeStyle = 'rgba(23,18,31,0.42)'; c.lineWidth = 0.6;
      c.beginPath();
      for (let y = top + 6, row = 0; y < bottom; y += 6, row++) {
        c.moveTo(cx - halfW, y); c.lineTo(cx + halfW, y);
        for (let x = cx - halfW + (row % 2) * 5; x < cx + halfW; x += 10) { c.moveTo(x, y); c.lineTo(x, y - 6); }
      }
      c.stroke();
    }, 1.8);
  }

  createDecoTextures() {
    const C = Comic;
    const tex = (key, w, h, draw) => C.tex(this, key, w, h, draw);

    // Schweizer Chalet mit Geranien
    tex('house', 112, 96, ctx => {
      C.rr(ctx, 9, 56, 94, 39.4, 1);
      C.cel(ctx, '#f0e6d0', c => {
        C.fillRect(c, 9, 56, 12, 40, '#d6c8a8');
        C.hatch(c, 9, 76, 94, 20, 3.4, 'rgba(120,90,50,0.3)', 0.5);
      }, 1.4);
      ctx.save();
      C.rr(ctx, 9, 28, 94, 30, 0); ctx.clip();
      this.drawTimber(ctx, 9, 28, 94, 30, 6, '#ad6c32', '#6d3c1a');
      C.fillRect(ctx, 9, 28, 94, 7, 'rgba(23,18,31,0.32)');
      ctx.restore();
      C.rr(ctx, 9, 28, 94, 30, 0); ctx.strokeStyle = C.INK; ctx.lineWidth = 1.3; ctx.stroke();
      [[24, 37], [70, 37]].forEach(([x, y]) => this.drawWindow(ctx, x, y, 16, 13, { shutter: '#c8392b', flowers: true }));
      this.drawWindow(ctx, 24, 66, 16, 14, { shutter: '#c8392b' });
      // Tür
      C.rr(ctx, 69, 66, 19, 29.5, 2);
      C.cel(ctx, '#6a4422', c => {
        C.fillRect(c, 69, 66, 5, 30, '#4a2d14');
        c.strokeStyle = 'rgba(23,18,31,0.6)'; c.lineWidth = 0.6;
        c.beginPath(); [75, 81].forEach(x => { c.moveTo(x, 66); c.lineTo(x, 96); }); c.stroke();
      }, 1.2);
      C.ellipse(ctx, 84.5, 82, 1.1, 1.1); C.ink(ctx, '#f2c230', 0.6);
      this.drawRoof(ctx, 56, 1, 56, 33, '#8a4a28', '#5e2f18');
      C.rr(ctx, 1, 31.4, 110, 3, 1); C.ink(ctx, '#4a2814', 1);
    });

    // Tanne
    tex('tree', 64, 96, ctx => Art.fir(ctx, 32, 95.2, 94, 62));

    // Restaurant Albishorn: Chalet mit Steinsockel, beleuchteten Fenstern & Terrasse
    tex('restaurant', 260, 150, ctx => {
      // Steinsockel: unregelmässige Quader
      C.rr(ctx, 20, 90, 220, 59.4, 1);
      C.cel(ctx, '#958f82', c => {
        C.fillRect(c, 20, 90, 22, 60, '#7a7468');
        for (let row = 0; row < 5; row++) {
          for (let i = 0; i < 12; i++) {
            const x = 20 + i * 20 + (row % 2) * 10 + C.rnd(row * 3 + i) * 3, y = 92 + row * 12;
            C.rr(c, x, y, 17 + C.rnd(i + row) * 3, 10, 1.6);
            C.ink(c, C.rnd(i * 7 + row) > 0.5 ? '#a49e90' : '#8a8478', 0.65);
          }
        }
      }, 1.6);
      // Holzfassade
      ctx.save();
      C.rr(ctx, 26, 42, 208, 50, 0); ctx.clip();
      this.drawTimber(ctx, 26, 42, 208, 50, 7, '#ad6c32', '#6d3c1a');
      C.fillRect(ctx, 26, 42, 208, 9, 'rgba(23,18,31,0.3)');
      ctx.restore();
      C.rr(ctx, 26, 42, 208, 50, 0); ctx.strokeStyle = C.INK; ctx.lineWidth = 1.5; ctx.stroke();
      // Beleuchtete Fenster oben, grosse Bogenfenster unten
      [44, 84, 160, 200].forEach(x => this.drawWindow(ctx, x, 56, 20, 22, { glass: '#ffd77a', shutter: '#2e7d32', flowers: true }));
      [44, 92, 168, 216].forEach(x => {
        ctx.beginPath(); ctx.moveTo(x - 14, 136); ctx.lineTo(x - 14, 106); ctx.arc(x, 106, 14, Math.PI, 0); ctx.lineTo(x + 14, 136); ctx.closePath();
        C.cel(ctx, '#ffc85a', c => {
          C.radial(c, x, 118, 22, [[0, 'rgba(255,245,190,0.95)'], [1, 'rgba(255,200,90,0)']]);
          c.strokeStyle = '#6f4a22'; c.lineWidth = 1;
          c.beginPath(); c.moveTo(x, 90); c.lineTo(x, 136); c.moveTo(x - 14, 112); c.lineTo(x + 14, 112); c.stroke();
        }, 1.4);
      });
      // Eingang
      C.rr(ctx, 118, 104, 24, 45.4, 3);
      C.cel(ctx, '#553318', c => {
        C.fillRect(c, 118, 104, 6, 46, '#3a2210');
        C.rr(c, 122, 108, 16, 18, 1); C.ink(c, '#ffd77a', 1);
      }, 1.5);
      C.ellipse(ctx, 136.5, 130, 1.3, 1.3); C.ink(ctx, '#f2c230', 0.6);
      // Dach und Schild (Text kommt separat drauf)
      this.drawRoof(ctx, 130, 1, 130, 49, '#8a4a28', '#5e2f18');
      C.rr(ctx, 0.8, 47, 258.4, 5.4, 1.5); C.ink(ctx, '#4a2814', 1.2);
      C.rr(ctx, 70, 21, 120, 23, 2);
      C.cel(ctx, '#f6ecd6', c => C.halftone(c, 70, 21, 120, 23, 'rgba(180,130,70,0.3)', 4, (u, v) => v), 1.6);
    });

    // Hölzerner Aussichtsturm
    tex('tower', 80, 240, ctx => {
      const beam = (a, b, w = 3) => C.limb(ctx, [a, b], w, '#8a5a2b', 0.9);
      for (let y = 220; y > 50; y -= 40) {                             // Kreuzstreben hinter den Beinen
        const inset = (240 - y) * 0.08;
        beam([14 + inset, y], [63 - inset, y - 40], 2);
        beam([66 - inset, y], [17 + inset, y - 40], 2);
        beam([14 + inset, y], [66 - inset, y], 2.4);
      }
      beam([14, 239], [30, 40], 4.6); beam([66, 239], [50, 40], 4.6);   // Beine
      C.line(ctx, [[13.4, 236], [29.2, 44]], 1, '#c08a50');
      C.line(ctx, [[66.8, 236], [50.8, 44]], 1, '#5e3a18');
      C.rr(ctx, 12, 35.5, 56, 8, 1); C.ink(ctx, '#6a3a1e', 1.2);         // Plattform
      [18, 40, 62].forEach(x => beam([x, 36], [x, 17], 1.8));             // Geländer
      beam([17, 19], [63, 19], 1.8); beam([17, 27], [63, 27], 1.2);
      C.poly(ctx, [[8, 18.5], [40, 1], [72, 18.5]]);                      // Dächlein
      C.cel(ctx, '#8a4a28', c => {
        C.poly(c, [[40, 0], [8, 19], [28, 19]]); c.fillStyle = '#5e2f18'; c.fill();
        c.strokeStyle = 'rgba(23,18,31,0.42)'; c.lineWidth = 0.6;
        c.beginPath(); [6, 11, 16].forEach(y => { c.moveTo(0, y); c.lineTo(80, y); }); c.stroke();
      }, 1.4);
    });
  }
}

/* ---------------------------------------------------------------------
 * Restaurant Albishorn samt Aussichtsturm und Schweizerfahne.
 * Wird im Level 5 (Kartenzeichen 'A') und im Geburtstags-Finale benutzt.
 * (x, bottom) = Mitte der Unterkante des Restaurants.
 * ------------------------------------------------------------------- */
function addRestaurant(scene, x, bottom, depth = 1, scale = 1) {
  const parts = [];
  parts.push(scene.add.image(x + 150 * scale, bottom, 'tower').setOrigin(0.5, 1).setScale(scale).setDepth(depth - 0.1));
  parts.push(scene.add.image(x, bottom, 'restaurant').setOrigin(0.5, 1).setScale(scale).setDepth(depth));
  parts.push(scene.add.text(x, bottom - 117 * scale, 'RESTAURANT\nALBISHORN', {
    fontFamily: FONT, fontSize: `${Math.max(5, Math.round(6 * scale))}px`, color: '#5b2d1a', align: 'center', lineSpacing: 1
  }).setOrigin(0.5).setDepth(depth));

  // Wehende Schweizerfahne auf dem Turmdach (Textur enthält schon den Mast)
  const flag = scene.add.image(x + 150 * scale, bottom - 236 * scale, 'flag_on')
    .setOrigin(7 / 32, 1).setScale(scale).setDepth(depth);
  scene.tweens.add({ targets: flag, scaleX: scale * 0.8, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  parts.push(flag);
  return parts;
}

/* ---------------------------------------------------------------------
 * Erwachsene Figur als Sprite (Tante Edith / Onkel Kurt / Sven ohne Tochter).
 * ------------------------------------------------------------------- */
function addPerson(scene, name, x, bottom, scale = 2) {
  return scene.add.sprite(x, bottom, `person_${name}`, 0).setOrigin(PEOPLE[name].originX, 1).setScale(scale);
}

/** Ginny, die getigerte Katze (Frame 0 = sitzen, Animation 'cat_ginny-walk'). */
function addGinny(scene, x, bottom, scale = 2) {
  return scene.add.sprite(x, bottom, 'cat_ginny', 0).setOrigin(0.5, 1).setScale(scale);
}

/* ---------------------------------------------------------------------
 * Sven mit der Kraxe und seiner Tochter darin.
 *   const sv = addSvenWithDaughter(scene, x, bottom, scale, depth);
 *   sv.update(time)            jeden Frame aufrufen (Tochter folgt & wippt)
 *   sv.setBob(amp, perSecond)  wie stark (Rasterpunkte) / schnell sie wippt
 *   sv.addHat()                Partyhütchen für die Tochter
 * Die Tochter liegt HINTER Sven, damit die Bügel der Kraxe vor ihr sind.
 * ------------------------------------------------------------------- */
function addSvenWithDaughter(scene, x, bottom, scale = 2, depth = 5) {
  const sven = addPerson(scene, 'sven', x, bottom, scale).setDepth(depth);
  const daughter = scene.add.image(0, 0, 'svenDaughter').setOrigin(0, 0).setScale(scale).setDepth(depth - 0.1);
  const pixel = 2 * scale;                 // Weltpixel pro Rasterpunkt
  const group = {
    sven, daughter, hat: null,
    bobAmp: 0.5, bobSpeed: 1.2,
    setBob(amp, speed) { this.bobAmp = amp; this.bobSpeed = speed; return this; },
    addHat() {
      this.hat = scene.add.image(0, 0, 'partyHat').setOrigin(0.5, 1).setScale(scale * 0.45)
        .setDepth(depth + 0.1).setAngle(-15);
      return this;
    },
    update(time) {
      const left = sven.x - sven.originX * sven.displayWidth;
      const top = sven.y - sven.displayHeight;
      const bob = -Math.abs(Math.sin(time / 1000 * Math.PI * this.bobSpeed)) * this.bobAmp * pixel;
      daughter.setPosition(left + DAUGHTER.col * pixel, top + DAUGHTER.row * pixel + bob);
      if (this.hat) this.hat.setPosition(daughter.x + 4 * pixel, daughter.y + pixel);
    }
  };
  group.update(0);
  return group;
}
