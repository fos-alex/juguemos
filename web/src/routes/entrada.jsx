import { createFileRoute } from '@tanstack/react-router'
import { EntryScreen } from '../features/account'

export const Route = createFileRoute('/entrada')({ component: EntryScreen })
