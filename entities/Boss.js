const BOSS_GROUND_Y = 576;
const BOSS_VISUAL_X_ADJUST = 10;
const BOSS_VISUAL_Y_ADJUST = -14;

export default class Boss {
  static animationFrames = {
    idle: [],
    walk: [],
    run: [],
    hit: [],
    death: [],
    attack: {},
    defense: {},
    special: {}
  };

  static preload(scene) {
    scene.load.image('thanos_idle', 'assets/thanos_idle.png');
    scene.load.json('thanos_manifest', 'assets/thanos_manifest.json');

    scene.load.once('filecomplete-json-thanos_manifest', () => {
      const manifest = scene.cache.json.get('thanos_manifest');
      Boss.animationFrames = {
        idle: Boss._loadAnimation(scene, 'assets/thanos_idle', 'thanos_idle', manifest.idle),
        walk: Boss._loadAnimation(scene, 'assets/thanos_walk', 'thanos_walk', manifest.walk),
        run: Boss._loadAnimation(scene, 'assets/thanos_run', 'thanos_run', manifest.run),
        hit: Boss._loadAnimation(scene, 'assets/thanos_hit', 'thanos_hit', manifest.hit),
        death: Boss._loadAnimation(scene, 'assets/thanos_death', 'thanos_death', manifest.death),
        attack: Boss._loadAnimationVariants(scene, 'assets/thanos_attack', 'thanos_attack', manifest.attack),
        defense: Boss._loadAnimationVariants(scene, 'assets/thanos_defense', 'thanos_defense', manifest.defense),
        special: Boss._loadAnimationVariants(scene, 'assets/thanos_special', 'thanos_special', manifest.special)
      };
    });
  }

  static _loadAnimation(scene, path, keyPrefix, frameFiles) {
    const keys = [];
    const sortedFiles = [...frameFiles].sort((a, b) => Number(a.replace('.png', '')) - Number(b.replace('.png', '')));

    sortedFiles.forEach((fileName) => {
      const frameNumber = fileName.replace('.png', '');
      const frameKey = keyPrefix + '_' + frameNumber;
      scene.load.image(frameKey, path + '/' + fileName);
      keys.push(frameKey);
    });

    return keys;
  }

  static _loadAnimationVariants(scene, basePath, keyPrefix, variants) {
    const result = {};

    Object.keys(variants)
      .sort((a, b) => Number(a) - Number(b))
      .forEach((variantKey) => {
        result[variantKey] = Boss._loadAnimation(
          scene,
          basePath + '/' + variantKey,
          keyPrefix + '_' + variantKey,
          variants[variantKey]
        );
      });

    return result;
  }

  constructor(scene) {
    this.scene = scene;
    this.spawned = false;
    this.physicsBody = null;
    this.sprite = null;
    this.attackHitbox = null;

    this.state = 'idle';
    this.speed = 60;
    this.direction = -1;
    this.isAttacking = false;
    this.isDefending = false;
    this.canAttack = true;
    this.attackCooldown = 2000;
    this.attackStep = 0;
    this.life = 20;
    this.maxLife = 20;
    this.isDead = false;

    this.lastAttackIndex = -1;
    this.lastDefenseIndex = -1;
    this.lastSpecialIndex = -1;

    this.spawnTriggerX = scene.physics.world.bounds.width - 300;

    this.lifeBg = scene.add.rectangle(400, 30, 300, 20, 0x550000);
    this.lifeBg.setScrollFactor(0);
    this.lifeBg.setDepth(1001);
    this.lifeBg.setOrigin(0.5);
    this.lifeBg.setVisible(false);

    this.lifeBar = scene.add.rectangle(400, 30, 300, 20, 0x00ff00);
    this.lifeBar.setScrollFactor(0);
    this.lifeBar.setDepth(1002);
    this.lifeBar.setOrigin(0.5);
    this.lifeBar.setVisible(false);

    this._createAnimations();
  }

  update(player) {
    if (!player || !player.sprite) return;

    if (!this.spawned && player.sprite.x >= this.spawnTriggerX) {
      this._spawn(player);
    }

    if (!this.physicsBody || !this.sprite || this.isDead) return;

    const distance = player.sprite.x - this.physicsBody.x;
    const absDistance = Math.abs(distance);

    this.direction = distance >= 0 ? 1 : -1;

    if (absDistance <= 80 && !this.isAttacking && !this.isDefending) {
      this.isDefending = true;
      this.physicsBody.body.setVelocityX(0);
      this._playAnimation('defense');
      this.scene.time.delayedCall(800, () => {
        this.isDefending = false;
      });
    }

    if (absDistance <= 120 && this.canAttack && !this.isAttacking && !this.isDefending) {
      this.attack();
    }

    if (!this.isAttacking && !this.isDefending) {
      this.state = absDistance > 120 ? 'walk' : 'idle';

      if (this.state === 'walk') {
        this.physicsBody.body.setVelocityX(this.speed * this.direction);
        this._playAnimation('walk');
      } else {
        this.physicsBody.body.setVelocityX(0);
        this._playAnimation('idle');
      }
    } else {
      this.physicsBody.body.setVelocityX(0);
    }

    this.physicsBody.y = BOSS_GROUND_Y;
    this.sprite.x = this.physicsBody.x + BOSS_VISUAL_X_ADJUST;
    this.sprite.y = this.physicsBody.y + BOSS_VISUAL_Y_ADJUST;
    this.sprite.setFlipX(this.direction === 1);

    if (this.attackHitbox && this.attackHitbox.body && this.attackHitbox.body.enable) {
      const hitboxOffsetX = this.direction === 1 ? 80 : -80;
      this.attackHitbox.x = this.physicsBody.x + hitboxOffsetX;
      this.attackHitbox.y = this.physicsBody.y - 65;
      this.attackHitbox.body.updateFromGameObject();
    }
  }

  attack() {
    if (this.isDead || !this.physicsBody || !this.sprite || !this.attackHitbox) return;
    if (!this.canAttack || this.isAttacking || this.isDefending) return;

    this.isAttacking = true;
    this.canAttack = false;
    this.physicsBody.body.setVelocityX(0);

    const isSpecial = this.attackStep === 1;
    this._playAnimation(isSpecial ? 'special' : 'attack');
    this.attackStep = this.attackStep + 1 > 1 ? 0 : this.attackStep + 1;

    const offsetX = this.direction === 1 ? 80 : -80;
    this.attackHitbox.setPosition(this.physicsBody.x + offsetX, this.physicsBody.y - 65);

    this.attackHitbox.width = isSpecial ? 135 : 90;
    this.attackHitbox.body.setSize(this.attackHitbox.width, 85);
    this.attackHitbox.body.enable = true;
    this.attackHitbox.body.updateFromGameObject();

    const hitboxDuration = isSpecial ? 500 : 300;
    this.scene.time.delayedCall(hitboxDuration, () => {
      if (this.attackHitbox && this.attackHitbox.body) {
        this.attackHitbox.body.enable = false;
      }
    });

    this.scene.time.delayedCall(isSpecial ? 700 : 500, () => {
      this.isAttacking = false;
    });

    this.scene.time.delayedCall(this.attackCooldown, () => {
      this.canAttack = true;
    });
  }

  takeDamage(damage = 1) {
    if (!this.physicsBody || this.isDead || this.isDefending) return;

    this.life -= damage;
    this.physicsBody.body.setVelocityX(0);

    this.sprite.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      if (this.sprite) this.sprite.clearTint();
    });

    this._playAnimation('hit');
    this._updateLifeBar();

    if (this.life <= 0) {
      this.die();
    }
  }

  die() {
    if (!this.physicsBody || this.isDead) return;

    this.isDead = true;
    this.isAttacking = false;
    this.physicsBody.body.setVelocity(0, 0);
    this.physicsBody.body.enable = false;

    if (this.attackHitbox && this.attackHitbox.body) {
      this.attackHitbox.body.enable = false;
    }

    this._playAnimation('death');

    this.lifeBg.setVisible(false);
    this.lifeBar.setVisible(false);

    this.scene.time.delayedCall(1500, () => {
      if (this.sprite) {
        this.sprite.destroy();
        this.sprite = null;
      }
      if (this.physicsBody) {
        this.physicsBody.destroy();
        this.physicsBody = null;
      }
      if (this.attackHitbox) {
        this.attackHitbox.destroy();
        this.attackHitbox = null;
      }
    });
  }

  _spawn(player) {
    if (this.spawned) return;
    this.spawned = true;

    const x = this.scene.physics.world.bounds.width - 150;
    const y = BOSS_GROUND_Y;

    this.physicsBody = this.scene.physics.add.image(x, y, 'thanos_idle');
    this.physicsBody.setVisible(false);
    this.physicsBody.y = BOSS_GROUND_Y;
    this.physicsBody.setScale(1.5);
    this.physicsBody.body.setSize(this.physicsBody.displayWidth * 0.6, this.physicsBody.displayHeight * 0.85, true);
    this.physicsBody.body.setOffset(this.physicsBody.displayWidth * 0.2, this.physicsBody.displayHeight * 0.15);
    this.physicsBody.body.setAllowGravity(false);
    this.physicsBody.body.setImmovable(true);
    this.physicsBody.body.setCollideWorldBounds(true);
    this.physicsBody.body.setVelocityX(0);

    this.attackHitbox = this.scene.add.rectangle(x, y - 65, 90, 85, 0xff0000, 0.35);
    this.scene.physics.add.existing(this.attackHitbox);
    this.attackHitbox.body.setAllowGravity(false);
    this.attackHitbox.body.setImmovable(true);
    this.attackHitbox.body.enable = false;
    this.attackHitbox.setVisible(false);

    this.scene.physics.add.overlap(this.attackHitbox, player.sprite, () => {
      if (player.isGameOver || !this.attackHitbox || !this.attackHitbox.body.enable || this.isDead) return;
      player.takeDamage();
    });

    this.scene.physics.add.overlap(player.attackHitbox, this.physicsBody, (hitbox) => {
      if (!hitbox.body.enable || this.isDead) return;
      if (!player._consumeAttackHit(this.physicsBody)) return;
      this.takeDamage(1);
    });

    const initialFrameKey = Boss.animationFrames.idle[0] || 'thanos_idle';
    this.sprite = this.scene.add.sprite(x, y, initialFrameKey);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setScale(1.5);
    this.sprite.setDepth(10);
    this.sprite.x = this.physicsBody.x + BOSS_VISUAL_X_ADJUST;
    this.sprite.y = this.physicsBody.y + BOSS_VISUAL_Y_ADJUST;

    this._playAnimation('idle');

    this.lifeBg.setVisible(true);
    this.lifeBar.setVisible(true);
  }

  _updateLifeBar() {
    if (!this.lifeBar || this.isDead) return;

    const lifePercent = this.life / this.maxLife;
    this.lifeBar.width = 300 * lifePercent;

    if (lifePercent > 0.5) {
      this.lifeBar.setFillStyle(0x00ff00);
    } else if (lifePercent > 0.25) {
      this.lifeBar.setFillStyle(0xffff00);
    } else {
      this.lifeBar.setFillStyle(0xff3300);
    }
  }

  _createAnimations() {
    const simpleConfigs = {
      idle: { frameRate: 6, repeat: -1 },
      walk: { frameRate: 10, repeat: -1 },
      run: { frameRate: 12, repeat: -1 },
      hit: { frameRate: 10, repeat: 0 },
      death: { frameRate: 8, repeat: 0 }
    };

    Object.keys(simpleConfigs).forEach((type) => {
      const frameKeys = Boss.animationFrames[type] || [];
      const animationKey = 'thanos_' + type;
      if (frameKeys.length === 0 || this.scene.anims.exists(animationKey)) return;

      this.scene.anims.create({
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
      const variants = Boss.animationFrames[type] || {};
      Object.keys(variants).forEach((variant) => {
        const frameKeys = variants[variant] || [];
        const animationKey = 'thanos_' + type + '_' + variant;
        if (frameKeys.length === 0 || this.scene.anims.exists(animationKey)) return;

        this.scene.anims.create({
          key: animationKey,
          frames: frameKeys.map((frameKey) => ({ key: frameKey })),
          frameRate: variantConfigs[type].frameRate,
          repeat: variantConfigs[type].repeat
        });
      });
    });
  }

  _playAnimation(animationType) {
    if (!this.sprite || !this.sprite.anims) return;

    const hasVariants = animationType === 'attack' || animationType === 'defense' || animationType === 'special';
    let animationKey = 'thanos_' + animationType;

    if (hasVariants) {
      const variants = Object.keys(Boss.animationFrames[animationType] || {});
      if (variants.length === 0) return;

      let variantIndex;
      if (animationType === 'attack') {
        variantIndex = this._randomWithoutRepeat(1, 5, this.lastAttackIndex);
        this.lastAttackIndex = variantIndex;
      } else if (animationType === 'defense') {
        variantIndex = this._randomWithoutRepeat(1, 2, this.lastDefenseIndex);
        this.lastDefenseIndex = variantIndex;
      } else {
        variantIndex = this._randomWithoutRepeat(1, 3, this.lastSpecialIndex);
        this.lastSpecialIndex = variantIndex;
      }

      animationKey = 'thanos_' + animationType + '_' + variantIndex;
    }

    if (this.sprite.anims.currentAnim && this.sprite.anims.currentAnim.key === animationKey) return;
    this.sprite.play(animationKey);
  }

  _randomWithoutRepeat(min, max, lastIndex) {
    if (min === max) return min;
    let next;
    do {
      next = Phaser.Math.Between(min, max);
    } while (next === lastIndex);
    return next;
  }
}
