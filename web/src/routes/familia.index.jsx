import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SecondaryButton } from '../shared/ui/Buttons'
import { FamilyCard } from '../components/FamilyCard'
import { Body, Footer, Header, Screen } from '../shared/ui/Screen'
import { useGoBack } from '../shared/hooks/useGoBack'
import { useStored } from '../shared/store'

export const Route = createFileRoute('/familia/')({
  component: MyFamilyScreen,
})

/** Mi familia: the summary card's permanent home once onboarding is over, with the form one tap away. */
function MyFamilyScreen() {
  const navigate = useNavigate()
  const goBack = useGoBack('/')
  const family = useStored('family')

  useEffect(() => {
    document.title = 'Mi familia · Juguemos'
  }, [])

  return (
    <Screen>
      <Header onBack={goBack} title="Mi familia" />
      <Body className="page-body">{family && <FamilyCard family={family} />}</Body>
      <Footer>
        <SecondaryButton onClick={() => void navigate({ to: '/familia/corregir' })}>Corregir</SecondaryButton>
      </Footer>
    </Screen>
  )
}
