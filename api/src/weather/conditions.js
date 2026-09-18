/**
 * What the weather means for play (JUG-25), as pure logic: given the next few
 * hours where the family lives, is it a day to be outside, one to stay in, or
 * neither? The ranking reads the answer and nothing else, so the thresholds
 * live here alone and each one has its own test.
 *
 * The window is now and the next few hours, not the instant: a juego lasts
 * twenty minutes and getting out the door takes longer, so rain that starts
 * in an hour already rules the plaza out.
 *
 * Buenos Aires decides what counts (docs/product-concept.md): hot, humid
 * summers with heat waves and sudden storms, and cold, damp winters. Rain and
 * heat matter here, snow does not.
 */

/** @typedef {'fine' | 'fair' | 'poor'} Weather */
/** @typedef {'clear' | 'rain' | 'storm' | 'cold' | 'heat' | 'wind' | 'fog' | 'grey'} Reason */
/**
 * @typedef {object} Hour one hour where the family lives
 * @property {number} temperature what it feels like, in °C, which is the
 *   apparent temperature: humidity and wind are half of a Buenos Aires summer
 * @property {number} rain how much rain is expected, in mm
 * @property {number} rainChance the chance of rain, from 0 to 100
 * @property {number} wind the wind, in km/h
 * @property {number} code the WMO weather code
 */
/** @typedef {{ hours: Hour[] }} Forecast now and the next few hours, in order */
/** @typedef {{ weather: Weather, reason: Reason }} Conditions */

/**
 * Where the lines are drawn, in one place so they can be moved after a
 * summer and a winter of playtesting.
 */
export const LIMITS = {
  /** How many hours ahead are read, counting the one that has started. */
  hours: 4,
  /** What it has to feel like, in °C, for outside to be the better idea. */
  warmEnough: 16,
  coolEnough: 28,
  /** What it feels like when a small child shouldn't be out in it, in °C. */
  tooCold: 9,
  tooHot: 32,
  /** The chance of rain, in percent, that sends a plan indoors. */
  rainChance: 40,
  /** Rain already falling, in mm over an hour. */
  raining: 0.2,
  /** Wind that blows a game over, in km/h. */
  windy: 30,
  /** Wind calm enough not to matter, in km/h. */
  breezy: 20,
}

/**
 * The WMO weather codes, grouped by what they mean for going outside.
 * Open-Meteo sends one per hour, and every provider we might use speaks them.
 */
const CODES = {
  /** Clear, a few clouds, or overcast: nothing in the way of the plaza. */
  clear: [0, 1, 2, 3],
  fog: [45, 48],
  /** Thunderstorms and hail, and the snow and freezing rain this city barely sees. */
  storm: [56, 57, 66, 67, 71, 73, 75, 77, 85, 86, 95, 96, 99],
}

/**
 * How the next few hours look for play. `fine` is a day the plaza beats the
 * living room, `poor` one to stay in, and `fair` everything in between, which
 * changes nothing. The reason says what decided it, and is kept on the
 * activity so a suggestion can be read back.
 *
 * The worst hour in the window decides: one hour of rain in the middle of an
 * otherwise clear afternoon is still rain by the time they are out.
 * @param {Forecast} forecast
 * @returns {Conditions}
 */
export function conditionsFor({ hours }) {
  const window = hours.slice(0, LIMITS.hours)
  if (window.length === 0) return { weather: 'fair', reason: 'grey' }

  const worst = /** @param {(hour: Hour) => number} of */ (of) => Math.max(...window.map(of))
  const coldest = Math.min(...window.map((hour) => hour.temperature))
  const hottest = worst((hour) => hour.temperature)
  const rainChance = worst((hour) => hour.rainChance)
  const rain = worst((hour) => hour.rain)
  const wind = worst((hour) => hour.wind)
  const codes = window.map((hour) => hour.code)

  // Poor: what a parent would call the plaza off for, worst first, so the
  // reason names the reason they would give.
  if (codes.some((code) => CODES.storm.includes(code))) return { weather: 'poor', reason: 'storm' }
  if (rain >= LIMITS.raining || rainChance >= LIMITS.rainChance) return { weather: 'poor', reason: 'rain' }
  if (hottest >= LIMITS.tooHot) return { weather: 'poor', reason: 'heat' }
  if (coldest <= LIMITS.tooCold) return { weather: 'poor', reason: 'cold' }
  if (wind >= LIMITS.windy) return { weather: 'poor', reason: 'wind' }

  // Fine: an afternoon worth taking outside. Everything it asks for has to
  // hold for the whole window, so a good hour before the weather turns
  // doesn't count as one.
  if (!codes.every((code) => CODES.clear.includes(code))) {
    return { weather: 'fair', reason: codes.some((code) => CODES.fog.includes(code)) ? 'fog' : 'grey' }
  }
  const mild = coldest >= LIMITS.warmEnough && hottest <= LIMITS.coolEnough
  if (mild && wind <= LIMITS.breezy) return { weather: 'fine', reason: 'clear' }
  return { weather: 'fair', reason: mild ? 'wind' : coldest < LIMITS.warmEnough ? 'cold' : 'heat' }
}
