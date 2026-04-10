import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import Coin from '../entities/Coin.js';
import Boss from '../entities/Boss.js';

const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 600;
const CONTENT_SPAWN_STEP = 400;
const CONTENT_SPAWN_AHEAD = 500;
const GROUND_COLLISION_CENTER_Y = 596;

let enemies;
let enemyInstances = [];
let score = 0;
let scoreText;
let lastSpawnX = 0;
let bgMusic;
let musicStarted = false;

function spawnMoreContent(scene, xBase) {
  if (xBase > WORLD_WIDTH - 200) return;

  const baseX = Phaser.Math.Clamp(xBase, 200, WORLD_WIDTH - 200);

  const enemyX1 = Phaser.Math.Clamp(baseX + 40, 120, WORLD_WIDTH - 120);
  enemyInstances.push(new Enemy(scene, enemyX1, 520, enemyX1 - 90, enemyX1 + 90, enemies));

  const chunk = Math.floor(baseX / CONTENT_SPAWN_STEP);
  if (chunk % 2 === 0) {
    const enemyX2 = Phaser.Math.Clamp(baseX + 220, 120, WORLD_WIDTH - 120);
    enemyInstances.push(new Enemy(scene, enemyX2, 520, enemyX2 - 70, enemyX2 + 70, enemies));
  }

  const coinY = [520, 480, 440, 500];
  for (let i = 0; i < coinY.length; i += 1) {
    const coinX = Phaser.Math.Clamp(baseX + 20 + (i * 70), 80, WORLD_WIDTH - 80);
    scene.coinManager.create(coinX, coinY[i]);
  }
}

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

    this.load.spritesheet('enemy', 'assets/enemy.png', {
      frameWidth: 32,
      frameHeight: 40
    });

    this.load.audio('bg-music', 'assets/music.mp3');

    Boss.preload(this);
  }

  create() {
    score = 0;
    lastSpawnX = 400;
    enemyInstances = [];

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

    Enemy.createAnimations(this);

    enemies = this.physics.add.group();

    enemyInstances.push(new Enemy(this, 300, 520, 220, 420, enemies));
    enemyInstances.push(new Enemy(this, 520, 520, 460, 700, enemies));
    enemyInstances.push(new Enemy(this, 700, 520, 620, 780, enemies));

    this.physics.add.collider(enemies, ground);

    this.coinManager = new Coin(this, () => {
      score += 1;
      scoreText.setText('Moedas: ' + score);
    });

    this.coinManager.create(180, 520);
    this.coinManager.create(260, 480);
    this.coinManager.create(420, 520);
    this.coinManager.create(560, 480);
    this.coinManager.create(740, 520);

    this.player.setupColliders(ground, enemies, {
      onEnemyDestroyed: (sprite) => sprite.enemyInstance.die()
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

    enemyInstances.forEach((enemy) => enemy.update());

    if (this.player.sprite.x > lastSpawnX) {
      spawnMoreContent(this, this.player.sprite.x + CONTENT_SPAWN_AHEAD);
      lastSpawnX += CONTENT_SPAWN_STEP;
    }

    this.boss.update(this.player);
  }
}

export default GameScene;
