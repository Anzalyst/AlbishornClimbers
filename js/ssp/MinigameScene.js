/* =====================================================================
 * MinigameScene.js – Basisklasse aller Sempach-Minispiele
 *
 * Übernimmt alles, was jedes Minispiel braucht:
 *   - Intro-Karte (Name, Beschreibung, Steuerung) → Countdown 3-2-1-LOS!
 *   - HUD: Namen, Punkte bzw. Fortschritt, Restzeit
 *   - Pause (START / ESC / P) mit Weiter, Neu starten, Ton, Hauptmenü
 *   - Ergebnis-Banner und Weiter im Party-Ablauf (SspParty)
 *
 * Ein Minispiel überschreibt:
 *   duration          Spielzeit in s (0 = keine, z. B. Rennen mit Ziel)
 *   setup()           Szene aufbauen (läuft in create())
 *   tick(dt, time)    Spiellogik pro Frame, nur zwischen LOS und Ende
 *   visuals(dt, time) optional: Optik pro Frame, läuft immer
 *   hudValue(id)      optional: Text neben dem Namen (Standard: Punkte)
 *   timeUp()          optional: Zeit abgelaufen (Standard: mehr Punkte gewinnt)
 * und ruft this.finish(winner) auf (1, 2 oder 0 = unentschieden).
 *
 * this.inputs[0] = Jessica, this.inputs[1] = Simon; this.score = { 1, 2 }.
 * ===================================================================== */

class MinigameScene extends Phaser.Scene {
  constructor(key) {
    super(key);
    this.gameKey = key;
    this.duration = 0;
  }

  init(data) {
    this.restartData = data || {};
    this.info = SSP.byKey(this.gameKey);
    this.started = false;
    this.finished = false;
    this.introActive = true;
    this.score = { 1: 0, 2: 0 };
    this.timeLeft = this.duration;
    this.winner = null;
  }

  create() {
    this.inputs = createPlayerInputs(this);
    this.players = [sspPlayer(1), sspPlayer(2)];
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.setup();
    this.createHud();
    this.showIntro();

    this.input.keyboard.on('keydown-ESC', () => this.openPause());
    this.input.keyboard.on('keydown-P', () => this.openPause());
    this.input.keyboard.on('keydown-M', () => Sfx.toggleMute());
  }

  // ---------------------------------------------------------------------
  // Platzhalter für die Minispiele
  // ---------------------------------------------------------------------
  setup() {}
  tick() {}
  visuals() {}
  hudValue(id) { return String(this.score[id]); }
  timeUp() {
    this.finish(this.score[1] > this.score[2] ? 1 : this.score[2] > this.score[1] ? 2 : 0);
  }

  // ---------------------------------------------------------------------
  // Ablauf
  // ---------------------------------------------------------------------
  update(time, delta) {
    this.inputs.forEach(i => i.update());
    if (!this.finished && this.inputs.some(i => i.justPressed('start'))) { this.openPause(); return; }

    if (this.introActive && this.inputs.some(i => i.justPressed('jump'))) this.startCountdown();

    const dt = delta / 1000;
    if (this.started && !this.finished) {
      if (this.duration) {
        this.timeLeft = Math.max(0, this.timeLeft - dt);
        if (this.timeLeft === 0) this.timeUp();
      }
      if (!this.finished) this.tick(dt, time);
    }
    this.visuals(dt, time);
    this.updateHud();
  }

  /** Spieler-ID (1/2) → Eingabe. */
  inputOf(id) { return this.inputs[id - 1]; }

  showIntro() {
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
    const c = this.add.container(0, 0).setDepth(200);
    c.add(this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x05060a, 0.55));
    c.add(this.add.rectangle(cx, cy, 760, 290, 0x10131c, 0.95).setStrokeStyle(3, 0xf7d117));
    c.add(this.add.text(cx, cy - 112, this.info.name, { fontFamily: FONT, fontSize: '24px', color: '#f7d117', stroke: '#000000', strokeThickness: 5 }).setOrigin(0.5));
    c.add(this.add.text(cx, cy - 50, this.info.desc, {
      fontFamily: FONT, fontSize: '11px', color: '#ffffff', align: 'center', wordWrap: { width: 680 }, lineSpacing: 8
    }).setOrigin(0.5));
    c.add(this.add.text(cx, cy + 22, this.info.controls, {
      fontFamily: FONT, fontSize: '9px', color: '#7dd8ff', align: 'center', wordWrap: { width: 700 }, lineSpacing: 6
    }).setOrigin(0.5));
    c.add(this.add.text(cx, cy + 62, SSP.keyLegend, { fontFamily: FONT, fontSize: '8px', color: '#aab4cc' }).setOrigin(0.5));
    const go = this.add.text(cx, cy + 108, 'A = LOS!', { fontFamily: FONT, fontSize: '12px', color: '#7dff9a' }).setOrigin(0.5);
    this.tweens.add({ targets: go, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    c.add(go);
    this.introCard = c;
    this.introTimer = this.time.delayedCall(8000, () => this.startCountdown());   // startet auch von allein
  }

  startCountdown() {
    if (!this.introActive) return;
    this.introActive = false;
    if (this.introTimer) this.introTimer.remove();
    this.introCard.destroy();
    const label = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
      fontFamily: FONT, fontSize: '48px', color: '#f7d117', stroke: '#000000', strokeThickness: 8
    }).setOrigin(0.5).setDepth(200);
    ['3', '2', '1', 'LOS!'].forEach((txt, i) => this.time.delayedCall(i * 650, () => {
      label.setText(txt).setScale(1.6);
      this.tweens.add({ targets: label, scale: 1, duration: 300, ease: 'Back.out' });
      Sfx.play(this, i < 3 ? 'countdown' : 'go');
      if (i === 3) {
        this.started = true;
        this.tweens.add({ targets: label, alpha: 0, delay: 400, duration: 300, onComplete: () => label.destroy() });
      }
    }));
  }

  /** Minispiel beenden. winner: 1, 2 oder 0 (unentschieden). */
  finish(winner) {
    if (this.finished) return;
    this.finished = true;
    this.winner = winner;
    SspParty.record(this.gameKey, winner, this.score);

    const cx = GAME_WIDTH / 2;
    const p = winner ? this.players[winner - 1] : null;
    const text = p ? `${p.upper} GEWINNT!` : 'UNENTSCHIEDEN!';
    const banner = this.add.text(cx, GAME_HEIGHT / 2, text, {
      fontFamily: FONT, fontSize: '34px', color: p ? p.css : '#ffffff', stroke: '#000000', strokeThickness: 8
    }).setOrigin(0.5).setDepth(210).setScale(0.3);
    this.tweens.add({ targets: banner, scale: 1, duration: 450, ease: 'Back.out' });
    Sfx.play(this, 'win');
    this.burstConfetti(40);
    this.time.delayedCall(2800, () => SspParty.advance(this));
  }

  burstConfetti(n) {
    const colors = [0xd52b1e, 0xffffff, 0xf7d117, 0x3fd06a, 0x1b6ee8, 0xff7ad9];
    for (let i = 0; i < n; i++) {
      const c = this.add.image(Phaser.Math.Between(0, GAME_WIDTH), -10, 'confetti').setDepth(205)
        .setTint(Phaser.Utils.Array.GetRandom(colors)).setScale(Phaser.Math.FloatBetween(0.8, 1.4));
      this.tweens.add({
        targets: c, y: GAME_HEIGHT + 20, x: c.x + Phaser.Math.Between(-60, 60), angle: Phaser.Math.Between(-360, 360),
        duration: Phaser.Math.Between(1400, 2400), delay: Phaser.Math.Between(0, 500), onComplete: () => c.destroy()
      });
    }
  }

  /** Kurze Meldung (z. B. "PERFEKT!") über einer Stelle, steigt auf und verblasst. */
  popText(x, y, text, color = '#ffffff', size = 12) {
    const t = this.add.text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#000000', strokeThickness: 4 })
      .setOrigin(0.5).setDepth(150);
    this.tweens.add({ targets: t, y: y - 36, alpha: 0, duration: 900, ease: 'Quad.out', onComplete: () => t.destroy() });
  }

  // ---------------------------------------------------------------------
  // HUD
  // ---------------------------------------------------------------------
  createHud() {
    const style = (size, color) => ({ fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#000000', strokeThickness: 4 });
    const g = this.add.graphics().setDepth(100);
    g.fillStyle(0x0b1020, 0.55).fillRoundedRect(8, 8, 300, 34, 10).fillRoundedRect(GAME_WIDTH - 308, 8, 300, 34, 10);
    const [p1, p2] = this.players;
    this.hudLeft = this.add.text(20, 17, '', style(12, p1.css)).setDepth(101);
    this.hudRight = this.add.text(GAME_WIDTH - 20, 17, '', style(12, p2.css)).setOrigin(1, 0).setDepth(101);
    this.hudCenter = this.add.text(GAME_WIDTH / 2, 14, '', style(16, '#ffffff')).setOrigin(0.5, 0).setDepth(101);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 8, 'START / ESC = PAUSE', style(7, '#aab4cc')).setOrigin(0.5, 1).setDepth(101).setAlpha(0.7);
  }

  updateHud() {
    this.hudLeft.setText(`${this.players[0].upper}  ${this.hudValue(1)}`);
    this.hudRight.setText(`${this.hudValue(2)}  ${this.players[1].upper}`);
    if (this.duration) {
      const s = Math.ceil(this.timeLeft);
      this.hudCenter.setText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`).setColor(s <= 5 && this.started ? '#ff8080' : '#ffffff');
    } else {
      this.hudCenter.setText(this.hudCenterText ? this.hudCenterText() : '');
    }
  }

  // ---------------------------------------------------------------------
  // Pause
  // ---------------------------------------------------------------------
  openPause() {
    if (this.finished || this.scene.isPaused()) return;
    Sfx.play(this, 'select');
    this.scene.pause();
    this.scene.launch('PauseScene', { parent: this.scene.key, restart: this.restartData });
  }

  resumeFromPause() {
    this.scene.resume();
    this.inputs.forEach(i => i.resync());
  }

  // ---------------------------------------------------------------------
  // Helfer
  // ---------------------------------------------------------------------
  /** Spielfigur als Sprite (Ursprung an den Füssen). */
  addFigure(id, x, y, scale = 2) {
    const tex = this.players[id - 1].texture;
    return this.add.sprite(x, y, tex, charFrame(tex, 'idle')).setOrigin(0.5, 1).setScale(scale);
  }

  /** Himmel-Verlauf + Berge in der Ferne (für Aussen-Szenen am See). */
  addSkyAndMountains(horizonY, sky = [0x8ccbf0, 0xe4f3fb]) {
    const g = this.add.graphics();
    g.fillGradientStyle(sky[0], sky[0], sky[1], sky[1], 1).fillRect(0, 0, GAME_WIDTH, horizonY);
    this.add.tileSprite(0, horizonY - 150, GAME_WIDTH, 260, 'mountainsFar').setOrigin(0).setScale(1, 0.6);
    this.add.tileSprite(0, horizonY - 110, GAME_WIDTH, 220, 'hills').setOrigin(0).setScale(1, 0.5);
  }
}
