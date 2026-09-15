import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { signOut } from '../api'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { useGoBack } from '../../../shared/hooks/useGoBack'
import { useRequest } from '../../../shared/hooks/useRequest'
import { read } from '../../../shared/store'
import { Body, Card, Footer, Header, MetaLabel, Screen, StatusLine, TertiaryButton } from '../../../shared/ui'

/** Ajustes: account, not navigation. Not designed in the handoff; kept to the minimum. Copy needs a voice pass. */
export function SettingsScreen() {
  const navigate = useNavigate()
  const goBack = useGoBack('/')
  // Read once: signing out clears the account before this screen leaves.
  const [account] = useState(() => read('account'))
  const request = useRequest()

  useDocumentTitle('Ajustes · Juguemos')

  // Signing out waits for the API; offline it says so and the parent stays signed in.
  const leave = () => {
    if (request.busy) return
    void request.run(async () => {
      await signOut()
      void navigate({ to: '/entrada', replace: true })
    })
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
        <StatusLine role="alert">{request.failure}</StatusLine>
        <TertiaryButton disabled={request.busy} onClick={leave}>
          Cerrar sesión
        </TertiaryButton>
      </Footer>
    </Screen>
  )
}
