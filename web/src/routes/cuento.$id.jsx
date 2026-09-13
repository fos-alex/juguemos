import { useEffect, useLayoutEffect, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { TopBar } from '../components/TopBar'
import { stories } from '../data/stories'
import { useWakeLock } from '../hooks/useWakeLock'

export const Route = createFileRoute('/cuento/$id')({
  component: ReadingScreen,
})

function ReadingScreen() {
  const { id } = Route.useParams()
  const awake = useWakeLock()
  const parts = useRef([])
  const bar = useRef(null)
  const fill = useRef(null)
  const count = useRef(null)

  const index = Math.min(Math.max(Number(id) || 0, 0), stories.length - 1)
  const story = stories[index]

  useLayoutEffect(() => {
    document.body.dataset.screen = 'reading'
    return () => {
      delete document.body.dataset.screen
    }
  }, [])

  useEffect(() => {
    document.title = `${story.title} · Juguemos`
  }, [story.title])

  useEffect(() => {
    const total = story.parts.length

    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 1
      if (fill.current) fill.current.style.width = `${progress * 100}%`
      const readingLine = window.innerHeight * 0.4
      const elements = parts.current.filter((el) => el !== null)
      const current = Math.max(
        1,
        elements.filter((el) => el.getBoundingClientRect().top < readingLine).length,
      )
      const label = `${current} de ${total}`
      if (count.current) count.current.textContent = label
      if (bar.current) {
        bar.current.setAttribute('aria-valuenow', String(current))
        bar.current.setAttribute('aria-valuetext', label)
      }
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [story.parts.length])

  return (
    <main className="screen">
      <TopBar back={{ to: '/cuentos', label: 'Cuentos' }} />
      <article className="reading">
        <header>
          <div className="reading-meta">
            {story.minutes} min{awake ? ' · Pantalla despierta' : ''}
          </div>
          <h1 className="story-title">{story.title}</h1>
        </header>
        <div className="story">
          {story.parts.map((part, partIndex) => (
            <section
              key={partIndex}
              ref={(el) => {
                parts.current[partIndex] = el
              }}
            >
              {part.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
          <p className="story-end">Fin</p>
        </div>
      </article>
      <footer className="reading-footer">
        <div
          className="progress"
          ref={bar}
          role="progressbar"
          aria-label="Parte del cuento"
          aria-valuemin={1}
          aria-valuemax={story.parts.length}
        >
          <div className="progress__fill" ref={fill} />
        </div>
        <span className="progress-count" ref={count} aria-hidden="true" />
      </footer>
    </main>
  )
}
