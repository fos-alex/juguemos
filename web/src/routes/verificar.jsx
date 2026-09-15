import { createFileRoute } from '@tanstack/react-router'
import { VerifyScreen } from '../features/account'

export const Route = createFileRoute('/verificar')({ component: VerifyScreen })
