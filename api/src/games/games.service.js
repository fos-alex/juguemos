/**
 * Discovery games (JUG-128): short games where the phone does the one part
 * only it can do. ¿Qué suena? is the first (JUG-177): the phone plays a
 * sound, and the kids guess what it is from options the parent reads out.
 * A game is dealt when its juego is suggested and saved with it, so the
 * parent plays what the screen showed, offline too.
 */
import { readFile } from 'node:fs/promises'
import { NotFoundError, ValidationError } from '../errors.js'
import { deal, familyWords } from './rounds.js'
import { SOUNDS_DIR, soundSet } from './sounds.js'

/** @typedef {import('./rounds.js').Game} Game */
/** @typedef {import('./sounds.js').GameKind} GameKind */
/** @typedef {import('../families/families.service.js').Profile} Profile */
/** @typedef {import('../toys/toys.service.js').ToysService} ToysService */
/** @typedef {ReturnType<typeof createGamesService>} GamesService */

/** A sound's file name: its item's key and `.mp3`. */
const SOUND_FILE = /^([a-z0-9-]+)\.mp3$/

/** @param {{ toys: ToysService, random?: () => number }} deps */
export function createGamesService({ toys, random = Math.random }) {
  return {
    /**
     * Deals a game for the kids playing: options for the youngest of them,
     * in the family's own words where they have some.
     * @param {string} familyId
     * @param {GameKind} game
     * @param {Profile} profile the playing profile
     * @returns {Promise<Game>}
     */
    async deal(familyId, game, profile) {
      const set = soundSet(game.set)
      if (!set) throw new ValidationError(`Unknown sound set: ${game.set}`, 'UNKNOWN_GAME')
      const ages = profile.kids.map((kid) => kid.ageMonths).filter((age) => age != null)
      const words = familyWords(set, { pets: profile.pets, toys: await toys.list(familyId) })
      return deal(set, { ageMonths: ages.length > 0 ? Math.min(...ages) : null, words, random })
    },

    /**
     * One sound's recording. Only a file named by an item on the list is
     * read, so no other path on the server can be asked for.
     * @param {string} setKey
     * @param {string} file
     * @returns {Promise<Buffer>}
     */
    async sound(setKey, file) {
      const key = SOUND_FILE.exec(file)?.[1]
      const set = soundSet(setKey)
      if (!key || !set?.items.some((item) => item.key === key)) throw new NotFoundError('No such sound')
      try {
        return await readFile(new URL(`${set.key}/${key}.mp3`, SOUNDS_DIR))
      } catch {
        throw new NotFoundError('No such sound')
      }
    },
  }
}
