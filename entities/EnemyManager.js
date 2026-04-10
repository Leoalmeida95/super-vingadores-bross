import Enemy from './Enemy.js';

export default class EnemyManager {
  constructor(scene, ground) {
    this.scene = scene;
    this.ground = ground;
    this.group = scene.physics.add.group();
    this.instances = [];

    Enemy.createAnimations(scene);
    scene.physics.add.collider(this.group, ground);
  }

  createInitial() {
    this.instances.push(new Enemy(this.scene, 300, 520, 220, 420, this.group));
    this.instances.push(new Enemy(this.scene, 520, 520, 460, 700, this.group));
    this.instances.push(new Enemy(this.scene, 700, 520, 620, 780, this.group));
  }

  spawnChunk(baseX, worldWidth) {
    const enemyX1 = Phaser.Math.Clamp(baseX + 40, 120, worldWidth - 120);
    this.instances.push(new Enemy(this.scene, enemyX1, 520, enemyX1 - 90, enemyX1 + 90, this.group));

    const chunk = Math.floor(baseX / 400);
    if (chunk % 2 === 0) {
      const enemyX2 = Phaser.Math.Clamp(baseX + 220, 120, worldWidth - 120);
      this.instances.push(new Enemy(this.scene, enemyX2, 520, enemyX2 - 70, enemyX2 + 70, this.group));
    }
  }

  update() {
    this.instances.forEach((enemy) => enemy.update());
  }

  handleEnemyDestroyed(sprite) {
    if (!sprite || !sprite.enemyInstance) return;
    sprite.enemyInstance.die();
  }

  getGroup() {
    return this.group;
  }
}
