const geckos = require('@geckos.io/server').default
const { iceServers } = require('@geckos.io/server')

const { Scene } = require('phaser')
const Player = require('./components/player')
const Star = require('./components/star')

class GameScene extends Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.playerId = 0
  }

  init() {
    this.io = geckos({
      iceServers: process.env.NODE_ENV === 'production' ? iceServers : []
    })
    this.io.addServer(this.game.server)
  }

  getId() {
    return this.playerId++
  }

  prepareToSync(player) {
    console.log(player.points)
    return `${player.playerId},${Math.round(player.x).toString(
      36
    )},${Math.round(player.y).toString(36)},${player.dead === true ? 1 : 0},${player.points}`
  }
  prepareStarToSync(star) {
    return `${star.starId},${Math.round(star.x).toString(
      36
    )},${Math.round(star.y).toString(36)},${star.dead === true ? 1 : 0},`
  }

  getState() {
    let statePlayers = ''
    let stateStars = ''
    this.playersGroup.children.iterate(player => {
      statePlayers += this.prepareToSync(player)
    })
    this.starsGroup.children.iterate(star => {
      stateStars += this.prepareStarToSync(star)
    })
    return { players: statePlayers, stars: stateStars }
  }

  create() {
    this.playersGroup = this.add.group()
    this.starsGroup = this.add.group()

    const addDummy = () => {
      let x = Phaser.Math.RND.integerInRange(50, 800)
      let y = Phaser.Math.RND.integerInRange(100, 400)
      let id = Math.random()

      let dead = this.playersGroup.getFirstDead()
      if (dead) {
        dead.revive(id, true)
        dead.setPosition(x, y)
      } else {
        const player = new Player(this, id, x, y, true)
        //this.physics.add.collider(player, this.playersGroup);
        //this.physics.add.collider(player, this.starsGroup);
        //this.physics.add.overlap(player, this.playersGroup, player.onColide, null, this);

        this.playersGroup.add(player)
      }
    }

    const addStar = () => {
      let x = Phaser.Math.RND.integerInRange(50, 800)
      let y = Phaser.Math.RND.integerInRange(100, 400)
      let id = Math.random()

      const star = new Star(this, id, x, y)
      star.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
      //this.physics.add.collider(star, this.playersGroup);
      this.physics.add.overlap(star, this.playersGroup, star.onColide, null, this);
      this.starsGroup.add(star)
    }

    this.io.onConnection(channel => {
      channel.onDisconnect(() => {
        console.log('Disconnect user ' + channel.id)
        this.playersGroup.children.each(player => {
          if (player.playerId === channel.playerId) {
            player.kill()
          }
        })
        channel.room.emit('removePlayer', channel.playerId)
      })

      channel.on('addDummy', addDummy)
      channel.on('addStar', addStar)

      channel.on('getId', () => {
        channel.playerId = this.getId()
        channel.emit('getId', channel.playerId.toString(36))
      })

      channel.on('playerMove', data => {
        this.playersGroup.children.iterate(player => {
          if (player.playerId === channel.playerId) {
            player.setMove(data)
          }
        })
      })

      channel.on('addPlayer', data => {
        let dead = this.playersGroup.getFirstDead()
        if (dead) {
          dead.revive(channel.playerId, false)
        } else {
          const player = new Player(this, channel.playerId)
          this.physics.add.collider(player, this.playersGroup);
          //this.physics.add.overlap(player, this.playersGroup, player.onColide, null, this);

          this.playersGroup.add(player)
        }
      })

      channel.emit('ready')
    })
  }

  update() {
    let updates = ''
    let startUpdates = ''
    this.playersGroup.children.iterate(player => {
      let x = Math.abs(player.x - player.prevX) > 0.5
      let y = Math.abs(player.y - player.prevY) > 0.5
      let dead = player.dead != player.prevDead
      if (x || y || dead) {
        if (dead || !player.dead) {
          updates += this.prepareToSync(player)
        }
      }
      player.postUpdate()
    })
    this.starsGroup.children.iterate(star => {
      let x = Math.abs(star.x - star.prevX) > 0.5
      let y = Math.abs(star.y - star.prevY) > 0.5
      let dead = star.dead != star.prevDead
      if (x || y || dead) {
        if (dead || !star.dead) {
          startUpdates += this.prepareStarToSync(star)
        }
      }
      star.postUpdate()
    })

    if (updates.length > 0) {
      this.io.room().emit('updateObjects', [updates])
    }
    if (startUpdates.length > 0) {
      this.io.room().emit('starUpdateObjects', [startUpdates])
    }
  }
}

module.exports = GameScene
