import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { signOut } from '../api'
import { TertiaryButton } from '../components/Buttons'
import { Card, MetaLabel } from '../components/Card'
import { Body, Footer, Header, Screen } from '../components/Screen'
import { useGoBack } from '../hooks/useGoBack'
import { failureText } from '../lib/format'
import { read } from '../lib/store'

export const Route = createFileRoute('/ajustes')({
  component: SettingsScreen,
})

/** Ajustes: account, not navigation. Not designed in the handoff; kept to the minimum. Copy needs a voice pass. */
function SettingsScreen() {
  const navigate = useNavigate()
  const goBack = useGoBack('/')
  // Read once: signing out clears the account before this screen leaves.
  const [account] = useState(() => read('account'))

  useEffect(() => {
    document.title = 'Ajustes · Juguemos'
  }, [])

  const [request, setRequest] = useState(/** @type {'idle' | 'busy'} */ ('idle'))
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))

  // Signing out waits for the API; offline it says so and the parent stays signed in.
  const leave = async () => {
    if (request !== 'idle') return
    setRequest('busy')
    setFailure(null)
    try {
      await signOut()
      void navigate({ to: '/entrada', replace: true })
    } catch (error) {
      setFailure(failureText(error))
      setRequest('idle')
    }
  }

  return (
    <Screen>
      <Header onBack={goBack} title="Ajustes" />
      <Body className="page-body">
        <Card>
          <MetaLabel wide>Tu cuenta</MetaLabel>
          <p className="card-title">{account?.name}</p>
          <p className="card-meta">{account?.email}</p>
        </Card>
      </Body>
      <Footer>
        {failure && (
          <p className="status-line" role="alert">
            {failure}
          </p>
        )}
        <TertiaryButton disabled={request !== 'idle'} onClick={leave}>
          Cerrar sesión
        </TertiaryButton>
      </Footer>
    </Screen>
  )
}
