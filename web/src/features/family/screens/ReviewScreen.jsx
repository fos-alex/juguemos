import { useState } from 'react'
import { Navigate, useNavigate } from '@tanstack/react-router'
import { saveFamily } from '../api'
import { FamilyCard } from '../components/FamilyCard'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { useRequest } from '../../../shared/hooks/useRequest'
import { read } from '../../../shared/store'
import { Body, Footer, PrimaryButton, QuietButton, Screen, SecondaryButton, StatusLine } from '../../../shared/ui'
import '../family.css'

/**
 * 2f / 2g. For reading, not editing. When the model was unsure, the unsure
 * rows are flagged and the emphasis flips to "Corregir". No apology, no red,
 * no confidence numbers.
 */
export function ReviewScreen() {
  const navigate = useNavigate()
  // Read once: saving clears the pending result, and this screen shouldn't flinch.
  const [parse] = useState(() => read('parseResult'))
  const request = useRequest()

  useDocumentTitle('¿Está bien así? · Juguemos')

  if (!parse) return <Navigate to="/familia/contanos" replace />

  const misread = parse.flagged.length > 0

  const confirm = () =>
    void request.run(async () => {
      await saveFamily(parse.family)
      void navigate({ to: '/', replace: true })
    })

  /** @param {string} [field] */
  const correct = (field) => void navigate({ to: '/familia/corregir', search: field ? { campo: field } : {} })

  return (
    <Screen>
      <div className="page-intro">
        <h1 className="page-title">¿Está bien así?</h1>
      </div>
      <Body className="review">
        <FamilyCard family={parse.family} flagged={parse.flagged} onFix={correct} />
        {parse.note && <p className="review__note">{parse.note}</p>}
        <StatusLine role="alert">{request.failure}</StatusLine>
      </Body>
      <Footer>
        {misread ? (
          <>
            <QuietButton busy={request.busy} busyLabel="Guardando" onClick={confirm}>
              Sí, está perfecto
            </QuietButton>
            <PrimaryButton className="btn--text-23" onClick={() => correct()}>
              Modificar
            </PrimaryButton>
          </>
        ) : (
          <>
            <PrimaryButton className="btn--text-23" busy={request.busy} busyLabel="Guardando" onClick={confirm}>
              Sí, está perfecto
            </PrimaryButton>
            <SecondaryButton className="btn--58" onClick={() => correct()}>
              Modificar
            </SecondaryButton>
          </>
        )}
      </Footer>
    </Screen>
  )
}
