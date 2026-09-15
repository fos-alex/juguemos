import { createFileRoute } from '@tanstack/react-router'
import { TimerScreen } from '../features/activities'

export const Route = createFileRoute('/idea/$id/reloj')({ component: TimerScreen })
