const Phaser = require('phaser')

class Star extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, starId, x = 200, y = 200) {
    super(scene, x, y, '')
    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.scene = scene

    this.prevX = -1
    this.prevY = -1

    this.dead = false
    this.prevDead = false

    this.starId = starId
    this.move = {}

    this.setCollideWorldBounds(true)

    scene.events.on('update', this.update, this)
  }


  onColide(star, player){
    star.kill()
    star.disableBody(true, true);
    player.points += 1;
    console.log('player.points:', player.points)
  }

  kill() {
    this.dead = true
    this.setActive(false)
  }

  setMove(data) {
    let int = parseInt(data, 36)

    let move = {
      left: int === 1 || int === 5 ? true : false,
      right: int === 2 || int === 6 ? true : false,
      up: int === 4 || int === 6 || int === 5 ? true : false,
      none: int === 8 ? true : false
    }

    this.move = move
  }

  update() {
    if (this.move.left) this.setVelocityX(-160)
    else if (this.move.right) this.setVelocityX(160)
    else this.setVelocityX(0)

    if (this.move.up && this.body.onFloor()) this.setVelocityY(-550)
  }

  postUpdate() {
     this.prevX = this.x
     this.prevY = this.y
     this.prevDead = this.dead
  }
}

module.exports = Star
