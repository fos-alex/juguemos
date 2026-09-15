import { createFileRoute } from '@tanstack/react-router'
import { SettingsScreen } from '../features/account'

export const Route = createFileRoute('/ajustes')({ component: SettingsScreen })
