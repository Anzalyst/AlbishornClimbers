#!/usr/bin/env node
/* =====================================================================
 * screenshots.js – Bildschirmfotos aller wichtigen Szenen (zur Stil-Kontrolle)
 *
 *   node tools/screenshots.js <Zielordner>             alle Szenen
 *   node tools/screenshots.js <Zielordner> menu,level1 nur diese
 *
 * Läuft in einem headless Chrome/Edge mit WebGL (Software-Rendering), in
 * Echtzeit über das DevTools-Protokoll, und speichert PNGs in 1920×1080.
 * ===================================================================== */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

const root = path.join(__dirname, '..');
const outDir = path.resolve(process.argv[2] || 'screenshots');
const only = process.argv[3] ? process.argv[3].split(',') : null;

// name: [Szene, Daten, Wartezeit ms, Vorbereitung im Browser]
const SHOTS = {
  power: ['IntroScene', { mode: 'logo' }, 500],
  logo: ['IntroScene', { mode: 'logo' }, 500, "s => s.powerOn()", 2500],
  select: ['GameSelectScene', {}, 900],
  story: ['IntroScene', { mode: 'story' }, 2500],
  menu: ['MenuScene', {}, 700],
  password: ['MenuScene', {}, 400, 's => s.openPassword()', 300],
  level1: ['GameScene', { levelIndex: 0 }, 900],
  level1b: ['GameScene', { levelIndex: 0 }, 6000],
  level2: ['GameScene', { levelIndex: 1 }, 5500, "s => s.cameras.main.stopFollow && s.cameras.main.setScroll(900, s.worldHeight - 540)", 200],
  level3: ['GameScene', { levelIndex: 2 }, 5500, "s => s.cameras.main.setScroll(800, s.worldHeight - 540)", 200],
  level4: ['GameScene', { levelIndex: 3 }, 5500, "s => s.cameras.main.setScroll(1000, s.worldHeight - 540)", 200],
  level5: ['GameScene', { levelIndex: 4 }, 5500, "s => s.cameras.main.setScroll(1600, s.worldHeight - 540)", 200],
  pause: ['GameScene', { levelIndex: 0 }, 900, 's => s.openPause()', 400],
  victory: ['VictoryScene', { levelIndex: 0, collected: 3, total: 5 }, 900],
  finale: ['FinaleScene', {}, 6500],
  finale2: ['FinaleScene', {}, 5000, 's => { s.dialog.close(); }', 6000],
  credits: ['CreditsScene', {}, 3000],
  end: ['EndScene', {}, 2800],
  loading: ['LoadingScene', { next: 'MenuScene' }, 1500],
  gallery: ['GalleryScene', {}, 500],
  sspMenu: ['SspMenuScene', {}, 600],
  sspPedalo: ['SspPedalo', {}, 500, 's => s.startCountdown()', 3200],
  sspPedaloIntro: ['SspPedalo', {}, 500],
  sspWasser: ['SspWasser', {}, 500, 's => { s.startCountdown(); s.sides[0].pressure = 60; }', 3200],
  sspGrill: ['SspGrill', {}, 500, 's => s.startCountdown()', 3500],
  sspRundkurs: ['SspRundkurs', {}, 500, 's => s.startCountdown()', 3200],
  sspNessel: ['SspBrennessel', {}, 500, 's => s.startCountdown()', 3200],
  sspScore: ['SspScoreScene', {}, 500],
  sspAward: ['SspAwardScene', {}, 2500]
};

// Musterblätter: alle Texturen einer Gruppe auf einem Blatt
const SHEETS = {
  sheetFigures: /^(hiker|person_|svenDaughter|cat_ginny|portrait_|avatar_)/,
  sheetObjects: /^(plate|lever|goalSign|infoSign|flag|edelweiss|spark|confetti|partyHat|balloon|house|tree|restaurant|tower|crate|pushCrate|boulder|door|liftTile|conveyor|bridge|btn_|crumble|swing|pivot|logTile|reeds|rockChute|rollingRock|scale|sandbag|stopwatch|seqBoard)/,
  sheetTerrain: /^(earth|grass|rock$|stone|tuft|platform|waterTop|waterDeep|shade[LR])/,
  sheetBack: /^(mountains|hills|forest|cloud)/,
  sheetSsp: /^(ssp_|menu|card|pad|speaker|kes)/
};

const CLIENT = `<script>
window.addEventListener('load', async () => {
  const shots = ${JSON.stringify(Object.entries(SHOTS).filter(([n]) => !only || only.includes(n)).map(([n, s]) => [n, s[0], s[1], s[2], s[4] || 0]))};
  const prep = {${Object.entries(SHOTS).filter(([, s]) => s[3]).map(([n, s]) => `${JSON.stringify(n)}: ${s[3]}`).join(',')}};
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const t0 = Date.now();
  while (!(window.game && game.textures && game.textures.exists('hiker1') && game.scene.getScene('IntroScene').sys.settings.active)) {
    if (Date.now() - t0 > 30000) { console.log('Boot-Status: ' + JSON.stringify(game.scene.getScenes(false).map(s => [s.scene.key, s.sys.settings.status]))); break; }
    await wait(100);
  }
  console.log('Boot fertig nach ms: ' + (Date.now() - t0));
  await wait(300);
  const out = {};
  const sheets = {${Object.entries(SHEETS).filter(([n]) => !only || only.includes(n)).map(([n, r]) => `${n}: ${r}`).join(',')}};
  Object.entries(sheets).forEach(([name, re]) => {
    const c = document.createElement('canvas'); c.width = 1800; c.height = 1300;
    const z = name === 'sheetFigures' ? 3 : 1;   // Figuren: stark vergrössert
    const x = c.getContext('2d');
    x.fillStyle = '#9fb4c8'; x.fillRect(0, 0, c.width, c.height);
    let px = 8, py = 8, rowH = 0;
    game.textures.getTextureKeys().filter(k => re.test(k)).forEach(k => {
      const img = game.textures.get(k).getSourceImage();
      const w = img.width * (k.startsWith('avatar') || k.startsWith('portrait') ? 1 : z / 2), h = img.height * (k.startsWith('avatar') || k.startsWith('portrait') ? 1 : z / 2);
      if (px + w > c.width - 8) { px = 8; py += rowH + 8; rowH = 0; }
      x.drawImage(img, px, py, w, h); px += w + 8; rowH = Math.max(rowH, h);
    });
    out[name] = c.toDataURL('image/png');
  });
  window.onerror = (m, f, l) => { (out.__errors = out.__errors || []).push(m + ' @' + l); };
  for (const [name, key, data, ms, after] of shots) {
    game.scene.getScenes(true).forEach(s => game.scene.stop(s.scene.key));
    await wait(50);
    if (/Ssp(Score|Award)/.test(key)) {
      SspParty.state = { mode: 'party', order: SSP.minigames.map(m => m.key), index: 2, wins: { 1: 2, 2: 1 },
        results: SSP.minigames.slice(0, 3).map((m, i) => ({ key: m.key, winner: 1 + (i % 2) })) };
    }
    game.scene.start(key, data);
    const scene = game.scene.getScene(key);
    // Warten nach Spielzeit: Software-Rendering ist langsam, Tweens und Überblendungen laufen nach Spiel-Uhr
    const gameWait = async span => {
      await wait(30);
      const start = scene.time ? scene.time.now : 0;
      for (let i = 0; i < 400 && scene.time && scene.time.now - start < span; i++) await wait(50);
    };
    await gameWait(ms);
    if (prep[name]) { try { prep[name](scene); } catch (e) { (out.__errors = out.__errors || []).push(name + ': ' + e.message); } await gameWait(after); }
    if (scene.cameras && scene.cameras.main) scene.cameras.main.resetFX();
    await new Promise(r => game.events.once('postrender', r));
    out[name] = await new Promise(r => game.events.once('postrender', () => r(game.canvas.toDataURL('image/png'))));
    document.getElementById('shots').textContent = JSON.stringify(out);   // auch bei Abbruch: was fertig ist, bleibt
  }
  out.__renderer = game.renderer.gl ? 'webgl' : 'canvas';
  out.__size = game.canvas.width + 'x' + game.canvas.height;
  const pre = document.getElementById('shots');
  pre.textContent = JSON.stringify(out);
  pre.dataset.done = '1';
});
</script>`;

const browser = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => p && fs.existsSync(p));
const base = pathToFileURL(root + path.sep).href;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'albishorn-shots-'));
const page = path.join(tmp, 'page.html');
fs.writeFileSync(page, fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  .replace(/<head>/i, `<head>\n<base href="${base}">`)
  .replace(/<\/body>/i, `<pre id="shots" style="display:none"></pre>\n${CLIENT}\n</body>`));

/** Browser mit eigenem Profil starten und über das DevTools-Protokoll fernsteuern. */
async function run() {
  const proc = spawn(browser, ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--mute-audio', '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files', '--window-size=1920,1080',
    '--remote-debugging-port=0', `--user-data-dir=${path.join(tmp, 'profile')}`, pathToFileURL(page).href], { stdio: ['ignore', 'ignore', 'pipe'] });
  try {
    const port = await new Promise((resolve, reject) => {
      let log = '';
      const timer = setTimeout(() => reject(new Error('Browser startet nicht')), 30000);
      proc.stderr.on('data', d => {
        log += d;
        const m = /DevTools listening on ws:\/\/[^:]+:(\d+)\//.exec(log);
        if (m) { clearTimeout(timer); resolve(m[1]); }
      });
    });
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    const pending = new Map();
    let nextId = 1;
    ws.onmessage = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); }
      if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        console.log('Fehler:', d.exception ? d.exception.description : d.text);
      }
    };
    const send = (method, params = {}) => new Promise(resolve => {
      const id = nextId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
    await send('Runtime.enable');
    const evaluate = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value;
    const deadline = Date.now() + 10 * 60 * 1000;
    while (Date.now() < deadline) {
      if (await evaluate(`!!document.getElementById('shots') && document.getElementById('shots').dataset.done === '1'`)) break;
      await new Promise(r => setTimeout(r, 500));
    }
    const text = await evaluate(`document.getElementById('shots') ? document.getElementById('shots').textContent : ''`);
    ws.close();
    return text;
  } finally {
    proc.kill();
  }
}

run().then(text => {
  if (!text) throw new Error('Keine Bilder erhalten');
  const result = JSON.parse(text);
  fs.mkdirSync(outDir, { recursive: true });
  Object.entries(result).forEach(([name, value]) => {
    if (name.startsWith('__')) return console.log(name, value);
    fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(value.split(',')[1], 'base64'));
  });
  console.log(`${Object.keys(result).filter(k => !k.startsWith('__')).length} Bilder in ${outDir}`);
}).catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => {
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* Browser hält das Profil noch kurz offen */ }
});
