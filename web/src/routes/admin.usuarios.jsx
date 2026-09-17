import { createFileRoute } from '@tanstack/react-router'
import { UsersScreen } from '../features/admin'

export const Route = createFileRoute('/admin/usuarios')({ component: UsersScreen })
