import { createFileRoute } from '@tanstack/react-router'
import { ReviewScreen } from '../features/family'

export const Route = createFileRoute('/familia/revisar')({ component: ReviewScreen })
