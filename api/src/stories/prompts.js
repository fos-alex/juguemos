/**
 * The harness the stories are generated through, kept in `api/prompts/` so it
 * can be tweaked and tried without touching code: the files are read on
 * every generation, so an edit shows up in the very next story. They are
 * plain text with `{{placeholders}}` the code fills; a placeholder with no
 * value is a bug and stops the generation, rather than a story that says
 * "{{kids}}" out loud.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** @typedef {Record<string, string>} Values */

const DEFAULT_DIR = fileURLToPath(new URL('../../prompts/', import.meta.url))

/** @param {string} name @param {string} [dir] @returns {string} */
function read(name, dir = DEFAULT_DIR) {
  return readFileSync(`${dir}${name}.md`, 'utf8')
}

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

/**
 * The narrator's own brief: who is talking, in what language, how each age
 * band reads, what the moment asks for, and what never happens. It is the
 * system message of every story call.
 * @param {{ dir?: string }} [options]
 */
export function storyteller({ dir } = {}) {
  return read('storyteller', dir)
}

/**
 * The task that proposes three plots, as JSON, for the parent to choose.
 * @param {{ dir?: string }} [options]
 */
export function storyOptionsTemplate({ dir } = {}) {
  return read('story-options', dir)
}

/**
 * The task that writes the chosen plot as the story itself.
 * @param {{ dir?: string }} [options]
 */
export function storyTemplate({ dir } = {}) {
  return read('story', dir)
}
