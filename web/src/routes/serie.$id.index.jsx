import { createFileRoute } from '@tanstack/react-router'
import { SeriesScreen } from '../features/stories'

export const Route = createFileRoute('/serie/$id/')({ component: SeriesScreen })
