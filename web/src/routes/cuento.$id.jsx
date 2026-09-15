import { useEffect, useRef, useState } from 'react'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { savedStory, writeStory } from '../api'
import { Dots, TertiaryButton } from '../shared/ui/Buttons'
import { MetaLabel, Skeleton } from '../shared/ui/Card'
import { Body, Footer, Header, Screen } from '../shared/ui/Screen'
import { ThemeToggle } from '../shared/ui/ThemeToggle'
import { useGoBack } from '../shared/hooks/useGoBack'
import { useWakeLock } from '../shared/hooks/useWakeLock'
import { failureText } from '../shared/format'
import { read, useStored, write } from '../shared/store'

export const Route = createFileRoute('/cuento/$id')({
  component: ReadingScreen,
})

/**
 * 2s then 2t. The page fills itself: the title is already set and the text
 * arrives over placeholder lines at story measure, so nothing reflows. The
 * screen stays awake from the first moment. No illustration, ever; the bar
 * marks position in the story, never achievement. Night mode is one tap away
 * in the footer, under the thumb.
 */
function ReadingScreen() {
  const { id } = Route.useParams()
  const goBack = useGoBack('/cuentos')
  const awake = useWakeLock()
  const story = useStored('stories')?.[id]
  const option = useStored('storyOptions')?.find((candidate) => candidate.id === id)
  const [paragraphs, setParagraphs] = useState(/** @type {{ part: number, text: string }[]} */ ([]))
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))
  const [attempt, setAttempt] = useState(0)
  // An id that is neither an option nor an already-read story may still be a
  // saved story opened by its own id; wait for that answer before leaving.
  const [looking, setLooking] = useState(!story && !option)

  useEffect(() => {
    if (read('stories')?.[id]) return
    const controller = new AbortController()
    setParagraphs([])
    setFailure(null)
    setLooking(true)
    writeStory(id, {
      signal: controller.signal,
      onParagraph: (paragraph) => setParagraphs((list) => [...list, paragraph]),
    }).catch((error) => {
      // An id that is not an option is a saved story opened by its own id.
      if (error.status === 404) {
        void savedStory(id).catch((savedError) => {
          if (savedError.name !== 'AbortError') {
            setFailure(failureText(savedError))
            setLooking(false)
          }
        })
        return
      }
      if (error.name === 'AbortError') return
      setFailure(failureText(error))
      setLooking(false)
    })
    return () => controller.abort()
  }, [id, attempt])

  const title = story?.title ?? option?.title
  const minutes = story?.minutes ?? option?.minutes

  useEffect(() => {
    if (title) document.title = `${title} · Juguemos`
  }, [title])

  if (!title && !looking) return <Navigate to="/cuentos" replace />

  const parts = story ? story.parts : groupByPart(paragraphs)

  return (
    <Screen tone="reading">
      <Header
        onBack={goBack}
        trailing={
          story ? (
            <MetaLabel className="meta--light">
              {minutes} min{awake ? ' · pantalla despierta' : ''}
            </MetaLabel>
          ) : (
            <Skeleton width={56} height={11} />
          )
        }
      />
      <Body className="reading">
        <h1 className="story-title">{title}</h1>
        <StoryText parts={parts} done={Boolean(story)} />
        {!story && !failure && <StorySkeleton paragraphs={paragraphs.length === 0 ? 3 : 2} />}
        {failure && (
          <p className="status-line" role="alert">
            {failure}
          </p>
        )}
      </Body>
      {story ? (
        <StoryProgress id={id} total={story.parts.length} />
      ) : (
        <Footer className="reading-footer reading-footer--waiting">
          <ThemeToggle />
          {failure ? (
            <TertiaryButton onClick={() => setAttempt((count) => count + 1)}>Probar de nuevo</TertiaryButton>
          ) : (
            <Dots tone="page" />
          )}
        </Footer>
      )}
    </Screen>
  )
}

/** @param {{ parts: string[][], done: boolean }} props */
function StoryText({ parts, done }) {
  return (
    <div className="story" aria-busy={!done}>
      {parts.map((part, index) => (
        <section key={index} className="story__part" data-part={index}>
          {part.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
    </div>
  )
}

/** Placeholder paragraphs whose lines have the story's own line height. @param {{ paragraphs: number }} props */
function StorySkeleton({ paragraphs }) {
  const shapes = [
    ['100%', '100%', '72%'],
    ['100%', '88%', '46%'],
    ['64%'],
  ].slice(0, paragraphs)
  return (
    <div className="story-skeleton" aria-hidden="true">
      {shapes.map((lines, index) => (
        <div key={index} className="story-skeleton__paragraph">
          {lines.map((width, line) => (
            <span key={line} className="story-skeleton__line">
              <Skeleton width={width} height={17} tone="soft" />
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Position in the story ("1 de 3") and a bar that follows the scroll. The
 * position is saved, so a reopened story resumes where it was left.
 * @param {{ id: string, total: number }} props
 */
function StoryProgress({ id, total }) {
  const bar = useRef(/** @type {HTMLDivElement | null} */ (null))
  const fill = useRef(/** @type {HTMLDivElement | null} */ (null))
  const count = useRef(/** @type {HTMLSpanElement | null} */ (null))

  useEffect(() => {
    const scrollable = () => document.documentElement.scrollHeight - window.innerHeight
    const saved = read('storyPositions')?.[id]
    if (saved) window.scrollTo(0, saved * scrollable())

    let saveTimer = 0
    const update = () => {
      const max = scrollable()
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 1
      if (fill.current) fill.current.style.width = `${progress * 100}%`

      const readingLine = window.innerHeight * 0.4
      const parts = [...document.querySelectorAll('.story__part')]
      const current = Math.max(1, parts.filter((part) => part.getBoundingClientRect().top < readingLine).length)
      const label = `${current} de ${total}`
      if (count.current) count.current.textContent = label
      bar.current?.setAttribute('aria-valuenow', String(current))
      bar.current?.setAttribute('aria-valuetext', label)

      window.clearTimeout(saveTimer)
      saveTimer = window.setTimeout(() => write('storyPositions', { ...read('storyPositions'), [id]: progress }), 400)
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.clearTimeout(saveTimer)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [id, total])

  return (
    <Footer sticky row className="reading-footer">
      <ThemeToggle />
      <div
        ref={bar}
        className="progress"
        role="progressbar"
        aria-label="Parte del cuento"
        aria-valuemin={1}
        aria-valuemax={total}
      >
        <div ref={fill} className="progress__fill" />
      </div>
      <span ref={count} className="progress__count" aria-hidden="true" />
    </Footer>
  )
}

/** @param {{ part: number, text: string }[]} paragraphs */
function groupByPart(paragraphs) {
  /** @type {string[][]} */
  const parts = []
  for (const { part, text } of paragraphs) (parts[part] ??= []).push(text)
  return parts.filter(Boolean)
}
