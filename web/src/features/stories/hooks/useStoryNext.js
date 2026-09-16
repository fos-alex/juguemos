import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { makeSeries } from '../api'
import { failureText } from '../../../shared/format'
import { useOnline } from '../../../shared/hooks/useOnline'
import { useStored } from '../../../shared/store'

/** @typedef {import('../types').Series} Series */
/** @typedef {import('../types').Story} Story */

/**
 * What a story offers once it has been read (JUG-154): a story on its own can
 * become a series, and an episode leads to the next one. An episode whose
 * series has all its episodes offers nothing. Both need the API, so offline
 * the tap says so instead.
 * @param {Story | null | undefined} story
 * @returns {{
 *   kind: 'series' | 'episode' | null,
 *   busy: boolean,
 *   online: boolean,
 *   failure: string | null,
 *   go: () => void,
 * }}
 */
export function useStoryNext(story) {
  const navigate = useNavigate()
  const online = useOnline()
  const series = /** @type {Series[]} */ (useStored('series') ?? [])
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))

  const inSeries = story?.series ?? null
  // A series the device hasn't listed yet still offers the episode; the API says if it is full.
  const followed = inSeries ? series.find((each) => each.id === inSeries.id) : undefined
  const full = followed ? followed.episodes.length >= followed.maxEpisodes : false
  const kind = !story ? null : inSeries ? (full ? null : 'episode') : 'series'

  const go = async () => {
    if (!story || busy) return
    if (!online) {
      setFailure('Estás sin conexión.')
      return
    }
    setFailure(null)
    if (inSeries) {
      void navigate({ to: '/serie/$id/episodio', params: { id: inSeries.id } })
      return
    }
    setBusy(true)
    try {
      const started = await makeSeries(story.id)
      void navigate({ to: '/serie/$id', params: { id: started.id } })
    } catch (error) {
      setFailure(failureText(error))
    } finally {
      setBusy(false)
    }
  }

  return { kind, busy, online, failure, go: () => void go() }
}
