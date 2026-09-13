import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { TopBar } from '../components/TopBar'
import { activities } from '../data/activities'
import { family, familyLine } from '../data/family'
import { useOnline } from '../hooks/useOnline'

export const Route = createFileRoute('/')({
  component: HomeScreen,
})

const SUGGEST_DELAY_MS = 700

function HomeScreen() {
  const navigate = useNavigate()
  const online = useOnline()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    document.title = 'Juguemos'
  }, [])

  const suggest = () => {
    if (busy) return
    setBusy(true)
    const last = Number(localStorage.getItem('lastIdea') ?? -1)
    const next = online ? (last + 1) % activities.length : Math.max(0, last)
    window.setTimeout(() => {
      void navigate({ to: '/idea/$id', params: { id: String(next) } })
    }, SUGGEST_DELAY_MS)
  }

  return (
    <main className="screen">
      <TopBar />
      <div className="spacer" />
      <div className="home-actions">
        {!online && <p className="offline">Estás sin conexión. La última idea sigue acá.</p>}
        <p className="family-line">{familyLine(family)}</p>
        <button className="btn btn-primary" aria-busy={busy} onClick={suggest}>
          {busy ? 'Pensando una idea…' : '¿Qué hacemos ahora?'}
        </button>
        <button className="btn btn-secondary" onClick={() => void navigate({ to: '/cuentos' })}>
          Hora del cuento
        </button>
      </div>
    </main>
  )
}
