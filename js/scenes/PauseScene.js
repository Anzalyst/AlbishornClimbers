/* =====================================================================
 * PauseScene – Pausenmenü über jeder Spielszene
 *
 * Wird von Albishorn-Leveln (GameScene) und allen Sempach-Minispielen
 * benutzt:
 *   this.scene.pause();
 *   this.scene.launch('PauseScene', { parent: this.scene.key, restart: { … } });
 * Die pausierte Szene braucht eine Methode resumeFromPause().
 *
 * Öffnen:  START (Controller), ESC oder P (Tastatur)
 * Bedienung (beide Spieler, Controller oder Tastatur):
 *   Hoch/Runter  Menüpunkt wählen        Sprung       bestätigen
 *   START / B / ESC / P                  weiterspielen
 *
 * "HAUPTMENÜ" führt zur Spielauswahl (GameSelectScene).
 * Optional: { labels: { title, resume, restart, soundOn, soundOff, mainMenu, help } }
 * – Albishorn Climbers übergibt so die Mundart-Texte (TXT.pause).
 * ===================================================================== */

class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  init(data) {
    this.parentKey = data.parent || 'GameScene';
    this.restartData = data.restart || {};
    this.labels = Object.assign({
      title: 'PAUSE', resume: 'WEITER', restart: 'NEU STARTEN', soundOn: 'TON: AN', soundOff: 'TON: AUS',
      mainMenu: 'HAUPTMENÜ', help: 'SPRUNG = OK   START = WEITER'
    }, data.labels || {});
    this.selected = 0;
    this.closing = false;
  }

  create() {
    this.inputs = createPlayerInputs(this);
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;

    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x05060a, 0.6);
    Comic.panel(this, cx, cy, 420, 280);
    this.add.text(cx, cy - 100, this.labels.title, { fontFamily: FONT, fontSize: '22px', color: '#f7d117', stroke: '#17121f', strokeThickness: 6 }).setOrigin(0.5);

    this.items = [
      { label: () => this.labels.resume, action: () => this.resume() },
      { label: () => this.labels.restart, action: () => this.restart() },
      { label: () => (Sfx.muted ? this.labels.soundOff : this.labels.soundOn), action: () => { Sfx.toggleMute(); this.refresh(); } },
      { label: () => this.labels.mainMenu, action: () => this.toMainMenu() }
    ];
    this.texts = this.items.map((item, i) => this.add.text(cx, cy - 40 + i * 38, '', {
      fontFamily: FONT, fontSize: '14px', color: '#ffffff', stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5));
    this.arrow = this.add.text(0, 0, '▶', { fontFamily: FONT, fontSize: '14px', color: '#f7d117' }).setOrigin(0.5);
    this.add.text(cx, cy + 118, this.labels.help, {
      fontFamily: FONT, fontSize: '8px', color: '#aab4cc'
    }).setOrigin(0.5);

    // Tastatur: ESC und P schliessen die Pause, M schaltet den Ton
    this.input.keyboard.on('keydown-ESC', () => this.resume());
    this.input.keyboard.on('keydown-P', () => this.resume());
    this.input.keyboard.on('keydown-M', () => { Sfx.toggleMute(); this.refresh(); });

    this.refresh();
  }

  refresh() {
    this.texts.forEach((t, i) => t.setText(this.items[i].label()).setColor(i === this.selected ? '#f7d117' : '#ffffff'));
    const sel = this.texts[this.selected];
    this.arrow.setPosition(sel.x - sel.width / 2 - 24, sel.y);
  }

  update() {
    this.inputs.forEach(i => i.update());
    if (this.closing) return;
    const any = action => this.inputs.some(i => i.justPressed(action));

    if (any('up') || any('down')) {
      const n = this.items.length;
      this.selected = (this.selected + (any('down') ? 1 : n - 1)) % n;
      Sfx.play(this, 'select');
      this.refresh();
    }
    if (any('start') || any('back')) this.resume();
    else if (any('jump')) {
      Sfx.play(this, 'select');
      this.items[this.selected].action();
    }
  }

  resume() {
    if (this.closing) return;
    this.closing = true;
    this.scene.stop();
    this.scene.get(this.parentKey).resumeFromPause();
  }

  restart() {
    this.closing = true;
    this.scene.stop();
    this.scene.get(this.parentKey).scene.restart(this.restartData);
  }

  toMainMenu() {
    this.closing = true;
    this.scene.stop(this.parentKey);
    this.scene.start('GameSelectScene');
  }
}
