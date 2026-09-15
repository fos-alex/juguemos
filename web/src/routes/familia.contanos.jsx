import { createFileRoute } from '@tanstack/react-router'
import { TellScreen } from '../features/family'

export const Route = createFileRoute('/familia/contanos')({ component: TellScreen })
