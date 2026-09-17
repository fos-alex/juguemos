import { useEffect, useState } from 'react'
import { googleFailure, signInWithGoogle } from '../api'
import { useRequest } from '../../../shared/hooks/useRequest'

/**
 * The Google button on an account screen. A tap leaves for Google, so the
 * button stays busy until the page is gone. A failed sign-in lands back on the
 * screen with its code in `?error=`, and `failure` words it until the next tap.
 * @param {{ returnTo: string, error?: string, invitation?: import('../types').InvitationLink }} options
 *   `returnTo` is the screen's own path; `invitation` is the link an invited parent came from
 */
export function useGoogleSignIn({ returnTo, error, invitation }) {
  const request = useRequest()
  const [landed] = useState(() => googleFailure(error))

  useEffect(() => {
    // Back from Google, the browser can show this page as it was left, still busy.
    /** @param {PageTransitionEvent} event */
    const restored = (event) => {
      if (event.persisted) request.reset()
    }
    window.addEventListener('pageshow', restored)
    return () => window.removeEventListener('pageshow', restored)
    // reset only sets state, so the first one stays good.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    busy: request.busy,
    failure: request.state === 'idle' ? landed : request.failure,
    start() {
      if (!request.busy) void request.run(() => signInWithGoogle(returnTo, invitation))
    },
  }
}
