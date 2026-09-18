import { createFileRoute } from '@tanstack/react-router'
import { SoundGameScreen } from '../features/games'

export const Route = createFileRoute('/idea/$id/que-suena')({ component: SoundGameScreen })
