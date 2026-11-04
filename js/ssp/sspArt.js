/* =====================================================================
 * sspArt.js – Grafiken der Super Sempach Party im Comic-Stil
 *
 * Wie art.js: alles per Canvas gezeichnet (keine Bilddateien).
 * SspArt.createAll(scene) läuft in der BootScene.
 * Die Spielfiguren (hiker1 = Jessica, hiker2 = Simon) kommen aus figures.js.
 * ===================================================================== */

const SspArt = {
  createAll(scene) {
    const C = Comic;
    const tex = (key, w, h, draw, ss = 3) => C.tex(scene, key, w, h, draw, { ss });

    // Pedalo: weisser Rumpf mit rotem Streifen und Schaufelrad-Kasten
    tex('ssp_pedalo', 72, 30, ctx => {
      // Sitze
      [[6, 10], [56, 10]].forEach(([x, w]) => { C.rr(ctx, x, 5, w, 6, 1.4); C.ink(ctx, '#f2c230', 1); });
      // Radkasten
      C.rr(ctx, 26, 0.8, 20, 11, 2);
      C.cel(ctx, '#3a7be0', s => { C.fillRect(s, 26, 0, 20, 2.4, '#8abaff'); C.halftone(s, 26, 3, 20, 9, '#1f4e9a', 2.4, (u, v) => v); }, 1);
      // Rumpf
      C.blob(ctx, [[-1, 9], [36, 8], [73, 9], [69, 20], [60, 25], [12, 25], [3, 20]]);
      C.cel(ctx, '#ffffff', s => {
        C.fillRect(s, 0, 18, 72, 8, '#c4d2e0');
        C.fillRect(s, 0, 13.4, 72, 3.2, '#d7263d');
      }, 1.3);
      // Wasserlinie
      C.curve(ctx, [[4, 27], [20, 26], [36, 27.6], [52, 26], [68, 27]]);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.3; ctx.stroke();
    });
    tex('ssp_wheel', 18, 18, ctx => {
      for (let a = 0; a < 4; a++) {
        const c = Math.cos(a * Math.PI / 2) * 8, s = Math.sin(a * Math.PI / 2) * 8;
        C.limb(ctx, [[9, 9], [9 + c, 9 + s]], 1.6, '#ffffff', 0.6);
      }
      C.ellipse(ctx, 9, 9, 6.6, 6.6); ctx.strokeStyle = C.INK; ctx.lineWidth = 2.6; ctx.stroke();
      C.ellipse(ctx, 9, 9, 6.6, 6.6); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.stroke();
      C.ellipse(ctx, 9, 9, 1.8, 1.8); C.ink(ctx, '#f2c230', 0.6);
    });

    // Ente
    tex('ssp_duck', 22, 18, ctx => {
      C.blob(ctx, [[1, 9], [5, 7.6], [12, 9], [17, 8], [18.6, 13], [15, 17], [5, 17], [1.4, 14]]);
      C.cel(ctx, '#f7cf3a', s => { C.fillRect(s, 0, 13.4, 22, 5, '#d8a020'); }, 0.9);
      C.curve(ctx, [[6, 11], [10, 14], [13, 11]]); ctx.strokeStyle = '#a87a10'; ctx.lineWidth = 0.7; ctx.stroke();
      C.ellipse(ctx, 15, 5.8, 4.4, 4.4);
      C.cel(ctx, '#f7cf3a', s => C.fillRect(s, 10, 7.6, 10, 3, '#d8a020'), 0.9);
      C.poly(ctx, [[18.6, 4.8], [21.6, 5.6], [18.8, 7.4]]); C.ink(ctx, '#f08a24', 0.6);
      C.ellipse(ctx, 16.4, 4.6, 0.85, 1); ctx.fillStyle = C.INK; ctx.fill();
      C.ellipse(ctx, 16.2, 4.2, 0.3, 0.3); ctx.fillStyle = '#ffffff'; ctx.fill();
    });

    // Zielscheibe auf Pfosten
    tex('ssp_target', 40, 56, ctx => {
      C.rr(ctx, 18, 30, 4, 25.6, 0.6); C.ink(ctx, '#7a4c26', 0.9);
      [[17.5, '#ffffff'], [14.5, '#d7263d'], [10.5, '#ffffff'], [6.8, '#d7263d'], [3, '#ffffff']].forEach(([r, c]) => {
        C.ellipse(ctx, 20, 18, r, r); ctctxFill(ctx, c);
      });
      C.ellipse(ctx, 20, 18, 17.6, 17.6); ctx.strokeStyle = C.INK; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.save();
      C.ellipse(ctx, 20, 18, 17, 17); ctx.clip();
      C.halftone(ctx, 2, 18, 36, 18, 'rgba(23,18,31,0.28)', 2.6, (u, v) => v);
      ctx.restore();
    });

    // Strahlrohr (Feuerwehr) und Hydrant
    tex('ssp_nozzle', 16, 34, ctx => {
      C.poly(ctx, [[5.5, 0.8], [10.5, 0.8], [12.6, 23], [3.4, 23]]);
      C.cel(ctx, '#c8ced6', s => { C.fillRect(s, 0, 0, 7, 24, '#8a909c'); C.fillRect(s, 9, 0, 1.2, 24, '#ffffff'); }, 0.9);
      C.rr(ctx, 1.4, 22, 13.2, 6, 1.2); C.cel(ctx, '#d7263d', s => C.fillRect(s, 1, 22, 14, 1.6, '#ff6a7a'), 0.9);
      C.rr(ctx, 5, 28, 6, 5.4, 0.8); C.ink(ctx, '#3a3a44', 0.9);
    });
    tex('ssp_hydrant', 26, 40, ctx => {
      C.rr(ctx, 0.8, 16, 24.4, 6, 1.2); C.ink(ctx, '#b01c2e', 0.9);
      C.rr(ctx, 5, 8, 16, 31.4, 1.5);
      C.cel(ctx, '#d7263d', s => { C.fillRect(s, 5, 8, 4, 32, '#ff6a7a'); C.fillRect(s, 16, 8, 5, 32, '#a81828'); }, 1);
      C.rr(ctx, 3, 4, 20, 6, 1.4); C.ink(ctx, '#b01c2e', 0.9);
      ctx.beginPath(); ctx.arc(13, 5, 5, Math.PI, 0); ctx.closePath(); C.ink(ctx, '#d7263d', 0.9);
      C.ellipse(ctx, 13, 19, 2.4, 2.4); C.ink(ctx, '#f2c230', 0.7);
    });

    // Wurst: helle Grundfarbe, wird per Tint "gegrillt" (Tusche bleibt dunkel)
    tex('ssp_sausage', 44, 14, ctx => {
      C.rr(ctx, 1, 1, 42, 12, 5.8);
      C.cel(ctx, '#ffe8e0', s => {
        C.fillRect(s, 0, 9, 44, 5, '#e0c0b8');
        C.fillRect(s, 8, 3, 26, 1.6, '#ffffff');
        s.strokeStyle = 'rgba(70,30,20,0.6)'; s.lineWidth = 1;
        s.beginPath(); [13, 21, 29].forEach(x => { s.moveTo(x, 5); s.lineTo(x + 3, 10); }); s.stroke();
      }, 0.8);
    });

    // Inline-Skates (unter die Figur gesetzt)
    tex('ssp_skates', 22, 8, ctx => {
      [[1, 2, 6], [12, 13, 17]].forEach(([x, a, b]) => {
        C.rr(ctx, x, 0.5, 9, 4, 1); C.ink(ctx, '#3a7be0', 0.6);
        [a, b].forEach(wx => { C.ellipse(ctx, wx + 1.5, 6.2, 1.5, 1.5); C.ink(ctx, '#f2c230', 0.5); });
      });
    });
    // Zeltleine: rot-weiss gestreiftes Seil zwischen zwei Heringen, gelbe
    // Warnwimpel, dunkle Kontur – hebt sich klar von Wiese und Zelten ab
    tex('ssp_rope', 52, 26, ctx => {
      C.limb(ctx, [[4, 8], [48, 8]], 4, '#ffffff', 1);
      ctx.lineCap = 'butt';
      for (let x = 4; x < 48; x += 8) {
        ctx.strokeStyle = (x / 8) % 2 < 1 ? '#ff2a2a' : '#ffffff'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(Math.min(48, x + 8), 8); ctx.stroke();
      }
      ctx.lineCap = 'round';
      [[2, 4], [46, 4]].forEach(([x, y]) => { C.rr(ctx, x, y, 4, 21, 0.8); C.ink(ctx, '#d0d6de', 1); });
      [14, 30].forEach(x => { C.poly(ctx, [[x, 10], [x + 8, 10], [x + 4, 19]]); C.ink(ctx, '#ffe14a', 1); });
    });
    // Campingstuhl: knallblau mit gelbem Sitz, dunkle Kontur
    tex('ssp_chair', 36, 40, ctx => {
      C.limb(ctx, [[5, 38], [30, 18]], 3, '#d0d6de', 1.2);
      C.limb(ctx, [[30, 38], [5, 18]], 3, '#d0d6de', 1.2);
      C.rr(ctx, 23, 1, 10, 20, 1.2);
      C.cel(ctx, '#1b6ee8', s => { C.fillRect(s, 23, 1, 2.4, 20, '#7ab0ff'); C.halftone(s, 23, 8, 10, 13, '#0e4aa8', 2.2, (u, v) => v); }, 1.2);
      C.rr(ctx, 2.4, 14.4, 31.2, 7.2, 1.4);
      C.cel(ctx, '#ffd21a', s => C.fillRect(s, 2, 18.6, 32, 4, '#e0a410'), 1.2);
    });
    // Zelt (Deko)
    tex('ssp_tent', 84, 56, ctx => {
      C.poly(ctx, [[42, 1.2], [83, 55], [1, 55]]);
      C.cel(ctx, '#ec7a40', s => {
        C.poly(s, [[42, 0], [84, 56], [60, 56]]); s.fillStyle = '#c45a2c'; s.fill();
        C.halftone(s, 0, 28, 84, 28, 'rgba(120,50,15,0.4)', 3.4, (u, v) => v);
      }, 1.4);
      C.poly(ctx, [[42, 14], [54, 55], [30, 55]]);
      C.cel(ctx, '#3a2418', s => { C.poly(s, [[42, 30], [47, 56], [37, 56]]); s.fillStyle = '#6a4226'; s.fill(); }, 1);
      C.line(ctx, [[42, 1], [42, 14]], 0.9);
    }, 2);

    // Brennessel-Strauch
    tex('ssp_nettle', 26, 34, ctx => {
      C.limb(ctx, [[13, 33], [13, 12]], 1.8, '#4a7a34', 0.7);
      const leaf = (x, y, r, rot) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
        const pts = [];
        for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI * 2; const rr = r * (1 + (i % 2 ? 0.2 : -0.08)); pts.push([Math.cos(a) * rr * 0.72, Math.sin(a) * rr]); }
        C.poly(ctx, pts);
        C.cel(ctx, '#45a23e', s => {
          C.fillRect(s, -r, 0, r * 2, r, '#2f7a2c');
          s.strokeStyle = '#a8f08a'; s.lineWidth = 0.5;
          s.beginPath(); s.moveTo(0, -r); s.lineTo(0, r); s.stroke();
        }, 0.7);
        ctx.restore();
      };
      leaf(13, 6.4, 5.4, 0); leaf(6.4, 13, 5, -0.9); leaf(19.6, 13, 5, 0.9); leaf(8.6, 21, 4.4, -1.1); leaf(17.8, 21, 4.4, 1.1);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.5;                      // Brennhaare
      ctx.beginPath();
      [[2, 9, 1, 7.6], [24, 9, 25, 7.6], [13, 1, 13, 0], [3.6, 19, 2.4, 18], [22.4, 19, 23.6, 18]].forEach(([a, b, c, d]) => { ctx.moveTo(a, b); ctx.lineTo(c, d); });
      ctx.stroke();
    });
    // Schild: Pfannendeckel
    tex('ssp_shield', 26, 26, ctx => {
      C.ellipse(ctx, 13, 13, 11.6, 11.6);
      C.cel(ctx, '#b4bcc6', s => {
        C.ellipse(s, 11, 10, 8, 7); s.fillStyle = '#e8eef4'; s.fill();
        C.halftone(s, 2, 14, 22, 12, 'rgba(40,46,60,0.4)', 2.4, (u, v) => v);
      }, 1.2);
      C.rr(ctx, 9.6, 10.6, 6.8, 4.8, 1.4); C.ink(ctx, '#3a3a44', 0.9);
    });

    // Pokal
    tex('ssp_trophy', 52, 64, ctx => {
      [[10, 12, Math.PI * 0.5, Math.PI * 1.5], [42, 12, -Math.PI * 0.5, Math.PI * 0.5]].forEach(([x, y, a, b]) => {
        ctx.beginPath(); ctx.arc(x, y, 7, a, b); ctx.strokeStyle = C.INK; ctx.lineWidth = 5.4; ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 7, a, b); ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 3.2; ctx.stroke();
      });
      C.rr(ctx, 22, 27, 8, 16, 1); C.cel(ctx, '#e0b020', s => C.fillRect(s, 22, 27, 3, 16, '#a87a10'), 1);
      ctx.beginPath(); ctx.moveTo(11.5, 2); ctx.lineTo(40.5, 2); ctx.quadraticCurveTo(41, 26, 26, 30); ctx.quadraticCurveTo(11, 26, 11.5, 2); ctx.closePath();
      C.cel(ctx, '#f7cf3a', s => {
        C.fillRect(s, 28, 0, 14, 32, '#d8a018');
        C.fillRect(s, 16, 5, 3.6, 18, '#fff8d0');
        C.halftone(s, 11, 14, 30, 16, 'rgba(150,90,10,0.45)', 2.6, (u, v) => v);
      }, 1.2);
      C.burst(ctx, 26, 13, 5.4, 2.4, 5); C.ink(ctx, '#fff2a0', 0.7);
      C.rr(ctx, 14, 42, 24, 6, 1); C.ink(ctx, '#f2c230', 1);
      C.rr(ctx, 10, 48, 32, 15, 1.4);
      C.cel(ctx, '#5b2d1a', s => C.fillRect(s, 10, 48, 32, 2, '#8a5230'), 1.2);
      C.rr(ctx, 15, 52, 22, 6.6, 0.8); C.ink(ctx, '#f2c230', 0.7);
    });
    // Stern
    tex('ssp_star', 18, 18, ctx => {
      C.burst(ctx, 9, 9.4, 8.2, 3.8, 5);
      C.cel(ctx, '#f7d117', s => C.fillRect(s, 9, 0, 9, 18, '#e0a010'), 0.9);
    });

    // --- Flächen für die Minispiele (kachelbar, als TileSprite) -----------
    // Rasen: Grasbüschel-Häkchen auf Grün
    [['ssp_lawn', '#5fa84a', '#3f8236', '#8ad268'], ['ssp_lawnDark', '#4b9440', '#2f6c2c', '#74be58']].forEach(([key, base, dark, light]) => {
      tex(key, 64, 64, ctx => {
        C.fillRect(ctx, 0, 0, 64, 64, base);
        C.halftone(ctx, 0, 0, 64, 64, 'rgba(20,70,30,0.2)', 8, () => 0.8);
        for (let i = 0; i < 16; i++) {
          const x = 3 + C.rnd(i * 2.3 + base.length) * 58, y = 4 + C.rnd(i * 5.1) * 56;
          C.curve(ctx, [[x - 1.6, y + 2.4], [x - 0.9, y + 1], [x - 1.2, y]]);
          ctx.strokeStyle = i % 3 ? dark : light; ctx.lineWidth = 0.9; ctx.stroke();
          C.curve(ctx, [[x + 1.2, y + 2.4], [x + 1, y + 0.8], [x + 2, y - 0.4]]);
          ctx.stroke();
        }
      }, 2);
    });
    // See: Wellen-Bögen und Raster
    tex('ssp_lake', 96, 48, ctx => {
      C.fillRect(ctx, 0, 0, 96, 48, '#2599b8');
      C.halftone(ctx, 0, 0, 96, 48, 'rgba(10,80,120,0.3)', 6, () => 0.7);
      ctx.strokeStyle = 'rgba(220,250,255,0.75)'; ctx.lineWidth = 1.1;
      [[6, 8], [52, 6], [28, 22], [76, 24], [10, 38], [58, 40]].forEach(([x, y]) => {
        C.curve(ctx, [[x, y], [x + 4, y - 2], [x + 8, y], [x + 12, y - 2], [x + 16, y]]); ctx.stroke();
      });
    }, 2);
    // Holzsteg/Bühne der Plattformen
    tex('ssp_plank', 64, 14, ctx => {
      Art.plank(ctx, 64, 14, '#c08a4a', '#8a5a2e', false);
      C.fillRect(ctx, 31.5, 0, 0.8, 14, C.INK);
      C.fillRect(ctx, 63.3, 0, 0.7, 14, C.INK);
    }, 2);
    // Asphaltweg mit Mittelstreifen-freier Fläche (Streifen zeichnet die Szene)
    tex('ssp_road', 64, 18, ctx => {
      C.fillRect(ctx, 0, 0, 64, 18, '#9aa0a8');
      C.halftone(ctx, 0, 0, 64, 18, 'rgba(40,44,54,0.3)', 4, (u, v) => 0.5 + v * 0.5);
      C.fillRect(ctx, 0, 0, 64, 1.2, C.INK);
      C.fillRect(ctx, 0, 16.8, 64, 1.2, C.INK);
    }, 2);
  }
};

/** Aktuellen Pfad einfarbig füllen. */
function ctctxFill(ctx, color) {
  ctx.fillStyle = color;
  ctx.fill();
}
