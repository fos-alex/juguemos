import { useEffect, useState } from 'react'
import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { saveFamily } from '../../../api'
import { PrimaryButton, QuietButton, SecondaryButton } from '../../../shared/ui/Buttons'
import { FamilyCard } from '../components/FamilyCard'
import { Body, Footer, Screen } from '../../../shared/ui/Screen'
import { failureText } from '../../../shared/format'
import { read } from '../../../shared/store'
import { StatusLine } from '../../../shared/ui/StatusLine'

export const Route = createFileRoute('/familia/revisar')({
  component: ReviewScreen,
})

/**
 * 2f / 2g. For reading, not editing. When the model was unsure, the unsure
 * rows are flagged and the emphasis flips to "Corregir". No apology, no red,
 * no confidence numbers.
 */
function ReviewScreen() {
  const navigate = useNavigate()
  // Read once: saving clears the pending result, and this screen shouldn't flinch.
  const [parse] = useState(() => read('parseResult'))
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    document.title = '¿Está bien así? · Juguemos'
  }, [])

  if (!parse) return <Navigate to="/familia/contanos" replace />

  const misread = parse.flagged.length > 0

  const confirm = async () => {
    setBusy(true)
    setFailure(null)
    try {
      await saveFamily(parse.family)
      void navigate({ to: '/', replace: true })
    } catch (error) {
      setFailure(failureText(error))
      setBusy(false)
    }
  }

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
        <StatusLine role="alert">{failure}</StatusLine>
      </Body>
      <Footer>
        {misread ? (
          <>
            <QuietButton busy={busy} busyLabel="Guardando" onClick={confirm}>
              Sí, está perfecto
            </QuietButton>
            <PrimaryButton className="btn--text-23" onClick={() => correct()}>
              Corregir
            </PrimaryButton>
          </>
        ) : (
          <>
            <PrimaryButton className="btn--text-23" busy={busy} busyLabel="Guardando" onClick={confirm}>
              Sí, está perfecto
            </PrimaryButton>
            <SecondaryButton className="btn--58" onClick={() => correct()}>
              Corregir
            </SecondaryButton>
          </>
        )}
      </Footer>
    </Screen>
  )
}
