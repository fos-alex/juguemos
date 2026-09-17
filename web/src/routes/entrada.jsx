import { createFileRoute } from '@tanstack/react-router'
import { EntryScreen } from '../features/account'

export const Route = createFileRoute('/entrada')({
  validateSearch: (search) => ({
    error: typeof search.error === 'string' ? search.error : undefined,
  }),
  component: EntryScreen,
})
