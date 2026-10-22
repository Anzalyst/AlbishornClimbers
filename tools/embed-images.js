#!/usr/bin/env node
/* =====================================================================
 * embed-images.js – Bilddateien als Base64 in JS-Dateien einbetten
 *
 *   node tools/embed-images.js                  alle Dateien in js/generated/ schreiben
 *   node tools/embed-images.js --preview <dir>  zusätzlich die Familienbilder dort ablegen
 *
 * Warum? Per Doppelklick (file://) darf der Browser Bilddateien weder per
 * XHR laden (so lädt Phaser) noch als WebGL-Textur verwenden. Als Daten-URL
 * in einer Script-Datei klappt beides – offline und ohne Webserver.
 *
 * 1. Endbild der EndScene: unverändert eingebettet → endscreen-image.js
 * 2. Familienbilder (Pixel-Art) für Ladebildschirme und Bildergalerie:
 *    mittig auf 4:3 zugeschnitten und auf 512×384 verkleinert (die
 *    Originale wären als Base64 rund 8 MB) → loading-images.js
 *    Das Verkleinern läuft im Canvas eines headless Chrome/Edge (wie die
 *    Tests, siehe run-tests.js) – kein npm-Paket nötig.
 *
 * Nach dem Austauschen eines Bildes in assets/images/loading/ dieses Script
 * ausführen und die erzeugten Dateien in js/generated/ mitcommitten.
 * ===================================================================== */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { pathToFileURL } = require('url');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'assets/images/loading');
const args = process.argv.slice(2);
const previewDir = args.includes('--preview') ? path.resolve(args[args.indexOf('--preview') + 1]) : null;

const IMAGES = [
  // Quelle (assets/images/loading/)  globale Konstante   Ziel (js/generated/)
  { src: 'endscreen.jpg', name: 'ENDSCREEN_IMAGE', out: 'endscreen-image.js' }
];

// Familienbilder: Schlüssel = Spruch in TXT.loadingSlides (texts.js)
const OUT_W = 512, OUT_H = 384, QUALITY = 0.92;
const SLIDES = [
  { key: 'dreck',       src: 'cousins.jpg' },        // Kiesweg
  { key: 'muetze',      src: 'jessica_weint.jpg' },  // weinendes Kind mit Mütze
  { key: 'clowns',      src: 'clowns.jpg' },
  { key: 'hochzeit',    src: 'peterundesthi.jpg' },
  { key: 'badewanne',   src: 'badewanne.jpg' },
  { key: 'kinderwagen', src: 'buggy_team.png' },
  { key: 'erinnerung',  src: 'peterkurt.jpg' }       // Gedenkbild: Abspann + Galerie, nicht im Ladebildschirm
];

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };

/** MIME-Typ am Dateiinhalt erkennen (jessica_weint.jpg ist z. B. ein PNG). */
function mimeOf(buf, src) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  return MIME[path.extname(src).toLowerCase()];
}
const dataUrl = src => {
  const buf = fs.readFileSync(path.join(dir, src));
  return `data:${mimeOf(buf, src)};base64,${buf.toString('base64')}`;
};

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

/** Läuft im Browser: Bild mittig auf W:H zuschneiden, verkleinern → JPEG-Daten-URL. */
function fit(img, W, H, quality) {
  const scale = Math.max(W / img.width, H / img.height);
  const sw = W / scale, sh = H / scale;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, W, H);
  return c.toDataURL('image/jpeg', quality);
}

function resizeSlides() {
  const slides = SLIDES.map(s => Object.assign({}, s, { data: dataUrl(s.src) }));
  const page = path.join(os.tmpdir(), `albishorn-embed-${process.pid}.html`);
  fs.writeFileSync(page, `<!doctype html><meta charset="utf-8"><pre id="out"></pre><script>
${fit.toString()}
const SLIDES = ${JSON.stringify(slides)};
Promise.all(SLIDES.map(s => new Promise((ok, fail) => {
  const img = new Image();
  img.onload = () => ok({ key: s.key, url: fit(img, ${OUT_W}, ${OUT_H}, ${QUALITY}) });
  img.onerror = () => fail(new Error(s.src));
  img.src = s.data;
}))).then(list => { document.getElementById('out').textContent = JSON.stringify(list); },
  e => { document.getElementById('out').textContent = 'FEHLER ' + e.message; });
</script>`);
  let proc;
  try {
    proc = spawnSync(findBrowser(), ['--headless=new', '--disable-gpu', '--virtual-time-budget=60000', '--dump-dom', pathToFileURL(page).href],
      { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 5 * 60 * 1000 });
  } finally {
    fs.unlinkSync(page);
  }
  const m = /<pre id="out">([^<]*)<\/pre>/.exec(proc.stdout || '');
  if (!m || !m[1] || m[1].startsWith('FEHLER')) throw new Error('Verkleinern im Browser fehlgeschlagen: ' + (m ? m[1] : proc.stderr));
  return JSON.parse(m[1]);
}

fs.mkdirSync(path.join(root, 'js/generated'), { recursive: true });
const write = (out, js, what) => {
  fs.writeFileSync(path.join(root, 'js/generated', out), js);
  console.log(`js/generated/${out}  (${Math.round(js.length / 1024)} KB, ${what})`);
};

IMAGES.forEach(({ src, name, out }) => {
  write(out, `/* Automatisch erzeugt von tools/embed-images.js aus assets/images/loading/${src} – nicht von Hand bearbeiten. */\n` +
    `const ${name} = '${dataUrl(src)}';\n`, `aus ${src}`);
});

const list = resizeSlides();
const lines = list.map(({ key, url }) => `  ${key}: '${url}'`).join(',\n');
write('loading-images.js', `/* Automatisch erzeugt von tools/embed-images.js aus assets/images/loading/ – nicht von Hand bearbeiten. */\n` +
  `/* Familienbilder (Pixel-Art, ${OUT_W}×${OUT_H}) für Ladebildschirme und Bildergalerie. */\n` +
  `const LOADING_IMAGES = {\n${lines}\n};\n`, `${list.length} Bilder`);

if (previewDir) {
  fs.mkdirSync(previewDir, { recursive: true });
  list.forEach(({ key, url }) => fs.writeFileSync(path.join(previewDir, key + '.jpg'), Buffer.from(url.split(',')[1], 'base64')));
  console.log(`Vorschau: ${previewDir}`);
}
