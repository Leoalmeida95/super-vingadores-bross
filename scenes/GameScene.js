import Player from '../entities/Player.js';
import EnemyManager from '../entities/EnemyManager.js';
import Coin from '../entities/Coin.js';
import Boss from '../entities/Boss.js';

const WORLD_WIDTH = 10000;
const WORLD_HEIGHT = 600;
const CONTENT_SPAWN_STEP = 400;
const CONTENT_SPAWN_AHEAD = 500;
const GROUND_COLLISION_CENTER_Y = 596;
let score = 0;
let coinsCollectedTotal = 0;
let lastLifeMilestone = 0;
let scoreText;
let bgMusic;
let musicStarted = false;

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.load.image('bg1', 'assets/citys/city 1.png');
    this.load.image('bg2', 'assets/citys/city 2.png');
    this.load.image('bg3', 'assets/citys/city 3.png');
    this.load.image('bg4', 'assets/citys/city 4.png');
    this.load.image('bg5', 'assets/citys/city 5.png');
    this.load.image('ground', 'assets/citys/city_ground.png');

    this.load.spritesheet('hulk', 'assets/hulk.png', {
      frameWidth: 128,
      frameHeight: 128
    });

    this.load.spritesheet('hulk_special_sheet', 'assets/hulk.png', {
      frameWidth: 128,
      frameHeight: 256
    });

    this.load.spritesheet('enemy', 'assets/enemy.png', {
      frameWidth: 32,
      frameHeight: 40
    });

    this.load.audio('bg-music', 'assets/music.mp3');

    Boss.preload(this);
  }

  create() {
    score = 0;
    coinsCollectedTotal = 0;
    lastLifeMilestone = 0;
    this.lastSpawnX = 400;

    const bgKey = 'bg' + Phaser.Math.Between(1, 5);
    const bg = this.add.image(0, 0, bgKey);
    bg.setOrigin(0, 0);
    bg.setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT);
    bg.setDepth(-100);
    bg.setScrollFactor(0.5);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const groundVisual = this.add.tileSprite(0, 560, WORLD_WIDTH, 40, 'ground');
    groundVisual.setOrigin(0, 0);
    groundVisual.setDepth(-1);

    const groundBody = this.add.rectangle(WORLD_WIDTH / 2, GROUND_COLLISION_CENTER_Y, WORLD_WIDTH, 40);
    groundBody.setAlpha(0);
    this.physics.add.existing(groundBody, true);
    const ground = groundBody;

    this.player = new Player(this);
    this.boss = new Boss(this);

    this.enemyManager = new EnemyManager(this, ground);
    this.enemyManager.createInitial();

    this.coinManager = new Coin(this, () => {
      score += 1;
      coinsCollectedTotal += 1;
      scoreText.setText('Moedas: ' + score);

      if (coinsCollectedTotal >= lastLifeMilestone + 10) {
        lastLifeMilestone += 10;
        this.player.addLife();
      }

      if (coinsCollectedTotal === 50 && !this.boss.spawned) {
        const warning = this.add.text(400, 200, '⚠️ Thanos está chegando!', {
          fontSize: '32px',
          color: '#ff4444',
          fontStyle: 'bold'
        });
        warning.setOrigin(0.5);
        warning.setScrollFactor(0);
        warning.setDepth(1100);
        this.tweens.add({
          targets: warning,
          alpha: 0,
          duration: 2500,
          delay: 1000,
          ease: 'Linear',
          onComplete: () => warning.destroy()
        });
        this.time.delayedCall(1500, () => {
          this.boss.triggerSpawn(this.player);
        });
      }
    });

    this.coinManager.createInitial();

    this.player.setupColliders(ground, this.enemyManager.getGroup(), {
      onEnemyDestroyed: (sprite) => this.enemyManager.handleEnemyDestroyed(sprite)
    });
    this.coinManager.setupCollection(this.player.sprite);

    scoreText = this.add.text(20, 44, 'Moedas: ' + score, {
      fontSize: '24px',
      color: '#ffff66'
    });
    scoreText.setScrollFactor(0);
    scoreText.setDepth(1001);

    const hudBg = this.add.rectangle(0, 0, 250, 76, 0x000000, 0.32);
    hudBg.setOrigin(0, 0);
    hudBg.setScrollFactor(0);
    hudBg.setDepth(1000);

    if (!bgMusic) {
      bgMusic = this.sound.add('bg-music', {
        loop: true,
        volume: 0.3
      });
    }

    if (bgMusic.isPlaying) {
      musicStarted = true;
    }

    const startMusicOnce = () => {
      if (musicStarted || !bgMusic) return;
      bgMusic.play();
      musicStarted = true;
    };

    this.input.keyboard.once('keydown', startMusicOnce);
    this.input.once('pointerdown', startMusicOnce);
  }

  update() {
    this.player.update();

    if (this.player.isGameOver) return;

    this.enemyManager.update();

    if (this.player.sprite.x > this.lastSpawnX) {
      const baseX = Phaser.Math.Clamp(this.player.sprite.x + CONTENT_SPAWN_AHEAD, 200, WORLD_WIDTH - 200);
      this.enemyManager.spawnChunk(baseX, WORLD_WIDTH);
      this.coinManager.spawnChunk(baseX, WORLD_WIDTH);
      this.lastSpawnX += CONTENT_SPAWN_STEP;
    }

    this.boss.update(this.player);
  }
}

export default GameScene;
