import { StatusLine, TertiaryButton } from '../../../shared/ui'
import '../voice.css'

/** @typedef {import('./VoiceNote').VoiceMessage} VoiceMessage */

/**
 * What a voice note has to say when it couldn't do its part: one line, and
 * "Mandar de nuevo" when trying again is worth it. Every screen with a mic
 * shows it the same way, under whatever the parent is checking. Nothing shows
 * when there is no message.
 * @param {{ message: VoiceMessage | null, className?: string }} props
 */
export function VoiceLine({ message, className = '' }) {
  if (!message) return null
  return (
    <div className={`voice-message ${className}`}>
      <StatusLine role="status">{message.text}</StatusLine>
      {message.retry && (
        // Voice pass pending.
        <TertiaryButton size="inline" onClick={message.retry}>
          Mandar de nuevo
        </TertiaryButton>
      )}
    </div>
  )
}
