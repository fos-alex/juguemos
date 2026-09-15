import { createFileRoute } from '@tanstack/react-router'
import { TemplateListScreen } from '../features/admin'

export const Route = createFileRoute('/admin/')({ component: TemplateListScreen })
