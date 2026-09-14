/**
 * The harness the stories are generated through. A placeholder with no value
 * is a bug and stops the generation, rather than a story that says "{{kids}}"
 * out loud.
 */
import storytellerMd from '../../prompts/storyteller.js'
import storyOptionsMd from '../../prompts/story-options.js'
import storyMd from '../../prompts/story.js'

/** @typedef {Record<string, string>} Values */

/**
 * Fills a harness file's placeholders. Unknown placeholders throw, so the
 * harness and the code can't drift apart quietly.
 * @param {string} template @param {Values} values
 */
export function render(template, values) {
  return template.replace(/{{(\w+)}}/g, (_, key) => {
    if (!(key in values)) throw new Error(`No value for the harness's {{${key}}}`)
    return values[key]
  })
}

/** The narrator's own brief: who is talking, in what language, how each age
 * band reads, what the moment asks for, and what never happens. It is the
 * system message of every story call. */
export function storyteller() {
  return storytellerMd
}

/** The task that proposes three plots, as JSON, for the parent to choose. */
export function storyOptionsTemplate() {
  return storyOptionsMd
}

/** The task that writes the chosen plot as the story itself. */
export function storyTemplate() {
  return storyMd
}
