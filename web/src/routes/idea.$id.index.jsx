import { createFileRoute } from '@tanstack/react-router'
import { ActivityScreen } from '../features/activities'

export const Route = createFileRoute('/idea/$id/')({ component: ActivityScreen })
