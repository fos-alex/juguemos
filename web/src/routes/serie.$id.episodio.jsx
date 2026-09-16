import { createFileRoute } from '@tanstack/react-router'
import { EpisodeScreen } from '../features/stories'

export const Route = createFileRoute('/serie/$id/episodio')({ component: EpisodeScreen })
