import { useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { checkInvitation } from '../api'
import { InvitedSignUp } from '../components/InvitedSignUp'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { useRequest } from '../../../shared/hooks/useRequest'
import { Body, Dots, Footer, PrimaryButton, Screen, StatusLine, TertiaryButton } from '../../../shared/ui'
import '../account.css'

/** @typedef {import('../types').Invitation} Invitation */

/** What a link that no longer works says. Voice pass pending. */
const CLOSED = {
  expired: {
    title: 'Esta invitación venció',
    lede: 'Pedile a quien te invitó que te mande otra.',
  },
  invalid: {
    title: 'Esta invitación ya no sirve',
    lede: 'Puede que te hayan mandado una más nueva: buscá el último email de Ludi.',
  },
}

/**
 * The link in an invitation email (JUG-34). It checks the link before
 * anything else: an email that already has an account goes to sign in, a link
 * that no longer works says so, and otherwise the parent creates the account.
 */
export function InvitationScreen() {
  const { token, email, error } = useSearch({ from: '/invitacion' })
  const navigate = useNavigate()
  const [link, setLink] = useState(/** @type {Invitation | null} */ (null))
  const check = useRequest()

  useDocumentTitle('Te invitamos a Ludi')

  const load = () =>
    void check.run(async () => {
      const found = await checkInvitation({ token, email })
      if (found.next === 'signIn') {
        void navigate({ to: '/cuenta', search: { modo: 'entrar', email: found.email }, replace: true })
        return
      }
      setLink(found)
      check.reset()
    })

  useEffect(load, [token, email])

  if (link?.next === 'signUp') return <InvitedSignUp token={token} email={link.email} error={error} />

  const closed = link && link.next !== 'signUp' ? CLOSED[link.next] : null
  return (
    <Screen className="invitation">
      <Body className="invitation__body">
        {closed ? (
          <div>
            <h1 className="page-title">{closed.title}</h1>
            <p className="page-lede">{closed.lede}</p>
          </div>
        ) : (
          check.state !== 'error' && <Dots tone="page" />
        )}
        <StatusLine role="alert">{check.failure}</StatusLine>
      </Body>
      <Footer>
        {check.state === 'error' && <PrimaryButton onClick={load}>Probar de nuevo</PrimaryButton>}
        {closed && (
          <TertiaryButton onClick={() => void navigate({ to: '/cuenta', search: { modo: 'entrar' } })}>
            Ya tengo cuenta
          </TertiaryButton>
        )}
      </Footer>
    </Screen>
  )
}
