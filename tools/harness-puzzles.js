/* =====================================================================
 * harness-puzzles.js – Lösungs-Test der Chopfnüss (Rätsel) und der
 *                       Geschicklichkeits-Hindernisse in Level 1–5
 *
 * Wird von run-tests.js vor harness.js geladen; harness.js ruft
 * runPuzzleTests(api) nach den anderen Tests auf.
 *
 * Anders als das Replay (harness.js, teleportiert zu jedem Schalter) spielen
 * hier zwei einfache Bots die Rätsel NUR mit normalen Eingaben durch:
 * laufen, springen (wenn sie anstossen oder an einer Absprungstelle), Hebel
 * und Knöpfe mit "Hoch". So ist bewiesen, dass die Level mit echter Physik
 * und in den vorgegebenen Zeiten lösbar sind – und dass die Mechaniken
 * (Zeitschalter, UND-Tor, verdecktes Farbeschloss, Waage) wie geplant wirken.
 * ===================================================================== */
window.runPuzzleTests = function (H) {
  const { step, stepDt, setInput, startScene, out } = H;
  // Bildraten-Muster der "Konsole": unregelmässige Bilddauern → pro Bild 0, 1 oder
  // 2 Physik-Schritte (so ruckelte das Pendel auf dem echten Gerät)
  const CONSOLE_FRAMES = [13.3, 13.3, 13.4, 20, 16.7, 33.3, 10, 13.3, 25, 8.3];
  let frameTimes = null, frameNo = 0, suffix = '';
  const frame = () => { if (frameTimes) stepDt(frameTimes[frameNo++ % frameTimes.length]); else step(); };
  out.puzzles = {};
  out.skills = {};
  const checkSkill = (name0, ok, detail = '') => {
    const name = name0 + suffix;
    out.skills[name] = !!ok;
    if (!ok) out.errors.push(`Hindernis-Test "${name}" fehlgeschlagen ${detail} [Respawns: ${respawnLog.slice(-3).join("; ")}]`);
  };
  const check = (name, ok, detail = '') => {
    out.puzzles[name] = !!ok;
    if (!ok) out.errors.push(`Rätsel-Test "${name}" fehlgeschlagen ${detail}`);
  };

  // Gespielte Sounds mitschreiben (Ticken, Fehler, Zeit abgelaufen …)
  const sfx = [];
  const realPlay = Sfx.play;
  Sfx.play = function (scene, name, ...rest) { sfx.push(name); return realPlay.call(this, scene, name, ...rest); };
  const sfxSince = (mark, ...names) => sfx.slice(mark).filter(n => names.includes(n)).length;

  // Wer ist wo und warum zurückgesetzt worden? (für verständliche Fehlermeldungen)
  const respawnLog = [];
  const realRespawn = Player.prototype.respawn;
  Player.prototype.respawn = function (reason) {
    if (!this.respawning) respawnLog.push(`${this.def.name} ${reason || "fall"} @${this.sprite.x.toFixed(0)}/${this.sprite.body.bottom.toFixed(0)}`);
    return realRespawn.call(this, reason);
  };

  let sc = null;
  const P = i => sc.players[i];
  const X = c => c * TILE + TILE / 2;
  const goals = [null, null];
  const extra = [{}, {}];
  const jumpHold = [0, 0];
  const jumpCool = [0, 0];

  /** Bot: zum Ziel laufen, rechtzeitig bremsen, springen wenn blockiert oder an der Absprungstelle. */
  function botInput(i) {
    const g = goals[i];
    if (!g || !game.scene.isActive('GameScene')) return {};
    const p = P(i), b = p.sprite.body;
    if (g.follow) g.x = g.follow();          // bewegtes Ziel (Pendel, Baumstamm)
    const dx = g.x - p.sprite.x;
    const onGround = b.blocked.down || b.touching.down;
    const a = {};
    const accel = onGround ? PHYSICS.ACCEL_GROUND : PHYSICS.ACCEL_AIR;   // in der Luft bremst man schlechter
    const brake = (b.velocity.x * b.velocity.x) / (2 * accel) + (g.tol || 3);
    if (Math.abs(dx) > brake || Math.sign(dx) !== Math.sign(b.velocity.x)) {
      if (Math.abs(dx) > (g.tol || 3)) a[dx > 0 ? 'right' : 'left'] = true;
    }
    if (jumpHold[i] > 0) { jumpHold[i]--; a.jump = true; if (!jumpHold[i]) jumpCool[i] = 4; return a; }
    if (jumpCool[i] > 0) { jumpCool[i]--; return a; }
    const blocked = dx > 0 ? (b.blocked.right || b.touching.right) : (b.blocked.left || b.touching.left);
    const atTakeoff = !g.jumped && onGround && (g.jumpNow || (g.jumpAtX !== undefined &&
      (dx > 0 ? p.sprite.x >= g.jumpAtX : p.sprite.x <= g.jumpAtX)));
    if (onGround && (Math.abs(dx) > 8 || g.jumpNow) && ((blocked && !g.noJump) || atTakeoff)) {
      if (atTakeoff) g.jumped = true;
      jumpHold[i] = g.hold || 26;           // kurz halten = kleiner Hüpfer
      a.jump = true;
    }
    return a;
  }

  function run(cond, max) {
    for (let f = 0; f < max; f++) {
      if (cond()) return f;
      [0, 1].forEach(i => setInput(i, Object.assign(botInput(i), extra[i])));
      frame();
    }
    return cond() ? max : -1;
  }
  const wait = n => run(() => false, n);
  const go = (i, x, opts = {}) => { goals[i] = Object.assign({ x }, opts); jumpHold[i] = 0; jumpCool[i] = 0; };
  const stopped = (i, x, tol = 6) => Math.abs(P(i).sprite.x - x) <= tol && Math.abs(P(i).sprite.body.velocity.x) < 5 &&
    (P(i).sprite.body.blocked.down || P(i).sprite.body.touching.down);
  /** Beide (oder einer) laufen zu ihren Zielen; true, wenn alle angekommen sind. */
  function arrive(targets, max = 900) {
    Object.entries(targets).forEach(([i, t]) => go(Number(i), t.x !== undefined ? t.x : t, t.x !== undefined ? t : {}));
    const ids = Object.keys(targets).map(Number);
    const f = run(() => ids.every(i => stopped(i, goals[i].x)), max);
    ids.forEach(i => { goals[i] = null; });
    return f >= 0;
  }
  /** "Hoch" drücken (Hebel, Farbtaste); mehrere Spieler gleichzeitig möglich. */
  function press(...ids) {
    ids.forEach(i => { goals[i] = null; extra[i] = { up: true }; });
    wait(3);
    ids.forEach(i => { extra[i] = {}; });
    wait(3);
  }
  const startLevel = index => {
    goals[0] = goals[1] = null;
    setInput(0); setInput(1);
    startScene('GameScene', { levelIndex: index });
    sc = game.scene.getScene('GameScene');
    wait(60);
  };
  const where = () => `(J ${P(0).sprite.x.toFixed(0)}/${P(0).sprite.body.bottom.toFixed(0)}, S ${P(1).sprite.x.toFixed(0)}/${P(1).sprite.body.bottom.toFixed(0)})`;

  // =====================================================================
  // CHOPFNUSS 1 – Zeitschalter, UND-Tor, verdecktes Farbeschloss
  // =====================================================================
  function bonus1() {
    startLevel(STORY_LEVELS);
    const M = sc.mechanics;
    const trig = ch => M.triggers.find(t => t.char === ch);
    const grp = ch => M.targetGroups[ch];

    // A) Zeitschalter: Hebel ziehen, beide rennen in 4 s durchs Tor
    arrive({ 0: X(8), 1: X(17) });
    let mark = sfx.length;
    press(0);
    check('Zeitschalter: Hebel öffnet das Tor', grp('D').active && trig('L').timing);
    const cd = trig('L').countdown;
    check('Zeitschalter: Countdown-Ring über Hebel und Tor', cd && cd.items.length === 2 && cd.items.every(it => it.ring.visible && it.label.text === '4'));
    go(0, X(24)); go(1, X(25));
    const fA = run(() => P(0).sprite.x > 22 * TILE && P(1).sprite.x > 22 * TILE, 4 * 60);
    check('Zeitschalter: beide in 4 s durchs Tor', fA >= 0, where());
    run(() => !trig('L').active, 5 * 60);
    check('Zeitschalter: es tickt (schneller am Schluss)', sfxSince(mark, 'tick') >= 1 && sfxSince(mark, 'tickFast') >= 3);
    check('Zeitschalter: Tor zu, Hebel springt zurück', !grp('D').active && trig('L').sprite.texture.key === 'lever_off' &&
      sfxSince(mark, 'timeUp') === 1 && cd.items.every(it => !it.ring.visible));

    // B) UND-Tor: ein Hebel allein reicht nicht – beide gleichzeitig, dann rennen
    check('UND-Tor: Simon kann Jessicas Hebel nicht ziehen', (() => {
      arrive({ 1: X(45) }); press(1);
      return !trig('j').active;
    })());
    arrive({ 0: X(45), 1: X(40) });
    press(0);
    check('UND-Tor: ein Hebel allein öffnet nicht', trig('j').active && !grp('E').active && grp('E').partial === 1);
    arrive({ 1: X(23) });                       // von links über die Treppe (rechts ist das Felsband 4 hoch)
    const climbed = arrive({ 1: X(29) }, 900);
    check('UND-Tor: Simon klettert zu seinem Hebel', climbed && Math.abs(P(1).sprite.body.bottom - 11 * TILE) < 3, where());
    run(() => !trig('j').active, 6 * 60);
    press(0, 1);
    check('UND-Tor: beide Hebel gleichzeitig → offen', grp('E').active);
    go(0, X(55)); go(1, X(56));
    const fB = run(() => P(0).sprite.x > 52 * TILE && P(1).sprite.x > 52 * TILE, 5 * 60);
    check('UND-Tor: beide in 5 s durch (Simon vom Felsband)', fB >= 0, `${where()} nach ${fB} Frames`);
    run(() => !grp('E').active, 3 * 60);
    check('UND-Tor: schliesst, sobald die erste Uhr abläuft', !grp('E').active);

    // C) Farbeschloss: verdeckt, Knöpfe nach Besitzer, Zeitlimit 12 s
    const seq = M.sequences.S;
    arrive({ 0: X(62), 1: X(85) });
    check('Farbeschloss: Tafel verdeckt (4 × "?")', seq.marks.length === 4 && seq.marks.every(m => m.visible));
    mark = sfx.length;
    press(1);                                  // Gelb zuerst → falsch
    check('Farbeschloss: falsche Reihenfolge → Fehler-Sound & Reset', seq.progress === 0 && sfxSince(mark, 'error') === 1);
    press(0);                                  // Blau: richtig
    check('Farbeschloss: Uhr startet beim ersten Treffer', seq.progress === 1 && seq.countdown && seq.countdown.items.every(it => it.ring.visible) && !seq.marks[0].visible);
    mark = sfx.length;
    const fT = run(() => seq.progress === 0, 13 * 60);
    check('Farbeschloss: nach 12 s zurückgesetzt', fT >= 11 * 60 && seq.marks[0].visible && sfxSince(mark, 'error') === 1, `(${fT} Frames)`);
    const t0 = sfx.length;
    press(0);                                  // Blau
    press(1);                                  // Gelb
    arrive({ 0: X(67) }); press(0);            // Grün
    arrive({ 1: X(79) }); press(1);            // Rot
    check('Farbeschloss: Blau → Gelb → Grün → Rot öffnet das Tor', seq.active && grp('Q').active && seq.marks.every(m => !m.visible) && sfxSince(t0, 'error') === 0);
    go(0, X(95) + 10); go(1, X(95) + 40);
    run(() => sc.completed, 15 * 60);
    check('Chopfnuss 1: bis ins Ziel lösbar', sc.completed, where());
  }

  // =====================================================================
  // CHOPFNUSS 2 – Waage mit Kiste, Sandsack, Felsbrocken und Zeithebeln
  // =====================================================================
  function bonus2() {
    startLevel(STORY_LEVELS + 1);
    const M = sc.mechanics;
    const trig = ch => M.triggers.find(t => t.char === ch);
    const grp = ch => M.targetGroups[ch];
    const [A, B, C, D] = ['a', 'b', 'c', 'd'].map(ch => grp(ch).pan);
    const off = pan => Math.round(pan.sprite.y - pan.homeY);
    const crate = sc.blocks.find(b => b.texture.key === 'pushCrate');
    const boulder = sc.blocks.find(b => b.texture.key === 'boulder');
    const onLedge = i => P(i).sprite.x > 20 * TILE && Math.abs(P(i).sprite.body.bottom - 8 * TILE) < 3;
    const settle = () => wait(150);

    // A1) Jessica schiebt die Kiste auf Schale a → a sinkt 2, b steigt 2
    arrive({ 0: { x: 14 * TILE - 2, noJump: true } }, 900);
    settle();
    check('Waage: Kiste (1) auf a → a −2, b +2 Kacheln', off(A) === 64 && off(B) === -64 && crate.body.left >= 14 * TILE, `(a ${off(A)}, b ${off(B)})`);

    // A2) Simon springt über den Schacht auf den Pfeiler und auf Schale b → Gleichgewicht
    arrive({ 1: { x: X(19) - 16, jumpAtX: 13 * TILE - 20 } }, 900);
    settle();
    check('Waage: 1 gegen 1 → Gleichgewicht', off(A) === 0 && off(B) === 0 && A.weight === 1 && B.weight === 1, `(a ${off(A)}, b ${off(B)}) ${where()}`);

    // A3) Ohne Sandsack reicht es nicht: Jessica allein dazu wäre 2 gegen 1 → nur +2 (siehe Prüfung unten)
    // Jessica hält Schalter P → Sandsack auf a: 3 gegen 1 → b ganz oben (+4)
    arrive({ 0: X(7) });
    run(() => off(B) === -128, 4 * 60);
    check('Waage: Kiste + Sandsack (3) gegen Simon (1) → b +4', off(B) === -128 && A.weight === 3, `(b ${off(B)}, Gewicht a ${A.weight})`);
    arrive({ 1: X(22) });
    check('Waage: Simon erreicht das Felsband', onLedge(1), where());

    // A4) Jessica verlässt den Schalter → Sandsack geht hoch, b auf +2 (nur die Kiste)
    arrive({ 0: X(10) });
    settle();
    check('Waage: proportional – nur Kiste (1) → b +2', off(B) === -64 && A.weight === 1 && !grp('a').active, `(b ${off(B)})`);

    // A5) Jessica auf b, Simon zieht oben den Zeithebel L (Sandsack, 6 s) → Jessica hoch
    arrive({ 0: { x: X(19) - 16, jumpAtX: 13 * TILE - 20 } }, 900);
    settle();
    check('Waage: Jessica auf b → Gleichgewicht', off(B) === 0 && B.weight === 1, `(b ${off(B)}) ${where()}`);
    arrive({ 1: X(24) });
    press(1);
    check('Waage: Zeithebel lässt den Sandsack ab', trig('L').timing && grp('a').active);
    run(() => off(B) === -128, 4 * 60);
    arrive({ 0: X(22) });
    check('Waage: Jessica erreicht das Felsband, bevor die Uhr abläuft', onLedge(0) && trig('L').timing, where());
    run(() => !trig('L').active, 7 * 60);
    settle();
    check('Waage: Uhr abgelaufen → Sandsack wieder oben', A.bag.drop === 0 && off(B) === -64);

    // B0) 1 gegen 1 ist zwar Gleichgewicht, zählt aber nicht (mindestens 2 pro Seite)
    const lamp = trig('S');
    const onD = { x: X(35) - 16, jumpAtX: 33 * TILE + 20 };       // vom Absatz auf die Schale d springen
    arrive({ 1: X(31) - 16 }, 900);
    arrive({ 0: onD }, 900);
    settle();
    check('Waage 2: 1 gegen 1 → Lämpli bleibt aus (min. 2)', off(C) === 0 && C.weight === 1 && D.weight === 1 && !lamp.active && !grp('E').active,
      `(c ${off(C)}, ${C.weight}:${D.weight}) ${where()}`);

    // B1) Felsbrocken zu zweit auf Schale c (1 Kachel pro Gewicht) → c −2, d +2
    arrive({ 0: 26 * TILE + 8, 1: 26 * TILE + 6 }, 1200);
    go(0, 30 * TILE - 4, { noJump: true, tol: 1 }); go(1, 30 * TILE - 4, { noJump: true, tol: 1 });
    run(() => boulder.body.left >= 30 * TILE, 10 * 60);
    goals[0] = goals[1] = null;
    settle();
    check('Waage 2: Felsbrocken (2) auf c → c −2, d +2', off(C) === 64 && off(D) === -64, `(c ${off(C)}, d ${off(D)}) ${where()}`);

    // B2) Simon auf d: 2 gegen 1 → kein Gleichgewicht
    arrive({ 1: onD }, 900);
    settle();
    check('Waage 2: Simon auf d → 2 gegen 1, d +1, Lämpli aus', off(D) === -32 && !lamp.active, `(d ${off(D)}) ${where()}`);

    // B3) Jessica auch auf d: 2 gegen 2 → Gleichgewicht → Lämpli an, Tor offen
    arrive({ 0: Object.assign({}, onD, { x: X(35) - 8 }) }, 900);
    settle();
    check('Waage 2: 2 gegen 2 → Gleichgewicht, Lämpli an, Tor offen', off(D) === 0 && lamp.active && grp('E').active &&
      lamp.sprite.texture.key === 'scaleLamp_on', `(d ${off(D)}, ${C.weight}:${D.weight}) ${where()}`);

    // B4) Absteigen → Uhr läuft (4 s) → beide rennen durchs Tor
    go(0, X(46)); go(1, X(45));
    const fE = run(() => P(0).sprite.x > 44 * TILE && P(1).sprite.x > 44 * TILE, 4 * 60);
    check('Waage 2: beide in 4 s durchs Tor', fE >= 0 && lamp.timing, `${where()} nach ${fE} Frames`);
    run(() => !lamp.active, 5 * 60);
    check('Waage 2: Uhr abgelaufen → Lämpli aus, Tor zu', !lamp.active && !grp('E').active && lamp.sprite.texture.key === 'scaleLamp_off');

    go(0, X(47) + 10); go(1, X(47) + 40);
    run(() => sc.completed, 10 * 60);
    check('Chopfnuss 2: bis ins Ziel lösbar', sc.completed, where());
  }

  /** Nach einer Chopfnuss: Victory-Bildschirm, dann weiter (Sprung). */
  function afterBonus(expectAllDone, nextScene) {
    goals[0] = goals[1] = null;
    run(() => game.scene.isActive('VictoryScene'), 6 * 60);
    const vs = game.scene.getScene('VictoryScene');
    const ok = game.scene.isActive('VictoryScene') && vs.isBonus && vs.allDone === expectAllDone;
    wait(70);
    extra[0] = { jump: true }; wait(2); extra[0] = {};
    run(() => game.scene.isActive(nextScene), 3 * 60);
    return ok && game.scene.isActive(nextScene);
  }

  // =====================================================================
  // GESCHICKLICHKEIT – die neuen Hindernisse in Level 1–5, mit echten Sprüngen
  // =====================================================================
  const cellsOf = (li, ch) => {
    const list = [];
    LEVELS[li].map.forEach((row, r) => [...row].forEach((c2, c) => { if (c2 === ch) list.push({ c, r }); }));
    return list;
  };
  /** Zusammenhängende Bröckel-Platten → Spannen in Pixeln (von links). */
  const spansOf = cells => {
    const spans = [];
    cells.slice().sort((a, b) => a.c - b.c).forEach(({ c }) => {
      const last = spans[spans.length - 1];
      if (last && last.cEnd === c - 1) { last.cEnd = c; last.r = (c + 1) * TILE; } else spans.push({ cEnd: c, l: c * TILE, r: (c + 1) * TILE });
    });
    return spans.map(sp => Object.assign(sp, { mid: (sp.l + sp.r) / 2 }));
  };
  const tp = (i, x, bottom) => { P(i).sprite.body.reset(x, bottom - 16); P(i).checkpoint = { x, y: bottom - 16 }; };
  const deaths = mark => sfxSince(mark, 'splash', 'respawn');
  const onGround = i => P(i).sprite.body.blocked.down || P(i).sprite.body.touching.down;
  // steht auf diesem Körper: haftend (bewegte Plattform) oder per Kontakt (Bröckel-Platte)
  const standsOnBody = (i, body) => {
    const b = P(i).sprite.body;
    const onTop = Math.abs(b.bottom - body.top) < 2 && b.right > body.left + 1 && b.left < body.right - 1;
    return (P(i).onPlatform && onTop) || sc.obstacles.standsOn(P(i), body);
  };
  const solidAt = (map, c, r) => map[r] && (map[r][c] === '#' || map[r][c] === 'R');

  /** Von Spanne zu Spanne hüpfen (Absprung kurz vor jeder Kante), am Schluss aufs Ufer. */
  function hop(i, spans, bankLeft, bankRight, mark) {
    let edge = bankLeft;
    for (const sp of spans) {
      go(i, sp.mid, { jumpAtX: edge - 6, tol: 4 });
      const f = run(() => goals[i].jumped && onGround(i) && P(i).sprite.x > sp.l && P(i).sprite.x < sp.r, 4 * 60);
      if (f < 0 || deaths(mark)) { goals[i] = null; return false; }
      edge = sp.r;
    }
    go(i, bankRight + 40, { jumpAtX: edge - 6 });
    const f = run(() => goals[i].jumped && onGround(i) && P(i).sprite.x > bankRight + 8, 4 * 60);
    goals[i] = null;
    return f >= 0 && deaths(mark) === 0;
  }

  /** Auf ein bewegtes Objekt springen und mitfahren, bis until() → true. */
  function boardAndRide(i, body, until, max = 15 * 60) {
    go(i, body.x + body.width / 2, { follow: () => body.x + body.width / 2, jumpNow: true, tol: 6 });
    const f = run(() => goals[i].jumped && standsOnBody(i, body), 3 * 60);
    if (f < 0) { goals[i] = null; return false; }
    return run(until, max) >= 0;
  }

  /** Abspringen (sofort) und auf dem Ufer bzw. der Plattform jenseits von x landen. */
  function leapTo(i, x, past) {
    go(i, x, { jumpNow: true, tol: 4 });
    run(() => goals[i].jumped && onGround(i) && P(i).sprite.x > past, 3 * 60);
    goals[i] = null;
  }

  /** Zeit (ms) bis das Pendel ganz links (θ = −Amplitude) bzw. rechts ankommt. */
  const toExtreme = (pend, side = -1) => {
    const cyc = sc.obstacles.stepTime / pend.cfg.period + pend.cfg.phase / (2 * Math.PI);
    return ((((side < 0 ? 0.75 : 0.25) - cyc) % 1) + 1) % 1 * pend.cfg.period;
  };

  /**
   * Stabilität: Figur steht ohne Eingabe auf einer bewegten Plattform. Gemessen wird
   * jedes Bild: Abstand zur Plattform (darf sich nicht ändern), Füsse auf der
   * Oberkante, zählt als Boden, und beim Pendel die exakte Lage laut Formel.
   */
  function rideStill(i, body, frames, pendItem) {
    goals[i] = null;
    const rel0 = P(i).sprite.body.x - body.x;
    const m = { slip: 0, gap: 0, formula: 0, air: 0 };
    const mark = sfx.length;
    for (let k = 0; k < frames; k++) {
      setInput(0, extra[0]); setInput(1, extra[1]);
      frame();
      const b = P(i).sprite.body;
      m.slip = Math.max(m.slip, Math.abs(b.x - body.x - rel0));
      m.gap = Math.max(m.gap, Math.abs(b.bottom - body.top));
      if (!P(i).onPlatform) m.air++;
      if (pendItem) {
        const p = OBSTACLE_TYPES.pendulum.pos(sc.obstacles, pendItem, sc.obstacles.stepTime);
        m.formula = Math.max(m.formula, Math.abs(body.x - p.x), Math.abs(body.y - p.y));
      }
    }
    m.deaths = deaths(mark);
    return m;
  }
  const fmt = m => `(Rutschen ${m.slip.toFixed(2)} px, Spalt ${m.gap.toFixed(2)} px, ohne Boden ${m.air} Bilder${m.formula !== undefined ? `, Abweichung Formel ${m.formula.toFixed(2)} px` : ''}, Respawns ${m.deaths})`;

  function skillStability() {
    // Pendel in Level 2: zwei volle Schwünge stillstehen
    startLevel(1);
    const P1 = sc.obstacles.items.filter(it => it.kind === 'pendulum').sort((a, b) => a.c - b.c)[0];
    const map = LEVELS[1].map;
    let rowS = P1.r; while (!solidAt(map, P1.c - 4, rowS)) rowS++;
    let cl = P1.c; while (!solidAt(map, cl, rowS)) cl--;
    const edgeL = (cl + 1) * TILE, b1 = P1.sprite.body;
    tp(0, edgeL - 20, rowS * TILE); tp(1, edgeL - 60, rowS * TILE); wait(20);   // beide in der Nähe (max. Abstand)
    run(() => toExtreme(P1) > 200 && toExtreme(P1) < 320 && onGround(0), 6 * 60);   // kurz vor dem Umkehrpunkt los
    const on = boardAndRide(0, b1, () => true, 1);
    wait(10);
    const m = rideStill(0, b1, Math.round(2 * P1.cfg.period / 16.7), P1);
    checkSkill('Pendel: Figur steht zwei Schwünge lang stabil (kein Rutschen, kein Durchfallen)',
      on && m.deaths === 0 && m.slip < 1 && m.gap < 1 && m.air === 0, fmt(m));
    checkSkill('Pendel: Plattform folgt exakt der Pendel-Formel', m.formula < 0.5, fmt(m));
    // Baumstamm in Level 2: 2 Sekunden stillstehen
    startLevel(1);
    const L = sc.obstacles.items.find(it => it.kind === 'logs');
    tp(0, L.from - 24, L.top + 8); tp(1, L.from - 60, L.top + 8); wait(20);
    const fresh = () => L.logs.find(l => !l.sinking && l.body.x >= L.from - 2 && l.body.x <= L.from + 40);
    run(() => fresh(), 4 * 60);
    const log = fresh();
    const onLog = !!log && boardAndRide(0, log.body, () => true, 1);
    wait(10);
    const m2 = rideStill(0, log.body, 120);
    delete m2.formula;
    checkSkill('Baumstamm: Figur fährt stabil mit', onLog && m2.deaths === 0 && m2.slip < 1 && m2.gap < 1 && m2.air === 0, fmt(m2));
  }

  function skillRocks() {
    // Felsbrocken drehen sich passend zur Rollstrecke, Licht dreht nicht mit
    startLevel(3);
    let rock = null;
    run(() => (rock = sc.rollers.getChildren().find(r => r.body.blocked.down || r.body.touching.down)), 10 * 60);
    if (!rock) { checkSkill('Felsbrocken: rollen und drehen sich', false, '(kein Brocken gefunden)'); return; }
    let turned = 0, prevA = rock.angle;
    const x0 = rock.body.center.x;
    let shadeOk = true;
    for (let k = 0; k < 30 && rock.active; k++) {
      frame();
      let d = rock.angle - prevA; if (d > 180) d -= 360; if (d < -180) d += 360;
      turned += d; prevA = rock.angle;
      shadeOk = shadeOk && rock.shade.angle === 0 && Math.abs(rock.shade.x - rock.body.center.x) < 1;
    }
    const rolled = rock.body.center.x - x0;
    const expected = Phaser.Math.RadToDeg(rolled / 21);
    checkSkill('Felsbrocken: drehen sich passend zu Tempo und Richtung', Math.abs(turned) > 60 && Math.sign(turned) === Math.sign(rolled) &&
      Math.abs(turned - expected) < 3, `(${rolled.toFixed(0)} px gerollt, ${turned.toFixed(0)}° gedreht, erwartet ${expected.toFixed(0)}°)`);
    checkSkill('Felsbrocken: Licht & Schatten drehen nicht mit (plastisch)', shadeOk);
  }

  function skillLevel1() {
    startLevel(0);
    const cr = cellsOf(0, '=');
    const spans = spansOf(cr);
    const c0 = Math.min(...cr.map(k => k.c)), c1 = Math.max(...cr.map(k => k.c));
    const water = cellsOf(0, '~').filter(w => w.r === cr[0].r + 1 && w.c > c0 - 4 && w.c < c1 + 4);   // nur dieser Weiher
    const bankL = Math.min(...water.map(w => w.c)) * TILE, bankR = (Math.max(...water.map(w => w.c)) + 1) * TILE;
    const ground = (cr[0].r + 1) * TILE;
    tp(0, bankL - 40, ground); tp(1, bankL - 80, ground); wait(30);
    const mark = sfx.length;
    checkSkill('L1 Bröckel-Brättli: Jessica hüpft trocken über den Weiher', hop(0, spans, bankL, bankR, mark), where());
    const crumbles = sc.obstacles.items.filter(it => it.kind === 'crumble');
    run(() => crumbles.some(it => it.state === 'gone'), 90);
    checkSkill('L1 Bröckel-Brättli: sacken nach dem Betreten weg', crumbles.some(it => it.state === 'gone') && sfxSince(mark, 'crumbleFall') > 0);
    run(() => crumbles.every(it => it.state === 'idle'), 6 * 60);
    checkSkill('L1 Bröckel-Brättli: sind nach ein paar Sekunden wieder da', crumbles.every(it => it.state === 'idle' && it.sprite.body.enable));
    checkSkill('L1 Bröckel-Brättli: Simon kommt auch rüber', hop(1, spans, bankL, bankR, sfx.length), where());
  }

  function skillLevel2() {
    startLevel(1);
    const O = sc.obstacles;
    // A) Türlersee: auf einen frischen Stamm springen, mitfahren, ans andere Ufer
    const L = O.items.find(it => it.kind === 'logs');
    const bankL = L.from, bankR = L.to + L.len, ground = L.top + 8;
    tp(0, bankL - 24, ground); tp(1, bankL - 60, ground); wait(20);
    let mark = sfx.length;
    const fresh = () => L.logs.find(l => !l.sinking && l.body.x >= bankL - 2 && l.body.x <= bankL + 40);
    run(() => fresh(), 4 * 60);
    const log = fresh();
    let carried = null;
    const rode = !!log && boardAndRide(0, log.body, () => {
      if (carried === null && standsOnBody(0, log.body)) {
        const p0 = P(0).sprite.body.x, l0 = log.body.x;
        goals[0] = null; wait(60);
        carried = Math.abs((P(0).sprite.body.x - p0) - (log.body.x - l0)) < 1 && log.body.x - l0 > 40;
        go(0, 0, { follow: () => log.body.x + log.body.width / 2, tol: 6 });
      }
      return log.body.right >= bankR - 24;
    });
    checkSkill('L2 Türlersee: Stamm nimmt Jessica mit', rode && carried, where());
    leapTo(0, bankR + 40, bankR + 4);
    checkSkill('L2 Türlersee: Jessica springt trocken ans andere Ufer', P(0).sprite.x > bankR && deaths(mark) === 0, where());
    run(() => !log.active, 3 * 60);
    checkSkill('L2 Türlersee: Stamm geht am Ende der Strecke unter', !log.active && sfxSince(mark, 'logSink') > 0);
    // Wer ins Wasser fällt, landet beim Checkpoint
    mark = sfx.length;
    go(1, bankL + 20); run(() => sfxSince(mark, 'splash') > 0, 3 * 60); goals[1] = null; wait(60);
    checkSkill('L2 Türlersee: ins Wasser gefallen → zurück zum Checkpoint', sfxSince(mark, 'splash') === 1 && P(1).sprite.x < bankL, where());
    mark = sfx.length;
    run(() => fresh(), 4 * 60);
    const log2 = fresh();
    const rode2 = !!log2 && boardAndRide(1, log2.body, () => log2.body.right >= bankR - 24);
    leapTo(1, bankR + 40, bankR + 4);
    checkSkill('L2 Türlersee: Simon kommt auch rüber', rode2 && P(1).sprite.x > bankR && deaths(mark) === 0, where());

    // B) Waldschaukeln: Ufer → Pendel 1 → Pendel 2 → Ufer
    const [P1, P2] = O.items.filter(it => it.kind === 'pendulum').sort((a, b) => a.c - b.c);
    const map = LEVELS[1].map;
    let rowS = P1.r; while (!solidAt(map, P1.c - 4, rowS)) rowS++;
    let cl = P1.c; while (!solidAt(map, cl, rowS)) cl--;
    let cr2 = P2.c; while (!solidAt(map, cr2, rowS)) cr2++;
    const edgeL = (cl + 1) * TILE, edgeR = cr2 * TILE, top = rowS * TILE;
    tp(0, edgeL - 20, top); tp(1, edgeL - 60, top); wait(20);
    mark = sfx.length;
    const b1 = P1.sprite.body, b2 = P2.sprite.body;
    run(() => b1.x <= edgeL + 6 && onGround(0), 6 * 60);
    const onP1 = boardAndRide(0, b1, () => b1.velocity.x > 20 && b2.x - b1.right < 110 && b2.x - b1.right > 20, 8 * 60);
    checkSkill('L2 Waldschaukel: Jessica springt aufs erste Pendel', onP1 && deaths(mark) === 0, where());
    const onP2 = onP1 && boardAndRide(0, b2, () => b2.right >= edgeR - 6, 8 * 60);
    checkSkill('L2 Waldschaukel: weiter aufs zweite Pendel', onP2 && deaths(mark) === 0, where());
    leapTo(0, edgeR + 40, edgeR + 4);
    checkSkill('L2 Waldschaukel: Jessica erreicht das andere Ufer', P(0).sprite.x > edgeR && deaths(mark) === 0, where());

    // Schwung: Simon springt vom schwingenden Pendel senkrecht hoch → fliegt mit
    run(() => b1.x <= edgeL + 6 && onGround(1), 6 * 60);
    boardAndRide(1, b1, () => Math.abs(b1.velocity.x) > 70, 6 * 60);
    goals[1] = null;
    const x0 = P(1).sprite.x, v = b1.velocity.x;
    extra[1] = { jump: true }; wait(20); extra[1] = {};
    const flew = P(1).sprite.x - x0;
    checkSkill('L2 Waldschaukel: Absprung übernimmt den Schwung', Math.sign(flew) === Math.sign(v) && Math.abs(flew) > 25,
      `(Pendel ${v.toFixed(0)} px/s, in 20 Frames ${flew.toFixed(0)} px)`);
  }

  function skillLevel3() {
    startLevel(2);
    const cr = cellsOf(2, '=');
    const spans = spansOf(cr);
    const c0 = Math.min(...cr.map(k => k.c)), c1 = Math.max(...cr.map(k => k.c));
    const water = cellsOf(2, '~').filter(w => w.r === cr[0].r + 1 && w.c > c0 - 4 && w.c < c1 + 4);
    const bankL = Math.min(...water.map(w => w.c)) * TILE, bankR = (Math.max(...water.map(w => w.c)) + 1) * TILE;
    const ground = (cr[0].r + 1) * TILE;
    tp(0, bankL - 30, ground); tp(1, bankL - 70, ground); wait(30);
    checkSkill('L3 Wacklige Bachsteine: Jessica hüpft über alle vier', hop(0, spans, bankL, bankR, sfx.length), where());
    wait(5 * 60);
    checkSkill('L3 Wacklige Bachsteine: Simon hinterher', hop(1, spans, bankL, bankR, sfx.length), where());
  }

  function skillLevel4() {
    startLevel(3);
    const B = sc.obstacles.items.find(it => it.kind === 'boulders');
    const map = LEVELS[3].map;
    const flag = cellsOf(3, 'F').filter(f => f.c < B.c && f.c > B.c - 30)[0];
    const surface = c => { let r = 0; while (!solidAt(map, c, r)) r++; return r; };
    // Nischen: Löcher in den Stufen (tiefer als beide Nachbarn)
    const niches = [];
    for (let c = flag.c + 3; c < B.c - 4; c++) {
      if (surface(c) > surface(c - 1) && surface(c) > surface(c + 1)) niches.push({ c, bottom: surface(c) * TILE });
    }
    const safeX = X(B.c - 1);   // unter dem Felsdach – hier rollt nichts mehr
    tp(0, X(flag.c), (flag.r + 1) * TILE); tp(1, X(flag.c) - 16, (flag.r + 1) * TILE); wait(20);
    let mark = sfx.length;
    const rocks = () => sc.rollers.getChildren();
    /** In die Nische, warten bis ein Brocken darüber hinweggerollt ist. */
    const duck = (i, n) => {
      const inNiche = arrive({ [i]: X(n.c) }, 6 * 60) && Math.abs(P(i).sprite.body.bottom - n.bottom) < 3;
      let seen = null;
      const f = run(() => {
        const r = rocks().find(k => k.x > X(n.c) && k.x < X(n.c) + 120);
        if (r) seen = r;
        return !!seen && (!seen.active || seen.x < X(n.c) - 50);
      }, 8 * 60);
      return inNiche && f >= 0;
    };
    let ok = niches.length === 2;
    niches.forEach(n => { ok = ok && duck(0, n); });
    checkSkill('L4 Steinschlag: Brocken rollen über die Nischen hinweg', ok && deaths(mark) === 0, `(${niches.length} Nischen) ${where()}`);
    ok = arrive({ 0: safeX }, 6 * 60);
    checkSkill('L4 Steinschlag: Jessica schafft es unters Felsdach', ok && deaths(mark) === 0, where());
    wait(4 * 60);
    checkSkill('L4 Steinschlag: unter dem Felsdach sicher', deaths(mark) === 0);
    checkSkill('L4 Steinschlag: Fels-Schwelle hält die Brocken auf', sfxSince(mark, 'rockSmash') > 0 && rocks().every(k => k.x > (flag.c + 1) * TILE));
    // Wer stehen bleibt, wird getroffen → Checkpoint
    mark = sfx.length;
    go(1, X(niches[1].c + 3)); run(() => sfxSince(mark, 'boulderHit') > 0, 10 * 60); goals[1] = null;
    wait(40);
    checkSkill('L4 Steinschlag: Treffer → zurück zum Checkpoint', sfxSince(mark, 'boulderHit') === 1 && Math.abs(P(1).sprite.x - X(flag.c)) < 20, where());
    mark = sfx.length;
    ok = niches.every(n => duck(1, n)) && arrive({ 1: safeX - 20 }, 6 * 60);
    checkSkill('L4 Steinschlag: Simon schafft es auch', ok && deaths(mark) === 0, where());
  }

  function skillLevel5() {
    startLevel(4);
    const pend = sc.obstacles.items.find(it => it.kind === 'pendulum');
    const cr = cellsOf(4, '=');
    const [s1, s2] = spansOf(cr);
    const map = LEVELS[4].map;
    const rowS = cr[0].r + 1;
    let cl = s1.l / TILE - 1; while (!solidAt(map, cl, rowS)) cl--;
    let cr2 = s2.r / TILE; while (!solidAt(map, cr2, rowS)) cr2++;
    const edgeL = (cl + 1) * TILE, edgeR = cr2 * TILE, ground = rowS * TILE;
    const b = pend.sprite.body;
    [0, 1].forEach(i => {
      const mark = sfx.length;
      tp(i, edgeL - 20, ground); wait(20);
      // erst los, wenn das Pendel auf die Bröckel-Platte zuschwingt
      // Zeit bis zum linken Umkehrpunkt des Pendels (θ = −Amplitude)
      const toLeftmost = () => {
        const cyc = sc.obstacles.stepTime / pend.cfg.period + pend.cfg.phase / (2 * Math.PI);
        return (((0.75 - cyc) % 1) + 1) % 1 * pend.cfg.period;
      };
      run(() => toLeftmost() > 450 && toLeftmost() < 700, 8 * 60);
      go(i, s1.mid, { jumpAtX: edgeL - 6, tol: 4, hold: 5 });
      run(() => goals[i].jumped && onGround(i) && P(i).sprite.x > s1.l, 2 * 60);
      run(() => b.x <= s1.r + 24, 2 * 60);
      const onP = boardAndRide(i, b, () => b.right >= s2.l - 24 && b.velocity.x < 40, 6 * 60);
      leapTo(i, s2.mid, s2.l);
      go(i, edgeR + 40, { jumpAtX: s2.r - 6 });
      run(() => goals[i].jumped && onGround(i) && P(i).sprite.x > edgeR + 4, 3 * 60);
      goals[i] = null;
      checkSkill(`L5 Schlucht: ${i ? 'Simon' : 'Jessica'} schafft Bröckel → Pendel → Bröckel`, onP && P(i).sprite.x > edgeR && deaths(mark) === 0, where());
      wait(5 * 60);
    });
  }

  try {
    const runSkill = fn => {
      try { fn(); } catch (e) { out.errors.push(`Hindernis-Test ${fn.name}${suffix} abgebrochen: ${e.stack || e}`); }
      goals[0] = goals[1] = null; extra[0] = {}; extra[1] = {};
    };
    [skillLevel1, skillLevel2, skillLevel3, skillLevel4, skillLevel5, skillStability, skillRocks].forEach(runSkill);
    // Dasselbe nochmals wie auf der Konsole: unregelmässige Bildrate
    frameTimes = CONSOLE_FRAMES; frameNo = 0; suffix = ' [Konsole: unregelmässige Bildrate]';
    [skillStability, skillLevel2, skillLevel5].forEach(runSkill);
    frameTimes = null; suffix = '';
    bonus1();
    check('Chopfnuss 1 → Victory mit Passwort → Chopfnuss 2', afterBonus(false, 'GameScene') &&
      game.scene.getScene('GameScene').levelIndex === STORY_LEVELS + 1);
    bonus2();
    check('Chopfnuss 2 → "Alli Chopfnüss gknackt" → Menü', afterBonus(true, 'MenuScene'));
    // Menüpunkt CHOPFNÜSS startet die erste Chopfnuss
    const menu = game.scene.getScene('MenuScene');
    wait(30);
    menu.selected = 2; menu.refresh();
    extra[0] = { jump: true }; wait(2); extra[0] = {};
    run(() => game.scene.isActive('GameScene'), 3 * 60);
    check('Menü "CHOPFNÜSS" startet Chopfnuss 1', game.scene.isActive('GameScene') &&
      game.scene.getScene('GameScene').levelIndex === STORY_LEVELS && TXT.menuItems[2] === 'CHOPFNÜSS');
  } catch (e) {
    out.errors.push(`Rätsel-Test abgebrochen: ${e.stack || e}`);
  } finally {
    Sfx.play = realPlay;
    Player.prototype.respawn = realRespawn;
    goals[0] = goals[1] = null;
    setInput(0); setInput(1);
  }
};
