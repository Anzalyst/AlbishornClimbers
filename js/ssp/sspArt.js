/* =====================================================================
 * sspArt.js – Code-Grafiken der Super Sempach Party
 *
 * Wie art.js: alles per Canvas gezeichnet (keine Bilddateien).
 * SspArt.createAll(scene) läuft in der BootScene.
 * Die Spielfiguren (hiker1 = Jessica, hiker2 = Simon) kommen aus der BootScene.
 * ===================================================================== */

const SspArt = {
  createAll(scene) {
    const A = Art;   // Helfer aus art.js (canvas, rect, vgrad, radial)

    // Pedalo: weisser Rumpf mit rotem Streifen und Schaufelrad-Kasten
    A.canvas(scene, 'ssp_pedalo', 72, 30, ctx => {
      A.rect(ctx, 4, 14, 64, 12, '#2a4a6a');                       // Wasserlinie / Schatten
      A.vgrad(ctx, 0, 8, 72, 14, [[0, '#ffffff'], [1, '#c8d4e0']]);
      A.rect(ctx, 0, 14, 72, 3, '#d7263d');
      A.rect(ctx, 26, 0, 20, 10, '#3a7be0');                       // Radkasten
      A.rect(ctx, 26, 0, 20, 2, '#6aa4ff');
      A.rect(ctx, 6, 6, 10, 4, '#f2c230'); A.rect(ctx, 56, 6, 10, 4, '#f2c230');   // Sitze
    });
    A.canvas(scene, 'ssp_wheel', 18, 18, ctx => {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(9, 9, 7, 0, Math.PI * 2); ctx.stroke();
      for (let a = 0; a < 4; a++) {
        ctx.beginPath(); ctx.moveTo(9, 9); ctx.lineTo(9 + Math.cos(a * Math.PI / 2) * 8, 9 + Math.sin(a * Math.PI / 2) * 8); ctx.stroke();
      }
    });

    // Ente
    A.canvas(scene, 'ssp_duck', 22, 18, ctx => {
      A.rect(ctx, 2, 9, 16, 7, '#f2c230');
      A.rect(ctx, 4, 7, 12, 2, '#f2c230');
      A.rect(ctx, 12, 2, 7, 7, '#f2c230');
      A.rect(ctx, 19, 5, 3, 2, '#f08a24');
      A.rect(ctx, 16, 4, 1, 1, '#111111');
      A.rect(ctx, 2, 15, 16, 2, '#c89a20');
    });

    // Zielscheibe auf Pfosten
    A.canvas(scene, 'ssp_target', 40, 56, ctx => {
      A.rect(ctx, 18, 30, 4, 26, '#6b4220');
      [[18, '#ffffff'], [15, '#d7263d'], [11, '#ffffff'], [7, '#d7263d'], [3, '#ffffff']].forEach(([r, c]) => {
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(20, 18, r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(20, 18, 18, 0, Math.PI * 2); ctx.stroke();
    });

    // Strahlrohr (Feuerwehr) und Hydrant
    A.canvas(scene, 'ssp_nozzle', 16, 34, ctx => {
      A.vgrad(ctx, 3, 0, 10, 26, [[0, '#d0d6de'], [1, '#7a808c']]);
      A.rect(ctx, 1, 22, 14, 6, '#d7263d');
      A.rect(ctx, 5, 28, 6, 6, '#3a3a44');
    });
    A.canvas(scene, 'ssp_hydrant', 26, 40, ctx => {
      A.rect(ctx, 5, 8, 16, 30, '#d7263d');
      A.rect(ctx, 3, 4, 20, 6, '#b01c2e');
      A.rect(ctx, 0, 16, 26, 6, '#b01c2e');
      A.rect(ctx, 8, 0, 10, 5, '#d7263d');
      A.rect(ctx, 7, 10, 3, 26, '#ff6a7a');
    });

    // Wurst: helle Grundfarbe, wird per Tint "gegrillt"
    A.canvas(scene, 'ssp_sausage', 44, 14, ctx => {
      ctx.fillStyle = '#ffe8e0';
      ctx.beginPath(); ctx.arc(7, 7, 6, Math.PI / 2, Math.PI * 1.5); ctx.lineTo(37, 1); ctx.arc(37, 7, 6, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill();
      A.rect(ctx, 6, 3, 30, 2, '#ffffff');
      [12, 20, 28].forEach(x => A.rect(ctx, x, 6, 4, 1, '#e0c0b8'));
    });

    // Inline-Skates (unter die Figur gesetzt)
    A.canvas(scene, 'ssp_skates', 22, 8, ctx => {
      A.rect(ctx, 1, 0, 9, 4, '#3a7be0'); A.rect(ctx, 12, 0, 9, 4, '#3a7be0');
      [2, 6, 13, 17].forEach(x => { A.rect(ctx, x, 5, 3, 3, '#f2c230'); });
    });
    // Zeltleine: rot-weiss gestreiftes Seil zwischen zwei Heringen, gelbe
    // Warnwimpel, dunkle Kontur – hebt sich klar von Wiese und Zelten ab
    A.canvas(scene, 'ssp_rope', 52, 26, ctx => {
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#111111'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(4, 8); ctx.lineTo(48, 8); ctx.stroke();
      for (let x = 4; x < 48; x += 8) {
        ctx.strokeStyle = (x / 8) % 2 < 1 ? '#ff2a2a' : '#ffffff'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(Math.min(48, x + 8), 8); ctx.stroke();
      }
      [[2, 4], [46, 4]].forEach(([x, y]) => { A.rect(ctx, x - 1, y, 6, 22, '#111111'); A.rect(ctx, x, y + 1, 4, 20, '#d0d6de'); });
      [14, 30].forEach(x => {
        ctx.fillStyle = '#111111'; ctx.beginPath(); ctx.moveTo(x - 1, 9); ctx.lineTo(x + 9, 9); ctx.lineTo(x + 4, 21); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x + 8, 10); ctx.lineTo(x + 4, 19); ctx.closePath(); ctx.fill();
      });
    });
    // Campingstuhl: knallblau mit gelbem Sitz, dunkle Kontur
    A.canvas(scene, 'ssp_chair', 36, 40, ctx => {
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#111111'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(5, 38); ctx.lineTo(30, 18); ctx.moveTo(30, 38); ctx.lineTo(5, 18); ctx.stroke();
      ctx.strokeStyle = '#d0d6de'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(5, 38); ctx.lineTo(30, 18); ctx.moveTo(30, 38); ctx.lineTo(5, 18); ctx.stroke();
      A.rect(ctx, 1, 13, 34, 10, '#111111'); A.rect(ctx, 3, 15, 30, 6, '#ffd21a');
      A.rect(ctx, 22, 0, 12, 22, '#111111'); A.rect(ctx, 24, 2, 8, 18, '#1b6ee8');
      A.rect(ctx, 25, 3, 2, 16, '#6aa4ff');
    });
    // Zelt (Deko)
    A.canvas(scene, 'ssp_tent', 84, 56, ctx => {
      ctx.fillStyle = '#e8743a'; ctx.beginPath(); ctx.moveTo(42, 0); ctx.lineTo(84, 56); ctx.lineTo(0, 56); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b8542a'; ctx.beginPath(); ctx.moveTo(42, 0); ctx.lineTo(56, 56); ctx.lineTo(28, 56); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3a2418'; ctx.beginPath(); ctx.moveTo(42, 18); ctx.lineTo(52, 56); ctx.lineTo(32, 56); ctx.closePath(); ctx.fill();
    });

    // Brennessel-Strauch
    A.canvas(scene, 'ssp_nettle', 26, 34, ctx => {
      A.rect(ctx, 12, 18, 3, 16, '#3a6a2a');
      const leaf = (x, y, w, h) => { ctx.fillStyle = '#3f9a3a'; ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2); ctx.fill(); };
      leaf(13, 6, 6, 6); leaf(6, 13, 6, 5); leaf(20, 13, 6, 5); leaf(9, 21, 5, 4); leaf(18, 21, 5, 4);
      ctx.fillStyle = '#7ad86a';
      [[13, 3], [5, 11], [21, 11], [9, 19], [18, 19]].forEach(([x, y]) => A.rect(ctx, x, y, 1, 3, '#7ad86a'));
      [[2, 9], [24, 9], [13, 0], [4, 20], [22, 20]].forEach(([x, y]) => A.rect(ctx, x, y, 1, 1, '#ffffff'));   // Brennhaare
    });
    // Schild: Pfannendeckel
    A.canvas(scene, 'ssp_shield', 26, 26, ctx => {
      A.radial(ctx, 13, 13, 12, [[0, '#e8eef4'], [0.8, '#9aa4b0'], [1, '#5a606c']]);
      ctx.clearRect(0, 0, 1, 1);
      A.rect(ctx, 10, 11, 6, 4, '#3a3a44');
    });

    // Pokal
    A.canvas(scene, 'ssp_trophy', 52, 64, ctx => {
      A.vgrad(ctx, 12, 2, 28, 26, [[0, '#fff2a0'], [1, '#d6a41c']]);
      ctx.strokeStyle = '#d6a41c'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(10, 12, 7, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(42, 12, 7, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
      A.rect(ctx, 22, 28, 8, 14, '#d6a41c');
      A.rect(ctx, 14, 42, 24, 6, '#f2c230');
      A.rect(ctx, 10, 48, 32, 14, '#5b2d1a');
      A.rect(ctx, 14, 52, 24, 6, '#f2c230');
      A.rect(ctx, 16, 6, 4, 16, 'rgba(255,255,255,0.6)');
    });
    // Stern
    A.canvas(scene, 'ssp_star', 18, 18, ctx => {
      ctx.fillStyle = '#f7d117';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 4 : 9, a = -Math.PI / 2 + i * Math.PI / 5;
        ctx.lineTo(9 + Math.cos(a) * r, 9 + Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
    });
  }
};
