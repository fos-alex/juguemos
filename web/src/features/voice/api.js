/**
 * Voice notes, against the real API: the recording goes up as it is, and its
 * words come back for the parent to check. It reads `fetch` directly because
 * `request` only speaks JSON; like it, no network means `OfflineError`. The
 * audio is never stored on the device.
 */
import { ApiError, endSession, OfflineError } from '../../shared/http'

/** The server has no speech-to-text service, so voice notes are off. */
export class VoiceOffError extends Error {}

/**
 * @param {Blob} audio as the recorder made it
 * @returns {Promise<string>} the words, empty when nothing could be heard
 */
export async function transcribe(audio) {
  if (!navigator.onLine) throw new OfflineError('Sin conexión')

  let response
  try {
    response = await fetch('/api/voice/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': audio.type || 'audio/webm' },
      body: audio,
    })
  } catch {
    throw new OfflineError('Sin conexión')
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401) endSession()
    if (data?.code === 'VOICE_OFF') throw new VoiceOffError('Voice notes are off')
    throw new ApiError(data?.error ?? `HTTP ${response.status}`, response.status, data?.code)
  }
  return typeof data?.text === 'string' ? data.text.trim() : ''
}
