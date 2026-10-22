/* =====================================================================
 * BootScene – Initialisierung & Assets
 *
 * Alle Grafiken werden zur Laufzeit per Code erzeugt (Phaser Graphics /
 * Canvas) – es gibt keine Bilddateien. Figuren, Porträts, Schalter, Hebel,
 * Fahnen und Deko entstehen hier, Gelände, Wasser, Kisten, Mechaniken und
 * Hintergründe in art.js (Art.createAll).
 * ===================================================================== */

// --- Pixel-Art von Jessica & Simon (24×32 Pixel, volle Auflösung) ----------
// Jessica, Simon und alle Szenen der Super Sempach Party nutzen dieselben
// Texturen (hiker1 / hiker2) – der Stil ist überall identisch.
// Gezeichnet werden nur die Grundfarben; Schatten (links/unten), Glanzlichter
// (oben/rechts) und die dunkle Kontur rechnet hikerFrame() automatisch dazu.
// Zeichen → Farbe aus der Palette der Figur, '.' = transparent, 'o' = Kontur.

// Beine (Zeilen 21–31), für beide gleich: p = Hose, k = Schuh, l = Schnürung
const HIKER_LEGS = {
  idle: [
    '........ppppppp.........',
    '........ppp.ppp.........',
    '........ppp.ppp.........',
    '........ppp.ppp.........',
    '........ppp.ppp.........',
    '........ppp.ppp.........',
    '........ppp.ppp.........',
    '........klk.klk.........',
    '........kkkk.kkkk.......',
    '........kkkk.kkkk.......',
    '........oooo.oooo.......'
  ],
  walk1: [
    '........ppppppp.........',
    '.......ppp...ppp........',
    '......ppp.....ppp.......',
    '......ppp.....ppp.......',
    '.....ppp.......ppp......',
    '.....ppp.......ppp......',
    '.....ppp.......ppp......',
    '.....klk.......klk......',
    '.....kkkk......kkkk.....',
    '.....kkkk......kkkk.....',
    '.....oooo......oooo.....'
  ],
  walk2: [
    '........ppppppp.........',
    '.........ppppp..........',
    '.........ppppp..........',
    '.........ppp.pp.........',
    '.........ppp.pp.........',
    '.........ppp.ppp........',
    '.........ppp..pp........',
    '.........klk..kk........',
    '.........kkkk.kkk.......',
    '.........kkkk.kkk.......',
    '.........oooo.ooo.......'
  ],
  jump: [
    '........ppppppp.........',
    '.......ppp..ppp.........',
    '......ppp...ppp.........',
    '.....klk....ppp.........',
    '.....kkkk...ppp.........',
    '.....oooo...klk.........',
    '............kkkk........',
    '............oooo........',
    '........................',
    '........................',
    '........................'
  ]
};

// Arm je Pose (Änderungen am Oberkörper: [Zeile, Spalte, 'Pixel'], ' ' = lassen)
const HIKER_ARMS = {
  idle: [],
  walk1: [[14, 15, 'cc'], [15, 15, 'ccc'], [16, 15, 'c.cc'], [17, 15, 'c..ss'], [18, 15, 'cc'], [19, 15, '...'], [20, 16, '..']],
  walk2: [[14, 15, 'cc'], [15, 15, 'cc'], [16, 15, 'cc'], [17, 15, 'cc'], [18, 15, 'cc'], [19, 15, '...'], [20, 16, '..'], [19, 7, 's'], [20, 7, 's']],
  jump: [[14, 15, 'cc'], [15, 15, 'cc'], [16, 15, 'cc'], [17, 15, 'cc'], [18, 15, 'cc'], [19, 15, '...'], [20, 16, '..'],
    [10, 17, 'ss'], [11, 17, 'cc'], [12, 17, 'c'], [13, 17, 'c']]
};
const HIKER_FRAME_ORDER = ['idle', 'walk1', 'walk2', 'jump'];   // Frame 0..3

// Grundfarbe → [Schatten, Glanzlicht] (automatisches Shading)
const HIKER_SHADING = {
  u: ['U', 'I'], v: ['V', 'F'], h: ['H', 'L'], s: ['S', null], c: ['C', 'X'],
  t: ['T', 'Y'], b: ['n', 'N'], p: ['P', 'Q'], k: ['K', 'J'], g: ['G', null]
};

// Aussehen von Jessica & Simon (nach den Bildvorlagen), Kopf Zeilen 0–11,
// Oberkörper Zeilen 12–20. Beide schauen nach rechts, Rucksack auf dem Rücken.
const HIKER_STYLES = {
  // Jessica: blaue Strickmütze mit Bommel, lange blonde Haare über dem Rücken,
  // goldene Kreolen, dunkle Outdoor-Jacke mit Reissverschluss, dunkelblaue
  // Cargo-Hose, braune Schnürstiefel, blauer Rucksack mit Schulterriemen
  hiker1: {
    palette: {
      o: '#1c1626', W: '#f4f2ee',
      u: '#2f6fd0', U: '#1f4c96', I: '#6aa4f4', v: '#2558aa', V: '#173c7a', F: '#3f7ad0',
      h: '#e8c060', H: '#b88a30', L: '#fbe39a', s: '#f4c8a4', S: '#d9a07c',
      e: '#1e2a4e', r: '#f0a0a0', m: '#b8505a', y: '#f0b020',
      c: '#3a3442', C: '#262230', X: '#5a5470', z: '#a8aec0', t: '#7ab0f0', T: '#5a90d0', Y: '#a0c8f8',
      b: '#2a5a9a', n: '#1c3e70', N: '#4a84d0', a: '#14243e', g: '#4a3020', G: '#33200f',
      p: '#26386a', P: '#1a2850', Q: '#3a5292', k: '#6a3e1c', K: '#46260e', J: '#8a5a30', l: '#d8c49c'
    },
    head: [
      '........................',
      '...........WW...........',
      '.........uuuuuu.........',
      '........uuuuuuuu........',
      '.......uuuuuuuuuu.......',
      '.......vvvvvvvvvvv......',
      '......hhhhhhhhssss......',
      '......hhhhhssesses......',
      '......hhhhsssrssss......',
      '......hhhhyssssmms......',
      '......hhhhh.sssss.......',
      '.....hhhhhh..sss........'
    ],
    body: [
      '...bbbbhhcccctccc.......',
      '..bbbbbhhcccczccc.......',
      '..bbbbbbacccczcoc.......',
      '..bbbbbbacccczcoc.......',
      '..bbbbbbacccczcoc.......',
      '..bbbbbbacccczcoc.......',
      '...bbbbbcccccccoc.......',
      '....bbb.ccccccc.ss......',
      '........ggggggg.ss......'
    ]
  },
  // Simon: rote Cap mit Schirm, kurze braune Haare, Dreitagebart, offene
  // dunkle Jacke über olivgrünem T-Shirt, dunkle Hose, braune Wanderschuhe,
  // dunkelroter Rucksack
  hiker2: {
    palette: {
      o: '#1c1626',
      u: '#c8323a', U: '#8e1e26', I: '#f06a68', v: '#a02830', V: '#6e161c', F: '#c84850',
      h: '#7a5232', H: '#563620', L: '#a07448', s: '#eab994', S: '#cf9a74',
      e: '#1e2a3e', B: '#a8826a', m: '#8a4a3a',
      c: '#2c3430', C: '#1c2420', X: '#4a5650', t: '#6b6650', T: '#4e4a3a', Y: '#8a8466',
      b: '#8a1e24', n: '#5e1218', N: '#b23a3e', a: '#3a0e12', g: '#2a2420', G: '#1a1612',
      p: '#2a2228', P: '#1a1418', Q: '#403640', k: '#6b4a2a', K: '#4a3018', J: '#8e6a44', l: '#c8b090'
    },
    head: [
      '........................',
      '........................',
      '.........uuuuu..........',
      '........uuuuuuuu........',
      '.......uuuuuuuuuu.......',
      '.......uuuuuuuuuuvvvv...',
      '......hhhhssssssss......',
      '......hhhhsssesses......',
      '......hhhsssssssss......',
      '......hhhhsBBBBmmB......',
      '.......hhh.BBBBBB.......',
      '........hh...sss........'
    ],
    body: [
      '...bbbbcccccttccc.......',
      '..bbbbbccccttttcc.......',
      '..bbbbbbacctttcoc.......',
      '..bbbbbbacctttcoc.......',
      '..bbbbbbacctttcoc.......',
      '..bbbbbbacctttcoc.......',
      '...bbbbbccctttcoc.......',
      '....bbb.ccctttc.ss......',
      '........ggggggg.ss......'
    ]
  }
};

/**
 * Ein Frame (24 Pixel-Zeilen à 24 Zeichen) von Jessica oder Simon: Kopf,
 * Oberkörper mit Arm-Pose und Beine zusammensetzen, dann Shading und Kontur.
 */
function hikerFrame(key, frameName) {
  const style = HIKER_STYLES[key];
  const rows = style.head.concat(style.body, HIKER_LEGS[frameName]).map(row => [...row]);
  HIKER_ARMS[frameName].forEach(([r, c, str]) => {
    [...str].forEach((ch, i) => { if (ch !== ' ') rows[r][c + i] = ch; });
  });
  const H = rows.length, W = rows[0].length;
  const filled = (x, y) => y >= 0 && y < H && x >= 0 && x < W && rows[y][x] !== '.';
  // Licht von oben rechts: linke/untere Kante dunkler, obere/rechte heller
  const shaded = rows.map((row, y) => row.map((ch, x) => {
    const m = HIKER_SHADING[ch];
    if (!m) return ch;
    if (!filled(x - 1, y) || !filled(x, y + 1)) return m[0];
    if (m[1] && (!filled(x + 1, y) || !filled(x, y - 1))) return m[1];
    return ch;
  }));
  // Dunkle Kontur um die ganze Figur
  return shaded.map((row, y) => row.map((ch, x) =>
    ch === '.' && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) ? 'o' : ch).join(''));
}

// --- Familien-Stil: Konturen & Shading wie bei Jessica und Simon -----------
// Die übrigen Figuren (PEOPLE, Hannah, Ginny) sind als Raster mit doppelt
// grossen Punkten gezeichnet. familyPixels() rechnet sie auf volle
// Auflösung hoch und gibt ihnen denselben Look wie hikerFrame(): dunkle
// Kontur (1 px), Schatten links/unten, Glanzlicht oben/rechts, Augen als
// schmale Striche. Ergebnis: Raster aus Farben (null = transparent),
// gleiche Grösse wie früher (Breite × 2, Höhe × 2).
const FAMILY_OUTLINE = '#1c1626';
const FAMILY_DOTS = 'e';   // Augen: nur 1 px breit statt 2×2

/** Farbe aufhellen (amount > 0) oder abdunkeln (amount < 0), z. B. 0.2 = 20 %. */
function tintColor(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const target = amount > 0 ? 255 : 0, a = Math.abs(amount);
  const ch = shift => Math.round(((n >> shift) & 255) * (1 - a) + target * a);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}

/**
 * Raster aus Zeichen → doppelt so grosses Farbraster (noch ohne Kontur).
 * overlays: von Hand in voller Auflösung gezeichnete Stellen (z. B. Svens
 * Kopf), [{ x, y, rows, palette }] in Pixeln: ' ' = lassen, '.' = transparent.
 */
function familyColors(rows, palette, overlays = []) {
  const cell = (x, y) => (rows[y] && palette[rows[y][x]] ? rows[y][x] : null);
  const H = rows.length * 2, W = rows[0].length * 2;
  const color = [], dot = [];
  for (let y = 0; y < H; y++) {
    color.push([]); dot.push([]);
    for (let x = 0; x < W; x++) {
      const cx = x >> 1, cy = y >> 1;
      let ch = cell(cx, cy);
      const isDot = ch && FAMILY_DOTS.includes(ch);
      if (isDot) {
        // Auge auf der Seite, wo Haut liegt, dünn halten: die andere Hälfte bekommt die Nachbarfarbe
        const left = cell(cx - 1, cy), right = cell(cx + 1, cy);
        const fill = left && !FAMILY_DOTS.includes(left) ? left : right;
        const eyeCol = fill === left ? 1 : 0;
        if ((x & 1) !== eyeCol && fill) ch = fill;
      }
      color[y].push(ch ? palette[ch] : null);
      dot[y].push(isDot && ch && FAMILY_DOTS.includes(ch));
    }
  }
  overlays.forEach(o => o.rows.forEach((row, r) => [...row].forEach((ch, c) => {
    const y = o.y + r, x = o.x + c;
    if (ch === ' ' || y < 0 || y >= H || x < 0 || x >= W) return;
    color[y][x] = ch === '.' ? null : (o.palette || {})[ch] || palette[ch] || null;
    dot[y][x] = FAMILY_DOTS.includes(ch);
  })));
  return { color, dot };
}

/** Farbraster (familyColors) → Kontur und Shading wie bei Jessica und Simon. */
function familyStyle({ color, dot }) {
  const H = color.length, W = color[0].length;
  const filled = (x, y) => y >= 0 && y < H && x >= 0 && x < W && !!color[y][x];
  // Licht von oben rechts
  const shaded = color.map((row, y) => row.map((c, x) => {
    if (!c || dot[y][x]) return c;
    if (!filled(x - 1, y) || !filled(x, y + 1)) return tintColor(c, -0.28);
    if (!filled(x + 1, y) || !filled(x, y - 1)) return tintColor(c, 0.22);
    return c;
  }));
  // Kontur: aussen um die Figur, am Bildrand (Scheitel, Sohlen) innen
  return shaded.map((row, y) => row.map((c, x) => {
    if (c) return x === 0 || y === 0 || x === W - 1 || y === H - 1 ? FAMILY_OUTLINE : c;
    return filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1) ? FAMILY_OUTLINE : null;
  }));
}

/** Raster aus Zeichen → doppelt so grosses Farbraster mit Kontur und Shading. */
function familyPixels(rows, palette, overlays) {
  return familyStyle(familyColors(rows, palette, overlays));
}

/** Zeichen-Raster mit Palette → Farbraster (für Jessica & Simon). */
function paletteColors(rows, palette) {
  return rows.map(row => [...row].map(ch => palette[ch] || null));
}

// --- Erwachsene (nach den Bildvorlagen) -------------------------------------
// Jede Figur ist ein Pixel-Raster (2× skaliert). "base" ist die Grundform,
// die Frames ändern nur einzelne Stellen: [Zeile, Spalte, 'Pixel'].
// In diesen Änderungen bedeutet ' ' = unverändert lassen, '.' = transparent.
// Frames: 0 = stehen, 1 = winken, 2/3 = gehen.

// Beine für die 16 Pixel breiten Figuren (Zeilen 19–23)
const LEGS16 = {
  idle:  ['....ppp.ppp.....', '....ppp.ppp.....', '....ppp.ppp.....', '....kkk.kkk.....', '...kkkk.kkkk....'],
  walk1: ['...ppp...ppp....', '...ppp...ppp....', '..ppp.....ppp...', '..kkk.....kkk...', '.kkkk.....kkkk..'],
  walk2: ['.....ppppp......', '.....ppppp......', '.....pp.pp......', '.....kk.kk......', '....kkkkkkk.....']
};
const legOps = (legs, firstRow = 19) => legs.map((row, i) => [firstRow + i, 0, row]);

const PEOPLE = {
  // Tante Edith: kurze weisse Haare, runde braune Brille, Halskette,
  // weisses Oberteil, schwarze Outdoorjacke, Jeans, Wanderschuhe – lächelt
  edith: {
    width: 16, originX: 0.5,
    palette: {
      w: '#eef0f2', W: '#c0c4cc', s: '#f2c49b', g: '#6b3e1f', e: '#222222', m: '#b04050',
      t: '#f8f8f8', n: '#e8c050', j: '#2a2a30', J: '#3e3e48', p: '#34507a', P: '#28406a', k: '#6b3e1f'
    },
    base: [
      '....wwwwww......',
      '...wwwwwwww.....',
      '...wwwwwwwwW....',
      '...wsssssssw....',
      '...wgggggggw....',   // Brille
      '...wgegsgegw....',
      '...wsssssssw....',
      '...wsmtttmsw....',   // herzliches Lachen
      '...wwsssssww....',
      '...jjjsnsjjj....',   // Halskette
      '..jjjjtntjjjj...',   // Anhänger
      '..jjjjtttjjjj...',
      '..jJjjtttjjJj...',
      '..jJjjtttjjJj...',
      '..jJjjtttjjJj...',
      '..sjjjtttjjjs...',
      '..s.ppppppp.s...',
      '....ppppppp.....',
      '....pppPppp.....'
    ].concat(LEGS16.idle),
    frames: {
      wave: [[15, 12, '.'], [16, 12, '.'], [11, 13, 'j'], [10, 13, 'j'], [9, 13, 'j'], [8, 13, 's'], [7, 13, 's']],
      walk1: legOps(LEGS16.walk1),
      walk2: legOps(LEGS16.walk2)
    }
  },

  // Onkel Kurt: kurzes dunkles, meliertes Haar, graues Melange-T-Shirt,
  // dunkle Outdoorhose, robuste dunkle Wanderschuhe
  kurt: {
    width: 16, originX: 0.5,
    palette: {
      h: '#3a3430', H: '#8a8480', s: '#e0a47c', S: '#c88a64', e: '#222222', m: '#9a5040',
      t: '#8a8c94', T: '#74767e', p: '#2a2c34', P: '#3a3c46', k: '#4a4436'
    },
    base: [
      '.....hHhhh......',
      '....hhHhhHhh....',
      '....hssssssh....',
      '....ssssssss....',
      '....sesssses....',
      '....ssssSsss....',
      '....sssmmsss....',   // dezentes Lächeln
      '.....ssssss.....',
      '......ssss......',
      '...tttttttttt...',
      '..tttttttttttt..',
      '..ttTttttttTtt..',
      '..s.tttttttt.s..',
      '..s.tttTtttt.s..',
      '..s.tttttttt.s..',
      '..s.tTttttTt.s..',
      '..s.pppppppp.s..',
      '....pppppppp....',
      '....ppppPppp....'
    ].concat(LEGS16.idle),
    frames: {
      wave: [[12, 13, '.'], [13, 13, '.'], [14, 13, '.'], [15, 13, '.'], [16, 13, '.'],
             [9, 14, 's'], [8, 14, 's'], [7, 14, 's'], [6, 14, 's'], [5, 14, 'ss']],
      walk1: legOps(LEGS16.walk1),
      walk2: legOps(LEGS16.walk2)
    }
  },

  // Sven: dunkelgraue Basecap, olivgrünes T-Shirt, graue 3/4-Trekkinghose,
  // schwarze Socken, Wanderschuhe – und die grosse Kraxe auf dem Rücken.
  // Er schaut nach rechts, die Trage hängt links (hinten).
  sven: {
    width: 20, originX: 13.5 / 20,   // Körpermitte, nicht Bildmitte (die Kraxe ragt nach hinten)
    palette: {
      c: '#3a3a42', C: '#26262c', h: '#2b1d14', s: '#e8b08a', e: '#222222', m: '#9a5040',
      o: '#5a6b3a', O: '#46552c', b: '#2a2c30', f: '#3c3e44', F: '#6a6c74',
      p: '#5a5a62', P: '#46464e', q: '#18181c', k: '#5a5040', K: '#3a3428'
    },
    base: [
      // Basecap & Kopf
      [0, 11, 'cccc'], [1, 10, 'ccccccCC'], [2, 10, 'hssssss'], [3, 10, 'hsssses'], [4, 11, 'sssms'], [5, 12, 'sss'],
      // olivgrünes T-Shirt
      [6, 10, 'ooooooo'], [7, 9, 'oooooooo'], [8, 9, 'oOoooooo'], [9, 9, 'oOoooooo'],
      [10, 9, 'oOoooooo'], [11, 9, 'oOoooooo'], [12, 9, 'oooooooo'],
      // Tragegurte & Hüftgurt der Kraxe
      [6, 11, 'b'], [7, 11, 'b'], [8, 12, 'b'], [9, 12, 'b'], [10, 12, 'b'], [11, 12, 'b'], [13, 9, 'bbbbbbbb'],
      // vorderer Arm (hängt)
      [6, 16, 'oo'], [7, 17, 'o'], [8, 17, 's'], [9, 17, 's'], [10, 17, 's'], [11, 17, 's'], [12, 17, 'ss'],
      // graue 3/4-Hose, schwarze Socken, Wanderschuhe
      [14, 10, 'ppppppp'], [15, 10, 'ppp.ppp'], [16, 10, 'ppp.ppp'], [17, 10, 'ppp.ppp'], [18, 10, 'PPP.PPP'],
      [19, 10, 'qqq.qqq'], [20, 10, 'qqq.qqq'], [21, 10, 'kkk.kkk'], [22, 10, 'kkk'], [22, 14, 'kkkk'],
      [23, 10, 'KKK'], [23, 14, 'KKKK'],
      // Kraxe: Rückenteil (Spalte 8), äusserer Bügel (Spalte 2), Haltebügel, Boden, Standbein
      [4, 8, 'f'], [5, 8, 'f'], [6, 8, 'f'], [7, 8, 'f'], [8, 8, 'f'], [9, 8, 'f'], [10, 8, 'f'],
      [11, 8, 'f'], [12, 8, 'f'], [13, 8, 'f'], [14, 8, 'f'],
      [5, 2, 'f'], [6, 2, 'f'], [7, 2, 'f'], [8, 2, 'f'], [9, 2, 'f'], [10, 2, 'f'], [11, 2, 'f'],
      [12, 2, 'f'], [13, 2, 'f'], [14, 2, 'f'],
      [4, 2, 'FFFFFFF'], [6, 3, 'FFFFF'], [15, 2, 'fffffff'],
      [16, 2, 'f'], [17, 2, 'f'], [18, 1, 'f'], [19, 1, 'ff']
    ],
    // Kopf in voller Auflösung (Pixel x 18–37, y 0–11): runde Basecap mit
    // Schirm nach vorn, Haaransatz und Ohr, Nase, Lächeln (rechts ' ' = frei
    // lassen für den Winke-Arm)
    hiRes: [{
      x: 18, y: 0,
      // c/C/I = Cap (heller als die Kontur), v = Schirm, h = Haaransatz
      palette: { c: '#5a5e6c', C: '#43465a', I: '#7c8092', v: '#3a3d4c', h: '#4e3424', S: '#cc9068' },
      rows: [
        '................    ',
        '.......cccccc...    ',
        '.....cIIccccccc...  ',
        '....cIccccccccccc.  ',
        '....hCCCCCCCCCCvvvv ',
        '....hhsssssssssss   ',
        '....hhssssssssess   ',
        '....hsSsssssssssss  ',
        '....hhssssssssssS   ',
        '.....hsssssssmmss   ',
        '......Sssssssss.    ',
        '........sssss...    '
      ]
    }],
    frames: {
      wave: [[8, 17, '.'], [9, 17, '.'], [10, 17, '.'], [11, 17, '.'], [12, 17, '..'],
             [5, 17, 'o'], [4, 18, 's'], [3, 18, 's'], [2, 18, 's'], [1, 18, 'ss']],
      walk1: [
        [15, 9, '.........'], [16, 9, '.........'], [17, 9, '.........'], [18, 9, '.........'], [19, 9, '.........'],
        [20, 7, '...........'], [21, 7, '...........'], [22, 7, '.............'], [23, 7, '.............'],
        [15, 9, 'ppp...ppp'], [16, 9, 'ppp...ppp'], [17, 9, 'ppp...ppp'], [18, 9, 'PPP...PPP'], [19, 9, 'qqq...qqq'],
        [20, 8, 'qqq.....qqq'], [21, 8, 'kkk.....kkk'], [22, 7, 'kkkk.....kkkk'], [23, 7, 'KKKK.....KKKK']
      ],
      walk2: [
        [15, 9, '.........'], [16, 9, '.........'], [17, 9, '.........'], [18, 9, '.........'], [19, 9, '.........'],
        [20, 9, '.........'], [21, 9, '.........'], [22, 9, '.........'], [23, 9, '.........'],
        [15, 11, 'ppppp'], [16, 11, 'ppppp'], [17, 11, 'pp.pp'], [18, 11, 'PP.PP'], [19, 11, 'qq.qq'],
        [20, 11, 'qq.qq'], [21, 11, 'kk.kk'], [22, 11, 'kkkkkk'], [23, 11, 'KKKKKK']
      ]
    }
  },

  // Angi (Svens Frau): blonde Haare mit Zopf über der rechten Schulter,
  // rosa Outdoorjacke, dunkle Hose, Wanderschuhe – lacht
  angi: {
    width: 16, originX: 0.5,
    palette: {
      h: '#ecc868', H: '#c89a3c', s: '#f4c8a4', e: '#1e3a6e', m: '#c0506a', r: '#f0a0a8',
      j: '#ec6aa8', J: '#c8488a', z: '#fbe0ee', p: '#3a3f4e', P: '#2a2e3a', k: '#5a3418'
    },
    base: [
      '.....hhhhhh.....',
      '....hhHhhhhh....',
      '...hhhhhhHhhh...',
      '...hsssssssh....',
      '...hsesssesh....',
      '...hrsssssrhH...',   // rote Bäckchen
      '...hssmmmssHh...',   // breites Lachen
      '....sssssssHh...',
      '.....jsssjhH....',   // Zopf beginnt
      '...jjjjzjjjhH...',
      '..jjjjjzjjjHh...',
      '..jJjjjzjjhJj...',
      '..jJjjjzjjHJj...',
      '..jJjjjzjjhJj...',
      '..sjjjjzjjjjs...',
      '..s.jjjzjjj.s...',
      '....ppppppp.....',
      '....ppppppp.....',
      '....pppPppp.....'
    ].concat(LEGS16.idle),
    frames: {
      wave: [[15, 12, '.'], [14, 12, 'j'], [11, 13, 'j'], [10, 13, 'j'], [9, 13, 'j'], [8, 13, 's'], [7, 13, 's']],
      walk1: legOps(LEGS16.walk1),
      walk2: legOps(LEGS16.walk2)
    }
  },

  // Peter Kammer (Grill-Meister der Sempach-Party): kleinere, rundere Version
  // von Sven – gleiches olivgrünes T-Shirt und graue Shorts, fast Glatze
  // mit Haarkranz, grosses Grinsen
  peter: {
    width: 16, originX: 0.5,
    palette: {
      s: '#e8b08a', S: '#d0946e', L: '#f6d0b0', h: '#7a6a5a', e: '#222222', m: '#9a5040', w: '#ffffff',
      o: '#5a6b3a', O: '#46552c', b: '#3a2a1a', p: '#5a5a62', q: '#18181c', k: '#5a5040'
    },
    base: [
      '................',
      '................',
      '................',
      '................',
      '.....sLssss.....',   // Glatze mit Glanzpunkt
      '....hssssssh....',   // Haarkranz an den Seiten
      '....hsessesh....',
      '....sssSSsss....',
      '....smwwwwms....',   // breites Grinsen
      '.....ssssss.....',
      '...oooooooooo...',
      '..oooooooooooo..',
      '.soooooooooooos.',
      '.sooooOOOOoooos.',   // Bauch
      '.soooooooooooos.',
      '..oooooooooooo..',
      '..bbbbbbbbbbbb..',
      '...pppppppppp...',
      '...pppp..pppp...',
      '...pppp..pppp...',
      '...ssss..ssss...',
      '...qqqq..qqqq...',
      '...kkkk..kkkk...',
      '..kkkkk..kkkkk..'
    ],
    frames: {
      wave: [[12, 14, '.'], [13, 14, '.'], [14, 14, '.'], [11, 14, 's'], [10, 15, 's'], [9, 15, 's'], [8, 15, 's']]
    }
  }
};
const PERSON_HEIGHT = 24;

// Ginny, die getigerte Katze: braun getigert, weisse Brust & Pfötchen,
// grüne Augen. Seitenansicht (schaut nach rechts), 16×12 Pixel.
// Frames: 0 = sitzen, 1/2 = laufen
const GINNY = {
  palette: { b: '#9a7650', d: '#5a3e26', w: '#f6f4ee', g: '#6ad04a', n: '#e88a9a', k: '#2a2018' },
  body: [
    '..........b...b.',
    '..........bb.bb.',
    '.........bdbbdb.',
    '.........bgbbgb.',
    'd........bbwnwb.',
    'db.......wwkwww.',
    '.d.bdbdbdbwwww..',
    '..bbdbdbdbbww...',
    '..bdbbbdbbbww...',
    '..bbbdbbbdbwb...'
  ],
  legs: {
    sit:   ['..ww......ww....', '..ww......ww....'],
    walk1: ['..w..w....w..w..', '..w..w....w..w..'],
    walk2: ['...ww......ww...', '...ww......ww...']
  }
};

// Svens Tochter in der Kraxe: rosa Hose, graue Jacke, altrosa Mütze.
// Sie schaut neugierig nach hinten (links) über Svens Schulter.
// Eigenes Sprite, damit sie unabhängig von Sven wippen kann.
const DAUGHTER = {
  pixels: [
    '..rrrr..',
    '.rrrrrr.',
    '.rRrrRr.',
    '.ssssrr.',
    '.esssrr.',
    '.sssss..',
    '.gggggg.',
    'sggggggs',   // Händchen am Haltebügel
    '.gGggGg.',
    '.nnnnnn.',
    '.nn..nn.',
    '.nn..nn.',
    '.ww..ww.'
  ],
  palette: { r: '#d49aaa', R: '#b07888', s: '#f4c8a4', e: '#222222', g: '#9a9ca4', G: '#7a7c84', n: '#ec5fa4', w: '#eef0f8' },
  // Kopf in voller Auflösung (Pixel 16×12): runde Mütze mit Bündchen,
  // Stupsnase, rote Bäckchen – sie schaut nach links
  hiRes: [{
    x: 0, y: 0,
    palette: { b: '#f0a0a8', m: '#c0506a', h: '#e0b860' },
    rows: [
      '................',
      '.....rrrrrr.....',
      '...rrrrrrrrrr...',
      '..rrrrrrrrrrrr..',
      '..RRRRRRRRRRRR..',
      '..shssssssrrrr..',
      '..sesssssssrrr..',
      '.ssssssssssrr...',
      '..sbsssssssrr...',
      '..ssmssssssh....',
      '...ssssssss.....',
      '....ssssss......'
    ]
  }],
  // Position im Sven-Raster: linke obere Ecke (der Kopf ragt über die Kraxe hinaus)
  col: 3,
  row: -1
};

const EDELWEISS_PIXELS = [
  '...ww...',
  '.w.ww.w.',
  '..wwww..',
  'wwwyywww',
  'wwwyywww',
  '..wwww..',
  '.w.ww.w.',
  '...ww...'
];

// Frame-Nummern von Jessica & Simon (4 Frames: stehen, 2× gehen, Sprung)
const CHAR_FRAMES = {
  hiker1: { idle: 0, jump: 3, fall: 3, run: [1, 0, 2, 0], runRate: 10 },
  hiker2: { idle: 0, jump: 3, fall: 3, run: [1, 0, 2, 0], runRate: 10 }
};
/** Frame-Nummer für eine Pose ('idle', 'jump', 'fall') einer Spielfigur. */
function charFrame(key, pose) {
  const f = CHAR_FRAMES[key];
  return f && f[pose] !== undefined ? f[pose] : 0;
}

class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Lade …', {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffffff'
    }).setOrigin(0.5);

    this.createHikerTextures();
    this.createPeopleTextures();
    this.createObjectTextures();
    this.createDecoTextures();
    Art.createAll(this);          // Gelände, Mechaniken & Hintergründe (art.js)
    SspArt.createAll(this);       // Grafiken der Super Sempach Party (js/ssp/sspArt.js)
    // Einzige Bilddatei: Victory-Bild der EndScene (eingebettet, siehe tools/embed-images.js)
    if (typeof ENDSCREEN_IMAGE !== 'undefined') this.textures.addBase64('endscreen', ENDSCREEN_IMAGE);
    // Familienbilder für Ladebildschirme und Bildergalerie (eingebettet, siehe tools/embed-images.js)
    if (typeof LOADING_IMAGES !== 'undefined') {
      Object.entries(LOADING_IMAGES).forEach(([key, data]) => this.textures.addBase64('loading_' + key, data));
    }
    this.createAnimations();

    // Auf die Pixel-Schrift warten (max. 1.5 s, sonst Fallback-Schrift),
    // dann "Konsole einschalten" (KES-Startlogo)
    const go = () => this.scene.start('IntroScene', { mode: 'logo' });
    if (document.fonts && document.fonts.load) {
      Promise.race([
        document.fonts.load(`16px ${FONT}`),
        new Promise(resolve => setTimeout(resolve, 1500))
      ]).then(go, go);
    } else {
      go();
    }
  }

  // ---------------------------------------------------------------------
  // Hilfsfunktionen
  // ---------------------------------------------------------------------

  /** Zeichnet ein Pixel-Raster (Array von Strings) auf einen Canvas-Kontext. */
  drawPixels(ctx, rows, palette, scale, offsetX = 0, offsetY = 0) {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const color = palette[row[x]];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(offsetX + x * scale, offsetY + y * scale, scale, scale);
      }
    });
  }

  /** Zeichnet ein Farbraster (siehe familyPixels) auf einen Canvas-Kontext. */
  drawColors(ctx, colors, scale = 1, offsetX = 0, offsetY = 0) {
    colors.forEach((row, y) => row.forEach((c, x) => {
      if (!c) return;
      ctx.fillStyle = c;
      ctx.fillRect(offsetX + x * scale, offsetY + y * scale, scale, scale);
    }));
  }

  /** Erzeugt eine Textur mit einem Graphics-Objekt: draw(g) zeichnet hinein. */
  makeTexture(key, width, height, draw) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(key, width, height);
    g.destroy();
  }

  // ---------------------------------------------------------------------
  // Spielfiguren
  // ---------------------------------------------------------------------
  createHikerTextures() {
    const FW = 24, FH = 32;   // volle Auflösung, gleiche Grösse wie früher 12×16 × 2
    Object.keys(HIKER_STYLES).forEach(key => {
      const tex = this.textures.createCanvas(key, FW * HIKER_FRAME_ORDER.length, FH);
      const ctx = tex.getContext();
      HIKER_FRAME_ORDER.forEach((name, i) => {
        this.drawPixels(ctx, hikerFrame(key, name), HIKER_STYLES[key].palette, 1, i * FW, 0);
        tex.add(i, 0, i * FW, 0, FW, FH);   // Frame i definieren
      });
      tex.refresh();
    });
  }

  /** Baut das Pixel-Raster einer Person für einen Frame (siehe PEOPLE). */
  buildPersonGrid(person, frameOps = []) {
    const grid = Array.from({ length: PERSON_HEIGHT }, () => Array(person.width).fill('.'));
    const paint = ([r, c, str]) => {
      [...str].forEach((ch, i) => {
        if (ch !== ' ' && grid[r] && c + i < person.width) grid[r][c + i] = ch;
      });
    };
    if (typeof person.base[0] === 'string') person.base.forEach((row, r) => paint([r, 0, row]));
    else person.base.forEach(paint);
    frameOps.forEach(paint);
    return grid.map(row => row.join(''));
  }

  /** Tante Edith, Onkel Kurt, Sven (+ Tochter) und alle Porträts. */
  createPeopleTextures() {
    const SCALE = 2, FH = PERSON_HEIGHT * SCALE;
    const FRAME_ORDER = ['idle', 'wave', 'walk1', 'walk2'];

    Object.entries(PEOPLE).forEach(([key, person]) => {
      const FW = person.width * SCALE;
      const tex = this.textures.createCanvas(`person_${key}`, FW * FRAME_ORDER.length, FH);
      FRAME_ORDER.forEach((name, i) => {
        const grid = this.buildPersonGrid(person, person.frames[name] || []);
        this.drawColors(tex.getContext(), familyPixels(grid, person.palette, person.hiRes), 1, i * FW, 0);
        tex.add(i, 0, i * FW, 0, FW, FH);
      });
      tex.refresh();
    });

    // Tochter (eigenes Sprite)
    const d = this.textures.createCanvas('svenDaughter', 8 * SCALE, DAUGHTER.pixels.length * SCALE);
    this.drawColors(d.getContext(), familyPixels(DAUGHTER.pixels, DAUGHTER.palette, DAUGHTER.hiRes));
    d.refresh();

    // Ginny, die Katze: 3 Frames (sitzen, 2× laufen)
    const cat = this.textures.createCanvas('cat_ginny', 16 * SCALE * 3, 12 * SCALE);
    ['sit', 'walk1', 'walk2'].forEach((pose, i) => {
      this.drawColors(cat.getContext(), familyPixels(GINNY.body.concat(GINNY.legs[pose]), GINNY.palette), 1, i * 16 * SCALE, 0);
      cat.add(i, 0, i * 16 * SCALE, 0, 16 * SCALE, 12 * SCALE);
    });
    cat.refresh();

    // Porträts: Kopf + Schultern
    ['edith', 'kurt', 'angi'].forEach(key => {
      const colors = familyPixels(this.buildPersonGrid(PEOPLE[key]), PEOPLE[key].palette);
      this.makePortrait(`portrait_${key}`, colors.slice(0, 26), 2);
    });

    // Sven mit Tochter, die über seine Schulter schaut
    const shift = -DAUGHTER.row;                               // Platz für ihren Kopf oben
    const svenGrid = this.buildPersonGrid(PEOPLE.sven);
    const padded = Array.from({ length: PERSON_HEIGHT + shift }, (_, r) => svenGrid[r - shift] || '.'.repeat(PEOPLE.sven.width));
    const both = familyColors(padded, PEOPLE.sven.palette, PEOPLE.sven.hiRes.map(o => Object.assign({}, o, { y: o.y + shift * 2 })));
    const hannah = familyColors(DAUGHTER.pixels, DAUGHTER.palette, DAUGHTER.hiRes);
    hannah.color.forEach((row, r) => row.forEach((c, x) => {
      const Y = r + (DAUGHTER.row + shift) * 2, X = x + DAUGHTER.col * 2;
      if (c && both.color[Y] && !both.color[Y][X]) { both.color[Y][X] = c; both.dot[Y][X] = hannah.dot[r][x]; }
    }));
    this.makePortrait('portrait_sven', familyStyle(both).slice(0, 26).map(row => row.slice(4)), 2);

    // Porträts der beiden Geschwister
    Object.keys(HIKER_STYLES).forEach(key => {
      this.makePortrait(`portrait_${key}`, paletteColors(hikerFrame(key, 'idle').slice(0, 24), HIKER_STYLES[key].palette), 3);
    });

    this.createAvatarTextures();
  }

  /**
   * Avatare fürs Passwort (AVATARS in config.js): die Köpfe aus den fertigen
   * Figuren, ganzzahlig vergrössert in einer 60×60-Textur "avatar_<key>".
   * area = [x0, x1, y0, y1] in Pixeln der Figur, darin wird der Kopf
   * automatisch eng zugeschnitten.
   */
  createAvatarTextures() {
    const person = key => familyPixels(this.buildPersonGrid(PEOPLE[key]), PEOPLE[key].palette, PEOPLE[key].hiRes);
    const hiker = key => paletteColors(hikerFrame(key, 'idle'), HIKER_STYLES[key].palette);
    const sources = {
      edith: [person('edith'), [0, 32, 0, 20]],
      kurt: [person('kurt'), [0, 32, 0, 20]],
      sven: [person('sven'), [19, 40, 0, 15]],                   // ohne Kraxe
      jessica: [hiker('hiker1'), [0, 24, 0, 12]],               // nur Kopf, ohne Rucksack
      simon: [hiker('hiker2'), [0, 24, 0, 12]],
      angi: [person('angi'), [0, 32, 0, 20]],
      peter: [person('peter'), [0, 32, 6, 22]],
      hannah: [familyPixels(DAUGHTER.pixels, DAUGHTER.palette, DAUGHTER.hiRes), [0, 16, 0, 13]],
      ginny: [familyPixels(GINNY.body.concat(GINNY.legs.sit), GINNY.palette), [16, 32, 0, 16]]
    };
    const SIZE = 60;
    AVATARS.forEach(({ key }) => {
      const [colors, [x0, x1, y0, y1]] = sources[key];
      let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          if (!colors[y] || !colors[y][x]) continue;
          minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
      }
      const crop = colors.slice(minY, maxY + 1).map(row => row.slice(minX, maxX + 1));
      const w = crop[0].length, h = crop.length;
      const scale = Math.max(1, Math.floor(Math.min((SIZE - 2) / w, (SIZE - 2) / h)));
      const tex = this.textures.createCanvas(`avatar_${key}`, SIZE, SIZE);
      this.drawColors(tex.getContext(), crop, scale, Math.round((SIZE - w * scale) / 2), Math.round((SIZE - h * scale) / 2));
      tex.refresh();
    });
  }

  /** Porträt für die Dialogbox: Kopf + Schultern, gross skaliert, mit Hintergrund. */
  makePortrait(key, colors, scale) {
    const SIZE = 72;
    const tex = this.textures.createCanvas(key, SIZE, SIZE);
    const ctx = tex.getContext();
    ctx.fillStyle = '#7f93c0';   // heller Hintergrund, damit dunkle Kleidung sichtbar bleibt
    ctx.fillRect(0, 0, SIZE, SIZE);
    const w = colors[0].length * scale, h = colors.length * scale;
    this.drawColors(ctx, colors, scale, Math.round((SIZE - w) / 2), SIZE - h);
    tex.refresh();
  }

  createAnimations() {
    // Gehen der Erwachsenen: Frames 2/3 = Schritt, 0 = Beine zusammen
    Object.keys(PEOPLE).forEach(name => {
      const key = `person_${name}`;
      this.anims.create({
        key: `${key}-walk`,
        frames: [{ key, frame: 2 }, { key, frame: 0 }, { key, frame: 3 }, { key, frame: 0 }],
        frameRate: 8,
        repeat: -1
      });
    });
    this.anims.create({
      key: 'cat_ginny-walk', frames: [{ key: 'cat_ginny', frame: 1 }, { key: 'cat_ginny', frame: 2 }], frameRate: 8, repeat: -1
    });
    ['hiker1', 'hiker2'].forEach(key => {
      this.anims.create({
        key: `${key}-walk`,
        frames: CHAR_FRAMES[key].run.map(frame => ({ key, frame })),
        frameRate: CHAR_FRAMES[key].runRate,
        repeat: -1
      });
    });
  }


  // ---------------------------------------------------------------------
  // Interaktive Objekte
  // ---------------------------------------------------------------------
  createObjectTextures() {
    // Bodenschalter: eine Variante pro Besitzer (1, 2, beide) × (oben, gedrückt)
    // Schalter in der Farbe des Spielers, der sie benutzen darf (gelb = beide)
    const plateColors = { 1: PLAYER_DEFS[0].color, 2: PLAYER_DEFS[1].color, any: 0xf2b632 };
    Object.entries(plateColors).forEach(([owner, color]) => {
      [false, true].forEach(pressed => {
        const key = `plate_${owner}_${pressed ? 'down' : 'up'}`;
        this.makeTexture(key, TILE, 10, g => {
          const h = pressed ? 2 : 5;
          g.fillStyle(0x4a4a52).fillRect(0, 6, TILE, 4);         // Sockel
          g.fillStyle(color).fillRect(4, 6 - h, TILE - 8, h);    // Druckknopf
          g.fillStyle(0xffffff, 0.45).fillRect(5, 6 - h, TILE - 10, 1);
        });
      });
    });

    // Hebel aus / an
    [false, true].forEach(on => {
      this.makeTexture(on ? 'lever_on' : 'lever_off', TILE, TILE, g => {
        g.lineStyle(4, 0x3a3a44);
        if (on) g.lineBetween(16, 24, 26, 8); else g.lineBetween(16, 24, 6, 8);
        g.fillStyle(on ? 0x3fd06a : 0xd7263d).fillCircle(on ? 26 : 6, 8, 4);
        g.fillStyle(0x6a6a74).fillRect(6, 22, 20, 10);
        g.fillStyle(0x8a8a94).fillRect(6, 22, 20, 2);
      });
    });

    // Ziel: gelber Schweizer Wanderwegweiser
    this.makeTexture('goalSign', 140, 110, g => {
      g.fillStyle(0x6b4220).fillRect(12, 20, 8, 90);               // Pfosten
      g.fillStyle(0x222222);                                        // Rand
      g.fillPoints([{ x: 0, y: 6 }, { x: 116, y: 6 }, { x: 138, y: 22 }, { x: 116, y: 38 }, { x: 0, y: 38 }], true);
      g.fillStyle(0xf7d117);                                        // gelbes Schild
      g.fillPoints([{ x: 2, y: 8 }, { x: 115, y: 8 }, { x: 134, y: 22 }, { x: 115, y: 36 }, { x: 2, y: 36 }], true);
    });

    // Infotafel
    this.makeTexture('infoSign', TILE, 44, g => {
      g.fillStyle(0x6b4220).fillRect(14, 20, 4, 24);
      g.fillStyle(0xffffff).fillRect(2, 0, 28, 24);
      g.fillStyle(0x1b5fbf).fillRect(4, 2, 24, 20);
      g.fillStyle(0xffffff).fillRect(14, 5, 4, 3).fillRect(14, 10, 4, 9);
    });

    // Checkpoint-Fahne (grau = noch nicht erreicht, Schweizerfahne = erreicht)
    [false, true].forEach(on => {
      this.makeTexture(on ? 'flag_on' : 'flag_off', TILE, 64, g => {
        g.fillStyle(0xdddddd).fillRect(6, 4, 3, 60);
        g.fillStyle(0xffd34d).fillCircle(7, 4, 3);
        const fy = on ? 8 : 40;
        g.fillStyle(on ? 0xd52b1e : 0x8a8a8a).fillRect(9, fy, 20, 20);
        g.fillStyle(0xffffff).fillRect(17, fy + 4, 4, 12).fillRect(13, fy + 8, 12, 4);
      });
    });

    // Edelweiss (Sammelobjekt)
    const tex = this.textures.createCanvas('edelweiss', 16, 16);
    this.drawPixels(tex.getContext(), EDELWEISS_PIXELS, { w: '#ffffff', y: '#f2c230' }, 2);
    tex.refresh();

    // Kleines Quadrat für Partikel (Staub, Konfetti)
    this.makeTexture('pixel', 4, 4, g => g.fillStyle(0xffffff).fillRect(0, 0, 4, 4));
    // Konfetti-Streifen & Funken
    this.makeTexture('confetti', 4, 8, g => g.fillStyle(0xffffff).fillRect(0, 0, 4, 8));
    this.makeTexture('spark', 6, 6, g => {
      g.fillStyle(0xffffff).fillRect(2, 0, 2, 6).fillRect(0, 2, 6, 2);
    });

    // Partyhütchen & Ballon fürs Finale
    this.makeTexture('partyHat', 16, 18, g => {
      g.fillStyle(0xf7d117).fillTriangle(8, 0, 0, 18, 16, 18);
      g.fillStyle(0xd52b1e).fillRect(4, 10, 8, 2).fillRect(2, 15, 12, 2).fillRect(6, 5, 4, 2);
      g.fillStyle(0xffffff).fillCircle(8, 1, 2);
    });
    this.makeTexture('balloon', 24, 56, g => {
      g.lineStyle(1, 0xffffff, 0.8).lineBetween(12, 28, 12, 56);
      g.fillStyle(0xffffff).fillEllipse(12, 14, 22, 28);
      g.fillStyle(0xffffff).fillTriangle(9, 28, 15, 28, 12, 32);
    });
  }

  // ---------------------------------------------------------------------
  // Deko & Hintergrund
  // ---------------------------------------------------------------------
  createDecoTextures() {
    // Schweizer Chalet mit Geranien
    this.makeTexture('house', 112, 96, g => {
      g.fillStyle(0xf0e6d0).fillRect(10, 56, 92, 40);              // gemauerter Sockel
      g.fillStyle(0xa0622d).fillRect(10, 30, 92, 30);              // Holzfassade
      g.fillStyle(0x7a4520);
      for (let y = 34; y < 60; y += 6) g.fillRect(10, y, 92, 1);
      g.fillStyle(0x5b2d1a);                                        // Dach
      g.fillTriangle(0, 34, 56, 0, 112, 34);
      g.fillStyle(0x7a3d22).fillTriangle(10, 30, 56, 6, 102, 30);
      // Fenster mit roten Läden
      [[22, 38], [72, 38], [22, 66]].forEach(([x, y]) => {
        g.fillStyle(0xc0392b).fillRect(x - 6, y, 5, 14).fillRect(x + 17, y, 5, 14);
        g.fillStyle(0xffffff).fillRect(x - 1, y, 18, 14);
        g.fillStyle(0x8fd0ff).fillRect(x + 1, y + 2, 6, 4).fillRect(x + 9, y + 2, 6, 4)
          .fillRect(x + 1, y + 8, 6, 4).fillRect(x + 9, y + 8, 6, 4);
      });
      // Geranien unter den oberen Fenstern
      g.fillStyle(0x3b8f2c).fillRect(16, 53, 30, 3).fillRect(66, 53, 30, 3);
      g.fillStyle(0xe8283c);
      [18, 24, 30, 36, 42, 68, 74, 80, 86, 92].forEach(x => g.fillRect(x, 50, 3, 3));
      g.fillStyle(0x5a3a1c).fillRect(70, 68, 18, 28);               // Tür
    });

    // Tanne
    this.makeTexture('tree', 64, 96, g => {
      g.fillStyle(0x5a3a1c).fillRect(28, 78, 8, 18);
      g.fillStyle(0x1f5e2e);
      g.fillTriangle(32, 0, 10, 40, 54, 40);
      g.fillTriangle(32, 18, 4, 62, 60, 62);
      g.fillTriangle(32, 38, 0, 82, 64, 82);
      g.fillStyle(0x2f7d3e);
      g.fillTriangle(32, 4, 22, 30, 32, 30);
      g.fillTriangle(32, 22, 16, 52, 32, 52);
      g.fillTriangle(32, 42, 12, 72, 32, 72);
    });

    // Restaurant Albishorn: Chalet mit Steinsockel, beleuchteten Fenstern & Terrasse
    this.makeTexture('restaurant', 260, 150, g => {
      g.fillStyle(0x8a8478).fillRect(20, 92, 220, 58);                 // Steinsockel
      g.fillStyle(0x6f6a60);
      for (let y = 100; y < 150; y += 12) for (let x = 24 + (y % 24); x < 236; x += 24) g.fillRect(x, y, 2, 6);
      g.fillStyle(0xa0622d).fillRect(26, 44, 208, 50);                  // Holzfassade
      g.fillStyle(0x7a4520);
      for (let y = 50; y < 94; y += 7) g.fillRect(26, y, 208, 1);
      g.fillStyle(0x5b2d1a).fillTriangle(0, 50, 130, 0, 260, 50);       // grosses Dach
      g.fillStyle(0x7a3d22).fillTriangle(16, 46, 130, 8, 244, 46);
      g.fillStyle(0x4a2c14).fillRect(0, 48, 260, 5);
      // beleuchtete Fenster oben (mit Läden) und grosse Bogenfenster unten
      [44, 84, 160, 200].forEach(x => {
        g.fillStyle(0x2e7d32).fillRect(x - 6, 58, 5, 22).fillRect(x + 21, 58, 5, 22);
        g.fillStyle(0xffd77a).fillRect(x, 58, 20, 22);
        g.fillStyle(0x7a4520).fillRect(x + 9, 58, 2, 22).fillRect(x, 68, 20, 2);
        g.fillStyle(0xe8283c).fillRect(x - 2, 81, 24, 4);              // Geranien
      });
      [44, 92, 168, 216].forEach(x => {
        g.fillStyle(0xffc85a).fillRect(x - 14, 104, 28, 30).fillCircle(x, 104, 14);
        g.fillStyle(0x6f6a60).fillRect(x - 1, 92, 2, 42);
      });
      g.fillStyle(0x4a2c14).fillRect(118, 104, 24, 46);                 // Eingang
      g.fillStyle(0xffd77a).fillRect(122, 108, 16, 18);
      // Schild-Brett (Text kommt separat drauf)
      g.fillStyle(0x4a2c14).fillRect(70, 22, 120, 22);
      g.fillStyle(0xf0e6d0).fillRect(72, 24, 116, 18);
    });

    // Hölzerner Aussichtsturm
    this.makeTexture('tower', 80, 240, g => {
      g.lineStyle(5, 0x6b4220);
      g.lineBetween(14, 240, 30, 40); g.lineBetween(66, 240, 50, 40);  // Beine
      g.lineStyle(3, 0x8a5a2b);
      for (let y = 220; y > 50; y -= 40) {                             // Kreuzstreben
        const inset = (240 - y) * 0.08;
        g.lineBetween(14 + inset, y, 66 - inset - 3, y - 40);
        g.lineBetween(66 - inset, y, 14 + inset + 3, y - 40);
        g.lineBetween(14 + inset, y, 66 - inset, y);
      }
      g.fillStyle(0x5b2d1a).fillRect(14, 36, 52, 8);                   // Plattform
      g.lineStyle(3, 0x6b4220).strokeRect(18, 16, 44, 20);               // Geländer
      g.fillStyle(0x5b2d1a).fillTriangle(10, 18, 40, 0, 70, 18);         // Dächlein
      g.fillStyle(0xdddddd).fillRect(39, 0, 2, 2);
    });
  }
}

/* ---------------------------------------------------------------------
 * Restaurant Albishorn samt Aussichtsturm und Schweizerfahne.
 * Wird im Level 5 (Kartenzeichen 'A') und im Geburtstags-Finale benutzt.
 * (x, bottom) = Mitte der Unterkante des Restaurants.
 * ------------------------------------------------------------------- */
function addRestaurant(scene, x, bottom, depth = 1, scale = 1) {
  const parts = [];
  parts.push(scene.add.image(x + 150 * scale, bottom, 'tower').setOrigin(0.5, 1).setScale(scale).setDepth(depth - 0.1));
  parts.push(scene.add.image(x, bottom, 'restaurant').setOrigin(0.5, 1).setScale(scale).setDepth(depth));
  parts.push(scene.add.text(x, bottom - 117 * scale, 'RESTAURANT\nALBISHORN', {
    fontFamily: FONT, fontSize: `${Math.max(5, Math.round(6 * scale))}px`, color: '#5b2d1a', align: 'center', lineSpacing: 1
  }).setOrigin(0.5).setDepth(depth));

  // Wehende Schweizerfahne auf dem Turmdach (Textur enthält schon den Mast)
  const flag = scene.add.image(x + 150 * scale, bottom - 236 * scale, 'flag_on')
    .setOrigin(7 / 32, 1).setScale(scale).setDepth(depth);
  scene.tweens.add({ targets: flag, scaleX: scale * 0.8, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  parts.push(flag);
  return parts;
}

/* ---------------------------------------------------------------------
 * Erwachsene Figur als Sprite (Tante Edith / Onkel Kurt / Sven ohne Tochter).
 * ------------------------------------------------------------------- */
function addPerson(scene, name, x, bottom, scale = 2) {
  return scene.add.sprite(x, bottom, `person_${name}`, 0).setOrigin(PEOPLE[name].originX, 1).setScale(scale);
}

/** Ginny, die getigerte Katze (Frame 0 = sitzen, Animation 'cat_ginny-walk'). */
function addGinny(scene, x, bottom, scale = 2) {
  return scene.add.sprite(x, bottom, 'cat_ginny', 0).setOrigin(0.5, 1).setScale(scale);
}

/* ---------------------------------------------------------------------
 * Sven mit der Kraxe und seiner Tochter darin.
 *   const sv = addSvenWithDaughter(scene, x, bottom, scale, depth);
 *   sv.update(time)            jeden Frame aufrufen (Tochter folgt & wippt)
 *   sv.setBob(amp, perSecond)  wie stark (Rasterpunkte) / schnell sie wippt
 *   sv.addHat()                Partyhütchen für die Tochter
 * Die Tochter liegt HINTER Sven, damit die Bügel der Kraxe vor ihr sind.
 * ------------------------------------------------------------------- */
function addSvenWithDaughter(scene, x, bottom, scale = 2, depth = 5) {
  const sven = addPerson(scene, 'sven', x, bottom, scale).setDepth(depth);
  const daughter = scene.add.image(0, 0, 'svenDaughter').setOrigin(0, 0).setScale(scale).setDepth(depth - 0.1);
  const pixel = 2 * scale;                 // Weltpixel pro Rasterpunkt
  const group = {
    sven, daughter, hat: null,
    bobAmp: 0.5, bobSpeed: 1.2,
    setBob(amp, speed) { this.bobAmp = amp; this.bobSpeed = speed; return this; },
    addHat() {
      this.hat = scene.add.image(0, 0, 'partyHat').setOrigin(0.5, 1).setScale(scale * 0.45)
        .setDepth(depth + 0.1).setAngle(-15);
      return this;
    },
    update(time) {
      const left = sven.x - sven.originX * sven.displayWidth;
      const top = sven.y - sven.displayHeight;
      const bob = -Math.abs(Math.sin(time / 1000 * Math.PI * this.bobSpeed)) * this.bobAmp * pixel;
      daughter.setPosition(left + DAUGHTER.col * pixel, top + DAUGHTER.row * pixel + bob);
      if (this.hat) this.hat.setPosition(daughter.x + 4 * pixel, daughter.y + pixel);
    }
  };
  group.update(0);
  return group;
}
