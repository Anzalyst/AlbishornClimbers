/* =====================================================================
 * main.js – Startet das Spiel
 * ===================================================================== */

const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#10131c',
  pixelArt: true,                       // keine Weichzeichnung → knackige Pixel
  scale: {
    mode: Phaser.Scale.FIT,             // an Fenstergrösse anpassen, Seitenverhältnis bleibt
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: PHYSICS.GRAVITY },
      debug: false                      // auf true setzen, um Hitboxen zu sehen
    }
  },
  scene: [BootScene, IntroScene, MenuScene, GameScene, PauseScene, VictoryScene, FinaleScene, CreditsScene, EndScene]
};

const game = new Phaser.Game(gameConfig);
