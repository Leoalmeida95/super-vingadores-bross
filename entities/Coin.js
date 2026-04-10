export default class Coin {
  constructor(scene, onCollected) {
    this.scene = scene;
    this.group = scene.physics.add.staticGroup();
    this.onCollected = onCollected;
    this.spawnKeys = new Set();
    this.minDistance = 72;
  }

  createInitial() {
    const worldWidth = this.scene.physics.world.bounds.width;
    for (let i = 0; i < 5; i += 1) {
      let created = false;
      for (let attempt = 0; attempt < 20 && !created; attempt += 1) {
        const coinX = Phaser.Math.Between(100, worldWidth - 100);
        const coinY = Phaser.Math.Between(400, 520);
        if (!this._hasMinDistance(coinX, coinY)) continue;
        created = !!this.create(coinX, coinY);
      }
    }
  }

  spawnChunk(xBase, worldWidth) {
    for (let i = 0; i < 5; i += 1) {
      let created = false;
      for (let attempt = 0; attempt < 20 && !created; attempt += 1) {
        const rawX = xBase + Phaser.Math.Between(0, 200);
        const coinX = Phaser.Math.Clamp(rawX, 100, worldWidth - 100);
        const coinY = Phaser.Math.Between(400, 520);
        if (!this._hasMinDistance(coinX, coinY)) continue;
        created = !!this.create(coinX, coinY);
      }
    }
  }

  _hasMinDistance(x, y) {
    const minDistSq = this.minDistance * this.minDistance;
    const children = this.group.getChildren();
    for (let i = 0; i < children.length; i += 1) {
      const coin = children[i];
      if (!coin || !coin.active) continue;
      const dx = coin.x - x;
      const dy = coin.y - y;
      if ((dx * dx) + (dy * dy) < minDistSq) {
        return false;
      }
    }
    return true;
  }

  create(x, y) {
    const key = Math.round(x) + ':' + Math.round(y);
    if (this.spawnKeys.has(key)) return null;
    this.spawnKeys.add(key);

    const coin = this.scene.add.circle(x, y, 10, 0xffdd33);
    this.scene.physics.add.existing(coin, true);
    coin.collected = false;
    coin.isBigCoin = false;
    coin.coinValue = 1;

    this.group.add(coin);
    return coin;
  }

  createBigCoin(x, y) {
    const key = 'big:' + Math.round(x) + ':' + Math.round(y);
    if (this.spawnKeys.has(key)) return null;
    this.spawnKeys.add(key);

    const coin = this.scene.add.circle(x, y, 20, 0xffcc00);
    this.scene.physics.add.existing(coin, true);
    coin.collected = false;
    coin.isBigCoin = true;
    coin.coinValue = 5;

    this.group.add(coin);
    return coin;
  }

  setupCollection(playerSprite) {
    this.scene.physics.add.overlap(playerSprite, this.group, (playerObj, coin) => {
      this.collect(coin);
    });
  }

  collect(coin) {
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

    const coinValue = coin.coinValue || 1;

    if (this.onCollected) {
      this.onCollected(coinX, coinY, coinValue, coin);
    }

    this.playCollectEffect(coinX, coinY, coinValue);
  }

  playCollectEffect(x, y, coinValue = 1) {
    const sparkle = this.scene.add.circle(x, y, 6, 0xfff799, 0.8);
    const plusOne = this.scene.add.text(x, y - 8, '+' + coinValue, {
      fontSize: '16px',
      color: '#ffe066'
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: sparkle,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 130,
      onComplete: () => sparkle.destroy()
    });

    this.scene.tweens.add({
      targets: plusOne,
      y: y - 28,
      alpha: 0,
      duration: 260,
      onComplete: () => plusOne.destroy()
    });
  }
}
