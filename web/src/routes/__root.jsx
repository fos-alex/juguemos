import { createRootRoute } from '@tanstack/react-router'
import { guard } from '../app/guard'
import { RootLayout } from '../app/RootLayout'

export const Route = createRootRoute({ beforeLoad: guard, component: RootLayout })
