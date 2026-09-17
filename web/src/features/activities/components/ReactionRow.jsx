import { useState } from 'react'
import { reactToActivity } from '../api'
import { failureText } from '../../../shared/format'
import { useOnline } from '../../../shared/hooks/useOnline'
import { ChipToggle, StatusLine, ThumbDownIcon, ThumbUpIcon } from '../../../shared/ui'
import '../activities.css'

/** @typedef {import('../types').Activity} Activity */

/**
 * The feedback tap (JUG-23): two chips, one reaction per juego, which the
 * parent can change or take back by tapping it again. Optional, silent, no
 * counts and no celebration. The two chips share one line, each led by its
 * thumb. Offline the chips look flat and a tap does nothing, since the
 * reaction is the API's. Copy needs a voice pass.
 * @param {{ activity: Activity, className?: string }} props
 */
export function ReactionRow({ activity, className = '' }) {
  const online = useOnline()
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))

  /** @param {'up' | 'down'} reaction */
  const choose = async (reaction) => {
    if (!online) return
    setFailure(null)
    try {
      await reactToActivity(activity.id, activity.reaction === reaction ? null : reaction)
    } catch (error) {
      setFailure(failureText(error))
    }
  }

  return (
    <div className={`reaction ${className}`.trim()}>
      <p className="reaction__ask">¿Cómo les fue?</p>
      <div className="chips reaction__chips">
        <ChipToggle
          pressed={activity.reaction === 'up'}
          icon={<ThumbUpIcon size={18} />}
          aria-disabled={!online || undefined}
          onClick={() => void choose('up')}
        >
          ¡Lo hicimos!
        </ChipToggle>
        <ChipToggle
          pressed={activity.reaction === 'down'}
          icon={<ThumbDownIcon size={18} />}
          aria-disabled={!online || undefined}
          onClick={() => void choose('down')}
        >
          No era para nosotros
        </ChipToggle>
      </div>
      <StatusLine role="alert">{failure}</StatusLine>
    </div>
  )
}
