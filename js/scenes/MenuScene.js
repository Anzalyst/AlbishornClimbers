/* =====================================================================
 * MenuScene – Startbildschirm von Albishorn Climbers & Passwort-Eingabe
 *
 * Bedienung (beide Spieler, Tastatur oder Controller):
 *   Hoch/Runter  Menüpunkt wählen        Sprung / Start  bestätigen
 *   Menüpunkte: Spiel starten, Passwort, Chopfnüss (Bonus-Rätsel), Hauptmenü
 *   ESC / Controller-B                   zurück zur Spielauswahl
 * Passwort-Modus (wie bei Aladdin auf dem SNES):
 *   Links/Rechts Stelle wechseln         Hoch/Runter     Ziffer ändern
 *   Ziffern 0–9  direkt tippen           Sprung          Code prüfen
 *   ESC / Backspace / Controller-B       zurück bzw. Ziffer löschen
 * ===================================================================== */

class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.inputs = createPlayerInputs(this);
    this.backdrop = addBackdrop(this);
    this.mode = 'main';          // 'main' | 'password'
    this.starting = false;
    this.selected = 0;
    this.digits = [0, 0, 0, 0];
    this.cursor = 0;

    this.createTitle();
    this.createMainMenu();
    this.createPasswordPanel();
    this.createFooter();
    this.refresh();

    // Direkte Zifferneingabe per Tastatur
    this.onKey = event => this.handleKey(event);
    this.input.keyboard.on('keydown', this.onKey);
    this.events.once('shutdown', () => this.input.keyboard.off('keydown', this.onKey));

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  // ---------------------------------------------------------------------
  // Aufbau
  // ---------------------------------------------------------------------
  createTitle() {
    const cx = GAME_WIDTH / 2;
    this.add.text(cx + 4, 74, 'ALBISHORN\nCLIMBERS', {
      fontFamily: FONT, fontSize: '44px', color: '#000000', align: 'center', lineSpacing: 10
    }).setOrigin(0.5).setAlpha(0.35);
    const title = this.add.text(cx, 70, 'ALBISHORN\nCLIMBERS', {
      fontFamily: FONT, fontSize: '44px', color: '#f7d117', align: 'center', lineSpacing: 10,
      stroke: '#5b2d1a', strokeThickness: 8
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, y: 76, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.add.text(cx, 150, TXT.menuSubtitle, {
      fontFamily: FONT, fontSize: '12px', color: '#ffffff', stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5);

    // Die beiden Geschwister laufen auf der Stelle
    [['hiker1', cx - 330], ['hiker2', cx + 330]].forEach(([key, x], i) => {
      this.add.sprite(x, 300, key, 0).setScale(3).setFlipX(i === 1).play(`${key}-walk`);
    });
  }

  createMainMenu() {
    this.menuItems = TXT.menuItems.map((label, i) =>
      this.add.text(GAME_WIDTH / 2, 260 + i * 50, label, {
        fontFamily: FONT, fontSize: '18px', color: '#ffffff', stroke: '#000000', strokeThickness: 5
      }).setOrigin(0.5));
    this.menuArrow = this.add.text(0, 0, '▶', {
      fontFamily: FONT, fontSize: '18px', color: '#f7d117', stroke: '#000000', strokeThickness: 5
    }).setOrigin(0.5);
  }

  createPasswordPanel() {
    const cx = GAME_WIDTH / 2;
    this.pwPanel = this.add.container(cx, 300);
    this.pwPanel.add(this.add.rectangle(0, 0, 440, 210, 0x10131c, 0.9).setStrokeStyle(3, 0xf7d117));
    this.pwPanel.add(this.add.text(0, -78, TXT.passwordTitle, {
      fontFamily: FONT, fontSize: '14px', color: '#f7d117'
    }).setOrigin(0.5));

    this.digitBoxes = [];
    this.digitTexts = [];
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * 76;
      const box = this.add.rectangle(x, -6, 60, 72, 0x22283a).setStrokeStyle(3, 0x5a6480);
      const txt = this.add.text(x, -4, '0', { fontFamily: FONT, fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
      this.pwPanel.add([box, txt]);
      this.digitBoxes.push(box);
      this.digitTexts.push(txt);
    }
    this.pwArrows = this.add.text(0, -6, '▲\n\n\n\n▼', {
      fontFamily: FONT, fontSize: '10px', color: '#f7d117', align: 'center', lineSpacing: 2
    }).setOrigin(0.5);
    this.pwPanel.add(this.pwArrows);

    this.pwMessage = this.add.text(0, 58, '', {
      fontFamily: FONT, fontSize: '10px', color: '#ff8080'
    }).setOrigin(0.5);
    this.pwPanel.add(this.pwMessage);
    this.pwPanel.add(this.add.text(0, 86, TXT.passwordHelp, {
      fontFamily: FONT, fontSize: '8px', color: '#aab4cc'
    }).setOrigin(0.5));
  }

  createFooter() {
    const style = color => ({ fontFamily: FONT, fontSize: '9px', color, stroke: '#000000', strokeThickness: 3, lineSpacing: 6 });
    const [p1, p2] = PLAYER_DEFS.map(d => d.name.toUpperCase());
    this.add.text(40, GAME_HEIGHT - 70, `${p1}\n${TXT.footerKeys1}\nController 1`, style(PLAYER_DEFS[0].colorCss));
    this.add.text(GAME_WIDTH - 40, GAME_HEIGHT - 70, `${p2}\n${TXT.footerKeys2}\nController 2`, style(PLAYER_DEFS[1].colorCss))
      .setOrigin(1, 0);
    this.padStatus = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 26, '', style('#ffffff')).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50, `© ${CONSOLE.name} – ${CONSOLE.fullName}`, style('#aab4cc')).setOrigin(0.5);
  }

  // ---------------------------------------------------------------------
  // Darstellung aktualisieren
  // ---------------------------------------------------------------------
  refresh() {
    const inMain = this.mode === 'main';
    this.menuItems.forEach((t, i) => {
      t.setVisible(inMain).setColor(i === this.selected ? '#f7d117' : '#ffffff');
    });
    this.menuArrow.setVisible(inMain);
    const sel = this.menuItems[this.selected];
    this.menuArrow.setPosition(sel.x - sel.width / 2 - 30, sel.y);

    this.pwPanel.setVisible(!inMain);
    this.digitTexts.forEach((t, i) => t.setText(String(this.digits[i])));
    this.digitBoxes.forEach((b, i) => b.setStrokeStyle(3, i === this.cursor ? 0xf7d117 : 0x5a6480));
    this.pwArrows.setX((this.cursor - 1.5) * 76);
  }

  // ---------------------------------------------------------------------
  // Eingabe
  // ---------------------------------------------------------------------
  /** true, wenn IRGENDEIN Spieler die Aktion gerade gedrückt hat. */
  anyPressed(action) {
    return this.inputs.some(i => i.justPressed(action));
  }

  update(time, delta) {
    this.inputs.forEach(i => i.update());
    this.backdrop.update(this.cameras.main, GAME_HEIGHT, delta);

    const pads = this.inputs.map((inp, i) => `Controller ${i + 1}: ${inp.hasPad ? 'OK' : '–'}`);
    this.padStatus.setText(pads.join('     ') + (Sfx.muted ? `     ${TXT.soundIsOff}` : `     ${TXT.soundOffHint}`));

    if (this.mode === 'main') this.updateMain();
    else this.updatePassword();
  }

  updateMain() {
    if (this.anyPressed('up') || this.anyPressed('down')) {
      const n = this.menuItems.length;
      this.selected = (this.selected + (this.anyPressed('down') ? 1 : n - 1)) % n;
      Sfx.play(this, 'select');
      this.refresh();
    }
    if (this.anyPressed('jump') || this.anyPressed('start')) {
      Sfx.play(this, 'select');
      if (this.selected === 0) this.startScene('IntroScene', { mode: 'story' });   // Story, dann Level 1
      else if (this.selected === 1) this.openPassword();
      else if (this.selected === 2) this.startLevel(STORY_LEVELS);                // erste Chopfnuss
      else this.startScene('GameSelectScene');
    } else if (this.anyPressed('back')) {
      this.startScene('GameSelectScene');
    }
  }

  updatePassword() {
    if (this.anyPressed('left')) this.moveCursor(-1);
    if (this.anyPressed('right')) this.moveCursor(1);
    if (this.anyPressed('up')) this.changeDigit(1);
    if (this.anyPressed('down')) this.changeDigit(-1);
    if (this.anyPressed('back')) this.closePassword();
    if (this.anyPressed('jump') || this.anyPressed('start')) this.submitPassword();
  }

  /** Tastatur-Events (Ziffern, Backspace, ESC). */
  handleKey(event) {
    if (/^[0-9]$/.test(event.key)) {
      if (this.mode !== 'password') this.openPassword();
      this.digits[this.cursor] = Number(event.key);
      this.moveCursor(1);
    } else if (event.key === 'Backspace' && this.mode === 'password') {
      this.moveCursor(-1);
      this.digits[this.cursor] = 0;
      this.refresh();
    } else if (event.key === 'Escape' && this.mode === 'password') {
      this.closePassword();
    } else if (event.key === 'Escape') {
      this.startScene('GameSelectScene');
    } else if (event.key === 'm' || event.key === 'M') {
      Sfx.toggleMute();
      this.refresh();
    }
  }

  openPassword() {
    this.mode = 'password';
    this.cursor = 0;
    this.pwMessage.setText('');
    this.refresh();
  }

  closePassword() {
    this.mode = 'main';
    this.refresh();
  }

  moveCursor(step) {
    this.cursor = Phaser.Math.Clamp(this.cursor + step, 0, 3);
    Sfx.play(this, 'select');
    this.refresh();
  }

  changeDigit(step) {
    this.digits[this.cursor] = (this.digits[this.cursor] + step + 10) % 10;
    Sfx.play(this, 'select');
    this.refresh();
  }

  submitPassword() {
    const code = this.digits.join('');
    if (code === BIRTHDAY.secretCode) {
      // Geheim-Code: direkt zur Geburtstagsfeier
      this.pwMessage.setColor('#ff7ad9').setText(TXT.passwordSecret);
      Sfx.play(this, 'win');
      this.time.delayedCall(900, () => this.startScene('FinaleScene'));
      return;
    }
    const levelIndex = Passwords.findLevel(code);
    if (levelIndex >= 0) {
      this.pwMessage.setColor('#7dff9a').setText(`${levelLabel(levelIndex)}: ${LEVELS[levelIndex].name}`);
      Sfx.play(this, 'checkpoint');
      this.time.delayedCall(700, () => this.startLevel(levelIndex));
    } else {
      this.pwMessage.setColor('#ff8080').setText(TXT.passwordWrong);
      this.cursor = 0;            // neu tippen beginnt wieder bei der ersten Stelle
      this.refresh();
      Sfx.play(this, 'error');
      this.tweens.add({ targets: this.pwPanel, x: this.pwPanel.x + 8, duration: 50, yoyo: true, repeat: 3 });
    }
  }

  startLevel(levelIndex) {
    this.startScene('GameScene', { levelIndex });
  }

  startScene(key, data) {
    if (this.starting) return;
    this.starting = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => startWithLoading(this, key, data));
  }
}
