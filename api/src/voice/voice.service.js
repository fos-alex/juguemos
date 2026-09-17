/**
 * Voice notes: a recording in, its words out. The words go back to the parent
 * to check, and then take the same path as typed text, so nothing is saved
 * from a recording without the parent confirming it.
 */

/** @typedef {import('./transcriber.js').Transcriber} Transcriber */
/** @typedef {import('../families/families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('../audit/audit.service.js').AuditService} AuditService */

/** Whisper reads at most 224 tokens of hints; this stays well under. */
const MAX_HINTS = 400

/**
 * @param {{ transcriber: Transcriber | null, families: FamiliesService, audit: AuditService }} deps
 * `transcriber` is null when no speech-to-text service is configured. `audit`
 * keeps each transcription while AUDIT_TRANSCRIPTS is on (JUG-116).
 */
export function createVoiceService({ transcriber, families, audit }) {
  return {
    /** Whether voice notes work on this server. */
    get available() {
      return transcriber !== null
    },

    /**
     * The words in a recording. Once the adult has a family, its names go to
     * the service as hints, so Milán comes back as Milán and not as Milan.
     * @param {string} userId
     * @param {{ audio: Buffer, type: string }} note
     * @returns {Promise<string>}
     */
    async transcribe(userId, { audio, type }) {
      if (!transcriber) throw new Error('No speech-to-text service is configured')
      const familyId = await families.idOf(userId)
      const hints = familyId ? hintsOf(await families.profileOf(familyId)) : undefined
      const text = await transcriber.transcribe({ audio, type, hints })
      await audit.recordTranscript({ userId, familyId, source: 'voice_note', text })
      return text
    },
  }
}

/**
 * The family's own names, as a list the service reads as context: kids, pets,
 * toys, and parents, exactly as the family writes them.
 * @param {import('../families/families.service.js').Profile} profile
 * @returns {string | undefined}
 */
export function hintsOf(profile) {
  const names = [...profile.kids, ...profile.pets, ...profile.toys, ...profile.parents].map((item) => item.name)
  if (names.length === 0) return undefined
  let hints = ''
  for (const name of names) {
    const next = hints ? `${hints}, ${name}` : name
    if (next.length > MAX_HINTS) break
    hints = next
  }
  return `${hints}.`
}
