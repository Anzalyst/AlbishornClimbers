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
 * 3. Eingabe-, Minispiel- und Rätsel-Tests (harness-puzzles.js).
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
  const scriptedInputUpdate = function () {
    INPUT_ACTIONS.forEach(a => { this.prev[a] = this.state[a]; });
    const s = scripted[this.padIndex] || {};
    INPUT_ACTIONS.forEach(a => { this.state[a] = !!s[a]; });
  };
  PlayerInput.prototype.update = scriptedInputUpdate;
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
  /**
   * gameplayOnly: nur die Spielwelt (ohne Texte und ohne fest am Bildschirm
   * stehende HUD-Elemente) – damit lässt sich beweisen, dass sich der
   * Spielablauf nicht ändert, wenn nur Texte/Übersetzungen geändert werden.
   */
  function snapshotRows(scene, gameplayOnly = false) {
    const rows = [];
    const visit = o => {
      if (o.type === 'ParticleEmitter') return;
      if (gameplayOnly && (o.type === 'Text' || o.scrollFactorX === 0)) return;
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
    const hashes = [], gameplay = [];
    let frame = 0;

    const tick = (n = 1) => {
      for (let k = 0; k < n; k++) {
        step();
        frame++;
        if (frame % SNAP_EVERY === 0 && game.scene.isActive('GameScene')) {
          const rows = snapshotRows(scene);
          const snapIndex = hashes.length;
          hashes.push(hash(rows.join('\n')));
          gameplay.push(hash(snapshotRows(scene, true).join('\n')));
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
    out.levels.push({ index, hashes, gameplay, next: game.scene.getScenes(true).map(s => s.sys.settings.key) });
  }

  /** Kurz an den Browser abgeben, damit Promises (z. B. Dialog-Abläufe) weiterlaufen. */
  const yieldToBrowser = () => new Promise(resolve => setTimeout(resolve, 0));

  /** Takten mit Pausen für Promises; optional drückt Jessica alle 40 Frames "Sprung". */
  async function stepAsync(frames, autoJump = false) {
    for (let k = 0; k < frames; k++) {
      if (autoJump) setInput(0, k % 40 < 2 ? { jump: true } : {});
      step();
      if (k % 5 === 0) await yieldToBrowser();
    }
    setInput(0);
  }

  async function runScenes() {
    const scenes = [
      ['IntroScene', { mode: 'logo' }, 120],
      ['IntroScene', { mode: 'story' }, 400],
      ['MenuScene', undefined, 60],
      ['VictoryScene', { levelIndex: 0, collected: 2, total: 5 }, 120],
      ['FinaleScene', undefined, 900],
      ['CreditsScene', undefined, 400],
      ['EndScene', undefined, 240]
    ];
    for (const [i, [key, data, frames]] of scenes.entries()) {
      syncClock(LEVELS.length + 1 + i);
      const before = out.errors.length;
      startScene(key, data);
      if (key === 'FinaleScene') await checkFinale();
      else if (key === 'CreditsScene') checkCredits(frames);
      else step(frames);
      // Fehlende Texturen zeigt Phaser als grünes Gitter (__MISSING)
      const sc = game.scene.getScene(key);
      const missing = [];
      const scan = o => { if (o.texture && o.texture.key === '__MISSING') missing.push(o.type); if (o.list) o.list.forEach(scan); };
      sc.children.list.forEach(scan);
      if (missing.length) out.errors.push(`${key}: ${missing.length} Objekte mit fehlender Textur`);
      out.scenes[key + (data && data.mode ? `:${data.mode}` : '')] = out.errors.length === before ? 'ok' : 'error';
    }
  }

  /** Gipfelfeier: alle kommen an, Dialog wird weitergedrückt, dann feiert die ganze Familie. */
  async function checkFinale() {
    const sc = game.scene.getScene('FinaleScene');
    const texOf = o => (o.texture ? o.texture.key : '');
    const present = ['person_angi', 'person_sven', 'svenDaughter', 'cat_ginny', 'person_edith', 'person_kurt', 'hiker1', 'hiker2']
      .filter(k => sc.children.list.some(o => texOf(o) === k));
    out.family = out.family || {};
    out.family.finale = present;
    if (present.length !== 8) out.errors.push(`Gipfel: es fehlen Familienmitglieder (da: ${present})`);
    await stepAsync(330);
    if (!sc.dialog.active) out.errors.push('Gipfel: Dialog startet nicht nach der Ankunft');
    await stepAsync(400, true);
    const hats = sc.children.list.filter(o => texOf(o) === 'partyHat').length;
    out.family.partyHats = hats;
    if (sc.celebrants.length !== 6) out.errors.push(`Gipfel: ${sc.celebrants.length} statt 6 Feiernde`);
    if (hats < 7) out.errors.push(`Gipfel: nur ${hats} Partyhütchen (erwartet 6 + Hannah)`);
  }

  /** Abspann: die ganze Familie läuft mit. */
  function checkCredits(frames) {
    const sc = game.scene.getScene('CreditsScene');
    const keys = sc.parade.map(p => p.texture.key);
    out.family = out.family || {};
    out.family.credits = keys;
    ['hiker1', 'hiker2', 'cat_ginny', 'person_sven', 'person_angi', 'person_edith', 'person_kurt'].forEach(k => {
      if (!keys.includes(k)) out.errors.push(`Abspann: ${k} läuft nicht mit`);
    });
    if (!sc.children.list.some(o => o.texture && o.texture.key === 'svenDaughter')) out.errors.push('Abspann: Hannah fehlt');
    step(frames);
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
    check('Pause → Hauptmenü (Spielauswahl)', active('GameSelectScene') && !active('GameScene') && !active('PauseScene'));

    // Spielauswahl: A auf der ersten Karte → Albishorn-Menü
    step(20); tap(padA, 0); step(30);
    check('Spielauswahl → Albishorn Climbers', active('MenuScene'));

    // 9) Menü per Controller: runter, A → Passwort-Eingabe, B → zurück
    step(30);
    const menu = game.scene.getScene('MenuScene');
    tap(padA, 13); tap(padA, 0);
    check('Menü: Passwort per Controller öffnen', menu.mode === 'password');
    tap(padA, 1);
    check('Menü: B geht zurück', menu.mode === 'main');
    tap(padA, 1); step(30);
    check('Albishorn-Menü: B → Spielauswahl', active('GameSelectScene'));

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

  // --- Super Sempach Party: Bots spielen die Minispiele ------------------
  // Jeder Bot liefert pro Frame die Aktionen für eine Spielfigur (id 1/2).
  // f = Frame-Zähler, mem = Gedächtnis des Bots. Kurze Tipper entstehen,
  // indem eine Aktion nur in einzelnen Frames gesetzt ist.
  const SSP_BOTS = {
    SspPedalo(sc, id, f, mem) {
      const b = sc.boats[id - 1];
      const a = {};
      if (f % 8 === 0) a.jump = true;
      if (f % 8 === 4) a.action = true;
      // Ente in meiner Spur voraus? → in eine Nachbarspur, in der vorne frei ist
      // from = -64: auch Enten neben dem Rumpf zählen (Boot ist 56 px lang)
      const ahead = (track, range, from = -4) => sc.ducks.some(d => d.id === id && !d.hit && d.track === track && d.x - (b.x + 66) > from && d.x - (b.x + 66) < range);
      if (ahead(b.track, 60) && f % 2 === 0) {
        const options = [b.track - 1, b.track + 1].filter(t => t >= 0 && t < PEDALO.tracks && !ahead(t, 30, -64))
          .sort((x, y) => ahead(x, 140) - ahead(y, 140));   // lieber eine Spur, die länger frei ist
        if (options.length) a[options[0] < b.track ? 'up' : 'down'] = true;
      }
      return a;
    },
    SspWasser(sc, id, f, mem) {
      const s = sc.sides[id - 1];
      const t = s.targets.find(x => !x.down);
      if (!t) return {};
      const need = (WASSER.groundY - 40 - t.y) / WASSER.reach;
      const a = {};
      if (Math.abs(s.aimX - t.x) > 4) a[s.aimX < t.x ? 'right' : 'left'] = true;
      mem.mode = mem.mode || 'pump';
      if (mem.mode === 'pump' && s.pressure >= need + 5) mem.mode = 'spray';
      if (mem.mode === 'spray' && s.pressure < need - 5) mem.mode = 'pump';
      if (mem.mode === 'pump') { if (f % 4 === 0) a.up = true; if (f % 4 === 2) a.down = true; }
      else if (Math.abs(s.aimX - t.x) <= 6) a.jump = true;
      return a;
    },
    SspGrill(sc, id, f, mem) {
      const gr = sc.grills[id - 1];
      const ready = gr.sausages.map((s, i) => ({ s, i })).filter(({ s }) => !s.gone && s.cook[s.down] >= 0.8 && s.cook[s.down] <= 0.97)
        .sort((x, y) => y.s.cook[y.s.down] - x.s.cook[x.s.down])[0];
      if (!ready || f % 2) return {};
      if (ready.i < gr.cursor) return { left: true };
      if (ready.i > gr.cursor) return { right: true };
      return { jump: true };
    },
    SspRundkurs(sc, id, f, mem) {
      const l = sc.lanes[id - 1];
      const a = {};
      if (f % 24 === 0) { mem.side = !mem.side; a[mem.side ? 'left' : 'right'] = true; }
      const next = l.obstacles.find(o => !o.hit && o.d - l.pos > 0);
      if (next && next.d - l.pos < 70 && next.d - l.pos > 20 && l.y === 0 && f % 2 === 0) a.jump = true;
      return a;
    },
    SspBrennessel(sc, id, f, mem) {
      const me = sc.runner(id), other = sc.runner(3 - id);
      const dx = other.sprite.x - me.sprite.x, dy = other.sprite.y - me.sprite.y;
      const a = {};
      if (sc.it === id) {
        a[dx > 0 ? 'right' : 'left'] = Math.abs(dx) > 4;
        if (dy < -40 && f % 20 === 0) a.jump = true;
      } else {
        a[dx > 0 ? 'left' : 'right'] = true;
        if ((me.sprite.x < 60 || me.sprite.x > GAME_WIDTH - 60) && f % 20 === 0) a.jump = true;
        if (Math.abs(dx) < 70 && Math.abs(dy) < 50 && me.cooldown <= 0 && f % 2 === 0) a.action = true;
      }
      return a;
    }
  };
  const MINIGAMES = Object.keys(SSP_BOTS);

  function runSspTests() {
    syncClock(LEVELS.length + 40);
    PlayerInput.prototype.update = scriptedInputUpdate;
    out.ssp = {};
    const check = (name, ok, detail = '') => {
      out.ssp[name] = !!ok;
      if (!ok) out.errors.push(`SSP-Test "${name}" fehlgeschlagen ${detail}`);
    };
    const active = k => game.scene.isActive(k);
    const missing = sc => sc.children.list.filter(o => o.texture && o.texture.key === '__MISSING').length;

    /** Ein Minispiel mit Bots für die angegebenen Spieler spielen; liefert die Szene am Ende. */
    function play(key, botIds, maxFrames = 6000) {
      SspParty.state = null;
      setInput(0); setInput(1);
      startScene(key);
      const sc = game.scene.getScene(key);
      sc.startCountdown();
      const mem = { 1: {}, 2: {} };
      let frames = 0;
      for (let f = 0; f < maxFrames && !sc.finished; f++) {
        [1, 2].forEach(id => setInput(id - 1, sc.started && botIds.includes(id) ? SSP_BOTS[key](sc, id, f, mem[id]) : {}));
        step();
        if (sc.started) frames++;
      }
      setInput(0); setInput(1);
      out.sspStats = out.sspStats || [];
      out.sspStats.push(`${key} Bots [${botIds}]: ${(frames / 60).toFixed(1)} s Spielzeit, Punkte ${sc.score[1]}:${sc.score[2]}, Sieger ${sc.winner}`);
      return sc;
    }

    // 1) Jedes Minispiel: Bot gegen untätigen Gegner – der Bot muss gewinnen (beide Seiten)
    MINIGAMES.forEach(key => {
      [1, 2].forEach(id => {
        if (key === 'SspBrennessel' && id === 2) return;   // Jessica beginnt mit dem Strauch – ein untätiger Fänger trifft nie
        reseed(500 + id);
        const sc = play(key, [id]);
        check(`${SSP.byKey(key).name}: ${sspPlayer(id).name}-Bot gewinnt`, sc.finished && sc.winner === id,
          `(beendet=${sc.finished}, Sieger=${sc.winner}, Punkte ${sc.score[1]}:${sc.score[2]})`);
        if (missing(sc)) check(`${key}: Texturen`, false, `${missing(sc)} fehlende Texturen`);
      });
    });

    // 1b) Pedalo fair: in 8 Zufalls-Layouts kommt ein Bot, der nur 60 px weit
    //     schaut, ohne Entenzusammenstoss durch; nie mehr als eine Ente pro Stelle
    let hits = 0, layoutOk = true;
    for (let seedNo = 1; seedNo <= 8; seedNo++) {
      reseed(4000 + seedNo);
      const p = play('SspPedalo', [1, 2]);
      hits += p.ducks.filter(d => d.hit).length;
      [1, 2].forEach(id => {
        const xs = p.ducks.filter(d => d.id === id).map(d => d.x).sort((x, y) => x - y);
        xs.forEach((x, i) => { if (i && x - xs[i - 1] < PEDALO.duckGap) layoutOk = false; });
      });
    }
    out.sspStats.splice(-8, 8);   // die 8 Läufe nicht einzeln auflisten
    check('PEDALO-POWER: Enten fair verteilt (8 Layouts)', layoutOk);
    check('PEDALO-POWER: Ausweichen immer möglich (0 Zusammenstösse)', hits === 0, `(${hits} Zusammenstösse)`);

    // 2) Brennessel: Bot gegen Bot – der Strauch wechselt in beide Richtungen
    reseed(77);
    let sc = play('SspBrennessel', [1, 2]);
    check('BRENNESSEL-ALARM!: Rollentausch in beide Richtungen', sc.finished && sc.score[1] > 0 && sc.score[2] > 0, `(Punkte ${sc.score[1]}:${sc.score[2]})`);

    // 3) Brennessel: Schild wehrt einen Treffer ab
    startScene('SspBrennessel');
    sc = game.scene.getScene('SspBrennessel');
    sc.startCountdown(); step(180);
    sc.runner(1).sprite.body.reset(400, 470); sc.runner(2).sprite.body.reset(420, 470);
    sc.runner(2).shield = 0.5;
    step();
    check('BRENNESSEL-ALARM!: Schild wehrt Treffer ab', sc.score[1] === 0 && sc.it === 1 && sc.runner(1).stun > 0);

    // 4) Pause im Minispiel: START → Pause, "Neu starten", ESC → Pause, "Hauptmenü"
    startScene('SspGrill');
    sc = game.scene.getScene('SspGrill');
    sc.startCountdown(); step(200);
    const tapIn = (i, action) => { setInput(i, { [action]: true }); step(); setInput(i); step(); };
    tapIn(0, 'start'); step(2);
    check('Minispiel: START öffnet die Pause', active('PauseScene') && game.scene.isPaused('SspGrill'));
    tapIn(1, 'down'); tapIn(1, 'jump'); step(3);
    check('Minispiel: Pause → Neu starten', active('SspGrill') && game.scene.getScene('SspGrill').introActive);
    const esc = new KeyboardEvent('keydown', { bubbles: true });
    Object.defineProperty(esc, 'keyCode', { value: 27 });
    window.dispatchEvent(esc); step(); window.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true })); step(2);
    check('Minispiel: ESC öffnet die Pause', active('PauseScene'));
    tapIn(0, 'down'); tapIn(0, 'down'); tapIn(0, 'down'); tapIn(0, 'jump'); step(3);
    check('Minispiel: Pause → Hauptmenü', active('GameSelectScene') && !active('SspGrill') && !active('PauseScene'));

    // 5) Spielauswahl → SSP-Menü → Party: alle 5 Spiele mit Jessica-Bot, Zwischenstände, Siegerehrung
    reseed(900);
    setInput(0); setInput(1);
    startScene('GameSelectScene'); step(20);
    tapIn(0, 'right'); tapIn(0, 'jump'); step(30);
    check('Spielauswahl → Super Sempach Party', active('SspMenuScene'));
    tapIn(0, 'jump'); step(30);   // PARTY: ALLE 5 SPIELE
    const seen = [], scoreScreens = [];
    const mem = { 1: {} };
    for (let f = 0; f < 40000 && !active('SspAwardScene'); f++) {
      const key = MINIGAMES.find(k => active(k));
      let a = {};
      if (key) {
        const g = game.scene.getScene(key);
        if (!seen.includes(key)) { seen.push(key); mem[1] = {}; }
        if (g.introActive) a = f % 4 === 0 ? { jump: true } : {};
        else if (g.started && !g.finished) a = SSP_BOTS[key](g, 1, f, mem[1]);
      } else if (active('SspScoreScene')) {
        const s = game.scene.getScene('SspScoreScene');
        if (!scoreScreens.includes(SspParty.state.index)) scoreScreens.push(SspParty.state.index);
        if (s.ready && f % 4 === 0) a = { jump: true };
      }
      setInput(0, a);
      step();
    }
    setInput(0);
    check('Party: alle 5 Minispiele gespielt', seen.join() === MINIGAMES.join(), `(${seen})`);
    check('Party: Zwischenstand nach Spiel 1–4', scoreScreens.length === 4);
    check('Party: Siegerehrung für Jessica', active('SspAwardScene') && SspParty.champion() === 1 && SspParty.state.wins[1] === 5,
      `(Siege ${SspParty.state && SspParty.state.wins[1]}:${SspParty.state && SspParty.state.wins[2]})`);
    step(150);
    const award = game.scene.getScene('SspAwardScene');
    check('Siegerehrung: Pokal und Konfetti', award.children.list.some(o => o.texture && o.texture.key === 'ssp_trophy') &&
      award.children.list.some(o => o.type === 'ParticleEmitter'));
    tapIn(0, 'jump'); step(40);
    check('Siegerehrung → SSP-Menü', active('SspMenuScene'));

    // 6) Freier Modus: ein Minispiel wählen → danach direkt Siegerehrung
    tapIn(0, 'down'); tapIn(0, 'jump'); step(5);   // MINISPIEL WÄHLEN
    tapIn(0, 'down'); tapIn(0, 'jump'); step(40);  // WASSER-MARSCH!
    check('Freier Modus: Minispiel startet', active('SspWasser'));
    const w = game.scene.getScene('SspWasser');
    w.startCountdown();
    const wm = {};
    for (let f = 0; f < 6000 && !active('SspAwardScene'); f++) {
      setInput(1, w.started && !w.finished ? SSP_BOTS.SspWasser(w, 2, f, wm) : {});
      step();
    }
    setInput(1);
    check('Freier Modus: Siegerehrung für Simon', active('SspAwardScene') && SspParty.state.mode === 'single' && SspParty.champion() === 2);
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
  const wait = setInterval(async () => {
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
      await runScenes();
      runInputTests();
      runSspTests();
      // Chopfnüss: Lösungs-Test mit echten Eingaben (tools/harness-puzzles.js)
      syncClock(LEVELS.length + 60);
      PlayerInput.prototype.update = scriptedInputUpdate;
      if (window.runPuzzleTests) window.runPuzzleTests({ step, setInput, startScene, out });
    } catch (e) {
      out.errors.push(`harness: ${e.stack || e}`);
    }
    finish();
  }, 50);
})();
