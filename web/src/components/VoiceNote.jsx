import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { OfflineError, transcribe, VoiceOffError } from '../api'
import { clockText, failureText } from '../shared/format'
import { canRecord, MicDeniedError, startRecording } from '../lib/recorder'
import { Dots } from '../shared/ui/Buttons'
import './VoiceNote.css'

/** How far the finger travels, in px, to lock the note or to drop it. */
const LOCK_AT = 72
const CANCEL_AT = 110
/** Shorter than this is a tap on the mic, not a note. */
const MIN_SECONDS = 0.7
/** Bars in the level trace; the strip shows the newest that fit. */
const BARS = 32
const TICK_MS = 90

/**
 * @typedef {'idle' | 'starting' | 'held' | 'locked' | 'sending'} Phase
 * `starting` waits for the microphone, and for the parent's permission the
 * first time; `held` records under the finger; `locked` records hands-free.
 */
/** @typedef {{ text: string, retry?: () => void }} VoiceMessage */

// Voice pass pending: every line below, "Pasando a texto", and "Enviar".
const HOLD_TO_TALK = 'Mantené apretado el micrófono mientras hablás.'
const MIC_DENIED = 'No tengo permiso para usar el micrófono. Podés darlo en los ajustes del navegador, o escribirlo.'
const CANNOT_RECORD = 'Este navegador no puede grabar. Escribilo y listo.'
const VOICE_OFF = 'Las notas de voz no andan por ahora. Escribilo y listo.'
const NOTHING_HEARD = 'No se escuchó nada. ¿Probamos de nuevo?'

/**
 * The mic from 2e, and the composer row it turns into. Hold to record, slide
 * up to lock hands-free, slide left or lift on "cancelar" to drop the note,
 * and lift anywhere else to send it: no confirm step and no playback. Silent
 * throughout, with no sounds and no vibration. From the keyboard, the mic
 * starts a hands-free note.
 *
 * While idle it shows `children` beside the mic (Listo, on 2d), and while
 * recording the strip takes their place, so nothing sits beside the mic to be
 * hit by mistake. The words come back through `onText` for the parent to
 * check. `onMessage` says what went wrong, with a retry when the note is
 * still here to send again; the recording is held in memory only for that.
 * @param {{
 *   children: React.ReactNode,
 *   onText: (text: string) => void,
 *   onMessage: (message: VoiceMessage | null) => void,
 *   onRecording?: (recording: boolean) => void,
 * }} props
 */
export function VoiceNote({ children, onText, onMessage, onRecording }) {
  const [phase, setPhase] = useState(/** @type {Phase} */ ('idle'))
  const [drag, setDrag] = useState({ x: 0, y: 0 })
  const [seconds, setSeconds] = useState(0)
  const [levels, setLevels] = useState(/** @type {number[]} */ ([]))

  // Pointer handlers and timers read these, so they never see a stale render.
  const phaseRef = useRef(phase)
  const recording = useRef(/** @type {import('../lib/recorder').Recording | null} */ (null))
  const pressed = useRef(false)
  const skipClick = useRef(false)
  const origin = useRef({ x: 0, y: 0 })
  const cancelRef = useRef(/** @type {HTMLSpanElement | null} */ (null))
  const latest = useRef({ onText, onMessage, onRecording })
  useLayoutEffect(() => {
    latest.current = { onText, onMessage, onRecording }
  })

  /** @param {Phase} next */
  const go = (next) => {
    phaseRef.current = next
    setPhase(next)
  }
  /** @param {VoiceMessage | null} message */
  const say = (message) => latest.current.onMessage(message)

  const active = phase === 'held' || phase === 'locked' || phase === 'sending'
  useEffect(() => {
    latest.current.onRecording?.(active)
  }, [active])

  // The time and the level trace, while the microphone is open.
  useEffect(() => {
    if (phase !== 'held' && phase !== 'locked') return
    const tick = setInterval(() => {
      const current = recording.current
      if (!current) return
      setSeconds(current.seconds())
      setLevels((previous) => [...previous.slice(-(BARS - 1)), current.level()])
    }, TICK_MS)
    return () => clearInterval(tick)
  }, [phase])

  const discard = () => {
    recording.current?.cancel()
    recording.current = null
    setDrag({ x: 0, y: 0 })
    go('idle')
  }

  // Leaving the app or the screen drops a note in progress: it's never sent unseen.
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState !== 'hidden') return
      if (['starting', 'held', 'locked'].includes(phaseRef.current)) discard()
    }
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      recording.current?.cancel()
      recording.current = null
      phaseRef.current = 'idle'
    }
  }, [])

  /** @param {Blob} audio */
  const deliver = async (audio) => {
    go('sending')
    say(null)
    try {
      const text = await transcribe(audio)
      if (text) latest.current.onText(text)
      else say({ text: NOTHING_HEARD })
    } catch (error) {
      if (error instanceof VoiceOffError) say({ text: VOICE_OFF })
      else say({ text: failureText(error), retry: () => void deliver(audio) })
    }
    go('idle')
  }

  const send = async () => {
    const current = recording.current
    if (!current) return
    recording.current = null
    setDrag({ x: 0, y: 0 })
    if (current.seconds() < MIN_SECONDS) {
      current.cancel()
      go('idle')
      say({ text: HOLD_TO_TALK })
      return
    }
    go('sending')
    await deliver(await current.stop())
  }

  /** @param {boolean} locked hands-free from the start, as from the keyboard */
  const begin = (locked) => {
    say(null)
    if (!canRecord()) return say({ text: CANNOT_RECORD })
    if (!navigator.onLine) return say({ text: failureText(new OfflineError('Sin conexión')) })
    pressed.current = true
    go('starting')
    startRecording({ onLimit: () => void send() }).then(
      (started) => {
        // Dropped while the microphone opened: the app went to the background.
        if (phaseRef.current !== 'starting') return started.cancel()
        // The finger lifted first, as it does when the browser asks for permission.
        if (!locked && !pressed.current) {
          started.cancel()
          go('idle')
          return say({ text: HOLD_TO_TALK })
        }
        recording.current = started
        setSeconds(0)
        setLevels([])
        go(locked ? 'locked' : 'held')
      },
      (error) => {
        go('idle')
        say({ text: error instanceof MicDeniedError ? MIC_DENIED : CANNOT_RECORD })
      },
    )
  }

  /** @param {React.PointerEvent<HTMLButtonElement>} event */
  const onPointerDown = (event) => {
    if (event.button !== 0 || phaseRef.current !== 'idle') return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    skipClick.current = true
    origin.current = { x: event.clientX, y: event.clientY }
    begin(false)
  }

  /** @param {React.PointerEvent<HTMLButtonElement>} event */
  const onPointerMove = (event) => {
    if (phaseRef.current !== 'held') return
    const dx = Math.min(0, event.clientX - origin.current.x)
    const dy = Math.min(0, event.clientY - origin.current.y)
    if (dy <= -LOCK_AT) {
      setDrag({ x: 0, y: 0 })
      return go('locked')
    }
    if (dx <= -CANCEL_AT) return discard()
    // The mic follows the finger along whichever way it's going.
    setDrag(Math.abs(dx) > Math.abs(dy) ? { x: dx, y: 0 } : { x: 0, y: dy })
  }

  /** @param {React.PointerEvent<HTMLButtonElement>} event */
  const onPointerUp = (event) => {
    pressed.current = false
    if (phaseRef.current !== 'held') return
    const under = document.elementFromPoint(event.clientX, event.clientY)
    if (under && cancelRef.current?.contains(under)) discard()
    else void send()
  }

  const onPointerCancel = () => {
    pressed.current = false
    if (phaseRef.current === 'held') discard()
  }

  // A press already did its work; a click on its own is the keyboard, or a tap on a locked note.
  const onClick = () => {
    if (skipClick.current) {
      skipClick.current = false
      return
    }
    if (phaseRef.current === 'locked') void send()
    else if (phaseRef.current === 'idle') begin(true)
  }

  const label = {
    idle: 'Nota de voz: mantené apretado para grabar',
    starting: 'Abriendo el micrófono',
    held: 'Grabando. Soltá para enviar',
    locked: 'Enviar la nota de voz',
    sending: 'Pasando a texto',
  }[phase]

  return (
    <div className={`voice voice--${phase}`}>
      {phase === 'held' && (
        <div className={`voice__lock${drag.y < -LOCK_AT / 2 ? ' is-near' : ''}`} aria-hidden="true">
          <span className="voice__lock-mark">
            <span className="voice__padlock">
              <span className="voice__shackle" />
              <span className="voice__lockbody" />
            </span>
            <span className="voice__arrow">↑</span>
          </span>
          <span className="voice__lock-hint">desplazá hacia arriba para fijar</span>
        </div>
      )}

      {active ? (
        <div className="voice__strip" role="status">
          {phase === 'sending' ? (
            <>
              <Dots tone="page" />
              <span className="voice__sending">Pasando a texto</span>
            </>
          ) : (
            <>
              <span className="voice__time">{clockText(Math.floor(seconds))}</span>
              <span className="voice__trace" aria-hidden="true">
                {levels.map((level, index) => (
                  <span key={index} className={level > 0.5 ? 'is-loud' : undefined} style={{ height: `${6 + level * 20}px` }} />
                ))}
              </span>
              {phase === 'locked' ? (
                <button type="button" className="voice__cancel" onClick={discard}>
                  cancelar
                </button>
              ) : (
                <span
                  ref={cancelRef}
                  className="voice__cancel"
                  style={{ opacity: Math.max(0.4, 1 - drag.x / -CANCEL_AT) }}
                >
                  ← cancelar
                </span>
              )}
            </>
          )}
        </div>
      ) : (
        children
      )}

      <button
        type="button"
        className="mic"
        aria-label={label}
        aria-disabled={phase === 'sending' || undefined}
        style={drag.x || drag.y ? { transform: `translate(${drag.x}px, ${drag.y}px)` } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClick={onClick}
        onContextMenu={(event) => event.preventDefault()}
      >
        {phase === 'locked' ? (
          <span className="mic__send">Enviar</span>
        ) : (
          <span className="mic__glyph" aria-hidden="true">
            <span className="mic__capsule" />
            <span className="mic__base" />
          </span>
        )}
      </button>
    </div>
  )
}
