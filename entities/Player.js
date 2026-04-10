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

    this.attackHitbox = scene.add.rectangle(-100, -100, 35, 25, 0xffff00, 0.35);
    scene.physics.add.existing(this.attackHitbox);
    this.attackHitbox.body.setAllowGravity(false);
    this.attackHitbox.body.setImmovable(true);
    this.attackHitbox.body.setSize(42, 32);
    this.attackHitbox.body.enable = false;
    this.attackHitbox.setVisible(false);

    this.sprite.anims.play('idle');

    this.livesText = scene.add.text(20, 14, 'Vidas: ' + this.lives, {
      fontSize: '24px',
      color: '#ffffff'
    });
    this.livesText.setScrollFactor(0);
    this.livesText.setDepth(1001);
  }

  _createAnimations(scene) {
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

    if (!scene.anims.exists('hulk_attack_1')) {
      scene.anims.create({
        key: 'hulk_attack_1',
        frames: scene.anims.generateFrameNumbers('hulk', { start: 32, end: 39 }),
        frameRate: 16,
        repeat: 0
      });
    }

    if (!scene.anims.exists('hulk_attack_2')) {
      scene.anims.create({
        key: 'hulk_attack_2',
        frames: scene.anims.generateFrameNumbers('hulk', { start: 56, end: 63 }),
        frameRate: 16,
        repeat: 0
      });
    }

    if (!scene.anims.exists('hulk_attack_3')) {
      scene.anims.create({
        key: 'hulk_attack_3',
        frames: scene.anims.generateFrameNumbers('hulk', { start: 64, end: 71 }),
        frameRate: 16,
        repeat: 0
      });
    }
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

    if (this.cursors.left.isDown) {
      this.sprite.body.setVelocityX(-200);
      this.facing = 'left';
      this.sprite.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      this.sprite.body.setVelocityX(200);
      this.facing = 'right';
      this.sprite.setFlipX(false);
    } else {
      this.sprite.body.setVelocityX(0);
    }

    if (this.cursors.up.isDown && this.sprite.body.touching.down) {
      this.sprite.body.setVelocityY(-400);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyX) && this.canAttack) {
      this.attack();
    }

    const onGround = this.sprite.body.touching.down || this.sprite.body.blocked.down;
    const movingX = this.sprite.body.velocity.x !== 0;

    if (this.isAttacking) {
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
    if (this.isAttacking || !this.canAttack) return;

    this.canAttack = false;
    this.isAttacking = true;
    this.currentAttackHits = new WeakSet();

    const attackIndex = Phaser.Math.Between(1, 3);
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

  takeDamage() {
    if (this.isInvulnerable || this.isGameOver) return;

    const scene = this.scene;

    this.lives -= 1;
    this.livesText.setText('Vidas: ' + this.lives);

    this.isInvulnerable = true;
    this.sprite.setTint(0xff6666);
    scene.tweens.add({
      targets: this.sprite,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        this.sprite.alpha = 1;
        this.sprite.clearTint();
      }
    });

    if (this.lives <= 0) {
      this.isGameOver = true;
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
      this.isInvulnerable = false;
    });
  }

  _setAnimation(key) {
    if (!this.sprite || !this.sprite.anims) return;
    if (this.sprite.anims.currentAnim && this.sprite.anims.currentAnim.key === key) return;
    this.sprite.anims.play(key, true);
  }
}
