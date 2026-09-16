import { createFileRoute } from '@tanstack/react-router'
import { RequestedStoryScreen } from '../features/stories'

export const Route = createFileRoute('/cuento/pedido')({ component: RequestedStoryScreen })
