/** An activity in words, with no React. */

/** @typedef {import('./types').Activity} Activity */

/** Where an activity happens, as the parent reads it. @param {Activity['place']} place */
export function placeText(place) {
  return place === 'outdoor' ? 'afuera' : 'adentro'
}
