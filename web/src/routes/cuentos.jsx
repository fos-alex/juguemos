import { createFileRoute } from '@tanstack/react-router'
import { StoryOptionsScreen } from '../features/stories'

export const Route = createFileRoute('/cuentos')({ component: StoryOptionsScreen })
