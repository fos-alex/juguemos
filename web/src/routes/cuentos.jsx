import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { TopBar } from '../components/TopBar'
import { stories } from '../data/stories'

export const Route = createFileRoute('/cuentos')({
  component: StoryOptionsScreen,
})

function StoryOptionsScreen() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Hora del cuento · Juguemos'
  }, [])

  return (
    <main className="screen">
      <TopBar back={{ to: '/', label: 'Inicio' }} />
      <div className="intro">
        <h1 className="title">¿Cuál leemos hoy?</h1>
      </div>
      <div className="spacer" />
      <div className="options">
        {stories.map((story, index) => (
          <button
            key={story.title}
            className="option"
            onClick={() => void navigate({ to: '/cuento/$id', params: { id: String(index) } })}
          >
            <span className="option__title">{story.title}</span>
            <span className="option__teaser">{story.teaser}</span>
            <span className="meta">{story.minutes} min</span>
          </button>
        ))}
      </div>
    </main>
  )
}
