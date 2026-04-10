import Enemy from './Enemy.js';

export default class EnemyManager {
  constructor(scene, ground) {
    this.scene = scene;
    this.ground = ground;
    this.group = scene.physics.add.group();
    this.instances = [];
    this.phaseNumber = 1;

    Enemy.createAnimations(scene);
    scene.physics.add.collider(this.group, ground);
  }

  _applyEnemyDifficulty(enemyInstance) {
    if (!enemyInstance) return;
    const phaseSpeedBonus = this.phaseNumber * 10;
    enemyInstance.speed = 80 + phaseSpeedBonus;
  }

  setPhaseDifficulty(phaseNumber) {
    this.phaseNumber = phaseNumber;
    this.instances.forEach((enemy) => this._applyEnemyDifficulty(enemy));
  }

  createInitial() {
    const enemy1 = new Enemy(this.scene, 300, 520, 220, 420, this.group);
    const enemy2 = new Enemy(this.scene, 520, 520, 460, 700, this.group);
    const enemy3 = new Enemy(this.scene, 700, 520, 620, 780, this.group);

    this.instances.push(enemy1);
    this.instances.push(enemy2);
    this.instances.push(enemy3);

    this._applyEnemyDifficulty(enemy1);
    this._applyEnemyDifficulty(enemy2);
    this._applyEnemyDifficulty(enemy3);
  }

  spawnChunk(baseX, worldWidth) {
    const enemyX1 = Phaser.Math.Clamp(baseX + 40, 120, worldWidth - 120);
    const enemy1 = new Enemy(this.scene, enemyX1, 520, enemyX1 - 90, enemyX1 + 90, this.group);
    this.instances.push(enemy1);
    this._applyEnemyDifficulty(enemy1);

    const chunk = Math.floor(baseX / 400);
    if (chunk % 2 === 0) {
      const enemyX2 = Phaser.Math.Clamp(baseX + 220, 120, worldWidth - 120);
      const enemy2 = new Enemy(this.scene, enemyX2, 520, enemyX2 - 70, enemyX2 + 70, this.group);
      this.instances.push(enemy2);
      this._applyEnemyDifficulty(enemy2);
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
