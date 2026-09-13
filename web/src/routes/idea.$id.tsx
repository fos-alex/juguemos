import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { TopBar } from '../components/TopBar'
import { activities } from '../data/activities'
import { useOnline } from '../hooks/useOnline'
import { consumeTurn, requestTurn } from '../lib/turn'

export const Route = createFileRoute('/idea/$id')({
  component: ActivityScreen,
})

function ActivityScreen() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const online = useOnline()
  const [turning, setTurning] = useState(false)

  const index = Math.min(Math.max(Number(id) || 0, 0), activities.length - 1)
  const activity = activities[index]

  useEffect(() => {
    localStorage.setItem('lastIdea', String(index))
    document.title = `${activity.title} · Juguemos`
  }, [index, activity.title])

  useEffect(() => {
    if (!consumeTurn()) return
    setTurning(true)
    const timeout = window.setTimeout(() => setTurning(false), 250)
    return () => window.clearTimeout(timeout)
  }, [index])

  const another = () => {
    requestTurn()
    void navigate({ to: '/idea/$id', params: { id: String((index + 1) % activities.length) } })
  }

  return (
    <main className="screen">
      <TopBar back={{ to: '/', label: 'Inicio' }} />
      <article className={turning ? 'content turn-in' : 'content'}>
        {!online && <p className="offline">Estás sin conexión. La última idea sigue acá.</p>}
        <div className="meta">
          {activity.minutes} min · {activity.place}
        </div>
        <h1 className="title">{activity.title}</h1>
        <section className="card-accent">
          <h2 className="label label--accent">Por qué ahora</h2>
          <p>{activity.why}</p>
        </section>
        <section>
          <h2 className="label label--muted">Qué necesitás</h2>
          <p className="body">{activity.needs}</p>
        </section>
        <ol className="steps">
          {activity.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <div className="variations">
          <section className="note-card">
            <h2 className="label label--grass">Más fácil</h2>
            <p>{activity.easier}</p>
          </section>
          <section className="note-card">
            <h2 className="label label--accent">Más difícil</h2>
            <p>{activity.harder}</p>
          </section>
        </div>
      </article>
      <footer className="footer">
        <button className="btn btn-bar" onClick={another}>
          Otra idea
        </button>
      </footer>
    </main>
  )
}
