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
  const { LEVELS, LevelParser, BIRTHDAY } = vm.runInContext('({ LEVELS, LevelParser, BIRTHDAY })', sandbox);

  const problems = [];
  LEVELS.forEach((level, i) => {
    const parsed = LevelParser.parse(level);
    parsed.warnings.forEach(w => problems.push(`Level ${i + 1}: ${w}`));
    if (!/^\d{4}$/.test(level.password)) problems.push(`Level ${i + 1}: Passwort "${level.password}" ist nicht 4-stellig`);
  });
  const codes = LEVELS.map(l => l.password).concat(BIRTHDAY.secretCode);
  codes.forEach((code, i) => { if (codes.indexOf(code) !== i) problems.push(`Passwort ${code} ist doppelt vergeben`); });

  // Selbsttest: ein absichtlich kaputtes Level muss Warnungen liefern
  const broken = LevelParser.parse({
    name: 'Selbsttest', map: ['  1 X  P  ', '##########'],
    triggers: { P: { type: 'plate', targets: ['Q'] } }, targets: { D: 'door' }
  });
  const expected = ['Unbekanntes Kartenzeichen "X"', 'Startpunkt "2" fehlt', 'Ziel "G" fehlt',
    'unbekanntes Ziel "Q"', 'Ziel "D" ist definiert, steht aber nicht in der Karte'];
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
