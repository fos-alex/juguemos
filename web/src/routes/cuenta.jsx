import { createFileRoute } from '@tanstack/react-router'
import { AccountScreen } from '../features/account'

export const Route = createFileRoute('/cuenta')({
  validateSearch: (search) => ({
    modo: search.modo === 'entrar' ? 'entrar' : undefined,
    campo: search.campo === 'email' ? 'email' : undefined,
  }),
  component: AccountScreen,
})
