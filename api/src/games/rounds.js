/**
 * Deals a game of ¿Qué suena? (JUG-177): five sounds from one set, each with
 * the options the parent reads out. Pure: `random` is the only source of
 * chance, so a seeded one deals the same game every time.
 *
 * How many options, and how close, follows the youngest kid playing. Under 3,
 * three that sound nothing alike, like a cow, a rooster, and a cat; two were
 * too easy even for them. From 3, three, one of them close to the answer.
 * From 5, four, as many close ones as the set has, like a horse, a donkey,
 * and a cow. A family with no ages is dealt as for a 3-year-old, the age
 * stories fall back on too.
 *
 * An option is the family's own word when they have one: the pet's name for
 * its animal, and a toy's name for what the toy is, so the kids can answer
 * with it in hand.
 */
import { creditOf, mentions, needsCredit } from './sounds.js'

/** @typedef {import('./sounds.js').SoundSet} SoundSet */
/** @typedef {import('./sounds.js').SoundItem} SoundItem */
/**
 * @typedef {object} Round
 * @property {string} sound the item's key, which is its file's name in the set
 * @property {string[]} options as the parent reads them
 * @property {number} answer the index of the right one in `options`
 * @property {{ author: string, license: string, source: string } | null} credit only when the license asks for it
 */
/** @typedef {{ type: 'sounds', set: string, rounds: Round[] }} Game */
/** @typedef {{ name: string, kind: string }} Pet */
/** @typedef {{ name: string, aliases: string[], description: string | null }} Toy */

export const ROUNDS = 5

/**
 * How many options a round has, and how many of the wrong ones sound close
 * to the answer.
 * @param {number | null} ageMonths the youngest kid playing
 * @returns {{ count: number, close: number }}
 */
export function optionsFor(ageMonths) {
  const months = ageMonths ?? 36
  if (months < 36) return { count: 3, close: 0 }
  if (months < 60) return { count: 3, close: 1 }
  return { count: 4, close: 3 }
}

/**
 * The family's own words for a set's items: the pet's name for its animal,
 * and a toy's name for what it is. A toy whose words name more than one item,
 * like a farm with every animal in it, names none, and a toy names one item
 * at most. The pet goes first.
 * @param {SoundSet} set
 * @param {{ pets: Pet[], toys: Toy[] }} family
 * @returns {Map<string, string>} by item key
 */
export function familyWords(set, { pets, toys }) {
  /** @type {Map<string, string>} */
  const words = new Map()
  for (const item of set.items) {
    const pet = item.pet && pets.find((each) => each.kind === item.pet)
    if (pet) words.set(item.key, pet.name)
  }
  const used = new Set(words.values())
  for (const toy of toys) {
    if (used.has(toy.name)) continue
    const texts = [toy.name, ...toy.aliases, toy.description ?? '']
    const named = set.items.filter((item) => texts.some((text) => mentions(text, item.stems)))
    if (named.length !== 1 || words.has(named[0].key)) continue
    words.set(named[0].key, toy.name)
    used.add(toy.name)
  }
  return words
}

/**
 * @param {SoundSet} set
 * @param {{ ageMonths: number | null, words?: Map<string, string>, random: () => number }} context
 *   `ageMonths` is the youngest kid playing's, and `words` the family's own for the items
 * @returns {Game}
 */
export function deal(set, { ageMonths, words = new Map(), random }) {
  const { count, close } = optionsFor(ageMonths)
  const rounds = shuffle(set.items, random)
    .slice(0, ROUNDS)
    .map((item) => {
      const others = set.items.filter((each) => each.key !== item.key)
      const alike = shuffle(
        others.filter((each) => each.group === item.group),
        random,
      )
      const unlike = shuffle(
        others.filter((each) => each.group !== item.group),
        random,
      )
      // The close ones first, up to `close`; then ones nothing like it, and
      // only when the set runs out of those, more close ones.
      const wrong = [...alike.slice(0, close), ...unlike, ...alike.slice(close)].slice(0, count - 1)
      const options = shuffle([item, ...wrong], random)
      const credit = creditOf(set.key, item.key)
      return {
        sound: item.key,
        options: options.map((each) => words.get(each.key) ?? each.name),
        answer: options.indexOf(item),
        credit:
          credit && needsCredit(credit.license)
            ? { author: credit.author, license: credit.license, source: credit.source }
            : null,
      }
    })
  return { type: 'sounds', set: set.key, rounds }
}

/**
 * A copy in random order, Fisher–Yates.
 * @template T
 * @param {T[]} list
 * @param {() => number} random
 * @returns {T[]}
 */
function shuffle(list, random) {
  const copy = [...list]
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    ;[copy[index], copy[other]] = [copy[other], copy[index]]
  }
  return copy
}
