/**
 * The shapes the activity screens work with, as the API sends them.
 */

/**
 * @typedef {{
 *   id: string, title: string, minutes: number, place: 'indoor' | 'outdoor',
 *   why: string, needs: string, steps: string[], easier: string, harder: string,
 *   reaction: 'up' | 'down' | null,
 * }} Activity
 * `needs` starts lowercase so a toy name at the start keeps its family spelling;
 * the layout capitalises the sentence where it needs to. `reaction` is the
 * feedback tap (JUG-23): how the juego went, or null while the parent hasn't said.
 */
/**
 * @typedef {{ activityId: string, endsAt: number }} Timer
 * The juego being played, from Empezar until Terminamos. `endsAt` is in epoch milliseconds.
 */

export {}
