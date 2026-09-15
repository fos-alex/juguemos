/**
 * The shapes the activity screens work with, as the API sends them.
 */

/**
 * @typedef {{
 *   id: string, title: string, minutes: number, place: 'indoor' | 'outdoor',
 *   why: string, needs: string, steps: string[], easier: string, harder: string,
 * }} Activity
 * `needs` starts lowercase so a toy name at the start keeps its family spelling;
 * the layout capitalises the sentence where it needs to.
 */
/**
 * @typedef {{ activityId: string, endsAt: number }} Timer
 * The juego being played, from Empezar until Terminamos. `endsAt` is in epoch milliseconds.
 */

export {}
