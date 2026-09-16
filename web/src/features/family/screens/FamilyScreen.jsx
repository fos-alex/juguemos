import { useNavigate } from '@tanstack/react-router'
import { FamilyCard } from '../components/FamilyCard'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { useGoBack } from '../../../shared/hooks/useGoBack'
import { useStored } from '../../../shared/store'
import { Body, Footer, Header, Screen, SecondaryButton } from '../../../shared/ui'
import '../family.css'

/** Mi familia: the summary card's permanent home once onboarding is over, with the form one tap away. */
export function FamilyScreen() {
  const navigate = useNavigate()
  const goBack = useGoBack('/')
  const family = useStored('family')

  useDocumentTitle('Mi familia · Juguemos')

  return (
    <Screen>
      <Header onBack={goBack} title="Mi familia" />
      <Body className="page-body">{family && <FamilyCard family={family} />}</Body>
      <Footer>
        <SecondaryButton onClick={() => void navigate({ to: '/familia/corregir' })}>Editar</SecondaryButton>
      </Footer>
    </Screen>
  )
}
