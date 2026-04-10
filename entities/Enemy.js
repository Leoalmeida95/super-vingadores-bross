export default class Enemy {
  constructor(scene, x, y, minX, maxX, group) {
    this.scene = scene;
    this.minX = minX;
    this.maxX = maxX;
    this.direction = 1;
    this.speed = 80;
    this.isDying = false;

    this.sprite = scene.physics.add.sprite(x, y, 'enemy', 0);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.body.setSize(34, 40, true);
    this.sprite.body.setCollideWorldBounds(true);
    this.sprite.anims.play('enemy-walk', true);

    // referência reversa para callbacks de colisão
    this.sprite.enemyInstance = this;

    group.add(this.sprite);
  }

  update() {
    if (!this.sprite || !this.sprite.active || !this.sprite.body || !this.sprite.body.enable) return;

    if (this.sprite.x <= this.minX) {
      this.direction = 1;
    } else if (this.sprite.x >= this.maxX) {
      this.direction = -1;
    }

    this.sprite.body.setVelocityX(this.speed * this.direction);
    this.sprite.setFlipX(this.direction === -1);

    if (!this.sprite.anims.currentAnim || this.sprite.anims.currentAnim.key !== 'enemy-walk') {
      this.sprite.anims.play('enemy-walk', true);
    }
  }

  die() {
    if (this.isDying) return;
    this.isDying = true;

    if (this.sprite.body) {
      this.sprite.body.enable = false;
    }

    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.25,
      scaleY: 0.7,
      alpha: 0,
      duration: 120,
      onComplete: () => {
        if (this.sprite.active) {
          this.sprite.destroy();
        }
      }
    });
  }

  static createAnimations(scene) {
    if (!scene.textures.exists('enemy')) return;

    if (!scene.anims.exists('enemy-idle')) {
      scene.anims.create({
        key: 'enemy-idle',
        frames: scene.anims.generateFrameNumbers('enemy', { start: 0, end: 1 }),
        frameRate: 4,
        repeat: -1
      });
    }

    if (!scene.anims.exists('enemy-walk')) {
      scene.anims.create({
        key: 'enemy-walk',
        frames: scene.anims.generateFrameNumbers('enemy', { start: 2, end: 7 }),
        frameRate: 10,
        repeat: -1
      });
    }

    if (!scene.anims.exists('enemy-attack')) {
      scene.anims.create({
        key: 'enemy-attack',
        frames: scene.anims.generateFrameNumbers('enemy', { start: 8, end: 11 }),
        frameRate: 8,
        repeat: 0
      });
    }
  }
}
