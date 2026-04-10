export default class Player {
  constructor(scene) {
    this.scene = scene;
    this.lives = 10;
    this.isGameOver = false;
    this.isInvulnerable = false;
    this.canAttack = true;
    this.isAttacking = false;
    this.facing = 'right';
    this.debugStomp = false;
    this.lastFallingAt = -99999;
    this.stompGraceMs = 120;
    this.currentAttackAnimKey = null;
    this.currentAttackHits = new WeakSet();
    this.attackAnimationCount = 4;
    this.jumpVelocity = -400;
    this.doubleJumpVelocity = -380;
    this.hasUsedDoubleJump = false;
    this.isUsingSpecial = false;
    this.canUseSpecial = true;
    this.specialCooldown = 3000;
    this.currentSpecialHits = new WeakSet();
    this.invulnerabilityToken = 0;
    this._specialVisualSprite = null;
    this.bossPhysicsBody = null;
    this.onBossAttackHit = null;
    this.attackAlreadyHitBoss = false;
    this.enemyGroup = null;
    this.onEnemyDestroyed = null;

    this.sprite = scene.physics.add.sprite(100, 450, 'hulk', 0);
    this.sprite.body.setCollideWorldBounds(true);

    this.footHitbox = scene.add.rectangle(
      this.sprite.x,
      this.sprite.y + this.sprite.height / 2,
      30, 10, 0x00ffff, 0
    );
    scene.physics.add.existing(this.footHitbox);
    this.footHitbox.body.setAllowGravity(false);
    this.footHitbox.body.setImmovable(true);
    this.footHitbox.body.setSize(30, 10);
    this.footHitbox.setVisible(false);

    scene.cameras.main.startFollow(this.sprite, true, 0.08, 0.08);

    this._createAnimations(scene);

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keyX = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.keySpecial = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);

    this.attackHitbox = scene.add.rectangle(-100, -100, 35, 25, 0xffff00, 0.35);
    scene.physics.add.existing(this.attackHitbox);
    this.attackHitbox.body.setAllowGravity(false);
    this.attackHitbox.body.setImmovable(true);
    this.attackHitbox.body.setSize(42, 32);
    this.attackHitbox.body.enable = false;
    this.attackHitbox.setVisible(false);

    this.specialHitbox = scene.add.rectangle(-100, -100, 112, 60, 0x66ccff, 0.25);
    scene.physics.add.existing(this.specialHitbox);
    this.specialHitbox.body.setAllowGravity(false);
    this.specialHitbox.body.setImmovable(true);
    this.specialHitbox.body.setSize(112, 60);
    this.specialHitbox.body.enable = false;
    this.specialHitbox.setVisible(false);

    this.sprite.anims.play('idle');

    this.livesText = scene.add.text(20, 14, 'Vidas: ' + this.lives, {
      fontSize: '24px',
      color: '#ffffff'
    });
    this.livesText.setScrollFactor(0);
    this.livesText.setDepth(1001);
  }

  _createAnimations(scene) {
    const hulkTexture = scene.textures.get('hulk');
    const hulkSourceImage = hulkTexture ? hulkTexture.getSourceImage() : null;
    const hulkFrameZero = scene.textures.getFrame('hulk', 0);
    const frameWidth = hulkFrameZero ? hulkFrameZero.cutWidth : 0;
    const frameHeight = hulkFrameZero ? hulkFrameZero.cutHeight : 0;
    const textureWidth = hulkSourceImage ? hulkSourceImage.width : 0;
    const textureHeight = hulkSourceImage ? hulkSourceImage.height : 0;
    const framesPerRow = frameWidth > 0 ? Math.floor(textureWidth / frameWidth) : 0;
    const rowCount = frameHeight > 0 ? Math.floor(textureHeight / frameHeight) : 0;
    const lastRowIndex = rowCount > 0 ? rowCount - 1 : 0;

    if (!scene.anims.exists('idle')) {
      scene.anims.create({
        key: 'idle',
        frames: scene.anims.generateFrameNumbers('hulk', { start: 0, end: 3 }),
        frameRate: 6,
        repeat: -1
      });
    }

    if (!scene.anims.exists('run')) {
      scene.anims.create({
        key: 'run',
        frames: scene.anims.generateFrameNumbers('hulk', { start: 4, end: 11 }),
        frameRate: 12,
        repeat: -1
      });
    }

    if (!scene.anims.exists('jump')) {
      scene.anims.create({
        key: 'jump',
        frames: scene.anims.generateFrameNumbers('hulk', { start: 12, end: 15 }),
        frameRate: 10,
        repeat: -1
      });
    }

    if (framesPerRow > 0 && !scene.anims.exists('hulk_attack_1')) {
      const row5 = this._getFramesFromRow(5, framesPerRow);
      scene.anims.create({
        key: 'hulk_attack_1',
        frames: scene.anims.generateFrameNumbers('hulk', row5),
        frameRate: 16,
        repeat: 0
      });
    }

    if (framesPerRow > 0 && !scene.anims.exists('hulk_attack_2')) {
      const row8 = this._getFramesFromRow(8, framesPerRow);
      scene.anims.create({
        key: 'hulk_attack_2',
        frames: scene.anims.generateFrameNumbers('hulk', row8),
        frameRate: 16,
        repeat: 0
      });
    }

    if (framesPerRow > 0 && !scene.anims.exists('hulk_attack_3')) {
      const row9 = this._getFramesFromRow(9, framesPerRow);
      scene.anims.create({
        key: 'hulk_attack_3',
        frames: scene.anims.generateFrameNumbers('hulk', row9),
        frameRate: 16,
        repeat: 0
      });
    }

    if (framesPerRow > 0 && rowCount > 0 && !scene.anims.exists('hulk_attack_4')) {
      const lastRow = this._getFramesFromRow(lastRowIndex, framesPerRow);
      scene.anims.create({
        key: 'hulk_attack_4',
        frames: scene.anims.generateFrameNumbers('hulk', lastRow),
        frameRate: 16,
        repeat: 0
      });
    }

    if (framesPerRow > 0 && !scene.anims.exists('hulk_special')) {
      const specialRow = this._getFramesFromRow(12, framesPerRow);
      scene.anims.create({
        key: 'hulk_special',
        frames: scene.anims.generateFrameNumbers('hulk', specialRow),
        frameRate: 14,
        repeat: 0
      });
    }

    if (framesPerRow > 0 && !scene.anims.exists('hulk_special_effect')) {
      const effectRow = this._getFramesFromRow(13, framesPerRow);
      scene.anims.create({
        key: 'hulk_special_effect',
        frames: scene.anims.generateFrameNumbers('hulk', effectRow),
        frameRate: 16,
        repeat: 0
      });
    }

    if (framesPerRow > 0 && !scene.anims.exists('hulk_special_tall')) {
      // Row 6 in the 256px sheet = row 12 in the 128px sheet (same pixel offset)
      const tallRow = this._getFramesFromRow(6, framesPerRow);
      scene.anims.create({
        key: 'hulk_special_tall',
        frames: scene.anims.generateFrameNumbers('hulk_special_sheet', tallRow),
        frameRate: 14,
        repeat: 0
      });
    }
  }

  _getFramesFromRow(rowIndex, framesPerRow) {
    const start = rowIndex * framesPerRow;
    const end = start + framesPerRow - 1;
    return { start, end };
  }

  setupColliders(ground, enemies, callbacks) {
    const scene = this.scene;
    const { onEnemyDestroyed } = callbacks;
    this.enemyGroup = enemies;
    this.onEnemyDestroyed = onEnemyDestroyed;

    scene.physics.add.collider(this.sprite, ground);

    scene.physics.add.collider(this.sprite, enemies, (playerObj, enemy) => {
      if (!enemy || !enemy.active || enemy.isDying) return;
      if (this.attackHitbox && this.attackHitbox.body.enable) return;

      const velocityY = playerObj.body.velocity.y;
      const isFallingNow = velocityY > 0;
      const wasFallingRecently = (scene.time.now - this.lastFallingAt) <= this.stompGraceMs;
      const stompByTop = playerObj.body.bottom <= enemy.body.top + 30;

      if (this.debugStomp) {
        console.log({
          playerBottom: playerObj.body.bottom,
          enemyTop: enemy.body.top,
          velocityY,
          wasFallingRecently,
          stompByTop
        });
      }

      if ((isFallingNow || wasFallingRecently) && stompByTop) {
        onEnemyDestroyed(enemy);
        playerObj.setVelocityY(-350);
        return;
      }

      this.takeDamage();
    });

    scene.physics.add.overlap(this.attackHitbox, enemies, (hitbox, enemy) => {
      if (!hitbox.body.enable || !enemy || !enemy.active) return;
      this._tryAttackEnemyHit(enemy);
    });

    scene.physics.add.overlap(this.specialHitbox, enemies, (hitbox, enemy) => {
      if (!hitbox.body.enable || !enemy || !enemy.active) return;
      this._trySpecialEnemyHit(enemy);
    });

  }

  linkBoss(physicsBody, onHit) {
    const scene = this.scene;
    this.bossPhysicsBody = physicsBody;
    this.onBossAttackHit = onHit;
    scene.physics.add.overlap(this.attackHitbox, physicsBody, (hitbox, bossObj) => {
      if (!hitbox.body.enable) return;
      if (!bossObj || !bossObj.active) return;
      if (this.attackAlreadyHitBoss) return;
      this.attackAlreadyHitBoss = true;
      if (this.onBossAttackHit) this.onBossAttackHit();
    });
  }

  update() {
    if (this.sprite && this.sprite.body && this.sprite.body.velocity.y > 0) {
      this.lastFallingAt = this.scene.time.now;
    }

    if (this.footHitbox && this.footHitbox.body && this.sprite && this.sprite.body) {
      this.footHitbox.x = this.sprite.body.center.x;
      this.footHitbox.y = this.sprite.body.bottom + 4;
      this.footHitbox.body.updateFromGameObject();
    }

    if (this.isGameOver) {
      this.sprite.body.setVelocityX(0);
      return;
    }

    if (this.isUsingSpecial) {
      this.sprite.body.setVelocityX(0);
    }

    let isMovingByInput = false;

    if (!this.isUsingSpecial && this.cursors.left.isDown) {
      this.sprite.body.setVelocityX(-200);
      isMovingByInput = true;
      this.facing = 'left';
      this.sprite.setFlipX(true);
    } else if (!this.isUsingSpecial && this.cursors.right.isDown) {
      this.sprite.body.setVelocityX(200);
      isMovingByInput = true;
      this.facing = 'right';
      this.sprite.setFlipX(false);
    } else if (!this.isUsingSpecial) {
      this.sprite.body.setVelocityX(0);
      isMovingByInput = false;
    }

    const onGroundNow = this.sprite.body.touching.down || this.sprite.body.blocked.down;
    if (onGroundNow) {
      this.hasUsedDoubleJump = false;
    }

    if (!this.isUsingSpecial && Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      if (onGroundNow) {
        this.sprite.body.setVelocityY(this.jumpVelocity);
      } else if (!this.hasUsedDoubleJump) {
        this.sprite.body.setVelocityY(this.doubleJumpVelocity);
        this.hasUsedDoubleJump = true;
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyX) && this.canAttack && !this.isUsingSpecial) {
      this.attack();
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.keySpecial) &&
      this.canUseSpecial &&
      !this.isAttacking &&
      !this.isUsingSpecial &&
      !this.isGameOver
    ) {
      this.performSpecial();
    }

    const onGround = this.sprite.body.touching.down || this.sprite.body.blocked.down;
    const movingX = isMovingByInput;

    if (this.isUsingSpecial) {
      if (this._specialVisualSprite) {
        this._specialVisualSprite.x = this.sprite.body.center.x;
        this._specialVisualSprite.y = this.sprite.body.bottom;
      }
    } else if (this.isAttacking) {
      if (this.currentAttackAnimKey) {
        this._setAnimation(this.currentAttackAnimKey);
      }
    } else if (!onGround) {
      this._setAnimation('jump');
    } else if (movingX) {
      this._setAnimation('run');
    } else {
      this._setAnimation('idle');
    }
  }

  attack() {
    const scene = this.scene;
    if (this.isAttacking || this.isUsingSpecial || !this.canAttack) return;

    this.canAttack = false;
    this.isAttacking = true;
    this.currentAttackHits = new WeakSet();
    this.attackAlreadyHitBoss = false;

    const attackIndex = Phaser.Math.Between(1, this.attackAnimationCount);
    this.currentAttackAnimKey = 'hulk_attack_' + attackIndex;
    this.sprite.anims.play(this.currentAttackAnimKey, true);

    const offsetX = this.facing === 'right' ? 64 : -64;
    this.attackHitbox.setPosition(
      this.sprite.body.center.x + offsetX,
      this.sprite.body.center.y + 10
    );
    this.attackHitbox.setVisible(true);
    this.attackHitbox.body.setSize(58, 36);
    this.attackHitbox.body.enable = true;
    this.attackHitbox.body.updateFromGameObject();

    // Forca uma checagem imediata para nao perder o hit no frame inicial do ataque.
    if (this.enemyGroup) {
      scene.physics.overlap(this.attackHitbox, this.enemyGroup, (hitbox, enemy) => {
        if (!enemy || !enemy.active) return;
        this._tryAttackEnemyHit(enemy);
      });
    }

    if (this.bossPhysicsBody && this.bossPhysicsBody.active) {
      scene.physics.overlap(this.attackHitbox, this.bossPhysicsBody, (hitbox, bossObj) => {
        if (!bossObj || !bossObj.active) return;
        if (this.attackAlreadyHitBoss) return;
        this.attackAlreadyHitBoss = true;
        if (this.onBossAttackHit) this.onBossAttackHit();
      });
    }

    scene.time.delayedCall(200, () => {
      this.attackHitbox.body.enable = false;
      this.attackHitbox.setVisible(false);
    });

    const finishAttack = () => {
      if (!this.isAttacking) return;
      this.isAttacking = false;
      this.canAttack = true;
      this.currentAttackAnimKey = null;
    };

    this.sprite.once('animationcomplete', (anim) => {
      if (this.currentAttackAnimKey && anim.key === this.currentAttackAnimKey) {
        finishAttack();
      }
    });

    scene.time.delayedCall(650, finishAttack);
  }

  performSpecial() {
    const scene = this.scene;
    if (this.isGameOver || this.isUsingSpecial || this.isAttacking || !this.canUseSpecial) return;

    this.isUsingSpecial = true;
    this.canUseSpecial = false;
    this.canAttack = false;
    this.currentSpecialHits = new WeakSet();

    const origAlpha = this.sprite.alpha;
    this.sprite.setAlpha(0);

    this._specialVisualSprite = scene.add.sprite(
      this.sprite.body.center.x,
      this.sprite.body.bottom,
      'hulk_special_sheet'
    );
    this._specialVisualSprite.setOrigin(0.5, 1);
    this._specialVisualSprite.setDepth(this.sprite.depth + 1);
    this._specialVisualSprite.setFlipX(this.facing === 'left');
    this._specialVisualSprite.anims.play('hulk_special_tall', true);

    this.sprite.body.setVelocityX(0);

    scene.time.delayedCall(200, () => {
      if (!this.isUsingSpecial || this.isGameOver) return;

      const offsetX = this.facing === 'right' ? 72 : -72;
      this.specialHitbox.setPosition(
        this.sprite.body.center.x + offsetX,
        this.sprite.body.center.y + 2
      );
      this.specialHitbox.body.setSize(112, 60);
      this.specialHitbox.body.enable = true;
      this.specialHitbox.setVisible(true);
      this.specialHitbox.body.updateFromGameObject();

      const effectOffsetX = this.facing === 'right' ? 80 : -80;
      const effect = scene.add.sprite(
        this.sprite.body.center.x + effectOffsetX,
        this.sprite.body.bottom,
        'hulk'
      );
      effect.setOrigin(0.5, 1);
      effect.setDepth(5);
      effect.setScale(1.3);
      effect.setAlpha(0.9);
      effect.setFlipX(this.facing === 'left');
      effect.anims.play('hulk_special_effect', true);
      scene.time.delayedCall(400, () => { effect.destroy(); });

      if (this.enemyGroup) {
        scene.physics.overlap(this.specialHitbox, this.enemyGroup, (hitbox, enemy) => {
          if (!enemy || !enemy.active) return;
          this._trySpecialEnemyHit(enemy);
        });
      }

      scene.time.delayedCall(400, () => {
        if (this.specialHitbox && this.specialHitbox.body) {
          this.specialHitbox.body.enable = false;
        }
        if (this.specialHitbox) {
          this.specialHitbox.setVisible(false);
        }
      });
    });

    scene.time.delayedCall(600, () => {
      this.isUsingSpecial = false;
      this.canAttack = true;
      this.sprite.setAlpha(origAlpha);
      if (this._specialVisualSprite) {
        this._specialVisualSprite.destroy();
        this._specialVisualSprite = null;
      }
    });

    scene.time.delayedCall(this.specialCooldown, () => {
      this.canUseSpecial = true;
    });
  }

  _consumeAttackHit(target) {
    if (!target) return false;
    if (!this.attackHitbox || !this.attackHitbox.body || !this.attackHitbox.body.enable) return false;
    if (!this.isAttacking) return false;
    if (this.currentAttackHits.has(target)) return false;

    this.currentAttackHits.add(target);
    return true;
  }

  _tryAttackEnemyHit(enemy) {
    if (!enemy || !enemy.active) return;
    if (!this.onEnemyDestroyed) return;
    if (!this._consumeAttackHit(enemy)) return;

    console.log('HIT DETECTADO', enemy);
    this.onEnemyDestroyed(enemy);
  }

  _consumeSpecialHit(target) {
    if (!target) return false;
    if (!this.specialHitbox || !this.specialHitbox.body || !this.specialHitbox.body.enable) return false;
    if (!this.isUsingSpecial) return false;
    if (this.currentSpecialHits.has(target)) return false;

    this.currentSpecialHits.add(target);
    return true;
  }

  _trySpecialEnemyHit(enemy) {
    if (!enemy || !enemy.active) return;
    if (!this.onEnemyDestroyed) return;
    if (!this._consumeSpecialHit(enemy)) return;

    console.log('HIT ESPECIAL DETECTADO', enemy);
    this.onEnemyDestroyed(enemy);
  }

  _setInvulnerability(durationMs) {
    this.isInvulnerable = true;
    this.invulnerabilityToken += 1;
    const token = this.invulnerabilityToken;

    this.scene.time.delayedCall(durationMs, () => {
      if (token !== this.invulnerabilityToken) return;
      this.isInvulnerable = false;
    });
  }

  addLife() {
    this.lives += 1;
    this.livesText.setText('Vidas: ' + this.lives);

    // Invincibility window so the gained life can't be immediately lost.
    this._setInvulnerability(800);

    const scene = this.scene;
    const plusText = scene.add.text(
      this.sprite.x,
      this.sprite.y - 40,
      '+1 Vida',
      { fontSize: '20px', color: '#00ff88', fontStyle: 'bold' }
    );
    plusText.setOrigin(0.5);
    plusText.setDepth(1050);
    scene.tweens.add({
      targets: plusText,
      y: plusText.y - 40,
      alpha: 0,
      duration: 1200,
      ease: 'Linear',
      onComplete: () => plusText.destroy()
    });
  }

  takeDamage(damage = 1) {
    if (this.isInvulnerable || this.isGameOver) return;

    const scene = this.scene;

    this.lives -= damage;
    this.livesText.setText('Vidas: ' + this.lives);

    this._setInvulnerability(1000);
    this.sprite.setTint(0xff6666);
    scene.tweens.add({
      targets: this.sprite,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        if (this.isGameOver) {
          this.sprite.alpha = 1;
          this.sprite.setTint(0xff6666);
          return;
        }
        this.sprite.alpha = 1;
        this.sprite.clearTint();
      }
    });

    if (this.lives <= 0) {
      this.isGameOver = true;
      this.sprite.setTint(0xff6666);
      this.sprite.alpha = 1;
      this.sprite.body.setVelocity(0, 0);
      this.sprite.anims.pause();
      if (scene.gameOverText) {
        scene.gameOverText.destroy();
      }
      scene.gameOverText = scene.add.text(400, 300, 'Game Over', {
        fontSize: '48px',
        color: '#ff3333',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      scene.gameOverText.setScrollFactor(0);
      scene.gameOverText.setDepth(1200);

      scene.time.delayedCall(5000, () => {
        if (typeof scene.startPhase === 'function') {
          scene.startPhase(1, { resetProgress: true });
          return;
        }
        scene.scene.restart();
      });
      return;
    }
  }

  _setAnimation(key) {
    if (!this.sprite || !this.sprite.anims) return;
    if (this.sprite.anims.currentAnim && this.sprite.anims.currentAnim.key === key) return;
    this.sprite.anims.play(key, true);
  }
}
