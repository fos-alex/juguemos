/**
 * The shapes the activity screens work with, as the API sends them.
 */

/**
 * @typedef {{
 *   id: string, title: string, minutes: number, place: 'indoor' | 'outdoor',
 *   why: string, needs: string, steps: string[], easier: string, harder: string,
 *   game?: Game | null, reaction: 'up' | 'down' | null,
 * }} Activity
 * `needs` starts lowercase so a toy name at the start keeps its family spelling;
 * the layout capitalises the sentence where it needs to. `game` is the
 * discovery game Empezar opens instead of the timer (JUG-177); a juego cached
 * before it has none. `reaction` is the feedback tap (JUG-23): how the juego
 * went, or null while the parent hasn't said.
 */
/**
 * @typedef {{ type: 'sounds', set: string, rounds: Round[] }} Game
 * ¿Qué suena? (JUG-177): five rounds from one sound set, dealt by the API for
 * the kids playing.
 */
/**
 * @typedef {{
 *   sound: string, options: string[], answer: number,
 *   credit: { author: string, license: string, source: string } | null,
 * }} Round
 * `sound` is the recording's name in its set, `options` are the words the
 * parent reads, and `answer` is the index of the right one. `credit` is there
 * only when the recording's license asks for it.
 */
/**
 * @typedef {'calm' | 'lively'} Mood
 * What the family is up for: tranqui winds the kids down, con pilas gets them moving (JUG-26).
 */
/**
 * @typedef {{ mood: Mood, until: number }} MoodChoice
 * The parent's own tap, which holds until the next 19:00 or 07:00, in epoch milliseconds.
 */
/**
 * @typedef {{ activityId: string, endsAt: number }} Timer
 * The juego being played, from Empezar until Terminamos. `endsAt` is in epoch milliseconds.
 */

export {}
