#!/usr/bin/env node
/* =====================================================================
 * run-tests.js – Startet den Browser-Test (harness.js) in Chrome/Edge
 * headless und vergleicht das Ergebnis mit tools/golden.json.
 *
 *   node tools/run-tests.js                   Test gegen die Referenz
 *   node tools/run-tests.js --update-golden   Referenz neu schreiben
 *   node tools/run-tests.js --root <Ordner>   anderen Spielstand testen
 *   node tools/run-tests.js --dump 2:15       Zustand Level 3, Messpunkt 15 ausgeben
 *
 * Braucht nur Node.js und einen installierten Chrome oder Edge
 * (Pfad notfalls per Umgebungsvariable CHROME_PATH). Das Spiel selbst
 * bleibt unverändert ohne Build-Schritt lauffähig.
 * ===================================================================== */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');

const args = process.argv.slice(2);
const arg = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const root = path.resolve(arg('--root') || path.join(__dirname, '..'));
const goldenPath = path.join(__dirname, 'golden.json');
const update = args.includes('--update-golden');
const dumpArg = arg('--dump');
const dump = dumpArg ? { level: Number(dumpArg.split(':')[0]), snap: Number(dumpArg.split(':')[1]) } : null;

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
  ];
  const found = candidates.find(p => p && fs.existsSync(p));
  if (!found) throw new Error('Kein Chrome/Edge gefunden – Pfad per CHROME_PATH angeben.');
  return found;
}

// Testseite: dieselben Scripts wie index.html, danach harness.js
function buildPage() {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const srcs = [...index.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1]);
  const url = src => (/^https?:/.test(src) ? src : pathToFileURL(path.join(root, src)).href);
  const scripts = srcs.map(src => `<script src="${url(src)}"></script>`).join('\n');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>
<div id="game"></div><pre id="result"></pre>
<script>window.TEST_OPTS = ${JSON.stringify({ dump })};</script>
${scripts}
<script src="${pathToFileURL(path.join(__dirname, 'harness.js')).href}"></script>
</body></html>`;
}

function run() {
  const page = path.join(os.tmpdir(), `albishorn-test-${process.pid}.html`);
  fs.writeFileSync(page, buildPage());
  let dom;
  try {
    dom = execFileSync(findBrowser(), [
      '--headless=new', '--disable-gpu', '--mute-audio', '--allow-file-access-from-files',
      '--virtual-time-budget=120000', '--dump-dom', pathToFileURL(page).href
    ], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 10 * 60 * 1000, stdio: ['ignore', 'pipe', 'ignore'] });
  } finally {
    fs.unlinkSync(page);
  }
  const m = /<pre id="result">([^<]*)<\/pre>/.exec(dom);
  if (!m || !m[1]) throw new Error('Kein Testergebnis – ist der Browser-Test abgebrochen?');
  return JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));
}

const started = Date.now();
const result = run();
let failed = false;

if (dump) {
  console.log((result.dump || ['(kein Messpunkt gefunden)']).join('\n'));
  process.exit(0);
}

console.log(`Spielstand: ${root}`);

// Leveldaten ohne Browser prüfen (ab Refactoring-Stufe 5 vorhanden)
if (fs.existsSync(path.join(root, 'js/game/LevelParser.js'))) {
  const { count, problems } = require('./test-levels').checkLevels(root);
  console.log(`  Leveldaten: ${problems.length ? `${problems.length} Probleme` : `ok (${count} Level)`}`);
  problems.forEach(p => console.log(`    ${p}`));
  if (problems.length) failed = true;
}

result.warnings.forEach(w => console.log(`  Warnung: ${w}`));
if (result.errors.length) {
  failed = true;
  console.log('FEHLER:');
  result.errors.forEach(e => console.log(`  ${e}`));
}
Object.entries(result.scenes).forEach(([key, status]) => console.log(`  Szene ${key.padEnd(18)} ${status}`));

if (update) {
  const golden = { levels: result.levels.map(l => ({ index: l.index, hashes: l.hashes, next: l.next })) };
  fs.writeFileSync(goldenPath, JSON.stringify(golden, null, 1) + '\n');
  console.log(`Referenz geschrieben: ${goldenPath}`);
} else {
  const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
  golden.levels.forEach(g => {
    const l = result.levels.find(x => x.index === g.index);
    const label = `  Level ${g.index + 1}`;
    if (!l) { failed = true; console.log(`${label}: FEHLT`); return; }
    const diff = g.hashes.findIndex((h, i) => l.hashes[i] !== h);
    if (diff >= 0 || l.hashes.length !== g.hashes.length) {
      failed = true;
      const at = diff >= 0 ? diff : Math.min(l.hashes.length, g.hashes.length);
      console.log(`${label}: ABWEICHUNG ab Messpunkt ${at} (Frame ${(at + 1) * 10})  →  Details: --dump ${g.index}:${at}`);
    } else if (JSON.stringify(l.next) !== JSON.stringify(g.next)) {
      failed = true;
      console.log(`${label}: andere Folgeszene (${l.next} statt ${g.next})`);
    } else {
      console.log(`${label}: identisch (${g.hashes.length} Messpunkte, danach ${l.next})`);
    }
  });
}

console.log(`${failed ? 'FEHLGESCHLAGEN' : 'OK'}  (${((Date.now() - started) / 1000).toFixed(1)} s)`);
process.exit(failed ? 1 : 0);
