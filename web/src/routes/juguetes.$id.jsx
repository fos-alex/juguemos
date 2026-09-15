import { createFileRoute } from '@tanstack/react-router'
import { ToyScreen } from '../features/toys'

export const Route = createFileRoute('/juguetes/$id')({ component: ToyScreen })
