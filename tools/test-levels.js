#!/usr/bin/env node
/* =====================================================================
 * test-levels.js – Prüft alle Level ohne Browser (nur Node.js)
 *
 *   node tools/test-levels.js [--root <Ordner>]
 *
 * Lädt config.js, levels.js, das Ziel-Register und den LevelParser in eine
 * Sandbox und meldet: Warnungen des Parsers (unbekannte Zeichen, fehlende
 * Start-/Zielpunkte, Verweise auf unbekannte Ziele …), doppelte oder
 * ungültige Passwörter. Ein eingebauter Selbsttest stellt sicher, dass der
 * Parser kaputte Level auch wirklich erkennt.
 * ===================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function checkLevels(root) {
  const files = ['js/config.js', 'js/levels.js', 'js/game/mechanics/targets.js', 'js/game/LevelParser.js'];
  const sandbox = { console };
  vm.createContext(sandbox);
  files.forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f }));
  const { LEVELS, LevelParser, BIRTHDAY, AVATARS, CHEATS } = vm.runInContext('({ LEVELS, LevelParser, BIRTHDAY, AVATARS, CHEATS })', sandbox);

  const problems = [];
  LEVELS.forEach((level, i) => {
    const parsed = LevelParser.parse(level);
    parsed.warnings.forEach(w => problems.push(`Level ${i + 1}: ${w}`));
    const ok = Array.isArray(level.password) && level.password.length === 4 && level.password.every(k => AVATARS.some(a => a.key === k));
    if (!ok) problems.push(`Level ${i + 1}: Passwort "${level.password}" sind nicht 4 Avatare`);
  });
  const codes = LEVELS.map(l => l.password).concat([BIRTHDAY.secretCode, CHEATS.credits]).map(c => String(c));
  codes.forEach((code, i) => { if (codes.indexOf(code) !== i) problems.push(`Passwort ${code} ist doppelt vergeben`); });

  // Selbsttest: ein absichtlich kaputtes Level muss Warnungen liefern
  const broken = LevelParser.parse({
    name: 'Selbsttest', map: ['  1 X  P  ', '##########'],
    triggers: { P: { type: 'plate', targets: ['Q'] } }, targets: { D: 'door' }
  });
  const expected = ['Unbekanntes Kartenzeichen "X"', 'Startpunkt "2" fehlt', 'Ziel "G" fehlt',
    'unbekanntes Ziel "Q"', 'Ziel "D" ist definiert, steht aber nicht in der Karte'];
  // … und eines mit kaputten Rätsel-Mechaniken
  const broken2 = LevelParser.parse({
    name: 'Selbsttest 2', map: ['12 aa  b  c  E G', '################'],
    triggers: { b: { type: 'button', color: 'pink', group: 'S' }, c: { type: 'lever', timer: 0, targets: ['a'] } },
    sequences: { S: { order: ['red'], targets: ['E'] } },
    targets: { a: { kind: 'balance', partner: 'z' }, E: { kind: 'door', all: true } }
  });
  broken.warnings.push(...broken2.warnings);
  expected.push('unbekannte Farbe "pink"', 'ungültigen timer', 'braucht eine Farbtaste "red"', 'Partnerschale "z" fehlt');
  expected.forEach(e => {
    if (!broken.warnings.some(w => w.includes(e))) problems.push(`Selbsttest: Parser erkennt nicht: ${e}`);
  });

  return { count: LEVELS.length, problems };
}

module.exports = { checkLevels };

if (require.main === module) {
  const i = process.argv.indexOf('--root');
  const root = path.resolve(i >= 0 ? process.argv[i + 1] : path.join(__dirname, '..'));
  const { count, problems } = checkLevels(root);
  problems.forEach(p => console.log(`  ${p}`));
  console.log(problems.length ? `FEHLGESCHLAGEN (${problems.length} Probleme)` : `OK  (${count} Level geprüft)`);
  process.exit(problems.length ? 1 : 0);
}
