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
  const realInputUpdate = PlayerInput.prototype.update;   // für den Gamepad-Test
  PlayerInput.prototype.update = function () {
    INPUT_ACTIONS.forEach(a => { this.prev[a] = this.state[a]; });
    const s = scripted[this.padIndex] || {};
    INPUT_ACTIONS.forEach(a => { this.state[a] = !!s[a]; });
  };
  const setInput = (i, actions) => { scripted[i] = actions || {}; };

  // --- Spiel manuell takten ------------------------------------------------
  // Tweens rechnen mit Date.now() → ab der Übernahme (takeControl) an die
  // simulierte Spielzeit gekoppelt. Nicht früher: beim Booten braucht der
  // Browser die echte Uhr (sonst wird z. B. die Schrift nie fertig geladen).
  let T = 0;
  // Fester Startwert statt echter Uhrzeit: bei ~1.7e12 ms hingen die
  // Nachkommastellen der Tween-Berechnung sonst vom Startzeitpunkt ab.
  const CLOCK_BASE = 1e9;
  function takeControl() {
    Date.now = () => CLOCK_BASE + T;
    game.loop.sleep();
  }
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

  /**
   * Jeder Testabschnitt beginnt auf einem festen Zeitpunkt (immer vorwärts):
   * Wie viele Frames der Start bis zur IntroScene braucht, schwankt, und die
   * absolute Zeit fliesst z. B. in Tweens und die Atem-Animation ein.
   */
  function syncClock(slot) {
    T = Math.max(T, slot * 1e6);
  }

  function runLevel(index) {
    syncClock(index + 1);
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
      ['CreditsScene', undefined, 400],
      ['EndScene', undefined, 240]
    ];
    scenes.forEach(([key, data, frames], i) => {
      syncClock(LEVELS.length + 1 + i);
      const before = out.errors.length;
      startScene(key, data);
      step(frames);
      out.scenes[key + (data && data.mode ? `:${data.mode}` : '')] = out.errors.length === before ? 'ok' : 'error';
    });
  }

  // --- Gamepad & Tastatur: echte Eingabe-Schicht mit simulierten Geräten ---
  function runInputTests() {
    syncClock(LEVELS.length + 20);
    out.input = {};
    const check = (name, ok, detail = '') => {
      out.input[name] = !!ok;
      if (!ok) out.errors.push(`Eingabe-Test "${name}" fehlgeschlagen ${detail}`);
    };

    // Simulierte Controller: Slot 0 = Nicht-Standard-Gerät (z. B. Joystick-
    // Treiber), Slot 1 + 2 = Standard-Pads → Spieler 1 = Slot 1, Spieler 2 = Slot 2
    const makePad = (index, mapping) => ({
      index, mapping, id: `Testpad ${index}`, connected: true, timestamp: 0,
      axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }))
    });
    const odd = makePad(0, ''), padA = makePad(1, 'standard'), padB = makePad(2, 'standard');
    Object.defineProperty(navigator, 'getGamepads', { value: () => [odd, padA, padB], configurable: true });
    PlayerInput.prototype.update = realInputUpdate;
    const btn = (pad, i, on) => { pad.buttons[i].pressed = on; pad.buttons[i].value = on ? 1 : 0; };
    const tap = (pad, i) => { btn(pad, i, true); step(); btn(pad, i, false); step(); };
    const key = (type, keyCode) => {
      const e = new KeyboardEvent(type, { bubbles: true, cancelable: true });
      Object.defineProperty(e, 'keyCode', { value: keyCode });
      Object.defineProperty(e, 'which', { value: keyCode });
      window.dispatchEvent(e);
    };
    const active = k => game.scene.isActive(k);
    const gs = () => game.scene.getScene('GameScene');
    const startLevel = () => {
      startScene('GameScene', { levelIndex: 0 });
      step(90);   // Spieler landen lassen
    };

    // 1) Zuordnung: erster/zweiter Standard-Controller, Lücken & Fremdgeräte egal
    startLevel();
    check('Zuordnung Controller → Spieler', gs().inputs[0].getPad() === padA && gs().inputs[1].getPad() === padB);

    // 2) D-Pad bewegt nur Spieler 1, linker Stick bewegt Spieler 2
    let [p1, p2] = gs().players.map(p => p.sprite.x);
    btn(padA, 15, true); step(40); btn(padA, 15, false);
    check('D-Pad rechts bewegt Spieler 1', gs().players[0].sprite.x > p1 + 40 && Math.abs(gs().players[1].sprite.x - p2) < 2);
    p2 = gs().players[1].sprite.x;
    padB.axes[0] = -1; step(40); padB.axes[0] = 0;
    check('Linker Stick bewegt Spieler 2', gs().players[1].sprite.x < p2 - 40);
    step(30);   // ausrutschen lassen
    padB.axes[0] = 0.2; p2 = gs().players[1].sprite.x; step(20); padB.axes[0] = 0;
    check('Stick-Totzone ignoriert leichtes Antippen', Math.abs(gs().players[1].sprite.x - p2) < 2);

    // 3) A = Springen
    step(30);
    btn(padA, 0, true);
    let jumped = false;
    for (let k = 0; k < 10; k++) { step(); if (gs().players[0].sprite.body.velocity.y < -100) jumped = true; }
    btn(padA, 0, false); step(60);
    check('A springt', jumped);

    // 4) Tastatur parallel zum Controller: Spieler 1 per D-Taste, Spieler 2 per Pad
    [p1, p2] = gs().players.map(p => p.sprite.x);
    key('keydown', 68); btn(padB, 15, true); step(30); key('keyup', 68); btn(padB, 15, false); step(5);
    check('Tastatur und Controller gleichzeitig', gs().players[0].sprite.x > p1 + 30 && gs().players[1].sprite.x > p2 + 30);

    // 5) START = Pause, Spiel steht still
    tap(padA, 9); step(2);
    check('START öffnet die Pause', active('PauseScene') && game.scene.isPaused('GameScene'));
    p1 = gs().players[0].sprite.x;
    btn(padA, 15, true); step(30); btn(padA, 15, false); step(2);
    check('Spiel steht während der Pause', gs().players[0].sprite.x === p1);

    // 6) "Weiter" mit gehaltenem A darf keinen Sprung auslösen
    btn(padA, 0, true); step(3);
    check('WEITER per A schliesst die Pause', !active('PauseScene') && active('GameScene'));
    let jumpAfterResume = false;
    for (let k = 0; k < 10; k++) { step(); if (gs().players[0].sprite.body.velocity.y < -100) jumpAfterResume = true; }
    btn(padA, 0, false); step(5);
    check('Weiter-Knopf löst keinen Sprung aus', !jumpAfterResume);

    // 7) Pause → "Level neu starten" (Spieler 2 navigiert mit dem D-Pad)
    gs().players[0].sprite.body.reset(gs().players[0].sprite.x + 200, gs().players[0].sprite.y);
    tap(padB, 9); step(2);
    tap(padB, 13); tap(padB, 0); step(3);
    check('Pause → Neustart', active('GameScene') && !active('PauseScene') && Math.abs(gs().players[0].sprite.x - gs().spawns[1].x) < 2);

    // 8) Pause → Ton umschalten → Hauptmenü
    step(30);
    const mutedBefore = Sfx.muted;
    tap(padA, 9); step(2);
    tap(padA, 13); tap(padA, 13); tap(padA, 0);
    check('Pause → Ton umschalten', Sfx.muted !== mutedBefore);
    tap(padA, 0); if (Sfx.muted !== mutedBefore) Sfx.toggleMute();   // Zustand zurücksetzen
    tap(padA, 13); tap(padA, 0); step(3);
    check('Pause → Hauptmenü', active('MenuScene') && !active('GameScene') && !active('PauseScene'));

    // 9) Menü per Controller: runter, A → Passwort-Eingabe, B → zurück
    step(30);
    const menu = game.scene.getScene('MenuScene');
    tap(padA, 13); tap(padA, 0);
    check('Menü: Passwort per Controller öffnen', menu.mode === 'password');
    tap(padA, 1);
    check('Menü: B geht zurück', menu.mode === 'main');

    // 10) Tastatur: P öffnet die Pause, ESC schliesst sie (statt ins Menü zu springen)
    startLevel();
    key('keydown', 80); step(); key('keyup', 80); step(2);
    check('Taste P öffnet die Pause', active('PauseScene'));
    key('keydown', 27); step(); key('keyup', 27); step(3);
    check('ESC in der Pause spielt weiter', active('GameScene') && !active('PauseScene') && !active('MenuScene'));

    // 11) Victory: B = zurück ins Menü
    startScene('VictoryScene', { levelIndex: 0, collected: 1, total: 5 });
    step(60); tap(padB, 1); step(40);
    check('Victory: B → Menü', active('MenuScene'));

    // 12) Abspann → EndScene → Menü (Victory-Bild ist eingebettet und geladen)
    check('Victory-Bild als Textur geladen', game.textures.exists('endscreen') &&
      game.textures.get('endscreen').getSourceImage().width === 720);
    startScene('CreditsScene');
    const credits = game.scene.getScene('CreditsScene');
    credits.roll.y = credits.rollStopY; step(80);   // Abspann vorspulen
    tap(padA, 0); step(50);
    check('Abspann → EndScene', active('EndScene'));
    const end = game.scene.getScene('EndScene');
    check('EndScene zeigt das Bild', end.children.list.some(o => o.texture && o.texture.key === 'endscreen'));
    tap(padB, 0); step(5);
    check('EndScene wartet kurz vor dem Weitermachen', active('EndScene'));
    step(160); tap(padB, 0); step(50);
    check('EndScene → Menü', active('MenuScene'));

    // 13) Konsole einschalten per Controller
    startScene('IntroScene', { mode: 'logo' });
    step(5); tap(padA, 0); step(2);
    check('Startbildschirm: A schaltet ein', game.scene.getScene('IntroScene').phase !== 'off');

    Object.defineProperty(navigator, 'getGamepads', { value: () => [], configurable: true });
  }

  /** Offline-Prüfung: nur lokale Dateien geladen, Pixelschrift aktiv. */
  function checkOffline() {
    const external = performance.getEntriesByType('resource').map(e => e.name).filter(n => !n.startsWith('file:'));
    external.forEach(n => out.errors.push(`Externe Ressource geladen: ${n}`));
    const fontOk = document.fonts.check(`16px ${FONT}`) &&
      [...document.fonts].some(f => f.family.replace(/["']/g, '') === 'Press Start 2P' && f.status === 'loaded');
    if (!fontOk) out.errors.push('Schrift "Press Start 2P" ist nicht geladen');
    out.offline = { external: external.length, font: fontOk };
  }

  function finish() {
    const json = JSON.stringify(out);
    document.getElementById('result').textContent = btoa(unescape(encodeURIComponent(json)));
  }

  // Warten, bis die BootScene alle Texturen erzeugt hat und die Schrift
  // geladen ist (die BootScene wartet max. 1.5 s darauf), dann selbst takten.
  // Nicht auf die Browser-Schleife verlassen: Headless-Chrome liefert unter
  // virtueller Zeit nicht zuverlässig Animation-Frames.
  const waitStart = performance.now();
  const wait = setInterval(() => {
    const elapsed = performance.now() - waitStart;
    const booted = window.game && game.textures && game.textures.exists('hiker1');
    if (!booted || (document.fonts.status !== 'loaded' && elapsed < 2000)) {
      if (elapsed > 20000) {
        clearInterval(wait);
        out.errors.push(`Spiel startet nicht (nach 20 s): Texturen ${booted ? 'da' : 'fehlen'}, Schriften ${document.fonts.status}`);
        finish();
      }
      return;
    }
    clearInterval(wait);
    takeControl();
    for (let k = 0; k < 600 && !game.scene.isActive('IntroScene'); k++) step();
    if (!game.scene.isActive('IntroScene')) {
      out.errors.push(`BootScene wechselt nicht zur IntroScene: aktive Szenen [${game.scene.getScenes(true).map(s => s.sys.settings.key)}]`);
      finish();
      return;
    }
    checkOffline();
    try {
      for (let i = 0; i < LEVELS.length; i++) runLevel(i);
      runScenes();
      runInputTests();
    } catch (e) {
      out.errors.push(`harness: ${e.stack || e}`);
    }
    finish();
  }, 50);
})();
