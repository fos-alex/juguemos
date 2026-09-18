import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { findActivity } from '../../activities'
import { storyKey } from '../../stories'
import { loadHistory } from '../api'
import { HistoryEntry } from '../components/HistoryEntry'
import { HistorySkeleton } from '../components/HistorySkeleton'
import { historyDays } from '../model'
import { failureText } from '../../../shared/format'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { useGoBack } from '../../../shared/hooks/useGoBack'
import { useOfflineNotice } from '../../../shared/hooks/useOfflineNotice'
import { read, useStored } from '../../../shared/store'
import { Body, Header, OfflineNotice, Screen, StatusLine } from '../../../shared/ui'
import '../history.css'

/** @typedef {import('../types').History} History */

/**
 * Lo que jugamos (JUG-188): the juegos the family played and the stories they
 * read in the last month, under a heading per day, so a parent can go back to
 * one the kids loved. A juego opens its page as it was, with Empezar; a story
 * opens to read. Each is there once, on the day it was last played or read.
 * Nothing counts or compares: no totals and no days since. It has no design
 * of its own: it is built from the Plaza primitives, and its copy needs a
 * voice pass.
 *
 * The device keeps the last history it saw, so the screen opens with it
 * offline and while the API answers. Offline, a juego or a story this device
 * never kept can't open, and the tap says so.
 */
export function HistoryScreen() {
  const navigate = useNavigate()
  const goBack = useGoBack('/')
  const offline = useOfflineNotice()
  const history = /** @type {History | null} */ (useStored('history'))
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))
  // The juego being fetched, when this device didn't keep it, so a second tap waits.
  const [opening, setOpening] = useState(/** @type {string | null} */ (null))

  useDocumentTitle('Lo que jugamos · Ludi')

  useEffect(() => {
    if (navigator.onLine) loadHistory().catch((error) => setFailure(failureText(error)))
  }, [])

  /** @param {string} id */
  const openActivity = async (id) => {
    if (opening) return
    if (!offline.online && !read('activities')?.[id]) return offline.tap()
    setFailure(null)
    setOpening(id)
    try {
      await findActivity(id)
      await navigate({ to: '/idea/$id', params: { id } })
    } catch (error) {
      setFailure(failureText(error))
      setOpening(null)
    }
  }

  /** @param {string} id the story's own id */
  const openStory = (id) => {
    const key = storyKey(id)
    if (!offline.online && !read('stories')?.[key]) return offline.tap()
    void navigate({ to: '/cuento/$id', params: { id: key } })
  }

  const days = history ? historyDays(history) : null

  return (
    <Screen>
      {/* Voice pass pending: the title and the empty line. */}
      <Header onBack={goBack} title="Lo que jugamos" />
      <Body className="page-body history">
        <OfflineNotice notice={offline} />
        {!days ? (
          offline.online && !failure && <HistorySkeleton />
        ) : days.length === 0 ? (
          <p className="page-lede history__empty">
            Cuando empiecen un juego o lean un cuento, va a quedar acá para volver a jugarlo o leerlo.
          </p>
        ) : (
          days.map((day) => (
            <section key={day.key} className="history__day" aria-label={day.label}>
              <h2 className="history__heading">{day.label}</h2>
              {day.entries.map((entry) =>
                entry.kind === 'activity' ? (
                  <HistoryEntry
                    key={`juego-${entry.activity.id}`}
                    entry={entry}
                    onOpen={() => void openActivity(entry.activity.id)}
                  />
                ) : (
                  <HistoryEntry key={`cuento-${entry.story.id}`} entry={entry} onOpen={() => openStory(entry.story.id)} />
                ),
              )}
            </section>
          ))
        )}
        <StatusLine role="alert">{failure}</StatusLine>
      </Body>
    </Screen>
  )
}
