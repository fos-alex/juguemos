import { createFileRoute } from '@tanstack/react-router'
import { KeywordStoryScreen } from '../features/stories'

export const Route = createFileRoute('/cuento/tema/$keyword')({ component: KeywordStoryScreen })
