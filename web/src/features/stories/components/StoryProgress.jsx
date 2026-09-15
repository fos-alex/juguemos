import { useEffect, useRef } from 'react'
import { savePosition } from '../api'
import { read } from '../../../shared/store'
import { Footer, ThemeToggle } from '../../../shared/ui'
import '../stories.css'

/**
 * Position in the story ("1 de 3") and a bar that follows the scroll. The
 * position is saved, so a reopened story resumes where it was left.
 * @param {{ id: string, total: number }} props
 */
export function StoryProgress({ id, total }) {
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
      saveTimer = window.setTimeout(() => savePosition(id, progress), 400)
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
