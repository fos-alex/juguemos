import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { signOut } from '../api'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { useGoBack } from '../../../shared/hooks/useGoBack'
import { useRequest } from '../../../shared/hooks/useRequest'
import { read } from '../../../shared/store'
import { Body, Card, Footer, Header, MetaLabel, Screen, StatusLine, TertiaryButton } from '../../../shared/ui'
import '../account.css'

const SOURCE_URL = 'https://github.com/fos-alex/juguemos'

/** Ajustes: account, not navigation. Not designed yet; kept to the minimum. Copy needs a voice pass. */
export function SettingsScreen() {
  const navigate = useNavigate()
  const goBack = useGoBack('/')
  // Read once: signing out clears the account before this screen leaves.
  const [account] = useState(() => read('account'))
  const request = useRequest()

  useDocumentTitle('Ajustes · Ludi')

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
        {/* The license's Appropriate Legal Notices (README, License). A voice pass may reword it,
            but it keeps the copyright line, the license, no warranty, and the link to the source. */}
        <Card>
          <MetaLabel wide>Sobre Ludi</MetaLabel>
          <p className="card-meta">
            © 2026 Alex Otero. Ludi es software libre: cualquiera puede copiarlo y cambiarlo bajo la licencia
            AGPL-3.0. No tiene garantía.
          </p>
          <a className="settings__source" href={SOURCE_URL} target="_blank" rel="noreferrer">
            Ver el código y la licencia
          </a>
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
