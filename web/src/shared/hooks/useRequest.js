import { useState } from 'react'
import { failureText } from '../format'

/** @typedef {'idle' | 'loading' | 'slow' | 'error'} RequestState */

/**
 * One request a screen waits on, and what to say when it fails. `run` clears
 * the last failure, marks the request loading, and after `slowAfter` ms marks
 * it slow; a failure is worded by `describe` and leaves the state at `error`.
 * Success leaves it loading, because the screen usually moves on; call
 * `reset` when it stays.
 * @param {{ slowAfter?: number, describe?: (error: unknown) => string }} [options]
 */
export function useRequest({ slowAfter, describe = failureText } = {}) {
  const [state, setState] = useState(/** @type {RequestState} */ ('idle'))
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))

  /** Words a failure: an error through `describe`, or text as it is. @param {unknown} reason */
  const fail = (reason) => {
    setFailure(typeof reason === 'string' ? reason : describe(reason))
    setState('error')
  }

  const reset = () => {
    setFailure(null)
    setState('idle')
  }

  /**
   * @template T
   * @param {() => Promise<T>} task
   * @returns {Promise<T | undefined>} the task's result, or undefined when it failed
   */
  const run = async (task) => {
    setFailure(null)
    setState('loading')
    const slow = slowAfter ? window.setTimeout(() => setState('slow'), slowAfter) : 0
    try {
      return await task()
    } catch (error) {
      fail(error)
      return undefined
    } finally {
      window.clearTimeout(slow)
    }
  }

  return { state, busy: state === 'loading' || state === 'slow', failure, run, fail, reset }
}
