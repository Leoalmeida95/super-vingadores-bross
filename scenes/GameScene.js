const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 600;
const CONTENT_SPAWN_STEP = 400;
const CONTENT_SPAWN_AHEAD = 500;

let player;
let cursors;
let enemies;
let keyX;
let attackHitbox;
let footHitbox;
let canAttack = true;
let isAttacking = false;
let facing = 'right';
let playerLives = 10;
let isInvulnerable = false;
let isGameOver = false;
let livesText;
let coins;
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
let coinSpawnKeys = new Set();
let bgMusic;
let musicStarted = false;
let stompLockUntil = 0;
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

function performAttack(scene) {
  canAttack = false;
  isAttacking = true;

  setPlayerAnimation('attack');

  const offsetX = facing === 'right' ? 52 : -52;
  attackHitbox.setPosition(player.body.center.x + offsetX, player.body.center.y + 10);
  attackHitbox.setVisible(true);
  attackHitbox.body.enable = true;
  attackHitbox.body.updateFromGameObject();

  scene.physics.overlap(attackHitbox, enemies, (hitbox, enemy) => {
    if (!hitbox.body.enable || !enemy || !enemy.active) return;
    destroyEnemyOnHit(scene, enemy);
  });

  scene.time.delayedCall(200, () => {
    attackHitbox.body.enable = false;
    attackHitbox.setVisible(false);
  });

  scene.time.delayedCall(220, () => {
    isAttacking = false;
  });

  scene.time.delayedCall(300, () => {
    canAttack = true;
  });
}

function performBossAttack(scene) {
  if (isGameOver || !boss || !boss.body || !bossSprite || !bossAttackHitbox || !bossAttackHitbox.body) return;
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

function damagePlayer(scene) {
  if (isInvulnerable || isGameOver) return;

  playerLives -= 1;
  livesText.setText('Vidas: ' + playerLives);

  isInvulnerable = true;
  player.setTint(0xff6666);
  scene.tweens.add({
    targets: player,
    alpha: 0.3,
    duration: 100,
    yoyo: true,
    repeat: 5,
    onComplete: () => {
      player.alpha = 1;
      player.clearTint();
    }
  });

  if (playerLives <= 0) {
    isGameOver = true;
    scene.add.text(400, 300, 'Game Over', {
      fontSize: '48px',
      color: '#ffffff'
    }).setOrigin(0.5);

    scene.time.delayedCall(1500, () => {
      scene.scene.restart();
    });
    return;
  }

  scene.time.delayedCall(1000, () => {
    isInvulnerable = false;
  });
}

function setPlayerAnimation(key) {
  if (!player || !player.anims) return;
  if (player.anims.currentAnim && player.anims.currentAnim.key === key) return;
  player.anims.play(key, true);
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

  scene.physics.add.overlap(bossAttackHitbox, player, () => {
    if (isGameOver || !boss || !bossAttackHitbox || !bossAttackHitbox.body.enable) return;
    damagePlayer(scene);
  });

  scene.physics.add.overlap(attackHitbox, boss, (hitbox, b) => {
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

function createEnemy(scene, x, y, minX, maxX) {
  const enemy = scene.physics.add.sprite(x, y, 'enemy', 0);
  enemy.setOrigin(0.5, 1);
  enemy.body.setSize(34, 40, true);
  enemy.anims.play('enemy-walk', true);

  enemy.body.setCollideWorldBounds(true);
  enemy.minX = minX;
  enemy.maxX = maxX;
  enemy.speed = 80;
  enemy.direction = 1;

  enemies.add(enemy);
}

function playCoinCollectEffect(scene, x, y) {
  const sparkle = scene.add.circle(x, y, 6, 0xfff799, 0.8);
  const plusOne = scene.add.text(x, y - 8, '+1', {
    fontSize: '16px',
    color: '#ffe066'
  }).setOrigin(0.5);

  scene.tweens.add({
    targets: sparkle,
    scaleX: 2,
    scaleY: 2,
    alpha: 0,
    duration: 130,
    onComplete: () => sparkle.destroy()
  });

  scene.tweens.add({
    targets: plusOne,
    y: y - 28,
    alpha: 0,
    duration: 260,
    onComplete: () => plusOne.destroy()
  });
}

function playEnemyHitEffect(scene, enemy, onComplete) {
  const effectTargets = enemy.visualParts && enemy.visualParts.length > 0
    ? enemy.visualParts
    : [enemy];

  effectTargets.forEach((part) => {
    if (part.setFillStyle) {
      part.setFillStyle(0xffe066);
    }
  });

  scene.tweens.add({
    targets: effectTargets,
    scaleX: 1.25,
    scaleY: 0.7,
    alpha: 0,
    duration: 120,
    onComplete: () => {
      if (onComplete) onComplete();
    }
  });
}

function destroyEnemyOnHit(scene, enemy) {
  if (enemy.isDying) return;
  enemy.isDying = true;

  if (enemy.body) {
    enemy.body.enable = false;
  }

  playEnemyHitEffect(scene, enemy, () => {
    if (enemy.active) {
      enemy.destroy();
    }
  });
}

function createCoin(scene, x, y) {
  const key = Math.round(x) + ':' + Math.round(y);
  if (coinSpawnKeys.has(key)) return;
  coinSpawnKeys.add(key);

  const coin = scene.add.circle(x, y, 10, 0xffdd33);
  scene.physics.add.existing(coin, true);

  coins.add(coin);
}

function spawnMoreContent(scene, xBase) {
  if (xBase > WORLD_WIDTH - 200) return;

  const baseX = Phaser.Math.Clamp(xBase, 200, WORLD_WIDTH - 200);

  const enemyX1 = Phaser.Math.Clamp(baseX + 40, 120, WORLD_WIDTH - 120);
  createEnemy(scene, enemyX1, 520, enemyX1 - 90, enemyX1 + 90);

  const chunk = Math.floor(baseX / CONTENT_SPAWN_STEP);
  if (chunk % 2 === 0) {
    const enemyX2 = Phaser.Math.Clamp(baseX + 220, 120, WORLD_WIDTH - 120);
    createEnemy(scene, enemyX2, 520, enemyX2 - 70, enemyX2 + 70);
  }

  const coinY = [520, 480, 440, 500];
  for (let i = 0; i < coinY.length; i += 1) {
    const coinX = Phaser.Math.Clamp(baseX + 20 + (i * 70), 80, WORLD_WIDTH - 80);
    createCoin(scene, coinX, coinY[i]);
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
    isGameOver = false;
    isInvulnerable = false;
    canAttack = true;
    isAttacking = false;
    facing = 'right';
    playerLives = 10;
    score = 0;
    boss = null;
    bossSprite = null;
    bossAttackHitbox = null;
    bossSpawned = false;
    lastSpawnX = 400;
    coinSpawnKeys = new Set();

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

    player = this.physics.add.sprite(100, 450, 'hulk', 0);
    player.body.setCollideWorldBounds(true);

    footHitbox = this.add.rectangle(player.x, player.y + (player.height / 2), 30, 10, 0x00ffff, 0);
    this.physics.add.existing(footHitbox);
    footHitbox.body.setAllowGravity(false);
    footHitbox.body.setImmovable(true);
    footHitbox.body.setSize(30, 10);
    footHitbox.setVisible(false);

    this.cameras.main.startFollow(player, true, 0.08, 0.08);

    this.anims.create({
      key: 'idle',
      frames: this.anims.generateFrameNumbers('hulk', { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1
    });

    this.anims.create({
      key: 'run',
      frames: this.anims.generateFrameNumbers('hulk', { start: 4, end: 11 }),
      frameRate: 12,
      repeat: -1
    });

    this.anims.create({
      key: 'jump',
      frames: this.anims.generateFrameNumbers('hulk', { start: 12, end: 15 }),
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: 'attack',
      frames: this.anims.generateFrameNumbers('hulk', { start: 16, end: 21 }),
      frameRate: 16,
      repeat: 0
    });

    if (this.textures.exists('enemy')) {
      if (!this.anims.exists('enemy-idle')) {
        this.anims.create({
          key: 'enemy-idle',
          frames: this.anims.generateFrameNumbers('enemy', { start: 0, end: 1 }),
          frameRate: 4,
          repeat: -1
        });
      }

      if (!this.anims.exists('enemy-walk')) {
        this.anims.create({
          key: 'enemy-walk',
          frames: this.anims.generateFrameNumbers('enemy', { start: 2, end: 7 }),
          frameRate: 10,
          repeat: -1
        });
      }

      if (!this.anims.exists('enemy-attack')) {
        this.anims.create({
          key: 'enemy-attack',
          frames: this.anims.generateFrameNumbers('enemy', { start: 8, end: 11 }),
          frameRate: 8,
          repeat: 0
        });
      }
    }

    createThanosAnimations(this);

    player.anims.play('idle');

    this.physics.add.collider(player, ground);

    enemies = this.physics.add.group();

    createEnemy(this, 300, 520, 220, 420);
    createEnemy(this, 520, 520, 460, 700);
    createEnemy(this, 700, 520, 620, 780);

    this.physics.add.collider(enemies, ground);

    this.physics.add.collider(player, enemies, (playerObj, enemy) => {
      if (!enemy || !enemy.active || enemy.isDying) return;
      if (attackHitbox && attackHitbox.body.enable) return;

      const isFalling = playerObj.body.velocity.y > 50;
      const stompBySensor = this.physics.overlap(footHitbox, enemy);

      const aboveEnemyCenter = playerObj.body.center.y < enemy.body.center.y;
      const topTolerance = playerObj.body.bottom <= enemy.body.top + 40;
      const stompByTop = aboveEnemyCenter && topTolerance;

      if (isFalling && (stompBySensor || stompByTop)) {
        stompLockUntil = this.time.now + 120;
        destroyEnemyOnHit(this, enemy);
        playerObj.setVelocityY(-350);
        return;
      }

      if (this.time.now < stompLockUntil) return;

      damagePlayer(this);
    });

    cursors = this.input.keyboard.createCursorKeys();

    keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    attackHitbox = this.add.rectangle(-100, -100, 35, 25, 0xffff00, 0.35);
    this.physics.add.existing(attackHitbox);
    attackHitbox.body.setAllowGravity(false);
    attackHitbox.body.setImmovable(true);
    attackHitbox.body.setSize(42, 32);
    attackHitbox.body.enable = false;
    attackHitbox.setVisible(false);

    this.physics.add.overlap(attackHitbox, enemies, (hitbox, enemy) => {
      if (!hitbox.body.enable || !enemy || !enemy.active) return;
      destroyEnemyOnHit(this, enemy);
    });

    coins = this.physics.add.staticGroup();
    createCoin(this, 180, 520);
    createCoin(this, 260, 480);
    createCoin(this, 420, 520);
    createCoin(this, 560, 480);
    createCoin(this, 740, 520);

    this.physics.add.overlap(player, coins, (playerObj, coin) => {
      if (!coin || !coin.active || !coin.body || !coin.body.enable) return;
      if (coin.collected) return;
      coin.collected = true;

      const coinX = coin.x;
      const coinY = coin.y;

      if (typeof coin.disableBody === 'function') {
        coin.disableBody(true, true);
      } else {
        coin.body.enable = false;
        coin.setActive(false);
        coin.setVisible(false);
      }

      score += 1;
      scoreText.setText('Moedas: ' + score);

      playCoinCollectEffect(this, coinX, coinY);
    });

    livesText = this.add.text(20, 14, 'Vidas: ' + playerLives, {
      fontSize: '24px',
      color: '#ffffff'
    });
    livesText.setScrollFactor(0);
    livesText.setDepth(1001);

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
    if (footHitbox && footHitbox.body && player && player.body) {
      footHitbox.x = player.body.center.x;
      footHitbox.y = player.body.bottom + 4;
      footHitbox.body.updateFromGameObject();
    }

    if (isGameOver) {
      player.body.setVelocityX(0);
      return;
    }

    if (cursors.left.isDown) {
      player.body.setVelocityX(-200);
      facing = 'left';
      player.setFlipX(true);
    } else if (cursors.right.isDown) {
      player.body.setVelocityX(200);
      facing = 'right';
      player.setFlipX(false);
    } else {
      player.body.setVelocityX(0);
    }

    if (cursors.up.isDown && player.body.touching.down) {
      player.body.setVelocityY(-400);
    }

    if (Phaser.Input.Keyboard.JustDown(keyX) && canAttack) {
      performAttack(this);
    }

    const onGround = player.body.touching.down || player.body.blocked.down;
    const movingX = player.body.velocity.x !== 0;

    if (isAttacking) {
      setPlayerAnimation('attack');
    } else if (!onGround) {
      setPlayerAnimation('jump');
    } else if (movingX) {
      setPlayerAnimation('run');
    } else {
      setPlayerAnimation('idle');
    }

    enemies.children.iterate((enemy) => {
      if (!enemy || !enemy.active || !enemy.body || !enemy.body.enable) return;

      if (enemy.x <= enemy.minX) {
        enemy.direction = 1;
      } else if (enemy.x >= enemy.maxX) {
        enemy.direction = -1;
      }

      enemy.body.setVelocityX(enemy.speed * enemy.direction);
      enemy.setFlipX(enemy.direction === -1);

      if (!enemy.anims.currentAnim || enemy.anims.currentAnim.key !== 'enemy-walk') {
        enemy.anims.play('enemy-walk', true);
      }
    });

    if (player.x > lastSpawnX) {
      spawnMoreContent(this, player.x + CONTENT_SPAWN_AHEAD);
      lastSpawnX += CONTENT_SPAWN_STEP;
    }

    if (!bossSpawned && player.x >= WORLD_WIDTH - 300) {
      spawnBoss(this);
    }

    if (boss && bossSprite && !boss.bossIsDead) {
      const distance = player.x - boss.x;
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
