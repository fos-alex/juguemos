/**
 * The system prompt, put together by code: the narrator's core, the fragment
 * of the one age band this story is for, and the fragment of the one moment
 * it is read at. The weather joins as another fragment in 0.3.
 */
import bands from './bands.js'
import moments from './moments.js'
import storyteller from './storyteller.js'

/**
 * @param {{ band: string, mood: 'calm' | 'lively' }} story the band id (`1`,
 *   `1.5`, and so on to `5`) and the moment of day
 * @returns {string}
 */
export function systemPrompt({ band, mood }) {
  const bandFragment = bands[band]
  if (!bandFragment) throw new Error(`No prompt fragment for the band ${band}`)
  const momentFragment = moments[mood]
  if (!momentFragment) throw new Error(`No prompt fragment for the moment ${mood}`)
  return `${storyteller}\n\n${bandFragment}\n\n${momentFragment}`
}
