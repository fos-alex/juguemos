import { createFileRoute } from '@tanstack/react-router'
import { WelcomeScreen } from '../features/account'

export const Route = createFileRoute('/bienvenida')({ component: WelcomeScreen })
