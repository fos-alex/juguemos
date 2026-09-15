import { createFileRoute } from '@tanstack/react-router'
import { ToyBoxScreen } from '../features/toys'

export const Route = createFileRoute('/juguetes/')({ component: ToyBoxScreen })
