import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { resendCode, verifyEmail, WrongCodeError } from '../mock'
import { useCountdown } from '../../../shared/hooks/useCountdown'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { useGoBack } from '../../../shared/hooks/useGoBack'
import { clockText, failureText } from '../../../shared/format'
import { useStored } from '../../../shared/store'
import { Body, Footer, Header, PrimaryButton, Screen, StatusLine, TertiaryButton } from '../../../shared/ui'
import '../account.css'

const LENGTH = 6
const RESEND_AFTER_MS = 60_000

/**
 * 2c. Six boxes over one real input, so paste and the OS one-time-code
 * suggestion fill all six at once. Verifies itself on the sixth digit; the
 * button is for the parent who doesn't trust that. A wrong code clears the
 * boxes and says so in one line: no lockout, no attempt counter.
 */
export function VerifyScreen() {
  const navigate = useNavigate()
  const goBack = useGoBack('/cuenta')
  const account = useStored('account')
  const input = useRef(/** @type {HTMLInputElement | null} */ (null))
  const [code, setCode] = useState('')
  const [focused, setFocused] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(/** @type {string | null} */ (null))
  const [resendAt, setResendAt] = useState(() => Date.now() + RESEND_AFTER_MS)
  const resendIn = useCountdown(resendAt)

  useDocumentTitle('Revisá tu email · Ludi')

  /** @param {string} value */
  const verify = async (value) => {
    if (busy) return
    if (value.length < LENGTH) {
      input.current?.focus()
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      await verifyEmail(value)
      // The first-run guard knows where a new account goes next.
      void navigate({ to: '/', replace: true })
    } catch (error) {
      setCode('')
      setMessage(error instanceof WrongCodeError ? 'Ese no es el código que te mandamos. Probá de nuevo.' : failureText(error))
      setBusy(false)
      input.current?.focus()
    }
  }

  const resend = async () => {
    try {
      await resendCode()
      setResendAt(Date.now() + RESEND_AFTER_MS)
      setMessage('Te mandamos un código nuevo.')
    } catch (error) {
      setMessage(failureText(error))
    }
  }

  const active = Math.min(code.length, LENGTH - 1)

  return (
    <Screen>
      <Header onBack={goBack} />
      <div className="page-intro page-intro--tight">
        <h1 className="page-title">Revisá tu email</h1>
        <p className="page-lede">
          Te mandamos un código de 6 números a <strong>{account?.email}</strong>.
        </p>
      </div>
      <Body className="verify">
        <div className="otp">
          <input
            ref={input}
            className="otp__input"
            value={code}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={LENGTH}
            autoFocus
            aria-label="Código de 6 números"
            aria-describedby={message ? 'otp-message' : undefined}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(event) => {
              const next = event.target.value.replace(/\D/g, '').slice(0, LENGTH)
              setCode(next)
              setMessage(null)
              if (next.length === LENGTH) void verify(next)
            }}
          />
          <div className="otp__boxes" aria-hidden="true">
            {Array.from({ length: LENGTH }, (_, index) => (
              <span key={index} className={`otp__box${focused && index === active ? ' is-active' : ''}`}>
                {code[index] ?? ''}
              </span>
            ))}
          </div>
        </div>
        <StatusLine id="otp-message" role="status">
          {message}
        </StatusLine>
        {resendIn > 0 ? (
          <p className="verify__resend">Reenviar el código en {clockText(resendIn)}</p>
        ) : (
          <TertiaryButton size="inline" onClick={resend}>
            Reenviar el código
          </TertiaryButton>
        )}
      </Body>
      <Footer>
        <PrimaryButton busy={busy} busyLabel="Verificando" onClick={() => void verify(code)}>
          Verificar
        </PrimaryButton>
        <TertiaryButton onClick={() => void navigate({ to: '/cuenta', search: { campo: 'email' } })}>
          Cambiar el email
        </TertiaryButton>
      </Footer>
    </Screen>
  )
}
