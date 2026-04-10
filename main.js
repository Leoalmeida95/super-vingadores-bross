import GameScene from './scenes/GameScene.js';

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
      debug: true
    }
  },
  scene: [GameScene]
};

new Phaser.Game(config);

