import Phaser from 'phaser'

export default class Player extends Phaser.GameObjects.Sprite {
  constructor(scene, channelId, x, y) {
    super(scene, x, y, 'star')
    scene.add.existing(this)
    this.channelId = channelId
  }
}
