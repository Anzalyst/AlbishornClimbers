#!/usr/bin/env node
/* =====================================================================
 * make-loading-images.js – Familienfotos → 16-Bit-Pixelbilder für die
 * Ladebildschirme (LoadingScene), eingebettet als Base64
 *
 *   node tools/make-loading-images.js                 js/generated/loading-images.js schreiben
 *   node tools/make-loading-images.js --preview <dir> zusätzlich die PNGs dort ablegen
 *
 * Quelle: assets/images/loading/*.jpg (abfotografierte Albumseiten). Pro Bild:
 *   1. Ausschnitt wählen (Albumrand weg) und – wo das Foto quer im Album
 *      lag – um 90° drehen
 *   2. auf 256×192 verkleinern (4:3, SNES-Breite)
 *   3. verblasste Farben auffrischen (Tonwerte strecken, etwas Sättigung)
 *   4. auf eine 15-Bit-Palette mit 40 Farben reduzieren (Median-Cut) und
 *      mit einem 4×4-Bayer-Raster dithern → 16-Bit-Look
 *
 * Die Bildbearbeitung läuft im Canvas eines headless Chrome/Edge (wie die
 * Tests, siehe run-tests.js) – kein npm-Paket nötig. Das Ergebnis ist eine
 * Script-Datei mit PNG-Daten-URLs: läuft offline und per file://.
 * ===================================================================== */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { pathToFileURL } = require('url');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const previewDir = args.includes('--preview') ? path.resolve(args[args.indexOf('--preview') + 1]) : null;

const OUT_W = 256, OUT_H = 192, COLORS = 40;

// Ausschnitt in Pixeln des Originals; rotate 'ccw' = Foto lag quer (oben = rechts)
const PHOTOS = [
  { key: 'dreck',       src: 'dreck.jpg',       rotate: 'ccw', x: 30,  y: 40,  w: 670, h: 893 },
  { key: 'muetze',      src: 'muetze.jpg',      rotate: 'ccw', x: 85,  y: 190, w: 510, h: 680 },
  { key: 'clowns',      src: 'clowns.jpg',      rotate: null,  x: 20,  y: 195, w: 700, h: 525 },
  { key: 'hochzeit',    src: 'hochzeit.jpg',    rotate: 'ccw', x: 300, y: 0,   w: 422, h: 563 },
  { key: 'badewanne',   src: 'badewanne.jpg',   rotate: 'ccw', x: 100, y: 160, w: 600, h: 800 },
  { key: 'kinderwagen', src: 'kinderwagen.jpg', rotate: 'ccw', x: 70,  y: 100, w: 590, h: 787 }
];

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

/** Läuft im Browser: ein Foto → PNG-Daten-URL im Pixel-Look. */
function pixelate(img, p, W, H, COLORS) {
  // 1. Ausschnitt (gedreht) in doppelter Grösse, 2. weich auf Zielgrösse
  const big = document.createElement('canvas');
  big.width = W * 2; big.height = H * 2;
  let ctx = big.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  if (p.rotate === 'ccw') {
    ctx.translate(0, big.height);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(img, p.x, p.y, p.w, p.h, 0, 0, big.height, big.width);
  } else {
    ctx.drawImage(img, p.x, p.y, p.w, p.h, 0, 0, big.width, big.height);
  }
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(big, 0, 0, W, H);
  const id = ctx.getImageData(0, 0, W, H), d = id.data, n = W * H;

  // 3. Tonwerte pro Kanal strecken (1 %/99 %) und Sättigung anheben
  const lo = [], hi = [];
  for (let ch = 0; ch < 3; ch++) {
    const hist = new Array(256).fill(0);
    for (let i = 0; i < n; i++) hist[d[i * 4 + ch]]++;
    let acc = 0, a = 0, b = 255;
    for (a = 0; a < 255 && (acc += hist[a]) < n * 0.01; a++);
    acc = 0;
    for (b = 255; b > 0 && (acc += hist[b]) < n * 0.01; b--);
    lo[ch] = a; hi[ch] = Math.max(b, a + 1);
  }
  const px = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = [0, 1, 2].map(ch => Math.min(255, Math.max(0, (d[i * 4 + ch] - lo[ch]) * 255 / (hi[ch] - lo[ch]))));
    const grey = 0.3 * v[0] + 0.59 * v[1] + 0.11 * v[2];
    for (let ch = 0; ch < 3; ch++) px[i * 3 + ch] = Math.min(255, Math.max(0, grey + (v[ch] - grey) * 1.1));
  }

  // 4a. Palette per Median-Cut (auf 15-Bit-Farben wie beim SNES)
  const q5 = v => Math.round(v / 255 * 31) * 255 / 31;
  let boxes = [Array.from({ length: n }, (_, i) => i)];
  const range = (box, ch) => {
    let mn = 255, mx = 0;
    box.forEach(i => { const v = px[i * 3 + ch]; if (v < mn) mn = v; if (v > mx) mx = v; });
    return mx - mn;
  };
  while (boxes.length < COLORS) {
    let best = null;
    boxes.forEach((box, bi) => {
      if (box.length < 2) return;
      [0, 1, 2].forEach(ch => {
        const score = range(box, ch) * Math.sqrt(box.length);
        if (!best || score > best.score) best = { bi, ch, score };
      });
    });
    if (!best) break;
    const box = boxes[best.bi].sort((a, b) => px[a * 3 + best.ch] - px[b * 3 + best.ch]);
    const mid = box.length >> 1;
    boxes.splice(best.bi, 1, box.slice(0, mid), box.slice(mid));
  }
  const pal = boxes.map(box => [0, 1, 2].map(ch => q5(box.reduce((s, i) => s + px[i * 3 + ch], 0) / box.length)));

  // 4b. Bayer-Dithering auf die Palette
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const t = (bayer[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 18;
      const r = px[i * 3] + t, g = px[i * 3 + 1] + t, b = px[i * 3 + 2] + t;
      let bestK = 0, bestD = Infinity;
      for (let k = 0; k < pal.length; k++) {
        const dr = r - pal[k][0], dg = g - pal[k][1], db = b - pal[k][2];
        const dist = 3 * dr * dr + 4 * dg * dg + 2 * db * db;
        if (dist < bestD) { bestD = dist; bestK = k; }
      }
      d[i * 4] = pal[bestK][0]; d[i * 4 + 1] = pal[bestK][1]; d[i * 4 + 2] = pal[bestK][2]; d[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  return c.toDataURL('image/png');
}

function buildPage() {
  const photos = PHOTOS.map(p => Object.assign({}, p, {
    data: 'data:image/jpeg;base64,' + fs.readFileSync(path.join(root, 'assets/images/loading', p.src)).toString('base64')
  }));
  return `<!doctype html><meta charset="utf-8"><pre id="out"></pre><script>
${pixelate.toString()}
const PHOTOS = ${JSON.stringify(photos)};
Promise.all(PHOTOS.map(p => new Promise((ok, fail) => {
  const img = new Image();
  img.onload = () => ok({ key: p.key, src: p.src, url: pixelate(img, p, ${OUT_W}, ${OUT_H}, ${COLORS}) });
  img.onerror = () => fail(new Error(p.src));
  img.src = p.data;
}))).then(list => { document.getElementById('out').textContent = JSON.stringify(list); },
  e => { document.getElementById('out').textContent = 'FEHLER ' + e.message; });
</script>`;
}

const page = path.join(os.tmpdir(), `albishorn-loading-${process.pid}.html`);
fs.writeFileSync(page, buildPage());
let proc;
try {
  proc = spawnSync(findBrowser(), ['--headless=new', '--disable-gpu', '--virtual-time-budget=60000', '--dump-dom', pathToFileURL(page).href],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 5 * 60 * 1000 });
} finally {
  fs.unlinkSync(page);
}
const m = /<pre id="out">([^<]*)<\/pre>/.exec(proc.stdout || '');
if (!m || !m[1] || m[1].startsWith('FEHLER')) throw new Error('Bildbearbeitung im Browser fehlgeschlagen: ' + (m ? m[1] : proc.stderr));
const list = JSON.parse(m[1]);

const lines = list.map(({ key, url }) => `  ${key}: '${url}'`).join(',\n');
const js = `/* Automatisch erzeugt von tools/make-loading-images.js aus assets/images/loading/ – nicht von Hand bearbeiten. */\n` +
  `/* Familienfotos im 16-Bit-Look (${OUT_W}×${OUT_H}, ${COLORS} Farben) für die Ladebildschirme (LoadingScene). */\n` +
  `const LOADING_IMAGES = {\n${lines}\n};\n`;
fs.mkdirSync(path.join(root, 'js/generated'), { recursive: true });
fs.writeFileSync(path.join(root, 'js/generated/loading-images.js'), js);
console.log(`js/generated/loading-images.js  (${Math.round(js.length / 1024)} KB, ${list.length} Bilder)`);

if (previewDir) {
  fs.mkdirSync(previewDir, { recursive: true });
  list.forEach(({ key, url }) => fs.writeFileSync(path.join(previewDir, key + '.png'), Buffer.from(url.split(',')[1], 'base64')));
  console.log(`Vorschau: ${previewDir}`);
}
