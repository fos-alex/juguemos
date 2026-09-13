import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { signOut } from '../api'
import { TertiaryButton } from '../components/Buttons'
import { Card, MetaLabel } from '../components/Card'
import { Body, Footer, Header, Screen } from '../components/Screen'
import { useGoBack } from '../hooks/useGoBack'
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

  const leave = () => {
    signOut()
    void navigate({ to: '/entrada', replace: true })
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
        <TertiaryButton onClick={leave}>Cerrar sesión</TertiaryButton>
      </Footer>
    </Screen>
  )
}
