import { createFileRoute } from '@tanstack/react-router'
import { FamilyScreen } from '../features/family'

export const Route = createFileRoute('/familia/')({ component: FamilyScreen })
