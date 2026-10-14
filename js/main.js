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
  scene: [BootScene, IntroScene, GameSelectScene, MenuScene, GameScene, VictoryScene, FinaleScene, CreditsScene, EndScene,
    SspMenuScene, PedaloScene, WasserScene, GrillScene, RundkursScene, BrennesselScene, SspScoreScene, SspAwardScene,
    PauseScene]   // zuletzt: wird über der pausierten Szene gezeichnet
};

const game = new Phaser.Game(gameConfig);
