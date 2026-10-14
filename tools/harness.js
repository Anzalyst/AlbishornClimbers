/* =====================================================================
 * harness.js – Automatischer Test im Browser (wird von run-tests.js
 * zusammen mit den Spiel-Scripts aus index.html in eine Testseite geladen)
 *
 * 1. Replay: Jedes Level läuft mit festem Zeitschritt (60 FPS) und einem
 *    festen Eingabe-Drehbuch (laufen, springen, Schalter, Hebel, Farbtasten,
 *    Kisten schieben, Zufallsphase, Ziel). Alle 10 Frames wird der Zustand
 *    aller Objekte der GameScene (Position, Textur, Physik …) als Prüfsumme
 *    festgehalten. Gleiche Prüfsummen = gleiches Verhalten.
 * 2. Smoke-Test: Intro, Menü, Victory, Finale und Abspann laufen kurz an.
 *
 * Ergebnis: Base64-JSON in <pre id="result"> (liest run-tests.js aus).
 * ===================================================================== */
(function () {
  const OPTS = window.TEST_OPTS || {};
  const DT = 1000 / 60;
  const SNAP_EVERY = 10;
  // Rein visuelle Zufallseffekte (Staub, Funken, Konfetti) nicht vergleichen
  const SKIP_TEXTURES = new Set(['softDot', 'mote', 'confetti', 'spark', 'pixel']);
  const out = { errors: [], warnings: [], levels: [], scenes: {}, dump: null };

  window.addEventListener('error', e => out.errors.push(`${e.message} @ ${e.filename}:${e.lineno}`));
  console.warn = (...args) => out.warnings.push(args.join(' '));

  // --- Deterministischer Zufall ------------------------------------------
  let seed = 1;
  const reseed = s => { seed = s; };
  Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  // --- Eingaben: Drehbuch statt Tastatur/Gamepad -------------------------
  const scripted = [{}, {}];
  PlayerInput.prototype.update = function () {
    INPUT_ACTIONS.forEach(a => { this.prev[a] = this.state[a]; });
    const s = scripted[this.padIndex] || {};
    INPUT_ACTIONS.forEach(a => { this.state[a] = !!s[a]; });
  };
  const setInput = (i, actions) => { scripted[i] = actions || {}; };

  // --- Spiel manuell takten ------------------------------------------------
  // Tweens rechnen mit Date.now() → an die simulierte Spielzeit koppeln
  let T = 0;
  const realNow = Date.now();
  Date.now = () => realNow + T;
  function step(n = 1) {
    for (let k = 0; k < n; k++) {
      T += DT;
      try { game.step(T, DT); } catch (e) { out.errors.push(`step: ${e.stack || e}`); }
    }
  }
  function startScene(key, data) {
    game.scene.getScenes(false).forEach(s => {
      if (s.sys.isActive() || s.sys.isPaused() || s.sys.isSleeping()) game.scene.stop(s.sys.settings.key);
    });
    step();
    game.scene.start(key, data);
    step();
  }

  // --- Zustand erfassen ----------------------------------------------------
  const r1 = n => (typeof n === 'number' ? Math.round(n * 10) / 10 : '');
  function snapshotRows(scene) {
    const rows = [];
    const visit = o => {
      if (o.type === 'ParticleEmitter') return;
      // Texte und TileSprites haben eine zufällige interne Textur-ID →
      // bei TileSprites die Quelltextur nehmen, bei Texten nur den Inhalt
      const key = o.displayTexture ? o.displayTexture.key : (o.texture && o.type !== 'Text' ? o.texture.key : '');
      if (SKIP_TEXTURES.has(key)) return;
      if (key === '__MISSING') out.errors.push(`Fehlende Textur (${o.type} bei ${o.x},${o.y})`);
      let s = [o.type, key, o.frame ? o.frame.name : '', r1(o.x), r1(o.y), o.visible ? 1 : 0, r1(o.alpha),
        r1(o.angle), r1(o.scaleX), r1(o.scaleY), o.depth, o.flipX ? 1 : 0,
        o.tintTopLeft !== undefined ? o.tintTopLeft : '', r1(o.tilePositionX),
        o.text !== undefined ? o.text : '', o.style && o.style.color ? o.style.color : ''].join('|');
      if (o.body) {
        const b = o.body;
        s += '|B' + [r1(b.x), r1(b.y), b.enable ? 1 : 0, r1(b.velocity.x), r1(b.velocity.y), r1(b.width), r1(b.height)].join(',');
      }
      rows.push(s);
      if (o.list) o.list.forEach(visit);
    };
    scene.children.list.forEach(visit);
    return rows.sort();
  }
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }

  // --- Drehbuch pro Level ------------------------------------------------
  function cellsOf(map, pred) {
    const cells = [];
    map.forEach((row, r) => [...row].forEach((ch, c) => { if (pred(ch)) cells.push({ c, r, ch }); }));
    return cells;
  }

  function runLevel(index) {
    reseed(1000 + index);
    let inputRng = 77 + index;
    const rnd = () => { inputRng = (inputRng * 48271) % 2147483647; return inputRng / 2147483647; };

    const level = LEVELS[index];
    setInput(0); setInput(1);
    startScene('GameScene', { levelIndex: index });
    const scene = game.scene.getScene('GameScene');
    const hashes = [];
    let frame = 0;

    const tick = (n = 1) => {
      for (let k = 0; k < n; k++) {
        step();
        frame++;
        if (frame % SNAP_EVERY === 0 && game.scene.isActive('GameScene')) {
          const rows = snapshotRows(scene);
          const snapIndex = hashes.length;
          hashes.push(hash(rows.join('\n')));
          if (OPTS.dump && OPTS.dump.level === index && OPTS.dump.snap === snapIndex) out.dump = rows;
        }
      }
    };
    const teleport = (i, x, y) => {
      if (!game.scene.isActive('GameScene')) return;
      const p = scene.players[i];
      p.sprite.body.reset(x, y);
    };
    const cx = c => c * TILE + TILE / 2;
    const feetY = r => r * TILE + TILE / 2;     // Spieler-Mitte, wenn die Füsse auf der Zellen-Unterkante stehen

    // A) Laufen & Springen
    for (let f = 0; f < 240; f++) {
      setInput(0, { right: true, jump: f % 40 < 10 });
      setInput(1, { right: f < 120 || f >= 180, left: f >= 120 && f < 180, jump: f % 55 < 12 });
      tick();
    }
    setInput(0); setInput(1);

    // B) Alle Auslöser der Reihe nach benutzen
    const triggers = level.triggers || {};
    cellsOf(level.map, ch => triggers[ch]).forEach(({ c, r, ch }) => {
      const cfg = triggers[ch];
      const who = cfg.owner ? cfg.owner - 1 : 0;
      teleport(who, cx(c), feetY(r));
      if (cfg.type === 'plate') {
        tick(60);
      } else {
        tick(5);
        setInput(who, { up: true }); tick(3); setInput(who); tick(40);
      }
    });
    // Farbtasten zusätzlich in der richtigen Reihenfolge
    Object.values(level.sequences || {}).forEach(seq => {
      seq.order.forEach(color => {
        const btn = cellsOf(level.map, ch => triggers[ch] && triggers[ch].type === 'button' && triggers[ch].color === color)[0];
        if (!btn) return;
        teleport(0, cx(btn.c), feetY(btn.r));
        tick(5); setInput(0, { up: true }); tick(3); setInput(0); tick(20);
      });
      tick(120);
    });

    // C) Kisten & Felsbrocken schieben (von links, dann von rechts)
    cellsOf(level.map, ch => ch === 'k' || ch === 'K').forEach(({ c, r, ch }) => {
      const w = ch === 'K' ? 2 : 1;
      teleport(0, c * TILE - 8, feetY(r)); teleport(1, c * TILE - 10, feetY(r));
      setInput(0, { right: true }); setInput(1, { right: true }); tick(90);
      setInput(0); setInput(1); tick(10);
      teleport(0, (c + w) * TILE + 8, feetY(r)); teleport(1, (c + w) * TILE + 10, feetY(r));
      setInput(0, { left: true }); setInput(1, { left: true }); tick(60);
      setInput(0); setInput(1); tick(10);
    });

    // D) Zufallsphase
    for (let f = 0; f < 300; f++) {
      if (f % 20 === 0) {
        [0, 1].forEach(i => setInput(i, { left: rnd() < 0.35, right: rnd() < 0.5, jump: rnd() < 0.4, up: rnd() < 0.15 }));
      }
      tick();
    }
    setInput(0); setInput(1);

    // E) Beide ins Ziel → Level geschafft → Übergang zur nächsten Szene
    const goal = cellsOf(level.map, ch => ch === 'G')[0];
    if (goal) {
      teleport(0, cx(goal.c) + 10, feetY(goal.r));
      teleport(1, cx(goal.c) + 40, feetY(goal.r));
    }
    tick(400);
    out.levels.push({ index, hashes, next: game.scene.getScenes(true).map(s => s.sys.settings.key) });
  }

  function runScenes() {
    const scenes = [
      ['IntroScene', { mode: 'logo' }, 120],
      ['IntroScene', { mode: 'story' }, 400],
      ['MenuScene', undefined, 60],
      ['VictoryScene', { levelIndex: 0, collected: 2, total: 5 }, 120],
      ['FinaleScene', undefined, 900],
      ['CreditsScene', undefined, 400]
    ];
    scenes.forEach(([key, data, frames]) => {
      const before = out.errors.length;
      startScene(key, data);
      step(frames);
      out.scenes[key + (data && data.mode ? `:${data.mode}` : '')] = out.errors.length === before ? 'ok' : 'error';
    });
  }

  function finish() {
    const json = JSON.stringify(out);
    document.getElementById('result').textContent = btoa(unescape(encodeURIComponent(json)));
  }

  // Warten, bis die BootScene alle Texturen erzeugt hat, dann selbst takten
  const wait = setInterval(() => {
    if (!window.game || !game.scene || !game.scene.isActive('IntroScene')) return;
    clearInterval(wait);
    game.loop.sleep();
    try {
      for (let i = 0; i < LEVELS.length; i++) runLevel(i);
      runScenes();
    } catch (e) {
      out.errors.push(`harness: ${e.stack || e}`);
    }
    finish();
  }, 50);
})();
