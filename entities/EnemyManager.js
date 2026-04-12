import Enemy from './Enemy.js';

const ENEMIES_PER_CHUNK_BASE = 1;
const ENEMIES_PER_CHUNK_PER_PHASE = 1;
const MAX_ENEMIES_PER_CHUNK = 8;
const CHUNK_ENEMY_SPACING = 70;
const CHUNK_FIRST_OFFSET = 40;

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

  createEnemy(x, y, minX, maxX) {
    const enemy = new Enemy(this.scene, x, y, minX, maxX, this.group);
    this.instances.push(enemy);
    this._applyEnemyDifficulty(enemy);
    return enemy;
  }

  createInitial(baseEnemyCount = 3, extraEnemies = 0) {
    const basePositions = [
      { x: 300, y: 520, minX: 220, maxX: 420 },
      { x: 520, y: 520, minX: 460, maxX: 700 },
      { x: 700, y: 520, minX: 620, maxX: 780 }
    ];

    for (let i = 0; i < Math.min(baseEnemyCount, basePositions.length); i += 1) {
      const pos = basePositions[i];
      this.createEnemy(pos.x, pos.y, pos.minX, pos.maxX);
    }

    for (let i = 0; i < extraEnemies; i += 1) {
      const x = Phaser.Math.Between(200, 1000);
      this.createEnemy(x, 520, x - 80, x + 80);
    }
  }

  spawnChunk(baseX, worldWidth) {
    const phase = Math.max(1, this.phaseNumber);
    const enemiesPerChunk = Math.min(
      MAX_ENEMIES_PER_CHUNK,
      ENEMIES_PER_CHUNK_BASE + (phase * ENEMIES_PER_CHUNK_PER_PHASE)
    );

    for (let i = 0; i < enemiesPerChunk; i += 1) {
      const jitter = Phaser.Math.Between(-20, 20);
      const enemyX = Phaser.Math.Clamp(
        baseX + CHUNK_FIRST_OFFSET + (i * CHUNK_ENEMY_SPACING) + jitter,
        120,
        worldWidth - 120
      );
      const patrolRange = Phaser.Math.Between(70, 110);
      this.createEnemy(enemyX, 520, enemyX - patrolRange, enemyX + patrolRange);
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
