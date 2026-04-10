import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import Coin from '../entities/Coin.js';

const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 600;
const CONTENT_SPAWN_STEP = 400;
const CONTENT_SPAWN_AHEAD = 500;

let enemies;
let enemyInstances = [];
let score = 0;
let scoreText;
let boss;
let bossSprite;
let bossAttackHitbox;
let bossSpawned = false;
const GROUND_COLLISION_CENTER_Y = 596;
const BOSS_GROUND_Y = 576;
const BOSS_VISUAL_X_ADJUST = 10;
const BOSS_VISUAL_Y_ADJUST = -14;
let thanosAnimations = {
  idle: [],
  walk: [],
  run: [],
  hit: [],
  death: [],
  attack: {},
  defense: {},
  special: {}
};
let lastSpawnX = 0;
let bgMusic;
let musicStarted = false;
let bossLifeBg;
let bossLifeBar;
let lastAttackIndex = -1;
let lastDefenseIndex = -1;
let lastSpecialIndex = -1;

function loadThanosAnimation(scene, path, keyPrefix, frameFiles) {
  const keys = [];
  const sortedFiles = [...frameFiles].sort((a, b) => {
    return Number(a.replace('.png', '')) - Number(b.replace('.png', ''));
  });

  sortedFiles.forEach((fileName) => {
    const frameNumber = fileName.replace('.png', '');
    const frameKey = keyPrefix + '_' + frameNumber;
    scene.load.image(frameKey, path + '/' + fileName);
    keys.push(frameKey);
  });

  return keys;
}

function loadThanosAnimationVariants(scene, basePath, keyPrefix, variants) {
  const result = {};

  Object.keys(variants)
    .sort((a, b) => Number(a) - Number(b))
    .forEach((variantKey) => {
      result[variantKey] = loadThanosAnimation(
        scene,
        basePath + '/' + variantKey,
        keyPrefix + '_' + variantKey,
        variants[variantKey]
      );
    });

  return result;
}

function createThanosAnimations(scene) {
  const simpleConfigs = {
    idle: { frameRate: 6, repeat: -1 },
    walk: { frameRate: 10, repeat: -1 },
    run: { frameRate: 12, repeat: -1 },
    hit: { frameRate: 10, repeat: 0 },
    death: { frameRate: 8, repeat: 0 }
  };

  Object.keys(simpleConfigs).forEach((type) => {
    const frameKeys = thanosAnimations[type] || [];
    const animationKey = 'thanos_' + type;
    if (frameKeys.length === 0 || scene.anims.exists(animationKey)) return;

    scene.anims.create({
      key: animationKey,
      frames: frameKeys.map((frameKey) => ({ key: frameKey })),
      frameRate: simpleConfigs[type].frameRate,
      repeat: simpleConfigs[type].repeat
    });
  });

  const variantConfigs = {
    attack: { frameRate: 14, repeat: 0 },
    defense: { frameRate: 14, repeat: 0 },
    special: { frameRate: 14, repeat: 0 }
  };

  Object.keys(variantConfigs).forEach((type) => {
    const variants = thanosAnimations[type] || {};
    Object.keys(variants).forEach((variant) => {
      const frameKeys = variants[variant] || [];
      const animationKey = 'thanos_' + type + '_' + variant;
      if (frameKeys.length === 0 || scene.anims.exists(animationKey)) return;

      scene.anims.create({
        key: animationKey,
        frames: frameKeys.map((frameKey) => ({ key: frameKey })),
        frameRate: variantConfigs[type].frameRate,
        repeat: variantConfigs[type].repeat
      });
    });
  });
}

function getRandomIndexWithoutRepeat(min, max, lastIndex) {
  if (min === max) return min;
  let next;
  do {
    next = Phaser.Math.Between(min, max);
  } while (next === lastIndex);
  return next;
}

function playThanosAnimation(bossSprite, animationType) {
  if (!bossSprite || !bossSprite.anims) return;

  const hasVariants = animationType === 'attack' || animationType === 'defense' || animationType === 'special';
  let animationKey = 'thanos_' + animationType;

  if (hasVariants) {
    const variants = Object.keys(thanosAnimations[animationType] || {});
    if (variants.length === 0) return;

    let variantIndex;
    if (animationType === 'attack') {
      variantIndex = getRandomIndexWithoutRepeat(1, 5, lastAttackIndex);
      lastAttackIndex = variantIndex;
    } else if (animationType === 'defense') {
      variantIndex = getRandomIndexWithoutRepeat(1, 2, lastDefenseIndex);
      lastDefenseIndex = variantIndex;
    } else {
      variantIndex = getRandomIndexWithoutRepeat(1, 3, lastSpecialIndex);
      lastSpecialIndex = variantIndex;
    }

    animationKey = 'thanos_' + animationType + '_' + variantIndex;
  }

  if (bossSprite.anims.currentAnim && bossSprite.anims.currentAnim.key === animationKey) return;
  bossSprite.play(animationKey);
}

function performBossAttack(scene) {
  if (scene.player.isGameOver || !boss || !boss.body || !bossSprite || !bossAttackHitbox || !bossAttackHitbox.body) return;
  if (!boss.bossCanAttack || boss.bossIsAttacking || boss.bossIsDefending) return;

  boss.bossIsAttacking = true;
  boss.bossCanAttack = false;
  boss.body.setVelocityX(0);

  const isSpecial = boss.bossAttackStep === 1;

  if (isSpecial) {
    playThanosAnimation(bossSprite, 'special');
  } else {
    playThanosAnimation(bossSprite, 'attack');
  }

  boss.bossAttackStep = (boss.bossAttackStep + 1) > 1 ? 0 : boss.bossAttackStep + 1;

  const offsetX = boss.bossDirection === 1 ? 80 : -80;
  bossAttackHitbox.setPosition(boss.x + offsetX, boss.y - 65);

  if (isSpecial) {
    bossAttackHitbox.width = 135;
  } else {
    bossAttackHitbox.width = 90;
  }
  bossAttackHitbox.body.setSize(bossAttackHitbox.width, 85);
  bossAttackHitbox.body.enable = true;
  bossAttackHitbox.body.updateFromGameObject();

  const hitboxDuration = isSpecial ? 500 : 300;
  scene.time.delayedCall(hitboxDuration, () => {
    if (bossAttackHitbox && bossAttackHitbox.body) {
      bossAttackHitbox.body.enable = false;
    }
  });

  scene.time.delayedCall(isSpecial ? 700 : 500, () => {
    if (boss) boss.bossIsAttacking = false;
  });

  scene.time.delayedCall(boss.bossAttackCooldown, () => {
    if (boss) boss.bossCanAttack = true;
  });
}

function spawnBoss(scene) {
  if (bossSpawned) return;
  bossSpawned = true;

  const x = WORLD_WIDTH - 150;
  const y = BOSS_GROUND_Y;

  boss = scene.physics.add.image(x, y, 'thanos_idle');
  boss.setVisible(false);
  boss.y = BOSS_GROUND_Y;
  boss.setScale(1.5);
  boss.body.setSize(boss.displayWidth * 0.6, boss.displayHeight * 0.85, true);
  boss.body.setOffset(
    boss.displayWidth * 0.2,
    boss.displayHeight * 0.15
  );
  boss.body.setAllowGravity(false);
  boss.body.setImmovable(true);
  boss.body.setCollideWorldBounds(true);
  boss.bossState = 'idle';
  boss.bossSpeed = 60;
  boss.bossDirection = -1;
  boss.bossIsAttacking = false;
  boss.bossIsDefending = false;
  boss.bossCanAttack = true;
  boss.bossAttackCooldown = 2000;
  boss.bossAttackStep = 0;
  boss.bossLife = 20;
  boss.bossMaxLife = 20;
  boss.bossIsDead = false;
  boss.body.setVelocityX(0);

  bossAttackHitbox = scene.add.rectangle(x, y - 65, 90, 85, 0xff0000, 0.35);
  scene.physics.add.existing(bossAttackHitbox);
  bossAttackHitbox.body.setAllowGravity(false);
  bossAttackHitbox.body.setImmovable(true);
  bossAttackHitbox.body.enable = false;
  bossAttackHitbox.setVisible(false);

  scene.physics.add.overlap(bossAttackHitbox, scene.player.sprite, () => {
    if (scene.player.isGameOver || !boss || !bossAttackHitbox || !bossAttackHitbox.body.enable) return;
    scene.player.takeDamage();
  });

  scene.physics.add.overlap(scene.player.attackHitbox, boss, (hitbox, b) => {
    if (!hitbox.body.enable || !boss || boss.bossIsDead) return;
    damageBoss(scene, 1);
  });

  const initialFrameKey = thanosAnimations.idle[0] || 'thanos_idle';
  bossSprite = scene.add.sprite(x, y, initialFrameKey);
  bossSprite.setOrigin(0.5, 1);
  bossSprite.setScale(1.5);
  bossSprite.setDepth(10);
  bossSprite.x = boss.x + BOSS_VISUAL_X_ADJUST;
  bossSprite.y = boss.y + BOSS_VISUAL_Y_ADJUST;

  playThanosAnimation(bossSprite, 'idle');

  if (bossLifeBg) bossLifeBg.setVisible(true);
  if (bossLifeBar) bossLifeBar.setVisible(true);
}

function updateBossLifeBar() {
  if (!boss || boss.bossIsDead || !bossLifeBar) return;
  const lifePercent = boss.bossLife / boss.bossMaxLife;
  bossLifeBar.width = 300 * lifePercent;

  if (lifePercent > 0.5) {
    bossLifeBar.setFillStyle(0x00ff00);
  } else if (lifePercent > 0.25) {
    bossLifeBar.setFillStyle(0xffff00);
  } else {
    bossLifeBar.setFillStyle(0xff3300);
  }
}

function damageBoss(scene, damage) {
  if (!boss || boss.bossIsDead || boss.bossIsDefending) return;

  boss.bossLife -= damage;
  boss.body.setVelocityX(0);

  bossSprite.setTint(0xff0000);
  scene.time.delayedCall(100, () => {
    if (bossSprite) bossSprite.clearTint();
  });

  playThanosAnimation(bossSprite, 'hit');
  updateBossLifeBar();

  if (boss.bossLife <= 0) {
    killBoss(scene);
  }
}

function killBoss(scene) {
  if (!boss) return;
  boss.bossIsDead = true;
  boss.bossIsAttacking = false;
  boss.body.setVelocity(0, 0);
  boss.body.enable = false;

  if (bossAttackHitbox && bossAttackHitbox.body) {
    bossAttackHitbox.body.enable = false;
  }

  playThanosAnimation(bossSprite, 'death');

  if (bossLifeBg) bossLifeBg.setVisible(false);
  if (bossLifeBar) bossLifeBar.setVisible(false);

  scene.time.delayedCall(1500, () => {
    if (bossSprite) { bossSprite.destroy(); bossSprite = null; }
    if (boss) { boss.destroy(); boss = null; }
    if (bossAttackHitbox) { bossAttackHitbox.destroy(); bossAttackHitbox = null; }
  });
}

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

    this.load.image('thanos_idle', 'assets/thanos_idle.png');
    this.load.json('thanos_manifest', 'assets/thanos_manifest.json');

    this.load.once('filecomplete-json-thanos_manifest', () => {
      const manifest = this.cache.json.get('thanos_manifest');
      thanosAnimations = {
        idle: loadThanosAnimation(this, 'assets/thanos_idle', 'thanos_idle', manifest.idle),
        walk: loadThanosAnimation(this, 'assets/thanos_walk', 'thanos_walk', manifest.walk),
        run: loadThanosAnimation(this, 'assets/thanos_run', 'thanos_run', manifest.run),
        hit: loadThanosAnimation(this, 'assets/thanos_hit', 'thanos_hit', manifest.hit),
        death: loadThanosAnimation(this, 'assets/thanos_death', 'thanos_death', manifest.death),
        attack: loadThanosAnimationVariants(this, 'assets/thanos_attack', 'thanos_attack', manifest.attack),
        defense: loadThanosAnimationVariants(this, 'assets/thanos_defense', 'thanos_defense', manifest.defense),
        special: loadThanosAnimationVariants(this, 'assets/thanos_special', 'thanos_special', manifest.special)
      };
    });

    this.load.spritesheet('hulk', 'assets/hulk.png', {
      frameWidth: 128,
      frameHeight: 128
    });

    this.load.spritesheet('enemy', 'assets/enemy.png', {
      frameWidth: 32,
      frameHeight: 40
    });

    this.load.audio('bg-music', 'assets/music.mp3');
  }

  create() {
    score = 0;
    boss = null;
    bossSprite = null;
    bossAttackHitbox = null;
    bossSpawned = false;
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

    createThanosAnimations(this);
    Enemy.createAnimations(this);

    enemies = this.physics.add.group();

    enemyInstances.push(new Enemy(this, 300, 520, 220, 420, enemies));
    enemyInstances.push(new Enemy(this, 520, 520, 460, 700, enemies));
    enemyInstances.push(new Enemy(this, 700, 520, 620, 780, enemies));

    this.physics.add.collider(enemies, ground);

    this.coinManager = new Coin(this, (x, y) => {
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

    bossLifeBg = this.add.rectangle(400, 30, 300, 20, 0x550000);
    bossLifeBg.setScrollFactor(0);
    bossLifeBg.setDepth(1001);
    bossLifeBg.setOrigin(0.5);
    bossLifeBg.setVisible(false);

    bossLifeBar = this.add.rectangle(400, 30, 300, 20, 0x00ff00);
    bossLifeBar.setScrollFactor(0);
    bossLifeBar.setDepth(1002);
    bossLifeBar.setOrigin(0.5);
    bossLifeBar.setVisible(false);

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

  update(time, delta) {
    this.player.update();

    if (this.player.isGameOver) return;

    enemyInstances.forEach((e) => e.update());

    if (this.player.sprite.x > lastSpawnX) {
      spawnMoreContent(this, this.player.sprite.x + CONTENT_SPAWN_AHEAD);
      lastSpawnX += CONTENT_SPAWN_STEP;
    }

    if (!bossSpawned && this.player.sprite.x >= WORLD_WIDTH - 300) {
      spawnBoss(this);
    }

    if (boss && bossSprite && !boss.bossIsDead) {
      const distance = this.player.sprite.x - boss.x;
      const absDistance = Math.abs(distance);

      boss.bossDirection = distance >= 0 ? 1 : -1;

      // Defesa automática (prioridade máxima, exceto se já atacando)
      if (absDistance <= 80 && !boss.bossIsAttacking && !boss.bossIsDefending) {
        boss.bossIsDefending = true;
        boss.body.setVelocityX(0);
        playThanosAnimation(bossSprite, 'defense');
        this.time.delayedCall(800, () => {
          if (boss) boss.bossIsDefending = false;
        });
      }

      // Ataque (só se não estiver defendendo)
      if (absDistance <= 120 && boss.bossCanAttack && !boss.bossIsAttacking && !boss.bossIsDefending) {
        performBossAttack(this);
      }

      if (!boss.bossIsAttacking && !boss.bossIsDefending) {
        boss.bossState = absDistance > 120 ? 'walk' : 'idle';

        if (boss.bossState === 'walk') {
          boss.body.setVelocityX(boss.bossSpeed * boss.bossDirection);
          playThanosAnimation(bossSprite, 'walk');
        } else {
          boss.body.setVelocityX(0);
          playThanosAnimation(bossSprite, 'idle');
        }
      } else {
        boss.body.setVelocityX(0);
      }

      boss.y = BOSS_GROUND_Y;
      bossSprite.x = boss.x + BOSS_VISUAL_X_ADJUST;
      bossSprite.y = boss.y + BOSS_VISUAL_Y_ADJUST;
      bossSprite.setFlipX(boss.bossDirection === 1);

      if (bossAttackHitbox && bossAttackHitbox.body && bossAttackHitbox.body.enable) {
        const hitboxOffsetX = boss.bossDirection === 1 ? 80 : -80;
        bossAttackHitbox.x = boss.x + hitboxOffsetX;
        bossAttackHitbox.y = boss.y - 65;
        bossAttackHitbox.body.updateFromGameObject();
      }
    }
  }
}

export default GameScene;
