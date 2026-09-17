import { createFileRoute } from '@tanstack/react-router'
import { InvitationScreen } from '../features/account'

/** @param {unknown} value */
const text = (value) => (typeof value === 'string' || typeof value === 'number' ? String(value) : undefined)

export const Route = createFileRoute('/invitacion')({
  validateSearch: (search) => ({
    token: text(search.token),
    email: text(search.email),
    error: text(search.error),
  }),
  component: InvitationScreen,
})
