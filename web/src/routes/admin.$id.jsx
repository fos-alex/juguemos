import { createFileRoute } from '@tanstack/react-router'
import { TemplateScreen } from '../features/admin'

export const Route = createFileRoute('/admin/$id')({ component: TemplateScreen })
