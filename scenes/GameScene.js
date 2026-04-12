import Player from '../entities/Player.js';
import EnemyManager from '../entities/EnemyManager.js';
import Coin from '../entities/Coin.js';
import Boss from '../entities/Boss.js';

const WORLD_WIDTH = 10000;
const WORLD_HEIGHT = 600;
const CONTENT_SPAWN_STEP = 400;
const CONTENT_SPAWN_AHEAD = 500;
const GROUND_COLLISION_CENTER_Y = 596;
const baseEnemyCount = 3;
let currentPhase = 1;
let score = 0;
let coinsCollectedTotal = 0;
let lastLifeMilestone = 0;
let bossSpawned = false;
let bossSpawnCoinsTarget = 50;
let scoreText;
let phaseText;
let bgMusic;
let musicStarted = false;
let floatingPlatforms;

function createFloatingPlatform(scene, x, y) {
  const platform = scene.add.tileSprite(x, y, 120, 28, 'ground');
  platform.setOrigin(0.5);
  platform.setDepth(-1);
  scene.physics.add.existing(platform);
  platform.body.setAllowGravity(false);
  platform.body.setImmovable(true);
  platform.body.setSize(120, 28, true);
  platform.startX = x;
  platform.startY = y;
  platform.range = Phaser.Math.Between(100, 200);
  platform.speed = Phaser.Math.Between(40, 80);
  platform.direction = 1;
  platform.isVertical = Math.random() < 0.3;
  floatingPlatforms.add(platform);

  createBigCoin(scene, x, y - 40);
}

function createBigCoin(scene, x, y) {
  if (!scene.coinManager) return;
  scene.coinManager.createBigCoin(x, y);
}

function getPhaseBackgroundKey(phaseNumber) {
  const bgIndex = ((phaseNumber - 1) % 5) + 1;
  return 'bg' + bgIndex;
}

function startPhase(scene, phaseNumber, options = {}) {
  const { resetProgress = false } = options;
  currentPhase = phaseNumber;
  scene.currentPhase = currentPhase;
  if (scene.bg) {
    scene.bg.setTexture(getPhaseBackgroundKey(currentPhase));
  }
  const extraEnemies = currentPhase * 2;

  if (scene.gameOverText) {
    scene.gameOverText.destroy();
    scene.gameOverText = null;
  }
  if (scene.victoryText) {
    scene.victoryText.destroy();
    scene.victoryText = null;
  }
  if (scene.victorySubText) {
    scene.victorySubText.destroy();
    scene.victorySubText = null;
  }

  scene.physics.resume();

  if (resetProgress) {
    score = 0;
    coinsCollectedTotal = 0;
    lastLifeMilestone = 0;
    scene.player.lives = 100;
  }

  bossSpawned = false;
  bossSpawnCoinsTarget = currentPhase * 100;

  scene.player.isGameOver = false;
  scene.player.isInvulnerable = false;
  scene.player.sprite.setPosition(100, 450);
  scene.player.sprite.setVelocity(0, 0);
  scene.player.sprite.clearTint();
  scene.player.sprite.setAlpha(1);
  if (scene.player.sprite.anims) {
    scene.player.sprite.anims.resume();
    scene.player.sprite.anims.play('idle', true);
  }

  scene.enemyManager.getGroup().clear(true, true);
  scene.enemyManager.instances = [];

  scene.coinManager.group.clear(true, true);
  scene.coinManager.spawnKeys.clear();

  if (floatingPlatforms) {
    floatingPlatforms.clear(true, true);
  }

  scene.lastSpawnX = 400;

  if (scene.boss) {
    if (scene.boss.sprite) {
      scene.boss.sprite.destroy();
      scene.boss.sprite = null;
    }
    if (scene.boss.physicsBody) {
      scene.boss.physicsBody.destroy();
      scene.boss.physicsBody = null;
    }
    if (scene.boss.attackHitbox) {
      scene.boss.attackHitbox.destroy();
      scene.boss.attackHitbox = null;
    }

    scene.boss.spawned = false;
    scene.boss.isDead = false;
    scene.boss.isAttacking = false;
    scene.boss.isDefending = false;
    scene.boss.canAttack = true;
    scene.boss.maxLife = 20 + (currentPhase * 5);
    scene.boss.life = scene.boss.maxLife;
    scene.boss.lifeBg.setVisible(false);
    scene.boss.lifeBar.setVisible(false);
    scene.boss.lifeLabel.setVisible(false);
    scene.boss.lifeBar.width = 300;
    scene.boss.lifeBar.setFillStyle(0x00ff00);
  }

  scene.enemyManager.createInitial(baseEnemyCount, extraEnemies);
  scene.enemyManager.setPhaseDifficulty(currentPhase);
  scene.coinManager.createInitial();

  for (let i = 1; i <= 3; i += 1) {
    const x = i * 1000;
    const y = Phaser.Math.Between(380, 410);
    createFloatingPlatform(scene, x, y);
  }

  scene.player.livesText.setText('Vidas: ' + scene.player.lives);
  scoreText.setText('Moedas: ' + score);
  phaseText.setText('Fase ' + currentPhase);
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

    this.load.spritesheet('hulk_special_sheet', 'assets/hulk.png', {
      frameWidth: 128,
      frameHeight: 256
    });

    this.load.spritesheet('enemy', 'assets/enemy.png', {
      frameWidth: 32,
      frameHeight: 40
    });

    this.load.audio('bg-music', 'assets/sounds/music.mp3');
    this.load.audio('thanos-spawn-laugh', 'assets/sounds/muahaha.mp3');

    Boss.preload(this);
  }

  create() {
    this.lastSpawnX = 400;

    const bgKey = getPhaseBackgroundKey(currentPhase);
    this.bg = this.add.image(0, 0, bgKey);
    this.bg.setOrigin(0, 0);
    this.bg.setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT);
    this.bg.setDepth(-100);
    this.bg.setScrollFactor(0.5);

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

    floatingPlatforms = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });
    this.physics.add.collider(this.player.sprite, floatingPlatforms, (playerObj, platform) => {
      const isOnTop =
        playerObj.body.touching.down &&
        platform.body.touching.up;

      if (isOnTop) {
        playerObj.setVelocityX(
          playerObj.body.velocity.x + platform.body.velocity.x
        );
      }
    });

    this.enemyManager = new EnemyManager(this, ground);

    this.coinManager = new Coin(this, (coinX, coinY, coinValue = 1) => {
      score += coinValue;
      coinsCollectedTotal += coinValue;
      scoreText.setText('Moedas: ' + score);

      if (coinsCollectedTotal >= lastLifeMilestone + 25) {
        lastLifeMilestone += 25;
        this.player.addLife();
      }

      if (coinsCollectedTotal >= bossSpawnCoinsTarget && !bossSpawned) {
        bossSpawned = true;
        this.sound.play('thanos-spawn-laugh', { volume: 0.8 });
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

    phaseText = this.add.text(400, 100, 'Fase ' + currentPhase, {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    phaseText.setOrigin(0.5);
    phaseText.setScrollFactor(0);
    phaseText.setDepth(1001);

    const hudBg = this.add.rectangle(0, 0, 250, 76, 0x000000, 0.32);
    hudBg.setOrigin(0, 0);
    hudBg.setScrollFactor(0);
    hudBg.setDepth(1000);

    this.startPhase = (phaseNumber, options = {}) => {
      currentPhase = phaseNumber;
      startPhase(this, currentPhase, options);
    };

    this.startPhase(currentPhase, { resetProgress: true });

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
    floatingPlatforms.children.iterate((platform) => {
      if (!platform || !platform.body) return;

      if (platform.isVertical) {
        platform.body.setVelocityX(0);
        platform.body.setVelocityY(platform.speed * platform.direction);

        if (platform.y >= platform.startY + platform.range) {
          platform.direction = -1;
        } else if (platform.y <= platform.startY - platform.range) {
          platform.direction = 1;
        }
      } else {
        platform.body.setVelocityY(0);
        platform.body.setVelocityX(platform.speed * platform.direction);

        if (platform.x >= platform.startX + platform.range) {
          platform.direction = -1;
        } else if (platform.x <= platform.startX - platform.range) {
          platform.direction = 1;
        }
      }
    });

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
    this._enforceSpriteVisibility(window.SPRITES_VISIBLE !== false);
  }

  _enforceSpriteVisibility(visible) {
    if (this.player && this.player.sprite) {
      this.player.sprite.setVisible(visible);
    }
    if (this.player && this.player._specialVisualSprite) {
      this.player._specialVisualSprite.setVisible(visible);
    }
    if (this.boss && this.boss.sprite) {
      this.boss.sprite.setVisible(visible);
    }
    this.enemyManager.instances.forEach((enemy) => {
      if (enemy.sprite && enemy.sprite.active) {
        enemy.sprite.setVisible(visible);
      }
    });
    this.coinManager.group.getChildren().forEach((coin) => {
      if (coin && coin.active && !coin.collected) {
        coin.setVisible(visible);
      }
    });
  }
}

export default GameScene;
