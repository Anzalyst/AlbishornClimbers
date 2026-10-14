/* =====================================================================
 * harness-puzzles.js – Lösungs-Test der Chopfnuss-Level (Rätsel-Mechaniken)
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
  const { step, setInput, startScene, out } = H;
  out.puzzles = {};
  const check = (name, ok, detail = '') => {
    out.puzzles[name] = !!ok;
    if (!ok) out.errors.push(`Rätsel-Test "${name}" fehlgeschlagen ${detail}`);
  };

  // Gespielte Sounds mitschreiben (Ticken, Fehler, Zeit abgelaufen …)
  const sfx = [];
  const realPlay = Sfx.play;
  Sfx.play = function (scene, name, ...rest) { sfx.push(name); return realPlay.call(this, scene, name, ...rest); };
  const sfxSince = (mark, ...names) => sfx.slice(mark).filter(n => names.includes(n)).length;

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
    const atTakeoff = g.jumpAtX !== undefined && !g.jumped && onGround &&
      (dx > 0 ? p.sprite.x >= g.jumpAtX : p.sprite.x <= g.jumpAtX);
    if (onGround && Math.abs(dx) > 8 && ((blocked && !g.noJump) || atTakeoff)) {
      if (atTakeoff) g.jumped = true;
      jumpHold[i] = 26;
      a.jump = true;
    }
    return a;
  }

  function run(cond, max) {
    for (let f = 0; f < max; f++) {
      if (cond()) return f;
      [0, 1].forEach(i => setInput(i, Object.assign(botInput(i), extra[i])));
      step();
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

  try {
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
    goals[0] = goals[1] = null;
    setInput(0); setInput(1);
  }
};
