import { createFileRoute } from '@tanstack/react-router'
import { ReadingScreen } from '../features/stories'

export const Route = createFileRoute('/cuento/$id')({ component: ReadingScreen })
