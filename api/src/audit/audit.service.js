/**
 * The audit trail of parents' own words (JUG-116). With AUDIT_TRANSCRIPTS off,
 * which is the default, recording does nothing.
 *
 * The text holds the family's names. It goes into this table and nowhere
 * else: a failed insert throws a DrizzleQueryError, and app.js logs only its
 * query and the Postgres error, never its parameters.
 */
import { auditTranscripts } from './audit.schema.js'

/** @typedef {'family_text' | 'voice_note'} TranscriptSource */
/** @typedef {ReturnType<typeof createAuditService>} AuditService */

/** @param {{ db: import('../db/client.js').Db, enabled: boolean }} deps */
export function createAuditService({ db, enabled }) {
  return {
    /** Whether texts are being kept. */
    enabled,

    /**
     * Keeps a text a parent sent, when the audit is on. A failure throws, so
     * the request fails instead of losing the record without anyone knowing.
     * @param {{ userId: string, familyId: string | null, source: TranscriptSource, text: string }} transcript
     */
    async recordTranscript({ userId, familyId, source, text }) {
      if (!enabled) return
      await db.insert(auditTranscripts).values({ userId, familyId, source, text })
    },
  }
}
