import { useRef, useState } from 'react'
import { VoiceNote } from './VoiceNote'
import { failureText } from '../../../shared/format'
import { WordedError } from '../../../shared/http'
import { useSlowWait } from '../../../shared/hooks/useSlowWait'
import { Waiting } from '../../../shared/ui/Waiting'
import '../voice.css'

/** @typedef {import('./VoiceNote').VoiceMessage} VoiceMessage */

/**
 * A voice note whose words the screen then has to read (JUG-103, JUG-146).
 * The mic records and transcribes as always, and `read` takes it from there:
 * it asks the API what the words mean and puts the answer on screen, where
 * the parent confirms it before anything is saved. While `read` runs,
 * "Leyendo" takes the place of whatever sits beside the mic, the way
 * "Transcribiendo" does before it.
 *
 * What went wrong goes to `onMessage` in one line, with "Mandar de nuevo"
 * when reading the same words again is worth a try. A `WordedError` from
 * `read` is shown as it is and without the retry, which is how a screen says
 * that the words were read and had nothing in them.
 *
 * Only the newest note counts: an answer to an older one is dropped, since
 * the parent has already moved on from what it would change.
 * @param {{
 *   read: (text: string) => Promise<void>,
 *   onMessage: (message: VoiceMessage | null) => void,
 *   onRecording?: (recording: boolean) => void,
 *   children: React.ReactNode,
 * }} props
 */
export function VoiceUnderstanding({ read, onMessage, onRecording, children }) {
  const [reading, setReading] = useState(false)
  // Reading that takes a while says so, instead of one word and an animation.
  const slow = useSlowWait(reading)
  const latest = useRef(0)

  /** @param {string} text */
  const understand = async (text) => {
    const note = ++latest.current
    setReading(true)
    try {
      await read(text)
    } catch (error) {
      if (note !== latest.current) return
      const retry = error instanceof WordedError ? undefined : () => void understand(text)
      onMessage({ text: failureText(error), retry })
    } finally {
      if (note === latest.current) setReading(false)
    }
  }

  return (
    <VoiceNote onText={understand} onMessage={onMessage} onRecording={onRecording}>
      {reading ? (
        <div className="voice__strip" role="status">
          <Waiting size="strip" />
          {/* Voice pass pending. */}
          <span className="voice__sending">{slow ? 'Sigo leyendo. Ya casi está.' : 'Leyendo'}</span>
        </div>
      ) : (
        children
      )}
    </VoiceNote>
  )
}
