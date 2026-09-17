import { useNavigate } from '@tanstack/react-router'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { DrawnWordmark, Footer, PrimaryButton, Screen } from '../../../shared/ui'
import '../account.css'

/**
 * Bienvenida (JUG-173), the onboarding's first screen, right after an account
 * is created. The wordmark writes itself above the fold, and the words and the
 * button sit in the thumb zone. The button works from the first frame, and the
 * first-run guard sends the new account on to its family.
 */
export function WelcomeScreen() {
  const navigate = useNavigate()

  useDocumentTitle('Bienvenida · Ludi')

  return (
    <Screen className="welcome">
      <div className="welcome__mark">
        <DrawnWordmark />
      </div>
      <Footer className="welcome__actions">
        {/* Voice pass pending: the heading, the line, and "Empezar". */}
        <div className="welcome__words">
          <h1 className="page-title">Te damos la bienvenida a Ludi</h1>
          <p className="page-lede">Primero contale a Ludi de tu familia, así los juegos son para ustedes.</p>
        </div>
        <PrimaryButton onClick={() => void navigate({ to: '/', replace: true })}>Empezar</PrimaryButton>
      </Footer>
    </Screen>
  )
}
