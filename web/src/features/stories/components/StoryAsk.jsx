import { useState } from 'react'
import { VoiceLine, VoiceUnderstanding } from '../../voice'
import '../stories.css'

/**
 * The third way into a story on ¿Cuál leemos hoy? (JUG-156): a button that
 * opens the mic hands-free, with the mic beside it for a parent who would
 * rather hold it. While the note records, is transcribed, or is read, the
 * strip takes the button's place, so the whole exchange stays in this row.
 * What went wrong is one line under it. Voice pass pending.
 * @param {{ read: (text: string) => Promise<void> }} props `read` turns the
 *   note's words into the request the screen shows
 */
export function StoryAsk({ read }) {
  const [message, setMessage] = useState(/** @type {import('../../voice').VoiceMessage | null} */ (null))
  return (
    <section className="story-ask">
      <VoiceUnderstanding read={read} onMessage={setMessage}>
        {(record) => (
          <button type="button" className="card story-ask__button" onClick={record}>
            Contame qué cuento querés escuchar
          </button>
        )}
      </VoiceUnderstanding>
      <VoiceLine message={message} />
    </section>
  )
}
