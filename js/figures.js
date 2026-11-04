/* =====================================================================
 * figures.js – Die Familie im Comic-Stil
 *
 * Jede Figur ist eine Vektorzeichnung aus einem kleinen "Skelett": Hüfte,
 * Schultern, Kopf und Gelenkwinkel je Pose (POSES). Daraus entstehen die
 * Laufbilder – und dieselbe Zeichnung, nur grösser, wird zu Porträt und
 * Passwort-Avatar. So sehen die Figuren überall gleich aus.
 *
 *   hiker1 / hiker2       Jessica & Simon (24×32, 4 Frames: stehen, 2× gehen, Sprung)
 *   person_<name>         Erwachsene (32×48, Sven 40×48; Frames: stehen, winken, 2× gehen)
 *   svenDaughter          Hannah (16×26), eigenes Sprite für die Kraxe
 *   cat_ginny             Katze Ginny (32×24, Frames: sitzen, 2× laufen)
 *   portrait_<name>       Dialog-Porträts (72×72)
 *   avatar_<name>         Passwort-Köpfe (60×60)
 *
 * Alle schauen nach rechts (Licht von oben rechts); nach links per setFlipX.
 * Grössen und Frame-Nummern sind fest: Physik und Szenen hängen davon ab.
 * ===================================================================== */

const FIGURE_SS = 4;   // Pixeldichte der Laufbilder (Figuren werden bis 3× vergrössert gezeigt)

// Gelenkwinkel in Grad (0 = hängt senkrecht, positiv = nach vorne):
// Bein [Oberschenkel, Schienbein], Arm [Oberarm, Unterarm]
const POSES = {
  idle:  { legN: [5, 2], legF: [-7, -9], armN: [-6, 8], armF: [12, 22] },
  wave:  { legN: [5, 2], legF: [-7, -9], armN: [-6, 8], armF: [128, 168], smile: 1 },
  walk1: { legN: [30, 6], legF: [-22, -58], armN: [-30, -12], armF: [30, 62], bob: -0.3 },
  walk2: { legN: [-22, -58], legF: [30, 6], armN: [32, 64], armF: [-26, -8], bob: -0.3 },
  jump:  { legN: [62, 2], legF: [-12, -66], armN: [-48, -28], armF: [138, 172], bob: -0.4, smile: 1 }
};

const CHAR_POSES = ['idle', 'walk1', 'walk2', 'jump'];     // Frame 0..3 von Jessica & Simon
const PERSON_POSES = ['idle', 'wave', 'walk1', 'walk2'];   // Frame 0..3 der Erwachsenen

// Frame-Nummern von Jessica & Simon
const CHAR_FRAMES = {
  hiker1: { idle: 0, jump: 3, fall: 3, run: [1, 0, 2, 0], runRate: 10 },
  hiker2: { idle: 0, jump: 3, fall: 3, run: [1, 0, 2, 0], runRate: 10 }
};
/** Frame-Nummer für eine Pose ('idle', 'jump', 'fall') einer Spielfigur. */
function charFrame(key, pose) {
  const f = CHAR_FRAMES[key];
  return f && f[pose] !== undefined ? f[pose] : 0;
}

// Körperbau: Erwachsene (32×48) und die beiden Wanderer (24×32, grösserer Kopf)
const BUILD_ADULT = {
  W: 32, H: 48, cx: 16, r: 6.9, hy: 10, sy: 18.4, hipY: 29.8, ground: 47.3,
  torso: 5.6, leg: 3.4, arm: 2.6, upperArm: 6.2, foreArm: 6, lw: 0.75
};
const BUILD_HIKER = {
  W: 24, H: 32, cx: 12.5, r: 5.5, hy: 10.2, sy: 16, hipY: 22.2, ground: 31.3,
  torso: 4.3, leg: 2.9, arm: 2.2, upperArm: 3.7, foreArm: 3.4, lw: 0.62
};

const Figures = {
  // ---------------------------------------------------------------------
  // Skelett
  // ---------------------------------------------------------------------
  /** Geometrie einer Figur für eine Pose. */
  rig(b, pose) {
    const bob = pose.bob || 0;
    const legLen = (b.ground - b.footH - b.hipY) / 2;
    const toward = ([x, y], deg, len) => [x + Math.sin(deg * Math.PI / 180) * len, y + Math.cos(deg * Math.PI / 180) * len];
    const hip = [b.cx, b.hipY + bob];
    const limb = (start, [a1, a2], l1, l2) => {
      const joint = toward(start, a1, l1);
      return [start, joint, toward(joint, a2, l2)];
    };
    const shoulderN = [b.cx - b.torso * 0.35, b.sy + 1 + bob], shoulderF = [b.cx + b.torso * 0.55, b.sy + 1 + bob];
    return {
      b, pose, bob, cx: b.cx, r: b.r, lw: b.lw,
      hx: b.cx + 0.6, hy: b.hy + bob, sy: b.sy + bob, hipY: b.hipY + bob,
      legN: limb([hip[0] - 1, hip[1]], pose.legN, legLen, legLen),
      legF: limb([hip[0] + 1.4, hip[1]], pose.legF, legLen, legLen),
      armN: limb(shoulderN, pose.armN, b.upperArm, b.foreArm),
      armF: limb(shoulderF, pose.armF, b.upperArm, b.foreArm)
    };
  },

  /** Arm oder Bein: Tusche-Rand, Grundfarbe, Schattenstreifen auf der lichtabgewandten Seite. */
  segment(ctx, pts, width, color, shade, lw) {
    Comic.limb(ctx, pts, width, color, lw);
    Comic.poly(ctx, pts.map(([x, y]) => [x - width * 0.26, y]), false);
    ctx.strokeStyle = shade;
    ctx.lineWidth = width * 0.42;
    ctx.stroke();
  },

  /** Wanderschuh: runder Schaft, Sohle, Schnürung. */
  boot(ctx, g, ankle, c, angle = 0) {
    const s = g.b.footH, lw = g.lw;
    ctx.save();
    ctx.translate(ankle[0], ankle[1]);
    ctx.rotate(angle);
    Comic.blob(ctx, [[-s * 0.72, -s * 0.5], [s * 0.62, -s * 0.55], [s * 0.72, s * 0.15], [s * 1.7, s * 0.25], [s * 1.75, s * 1.02], [-s * 0.95, s * 1.02]]);
    Comic.cel(ctx, c.shoe, x => {
      Comic.fillRect(x, -s * 2, s * 0.05 + s * -0.45, s * 4, c.shoeDark);
      Comic.fillRect(x, -s, s * 4, s, c.shoe);
    }, lw);
    Comic.line(ctx, [[-s * 0.9, s * 0.72], [s * 1.68, s * 0.72]], lw * 0.9);      // Sohle
    if (c.lace) {
      ctx.strokeStyle = c.lace; ctx.lineWidth = lw * 0.6;
      ctx.beginPath(); ctx.moveTo(s * 0.1, -s * 0.2); ctx.lineTo(s * 0.8, -s * 0.05); ctx.moveTo(s * 0.35, s * 0.2); ctx.lineTo(s * 1.05, s * 0.3); ctx.stroke();
    }
    ctx.restore();
  },

  hand(ctx, g, p, c) {
    Comic.ellipse(ctx, p[0], p[1], g.b.arm * 0.62, g.b.arm * 0.62);
    Comic.ink(ctx, c.skin, g.lw * 0.9);
  },

  // ---------------------------------------------------------------------
  // Körper
  // ---------------------------------------------------------------------
  torsoPath(ctx, g, extra = 0) {
    const { cx, sy, hipY } = g, w = g.b.torso + extra;
    Comic.blob(ctx, [[cx - w * 0.92, sy - 1.3], [cx + w * 0.95, sy - 1.3], [cx + w * 1.12, sy + (hipY - sy) * 0.5], [cx + w * 0.96, hipY + 1.6],
      [cx - w * 0.96, hipY + 1.6], [cx - w * 1.1, sy + (hipY - sy) * 0.5]]);
  },

  /** Ganze Figur zeichnen. spec = Aussehen, pose = Eintrag aus POSES. */
  draw(ctx, spec, poseName, opts = {}) {
    const pose = POSES[poseName] || POSES.idle;
    const g = this.rig(spec.build, pose);
    const c = spec.colors;
    g.smile = pose.smile;
    if (spec.back && !opts.noBack) spec.back(ctx, g, c);

    // Hinterer Arm und hinteres Bein (etwas dunkler, sie liegen im Schatten)
    this.segment(ctx, g.armF, g.b.arm, c.sleeveDark || c.sleeve, c.sleeveDark || c.sleeve, g.lw);
    if (spec.bareForearm) this.bareArm(ctx, g, g.armF, c, spec.bareForearm);
    this.hand(ctx, g, g.armF[2], c);
    this.leg(ctx, g, g.legF, c, spec, true);
    this.leg(ctx, g, g.legN, c, spec, false);

    // Rumpf
    this.torsoPath(ctx, g, spec.belly || 0);
    Comic.cel(ctx, c.top, x => {
      const w = g.b.torso + (spec.belly || 0);
      Comic.fillRect(x, g.cx - w * 2, g.sy - 4, w * 2 - w * 0.45, g.hipY - g.sy + 8, c.topDark);
      if (spec.torsoDetail) spec.torsoDetail(x, g, c);
    }, g.lw);
    if (spec.front) spec.front(ctx, g, c);

    if (spec.hairBack) spec.hairBack(ctx, g, c);
    this.head(ctx, g, spec);

    // Vorderer Arm
    this.segment(ctx, g.armN, g.b.arm, c.sleeve, c.sleeveDark || c.sleeve, g.lw);
    if (spec.bareForearm) this.bareArm(ctx, g, g.armN, c, spec.bareForearm);
    this.hand(ctx, g, g.armN[2], c);
    if (spec.over) spec.over(ctx, g, c);
  },

  /** Kurzarm: ab dem Ellbogen (oder ein Stück davor) sieht man die Haut. */
  bareArm(ctx, g, arm, c, from) {
    const [a, b, d] = arm, t = from;
    const start = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    this.segment(ctx, [start, b, d], g.b.arm * 0.92, c.skin, c.skinDark, g.lw);
  },

  leg(ctx, g, leg, c, spec, far) {
    const [hip, knee, ankle] = leg;
    const pants = far ? (c.pantsDark || c.pants) : c.pants;
    if (spec.bareShin) {
      // Kurze Hose: ab der Mitte des Beins Haut und Socke
      const t = spec.bareShin;
      const split = [knee[0] + (ankle[0] - knee[0]) * t, knee[1] + (ankle[1] - knee[1]) * t];
      this.segment(ctx, [split, ankle], g.b.leg * 0.8, c.sock || c.skin, c.sock || c.skinDark, g.lw);
      if (spec.skinBelowKnee) this.segment(ctx, [knee, split], g.b.leg * 0.8, c.skin, c.skinDark, g.lw);
      this.segment(ctx, spec.skinBelowKnee ? [hip, knee] : [hip, knee, split], g.b.leg, pants, c.pantsDark || pants, g.lw);
    } else {
      this.segment(ctx, leg, g.b.leg, pants, c.pantsDark || pants, g.lw);
    }
    const dx = ankle[0] - knee[0], dy = ankle[1] - knee[1];
    const lifted = ankle[1] < g.b.ground - g.b.footH - 1.2;
    this.boot(ctx, g, ankle, c, lifted ? Math.atan2(dx, dy) * -0.7 : 0);
  },

  // ---------------------------------------------------------------------
  // Kopf
  // ---------------------------------------------------------------------
  head(ctx, g, spec) {
    const c = spec.colors, { hx, hy, r } = g;
    const lw = g.lw;
    if (spec.headBack) spec.headBack(ctx, g, c);

    // Hals
    Comic.limb(ctx, [[hx - r * 0.12, hy + r * 0.7], [hx - r * 0.2, g.sy - 0.5]], r * 0.46, c.skinDark, lw);
    // Ohr
    Comic.ellipse(ctx, hx - r * 0.74, hy + r * 0.12, r * 0.2, r * 0.27);
    Comic.ink(ctx, c.skin, lw * 0.85);

    // Gesicht: runder Schädel, Kinn leicht nach vorne
    const facePts = [[hx - r * 0.85, hy - r * 0.6], [hx + r * 0.2, hy - r * 1.12], [hx + r * 1.0, hy - r * 0.55], [hx + r * 1.04, hy + r * 0.45],
      [hx + r * 0.62, hy + r * 1.02], [hx - r * 0.2, hy + r * 1.05], [hx - r * 0.88, hy + r * 0.55]];
    Comic.blob(ctx, facePts);
    Comic.cel(ctx, c.skin, x => {
      Comic.blob(x, [[hx - r * 1.4, hy - r], [hx - r * 0.52, hy - r * 0.5], [hx - r * 0.34, hy + r * 0.55], [hx + r * 0.3, hy + r * 0.98], [hx - r * 1.2, hy + r * 1.4]]);
      x.fillStyle = c.skinDark;
      x.fill();
    }, lw);

    this.face(ctx, g, spec);
    if (spec.hair) spec.hair(ctx, g, c);
  },

  face(ctx, g, spec) {
    const c = spec.colors, { hx, hy, r } = g, lw = g.lw;
    const ex = [hx + r * 0.1, hx + r * 0.66], ey = hy - r * 0.04;
    // Wangen
    if (c.cheek) {
      ctx.fillStyle = c.cheek;
      Comic.ellipse(ctx, hx - r * 0.1, hy + r * 0.42, r * 0.26, r * 0.17); ctx.fill();
      Comic.ellipse(ctx, hx + r * 0.8, hy + r * 0.42, r * 0.15, r * 0.15); ctx.fill();
    }
    // Augen: Weiss, Iris, Pupille, Glanzpunkt, kräftiges Oberlid
    ex.forEach((x, i) => {
      const w = r * (i ? 0.18 : 0.23), h = r * 0.3;
      Comic.ellipse(ctx, x, ey, w, h);
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.strokeStyle = Comic.INK; ctx.lineWidth = lw * 0.5; ctx.stroke();
      Comic.ellipse(ctx, x + w * 0.28, ey + h * 0.12, w * 0.68, h * 0.68);
      ctx.fillStyle = c.eye; ctx.fill();
      Comic.ellipse(ctx, x + w * 0.34, ey + h * 0.16, w * 0.36, h * 0.38);
      ctx.fillStyle = Comic.INK; ctx.fill();
      Comic.ellipse(ctx, x + w * 0.05, ey - h * 0.22, w * 0.22, w * 0.22);
      ctx.fillStyle = '#ffffff'; ctx.fill();
      Comic.curve(ctx, [[x - w * 1.08, ey - h * 0.35], [x, ey - h * 1.2], [x + w * 1.08, ey - h * 0.35]]);
      ctx.strokeStyle = Comic.INK; ctx.lineWidth = lw * 0.95; ctx.stroke();
    });
    // Brauen
    const brow = c.brow || Comic.INK;
    [[ex[0], r * 0.28], [ex[1], r * 0.2]].forEach(([x, w]) => {
      Comic.curve(ctx, [[x - w, ey - r * 0.46], [x, ey - r * 0.6], [x + w, ey - r * 0.48]]);
      ctx.strokeStyle = brow; ctx.lineWidth = lw * 1.05; ctx.stroke();
    });
    // Nase
    Comic.curve(ctx, [[hx + r * 0.46, hy + r * 0.12], [hx + r * 0.68, hy + r * 0.34], [hx + r * 0.42, hy + r * 0.4]]);
    ctx.strokeStyle = c.line || '#8a4a34'; ctx.lineWidth = lw * 0.8; ctx.stroke();
    // Mund
    const mx = hx + r * 0.36, my = hy + r * 0.62;
    const expr = g.smile && spec.mouth !== 'laugh' && spec.mouth !== 'grin' ? 'grin' : spec.mouth || 'smile';
    if (expr === 'smile' || expr === 'subtle') {
      const d = expr === 'smile' ? 0.3 : 0.16;
      Comic.curve(ctx, [[mx - r * 0.34, my - r * 0.04], [mx, my + r * d], [mx + r * 0.36, my - r * 0.06]]);
      ctx.strokeStyle = Comic.INK; ctx.lineWidth = lw * 0.9; ctx.stroke();
    } else {
      const big = expr === 'laugh' ? 1.15 : 1;
      ctx.beginPath();
      ctx.moveTo(mx - r * 0.42 * big, my - r * 0.1);
      ctx.quadraticCurveTo(mx, my - r * 0.02, mx + r * 0.42 * big, my - r * 0.1);
      ctx.quadraticCurveTo(mx + r * 0.3, my + r * 0.42 * big, mx, my + r * 0.42 * big);
      ctx.quadraticCurveTo(mx - r * 0.3, my + r * 0.42 * big, mx - r * 0.42 * big, my - r * 0.1);
      ctx.closePath();
      Comic.cel(ctx, '#7a1f2c', x => {
        Comic.fillRect(x, mx - r, my - r * 0.3, r * 2, r * 0.3, '#ffffff');      // Zähne
        Comic.ellipse(x, mx, my + r * 0.42, r * 0.22, r * 0.16); x.fillStyle = '#e8707a'; x.fill();   // Zunge
      }, lw * 0.85);
    }
  },

  // ---------------------------------------------------------------------
  // Texturen
  // ---------------------------------------------------------------------
  createAll(scene) {
    // Jessica & Simon
    ['hiker1', 'hiker2'].forEach(key => {
      const spec = FIGURE_SPECS[key], { W, H } = spec.build;
      Comic.tex(scene, key, W * CHAR_POSES.length, H, ctx => {
        CHAR_POSES.forEach((pose, i) => this.frame(ctx, i * W, W, H, () => this.draw(ctx, spec, pose)));
      }, { ss: FIGURE_SS, frames: [W, H, CHAR_POSES.length] });
    });

    // Erwachsene
    Object.keys(PEOPLE).forEach(name => {
      const spec = FIGURE_SPECS[name], { W, H } = spec.build;
      Comic.tex(scene, `person_${name}`, W * PERSON_POSES.length, H, ctx => {
        PERSON_POSES.forEach((pose, i) => this.frame(ctx, i * W, W, H, () => this.draw(ctx, spec, pose)));
      }, { ss: FIGURE_SS, frames: [W, H, PERSON_POSES.length] });
    });

    Comic.tex(scene, 'svenDaughter', 16, 26, ctx => this.hannah(ctx), { ss: FIGURE_SS });
    Comic.tex(scene, 'cat_ginny', 96, 24, ctx => {
      ['sit', 'walk1', 'walk2'].forEach((pose, i) => this.frame(ctx, i * 32, 32, 24, () => this.ginny(ctx, pose)));
    }, { ss: FIGURE_SS, frames: [32, 24, 3] });

    this.createPortraits(scene);
    this.createAvatars(scene);
  },

  /** Ein Frame im Spritesheet: verschoben und auf seine Fläche begrenzt. */
  frame(ctx, x, w, h, draw) {
    ctx.save();
    ctx.translate(x, 0);
    ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
    draw();
    ctx.restore();
  },

  /** Kopf + Schultern einer Figur gross auf (cx, cy) zeichnen, Kopfradius = size. */
  bust(ctx, spec, cx, cy, size, opts) {
    const b = spec.build, s = size / b.r;
    ctx.save();
    ctx.translate(cx - (b.cx + 0.6) * s, cy - b.hy * s);
    ctx.scale(s, s);
    this.draw(ctx, spec, 'idle', opts);
    ctx.restore();
  },

  createPortraits(scene) {
    const bg = (ctx, color) => {
      Comic.fillRect(ctx, 0, 0, 72, 72, color);
      Comic.halftone(ctx, 0, 0, 72, 72, 'rgba(255,255,255,0.3)', 5, (u, v) => 1 - v * 0.9);
    };
    Object.entries({ edith: '#8fb7e0', kurt: '#9bc7a4', angi: '#f2b4cf', sven: '#f0cf7a', hiker1: '#7fb2ee', hiker2: '#ee9a8e' }).forEach(([key, color]) => {
      Comic.tex(scene, `portrait_${key}`, 72, 72, ctx => {
        bg(ctx, color);
        if (key === 'sven') {
          // Sven mit Hannah, die über seine Schulter schaut
          const size = 15, s = size / FIGURE_SPECS.sven.build.r;
          ctx.save(); ctx.translate(2, 33); ctx.scale(s * 0.86, s * 0.86); this.hannah(ctx); ctx.restore();
          this.bust(ctx, FIGURE_SPECS.sven, 45, 30, size, { noBack: true });
        } else {
          this.bust(ctx, FIGURE_SPECS[key], 34, 31, 20);
        }
      });
    });
  },

  /** Avatare fürs Passwort (AVATARS in config.js): nur die Köpfe, transparent. */
  createAvatars(scene) {
    const SIZE = 60;
    AVATARS.forEach(({ key }) => {
      const specKey = { jessica: 'hiker1', simon: 'hiker2' }[key] || key;
      Comic.tex(scene, `avatar_${key}`, SIZE, SIZE, ctx => {
        ctx.beginPath(); ctx.rect(0, 0, SIZE, SIZE); ctx.clip();
        if (key === 'hannah') {
          ctx.save(); ctx.translate(2, 2); ctx.scale(3.5, 3.5); this.hannah(ctx); ctx.restore();
        } else if (key === 'ginny') {
          ctx.save(); ctx.translate(-30, 2); ctx.scale(2.9, 2.9); this.ginny(ctx, 'sit'); ctx.restore();
        } else {
          this.bust(ctx, FIGURE_SPECS[specKey], 28, 28, 20, { noBack: true });
        }
      });
    });
  },

  // ---------------------------------------------------------------------
  // Hannah & Ginny
  // ---------------------------------------------------------------------
  /** Hannah (16×26): altrosa Mütze, blonde Strähne, graue Jacke, rosa Hose – schaut nach links. */
  hannah(ctx) {
    const lw = 0.6, C = FIGURE_SPECS.hannahColors;
    ctx.save();
    ctx.translate(16, 0); ctx.scale(-1, 1);   // gezeichnet nach rechts, schaut nach links
    // Beine
    [[6, 1], [10, 0]].forEach(([x, far]) => {
      Comic.limb(ctx, [[x, 17], [x + 0.3, 22.5]], 2.8, far ? '#c94689' : C.pants, lw);
      Comic.limb(ctx, [[x + 0.3, 23.6], [x + 1.2, 24]], 2.6, '#f4f6fb', lw);
    });
    // Jacke & Arme
    Comic.blob(ctx, [[3.6, 12.2], [12.4, 12.2], [13.4, 15], [12.6, 18.8], [3.4, 18.8], [2.6, 15]]);
    Comic.cel(ctx, C.jacket, x => { Comic.fillRect(x, 0, 10, 6.6, 12, C.jacketDark); }, lw);
    Comic.limb(ctx, [[11.8, 13.2], [14, 15.6]], 2.1, C.jacket, lw);
    Comic.ellipse(ctx, 14.3, 16, 1.2, 1.2); Comic.ink(ctx, C.skin, lw * 0.9);
    // Kopf
    Comic.ellipse(ctx, 2.3, 7.8, 1.1, 1.4); Comic.ink(ctx, C.skin, lw * 0.85);
    Comic.blob(ctx, [[1.6, 4.4], [8.4, 1.6], [14.8, 4.6], [15, 9.5], [12, 12.8], [5, 13], [1.8, 10]]);
    Comic.cel(ctx, C.skin, x => {
      Comic.blob(x, [[0, 3], [4.6, 6], [5.4, 10], [9, 13], [0, 14]]); x.fillStyle = C.skinDark; x.fill();
    }, lw);
    Figures.miniFace(ctx, 8.4, 12.8, 7.9, 10.8);
    // Haarsträhne und Mütze mit Bündchen
    Comic.blob(ctx, [[1.8, 5.8], [4.8, 5.6], [4.2, 9.6], [2.2, 10.6]]);
    Comic.ink(ctx, '#ecc868', lw * 0.8);
    Comic.blob(ctx, [[1.6, 5.2], [3, 0.6], [8.4, -0.8], [13.8, 0.8], [15, 5.2]]);
    Comic.cel(ctx, C.hat, x => { Comic.fillRect(x, 0, 0, 5.6, 8, C.hatDark); }, lw);
    Comic.rr(ctx, 1.1, 3.8, 14.4, 2.4, 1.1);
    Comic.ink(ctx, C.hatDark, lw * 0.9);
    ctx.restore();
  },

  /** Kleines Kindergesicht: zwei Knopfaugen, Bäckchen, Mündchen. */
  miniFace(ctx, ex1, ex2, ey, mouthY) {
    [ex1, ex2].forEach(x => {
      Comic.ellipse(ctx, x, ey, 0.82, 1.1); ctx.fillStyle = Comic.INK; ctx.fill();
      Comic.ellipse(ctx, x - 0.2, ey - 0.4, 0.26, 0.26); ctx.fillStyle = '#ffffff'; ctx.fill();
    });
    ctx.fillStyle = 'rgba(240,110,120,0.55)';
    Comic.ellipse(ctx, ex1 - 1.5, ey + 2.1, 1.4, 0.85); ctx.fill();
    Comic.ellipse(ctx, ex2 + 1, ey + 2.1, 0.9, 0.8); ctx.fill();
    Comic.curve(ctx, [[ex1 + 0.8, mouthY - 0.2], [(ex1 + ex2) / 2 + 0.2, mouthY + 0.8], [ex2 - 0.6, mouthY - 0.3]]);
    ctx.strokeStyle = Comic.INK; ctx.lineWidth = 0.45; ctx.stroke();
  },

  /** Ginny (32×24): getigert, weisse Brust und Pfötchen, grüne Augen. */
  ginny(ctx, pose) {
    const lw = 0.7, fur = '#a87e52', dark = '#5e3f24', light = '#c9a274', white = '#f8f5ee';
    const sit = pose === 'sit';
    const legs = sit ? [[11, 20.5, 11, 23], [20, 18, 20.5, 23]] :
      pose === 'walk1' ? [[8, 18, 5.5, 23], [12, 18, 14.5, 23], [20, 18, 17.5, 23], [24, 18, 26, 23]] :
        [[8, 18, 10, 23], [12, 18, 10.5, 23], [20, 18, 22, 23], [24, 18, 22.5, 23]];

    // Schwanz
    const tail = sit ? [[7, 20], [2.5, 21], [2, 16.5], [3.6, 12.5]] : [[6, 15], [2.5, 14], [1.8, 9.5], [4, 6]];
    Comic.curve(ctx, tail);
    ctx.strokeStyle = Comic.INK; ctx.lineWidth = 3.8; ctx.stroke();
    Comic.curve(ctx, tail);
    ctx.strokeStyle = fur; ctx.lineWidth = 2.5; ctx.stroke();
    [[1.3, 14.4, 3.7, 15], [1.6, 11.4, 4, 12.6]].forEach(([a, b, c, d]) => Comic.line(ctx, [[a, b], [c, d]], 0.8, dark));

    // Hintere Beine, Körper, vordere Pfoten
    legs.slice(sit ? 0 : 2).forEach(([x1, y1, x2, y2]) => {
      if (sit) return;
      Comic.limb(ctx, [[x1, y1], [x2, y2]], 2.2, fur, lw);
    });
    if (sit) {
      Comic.blob(ctx, [[5.5, 21.5], [6, 13], [13, 10], [22.5, 12], [24, 23.4], [6, 23.4]]);
    } else {
      Comic.blob(ctx, [[5, 15], [10, 10.8], [22, 10.4], [27, 13], [26, 18.6], [7, 19.2]]);
    }
    Comic.cel(ctx, fur, x => {
      Comic.fillRect(x, 0, sit ? 17 : 15.5, 32, 10, dark + '00');
      Comic.blob(x, sit ? [[0, 18], [14, 20], [24, 23], [24, 26], [0, 26]] : [[0, 16], [14, 17.5], [28, 16.5], [28, 22], [0, 22]]);
      x.fillStyle = '#8a6440'; x.fill();
      // Tigerstreifen
      x.strokeStyle = dark; x.lineWidth = 1.05; x.lineCap = 'round';
      x.beginPath();
      (sit ? [7.5, 10.5, 13.5, 16.5] : [8, 11.5, 15, 18.5, 22]).forEach((sx, i) => {
        x.moveTo(sx, sit ? 11.5 : 10.5);
        x.quadraticCurveTo(sx + 1.2, 14.5, sx - 0.2, sit ? 18 : 15.5 + (i % 2));
      });
      x.stroke();
    }, lw);
    // Weisse Brust
    Comic.blob(ctx, sit ? [[18.5, 13], [24, 12], [25, 19], [22.5, 23], [18.5, 21]] : [[21.5, 13], [27, 12.5], [27.5, 17.5], [24, 19]]);
    Comic.ink(ctx, white, 0);
    // Vordere Beine mit weissen Pfötchen
    legs.slice(0, 2).forEach(([x1, y1, x2, y2]) => {
      Comic.limb(ctx, [[x1, y1], [x2, y2]], 2.3, sit ? white : fur, lw);
      Comic.ellipse(ctx, x2 + 0.3, y2 - 0.1, 1.6, 0.95); Comic.ink(ctx, white, lw * 0.9);
    });
    if (!sit) legs.slice(2).forEach(([, , x2, y2]) => { Comic.ellipse(ctx, x2 + 0.3, y2 - 0.1, 1.6, 0.95); Comic.ink(ctx, white, lw * 0.9); });

    // Kopf
    const hx = sit ? 22 : 25.2, hy = sit ? 7.8 : 7.4;
    [[-5, -3.2, -5.2, -8.8, -0.8, -5.2], [1, -5.2, 5.2, -8.8, 5, -3.2]].forEach(([a, b, c, d, e, f]) => {
      Comic.poly(ctx, [[hx + a, hy + b], [hx + c, hy + d], [hx + e, hy + f]]);
      Comic.ink(ctx, fur, lw);
    });
    Comic.poly(ctx, [[hx - 4, hy - 3.8], [hx - 4.4, hy - 7], [hx - 1.8, hy - 5]]); ctx.fillStyle = '#e8a0a8'; ctx.fill();
    Comic.poly(ctx, [[hx + 4, hy - 3.8], [hx + 4.4, hy - 7], [hx + 1.8, hy - 5]]); ctx.fillStyle = '#e8a0a8'; ctx.fill();
    Comic.ellipse(ctx, hx, hy, 6, 5.3);
    Comic.cel(ctx, fur, x => {
      Comic.ellipse(x, hx, hy + 3.2, 3.7, 2.9); x.fillStyle = white; x.fill();
      x.strokeStyle = dark; x.lineWidth = 0.95;
      x.beginPath();
      [-2.4, 0, 2.4].forEach(d => { x.moveTo(hx + d, hy - 5.4); x.lineTo(hx + d * 0.8, hy - 2.8); });
      x.moveTo(hx - 5.8, hy + 0.2); x.lineTo(hx - 3.8, hy + 0.5);
      x.moveTo(hx + 5.8, hy + 0.2); x.lineTo(hx + 3.8, hy + 0.5);
      x.stroke();
    }, lw);
    // Grüne Augen, Nase, Schnurrhaare
    [-2.3, 2.3].forEach(d => {
      Comic.ellipse(ctx, hx + d, hy - 0.5, 1.45, 1.6); Comic.ink(ctx, '#7bdc52', 0.45);
      Comic.ellipse(ctx, hx + d, hy - 0.5, 0.5, 1.3); ctx.fillStyle = Comic.INK; ctx.fill();
      Comic.ellipse(ctx, hx + d - 0.4, hy - 1, 0.35, 0.35); ctx.fillStyle = '#ffffff'; ctx.fill();
    });
    Comic.poly(ctx, [[hx - 0.8, hy + 1.6], [hx + 0.8, hy + 1.6], [hx, hy + 2.5]]); ctx.fillStyle = '#e8707a'; ctx.fill();
    Comic.curve(ctx, [[hx - 1.3, hy + 3.2], [hx - 0.5, hy + 3.7], [hx, hy + 2.6], [hx + 0.5, hy + 3.7], [hx + 1.3, hy + 3.2]]);
    ctx.strokeStyle = Comic.INK; ctx.lineWidth = 0.4; ctx.stroke();
    ctx.strokeStyle = 'rgba(23,18,31,0.65)'; ctx.lineWidth = 0.3;
    ctx.beginPath();
    [[-2, -6.8, 1.8], [-2, -7, 3.2], [2, 6.8, 1.8], [2, 7, 3.2]].forEach(([a, b, c]) => { ctx.moveTo(hx + a, hy + 2.4); ctx.lineTo(hx + b, hy + c); });
    ctx.stroke();
  }
};
Object.keys(POSES);   // (nur Dokumentation: alle Posen stehen oben)

// =====================================================================
// AUSSEHEN DER FIGUREN (nach den Bildvorlagen)
// =====================================================================
const hair = {
  /** Kurzes Haar: Kappe über dem Schädel, Koteletten. colors.hair / hairDark / hairLight */
  short(ctx, g, c, tufts = 3) {
    const { hx, hy, r } = g;
    Comic.blob(ctx, [[hx - r * 1.04, hy + r * 0.1], [hx - r * 1.08, hy - r * 0.86], [hx + r * 0.2, hy - r * 1.36], [hx + r * 1.16, hy - r * 0.78],
      [hx + r * 1.04, hy - r * 0.32], [hx + r * 0.36, hy - r * 0.7], [hx - r * 0.42, hy - r * 0.5], [hx - r * 0.56, hy + r * 0.2]]);
    Comic.cel(ctx, c.hair, x => {
      Comic.blob(x, [[hx - r * 1.3, hy], [hx - r * 1.2, hy - r], [hx - r * 0.1, hy - r * 0.86], [hx - r * 0.4, hy + r * 0.4]]);
      x.fillStyle = c.hairDark; x.fill();
      x.strokeStyle = c.hairLight; x.lineWidth = g.lw * 0.9;
      x.beginPath();
      for (let i = 0; i < tufts; i++) {
        const dx = i * r * 0.32 - r * 0.1;
        x.moveTo(hx + dx, hy - r * 1.1); x.quadraticCurveTo(hx + dx + r * 0.3, hy - r * 0.95, hx + dx + r * 0.32, hy - r * 0.7);
      }
      x.stroke();
    }, g.lw);
  }
};

const FIGURE_SPECS = {
  // Jessica: blaue Strickmütze mit Bommel, lange blonde Haare, goldene Kreolen,
  // dunkle Outdoor-Jacke mit Reissverschluss, dunkelblaue Cargo-Hose,
  // braune Schnürstiefel, blauer Rucksack mit Schulterriemen
  hiker1: {
    build: Object.assign({}, BUILD_HIKER, { footH: 2.2 }), mouth: 'smile',
    colors: {
      skin: '#f8d0ac', skinDark: '#dfa684', cheek: 'rgba(240,120,120,0.45)', eye: '#3a6fc0', brow: '#a87a28',
      top: '#3b3546', topDark: '#28242f', sleeve: '#3b3546', sleeveDark: '#28242f',
      pants: '#2a3f78', pantsDark: '#1b2a56', shoe: '#7a4a22', shoeDark: '#54300f', lace: '#e8d4ac',
      hair: '#f0c75e', hairDark: '#c8932f', hairLight: '#fbe7a4'
    },
    back: (ctx, g, c) => backpack(ctx, g, '#2f68b4', '#1f487e', '#5b93dc'),
    hairBack(ctx, g, c) {
      const { hx, hy, r } = g;
      Comic.blob(ctx, [[hx - r * 0.3, hy - r * 0.2], [hx - r * 1.15, hy - r * 0.2], [hx - r * 1.34, hy + r * 1.2], [hx - r * 1.3, hy + r * 2.25], [hx - r * 0.42, hy + r * 2.1], [hx - r * 0.2, hy + r * 1.05]]);
      Comic.cel(ctx, c.hair, x => {
        Comic.fillRect(x, hx - r * 2, hy - r, r * 1.1, r * 4, c.hairDark);
        x.strokeStyle = c.hairDark; x.lineWidth = g.lw * 0.7;
        Comic.curve(x, [[hx - r * 0.7, hy], [hx - r * 0.9, hy + r], [hx - r * 0.8, hy + r * 2]]); x.stroke();
      }, g.lw);
    },
    torsoDetail(x, g) {
      Comic.line(x, [[g.cx + 1.4, g.sy - 1], [g.cx + 1.2, g.hipY + 1]], 0.85, '#a8c8f4');   // Reissverschluss
      Comic.line(x, [[g.cx - 3.6, g.hipY - 0.8], [g.cx + 4.4, g.hipY - 0.8]], 0.5, '#17121f');
    },
    front(ctx, g) { Comic.line(ctx, [[g.cx - 2, g.sy - 1], [g.cx - 2.7, g.hipY - 1.5]], 1, '#17233f'); },   // Riemen
    hair(ctx, g, c) {
      const { hx, hy, r } = g;
      // Stirnsträhnen unter der Mütze
      Comic.blob(ctx, [[hx - r * 0.86, hy - r * 0.7], [hx + r * 0.92, hy - r * 0.8], [hx + r * 1.0, hy - r * 0.38], [hx + r * 0.42, hy - r * 0.52], [hx - r * 0.34, hy - r * 0.22], [hx - r * 0.86, hy + r * 0.3]]);
      Comic.ink(ctx, c.hair, g.lw * 0.85);
      // Kreole
      Comic.ellipse(ctx, hx - r * 0.74, hy + r * 0.56, r * 0.17, r * 0.22);
      ctx.strokeStyle = '#f0b020'; ctx.lineWidth = g.lw * 0.85; ctx.stroke();
      beanie(ctx, g, '#2f6fd0', '#1f4c96', '#6aa4f4');
    }
  },

  // Simon: rote Cap mit Schirm, kurze braune Haare, Dreitagebart, offene dunkle
  // Jacke über olivgrünem T-Shirt, dunkle Hose, braune Wanderschuhe, dunkelroter Rucksack
  hiker2: {
    build: Object.assign({}, BUILD_HIKER, { footH: 2.2 }), mouth: 'smile',
    colors: {
      skin: '#eebb96', skinDark: '#cf9772', eye: '#5a3a1e', brow: '#4e3420',
      top: '#2e3632', topDark: '#1e2522', sleeve: '#2e3632', sleeveDark: '#1e2522',
      pants: '#2f2730', pantsDark: '#1e181f', shoe: '#7a5630', shoeDark: '#533819', lace: '#d8c098',
      hair: '#7a5232', hairDark: '#563620', hairLight: '#a07448'
    },
    back: (ctx, g) => backpack(ctx, g, '#a4262c', '#6e161c', '#cf4a4c'),
    torsoDetail(x, g) {
      // Offene Jacke: olivgrünes T-Shirt in der Mitte
      Comic.poly(x, [[g.cx - 0.2, g.sy - 2], [g.cx + 3.6, g.sy - 2], [g.cx + 3.4, g.hipY + 2], [g.cx + 0.2, g.hipY + 2]]);
      Comic.ink(x, '#76724f', 0.55);
      Comic.fillRect(x, g.cx - 0.2, g.sy - 2, 1.2, g.hipY - g.sy + 4, 'rgba(50,46,30,0.55)');
    },
    front(ctx, g) { Comic.line(ctx, [[g.cx - 2, g.sy - 1], [g.cx - 2.7, g.hipY - 1.5]], 1, '#4a0e12'); },
    hairBack(ctx, g, c) {
      const { hx, hy, r } = g;
      Comic.blob(ctx, [[hx - r * 0.98, hy - r * 0.2], [hx - r * 0.2, hy - r * 0.3], [hx - r * 0.32, hy + r * 0.9], [hx - r * 1.0, hy + r * 0.72]]);
      Comic.ink(ctx, c.hairDark, g.lw);
    },
    hair(ctx, g, c) {
      const { hx, hy, r } = g;
      // Dreitagebart als feines Raster
      ctx.save();
      Comic.blob(ctx, [[hx - r * 0.58, hy + r * 0.2], [hx - r * 0.16, hy + r * 0.56], [hx + r * 0.3, hy + r * 0.44], [hx + r * 0.92, hy + r * 0.4], [hx + r * 0.74, hy + r * 1.04], [hx - r * 0.2, hy + r * 1.08]]);
      ctx.clip();
      Comic.halftone(ctx, hx - r, hy, r * 2.2, r * 1.2, 'rgba(70,44,28,0.75)', r * 0.2);
      ctx.restore();
      Comic.curve(ctx, [[hx - r * 0.0, hy + r * 0.58], [hx + r * 0.36, hy + r * 0.48], [hx + r * 0.72, hy + r * 0.56]]);
      Comic.blob(ctx, [[hx - r * 0.86, hy - r * 0.5], [hx - r * 0.5, hy - r * 0.6], [hx - r * 0.42, hy + r * 0.2], [hx - r * 0.76, hy + r * 0.12]]);
      Comic.ink(ctx, c.hair, g.lw * 0.8);
      cap(ctx, g, '#cf343c', '#8e1e26', '#f06a68', '#a02830');
    }
  },

  // Tante Edith: kurze weisse Haare, runde braune Brille, Halskette, weisses
  // Oberteil, schwarze Outdoorjacke, Jeans, Wanderschuhe – herzliches Lachen
  edith: {
    build: Object.assign({}, BUILD_ADULT, { footH: 2.4 }), mouth: 'laugh',
    colors: {
      skin: '#f4c9a0', skinDark: '#d9a27a', cheek: 'rgba(235,110,110,0.32)', eye: '#4a3020', brow: '#a8a4a0',
      top: '#2d2d35', topDark: '#1c1c22', sleeve: '#2d2d35', sleeveDark: '#1c1c22',
      pants: '#3c5a88', pantsDark: '#2a4068', shoe: '#6b3e1f', shoeDark: '#472810', lace: '#d9c8a6',
      hair: '#f2f3f5', hairDark: '#bcc2cc', hairLight: '#ffffff'
    },
    torsoDetail(x, g) {
      Comic.poly(x, [[g.cx - 1.4, g.sy - 2], [g.cx + 4.2, g.sy - 2], [g.cx + 3.2, g.hipY + 2], [g.cx - 0.8, g.hipY + 2]]);
      Comic.ink(x, '#fbfbfb', 0.6);
    },
    front(ctx, g) {
      Comic.curve(ctx, [[g.cx - 1.4, g.sy - 1.2], [g.cx + 1.3, g.sy + 2.8], [g.cx + 3.9, g.sy - 1.2]]);
      ctx.strokeStyle = '#e8c050'; ctx.lineWidth = 0.6; ctx.stroke();
      Comic.ellipse(ctx, g.cx + 1.3, g.sy + 3.3, 0.9, 1.1); Comic.ink(ctx, '#f0c850', 0.45);
    },
    hair(ctx, g, c) {
      hair.short(ctx, g, c, 4);
      glasses(ctx, g, '#7a4620');
    }
  },

  // Onkel Kurt: kurzes dunkles, meliertes Haar, graues Melange-T-Shirt, dunkle
  // Outdoorhose, robuste dunkle Wanderschuhe – dezentes Lächeln
  kurt: {
    build: Object.assign({}, BUILD_ADULT, { footH: 2.4 }), mouth: 'subtle', bareForearm: 0.6,
    colors: {
      skin: '#e3a97f', skinDark: '#c48a62', eye: '#3e2c1e', brow: '#3a3430', line: '#7a4028',
      top: '#8d8f97', topDark: '#6f7178', sleeve: '#8d8f97', sleeveDark: '#6f7178',
      pants: '#2c2e37', pantsDark: '#1d1e25', shoe: '#4c4638', shoeDark: '#312c22', lace: '#b8ae94',
      hair: '#3e3834', hairDark: '#2a2522', hairLight: '#a09a94'
    },
    torsoDetail(x, g) {
      // Melange: feine Sprenkel
      Comic.halftone(x, g.cx - 7, g.sy - 2, 14, 15, 'rgba(255,255,255,0.22)', 1.5, (u, v) => 0.5 + 0.5 * Comic.rnd(u * 91 + v * 37));
      Comic.curve(x, [[g.cx - 2.2, g.sy - 1.4], [g.cx + 0.6, g.sy + 1.4], [g.cx + 3.2, g.sy - 1.4]]);
      x.strokeStyle = '#55575e'; x.lineWidth = 0.6; x.stroke();
    },
    hair(ctx, g, c) { hair.short(ctx, g, c, 5); }
  },

  // Sven: dunkelgraue Basecap, olivgrünes T-Shirt, graue 3/4-Trekkinghose,
  // schwarze Socken, Wanderschuhe – und die grosse Kraxe auf dem Rücken
  sven: {
    build: Object.assign({}, BUILD_ADULT, { W: 40, cx: 27, footH: 2.4 }), mouth: 'smile', bareForearm: 0.6, bareShin: 0.5, skinBelowKnee: false,
    colors: {
      skin: '#ecb48c', skinDark: '#cd9168', eye: '#3e2c1e', brow: '#3a2818',
      top: '#5f7040', topDark: '#47552e', sleeve: '#5f7040', sleeveDark: '#47552e',
      pants: '#62626a', pantsDark: '#4a4a52', sock: '#1d1d22', shoe: '#5f5444', shoeDark: '#3f3628', lace: '#c8bea4',
      hair: '#4e3424', hairDark: '#34220f', hairLight: '#6e4e38'
    },
    back: (ctx, g) => kraxe(ctx, g),
    over(ctx, g) {
      // Tragegurt über der Schulter, Hüftgurt
      Comic.line(ctx, [[g.cx - 2, g.sy - 1], [g.cx + 1, g.sy + 3.5], [g.cx - 3, g.sy + 8]], 1.5, '#23252a');
    },
    torsoDetail(x, g) { Comic.fillRect(x, g.cx - 8, g.hipY - 1.6, 16, 2.2, '#23252a'); },
    hair(ctx, g, c) {
      const { hx, hy, r } = g;
      Comic.blob(ctx, [[hx - r * 0.9, hy - r * 0.6], [hx - r * 0.42, hy - r * 0.6], [hx - r * 0.42, hy + r * 0.25], [hx - r * 0.82, hy + r * 0.15]]);
      Comic.ink(ctx, c.hair, g.lw * 0.8);
      cap(ctx, g, '#585c6a', '#3e4150', '#7c8092', '#34374a');
    }
  },

  // Angi: blonde Haare mit Zopf über der Schulter, rosa Outdoorjacke,
  // dunkle Hose, Wanderschuhe – lacht
  angi: {
    build: Object.assign({}, BUILD_ADULT, { footH: 2.4 }), mouth: 'laugh',
    colors: {
      skin: '#f8d0ac', skinDark: '#dfa684', cheek: 'rgba(240,110,130,0.45)', eye: '#2a56a0', brow: '#b08a3a',
      top: '#ee6aa8', topDark: '#c5468a', sleeve: '#ee6aa8', sleeveDark: '#c5468a',
      pants: '#3c4150', pantsDark: '#2a2e3a', shoe: '#5e371a', shoeDark: '#3f230d', lace: '#e0caa2',
      hair: '#efcb6a', hairDark: '#c79a3c', hairLight: '#fbe6a2'
    },
    torsoDetail(x, g) {
      Comic.line(x, [[g.cx + 1.6, g.sy - 1], [g.cx + 1.4, g.hipY + 1]], 0.9, '#fde3ef');
      Comic.line(x, [[g.cx - 4, g.hipY - 1], [g.cx + 5, g.hipY - 1]], 0.5, '#8a2c60');
    },
    hairBack(ctx, g, c) {
      const { hx, hy, r } = g;
      Comic.blob(ctx, [[hx - r * 0.5, hy - r * 0.6], [hx - r * 1.14, hy - r * 0.2], [hx - r * 1.12, hy + r * 0.9], [hx - r * 0.34, hy + r * 1.1]]);
      Comic.ink(ctx, c.hairDark, g.lw);
    },
    over(ctx, g, c) {
      // Zopf über die Schulter nach vorn
      const { hx, hy, r } = g;
      [0, 1, 2, 3].forEach(i => {
        Comic.ellipse(ctx, hx - r * 0.72 + i * 0.32, hy + r * 1.05 + i * r * 0.44, r * 0.3 - i * 0.1, r * 0.3, 0.3);
        Comic.ink(ctx, i % 2 ? c.hairDark : c.hair, g.lw * 0.8);
      });
      Comic.ellipse(ctx, hx - r * 0.66 + 1.2, hy + r * 2.72, r * 0.12, r * 0.12);
      Comic.ink(ctx, '#ee6aa8', g.lw * 0.6);
    },
    hair(ctx, g, c) { hair.short(ctx, g, c, 4); }
  },

  // Peter Kammer (Grill-Meister): kleiner und runder als Sven, olivgrünes
  // T-Shirt, graue Shorts, fast Glatze mit Haarkranz, grosses Grinsen
  peter: {
    build: Object.assign({}, BUILD_ADULT, { footH: 2.4, hy: 17, sy: 25, hipY: 33.4, torso: 7.4, leg: 3.7, upperArm: 5, foreArm: 4.8 }), mouth: 'grin', bareForearm: 0.5, bareShin: 0, skinBelowKnee: true, belly: 0.6,
    colors: {
      skin: '#ecb48c', skinDark: '#cd9168', cheek: 'rgba(235,100,90,0.34)', eye: '#3e2c1e', brow: '#6a5a4a',
      top: '#5f7040', topDark: '#47552e', sleeve: '#5f7040', sleeveDark: '#47552e',
      pants: '#62626a', pantsDark: '#4a4a52', sock: '#1d1d22', shoe: '#5f5444', shoeDark: '#3f3628', lace: '#c8bea4',
      hair: '#8a7a68', hairDark: '#665a4c', hairLight: '#a89a88'
    },
    torsoDetail(x, g) {
      Comic.fillRect(x, g.cx - 10, g.hipY - 1, 20, 2, '#3a2a1a');
      Comic.curve(x, [[g.cx - 5, g.sy + 5], [g.cx + 1, g.hipY - 2.4], [g.cx + 6.5, g.sy + 5]]);
      x.strokeStyle = 'rgba(30,38,18,0.6)'; x.lineWidth = 0.6; x.stroke();
    },
    hair(ctx, g, c) {
      const { hx, hy, r } = g;
      // Haarkranz an den Seiten, Glanzpunkt auf der Glatze
      Comic.blob(ctx, [[hx - r * 1.02, hy - r * 0.4], [hx - r * 0.58, hy - r * 0.6], [hx - r * 0.46, hy + r * 0.2], [hx - r * 0.92, hy + r * 0.34]]);
      Comic.ink(ctx, c.hair, g.lw * 0.85);
      Comic.ellipse(ctx, hx + r * 0.2, hy - r * 0.76, r * 0.3, r * 0.14, -0.2);
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
    }
  },

  hannahColors: {
    skin: '#f8d0ac', skinDark: '#e0ad8c', pants: '#ec5fa4', jacket: '#9ea0a8', jacketDark: '#7a7c84', hat: '#d49aaa', hatDark: '#b07888'
  }
};

/** Rucksack hinter dem Rücken: Hauptfach, Deckeltasche, Riemchen. */
function backpack(ctx, g, base, dark, light) {
  const x = g.cx - g.b.torso - 0.2, top = g.sy - 1, h = g.hipY - g.sy + 2, w = g.b.torso * 1.28;
  Comic.rr(ctx, x - w, top, w + 1.5, h, 1.6);
  Comic.cel(ctx, base, c => {
    Comic.fillRect(c, x - w, top, w * 0.42, h, dark);
    Comic.fillRect(c, x - w + w * 0.62, top + 0.8, 0.8, h - 2, light);
  }, g.lw);
  Comic.rr(ctx, x - w - 0.5, top - 0.6, w + 1.4, h * 0.34, 1);
  Comic.ink(ctx, dark, g.lw * 0.85);
  Comic.rr(ctx, x - w * 0.86, top + h * 0.52, w * 0.6, h * 0.34, 0.6);
  Comic.ink(ctx, dark, g.lw * 0.7);
}

/** Strickmütze mit Bündchen, Rippen und Bommel. */
function beanie(ctx, g, base, dark, light) {
  const { hx, hy, r } = g, lw = g.lw;
  Comic.ellipse(ctx, hx + r * 0.02, hy - r * 1.52, r * 0.28, r * 0.28);
  Comic.cel(ctx, '#f6f3ee', c => { Comic.fillRect(c, hx - r, hy - r * 2.2, r * 0.92, r, '#cfcbc4'); }, lw * 0.9);
  Comic.blob(ctx, [[hx - r * 1.14, hy - r * 0.42], [hx - r * 0.82, hy - r * 1.14], [hx + r * 0.1, hy - r * 1.48], [hx + r * 0.92, hy - r * 1.12], [hx + r * 1.2, hy - r * 0.42]]);
  Comic.cel(ctx, base, c => {
    Comic.fillRect(c, hx - r * 1.3, hy - r * 2, r * 0.8, r * 2, dark);
    c.strokeStyle = dark; c.lineWidth = lw * 0.55;
    c.beginPath();
    for (let i = -3; i <= 3; i++) { c.moveTo(hx + i * r * 0.3, hy - r * 0.5); c.quadraticCurveTo(hx + i * r * 0.24, hy - r, hx + i * r * 0.07, hy - r * 1.5); }
    c.stroke();
  }, lw);
  Comic.rr(ctx, hx - r * 1.2, hy - r * 0.84, r * 2.42, r * 0.5, r * 0.18);
  Comic.cel(ctx, dark, c => {
    c.strokeStyle = light; c.lineWidth = lw * 0.45;
    c.beginPath();
    for (let i = -6; i <= 6; i++) { c.moveTo(hx + i * r * 0.17, hy - r * 0.84); c.lineTo(hx + i * r * 0.17, hy - r * 0.34); }
    c.stroke();
  }, lw);
}

/** Basecap mit Schirm nach vorn. */
function cap(ctx, g, base, dark, light, brim) {
  const { hx, hy, r } = g, lw = g.lw;
  // Schirm
  Comic.blob(ctx, [[hx + r * 0.42, hy - r * 0.66], [hx + r * 1.2, hy - r * 0.74], [hx + r * 1.82, hy - r * 0.42], [hx + r * 1.72, hy - r * 0.24], [hx + r * 0.8, hy - r * 0.36]]);
  Comic.ink(ctx, brim, lw);
  // Haube
  Comic.blob(ctx, [[hx - r * 1.06, hy - r * 0.34], [hx - r * 0.98, hy - r * 1.06], [hx + r * 0.1, hy - r * 1.42], [hx + r * 1.12, hy - r * 1.02], [hx + r * 1.08, hy - r * 0.44], [hx, hy - r * 0.52]]);
  Comic.cel(ctx, base, c => {
    Comic.fillRect(c, hx - r * 1.3, hy - r * 2, r * 0.94, r * 2, dark);
    c.strokeStyle = dark; c.lineWidth = lw * 0.6;
    Comic.curve(c, [[hx - r * 0.1, hy - r * 1.5], [hx + r * 0.24, hy - r * 1.02], [hx + r * 0.2, hy - r * 0.5]]); c.stroke();
    Comic.fillRect(c, hx + r * 0.44, hy - r * 1.24, r * 0.3, r * 0.2, light);
  }, lw);
  Comic.ellipse(ctx, hx + r * 0.08, hy - r * 1.34, r * 0.12, r * 0.08);
  Comic.ink(ctx, dark, lw * 0.6);
}

/** Runde Brille. */
function glasses(ctx, g, color) {
  const { hx, hy, r } = g, ey = hy - r * 0.04;
  ctx.strokeStyle = color; ctx.lineWidth = g.lw * 0.9;
  ctx.beginPath(); ctx.arc(hx + r * 0.1, ey, r * 0.36, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(hx + r * 0.66, ey, r * 0.29, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(hx + r * 0.42, ey - r * 0.08); ctx.lineTo(hx + r * 0.42, ey - r * 0.04);
  ctx.moveTo(hx - r * 0.26, ey); ctx.lineTo(hx - r * 0.72, ey - r * 0.06); ctx.stroke();
}

/** Svens Kraxe: Metallrahmen, Sitz, Haltebügel, Standbein (Hannah ist ein eigenes Sprite davor). */
function kraxe(ctx, g) {
  const lw = g.lw, tube = '#6c6e76', hi = '#9fa2ab';
  const backX = g.cx - g.b.torso - 1.4;
  const tubeLine = pts => { Comic.limb(ctx, pts, 1.5, tube, lw * 0.85); Comic.line(ctx, pts, 0.45, hi); };
  tubeLine([[backX, 9], [backX, 31]]);                                  // Rückenteil
  tubeLine([[5.5, 12], [5, 31.5]]);                                      // äusserer Bügel
  tubeLine([[5, 10.5], [backX + 1, 10.5]]);                               // Haltebügel oben
  tubeLine([[6, 16], [backX, 16]]);
  tubeLine([[5, 31.5], [backX, 31.5]]);                                   // Boden
  tubeLine([[6, 31.5], [2.5, 46.5]]);                                     // Standbein
  tubeLine([[1, 46.8], [6.2, 46.8]]);
  // Sitzpolster
  Comic.rr(ctx, 5.4, 26.8, backX - 5.2, 4, 1.5);
  Comic.ink(ctx, '#31343c', lw * 0.85);
}

// Eckdaten, die die Szenen brauchen
const PEOPLE = {
  edith: { width: 32, originX: 0.5 },
  kurt: { width: 32, originX: 0.5 },
  sven: { width: 40, originX: 27 / 40 },   // Körpermitte, nicht Bildmitte (die Kraxe ragt nach hinten)
  angi: { width: 32, originX: 0.5 },
  peter: { width: 32, originX: 0.5 }
};

// Hannahs Platz in der Kraxe, in Einheiten von 2 Pixeln ab der linken oberen Ecke von Sven
const DAUGHTER = { col: 3, row: -1 };
