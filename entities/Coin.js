export default class Coin {
  constructor(scene, onCollected) {
    this.scene = scene;
    this.group = scene.physics.add.staticGroup();
    this.onCollected = onCollected;
    this.spawnKeys = new Set();
  }

  create(x, y) {
    const key = Math.round(x) + ':' + Math.round(y);
    if (this.spawnKeys.has(key)) return null;
    this.spawnKeys.add(key);

    const coin = this.scene.add.circle(x, y, 10, 0xffdd33);
    this.scene.physics.add.existing(coin, true);
    coin.collected = false;

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

    if (this.onCollected) {
      this.onCollected(coinX, coinY);
    }

    this.playCollectEffect(coinX, coinY);
  }

  playCollectEffect(x, y) {
    const sparkle = this.scene.add.circle(x, y, 6, 0xfff799, 0.8);
    const plusOne = this.scene.add.text(x, y - 8, '+1', {
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
