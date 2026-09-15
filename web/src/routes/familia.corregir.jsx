import { createFileRoute } from '@tanstack/react-router'
import { CorrectScreen } from '../features/family'

export const Route = createFileRoute('/familia/corregir')({
  validateSearch: (search) => ({
    campo: typeof search.campo === 'string' ? search.campo : undefined,
  }),
  component: CorrectScreen,
})
