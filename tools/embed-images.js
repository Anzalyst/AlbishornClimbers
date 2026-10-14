#!/usr/bin/env node
/* =====================================================================
 * embed-images.js – Bilddateien als Base64 in JS-Dateien einbetten
 *
 *   node tools/embed-images.js
 *
 * Warum? Per Doppelklick (file://) darf der Browser Bilddateien weder per
 * XHR laden (so lädt Phaser) noch als WebGL-Textur verwenden. Als Daten-URL
 * in einer Script-Datei klappt beides – offline und ohne Webserver.
 *
 * Nach dem Austauschen eines Bildes in assets/images/ dieses Script
 * ausführen und die erzeugte Datei in js/generated/ mitcommitten.
 * ===================================================================== */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const IMAGES = [
  // Quelle (assets/images/)   globale Konstante      Ziel (js/generated/)
  { src: 'endscreen.jpg', name: 'ENDSCREEN_IMAGE', out: 'endscreen-image.js' }
];

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };

fs.mkdirSync(path.join(root, 'js/generated'), { recursive: true });
IMAGES.forEach(({ src, name, out }) => {
  const file = path.join(root, 'assets/images', src);
  const data = fs.readFileSync(file).toString('base64');
  const js = `/* Automatisch erzeugt von tools/embed-images.js aus assets/images/${src} – nicht von Hand bearbeiten. */\n` +
    `const ${name} = 'data:${MIME[path.extname(src).toLowerCase()]};base64,${data}';\n`;
  fs.writeFileSync(path.join(root, 'js/generated', out), js);
  console.log(`js/generated/${out}  (${Math.round(js.length / 1024)} KB, aus ${src})`);
});
