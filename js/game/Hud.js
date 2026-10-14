/* =====================================================================
 * Hud.js – Anzeigen der GameScene (fest am Bildschirm)
 *
 *   const hud = new Hud(scene, levelIndex, level);
 *   hud.setFlowers(collected, total)   Edelweiss-Zähler
 *   hud.update(players)                Spielerstatus (Controller, am Ziel)
 *   hud.toast(text, color)             kurze Meldung in der Bildmitte
 *   hud.showLevelIntro()               Banner mit Levelname, Passwort, Anekdote
 *   hud.updateInfoSigns(signs, players) Hinweisbox der Infotafeln
 * ===================================================================== */

class Hud {
  constructor(scene, levelIndex, level) {
    this.scene = scene;
    this.levelIndex = levelIndex;
    this.level = level;

    const style = (size, color = '#ffffff') => ({
      fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#000000', strokeThickness: 4
    });
    const hud = obj => obj.setScrollFactor(0).setDepth(DEPTH.HUD);

    // halbtransparente Panels hinter den Texten
    const panels = hud(scene.add.graphics());
    panels.fillStyle(0x0b1020, 0.38).fillRoundedRect(8, 8, 470, 70, 10);
    panels.fillStyle(0x0b1020, 0.38).fillRoundedRect(GAME_WIDTH - 178, 32, 170, 30, 10);

    hud(scene.add.text(18, 16, `LEVEL ${levelIndex + 1}  ${level.name}`, style(12)));
    hud(scene.add.text(GAME_WIDTH - 16, 12, 'ESC/START Pause  R Neustart  M Ton', style(8, '#dddddd')).setOrigin(1, 0));

    // Edelweiss-Zähler
    hud(scene.add.image(GAME_WIDTH - 150, 47, 'edelweiss').setScale(1.4));
    this.flowerText = hud(scene.add.text(GAME_WIDTH - 132, 39, '', style(12)));

    // Status pro Spieler (Controller verbunden? Am Ziel?)
    this.playerHud = PLAYER_DEFS.map((def, i) =>
      hud(scene.add.text(18, 38 + i * 18, '', style(10, def.colorCss))));

    // Hinweisbox unten (Infotafeln – nur in Level 1)
    this.hintBox = hud(scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 44, GAME_WIDTH - 80, 56, 0x10131c, 0.85)
      .setStrokeStyle(2, 0xf7d117)).setVisible(false);
    this.hintText = hud(scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 44, '', {
      fontFamily: FONT, fontSize: '10px', color: '#ffffff', align: 'center',
      wordWrap: { width: GAME_WIDTH - 120 }, lineSpacing: 6
    }).setOrigin(0.5)).setVisible(false);

    // Kurze Meldungen in der Bildschirmmitte ("Tor offen!" usw.)
    this.toastText = hud(scene.add.text(GAME_WIDTH / 2, 112, '', style(14, '#f7d117')).setOrigin(0.5).setAlpha(0));
  }

  setFlowers(collected, total) {
    this.flowerText.setText(`${collected}/${total}`);
  }

  update(players) {
    players.forEach((p, i) => {
      const pad = p.input.hasPad ? ' [PAD]' : '';
      const status = p.atGoal ? '  ✔ AM ZIEL' : '';
      this.playerHud[i].setText(`${p.def.name.toUpperCase()}${pad}${status}`);
    });
  }

  toast(message, color = '#f7d117') {
    const tweens = this.scene.tweens;
    this.toastText.setText(message).setColor(color).setAlpha(1).setScale(0.6);
    tweens.killTweensOf(this.toastText);
    tweens.add({ targets: this.toastText, scale: 1, duration: 220, ease: 'Back.out' });
    tweens.add({ targets: this.toastText, alpha: 0, delay: 1800, duration: 400 });
  }

  /** Levelname, Passwort und eine Erinnerung an die Kindheits-Wanderung. */
  showLevelIntro() {
    const scene = this.scene;
    const banner = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40).setScrollFactor(0).setDepth(DEPTH.HUD + 1);
    const anecdote = this.level.anecdote ? fillNames(this.level.anecdote) : '';
    const h = anecdote ? 176 : 130;
    const bg = scene.add.graphics();
    bg.fillStyle(0x0b1020, 0.82).fillRoundedRect(-320, -h / 2, 640, h, 16);
    bg.lineStyle(2, 0xf7d117, 0.9).strokeRoundedRect(-320, -h / 2, 640, h, 16);
    banner.add(bg);
    const top = -h / 2;
    banner.add(scene.add.text(0, top + 32, `LEVEL ${this.levelIndex + 1}`, {
      fontFamily: FONT, fontSize: '22px', color: '#f7d117'
    }).setOrigin(0.5));
    banner.add(scene.add.text(0, top + 68, this.level.name, { fontFamily: FONT, fontSize: '14px', color: '#ffffff' }).setOrigin(0.5));
    banner.add(scene.add.text(0, top + 96, `Passwort: ${this.level.password}`, {
      fontFamily: FONT, fontSize: '9px', color: '#aab4cc'
    }).setOrigin(0.5));
    if (anecdote) {
      banner.add(scene.add.text(0, top + 136, `„${anecdote}“`, {
        fontFamily: FONT, fontSize: '9px', color: '#ffe9a8', align: 'center', wordWrap: { width: 560 }, lineSpacing: 6
      }).setOrigin(0.5));
    }
    banner.setAlpha(0).setScale(0.92);
    scene.tweens.add({ targets: banner, alpha: 1, scale: 1, duration: 350, ease: 'Back.out' });
    scene.tweens.add({ targets: banner, alpha: 0, delay: anecdote ? 4200 : 2600, duration: 500, onComplete: () => banner.destroy() });
    Sfx.play(scene, 'levelStart');
  }

  /** Hinweisbox zeigen, solange ein Spieler bei einer Infotafel steht. */
  updateInfoSigns(signs, players) {
    let shown = null;
    signs.forEach(sign => {
      if (!sign.text) return;
      const near = players.some(p => Math.abs(p.sprite.x - sign.x) < 48 && Math.abs(p.sprite.y - sign.y) < 64);
      if (near) shown = sign;
    });
    this.hintBox.setVisible(!!shown);
    this.hintText.setVisible(!!shown);
    if (shown && this.hintText.text !== shown.text) {
      this.hintText.setText(shown.text);
      // Box an die Textlänge anpassen; Unterkante bleibt am Bildschirmrand
      const h = this.hintText.height + 28;
      const cy = GAME_HEIGHT - 16 - h / 2;
      this.hintBox.setSize(GAME_WIDTH - 80, h).setPosition(GAME_WIDTH / 2, cy);
      this.hintText.setY(cy);
    }
  }
}
