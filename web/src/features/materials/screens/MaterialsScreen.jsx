import { useEffect, useState } from 'react'
import { loadMaterials } from '../api'
import { MaterialGroups } from '../components/MaterialGroups'
import { failureText } from '../../../shared/format'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { useGoBack } from '../../../shared/hooks/useGoBack'
import { useOfflineNotice } from '../../../shared/hooks/useOfflineNotice'
import { useStored } from '../../../shared/store'
import { Body, Header, OfflineNotice, Screen, StatusLine } from '../../../shared/ui'
import '../materials.css'

/**
 * Materiales (JUG-153): what there is at home to play with, by category, so a
 * juego never needs something the family doesn't have. What almost every home
 * has starts marked. Like the baúl, it has no design of its own: it is built
 * from the Plaza primitives, and its copy needs a voice pass.
 */
export function MaterialsScreen() {
  const goBack = useGoBack('/')
  const offline = useOfflineNotice()
  const categories = useStored('materials')
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))

  useDocumentTitle('Materiales · Ludi')

  useEffect(() => {
    // Another phone may have changed them.
    if (navigator.onLine) loadMaterials().catch((error) => setFailure(failureText(error)))
  }, [])

  return (
    <Screen>
      <Header onBack={goBack} title="Materiales" />
      <Body className="page-body materials">
        <OfflineNotice notice={offline} />
        {/* Voice pass pending. */}
        <p className="materials__intro">Marcá lo que hay en casa. Los juegos usan solo lo que está marcado.</p>
        <MaterialGroups categories={categories} offline={offline} onFailure={setFailure} />
        <StatusLine role="alert">{failure}</StatusLine>
      </Body>
    </Screen>
  )
}
