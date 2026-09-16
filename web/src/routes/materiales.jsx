import { createFileRoute } from '@tanstack/react-router'
import { MaterialsScreen } from '../features/materials'

export const Route = createFileRoute('/materiales')({ component: MaterialsScreen })
