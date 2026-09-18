/**
 * The phone's part in ¿Qué suena? (JUG-177): it plays a recording and says
 * the answer out loud. Nothing here knows React, so a native client can
 * replace it, like the voice note's recorder.
 *
 * Sound plays only on the parent's tap. A game's recordings are fetched
 * whole when it opens and played from memory, so a round starts at once,
 * keeps working if the signal drops, and never depends on the server
 * answering the range requests Safari makes for a streamed file. One audio
 * element plays them all: Safari lets a page play sound only from a tap,
 * and an element a tap has played once can play again.
 */

/** @type {HTMLAudioElement | null} */
let audio = null
/** Object URLs of the recordings fetched, by their API URL. @type {Map<string, string>} */
const ready = new Map()
/** @type {Map<string, Promise<void>>} */
const loading = new Map()

/** Where a recording is. @param {string} set @param {string} sound */
export const soundUrl = (set, sound) => `/api/sounds/${set}/${sound}.mp3`

/**
 * Fetches a recording into memory, once. It rejects when the phone is
 * offline or the server won't send it, and a later call tries again.
 * @param {string} url
 * @returns {Promise<void>}
 */
export function load(url) {
  if (ready.has(url)) return Promise.resolve()
  let pending = loading.get(url)
  if (!pending) {
    pending = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.blob()
      })
      .then((blob) => {
        ready.set(url, URL.createObjectURL(blob))
      })
      .finally(() => loading.delete(url))
    loading.set(url, pending)
  }
  return pending
}

/** Whether a recording is in memory and will play at once. @param {string} url */
export const isLoaded = (url) => ready.has(url)

/**
 * Plays a recording from the start. Call it from the tap itself, and only
 * for one that is loaded.
 * @param {string} url
 */
export function play(url) {
  const source = ready.get(url)
  if (!source) return
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
  audio ??= new Audio()
  audio.src = source
  audio.currentTime = 0
  void audio.play().catch(() => {})
}

/** Stops the recording and the voice. */
export function stop() {
  audio?.pause()
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}

/**
 * Says the answer in the phone's own voice, in Spanish. No phone has a
 * Rioplatense voice yet, so this takes the closest it has; recorded answers
 * can replace it.
 * @param {string} text
 */
export function say(text) {
  if (typeof speechSynthesis === 'undefined') return
  audio?.pause()
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'es-AR'
  const voice = spanishVoice()
  if (voice) utterance.voice = voice
  utterance.rate = 0.9
  speechSynthesis.speak(utterance)
}

/** The Spanish voice closest to Buenos Aires, or null to let the phone choose. */
function spanishVoice() {
  const voices = speechSynthesis.getVoices()
  const lang = (/** @type {SpeechSynthesisVoice} */ voice) => voice.lang.replace('_', '-').toLowerCase()
  for (const wanted of ['es-ar', 'es-419', 'es-us', 'es-mx']) {
    const voice = voices.find((each) => lang(each) === wanted)
    if (voice) return voice
  }
  return voices.find((each) => lang(each).startsWith('es')) ?? null
}

/**
 * While the game is open, the phone plays its sound even with the ringer
 * off, as a video would, since the parent tapped to hear it. Safari 17 and
 * later; elsewhere it changes nothing. Returns the way back.
 * @returns {() => void}
 */
export function playEvenOnSilent() {
  const session = /** @type {{ audioSession?: { type: string } }} */ (/** @type {unknown} */ (navigator)).audioSession
  if (!session) return () => {}
  const before = session.type
  session.type = 'playback'
  return () => {
    session.type = before
  }
}

// Some browsers list their voices only after being asked once.
if (typeof speechSynthesis !== 'undefined') speechSynthesis.getVoices()
