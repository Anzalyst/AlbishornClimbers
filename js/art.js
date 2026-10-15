/* =====================================================================
 * art.js – "Modern Pixel"-Grafiken (Sprint 4)
 *
 * Feinere Pixel-Art im Stil moderner Indie-Plattformer: Kacheln mit
 * Verläufen, Licht von oben links, weichen Schatten und Varianten,
 * animiertes Wasser, Mechanik-Objekte (Aufzug, Förderband, Zugbrücke,
 * Farbtasten) und ein mehrschichtiger Parallax-Hintergrund.
 *
 * Alles wird per Canvas gezeichnet (keine Bilddateien). Art.createAll()
 * läuft in der BootScene, nach den Figuren und Objekt-Texturen.
 * ===================================================================== */

const Art = {
  // ---------------------------------------------------------------------
  // Helfer
  // ---------------------------------------------------------------------
  canvas(scene, key, w, h, draw) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.createCanvas(key, w, h);
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;
    draw(ctx, w, h, tex);
    tex.refresh();
    return tex;
  },

  /** Deterministischer Zufall – Kacheln sehen bei jedem Start gleich aus. */
  rng(seed) {
    let s = seed % 233280;
    return () => (s = (s * 9301 + 49297) % 233280) / 233280;
  },

  rect(ctx, x, y, w, h, color) {
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

  createAll(scene) {
    this.terrain(scene);
    this.water(scene);
    this.objects(scene);
    this.mechanisms(scene);
    this.backgrounds(scene);
    this.effects(scene);
  },

  // ---------------------------------------------------------------------
  // Gelände
  // ---------------------------------------------------------------------
  soil(ctx, rnd, top = 0) {
    // Ruhige Grundfarbe (kein Verlauf pro Kachel → keine Streifen); die
    // Abdunklung in der Tiefe übernimmt die GameScene per Tint.
    this.rect(ctx, 0, top, TILE, TILE - top, '#80583a');
    for (let i = 0; i < 14; i++) {
      this.rect(ctx, Math.floor(rnd() * 30), top + Math.floor(rnd() * (TILE - top - 2)), 2, 2, rnd() < 0.5 ? '#86603f' : '#7a5234');
    }
    // Steinchen mit Licht oben und Schatten unten
    for (let i = 0; i < 7; i++) {
      const x = Math.floor(rnd() * 28), y = top + 2 + Math.floor(rnd() * (TILE - top - 5));
      const w = 2 + Math.floor(rnd() * 3);
      this.rect(ctx, x, y, w, 2, '#a3794e');
      this.rect(ctx, x, y, w, 1, '#b98f63');
      this.rect(ctx, x, y + 2, w, 1, '#5b3b21');
    }
    // feine Wurzeln / dunkle Sprenkel
    for (let i = 0; i < 6; i++) {
      this.rect(ctx, Math.floor(rnd() * 31), top + Math.floor(rnd() * (TILE - top - 1)), 1, 1, '#5e3d22');
    }
  },

  terrain(scene) {
    // Erde (2 Varianten)
    [11, 23].forEach((seed, i) => this.canvas(scene, `earth${i}`, TILE, TILE, ctx => this.soil(ctx, this.rng(seed))));

    // Erde mit Grasdecke (3 Varianten, eine mit Blümchen)
    [5, 17, 29].forEach((seed, i) => this.canvas(scene, `grass${i}`, TILE, TILE, ctx => {
      const rnd = this.rng(seed);
      this.soil(ctx, rnd, 6);
      this.vgrad(ctx, 0, 0, TILE, 8, [[0, '#8ad868'], [1, '#55a442']]);
      for (let x = 0; x < TILE; x++) {
        const hang = Math.floor(rnd() * 4);              // ungleichmässige Graskante
        this.rect(ctx, x, 8, 1, hang, '#4f9a3e');
        this.rect(ctx, x, 8 + hang, 1, 1, '#3c7a31');
      }
      this.rect(ctx, 0, 0, TILE, 1, '#b6ee8c');           // Lichtkante oben
      for (let i = 0; i < 6; i++) this.rect(ctx, Math.floor(rnd() * 31), 1 + Math.floor(rnd() * 4), 1, 2, '#6cc052');
      if (i === 2) {
        [[6, '#ffffff'], [19, '#ffd84a'], [26, '#ff9ac8']].forEach(([x, c]) => {
          this.rect(ctx, x, 1, 2, 2, c);
          this.rect(ctx, x, 3, 1, 1, '#3c7a31');
        });
      }
    }));

    // Fels: unregelmässige Platten mit Licht/Schatten und etwas Moos
    this.canvas(scene, 'rock', TILE, TILE, ctx => {
      const rnd = this.rng(41);
      this.vgrad(ctx, 0, 0, TILE, TILE, [[0, '#8f949e'], [1, '#6a6e78']]);
      const slabs = [[1, 1, 14, 13], [16, 1, 15, 9], [16, 11, 15, 10], [1, 15, 9, 16], [11, 15, 20, 16]];
      slabs.forEach(([x, y, w, h]) => {
        this.rect(ctx, x, y, w, h, '#848993');
        this.rect(ctx, x, y, w, 1, '#acb1ba');
        this.rect(ctx, x, y, 1, h, '#a0a5ae');
        this.rect(ctx, x, y + h - 1, w, 1, '#5b5f69');
        this.rect(ctx, x + w - 1, y, 1, h, '#62666f');
      });
      for (let i = 0; i < 5; i++) this.rect(ctx, Math.floor(rnd() * 30), Math.floor(rnd() * 30), 2, 1, '#73985a');
    });

    // Bachstein, nass glänzend
    this.canvas(scene, 'stone', TILE, TILE, ctx => {
      this.radial(ctx, 13, 12, 22, [[0, '#aeb3bc'], [0.7, '#7d828c'], [1, '#5d616b']]);
      ctx.clearRect(0, 0, TILE, 2);
      this.rect(ctx, 6, 5, 8, 2, '#d6dae0');
      this.rect(ctx, 20, 4, 6, 2, '#5f8f4a');
    });

    // Seitenschatten & überhängende Grasbüschel an freien Kanten
    this.canvas(scene, 'shadeL', TILE, TILE, ctx => {
      const g = ctx.createLinearGradient(0, 0, 6, 0);
      g.addColorStop(0, 'rgba(20,10,30,0.35)'); g.addColorStop(1, 'rgba(20,10,30,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 6, TILE);
    });
    this.canvas(scene, 'shadeR', TILE, TILE, ctx => {
      const g = ctx.createLinearGradient(TILE - 6, 0, TILE, 0);
      g.addColorStop(0, 'rgba(20,10,30,0)'); g.addColorStop(1, 'rgba(20,10,30,0.35)');
      ctx.fillStyle = g; ctx.fillRect(TILE - 6, 0, 6, TILE);
    });
    this.canvas(scene, 'grassLip', 6, 12, ctx => {
      this.rect(ctx, 0, 0, 6, 3, '#8ad868');
      this.rect(ctx, 1, 3, 5, 3, '#55a442');
      this.rect(ctx, 3, 6, 3, 3, '#4f9a3e');
      this.rect(ctx, 4, 9, 2, 2, '#3c7a31');
    });
    // Grasbüschel als Deko auf der Oberfläche
    this.canvas(scene, 'tuft', 10, 8, ctx => {
      [[1, 3, '#5aa846'], [3, 1, '#7acc5c'], [5, 0, '#8ad868'], [7, 2, '#5aa846']].forEach(([x, y, c]) => this.rect(ctx, x, y, 1, 8 - y, c));
    });

    // Holzplattform mit Maserung und Metallwinkeln + weicher Schatten darunter
    this.canvas(scene, 'platform', TILE, 12, ctx => {
      this.vgrad(ctx, 0, 0, TILE, 10, [[0, '#d39a5a'], [1, '#9b6634']]);
      this.rect(ctx, 0, 0, TILE, 1, '#ecbf86');
      this.rect(ctx, 0, 10, TILE, 2, '#5e3a1c');
      [[3, 4, 9], [14, 6, 12], [24, 3, 6]].forEach(([x, y, w]) => this.rect(ctx, x, y, w, 1, '#b07a42'));
      this.rect(ctx, 15, 1, 1, 9, '#7a4c26');
      [[3, 5], [27, 5]].forEach(([x, y]) => { this.rect(ctx, x, y, 2, 2, '#4a4e58'); this.rect(ctx, x, y, 1, 1, '#9aa0aa'); });
    });
    this.canvas(scene, 'platformShadow', TILE, 12, ctx => {
      this.vgrad(ctx, 0, 0, TILE, 12, [[0, 'rgba(20,10,30,0.28)'], [1, 'rgba(20,10,30,0)']]);
    });
  },

  // ---------------------------------------------------------------------
  // Wasser: Oberfläche mit 4 Wellen-Frames, darunter tiefes Wasser
  // ---------------------------------------------------------------------
  water(scene) {
    const FRAMES = 4;
    const tex = this.canvas(scene, 'waterTop', TILE * FRAMES, TILE, ctx => {
      for (let f = 0; f < FRAMES; f++) {
        const ox = f * TILE;
        this.vgrad(ctx, ox, 0, TILE, TILE, [[0, 'rgba(92,176,240,0.88)'], [1, 'rgba(40,104,190,0.92)']]);
        for (let x = 0; x < TILE; x++) {
          const y = Math.round(2 + Math.sin((x / TILE) * Math.PI * 2 + (f / FRAMES) * Math.PI * 2) * 1.5);
          this.rect(ctx, ox + x, y, 1, 1, '#d8f2ff');
          this.rect(ctx, ox + x, y + 1, 1, 1, 'rgba(200,236,255,0.6)');
        }
        const sx = (f * 7) % TILE;
        this.rect(ctx, ox + sx, 10, 4, 1, 'rgba(220,245,255,0.5)');
        this.rect(ctx, ox + ((sx + 15) % 28), 18, 3, 1, 'rgba(220,245,255,0.35)');
      }
    });
    for (let f = 0; f < FRAMES; f++) tex.add(f, 0, f * TILE, 0, TILE, TILE);
    this.canvas(scene, 'waterDeep', TILE, TILE, ctx => {
      this.vgrad(ctx, 0, 0, TILE, TILE, [[0, 'rgba(40,104,190,0.92)'], [1, 'rgba(24,70,150,0.95)']]);
      this.rect(ctx, 5, 9, 6, 1, 'rgba(160,210,255,0.25)');
      this.rect(ctx, 19, 22, 7, 1, 'rgba(160,210,255,0.2)');
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
    this.rect(ctx, 0, 0, TILE, TILE, '#5a361a');
    this.vgrad(ctx, 2, 2, TILE - 4, TILE - 4, [[0, '#d9a463'], [1, '#a8723c']]);
    [9, 16, 23].forEach(y => this.rect(ctx, 2, y, TILE - 4, 1, '#9a6534'));
    this.rect(ctx, 2, 2, TILE - 4, 1, '#f0c88e');
    this.rect(ctx, 2, 2, 1, TILE - 4, '#e6b87c');
    for (let i = 0; i < 26; i++) this.rect(ctx, 3 + i, 3 + i, 2, 1, '#8a5a2e');   // Diagonalstrebe
    [[0, 0], [27, 0], [0, 27], [27, 27]].forEach(([x, y]) => {
      this.rect(ctx, x, y, 5, 5, '#4a4e58');
      this.rect(ctx, x + 1, y + 1, 1, 1, '#a8aeb8');
    });
    if (arrows) {
      this.rect(ctx, 9, 15, 14, 2, '#4a2c14');
      [[7, 16], [25, 16]].forEach(([x, y], i) => {
        for (let k = 0; k < 4; k++) this.rect(ctx, i ? x - k : x + k, y - k, 1, k * 2 + 1, '#4a2c14');
      });
    }
  },

  objects(scene) {
    this.canvas(scene, 'crate', TILE, TILE, ctx => this.woodCrate(ctx, false));
    this.canvas(scene, 'pushCrate', TILE, TILE, ctx => this.woodCrate(ctx, true));

    this.canvas(scene, 'boulder', TILE * 2, TILE * 2, ctx => {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(32, 36, 31, 27, 0, 0, Math.PI * 2);
      ctx.clip();
      this.radial(ctx, 22, 22, 50, [[0, '#b3b8c1'], [0.55, '#858a94'], [1, '#585c66']]);
      this.rect(ctx, 34, 34, 12, 2, '#5d616b');
      this.rect(ctx, 14, 44, 9, 2, '#5d616b');
      ctx.restore();
      this.rect(ctx, 14, 9, 22, 4, '#6cbd4f');               // Moos
      this.rect(ctx, 17, 8, 14, 2, '#8ad868');
    });

    this.canvas(scene, 'door', TILE, TILE, ctx => {
      this.vgrad(ctx, 0, 0, TILE, TILE, [[0, '#7a4f2a'], [1, '#5a391d']]);
      [0, 8, 16, 24].forEach(x => {
        this.rect(ctx, x, 0, 1, TILE, '#3e2612');
        this.rect(ctx, x + 1, 0, 1, TILE, '#94653a');
      });
      [6, 22].forEach(y => {
        this.vgrad(ctx, 0, y, TILE, 4, [[0, '#7a808c'], [1, '#3e424c']]);
        [3, 13, 23].forEach(x => { this.rect(ctx, x, y + 1, 2, 2, '#c4cad4'); this.rect(ctx, x + 1, y + 2, 1, 1, '#4a4e58'); });
      });
    });
  },

  // ---------------------------------------------------------------------
  // Mechaniken (Sprint 4)
  // ---------------------------------------------------------------------
  mechanisms(scene) {
    // Aufzug-Plattform: Metall mit Warnstreifen
    this.canvas(scene, 'liftTile', TILE, 16, ctx => {
      this.vgrad(ctx, 0, 0, TILE, 12, [[0, '#d2d7df'], [1, '#868d98']]);
      this.rect(ctx, 0, 0, TILE, 1, '#f2f5f8');
      for (let x = -4; x < TILE; x += 8) {
        for (let k = 0; k < 4; k++) this.rect(ctx, x + k, 12 + Math.min(k, 3), 4, 1, '#f2c230');
      }
      this.vgrad(ctx, 0, 12, TILE, 4, [[0, '#2a2d33'], [1, '#1a1c20']]);
      for (let x = 2; x < TILE; x += 8) this.rect(ctx, x, 12, 4, 4, '#f2c230');
      [[4, 5], [26, 5]].forEach(([x, y]) => { this.rect(ctx, x, y, 2, 2, '#5a606c'); this.rect(ctx, x, y, 1, 1, '#ffffff'); });
    });

    // Förderband: Maschine + laufender Gurt (als TileSprite gescrollt)
    this.canvas(scene, 'conveyorBase', TILE, TILE, ctx => {
      this.vgrad(ctx, 0, 0, TILE, TILE, [[0, '#4b515c'], [1, '#2c3038']]);
      ctx.fillStyle = '#626976';
      ctx.beginPath(); ctx.arc(16, 20, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2c3038';
      ctx.beginPath(); ctx.arc(16, 20, 3, 0, Math.PI * 2); ctx.fill();
      for (let a = 0; a < 6; a++) {
        const ang = (a / 6) * Math.PI * 2;
        this.rect(ctx, Math.round(16 + Math.cos(ang) * 9) - 1, Math.round(20 + Math.sin(ang) * 9) - 1, 2, 2, '#626976');
      }
      [[2, 12], [28, 12], [2, 28], [28, 28]].forEach(([x, y]) => this.rect(ctx, x, y, 2, 2, '#8a919c'));
      this.rect(ctx, 0, 0, TILE, 1, '#7a818c');
    });
    this.canvas(scene, 'conveyorBelt', TILE, 10, ctx => {
      this.vgrad(ctx, 0, 0, TILE, 10, [[0, '#3a3e46'], [1, '#202328']]);
      this.rect(ctx, 0, 0, TILE, 1, '#6a707c');
      [0, 16].forEach(x => {
        for (let k = 0; k < 6; k++) this.rect(ctx, x + 4 + (k < 3 ? k : 5 - k), 2 + k, 3, 1, '#f2c230');
      });
    });

    // Zugbrücke: Planke, Pfosten mit Umlenkrolle, unsichtbarer Kollisionsklotz
    this.canvas(scene, 'bridgePlank', TILE, 12, ctx => {
      this.vgrad(ctx, 0, 0, TILE, 12, [[0, '#c48e52'], [1, '#8e5c2e']]);
      this.rect(ctx, 0, 0, TILE, 1, '#e4b47c');
      this.rect(ctx, 0, 11, TILE, 1, '#4e3016');
      this.rect(ctx, 31, 0, 1, 12, '#6a4220');
      [[6, 2], [22, 2]].forEach(([x, y]) => this.rect(ctx, x, y, 3, 8, '#d8c08a'));   // Seilwicklungen
    });
    this.canvas(scene, 'bridgePost', 14, 48, ctx => {
      this.vgrad(ctx, 4, 6, 6, 42, [[0, '#8e5c2e'], [1, '#5a391d']]);
      ctx.fillStyle = '#6a707c'; ctx.beginPath(); ctx.arc(7, 6, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c4cad4'; ctx.beginPath(); ctx.arc(7, 6, 2, 0, Math.PI * 2); ctx.fill();
    });
    this.canvas(scene, 'bridgeHit', TILE, 12, () => {});

    // Farbtasten (Wandpanel auf Pfosten), je Farbe aus/an
    const colors = { red: ['#c8322c', '#ff6a5a'], blue: ['#2c62c8', '#6aa4ff'], yellow: ['#d6a41c', '#ffe066'], green: ['#2a8a36', '#6af07a'] };
    Object.entries(colors).forEach(([name, [dark, light]]) => {
      [false, true].forEach(on => {
        this.canvas(scene, `btn_${name}_${on ? 'on' : 'off'}`, 28, 44, ctx => {
          this.vgrad(ctx, 12, 20, 4, 24, [[0, '#7a808c'], [1, '#4a4e58']]);
          if (on) this.radial(ctx, 14, 12, 14, [[0, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]);
          this.vgrad(ctx, 3, 2, 22, 20, [[0, '#5a606c'], [1, '#353a44']]);
          this.rect(ctx, 3, 2, 22, 1, '#8a919c');
          ctx.fillStyle = on ? light : dark;
          ctx.beginPath(); ctx.arc(14, 12, 7, 0, Math.PI * 2); ctx.fill();
          this.rect(ctx, 11, 8, 3, 2, 'rgba(255,255,255,0.7)');
        });
      });
    });
    // --- Hindernisse (js/game/obstacles/) ---------------------------------
    // Bröckel-Plattform: rissige Steinplatte
    this.canvas(scene, 'crumbleTile', TILE, 12, ctx => {
      this.vgrad(ctx, 0, 0, TILE, 12, [[0, '#c9b49a'], [1, '#8a7258']]);
      this.rect(ctx, 0, 0, TILE, 1, '#e8d8c0');
      this.rect(ctx, 0, 11, TILE, 1, '#5a4632');
      ctx.strokeStyle = '#4a3a28'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(9, 1); ctx.lineTo(12, 6); ctx.lineTo(10, 11); ctx.moveTo(12, 6); ctx.lineTo(17, 7);
      ctx.moveTo(23, 0); ctx.lineTo(21, 5); ctx.lineTo(25, 11); ctx.stroke();
      [[4, 4], [28, 7], [16, 3]].forEach(([x, y]) => this.rect(ctx, x, y, 2, 2, '#6a5640'));
    });
    // Pendel: Schaukelbrett und Aufhängung
    this.canvas(scene, 'swingPlank', TILE, 12, ctx => {
      this.vgrad(ctx, 0, 0, TILE, 12, [[0, '#d49a5a'], [1, '#94602e']]);
      this.rect(ctx, 0, 0, TILE, 1, '#f0c48a');
      this.rect(ctx, 0, 11, TILE, 1, '#4e3016');
      this.rect(ctx, 31, 0, 1, 12, '#6a4220');
      this.rect(ctx, 0, 5, TILE, 1, '#a8703a');
    });
    this.canvas(scene, 'pivotBolt', 14, 14, ctx => {
      ctx.fillStyle = '#3a3e46'; ctx.beginPath(); ctx.arc(7, 7, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9aa0aa'; ctx.beginPath(); ctx.arc(7, 7, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a3e46'; ctx.beginPath(); ctx.arc(7, 7, 2, 0, Math.PI * 2); ctx.fill();
    });
    // Baumstamm (wird als TileSprite gekachelt) und Schilf am Ufer
    this.canvas(scene, 'logTile', TILE, 18, ctx => {
      this.vgrad(ctx, 0, 0, TILE, 18, [[0, '#a8743e'], [0.5, '#7a4e26'], [1, '#4e3016']]);
      this.rect(ctx, 0, 1, TILE, 1, '#c8945a');
      [[3, 6, 10], [18, 10, 9], [10, 13, 7]].forEach(([x, y, w]) => this.rect(ctx, x, y, w, 1, '#5a3a1c'));
      ctx.fillStyle = '#5a3a1c'; ctx.beginPath(); ctx.ellipse(26, 7, 2.5, 1.8, 0, 0, Math.PI * 2); ctx.fill();
      this.rect(ctx, 0, 16, TILE, 2, 'rgba(255,255,255,0.35)');   // Wasserlinie
    });
    this.canvas(scene, 'reeds', 28, 30, ctx => {
      [[4, 30, 6], [9, 30, 0], [14, 30, 3], [19, 30, 8], [24, 30, 2]].forEach(([x, y, top]) => {
        this.rect(ctx, x, top + 6, 2, y - top - 6, '#3f7a2a');
        this.rect(ctx, x - 1, top, 4, 7, '#7a4e26');
      });
    });
    // Steinschlag: Höhle im Fels und rollender Brocken
    this.canvas(scene, 'rockChute', 56, 52, ctx => {
      ctx.fillStyle = '#6a6e78'; ctx.beginPath(); ctx.ellipse(28, 34, 28, 28, 0, Math.PI, 0); ctx.lineTo(56, 52); ctx.lineTo(0, 52); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a8e98'; ctx.beginPath(); ctx.ellipse(28, 34, 24, 24, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#16181c'; ctx.beginPath(); ctx.ellipse(28, 40, 17, 18, 0, Math.PI, 0); ctx.lineTo(45, 52); ctx.lineTo(11, 52); ctx.closePath(); ctx.fill();
      [[6, 30], [44, 22], [20, 12], [36, 10]].forEach(([x, y]) => this.rect(ctx, x, y, 4, 2, '#5a5e68'));
    });
    // Rollender Felsbrocken: unregelmässiger Umriss, Facetten, Risse, Moos –
    // so sieht man das Rollen. Licht & Schatten kommen aus 'rockShade', das
    // NICHT mitdreht (Licht bleibt oben links → plastisch).
    this.canvas(scene, 'rollingRock', 44, 44, ctx => {
      const radii = [20, 19, 21, 18, 20, 21, 19, 20, 18, 21, 20, 19];
      const pt = (i, k = 1) => {
        const a = (i / radii.length) * Math.PI * 2;
        return [22 + Math.cos(a) * radii[i % radii.length] * k, 22 + Math.sin(a) * radii[i % radii.length] * k];
      };
      const outline = k => { ctx.beginPath(); radii.forEach((_, i) => ctx.lineTo(...pt(i, k))); ctx.closePath(); };
      outline(1); ctx.fillStyle = '#26282e'; ctx.fill();                       // dunkle Kontur
      outline(0.9); ctx.fillStyle = '#7c7468'; ctx.fill();                     // Grundton (warmes Grau)
      // Facetten: hellere und dunklere Flächen
      [[0, 2, '#948a7c'], [3, 5, '#665e54'], [6, 8, '#8a8174'], [9, 11, '#5a534a']].forEach(([a, b, c]) => {
        ctx.beginPath(); ctx.moveTo(22, 22);
        for (let i = a; i <= b; i++) ctx.lineTo(...pt(i, 0.88));
        ctx.closePath(); ctx.fillStyle = c; ctx.fill();
      });
      outline(0.55); ctx.fillStyle = 'rgba(140,130,118,0.55)'; ctx.fill();
      // Risse
      ctx.strokeStyle = '#2e2a26'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(8, 16); ctx.lineTo(17, 21); ctx.lineTo(14, 31); ctx.lineTo(19, 37);
      ctx.moveTo(26, 6); ctx.lineTo(29, 15); ctx.lineTo(38, 19); ctx.moveTo(29, 15); ctx.lineTo(27, 24);
      ctx.moveTo(30, 33); ctx.lineTo(36, 30); ctx.stroke();
      // Moos & Flechten
      ctx.fillStyle = '#4f7a34'; ctx.beginPath(); ctx.ellipse(13, 9, 5, 3, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6f9a44'; ctx.beginPath(); ctx.ellipse(12, 8, 2.5, 1.5, -0.5, 0, Math.PI * 2); ctx.fill();
      [[33, 36], [9, 27], [24, 34]].forEach(([x, y]) => this.rect(ctx, x, y, 2, 2, '#c8c070'));
    });
    this.canvas(scene, 'rockShade', 44, 44, ctx => {
      ctx.beginPath(); ctx.arc(22, 22, 19, 0, Math.PI * 2); ctx.clip();
      const g = ctx.createLinearGradient(6, 6, 38, 38);
      g.addColorStop(0, 'rgba(255,250,235,0.42)'); g.addColorStop(0.45, 'rgba(255,255,255,0)');
      g.addColorStop(0.7, 'rgba(0,0,0,0.15)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 44, 44);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(14, 12, 4, 2.5, -0.6, 0, Math.PI * 2); ctx.fill();
    });
    this.canvas(scene, 'rockShadow', 40, 10, ctx => {
      ctx.fillStyle = 'rgba(0,0,0,1)'; ctx.beginPath(); ctx.ellipse(20, 5, 19, 4, 0, 0, Math.PI * 2); ctx.fill();
    });

    // Waagschale: Holzbrett mit Metallkante und Ösen für die Seile
    this.canvas(scene, 'scalePan', TILE, 16, ctx => {
      this.vgrad(ctx, 0, 2, TILE, 10, [[0, '#c48e52'], [1, '#8e5c2e']]);
      this.rect(ctx, 0, 2, TILE, 1, '#e4b47c');
      this.vgrad(ctx, 0, 11, TILE, 5, [[0, '#9aa0aa'], [1, '#4a4e58']]);
      this.rect(ctx, 0, 0, TILE, 2, '#c4cad4');
      this.rect(ctx, 31, 2, 1, 9, '#6a4220');
      [[3, 5], [27, 5]].forEach(([x, y]) => { this.rect(ctx, x, y, 2, 2, '#3a3e46'); });
    });
    // Sandsack (Ballast für die Waage)
    this.canvas(scene, 'sandbag', 24, 24, ctx => {
      ctx.fillStyle = '#c8a46a';
      ctx.beginPath(); ctx.moveTo(8, 2); ctx.lineTo(16, 2); ctx.lineTo(23, 22); ctx.lineTo(1, 22); ctx.closePath(); ctx.fill();
      this.rect(ctx, 1, 20, 22, 4, '#8a6a3a');
      this.rect(ctx, 8, 0, 8, 4, '#6b4a2a');
      this.rect(ctx, 6, 9, 12, 8, '#e8d8b0');
      this.rect(ctx, 3, 12, 1, 6, 'rgba(255,255,255,0.35)');
    });
    // Waagen-Lämpli: Pfosten mit Lampe und kleinem Waage-Symbol, aus/an
    [false, true].forEach(on => {
      this.canvas(scene, `scaleLamp_${on ? 'on' : 'off'}`, 28, 48, ctx => {
        this.vgrad(ctx, 12, 22, 4, 26, [[0, '#7a808c'], [1, '#4a4e58']]);
        if (on) this.radial(ctx, 14, 11, 14, [[0, 'rgba(160,255,170,0.7)'], [1, 'rgba(160,255,170,0)']]);
        this.vgrad(ctx, 4, 2, 20, 20, [[0, '#5a606c'], [1, '#353a44']]);
        ctx.fillStyle = on ? '#7dff9a' : '#2a4a30';
        ctx.beginPath(); ctx.arc(14, 12, 7, 0, Math.PI * 2); ctx.fill();
        // Waage-Symbol auf der Lampe
        this.rect(ctx, 13, 7, 2, 9, '#111111');
        this.rect(ctx, 8, 9, 12, 1, '#111111');
        this.rect(ctx, 7, 10, 3, 2, '#111111'); this.rect(ctx, 18, 10, 3, 2, '#111111');
        this.rect(ctx, 11, 16, 6, 1, '#111111');
      });
    });
    // Stoppuhr-Symbol für Zeitschalter
    this.canvas(scene, 'stopwatch', 14, 16, ctx => {
      this.rect(ctx, 5, 0, 4, 2, '#c4cad4');
      this.rect(ctx, 6, 2, 2, 2, '#c4cad4');
      ctx.fillStyle = '#111111'; ctx.beginPath(); ctx.arc(7, 9.5, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.arc(7, 9.5, 5, 0, Math.PI * 2); ctx.fill();
      this.rect(ctx, 6, 5, 2, 5, '#111111');
      this.rect(ctx, 7, 9, 3, 2, '#d7263d');
    });

    // Tafel für die Reihenfolge (Lämpchen zeichnet die GameScene darauf)
    this.canvas(scene, 'seqBoard', 84, 56, ctx => {
      this.vgrad(ctx, 38, 34, 8, 22, [[0, '#8e5c2e'], [1, '#5a391d']]);
      this.rect(ctx, 0, 0, 84, 38, '#5a391d');
      this.vgrad(ctx, 3, 3, 78, 32, [[0, '#2e3a2e'], [1, '#1e281e']]);
      this.rect(ctx, 3, 3, 78, 1, '#4a5a4a');
    });
  },

  // ---------------------------------------------------------------------
  // Hintergründe: weiche Berge mit Dunst, Hügel, Wald, Wolken, Sonne
  // ---------------------------------------------------------------------
  ridgePoints(w, base, waves) {
    const pts = [];
    for (let x = 0; x <= w; x += 2) {
      let y = base;
      waves.forEach(([amp, periods, phase]) => { y -= amp * Math.sin((x / w) * Math.PI * 2 * periods + phase); });
      pts.push([x, y]);
    }
    return pts;
  },

  fillRidge(ctx, w, h, pts, top, bottom) {
    ctx.beginPath();
    ctx.moveTo(0, h);
    pts.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(w, h);
    ctx.closePath();
    const minY = Math.min(...pts.map(p => p[1]));
    const g = ctx.createLinearGradient(0, minY, 0, h);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fill();
  },

  /** Berge mit Schneekappen und Schattenseiten (Licht kommt von rechts oben). */
  mountainLayer(scene, key, h, { base, waves, top, bottom, snowLine, shade }) {
    const w = GAME_WIDTH;
    this.canvas(scene, key, w, h, ctx => {
      const pts = this.ridgePoints(w, base, waves);
      this.fillRidge(ctx, w, h, pts, top, bottom);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, h); pts.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(w, h); ctx.closePath();
      ctx.clip();
      // Schattenseiten: wo der Grat nach rechts ansteigt
      for (let i = 1; i < pts.length; i++) {
        const slope = pts[i][1] - pts[i - 1][1];
        if (slope < 0) {
          ctx.fillStyle = `rgba(${shade},${Math.min(0.28, -slope * 0.12)})`;
          ctx.fillRect(pts[i][0], pts[i][1], 2, h);
        }
      }
      // Schnee oberhalb der Schneegrenze, sanft auslaufend
      if (snowLine !== undefined) {
        const g = ctx.createLinearGradient(0, snowLine - 50, 0, snowLine + 12);
        g.addColorStop(0, 'rgba(250,252,255,0.95)');
        g.addColorStop(1, 'rgba(250,252,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, snowLine + 12);
      }
      ctx.restore();
    });
  },

  backgrounds(scene) {
    this.mountainLayer(scene, 'mountainsFar', 260, {
      base: 150, waves: [[50, 2, 1.1], [30, 5, 0.3], [12, 11, 2.0]],
      top: '#b8cbe4', bottom: '#d6e2f0', snowLine: 112, shade: '90,110,150'
    });
    this.mountainLayer(scene, 'mountains', 300, {
      base: 170, waves: [[60, 3, 0.4], [35, 7, 1.3], [15, 13, 2.1]],
      top: '#86a2c8', bottom: '#a9bfdc', snowLine: 118, shade: '50,70,110'
    });

    // Hügel mit kleinen Baumtupfern auf dem Grat
    this.canvas(scene, 'hills', GAME_WIDTH, 220, ctx => {
      const pts = this.ridgePoints(GAME_WIDTH, 110, [[30, 2, 0.8], [18, 5, 2.4]]);
      this.fillRidge(ctx, GAME_WIDTH, 220, pts, '#7cc063', '#4f9442');
      const pts2 = this.ridgePoints(GAME_WIDTH, 150, [[25, 3, 1.7], [12, 7, 0.5]]);
      this.fillRidge(ctx, GAME_WIDTH, 220, pts2, '#5fa84e', '#3f7f38');
      const rnd = this.rng(7);
      for (let i = 0; i < pts.length; i += 9) {
        if (rnd() < 0.45) {
          const [x, y] = pts[i];
          ctx.fillStyle = '#3f8442';
          ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x - 5, y + 2); ctx.lineTo(x + 5, y + 2); ctx.fill();
        }
      }
    });

    // Tannenwald-Silhouette im Vordergrund
    this.canvas(scene, 'forest', GAME_WIDTH, 170, ctx => {
      const rnd = this.rng(19);
      const g = ctx.createLinearGradient(0, 40, 0, 170);
      g.addColorStop(0, '#3f7d4a'); g.addColorStop(1, '#2a5a36');
      ctx.fillStyle = g;
      ctx.fillRect(0, 110, GAME_WIDTH, 60);
      for (let x = -10; x < GAME_WIDTH + 10; x += 14 + Math.floor(rnd() * 10)) {
        const hgt = 50 + Math.floor(rnd() * 50);
        const top = 120 - hgt;
        ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x - 14, 125); ctx.lineTo(x + 14, 125); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(120,190,120,0.25)';           // Licht auf der Spitze
        ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + 2, top + 12); ctx.lineTo(x + 7, top + 30); ctx.lineTo(x, top + 30); ctx.fill();
        ctx.fillStyle = g;
      }
    });

    // Weiche Wolke aus überlappenden Kreisen
    this.canvas(scene, 'cloud', 160, 70, ctx => {
      [[40, 44, 26], [72, 32, 32], [108, 42, 26], [60, 50, 22], [92, 52, 22]].forEach(([x, y, r]) => {
        this.radial(ctx, x, y, r, [[0, 'rgba(255,255,255,0.95)'], [0.7, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)']]);
      });
    });

    this.canvas(scene, 'sunGlow', 400, 400, ctx => {
      this.radial(ctx, 200, 200, 200, [[0, 'rgba(255,250,225,0.9)'], [0.15, 'rgba(255,240,200,0.55)'], [1, 'rgba(255,240,200,0)']]);
    });
    this.canvas(scene, 'haze', GAME_WIDTH, 140, ctx => {
      this.vgrad(ctx, 0, 0, GAME_WIDTH, 140, [[0, 'rgba(255,255,255,0)'], [0.6, 'rgba(240,246,255,0.45)'], [1, 'rgba(240,246,255,0)']]);
    });
  },

  // ---------------------------------------------------------------------
  // Effekte: Vignette, Schatten, Staubkörnchen
  // ---------------------------------------------------------------------
  effects(scene) {
    this.canvas(scene, 'vignette', GAME_WIDTH, GAME_HEIGHT, ctx => {
      const g = ctx.createRadialGradient(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_HEIGHT * 0.45, GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH * 0.7);
      g.addColorStop(0, 'rgba(10,14,30,0)');
      g.addColorStop(1, 'rgba(10,14,30,0.42)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    });
    this.canvas(scene, 'shadow', 28, 8, ctx => {
      ctx.save(); ctx.scale(1, 8 / 28);
      this.radial(ctx, 14, 14, 14, [[0, 'rgba(10,10,20,0.5)'], [1, 'rgba(10,10,20,0)']]);
      ctx.restore();
    });
    this.canvas(scene, 'mote', 8, 8, ctx => {
      this.radial(ctx, 4, 4, 4, [[0, 'rgba(255,255,240,1)'], [1, 'rgba(255,255,240,0)']]);
    });
    this.canvas(scene, 'softDot', 10, 10, ctx => {
      this.radial(ctx, 5, 5, 5, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]);
    });
  }
};

/* ---------------------------------------------------------------------
 * Gemeinsamer Hintergrund (Himmel, Sonne, Wolken, Bergketten, Hügel,
 * Wald) mit sanftem Parallax – für Menü, Spiel und Zwischenbildschirme.
 * Gibt { update(camera, worldHeight, delta) } zurück.
 * ------------------------------------------------------------------- */
function addBackdrop(scene, skyColors = [0x8ccbf0, 0xe4f3fb], { forest = true } = {}) {
  // Himmel: Verlauf in den Level-Farben
  const sky = scene.add.graphics().setScrollFactor(0).setDepth(-100);
  sky.fillGradientStyle(skyColors[0], skyColors[0], skyColors[1], skyColors[1], 1);
  sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

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
