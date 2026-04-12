import GameScene from './scenes/GameScene.js';

// Debug flag: set false to hide all entity sprites (game logic continues normally)
window.SPRITES_VISIBLE = true;

const config = {
  parent: 'game-container',
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#222',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 600 },
      debug: false
    }
  },
  scene: [GameScene]
};

new Phaser.Game(config);

