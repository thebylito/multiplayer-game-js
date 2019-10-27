/// <reference path="../../phaser.d.ts" />

import { Scene } from 'phaser'
import axios from 'axios'
import Player from '../components/player'
import Star from '../components/star'
import Cursors from '../components/cursors'
import Controls from '../components/controls'
import FullscreenButton from '../components/fullscreenButton'

export default class GameScene extends Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.objects = {}
    this.stars = {}
    this.playerId
    this.playerPoints = null;

  }

  init({ channel }) {
    this.channel = channel
  }

  preload() {
    this.load.image('controls', 'controls.png')
    this.load.image('star', 'star.png');
    this.load.spritesheet('fullscreen', 'fullscreen.png', {
      frameWidth: 64,
      frameHeight: 64
    })
    this.load.spritesheet('player', 'player.png', {
      frameWidth: 32,
      frameHeight: 48
    })
  }

  async create() {
    new Cursors(this, this.channel)
    new Controls(this, this.channel)

    FullscreenButton(this)

    let addDummyDude = this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 - 100,
        'CLICK ME',
        { fontSize: 48 }
      )
      .setOrigin(0.5)
    addDummyDude.setInteractive().on('pointerdown', () => {
      this.channel.emit('addDummy')
    })
    let addStar = this.add
      .text(
        this.cameras.main.width / 2 + 300,
        this.cameras.main.height / 2 - 100,
        'Star',
        { fontSize: 48 }
      )
      .setOrigin(0.5)

    addStar.setInteractive().on('pointerdown', () => {
      this.channel.emit('addStar')
    })

    this.playerPoints = this.add
    .text(
      100,
      10,
      `Pontos: 0`,
      { fontSize: 20 }
    )
    .setOrigin(0.5)

    const parseUpdates = updates => {
      if (typeof updates === undefined || updates === '') return []
      // parse
      let u = updates.split(',')
      u.pop()
      let u2 = []
      u.forEach((el, i) => {
        if (i % 4 === 0) {
          console.log(u)
          u2.push({
            playerId: u[i + 0],
            x: parseInt(u[i + 1], 36),
            y: parseInt(u[i + 2], 36),
            dead: parseInt(u[i + 3]) === 1 ? true : false,
            points: u[i + 4],
          })
        }
      })
      return u2
    }
    const parseStarUpdates = updates => {
      if (typeof updates === undefined || updates === '') return []
      // parse
      let u = updates.split(',')
      u.pop()
      let u2 = []
      u.forEach((el, i) => {
        if (i % 4 === 0) {
          u2.push({
            starId: u[i + 0],
            x: parseInt(u[i + 1], 36),
            y: parseInt(u[i + 2], 36),
            dead: parseInt(u[i + 3]) === 1 ? true : false
          })
        }
      })
      return u2
    }

    const updatesHandler = updates => {
      updates.forEach(gameObject => {
        console.log(gameObject)
        const { playerId, x, y, dead, points } = gameObject
        const alpha = dead ? 0 : 1

        if (Object.keys(this.objects).includes(playerId)) {
          // if the gameObject does already exist,
          // update the gameObject
          let sprite = this.objects[playerId].sprite
          sprite.setAlpha(alpha)
          sprite.setPosition(x, y)
          if (this.playerId === playerId) {
            console.log({points})
            this.playerPoints.setText(`Pontos: ${points}`)
            //this.playerPoints = points
          }
        } else {
          // if the gameObject does NOT exist,
          // create a new gameObject
          let newGameObject = {
            sprite: new Player(this, playerId, x || 200, y || 200),
            playerId: playerId
          }
          newGameObject.sprite.setAlpha(alpha)
          this.objects = { ...this.objects, [playerId]: newGameObject }
        }
      })
    }

    const starUpdatesHandler = updates => {
      updates.forEach(gameObject => {
        const { starId, x, y, dead } = gameObject
        const alpha = dead ? 0 : 1
        if (Object.keys(this.stars).includes(starId)) {
          // if the gameObject does already exist,
          // update the gameObject
          let sprite = this.stars[starId].sprite
          sprite.setAlpha(alpha)
          sprite.setPosition(x, y)
          if (dead) {
            sprite.destroy()
            delete this.stars[starId]
          }
        } else {
          if (!dead) {

            // if the gameObject does NOT exist,
            // create a new gameObject
            let newGameObject = {
              sprite: new Star(this, starId, x || 200, y || 200),
              starId: starId
            }
            newGameObject.sprite.setAlpha(alpha)
            this.stars = { ...this.stars, [starId]: newGameObject }
          }
        }
      })
    }

    this.channel.on('updateObjects', updates => {
      let parsedUpdates = parseUpdates(updates[0])
      updatesHandler(parsedUpdates)
    })
    this.channel.on('starUpdateObjects', starUpdates => {
      let parsedUpdates = parseStarUpdates(starUpdates[0])
      starUpdatesHandler(parsedUpdates)
    })

    this.channel.on('removePlayer', playerId => {
      try {
        this.objects[playerId].sprite.destroy()
        delete this.objects[playerId]
      } catch (error) {
        console.error(error.message)
      }
    })

    try {
      let res = await axios.get(
        `${location.protocol}//${location.hostname}:1444/getState`
      )

      let parsedPlayersUpdates = parseUpdates(res.data.state.players)
      let parsedStarsUpdates = parseStarUpdates(res.data.state.stars)
      updatesHandler(parsedPlayersUpdates)
      starUpdatesHandler(parsedStarsUpdates)

      this.channel.on('getId', playerId36 => {
        console.log({ playerId36 })
        this.playerId = parseInt(playerId36, 36)
        this.channel.emit('addPlayer')
      })

      this.channel.emit('getId')
    } catch (error) {
      console.error(error.message)
    }
  }
}
